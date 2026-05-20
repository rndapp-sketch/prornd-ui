# ICSS Backend Handoff

## Scope

Finish backend support for **Indent Cum Sanction Sheet (ICSS)** in the Frappe app:

- Backend repo path:
  `/home/rndops/Desktop/frappe_dev/prornd/apps/rndopsapp`
- Main doctype:
  `rndopsapp/rndopsapp/doctype/indent_cum_sanction_sheet/indent_cum_sanction_sheet.py`

This note is written for backend developers so they can complete ICSS without re-tracing the whole frontend and module pattern.

---

## Current Situation

ICSS is partially implemented already:

- parent doctype exists
- child doctype mapping exists
- nested child JSON support is partially present
- workflow action API exists
- HoS amount-based routing for `> 1 lakh` vs `<= 1 lakh` is partially coded

But the flow is still incomplete for the current frontend.

---

## Integration Status

ICSS backend is **partially ready for integration**, but frontend should **not switch blindly yet**.

### APIs that are available now

- `get_icss_fields(doc_name=None)`
- `get_icss_child_fields(indent_type, child_docname=None)`
- `save_icss_composite_data({ parent, child })`
- `get_icss_workflow_actions(docname)`
- `perform_icss_action(docname, action)`

### Preferred save payload

```json
{
  "parent": {
    "name": null,
    "icss_indent_type": "Proprietary Purchase with Proprietary certificate from the OEM",
    "project_ref": "PROJECT-DOCNAME",
    "project_no": "PROJECT-NO",
    "icss_account_head": "BUDGET-HEAD"
  },
  "child": {
    "doctype": "proprietary_purchase",
    "name": null,
    "table_qanf": []
  }
}
```

### Clear integration guidance

- New preferred API is `save_icss_composite_data`, not `save_icss_data`
- Fetch response includes child data under `prefill_data.child_document`
- HoS routing is implemented:
  - amount `> 1L` -> `Pending Dean Approval`
  - amount `<= 1L` -> `Pending Associate Dean`
- Director routing is **not implemented yet**
- AMC and Rate Contract still need final backend parity checks
- Current flat frontend payload to `save_icss_data` is **not the safest path yet**

### Best one-line handoff

“Please integrate ICSS using the new composite payload API `save_icss_composite_data({ parent, child })`; old flat `save_icss_data` compatibility is still pending.”

---

## Frontend Deployment Change Log

Track ICSS frontend files changed for easier production deployment.

