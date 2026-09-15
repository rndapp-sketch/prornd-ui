# Backend Implementation Spec — Deposit Slip Form (E, T, D Types)

## Overview

The frontend (`DepositSlipForm.tsx`) calls a set of Frappe whitelisted Python methods for each deposit slip type. This document defines the exact contract each method must satisfy for the three non-Research types:

| Slip Type | Frappe DocType | Key |
|---|---|---|
| E Non-Routine | `E Non Routine Deposit Slip` | `e_non_routine` |
| T Testing | `T Testing Deposit Slip` | `t_testing` |
| D Consultancy | `D Consultancy Deposit Slip` | `d_consultancy` |

---

## 1. Frontend–Backend API Contract

Every method in the table below must be decorated with `@frappe.whitelist()`.  
All methods accept JSON POST bodies and return `frappe.response["message"]`.

### Method registry (already wired in the frontend)

```
# E Non Routine
rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.get_e_non_routine_deposit_slip_fields
rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.save_e_non_routine_deposit_slip
rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.submit_e_non_routine_deposit_slip
rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.get_e_non_routine_deposit_slip_workflow_actions
rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.perform_e_non_routine_deposit_slip_workflow_action

# T Testing
rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.get_t_testing_deposit_slip_fields
rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.save_t_testing_deposit_slip
rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.submit_t_testing_deposit_slip
rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.get_t_testing_deposit_slip_workflow_actions
rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.perform_t_testing_deposit_slip_workflow_action

# D Consultancy
rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.get_d_consultancy_deposit_slip_fields
rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.save_d_consultancy_deposit_slip
rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.submit_d_consultancy_deposit_slip
rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.get_d_consultancy_deposit_slip_workflow_actions
rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.perform_d_consultancy_deposit_slip_workflow_action
```

---

## 2. `get_*_fields` — Form Metadata Method

### Request

```
POST /api/method/<method_path>
Content-Type: application/json

{ "doc_name": "<optional existing document name>" }
```

`doc_name` is present only when opening an existing saved document for editing.

### Response shape

```json
{
  "message": {
    "fields": [ ...field_definition_objects ],
    "link_options": {
      "<fieldname_or_doctype_key>": [
        { "value": "<doc name>", "label": "<display text>" }
      ]
    },
    "prefill_data": {
      "<fieldname>": "<value>"
    }
  }
}
```

- `prefill_data` should be `{}` (empty dict) when `doc_name` is not provided and there is no pre-fill context.  
- `prefill_data` should be populated with existing field values when `doc_name` is provided.
- The frontend seeds `autoFilledFields` from every key in `prefill_data`, rendering those fields as read-only.

### Field definition object shape

```json
{
  "fieldname": "project_title",
  "label": "Project Title",
  "fieldtype": "Link",
  "options": "Project Registration",
  "mandatory": 1,
  "read_only": 0,
  "hidden": 0,
  "depends_on": null,
  "default": null,
  "description": null
}
```

Return fields **in the order they should appear** in the form. Section Break fields group the form visually. Column Break and hidden fields are ignored by the renderer.

### Critical: `link_options` keys

The frontend resolves dropdown options for a `Link` field using `linkOptions[field.fieldname]`.  
The backend **must** return options under the same key as the field's `fieldname`, **not** the doctype name.

```python
# ✅ correct — key matches fieldname
link_options["project_title"] = [{"value": "PROJ-001", "label": "My Project"}]

# ❌ wrong — key is the doctype name, frontend won't find it
link_options["Project Registration"] = [...]
```

**Required `link_options` keys per type:**

| Type | Required keys |
|---|---|
| E Non-Routine | `project_title`, `principal_investigator` |
| T Testing | `project_title`, `principal_investigator` |
| D Consultancy | `principal_consultant`, `funding_agency` |

> The frontend also independently fetches `User` options on load and assigns them to `principal_investigator`. However, returning them from the backend is preferred to avoid an extra round-trip.

---

## 3. Auto-fill Contract — Project Registration DocType

For **E** and **T** types, when the user selects a project from the `project_title` dropdown, the frontend calls:

```
POST /api/method/frappe.client.get
{ "doctype": "Project Registration", "name": "<selected project name>" }
```

It then maps the returned document's fields to form fields using this table:

