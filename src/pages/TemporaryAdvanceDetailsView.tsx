
import React, {
    useState,
    useImperativeHandle,
    forwardRef,
    useEffect
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    useFrappeGetDoc,
    useFrappePostCall,
    useFrappeGetCall,
    useFrappeAuth,
} from "frappe-react-sdk";
import { Textarea } from "@/components/ui/textarea";
import { AppSidebar } from "../components/RndSidebar";
import {
    ArrowLeftIcon,
    FileTextIcon,
    UsersIcon,
    ShieldIcon,
    MessageSquareIcon,
    UserIcon,
    BuildingIcon,
    CreditCardIcon,
    CheckCircleIcon,
    XCircleIcon,
    FileBadge,
    FolderOpenIcon,
    ExternalLinkIcon,
    ClockIcon,
    EditIcon,
    Wallet,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUserRoles } from "../components/UserRole";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { ProjectLedgerModal } from "../components/ProjectLedgerModal";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DepartmentName } from "@/components/DepartmentName";
import TemporaryAdvanceActionButtons from "@/components/TemporaryAdvanceActionButtons";
import { DeclarationFields } from "@/components/DeclarationFields";

// --- Interfaces ---
interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type: string;
}
interface ActivityStreamProps {
    doctype: string;
    docname: string;
}
interface ActivityStreamHandle {
    refetch: () => void;
}
interface TemporaryAdvanceDetailsProps {
    docName?: string;
    backUrl?: string;
    backLabel?: string;
}

// --- Helper Components from ProjectDetails ---

const FieldDisplay = ({
    label,
    value,
    icon: Icon,
    className
}: {
    label: string;
    value: any;
    icon?: any;
    className?: string;
}) => {
    if (!value && value !== 0 && value !== "No") return null;
    return (
        <div className={cn("py-3 px-1", className)}>
            <div className="flex items-center gap-2 mb-1.5">
                {Icon && <Icon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />}
                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-sans">
                    {label}
                </p>
            </div>
            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 pl-0.5 break-words">{value}</p>
        </div>
    );
};

