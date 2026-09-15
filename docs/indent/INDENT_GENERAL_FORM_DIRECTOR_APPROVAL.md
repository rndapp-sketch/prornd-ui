# Indent General Form — Workflow & API Reference

**DocType:** `Indent General Form`  
**Module:** `rndopsapp`  
**File:** `rndopsapp/rndopsapp/doctype/indent_general_form/indent_general_form.py`

---

## Workflow States

| State | allow_edit Role | Description |
|---|---|---|
| Draft | All_ProRnd_User | Initial state, editable by the requestor |
| Pending PI Approval | Permanent Employee | Awaiting PI sign-off |
| Pending Other PI | Other PI | Awaiting co-PI sign-off |
| Pending Mentor Approval | Mentor | Awaiting mentor sign-off |
| Pending HoD Approval | HoD (Head of Department) | Awaiting Head of Department |
| Pending Staff Approval | staff, RnD | RnD Staff review |
| Pending HoS Approval | Hos, RnD (Head of Section, RnD) | Head of Section review |
| Pending Associate Dean | Associate Dean, RND | Associate Dean review |
| Pending Dean Approval | Dean, RnD | Dean review — **routing gate** |
| **Pending Director Approval** | **Dean, RnD** | Director hardcopy / PDF gate |
| Approved | staff, RnD | Final approved state |
| Rejected | Administrator | Rejected |

---

## Director Approval Routing

### Automatic (amount-based)

When the Dean performs **Approve** from `Pending Dean Approval`, the system evaluates:

| Account Head | Threshold | Next State |
|---|---|---|
| Equipments | `igf_total_estimate > ₹10,00,000` | Pending Director Approval |
| Consumable | `igf_total_estimate > ₹3,00,000` | Pending Director Approval |
| Any other / below threshold | — | Approved *(normal flow)* |

Implemented in `_resolve_igf_next_state()`.

### Manual (Dean override)

The Dean can also explicitly send any IGF to Director Approval from `Pending Dean Approval` by calling `update_send_to_director_igf`, regardless of amount.

### PDF Gate

Once in `Pending Director Approval`, the Dean's **Approve** action is **blocked** until Staff has attached the Director-signed PDF via `attach_director_pdf_igf`.

---

## Workflow Fields

| Fieldname | Type | Hidden | Description |
|---|---|---|---|
| `send_to_director` | Check | Yes | Flag set when doc enters Director Approval flow |
| `director_signed_pdf` | Data | Yes | URL of the Director-signed PDF uploaded by Staff |

---

## Put-Back Engine

Roles can return a document to a previous state without requiring explicit Frappe Workflow Transition rows. Configured via `PUT_BACK_RULES`.

### PUT_BACK_TARGETS

| Key | Returns To |
|---|---|
| `Requestor` | Draft |
| `Staff` | Pending Staff Approval |
| `HoS` | Pending HoS Approval |

### PUT_BACK_RULES

| Current State | Role Required | Reachable Targets |
|---|---|---|
| Pending Staff Approval | staff, RnD | Requestor |
| Pending HoS Approval | Hos, RnD (Head of Section, RnD) | Staff, Requestor |
| Pending Dean Approval | Dean, RnD | HoS, Staff, Requestor |
| Pending Director Approval | Dean, RnD | HoS, Staff, Requestor |

---

## API Reference

All functions are decorated with `@frappe.whitelist()` unless noted.

---

### `get_indent_general_form_fields(doc_name=None)`

Returns field metadata, prefill data, and enabled client scripts for the IGF form.

**Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `doc_name` | string | No | If provided, returns the document's current values as `prefill_data` |

**Response**

```json
{
  "fields": [ { "fieldname": "...", "label": "...", "fieldtype": "...", ... } ],
  "prefill_data": { "igf_project_title": "...", "workflow_state": "...", ... },
  "link_options": {},
  "client_scripts": [ { "name": "...", "script": "...", "view": "..." } ]
}
```

---

