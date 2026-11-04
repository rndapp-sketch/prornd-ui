# Loan Settlement — Inline in Fund Received (v2) — Implementation Plan

Status: **Frontend built** (`AddFundReceived.tsx`), **backend pending** (§4) — until §4.2 is deployed, submitting a receipt for a project with a loan will not create its settlements. Supersedes the modal-input flow in
[loan-settlement-implementation.md](loan-settlement-implementation.md) §1.4–§1.6, §1.5a, §5.2, §5.2c and §6.
Everything else in that doc (DocTypes, Kafka contract, staff processing, publish timing,
failure handling) stays as it is.

---

## 1. What changes, in one table

| | Today (v1) | v2 |
|---|---|---|
| Popup when project has a loan | Blocking modal: tick loans, pick Full/Partial, type amount, split head-wise, **Settle the Loan** | **Information only**: lists the loan(s) and their details, one button **Continue** |
| Where settlement is decided | In the modal, *before* the form | **In the form**, in a "Loan Settlement" section beside *Fund Received Amount* |
| Full / Partial | Chosen by the user | **Derived from the amount**: received < outstanding → Partial, received ≥ outstanding → Full. Shown, not typed |
| Settlement amount | Typed by the user | **Derived**: `min(fund received, outstanding)` |
| Money left over | Only allowed if a Full settlement was picked | `fund received − outstanding` is shown as **Available**, and goes into the Budget Breakup — to other heads or on top of the loan's own heads |
| When `Loan Settlement` docs are created | Separate call on **Settle the Loan**, before Fund Received exists | **Together with the Fund Received**, in the same submit call |
| Edit / Keep Existing / discard drafts | Needed, because settlements existed before the receipt | **Removed** — nothing exists until submit, so there is nothing to revise or discard |
| Kafka payload, publish timing, staff mode/remarks | — | **Unchanged** |

---

## 2. The allocation rule

Let

- `F` = Fund Received Amount (typed by the user)
- `O` = total outstanding across the project's loans (from `get_active_loan_for_project`)

| Case | Loans | Settlement amount | Budget Breakup |
|---|---|---|---|
| `F < O` | **Partial** | `F` — the whole receipt goes to the loan | Prorated split of `F` pre-filled; user **may adjust it** across the loan's heads (§2.2). Heads locked, total must equal `F`. Available = 0 |
| `F = O` (±0.01) | **Full** | `O` | Exactly the loan's head-wise split of `O`. Rows locked. Available = 0 |
| `F > O` | **Full** | `O` | Loan heads pre-filled with their return as a **minimum**; user may raise them or add other heads. **Available = F − O** must be fully allocated |

`F` is always the number that drives everything; there is no second amount field to keep in sync.

### 2.1 More than one loan

The user chooses, in the Loan Settlement section:

1. **Which loans** this receipt settles — a checkbox per loan, plus *Select all*. At least one
   must be ticked (settlement is mandatory, Q5). With a single loan it is ticked and fixed.
   `O` in the table above is the outstanding of the **ticked** loans only; unticked loans stay
   outstanding and get no settlement doc.
2. **How `F` is shared** when more than one loan is ticked — a selector with two options:
   - **Oldest first** (default) — by `loan_received_date`, then `ledger_loan_number`. Each loan is
     cleared in full before the next is touched, so at most **one** loan is Partial and loans
     after it get nothing (no settlement doc).
   - **Proportional** — `F` (capped at `O`) is split across the ticked loans in proportion to their
     outstanding (same 2 dp / largest-remainder rounding as `_prorate`). If `F < O` every ticked
     loan is Partial.

Example — loans A (outstanding 3,00,000) and B (2,00,000), both ticked, `F` = 4,00,000:

| Method | A | B | Available |
|---|---|---|---|
| Oldest first | Full 3,00,000 | Partial 1,00,000 | 0 |
| Proportional | Partial 2,40,000 | Partial 1,60,000 | 0 |

With `F` = 6,00,000 both methods give A Full 3,00,000 · B Full 2,00,000 · Available 1,00,000.

The chosen method is sent in the payload as `allocation_method` so the server can recompute the
same plan (§4.1). It is not stored on any DocType.

### 2.2 Head-wise split of each loan's settlement

**Default:** the existing `prorate(budget_heads, amount)` (frontend) / `_prorate()` (backend):
split in proportion to each head's `loan_amount`, rounded to 2 dp, rounding remainder on the
largest head.

