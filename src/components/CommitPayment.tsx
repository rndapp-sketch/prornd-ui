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
import { useFrappePostCall } from "frappe-react-sdk";
import { CheckCircle2, AlertCircle, Loader2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommitPaymentProps {
    /** Frappe doctype name (e.g. "Disbursal of Honorarium") */
    doctype: string;
    /** The document name / application ID — also used as reference_name for Kafka Commit Staging check */
    docName: string;
    /** Project number / code to commit against */
    projectName: string;
    /** Available budget heads as string labels */
    budgetHeads?: string[];
    /** Available balance to display */
    actualBalance?: number;
    /** Optional: bill amount to pre-fill the commit amount field */
    billAmount?: number;
    /** Optional: bmr value */
    bmr?: string;
    /** Optional: parent application ID whose committed TID is fetched as refDetails (e.g. Travel → TA DA Settlement) */
    parentAppId?: string;
    /** Optional: budget head to auto-select when it exists in budgetHeads */
    defaultBudgetHead?: string;
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
    /** Optional: disable the form externally while still showing it */
    disabled?: boolean;
    /** Optional: reason shown when disabled externally */
    disabledReason?: string;
    /** Optional: called after a successful commit so the parent can update its local state */
    onCommitSuccess?: (head: string, amount: number) => void;
    /**
     * Optional: called whenever the staging check resolves.
     * `isCommitted` is true if a Kafka Commit Staging record exists for this docName.
     * Parents should use this to disable forward/action buttons for Staff RnD users.
     */
    onStagingStatusChange?: (isCommitted: boolean) => void;
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
// Committed Data Display card
// ---------------------------------------------------------------------------
interface CommittedDataCardProps {
    stagingRecord: Record<string, any>;
}

const CommittedDataCard: React.FC<CommittedDataCardProps> = ({ stagingRecord }) => {
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
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

    return (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Commitment Details
                </h3>
            </div>

            {/* Already-committed notice */}
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                A commitment has already been submitted for this application. Duplicate submissions are blocked.
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
                                {label}
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
    billAmount,
    bmr = "",
    parentAppId,
    defaultBudgetHead,
    stagingReferenceName,
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
    disabled = false,
    disabledReason,
    onCommitSuccess,
    onStagingStatusChange,
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
    const [commitParticular, setCommitParticular] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState<{ amount: number; head: string } | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
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

    // ── Pre-fill amount from billAmount prop ─────────────────────────────────
    useEffect(() => {
        if (billAmount != null && billAmount > 0) {
            setCommitAmount(String(billAmount));
        }
    }, [billAmount]);

    // ── Kafka Commit Staging check (REST API, no SDK) ────────────────────────
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
            const encodedFilter = encodeURIComponent(
                JSON.stringify([
                    ["reference_name", "=", commitReferenceName],
                    ...(statusFilters.length
                        ? [["status", "in", statusFilters]]
                        : []),
                ])
            );
            const url = `/api/v2/document/Kafka Commit Staging?filters=${encodedFilter}&fields=["*"]`;
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) {
                setStagingStatus("error");
                // On API error we don't block — leave gate decision to parent
                onStagingStatusChangeRef.current?.(false);
                return;
            }
            const json = await res.json();
            const records: any[] = json?.data ?? [];
            const matchingRecords = payloadKeys.length
                ? records.filter((record) => {
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
                : records;

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
    ]);

    useEffect(() => {
        checkStagingRecord();
    }, [checkStagingRecord]);

    // ── Submit handler ───────────────────────────────────────────────────────
    const handleCommit = async () => {
        setSubmitError(null);
        const amount = parseFloat(commitAmount);
        if (!commitHead) {
            setSubmitError("Please select a budget head.");
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            setSubmitError("Please enter a valid positive amount.");
            return;
        }
        if (!commitReferenceName || !payloadFrapAppId || !projectName) {
            setSubmitError("Missing document or project information.");
            return;
        }
        if (disabled) {
            setSubmitError(disabledReason || "Commitment cannot be submitted yet.");
            return;
        }

        setIsSubmitting(true);
        try {
            let refDetails: string | undefined = forcedRefDetails?.trim() || undefined;

            // If a parent app is linked, fetch its committed TID from the ledger
            if (!refDetails && parentAppId) {
                try {
                    const ledgerUrl = `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectName)}&accountHeadId=${encodeURIComponent(commitHead)}`;
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
                } catch (ledgerErr) {
                    console.error("Failed to fetch parent TID from ledger:", ledgerErr);
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

    const handleCommitAmountChange = (value: string) => {
        const cleaned = value
            .replace(/,/g, "")
            .replace(/[^\d.]/g, "")
            .replace(/(\..*)\./g, "$1");
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
                <CommittedDataCard stagingRecord={stagingRecord} />
            </div>
        );
    }

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

    // ── Render: Form (normal state) ──────────────────────────────────────────
    return (
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
                        disabled={disabled}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                    >
                        {budgetHeads.length > 0 ? (
                            budgetHeads.map((head) => (
                                <option key={head} value={head}>
                                    {head}
                                </option>
                            ))
                        ) : (
                            <option value="">No Budget Heads available</option>
                        )}
                    </select>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Available:{" "}
                        <span className="font-medium text-[#D97757]">
                            ₹{actualBalance.toLocaleString("en-IN")}
                        </span>
                    </p>
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                        Amount (₹)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={commitAmount}
                        onChange={(e) => handleCommitAmountChange(e.target.value)}
                        disabled={disabled}
                        onKeyDown={(e) => {
                            if (["e", "E", "+", "-"].includes(e.key) || /[a-zA-Z]/.test(e.key)) {
                                e.preventDefault();
                            }
                        }}
                        placeholder="e.g. 5000"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                    />
                </div>

                {/* Particulars / Comment (commitParticular) */}
                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                        Particulars / Comment
                    </label>
                    <textarea
                        rows={2}
                        value={commitParticular}
                        onChange={(e) => setCommitParticular(e.target.value)}
                        disabled={disabled}
                        placeholder="Optional note about this commitment…"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] resize-none"
                    />
                </div>

                {/* Error message */}
                {submitError && (
                    <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {submitError}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleCommit}
                    disabled={disabled || isSubmitting || !commitHead || !commitAmount}
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
        </div>
    );
};

export default CommitPayment;
