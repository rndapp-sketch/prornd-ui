# DPF Project (Departmental Development Fund) — Implementation Plan

Status: **Stage 1 (reading) implemented and verified. Stage 2 (spending) implemented, and blocked on the
same Accounts dependency as PDF** — their overhead Kafka consumers are designed but not built, so the
write path is verified against a stubbed producer only.

This is the PDF feature (`docs/pdf-project-implementation.md`) applied to a second overhead fund. It
changes exactly one axis — **the fund is scoped by department instead of by employee, and its owner is the
department head instead of a Permanent Employee** — and that second half turned out to matter far more
than expected (§5.9).

> **Read `docs/pdf-project-implementation.md` first.** This document only records the *deltas*. Where it
> says "same as PDF", it means byte-for-byte the same code path.

**Built** — the generic `overhead_fund.py` (fund registry, ownership guard, balance/ledger, minting,
permission condition, payment queue), with `pdf_fund.py` reduced to a thin PDF façade over it; the
`is_overhead_project` / `overhead_fund_type` / `overhead_scope_id` trio and the `DPF` project type; the
`DPF` branch in the Kafka scope resolver; two patches (§9); and the frontend generalisation from
`pdfLedger` to `overheadLedger`.

**Verified against live data** — every endpoint in §3 was called against `172.16.135.27:18083`. `DPF4`
(Computer Science and Engineering, ₹13,625) and `DPF10` (Mathematics, ₹25,000) both mint, list under the
Overhead tab, and resolve their balance and ledger. A different department head is denied on every path
and cannot see the project in a list at all. Ordinary projects still route to `account-head-*`, and every
user still sees exactly 515 ordinary projects.

**The one thing PDF gave no warning about:** a department head could not raise a single application, and
the failure was silent. See **§5.9** — it is the most important section in this document.

**The return path is now built too** — a settlement consumer for both
`accounts-overheadpayment-update` and `accounts-accountheadpayment-update`, so PAID / REJECTED /
RECTIFICATION decisions finally reach us instead of being inferred by polling. See **§5.10**. It closes the
same gap for ordinary project payments, which never had it either.

