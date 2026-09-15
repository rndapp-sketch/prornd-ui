# Delegate User — Implementation Reference

> **Updated 2026-08-17** — application-level scope enforcement, create-on-behalf,
> and the "any authenticated user" access model described here are all live.
> See [application_level_delegation_backend_plan.md](application_level_delegation_backend_plan.md)
> for the design rationale and [known_auth_gaps.md](../security/known_auth_gaps.md)
> for a related, pre-existing, **unfixed** authorization gap in the app's own
> document read/write endpoints — this delegation system does not by itself
> close that gap for every code path (see "Enforcement Reality" below).

## Overview

Allows any authenticated user (User A) to delegate visibility/access of their
projects and applications to another user (User B) — no role requirement.
When B logs in, documents where `pi_webmail`, `head_approver`, or `owner` = A
can be included in B's visible records, and B can act on them according to
the delegation's `delegation_type` and `scope_type`.

---

## Files

| File | Purpose |
|---|---|
| `rndopsapp/rndopsapp/delegate_user/delegate_user.py` | All logic — helpers + API implementations |
| `rndopsapp/rndopsapp/delegate_user/__init__.py` | Package marker |
| `rndopsapp/rndopsapp/doctype/user_delegation/user_delegation.json` | DocType definition |
| `rndopsapp/rndopsapp/doctype/user_delegation/user_delegation.py` | DocType controller |
| `rndopsapp/rndopsapp/api.py` | 6 whitelisted wrappers (search_delegate_users through create_application_on_behalf) |
| `rndopsapp/patchs/fix_delegation_application_scope.py` | Migrates `applications` from flat name arrays to `{doctype, name}` pairs |

> After deploy run: `bench migrate`

---

## DocType — `User Delegation`

**Autoname:** `DEL-{YYYY}-{#####}`

| Field | Type | Notes |
|---|---|---|
| `delegator_user` | Link → User | Always set to `session.user` on insert |
| `delegate_user` | Link → User | The user receiving access |
| `enabled` | Check | Default 1 |
| `delegation_type` | Select | `View Only` / `View and Edit` / `Workflow Action` |
| `scope_type` | Select | `all` / `project` / `application` |
| `project_names` | Long Text | JSON array of Project Registration names |
| `applications` | Long Text | JSON array of `{"doctype": ..., "name": ...}` pairs (migrated from a flat name array — see the migration patch above) |
| `valid_from` | Datetime | Optional start of validity window |
| `valid_to` | Datetime | Optional end of validity window |
| `revoked_at` | Datetime | Set on revocation, read-only |
| `revoked_by` | Link → User | Set on revocation, read-only |
| `remarks` | Small Text | Optional notes |

**Permissions:**
- `All` (built-in universal role) — read only
- `System Manager` — full access

Because `read` is open to `All`, desk/report visibility of `User Delegation`
rows is separately restricted by `user_delegation_permission_query()` (in
`hooks.py` → `permission_query_conditions`) to rows where the current user is
the `delegator_user` or `delegate_user` — otherwise any logged-in user could
list every delegation in the system.

---

## Whitelisted API Endpoints

All 6 endpoints are at `rndopsapp.rndopsapp.api.*`

---

### 1. `search_delegate_users`

```
GET /api/method/rndopsapp.rndopsapp.api.search_delegate_users
     ?query=<string>
```

**Auth:** Any authenticated user (not Guest).

Returns all enabled users matching `query` against `name / full_name / email`. Excludes self, Administrator, Guest.

**Response:**
```json
{
  "message": [
    {
      "label": "Full Name",
      "value": "user@iitg.ac.in",
      "email": "user@iitg.ac.in",
      "full_name": "Full Name"
    }
  ]
}
```

---

### 2. `get_delegate_scope`

```
GET /api/method/rndopsapp.rndopsapp.api.get_delegate_scope
     ?user=<email>   (optional; ignored unless System Manager)
```

**Auth:** Any authenticated user (not Guest).

Returns all projects and applications belonging to / assigned to the current user, plus the users already delegated by them.

