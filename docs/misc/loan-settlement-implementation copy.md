# Loan Settlement (via Fund Received) — Implementation Plan

Status: **Implemented and verified end-to-end.** Publishing to `loan-settlement-events` confirmed against the live topic; backend regression 8/8 passing.

**What this covers, at a glance:**

| Area | Where |
|---|---|
| Modal listing a project's unsettled loans; settlement is **mandatory** | §1.5, §6 |
| Full / Partial per loan, with a **head-wise return** against the loan's budget heads | §1.4a, §4a |
| Revising a settlement after the fact (**Edit**) | §1.5a, §5.2c |
| Fund Received validated — and for all-Partial settlements, prefilled and **locked** — against the settlement | §1.8a, §5.2a, §5.2b |
| `Loan Settlement` + `Loan Settlement Budget Breakup` DocTypes, own workflow | §4, §4a, §9 |
| Kafka payload, incl. `loanSettlementBudgetBreakupDetails` and `fundReceivedRefNumberFap` | §7.3, §7.5 |
| Failure handling: publish status, retry, graceful degradation when the ledger is down | §5.1, §10 |

**Outstanding, needs the Accounts team:** settlements published before `fundReceivedRefNumberFap` was added carry no receipt reference, and because `loanSettlementNumber` is an idempotency key, re-publishing will not fix them — any that matter must be corrected directly in Accounts.

## 1. Requirement (current — modal-based flow, supersedes the earlier reminder-note version)

1. When a project that **has an existing loan** receives a new **Fund Received** application, show a **modal** (not a passive reminder banner) listing the loan(s) and their details, asking for settlement.
2. The modal has **"Settle the Loan"** (and, when re-opened via Edit, **"Keep Existing"**). *"Settle Later" was removed — see 5 and 5a.*
3. If the project has **multiple loans**: the modal lists every active loan with its own checkbox, plus a **"Select All"** checkbox. The user can check one, several, or all.
4. For **each checked loan**, ask **Full or Partial** settlement; if **Partial**, ask for the **amount** (validated against that loan's outstanding balance) — i.e. the full/partial question is asked once per selected loan, not once for the whole batch.
4a. Choosing Full or Partial opens that loan's **budget heads**, showing how much of the loan was drawn against each, alongside a **return amount** per head:
   - **Full** → the whole outstanding is filled in across all heads automatically, read-only (see §4a.1 on how it is split).
   - **Partial** → the user enters the **total** first, then the return against each head; the two must agree before "Settle the Loan" enables.
5. ~~**"Settle Later"** → dismiss the modal, no settlement data recorded, proceed straight to filling/submitting Fund Received exactly as today.~~ **Removed.** Settlement is now **mandatory**: if the project has an unsettled loan it must be settled from this receipt, so the modal offers no way past it. The button is deleted rather than hidden — the `onDefer` path is gone entirely, so there is no route to a Fund Received that skips an outstanding loan. *(Restoring it later means re-adding the button and its `onDefer` handler; nothing else depends on it.)*
5a. **Revising a settlement — the "Edit" button.** Once the modal is resolved the user is filling in the receipt, and may only then notice the amount is wrong. An **Edit** button sits next to *Fund Received Amount* (and on the settlement banner) and re-opens the modal with their previous choices restored.
   - Saving **creates fresh settlement docs and discards the old ones** — never an in-place edit. `loanSettlementNumber` is an idempotency key (§7.4), so revised figures must travel under a new settlement number; reusing a doc would mean the correction is silently skipped on the Accounts side.
   - **Order matters: save first, discard second.** A failed save then leaves the previous settlement intact, rather than stranding the user with none — which, now that settlement is mandatory, would be a hole straight through the requirement. A failed *discard* is swallowed: the leftovers are unlinked, never-published drafts, i.e. inert clutter, and far better than failing an edit the user already made successfully.
   - The previous requirement is **backed out of the form** before the new one is applied (`applySettlementRequirements(req, prevReq)`), so a head dropped from the settlement — or an amount revised downwards — doesn't leave its old money sitting in the Budget Breakup. Anything the user added *on top* of the requirement is preserved.
   - In edit mode only, a **"Keep Existing"** button closes the modal without changing anything. This is not "Settle Later" returning by the back door: a settlement already exists at that point.
6. **"Settle the Loan"** (after selecting ≥1 loan and resolving Full/Partial + amount for each) → the settlement selections are **saved to the new Frappe DocType first** ("save it to our backend doctype"), *before* Fund Received is submitted.
7. The loan-settlement data is **published to the Accounts service's `loan-settlement-events` Kafka topic** — separate from Fund Received's own topic. **Fund Received's own topic/payload structure does not change at all.**
8. Topic payload fields (one Kafka message per settled loan): `loanNumber, projectNumber, loanSettlementNumber, frapAppId, fundReceivedRefNumberFap, settlementAmount, settlementDate, settlementMode, remarks, settlementStatus`, plus `loanSettlementBudgetBreakupDetails[]` — the head-wise return, each row `{accountHeadId, amount}`.
8a. The **Fund Received must be able to fund the settlement**, and is checked against it on submit:
   - **Full** → `Fund Received Amount` must be **≥** the outstanding being settled, and the Budget Breakup must credit **≥** the return amount to each head. A receipt that clears a loan is usually larger than the loan; the excess is ordinary project funding.
   - **Partial** → `Fund Received Amount` is **fixed at** the total entered in the modal and rendered **non-editable**, and the Budget Breakup is pre-filled with the head-wise split, also non-editable. The user already stated exactly what is coming in and where it goes.
9. **`staff, RnD`** fills in **remarks** and picks a **settlement mode** (`Physical` / `PFMS` / `Offline` / `Online`) **on the Fund Received page itself**, then Forwards.

> ⚠️ **Publish timing (final).**
> Settlements are published when **staff, RnD Forwards the Fund Received** — the `Pending Misc. Staff Approval → PENDING_APPROVAL` transition, i.e. the exact moment Fund Received publishes its own event.
>
> Staff enter `settlementMode` and `remarks` **inline on the Fund Received page** (in the "Loan Settlement(s) Requested" card) before Forwarding, so the payload is complete in a single message. This matters because the Accounts service treats `loanSettlementNumber` as an **idempotency key** — a later "update" publish would be silently skipped, never applied (§7.4). Forward is blocked until every pending settlement has a mode selected.
>
> *(An earlier draft published on a separate `Pending Staff Processing → Processed` action on a standalone page; that page still exists for detail view + Retry Publish, but is no longer the primary path.)*
10. **Fund Received itself needs no other changes** — nothing about its own fields, workflow, or Kafka payload changes; "for Fund Received which doesn't have [a loan], nothing is required to change."

## 2. Current state (verified in code)

- **Fund Received form**: `src/pages/AddFundReceived.tsx` — a custom (non-`DynamicFormRenderer`) form. The project is known from the URL (`projectName`/`project_no` params) before any field renders, and there's already a precedent for a project-scoped lookup on mount: `useFrappeGetCall("...fund_sanction.get_sanctions_for_project", { project_name: projectName })` populates a "Sanction Details" sidebar panel. The new loan-modal's data fetch follows the identical pattern.
- **A blocking-modal precedent already exists in this codebase**: `TravelForm.tsx`'s `ImportantTravelNotice` (added this session) is a bespoke `createPortal`-based modal that blocks the entire form behind an Accept action until dismissed. The Loan Settlement modal should follow this exact same pattern/styling — no generic `Modal`/`Dialog` wrapper exists in this codebase (confirmed earlier), every modal here is bespoke.
- **Fund Received submit flow**: `submit_fund_received(docname, save, doc_data, ...)` → `save_fund_received()` → `perform_fund_received_action(docname, "Submit")`, in `rndopsapp/rndopsapp/doctype/fund_received/fund_received.py`. The actual Kafka publish is here:
  ```python
  # fund_received.py ~line 910
  if next_state == "PENDING_APPROVAL":
      success = publish_fund_received(doc)   # dedicated Fund Received producer
  ```
  This is the **only** place Fund Received's own Kafka publish fires, and this is the "submitted and published by staff, RnD" moment referred to in requirement §1.7 — Fund Received is filled in and submitted by `staff, RnD` themselves in this app. Nothing here was modified — the Loan Settlement publish sits as an **independent, separately try/excepted call immediately after** this block (§5.4, part b), so a failure in the new code path can never affect or roll back Fund Received's own publish.
- **Loan Request doctype** (`rndopsapp/rndopsapp/doctype/loan_request/`): a loan's identity **is its own Frappe docname** (autoname `format:{YYYY}{MM}{DD}LOAN{#####}`, e.g. `20260701LOAN00042`) — there is no separate `loan_number` field. Key fields: `project_name` (Link → Project Registration), `project_number` (fetched Data), `loan_amount` (Currency, auto-summed from a child table). Its own workflow reaches a terminal **`Approved`** state (which is when Loan Request publishes its own, unrelated Kafka event).
  **Loan Request has zero settlement/outstanding-balance tracking** — no `settled_amount`, no `remaining_balance`, nothing. An early draft of this plan proposed adding it; that was **dropped**. The outstanding balance is read live from the Accounts service instead (§4), because a Frappe-side rollup would drift the moment a settlement is recorded through any other channel. `Loan Request` is therefore untouched by this feature.
- **Kafka producer convention**: every feature gets its own `kafka/producer/<feature>/` package (`dto.py`, `mapper.py`, `producer.py`, `validator.py`, `__init__.py`), following exactly the shape of `kafka/producer/loan_request/`. Topic names/schema versions are centrally declared in `kafka/config.py`:
  ```python
  TOPIC_LOAN_REQUEST = 'loan-request-event'
  TOPIC_LOAN_REQUEST_DLQ = 'loan-request-event-dlq'
  SCHEMA_VERSION_LOAN_REQUEST = '1.0'
  ALL_PRODUCER_TOPICS = [ ... ]
  ```
  Adding a new topic is just adding constants here + appending to `ALL_PRODUCER_TOPICS` (a documentation list, not an enforced allow-list — `publish_message()` in `kafka/utils.py` accepts any topic string).
- **Staff, RnD processing pattern**: small workflow doctypes in this app (Loan Request, Miscellaneous Commit) use a **dedicated details page**, not the generic `PendingTaskDetails.tsx`. `PendingTaskDetails.tsx` and `TaskRegistry.tsx` both just *redirect* to the dedicated route for these doctypes:
  ```tsx
  case "Loan Request": return `/loan-request/${name}`;
  ```
  `LoanRequestDetails.tsx` is the concrete template to copy: it gates a staff-only input block on `workflowState === 'Pending @ Staff (Deposit Loan)' && roles.includes('staff, RnD')`, collects the staff-entered fields in local state, and submits them via the doctype's own action endpoint.

## 3. Reference: existing "Accounts Portal" ledger APIs (external service)

The external ledger/accounts microservice (base host confirmed live and correct at **`172.16.135.27:18083`**) already has loan and loan-settlement endpoints of its own. This is important context: **the Kafka event this doc designs is very likely consumed by this exact service** (something on the other end of the "Loan Settlement request" topic probably calls `POST /api/loan-settlement` below in response), and its existing shapes are the strongest available signal for resolving several of the Open Questions in §12.

**`LoanDetailsController` — `/api/loan-details`**

| Method | Path | Purpose |
|---|---|---|
| POST | `/addLoanDetails` | Create a loan record |
| GET | `/getAllLoanDetails` | List every loan |
| GET | `/project/{projectNumber}` | Loans against a project — all loans tied to that project |
| GET | `/{loanNumber}` | Single loan by loan number |
| PUT | `/update-deposit-status` | Update a loan's deposit status |
| PUT | `/update-loan-status` | Update a loan's status |
| PUT | `/update-status` | Update both loan + deposit status together |
| PUT | `/{loanNumber}/deposit-received` | Mark deposit received for a loan |
| PUT | `/{loanNumber}/reject` | Reject a loan deposit (optional comment) |
| GET | `/{loanNumber}/project-files` | Get project files linked to a loan |

**`LoanAnalyticsController` — `/api/loan-analytics`**

| Method | Path | Purpose |
|---|---|---|
| GET | `/summary` | Overall loan summary (all loans) |
| GET | `/by-fund-type` | Grouped by fund type |
| GET | `/by-department` | Grouped by department |
| GET | `/by-employee` | All employees' loan summaries — grouped by `empId`, returns everyone at once (no single-employee path param) |
| GET | `/loans?fundType=&status=&projectNumber=&page=&size=` | Paginated loan list, filterable by fund type / status / project number (no `empId` filter) |
| GET | `/by-project/{projectNumber}` | Loans against a project — full summary for one project |

**`LoanSettlementController` — `/api/loan-settlement`**

| Method | Path | Purpose |
|---|---|---|
| POST | `` (base) | Create a settlement against a loan |
| GET | `/loan/{loanNumber}` | All settlements for a loan |
| GET | `/loan/{loanNumber}/summary` | Settlement summary for a loan |

**Known gap**: no direct `GET /api/loan-details/employee/{empId}` or `/api/loan-analytics/by-employee/{empId}` single-employee lookup — `empId` lives on the project (`LoanDetailsRepository.java:48`, `findByLoanTypeAndProjectRegistrationBasicDetails_EmpId`), and the only employee view is the bulk `/by-employee` list. Not currently needed by this feature.

**Base host for all of the above: `172.16.135.27:18083`** (confirmed). Same host as the `LEDGER_API_BASE_URL` fix already applied to `commitPayment.py`.

**Implication for this design**: since `POST /api/loan-settlement` already exists, it's worth confirming (Open Question 8) whether the new Frappe `Loan Settlement` DocType + Kafka event are meant to *feed* this existing endpoint, or whether Frappe should call it **directly via REST** instead of/in addition to Kafka. The requirement as given explicitly says Kafka, so the plan in §7 stands unless you say otherwise.

### 3.1 Sample response — `GET /api/loan-details/project/{projectNumber}`

This is the **actual data source for the modal's loan list** (§6) — `get_active_loan_for_project` (§5.1) calls this endpoint directly rather than relying only on Frappe's own `Loan Request` doctype:

```json
[
  {
    "loanNumber": 4,
    "loanStatus": "LOAN_APPROVED",
    "loanReceivedDate": "2026-04-22",
    "projectNumber": "26RCLSTSP0742SAMI0001",
    "loanNumberFap": "20260412LOAN00220",
    "receivedFrom": "",
    "loanType": "IDF",
    "loanAmount": 2250000.00,
    "bmr": "M8873",
    "bmrDate": "2026-04-13",
    "depositStatus": "SUBMITTED",
    "recordTime": "2026-04-22T16:18:50.987304",
    "loanBudgetBreakupDetails": [
      {
        "accountHeadId": 2,
        "amount": 2250000.0,
        "loanNumber": 4,
        "projectNumber": "26RCLSTSP0742SAMI0001",
        "remarks": "",
        "recordTime": "2026-04-22T16:18:50.987304"
      }
    ]
  }
]
```

**Critical field identities** (confirmed by you — this changes the Kafka payload mapping in §7 from what was originally proposed):
- **`loanNumber`** (integer, e.g. `4`) — the ledger's *own* internal loan ID. This is what the new topic's **`loannumber`** field must carry — **not** the Frappe Loan Request docname.
- **`loanNumberFap`** (e.g. `"20260412LOAN00220"`) — this **is the Frappe Loan Request's own docname** (matches the `{YYYY}{MM}{DD}LOAN{#####}` autoname format exactly). This confirms the correlation chain: when a Loan Request is approved in Frappe and published via the existing `loan-request-event` topic, the Accounts Portal creates its own `LoanDetails` record and stores the Frappe docname here for traceability. **This is what the new topic's `frapappid` field must carry** — i.e. `frapappid` = the *Loan Request's* docname, **not** the Fund Received docname (correcting the original §7 proposal).
- `loanAmount` — the loan's total sanctioned amount (matches Frappe `Loan Request.loan_amount`, should already be consistent since Frappe published it).
- `loanStatus` — the ledger tracks settlement progress itself via this field, with **four known values** (confirmed by you):
  - `LOAN_APPROVED` — approved, nothing settled yet.
  - `ACTIVE` — outstanding/in-use, not yet settled.
  - `PARTIALLY_SETTLED` — some amount settled, balance remains.
  - `SETTLED` — fully settled, nothing left owed.

  **Modal visibility rule**: show the modal if **any** of a project's loans has `loanStatus` in `{LOAN_APPROVED, ACTIVE, PARTIALLY_SETTLED}` (i.e. anything **other than** `SETTLED`). If **every** loan for the project is `SETTLED`, don't show the modal at all — this replaces the earlier (narrower) draft that only checked for `LOAN_APPROVED`. This is authoritative and keys off the ledger's status field directly, not Frappe's own `Loan Request.workflow_state`.
- This endpoint doesn't expose a numeric "outstanding amount" — only the qualitative `loanStatus`. The actual outstanding **figure** (needed for the modal's display and to cap a Partial amount) comes from `GET /api/loan-settlement/loan/{loanNumber}/summary`, whose response shape is now confirmed (§3.2). It **does** expose `loanBudgetBreakupDetails[] = {accountHeadId, amount, ...}` — the per-head amounts the loan was drawn against, which is the source for the head-wise return (§4a).

