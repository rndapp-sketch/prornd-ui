# Employee ID Card Generation Feature

Add an "ID Card Generation" feature to the HR Portal. Project staff submit ID card requests from their dashboard, details auto-fetch from "Project Staff Details", HR verifies and generates printable ID cards.

## User Review Required

> [!IMPORTANT]
> **Doctype naming convention**: Per your instruction, the Frappe doctype folder/file will use `employee_id_card__` (with `__` suffix). The doctype name in Frappe will be `Employee ID Card` and the API path will be: `rndopsapp.rndopsapp.doctype.employee_id_card__.employee_id_card__.*`

> [!IMPORTANT]
> **Backend API assumption**: This plan assumes you will create the corresponding Frappe backend doctype and API endpoints. The frontend will call these APIs following the same patterns as other modules (Leave Module, Resignation, etc.). I will create the API endpoint constants and frontend pages.

> [!WARNING]
> **Photo and Signature uploads**: The `photoPath` and `signPath` fields will be implemented as Frappe `Attach Image` fields. The user will be able to upload photos/signatures directly from the form. These will be stored in Frappe's file system.

## Open Questions

> [!IMPORTANT]
> **Workflow states**: I'm planning the following workflow: `Draft → Submitted → HR Verified → ID Generated`. Should there be additional approval steps (e.g., PI Approval, HoS Approval) before HR sees the request?

> [!IMPORTANT]
> **ID Card template design**: The printable ID card will be generated as a front/back card layout with the institution logo, photo, and details. Should this follow a specific physical card dimension (e.g., standard CR80 card size 85.6mm × 53.98mm)?

> [!IMPORTANT]
> **Valid Upto date**: Should this be auto-calculated (e.g., from `ps_term_completion_date` in Project Staff Details) or should the HR manually set it during verification?

## Proposed Changes

### API Service Layer

#### [MODIFY] [apiService.ts](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260825_01_prornd-ui-pragati_v0.01/src/services/apiService.ts)

Add `employeeIdCardAPI` endpoint constants following the `__` naming convention:

```typescript
export const employeeIdCardAPI = {
    getFields: `${API_BASE}.employee_id_card__.employee_id_card__.get_employee_id_card___fields`,
    save: `${API_BASE}.employee_id_card__.employee_id_card__.save_employee_id_card___data`,
    submit: `${API_BASE}.employee_id_card__.employee_id_card__.submit_employee_id_card__`,
    getList: `${API_BASE}.employee_id_card__.employee_id_card__.get_employee_id_card___list`,
    getWorkflowActions: `${API_BASE}.employee_id_card__.employee_id_card__.get_employee_id_card___workflow_actions`,
    performAction: `${API_BASE}.employee_id_card__.employee_id_card__.perform_employee_id_card___action`,
    getMyDetails: `${API_BASE}.employee_id_card__.employee_id_card__.get_my_id_card_details`,
    verifyByHR: `${API_BASE}.employee_id_card__.employee_id_card__.verify_id_card_by_hr`,
};
```

---

### ID Card Request Form (Project Staff Side)

#### [NEW] [IDCardRequestForm.tsx](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260825_01_prornd-ui-pragati_v0.01/src/pages/application/IDCardRequestForm.tsx)

Full-page form for project staff to request an ID card:

- **Auto-fetch flow**: On mount, calls `get_my_basic_details` (existing `Project Staff Details` API) to pre-populate:
  - `empId` ← `ps_emp_id`
  - `projectNumber` ← `project_no`
  - `fullName` ← `ps_first_name` + `ps_middle_name` + `ps_last_name`
  - `dob` ← `ps_date_of_birth`
  - `bloodgr` ← `ps_blood_group`
  - `phone` ← `ps_phone_number`
  - `marital_status` ← `ps_maritial_status`
  - `designation` ← `ps_designation`
  - `deptName` ← `ps_department_name`
  - `presentAddress` ← `ps_present_address`
  - `permanentAddress` ← `ps_permanent_address`
  - `validUpto` ← `ps_term_completion_date`