**Project query matches:** `pi_webmail`, `pi_userid`, `owner`, `head_approver`

**Application doctypes covered:**

| DocType | Webmail Field | Project Field |
|---|---|---|
| Travel | `webmail_id_travel` | `travel_project_number` |
| TA DA Settlement | `webmail_id` | `project_no` |
| Temporary Advance | `applicant_webmail` | `project_name` |
| Advance Settlement | *(owner only)* | `project_name` |
| Reimbursement | `applicant_webmail` | `project_number` |
| Direct Purchase | *(owner only)* | — |
| Disbursal of Consultancy | `webmail_id` | — |
| Disbursal of Honorarium | `webmail_id` | — |
| Loan Request | `loan_for_webmail_id` | — |
| Indent General Form | `igf_webmail_id` | — |
| Indent Cum Sanction Sheet | `icss_applicant_webmail_id` | — |
| Recruitment Adhoc Contractual | `webmail_id` | — |

**Response:**
```json
{
  "message": {
    "users": [ { "label": "...", "value": "...", "email": "...", "full_name": "..." } ],
    "projects": [
      {
        "name": "PRJ-0001",
        "project_title": "...",
        "project_no": "...",
        "workflow_state": "...",
        "pi_webmail": "...",
        "owner": "..."
      }
    ],
    "applications": [
      {
        "doctype": "Travel",
        "name": "TRV-0001",
        "title": "TRV-0001",
        "project_name": "PRJ-0001",
        "project_no": null,
        "workflow_state": "Draft",
        "owner": "a@iitg.ac.in"
      }
    ]
  }
}
```

---

### 3. `get_active_delegations`

```
GET /api/method/rndopsapp.rndopsapp.api.get_active_delegations
     ?user=<email>   (optional; ignored unless System Manager)
```

**Auth:** Any authenticated user (not Guest).

Returns all enabled, non-revoked delegations created by the current user.

**Response:**
```json
{
  "message": [
    {
      "name": "DEL-2026-00001",
      "delegate_user": "b@iitg.ac.in",
      "delegate_user_name": "User B",
      "delegation_type": "View Only",
      "scope_type": "project",
      "project_names": ["PRJ-2026-00003"],
      "applications": [{"doctype": "Travel", "name": "TRV-2026-00001"}],
      "project_count": 1,
      "application_count": 1,
      "valid_from": null,
      "valid_to": null,
      "enabled": 1
    }
  ]
}
```

`project_names` / `applications` are the resolved, already-parsed arrays
(added alongside the pre-existing counts) — no follow-up call needed to show
actual scope contents on a delegation card.

---

### 4. `delegate_user`

```
POST /api/method/rndopsapp.rndopsapp.api.delegate_user
```

| Parameter | Type | Required | Default |
|---|---|---|---|
| `delegate_user` | email | yes | — |
| `delegation_type` | string | no | `View Only` |
| `scope_type` | string | no | `all` |
| `project_names` | JSON array / string of names | no | `[]` — **merged** into existing list |
| `applications` | JSON array / string of `{doctype, name}` pairs | no | `[]` — **merged** into existing list |
| `remove_project_names` | JSON array / string of names | no | `[]` — subtracted after the merge above |
| `remove_applications` | JSON array / string of `{doctype, name}` pairs | no | `[]` — subtracted after the merge above |
| `valid_from` | Datetime string | no | null |
| `valid_to` | Datetime string | no | null |

**Auth:** Any authenticated user (not Guest).

`applications` and `remove_applications` use the shape `{"doctype": "Travel",
"name": "TRV-2026-00001"}` — `doctype` must be one of the 12 registered
application doctypes (see the table above), or the call throws. `project_names`
/ `remove_project_names` are plain Project Registration names.
`remove_project_names` / `remove_applications` can be sent alone, without
`project_names`/`applications`, to shrink an existing delegation without
resending the rest.

**Validations:**
- `delegate_user` must exist and be enabled
- Cannot delegate to self
- `delegation_type` must be one of: `View Only`, `View and Edit`, `Workflow Action`
- `scope_type` must be one of: `all`, `project`, `application`
- If `scope_type=project` — at least one project required; each must belong to session user
- If `scope_type=application` — at least one application required
- Each application entry's `doctype` must be a registered application doctype
- `delegator_user` is always `frappe.session.user` — never taken from request