**Five implementation notes that differ from the plan below:**
- The generic field trio was taken (§4's recommended option), not parallel `is_dpf_project` fields, and a
  backfill patch converts existing PDF projects. Resolution still falls back to the legacy pair, so a site
  that has not run the patch keeps working.
- `pdf_fund.py` was not renamed. It became a façade so the frontend's existing `pdf_fund.*` endpoints and
  `commitPayment`'s imports kept working untouched.
- `_may_access` also accepts the live `Department_prornd.dept_head`, not just `pi_webmail`, so a newly
  appointed head can read the fund before any reconcile has run.
- `attach_module_ids` had to be fixed for **both** funds — see §5.8.2.
- Reviewing the Accounts settlement contract turned up two defects that would have silently dropped
  partial payments and blocked rejected-payment replacement; both are fixed on their side, and we now send
  a per-payment `frapRowId` (§5.10.5).
- Minting is gated on fund *activity*, not a positive balance, so a fund spent down to zero or overdrawn
  still gets a project (§5.1). This applies to PDF as well as DPF.

## 1. Requirement

1. Every **department head** (role `head_approver_1`; `Department_prornd.dept_head`) sees a **DPF project**
   in their project list — inbuilt, present on login, not something they register.
2. It appears under the existing **Overhead** tab of *My Projects*, alongside a PDF project if they also
   hold one.
3. Opening it behaves like a **normal approved project**: same application modules, already registered and
   already approved. It never passes through Project Registration's workflow.
4. Its balance and ledger come from the **Accounts overhead fund for that department** — the same
   `/overhead-transactions` API PDF uses, addressed by `fundType=DPF` + `departmentId`.
5. The head can raise **every application a PDF project offers — everything except Loan Request** (§7).
6. **A head sees only their own department's DPF** — its balance, its ledger, nothing from another
   department, no institute-wide pool. Same hard requirement as PDF §5.6, same three-part fix.
7. One DPF project **per department** (per `Department_prornd` row), not per head — a head who runs two
   departments gets two DPF projects.

## 2. What is already built (PDF) and re-used unchanged

| Mechanism | Where | Re-use for DPF |
|---|---|---|
| `Overhead` project-type tab (PIs + approvers) | `ProjectsView.tsx`, `PendingTask.tsx`, `TaskRegistry.tsx`, `projectTypeMapping.ts` | **Zero change.** `OVERHEAD_PROJECT_TYPES` already contains `'dpf'`; `normalizeProjectType` already maps it to `Overhead`. |
| Project list shows a row on `pi_webmail = currentUser` | `ProjectsView.tsx:446` | Set the DPF project's `pi_webmail` to the department head (§5.1). |
| `Approved` + `docstatus 1` routes to `/project-details-overview/:name` | `ProjectsView.tsx` | Same — no new route. |
| `isModuleLocked = !hasFunds`, unlocks on a positive balance | `ProjectDetailsOverview.tsx:1083` | Same — §5.2 makes the balance call return real numbers. |
| Kafka overhead producer, `OverheadCommitDTO`/`OverheadPaymentDTO`, envelope, topics | `kafka/producer/overhead/`, `kafka/config.py` | **`OverheadCommitDTO` already carries `departmentId`** (PDF doc §12.6). One new branch in `resolve_overhead_scope` (§5.4). |
| `check_workflow_and_publish` overhead branch, staging machinery | `commitPayment.py` | Same — routing is by `is_overhead_project()`, already fund-type-agnostic. |
| Ownership guard pattern, permission query condition | `pdf_fund.py`, `hooks.py` | Same shape, department key (§5.6). |
| Locked-state fallback tab, Loan-group removal | `ProjectDetailsOverview.tsx:1089-1098` | Driven by a flag — make the flag cover DPF (§6). |
| PDF ledger service (whitelisted, never `/ledger-api`) | `services/pdfLedger.ts` | Generalise to overhead (§6.4). |
| **Payment path** — `publish_payment` routing fallback, `publish_overhead_payment`, the `None`-argument fallbacks, `resolve_overhead_commit_id`, `_attach_module_ids` | `commitPayment.py`, `kafka/producer/overhead/`, `pdf_fund.py` | **Almost all fund-type-agnostic** — PDF doc §5.8. DPF needs: `is_overhead_project` to recognise `DPF…`, and `get_overhead_commits` to read the DPF log (§5.8 below). |
| **Payments page** — PDF commits merged into `pendingCommits`, module split, Pay button, `PaymentForm` | `pages/Payments.tsx` (only), everything downstream untouched | Generalise the one `get_pdf_commits` fetch to `get_overhead_commits` (§5.8, §6). |

**The whole of the PDF doc §5.4 (the write path), §5.5 (single-pool head collapse), §5.8 (paying a
commit), §7 (no availability exemption, quiet DLQ failures) applies verbatim** — DPF commits and payments
ride the same Kafka topics with `fundType: "DPF"`, and PDF doc §5.8.5 explicitly says *"when adding
DPF/IDF, mirror the mapper's fallbacks rather than reading the parameters."*

## 3. The Accounts DPF APIs (verified live)

Same three families as PDF doc §3. `{fundType}` = `DPF`; the scope key is `departmentId`, and
`scopeType` resolves to `DEPARTMENT` on the Accounts side.

| Purpose | PDF endpoint | DPF endpoint (all called live, all confirmed) |
|---|---|---|
| Mint probe: does this dept have a balance? | `GET /api/credit-distributions/fund-balance/pdf/employee/{employeeId}` | `GET /api/credit-distributions/fund-balance/dpf/department/{departmentId}` |
| Balance (drop-in for the project balance call) | `GET /api/overhead-transactions/PDF/summary?employeeId=…` | `GET /api/overhead-transactions/DPF/summary?departmentId=…` |
| Ledger rows | `GET /api/overhead-transactions/PDF/logs?employeeId=…` | `GET /api/overhead-transactions/DPF/logs?departmentId=…` |
| What was distributed (read-only) | `/api/credit-distributions/pdf` , `/pdf/employee/{id}` | `/api/credit-distributions/dpf` , `/dpf/department/{id}` |
| Commit / payment (write) | `POST /api/overhead-transactions/commits` `/payments` `/payments/direct` (or Kafka) | **same endpoints**, `fundType: "DPF"` |

**The summary is a drop-in — confirmed.** `DPF/summary` returns the same field names with the same
meanings, `scopeType` resolving to `DEPARTMENT`:
```json
{"fundType":"DPF","scopeType":"DEPARTMENT","departmentId":4,"employeeId":null,
 "netFundAvailable":13625.00,"totalCommitted":0,"totalPaid":0,
 "availableCommitAmount":13625.00,"availablePaymentAmount":13625.00,"outstandingLoan":0}
```

**The guardrails hold — confirmed.** Both scoped endpoints reject a missing scope with
`{"error":"departmentId is required for DPF"}`, exactly as the PDF pair rejects a missing `employeeId`.
The un-sliced variants are the dangerous ones and must stay off any head-facing path: `/fund-balance/dpf`
returns the institute total (₹46,417) **plus a per-department breakdown of everyone else's money**, and
`/credit-distributions/dpf` returns every department's deposits. PDF doc §5.6's "never call the un-sliced
Accounts endpoints" applies unchanged.

**Departments holding a DPF balance today:** 4 (CSE, ₹13,625), 10 (Mathematics, ₹25,000),
36 (EEE, ₹6,667), 64 (CICPS, ₹1,125). Departments 7 and 9 exist in the fund with a zero balance and
correctly mint nothing.

**`departmentId` is `Department_prornd.dept_id`** — the same value the deposit-slip mapper already sends.
`DPF Credit Distribution` (child of the Research / D-Consultancy deposit slips) carries
`select_dpf_dept_center_school` (Link → `Department_prornd`) and `department_id` (Data), and
`disbursal_of_consultancy.py` splits the institute share **50% to DPF, keyed by department**
(PDF doc §2). So DPF money already reaches Accounts, attached to the source consultancy project — **we are
giving an existing per-department balance a screen, exactly as with PDF.**

**Nothing must be created on the Accounts side** — no project, no fund sanction, no fund received, no
deposit slip. All of PDF doc §3.5 applies unchanged, `employee` → `department`.

## 4. Identifying a DPF project

Mirror PDF doc §4. Add fields to `Project Registration`:

| Fieldname | Type | Purpose |
|---|---|---|
| `is_overhead_project` | Check | **Recommended:** one flag for *any* overhead fund, replacing `is_pdf_project` going forward (keep `is_pdf_project` as a still-set alias for one release, or migrate it). Every backend branch tests this. |
| `overhead_fund_type` | Select (`PDF`, `DPF`, `IDF`, `SWF`, `STWF`) | Which fund — decides `employeeId` vs `departmentId` and the Accounts URL. |
| `overhead_scope_id` | Data | The id sent to Accounts: `employee_id` for PDF, `dept_id` for DPF. Replaces `pdf_employee_id`. |

> **Cheaper alternative** if you want to touch less: keep `is_pdf_project` semantics, add a parallel
> `is_dpf_project` + `dpf_department_id`, and duplicate each branch. This works but doubles the branch
> count for every future fund type. The generic trio above is the recommended path — DPF is the moment it
> pays off, and IDF/SWF/STWF then cost almost nothing.

- **`project_no` convention: `DPF{dept_id}`** (e.g. `DPF42`). Like `PDF{employee_id}` it never reaches the
  project ledger endpoints — every call is branched away — so it only has to be unique and recognisable.
  Note it is **guessable**, so ownership is still checked server-side (§5.6).
- **`project_type` gains `DPF`.** The frontend already filters the Overhead tab on it
  (`OVERHEAD_PROJECT_TYPES`), and the *Other Project Details* overview section is gated on
  `project_type === "Other"`, so DPF must be its own type, not `Other` — same reasoning as PDF doc §4.
- **`project_title`: `Departmental Development Fund — {dept_name}`.**

## 5. Backend changes

New module **`overhead_fund.py`** (recommended — rename/extend `pdf_fund.py`; keep the old dotted paths as
thin re-exports for one release so `apiService.ts` and the frontend keep working during rollout). All
functions become fund-type-aware by reading `overhead_fund_type` / `overhead_scope_id` off the project row.

### 5.1 Minting — `ensure_dpf_project()` / `create_dpf_project_for_department(dept)`

Iterate `Department_prornd` rows that **have a `dept_head`** and **a positive DPF balance**
(probe `/fund-balance/dpf/department/{dept_id}` — mint on first balance, not in bulk, PDF doc §10). For
each, create one pre-approved row:

```python
doc = frappe.get_doc({
    "doctype": "Project Registration",
    "project_title": f"Departmental Development Fund — {dept.dept_name}",
    "project_type": "DPF",
    "implementation_department": dept.name,      # Department_prornd docname
    "applicant_department": dept.name,
    "designation": head_designation or "Head of Department",
    "pi_webmail": dept.dept_head,                # the department head — drives the list row
    "project_no": f"DPF{dept.dept_id}",
    "is_overhead_project": 1,
    "overhead_fund_type": "DPF",
    "overhead_scope_id": dept.dept_id,
    "workflow_state": "Approved",
})
doc.flags.ignore_permissions = True
doc.flags.ignore_workflow = True
doc.insert()
frappe.db.set_value("Project Registration", doc.name, {"workflow_state": "Approved", "docstatus": 1})
```

Use the same `frappe.db.set_value` escape hatch PDF minting settled on (PDF doc "implementation notes") —
the workflow engine refuses a Draft → Approved jump and a DPF project is pre-approved by definition.

> **Suppress the Kafka `publish_project` for DPF too.** `project_registration.py` already guards on
> `not doc.get("is_pdf_project")` — change that to `not doc.get("is_overhead_project")` so minting a DPF
> project does not announce a phantom project to Accounts (PDF doc §5.1, §12.4). This is the single most
> important guard for data integrity.

> **Reconcile `pi_webmail` when the head changes.** Unlike PDF (an employee id never changes owner), a
> department's head rotates. `ensure_dpf_project` must, for an existing DPF project, update `pi_webmail` to
> the current `Department_prornd.dept_head` if it differs — otherwise the old head keeps seeing the fund
> and the new head does not. Cheap: one `frappe.db.set_value` when they diverge. **Open question 4.**

**Where `ensure` is called from:** the same mint-on-first-visit effect in `ProjectsView.tsx` that already
calls `pdfFundAPI.ensureProject`. Extend it (or add a sibling call) so a `head_approver_1` login triggers
`ensure_dpf_project`. `ensure_dpf_project` resolves the department(s) from
`Department_prornd where dept_head = frappe.session.user` — never from client input.

#### Minting is gated on *activity*, not a positive balance

The first cut minted only when `balance > 0`. That hid exactly the funds their owner most
needs to see: a PI who had spent their PDF down to zero, or a department that was
overdrawn, got no project at all — so their own spending history vanished and an overdraft
was invisible. `has_fund_activity()` replaces it:

```python
credited != 0 or loaned != 0 or balance != 0
```

| Fund state | Project minted? |
|---|---|
| credited, unspent (`6,250`) | yes |
| **spent down to exactly `0`** | **yes** |
| **overdrawn (negative)** | **yes** |
| loan taken, nets to `0` | yes |
| **never credited at all** | no |

> **Why "never credited" still has to be excluded.** The probe endpoint
> `/credit-distributions/fund-balance/pdf/employee/{id}` **never 404s** — a completely
> made-up employee id comes back `200` with `{"credited": 0, "loaned": 0, "balance": 0}`.
> So "has a fund record" cannot be distinguished from "has nothing"; a non-zero figure is
> the only available signal. Without that exclusion every one of the **1,185** Permanent
> Employees would be minted a project showing ₹0 with every module locked, roughly tripling
> the Project Registration table. With it, **507** employees qualify today (484 with a
> positive credit, 17 netting zero) and 4 DPF departments.

> **A listed fund is not necessarily a spendable one.** `isModuleLocked = !hasFunds`, and
> `hasFunds` is `commitableBalance > 0 || actualBalance > 0` — so a project minted at zero
> or negative opens with every module locked and falls back to the Recruitment tab (§7).
> That is intended: the owner can now *see* the fund and its ledger, which is what was
> missing, but cannot spend from a fund with nothing in it.

**No backfill is needed.** Minting runs from `ensure_overhead_projects` on the project
list, so anyone previously skipped for a zero balance gets their project on next login.

### 5.2 The balance branch — `get_project_available_amounts`

`_resolve_pdf_employee_id` becomes `_resolve_overhead_scope(project_number)` → returns
`(fund_type, scope_dict)` or `None`. `get_project_available_amounts` branches:

```python
scope = _resolve_overhead_scope(project_number)     # ownership-checked, §5.6
if scope:
    return _get_overhead_available_amounts(*scope)   # calls /overhead-transactions/{fund}/summary
...  # existing project path, untouched
```

`_get_overhead_available_amounts("DPF", {"departmentId": "42"})` calls
`/overhead-transactions/DPF/summary?departmentId=42`, maps `netFundAvailable → totalFundReceived`, passes
the other four straight through. Same return contract → **module unlock, balance cards and the commit form
all keep working unchanged.**

### 5.3 The ledger branch — `get_overhead_ledger(project_number)`

`/overhead-transactions/DPF/logs?departmentId=…`. Same two adaptations PDF needed
(`referenceNumber → refDetails`, `paymentBalance → balance`), same server-side folding of any
loan/settlement rows into the received/payment columns (harmless for DPF even though DPF has no loans —
PDF doc §6.4). Trust the Accounts service's running balances rather than recomputing `received − paid`.

### 5.4 The write path — `resolve_overhead_scope` gets one branch

PDF doc §12.6 spelled this out:

```
PDF -> ("PDF", {"employeeId": <overhead_scope_id>})
DPF -> ("DPF", {"departmentId": <overhead_scope_id>})     # ← add this branch
IDF / SWF / STWF -> (fund, {})
```

Nothing else in `kafka/producer/overhead/` changes: `OverheadCommitDTO` already has `departmentId`, the
log/summary URLs already interpolate `{fundType}`, `scopeType` is derived Accounts-side, and the topic
constants for every overhead fund already exist in `kafka/config.py`. `is_overhead_project()` already
routes any `is_overhead_project` row (verify it keys off the flag / `overhead_fund_type`, not a `PDF`
string prefix — if it prefix-matches `"PDF"`, widen it to also accept `"DPF"` **and** the docname, per PDF
doc §12.1).

**`status: "COMMITTED"` and `doc_name` on `publish_message` are still mandatory** (PDF doc §12.1) — the
two defects that bit PDF will bite DPF identically.

**The no-availability-exemption behaviour (PDF doc §7 warning) applies.** Every DPF commit, settlements
included, is subject to the fund-availability check. A department salary commit (Recruitment,
`moduleId "11"`) that exceeds the remaining DPF balance is **rejected**, not carried — and because it
travels over Kafka, the rejection is a DLQ entry, not an error the user sees. Whatever publish-outcome
visibility exists for PDF matters equally here. **Open question 6.**

### 5.5 Head-wise everything collapses to one `Overhead` pool

Identical to PDF doc §5.5 / §5.7. A DPF project has no sanctioned budget breakup, so:

- the budget head is **fixed to `Overhead`** (Budget Head `id = 1`) and locked, not hidden;
- `accountHeadId: 1` **is sent** on every commit (`OverheadCommit` holds a real `AccountHead`);
- head-wise **sanction** validation is skipped — validate against the DPF pool balance (§5.2) only;
- `budgetHeads={["Overhead"]}` must be **injected** into `CommitPayment` — the details page derives that
  list from the sanction, which a DPF project does not have.

### 5.6 Scoping — a head sees only their own department's DPF

Same exposure as PDF doc §5.6 (a `read=1` doctype permission + a non-owner-filtered Project Search + a
whitelisted balance endpoint that trusts the client's project number + a guessable `DPF{dept_id}`
number). Same three fixes:

**a. Derive and verify the department, never take it from the client.**

```python
def _resolve_overhead_scope(project_number):
    pr = frappe.db.get_value(
        "Project Registration",
        {"project_no": project_number, "is_overhead_project": 1},
        ["name", "pi_webmail", "overhead_fund_type", "overhead_scope_id"],
        as_dict=True,
    )
    if not pr:
        return None                                   # ordinary project path

    roles = frappe.get_roles(frappe.session.user)
    privileged = any(r in roles for r in ("staff, RnD", "Hos, RnD (Head of Section, RnD)",
                                          "Dean, RnD", "Director", "System Manager"))
    if pr.pi_webmail != frappe.session.user and not privileged:
        frappe.throw(_("You are not permitted to view this fund."), frappe.PermissionError)

    if pr.overhead_fund_type == "DPF":
        return ("DPF", {"departmentId": pr.overhead_scope_id})
    if pr.overhead_fund_type == "PDF":
        return ("PDF", {"employeeId": pr.overhead_scope_id})
    ...
```

The `pi_webmail == session.user` check *is* the "is this the department head?" check, because minting
(and the §5.1 reconcile) keeps `pi_webmail` equal to `Department_prornd.dept_head`. If you prefer to check
against `Department_prornd.dept_head` live instead of trusting `pi_webmail`, do that — it is one extra
`get_value` and removes the reconcile dependency for the read path (writes still need `pi_webmail` right
for the list row).

**b. Permission query condition** — extend the existing `project_registration_permission_query` so a
non-privileged user sees an overhead project only when they own it:
`is_overhead_project = 0 OR pi_webmail = '<session user>'`. This already exists for `is_pdf_project`;
change the column. It still **composes** with the delegation query (PDF doc §12.3) — do not replace it
with a dict literal.

**c. `get_project_available_amounts_test`** — already deleted for PDF. Nothing to do; just confirm it did
not come back.

**d. DPF data must NEVER go through `/ledger-api`.** Same rule, same reason (PDF doc §5.6d): the proxy is
unauthenticated, so a `departmentId` in a browser-constructed URL lets anyone read any department's DPF
history. Every DPF read/write goes through a whitelisted Frappe method that resolves `departmentId` from
the session user. `services/pdfLedger.ts` (→ `overheadLedger.ts`) is the only sanctioned path.

### 5.8 Paying a DPF commit

Mirrors PDF doc §5.8 exactly: a commit is raised → it shows in **Pending Commits** on the Payments page →
`staff, RnD` pay it → the payment publishes to `overhead-payment-events` with `fundType: "DPF"`. The PDF
payment path was **verified end to end** (only the Kafka producer stubbed), and almost all of it is
fund-type-agnostic — DPF inherits it. Only two pieces have a `PDF` assumption to widen.

#### 5.8.1 The `publish_payment` routing fallback — already generic, just widen the gate

`submit_payment_data` publishes a payment with **`project_name=None`** (deliberate — the mapper reads
`doc.project_ref_number`). PDF doc §5.8.1 fixed the overhead routing to fall back:
`routing_project = project_name or doc.project_ref_number`. **That fix already covers DPF** — provided
`is_overhead_project(routing_project)` recognises a `DPF…` `project_no` **and** the docname (§5.4, PDF doc
§12.1). Nothing new here beyond the `is_overhead_project` widening §5.4 already calls for. Test it with
`project_name=None`, the only shape the real caller uses.

#### 5.8.2 Listing DPF commits for payment — one new whitelisted method

`Payments.tsx` sources Pending Commits from `getCommitsByStatus(['COMMITTED','PARTIALLY_PAID','OVERPAYMENT'])`
→ `/ledger-api/account-head-commit/by-status/{status}`, which is project-side only and goes through the
proxy DPF must not use. PDF doc §5.8.2 added `get_pdf_commits()`. **Generalise it to
`get_overhead_commits()`** (in `overhead_fund.py`), which fans out over every overhead project the caller
is entitled to see, reads COMMIT rows from `/overhead-transactions/{fund}/logs?{scopeKey}=…` (so
`DPF/logs?departmentId=…`), filters to the three payable statuses, and maps to the existing `CommitRecord`
shape:

| `CommitRecord` field | From the overhead log |
|---|---|
| `transactionCommitNumber` | `transactionId` — **this is the `overheadCommitId`** |
| `projectNumber` | the DPF project's `project_no` (`DPF{dept_id}`) |
| `accountHeadId` | `1` (Overhead) |
| `commitAmount`, `commitDate`, `commitParticular`, `status`, `frapAppId` | direct |
| `moduleId` | **not in the log** — recovered from `Kafka Commit Staging` by `frapAppId` via `attach_module_ids()` (PDF doc §5.8.3). See the correction below. |

> #### Correction: `attach_module_ids` never worked, for PDF either
> PDF doc §5.8.3 says the module is recovered from the staged payload. It is not: nothing writes a module
> into that payload unless a caller passed a **deliberate override** (ICSS PO re-commit sends 14), so for
> an ordinary commit the key is simply absent and `moduleId` came back `null` on every row. The Payments
> page therefore could not split Miscellaneous Commit (25) and Recruitment (11) out of Pending Commits, and
> every overhead commit piled into one tab.
>
> The staging row does carry `reference_doctype`, which is exactly what the producer maps through Module
> Registry to derive `moduleId` at publish time. `attach_module_ids` now falls back to that, one lookup per
> distinct doctype. Verified: the existing `PDF804` commit resolves `moduleId "5"` (Reimbursement) where it
> previously returned `null`.
>
> **This changes PDF behaviour as well as DPF's** — worth re-checking the Payments tab split when testing.

#### 5.8.3 No new tab, no downstream change

The Payments page's *Miscellaneous Commit* tab is `pendingCommits` filtered to `moduleId` 25 / 11 — not a
separate feed. So DPF commits merge into the same `pendingCommits` array and route themselves (a DPF
Reimbursement commit → *Pending Commits*, a DPF module-25 commit → *Miscellaneous Commit*). The Pay
button, `PaymentForm`, `submit_payment_data`, `publish_overhead_payment` are all untouched — they only
ever see a `CommitRecord`, and `publish_overhead_payment` already prefers `doc.commit_id`
(= `transactionCommitNumber` = `overheadCommitId`) with `resolve_overhead_commit_id`'s log scan as
fallback (PDF doc §5.8.3, §5.8.5).

#### 5.8.4 Visibility — the same deliberate exception to §5.6

`get_overhead_commits()` is **role-gated to the staff roles** (`PDF_PRIVILEGED_ROLES` → rename
`OVERHEAD_PRIVILEGED_ROLES`), not open to any logged-in user. `staff, RnD` process payments on everyone's
behalf, so the payment queue aggregates across all departments' DPF commits — exactly as it does for PDF
and for project commits. A department head still cannot read another department's balance, ledger or
project (§5.6a–d); only the staff-facing payment queue crosses the scope boundary.

#### 5.8.5 The `None`-argument trap — PDF doc §5.8.5 warns about this by name

`submit_payment_data` passes `project_name`, `payment_amount` and `bmr` as `None` on purpose, expecting
the mapper to read the document. PDF doc §5.8.5 says explicitly: *"When adding DPF/IDF, mirror the
mapper's fallbacks rather than reading the parameters."* Concretely, `publish_overhead_payment` for DPF
must read `payment_amount` / `bmr` / `budget_head` off the doc when the argument is `None`, and keep the
zero/negative-amount guard that now refuses a `paymentAmount: 0.0` publish outright. If the overhead
producer is already written generically (it is, for PDF), DPF needs **nothing** here — this note exists so
that if someone writes a DPF-specific payment branch, they do not reintroduce the ₹0-payment bug.

#### 5.8.6 Partial payments

Rely on the Accounts service's own `status` transitions (`COMMITTED` → `PARTIALLY_PAID` → `SETTLED`),
same as PDF and the project side. `/payments/direct` is not part of this flow.

### 5.9 Letting a department head actually raise applications

**This is the one part of DPF that PDF gave no clue about, and it blocks everything.**

A PDF project is owned by a PI, who is a `Permanent Employee` — and `Permanent Employee`
is the role every application doctype and every application workflow was built around. So
PDF inherited the whole application suite for free. A DPF project is owned by a
**department head** (`Department_prornd.dept_head`, role `head_approver_1`), who holds none
of those roles. The fund plumbing works perfectly and the head still cannot spend a rupee.

The symptom is peculiar enough to be worth recording: **the head can open the fund, read
the balance, and create a draft — but the draft never appears in any list, and Submit fails
silently with an empty error message.** That is two independent gates failing in different
ways, which is why fixing either one alone looks like it does nothing.

| # | Gate | Effect when closed | Doctypes affected |
|---|---|---|---|
| 1 | **DocPerm** — `Reimbursement`, `Indent General Form` and `Disbursal of Consultancy` never granted the general applicant role (the other doctypes grant `All_ProRnd_User`, which a head does hold) | No read / create / submit at all. The draft exists but `frappe.get_list` filters it out, so it is invisible in the desk list *and* in the app. | 3 |
| 2 | **Workflow transitions** — the initial `Submit` transition is gated on `allowed = "Permanent Employee"` | The transition matches no role the head has, so `submit_*` finds no candidate and returns `{"status": "error", "message": ""}` — an empty error, because nothing threw. | 11 |

Twelve of the fourteen application doctypes were blocked by one gate or the other. Only
Temporary Advance and Indent cum Sanction Sheet worked, because their workflows happen to
allow `All_ProRnd_User` on the initial transition.

#### The fix — `patchs/grant_head_application_access.py`

Idempotent, and it grants **`head_approver_1`, not `All_ProRnd_User`**. That distinction
matters: `head_approver_1` is exactly the 47 department heads, whereas `All_ProRnd_User`
would hand create/submit rights on these forms to **589 additional users** who have no
business raising them. Widening to `All_ProRnd_User` would have been the "consistent with
Travel" choice and it is the wrong one.

- **DocPerm**: adds `head_approver_1` with `read`/`write`/`create`/`submit` via
  `frappe.permissions.add_permission` + `update_permission_property` (the supported route,
  so Custom DocPerm rows are created properly).
- **Workflow**: for each initial-state transition whose `allowed` is `Permanent Employee`,
  clones it field-for-field with only `allowed` changed. Cloning rather than constructing
  carries any `condition` or self-approval setting across untouched instead of guessing.

**Loan Request is deliberately excluded**, so a head still cannot raise one. Loans are not
possible against an overhead fund (§7) and the frontend already drops the Loan group, so
granting it would contradict the design. It is the only doctype left blocked, and that is
the intended end state.

> **`allow_edit` on the workflow states was deliberately left alone.** It takes a single
> role, so adding the head would mean *replacing* the applicant — a change with a far wider
> blast radius. It does not bite today because the app saves through whitelisted methods
> (`save_reimbursement_data` and friends) that pass `ignore_permissions=True`. If a head
> ever reports being unable to *edit* a draft from the Frappe desk rather than the app,
> this is the reason.

> **A department head raising an application against an ordinary project is now possible
> too.** The grant is per-doctype, not per-project — it cannot be scoped to DPF, because
> permissions and workflows have no notion of which fund a document is spending. This is a
> genuine widening beyond DPF and it should be a conscious decision, not a side effect: the
> alternative is a `head_approver_1`-specific workflow condition on every transition, which
> is far more machinery for a distinction nobody has asked for.

### 5.10 Settlement events — what Accounts decides comes back

Everything up to here is one-way: we publish a payment and never learn what happened to
it. The Payments screen inferred status by *polling* the ledger REST API, and PAID /
REJECTED / RECTIFICATION were invisible. **This closes the loop, and it closes it for
project payments too** — the gap was never DPF-specific, it just surfaced here.

Built against the Accounts team's *"Overhead Payment Events"* spec (v3). Their side is
built and unit-tested but **not yet deployed**; ours reads from the beginning of the topic,
so settlements published before we go live are replayed rather than lost.

#### 5.10.1 One consumer, two streams

The streams differ only in field names, so normalising beats maintaining two consumers
that drift:

| Internal | `accounts-overheadpayment-update` | `accounts-accountheadpayment-update` |
|---|---|---|
| `payment_id` | `overheadPaymentId` | `transactionPaymentNumber` |
| `commit_id` | `overheadCommitId` | `transactionCommitNumber` |
| `status` | `paymentStatus` | `paymentStatus` |
| `remarks` | inline on the payload | absent — reason lives behind the comments API |
| `source` | `OVERHEAD` | `PROJECT` |

**`source` is part of every lookup key, never the numeric id alone.** Overhead payment #2
and project payment #2 are different records in different tables with independent id
sequences.

#### 5.10.2 Resolution — three routes, most precise first

1. **`frapRowId`** — the payment row's own docname. Exact, and the *only* key that
   separates two instalments made against the same commit for the same amount on the same
   day. Added to both payment DTOs for exactly this (§5.10.5).
2. **`accounts_payment_id`** — their PK, once recorded.
3. **`frapAppId` + `commit_id`** — the legacy route for payments published before
   `frapRowId` existed. Ambiguous by construction when one application has several payments
   against a commit, so it **refuses rather than guesses** when more than one row matches.

#### 5.10.3 The project stream echoes; the overhead one does not

`accounts-accountheadpayment-update` publishes from **seven** places — payment created,
batch created, updated, generic status change, the three settle actions, and salary bulk
actions. So a `PENDING` event there is normally **the echo of a payment we just published
ourselves**. The overhead topic publishes on the three settle actions only.

Naively ignoring `PENDING` would be safe but wasteful. **The echo is harvested instead:**
it carries `transactionPaymentNumber`, which is the *only* source we have for
`accounts_payment_id` on the project side. Record the id, then stop — it is not routed as
a decision and raises no notification.

> **The one case where that would lose information.** `PATCH /{id}/status` can set a
> payment back to `PENDING` deliberately — an accounts correction, not an echo. Nothing in
> their UI does this today. Taking their refinement: a `PENDING` message is treated as
> meaningful **only when we already hold that payment in a settled state**, so a real reset
> still lands while an echo does not.

#### 5.10.4 Applying and telling

- **Idempotent on `(payment_id, status)`.** Delivery is at-least-once and the event is a
  state snapshot, so a repeat is a no-op — verified not to raise a second notification.
- **`PAID`** stores the bank reference and clears any prior reason; **`REJECTED`** and
  **`RECTIFICATION`** store `remarks`. A stale bank reference is never left behind.
- **Comment + Notification Log**, the same convention the Fund Received consumer uses. The
  note goes on the **application**, not just the `AccountHeadPayment` — nobody goes looking
  for a payment row. The application is resolved from `frapAppId` through
  `Kafka Commit Staging`, which is the only place the docname's *doctype* is recorded.
> ### The new fields must be `hidden`, not merely read-only
> `AccountHeadPayment`'s payment form is generated from the doctype's own fields — both
> `PaymentModal` and `PaymentForm` fetch `get_account_head_payment_fields` and render what
> comes back. Adding the six settlement fields as read-only therefore put six new boxes in
> front of every user recording a payment (*Accounts Payment Id*, *Settlement Source*,
> *Settlement Remarks*, *Commit Status*, *Total Paid Against Commit*, *Remaining On Commit*)
> — fields nobody fills in, describing a decision that has not happened yet.
>
> They are `hidden: 1` as well. `PaymentModal` filters on `!f.hidden`, so the form is back to
> its original 9 fields. Nothing functional is lost: the consumer writes them with
> `frappe.db.set_value`, which never goes through form rendering, and the decision reaches
> the initiator through the comment and notification rather than through a form field.
>
> **The lesson generalises:** on a doctype whose form is rendered from its own metadata,
> read-only is not the same as invisible. Storage fields need `hidden`.

- **Acknowledging is deliberate.** An unresolvable, statusless or malformed message returns
  True. Replaying it forever would block the partition and it will never resolve on retry.
  Only an unexpected exception returns False.

#### 5.10.5 `frapRowId` — a defect this work surfaced in the contract

Reviewing their v1 spec against our code turned up two things that would have misfired,
both now fixed on their side:

| Their v1 rule | Why it broke | Outcome |
|---|---|---|
| Skip a message when `frapAppId` already exists | `frapAppId` is the **application docname** — it repeats across every instalment and correction. A second partial payment looked like a duplicate: answered `COMPLETED`, nothing written. `COMMITTED → PARTIALLY_PAID → SETTLED` could not progress past the first payment. Their same rule was also dropping repeat overhead *commits*. | Replaced by a state-reading rule on their side |
| A replacement for a `REJECTED` payment needs a *new* `frapAppId` | We cannot mint one: `resolve_overhead_commit_id()` correlates commits by `frapAppId` against their log, and there is no lookup-by-`frapAppId` endpoint. A synthetic id would leave every payment unable to find its commit. | They now insert a new row on the same docname |

The residual gap — a redelivered correction arrives when the row is `PENDING` again, which
the docname alone cannot tell from a genuine second instalment — is closed by **`frapRowId`**:
the payment row's own docname, unique per payment, sent alongside the unchanged `frapAppId`
on **both** streams (`OverheadPaymentDTO` and `AccountHeadPaymentDTO`).

> **The two ids are not always different, and that is fine.** On the project side
> `frapAppId` falls back to the *project number* when no application id is passed; on the
> overhead side it falls back to the payment docname. Both values are always unique;
> `frapRowId` is simply the only one that is reliably *per payment*.

> **A dead file cost an hour.** `AccountHeadPayment/dto.py` defines an `AccountHeadPaymentDTO`
> that is imported nowhere — the live one is `kafka/producer/reimbursement/dto.py`. Reading
> the wrong one produced a confident, wrong claim that the project stream carried no
> correlation id at all. Check what the mapper actually imports.

> **Anchor your edits on something unique.** `frapAppId` + `moduleId` appears in *both*
> DTOs in `reimbursement/dto.py`, so a first-match replace landed `frapRowId` on
> `AccountHeadCommitDTO` instead. Caught only because the mapper then raised
> `TypeError: unexpected keyword argument`. The commit DTO is asserted unchanged in the tests.

#### 5.10.6 Deliberately not built yet

- **The Resubmit action.** A `staff, RnD`-only transition that republishes a corrected
  payment on the same `frapAppId`, mirroring Fund Received's *Forward*. **Accounts deploys
  first**; until they do, a corrected payment is accepted with `COMPLETED` and silently
  dropped, so shipping the button now would be a trap. Rectification is terminal in the
  meantime, exactly as their checklist asks.
- **Application workflow states.** Routing an application into *Payment Rejected* /
  *Payment Rectification* means adding states and transitions to thirteen doctypes — a much
  wider blast radius than this feature, and a separate decision. The decision is already
  *visible* today through `payment_status`, `settlement_remarks`, the comment and the
  notification; only the workflow position is missing. **Open question 17.**

#### 5.10.7 A risk on their side worth tracking

Their own footer: the outbound topic is created at startup with **2 replicas**, and *if
fewer brokers are available it is not created — the publish fails while the settlement
still commits.* That is silent divergence: Accounts would consider a payment settled and we
would never hear. It is invisible from our side by construction, so it needs written
confirmation before release rather than a code change here. **Open question 18.**

#### 5.10.8 The Pay button never flipped to *Payment Pending*

The Payments page swaps a commit's **Pay** button for *Payment Pending* + **View** as soon
as a payment exists against it — `commitPaymentInfo` maps `transaction_commit_number` →
payment, built from `ledgerService.getAllPayments()`.

That call hits `/account-head-payments`, which is the **project** payment table. An overhead
payment lives in the Accounts overhead tables and never appears there, so the map had no
entry, the row kept offering **Pay** on a commit that had already been paid, and staff could
submit a second payment against it. Exactly the duplicate-payment class the guard exists to
prevent — reintroduced for overhead by omission.

`get_overhead_payments()` closes it, mirroring `get_overhead_commits()`: same role gate,
same fan-out, PAYMENT rows mapped into the ledger's payment shape and merged in
`fetchPayments`.

> **A PAYMENT row carries no parent commit id.** Its keys are `transactionId`,
> `paymentAmount`, `status`, `frapAppId`, … and nothing pointing at the COMMIT it draws
> against — the two have independent id sequences, both starting at 1. The only link is the
> **`frapAppId` they share** (the application docname), so the fund's log is read once and a
> `frapAppId → commit transactionId` map built from its COMMIT rows before the PAYMENT rows
> are mapped. Where an application has been re-committed, the newest commit wins.

Verified on live data: `PDF804` commit `1` (₹1,000, module 10 — Disbursal of Honorarium) now
finds payment `1` (₹1,000, `PENDING`), so the row renders *Payment Pending* + **View**
instead of **Pay**.

## 6. Frontend changes

Small, because §2 does the work. Recommended: generalise the PDF hooks to "overhead" rather than add a
parallel DPF set.

| File | Change |
|---|---|
| `services/pdfLedger.ts` → `services/overheadLedger.ts` | `isPdfProjectNo` → `isOverheadProjectNo` (prefix in `["PDF", "DPF"]`, later the rest). `fetchPdfLedger` → `fetchOverheadLedger`, pointing at `overhead_fund.get_overhead_ledger`. Re-export the old names for one release. |
| `hooks/useProjectBudget.ts` | Widen the `projectCode.startsWith("PDF")` short-circuit to `isOverheadProjectNo(projectCode)`; call `get_overhead_balance`. `PDF_BUDGET_HEAD*` stay as-is (still `Overhead` / `1`). |
| `pages/ProjectDetailsOverview.tsx` | `isPdfProject` → `isOverheadProject` (`Boolean(data?.is_overhead_project)` or `project_type ∈ overhead set`). Every existing `isPdfProject` branch — Sanction tab removal, sanction/fund-received journey `null`, Funding Agency / Investigators / Clearance hidden, Loan group dropped, locked-fallback tab `Recruitment`, ledger branch — applies to DPF unchanged. |
| `components/BudgetActionsSidebar.tsx` | `lockBudgetHead={isOverheadProjectNo(projectName)}` instead of `.startsWith("PDF")`. |
| `components/ProjectLedgerModal.tsx`, `pages/ProjectLedgerFull.tsx`, `pages/ProjectSearch.tsx` | Swap `isPdfProjectNo` → `isOverheadProjectNo`, `fetchPdfLedger` → `fetchOverheadLedger`. No logic change. |
| `pages/ProjectsView.tsx` | Mint effect: also call `ensure_dpf_project` (a `head_approver_1` user). Refetch the list only if something was created — same pattern as the PDF call. The Overhead tab, counts and colours already handle DPF. |
| `services/apiService.ts` | `pdfFundAPI` → `overheadFundAPI` with `ensureDpfProject`, `getBalance`, `getLedger`, **`getCommits`** (whitelisted methods only — no `/ledger-api` entry). |
| `pages/Payments.tsx` | Generalise the one `get_pdf_commits` fetch (added for PDF) to `get_overhead_commits` so DPF commits also merge into `pendingCommits`. Still resolves to `[]` on failure so it can never blank the project commit list (PDF doc §5.8.5). Everything downstream — Pay button, `PaymentForm`, module split — is untouched. |
| `pages/PendingTask.tsx`, `pages/TaskRegistry.tsx` | Overhead tasks now land in the Overhead tab for every approver role (§6.4). Nothing else for DPF itself — the `Overhead` category + tab already cover `dpf`, and DPF applications land in the approver queue exactly as PDF's do. Both gained the role-derived tab label (§6.1). `TaskRegistry` had no auth wiring at all and gained `useFrappeAuth` + `useUserRoles` solely for it. |
| `utils/projectTypeMapping.ts` | `overheadTabLabel()` / `projectTypeTabLabel()` (§6.1). |
| `hooks/useIsOverheadProject.ts` (new) | `useIsOverheadProject()` plus the shared account-head helpers `budgetHeadFieldnamesOf` / `overheadHeadValue` / `overheadHeadUpdates` (§6.2). |
| `components/forms/DynamicFormRenderer.tsx` | `overheadFund` prop — fixes and locks every Budget Head selector (§6.2). |
| 14 application forms, incl. `pages/TemporaryAdvance.tsx` and `pages/DirectPurchase.tsx` | Pass the flag; the latter two apply it in their own hand-rolled field loops (§6.2). |
| `pages/application/TADASettlementForm.tsx` | **Not overhead-specific** — "Advance Taken" is now 0 unless the Travel requested an advance (§6.3). |

### 6.1 Naming the Overhead tab after the fund the user actually holds

The tab holds every overhead fund, but almost nobody holds more than one kind: a department
head sees only their DPF, a PI only their PDF. So the label is derived from the viewer's
roles — **DPF** for a head, **PDF** for a PI — while R&D approvers keep **Overhead**, because
their queue genuinely merges both.

| Roles | Label | Why |
|---|---|---|
| `staff, RnD`, `Hos, RnD`, `Dean, RnD`, `Director`, `Ado_RnD` | `Overhead` | Their queue mixes every PI's and every head's funds. **Checked first** — a Dean may also hold a head or Permanent Employee role. |
| `head_approver_1`, `head_department_center_school`, `HoD` / `HoC` / `HoS` | `DPF` | Owns a Departmental Development Fund. |
| `Permanent Employee` | `PDF` | Owns a Personal Development Fund. |
| anything else | `Overhead` | Safe default; the tab is empty for them anyway. |

> **This is display only, and it has to be.** `ProjectCategory`, the tab filter, the counts
> map, both colour maps and — critically — **PendingTask's `?type=` URL parameter** all stay
> keyed on the string `'Overhead'`. Renaming the value would break every deep link into that
> tab and silently drop the colour lookups, which index by tab name. Only the rendered text
> changes; `projectTypeTabLabel(tab, roles)` returns the tab unchanged for the other three.

> **Why not derive it from the projects in the tab instead?** That would be more precise for
> a user holding both funds — but `PendingTask` and `TaskRegistry` only ever see the
> *normalised* `ProjectCategory`; `resolveProjectCategory` discards the raw `pdf`/`dpf`
> value. Content-derived labelling would work on `ProjectsView` and be impossible on the
> other two, which is worse than one rule applied consistently.

Verified against real accounts: `hodcse` / `hodmath` / `headsiss` → **DPF**;
`abhinavgusain` / `ranbir` → **PDF**; a `staff, RnD` user and the multi-role
`prorndadmin` (Dean + Director + head + Permanent Employee) → **Overhead**.

> **The React declaration-order trap (PDF doc §12.5) still applies** — a `useMemo`/`useCallback` dep array
> referencing a value declared below it throws `Cannot access '<name>' before initialization` at runtime
> and `tsc` does not catch it. If a list page white-screens after these edits, check order first.

> **The frontend/backend gate can disagree** (PDF doc §12.5 "Known limitation"): the frontend gate is a
> `PDF`/`DPF` *prefix*, the backend gate is the DB flag. Real project numbers are `YYNN[RCO]-NNNN-…`, so a
> genuine project starting `DPF` cannot currently exist — but that is the one seam.

### 6.2 The account head is fixed to Overhead on every application form

An overhead fund is a single pool with **no head dimension** — every spend books to
`Overhead` (Budget Head id 1), and the Kafka producer hardcodes `accountHeadId` to it
regardless. Leaving the applicant free to pick from ~36 heads could therefore only ever
produce a form value that disagreed with what was published. Now the head is **set and
locked** wherever an overhead project is being spent from.

#### The field is found by metadata, not by name

The fieldname differs per doctype, so hardcoding a list would have missed forms silently:

| Doctype | Field | Declared as |
|---|---|---|
| Reimbursement, Travel, Direct Purchase, Disbursal of Honorarium, Recruitment, Top Up Fellowship, Rate Contract | `account_head` | `Link` → `Budget Head` |
| Indent Cum Sanction Sheet | `icss_account_head` | `Link` → `Budget Head` |
| Miscellaneous Commit | `budget_head` | `Link` → `Budget Head` |
| **Temporary Advance** | `account_head` | **`Data`** — free text, no options |
| **TA/DA Settlement** | `ta_da_account_head` | **`Data`** |
| **Indent General Form** | `igf_account_head` | **`Select`** over Consumable / Contingency / Equipments / Other |

So the rule is two-part, in `budgetHeadFieldnamesOf()`:

1. **`fieldtype === "Link"` and `options === "Budget Head"`** — the clean signal, and the one
   that catches Indent General Form, because that page *rewrites* `igf_account_head` into a
   Link on Budget Head before rendering.
2. Otherwise **a known fieldname, but only once real options exist** — for forms that declare
   the head as `Data` and turn it into a dropdown client-side (TravelForm rewrites the
   fieldtype; AdvanceSettlementForm injects the options). The options check is what stops a
   genuinely free-text head being clobbered.

> **`igf_account_head` is deliberately absent from the name list.** On the doctype it is a
> Select whose options are not Budget Heads at all. It is reached only through rule 1, via
> IGF's own rewrite — so if that rewrite is ever removed, the field is left alone instead of
> being handed a Budget Head docname it cannot hold.

**What gets written** differs with the field: a Link stores the Budget Head **docname**
(matched via the option whose *label* is `Overhead`), while a plain `Data` head takes the
literal name. `overheadHeadValue()` handles both.

#### Three renderers, one rule

Most forms render through `DynamicFormRenderer`, which gained one prop — `overheadFund`.
But **`TemporaryAdvance.tsx` and `DirectPurchase.tsx` hand-roll their own field loops**, a
parallel implementation of the renderer, so they had to apply it themselves. To stop the
two versions drifting, detection and value both live in `hooks/useIsOverheadProject.ts` and
all three call the same helpers.

| Where | How |
|---|---|
| `components/forms/DynamicFormRenderer.tsx` | `overheadFund` prop → sets the value via `onChange` and forces `fieldIsReadOnly` |
| `pages/TemporaryAdvance.tsx`, `pages/DirectPurchase.tsx` | their own loops → `setFormData` in an effect, and `isReadOnly` forced in the loop |

Effects apply only the **pending** changes (`overheadHeadUpdates` returns an empty object
when the form is already correct), which is what keeps them from looping.

#### Knowing whether the project is an overhead fund

`useIsOverheadProject()` — needed because forms hold the project in different shapes:
`travel_project_title` is a Project Registration **docname**, `project_code` / `project_no`
are a **project_no**. Both are accepted:

1. A `PDF…` / `DPF…` prefix answers it with **no request at all** — the common case.
2. Otherwise one lookup on `is_overhead_project`, the same database flag the backend gates
   on, because a docname carries no hint of the fund.

It returns `false` while the lookup is in flight: briefly treating an overhead project as
ordinary is harmless, the reverse is not.

#### Covered

**14 forms:** Reimbursement, Travel, TA/DA Settlement, Temporary Advance, Advance
Settlement, Direct Purchase, Indent General Form, Indent Cum Sanction Sheet, Recruitment
Adhoc Contractual, Top Up Fellowship, Disbursal of Consultancy, Disbursal of Honorarium,
Miscellaneous Commit, Rate Contract.

**Not covered:** the Details / approval views (`TravelDetails`, `DirectPurchaseDetails`,
`PendingTaskDetails`, …). Those are the staff commit path, which goes through
`CommitPayment` — see below.

> ### The commit tab was locking onto the *wrong* head
> `BudgetActionsSidebar` passes `budgetHeads` to `CommitPayment` from `budgetHeadList` —
> the **whole Budget Head master table** — not from `useProjectBudget().heads`. So for an
> overhead project CommitPayment received all ~36 heads and defaulted to `budgetHeads[0]`,
> whichever sorted first, and `lockBudgetHead` then *froze it there*.
>
> PDF doc §6.5 claims the head "renders fixed at Overhead rather than merely defaulting to
> it". That was only ever true of the `useProjectBudget` list, which is not what is passed.
> `budgetHeadNames` is now narrowed to `['Overhead']` when the project is overhead, so the
> default is Overhead and the lock holds the right value.
>
> No data was corrupted — the producer hardcodes `accountHeadId = 1` — but the stored
> `budget_head` could disagree with what was published, which matters for the payment
> pre-flight that resolves `budget_head` back to an account head id (PDF doc §5.8.5).

### 6.3 Changes to shared screens that are NOT overhead-specific

Made alongside this work and shipping with it, but affecting **every project type**.
Recorded here for the same reason PDF doc §12.5a exists: someone debugging these screens
later will not otherwise know they moved.

#### TA/DA Settlement — "Advance Taken (INR)" is 0 unless the Travel asked for an advance

`TADASettlementForm` pre-fills `ta_da_advance_taken` from the Travel application the
settlement is raised against — the committed amount from the ledger, falling back to the
Travel's own `total_estimate`. It did so **unconditionally**, regardless of whether that
Travel had ever requested an advance.

Travel has a Select field `do_you_need_advance` (`Yes` / `No`). When it says **No**, no
advance was ever drawn, so there is nothing for the settlement to offset — yet the form
still filled the figure in, making the claimant appear to owe money back on a trip they
took entirely at their own cost.

**This was live.** Of the settlements on this site, **two carry a non-zero Advance Taken
whose Travel said `No`** — for example Travel `202606227A001276`, `do_you_need_advance = "No"`,
`total_estimate = 31,978`, which was being pulled straight into the settlement.

Two helpers now gate all **three** places that resolved the value (one on initial load, two
when a Travel is picked in the form):

```ts
const travelNeedsAdvance = (travelDoc) =>
    String(travelDoc?.do_you_need_advance ?? "").trim().toLowerCase() === "yes";

const resolveAdvanceTaken = (travelDoc, ledgerAdvance) => {
    if (!travelNeedsAdvance(travelDoc)) return 0;   // nothing was drawn
    if (ledgerAdvance != null) return ledgerAdvance; // the ledger is authoritative
    return parseFloat(travelDoc?.total_estimate || 0) || 0;  // commit not landed yet
};
```

> **Anything that is not an explicit `Yes` counts as no advance.** Three Travel documents on
> this site have the field blank — older records predating it. Treating blank as *No* is the
> safe reading: a spurious 0 is visible and correctable by the applicant, whereas a spurious
> advance silently reduces what they are reimbursed.

> **The field is genuinely available to the form.** Both call sites fetch the Travel through
> `frappe.client.get` with only `{doctype, name}`, which returns the *whole* document — so
> `do_you_need_advance` is present. Verified against live records for both `Yes` and `No`. Had
> either site been field-limited, this gate would have forced every settlement to 0.

### 6.4 Overhead applications in Pending Task and Task Registry

An application raised against an overhead fund must land in the **Overhead** tab on both
approver screens. The category machinery already handled this — `resolveProjectCategory`
looks the application's project up in a `Project Registration` map and
`normalizeProjectType` maps `pdf` / `dpf` → `Overhead` — but it was silently failing for
some approvers, and the failure mode is worth recording because **this feature caused it**.

#### The bug: the permission condition hid the project from the approver

§5.6b hides overhead projects from anyone who does not own them. That is correct for the
*fund* — but the approver screens build their project-type map by **listing Project
Registration as the current user**. So an approver without a privileged role received the
application in their queue, could not see its project, the map lookup missed, and the task
fell into **Others**.

Observed live: a PDF Disbursal of Honorarium sat under *Others* for an `Ado_RnD` user.
`adornd@iitg.ac.in` saw **515** projects where a `staff, RnD` user saw **521** — the six
missing ones were the overhead funds.

#### Two fixes, and why both

**1. `Ado_RnD` joins `OVERHEAD_PRIVILEGED_ROLES`.** An Associate Dean is R&D office: they
approve and act on these applications, so they need the project behind one — not only for
the tab, but for the Title and Funding Agency columns, which resolve through it (PDF doc
§12.5a). Its omission was an oversight, not a decision.

**2. `resolveProjectCategory` falls back to the project *number*.** When the project lookup
misses, a `pr_project_no` strategy now checks whether the value itself starts with
`PDF` / `DPF` / `IDF` / `SWF` / `STWF`:

```ts
const primary = applyStrategy(mapping.primary);
if (primary) return normalizeProjectType(primary);

const overheadByNumber = [mapping.primary, mapping.fallback].some(
    (strategy) => strategy?.type === 'pr_project_no' &&
                  looksLikeOverheadProjectNo(record[strategy.field]),
);
if (overheadByNumber) return 'Overhead';
```

> **The second fix is the important one, and it is not redundant.** Granting a role is a
> per-role patch that will be wrong again the next time a role receives an overhead
> application. The prefix fallback fixes the tab for **every** role without widening access
> to anything — the project number is already on the application the approver can see, and
> it reveals no balance.
>
> It is what keeps **`head_approver_1` out of the privileged list**. A department head
> approves applications from their department, which can include a PI's *personal* PDF
> spend; letting them read that project would expose a colleague's earnings, which §5.6
> exists to prevent. With the fallback their tab is still correct.

Verified: the honorarium resolves to `Overhead` both for an approver who can see the
project and one who cannot, an ordinary project still resolves to `Research` either way,
and a real project number (`2627R-0312-EEEN0883GAUR`) is never mistaken for an overhead
one. Scoping is unchanged — a PI still cannot see another PI's fund, and a department head
cannot see a PI's.

## 7. Module allow-list

**Identical to PDF doc §7. A DPF project offers everything except Loan Request.** Loans are not possible
against a DPF fund. Implemented by the same `groups.filter(g => g.title !== "Loan")` when
`isOverheadProject`, and the same PDF-aware locked-state fallback (`Recruitment`, not `Loan`).

> ⚠️ **Hiding the Loan tab is only the frontend half. The list below describes what a head can raise only
> once `grant_head_application_access` has run** — without it a department head is blocked on twelve of
> these fourteen doctypes, and the failure is silent. See **§5.9**. Loan Request is the one doctype the
> patch deliberately leaves blocked, so the backend enforces the same rule the UI shows.

The Accounts overhead summary will still report `outstandingLoan` / `grossLoanIssued` / `loanSettled` for
DPF — their data model carries the fields; the institute does not permit the loans — so ignore those
figures when rendering a DPF balance.

| Module | DPF? | Module | DPF? |
|---|---|---|---|
| Travel | yes | Recruitment (Adhoc/Contractual) | yes |
| Reimbursement | yes | Disbursal (Top Up Fellowship, Honorarium, Consultancy) | yes |
| Temporary Advance | yes | Indent General / Indent cum Sanction | yes |
| Direct Purchase | yes | Commit / De-Commit (`staff, RnD` only) | yes |
| **Loan Request** | **no** | | |

## 8. Scale and blast radius

| | |
|---|---|
| `Department_prornd` rows | **81** |
| …with a `dept_head` set (all of which also have a `dept_id`) | **35** |
| …holding a positive DPF balance today | **4** — CSE, Mathematics, EEE, CICPS |
| Users with `head_approver_1` | **47** (all 35 dept heads hold it) |
| Institute-wide DPF balance | **₹46,417** |
| One head running several departments | `headsiss@iitg.ac.in` heads **6**; only CICPS has a balance, so one project today |
| Duplicate `dept_id` | `71` appears twice — but only one of the pair has a `dept_head`, so nothing collides |

Mint on first *activity* (§5.1). The department count is small (tens, not ~1,185 employees), so the
Project Registration table barely grows. A fund that has moved is minted even when its balance is now zero
or negative — that is the state its owner most needs to see — but a fund that was never credited is still
skipped, since that project would show nothing but locked modules.

For PDF the same rule is what keeps the scale sane: **507** employees have PDF activity today, against
**1,185** Permanent Employees. Minting for everyone would roughly triple the Project Registration table to
hand most people an empty project.

**An ordinary project must be completely unaffected.** Every DPF branch is gated on the
`is_overhead_project` DB flag (not a string prefix), exactly as PDF's are — PDF doc §12 verified this
against real project numbers plus `None`, `""`, `"   "`, `"NOT-A-PROJECT"`, `"PDFX"`. Re-run that check
with `"DPFX"` added.

## 9. File inventory

**Backend** (`rndopsapp/rndopsapp/`)
- `doctype/project_registration/project_registration.json` — add `is_overhead_project`,
  `overhead_fund_type`, `overhead_scope_id`, and the `DPF` option on `project_type` (§4). Keep
  `is_pdf_project` / `pdf_employee_id` for one release or migrate them in a patch.
- `pdf_fund.py` → `overhead_fund.py` — generalise minting, the ownership guard, balance/ledger reads and
  the permission condition to be fund-type-aware; add `create_dpf_project_for_department`,
  `ensure_dpf_project`; the `pi_webmail` reconcile (§5.1).
- `doctype/project_registration/project_registration.py` — `not doc.get("is_pdf_project")` →
  `not doc.get("is_overhead_project")` on the `publish_project` guard.
- `commitPayment.py` — `_resolve_pdf_employee_id` → `_resolve_overhead_scope`; `_get_pdf_available_amounts`
  → `_get_overhead_available_amounts`; whitelisted `get_overhead_balance` / `get_overhead_ledger`.
- `pdf_fund.py` → `overhead_fund.py` — `get_pdf_commits` → `get_overhead_commits` (fund-type-aware log
  scan, role-gated, `_attach_module_ids` from `Kafka Commit Staging`); the payment path is otherwise
  generic (§5.8).
- `kafka/producer/overhead/producer.py` — add the `DPF -> ("DPF", {"departmentId": …})` branch to
  `resolve_overhead_scope`; confirm `is_overhead_project()` matches by flag + docname, not `PDF` prefix —
  this one check gates **both** the commit and the payment routing (§5.4, §5.8.1). `publish_payment`'s
  `routing_project = project_name or doc.project_ref_number` fallback and `publish_overhead_payment`'s
  `None`-argument fallbacks were built for PDF and need no DPF change (§5.8.5).
- `hooks.py` — permission query condition already points at the composed function; no change if the
  column swap is done inside it.
- `patchs/backfill_overhead_fund_fields.py` — copies `is_pdf_project` / `pdf_employee_id` into the generic
  trio on existing PDF projects. Idempotent; resolution falls back to the legacy pair regardless, so a site
  that has not run it still works.
- `kafka/consumer/payment_update/` (new package) — `dto.py` (normalises both settlement streams into one
  shape), `mapper.py` (resolution, echo detection, apply, notify), `consumer.py` (a handler per topic).
- `kafka/config.py` — `TOPIC_OVERHEAD_PAYMENT_UPDATE`, `TOPIC_ACCOUNT_HEAD_PAYMENT_UPDATE`, both added to
  `ALL_CONSUMER_TOPICS` (and deliberately **not** to `NEW_DLQ_CONSUMER_TOPICS`, so they replay from the
  beginning rather than skipping a backlog that does not exist).
- `kafka/consumer/handler.py` — two entries in `TOPIC_HANDLERS`.
- `kafka/producer/overhead/dto.py`, `kafka/producer/reimbursement/dto.py` — `frapRowId` on both payment
  DTOs; populated in `overhead/producer.py` and `reimbursement/mapper.py` from the payment document.
- `doctype/accountheadpayment/accountheadpayment.json` — an *Accounts Settlement* section with
  `accounts_payment_id`, `settlement_source`, `settlement_remarks`, `commit_status`, `total_paid_amount`,
  `remaining_amount`. Additive, read-only **and `hidden`** — see the warning in §5.10.4.
- `patchs/grant_head_application_access.py` — **the patch without which DPF is unusable.** Grants
  `head_approver_1` DocPerm on the three doctypes missing it and clones the applicant's initial `Submit`
  workflow transition for the head role on eleven more. See §5.9.

**Frontend** (`src/`) — see the table in §6. Net: ~6 files, mostly `isPdfProjectNo` → `isOverheadProjectNo`
and one flag rename, plus the `ensure_dpf_project` call in the mint effect.

## 10. Rollout

**Stage 1 — reading.** Mint the DPF project, branch the balance call, branch the ledger, apply the module
allow-list, **and the scoping work in §5.6** (not optional — Stage 1 is what exposes the balances).
Near-zero risk; nothing writes. A department head can finally see what their DPF holds.

**Stage 2 — spending (commit + payment).** DPF commits over `overhead-commit-events` and payments over
`overhead-payment-events`, both `fundType: "DPF"`. The PDF equivalent — including the full payment flow
(Pending Commits list → Pay → publish) — is **built and verified end to end** (PDF doc §5.8), so the path
is well-trodden. If PDF Stage 2 has shipped by the time this is picked up, DPF Stage 2 is nearly free:
the `resolve_overhead_scope` branch (§5.4), the `is_overhead_project` widening (which gates both commit
*and* payment routing), `get_overhead_commits` for the payment queue (§5.8.2), and the
availability-exemption audit (§5.4).

> **Same external blocker as PDF Stage 2** — the Accounts overhead Kafka *consumers* are designed but not
> built (PDF doc §5.4, §11 Q8). PDF Stage 2 verification was done against a stubbed Kafka producer. DPF
> waits behind the same dependency; nothing DPF-specific makes it worse.

**Stage 3 — the return path (§5.10).** Consume `accounts-overheadpayment-update` and
`accounts-accountheadpayment-update` so PAID / REJECTED / RECTIFICATION decisions land on the payment and
reach the initiator. **Built and tested.** Independent of Stage 2: it only reads, and it works for ordinary
project payments regardless of whether any overhead commit has ever been published.

Ship it with the **Resubmit** action disabled — Accounts deploys first, and until they do a corrected
payment is accepted with `COMPLETED` and silently dropped (§5.10.6). Register the consumer group as
`accounts-<domain>-group` and confirm read access on the production cluster before their release.

## 11. Open questions

| # | Question | Default if unanswered |
|---|---|---|
| 1 | ~~Are the DPF Accounts endpoints in §3 correct?~~ **Answered: yes**, all called live (§3) | — |
| 2 | ~~Is `departmentId` the `dept_id` or the docname?~~ **Answered: `dept_id`**, verified against live balances | — |
| 3 | ~~Generic trio or parallel `is_dpf_project`?~~ **Decided: generic** (§4), with a backfill patch and a legacy fallback | — |
| 4 | When a department's `dept_head` changes, reconcile `pi_webmail` on the DPF project (so the new head sees it, the old one stops) — on every `ensure` call, or via a `Department_prornd` `on_update` hook? | Reconcile in `ensure_dpf_project`; add the hook if lag is a problem |
| 5 | A head who runs two departments gets two DPF projects — acceptable, or merge? | Two projects (requirement 7) |
| 5a | ~~Mint only when the balance is positive?~~ **Decided: no** — mint on any fund activity, so a spent-down or overdrawn fund is still visible (§5.1). Resolves PDF doc §11 Q11 the same way, for both funds. | — |
| 6 | Which modules rely on the project-side availability exemption? Overhead grants none, so those hard-fail on DPF (esp. Recruitment salary commits, which departments *will* raise). | Identify before Stage 2 (PDF doc §11 Q10) |
| 7 | Should a DPF project appear for a department whose head has left / is disabled? | Follow `User.enabled` on `dept_head`; hide until a new head is set |
| 8 | Who approves DPF spending — the same chain as a normal project, or does a head spending their department's fund skip a level? | Unchanged from a normal project (PDF doc §11 Q3) |
| 9 | `Project Registration.designation` is mandatory. What value for a DPF project? | `dept_head`'s `designation_name`, else the literal `"Head of Department"` |
| 10 | Does `User.department` resolve for a `head_approver_1` user in this install? PDF doc's note #2 says `User` has `department_name` / `designation_name`, not `department` — but `HeadOverview.tsx` reads `department`. Minting takes the department from `Department_prornd.dept_head` and sidesteps this, but `ensure` still needs the reverse lookup. | Resolve department via `Department_prornd where dept_head = session.user`, not via `User.department` |
| 11 | `IDF` / `SWF` / `STWF` are institute-wide pools with no scope id and no obvious single owner (Dean, RnD? Director?). Out of scope here, but the generic trio in §4 leaves them one branch away. | Out of scope |
| 12 | Does `/overhead-transactions/DPF/logs` return COMMIT rows with the same fields PDF's does? FUND_RECEIVED rows are confirmed identical; no DPF **commit** exists yet to check, since Stage 2 is blocked | Assume identical; re-check on the first real DPF commit |
| 15 | **Granting `head_approver_1` also lets a head raise applications against ordinary projects** (§5.9) — permissions cannot be scoped per fund. Accept, or add a per-transition condition? | Accepted; the alternative is far more machinery |
| 16 | `allow_edit` on the workflow initial states still names only `Permanent Employee` (§5.9). Harmless while the app saves through `ignore_permissions` methods — but a head editing a draft from the Frappe **desk** would be blocked | Left alone; revisit only if someone hits it |
| 17 | Should a settlement decision move the **application's** workflow into *Payment Rejected* / *Payment Rectification*? That means new states and transitions on thirteen doctypes (§5.10.6) | Not built. The decision is already visible via `payment_status`, `settlement_remarks`, a comment and a notification |
| 18 | Accounts' outbound topic is created at startup with **2 replicas**; with fewer brokers it is not created, the publish fails, **and the settlement still commits** (§5.10.7). Silent divergence, invisible from our side | Needs written confirmation from Accounts before release |
| 19 | The **Resubmit** action for a rectified payment is deliberately not shipped until Accounts deploys their resubmission fix (§5.10.6) | Enable once they are live |
| 13 | `get_overhead_commits` fans out one log call per overhead project the staff user may see. For DPF that is bounded by the department count (§8) plus PDF projects — fine today. Revisit if IDF/SWF/STWF or bulk minting ever inflate that set. | Concurrent fan-out, as PDF does |