| Project Registration field | Filled into form field |
|---|---|
| `principal_investigator` | `principal_investigator` |
| `pi` | `principal_investigator` |
| `pi_name` | `principal_investigator` |
| `funding_agency` | `funding_agency` |
| `funding_agen` | `funding_agency` |
| `client` | `client` |
| `client_name` | `client` |
| `gstin_of_funding_agency` | `gstin_of_funding_agency` |
| `gstin` | `gstin_of_funding_agency` |

**The Project Registration DocType must expose at least these fields** (either as actual fieldnames or via one of the aliases above) so that selecting a project populates PI, Client, Funding Agency, and GSTIN automatically.

> **D Consultancy** has no `project_title` Link field — auto-fill from Project Registration does **not** apply. All fields are manually entered.

---

## 4. `get_*_fields` — Implementation Guide per Type

### 4.1 E Non-Routine Deposit Slip

```python
import frappe

@frappe.whitelist()
def get_e_non_routine_deposit_slip_fields(doc_name=None):
    fields = [
        # --- Primary Details ---
        {"fieldname": "project_title",            "label": "Project Title",              "fieldtype": "Link",     "options": "Project Registration", "mandatory": 1, "read_only": 0, "hidden": 0},
        {"fieldname": "principal_investigator",   "label": "Principal Investigator",     "fieldtype": "Link",     "options": "User",                 "mandatory": 1, "read_only": 0, "hidden": 0},
        {"fieldname": "client",                   "label": "Client",                     "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "funding_agency",           "label": "Funding Agency",             "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "gstin_of_funding_agency",  "label": "GSTIN of Funding Agency",    "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "ecs_ac_no",                "label": "ECS A/C No.",                "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "bank",                     "label": "Bank",                       "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        # --- Calculations ---
        {"fieldname": "calculations_section",     "label": "Calculations",               "fieldtype": "Section Break"},
        {"fieldname": "amount_inclusive_of_gst",  "label": "Amount Inclusive of GST",    "fieldtype": "Currency", "mandatory": 1, "read_only": 0, "hidden": 0},
        {"fieldname": "igst_18",                  "label": "IGST @18%",                  "fieldtype": "Currency", "mandatory": 0, "read_only": 1, "hidden": 0},
        {"fieldname": "consultancy_fee_x",        "label": "Consultancy Fee X",          "fieldtype": "Currency", "mandatory": 0, "read_only": 1, "hidden": 0, "description": "Consultancy Fee (After GST Deduction)"},
        {"fieldname": "overhead_multiplier",      "label": "Overhead Multiplier",        "fieldtype": "Float",    "default": 0.1, "read_only": 0, "hidden": 1},
        {"fieldname": "overhead_label",           "label": "Overhead Label",             "fieldtype": "HTML",     "hidden": 0},
        {"fieldname": "overhead_amount",          "label": "Overhead Amount",            "fieldtype": "Currency", "read_only": 1, "hidden": 0},
        # --- Credit Distribution ---
        {"fieldname": "credit_distribution_section", "label": "Credit Distribution",     "fieldtype": "Section Break"},
        {"fieldname": "credit_distribution",      "label": "Credit as follows",          "fieldtype": "Table",    "options": "Deposit Slip Credit Distribution"},
        {"fieldname": "additional_project_credits","label": "Additional Credits",        "fieldtype": "Table",    "options": "Deposit Slip Project Credit"},
        # --- Totals ---
        {"fieldname": "totals_section",           "label": "Totals",                     "fieldtype": "Section Break"},
        {"fieldname": "total_gst",                "label": "Total GST",                  "fieldtype": "Currency", "read_only": 0, "hidden": 0},
        {"fieldname": "total_budget",             "label": "Total Budget",               "fieldtype": "Currency", "read_only": 1, "hidden": 0},
    ]

    # Populate link options
    projects = frappe.get_list("Project Registration", fields=["name", "project_title"], limit_page_length=0)
    project_opts = [{"value": p.name, "label": p.project_title or p.name} for p in projects]

    users = frappe.get_list("User", fields=["name", "full_name"], limit_page_length=0,
                             filters=[["enabled", "=", 1]])
    user_opts = [{"value": u.name, "label": u.full_name or u.name} for u in users]

    link_options = {
        "project_title": project_opts,
        "principal_investigator": user_opts,
    }

    prefill_data = {}
    if doc_name:
        doc = frappe.get_doc("E Non Routine Deposit Slip", doc_name)
        for f in fields:
            fn = f.get("fieldname")
            if fn and f.get("fieldtype") not in ("Section Break", "Column Break", "Table", "HTML"):
                val = doc.get(fn)
                if val is not None:
                    prefill_data[fn] = val

    frappe.response["message"] = {
        "fields": fields,
        "link_options": link_options,
        "prefill_data": prefill_data,
    }
```

