# Role Delegation: Implementation Plan (Backend and Frontend)

> **Status: plan only, nothing implemented** (2026-11-27). Overview and decisions:
> [role_delegation_plan.md](role_delegation_plan.md).
>
> - [Part A: Backend](#part-a-backend). Based on a reading of Frappe 15.74.2 and
>   this app. The role override and session storage are **untested** until phase 0
>   passes.
> - [Part B: Frontend](#part-b-frontend). Self-contained for the frontend team,
>   whose code lives on another system, so no file paths or framework are assumed.
>   **Part B section 2 is the API contract** both sides build against.
>
> Section numbers restart in each part.

## Part A: Backend

### 1. New files

```
rndopsapp/rndopsapp/role_delegation/
    __init__.py
    service.py      # grants, validation, switching
    context.py      # auth hook, role override, guard, after-request log
    constants.py    # allow-lists
    test_role_delegation.py
rndopsapp/rndopsapp/doctype/role_delegation/
rndopsapp/rndopsapp/doctype/role_delegation_role/      # child table
rndopsapp/rndopsapp/doctype/role_delegation_log/
```

Whitelisted wrappers go in `rndopsapp/rndopsapp/api.py`, as for User Delegation.

```python
DELEGABLE_ROLES = ("Ado_RnD", "Associate Dean, RND")
DELEGATE_REQUIRED_ROLE = "Dean, RnD"
ACTING_BASE_ROLES = ("All_ProRnd_User", "Desk User", "All", "Guest")
```

### 2. Doctypes

#### Role Delegation (`RD-.#####`)

| Field | Type |
|---|---|
| `delegator`, `delegate` | Link User, required |
| `roles` | Table (Role Delegation Role), required |
| `from_datetime`, `to_datetime` | Datetime, required |
| `reason` | Small Text, required |
| `status` | Select: Active, Revoked |
| `revoked_by`, `revoked_at` | read-only |

`validate()`:

1. Delegator and delegate differ; both are enabled System Users.
2. Every role is in `DELEGABLE_ROLES` and held by the delegator.
3. The delegate holds `DELEGATE_REQUIRED_ROLE`.
4. `to_datetime` is after `from_datetime` and in the future.
5. No overlapping Active grant for the same delegator, delegate and role.
6. After insert, only `status` and the revoke fields may change.

Role checks here read `Has Role` for the named user, not the request's effective
roles.

#### Role Delegation Log

Fields: `event`, `actual_user`, `delegator`, `delegated_roles`, `delegation`,
`endpoint`, `ref_doctype`, `ref_name`, `workflow_action`, `result`, `message`,
`ip_address`, `superseded` (check). Index `(actual_user, ref_doctype, ref_name)`.

Both doctypes: System Manager read only. All writes go through the service with
`ignore_permissions`.

### 3. Request context (`context.py`)

#### Hook registration (`hooks.py`)

```python
auth_hooks = ["rndopsapp.rndopsapp.role_delegation.context.apply_acting_profile"]
after_request = ["rndopsapp.rndopsapp.role_delegation.context.log_acting_request"]
```

`auth_hooks` runs after the session is loaded. `before_request` hooks run earlier
and keep seeing real roles.

#### `apply_acting_profile()`

```
if no session user, Guest, or API-key / bearer auth:   return
grant_id = frappe.local.session.data.get("acting_delegation")
header   = request header X-Acting-Delegation
if request path is exempt:                             return
if not grant_id:
    if header not in (None, "self"):                   raise ProfileMismatch
    return
grant = validate(grant_id, frappe.session.user)
if invalid:  clear session, log switch_out(reason), commit, raise DelegationEnded
if method is unsafe and header != grant_id:            raise ProfileMismatch
if header and header != grant_id:                      raise ProfileMismatch
set frappe.local.acting = grant context
apply_roles(grant)
```

Exempt paths, matched exactly: `get_acting_profiles`, `switch_profile`,
`switch_to_own_profile` (all under `/api/method/rndopsapp.rndopsapp.api.`) and `/api/method/logout`.
Test the `/api/v1/` and `/api/v2/` forms and the `cmd=` form too.

A grant is valid when it belongs to this user as delegate, is Active and in
date, both users are enabled, the delegator still holds the roles and the
delegate still holds `DELEGATE_REQUIRED_ROLE`.

Errors are `ValidationError` subclasses with `http_status_code = 409`, so the
response carries `exc_type` `ProfileMismatch` or `DelegationEnded`.

#### `apply_roles()`

```python
roles = sorted(set(grant_roles) | set(ACTING_BASE_ROLES))
key = frappe.cache.make_key("roles")
frappe.local.cache.setdefault(key, {})[frappe.session.user] = roles
frappe.local.role_permissions = {}
frappe.local.user_perms = None
```

This relies on `frappe.cache.hget` reading the request-local dict before Redis.
**Never** call `hset("roles", ...)` with these values.

Known limits:

- `frappe.set_user` or a user cache clear mid-request drops the override, and
  `set_user` also resets session data. The guard (section 5) re-applies from
  `frappe.local.acting`. A lost session value returns the user to their own
  profile, which the header check then catches.
- Background jobs run with the user's real roles. List the jobs started by the
  affected workflow actions and pass the context explicitly where roles matter.
- Re-test after every Frappe upgrade.

### 4. Switching (`service.py`)

```python
def switch_profile(delegation):          # POST
    grant = validate(delegation, frappe.session.user)    # else PermissionError
    frappe.local.session.data["acting_delegation"] = grant.name
    frappe.local.session_obj.update(force=True)          # persists and commits
    log("switch_in", ...)

def switch_to_own_profile():             # POST
    previous = frappe.local.session.data.pop("acting_delegation", None)
    if previous:
        frappe.local.session_obj.update(force=True)
        log("switch_out", reason="manual")
```

- Neither depends on the effective roles. Both work from a stale tab or with an
  invalid current grant.
- Moving between two grants also logs `switch_out` for the previous one.
- Validation reads the database every time; do not cache grants across requests.
- `on_logout`: log `switch_out` with reason `logout`. The value dies with the
  session, so a new login starts on the own profile.
- Revoking a grant needs no session cleanup; the next request rejects it.
- `create_role_delegation`, `revoke_role_delegation`, `delegate_user`,
  `undelegate_user` and `impersonate_user` are refused while acting.
- A System Manager may revoke any grant.

### 5. Approval guard

`guard_action(doc, action)` in `context.py`:

| Profile | Check |
|---|---|
| Acting | method is POST; re-apply roles; actual user is not the applicant |
| Own | actual user has no successful, non-superseded acting action on this document (no double approval) |

It also sets `ref_doctype`, `ref_name` and `workflow_action` for the log. When a
document is put back or returned, mark its earlier log rows `superseded`.

Call it at the start of each handler:

| Doctype | Handler | State written by |
|---|---|---|
| Travel | `perform_travel_action` | direct assignment |
| Temporary Advance | `perform_temporary_advance_action` | direct assignment |
| Leave Module | `perform_leave_module_action` | check during build |
| Indent Cum Sanction Sheet | `perform_icss_action` (and its sub-doctype action) | check during build |
| Rate Contract | `perform_rate_contract_action` | `db.set_value` |
| Recruitment Adhoc Contractual | `perform_recruitment_adhoc_contractual_action` | `db.set_value` |
| Selection Committee Report | `perform_selection_committee_report_action` | `apply_workflow` |
| Project Staff Details | `perform_project_staff_details_action` | `apply_workflow` |
| Project Staff Extension | `perform_project_staff_extension_action` | direct assignment |
| proprietary_purchase | `_deprecated_perform_proprietary_purchase_action` | direct assignment |
| repair_replacement | `perform_repair_replacement_action` | direct assignment |
| standerdized_purchase | `perform_standerdized_purchase_action` | direct assignment |

The last three matter only for `Associate Dean, RND`. Also cover:

- Frappe's generic workflow endpoint, through a `doc_events["*"]` `before_save`
  check when `workflow_state` changes.
- Put-back and cancellation endpoints (`put_back_action.py`,
  `cancellation_api.py`).

Applicant = document `owner` plus the applicant field where one exists. Confirm
each field's meaning during the build: `applicant_name_travel`,
`applicant_webmail`, `email` (Leave Module), `icss_applicant_webmail_id`,
`ps_email_id`.

### 6. Audit

| Event | Written by |
|---|---|
| grant, revoke | service |
| switch_in, switch_out | service, auth hook, `on_logout` |
| action | `after_request`, for every unsafe-method request while acting |
| denied | auth hook and guard |

- On failure Frappe rolls back before `after_request` runs, so the log function
  inserts and then commits. The same applies to `denied` rows.
- A logging failure is written to Error Log. It cannot undo an action that has
  already committed.
- Add a document comment "<delegate>, acting as <role> for <delegator>" on each
  successful workflow action. `modified_by` remains the delegate.
- Do not store request bodies.

### 7. Review before enabling

- Direct `Has Role` queries do not see the override. Check at least
  `module_registry.py`, `project_registration.py`, `reimbursement.py`,
  `top_up_fellowship.py`. Queries that find *other* users by role are fine;
  those testing the *current* user must use `frappe.get_roles()`.
- Confirm `get_pending_task` returns the Associate Dean queue while acting.
- Check the 9 `Ado_RnD` doctypes for rules naming a specific person.
- Check `permission_query_conditions` give the expected lists while acting.
  Records the delegate owns, and their User Delegations, still apply.
- Calls to services outside Frappe (such as the ledger) do not see the profile.

### 8. Tests

1. Grant validation: each rule in section 2.
2. Effective roles while acting; real roles on the next request after switching back.
3. Shared Redis roles for the user are unchanged.
4. Switch back with an expired grant, a revoked grant, and no active grant.
5. Expiry and revocation reject the next request and clear the session.
6. Missing or wrong header on a write while acting.
7. Another user's grant cannot be selected.
8. Self-approval and double approval are blocked; put-back resets the latter.
9. Failed actions are logged.
10. Each handler in section 5, end to end over HTTP.

Tests 2 to 6 must go through real HTTP requests; calling the functions directly
does not exercise the hooks or the session.

### 9. Order and rollout

| Step | Work |
|---|---|
| 0 | Prototype sections 3 and 4 with a hand-made grant. **Stop if it fails.** |
| 1 | Doctypes, grant endpoints, tests 1 |
| 2 | Context, switching, tests 2 to 7 |
| 3 | Guard, logging, section 7 review, tests 8 to 10 |
| 4 | Deploy: `bench migrate`, `clear-cache`, restart |

Gate the feature with `"allow_role_delegation": 1` in `site_config.json`. When
off, the hook ignores any stored profile, `get_acting_profiles` returns
`enabled: false` and the other endpoints refuse. Deploy the
backend first: users who never switch need no header.

Before rollout, rotate the hardcoded password(s) in `rndopsapp/external_auth.py`
and re-check [known_auth_gaps.md](../security/known_auth_gaps.md).

---

## Part B: Frontend

### 1. What the user sees

An Associate Dean (`Ado_RnD`) delegates their role to the Dean. The Dean picks
that profile from a header dropdown, acts, and switches back at any time. Login
and password do not change.

### 2. API contract

Base: `/api/method/rndopsapp.rndopsapp.api.<name>`. Send the session cookie and
CSRF token as for other calls. Results are wrapped in `{"message": ...}`.
Datetimes are `YYYY-MM-DD HH:mm:ss` in server time.

| Name | Method | Parameters | Returns |
|---|---|---|---|
| `get_acting_profiles` | GET | none | profiles, below |
| `switch_profile` | POST | `delegation` | profiles |
| `switch_to_own_profile` | POST | none | profiles |
| `create_role_delegation` | POST | `delegate`, `roles` (array), `from_datetime`, `to_datetime`, `reason` | grant |
| `revoke_role_delegation` | POST | `delegation` | grant |
| `get_role_delegations` | GET | none | `given`, `received`, `delegable_roles` |

**Profiles**

```json
{
  "enabled": true,
  "current": "RD-00001",
  "profiles": [
    {"id": "self", "label": "My profile"},
    {"id": "RD-00001", "delegator": "ado@example.org",
     "delegator_name": "A. Name", "roles": ["Ado_RnD"],
     "valid_till": "2026-12-05 18:00:00",
     "label": "Ado_RnD (for A. Name)"}
  ]
}
```

`current` is `"self"` or a grant id. Only grants usable now are listed.

**Grant**

```json
{"name": "RD-00001", "delegator": "...", "delegator_name": "...",
 "delegate": "...", "delegate_name": "...", "roles": ["Ado_RnD"],
 "from_datetime": "...", "to_datetime": "...", "reason": "...",
 "status": "Active", "state": "scheduled"}
```

`state` is `scheduled`, `active`, `expired` or `revoked`. `delegable_roles` lists
the roles the current user can give; empty means they cannot create grants.

#### Header

| Current profile | `X-Acting-Delegation` |
|---|---|
| Delegated | the grant id, **required on every POST, PUT, PATCH, DELETE**; send it on GET too |
| Own | omit, or `self` |

#### Errors

| HTTP | `exc_type` | Meaning | Frontend does |
|---|---|---|---|
| 409 | `ProfileMismatch` | this tab's profile differs from the server's | tell the user, reload the app |
| 409 | `DelegationEnded` | grant expired or revoked; server is back on own profile | tell the user, reload the app |
| 403 | `PermissionError` | not allowed, including approval blocks | show the message |
| 417 | `ValidationError` | invalid input | show the message |

**Never retry the failed action automatically.** The user must see which profile
they are on and repeat it.

### 3. Work items

#### F1. Load the profile before the app renders

After authentication, and before any other app call, request
`get_acting_profiles`. Keep `current` **in memory, per tab**. Do not keep it in
`localStorage` or shared storage: a stale tab must keep its old value so the
server can detect it. If `enabled` is false, hide the whole feature. If the call
fails, show an error and retry; do not guess the profile.

#### F2. Send the header from one place

Attach the header in a single request layer covering **every** way the app calls
Frappe: the SDK or HTTP client, direct `fetch` calls, and file uploads. Add it
only to requests going to the Frappe backend. Handle the 409 errors in the same
layer, and show one message even if several requests fail together.

Finding every call path is the main risk. A missed write fails with
`ProfileMismatch` while acting, so test each one.

#### F3. Profile switcher

- In the header, shown when `profiles` has more than one entry or `current` is
  not `self`.
- "My profile" is first and always enabled.
- Each delegated entry shows the role, the delegator and the end time.
- Refetch the list when the dropdown opens.
- Selecting an entry calls `switch_profile`, or `switch_to_own_profile` for
  "My profile". Disable the control while it runs.

If the form has unsaved changes, confirm before switching. The switch calls must
work even when the tab is stale.

#### F4. After a switch

Do a **full page load** of the dashboard entry route, respecting the app's base
path. This clears cached roles, lists, counts and form state, and lets existing
role-based routing pick the right dashboard. On failure, refetch profiles, then
show the error.

Tell other open tabs (for example with `BroadcastChannel`) to reload. The server
check still protects tabs that miss the message.

#### F5. Acting banner

While `current` is not `self`, show a fixed banner on every page:

> Acting as **Ado_RnD** for A. Name, until 5 Dec 18:00. **[Switch back]**

It cannot be dismissed. At the end time, refetch profiles and handle the change.

#### F6. Role-based UI

Fetch roles from the server as today; while acting, the existing role endpoint
returns the delegated roles. Check that:

- menus, buttons and route guards use those roles, not cached ones;
- no screen treats the current user's email as the Associate Dean's. The user is
  still the Dean;
- Dean-only items disappear while acting and return afterwards.

#### F7. Delegation management screen

- Visible when `delegable_roles` is not empty or `given` / `received` has rows.
- **Create:** delegate (reuse the existing `search_delegate_users` picker),
  roles, from, to, reason. The server requires the delegate to be a Dean.
- **Given:** list with state and a Revoke button with confirmation.
- **Received:** read-only list.
- Hidden while acting.

#### F8. Logout

No extra call is needed; the server drops the profile. Clear the in-memory value
so the next login starts clean.

### 4. Test checklist

Use two test users.

- [ ] Create a grant; it appears in the Dean's dropdown only when in date.
- [ ] Switch: dashboard, menus and pending tasks are the Associate Dean's.
- [ ] Approve one item of each affected application type, including uploads.
- [ ] Switch back from the banner and from the dropdown; Dean items return.
- [ ] Switch in tab A, save in a stale tab B: rejected, then reloads.
- [ ] Revoke while the Dean is acting: next action rejected, own profile shown.
- [ ] Let a grant expire while acting.
- [ ] Switch back after revocation works.
- [ ] Log out while acting, log in again: own profile.
- [ ] Downloads and print links work in both profiles.
- [ ] A user with no grants sees no change.

### 5. Order

| Step | Items | Needs backend step |
|---|---|---|
| 1 | F1, F2 | 2 |
| 2 | F3, F4, F5, F6, F8 | 2 |
| 3 | F7 | 1 |
| 4 | Test checklist | 3 |

### 6. To confirm with the frontend team

1. Which request methods does the app use to call Frappe?
2. Is the frontend served from the same origin as the backend? If not, CORS must
   allow `X-Acting-Delegation`.
3. Is any role or profile data persisted in the browser?