Creates a new delegation or updates an existing active one for the same pair.
If a name appears in both an add list and the corresponding remove list in
the same call, removal wins (applied after the merge).

**Response:**
```json
{ "message": { "status": "success", "name": "DEL-2026-00001" } }
```

---

### 5. `undelegate_user`

```
POST /api/method/rndopsapp.rndopsapp.api.undelegate_user
```

| Parameter | Type | Required |
|---|---|---|
| `delegation_name` | string | yes |

**Auth:** Any authenticated user (not Guest). Only the original `delegator_user` or a System Manager can revoke.

Sets `enabled=0`, `revoked_at=now`, `revoked_by=session.user`.

**Response:**
```json
{ "message": { "status": "success" } }
```

---

### 6. `create_application_on_behalf`

```
POST /api/method/rndopsapp.rndopsapp.api.create_application_on_behalf
```

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `doctype` | string | yes | Must be one of the 12 registered application doctypes |
| `delegator_user` | email | yes | The project owner this document is created for |
| `project_name` | string | conditional | Required for doctypes with a `project_field` (Travel, TA DA Settlement, Temporary Advance, Advance Settlement, Reimbursement) |
| `fields` | dict / JSON string | no | Field values for the new document |

**Auth:** Any authenticated user (not Guest). Additionally requires an
active `View and Edit` or `Workflow Action` delegation from `delegator_user`
to the session user, with `scope_type='all'`, or `scope_type='project'` and
`project_name` in that delegation's `project_names`. `scope_type='application'`
delegations never grant this — they only cover pre-existing named documents,
not future creation.

**Ownership on the new document:** the owner-identifying field (e.g.
`webmail_id_travel`) is force-set to `delegator_user` regardless of what
`fields` contains — the caller cannot spoof this. Frappe's own `owner` field
is left to default to the session user (the delegate), so who actually
created the record stays traceable. A fixed blocklist (`name`, `owner`,
`docstatus`, `workflow_state`, `creation`, `modified`, `modified_by`, `idx`)
is stripped from `fields` before applying it, on top of the owner/project
fields always being set by the server, not the caller.

**Validations:**
- `doctype` must be a registered application doctype
- `delegator_user` must exist and be enabled; cannot equal the session user
- Project-field doctypes require `project_name`
- Delegation scope check as above — throws `frappe.PermissionError` with
  `"You are not authorised to create a {doctype} on behalf of {delegator_user}
  for project '{project_name}'."` if it fails

**Response:**
```json
{ "message": { "status": "success", "name": "TRV-2026-00042" } }
```

> This endpoint writes via `doc.insert(ignore_permissions=True)` after its own
> delegation check — same pattern as every other write in this app (see
> `known_auth_gaps.md` for why that's the established convention here, not a
> shortcut specific to this function).

---

## Internal Helpers (available app-wide)

### `get_visible_as_users(user=None)`

```python
from rndopsapp.rndopsapp.delegate_user.delegate_user import get_visible_as_users

visible = get_visible_as_users()
# → ["a@iitg.ac.in", "b@iitg.ac.in"]
```

Returns `[user, *delegator_users]` — all users whose documents should be visible to `user`. Filters out expired, disabled, or revoked delegations. Use this in `get_list` queries:

```python
frappe.get_all("Project Registration",
    filters={"pi_webmail": ["in", get_visible_as_users()]})
```

---

### `is_active_delegation(delegator_user, delegate_user, doctype=None, docname=None, action_type="read")`

```python
from rndopsapp.rndopsapp.delegate_user.delegate_user import is_active_delegation

is_active_delegation("a@iitg.ac.in", "b@iitg.ac.in", action_type="write")
```

| `action_type` | Allowed delegation types |
|---|---|
| `read` | View Only, View and Edit, Workflow Action |
| `write` | View and Edit, Workflow Action |
| `workflow` | Workflow Action only |

