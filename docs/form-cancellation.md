# Form Cancellation — full implementation reference

Everything needed to reproduce the Form Cancellation feature exactly as it
exists in this working tree. Two repos are involved:

| Repo | Branch | Role |
|---|---|---|
| `rndopsapp` (Frappe app) | `Sumits-Changes` | doctype, workflow mirroring, API, hooks |
| `prornd-ui` (React) | `other-pi-v0.7` | modal, banner, tabs, pending-task view |

Read `docs/activity-log.md` alongside this — the cancellation timeline depends
on it.

---

## 1. Concept

A submitted document cannot simply be deleted: it has commitments in the
ledger, an approval history, and downstream Kafka staging rows. So cancelling
is itself an **approval workflow**.

Asking to cancel document `X` creates a **separate `Cancellation Request`
document** that walks the *same approval chain* `X` originally walked. When
that request is approved, `X` is stamped `Cancelled` and its ledger commitment
is released.

The single most important consequence, and the source of most confusion:

> The cancellation's approvals, comments and state live on the **Cancellation
> Request**, not on the document being cancelled.

---

## 2. Backend

### 2.1 Doctype — `Cancellation Request`

`rndopsapp/rndopsapp/doctype/cancellation_request/`

- `autoname`: `format:CANCEL-{reference_doctype_short}-{YYYY}{MM}{DD}-{####}`
- `is_submittable: 1`  ← **drives the biggest gotcha, see §2.5**
- `track_changes: 1`
- Permissions: `System Manager` and `All` (read/write/create/submit)

| Field | Type | Notes |
|---|---|---|
| `reference_doctype` | Link → DocType | what is being cancelled |
| `reference_name` | Dynamic Link | ↑ |
| `reference_owner` | Link → User | original applicant |
| `reference_doctype_short` | Data | naming series component, e.g. `TRAV`, `RAC` |
| `requested_by` | Link → User | who asked |
| `request_date` | Datetime | |
| `status` | Select | `Pending` / `Approved` / `Rejected` — **independent of `workflow_state`** |
| `cancellation_reason` | Small Text | required |
| `source_workflow` | Data | name of the *original* document's Workflow |
| `workflow_state` | Data | current state in the mirrored workflow |
| `amended_from` | Link | standard |

`status` vs `workflow_state` is a real distinction: `workflow_state` is where
the approval chain is; `status` is only set to `Approved` once the original
document has actually been cancelled.

### 2.2 Workflow mirroring — `_setup_cancellation_workflow()`

`cancellation_api.py`. On the first cancellation of a given doctype, a Workflow
named **`cancel_<source_workflow_name>`** is created against
`Cancellation Request`, copying every state and transition from the source
workflow (state, doc_status, allow_edit, action, next_state, allowed roles,
allow_self_approval).

Live inventory in this tree:

```
cancel_Rate_contract_workflow                          11 states  46 transitions
cancel_recruitment_work_flow                           10 states  13 transitions
cancel_pending_approval_prjReg                         19 states  33 transitions
cancel_fund_received_with_kafka                         9 states  12 transitions
cancel_fund_sanction_workflow                          12 states  16 transitions
cancel_Reimbursement                                   10 states   9 transitions
cancel_Travel_Workflow                                 10 states  34 transitions
cancel_Disbursal_Honorarium_Workflow_Through_Rest_API   8 states  10 transitions
```

**Frappe allows only one active Workflow per doctype.** Since all of these
target `Cancellation Request`, the app *swaps which one is active* immediately
before touching a request:

```python
UPDATE `tabWorkflow`
SET is_active = (CASE WHEN name = %s THEN 1 ELSE 0 END)
WHERE document_type = 'Cancellation Request'
```

This happens in `CancellationRequest.before_validate() → activate_workflow()`
and again in `create_cancellation_request`, each followed by
`frappe.clear_cache(doctype="Cancellation Request")`. Expect exactly one
`is_active=1` at rest — whichever was touched last. That is normal, not drift.

