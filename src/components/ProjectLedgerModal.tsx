import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePersistentPopups } from '@/lib/persistentPopups';
import { useFloatingWindow } from '@/hooks/useFloatingWindow';
import { ResizeEdges } from '@/components/ResizeEdges';
import { createPortal } from 'react-dom';
import { FileSpreadsheet as LedgerIcon, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchOverheadLedger, isOverheadProjectNo, OVERHEAD_BUDGET_HEAD_ID } from "@/services/overheadLedger";

export interface BudgetEntry {
    sl: number;
    committed: number;
    head?: string;
    accountHead?: string;
    transactionId?: any;
    particulars: string;
    bmr: string;
    received?: number;
    payment?: number;
    actualBalance?: number;
    commitableBalance?: number;
    headActualBalance?: number;
    date?: string;
    ref?: string;
    type?: string;
}

interface LedgerTransaction {
    transactionType: string;
    transactionId: number;
    transactionDate: string;
    particulars: string;
    refDetails: string;
    fundReceivedAmount: number | null;
    commitAmount: number | null;
    paymentAmount: number | null;
    commitableBalance: number;
    paymentBalance: number;
    balance: number;
    status: string;
    bmr: string | null;
    bankTransactionNumber: string | null;
    bankTransactionDate: string | null;
    frapAppId: string | null;
}

interface ProjectLedgerModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectName: string;
    budgetHeadList: { name: string; id: number | string }[];
    manualCommitments?: any[];
    onPaymentClick?: (row: BudgetEntry) => void;
    /** When the page that opened this popup goes away, hand it to the global host so it stays open (default true). */
    persistOnNavigate?: boolean;
}

