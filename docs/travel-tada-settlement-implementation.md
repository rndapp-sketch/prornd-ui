# Travel & TA/DA Settlement — Full Implementation & Changelog

**Branch:** `mythos_fable_v0.5` (frontend) / `production-206` (backend, local `rndopsapp` bench at `/home/rndops/Desktop/frappe_dev/prornd`)

This is the merged, single source of truth for all work done on the **Travel** and **TA DA Settlement** modules across three prior documents (now folded into this one and removed): `ta-da-settlement-office-use-implementation.md`, `travel-tada-settlement-workflow-ux-updates.md`, and `travel-director-approval-implementation.md`. Organized chronologically by work phase. Miscellaneous Commit changes that happened alongside Phase 2 are included where they touched shared code, but its own dedicated log is [miscellaneous-commit-implementation.md](miscellaneous-commit-implementation.md).

**Nothing described here has been committed to git** — all changes are sitting in the working tree of both repos.

---

## Phase 1 — TA DA Settlement: "For Office Use" Section (2026-07-16)

### Overview

The `TA DA Settlement` DocType already had 9 "For Office Use" fields (`for_office_use_section` + 9 currency fields). This phase wired those fields into the React frontend and backend controller so that:

- The applicant never sees the section, at any stage.
- **`staff, RnD`** is the only role that can fill it in, and only while the settlement sits at their stage (**`Pending Staff Approval`**).
- **Total Admissible Amount** and **Net Amount** are always computed, never hand-typed.
- Approvers further down the chain (HoS, Dean, Ado_RnD, Director) see the section **read-only** once staff have filled it in.
- Staff **cannot Forward** the settlement out of `Pending Staff Approval` until the section has been saved with a non-zero Total Admissible Amount.

### Fields (`rndopsapp/rndopsapp/doctype/ta_da_settlement/ta_da_settlement.json`)

| Fieldname | Label | Role |
|---|---|---|
| `for_office_use_section` | For Office Use | Section Break |
| `railways_air_steamer_busfare` | Railways/Air/Steamer/Bus Fare (in INR) | input |
| `road_mileage` | Road Mileage (in INR) | input |
| `local_conveyance` | Local Conveyance (in INR) | input |
| `food_charges` | Food Charges (in INR) | input |
| `cccommodation_charges` | Accommodation Charges (in INR) | input *(pre-existing typo in fieldname — left as-is, matches the DocType)* |
| `registration_fee_other` | Registration Fee & Other (in INR) | input |
| `total_admissible_amount` | Total Admissible Amount (in INR) | **computed** = sum of the 6 inputs above |
| `less_advance_paid_to_applicant` | Less: Advance paid to applicant (in INR) | input |
| `net_amount` | Net Amount (in INR) | **computed** = Total Admissible Amount − Advance Paid |

Workflow (`TA_DA_settlement_workflow`, DB-only, not an exported fixture):

```
Draft ──Submit──> Pending PI Approval ──Forward──> Pending Staff Approval ──Forward──> Pending HoS Approval
  (Permanent Employee /                (project staff /             (staff, RnD)              │
   Independent Researcher /             Student submit here)                                    ├──Forward──> Pending Associate Dean ──Approve──> Approved
   Inspire Faculty submit                                                                        └──Forward──> Pending Dean Approval    ──Approve──> Approved
   straight to Pending Staff Approval)
```

`staff, RnD` owns exactly one stage: `Pending Staff Approval` — the only point where "For Office Use" is editable.

**Note (relevant everywhere in this document):** `docstatus` stays `0` through the *entire* chain up to `Approved` in this workflow's state config (only `Rejected` is `doc_status = 1`), so gating UI on `docstatus` doesn't work here — everything keys off `workflow_state` instead. The same is true for `Travel_Workflow` (only the terminal `Approved`/`Rejected` states flip it).

### Backend changes (`ta_da_settlement.py`)

1. **`can_edit_office_use_fields()`** — `True` if the current user has `staff, RnD`, `System Manager`, or `Administrator`. The DocType itself has no permlevel restriction on these fields, so this is enforced entirely in the controller.
2. **`save_ta_da_settlement`** — the 7 raw input fields are only added to the save's `field_mapping` when `can_edit_office_use_fields()` is true; otherwise a non-staff caller's payload for those fields is silently ignored. `total_admissible_amount`/`net_amount` are **never** taken from the client — recomputed server-side from the other 7 immediately after mapping, so they can't drift from the line items.
3. **`perform_ta_da_settlement_action`** — before executing `Forward` out of `Pending Staff Approval`, throws if `doc.total_admissible_amount` is falsy ("Please fill and save the 'For Office Use' section... before forwarding"). This is the authoritative gate; the frontend check is just for immediate UX feedback.

### Frontend changes

