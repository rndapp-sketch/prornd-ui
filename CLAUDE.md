# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite frontend application for an R&D Operations Management System (ProRnD) for IIT Guwahati. The application is built to work as a frontend for a **Frappe/ERPNext backend** and manages the complete lifecycle of research projects, funding, staff management, and financial operations.

## Development Commands

### Setup and Development
```bash
# Install dependencies
yarn install

# Start development server (runs on port 8081)
yarn dev

# Build for production
yarn build

# Lint code
yarn lint

# Preview production build
yarn preview
```

### Important Notes
- The dev server runs on port 8081 with HMR enabled
- Build output goes to `../rndopsapp/public/frontend/` (Frappe app directory)
- After building, `index.html` is copied to `../rndopsapp/www/rndopsapp.html` via the `copy-html-entry` script
- The build uses base path `/assets/rndopsapp/frontend/` for Frappe integration

## Architecture Overview

### Backend Integration (Frappe)

This frontend connects to a **Frappe/ERPNext backend** located at the site `prornd.local`:

- **FrappeProvider**: Wraps the app and connects to the Frappe backend via `frappe-react-sdk`
- **Site Name**: `prornd.local` (configured in [App.tsx](src/App.tsx#L184))
- **Socket Port**: 9001 for real-time updates
- **Proxy Configuration**: Development proxy routes API calls to `http://172.16.117.39:8000` (defined in [proxyOptions.ts](proxyOptions.ts))
- **Additional Ledger API**: Proxies `/ledger-api` to port 18083 for external ledger integration

### State Management

- **SWR**: Used extensively for data fetching and caching via `frappe-react-sdk`
  - Global config in [App.tsx](src/App.tsx#L92-96) disables auto-revalidation to prevent unnecessary refetches
  - Custom hooks leverage SWR for Frappe document operations
- **Zustand**: Used for global state management (imported in package.json)
- **React Context**: ThemeProvider for dark/light mode switching

### Routing Architecture

The app uses **React Router v7** with role-based access control:

- **Public Routes**: Landing page (`/`) and login (`/login`)
- **Protected Routes**: All other routes wrapped in `AuthRouteWrapper` with specific role requirements
- **Route Structure**: Defined in [main.tsx](src/main.tsx) with nested routes
- **Role-Based Dashboards**:
  - Director Dashboard (`/director-dashboard`)
  - Dean Dashboard (`/dean-dashboard`)
  - Head Dashboard (`/head-dashboard`)
  - HoS R&D Dashboard (`/hos-rnd-dashboard`)
  - R&D Staff Dashboard (`/rnd-staff-dashboard`)
  - Project Staff Dashboard (`/project-staff-dashboard`)
- **Main Workflow Pages**:
  - Projects: Registration, Proposal, Endorsement, Details, Analytics
  - Funding: Fund Sanction, Fund Received, Deposit Slips
  - Applications: Travel, TA/DA Settlement, Temporary Advance, Reimbursement, Direct Purchase
  - HR: Staff Recruitment, Resignation, Honorarium
  - Tasks: Pending Tasks, Task Registry, Payments

### Custom Hooks

Located in [src/hooks/](src/hooks/):

- **useFrappeClientScript**: Emulates Frappe's client-side scripting environment in React
  - Registers event handlers (e.g., `onchange`, `refresh`) for Frappe doctypes
  - Provides mock helpers (`flt`, `cint`, `$`) to execute Frappe Python-to-JS scripts
  - Synchronizes form state with Frappe scripts for dynamic behavior
- **useFrappeFetchFrom**: Handles Frappe's `fetch_from` field linking
- **useProjectBudget**: Calculates and manages project budget allocations
- **useDepositSlipCalculations**: Complex calculations for deposit slip forms
- **useStableFrappe**: Provides stable references to Frappe SDK methods

### Dynamic Form System

The application features a sophisticated dynamic form rendering system that mirrors Frappe's DocType behavior:

- **DynamicFormRenderer** ([src/components/forms/DynamicFormRenderer.tsx](src/components/forms/DynamicFormRenderer.tsx)):
  - Renders forms based on field metadata from Frappe backend
  - Supports field dependencies (`depends_on`, `mandatory_depends_on`, `read_only_depends_on`)
  - Evaluates expressions using [evalExpression.ts](src/utils/evalExpression.ts)
  - Handles various field types: Data, Link, Select, Textarea, Date, Check, Attach, Table, etc.
- **ChildTableComponent**: Renders and manages child tables (Frappe's table fields)
- **API Service Layer** ([src/services/apiService.ts](src/services/apiService.ts)):
  - Centralized API endpoints for different doctypes
  - Structured endpoints for: Rate Contract, Travel, TA/DA Settlement, Resignation, Temporary Advance, etc.
  - Each module has: `getFields`, `save`, `submit`, `getWorkflowActions`, `performAction` methods

### UI Component Architecture

- **Base UI Components**: Located in [src/components/ui/](src/components/ui/)
  - Built with Radix UI primitives (Dialog, Dropdown, Select, Checkbox, etc.)
  - Styled with Tailwind CSS using the `class-variance-authority` pattern
  - Custom components: neo-brutalism design system, global-loader, sidebar
- **Business Components**: Located in [src/components/](src/components/)
  - Domain-specific components: WorkflowTimeline, ActivityStream, ProjectLedgerModal
  - Action buttons: TemporaryAdvanceActionButtons, TADASettlementActionButtons, TravelActionButtons
  - Utility components: DepartmentName, BudgetHeadName, ProjectTitle
- **Layout**: AppSidebar ([src/components/RndSidebar.tsx](src/components/RndSidebar.tsx))
  - Role-based menu rendering
  - Pending task count badges
  - User profile display with Frappe user image integration

### Styling

- **Tailwind CSS**: Primary styling solution (configured in [tailwind.config.js](tailwind.config.js))
- **Custom Theme**: Beige/neutral palette (`#F9F7F2` background) with dark mode support
- **Fonts**:
  - Assamese and Hindi text support in header
  - Custom font classes: `.assamese-text`, `.hindi-text`, `.english-text`
- **Icons**: Lucide React for UI icons, React Icons for additional icon sets

### Workflow System

The application integrates with Frappe's workflow engine:

- **Workflow Actions**: Fetched dynamically from backend for each doctype
- **WorkflowTimeline Component**: Visualizes document approval stages
- **Workflow Utilities** ([src/utils/workflowUtils.ts](src/utils/workflowUtils.ts)):
  - Maps workflow states to UI states
  - Determines available actions based on current state and user roles

### Authentication & Authorization

- **Auth Provider**: `useFrappeAuth` from frappe-react-sdk
- **Role-Based Access**: `AuthRouteWrapper` component enforces role requirements
- **User Roles Hook**: `useUserRoles` fetches and caches current user's Frappe roles
- **Role Types**:
  - `All_ProRnd_User`: General R&D users
  - `Permanent Employee`: Faculty/permanent staff
  - `Director`, `Dean, RnD`, `Hos, RnD (Head of Section, RnD)`
  - `staff, RnD`, `project staff`
  - `head_approver_1`, `Ado_RnD`

### Data Fetching Patterns

When working with Frappe data:

1. **Fetch Document**: Use `useFrappeGetDoc(doctype, name, options)`
2. **Fetch List**: Use `useFrappeGetDocList(doctype, options)`
3. **Call Server Method**: Use `useFrappeGetCall(methodName, params, options)` or `useFrappePostCall`
4. **Create/Update**: Use `useFrappeCreateDoc`, `useFrappeUpdateDoc`
5. **File Upload**: Use `useFrappeFileUpload`

### Important Patterns

- **Date Handling**:
  - Frappe dates are in `YYYY-MM-DD` format
  - Use `date-fns` for date manipulation (v4.1.0)
  - ECS date handling in dashboards
- **Number Formatting**:
  - Use `flt()` for floats and `cint()` for integers (mimics Frappe)
  - Use `to-words` or `num-words` for number-to-text conversion
- **PDF Generation**:
  - `html2canvas` + `jspdf` for PDF exports
- **Debouncing**: Use `use-debounce` for search/filter inputs
- **Tables**: `@tanstack/react-table` for advanced data tables

### Key Architectural Decisions

1. **No Auto-Revalidation**: SWR is configured to not revalidate on focus/reconnect to avoid unnecessary backend calls
2. **Global Loader**: Shows only on route navigation, not on data revalidation
3. **Command Palette**: Global search accessible via Cmd+K ([CommandPalette.tsx](src/components/CommandPalette.tsx))
4. **Frappe Integration**: The app is designed to be served from within a Frappe app (`rndopsapp`)
5. **Multi-language Support**: Header displays institution name in Assamese, Hindi, and English

## Common Development Workflows

### Adding a New Form Page

1. Create API endpoints in [src/services/apiService.ts](src/services/apiService.ts)
2. Create a new page component in `src/pages/application/`
3. Use `DynamicFormRenderer` with form fields from Frappe backend
4. Implement client script hooks with `useFrappeClientScript` if needed
5. Add route in [src/main.tsx](src/main.tsx) with appropriate role protection
6. Add menu item in [src/components/RndSidebar.tsx](src/components/RndSidebar.tsx) if needed

### Working with Frappe Client Scripts

When Frappe DocTypes have client scripts that need to run in the React frontend:

1. Fetch the client script from the backend
2. Use `useFrappeClientScript(script, formData, setFormData, doctype)`
3. The hook will execute Frappe's client-side logic (field calculations, validations, etc.)
4. Events like `onchange_fieldname` and `refresh` are automatically registered

### Debugging Frappe Integration

- Check browser DevTools Network tab for API calls to `/api/method/`
- Verify proxy is routing correctly to the Frappe backend
- Ensure Frappe session is active (check cookies)
- Use `console.log` statements in custom hooks to trace data flow

## Path Aliases

The project uses `@/` as an alias for the `src/` directory (configured in [vite.config.ts](vite.config.ts#L18-20) and [tsconfig.json](tsconfig.json#L18-21)).

Example: `import { Button } from "@/components/ui/button"`

## Environment Configuration

The application expects a `common_site_config.json` file at the project root for proxy configuration, containing:
- `webserver_port`: Frappe backend port (default: 8000)
- Other Frappe site configuration

Environment variables (via Vite):
- `VITE_BASE_PATH`: Base path for routing (optional)
- `VITE_FRAPPE_URL`: Frappe backend URL (defaults to `http://localhost:8000`)
