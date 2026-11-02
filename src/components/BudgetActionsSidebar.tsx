import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import React, { useState, useMemo, useEffect } from 'react';
import { useFrappeAuth } from 'frappe-react-sdk';
import { ProjectLedgerModal } from './ProjectLedgerModal';
import { CheckCircle2 } from 'lucide-react';
import { useUserRoles } from './UserRole';
import { CommitPayment } from './CommitPayment';
import { useProjectBudget } from '@/hooks/useProjectBudget';
import { isOverheadProjectNo, OVERHEAD_BUDGET_HEAD } from '@/services/overheadLedger';

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
    /** Budget Head label to pre-select in "Make a Commitment" when it exists in the fetched budget head list (e.g. the resolved "Account Head from Travel" on a TA DA Settlement) */
    defaultBudgetHead?: string;
    /** When set, new commitments are blocked and this message is shown instead of the form */
    commitBlockedReason?: string;
    /** Optional helper note shown under the "Make a Commitment" title (e.g. clarifying what the pre-filled amount represents) */
    commitAmountNote?: string;
    /** Include bill_amount (equal to the entered commitment amount) in the Kafka commit payload — e.g. required for TA DA Settlement */
    includeBillAmount?: boolean;
}

export const BudgetActionsSidebar: React.FC<BudgetActionsSidebarProps> = ({
    projectName,
    isStaff = true,
    docName,
    doctype = "Travel",
    parentAppId,
    billAmount,
    onStagingStatusChange,
    defaultBudgetHead,
    commitBlockedReason,
    commitAmountNote,
    includeBillAmount = false,
}) => {
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);

    // Comprehensive check for RnD Staff roles (excludes HOS roles)
    const isRndStaff = roles?.some((r: string) =>
        r === "RnD Staff" || r === "R&D Staff" || r === "Research and Development Staff" ||
        r === "System Manager" || r === "staff, RnD"
    );

    const [isLedgerOpen, setIsLedgerOpen] = useState(false);

    const [commitSuccess, setCommitSuccess] = useState<{ amount: number; head: string } | null>(null);

    // Head-wise balances from ledger API
    const { heads: projectHeads, headBalances, actualBalance, commitableBalance, isLoading: isBudgetLoading } = useProjectBudget(projectName || "");

    // Fetch Budget Heads list (needed by ProjectLedgerModal and PaymentModal)
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: number | string }[]>([]);
    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch(`${FRAPPE_BASE_URL}/api/resource/Budget%20Head?fields=["*"]&order_by=name%20asc&limit_page_length=0`);
                const result = await response.json();
                if (result?.data) {
                    setBudgetHeadList(result.data.map((item: any) => ({
                        name: item.title || item.budget_head || item.name,
                        id: item.id
                    })));
                }
            } catch (err) {
            }
        };
        fetchBudgetHeads();
    }, []);

    // An overhead fund (PDF / DPF / IDF / SWF / STWF) is a single pool with no head
    // dimension — every spend books to "Overhead". Offering the full master list here was
    // wrong twice over: budgetHeadList is the *whole* Budget Head table, so `budgetHeads[0]`
    // (what CommitPayment defaults to) was whichever head happened to sort first, and
    // lockBudgetHead then disabled the dropdown on that wrong value.
    const isOverheadProject = isOverheadProjectNo(projectName);
    const budgetHeadNames = useMemo(
        () => {
            if (isOverheadProject) return [OVERHEAD_BUDGET_HEAD];
            // Only heads sanctioned for this project (get_budget_heads_by_project); fall back to
            // the full master list only if the project has none.
            if (projectHeads.length > 0 || isBudgetLoading) return projectHeads;
            return budgetHeadList.map(h => h.name);
        },
        [isOverheadProject, projectHeads, isBudgetLoading, budgetHeadList],
    );
    const budgetHeadIds = useMemo(
        () => Object.fromEntries(budgetHeadList.map(h => [h.name, h.id])),
        [budgetHeadList],
    );

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
                    // An overhead project books everything to the single "Overhead" pool —
                    // it has no budget head dimension to choose from. budgetHeads is
                    // already narrowed to just that head above, so this locks the selector
                    // onto the right value rather than merely freezing it.
                    lockBudgetHead={isOverheadProject}
                    budgetHeadIds={budgetHeadIds}
                    actualBalance={actualBalance}
                    commitableBalance={commitableBalance}
                    displayHeadBalances={headBalances}
                    onViewLedger={() => setIsLedgerOpen(true)}
                    billAmount={billAmount}
                    parentAppId={parentAppId}
                    defaultBudgetHead={defaultBudgetHead}
                    blockedReason={commitBlockedReason}
                    description={commitAmountNote}
                    includeBillAmount={includeBillAmount}
                    onCommitSuccess={(head, amount) => setCommitSuccess({ head, amount })}
                    onStagingStatusChange={onStagingStatusChange}
                />

            <ProjectLedgerModal
                isOpen={isLedgerOpen}
                onClose={() => setIsLedgerOpen(false)}
                projectName={projectName}
                budgetHeadList={budgetHeadList}
                manualCommitments={[]}
            />
        </div>
    );
};