Returns `True` if a valid, in-scope, in-window delegation exists. For
`project`/`application` scope, `docname` is checked against the row's
resolved scope via `_row_scope_names()` — for `project` scope this correctly
resolves through each doctype's `project_field` (a fix; the original version
only matched `project_names` directly against Project Registration names,
never actually covering application doctypes under a delegated project).

---

### `require_document_access(doc, action_type="read")`

```python
from rndopsapp.rndopsapp.delegate_user.delegate_user import require_document_access

doc = frappe.get_doc("Travel", docname)
require_document_access(doc, action_type="read")   # raises PermissionError if disallowed
```

Raises `frappe.PermissionError` unless the session user owns `doc` (via any
of its owner-identifying fields, or Frappe's `owner`), holds an active
delegation from an owner covering this action/document, or is System Manager
/ Administrator.

**This is the real enforcement point for this app's own whitelisted
functions** (`save_travel`, `get_travel_commit_details`, etc.) — they call
`frappe.get_doc()` / `doc.save(ignore_permissions=True)` directly and never
go through Frappe's native permission system, so `has_permission` hooks (see
below) never run for them. As of 2026-08-17, `require_document_access()` is
used by `create_application_on_behalf()` but has **not** been retrofitted
into the pre-existing read/write functions across the 13 application
doctypes — see [known_auth_gaps.md](../security/known_auth_gaps.md) for the
full inventory of what's still unguarded and why that was left out of scope.

---

### `has_delegated_access(doc, ptype=None, user=None)`

Registered in `hooks.py` under `has_permission` for all 13 doctypes.
**Read this before relying on it:** Frappe's `has_permission` hook is a
deny-only gate — returning `True`/`None` (all this function ever does) never
grants access beyond what the caller's role + Frappe's own `owner` field +
DocShare already allow. It only matters for generic Frappe access paths
(desk, report view) that this app's frontend doesn't use for these doctypes.
It is harmless to leave registered, but do not mistake it for real
enforcement of the app's own API functions — that's `require_document_access()` above.

---

## Security Rules

| Rule | Enforcement |
|---|---|
| Any authenticated (non-Guest) user can call the delegation API | `_require_authenticated_user()` at top of each function |
| `delegator_user` always = `session.user` | Set in code; DocType `before_insert` also enforces it |
| Cannot delegate to self | Checked in `delegate_user()` and DocType `validate()` |
| Only delegator or System Manager can revoke | Checked in `undelegate_user()` |
| Expired / disabled / revoked rows excluded | `_ACTIVE_FILTERS` + `_row_is_time_valid()` applied everywhere |
| System Manager can inspect any user's data | `_resolve_target_user()` allows override only for System Manager |
| Frontend-provided `user` param ignored for non-managers | `_resolve_target_user()` falls back to `session.user` |
| `create_application_on_behalf` requires scope-covering delegation | `_project_scope_allows_create()` |
| Desk/report listing of `User Delegation` limited to parties involved | `user_delegation_permission_query()` |

---

## Enforcement Reality — what this system does and doesn't cover

- **List views** (Project Registration + 12 application doctypes): real,
  functional. `permission_query_conditions` correctly expands/restricts
  visibility per delegation scope.
- **`create_application_on_behalf`**: real, functional. Does its own
  delegation-scope check before `insert(ignore_permissions=True)`.
- **Single-document read/write via this app's own API functions**
  (`save_travel`, `get_loan_request_fields`, etc.): **not covered** by
  anything built for delegation. These functions predate delegation, bypass
  Frappe's permission system entirely, and were never retrofitted with
  `require_document_access()`. This is a pre-existing gap, not something
  delegation introduced or fixed — see
  [known_auth_gaps.md](../security/known_auth_gaps.md).
- **Generic Frappe desk/report access**: covered by `has_delegated_access()`
  registered as `has_permission`, for whatever it's worth given this app's
  frontend doesn't route through that path for these doctypes.

---

## Permission Query Design — Isolation Rules

