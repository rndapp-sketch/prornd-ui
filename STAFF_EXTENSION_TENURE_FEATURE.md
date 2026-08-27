# Project Staff Extension — Auto Tenure Computation & Editable Preview

Status: backend implemented, frontend not yet built.

## Background

When a `Project Staff Extension` request reaches the `Approved` workflow state, the system must automatically compute a new tenure period (start date, end date, basic salary) and append it as a new row to `Project Staff Details.table_ymed` (the "Tenure Details" child table).

Rules:
- New term start date = last term's `pstd_term_completion_date` + a gap.
  - Gap = **3 working days** if total months worked so far is a multiple of 11, otherwise **1 working day**.
  - "Working day" skips Saturdays, Sundays, and institute holidays.
- New term end date = new start date + `ex_period_staff` months − 1 day.
- New basic salary = previous tenure row's basic salary + `increment_by_staff`.
- Staff should be able to see this computed result *before* final approval and edit the dates if needed; the edited value becomes final.

---

## Backend — done

### 1. Working-day calculator

**File:** `rndopsapp/rndopsapp/working_days.py`

```python
is_working_day(date) -> bool
add_working_days(start_date, n) -> date
```

- Reads holiday dates from `rndopsapp/calender/<year>/calender.json` (one file per year, `"holiday"` key marks a date as a holiday).
- Skips Saturday/Sunday regardless of the calendar file.
- If a year's calendar file doesn't exist (e.g. a future year not yet uploaded), falls back to weekend-only skipping — does not error.

### 2. Shared computation function

**File:** `rndopsapp/rndopsapp/doctype/project_staff_extension/project_staff_extension.py`

```python
compute_new_tenure(ex_emp_id, period, increment=None) -> dict
```

Pure function, no DB writes. Returns:

```json
{
  "total_months_worked": 22,
  "gap_days": 1,
  "new_joining_date": "2026-09-01",
  "new_completion_date": "2027-02-28",
  "prev_basic_salary": 45000.0,
  "new_basic_salary": 47000.0
}
```

Used by both the live preview API and the real approval-time write, so they can never disagree.

### 3. New whitelisted preview API

```
Method: rndopsapp.rndopsapp.doctype.project_staff_extension.project_staff_extension.preview_new_tenure
Args:
  ex_emp_id  (string, required)
  period     (int/string, required, 1-11)
  increment  (number, optional)
Returns: same shape as compute_new_tenure() above
```

No side effects — safe to call on every keystroke/blur while the staff/HR user is entering a period.

Throws (as standard Frappe validation errors, catch and surface the message):
- `"Employee Id is required."`
- `"Extension period (in months) is required."` / `"Invalid Extension Period: {value}"`
- `"Project Staff Details not found for Employee ID {id}"`
- `"No existing tenure records found in Project Staff Details."`

### 4. New doctype fields on `Project Staff Extension`

| Field | Type | Editable | Notes |
|---|---|---|---|
| `ex_computed_new_joining_date` | Date | read-only | System-suggested new term start |
| `ex_computed_new_completion_date` | Date | read-only | System-suggested new term end |
| `ex_final_new_joining_date` | Date | editable | Used at approval if set |
| `ex_final_new_completion_date` | Date | editable | Used at approval if set |

Behavior:
- On every save (`validate()`), if `ex_period_staff` is set, `ex_computed_*` is refreshed from `compute_new_tenure()`.
- `ex_final_*` is defaulted to match `ex_computed_*` **only while still empty** — once a human edits it, later saves stop overwriting it.
- At the `Approved` transition, `auto_create_tenure_record()` writes `ex_final_*` (if present) else `ex_computed_*` into the new `Tenure Details` row.

### 5. Existing endpoints updated to carry the new fields

- `get_project_staff_extension_fields` — field metadata now includes the 4 new fields, gated to the "Pending Staff Approval" stage the same way `ex_period_staff` / `increment_by_staff` already are (visible from "Pending PI Approval" onward, editable only in "Pending Staff Approval" for users with the `_isRnDStaff` role flag).
- `save_project_staff_extension` — accepts `ex_final_new_joining_date` / `ex_final_new_completion_date` in its payload, including the docstatus==1 (submitted) edit path.
- `get_project_staff_extension_list` — list rows now include all 4 new fields.

### 6. Not changed

- No new role/permission gating was added for editing past `Tenure Details` rows on `Project Staff Details` — left open as it was (any user with write access to the parent can edit any tenure row). This was an explicit decision, not an oversight.

---

## Frontend — to be built

### 1. Live preview panel

Wherever `ex_period_staff` and `increment_by_staff` are entered (the "Pending Staff Approval" stage screen):

- On change/blur of the period field (and increment field), call `preview_new_tenure` with the current `ex_emp_id`, `period`, `increment`.
- Render the response as something like:
  > Probable new term: **{new_joining_date} → {new_completion_date}**, new basic **₹{new_basic_salary}**
- Catch thrown errors and show them inline (period-cap violations, missing tenure history, etc.) instead of a raw exception dialog.

### 2. Editable override fields

- Render `ex_final_new_joining_date` / `ex_final_new_completion_date` as normal date pickers, pre-filled from the preview response (or from the doc's saved `ex_computed_*` values on reload).
- Saving the form with edited values is already supported by `save_project_staff_extension` — no new save endpoint needed.
- Optionally show `ex_computed_new_joining_date` / `ex_computed_new_completion_date` alongside as read-only, so it's visible when someone has overridden the system suggestion (audit/sanity-check value).

### 3. Respect existing field-gating metadata

`get_project_staff_extension_fields` already returns `depends_on` / `read_only_depends_on` eval expressions for these fields. If the frontend has a generic field-renderer that already evaluates these for other fields, no extra per-field logic should be needed — just make sure the 4 new fieldnames flow through it.

### 4. Editable past tenure dates

Per the "leave open" decision, this is just: expose `Project Staff Details.table_ymed` as an editable grid wherever HR views tenure history. No new API — standard Frappe child-table editing already works since there's no permlevel lock on those fields.

### 5. Test checklist before sign-off

- [ ] Multiple-of-11 total-months case produces a 3-**working**-day gap (not 3 calendar days) in the preview.
- [ ] A gap that spans a weekend or a holiday listed in `calender/2026/calender.json` computes correctly.
- [ ] Editing `ex_final_*` and reloading the form does not get silently overwritten by a later save.
- [ ] Approving with no manual override falls back correctly to the computed dates.
- [ ] Behavior when the relevant year's calendar file doesn't exist yet (e.g. 2027) — should still compute (weekend-only gap), not error; flag to HR that holiday accuracy needs that year's file uploaded.