### 3.2 Sample response — `GET /api/loan-settlement/loan/{loanNumber}/summary`

**This is the authoritative source for a loan's outstanding balance** (resolves the earlier Option A/B question in §4). Example for `loanNumber: 4` — the ₹22,50,000 loan from §3.1, with no settlements against it yet:

```json
{
  "settlementId": null,
  "loanNumber": 4,
  "projectNumber": null,
  "loanSettlementNumber": null,
  "frapAppId": null,
  "settlementAmount": null,
  "settlementDate": null,
  "settlementMode": null,
  "remarks": null,
  "recordTime": null,
  "updatedLoanStatus": "LOAN_APPROVED",
  "totalSettled": 0,
  "outstandingAmount": 2250000.00
}
```

What we actually use from it:

| Field | Use |
|---|---|
| `outstandingAmount` | **The figure shown per loan in the modal**, and the cap for a Partial settlement amount. Authoritative — reflects settlements made through *any* channel, not just this Frappe flow. |
| `totalSettled` | Displayed alongside for context ("₹X of ₹Y already settled"). |
| `updatedLoanStatus` | Current status; cross-checks the `loanStatus` from §3.1. |

The remaining fields are the *last settlement's* details and are `null` when a loan has no settlements yet — we ignore them (they're also on the never-send list for our publish, §7.3).

Note this endpoint is **per loan**, so populating the modal costs `1 + N` calls: one `/api/loan-details/project/{projectNumber}` for the loan list, then one `/summary` per non-`SETTLED` loan. N is small (a handful of loans per project at most), but the calls should be issued concurrently rather than serially — see §5.1.

## 4. New DocType: `Loan Settlement`

One record per **loan** — if a Fund Received settles 3 loans at once (via "Select All"), that creates **3 separate `Loan Settlement` docs**, each independently linked back to the same Fund Received record and each publishing its own Kafka message (see §7).

