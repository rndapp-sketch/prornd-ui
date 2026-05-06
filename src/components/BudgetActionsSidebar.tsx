import React, { useState, useMemo, useEffect } from 'react';
import { useFrappeGetCall, useFrappeAuth } from 'frappe-react-sdk';
import { PaymentModal } from './PaymentModal';
import { ProjectLedgerModal, type BudgetEntry } from './ProjectLedgerModal';
import { FrappeButton } from '@/components/ui/neo-brutalism';
import { CreditCardIcon, CheckCircle2 } from 'lucide-react';
import { useUserRoles } from './UserRole';
import { CommitPayment } from './CommitPayment';

interface BudgetActionsSidebarProps {
    projectName: string;
    docName?: string;
    doctype?: string;
    isStaff?: boolean;
    /** ID of the parent application whose committed TID should be passed as refDetails (e.g. Travel app for TA DA Settlement) */
    parentAppId?: string;
    /** Pre-fill the commit amount with this value (e.g. net_claimed from TA DA Settlement) */
    billAmount?: number;
    /** Callback to notify parent of Kafka staging status, used to gate workflow actions */
    onStagingStatusChange?: (isCommitted: boolean) => void;
}

export const BudgetActionsSidebar: React.FC<BudgetActionsSidebarProps> = ({
    projectName,
    isStaff = true,
    docName,
    doctype = "Travel",
    parentAppId,
    billAmount,
    onStagingStatusChange,
}) => {
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);

    // Comprehensive check for RnD Staff roles (excludes HOS roles)
    const isRndStaff = roles?.some((r: string) =>
        r === "RnD Staff" || r === "R&D Staff" || r === "Research and Development Staff" ||
        r === "System Manager" || r === "staff, RnD"
    );

    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [initialPaymentData, setInitialPaymentData] = useState<any>(null);

    const [commitSuccess, setCommitSuccess] = useState<{ amount: number; head: string } | null>(null);

    // commit handled by CommitPayment component

    // Fetch Balances
    const balanceParams = useMemo(() => ({ project_number: projectName || '' }), [projectName]);

    const { data: projectAmounts } = useFrappeGetCall<{
        message: {
            data: {
                availableCommitAmount: number;
            }
        };
    }>(
        'rndopsapp.rndopsapp.commitPayment.get_project_available_amounts',
        balanceParams,
        projectName ? undefined : null,
        { revalidateOnFocus: false }
    );

    const actualBalance = (projectAmounts as any)?.message?.data?.availableCommitAmount ?? (projectAmounts as any)?.data?.availableCommitAmount ?? 0;

    // Fetch Budget Heads
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: number | string; docName: string }[]>([]);
    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch('/api/v2/document/Budget%20Head?fields=["*"]&order_by=name%20asc');
                const result = await response.json();
                if (result?.data) {
                    setBudgetHeadList(result.data.map((item: any) => ({
                        name: item.title || item.budget_head || item.name,
                        id: item.id,
                        docName: item.name,  // raw Frappe name (e.g. "vnacmhhbu5")
                    })));
                }
            } catch (err) {
                console.error("Failed to fetch Budget Heads:", err);
            }
        };
        fetchBudgetHeads();
    }, []);

    // Pre-fill logic (commitHead/commitAmount) moved to CommitPayment component

    // handleCommit moved to CommitPayment component

    const budgetHeadNames = useMemo(() => budgetHeadList.map(h => h.name), [budgetHeadList]);

    if (!isStaff || !isRndStaff) return null;

    return (
        <div className="space-y-6">
            {/* Commit success popup */}
            {commitSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                            ₹{commitSuccess.amount.toLocaleString('en-IN')} committed under "{commitSuccess.head}"
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                            After Dean approval, this will be reflected in your account.
                        </p>
                    </div>
                    <button
                        onClick={() => setCommitSuccess(null)}
                        className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-200 text-lg leading-none flex-shrink-0"
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
            )}
            {/* Make a Commitment Widget — delegated to CommitPayment */}
                <CommitPayment
                    doctype={doctype}
                    docName={docName || ""}
                    projectName={projectName}
                    budgetHeads={budgetHeadNames}
                    actualBalance={actualBalance}
                    billAmount={billAmount}
                    parentAppId={parentAppId}
                    onCommitSuccess={(head, amount) => setCommitSuccess({ head, amount })}
                    onStagingStatusChange={onStagingStatusChange}
                />

            {/* Payment Widget */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="frappe-widget-title mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Record Payment</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Process payment for this project directly.</p>
                <FrappeButton
                    onClick={() => {
                        setInitialPaymentData(null);
                        setIsPaymentOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
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
                manualCommitments={[]}
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
