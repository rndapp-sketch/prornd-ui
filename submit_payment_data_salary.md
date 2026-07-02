# `submit_payment_data` — Salary Payment Flow

## Overview

When `submit_payment_data` is called for a **Recruitment Adhoc Contractual / salary payment**, it follows a completely separate path from standard payments. No `AccountHeadPayment` document is created and nothing is published to Kafka. Instead, the payload is written into a `Salary Staging` document keyed by year-month, where it waits for batch approval and processing.

---

## Step 1 — Salary Detection (`_is_recruitment_salary_payment`)

```python
_is_recruitment_salary_payment(doctype, frapAppId, moduleName)
```

The function checks multiple signals, any one of which is sufficient:

| Signal | Condition |
|--------|-----------|
| `doctype` | `== "Recruitment Adhoc Contractual"` |
| `moduleName` | `== "Recruitment Adhoc Contractual"` |
| `moduleName` | `== "11"` (numeric string alias) |
| `moduleId` | `== "11"` |
| `frapAppId` | exists as a record in `Recruitment Adhoc Contractual` doctype |

Missing args are automatically pulled from `frappe.form_dict` using both snake_case and camelCase keys (`moduleId` / `module_id`, `frapAppId` / `frap_app_id`, etc.).

If **none** of these match, the salary branch is skipped entirely and the standard `AccountHeadPayment` + Kafka flow runs instead.

---

## Step 2 — Resolve `salary_year_month`

```python
salary_year_month = salary_year_month or _get_form_value(
    "salary_year_month", "salaryYearMonth", "year_month", "yearMonth"
)
```

`_get_form_value` walks the provided keys in order and returns the first non-null, non-empty value found in `frappe.form_dict`. This gives callers flexibility to send the field under any of the four key names.

`salary_year_month` becomes the **primary key** of the `Salary Staging` record (e.g. `"2026-06"`). If it cannot be resolved, `_append_salary_staging_record` returns an error immediately.

---

## Step 3 — Build the Payload

```python
salary_payload = dict(frappe.form_dict)   # start from all posted form data
```

The payload is then enriched/overwritten with:

| Key | Source |
|-----|--------|
| `doctype`, `name`, `project_name` | explicit function arguments |
| `payment_amount`, `budget_head`, `bmr` | explicit function arguments |
| `refDetails`, `frapAppId`, `moduleName` | explicit function arguments |
| `salary_year_month` | resolved in Step 2 |
| `status` | hardcoded `"PENDING_APPROVAL"` |
| `project_no` | `form_dict["project_no"]` → fallback to `salary_backend_details.project_no` |
| `account_number` | `form_dict["account_number"]` |

`salary_backend_details` is an optional JSON blob that can be posted in `form_dict`. It is parsed from a string if needed and used as a secondary source for `project_no`.

The Frappe internal `cmd` key is stripped from the payload before staging.

---

## Step 4 — Stage the Record (`_append_salary_staging_record`)

```python
_append_salary_staging_record(salary_year_month, salary_payload)
```

This function performs an **upsert** on the `Salary Staging` doctype:

### Case A — Staging doc already exists for this `salary_year_month`

```
GET  Salary Staging/<salary_year_month>
READ salary_record  →  parse as JSON array
APPEND new payload
WRITE salary_record  →  JSON.stringify(updated array)
SAVE (ignore_permissions)
```

### Case B — No staging doc exists yet

```
CREATE new Salary Staging doc
  name           = salary_year_month   (autoname bypassed via flags.name_set)
  salary_year_month = salary_year_month  (if field exists on meta)
  salary_record  = JSON.stringify([payload])   # single-element array
INSERT (ignore_permissions)
```

In both cases `frappe.db.commit()` is called immediately after to flush the write.

> **Why a JSON array?**  
> MariaDB enforces a `json_valid()` CHECK constraint on `salary_record`. Storing records as JSON Lines (one JSON object per line) fails that constraint. Wrapping all entries in a single JSON array satisfies it.

### Return value

