# Delegate User Implementation Plan

## Goal

Implement delegated document visibility using a "visible as users" model.

Example:

- User A owns or is assigned to documents.
- User B is delegated by User A.
- When User B logs in, the system treats B as visible-as `[B, A]` for document listing and read visibility.

Core rule:

```text
pi_webmail in [current_user, delegated_from_users...]
head_approver in [current_user, delegated_from_users...]
owner in [current_user, delegated_from_users...]
```

If B is delegated by A:

```text
visible_as_users = [B, A]
```

Then B can see records where:

```text
pi_webmail = B OR pi_webmail = A
head_approver = B OR head_approver = A
owner = B OR owner = A
```

## Important Boundary

This approach is primarily for document visibility.

Do not automatically treat visibility delegation as approval, submit, edit, payment, or workflow delegation unless the backend explicitly allows those actions.

Separate these concepts:

```text
visible_as_users: users whose records this user may see
action_as_users: users whose records this user may act on
actual_user: the logged-in Frappe session user
```

For the first implementation, prefer read/list visibility first. Add delegated workflow actions only after backend validation is complete.

## Backend Model

Create a central DocType, for example `User Delegation`.

Recommended fields:

- `delegator_user`: Link/User. The user who gives delegation. Example: A.
- `delegate_user`: Link/User. The user who receives delegation. Example: B.
- `enabled`: Check.
- `valid_from`: Datetime.
- `valid_to`: Datetime.
- `delegation_type`: Select. Suggested values: `View Only`, `View and Edit`, `Workflow Action`.
- `allowed_doctypes`: Table or JSON if needed.
- `allowed_projects`: Table or JSON if needed.
- `remarks`: Small Text.
- `revoked_at`: Datetime.
- `revoked_by`: Link/User.

Minimum viable fields:

```text
delegator_user
delegate_user
enabled
valid_from
valid_to
delegation_type
```

## Backend Helper Rules

Add a backend helper that returns the users whose documents the current session user can see.

Example:

```python
def get_visible_as_users(user=None):
    user = user or frappe.session.user
    users = {user}

    active_delegations = frappe.get_all(
        "User Delegation",
        filters={
            "delegate_user": user,
            "enabled": 1,
        },
        fields=["delegator_user", "valid_from", "valid_to"],
    )

    now = frappe.utils.now_datetime()
    for row in active_delegations:
        if row.valid_from and frappe.utils.get_datetime(row.valid_from) > now:
            continue
        if row.valid_to and frappe.utils.get_datetime(row.valid_to) < now:
            continue
        users.add(row.delegator_user)

    return list(users)
```

Rules:

- Always include `frappe.session.user`.
- Add only active delegators.
- Validate date range.
- Ignore disabled or revoked delegation.
- Never accept `visible_as_users` directly from frontend as trusted input.

## Backend API Pattern

Prefer backend APIs that return already-authorized records instead of making the frontend build all permission filters.

Recommended APIs:

```text
get_visible_project_registrations()
get_visible_pending_tasks()
get_project_permissions(docname)
get_visible_documents(doctype)
```

The frontend should call these APIs wherever possible.

## Query Rules

Where existing logic is:

```text
pi_webmail = current_user
```

Change to:

```text
pi_webmail in visible_as_users
```

Where existing logic is:

```text
head_approver = current_user
```

Change to:

```text
head_approver in visible_as_users
```

Where existing logic is:

```text
owner = current_user
```

Change to:

```text
owner in visible_as_users
```

For combined access:

```python
visible_as_users = get_visible_as_users()

filters = [
    ["Project Registration", "pi_webmail", "in", visible_as_users],
]
```

For OR conditions across multiple fields, use backend query builder or SQL with parameters.

Example concept:

```text
pi_webmail in visible_as_users
OR head_approver in visible_as_users
OR owner in visible_as_users
```

Do not rely on unsupported client-side Frappe filter syntax for complex OR queries.

## Frontend Identity Rule

Add a frontend hook/context, for example:

```ts
type DelegateContext = {
  actualUser: string | null;
  visibleAsUsers: string[];
  isDelegatedView: boolean;
  delegatedFromUsers: string[];
};
```

Recommended hook:

```ts
const {
  actualUser,
  visibleAsUsers,
  delegatedFromUsers,
  isDelegatedView,
} = useDelegateUser();
```

Rules:

- `actualUser` comes from `useFrappeAuth().currentUser`.
- `visibleAsUsers` comes from backend.
- `visibleAsUsers` must include `actualUser`.
- The frontend may use `visibleAsUsers` for display filters.
- The frontend must not use `visibleAsUsers` as the final authority for workflow actions.

## Frontend Filter Pattern

Current pattern:

```ts
filters: currentUser
  ? [["pi_webmail", "=", currentUser]]
  : [["name", "=", "NON_EXISTENT_DOC"]]
```

Delegate-aware pattern:

```ts
filters: visibleAsUsers.length
  ? [["pi_webmail", "in", visibleAsUsers]]
  : [["name", "=", "NON_EXISTENT_DOC"]]
```

For head approver:

```ts
filters: visibleAsUsers.length
  ? [["head_approver", "in", visibleAsUsers]]
  : [["name", "=", "NON_EXISTENT_DOC"]]
```

For complex OR filters, prefer backend APIs instead of multiple frontend `useFrappeGetDocList` calls.

## Required Frontend Changes In This Codebase

