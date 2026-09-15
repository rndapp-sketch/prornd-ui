# Travel Module Notes

Last updated: 2026-06-08

## Purpose

This file is the working reference for the Travel module in `prornd-ui`.
It is meant to preserve:

- what is already implemented
- where the Travel flow lives in the codebase
- recent change history relevant to Travel
- known risks or inconsistencies
- future planning items for follow-up work

## Primary Files

Core Travel UI:

- `src/pages/application/TravelForm.tsx`
- `src/pages/application/TravelDetails.tsx`
- `src/components/TravelActionButtons.tsx`
- `src/components/TravelApplicantSummary.tsx`

Travel API wiring:

- `src/services/apiService.ts`

Travel project-resolution mapping:

- `src/utils/projectTypeMapping.ts`

Travel schema reference:

- `fields.md` under `## Doctype: Travel`

Travel integrations outside the core module:

- `src/pages/application/TADASettlementForm.tsx`
- `src/pages/PendingTaskDetails.tsx`
- `src/pages/TaskRegistryDetails.tsx`
- `src/pages/ProjectDetailsOverview.tsx`
- `src/main.tsx`

## Routes

- `/travel` -> create Travel application
- `/travel?edit=<docname>` -> edit draft Travel application
- `/travel?project=<project>` -> prefill Travel application from project context
- `/travel/:docName` -> view Travel details and workflow actions

## Current Backend Endpoints Used

From `travelAPI` in `src/services/apiService.ts`:

- `get_travel_fields`
- `save_travel`
- `submit_travel`
- `get_travel_workflow_actions`
- `perform_travel_action`
- `get_special_leave_balance_for_travel`

## Travel Data Model Snapshot

The frontend is driven by backend-provided dynamic fields. Important Travel fields currently referenced by the UI include:

- applicant details: `applicant_name_travel`, `webmail_id_travel`, `department_travel`, `designation_travel`
- visit details: `visit_type_travel`, `if_traveler`, `other_traveler`, `nature_of_travel`, `venue_address`, `purpose_of_visit`
- travel dates: `from_date`, `to_date`
- project mapping: `travel_project_title`, `travel_project_number`
- assistance and budget: `travel_financial_assistance`, `travel_mode_of_travel`, `account_head`
- leave details: `travel_special_casual_leave`, `travel_leave_from_date`, `travel_leave_to_date`, station leave fields
- declaration: `travel_declaration_text`, `travel_declaration_accepted`
- attachments and estimates: `est_travel_amt`, `est_reg_amt`, `est_accom_amt`, `est_other_amt`, `total_estimate`, attachment fields
- settlement/payment-related bank details: `bank_account_holder`, `bank_account_number`, `ifsc_code`

Legacy schema fields still exist in `fields.md` and are explicitly hidden by the current frontend:

- `travel_head`
- `contingency_head`
- `other_acc_head`
- `specify_other_acc_head`

## What Is Already Done

### 1. Travel form creation and editing

Implemented in `src/pages/application/TravelForm.tsx`.

Current behavior:

- fetches Travel field metadata dynamically from backend
- supports new form, project-prefilled form, and draft edit mode
- loads an existing Travel document when `edit` query param is present
- resolves `/travel?project=<project_no>` against `Project Registration`
- auto-fills `travel_project_title` with the linked Project Registration record
- auto-fills `travel_project_number` from the resolved project
- renders `travel_project_title` and `travel_project_number` as read-only
- injects Budget Head options into `account_head`
- loads searchable user options for Travel applicant/traveler fields
- auto-fills applicant details from selected `webmail_id_travel`
- supports search-select-fetch behavior for `traveler_webmail_id` and `other_traveler`
- auto-fills other traveler details and address block when `if_traveler = Other`
- inserts a dedicated `Traveller Details` section when `Other` traveler flow is active
- shows a top summary strip with Webmail, Full Name, Department, Designation, and Project No.
- computes `total_estimate` from estimate fields
- shows a budget-balance status card based on contribution vs estimate totals
- validates date ordering, leave requirements, station leave sessions, and declaration acceptance before submit
- supports draft save and final submit
- marks Travel form as read-only after submission through `docstatus`

### 2. Special Casual Leave balance check

Implemented in `src/pages/application/TravelForm.tsx`.

Current behavior:

- only checks balance when `travel_special_casual_leave` is `Required`
- fetches SCL balance using `webmail_id_travel`
- surfaces info/loading/success/warning field messages inline
- calculates requested leave days from selected leave range
- warns when requested days exceed available balance

