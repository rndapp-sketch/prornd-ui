# Disbursal of Consultancy — Commit → Kafka Publish Flow (UI Implementation)

**Author:** Priyam
**Date:** 2026-03-28
**Branch:** `feature/honorarium-disbursal`

---

## Overview

This document describes the complete frontend implementation of the **Disbursal of Consultancy** module — from a staff member opening their pending task all the way through making a commitment and recording a payment, and how those actions chain into a Kafka publish when the Dean approves.

---

## 1. Routing: How Staff Reaches the Details Page

When a pending task for **Disbursal of Consultancy** appears in any of the task views, the frontend bypasses the generic task detail page and redirects directly to the consultancy details page.

### Files Modified

| File | Change |
|---|---|
| `src/pages/PendingTask.tsx` | View button navigates to `/disbursal-of-consultancy/:id` |
| `src/pages/PendingTaskDetails.tsx` | `useEffect` redirect on `doctype === "Disbursal of Consultancy"` |
| `src/pages/TaskRegistry.tsx` | Row click + View button navigate to `/disbursal-of-consultancy/:id` |
| `src/pages/TaskRegistryDetails.tsx` | `useEffect` redirect on `doctype === "Disbursal of Consultancy"` |

### Redirect Logic (PendingTaskDetails.tsx / TaskRegistryDetails.tsx)

```tsx
useEffect(() => {
    if (doctype === "Disbursal of Consultancy" && name) {
        navigate(`/disbursal-of-consultancy/${name}`, { replace: true });
    }
}, [doctype, name]);
```

### Route Definition (src/main.tsx)

```
/disbursal-of-consultancy/:id  →  DisbursalOfConsultancyDetails
```

---

## 2. Details Page Layout (DisbursalOfConsultancyDetails.tsx)

**File:** `src/pages/application/DisbursalOfConsultancyDetails.tsx`

The page renders in a two-column grid:

```
┌──────────────────────────────────┬───────────────────────┐
│  Read-Only Form  (3/4 width)     │  Sidebar (1/4 width)  │
│  DynamicFormRenderer             │  - Status             │
│                                  │  - Project Budget     │
│                                  │  - Latest Activity    │
│                                  │  - Add Comment        │
│                                  │  - Make Commitment    │
│                                  │  - Commitment Details │
│                                  │  - Record Payment     │
└──────────────────────────────────┴───────────────────────┘
```

Above the grid, workflow action buttons (Forward / Put Back / Approve) are rendered whenever the document is past Draft state.

---

## 3. Workflow Action Buttons (Forward / Put Back)

**Component:** `src/components/DisbursalOfConsultancyActionButtons.tsx`

### How it works

1. On mount, calls `get_disbursal_of_consultancy_workflow_actions` to fetch available actions for the current user and workflow state.
2. Renders one button per available action (e.g., "Approve", "Put Back", "Reject").
3. On click, opens a `CommentModal` with an optional comment field.
4. On confirm, calls `perform_disbursal_of_consultancy_action`.

### API Calls

```
GET  rndopsapp.rndopsapp.doctype.disbursal_of_consultancy
         .disbursal_of_consultancy.get_disbursal_of_consultancy_workflow_actions
     params:  { docname }
     returns: string[]   ← list of available action names

POST rndopsapp.rndopsapp.doctype.disbursal_of_consultancy
         .disbursal_of_consultancy.perform_disbursal_of_consultancy_action
     body:    { docname, action, comment }
```

### Visibility Condition

Buttons are hidden when `workflow_state === "Draft"` — the applicant can still edit the form at that point.

```tsx
{id && formData.workflow_state && formData.workflow_state !== "Draft" && (
    <DisbursalOfConsultancyActionButtons
        docname={id}
        onActionComplete={handleRefresh}
    />
)}
```

---

## 4. Sidebar Sections

### 4.1 Status

Displays the current `workflow_state` as a colored badge and the `modified` timestamp.

| State | Badge Color |
|---|---|
| Draft | Grey |
| Pending ... | Blue |
| Approved | Green |
| Rejected | Red |

### 4.2 Project Budget

Fetches available balance from the Go microservice:

```
GET  rndopsapp.rndopsapp.commitPayment.get_project_available_amounts
     params:  { project_number: formData.disbursal_project_number }
     returns: { data: { availableCommitAmount, availablePaymentAmount } }
```

Displays `availablePaymentAmount` as **Commitable Balance**. Includes a "View Project Ledger" button that opens `ProjectLedgerModal`.

### 4.3 Latest Activity

```
GET  rndopsapp.rndopsapp.api.get_project_activity
     params:  { doctype: "Disbursal of Consultancy", docname: id }
     returns: ActivityItem[]  { owner, creation, content, comment_type }
```

Rendered as a scrollable timeline (max-height 300px).

### 4.4 Add Comment

Textarea + "Submit Comment" button. On submit:

```
POST rndopsapp.rndopsapp.api.add_project_comment
     body: { doctype: "Disbursal of Consultancy", docname: id, content }
```

After success, `handleRefresh()` is called to reload the activity stream.

---

