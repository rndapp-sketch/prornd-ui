# Kafka Commit Staging — Frontend Implementation Guide

**Backend change summary:** `submit_commit_data` now accepts two new optional parameters:

| Parameter | Type | Default | Purpose |
|---|---|---|---|
| `trigger_state` | string | `"Approved"` | Workflow state that fires the Kafka publish |
| `moduleId` | int | auto-resolved | Kafka module ID override (e.g. `14` for ICSS PO re-commit) |

Both are stored inside the staging row's `payload` JSON. No schema migration is required for existing modules — they continue to work with no frontend changes.

---

## How It Works

```
Frontend calls submit_commit_data(... trigger_state="Pending PO Generation")
           ↓
Kafka Commit Staging row created with trigger_state in payload
           ↓
Backend on_update fires check_workflow_and_publish for every doc save
           ↓
Reads trigger_state from payload, publishes only when current_state == trigger_state
```

---

## Module Reference

### Modules that need NO change (trigger_state defaults to "Approved")

All existing modules using the `<CommitPayment>` component publish when the workflow reaches **"Approved"**. No prop changes needed.

| Module | File | Trigger State |
|---|---|---|
| Reimbursement | `ReimbursementDetails.tsx:1300` | `Approved` (default) |
| Travel | `TravelDetails.tsx:667` | `Approved` (default) |
| Indent General Form | `IndentGeneralFormDetails.tsx:861` | `Approved` (default) |
| Advance Settlement | `AdvanceSettlementDetails.tsx:873` | `Approved` (default) |
| Top Up Fellowship | `TopUpFellowshipDetails.tsx:359` | `Approved` (default) |
| Recruitment Adhoc Contractual | `RecruitmentAdhocContractualForm.tsx:1406` | `Approved` (default) |
| Disbursal of Honorarium | `DisbursalOfHonorariumDetails.tsx` via `CommitPayment` | `Approved` (default) |
| Disbursal of Consultancy | `DisbursalOfConsultancyDetails.tsx:195` | `Approved` (default) |
| Direct Purchase | `DirectPurchaseDetails.tsx:3823` via `CommitPayment` | `Approved` (default) |
| BudgetActionsSidebar | `BudgetActionsSidebar.tsx:119` | `Approved` (default) |

---

### Indent Cum Sanction Sheet (ICSS) — needs `triggerState` prop

ICSS never reaches "Approved". Its publish trigger is **"Pending PO Generation"**.

#### Step 1: Add `triggerState` prop to `CommitPayment` component

In `CommitPayment.tsx`, add to `CommitPaymentProps`:

```typescript
/** Optional: workflow state that triggers Kafka publish (default "Approved") */
triggerState?: string;
```

Add to the `commitPayload` object inside `handleCommit`:

```typescript
const commitPayload = {
    doctype,
    frapAppId: payloadFrapAppId,
    name: commitReferenceName,
    project_name: projectName,
    commit_amount: amount,
    budget_head: commitHead,
    bmr: bmr || "",
    ...(includeBillAmount ? { bill_amount: amount } : {}),
    ...(moduleId !== undefined ? { moduleId } : {}),
    ...(triggerState ? { trigger_state: triggerState } : {}),   // ← ADD THIS LINE
    ...(refDetails ? { refDetails } : {}),
    commitParticular: normalizedCommitParticular,
};
```

Destructure it in the component function signature:

```typescript
export const CommitPayment: React.FC<CommitPaymentProps> = ({
    ...,
    moduleId,
    triggerState,   // ← ADD
    ...
}) => {
```

#### Step 2: ICSS initial commit — pass `triggerState="Pending PO Generation"`

In `IndentCumSanctionSheetForm.tsx` around line 6125:

```tsx
{showCommitSection && (
  <CommitPayment
    doctype="Indent Cum Sanction Sheet"
    docName={currentDocName}
    projectName={projectCode}
    budgetHeads={budgetHeads}
    defaultBudgetHead={defaultCommitBudgetHead}
    actualBalance={actualBalance}
    billAmount={getIcssApprovalAmount(formData) || undefined}
    triggerState="Pending PO Generation"   {/* ← ADD THIS */}
    onCommitSuccess={() => window.location.reload()}
    onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
  />
)}
```

#### Step 3: ICSS PO re-commit — already correct (no change needed)

The second `<CommitPayment>` at line 6145 already uses `moduleId={14}`.
The PO re-commit is published manually via `manually_publish_staged_commit` after PO data is saved — it does not rely on `trigger_state`.

```tsx
<CommitPayment
  doctype="Indent Cum Sanction Sheet"
  docName={currentDocName}
  stagingReferenceName={poCommitReferenceName}
  frapAppId={currentDocName}
  projectName={projectCode}
  budgetHeads={budgetHeads}
  moduleId={14}   {/* already correct — no trigger_state needed */}
  ...
/>
```

---

## Adding a New Module in the Future

Any new doctype that needs Kafka commit staging:

1. Render `<CommitPayment>` with at minimum `doctype`, `docName`, `projectName`.
2. If the module's publish trigger is `"Approved"` — **no extra props needed**.
3. If the module's publish trigger is a different state (e.g. `"Pending PO Generation"`) — add `triggerState="<state name>"`.
4. If the module needs a specific Kafka module ID override — add `moduleId={<id>}`.

Example for a hypothetical new module with a custom trigger:

```tsx
<CommitPayment
  doctype="My New DocType"
  docName={docName}
  projectName={projectNumber}
  budgetHeads={budgetHeads}
  triggerState="Pending Finance Approval"
  onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
/>
```

That is all that is needed. No backend changes required.

---

## Direct API Call (without CommitPayment component)

For modules that call `submit_commit_data` directly (e.g. `TemporaryAdvanceDetailsView.tsx`, `DisbursalOfConsultancyDetails.tsx`):

```typescript
const response = await submitCommit({
    doctype: "Indent Cum Sanction Sheet",
    frapAppId: icssDocName,
    name: icssDocName,
    project_name: projectCode,
    commit_amount: commitAmount,
    budget_head: selectedHead,
    refDetails: refDetails,
    commitParticular: "ICSS commitment",
    trigger_state: "Pending PO Generation",   // ← add for ICSS
    // moduleId: 14,                           // ← add for PO re-commit
});
```

For all other modules calling the API directly, omit `trigger_state` — it defaults to `"Approved"` on the backend.

---

## Verification

After staging, confirm the payload contains `trigger_state`:

```sql
select name, reference_doctype, reference_name, status, payload
from `tabKafka Commit Staging`
where reference_doctype = 'Indent Cum Sanction Sheet'
  and reference_name = '<ICSS_DOCNAME>'
order by modified desc
limit 5;
```

Expected payload for ICSS initial commit:

```json
{
  "commit_amount": 50000,
  "budget_head": "Recurring",
  "project_name": "26RBSBESP0391XXLS0010",
  "frap_app_id": "2026032401MeiTy000667",
  "trigger_state": "Pending PO Generation"
}
```

Expected payload for ICSS PO re-commit:

```json
{
  "commit_amount": 118000,
  "budget_head": "Recurring",
  "project_name": "26RBSBESP0391XXLS0010",
  "frap_app_id": "2026032401MeiTy000667",
  "moduleId": 14,
  "trigger_state": "Approved"
}
```
