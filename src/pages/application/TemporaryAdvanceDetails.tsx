import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../../components/RndSidebar";
import { useFrappePostCall, useFrappeGetCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { CalendarIcon, UserIcon, EditIcon, Wallet as WalletIcon, AlertTriangle } from "lucide-react";
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalLoader } from '@/components/ui/global-loader';
import { Textarea } from '@/components/ui/textarea';
import TemporaryAdvanceActionButtons from '../../components/TemporaryAdvanceActionButtons';
import { ToWords } from 'to-words';
import { DepartmentName } from '@/components/DepartmentName';
import { useProjectBudget } from '@/hooks/useProjectBudget';
import { useUserRoles } from '../../components/UserRole';
import { ProjectLedgerModal } from '../../components/ProjectLedgerModal';
import { DeclarationFields } from '@/components/DeclarationFields';
import { CommitPayment } from '@/components/CommitPayment';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';

// Initialize ToWords converter
const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
        ignoreDecimal: false
    }
});

// --- TYPE DEFINITIONS ---
interface TemporaryAdvanceData {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    workflow_state: string;
    project_code: string;
    project_name?: string;
    amount_applied: number;
    advance_for_id: string;
    advance_for_department: string;
    advance_for_designation: string;
    applicant_webmail: string;
    applicant_department: string;
    applicant_designation: string;
    reason?: string;
    purpose?: string;
    [key: string]: any;
}