Registered in `hooks.py` under `permission_query_conditions` for all 13
application doctypes, **plus `User Delegation` itself** (see Security Rules
above). `has_permission` is also registered for the 13 doctypes (see
"Enforcement Reality" above for what that hook does and doesn't accomplish).

All 13 doctype hooks call `_build_permission_query(user, table, fields)` in
`delegate_user.py`; each per-doctype wrapper (`travel_permission_query`,
etc.) is generated by `_permission_query_for(doctype)`, which pulls `fields`
from `_DOCTYPE_OWNER_FIELDS` — a single source of truth shared with
`has_delegated_access()` and `require_document_access()`, instead of
duplicating field lists per function.

### Rule: Delegation never reduces existing access

The two permission systems — Frappe role/if_owner and delegation — are completely independent. Delegation only **adds** visibility; it never restricts what a user could already see.

### Decision tree inside `_build_permission_query`

```
1. System Manager → return ""   (no restriction ever)

2. No active delegations for this user
   → return ""   (Frappe's native role + if_owner rules run untouched)

3. Active delegations exist  AND  user has any role with if_owner=0 on this doctype
   → return ""   (unrestricted role already covers all records including delegator's)

4. Active delegations exist  AND  user's read access is entirely if_owner=1
   → split delegators into unrestricted (active "all"-scope row to this user)
     and restricted (only project/application-scope rows):
       - unrestricted delegators + self → field IN (...) branch, as before
       - each restricted delegator with a non-empty resolved scope → an
         additional `` `name` IN (scoped_names) `` OR-branch, via
         _scoped_doc_names_for_doctype()
   → combine all branches with OR
```

Before this rewrite, `project`/`application`-scoped delegations were
functionally identical to `all`-scope in list views — the query only ever
did a blanket `field IN (...)` regardless of scope_type. That's fixed now:
restricted delegators only contribute the specific document names their
scope actually covers.

### Helper added: `_user_has_unrestricted_read(user_roles, doctype)`

Queries `DocPerm` (permlevel=0, read=1) for the doctype and returns `True` if any of the user's roles has `if_owner=0`. Only called when active delegations exist (step 3 above) to avoid unnecessary DB queries on every list view.

### Doctypes registered and their expansion fields

`_DOCTYPE_OWNER_FIELDS` in `delegate_user.py` (used by permission_query,
has_permission, require_document_access, and scope resolution alike):

| DocType | Fields checked in WHERE expansion |
|---|---|
| Project Registration | `pi_webmail`, `pi_userid`, `owner`, `head_approver` |
| Travel | `webmail_id_travel`, `owner` |
| TA DA Settlement | `webmail_id`, `owner` |
| Temporary Advance | `applicant_webmail`, `owner` |
| Advance Settlement | `owner` |
| Reimbursement | `applicant_webmail`, `owner` |
| Direct Purchase | `owner` |
| Disbursal of Consultancy | `webmail_id`, `owner` |
| Disbursal of Honorarium | `webmail_id`, `owner` |
| Loan Request | `loan_for_webmail_id`, `owner` |
| Indent General Form | `igf_webmail_id`, `owner` |
| Indent Cum Sanction Sheet | `icss_applicant_webmail_id`, `owner` |
| Recruitment Adhoc Contractual | `webmail_id`, `owner` |

---

## Pending Task & Task Registry — `ignore_permissions=True`

`get_pending_task` and `get_task_registry` in `module_registry.py` use `frappe.get_list` internally to fetch documents across multiple doctypes for approval-inbox and task-history views.

**Problem after delegation:** The `permission_query_conditions` hooks restrict list results to records owned by / assigned to the current user. Approvers (HoS, Dean, Ado_RnD, etc.) need to see other users' documents pending their action — the permission query was filtering those out, returning empty results.

**Fix:** All `frappe.get_list` calls inside both functions use `ignore_permissions=True`. This is safe because:

- Both functions call `frappe.has_permission(dt, "read")` (role check) before processing each doctype
- `get_pending_task` filters by workflow state + role-to-state mapping + `head_field` email matching
- `get_task_registry` filters by `modified_by = current_user` and an explicit `allowed_roles` list
- `limit_page_length=1000` on all three calls
