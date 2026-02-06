import React, { useState, useMemo, useEffect } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { PaymentModal } from './PaymentModal';
import { ProjectLedgerModal, type BudgetEntry } from './ProjectLedgerModal';
import { FrappeButton } from '@/components/ui/neo-brutalism';
import { CreditCardIcon, FileSpreadsheet } from 'lucide-react';

interface BudgetActionsSidebarProps {
    projectName: string;
    isStaff?: boolean;
}

export const BudgetActionsSidebar: React.FC<BudgetActionsSidebarProps> = ({ projectName, isStaff = true }) => {
    const [commitHead, setCommitHead] = useState("");
    const [commitAmount, setCommitAmount] = useState("");
    const [manualCommitments, setManualCommitments] = useState<any[]>([]);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [initialPaymentData, setInitialPaymentData] = useState<any>(null);

    // Fetch Balances
    const balanceParams = useMemo(() => ({ project_number: projectName || '' }), [projectName]);
    const balanceOptions = useMemo(() => ({
        revalidateOnFocus: false,
        isPaused: () => !projectName
    }), [projectName]);

    const { data: projectAmounts, isLoading: isBalanceLoading } = useFrappeGetCall<{
        message: {
            data: {
                availableCommitAmount: number;
            }
        };
    }>(
        'rndopsapp.rndopsapp.commitPayment.get_project_available_amounts',
        balanceParams,
        balanceOptions
    );

    const actualBalance = (projectAmounts as any)?.message?.data?.availableCommitAmount ?? (projectAmounts as any)?.data?.availableCommitAmount ?? 0;

    // Fetch Budget Heads
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: number | string }[]>([]);
    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch('/api/v2/document/Budget%20Head?fields=["*"]&order_by=name%20asc');
                const result = await response.json();
                if (result?.data) {
                    setBudgetHeadList(result.data.map((item: any) => ({
                        name: item.title || item.budget_head || item.name,
                        id: item.id
                    })));
                }
            } catch (err) {
                console.error("Failed to fetch Budget Heads:", err);
            }
        };
        fetchBudgetHeads();
    }, []);

    // Set default head
    useEffect(() => {
        if (budgetHeadList.length > 0 && !commitHead) {
            setCommitHead(budgetHeadList[0].name);
        }
    }, [budgetHeadList]);


    const handleCommit = () => {
        const amount = parseFloat(commitAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        const newEntry = {
            date: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
            particulars: `Commitment for ${commitHead}`,
            committed: amount,
            head: commitHead,
            _id: Date.now()
        };

        setManualCommitments(prev => [...prev, newEntry]);
        setCommitAmount("");
    };

    const handleRemoveLastCommit = () => {
        if (manualCommitments.length === 0) return;
        setManualCommitments(prev => prev.slice(0, -1));
    };

    if (!isStaff) return null;

    return (
        <div className="space-y-6">
            {/* Make a Commitment Widget */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="frappe-widget-title mb-3 font-semibold text-gray-900">Make a Commitment</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Budget Head</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
                            value={commitHead}
                            onChange={(e) => setCommitHead(e.target.value)}
                        >
                            {budgetHeadList.map((head) => (
                                <option key={head.id} value={head.name}>{head.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Available: <span className="font-medium text-[#0EA5A4]">
                                {isBalanceLoading ? "..." : `₹${actualBalance.toLocaleString('en-IN')}`}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Amount (₹)</label>
                        <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
                            placeholder="e.g., 5000"
                            value={commitAmount}
                            onChange={(e) => setCommitAmount(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleCommit}
                            className="flex-1 bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Commit
                        </button>
                        <button
                            onClick={handleRemoveLastCommit}
                            className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                        >
                            Remove
                        </button>
                    </div>

                    <button
                        onClick={() => setIsLedgerOpen(true)}
                        className="w-full text-center text-xs font-medium text-[#0EA5A4] hover:underline pt-2"
                    >
                        <div className="flex items-center justify-center gap-1">
                            <FileSpreadsheet className="w-3 h-3" />
                            View Project Budget Ledger
                        </div>
                    </button>

                    {/* Display Manual Commitments List (Simulation) */}
                    {manualCommitments.length > 0 && (
                        <div className="pt-3 border-t border-gray-100 mt-2 space-y-2">
                            <p className="text-xs font-semibold text-gray-500">Draft Commitments (Unsaved)</p>
                            {manualCommitments.map((c, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded border border-gray-100">
                                    <span>{c.head}</span>
                                    <span className="font-bold text-red-600">₹{c.committed.toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Widget */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="frappe-widget-title mb-3 font-semibold text-gray-900">Record Payment</h3>
                <p className="text-sm text-gray-600 mb-4">Process payment for this project directly.</p>
                <FrappeButton
                    onClick={() => {
                        setInitialPaymentData(null);
                        setIsPaymentOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white hover:bg-black px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                    <CreditCardIcon className="w-4 h-4" />
                    Record Payment
                </FrappeButton>
            </div>

            <PaymentModal
                isOpen={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
                projectName={projectName}
                budgetHeadList={budgetHeadList}
                initialData={initialPaymentData}
            />

            <ProjectLedgerModal
                isOpen={isLedgerOpen}
                onClose={() => setIsLedgerOpen(false)}
                projectName={projectName}
                budgetHeadList={budgetHeadList}
                manualCommitments={manualCommitments}
                onPaymentClick={(row: BudgetEntry) => {
                    // Logic to open payment modal from ledger
                    // Map row data to payment form prefill
                    const accountHeadValue = budgetHeadList.find(bh =>
                        bh.name.toLowerCase() === (row.head || row.accountHead || '').toLowerCase()
                    );

                    setInitialPaymentData({
                        payment_amount: row.committed || 0,
                        budget_head: accountHeadValue?.name || row.head || '',
                        payment_bmr: row.bmr || '',
                        payment_particular: row.particulars || '',
                        commit_id: row.transactionId || ''
                    });
                    setIsPaymentOpen(true);
                    // Optionally close ledger or keep it open?
                    // ProjectDetails keeps it open I think.
                }}
            />
        </div>
    );
};
