# Overhead-UI-Migration → pragati_v0.05: merge report

| | |
|---|---|
| **Target branch** | `pragati_v0.05-overhead-merge` (created from `pragati_v0.05`) |
| **Source** | `origin/Overhead-UI-Migration` — one commit, `9fa39ac` by priyam, "Backup: Overhead UI migration work in progress" (14 Sep 2026) |
| **Merge base** | `e5340cc` (29 Aug 2026) |
| **Merge commit** | `6b95dad` — local only, not pushed |
| **Source of truth** | `docs/pdf-project-implementation.md`, `docs/dpf-project-implementation.md` |
| **Safety** | `pragati_v0.05` and `origin` are untouched. `git checkout pragati_v0.05` returns to the original state. |

**The feature:** PDF (Personal Development Fund, one per employee) and DPF (Departmental Development Fund, one per department) are surfaced as pre-approved projects. Each is a single "Overhead" pool with no budget-head dimension.

---

## 1. Merged from remote (no conflict)

28 files merged automatically with your local changes intact.

### New files
| File | Purpose |
|---|---|
| `src/hooks/useIsOverheadProject.ts` | Detects an overhead project (`PDF`/`DPF` prefix, or the `is_overhead_project` flag). Shared helpers that set and lock any Budget Head field to "Overhead". |
| `src/services/overheadLedger.ts` | Ledger fetch through the whitelisted Frappe method, never `/ledger-api`. Overhead constants and prefix check. |
| `src/services/pdfLedger.ts` | Deprecated re-export of the above. |
| `docs/pdf-project-implementation.md`, `docs/dpf-project-implementation.md` | The specifications. |

### Shared logic
| File | Change |
|---|---|
| `src/utils/projectTypeMapping.ts` | `Overhead` category, `OVERHEAD_PROJECT_TYPES`, role-based tab label (`overheadTabLabel` / `projectTypeTabLabel`), `resolveProjectRef`, project-number-prefix fallback in `resolveProjectCategory`. |
| `src/services/apiService.ts` | `overheadFundAPI` (`ensureProjects`, `getBalance`, `getLedger`, `getCommits`, `getPayments`), plus deprecated `pdfFundAPI`. |
| `src/hooks/useProjectBudget.ts` | Overhead short-circuit calling `get_overhead_balance`; exports `PDF_BUDGET_HEAD` / `PDF_BUDGET_HEAD_ID`. |

### Project screens
| File | Change |
|---|---|
| `src/pages/ProjectsView.tsx` | 4th **Overhead** tab, counts and colours. Fund project created on first visit via `ensureOverheadProjects` (placed after `mutateCreated`). "Pending Sanction" label hidden for overhead. |
| `src/pages/ProjectDetailsOverview.tsx` | `isOverheadProject` flag. No Sanction tab or sanction journey. No Funding Agency / Investigators / Clearance sections. Loan group dropped. Locked-state fallback tab is Recruitment. Ledger from the overhead API. Fixes the "ledger only loads after refresh" bug. |
| `src/pages/ProjectLedgerFull.tsx`, `src/components/ProjectLedgerModal.tsx`, `src/pages/ProjectSearch.tsx` | Overhead ledger branch that skips the 36-head `/ledger-api` fan-out. |
| `src/pages/FundReceivedDetails.tsx` | Overhead touch-point. |

### Commit / payment
| File | Change |
|---|---|
| `src/components/BudgetActionsSidebar.tsx` | Head list narrowed to `["Overhead"]`; passes `lockBudgetHead`. |
| `src/components/CommitPayment.tsx` | New `lockBudgetHead` prop. |
| `src/pages/Payments.tsx` | Overhead commits and payments merged into the queue (resolve to `[]` on failure). Fixes "Pay" not flipping to "Payment Pending" until reload. |

### Application forms (Budget Head fixed to "Overhead" and locked)
- `DynamicFormRenderer.tsx` gets a new `overheadFund` prop.
- Forms:
  - `TravelForm`, `TADASettlementForm`, `AdvanceSettlementForm`
  - `IndentGeneralForm`, `IndentCumSanctionSheetForm`
  - `RecruitmentAdhocContractualForm`, `TopUpFellowshipForm`
  - `DisbursalOfConsultancyForm`, `DisbursalOfHonorariumForm`
  - `MiscellaneousCommitForm`, `RateContractForm`, `Reimbursement`
  - `TemporaryAdvance` and `DirectPurchase` (each has its own field loop, so they apply the rule themselves)

### Unrelated fix that came along
- `TADASettlementForm`: "Advance Taken (INR)" is now **0** unless the Travel said "Yes" to "Do you need Advance?". Before, it was filled from the commit or the trip estimate regardless.

---

## 2. Conflicts and how each was resolved

6 files conflicted. Nothing was chosen blindly; the intent of both sides was checked.

| File | Cause | Resolution |
|---|---|---|
| `IndentCumSanctionSheetForm.tsx` | Import lines only. Local added print / `ActivityLog` / `commonAPI`; remote added `useIsOverheadProject`. | **Kept both.** |
| `RecruitmentAdhocContractualForm.tsx` | Import lines only. Local added `P11PrintModal` and the print helper. | **Kept both.** |
| `TopUpFellowshipForm.tsx` | Import lines only. Local added print modal, `ActivityLog`, floating log button, print data. | **Kept both.** |
| `Reimbursement.tsx` | Import lines only. Local added `ErrorModal`. | **Kept both.** |
| `PendingTask.tsx` | **Architectural.** Local cut over to `get_categorized_pending_task` (server-side Research / Consultancy / Others buckets), about 370 lines removed. Remote still used the old `get_pending_task` with client-side resolution. | **Kept local.** Re-applied the Overhead work on top (section 3). |
| `TaskRegistry.tsx` | **Architectural.** Same cutover to `get_categorized_task_registry`. Local also had URL-persisted filters and no per-page sidebar. | **Kept local.** Re-applied the Overhead work on top (section 3). |

