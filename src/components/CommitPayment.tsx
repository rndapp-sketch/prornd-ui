/**
 * CommitPayment.tsx
 *
 * Centralised "Make a Commitment" sidebar widget used across ALL commit forms.
 *
 * Responsibilities
 * ─────────────────
 * 1. On mount, calls the Kafka Commit Staging REST API to check whether
 *    a record already exists for this application (reference_name = docName).
 * 2. If a staging record exists  →  transforms into a read-only
 *    "Committed Data Display" card (shows non-empty payload fields,
 *    maps status PUBLISHED → "Committed"). Submit is completely blocked.
 * 3. If no staging record exists →  renders the commit form (budget head
 *    dropdown, amount input, optional particulars/comment textarea).
 *    On submit, calls rndopsapp.rndopsapp.commitPayment.submit_commit_data
 *    and passes commitParticular as a parameter.
 *
 * Supported prop patterns
 * ───────────────────────
 * • Basic (details pages)     : doctype + docName + projectName + budgetHeads + actualBalance
 * • With staged-commit        : + onCommitSuccess callback → parent sets local stagedCommit state
 * • With parent app refDetails: + parentAppId  (fetches TID from ledger before submitting)
 * • With bill-amount pre-fill : + billAmount
 * • Gating action buttons     : + onStagingStatusChange(isCommitted) → parent disables Forward
 *                                 button when isCommitted is false (for Staff RnD role)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { fetchOverheadLedger, isOverheadProjectNo } from "@/services/overheadLedger";
import { createPortal } from "react-dom";
import { useFrappePostCall } from "frappe-react-sdk";
import { CheckCircle2, AlertCircle, Loader2, CreditCard, ShieldAlert, X, BookOpen, RefreshCw, Circle } from "lucide-react";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { ProjectLedgerModal } from "@/components/ProjectLedgerModal";
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommitPaymentCustomSubmit {
    budgetHead: string;
    amount: number;
    particular: string;
    /** Parent commit TID the new commit/decommit is linked to */
    refDetails?: string;
    /** Send commit_amount as a negative number (a decommit releases commitment). `amount` stays positive. */
    asDecommit?: boolean;
}

export interface CommitPaymentCustomFormContext {
    submit: (args: CommitPaymentCustomSubmit) => Promise<void>;
    isSubmitting: boolean;
}

export interface CommitPaymentProps {
    /** Frappe doctype name (e.g. "Disbursal of Honorarium") */
    doctype: string;
    /** The document name / application ID — also used as reference_name for Kafka Commit Staging check */
    docName: string;
    /** Project number / code to commit against */
    projectName: string;
    /** Available budget heads as string labels */
    budgetHeads?: string[];
    /** Available balance to display (payment balance — used as fallback only) */
    actualBalance?: number;
    /** Total committable balance — used as the displayed "Available" fallback when no head is selected */
    commitableBalance?: number;
    /** Optional: bill amount to pre-fill the commit amount field */
    billAmount?: number;
    /** Optional: bmr value */
    bmr?: string;
    /** Optional: parent application ID whose committed TID is fetched as refDetails (e.g. Travel → TA DA Settlement) */
    parentAppId?: string;
    /** Optional: budget head to auto-select when it exists in budgetHeads */
    defaultBudgetHead?: string;
    /** Optional: map of budget head label -> ledger Budget Head id, used to query the ledger API (accountHeadId expects the id, not the label) */
    budgetHeadIds?: Record<string, string | number>;
    /** Fix the budget head (PDF projects book everything to a single "Overhead" pool). */
    lockBudgetHead?: boolean;
    /** Optional: custom reference_name/name for Kafka Commit Staging checks and submit payload */
    stagingReferenceName?: string;
    /** Optional: application id to keep in the payload when stagingReferenceName is different */
    frapAppId?: string;
    /** Optional: use this refDetails directly instead of looking it up from parentAppId */
    forcedRefDetails?: string;
    /** Optional: include bill_amount equal to the entered commitment amount */
    includeBillAmount?: boolean;
    /** Optional: module id to send in the commit payload */
    moduleId?: number;
    /** Optional: workflow trigger state to save inside the commit payload JSON */
    triggerState?: string;
    /** Optional: only consider these Kafka staging statuses when checking existing staging */
    stagingStatuses?: string[];
    /** Optional: only consider staging records whose payload has these non-empty keys */
    requiredPayloadKeys?: string[];
    /** Optional: custom card title */
    title?: string;
    /** Optional: helper copy under the title */
    description?: string;
    /** Optional: custom submit button label */
    submitLabel?: string;
    /** Optional: per-head balance map from useProjectBudget — keys are budget head names */
    headBalances?: Record<string, { commitable: number; received: number; actual: number; committed: number; payment: number; id: number }>;
    /**
     * Per-head balances used ONLY for the "Available" figure shown under the budget head selector.
     * Unlike `headBalances` it does not enable the "exceeds available" validation, so callers whose
     * amount legitimately replaces an earlier commitment (e.g. TA DA Settlement) can show the right
     * head figure without being blocked.
     */
    displayHeadBalances?: Record<string, HeadBalanceLike>;
    /** Optional: hide the project-wide "Commitable Balance" list shown under the form (default: shown) */
    showBalanceList?: boolean;
    /** Optional: hide the selected-head balance card (Available / Received / Committed / Paid) — e.g. for decommit forms */
    hideHeadBalance?: boolean;
    /** Optional: adds a "View Project Ledger" button to the balance list */
    onViewLedger?: () => void;
    /** Optional: disable the form externally while still showing it */
    disabled?: boolean;
    /** Optional: reason shown when disabled externally */
    disabledReason?: string;
    /** Optional: called whenever the selected budget head changes (for parent sidebar sync) */
    onHeadChange?: (head: string) => void;
    /** Optional: called after a successful commit so the parent can update its local state */
    onCommitSuccess?: (head: string, amount: number) => void;
    /**
     * Optional: called whenever the staging check resolves.
     * `isCommitted` is true if a Kafka Commit Staging record exists for this docName.
     * Parents should use this to disable forward/action buttons for Staff RnD users.
     */
    onStagingStatusChange?: (isCommitted: boolean) => void;
    /**
     * Optional: async callback called with (budgetHead, amount) just before the commit
     * payload is sent. Should return the refDetails string to embed, or undefined to skip.
     * If it throws, the commit is aborted and the error is shown to the user.
     */
    resolveRefDetails?: (head: string, amount: number) => Promise<string | undefined>;
    /**
     * Optional: replace the built-in form with a custom UI (e.g. the decommitment wizard).
     * It receives `submit`, which sends the same submit_commit_data payload as the built-in
     * form (after a fresh duplicate check) and rejects with a readable Error on failure.
     */
    customForm?: (ctx: CommitPaymentCustomFormContext) => React.ReactNode;
    /** Optional: only treat staging rows whose payload trigger_state equals this as "the" commitment (duplicate check per trigger_state) */
    stagingTriggerState?: string;
    /** Optional: ignore staging rows whose payload trigger_state equals this (e.g. the first commit ignores the PO commit) */
    excludeStagingTriggerState?: string;
    /** Optional: older reference name to fall back to when nothing matches (commits staged before trigger_state scoping) */
    legacyStagingReferenceName?: string;
    /** Optional: initial value for the Particulars field */
    defaultParticular?: string;
    /** Optional: show only an existing commitment; render nothing when none exists (no submit form) */
    readOnly?: boolean;
    /** Optional: class overrides for the outer container */
    className?: string;
}

