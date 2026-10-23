import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import { fetchOverheadLedger, isOverheadProjectNo } from "@/services/overheadLedger";
import {
    computeDecommit,
    eligibleCommitments,
    isCommitRow,
    isPaymentRow,
    rowKey,
    type DecommitSummary,
    type LedgerRow,
} from "@/utils/decommitCalc";

const inr = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");

export interface PickedCommitment {
    row: LedgerRow;
    summary: DecommitSummary;
}

interface Props {
    /** Project number (project_no), as the ledger service expects it */
    projectNo: string;
    /** Selected budget head — its doc name and/or label; either may match a Budget Head record */
    headCandidates: string[];
    selectedKey: string;
    onSelect: (picked: PickedCommitment | null) => void;
}

let headIdCache: Record<string, number | string> | null = null;
const loadHeadIds = async (): Promise<Record<string, number | string>> => {
    if (headIdCache) return headIdCache;
    const res = await fetch(`${FRAPPE_BASE_URL}/api/resource/Budget%20Head?fields=["*"]&limit_page_length=0`, { credentials: "include" });
    const json = await res.json();
    const map: Record<string, number | string> = {};
    for (const h of json?.data || []) {
        if (h.id === undefined || h.id === null) continue;
        for (const k of [h.name, h.title, h.budget_head]) if (k) map[String(k).trim().toLowerCase()] = h.id;
    }
    headIdCache = map;
    return map;
};

/** Ledger-backed commitment picker for the Miscellaneous Commit form (De-Commit mode). */
export const DecommitCommitmentPicker: React.FC<Props> = ({ projectNo, headCandidates, selectedKey, onSelect }) => {
    const [rows, setRows] = useState<LedgerRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const candidatesKey = headCandidates.filter(Boolean).join("|");

    useEffect(() => {
        if (!projectNo || !candidatesKey) {
            setRows([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        (async () => {
            try {
                let data: LedgerRow[];
                if (isOverheadProjectNo(projectNo)) {
                    data = (await fetchOverheadLedger(projectNo)) as LedgerRow[];
                } else {
                    const ids = await loadHeadIds();
                    const id = candidatesKey.split("|").map((c) => ids[c.trim().toLowerCase()]).find((v) => v !== undefined);
                    if (id === undefined) throw new Error("Could not find the ledger id for this budget head.");
                    const res = await fetch(
                        `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectNo)}&accountHeadId=${encodeURIComponent(String(id))}`,
                    );
                    if (!res.ok) throw new Error(`Ledger service returned ${res.status}.`);
                    const json = await res.json();
                    data = Array.isArray(json) ? json : [];
                }
                if (!cancelled) setRows(data);
            } catch (e: unknown) {
                if (!cancelled) {
                    setRows([]);
                    setError(e instanceof Error && e.message ? e.message : "Could not load the ledger.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [projectNo, candidatesKey]);

    const eligibleKeys = useMemo(() => new Set(eligibleCommitments(rows).map(rowKey)), [rows]);
    const commits = useMemo(
        () =>
            rows
                .filter((r) => isCommitRow(r) && !isPaymentRow(r))
                .sort(
                    (x, y) =>
                        new Date(x.transactionDate || 0).getTime() - new Date(y.transactionDate || 0).getTime() ||
                        Number(x.transactionId) - Number(y.transactionId),
                ),
        [rows],
    );

    if (!projectNo) return <p className="text-sm text-zinc-500">Select a project to load its commitments.</p>;
    if (!candidatesKey) return <p className="text-sm text-zinc-500">Select a budget head to load its commitments.</p>;
    if (loading)
        return (
            <div className="flex items-center gap-2 py-8 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#D97757]" /> Loading commitment ledger…
            </div>
        );
    if (error)
        return (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
        );
    if (commits.length === 0) return <p className="text-sm text-zinc-500">No commitments found for this project and budget head.</p>;

    const selectedRow = commits.find((r) => rowKey(r) === selectedKey && eligibleKeys.has(rowKey(r)));

    return (
        <div className="space-y-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Select the commitment to decommit from. Click it again to deselect. Cancelled and adjustment entries cannot be selected.
            </p>
            {selectedRow && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[#D97757]/40 bg-[#D97757]/10 px-3 py-2 text-sm">
                    <span>
                        Selected: TID <span className="font-mono font-bold">{String(selectedRow.transactionId)}</span>
                        {selectedRow.frapAppId ? ` · ${selectedRow.frapAppId}` : ""}
                    </span>
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                        <X className="h-3 w-3" /> Clear selection
                    </button>
                </div>
            )}
            <div className="max-h-[50vh] overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 dark:bg-zinc-800">
                        <tr>
                            <th className="w-8 px-2 py-2" />
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
                        {commits.map((r, i) => {
                            const key = rowKey(r);
                            const canSelect = eligibleKeys.has(key);
                            const active = canSelect && key === selectedKey;
                            const s = canSelect ? computeDecommit(r, rows) : null;
                            return (
                                <tr
                                    key={`${key}-${i}`}
                                    onClick={canSelect && s ? () => onSelect(active ? null : { row: r, summary: s }) : undefined}
                                    className={cn(
                                        canSelect ? "cursor-pointer" : "cursor-not-allowed text-zinc-400 dark:text-zinc-500",
                                        active ? "bg-[#D97757]/10" : canSelect && "hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
                                    )}
                                >
                                    <td className="px-2 py-2">
                                        <input type="radio" readOnly disabled={!canSelect} checked={active} className={cn("accent-[#D97757]", !canSelect && "opacity-30")} />
                                    </td>
                                    <td className="px-2 py-2 font-mono">{String(r.transactionId ?? "-")}</td>
                                    <td className="whitespace-nowrap px-2 py-2 font-mono">{r.frapAppId || "-"}</td>
                                    <td className="whitespace-nowrap px-2 py-2">{fmtDate(r.transactionDate)}</td>
                                    <td className="px-2 py-2" title={r.particulars}>{r.particulars}</td>
                                    <td className="px-2 py-2 text-right font-semibold tabular-nums">{r.commitAmount ? inr(r.commitAmount) : "-"}</td>
                                    <td className="px-2 py-2 text-right tabular-nums">{s ? inr(s.totalPaid) : "-"}</td>
                                    <td className="px-2 py-2 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{s ? inr(s.maxDecommit) : "-"}</td>
                                    <td className="whitespace-nowrap px-2 py-2">{r.status}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DecommitCommitmentPicker;
