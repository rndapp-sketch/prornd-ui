# ICSS Pending PO Generation Re-Commit Implementation Plan

## Requirement Summary

During `Pending PO Generation`, Staff/R&D must make a second commitment before the final `Generate PO` action is allowed.

This re-commit should reuse the same visual UI/UX as the existing `Make a Commitment` card shown during `Pending Staff Approval`, but with PO-generation-specific linking:

- Show the existing commitment details already made earlier in the ICSS flow.
- Use the earlier commitment's `FRAP App ID` to locate the previous ledger entry.
- Fetch the previous ledger `TID` and send it as `refDetails` in the new commitment.
- Use the current PO/ICSS grand total as the default commit amount.
- Keep the commit amount editable.
- Send `moduleId` as `14` for the ICSS PO-generation re-commit.
- Disable `Generate PO` until the PO-generation commitment is completed.
- On `Submit PO Commitment`, first send/create the record in Kafka Commit Staging.
- Publish the already-staged PO-generation re-commit to Kafka only when Staff/R&D clicks `Generate PO`.

## Current Frontend State

### Main Files

- `src/pages/application/IndentCumSanctionSheetForm.tsx`
- `src/components/CommitPayment.tsx`
- `src/components/ProjectLedgerModal.tsx`
- `src/services/apiService.ts`

### Existing Commitment Behavior

`CommitPayment` currently:

- checks `Kafka Commit Staging` by `reference_name = docName`
- if a staging record exists, it shows a read-only `Commitment Details` card
- if no staging record exists, it shows the commitment form
- submits commitment through:

```txt
rndopsapp.rndopsapp.commitPayment.submit_commit_data
```

For normal ICSS staff approval, the page calls:

```tsx
<CommitPayment
  doctype="Indent Cum Sanction Sheet"
  docName={currentDocName}
  projectName={projectCode}
  budgetHeads={budgetHeads}
  defaultBudgetHead={defaultCommitBudgetHead}
  actualBalance={actualBalance}
  billAmount={getIcssApprovalAmount(formData) || undefined}
/>
```

### Current Generate PO Gate

`Generate PO` is currently gated only by saved PO draft:

```txt
Generate PO enabled when isPoDraftSaved === true
```

Target behavior should become:

```txt
Generate PO enabled when isPoDraftSaved === true AND PO re-commit exists
```

## Important Constraint

The first ICSS commitment and the PO-generation re-commit cannot share the exact same staging reference blindly.

Reason:

- `CommitPayment` checks staging by `reference_name = docName`
- the first commitment already uses the ICSS `currentDocName`
- if the PO-generation card also uses the same `docName`, it will only show the old commitment details and block the new re-commit form

So the PO-generation commitment needs a distinct staging/reference identity while still linking to the same ICSS application.

Recommended frontend reference:

```txt
reference_name / name: `${currentDocName}-PO`
frapAppId: currentDocName
doctype: Indent Cum Sanction Sheet
```

This lets Kafka staging distinguish:

- original ICSS commitment: `reference_name = currentDocName`
- PO-generation re-commit: `reference_name = currentDocName-PO`

But both remain related to the same ICSS application through `frapAppId = currentDocName`.

## Proposed UI Design

In `Pending PO Generation`, keep the PO editor in the main `PO Generation` tab and put the commitment controls in the right sidebar below the existing project budget, latest activity, and add comment cards:

1. Show the normal existing commitment details card exactly like the earlier flow.
2. Show `Make PO Commitment` below the existing commitment details using the same `CommitPayment` component style.
3. Keep the `Purchase Order Editor` in the main PO tab.
4. Keep the existing payment/other sidebar behavior unchanged.
5. Keep the header `Generate PO` button disabled until:
   - PO draft is saved
   - PO-generation commitment is staged/found

Suggested visual order:

```txt
Workflow Progress
Tabs
PO Generation tab
  Purchase Order Editor
Right sidebar
  Project Budget
  Latest Activity
  Add Comment
  Existing Commitment Details
  Make PO Commitment
Header
  Generate PO button disabled until PO draft saved + PO commitment done
```

## Data Flow

### Step 1: Find Existing ICSS Commitment

Use the existing project ledger fetch pattern:

```txt
/ledger-api/commit-payment-transactions?projectNumber=<projectCode>&accountHeadId=<budgetHead>
```

Find previous commitment using:

```ts
entry.frapAppId === currentDocName
```

Fallback matches can include:

```ts
entry.ref === currentDocName
entry.refDetails === currentDocName
```

The existing commitment card should show:

- `FRAP App ID`
- `TID`
- `Budget Head`
- `Commit Amount`
- `Ref Details`
- `Status`

### Step 2: Resolve Previous TID

From the previous ledger entry:

