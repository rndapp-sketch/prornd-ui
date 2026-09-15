# Comment Module Implementation

Documents the work done to standardize how workflow-action comments (Submit / Approve / Reject / Forward / Put Back / Process / etc.) are captured and persisted across the app, and how the Activity Log surfaces them.

Scope: every form/page with a workflow-action comment popup, **except Project Registration** (`ProjectRegistration.tsx`, `UniversalRegistrationForm.tsx`), which was explicitly left untouched.

## 1. The problem

Comments typed into action-confirmation popups were being handled inconsistently:

- Some forms sent the comment only as a `comment` kwarg to the custom backend workflow-action method, trusting that method to persist it. Several of those backend methods don't actually save it anywhere, so the comment silently disappeared (e.g. Proforma Invoice, Advance Settlement, Direct Purchase, Temporary Advance, and others).
- One flow (Temporary Advance's auto-submit-after-create path) posted the comment via a raw `fetch` to `frappe.desk.form.utils.add_comment` instead of the app's own comment API.
- Passing `comment` inline to the workflow-action endpoint also caused some backends to stamp the comment onto the **workflow transition log** itself (e.g. showing up as `[Approve] test comment` under "updated the workflow" in the Activity Log), instead of as a clean, separate "commented" entry.
- Comment fields were optional everywhere, so approvers could forward/approve/reject documents with no explanation at all.
- The Proforma Invoice fix initially used the wrong DocType name (`"Proforma Invoice"` instead of the real `"Proforma_Invoice"`), which made `frappe.get_doc()` throw inside the comment API and fail silently.

## 2. The standard pattern

Every fixed call site now follows this shape:

```ts
const { call: performAction } = useFrappePostCall(<doctype-specific action endpoint>);
const { call: addComment } = useFrappePostCall(
  "rndopsapp.rndopsapp.api.add_project_comment",
);

const handleConfirmAction = async (comment: string) => {
  await performAction({ docname, action });   // no `comment` kwarg sent here
  if (comment.trim()) {
    try {
      await addComment({ doctype: "<Exact DocType Name>", docname, content: comment.trim() });
    } catch {
      // comment failure is non-fatal — the workflow action itself already succeeded
    }
  }
};
```

Key rules:

- **Never pass `comment` to the workflow-action/submit/put-back endpoint.** That's what caused comments to get baked into the workflow transition log instead of showing as a normal comment. `add_project_comment` is the only path that should carry the comment text.
- **`add_project_comment` calls `doc.add_comment("Comment", ...)`** server-side (`rndopsapp/rndopsapp/api.py`), which is a genuine Frappe Comment — this is what makes it render as a "commented" activity entry instead of a workflow entry.
- **The DocType name passed must be the exact registered name**, which is not always the human-readable label used elsewhere in the UI (e.g. Proforma Invoice's real DocType is `Proforma_Invoice`, not `"Proforma Invoice"`). Always cross-check against an existing `FloatingActivityLogButton doctype="..."` or `frappe.client.get` call already in the same file before trusting a literal string.
- **Comment is now mandatory**, not optional, on every in-scope popup: the Confirm/Submit button is disabled and a "Comment is required." hint is shown until the textarea is non-empty.

## 3. Files touched

### Shared `CommentModal` component consumers
Passed `requireComment` (the component already supported this prop):
- `ResignationActionButtons.tsx`, `TravelActionButtons.tsx`, `TADASettlementActionButtons.tsx`
- `ProjectStaffJoiningForm.tsx`, `ProjectStaffExtensionForm.tsx`, `P11Form.tsx`
- `DirectPurchase.tsx`

### Local/inline `CommentModal` implementations
Added `add_project_comment` wiring, removed inline `comment` kwarg from the action call, and enforced required-comment validation:
- `DisbursalOfConsultancyActionButtons.tsx`, `DisbursalOfHonorariumActionButtons.tsx`
- `IndentGeneralFormActionButtons.tsx`, `TopUpFellowshipActionButtons.tsx`
- `LeaveModuleActionButtons.tsx` (custom dialog, not the shared component)
- `ReimbursementDetails.tsx`, `AdvanceSettlementDetails.tsx` (previously dropped the comment entirely)
- `TemporaryAdvanceDetails.tsx` (both the manual action-confirm flow and the auto-submit-after-create flow, which was using the wrong raw `frappe.desk.form.utils.add_comment` fetch)
- `TemporaryAdvanceActionButtons.tsx` (same raw-fetch bug, fixed the same way)
- `TemporaryAdvance.tsx` (draft submit modal)
- `DirectPurchaseDetails.tsx` (three duplicated modal blocks)
- `ProInvForm.tsx` (fixed the wrong-doctype-name bug: `Proforma_Invoice`, not `Proforma Invoice`)
- `RecruitmentAdhocContractualForm.tsx`, `FundReceivedDetails.tsx`, `FundDetails.tsx`
- `PendingTaskDetails.tsx`, `ProjectDetailsOverview.tsx`
- `LoanRequestActionButtons.tsx`, `MiscellaneousCommitActionButtons.tsx`
- `IndentCumSanctionSheetForm.tsx` (the reference "already correct" implementation — comment was still optional there, made required for consistency)
- `LoanSettlementDetails.tsx` — special case: comment lives in a dedicated `remarks` field rather than a popup. Made `remarks` required for both Process and Reject, and persisted it via `add_project_comment` in addition to the doctype's own `remarks` field.
- `CancellationModal.tsx` — persists the cancellation reason via `add_project_comment` too (already required a minimum length, unrelated to this fix).
- `MiscellaneousCommitDetails.tsx` — the Draft → Submit action (shared by both Commit and Decommit type records) previously had no comment capture at all; added a required-comment modal before submit.

### Already correct, no change needed
`ProjectDetails.tsx` already required the comment and used `add_project_comment` correctly.

## 4. Activity Log filter

`FloatingActivityLogButton.tsx` now has two tabs above the activity list:
- **Comments** (default) — shows `creation` and `comment` entries only.
- **All** — shows every entry type (edits, workflow transitions, info, cancellation, etc.), unchanged from before.

`ActivityLog.tsx`'s `onlyComments` prop was widened to include `creation` entries alongside `comment` entries (previously comment-only), since "when was this created" is useful context in the default comments view.

## 5. Known out-of-scope item

The backend Python methods that receive `comment`/`remarks` kwargs (e.g. `process_proforma_action`, `perform_temporary_advance_action`) were not modified — this frontend repo doesn't contain the deployed `rndopsapp` backend source. If a backend method still independently writes something into the workflow comment log regardless of what the frontend sends, that would need a backend-side fix outside this repo.
