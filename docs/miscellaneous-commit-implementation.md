# Miscellaneous Commit ("Commit / De-Commit") — Implementation Details

**Branch:** `mythos_fable_v0.5`
**Date:** 2026-07-14

---

## Overview

Miscellaneous Commit lets `staff, RnD` and `Permanent Employee` raise a budget commitment (or reversal — "De-Commit") against a project's account head, independent of any other application form. It has its own draft/submit/approval workflow, and on final (Dean) approval it automatically stages and publishes a Kafka event into the same ledger pipeline every other application (Reimbursement, Travel, Disbursal of Honorarium, Loan Request, …) uses — so the project's Commitable/Actual Balance reflects it without any manual "Make a Commitment" step.

The DocType (`Miscellaneous Commit`) already existed (fields + `is_submittable`) before this work started; this implementation added the workflow, permissions, controller methods, Kafka integration, and the full React frontend.

---

## Feature Scope

| Area | Description |
|---|---|
| **DocType** | `Miscellaneous Commit` — project, budget head, Commit/De-Commit select, amount, particular, module, conditional linked-application number |
| **Workflow** | Role-branched routing: `staff, RnD` submits straight to HoS; `Permanent Employee` submits to Staff first (see Workflow States) |
| **Sidebar** | "Commit / De-Commit" entry below Salary Module, **`staff, RnD` only** |
| **Project Overview** | "Commit / De-Commit" group next to Loan in the per-project application list, **`staff, RnD` only** (hidden from Permanent Employee for now) |
| **Form** | Project number type-ahead search + auto-fill of the selected project's PI (Web-Mail/Department/Designation) when opened fresh (not project-scoped); all fields mandatory except conditional Linked Application |
| **Module field** | `Select` field whose options are populated live from the `Module Registry` (`pending-task`) child table, not a static list |
| **Pending Task / Task Registry / Dashboards** | Routed to the dedicated Details page instead of the generic raw-field fallback view |
| **Kafka** | Staged into `Kafka Commit Staging` on Submit; auto-published to Kafka the instant Dean approves, via the existing app-wide `on_update` hook — no per-doctype publish code needed |
| **Sign convention** | Commit → positive `commit_amount`; De-Commit → negative `commit_amount` |
| **Payments page** | Search + "filter by module" added to the Pending Commits tab; fixed a bug where module names beyond ID 8 (Disbursal of Honorarium, ICSS_PO, …) showed as raw numbers |

---

## Backend

### DocType: `Miscellaneous Commit`

File: `rndopsapp/rndopsapp/doctype/miscellaneous_commit/miscellaneous_commit.json`

| Field | Type | Notes |
|---|---|---|
| `project_number` | Link → Project Registration | Mandatory |
| `applicant_webmail` | Data | Mandatory; auto-filled from current user or selected project's PI |
| `applicant_department` | Data | Mandatory; auto-filled, read-only in the form |
| `applicant_designation` | Data | Mandatory; auto-filled, read-only in the form |
| `budget_head` | Link → Budget Head | Mandatory |
| `commit_decommit` | Select (`Commit` / `De-Commit`) | Mandatory |
| `module` | Select | Mandatory; options injected live from Module Registry (see below) |
| `commit_amount` | Currency | Mandatory |
| `commit_particular` | Data | Mandatory; flows through to the published Kafka event's `commitParticular` |
| `linked_application` | Data | **Only** mandatory when `module == "Recruitment Adhoc Contractual"` (`mandatory_depends_on`) |
| `workflow_state` | Data, read-only | Standard Frappe workflow field |
| `amended_from` | Link → Miscellaneous Commit | Standard amendment field |

**Permissions:** `System Manager`, `All_ProRnd_User`, `Permanent Employee`, `staff, RnD` have full create/write/submit; `Hos, RnD (Head of Section, RnD)` and `Dean, RnD` have read/write (no create) for their approval stages.

**Naming:** `format:{YYYY}{MM}{DD}MiSCoM{######}`

