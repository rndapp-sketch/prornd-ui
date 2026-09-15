# Create Application On Behalf — Frontend UI Guide

> New feature, 2026-08-17. Backend is implemented and live:
> `rndopsapp.rndopsapp.api.create_application_on_behalf`. See
> [delegation.md §6](delegation.md) for the full API reference this guide
> summarizes for UI purposes.

## What is this?

A delegate with `View and Edit` or `Workflow Action` delegation, scoped to a
project (or unrestricted `all` scope), can create a **new** application
document — Travel, Loan Request, etc. — attributed to the project owner, not
just view/edit applications that already exist. This is a different
capability from the rest of the delegation feature: everything else in
[delegation_frontend_guide.md](delegation_frontend_guide.md) is about scoping
*visibility* of existing documents; this is about *authoring new ones* for
someone else.

**This is a separate screen/flow from `/delegate-user`.** The delegate-config
page is where someone grants delegation; this is where a delegate, once
granted `View and Edit`/`Workflow Action` + project scope, actually uses it
to create something.

---

## Who sees this UI at all?

Only show a "Create on behalf" entry point where it's actually usable. There
are two reasonable ways to gate it in the UI (the backend enforces the real
check regardless — this is purely about not showing a dead-end button):

1. **Simple/recommended:** always show it once the user has at least one
   active delegation *received* (i.e. they are someone else's `delegate_user`
   with `delegation_type` in `View and Edit`/`Workflow Action`). Let the
   create screen itself narrow down to which delegator/project combinations
   are actually usable (see below) — don't try to pre-filter every doctype's
   eligibility in the entry-point UI.
2. **Fuller:** call `get_active_delegations()` scoped as delegate (there's no
   dedicated "delegations received" endpoint today — see Open Gaps below) to
   decide whether to show the entry point at all.

---

## Page flow

```
Create-on-behalf screen
│
├── Step 1: pick who you're creating for
│   → You need the list of people who have delegated to you, with
│     View and Edit / Workflow Action, project or all scope.
│     ⚠ No dedicated endpoint returns this today — see Open Gaps below.
│
├── Step 2: pick the doctype
│   → One of the 12 application doctypes (same list as the scope picker
│     in delegation_frontend_guide.md §2)
│
├── Step 3: pick the project
│   → Required for doctypes with a project field (Travel, TA DA Settlement,
│     Temporary Advance, Advance Settlement, Reimbursement — see table below)
│   → Must be one of the delegator's projects that's actually in your
│     delegated scope (scope_type='all', or scope_type='project' with this
│     project in project_names)
│
├── Step 4: fill the application form
│   → Same form fields as the doctype's normal create flow
│
└── Submit → call create_application_on_behalf(doctype, delegator_user, project_name, fields)
```

---

## Open gap: "who has delegated to me" isn't a dedicated endpoint yet

`get_delegate_scope()` and `get_active_delegations()` both return delegations
**created by** the current user (as delegator), not delegations **received**
(as delegate). There is currently no whitelisted function that answers "list
the people who have delegated to me, with what type/scope" — which Step 1
above needs.

**Until that exists**, options for Step 1:
- **Ask the backend for a small addition**: a `get_received_delegations()`
  endpoint mirroring `get_active_delegations()` but filtered by
  `delegate_user = session.user` instead of `delegator_user`. This is the
  clean fix — flag it to backend before building Step 1's picker.
- **Workaround without a backend change**: let the user type/search a
  specific person and project directly (e.g. reuse `search_delegate_users`
  in reverse — search for a delegator by name), then let the
  `create_application_on_behalf` call itself be the source of truth: attempt
  the create, and surface the `PermissionError` message
  (`"You are not authorised to create a {doctype} on behalf of {delegator_user}
  for project '{project_name}'."`) if they don't actually have covering
  scope. Workable for a first cut, worse UX (no upfront filtering to only
  valid combinations).

Recommend requesting the backend addition rather than shipping the
workaround as final UX — it's a small, mechanical addition (mirror of an
existing function) once you're ready for it.

---

## Doctype → project-field requirement

