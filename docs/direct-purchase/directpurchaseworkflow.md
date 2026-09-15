# Direct Purchase — Full Workflow Pipeline & Validation Reference

> Source file: `rndopsapp/rndopsapp/doctype/direct_purchase/direct_purchase.py`  
> Workflow name in DB: `Direct_Purchase_Workflow`

---

## 1. Calculation Engine

### 1.1 Row-level Calculation

**Trigger:** any change to `quantity` or `estimatedprice` on a row in the Items table (`table_gdxp`).

**Formula:**
```
estimated_amount_total_price_in_rs = quantity × estimatedprice
```

Performed on every row in `table_gdxp` both:
- **Client-side** — immediately on field change (React computation rules / Frappe client script).
- **Server-side** — inside `calculate_totals()` called from `validate()` on every save.

### 1.2 Parent-level Aggregation

**Formula:**
```
total_estimate = SUM(estimated_amount_total_price_in_rs)  for all rows in table_gdxp
```

Same dual-enforcement: computed in the browser and re-computed on the server in `calculate_totals()`.

---

## 2. Validation Rules

### 2.1 Purchase Committee Requirement

| Condition | Rule |
|-----------|------|
| `total_estimate > ₹2,00,000` | Minimum **3 rows** must exist in the Purchase Committee table (`table_teqd`) |
| `total_estimate ≤ ₹2,00,000` | `table_teqd` is hidden; no minimum required |

**Server-side enforcement** (`validate_purchase_committee()`): throws `frappe.throw()` if the condition is violated.

**Client-side enforcement** (React computation rules → `conditional_visibility`):
- When `total_estimate > 200000` → show `table_teqd`, auto-add 3 empty rows.
- When `total_estimate ≤ 200000` → hide `table_teqd`, clear all rows.

### 2.2 Document Edit Guard (Save API)

`save_direct_purchase_data()` rejects edits if `docstatus != 0`:
```
Cannot edit a submitted or cancelled document.
```

### 2.3 Workflow Transition Guards (`perform_direct_purchase_action()`)

Before applying a transition, three checks must all pass:

1. **State match** — transition's `state` equals `doc.workflow_state`.
2. **Role check** — caller's roles intersect transition's `allowed` roles, OR caller has `System Manager`.
3. **Condition check** — if a transition has a `condition` expression, it is evaluated via `frappe.safe_eval()` using a sandboxed context containing `doc`, `flt`, `cint`, `frappe.db`, `frappe.session`.

If no valid transition is found, `frappe.throw()` is raised.

---

## 3. Auto-populate Rules

| Trigger field | Context | Fields auto-filled |
|---|---|---|
| `webmail_id` (in `table_teqd` row) | Child table | `pc_name` ← `full_name`, `designation` ← `designation_name` |
| `applying_for_name` | Parent | `applying_for_name` ← `full_name`, `applying_for_department` ← `department_name`, `applying_for_designation` ← `designation_name` |

API used: `get_user_details_direct_purchase(user_email)` — resolves department link to `dept_name` via `Department_prornd` if available.

Purchase Committee webmail dropdown is filtered to employees in class **P - Permanent Employee** or **IF - Inspired Faculty**.

---

## 4. Document Save Flow (`save_direct_purchase_data`)

```
Receive JSON payload (new or existing doc)
        │
        ▼
1. If existing → fetch doc, assert docstatus == 0
   If new      → frappe.new_doc("Direct Purchase")
        │
        ▼
2. First pass — set all standard scalar fields (skip Attach + Table fields)
        │
        ▼
3. If new → doc.insert(ignore_mandatory=True)  ← gets doc.name
        │
        ▼
4. Resolve MinIO path:
   project_no → Project Registration docname
   path = directpurchase/{doc.name}/
        │
        ▼
5. Second pass — process Tables and Attach fields:
   • Tables: clear + re-append child rows; upload any base64 file data inside rows to MinIO
   • Attach fields: upload base64 → MinIO; or keep existing URL string
        │
        ▼
6. doc.save(ignore_permissions=True) + frappe.db.commit()
        │
        ▼
Return {"status": "success", "docname": doc.name}
```

---

## 5. Workflow State Machine

### 5.1 All States

| State | docstatus | Editable By |
|---|---|---|
| Draft | 0 | All_ProRnd_User |
| Pending PI Approval | 0 | Permanent Employee |
| Pending Mentor Approval | 0 | Mentor |
| Pending Head Approval | 0 | head_approver_1 |
| Pending Staff Approval | 0 | staff, RnD |
| Pending HoS Approval | 0 | Hos, RnD (Head of Section, RnD) |
| Pending Associate Dean | 0 | Ado_RnD |
| Pending Dean Approval | 0 | Dean, RnD |
| Pending Director Approval | 0 | Director |
| Approved | 0 | Administrator |
| Pending Staff Verification | 0 | Administrator |
| RDP-11 Generated | 0 | Administrator |
| RDP-11 Verified | 0 | Administrator |
| Sanction Sheet Generated | 0 | Administrator |
| Sanction Sheet Printed | 0 | Administrator |
| Sanction Approved | 0 | Administrator |
| **POGenerated** | **1 (Submitted)** | Administrator |
| **Rejected** | **2 (Cancelled)** | Administrator |

