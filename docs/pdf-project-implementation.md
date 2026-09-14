# PDF Project (Personal Development Fund) — Implementation Plan

Status: **Stage 1 (reading) implemented and verified. Stage 2 (spending) blocked** on the Accounts team
building their overhead Kafka consumers — see §5.4. Cross-checked against their *"Overhead Commit/Payment
Kafka Consumption & Module Logic"* design (2026-08-04); §5.4, §5.5 and §5.7 were corrected against it.

**Built** — `pdf_fund.py` (new module: minting, ownership guard, balance, ledger, permission condition),
the `is_pdf_project` / `pdf_employee_id` fields and the `PDF` project type, the Kafka publish suppression,
the balance branch in `get_project_available_amounts`, removal of the guest-accessible balance clone, and
all of §6 and §7 on the frontend.

Verified against live data: `PDF1411` (₹6,250, credit only) and `PDF804` (₹1,30,000 credited less a
₹1,00,000 loan, netting ₹30,000) both mint, list under the new PDF tab, and resolve their balance and
ledger through the overhead API. A second Permanent Employee is denied on every path and cannot see either
project in a list at all.

**Four implementation notes that differ from the plan above:**
- Minting sets `workflow_state` + `docstatus` via `frappe.db.set_value` rather than `doc.submit()`. The
  workflow engine correctly refuses a Draft → Approved jump, and a PDF project is pre-approved by
  definition; this is the same escape hatch `project_registration.py` already uses to roll a state back.
- `User` has no `department` / `designation` columns in this install — the fields are `department_name`
  (already a `Department_prornd` docname) and `designation_name`.
- `project_type` is `PDF`, not `Other` (§4) — required by both the list tab and the overview sections.
- The commit head is **locked to `Overhead`**, not hidden (§5.5/§6.5).

Every Accounts endpoint below was called live against `172.16.135.27:18083` with real data; every code
reference was checked against the working tree. Only read endpoints were exercised — nothing was committed
or paid.

