/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFrappePostCall, useFrappeGetCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
    EditIcon, Send, ChevronRight, CheckCircle2, XCircle,
    Clock, CalendarIcon, ActivityIcon, MessageSquare,
    UserIcon, ShoppingCartIcon, UsersIcon, FileTextIcon,
    TruckIcon,
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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                {label}
            </h3>
        </div>
        <div className="p-6">{children}</div>
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
    <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {label}
        </p>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 min-h-[1.5rem]">
            {isDept && value ? (
                <DepartmentName name={value} />
            ) : isBudgetHead && value ? (
                <BudgetHeadName id={value} />
            ) : (
                value || <span className="text-zinc-400">—</span>
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
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-5">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                Workflow Progress
            </h3>
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

    const { call: fetchFields } = useFrappePostCall<{ message: any }>(indentGeneralFormAPI.getFields);
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>("frappe.client.get_value");
    const { call: getActionsCall } = useFrappePostCall<{ message: any }>(indentGeneralFormAPI.getWorkflowActions);
    const { call: performActionCall } = useFrappePostCall<{ message: any }>(indentGeneralFormAPI.performAction);

    const handleRefresh = useCallback(() => {
        setLoading(true);
        setRefreshKey((k) => k + 1);
    }, []);

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            setLoading(true);
            try {
                const [res, budgetHeadRes] = await Promise.all([
                    fetchFields({ doc_name: id }),
                    fetch(
                        '/api/v2/document/Budget%20Head?fields=["name","budget_head"]&order_by=budget_head asc',
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

                const merged: Record<string, LinkOption[]> = {
                    ...(link_options || {}),
                    igf_account_head: budgetHeadOptions,
                    budget_head: budgetHeadOptions,
                    "Budget Head": budgetHeadOptions,
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

    const noOp = () => {};
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
    };

    const workflowState = formData.workflow_state || "Draft";
    const isDraft = workflowState === "Draft" || !formData.workflow_state;

    if (loading) return <GlobalLoader isLoading={true} />;

    const fieldsFor = (names: string[]) =>
        effectiveFields.filter((f) => names.includes(f.fieldname));

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={formData.name || id || "Indent General Form"}
                    status={workflowState}
                    projectName={projectTitle || formData.igf_project_code}
                    projectNumber={formData.igf_project_code}
                >
                    {isDraft && id && (
                        <button
                            onClick={() => navigate(`/indent-general-form/${id}`)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
                        >
                            <EditIcon className="w-4 h-4" />
                            Edit
                        </button>
                    )}
                    {headerActions.map((action) => (
                        <button
                            key={action}
                            onClick={() => handleAction(action)}
                            disabled={isActing}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4" />
                            {isActing ? "Processing…" : action}
                        </button>
                    ))}
                </PageHeader>

                {/* Workflow Timeline */}
                <div className="mt-6">
                    <WorkflowTimeline currentState={workflowState} />
                </div>

                {/* Main Content */}
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-4 gap-5">
                    {/* Form sections — 3 cols */}
                    <div className="lg:col-span-3 space-y-5">

                        {/* Indenter & Project Details */}
                        <GroupCard icon={UserIcon} label="Indenter & Project Details">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
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
                                ])}
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
                                ])}
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
                                    ])}
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
                                ])}
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
                                ])}
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
                                ])}
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
                                ])}
                                {...rendererProps}
                            />
                        </GroupCard>
                    </div>

                    {/* Sidebar — 1 col */}
                    <aside className="lg:col-span-1 space-y-4">
                        {/* Status card */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                Status
                            </h3>
                            <div className="space-y-3 text-sm">
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
                                            {new Date(formData.creation).toLocaleDateString("en-IN")}
                                        </span>
                                    </div>
                                )}
                                {formData.modified && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Modified</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1 text-xs">
                                            <CalendarIcon className="w-3 h-3" />
                                            {new Date(formData.modified).toLocaleDateString("en-IN")}
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

                        {/* Activity */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <ActivityIcon className="w-4 h-4 text-zinc-400" />
                                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Activity Log
                                </h3>
                            </div>
                            {id && <ActivityStream docname={id} onRefresh={handleRefresh} />}
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default IndentGeneralFormDetails;