**`TADASettlementForm.tsx`** (the editable form, `/ta-da-settlement?edit=<name>`):
- `isStaffRnD`, `isOfficeUseViewer`, `isPendingStaffApproval`, `canEditOfficeUse` role/state derivations.
- `processedFields` (`useMemo`): hides the office-use section entirely for non-viewers; for viewers, `total_admissible_amount`/`net_amount` forced read-only always, the rest read-only gated on `canEditOfficeUse`.
- Two `useEffect`s recompute the two totals live as staff types (client preview only — backend is authoritative).
- Global `readOnly` changed from `docstatus === 1` to `docstatus === 1 && !canEditOfficeUse`.
- Single **"Save Office Use Details"** button replaces Save Draft/Submit when `canEditOfficeUse`.
- `TADASettlementActionButtons` receives `officeUseRequired={isStaffRnD && isPendingStaffApproval && !formData.total_admissible_amount}`.

**`TADASettlementActionButtons.tsx`**:
- New `officeUseRequired?: boolean` prop. Forward is blocked client-side (alert, no confirm dialog) when true; button renders disabled/greyed with a tooltip + inline amber note.

**`PendingTaskDetails.tsx`** — turned out to be the page that matters day-to-day (staff, RnD and other approvers act on TA DA Settlement from here). Previously **100% read-only** here — no way to fill office-use figures from this screen at all.
- Same role helpers, scoped locally (`canEditTadaOfficeUse` etc., since this file already has its own broader `isRnDStaff` used for other purposes).
- **`tadaOfficeUseDraft`** — dedicated local state, kept separate from `displayData` (which re-syncs from SWR on every revalidation — reusing it directly risked wiping in-progress edits).
- `tadaProcessedFields`/`tadaDisplayData` mirror the form page's hide/read-only logic, merging the draft on top for rendering.
- **`handleSaveTadaOfficeUse`** — calls `tadaAPI.save` with just the 7 fields + docname, then `mutate()` + `refreshAll()` (revalidates workflow-action SWR keys so the Forward gate re-evaluates immediately).
- "Save Office Use Details" button + `officeUseRequired` passed to `TADASettlementActionButtons` here too.

**Not changed:** `TaskRegistryDetails.tsx` (route already restricted to staff/approvers, nothing to hide); `apiService.ts`'s `tadaAPI` (already correct).

### End-to-end flow (as of this phase)

1. Applicant submits — "For Office Use" invisible at every stage.
2. At **Pending Staff Approval**, staff, RnD opens it from Pending Tasks; the 7 inputs are editable inline, totals update live.
3. Staff clicks **Save Office Use Details** — persisted via `save_ta_da_settlement`, totals recomputed server-side.
4. Staff clicks **Forward** — blocked (alert, then backend throw if bypassed) until Total Admissible Amount is non-zero.
5. Once forwarded, HoS/Ado_RnD/Dean see the section read-only with staff's figures, at every later stage.

---

## Phase 2 — Workflow UX Updates (2026-07-20)

Spans Travel, TA DA Settlement, and Miscellaneous Commit: workflow progress diagrams, a redesigned Actions dropdown with comments (matching Project Registration), an applicant-facing printable PDF, several correctness bugs, and a new child-table feature for TA DA Settlement.

### 2.1 Workflow Progress Timeline

Pattern: `LoanRequestDetails.tsx` / `IndentGeneralFormDetails.tsx` — a local `buildXTimelineStages()` helper + local `WorkflowTimeline` component under `PageHeader`, colored circular nodes (completed/in-progress/pending/rejected) connected by lines. Each module keeps its own copy rather than sharing one generic component (consistent with the rest of the codebase).

- **`TravelDetails.tsx`** — `buildTravelTimelineStages()`. Path: `Draft → [Pending PI/Mentor Approval] → Pending Head Approval → Pending Staff Approval → Pending HoS Approval → Pending Dean Approval → Approved`. The PI/Mentor entry stage is derived from the actual `Travel_Workflow` DB transitions (Permanent Employee skips to Pending Head Approval; Student/project staff go through PI Approval; Independent Researcher through Mentor Approval).
- **`TADASettlementForm.tsx`** — `buildTadaTimelineStages()`. Path: `Draft → [Pending PI Approval] → Pending Staff Approval → Pending HoS Approval → [Pending Associate Dean | Pending Dean Approval] → Approved`. The HoS-stage branch is data-driven (`getTadaApprovalBranch()` uses `ta_da_total_claimed` against the real DB workflow condition: `<= 30000` → Associate Dean, `> 30000` → Dean), same pattern as ICSS's Director/Dean branch-by-amount — stays correct even after the document has moved past that stage.

