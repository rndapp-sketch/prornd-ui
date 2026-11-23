# Top-Up Fellowship — Implementation Details

**Branch:** `mythos_omni_v0.4`  
**Date:** 2026-06-01 (limits/auto-calculation section updated 2026-11-18)  
**Author:** okramjimmy

---

## Overview

The Top-Up Fellowship feature enables Principal Investigators (PIs) to apply for additional monthly stipends for students working on research projects, subject to a **per-student monthly cap** (₹50,000/month by default, ₹25,000/month for students already on a stipend/scholarship), scaled by the number of months in the engagement period. It includes a multi-stage approval workflow and a Faculty Admission signed-PDF upload sub-workflow for R&D Staff.

---

## Feature Scope

| Area | Description |
|---|---|
| **Form** | Multi-student application with per-student cap validation, auto-calculated months and Grand Total Amount |
| **Details View** | Read-only view with full workflow timeline |
| **Faculty Admission Flow** | R&D Staff downloads generated PDF → Faculty Admission signs → Staff uploads scan |
| **Routing** | 3 new protected routes in the React Router config |
| **Sidebar** | "Faculty Admission PDF Upload" menu item for `staff, RnD` role |
| **Project Overview** | "Top Up Fellowship" enabled in Disbursal section with live data fetch |
| **Pending Tasks** | Full workflow action buttons + `dept_centre` display + `BudgetActionsSidebar` |
| **API** | `topUpFellowshipAPI` export with faculty admission endpoints |
| **DocType Mapping** | `'Top Up Fellowship'` registered in `projectTypeMapping.ts` |

---

## New Files

### `src/pages/application/TopUpFellowshipForm.tsx`

**Purpose:** Create and edit Top-Up Fellowship applications.

**Key functionality:**
- Renders a dynamic Frappe-driven form via `DynamicFormRenderer`
- Student child table (`students`) with fields:
  - `email_of_student` (Link to student DB — auto-fetches roll number + department)
  - `roll_number` (auto-filled)
  - `dept_centre` (auto-filled)
  - `period_from` / `period_to` (date range, shown as dd/mm/yyyy)
  - `hours_per_month`
  - `rate_per_hour`
  - `stipend_or_scholarship` (Select: Yes/No)
  - `total_amount_per_month` (labelled **Grand Total Amount**; auto-computed and read-only — see below)
- **Monthly cap enforcement:** Real-time fetch of each student's existing honorarium + top-up total; blocks save/submit if the engagement-wide cap is exceeded (see *Limits & Auto-Calculation*)
- **Project auto-link:** Selecting `project_code` auto-fills `project_title` and coordinating PI
- Supports both **draft save** and **submit for approval**

**API calls used:**
- `rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_top_up_fellowship_fields`
- `rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.save_top_up_fellowship_data`
- `rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.submit_top_up_fellowship`
- `rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_student_details`
- `rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_students_monthly_summary`

**Routes:** `/top-up-fellowship` (new application), `/top-up-fellowship?project=<name>` (pre-filled from project)

#### Limits & Auto-Calculation

All of this is computed client-side from the row's `period_from`, `period_to`, `hours_per_month`, `rate_per_hour` and `stipend_or_scholarship`.

| Item | Rule |
|---|---|
| **Months** | Inclusive count of calendar months from Period From to Period To (`monthsForRow`). 01-Jan → 31-Mar = 3. Missing/invalid/backwards dates count as 1. |
| **Days** | Inclusive day count (`daysForRow`). 01-Jan → 31-Mar = 90. |
| **Grand Total Amount** | `hours_per_month × rate_per_hour × months`, written into `total_amount_per_month` whenever any of those four fields changes (in `handleTableRowChange`). The field is forced `read_only` when child fields are loaded. |
| **Per-month cap** | ₹50,000 (value reported by the backend `get_students_monthly_summary`, seeded at 50,000) or ₹25,000 (`STIPEND_OR_SCHOLARSHIP_CAP`) when `stipend_or_scholarship = Yes`. |
| **Engagement cap** | per-month cap × months (`totalCapForRow`). Example: 3 months → ₹75,000 with stipend/scholarship, ₹1,50,000 without. |
| **Check** | `already received + Grand Total Amount > engagement cap` → "Over by ₹…" in the panel and a blocking alert on Save. |

**Monthly Limit Status panel** (above the form) shows per student: stipend/scholarship flag, Period (Days), Months, Honorarium / Top Up this month, Already Received, Requesting now (total), Max Allowed Now and a Within cap / Over by status. A footer row shows the totals of days and months and the **Grand Total Amount** across all students. A highlighted note beneath the table explains what is counted, with examples.

