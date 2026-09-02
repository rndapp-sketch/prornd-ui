# Direct Purchase Documentation (Up to 2.5 Lakh)

This document outlines the operational logic, Frappe database schema, and form flows for the Direct Purchase module used by Faculties, NPDF, and Inspire Faculty.

## 1. Module Overview

This module is used by project staff to purchase items up to ₹2.5 Lakh. To complete a direct purchase, the following forms must be filled in sequence:

1. **Direct Purchase Form** (Frappe DocType: `Direct Purchase`)
2. **P_11 Form** (Verification & Processing)
3. **Sanction Sheet** (Financial Sanction)
4. **Purchase Order (PO)** (External Vendor Order)

## 2. Technical Architecture in Frappe

### 2.1 Database Tables (Frappe DocTypes)

The application has been migrated to standard Frappe web architecture utilizing the following DocTypes:

| Frappe DocType | Purpose | Legacy Java Table Reference |
|----------------|---------|-----------------------------|
| `Direct Purchase` | Main header data, applicant details, status tracking, declarations. | `employee_direct_purchase_general` |
| `Items to be purchased` | Child table for line-item details (quantities, descriptions, estimated prices). Mapped as `table_gdxp`. | `indent_general_direct_purchase_particulars` |
| `Purchase Committee` | Child table mapping committee members dynamically. Mapped as `table_teqd`. (Req. > ₹2,00,000) | N/A |
| `P_11 Form` | Auto-populated details specific to the P_11 verification stage. | `rdp11_details` |
| `Sanction Sheet` *(TBD)* | Sanction logic, financial metadata, and 'Other Charges'. | `sanction_sheet_details` |

### 2.2 Fields Mapping in `Direct Purchase` DocType

- **Applicant & Identity Options**: 
  - `register_for`: Select ("Self" or "Other"). Determines who the purchase is for.
  - `applicant_details_section`: Auto-fetched via session (`applicant_name`, `applicant_department`, `applicant_designation`).
  - `applying_for_section`: Auto-fetched when selecting "Other" (`applying_for_name`, `applying_for_department`, `applying_for_designation`).
  - `project_no`: The source Project Number (Read-Only).

- **Financial & Items Configuration**:
  - `account_head`: Link to Budget Head (e.g., Non-Recurring, Recurring, Consumable, Equipment, Travel).
  - `table_gdxp`: Child Table (`Items to be purchased`).
    - `itemname`: Name of the item.
    - `itemdesciption`: Description of the item.
    - `justification`: Justification for purchase.
    - `quantity`: Integer quantity.
    - `estimatedprice`: Rate per item.
    - `estimated_amount_total_price_in_rs`: Calculated row total (`quantity * estimatedprice`).
  - `total_estimate`: Auto-calculated sum of all rows.
  - `is_sanctioned`: Select ("Yes" or "No"). Were items sanctioned by the Funding Agency?

- **Purchase Committee Requirements**:
  - `table_teqd`: Child Table (`Purchase Committee`). Required (minimum 3 rows) if `total_estimate` > ₹2,00,000.
    - `webmail_id`: Filtered Link to `User` (Internal mapping logic for permanent/faculty).
    - `pc_name`: Auto-fetched Full Name.
    - `designation`: Auto-fetched Designation.

- **Attachments & Declarations**:
  - `upload_detailed_specification`: Attach field for specifications.
  - `comments_if_any`: Optional small text area.
  - `dec_1`, `dec_2`: Checkboxes enforcing financial responsibility and INR currency clauses.

### 2.3 Controller & API Mapping

- **Primary Controller**: `rndopsapp.doctype.direct_purchase.direct_purchase.py`
  - `get_direct_purchase_fields(doc_name=None)`: Fetches definitions, API dependencies, client-side formulas (`computation_rules`), and user data.
  - `save_direct_purchase_data(data)`: Centralized save controller handling standard insertions, array handling for child tables (`table_gdxp`, `table_teqd`), and file uploads.
  - `perform_direct_purchase_action(docname, action)`: Operates the workflow (Forward, Reject, Put Back, Approve).
  - `get_user_details_direct_purchase(user_email)`: Replaces the old `getEmployeeName()` AJAX call to instantly pull full name, designation, and department details on dropdown select.

