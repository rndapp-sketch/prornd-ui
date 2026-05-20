# ICSS Frontend Details

This document captures the current frontend structure and workflow for the `Indent Cum Sanction Sheet` module, including the staff-side budget controls, comments/activity panel, and the Purchase Order generation flow.

## Main Entry Point

- Page: [src/pages/application/IndentCumSanctionSheetForm.tsx](/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/pages/application/IndentCumSanctionSheetForm.tsx)
- Shared PO editor: [src/components/POEditor.tsx](/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/components/POEditor.tsx)
- API bindings: [src/services/apiService.ts](/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/services/apiService.ts)

## Current ICSS Page Structure

The ICSS frontend is built as one main application page with:

- Header area with back navigation, application id, workflow state, project view, workflow actions, and the staff-only `Generate PO` button in the `Pending PO Generation` state.
- Workflow progress bar showing the current state path.
- Parent ICSS form rendered with `DynamicFormRenderer`.
- Indent-type subform rendered dynamically for:
  - `Proprietary Purchase`
  - `Standardized Purchase`
  - `Repair/Replacement`
  - `Annual Maintenance Contract`
  - `Rate Contract`
- Right sidebar for operational actions and audit context.

## Staff / HoS / Approver Side Panel

The right panel currently includes:

- `Status`
- `Project Budget`
- `Latest Activity`
- `Add Comment`
- `Make a Commitment`
- `Record Payment`

These are shown according to the current record, project linkage, workflow state, and role checks already present in the ICSS page.

## Workflow Progress States

The frontend workflow progress tracker now supports the ICSS states below:

1. `Draft`
2. `Pending Staff Approval`
3. `Pending HoS Approval`
4. `Pending Associate Dean` or `Pending Dean Approval`
5. `Pending Director Approval` when the amount/account-head rules require it
6. `Pending PO Generation`
7. `PO Generated`
8. `PO Delivered`

Notes:

- The approval branch is derived from the approval amount and the current workflow state.
- The Director stage is shown conditionally based on amount thresholds and account head rules.
- `Pending PO Generation` and `PO Generated` are now part of the visual workflow timeline.
- The final visual ICSS stage is `PO Delivered`, not `Approved`, because final completion happens only after the signed/generated PO is uploaded.

## Director Approval / Director-Signed PDF Flow

### Business Flow

ICSS Director approval should follow the same offline hardcopy pattern used by the Selection Committee Report director approval flow, adapted to ICSS amount and account-head thresholds.

The intended ICSS flow is:

1. ICSS reaches `Pending Dean Approval`.
2. Backend checks whether Director approval is required.
3. If Director approval is required, Dean sees a `Download PDF` control before approval.
4. Dean downloads the ICSS PDF/form.
5. Dean signs the hard copy and sends it offline for Director approval.
6. Staff/R&D receives the Director-approved scanned copy.
7. Staff/R&D uploads the scanned Director-approved PDF through the Director PDF upload page.
8. Dean sees `View Director PDF` on the ICSS form.
9. Dean clicks `Approve`.
10. ICSS moves to `Pending PO Generation`.

This is separate from the later PO delivery flow:

- `director_signed_pdf` is for Director approval before Dean approval.
- `icss_signed_po_file` is for final PO delivery after `PO Generated`.

Do not reuse the signed PO field for Director approval.

### Director Approval Trigger

Director approval is required when:

- account head is Equipment and amount is greater than `10,00,000`
- any other account head and amount is greater than `3,00,000`

Use the backend ICSS amount helper as the source of truth:

```python
_get_icss_approval_amount(doc)
```

The frontend can mirror this logic for display, but backend must enforce the rule.

### Recommended Workflow Shape

Recommended flow:

```txt
Pending HoS Approval
-> Pending Dean Approval
-> Director signed PDF gate, when threshold applies
-> Pending PO Generation
-> PO Generated
-> PO Delivered
```

For ICSS, Director approval should be implemented as a Dean-stage PDF gate unless Director will actually log in and approve digitally.

That means the document can remain in `Pending Dean Approval` while Staff/R&D uploads the Director-approved PDF. Once the PDF exists, Dean can approve and move the record to `Pending PO Generation`.

### Backend Fields Needed

Add these fields to `Indent Cum Sanction Sheet`:

```json
{
  "allow_on_submit": 1,
  "default": "0",
  "fieldname": "send_to_director",
  "fieldtype": "Check",
  "label": "Send for Director Approval"
}
```