---

### 4.2 T Testing Deposit Slip

```python
import frappe

@frappe.whitelist()
def get_t_testing_deposit_slip_fields(doc_name=None):
    fields = [
        # --- Primary Details ---
        {"fieldname": "project_title",            "label": "Project Title",              "fieldtype": "Link",     "options": "Project Registration", "mandatory": 1, "read_only": 0, "hidden": 0},
        {"fieldname": "principal_investigator",   "label": "Principal Investigator",     "fieldtype": "Link",     "options": "User",                 "mandatory": 1, "read_only": 0, "hidden": 0},
        {"fieldname": "client",                   "label": "Client",                     "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        # Note: gstin_of_funding_agency is labelled "Funding Agency" in this doctype
        {"fieldname": "gstin_of_funding_agency",  "label": "Funding Agency",             "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "ecs_ac_no",                "label": "ECS A/C No.",                "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "bank",                     "label": "Bank",                       "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        # --- Calculations ---
        {"fieldname": "calculations_section",     "label": "Calculations",               "fieldtype": "Section Break"},
        {"fieldname": "amount_inclusive_of_gst",  "label": "Amount Inclusive of GST",    "fieldtype": "Currency", "mandatory": 1, "read_only": 0, "hidden": 0},
        {"fieldname": "cgst_9",                   "label": "CGST @9%",                   "fieldtype": "Currency", "read_only": 1, "hidden": 0},
        {"fieldname": "sgst_9",                   "label": "SGST @9%",                   "fieldtype": "Currency", "read_only": 1, "hidden": 0},
        {"fieldname": "consultancy_fee_x",        "label": "Consultancy Fee X",          "fieldtype": "Currency", "read_only": 1, "hidden": 0, "description": "Consultancy Fee (After GST Deduction)"},
        {"fieldname": "overhead_multiplier",      "label": "Overhead Multiplier",        "fieldtype": "Float",    "default": 0.7, "read_only": 0, "hidden": 1},
        {"fieldname": "overhead_label",           "label": "Overhead Label",             "fieldtype": "HTML",     "hidden": 0},
        {"fieldname": "overhead_amount",          "label": "Overhead Amount",            "fieldtype": "Currency", "read_only": 1, "hidden": 0},
        # --- Credit Distribution ---
        {"fieldname": "credit_distribution_section", "label": "Credit Distribution",     "fieldtype": "Section Break"},
        {"fieldname": "idf_t_testing_fee",        "label": "(a.) IDF",                   "fieldtype": "Data",     "read_only": 1, "hidden": 0, "description": "(40% of the Consultancy fee)"},
        {"fieldname": "dpf_t_testing_fee",        "label": "(b.) DPF/CE",                "fieldtype": "Data",     "read_only": 1, "hidden": 0, "description": "(50% of the Consultancy fee)"},
        {"fieldname": "staff_welfare_t_testing_fund",  "label": "(c.) Staff Welfare fund",  "fieldtype": "Data", "read_only": 1, "hidden": 0, "description": "(5% of Overhead amount)"},
        {"fieldname": "student_welfare_t_testing_fund","label": "(d.) Student Welfare fund","fieldtype": "Data", "read_only": 1, "hidden": 0, "description": "(5% of Overhead amount)"},
        # --- Totals ---
        {"fieldname": "totals_section",           "label": "Totals",                     "fieldtype": "Section Break"},
        {"fieldname": "total_gst",                "label": "Total GST",                  "fieldtype": "Currency", "read_only": 0, "hidden": 0},
        {"fieldname": "total_budget",             "label": "Total Budget",               "fieldtype": "Currency", "read_only": 1, "hidden": 0},
    ]

    projects = frappe.get_list("Project Registration", fields=["name", "project_title"], limit_page_length=0)
    project_opts = [{"value": p.name, "label": p.project_title or p.name} for p in projects]

    users = frappe.get_list("User", fields=["name", "full_name"], limit_page_length=0,
                             filters=[["enabled", "=", 1]])
    user_opts = [{"value": u.name, "label": u.full_name or u.name} for u in users]

    link_options = {
        "project_title": project_opts,
        "principal_investigator": user_opts,
    }

    prefill_data = {}
    if doc_name:
        doc = frappe.get_doc("T Testing Deposit Slip", doc_name)
        for f in fields:
            fn = f.get("fieldname")
            if fn and f.get("fieldtype") not in ("Section Break", "Column Break", "Table", "HTML"):
                val = doc.get(fn)
                if val is not None:
                    prefill_data[fn] = val

    frappe.response["message"] = {
        "fields": fields,
        "link_options": link_options,
        "prefill_data": prefill_data,
    }
```

