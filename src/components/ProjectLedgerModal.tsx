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
                        <LedgerIcon className="w-5 h-5 text-[#0EA5A4]" />
                        Project Budget Ledger
                    </h2>
                    <button onClick={onClose} className="frappe-modal-close" aria-label="Close modal">×</button>
                </header>
                <div className="frappe-modal-body p-6">
                    {/* Tabs */}
                    <div className="mb-6 border-b border-gray-200">
                        {isCheckingHeads ? (
                            <div className="flex items-center space-x-2 text-sm text-gray-500 py-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0EA5A4]"></div>
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
                                                    ? "border-[#0EA5A4] text-[#0EA5A4] bg-[#F0FDFD]"
                                                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                            )}
                                        >
                                            {head.name}
                                        </button>
                                    ))}
                                </nav>
                                {!showAllHeads && budgetHeadList.length > visibleHeads.length && (
                                    <button
                                        onClick={() => setShowAllHeads(true)}
                                        className="text-xs text-[#0EA5A4] hover:underline whitespace-nowrap"
                                    >
                                        Show All Heads ({budgetHeadList.length})
                                    </button>
                                )}
                                {showAllHeads && (
                                    <button
                                        onClick={() => setShowAllHeads(false)}
                                        className="text-xs text-gray-500 hover:text-gray-700 hover:underline whitespace-nowrap"
                                    >
                                        Hide Empty Heads
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="py-2 flex items-center gap-4">
                                <span className="text-sm text-gray-500">No budget heads with transactions found.</span>
                                <button
                                    onClick={() => setShowAllHeads(true)}
                                    className="text-sm text-[#0EA5A4] font-medium hover:underline"
                                >
                                    Show All Budget Heads
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px]">
                        {isLedgerLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0EA5A4] mb-4"></div>
                                <p className="text-gray-500">Loading ledger...</p>
                            </div>
                        ) : ledgerError ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <p className="text-red-500 font-medium mb-2">Failed to load data</p>
                                <p className="text-sm text-gray-500">{ledgerError}</p>
                                <button onClick={() => fetchLedgerData(activeLedgerHeadId)} className="mt-4 text-[#0EA5A4] hover:underline text-sm font-medium">Try Again</button>
                            </div>
                        ) : ledgerTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <FileText className="h-10 w-10 text-gray-300 mb-3" />
                                <p className="text-gray-500">No transactions found for this head</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-[#F8FAFC] border-b border-gray-200 text-gray-600 uppercase text-xs font-semibold sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-3 whitespace-nowrap bg-[#F8FAFC]">TID</th>
                                            <th className="px-6 py-3 whitespace-nowrap bg-[#F8FAFC]">Date</th>
                                            <th className="px-6 py-3 whitespace-nowrap bg-[#F8FAFC]">Particulars</th>
                                            <th className="px-6 py-3 whitespace-nowrap bg-[#F8FAFC]">BMR</th>
                                            <th className="px-6 py-3 text-right whitespace-nowrap bg-[#F8FAFC]">Fund Received</th>
                                            <th className="px-6 py-3 text-right whitespace-nowrap bg-[#F8FAFC]">Commit Amt</th>
                                            <th className="px-6 py-3 text-right whitespace-nowrap bg-[#F8FAFC]">Commitable Bal</th>
                                            <th className="px-6 py-3 text-right whitespace-nowrap bg-[#F8FAFC]">Payment Amt</th>
                                            <th className="px-6 py-3 text-right whitespace-nowrap bg-[#F8FAFC]">Payment Bal</th>
                                            <th className="px-6 py-3 text-center whitespace-nowrap bg-[#F8FAFC]">Status</th>
                                            <th className="px-6 py-3 whitespace-nowrap bg-[#F8FAFC]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {ledgerTransactions.map((txn) => (
                                            <tr key={txn.transactionId} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-3 text-gray-500 font-mono">{txn.transactionId || '-'}</td>
                                                <td className="px-6 py-3 text-gray-900 whitespace-nowrap">
                                                    {txn.transactionDate ? new Date(txn.transactionDate).toLocaleDateString('en-IN') : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-gray-900 max-w-xs truncate" title={txn.particulars}>
                                                    {txn.particulars}
                                                    {txn.refDetails && <div className="text-xs text-gray-500 mt-0.5">{txn.refDetails}</div>}
                                                </td>
                                                <td className="px-6 py-3 text-gray-600">{txn.bmr || '-'}</td>
                                                <td className="px-6 py-3 text-right font-medium text-green-600">
                                                    {txn.fundReceivedAmount ? `₹${txn.fundReceivedAmount.toLocaleString('en-IN')}` : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-right font-medium text-red-600">
                                                    {txn.commitAmount ? `₹${txn.commitAmount.toLocaleString('en-IN')}` : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-right font-bold text-gray-900">
                                                    {txn.commitableBalance ? `₹${txn.commitableBalance.toLocaleString('en-IN')}` : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-right font-medium text-red-600">
                                                    {txn.paymentAmount ? `₹${txn.paymentAmount.toLocaleString('en-IN')}` : '-'}
                                                </td>
                                                <td className="px-6 py-3 text-right font-bold text-[#0EA5A4]">
                                                    {txn.paymentBalance ? `₹${txn.paymentBalance.toLocaleString('en-IN')}` : '0'}
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <span className={cn(
                                                        "inline-flex px-2.5 py-1 rounded-full text-xs font-semibold",
                                                        txn.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                            txn.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-700' :
                                                                txn.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-gray-100 text-gray-700'
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
                                                            className="px-2 py-1 text-xs bg-[#0EA5A4] text-white rounded hover:bg-[#0D9494] transition-colors"
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
                </div>
            </div>
        </div>
    );
};
