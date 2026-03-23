import React, { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet as LedgerIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

export const ProjectLedgerModal: React.FC<ProjectLedgerModalProps> = ({
    isOpen,
    onClose,
    projectName,
    budgetHeadList,
    onPaymentClick
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

    // Check which heads have data
    useEffect(() => {
        const checkHeadsWithData = async () => {
            if (!isOpen || !projectName || budgetHeadList.length === 0) return;

            setIsCheckingHeads(true);
            const validHeads = new Set<string | number>();

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
                        console.error(`Failed to check head ${head.name}:`, err);
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
                console.error("Error checking budget heads:", error);
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

    // Fetch Ledger Data
    const fetchLedgerData = async (headId: string | number) => {
        if (!headId) return;
        setIsLedgerLoading(true);
        setLedgerError(null);
        try {
            console.log(`[ProjectLedgerModal] Fetching ledger for Project: ${projectName} Head: ${headId}`);
            const response = await fetch(`/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(String(projectName))}&accountHeadId=${encodeURIComponent(String(headId))}`);
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            const result = await response.json();

            const rawData = Array.isArray(result) ? result : [];
            let runningPaymentBalance = 0;

            // Sort by date ascending to ensure accurate running balance
            const sortedData = [...rawData].sort((a: any, b: any) =>
                new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
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
            console.error("Ledger API Error:", err);
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

    return (
        <div className="frappe-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
            <div className="frappe-modal w-[95%] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                <header className="frappe-modal-header">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <LedgerIcon className="w-5 h-5 text-[#D97757]" />
                        Project Budget Ledger
                    </h2>
                    <button onClick={onClose} className="frappe-modal-close" aria-label="Close modal">×</button>
                </header>
                <div className="frappe-modal-body p-6">
                    {/* Tabs */}
                    <div className="mb-6 border-b border-zinc-200 dark:border-zinc-700">
                        {isCheckingHeads ? (
                            <div className="flex items-center space-x-2 text-sm text-zinc-500 dark:text-zinc-400 py-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#D97757]"></div>
                                <span>Checking available heads...</span>
                            </div>
                        ) : visibleHeads.length > 0 ? (
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <nav className="flex flex-wrap gap-2">
                                    {visibleHeads.map((head) => (
                                        <button
                                            key={head.id}
                                            onClick={() => setActiveLedgerHeadId(head.id)}
                                            className={cn(
                                                "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors",
                                                activeLedgerHeadId === head.id
                                                    ? "border-[#D97757] text-[#D97757] bg-[#F0FDFD] dark:bg-[#D97757]/10"
                                                    : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                            )}
                                        >
                                            {head.name}
                                        </button>
                                    ))}
                                </nav>
                                {!showAllHeads && budgetHeadList.length > visibleHeads.length && (
                                    <button
                                        onClick={() => setShowAllHeads(true)}
                                        className="text-xs text-[#D97757] hover:underline whitespace-nowrap"
                                    >
                                        Show All Heads ({budgetHeadList.length})
                                    </button>
                                )}
                                {showAllHeads && (
                                    <button
                                        onClick={() => setShowAllHeads(false)}
                                        className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:underline whitespace-nowrap"
                                    >
                                        Hide Empty Heads
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="py-2 flex items-center gap-4">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">No budget heads with transactions found.</span>
                                <button
                                    onClick={() => setShowAllHeads(true)}
                                    className="text-sm text-[#D97757] font-medium hover:underline"
                                >
                                    Show All Budget Heads
                                </button>
                            </div>
                        )}
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center gap-2 mb-4">
                        <button
                            onClick={() => setLedgerView('transactions')}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                ledgerView === 'transactions' ? "bg-[#D97757] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                            )}
                        >Transactions</button>
                        <button
                            onClick={() => setLedgerView('yearly')}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                ledgerView === 'yearly' ? "bg-[#D97757] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                            )}
                        >Yearly Summary</button>
                    </div>

                    {/* Year Filter */}
                    {ledgerView === 'transactions' && availableYears.length > 0 && (
                        <div className="mb-4 flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Financial Year:</span>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => setSelectedYear("all")}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                                        selectedYear === "all"
                                            ? "bg-[#D97757] text-white"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    )}
                                >
                                    All
                                </button>
                                {availableYears.map((yr) => (
                                    <button
                                        key={yr}
                                        onClick={() => setSelectedYear(yr)}
                                        className={cn(
                                            "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                                            selectedYear === yr
                                                ? "bg-[#D97757] text-white"
                                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                        )}
                                    >
                                        FY {yr}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    {ledgerView === 'transactions' && (
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[300px]">
                            {isLedgerLoading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757] mb-4"></div>
                                    <p className="text-zinc-500 dark:text-zinc-400">Loading ledger...</p>
                                </div>
                            ) : ledgerError ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <p className="text-red-500 font-medium mb-2">Failed to load data</p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{ledgerError}</p>
                                    <button onClick={() => fetchLedgerData(activeLedgerHeadId)} className="mt-4 text-[#D97757] hover:underline text-sm font-medium">Try Again</button>
                                </div>
                            ) : filteredLedgerTransactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" />
                                    <p className="text-zinc-500 dark:text-zinc-400">
                                        {selectedYear !== "all" ? `No transactions found for FY ${selectedYear}` : "No transactions found for this head"}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 uppercase text-xs font-semibold sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-3 whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">TID</th>
                                                <th className="px-6 py-3 whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">App ID</th>
                                                <th className="px-6 py-3 whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">Date</th>
                                                <th className="px-6 py-3 whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">Particulars</th>
                                                <th className="px-6 py-3 whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">BMR</th>
                                                <th className="px-6 py-3 text-right whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">Fund Received</th>
                                                <th className="px-6 py-3 text-right whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">Commit Amt</th>
                                                <th className="px-6 py-3 text-right whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">Commitable Bal</th>
                                                <th className="px-6 py-3 text-right whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">Payment Amt</th>
                                                <th className="px-6 py-3 text-right whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">Payment Bal</th>
                                                <th className="px-6 py-3 text-center whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">Status</th>
                                                <th className="px-6 py-3 whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {filteredLedgerTransactions.map((txn) => (
                                                <tr key={txn.transactionId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                                                    <td className="px-6 py-3 text-zinc-500 dark:text-zinc-400 font-mono">{txn.transactionId || '-'}</td>
                                                    <td className="px-6 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap font-mono text-xs">
                                                        {txn.frapAppId || '-'}
                                                    </td>
                                                    <td className="px-6 py-3 text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                                        {txn.transactionDate ? new Date(txn.transactionDate).toLocaleDateString('en-IN') : '-'}
                                                    </td>
                                                    <td className="px-6 py-3 text-zinc-900 dark:text-zinc-100 max-w-xs truncate" title={txn.particulars}>
                                                        {txn.particulars}
                                                        {txn.refDetails && <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{txn.refDetails}</div>}
                                                    </td>
                                                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{txn.bmr || '-'}</td>
                                                    <td className="px-6 py-3 text-right font-medium text-green-600 dark:text-green-400">
                                                        {txn.fundReceivedAmount ? `₹${txn.fundReceivedAmount.toLocaleString('en-IN')}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-medium text-red-600 dark:text-red-400">
                                                        {txn.commitAmount ? `₹${txn.commitAmount.toLocaleString('en-IN')}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                                        {txn.commitableBalance ? `₹${txn.commitableBalance.toLocaleString('en-IN')}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-medium text-red-600 dark:text-red-400">
                                                        {txn.paymentAmount ? `₹${txn.paymentAmount.toLocaleString('en-IN')}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-bold text-[#D97757]">
                                                        {txn.paymentBalance ? `₹${txn.paymentBalance.toLocaleString('en-IN')}` : '0'}
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <span className={cn(
                                                            "inline-flex px-2.5 py-1 rounded-full text-xs font-semibold",
                                                            txn.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                                txn.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-700' :
                                                                    txn.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                                                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 dark:bg-zinc-800 dark:text-zinc-300'
                                                        )}>
                                                            {txn.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        {((txn.commitAmount || 0) > 0) && (!txn.paymentAmount) && onPaymentClick && (
                                                            <button
                                                                onClick={() => {
                                                                    const mockEntry: BudgetEntry = {
                                                                        sl: 0,
                                                                        committed: txn.commitAmount || 0,
                                                                        transactionId: txn.transactionId,
                                                                        particulars: txn.particulars,
                                                                        bmr: txn.bmr || '',
                                                                        head: budgetHeadList.find(h => h.id === activeLedgerHeadId)?.name
                                                                    };
                                                                    onPaymentClick(mockEntry);
                                                                }}
                                                                className="px-2 py-1 text-xs bg-[#D97757] text-white rounded hover:bg-[#0D9494] transition-colors"
                                                            >
                                                                Pay
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {ledgerView === 'yearly' && (
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[300px]">
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
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
                                                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
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
            </div>
        </div>
    );
};
