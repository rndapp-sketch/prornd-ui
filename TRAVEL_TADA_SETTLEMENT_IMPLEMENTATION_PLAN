# Travel & TA/DA Settlement Frontend Documentation

## Purpose

This document maps the frontend structure for the `Travel` and `TA DA Settlement` modules in `prornd-ui`. It covers:

- related routes and pages
- entry points from other screens
- shared components and hooks
- API bindings and supporting endpoints used by the frontend
- the working flow from Travel application to TA/DA Settlement

This is frontend-focused documentation. The forms themselves are metadata-driven, so much of the field structure is loaded from backend doctype APIs at runtime.

## High-Level Flow

1. A user creates a Travel application.
2. The Travel form loads its fields and link options from the backend.
3. After submission and workflow approval, the Travel details page can expose a `Settle Travel` action.
4. TA/DA Settlement opens with `travel_ref` and pre-fills data from the related Travel document.
5. TA/DA Settlement calculates claimed totals, advance taken, and net claimed on the frontend.
6. Workflow actions, commitment, and payment-related UI are available in detail/task views depending on state and role.

## Routes

These routes are registered in `src/main.tsx`.

| Route | Purpose | Component |
| --- | --- | --- |
| `/travel` | New Travel form, or edit mode via query params | `src/pages/application/TravelForm.tsx` |
| `/travel/:docName` | Travel detail/read-only view with workflow, ledger, comments, commit/payment | `src/pages/application/TravelDetails.tsx` |
| `/ta-da-settlement` | New TA/DA Settlement, prefilled from project/travel, or edit mode via query params | `src/pages/application/TADASettlementForm.tsx` |

### Query Param Patterns

#### Travel

- `/travel?project=<projectId>`: open a new Travel form for a project
- `/travel?edit=<docName>`: edit an existing draft Travel document
- `/travel/:docName`: open the read-only/details page

#### TA/DA Settlement

- `/ta-da-settlement?project=<projectId>`: open a new settlement for a project
- `/ta-da-settlement?project=<projectId>&travel_ref=<travelDocName>`: open a new settlement prefilled from a Travel application
- `/ta-da-settlement?edit=<docName>`: open an existing settlement in edit/detail mode on the same page component

## Main Frontend Files

### Primary Pages

| File | Responsibility |
| --- | --- |
| `src/pages/application/TravelForm.tsx` | Create/edit Travel form, field loading, SCL handling, validation, save, submit, project fund sidebar |
| `src/pages/application/TravelDetails.tsx` | Read-only Travel details page, workflow actions, comments, ledger, commitment/payment, settlement launch |
| `src/pages/application/TADASettlementForm.tsx` | Create/edit TA/DA Settlement form, travel-prefill logic, table totals, advance/net claim calculation, save, submit |

### Workflow and Action Components

| File | Responsibility |
| --- | --- |
| `src/components/TravelActionButtons.tsx` | Fetches and performs Travel workflow actions |
| `src/components/TADASettlementActionButtons.tsx` | Fetches and performs TA/DA Settlement workflow actions |
| `src/components/CommitPayment.tsx` | Shared commitment widget with Kafka staging check and commit submission |
| `src/components/BudgetActionsSidebar.tsx` | Shared sidebar that wraps `CommitPayment`, payment modal access, and project budget actions |

### Shared Form Infrastructure

| File | Responsibility |
| --- | --- |
| `src/components/forms/DynamicFormRenderer.tsx` | Generic metadata-driven renderer for fields, links, uploads, child tables, and read-only rendering |
| `src/components/common/PageHeader.tsx` | Shared page header with status, project info, and action slot |

### Budget / Ledger / Utility Support

| File | Responsibility |
| --- | --- |
| `src/hooks/useProjectBudget.ts` | Loads ledger/budget data per project from the ledger API |
| `src/services/apiService.ts` | Central place for `travelAPI` and `tadaAPI` endpoint bindings |

## Other Pages That Surface These Modules

These are not the primary forms, but they are part of the working frontend structure.