### `save_indent_general_form_data(data, files=None, file=None)`

Creates or updates an IGF document and uploads attached files to MinIO.

**Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `data` | JSON string / dict | Yes | Field values. Include `"name"` to update an existing doc |
| `files` | JSON list | No | List of `{ file_name, file_data (base64), field_name }` objects |
| `file` | JSON object | No | Legacy single-file upload (same shape as one item in `files`) |

**MinIO path:** `Indent_General_Form/{docname}/files/{filename}`

**Response (success)**

```json
{
  "status": "success",
  "docname": "IGF-20250101120001",
  "file_urls": [ { "field_name": "igf_upload_detailed_specification", "file_url": "..." } ]
}
```

**Response (partial failure)**

```json
{
  "status": "success",
  "docname": "IGF-...",
  "file_urls": [...],
  "failed_files": ["spec.pdf"]
}
```

**Response (error)**

```json
{ "status": "error", "message": "..." }
```

---

### `get_indent_general_form_workflow_actions(docname)`

Returns the list of workflow actions the current user can perform on a document based on its current state and the user's roles.

**Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `docname` | string | Yes | IGF document name |

**Response**

```json
{
  "actions": ["Approve", "Reject"],
  "current_state": "Pending Dean Approval"
}
```

---

### `perform_indent_general_form_action(docname, action)`

Executes a workflow action and advances the document's `workflow_state`.

**Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `docname` | string | Yes | IGF document name |
| `action` | string | Yes | Action name e.g. `"Approve"`, `"Reject"`, `"Submit"`, `"Forward"` |

**Special behaviour**

- **Director-PDF gate:** If `action == "Approve"` and `current_state == "Pending Director Approval"` and `director_signed_pdf` is empty → throws `400`.
- **Automatic routing:** If `action == "Approve"` and `current_state == "Pending Dean Approval"` → delegates to `_resolve_igf_next_state()` before consulting the workflow transition table.

**Response (success)**

```json
{ "status": "success", "next_state": "Approved" }
```

**Throws** on invalid action, missing workflow, or gate check failure.

---

### `_resolve_igf_next_state(doc, current_state, action, wf)` *(internal)*

Resolves the next workflow state with custom routing logic.

**Routing logic (Pending Dean Approval + Approve only)**

```
if account_head == "Equipments" and total > 1,000,000:
    → "Pending Director Approval"
elif account_head == "Consumable" and total > 300,000:
    → "Pending Director Approval"
else:
    → first matching transition from workflow doc
```

For all other `(state, action)` combinations, returns the first matching transition row from the Frappe Workflow document.

---

### `get_available_back_actions(docname)`

Returns the put-back targets the current user can reach from the document's current state.

**Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `docname` | string | Yes | IGF document name |

**Response**

```json
{
  "actions": [
    { "target": "HoS", "label": "Put Back to HoS", "next_state": "Pending HoS Approval" },
    { "target": "Staff", "label": "Put Back to Staff", "next_state": "Pending Staff Approval" }
  ],
  "current_state": "Pending Dean Approval"
}
```

Returns `{ "actions": [] }` if the user lacks the required role or no rules exist for the current state.

---

### `put_back(docname, target)`

Applies a put-back transition, bypassing the Frappe Workflow Transition table validator (intentional — avoids duplicate transition rows).

**Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `docname` | string | Yes | IGF document name |
| `target` | string | Yes | One of: `"Requestor"`, `"Staff"`, `"HoS"` |

**Validations**

1. `target` must exist in `PUT_BACK_TARGETS`.
2. Current state must have a rule in `PUT_BACK_RULES`.
3. `target` must be listed in the rule's `targets`.
4. User must have the role specified by the rule (or be Administrator).

**Side effect:** Inserts a `Workflow` type Comment on the document for audit trail.

**Response**

```json
{ "status": "success", "from": "Pending Dean Approval", "to": "Pending HoS Approval", "target": "HoS" }
```

---

## Director Hardcopy / PDF Flow

