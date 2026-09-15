# Delegate User — Frontend Integration Guide

> **Updated 2026-08-17.** This guide now reflects the live backend. For the
> new "create on behalf" flow (not covered below — it's a distinct screen,
> not part of the delegation-config page), see
> [create_on_behalf_ui_guide.md](create_on_behalf_ui_guide.md). For the full
> rationale behind the scope/access changes, see
> [application_level_delegation_backend_plan.md](application_level_delegation_backend_plan.md)
> and [..._frontend_plan.md](application_level_delegation_frontend_plan.md).

## What is Delegation?

Any authenticated user (User A) can delegate access to their projects and
applications to another user (User B) — no role requirement to use the
feature.

Once delegated:
- User B logs in and **automatically sees** User A's projects and applications in all list views, scoped per `scope_type`
- The backend enforces this — no frontend query changes are needed for visibility
- The frontend only needs to provide the UI to **create**, **view**, and **revoke** delegations

---

## Who Can Use This?

- **Any logged-in user** can call these APIs — the only requirement is not being a Guest (unauthenticated)
- The route `/delegate-user` should be guarded with a plain "is logged in" check, **not** a role check
- Backend enforces this independently — a 403 is thrown only for Guest/unauthenticated requests

---

## Base URL

All endpoints follow the pattern:

```
/api/method/rndopsapp.rndopsapp.api.<method_name>
```

All responses are wrapped by Frappe:
```json
{ "message": <actual return value> }
```

All errors are returned as HTTP `417` with:
```json
{ "exc_type": "ValidationError", "exception": "frappe.exceptions.ValidationError: <message>" }
```

---

## Page Flow

```
/delegate-user
│
├── On load → call get_delegate_scope()
│              → populates: current delegates list, project picker, application picker
│
├── Search user → call search_delegate_users(query)
│
├── Submit form → call delegate_user(...)
│
├── View active delegations → call get_active_delegations()
│
└── Revoke button → call undelegate_user(delegation_name)
```

---

## API Reference

---

### 1. Search Users to Delegate To

**Use when:** User types in the delegate user search/autocomplete field.

```
GET /api/method/rndopsapp.rndopsapp.api.search_delegate_users?query=<string>
```

| Param | Type | Required | Notes |
|---|---|---|---|
| `query` | string | no | Searches email, full_name. Empty returns all users. |

**Response:**
```json
{
  "message": [
    {
      "label": "John Doe",
      "value": "john@iitg.ac.in",
      "email": "john@iitg.ac.in",
      "full_name": "John Doe"
    }
  ]
}
```

**Notes:**
- Excludes current user, Administrator, Guest, and disabled users
- Use `value` as the user identifier in all subsequent calls
- Suitable for use as autocomplete/select options directly

---

### 2. Get Delegation Scope (Projects + Applications)

**Use when:** Page loads — populate the project/application multi-select pickers and show existing delegates.

```
GET /api/method/rndopsapp.rndopsapp.api.get_delegate_scope
```

No parameters needed. Always uses the logged-in user.

**Response:**
```json
{
  "message": {
    "users": [
      {
        "label": "Jane Smith",
        "value": "jane@iitg.ac.in",
        "email": "jane@iitg.ac.in",
        "full_name": "Jane Smith"
      }
    ],
    "projects": [
      {
        "name": "PRJ-REG-2026-00001",
        "project_title": "AI Research Project",
        "project_no": "RND/2026/001",
        "workflow_state": "Approved",
        "pi_webmail": "a@iitg.ac.in",
        "owner": "a@iitg.ac.in"
      }
    ],
    "applications": [
      {
        "doctype": "Travel",
        "name": "TRV-2026-00001",
        "title": "TRV-2026-00001",
        "project_name": "PRJ-REG-2026-00001",
        "project_no": null,
        "workflow_state": "Draft",
        "owner": "a@iitg.ac.in"
      },
      {
        "doctype": "Loan Request",
        "name": "LOAN-2026-00001",
        "title": "LOAN-2026-00001",
        "project_name": null,
        "project_no": null,
        "workflow_state": "Pending Approval",
        "owner": "a@iitg.ac.in"
      }
    ]
  }
}
```

