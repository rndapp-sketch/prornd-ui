# View Project — Implementation Guide

## Overview

The **View Project** button opens a full `ProjectDetailsOverview` panel inside a modal overlay. It is available on detail pages where a project is linked, letting any user inspect the project registration without leaving the current page.

---

## Architecture

```
PageHeader (actions slot)
└── "View Project" button  →  sets prPreviewName state
      └── ProjectDetailsOverview modal (fixed overlay)
            └── <ProjectDetailsOverview projectName={prPreviewName} embedded />
```

---

## Files Involved

| File | Role |
|---|---|
| `src/pages/ProjectDetailsOverview.tsx` | Self-contained project detail view, accepts `projectName` + `embedded` prop |
| `src/pages/application/XxxDetails.tsx` | Renders the button and modal overlay |

---

## Step-by-Step Implementation

### Step 1 — Import `ProjectDetailsOverview`

```tsx
import ProjectDetailsOverview from "@/pages/ProjectDetailsOverview";
```

### Step 2 — Add state

```tsx
const [prPreviewName, setPrPreviewName] = useState<string | null>(null);
```

### Step 3 — Determine the project name

`ProjectDetailsOverview` expects the **Frappe `name` (auto-ID)** of the `Project Registration` document — the value stored in your Link field, not the human-readable title.

| Doctype | Link field that holds the Frappe project name |
|---|---|
| Indent General Form | `formData.igf_project_title` |
| Disbursal of Honorarium | `formData.project_name` or `formData.project_title` |
| Disbursal of Consultancy | `formData.disbursal_project_number` (may vary) |
| Travel / TA-DA / Reimbursement | check your form's project link field |

```tsx
// Derive once; reuse in both button and modal
const projectName = formData.igf_project_title || ""; // ← your field here
```

### Step 4 — Add the button in `<PageHeader>`

```tsx
{projectName && (
    <button
        onClick={() => setPrPreviewName(projectName)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
    >
        View Project
    </button>
)}
```

The button is only shown when `projectName` is truthy — so it disappears automatically on Draft documents that have no project linked yet.

### Step 5 — Add the modal overlay at the bottom of JSX

Place this **outside `<main>`**, just before the closing `</div>` of the page root:

```tsx
{prPreviewName && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Project Details</h2>
                <button
                    onClick={() => setPrPreviewName(null)}
                    className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xl font-bold leading-none"
                >
                    ×
                </button>
            </div>
            <div className="p-4">
                <ProjectDetailsOverview projectName={prPreviewName} embedded />
            </div>
        </div>
    </div>
)}
```

`max-w-6xl` (1152 px) is the recommended width. Change to `max-w-7xl` for wider screens.

---

## Important: Two Different "Project Names"

Many doctypes store **two project-related values** that look similar but serve different purposes:

| Variable | Field example | Used for |
|---|---|---|
| `projectName` | `formData.igf_project_title` (Frappe auto-ID) | `ProjectDetailsOverview` |
| `projectCode` | `formData.igf_project_code` (human-readable code) | Ledger API, CommitPayment, ProjectLedgerModal |

**Never pass `igf_project_code` to `ProjectDetailsOverview`** — it expects the Frappe doc name (auto-ID). Conversely, **never pass `igf_project_title` (auto-ID) to the ledger API** — the Go service expects the project code string.

See [[PROJECT_LEDGER_BALANCE.md]] for ledger/balance wiring.

---

## Existing Implementations

| Page | Project name field passed |
|---|---|
| `IndentGeneralFormDetails` | `formData.igf_project_title` |
| `IndentCumSanctionSheetForm` | resolved via `setPrPreviewName(prName)` after fetch |
| `TaskRegistryDetails` | `projectName` resolved from selected task |
| `PendingTaskDetails` | `projectName` resolved from task data |
