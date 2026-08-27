# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite frontend application for an R&D Operations Management System (ProRnD) for IIT Guwahati. It connects to a **Frappe/ERPNext backend** and manages the complete lifecycle of research projects, funding, staff management, and financial operations.

## Development Commands

```bash
yarn install       # Install dependencies
yarn dev           # Start dev server on port 8081 with HMR
yarn build         # Production build
yarn lint          # ESLint checks
yarn preview       # Preview production build
```

### Build Notes
- Build output goes to `../rndopsapp/public/frontend/` (Frappe app directory)
- Post-build, `index.html` is copied to `../rndopsapp/www/rndopsapp.html`
- Production base path: `/assets/rndopsapp/frontend/`
- No meaningful test suite — only a single near-empty test file exists

## Architecture Overview

### Backend Integration (Frappe)

- **Site**: `prornd.local` (configured in [src/App.tsx](src/App.tsx))
- **FrappeProvider**: Wraps the app via `frappe-react-sdk`; SWR auto-revalidation is disabled globally to prevent unnecessary backend calls
- **Socket Port**: 9001 for real-time updates
- **Proxy**: Dev server proxies to multiple backends (see [proxyOptions.ts](proxyOptions.ts)):
  - Frappe API: `http://172.16.131.206:8000`
  - Ledger API (`/ledger-api`): `http://172.16.134.81:18080`
  - MinIO files (`/prod-rnd-files`): `http://172.16.135.118:9000`
  - Appwrite messaging (`/appwrite`): `http://172.16.134.179:9080`
  - Attendance API (`/attendance-api`): `http://172.16.135.27:7078`
  - Candidate API: External Node server at port 8091

### File Storage

Files are stored in two places, resolved dynamically in [src/utils/fileUtils.ts](src/utils/fileUtils.ts):

- **MinIO** (`prod-rnd-files` bucket): Used for document attachments in specific doctypes (`Project_Registration`, `direct_purchase`, `indent_general_form`, `proprietary_purchase`, `standerdized_purchase`)
- **Frappe** (`/files/`, `/private/files/`): Used for all other doctypes

`fileUtils.ts` auto-detects the correct URL based on the file path and doctype. Always use its helpers when resolving file URLs — do not construct them manually.

### Messaging System (Appwrite)

A separate real-time messaging module lives in [src/pages/messages/](src/pages/messages/) and is **not** backed by Frappe — it uses Appwrite:

- Database: `prornd_messaging`; Collections: `conversations`, `messages`; Bucket: `message_attachments`
- Appwrite endpoint configured via `VITE_APPWRITE_ENDPOINT` and related env vars
- Uses Frappe auth for identity but persists conversations in Appwrite

### Routing Architecture

**React Router v7** with role-based access via `AuthRouteWrapper`. All routes are defined in [src/main.tsx](src/main.tsx).

**Role-Based Dashboards:**
- `/director-dashboard` — Director, Dean RnD, Ado_RnD, HoS RnD
- `/dean-dashboard` — Dean, RnD
- `/head-dashboard` — head_approver_1
- `/hos-rnd-dashboard` — HoS RnD
- `/rnd-staff-dashboard` — staff, RnD
- `/project-staff-dashboard` — project staff
- `/ado-rnd-dashboard` — Ado_RnD

**Application Form Routes (50+ pages):** Travel, TA/DA Settlement, Temporary Advance, Advance Settlement, Direct Purchase, P-11, Sanction Sheet, ICSS, Disbursal of Consultancy/Honorarium, Loan Request, Recruitment forms, Leave Module, Miscellaneous Commit.

**Role Types:**
`All_ProRnd_User`, `Permanent Employee`, `Director`, `Dean, RnD`, `Hos, RnD`, `staff, RnD`, `project staff`, `head_approver_1`, `Ado_RnD`

### API Service Layer

[src/services/apiService.ts](src/services/apiService.ts) centralizes all 30+ Frappe doctype endpoints. Each module follows this pattern:

```typescript
const moduleAPI = {
  getFields: "rndopsapp.api.module.get_fields",
  save: "rndopsapp.api.module.save",
  submit: "rndopsapp.api.module.submit",
  getWorkflowActions: "...",
  performAction: "...",
  // module-specific methods
}
```

`fileToBase64(file)` and `prepareFormDataForApi()` utilities handle Frappe's base64 attachment format before submission.

### Dynamic Form System

Forms are metadata-driven, mirroring Frappe's DocType behavior:

- **DynamicFormRenderer** ([src/components/forms/DynamicFormRenderer.tsx](src/components/forms/DynamicFormRenderer.tsx)): Renders forms from Frappe field metadata; evaluates `depends_on`, `mandatory_depends_on`, `read_only_depends_on` via [src/utils/evalExpression.ts](src/utils/evalExpression.ts)
- **ChildTableComponent**: Manages Frappe child table fields
- **useFrappeClientScript**: Emulates Frappe's client-side script environment, executing `onchange` and `refresh` handlers with mock helpers (`flt`, `cint`, `$`)
- **useFrappeFetchFrom**: Handles Frappe's `fetch_from` field linking

### Print/PDF System

16 print formats follow a consistent pattern — TypeScript utility + HTML template:

- **Templates**: [src/pages/printformat/](src/pages/printformat/) — raw HTML with IIT Guwahati header/footer; imported via Vite's `?raw` query
- **Generators**: [src/utils/](src/utils/) — `dpPrint.ts`, `icssPrint.ts`, `p11Print.ts`, `sanctionSheetPrint.ts`, etc.
- **Pipeline**: populate template HTML → `html2canvas` → `jspdf` → browser download
- **Helpers in each generator**: `fmtNum()` (en-IN, 2 decimals), `fmtDate()` (en-IN locale), `yesNo()`, `SKIP_FIELDS`, `FIELD_LABELS`, `BOOL_FIELDS`, `AMOUNT_FIELDS`

### Workflow & Action Buttons

Each form type has a dedicated `*ActionButtons` component that handles workflow state transitions, PDF download, and director PDF upload. Pattern: fetch available actions from `getWorkflowActions`, render buttons per state, call `performAction`. [src/utils/workflowUtils.ts](src/utils/workflowUtils.ts) maps workflow states to UI.

### Custom Hooks

Located in [src/hooks/](src/hooks/):
- **useProjectBudget**: Project budget allocation calculations
- **useDepositSlipCalculations**: Deposit slip form calculations
- **useStableFrappe**: Stable references to Frappe SDK methods
- **useUserRoles**: Fetches and caches current user's Frappe roles

### Data Fetching (Frappe SDK)

```typescript
useFrappeGetDoc(doctype, name)          // Fetch single document
useFrappeGetDocList(doctype, options)   // Fetch list with filters/fields
useFrappeGetCall(method, params)        // Call server method (GET)
useFrappePostCall(method)               // Call server method (POST)
useFrappeCreateDoc / useFrappeUpdateDoc // Create/update documents
useFrappeFileUpload                     // Upload files
```

### UI Architecture

- **Base components**: [src/components/ui/](src/components/ui/) — Radix UI primitives styled with Tailwind CSS using `class-variance-authority`
- **Business components**: [src/components/](src/components/) — `WorkflowTimeline`, `ActivityLog`, `ProjectLedgerModal`, `CommandPalette` (Cmd+K global search)
- **Sidebar**: [src/components/RndSidebar.tsx](src/components/RndSidebar.tsx) — role-based menu, pending task count badges
- **Theme**: Beige/neutral (`#F9F7F2` background), dark mode supported via `ThemeProvider`
- **Fonts**: `.assamese-text`, `.hindi-text`, `.english-text` classes for multi-language header
- **Icons**: Lucide React + React Icons

### Key Utilities

- `flt()` / `cint()` — Float/integer helpers mimicking Frappe behavior
- `date-fns` v4 — Date manipulation (Frappe dates are `YYYY-MM-DD`)
- `to-words` / `num-words` — Number to words for financial documents
- `use-debounce` — For search/filter inputs
- `@tanstack/react-table` — Advanced data tables
- `recharts` — Charts in dashboards

## Common Development Workflows

### Adding a New Form Page

1. Add API endpoints in [src/services/apiService.ts](src/services/apiService.ts)
2. Create page in `src/pages/application/`
3. Use `DynamicFormRenderer` with fields from Frappe metadata
4. Add `useFrappeClientScript` if the DocType has Frappe client scripts
5. Create a `*ActionButtons` component for workflow transitions
6. Add route in [src/main.tsx](src/main.tsx) with `AuthRouteWrapper` and required roles
7. Add sidebar entry in [src/components/RndSidebar.tsx](src/components/RndSidebar.tsx) if needed

### Adding a New Print Format

1. Create HTML template in `src/pages/printformat/`
2. Create `*Print.ts` in `src/utils/` following existing generator pattern
3. Import template with `?raw` suffix: `import template from '../pages/printformat/my_format.html?raw'`
4. Use `fmtNum`, `fmtDate`, `yesNo` helpers; configure `SKIP_FIELDS`, `FIELD_LABELS`

### Debugging Frappe Integration

- Check DevTools Network tab for `/api/method/` calls
- Verify proxy routing in [proxyOptions.ts](proxyOptions.ts)
- Ensure Frappe session is active (check cookies)
- Socket updates on port 9001

## Path Aliases

`@/` maps to `src/` — configured in [vite.config.ts](vite.config.ts) and [tsconfig.json](tsconfig.json).

## Environment Variables

```env
# Development (.env)
VITE_BASE_PATH=
VITE_FRAPPE_URL=http://localhost:8000
VITE_APPWRITE_ENDPOINT=/appwrite/v1
VITE_APPWRITE_PROJECT_ID=6a0201f20025d8289f76
VITE_APPWRITE_DATABASE_ID=prornd_messaging
VITE_APPWRITE_CONVERSATIONS_COLLECTION_ID=conversations
VITE_APPWRITE_MESSAGES_COLLECTION_ID=messages
VITE_APPWRITE_ATTACHMENTS_BUCKET_ID=message_attachments

# Production (.env.production)
VITE_BASE_PATH=/rndopsapp
VITE_CANDIDATE_API_URL=http://172.16.135.27:8091
VITE_APPWRITE_ENDPOINT=http://172.16.134.179:9080/v1
```

Frappe site config is read from `common_site_config.json` (Frappe backend's config file at project root) to configure the proxy's `webserver_port`.
