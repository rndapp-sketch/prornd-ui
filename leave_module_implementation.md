# Leave Module — Implementation Guide

## Overview

The Leave Module lets project staff (and similar roles) apply for Casual Leave (CL), Earned Leave (EL), or On-Duty Leave. PIs (Permanent Employees) approve the applications through the standard Frappe workflow.

---

## File Map

| File | Purpose |
|---|---|
| `src/pages/LeaveModule.tsx` | List page — shows leave balance, absents, and all applications |
| `src/pages/LeaveModuleForm.tsx` | New application form — DynamicFormRenderer + save/submit flow |
| `src/pages/LeaveModuleDetails.tsx` | Detail view for a single leave application |
| `src/components/LeaveModuleActionButtons.tsx` | Workflow action buttons (Approve, Reject, etc.) with comment dialog |
| `src/services/apiService.ts` | `leaveModuleAPI` — all backend endpoint strings |
| `proxyOptions.ts` | `/attendance-api` proxy → PresenceBackend at `172.16.135.27:7078` |
| `src/main.tsx` | Routes: `/leave-module`, `/leave-module/new`, `/leave-module/:id` |
| `src/components/RndSidebar.tsx` | Sidebar item, PI-scoped pending count |
| `src/pages/PendingTask.tsx` | PI-scoped Leave Module filtering in the pending task list |

---

## Backend Endpoints (`leaveModuleAPI`)

| Key | Frappe method |
|---|---|
| `getFields` | `leave_module.leave_module.get_leave_module_fields` |
| `save` | `leave_module.leave_module.save_leave_module_data` |
| `submit` | `leave_module.leave_module.submit_leave_module` |
| `getWorkflowActions` | `leave_module.leave_module.get_leave_module_workflow_actions` |
| `performAction` | `leave_module.leave_module.perform_leave_module_action` |
| `getMyLeaves` | `leave_module.leave_module.get_my_leaves` |
| `getDetail` | `leave_module.leave_module.get_leave_detail` |
| `getLeaveBalance` | `leave_module.leave_module.get_leave_balance` |

All live under the `rndopsapp.rndopsapp.doctype` prefix defined by `API_BASE` in `apiService.ts`.

---

## External Dependency: Attendance API

Leave balance and absent count come from the PresenceBackend service (separate Node/FastAPI server).

**Proxy** (`proxyOptions.ts`):
```
/attendance-api  →  http://172.16.135.27:7078/api
```

**Endpoints used:**
- `GET /attendance-api/attendance/absents/{username}` — returns `{ success, data: { totalAbsents } }`
- Leave balance (`el`, `cl`) comes from Frappe via `getLeaveBalance`

**Absent deduction logic** (in `LeaveModule.tsx` and `LeaveModuleForm.tsx`):
1. Deduct absents from CL first
2. If absents exceed CL, remainder is deducted from EL
3. If both `actualCL ≤ 0` and `actualEL ≤ 0` → application is blocked

---

## Routes & Role Guards

| Path | Allowed Roles |
|---|---|
| `/leave-module` | `project staff`, `IF - Inspired Faculty`, `Independent Researcher` |
| `/leave-module/new` | same as above |
| `/leave-module/:id` | `All_ProRnd_User` (PIs need to view too) |

---

## Form Flow (`LeaveModuleForm.tsx`)

```
Mount
 └─ fetchFormData({ doc_name: null })
     └─ backend returns: fields[], prefill_data, link_options

User fills form → handleChange / handleTableRowChange / etc.
 └─ DynamicFormRenderer handles depends_on visibility
    e.g. cl_dates_table only shows when leave_type === "CL"
         from_date/to_date only show for EL / On Duty Leave

Save Draft
 └─ validateForm() → prepareFormDataForApi() → saveForm()
 └─ stores docname in savedDocName

Submit
 └─ validateForm() → saveForm() → submitForm(docname)
 └─ workflow: Draft → Pending PI Approval
 └─ navigate('/leave-module')
```

**Key validation rules:**
- CL: requires at least one date in `cl_dates_table`; blocks if `actualCL ≤ 0`
- EL: requires `from_date` + `to_date`; blocks if `actualEL ≤ 0`
- On Duty Leave: requires `from_date` + `to_date` + attached document
- All types: `reason_for_leave`, `address_on_leave`, 10-digit `contact_number`

---

## Workflow (Frappe side)

```
Draft
  └─ Submit → Pending PI Approval   (applicant submits)
       └─ Approve → Approved         (PI approves)
       └─ Reject  → Rejected         (PI rejects)
```

`LeaveModuleActionButtons` fetches available actions from `getWorkflowActions` and calls `performAction` with an optional comment.

---

## PI Scoping (Pending Task count & list)

PIs are `Permanent Employee` role users. The `pi` field on a Leave Module doc stores the PI's Frappe user ID.

**Problem:** The `get_pending_task` API returns all Leave Module docs in `Pending PI Approval` state. Without scoping, every PI sees every pending leave.

**Fix in `RndSidebar.tsx` and `PendingTask.tsx`:**
1. When role is `Permanent Employee`, fetch all Leave Module names where `pi == currentUser`
2. Build `allowedLeaveNames` Set from that list
3. When iterating pending tasks, skip any Leave Module record in `Pending PI Approval` state that is NOT in `allowedLeaveNames`

```ts
// Only the assigned PI sees this leave in pending tasks
if (isPermanentEmployee && group.doctype === "Leave Module"
    && record.status === "Pending PI Approval"
    && allowedLeaveNames && !allowedLeaveNames.has(record.name)) {
    return; // skip
}
```

---

## Sidebar Visibility

The "Leave Module" sidebar item is shown only to:
- `project staff`
- `IF - Inspired Faculty`
- `Independent Researcher`

PIs (Permanent Employee) do NOT get the sidebar item — they act on leave applications through **Pending Task** only.