| Date | Area | Files | Notes |
| --- | --- | --- | --- |
| 2026-05-12 | ICSS PO generation - Rate Contract | `src/pages/application/IndentCumSanctionSheetForm.tsx`, `src/components/POEditor.tsx`, `src/utils/poPrint.ts` | Rate Contract PO generation now shows Application Type, Item Type, Principal Supplier/details, Agreement Number, Local Supplier/details/email in the PO prefill area, and uses the Rate Contract PO table columns: Item Description, Cat No., Page No., Unit Rate, Quantity, Discount (%), GST (%), Amount. This is scoped to Pending PO Generation / PO editor, not the applicant ICSS form. |
| 2026-05-12 | ICSS PO generation - prefilled display names | `src/pages/application/IndentCumSanctionSheetForm.tsx`, `src/components/POEditor.tsx` | The PO prefill card now resolves Department, Account Head, Principal Supplier, and Local Supplier display names instead of showing raw linked IDs where possible. |
| 2026-05-12 | ICSS PO generation - AMC PO table | `src/pages/application/IndentCumSanctionSheetForm.tsx`, `src/components/POEditor.tsx`, `src/services/apiService.ts`, `src/utils/poPrint.ts`, `src/pages/printformat/po_format.html` | Staff/R&D PO editor now sends `indent_type` and AMC-only `amc_po_table` rows to the new `ICSS_PO.save_icss_po_data` API, and the AMC PO table is included in the PO PDF. |
| 2026-05-12 | ICSS PO generation - AMC PDF copy and totals | `src/components/POEditor.tsx`, `src/pages/application/IndentCumSanctionSheetForm.tsx`, `src/utils/poPrint.ts`, `src/pages/printformat/po_format.html` | AMC PO now has staff-filled AMC Job Order No. and subject fields, AMC-specific PDF intro copy, table total calculation, updated amount in words, and account-head label fallback for PDF display. |
| 2026-05-12 | ICSS PO generation - AMC PDF cleanup | `src/pages/application/IndentCumSanctionSheetForm.tsx`, `src/utils/poPrint.ts`, `src/pages/printformat/po_format.html` | AMC PDF now suppresses the old generic item table, renames the AMC PO table heading to Details of AMC Services, removes File No., and prefers parent account-head source for label resolution. |
| 2026-05-12 | ICSS PO generation - Budget Head docname resolution | `src/pages/application/IndentCumSanctionSheetForm.tsx` | Budget Head label resolution now handles Frappe document names like `vqcr82fk6f`, numeric ids, and visible budget-head names before generating/saving PO PDF HTML. |
| 2026-05-12 | ICSS PO generation - AMC prefill labels | `src/pages/application/IndentCumSanctionSheetForm.tsx`, `src/components/POEditor.tsx` | Common ICSS Grand Total label changed to Committed Grand Total, AMC editor table heading changed to Details of AMC Services, and duplicate AMC amount-summary block is hidden in the PO editor. |
| 2026-05-12 | ICSS PO generation - AMC prefill cleanup | `src/pages/application/IndentCumSanctionSheetForm.tsx` | Removed AMC Total from the AMC Details prefilled section; committed total remains in Common ICSS Details and AMC service total remains with the AMC table. |
| 2026-05-13 | ICSS PO generation - tabbed pending PO view | `src/pages/application/IndentCumSanctionSheetForm.tsx` | Pending PO Generation view now shows PO Generation and Main ICSS Form tabs below workflow progress, so Staff/R&D can switch between PO input and the read-only ICSS reference form. |
| 2026-05-13 | ICSS PO generation - approved form tab copy | `src/pages/application/IndentCumSanctionSheetForm.tsx` | Renamed the reference tab to Approved Indent Cum Sanction Sheet and changed helper text to Click to view the approved form. |
| 2026-05-13 | ICSS PO generation - AMC GST fields | `src/components/POEditor.tsx`, `src/pages/application/IndentCumSanctionSheetForm.tsx`, `src/utils/poPrint.ts` | Added AMC-only GST %, GST Amount, and Grand Total below Details of AMC Services; GST amount and grand total are calculated from AMC table rows and sent to `ICSS_PO.save_icss_po_data` as `add_of_gst_`, `gst_amount`, and `grand_total`. |
| 2026-05-13 | ICSS PO generation - AMC job order simplification | `src/components/POEditor.tsx`, `src/utils/poPrint.ts` | Removed the separate AMC PO Details card, moved Sub: AMC of into PO Details, and made AMC Job Order No. use the same value as P.O. Number in the editor/PDF. |
| 2026-05-13 | ICSS PO generation - AMC-only PO number cleanup | `src/pages/printformat/po_format.html`, `src/utils/poPrint.ts` | P.O. No. is hidden only for AMC PDFs; non-AMC PO PDFs continue showing P.O. No. in the header. |
| 2026-05-13 | ICSS PO generation - Standardized grand total fix | `src/pages/application/IndentCumSanctionSheetForm.tsx` | Standardized/Emergent PO summary now recognizes both `standardized` and backend typo `standerdized`, regenerates the amount summary from current ICSS fields instead of reusing stale saved zero summaries, and computes grand total from Standardized amount components if `sp_grand_total` is missing/stale. |

---

## Main Breakpoints

### 1. Current frontend still sends a flat payload

Current UI page:

- `/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/pages/application/IndentCumSanctionSheetForm.tsx`

Current API config:

- `/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/services/apiService.ts`

The frontend currently calls:

- `save_icss_data`

and sends one flat object containing:

- parent ICSS fields
- child doctype fields
- child table rows

