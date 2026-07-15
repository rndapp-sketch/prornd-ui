# Miscellaneous Commit — Frontend Implementation Log

**Branch:** `mythos_fable_v0.5`
**Date:** 2026-07-15

---

## What This Document Covers

This document records every frontend file that was created or modified to wire up the Miscellaneous Commit ("Commit / De-Commit") feature. The backend (DocType, workflow, controller, Kafka) is documented separately in `miscellaneous-commit-implementation.md`.

---

## New Files

### `src/pages/application/MiscellaneousCommit.tsx`
List page. Fetches all `Miscellaneous Commit` docs owned by the current user via `/api/resource/Miscellaneous Commit`, renders a table (Application ID, Date, Project, Type, Amount, Status, View). "Apply New" navigates to `/miscellaneous-commit-form`. Row/View click navigates to `/miscellaneous-commit/:name`.

**Route:** `/miscellaneous-commit`

---

### `src/pages/application/MiscellaneousCommitForm.tsx`
Create / edit form. Key behaviours:
- Opened from the sidebar (`/miscellaneous-commit-form`) → Project Number is an **async type-ahead** that searches `Project Registration` by `project_no` / `project_title`. Selecting a project fetches its `pi_webmail`, then that user's `department_name` / `designation_name`, and auto-fills Webmail / Department / Designation (always read-only — derived, not hand-typed).
- Opened from a project's own page (`?project=<name>`) → Project Number is pre-filled and read-only.
- Opened for editing (`?edit=<docname>`) → loads the existing doc via `frappe.client.get`.
- `Save Draft` / `Submit` buttons in the page header.
- Fields split into two `GroupCard` sections: **A** (Applicant Details & Project) and **B** (Commit Details).

**API:** `miscellaneousCommitAPI.getFields`, `.save`, `.submit`
**Routes:** `/miscellaneous-commit-form`, `/miscellaneous-commit-form?project=<name>`, `/miscellaneous-commit-form?edit=<docname>`

---

### `src/pages/application/MiscellaneousCommitDetails.tsx`
Read-only details page. Features:
- Inline `WorkflowTimeline` component (not the shared one) that renders either the staff path (`Draft → Pending HoS Approval → Pending Dean Approval → Approved`) or the employee path (`Draft → Pending Staff Approval → Pending HoS Approval → Pending Dean Approval → Approved`) based on current state.
- Sidebar status panel (state badge, pending-at, owner, created, modified, amount).
- Edit + Submit Application buttons when doc is still in Draft.
- `MiscellaneousCommitActionButtons` when doc is post-Draft.
- `FloatingActivityLogButton` in the bottom-right corner.
- `DepartmentName` component used to resolve the department field.

**Route:** `/miscellaneous-commit/:id`

---

### `src/components/MiscellaneousCommitActionButtons.tsx`
Workflow action buttons (Forward / Approve / Reject). Fetches available actions from `miscellaneousCommitAPI.getWorkflowActions`, renders each as a styled button. Clicking opens a `CommentModal` for an optional comment before confirming. On confirm, calls `miscellaneousCommitAPI.performAction` then optionally posts the comment via `rndopsapp.rndopsapp.api.add_project_comment`, then triggers `onActionComplete` to refresh the parent.

---

## Modified Files

### `src/services/apiService.ts`
Added the `miscellaneousCommitAPI` export (required by all three new pages and the action buttons component):

```ts
export const miscellaneousCommitAPI = {
    getFields:          `${API_BASE}.miscellaneous_commit.miscellaneous_commit.get_miscellaneous_commit_fields`,
    save:               `${API_BASE}.miscellaneous_commit.miscellaneous_commit.save_miscellaneous_commit`,
    submit:             `${API_BASE}.miscellaneous_commit.miscellaneous_commit.submit_miscellaneous_commit`,
    getWorkflowActions: `${API_BASE}.miscellaneous_commit.miscellaneous_commit.get_miscellaneous_commit_workflow_actions`,
    performAction:      `${API_BASE}.miscellaneous_commit.miscellaneous_commit.perform_miscellaneous_commit_action`,
};
```

---

### `src/main.tsx`
Added imports for the three new page components and registered their routes (all under `allowedRole="All_ProRnd_User"`, same as Loan Request):

```
/miscellaneous-commit          → MiscellaneousCommit
/miscellaneous-commit-form     → MiscellaneousCommitForm
/miscellaneous-commit/:id      → MiscellaneousCommitDetails
```

---

### `src/components/RndSidebar.tsx`
Added "Commit / De-Commit" menu item directly below "Salary Module", using the already-imported `CreditCard` icon, gated to `staff, RnD` only:

```ts
{
    label: "Commit / De-Commit",
    icon: CreditCard,
    path: "/miscellaneous-commit",
},
```

Filter gate in the `.filter()` block:

```ts
if (item.label === "Commit / De-Commit") {
    return roles?.includes("staff, RnD") ?? false;
}
```

---

### `src/pages/ProjectDetailsOverview.tsx`
Four changes inside the `QuickActions` component:

1. **Role check** — added `useFrappeAuth` + `useUserRoles` call _inside_ `QuickActions` (the outer component's `roles` are out of scope here per Gotcha #5 in the implementation doc):

```ts
const { currentUser: quickActionsCurrentUser } = useFrappeAuth();
const { roles: quickActionsRoles } = useUserRoles(quickActionsCurrentUser ?? null);
const isStaffRnDForCommit = quickActionsRoles.includes("staff, RnD");
```

2. **Groups array** — "Commit / De-Commit" group spread in conditionally after "Loan":

```ts
...(isStaffRnDForCommit ? [{
    title: "Commit / De-Commit",
    icon: CreditCardIcon,
    items: ["Miscellaneous Commit"],
}] : []),
```

3. **Data fetch** — added `else if (selectedApplication === "Miscellaneous Commit")` branch in `fetchApplicationData`, using the raw `/api/v2/document/Miscellaneous%20Commit` fetch pattern (same as Loan Request). Filters by `item.project_number === projectName || item.project_number === projectNo`.

4. **Navigation** — two `case "Miscellaneous Commit"` entries:
   - New application: navigates to `/miscellaneous-commit-form?project=${projectName}`
   - Existing item click: navigates to `/miscellaneous-commit/${item.name}`

---

### `src/pages/PendingTask.tsx`
Two places where task row click and "View Full Details" modal button navigate by doctype — added `Miscellaneous Commit` and `Loan Request` branches (both were missing) before the generic fallback:

```ts
} else if (task.doctype === "Miscellaneous Commit") {
    navigate(`/miscellaneous-commit/${task.id}`);
} else if (task.doctype === "Loan Request") {
    navigate(`/loan-request/${task.id}`);
}
```

---

### `src/pages/TaskRegistry.tsx`
Three places (two table-row click handlers + the "View Full Details" modal button) — same additions as PendingTask.tsx:

```ts
} else if (task.doctype === "Miscellaneous Commit") {
    navigate(`/miscellaneous-commit/${task.id}`);
} else if (task.doctype === "Loan Request") {
    navigate(`/loan-request/${task.id}`);
}
```

---

### `src/pages/dashboards/DorndDashboard.tsx`
### `src/pages/dashboards/HosRndDashboard.tsx`
### `src/pages/dashboards/RndStaffDashboard.tsx`
Added two lines to each dashboard's `getTaskRoute` helper (before the generic fallback):

```ts
if (doctype === "Miscellaneous Commit") return `/miscellaneous-commit/${id}`;
if (doctype === "Loan Request") return `/loan-request/${id}`;
```

Only these three dashboards — the roles involved in this workflow are `staff, RnD` (RndStaffDashboard), `Hos, RnD` (HosRndDashboard), and `Dean, RnD` (DorndDashboard). `HeadDashboard`, `ProjectStaffDashboard`, `StudentDashboard`, and `AdoRndDashboard` were intentionally left unchanged.

---

### `src/utils/projectTypeMapping.ts`
Added entry so Pending Task / Task Registry project-category filters resolve correctly (without this, every Miscellaneous Commit fell back to "Others"):

```ts
'Miscellaneous Commit': {
    primary: { type: 'pr_name', field: 'project_number' },
},
```

Note: `project_number` on `Miscellaneous Commit` is a direct Link to the `Project Registration` doc name, unlike `Loan Request` which has separate `project_name` / `project_number` fields.

---

### `src/pages/PendingTaskDetails.tsx`
Two additions:

1. `getOriginalApplicationRoute()` switch — added `case "Miscellaneous Commit"` so Cancellation Request "view original application" links resolve correctly instead of falling back to the generic route.

2. Redirect `useEffect` — added branch so hitting `/pending-tasks/Miscellaneous%20Commit/:name` directly auto-redirects to `/miscellaneous-commit/:name`:

```ts
if (doctype === "Miscellaneous Commit" && name) {
    navigate(`/miscellaneous-commit/${name}`, { replace: true });
}
```

---

### `src/pages/TaskRegistryDetails.tsx`
Added `case "Miscellaneous Commit"` to `getOriginalApplicationRoute()` (same as PendingTaskDetails.tsx).

---

### `src/pages/Payments.tsx` *(pre-existing modification on this branch)*
- Added search input + "filter by module" dropdown to the **Pending Commits** tab (`commitSearchQuery`, `debouncedCommitSearch`, `selectedCommitModule` state + `searchedPendingCommits` memo).
- Fixed `fetchModuleRegistry`: switched from a raw `fetch('/api/v2/document/Module%20Registry/pending-task')` (which returned an unexpected shape and silently fell back to a hardcoded 8-entry map) to `frappe.client.get` RPC, returning the full 25-row list. This fixed module names beyond ID 8 (Disbursal of Honorarium, ICSS_PO, Miscellaneous Commit, etc.) showing as raw numbers in the Pending Commits table.

---

## Known Open Items

| # | File | Description |
|---|---|---|
| 4 | `ProjectDetailsOverview.tsx` | Zero-balance lock: `unlockedGroups`/`unlockedApplications` don't include "Commit / De-Commit" / "Miscellaneous Commit". De-Commit reduces existing commitments and arguably should stay unlocked at zero balance — left as a **product decision**. |
| 5 | Backend (DB) | Stale inactive workflow `miscellaneous_commits` (plural, `is_active: 0`) from 2026-07-09 still exists in the site DB. Safe to delete once confirmed unneeded. |