**Known limitation:** "Already received" comes from `get_students_monthly_summary`, which works per month and is queried for the month of Period From only. For multi-month ranges, amounts already received in the later months are not counted.

**Row editor hints** (in `ChildTableComponent.tsx`): under Period To a hint shows `Duration: N days or M months` once both dates are valid (red warning if Period To is before Period From). It is keyed on the `period_to` fieldname, so any child table with that field shows it. Hours / Month and Rate / Hour show their existing limit hints (max 50 hours; ₹100–₹1000).

**Date format:** Date fields display and accept `dd/mm/yyyy` via `src/components/ui/date-input-dmy.tsx` (`DateInputDMY`), used by both `ChildTableComponent` and `DynamicFormRenderer` — so this applies to every Date field app-wide, not only this form. The stored/API value stays `YYYY-MM-DD`. Native `<input type="date">` cannot be forced to a format because it follows the OS locale; the component is a masked text input plus a calendar button that opens the native picker.

---

### `src/pages/application/TopUpFellowshipDetails.tsx`

**Purpose:** Read-only view for a submitted Top-Up Fellowship document.

**Key functionality:**
- Displays all form fields in read-only mode
- Shows full workflow timeline (Draft → PI Approval → Head → R&D Staff → HoS → Dean → Approved)
- Shows approval chain with timestamps and actor names
- Displays monthly limit status per student
- Comments/notes field visible on rejection states

**Route:** `/top-up-fellowship/:id`

---

### `src/pages/application/TopUpFellowshipFacultyAdmission.tsx`

**Purpose:** Portal for R&D Staff to manage the Faculty Admission signed-PDF sub-workflow.

**Workflow:**
1. R&D Staff sees a list of Top-Up Fellowship docs at `Pending Staff Approval` awaiting Faculty Admission processing
2. Staff downloads the auto-generated application PDF (Frappe print format)
3. Physical PDF is sent to Faculty Admission office for signature
4. Staff uploads the signed scan back through this page
5. Upload unblocks the "Forward to HoS" action in the workflow

**API calls used:**
- `topUpFellowshipAPI.getPendingFacultyAdmissionUploads`
- `topUpFellowshipAPI.attachFacultyAdmissionPdf`

**Route:** `/top-up-fellowship-faculty-admission` (restricted to `staff, RnD` role)

---

## Modified Files

### `src/main.tsx`

**Changes:**
- Added 3 imports:
  ```ts
  import TopUpFellowshipForm from './pages/application/TopUpFellowshipForm.tsx';
  import TopUpFellowshipDetails from './pages/application/TopUpFellowshipDetails.tsx';
  import TopUpFellowshipFacultyAdmission from './pages/application/TopUpFellowshipFacultyAdmission.tsx';
  ```
- Added 3 routes:
  ```ts
  { path: "top-up-fellowship", element: <AuthRouteWrapper allowedRole="All_ProRnd_User"><TopUpFellowshipForm /></AuthRouteWrapper> }
  { path: "top-up-fellowship/:id", element: <AuthRouteWrapper allowedRole="All_ProRnd_User"><TopUpFellowshipDetails /></AuthRouteWrapper> }
  { path: "top-up-fellowship-faculty-admission", element: <AuthRouteWrapper allowedRole="staff, RnD"><TopUpFellowshipFacultyAdmission /></AuthRouteWrapper> }
  ```

---

### `src/services/apiService.ts`

**Changes:** Added `topUpFellowshipAPI` export:
```ts
export const topUpFellowshipAPI = {
    getPendingFacultyAdmissionUploads: `${API_BASE}.top_up_fellowship.top_up_fellowship.get_pending_faculty_admission_uploads`,
    attachFacultyAdmissionPdf: `${API_BASE}.top_up_fellowship.top_up_fellowship.attach_faculty_admission_pdf`,
};
```

---

### `src/utils/projectTypeMapping.ts`

**Changes:** Registered `Top Up Fellowship` DocType so that pending task resolution and project filtering work correctly:
```ts
'Top Up Fellowship': {
    primary: { type: 'pr_name', field: 'project_code' },
},
```
The `project_code` field in the DocType stores a Link to `Project Registration` by document name.

---

### `src/components/RndSidebar.tsx`

