// Pure helpers for the resignation decommitment wizard. Kept free of React / Frappe so the
// arithmetic can be unit-tested on its own (see scripts/decommitCalc.test.mjs).

export interface LedgerRow {
    transactionType?: string;
    transactionId?: number | string | null;
    transactionDate?: string;
    particulars?: string;
    refDetails?: string | number | null;
    commitAmount?: number | null;
    paymentAmount?: number | null;
    status?: string;
    frapAppId?: string | null;
    bmr?: string | null;
    bankTransactionNumber?: string | null;
}

export interface DecommitSummary {
    original: number;
    totalPaid: number;
    /** Signed sum of other commit rows pointing at this TID (earlier decommits are negative). */
    priorAdjustments: number;
    /** Largest whole-rupee amount that may still be released. */
    maxDecommit: number;
    payments: LedgerRow[];
    adjustments: LedgerRow[];
    /** Payments tied to this commitment only through the shared application id (no refDetails). */
    paymentsLinkedByApp: LedgerRow[];
}

const tidKey = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const typeOf = (r: LedgerRow) => (r.transactionType || "").toLowerCase();
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const isCancelled = (r: LedgerRow) => (r.status || "").toUpperCase().includes("CANCEL");
// Rows with no type at all (some overhead payloads omit it) are classified by their amounts.
export const isCommitRow = (r: LedgerRow) =>
    typeOf(r) === ""
        ? num(r.commitAmount) !== 0 && num(r.paymentAmount) === 0
        : typeOf(r).includes("commit") && !typeOf(r).includes("payment");
export const isPaymentRow = (r: LedgerRow) => typeOf(r).includes("payment") || num(r.paymentAmount) > 0;

/**
 * Transaction ids are numbered per kind (commit 4, payment 4 and loan 4 can all coexist), so a
 * bare TID never identifies a ledger row. This key does: "commit:4", "payment:4", ...
 */
export const rowKey = (r: LedgerRow) =>
    `${isPaymentRow(r) ? "payment" : isCommitRow(r) ? "commit" : typeOf(r) || "other"}:${tidKey(r.transactionId)}`;

/**
 * Rows whose refDetails points at the given parent commit TID (cancelled rows never count).
 * `parent` is left out so a row can never be linked to itself.
 */
export const linkedRows = (rows: LedgerRow[], tid: number | string, parent?: LedgerRow): LedgerRow[] => {
    const key = tidKey(tid);
    if (!key) return [];
    return rows.filter((r) => r !== parent && !isCancelled(r) && tidKey(r.refDetails) === key);
};

/**
 * Commitments a decommit can be raised against: live, positive commit rows that are not
 * themselves a child (adjustment / payment) of another row in the ledger.
 */
export const eligibleCommitments = (rows: LedgerRow[]): LedgerRow[] => {
    // refDetails of an adjustment points at a *commit* TID, so only commit rows can be parents.
    const tids = new Set(rows.filter((r) => isCommitRow(r) && !isPaymentRow(r)).map((r) => tidKey(r.transactionId)).filter(Boolean));
    return rows.filter(
        (r) =>
            isCommitRow(r) &&
            !isCancelled(r) &&
            num(r.commitAmount) > 0 &&
            !isPaymentRow(r) &&
            tidKey(r.transactionId) !== "" &&
            !tids.has(tidKey(r.refDetails)),
    );
};

/**
 * Payments that carry no refDetails but share the commitment's application id. They belong to
 * this commitment only when it is the sole live commitment of that application — otherwise the
 * association is ambiguous and they are left out.
 */
const appLinkedPayments = (commit: LedgerRow, rows: LedgerRow[]): LedgerRow[] => {
    const app = tidKey(commit.frapAppId);
    if (!app) return [];
    const siblings = eligibleCommitments(rows).filter((r) => tidKey(r.frapAppId) === app);
    if (siblings.length !== 1) return [];
    return rows.filter(
        (r) =>
            !isCancelled(r) &&
            isPaymentRow(r) &&
            num(r.paymentAmount) > 0 &&
            tidKey(r.refDetails) === "" &&
            tidKey(r.frapAppId) === app,
    );
};

/** Maximum Decommitment = Original Committed Amount − Total Paid (net of earlier adjustments). */
export const computeDecommit = (commit: LedgerRow, rows: LedgerRow[]): DecommitSummary => {
    const linked = linkedRows(rows, commit.transactionId ?? "", commit);
    const paymentsLinkedByApp = appLinkedPayments(commit, rows);
    const payments = [...linked.filter((r) => isPaymentRow(r) && num(r.paymentAmount) > 0), ...paymentsLinkedByApp];
    const adjustments = linked.filter((r) => isCommitRow(r) && !isPaymentRow(r) && num(r.commitAmount) !== 0);
    const original = round2(num(commit.commitAmount));
    const totalPaid = round2(payments.reduce((s, r) => s + num(r.paymentAmount), 0));
    const priorAdjustments = round2(adjustments.reduce((s, r) => s + num(r.commitAmount), 0));
    const raw = round2(original + priorAdjustments - totalPaid);
    return {
        original,
        totalPaid,
        priorAdjustments,
        maxDecommit: Math.max(0, Math.floor(raw)),
        payments,
        adjustments,
        paymentsLinkedByApp,
    };
};

/** Returns an error message, or null when the amount may be submitted. */
export const validateDecommitAmount = (raw: string | number, max: number): string | null => {
    const text = String(raw ?? "").trim();
    if (text === "") return "Enter the decommitment amount.";
    const amount = Number(text);
    if (!Number.isFinite(amount)) return "Enter a valid number.";
    if (amount <= 0) return "Amount must be greater than zero.";
    if (!Number.isInteger(amount)) return "Commitment amounts are whole rupees only.";
    if (max <= 0) return "Nothing is left to decommit on this commitment.";
    if (amount > max) return `Amount cannot exceed the eligible balance of ₹${max.toLocaleString("en-IN")}.`;
    return null;
};