// Frappe-styled components
const FrappeCard = ({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm overflow-hidden", className)}>
        {title && (
            <div className="px-[22px] py-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">{title}</h3>
            </div>
        )}
        <div className="p-[18px] md:p-6">
            {children}
        </div>
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'ghost' }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline' | 'action';
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
            variant === 'primary' && "bg-[#D97757] text-white hover:bg-[#D97757] shadow-md hover:shadow-lg border border-[#C66A4E]",
            variant === 'ghost' && "bg-transparent text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]",
            variant === 'outline' && "bg-white border border-[#E4E4E7] text-[#3F3F46] hover:bg-[#FAFAF9] rounded-lg dark:bg-[#27272A] dark:border-[#3F3F46] dark:text-[#E4E4E7] dark:hover:bg-[#3F3F46]",
            variant === 'action' && "bg-[#D97757] text-white font-bold hover:bg-[#D97757] shadow-md hover:shadow-lg border-2 border-[#C66A4E]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

const TemporaryAdvanceDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<TemporaryAdvanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Track Kafka Commit Staging status to gate workflow action buttons for Staff RnD
    const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);
    const [projectTitle, setProjectTitle] = useState<string>('');
    const [resolvedAccountHead, setResolvedAccountHead] = useState<string>('');

    const { call: fetchDoc } = useFrappePostCall<{ message: TemporaryAdvanceData }>(
        'frappe.client.get'
    );

    // Sidebar State
    const [sidebarComment, setSidebarComment] = useState("");
    const [isAddingComment, setIsAddingComment] = useState(false);
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

    // Commitment Widget State
    const [commitHead, setCommitHead] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    // commitAmount moved to CommitPayment component

    // commit handled by CommitPayment component
    const { call: submitPayment, loading: isPaying } = useFrappePostCall("rndopsapp.rndopsapp.commitPayment.submit_payment_data");

    // Role Check
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isRnDStaff = roles.some(r =>
        r === "RnD Staff" || r === "R&D Staff" || r === "Research and Development Staff" || r === "System Manager" || r === "staff, RnD" || r === "Hos, RnD (Head of Section, RnD)"
    );

    // Fetch Project Budget Data
    const projectCode = data?.project_code || "";
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);

    // Fetch Budget Head List for Ledger Modal
    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch('/api/v2/document/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc');
                const result = await response.json();
                if (result?.data) {
                    setBudgetHeadList(result.data.map((item: any) => ({
                        name: item.budget_head,
                        id: item.id
                    })));
                }
            } catch (err) {
                console.error("Failed to fetch Budget Heads:", err);
            }
        };
        fetchBudgetHeads();
    }, []);

    const { budgetData, heads: budgetHeads } = useProjectBudget(projectCode);

    // Find existing commitment for this document (used for payment pre-fill)
    const linkedCommitment = budgetData.find(e => e.ref === (id || "") && e.type === 'commitment');
    // isCommitted tracked via CommitPayment onStagingStatusChange

    // commitHead default & payment defaults from linked commitment
    useEffect(() => {
        if (budgetHeads.length > 0 && !commitHead) {
            setCommitHead(budgetHeads[0]);
        }
    }, [budgetHeads]);

    useEffect(() => {
        if (linkedCommitment) {
            setCommitHead(linkedCommitment.head || "");
            if (!paymentAmount) setPaymentAmount(String(linkedCommitment.committed));
        }
    }, [linkedCommitment]);

    // Fetch Document Data - extracted as standalone function for reusability
    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const docRes = await fetchDoc({ doctype: "Temporary Advance", name: id });
            if (docRes?.message) {
                setData(docRes.message);
            } else {
                setError("Document not found");
            }
        } catch (err) {
            console.error("Error loading document:", err);
            setError("Failed to load document");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const { data: cancellationStatus } = useFrappeGetCall<{
        message: {
            has_pending: boolean;
            has_cancellation: boolean;
            cancellation_requests: any[];
        };
    }>(
        "rndopsapp.rndopsapp.cancellation_api.get_cancellation_status",
        {
            reference_doctype: "Temporary Advance",
            reference_name: id,
        },
        id ? undefined : null
    );

    // Resolve account head name from ID
    useEffect(() => {
        const resolveAccountHeadName = async () => {
            if (!data?.account_head) return;

            try {
                const response = await fetch(`/api/v2/document/Budget%20Head/${data.account_head}`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const json = await response.json();
                    if (json.data) {
                        setResolvedAccountHead(json.data.budget_head || json.data.name);
                    }
                } else {
                    // Fallback: use the ID as-is
                    setResolvedAccountHead(data.account_head);
                }
            } catch (err) {
                console.error("Error resolving account head:", err);
                setResolvedAccountHead(data.account_head);
            }
        };

        resolveAccountHeadName();
    }, [data?.account_head]);


    // Resolve project title from project code
    useEffect(() => {
        const resolveProjectTitle = async () => {
            if (!data?.project_code) return;

            try {
                // Try Project Registration first
                let response = await fetch(`/api/v2/document/Project%20Registration/${data.project_code}`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    // Fallback to Project Proposal
                    response = await fetch(`/api/v2/document/Project%20Proposal/${data.project_code}`, {
                        credentials: 'include'
                    });
                }

                if (response.ok) {
                    const json = await response.json();
                    if (json.data) {
                        setProjectTitle(json.data.project_title || json.data.name);
                        return;
                    }
                }
                // Fallback: use project_name from the document (actual title)
                setProjectTitle(data.project_name || data.project_code);
            } catch (err) {
                console.error("Error resolving project title:", err);
                setProjectTitle(data.project_name || data.project_code);
            }
        };

        resolveProjectTitle();
    }, [data?.project_code]);

    const handleSidebarCommentSubmit = async () => {
        if (!sidebarComment.trim() || !id) return;
        setIsAddingComment(true);
        try {
            await addComment({
                reference_doctype: "Temporary Advance",
                reference_name: id,
                content: sidebarComment,
                comment_type: "Comment"
            });
            setSidebarComment("");
            // Refetch data instead of reload
            loadData();
        } catch (error) {
            console.error("Error adding comment:", error);
        } finally {
            setIsAddingComment(false);
        }
    };

    // handleCommit moved to CommitPayment component

    const handlePayment = async () => {
        if (!paymentAmount || !commitHead || !id || !data) {
            alert("Please select a budget head and enter an amount.");
            return;
        }

        try {
            await submitPayment({
                doctype: "Temporary Advance",
                name: id,
                project_name: data.project_name || data.project_code,
                payment_amount: parseFloat(paymentAmount),
                budget_head: commitHead,
                bmr: "",
                frapAppId: id,
                moduleName: "Temporary Advance"
            });
            alert("Payment recorded successfully!");
            setPaymentAmount("");
            // Refetch data instead of reload
            loadData();
        } catch (error: any) {
            console.error("Payment failed:", error);
            alert(`Payment failed: ${error.message || "Unknown error"}`);
        }
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B]">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
                    <p className="text-[#71717A] dark:text-[#A1A1AA]">{error || "Document not found"}</p>
                    <button onClick={() => navigate(-1)} className="mt-4 text-[#D97757] hover:underline">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
            <AppSidebar />

            <main className="transition-all duration-300 ease-in-out px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
                {/* Header Actions */}
                <PageHeader
                    title={data.name}
                    status={data.workflow_state}
                    projectName={projectTitle || data.project_name}
                    projectNumber={data.project_code}
                >
                    {/* Workflow Action Buttons */}
                    <div className="flex items-center gap-3">
                        {/* Edit Button - Only show for Draft state */}
                        {data.workflow_state === 'Draft' && id && (
                            <button
                                onClick={() => navigate(`/temporary-advance?edit=${id}`)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#D97757] text-white hover:bg-[#D97757] shadow-md transition-all"
                            >
                                <EditIcon className="w-4 h-4" />
                                Edit
                            </button>
                        )}
                        {!cancellationStatus?.message?.has_pending && id && <TemporaryAdvanceActionButtons
                            docname={id}
                            onActionComplete={() => loadData()}
                            commitRequired={isRnDStaff && isCommittedForGate === false && data.workflow_state !== "Draft" && data.workflow_state !== "Rejected" && data.workflow_state !== "Cancelled"}
                        />}
                    </div>
                </PageHeader>

                {/* Warning Banner if there's a pending cancellation */}
                {cancellationStatus?.message?.has_pending && (
                    <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 flex items-center gap-3 shadow-sm">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                        <div className="text-sm font-medium">
                            This application has a pending cancellation request. No further workflow actions can be performed on it.
                        </div>
                    </div>
                )}



                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-5 shadow-sm">
                                <p className="text-[12px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">Advance Amount</p>
                                <p className="mt-2 text-[30px] font-extrabold leading-none text-[#D97757]">
                                    ₹ {(data.amount || data.amount_applied || 0).toLocaleString('en-IN')}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-5 shadow-sm">
                                <p className="text-[12px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">Account Head</p>
                                <p className="mt-2 text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{resolvedAccountHead || data.account_head || "-"}</p>
                            </div>
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-5 shadow-sm">
                                <p className="text-[12px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">Requested By</p>
                                <p className="mt-2 text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] break-all">{data.owner || "-"}</p>
                            </div>
                        </div>

                        {/* Project Details Card */}
                        <FrappeCard title="Project Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Project Code</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{data.project_code || "-"}</div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Project Name</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{projectTitle || data.project_name || "-"}</div>
                                </div>
                            </div>
                        </FrappeCard>

                        {/* Advance Info Card */}
                        <FrappeCard title="Advance Information">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Amount</label>
                                    <div className="text-2xl font-black text-[#D97757]">
                                        ₹ {(data.amount || data.amount_applied || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Amount in Words</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7] capitalize">
                                        {data.amount_in_words || (data.amount || data.amount_applied ? toWords.convert(data.amount || data.amount_applied) : '-')}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Account Head</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{resolvedAccountHead || data.account_head || "-"}</div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Requested By</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{data.owner}</div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Applying For</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{data.appplying_for_select || "-"}</div>
                                </div>
                            </div>

                            {/* Declarations */}
                            <div className="mt-6 pt-4 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                <DeclarationFields doctype="Temporary Advance" />
                            </div>

                            {/* Justification and Comments */}
                            <div className="space-y-4 mt-6">
                                {(data.justification || data.reason || data.purpose) && (
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Justification</label>
                                        <div className="p-4 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] text-sm whitespace-pre-wrap">
                                            {data.justification || data.reason || data.purpose || "-"}
                                        </div>
                                    </div>
                                )}
                                {data.comments && (
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Comments</label>
                                        <div className="p-4 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] text-sm whitespace-pre-wrap">
                                            {data.comments}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </FrappeCard>

                        {/* Applicant Details */}
                        <FrappeCard title="Applicant Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Applicant Webmail</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <UserIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                                        {data.applicant_webmail || "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Applicant Department</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                                        {data.applicant_department ? <DepartmentName name={data.applicant_department} /> : "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Applicant Designation</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{data.applicant_designation || "-"}</div>
                                </div>
                            </div>
                        </FrappeCard>

                        {/* Bank Details Card */}
                        <FrappeCard title="Bank Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Bank Name</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{data.bank_name || "-"}</div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Account Holder Name</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{data.account || "-"}</div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Account Number</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7] font-mono">{data.bank_account_number || "-"}</div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">IFSC Code</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7] font-mono">{data.ifsc_code || "-"}</div>
                                </div>
                            </div>
                        </FrappeCard>



                        {/* Advance For Details - Only show if there's data */}
                        {(data.advance_for_id || data.advance_for_department || data.advance_for_designation) && (
                            <FrappeCard title="Advance For (Beneficiary)">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Beneficiary ID</label>
                                        <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{data.advance_for_id || "-"}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Department</label>
                                        <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                                            {data.advance_for_department ? <DepartmentName name={data.advance_for_department} /> : "-"}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Designation</label>
                                        <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{data.advance_for_designation || "-"}</div>
                                    </div>
                                </div>
                            </FrappeCard>
                        )}

                        {/* Documents Section */}
                        {data.documents && (
                            <FrappeCard title="Attachments">
                                <div className="space-y-3">
                                    {Array.isArray(data.documents) ? (
                                        data.documents.map((doc: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                                                <span className="text-sm font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{doc.file_name || doc.name || `Document ${idx + 1}`}</span>
                                                {doc.file_url && (
                                                    <a
                                                        href={doc.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[#D97757] hover:underline text-sm font-medium"
                                                    >
                                                        View
                                                    </a>
                                                )}
                                            </div>
                                        ))
                                    ) : typeof data.documents === 'string' ? (
                                        <div className="p-4 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] text-sm">
                                            {data.documents}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] italic">No documents attached</p>
                                    )}
                                </div>
                            </FrappeCard>
                        )}
                    </div>

                    <div className="space-y-6">
                        {/* Add Comment Section */}
                        <div className="bg-white dark:bg-[#27272A] p-5 rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                            <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-3">Add Comment</h3>
                            <Textarea
                                className="w-full border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] text-[#3F3F46] dark:text-[#E4E4E7] p-3 rounded-lg text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                rows={3}
                                placeholder="Type your comment here..."
                                value={sidebarComment}
                                onChange={(e) => setSidebarComment(e.target.value)}
                            />
                            <FrappeButton
                                className="w-full"
                                variant="primary"
                                onClick={handleSidebarCommentSubmit}
                                disabled={isAddingComment}
                            >
                                {isAddingComment ? "Submitting..." : "Submit Comment"}
                            </FrappeButton>
                        </div>

                        {/* Staff Action Section - matches AdvanceSettlementDetails */}
                        {isRnDStaff && (
                            <FrappeCard title="Temporary Advance Processing (Staff Only)" className="border-l-4 border-l-blue-500">
                                <div className="space-y-6">
                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <FrappeButton
                                            onClick={() => setIsLedgerOpen(true)}
                                            variant="outline"
                                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        >
                                            <WalletIcon className="w-4 h-4" />
                                            Check Ledger
                                        </FrappeButton>
                                    </div>

                                    {/* Commitment Section */}
                                    <CommitPayment
                                        doctype="Temporary Advance"
                                        docName={id || ""}
                                        projectName={data?.project_name || data?.project_code || ""}
                                        budgetHeads={budgetHeads}
                                        onCommitSuccess={() => loadData()}
                                        onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
                                    />

                                    {/* Payment Section */}
                                    {/* <div className="p-4 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                                        <h4 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-3">2. Payment Processing</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Budget Head</label>
                                                <input
                                                    type="text"
                                                    value={budgetHeadList.find(h => h.id === commitHead || h.name === commitHead)?.name || commitHead}
                                                    disabled
                                                    className="w-full p-2 text-sm border border-zinc-200 rounded-md bg-zinc-100 text-zinc-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Payment Amount</label>
                                                <input
                                                    type="number"
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                                    className="w-full p-2 text-sm border border-zinc-300 rounded-md bg-white dark:bg-zinc-900 dark:border-zinc-700"
                                                    placeholder="Enter payment amount"
                                                />
                                            </div>
                                            <FrappeButton
                                                onClick={handlePayment}
                                                disabled={isPaying || !isCommitted || !paymentAmount}
                                                variant="primary"
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                                            >
                                                {isPaying ? "Processing..." : "Record Payment"}
                                            </FrappeButton>
                                        </div>
                                    </div> */}
                                </div>
                            </FrappeCard>
                        )}


                        {/* Meta Info */}
                        <FrappeCard>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Created On</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                                        {data.creation ? new Date(data.creation).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'long', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        }) : "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">Last Modified</label>
                                    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                                        {data.modified ? new Date(data.modified).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        }) : "-"}
                                    </div>
                                </div>
                            </div>
                        </FrappeCard>
                    </div>
                </div>
            </main>

            {/* Project Ledger Modal */}
            {isLedgerOpen && (
                <ProjectLedgerModal
                    isOpen={isLedgerOpen}
                    onClose={() => setIsLedgerOpen(false)}
                    projectName={projectCode}
                    budgetHeadList={budgetHeadList}
                />
            )}
            {id && <FloatingActivityLogButton doctype="Temporary Advance" docname={id} />}
        </div>
    );
};

export default TemporaryAdvanceDetails;