// Fields from Kafka Commit Staging payload that we display.
// Order matters — displayed in this order.
const PAYLOAD_DISPLAY_FIELDS: { key: string; label: string; aliases?: string[] }[] = [
    { key: "commit_amount", label: "Commit Amount" },
    { key: "budget_head", label: "Budget Head" },
    { key: "project_name", label: "Project Name" },
    { key: "bmr", label: "BMR" },
    { key: "bill_amount", label: "Bill Amount" },
    { key: "moduleId", label: "Module ID", aliases: ["module_id"] },
    { key: "frap_app_id", label: "FRAP App ID", aliases: ["frapAppId"] },
    { key: "ref_details", label: "Ref Details", aliases: ["refDetails"] },
    { key: "commit_particular", label: "Particulars", aliases: ["commitParticular"] },
];

// ---------------------------------------------------------------------------
// Helper — field non-empty guard
// ---------------------------------------------------------------------------
function isValuePresent(v: any): boolean {
    if (v === null || v === undefined) return false;
    if (typeof v === "string" && v.trim() === "") return false;
    return true;
}

function resolveBudgetHeadOption(
    budgetHeads: string[],
    preferredHead?: string,
): string {
    const trimmedPreferred = preferredHead?.trim();
    if (!trimmedPreferred) return "";

    return (
        budgetHeads.find((head) => head === trimmedPreferred) ||
        budgetHeads.find(
            (head) => head.trim().toLowerCase() === trimmedPreferred.toLowerCase(),
        ) ||
        ""
    );
}

function extractCommitErrorMessage(error: any, fallback: string) {
    const candidates = [
        error?._server_messages,
        error?.response?._server_messages,
        error?.response?.data?._server_messages,
        error?.exception,
        error?.response?.exception,
        error?.response?.data?.exception,
        error?.message,
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;
        if (typeof candidate !== "string") return fallback;

        try {
            const parsed = JSON.parse(candidate);
            const parsedMessages = Array.isArray(parsed) ? parsed : [parsed];
            const firstMessage = parsedMessages
                .map((item) => {
                    if (typeof item === "string") {
                        try {
                            return JSON.parse(item)?.message || item;
                        } catch {
                            return item;
                        }
                    }
                    return item?.message;
                })
                .find(Boolean);
            if (firstMessage) return firstMessage;
        } catch {
            return candidate;
        }
    }

    return fallback;
}