### 5.2 Transition Table

| From State | Action | To State | Allowed Role | Condition |
|---|---|---|---|---|
| Draft | Submit | Pending PI Approval | project staff | — |
| Draft | Submit | Pending Mentor Approval | Independent Researcher | — |
| Draft | Submit | Pending Head Approval | Inspired Faculty | — |
| Draft | Submit | Pending Staff Approval | Permanent Employee | — |
| Pending PI Approval | Forward | Pending Staff Approval | Permanent Employee | — |
| Pending Mentor Approval | Forward | Pending Staff Approval | Mentor | — |
| Pending Head Approval | Forward | Pending Staff Approval | head_approver_1 | — |
| Pending Staff Approval | Forward | Pending HoS Approval | staff, RnD | — |
| Pending HoS Approval | Forward | Pending Dean Approval | Hos, RnD (Head of Section, RnD) | — |
| Pending Dean Approval | Approve | Approved | Dean, RnD | `account_head in ("Consumable","Contingency")` **AND** `total_estimate ≤ 300000` |
| Pending Dean Approval | Approve | Approved | Dean, RnD | `account_head NOT in ("Consumable","Contingency")` |
| Pending Dean Approval | Forward | Pending Director Approval | Dean, RnD | `account_head in ("Consumable","Contingency")` **AND** `total_estimate > 300000` |
| Pending Director Approval | Approve | Approved | Director | `account_head in ("Consumable","Contingency")` |
| Approved | Submit P-11 | Pending Staff Verification | Permanent Employee | — |
| Pending Staff Verification | Verify Hardcopy | RDP-11 Verified | staff, RnD | — |
| RDP-11 Verified | Generate Sanction Sheet | Sanction Sheet Generated | staff, RnD | — |
| Sanction Sheet Generated | Mark Print Taken | Sanction Sheet Printed | Permanent Employee | — |
| Sanction Sheet Printed | Verify Sanction Sheet | Sanction Approved | staff, RnD | — |
| Sanction Approved | Generate PO | POGenerated | staff, RnD | — |

### 5.3 Approval Routing Logic (Draft → Approved)

Applicant's **role** at submit time determines the first approval hop:

```
project staff          → PI Approval → Staff Approval → HoS → Dean → [Director if needed] → Approved
Independent Researcher → Mentor Approval → Staff Approval → HoS → Dean → [Director if needed] → Approved
Inspired Faculty       → Head Approval → Staff Approval → HoS → Dean → [Director if needed] → Approved
Permanent Employee     → Staff Approval → HoS → Dean → [Director if needed] → Approved
```

**Director escalation** (Dean → Director): only when `account_head ∈ {Consumable, Contingency}` AND `total_estimate > ₹3,00,000`.

**Dean direct approval**: when `account_head ∈ {Consumable, Contingency}` AND `total_estimate ≤ ₹3,00,000`, OR when `account_head ∉ {Consumable, Contingency}` (any amount).

---

## 6. `perform_direct_purchase_action()` — Execution Flow

```
Receive (docname, action)
        │
        ▼
Load doc + current_state + user_roles
        │
        ▼
Find active workflow ("Direct_Purchase_Workflow")
        │
        ▼
Iterate transitions:
  for each transition t:
    ├── t.state == current_state AND t.action == action?  → NO  → skip
    ├── role check: user_roles ∩ t.allowed ≠ ∅ OR "System Manager"? → NO  → skip
    └── t.condition present?
          YES → frappe.safe_eval(condition, context={doc, flt, cint, frappe.db, frappe.session})
                result False? → skip
          NO  → proceed
              → next_state = t.next_state; break
        │
        ▼ (if no valid transition found → frappe.throw())
        │
        ▼
doc.workflow_state = next_state
        │
        ├── state_doc.doc_status == "1" AND docstatus == 0  →  doc.submit()
        ├── state_doc.doc_status == "2" AND docstatus != 2  →  doc.cancel()
        └── otherwise → frappe.db.set_value("workflow_state", next_state)
                            │
                            └── IF next_state == "Approved":
                                  doc.reload()
                                  check_workflow_and_publish(doc)   ← Kafka trigger
        │
        ▼
frappe.db.commit()
Return {status, message, workflow_state, next_actions}
```

---

## 7. Downstream Document Pipeline (Post-Approval)

