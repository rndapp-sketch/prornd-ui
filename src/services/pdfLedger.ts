/**
 * Personal Development Fund — ledger access.
 *
 * @deprecated Superseded by `overheadLedger.ts`, which serves every overhead fund (PDF
 * per employee, DPF per department) through one whitelisted Frappe method. PDF was the
 * first of them to get a screen; DPF followed and differs only in which identifier the
 * Accounts service is addressed by, so the implementation was generalised rather than
 * duplicated.
 *
 * Kept as a re-export so any import that still points here keeps resolving. New code
 * should import from `@/services/overheadLedger`.
 */

export {
    OVERHEAD_BUDGET_HEAD,
    OVERHEAD_BUDGET_HEAD_ID,
    OVERHEAD_PROJECT_PREFIXES,
    PDF_BUDGET_HEAD,
    PDF_BUDGET_HEAD_ID,
    fetchOverheadLedger,
    fetchPdfLedger,
    isOverheadProjectNo,
    isPdfProjectNo,
} from "@/services/overheadLedger";

export type { OverheadLedgerRow, PdfLedgerRow } from "@/services/overheadLedger";