```json
{
  "allow_on_submit": 1,
  "fieldname": "director_signed_pdf",
  "fieldtype": "Attach",
  "label": "Director Signed PDF",
  "read_only": 1
}
```

Optional helper field:

```json
{
  "allow_on_submit": 1,
  "fieldname": "director_approval_required",
  "fieldtype": "Check",
  "label": "Director Approval Required",
  "read_only": 1
}
```

`allow_on_submit` is required because ICSS may already be submitted while moving through workflow states.

### Backend APIs Needed

Add ICSS-specific Director approval endpoints:

```txt
update_send_to_director_icss(docname, send_to_director)
attach_director_pdf_icss(docname, file_url)
get_pending_director_uploads_icss()
```

Expected frontend API bindings:

```ts
updateSendToDirector: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.update_send_to_director_icss`,
attachDirectorPdf: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.attach_director_pdf_icss`,
getPendingDirectorUploads: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.get_pending_director_uploads_icss`,
```

### Backend Approval Guard

Backend must block Dean `Approve` when Director approval is required and `director_signed_pdf` is empty.

The guard belongs inside:

```txt
perform_icss_action(docname, action)
```

before workflow transition is applied.

Expected rule:

```python
if (
    action == "Approve"
    and current_state == "Pending Dean Approval"
    and _is_icss_director_approval_required(doc)
    and not (doc.get("director_signed_pdf") or "").strip()
):
    frappe.throw(
        "Cannot approve: Director approval is required and the "
        "Director-signed PDF has not been uploaded by Staff yet."
    )