- **Full** → the prorated split is final, read-only. Server derives it itself (as v1).
- **Partial** → the prorated split is only a **starting point**. The user can move money between
  the loan's budget heads:
  - only heads the loan was drawn against (no new heads — the whole receipt is going to the loan);
  - each head `0 ≤ amount ≤` that head's Loan Taken;
  - the heads must add up to the received amount `F` — **never more than `F`**. Less is not
    allowed either, since the whole receipt goes to the loan and Available stays 0. Until
    they match, the section shows *"₹x still to allocate"* / *"exceeds the received amount by ₹x"*
    and submit is blocked.
  - heads left at 0 are dropped (as v1 `_validate_partial_breakup`).

  The adjusted split is what goes into both the `Loan Settlement` budget breakup and the Fund
  Received Budget Breakup — they are always the same figures.

With several loans every Partial loan is adjustable, each one independently — its heads must
total **its own** settlement amount; Full loans stay prorated.

If `F` changes after the user has adjusted the split, the split resets to the prorated default
for the new amount (a hand-tuned split for a different total is not meaningful).

---

## 3. Frontend — `src/pages/AddFundReceived.tsx`

### 3.1 Info modal (replace `LoanSettlementModal`)

Keep the fetch (`loanSettlementAPI.getActiveLoansForProject`) and the trigger condition
(`activeLoans.length > 0`). The modal becomes read-only:

- Header: "This project has an outstanding loan" / "…N outstanding loans".
- One card per loan: reference, loan amount, settled so far, **outstanding**, type, received date,
  status, and the budget heads table (*Head · Loan Taken*).
- Note: *"The amount you enter as Fund Received will be used to settle this loan first. Any
  amount above the outstanding balance can be allocated to budget heads."*
- Single button **Continue**. No checkboxes, radios, amount input or head inputs.

Remove from the component: `selections`, `canSettle`, `handleSettle`, `saveRequests` /
`discardRequests` calls, `isEditing`, `initialSelections`, `previousRefs`, `onCancelEdit`.

### 3.2 Derived settlement (replaces stored state)

Delete the state that only existed for the modal round-trip:
`loanSettlementRefs`, `settlementReq`, `settlementSelections`, `editingSettlement`, and
`applySettlementRequirements` (including its back-out-previous-requirement logic).

Replace with one `useMemo` derived from `formData.fund_received_amt`, `activeLoans`, and one
small pieces of state:

- `selectedLoans: number[]` (ledger loan numbers; all ticked by default),
- `allocationMethod: "oldest_first" | "proportional"` (default `oldest_first`),
- `partialSplitOverride: Record<loanNo, Record<budgetHead, number>>` — the user's adjusted splits
  for Partial loans, cleared whenever `F`, `selectedLoans` or `allocationMethod` changes:

```ts
interface DerivedSettlement {
    loan: ActiveLoan;
    settlement_type: "Full" | "Partial";
    settlement_amount: number;
    heads: { budget_head: string; label: string; amount: number }[]; // prorate()
}

const loanAllocation = useMemo(() => {
    // filter to selectedLoans, share F by allocationMethod (§2.1), prorate each (§2.2),
    // then apply partialSplitOverride
    return { settlements: DerivedSettlement[], loanTotal, available, exact /* F <= O */ };
}, [formData.fund_received_amt, activeLoans]);
```

Because it is derived, changing `F` instantly re-plans everything — no Edit button needed.

### 3.3 "Loan Settlement" section beside Fund Received Amount

Rendered directly after the `fund_received_amt` field (where the current banner sits, ~line 2596):

- Top of section: *Select all* + per-loan checkboxes, and (when ≥2 ticked) the
  **Oldest first / Proportional** selector (§2.1).
- Per loan: checkbox, reference, outstanding, and a **read-only** Full / Partial indicator (radio-styled,
  disabled) showing what was auto-selected, plus "Settling ₹X" and the head-wise split
  (*Head · Loan Taken · Return*). For the Partial loan the Return column is an input (§2.2) with
  an *"Allocated ₹x of ₹F"* counter; for Full loans it is read-only.
  Loans that receive nothing show "Not settled from this receipt".
- Summary line: **Received ₹F · To loan ₹min(F,O) · Available ₹max(F−O,0)**.
- Before `F` is entered: show outstanding only, with "Enter the Fund Received Amount".

### 3.4 Budget Breakup table

Reuse the existing `settlementHeads` / `settlementLocked` props of the breakup component (~line 359),
now fed from `loanAllocation` instead of `settlementReq`:

- Loan-return heads are auto-inserted/updated as `F` changes (head written by **label**, as today, §4a.2 of v1).
  - `exact` (F ≤ O): amount locked in the table, head locked, row not deletable. User cannot add
    rows (nothing is available). For a Partial settlement the amounts are changed in the Loan
    Settlement section (§3.3), and the table follows.
  - not `exact` (F > O): head locked, row not deletable, amount editable but **≥ return**.
    User can add rows for other heads.
