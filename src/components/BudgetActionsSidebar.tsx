import React, { useState, useMemo, useEffect } from 'react';
import { useFrappeGetCall, useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { PaymentModal } from './PaymentModal';
import { ProjectLedgerModal, type BudgetEntry } from './ProjectLedgerModal';
import { FrappeButton } from '@/components/ui/neo-brutalism';
import { CreditCardIcon, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { useUserRoles } from './UserRole';

interface BudgetActionsSidebarProps {
    projectName: string;
    docName?: string;
    doctype?: string;
    isStaff?: boolean;
    /** ID of the parent application whose committed TID should be passed as refDetails (e.g. Travel app for TA DA Settlement) */
    parentAppId?: string;
    /** Pre-fill the commit amount with this value (e.g. net_claimed from TA DA Settlement) */
    billAmount?: number;
    /** Frappe doc name of the Budget Head to auto-select (e.g. ta_da_account_head value) */
    preselectedAccountHead?: string;
}

export const BudgetActionsSidebar: React.FC<BudgetActionsSidebarProps> = ({
    projectName,
    isStaff = true,
    docName,
    doctype = "Travel",
    parentAppId,
    billAmount,
    preselectedAccountHead,
}) => {
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);

    // Comprehensive check for RnD Staff roles (excludes HOS roles)
    const isRndStaff = roles?.some((r: string) =>
        r === "RnD Staff" || r === "R&D Staff" || r === "Research and Development Staff" ||
        r === "System Manager" || r === "staff, RnD"
    );

    const [commitHead, setCommitHead] = useState("");
    const [commitAmount, setCommitAmount] = useState("");
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [initialPaymentData, setInitialPaymentData] = useState<any>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [commitSuccess, setCommitSuccess] = useState<{ amount: number; head: string } | null>(null);

    // API Hooks for Commit
    const { call: submitCommit, loading: isCommitting } = useFrappePostCall("rndopsapp.rndopsapp.commitPayment.submit_commit_data");

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

    // Set default head — prefer preselectedAccountHead match, else first entry
    useEffect(() => {
        if (budgetHeadList.length === 0 || commitHead) return;
        if (preselectedAccountHead) {
            const match = budgetHeadList.find(h => h.docName === preselectedAccountHead);
            if (match) {
                setCommitHead(match.name);
                return;
            }
        }
        setCommitHead(budgetHeadList[0].name);
    }, [budgetHeadList, preselectedAccountHead]);

    // Pre-fill commitAmount: billAmount prop takes priority, then fall back to ledger lookup
    useEffect(() => {
        if (billAmount != null && billAmount > 0) {
            setCommitAmount(String(billAmount));
            return;
        }

        if (!parentAppId || !projectName || budgetHeadList.length === 0) return;

        const fetchParentCommitAmount = async () => {
            try {
                const headEntry = budgetHeadList[0];
                const accountHeadId = headEntry?.id || headEntry?.name;
                const ledgerUrl = `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectName)}&accountHeadId=${encodeURIComponent(String(accountHeadId))}`;
                const res = await fetch(ledgerUrl);
                if (!res.ok) return;
                const entries: any[] = await res.json().then(d => Array.isArray(d) ? d : []);
                const parentEntry = entries.find((e: any) => e.frapAppId === parentAppId);
                if (parentEntry?.committed) {
                    setCommitAmount(String(parentEntry.committed));
                }
            } catch (err) {
                console.error("Failed to fetch parent committed amount:", err);
            }
        };

        fetchParentCommitAmount();
    }, [billAmount, parentAppId, projectName, budgetHeadList]);

    const handleCommit = async () => {
        if (isCommitting || isSubmitting) return;

        const amount = parseFloat(commitAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        if (!projectName || !docName) {
            alert("Missing project or document information.");
            return;
        }

        setIsSubmitting(true);
        try {
            let refDetails: string | undefined;

            // If a parent Travel app is linked (e.g. for TA DA Settlement),
            // check whether financial assistance was required before looking up the ledger TID.
            if (parentAppId) {
                // Fetch the Travel doc to check financial assistance flag
                let financialAssistance = "Yes"; // default: require TID
                try {
                    const travelRes = await fetch(
                        `/api/resource/Travel/${encodeURIComponent(parentAppId)}?fields=["travel_financial_assistance"]`,
                        { credentials: "include" },
                    );
                    if (travelRes.ok) {
                        const travelData = await travelRes.json();
                        financialAssistance = travelData?.data?.travel_financial_assistance ?? "Yes";
                    }
                } catch (err) {
                    console.error("Failed to fetch Travel financial assistance flag:", err);
                }

                if (financialAssistance === "Yes") {
                    // Financial assistance was given — require the parent TID from the ledger
                    try {
                        const headEntry = budgetHeadList.find(h => h.name === commitHead) || budgetHeadList[0];
                        const accountHeadId = headEntry?.id || commitHead;
                        const ledgerUrl = `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectName)}&accountHeadId=${encodeURIComponent(String(accountHeadId))}`;
                        const ledgerRes = await fetch(ledgerUrl);
                        if (ledgerRes.ok) {
                            const entries: any[] = await ledgerRes.json().then(d => Array.isArray(d) ? d : []);
                            const parentEntry = entries.find((e: any) => e.frapAppId === parentAppId);
                            if (parentEntry) {
                                refDetails = String(parentEntry.transactionId);
                            }
                        }
                    } catch (ledgerErr) {
                        console.error("Failed to fetch parent TID from ledger:", ledgerErr);
                    }

                    if (!refDetails) {
                        alert("Could not find the parent Travel application TID in the ledger. Please ensure the Travel application has been committed first.");
                        setIsSubmitting(false);
                        return;
                    }
                }
                // If financialAssistance === "No", skip TID lookup — refDetails stays undefined
            }

            await submitCommit({
                doctype: doctype,
                frapAppId: docName,
                name: docName,
                project_name: projectName,
                commit_amount: amount,
                bill_amount: amount,
                budget_head: commitHead,
                bmr: "",
                ...(refDetails ? { refDetails } : {}),
            });

            setCommitSuccess({ amount, head: commitHead });
            setCommitAmount("");
        } catch (error: any) {
            console.error("Commit failed:", error);
            alert(`Commitment failed: ${error.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

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
            {/* Make a Commitment Widget */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="frappe-widget-title mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Make a Commitment</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1 block">Budget Head</label>
                        <select
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                            value={commitHead}
                            onChange={(e) => setCommitHead(e.target.value)}
                        >
                            {budgetHeadList.map((head) => (
                                <option key={head.id} value={head.name}>{head.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Available: <span className="font-medium text-[#D97757]">
                                {isBalanceLoading ? "..." : `₹${actualBalance.toLocaleString('en-IN')}`}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1 block">Amount (₹)</label>
                        <input
                            type="number"
                            min="0"
                            title="Enter a positive amount in ₹"
                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-900 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                            placeholder="e.g., 5000"
                            value={commitAmount}
                            onChange={(e) => setCommitAmount(e.target.value)}
                            onKeyDown={(e) => {
                                if (["e", "E", "+", "-"].includes(e.key) || /[a-zA-Z]/.test(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                        />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleCommit}
                            disabled={isCommitting || isSubmitting}
                            className="flex-1 bg-[#D97757] hover:bg-[#D97757] text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {isCommitting || isSubmitting ? "Committing..." : "Commit"}
                        </button>
                    </div>

                    <button
                        onClick={() => setIsLedgerOpen(true)}
                        className="w-full text-center text-xs font-medium text-[#D97757] hover:underline pt-2"
                    >
                        <div className="flex items-center justify-center gap-1">
                            <FileSpreadsheet className="w-3 h-3" />
                            View Project Budget Ledger
                        </div>
                    </button>
                </div>
            </div>

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