### 3. Travel details page

Implemented in `src/pages/application/TravelDetails.tsx`.

Current behavior:

- loads Travel document details and backend field metadata
- renders the Travel application in read-only mode using `DynamicFormRenderer`
- shows a top applicant/project summary strip above the form
- shows workflow state, modification date, and linked TA/DA settlement status
- allows draft edit and draft submission from the details page
- resolves linked project document to actual `project_no` for display and ledger usage
- exposes `View Project` navigation
- provides activity stream, activity log, and comment submission

### 4. Workflow actions

Implemented in `src/components/TravelActionButtons.tsx` and consumed by `TravelDetails.tsx`.

Current behavior:

- fetches available workflow actions dynamically
- performs Travel workflow transitions through backend endpoint
- confirms actions before execution
- refreshes available actions after successful transition
- supports disabled states for blocked actions
- supports a commitment gate through `commitRequired`

### 5. Commitment, payment, and ledger integration

Implemented mainly in `src/pages/application/TravelDetails.tsx`.

Current behavior:

- reads project budget data through `useProjectBudget`
- shows project ledger modal
- shows commitment UI using the shared `CommitPayment` component
- pre-fills commitment amount from `total_estimate`
- preselects commitment budget head from Travel `account_head`
- enforces commitment-before-forward for RnD staff when advance is required
- detects linked commitment and linked payment from ledger entries
- allows payment recording after commitment
- shows linked commitment head and amount in the sidebar

### 6. TA/DA settlement integration

Implemented across `TravelDetails.tsx` and `TADASettlementForm.tsx`.

Current behavior:

- `Settle Travel` button appears after approval
- if financial assistance was required, settlement becomes available only after payment exists
- TA/DA form can be opened with `travel_ref`
- TA/DA form pulls applicant, project, bank, purpose, account head, and advance-related values from the Travel document

### 7. Task and project ecosystem integration

Travel is already wired into surrounding navigation and dashboards:

- task registry navigation
- pending task details rendering
- task registry details rendering
- project details overview consolidated Travel listing
- project-to-document resolution through `projectTypeMapping`
- applicant/project summary strip shown in Travel workflow/detail views

## Recent Change History Snapshot

Relevant Git history for the main Travel files:

| Date | Commit | Summary |
|------|--------|---------|
| 2026-05-10 | `d678320` | Update application workflow UI |
| 2026-05-09 | `3d67e1d` | Implement travel settlement and advance detail UI updates |
| 2026-05-07 | `a947b16` | Add View Project modal to detail pages and UX fixes |
| 2026-04-23 | `230072d` | Extract `CommitPayment` component and add workflow gate |
| 2026-04-09 | `c059979` | Update proxy IPs, MinIO path prefix, and normalize sanction data response |
| 2026-03-17 | `2e3cd9d` | Initial repo baseline after reset |

## Important Observations and Risks

### 1. Project identity is still slightly inconsistent

The code comments in `TravelDetails.tsx` treat `travel_project_number` like a link/docname to `Project Registration`, while `TravelForm.tsx` may prefill it directly from the `project` query param.

This creates a future risk:

- sometimes the field may behave like a Project Registration document name
- sometimes it may behave like a human-readable project number

This should be normalized so Travel, Project lookup, and TA/DA Settlement all rely on one canonical meaning.

### 2. Account head logic has frontend/backend drift

`fields.md` still shows older checkbox-based account-head fields, but the current frontend hides those and uses a single `account_head` dropdown instead.

This is probably the right UI direction, but it means future changes should confirm backend expectations before refactoring further.

### 3. Legacy commented code is still embedded in `TravelForm.tsx`

After the active `export default TravelForm;`, the file still contains a large block of commented-out older implementation.

Impact:

- increases file size and noise
- makes maintenance harder
- raises the chance of editing the wrong logic during future updates

### 4. Budget head loading is not fully standardized

`TravelForm.tsx` loads Budget Heads through `frappe.client.get_list`, while `TravelDetails.tsx` also uses a direct `fetch` call to `/api/v2/document/Budget%20Head`.

This works, but it should eventually be consolidated behind one data access pattern.

### 5. Payment refresh is still blunt

`TravelDetails.tsx` currently uses `window.location.reload()` after payment submission.

This is functional, but a targeted refresh would be cleaner and less disruptive.

## Suggested Future Plan