- Footer counter: *"Available ₹A — allocated ₹x, remaining ₹y"*.
- Auto-sync must only touch the loan's own share — rows the user added, and any amount they
  added on top of a loan head, are kept when `F` changes. (Track the previously-applied
  allocation in a ref and apply the difference, rather than overwriting the row.)

### 3.5 Validation on submit (client side, mirrors server)

Replace the `settlementReq` checks (~line 2034) with:

1. Breakup total = `F` (existing check, unchanged).
2. Each loan head row ≥ its return (`= ` when `exact`).
3. Partial split: every head within `0…Loan Taken`, heads total exactly that loan's settlement
   amount (§2.2).
4. At least one loan ticked (§2.1, Q5).
5. Any loan with `balance_unavailable` (ticked or not) blocks submit, with a Retry button — Q3.

### 3.6 Submit payload

Replace `dataToSubmit.loan_settlement_refs = …` (~line 2254) with a non-schema key, popped by the
backend exactly as `loan_settlement_refs` is today:

```json
"allocation_method": "oldest_first",
"selected_loans": [7],
"loan_settlements": [
  {
    "loan_reference": "LR-0007",
    "ledger_loan_number": 7,
    "settlement_type": "Partial",
    "settlement_amount": 100000,
    "loan_amount": 500000,
    "project_number": "P-2025-001",
    "budget_breakup": [
      { "account_head_id": 12, "account_head": "gu12bngg1u", "return_amount": 100000 }
    ]
  }
]
```

`budget_breakup` keeps v1's row shape, so `_validate_partial_breakup()` takes it unchanged; it is
sent for Full loans too (the server ignores it there). Absent when the project has no active loans. The server treats it as a **claim to verify**, not
as truth (§4.2).

### 3.7 Other frontend files

- `src/services/apiService.ts` — leave `saveRequests` / `discardRequests` in place (still used by
  nothing new; remove after backend cleanup, §4.4).
- `FundReceivedDetails.tsx`, `LoanSettlementDetails.tsx`, staff mode/remarks card — **no change**;
  they read linked settlements by `fund_received_reference`, which is still set.

---

## 4. Backend — `rndopsapp` (source not in this workspace; paths per v1 doc §11)

### 4.1 Extract a shared planner in `loan_settlement.py`

```python
def plan_settlements(project_name, fund_received_amt, selected_loans, allocation_method) -> list[dict]:
    """Fresh outstanding + heads from Accounts, restricted to selected_loans,
    F shared oldest-first or proportionally, _prorate each."""
```

Used both to validate the client claim and to build the docs. Re-reads the Accounts service
(same freshness rule as v1 §10.1).

### 4.2 `submit_fund_received` (`fund_received.py`)

Before anything is written:

