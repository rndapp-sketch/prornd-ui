# Application-Level Delegation — Frontend Plan

> **Status: Backend is implemented and live in the codebase.** All 6 sections
> below can be built against the real API now — nothing here is speculative.
> Exact request/response shapes as actually shipped are called out in each
> section (search for **Actual API**). Run `bench migrate` before/with this
> frontend deploy so existing `application`-scoped rows are converted to the
> new `{doctype, name}` shape by `rndopsapp.patchs.fix_delegation_application_scope`
> — until that patch runs, un-migrated rows will silently resolve to empty
> scope under the new code. For the current, day-to-day reference (not just
> this plan's rationale), use
> [delegation_frontend_guide.md](delegation_frontend_guide.md). A new,
> separate feature shipped alongside this — delegates creating new
> applications on behalf of the project owner — is not covered by this plan
> at all; see [create_on_behalf_ui_guide.md](create_on_behalf_ui_guide.md).

## Context

The backend currently accepts and stores `scope_type=application` but does not
enforce it — a delegate sees everything the delegator owns regardless of which
applications were selected. The backend plan
([application_level_delegation_backend_plan.md](application_level_delegation_backend_plan.md))
fixes that, which changes two things the frontend depends on: the payload
shape for `applications`, and the fact that scope will now visibly restrict
what the delegate sees. Both need frontend changes before/alongside the
backend fix ships.

---

## 0. Open access to all logged-in users (Permanent Employee, project staff, students, ...) [SHIPPED]

Backend now gates only on "is a real logged-in user" —
`_require_authenticated_user()` in `delegate_user.py` (throws only when
`frappe.session.user == "Guest"`). This is live: `search_delegate_users`,
`get_delegate_scope`, `get_active_delegations`, `delegate_user`, and
`undelegate_user` all use this gate today, no role check remains. Frontend
changes to match:

- **Route guard:** `/delegate-user` currently checks for the `Permanent
  Employee` role before rendering (per `delegation_frontend_guide.md`, "Who
  Can Use This?"). Change this to a plain "is logged in" check (not Guest) —
  drop the role check entirely rather than trying to enumerate an ever-growing
  list of eligible roles. This is a direct behavior change: any authenticated
  user, including students, can now reach the page.
- **Delegate picker labeling:** `search_delegate_users()` already returns any
  enabled `User` by name/full_name/email with no role filter — students and
  project staff will now show up in the autocomplete once the route/API gate
  stops blocking them from calling it. Consider adding a role/designation
  badge (e.g. "Project Staff — JRF", "Student") where derivable, purely for
  picker clarity — not required for coverage, since search already isn't
  role-filtered.
- **No change needed** to the scope pickers (`get_delegate_scope().projects` /
  `.applications`) — already keyed off document ownership by email, not role.
  A student delegator will correctly see only their own
  projects/applications once the route/API gate admits them; if they own
  none, the pickers are simply empty (nothing to delegate) rather than an error.
- **QA:** verify a plain student-only account (no `Permanent Employee` or
  `project staff` role) can open `/delegate-user`, see their own scope (empty
  or populated), create a delegation if they own any applications, and appear
  as a selectable delegate target for others. Also verify a fully logged-out
  (Guest) request is still blocked.

---

## 1. Payload shape change for `applications` [SHIPPED]

**Old (no longer supported):** a flat JSON-stringified array of doc names.

**Actual API — `rndopsapp.rndopsapp.api.delegate_user`:** send `{doctype,
name}` pairs. `applications` accepts either a JSON string or a plain array —
`delegate_user()` parses both (`isinstance(value, str)` check), so send
whichever is more natural for your HTTP client:

```json
{
  "delegate_user": "user@example.com",
  "delegation_type": "View Only",
  "scope_type": "application",
  "applications": [
    {"doctype": "Travel", "name": "TRV-2026-00001"},
    {"doctype": "Loan Request", "name": "LOAN-2026-00002"}
  ]
}
```

`doctype` here is the exact backend doctype name (e.g. `"Travel"`, not a
display label) — it's the same value `get_delegate_scope().applications[i].doctype`
already returns per row, so no extra mapping is needed on submit.

Malformed entries are silently dropped server-side (missing `doctype`/`name`,
or `doctype` not one of the 12 registered application doctypes → `frappe.throw`
with `"'{doctype}' is not a delegable application doctype."`). Surface that
error message as-is if the create call fails.

---

## 2. Scope transparency in the UI [SHIPPED]

Because scope had no visible effect until now, the existing UI only showed
*counts* (`project_count`, `application_count`) on delegation cards. Now that
scope is enforced, users need to actually see and manage what's included.

**Actual API — `get_active_delegations()` response**, one object per row:
```json
{
  "name": "DEL-2026-00001",
  "delegate_user": "user@example.com",
  "delegate_user_name": "Jane Doe",
  "delegation_type": "View Only",
  "scope_type": "application",
  "project_names": ["PRJ-2026-00003"],
  "applications": [{"doctype": "Travel", "name": "TRV-2026-00001"}],
  "project_count": 1,
  "application_count": 1,
  "valid_from": null,
  "valid_to": null,
  "enabled": 1
}
```

`project_names` / `applications` are the resolved lists (not JSON strings —
already parsed arrays), added alongside the existing counts so no follow-up
detail call is needed. Expand each delegation card to list the specific
projects/applications (e.g. a chip list of `Travel: TRV-2026-00001`) instead
of just the count.

---

## 3. Add a "remove item from scope" affordance [SHIPPED]

`delegate_user()` still **merges/adds** via `project_names` / `applications`
as in §1, and now also accepts two additional, independent params to shrink
an existing scope. Note these are **two separate params**, not one combined
`remove` list — mirroring the add-side shape:

- `remove_project_names` — plain array of Project Registration names, e.g. `["PRJ-2026-00002"]`
- `remove_applications` — array of `{doctype, name}` pairs, same shape as `applications`

Both accept a JSON string or a plain array, same as the add-side params. They
can be sent alone (no `project_names`/`applications` in the same call) to
just shrink an existing delegation — you don't need to resend the full add
payload. If a name appears in both the add and remove list in the same call,
removal wins (applied after the merge).

Build a per-chip "×" remove control on the delegation card that calls
`delegate_user(delegate_user=<row.delegate_user>, remove_project_names=[...])`
or `remove_applications=[...]` for the specific item removed.

---

## 4. Warn on scope-narrowing edits

When a user changes an existing delegation's `scope_type` from `all` to
`project`/`application`, or from a still-being-configured `application` scope
with a wider list, the delegate's access will now *immediately shrink* after
the fix ships. Add a confirmation step:

> "This will restrict {delegate}'s access to only the selected items. They
> will no longer see your other records. Continue?"

This wasn't necessary before because scope changes had no real effect — it
becomes necessary the moment enforcement lands.

---

## 5. Communicate the behavior change to existing users

Any Permanent Employee who previously set up a `project`/`application` scoped
delegation — believing it was already restricting access — will see their
delegate's visibility drop once the backend fix ships (it's actually being
correctly enforced for the first time). Coordinate an in-app notice or
release note timed with the backend deploy so this doesn't read as a bug
report.

---

## 6. QA checklist (re-run against real enforcement)

The existing checklist in `delegation_frontend_guide.md` assumed scope was
cosmetic. The backend enforcement described above is already live — re-verify
each item against actual restricted behavior as you build the frontend:

- [ ] `scope_type=application` with 1 selected item → delegate sees exactly
      that 1 document in the relevant list view, not the delegator's full list
- [ ] `scope_type=project` → delegate sees only documents under that project
      across all application doctypes, not just Project Registration
- [ ] Delegate cannot open a non-scoped document directly by URL (should now
      403, previously succeeded)
- [ ] Removing the last item from a scoped delegation's list results in zero
      extra visibility (not a silent fallback to unrestricted)
- [ ] `scope_type=all` still behaves exactly as before (no regression)
- [ ] New `{doctype, name}` payload round-trips correctly through create,
      merge-add, and (once built) remove flows
- [ ] Delegation card shows actual included items, not just counts
- [ ] Scope-narrowing confirmation dialog appears when tightening an existing
      delegation
