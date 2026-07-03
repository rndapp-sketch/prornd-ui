# Project Ledger & Balance — Implementation Guide

## Overview

Every detail page that involves money shows two things:
1. **Commitable Balance** — a live number in the sidebar showing how much budget remains.
2. **View Project Ledger** — a button that opens `ProjectLedgerModal` with a full transaction history per budget head.

Both are powered by the `useProjectBudget` hook, which hits the Go ledger service (`/ledger-api`).

---

## Architecture

```
useProjectBudget(projectCode)          ← Go /ledger-api (one call per budget head)
  ├── budgetData: BudgetEntry[]        ← all ledger rows (all heads combined)
  ├── heads: string[]                  ← budget head names
  ├── headBalances: Record<...>        ← per-head received/committed/actual
  ├── actualBalance: number            ← total actual balance (sum across heads)
  └── commitableBalance: number        ← total commitable balance (sum across heads)

Sidebar
  └── Commitable Balance display       ← reads actualBalance or commitableBalance

ProjectLedgerModal
  ├── projectName = projectCode        ← same project code
  └── budgetHeadList                   ← { name, id }[] fetched separately
```

---

## Critical: projectCode vs projectName

The **ledger API uses the project's registration code** (e.g. `IIT-G/CSE/2024/001`), **not** the Frappe auto-ID (e.g. `oti8os9ndm`).

Always derive two separate variables in the component:

```tsx
// For ledger API, CommitPayment, ProjectLedgerModal
const projectCode = formData.igf_project_code || "";   // human-readable code

// For ProjectDetailsOverview only (needs Frappe doc name)
const projectName = formData.igf_project_title || "";  // Frappe auto-ID
```

| Doctype | Project code field | Project name (Frappe ID) field |
|---|---|---|
| Indent General Form | `igf_project_code` | `igf_project_title` |
| Disbursal of Consultancy | `disbursal_project_number` | — |
| Disbursal of Honorarium | `project_name` / `project_title` | — |
| Travel / TA-DA | check your form's project fields | — |

---

## Step-by-Step Implementation

### Step 1 — Import the hook and modal

```tsx
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { ProjectLedgerModal } from "@/components/ProjectLedgerModal";
```

### Step 2 — Add state

```tsx
const [isLedgerOpen, setIsLedgerOpen] = useState(false);
const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);
```

### Step 3 — Fetch budget head list on mount

`ProjectLedgerModal` needs `{ name, id }[]` — the human-readable head name and its numeric ID from the `Budget Head` doctype. Fetch once on mount:

```tsx
useEffect(() => {
    fetch(
        '/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0',
        { credentials: "include" },
    )
        .then((r) => r.json())
        .then((result) => {
            if (result?.data) {
                setBudgetHeadList(
                    result.data.map((item: any) => ({ name: item.budget_head, id: item.id })),
                );
            }
        })
        .catch(() => { /* ignore */ });
}, []);
```

### Step 4 — Call `useProjectBudget`

```tsx
const projectCode = formData.your_project_code_field || "";

const {
    budgetData,
    heads: budgetHeads,
    actualBalance,
    commitableBalance,
} = useProjectBudget(projectCode);
```

`budgetHeads` (string[]) is used by `CommitPayment` to show a head selector.
`actualBalance` is shown in the sidebar.

### Step 5 — Add the sidebar balance card

```tsx
<div className="bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
    <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Commitable Balance
        </span>
        <span className="text-base font-bold text-[#D97757]">
            ₹ {(actualBalance || 0).toLocaleString("en-IN")}
        </span>
    </div>
    <button
        onClick={() => setIsLedgerOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-[#D97757] font-semibold text-xs hover:bg-[#B2DFDB] transition-colors"
    >
        View Project Ledger
    </button>
</div>
```

### Step 6 — Add `ProjectLedgerModal` at the bottom of JSX

Place outside `<main>`, before the closing `</div>` of the page root:

```tsx
<ProjectLedgerModal
    isOpen={isLedgerOpen}
    onClose={() => setIsLedgerOpen(false)}
    projectName={projectCode}       // ← project CODE, not Frappe auto-ID
    budgetHeadList={budgetHeadList}
/>
```