1. Pop `loan_settlements`, `selected_loans`, `allocation_method` from `doc_data`.
2. If the project has active loans: reject if `selected_loans` is empty or names a loan not
   active on this project; then
   `expected = plan_settlements(project, fund_received_amt, selected_loans, allocation_method)`.
   Reject if the client's list differs from `expected` in loan, type or amount (±0.01) —
   message: *"Loan balance changed since the form was opened — please reload."*
   Head split: for **Full** loans the server uses its own prorated split and ignores the client's;
   for the **Partial** loan it accepts the client's split after `_validate_partial_breakup()`
   (loan's own heads only, each ≤ Loan Taken, none negative, total = settlement amount = `F`).
   If the project has active loans and `loan_settlements` is missing, reject.
3. Validate the breakup: each loan head ≥ its return, `=` when `F ≤ O`
   (adapt `_validate_against_loan_settlements` to take the plan instead of settlement names).

Then, **in the same transaction**:

4. Save + Submit the Fund Received as today.
5. Create one `Loan Settlement` per planned entry (fields as v1 §5.2 step 3) with
   `fund_received_reference = docname` set **at creation** — the separate linking step of
   v1 §5.4(a) goes away.
6. Single commit. Any failure in 4–5 → `frappe.db.rollback()`; neither doc exists.

> Must check: if `perform_fund_received_action("Submit")` commits internally, step 5 has to run
> before that commit (or the commit moved out), otherwise a settlement failure would leave a
> Fund Received without its settlements.

### 4.3 Unchanged

`perform_fund_received_action` Forward hook (`_process_linked_loan_settlements`), Kafka mapper /
producer / validator, payload (`loanSettlementBudgetBreakupDetails`, `fundReceivedRefNumberFap`,
…), `loanSettlementNumber` idempotency, publish status + Retry Publish, Loan Settlement workflow.

### 4.4 Deprecate

`save_loan_settlement_requests`, `discard_loan_settlement_requests`, and `get_settlement_requirements`
are no longer called by the form. Keep them one release (unlinked v1 drafts may exist), then remove.
Any existing unlinked draft settlements can be cleaned up with `discard_loan_settlement_requests`'s
existing guards.

---

## 5. Test cases

| # | Setup | `F` | Expect |
|---|---|---|---|
| 1 | No loans | any | No popup, no section, payload has no `loan_settlements` |
| 2 | 1 loan, O = 5L | 2L | Partial 2L; breakup = prorated 2L, locked; Available 0 |
| 2a | same, heads Manpower/Equipment | 2L, adjust to 1.5L + 0.5L | submits; both breakups show 1.5L / 0.5L |
| 2b | same | 2L, adjust to 1.5L + 0.8L | blocked — exceeds received amount by 0.3L (client + server) |
| 2c | same | 2L, adjust to 1.5L + 0.3L | blocked — 0.2L still to allocate |
| 2d | same | 2L, one head above its Loan Taken | blocked |
| 3 | same | 5L | Full 5L; breakup locked; Available 0 |
| 4 | same | 8L | Full 5L; loan heads ≥ return, editable; Available 3L must be allocated |
| 5 | same, case 4 | raise a loan head by 1L, add other head 2L | submits |
| 6 | same, case 4 | lower a loan head below its return | blocked client + server |
| 7 | A=3L, B=2L, both ticked, Oldest first | 4L | A Full 3L, B Partial 1L |
| 7a | same, Proportional | 4L | A Partial 2.4L, B Partial 1.6L, each split adjustable to its own total |
| 8 | A=3L, B=2L, Oldest first | 2L | A Partial 2L, B not settled (no doc) |
| 8a | A=3L, B=2L, only B ticked | 3L | B Full 2L, Available 1L, A untouched |
| 8b | two loans, none ticked | any | blocked — at least one loan required |
| 9 | Change `F` 8L → 2L after adding other heads | | Other-head rows flagged; breakup total ≠ F blocks submit |
| 9a | Accounts `/summary` fails for one loan | any | Section shows error + Retry; submit disabled; server rejects too. Retry after service recovers → normal flow |
| 10 | Outstanding changes in Accounts between load and submit | | Server rejects, nothing written |
| 11 | Settlement creation throws | | Fund Received rolled back too |
| 12 | Staff Forwards | | Kafka messages identical in shape to v1 |

---

## 6. Open questions

- ~~**Q1** Multiple loans: oldest-first or proportional?~~ **Decided:** user selects which loans,
  and chooses Oldest first / Proportional (§2.1).
- ~~**Q2** Partial: auto head split only, or let the user adjust it?~~ **Decided:** the user can
  adjust it across the loan's budget heads, total not more than the received amount (§2.2).
- ~~**Q3** A loan whose balance the Accounts service can't report?~~ **Decided: block submit.**
  The loan list is known but that loan's outstanding is not, so Full/Partial, the settlement
  amount and Available can't be computed — and a wrong guess can't be corrected later
  (`loanSettlementNumber` is an idempotency key). The Loan Settlement section shows
  *"Couldn't get this loan's balance from the Accounts service — please try again shortly"* with a
  **Retry** button (re-runs `get_active_loan_for_project` via SWR `mutate`); submit stays disabled
  until every loan's balance is known. Server enforces the same: `plan_settlements` raises if any
  active loan's summary call fails.
- **Q6** (not answered — built as fail-open) The loan *list* call itself fails: the form proceeds
  as if the project has no loans, as before. Blocking would stop every Fund Received, loans or
  not, whenever the Accounts service is down. Revisit if strictness matters more.
- ~~**Q4** Editing an existing Fund Received with linked settlements~~ **Decided:** server discards
  its linked, unpublished settlements (existing guards) and recreates them from the new plan in
  the same transaction. Published ones make the receipt's amount non-editable.
- ~~**Q5** Optional settlement?~~ **Decided:** mandatory — at least one loan must be settled from
  the receipt; there is no "skip".

---

## 7. Related entry points (built)

- **PI home page** — `components/dashboard/PendingLoansAlert.tsx`: reminder card in Overview listing the
  PI's projects that still have an outstanding loan.
- **Project page → Quick Actions → Loan → Loan Request**:
  - A second status badge under an **Approved** Loan Request:

    | Badge | When |
    |---|---|
    | Unsettled | Accounts lists the loan as open, nothing repaid |
    | Settlement Submitted · *stage* | A `Loan Settlement` linked to a Fund Received is still `Pending Staff Processing` |
    | Partially Settled | Still open in Accounts, and `PARTIALLY_SETTLED` or a settlement has been `Processed` |
    | Settled | A `Processed` Full settlement, or no longer open in Accounts after a `Processed` one |

    If neither source can say for sure (Accounts down, or settled outside this app), no badge is shown.
  - A **Settle** button next to *View* (Unsettled / Partially Settled only, project has a sanction):
    opens Add Fund Received with `?settle_loan=<Loan Request>`, which starts with only that loan ticked.