## 3. Form Lifecycle & Logics

### Phase A: Direct Purchase Form
- **Location**: Custom React Frontend Dashboard -> Utilities -> Purchase -> Direct Purchase up-to 2.5 Lakh.
- **Auto-Calculations**: Done via Client Scripts returning `computation_rules` defining real-time row sum logic and committee visibility rules.
- **Workflow / Approval Flow Variations**:
  - **Project Staff (PS)**: PS → PI → RndStaff → RndPa → Adornd1
  - **Project Investigator (PI)**: PI → RndStaff → RndPa → Adornd1
  - **NPDF (IR)**: IR → Mentor → RndStaff → RndPa → Adornd1
  - **Inspire Faculty (IF)**: IF → HOD/HOC → RndStaff → RndPa → Adornd1

### Phase B: P_11 Form
- **Trigger**: Starts sequentially after `Adornd1` (Associate Dean) approves the `Direct Purchase` document. Appears in the PI's account.
- **Logic**: Auto-populates `table_gdxp` (Item arrays) and `table_teqd` (Purchase Committee arrays) directly from the parent `Direct Purchase` submission. Includes specific "Put Back" (rejection) loops.
- **Status Flow**: `Direct Purchase Approved` → `P_11 Generated`.

### Phase C: Sanction Sheet
- **Trigger**: Appears in the RnD Staff queue post P_11 verification.
- **Logic**: RnD Staff logs "Other Charges". 
- **Status Flow**: `P_11 Approved` → `SancSheetGenerated`.
- **Physical Verification**: Document becomes available for PI to execute Print (`PrintTaken`). Follows RnD Verification triggering the state to `SancSheetApproved`.

## 4. Final Stage: Purchase Order (PO) Generation

- **Trigger**: When the Sanction Sheet attains `SancSheetApproved`.
- **Logic**: 
  - The final Purchase Order is mapped and printed directly from the original `Direct Purchase` document.
  - *Crucial*: Scripts must filter out or ignore the "Other Charges" documented by the RnD Staff during the Sanction sequence when calculating the final authorized PO value.
- **Final Target Document Status**: `POGenerated` (on the `Direct Purchase` DocType).

## 5. Development TODO List

### Infrastructure Setup
- [x] Configure standard Frappe properties for `Direct Purchase` matching the detailed form requirements.
- [x] Integrate child tables (`table_gdxp` and `table_teqd`).

### Phase 1: Direct Purchase (Initialization)
- [x] Build `save_direct_purchase_data` encompassing child table management and Frappe attachment storage for specifications.
- [x] Apply client computations identifying triggers where `total_estimate` enforces Purchase Committee mapping.
- [ ] Configure the 4 distinct workflow channels linking Frappe Workflow States directly to Form Roles (PS, PI, IR, IF).

### Phase 2: P_11 Form Module
- [x] Create Python/Frappe backend function to bootstrap a new P_11 Form Draft pulling `Direct Purchase` data.
- [ ] Implement the `P_11 Generated` workflow node and custom transitions.
- [ ] Support Physical Verification Print Formats.

### Phase 3: Sanction Sheet & Verification
- [x] Create backend API to bootstrap `Sanction Sheet` DocType accommodating "Other Charges" and status milestones.
- [ ] Transition document states capturing `PrintTaken` and `SancSheetApproved` endpoints.

### Phase 4: Purchase Order (PO)
- [x] Build mapping routine calculating final authorized values (excluding internal other charges).
- [ ] Ensure final PO Print Format is linked to the `Direct Purchase` DocType.

### Testing & Verification
- [ ] Validate cross-role transition notifications and "Put Back" reason documentation.
- [ ] Thorough end-to-end integration testing for all primary user roles applying.