**Changes:**
- Added "Faculty Admission PDF Upload" menu item in the `staff, RnD` role menu section, positioned after "Upload Director PDF":
  ```ts
  {
      label: "Faculty Admission PDF Upload",
      icon: FileText,
      path: "/top-up-fellowship-faculty-admission",
  }
  ```
- Added `HelpModule` component integration (User Manual modal accessible from sidebar footer for all roles)

---

### `src/pages/ProjectDetailsOverview.tsx`

**Changes (4 locations):**

1. **Disbursal section items** — uncommented `"Top Up Fellowship"` so it appears as a selectable application type under the Disbursal category
2. **Fetch logic** — added a fetch block for `Top Up Fellowship` records filtered by `project_code` matching the current project, mapped with `applicant_webmail` from `pi_webmail`
3. **`handleApplyNew`** — replaced placeholder `alert()` with proper navigation:
   ```ts
   onNavigate(`/top-up-fellowship?project=${projectName}&projectTitle=${...}`)
   ```
4. **Item click navigation** — added `case "Top Up Fellowship"` to navigate to `/top-up-fellowship/:id`

---

### `src/pages/PendingTaskDetails.tsx`

**Changes (6 locations):**

1. **Excluded display fields** — added `send_to_faculty_admission`, `checkbox1`, `checkbox2`, `checkbox3` to the fields-to-hide list so internal Top-Up flags don't appear in the generic detail view

2. **`TopUpFellowshipWorkflowActions` component** — full 3-stage Pending Staff Approval flow:
   - **Stage 1** (not sent to FA): Shows "Send to Faculty Admission" button (downloads PDF + marks flag). Dynamic put-back buttons included.
   - **Stage 2** (sent but no signed PDF): Shows disabled "Waiting for Faculty Admission Upload" button.
   - **Stage 3** (signed PDF uploaded): Shows "View Faculty Admission Signed PDF" + normal workflow action buttons. Forward is blocked until a budget commit is submitted (`commitRequired` gate).
   - All other states: renders available workflow actions normally.

3. **`topUpDeptNames` resolver** — `useEffect` that fetches `Department_prornd` records to resolve `dept_centre` Link IDs to readable `dept_name` values for display in the students child table.

4. **Workflow action render** — renders `<TopUpFellowshipWorkflowActions>` in the header action area when `doctype === "Top Up Fellowship"`

5. **Child table cell display** — when rendering the `students` table, `dept_centre` values are resolved through `topUpDeptNames` map before display

6. **`BudgetActionsSidebar`** — renders the commit/staging panel in the right sidebar when:
   - `doctype === "Top Up Fellowship"`
   - User is R&D Staff
   - `workflow_state === "Pending Staff Approval"`
   - `data.project_code` is present

---

## Workflow States

```
Draft
  ↓ Submit
Pending PI Approval
  ↓ Approve
Pending Head Approval
  ↓ Approve
Pending Staff Approval   ← R&D Staff: send PDF to Faculty Admission, upload signed scan
  ↓ Forward (after signed PDF uploaded + budget commit)
Pending HoS Approval
  ↓ Approve
Pending Dean Approval
  ↓ Approve
Approved
```

Any state supports dynamic **put-back** actions (backend-driven, configurable without code changes).

---

## Role Access Matrix

| Role | Access |
|---|---|
| `All_ProRnd_User` (PI, Project Staff) | Create, view, and track own applications |
| `head_approver_1` | Approve/reject at Head stage |
| `staff, RnD` | Staff Approval stage + Faculty Admission PDF upload portal |
| `Hos, RnD` | HoS Approval stage |
| `Dean, RnD` | Dean Approval stage |

---

## Backend Endpoints Required

All endpoints follow the Frappe RPC pattern `rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.*`:

| Method | Purpose |
|---|---|
| `get_top_up_fellowship_fields` | Form field definitions |
| `save_top_up_fellowship_data` | Save draft |
| `submit_top_up_fellowship` | Submit for approval |
| `get_student_details` | Auto-fetch roll number + dept on email selection |
| `get_students_monthly_summary` | Monthly payment totals for cap validation |
| `get_top_up_fellowship_workflow_actions` | Available workflow actions for current user |
| `perform_top_up_fellowship_action` | Execute approve/reject/forward |
| `mark_send_to_faculty_admission` | Set `send_to_faculty_admission = 1` flag |
| `get_available_back_actions` | Dynamic put-back actions |
| `put_back` | Execute a put-back to a prior workflow state |
| `get_pending_faculty_admission_uploads` | List docs awaiting signed PDF |
| `attach_faculty_admission_pdf` | Attach uploaded signed PDF to the doc |