The backend now has `save_icss_composite_data(data)`, and this is the **preferred integration path**.

So frontend should move to the composite payload API. Supporting the old flat payload in `save_icss_data` is still useful for backward compatibility, but should not be treated as the preferred contract.

### 2. Reopen/edit flow does not fully flatten child data back into the form

`get_icss_fields(doc_name=...)` currently includes nested child data as:

- `child_document`
- `child_doctype`

But the current frontend form state is still largely flat. If child values are returned only nested, many child fields will not repopulate automatically unless frontend remaps them.

### 3. AMC backend parity is missing

Current frontend previously pointed AMC to a mismatched backend path.

Backend currently has:

- `doctype/amc/amc.py`

AMC still needs final backend parity verification before it can be considered fully safe in the ICSS parent-child flow.

### 4. Rate Contract backend parity still needs final verification

Frontend expects:

- `get_rate_contract_workflow_actions`
- `perform_rate_contract_action`

Need to confirm those exist and match the current ICSS parent-driven design cleanly.

### 5. Director escalation logic is not finished

The implementation doc and workflow design require:

- Equipment + amount `> 10,00,000` -> `Pending Director Approval`
- Non-equipment + amount `> 3,00,000` -> `Pending Director Approval`
- Otherwise:
  - `> 1,00,000` -> `Pending Dean Approval`
  - `<= 1,00,000` -> `Pending Associate Dean`

Current ICSS Python already handles the `1 lakh` split.

Director routing is still pending.

### 6. Kafka commit publish is not wired for ICSS

Patterns exist already in:

- `Direct Purchase`
- `Recruitment Adhoc Contractual`
- `Travel`
- `Advance Settlement`

ICSS should follow the same staged commit + publish-on-Approved pattern if commit/payment is needed for this module.

### 7. Staff-side / other-user visibility helpers are missing or unclear

For many modules the system exposes:

- workflow actions
- detail view helpers
- list/by-user APIs
- pending-task visibility through workflow state

ICSS may need explicit helper endpoints depending on how it should appear on user side and staff side.

---

## Recommended Backend Tasks

## A. Integrate frontend/backend primarily through `save_icss_composite_data`

Preferred API:

- `save_icss_composite_data({ parent, child })`

File:

- `rndopsapp/rndopsapp/doctype/indent_cum_sanction_sheet/indent_cum_sanction_sheet.py`

Recommended behavior:

1. Frontend submits `parent` and `child`
2. Backend validates indent type and child doctype
3. Backend saves parent
4. Backend injects child linkage fields:
   - `indent_cum_sanction_sheet_id = parent.name`
   - `project_ref = parent.project_ref`
   - `project_no = parent.project_no`
   - `indent_type = parent.icss_indent_type`
5. Backend saves child
6. Backend stores `sub_doctype_reference`
7. Backend returns combined JSON

## B. Keep `save_icss_data` only as backward-compatibility support

File:

- `rndopsapp/rndopsapp/doctype/indent_cum_sanction_sheet/indent_cum_sanction_sheet.py`

Recommended behavior:

1. Detect `icss_indent_type`
2. Resolve child doctype from indent type
3. Split incoming flat payload into:
   - parent fields belonging to `Indent Cum Sanction Sheet`
   - child fields belonging to the mapped child doctype
4. Save parent
5. Inject child linkage fields:
   - `indent_cum_sanction_sheet_id = parent.name`
   - `project_ref = parent.project_ref`
   - `project_no = parent.project_no`
   - `indent_type = parent.icss_indent_type`
6. Save child
7. Store `sub_doctype_reference` on parent
8. Return combined JSON

Notes:

- This is for backward compatibility only.
- It should not be treated as the long-term frontend contract.

## C. Flatten child values when reopening existing ICSS

File:

- `rndopsapp/rndopsapp/doctype/indent_cum_sanction_sheet/indent_cum_sanction_sheet.py`

Recommended behavior for `get_icss_fields(doc_name=...)`:

