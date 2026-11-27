# Role Delegation and Profile Switching: Plan

> **Status: plan only, nothing implemented** (2026-11-27).
> Separate from `User Delegation` ([delegation.md](delegation.md)), which shares
> documents by owner and does not hand over approval authority.
>
> Backend and frontend steps, including the API contract:
> [role_delegation_implementation_plan.md](role_delegation_implementation_plan.md).

## 1. Goal

An `Ado_RnD` user who is out of station delegates that role to the Dean. The
Dean logs in with their own credentials, switches to the delegated profile from a
dropdown, acts, and **switches back to their own profile at any time** without
logging out. Every action records the real user and the delegated role.

## 2. Approach

The logged-in user never changes. Only the **effective roles** of the request do.

| Profile | `session.user` | Effective roles |
|---|---|---|
| Own | Dean | Dean's normal roles |
| Acting as Ado_RnD | Dean | `Ado_RnD`, `All_ProRnd_User`, `Desk User`, `All`, `Guest` |

`modified_by` therefore stays the Dean. Switching back only removes the override;
no second login or session swap is involved. Records owned by the Dean, and
user-based rules such as existing User Delegations, still follow the Dean in
both profiles.

## 3. Switching and switching back

The active profile is stored **on the server, in the Dean's session**
(`session.data.acting_delegation`). This also covers file downloads and print
links, which cannot send a custom header.

```
Own profile ── switch_profile(delegation) ──▶ Acting as Ado_RnD
     ▲                                              │
     ├──────── switch_to_own_profile() ─────────────┤
     └── logout / expiry / revocation ──────────────┘
```

Rules:

1. A new login always starts on the own profile.
2. `switch_to_own_profile` needs only a logged-in session. It is **never blocked**
   by delegation checks, so nobody can get stuck, and calling it twice is harmless.
3. These calls skip the check on the current profile: `switch_profile` (which
   validates the new grant itself), `switch_to_own_profile`,
   `get_acting_profiles`, `logout`.
4. If the grant expires or is revoked, or the delegator loses the role, the next
   request is **rejected** (`DelegationEnded`) and the session returns to the own
   profile. The action is not silently run as the Dean.
5. While acting, every write request sends `X-Acting-Delegation: <grant id>`
   (on the own profile it is omitted or `self`). If it is missing or differs from the session (for example, a second tab switched), the server
   rejects it (`ProfileMismatch`) and the UI reloads the profile.
6. Moving between two delegated profiles is a direct `switch_profile` call.
   Checks use the real user and the grant, not the current effective roles.

The profile applies to the whole login session, so all tabs sharing it switch
together. Another browser or device has its own profile.

## 4. Data model

**Role Delegation**

| Field | Notes |
|---|---|
| `delegator` | must hold every delegated role |
| `delegate` | must differ from delegator |
| `roles` | from an allow-list: `Ado_RnD`, `Associate Dean, RND`; never `System Manager` |
| `from_datetime`, `to_datetime` | required |
| `reason` | required |
| `status` | Active / Revoked (expiry is computed from the dates) |
| `revoked_by`, `revoked_at` | |

Only the endpoints write it; no role gets direct create or write permission.

**Role Delegation Log** (read-only): timestamp, event (grant, revoke,
switch_in, switch_out, action, denied), actual user, delegator, delegated role,
grant, endpoint, doctype, document, workflow action, result, IP. `switch_out`
records why: manual, logout, expired, revoked. A session that simply times out
gets no `switch_out` row.

## 5. Endpoints

| Endpoint | Who | Does |
|---|---|---|
| `create_role_delegation` | delegator | create a grant |
| `revoke_role_delegation` | delegator, System Manager | revoke it |
| `get_role_delegations` | any user | grants given and received |
| `get_acting_profiles` | any user | dropdown items and the current one |
| `switch_profile(delegation)` | delegate | validate, store in session, log |
| `switch_to_own_profile()` | any user | clear from session, log |

Switch calls are POST. Create and revoke are refused while acting.

`get_acting_profiles` returns:

```json
{
  "current": "RD-0001",
  "profiles": [
    {"id": "self", "label": "My profile"},
    {"id": "RD-0001", "label": "Ado_RnD (for <name>)",
     "roles": ["Ado_RnD"], "valid_till": "2026-12-05 18:00:00"}
  ]
}
```

## 6. Enforcement

- `auth_hooks` entry: read the session's grant, validate it, then set the
  request-local role cache and reset `frappe.local.role_permissions`. The shared
  Redis cache is not touched.
- No self-approval: while acting, block actions on the Dean's own applications.
- No double approval: block one person from approving both the Ado and Dean levels
  of the same document, in either order.
- Log every write request while acting, including failed ones.

## 7. Frontend

- Dropdown in the header, shown when the user has at least one active grant or is
  currently acting. "My profile" is always first and always selectable.
- While acting: a fixed banner "Acting as Ado_RnD for <name>" with a
  **Switch back** button.
- After any switch: clear cached roles, menus, lists and pending counts, refetch
  them, and go to the dashboard so no half-filled form carries over.
- On `DelegationEnded` or `ProfileMismatch`: refetch the profile and tell the user.

## 8. Phases

| # | Work | Done when |
|---|---|---|
| 0 | Prototype the role override and session storage on a local site | workflow actions and pending list follow the profile; switching back restores all roles on the next request; shared role cache unchanged |
| 1 | Doctypes, grant endpoints, tests | validation rules pass |
| 2 | Switch endpoints, auth hook, header check, tests | section 3 rules pass |
| 3 | Review direct `Has Role` queries and direct `workflow_state` writes for the 9 Ado doctypes; add approval blocks and logging | each doctype checked end to end |
| 4 | Frontend dropdown and banner | manual run with two test users |
| 5 | Deploy: `bench migrate`, `clear-cache`, restart | smoke test on staging |

If phase 0 fails, revisit the approach before building anything else.

## 9. Key tests

- Switch in, approve a document, switch back: own roles and pending items return.
- Switch back works with an expired or revoked grant, and when already on own profile.
- Expiry during a session rejects the next action and resets the profile.
- Logout then login starts on own profile.
- A user cannot switch to someone else's grant.
- While acting, Dean-only actions are refused.
- A stale tab sending the old header is rejected.

## 10. Assumed defaults (to confirm)

1. One person may **not** approve both the Ado and Dean levels of a document.
2. `Associate Dean, RND` is delegated only if selected on the grant.
3. The delegator keeps their own access during the delegation.
4. Only the delegator creates grants; no admin creation in the first version.
5. The delegate must hold `Dean, RnD`.

## 11. Before rollout

Rotate the hardcoded password(s) in `rndopsapp/external_auth.py`, move them out of
code, and re-check [known_auth_gaps.md](../security/known_auth_gaps.md).
