# Consultancy Project — Category D Calculation Guide

> **Applies to:** Project Type = `Consultancy`, Consultancy Category = `Category D` (Technology Transfer)
>
> **Source:** [`src/pages/ProjectRegistration.tsx`](src/pages/ProjectRegistration.tsx) — `calculateConsultancy()` function (~line 1258)

---

## Overview

Category D is used for **Technology Transfer** consultancy projects. It works **top-down**: the user enters the final grand total (inclusive of GST) and the portion they want to allocate as consultancy fee. All other values are **derived automatically** — no manual entry needed beyond those two inputs.

---

## Variables Quick Reference

These names are used throughout this document. Each maps to a specific UI field and internal variable.

| Name used in this doc | UI Label | Code variable |
|---|---|---|
| **Grand Total** | Grand Total Amount (Inclusive of GST) | `grandTotal` / `cat_d_grand_total_input` |
| **Consultancy Fee Input** | Consultancy Fee / Honorarium / Chair Professorship Input (Inc. 10% OH & 20% IS) | `cfInput` / `cat_d_consultancy_fee_input` |
| **GST Rate** | GST Rate | `gstRate` / `consultancy_gst_rate` |
| **Project Cost Excl. GST** | Total Project Cost (Excluding GST) | `projectCostExclGst` / `cat_d_project_cost_excl_gst` |
| **Operational Expense** | Operational Expense Input (Contingency / Consumable / Equipment / Travel / Manpower, etc.) Inc. 10% OH | `operationalExpense` / `operational_expense_input_inc_10_oh` |
| **Institute Share** | Institute Share | `instituteShare` / `cat_d_institute_share` |
| **Overhead on CF** | *(part of Total Overhead)* | `overheadOnCf` |
| **Overhead on OE** | *(part of Total Overhead)* | `overheadOnOe` |
| **Total Overhead** | Total Overhead | `totalOverhead` / `cat_d_total_overhead` |
| **Net Consultancy Fee** | Consultancy Fee / Honorarium (Base) | `netConsultancyFee` / `cat_d_cf_base` |
| **Net Operational Expense** | Operational Expenses (Base) | `netOperationalExpense` / `cat_d_oe_base` |
| **GST Amount** | GST Amount | `gstAmount` / `cat_d_gst_amt` |
| **Grand Total (Calculated)** | Grand Total (Calculated) | `cat_d_grand_total_calc` |

---

## User Inputs

Only two fields are entered by the user. Everything else is derived.

| UI Label | Description |
|---|---|
| **Grand Total Amount (Inclusive of GST)** | The total amount the funding agency pays, already including GST |
| **Consultancy Fee / Honorarium Input** | The PI's gross fee allocation — includes overhead and institute share inside it; **must stay below 30% of Project Cost Excl. GST** |
| **GST Rate** | Tax rate applied; defaults to **18%** if left blank |

> **Constraint:** Consultancy Fee Input cannot exceed **29.99%** of Project Cost Excl. GST. The UI shows the maximum allowed amount in real-time and blocks form submission if the limit is exceeded.

---

## Step-by-Step Calculation

All steps execute inside `calculateConsultancy()` in [ProjectRegistration.tsx:1258](src/pages/ProjectRegistration.tsx) every time an input changes.

### Helper — `r2`

```
r2(value) = Math.round(value × 100) / 100
```

Rounds to 2 decimal places. Used only for money fields that represent amounts the PI receives (avoids floating-point dust like ₹17499.9999...).

---

### Step 1 — Total Project Cost (Excluding GST)

**Formula:**
```
Project Cost Excl. GST = round( Grand Total / (1 + GST Rate / 100) )
```

**In plain English:**
The Grand Total the agency pays already has GST baked in. To find the actual project cost before tax, we reverse the GST calculation by dividing by `(1 + rate)`. The result is rounded to the nearest rupee (integer).

**Example:** Grand Total = ₹1,18,000 | GST Rate = 18%
```
Project Cost Excl. GST = round( 1,18,000 / (1 + 18/100) )
                       = round( 1,18,000 / 1.18 )
                       = round( 1,00,000 )
                       = ₹1,00,000
```

---

