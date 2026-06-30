/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFrappePostCall, useFrappeGetCall, useFrappeAuth } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
    EditIcon, Send, ChevronRight, CheckCircle2, XCircle,
    Clock, CalendarIcon, ActivityIcon, MessageSquare,
    UserIcon, ShoppingCartIcon, UsersIcon, FileTextIcon,
    TruckIcon, FileSearch2,
} from "lucide-react";
import { AppSidebar } from "@/components/RndSidebar";
import { PageHeader } from "@/components/common/PageHeader";
import { GlobalLoader } from "@/components/ui/global-loader";
import {
    DynamicFormRenderer,
    type FormField,
    type LinkOption,
} from "@/components/forms/DynamicFormRenderer";
import { isFieldVisible } from "@/utils/evalExpression";
import { indentGeneralFormAPI } from "@/services/apiService";
import { BudgetHeadName } from "@/components/BudgetHeadName";
import { DepartmentName } from "@/components/DepartmentName";
import { useUserRoles } from "@/components/UserRole";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { CommitPayment } from "@/components/CommitPayment";
import { ActivityLog } from "@/components/ActivityLog";

// ---------------------------------------------------------------------------
// Workflow pipeline
// ---------------------------------------------------------------------------
// Happy-path stages (matches "Indent General Workflow" in Frappe)
const WORKFLOW_STAGES = [
    "Draft",
    "Pending Staff Approval",
    "Pending HoS Approval",
    "Pending Dean Approval",
    "Approved",
];

type StageStatus = "completed" | "in-progress" | "pending" | "rejected";

function buildTimeline(currentState: string): { label: string; status: StageStatus }[] {
    const isApproved = currentState === "Approved";
    const isRejected = currentState === "Rejected";

    // For rejected state, replace the terminal "Approved" node with "Rejected"
    const stages = isRejected
        ? [...WORKFLOW_STAGES.slice(0, -1), "Rejected"]
        : WORKFLOW_STAGES;

    let currentIdx = stages.findIndex((s) => s === currentState);
    if (currentIdx === -1) currentIdx = 1; // fallback: treat as in-progress after Draft

    return stages.map((stage, idx) => {
        if (isApproved) return { label: stage, status: "completed" };
        if (isRejected) {
            // Terminal rejected node
            if (idx === stages.length - 1) return { label: stage, status: "rejected" };
            // All prior stages pending (rejection stage not tracked without activity log)
            return { label: stage, status: "pending" };
        }
        if (idx < currentIdx) return { label: stage, status: "completed" };
        if (idx === currentIdx) return { label: stage, status: "in-progress" };
        return { label: stage, status: "pending" };
    });
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
const GroupCard = ({
    icon: Icon,
    label,
    children,
}: {
    icon: React.ElementType;
    label: string;
    children: React.ReactNode;
}) => (
    <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div className="flex items-center gap-3 border-b border-[#E4E4E7] bg-[#FAFAF9] px-5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB] dark:bg-blue-950/30 dark:text-blue-300">
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB] dark:text-blue-300">
                    Section
                </p>
                <h3 className="truncate text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                    {label}
                </h3>
            </div>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
    </div>
);

