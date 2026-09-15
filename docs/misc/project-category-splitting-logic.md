# How Pending Task & Task Registry split into Research / Consultancy / Others

Both [PendingTask.tsx](../src/pages/PendingTask.tsx) and [TaskRegistry.tsx](../src/pages/TaskRegistry.tsx) show the same three tabs — **Research**, **Consultancy**, **Others** — and use the exact same underlying classification engine, defined once in [`src/utils/projectTypeMapping.ts`](../src/utils/projectTypeMapping.ts). Neither page has its own bespoke logic; they both call into this shared module.

## 1. The core idea

A task/record shown on these pages almost never *is* a Project Registration document — it's something else (a Travel form, a Fund Received doc, a Reimbursement, etc.) that's *linked* to one. To decide whether that record belongs under Research / Consultancy / Others, the code has to:

1. Figure out **which field on that doctype points back to a Project Registration** (or its `project_no`).
2. Read that field's value off the record.
3. Look up the linked Project Registration's `project_type`.
4. Normalize that raw `project_type` string into one of the three tab buckets.

Steps 1–4 are handled by `DOCTYPE_PR_LINKS` + `resolveProjectCategory()` in `projectTypeMapping.ts`.

## 2. `DOCTYPE_PR_LINKS` — the routing table

```ts
export type PRLinkStrategy =
    | { type: 'self' }                                // record IS the Project Registration
    | { type: 'pr_name'; field: string }               // field holds PR's `name` (docname)
    | { type: 'pr_project_no'; field: string }         // field holds PR's `project_no` (human code)
    | { type: 'direct_type'; field: string };          // field already holds project_type text

export interface DoctypePRLink {
    primary: PRLinkStrategy;
    fallback?: PRLinkStrategy;
}
```

`DOCTYPE_PR_LINKS` is a big `Record<string, DoctypePRLink>` — one entry per doctype that can appear in these tables. Full list, exactly as defined in [`projectTypeMapping.ts`](../src/utils/projectTypeMapping.ts):

### Self

| Doctype | Primary | Fallback |
|---|---|---|
| `Project Registration` | `self` — the record itself IS the PR, looked up by its own `name` | — |

### Direct Link doctypes (field stores the PR's `name`)

| Doctype | Primary | Fallback |
|---|---|---|
| `Account Head Payment` | `pr_name` on `project_ref_number` | — |
| `Advance Settlement` | `pr_name` on `project_name` | `pr_project_no` on `project_code` |
| `Deposit slip` | `pr_name` on `project_title` | — |
| `Deposit Slip Project Credit` | `pr_name` on `project_number` | — |
| `Disbursement of Honorarium` | `pr_name` on `project_number` | — |
| `E Non Routine Deposit Slip` | `pr_name` on `project_title` | — |
| `Fund Received` | `pr_name` on `prjreg_title` | — |
| `Fund Sanction` | `direct_type` on `project_type_linked` (fetched via Frappe `fetch_from`) | `pr_name` on `project_proposal` |
| `Indent Cum Sanction Sheet` | `pr_name` on `project_ref` | `pr_project_no` on `project_no` |
| `Indent General Form` | `pr_name` on `igf_project_title` | `pr_project_no` on `igf_project_code` |
| `Loan Request` | `pr_name` on `project_name` | `pr_project_no` on `project_number` |
| `Miscellaneous Commit` | `pr_name` on `project_number` | — |
| `myProjects` | `pr_name` on `project_proposal` | — |
| `payments` | `pr_name` on `project_id` | — |
| `Project Extension` | `pr_name` on `project_ref` | `pr_project_no` on `prj_num` |
| `Project Staff Resignation` | `pr_project_no` on `applicant_prj_num` | — |
| `Project Staff Extension` | `pr_project_no` on `ex_proj_no` | — |
| `proprietary_purchase` | `pr_name` on `project_ref` | `pr_project_no` on `project_no` |
| `Rate Contract` | `pr_name` on `project_number` | — |
| `Reimbursement` | `pr_name` on `project_name` | `pr_project_no` on `project_number` |
| `Research Consultancy Deposit Slip` | `pr_name` on `project_title` | `pr_project_no` on `project_number` |
| `Research Deposit Slip` | `pr_name` on `project_title` | `pr_project_no` on `project_no` |
| `standerdized_purchase` | `pr_name` on `project_ref` | `pr_project_no` on `project_no` |
| `T Testing Deposit Slip` | `pr_name` on `project_title` | — |
| `Travel` | `pr_name` on `travel_project_title` | `pr_project_no` on `travel_project_number` |
| `UC Request` | `pr_name` on `project_id` | — |

### Indirect Data-field-only doctypes (field stores the PR's `project_no`, not its `name`)

