# Project Staff Joining Form — Detailed Technical Reference

> File: `src/pages/application/ProjectStaffJoiningForm.tsx`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Context in the Recruitment Pipeline](#2-context-in-the-recruitment-pipeline)
3. [URL Parameters](#3-url-parameters)
4. [Data Types & Form Fields](#4-data-types--form-fields)
5. [All API Endpoints](#5-all-api-endpoints)
6. [Full Flow Diagram](#6-full-flow-diagram)
7. [Phase-by-Phase Breakdown](#7-phase-by-phase-breakdown)
   - [Phase 1 — Guard: Check for Existing Joining Form](#phase-1--guard-check-for-existing-joining-form)
   - [Phase 2 — Fetch Next Employee ID](#phase-2--fetch-next-employee-id)
   - [Phase 3 — Fetch Form Fields & Prefill from Backend](#phase-3--fetch-form-fields--prefill-from-backend)
   - [Phase 4 — Prefill from Selection Committee Report (SCR)](#phase-4--prefill-from-selection-committee-report-scr)
   - [Phase 5 — Prefill from Selection Candidate Details (SCD)](#phase-5--prefill-from-selection-candidate-details-scd)
   - [Phase 6 — Save (Draft)](#phase-6--save-draft)
   - [Phase 7 — Workflow Actions (Submit / Forward / Approve / Reject)](#phase-7--workflow-actions-submit--forward--approve--reject)
   - [Phase 8 — Activity Stream (Live Audit Log)](#phase-8--activity-stream-live-audit-log)
8. [Prefill Priority Rules](#8-prefill-priority-rules)
9. [Form Sections & Fields Reference](#9-form-sections--fields-reference)
10. [Workflow States & Action Styling](#10-workflow-states--action-styling)
11. [State Map](#11-state-map)
12. [Access Control (Routes)](#12-access-control-routes)
13. [Related Pages in the Pipeline](#13-related-pages-in-the-pipeline)

---

## 1. Overview

The **Project Staff Joining Form** (`/project-staff-joining`) is the **final onboarding step** for a newly selected project staff member at IIT Guwahati R&D Operations. It collects the complete joining details of a candidate who has been selected through the Recruitment Adhoc Contractual process and creates an official **Project Staff Details** record in Frappe.

Key responsibilities of this form:
- Auto-prefills personal, salary, and appointment data from the **Selection Committee Report (SCR)** and **Selection Candidate Details (SCD)** records.
- Lets R&D Staff fill in or correct any missing details (employment tenure, bank info, uploads).
- Triggers an **Employee ID (`ps_emp_id`) generation** on the backend at the time of Submit.
- Routes through a multi-stage approval workflow before the candidate is officially onboarded.
- Provides a live **Activity Stream** (comments + workflow log) once the document is saved.

---

## 2. Context in the Recruitment Pipeline

The full recruitment flow that leads to this form:

```
1. PI creates Recruitment Adhoc Contractual form
   /recruitment-adhoc-contractual/:id?
   → Doctype: "Recruitment Adhoc Contractual"

2. Interviews conducted externally via candidate portal
   (External Node server at VITE_CANDIDATE_API_URL)

3. R&D Staff fills Selection Committee Report (SCR)
   /selection-committee-report/:id?
   → Doctype: "Selection Committee Report"
   → Embeds candidate list with: candidate_id, candidate_name,
     recruitment_post_id, applied_post, basic_pay, hra

4. Candidate submits Selection Candidate Details (SCD)
   (Candidate-facing portal)
   → Doctype: "Selection Candidate Details"
   → Contains: personal info, PAN, Aadhar, bank details, addresses

5. R&D Staff opens Joining Report page
   /joining-report
   → Lists candidates ready for joining
   → Navigates to: /project-staff-joining?scr={scrName}
                                          &candidate_id={id}
                                          &application_id={appId}

6. ── THIS FORM ──
   /project-staff-joining
   → Doctype: "Project Staff Details"
   → Generates Employee ID on Submit
```

---

## 3. URL Parameters

The form reads these query parameters from the URL:

| Parameter | Source | Purpose |
|---|---|---|
| `scr` | Joining Report page | Name of the Selection Committee Report Frappe document |
| `candidate_id` | Joining Report page | Identifies the candidate row inside the SCR |
| `application_id` | Joining Report page | Used to look up SCD and check for duplicate joining forms |
| `docname` or `name` | Internal (re-open) | Frappe document name of an existing Joining Form |

---

## 4. Data Types & Form Fields

### Fallback Field Definitions (used when backend returns no fields)

Defined inline as `fallbackFields[]` in the component. These mirror the `Project Staff Details` Frappe doctype structure:

**Appointment Details Section**

| Field | Label | Type | Notes |
|---|---|---|---|
| `ps_emp_id` | Employee ID | Data | Read-only; auto-generated on Submit |
| `scr_id` | Selection Committee Report | Data | Read-only; from URL param |
| `pi_id` | Principal Investigator | Data | Read-only; from SCR owner |
| `project_no` | Project Number | Data | Read-only; from SCR |
| `ps_aon` | Appointment Order No. | Data | Editable |
| `ps_designation` | Designation | Data | Mandatory; prefilled from SCR/SCD |
| `ps_department` | Department | Data | Prefilled from SCR |
| `ps_mro` | MRO | Data | Manual entry |
| `ps_joining_date` | Joining Date | Date | Manual entry |
| `ps_term_completion_date` | Term Completion Date | Date | Manual entry |

**Personal Details Section**

| Field | Label | Type | Notes |
|---|---|---|---|
| `ps_first_name` | First Name | Data | Mandatory; prefilled from SCR/SCD |
| `ps_middle_name` | Middle Name | Data | Prefilled from SCR name-split |
| `ps_last_name` | Last Name | Data | Mandatory; prefilled from SCR/SCD |
| `ps_date_of_birth` | Date of Birth | Date | Prefilled from SCD |
| `ps_fathers_name` | Father's Name | Data | Prefilled from SCD |
| `ps_blood_group` | Blood Group | Select | A+/A-/B+/B-/AB+/AB-/O+/O- |
| `ps_maritial_status` | Marital Status | Select | Single/Married/Divorced/Widowed |
| `ps_gender` | Gender | Select | Male/Female |
| `ps_citizenship` | Citizenship | Data | Prefilled from SCD |

**Contact Details Section**

| Field | Label | Type | Notes |
|---|---|---|---|
| `ps_email_id` | Email ID | Data | Prefilled from SCD |
| `erp_mail` | ERP Mail | Data | Institutional email |
| `ps_phone_number` | Phone Number | Data | Prefilled from SCD |
| `ps_present_address` | Present Address | Small Text | Prefilled from SCD `correspondence_address` |
| `ps_permanent_address` | Permanent Address | Small Text | Prefilled from SCD |

**Identity Documents Section**

| Field | Label | Type | Notes |
|---|---|---|---|
| `ps_pan` | PAN | Data | Prefilled from SCD |
| `ps_aadhar_number` | Aadhar Number | Data | Prefilled from SCD |
| `bank_account_number` | Bank Account Number | Data | Prefilled from SCD |

**Salary Details Section**

| Field | Label | Type | Notes |
|---|---|---|---|
| `ps_basic_salary` | Basic Salary | Currency | Prefilled from SCR/SCD `basic_pay` |
| `ps_hra` | HRA | Data | Prefilled from SCR/SCD |
| `ps_ma` | MA (Medical Allowance) | Data | Manual entry |
| `ps_ta` | If Travel Allowance Needed | Select | Yes/No |
| `ps_ta_amount` | Travel Allowance Amount | Data | Manual entry |
| `ps_hostel` | Hostel | Data | Drives HRA-deduction logic in Salary Module |

**Tenure Details Table** (`table_ymed`)

Child table with one row per employment tenure/extension:

| Child Field | Label | Type |
|---|---|---|
| `pstd_joining_date` | Joining Date | Date |
| `pstd_term_completion_date` | Term Completion Date | Date |
| `pstd_basic_salary` | Basic Salary | Currency |
| `pstd_increment` | Increment | Data |
| `pstd_hra` | HRA | Data |
| `pstd_extension_sought` | Extension Sought | Data |
| `pstd_joining_number` | Joining Number | Data |
| `pstd_pi_extension_sought` | PI Extension Sought | Data |
| `pstd_staff_extension_sought` | Staff Extension Sought | Data |
| `pstd_tentative_joining_date` | Tentative Joining Date | Date |

**Upload Section**

| Field | Label | Type |
|---|---|---|
| `ps_photo` | Photo | Attach |
| `ps_signature` | Signature | Attach |
| `ps_medical_certificate` | Medical Certificate | Attach |

---

## 5. All API Endpoints

All methods are called via `useFrappePostCall` (POST to `/api/method/...`).

### Project Staff Details (`projectStaffDetailsAPI`)

| Key | Frappe Method | When Called | Purpose |
|---|---|---|---|
| `getFields` | `rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.get_project_staff_details_fields` | On mount | Fetch field metadata + prefill data for an existing doc |
| `save` | `rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.save_project_staff_details_data` | On Save click | Create or update the Project Staff Details doc |
| `getByApplication` | `rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.get_joining_by_application` | On mount (if `application_id` present) | Check if a Joining Form already exists for this candidate |
| `getNextEmpId` | `rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.get_next_emp_id` | On mount | Fetch the next auto-generated Employee ID preview |
| `submit` | `rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.submit_project_staff_details` | On Submit workflow action | Finalise the document; backend calls `generate_emp_id()` |
| `getWorkflowActions` | `rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.get_project_staff_details_workflow_actions` | After save + after every workflow action | Fetch available actions for the current workflow state |
| `performAction` | `rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.perform_project_staff_details_action` | On Forward / Approve / Reject / other action | Advance or revert the workflow state |
| `getList` | `rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.get_project_staff_details_list` | Not used in this form (used by Salary Module) | List all staff records |
| `delete` | `rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.delete_project_staff_details` | Not used in this form | Delete a joining record |

### Selection Committee Report (`selectionCommitteeReportAPI`)

| Key | Frappe Method | When Called | Purpose |
|---|---|---|---|
| `getFields` | `rndopsapp.rndopsapp.doctype.selection_committee_report.selection_committee_report.get_selection_committee_report_fields` | On mount (if `scr` param present) | Fetch SCR data including `candidates[]` array and `project_number`, `owner` |

### Selection Candidate Details (`selectionCandidateDetailsAPI`)

| Key | Frappe Method | When Called | Purpose |
|---|---|---|---|
| `getByApplication` | `rndopsapp.rndopsapp.doctype.selection_candidate_details.selection_candidate_details.get_selection_candidate_details_by_application` | On mount (if `application_id` present) | Fetch the candidate's personal info, PAN, Aadhar, bank details |

### Comments API

| Method Path | When Called | Purpose |
|---|---|---|
| `rndopsapp.rndopsapp.api.add_project_comment` | After every successful workflow action (if comment was entered) | Persist the actor's comment into the Frappe document's timeline so it appears in the Activity Stream |

---

## 6. Full Flow Diagram

```
USER OPENS /project-staff-joining?scr=SCR-001&candidate_id=42&application_id=APP-100
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: Duplicate Guard                                    │
│                                                              │
│  if application_id in URL:                                   │
│    POST get_joining_by_application({ application_id })       │
│    → If existing doc found:                                  │
│        effectiveDocName = ex.docname                         │
│        viewOnlyNotice   = true   (if already submitted)      │
└─────────────────────────────────────────────────────────────┘
         │
         ▼ (parallel with Phase 1)
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: Next Employee ID Preview                           │
│                                                              │
│  POST get_next_emp_id({})                                    │
│  → Sets nextEmpId state (shown in header as placeholder)     │
│  → NOT the final Employee ID — that is assigned at Submit    │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3: Fetch Fields + Backend Prefill                     │
│                                                              │
│  POST get_project_staff_details_fields({ doc_name })         │
│  → fields[]       : form field metadata (label/type/etc.)   │
│  → link_options{} : dropdown option lists                    │
│  → prefill_data{} : if reopening an existing saved doc,      │
│                     all previously saved field values        │
│                     including table_ymed rows                │
└─────────────────────────────────────────────────────────────┘
         │
         ▼ (parallel)
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  PHASE 4: SCR Prefill         │  │  PHASE 5: SCD Prefill         │
│                               │  │                               │
│  POST get_selection_          │  │  POST get_selection_          │
│       committee_report_fields │  │       candidate_details_      │
│  { doc_name: scrName }        │  │       by_application          │
│                               │  │  { application_id }           │
│  From response:               │  │                               │
│  - prefill_data.owner         │  │  Overrides SCR data:          │
│    → pi_id                    │  │  - candidate_name/surname     │
│  - prefill_data.project_number│  │    → ps_first_name/last       │
│    → project_no               │  │  - email → ps_email_id        │
│  - candidates[] find by       │  │  - phone_number               │
│    candidate_id:              │  │  - correspondence_address     │
│    - candidate_name           │  │    → ps_present_address       │
│      → split into             │  │  - permanent_address          │
│        first/mid/last         │  │  - date_of_birth              │
│    - applied_post             │  │  - fathers_name               │
│      → ps_designation         │  │  - blood_group                │
│    - basic_pay → ps_basic     │  │  - marital_status             │
│    - hra → ps_hra             │  │  - citizenship                │
│    - upfa_department          │  │  - pan → ps_pan               │
│      → ps_department          │  │  - aadhar_number              │
│    - recruitment_post_id      │  │  - bank_account_number        │
│      → stored for nav link    │  │  - appointment_order_number   │
│                               │  │    → ps_aon                   │
│                               │  │  - basic_pay → ps_basic_salary│
│                               │  │  - hra → ps_hra               │
│                               │  │  - applied_post → ps_design.  │
└──────────────────────────────┘  └──────────────────────────────┘
         │                                      │
         └──────────────────┬───────────────────┘
                            ▼
                   Merge all prefill data
                   → setFormData(mergedData)
                   → setLoading(false)
                   → Render form with pre-populated fields

USER REVIEWS AND EDITS FORM FIELDS
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 6: Save                                               │
│                                                              │
│  Validation:                                                 │
│  - ps_first_name must be non-empty                           │
│  - ps_last_name must be non-empty                            │
│                                                              │
│  prepareFormDataForApi(formData)                             │
│  → Converts File objects to base64 { file_name, file_data } │
│  → JSON-serialises table_ymed rows                           │
│                                                              │
│  POST save_project_staff_details_data({ data: prepared })    │
│  → Response: { status: "success", docname: "PSD-0001" }      │
│  → setSavedDocName("PSD-0001")                               │
│  → Activity Stream panel appears                             │
│  → Workflow actions fetched automatically                    │
└─────────────────────────────────────────────────────────────┘
         │
USER CLICKS A WORKFLOW ACTION BUTTON (Submit / Forward / etc.)
         ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 7: Comment Modal + Workflow Action                    │
│                                                              │
│  1. CommentModal opens (optional comment text area)          │
│  2. User confirms                                            │
│                                                              │
│  if action === "Submit":                                     │
│    POST submit_project_staff_details                         │
│         { docname, comment? }                                │
│    → Backend calls generate_emp_id()                         │
│    → Response may include ps_emp_id                          │
│    → If not in response, refetch via getFields               │
│    → setFormData ps_emp_id to real allotted ID               │
│    → Shows alert: "Allotted Employee ID: PS-2026-001"        │
│                                                              │
│  else (Forward / Approve / Reject / Return):                 │
│    POST perform_project_staff_details_action                 │
│         { docname, action, comment? }                        │
│    → Shows alert: "{action} successful."                     │
│                                                              │
│  After any action:                                           │
│  - if comment entered → POST add_project_comment             │
│  - POST getWorkflowActions → update action buttons           │
│  - activityStreamRef.refetch() → reload timeline             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 8: Activity Stream (sidebar panel)                    │
│                                                              │
│  Visible once savedDocName is set                            │
│  Doctype: "Project Staff Details"                            │
│  Mode: commentsOnly                                          │
│  → Shows all workflow comments and activity in a sticky      │
│    right-side panel that refreshes after each action         │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Phase-by-Phase Breakdown

### Phase 1 — Guard: Check for Existing Joining Form

Before rendering a blank form, the component checks if a `Project Staff Details` doc already exists for this `application_id`. This prevents duplicate joining records for the same candidate.

```
POST get_joining_by_application({ application_id: "APP-100" })

Response shape:
  { data: { docname: "PSD-0001", is_submitted: true } }
    → effectiveDocName = "PSD-0001"
    → viewOnlyNotice = true   (if is_submitted)
    → canSave = false          (form rendered read-only)

  { data: null } or {}
    → proceed as new form
```

The `canSave` flag is `true` only when `workflowState` is `""` or `"draft"` AND `viewOnlyNotice` is `false`. When `canSave` is `false`, all form fields are rendered as read-only via `DynamicFormRenderer`'s `readOnly` prop.

---

### Phase 2 — Fetch Next Employee ID

```
POST get_next_emp_id({})
→ Returns string like "PS-IITG-2026-001"
→ Shown as placeholder in header ("Employee ID: PS-IITG-2026-001")
→ This is a PREVIEW — the backend actually assigns the ID at Submit
```

---

### Phase 3 — Fetch Form Fields & Prefill from Backend

```
POST get_project_staff_details_fields({ doc_name: effectiveDocName | undefined })

Response shape:
  {
    fields: FormField[],         // field metadata array
    link_options: {              // dropdown option lists
      ps_department: [...],
      ps_designation: [...],
      ...
    },
    prefill_data: {              // populated if doc_name given
      ps_emp_id: "...",
      ps_first_name: "...",
      table_ymed: "[{...}]",    // JSON string of child rows
      ...
    }
  }
```

`normalizeFields()` is applied to the returned fields to:
- Force `ps_emp_id`, `scr_id`, `pi_id`, `project_no` to `read_only: 1`
- Ensure `table_ymed` has child_fields (falls back to inline definition)

`normalizeRows()` parses the `table_ymed` value from either a JSON string or an existing array.

If the backend `getFields` call fails, `fallbackFields` (the hardcoded field list) is used so the form remains functional.

---

### Phase 4 — Prefill from Selection Committee Report (SCR)

```
POST get_selection_committee_report_fields({ doc_name: "SCR-001" })

Extracts:
  prefill_data.owner          → pi_id
  prefill_data.project_number → project_no
  prefill_data.candidates[]   → find by candidate_id
    candidate.candidate_name  → split into first / middle / last name
    candidate.applied_post    → ps_designation
    candidate.basic_pay       → ps_basic_salary
    candidate.hra             → ps_hra
    candidate.recruitment_post_id → stored as recruitmentPostId
                                    (used for "Candidate Details" nav link)
  prefill_data.upfa_department → ps_department
```

Name splitting logic:
```
"John Michael Smith"
  → nameParts = ["John", "Michael", "Smith"]
  → firstName  = "John"
  → lastName   = "Smith"
  → middleName = "Michael"

"John Smith"
  → firstName  = "John"
  → lastName   = "Smith"
  → middleName = ""
```

---

### Phase 5 — Prefill from Selection Candidate Details (SCD)

SCD data runs **after** SCR and **overrides** any SCR values where SCD provides a non-empty value. This reflects that SCD is filled in by the candidate directly and is more authoritative for personal/contact details.

```
POST get_selection_candidate_details_by_application({ application_id: "APP-100" })

Returns: data[] — array of SCD records for this application (uses index [0])

SCD field → Form field mapping:
  candidate_name       → ps_first_name
  candidate_surname    → ps_last_name
  email                → ps_email_id
  phone_number         → ps_phone_number
  correspondence_address → ps_present_address
  permanent_address    → ps_permanent_address
  date_of_birth        → ps_date_of_birth
  fathers_name         → ps_fathers_name
  blood_group          → ps_blood_group
  marital_status       → ps_maritial_status
  citizenship          → ps_citizenship
  pan                  → ps_pan
  aadhar_number        → ps_aadhar_number
  bank_account_number  → bank_account_number
  appointment_order_number → ps_aon
  basic_pay            → ps_basic_salary
  hra                  → ps_hra
  applied_post         → ps_designation
```

Only non-empty/truthy SCD values are applied (spread with `&&` check), so SCR data is not erased if SCD is incomplete.

---

### Phase 6 — Save (Draft)

Triggered by the **Save** button (visible only when `canSave = true`).

**Validation:**
- `ps_first_name` must be non-empty
- `ps_last_name` must be non-empty

**File handling via `prepareFormDataForApi`:**
- Any `File` object in `formData` is converted to `{ file_name: string, file_data: string }` where `file_data` is pure base64 (no `data:<mime>;base64,` prefix — Frappe's `save_file(decode=True)` requires this)
- Child table rows are similarly processed for any `File` fields

```
POST save_project_staff_details_data({
  data: {
    name: "PSD-0001",   // included if updating an existing doc
    ps_first_name: "John",
    ps_last_name: "Smith",
    ps_basic_salary: 35000,
    table_ymed: [...],
    ps_photo: { file_name: "photo.jpg", file_data: "<base64>" },
    ...
  }
})

Success response:
  { status: "success", docname: "PSD-0001" }
  → setSavedDocName("PSD-0001")
  → alert("Saved successfully!")
  → Activity Stream panel becomes visible
  → loadWorkflowActions("PSD-0001") triggered
```

---

### Phase 7 — Workflow Actions (Submit / Forward / Approve / Reject)

#### Loading workflow actions

```
POST get_project_staff_details_workflow_actions({ docname: "PSD-0001" })

Response:
  { status: "success", workflow_state: "Draft", actions: ["Submit"] }
  → setWorkflowState("Draft")
  → setWorkflowActions(["Submit"])
```

Buttons are rendered dynamically for each action string in `workflowActions[]`.

#### Triggering a workflow action

1. User clicks action button (e.g., "Submit")
2. `CommentModal` opens — optional free-text comment
3. User clicks "Confirm"

**If action is "Submit":**
```
POST submit_project_staff_details({ docname: "PSD-0001", comment? })
→ Backend calls generate_emp_id() and writes ps_emp_id to the doc
→ Response may include msg.ps_emp_id / msg.doc.ps_emp_id / msg.data.ps_emp_id
→ If ps_emp_id not in response:
    POST getFields({ doc_name: "PSD-0001" }) to refetch it
→ setFormData ps_emp_id = allotted Employee ID
→ alert("Allotted Employee ID: PS-IITG-2026-001")
```

**If action is other (Forward / Approve / Reject / Return):**
```
POST perform_project_staff_details_action({
  docname: "PSD-0001",
  action: "Forward",
  comment?: "Please review"
})
→ alert("Forward successful.")
```

**After any action:**
```
if comment.trim():
  POST add_project_comment({
    doctype: "Project Staff Details",
    docname: "PSD-0001",
    content: comment
  })
→ loadWorkflowActions() → refresh action buttons
→ activityStreamRef.current.refetch() → refresh Activity Stream
```

---

### Phase 8 — Activity Stream (Live Audit Log)

Rendered as a **sticky right-side panel** (`lg:sticky lg:top-6`) once `savedDocName` is set.

```tsx
<ActivityStream
  ref={activityStreamRef}
  doctype="Project Staff Details"
  docname={savedDocName}
  commentsOnly
/>
```

- Shows comments left during workflow actions
- Refreshed automatically after every action via `activityStreamRef.current.refetch()`
- Only visible after the first Save (until then, the right column is empty)

---

## 8. Prefill Priority Rules

Data sources are merged in this order (later sources override earlier ones):

```
Priority 1 (lowest): Backend prefill_data from getFields
                      (populated only when reopening an existing saved doc)

Priority 2:           SCR (Selection Committee Report)
                      - project info, PI, basic pay, designation, name

Priority 3 (highest): SCD (Selection Candidate Details)
                      - personal info, contacts, identity docs, salary
                      - Only non-empty SCD values applied
```

Fields that are always read-only regardless of source:
- `ps_emp_id` — read-only, set by backend on Submit
- `scr_id` — read-only, from URL
- `pi_id` — read-only, from SCR owner
- `project_no` — read-only, from SCR

---

## 9. Form Sections & Fields Reference

The form is displayed as named `GroupCard` sections (card components with a dark header bar):

| Section Card | Fields Rendered |
|---|---|
| **Appointment Details** | `ps_emp_id`, `scr_id`, `pi_id`, `project_no`, `ps_designation`, `ps_department`, `ps_joining_date`, `ps_term_completion_date` |
| **Personal Details** | `ps_first_name`, `ps_middle_name`, `ps_last_name`, `ps_date_of_birth`, `ps_fathers_name`, `ps_blood_group`, `ps_maritial_status`, `ps_gender`, `ps_citizenship` |
| **Contact Details** | `ps_email_id`, `erp_mail`, `ps_phone_number`, `ps_present_address`, `ps_permanent_address` |
| **Identity Documents** | `ps_pan`, `ps_aadhar_number`, `bank_account_number` |
| **Salary Details** | `ps_basic_salary`, `ps_hra`, `ps_ma`, `ps_ta`, `ps_ta_amount`, `ps_hostel` |
| **Tenure Details** | `table_ymed` child table (multiple rows, each row = one tenure period) |
| **Uploads** | `ps_photo`, `ps_signature`, `ps_medical_certificate` |

Each section uses `DynamicFormRenderer` with the `hideSectionHeaders: true` prop (section titles come from `GroupCard` instead of the renderer).

---

## 10. Workflow States & Action Styling

Action buttons are colour-coded based on the action name:

| Action | Button Colour |
|---|---|
| `submit` | Emerald green (`bg-emerald-600`) |
| `forward`, `approve`, `recommend` | Blue (`bg-blue-600`) |
| `reject`, `return` | Red (`bg-red-600`) |
| All others | Orange (`bg-[#D97757]`) |

Typical workflow state progression for this doctype:

```
Draft
  → Submit → Submitted / Pending R&D Review
  → Forward → Pending HoS Approval
  → Approve → Pending Dean Approval
  → Approve → Approved
  (at any stage) → Reject → Rejected
```

The exact states and available actions depend on the backend Frappe workflow configuration for the `Project Staff Details` doctype.

---

## 11. State Map

```
scrName               — string: "SCR-001" (from URL ?scr=)
candidateId           — string: "42" (from URL ?candidate_id=)
applicationId         — string: "APP-100" (from URL ?application_id=)
docnameParam          — string: "PSD-0001" (from URL ?docname= or ?name=)

fields[]              — FormField[] from backend or fallbackFields
formData{}            — all form field values, merged from all prefill sources
linkOptions{}         — dropdown option lists from getFields response
loading               — true while initial data is being fetched
saving                — true while POST save is in progress
savedDocName          — string | null: Frappe doc name after first save
candidateName         — string: displayed below the form title
nextEmpId             — string: preview Employee ID from getNextEmpId
recruitmentPostId     — string: stored to build "Candidate Details" nav link
viewOnlyNotice        — boolean: true if candidate already has a submitted doc

workflowState         — string: current workflow state from backend
workflowActions       — string[]: available action names for current state
actionLoading         — string: which action is currently in progress
commentModalOpen      — boolean: controls CommentModal visibility
pendingWorkflowAction — string: the action waiting for comment confirmation

canSave               — workflowState is "" or "draft" AND !viewOnlyNotice
```

---

## 12. Access Control (Routes)

```
Route: /project-staff-joining
Guard: AuthRouteWrapper
Allowed roles:
  - "staff, RnD"
  - "Hos, RnD (Head of Section, RnD)"
  - "Dean, RnD"
  - "Ado_RnD"
  - "Director"

Route: /joining-report             (the list page that links here)
Guard: AuthRouteWrapper
Allowed role: "staff, RnD"
```

Project Staff members (`project staff` role) do **not** have access to this form — it is filled by R&D Staff on behalf of the new joinee.

---

## 13. Related Pages in the Pipeline

| Page | Route | Role | Purpose |
|---|---|---|---|
| Recruitment Adhoc Contractual | `/recruitment-adhoc-contractual/:id?` | `All_ProRnd_User` | PI initiates recruitment; defines post, salary, chairperson |
| Candidate Applications | `/candidate-applications` | `All_ProRnd_User` | View candidate applications per recruitment post |
| Candidate Details | `/candidate-details/:candidateId` | `All_ProRnd_User` | Full candidate profile + documents from external portal |
| Selection Committee Report | `/selection-committee-report/:id?` | `All_ProRnd_User` | R&D Staff records interview results + selects candidates |
| Appointment Order | `/appointment-order` | `staff, RnD` | Generate appointment order letter for selected candidate |
| Medical Report | `/medical-report` | `staff, RnD` | Upload/verify medical fitness certificate |
| Joining Report | `/joining-report` | `staff, RnD` | Lists candidates ready to join; entry point to this form |
| **Project Staff Joining Form** | `/project-staff-joining` | `staff, RnD` + HoS/Dean/Ado/Director | **This form** — onboarding details |
| Project Staff Dashboard | `/project-staff-dashboard` | `project staff` | After onboarding, staff views their own profile here |
| Salary Module | `/salary-module` *(internal)* | PI | Uses `Project Staff Details` records for payroll |
| Project Staff Resignation | `/project-staff-resignation` | `All_ProRnd_User` | Offboarding flow for existing project staff |