---

### Workflow: `Miscellaneous_Commit_Workflow`

Not exported as a fixture file — lives only in the site DB (`Workflow`/`Workflow Document State`/`Workflow Transition` doctypes), same as every other workflow in this app.

**States:**

| State | `doc_status` | `allow_edit` |
|---|---|---|
| Draft | 0 | `All_ProRnd_User` |
| Pending Staff Approval | 0 | `staff, RnD` |
| Pending HoS Approval | 0 | `Hos, RnD (Head of Section, RnD)` |
| Pending Dean Approval | 0 | `Dean, RnD` |
| Approved | 1 | `Administrator` |
| Rejected | 1 | `Administrator` |

**Transitions:**

| From | Action | To | Allowed |
|---|---|---|---|
| Draft | Submit | Pending Staff Approval | `Permanent Employee` |
| Draft | Submit | **Pending HoS Approval** | `staff, RnD` |
| Pending Staff Approval | Forward | Pending HoS Approval | `staff, RnD` |
| Pending Staff Approval | Reject | Rejected | `staff, RnD` |
| Pending HoS Approval | Forward | Pending Dean Approval | `Hos, RnD (Head of Section, RnD)` |
| Pending HoS Approval | Reject | Rejected | `Hos, RnD (Head of Section, RnD)` |
| Pending Dean Approval | Approve | Approved | `Dean, RnD` |
| Pending Dean Approval | Reject | Rejected | `Dean, RnD` |

The two **Draft → Submit** transitions are the key mechanism: Frappe allows multiple transitions sharing the same `(state, action)` pair, disambiguated purely by which role the current user has. `perform_miscellaneous_commit_action` picks the first transition whose `allowed` role matches — this is how `staff, RnD` skips straight to HoS while `Permanent Employee` goes through Staff first.

```
                    ┌─────────────────────────────┐
   staff, RnD ──────┤ Draft ──Submit──> Pending HoS Approval ──Forward──> Pending Dean Approval ──Approve──> Approved
                    │                                                                        └─Reject──> Rejected
Permanent Employee ─┤ Draft ──Submit──> Pending Staff Approval ──Forward──┘
                    │                        └─Reject──> Rejected
                    └─────────────────────────────┘
```

Pending-Task visibility falls out of this for free: `module_registry.get_pending_task` computes "actionable states" per role from the Workflow's `allow_edit`/`allowed` fields, so once staff submits (state = Pending HoS Approval), it's automatically in **HoS's** pending list; once an employee submits (state = Pending Staff Approval), it's automatically in **staff's** pending list. No frontend registration needed beyond the Module Registry entry below.

---

### Controller: `miscellaneous_commit.py`

`rndopsapp/rndopsapp/doctype/miscellaneous_commit/miscellaneous_commit.py`

| Method | Purpose |
|---|---|
| `get_miscellaneous_commit_fields(doc_name=None)` | Field metadata (with live `module` options + `mandatory_depends_on` passthrough), prefill data, and `link_options` for `project_number` (labeled by `project_no`, not `project_title`) and `budget_head` |
| `save_miscellaneous_commit(doc_data)` | Create/update the Draft |
| `submit_miscellaneous_commit(docname)` | Thin wrapper around `perform_miscellaneous_commit_action(docname, "Submit")` |
| `get_miscellaneous_commit_workflow_actions(docname)` | Actions available to the current user at the doc's current state |
| `perform_miscellaneous_commit_action(docname, action)` | Executes the transition; stages the Kafka commit on `Submit`; sets `doc.workflow_state` **before** `submit()`/`cancel()`/`save()` (see Gotchas) |

**Module dropdown mechanism:** `get_miscellaneous_commit_fields` queries the `Module Registry` doc named `pending-task`, reads its `doctype_name` child table, and overwrites the `module` field's `options` string with that live list (minus "Miscellaneous Commit" itself) every time the form loads. The DocType JSON also carries a static snapshot of the same list as a fallback for Frappe Desk's own UI.

