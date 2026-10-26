import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, MinusCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchOverheadLedger, isOverheadProjectNo } from "@/services/overheadLedger";
import {
    computeDecommit,
    eligibleCommitments,
    isCommitRow,
    isPaymentRow,
    rowKey,
    validateDecommitAmount,
    type LedgerRow,
} from "@/utils/decommitCalc";
import type { CommitPaymentCustomSubmit } from "@/components/CommitPayment";

const inr = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");

const STEPS = ["Budget Head", "Commitment", "Payments", "Calculate", "Confirm"] as const;

interface DecommitWizardProps {
    projectName: string;
    budgetHeads: string[];
    /** Budget head label → ledger account head id */
    budgetHeadIds: Record<string, number | string>;
    defaultBudgetHead?: string;
    /** TID of the commitment to preselect (e.g. the one funding the resigning employee) */
    preferredTid?: number | string;
    defaultParticular?: string;
    /** Optional hint shown on the calculate step (e.g. the employee's own unraised share) */
    suggestedAmount?: number;
    isSubmitting: boolean;
    submit: (args: CommitPaymentCustomSubmit) => Promise<void>;
}

export const DecommitWizard: React.FC<DecommitWizardProps> = ({
    projectName,
    budgetHeads,
    budgetHeadIds,
    defaultBudgetHead,
    preferredTid,
    defaultParticular = "",
    suggestedAmount,
    isSubmitting,
    submit,
}) => {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [head, setHead] = useState("");
    const [rows, setRows] = useState<LedgerRow[]>([]);
    const [loadingLedger, setLoadingLedger] = useState(false);
    const [ledgerError, setLedgerError] = useState<string | null>(null);
    const [selectedTid, setSelectedTid] = useState<string>("");
    const [amount, setAmount] = useState("");
    const [amountTouched, setAmountTouched] = useState(false);
    const [comment, setComment] = useState(defaultParticular);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const headOptions = useMemo(() => budgetHeads.filter((h) => budgetHeadIds[h] !== undefined), [budgetHeads, budgetHeadIds]);

    const loadLedger = useCallback(
        async (headLabel: string): Promise<LedgerRow[]> => {
            if (isOverheadProjectNo(projectName)) return (await fetchOverheadLedger(projectName)) as LedgerRow[];
            const id = budgetHeadIds[headLabel];
            const res = await fetch(
                `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectName)}&accountHeadId=${encodeURIComponent(String(id))}`,
            );
            if (!res.ok) throw new Error(`Ledger service returned ${res.status}.`);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        [projectName, budgetHeadIds],
    );

    const openWizard = () => {
        setStep(0);
        setSubmitError(null);
        setAmountTouched(false);
        setAmount("");
        setSelectedTid("");
        setRows([]);
        setLedgerError(null);
        setComment(defaultParticular);
        setHead(defaultBudgetHead && headOptions.includes(defaultBudgetHead) ? defaultBudgetHead : headOptions[0] || "");
        setOpen(true);
    };

    // Load the selected head's ledger whenever it changes while the wizard is open.
    useEffect(() => {
        if (!open || !head) return;
        let cancelled = false;
        setLoadingLedger(true);
        setLedgerError(null);
        setSelectedTid("");
        setAmountTouched(false);
        loadLedger(head)
            .then((data) => {
                if (cancelled) return;
                setRows(data);
                const eligible = eligibleCommitments(data);
                const preferred = preferredTid !== undefined ? `commit:${preferredTid}` : "";
                if (preferred && eligible.some((r) => rowKey(r) === preferred)) setSelectedTid(preferred);
            })
            .catch((e: unknown) => {
                if (!cancelled) {
                    setRows([]);
                    setLedgerError(e instanceof Error && e.message ? e.message : "Could not load the ledger.");
                }
            })
            .finally(() => !cancelled && setLoadingLedger(false));
        return () => {
            cancelled = true;
        };
    }, [open, head, loadLedger, preferredTid]);

    const eligible = useMemo(() => eligibleCommitments(rows), [rows]);
    const selected = useMemo(() => eligible.find((r) => rowKey(r) === selectedTid), [eligible, selectedTid]);
    const summary = useMemo(() => (selected ? computeDecommit(selected, rows) : null), [selected, rows]);

    // Prefill the editable amount with the maximum until the user changes it.
    useEffect(() => {
        if (summary && !amountTouched) setAmount(String(summary.maxDecommit));
    }, [summary, amountTouched]);

    const max = summary?.maxDecommit ?? 0;
    const amountError = summary ? validateDecommitAmount(amount, max) : null;
    const commentError = comment.trim() ? null : "A comment is required.";

    const stepError = (s: number): string | null => {
        if (s === 0) return head ? null : "Select a budget head.";
        if (s === 1) return selected ? null : "Select a commitment to continue.";
        if (s === 3) return amountError || commentError;
        return null;
    };
    const canNext = !stepError(step) && !loadingLedger;

    const handleSubmit = async () => {
        if (!selected || !summary) return;
        setSubmitError(null);
        try {
            // Re-read the ledger so a payment raised since the wizard opened can't be over-released.
            const fresh = await loadLedger(head);
            const freshSelected = eligibleCommitments(fresh).find((r) => rowKey(r) === selectedTid);
            if (!freshSelected) throw new Error("This commitment is no longer eligible. Reopen the wizard and pick again.");
            const freshSummary = computeDecommit(freshSelected, fresh);
            const err = validateDecommitAmount(amount, freshSummary.maxDecommit);
            if (err) throw new Error(`The ledger changed while you were working. ${err}`);
            await submit({
                budgetHead: head,
                amount: Number(amount),
                particular: comment,
                refDetails: String(selected.transactionId),
                asDecommit: true,
            });
            setOpen(false);
        } catch (e: unknown) {
            setSubmitError(e instanceof Error && e.message ? e.message : "Decommitment failed. Please try again.");
        }
    };

    const labelCls = "text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400";
    const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" }) => (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2">
            <p className={labelCls}>{label}</p>
            <p
                className={cn(
                    "text-base font-extrabold tabular-nums",
                    tone === "red" && "text-red-600 dark:text-red-400",
                    tone === "green" && "text-emerald-600 dark:text-emerald-400",
                    !tone && "text-zinc-900 dark:text-zinc-100",
                )}
            >
                {value}
            </p>
        </div>
    );

    const renderStep = () => {
        if (step === 0) {
            return (
                <div className="space-y-3">
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        Choose the budget head that holds the commitment to release. It is preselected from the employee's recruitment commitment.
                    </p>
                    <label className={labelCls}>Budget Head</label>
                    <select
                        value={head}
                        onChange={(e) => setHead(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/40"
                    >
                        {headOptions.map((h) => (
                            <option key={h} value={h}>{h}</option>
                        ))}
                    </select>
                    {headOptions.length === 0 && (
                        <p className="text-xs text-amber-600">No budget heads with a ledger were found for this project.</p>
                    )}
                </div>
            );
        }
        if (step === 1) {
            if (loadingLedger) return <Loading text="Loading commitment ledger…" />;
            if (ledgerError) return <ErrorBox text={ledgerError} />;
            if (rows.length === 0)
                return <p className="text-sm text-zinc-500 py-8 text-center">No ledger entries in “{head}” for this project.</p>;
            const eligibleKeys = new Set(eligible.map(rowKey));
            const ordered = rows.filter((r) => isCommitRow(r) && !isPaymentRow(r)).sort(
                (x, y) =>
                    new Date(x.transactionDate || 0).getTime() - new Date(y.transactionDate || 0).getTime() ||
                    Number(x.transactionId) - Number(y.transactionId),
            );
            return (
                <div className="space-y-2">
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        Commitments in {head}. Select one to decommit from; click it again to deselect. Cancelled and adjustment entries cannot be selected.
                        {eligible.length === 0 && <span className="ml-1 font-semibold text-amber-600">There is no eligible commitment in this head.</span>}
                    </p>
                    {selected && (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#D97757]/40 bg-[#D97757]/10 px-3 py-2 text-sm">
                            <span>
                                Selected: TID <span className="font-mono font-bold">{String(selected.transactionId)}</span>
                                {selected.frapAppId ? ` · ${selected.frapAppId}` : ""}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedTid("");
                                    setAmountTouched(false);
                                    setAmount("");
                                }}
                                className="flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                            >
                                <X className="h-3 w-3" /> Clear selection
                            </button>
                        </div>
                    )}
                    <div className="max-h-[52vh] overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">
                                <tr>
                                    <th className="px-2 py-2 w-8" />
                                    <th className="px-2 py-2 text-left">TID</th>
                                    <th className="px-2 py-2 text-left">App ID</th>
                                    <th className="px-2 py-2 text-left">Date</th>
                                    <th className="px-2 py-2 text-left">Particulars</th>
                                    <th className="px-2 py-2 text-right">Committed</th>
                                    <th className="px-2 py-2 text-right">Paid</th>
                                    <th className="px-2 py-2 text-right">Decommitable</th>
                                    <th className="px-2 py-2 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                {ordered.map((r, i) => {
                                    const tid = String(r.transactionId ?? "");
                                    const key = rowKey(r);
                                    const canSelect = eligibleKeys.has(key);
                                    const active = canSelect && key === selectedTid;
                                    const s = canSelect ? computeDecommit(r, rows) : null;
                                    return (
                                        <tr
                                            key={`${tid}-${i}`}
                                            onClick={
                                                canSelect
                                                    ? () => {
                                                          setSelectedTid(active ? "" : key);
                                                          setAmountTouched(false);
                                                          if (active) setAmount("");
                                                      }
                                                    : undefined
                                            }
                                            className={cn(
                                                canSelect ? "cursor-pointer" : "cursor-not-allowed text-zinc-400 dark:text-zinc-500",
                                                active ? "bg-[#D97757]/10" : canSelect && "hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                                            )}
                                        >
                                            <td className="px-2 py-2">
                                                {canSelect ? (
                                                    <input type="radio" readOnly checked={active} className="accent-[#D97757]" />
                                                ) : (
                                                    <input type="radio" disabled className="opacity-30" />
                                                )}
                                            </td>
                                            <td className="px-2 py-2 font-mono">{tid || "-"}</td>
                                            <td className="px-2 py-2 font-mono whitespace-nowrap">{r.frapAppId || "-"}</td>
                                            <td className="px-2 py-2 whitespace-nowrap">{fmtDate(r.transactionDate)}</td>
                                            <td className="px-2 py-2" title={r.particulars}>{r.particulars}</td>
                                            <td className="px-2 py-2 text-right tabular-nums font-semibold">{r.commitAmount ? inr(r.commitAmount) : "-"}</td>
                                            <td className="px-2 py-2 text-right tabular-nums">{s ? inr(s.totalPaid) : "-"}</td>
                                            <td className="px-2 py-2 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                                                {s ? inr(s.maxDecommit) : "-"}
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap">{r.status}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }
        if (step === 2 && summary && selected) {
            return (
                <div className="space-y-3">
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        Payments linked to commitment TID <span className="font-mono font-bold">{String(selected.transactionId)}</span>.
                    </p>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 text-sm sm:grid-cols-3">
                        {([
                            ["Budget head", head],
                            ["Application", selected.frapAppId || "-"],
                            ["Committed on", fmtDate(selected.transactionDate)],
                            ["Committed amount", inr(summary.original)],
                            ["Status", selected.status || "-"],
                            ["Payments", String(summary.payments.length)],
                        ] as [string, string][]).map(([k, v]) => (
                            <div key={k} className="min-w-0">
                                <dt className={labelCls}>{k}</dt>
                                <dd className="font-semibold text-zinc-900 dark:text-zinc-100 break-words">{v}</dd>
                            </div>
                        ))}
                        <div className="col-span-full min-w-0">
                            <dt className={labelCls}>Particulars</dt>
                            <dd className="text-zinc-900 dark:text-zinc-100 break-words">{selected.particulars || "-"}</dd>
                        </div>
                    </dl>
                    {summary.paymentsLinkedByApp.length > 0 && (
                        <p className="text-[11px] text-zinc-500">
                            {summary.paymentsLinkedByApp.length} payment(s) have no TID reference and are linked through application {selected.frapAppId}.
                        </p>
                    )}
                    {summary.payments.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/10 px-4 py-5 text-center">
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                No payments have been made against this commitment.
                            </p>
                            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                                The full committed amount of {inr(summary.original)} is still available to release. Continue to calculate the decommitment.
                            </p>
                        </div>
                    ) : (
                        <div className="max-h-[44vh] overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">
                                    <tr>
                                        <th className="px-2 py-2 text-left">TID</th>
                                        <th className="px-2 py-2 text-left">Date</th>
                                        <th className="px-2 py-2 text-left">Particulars</th>
                                        <th className="px-2 py-2 text-right">Payment</th>
                                        <th className="px-2 py-2 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                    {summary.payments.map((p) => (
                                        <tr key={String(p.transactionId)}>
                                            <td className="px-2 py-2 font-mono">{String(p.transactionId)}</td>
                                            <td className="px-2 py-2 whitespace-nowrap">{fmtDate(p.transactionDate)}</td>
                                            <td className="px-2 py-2 max-w-none" title={p.particulars}>{p.particulars}</td>
                                            <td className="px-2 py-2 text-right tabular-nums font-semibold">{inr(p.paymentAmount || 0)}</td>
                                            <td className="px-2 py-2 whitespace-nowrap">{p.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {summary.adjustments.length > 0 && (
                        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-200">
                            <p className="font-bold mb-1">Earlier adjustments on this commitment</p>
                            {summary.adjustments.map((a) => (
                                <p key={String(a.transactionId)} className="flex justify-between gap-3">
                                    <span className="truncate">TID {String(a.transactionId)} · {a.particulars}</span>
                                    <span className="tabular-nums font-semibold">{inr(a.commitAmount || 0)}</span>
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        if (step === 3 && summary) {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat label="Original committed" value={inr(summary.original)} />
                        {summary.totalPaid > 0 && <Stat label="Total paid" value={inr(summary.totalPaid)} tone="red" />}
                        {summary.priorAdjustments !== 0 && <Stat label="Earlier adjustments" value={inr(summary.priorAdjustments)} />}
                        <Stat label="Eligible balance (max)" value={inr(summary.maxDecommit)} tone="green" />
                    </div>
                    <p className="text-[11px] text-zinc-500">
                        Maximum decommitment = original committed − total paid{summary.priorAdjustments !== 0 ? " ± earlier adjustments" : ""}, in whole rupees.
                    </p>
                    {suggestedAmount !== undefined && suggestedAmount > 0 && suggestedAmount < summary.maxDecommit && (
                        <p className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs text-blue-800 dark:text-blue-200">
                            This commitment covers the whole recruitment. This employee's own unraised share is{" "}
                            <button type="button" className="font-bold underline" onClick={() => { setAmountTouched(true); setAmount(String(suggestedAmount)); }}>
                                {inr(suggestedAmount)}
                            </button>{" "}
                            — use it unless the full balance should be released.
                        </p>
                    )}
                    <div>
                        <label className={labelCls}>Decommitment amount (₹)</label>
                        <input
                            inputMode="numeric"
                            value={amount}
                            onChange={(e) => {
                                setAmountTouched(true);
                                setAmount(e.target.value.replace(/[^\d]/g, ""));
                            }}
                            className={cn(
                                "mt-1 w-full rounded-lg border bg-white dark:bg-zinc-900 px-3 py-2 text-sm tabular-nums text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2",
                                amountError ? "border-red-400 focus:ring-red-300" : "border-zinc-300 dark:border-zinc-700 focus:ring-[#D97757]/40",
                            )}
                        />
                        {amountError && <p className="mt-1 text-xs text-red-600">{amountError}</p>}
                        {!amountError && amount && <p className="mt-1 text-xs text-zinc-500">{inr(Number(amount))}</p>}
                    </div>
                    <div>
                        <label className={labelCls}>Comment</label>
                        <textarea
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="mt-1 w-full resize-none rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/40"
                        />
                        {commentError && <p className="mt-1 text-xs text-red-600">{commentError}</p>}
                    </div>
                </div>
            );
        }
        if (step === 4 && summary && selected) {
            const rowsOut: [string, string][] = [
                ["Budget head", head],
                ["Commitment (parent TID)", `${String(selected.transactionId)}${selected.frapAppId ? ` · ${selected.frapAppId}` : ""}`],
                ["Original committed", inr(summary.original)],
                ["Total paid", inr(summary.totalPaid)],
                ["Eligible balance", inr(summary.maxDecommit)],
                ["Requested decommitment", inr(Number(amount))],
            ];
            return (
                <div className="space-y-3">
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">Review the details, then submit the decommitment.</p>
                    <dl className="divide-y divide-zinc-200 dark:divide-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        {rowsOut.map(([k, v]) => (
                            <div key={k} className={cn("flex justify-between gap-4 px-3 py-2 text-sm", k === "Requested decommitment" && "bg-[#D97757]/10")}>
                                <dt className="text-zinc-500 dark:text-zinc-400 shrink-0">{k}</dt>
                                <dd className="text-right font-semibold text-zinc-900 dark:text-zinc-100 break-words min-w-0">{v}</dd>
                            </div>
                        ))}
                    </dl>
                    <div>
                        <label className={labelCls}>Comment (editable)</label>
                        <textarea
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="mt-1 w-full resize-none rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/40"
                        />
                        {commentError && <p className="mt-1 text-xs text-red-600">{commentError}</p>}
                    </div>
                    {submitError && <ErrorBox text={submitError} />}
                </div>
            );
        }
        return null;
    };

    return (
        <>
            <div className="space-y-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Release the unused part of the project commitment funding this employee before forwarding the resignation.
                </p>
                <button
                    type="button"
                    onClick={openWizard}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D97757] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#c66a4e] disabled:opacity-50"
                >
                    <MinusCircle className="h-4 w-4" />
                    Initiate Decommitment
                </button>
            </div>

            {open &&
                createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-3 sm:p-4">
                        <div className="flex h-[90vh] max-h-[94vh] w-[96vw] max-w-[1600px] flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
                                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">Initiate Decommitment</h3>
                                <button
                                    onClick={() => !isSubmitting && setOpen(false)}
                                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <ol className="flex items-center gap-1 overflow-x-auto px-5 py-3 text-[11px] font-bold">
                                {STEPS.map((label, i) => (
                                    <li key={label} className="flex items-center gap-1 shrink-0">
                                        <span
                                            className={cn(
                                                "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                                                i < step && "bg-emerald-500 text-white",
                                                i === step && "bg-[#D97757] text-white",
                                                i > step && "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300",
                                            )}
                                        >
                                            {i < step ? <Check className="h-3 w-3" /> : i + 1}
                                        </span>
                                        <span className={cn(i === step ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400")}>{label}</span>
                                        {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-zinc-300 dark:bg-zinc-600" />}
                                    </li>
                                ))}
                            </ol>

                            <div className="flex-1 overflow-y-auto px-5 py-3">{renderStep()}</div>

                            <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
                                <button
                                    onClick={() => (step === 0 ? setOpen(false) : setStep(step - 1))}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3.5 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    {step === 0 ? "Cancel" : "Back"}
                                </button>
                                {step < STEPS.length - 1 ? (
                                    <button
                                        onClick={() => setStep(step + 1)}
                                        disabled={!canNext}
                                        title={stepError(step) || undefined}
                                        className="flex items-center gap-1.5 rounded-lg bg-[#D97757] px-4 py-2 text-sm font-bold text-white hover:bg-[#c66a4e] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Next <ArrowRight className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !!amountError || !!commentError}
                                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                        {isSubmitting ? "Submitting…" : "Submit Decommitment"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
};

const Loading = ({ text }: { text: string }) => (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin text-[#D97757]" />
        {text}
    </div>
);

const ErrorBox = ({ text }: { text: string }) => (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {text}
    </div>
);

export default DecommitWizard;