- keep:
  - `child_document`
  - `child_doctype`
- also merge child scalar fields and child tables into `prefill_data` when they do not conflict with parent fields

Why:

- current UI form state is flat
- this avoids forcing immediate frontend refactor

Safe rule:

- parent keys win on conflict
- add child values only for keys not already defined in parent payload

## D. Finish HoS routing and director escalation

File:

- `rndopsapp/rndopsapp/doctype/indent_cum_sanction_sheet/indent_cum_sanction_sheet.py`

Implement a single helper, for example:

- `_get_icss_next_approval_state(doc, workflow, user_roles, action)`

Routing order:

1. If current state is not `Pending HoS Approval` or action is not `Approve`, do nothing
2. Resolve normalized amount
3. Resolve effective account head / budget head
4. Apply routing in this order:
   - Equipment + amount `> 1000000` -> `Pending Director Approval`
   - Non-equipment + amount `> 300000` -> `Pending Director Approval`
   - amount `> 100000` -> `Pending Dean Approval`
   - else -> `Pending Associate Dean`

Important:

- do not scatter this across multiple conditions
- one helper should decide the target state

## E. Normalize amount calculation by indent type

Current logic should use a single helper.

Expected amount source:

- Proprietary -> `pp_grand_total`
- Standardized -> `sp_grand_total`
- Repair / Replacement -> `rr_grand_total`
- AMC -> `amc_grand_total`
- Rate Contract -> `rate_contract_grand_total`

Fallbacks can use parent totals where needed.

## F. Add AMC backend parity

Files:

- `rndopsapp/rndopsapp/doctype/amc/amc.py`
- related imports/call sites in ICSS parent

AMC backend needs the same pattern as other child doctypes:

- `get_amc_fields(doc_name=None)` or equivalent
- `save_amc_data(data)` if child save helpers remain exposed
- `get_amc_workflow_actions(docname)`
- `perform_amc_action(docname, action)`
- `submit_amc(docname)`

Even if child workflow remains backend-driven only, the metadata/load API must exist because the frontend currently loads AMC fields directly.

Also update ICSS child API mapping so AMC child metadata resolves correctly.

## G. Confirm / normalize Rate Contract child support

Files:

- `rndopsapp/rndopsapp/doctype/rate_contract/rate_contract.py`
- ICSS parent mapping file

Need to ensure:

- child metadata API shape matches other doctypes
- returned fields can drive the current dynamic renderer
- workflow endpoints expected by frontend actually exist
- child linkage fields are preserved:
  - `indent_cum_sanction_sheet_id`
  - `project_no`
  - `project_ref`
  - `indent_type`
  - `workflow_state`

## H. Wire ICSS to Kafka commit staging/publishing if required

Relevant existing pattern:

- `rndopsapp/rndopsapp/commitPayment.py`

Current publish hook supports doctypes like:

- Reimbursement
- Temporary Advance
- Direct Purchase
- Travel
- Recruitment Adhoc Contractual
- Indent General Form

If ICSS must commit to Kafka:

1. Add `"Indent Cum Sanction Sheet"` to `applicable_doctypes` inside `check_workflow_and_publish()`
2. Provide a staff-side commit detail API similar to:
   - `get_travel_commit_details`
   - `get_ta_da_settlement_commit_details`
3. Ensure frontend can stage commit data through:
   - `rndopsapp.rndopsapp.commitPayment.submit_commit_data`
4. Publish only when ICSS reaches `Approved`

Suggested ICSS commit detail API:

- `get_icss_commit_details(docname)`

Suggested returned fields:

- `docname`
- `workflow_state`
- `applicant_name`
- `webmail_id`
- `project_name` or `project_ref`
- `project_number` / `project_no`
- `commit_amount`
- `budget_head`
- `account_head`
- `indent_type`
- `module_id`
- `ref_details`

## I. Add list/detail helpers if the UI needs user/staff views

Recommended additions:

- `get_icss_by_webmail(webmail_id=None, project_no=None)`
- `get_icss_detail(docname)`

Recommended behavior:

- list API returns saved docs for applicant / PI / filters
- detail API returns:
  - full ICSS doc
  - child data
  - workflow actions
  - workflow state

This is optional if raw `/api/resource/Indent Cum Sanction Sheet` is enough, but dedicated APIs are safer.

---

## Files Most Likely To Change

### Primary

- `rndopsapp/rndopsapp/doctype/indent_cum_sanction_sheet/indent_cum_sanction_sheet.py`
- `rndopsapp/rndopsapp/doctype/amc/amc.py`
- `rndopsapp/rndopsapp/doctype/rate_contract/rate_contract.py`
- `rndopsapp/rndopsapp/commitPayment.py`

### Schema / metadata review

- `rndopsapp/rndopsapp/doctype/indent_cum_sanction_sheet/indent_cum_sanction_sheet.json`
- `rndopsapp/rndopsapp/doctype/amc/amc.json`
- `rndopsapp/rndopsapp/doctype/rate_contract/rate_contract.json`
- `rndopsapp/rndopsapp/doctype/proprietary_purchase/proprietary_purchase.json`
- `rndopsapp/rndopsapp/doctype/standerdized_purchase/standerdized_purchase.json`
- `rndopsapp/rndopsapp/doctype/repair_replacement/repair_replacement.json`

---

## Frontend Expectations To Preserve

Current UI behavior depends on:

- `get_icss_fields(doc_name)`
- `save_icss_composite_data`
- `get_icss_workflow_actions(docname)`
- `perform_icss_action(docname, action)`

Current frontend page:

- `/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/pages/application/IndentCumSanctionSheetForm.tsx`

Important reality:

- frontend should move to composite save
- child data is expected under `prefill_data.child_document`
- frontend fetches subform metadata directly per indent type
- old flat `save_icss_data` should not be the preferred integration path

So backend should expose the composite contract clearly, and keep old flat save only as a fallback until all callers migrate.

---

## Acceptance Criteria

Backend can be considered complete when all of these work:

1. New ICSS draft saves successfully from current frontend for all indent types:
   - Proprietary
   - Standardized
   - Repair / Replacement
   - AMC
   - Rate Contract

2. Reopening an ICSS record repopulates:
   - parent fields
   - child fields
   - child tables

3. Workflow buttons behave correctly from parent ICSS API only.

4. HoS routing works exactly as:
   - amount `> 1 lakh` -> Dean
   - amount `<= 1 lakh` -> Associate Dean

5. Director routing is either implemented correctly or explicitly documented as pending:
   - Equipment + amount `> 10 lakh` -> Director
   - Non-equipment + amount `> 3 lakh` -> Director

6. If commit staging is required, ICSS can:
   - stage commit data
   - publish on `Approved`
   - appear correctly on staff-side flow

7. AMC metadata endpoint works with current frontend.

8. Rate Contract child flow works through ICSS parent without breaking existing rate-contract metadata rendering.

---

## Suggested Implementation Order

1. Finalize and stabilize `save_icss_composite_data({ parent, child })`
2. Flatten child values in `get_icss_fields(doc_name=...)`
3. Finish HoS + Director routing helper
4. Add AMC backend APIs
5. Normalize Rate Contract workflow/API shape
6. Add old `save_icss_data` compatibility only if still needed by remaining callers
7. Add ICSS commit detail helper and Kafka publish support if required
8. Add optional list/detail APIs

---

## Notes

- There are already local uncommitted backend changes in the Frappe repo around ICSS, AMC JSON, Rate Contract JSON, and repair JSON. Backend developers should review the current git diff before editing further.
- The UI already contains ICSS-specific service entries and dynamic form logic, so backend compatibility is the main blocker right now.

---

## Frontend Deployment Change Register

Last updated: `2026-05-13`

This section tracks ICSS frontend files changed for production deployment. Keep adding future ICSS changes here before release so deployment does not depend on memory or local git history.

### Changed frontend files in current ICSS work