### High-priority cleanup

- normalize meaning of `travel_project_number` across create, view, settlement, and project navigation flows
- confirm whether `travel_project_title` should always store PR docname and whether `travel_project_number` should always store actual `project_no`
- remove the commented legacy implementation from `TravelForm.tsx`
- standardize Budget Head fetching and label resolution

### Functional hardening

- add regression tests for Travel validation rules
- add regression tests for SCL warning scenarios
- add tests for commitment gate behavior on Travel workflow actions
- add tests for project-prefill and traveler search-select-fetch behavior
- verify settlement gating for both advance-required and non-advance flows

### UX improvements

- replace `window.location.reload()` with local state refresh after payment
- improve user-facing error messages for failed applicant/traveler autofill lookups
- surface clearer messaging when project resolution fails

### Documentation and support

- keep this file updated whenever Travel flow logic changes
- record backend workflow-state assumptions here when new states are introduced
- add screenshots or sample flow notes later if onboarding/support needs increase

## Working Checklist

- [x] Dynamic Travel form exists
- [x] Draft save exists
- [x] Draft submit exists
- [x] Travel detail page exists
- [x] Workflow actions exist
- [x] Commitment gate exists
- [x] Payment recording exists
- [x] TA/DA settlement integration exists
- [x] Activity log and comments exist
- [x] Project-prefill via `/travel?project=<project_no>` resolves correctly
- [x] Project title and project number are read-only in the form
- [x] Other-traveler fields are searchable and auto-fill details
- [x] Top applicant/project summary exists in form and workflow/detail views
- [x] Commitment amount pre-fills from `total_estimate`
- [x] Commitment budget head preselects from Travel `account_head`
- [ ] Project identity normalization
- [ ] Remove legacy commented code from `TravelForm.tsx`
- [ ] Standardize Budget Head data loading
- [ ] Add Travel regression tests
- [ ] Add explicit Travel workflow documentation

## Notes For Future Updates

When changing the Travel flow later, update this file with:

- affected files
- backend endpoints changed
- workflow-state changes
- project/account-head mapping changes
- settlement or commitment behavior changes
- any new edge cases found during testing

## Requested Change Spec: Travel Form Prefill And Other-Traveler UX

Requested against:

- `/travel?project={project number}`

Request date:

- 2026-06-07

Implementation status:

- Implemented in frontend on 2026-06-08 in `src/pages/application/TravelForm.tsx`

### Current problem summary

Historical note: this section describes the state before the 2026-06-08 frontend fixes.

The current Travel form does not yet align with the expected project-prefill and other-traveler behavior.

Observed current behavior in `src/pages/application/TravelForm.tsx`:

- the `project` query parameter is currently copied directly into both `travel_project_number` and `travel_project_title`
- `travel_project_title` is therefore not being resolved to the actual Project Registration link/docname + display label
- `travel_project_number` is editable in practice because it is only prefilled, not explicitly locked down in the frontend behavior described here
- when `Applying for self or other?` is set to `Other`, the current code only reacts to `other_traveler` selection and fills `other_traveler_address`
- there is no current structured search-select-fetch flow in Travel matching the Project Registration additional-PI UX

### Requested changes

#### 1. Project Title should auto-fetch correctly and be non-editable

Field:

- `travel_project_title`

Expected behavior:

- when the page opens with `/travel?project={project number}`, the Travel form should resolve that project number to the correct `Project Registration` record
- `travel_project_title` should be auto-selected from that resolved Project Registration record
- the field should display the proper project title label, not just the raw project number
- the field should not be editable by the user on this Travel flow

Reference patterns already in the repo:

- `src/pages/application/LoanRequestForm.tsx`
  - resolves project context from URL and maps it into the correct link field instead of treating the project number as the title value
- `src/pages/application/RecruitmentAdhocContractualForm.tsx`
  - fetches `Project Registration` by `project_no` and then fills the corresponding project title/details

Implementation note for later:

- Travel should follow the same pattern: use the `project` query param as `project_no`, fetch the matching `Project Registration`, then set:
- `travel_project_title` = PR docname/link value
- `travel_project_number` = PR `project_no`
- link options should contain the resolved label so the UI renders the actual project title correctly

#### 2. Project Number should be non-editable

Field:

- `travel_project_number`

Expected behavior:

- once resolved from the URL/project lookup, `travel_project_number` should be shown as auto-filled and read-only
- user should not be able to manually alter it in the Travel form