---

## 3. Newly implemented (not in the remote commit)

### Adapting the Overhead tab to your server-side categorisation
- `projectTypeMapping.ts`: exported `looksLikeOverheadProjectNo` and added `withOverheadCategory(category, projectNo)`.
- **`PendingTask` and `TaskRegistry`** now:
  - Add the **Overhead** tab, with the role-derived label, colours and count.
  - Move a task into Overhead when its `project_no` starts with `PDF/DPF/IDF/SWF/STWF`, whichever bucket the backend put it in.
  - Also read an `overhead` bucket if the backend ever returns one.
  - Show the **Funding Agency** column for every form, not only Project Registration. It resolves from the `project_no` the server already returns.
- **`TaskRegistry` only:**
  - Shows the project title, falling back to the document title.
  - Adds a Funding Agency column and a `fundingagency_` lookup (trailing underscore).
  - Uses `useFrappeAuth` and `useUserRoles` for the tab label.
  - Raises the Project Registration list limit to 0.

### `/ledger-api` gaps the docs require closing (PDF doc §5.6d, §5.7)
- `CommitPayment.tsx`: the parent-transaction-ID lookup for an overhead project now uses `fetchOverheadLedger` (COMMIT row preferred).
- `TADASettlementForm.tsx`: the advance-taken lookup does the same, in place of the head-by-head `/ledger-api` walk.

---

## 4. Not merged from remote (deliberately)

| Remote item | Why it was left out |
|---|---|
| `get_pending_task` / `get_task_registry` client-side resolution in `PendingTask` and `TaskRegistry` (`PendingTaskRecord`, `PendingTaskResponse`, `resolveProjectCategory` with `prNameToType`/`prNoToType`, the Phase-2 fetch loops, the Top Up Fellowship and Fund Received lookups) | Your branch replaced this with server-side categorisation. Re-adding it would undo your cutover and add many `/api/resource` calls. |
| Phase-2 `resolveProjectRef` → `resolvedProjectRefs` state and remote `prRowForTask` | Replaced by a simpler `project_no` lookup that fits your architecture. The `resolveProjectRef` helper still exists in `projectTypeMapping.ts` but is no longer used by these two pages. |
| Project-title override in **PendingTask** rows | The docs ask for it only in Task Registry. Overriding would make different applications from one project look identical. Your existing display is kept. |
| `limit: 1000` on Task Registry's Project Registration list, and `useNavigate` without `useSearchParams` | Kept your version (URL-persisted filters) and raised the limit to 0. |
| Commented-out `// import { AppSidebar }` in `TaskRegistry` | Dead code; your sidebar removal stays. |

---

## 5. Not implemented — backend, outside this repo

The frontend calls these; none of them exist in `prornd-ui`, so overhead features **will not work until they do**. Details are in the two docs.

- `overhead_fund.py` with the whitelisted methods below. **Names must match**:
  - `ensure_overhead_projects`
  - `get_overhead_balance`
  - `get_overhead_ledger`
  - `get_overhead_commits`
  - `get_overhead_payments`
- Project Registration fields `is_overhead_project`, `overhead_fund_type`, `overhead_scope_id`, plus the `PDF` / `DPF` project types.
- Suppressing the Kafka `publish_project` call for overhead projects.
- Permission query condition that hides overhead projects from non-owners.
- Kafka `overhead-commit-events` / `overhead-payment-events` producers, and the payment-update consumer.
- `grant_head_application_access` patch (department heads cannot raise applications without it).
- `backfill_overhead_fund_fields` patch.
- Removal of `get_project_available_amounts_test` (unauthenticated).

---

## 6. Open items and risks

1. **Backend bucket / `project_no` assumption.** The Overhead tab in Pending Task and Task Registry assumes your `get_categorized_*` rows carry a `PDF…`/`DPF…` `project_no`. If a row carries a docname instead, that task stays under **Others** (visible, not lost) and the tab looks empty. Confirm against `project_type_links.py` on the backend.
2. **Prefix vs flag.** The frontend gate is a `PDF`/`DPF` prefix. The backend gate is the `is_overhead_project` flag. They can only disagree if a real project number starts with `PDF`/`DPF` (the docs judge this unlikely).
3. **Remote commit is marked work-in-progress.**
4. **Approver visibility.** Overhead projects are hidden from non-owners by the backend permission. An approver's Funding Agency cell can therefore show `-` for a fund they can't see. That is expected.

---

## 7. Verification

| Check | Result |
|---|---|
| `tsc -p tsconfig.app.json --noEmit` | 215 errors, **identical** to `pragati_v0.05` before the merge; 0 new |
| `vite build` (output redirected to a scratch folder) | Succeeds |
| ESLint on the 32 touched TS/TSX files | No new errors. 13 more `no-explicit-any` warnings than before (mostly remote code). |
| Runtime / browser test | **Not done**, since the backend is unavailable |