| File | Deploy? | Purpose |
| --- | --- | --- |
| `src/pages/application/IndentCumSanctionSheetForm.tsx` | Yes | Main ICSS form. Handles composite save payload, reopen/prefill, workflow actions, workflow progress diagram, top-right action buttons, View Project modal, child-form loading, applicant name/webmail normalization, and ICSS child calculations. |
| `src/services/apiService.ts` | Yes | Adds ICSS child metadata and composite save API entries. Also points AMC frontend calls to `amc.amc.*` backend methods instead of the old annual-maintenance path. |
| `src/components/forms/DynamicFormRenderer.tsx` | Yes | Makes HTML/section header fields span the full grid width so yellow section headers appear as full-width section bands and fields start below them. This affects dynamic forms generally, so smoke-test other dynamic modules. |
| `src/pages/ProjectDetailsOverview.tsx` | Yes | Adds `Indent cum Sanction` under Purchase applications, lists ICSS records for the selected project, and opens ICSS records through `/indent-cum-sanction-sheet/{name}`. |
| `src/pages/PendingTask.tsx` | Yes | Adds temporary supplemental visibility for ICSS records in `Pending Staff Approval` for R&D staff, until backend module registry/pending-task API includes ICSS natively. |
| `src/pages/PendingTaskDetails.tsx` | Yes | Redirects generic pending-task detail routes for `Indent Cum Sanction Sheet` to the ICSS form/detail page. |

### Current ICSS frontend behavior included in deploy

- Save uses the preferred backend contract: `save_icss_composite_data({ parent, child })`.
- Draft ICSS shows both `Save Draft` and `Submit`; submit saves first and then calls `perform_icss_action(docname, "Submit")`.
- Workflow action buttons are shown in the top-right header card like other modules.
- Workflow diagram is shown for saved ICSS documents and branches to either Dean or Associate Dean based on amount.
- Director stage is shown in the diagram only when amount/account-head thresholds indicate it, but backend Director routing is still pending.
- View Project opens an embedded project preview modal instead of redirecting away from ICSS.
- Proprietary, Standardized, Repair/Replacement, and AMC totals are calculated on the frontend while editing.
- AMC yellow HTML section headers now span the full form width through the shared dynamic renderer.

### Production deployment checklist for current frontend changes

1. Copy or deploy the six frontend files listed above.
2. Confirm backend exposes `save_icss_composite_data`, `get_icss_child_fields`, `get_icss_fields`, `get_icss_workflow_actions`, and `perform_icss_action`.
3. Confirm AMC backend methods exist at `rndopsapp.rndopsapp.doctype.amc.amc.*`.
4. Run the normal frontend build in the production-compatible Node environment.
5. Smoke-test ICSS create, save draft, reopen, submit, staff pending task view, project application listing, View Project modal, and AMC section layout.

### Backend dependencies to verify during deployment

- `Indent Cum Sanction Sheet` DocType fields should be migrated on the target site with `bench migrate`.
- ICSS should appear in the backend pending-task/module registry eventually; the frontend currently has a temporary staff-side fallback for `Pending Staff Approval`.
- Director routing is not complete unless backend implements:
  - Equipment + amount `> 10 lakh` -> `Pending Director Approval`
  - Non-equipment + amount `> 3 lakh` -> `Pending Director Approval`
- Kafka/commit-payment support is still pending unless backend explicitly wires ICSS into `commitPayment.py`.

### Future ICSS change log template

Add a new row here whenever another ICSS-related frontend or backend file is changed.