```json
{ "status": "success", "message": "Salary record appended", "name": "2026-06", "created": false }
```

or on failure:

```json
{ "status": "error", "message": "<exception message>" }
```

---

## Step 5 — Error Handling & Mattermost Notification

If `_append_salary_staging_record` returns `status == "error"`, a Mattermost alert is fired and the error dict is returned to the caller immediately:

```
:x: Salary Staging Error
DocType : <doctype>
Name    : <name>
Error   : <message>
```

No further processing occurs.

---

## Step 6 — Early Return (no Kafka, no AccountHeadPayment)

On a successful staging, `submit_payment_data` **returns immediately** with the staging result. The rest of the function (doc creation, field resolution, `kafka_publish_payment`, Mattermost success/failure notify) is **not executed** for salary payments.

```
submit_payment_data()
    └── _is_recruitment_salary_payment()  →  True
            └── _append_salary_staging_record()
                    ├── error  →  _mm_notify(:x:) + return error dict
                    └── ok     →  return staging result   ← function exits here
```

---

## Data Flow Diagram

```
Client POST
  │
  ├─ frapAppId / moduleName / doctype
  │       │
  │       ▼
  │   _is_recruitment_salary_payment()
  │       │  True
  │       ▼
  │   Resolve salary_year_month
  │       │
  │       ▼
  │   Build salary_payload
  │   (form_dict + explicit args + salary_backend_details)
  │       │
  │       ▼
  │   _append_salary_staging_record(salary_year_month, payload)
  │       │
  │       ├── Salary Staging exists?
  │       │       YES → parse array → append → save
  │       │       NO  → create new doc with [payload]
  │       │
  │       ├── db.commit()
  │       │
  │       ├── error → _mm_notify(:x:) → return error
  │       └── ok    ──────────────────► return staging result
  │
  └─ (standard AccountHeadPayment + Kafka path — NOT reached for salary)
```

---

## Frontend — What to Send

### Endpoint

```
POST /api/method/rndopsapp.rndopsapp.rndopsapp.commitPayment.submit_payment_data
Content-Type: application/x-www-form-urlencoded   (or multipart/form-data)
```

Frappe also accepts `application/json` when the body is a plain JSON object — all keys land in `frappe.form_dict` either way.

---

### Required Fields

These fields must always be present for the salary branch to work correctly.

| Field | Accepted key(s) | Type | Description |
|-------|-----------------|------|-------------|
| Salary trigger | `doctype` **or** `moduleName` **or** `moduleId` | string | At least one must identify this as a salary payment. See detection table below. |
| Year-month | `salary_year_month` / `salaryYearMonth` / `year_month` / `yearMonth` | string `"YYYY-MM"` | Staging document key, e.g. `"2026-06"`. Required — request fails without it. |
| Payment amount | `payment_amount` | number / string | Gross salary amount for this record. |
| Budget head | `budget_head` | string | Budget Head name, label, or numeric id. |
| Project | `project_name` | string | Project reference number or `project_no`. |
| Frap App ID | `frapAppId` / `frap_app_id` | string | The `Recruitment Adhoc Contractual` document name. Used both for detection and stored in the staging payload. |
| Module name | `moduleName` / `module_name` | string | `"Recruitment Adhoc Contractual"` or `"11"`. |

---

### Salary Detection — Minimum Required (pick one)

The backend accepts **any one** of these to trigger the salary branch:

```
doctype    = "Recruitment Adhoc Contractual"
moduleName = "Recruitment Adhoc Contractual"
moduleName = "11"
moduleId   = "11"
frapAppId  = <valid Recruitment Adhoc Contractual name>
```

Sending `moduleName = "11"` is the shortest option when the doctype name is verbose.

---

### Optional Fields