| File | How it relates |
| --- | --- |
| `src/pages/ProjectDetailsOverview.tsx` | Shows Travel and TA/DA Settlement under project applications, combines both in the Travel tab, and provides the `Settle` entry flow |
| `src/pages/PendingTask.tsx` | Navigates Travel tasks to `/travel/:docName` |
| `src/pages/TaskRegistry.tsx` | Navigates Travel tasks to `/travel/:docName` |
| `src/pages/PendingTaskDetails.tsx` | Renders Travel and TA/DA Settlement metadata in read-only mode, shows workflow buttons, and exposes budget actions for TA/DA Settlement |
| `src/pages/TaskRegistryDetails.tsx` | Renders Travel and TA/DA Settlement documents in read-only task-registry context |

## API Bindings and Supporting Endpoints

Defined in `src/services/apiService.ts`.

### Travel API

- `travelAPI.getFields`
- `travelAPI.save`
- `travelAPI.submit`
- `travelAPI.getWorkflowActions`
- `travelAPI.performAction`
- `travelAPI.getSclBalance`

Backend path prefix:

`rndopsapp.rndopsapp.doctype.travel.travel.*`

### TA/DA Settlement API

- `tadaAPI.getFields`
- `tadaAPI.save`
- `tadaAPI.submit`
- `tadaAPI.getWorkflowActions`
- `tadaAPI.performAction`
- `tadaAPI.getCommitDetails`

Backend path prefix:

`rndopsapp.rndopsapp.doctype.ta_da_settlement.ta_da_settlement.*`

### Additional APIs Used Indirectly

- `frappe.client.get`
- `frappe.client.get_list`
- `rndopsapp.rndopsapp.api.get_user_details`
- `rndopsapp.rndopsapp.commitPayment.get_project_available_amounts`
- `rndopsapp.rndopsapp.commitPayment.submit_commit_data`
- `rndopsapp.rndopsapp.commitPayment.submit_payment_data`
- `/ledger-api/commit-payment-transactions`
- `/api/resource/special_leave_balance/<employee-year>`

Note: `travelAPI.getSclBalance` exists in the service layer, but the current `TravelForm.tsx` implementation fetches SCL balance directly from the `special_leave_balance` resource endpoint.

## Travel Module Structure

### `TravelForm.tsx`

Main responsibilities:

- fetches field metadata using `travelAPI.getFields`
- loads project-prefill and draft data
- fetches Budget Head options and injects them into link options
- auto-fills applicant/traveler information using user email lookup
- validates travel dates, declaration, station leave, mode of travel, and SCL rules
- calculates `total_estimate`
- renders the form through `DynamicFormRenderer`
- shows project fund summary in a sidebar

### Travel-specific frontend behaviors

- `travel_project_number` and `travel_project_title` are prefilled from `project` query param
- `account_head` is forced to render as a link/select field
- old checkbox-style account-head fields are hidden in UI
- Special Casual Leave balance is fetched and displayed dynamically for permanent staff
- submit flow saves first, then submits, to avoid duplicate document creation

### `TravelDetails.tsx`

This page is the operational detail screen for submitted/in-progress Travel documents.

It provides:

- read-only rendering of the Travel form
- workflow action buttons
- project budget and ledger access
- commitment and payment controls
- comment/activity stream sidebar
- linked TA/DA Settlement status display
- `Settle Travel` button once business conditions are satisfied

### Travel settlement gating logic

The `Settle Travel` action is shown when:

- Travel is in `Approved` workflow state
- if financial assistance is required, a payment record must already exist
- if financial assistance is not required, approval alone is enough

## TA/DA Settlement Module Structure

### `TADASettlementForm.tsx`

This is both the creation page and the edit/detail page for TA/DA Settlement.

Main responsibilities:

- fetches field metadata using `tadaAPI.getFields`
- loads existing settlement when `edit` is present
- pre-fills from project when `project` is present
- pre-fills from Travel when `travel_ref` is present
- resolves department IDs to human-readable department names
- injects Budget Head options for `ta_da_account_head`
- computes `ta_da_net_claimed = ta_da_total_claimed - ta_da_advance_taken`
- calculates child-table totals from `ta_da_other_expenses_p`
- saves drafts and submits the document

