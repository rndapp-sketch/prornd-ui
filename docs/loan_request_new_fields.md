# Loan Request — New Fields & MinIO Attachment

## Overview

Two new fields added to the Loan Request DocType:
- `comments_if_any` — Text field for comments
- `additional_attachment` — Attach field, uploaded to MinIO at `Project_Registration/{project_number}/Loan/`

---

## File 1 — `src/pages/application/LoanRequestForm.tsx`

Find `GROUP_D_FIELDS` and add the two new fields:

```ts
// BEFORE
const GROUP_D_FIELDS = new Set([
    'loan_agreements_section', 'agreement_no_1', 'agreement_no_2',
    'section_break_fqlm', 'witness_attachment',
]);

// AFTER
const GROUP_D_FIELDS = new Set([
    'loan_agreements_section', 'agreement_no_1', 'agreement_no_2',
    'section_break_fqlm', 'witness_attachment',
    'comments_if_any', 'additional_attachment',
]);
```

---

## File 2 — `src/pages/application/LoanRequestDetails.tsx`

Same change — find `GROUP_D_FIELDS` and add the two new fields:

```ts
// BEFORE
const GROUP_D_FIELDS = new Set([
    'loan_agreements_section', 'agreement_no_1', 'agreement_no_2',
    'section_break_fqlm', 'witness_attachment',
]);

// AFTER
const GROUP_D_FIELDS = new Set([
    'loan_agreements_section', 'agreement_no_1', 'agreement_no_2',
    'section_break_fqlm', 'witness_attachment',
    'comments_if_any', 'additional_attachment',
]);
```

---

## File 3 — `rndopsapp/doctype/loan_request/loan_request.py` — `save_loan_request` function

### Step 1 — Add `comments_if_any` to scalar fields list

```python
scalar_fields = [
    ...existing fields...,
    "agreement_no_1",
    "agreement_no_2",
    "comments_if_any",   # <-- ADD THIS
]
```

### Step 2 — Detect `additional_attachment` pending file

Place this block immediately after the existing `witness_attachment` detection block, before the child table section:

```python
# additional_attachment — uploaded to Project_Registration/{project_number}/Loan/
_pending_additional_file = None
additional_value = data.get("additional_attachment")
if additional_value:
    if isinstance(additional_value, dict) and additional_value.get("file_data"):
        _pending_additional_file = additional_value
    elif isinstance(additional_value, str):
        doc.set("additional_attachment", additional_value)
```

### Step 3 — Upload to MinIO after doc insert/save

Place this block immediately after the existing `witness_attachment` MinIO upload block, before `frappe.db.commit()`:

```python
# Upload additional_attachment to Project_Registration/{project_number}/Loan/
additional_url = None
if _pending_additional_file:
    import base64
    from rndopsapp.minio import get_rnd_file_service
    try:
        file_name = _pending_additional_file.get("file_name", "attachment")
        file_data_str = _pending_additional_file.get("file_data", "")
        if "," in file_data_str:
            file_data_str = file_data_str.split(",", 1)[1]
        content = base64.b64decode(file_data_str)

        project_number = doc.get("project_number") or "unknown"
        file_service = get_rnd_file_service()
        # Path: Project_Registration/{project_number}/Loan/{filename}
        path = f"Project_Registration/{project_number}/Loan/{file_name}"
        mime = file_service._mime(file_name)
        file_service.storage.upload(path, content, mime)
        additional_url = f"/rnd-files/{path}"
        frappe.db.set_value("Loan Request", doc.name, "additional_attachment", additional_url)
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Loan Request Additional Attachment Upload Error")
```

### Step 4 — Add to return dict

```python
# BEFORE
return {
    "status": "success",
    "docname": doc.name,
    "loan_amount": doc.loan_amount,
    "witness_attachment": witness_url or doc.get("witness_attachment"),
}

# AFTER
return {
    "status": "success",
    "docname": doc.name,
    "loan_amount": doc.loan_amount,
    "witness_attachment": witness_url or doc.get("witness_attachment"),
    "additional_attachment": additional_url or doc.get("additional_attachment"),
}
```

---

## End-to-End Flow

```
User fills Loan Request form → selects file for additional_attachment
         ↓
Frontend (prepareFormDataForApi) converts File → { file_name, file_data: "data:...;base64,..." }
         ↓
Sent to save_loan_request as part of doc_data JSON
         ↓
Backend detects dict with file_data → stores as _pending_additional_file
         ↓
Doc inserted/saved first (gets docname and project_number)
         ↓
Base64 decoded → uploaded to MinIO:
  path = Project_Registration/{project_number}/Loan/{filename}
  e.g. Project_Registration/2026041101ANRF000152/Loan/agreement.pdf
         ↓
URL saved to additional_attachment field on the doc
         ↓
Details page loads doc → DynamicFormRenderer shows clickable download link
```

---

## Prerequisites on Production Server

1. Fields `comments_if_any` and `additional_attachment` must exist in the **Loan Request DocType** in Frappe (add via DocType editor or fixture)
2. Run `bench migrate` after adding fields
3. MinIO path is created automatically on upload — no pre-creation needed