`WorkflowManager._get_workflow_doc()` (`workflow_pipeline.py`) bypasses the
active flag entirely and resolves `cancel_{self.doc.source_workflow}` directly,
which is why actions work regardless of which one is flagged active.

> Reimbursement is special-cased: its `cancel_` workflow is **deleted and
> rebuilt** on every setup, and `Pending Staff Approval → Verify (With
> Hardcopy)/Approve` is collapsed to a single `Approve` landing on the terminal
> approved state.

### 2.3 Creating a request — `create_cancellation_request(reference_doctype, reference_name, cancellation_reason)`

1. Reference doctype/name and a non-blank reason are required.
2. Referenced document must exist.
3. **Authorisation**: requester must be the document's `owner`, a
   `System Manager`, the head of the document's department (`Department_prornd.dept_head`),
   or named in one of the associated fields (`head`, `head_approver`,
   `department_head`, `current_approver`, `reimbursement_for_id`,
   `travel_other_pi_id`, `igf_other_pi_id`, `icss_other_pi_id`,
   `other_pi_email`, `pi_id`, `pi`, `pi_webmail`, `pi_mentor_user`,
   `pi_userid`). Otherwise: *"You can only cancel documents that you own or head."*
4. Rejects a duplicate request that is still `status = Pending`.
5. Activates `cancel_<source_workflow>` (see §2.2), then inserts the request as
   `Draft`.
6. `_setup_cancellation_workflow()`, then `apply_workflow()` with
   `_get_first_transition_action()` to move Draft → first pending state.
7. **`_maybe_bypass_head_approval()`** — see §2.4.
8. Writes an `Info` comment on the *original* document:
   `Cancellation requested by {user}. Reason: {reason}. Request ID: {name}`.

### 2.4 Head-approval bypass

`Pending Head Approval` deadlocks when the head cannot act. Guarded by a single
constant at the top of `cancellation_api.py`:

```python
CANCELLATION_HEAD_BYPASS_MODE = "deadlock"   # or "always"
```

In `deadlock` mode the head stage is skipped only when:

- the **requester is** the `dept_head` of the document's department, or
- **no `dept_head` is resolvable** (no department field, or the department has
  no head configured)

`"always"` skips it for every cancellation.

Department is resolved from the first non-empty of `department_travel`,
`applicant_department`, `department`, `dept`, `department_name`. The forward
target is read from the workflow (`_next_state_after_head()` — prefers actions
`Forward`/`Approve`, skips anything matching reject/return/send back/put
back/cancel), never hardcoded. Every bypass writes an `Info` comment saying why.

Applied on **both** paths that can reach the head: at creation, and later via
`CancellationRequest._maybe_bypass_head()` when a PI forwards to the head.

### 2.5 ⚠️ `docstatus = 1` — the bug that broke everything

`Cancellation Request` is submittable. **A `doc.save()` on a submitted document
fires `on_update_after_submit`, not `on_update`** — and every workflow
transition after the first happens while submitted.

This silently broke the whole feature: `_mark_original_as_cancelled()` lives in
`on_update`, so a request could reach `workflow_state = "Approved"` while
`status` stayed `Pending` and **the original document was never cancelled**.
The UI then showed a permanent "Cancelling" spinner, because
`has_pending_cancellation` is derived from `status == "Pending"`.

The fix, in `cancellation_request.py`:

```python
def on_update_after_submit(self):
    self.on_update()

def on_submit(self):
    self.on_update()
```

The identical trap applies to any global hook — see `docs/activity-log.md` §2.

### 2.6 Applying the cancellation — `_mark_original_as_cancelled()`

Runs when `workflow_state` matches `approved`, `sanction approved` or
`endorsement approved` (substring match, case-insensitive):

1. `frappe.db.set_value(ref_doctype, ref_name, "workflow_state", "Cancelled")` —
   a direct write, bypassing workflow validation.