**Field guide:**

| Field | Use for |
|---|---|
| `users` | Show as "already delegated to" badges/chips on the page |
| `projects` | Populate project multi-select; use `name` as value, `project_title` as label |
| `applications` | Populate application multi-select; use `name` as value, `doctype + name` as label |

**Application doctypes returned:**

| DocType | Notes |
|---|---|
| Travel | |
| TA DA Settlement | |
| Temporary Advance | |
| Advance Settlement | |
| Reimbursement | |
| Direct Purchase | |
| Disbursal of Consultancy | |
| Disbursal of Honorarium | |
| Loan Request | |
| Indent General Form | |
| Indent Cum Sanction Sheet | |
| Recruitment Adhoc Contractual | |

---

### 3. Get Active Delegations

**Use when:** Showing the list of current delegations created by the logged-in user.

```
GET /api/method/rndopsapp.rndopsapp.api.get_active_delegations
```

No parameters needed. Always uses the logged-in user.

**Response:**
```json
{
  "message": [
    {
      "name": "DEL-2026-00001",
      "delegate_user": "jane@iitg.ac.in",
      "delegate_user_name": "Jane Smith",
      "delegation_type": "View Only",
      "scope_type": "project",
      "project_names": ["PRJ-REG-2026-00001", "PRJ-REG-2026-00002"],
      "applications": [],
      "project_count": 2,
      "application_count": 0,
      "valid_from": null,
      "valid_to": "2026-12-31 00:00:00",
      "enabled": 1
    }
  ]
}
```

**Field guide:**

| Field | Use for |
|---|---|
| `name` | Pass to `undelegate_user` to revoke, or as the delegation to shrink via `delegate_user(remove_project_names=...)` |
| `delegate_user_name` | Display name in the delegation card |
| `delegation_type` | Show as a badge: `View Only` / `View and Edit` / `Workflow Action` |
| `scope_type` | Show scope: `all` / `project` / `application` |
| `project_names` | Actual included project names — render as chips, not just a count |
| `applications` | Actual included `{doctype, name}` pairs — render as chips, e.g. `Travel: TRV-2026-00001` |
| `project_count` / `application_count` | Still returned for a compact summary label ("2 projects") if you don't want to render the full chip list everywhere |
| `valid_from` / `valid_to` | Show validity dates; `null` means no restriction |

`project_names`/`applications` are already-parsed arrays (not JSON strings) — no `JSON.parse()` needed on this response.

---

### 4. Create / Merge a Delegation

**Use when:** User submits the delegate form.

```
POST /api/method/rndopsapp.rndopsapp.api.delegate_user
```

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `delegate_user` | string (email) | **yes** | — | The user to delegate to |
| `delegation_type` | string | no | `View Only` *(create only)* | Omit to keep existing value on update |
| `scope_type` | string | no | `all` *(create only)* | Omit to keep existing value on update |
| `project_names` | JSON string or array of names | no | `[]` | Required if `scope_type=project`. **Merged** into existing list. |
| `applications` | JSON string or array of `{doctype, name}` | no | `[]` | Required if `scope_type=application`. **Merged** into existing list. See shape below. |
| `remove_project_names` | JSON string or array of names | no | `[]` | Subtracted after the merge above. Can be sent alone. |
| `remove_applications` | JSON string or array of `{doctype, name}` | no | `[]` | Subtracted after the merge above. Can be sent alone. |
| `valid_from` | string (datetime) | no | null | Only updates existing value if provided |
| `valid_to` | string (datetime) | no | null | Only updates existing value if provided |

**`applications` / `remove_applications` shape:**
```json
[
  {"doctype": "Travel", "name": "TRV-2026-00001"},
  {"doctype": "Loan Request", "name": "LOAN-2026-00002"}
]
```
`doctype` is the exact backend doctype name (as returned by
`get_delegate_scope().applications[i].doctype`), not a display label. A flat
array of bare names (the old format) is **no longer accepted**.

**Allowed values:**

`delegation_type`:
- `View Only` — delegate can see documents but not edit
- `View and Edit` — delegate can see and edit documents
- `Workflow Action` — delegate can perform workflow actions

