# UI Common Patterns and Skills (`uiskill.md`)

This document outlines common UI patterns and implementation skills used in the ProRnD UI codebase, specifically focusing on data resolution (IDs to Names) and auto-filling user details.

## 1. Department Name Resolution

**Problem:** The backend often returns Department IDs (e.g., `DEPT-001`) but the UI needs to display human-readable names.
**Solution:** Use the reusable `DepartmentName` component.

### Implementation
The `DepartmentName` component takes a `name` prop (the ID) and fetches the `dept_name` from the `Department_prornd` doctype.

```tsx
import { DepartmentName } from "@/components/DepartmentName";

// Usage in JSX
<DepartmentName name={departmentId} />
```

**Key Code (`components/DepartmentName.tsx`):**
```tsx
const { data } = useFrappeGetCall<{ message: { dept_name: string } }>(
    "frappe.client.get_value",
    {
        doctype: "Department_prornd",
        fieldname: "dept_name",
        filters: { name: name }
    },
    { enabled: !!name }
);
```

## 2. Budget Head / Account Head Conversion

**Problem:** Forms need to display "Equipment" instead of "6", or "Consumables" instead of "Travel Grant".
**Solution:** Fetch the `Budget Head` list and map IDs to `budget_head`.

### Implementation
1.  **Fetching List:** Use `frappe.client.get_list` (or `get_value` for single items) to get the mapping.
2.  **Dropdowns:** When populating `link_options` for forms, ensure the `label` is the human-readable name and `value` is the ID.

**Example Pattern (`pages/FundReceivedDetails.tsx`):**
```tsx
// Fetching Budget Head details
const response = await fetch('/api/method/frappe.client.get_list', {
    method: 'POST',
    body: JSON.stringify({
        doctype: 'Budget Head',
        filters: { name: headId },
        fields: ['name', 'budget_head', 'id']
    })
});

// Mapping for Display
const nameMap = { [headId]: result.message[0].budget_head };
```

**Usage in Forms:**
When using `FormRender`, ensure `linkOptions` are populated with `{ label: 'Equipment', value: 'HEAD-001' }`.

## 3. User Details Fetching & Auto-fill

**Problem:** Applications require auto-filling applicant details like Name, Department, Designation, and Employee ID.
**Solution:** Fetch the `User` doctype for the current user or a selected user.

### Fetching User Data
Use `useFrappeGetDoc` to fetch specific fields from the `User` doctype.

**Key Fields:**
-   `full_name`: Display Name
-   `department_name`: Department
-   `designation_name`: Designation
-   `employee_id`: Employee Number/ID
-   `name`: Email/ID (often used as the link)

**Example (`pages/UserDetails.tsx` & `ReimbursementDetails.tsx`):**
```tsx
const { data: user } = useFrappeGetDoc("User", userId, {
    fields: [
        'full_name',
        'department_name',
        'designation_name',
        'employee_id' // Added based on requirements
    ]
});

// Accessing data
const employeeId = user?.employee_id;
const designation = user?.designation_name;
```

### Auto-fill Logic (`useFrappeFetchFrom`)
The `useFrappeFetchFrom` hook automates filling fields when a source field changes.

**How it works:**
1.  Define fields with a `fetch_from` property (e.g., `fetch_from="project_title.pi_userid"`).
2.  The hook watches the source field (`project_title`).
3.  When it changes, it fetches the source document and extracts the property (`pi_userid`).
4.  It updates the form data automatically.

**Usage:**
```tsx
useFrappeFetchFrom(formData, setFormData, fields);
```

## 4. User Role Checks
To conditionally render UI elements based on roles (e.g., hiding buttons for non-staff), use the `useUserRoleChecks` hook.

```tsx
import { useUserRoleChecks } from "@/components/UserRoleCheck";

const { isPermanentEmployee, isRndMiscellaneous } = useUserRoleChecks();

if (isRndMiscellaneous) {
    // Show specific features
}
```

## 5. Handling Child Tables and Project Details Rendering

**Problem:** Child tables (like "Additional PIs") fail to render or display "0" for text fields in Project Details views.
**Causes:**
1.  **Strict Boolean Checks:** Using `=== "Yes"` when the backend might return `1` or `true`.
2.  **Hardcoded Numeric Formatting:** Generic table components forcing `parseFloat` on text columns.
3.  **Component Reuse:** Editing `ProjectDetailsOverview.tsx` while the view actually uses `ProjectDetails.tsx` (via `PendingTaskDetails.tsx`).
4.  **Aggressive Caching:** `useFrappeGetDoc` with `dedupingInterval` returning stale data without child tables.

**Solutions:**

### 1. Robust Conditional Rendering
Avoid strict value checks. Check for data presence instead.

```tsx
// ❌ Avoid: Specific value check
{data?.is_additional_pi === "Yes" && <TableDisplay ... />}

// ✅ Preferred: Check if data exists
{data?.additional_pi_table && data.additional_pi_table.length > 0 && (
  <TableDisplay data={data.additional_pi_table} ... />
)}
```

### 2. Flexible Table Components
Ensure your `TableDisplay` component handles both budget (numeric) and personnel (text) tables.

```tsx
// In TableDisplay.tsx
const isBudgetTable = columns.some(col => col.fieldname.includes('budget'));

return (
  <TableCell className={isBudgetTable ? "text-right" : "text-left"}>
    {isBudgetTable 
      ? (parseFloat(row[col.fieldname]) || 0).toLocaleString()
      : row[col.fieldname] // Render text as-is
    }
  </TableCell>
);
```

### 3. Data Fetching Configuration
For detailed views with child tables, disable aggressive caching to ensure complete data.

```tsx
const { data } = useFrappeGetDoc("Project Registration", id, {
    enabled: !!id,
    revalidateOnFocus: true,
    cacheTime: 0 // Ensure fresh fetch for child tables
});
```
