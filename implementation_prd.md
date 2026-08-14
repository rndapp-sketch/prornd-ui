# Product Requirements Document (PRD): UI Data Resolution & Auto-fill

## 1. Introduction
This document defines the requirements for improving data presentation and entry efficiency in the ProRnD UI. The focus is on replacing system IDs with human-readable names and automating the entry of user details.

## 2. Problem Statement
-   **Obscure IDs:** Users currently see internal IDs (e.g., `DEPT-004`, `HEAD-02`) instead of meaningful names (e.g., "Computer Science", "Equipment") in several parts of the application.
-   **Repetitive Entry:** Users frequently have to manually enter their basic details (Name, Designation, Employee ID, Department) for every new application, leading to frustration and potential errors.

## 3. Goals
-   **Enhanced Readability:** Ensure all IDs for Departments, Budget Heads, and Account Heads are displayed as their respective human-readable names.
-   **Efficiency:** Automate the population of user-specific fields in forms to reduce manual entry time.
-   **Consistency:** Standardize how these data points are fetched and displayed across the application.

## 4. Functional Requirements

### 4.1. Department Name Display
-   **Requirement:** Any interface displaying a Department ID MUST resolve it to the `Department Name`.
-   **Component:** Use the standardized `DepartmentName` component.
-   **Behavior:** Show a loading state or the ID itself primarily while fetching, then replace with the Name.

### 4.2. Budget & Account Head Resolution
-   **Requirement:** Budget Heads and Account Heads in lists, details views, and dropdowns MUST display the `budget_head` name.
-   **Mapping:** 
    -   Source: `Budget Head` Doctype.
    -   Field: `budget_head` (Name) vs `name` (ID).

### 4.3. User Details Auto-fill
-   **Requirement:** Forms requiring applicant details MUST auto-fill the following fields from the logged-in user's profile or selected user:
    1.  **Full Name**
    2.  **Department** (`department_name`)
    3.  **Designation** (`designation_name`)
    4.  **Employee ID** (`employee_id`)
-   **Trigger:** On form load (for logged-in user) or on selection of a User ID field.

## 5. User Flows

### 5.1. Viewing a Application Details
1.  User navigates to an application details page (e.g., Fund Received, Reimbursement).
2.  System fetches the document.
3.  System asynchronously resolves IDs for Department and Account Heads.
4.  UI updates to show "Computer Science" instead of "CSE-01".

### 5.2. Creating a New Application
1.  User opens a new form (e.g., Travel Application).
2.  Form initializes.
3.  System fetches current user's details.
4.  Fields for Name, Department, Designation, and Employee ID are pre-filled.
5.  User verifies details and proceeds to enter transaction data.

## 6. Technical Constraints & Assumptions
-   **Frappe API:** All data resolution depends on the availability and speed of `frappe.client.get_value` or `get_list` APIs.
-   **Data Integrity:** Assumes `Department_prornd` and `Budget Head` doctypes are correctly populated in the backend.
-   **User Profile:** Assumes `User` doctype contains up-to-date `employee_id`, `department_name`, and `designation_name`.

## 7. Success Metrics
-   Zero instances of raw IDs displayed in the "Department" and "Account Head" columns of key reports.
-   Reduction in time-to-submit for standard applications due to auto-fill.