```

Only `Approve` should be blocked. Reject, Put Back, Forward, and comments should remain unaffected.

### Dean-Side Frontend Controls

In `IndentCumSanctionSheetForm.tsx`, when:

- user has Dean role
- workflow state is `Pending Dean Approval`
- ICSS crosses the Director threshold

show:

- `Download PDF`
- `Send for Director Approval` checkbox
- `View Director PDF` once `director_signed_pdf` exists

`Send for Director Approval` should be one-way:

- unchecked and enabled initially
- once checked, backend persists `send_to_director = 1`
- then checkbox becomes checked and disabled

Dean `Approve` should be disabled until:

```txt
director_signed_pdf is non-empty
```

Suggested tooltip or inline text:

```txt
Awaiting Director-signed PDF upload by Staff
```

or before checkbox:

```txt
Tick Send for Director Approval first
```

### Staff/R&D Upload Page

The playbook references:

```txt
src/pages/application/DirectorPdfUpload.tsx
```

This file is not present in the current frontend workspace. Before implementation, collect this file from the developer/branch where the Selection Committee Report Director PDF flow was implemented, or recreate it as a shared upload page.

Once available, add ICSS support to that page:

- fetch `icssAPI.getPendingDirectorUploads`
- map ICSS rows into the shared upload card shape
- register `Indent Cum Sanction Sheet` in the attach endpoint map
- call `icssAPI.attachDirectorPdf` after upload
- show existing `director_signed_pdf` and allow replace

### PDF Download

Dean should download the ICSS form using Frappe PDF generation.

Expected URL shape:

```txt
/api/method/frappe.utils.print_format.download_pdf?doctype=Indent%20Cum%20Sanction%20Sheet&name=<ICSS_DOCNAME>&format=Standard&no_letterhead=0
```

If a custom ICSS print format is required, replace `format=Standard` with the print format name.

### MinIO / File Storage

Director-signed PDF should be stored separately from the final signed PO.

Recommended field:

```txt
director_signed_pdf
```

Existing final signed PO field:

```txt
icss_signed_po_file
```

Current MinIO base used by frontend:

```txt
http://172.16.135.118:9000/prod-rnd-files
```

Current MinIO browser base used by backend ICSS signed PO helper:

```txt
http://172.16.135.118:9001/browser/rnd-files
```

Backend should continue using `rndopsapp.minio.get_rnd_file_service()` and store the returned `file_url` on `director_signed_pdf`.

### Acceptance Criteria

1. ICSS below Director threshold works as today.
2. ICSS above Director threshold reaches `Pending Dean Approval`.
3. Dean sees `Download PDF`.
4. Dean can tick `Send for Director Approval`.
5. Dean cannot approve until `director_signed_pdf` is uploaded.
6. Staff/R&D sees the flagged ICSS on Director PDF Upload page.
7. Staff/R&D uploads scanned Director-approved PDF.
8. Dean sees `View Director PDF`.
9. Dean clicks `Approve`.
10. ICSS moves to `Pending PO Generation`.
11. Existing PO generation and final `PO Delivered` flow remains unchanged.

### Missing Files / Inputs To Collect Before Implementation

Collect or confirm these before coding:

- `src/pages/application/DirectorPdfUpload.tsx`
  - Not present in the current frontend workspace.
  - Needed as the shared Staff/R&D page for uploading Director-approved scans.
- Route registration for `/director-pdf-upload`
  - The playbook says it is in `src/main.tsx`; confirm from the branch where SCR flow exists.
- Sidebar entry for Director PDF Upload
  - The playbook says it is in `src/components/RndSidebar.tsx`; confirm/copy from SCR branch.
- SCR frontend reference implementation
  - Current `SelectionCommitteeReportForm.tsx` in this workspace does not show the Director controls from the playbook.
  - Collect the version that contains `showDirectorControls`.
- SCR backend reference implementation
  - Current local backend search did not show `send_to_director` / `director_signed_pdf` in SCR files.
  - Collect the branch/files where those fields and endpoints exist.
- ICSS print format decision
  - Confirm whether Dean should download `Standard` print format or a custom ICSS print format.
- Director upload storage convention
  - Confirm folder naming for Director-approved PDF, for example:
    `Project_Registration/<project>/<indent_cum_sanction_sheet>/director_approval/<file>`
- Final workflow label
  - Confirm backend will use `Pending PO Generation` after Dean approve and `PO Delivered` after final signed PO upload.

## Commitment and Payment Support

ICSS uses the shared commit/payment mechanisms already used in other modules.

- Commitment is shown for active non-draft ICSS records.
- Staff-side forwarding from `Pending Staff Approval` is gated until a commitment exists.
- `Pending PO Generation` has a separate PO-generation re-commit flow in the right sidebar below the normal project/activity/comment cards.
- The PO-generation re-commit uses Kafka staging reference `ICSS-DOCNAME-PO`, keeps `frapAppId` as the original ICSS docname, sends `moduleId: 14`, sends `bill_amount` equal to the entered commit amount, and sends the previous ledger `TID` as `refDetails`.
- The PO-generation `Particulars / Comment` value is taken from the staff-entered input field, not from fixed text.
- Payment is recorded through the shared payment flow.
- Ledger and available amount views are tied to the project reference carried by the ICSS record.

## Activity and Comments

ICSS also uses the common project activity/comment flow.

- `Latest Activity` reads project-linked activity entries.
- `Add Comment` posts comments against the ICSS/project context.
- The sidebar gives users an operational view without leaving the form.

## Purchase Order Flow

### Trigger

When:

- the ICSS workflow state is `Pending PO Generation`
- the logged-in user is `staff, RnD`

the page opens with the PO editor already visible and also shows a header `Generate PO` button for final generation.

### Behavior

The PO editor is reused from the shared `POEditor` component and opens inline on the same ICSS page. This is especially intended for records opened from Pending Tasks, so staff lands directly on the draft-and-generate workspace.

The ICSS PO flow now supports indent-type-specific PO variants:

- `Annual Maintenance Contract` uses AMC-specific default terms and AMC-specific print copy.
- `Rate Contract` uses rate-contract-specific default terms and print copy.
- `Proprietary Purchase`, `Standardized Purchase`, and `Repair/Replacement` currently share the standard/default PO terms and print copy.

This keeps one PO editor flow while allowing the PO content and terms to vary by indent type.

### Staff-Editable PO Fields

The staff user can edit:

- `po_number`
- `po_date`
- `vendor_address`
- `quotation_no`
- `amount_in_words`
- `signee_name`
- `signee_designation`
- `terms_and_conditions`

Important:

- `po_number` is not auto-forced by the frontend.
- `po_date` is also staff-entered and is presented as an editable date field.

### Actions Inside PO Editor

The ICSS PO editor supports:

- `Save`
- `Preview & Print`

The final `Generate PO` action is not inside the editor anymore. It stays in the page header.

### Save Flow

`Save` calls:

- `rndopsapp.rndopsapp.doctype.indent_cum_sanction_sheet.indent_cum_sanction_sheet.save_icss_po_data`

Frontend payload shape:

```json
{
  "docname": "ICSS-DOCNAME",
  "po_data": "{...json stringified po draft...}"
}
```

The frontend also keeps the latest PO draft merged into local ICSS state so the editor can reopen with the saved values.

### Final Generate Flow

The header `Generate PO` button stays disabled until the PO draft has been saved and the PO-generation re-commit has been staged.

`Generate PO` performs:

1. Staff reviews the existing ICSS commitment details and previous ledger `TID`
2. Staff submits the PO-generation re-commit, which creates Kafka Commit Staging
3. Staff saves the draft PO
4. Frontend enables the header `Generate PO` button
5. Staff clicks the header `Generate PO`
6. Frontend calls the ICSS workflow action returned by backend for PO generation
7. Backend should publish the staged PO-generation commitment to Kafka
8. Record moves from `Pending PO Generation` to `PO Generated`
9. Frontend refreshes form/workflow actions

The frontend intentionally separates draft saving from final generation so staff can revise the PO before changing the workflow state. If the draft is edited again after saving, Generate is disabled until the draft is saved again.

## ICSS to PO Seed Mapping

The PO editor is seeded from ICSS data through helper logic in the ICSS form page.

### Common seed fields

- `po_number`
- `po_date`
- `project_no`
- `ss_applicant_name`
- `ss_department_for_purchase`
- `ss_account_head`
- `ss_funding_agency`
- `ss_name_of_firms`
- `ss_file_number`
- `ss_grand_total`
- `vendor_address`
- `vendor_email`
- `quotation_no`
- `signee_name`
- `signee_designation`
- `amount_in_words`
- `terms_and_conditions`
- `ss_payment`
- `ss_delivery`
- `ss_warranty`
- `table_bttk`

### Vendor details by indent type

The current frontend maps vendor/payment/delivery/warranty details based on indent type:

- `Proprietary Purchase`
  - vendor from `pp_supplier_details`
  - email from `pp_supplier_email`
  - payment from `pp_mode_of_payment`
  - delivery from `pp_delivery_period`
  - warranty from `pp_warranty`
- `Standardized Purchase`
  - vendor from `sp_supplier_name_address`
  - email from `sp_supplier_email`
  - payment from `sp_mode_of_payment`
  - delivery from `sp_delivery_period`
  - warranty from `sp_warranty`
- `Repair/Replacement`
  - vendor from `icss_repair_vendor_details`
  - email from `icss_repair_vendor_email`
- `Annual Maintenance Contract`
  - vendor from `icss_amc_service_provider`
  - email from `icss_amc_service_provider_email`
  - payment from `icss_amc_payment_term`
- `Rate Contract`
  - vendor from available vendor/local/principal address fields
  - email from available vendor/local email fields

### Item table mapping

The PO table is currently seeded from `table_qanf` or `icss_items`, mapped into the PO editor row structure.

### PO Variant Copy by indent type

- `Annual Maintenance Contract`
  - AMC-specific header note
  - AMC-specific intro paragraph
  - AMC-specific default terms and conditions
- `Rate Contract`
  - Rate-contract-specific header note
  - Rate-contract-specific intro paragraph
  - Rate-contract-specific default terms and conditions
- `Proprietary Purchase`, `Standardized Purchase`, `Repair/Replacement`
  - shared default purchase-order header note
  - shared default intro paragraph
  - shared default terms and conditions

### Item Table and Amount Summary by indent type

The PO editor and printable PO now also support indent-type-aware item table and amount summary behavior:

- `Annual Maintenance Contract`
  - item table title changes to `Details of AMC Services`
  - simplified AMC-oriented item columns
  - payment term is shown from AMC payment term
- `Proprietary Purchase`
  - item table title changes to `Details of Items to be Purchased`
  - charge summary includes:
    - total estimated basic value
    - packing and forwarding
    - freight
    - other charges
    - grand total
  - payment mode is shown from proprietary purchase fields
- `Standardized Purchase`
  - same item-table family as standard procurement
  - charge summary includes standardized basic value, packing, freight, other charges, and grand total
  - payment mode is shown from standardized purchase fields
- `Rate Contract`
  - item table uses the rate-contract variant
  - charge summary includes rate contract total, packing, and grand total
- `Repair / Replacement`
  - currently uses the shared/default item-table family with repair total fallback

### Prefilled from ICSS by indent type

The `Prefilled from ICSS` panel inside the PO editor now supports sectioned, indent-type-specific data:

- `Common ICSS Details`
  - applicant
  - department
  - account head
  - funding agency
  - project number
  - file number
  - grand total
- `Proprietary Purchase Details`
  - manufacturer
  - supplier details
  - supplier email
  - payment mode
  - delivery period
  - warranty
- `Standardized Purchase Details`
  - manufacturer
  - supplier name/address
  - supplier email
  - reasons not accepted
  - payment mode
  - delivery period
  - warranty
- `Repair / Replacement Details`
  - repair vendor details
  - repair vendor email
  - repair total
- `AMC Details`
  - service provider
  - service provider email
  - AMC payment term
  - AMC total
- `Rate Contract Details`
  - P4 item type
  - selected vendor
  - vendor address
  - vendor email
  - packing
  - rate contract total
  - rate contract grand total

## Director Approval Flow

ICSS now has the same offline Director-signature pattern used by Selection Committee Report:

- Dean sees Director controls only at `Pending Dean Approval` when Director approval is required by the ICSS amount/account-head rule.
- Dean downloads the ICSS PDF from the form, gets the hard copy signed offline, and ticks `Send for Director Approval`.
- Staff, R&D uses `/director-pdf-upload` to upload or replace the scanned Director-signed PDF.
- Dean can view the uploaded Director PDF from the ICSS form.
- The frontend blocks the Dean `Approve` button until the Director-signed PDF exists.
- Backend should also enforce the same block server-side before moving the ICSS forward.

Director threshold rule used by the frontend:

- Equipment account head: amount greater than `10,00,000`
- Any other account head: amount greater than `3,00,000`

## Frontend Files Involved

- [src/pages/application/IndentCumSanctionSheetForm.tsx](/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/pages/application/IndentCumSanctionSheetForm.tsx)
  - workflow progress
  - comments/activity/budget/commitment/payment sidebar
  - PO button visibility
  - ICSS to PO data mapping
  - PO save/generate orchestration
  - Dean-side Director approval controls
- [src/pages/application/DirectorPdfUpload.tsx](/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/pages/application/DirectorPdfUpload.tsx)
  - Staff, R&D upload/replace page for Director-signed ICSS PDFs
- [src/main.tsx](/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/main.tsx)
  - route for `/director-pdf-upload`
- [src/components/RndSidebar.tsx](/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/components/RndSidebar.tsx)
  - Staff, R&D sidebar entry for Director PDF upload
- [src/components/POEditor.tsx](/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/components/POEditor.tsx)
  - editable PO fields
  - terms editor
  - preview/print
  - `Save` and `Generate` actions
- [src/services/apiService.ts](/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/services/apiService.ts)
  - ICSS API endpoint bindings including `savePOData`
  - Director approval endpoints:
    - `updateSendToDirector`
    - `attachDirectorPdf`
    - `getPendingDirectorUploads`
- [src/utils/fileUtils.ts](/home/rndops/Desktop/FRAPPE_UI/prornd-ui/src/utils/fileUtils.ts)
  - MinIO/Frappe file URL resolution for ICSS uploads

## Backend Contract Expected by Frontend

For the current frontend implementation to work cleanly, backend should provide:

- `save_icss_po_data`
  - accepts `docname`
  - accepts `po_data`
  - stores the draft against the ICSS document
- ICSS workflow actions from `get_icss_workflow_actions`
  - must include a PO generation action when the record is in `Pending PO Generation`
- `perform_icss_action`
  - must accept the PO generation action and return the updated workflow state
- `update_send_to_director_icss`
  - accepts `docname`
  - accepts `send_to_director = 1`
  - persists the one-way Director flag
- `get_pending_director_uploads_icss`
  - returns ICSS records where `send_to_director = 1` and `workflow_state = Pending Dean Approval`
  - should include `name`, `workflow_state`, `modified`, `director_signed_pdf`, project/applicant/department/indent type fields
- `attach_director_pdf_icss`
  - accepts `docname`
  - accepts `file_url`
  - stores the scanned PDF URL in `director_signed_pdf`

Recommended backend behavior:

- persist the full PO draft JSON against the ICSS record
- optionally also store flat PO fields like `po_number`, `po_date`, `vendor_address`, and `terms_and_conditions`
- return those values when the ICSS document is reopened so the PO editor can preload the existing draft

## Current Limitation

The PO body/template is shared for all indent types at the moment. Only the seed data changes by indent type/vendor source. This was kept intentionally simple so the workflow can go live first and later be specialized without changing the overall ICSS PO generation flow.