---

### Kafka staging & publish

This reuses the **existing, doctype-agnostic** commit-staging pipeline rather than building a new producer:

1. **Staging** — on `Submit`, `perform_miscellaneous_commit_action` calls `rndopsapp.rndopsapp.commitPayment.submit_commit_data(...)`, inserting a `Kafka Commit Staging` row (`reference_doctype`, `reference_name`, `payload` JSON, `status: PENDING_APPROVAL`) with `trigger_state="Approved"`.
2. **Sign convention** — `commit_amount` sent to staging is `+abs(amount)` for Commit, `-abs(amount)` for De-Commit.
3. **Publishing** — `hooks.py` registers a global hook: `doc_events["*"]["on_update"] → rndopsapp.rndopsapp.commitPayment.check_workflow_and_publish`. This fires on **every** doctype's save/submit, checks for any `Kafka Commit Staging` row whose `trigger_state` matches the document's current `workflow_state`, and publishes it via `kafka.producer.reimbursement.publish_commit` — completely automatically, no per-doctype code required. When Dean's Approve action changes `workflow_state` to `"Approved"`, this fires and publishes.
4. **Particulars** — the shared mapper (`kafka/producer/reimbursement/mapper.py`) normally derives `commitParticular` from a child table (`table_bosk`/`expenditure_details`), which Miscellaneous Commit doesn't have. Added an optional `commit_particular_override` parameter (threaded through `mapper.py` → `producer.py` → `commitPayment.py`'s two publish call sites) so the value typed into the form's own "Particular" field is used verbatim instead of falling back to `f"Commitment for {doc.name}"`.
5. **Validator** — `AccountHeadCommitValidator` (`kafka/producer/reimbursement/validator.py`) originally rejected `commitAmount <= 0`. Loosened to reject only `== 0`, since De-Commit's negative value is legitimate. This is a shared validator used by every doctype on this path — the change only *relaxes* an overly strict check, so it doesn't affect other doctypes' valid (positive) amounts.

---

## Frontend

### New files

#### `src/pages/application/MiscellaneousCommitForm.tsx`
Create/edit form. Draft (`Save Draft`) / Submit buttons. Project Number renders as a live type-ahead (`asyncSearchFields`) when opened without a pre-filled project (the staff, RnD sidebar path); selecting a project fetches its `pi_webmail`, then that user's `department_name`/`designation_name`, and auto-fills Web-Mail/Department/Designation. When opened from a project's own page (`?project=`), Project Number stays pre-filled and read-only instead. Applicant fields are always read-only (derived, not hand-typed).

**API:** `miscellaneousCommitAPI.{getFields,save,submit}` — `apiService.ts`
**Routes:** `/miscellaneous-commit-form`, `/miscellaneous-commit-form?project=<name>`, `/miscellaneous-commit-form?edit=<docname>`