### Step 2 — Operational Expense Input (Inc. 10% OH)

**Formula:**
```
Operational Expense = max(0,  round( Project Cost Excl. GST  −  Consultancy Fee Input ))
```

**In plain English:**
The project cost (ex-GST) is split into two parts — the Consultancy Fee and everything else (equipment, consumables, travel, manpower, etc.). Whatever is left after carving out the Consultancy Fee Input becomes the Operational Expense. The `max(0, ...)` prevents a negative result if the CF Input were mistakenly set too high.

**Example:** Project Cost Excl. GST = ₹1,00,000 | Consultancy Fee Input = ₹25,000
```
Operational Expense = max(0, round( 1,00,000 − 25,000 ))
                    = max(0, 75,000)
                    = ₹75,000
```

---

### Step 3 — Institute Share

**Formula:**
```
Institute Share = round( Consultancy Fee Input × 0.20 )
```

**In plain English:**
IIT Guwahati policy requires **20% of the Consultancy Fee Input** to go to the institute. This is a mandatory cut that comes out of the PI's gross consultancy fee before anything else.

**Example:** Consultancy Fee Input = ₹25,000
```
Institute Share = round( 25,000 × 0.20 )
               = round( 5,000 )
               = ₹5,000
```

---

### Step 4 — Overhead on Consultancy Fee

**Formula:**
```
Overhead on CF = round( Consultancy Fee Input × 0.10 )
```

**In plain English:**
On top of the 20% institute share, an additional **10% overhead** is charged on the Consultancy Fee Input to cover administrative and infrastructure costs of the institute.

**Example:** Consultancy Fee Input = ₹25,000
```
Overhead on CF = round( 25,000 × 0.10 )
              = round( 2,500 )
              = ₹2,500
```

---

### Step 5 — Overhead on Operational Expense

**Formula:**
```
Overhead on OE = round( Operational Expense × 0.10 )
```

**In plain English:**
The institute also charges **10% overhead on the Operational Expense** portion. This is the same overhead rate applied to the project's running costs (equipment, consumables, travel, etc.).

**Example:** Operational Expense = ₹75,000
```
Overhead on OE = round( 75,000 × 0.10 )
              = round( 7,500 )
              = ₹7,500
```

---

### Step 6 — Total Overhead

**Formula:**
```
Total Overhead = Overhead on CF  +  Overhead on OE
```

**In plain English:**
Simply sums the two overhead components into a single displayed figure. Both are already rounded integers, so no further rounding is needed.

**Example:**
```
Total Overhead = 2,500 + 7,500
              = ₹10,000
```

---

### Step 7 — Consultancy Fee / Honorarium (Base) — what the PI actually receives

**Formula:**
```
Net Consultancy Fee = r2( max(0,  Consultancy Fee Input  −  Institute Share  −  Overhead on CF ))
```

**In plain English:**
From the gross Consultancy Fee Input, two deductions are made:
- **Institute Share (20%)** — mandatory institutional cut
- **Overhead on CF (10%)** — administrative overhead

What remains is the **actual amount the PI receives** as consultancy fee / honorarium. `r2()` ensures it displays to exactly 2 decimal places.

**Example:** CF Input = ₹25,000 | Institute Share = ₹5,000 | Overhead on CF = ₹2,500
```
Net Consultancy Fee = r2( max(0,  25,000 − 5,000 − 2,500 ))
                    = r2( max(0,  17,500) )
                    = r2( 17,500 )
                    = ₹17,500.00
```

---

### Step 8 — Operational Expenses (Base) — actual spendable budget

**Formula:**
```
Net Operational Expense = max(0,  Operational Expense  −  Overhead on OE )
```

**In plain English:**
After the 10% overhead is taken from the Operational Expense, the remaining amount is what the project can actually spend on contingency, consumables, equipment, travel, and manpower. This is the real spendable operations budget.

**Example:** Operational Expense = ₹75,000 | Overhead on OE = ₹7,500
```
Net Operational Expense = max(0, 75,000 − 7,500)
                        = ₹67,500
```

---

### Step 9 — GST Amount

**Formula:**
```
GST Amount = max(0,  round( Grand Total  −  Project Cost Excl. GST ))
```