| DocType | Requires `project_name`? | project field (backend) |
|---|---|---|
| Travel | Yes | `travel_project_number` |
| TA DA Settlement | Yes | `project_no` |
| Temporary Advance | Yes | `project_name` |
| Advance Settlement | Yes | `project_name` |
| Reimbursement | Yes | `project_number` |
| Direct Purchase | No | — |
| Disbursal of Consultancy | No | — |
| Disbursal of Honorarium | No | — |
| Loan Request | No | — |
| Indent General Form | No | — |
| Indent Cum Sanction Sheet | No | — |
| Recruitment Adhoc Contractual | No | — |

**For the 7 doctypes with no project field:** `scope_type='project'`
delegations can **never** authorize creation (there's no project to check
scope against) — only `scope_type='all'` delegations can. If the picked
delegator/doctype combination is project-scoped only, disable or hide these
7 doctypes in Step 2 for that combination (or let the submit attempt fail
with the `PermissionError` and surface it — your call on UX polish, but
disabling upfront is better if you already have the delegator's scope info
loaded from Step 1).

---

## API call

```
POST /api/method/rndopsapp.rndopsapp.api.create_application_on_behalf
```

```json
{
  "doctype": "Travel",
  "delegator_user": "a@iitg.ac.in",
  "project_name": "PRJ-REG-2026-00001",
  "fields": {
    "purpose_of_travel": "Conference",
    "destination": "Delhi",
    "...": "...any other Travel field..."
  }
}
```

**Response:**
```json
{ "message": { "status": "success", "name": "TRV-2026-00042" } }
```

**`fields` handling:**
- Send the same field payload you'd send to the doctype's normal create flow.
- Don't bother setting the owner-identifying field (`webmail_id_travel`,
  `applicant_webmail`, etc.) yourself — the backend force-sets it to
  `delegator_user` regardless of what you send, so the new document correctly
  shows up as the project owner's application everywhere the rest of the app
  already expects that.
- Don't set `name`, `owner`, `docstatus`, `workflow_state`, `creation`,
  `modified`, `modified_by`, `idx` — these are stripped server-side even if
  included.

**Errors to surface:**

| Condition | Error message |
|---|---|
| `doctype` not a registered application doctype | `'{doctype}' is not a delegable application doctype.` |
| Delegating to self | `Use the normal create flow for your own applications.` |
| `delegator_user` doesn't exist / disabled | `User '{delegator_user}' does not exist or is disabled.` |
| Project-field doctype missing `project_name` | `'{doctype}' requires project_name to create on behalf of another user.` |
| No covering delegation (wrong scope, wrong type, or none) | `You are not authorised to create a {doctype} on behalf of {delegator_user} for project '{project_name}'.` |
| Not logged in | `You must be logged in to manage delegations.` |

---

## After creation

The new document is owned (in the app's sense — its `webmail_id_travel` /
etc. field) by `delegator_user`, so it will appear in:
- The delegator's own application list, as if they created it
- The delegate's list view too, since they have an active delegation
  covering it (via the normal `permission_query_conditions` expansion)
- The delegator's `get_delegate_scope().applications` on their next load

No extra frontend sync work needed after a successful create — route the
user to the new document's normal detail/edit view, same as any other create
flow.

---

## QA checklist

- [ ] A delegate with `View and Edit`, `scope_type='all'` can create any of
      the 12 application doctypes on behalf of their delegator
- [ ] A delegate with `View and Edit`, `scope_type='project'` (project X in
      scope) can create a project-field doctype (e.g. Travel) with
      `project_name=X`, and is rejected for a different project
- [ ] A delegate with `View and Edit`, `scope_type='project'` is rejected
      when creating a doctype with **no** project field (Direct Purchase,
      Loan Request, etc.) — only `scope_type='all'` should permit those
- [ ] A delegate with `View Only` delegation is rejected regardless of scope
- [ ] A delegate with `scope_type='application'` is rejected regardless of
      delegation_type (no forward-looking scope)
- [ ] The created document's owner-identifying field is the delegator, not
      the delegate, and it shows up correctly in the delegator's own
      application list
- [ ] Attempting to spoof `owner`/`docstatus`/`workflow_state` via `fields`
      has no effect on the created document
- [ ] Error messages from the table above are surfaced legibly, not as raw
      HTTP 417 exception dumps