#### `src/pages/application/MiscellaneousCommitDetails.tsx`
Read-only view with a local `WorkflowTimeline` component (mirrors `LoanRequestDetails.tsx`'s pattern rather than the shared `WorkflowTimeline.tsx`) — renders either the staff-direct path (Draft → Pending HoS → Pending Dean → Approved) or the employee path (Draft → Pending Staff → Pending HoS → Pending Dean → Approved) depending on current state. Project Number and Budget Head resolve to human-readable labels via `linkOptions`; Department resolves via the shared `<DepartmentName>` component.

**Route:** `/miscellaneous-commit/:id`

#### `src/pages/application/MiscellaneousCommit.tsx`
List page (Application ID, Date, Project, Type, Amount, Status, View). "Apply New" → the form.

**Route:** `/miscellaneous-commit`

#### `src/components/MiscellaneousCommitActionButtons.tsx`
Workflow action buttons (Forward/Approve/Reject) with an optional-comment confirmation modal — same shape as `LoanRequestActionButtons.tsx`.

---

### Changed files

#### `src/services/apiService.ts`
Added `miscellaneousCommitAPI` (`getFields`/`save`/`submit`/`getWorkflowActions`/`performAction`), following the exact naming convention every other doctype API object uses.

#### `src/main.tsx`
Registered the 3 routes above, `allowedRole="All_ProRnd_User"` (matches Loan Request/Disbursal of Honorarium convention — access is really gated by role at the sidebar/project-page level, not the route).

#### `src/components/RndSidebar.tsx`
Added "Commit / De-Commit" menu item directly below "Salary Module", gated to `staff, RnD` only (same pattern as the Salary Module gate).

#### `src/pages/ProjectDetailsOverview.tsx`
- Added a "Commit / De-Commit" group next to "Loan" in the `QuickActions` component's `groups` array — conditionally spread in only when the current user has the `staff, RnD` role (a local `useUserRoles` call inside `QuickActions`, since that component doesn't otherwise have access to roles). **Not shown to Permanent Employee.**
- Added a data-fetch branch (`selectedApplication === "Miscellaneous Commit"`, matching Loan Request's raw-fetch pattern against `/api/v2/document/...`).
- Added `case "Miscellaneous Commit"` to both `onNavigate` switch statements (new-application and existing-item click).

#### `src/pages/PendingTask.tsx` / `src/pages/TaskRegistry.tsx`
Both had (and still have, for unhandled doctypes) a generic fallback route `/pending-tasks/:doctype/:name` / `/task-registry/:doctype/:name` that renders every field as a raw, unresolved `label: value` pair — no Link-field name resolution at all. Added `"Miscellaneous Commit"` (and, since it had the identical pre-existing gap, `"Loan Request"`) to every click-through handler in both files (2 in PendingTask.tsx, 3 in TaskRegistry.tsx) so they route to the dedicated `/miscellaneous-commit/:id` / `/loan-request/:id` pages instead.

#### `src/pages/dashboards/HosRndDashboard.tsx`, `RndStaffDashboard.tsx`, `DorndDashboard.tsx`
Same fix applied to each dashboard's own `getTaskRoute` helper — but **only** on the three dashboards whose role is actually part of this workflow (Hos, RnD / staff, RnD / Dean, RnD — `DorndDashboard.tsx` is the Dean, RnD dashboard despite the generic-looking filename). Explicitly reverted the same edit on `HeadDashboard.tsx`, `ProjectStaffDashboard.tsx`, `StudentDashboard.tsx`, and `AdoRndDashboard.tsx` since none of those roles are ever part of this workflow — those doctypes will never appear in their pending lists anyway, so the routing addition would have been dead code.

#### `src/pages/Payments.tsx`
- Added search input + "filter by module" dropdown to the **Pending Commits** tab (the only tab currently reachable — the "Payment History" tab's button is commented out, `{/* Payment History tab hidden temporarily */}`). New dedicated state (`commitSearchQuery`, `debouncedCommitSearch`, `selectedCommitModule`) and a `searchedPendingCommits` memo, styled identically to the existing (currently unreachable) history-tab toolbar.
- **Bug fix:** `fetchModuleRegistry` was calling `/api/v2/document/Module%20Registry/pending-task` directly with `fetch()`, which wasn't returning the shape the code expected (`data.data.doctype_name`) and was silently falling back to a hardcoded map covering only module IDs 1–8. This is why Reimbursement (5) and Travel (6) displayed correctly while Disbursal of Honorarium (10), ICSS_PO (14), and everything past 8 showed raw numbers. Switched to `frappe.client.get` (the same whitelisted RPC method used everywhere else in this codebase), verified via `bench execute` to return the full 25-row Module Registry list with correct `idx`/`doctype_name` pairs.

---

## Module Registry

Registered directly in the site DB (not a fixture): a row was appended to the `pending-task` Module Registry's `doctype_name` child table — `doctype_name: "Miscellaneous Commit"`, `mod_vis: 1`. This is what makes Miscellaneous Commit show up in Pending Task / Task Registry / dashboards at all, and is also the live source for the frontend's "Module" filter dropdown in Payments and the backend's dynamic `module` Select field options.

---

## Role Access Matrix

| Role | Access |
|---|---|
| `staff, RnD` | Sidebar entry + per-project group; submits straight to HoS; approves at Staff stage (employee path); sees it in Pending Task when an employee submits |
| `Permanent Employee` | Can submit (Draft → Pending Staff Approval) but currently has **no UI entry point** — the per-project group is hidden for this role for now |
| `Hos, RnD (Head of Section, RnD)` | Approves/rejects at HoS stage; sees it in Pending Task once staff submits or staff forwards |
| `Dean, RnD` | Final Approve/Reject; approval triggers the Kafka publish |

---

## Known Gaps / Follow-ups (found in a post-implementation audit, not yet fixed)

A full-codebase audit (grepping every place `"Loan Request"` — the closest sibling doctype used as the template throughout — is special-cased) turned up a few real gaps that were **not** part of the original scope and haven't been fixed yet:

1. **`src/utils/projectTypeMapping.ts` has no entry for `"Miscellaneous Commit"`.** This file maps each doctype to how it links back to a Project Registration (used by Pending Task / Task Registry's Research/Consultancy/Others category filter). Loan Request is registered here (`primary: { type: 'pr_name', field: 'project_name' }`); Miscellaneous Commit is not. Effect: `resolveProjectCategory()` falls back to `'Others'` for every Miscellaneous Commit record regardless of its actual linked project, since an unmapped doctype defaults to `'Others'`. The correct entry, given Miscellaneous Commit's `project_number` field is itself a Link directly to the Project Registration doc name (unlike Loan Request's separate `project_name`/`project_number` pair), would be:
   ```ts
   'Miscellaneous Commit': {
       primary: { type: 'pr_name', field: 'project_number' },
   },
   ```

2. **`src/pages/PendingTaskDetails.tsx` — two gaps:**
   - `getOriginalApplicationRoute()` (a switch statement used to build a "view original application" link when a Cancellation Request references another doctype) has a `case "Loan Request"` but no `case "Miscellaneous Commit"` — falls through to the generic `/pending-tasks/:doctype/:name` route instead of `/miscellaneous-commit/:id`.
   - A separate "redirect to dedicated detail page" `useEffect` (a safety net for whenever the generic `/pending-tasks/:doctype/:name` route gets hit directly for a doctype that has its own page) has branches for Disbursal of Honorarium/Consultancy, Travel, Loan Request, Indent General Form, Indent Cum Sanction Sheet, Selection Committee Report — no branch for Miscellaneous Commit.

3. **`src/pages/TaskRegistryDetails.tsx`** has the same `getOriginalApplicationRoute()` switch as above, with the same missing `"Miscellaneous Commit"` case.

4. **Design decision needed — zero-fund-balance lock in `ProjectDetailsOverview.tsx`.** When a project has no available fund balance, every application group is locked/redirected away **except** `unlockedGroups = ["Loan", "Recruitment"]` (and `unlockedApplications = ["Loan Request", "Adhoc/Contractual"]`). "Commit / De-Commit" is not in either list, so it's locked along with everything else in that state. This might be correct (committing new budget makes little sense with zero balance) — but **De-Commit specifically reduces an existing commitment, which arguably should stay available even at zero balance**, the same reasoning that keeps "Loan" unlocked. Not changed pending a product decision.

5. **Stray inactive duplicate workflow found in the DB.** A second Workflow document, `miscellaneous_commits` (plural, `is_active: 0`), already existed for this doctype — created 2026-07-09, before this implementation's `Miscellaneous_Commit_Workflow` (created 2026-07-11). It's missing all Reject transitions and uses a different `doc_status` convention (`Approved` = 2/cancelled, matching Loan Request's quirk, vs. this implementation's `Approved` = 1/submitted, matching Disbursal of Honorarium's convention). It's currently inactive so it has no effect, but it's a leftover that could cause confusion if anyone finds and activates it in Frappe Desk — worth deleting once confirmed unneeded.

**Confirmed non-issues from the same audit:** `RndSidebar.tsx`'s own pending-task badge counter has no doctype blacklist that would exclude Miscellaneous Commit; `HIDDEN_OTHERS_DOCTYPES` in `PendingTask.tsx`/`TaskRegistry.tsx` only excludes `Kafka Commit Staging`/`Project Number Generation` (unrelated internal doctypes); `BudgetActionsSidebar.tsx`/`CommitPayment.tsx` is a separate, pre-existing "Make a Commitment" widget that Loan Request itself doesn't use either, so there's no equivalent gap for Miscellaneous Commit there; there's no central doctype enum/union type anywhere that would need a new entry.

---

## Known Gotchas (read before touching this again)

1. **`frappe.db.set_value()` / `doc.db_set()` bypass `on_update` entirely.** The original transition code updated `workflow_state` via these raw-write calls *after* calling `doc.submit()`, meaning the Kafka publish hook (which reads `doc.get("workflow_state")` during `on_update`) never saw the new state and silently never fired. Fixed by setting `doc.workflow_state = next_state` on the in-memory doc **before** `submit()`/`cancel()`/`save()`.
2. **The shared commit validator rejects `commitAmount <= 0` by default.** Negative (De-Commit) amounts need the loosened validator (see Backend → Kafka staging & publish, point 5) or they'll fail validation at publish time, every time, regardless of Kafka connectivity.
3. **`NoBrokersAvailable` in staging logs is an environment fact, not a bug.** If no Kafka broker is reachable from the bench, staging still succeeds (`PENDING_APPROVAL`) but publishing fails and the row flips to `FAILED` with a clear `error_message` — this is expected behavior, not a regression.
4. **`Module Registry Item.idx` is the *only* module-ID space** — the Kafka mapper's `get_module_id()` looks up a doctype's `idx` in this exact table. If that Module Registry list is ever reordered or has rows deleted from the middle, **every already-published Kafka event's `moduleId` becomes stale** (points at whatever doctype now occupies that position) — there's no versioning or stable ID here. Always append new doctypes to the end of the list.
5. **`QuickActions` (inside `ProjectDetailsOverview.tsx`) doesn't share scope with the outer `ProjectDetailsOverview` component** — the outer component's `roles`/`isStaffRnDOnly` (defined ~2000 lines below the `groups` array) aren't in scope where `groups` is built. Fixed by calling `useUserRoles` independently inside `QuickActions` itself, rather than trying to pass roles down as a prop.

---

## Verified (via disposable `bench execute` scripts, cleaned up afterward)

- Staff, RnD submit → lands directly in `Pending HoS Approval`; shows in HoS's Pending Task.
- Permanent Employee submit → lands in `Pending Staff Approval`; shows in staff's Pending Task.
- Full chain (staff submit → HoS forward → Dean approve) reaches `Approved`.
- Kafka staging row created on Submit; publish attempt fires **exactly once**, **exactly** when `workflow_state` becomes `Approved`.
- De-Commit stages and publishes with a negative `commit_amount` (`-250.0` in the test run), status `PUBLISHED`.
- `commitParticular` override confirmed at the mapper level to replace the generic `"Commitment for {doc.name}"` fallback.
- `get_miscellaneous_commit_fields`'s dynamic `module` options confirmed to return all 24 other registered modules (Miscellaneous Commit excluded from its own list).
- `frappe.client.get("Module Registry", "pending-task")` confirmed to return the full 25-row list with correct `idx` values (10 → Disbursal of Honorarium, 14 → ICSS_PO, 25 → Miscellaneous Commit).

Full project TypeScript compiles clean throughout (`node_modules/.bin/tsc --noEmit`, run via the Node 20 binary at `/home/rndops/.nvm/versions/node/v20.20.0/bin/node` — the environment's default `node` in `PATH` is v12 and cannot run `tsc`).