| Fieldname | Type | Notes |
|---|---|---|
| `name` (autoname) | — | `format:{YYYY}{MM}{DD}LNST{#####}`, mirroring Loan Request's own autoname. **This is `loansettlementnumber`.** |
| `loan_reference` | Link → Loan Request | The loan being settled — Frappe docname, equal to the ledger's `loanNumberFap`. **This is what `frapappid` resolves to** (not Fund Received — see §3.1). |
| `ledger_loan_number` | Int | The Accounts Portal's own `loanNumber` (e.g. `4`) for this loan, read off the `GET /api/loan-details/project/{projectNumber}` response at the time the settlement is created (§5.2). **This is what `loannumber` resolves to.** |
| `project` | Link → Project Registration | |
| `project_number` | Data (fetched from `project.project_no`) | **`projectnumber`** |
| `fund_received_reference` | Link → Fund Received, **not mandatory at creation** | Set once the Fund Received document actually exists — see §5.4 (the settlement doc is created *before* Fund Received is submitted, so this starts blank). Internal traceability only — **not** the source of `frapappid` (corrected — see §3.1). |
| `settlement_type` | Select: `Full`, `Partial` | Chosen in the modal |
| `settlement_amount` | Currency | Full → auto-set to the loan's outstanding balance at request time (read-only in the modal); Partial → entered by the requester. **`settlementamount`** |
| `settlement_date` | Date, default `today` | Set at creation time (when the settlement is saved via the modal — see §12 Q3, now largely resolved by the "save first" ordering) |
| `settlement_mode` | Select: `Physical`, `PFMS`, `Offline`, `Online` | Filled in **later**, by staff, RnD |
| `remarks` | Small Text | Filled in **later**, by staff, RnD |
| `requested_by` | Link → User, default `session_user` | Who filled in the Fund Received form that raised this request |
| `publish_status` | Select: `Pending`, `Published`, `Failed`; default `Pending`; read-only | Did this settlement actually reach the Accounts service? Set by the publish loop (§5.4). Makes divergence **visible** instead of silent — see §12. |
| `publish_error` | Small Text, read-only | The error text when `publish_status = Failed`, for staff/admin diagnosis (§12). |
| `budget_breakup` | Table → `Loan Settlement Budget Breakup` | Head-wise return; always sums to `settlement_amount`. See §4a. |
| `workflow_state` | Data, read-only | New, dedicated workflow — see §9 |

### 4a. Child DocType: `Loan Settlement Budget Breakup`

One row per budget head being returned to.

| Fieldname | Type | Notes |
|---|---|---|
| `account_head` | Link → Budget Head | Canonical docname |
| `account_head_id` | Int, read-only | The Accounts service's own `accountHeadId` — **this is what the Kafka `accountHeadId` carries** |
| `loan_amount` | Currency, read-only | What the loan drew against this head, from `loanBudgetBreakupDetails` |
| `return_amount` | Currency | What is being returned against it now |

The heads come from the loan itself: `GET /api/loan-details/project/{projectNumber}` returns `loanBudgetBreakupDetails[] = {accountHeadId, amount, ...}` per loan (§3.1). We never invent a head the loan wasn't drawn against — `save_loan_settlement_requests` rejects one outright.

#### 4a.1 How a **Full** settlement is split across heads

`_prorate()` splits the outstanding across the heads **in proportion to how much each head drew**, and the server derives this itself rather than trusting the client.

The plain requirement is "full amount against all budget heads", and when nothing has been settled yet that is exactly what proration yields: outstanding == the loan total, so each head gets back precisely what it drew.

The two diverge only on an **already partially-settled** loan. Loan `20260412LOAN00220` is the live example: ₹22.5L drawn (all against *Manpower*), ₹10L already settled, ₹12.5L outstanding. A "full" settlement here returns ₹12.5L — not the ₹22.5L the heads sum to. Proportional is the only split consistent with how the loan was drawn, because **the Accounts service exposes no per-head settled figures** — `/summary` reports one loan-level `totalSettled`. If they later expose a head-wise settled breakdown, this is the function to revisit.

Rounding residue is placed on the largest head so the parts re-sum to the target exactly; the Fund Received check downstream compares to the paisa. `AddFundReceived.tsx`'s `prorate()` mirrors this so the modal previews what the server will store — but the **server's figures are the ones saved and enforced**.

#### 4a.2 The `account_head` identity problem

`Project Received Budget.account_head` is declared a Link to Budget Head, but real rows hold **any of three forms** — the docname (`gu12bngg1u`), the numeric ledger id (`2`), or the raw label (`Manpower`). Sanction rows, which populate the Fund Received breakup dropdown, hold **labels**.

So the same head does not compare equal to itself across these sources. Every head comparison in the Fund Received validation is therefore run through the existing `resolve_budget_head_name()` (`kafka/utils.py`), which collapses all three forms to the docname. Confirmed by test: a breakup row written as `"2"` satisfies a requirement stored as `"gu12bngg1u"`.

For display and prefill the reverse is needed, so `get_active_loan_for_project` and `get_settlement_requirements` both return an `account_head_label` / `head_labels` map alongside the docname — the UI writes the *label* into the breakup row (matching the dropdown), and the backend resolves it back.

**Outstanding balance is read from the Accounts service, never computed in Frappe** (confirmed — §3.2):

```python
def get_outstanding_loan_amount(ledger_loan_number):
    """Authoritative outstanding balance for a loan, from the Accounts service.
    Reflects settlements made through ANY channel, not just this Frappe flow."""
    resp = requests.get(
        f"{LEDGER_API_BASE_URL}/loan-settlement/loan/{ledger_loan_number}/summary",
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    return flt(data.get("outstandingAmount")), flt(data.get("totalSettled"))
```

We deliberately do **not** reconstruct this from our own `Loan Settlement` history — that would drift out of sync the moment a settlement is recorded on the Accounts side by any other route. The Frappe-side rollup that earlier drafts proposed is dropped entirely.

A project's **active loans** for the modal = every entry from `GET /api/loan-details/project/{projectNumber}` (§3.1) whose `loanStatus` is **not** `SETTLED` (i.e. `LOAN_APPROVED`, `ACTIVE`, or `PARTIALLY_SETTLED`) **and** whose `/summary` `outstandingAmount > 0`. The second check is a cheap guard against a loan whose balance has reached zero but whose status hasn't caught up yet. If every loan for the project is settled, the modal does not show at all.

`loanNumberFap` is matched against our own `Loan Request` docnames purely for display context (purpose/date) — the Accounts service is authoritative for status and balances, not Frappe's `workflow_state`.

## 5. Backend changes

### 5.1 `get_active_loan_for_project(project_name)`
Whitelisted. Builds the modal's loan list from the Accounts service (base host **`172.16.135.27:18083`**, same as the `LEDGER_API_BASE_URL` fix already applied to `commitPayment.py`):

1. `GET /api/loan-details/project/{projectNumber}` (§3.1) → all loans for the project.
2. Filter to `loanStatus != "SETTLED"`.
3. For each survivor, `GET /api/loan-settlement/loan/{loanNumber}/summary` (§3.2) → `outstandingAmount`, `totalSettled`. **Issue these concurrently** (`ThreadPoolExecutor`, as `commitPayment.py` already does for its per-head ledger fetches) rather than serially, so the modal isn't gated on N sequential round-trips.
4. Drop anything with `outstandingAmount <= 0`.
5. Return per loan: `ledger_loan_number` (`loanNumber`), `loan_reference` (`loanNumberFap`), `loan_amount`, `outstanding_amount`, `total_settled`, `loan_status`, `loan_received_date`, `loan_type`, and `budget_heads[]` = `{account_head_id, account_head, account_head_label, loan_amount}` from `loanBudgetBreakupDetails` (§4a). All head ids across all loans are resolved in **one** `Budget Head` query, not one per loan.

If a loan's `/summary` call fails, the loan is **still returned**, flagged `balance_unavailable: true` with a null `outstanding_amount`, and the UI disables its checkbox. Hiding it would be indistinguishable from "this project has no loans"; guessing the balance by falling back to the full loan amount could let someone over-settle a partially settled loan.

Empty list (everything settled, or no loans at all) ⇒ **no modal**, Fund Received behaves exactly as it does today (§1.10).

**Fail open**, don't block: if the Accounts service is unreachable or errors, log it and return an empty list so the user can still file their Fund Received. Blocking an unrelated funding workflow because a loan lookup timed out would be worse than missing the reminder — and the same resilience principle is already used elsewhere in this app for external-dependency failures.

### 5.2 New: `save_loan_settlement_requests(project_name, loans)`
Whitelisted. Called when the user clicks **"Settle the Loan"** in the modal — this is the **"save the settlement first"** step, and it genuinely happens as its own request, before Fund Received is ever submitted.