```ts
previousTid = entry.transactionId
```

This value must be passed in the new commitment payload as:

```txt
refDetails = previousTid
```

This is the link between the first commitment and the PO-generation re-commit.

### Step 3: Prefill Current Commit Amount

Default amount should be the current grand total:

Recommended order:

```ts
poDraftData.grand_total
poDraftData.ss_grand_total
formData.pp_grand_total
formData.sp_grand_total
formData.rr_grand_total
formData.amc_grand_total
formData.rate_contract_grand_total
formData.grand_total
getIcssApprovalAmount(formData)
```

For AMC, use the PO AMC grand total when available because staff may edit AMC service totals during PO generation.

The amount remains editable in the UI.

### Step 4: Submit PO Re-Commit

The new commitment payload should include:

```json
{
  "doctype": "Indent Cum Sanction Sheet",
  "name": "ICSS-DOCNAME-PO",
  "frapAppId": "ICSS-DOCNAME",
  "project_name": "PROJECT-NO",
  "commit_amount": 12345,
  "bill_amount": 12345,
  "budget_head": "BUDGET HEAD",
  "moduleId": 14,
  "refDetails": "PREVIOUS_LEDGER_TID",
  "commitParticular": "STAFF_ENTERED_PARTICULARS_INPUT"
}
```

Notes:

- Clicking `Submit PO Commitment` should call `submit_commit_data` and create/update the Kafka Commit Staging record first.
- `bill_amount` should be the current commit amount.
- `moduleId` should be sent as `14`.
- `refDetails` should be the previous committed data TID.
- `commitParticular` must come from the `Particulars / Comment` input field entered by Staff/R&D.
- Do not send a fixed hardcoded particulars value like `PO generation commitment for ICSS ...`.
- `frapAppId` should preserve the ICSS application ID for traceability.
- `name` / staging reference should be unique for PO-generation re-commit.

## Required Frontend Changes

## 1. Extend `CommitPayment`

File:

```txt
src/components/CommitPayment.tsx
```

Add optional props:

```ts
stagingReferenceName?: string;
frapAppId?: string;
forcedRefDetails?: string;
includeBillAmount?: boolean;
title?: string;
submitLabel?: string;
description?: string;
moduleId?: number;
```

Behavior:

- staging check should use `stagingReferenceName || docName`
- submit payload should use:
  - `name: stagingReferenceName || docName`
  - `frapAppId: frapAppId || docName`
  - `refDetails: forcedRefDetails || parentAppId ledger lookup result`
  - `bill_amount: amount` when `includeBillAmount` is true
  - `moduleId` from prop, with ICSS PO-generation passing `14`
  - `commitParticular: commitParticular.trim() || undefined` from the component input field
- title should default to `Make a Commitment`
- submit button should default to `Submit Commitment`

This keeps all existing modules working without changing their current props.

## 2. Add PO Re-Commit State in ICSS Form

File:

```txt
src/pages/application/IndentCumSanctionSheetForm.tsx
```

Add state:

```ts
const [isPoCommittedForGate, setIsPoCommittedForGate] = useState(false);
const [previousIcssCommitment, setPreviousIcssCommitment] = useState(null);
const [previousIcssCommitmentTid, setPreviousIcssCommitmentTid] = useState("");
```

Add derived values:

```ts
const poCommitReferenceName = currentDocName ? `${currentDocName}-PO` : "";
const poCommitAmount = getCurrentPoGrandTotal(poDraftData, formData);
```

## 3. Fetch Existing Commitment Details

Use the ledger endpoint with project number and selected/default budget head.

Find the previous commitment:

```ts
const previousCommitment = entries.find(
  (entry) => entry.frapAppId === currentDocName
);
```

Store:

```ts
setPreviousIcssCommitment(previousCommitment);
setPreviousIcssCommitmentTid(String(previousCommitment.transactionId || ""));
```

If not found:

- show a warning card
- keep PO re-commit submit disabled
- keep `Generate PO` disabled

## 4. Render PO Re-Commit UI

Inside the right sidebar, after the existing commitment details card, render:

```tsx
<CommitPayment
  doctype="Indent Cum Sanction Sheet"
  docName={currentDocName}
  stagingReferenceName={poCommitReferenceName}
  frapAppId={currentDocName}
  projectName={projectCode}
  budgetHeads={budgetHeads}
  defaultBudgetHead={defaultCommitBudgetHead}
  actualBalance={actualBalance}
  billAmount={poCommitAmount || undefined}
  forcedRefDetails={previousIcssCommitmentTid}
  includeBillAmount
  moduleId={14}
  title="Make PO Commitment"
  submitLabel="Submit PO Commitment"
  description="This commitment links to the earlier ICSS commitment TID and must be completed before Generate PO."
  onStagingStatusChange={(committed) => setIsPoCommittedForGate(committed)}
/>
```