---

### 4.3 D Consultancy Deposit Slip

> D Consultancy has **no** project Link field. There is no `project_title → Project Registration` trigger for auto-fill. All fields are manually entered by the user.

```python
import frappe

@frappe.whitelist()
def get_d_consultancy_deposit_slip_fields(doc_name=None):
    fields = [
        # --- Primary Details ---
        {"fieldname": "primary_details",          "label": "Primary Details",            "fieldtype": "Section Break"},
        {"fieldname": "consultancy_title",        "label": "Consultancy Title",          "fieldtype": "Data",     "mandatory": 1, "read_only": 0, "hidden": 0},
        {"fieldname": "category_d",               "label": "Category",                   "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "principal_consultant",     "label": "Principal Consultant",       "fieldtype": "Link",     "options": "User", "mandatory": 1, "read_only": 0, "hidden": 0},
        {"fieldname": "client",                   "label": "Client",                     "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "funding_agency",           "label": "Funding Agency",             "fieldtype": "Link",     "options": "fundingagency_", "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "gstin_of_funding_agency",  "label": "GSTIN of Funding Agency",    "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "iitg_invoice_no",          "label": "IITG Invoice No.",           "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "bank",                     "label": "Bank",                       "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "ecs_ac_no",                "label": "ECS A/C No.",                "fieldtype": "Data",     "mandatory": 0, "read_only": 0, "hidden": 0},
        # --- GST & Fee Calculations ---
        {"fieldname": "section_break_mqkq",       "label": "GST and Fee Calculations",   "fieldtype": "Section Break"},
        {"fieldname": "amount_inclusive_of_gst",  "label": "Amount Inclusive of GST",    "fieldtype": "Currency", "mandatory": 1, "read_only": 0, "hidden": 0},
        {"fieldname": "igst_18_on_consultancy",   "label": "IGST @18% on Consultancy Fee","fieldtype": "Currency","read_only": 1, "hidden": 0},
        {"fieldname": "amount_after_gst_tds",     "label": "Amount after GST TDS @ 2%",  "fieldtype": "Currency", "read_only": 1, "hidden": 0},
        {"fieldname": "total_cost_x",             "label": "Total Cost X",               "fieldtype": "Currency", "read_only": 1, "hidden": 0, "description": "Total Cost X (Balance after GST Deduction)"},
        {"fieldname": "consultancy_charge_y",     "label": "Consultancy Charge (Y)",     "fieldtype": "Currency", "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "operational_charge_z",     "label": "Operational Charge (Z)",     "fieldtype": "Currency", "mandatory": 0, "read_only": 0, "hidden": 0},
        {"fieldname": "overhead_from_y_amount",   "label": "Overhead from Y (10% * Y)",  "fieldtype": "Currency", "read_only": 1, "hidden": 0},
        {"fieldname": "overhead_from_z_amount",   "label": "Overhead from Z (10% * Z)",  "fieldtype": "Currency", "read_only": 1, "hidden": 0},
        {"fieldname": "total_overhead_amount",    "label": "Total Overhead",             "fieldtype": "Currency", "read_only": 1, "hidden": 0},
        {"fieldname": "institute_share_amount",   "label": "Institute Share (20% * Y)",  "fieldtype": "Currency", "read_only": 1, "hidden": 0},
        {"fieldname": "total_overhead_institute_share","label": "Overhead + Institute Share","fieldtype": "Currency","read_only": 1,"hidden": 0},
        # --- Credit Distribution ---
        {"fieldname": "credit_distribution_section","label": "Credit Distribution",      "fieldtype": "Section Break"},
        {"fieldname": "idf_amount",               "label": "IDF",                        "fieldtype": "Currency", "read_only": 1, "hidden": 0, "description": "(40% of Overhead + Institute Share)"},
        {"fieldname": "dpf_amount",               "label": "DPF/CE",                     "fieldtype": "Currency", "read_only": 1, "hidden": 0, "description": "(50% of Overhead + Institute Share)"},
        {"fieldname": "staff_welfare_amount",     "label": "Staff Welfare Amount",       "fieldtype": "Currency", "read_only": 1, "hidden": 0, "description": "(5% of Overhead + Institute Share)"},
        {"fieldname": "student_welfare_amount",   "label": "Student Welfare Amount",     "fieldtype": "Currency", "read_only": 1, "hidden": 0, "description": "(5% of Overhead + Institute Share)"},
        # --- Final Totals ---
        {"fieldname": "final_totals",             "label": "Final Totals",               "fieldtype": "Section Break"},
        {"fieldname": "balance_consultancy_fee",  "label": "Balance Consultancy Fee",    "fieldtype": "Currency", "read_only": 1, "hidden": 0},
        {"fieldname": "balance_operation_charge", "label": "Balance Operation Charge",   "fieldtype": "Currency", "read_only": 1, "hidden": 0},
        {"fieldname": "total_gst",                "label": "Total GST",                  "fieldtype": "Currency", "read_only": 0, "hidden": 0},
        {"fieldname": "total_amount",             "label": "Total Amount",               "fieldtype": "Currency", "read_only": 1, "hidden": 0},
    ]

    users = frappe.get_list("User", fields=["name", "full_name"], limit_page_length=0,
                             filters=[["enabled", "=", 1]])
    user_opts = [{"value": u.name, "label": u.full_name or u.name} for u in users]

    funding_agencies = frappe.get_list("fundingagency_", fields=["name"], limit_page_length=0)
    fa_opts = [{"value": fa.name, "label": fa.name} for fa in funding_agencies]

    link_options = {
        "principal_consultant": user_opts,
        "funding_agency": fa_opts,
    }

    prefill_data = {}
    if doc_name:
        doc = frappe.get_doc("D Consultancy Deposit Slip", doc_name)
        for f in fields:
            fn = f.get("fieldname")
            if fn and f.get("fieldtype") not in ("Section Break", "Column Break", "Table", "HTML"):
                val = doc.get(fn)
                if val is not None:
                    prefill_data[fn] = val

    frappe.response["message"] = {
        "fields": fields,
        "link_options": link_options,
        "prefill_data": prefill_data,
    }
```