const InfoRow = ({
    label,
    value,
    isDept,
    isBudgetHead,
}: {
    label: string;
    value: any;
    isDept?: boolean;
    isBudgetHead?: boolean;
}) => (
    <div className="min-w-0 rounded-xl border border-[#E4E4E7] bg-white px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div className="mb-2 inline-flex max-w-full items-center rounded-md bg-[#FAFAF9] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#18181B] dark:text-blue-300 dark:ring-[#3F3F46]">
            <span className="truncate">{label}</span>
        </div>
        <p className="min-h-[1.5rem] break-words text-[13px] font-semibold leading-relaxed text-[#3F3F46] dark:text-[#E4E4E7]">
            {isDept && value ? (
                <DepartmentName name={value} />
            ) : isBudgetHead && value ? (
                <BudgetHeadName id={value} />
            ) : (
                value || <span className="text-[#A1A1AA]">—</span>
            )}
        </p>
    </div>
);

const StateBadge = ({ state }: { state: string }) => {
    const colors: Record<string, string> = {
        Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        Rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        Draft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    };
    const isPending = state?.startsWith("Pending");
    const cls =
        colors[state] ??
        (isPending
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-zinc-100 text-zinc-600");
    return (
        <span className={cn("px-3 py-1 text-xs font-bold rounded-full", cls)}>
            {state || "Draft"}
        </span>
    );
};

// ---------------------------------------------------------------------------
// Workflow Timeline
// ---------------------------------------------------------------------------
const WorkflowTimeline: React.FC<{ currentState: string }> = ({ currentState }) => {
    const stages = buildTimeline(currentState);

    const icon = (status: StageStatus) => {
        if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-white" />;
        if (status === "in-progress") return <Clock className="w-4 h-4 text-white" />;
        if (status === "rejected") return <XCircle className="w-4 h-4 text-white" />;
        return <span className="w-2 h-2 rounded-full bg-white/60" />;
    };

    const bg = (status: StageStatus) => {
        if (status === "completed") return "bg-emerald-500";
        if (status === "in-progress") return "bg-[#D97757]";
        if (status === "rejected") return "bg-red-500";
        return "bg-zinc-300 dark:bg-zinc-600";
    };

    const connector = (status: StageStatus) =>
        status === "completed" ? "bg-emerald-400" : "bg-zinc-200 dark:bg-zinc-700";

    return (
        <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
            <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-[#2563EB] dark:bg-blue-950/30 dark:text-blue-300">
                    <ActivityIcon className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#A1A1AA]">
                    Workflow Progress
                </h3>
                <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46]" />
            </div>
            <div className="flex items-start overflow-x-auto pb-1">
                {stages.map((stage, idx) => (
                    <React.Fragment key={stage.label}>
                        <div className="flex flex-col items-center min-w-[90px] max-w-[110px]">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shadow-sm flex-shrink-0",
                                    bg(stage.status),
                                )}
                            >
                                {icon(stage.status)}
                            </div>
                            <p
                                className={cn(
                                    "mt-2 text-center text-xs leading-tight px-1",
                                    stage.status === "in-progress" && "font-bold text-[#D97757]",
                                    stage.status === "completed" &&
                                    "text-emerald-600 dark:text-emerald-400 font-medium",
                                    stage.status === "pending" && "text-zinc-400 dark:text-zinc-500",
                                    stage.status === "rejected" && "text-red-500 font-bold",
                                )}
                            >
                                {stage.label}
                            </p>
                            {stage.status === "in-progress" && (
                                <span className="mt-1 text-[10px] font-bold text-white bg-[#D97757] px-2 py-0.5 rounded-full whitespace-nowrap">
                                    Pending Here
                                </span>
                            )}
                            {currentState === "Approved" && stage.label === "Approved" && (
                                <span className="mt-1 text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    Approved
                                </span>
                            )}
                        </div>
                        {idx < stages.length - 1 && (
                            <div className="flex-1 flex items-center pt-4 min-w-[20px]">
                                <div className={cn("h-1 w-full rounded", connector(stage.status))} />
                                <ChevronRight className="w-3 h-3 text-zinc-400 flex-shrink-0 -ml-1" />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
            {currentState && currentState !== "Draft" && currentState !== "Approved" && currentState !== "Rejected" && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Currently pending at:{" "}
                        <span className="font-semibold text-[#D97757]">{currentState}</span>
                    </p>
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Activity Stream
// ---------------------------------------------------------------------------
interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type: string;
}

const ActivityStream: React.FC<{ docname: string; onRefresh?: () => void }> = ({
    docname,
    onRefresh,
}) => {
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        data: activityData,
        mutate: refetchActivity,
        isLoading,
        error,
    } = useFrappeGetCall<{ message: ActivityItem[] }>(
        "rndopsapp.rndopsapp.api.get_project_activity",
        { doctype: "Indent General Form", docname },
        docname ? undefined : null,
    );

    const { call: addComment } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );

    const handleSubmit = async () => {
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            await addComment({
                doctype: "Indent General Form",
                docname,
                content: newComment.trim(),
            });
            setNewComment("");
            await refetchActivity();
            onRefresh?.();
        } catch {
            alert("Error: Could not post comment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const items = activityData?.message || [];

    return (
        <div className="space-y-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Add a comment
                </label>
                <textarea
                    placeholder="Type here... (Ctrl+Enter to submit)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
                    }}
                    disabled={isSubmitting}
                    rows={3}
                    className="w-full resize-none bg-white dark:bg-zinc-900 p-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] text-sm"
                />
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-zinc-400">{newComment.length}/1000</span>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !newComment.trim()}
                        className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#D97757] text-white hover:bg-[#c66a4e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isSubmitting ? "Posting..." : "Post Comment"}
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {isLoading && (
                    <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#D97757] border-t-transparent" />
                    </div>
                )}
                {error && (
                    <div className="text-center p-3 text-red-700 border border-red-200 rounded-lg bg-red-50 text-xs">
                        Failed to load activity
                    </div>
                )}
                {items.length > 0
                    ? items.map((item, idx) => (
                        <div
                            key={`${item.creation}-${idx}`}
                            className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                        >
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-semibold text-[#D97757] text-xs">
                                {item.owner?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                        {item.owner || "Unknown"}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 flex-shrink-0">
                                        <Clock className="h-3 w-3" />
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
                    : !isLoading && (
                        <div className="text-center py-6 text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900">
                            <MessageSquare className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                            <p className="text-sm font-medium">No activity yet.</p>
                            <p className="text-xs mt-1">Be the first to add a comment.</p>
                        </div>
                    )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const IndentGeneralFormDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [projectTitle, setProjectTitle] = useState("");
    const [headerActions, setHeaderActions] = useState<string[]>([]);
    const [isActing, setIsActing] = useState(false);

    // Commit Payment state
    const [commitHead, setCommitHead] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");
    const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isStaffRnD = roles.some((r) =>
        ["staff, RnD", "Staff RnD", "RnD Staff", "System Manager"].includes(r),
    );

    const { call: fetchFields } = useFrappePostCall<{ message: any }>(indentGeneralFormAPI.getFields);
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>("frappe.client.get_value");
    const { call: getActionsCall } = useFrappePostCall<{ message: any }>(indentGeneralFormAPI.getWorkflowActions);
    const { call: performActionCall } = useFrappePostCall<{ message: any }>(indentGeneralFormAPI.performAction);
    // submitCommit moved to CommitPayment component
    const { call: submitPayment, loading: isPaying } = useFrappePostCall<{ message: any }>(
        "rndopsapp.rndopsapp.commitPayment.submit_payment_data",
    );

    const projectName = formData.igf_project_title || "";
    const { budgetData, heads: budgetHeads, actualBalance } = useProjectBudget(projectName);

    const linkedCommitment = budgetData.find(
        (e: any) => (e.ref === (id || "") || e.frapAppId === (id || "")) && e.type === "commitment",
    );
    const isCommitted = !!linkedCommitment;

    useEffect(() => {
        if (budgetHeads.length > 0 && !commitHead) setCommitHead(budgetHeads[0]);
    }, [budgetHeads]);

    useEffect(() => {
        if (linkedCommitment) {
            setCommitHead(linkedCommitment.head || "");
            if (!paymentAmount) setPaymentAmount(String(linkedCommitment.committed));
        }
    }, [linkedCommitment]);

    const handleRefresh = useCallback(() => {
        setLoading(true);
        setRefreshKey((k) => k + 1);
    }, []);

    // handleCommit moved to CommitPayment component

    const handlePayment = async () => {
        if (!paymentAmount || !commitHead || !id) {
            alert("Please select a budget head and enter an amount.");
            return;
        }
        try {
            await submitPayment({
                doctype: "Indent General Form",
                name: id,
                project_name: projectName,
                payment_amount: parseFloat(paymentAmount),
                budget_head: commitHead,
                bmr: "",
            });
            alert("Payment recorded successfully!");
            setPaymentAmount("");
            handleRefresh();
        } catch (error: any) {
            alert(`Payment failed: ${error.message || "Unknown error"}`);
        }
    };

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            setLoading(true);
            try {
                const [res, budgetHeadRes, userRes] = await Promise.all([
                    fetchFields({ doc_name: id }),
                    fetch(
                        '/api/resource/Budget%20Head?fields=["name","budget_head"]&order_by=budget_head asc&limit_page_length=0',
                        { credentials: "include", headers: { Accept: "application/json" } },
                    )
                        .then((r) => r.json())
                        .catch(() => ({ data: [] })),
                    fetch(
                        '/api/resource/User?fields=["name","full_name"]&filters=[["enabled","=",1]]&limit_page_length=0',
                        { credentials: "include", headers: { Accept: "application/json" } },
                    )
                        .then((r) => r.json())
                        .catch(() => ({ data: [] })),
                ]);

                if (!res?.message) return;

                const { fields: apiFields, link_options, prefill_data } = res.message;

                const HIDDEN = ["section_break_bu6z", "amended_from"];
                const filtered = (apiFields || []).filter(
                    (f: FormField) => !HIDDEN.includes(f.fieldname),
                );
                setFields(filtered);

                const budgetHeadOptions: LinkOption[] = (budgetHeadRes?.data || []).map(
                    (h: any) => ({ value: h.name, label: h.budget_head || h.name }),
                );

                const userOptions: LinkOption[] = (userRes?.data || [])
                    .filter((u: any) => u.name !== "Administrator" && u.name !== "Guest")
                    .map((u: any) => ({ value: u.name, label: u.full_name || u.name }));

                const merged: Record<string, LinkOption[]> = {
                    ...(link_options || {}),
                    igf_account_head: budgetHeadOptions,
                    budget_head: budgetHeadOptions,
                    "Budget Head": budgetHeadOptions,
                    User: userOptions,
                    webmail_id: userOptions,
                };

                // Fetch project title label for display
                if (prefill_data?.igf_project_title) {
                    try {
                        const ptRes = await fetchFrappeValue({
                            doctype: "Project Registration",
                            filters: { name: prefill_data.igf_project_title },
                            fieldname: ["project_title", "implementation_department"],
                        });
                        const title = ptRes?.message?.project_title;
                        if (title) {
                            setProjectTitle(title);
                            merged.igf_project_title = [
                                ...(merged.igf_project_title || []),
                                { value: prefill_data.igf_project_title, label: title },
                            ];
                        }
                    } catch { /* ignore */ }
                }

                setLinkOptions(merged);
                setFormData(prefill_data || {});

                // Fetch available workflow actions
                try {
                    const actRes = await getActionsCall({ docname: id });
                    const msg = actRes?.message;
                    setHeaderActions(Array.isArray(msg?.actions) ? msg.actions : []);
                } catch { setHeaderActions([]); }
            } catch (e) {
                console.error("Failed to load IGF details:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, refreshKey]);

    const handleAction = async (action: string) => {
        if (!id || !window.confirm(`Perform action "${action}"?`)) return;
        setIsActing(true);
        try {
            await performActionCall({ docname: id, action });
            handleRefresh();
        } catch (err: any) {
            alert(`Action failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsActing(false);
        }
    };

    // Read-only field overrides (same as form)
    const effectiveFields = fields.map((f) => {
        if (
            f.fieldname === "igf_department_centre_section" ||
            f.fieldname === "igf_employee_code"
        ) {
            return { ...f, read_only: 1 };
        }
        if (f.fieldname === "igf_account_head" || f.fieldname === "budget_head") {
            return { ...f, fieldtype: "Link", options: "Budget Head" };
        }
        if (f.fieldname === "igf_number_of_bids" && formData.igf_tender_type === "Open Tender") {
            return { ...f, read_only: 1 };
        }
        if (f.fieldname === "igf_upload_vendor_list" && formData.igf_tender_type !== "Limited Tender") {
            return { ...f, hidden: 1 } as any;
        }
        return f;
    });

    const noOp = () => { };
    const rendererProps = {
        formData,
        linkOptions,
        onChange: noOp,
        onFileChange: noOp,
        onTableRowChange: noOp,
        onTableFileChange: noOp,
        onAddTableRow: noOp,
        onDeleteTableRow: noOp,
        readOnly: true,
        hideSectionHeaders: true,
        hideTableLabels: true,
    };

    const workflowState = formData.workflow_state || "Draft";
    const isDraft = workflowState === "Draft" || !formData.workflow_state;

    if (loading) return <GlobalLoader isLoading={true} />;

    const fieldsFor = (names: string[], groupLabel?: string) =>
        effectiveFields.filter((f) => {
            if (!names.includes(f.fieldname)) return false;
            if (
                groupLabel &&
                f.fieldtype === "Section Break" &&
                (f.label || "").trim().toLowerCase() === groupLabel.trim().toLowerCase()
            ) {
                return false;
            }
            return true;
        });

    return (
        <div className="min-h-screen bg-[#FAFAF9] font-sans dark:bg-[#18181B]">
            <AppSidebar />
            <main className="w-full overflow-hidden px-5 py-6 md:px-8 md:py-7">
                <PageHeader
                    title={formData.name || id || "Indent General Form"}
                    status={workflowState}
                    projectName={projectTitle || formData.igf_project_code}
                    projectNumber={formData.igf_project_code}
                >
                    {/* NIQ Form button — Approved, Limited Tender, below ₹50 lakh */}
                    {workflowState === "Approved" &&
                        Number(formData.igf_total_estimate) < 5000000 &&
                        formData.igf_tender_type === "Limited Tender" &&
                        id && (
                            <button
                                onClick={() => navigate(`/niq-form/${id}`)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
                                title="Generate NIQ Form for this indent"
                            >
                                <FileSearch2 className="w-4 h-4" />
                                NIQ Form
                            </button>
                        )}
                    {isDraft && id && (
                        <button
                            onClick={() => navigate(`/indent-general-form/${id}`)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
                        >
                            <EditIcon className="w-4 h-4" />
                            Edit
                        </button>
                    )}
                    {headerActions.map((action) => {
                        const commitRequired = isStaffRnD && isCommittedForGate === false && workflowState === "Pending Staff Approval";
                        return (
                            <button
                                key={action}
                                onClick={() => handleAction(action)}
                                disabled={isActing || commitRequired}
                                title={commitRequired ? "A commitment must be submitted before forwarding." : undefined}
                                className={cn(
                                    "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all",
                                    commitRequired
                                        ? "bg-zinc-200 text-zinc-400 cursor-not-allowed border-0"
                                        : "bg-[#D97757] text-white hover:bg-[#c66a4e] disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                <Send className="w-4 h-4" />
                                {isActing ? "Processing…" : action}
                            </button>
                        );
                    })}
                </PageHeader>
                
                {isStaffRnD && isCommittedForGate === false && workflowState === "Pending Staff Approval" && (
                    <div className="mt-4 max-w-fit rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                        A commitment must be submitted before forwarding this application.
                    </div>
                )}

                {/* Workflow Timeline */}
                <div className="mt-6">
                    <WorkflowTimeline currentState={workflowState} />
                </div>

                {/* Main Content */}
                <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                    {/* Form sections — 3 cols */}
                    <div className="min-w-0 space-y-5">

                        {/* Indenter & Project Details */}
                        <GroupCard icon={UserIcon} label="Indenter & Project Details">
                            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                <InfoRow label="Indenter" value={formData.igf_indenter} />
                                <InfoRow label="Designation" value={formData.igf_indenter_designation} />
                                <InfoRow label="Employee Code" value={formData.igf_employee_code} />
                                <InfoRow label="Webmail ID" value={formData.igf_webmail_user_id} />
                                <InfoRow label="Project Code" value={formData.igf_project_code} />
                                <InfoRow
                                    label="Account Head"
                                    value={formData.igf_account_head || formData.budget_head}
                                    isBudgetHead
                                />
                                <InfoRow
                                    label="Department"
                                    value={formData.igf_department_centre_section}
                                    isDept
                                />
                            </div>
                            <DynamicFormRenderer
                                fields={fieldsFor([
                                    "igf_purchase_general_form",
                                    "igf_indenter_details",
                                    "igf_webmail_id",
                                    "igf_project_details",
                                    "igf_project_title",
                                ], "Indenter & Project Details")}
                                {...rendererProps}
                            />
                        </GroupCard>

                        {/* Items */}
                        <GroupCard icon={ShoppingCartIcon} label="Details of Items to be Purchased">
                            <DynamicFormRenderer
                                fields={fieldsFor([
                                    "details_of_items_to_be_purchased_section",
                                    "igf_items",
                                    "igf_total_estimate",
                                    "igf_sanctioned_by_agency",
                                ], "Details of Items to be Purchased")}
                                {...rendererProps}
                            />
                        </GroupCard>

                        {/* Vendors — only shown when the table field is actually visible */}
                        {effectiveFields.some(
                            (f) =>
                                ["igf_details_of_vendors", "igf_vendors"].includes(f.fieldname) &&
                                !f.hidden &&
                                isFieldVisible(f, formData),
                        ) && (
                                <GroupCard icon={TruckIcon} label="Details of Vendors">
                                    <DynamicFormRenderer
                                        fields={fieldsFor([
                                            "igf_details_of_vendors",
                                            "igf_vendors",
                                        ], "Details of Vendors")}
                                        {...rendererProps}
                                    />
                                </GroupCard>
                            )}

                        {/* Purchase Committee */}
                        <GroupCard icon={UsersIcon} label="Purchase Committee">
                            <DynamicFormRenderer
                                fields={fieldsFor([
                                    "igf_purchase_committee",
                                    "igf_committee_members",
                                ], "Purchase Committee")}
                                {...rendererProps}
                            />
                        </GroupCard>

                        {/* Tender Details */}
                        <GroupCard icon={FileTextIcon} label="Tender Details">
                            <DynamicFormRenderer
                                fields={fieldsFor([
                                    "igf_tender_details",
                                    "igf_tender_type",
                                    "igf_number_of_bids",
                                ], "Tender Details")}
                                {...rendererProps}
                            />
                        </GroupCard>

                        {/* Files */}
                        <GroupCard icon={FileTextIcon} label="Uploaded Files">
                            <DynamicFormRenderer
                                fields={fieldsFor([
                                    "igf_file_upload_section",
                                    "igf_upload_detailed_specification",
                                    "igf_upload_vendor_list",
                                ], "Uploaded Files")}
                                {...rendererProps}
                            />
                        </GroupCard>

                        {/* Declaration */}
                        <GroupCard icon={FileTextIcon} label="Declaration">
                            <DynamicFormRenderer
                                fields={fieldsFor([
                                    "igf_declaration_section",
                                    "igf_declaration_text",
                                    "igf_decl_inr_confirmation",
                                ], "Declaration")}
                                {...rendererProps}
                            />
                        </GroupCard>
                    </div>

                    {/* Sidebar — 1 col */}
                    <aside className="min-w-0 space-y-4">
                        {/* Status card */}
                        <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                            <div className="border-b border-[#E4E4E7] bg-[#FAFAF9] px-5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-[#3F3F46] dark:text-[#E4E4E7]">
                                    Status
                                </h3>
                            </div>
                            <div className="space-y-3 p-5 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500 dark:text-zinc-400">State</span>
                                    <StateBadge state={workflowState} />
                                </div>
                                {!isDraft && workflowState !== "Approved" && workflowState !== "Rejected" && (
                                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                                            Pending at
                                        </p>
                                        <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mt-0.5">
                                            {workflowState}
                                        </p>
                                    </div>
                                )}
                                {formData.owner && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Applicant</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 text-xs text-right max-w-[140px] truncate">
                                            {formData.owner}
                                        </span>
                                    </div>
                                )}
                                {formData.creation && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Created</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1 text-xs">
                                            <CalendarIcon className="w-3 h-3" />
                                            {new Date(formData.creation).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                                        </span>
                                    </div>
                                )}
                                {formData.modified && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Modified</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1 text-xs">
                                            <CalendarIcon className="w-3 h-3" />
                                            {new Date(formData.modified).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                                        </span>
                                    </div>
                                )}
                                {formData.igf_total_estimate != null && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Total Estimate</span>
                                        <span className="font-bold text-[#D97757]">
                                            {Number(formData.igf_total_estimate).toLocaleString("en-IN", {
                                                style: "currency",
                                                currency: "INR",
                                            })}
                                        </span>
                                    </div>
                                )}
                                {formData.igf_tender_type && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Tender Type</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 text-xs">
                                            {formData.igf_tender_type}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Make a Commitment via CommitPayment component */}
                        {isStaffRnD && workflowState === "Pending Staff Approval" && (
                            <CommitPayment
                                doctype="Indent General Form"
                                docName={id || ""}
                                projectName={projectName}
                                budgetHeads={budgetHeads}
                                actualBalance={actualBalance}
                                onCommitSuccess={() => handleRefresh()}
                                onStagingStatusChange={(status) => setIsCommittedForGate(status)}
                            />
                        )}

                        {/* Record Payment */}
                        {isStaffRnD && workflowState === "Pending Staff Approval" && isCommitted && (
                            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                    Record Payment
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                                            Payment Amount (₹)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                            placeholder="Enter payment amount"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            onWheel={(e) => e.currentTarget.blur()}
                                        />
                                    </div>
                                    <button
                                        onClick={handlePayment}
                                        disabled={isPaying}
                                        className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#D97757] text-white hover:bg-[#c66a4e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isPaying ? "Recording…" : "Record Payment"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Activity */}
                        <div className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                            {id && <ActivityLog doctype="Indent General Form" docname={id} />}
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default IndentGeneralFormDetails;