| Field | Accepted key(s) | Type | Description |
|-------|-----------------|------|-------------|
| Document name | `name` | string | Existing doc name to update. Omit / send `null` to create new. |
| BMR | `bmr` | string | BMR reference number. |
| Reference details | `refDetails` | string | Free-text payment reference. |
| Project number | `project_no` | string | Stored in staging payload; used when `project_name` is the Frappe PK rather than the project number. Can also be nested inside `salary_backend_details`. |
| Account number | `account_number` | string | Bank account number stored in the staging payload. |
| Payment particular | `payment_particular` / `paymentParticular` | string | Narration / payment description. |
| Payment status | `payment_status` / `paymentStatus` | string | Defaults to `"PENDING"` if omitted. |
| Payment date | `payment_date` | string `"YYYY-MM-DD"` | Defaults to today if omitted. |
| Payment ref details | `payment_reference_details` / `paymentRefDetails` | string | Additional reference details. |
| Bank txn number | `bank_transaction_number` / `bankTransactionNumber` | string | Bank transaction / UTR number. |
| Bank txn date | `bank_transaction_date` / `bankTransactionDate` | string `"YYYY-MM-DD"` | Date of bank transaction. |
| Commit ID | `commit_id` / `commitId` / `transactionCommitNumber` | string | Linked commit identifier. |
| Backend details | `salary_backend_details` | JSON string or object | Optional supplemental object. Only `project_no` is read from it currently. |

---

### Minimal Request Example

```json
{
  "doctype":           "Recruitment Adhoc Contractual",
  "frapAppId":         "RAC-2026-00042",
  "moduleName":        "Recruitment Adhoc Contractual",
  "salary_year_month": "2026-06",
  "project_name":      "PRJ-2024-001",
  "payment_amount":    35000,
  "budget_head":       "Manpower"
}
```

---

### Full Request Example

```json
{
  "doctype":                "Recruitment Adhoc Contractual",
  "name":                   null,
  "frapAppId":              "RAC-2026-00042",
  "moduleName":             "Recruitment Adhoc Contractual",
  "salary_year_month":      "2026-06",
  "project_name":           "PRJ-2024-001",
  "payment_amount":         35000,
  "budget_head":            "Manpower",
  "bmr":                    "BMR-001",
  "refDetails":             "June 2026 salary — contractual staff",
  "project_no":             "2024-PRJ-001",
  "account_number":         "1234567890",
  "payment_particular":     "Salary June 2026",
  "payment_date":           "2026-06-30",
  "salary_backend_details": "{\"project_no\": \"2024-PRJ-001\"}"
}
```

---

### Response

**Success**

```json
{
  "status":  "success",
  "message": "Salary record appended",
  "name":    "2026-06",
  "created": false
}
```

`created: true` when the `Salary Staging` document did not exist before this call.

**Error**

```json
{
  "status":  "error",
  "message": "<reason>"
}
```

Common error messages:

| Message | Cause |
|---------|-------|
| `"salary_year_month is required"` | No year-month could be resolved from any accepted key |
| `"<exception text>"` | DB error, permission error, or unexpected exception during staging |

---

### JavaScript / Frappe Call Example

```javascript
frappe.call({
  method: "rndopsapp.rndopsapp.rndopsapp.commitPayment.submit_payment_data",
  args: {
    doctype:           "Recruitment Adhoc Contractual",
    frapAppId:         frm.doc.name,
    moduleName:        "Recruitment Adhoc Contractual",
    salary_year_month: "2026-06",
    project_name:      frm.doc.project_ref_number,
    payment_amount:    frm.doc.net_salary,
    budget_head:       frm.doc.budget_head,
    bmr:               frm.doc.bmr,
    account_number:    frm.doc.account_number,
  },
  callback(r) {
    if (r.message?.status === "success") {
      frappe.msgprint("Salary staged for " + r.message.name);
    } else {
      frappe.msgprint("Error: " + r.message?.message);
    }
  },
});
```

---

## Key Files

| File | Role |
|------|------|
| [commitPayment.py](commitPayment.py) | `submit_payment_data`, `_is_recruitment_salary_payment`, `_get_form_value`, `_append_salary_staging_record` |
| `Salary Staging` doctype | Stores raw salary payloads per year-month, pending batch approval |
| `Recruitment Adhoc Contractual` doctype | Used as the `frapAppId` existence check for detection |
