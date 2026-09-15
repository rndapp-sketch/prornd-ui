# Per-Head Commitable Balance — Implementation Guide

## Overview

The sidebar budget card shows the **commitable balance broken down by each budget head**, not just a single total. Only heads that have actually received funds are shown. Negative balances (overcommitted) render in red.

---

## Architecture

```
useProjectBudget(projectCode)
  ├── heads: string[]                        ← budget head names
  ├── headBalances: Record<string, HeadBalance>   ← per-head numbers
  └── actualBalance: number                  ← grand total

Sidebar card
  ├── Total Commitable Balance (header)
  ├── Per-head rows (filtered: received !== 0)
  │     ├── Head name (truncated)
  │     └── Commitable balance (green / red)
  └── View Project Ledger button
```

---

## HeadBalance Shape

From `src/hooks/useProjectBudget.ts`:

```ts
export interface HeadBalance {
  actual: number;       // received − payment
  commitable: number;   // received − committed − payment
  received: number;     // total fund received for this head
  committed: number;    // total committed amount
  payment: number;      // total payments made
  id: number;           // Budget Head numeric ID (used by ledger API)
}
```

---

## Step-by-Step Implementation

### Step 1 — Pull `headBalances` from the hook

```tsx
const {
    budgetData,
    heads: budgetHeads,
    headBalances,      // ← add this
    actualBalance,
} = useProjectBudget(projectCode);
```

### Step 2 — Render the sidebar card

```tsx
<div className="bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">

    {/* Total header */}
    <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Commitable Balance
        </span>
        <span className="text-sm font-bold text-[#D97757]">
            ₹ {(actualBalance || 0).toLocaleString("en-IN")}
        </span>
    </div>

    {/* Per-head breakdown — only heads with funds received */}
    {budgetHeads.filter((h) => headBalances[h]?.received !== 0).length > 0 && (
        <div className="mb-2 divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden">
            {budgetHeads
                .filter((h) => headBalances[h]?.received !== 0)
                .map((head) => {
                    const bal = headBalances[head];
                    if (!bal) return null;
                    const isNegative = bal.commitable < 0;
                    return (
                        <div
                            key={head}
                            className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/50"
                        >
                            <span
                                className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[130px]"
                                title={head}
                            >
                                {head}
                            </span>
                            <span
                                className={cn(
                                    "text-[11px] font-bold tabular-nums",
                                    isNegative
                                        ? "text-red-500"
                                        : "text-emerald-600 dark:text-emerald-400",
                                )}
                            >
                                ₹ {bal.commitable.toLocaleString("en-IN")}
                            </span>
                        </div>
                    );
                })}
        </div>
    )}

    {/* Ledger button */}
    <button
        onClick={() => setIsLedgerOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-[#D97757] font-semibold text-xs hover:bg-[#B2DFDB] transition-colors"
    >
        View Project Ledger
    </button>
</div>
```

---

## Step 3 — Add Total footer row

Always append a "Total" row at the bottom of the per-head table so users can cross-check the sum:

```tsx
{/* Total row — always rendered after per-head rows */}
<div className="flex items-center justify-between px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
    <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
        Total
    </span>
    <span className={cn(
        "text-[11px] font-bold tabular-nums",
        actualBalance < 0 ? "text-red-500" : "text-[#D97757]",
    )}>
        ₹ {(actualBalance || 0).toLocaleString("en-IN")}
    </span>
</div>
```

## Step 4 — Highlight the selected head (CommitPayment sync)

When `CommitPayment` has a head selected, highlight that row so it's visually linked to the "Available" balance shown in the form. Use the `selectedCommitHead` state (driven by `onHeadChange` callback — see [[PROJECT_LEDGER_BALANCE.md]]):

```tsx
const isSelected = selectedCommitHead === head;
<div className={cn(
    "flex items-center justify-between px-3 py-1.5",
    isSelected
        ? "bg-[#D97757]/10 dark:bg-[#D97757]/15 ring-inset ring-1 ring-[#D97757]/30"
        : "bg-zinc-50 dark:bg-zinc-900/50",
)}>
    <span className={cn(
        "text-[11px] truncate max-w-[130px]",
        isSelected
            ? "font-semibold text-zinc-700 dark:text-zinc-200"
            : "text-zinc-500 dark:text-zinc-400",
    )} title={head}>
        {head}
    </span>
    <span className={cn(
        "text-[11px] font-bold tabular-nums",
        isNegative ? "text-red-500" : "text-emerald-600 dark:text-emerald-400",
    )}>
        ₹ {bal.commitable.toLocaleString("en-IN")}
    </span>
</div>
```

## Key Rules

| Rule | Reason |
|---|---|
| Filter on `received !== 0` | Hides heads that have no funds at all — keeps the card compact |
| Show `bal.commitable`, not `bal.actual` | `commitable = received − committed − payment`; `actual = received − payment` only. Commitable is what matters before forwarding. |
| Red colour when `commitable < 0` | Signals overcommitment — more committed than received |
| `truncate max-w-[130px]` + `title={head}` | Long head names (e.g. "Salaries and Wages") truncate gracefully; full name shows on hover |
| `tabular-nums` | Keeps numbers right-aligned and non-shifting as values change |
| Total footer row | Always append a `Total` row so users can verify the per-head numbers sum correctly |
| Highlight selected head | Orange tint (`bg-[#D97757]/10`) links the sidebar row to the active CommitPayment dropdown selection |

---

## What `commitable` Means

```
Fund Received
    − Committed Amount   (pending/approved commitments not yet paid)
    − Payment Amount     (already paid)
= Commitable Balance     ← what is available to commit to new applications
```

This is calculated inside `useProjectBudget` as:
```ts
commitable: headReceived - headCommitted - headPayment
```

---

## Prerequisites

This card requires:
- `useProjectBudget` wired with the **project code** (not Frappe auto-ID). See [[PROJECT_LEDGER_BALANCE.md]].
- `cn` imported from `@/lib/utils` for conditional class merging.
- `isLedgerOpen` state and `ProjectLedgerModal` added to the page. See [[PROJECT_LEDGER_BALANCE.md]].

---

## Existing Implementation

| Page | Location |
|---|---|
| `IndentGeneralFormDetails` | Sidebar "Project Budget / Ledger" card |
