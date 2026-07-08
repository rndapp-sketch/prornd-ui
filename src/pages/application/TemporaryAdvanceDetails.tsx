import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../../components/RndSidebar";
import { useFrappePostCall, useFrappeGetCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { CalendarIcon, UserIcon, EditIcon, Wallet as WalletIcon, AlertTriangle, ArrowLeftIcon, FileTextIcon, CreditCardIcon, FolderOpenIcon } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const TemporaryAdvanceDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<TemporaryAdvanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
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

    const { data: cancellationStatus } = useFrappeGetCall<{ message: { has_pending: boolean; has_cancellation: boolean; cancellation_requests: any[] } }>(
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

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FileTextIcon },
        { id: 'applicant', label: 'Applicant Details', icon: UserIcon },
        { id: 'bank', label: 'Bank Details', icon: CreditCardIcon },
        { id: 'files', label: 'Attachments', icon: FolderOpenIcon },
    ];

    const getStatusColor = (state: string) => {
        if (state === 'Approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (state === 'Rejected') return 'bg-red-50 text-red-700 border-red-200';
        return 'bg-amber-50 text-amber-700 border-amber-200';
    };

    return (
        <div className="bg-zinc-50 dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <div className="transition-all duration-300 p-6 md:p-8 lg:p-12 max-w-7xl mx-auto">
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
                                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border", getStatusColor(data.workflow_state))}>
                                    {data.workflow_state}
                                </span>
                            </div>
                            <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                                Advance request for project <span className="font-medium text-zinc-700 dark:text-zinc-300">{projectTitle || data.project_code}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
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

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 mb-8 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative",
                                    isActive
                                        ? "text-[#D97757] dark:text-[#D97757]"
                                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D97757]" />}
                            </button>
                        );
                    })}
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <>
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <CreditCardIcon className="h-4 w-4 text-[#D97757]" />
                                            <CardTitle className="text-xs font-semibold uppercase tracking-wide">Advance Details</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Amount</label>
                                            <div className="text-2xl font-bold text-[#D97757]">
                                                ₹ {(data.amount || data.amount_applied || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Amount in Words</label>
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                                                {data.amount_in_words || (data.amount || data.amount_applied ? toWords.convert(data.amount || data.amount_applied) : '-')}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Account Head</label>
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{resolvedAccountHead || data.account_head || "-"}</div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Requested By</label>
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{data.owner}</div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Project Code</label>
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{data.project_code || "-"}</div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Applying For</label>
                                            <div className="font-medium text-zinc-900 dark:text-zinc-100">{data.appplying_for_select || "-"}</div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Declarations & Justification */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-xs font-semibold uppercase tracking-wide">Declarations</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <DeclarationFields doctype="Temporary Advance" />
                                    </CardContent>
                                </Card>

                                {(data.justification || data.reason || data.purpose) && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-xs font-semibold uppercase tracking-wide">Justification</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                                                {data.justification || data.reason || data.purpose}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        )}

                        {/* Applicant Tab */}
                        {activeTab === 'applicant' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xs font-semibold uppercase tracking-wide">Applicant Information</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Email</label>
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                            <UserIcon className="w-4 h-4 text-zinc-400" />
                                            {data.applicant_webmail || "-"}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Department</label>
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                            {data.applicant_department ? <DepartmentName name={data.applicant_department} /> : "-"}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Designation</label>
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{data.applicant_designation || "-"}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Bank Tab */}
                        {activeTab === 'bank' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xs font-semibold uppercase tracking-wide">Bank Details</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Bank Name</label>
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{data.bank_name || "-"}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Account Holder</label>
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{data.account || "-"}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Account Number</label>
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100 font-mono">{data.bank_account_number || "-"}</div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">IFSC Code</label>
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100 font-mono">{data.ifsc_code || "-"}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Files Tab */}
                        {activeTab === 'files' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xs font-semibold uppercase tracking-wide">Attachments</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {data.documents && Array.isArray(data.documents) && data.documents.length > 0 ? (
                                            data.documents.map((doc: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                                                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{doc.file_name || doc.name || `Document ${idx + 1}`}</span>
                                                    {doc.file_url && (
                                                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[#D97757] text-sm font-medium hover:underline">
                                                            View
                                                        </a>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">No attachments</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar - Staff Actions & Metadata */}
                    <div className="space-y-6">
                        {isRnDStaff && (
                            <Card className="border-l-4 border-l-blue-500">
                                <CardHeader>
                                    <CardTitle className="text-xs font-semibold uppercase tracking-wide">Staff Processing</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
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
                                </CardContent>
                            </Card>
                        )}

                        {/* Metadata */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xs font-semibold uppercase tracking-wide">Document Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Created</label>
                                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4 text-zinc-400" />
                                        {data.creation ? new Date(data.creation).toLocaleDateString('en-IN') : "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Modified</label>
                                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4 text-zinc-400" />
                                        {data.modified ? new Date(data.modified).toLocaleDateString('en-IN') : "-"}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
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