## 5. Stage On Commit, Publish On `Generate PO`

The PO-generation re-commit has two separate steps:

1. `Submit PO Commitment` sends the commitment to Kafka Commit Staging.
2. `Generate PO` publishes that staged commitment to Kafka.

So the PO-generation re-commit should be staged when Staff/R&D submits the commitment form, but it should be published to Kafka only when `Generate PO` is clicked.

Expected sequence:

```txt
1. Staff/R&D opens ICSS at Pending PO Generation
2. Staff/R&D submits PO re-commit
3. Frontend confirms PO re-commit staging exists
4. Staff/R&D saves PO draft
5. Staff/R&D clicks Generate PO
6. Backend workflow moves ICSS forward and publishes the staged PO-generation commitment to Kafka
```

Frontend responsibility:

- call `submit_commit_data` when Staff/R&D clicks `Submit PO Commitment`, so the PO re-commit exists in Kafka Commit Staging
- gate `Generate PO` until PO re-commit staging exists
- call the normal `Generate PO` workflow action
- do not independently publish to Kafka from frontend unless backend gives a dedicated publish endpoint

Backend responsibility:

- `submit_commit_data` should create/update the Kafka Commit Staging record on `Submit PO Commitment`
- when `Generate PO` is performed, publish the staged PO-generation commitment to Kafka
- publish the staging record identified by `reference_name = ICSS-DOCNAME-PO`
- include `moduleId = 14`
- include `bill_amount = commit_amount`
- include `ref_details = previous ledger TID`

## 6. Gate `Generate PO`

Update header button condition:

Current:

```tsx
disabled={!isPoDraftSaved || isActionLoading}
```

Target:

```tsx
disabled={!isPoDraftSaved || !isPoCommittedForGate || isActionLoading}
```

Update tooltip:

```txt
Save the PO draft and submit PO commitment to enable final generation
```

Update `handleGeneratePo` guard:

```ts
if (!isPoCommittedForGate) {
  throw new Error("Please submit the PO commitment before generating PO.");
}
```

## Backend/API Assumptions To Confirm

Backend should confirm whether `submit_commit_data` accepts and stores:

- `name` as staging reference
- `frapAppId`
- `bill_amount`
- `moduleId`
- `refDetails`

If backend currently derives `reference_name` only from `frapAppId`, backend must be updated to allow a distinct staging reference for PO-generation re-commit.

Required backend-compatible behavior:

```txt
Kafka Commit Staging reference_name = name
Payload frap_app_id = frapAppId
Payload moduleId = 14
Payload bill_amount = commit_amount
Payload ref_details = previous ledger TID
```

Backend should also confirm that the ICSS `Generate PO` workflow action publishes the staged PO-generation commitment to Kafka.

## Acceptance Criteria

1. At `Pending Staff Approval`, normal ICSS commitment continues to work exactly as today.
2. At `Pending PO Generation`, Staff/R&D sees previous commitment details.
3. The previous commitment TID is resolved from ledger and used as `refDetails` for the PO re-commit.
4. PO re-commit amount defaults to current grand total and remains editable.
5. PO re-commit sends `bill_amount` equal to the entered commit amount.
6. PO re-commit sends `moduleId` as `14`.
7. `Generate PO` remains disabled until:
   - PO draft is saved
   - PO re-commit is staged/found
8. Clicking `Generate PO` publishes the staged PO-generation commitment to Kafka.
9. Existing modules using `CommitPayment` are not affected.
10. If previous TID is missing, UI clearly tells Staff/R&D to verify the original commitment/ledger entry.

## Files Expected To Change After Approval

```txt
src/components/CommitPayment.tsx
src/pages/application/IndentCumSanctionSheetForm.tsx
docs/icss_frontend_details.md
ICSS_BACKEND_HANDOFF.md
```

Optional, only if API mapping is needed:

```txt
src/services/apiService.ts
```

## Suggested Implementation Order

1. Extend `CommitPayment` props in a backward-compatible way.
2. Add ICSS helper to calculate current PO commit amount.
3. Fetch and render previous commitment details in Pending PO Generation.
4. Render the second commitment card with unique staging reference.
5. Gate `Generate PO` by PO draft saved + PO re-commit complete.
6. Coordinate backend publish-on-Generate-PO behavior for the PO re-commit staging record.
7. Update frontend documentation and handoff changelog.
8. Smoke-test:
   - existing Pending Staff Approval commitment
   - Pending PO Generation re-commit
   - Generate PO disabled/enabled behavior
   - ledger TID in `refDetails`
   - `moduleId = 14`
   - Kafka publish after clicking `Generate PO`
   - amount edit before submit
