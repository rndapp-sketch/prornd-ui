import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../../components/RndSidebar";
import { useFrappePostCall, useFrappeGetCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { CalendarIcon, UserIcon, EditIcon, Wallet as WalletIcon, AlertTriangle, ArrowLeftIcon, FileTextIcon, CreditCardIcon, CheckCircle2Icon, PaperclipIcon } from "lucide-react";
import { GlobalLoader } from '@/components/ui/global-loader';
import TemporaryAdvanceActionButtons from '../../components/TemporaryAdvanceActionButtons';
import { ToWords } from 'to-words';
import { DepartmentName } from '@/components/DepartmentName';
import { useProjectBudget } from '@/hooks/useProjectBudget';
import { useUserRoles } from '../../components/UserRole';
import { ProjectLedgerModal } from '../../components/ProjectLedgerModal';
import { DeclarationFields } from '@/components/DeclarationFields';
import { CommitPayment } from '@/components/CommitPayment';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';
import { Button } from '@/components/ui/button';

const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: { ignoreDecimal: false }
});

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

const SectionHeading = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#2563EB] dark:bg-blue-950/30 dark:text-blue-300">
            <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
        </span>
        <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#A1A1AA]">
            {title}
        </span>
        <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46]" />
    </div>
);

const InfoCard = ({ label, value }: { label: string; value: any }) => (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
        <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]">
            <span className="truncate">{label}</span>
        </div>
        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">
            {value || "-"}
        </p>
    </div>
);

const TemporaryAdvanceDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<TemporaryAdvanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);
    const [projectTitle, setProjectTitle] = useState<string>('');
    const [resolvedAccountHead, setResolvedAccountHead] = useState<string>('');
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);

    const { call: fetchDoc } = useFrappePostCall<{ message: TemporaryAdvanceData }>('frappe.client.get');
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isRnDStaff = roles.some(r => ["RnD Staff", "R&D Staff", "Research and Development Staff", "System Manager", "staff, RnD", "Hos, RnD (Head of Section, RnD)"].includes(r));

    const projectCode = data?.project_code || "";
    const { heads: budgetHeads } = useProjectBudget(projectCode);

    const { data: cancellationStatus } = useFrappeGetCall<{ message: { has_pending: boolean } }>(
        "rndopsapp.rndopsapp.cancellation_api.get_cancellation_status",
        { reference_doctype: "Temporary Advance", reference_name: id },
        id ? undefined : null
    );

    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch('/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0');
                const result = await response.json();
                if (result?.data) {
                    setBudgetHeadList(result.data.map((item: any) => ({ name: item.budget_head, id: item.id })));
                }
            } catch (err) {
                console.error("Failed to fetch Budget Heads:", err);
            }
        };
        fetchBudgetHeads();
    }, []);

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

    useEffect(() => {
        const resolveAccountHeadName = async () => {
            if (!data?.account_head) return;
            try {
                const response = await fetch(`/api/v2/document/Budget%20Head/${data.account_head}`, { credentials: 'include' });
                if (response.ok) {
                    const json = await response.json();
                    setResolvedAccountHead(json.data?.budget_head || json.data?.name);
                } else {
                    setResolvedAccountHead(data.account_head);
                }
            } catch (err) {
                setResolvedAccountHead(data.account_head);
            }
        };
        resolveAccountHeadName();
    }, [data?.account_head]);

    useEffect(() => {
        const resolveProjectTitle = async () => {
            if (!data?.project_code) return;
            try {
                let response = await fetch(`/api/v2/document/Project%20Registration/${data.project_code}`, { credentials: 'include' });
                if (!response.ok) {
                    response = await fetch(`/api/v2/document/Project%20Proposal/${data.project_code}`, { credentials: 'include' });
                }
                if (response.ok) {
                    const json = await response.json();
                    if (json.data) {
                        setProjectTitle(json.data.project_title || json.data.name);
                        return;
                    }
                }
                setProjectTitle(data.project_name || data.project_code);
            } catch (err) {
                setProjectTitle(data.project_name || data.project_code);
            }
        };
        resolveProjectTitle();
    }, [data?.project_code]);

    const handleAddComment = async (commentText: string): Promise<boolean> => {
        if (!commentText.trim() || !id) return false;
        try {
            await addComment({
                reference_doctype: "Temporary Advance",
                reference_name: id,
                content: commentText,
                comment_type: "Comment"
            });
            loadData();
            return true;
        } catch (error) {
            console.error("Error adding comment:", error);
            return false;
        }
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
                <div className="text-center p-8 max-w-md w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <h2 className="text-xl font-semibold text-red-800 dark:text-red-300 mb-2">Error Loading Document</h2>
                    <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error || "Document not found"}</p>
                    <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
                </div>
            </div>
        );
    }

    const getStatusColor = (state: string) => {
        if (state === 'Approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300';
        if (state === 'Rejected') return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300';
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300';
    };

    return (
        <div className="bg-zinc-50 dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <div className="transition-all duration-300 p-6 md:p-8 lg:p-12 max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                        <button onClick={() => navigate(-1)} className="hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1">
                            <ArrowLeftIcon className="h-4 w-4" /> Back
                        </button>
                        <span>/</span>
                        <span className="text-zinc-900 dark:text-zinc-100 font-medium">{id}</span>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl md:text-4xl font-serif font-medium text-zinc-900 dark:text-zinc-50">
                                    Temporary Advance
                                </h1>
                                <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border", getStatusColor(data.workflow_state))}>
                                    {data.workflow_state}
                                </span>
                            </div>
                            <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                                Advance request for project <span className="font-medium text-zinc-700 dark:text-zinc-300">{projectTitle || data.project_code}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            {data.workflow_state === 'Draft' && id && (
                                <Button variant="outline" onClick={() => navigate(`/temporary-advance?edit=${id}`)} className="gap-2">
                                    <EditIcon className="h-4 w-4" /> Edit
                                </Button>
                            )}
                            {!cancellationStatus?.message?.has_pending && id && (
                                <TemporaryAdvanceActionButtons
                                    docname={id}
                                    onActionComplete={() => loadData()}
                                    commitRequired={isRnDStaff && isCommittedForGate === false && !["Draft", "Rejected", "Cancelled"].includes(data.workflow_state)}
                                    onAddComment={handleAddComment}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Warning Banner */}
                {cancellationStatus?.message?.has_pending && (
                    <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div className="text-sm font-medium">
                            This application has a pending cancellation request. No further workflow actions can be performed on it.
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="space-y-6">
                    {/* Financial KPI Strip */}
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm dark:border-[#3F3F46] dark:bg-zinc-800/50">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">Advance Amount</p>
                            <p className="text-[17px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">
                                ₹{(data.amount || data.amount_applied || 0).toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm dark:border-[#3F3F46] dark:bg-zinc-800/50">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">Account Head</p>
                            <p className="text-[17px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight truncate">
                                {resolvedAccountHead || data.account_head || "-"}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm dark:border-[#3F3F46] dark:bg-zinc-800/50">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">Requested By</p>
                            <p className="text-[17px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight truncate">
                                {data.owner}
                            </p>
                        </div>
                    </div>

                    {/* Advance Information */}
                    <div>
                        <SectionHeading icon={<CreditCardIcon />} title="Advance Details" />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <InfoCard label="Amount" value={`₹${(data.amount || data.amount_applied || 0).toLocaleString('en-IN')}`} />
                            <InfoCard label="Amount in Words" value={data.amount_in_words || (data.amount || data.amount_applied ? toWords.convert(data.amount || data.amount_applied) : '-')} />
                            <InfoCard label="Account Head" value={resolvedAccountHead || data.account_head} />
                            <InfoCard label="Project Code" value={data.project_code} />
                            <InfoCard label="Project Name" value={projectTitle || data.project_name} />
                            <InfoCard label="Applying For" value={data.appplying_for_select} />
                        </div>
                    </div>

                    {/* Declarations */}
                    <div>
                        <SectionHeading icon={<CheckCircle2Icon />} title="Declarations" />
                        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] p-4">
                            <DeclarationFields doctype="Temporary Advance" />
                        </div>
                    </div>

                    {/* Justification */}
                    {(data.justification || data.reason || data.purpose) && (
                        <div>
                            <SectionHeading icon={<FileTextIcon />} title="Justification" />
                            <div className="p-4 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                                {data.justification || data.reason || data.purpose}
                            </div>
                        </div>
                    )}

                    {/* Applicant Information */}
                    <div>
                        <SectionHeading icon={<UserIcon />} title="Applicant Information" />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <InfoCard label="Email" value={data.applicant_webmail} />
                            <InfoCard label="Department" value={data.applicant_department ? <DepartmentName name={data.applicant_department} /> : "-"} />
                            <InfoCard label="Designation" value={data.applicant_designation} />
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div>
                        <SectionHeading icon={<CreditCardIcon />} title="Bank Details" />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <InfoCard label="Bank Name" value={data.bank_name} />
                            <InfoCard label="Account Holder" value={data.account} />
                            <InfoCard label="Account Number" value={data.bank_account_number} />
                            <InfoCard label="IFSC Code" value={data.ifsc_code} />
                        </div>
                    </div>

                    {/* Attachments */}
                    {data.documents && Array.isArray(data.documents) && data.documents.length > 0 && (
                        <div>
                            <SectionHeading icon={<PaperclipIcon />} title="Attachments" />
                            <div className="flex flex-wrap gap-2">
                                {data.documents.map((doc: any, idx: number) => (
                                    <a key={idx} href={doc.file_url} target="_blank" rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800 text-[#D97757] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm font-medium">
                                        <PaperclipIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span className="truncate max-w-[200px]">{doc.file_name || doc.name || `Document ${idx + 1}`}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Staff Processing */}
                    {isRnDStaff && (
                        <div className="border-l-4 border-l-blue-500 bg-white dark:bg-zinc-800 rounded-xl p-5 border border-[#E4E4E7] dark:border-[#3F3F46]">
                            <div className="flex items-center gap-2 mb-4">
                                <WalletIcon className="w-4 h-4 text-[#D97757]" />
                                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Staff Processing
                                </h3>
                            </div>
                            <div className="space-y-4">
                                <Button
                                    onClick={() => setIsLedgerOpen(true)}
                                    variant="outline"
                                    className="w-full gap-2"
                                >
                                    <WalletIcon className="h-4 w-4" />
                                    Check Ledger
                                </Button>
                                <CommitPayment
                                    doctype="Temporary Advance"
                                    docName={id || ""}
                                    projectName={data?.project_name || data?.project_code || ""}
                                    budgetHeads={budgetHeads}
                                    onCommitSuccess={() => loadData()}
                                    onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Document Metadata */}
                    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] p-5">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 block">Created On</label>
                                <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4 text-zinc-400" />
                                    {data.creation ? new Date(data.creation).toLocaleDateString('en-IN') : "-"}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 block">Modified On</label>
                                <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4 text-zinc-400" />
                                    {data.modified ? new Date(data.modified).toLocaleDateString('en-IN') : "-"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
