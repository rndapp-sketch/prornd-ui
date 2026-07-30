# `put_back_action.py` — Workflow "Put Back" Action

## Overview

"Put Back" lets a user force a document's `workflow_state` backward to an earlier state in its own workflow chain — e.g. sending a document that's `Pending HOS Approval` back to `Pending Staff Approval` or `Draft`.

Normal workflow transitions are role-gated (`Workflow Transition.allowed`), so a user who wants to send a document back a step usually doesn't hold the role for that specific *forward* transition in reverse. This module deliberately **bypasses that role check** by writing `workflow_state` straight to the database instead of going through `doc.save()`. To keep that bypass safe, every put-back is made auditable: the acting `username` must be supplied explicitly and is always recorded — together with the logged-in session user and an optional reason — as a `Comment` on the document.

| Function | Whitelisted as | Purpose |
|---|---|---|
| `get_put_back_document_states(doctype, docname)` | `frappe.whitelist()` | Returns the list of valid "put back" target states for a document. |
| `set_put_back_workflow_state(doctype, docname, state, username, comment=None)` | `frappe.whitelist()` | Performs the put-back: writes the new state and logs a Comment. |
| `get_put_back_document_states_test(...)` | `frappe.whitelist(allow_guest=True)` | **Test-only** clone of the getter. |
| `set_put_back_workflow_state_test(...)` | `frappe.whitelist(allow_guest=True)` | **Test-only** clone of the writer. |

---

## `_get_active_workflow(doctype)`

Resolves which `Workflow` document governs a doctype:

1. Look for a `Workflow` where `document_type == doctype` and `is_active == 1`.
2. If none is active, fall back to *any* `Workflow` for that doctype.
3. Return the first match's `name`, or `None` if the doctype has no workflow at all.

---

## Step 1 — `get_put_back_document_states`

Given a document's current `workflow_state`, walks the workflow's transition graph **backwards** to build the list of valid put-back targets.

1. Confirm the document exists and resolve its active workflow (via `_get_active_workflow`). Either failure returns `{"status": "error", ...}`.
2. Read the document's current `workflow_state`. If it has none, return an empty state list.
3. Load all `Workflow Transition` rows for the workflow (`state`, `next_state` pairs) and invert them into a `predecessors` map: `next_state → [state, ...]`.
4. Starting from `current_state`, repeatedly look up predecessors, take the first unseen one, append it to `states`, and continue from there — stopping when a state has no unseen predecessor (cycle guard via a `seen` set).

```
current_state = "Pending HOS Approval"
predecessors  = {"Pending HOS Approval": ["Pending Staff Approval"],
                  "Pending Staff Approval": ["Draft"]}

→ states = ["Pending Staff Approval", "Draft"]
```

**Note:** if a state has multiple predecessors (a workflow with more than one incoming transition), only the *first* one returned by `frappe.get_all` is followed — the walk does not branch or explore alternate paths.

Returns:
```json
{"status": "success", "current_state": "Pending HOS Approval", "states": ["Pending Staff Approval", "Draft"]}
```

---

## Step 2 — `set_put_back_workflow_state`

Performs the actual state reversion.

1. **Validate inputs:** document must exist; `username` (trimmed) and `state` are required.
2. **Validate target state:** if the doctype has a workflow, `state` must appear in that workflow's `Workflow Document State` list — otherwise the request is rejected with `"'{state}' is not a valid state for this workflow"`.
3. **Capture context:** reads the current `workflow_state` as `prev_state` (defaulting to `"Unknown"`) and the active session user (`frappe.session.user`) — this is the user who is *invoking* the API, not necessarily the `username` credited with the action.
4. **Write the state directly:**
   ```python
   frappe.db.set_value(doctype, docname, "workflow_state", state, update_modified=False)
   ```
   This is the bypass: going around `doc.save()` means the `Workflow Transition` role check (which only fires on a normal save-triggered transition) never runs.
5. **Log a `Comment`**, not an `Activity Log` entry — Frappe's document "Activity" tab reads `docinfo.workflow_logs`, which is built from `Comment` records with `comment_type: "Workflow"`. Writing an `Activity Log` doc instead would be invisible in the UI, so the audit trail has to be a `Comment`:
   ```
   [Put Back] {username}: {prev_state} → {state} | Reason: {comment}
   ```
   inserted with `ignore_permissions=True`.
6. `frappe.db.commit()` and return a success payload including `from_state`, `to_state`, `put_back_by` (the supplied `username`), and `session_user`.

All failures are caught, logged via `frappe.log_error`, and returned as `{"status": "error", "message": ...}` rather than raising.

---

## ⚠️ Guest-accessible test endpoints

`get_put_back_document_states_test` and `set_put_back_workflow_state_test` are thin wrappers marked `allow_guest=True`, explicitly commented `"TESTING ONLY ... Remove before production."`

- `set_put_back_workflow_state_test` inherits the full bypass described above (direct DB write, no role check) **and** requires no authentication — any unauthenticated caller can revert the workflow state of *any* document in the system.
- If this file is deployed as-is, these two endpoints are a live privilege-escalation / data-integrity risk, not just a hypothetical one — they should be removed (or gated behind a non-production feature flag) before this reaches a production site.

---

## Audit trail caveat

Auditability here depends entirely on the caller supplying an honest `username`. Nothing in `set_put_back_workflow_state` verifies that `username` corresponds to the actual person acting — it's a free-text argument, cross-checked only against `frappe.session.user` for the log entry, not validated as the same identity. A malicious or misconfigured caller could attribute a put-back to any username string.