| Date | Area | File(s) | Change summary | Deploy note |
| --- | --- | --- | --- | --- |
| `2026-05-14` | Frontend | `src/components/CommitPayment.tsx`, `src/pages/application/IndentCumSanctionSheetForm.tsx`, `docs/icss_frontend_details.md`, `docs/icss_po_generation_recommit_implementation.md` | Added Pending PO Generation re-commit flow in the right sidebar, keeping the existing commitment details card as before and adding `Make PO Commitment` below it. Staff/R&D stages a PO commitment with `name = ICSS-DOCNAME-PO`, `frapAppId = ICSS-DOCNAME`, `moduleId = 14`, editable amount, `bill_amount`, staff-entered particulars, and previous ledger `TID` as `refDetails`; `Generate PO` is gated until PO draft save and PO commitment staging are complete. | Backend must publish the staged `ICSS-DOCNAME-PO` commitment to Kafka when the ICSS `Generate PO` workflow action is performed. Smoke-test normal Pending Staff Approval commitment, existing commitment display in Pending PO Generation sidebar, PO re-commit staging, and Generate PO disabled/enabled behavior. |
| `2026-05-13` | Frontend | `src/pages/printformat/po_format.html`, `src/utils/poPrint.ts`, `src/pages/application/IndentCumSanctionSheetForm.tsx` | Added R&D contact details to the ICSS PO PDF letterhead, aligned institute/R&D title on the left and contact details on the right, added the Hindi institute name, moved the indent type note below `PURCHASE ORDER`, and injects the logged-in staff email from session into the letterhead. | Smoke-test ICSS PO preview/download after Staff/R&D login and confirm the second email line shows the logged-in user email and the indent type appears below `PURCHASE ORDER`. |
| `2026-05-12` | Frontend | `src/utils/poPrint.ts`, `src/pages/application/IndentCumSanctionSheetForm.tsx` | PO PDF header now uses the actual ICSS indent type display name for all five indent types, and the main ICSS/child forms are visually marked in slate grey as reference forms during `Pending PO Generation`. | Smoke-test PO PDF preview/download for Proprietary, Standardized, Repair/Replacement, AMC, and Rate Contract. Check Pending PO Generation screen contrast. |
| `2026-05-12` | Frontend | `src/components/forms/DynamicFormRenderer.tsx` | Made Rate Contract P3 certification checkboxes (`certify_authorized_firm`, `certify_current_prices`, `certify_delivery_time`) span the full form width as one checkbox row after another. | Smoke-test ICSS Rate Contract P3 and standalone Rate Contract P3 layouts after Local Supplier Email. |
| `2026-05-12` | Frontend | `src/pages/application/IndentCumSanctionSheetForm.tsx`, `src/pages/application/RateContractForm.tsx` | Hydrates Rate Contract P3 Principal Supplier and Local Supplier display options on draft/reopen by fetching saved supplier docnames and pinning their labels into dropdown options. | Smoke-test Rate Contract P3 fresh save, draft reopen, and Staff/R&D view to ensure supplier names show instead of IDs. |
| `2026-05-12` | Frontend | `src/components/CommitPayment.tsx`, `src/pages/application/IndentCumSanctionSheetForm.tsx` | Added `defaultBudgetHead` support to the shared commitment widget and resolved ICSS Account Head by Budget Head label or ID so Staff R&D Make a Commitment auto-selects the same budget head. | Smoke-test ICSS staff commitment for Recurring/Equipment account heads and verify other modules still default normally. |
| `2026-05-12` | Frontend | `src/pages/application/IndentCumSanctionSheetForm.tsx` | Replaced generic workflow success alert text with module-style ICSS messages for draft save, submit, forward, approve, reject, and PO generation actions. | Smoke-test Save Draft, Submit, Forward/Approve, and Reject alerts. |
| `2026-05-12` | Frontend | `src/pages/application/IndentCumSanctionSheetForm.tsx` | Fixed draft-save reload race by reloading form configuration with the freshly saved ICSS docname. Saved draft values now remain visible immediately after clicking Save Draft. | Deploy with ICSS form changes. Smoke-test new draft save, reopen, and submit-from-draft flow. |
| `2026-05-08` | Frontend | Files listed in this section | ICSS composite save integration, workflow UI, pending-task visibility, project listing, View Project modal, child calculations, and full-width section headers. | Deploy all six frontend files together. Smoke-test shared `DynamicFormRenderer` impact. |
| `YYYY-MM-DD` | Frontend/Backend | `path/to/file` | Short description of what changed. | Any migrate/build/cache/test step needed. |