2. `self.db_set("status", "Approved")`.
3. Marks every matching `Kafka Commit Staging` row `CANCELLED`.
4. `PATCH http://172.16.134.81:18080/api/account-head-commit/status/by-project-frap`
   with `{projectNumber, frapAppId, status: "CANCELLED"}` to release the ledger
   commitment. Project number is resolved from the staging payload, else from
   `project_no`/`project_code`/`project_name`/`upfa_project_code`, then mapped
   through `Project Registration.project_no`.
5. Audit comments on both documents.

All failures are logged, not raised — a ledger outage will not roll back the
cancellation.

### 2.7 API surface — `rndopsapp.rndopsapp.cancellation_api.*`

| Method | Purpose |
|---|---|
| `get_my_applications()` | Non-terminal applications owned by the user. Each record carries `has_pending_cancellation` **and** a `cancellation` object (`name`, `status`, `workflow_state`, `creation`). |
| `get_my_cancellation_requests()` | Every request the user raised, any state, plus `reference_state` (the live state of each referenced document). Backs the Cancellation Requests tab. |
| `create_cancellation_request(...)` | §2.3 |
| `get_cancellation_status(reference_doctype, reference_name)` | `{has_cancellation, has_pending, cancellation_requests[]}` for the banner. |
| `get_cancellation_request_details(cancellation_name)` | Approver view. |
| `get_original_commitment(reference_doctype, reference_name)` | Ledger commitment being released. |

> `validate_original_document_not_locked(doc, method=None)` exists in the module
> but is **not registered in `hooks.py`** — dead code today. It would block
> edits to a document with a pending cancellation. Wire it up or delete it.

### 2.8 Pending-task scoping — `module_registry.py`

Without scoping, every head sees every cancellation request. `get_pending_task`
special-cases `Cancellation Request`:

- Collects **all** `cancel_*` workflows for the doctype (not just the active one).
- Always fetches `reference_doctype` + `reference_name`.
- For non-System-Managers, loads the referenced document and filters by *its*
  approver at the current state:
  - `Pending Head Approval` → `Travel.travel_head_approver_id` if set (Other-PI
    re-points the head to the funding PI's department); else `dept_field_map`;
    else `head_field_map`; else `head`/`head_approver`/`department_head`/`dept_head`;
    else any department-looking field. Never falls through to "show everyone".
  - Specific-approver states (Other PI) → matched against the reference doc.
  - `Pending PI Approval` → `reimbursement_for_id`/`pi_id`/`pi_webmail`/`pi`/
    `pi_email`/`pi_mentor_user`.

```python
dept_field_map = {
    "Travel":                    "department_travel",
    "Reimbursement":             "applicant_department",
    "Indent General Form":       "igf_department_centre_section",
    "Indent Cum Sanction Sheet": "icss_applicant_department__centre__section",
    "Direct Purchase":           "applicant_department",
    "Temporary Advance":         "applicant_department",
}
```

### 2.9 Activity trail

`Cancellation Request` is in `activity_logger.TRACKED_DOCTYPES` (category
`Other`). `api.get_document_activity` merges the request's own comments into the
**referenced** document's timeline as `type: "cancellation"`, so the form shows
its cancellation history. Print PDFs filter those rows out. Full detail in
`docs/activity-log.md`.

---

## 3. Frontend

### 3.1 Files

| File | Purpose |
|---|---|
| `pages/FormApplication.tsx` | The Form Cancellation page: tabs, list, cancel action |
| `components/CancellationModal.tsx` | Reason capture → `create_cancellation_request` |
| `components/CancellationStatusBanner.tsx` | Shared banner on document detail pages |
| `components/MyCancellationRequests.tsx` | "Cancellation Requests" tab |
| `utils/cancellationLabels.ts` | `awaitingLabel()` — state → approver name |
| `pages/PendingTaskDetails.tsx` | Approver view + workflow actions for requests |

Route: `form-application`, wrapped in `AuthRouteWrapper allowedRole="All_ProRnd_User"`.
Sidebar: **"Form Cancellation"** → `/form-application`, shown only when
`isPermanentEmployee`.

### 3.2 Status presentation (do not use a spinner)

The original UI showed `<Loader2 className="animate-spin" /> Cancelling`, which
reads as *work in progress* — requesters waited for an automatic cancellation
that was never coming. Replaced with the true state:

| Condition | Renders |
|---|---|
| `cancellation.status === "Approved"` | grey **Cancelled** badge, `Ban` icon |
| `has_pending_cancellation` | amber **Cancellation requested** + *"with {approver}"*, static `Clock`, **clickable** → the request |
| rejected / none | the normal **Cancel** button |

`awaitingLabel()` turns `"Pending Head Approval"` into `"Head"` by stripping the
`Pending …Approval` boilerplate — cancellation workflows mirror arbitrary source
workflows, so a fixed state map would not hold.

### 3.3 Approver actions

`PendingTaskDetails.tsx` drives requests through
`rndopsapp.workflow_pipeline.get_available_workflow_actions` /
`perform_workflow_action`, both passed `doctype: "Cancellation Request"`. The
action dialog's typed comment is recorded **by the backend hook**, not by the
frontend — do not re-add an `add_project_comment` call after the action or it
will double-post (see `docs/activity-log.md` §2).

---

## 4. Reproducing this on another machine

1. Check out `rndopsapp` @ `Sumits-Changes` and `prornd-ui` @ `other-pi-v0.7`.
2. `bench --site <site> migrate` to create the `Cancellation Request` doctype.
3. `bench --site <site> clear-cache` — **required** after any doctype JSON or
   `hooks.py` change; Frappe serves doctype metadata and hooks from cache.
4. The `cancel_*` workflows are **created on demand** — they are data, not
   fixtures. They appear the first time a document of that type is cancelled.
   Do not hand-create them.
5. Restart the bench process so `hooks.py` reloads.

### Verifying it works

```python
# The chain that was silently broken. status must reach "Approved"
# and the referenced document must reach "Cancelled".
doc = frappe.get_doc("Cancellation Request", name)
print(doc.workflow_state, doc.status,
      frappe.db.get_value(doc.reference_doctype, doc.reference_name, "workflow_state"))
```

Find requests stranded by the §2.5 bug:

```python
[r for r in frappe.get_all("Cancellation Request",
        filters={"docstatus": ["<", 2]},
        fields=["name","workflow_state","status"])
 if "approved" in (r.workflow_state or "").lower() and r.status != "Approved"]
```

---

## 5. Known gaps

- **Rate Contract cancellations are shown to every head.** It *is* in
  `head_field_map` (`"Rate Contract": "current_approver"`), but that field does
  **not exist** on the doctype — verified with `frappe.get_meta("Rate Contract")`.
  So `h_email` resolves to `""`, the guard `if h_email and h_email != current_user`
  never fires, and nothing is filtered. Worse, matching the `elif ref_dt in
  head_field_map` branch means it never reaches the department fallback either —
  and Rate Contract has no `applicant_department`/`department`/`dept` field
  anyway. Fix by pointing the map at a field that exists, or by removing the
  entry so it falls through. (`other_pi_email` *does* exist, so the
  `Pending Other PI` scoping via `specific_approver_map` works correctly.)
- `validate_original_document_not_locked` is unregistered (§2.7): a document
  with a pending cancellation can still be edited and forwarded.
- `_is_approved_state` is a **substring** match on `approved`. Any mirrored
  state containing that word (e.g. `Sanction Approved`) triggers the
  cancellation, even mid-chain. Check a new module's state names before
  enabling cancellation for it.
- `log_workflow_transition` is still registered on `on_update` only, so
  `Staff Activity Log` misses transitions on submitted documents.