## 5. Make a Commitment

### Visibility Condition

```tsx
(workflow_state === "Pending Staff Approval" || workflow_state === "Approved")
&& isRnDStaff
&& !isCommitted
```

### Role Check

```tsx
const isRnDStaff = roles.some(
    (r) =>
        r === "RnD Staff" ||
        r === "R&D Staff" ||
        r === "staff, RnD" ||
        r === "Hos, RnD (Head of Section, RnD)" ||
        r === "System Manager"
);
```

### UI

```
┌─────────────────────────────┐
│  Make a Commitment          │
│                             │
│  Budget Head  [select ▾]    │
│  Available: ₹ 50,000        │
│                             │
│  Amount (₹) [__________]   │
│                             │
│  [Submit Commitment]        │
└─────────────────────────────┘
```

Budget heads are populated from the Frappe `Budget Head` doctype via `useProjectBudget`.

### Commit API Call

```
POST rndopsapp.rndopsapp.commitPayment.submit_commit_data
Body:
{
    "doctype":       "Disbursal of Consultancy",
    "frapAppId":     "<docname>",
    "name":          "<docname>",
    "project_name":  "<disbursal_project_number>",
    "commit_amount": 25000,
    "budget_head":   "<selected head>",
    "bmr":           "",
    "refDetails":    "<transactionId>"   // only present if re-committing
}
```

### After a Successful Commit

Because consultancy commits are **staged** (the ledger is not updated until Dean approves via Kafka), the ledger API will not return the entry immediately. To prevent the UI from staying stuck on "Make a Commitment", the component stores the commit in local React state:

```tsx
setStagedCommit({ head: commitHead, amount: parseFloat(commitAmount) });
```

`isCommitted` is then true without waiting for the ledger:

```tsx
const isCommitted = !!linkedCommitment || !!stagedCommit;
```

A comment is also auto-posted:

```
POST rndopsapp.rndopsapp.api.add_project_comment
Body: {
    content: "Commitment of ₹ 25,000 under \"Consultancy\" has been sent to the Account Side."
}
```

---

## 6. Commitment Details (shown after commit)

Once `isCommitted === true`, the "Make a Commitment" box hides and "Commitment Details" appears:

```
┌─────────────────────────────────┐
│  Commitment Details             │
│                                 │
│  LINKED COMMITMENT              │
│  Consultancy          ₹ 25,000  │
└─────────────────────────────────┘
```

The data comes from `displayCommitment`, which prefers the live ledger entry and falls back to the staged state:

```tsx
const displayCommitment = linkedCommitment
    ? { head: linkedCommitment.head, committed: linkedCommitment.committed }
    : stagedCommit
      ? { head: stagedCommit.head, committed: stagedCommit.amount }
      : null;
```

`linkedCommitment` is resolved by `useProjectBudget`:

```tsx
const linkedCommitment = budgetData.find(
    (e) => (e.ref === id || e.frapAppId === id) && e.type === "commitment"
);
```

Once Dean approves and Kafka fires, `linkedCommitment` becomes the live source automatically.

---

## 7. Record Payment

### Visibility Condition

Same as Make a Commitment — visible to R&D Staff when `workflow_state` is `"Pending Staff Approval"` or `"Approved"`.

- If `isCommitted === false`: shows a placeholder ("Commitment Required — make a commitment above before recording payment").
- If `isCommitted === true`: shows the payment form.

### UI (when committed)

```
┌───────────────────────────────────────┐
│  Record Payment                       │
│                                       │
│  LINKED COMMITMENT                    │
│  Consultancy                ₹ 25,000  │
│                                       │
│  Payment Amount (₹) [___________]     │
│  Max: ₹ 25,000                        │
│                                       │
│  [Submit Payment]                     │
└───────────────────────────────────────┘
```

### Payment API Call

```
POST rndopsapp.rndopsapp.commitPayment.submit_payment_data
Body:
{
    "doctype":        "Disbursal of Consultancy",
    "name":           "<docname>",
    "project_name":   "<disbursal_project_number>",
    "payment_amount": 25000,
    "budget_head":    "<commitHead>",
    "bmr":            ""
}
```

The Submit Payment button is disabled if `paymentAmount > displayCommitment.committed`.

---

## 8. Auto-Staging on Form Submit (Kafka Pre-requisite)

**File:** `src/pages/application/DisbursalOfConsultancyForm.tsx`

When the applicant clicks **Submit Application**, three calls happen in sequence:

```
1. POST save_disbursal_of_consultancy_data    ← persists the draft
2. POST submit_disbursal_of_consultancy       ← transitions Draft → Pending Approval
3. POST submit_commit_data                    ← stages the commit for Kafka
```

Step 3 is critical. Without it, when Dean approves later, the backend
`perform_disbursal_of_consultancy_action` queries `Kafka Commit Staging` for
`reference_doctype = "Disbursal of Consultancy"` — and finds nothing — so Kafka stays silent.

### Auto-Staging Payload

