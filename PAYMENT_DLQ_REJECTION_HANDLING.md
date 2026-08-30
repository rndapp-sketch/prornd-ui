# Payment DLQ rejection handling — frontend follow-up

## Context

Backend investigation (2026-08-29) traced a real incident: two projects
(`2627C-0031-CIEN0793LABO`, `2627C-0042-CIEN0793LABO`) had salary payments
submitted and accepted by Kafka, but rejected minutes later by the ledger's
own `AccountHeadPayment Consumer` with:

> Commit 38/42 is not yet covered by received funds. Earlier commits for
> this account head (in the order they were created) must be funded first.

Root cause: the project had received **zero** funds, despite having a large
commit booked against it. Backend fixes already made in `rndopsapp`:

1. **`submit_payment_data`** (`commitPayment.py`) now checks
   `get_project_available_amounts(project_no)` before creating/publishing a
   salary payment, and returns
   `{"status": "error", "message": "Cannot pay ₹X: project Y only has ₹Z
   available for payment ..."}` if funds aren't there — **before** anything
   is created or sent to Kafka.
2. **`get_account_head_payment_dlq_errors(project_number, budget_head,
   reference_name)`** — new whitelisted function in `commitPayment.py`.
   Returns rows from `Kafka Payment DLQ Log` (the same doctype the admin
   `/kafka_dlq_control` page already reads), each with a `why` field —
   the human-readable rejection reason. Use this to catch the *delayed*
   failure mode: a payment that got a 200 OK at submit time, then was
   rejected by the ledger's async consumer minutes/days later (exactly
   what happened here).
3. `AccountHeadPayment.payment_status` now flips `PENDING` → `REJECTED`
   automatically when a DLQ rejection lands (previously only handled
   `PAID` → `REJECTED`, which never actually happened in practice).

None of this requires "new" frontend work in the sense of a fresh page —
change #1 already surfaces correctly wherever the calling code checks
`msg?.status === "error"`. But that check is missing in two places, and
there's no display yet for the delayed/async case (#2). Both are below.

---

## Fix 1 (bug, do this first): two components silently treat backend errors as success

Two components call `submit_payment_data` and only check for a *raised*
Python exception (`result.exc` / `result.exception`) — they never check the
function's normal `{"status": "error", ...}` return value. So the new
funds-check (and every pre-existing soft error from that endpoint, e.g.
"budget_head is required") gets swallowed: the modal closes and shows
"Payment submitted successfully!" even though the backend just rejected it.

`SalaryModule.tsx:848` already does this correctly — copy that pattern:
```ts
if (msg?.status === "error") throw new Error(msg?.message || "Salary staging failed");
```

### `src/components/PaymentModal.tsx` (`handleSubmitPayment`, ~line 83-86)

Before:
```ts
const result = await response.json();
if (result.exc || result.exception) {
    throw new Error(result.exc || result.exception);
}
onSuccess?.();
```

After:
```ts
const result = await response.json();
if (result.exc || result.exception) {
    throw new Error(result.exc || result.exception);
}
if (result.message?.status === "error") {
    throw new Error(result.message?.message || "Payment submission failed");
}
onSuccess?.();
```

### `src/pages/ProjectDetailsOverview.tsx` (~line 3725-3730, same submit call)

Same change:
```ts
const result = await response.json();
if (result.exc || result.exception) {
    throw new Error(result.exc || result.exception);
}
if (result.message?.status === "error") {
    throw new Error(result.message?.message || "Payment submission failed");
}
// Success - close modal and refresh ledger
```

---

## Fix 2: surface the delayed/async DLQ rejection

This is the harder one to place correctly, because "payment status" is
tracked in **three different places** in this codebase and they don't agree:

| Source | Where it's read | What it reflects |
|---|---|---|
| Ledger's own `paymentStatus` | `Payments.tsx` (`ledgerService.getAllPayments()`) | Only exists if the ledger actually created the payment record. A rejected-before-persisting payment may just be **absent** here, not shown as "rejected". |
| Frappe `AccountHeadPayment.payment_status` | Not currently displayed anywhere in the frontend (only used internally) | This is what the backend fix (#3 above) now correctly flips to `REJECTED`. |
| Salary Staging JSON `status` field per record | `SalaryModule.tsx` (`rec?.payment_status`, ~line 1894/1931) | Set to `PENDING_PUBLISH` at staging time and — separately, as a known existing bug — never gets flipped to anything else afterward, so don't trust it as a signal either. |

Given that, **don't** try to retrofit `Payments.tsx`'s status badge — it's
sourced from the ledger, which won't necessarily reflect this rejection
class of failure the way `getStatusBadge()`/`REJECTED` case would suggest.

**Recommended approach**: add a small, separate "check for rejection" call
using the new endpoint, scoped to what the user is already looking at:

- In `SalaryModule.tsx`, for each `stagingRecords` row (or on-demand when
  the user clicks a row / a "Check status" icon — don't fire one request
  per row on every render), call:
  ```ts
  fetch('/api/method/rndopsapp.rndopsapp.commitPayment.get_account_head_payment_dlq_errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
          project_number: rec?.project_no || rec?.projectNumber,
          budget_head: rec?.budget_head, // or accountHeadId if that's what's on hand
      }),
  })
  ```
  Response shape: `{"status": "success", "data": [{name, error_message, why, project_number, account_head_id, reference_doctype, reference_name, failed_at, creation}, ...]}`.

- If `data.length > 0`, show a red/error badge (mirroring the existing
  amber "Payment Pending" tooltip pattern at `Payments.tsx:765-770`) with
  `title={row.why}` so hovering shows the exact ledger rejection message —
  e.g. "Commit 38 is not yet covered by received funds...".

- Simplest correct trigger point: call it once when the BMR bulk-submit
  modal's results come back (`setPaymentResults` around `SalaryModule.tsx:878`)
  is *not* enough by itself, since this rejection arrives asynchronously,
  possibly minutes after that modal already closed. A periodic poll (e.g.
  on page load / manual refresh button) is the realistic option here —
  there's no push mechanism from Kafka to the browser today.

If you want a lighter first step: just add a "Check for rejection" button
next to each staged row that fires the call on click and shows the result
in a toast/tooltip, rather than building automatic polling. That gets the
information accessible without new background-fetch machinery.