`scope_type`:
- `all` — all projects and applications
- `project` — only selected projects (must pass `project_names`)
- `application` — only selected applications (must pass `applications`)

#### Create vs Merge vs Remove behaviour

| Scenario | Backend behaviour |
|---|---|
| No active delegation exists | **Creates** new row with provided values; defaults `delegation_type="View Only"`, `scope_type="all"` |
| Active delegation already exists | **Merges** — `project_names` and `applications` are appended (deduplicated); other fields only change if explicitly sent |
| `remove_project_names` / `remove_applications` sent | Subtracted **after** the merge above — a name in both the add and remove list for the same call ends up removed |
| Existing `scope_type=project`, caller omits `scope_type` | Keeps `project` — scope is **not** downgraded to `all` |
| Caller explicitly sends `scope_type=all` | Overrides existing scope to `all` |
| Caller omits `delegation_type` | Keeps existing delegation type unchanged |
| Caller omits `valid_from` / `valid_to` | Keeps existing validity window unchanged |

**Example — first delegation (creates new):**
```json
{
  "delegate_user": "jane@iitg.ac.in",
  "delegation_type": "View Only",
  "scope_type": "project",
  "project_names": ["PRJ-REG-2026-00001"],
  "valid_to": "2026-12-31 00:00:00"
}
```

**Example — add more projects to existing delegation (merges):**
```json
{
  "delegate_user": "jane@iitg.ac.in",
  "project_names": ["PRJ-REG-2026-00002", "PRJ-REG-2026-00003"]
}
```
> Only `delegate_user` and `project_names` needed. Existing projects, scope_type, delegation_type and validity are preserved.

**Example — remove one application from scope, via the per-chip "×" button:**
```json
{
  "delegate_user": "jane@iitg.ac.in",
  "remove_applications": [{"doctype": "Travel", "name": "TRV-2026-00001"}]
}
```
> No need to resend `project_names`/`applications` — everything else on the delegation stays as-is.

> `project_names`, `applications`, `remove_project_names`, `remove_applications` accept either a plain array or a JSON-stringified array — pick whichever your HTTP client makes more natural.

**Success response:**
```json
{
  "message": {
    "status": "success",
    "name": "DEL-2026-00001"
  }
}
```

**Validation errors thrown by backend:**

| Condition | Error message |
|---|---|
| `delegate_user` does not exist or is disabled | `User 'x@...' does not exist or is disabled.` |
| Delegating to self | `You cannot delegate to yourself.` |
| Invalid `delegation_type` | `Invalid delegation_type. Allowed: ...` |
| Invalid `scope_type` | `Invalid scope_type. Allowed: ...` |
| `scope_type=project` with no projects | `At least one project is required when scope_type is 'project'.` |
| `scope_type=application` with no applications | `At least one application is required when scope_type is 'application'.` |
| Project not owned by current user | `Project 'PRJ-...' does not belong to or is not assigned to you.` |
| Application entry's `doctype` not a registered application doctype | `'{doctype}' is not a delegable application doctype.` |
| Not logged in | `You must be logged in to manage delegations.` |

---

### 5. Revoke a Delegation

**Use when:** User clicks the Revoke / Remove button on a delegation card.

```
POST /api/method/rndopsapp.rndopsapp.api.undelegate_user
```

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `delegation_name` | string | **yes** | The `name` field from `get_active_delegations` (e.g. `DEL-2026-00001`) |

**Example:**
```json
{
  "delegation_name": "DEL-2026-00001"
}
```

**Success response:**
```json
{
  "message": {
    "status": "success"
  }
}
```

**Errors:**

| Condition | Error |
|---|---|
| Delegation not found | `Delegation 'DEL-...' not found.` |
| Not the delegator and not System Manager | `You are not authorised to revoke this delegation.` |

---

## Scope Type UI Logic