```
POST rndopsapp.rndopsapp.commitPayment.submit_commit_data
Body:
{
    "doctype":       "Disbursal of Consultancy",
    "frapAppId":     "<docname>",
    "name":          "<docname>",
    "project_name":  "<disbursal_project_number>",
    "commit_amount": <total_disbursal_amount>,    // sum of all rows in details_of_disbursal
    "budget_head":   "Consultancy"               // hardcoded
}
```

`total_disbursal_amount` is computed live in `disbursalTotals`:

```tsx
// Sum of amount_to_be_disbursed across all rows in details_of_disbursal child table
const disbursalTotals = useMemo(() => {
    const rows = formData.details_of_disbursal || [];
    let totalDisbursal = 0;
    rows.forEach((row) => {
        totalDisbursal += parseFloat(row[amtFieldName] ?? 0) || 0;
    });
    return { total_disbursal_amount: parseFloat(totalDisbursal.toFixed(2)), ... };
}, [formData.details_of_disbursal, fields]);
```

This call is **non-fatal** — if it fails, the document is still submitted and the user is navigated to the details page. The failure is logged as a `console.warn`.

---

## 9. Full Sequence Diagram

```
Applicant               Frontend                  Backend              Kafka
─────────────────────────────────────────────────────────────────────────────
Fills form,
clicks Submit
                ─► save_disbursal_of_consultancy_data ─►
                ◄─ { status:"success", docname } ────────

                ─► submit_disbursal_of_consultancy ──────►
                ◄─ { status:"success" } ─────────────────
                   (Draft → Pending Approval)

                ─► submit_commit_data ───────────────────►  insert into
                ◄─ OK ───────────────────────────────────  Kafka Staging DB

─────────────────────────────────────────────────────────────────────────────
R&D Staff
opens pending task
                ─► get_disbursal_of_consultancy_fields ──►
                ─► frappe.client.get ────────────────────►
                ◄─ fields + doc data ────────────────────
                   Sees: "Pending Staff Approval"
                   Sees: "Make a Commitment" box

enters amount,
clicks Submit Commitment
                ─► submit_commit_data ───────────────────►  update staging record
                ◄─ OK ───────────────────────────────────
                setStagedCommit({ head, amount })
                isCommitted = true
                Shows: Commitment Details + Record Payment

─────────────────────────────────────────────────────────────────────────────
Dean
opens pending task,
clicks Approve
                ─► get_disbursal_of_consultancy_workflow_actions ─►
                ◄─ ["Approve", "Put Back"] ───────────────────────

                ─► perform_disbursal_of_consultancy_action ────────►
                                          queries Kafka Staging ────► found
                                          publishes Kafka event ──────────────► Ledger updated
                ◄─ { status:"success" } ──────────────────────────
                   (Pending Dean Approval → Approved)

                ledger API now returns linkedCommitment
                displayCommitment: stagedCommit → linkedCommitment (live)
```

---

## 10. Why stagedCommit Was Needed

For **Honorarium**, `submit_commit_data` writes directly to the ledger. After the staff commits, the ledger API immediately returns the entry → `linkedCommitment` is found → `isCommitted = true` → "Commitment Details" and "Record Payment" appear.

For **Consultancy**, `submit_commit_data` only writes to `Kafka Commit Staging`. The ledger is not updated until the Dean approves. Without `stagedCommit`:

- Staff clicks "Submit Commitment" → success response received
- Page reloads → `linkedCommitment` is still `null` (ledger untouched)
- `isCommitted = false` → "Commitment Details" and "Record Payment" never show

The fix tracks the commitment locally so the UI is correct before the ledger catches up:

```tsx
// State declaration
const [stagedCommit, setStagedCommit] = useState<{ head: string; amount: number } | null>(null);

// Computed flags
const isCommitted     = !!linkedCommitment || !!stagedCommit;
const displayCommitment = linkedCommitment
    ? { head: linkedCommitment.head, committed: linkedCommitment.committed }
    : stagedCommit
      ? { head: stagedCommit.head, committed: stagedCommit.amount }
      : null;

// Set after successful submitCommit (no page reload)
setStagedCommit({ head: commitHead, amount: parseFloat(commitAmount) });
```

---

## 11. Key Files Reference

| File | Purpose |
|---|---|
| `src/pages/application/DisbursalOfConsultancyForm.tsx` | Applicant form: save, submit, auto-stage commit |
| `src/pages/application/DisbursalOfConsultancyDetails.tsx` | Staff/Dean details view: all sidebar sections |
| `src/components/DisbursalOfConsultancyActionButtons.tsx` | Forward / Put Back / Approve action buttons |
| `src/services/apiService.ts` | `disbursalOfConsultancyAPI` endpoint constants |
| `src/hooks/useProjectBudget.ts` | Fetches ledger data, resolves `linkedCommitment` |
| `src/pages/PendingTask.tsx` | Pending task list: navigates to details page |
| `src/pages/PendingTaskDetails.tsx` | Generic task detail: redirects consultancy tasks |
| `src/pages/TaskRegistry.tsx` | Task registry list: navigates to details page |
| `src/pages/TaskRegistryDetails.tsx` | Generic registry detail: redirects consultancy tasks |