Mirrors the Selection Committee Report Director flow. The Dean can flag an IGF for Director physical approval; Staff then uploads the signed scan; Dean's final Approve is gated on that upload.

### Flow Diagram

```
Pending Dean Approval
        │
        ├─ [Automatic: Equipments > 10L or Consumable > 3L]
        │         └──→ Pending Director Approval
        │
        └─ [Manual: Dean calls update_send_to_director_igf]
                  └──→ Pending Director Approval
                              │
                  Staff calls attach_director_pdf_igf
                  (director_signed_pdf is set)
                              │
                  Dean calls Approve
                  (gate passes — PDF present)
                              │
                           Approved
```

---

### `update_send_to_director_igf(docname, send_to_director)`

Dean manually opts an IGF into the Director-hardcopy flow.

**Permissions:** `Dean, RnD` or `System Manager`

**Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `docname` | string | Yes | IGF document name |
| `send_to_director` | int / bool | Yes | Must be `1` (flag is one-way — cannot be cleared) |

**Behaviour**

- Allowed only when `workflow_state` is `Pending Dean Approval` or `Pending Director Approval`.
- If `send_to_director` is already `1`, returns success immediately (idempotent).
- Sets `send_to_director = 1` and `workflow_state = "Pending Director Approval"` in a single `db.set_value` call.

**Response**

```json
{ "status": "success", "docname": "IGF-...", "send_to_director": 1 }
```

**Throws** `PermissionError` if the user lacks the required role, or `ValidationError` if the state is wrong or `send_to_director` is `0`.

---

### `attach_director_pdf_igf(docname, file_url)`

Staff binds an already-uploaded file URL to `director_signed_pdf`. Replacing an existing PDF is allowed.

**Permissions:** `staff, RnD` or `System Manager`

**Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `docname` | string | Yes | IGF document name |
| `file_url` | string | Yes | URL of the uploaded PDF (e.g. from MinIO) |

**Behaviour**

- Only allowed when `workflow_state == "Pending Director Approval"`.
- Uses `db.set_value` (no full doc save) to avoid triggering unrelated validators.

**Response**

```json
{ "status": "success", "docname": "IGF-...", "director_signed_pdf": "https://..." }
```

**Throws** `PermissionError` or `ValidationError` on invalid state / missing URL.

---

### `get_pending_director_uploads_igf()`

Returns all IGF documents currently in `Pending Director Approval` so Staff can see what needs a signed PDF upload.

**Permissions:** Any authenticated user (whitelist only — no additional role check).

**Response**

```json
{
  "status": "success",
  "data": [
    {
      "name": "IGF-20260601120001",
      "igf_project_title": "Project Alpha",
      "igf_project_code": "IIT/2025/001",
      "igf_account_head": "Equipments",
      "igf_total_estimate": 1500000,
      "igf_indenter": "Dr. Jane Doe",
      "director_signed_pdf": null,
      "send_to_director": 1,
      "modified": "2026-07-01 10:30:00",
      "workflow_state": "Pending Director Approval"
    }
  ]
}
```

`director_signed_pdf` is `null` for docs still awaiting upload, or a URL string for docs where the PDF has already been attached.

---

## Workflow Transition Table (Frappe DB)

The patch `rndopsapp.patchs.add_igf_director_approval_state` adds these rows to the live workflow document:

| From State | Action | Next State | Allowed Role |
|---|---|---|---|
| Pending Director Approval | Approve | Approved | Dean, RnD |
| Pending Director Approval | Reject | Rejected | Dean, RnD |

> The routing **into** `Pending Director Approval` (from `Pending Dean Approval`) is handled entirely in Python by `_resolve_igf_next_state` and `update_send_to_director_igf` — no additional workflow transition row is needed.

---

## Run Patch

```bash
# Apply schema change (new fields)
bench --site <site> migrate

# Add Pending Director Approval state to live IGF workflow
bench --site <site> execute rndopsapp.patchs.add_igf_director_approval_state.execute
```