- **Editable fields**: All auto-fetched fields are editable (if data is missing or incorrect)
- **Additional fields**: `emer_phone`, `spouseName` (conditional on `marital_status`), photo upload, signature upload
- **Actions**: Save Draft → Submit to HR
- Uses `DynamicFormRenderer` if the backend provides field metadata, otherwise a custom form layout

---

### Project Staff Dashboard Integration

#### [MODIFY] [ProjectStaffDashboard.tsx](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260825_01_prornd-ui-pragati_v0.01/src/pages/dashboards/ProjectStaffDashboard.tsx)

- Add "ID Card Request" to the `applicationGroups` under a new "Staff Services" sub-item or as its own entry:
  ```typescript
  { label: "ID Card Request", description: "Request your Employee ID Card", icon: IdCard, path: "/id-card-request" },
  ```
- Add `Employee ID Card` doc list query to tracking items so submitted requests appear in the "Track Applications" tab

---

### HR Portal - ID Card Verification & Generation

#### [MODIFY] [HRPortal.tsx](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260825_01_prornd-ui-pragati_v0.01/src/pages/HRPortal.tsx)

Add "ID Card Generation" as a quick action that navigates to `/hr-id-card-management`

---

#### [NEW] [HRIDCardManagement.tsx](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260825_01_prornd-ui-pragati_v0.01/src/pages/application/HRIDCardManagement.tsx)

HR-facing page to:
1. **List** all submitted ID card requests (filterable by status: Submitted, HR Verified, ID Generated)
2. **Review** individual requests — view all details, verify/edit
3. **Verify** — HR marks the request as verified after checking all details
4. **Generate & Print** — After verification, generates a printable ID card (front + back) using `html2canvas` + `jspdf` (existing pattern in the codebase)

---

### ID Card Print Template

#### [NEW] [IDCardPrintTemplate.tsx](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260825_01_prornd-ui-pragati_v0.01/src/pages/printformat/IDCardPrintTemplate.tsx)

React component that renders a styled ID card layout:
- **Front**: Institution logo, photo, name, designation, department, emp ID, project no, blood group, valid upto
- **Back**: DOB, phone, emergency phone, marital status, spouse name, present address, permanent address, signature
- Standard CR80 card dimensions (85.6mm × 53.98mm)
- Print-ready CSS with `@media print` styles

---

### Router Configuration

#### [MODIFY] [main.tsx](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260825_01_prornd-ui-pragati_v0.01/src/main.tsx)

Add routes:
```typescript
// Project Staff - ID Card Request Form
{
    path: "id-card-request",
    element: (
        <AuthRouteWrapper allowedRole="All_ProRnd_User">
            <IDCardRequestForm />
        </AuthRouteWrapper>
    )
},
// HR - ID Card Management
{
    path: "hr-id-card-management",
    element: (
        <AuthRouteWrapper allowedRole={["staff, RnD", "Hos, RnD (Head of Section, RnD)"]}>
            <HRIDCardManagement />
        </AuthRouteWrapper>
    )
},
```

---

### Sidebar Navigation

#### [MODIFY] [RndSidebar.tsx](file:///home/iitg_oc_2025/OC_2025/PRORND_UI/20260825_01_prornd-ui-pragati_v0.01/src/components/RndSidebar.tsx)

- Add "ID Card Request" menu item for `project staff` role
- Add "ID Card Management" menu item visible to `staff, RnD` role (HR)

## Verification Plan

### Automated Tests
- No existing test framework detected for component tests. Manual verification only.

### Manual Verification
1. **Build check**: `yarn build` to verify no TypeScript/compilation errors
2. **Project Staff flow**: Login as project staff → navigate to ID Card Request → verify auto-fetch from Project Staff Details → fill missing fields → Save Draft → Submit
3. **HR flow**: Login as staff, RnD → navigate to HR ID Card Management → view submitted requests → verify details → generate & print ID card
4. **Print verification**: Verify the generated ID card renders correctly at standard card dimensions