`loans` = a list of `{loan_reference, ledger_loan_number, settlement_type, settlement_amount, budget_breakup}` (the frontend already has `ledger_loan_number` from §5.1's response, no extra lookup needed), one entry per checked loan. For each entry:
1. Re-validates `settlement_amount` against a **fresh** `get_outstanding_loan_amount(ledger_loan_number)` call (§4) — never trusting the client-supplied figure, and re-reading the Accounts service rather than a value cached when the modal opened. See §10.1 for the full re-validation set.
2. Re-reads the loan's **budget heads** from the Accounts service in the same pass, then:
   - **Full** → ignores whatever the client sent and derives the split itself via `_prorate()` (§4a.1).
   - **Partial** → validates the client's rows through `_validate_partial_breakup()`: every head must be one the loan was actually drawn against, no return may exceed what that head drew, nothing negative, and the rows must total `settlement_amount` (±0.01). Heads left at zero are dropped rather than published as zero-amount rows.
3. Creates a `Loan Settlement` doc: `loan_reference`, `ledger_loan_number`, `project = project_name`, `project_number`, `settlement_type`, `settlement_amount`, `settlement_date = today`, `requested_by = session_user`, `budget_breakup`, `fund_received_reference` left **blank**, `workflow_state = "Pending Staff Processing"`.
4. Returns the created doc names **and** `requirements` (§5.2a).

The frontend holds these returned names in local state and closes the modal — the user now proceeds to fill in and submit the Fund Received form as normal.

### 5.2a New: `get_settlement_requirements(settlement_names)`
Whitelisted. Answers "what must a Fund Received carry to satisfy these settlements?" — returned inline by §5.2 and re-read server-side at submit time.

```
{
  "total": 1250000.0,                          # minimum (or exact) Fund Received Amount
  "heads": {"gu12bngg1u": 1250000.0},          # minimum (or exact) per Budget Head docname
  "head_labels": {"gu12bngg1u": "Manpower"},   # for display + dropdown matching (§4a.2)
  "exact": false,                              # see below
  "settlements": [ {...} ]                     # per-settlement detail, for the UI banner
}
```

`exact` decides whether the figures are a **target** or a **floor**:
- **every** settlement Partial → `exact: true`. The user declared precisely how much is arriving and where it goes, so the receipt is pinned to it and the fields are locked.
- **any** settlement Full → `exact: false`, a floor. A receipt that clears a loan in full is usually larger than the loan, the excess being ordinary project funding, so the prefilled figures stay editable upward.

This also resolves the otherwise-contradictory **mixed** case (one Full + one Partial selected together): a floor satisfies the Partial's exact requirement too, so `>=` is the safe generalisation. Only the pure-Partial case locks the form.

### 5.2b Fund Received validation — `_validate_against_loan_settlements`
Called from `submit_fund_received` **before anything is written**: a receipt that cannot fund its settlements should never come into existence. Compares `fund_received_amt` and the `received_amt_breakup` rows against §5.2a, exact-or-floor per `exact`, with every head normalised through `resolve_budget_head_name()` (§4a.2).

`AddFundReceived.tsx` runs the same two checks client-side purely to avoid a round-trip; the backend is the enforcement point.

### 5.2c New: `discard_loan_settlement_requests(settlement_names)`
Whitelisted. Deletes draft settlements so the modal can recreate them (§1.5a).

Deliberately narrow — a settlement is only removable while it is a draft in **every** sense. It is refused if it is linked to a Fund Received, past `Pending Staff Processing`, `publish_status = "Published"`, submitted/cancelled (`docstatus != 0`), or owned by someone else (System Manager excepted). So it can only ever remove something created minutes earlier in the form still open on screen; it can never erase a real record.

Verified: an untouched draft deletes; a linked one and a Processed one are both refused with the settlement number named, and survive.

> This narrowness is the point. An earlier ad-hoc cleanup during development used an **unfiltered** `frappe.get_all("Loan Settlement")` and deleted every settlement in the table. No user data was lost that time (all nine were Administrator-owned test records), but a user-facing "discard" path must never be able to do that — hence the per-document guard rather than a filter on the query.

### 5.3 How the frontend passes the linkage without touching Fund Received's schema
When the user finally submits Fund Received, `submit_fund_received`'s existing `doc_data` payload gets **one extra, non-schema key**: `doc_data.loan_settlement_refs = [<names from 5.2>]` (absent when the project has no loans at all; settlement is otherwise mandatory, §1.5). The backend reads and pops this key off `doc_data` **before** passing the rest through to `save_fund_received`'s normal field-mapping logic, so it never touches — and Frappe never tries to save it onto — the Fund Received doctype itself. This is the mechanism that satisfies "don't change any structure of Fund Received."

### 5.4 `fund_received.py` — two touch points, both additive

The work is split across two moments, not one. Earlier drafts of this plan put both inside `perform_fund_received_action`; the built version does not.

**(a) Linking — in `submit_fund_received`, right after the Submit action.** The settlements already exist (created from the modal before Fund Received did), so this only records which receipt they came from:
```python
result = perform_fund_received_action(docname, "Submit")

# Link the settlements to this now-real Fund Received. Isolated in its own
# try/except so it can never affect the submission or its Kafka publish.
if loan_settlement_refs:
    for settlement_name in loan_settlement_refs:
        try:
            frappe.db.set_value(
                "Loan Settlement", settlement_name, "fund_received_reference", docname
            )
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Loan Settlement Link Error")
    frappe.db.commit()
```
`_validate_against_loan_settlements` (§5.2b) runs **before** this, ahead of any write.

**(b) Publishing — in `perform_fund_received_action`, at the Forward transition.** Immediately after the existing, untouched `if next_state == "PENDING_APPROVAL": success = publish_fund_received(doc)` block, `_process_linked_loan_settlements(docname, loan_settlements)` marks each linked settlement `Processed` and publishes it — wrapped in its own try/except so a settlement failure can never roll back the Fund Received transition or its own publish. The function also gained an optional `loan_settlements` parameter carrying the staff-entered mode/remarks collected on the receipt page (§8).

> **The linking step is not optional any more.** An earlier version of this note said `fund_received_reference` is absent from the Kafka payload, so a settlement could publish fine even if linking never ran. That is **no longer true**: it is published as `fundReceivedRefNumberFap`, which is required and validated as blocking (§7.3). A settlement that was never linked now *fails* to publish rather than publishing an unusable record — deliberately, because the idempotency key would make that record permanent.

## 6. Frontend changes (`AddFundReceived.tsx`)

- On mount (alongside the existing sanction-details fetch), call `get_active_loan_for_project(projectName)`.
- If it returns ≥1 active loan, show a **blocking modal** immediately (same `createPortal` pattern as `TravelForm.tsx`'s `ImportantTravelNotice`) — the Fund Received form fields are not usable until the modal is resolved:
  - **Header**: "This project has an outstanding loan" (singular) / "Outstanding Loans" (plural), with a one-line explanation.
  - **Loan list**: one row per active loan — loan number (docname), disbursed date, loan amount, outstanding amount — each with its own checkbox (unchecked by default), plus a **"Select All"** checkbox above the list that toggles every row at once.
  - **Per-checked-loan controls**: as soon as a row's checkbox is checked, a Full/Partial radio appears inline under that row; **Partial** reveals an amount input (`0 < amount ≤ outstanding_amount` for that specific loan). This repeats independently for every checked loan — matches "similar for all the loans."
  - **Head-wise return table** (appears once Full/Partial is picked): one row per budget head the loan drew against — *Budget Head · Loan Taken · Return*.
    - **Full** → Return is filled in automatically (§4a.1) and shown read-only.
    - **Partial** → Return is an input per head, capped at that head's Loan Taken, with a live *"Allocated ₹X of ₹Y"* counter and an explicit *"₹Z still to be allocated"* / *"exceeds the total by ₹Z"* message. "Settle the Loan" stays disabled until every checked loan's heads add up to its declared total.
    - A loan the Accounts service reports **no** head breakup for cannot be settled head-wise and is called out as such.
  - **A loan whose balance could not be read** (`balance_unavailable`, §5.1) renders in amber with its checkbox **disabled** and an explanation that it can be settled once the Accounts service reports again. It is excluded from the "can settle" check rather than silently hidden.
  - **Footer, two buttons**:
    - **"Settle the Loan"** — the only way out on first open (§1.5). Enabled once ≥1 loan is checked and every checked loan has a valid Full/Partial (+ amount + head-wise split) resolved. Calls `save_loan_settlement_requests` (§5.2), stores the returned doc names **and the raw selections** in local state, then closes the modal and proceeds to the normal Fund Received form.
    - **"Keep Existing"** — shown only when re-opened via Edit (§1.5a); closes without changing the settlement already saved.
- **After "Settle the Loan"**, the returned `requirements` (§5.2a) are applied to the form:
  - `fund_received_amt` prefilled with `total`; the head amounts prefilled into `received_amt_breakup` (creating rows where needed), written using the head **label** so they match the sanction-derived dropdown (§4a.2).
  - A head a loan drew against but this sanction doesn't budget for is still added to the dropdown options, so the row renders and submits; the pre-existing head-wise sanction check is what flags the overrun.
  - When `exact` (all-Partial): `fund_received_amt` and the settlement-bound breakup amounts render **read-only**, and those rows cannot have their head changed or be deleted.
  - When not `exact` (any Full): the same rows are highlighted and un-deletable, amounts stay editable but cannot be reduced below the requirement; a per-field hint states the minimum.
  - A banner above the form lists every settlement, loan-by-loan and head-by-head, with the total — so the user can see exactly why the fields are constrained.
  - An **Edit** button sits next to *Fund Received Amount* and on that banner, re-opening the modal to revise the settlement (§1.5a). It is the only way to change a locked amount — the field itself never becomes typable.
  - `handleSubmit` mirrors the backend's two checks (total, and per-head) before the round-trip, so a shortfall is reported inline rather than as a server error. The backend remains the enforcement point (§5.2b).
- The stored `Loan Settlement` doc names are appended as `doc_data.loan_settlement_refs` only inside the final `handleSubmit` call for Fund Received itself (§5.3) — they are **not** part of `formData` (which mirrors the real Fund Received field list).
- **`FundReceivedDetails.tsx`** gets a "Loan Settlement(s) Requested" card listing every linked `Loan Settlement` (fetched by `fund_received_reference = <this doc>`), placed **above** the Budget Breakup. It is *not* read-only: for `staff, RnD` it carries the inline **Settlement Mode** + **Remarks** inputs and gates the Forward action (§8). Each settlement also shows its **head-wise return** table.

  *(An earlier draft of this plan described this block as read-only and informational. That changed when publishing moved to the Fund Received Forward — the mode/remarks have to be captured here, because the payload must be complete in its single message.)*

### 6.1 A latent bug this feature exposed — `type="button"`

Adding the settlement prefill made an existing defect in this form suddenly destructive, which is worth recording because the symptom pointed away from the cause.

`AddFundReceived.tsx`'s **Add Transaction Row**, **Add Budget Item** and the per-row **Delete** buttons had no `type` attribute. A `<button>` inside a `<form>` defaults to **`type="submit"`**, so every one of them was submitting the Fund Received.

It went unnoticed because the form was always *invalid* at that point — `fund_received_amt` was empty, so `handleSubmit` threw its own validation error and the click merely looked like a premature complaint. Once the settlement pre-fills a valid amount **and** a matching breakup, `handleSubmit` passes every check and the receipt is genuinely submitted before a single transaction row has been entered.

Fixed by adding `type="button"` to all of them. A sweep of the rest of the codebase found no other untyped `<button>` that actually falls inside a `<form>`, so this page was the only one affected.

> Worth keeping in mind for any future form here: the guard that hid this was accidental. A form that is invalid by default masks stray submit buttons; make one valid by default and they surface immediately.

## 7. Kafka: publishing to the Accounts service

New package `kafka/producer/loan_settlement/` (`dto.py`, `mapper.py`, `producer.py`, `validator.py`, `__init__.py`), mirroring `kafka/producer/loan_request/` exactly.

**The contract is fixed and owned by the Accounts service** — both topics already exist there with live consumers, documented in their *"Loan Settlement — Kafka Producer Integration Guide."* Frappe is producer-only. Everything below is transcribed from that guide; do not deviate.

### 7.1 Topics

| Purpose | Topic | DLQ topic | Partitions / Replicas | Failure semantics |
|---|---|---|---|---|
| One settlement per message | `loan-settlement-events` | `loan-settlement-events-dlq` | 2 / 2 | Independent — each message succeeds or DLQs on its own |
| Many settlements per message (array) | `loan-settlement-events-batch` | `loan-settlement-events-batch-dlq` | 2 / 2 | **All-or-nothing** — one bad row rolls back the entire batch |

Both consumers use **manual ack** (a message is only "done" once fully processed or explicitly DLQ'd). Both publish acknowledgements to **`event.responses`**.

⚠️ **The batch topic is all-or-nothing** (updated in their guide): the whole array runs in a single transaction, so if any row fails validation or persistence, **none** of the settlements in that message are saved — including rows that had already succeeded earlier in the same array — and the entire message is DLQ'd. Their guide's own guidance: *"Put only settlements that genuinely belong together as one unit in a single batch message — a single bad row blocks every other row sent alongside it."* This directly drives the topic choice in §7.6.

One nuance: already-processed rows (duplicate `loanSettlementNumber`) are **not** treated as failures — they're skipped and reported as `SUCCESS`/"Already processed" without aborting the batch.

`kafka/config.py` additions:
```python
TOPIC_LOAN_SETTLEMENT = 'loan-settlement-events'
TOPIC_LOAN_SETTLEMENT_DLQ = 'loan-settlement-events-dlq'
TOPIC_LOAN_SETTLEMENT_BATCH = 'loan-settlement-events-batch'
TOPIC_LOAN_SETTLEMENT_BATCH_DLQ = 'loan-settlement-events-batch-dlq'
SCHEMA_VERSION_LOAN_SETTLEMENT = '1.0'
```

### 7.2 Envelope (required for both topics)

**Confirmed** — this is exactly the envelope every other producer in this codebase already emits, so `LoanRequestEventDTO`'s shape carries over unchanged:

```json
{
  "schemaVersion": "1.0",
  "eventType": "LOAN_SETTLEMENT",
  "timestamp": "2026-08-08T10:15:30.000000",
  "data": { }
}
```

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | string | Not validated — send `"1.0"` |
| `eventType` | string | Free text; echoed back in the response's `originatingEventId` |
| `timestamp` | string | Format `yyyy-MM-dd'T'HH:mm:ss.SSSSSS` (6-digit microseconds — Python's `datetime.isoformat()` already produces this) |
| `data` | object *or* array | Object for the singular topic, array for the batch topic |

A malformed envelope, or a `data` whose shape doesn't match the topic, goes **straight to the DLQ** (`JSON_PARSE_FAILURE` / `DTO_MAPPING_FAILURE`) and never reaches business logic.

### 7.3 Settlement object — field contract

**Casing confirmed as camelCase** (resolves the earlier open question — it matches both this codebase's convention and the Accounts service's actual consumer).

| Field | Type | Required | Our source |
|---|---|---|---|
| `loanNumber` | integer | **Yes** | `Loan Settlement.ledger_loan_number` — the ledger's own integer loan ID (e.g. `4`). Must reference an existing `LoanDetails`. |
| `projectNumber` | string | **Yes** | `Loan Settlement.project_number`. Must reference an existing project. |
| `loanSettlementNumber` | string | **Yes** | `Loan Settlement.name` — Frappe-generated (e.g. `20260808LNST00001`). **This is the idempotency key** — see §7.4. |
| `frapAppId` | string | No | `Loan Settlement.loan_reference` — the Loan Request docname (= the ledger's `loanNumberFap`). Passthrough reference id on their side. |
| `settlementAmount` | decimal | **Yes**, must be `> 0` | `Loan Settlement.settlement_amount` |
| `settlementDate` | date `yyyy-MM-dd` | No | `Loan Settlement.settlement_date` |
| `settlementMode` | string | No | `Loan Settlement.settlement_mode` — free text, **not** enum-validated on their side. |
| `remarks` | string | No | `Loan Settlement.remarks` |
| `settlementStatus` | string | — | **Always `"PENDING"`** from us. The Accounts side lists these as pending settlements and then **confirms, rejects, or rectifies** them; that outcome lives entirely on their side. We never publish any other value, and we don't currently learn the result (see Open Question 13 on consuming `event.responses`). |
| `fundReceivedRefNumberFap` | string | **Yes** | `Loan Settlement.fund_received_reference` — the **Fund Received docname**. See the note below. |
| `loanSettlementBudgetBreakupDetails` | array | — | `Loan Settlement.budget_breakup` (§4a). Omitted entirely when empty. Each row is exactly **`{accountHeadId, amount}`** — nothing else. `accountHeadId` is the **ledger's** head id (from `loanBudgetBreakupDetails`), never our Budget Head docname. Always sums to `settlementAmount`. |

> **`fundReceivedRefNumberFap` is what ties a settlement to its receipt.** Without it Accounts stores NULL, no receipt displays any settlements, and nothing cascades.
>
> It is the **Fund Received docname** — byte-for-byte what Fund Received's *own* producer already publishes under the same key (`fund_received/mapper.py`: `fundReceivedRefNumberFap=doc.name`). That equality is the join, so the two mappers must never diverge on it.
>
> ⚠️ It is validated as **blocking**, not "recommended", and this is deliberate: because `loanSettlementNumber` is an idempotency key (§7.4), publishing once with a NULL receipt ref would be **permanent** — a corrected re-publish is silently skipped, never applied. So a settlement not yet linked to a Fund Received must *fail to publish* rather than publish incomplete. That leaves `publish_status = "Failed"`, which is visible and retryable via §10.4 once the link exists.
>
> In the normal flow the link is always present: `submit_fund_received` sets `fund_received_reference` at submission (§5.4), and the publish happens later, at Forward (§8). `_process_linked_loan_settlements` selects settlements *by* that field, so it can only ever find linked ones. The guard exists for the standalone `LoanSettlementDetails` page, which can process a settlement whose Fund Received was abandoned.

**Never send** `settlementId`, `recordTime`, `updatedLoanStatus`, `totalSettled`, `outstandingAmount` — these are response-only fields on their side and are ignored if present.

### 7.4 Idempotency — `loanSettlementNumber`

The Accounts service treats `loanSettlementNumber` as the idempotency key: **duplicates are silently skipped and reported as already-processed, never double-inserted.** Two consequences worth designing around:

- **Safe retry.** A failed/uncertain publish can simply be re-published; no double-settlement risk. This also makes the orphaned-record scenario (Open Question 9) much less dangerous.
- Our Frappe docname is unique by construction (`{YYYY}{MM}{DD}LNST{#####}`), so it satisfies the key naturally — **provided we never reuse a `Loan Settlement` doc for a second settlement.** One doc = one settlement, always.

### 7.5 Sample messages

Built from the real loan in §3.1 (`loanNumber: 4`, `projectNumber: "26RCLSTSP0742SAMI0001"`, `loanNumberFap: "20260412LOAN00220"`, `loanAmount: 2250000.00`).

**Singular topic** — `loan-settlement-events`, one **partial** settlement of ₹10,00,000:

```json
{
  "schemaVersion": "1.0",
  "eventType": "LOAN_SETTLEMENT",
  "timestamp": "2026-08-08T10:15:30.000000",
  "data": {
    "loanNumber": 4,
    "projectNumber": "26RCLSTSP0742SAMI0001",
    "loanSettlementNumber": "20260808LNST00001",
    "frapAppId": "20260412LOAN00220",
    "settlementAmount": 1000000.00,
    "settlementStatus": "PENDING",
    "fundReceivedRefNumberFap": "REC_1008262278-prjreg_refnum",
    "settlementDate": "2026-08-08",
    "settlementMode": "PFMS",
    "remarks": "Adjusted against April fund release",
    "loanSettlementBudgetBreakupDetails": [
      { "accountHeadId": 3, "amount": 15000.00 },
      { "accountHeadId": 7, "amount": 10000.00 }
    ]
  }
}
```

Verified against the live doctype — a ₹3,00,000 partial settlement of this same loan produced exactly this shape, with `loanSettlementBudgetBreakupDetails` carrying `{"accountHeadId": 2, "amount": 300000.0}` (*Manpower*) and `fundReceivedRefNumberFap` set to the linked receipt. An unlinked settlement was confirmed to be **blocked** at validation rather than published with a null ref.

**Full** settlement of the same loan (whole outstanding ₹22,50,000) — identical shape, different amount and settlement number:

```json
{
  "schemaVersion": "1.0",
  "eventType": "LOAN_SETTLEMENT",
  "timestamp": "2026-08-08T10:15:30.000000",
  "data": {
    "loanNumber": 4,
    "projectNumber": "26RCLSTSP0742SAMI0001",
    "loanSettlementNumber": "20260808LNST00002",
    "frapAppId": "20260412LOAN00220",
    "fundReceivedRefNumberFap": "REC_1008262278-prjreg_refnum",
    "settlementAmount": 2250000.00,
    "settlementStatus": "PENDING",
    "settlementDate": "2026-08-08",
    "settlementMode": "Physical",
    "remarks": "Full settlement from Aug receipt",
    "loanSettlementBudgetBreakupDetails": [
      { "accountHeadId": 2, "amount": 2250000.00 }
    ]
  }
}
```

**Batch topic** — `loan-settlement-events-batch`, three loans settled from one Fund Received ("Select All"). Shown for completeness; **not** the recommended path (§7.6) — remember all three succeed or all three roll back:

```json
{
  "schemaVersion": "1.0",
  "eventType": "LOAN_SETTLEMENT",
  "timestamp": "2026-08-08T10:15:30.000000",
  "data": [
    {
      "loanNumber": 4,
      "projectNumber": "26RCLSTSP0742SAMI0001",
      "loanSettlementNumber": "20260808LNST00003",
      "frapAppId": "20260412LOAN00220",
      "fundReceivedRefNumberFap": "REC_1008262278-prjreg_refnum",
      "settlementAmount": 2250000.00,
      "settlementStatus": "PENDING",
      "settlementDate": "2026-08-08",
      "loanSettlementBudgetBreakupDetails": [
        { "accountHeadId": 2, "amount": 2250000.00 }
      ]
    },
    {
      "loanNumber": 7,
      "projectNumber": "26RCLSTSP0742SAMI0001",
      "loanSettlementNumber": "20260808LNST00004",
      "frapAppId": "20260519LOAN00311",
      "fundReceivedRefNumberFap": "REC_1008262278-prjreg_refnum",
      "settlementAmount": 500000.00,
      "settlementStatus": "PENDING",
      "settlementDate": "2026-08-08",
      "loanSettlementBudgetBreakupDetails": [
        { "accountHeadId": 3, "amount": 500000.00 }
      ]
    },
    {
      "loanNumber": 9,
      "projectNumber": "26RCLSTSP0742SAMI0001",
      "loanSettlementNumber": "20260808LNST00005",
      "frapAppId": "20260604LOAN00402",
      "fundReceivedRefNumberFap": "REC_1008262278-prjreg_refnum",
      "settlementAmount": 125000.00,
      "settlementStatus": "PENDING",
      "settlementDate": "2026-08-08",
      "loanSettlementBudgetBreakupDetails": [
        { "accountHeadId": 7, "amount": 125000.00 }
      ]
    }
  ]
}
```

`settlementStatus` is always `"PENDING"` — the Accounts side owns the confirm/reject/rectify outcome. Optional keys that are genuinely empty are **omitted entirely** rather than sent as `null` (omission is unambiguous for their deserializer); in the normal flow `settlementMode` and `remarks` are always populated, since staff enters them before Forwarding.

### 7.6 Which topic do we use? — **singular, one message per loan** (recommended)

Their guide's move to **all-or-nothing batch semantics** changed the reasoning here, but not the conclusion. Two things flipped at once:

- ✅ **My original objection is gone.** Batch failure responses now *do* name the failing row — `"Batch aborted at item 1 (loanSettlementNumber=LSN-2026-00988): Loan not found: 9999"` — so the earlier "we'd know one failed but not which one" problem no longer applies.
- ❌ **A stronger objection replaced it.** With all-or-nothing, **one bad loan blocks every other settlement sent alongside it.** If a user settles 3 loans from one Fund Received and one loan reference is stale on the Accounts side, *zero* settlements are recorded there — while Frappe has already created all 3 `Loan Settlement` docs and the Fund Received has been submitted and published. That's a silent 3-way divergence from a single bad row.

  With singular, the same scenario records 2 of 3 in Accounts and DLQs exactly one, which is far easier to detect and reconcile.

**The deciding question is whether our settlements "belong together as one unit"** — which is precisely the criterion their guide names for choosing batch. They don't: the loans are **independent**, each with its own outstanding balance, its own settlement number, and (post-creation) its own staff-entered remarks and settlement mode. They're co-selected in one UI action purely for convenience, not because any business invariant requires them to succeed or fail together. There is no reason a valid settlement against Loan A should be discarded because Loan B's reference was stale.

Supporting reasons:
- **Volume is tiny.** A project has a handful of concurrent loans at most — no throughput pressure justifying batching.
- **Per-settlement lifecycle anyway.** Each `Loan Settlement` doc diverges immediately after creation (own workflow state, own staff input — §8).
- **Safe, precise retry.** Combined with the `loanSettlementNumber` idempotency key (§7.4), a single failed message replays in isolation with no double-settlement risk.

So: **N loans settled ⇒ N messages to `loan-settlement-events`**, published in a loop (§5.4). The batch topic stays available — switching is a small, producer-only change since the per-item object shape is identical.

> **Choose batch instead if** you actively *want* the atomicity — i.e. the business rule is "either every loan settled from this Fund Received lands in Accounts, or none do." That's a legitimate position; it just trades resilience for consistency. See Open Question 12.

### 7.7 Publishing mechanics

Published keyed by `projectNumber` (matching the other producers' partition-key convention), via:
```python
publish_message(TOPIC_LOAN_SETTLEMENT, payload, settlement_doc.name,
                TOPIC_LOAN_SETTLEMENT_DLQ, key=project_number)
```

**Fires once per settlement, when staff, RnD Forwards the Fund Received** (`Pending Misc. Staff Approval → PENDING_APPROVAL`) — the same transition that publishes Fund Received's own event. Implemented in `_process_linked_loan_settlements()` in `fund_received.py`, called from `perform_fund_received_action` right after the Fund Received publish block and wrapped in its own try/except.

Because of that ordering, **every field in the payload is populated at publish time**, including `settlementMode` and `remarks` — there is exactly one message per settlement and no update problem. The samples in §7.5 omit those two keys only to show the shape when they're genuinely absent; in the real flow they will be present:

```json
"settlementMode": "PFMS",
"remarks": "Adjusted against April fund release"
```

If a settlement is ever **rejected** by staff rather than processed (Open Question 5), nothing is published at all — the event only represents a settlement that actually went through.

### 7.8 Responses on `event.responses` (optional, not in scope for v1)

The Accounts service publishes an `EventResponse` per processed message. For the singular topic we'd use (§7.6):
```json
{
  "responseId": "...",
  "originatingEventId": "LOAN_SETTLEMENT-20260808LNST00001",
  "status": "COMPLETED",
  "message": "Loan settlement processed successfully",
  "responseTimestamp": "2026-08-08T10:15:31.000000",
  "processingDurationMs": 42
}
```
`originatingEventId` embeds our `loanSettlementNumber`, so each response maps cleanly back to exactly one `Loan Settlement` doc.

For reference, the batch topic's failure response names the first failing row (this is the improvement that removed my earlier objection in §7.6, even though we're still not using batch):
```json
{
  "originatingEventId": "LOAN_SETTLEMENT-batch",
  "status": "FAILED",
  "message": "Loan settlement batch failed: Batch aborted at item 1 (loanSettlementNumber=LSN-2026-00988): Loan not found: 9999",
  "metadata": "{\"error\":\"Batch aborted at item 1 (loanSettlementNumber=LSN-2026-00988): Loan not found: 9999\"}"
}
```
Batch `status` is `"COMPLETED"` only if **every** row saved (or was already-processed); any single failure flips the whole message to `"FAILED"` with nothing persisted.

We are **not** planning to consume `event.responses` in v1 (no consumer infrastructure for it exists in `rndopsapp` today, and the flow doesn't currently need confirmation to proceed). Worth revisiting if we want the `Loan Settlement` doc to reflect a "confirmed by Accounts" state rather than just "published," or to surface DLQ'd settlements to staff — flagged as Open Question 13.

**Error/DLQ reference** (their side, for debugging):

| Error type | When |
|---|---|
| `JSON_PARSE_FAILURE` | Envelope isn't valid JSON |
| `DTO_MAPPING_FAILURE` | `data` doesn't match the expected object/array shape |
| `VALIDATION_ERROR` | Missing required field, `settlementAmount <= 0`, empty batch array |
| `PROCESSING_ERROR` | Loan not found, DB error, etc. |

DLQ payload is always the original raw JSON, unchanged — safe to replay after fixing the issue.

## 8. Staff, RnD processing

**Primary path — on the Fund Received page** (`FundReceivedDetails.tsx`): each pending settlement in the "Loan Settlement(s) Requested" card gets an inline **Settlement Mode** select and **Remarks** input, shown when `isRndMiscellaneous || isRndStaff` and the settlement is still `Pending Staff Processing`. Values are collected in local state and passed to the backend via the existing `onBeforeAction` hook when **Forward** is clicked; `handleBeforeAction` blocks the Forward (with a list of the offending loans) if any mode is missing. The backend (`_process_linked_loan_settlements`, §5.4 part b) then marks each settlement `Processed`, stores mode/remarks, and publishes.

The card sits **above** the Budget Breakup and shows each settlement's **head-wise return** in a small table, so staff can see exactly which budget heads the money goes back to before forwarding.

**Secondary path — standalone page** (`/loan-settlement/:id`), following the `LoanRequestDetails.tsx` template. Retained for the full detail view and the **Retry Publish** action; it also still offers Process/Reject for a settlement that was never forwarded:
- **Route**: `main.tsx` → `path: "loan-settlement/:id"` → `<LoanSettlementDetails />` (imported from `pages/application/`).
- **Wiring**: one-line additions to `PendingTaskDetails.tsx`'s doctype→route map and `TaskRegistry.tsx`'s navigation branch (mirroring the existing `"Loan Request"` entries).
- **Staff-only block**, gated on `workflowState === "Pending Staff Processing" && roles.includes("staff, RnD")`:
  - **Remarks** — textarea.
  - **Settlement Mode** — Select: `Physical`, `PFMS`, `Offline`, `Online`.
  - Submit → `perform_loan_settlement_action(docname, "Process")`, which:
    1. Saves both fields onto the `Loan Settlement` doc.
    2. Transitions `workflow_state` to `Processed`. *(This state is bookkeeping on our side only — the loan's outstanding balance always comes live from the Accounts service, §4, and is never rolled up from our own workflow states.)*
    3. **Publishes to `loan-settlement-events`** with the now-complete payload (§7.7) and records the outcome in `publish_status`/`publish_error` (§10.3).

    Steps 1–2 must succeed independently of step 3: a Kafka failure records `publish_status = Failed` and leaves the doc `Processed` (retryable via §10.4) rather than blocking staff or rolling back the workflow transition.

> **Three code paths publish, one function does it.** `_process_linked_loan_settlements` (primary, above), `perform_loan_settlement_action` (this standalone page), and `retry_publish_loan_settlement` (§10.4) all funnel through **`_publish_and_record`** in `loan_settlement.py`. That is the single place where a settlement is handed to Kafka and its outcome written back, so the publish rules — never raise, always record `publish_status`/`publish_error` — hold identically no matter which route triggered it.
- Read-only display of everything captured at request time (loan, project, requester, settlement type/amount/date, linked Fund Received) above the staff-input block, same layout convention as `LoanRequestDetails.tsx`'s BMR section.
- **`publish_status` badge** (§10.3) plus the **"Retry Publish"** button when it's `Failed` (§10.4).

## 9. Workflow states — `Loan Settlement` (new, DB-configured `Workflow`, no JSON fixture — matching this app's convention for every other workflow doctype)

```
Pending Staff Processing --Process--> Processed
                         --Reject---> Rejected
```
Minimal three-state workflow; no multi-level approval chain was requested, so none exists. Both transitions are restricted to `staff, RnD` (with `System Manager` always permitted, matching the other workflows in this app). `Rejected` was built rather than left out (Open Question 5) — without it a mistaken request could only be left hanging, and nothing is published for a rejected settlement, so no Accounts-side reversal is needed.

Created by `patchs/create_loan_settlement_workflow.py` (§11), not a JSON fixture.

## 10. Keeping Frappe and Accounts in sync (failure handling)

Whichever topic we choose (§7.6), a settlement can still fail to reach the Accounts service — a loan closed on their side in the meantime, a Kafka outage, a validation rejection. When that happens the two systems disagree: Frappe shows a settlement that Accounts never recorded.

Picking the batch topic doesn't solve this — it only changes *how many* records diverge (all of them instead of one). So rather than trying to pick a topic that can't fail, the design makes failures **rare, visible, and fixable**, in four layers.

### 10.1 Prevent — re-validate against Accounts before saving

There's a real time gap in this flow: the modal fetches the loan list when the Fund Received page opens (§5.1), the user then fills in the whole form, and only submits minutes later. A loan's state on the Accounts side can change in between.

So `save_loan_settlement_requests` (§5.2) **re-queries the Accounts service and re-validates every selected loan** before creating any `Loan Settlement` doc:
- The loan still exists (`GET /api/loan-settlement/loan/{loanNumber}/summary` returns successfully).
- Its `updatedLoanStatus` is still not `SETTLED`.
- Its `outstandingAmount` is still `> 0`.
- The requested `settlement_amount` is `> 0` and `<= outstandingAmount` — recomputed against the **fresh** figure, not the one the modal displayed.
- For a **Full** settlement, `settlement_amount` is reset server-side to the fresh `outstandingAmount` rather than trusting whatever the client sent (so a stale "full" amount can't under- or over-settle).

If any check fails, return the error to the modal and create **nothing** — the user is still on screen and can react (deselect that loan, adjust the amount, or pick a different loan). This is the highest-value layer: it catches the most likely failure ("loan not found" / already settled) at the one moment a human is present to fix it, instead of letting it surface later inside a background Kafka publish where nobody sees it.

### 10.2 Limit the blast radius — singular topic

If something still slips through, only that one settlement is affected rather than every loan settled alongside it (§7.6).

### 10.3 Detect — record the publish outcome per settlement

`perform_loan_settlement_action` (§8) knows whether the publish succeeded; simply logging a failure would leave the divergence invisible. Instead, write the result onto the doc:

```python
# inside perform_loan_settlement_action, after the workflow transition to "Processed"
try:
    publish_loan_settlement(settlement_doc)
    frappe.db.set_value("Loan Settlement", settlement_doc.name, {
        "publish_status": "Published",
        "publish_error": None,
    })
except Exception as e:
    frappe.db.set_value("Loan Settlement", settlement_doc.name, {
        "publish_status": "Failed",
        "publish_error": str(e)[:500],
    })
    frappe.log_error(frappe.get_traceback(), "Loan Settlement Publish Error")
```

The publish is deliberately **outside** the transaction that saves remarks/mode and transitions the workflow — a Kafka outage must not prevent staff from completing their work or roll back a legitimate `Processed` state. The settlement simply sits at `publish_status = Failed` until retried (§10.4).

`publish_status` is surfaced as a badge on the `Loan Settlement` details page (§8) and is filterable in list views, so a stuck settlement is discoverable rather than silent.

> Caveat worth being honest about: `Published` here means *"handed to Kafka successfully,"* not *"Accounts persisted it."* A message can still be rejected downstream and land in the DLQ. Closing that last gap requires consuming `event.responses` — deliberately out of scope for v1 (§7.8, Open Question 13).

### 10.4 Recover — a "Retry Publish" action

Because `loanSettlementNumber` is the Accounts service's idempotency key (§7.4), **re-publishing the exact same settlement is completely safe** — a duplicate is skipped and reported as already-processed, never double-inserted. That makes recovery trivial:

- A **"Retry Publish"** button on the `Loan Settlement` details page, shown only when `publish_status == "Failed"`, restricted to `staff, RnD` / `System Manager`.
- It re-runs the same publish call and updates `publish_status` / `publish_error` again.
- Zero double-settlement risk, so it's safe to press repeatedly and safe to expose to staff rather than reserving it for a developer.

This also softens the orphaned-record scenario (Open Question 9): a settlement created but never linked/published simply sits at `publish_status = Pending`, visible and retryable.

### 10.5 Net effect

| Layer | Handles |
|---|---|
| 10.1 Re-validate before saving | Most failures never happen; user fixes them in the modal |
| 10.2 Singular topic | A failure costs one settlement, not all of them |
| 10.3 `publish_status` / `publish_error` | Divergence is visible instead of silent |
| 10.4 Retry Publish | One-click, risk-free recovery |

This is a stronger position than choosing the batch topic for atomicity — batch's "all or nothing" still leaves Frappe and Accounts disagreeing in the *nothing* case, just about more records at once.

## 11. File inventory (as built)

**Backend** (`rndopsapp/rndopsapp/`)
- `doctype/loan_settlement/` (new DocType: `.json`, `.py`, `__init__.py`). DocType carries `publish_status` + `publish_error` (§4) and the `budget_breakup` table (§4a). Nine whitelisted endpoints:

  | Endpoint | Purpose |
  |---|---|
  | `get_active_loan_for_project` | Modal's loan list, enriched with live balances + budget heads (§5.1) |
  | `save_loan_settlement_requests` | Create settlements from the modal, incl. re-validation (§5.2, §10.1) |
  | `discard_loan_settlement_requests` | Delete drafts so Edit can recreate them (§5.2c) |
  | `get_settlement_requirements` | What the Fund Received must carry (§5.2a) |
  | `get_loan_settlements_for_fund_received` | Read-only listing + head-wise split for the receipt page |
  | `get_loan_settlement_details` | Full doc for the standalone staff screen |
  | `get_loan_settlement_workflow_actions` | Available actions for the current user |
  | `perform_loan_settlement_action` | Staff Process / Reject (§8) |
  | `retry_publish_loan_settlement` | Re-publish a failed settlement (§10.4) |

  Plus module-level helpers: `get_loan_settlement_summary`, `_budget_head_map`, `_loan_budget_heads`, `_prorate` (§4a.1), `_validate_partial_breakup`, `_publish_and_record`.
- `doctype/loan_settlement_budget_breakup/` (new child DocType: `.json`, `.py`, `__init__.py`) — §4a. *(A child DocType still needs its controller `.py`; without it `bench migrate` fails with `ImportError: Module import failed for ...`.)*
- **Note:** `get_active_loan_for_project` and the outstanding-balance lookup live in `loan_settlement.py`, **not** in `loan_request.py` as an earlier draft of this plan proposed — everything loan-*settlement* related is in one module.
- `doctype/fund_received/fund_received.py` — additive-only block in `perform_fund_received_action` (§5.4/§10.3) plus `_validate_against_loan_settlements` called from `submit_fund_received` (§5.2b); no existing lines change.
- `kafka/producer/loan_settlement/` (new: `dto.py`, `mapper.py`, `producer.py`, `validator.py`, `__init__.py`).
- `kafka/config.py` — 5 new constants + `ALL_PRODUCER_TOPICS` append:
  ```python
  TOPIC_LOAN_SETTLEMENT           = 'loan-settlement-events'
  TOPIC_LOAN_SETTLEMENT_BATCH     = 'loan-settlement-events-batch'
  TOPIC_LOAN_SETTLEMENT_DLQ       = 'loan-settlement-events-dlq'
  TOPIC_LOAN_SETTLEMENT_BATCH_DLQ = 'loan-settlement-events-batch-dlq'
  SCHEMA_VERSION_LOAN_SETTLEMENT  = '1.0'
  ```
  Both topics are declared even though only the singular one is published to (§7.6), so switching is a one-line change.
- `kafka/producer/__init__.py` — **not modified.** `loan_request` sets the precedent of importing directly (`from rndopsapp.rndopsapp.kafka.producer.loan_settlement import publish_loan_settlement`) rather than re-exporting. Adding a module-level import to the shared `__init__` would mean an import error in this new module could break Fund Received's own Kafka publish, for no benefit.
- `patchs/create_loan_settlement_workflow.py` (new) — creates the DB-configured `Workflow` doc for `Loan Settlement` (§9). Frappe workflows live in the database, not as JSON fixtures, so they are created by a migration patch — the same convention as `add_travel_director_approval_workflow.py`. It also creates the `Workflow Action Master` records first; a `Workflow Transition.action` is a Link, so a missing master fails the patch with `LinkValidationError`.
- `patches.txt` — one line appended under `[post_model_sync]`: `rndopsapp.patchs.create_loan_settlement_workflow`. Without it the patch never runs on other environments and the workflow silently doesn't exist.

**Frontend** (`src/`)
- `pages/AddFundReceived.tsx` —
  - new blocking `LoanSettlementModal` (loan list, select-all, per-loan Full/Partial, per-head return table, `balance_unavailable` handling, Settle the Loan / Keep Existing, and the Edit re-open flow of §1.5a), surfacing §10.1's re-validation errors inline;
  - `prorate()` mirroring the server's Full split (§4a.1);
  - `applySettlementRequirements(req, prevReq)` prefilling the form, backing out a superseded requirement on Edit, and locking the affected fields (§6);
  - `MemoizedBudgetBreakupTable` gains `settlementHeads` / `settlementLocked`: settlement-bound rows are highlighted, their head is fixed, they cannot be deleted, and their amount is read-only when `exact` (or floor-checked when not);
  - `handleSubmit` mirrors the backend total/per-head checks and appends `doc_data.loan_settlement_refs` (§5.3/§6);
  - `type="button"` added to the Add/Delete row buttons — see §6.1.
- `pages/FundReceivedDetails.tsx` — "Loan Settlement(s) Requested" card above the Budget Breakup: per-settlement head-wise return table, plus the staff-only inline Settlement Mode / Remarks inputs and the `handleBeforeAction` gate that blocks Forward until every pending settlement has a mode (§8).
- `pages/application/LoanSettlementDetails.tsx` (new) — staff, RnD processing screen (§8) + `publish_status` badge and the "Retry Publish" action (§10.3/§10.4).
- `main.tsx` — new `loan-settlement/:id` route → `<LoanSettlementDetails />`.
- `pages/PendingTaskDetails.tsx`, `pages/TaskRegistry.tsx` — one-line doctype→route additions each.
- `services/apiService.ts` — new `loanSettlementAPI` endpoint group (incl. `saveRequests`, `discardRequests`, `retryPublish`).

## 12. Open Questions

### Resolved

1. ~~Exact Kafka topic string.~~ **`loan-settlement-events`** (singular) and **`loan-settlement-events-batch`** (array) — both live with consumers built. Frappe is producer-only (§7.1).
2. ~~Payload field casing + envelope.~~ **camelCase**, inside the `{schemaVersion, eventType, timestamp, data}` envelope — exactly what this codebase's other producers already emit (§7.2, §7.3).
3. ~~`settlementdate` — request or actual settlement date?~~ `settlement_date = today` at settlement-creation time (§5.2). Optional on their side anyway.
4. ~~Does staff's remarks/settlement-mode need to reach Accounts?~~ **Yes — resolved by delaying the publish until staff completes processing** (§1 timing note, §7.7, §8). One message per settlement, complete payload including `settlementMode`/`remarks`, no idempotency/update problem. Accepted trade-off: Accounts learns of the settlement later than Fund Received's own event. Bonus: `fund_received.py` no longer needs a Kafka block at all (§5.4).
6. ~~Multiple active loans on one project.~~ Checklist + "Select All" + per-loan Full/Partial (§6).
11. ~~`null` vs `""` for not-yet-known fields.~~ Moot now — with the delayed publish, both fields are populated. Optional-key omission still applies if either is genuinely left blank (§7.5).
10. ~~Where does the outstanding amount come from?~~ **`GET /api/loan-settlement/loan/{loanNumber}/summary`** — response shape confirmed (§3.2). `outstandingAmount` is read live from the Accounts service and never reconstructed in Frappe (§4), so it stays correct even for settlements recorded through other channels. Also yields `totalSettled` and `updatedLoanStatus` for free.
12. / 15. ~~Singular vs batch topic.~~ **Singular** (`loan-settlement-events`, one message per settled loan, §7.6). A failure costs one settlement rather than silently discarding every settlement in the same Fund Received.
16. ~~Shape of the head-wise breakup rows.~~ **`{accountHeadId, amount}` and nothing else** — confirmed by Accounts. The parent settlement already carries the loan/settlement/project identity, so repeating it per row was redundant (§7.3).
17. ~~How does Accounts tie a settlement to its receipt?~~ **`fundReceivedRefNumberFap`** — the Fund Received docname, the same value Fund Received's own producer publishes under that key. Required, and validated as **blocking** (§7.3).
18. ~~Can the user skip settlement ("Settle Later")?~~ **No.** An outstanding loan must be settled from the receipt; the button and its `onDefer` path were removed outright (§1.5). Revising a settlement afterwards is handled by Edit instead (§1.5a).
19. ~~How is a **Full** settlement split when the loan is already partially settled?~~ **Proportionally to how much each head drew** (`_prorate()`, §4a.1). Degrades to "the full amount against every head" when nothing has been settled yet, which is the plain requirement. Forced by the Accounts service exposing no per-head settled figures — revisit if it ever does.

### Decisions taken — built as stated below

None of these changed the architecture, and all remain cheap to change.

| # | Question | **As built** |
|---|---|---|
| 5 | Should staff be able to **reject** a settlement request (e.g. wrong amount)? | **Yes — include a `Rejected` state** (§9). Costs nothing, and without it a mistaken request can only be left hanging. Nothing is published for a rejected settlement, so no Accounts-side reversal is needed. |
| 7 | For a **Full** settlement, is the amount locked or editable? | **Locked**, and re-derived server-side from the fresh `outstandingAmount` (§10.1) — "Full" should mean *actually* full, not whatever figure the client had. Partial remains free-entry, capped at outstanding. |
| 8 | Also call `POST /api/loan-settlement` directly, or Kafka only? | **Kafka only**, as specified. A direct REST call would be redundant (their idempotency key would dedupe it, but it's a second path to maintain for no gain). |
| 9 | Cleanup for an orphaned settlement if the Fund Received is abandoned? | **No automatic cleanup for v1.** It stays visible at `publish_status = Pending` / `Pending Staff Processing` and staff can reject it (Q5). Low risk now that nothing double-settles (§7.4). Revisit if it proves noisy. |
| 13 | Consume `event.responses` for true delivery confirmation? | **Not in v1** (§7.8). `publish_status` records "handed to Kafka"; closing the last gap needs new consumer infrastructure that doesn't exist in `rndopsapp` yet. Worth a follow-up if you want "confirmed by Accounts" or automatic DLQ detection. |
| 14 | `settlementMode` vocabulary: ours (`Physical`/`PFMS`/`Offline`/`Online`) vs. their examples (`BANK_TRANSFER`/`CASH`/`CHEQUE`) | **Send ours verbatim.** The field is free text and not enum-validated on their side, and ours is what the business asked for. Flag if anything downstream (reporting/reconciliation) expects their vocabulary and I'll add a mapping. |
15. **Singular vs. batch topic — now a business decision (§7.6).** With batch turned all-or-nothing, this is no longer about response granularity (they now name the failing row) but about **what should happen when one loan in a multi-loan settlement fails**:
    - **Singular (recommended):** the other settlements still land in Accounts; only the failed one DLQs. Resilient, but you can end up with 2-of-3 settled and one needing reconciliation.
    - **Batch:** nothing lands unless *everything* lands. Clean all-or-nothing state, but a single stale loan reference silently blocks otherwise-valid settlements — while Frappe has already created all the `Loan Settlement` docs and submitted the Fund Received.

    **Built as singular**, because these loans are independent (no invariant requires them to settle together) and their own guide says to reserve batch for settlements that *"genuinely belong together as one unit."* If you'd rather have strict atomicity per Fund Received, switching to the batch topic is a small, producer-only change.

### Still genuinely open

| # | Question | Status |
|---|---|---|
| 13 | Consume `event.responses` for true delivery confirmation | **Deferred.** `publish_status` records "handed to Kafka", not "Accounts persisted it" (§7.8, §10.3). Needs consumer infrastructure that doesn't exist in `rndopsapp` yet. |
| — | Per-head settled figures from Accounts | Not exposed today. Their absence is what forces proportional splitting on a partially-settled Full settlement (§4a.1) and means a Partial return is capped against the head's *original* draw, not its remaining balance. |
| — | Historic settlements without `fundReceivedRefNumberFap` | Published before the field existed; the idempotency key means re-publishing won't fix them. Needs correcting directly in Accounts if any matter. |
