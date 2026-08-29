# AMC (Annual Maintenance Contract) Sub-Form Field Changes

Frontend follow-up for a backend schema change on the Indent Cum Sanction
Sheet's AMC sub-form.

## Backend change

`get_icss_child_fields(indent_type="Annual Maintenance Contract")` on the
`Indent Cum Sanction Sheet` doctype (`rndopsapp`) now returns different field
metadata; saved via `save_icss_composite_data` (child doctype `AMC`).

| Field | Change |
|---|---|
| `amc_value_type` | **New.** Select, options `Value` / `Percentage`, required, default `Value`. Label: "Value of the AMC is in". |
| `amc_value_percentage` | **New.** Percent, visible/required only when `amc_value_type == "Percentage"` (`depends_on`/`mandatory_depends_on`: `eval:doc.amc_value_type=="Percentage"`). Label: "AMC Value (%)", helper text "% of Basic Value (BV) of the PO". |
| `amc_value` | Was Data/text → **Currency**. Visible/required only when `amc_value_type == "Value"`. Label: "Value of the AMC (Rs)". |
| `amc_computed_value` | **New.** Read-only Currency. "Value of the AMC (Computed)". |
| `amc_date_of_installation` | Was Data/text → **Date**. |
| `basic_value_bv_of_the_po`, `amc_other_charges`, `amc_gst`, `amc_grand_total` | Were Data/text → **Currency**. `amc_grand_total` is read-only. |

**Computed value formula:**
```
amc_computed_value =
  amc_value_type == "Percentage"
    ? basic_value_bv_of_the_po * amc_value_percentage / 100
    : amc_value
```

**Grand total formula (changed):**
```
amc_grand_total = amc_computed_value + amc_other_charges + amc_gst
```
(Previously `amc_gst` was applied as a percentage on a subtotal — see
"Old behavior" below.)

## Frontend changes

The AMC sub-form is rendered by the generic `DynamicFormRenderer` off field
metadata returned by the backend (primarily via `icssAPI.getChildFields` →
`get_icss_child_fields`, with `annualMaintenanceContractAPI.getFields` as a
legacy fallback) — not a hand-built form. So most of this "just worked" once
the renderer supported the right field types; only a few pieces needed
actual code changes.

### 1. `src/components/forms/DynamicFormRenderer.tsx` — added `Percent` fieldtype

There was no case for `fieldtype === "Percent"`, so it fell through to the
default (plain text input). Added a dedicated case: numeric input with a
`%` suffix, input clamped to 0–100 with up to 2 decimal places.

```tsx
case "Percent":
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        {...commonProps}
        maxLength={PERCENT_MAX_LENGTH}
        className={cn(commonProps.className, "pr-7")}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "" || (/^\d{0,3}(\.\d{0,2})?$/.test(val) && parseFloat(val) <= 100)) {
            handleChange(field.fieldname, val);
          }
        }}
        onBlur={(e) => { /* clamp + round to 2dp on blur */ }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ...">%</span>
    </div>
  );
```

**Already worked without changes**, confirmed by reading the renderer:
- `Currency`, `Date`, `Select` fieldtypes — all pre-existing cases, used
  as-is by `amc_value`, `amc_date_of_installation`, `amc_value_type`.
- `depends_on` / `mandatory_depends_on` / `read_only` — evaluated
  generically per-field via `isFieldVisible` / `isFieldMandatory` /
  `isFieldReadOnly` (`src/utils/evalExpression.ts`), which run whatever
  `eval:...` expression the backend sends. So `amc_value_percentage`
  showing only in Percentage mode, `amc_value` only in Value mode, and
  `amc_computed_value`/`amc_grand_total` being read-only, all come for free
  once the backend sends the right metadata — no per-field special-casing
  needed in this file.
- `Date` fields already emit/accept plain `YYYY-MM-DD` strings via the
  native `<input type="date">`, so `amc_date_of_installation` needs no
  extra serialization on save.

### 2. `src/utils/fieldLimits.ts` — added `PERCENT_MAX_LENGTH`

```ts
export const PERCENT_MAX_LENGTH = 6; // "100.00" plus headroom while typing
```
Wired into `getEffectiveMaxLength` alongside the existing `Int`/`Currency`
special cases.

### 3. `src/pages/application/IndentCumSanctionSheetForm.tsx` — rewrote the AMC live-preview calculation

This form does its own client-side "total preview" pass
(`applyIcssPurchaseCalculations`), mirroring backend computation so the UI
shows a live total before save — this is the one piece of real logic that
had to change, since it hardcoded the *old* formula.

**Old behavior** (wrong under the new schema): treated `amc_value` itself
as a percentage of `basic_value_bv_of_the_po`, then applied `amc_gst` as a
*percentage* on top of that subtotal:
```ts
const amcValueAmount = (basicValue * toNumber(next.amc_value)) / 100;
const subtotal = amcValueAmount + toNumber(next.amc_other_charges);
const gstAmount = (subtotal * toNumber(next.amc_gst)) / 100;
next.amc_grand_total = roundCurrency(subtotal + gstAmount);
```

**New behavior**, matching the backend spec exactly:
```ts
const isPercentage = next.amc_value_type === "Percentage";
const computedValue = roundCurrency(
  isPercentage
    ? (basicValue * toNumber(next.amc_value_percentage)) / 100
    : toNumber(next.amc_value),
);
const grandTotal = roundCurrency(
  computedValue + toNumber(next.amc_other_charges) + toNumber(next.amc_gst),
);
next.amc_computed_value = computedValue;
next.amc_grand_total = grandTotal;
```

The trigger condition (`[...].some((fieldname) => fieldname in next)`) was
extended to include `amc_value_type`, `amc_value_percentage`, and
`amc_computed_value` so the recalculation fires when any of the new fields
change, not just the old ones.

## Verified unaffected

- `src/utils/icssPrint.ts`, `src/utils/IcssPoPrint.ts` — only read
  `amc_grand_total` by value for print/PO output; no formatting logic tied
  to the old field types.
- No other hardcoded references to `amc_value`, `amc_gst`,
  `basic_value_bv_of_the_po`, etc. exist outside the calculation block above
  and the display-only usages in summary/print views.

## Not verified

No authenticated session to the `rndopsapp` backend was available from this
checkout, so these changes are confirmed by `tsc --noEmit` and a full `vite
build` only — **not** by actually creating an AMC indent end-to-end in the
running app. Before considering this closed, manually walk through creating
a new AMC indent in both:
- **Percentage mode** — pick `amc_value_type = Percentage`, enter
  `basic_value_bv_of_the_po` and `amc_value_percentage`, confirm
  `amc_computed_value` and `amc_grand_total` match what the backend
  computes and saves.
- **Value mode** — pick `amc_value_type = Value`, enter `amc_value`
  directly, confirm the same.

## Status

Implemented, type-checked, and built successfully. **Not committed** as of
this writing.