> **Deploying this? Read [§12, the change record](#12-change-record--for-live-migration-and-troubleshooting)**
> — every file touched, why, blast radius, how to verify, and how to roll each piece back.

## 1. Requirement

1. Every **Permanent Employee** sees a **PDF project** in their project list — inbuilt, present on login, not something they register.
2. Opening it behaves like a **normal approved project**: the same application modules, already registered and already approved.
3. It is **pre-registered and pre-approved** — it never passes through the Project Registration workflow.
4. A PI has **exactly one** PDF project, so the employee is a sufficient key for everything behind it.
5. Balances, transactions and spending come from the **Accounts service's PDF fund**, which already exists (§3).
6. **A PI sees only their own PDF transactions and only their own PDF total.** No colleague's balance, no
   institute-wide pool. This is a hard requirement, and the current permission model does **not** give it
   for free — see §5.6.

## 2. Current state (verified in code)

Three facts make this cheap. None of them need changing.

| What | Where | Consequence |
|---|---|---|
| The project list queries `Project Registration` filtered on `pi_webmail = currentUser` | [ProjectsView.tsx:446](../src/pages/ProjectsView.tsx#L446) | Any row naming the user **appears automatically**. No allow-list, no special case, no frontend change. |
| `workflow_state === "Approved"` routes to `/project-details-overview/:name` | [ProjectsView.tsx:1210](../src/pages/ProjectsView.tsx#L1210) | An approved row **opens the full application view**. No new route. |
| `isModuleLocked = !hasFunds`, where `hasFunds = commitableBalance > 0 \|\| actualBalance > 0` | [ProjectDetailsOverview.tsx:1083](../src/pages/ProjectDetailsOverview.tsx#L1083) | Modules unlock purely on **a positive balance**. Nothing else gates them. |

Balances come from `get_project_available_amounts(project_number)`
(`commitPayment.py:509`) → `GET /total-available-amounts?projectNumber=…`.

**`Project Registration` is forgiving.** 175 fields, but only **five** are mandatory:
`project_title`, `implementation_department`, `project_type` (`Research`/`Consultancy`/`Other`),
`designation`, `applicant_department`. Autoname is
`format:{YYYY}{MM}{DD}{01}{fund_agen_initials}{######}`; the doctype is submittable.

**PDF already flows into Accounts.** `disbursal_of_consultancy.py` splits each disbursal 70% personal /
30% institute, and the institute share splits 40% IDF / **50% DPF** / 5% staff welfare / 5% student
welfare. `kafka/producer/deposit_slip/consultancy/mapper.py:275` maps a `pdf_credit_distribution` child
table into `CreditDistributionPdfDTO(employeeId, departmentId, pdfPercentage, pdfAmount)` and publishes it.
**We are not inventing a fund — we are giving an existing balance a screen.**

## 3. Reference: the Accounts PDF APIs

Three families. Only the third writes.

### 3.1 `/api/credit-distributions` — what was distributed (read-only)
Paginated (`page` default 0, `size` default 100). `/pdf` and `/pdf/employee/{employeeId}` are the
PDF slices; `/employee/{employeeId}/contribution` gives one employee across all five funds.
Note the asymmetry: **DPF is sliced by department, PDF by employee**; IDF/SWF/STWF are institute-wide pools.

### 3.2 `/api/credit-distributions/fund-balance` — current balances (read-only)
`/pdf/employee/{employeeId}` — verified:
```json
{"employeeId":"1411","credited":6250.00,"loaned":0,"balance":6250.00}
```
Cheap enough to use as the "does this employee have a PDF balance?" probe when minting (§5.1).

### 3.3 `/api/overhead-transactions` — the transactional layer (read **and write**)
`{fundType}` is the `OverheadType` enum: `DPF, PDF, IDF, SWF, STWF`.

| Method | Endpoint | Use here |
|---|---|---|
| GET | `/{fundType}/summary` (opt. `departmentId`, `employeeId`) | **The balance call** (§5.2) |
| GET | `/{fundType}/logs` (opt. `employeeId`, `fromDate`, `toDate`) | **The ledger view** (§5.3) |
| POST | `/commits` | Create an overhead commit (§5.4) |
| POST | `/payments` | Payment against an existing commit (§5.4) |
| POST | `/payments/direct` | Payment with no prior commit (§5.4) |

### 3.4 The summary is a drop-in for the project balance call

This is the finding the whole design rests on. Verified for employee `1411`:
```json
{"fundType":"PDF","scopeType":"EMPLOYEE","employeeId":"1411",
 "netFundAvailable":6250.00,"totalCommitted":0,"totalPaid":0,
 "availableCommitAmount":6250.00,"availablePaymentAmount":6250.00,
 "outstandingLoan":0,"grossLoanIssued":0,"loanSettled":0}
```

| Field `get_project_available_amounts` returns | From the project endpoint | From `/overhead-transactions/PDF/summary` |
|---|---|---|
| `availableCommitAmount` | yes | **yes** |
| `availablePaymentAmount` | yes | **yes** |
| `totalCommitted` | yes | **yes** |
| `totalPaid` | yes | **yes** |
| `totalFundReceived` | yes | `netFundAvailable` — the one alias |

Same names, same meanings. Nothing to map.

> **Do not pass `projectNumber = "PDF"` plus an employee id.** That would make Accounts route a project
> number that is not a project. The overhead endpoints are *already* addressed by fund type and employee,
> so the branch belongs on our side: **we choose which endpoint to call based on the project.** That needs
> nothing from the Accounts team and keeps their project API honest.

### 3.5 What already exists on the Accounts side — and what must NOT be created

**A PDF project needs no project, no fund sanction, no fund received and no deposit slip on the Accounts
side. All of it already happened, in a different shape.**

PDF is not a project over there. It is an **overhead fund keyed by employee** — which is exactly why they
model it as `OverheadType` (`DPF, PDF, IDF, SWF, STWF`) with its own `/overhead-transactions` API rather
than through the projects API.

Money reaches it automatically. When a **consultancy deposit slip on some other, real project** is
processed, its credit distribution splits the institute share and credits the PDF slice to an employee.
The resulting PDF transaction (verified live) tells the whole story:

```json
{"transactionType":"FUND_RECEIVED","fundType":"PDF","scopeType":"EMPLOYEE",
 "employeeId":"1411","fundReceivedAmount":6250.00,
 "projectNumber":"26RxCSESP0804SRAN0001",     ← the SOURCE consultancy project
 "referenceNumber":"RES-DS-2026-00002",       ← the deposit slip that generated it
 "particulars":"Credited from deposit slip",
 "accountHeadId":null}                        ← PDF has no account heads
```

So the equivalents already exist, attached to the source project rather than to PDF:

| Normal project chain | PDF equivalent | Who creates it |
|---|---|---|
| Project | *(none — PDF is a fund, not a project)* | — |
| Fund Sanction | *(none — a PDF is earned, not sanctioned)* | — |
| Fund Received | the `FUND_RECEIVED` credit-distribution row above | Accounts, automatically |
| Deposit Slip | the **source project's** consultancy deposit slip | already exists |

**Confirmed by the API surface itself:** `/overhead-transactions` exposes POST only for `/commits`,
`/payments` and `/payments/direct`. There is **no endpoint to credit a PDF fund** — because crediting is
derived from deposit slips and is not ours to do.

#### Consequences for this design

1. **Do not publish a Project Registration event for a PDF project** (§5.1). It would create a phantom
   project in Accounts next to a fund they already track correctly.
2. **Do not build Fund Sanction or Fund Received for PDF** — hide both modules (§6). There is nothing for
   them to talk to, and using them would put money in the wrong place.
3. **The PDF project is a Frappe-side shell.** It exists so the PI has somewhere to stand and something to
   spend from. In Accounts it resolves to `fundType=PDF, employeeId=…` and nothing else.
4. **PDF grows on its own.** The balance rises whenever that employee's consultancy work generates a
   deposit slip. Nobody registers or sanctions anything.

## 4. Identifying a PDF project

Two new fields on `Project Registration`, both read-only:

| Fieldname | Type | Purpose |
|---|---|---|
| `is_pdf_project` | Check | The switch every branch in §5 tests. Explicit beats inferring from a name prefix. |
| `pdf_employee_id` | Data | The `employeeId` sent to Accounts. Copied from `User.employee_id` at mint time. |

**`project_no` convention: `PDF{employee_id}`** (e.g. `PDF1411`). It never reaches the project ledger
endpoints — every call is branched away before that — so it only has to be unique and recognisable.

**`project_type` gains a fourth option: `PDF`**, alongside `Research` / `Consultancy` / `Other`.
Minting sets it. This is not cosmetic — two things depend on it:

- the project-type filter row on the project list needs something to filter on, or a PDF project is
  indistinguishable from a genuinely unclassified `Other` project (§6.2);
- the *Other Project Details* section on the overview is gated on `project_type === "Other"`, so typing a
  PDF project `Other` made that section appear on every one of them.

An earlier draft minted with `project_type: "Other"` for exactly the reason it looked convenient — it was
already a valid option. It was the wrong call on both counts above.

**The join key is sound.** Accounts stores `employeeId` exactly as Frappe sends it (the consultancy mapper
reads `User.employee_id` verbatim), and all 1,181 Permanent Employees carry a numeric one. Live PDF data
does contain one username-style id (`apaikray`) belonging to a user outside the Permanent Employee set —
a data hygiene item to clean up, not a design flaw.

## 5. Backend changes

### 5.1 Minting — `create_pdf_project_for_user(user)`

Creates the row, pre-approved, bypassing the workflow entirely:

```python
doc = frappe.get_doc({
    "doctype": "Project Registration",
    "project_title": f"Personal Development Fund — {full_name}",
    "project_type": "PDF",
    "implementation_department": dept,
    "applicant_department": dept,
    "designation": designation,
    "pi_webmail": user,
    "project_no": f"PDF{employee_id}",
    "is_pdf_project": 1,
    "pdf_employee_id": employee_id,
    "workflow_state": "Approved",
})
doc.flags.ignore_permissions = True
doc.flags.ignore_workflow = True
doc.insert()
doc.submit()          # docstatus 1 — required for the Approved view
```

**Mint on first balance, not in bulk** (§10). Probe `/fund-balance/pdf/employee/{id}` first and skip
employees with none.

> ### Suppress the Kafka publish for PDF projects — this one matters
> `project_registration.py:612` fires `publish_project(doc)` whenever
> `workflow_state == "Approved" and docstatus == 1`. Minting would therefore **announce a new project to
> Accounts** — creating a phantom project alongside the PDF fund they already track, and doing it up to
> 1,185 times. Guard it:
> ```python
> if not endorsement and doc.workflow_state == "Approved" and doc.docstatus == 1 \
>         and not doc.get("is_pdf_project"):
>     success = publish_project(doc)
> ```
> Accounts already knows this employee's PDF fund. There is nothing to tell it.

### 5.2 The balance branch — `get_project_available_amounts`

The only change needed to unlock modules. Same return contract, different source:

```python
@frappe.whitelist()
def get_project_available_amounts(project_number):
    pdf_employee_id = _resolve_pdf_employee_id(project_number)   # §5.6a — ownership-checked
    if pdf_employee_id:
        return _get_pdf_available_amounts(pdf_employee_id)
    ...  # existing project path, untouched
```

`_get_pdf_available_amounts` calls `/overhead-transactions/PDF/summary?employeeId=…` and returns the
existing dict shape, mapping `netFundAvailable → totalFundReceived` and passing the other four straight
through. **Every caller — the module unlock, the balance cards, the commit form — keeps working unchanged.**

### 5.3 The ledger branch

`/overhead-transactions/PDF/logs?employeeId=…` returns rows that are near-identical to
`/commit-payment-transactions`. Verified sample:

```json
[{"transactionType":"FUND_RECEIVED","transactionId":2,"transactionDate":"2026-04-15",
  "fundType":"PDF","employeeId":"1411","accountHeadId":null,
  "referenceNumber":"RES-DS-2026-00002","particulars":"Credited from deposit slip",
  "fundReceivedAmount":6250.00,"commitAmount":null,"paymentAmount":null,
  "commitableBalance":6250.00,"paymentBalance":6250.00,"status":"DEPOSIT_RECEIVED"}]
```

Two differences to adapt: PDF uses **`referenceNumber`** where the project rows use `refDetails`, and PDF
has **no `balance`** field (use `paymentBalance`). Everything else lines up.

This is a **backend** change, deliberately: the existing project ledger is fetched client-side through
`/ledger-api`, and PDF must not follow it (§5.6d).

### 5.4 The write path

**Superseded by the Accounts team's "Overhead Commit/Payment Kafka Consumption & Module Logic" design
(2026-08-04).** An earlier draft of this section assumed PDF spending had to be a synchronous REST POST on
a different transport. It does not. Their build gives overhead the **same Kafka surface** that
`AccountHeadCommit`/`AccountHeadPayment` already have, which makes our write path nearly a copy of the
project one.

#### What they are building

| | Project commit (today) | PDF commit (their design) |
|---|---|---|
| Transport | Kafka | **Kafka — same** |
| Topic | `account-head-commit-events` | `overhead-commit-events` (+ `-dlq`, + `-batch-events`) |
| Envelope | `{schemaVersion, eventType, timestamp, data}` | **identical** |
| Scope key | `projectNumber` | `fundType: "PDF"` + `employeeId` |
| `accountHeadId` | required | **also required** — see §5.7 |
| `moduleId` | `ModuleCode` | **same `ModuleCode`, same values** |
| `refDetails` | parent commit id | **same semantics** |
| Idempotency | — | own PK **or** `frapAppId` |

Payment topic is `overhead-payment-events`, referencing an existing `overheadCommitId`.

#### Built — where the routing lives

**In the producer, not at the call sites.** `publish_commit` / `publish_payment` in
`kafka/producer/reimbursement/producer.py` check `is_overhead_project(project_name)` and delegate to
`kafka/producer/overhead/`.

That placement matters: **seven doctypes import `publish_commit` directly** — `travel.py`,
`ta_da_settlement.py`, `advance_settlement.py`, `top_up_fellowship.py`, `disbursal_of_consultancy.py`,
`disbursal_of_honorarium.py` and `po_commit_adjustment.py`. A dispatcher in `commitPayment.py` would have
covered only its own two call sites and silently missed every application raised from those, which is
exactly the bug this fixes.

| Project number | Commit topic | Payment topic |
|---|---|---|
| `PDF1411`, `PDF804` | `overhead-commit-events` | `overhead-payment-events` |
| `26RCLSTSP0742SAMI0001`, blank, `None` | `account-head-commit-events` (unchanged) | `account-head-payment-events` (unchanged) |

**Payments need an id we do not have.** An overhead payment must carry the Accounts service's own
`overheadCommitId`, which only exists once they have consumed our commit — unlike the project side, where a
payment is addressed by `projectNumber + accountHeadId`. `resolve_overhead_commit_id()` reads it back from
their PDF transaction log by matching our `frapAppId`; there is no lookup-by-frapAppId endpoint. **If it
cannot be resolved the payment is not published** — a logged, retryable failure beats a silent DLQ entry.

**Batch commits are refused, not misrouted.** `publish_commit_batch` (used only by PO commit adjustment)
now rejects a batch containing PDF rows with a logged error, because no overhead *batch* producer exists
yet. Reached only if a PO adjustment is ever raised on a PDF project.

#### What this means for us

**Keep the staging machinery entirely.** `submit_commit_data()` already stages into `Kafka Commit Staging`
with `frapAppId`, `refDetails`, `commitParticular`, `billAmount` and a `moduleId` override
(`commitPayment.py:904`, threaded through to publish at `:1044`). `check_workflow_and_publish()` still
delivers on the trigger state. **Only the topic and the payload shape branch** — a far smaller change than
the REST path this section previously described, and it keeps Kafka's retry/DLQ behaviour instead of
introducing a synchronous call that can fail in the user's face.

Concretely, a new `kafka/producer/overhead/` package mirroring `kafka/producer/reimbursement/`, emitting:

```json
{"schemaVersion":"1.0","eventType":"OVERHEAD_COMMIT","timestamp":"…",
 "data":{"fundType":"PDF","employeeId":"1411","accountHeadId":1,
         "commitDate":"2026-08-27","commitParticular":"…","commitAmount":10000.00,
         "moduleId":"25","frapAppId":"…","createdBy":"frappe-erp"}}
```

#### Fields derived at publish time, not passed in

Three fields were arriving empty because the caller has no reason to supply them. All are resolved inside
`publish_overhead_commit`:

| Field | Source | Why it was empty |
|---|---|---|
| `moduleId` | **Module Registry** — the originating doctype's `idx` (Reimbursement → `"5"`) | `submit_commit_data` only sets `module_id` for deliberate overrides (ICSS PO re-commit uses 14). An ordinary commit passed `None`, and the Accounts log doesn't echo it back either, so it was never visible anywhere. |
| `departmentId` | the PDF project's `implementation_department` → `Department_prornd.dept_id`, **coerced to `int`** | The scope for an employee-scoped fund carries only `employeeId`. Their DTO types this as an integer (`12`, not `"12"`), while `frappe.db.get_value` returns a string. |
| `createdBy` | the **`Kafka Commit Staging` row's `owner`**, falling back to the session user | Was hardcoded `"frappe-erp"`. The staging row is created by `submit_commit_data` the moment the commit form is submitted, so its owner is the staff member who actually committed — whereas `frappe.session.user` at publish time is whoever *approved* the application, often someone else. |

Verified payload:

```json
{"fundType":"PDF","employeeId":"804","departmentId":4,"accountHeadId":1,
 "commitDate":"2026-08-30","commitParticular":"okokokok","commitAmount":900.0,
 "status":"COMMITTED","moduleId":"5","frapAppId":"20260830PDF804-2329",
 "createdBy":"mks@iitg.ac.in"}
```

> **`departmentId` is informational for PDF.** Their `resolveScope` derives scope from `fundType` plus one
> identifier — `employeeId` for PDF — and their own guide says a `departmentId` sent with a PDF commit is
> **ignored** for scoping. It is sent because their credit-distribution rows carry a department and it is
> useful for reporting, not because it affects where the money lands.

Payments carry `createdBy` the same way.

**`status` must be sent as `"COMMITTED"`.** Their consumer defaults an omitted `status` to `PENDING`, but
a commit reserves funds and has to land COMMITTED — exactly what the project-side `AccountHeadCommitDTO`
already sends. An earlier build omitted it and would have published every PDF commit as PENDING.

Fields to **omit**: `scopeType` (server-derived from `fundType` + the scope identifier) and
`overheadCommitId` (auto-generated; sent only when replaying a message that should be recognised as
already-processed).

Verified against the payload the Accounts team confirmed they expect — field-for-field identical, with
`createdBy` additionally sent (it appears in their own §6.1 example):

```json
{"schemaVersion":"1.0","eventType":"OVERHEAD_COMMIT","timestamp":"2026-08-30T…",
 "data":{"fundType":"PDF","employeeId":"804","accountHeadId":1,"commitDate":"2026-08-30",
         "commitParticular":"test pdf commit","commitAmount":800.0,"status":"COMMITTED",
         "moduleId":"5","frapAppId":"20260830PDF804-2327","createdBy":"frappe-erp"}}
```

> #### Dependency: these topics do not exist yet
> Their document is **"Design Ready — ready to implement"**, and its §2.1 states plainly that *no Kafka
> consumer exists for Overhead anywhere* — zero topic constants, zero consumers. **Stage 2 cannot ship
> until they do.**
>
> What *does* exist today is the REST layer: `POST /commits`, `/payments`, `/payments/direct`. So the
> options are (a) wait for their Kafka build, or (b) go live on REST and switch to Kafka later. Prefer
> **(a)** — the staging machinery is already Kafka-shaped, and building a REST path we intend to discard
> is throwaway work. Stage 1 (§10) is unblocked either way, since it only reads.

> #### Behaviour difference worth knowing: no availability exemption
> Their confirmed decision #3: **every** overhead commit, including settlements, is subject to the standard
> fund-availability check — deliberately unlike the project side, which exempts certain modules.
>
> **Worked example — a TA/DA settlement that overruns.** Using employee `1411`'s real balance of ₹6,250:
>
> | Step | Effect on PDF |
> |---|---|
> | PI commits a ₹6,000 travel advance (`moduleId "8"`, commit id `501`) | available drops to **₹250** |
> | Trip actually costs ₹8,000; settlement sent as `moduleId "13"`, `refDetails: 501`, `billAmount: 8000` | — |
> | Server computes the delta itself: `8000 − 6000 =` **₹2,000** (their §4.2) | — |
> | Availability check: is ₹2,000 ≤ ₹250? | **No → commit rejected** |
>
> On a project whose module is exempted, that same settlement is accepted and the project simply goes
> overdrawn. On PDF it stops. Arguably correct for a personal fund — you cannot spend earnings you have not
> earned yet — but it is a *different outcome for identical user actions*, and users will hit it.
>
> **The likely candidate to check first is Recruitment (`moduleId "11"`).** It is the module our code
> already special-cases for salary (`_is_recruitment_salary_payment`, `commitPayment.py:1174`), monthly
> salary commits are exactly the kind of obligation an exemption exists to protect, and Recruitment **is**
> in the PDF allow-list (§7). If a PDF-funded appointment's salary commit exceeds the remaining balance it
> will be rejected rather than carried. *We cannot see their exemption list from here — ask them which
> modules are on it, then check those against §7.*
>
> **Operationally this fails quietly.** Because commits travel over Kafka, a rejection is not an error the
> user sees — it becomes a DLQ entry. The application looks committed on our side while Accounts never
> recorded it. Whatever visibility we build for publish outcomes (§5.4, and the `publish_status` pattern in
> [loan-settlement-implementation.md](loan-settlement-implementation.md) §10.3) matters more here than on
> the project side, precisely because rejections will actually happen.

### 5.5 PDF has no account-head *dimension* (but commits still carry one)

Every project screen is built around Budget Heads — the head-wise commit form, the per-head balance call
`/commit-payment-transactions?projectNumber=&accountHeadId=`, the budget breakup on Fund Received. PDF is a
**single pool per employee**: the balance is not sliced by head, and its `FUND_RECEIVED` rows carry
`accountHeadId: null`.

Commits are the exception — `OverheadCommit` has a real `AccountHead` relation and the Accounts design
expects `accountHeadId` on every commit (§5.7). So the head is not a dimension you can *filter a balance
by*, but it is still recorded on what you spend.

For a PDF project the head-wise UI must **collapse to one pool** rather than render an empty selector.
Concretely: fix the head to `Overhead` and lock it — see §5.7, which supersedes an earlier draft of this
paragraph that proposed hiding the selector altogether. Locking is better: applications still carry a
coherent head, so nothing downstream needs a null-head special case.

### 5.6 Scoping — a PI must see only their own PDF

**This does not come for free. Built naively, any Permanent Employee could read any colleague's PDF
balance and full transaction history.** Three things combine to make that possible today:

| # | Fact | Verified |
|---|---|---|
| 1 | `Permanent Employee` has `read = 1, if_owner = 0` on `Project Registration` | `project_registration.json` permissions |
| 2 | Project Search calls `frappe.client.get_list` on `Project Registration` with **no owner restriction** — only doctype permissions apply | [ProjectSearch.tsx:629](../src/pages/ProjectSearch.tsx#L629) |
| 3 | `get_project_available_amounts(project_number)` is `@frappe.whitelist()` and **trusts the project number the client sends** | `commitPayment.py:508` |

Put together: a user searches `PDF`, reads any colleague's PDF project row (including `pi_webmail` and
`project_no`), then calls the balance endpoint with that project number. The `PDF{employee_id}` convention
(§4) makes the number guessable even without the search. **This is horizontal privilege escalation, and the
PDF feature is what turns a harmless listing into a disclosure of personal earnings.**

#### The fixes

**a. Never take the employee from client input — derive and verify it.**

```python
def _resolve_pdf_employee_id(project_number):
    """Employee id for a PDF project, only if the caller is entitled to it.

    The project number arrives from the client and is guessable (PDF{employee_id}),
    so ownership is checked here rather than assumed.
    """
    pr = frappe.db.get_value(
        "Project Registration",
        {"project_no": project_number, "is_pdf_project": 1},
        ["name", "pi_webmail", "pdf_employee_id"],
        as_dict=True,
    )
    if not pr:
        return None                      # not a PDF project — normal project path

    roles = frappe.get_roles(frappe.session.user)
    privileged = any(r in roles for r in ("staff, RnD", "Hos, RnD (Head of Section, RnD)",
                                          "Dean, RnD", "Director", "System Manager"))
    if pr.pi_webmail != frappe.session.user and not privileged:
        frappe.throw(_("You are not permitted to view this fund."), frappe.PermissionError)

    return pr.pdf_employee_id
```

Every PDF call — balance (§5.2), logs (§5.3), commit/payment (§5.4) — goes through this. The
`employeeId` sent to Accounts is then always one the caller is entitled to.

**b. Hide PDF projects from everyone but their owner.** Add a permission query condition so they never
appear in another user's list, search, or report:

```python
# hooks.py
permission_query_conditions = {
    "Project Registration": "rndopsapp.rndopsapp.doctype.project_registration"
                            ".project_registration.get_permission_query_conditions",
}
```
returning, for a non-privileged user, `is_pdf_project = 0 OR pi_webmail = '<session user>'`.
This is the proper Frappe mechanism and fixes the search leak at its source rather than per screen.

**c. Delete `get_project_available_amounts_test`.** `commitPayment.py:609` is an
`allow_guest=True` clone of the balance endpoint, already commented *"TESTING ONLY — Remove before going to
production."* With PDF projects it becomes **unauthenticated access to any employee's personal fund
balance**. It should go before Stage 1 ships, not after.

**d. PDF data must NEVER be fetched through `/ledger-api`. This is the rule the whole requirement rests on.**

`/ledger-api` is a **same-origin proxy that forwards straight to the Accounts service with no
authentication and no authorization** (`proxyOptions.ts`). The browser calls it directly in at least eight
places today — `ProjectLedgerModal.tsx`, `ProjectLedgerFull.tsx`, `CommitPayment.tsx`, `ProjectSearch.tsx`,
`useProjectBudget.ts` and others — all of the form:

```ts
fetch(`/ledger-api/commit-payment-transactions?projectNumber=${projectNo}&accountHeadId=${id}`)
```

**Frappe never sees these requests.** If the PDF ledger view copies this pattern:

```ts
fetch(`/ledger-api/overhead-transactions/PDF/logs?employeeId=${employeeId}`)   // ← NEVER DO THIS
```

then a user opens dev-tools, changes `employeeId` to a colleague's, and reads their entire PDF history and
balance. **Every guard in §5.6a–c is bypassed, because the request never reaches the server that enforces
them.** No amount of server-side checking helps if the client can go around the server.

Therefore:

> **Every PDF read and write goes through a whitelisted Frappe method that resolves `employeeId` from the
> session user via `_resolve_pdf_employee_id` (§5.6a). The `employeeId` is never accepted from the client,
> never appears in a URL the browser constructs, and `/ledger-api` is never used for PDF.**

Concretely, add whitelisted wrappers — `get_pdf_balance()` and `get_pdf_ledger()` — that take the *project
number* (validated for ownership) and never an employee id. The frontend calls those, exactly as it already
calls `get_project_available_amounts` through Frappe.

> The same exposure exists today for ordinary projects — anyone can read any project's ledger through
> `/ledger-api`. That has been tolerated because project finances are institutional. **PDF is personal
> earnings, and the same tolerance does not apply.** Worth raising separately: the proxy grants
> unauthenticated access to the whole ledger API to anyone who can reach the app.

#### Never call the un-sliced Accounts endpoints from a PI-facing path

The two endpoints this design uses are safe by construction — `/overhead-transactions/PDF/summary` and
`/logs` both reject a missing employee with `{"error":"employeeId is required for PDF"}` (verified). But
their `credit-distributions` neighbours do **not**:

| Endpoint | Without an employee id |
|---|---|
| `/overhead-transactions/PDF/summary` | **rejects** — safe |
| `/overhead-transactions/PDF/logs` | **rejects** — safe |
| `/credit-distributions/fund-balance/pdf` | returns the **institute-wide pool** (₹46,417) |
| `/credit-distributions/pdf` | returns **every employee's** PDF credit, with ids |

Use the un-sliced variants only in staff/admin reporting, never on a PI screen. The
`/fund-balance/pdf/employee/{id}` mint probe (§5.1) is a server-side call with an id we resolved
ourselves, so it is fine.

### 5.7 Applications on a PDF project

The design: an application submitted from a PDF project carries **`project_no = PDF{employee_id}`** and a
**budget head fixed to `Overhead`**, non-editable, and then follows the **identical workflow** — same
approvals, same staff, RnD commit step. Confirmed workable, with one correction.

**Budget head `Overhead` is a good choice.** `Budget Head` `id = 1` is literally `Overhead`
(31 and 32 are `Overhead - OES` / `Overhead - R&D`, so plain `Overhead` is unambiguous). Applications
carry a head like any other project, and nothing downstream sees a special case.

**Auto-select and lock costs almost nothing.** `CommitPayment` already has the mechanism —
`resolveBudgetHeadOption()` / `preferredCommitHead` ([CommitPayment.tsx:430](../src/components/CommitPayment.tsx#L430)).
For a PDF project, pass `budgetHeads={["Overhead"]}` and render the selector disabled.
**`budgetHeads` must be injected**: the details pages derive that list from the project's *sanctioned
budget breakup*, and a PDF project has no sanction, so the list would otherwise be empty.

**The workflow genuinely does not change.** Applications, approvals and the staff commit step are
untouched. This is the strength of the approach and the reason it stays cheap.

> #### The correction: the last mile still has to branch
> A commit today is published to Kafka on `account-head-commit-events` carrying
> `projectNumber + accountHeadId`. Accounts resolves that **against a project**. If a PDF commit went out
> the same way with `projectNumber: "PDF1411"`, Accounts would look for a project that does not exist —
> and deliberately must never exist (§3.5). It would fail or dead-letter.
>
> PDF commits and payments must **POST to `/overhead-transactions/commits` / `/payments`**, keyed by
> `fundType = PDF` and the `employeeId` resolved server-side (§5.6a).
>
> So: everything on our side is identical — same form, same head, same workflow, same staff commit —
> and only the **delivery** differs, branched inside `check_workflow_and_publish` (§5.4). The user-facing
> behaviour is exactly what was described; the branch is invisible to everyone using it.

**`accountHeadId` IS required — send it.** *(Corrected. An earlier draft of this paragraph said not to,
reasoning from live PDF rows carrying `accountHeadId: null`. Those nulls are on `FUND_RECEIVED` rows,
which are derived from deposit slips and never carry a head. Commits are different.)*

The Accounts design settles it: `OverheadCommit` holds a **real `@ManyToOne AccountHead`**, and every
commit example in their document sends `"accountHeadId": 1`. So the original instinct — fix the head to
`Overhead` and pass it through — is exactly right, and it is not merely a Frappe-side placeholder.

**`moduleId` and `refDetails` carry over unchanged.** Their design reuses the same `ModuleCode` values
(`"8"` advance settlement, `"13"` TA/DA settlement, `"14"` purchase order, `"15"` PO adjust, `"25"`
miscellaneous, `"11"` recruitment), with the same delta and re-commit semantics, and `refDetails` still
points at a parent commit id. Our existing `moduleId` override plumbing (`commitPayment.py:937`) therefore
needs no change — the values mean the same thing on the overhead side.

**Two smaller consequences to handle:**

1. **Head-wise sanction validation must be skipped.** Flows that check a commit against the head's
   sanctioned limit will read ₹0 for a PDF project, because there is no sanction. Validate against the PDF
   pool balance (§5.2) only.
2. **The parent-TID lookup needs a PDF path.** When an application settles against a parent
   (TA/DA against a Travel commit), [CommitPayment.tsx:621](../src/components/CommitPayment.tsx#L621)
   fetches the parent's transaction id via `/ledger-api/commit-payment-transactions?projectNumber=&accountHeadId=`.
   For PDF that data lives in `/overhead-transactions/PDF/logs`, and the call must go through a whitelisted
   Frappe method rather than the proxy (§5.6d). The id it yields is the `overheadCommitId`, which is what
   `refDetails` expects on the overhead side.

### 5.8 Paying a PDF commit

Mirrors the project-side payment flow: a commit is raised, it appears in **Pending Commits**, staff pay it,
and the payment publishes to Accounts. Everything below is decided; §12.7 covers verification.

#### What already works (verified live)

The commit half is complete. Employee `804`'s ₹900 commit reached Accounts:

```
transactionType: COMMIT   transactionId: 1   status: COMMITTED
frapAppId: 20260830PDF804-2329
summary → totalCommitted 900.00 · availableCommitAmount 29100.00
```

`resolve_overhead_commit_id()` finds it by `frapAppId`, addressed either by `project_no` or by docname, and
returns `None` for an unknown id — so the payment DTO's required `overheadCommitId` can be populated.

#### 5.8.1 The routing gap — same class of bug as the commit one

`submit_payment_data` (`commitPayment.py`) publishes with **`project_name=None`**, deliberately: the mapper
reads `doc.project_ref_number` instead. But the overhead routing tests `is_overhead_project(project_name)`,
and `is_overhead_project(None)` is `False` — **verified** — so every PDF payment would go to
`account-head-payment-events`.

**Fix:** in `publish_payment`, fall back to `doc.project_ref_number` when `project_name` is None, exactly as
the mapper already does. This is the payment twin of the docname/`project_no` bug in §12.1, and it must be
tested with `project_name=None`, because that is the only shape the real caller uses.

#### 5.8.2 Listing PDF commits for payment — **Option A (decided)**

`Payments.tsx` sources **Pending Commits** from
`getCommitsByStatus(['COMMITTED','PARTIALLY_PAID','OVERPAYMENT'])` →
`/ledger-api/account-head-commit/by-status/{status}`, which is project-side only *and* goes through the
proxy PDF must never use (§5.6d).

Add a whitelisted **`get_pdf_commits()`** that reads COMMIT rows from `/overhead-transactions/PDF/logs` and
maps them into the existing `CommitRecord` shape, filtered to `COMMITTED` / `PARTIALLY_PAID` /
`OVERPAYMENT`. Overhead has no `by-status` endpoint, so the filter is applied to the log rows — a handful
per employee, not a table scan.

| `CommitRecord` field | From the overhead log |
|---|---|
| `transactionCommitNumber` | `transactionId` — **this is the `overheadCommitId`** |
| `projectNumber` | the PDF project's `project_no` |
| `accountHeadId` | `1` (Overhead) |
| `commitAmount`, `commitDate`, `commitParticular`, `status`, `frapAppId`, `moduleId` | direct |

*(Option B — asking Accounts for an overhead `by-status` endpoint — was rejected: it blocks on them, and
the log already carries everything needed.)*

#### 5.8.3 No new tab — the existing module split does the work

The Payments page has three tabs but **two** data sources: *Miscellaneous Commit* is not a separate feed, it
is `pendingCommits` filtered to `moduleId` 25 / 11.

So PDF commits are merged into the same `pendingCommits` array and route themselves:

- a PDF **Reimbursement** commit → *Pending Commits*
- a PDF **Miscellaneous Commit** (module 25) → *Miscellaneous Commit*

Identical to a normal project, which is the whole point. Everything downstream — the Pay button,
`PaymentForm`, the module split — is untouched, because it only ever sees a `CommitRecord`.

> **`transactionCommitNumber` *is* the `overheadCommitId`.** `PaymentForm` already forwards it as
> `commit_id`, which `submit_payment_data` stores on the payment doc, so `publish_overhead_payment` reads
> `doc.commit_id` directly and `resolve_overhead_commit_id`'s log scan is now the fallback.

> ### Their log does not return `moduleId` — recovered from our own staging
> A COMMIT row from `/overhead-transactions/PDF/logs` has **no `moduleId` field at all** (verified: the key
> is absent, not null), even though we send it. Without it the Payments page cannot split Miscellaneous
> Commit (25) and Recruitment (11) out of the main list, and every PDF commit would pile into one tab.
>
> `_attach_module_ids()` fills it in from `Kafka Commit Staging`, which holds the original payload keyed by
> the same `frapAppId` — one query for the whole batch. We published these commits, so the module is
> knowable on our side; nothing needs to change on theirs.

#### 5.8.4 Visibility — a deliberate exception to §5.6

**PDF commits on the Payments page are visible to every `staff, RnD`, exactly as project commits are today.**

This is a considered exception to the per-employee scoping in §5.6, not an oversight: staff process payments
on everyone's behalf, so the payment queue has to show every pending commit regardless of whose fund it is.
`staff, RnD` is already a privileged role in `_resolve_pdf_employee_id` for the same reason.

The exception is bounded — `get_pdf_commits()` is **restricted to the staff roles**, not open to any logged-in
user. A PI still cannot read another PI's balance, ledger, or project (§5.6a–d); only the staff-facing
payment queue aggregates across employees.

#### 5.8.5 Implementation notes

- **`publish_payment` routing fallback** — `routing_project = project_name or doc.project_ref_number`.
- **`get_pdf_commits(statuses=None)`** in `pdf_fund.py` — role-gated to `PDF_PRIVILEGED_ROLES`, fans out one
  log call per PDF project concurrently, filters to the payable statuses, maps to `CommitRecord`, then
  `_attach_module_ids()`.
- **`Payments.tsx`** merges the two sources in `fetchPendingCommits`. The PDF fetch resolves to `[]` on
  failure rather than rejecting, so a problem there can never blank out the project commit list.
- **`publish_overhead_payment`** prefers `doc.commit_id`, falling back to the log scan. **Every explicit
  argument falls back to the document**, mirroring `AccountHeadPaymentMapper` — `submit_payment_data`
  passes `payment_amount` / `bmr` / `budget_head` as `None` on purpose and expects the doc to be read.
  Taking `payment_amount` at face value published **`paymentAmount: 0.0`** for a real ₹900 payment; a
  zero/negative guard now refuses such a publish outright rather than sending it.

> **The `None`-argument trap, three times over.** `submit_payment_data` passes `project_name`,
> `payment_amount` and `bmr` as `None` by design, expecting the mapper to read the document. Any overhead
> code that trusts those arguments silently produces wrong output: `project_name` → wrong topic,
> `payment_amount` → a ₹0 payment. Neither raises. When adding DPF/IDF, mirror the mapper's fallbacks
> rather than reading the parameters.

Verified end to end against the real `publish_message` (only the Kafka producer stubbed) — a payment on
`PDF804` publishes to `overhead-payment-events`, partition key `1`:

```json
{"overheadCommitId": 1, "paymentAmount": 900.0, "paymentStatus": "PAID",
 "paymentDate": "2026-08-30", "paymentRefDetails": "REF-1",
 "frapAppId": "20260830PDF804-2329", "createdBy": "frappe-erp"}
```

Pre-flight also confirmed: `project_ref_number` resolves to `PDF804` from either the docname or the project
number, and `budget_head = "Overhead"` resolves to `accountHeadId 1`, so `submit_payment_data`'s two
pre-flight checks pass for a PDF payment.

Verified: as `staff, RnD` the queue returns the `PDF804` commit
(`transactionCommitNumber 1`, ₹900, `COMMITTED`, routed to *Pending Commits* since it is a Reimbursement);
an ordinary Permanent Employee is denied with *"You are not permitted to view the payment queue."*

#### 5.8.6 Partial payments

Rely on the Accounts service's own `status` transitions (`COMMITTED` → `PARTIALLY_PAID` → `SETTLED`) rather
than computing remainders here, exactly as the project side does. `/payments/direct` (a payment with no
prior commit) exists on their side but is **not** part of this flow.

## 6. Frontend changes

Far less than expected, because §2 does the work. Everything below is **implemented**.

### 6.1 What needed no change at all

| Area | Why |
|---|---|
| Project list query | The row appears on `pi_webmail` — but see §5.6b: other surfaces (Search) are not owner-filtered, which is why the permission query condition exists. |
| Routing | `Approved` already routes to `/project-details-overview/:name`. |
| Module unlock | §5.2 makes the existing balance call return real numbers, so `hasFunds` just works. |

### 6.2 `ProjectsView.tsx` — the list

**An `Overhead` tab, fourth in the project-type filter row** (Research · Consultancy · Others ·
**Overhead**), with its own count and colour. Without it an overhead fund falls into `Others` and is
indistinguishable from a genuinely unclassified project.

The tab covers **all** overhead fund types, not just PDF:

```ts
const OVERHEAD_PROJECT_TYPES = ['pdf', 'dpf', 'idf', 'swf', 'stwf'];
```

Only PDF exists today; the rest are listed now so they join the same tab automatically when they follow,
with no further frontend change. *(An earlier build labelled this tab `PDF`; it was renamed once approvers
needed one place to act on every overhead fund.)*

**This is the tab approvers use.** `staff, RnD`, `Hos, RnD` and `Dean, RnD` see their pending-approval
queue through the *same* `renderProjectsTable()` and the same tab row as a PI sees their own projects —
their queue is merged into `myProjects` upstream — so this single change serves both. No separate approver
screen was needed.

This is also the reason `PDF` had to become a real `project_type` (§4): the tab filters on the project
type, so typing these projects `Other` would have made the tab impossible. The rest of the list machinery
is generic — `projectTypeCounts[tab]` and the row filter both key off `selectedProjectType` — so nothing
else changed.

#### The approver screens carry the tab too

The project-type tabs exist in **three** places, each with its own copy of the list. All three now carry
`Overhead`:

| Screen | Who uses it |
|---|---|
| `pages/ProjectsView.tsx` | PIs (own projects) and approvers (queue merged into `myProjects`) |
| **`pages/PendingTask.tsx`** | **`staff, RnD` / `Hos, RnD` / `Dean, RnD` acting on pending applications** |
| `pages/TaskRegistry.tsx` | History of actioned applications |

`PendingTask` and `TaskRegistry` share `ProjectCategory` / `normalizeProjectType` from
`utils/projectTypeMapping.ts`, so the fund types were added **there** — one place, both screens.
`ProjectsView` has its own private copy of the same normaliser; the two are duplicates and were updated in
parallel. *(That duplication is a trap: adding the tab to `ProjectsView` alone leaves approvers without it,
which is exactly what happened on the first attempt.)*

> **Adding `Overhead` to the shared `ProjectCategory` without adding the tab everywhere would hide work.**
> Once `normalizeProjectType` returns `'Overhead'`, any screen filtering on `selectedProjectType` shows a
> task only if it has a matching tab. `TaskRegistry` was updated for exactly this reason — without it,
> overhead tasks would have become invisible there rather than merely untabbed.

> **`Ado_RnD` (2 users) has no approval queue** in `ProjectsView`, which branches only on `Hos, RnD`,
> `staff, RnD` and `Dean, RnD`. An Associate Dean therefore sees only their own projects, and the Overhead
> tab will be empty for them — **for every project type, not just overhead**. This is pre-existing
> behaviour, not something this feature introduced; adding that queue is a separate change with a much
> wider blast radius (it alters what those users see across all projects), so it was deliberately left
> alone.

**Mint-on-first-visit.** An effect calls `ensure_pdf_project` once per session and refetches only when a
project was actually created. It must sit **after** the `useFrappeGetDocList` that defines `mutateCreated`:
the dependency array is evaluated during render, so declaring the effect earlier throws
`Cannot access 'mutateCreated' before initialization`. TypeScript does not catch this.

> Known rough edge: the list defaults to the **Research** tab, so a PI whose only project is a PDF lands
> on an empty tab and has to click across. Not changed — the default is pre-existing behaviour for anyone
> with no research projects.

### 6.3 `ProjectDetailsOverview.tsx` — the project view

Driven by one derived flag, `isPdfProject`, read off the loaded document:

| Area | Change |
|---|---|
| **Sanction Details tab** | Removed. A PDF fund is credited by consultancy disbursal and never sanctioned. |
| **Sanction / Fund Received journey** | The whole "add sanction → get it approved → record fund received" banner returns `null`. Leaving it visible invites someone to register a sanction against a personal fund. |
| **Overview sections** | *Funding Agency*, *Investigators* (incl. Additional PIs) and *Clearance Details* hidden — a PDF fund is one person's own earned share, not a sponsored project. *Other Project Details* disappears on its own, since it is gated on `project_type === "Other"` and the type is now `PDF`. |
| **Ledger** | See §6.4. |
| **Quick actions** | Drop the **Loan** group (§7). |
| **Locked-state redirect** | Fall back to `Recruitment` instead of `Loan` — **required**, see the warning in §7. |

### 6.4 The ledger

Two branches, both avoiding `/ledger-api` (§5.6d):

- **Head detection.** The normal path fans out one `/ledger-api` call *per budget head* (36+) to find which
  heads hold data. For PDF that is skipped entirely — the fund is a single pool, so `Overhead`
  (`PDF_BUDGET_HEAD_ID`) is added directly.
- **Row fetch.** Calls the whitelisted `get_pdf_ledger` instead.

**Loans and settlements are folded into the received / payment columns**, server-side in `get_pdf_ledger`.
They have no equivalent on the project side, and from the fund's point of view a loan issued is money out
and a settlement is money back in. Without this they render as all-zero rows whose balance moves for no
visible reason. The raw amounts stay on the row as `rawLoanAmount` / `rawSettlementAmount`.

The PDF branch also **trusts the Accounts service's own running balances** rather than recomputing from
`received − paid` the way the project path does — that formula ignores loans entirely.

Verified against employee `804`:

| Type | Particulars | Received | Payment (out) | Balance |
|---|---|---|---|---|
| `FUND_RECEIVED` | Credited from deposit slip | 1,30,000 | — | 1,30,000 |
| `LOAN_ISSUED` | Loan issued | — | **1,00,000** | **30,000** |

### 6.5 `useProjectBudget.ts` and the commit form

`useProjectBudget` short-circuits for a `PDF`-prefixed project number: one call to the whitelisted
`get_pdf_balance`, exposing the single `Overhead` head. This closes a real hole — the normal path fires
36+ unauthenticated proxy calls, which for PDF is both wrong data and the exact §5.6d violation.

`CommitPayment` gained `lockBudgetHead`, passed by `BudgetActionsSidebar` for PDF projects, so the head
renders fixed at `Overhead` rather than merely defaulting to it.

## 7. Module allow-list

An approved project currently offers Reimbursement, Advance, Disbursal, Purchase, Recruitment, Travel,
Loan and (staff only) Commit/De-Commit.

**A PDF project offers everything except Loan Request.** Loans are not possible against a PDF fund.

| Module | PDF? |
|---|---|
| Travel | yes |
| Reimbursement | yes |
| Temporary Advance | yes |
| Direct Purchase | yes |
| Indent General / Indent cum Sanction | yes |
| Recruitment (Adhoc/Contractual) | yes |
| Disbursal (Top Up Fellowship, Honorarium, Consultancy) | yes |
| Commit / De-Commit (staff, RnD only) | yes |
| **Loan Request** | **no — loans are not possible against a PDF fund** |

Implemented by filtering `groups` (`ProjectDetailsOverview.tsx:1096`) when `is_pdf_project`:

```tsx
const visibleGroups = isPdfProject
    ? groups.filter((g) => g.title !== "Loan")
    : groups;
```

Note the Accounts overhead summary still reports `outstandingLoan`, `grossLoanIssued` and `loanSettled`
for PDF — their data model carries the fields, but the institute does not permit PDF loans, so we never
offer the module. Those figures should simply be ignored when rendering a PDF balance.

> ### Removing Loan breaks the locked-state redirect — handle it
> This is not just a filter. `ProjectDetailsOverview.tsx:1084-1094` reads:
> ```tsx
> const unlockedGroups = ["Loan", "Recruitment"];
> useEffect(() => {
>     if (isModuleLocked && !unlockedGroups.includes(activeTab)) {
>         setActiveTab("Loan");   // ← a tab that will not exist on a PDF project
>         ...
>     }
> }, [isModuleLocked]);
> ```
> When a project has no balance, the page **force-selects the Loan tab** — precisely the one tab a PDF
> project does not have. A PDF project can absolutely reach that state: mint-on-first-balance (§10) means
> it starts funded, but the balance returns to zero once the fund is spent down.
>
> The fallback must be PDF-aware:
> ```tsx
> const lockedFallback = isPdfProject ? "Recruitment" : "Loan";
> ```
> `Recruitment` is the other entry in `unlockedGroups`, so it stays reachable while locked and needs no
> further change. Without this the user lands on a blank tab with no way back.

## 8. Scale and blast radius

| | |
|---|---|
| Permanent Employees (all enabled) | **1,185** |
| …with an `employee_id` | **1,181** (4 need filling in) |
| Approved projects today | **408**, held by **177** distinct PIs |
| Institute-wide PDF balance today | **₹46,417** |

That last number decides §10. Individual balances observed were ₹6,250 and ₹1,125. Minting for all 1,185
employees would **quadruple** the Project Registration table to give the overwhelming majority an empty
project — one that shows nothing but locked modules and reads as broken rather than absent.

## 9. File inventory

**Backend** (`rndopsapp/rndopsapp/`)
- `doctype/project_registration/project_registration.json` — add `is_pdf_project`, `pdf_employee_id`, and the `PDF` option on `project_type` (§4).
- `doctype/project_registration/project_registration.py` — **suppress `publish_project` for PDF projects** (§5.1); add `create_pdf_project_for_user`, `ensure_pdf_project`, `get_permission_query_conditions` (§5.6b).
- `commitPayment.py` — branch `get_project_available_amounts` (§5.2); add `_get_pdf_available_amounts` and `_resolve_pdf_employee_id` (§5.6a); add whitelisted `get_pdf_balance` / `get_pdf_ledger` (§5.6d); branch `check_workflow_and_publish` for the REST write path (§5.4); **delete `get_project_available_amounts_test`** (§5.6c).
- `hooks.py` — `permission_query_conditions` for `Project Registration` (§5.6b).
- A new `pdf_fund.py` (or a section of `commitPayment.py`) wrapping the three Accounts API families (§3).
- `kafka/producer/overhead/` (new package) — `dto.py` (`OverheadCommitDTO`, `OverheadPaymentDTO`, shared envelope) and `producer.py` (`is_overhead_project`, `publish_overhead_commit`, `publish_overhead_payment`, `resolve_overhead_commit_id`).
- `kafka/producer/reimbursement/producer.py` — routes PDF commits/payments to the overhead package (§5.4).
- `kafka/producer/reimbursement/batch_producer.py` — refuses batches containing PDF rows (§5.4).
- `kafka/config.py` — topic constants for `overhead-commit-events`, `overhead-payment-events` (+ DLQ/batch variants) and a schema version.
- Optionally a patch in `patchs/` to backfill PDF projects for employees who already hold a balance.

**Frontend** (`src/`)
- `pages/ProjectsView.tsx` — the `Overhead` filter tab + counts, shared by PIs and approvers (§6.2); mint-on-first-visit effect.
- `pages/ProjectDetailsOverview.tsx` — `isPdfProject` flag; drop the Sanction Details tab, the sanction/fund-received journey and the Funding Agency / Investigators / Clearance sections (§6.3); PDF ledger branches (§6.4); drop the Loan group and fix the locked-state redirect (§7).
- `hooks/useProjectBudget.ts` — PDF short-circuit + exported `PDF_BUDGET_HEAD` / `PDF_BUDGET_HEAD_ID` (§6.5).
- `components/CommitPayment.tsx` — new `lockBudgetHead` prop (§6.5); PDF path for the parent-TID lookup still outstanding (§5.7).
- `components/BudgetActionsSidebar.tsx` — passes `lockBudgetHead` for PDF projects.
- `services/apiService.ts` — `pdfFundAPI` (whitelisted Frappe methods only — no `/ledger-api` entry, §5.6d).

## 10. Rollout

**Stage 1 — reading.** Mint the project, branch the balance call, branch the ledger view, apply the module
allow-list, **and the scoping work in §5.6**. This is a complete, useful screen on its own: a PI can
finally see what they hold. Almost no risk — nothing writes — but §5.6 is not optional in this stage, since
Stage 1 is exactly what exposes the balances.

**Stage 2 — spending.** Publish overhead commits/payments to `overhead-commit-events` /
`overhead-payment-events` (§5.4). **Blocked on the Accounts team building those consumers** — designed,
not yet implemented. This is the part that can double-spend if rushed; give it its own testing rather than
treating it as a footnote to Stage 1.

**Mint on first balance, not in bulk** (§8). Probe `/fund-balance/pdf/employee/{id}`; create the project
only when it returns a positive balance. The feature then grows exactly as fast as the fund does, spreads
any load naturally, and stops growing the moment you switch minting off.

## 11. Open questions

| # | Question | Default if unanswered |
|---|---|---|
| 1 | Everyone, or only employees with a balance? | **Only those with a balance** (§10) |
| 2 | ~~Which modules?~~ **Decided:** everything except Loan Request (§7) | — |
| 3 | Who approves PDF spending? Applications inherit the project's approval chain — should a PI spending their own earned share skip a level? | Unchanged from a normal project |
| 4 | ~~Synchronous commit, or record-and-reconcile?~~ **Moot** — overhead spending is Kafka, so it inherits the existing retry/DLQ behaviour (§5.4) | — |
| 5 | ~~Exact payload for commits/payments~~ **Answered** by the Accounts "Overhead Commit/Payment Kafka Consumption" design — Kafka, same envelope, `fundType`+`employeeId`+`accountHeadId` (§5.4) | — |
| 6 | Should a PDF project appear for employees who have left? | Follow `User.enabled` |
| 7 | The `/ledger-api` proxy is unauthenticated for *all* ledger data, not just PDF. Worth closing separately? | Out of scope here; PDF avoids it entirely (§5.6d) |
| 8 | **Their overhead Kafka consumers are designed but not built** (their §2.1: zero topics, zero consumers). Wait, or ship Stage 2 on the existing REST endpoints and migrate? | **Wait** — our staging is already Kafka-shaped (§5.4) |
| 9 | What should `beneficiaryProjectNumber` carry on a PDF commit? Their PDF example puts a real project number in it; a PDF spend may have no beneficiary project | Leave blank unless the spend genuinely benefits a project |
| 10 | Which of our modules currently rely on the project-side availability exemption? Overhead grants **no** exemption (their decision #3), so those will hard-fail on PDF | Identify before Stage 2 |
| 11 | **Minting skips anyone whose balance is `<= 0`**, so an employee who is *overdrawn* stays hidden — arguably the case that matters most. Switch to "any PDF activity" (`credited > 0 \|\| loaned != 0`)? | Currently `balance > 0`; one-line change in `create_pdf_project_for_user` |
| 12 | **Live PDF data contains a loan** (employee `804`, ₹1,00,000, ref `20260828LOAN03097`) even though loans are said not to be possible against PDF (§7). Test data, or a policy newer than the data? | If PDF loans are real, a project with no Loan tab cannot settle one |
| 13 | The project list defaults to the **Research** tab, so a PI whose only project is a PDF lands on an empty tab | Unchanged — pre-existing for anyone with no research projects |
| 14 | `Ado_RnD` (Associate Dean, 2 users) has no approval queue in `ProjectsView` — they see only their own projects, for every project type | Left alone; adding it changes what those users see across all projects (§6.2) |

---

## 12. Change record — for live migration and troubleshooting

Everything this feature touched, why, and what to check first if something misbehaves after
deployment. **Ordered by blast radius, riskiest first.**

The single most important thing to know: **an ordinary project must be completely unaffected.** Every
change below is gated on a project being a PDF project, and the gate is a **database lookup on
`Project Registration.is_pdf_project`**, not a string prefix — so a project that merely happens to be
numbered `PDFX…` still takes the ordinary path. Verified across real project numbers plus `None`, `""`,
`"   "`, `"NOT-A-PROJECT"` and `"PDFX"`: all routed to `account-head-*` with their arguments unaltered.

### 12.1 Highest risk — shared Kafka producers

These files are used by **every** commit and payment in the system, PDF or not.

| File | Change | Why |
|---|---|---|
| `kafka/producer/reimbursement/producer.py` | `publish_commit` / `publish_payment` call `is_overhead_project(project_name)` and delegate to the overhead package when true | PDF money lives in the Accounts overhead fund (`fundType` + `employeeId`), not the project ledger. Publishing to `account-head-commit-events` makes Accounts look for a project that does not exist. |
| `kafka/producer/reimbursement/batch_producer.py` | `publish_commit_batch` refuses a batch containing PDF rows, with a logged error | No overhead *batch* producer exists. Refusing loudly beats rows that silently dead-letter. |

> **If PDF commits arrive at Accounts but do not reserve funds**, check `status` in the payload. It must be
> `"COMMITTED"`; an omitted `status` is defaulted to `PENDING` on their side. This was a real defect caught
> before deploy — the field was missing entirely from the first build of `OverheadCommitDTO`.

**Why the routing is here and not in `commitPayment.py`:** seven doctypes import `publish_commit`
**directly** — `travel.py`, `ta_da_settlement.py`, `advance_settlement.py`, `top_up_fellowship.py`,
`disbursal_of_consultancy.py`, `disbursal_of_honorarium.py`, `po_commit_adjustment.py`. A dispatcher in
`commitPayment.py` covers only its own two call sites and silently misses every application raised from
those. That was the original bug.

> **The routing key accepts BOTH the Project Registration docname and its `project_no`.** This is not
> defensive padding — it is required. The commit staging payload carries the **docname**, which
> `get_project_number()` in the reimbursement mapper converts to `project_no` only later, inside the
> account-head path. A resolver matching `project_no` alone therefore never matched, and **every PDF commit
> silently went to `account-head-commit-events`.** That was a real defect, caught in testing only because
> the check was run with the docname rather than the project number.
>
> ```python
> from rndopsapp.rndopsapp.kafka.producer.overhead import is_overhead_project
> is_overhead_project("2026082901002324")   # docname   -> True
> is_overhead_project("PDF1411")            # project_no -> True
> ```
>
> **`publish_message(topic, payload, doc_name, dlq_topic, key)` — `doc_name` is REQUIRED.** Omitting it
> raises `TypeError` inside `publish_overhead_commit`, which swallows it into the Error Log as
> *"Overhead Commit Publish Error"* and returns False. The staging row is then marked `PUBLISHED` by the
> caller even though nothing reached Kafka. **If a commit shows PUBLISHED but never arrives, check
> Error Log for that title first.** This was a real defect: mocked tests replaced `publish_message`
> entirely and never exercised its signature.
>
> **If ordinary project commits break after deploy**, this is the first place to look.
> `is_overhead_project()` returning a false positive would divert a real project's commit to the wrong
> topic. Check with:
> ```python
> from rndopsapp.rndopsapp.kafka.producer.overhead import is_overhead_project
> is_overhead_project("<the project_no>")   # must be False for any ordinary project
> ```
> **Rollback:** delete the two `if is_overhead_project(...)` blocks in `producer.py`. Nothing else in that
> file changed, and PDF commits simply revert to going to the wrong topic — no data loss.

### 12.2 Balance lookup

| File | Change | Why |
|---|---|---|
| `commitPayment.py` | `get_project_available_amounts` branches to the overhead summary for PDF projects | Same return contract, different source — every existing caller (module unlock, balance cards, commit form) keeps working unchanged. |
| `commitPayment.py` | **`get_project_available_amounts_test` deleted** | It was an `allow_guest=True` clone, already marked *"TESTING ONLY — Remove before going to production"*. With PDF projects it becomes unauthenticated access to an employee's personal fund. |

> **If a balance reads zero after deploy:** the branch returns `{"status": "error"}` when the Accounts call
> fails, and the UI treats a missing balance as no funds, locking the modules. Check the Error Log for
> *"PDF Fund - Available Amounts Failed"*.
>
> **If something 404s on `get_project_available_amounts_test`:** that endpoint is gone deliberately.
> Nothing in this repo referenced it (verified), but an external caller might have.

### 12.3 Permissions — changes what users can see

| File | Change | Why |
|---|---|---|
| `hooks.py` | `permission_query_conditions["Project Registration"]` now points at `pdf_fund.project_registration_permission_query` | Hides other people's PDF projects from lists, search and reports. |
| `pdf_fund.py` | That function **composes** the delegation query with the PDF restriction | Project Registration already had a hook (`delegate_user`). A dict literal would have silently replaced it, breaking delegated visibility. |

> **If users suddenly cannot see projects they used to:** this is the cause. The composition ANDs two
> conditions; delegation returns `""` in the common case, so it should reduce to the PDF clause alone.
> Verified: a Permanent Employee sees 515 non-PDF projects before and after.
> **Rollback:** point the hook back at `f"{_DU}.project_registration_permission_query"`. PDF projects then
> become visible to all Permanent Employees — a disclosure, not a crash.

### 12.4 Additive — new files, no existing behaviour touched

| File | Contains |
|---|---|
| `pdf_fund.py` (new) | Minting, the ownership guard, balance/ledger reads, the permission condition |
| `kafka/producer/overhead/` (new) | `dto.py`, `producer.py` — fund-type resolution, commit/payment publishing, `overheadCommitId` resolution |
| `kafka/config.py` | Six new topic constants + a schema version. **Additive only** — no existing constant changed. |
| `project_registration.json` | `is_pdf_project`, `pdf_employee_id`, and `PDF` on `project_type`. All additive; the three existing type options are unchanged. |
| `project_registration.py` | One guard clause: `and not doc.get("is_pdf_project")` on the Kafka publish |

> **`project_registration.py` is the guard that matters most for data integrity.** Without it, minting a
> PDF project announces a phantom project to Accounts — up to 1,185 of them — sitting alongside the fund
> they already track. If phantom projects appear on the Accounts side, this guard is missing or was
> reverted.

### 12.5 Frontend

All gated on `isPdfProject` (from the loaded document) or `isPdfProjectNo()` (a `PDF` prefix check).

| File | Change |
|---|---|
| `services/pdfLedger.ts` (new) | Shared PDF ledger access — the only sanctioned path |
| `hooks/useProjectBudget.ts` | PDF short-circuit; exports `PDF_BUDGET_HEAD` / `PDF_BUDGET_HEAD_ID` |
| `pages/ProjectsView.tsx` | The `Overhead` filter tab (covers PDF/DPF/IDF/SWF/STWF, and is what approvers act on); mint-on-first-visit |
| `pages/ProjectDetailsOverview.tsx` | `isPdfProject` flag; tab/section hiding; ledger branch |
| `pages/PendingTask.tsx`, `pages/TaskRegistry.tsx`, `utils/projectTypeMapping.ts` | `Overhead` category + tab, for the approver screens |
| `components/ProjectLedgerModal.tsx`, `pages/ProjectLedgerFull.tsx`, `pages/ProjectSearch.tsx` | PDF ledger branch |
| `components/CommitPayment.tsx`, `components/BudgetActionsSidebar.tsx` | `lockBudgetHead` |
| `services/apiService.ts` | `pdfFundAPI` |

> **A React ordering trap bit this work three times.** `useMemo` / `useCallback` dependency arrays are
> evaluated **during render**, so declaring one above the `useState` / hook result it depends on throws
> `Cannot access '<name>' before initialization` at runtime. **`tsc --noEmit` does not catch it** — it
> passed cleanly every time. If a list page white-screens with that message after a change here, check
> declaration order before anything else.

> **Known limitation:** the frontend gate is a `PDF` *prefix* check, because these components only have a
> project number, not the document. The backend gate is the database flag. A real project numbered `PDF…`
> would therefore show the PDF ledger while the backend still treated it as ordinary. Real project numbers
> are `YYNN[RCO]-NNNN-…`, so this cannot currently collide — but it is the one place the two gates disagree.

### 12.5a Changes to shared screens that are NOT PDF-specific

Made alongside this feature and shipping with it, but affecting **every project type**. Recorded here
because someone debugging Pending Task or Task Registry after deployment will not otherwise know these
moved.

| Change | Files | Effect |
|---|---|---|
| **Title now shows the project title** in Task Registry | `pages/TaskRegistry.tsx` | Previously fell back to the document id when the registry API's `title` was unhelpful. Now resolves the task's Project Registration and shows `project_title`, with the old value as fallback. |
| **Funding Agency shown for every application form**, on both screens | `pages/PendingTask.tsx`, `pages/TaskRegistry.tsx` | Was hardcoded to `if (task.doctype !== "Project Registration") return "-"`, and the column only appeared when that module was selected. It is now always shown and resolved through each task's own project. |
| **New `resolveProjectRef()`** | `utils/projectTypeMapping.ts` | Returns *which* Project Registration a record points at, rather than only its category. Uses the same `DOCTYPE_PR_LINKS` strategies and fallbacks as `resolveProjectCategory`, so any doctype that could resolve a category can now resolve a project. |
| **Phase-2 fetch keeps the resolved reference** | `pages/PendingTask.tsx`, `pages/TaskRegistry.tsx` | See below. |

> **Why the Funding Agency column needs Phase-2.** The pending-task API returns only `name`, `title`,
> `status`, `creation` — **not** the link field each doctype uses to point at its project
> (`Travel.travel_project_title`, `Direct Purchase.project_no`, `Indent Cum Sanction Sheet.project_ref`, …).
> So resolving from the raw record works only for `Project Registration`, which resolves from its own name;
> everything else returned `-`.
>
> Both pages already ran a **Phase-2 batch fetch** per doctype for exactly those link fields — but computed
> the category and discarded the record. That loop now also stores the resolved `ProjectRef`, so the Title
> and Funding Agency columns work for every form at **no additional network cost**.
>
> **If Funding Agency shows `-` for an application form**, check in this order: (1) is the doctype present
> in `DOCTYPE_PR_LINKS`? (2) did the Phase-2 fetch for that doctype succeed — it swallows network/permission
> errors silently? (3) does the resolved project actually have `funding_agen` set?
>
> **If it shows a raw id instead of a name**, the `fundingagency_` lookup is the culprit, not the
> resolution — see the doctype-name warning below.

> **Two extra field loads.** `Project Registration` is now fetched with `project_title` and `funding_agen`
> on both pages (it was already fetched for the type maps), and Task Registry gained the funding-agency
> list fetch for display names — the same one Pending Task already did.
>
> ⚠️ **The funding-agency doctype is `fundingagency_`, with a trailing underscore.** There is no
> `Funding Agency` doctype. Querying that name **fails silently** — `useFrappeGetDocList` returns nothing,
> the id→name map stays empty, and the column renders the raw agency id (or `-`) with no error anywhere.
> This is exactly how Task Registry first shipped broken while Pending Task, which already used the correct
> name, worked. Both pages now use `fundingagency_` with `limit: 0`.

### 12.6 Future fund types — DPF, IDF, SWF, STWF

The routing already generalises. `resolve_overhead_scope(project_number)` returns
`(fund_type, scope)` where `scope` carries the single identifier that fund type uses:

```
PDF              -> ("PDF", {"employeeId": ...})
DPF              -> ("DPF", {"departmentId": ...})     # add here
IDF / SWF / STWF -> (fund, {})                          # global pool, no identifier
```

**To add DPF, add one branch to that function.** Nothing else changes: `OverheadCommitDTO` already carries
`departmentId`, the log/summary URLs already interpolate the fund type, and `scopeType` is derived on the
Accounts side from `fundType` + the identifier. The topic constants for all overhead funds are already in
`kafka/config.py`.

### 12.7 Post-deploy checklist

1. **Bench restart** — the Python changes will not take effect otherwise.
2. `bench --site <site> migrate` — for the three new DocFields.
3. Ordinary project: raise a commit, confirm it still lands on `account-head-commit-events`.
4. PDF project: raise a commit, confirm `overhead-commit-events` and check the Error Log is clean.
5. Confirm a Permanent Employee **cannot** see another's PDF project in Project Search.
6. Confirm no phantom PDF projects appeared on the Accounts side (§12.4).
7. Check **Error Log** for *"Overhead Commit Publish Error"* / *"Overhead Payment Publish Error"* — a
   staging row can read `PUBLISHED` while the publish itself failed, so a clean staging status is not
   proof the message left the building.
8. **Pending Task and Task Registry, on an ordinary (non-PDF) project**: confirm the Title reads as a
   project title and Funding Agency is populated for a Travel / Direct Purchase / Indent row. These
   screens changed for *all* project types (§12.5a), not just overhead ones.