const FrappeButton = ({
    children,
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <Button
        variant="outline"
        className={cn(
            "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200",
            className
        )}
        {...props}
    >
        {children}
    </Button>
);

// --- Activity Stream Component ---
const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(
    ({ doctype, docname }, ref) => {
        const [newComment, setNewComment] = useState("");
        const [isSubmitting, setIsSubmitting] = useState(false);
        const {
            data: activityData,
            mutate: refetchActivity,
            error: activityError,
            isLoading: isActivityLoading,
        } = useFrappeGetCall<{ message: ActivityItem[] }>(
            "rndopsapp.rndopsapp.api.get_project_activity",
            { doctype, docname },
            {
                enabled: !!docname,
                revalidateOnFocus: false,
                revalidateOnReconnect: false,
            }
        );
        const { call: addComment } = useFrappePostCall(
            "rndopsapp.rndopsapp.api.add_project_comment"
        );
        const handleCommentSubmit = async () => {
            if (!newComment.trim()) return;
            setIsSubmitting(true);
            try {
                await addComment({ doctype, docname, content: newComment.trim() });
                setNewComment("");
                await refetchActivity();
            } catch (err: any) {
                console.error("Failed to add comment:", err);
                alert("Error: Could not post comment.");
            } finally {
                setIsSubmitting(false);
            }
        };
        const handleKeyPress = (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleCommentSubmit();
            }
        };
        useImperativeHandle(ref, () => ({
            refetch() {
                refetchActivity();
            },
        }));
        return (
            <div className="space-y-6">
                <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <label
                        htmlFor="comment-textarea"
                        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3"
                    >
                        Add a comment
                    </label>
                    <Textarea
                        id="comment-textarea"
                        placeholder="Type here... (Ctrl+Enter to submit)"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={isSubmitting}
                        className="resize-none bg-white dark:bg-zinc-900 p-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                        rows={4}
                    />
                    <div className="flex items-center justify-between mt-4">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {newComment.length}/1000
                        </span>
                        <FrappeButton
                            onClick={handleCommentSubmit}
                            disabled={isSubmitting || !newComment.trim()}
                            className="bg-[#D97757] hover:bg-[#D97757] text-white border-transparent"
                        >
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </FrappeButton>
                    </div>
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {isActivityLoading && (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent"></div>
                        </div>
                    )}
                    {activityError && (
                        <div className="text-center p-6 text-red-700 border border-red-200 rounded-xl bg-red-50">
                            <p className="font-medium">Failed to load activities</p>
                        </div>
                    )}
                    {activityData?.message && activityData.message.length > 0
                        ? activityData.message.map((item, index) => (
                            <div
                                key={`${item.creation}-${index}`}
                                className="flex items-start gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm"
                            >
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-50 dark:bg-zinc-800 dark:bg-[#D97757]/20 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-semibold text-[#D97757] text-sm">
                                    {item.owner?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            {item.owner || "Unknown User"}
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                            <ClockIcon className="h-3 w-3" />
                                            {item.creation
                                                ? new Date(item.creation).toLocaleString()
                                                : "N/A"}
                                        </p>
                                    </div>
                                    <div
                                        className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm max-w-none leading-relaxed"
                                        dangerouslySetInnerHTML={{
                                            __html: item.content || "No content",
                                        }}
                                    />
                                </div>
                            </div>
                        ))
                        : !isActivityLoading && (
                            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900">
                                <MessageSquareIcon className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                                <p className="font-medium text-zinc-600 dark:text-zinc-400">No activity yet.</p>
                                <p className="text-sm mt-1">Be the first to add a comment.</p>
                            </div>
                        )}
                </div>
            </div>
        );
    }
);
ActivityStream.displayName = "ActivityStream";


// --- Main Component ---
const TemporaryAdvanceDetailsView: React.FC<TemporaryAdvanceDetailsProps> = ({
    docName: propDocName,
    backUrl = "/pending-task",
    backLabel = "Back to Pending Tasks",
}) => {
    const { name: paramName } = useParams<{ name: string }>();
    const docName = propDocName || paramName;
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview");

    // Fetch Data
    const { data, error, isLoading } = useFrappeGetDoc(
        "Temporary Advance",
        docName ?? "",
        { enabled: !!docName, cacheTime: 0 }
    );

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
            reference_name: docName,
        },
        docName ? undefined : null
    );

    const [resolvedAccountHead, setResolvedAccountHead] = useState<string>('');
    const [resolvedProjectTitle, setResolvedProjectTitle] = useState<string>('');

    // --- Auth & Roles ---
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isRnDStaff = roles.some(r =>
        // r === "RnD Staff" || r === "R&D Staff" || r === "Research and Development Staff" || r === "System Manager" || r === "staff, RnD" || r === "Hos, RnD (Head of Section, RnD)"
        r === "RnD Staff" || r === "R&D Staff" || r === "Research and Development Staff" || r === "System Manager" || r === "staff, RnD"
    );

    // --- Budget & Payment State ---
    const [commitAmount, setCommitAmount] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");
    const [commitHead, setCommitHead] = useState("");
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);

    // --- Commit/Payment API Hooks ---
    const { call: submitCommit, loading: isCommitting } = useFrappePostCall("rndopsapp.rndopsapp.commitPayment.submit_commit_data");
    const { call: submitPayment, loading: isPaying } = useFrappePostCall("rndopsapp.rndopsapp.commitPayment.submit_payment_data");

    // --- Fetch Budget Heads for Ledger ---
    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch('/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0');
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

    // --- Load Project Budget Data ---
    const projectTitle = data?.project_code || "";
    const { budgetData, heads: budgetHeads, actualBalance } = useProjectBudget(projectTitle);

    // Find existing commitment for this document
    const linkedCommitment = budgetData.find(e => e.ref === (docName || "") && e.type === 'commitment');
    const isCommitted = !!linkedCommitment;

    // Auto-select head from document or first available
    useEffect(() => {
        if (data?.account_head) {
            setCommitHead(data.account_head);
        } else if (budgetHeads.length > 0 && !commitHead) {
            setCommitHead(budgetHeads[0]);
        }
    }, [budgetHeads, data]);

    // Sync payment amount with linked commitment
    useEffect(() => {
        if (linkedCommitment) {
            setCommitHead(linkedCommitment.head || "");
            if (!paymentAmount) setPaymentAmount(String(linkedCommitment.committed));
        }
    }, [linkedCommitment]);

    // --- Commit Handler ---
    const handleCommit = async () => {
        if (!commitAmount || !commitHead || !docName || !data) {
            alert("Please select a budget head and enter an amount.");
            return;
        }
        try {
            await submitCommit({
                doctype: "Temporary Advance",
                frapAppId: docName,
                name: docName,
                project_name: data.project_code,
                commit_amount: parseFloat(commitAmount),
                budget_head: commitHead,
                bmr: ""
            });
            alert("Commitment submitted successfully!");
            setCommitAmount("");
            window.location.reload();
        } catch (error: any) {
            console.error("Commit failed:", error);
            alert(`Commitment failed: ${error.message || "Unknown error"}`);
        }
    };

    // --- Payment Handler ---
    const handlePayment = async () => {
        if (!paymentAmount || !commitHead || !docName || !data) {
            alert("Please select a budget head and enter an amount.");
            return;
        }
        try {
            await submitPayment({
                doctype: "Temporary Advance",
                name: docName,
                project_name: data.project_code,
                payment_amount: parseFloat(paymentAmount),
                budget_head: commitHead,
                bmr: "",
                frapAppId: docName,
                moduleName: "Temporary Advance"
            });
            alert("Payment recorded successfully!");
            setPaymentAmount("");
            window.location.reload();
        } catch (error: any) {
            console.error("Payment failed:", error);
            alert(`Payment failed: ${error.message || "Unknown error"}`);
        }
    };

    // --- Comment API ---
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

    const handleAddComment = async (commentText: string): Promise<boolean> => {
        if (!commentText.trim() || !docName) return false;
        try {
            await addComment({
                reference_doctype: "Temporary Advance",
                reference_name: docName,
                content: commentText,
                comment_type: "Comment"
            });
            return true;
        } catch (error) {
            console.error("Error adding comment:", error);
            return false;
        }
    };

    // Resolve ID lookups
    useEffect(() => {
        if (!data) return;

        // Account Head
        if (data.account_head) {
            fetch(`/api/v2/document/Budget%20Head/${data.account_head}`)
                .then(r => r.json())
                .then(res => {
                    if (res.data) setResolvedAccountHead(res.data.budget_head || res.data.name);
                })
                .catch(err => console.error("Failed to resolve budget head", err));
        }

        // Project Title
        if (data.project_code) {
            fetch(`/api/v2/document/Project%20Proposal/${data.project_code}`)
                .then(r => r.json())
                .then(res => {
                    if (res.data) setResolvedProjectTitle(res.data.project_title || res.data.name);
                })
                .catch(err => console.error("Failed to resolve project", err));
        }
    }, [data]);


    if (!docName) {
        return (
            <div className="flex items-center justify-center p-4 min-h-screen">
                <div className="text-center p-8 max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm">
                    <FileTextIcon className="h-16 w-16 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">No Document Selected</h2>
                    <FrappeButton onClick={() => navigate(backUrl)} className="mt-4">{backLabel}</FrappeButton>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent mx-auto mb-4"></div>
                    <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center p-4 min-h-screen">
                <div className="text-center p-8 max-w-md w-full bg-red-50 border border-red-200 rounded-xl">
                    <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Document</h2>
                    <p className="text-[#D97757] mb-6 text-sm">{error?.message || "Document not found"}</p>
                    <FrappeButton onClick={() => navigate(backUrl)}>{backLabel}</FrappeButton>
                </div>
            </div>
        );
    }

    // Define tabs
    const tabs = [
        { id: "overview", label: "Overview", icon: FileTextIcon },
        { id: "applicant", label: "Applicant Details", icon: UserIcon },
        { id: "bank", label: "Bank Details", icon: CreditCardIcon },
        { id: "files", label: "Files", icon: FolderOpenIcon },
        { id: "activity", label: "Activity Log", icon: MessageSquareIcon },
    ];

    return (
        <div className="flex bg-claude-bg dark:bg-zinc-900 min-h-screen font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-200">

            <div className="flex-1 p-6 md:p-8 lg:p-12 w-full">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                        <button onClick={() => navigate(backUrl)} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1">
                            <ArrowLeftIcon className="h-4 w-4" /> {backLabel}
                        </button>
                        <span>/</span>
                        <span className="text-zinc-900 dark:text-zinc-100 font-medium truncate">{docName}</span>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl md:text-4xl font-serif font-medium text-zinc-900 dark:text-zinc-50 tracking-tight">
                                    Temporary Advance
                                </h1>
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border",
                                    data.workflow_state === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        data.workflow_state === "Rejected" ? "bg-red-50 text-red-700 border-red-200" :
                                            "bg-amber-50 text-amber-700 border-amber-200"
                                )}>
                                    {data.workflow_state}
                                </span>
                            </div>
                            <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-2xl">
                                Advance request for project <span className="font-medium text-zinc-700 dark:text-zinc-300">{resolvedProjectTitle || data.project_code}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {data.workflow_state === 'Draft' && (
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/temporary-advance?edit=${docName}`)}
                                    className="flex items-center gap-2"
                                >
                                    <EditIcon className="h-4 w-4" /> Edit
                                </Button>
                            )}
                            {!cancellationStatus?.message?.has_pending && (
                                <TemporaryAdvanceActionButtons
                                    docname={docName}
                                    onActionComplete={() => window.location.reload()}
                                    onAddComment={handleAddComment}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Warning Banner if there's a pending cancellation */}
                {cancellationStatus?.message?.has_pending && (
                    <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 flex items-center gap-3 shadow-sm">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                        <div className="text-sm font-medium">
                            This application has a pending cancellation request. No further workflow actions can be performed on it.
                        </div>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 mb-8 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative whitespace-nowrap",
                                    isActive
                                        ? "text-[#D97757] dark:text-[#D97757]"
                                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-t-lg"
                                )}
                            >
                                <Icon className={cn("h-4 w-4", isActive ? "text-[#D97757]" : "text-zinc-400")} />
                                {tab.label}
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D97757]" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area - Grid layout with sidebar for staff actions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <>
                                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                                        <div className="flex items-center gap-2">
                                            <CreditCardIcon className="h-3.5 w-3.5 text-[#D97757]" />
                                            <CardTitle className="text-xs font-semibold font-serif text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                                                Advance Details
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                        <FieldDisplay label="Project Code" value={data.project_code} />
                                        <FieldDisplay label="Project Title" value={resolvedProjectTitle} />
                                        <FieldDisplay label="Amount" value={`₹ ${data.amount?.toLocaleString('en-IN')}`} className="text-lg font-semibold text-[#D97757]" />
                                        <FieldDisplay label="Amount (Words)" value={data.amount_in_words} className="capitalize" />
                                        <FieldDisplay label="Account Head" value={resolvedAccountHead || data.account_head} />
                                        <FieldDisplay label="Applying For" value={data.applying_for_select} />
                                        <FieldDisplay label="Requested By" value={data.owner} />
                                        <FieldDisplay label="Created On" value={data.creation ? new Date(data.creation).toLocaleDateString() : '-'} />
                                    </CardContent>
                                </Card>

                                <DeclarationFields doctype="Temporary Advance" />

                                {(data.justification || data.reason || data.purpose || data.comments) && (
                                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                                        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                                            <div className="flex items-center gap-2">
                                                <FileTextIcon className="h-3.5 w-3.5 text-[#D97757]" />
                                                <CardTitle className="text-xs font-semibold font-serif text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                                                    Description
                                                </CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-4">
                                            {(data.justification || data.reason || data.purpose) && (
                                                <div>
                                                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1">Justification / Purpose</p>
                                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{data.justification || data.reason || data.purpose}</p>
                                                </div>
                                            )}
                                            {data.comments && (
                                                <div>
                                                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1">Comments</p>
                                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{data.comments}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        )}

                        {/* APPLICANT TAB */}
                        {activeTab === 'applicant' && (
                            <div className="space-y-6">
                                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                                        <div className="flex items-center gap-2">
                                            <UserIcon className="h-3.5 w-3.5 text-[#D97757]" />
                                            <CardTitle className="text-xs font-semibold font-serif text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                                                Applicant Details
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FieldDisplay label="Webmail" value={data.applicant_webmail} />
                                        <div className="py-3 px-1">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <BuildingIcon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                                                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-sans">Department</p>
                                            </div>
                                            <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 pl-0.5">
                                                {data.applicant_department ? <DepartmentName name={data.applicant_department} /> : '-'}
                                            </div>
                                        </div>
                                        <FieldDisplay label="Designation" value={data.applicant_designation} />
                                        <FieldDisplay label="Employee Category" value={data.applicant_category} />
                                    </CardContent>
                                </Card>

                                {(data.advance_for_id || data.advance_for_department) && (
                                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                                        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                                            <div className="flex items-center gap-2">
                                                <UsersIcon className="h-3.5 w-3.5 text-[#D97757]" />
                                                <CardTitle className="text-xs font-semibold font-serif text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                                                    Advance For (Beneficiary)
                                                </CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FieldDisplay label="Beneficiary ID" value={data.advance_for_id} />
                                            <div className="py-3 px-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <BuildingIcon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                                                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-sans">Department</p>
                                                </div>
                                                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 pl-0.5">
                                                    {data.advance_for_department ? <DepartmentName name={data.advance_for_department} /> : '-'}
                                                </div>
                                            </div>
                                            <FieldDisplay label="Designation" value={data.advance_for_designation} />
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* BANK TAB */}
                        {activeTab === 'bank' && (
                            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                                <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                                    <div className="flex items-center gap-2">
                                        <BuildingIcon className="h-3.5 w-3.5 text-[#D97757]" />
                                        <CardTitle className="text-xs font-semibold font-serif text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                                            Bank Details
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FieldDisplay label="Bank Name" value={data.bank_name} />
                                    <FieldDisplay label="Account Holder" value={data.account} />
                                    <FieldDisplay label="Account Number" value={data.bank_account_number} className="font-mono text-xs" />
                                    <FieldDisplay label="IFSC Code" value={data.ifsc_code} className="font-mono text-xs" />
                                </CardContent>
                            </Card>
                        )}

                        {/* FILES TAB */}
                        {activeTab === 'files' && (
                            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                                <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                                    <div className="flex items-center gap-2">
                                        <FolderOpenIcon className="h-3.5 w-3.5 text-[#D97757]" />
                                        <CardTitle className="text-xs font-semibold font-serif text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                                            Attachments
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {data.documents && Array.isArray(data.documents) && data.documents.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-3">
                                            {data.documents.map((doc: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                                    <div className="flex items-center gap-3">
                                                        <FileBadge className="h-4 w-4 text-zinc-400" />
                                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{doc.file_name || doc.name || `Document ${idx + 1}`}</span>
                                                    </div>
                                                    {doc.file_url && (
                                                        <a
                                                            href={doc.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-xs font-medium text-[#D97757] hover:underline"
                                                        >
                                                            View <ExternalLinkIcon className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm italic">No files attached.</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* ACTIVITY TAB */}
                        {activeTab === 'activity' && (
                            <div className="space-y-6">
                                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                                        <div className="flex items-center gap-2">
                                            <MessageSquareIcon className="h-3.5 w-3.5 text-[#D97757]" />
                                            <CardTitle className="text-xs font-semibold font-serif text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                                                Activity History
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <ActivityStream doctype="Temporary Advance" docname={docName} />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                    </div>

                    {/* Sidebar - Staff Actions */}
                    <div className="space-y-6">
                        {/* Staff Action Section - only visible to RnD Staff */}
                        {isRnDStaff && (
                            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm border-l-4 border-l-blue-500">
                                <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="h-3.5 w-3.5 text-blue-600" />
                                        <CardTitle className="text-xs font-semibold font-serif text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                                            Commitment & Payment (Staff)
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-6">
                                    {/* Check Ledger Button */}
                                    <button
                                        onClick={() => setIsLedgerOpen(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    >
                                        <Wallet className="w-4 h-4" />
                                        Check Ledger
                                    </button>

                                    {/* Commitment Section */}
                                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-3 flex items-center gap-2">
                                            1. Commitment
                                            {isCommitted && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Budget Head</label>
                                                <select
                                                    value={commitHead}
                                                    onChange={(e) => setCommitHead(e.target.value)}
                                                    className="w-full p-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900"
                                                    disabled={isCommitted}
                                                >
                                                    <option value="">Select Head</option>
                                                    {budgetHeads.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                                {!isCommitted && (
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                        Available: <span className="font-medium text-[#D97757]">₹ {actualBalance.toLocaleString('en-IN')}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Amount</label>
                                                <input
                                                    type="number"
                                                    value={commitAmount}
                                                    onChange={(e) => setCommitAmount(e.target.value)}
                                                    className="w-full p-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900"
                                                    placeholder="Enter amount"
                                                    disabled={isCommitted}
                                                />
                                            </div>
                                            <button
                                                onClick={handleCommit}
                                                disabled={isCommitting || isCommitted || !commitAmount}
                                                className={cn(
                                                    "w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                                    "bg-blue-600 text-white hover:bg-blue-700"
                                                )}
                                            >
                                                {isCommitting ? "Committing..." : isCommitted ? "Committed" : "Commit Funds"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Payment Section */}
                                    {/* <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-3">2. Payment Processing</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Budget Head</label>
                                                <input
                                                    type="text"
                                                    value={commitHead}
                                                    disabled
                                                    className="w-full p-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                                />
                                            </div>
                                            {isCommitted && linkedCommitment && (
                                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 flex flex-col gap-1">
                                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Linked Commitment</p>
                                                    <div className="flex justify-between items-end">
                                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{linkedCommitment.head}</p>
                                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">₹ {linkedCommitment.committed.toLocaleString('en-IN')}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Payment Amount</label>
                                                <input
                                                    type="number"
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                                    className="w-full p-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900"
                                                    placeholder="Enter payment amount"
                                                    max={linkedCommitment?.committed}
                                                />
                                                {isCommitted && linkedCommitment && (
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                        Max: ₹{linkedCommitment.committed.toLocaleString('en-IN')}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={handlePayment}
                                                disabled={isPaying || !isCommitted || !paymentAmount || parseFloat(paymentAmount) > (linkedCommitment?.committed || 0)}
                                                className={cn(
                                                    "w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                                    "bg-emerald-600 text-white hover:bg-emerald-700"
                                                )}
                                            >
                                                {isPaying ? "Processing..." : "Record Payment"}
                                            </button>
                                            {!isCommitted && (
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center italic">
                                                    Please make a commitment first before recording payment.
                                                </p>
                                            )}
                                        </div>
                                    </div> */}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Ledger Modal */}
                <ProjectLedgerModal
                    isOpen={isLedgerOpen}
                    onClose={() => setIsLedgerOpen(false)}
                    projectName={data.project_code || ''}
                    budgetHeadList={budgetHeadList}
                />
            </div>
        </div>
    );
};

export default TemporaryAdvanceDetailsView;