---

## CommitPayment Integration

When a doctype requires staging a financial commitment before forwarding, wire `CommitPayment` using the same data:

```tsx
import { CommitPayment } from "@/components/CommitPayment";

const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);
const [selectedCommitHead, setSelectedCommitHead] = useState("");

// In sidebar, conditionally shown for RnD staff at Pending Staff Approval
{isStaffRnD && workflowState === "Pending Staff Approval" && (
    <CommitPayment
        doctype="Your Doctype Name"
        docName={id || ""}
        projectName={projectCode}              // ← project CODE
        budgetHeads={fundedBudgetHeads}        // ← heads with received > 0
        actualBalance={actualBalance}          // ← from useProjectBudget
        headBalances={headBalances}            // ← per-head balance map
        defaultBudgetHead={accountHeadLabel}   // ← resolved human-readable head name
        onHeadChange={setSelectedCommitHead}   // ← keeps sidebar in sync
        onCommitSuccess={() => handleRefresh()}
        onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
    />
)}
```

### `headBalances` prop behaviour in `CommitPayment`
- "Available" line below the dropdown shows `headBalances[commitHead].commitable` for the selected head (falls back to `actualBalance` if the map is not provided or the head is not in it)
- Submit is **blocked** with an inline error if the entered amount exceeds `headBalances[commitHead].commitable`
- The confirm dialog shows the per-head available balance (not total)

### Sidebar sync via `onHeadChange`
`onHeadChange` fires on every head change (including auto-select). Use `selectedCommitHead` to highlight the active row and update the sidebar balance header:

```tsx
// Sidebar balance card header
<span className="text-xs font-semibold ...">Commitable Balance</span>
<span className="text-sm font-bold ...">
    ₹ {(actualBalance || 0).toLocaleString("en-IN")}
</span>

// Per-head breakdown row — highlight the selected one
const isSelected = selectedCommitHead === head;
<div className={isSelected ? "bg-[#D97757]/10 ring-inset ring-1 ring-[#D97757]/30" : "bg-zinc-50"}>
    ...
</div>

// Total footer row at the bottom of the breakdown table
<div className="flex ... bg-zinc-100 border-t ...">
    <span>Total</span>
    <span>₹ {(actualBalance || 0).toLocaleString("en-IN")}</span>
</div>
```

Then gate the action button:
```tsx
<XxxActionButtons
    docname={id}
    onActionComplete={handleRefresh}
    commitRequired={
        isStaffRnD &&
        isCommittedForGate === false &&
        workflowState === "Pending Staff Approval"
    }
/>
```

---

## What `useProjectBudget` Returns

| Field | Type | Description |
|---|---|---|
| `budgetData` | `BudgetEntry[]` | All ledger rows across all budget heads |
| `heads` | `string[]` | Budget head names (for CommitPayment selector) |
| `headBalances` | `Record<string, HeadBalance>` | Per-head received/committed/actual/commitable |
| `actualBalance` | `number` | Total actual balance (sum across all heads) |
| `commitableBalance` | `number` | Total commitable balance (received − committed − paid) |
| `isLoading` | `boolean` | True while fetching |
| `error` | `string \| null` | Error message if fetch failed |

The hook fetches `/ledger-api/commit-payment-transactions?projectNumber=X&accountHeadId=Y` for **each budget head** concurrently, then aggregates the results.

---

## Existing Implementations

| Page | projectCode field | Shows Commit Gate |
|---|---|---|
| `IndentGeneralFormDetails` | `igf_project_code` | Yes |
| `DisbursalOfHonorariumDetails` | `project_name` / `project_title` | Yes |
| `DisbursalOfConsultancyDetails` | `disbursal_project_number` | Yes |
| `TemporaryAdvanceDetails` | check form fields | Yes |
| `TravelDetails` | check form fields | No |
| `ReimbursementDetails` | check form fields | No |

See [[VIEW_PROJECT.md]] for the View Project button/modal pattern.
See [[ACTION_BUTTON.md]] for the Actions dropdown with commit gate.