*(Superseded later, Phase 3: Travel's timeline gained a further `Pending Director Approval` stage — see Phase 3.)*

### 2.2 Actions Dropdown Redesign (+ Comments)

Reference: `ProjectDetails.tsx`'s `WorkflowActions` — single "Actions" trigger → portal-positioned dropdown, grouped **Forward/Neutral/Reject** via a `categorise()` helper, color-coded. Every action opens `CommentModal` (shared) with an *optional* comment box before confirming, posted via `rndopsapp.rndopsapp.api.add_project_comment(doctype, docname, content)` (added to `apiService.ts` as `commonAPI.addComment`).

- **`TravelActionButtons.tsx`** — full rewrite. `commitRequired` now blocks only **Forward** specifically (previously blocked every action). Dropped unused `blockedActions` prop.
- **`TADASettlementActionButtons.tsx`** — full rewrite. `officeUseRequired` still blocks only Forward, re-styled into the dropdown.
- **`MiscellaneousCommitActionButtons.tsx`** — full rewrite from its old "Available Actions" box to the same dropdown, using the shared `CommentModal`.

The comment box shows for every role performing every action (not role-gated), matching Project Registration's actual behavior.

### 2.3 Print PDF (Applicant-Facing) — v1

Pattern: `temporaryAdvancePrint.ts`/`igfPrint.ts` — letterhead HTML under `printformat/*.html` (`?raw` import) with `{{PLACEHOLDER}}` tokens filled by a generator in `utils/*Print.ts`, opened via `window.open()` + `.print()`.

New at this phase: `printformat/travel_format.html` + `utils/travelPrint.ts` (`generateTravelHtml`), and `printformat/ta_da_settlement_format.html` + `utils/tadaSettlementPrint.ts` (`generateTadaSettlementHtml`, deliberately excluding "For Office Use" — applicant's own copy). Also `utils/resolveBudgetHeadLabel.ts` (see §2.4.3).

Wired into `TravelDetails.tsx` and `TADASettlementForm.tsx`, gated on `currentUser === applicant webmail` and non-Draft `workflow_state`.

> **Superseded (before Phase 3):** the general-purpose Travel print (`travel_format.html`/`travelPrint.ts`) was later **removed entirely** — Travel's print button/handler and these two files no longer exist. Travel print was rebuilt from scratch in Phase 3, scoped specifically to the Director Approval review copy (`travel_director_review_format.html`/`travelDirectorPrint.ts`), not a general applicant print. TA DA Settlement's print (`ta_da_settlement_format.html`/`tadaSettlementPrint.ts`) is unaffected and continued evolving — see Phase 4.

### 2.4 Bug Fixes

**2.4.1 — SCL showing "Not eligible" for the wrong user.** (`travel.py`, `get_travel_fields`) The SCL balance card was computed from `frappe.session.user` (whoever is *viewing*), not the actual traveler. Fixed to use `doc.webmail_id_travel` whenever `doc_name` is passed, matching what `_deduct_scl_on_approval` already did correctly. Falls back to session user only for a genuinely new/blank form.

**2.4.2 — "Settle Travel" visible to approvers, not just the applicant.** (`TravelDetails.tsx`, `ProjectDetailsOverview.tsx`) `showSettleButton` only checked `workflow_state === "Approved"`, no identity check. Added `isApplicant = currentUser === webmail_id_travel` in both places the button appears.

**2.4.3 — "Account Head from Travel" showing a raw id instead of the name.** (`DynamicFormRenderer.tsx`, `resolveBudgetHeadLabel.ts`, `TravelDetails.tsx`, `TADASettlementForm.tsx`) `ta_da_account_head` is a plain Data field (fetched from Travel's `account_head`), never resolved to a label — printed raw (e.g. `gu12bngg1u`) in both form and PDF. Fix: (1) added `ta_da_account_head` to `DynamicFormRenderer.tsx`'s existing resolution branch, rendered via `<BudgetHeadName>`; (2) new `resolveBudgetHeadLabel.ts` — plain async dual-lookup (Frappe doc-name fetch for long values, legacy short custom-`id` list-query for short ones, cross-fallback), used as a print-handler fallback whenever pre-fetched `linkOptions` didn't resolve.

**2.4.4 — "Select Travel Application" editable by the applicant.** (`TADASettlementForm.tsx`, `PendingTaskDetails.tsx`) `ta_da_travel_application` should never change after being set via the `travel_ref` URL param. Forced `read_only: 1` in both places. Also closed a related gap in `PendingTaskDetails.tsx`: while staff edits "For Office Use", the page's global read-only turns off, briefly unlocking *every* other field too — now every non-office-use field is explicitly forced back to read-only during that window.

### 2.5 Journey Particulars & Local Conveyance Child Tables (TA DA Settlement)

Two new child DocTypes, migrated on the local bench, following the `TA DA Other Expense` pattern:
- **`TA DA Journey Particular`** — Departure/Arrival Station (Data), Departure/Arrival Date (Date), Mode of Journey (Select: Road/Rail/Air/Other), Specify Other Mode (Data, shown only when Mode = Other), Fare (Currency), Ticket/PNR No. (Data).
- **`TA DA Local Conveyance Particular`** — Date, Time, From, To (Data), Distance Traveled in Kms (Float), Mode of Journey (Select: Road/Rail/Other), Specify Other Mode, Fare (Currency).

No layout fields (Section/Column Break) — `ChildTableComponent` renders every child table in its own responsive grid regardless. Wired as `Table` fields on TA DA Settlement, each shown via `depends_on` when the matching "Particulars of … Used" Select = "Yes". `save_ta_da_settlement` persists both, mirroring `ta_da_other_expenses_p` handling. No stored "Sl. No." field — `ChildTableComponent` auto-numbers rows in its own UI chrome.

**`ChildTableComponent.tsx` generic enhancements** (backward-compatible): row-scoped `depends_on` support (`getRowColumns(row)`, using `evaluateExpression()` treating the row as `doc` — needed for "Specify Other Mode"); `Time` fieldtype input (was previously falling through to plain text).

**Pre-existing bug found & fixed along the way:** `TADASettlementForm.tsx` never attached the backend's `child_table_meta` to `Table`-type fields (unlike `AdvanceSettlementForm.tsx`), so `field.child_fields` was always `undefined` and `DynamicFormRenderer` silently rendered **nothing** for any Table field on this form — including the pre-existing "Other Expenses" table. Fixed by applying the same `child_table_meta` → `child_fields` merge in the form's data-loading effect.

Both tables read-only wherever viewed outside `TADASettlementForm.tsx`. `bench migrate` run twice (add tables, then remove unneeded layout fields) — both clean, verified via `DESCRIBE`.

### 2.6 View Project / Print button placement

Moved into the page header for all three modules:
- **Travel** — `TravelActionButtons` moved into `PageHeader`, next to `ViewProjectButton`.
- **TA DA Settlement** — added `ViewProjectButton` (was missing); fixed Actions-dropdown visibility (was gated on `docstatus === 1`, dead per the docstatus note in Phase 1 — switched to `workflow_state !== "Draft"`).
- **Miscellaneous Commit** — added `ViewProjectButton` (needed a new `DOCTYPE_PR_LINKS['Miscellaneous Commit']` entry in `utils/projectTypeMapping.ts`); moved `MiscellaneousCommitActionButtons` next to it; removed the old standalone "Action Buttons" block.

---

## Phase 3 — Travel: Director Approval Workflow

### Requirement (as given)

1. If **Nature of Travel = International**, the application must go through **Director approval** in addition to the normal Dean approval.
2. When the file reaches the Dean and the Dean **prints** the form, the status changes to **"Pending Director Approval"**.
3. **staff, RnD** then uploads the Director-signed approval copy.
4. Once uploaded, the **Dean makes the final approval**.
5. On that final approval, the record is (as already happens) **published to Kafka**.

### Design: a real Workflow branch, not a flag on the doctype

The first pass mirrored ICSS's approach — cosmetic `director_approval_required`/`send_to_director` Check fields layered on top of the existing `Pending Dean Approval` state, no new `workflow_state` value. **Rejected**: those fields showed up as visible checkboxes on the applicant's read-only form, and the requirement explicitly asked for this to be modeled as a genuine Frappe workflow state, visible in the workflow diagram — not a hidden flag.

Final design adds a real state, **`Pending Director Approval`**, to `Travel_Workflow` (the live DB `Workflow` doctype record, not a JSON fixture), with real `Workflow Transition` rows gated by `condition` expressions (a native Workflow Transition field, evaluated via `frappe.model.workflow.is_transition_condition_satisfied`):

```
Pending Dean Approval --Approve--> Approved
    (Dean, RnD; condition: doc.nature_of_travel != 'International')

Pending Dean Approval --Send for Director Approval--> Pending Director Approval
    (Dean, RnD; condition: doc.nature_of_travel == 'International')

Pending Director Approval --Approve--> Approved
    (Dean, RnD; condition: doc.director_signed_pdf   [truthy = uploaded])

Pending Director Approval --Reject--> Rejected
    (Dean, RnD)
```

Because the gating lives in the transition `condition`, both `get_travel_workflow_actions` and `perform_travel_action` were taught to evaluate it (previously only checked role membership). Practical effect:
- A Local/National travel's Dean sees **Approve** as normal.
- An International travel's Dean sees **"Send for Director Approval"** instead — Approve's condition fails, so it's silently excluded from the actions list (not shown, not just disabled).
- Once in `Pending Director Approval`, **Approve** stays absent until `director_signed_pdf` is set — again hidden, not disabled. Enforced both in the actions list (UX) and inside `perform_travel_action` (authoritative: transition isn't found at all if the condition fails → "No valid transition found").

Only one Travel-specific field remains: `director_signed_pdf` (Attach), `"hidden": 1` in `travel.json` so it never renders on the applicant's form via `DynamicFormRenderer`'s `isFieldVisible` — the Director Approval sidebar card in `TravelDetails.tsx` reads/writes it directly.

### Backend changes (`travel.py`)

- `get_travel_workflow_actions`/`perform_travel_action` call `is_transition_condition_satisfied(transition, doc)` in addition to the role check.
- `attach_director_pdf_travel(docname, file_url)` — role-gated to `["staff, RnD", "RnD Staff", "R&D Staff", "System Manager"]`; only callable while `workflow_state == "Pending Director Approval"`; sets `director_signed_pdf` via `frappe.db.set_value` (doesn't itself advance the workflow).
- `get_pending_travel_director_uploads()` — lists Travel docs in `Pending Director Approval`, for the staff upload queue (`DirectorPdfUpload.tsx`).
- No separate Approve-guard function needed — the transition `condition` mechanism *is* the guard.
- No change needed to Kafka publish — already fires generically whenever `next_state == "Approved"`.

**Migration:** `rndopsapp/patchs/add_travel_director_approval_workflow.py` (registered in `patches.txt` under `[post_model_sync]`) adds the state + transitions above, and creates the `"Send for Director Approval"` `Workflow Action Master` record (transition `action` is a Link field — the name has to exist there first). Idempotent (checks before appending); also tracked by Frappe's `Patch Log` so `bench migrate` only runs it once.

### Frontend changes

- **`TravelDetails.tsx`** — Director Approval sidebar card, shown when `workflow_state === "Pending Dean Approval" && nature_of_travel === "International"` or `workflow_state === "Pending Director Approval"`:
  - Dean, at `Pending Dean Approval`: **"Print & Send for Director Approval"** — opens the print window and calls `travelAPI.performAction({action: "Send for Director Approval"})` (same generic endpoint `TravelActionButtons` uses) — a real workflow transition to `Pending Director Approval`.
  - Dean, at `Pending Director Approval` (not yet uploaded): **"Download for Director Approval"** — reopens the same print HTML, no API call, unlimited clicks — covers a lost/forgotten hard copy.
  - staff, RnD, at `Pending Director Approval` (not yet uploaded): upload control → `upload_file` then `attachDirectorPdf`.
  - Once `director_signed_pdf` is set: "View Director-Signed Copy" link; Dean's dropdown now offers Approve again (workflow-driven, no frontend gating needed).
  - Status badge shows `workflow_state` directly — no cosmetic label override needed, since `"Pending Director Approval"` is the real value.
  - `WorkflowTimeline` inserts `Pending Director Approval` between Dean Approval and Approved whenever `nature_of_travel === "International"` (or already in that state).
- **`TravelActionButtons.tsx`** — no gating logic needed (an earlier `approveBlocked` prop attempt was reverted); `categorise()` buckets any action containing `"director"` into the green "forward" style.
- **`utils/travelDirectorPrint.ts`** + **`printformat/travel_director_review_format.html`** — the print-only review note, modeled on `tadaSettlementPrint.ts`'s pattern. (Content evolved substantially in Phase 4 — see below.)
- **`DirectorPdfUpload.tsx`** — Travel added as a 4th tracked module (alongside ICSS/SCR/IGF); module short-label lookup generalized into a `MODULE_SHORT` map instead of a two-way ternary.
- **`apiService.ts`** — `travelAPI.attachDirectorPdf`, `travelAPI.getPendingDirectorUploads` (no `updateSendToDirector`/`getDirectorApprovalStatus` — those were only needed by the rejected flag-based design).

---

## Phase 4 — Print PDF Enhancements & Further Bug Fixes (2026-07-23)

A further round spanning both modules — print-PDF enhancements for Travel's Director Approval review and TA DA Settlement's applicant print, plus several unrelated bugs surfaced while testing.

### 4.1 Bug fixes

- **Ledger parent-TID lookup bug** (`CommitPayment.tsx`): `handleCommit()` was querying the ledger's `commit-payment-transactions` endpoint with `accountHeadId=${commitHead}` — a Budget Head **label**, not the numeric/short `id` every other call site in the app uses (`ProjectDetailsOverview.tsx`, `ProjectLedgerModal.tsx`, `useProjectBudget.ts`, etc.). Added a `budgetHeadIds` map prop (wired from `BudgetActionsSidebar.tsx` and `AdvanceSettlementDetails.tsx`, both of which already had `{name, id}` pairs) so the label resolves to the correct id before the ledger query.
- **Make a Commitment amount pre-fill wrong**: was pre-filling with the *net* (difference) amount; changed to `ta_da_total_claimed` (the new total commitment amount) — with an explanatory note ("For TA/DA Settlement, the commitment amount is the new total commitment amount...") passed through `BudgetActionsSidebar`'s new `commitAmountNote` prop → `CommitPayment`'s `description`.
- **Local Conveyance time not saving** (perceived): the backend was storing it correctly all along — `<input type="time">` (no `step` attribute) only accepts `HH:MM`, not Frappe's `HH:MM:SS(.ffffff)` format, so the field always rendered blank after reload/reopen, looking unsaved. Fixed in `ChildTableComponent.tsx` by truncating the displayed value to `HH:MM`.
- **HoS, RnD seeing a commit *form* instead of read-only committed data**: root cause was `Kafka Commit Staging` having read permission restricted to `System Manager` only (confirmed: zero `DocPerm` rows for any other role), so the widget's staging-check REST call (`/api/v2/document/Kafka Commit Staging?...`) 403'd for every non-admin role — including staff, RnD themselves, who just happened not to notice since they're supposed to see the form anyway. Added `commitPayment.get_commit_staging_status` (whitelisted, bypasses the restriction for this one safe, filtered-by-reference-name read) and switched `CommitPayment.tsx`'s `checkStagingRecord` to call it via `useFrappePostCall` instead of the raw `fetch`. Also added a `canSubmitCommitment` role gate (staff/System Manager only, excludes `Hos, RnD`) passed as `disabled`/`disabledReason` to `<CommitPayment>` in `TravelDetails.tsx`, as defense-in-depth for the edge case where no staging record exists yet.
- **Declaration section blank in the Travel Director Approval PDF**: same root-cause class as above — `DocField` (used to fetch declaration text) has **no DocPerm rows of its own** (it's metadata, not document data), so a direct `frappe.client.get_list("DocField", ...)` call 403'd for Dean. Added `api.get_declaration_html(doctype)` (whitelisted, `ignore_permissions=True`, returns `{fields: {fieldname: html}}` — a per-fieldname map, not one joined string, so a caller can route specific fields to a different print section) and pointed `utils/fetchDeclarationHtml.ts` at it. Found and fixed the identical bug for Activity Log commenter designations (`User` read is restricted to `System Manager`/`Permanent Employee` only) via a new `api.get_user_designation(email)` endpoint (`frappe.db.get_value`, a raw lookup, not permission-checked).
- **SCL balance shown was wrong ("30 days remaining", always)**: that text was the *static DocField default* for `travel_leave_balance_html` — never real data. The actual per-applicant balance is computed server-side by `get_travel_fields` (`_build_scl_balance_html`, resolved for `doc.webmail_id_travel` — the traveler, not the viewer, per the Phase 2.4.1 fix) and returned both injected into the `fields` metadata array *and* as a raw `scl_balance` dict (`{is_eligible, available_balance, total_credited, utilized_balance, year}`) in the same API response. Extended `TravelDetails.tsx`'s `FormDataResponse` type to capture `scl_balance`, and added `buildSclBalanceRow()` in `travelDirectorPrint.ts` to render it as a single compact table row (`Available: X | Credited: Y | Utilized: Z`) inside the existing "Special Casual Leave & Leave Period" table, instead of the large standalone styled card used on the live form.
- **"Project Title" wrong in the Director Approval PDF**: `travel_project_title` is a Link to `Project Registration` — stores the docname (an internal ID like `110001`), not free text. Extended the existing project-number resolution fetch (already used for `resolvedProjectNo`) to also capture the linked document's real `project_title` field, fixing both the print (`{{PROJECT_TITLE}}`) and the on-page `PageHeader` (`projectName` prop), which had the identical bug.
- **Director PDF Upload page: "Failed to load: There was an error."**: `get_pending_director_uploads_igf` (Indent General Form's module) was never implemented on the backend at all — confirmed zero matches for any director-related function in `indent_general_form.py`, and no `send_to_director`/`director_signed_pdf` fields on that doctype either. This is a **pre-existing gap** predating this work, not something introduced here. Since the page's combined `error` state was `scrError || icssError || igfError || travelError`, IGF's permanent failure blocked the *entire* page even though ICSS, SCR, and Travel all work correctly (individually verified via `bench execute`). Changed the gate in `DirectorPdfUpload.tsx` to only show a full-page error when *all four* modules fail, and added a small amber "Could not load: Indent General Form" banner so the working modules still render. **Not fixed**: IGF's director-approval feature itself still doesn't work end-to-end — a separate, larger implementation task if wanted later.

### 4.2 Travel Director Approval print (`travel_director_review_format.html` / `travelDirectorPrint.ts`)

- Expanded from a handful of fields to **every field on the applicant's form**: applicant + other-traveler details, travel details, financial assistance & account head, bank details, cost estimate (+ attachment presence notes), special casual leave & leave period, station leave, additional responsibility & arrangement, remarks, declaration.
- Added the real **Declarations** paragraph (`travel_declaration_text`, via `get_declaration_html`) above the accepted Yes/No line.
- Added an **Activity Log** table (Approver Name & Designation — Comment — Time), oldest-first, via new shared util `utils/fetchActivityLogHtml.ts` (reuses `rndopsapp.rndopsapp.api.get_document_activity` — the same endpoint the on-screen `<ActivityLog>` widget uses, so the print matches what's shown in the app). The document-creation row prints as **"Submitted"** instead of the backend's generic **"created this"** label — a print-only override (`LABEL_OVERRIDES` map in `fetchActivityLogHtml.ts`), leaving the shared backend label and the on-screen widget (used by other, non-workflow doctypes too) unaffected.
- Removed the **"For Director's Use"** approve/reject checkbox box entirely; the signature row given more top margin (`margin-top: 100px`) and the Director's box a **"(Signature & Seal)"** note.
- SCL balance as one compact table row (see 4.1), correctly excluded from the Declarations block (`travel_leave_balance_html` is filtered out of the joined declarations text and routed to its own row instead).
- **"Project Title"** fixed (see 4.1).

### 4.3 TA/DA Settlement print (`ta_da_settlement_format.html` / `tadaSettlementPrint.ts`)

- Added the same **Activity Log** table (shared `fetchActivityLogHtml.ts` util) above the signature block.
- Declaration checklist rewritten from short labels ("Distances shown are correct: Yes") to the **full formal declaration sentences** ("The distances for road journeys shown in the bill are correct to the best of my knowledge.", etc.), each still ending in **"Accepted: Yes/No"**.
- **"Please Submit the following documents to R&D Office"** block: fixed so "Hard copy of the online TA-DA Settlement application should be submitted with the following documents." reads as an intro sentence, not numbered list-item 1 — the numbered list now starts fresh with the 5 actual document items (Tickets/Boarding passes…, Proof of payments…, Participation Certificate…, bills signed…, foreign-currency conversion…). **This fix is PDF-only** — hardcoded directly as static markup in the print template — the shared `submission_instructions_html` DocField (and the applicant's live form, which still reads it unchanged) was deliberately left untouched, per explicit instruction. As a result, `fetchDeclarationHtml`/`fetchDeclarationFields` is no longer used by the TA/DA print at all (only Travel's print still uses it, for `travel_declaration_text`).
- Both the submission-instructions block and the declaration-statements block now sit in their own bordered boxes (`.declaration-text` style, reused), instead of one boxed + one plain bullet list.
- Signature block restructured from one flat row of 4 equal boxes into: **Applicant's Signature** (own row) → **Scrutinized by** (own row, taller box for handwritten remarks) → **HoS, R&D / Dean, R&D** (side-by-side boxes to sign inside).
- **"For Office Use"** section: all figures now always print as blank cells (`&nbsp;`), regardless of any computed/stored value — these are filled in by hand with a pen, so no prefilled amount is ever shown.

### 4.4 Important Notice modal (`TravelForm.tsx`)

New applications (not edits of an existing Draft — gated on `!editDocName`) are now blocked behind a modal — "Important Notice" — quoting:
- The mandatory-ticket-booking-agency circular (Balmer & Lawrie / IRCTC / Ashoka Tours and Travels, Circular No. SKM_458e22021611540 - DoE_OM dated 16.02.2022) and its non-reimbursement consequence.
- The ₹800 taxi-fare cap between IITG Campus and Guwahati Airport/Rail Station (Circular No. IITG/F&A/COR/2023-24/152 dated 30.08.2023) and its non-processing consequence.
- The participation-certificate/proof-of-attendance requirement.

The form only renders after "Accept & Continue" is clicked. No reusable `Modal`/`Dialog` wrapper existed anywhere in this codebase (confirmed by search — every modal here, e.g. `CommentModal`, `PaymentModal`, `CancellationModal`, is bespoke), so this is a new `createPortal`-based component (`ImportantTravelNotice`) matching that same ad hoc pattern.

### 4.5 Backend endpoints added this phase

| Endpoint | Purpose |
|---|---|
| `commitPayment.get_commit_staging_status` | Bypasses `Kafka Commit Staging`'s System-Manager-only read for the "Make a Commitment" widget's staging check. |
| `api.get_declaration_html(doctype)` | Bypasses `DocField`'s lack of DocPerm rows; returns `{fields: {fieldname: html}}`. |
| `api.get_user_designation(email)` | Bypasses `User`'s restricted read permission for the Activity Log print's designation lookup. |
| `travel.py: get_pending_travel_director_uploads` | *(Phase 3, listed here for completeness)* Lists Travel docs in `Pending Director Approval`. |
| `travel.py: attach_director_pdf_travel` | *(Phase 3)* Staff, RnD sets `director_signed_pdf` once uploaded. |

---

## Full File Inventory (all phases, current state)

**Backend** (`/home/rndops/Desktop/frappe_dev/prornd/apps/rndopsapp/`)
- `rndopsapp/rndopsapp/api.py` — `get_declaration_html`, `get_user_designation`, plus pre-existing `get_document_activity`/`add_project_comment`.
- `rndopsapp/rndopsapp/commitPayment.py` — `get_commit_staging_status`.
- `rndopsapp/rndopsapp/doctype/travel/travel.py` — SCL-target-user fix, condition-aware workflow actions, `attach_director_pdf_travel`, `get_pending_travel_director_uploads`.
- `rndopsapp/rndopsapp/doctype/travel/travel.json` — `director_signed_pdf` (hidden Attach).
- `rndopsapp/rndopsapp/doctype/ta_da_settlement/ta_da_settlement.py` — office-use save/validate logic, Forward gate, child-table save handling.
- `rndopsapp/rndopsapp/doctype/ta_da_settlement/ta_da_settlement.json` — 9 office-use fields (pre-existing) + two new `Table` fields.
- `rndopsapp/rndopsapp/doctype/ta_da_journey_particular/` (new child doctype)
- `rndopsapp/rndopsapp/doctype/ta_da_local_conveyance_particular/` (new child doctype)
- `rndopsapp/patchs/add_travel_director_approval_workflow.py` (new) + one line in `rndopsapp/patches.txt`.

**Frontend** (`/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/`)
- `pages/application/TravelDetails.tsx` — timeline, Settle-button identity check, Director Approval sidebar card, project-title/SCL-balance/declarations/activity-log print wiring, `canSubmitCommitment` gate.
- `pages/application/TravelForm.tsx` — Important Notice modal.
- `pages/application/TADASettlementForm.tsx` — office-use editing, timeline, print wiring, Journey/Conveyance tables, `child_table_meta` fix, ViewProjectButton.
- `pages/PendingTaskDetails.tsx` — office-use editing, `ta_da_travel_application` read-only fix.
- `pages/ProjectDetailsOverview.tsx` — Settle-button identity check.
- `pages/application/MiscellaneousCommitDetails.tsx` — header button placement.
- `pages/application/AdvanceSettlementDetails.tsx` — ledger-id fix (`budgetHeadIds`).
- `pages/application/DirectorPdfUpload.tsx` — Travel as 4th module, `MODULE_SHORT` map, partial-failure resilience + banner.
- `components/TravelActionButtons.tsx` — dropdown rewrite, `"director"` forward-style categorisation.
- `components/TADASettlementActionButtons.tsx` — dropdown rewrite, `officeUseRequired`.
- `components/MiscellaneousCommitActionButtons.tsx` — dropdown rewrite.
- `components/CommitPayment.tsx`, `components/BudgetActionsSidebar.tsx` — ledger-id fix, staging-status permission fix, amount pre-fill + note.
- `components/forms/DynamicFormRenderer.tsx` — `ta_da_account_head` resolution branch.
- `components/forms/ChildTableComponent.tsx` — row-scoped `depends_on`, `Time` fieldtype, HH:MM truncation fix.
- `services/apiService.ts` — `commonAPI.addComment`, Travel director-approval endpoints.
- `utils/projectTypeMapping.ts` — `DOCTYPE_PR_LINKS['Miscellaneous Commit']`.
- `utils/resolveBudgetHeadLabel.ts` (new, Phase 2).
- `utils/resolveDepartmentLabel.ts` (new, Phase 4) — mirrors `resolveBudgetHeadLabel.ts` for Department_prornd.
- `utils/fetchDeclarationHtml.ts` (new, Phase 4) — `fetchDeclarationFields` (raw map) + `fetchDeclarationHtml` (joined, with exclusion support); used by Travel's print only.
- `utils/fetchActivityLogHtml.ts` (new, Phase 4) — shared Activity Log print builder, incl. "Submitted" label override.
- `utils/travelDirectorPrint.ts` (new, Phase 3; substantially expanded Phase 4).
- `utils/tadaSettlementPrint.ts` (new, Phase 2; expanded Phases 2 & 4).
- `pages/printformat/travel_director_review_format.html` (new, Phase 3; substantially expanded Phase 4).
- `pages/printformat/ta_da_settlement_format.html` (new, Phase 2; expanded Phases 2 & 4).

**Removed** (superseded, see Phase 2.3 note): `pages/printformat/travel_format.html`, `utils/travelPrint.ts` — Travel's original general-purpose print, later replaced by the Director-Approval-specific print built in Phase 3.