---

## 5. `save_*` — Save Draft

### Request

```
POST /api/method/<save_method>
Content-Type: application/json

{ "doc_data": "<JSON-encoded string of form values>" }
```

The `doc_data` string, when parsed, has this shape:

```json
{
  "project_title": "PROJ-001",
  "principal_investigator": "user@iitg.ac.in",
  "client": "DRDO",
  "funding_agency": "Ministry of Science",
  "gstin_of_funding_agency": "07AABCE1234F1Z5",
  "amount_inclusive_of_gst": 118000,
  "ecs_dates": [
    { "ecs_date": "2026-06-15", "amount": 118000, "remarks": "" }
  ],
  "credit_distribution": [
    { "label": "PI Share", "percentage": 60, "amount": 70800 }
  ],
  "pdf_credit_distribution": [],
  "dpf_credit_distributions": []
}
```

> The `ecs_dates`, `credit_distribution`, `pdf_credit_distribution`, and `dpf_credit_distributions` keys are always present (may be empty arrays).

### Implementation pattern

```python
import frappe, json

@frappe.whitelist()
def save_e_non_routine_deposit_slip(doc_data):
    data = json.loads(doc_data)

    doc = frappe.new_doc("E Non Routine Deposit Slip")

    # Scalar fields
    scalar_fields = [
        "project_title", "principal_investigator", "client",
        "funding_agency", "gstin_of_funding_agency", "ecs_ac_no", "bank",
        "amount_inclusive_of_gst", "igst_18", "consultancy_fee_x",
        "overhead_multiplier", "overhead_amount",
        "total_gst", "total_budget",
    ]
    for fieldname in scalar_fields:
        if fieldname in data:
            doc.set(fieldname, data[fieldname])

    # ECS Dates child table
    for row in data.get("ecs_dates", []):
        doc.append("ecs_dates", {
            "ecs_date": row.get("ecs_date"),
            "amount": row.get("amount", 0),
            "remarks": row.get("remarks", ""),
        })

    # Credit Distribution child table
    for row in data.get("credit_distribution", []):
        doc.append("credit_distribution", {
            "label": row.get("label", ""),
            "percentage": row.get("percentage", 0),
            "amount": row.get("amount", 0),
        })

    doc.insert(ignore_permissions=False)
    frappe.db.commit()

    frappe.response["message"] = {"name": doc.name, "status": "Saved"}
```