> These are intentionally left without a `pr_name` fallback on the same field — adding one would make `extractPRName` treat the `project_no` value as if it were a PR document name, bypassing the async lookup and 404ing against `/api/resource/Project Registration/<project_no>`.

| Doctype | Primary |
|---|---|
| `Direct Purchase` | `pr_project_no` on `project_no` |
| `Disbursal of Consultancy` | `pr_project_no` on `disbursal_project_number` |
| `Disbursal of Honorarium` | `pr_project_no` on `project_no` |
| `Endorsement Data` | `pr_project_no` on `project_no` |
| `Extension Of Tenure Of Appointment` | `pr_project_no` on `project_number` |
| `P_11 Form` | `pr_project_no` on `project_no` |
| `Recruitment Adhoc Contractual` | `pr_project_no` on `upfa_project_code` |
| `Selection Committee Report` | `pr_project_no` on `project_number` |
| `repair_replacement` | `pr_project_no` on `project_no` |
| `sanction_sheet` | `pr_project_no` on `project_no` |
| `TA DA Settlement` | `pr_project_no` on `project_no` (resolved via Travel → project_no) |
| `Temporary Advance` | `pr_project_no` on `project_code` |
| `Top Up Fellowship` | `pr_project_no` on `project_no` |

Some doctypes only store the PR's **docname** (`pr_name`), others only store its **human-readable project number** (`pr_project_no`), and one (`Fund Sanction`) already carries the project type directly on the record (`direct_type`) via a Frappe `fetch_from` field — no lookup needed at all in that case.

Any doctype **not** in this table falls straight through to `Others` in `resolveProjectCategory()` (`if (!mapping) return 'Others';`) — there's no default/guessed strategy.

## 3. Building the lookup maps

Both pages fetch **every** Project Registration once, up front:

```ts
const { data: allProjectRegistrations } = useFrappeGetDocList("Project Registration", {
    fields: ["name", "project_no", "project_type"],
    limit: 1000, // PendingTask.tsx / TaskRegistry.tsx
});
```

...and reduce it into two maps:

```ts
const { prNameToType, prNoToType } = React.useMemo(() => {
    const prNameToType = new Map<string, string>(); // PR docname → raw project_type
    const prNoToType   = new Map<string, string>(); // PR project_no → raw project_type
    allProjectRegistrations?.forEach(p => {
        if (p.name)       prNameToType.set(p.name, p.project_type || '');
        if (p.project_no) prNoToType.set(p.project_no, p.project_type || '');
    });
    return { prNameToType, prNoToType };
}, [allProjectRegistrations]);
```

These two maps are the "single source of truth" both pages hand to `resolveProjectCategory()`.

## 4. `resolveProjectCategory()` — resolving one record

```ts
export function resolveProjectCategory(record, doctype, prNameToType, prNoToType): ProjectCategory {
    const mapping = DOCTYPE_PR_LINKS[doctype];
    if (!mapping) return 'Others';               // unknown doctype → dumped in Others

    const applyStrategy = (strategy) => {
        if (strategy.type === 'self')        return prNameToType.get(record.name);
        if (strategy.type === 'direct_type') return record[strategy.field];
        if (strategy.type === 'pr_name')     return prNameToType.get(record[strategy.field]);
        if (strategy.type === 'pr_project_no') return prNoToType.get(record[strategy.field]);
    };

    const primary = applyStrategy(mapping.primary);
    if (primary) return normalizeProjectType(primary);

    if (mapping.fallback) {
        const fallback = applyStrategy(mapping.fallback);
        if (fallback) return normalizeProjectType(fallback);
    }

    return 'Others';  // link field empty, or lookup missed → Others
}
```

`normalizeProjectType()` then collapses the raw Project Registration `project_type` string down to one of the three buckets by substring match (case-insensitive):

```ts
export function normalizeProjectType(raw): ProjectCategory {
    const t = (raw ?? '').toLowerCase();
    if (t.includes('research')) return 'Research';
    if (t.includes('consult'))  return 'Consultancy';
    return 'Others';
}
```

So any Project Registration whose `project_type` field contains the word "research" → Research tab; contains "consult" → Consultancy tab; anything else (including empty/unresolved) → Others.

## 5. Two-pass resolution (why there's a "Phase-2" fetch)

Both pages resolve project category **twice**, because the first-pass data source doesn't always carry the link fields needed:

### Pass 1 — synchronous, using whatever the list API already returned

When the page's initial task list loads (`get_pending_task` / `get_task_registry` server methods), each flattened task is immediately given a best-effort `project_type` using `resolveProjectCategory()` on the fields already present in that payload:

```ts
project_type: resolveProjectCategory(record, group.doctype, prNameToType, prNoToType)
```

