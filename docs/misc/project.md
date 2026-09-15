# ProRnd UI (Frontend) Project Documentation

## 1. Project Overview

**ProRnd UI** is a modern React-based frontend application designed for managing Research and Development (R&D) operations. It serves as the user interface for the `rndopsapp` Frappe backend. The application handles various aspects of project management, including project registration, funding management, staff management, reimbursement, travel applications, and payment processing.

The detailed aesthetic focus (glassmorphism, animations) suggests a high priority on user experience (UX) and visual quality.

## 2. Technology Stack

*   **Core Framework**: React 19
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS v4, Vanilla CSS (for custom variables)
*   **UI Components**: Radix UI (primitives), Lucide React (icons)
*   **Backend Integration**: `frappe-react-sdk` (User Authentication, DB interaction via RPC)
*   **Routing**: `react-router-dom` v7
*   **State/Data Fetching**: `swr` (via frappe-react-sdk), `zustand` (implied dependency)
*   **Theme**: Light/Dark mode via `src/components/theme-provider`

## 3. Project Structure

The project follows a standard Vite + React structure:

```
prornd-ui/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components (Sidebar, AuthWrapper, UI primitives)
│   ├── hooks/           # Custom hooks (e.g., useUserRoles)
│   ├── pages/           # Page components representing routes
│   │   ├── application/ # Application-specific forms (Travel, Advance, etc.)
│   │   ├── dashboards/  # Role-specific dashboards
│   │   └── ...          # Core pages (ProjectDetails, Login, etc.)
│   ├── services/        # Service layer (if any centralized logic exists)
│   ├── styles/          # Global styles
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Helper functions
│   ├── App.tsx          # Main layout and global provider setup
│   └── main.tsx         # Application entry point and Router configuration
├── vite.config.ts       # Vite configuration (proxy setup, plugins)
└── package.json         # Dependencies and scripts
```

## 4. Core Architecture

### 4.1. Entry Point & Routing
*   **`src/main.tsx`**: Initializes the React application. It configures the `FrappeProvider` (specifying the Frappe site URL and socket port) and sets up the router using `createBrowserRouter`.
*   **Router**: A comprehensive routing configuration is defined in `main.tsx`. Routes are protected using a wrapper component.

### 4.2. Authentication & Security
*   **`FrappeProvider`**: Wraps the entire app to provide authentication context from `frappe-react-sdk`.
*   **`src/components/AuthRouteWrapper.tsx`**: A Higher-Order Component (HOC) protecting routes.
    *   Checks if `currentUser` is logged in.
    *   Fetches user roles using `useUserRoles`.
    *   Verifies if the user has the `allowedRole` for the specific route.
    *   Redirects unauthorized users to `/login` or `/dashboard`.

### 4.3. Layout & Navigation
*   **`src/App.tsx`**: Acts as the main layout shell.
    *   Handles the Sidebar layout using `SidebarProvider`.
    *   Includes a `GlobalLoader` for route transitions.
    *   Manages the `CommandPalette` and `ThemeToggle`.
*   **`src/components/RndSidebar.tsx`**: Renders the dynamic sidebar.
    *   Menu items are filtered based on the user's role (fetched via `useUserRoles`).
    *   Categories include: Projects, HR Portal, Pending Tasks, Task Registry, Payments.
    *   Displays a "Pending Task" badge/counter.

## 5. Key Modules & Functional Areas

### 5.1. Dashboarding
The application routes users to different dashboards based on their role upon login (logic inside `src/pages/Dashboard.tsx`):
*   **Director**: `/director-dashboard`
*   **Dean R&D**: `/dean-dashboard`
*   **Head of Section**: `/hos-rnd-dashboard`
*   **PI/Permanent Employee**: `/pihomepage`
*   **R&D Staff**: `/rnd-staff-dashboard`
*   **Project Staff**: `/project-staff-dashboard`