### Travel-to-settlement mapping handled in frontend

When `travel_ref` is passed, the page fetches the Travel document and maps:

- purpose of journey
- bank account holder and number
- project number/code
- account head
- applicant name
- designation
- department/section
- employee number

It also tries to derive `ta_da_advance_taken` from ledger commitment data for the Travel application. If ledger data is unavailable, it falls back to Travel `total_estimate`.

### Settlement workflow actions

When a settlement is opened in `edit` mode and has `docstatus === 1`, the page displays `TADASettlementActionButtons` in the header.

## Project Overview Integration

`src/pages/ProjectDetailsOverview.tsx` is an important entry point for both modules.

It does three things for this feature:

1. Opens a new Travel application with the project preselected.
2. Shows a combined Travel tab that merges:
   - Travel applications
   - TA/DA Settlement records
3. Provides a `Settle` action on Travel rows.

### Settlement launch behavior from project overview

When the user clicks `Settle` on a Travel row:

- the page first checks whether settlements already exist for that Travel document
- if existing settlements are found, it opens a modal so the user can open/edit one or create another
- if none exist, it navigates directly to:

`/ta-da-settlement?project=<projectNo>&travel_ref=<travelDocName>`

## Pending Task and Task Registry Integration

### Pending Task

- `src/pages/PendingTask.tsx` routes Travel records to `/travel/:docName`
- `src/pages/PendingTaskDetails.tsx` supports both `Travel` and `TA DA Settlement`
- it renders both doctypes in read-only mode through metadata
- it attaches workflow buttons
- for TA/DA Settlement it also mounts `BudgetActionsSidebar` with:
  - project code
  - parent travel application
  - bill amount from `ta_da_total_claimed` or `ta_da_net_claimed`

### Task Registry

- `src/pages/TaskRegistry.tsx` routes Travel records to `/travel/:docName`
- `src/pages/TaskRegistryDetails.tsx` can render Travel and TA/DA Settlement documents read-only using metadata fetched from their APIs

## Commit / Payment / Ledger Structure

There are two different budget-action patterns around this feature.

### Travel details page

`TravelDetails.tsx` directly uses:

- `useProjectBudget`
- `CommitPayment`
- payment submission
- project ledger modal

This page also uses commit state to block workflow forwarding for staff when commitment is required but not yet staged.

### TA/DA Settlement in task/detail contexts

For TA/DA Settlement, commit/payment support is surfaced mainly through:

- `BudgetActionsSidebar.tsx`
- `CommitPayment.tsx`

Important TA/DA-specific inputs passed into the sidebar:

- `parentAppId = ta_da_travel_application`
- `billAmount = ta_da_total_claimed` or `ta_da_net_claimed`

That allows the settlement commitment to stay linked to the original Travel application.

## UI Architecture Notes

- both forms are metadata-driven through `DynamicFormRenderer`
- field definitions are not hardcoded end-to-end in the React page
- pages still add business logic on top of metadata:
  - prefill rules
  - custom validation
  - conditional actions
  - ledger/payment integration
  - role-based gating

## Practical Summary

If you need to work on this feature in frontend, start from these files first:

1. `src/pages/application/TravelForm.tsx`
2. `src/pages/application/TravelDetails.tsx`
3. `src/pages/application/TADASettlementForm.tsx`
4. `src/components/TravelActionButtons.tsx`
5. `src/components/TADASettlementActionButtons.tsx`
6. `src/components/CommitPayment.tsx`
7. `src/components/BudgetActionsSidebar.tsx`
8. `src/pages/ProjectDetailsOverview.tsx`
9. `src/services/apiService.ts`

## Current Frontend Pattern to Remember

- Travel has separate create/edit and detail routes.
- TA/DA Settlement currently uses a single main page component for create, prefill, edit, and submitted action states.
- Project Overview is the main business entry point that connects Travel and TA/DA Settlement.
- Pending Task and Task Registry provide operational read-only/workflow views for both doctypes.