export const ProjectLedgerModal: React.FC<ProjectLedgerModalProps> = ({
    isOpen,
    onClose,
    projectName,
    budgetHeadList,
    onPaymentClick,
    persistOnNavigate = true,
}) => {
    const [activeLedgerHeadId, setActiveLedgerHeadId] = useState<string | number>('');
    const [ledgerTransactions, setLedgerTransactions] = useState<LedgerTransaction[]>([]);
    const [isLedgerLoading, setIsLedgerLoading] = useState(false);
    const [ledgerError, setLedgerError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [ledgerView, setLedgerView] = useState<'transactions' | 'yearly'>('transactions');
    const [expandedYear, setExpandedYear] = useState<string | null>(null);

    // Filtered heads state
    const [headsWithData, setHeadsWithData] = useState<Set<string | number>>(new Set());
    const [isCheckingHeads, setIsCheckingHeads] = useState(false);
    const [showAllHeads, setShowAllHeads] = useState(false);

    // Floating window: draggable by the header, resizable from the corner; page behind stays usable.
    const { rect, moveHandlers, edgeHandlers } = useFloatingWindow({ isOpen, persistKey: 'project-ledger' });

    // Stay open across page navigation: if the page unmounts us while open and the route
    // changed (not just a normal close), the global host takes over rendering this popup.
    const mountPath = useRef(window.location.pathname);
    const live = useRef({ isOpen, projectName, budgetHeadList });
    live.current = { isOpen, projectName, budgetHeadList };
    useEffect(() => {
        if (isOpen && persistOnNavigate) usePersistentPopups.getState().setLedger(null);
    }, [isOpen, persistOnNavigate]);
    useEffect(() => () => {
        const l = live.current;
        if (persistOnNavigate && l.isOpen && window.location.pathname !== mountPath.current) {
            usePersistentPopups.getState().setLedger({ projectName: l.projectName, budgetHeadList: l.budgetHeadList });
        }
    }, [persistOnNavigate]);

    // Check which heads have data
    useEffect(() => {
        const checkHeadsWithData = async () => {
            if (!isOpen || !projectName || budgetHeadList.length === 0) return;

            setIsCheckingHeads(true);
            const validHeads = new Set<string | number>();

            // A PDF fund is one pool with no head dimension, and its data must not go
            // through /ledger-api (see services/overheadLedger). Select the single Overhead
            // head directly instead of probing 36+ heads that hold nothing.
            if (isOverheadProjectNo(projectName)) {
                validHeads.add(OVERHEAD_BUDGET_HEAD_ID);
                setHeadsWithData(validHeads);
                setActiveLedgerHeadId(OVERHEAD_BUDGET_HEAD_ID);
                setIsCheckingHeads(false);
                return;
            }

            try {
                const promises = budgetHeadList.map(async (head) => {
                    try {
                        const response = await fetch(`/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(String(projectName))}&accountHeadId=${encodeURIComponent(String(head.id))}`);
                        if (response.ok) {
                            const data = await response.json();
                            if (Array.isArray(data) && data.length > 0) {
                                validHeads.add(head.id);
                            }
                        }
                    } catch (err) {
                    }
                });

                await Promise.all(promises);
                setHeadsWithData(validHeads);

                // Set default active head
                if (validHeads.size > 0) {
                    // If current active head is not valid, switch to first valid one
                    if (!activeLedgerHeadId || !validHeads.has(activeLedgerHeadId)) {
                        const firstHead = budgetHeadList.find(h => validHeads.has(h.id));
                        if (firstHead) setActiveLedgerHeadId(firstHead.id);
                    }
                } else {
                    // If no valid heads found, maybe default to showing all or keep empty?
                    // We let the UI handle the "No heads" state with a "Show All" option
                }

            } catch (error) {
            } finally {
                setIsCheckingHeads(false);
            }
        };

        checkHeadsWithData();
    }, [isOpen, projectName, budgetHeadList]);

    // Derived list of visible heads
    const visibleHeads = useMemo(() => {
        if (showAllHeads) return budgetHeadList;
        return budgetHeadList.filter(head => headsWithData.has(head.id));
    }, [budgetHeadList, headsWithData, showAllHeads]);

    // Financial year helper (Apr-Mar). e.g. "2025-06-15" → "2025-26"
    const getFinancialYear = (dateStr: string): string => {
        const d = new Date(dateStr);
        const month = d.getMonth();
        const year = d.getFullYear();
        const startYear = month >= 3 ? year : year - 1;
        return `${startYear}-${String(startYear + 1).slice(-2)}`;
    };

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        ledgerTransactions.forEach((txn) => {
            if (txn.transactionDate) years.add(getFinancialYear(txn.transactionDate));
        });
        return Array.from(years).sort().reverse();
    }, [ledgerTransactions]);

    const yearlyLedgerData = useMemo(() => {
        if (ledgerTransactions.length === 0) return [];
        const fyMap = new Map<string, { totalReceived: number; totalCommitted: number; totalPaid: number; count: number; txns: LedgerTransaction[] }>();
        ledgerTransactions.forEach((txn) => {
            const fy = txn.transactionDate ? getFinancialYear(txn.transactionDate) : "Unknown";
            if (!fyMap.has(fy)) fyMap.set(fy, { totalReceived: 0, totalCommitted: 0, totalPaid: 0, count: 0, txns: [] });
            const entry = fyMap.get(fy)!;
            entry.totalReceived += txn.fundReceivedAmount || 0;
            entry.totalCommitted += txn.commitAmount || 0;
            entry.totalPaid += txn.paymentAmount || 0;
            entry.count += 1;
            entry.txns.push(txn);
        });
        const rows: { fy: string; openingBalance: number; totalReceived: number; totalCommitted: number; totalPaid: number; closingBalance: number; count: number; txns: LedgerTransaction[] }[] = [];
        let runningBalance = 0;
        Array.from(fyMap.entries()).sort(([a], [b]) => a.localeCompare(b)).forEach(([fy, data]) => {
            const opening = runningBalance;
            const closing = opening + data.totalReceived - data.totalPaid;
            runningBalance = closing;
            rows.push({ fy, openingBalance: opening, ...data, closingBalance: closing });
        });
        return rows;
    }, [ledgerTransactions]);

    const filteredLedgerTransactions = useMemo(() => {
        if (selectedYear === "all") return ledgerTransactions;
        return ledgerTransactions.filter((txn) =>
            txn.transactionDate && getFinancialYear(txn.transactionDate) === selectedYear
        );
    }, [ledgerTransactions, selectedYear]);

    const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
    const activeHeadName = budgetHeadList.find((h) => h.id === activeLedgerHeadId)?.name;

    // Fetch Ledger Data
    const fetchLedgerData = async (headId: string | number) => {
        if (!headId) return;
        setIsLedgerLoading(true);
        setLedgerError(null);
        try {
            if (isOverheadProjectNo(projectName)) {
                const rows = await fetchOverheadLedger(String(projectName));
                // Keep the Accounts service's own balances — the running total below
                // ignores loans, which an overhead fund can have.
                //
                // Mapped field by field rather than spread: every field on an overhead
                // row is optional (the Accounts payload omits what does not apply), while
                // LedgerTransaction requires all of them. Spreading left the optionals in
                // place and the assignment did not type-check.
                setLedgerTransactions(
                    rows.map((txn): LedgerTransaction => ({
                        transactionType: txn.transactionType ?? "",
                        transactionId: txn.transactionId ?? 0,
                        transactionDate: txn.transactionDate ?? "",
                        particulars: txn.particulars ?? "",
                        refDetails: txn.refDetails ?? "",
                        fundReceivedAmount: txn.fundReceivedAmount ?? null,
                        commitAmount: txn.commitAmount ?? null,
                        paymentAmount: txn.paymentAmount ?? null,
                        commitableBalance: txn.commitableBalance ?? 0,
                        paymentBalance: txn.balance ?? 0,
                        balance: txn.balance ?? 0,
                        status: (txn as { status?: string }).status ?? "",
                        bmr: txn.bmr ?? null,
                        bankTransactionNumber: null,
                        bankTransactionDate: null,
                        frapAppId: txn.frapAppId ?? null,
                    })),
                );
                return;
            }

            const response = await fetch(`/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(String(projectName))}&accountHeadId=${encodeURIComponent(String(headId))}`);
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            const result = await response.json();

            const rawData = Array.isArray(result) ? result : [];
            let runningPaymentBalance = 0;

            // Sort by recordTime (with fallback to transactionDate) ascending to ensure accurate running balance
            const sortedData = [...rawData].sort((a: any, b: any) =>
                new Date(a.recordTime || a.transactionDate).getTime() - new Date(b.recordTime || b.transactionDate).getTime()
            );

            const calculatedData = sortedData.map((txn: any) => {
                const received = txn.fundReceivedAmount || 0;
                const paid = txn.paymentAmount || 0;
                runningPaymentBalance = runningPaymentBalance + received - paid;
                return {
                    ...txn,
                    paymentBalance: runningPaymentBalance
                };
            });

            setLedgerTransactions(calculatedData);
        } catch (err: any) {
            setLedgerError(err.message || "Failed to load ledger data");
            setLedgerTransactions([]);
        } finally {
            setIsLedgerLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && activeLedgerHeadId) {
            fetchLedgerData(activeLedgerHeadId);
        }
    }, [isOpen, activeLedgerHeadId, projectName]);

    if (!isOpen) return null;

    const statusStyle = (status: string) =>
        status === 'PAID' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
            : status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                : status === 'PENDING' ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                    : status === 'CANCELLED' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';

    const chip = (active: boolean) => cn(
        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
        active
            ? "bg-[#D97757] border-[#D97757] text-white shadow-sm"
            : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-[#D97757]/50 hover:text-[#D97757]",
    );

    return createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none" role="dialog" aria-modal="false">
            <div
                className="frappe-modal pointer-events-auto absolute shadow-2xl border-2 border-zinc-400 dark:border-zinc-500"
                style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, maxHeight: 'none', maxWidth: 'none', border: '2px solid #A1A1AA' }}
            >
                <header
                    {...moveHandlers}
                    className="flex items-center justify-between gap-3 px-5 py-3 cursor-move select-none touch-none border-b border-zinc-300 dark:border-zinc-600 bg-[#FAFAF9] dark:bg-zinc-900/60">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D97757]/10 text-[#D97757]">
                            <LedgerIcon className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold leading-tight text-zinc-900 dark:text-zinc-100">Project Budget Ledger</h2>
                            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">{projectName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </header>

                <div className="frappe-modal-body flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                    {/* Budget head selector */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Budget Head</span>
                            {!isCheckingHeads && visibleHeads.length > 0 && (!showAllHeads && budgetHeadList.length > visibleHeads.length ? (
                                <button onClick={() => setShowAllHeads(true)} className="text-xs text-[#D97757] hover:underline">
                                    Show all heads ({budgetHeadList.length})
                                </button>
                            ) : showAllHeads ? (
                                <button onClick={() => setShowAllHeads(false)} className="text-xs text-zinc-500 hover:underline">
                                    Hide empty heads
                                </button>
                            ) : null)}
                        </div>
                        {isCheckingHeads ? (
                            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 py-1">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#D97757]" />
                                Checking available heads…
                            </div>
                        ) : visibleHeads.length > 0 ? (
                            <nav className="flex flex-wrap gap-1.5">
                                {visibleHeads.map((head) => (
                                    <button key={head.id} onClick={() => setActiveLedgerHeadId(head.id)} className={chip(activeLedgerHeadId === head.id)}>
                                        {head.name}
                                    </button>
                                ))}
                            </nav>
                        ) : (
                            <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                                No budget heads with transactions found.
                                <button onClick={() => setShowAllHeads(true)} className="text-[#D97757] font-medium hover:underline">
                                    Show all budget heads
                                </button>
                            </div>
                        )}
                    </div>

                    {/* View + year controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5">
                            {([['transactions', 'Transactions'], ['yearly', 'Yearly Summary']] as const).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setLedgerView(key)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                                        ledgerView === key
                                            ? "bg-white dark:bg-zinc-900 text-[#D97757] shadow-sm"
                                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200",
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {ledgerView === 'transactions' && availableYears.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mr-1">Financial Year</span>
                                <button onClick={() => setSelectedYear('all')} className={chip(selectedYear === 'all')}>All</button>
                                {availableYears.map((yr) => (
                                    <button key={yr} onClick={() => setSelectedYear(yr)} className={chip(selectedYear === yr)}>FY {yr}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Transactions table */}
                    {ledgerView === 'transactions' && (
                        <div className="rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 overflow-hidden">
                            {isLedgerLoading ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757] mb-3" />
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading ledger…</p>
                                </div>
                            ) : ledgerError ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <p className="text-red-500 font-medium mb-1">Failed to load data</p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{ledgerError}</p>
                                    <button onClick={() => fetchLedgerData(activeLedgerHeadId)} className="mt-3 text-[#D97757] hover:underline text-sm font-medium">Try again</button>
                                </div>
                            ) : filteredLedgerTransactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <FileText className="h-9 w-9 text-zinc-300 dark:text-zinc-600 mb-2" />
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {selectedYear !== 'all' ? `No transactions found for FY ${selectedYear}` : `No transactions found${activeHeadName ? ` for ${activeHeadName}` : ' for this head'}`}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-auto">
                                    <table className="w-full text-[13px] text-left">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-zinc-50 dark:bg-zinc-800 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-300 dark:border-zinc-600">
                                                {['TID', 'App ID', 'Date', 'Particulars', 'BMR'].map((h) => (
                                                    <th key={h} className="px-4 py-2.5 whitespace-nowrap">{h}</th>
                                                ))}
                                                {['Received', 'Commit', 'Commitable', 'Payment', 'Balance'].map((h) => (
                                                    <th key={h} className="px-4 py-2.5 text-right whitespace-nowrap">{h}</th>
                                                ))}
                                                <th className="px-4 py-2.5 text-center">Status</th>
                                                {onPaymentClick && <th className="px-4 py-2.5" />}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-300 dark:divide-zinc-700">
                                            {filteredLedgerTransactions.map((txn) => (
                                                <tr key={txn.transactionId} className="hover:bg-[#D97757]/5 transition-colors">
                                                    <td className="px-4 py-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">{txn.transactionId || '-'}</td>
                                                    <td className="px-4 py-2 font-mono text-xs whitespace-nowrap text-zinc-700 dark:text-zinc-300">{txn.frapAppId || '-'}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                                                        {txn.transactionDate ? new Date(txn.transactionDate).toLocaleDateString('en-IN') : '-'}
                                                    </td>
                                                    <td className="px-4 py-2 max-w-[260px] text-zinc-900 dark:text-zinc-100" title={txn.particulars}>
                                                        <div className="truncate">{txn.particulars}</div>
                                                        {txn.refDetails && <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{txn.refDetails}</div>}
                                                    </td>
                                                    <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{txn.bmr || '-'}</td>
                                                    <td className="px-4 py-2 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                                                        {txn.fundReceivedAmount ? inr(txn.fundReceivedAmount) : '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right tabular-nums font-medium text-orange-600 dark:text-orange-400">
                                                        {txn.commitAmount ? inr(txn.commitAmount) : '-'}
                                                    </td>
                                                    <td className={cn("px-4 py-2 text-right tabular-nums font-semibold", txn.commitableBalance < 0 ? "text-red-500" : "text-zinc-900 dark:text-zinc-100")}>
                                                        {txn.commitableBalance ? inr(txn.commitableBalance) : '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right tabular-nums font-medium text-red-600 dark:text-red-400">
                                                        {txn.paymentAmount ? inr(txn.paymentAmount) : '-'}
                                                    </td>
                                                    <td className={cn("px-4 py-2 text-right tabular-nums font-bold", txn.paymentBalance < 0 ? "text-red-500" : "text-[#D97757]")}>
                                                        {inr(txn.paymentBalance || 0)}
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", statusStyle(txn.status))}>
                                                            {txn.status?.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    {onPaymentClick && (
                                                        <td className="px-4 py-2">
                                                            {(txn.commitAmount || 0) > 0 && !txn.paymentAmount && (
                                                                <button
                                                                    onClick={() => onPaymentClick({
                                                                        sl: 0,
                                                                        committed: txn.commitAmount || 0,
                                                                        transactionId: txn.transactionId,
                                                                        particulars: txn.particulars,
                                                                        bmr: txn.bmr || '',
                                                                        head: activeHeadName,
                                                                    })}
                                                                    className="px-2.5 py-1 text-xs font-semibold bg-[#D97757] text-white rounded-md hover:bg-[#c66a4e] transition-colors"
                                                                >
                                                                    Pay
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {ledgerView === 'yearly' && (
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-600 shadow-sm overflow-hidden min-h-[300px]">
                            <table className="w-full text-sm">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600 uppercase">Financial Year</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-600 uppercase">Opening</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-600 uppercase">Received</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-orange-600 uppercase">Committed</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-red-600 uppercase">Paid</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-blue-600 uppercase">Closing</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-600 uppercase">Txns</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-300 dark:divide-zinc-700">
                                    {yearlyLedgerData.map((row) => {
                                        const isExp = expandedYear === row.fy;
                                        return (
                                            <React.Fragment key={row.fy}>
                                                <tr
                                                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                                                    onClick={() => setExpandedYear(isExp ? null : row.fy)}
                                                >
                                                    <td className="px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <span className={`text-xs transition-transform duration-200 ${isExp ? 'rotate-90' : ''}`}>▶</span>
                                                            {row.fy}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-xs text-zinc-600">{row.openingBalance ? `₹${row.openingBalance.toLocaleString("en-IN")}` : "₹0"}</td>
                                                    <td className="px-3 py-2 text-right text-xs font-medium text-emerald-600">{row.totalReceived > 0 ? `₹${row.totalReceived.toLocaleString("en-IN")}` : "-"}</td>
                                                    <td className="px-3 py-2 text-right text-xs font-medium text-orange-600">{row.totalCommitted > 0 ? `₹${row.totalCommitted.toLocaleString("en-IN")}` : "-"}</td>
                                                    <td className="px-3 py-2 text-right text-xs font-medium text-red-600">{row.totalPaid > 0 ? `₹${row.totalPaid.toLocaleString("en-IN")}` : "-"}</td>
                                                    <td className="px-3 py-2 text-right text-xs font-bold text-blue-600">{`₹${row.closingBalance.toLocaleString("en-IN")}`}</td>
                                                    <td className="px-3 py-2 text-center text-xs text-zinc-500">{row.count}</td>
                                                </tr>
                                                {isExp && (
                                                    <tr>
                                                        <td colSpan={7} className="p-0 bg-zinc-50 dark:bg-zinc-900/60">
                                                            <div className="border-l-4 border-[#D97757] ml-6">
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                        <tr className="bg-zinc-100 dark:bg-zinc-800/80">
                                                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-zinc-500 uppercase">Date</th>
                                                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-zinc-500 uppercase">Particulars</th>
                                                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-zinc-500 uppercase">BMR</th>
                                                                            <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-emerald-600 uppercase">Received</th>
                                                                            <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-orange-600 uppercase">Commit</th>
                                                                            <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-red-600 uppercase">Paid</th>
                                                                            <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-blue-600 uppercase">Balance</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-zinc-300 dark:divide-zinc-700">
                                                                        {row.txns.map((txn, i) => (
                                                                            <tr key={i} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                                                                                <td className="px-3 py-1.5 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                                                                                    {txn.transactionDate ? new Date(txn.transactionDate).toLocaleDateString("en-GB") : "-"}
                                                                                </td>
                                                                                <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">
                                                                                    <div>{txn.particulars}</div>
                                                                                    {txn.refDetails && <div className="text-[10px] text-zinc-400">{txn.refDetails}</div>}
                                                                                </td>
                                                                                <td className="px-3 py-1.5 text-zinc-500 font-mono">{txn.bmr || "-"}</td>
                                                                                <td className="px-3 py-1.5 text-right text-emerald-600">{txn.fundReceivedAmount ? `₹${txn.fundReceivedAmount.toLocaleString("en-IN")}` : "-"}</td>
                                                                                <td className="px-3 py-1.5 text-right text-orange-600">{txn.commitAmount ? `₹${txn.commitAmount.toLocaleString("en-IN")}` : "-"}</td>
                                                                                <td className="px-3 py-1.5 text-right text-red-600">{txn.paymentAmount ? `₹${txn.paymentAmount.toLocaleString("en-IN")}` : "-"}</td>
                                                                                <td className="px-3 py-1.5 text-right font-bold text-blue-600">{`₹${txn.paymentBalance.toLocaleString("en-IN")}`}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                    {/* Totals row */}
                                    {yearlyLedgerData.length > 0 && (
                                        <tr className="bg-zinc-100 dark:bg-zinc-800 font-bold border-t-2 border-zinc-300 dark:border-zinc-600">
                                            <td className="px-3 py-2 text-xs uppercase text-zinc-800 dark:text-zinc-100">Total</td>
                                            <td className="px-3 py-2 text-right text-xs text-zinc-500">—</td>
                                            <td className="px-3 py-2 text-right text-xs text-emerald-700">{`₹${yearlyLedgerData.reduce((s, r) => s + r.totalReceived, 0).toLocaleString("en-IN")}`}</td>
                                            <td className="px-3 py-2 text-right text-xs text-orange-700">{`₹${yearlyLedgerData.reduce((s, r) => s + r.totalCommitted, 0).toLocaleString("en-IN")}`}</td>
                                            <td className="px-3 py-2 text-right text-xs text-red-700">{`₹${yearlyLedgerData.reduce((s, r) => s + r.totalPaid, 0).toLocaleString("en-IN")}`}</td>
                                            <td className="px-3 py-2 text-right text-xs text-blue-700">{`₹${(yearlyLedgerData[yearlyLedgerData.length - 1]?.closingBalance || 0).toLocaleString("en-IN")}`}</td>
                                            <td className="px-3 py-2 text-center text-xs text-zinc-600">{yearlyLedgerData.reduce((s, r) => s + r.count, 0)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <ResizeEdges edgeHandlers={edgeHandlers} />
            </div>
        </div>,
        document.body
    );
};