```
scope_type = "all"
  → No project/application picker needed
  → Label: "All Projects & Applications"

scope_type = "project"
  → Show multi-select populated from get_delegate_scope().projects
  → project_names = selectedProjectNames   (array of names, or JSON.stringify — both accepted)
  → Label: "Selected Projects"
  → Scope is genuinely enforced now (see "Scope enforcement" note below)

scope_type = "application"
  → Show multi-select populated from get_delegate_scope().applications
  → applications = selectedItems.map(a => ({doctype: a.doctype, name: a.name}))
  → Label: "Selected Applications"
  → Scope is genuinely enforced now (see "Scope enforcement" note below)
```

**Scope enforcement (changed 2026-08-17):** `project`/`application` scope
used to be cosmetic — a scoped delegate saw everything the delegator owned
regardless of the picker selection. That's fixed for **list views**: a
scoped delegate's Travel/Loan Request/etc. list now genuinely only contains
their in-scope documents. If you built any UI copy or confirmation dialogs
assuming scope was decorative, update it — narrowing an existing delegation's
scope now immediately shrinks what the delegate can see in lists.

---

## Delegation Type Behaviour (for display only, with a caveat)

| Type | What the delegate can do |
|---|---|
| `View Only` | See documents in list and detail view |
| `View and Edit` | See and edit documents |
| `Workflow Action` | Perform workflow transitions on documents |

> The backend computes this **for list-view visibility and for
> `create_application_on_behalf`**. It does **not** currently enforce
> `delegation_type` when a delegate opens or saves an individual document
> through this app's existing detail/edit screens (e.g. the Travel detail
> page's save button) — those endpoints don't check delegation at all yet,
> for any user, delegated or not. This is a pre-existing gap unrelated to
> what shipped here; see
> [known_auth_gaps.md](../security/known_auth_gaps.md). Don't build UI that
> assumes a `View Only` delegate is blocked from editing a document they can
> see — today, nothing stops them at the API level.

---

## Visibility — How It Works Automatically

Once a delegation is active, **no frontend query changes are needed for list
views**. Frappe list views for the following doctypes automatically include
delegated records for the logged-in user, scoped per `scope_type`:

- Project Registration
- Travel
- TA DA Settlement
- Temporary Advance
- Advance Settlement
- Reimbursement
- Direct Purchase
- Disbursal of Consultancy
- Disbursal of Honorarium
- Loan Request
- Indent General Form
- Indent Cum Sanction Sheet
- Recruitment Adhoc Contractual

**Example:** User B has an active delegation from User A →
- B opens the Travel list → sees both B's and A's travel records automatically (or only the in-scope subset, if `scope_type` is `project`/`application`)
- A revokes the delegation → B's next page load shows only B's records

**What this does NOT cover:** opening a specific document directly (detail
page, edit form) — see the caveat above.

---

## Datetime Format

All datetime fields (`valid_from`, `valid_to`, `revoked_at`) use:

```
YYYY-MM-DD HH:MM:SS
```

Example: `"2026-12-31 23:59:59"`

Pass `null` or omit the field to leave it unrestricted.

---

## Suggested UI Checklist

- [ ] Route guard — plain "is logged in" check, not a role check
- [ ] Delegate User search — autocomplete using `search_delegate_users`
- [ ] Delegation type selector — `View Only` / `View and Edit` / `Workflow Action`
- [ ] Scope type selector — `all` / `project` / `application`
- [ ] Project multi-select — shown only when `scope_type = project`, options from `get_delegate_scope().projects`
- [ ] Application multi-select — shown only when `scope_type = application`, options from `get_delegate_scope().applications`, sending `{doctype, name}` pairs
- [ ] Optional validity date pickers — `valid_from` / `valid_to`
- [ ] Active delegations list — loaded from `get_active_delegations()`, showing actual `project_names`/`applications` chips, not just counts
- [ ] Per-chip "×" remove control — calls `delegate_user(delegate_user, remove_project_names=[...])` or `remove_applications=[...]`
- [ ] Confirmation dialog when narrowing an existing delegation's scope (scope is now genuinely enforced — see "Scope Type UI Logic" above)
- [ ] Revoke button per delegation card — calls `undelegate_user(name)`
- [ ] Error toast for all backend validation errors
- [ ] Refresh delegation list after create, remove, or revoke
- [ ] Create-on-behalf flow — separate screen, see [create_on_behalf_ui_guide.md](create_on_behalf_ui_guide.md)