> Repeat the same pattern for `save_t_testing_deposit_slip` and `save_d_consultancy_deposit_slip`, replacing the doctype name and field list accordingly.

---

## 6. `submit_*` — Submit Document

```python
@frappe.whitelist()
def submit_e_non_routine_deposit_slip(doc_data):
    data = json.loads(doc_data)
    # Same as save, but call doc.submit() instead of doc.insert()
    # Or: save first, then submit by name
    name = data.get("name")
    if name:
        doc = frappe.get_doc("E Non Routine Deposit Slip", name)
    else:
        # create new
        doc = frappe.new_doc("E Non Routine Deposit Slip")
        # ... set fields ...
        doc.insert()

    doc.submit()
    frappe.db.commit()
    frappe.response["message"] = {"name": doc.name, "status": "Submitted"}
```

---

## 7. `get_*_workflow_actions` — Available Workflow Buttons

```python
@frappe.whitelist()
def get_e_non_routine_deposit_slip_workflow_actions(doc_name):
    doc = frappe.get_doc("E Non Routine Deposit Slip", doc_name)
    transitions = frappe.get_all(
        "Workflow Transition",
        filters={"parent": frappe.db.get_value("Workflow", {"document_type": "E Non Routine Deposit Slip"}, "name"),
                 "state": doc.workflow_state},
        fields=["action", "next_state", "allowed"],
    )
    user_roles = frappe.get_roles(frappe.session.user)
    allowed = [t for t in transitions if t.allowed in user_roles]
    frappe.response["message"] = allowed
```

---

## 8. `perform_*_workflow_action` — Execute Workflow Transition

```python
@frappe.whitelist()
def perform_e_non_routine_deposit_slip_workflow_action(doc_name, action):
    from frappe.model.workflow import apply_workflow
    doc = frappe.get_doc("E Non Routine Deposit Slip", doc_name)
    apply_workflow(doc, action)
    frappe.db.commit()
    frappe.response["message"] = {"status": "ok", "workflow_state": doc.workflow_state}
```

---

## 9. Project Registration — Required Fields for Auto-fill

The frontend calls `frappe.client.get` on the `Project Registration` doctype when a project is selected in E/T forms. Ensure the following fields exist and are readable:

| Fieldname | Type | Purpose |
|---|---|---|
| `principal_investigator` | Link → User | Auto-fills PI in E and T forms |
| `client` | Data | Auto-fills Client in E and T forms |
| `funding_agency` **or** `funding_agen` | Data or Link | Auto-fills Funding Agency in E form |
| `gstin_of_funding_agency` | Data | Auto-fills GSTIN in E form; Funding Agency label in T form |

If the actual fieldname in Project Registration differs from the above, add the real fieldname to the `PROJECT_FIELD_MAP` constant in `DepositSlipForm.tsx`.

---

## 10. Checklist

- [ ] `get_e_non_routine_deposit_slip_fields` returns `link_options["project_title"]` populated with all Project Registration records
- [ ] `get_t_testing_deposit_slip_fields` returns `link_options["project_title"]` populated with all Project Registration records
- [ ] `get_d_consultancy_deposit_slip_fields` returns `link_options["principal_consultant"]` and `link_options["funding_agency"]`
- [ ] `Project Registration` doctype has `principal_investigator`, `client`, and a funding-agency / GSTIN field accessible via `frappe.client.get`
- [ ] `save_*` methods parse `doc_data` JSON and insert a new doc, returning `{ "name": "<doc name>" }`
- [ ] `submit_*` methods submit the doc and return `{ "name": "<doc name>", "status": "Submitted" }`
- [ ] `get_*_workflow_actions` returns a list of `{ action, next_state }` objects
- [ ] `perform_*_workflow_action` accepts `doc_name` and `action` parameters
- [ ] All methods decorated with `@frappe.whitelist()`
- [ ] Permissions: `All_ProRnd_User` role has read/write/create on all three DocTypes