**In plain English:**
GST is back-calculated by subtracting the pre-tax project cost from the grand total. This approach is used instead of `Project Cost × gstRate%` because the integer-rounding in Step 1 can introduce a ₹1 residual — deriving GST by subtraction keeps it perfectly consistent with the grand total.

**Example:** Grand Total = ₹1,18,000 | Project Cost Excl. GST = ₹1,00,000
```
GST Amount = max(0, round( 1,18,000 − 1,00,000 ))
           = max(0, round( 18,000 ))
           = ₹18,000
```

---

## Full Worked Example

**Given inputs:**
- Grand Total Amount (Incl. GST) = ₹1,18,000
- Consultancy Fee Input = ₹25,000
- GST Rate = 18%

| Step | Field Name | Formula | Result |
|---|---|---|---|
| 1 | Total Project Cost (Excl. GST) | `round( 1,18,000 ÷ 1.18 )` | ₹1,00,000 |
| 2 | Operational Expense Input (Inc. 10% OH) | `round( 1,00,000 − 25,000 )` | ₹75,000 |
| 3 | Institute Share | `round( 25,000 × 0.20 )` | ₹5,000 |
| 4 | Overhead on Consultancy Fee | `round( 25,000 × 0.10 )` | ₹2,500 |
| 5 | Overhead on Operational Expense | `round( 75,000 × 0.10 )` | ₹7,500 |
| 6 | Total Overhead | `2,500 + 7,500` | ₹10,000 |
| 7 | Consultancy Fee / Honorarium (Base) | `r2( 25,000 − 5,000 − 2,500 )` | ₹17,500.00 |
| 8 | Operational Expenses (Base) | `75,000 − 7,500` | ₹67,500 |
| 9 | GST Amount | `round( 1,18,000 − 1,00,000 ) @ 18%` | ₹18,000 |
| — | Grand Total (Calculated) | *(echoes the input)* | **₹1,18,000** |

**Sanity check — all parts must sum to Grand Total:**
```
Institute Share           =   5,000
Total Overhead            =  10,000
Net Consultancy Fee       =  17,500
Net Operational Expense   =  67,500
GST Amount                =  18,000
─────────────────────────────────────
Grand Total               = 1,18,000  ✓
```

---

## How the Budget Proposal Table is Auto-Filled

After every calculation, `buildConsultancyBudgetRows()` (line ~1345) writes the results directly into the proposed budget table for Year 1:

| Budget Head | Source field | Amount (from example) |
|---|---|---|
| Overhead | Institute Share + Total Overhead | ₹15,000 |
| Consultancy Fee | Net Consultancy Fee (Base) | ₹17,500 |
| Operational | Net Operational Expenses (Base) | ₹67,500 |
| Others | GST Amount | ₹18,000 |
| **Total** | | **₹1,18,000** |

---

## Validation Rules

1. **Consultancy Fee cap (real-time on blur + on submit):**
   ```
   Consultancy Fee Input  ≤  floor( Project Cost Excl. GST × 0.2999 × 100 ) / 100
   ```
   If violated, the field is reset and an alert is shown. Enforced at ~line 1710 (on change) and ~line 2293 (on submit).

2. **No negative Operational Expense or Net values:** every derived quantity is wrapped in `max(0, ...)`.

3. **No negative GST:** `max(0, ...)` on GST Amount prevents a negative tax figure if inputs are inconsistent.

---

## Read-Only Fields (Auto-Calculated, Never User-Editable)

| UI Label | Code field name |
|---|---|
| Total Project Cost (Excluding GST) | `cat_d_project_cost_excl_gst` |
| Operational Expense Input (Inc. 10% OH) | `operational_expense_input_inc_10_oh` |
| Institute Share | `cat_d_institute_share` |
| Total Overhead | `cat_d_total_overhead` |
| Consultancy Fee / Honorarium (Base) | `cat_d_cf_base` |
| Operational Expenses (Base) | `cat_d_oe_base` |
| GST Amount | `cat_d_gst_amt` |
| Grand Total (Calculated) | `cat_d_grand_total_calc` |

Read-only enforcement is in the `isReadOnly()` logic at ~line 2092–2099.
