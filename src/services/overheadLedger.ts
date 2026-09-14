/**
 * Overhead fund ledger access — PDF (per employee) and DPF (per department).
 *
 * An overhead fund is a single pool, not a project split across budget heads, and its
 * data must never travel over the browser-side `/ledger-api` proxy: that proxy is
 * unauthenticated, so a scope identifier in a URL there would let anyone read a
 * colleague's personal earnings or another department's fund. Every read here goes
 * through a whitelisted Frappe method that resolves the scope from the session user and
 * checks ownership server-side.
 *
 * See docs/pdf-project-implementation.md §5.6d and docs/dpf-project-implementation.md §5.6.
 *
 * Shared because three screens render this ledger — the project overview, the ledger
 * modal and the full-page ledger — and each previously had its own `/ledger-api` copy.
 */

import { PDF_BUDGET_HEAD, PDF_BUDGET_HEAD_ID } from "@/hooks/useProjectBudget";

/**
 * The single budget head an overhead spend books against. These funds have no head
 * dimension, but an overhead commit still carries a real account head.
 */
export const OVERHEAD_BUDGET_HEAD = PDF_BUDGET_HEAD;
export const OVERHEAD_BUDGET_HEAD_ID = PDF_BUDGET_HEAD_ID;

/** @deprecated use the OVERHEAD_* names — kept so existing imports keep resolving. */
export { PDF_BUDGET_HEAD, PDF_BUDGET_HEAD_ID };

/**
 * Project number prefixes for the overhead funds that are surfaced as projects.
 *
 * Minted as `{fund}{scope_id}` — `PDF1411` for employee 1411, `DPF4` for department 4.
 * The institute-wide pools (IDF/SWF/STWF) have no owner and no project yet.
 */
export const OVERHEAD_PROJECT_PREFIXES = ["PDF", "DPF"] as const;

/**
 * Whether a project number belongs to an overhead fund.
 *
 * A prefix check, because the components calling this hold only a project number, not the
 * document. The backend gate is the `is_overhead_project` database flag, so the two can in
 * principle disagree — but real project numbers look like `YYNN[RCO]-NNNN-…`, so nothing
 * ordinary can collide with these prefixes today.
 */
export const isOverheadProjectNo = (projectNo?: string | null): boolean =>
    typeof projectNo === "string" &&
    OVERHEAD_PROJECT_PREFIXES.some((p) => projectNo.startsWith(p));

/** @deprecated use isOverheadProjectNo — this now matches DPF too. */
export const isPdfProjectNo = isOverheadProjectNo;

export interface OverheadLedgerRow {
    transactionType?: string;
    transactionId?: number;
    transactionDate?: string;
    particulars?: string;
    refDetails?: string;
    fundReceivedAmount?: number;
    commitAmount?: number;
    paymentAmount?: number;
    commitableBalance?: number;
    /** The Accounts service's own running balance — already accounts for loans. */
    balance?: number;
    paymentBalance?: number;
    bmr?: string;
    frapAppId?: string;
    rawLoanAmount?: number;
    rawSettlementAmount?: number;
    fundType?: string;
}

/** @deprecated use OverheadLedgerRow. */
export type PdfLedgerRow = OverheadLedgerRow;

/**
 * Rows for an overhead project, oldest first.
 *
 * The backend has already folded loans and settlements into the received / payment
 * amounts and normalised `referenceNumber` → `refDetails`, `paymentBalance` → `balance`.
 * Balances come from the Accounts service rather than being recomputed here: the usual
 * `received − paid` running total ignores loans entirely and would misreport any fund
 * that has one.
 */
export const fetchOverheadLedger = async (
    projectNo: string,
): Promise<OverheadLedgerRow[]> => {
    const res = await fetch(
        `/api/method/rndopsapp.rndopsapp.overhead_fund.get_overhead_ledger?project_number=${encodeURIComponent(projectNo)}`,
        { credentials: "include", headers: { Accept: "application/json" } },
    );
    const payload = await res.json();

    if (payload?.message?.status === "error") {
        throw new Error(payload.message.message || "Could not load the overhead fund ledger");
    }

    const rows: OverheadLedgerRow[] = payload?.message?.data || [];
    return [...rows].sort(
        (a, b) =>
            new Date(a.transactionDate || 0).getTime() -
            new Date(b.transactionDate || 0).getTime(),
    );
};

/** @deprecated use fetchOverheadLedger — this now serves DPF too. */
export const fetchPdfLedger = fetchOverheadLedger;
