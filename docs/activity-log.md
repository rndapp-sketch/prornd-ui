# Activity Log — how it works across modules

How a document's timeline is produced, who writes to it, and where it is
rendered. Applies to every workflow doctype, not one module.

## 1. The store is `Comment`, always

There is no bespoke timeline table. Everything a user sees comes from Frappe's
`tabComment`, filtered by `reference_doctype` + `reference_name`.

This is deliberate and predates this work — see `put-back-action.md`: Frappe's
own "Activity" tab reads `docinfo.workflow_logs`, which is built from `Comment`
rows with `comment_type: "Workflow"`. Writing an `Activity Log` doctype record
instead would be invisible in the UI, so the audit trail *has* to be a `Comment`.

`Staff Activity Log` (written by `activity_logger.log_workflow_transition`) is a
separate thing — analytics for the staff leaderboard (time-in-queue, action
counts). It never feeds the timeline.

## 2. Who writes comments

| Writer | `comment_type` | Content |
|---|---|---|
| Frappe core, on a workflow save | `Workflow` | the new state, e.g. `Pending Head Approval` |
| `workflow_pipeline.WorkflowManager.perform_action` | `Info` | `Forward: Pending HoS Approval → Pending Associate Dean` |
| `activity_logger.record_workflow_action_comment` | `Comment` | **the note the approver typed in the action dialog** |
| `api.add_project_comment` | `Comment` | a free-standing comment typed into the activity box |
| put-back endpoints (`put_back_action`, per-module `put_back`) | `Workflow` | `[Put Back] {user}: {prev} → {state} \| Reason: {comment}` |
| `cancellation_api` | `Info` | cancellation requested / head-approval bypassed / cancelled |
| Frappe core | `Attachment`, `Edit`, `Like`, … | as usual |

### The approver's typed comment

The action dialogs (`CommentModal`) collect an optional note and post it as
`comment` alongside the workflow action. **Almost no `perform_*_action`
endpoint declares that parameter** — signatures are `(docname, action)` or
`(docname, action, extra_data=None)` — and Frappe filters incoming kwargs down
to a whitelisted method's signature, so the text was silently dropped.

It is captured centrally instead, in
`activity_logger.record_workflow_action_comment`, registered on the global
`doc_events["*"]` hook. It reads the note off `frappe.form_dict` (where it still
is, regardless of the signature), and only acts when the document's
`workflow_state` actually changed in that save. One comment per document per
request, since a single action can save more than once.

> **It must be registered on `on_update`, `on_update_after_submit` *and*
> `on_submit`.** Most workflow documents are submitted (`docstatus = 1`), and
> `doc.save()` on a submitted document fires **`on_update_after_submit`, not
> `on_update`** — which is exactly where most transitions happen. Registered on
> `on_update` alone, the hook fires only for the incidental `Version`/`Comment`
> rows the save creates, never for the document itself.

Doing it on the hook means it works for **all 30-odd modules** without editing
each signature. Several pages used to work around the drop by calling
`add_project_comment` from the frontend after the action returned; those were
removed, since they now double-post.

**Put-backs are not covered by the hook, by design.** Every put-back path uses
`frappe.db.set_value(...)` to bypass the workflow role check, which does not
fire `on_update`. They already write their own comment with the reason inline.

## 3. Read APIs

| Endpoint | Returns | Used by |
|---|---|---|
| `api.get_document_activity(doctype, docname)` | typed, labelled, chronologically sorted timeline | `<ActivityLog>` widget, print PDFs |
| `api.get_project_activity(doctype, docname)` | raw `Comment` rows | `<ActivityStream>` widget |
| `api.get_user_designation(email)` | designation for a commenter | print PDFs (bypasses restricted `User` read) |

`get_document_activity` maps `comment_type` → a UI `type` + human label:

| `comment_type` | `type` | label | carries content |
|---|---|---|---|
| `Comment` | `comment` | commented | ✅ |
| `Workflow` | `workflow` | updated the workflow | ✅ |
| `Info` | `info` | recorded | ✅ |
| `Edit`, `Label` | `edit` | edited this | ❌ |
| `Assigned` … | `assignment` | was assigned | ✅ |
| `Attachment` … | `attachment` | added an attachment | ✅ |
| `Shared` … | `share` | shared this | ✅ (filtered out client-side) |

It also appends a synthetic `creation` row, and a Version-derived
`last edited this` row when `track_changes` is on and no `Edit` comment covers it.

> `Info` used to map to `("edit", "edited this")`, and content was only attached
> for `comment`/`workflow`/`assignment`/`share`/`attachment`. Every `Info` entry
> — the whole cancellation audit trail, and every `WorkflowManager` transition —
> therefore rendered as a contentless "edited this". It now has its own `info`
> type and keeps its text.

### Cancellation Requests

A cancellation runs on a **separate `Cancellation Request` document**, so its
approvals and comments are invisible from the form being cancelled.
`get_document_activity` merges the linked request's comments in as `type:
"cancellation"`, labelled with the request ID.

These are **on-screen only** — `fetchActivityLogHtml` filters them out, because
they belong to a different document and printed copies should show only the
approval trail of the form itself.

## 4. Renderers

| Component | Source | Notes |
|---|---|---|
| `ActivityLog.tsx` | `get_document_activity` | Icon/colour per `type` via `typeConfig`; unknown types fall back to a neutral style. Module-level cache keyed `doctype::docname` — use the refresh button, or `clearActivityLogCache()`, to bust it. |
| `ActivityStream.tsx` | `get_project_activity` | Comment box + list; `commentsOnly` filters to `comment_type === "Comment"`. |
| `FloatingActivityLogButton.tsx` | wraps the above | bottom-right launcher |
| `utils/fetchActivityLogHtml.ts` | `get_document_activity` | Printed table (Approver Name & Designation — Comment — Time), oldest first. Excludes `Administrator` rows and `cancellation` rows. Prints `entry.content` when present, else the label; `created this` is overridden to **Submitted** (print-only, via `LABEL_OVERRIDES`). |

## 5. Gotchas

- **Content is rendered with `dangerouslySetInnerHTML`.** Anything written into a
  comment from user input must be escaped first — `record_workflow_action_comment`
  uses `escape_html`, `add_project_comment` uses `sanitize_html`.
- **`get_document_activity` permission-checks; `get_project_activity` does not.**
- **Designation lookups need `get_user_designation`.** `User` read is restricted
  to `System Manager` / `Permanent Employee`, so a direct `frappe.client` call
  403s for other approver roles and silently leaves the column blank.
- **The `ActivityLog` cache is module-level**, so new rows will not appear on
  navigation alone.
- **`log_workflow_transition` is still registered on `on_update` only**, so
  `Staff Activity Log` — the staff-leaderboard analytics table — misses every
  transition on a submitted document, which is most of them. Left as-is here
  because fixing it changes historical leaderboard metrics; see the note in
  §2 for why the same registration matters.