Reason:

- this value is part of project identity and should stay consistent with the resolved `travel_project_title`

#### 3. `Other` traveler flow should use a search-select-fetch pattern

Trigger field:

- `if_traveler`

When user selects:

- `Other`

Expected visible fields:

- `traveler_webmail_id`
- `other_traveler`
- `other_traveler_address`

Requested UX behavior:

- match the same interaction style used in Project Registration for additional PI rows
- user should search and select the traveler from a searchable selector
- after selection, the dependent traveler details should auto-populate

Reference pattern in repo:

- `src/pages/ProjectRegistration.tsx`
  - section: `Does this project has additional PI?`
  - uses searchable selection via `AutocompleteEmail`
  - then fills read-only columns like name, email, designation, department
  - also shows `Register New User` support messaging when the person is not found

Requested Travel behavior based on that reference:

- for `traveler_webmail_id`, user should be able to search and select the traveler email/user
- after selection, Travel should fetch and fill:
- traveler webmail ID
- traveler name
- traveler designation
- traveler department
- the displayed address/details field should be populated from the selected user details

Important clarification from request:

- the desired pattern is “search then select then fetch the fields”
- this should feel similar to the Additional PI flow, not like a plain uncontrolled dropdown

### Proposed Travel field mapping for the `Other` flow

Requested visible information set:

- `traveler_webmail_id` -> selected traveler’s email/user id
- `other_traveler` -> selected traveler’s name
- designation -> fetched from user details
- department -> fetched from user details
- `other_traveler_address` -> display combined designation/full address style text, depending on available backend data

Because the current Travel schema only clearly exposes:

- `traveler_webmail_id`
- `other_traveler`
- `other_traveler_address`

this needs one implementation decision before coding:

- either reuse existing Travel fields and format designation/department into `other_traveler_address`
- or confirm whether backend already has separate Travel fields for designation/department that should also be rendered

### Suggested implementation scope

Likely frontend files to update:

- `src/pages/application/TravelForm.tsx`
- possibly `src/pages/application/TravelDetails.tsx` if read-only presentation should mirror the new values more clearly
- possibly shared form rendering behavior if field read-only state must be forced at runtime

Likely helper/reference logic to reuse:

- project lookup pattern from `LoanRequestForm.tsx`
- project lookup/fetch-by-`project_no` pattern from `RecruitmentAdhocContractualForm.tsx`
- searchable person-selection pattern from `ProjectRegistration.tsx`
- if backend field metadata supports it, `useFrappeFetchFrom` may help for linked fetches, but Travel likely still needs custom side-effect logic

### Acceptance criteria for later implementation

Project prefill:

- opening `/travel?project=<valid project_no>` resolves the correct Project Registration record
- Project Title displays the real title label
- Project Title is non-editable
- Project Number displays the correct project number
- Project Number is non-editable

Other traveler flow:

- selecting `Other` reveals the intended traveler fields
- traveler selection is searchable
- choosing a traveler auto-fills the linked values
- name/details are not left for manual re-entry when the user exists in the system
- behavior is consistent with the additional-PI style interaction

### Implemented behavior

- Travel now resolves `project` URL param as `project_no` and fetches the matching `Project Registration`
- `travel_project_title` is auto-filled with the linked Project Registration document and rendered read-only
- `travel_project_number` is auto-filled from the resolved project and rendered read-only
- project title and project number are moved up beside the traveler selection area in the form flow
- when `if_traveler = Other`, the form now shows a helper note and `Register New User` action
- `traveler_webmail_id` and `other_traveler` now use searchable autocomplete behavior
- selecting either traveler field auto-fills the paired traveler field and `other_traveler_address`
- `other_traveler_address` is rendered read-only in the `Other` flow so fetched data stays consistent
- a dedicated `Traveller Details` section separates the `Other` traveler inputs visually
- top applicant/project summary strips are shown in the Travel form and in Travel workflow/detail views
- `CommitPayment` now pre-fills amount from `total_estimate`
- `CommitPayment` now preselects the budget head from Travel `account_head`

### Open points to confirm before coding

- whether `traveler_webmail_id` should be the primary selected field and `other_traveler` should become derived/read-only
- whether `other_traveler` should remain editable at all after search-based selection is introduced
- whether designation and department need separate visible fields in Travel, or should remain combined inside `other_traveler_address`
- whether the `Register New User` helper action is also wanted on the Travel screen when a traveler is not found
