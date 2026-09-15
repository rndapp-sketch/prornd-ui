# Salary Module — Detailed Technical Reference

> File: `src/pages/application/SalaryModule.tsx`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Types](#2-data-types)
3. [All API Endpoints](#3-all-api-endpoints)
4. [Full Flow Diagram](#4-full-flow-diagram)
5. [Phase-by-Phase Breakdown](#5-phase-by-phase-breakdown)
   - [Phase 1 — Load Staff](#phase-1--load-staff-fetchdata)
   - [Phase 2 — Salary Calculation (Client-Side)](#phase-2--salary-calculation-client-side)
   - [Phase 3 — Cycle Lock Check](#phase-3--cycle-lock-check)
   - [Phase 4 — Check Processed Status](#phase-4--check-processed-status-checksalarystatuses)
   - [Phase 5 — Fetch Scheme Mapping](#phase-5--fetch-scheme-mapping)
   - [Phase 6 — Build Commit Payload](#phase-6--build-commit-payload-buildcommitdata)
   - [Phase 7 — BMR Modal](#phase-7--bmr-modal)
   - [Phase 8 — Submit Payment](#phase-8--submit-payment-handlebmrsubmit)
6. [Salary Calculation Formula](#6-salary-calculation-formula)
7. [Professional Tax Slabs](#7-professional-tax-slabs)
8. [State Map](#8-state-map)
9. [Error & Skip Conditions](#9-error--skip-conditions)

---

## 1. Overview

The Salary Module is a **Payroll Workspace** for processing monthly salary payments for approved project staff (Recruitment Adhoc Contractual employees) at IIT Guwahati's R&D Operations. The PI (Principal Investigator) who owns the project staff records uses this module to:

- View their approved staff salary register for any month/year
- Calculate pro-rata salaries based on joining/termination dates
- Edit deductions (medical, TA, electricity, ID card, other)
- Submit bulk payments to the Frappe + external ledger backend
- Track which employees have been paid in a given cycle

---

## 2. Data Types

### StaffRecord (mapped from Frappe `Project Staff Details`)

```
docName               — Frappe document name
employee_id           — ps_emp_id
first_name            — full name (first + middle + last)
email_id              — erp_mail or ps_email_id
department            — ps_department
designation           — ps_designation
joining_date          — ps_joining_date
term_completion_date  — ps_term_completion_date
basic_salary          — ps_basic_salary (rounded integer)
hra                   — calculated from ps_hra % of basic
hra_percent           — raw % value
medical_allowance     — ps_ma ("yes" = ₹1250, else numeric)
hostel                — ps_hostel amount
workflow_state        — must be "Approved"
project_no            — project_no
bank_account_number   — bank_account_number
ps_hostel             — raw hostel field (used for HRA deduction logic)
```

### EditableInputs (per-employee overrides, stored in `overrides` state)

```
ta                — Transport Allowance deduction
otherDeduction    — Other deductions
arrear            — Arrear addition to earnings
medicalDeduction  — Medical deduction (default = pro-rated medical_allowance)
idCardCharge      — ID card charge deduction
electricityBill   — Electricity bill deduction
comment           — Free-text comment
remarks           — Free-text remarks
```

---

## 3. All API Endpoints

### GET Endpoints (data fetching)

| # | When Called | Method | Endpoint | Purpose |
|---|---|---|---|---|
| 1 | On mount / Refresh | POST | `frappe.client.get_list` → `Project Staff Details` | Load approved staff records for current PI |
| 2 | After staff loaded | POST | `frappe.client.get_list` → `Project Registration` | Fetch scheme name + scheme number per project |
| 3 | After staff loaded | POST | `frappe.client.get_list` → `Department_prornd` | Resolve department IDs to human-readable names |
| 4 | On period change / After staff load | GET | `/api/resource/Salary%20Staging/{yyyy_month}` | Check which employees are already processed for this cycle |
| 5 | During bulk pay (per employee) | GET | `/api/method/rndopsapp.rndopsapp.commitPayment.salary_payment_data?ps_emp_id=...&yyyy_month=...` | Fetch commit payload from backend (primary) |
| 6 | During bulk pay (fallback) | GET | `/ledger-api/account-head-commit/by-status/COMMITTED` | Fetch all committed budget heads (ledger fallback) |
| 7 | During payment submission | GET | `/api/resource/Project%20Registration?filters=[["project_no","=","..."]]&fields=["name"]` | Resolve `project_no` → Frappe doc name for payment linking |

### POST Endpoint (payment submission)

| # | When Called | Method | Endpoint | Purpose |
|---|---|---|---|---|
| 8 | On BMR confirm (per employee) | POST | `/api/method/rndopsapp.rndopsapp.commitPayment.submit_payment_data` | Stage salary payment in backend |

---

## 4. Full Flow Diagram

```
USER OPENS SALARY MODULE
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: Load Staff                                     │
│                                                          │
│  POST frappe.client.get_list                            │
│  doctype: "Project Staff Details"                        │
│  filters: owner=currentUser, workflow_state=Approved    │
│                                                          │
│  ── fallback 1: try pi_email, pi_webmail fields ──       │
│  ── fallback 2: fetch all Approved, filter client-side ──│
│                                                          │
│  → records[] populated & mapped via mapRow()             │
└─────────────────────────────────────────────────────────┘
         │
         ▼ (parallel after records loaded)
┌──────────────────────┐    ┌──────────────────────────────┐
│  PHASE 2             │    │  PHASE 4                      │
│  Client-side salary  │    │  POST frappe.client.get_list  │
│  calculation         │    │  doctype: "Project Reg."      │
│  (no API call)       │    │  → schemeMap, schemeNumberMap │
└──────────────────────┘    └──────────────────────────────┘
         │                           │
         │         ┌─────────────────┘
         ▼         ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 3: Fetch Department Labels                        │
│                                                          │
│  POST frappe.client.get_list                            │
│  doctype: "Department_prornd"                            │
│  → departmentLabels{} for display                        │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 5: Check Cycle Lock (localStorage)               │
│                                                          │
│  isPrepared = preparedCycles["2026-6"] === true          │
│                                                          │
│  if NOT prepared → show "Not Prepared" banner            │
│  if prepared     → show salary table + payment actions   │
└─────────────────────────────────────────────────────────┘
         │ (only if isPrepared)
         ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 6: Check Processed Status                         │
│                                                          │
│  GET /api/resource/Salary%20Staging/2026_june           │
│                                                          │
│  Parse salary_record[] JSON                              │
│  → processedEmployees Set<employee_id>                   │
│                                                          │
│  Pending tab  = filtered records NOT in processedSet     │
│  Processed tab = filtered records IN processedSet        │
└─────────────────────────────────────────────────────────┘
         │
         ▼
   USER SELECTS EMPLOYEES (checkboxes) AND CLICKS "PAY SELECTED"
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 7: Build Commit Payloads (handlePaySelected)      │
│                                                          │
│  For EACH selected employee:                             │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  GET salary_payment_data                        │    │
│  │  ?ps_emp_id={id}&yyyy_month=2026_june           │    │
│  │                                                  │    │
│  │  Response cases:                                 │    │
│  │  ┌──────────────────────────────────────────┐   │    │
│  │  │ [{projectNumber, accountHeadId,          │   │    │
│  │  │   moduleId, frapAppId,                   │   │    │
│  │  │   transactionCommitNumber}]              │   │    │
│  │  │  → commit built ✓                        │   │    │
│  │  └──────────────────────────────────────────┘   │    │
│  │  ┌──────────────────────────────────────────┐   │    │
│  │  │ [{status:"Pending Approval..."}]         │   │    │
│  │  │  → SKIP (already staged) ✗              │   │    │
│  │  └──────────────────────────────────────────┘   │    │
│  │  ┌──────────────────────────────────────────┐   │    │
│  │  │ [{status:"error", message:"..."}]        │   │    │
│  │  │  → ERROR ✗                              │   │    │
│  │  └──────────────────────────────────────────┘   │    │
│  │  ┌──────────────────────────────────────────┐   │    │
│  │  │ [] (empty)                               │   │    │
│  │  │  → try LEDGER FALLBACK                  │   │    │
│  │  └──────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  LEDGER FALLBACK (if primary returns empty):             │
│  GET /ledger-api/account-head-commit/by-status/COMMITTED│
│  Find match: moduleId="11" AND                           │
│              normalize(projectNumber) = normalize(r.project_no)│
│  → if match → commit built ✓                            │
│  → if no match → ERROR ✗                               │
└─────────────────────────────────────────────────────────┘
         │
         ├─── if 0 commits built → show Results Modal directly
         │
         ▼ (at least 1 commit built)
┌─────────────────────────────────────────────────────────┐
│  PHASE 8: BMR Modal                                      │
│                                                          │
│  Show list of payable employees with net pay amounts     │
│  User enters BMR number (Bill/Money Receipt)             │
│  User clicks "Submit"                                    │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 9: Submit Payment (handleBmrSubmit)               │
│                                                          │
│  For EACH employee in pendingBulkCommits:               │
│                                                          │
│  ┌─ Step A ──────────────────────────────────────────┐  │
│  │  GET /api/resource/Project%20Registration         │  │
│  │  ?filters=[["project_no","=","..."]]              │  │
│  │  → resolve projectNo → Frappe doc name            │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Step B ──────────────────────────────────────────┐  │
│  │  POST /api/method/                                │  │
│  │    rndopsapp.rndopsapp.commitPayment              │  │
│  │    .submit_payment_data                           │  │
│  │                                                   │  │
│  │  Body includes:                                   │  │
│  │  - doctype: "Recruitment Adhoc Contractual"       │  │
│  │  - moduleId: "11"                                 │  │
│  │  - project_name, project_no, project_ref_number   │  │
│  │  - payment_amount (= net pay)                     │  │
│  │  - payment_date, payment_status: "PENDING"        │  │
│  │  - bmr (from user input)                          │  │
│  │  - frapAppId, commit_id, refDetails               │  │
│  │  - salary_year_month (e.g. "2026_june")           │  │
│  │  - salary_user_details { employee info + amounts }│  │
│  │  - salary_backend_details { ps_emp_id, scr_id }   │  │
│  │                                                   │  │
│  │  Success: response.message.name exists → ✓        │  │
│  │  Failure: status=error / no name field → ✗        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 10: Results Modal                                 │
│                                                          │
│  Show per-employee outcome:                              │
│  ✓ success  — "Staged as {doc_name}"                   │
│  ✗ error    — error message from backend                │
│  ⊘ skipped  — already staged / no commit found          │
│                                                          │
│  markAsProcessed(empId) → moves to "Processed" tab      │
│  fetchData() → re-sync staff list                        │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Phase-by-Phase Breakdown

### Phase 1 — Load Staff (`fetchData`)

Called on mount and on every Refresh click. Uses `useFrappePostCall("frappe.client.get_list")`.

**Strategy (3-tier fallback):**

```
Attempt 1:  filters = [owner = currentUser, workflow_state = Approved]
                │
                ├── rows found? → done
                │
Attempt 2:  for each of [webmail_id, pi_webmail, pi_email, principal_investigator]:
            filters = [field = currentUser, workflow_state = Approved]
                │
                ├── rows found? → done
                │
Attempt 3:  fetch ALL Approved → client-side filter by owner/email fields
            if still nothing → use all Approved (safety net)
                │
                └── final client-side filter: workflow_state === "approved"
```

All rows are passed through `mapRow()` which normalizes field names and computes derived values (HRA amount from %, medical from "yes"/"no" string, full name from parts).

---

### Phase 2 — Salary Calculation (Client-Side)

No API call. All math runs in the browser on every render using `useMemo`.

See [Section 6](#6-salary-calculation-formula) for formulas.

Key inputs per employee:
- `basic_salary`, `hra`, `medical_allowance` from StaffRecord
- `joining_date`, `term_completion_date` to compute working days
- `selectedMonth`, `selectedYear` for the pay period
- `overrides[docName]` for any manually edited deduction/arrear values

---

### Phase 3 — Cycle Lock Check

```
localStorage key: "rnd_prepared_salary_cycles"
Value:            { "2026-6": true, "2026-5": true, ... }

cycleKey = `${selectedYear}-${selectedMonth}`
isPrepared = !!preparedCycles[cycleKey]
```

- If `false` → shows "Not Prepared" banner; salary table, export, and payment buttons are hidden.
- If `true` → full UI is unlocked.
- Unlock button removes the key from localStorage and resets processedEmployees.

---

### Phase 4 — Check Processed Status (`checkSalaryStatuses`)

Called automatically when `records.length > 0 && isPrepared`, and re-triggered on every period change.

```
GET /api/resource/Salary%20Staging/2026_june
                │
                ├── 200 OK
                │     data.salary_record = JSON string array
                │     Parse → extract ps_emp_id / employee_id per record
                │     → setProcessedEmployees(Set<empId>)
                │
                └── 404 (no doc yet)
                      → processedEmployees stays empty (correct)
```

Stale-guard: if the user changed the month while the request was in-flight, the result is discarded.

---

### Phase 5 — Fetch Scheme Mapping

Called after staff records load. Maps each `project_no` to its scheme name and scheme number.

```
POST frappe.client.get_list
  doctype: "Project Registration"
  filters: [["project_no", "in", [all unique project_nos]]]
  fields: ["project_no", "funding_agency_schemes", "enter_scheme_number"]

→ schemeMap        { project_no → funding_agency_schemes }
→ schemeNumberMap  { project_no → enter_scheme_number }
```

Used for the Scheme dropdown filter and for the bulk-pay scheme validation (all selected staff must share the same scheme number).

---

### Phase 6 — Build Commit Payload (`buildCommitData`)

Called per-employee during `handlePaySelected`. Returns `{ ok: true, commit }` or `{ ok: false, reason }`.

```
salary_year_month = "2026_june"

─── Primary API ────────────────────────────────────────────────────────────
GET /api/method/rndopsapp.rndopsapp.commitPayment.salary_payment_data
    ?ps_emp_id={employee_id}&yyyy_month=2026_june

Response interpretation:
  [{projectNumber, accountHeadId, moduleId, frapAppId,
    transactionCommitNumber, commitDate}]
      → validate required fields
      → build commit payload  ✓

  [{status: "Pending Approval in Account Portal", message: "..."}]
      → return { ok: false, reason: "Salary already initiated..." }
      → marked as SKIPPED in results

  [{status: "error", message: "..."}]
      → return { ok: false, reason: message }
      → marked as ERROR in results

  [] (empty list)
      → fall through to ledger fallback ↓

─── Ledger Fallback ────────────────────────────────────────────────────────
GET /ledger-api/account-head-commit/by-status/COMMITTED

  Filter: moduleId === "11"  AND
          normalize(projectNumber) === normalize(employee.project_no)
    (normalize = trim + uppercase + strip non-alphanumeric)

  match found → build commit from ledger data  ✓
  no match    → return { ok: false, reason: "No committed budget-head..." }
```

Commit payload structure (passed to submission):
```json
{
  "projectNumber": "...",
  "accountHeadId": "...",
  "moduleId": "11",
  "frapAppId": "...",
  "commitDate": "...",
  "commitParticular": "Salary payment for {name} ({id}) - June 2026",
  "refDetails": "{transactionCommitNumber}",
  "commitAmount": 45000,
  "transactionCommitNumber": "...",
  "salary_year_month": "2026_june",
  "salary_user_details": { ...all calculated salary fields },
  "salary_backend_details": { "ps_emp_id": "...", "scr_id": "...", "project_no": "..." }
}
```

---

### Phase 7 — BMR Modal

After commit payloads are built:
- If **0 commits** → skip modal, show Results Modal immediately (only build failures shown)
- If **≥1 commit** → open BMR modal

The modal lists all payable employees with their net pay amounts and a total. User must enter a BMR (Bill/Money Receipt) number to proceed.

Scheme validation before opening modal:
```
All selected employees must have the same schemeNumberMap[project_no]
If mixed schemes → alert and abort
```

---

### Phase 8 — Submit Payment (`handleBmrSubmit`)

Runs sequentially for each employee (not parallel, to avoid race conditions on the backend).

**Step A — Resolve Project Ref:**
```
GET /api/resource/Project%20Registration
    ?filters=[["project_no","=","{rawProjectNo}"]]&fields=["name"]

→ projectRef = data[0].name  (Frappe document name)
→ cached in projectRefCache{} to avoid duplicate calls
```

**Step B — POST Payment:**
```
POST /api/method/rndopsapp.rndopsapp.commitPayment.submit_payment_data
Content-Type: application/json

Body:
{
  ...commitData,
  doctype: "Recruitment Adhoc Contractual",
  moduleName: "Recruitment Adhoc Contractual",
  moduleId: "11",
  project_ref_number: projectRef,
  project_name: projectRef,
  project_no: "...",
  payment_amount: netPay,
  budget_head: accountHeadId,
  payment_particular: "Salary payment for ...",
  payment_date: "2026-07-20",
  payment_status: "PENDING",
  bmr: "BMR-2026-001",
  frapAppId: "...",
  commit_id: transactionCommitNumber,
  refDetails: transactionCommitNumber,
  salary_year_month: "2026_june",
  salary_user_details: { ...all payslip details },
  salary_backend_details: { ps_emp_id, scr_id, project_no }
}
```

**Success condition:** `response.message.name` must be present (the created Frappe document name). HTTP 200 without a `name` is treated as failure.

---

## 6. Salary Calculation Formula

```
daysInMonth       = total calendar days in selected month/year

workingDays       = days employee was active in the month
                    (from max(joining_date, monthStart)
                     to min(term_completion_date, monthEnd))
                    → 0 if joining_date > monthEnd
                    → 0 if term_completion_date < monthStart

proRataBasic      = round((basic_salary / daysInMonth) * workingDays)

proRataHRA        = round((hra / daysInMonth) * workingDays)

proRataMedical    = round((medical_allowance / daysInMonth) * workingDays)

grossPay          = proRataBasic + proRataHRA + proRataMedical + arrear

── Deductions ──────────────────────────────────────────

hraDeduction      = proRataHRA  (only if ps_hostel is truthy)
                    = 0         (if ps_hostel = "0" / "no" / "false" / "")

medicalDeduction  = proRataMedical  (default, editable)

pTax              = calcPTax(basic_salary)   ← see tax slabs below

ta                = 0  (editable)
idCardCharge      = 0  (editable)
electricityBill   = 0  (editable)
otherDeduction    = 0  (editable)

totalDeduction    = hraDeduction + medicalDeduction + pTax
                  + ta + idCardCharge + electricityBill + otherDeduction

netPay            = grossPay - totalDeduction
```

---

## 7. Professional Tax Slabs

Assam Professional Tax applied on the **contract basic salary** (not pro-rated):

| Monthly Basic Salary | P-Tax |
|---|---|
| ≤ ₹15,000 | ₹0 |
| ₹15,001 – ₹25,000 | ₹180 |
| > ₹25,000 | ₹208 |

---

## 8. State Map

```
records[]               — all StaffRecord objects from Frappe
isLoading               — true during fetchData
error                   — Frappe error string or null
selectedMonth           — 0–11 (current month default)
selectedYear            — e.g. 2026
preparedCycles          — { "2026-6": true } from localStorage
isPrepared              — derived from preparedCycles[cycleKey]
processedEmployees      — Set<employee_id> from Salary Staging doc
overrides               — { [docName]: Partial<EditableInputs> }
selectedEmpIds          — Set<employee_id> (checkboxes)
pendingBulkCommits      — { [empId]: commitPayload } ready for submission
selectedBulkRecords     — StaffRecord[] shown in BMR modal preview
buildFailures[]         — PaymentOutcome[] for employees that couldn't get a commit
bmrInput                — string entered in BMR modal
bmrSubmitting           — true while POSTing payments
paymentResults[]        — final per-employee outcomes
resultsModalOpen        — controls Results Modal visibility
schemeMap               — { project_no → funding_agency_schemes }
schemeNumberMap         — { project_no → enter_scheme_number }
departmentLabels        — { dept_id → dept_name }
activeTab               — "pending" | "processed"
```

---

## 9. Error & Skip Conditions

| Condition | Outcome |
|---|---|
| `salary_payment_data` returns `status: "Pending Approval in Account Portal"` | **Skipped** — already staged, not submitted again |
| `salary_payment_data` returns `status: "error"` | **Error** — shown in results modal |
| `salary_payment_data` returns empty `[]` AND ledger has no matching `moduleId=11` commit for this project | **Error** — "No committed budget-head entry found" |
| Commit payload missing any of `projectNumber`, `accountHeadId`, `moduleId`, `frapAppId`, `transactionCommitNumber` | **Error** — "Incomplete commit data — missing: ..." |
| `submit_payment_data` returns HTTP error | **Error** — HTTP status in message |
| `submit_payment_data` returns 200 but `message.status === "error"` | **Error** — backend message |
| `submit_payment_data` returns 200 but no `message.name` | **Error** — "Backend did not confirm the payment was staged" |
| Selected employees belong to different scheme numbers | **Aborted before modal** — alert shown |
| Employee's working days = 0 for selected period | **Filtered out** — never shown in the table |
