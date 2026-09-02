# Project Staff Extension Module

Documentation for the **Project Staff Extension** (Re-Engagement) module in the ProRnD frontend.
This module lets project staff request an extension of their tenure and routes the request
through a PI → R&D Staff → HoS approval workflow.

---

## 1. Overview

| | |
|---|---|
| **Purpose** | Apply for and approve re-engagement / extension of a project staff member's tenure |
| **Frontend page** | [src/pages/application/ProjectStaffExtensionForm.tsx](../src/pages/application/ProjectStaffExtensionForm.tsx) |
| **Route** | `/project-staff-extension` (registered in [src/main.tsx](../src/main.tsx)) |
| **Backend DocType** | `Project Staff Extension` (Frappe app `rndopsapp`) |
| **API namespace** | `extensionAPI` in [src/services/apiService.ts:62](../src/services/apiService.ts#L62) |
| **Entry point** | Project Staff Dashboard → *"Project Staff Extension"* card ([ProjectStaffDashboard.tsx:155](../src/pages/dashboards/ProjectStaffDashboard.tsx#L155)) |

---

## 2. Workflow

The document moves through the following states:

```
Draft → Pending PI Approval → Pending Staff Approval → Pending HoS Approval → Approved
                    │                    │
                    └──── Reject ────────┴────────────────► Rejected
```

Defined in the frontend as `WORKFLOW_STAGES`:

```ts
const WORKFLOW_STAGES = [
  "Draft",
  "Pending PI Approval",
  "Pending Staff Approval",
  "Pending HoS Approval",
  "Approved",
];
```

Terminal states: `Approved`, `Rejected`, `Cancelled`.

### Actors and responsibilities

| Stage | Actor | Fills in | Action |
|-------|-------|----------|--------|
| **Draft** | Applicant (project staff) | Last extension date, months/days worked, **period of extension sought** (`ex_period`) | Submit |
| **Pending PI Approval** | PI / Faculty | **Period suggested by PI** (`ex_period_pi`), increment recommended by PI (`increment_by_pi`) | Forward / Reject |
| **Pending Staff Approval** | R&D Staff | **Period allowed by Staff** (`ex_period_staff`), increment allowed by Staff (`increment_by_staff`), + **project commitment** | Forward / Reject |
| **Pending HoS Approval** | Head of Section, R&D | — | Approve / Reject |

Role detection lives in `isPI` / `isRnDStaff` inside
[ProjectStaffExtensionForm.tsx](../src/pages/application/ProjectStaffExtensionForm.tsx).

---

## 3. API Endpoints

From [src/services/apiService.ts:62](../src/services/apiService.ts#L62):

```ts
export const extensionAPI = {
    getFields:          "…project_staff_extension.get_project_staff_extension_fields",
    save:               "…project_staff_extension.save_project_staff_extension",
    submit:             "…project_staff_extension.submit_project_staff_extension",
    getList:            "…project_staff_extension.get_project_staff_extension_list",
    getWorkflowActions: "…project_staff_extension.get_project_staff_extension_workflow_actions",
    performAction:      "…project_staff_extension.perform_project_staff_extension_action",
};
```

| Method | Purpose |
|--------|---------|
| `save` | Create/update the document (Draft). Called on *Save Draft*, *Save Changes*, and before every workflow action. |
| `submit` | Raw `doc.submit()` — used as a fallback when the workflow transition can't be resolved. |
| `getList` | Fetch the user's applications **and** hydrate the form for an already-submitted doc (see §3.1). |
| `getWorkflowActions` | Fetch the actions available to the current user for the doc's current state. |
| `performAction` | Apply a named workflow transition with an audit comment. |

Applicant details are pre-filled from `get_my_basic_details` (`project_staff_details`).

### 3.1 ⚠️ How a submitted doc is loaded (important)

The form deliberately hydrates an **already-submitted** document from the **`getList` response
row**, *not* from `frappe.client.get`. This is intentional: the `Project Staff Extension` DocType
only grants read permission to `System Manager`, so `frappe.client.get` would fail for an applicant
or reviewer. Because `get_project_staff_extension_list` runs with `ignore_permissions=True`, the
row is always available there, and the form uses it directly.

**Consequence:** every field the form displays **must be selected by the list query**. If the list
endpoint omits a field, that field arrives `undefined` and its section renders blank — even though
the value exists in the database. See the resolved issue in §7.1.

---

## 4. Key Fields

### Applicant details (read-only, auto-filled)
`ex_name`, `ex_emp_id`, `ex_proj_no`, `ex_proj_name`, `ex_designation`, `department`,
`ex_doj` (date of joining), `ex_date_of_expiry` (tenure expiry), `ex_current_basic` (basic pay).

### Editable per stage
| Field | Stage | Type |
|-------|-------|------|
| `ex_last_ex_date` | Draft | Date |
| `ex_no_of_mon_worked` | Draft | Number |
| `ex_no_of_days_worked` | Draft (shown when months < 1) | Number |
| `ex_period` | Draft | Select 1–11 months **(required)** |
| `ex_period_pi` | Pending PI Approval | Select 1–11 months **(required to forward)** |
| `increment_by_pi` | Pending PI Approval | Currency |
| `ex_period_staff` | Pending Staff Approval | Select 1–11 months **(required to forward)** |
| `increment_by_staff` | Pending Staff Approval | Currency |

The payload is assembled in `buildPayload()` inside the form component.

> **Note:** all 8 editable fields above (plus `ex_doj`, `ex_date_of_expiry`, `ex_current_basic`)
> must be present in the `getList` projection — see §3.1 and §7.1.

---

## 5. UI Structure

The page renders (top to bottom):

1. **Header** — title + current workflow-state badge.
2. **My Applications list** — shown when the user already has applications and hasn't opened a
   specific one.
3. **Workflow Timeline** — visual stage tracker (`WorkflowTimeline`).
4. **Applicant Details** — read-only, auto-filled card.
5. **Extension Details** — editable in Draft only.
6. **PI Recommendation / Evaluation** — visible once past Draft or when values exist.
7. **R&D Staff Decision / Evaluation** — visible once past Pending PI Approval.
8. **Actions card** — Edit / Save Draft / Save Changes / workflow buttons + mandatory comment.
9. **Right sidebar** — `CommitPayment` (Staff stage) + `ActivityLog`.

### Editability gates
- `isEditable = workflow_state === "Draft" && docstatus === 0`
- `canEdit = isEditable && isEditing`
- `canEditPIFields` / `canEditStaffFields` — enabled only for the matching actor in the matching state.
- `hasUnsavedEvaluationChanges` — forces PI/Staff to **Save Changes** before forwarding.
- `commitRequired` — Staff must stage a project commitment (via `CommitPayment`) before forwarding.

---

## 6. Submit / Action Flow

Handler: `handleActionConfirm` in the form component.

1. Validate stage-specific required fields (`ex_period`, `ex_period_pi`, `ex_period_staff`).
2. Save the latest edits (`save`) when acting from Draft / PI / Staff states.
3. Call `performAction({ docname, action, comment })`.
4. **Fallback:** if the action fails and the doc is still in **Draft** with a submit/forward-style
   action, call `submit` (raw `doc.submit()`) so the applicant is never stuck.
5. On failure, surface the backend message: `Submission failed: <reason>`.

Every workflow action requires a non-empty **workflow comment** for the audit trail.

---

## 6a. Business Rules — Eligibility & Extension Cap

Implemented client-side in [ProjectStaffExtensionForm.tsx](../src/pages/application/ProjectStaffExtensionForm.tsx)
(`validateApplicantEligibility`, `validateGrantPeriod`, and the `maxExtensionAllowed` derivations).

| # | Rule | Condition | Where enforced |
|---|------|-----------|----------------|
| 1 | **Application window** | May apply only within the **last 1 month** of the term completion date, i.e. `today ≥ (ex_date_of_expiry − 1 month)`. | Draft save + submit; Submit button disabled + banner |
| 2 | **Max total service** | Total service **≤ 33 months**. If `months_worked ≥ 33` → no extension; if `> 33` → blocked entirely. | Draft save + submit; banner; select shows no options |
| 3 | **Extension duration** | `months_worked + extension ≤ 33`, so **max extension = 33 − months_worked**. | Period selects capped to `min(11, 33 − worked)` for applicant **and** PI/Staff; validated on save/forward |

**Derived values:**
```ts
const MAX_TOTAL_SERVICE_MONTHS = 33;
const maxExtensionAllowed = Math.max(0, Math.floor(33 - monthsWorked)); // e.g. 27→6, 30→3, 33→0
const maxSelectableMonths = Math.min(11, maxExtensionAllowed);          // select range cap
const isWithinApplicationWindow = today >= (termCompletionDate - 1 month);
```

**Validation messages:**
- *Window:* "You can apply … only within the last 1 month of your term completion date … opens on `<date>`."
- *Cap reached (= 33):* "You have completed the maximum permissible service period of 33 months. No further extension can be applied for."
- *Cap exceeded (> 33):* "You have already completed `<n>` months … which exceeds the maximum permissible 33 months …"
- *Duration:* "The maximum extension you can apply for is `<max>` month(s) (33 − `<worked>` already worked) …"

> **✅ Backend also enforces these rules** (authoritatively), in
> `project_staff_extension.py`:
> - `validate_applicant_eligibility()` — window + 33-month cap + sought-period cap; called from
>   `before_submit` **and** from `perform_..._action` on the Draft→forward transition.
> - `validate_period_cap()` — PI period checked on Pending PI Approval forward, Staff period on
>   Pending Staff Approval forward, plus a final guard in `auto_create_tenure_record`.
> - `get_service_context()` — computes **total months worked** from the Project Staff Details
>   tenure rows (`table_ymed`, `days / 30.437` per row) and the current term completion date.
>
> Constants live at module scope: `MAX_TOTAL_SERVICE_MONTHS = 33`, `APPLICATION_WINDOW_MONTHS = 1`.
> Note: the backend uses tenure-derived months (authoritative); the frontend uses
> `basic.no_of_months_worked`. If these ever diverge, the backend value wins and a submit may be
> rejected even though the UI allowed it.

---

## 7. Known Issues

### 7.1 ✅ Resolved — Extension Details blank when viewing a submitted form

**Symptom:** Logged in as project staff, opening an already-**submitted** extension showed the
*Extension Details* and *PI Evaluation* sections empty.

**Cause — field mismatch in the list endpoint (not visibility logic or role flags):**
the form loads a submitted doc from the `getList` row (see §3.1), but the list query only selected
`ex_period` + header fields. Every other field the form reads — `ex_last_ex_date`,
`ex_no_of_mon_worked`, `ex_no_of_days_worked`, `ex_period_pi`, `ex_period_staff`, `increment_by_pi`,
`increment_by_staff`, `ex_doj`, `ex_date_of_expiry`, `ex_current_basic` — came back `undefined`,
so those sections rendered blank.

**Fix (backend `project_staff_extension.py`, in `get_project_staff_extension_list`):** added the 10
missing fields to the list projection so each row carries everything the form reads. Verified as the
applicant (project staff role): the submitted doc's row now returns `ex_period_pi='4'`,
`increment_by_pi='5000'`, `ex_no_of_mon_worked='4'`, `ex_last_ex_date`, etc.

> If the site runs under gunicorn/workers, run `bench restart` so the Python change is picked up
> everywhere. Clear the site cache after deploying.

### 7.2 ✅ Resolved — Applicant Submit blocked by `ex_period_staff` validation

**Symptom:** Save-as-Draft worked, but the applicant's **Submit** failed with:

```
Submission failed: Period Of Re-Engagement/Extension Allowed by Staff (ex_period_staff)
is required to calculate Term Completion Date.
```

**Cause:** the Term Completion Date calculation (`auto_create_tenure_record`) requires
`ex_period_staff` — a field only filled at the R&D Staff stage — but it was being run at the
applicant's Submit step.

**Fix (backend `project_staff_extension.py`):** `auto_create_tenure_record()` is now called **only**
on the final `next_state == "Approved"` transition in `perform_project_staff_extension_action`,
once the staff-entered `ex_period_staff` / `increment_by_staff` values exist. The applicant Submit no
longer triggers it.

---

## 8. Security Note — `getList` returns all extension docs

`get_project_staff_extension_list` runs with `ignore_permissions=True` and returns **every**
extension document to **any** logged-in user. This is what makes the submitted-doc load in §3.1
work (the DocType grants read only to `System Manager`), but it is also broad data exposure — every
applicant can read every other applicant's extension record, including salary/increment fields.

Not part of the bugs above, but worth revisiting: if these records should be restricted per user,
the list endpoint needs per-user filtering (e.g. by `ex_emp_id` / `owner`) or a proper permission
query condition, and the form's load path would need to respect that.

---

## 9. Related Files

| File | Role |
|------|------|
| [src/pages/application/ProjectStaffExtensionForm.tsx](../src/pages/application/ProjectStaffExtensionForm.tsx) | Main page component |
| [src/services/apiService.ts](../src/services/apiService.ts) | `extensionAPI` endpoints |
| [src/main.tsx](../src/main.tsx) | Route registration |
| [src/pages/dashboards/ProjectStaffDashboard.tsx](../src/pages/dashboards/ProjectStaffDashboard.tsx) | Entry card + pending-task list |
| [src/components/CommitPayment.tsx](../src/components/CommitPayment.tsx) | Staff-stage commitment |
| [src/components/ActivityLog.tsx](../src/components/ActivityLog.tsx) | Comment/audit trail |
| [src/hooks/useProjectBudget.ts](../src/hooks/useProjectBudget.ts) | Budget heads + balance for commitment |
| `rndopsapp/.../doctype/project_staff_extension/project_staff_extension.py` | Backend controller + all `extensionAPI` methods |

The module closely mirrors the **Project Staff Resignation** module
([ProjectStaffResignationForm.tsx](../src/pages/application/ProjectStaffResignationForm.tsx)),
which is a useful reference for shared patterns.