### 7.1 P-11 Form Generation (`generate_p11_form`)

Triggered by action **"Submit P-11"** (state: Approved → Pending Staff Verification).

Maps `table_gdxp` rows → `P_11 Form.table_hsrb`:

| Direct Purchase field | P_11 Form field |
|---|---|
| `itemname` | `item_name` |
| `itemdesciption` | `item_description` |
| `quantity` | `item_quantity` |
| `estimatedprice` | `item_unit_price` |
| `estimated_amount_total_price_in_rs` | `dp_total_price` |
| `total_estimate` | `total_basic_value` + `grand_total` |

Sets DP workflow_state → `RDP11Generated` via `frappe.db.set_value`.

### 7.2 Sanction Sheet Generation (`generate_sanction_sheet`)

Triggered after **"Generate Sanction Sheet"** (RDP-11 Verified → Sanction Sheet Generated).

Applicant mapping: if `register_for == "Other"` → use `applying_for_name/department`, else use `applicant_name/applicant_department`.

Maps `P_11 Form.table_hsrb` → `sanction_sheet.table_bttk` (1-for-1 field copy plus make/model/discount/GST from P_11).

Sets DP workflow_state → `SancSheetGenerated`.

### 7.3 Purchase Order Generation (`generate_purchase_order`)

Triggered after **"Generate PO"** (Sanction Approved → POGenerated, doc_status=1).

Final PO value (excluding `ss_other_charges`):
```
final_po_total = ss_total_es_basic_value + ss_pack_forward + ss_freight
```

Sets DP workflow_state → `POGenerated` (Frappe submits the document).

### 7.4 PO Document Upload (`upload_po_document`)

Uploads PO PDF/image directly to MinIO (bypasses Frappe File doctype validation):

```
MinIO path: prod-rnd-files/Project_Registration/{project_docname}/directpurchase/{app_id}/po/{filename}
```

Updates `sanction_sheet.file_path` via raw SQL after upload.

---

## 8. Kafka Integration (Approval Hook)

When workflow reaches **"Approved"** state, `check_workflow_and_publish()` is called from `perform_direct_purchase_action()`:

```
check_workflow_and_publish(doc)
        │
        ▼
Find Kafka Commit Staging rows for this doc (status: PENDING_APPROVAL or FAILED)
        │
        ▼
For each staging row:
  Parse payload → read trigger_state (default: "Approved")
  current_state == trigger_state?  → NO → skip (idempotency)
  prev_state == trigger_state?     → YES → skip (already triggered)
        │
        ▼
kafka_publish_commit(doc, commit_amount, budget_head, project_name, …)
        │
        ├── SUCCESS → staging_doc.status = "PUBLISHED" + Mattermost notify ✅
        └── FAILURE → staging_doc.status = "FAILED"   + Mattermost notify ❌
```

Commit data is staged via `submit_commit_data()` before approval. The staging row carries `trigger_state` so the same hook works for multiple modules (default `"Approved"`, ICSS uses `"Pending PO Generation"`).

---

## 9. Full Pipeline at a Glance

```
[APPLICANT]
    │  Fill form: items, quantities, rates
    │  total_estimate calculated live
    │  if total_estimate > ₹2L → Purchase Committee (min 3 members required)
    │
    ▼
[Draft] ──Submit──► [Pending PI/Mentor/Head/Staff Approval]
                           │ Forward (role-based chain)
                           ▼
                    [Pending HoS Approval]
                           │ Forward
                           ▼
                    [Pending Dean Approval]
                           │
                   ┌───────┴───────────────────────────────┐
                   │ account_head ∈ {Consumable,Contingency} │
                   │ AND total_estimate > ₹3L               │
                   ▼                                        │
          [Pending Director Approval]          Direct Approve ▼
                   │ Approve                        [Approved]
                   └───────────────────────────────────►
                                                          │
                                              Kafka Commit Published
                                                          │
                                            [Submit P-11]
                                                          │
                                            [Pending Staff Verification]
                                                          │
                                            [Verify Hardcopy]
                                                          │
                                            [RDP-11 Verified]
                                                          │
                                P-11 Form ◄── generate_p11_form()
                                                          │
                                            [Generate Sanction Sheet]
                                                          │
                                            [Sanction Sheet Generated]
                                                          │
                                Sanction Sheet ◄── generate_sanction_sheet()
                                                          │
                                            [Mark Print Taken]
                                                          │
                                            [Sanction Sheet Printed]
                                                          │
                                            [Verify Sanction Sheet]
                                                          │
                                            [Sanction Approved]
                                                          │
                                            [Generate PO]
                                                          │
                                 PO Value = basic + packing + freight
                                                          │
                                            [POGenerated]  ← docstatus=1 (Submitted)
                                                          │
                                     Upload PO document → MinIO
```