// ---------------------------------------------------------------------------
// Confirm Commit Dialog
// ---------------------------------------------------------------------------
interface ConfirmCommitDialogProps {
    budgetHeadName: string;
    availableBalance: number;
    commitAmount: number;
    onConfirm: () => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

const ConfirmCommitDialog: React.FC<ConfirmCommitDialogProps> = ({
    budgetHeadName,
    availableBalance,
    commitAmount,
    onConfirm,
    onCancel,
    isSubmitting,
}) => {
    const remainingBalance = availableBalance - commitAmount;

    const fmt = (n: number) => n.toLocaleString("en-IN");

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onCancel(); }}
        >
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-2.5">
                        <ShieldAlert className="w-5 h-5 text-[#D97757]" />
                        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Confirm Commitment</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-40"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                    {/* Message */}
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        You are about to commit{" "}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">₹{fmt(commitAmount)}</span>{" "}
                        against Budget Head{" "}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">'{budgetHeadName}'</span>.
                        <br /><br />
                        This amount will be reserved from the available budget and cannot be used for other commitments. Please verify the budget head and amount before proceeding.
                    </p>

                    {/* Summary rows */}
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm">
                        {[
                            { label: "Budget Head", value: budgetHeadName },
                            { label: "Available Balance", value: `₹${fmt(availableBalance)}` },
                            { label: "Commitment Amount", value: `₹${fmt(commitAmount)}`, highlight: "text-[#D97757]" },
                            {
                                label: "Remaining Balance After Commitment",
                                value: `₹${fmt(remainingBalance)}`,
                                highlight: remainingBalance < 0 ? "text-red-600 dark:text-red-400 font-bold" : "text-emerald-600 dark:text-emerald-400",
                            },
                        ].map(({ label, value, highlight }, i, arr) => (
                            <div
                                key={label}
                                className={cn(
                                    "flex items-center justify-between px-4 py-2.5 gap-4",
                                    i < arr.length - 1 && "border-b border-zinc-100 dark:border-zinc-800",
                                    i % 2 === 0 ? "bg-zinc-50 dark:bg-zinc-800/50" : "bg-white dark:bg-zinc-900",
                                )}
                            >
                                <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">{label}</span>
                                <span className={cn("font-semibold text-zinc-900 dark:text-zinc-100 text-right", highlight)}>{value}</span>
                            </div>
                        ))}
                    </div>

                    {remainingBalance < 0 && (
                        <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            Warning: Commitment amount exceeds available balance.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-200 dark:border-zinc-700">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#D97757] hover:bg-[#c66a4e] rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Committing…
                            </>
                        ) : (
                            "Confirm & Commit"
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};

// ---------------------------------------------------------------------------
// Committed Data Display card
// ---------------------------------------------------------------------------
interface CommittedDataCardProps {
    stagingRecord: Record<string, any>;
    /** Budget head label → ledger account head id (used to look the entry up in the ledger) */
    budgetHeadIds?: Record<string, string | number>;
}

type LedgerCheck =
    | { state: "idle" | "checking" | "pending" }
    | { state: "consumed"; tid?: string | number | null }
    | { state: "error"; message: string };

const minutesSince = (iso?: unknown) => {
    if (!iso) return null;
    const t = new Date(String(iso)).getTime();
    return Number.isNaN(t) ? null : (Date.now() - t) / 60000;
};

/**
 * Where a staged commitment is in its journey: Approval → Published → In ledger.
 * "Published" only means it was sent to the queue; the ledger row is the proof it was consumed.
 */
const SyncProgress: React.FC<{
    stagingRecord: Record<string, unknown>;
    payloadObj: Record<string, unknown>;
    budgetHeadIds?: Record<string, string | number>;
}> = ({ stagingRecord, payloadObj, budgetHeadIds }) => {
    const raw = String(stagingRecord.status ?? "").toUpperCase();
    const failed = raw.includes("FAIL") || raw.includes("ERROR") || raw.includes("REJECT");
    const awaitingApproval = raw.includes("APPROVAL");
    const queued = raw.includes("PENDING_PUBLISH") || raw === "PENDING";
    const published = raw === "PUBLISHED";

    const [ledger, setLedger] = useState<LedgerCheck>({ state: "idle" });
    const projectNo = String(payloadObj.project_name ?? payloadObj.projectName ?? "").trim();
    const headLabel = String(payloadObj.budget_head ?? payloadObj.budgetHead ?? "").trim();
    const frapAppId = String(payloadObj.frapAppId ?? payloadObj.frap_app_id ?? "").trim();
    const refDetails = String(payloadObj.refDetails ?? payloadObj.ref_details ?? "").trim();
    const signedAmount = Number(payloadObj.commit_amount ?? payloadObj.commitAmount ?? 0);

    const checkLedger = useCallback(async () => {
        if (!projectNo || !signedAmount) return;
        setLedger({ state: "checking" });
        try {
            type LedgerEntry = { status?: unknown; commitAmount?: unknown; frapAppId?: unknown; refDetails?: unknown; transactionId?: string | number | null };
            let rows: LedgerEntry[];
            if (isOverheadProjectNo(projectNo)) {
                rows = (await fetchOverheadLedger(projectNo)) as LedgerEntry[];
            } else {
                const headId = budgetHeadIds?.[headLabel] ?? headLabel;
                if (!headId) throw new Error("Budget head is unknown.");
                const res = await fetch(
                    `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectNo)}&accountHeadId=${encodeURIComponent(String(headId))}`,
                );
                if (!res.ok) throw new Error(`Ledger service returned ${res.status}.`);
                const data = await res.json();
                rows = Array.isArray(data) ? data : [];
            }
            const match = rows.find((r) => {
                const cancelled = String(r.status ?? "").toUpperCase().includes("CANCEL");
                const sameAmount = Math.round(Number(r.commitAmount ?? 0)) === Math.round(signedAmount);
                const sameApp = (frapAppId && r.frapAppId === frapAppId) || (refDetails && String(r.refDetails ?? "").trim() === refDetails);
                return !cancelled && sameAmount && sameApp;
            });
            setLedger(match ? { state: "consumed", tid: match.transactionId } : { state: "pending" });
        } catch (e) {
            setLedger({ state: "error", message: e instanceof Error ? e.message : "Could not read the ledger." });
        }
    }, [projectNo, headLabel, frapAppId, refDetails, signedAmount, budgetHeadIds]);

    useEffect(() => {
        if (published) checkLedger();
    }, [published, checkLedger]);

    const age = minutesSince(stagingRecord.modified ?? stagingRecord.creation);
    const stuckQueued = queued && age !== null && age > 10;
    const notConsumed = published && ledger.state === "pending" && age !== null && age > 15;
    const consumed = published && ledger.state === "consumed";

    const step = (label: string, done: boolean, bad = false, active = false) => (
        <div className="flex items-center gap-1.5">
            {bad ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
            ) : done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : active ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            ) : (
                <Circle className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />
            )}
            <span className={cn("text-[11px] font-semibold", bad ? "text-red-600" : done ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-400")}>{label}</span>
        </div>
    );

    let message: { tone: "ok" | "wait" | "bad"; text: string } | null = null;
    if (failed) {
        const reason = stagingRecord.error_message ?? stagingRecord.error ?? stagingRecord.remarks ?? stagingRecord.message;
        message = { tone: "bad", text: `Publishing failed${reason ? `: ${String(reason)}` : "."} Ask the system admin to check the error.` };
    } else if (awaitingApproval) {
        message = { tone: "wait", text: "Waiting for approval. Nothing has been sent to the ledger yet." };
    } else if (queued) {
        message = stuckQueued
            ? { tone: "bad", text: `Not published after ${Math.round(age!)} minutes. It may be stuck; ask the system admin to check.` }
            : { tone: "wait", text: "Queued, waiting to be published." };
    } else if (consumed) {
        message = { tone: "ok", text: `Consumed: recorded in the ledger${(ledger as { tid?: string | number | null }).tid != null ? ` as TID ${(ledger as { tid?: string | number | null }).tid}` : ""}.` };
    } else if (published) {
        if (ledger.state === "error") message = { tone: "bad", text: `Could not check the ledger: ${ledger.message}` };
        else if (notConsumed) message = { tone: "bad", text: "Published, but not in the ledger after more than 15 minutes. It has probably failed (dead-letter queue); ask the system admin to check the DLQ." };
        else if (ledger.state === "pending") message = { tone: "wait", text: "Published, but not in the ledger yet. It may still be processing; re-check shortly." };
        else message = { tone: "wait", text: "Checking the ledger…" };
    }

    const approvalDone = !awaitingApproval && !failed;
    return (
        <div className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Processing status</span>
                {published && (
                    <button
                        type="button"
                        onClick={checkLedger}
                        disabled={ledger.state === "checking"}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        <RefreshCw className={cn("h-3 w-3", ledger.state === "checking" && "animate-spin")} /> Re-check
                    </button>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {step("Approval", approvalDone, false, awaitingApproval)}
                <span className="text-zinc-300">›</span>
                {step("Published", published || consumed, failed || stuckQueued, queued && !stuckQueued)}
                <span className="text-zinc-300">›</span>
                {step("In ledger", consumed, notConsumed, published && !consumed && !notConsumed && ledger.state !== "error")}
            </div>
            {message && (
                <p className={cn(
                    "mt-2 text-xs font-semibold",
                    message.tone === "ok" && "text-emerald-700 dark:text-emerald-400",
                    message.tone === "wait" && "text-amber-700 dark:text-amber-400",
                    message.tone === "bad" && "text-red-600 dark:text-red-400",
                )}>
                    {message.text}
                </p>
            )}
        </div>
    );
};

const CommittedDataCard: React.FC<CommittedDataCardProps> = ({ stagingRecord, budgetHeadIds }) => {
    // Parse payload JSON
    let payloadObj: Record<string, any> = {};
    try {
        const raw = stagingRecord.payload ?? stagingRecord.commit_payload ?? "{}";
        payloadObj = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
        payloadObj = {};
    }

    // Status mapping: PUBLISHED → "Committed"
    const rawStatus: string = stagingRecord.status ?? "";
    const displayStatus = rawStatus === "PUBLISHED" ? "Committed" : rawStatus;

    const statusColor =
        displayStatus === "Committed"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : displayStatus === "FAILED"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

    // A negative commit amount is a decommitment (release), so the card is worded accordingly.
    const isDecommit = Number(payloadObj.commit_amount ?? payloadObj.commitAmount ?? 0) < 0;

    // The PO commit is labelled by its refDetails (e.g. "PO 10071 to …"); a bare numeric
    // transaction id isn't descriptive, so fall back to the particulars in that case.
    const refDetails = String(payloadObj.refDetails ?? payloadObj.ref_details ?? "").trim();
    const particulars = String(payloadObj.commitParticular ?? payloadObj.commit_particular ?? "").trim();
    const cardTitle =
        (payloadObj.trigger_state === "POGenerated" || String(stagingRecord.reference_name ?? payloadObj.name ?? "").endsWith("-po"))
            ? (refDetails && !/^\d+$/.test(refDetails) ? refDetails : particulars || "PO Commitment")
            : isDecommit ? "Decommitment Details" : "Commitment Details";

    return (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {cardTitle}
                </h3>
            </div>

            {/* Already-committed notice */}
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                {isDecommit ? "A decommitment" : "A commitment"} has already been submitted for this application. Duplicate submissions are blocked.
            </div>

            {/* Non-empty payload fields */}
            <div className="space-y-2 text-sm">
                {PAYLOAD_DISPLAY_FIELDS.map(({ key, label, aliases = [] }) => {
                    const val = [key, ...aliases]
                        .map((fieldname) => payloadObj[fieldname])
                        .find(isValuePresent);
                    if (!isValuePresent(val)) return null;
                    return (
                        <div key={key} className="flex justify-between items-center gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium shrink-0">
                                {isDecommit && key === "commit_amount" ? "Decommit Amount" : label}
                            </span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-right break-all">
                                {typeof val === "number"
                                    ? val.toLocaleString("en-IN")
                                    : String(val)}
                            </span>
                        </div>
                    );
                })}

                {/* Status row */}
                {isValuePresent(rawStatus) && (
                    <div className="flex justify-between items-center gap-2 pt-2">
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">
                            Status
                        </span>
                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold", statusColor)}>
                            {displayStatus}
                        </span>
                    </div>
                )}
            </div>

            <SyncProgress stagingRecord={stagingRecord} payloadObj={payloadObj} budgetHeadIds={budgetHeadIds} />
        </div>
    );
};

// ---------------------------------------------------------------------------
// Head-wise balance helpers
// ---------------------------------------------------------------------------
export type HeadBalanceLike = {
    commitable: number;
    received?: number;
    committed?: number;
    payment?: number;
    actual?: number;
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * Project-wide "Commitable Balance" list: one row per budget head showing what can still
 * be committed against it, the selected head highlighted, and a total that is the sum of
 * the rows shown (so the figures always add up).
 */
export const ProjectBalanceList: React.FC<{
    balances: Record<string, HeadBalanceLike>;
    selectedHead?: string;
    onViewLedger?: () => void;
    className?: string;
}> = ({ balances, selectedHead, onViewLedger, className }) => {
    const rows = Object.entries(balances).filter(
        ([, b]) => (b.received ?? 0) !== 0 || (b.committed ?? 0) !== 0 || (b.payment ?? 0) !== 0 || b.commitable !== 0,
    );
    if (rows.length === 0) return null;
    const total = rows.reduce((sum, [, b]) => sum + b.commitable, 0);
    return (
        <div className={cn("bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm", className)}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Commitable Balance
                </span>
                <span className={cn("text-sm font-bold", total < 0 ? "text-red-500" : "text-[#D97757]")}>
                    {inr(total)}
                </span>
            </div>
            <div className="mb-2 divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden">
                {rows.map(([head, b]) => {
                    const isSelected = head === selectedHead;
                    return (
                        <div
                            key={head}
                            className={cn(
                                "flex items-center justify-between px-3 py-1.5",
                                isSelected
                                    ? "bg-[#D97757]/10 dark:bg-[#D97757]/15 ring-inset ring-1 ring-[#D97757]/30"
                                    : "bg-zinc-50 dark:bg-zinc-900/50",
                            )}
                        >
                            <span
                                title={head}
                                className={cn(
                                    "text-[11px] truncate max-w-[130px]",
                                    isSelected ? "font-semibold text-zinc-700 dark:text-zinc-200" : "text-zinc-500 dark:text-zinc-400",
                                )}
                            >
                                {head}
                            </span>
                            <span className={cn("text-[11px] font-bold tabular-nums", b.commitable < 0 ? "text-red-500" : "text-emerald-600 dark:text-emerald-400")}>
                                {inr(b.commitable)}
                            </span>
                        </div>
                    );
                })}
                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
                    <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">Total</span>
                    <span className={cn("text-[11px] font-bold tabular-nums", total < 0 ? "text-red-500" : "text-[#D97757]")}>
                        {inr(total)}
                    </span>
                </div>
            </div>
            {onViewLedger && (
                <button
                    onClick={onViewLedger}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-[#D97757] font-semibold text-xs hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                >
                    <BookOpen className="w-3 h-3" />
                    View Project Ledger
                </button>
            )}
        </div>
    );
};

/** Selected-head card: the Available figure, how it is derived, and why it may be zero/negative. */
const SelectedHeadBalance: React.FC<{ head: string; balance?: HeadBalanceLike; fallbackAvailable: number }> = ({ head, balance, fallbackAvailable }) => {
    const available = balance ? balance.commitable : fallbackAvailable;
    const hasBreakup = balance?.received != null;
    const rows: { label: string; hint: string; value: number; sign: string }[] = hasBreakup
        ? [
            { label: "Received", hint: "Funds released for this head", value: balance!.received ?? 0, sign: "" },
            { label: "Committed", hint: "Already committed against this head", value: balance!.committed ?? 0, sign: "−" },
            { label: "Paid", hint: "Paid out of commitments — not deducted again", value: balance!.payment ?? 0, sign: "" },
        ]
        : [];
    return (
        <div className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5">
            <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Available to commit</span>
                <span className={cn("text-base font-bold tabular-nums", available <= 0 ? "text-red-500" : "text-[#D97757]")}>
                    {inr(available)}
                </span>
            </div>
            {hasBreakup && (
                <div className="mt-2 space-y-1 border-t border-dashed border-zinc-200 dark:border-zinc-700 pt-2">
                    {rows.map((r) => (
                        <div key={r.label} className="flex items-start justify-between gap-2 text-xs">
                            <div className="min-w-0">
                                <div className="text-zinc-600 dark:text-zinc-300">{r.label}</div>
                                <div className="text-[10px] text-zinc-400 dark:text-zinc-500">{r.hint}</div>
                            </div>
                            <span className="font-medium tabular-nums text-zinc-800 dark:text-zinc-200">{r.sign}{inr(r.value)}</span>
                        </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-700 pt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                        <span>Available = Received − Committed (per ledger)</span>
                    </div>
                </div>
            )}
            {available < 0 && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {head} is over-committed by {inr(Math.abs(available))}. Commitments already exceed the funds received for this head.
                </p>
            )}
            {available === 0 && hasBreakup && (
                <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Nothing left to commit under {head}.
                </p>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main CommitPayment component
// ---------------------------------------------------------------------------
export const CommitPayment: React.FC<CommitPaymentProps> = ({
    doctype,
    docName,
    projectName,
    budgetHeads = [],
    actualBalance = 0,
    commitableBalance,
    billAmount,
    bmr = "",
    parentAppId,
    defaultBudgetHead,
    budgetHeadIds,
    lockBudgetHead = false,
    stagingReferenceName,
    readOnly = false,
    stagingTriggerState,
    excludeStagingTriggerState,
    legacyStagingReferenceName,
    defaultParticular = "",
    frapAppId,
    forcedRefDetails,
    includeBillAmount = false,
    moduleId,
    triggerState,
    stagingStatuses,
    requiredPayloadKeys,
    title = "Make a Commitment",
    description,
    submitLabel = "Submit Commitment",
    headBalances,
    displayHeadBalances,
    showBalanceList = true,
    hideHeadBalance = false,
    onViewLedger,
    onHeadChange,
    disabled = false,
    disabledReason,
    onCommitSuccess,
    onStagingStatusChange,
    resolveRefDetails,
    customForm,
    className,
}) => {
    // ── Staging check state ──────────────────────────────────────────────────
    const [stagingStatus, setStagingStatus] = useState<"loading" | "found" | "not-found" | "error">("loading");
    const [stagingRecord, setStagingRecord] = useState<Record<string, any> | null>(null);

    // ── Form state ───────────────────────────────────────────────────────────
    const preferredCommitHead = resolveBudgetHeadOption(
        budgetHeads,
        defaultBudgetHead,
    );
    const [commitHead, setCommitHead] = useState(
        preferredCommitHead || budgetHeads[0] || "",
    );
    const [commitAmount, setCommitAmount] = useState(billAmount != null ? String(billAmount) : "");
    const [commitParticular, setCommitParticular] = useState(defaultParticular);
    const particularTouchedRef = useRef(false);
    useEffect(() => {
        if (!particularTouchedRef.current) setCommitParticular(defaultParticular);
    }, [defaultParticular]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState<{ amount: number; head: string } | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const lastAppliedDefaultHeadRef = useRef("");
    const onStagingStatusChangeRef = useRef(onStagingStatusChange);
    const commitReferenceName = stagingReferenceName || docName;
    const payloadFrapAppId = frapAppId || docName;
    const stagingStatusesKey = stagingStatuses?.join("|") || "";
    const requiredPayloadKeysKey = requiredPayloadKeys?.join("|") || "";

    // ── Frappe API hook ──────────────────────────────────────────────────────
    const { call: callCommit } = useFrappePostCall(
        "rndopsapp.rndopsapp.commitPayment.submit_commit_data"
    );
    const { call: callGetStagingStatus } = useFrappePostCall(
        "rndopsapp.rndopsapp.commitPayment.get_commit_staging_status"
    );

    useEffect(() => {
        onStagingStatusChangeRef.current = onStagingStatusChange;
    }, [onStagingStatusChange]);

    // ── Default head when budgetHeads arrive asynchronously ─────────────────
    useEffect(() => {
        if (
            preferredCommitHead &&
            lastAppliedDefaultHeadRef.current !== preferredCommitHead
        ) {
            setCommitHead(preferredCommitHead);
            lastAppliedDefaultHeadRef.current = preferredCommitHead;
            return;
        }

        if (budgetHeads.length > 0 && !commitHead) {
            setCommitHead(budgetHeads[0]);
        }
    }, [budgetHeads, commitHead, preferredCommitHead]);

    // ── Notify parent when selected head changes ─────────────────────────────
    useEffect(() => {
        if (commitHead) onHeadChange?.(commitHead);
    }, [commitHead]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Pre-fill amount from billAmount prop ─────────────────────────────────
    // Commitment amounts are whole rupees — round off any fractional value
    // (e.g. a GST-calc source amount like 1539900.1593) before prefilling.
    useEffect(() => {
        if (billAmount != null && billAmount > 0) {
            setCommitAmount(String(Math.round(billAmount)));
        }
    }, [billAmount]);

    // ── Kafka Commit Staging check (whitelisted lookup — Kafka Commit Staging
    // is read-locked to System Manager, so this bypasses that restriction for
    // the one safe, filtered-by-reference-name lookup the widget needs; see
    // get_commit_staging_status in commitPayment.py) ─────────────────────────
    const checkStagingRecord = useCallback(async () => {
        if (!commitReferenceName) return;
        setStagingStatus("loading");
        try {
            const statusFilters = stagingStatusesKey
                ? stagingStatusesKey.split("|").filter(Boolean)
                : [];
            const payloadKeys = requiredPayloadKeysKey
                ? requiredPayloadKeysKey.split("|").filter(Boolean)
                : [];
            const res = await callGetStagingStatus({
                reference_name: commitReferenceName,
                statuses: statusFilters.length ? statusFilters : undefined,
            });
            if (res?.message?.status !== "success") {
                setStagingStatus("error");
                // On API error we don't block — leave gate decision to parent
                onStagingStatusChangeRef.current?.(false);
                return;
            }
            const records: any[] = res?.message?.data ?? [];
            const recordTriggerState = (record: any): string => {
                try {
                    const rawPayload = record.payload ?? record.commit_payload ?? "{}";
                    const payload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
                    return String(payload?.trigger_state ?? "");
                } catch {
                    return "";
                }
            };
            const scopedRecords = records.filter((record) => {
                if (stagingTriggerState && recordTriggerState(record) !== stagingTriggerState) return false;
                if (excludeStagingTriggerState && recordTriggerState(record) === excludeStagingTriggerState) return false;
                return true;
            });
            const matchingRecords = payloadKeys.length
                ? scopedRecords.filter((record) => {
                      try {
                          const rawPayload = record.payload ?? record.commit_payload ?? "{}";
                          const payload =
                              typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
                          return payloadKeys.every((key) =>
                              isValuePresent(payload?.[key]),
                          );
                      } catch {
                          return false;
                      }
                  })
                : scopedRecords;

            if (matchingRecords.length === 0 && legacyStagingReferenceName) {
                const legacyRes = await callGetStagingStatus({
                    reference_name: legacyStagingReferenceName,
                    statuses: statusFilters.length ? statusFilters : undefined,
                });
                if (legacyRes?.message?.status === "success") {
                    matchingRecords.push(...(legacyRes.message.data ?? []));
                }
            }

            if (matchingRecords.length > 0) {
                setStagingRecord(matchingRecords[0]);
                setStagingStatus("found");
                onStagingStatusChangeRef.current?.(true);
            } else {
                setStagingRecord(null);
                setStagingStatus("not-found");
                onStagingStatusChangeRef.current?.(false);
            }
        } catch {
            setStagingStatus("error");
            onStagingStatusChangeRef.current?.(false);
        }
    }, [
        commitReferenceName,
        requiredPayloadKeysKey,
        stagingStatusesKey,
        stagingTriggerState,
        excludeStagingTriggerState,
        legacyStagingReferenceName,
        callGetStagingStatus,
    ]);

    useEffect(() => {
        checkStagingRecord();
    }, [checkStagingRecord]);

    // Commitable balance for the currently selected head (falls back to total committable, then actual)
    // The display-only per-head figure is floored at 0: a head that has been committed against
    // without any fund received (e.g. Overhead, which is shown as ₹0 in the balance list) has
    // nothing available, not a negative amount.
    const selectedHeadBalance = commitHead && headBalances?.[commitHead] != null
        ? headBalances[commitHead].commitable
        : commitHead && displayHeadBalances?.[commitHead] != null
            ? Math.max(0, displayHeadBalances[commitHead].commitable)
            : (commitableBalance ?? actualBalance);

    // Per-head figures: use what the page supplied, otherwise load the project's own ledger so
    // every commit form shows the same balance breakup without each page wiring it up.
    const suppliedBalances = headBalances ?? displayHeadBalances;
    const ledger = useProjectBudget(suppliedBalances ? "" : projectName || "");
    const balanceMap: Record<string, HeadBalanceLike> = suppliedBalances ?? ledger.headBalances;
    const selectedBalance = commitHead ? balanceMap[commitHead] : undefined;

    // "View Project Ledger": pages that own a ledger modal pass onViewLedger; every other form
    // gets one here, so the button shows wherever a commitment can be made.
    const [ownLedgerOpen, setOwnLedgerOpen] = useState(false);
    const [ownLedgerHeads, setOwnLedgerHeads] = useState<{ name: string; id: number | string }[]>([]);
    const openOwnLedger = useCallback(async () => {
        setOwnLedgerOpen(true);
        if (ownLedgerHeads.length > 0) return;
        try {
            const res = await fetch(
                `${FRAPPE_BASE_URL}/api/resource/Budget%20Head?fields=["*"]&order_by=name%20asc&limit_page_length=0`,
                { credentials: "include" },
            );
            const json = await res.json();
            setOwnLedgerHeads(
                (json?.data || []).map((h: any) => ({ name: h.title || h.budget_head || h.name, id: h.id })),
            );
        } catch {
            // modal shows its own empty state
        }
    }, [ownLedgerHeads.length]);
    const viewLedgerHandler = onViewLedger ?? (projectName ? openOwnLedger : undefined);

    // ── Custom-form submit (same payload as handleCommit, refDetails supplied by caller) ──
    const submittingRef = useRef(false);
    const submitCustom = useCallback(async ({ budgetHead, amount, particular, refDetails, asDecommit }: CommitPaymentCustomSubmit) => {
        if (submittingRef.current) throw new Error("A submission is already in progress.");
        if (!budgetHead) throw new Error("Please select a budget head.");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Please enter a valid positive amount.");
        // A decommitment must point at the commitment (TID) it releases.
        if (asDecommit && !String(refDetails ?? "").trim()) {
            throw new Error("Reference details are required: select the commitment (TID) being decommitted.");
        }
        if (!commitReferenceName || !payloadFrapAppId || !projectName) {
            throw new Error("Missing document reference or project number. Reload the page and try again.");
        }
        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            // Fresh duplicate check — the staging state on screen may be stale.
            const existing = await callGetStagingStatus({ reference_name: commitReferenceName });
            if (existing?.message?.status === "success" && (existing.message.data ?? []).length > 0) {
                throw new Error("A commitment has already been staged for this application.");
            }
            const payload = {
                doctype,
                frapAppId: payloadFrapAppId,
                name: commitReferenceName,
                project_name: projectName,
                commit_amount: asDecommit ? -Math.abs(amount) : amount,
                budget_head: budgetHead,
                bmr: bmr || "",
                ...(includeBillAmount ? { bill_amount: amount } : {}),
                ...(moduleId !== undefined ? { moduleId } : {}),
                ...(refDetails ? { refDetails } : {}),
                ...(triggerState ? { trigger_state: triggerState } : {}),
                commitParticular: particular.trim(),
            };
            let res;
            try {
                res = await callCommit(payload);
            } catch (error: any) {
                throw new Error(extractCommitErrorMessage(error, "Commitment failed. Please try again."));
            }
            if (res?.message?.status === "error") {
                throw new Error(res.message.message || "Commitment failed. Please try again.");
            }
            setSubmitSuccess({ amount, head: budgetHead });
            onCommitSuccess?.(budgetHead, amount);
            onStagingStatusChangeRef.current?.(true);
            setTimeout(() => checkStagingRecord(), 1200);
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    }, [commitReferenceName, payloadFrapAppId, projectName, doctype, bmr, includeBillAmount, moduleId, triggerState, callGetStagingStatus, callCommit, onCommitSuccess, checkStagingRecord]);

    // ── Validate & open confirmation dialog ─────────────────────────────────
    const handleSubmitClick = () => {
        setSubmitError(null);
        const amount = parseFloat(commitAmount);
        if (!commitHead) { setSubmitError("Please select a budget head."); return; }
        if (isNaN(amount) || amount <= 0) { setSubmitError("Please enter a valid positive amount."); return; }
        if (!commitReferenceName || !payloadFrapAppId || !projectName) {
            // Name the missing piece — "project" is almost always the culprit on
            // an Other-PI form whose page was loaded before the PI assigned their
            // project (SWR auto-revalidation is disabled app-wide, so the stale
            // value persists until a full reload).
            const missing = [
                !commitReferenceName && "document reference",
                !payloadFrapAppId && "application id",
                !projectName && "project number",
            ].filter(Boolean).join(", ");
            setSubmitError(
                `Missing ${missing}. If this application was just approved by the other PI, reload the page to pick up the assigned project.`
            );
            return;
        }
        if (disabled) { setSubmitError(disabledReason || "Commitment cannot be submitted yet."); return; }
        if (headBalances && commitHead && headBalances[commitHead] != null) {
            const headCommitable = headBalances[commitHead].commitable;
            if (amount > headCommitable) {
                setSubmitError(
                    `Amount ₹${amount.toLocaleString("en-IN")} exceeds the commitable balance of ₹${headCommitable.toLocaleString("en-IN")} for "${commitHead}".`
                );
                return;
            }
        }
        setShowConfirmDialog(true);
    };

    // ── Actual commit (called from dialog "Confirm & Commit") ────────────────
    const handleCommit = async () => {
        setShowConfirmDialog(false);
        setSubmitError(null);
        const amount = parseFloat(commitAmount);
        setIsSubmitting(true);
        try {
            let refDetails: string | undefined = forcedRefDetails?.trim() || undefined;

            // Resolve ref details via callback (e.g. call ref_details_id endpoint)
            if (!refDetails && resolveRefDetails) {
                try {
                    const resolved = await resolveRefDetails(commitHead, amount);
                    if (resolved) refDetails = resolved;
                } catch (resolveErr: any) {
                    setSubmitError(resolveErr?.message || "Failed to fetch reference details. Please try again.");
                    setIsSubmitting(false);
                    return;
                }
            }

            // If a parent app is linked, fetch its committed TID from the ledger
            if (!refDetails && parentAppId) {
                try {
                    // The ledger API's accountHeadId param expects the Budget Head's numeric/short id,
                    // not the human-readable label — resolve it via budgetHeadIds, falling back to the
                    // label itself if no mapping was provided.
                    if (isOverheadProjectNo(projectName)) {
                        // An overhead fund's log must not travel over /ledger-api (unauthenticated
                        // proxy — see services/overheadLedger), so it is read through the whitelisted
                        // Frappe method. The id it yields is the overheadCommitId, which is what
                        // refDetails expects on the overhead side. Rows of every type share the log,
                        // so the parent's COMMIT row is preferred over any other carrying its frapAppId.
                        const rows = await fetchOverheadLedger(projectName);
                        const parentEntry =
                            rows.find((e) => e.frapAppId === parentAppId && e.transactionType === "COMMIT") ??
                            rows.find((e) => e.frapAppId === parentAppId);
                        if (parentEntry?.transactionId != null) {
                            refDetails = String(parentEntry.transactionId);
                        }
                    } else {
                        const accountHeadId = budgetHeadIds?.[commitHead] ?? commitHead;
                        const ledgerUrl = `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectName)}&accountHeadId=${encodeURIComponent(String(accountHeadId))}`;
                        const ledgerRes = await fetch(ledgerUrl);
                        if (ledgerRes.ok) {
                            const entries: any[] = await ledgerRes.json().then((d) =>
                                Array.isArray(d) ? d : []
                            );
                            const parentEntry = entries.find((e: any) => e.frapAppId === parentAppId);
                            if (parentEntry) {
                                refDetails = String(parentEntry.transactionId);
                            }
                        }
                    }
                } catch (ledgerErr) {
                }

                if (!refDetails) {
                    setSubmitError(
                        "Could not find the parent application TID in the ledger. Please ensure it has been committed first."
                    );
                    setIsSubmitting(false);
                    return;
                }
            }

            const normalizedCommitParticular = commitParticular.trim();
            const commitPayload = {
                doctype,
                frapAppId: payloadFrapAppId,
                name: commitReferenceName,
                project_name: projectName,
                commit_amount: amount,
                budget_head: commitHead,
                bmr: bmr || "",
                ...(includeBillAmount ? { bill_amount: amount } : {}),
                ...(moduleId !== undefined ? { moduleId } : {}),
                ...(refDetails ? { refDetails } : {}),
                ...(triggerState ? { trigger_state: triggerState } : {}),
                commitParticular: normalizedCommitParticular,
            };

            let commitResponse;
            try {
                commitResponse = await callCommit(commitPayload);
            } catch (error: any) {
                const message = extractCommitErrorMessage(
                    error,
                    "Commitment failed. Please try again.",
                );
                if (
                    moduleId !== undefined &&
                    /unexpected keyword argument ['"]moduleId['"]|moduleId/i.test(message)
                ) {
                    const retryPayload = { ...commitPayload };
                    delete (retryPayload as any).moduleId;
                    commitResponse = await callCommit(retryPayload);
                } else {
                    throw new Error(message);
                }
            }

            if (commitResponse?.message?.status === "error") {
                const message =
                    commitResponse.message.message ||
                    "Commitment failed. Please try again.";
                if (
                    moduleId !== undefined &&
                    /unexpected keyword argument ['"]moduleId['"]|moduleId/i.test(message)
                ) {
                    const retryPayload = { ...commitPayload };
                    delete (retryPayload as any).moduleId;
                    commitResponse = await callCommit(retryPayload);
                    if (commitResponse?.message?.status === "error") {
                        throw new Error(
                            commitResponse.message.message ||
                                "Commitment failed. Please try again.",
                        );
                    }
                } else {
                    throw new Error(message);
                }
            }

            setSubmitSuccess({ amount, head: commitHead });
            onCommitSuccess?.(commitHead, amount);
            onStagingStatusChangeRef.current?.(true); // immediately unblock action buttons

            // Re-check staging after a brief delay so the new record is visible
            setTimeout(() => checkStagingRecord(), 1200);
        } catch (error: any) {
            setSubmitError(error?.message || "Commitment failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Commitment amounts are whole rupees only — strip decimal input entirely
    // rather than allowing paise to be typed.
    const handleCommitAmountChange = (value: string) => {
        const cleaned = value.replace(/,/g, "").replace(/[^\d]/g, "");
        setCommitAmount(cleaned);
    };

    // ── Render: Loading ──────────────────────────────────────────────────────
    if (stagingStatus === "loading") {
        return (
            <div className={cn("bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3", className)}>
                <Loader2 className="w-4 h-4 animate-spin text-[#D97757]" />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Checking commitment status…</span>
            </div>
        );
    }

    // ── Render: Already committed → display card ─────────────────────────────
    if (stagingStatus === "found" && stagingRecord) {
        return (
            <div className={cn(className)}>
                <CommittedDataCard stagingRecord={stagingRecord} budgetHeadIds={budgetHeadIds ?? Object.fromEntries(Object.entries(headBalances ?? {}).map(([k, v]) => [k, v.id]))} />
            </div>
        );
    }

    if (readOnly) return null;

    // ── Render: Success state (just submitted) ───────────────────────────────
    if (submitSuccess) {
        return (
            <div className={cn("bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm", className)}>
                <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                            ₹{submitSuccess.amount.toLocaleString("en-IN")} committed under "{submitSuccess.head}"
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                            Your commitment has been staged. It will be reflected after approval.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: Custom form (e.g. decommitment wizard) ───────────────────────
    if (customForm) {
        return (
            <div className={cn("bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm", className)}>
                <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-[#D97757]" />
                    <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{title}</h3>
                </div>
                {description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">{description}</p>
                )}
                {customForm({ submit: submitCustom, isSubmitting })}
            </div>
        );
    }

    // ── Render: Form (normal state) ──────────────────────────────────────────
    const parsedCommitAmount = parseFloat(commitAmount);
    const amountExceedsSubmit =
        !isNaN(parsedCommitAmount) &&
        parsedCommitAmount > 0 &&
        headBalances != null &&
        commitHead !== "" &&
        headBalances[commitHead] != null &&
        parsedCommitAmount > headBalances[commitHead].commitable;

    return (
        <>
        <div className={cn("bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm", className)}>
            {/* Title */}
            <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-[#D97757]" />
                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {title}
                </h3>
            </div>
            {description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
                    {description}
                </p>
            )}

            {/* Staging-check error (non-fatal) */}
            {stagingStatus === "error" && (
                <div className="mb-3 flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Could not verify staging status. You may proceed, but duplicate submissions are possible.
                </div>
            )}
            {disabled && disabledReason && (
                <div className="mb-3 flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {disabledReason}
                </div>
            )}

            <div className="space-y-4">
                {/* Budget Head */}
                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                        Budget Head
                    </label>
                    <select
                        value={commitHead}
                        onChange={(e) => setCommitHead(e.target.value)}
                        disabled={disabled || lockBudgetHead || budgetHeads.length === 0}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                    >
                        {budgetHeads.length === 0 ? (
                            <option value="">Loading budget heads…</option>
                        ) : (
                            <>
                                {!commitHead && (
                                    <option value="" disabled>
                                        — Select Budget Head —
                                    </option>
                                )}
                                {budgetHeads.map((head) => (
                                    <option key={head} value={head}>
                                        {head}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                    {commitHead && !hideHeadBalance && (
                        <SelectedHeadBalance head={commitHead} balance={selectedBalance} fallbackAvailable={selectedHeadBalance} />
                    )}
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                        Amount (₹)
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={commitAmount}
                        onChange={(e) => handleCommitAmountChange(e.target.value)}
                        disabled={disabled}
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={(e) => {
                            if (["e", "E", "+", "-", "."].includes(e.key)) {
                                e.preventDefault();
                            }
                        }}
                        placeholder="e.g. 5000"
                        className={cn(
                            "w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2",
                            amountExceedsSubmit
                                ? "border-red-400 dark:border-red-500 focus:ring-red-300/30 focus:border-red-500"
                                : "border-zinc-300 dark:border-zinc-700 focus:ring-[#D97757]/25 focus:border-[#D97757]",
                        )}
                    />
                    {amountExceedsSubmit && (
                        <p className="flex items-center gap-1 mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            Exceeds available ₹{headBalances![commitHead].commitable.toLocaleString("en-IN")}
                        </p>
                    )}
                </div>

                {/* Particulars / Comment (commitParticular) */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                            Particulars / Comment
                        </label>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            {commitParticular.length}/200
                        </span>
                    </div>
                    <textarea
                        rows={2}
                        maxLength={200}
                        value={commitParticular}
                        onChange={(e) => { particularTouchedRef.current = true; setCommitParticular(e.target.value); }}
                        disabled={disabled}
                        placeholder="Optional note about this commitment…"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] resize-none"
                    />
                </div>

                {/* Static Ref ID — shown when a forcedRefDetails value is available */}
                {forcedRefDetails && (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2.5 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shrink-0">
                            Ref ID
                        </span>
                        <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                            {forcedRefDetails}
                        </span>
                    </div>
                )}

                {/* Error message */}
                {submitError && (
                    <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {submitError}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleSubmitClick}
                    disabled={disabled || isSubmitting || !commitHead || !commitAmount || amountExceedsSubmit}
                    className="w-full flex items-center justify-center gap-2 bg-[#D97757] hover:bg-[#c66a4e] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Committing…
                        </>
                    ) : (
                        submitLabel
                    )}
                </button>
            </div>

            {/* Confirmation dialog */}
            {showConfirmDialog && (
                <ConfirmCommitDialog
                    budgetHeadName={commitHead}
                    availableBalance={selectedHeadBalance}
                    commitAmount={parseFloat(commitAmount) || 0}
                    onConfirm={handleCommit}
                    onCancel={() => setShowConfirmDialog(false)}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
        {showBalanceList && (
            <ProjectBalanceList balances={balanceMap} selectedHead={commitHead} onViewLedger={viewLedgerHandler} className="mt-4" />
        )}
        {ownLedgerOpen && projectName && (
            <ProjectLedgerModal
                isOpen
                onClose={() => setOwnLedgerOpen(false)}
                projectName={projectName}
                budgetHeadList={ownLedgerHeads}
            />
        )}
        </>
    );
};

export default CommitPayment;