This works fine when the summary API happens to include the relevant link field, but often it doesn't (the pending-task/task-registry endpoints return a generic `name/title/status/creation/modified/owner` shape and skip doctype-specific fields).

### Pass 2 — async, fetching the real per-doctype link fields

Both pages then run a `useEffect` that:

1. Groups all tasks by `doctype` (skipping `self`-strategy doctypes, since those don't need a lookup).
2. For each doctype, builds the exact set of fields needed (`primary.field` + `fallback.field` if present).
3. Fetches those fields directly from that doctype via `/api/resource/<doctype>?filters=[["name","in",ids]]&fields=[...]`.
4. Re-runs `resolveProjectCategory()` on the *real* record data.
5. Stores the corrected categories in a `resolvedProjectTypes` state map, keyed by task id.

```ts
React.useEffect(() => {
    const byDoctype = new Map<string, string[]>();
    allTasks.forEach(task => {
        const mapping = DOCTYPE_PR_LINKS[task.doctype];
        if (!mapping || mapping.primary.type === 'self') return;
        byDoctype.get(task.doctype)?.push(task.id) ?? byDoctype.set(task.doctype, [task.id]);
    });
    // ...fetch per doctype, re-resolve, setResolvedProjectTypes(newMap)
}, [allTasks, prNameToType, prNoToType]);
```

A final memo merges pass 2 over pass 1, pass-2 winning when available:

```ts
const resolvedTasks = React.useMemo(() =>
    allTasks.map(task => {
        const resolved = resolvedProjectTypes.get(task.id);
        return resolved ? { ...task, project_type: resolved } : task;
    }),
    [allTasks, resolvedProjectTypes]);
```

> **PendingTask.tsx** goes a step further with a **Phase-2b** pass specifically for `Top Up Fellowship` records, since that doctype only stores a `project_no` (no PR docname field at all) and isn't reliably covered by the generic phase-2 fetch. It separately fetches each TUF record's `project_no`, then resolves `project_type` by matching that `project_no` against Project Registration directly.

## 6. Hiding noise from "Others"

Some doctypes are internal/system records that should never visually pollute the Others tab (e.g. staging tables). Both pages filter them out after resolution:

```ts
const HIDDEN_OTHERS_DOCTYPES = new Set(['Kafka Commit Staging', 'Project Number Generation']);

const visibleTasks = React.useMemo(() =>
    resolvedTasks.filter(task => !(task.project_type === 'Others' && HIDDEN_OTHERS_DOCTYPES.has(task.doctype))),
    [resolvedTasks]);
```

Note: this only hides them from the **Others** bucket — if one of these doctypes somehow resolved to Research/Consultancy it would still show there (in practice it never does, since they have no PR link).

## 7. Counts and tab filtering

Once `visibleTasks` is final, both pages derive:

```ts
const tabCounts = {
    Research:    visibleTasks.filter(t => t.project_type === 'Research').length,
    Consultancy: visibleTasks.filter(t => t.project_type === 'Consultancy').length,
    Others:      visibleTasks.filter(t => t.project_type === 'Others').length,
};

const filteredTasks = visibleTasks.filter(t => t.project_type === selectedProjectType);
```

`selectedProjectType` drives which tab's rows are actually rendered in the table (plus further client-side search/module filters layered on top).

## 8. End-to-end flow diagram

```
Project Registration list (name, project_no, project_type)
        │
        ▼
 prNameToType / prNoToType maps
        │
        ▼
┌─────────────────────────────────────────────┐
│ Pass 1: task-registry / pending-task summary │
│   → resolveProjectCategory() per record      │
│   → best-effort project_type                 │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ Pass 2: per-doctype re-fetch of link fields  │
│   → resolveProjectCategory() again           │
│   → resolvedProjectTypes (authoritative)     │
└─────────────────────────────────────────────┘
        │
        ▼
   resolvedTasks (pass 2 overrides pass 1)
        │
        ▼
   visibleTasks (HIDDEN_OTHERS_DOCTYPES stripped from Others)
        │
        ▼
   tabCounts + filteredTasks (by selectedProjectType)
```

## 9. Why this design

- **Single mapping table, two consumers.** Adding a new doctype to either page's Research/Consultancy/Others split only requires one new entry in `DOCTYPE_PR_LINKS` — both pages pick it up automatically.
- **Two-pass resolution absorbs API inconsistency.** Rather than depending on the summary endpoints to return every doctype-specific field, the code treats pass 1 as a cheap optimistic guess and pass 2 as the source of truth, with graceful degradation to "Others" if a doctype has no PR link at all (e.g. `myProjects`, non-project doctypes).
- **`normalizeProjectType`'s substring match** tolerates variations in how `project_type` is actually stored in Project Registration (e.g. "Research Project" vs "Research") without needing an exact enum match.