### 5.2. Project Management
*   **Project Registration**: (`/project-registration`) Form to create new projects.
*   **Project Views**:
    *   `src/pages/ProjectsView.tsx`: Lists projects.
    *   `src/pages/ProjectDetails.tsx`: Main view for a project. Displays:
        *   **Overview**: Basic details.
        *   **Investigators**: PIs and Co-PIs.
        *   **Funding**: Budget heads and allocation.
        *   **Files**: Associated documents.
        *   **Activity Log**: Comments and history.
        *   **Workflow Actions**: Approve/Reject buttons via `WorkflowActions` component.
    *   `src/pages/ProjectDetailsOverview.tsx`: An alternative or specific view for project overviews.
    *   `src/pages/AddFundSanction.tsx` / `AddFundReceived.tsx`: Managing project funds.

### 5.3. HR Portal
*   **`src/pages/HRPortal.tsx`**: Manages human resources for projects. Likely includes recruitment, staff lists, and resignation handling.

### 5.4. Financial & Applications
This module handles various financial requests and settlements. Files are located in `src/pages/application/` and root `pages`:
*   **Temporary Advance**: `TemporaryAdvance.tsx` (List) & `TemporaryAdvanceDetails.tsx` (Form/View).
*   **Travel**: `TravelForm.tsx` & `TravelDetails.tsx`.
*   **Reimbursement**: `Reimbursement.tsx` & `ReimbursementDetails.tsx`.
*   **Payments**: `src/pages/Payments.tsx`. Handles payment processing, likely for accountants or admin staff.
*   **Deposit Slip**: `DepositSlipForm.tsx`.

### 5.5. Workflow & Tasks
*   **`src/pages/PendingTask.tsx`**: A centralized inbox for approvers (Director, Dean, HoS) to see items awaiting their action.
*   **`src/pages/TaskRegistry.tsx`**: A registry of all tasks/processes, visible to admin roles.

## 6. Logic & Data Flow

### 6.1. Data Fetching
The application relies heavily on `frappe-react-sdk` hooks:
*   **`useFrappeGetDoc(doctype, name)`**: Fetches a specific document. Used in details pages (e.g., `ProjectDetails.tsx`).
*   **`useFrappeGetCall(method, params)`**: Calls custom backend API methods (RPC). Used for:
    *   Fetching lists with complex filters.
    *   Getting user roles (`rndopsapp.rndopsapp.api.get_user_roles`).
    *   Getting pending task counts.
    *   Fetching activity logs (`rndopsapp.rndopsapp.api.get_project_activity`).

### 6.2. Data Submission
*   **`useFrappePostCall(method)`**: Calls backend methods to modify data. Used for:
    *   Submitting forms.
    *   Workflow actions (Approve/Reject).
    *   Adding comments (`rndopsapp.rndopsapp.api.add_project_comment`).

### 6.3. State Management
*   **Local State**: `useState` is used for form inputs, tab selection, and modal visibility.
*   **Global/Server State**: `SWR` (underlying `frappe-react-sdk`) handles caching and revalidation of server data.
*   **Global UI State**: `Zustand` (implied by `package.json`) might be used for UI states like Sidebar toggles or Command Palette visibility.

## 7. Rendering & Dynamic Components

*   **`DynamicFormPage.tsx`**: Suggests a capability to render forms dynamically based on Doctype metadata, reducing the need for hardcoded forms for simple entities.
*   **Tables**: Uses `@tanstack/react-table` for complex data grids (implied by `package.json`, though simple `Table` components from `shadcn/ui` are also seen).
*   **PDF/Export**: Integrates `jspdf` and `html2canvas` for generating reports or downloading views.

## 8. Development & Deployment
*   **Proxy**: `vite.config.ts` sets up a proxy to forward API requests to the Frappe backend (`prornd.local` or similar) during development.
*   **Build**: Builds into `../rndopsapp/public/frontend`, indicating it is served as a static asset within the Frappe app structure.