### `ProjectsView`

Current blockers:

```text
pi_webmail = currentUser
head_approver = currentUser
```

Change to:

```text
pi_webmail in visibleAsUsers
head_approver in visibleAsUsers
```

Best option:

- Replace separate direct `useFrappeGetDocList` queries with backend API `get_visible_project_registrations`.
- Backend should return groups such as `created`, `approval`, `admin`, or return records with reason flags.

### `PendingTask`

Current blocker:

```text
head_approver = currentUser
```

Change to:

```text
head_approver in visibleAsUsers
```

Best option:

- Update backend `get_pending_task` to include delegated documents using `visible_as_users`.
- Frontend should not manually remove delegated tasks after backend returns them.

### `ProjectDetails`

Current blocker:

```text
currentUser === data.pi_userid
```

Visibility-aware check:

```ts
visibleAsUsers.includes(data.pi_userid)
```

But for edit/workflow buttons, prefer backend permission flags:

```ts
permissions.can_edit
permissions.can_submit
permissions.can_workflow_action
```

Do not show action buttons only because `visibleAsUsers` contains the PI.

### `ProjectDetailsOverview`

Current blockers:

```text
data.pi_webmail === currentUser
data.owner === currentUser
sanction.owner === currentUser
```

Visibility-aware checks:

```ts
visibleAsUsers.includes(data.pi_webmail)
visibleAsUsers.includes(data.owner)
visibleAsUsers.includes(sanction.owner)
```

For sanctioned budget edit, payments, workflow, or financial actions, use backend permission flags.

## Workflow And Action Rules

Visibility does not imply action permission.

Backend must decide whether the delegate can:

- edit draft
- submit document
- approve workflow
- reject workflow
- request correction
- upload files
- edit financial fields
- generate project number
- create payments or commitments

Recommended backend permission response:

```json
{
  "can_read": true,
  "can_edit": false,
  "can_submit": false,
  "can_workflow_action": false,
  "allowed_actions": [],
  "visible_as_users": ["b@iitg.ac.in", "a@iitg.ac.in"],
  "matched_as_user": "a@iitg.ac.in"
}
```

Frontend rule:

- Use `visibleAsUsers` for list/read visibility.
- Use `allowed_actions` or `can_*` flags for buttons.

## Audit Rules

For every delegated action, record:

```text
actual_user: B
matched_as_user/delegator_user: A
doctype
docname
action
timestamp
delegation_id
remarks/comment
```

If User B only views User A's document, detailed audit may be optional.

If User B edits, submits, approves, uploads, or performs workflow actions, audit is mandatory.

## Security Rules

- Frontend must not send arbitrary `delegated_user` and expect backend to trust it.
- Backend must compute `visible_as_users` from `frappe.session.user`.
- Backend must validate active delegation on every sensitive API.
- Hide delegation fields from normal users.
- Prevent users from modifying delegation records unless they are authorized.
- Do not expose all delegators globally.
- Do not allow expired delegation.
- Do not allow disabled delegation.
- Do not allow workflow action just because a document is visible.
- Avoid direct generic write APIs for delegated actions unless wrapped with custom validation.

## Scalability Rules

Prefer a central `User Delegation` DocType over adding JSON fields to every business DocType.

Reasons:

- Easier revocation.
- Easier expiry.
- Easier audit.
- Easier query reuse.
- No need to update every existing document when delegation changes.

If JSON fields are used on documents, use them only as optional document-specific overrides, not as the main delegation source.

## Recommended Rollout

### Phase 1: Read Visibility

Backend:

- Add `User Delegation` DocType.
- Add `get_visible_as_users`.
- Update project and pending-task list APIs.
- Add read permission logic for delegated documents.

Frontend:

- Add `useDelegateUser`.
- Replace simple user filters with `visibleAsUsers` where safe.
- Prefer backend visible-list APIs.
- Show a small UI indicator when viewing delegated records.

### Phase 2: Detail Pages

Backend:

- Add `get_project_permissions(docname)`.
- Return whether the logged-in user sees the record directly or through delegation.

Frontend:

- Use permission response in `ProjectDetails`.
- Use permission response in `ProjectDetailsOverview`.
- Avoid direct `currentUser === field` checks for read visibility.

### Phase 3: Actions

Backend:

- Add action-level delegation rules.
- Add audit logs.
- Validate all workflow and submit endpoints.

Frontend:

- Show edit/submit/approve buttons only from backend `allowed_actions`.
- Pass comments/reasons for delegated actions.

## Examples

### User B sees User A's PI projects

```text
current_user = B
delegated_from_users = [A]
visible_as_users = [B, A]
```

Query:

```text
pi_webmail in [B, A]
```

Result:

- B's own PI projects.
- A's PI projects.

### User B sees User A's head approval projects

Query:

```text
head_approver in [B, A]
```

Result:

- B's own approval projects.
- A's approval projects.

### User B opens User A's project detail page

Backend checks:

```text
data.pi_webmail in [B, A]
OR data.head_approver in [B, A]
OR data.owner in [B, A]
```

If true:

```text
can_read = true
```

Action buttons still require separate permission.

## Final Decision

The `pi_webmail in [B, A]` approach is workable and fits the current frontend pattern, provided it is implemented as a backend-supported `visible_as_users` model.

Use this approach for visibility first. Keep workflow/action permissions separate and backend-validated.
