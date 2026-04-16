import React, { useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    useFrappeGetCall,
    useFrappeGetDoc,
    useFrappePostCall,
} from "frappe-react-sdk";
import {
    ArrowLeft,
    IndianRupee,
    FileText,
    CreditCard,
    Calculator,
    Building2,
    MessageSquare,
    Clock,
    X,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/RndSidebar";
import { GlobalLoader } from "@/components/ui/global-loader";
import { useUserRoleChecks } from "../components/UserRoleCheck";
import { FormRender } from "../components/FormRender";
import { useFrappeClientScript } from "../hooks/useFrappeClientScript";
import { useDepositSlipCalculations } from "../hooks/useDepositSlipCalculations";
import { useFrappeFetchFrom } from "../hooks/useFrappeFetchFrom";
import { HoSApprovalView } from "./HoSApprovalView";
import { BudgetHeadName } from "@/components/BudgetHeadName";

// Component to fetch and display attachment for a transaction
const TransactionAttachment = ({
    transactionName,
    fallbackFile,
}: {
    transactionName: string;
    fallbackFile?: string;
}) => {
    // Attempt to find a File document attached to this transaction row
    const { data } = useFrappeGetCall<{ message: any[] }>(
        "frappe.client.get_list",
        {
            doctype: "File",
            filters: {
                attached_to_name: transactionName,
            },
            fields: ["file_url", "file_name"],
            limit_page_length: 1,
        },
    );

    const file = data?.message?.[0];
    const fileUrl = file?.file_url || fallbackFile;
    const fileName = file?.file_name || "Attachment";

    if (!fileUrl)
        return <span className="text-zinc-400 dark:text-zinc-500">-</span>;

    return (
        <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
            title={fileName}
        >
            <FileText className="h-4 w-4" />
        </a>
    );
};

// --- DEPOSIT SLIP TYPE CONFIGURATION ---
const DEPOSIT_SLIP_TYPES: Record<
    string,
    {
        label: string;
        getFields: string;
        save: string;
        submit: string;
        getWorkflowActions: string;
        performAction: string;
    }
> = {
    t_testing: {
        label: "T Testing Deposit Slip",
        getFields:
            "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.get_t_testing_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.save_t_testing_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.submit_t_testing_deposit_slip",
        getWorkflowActions:
            "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.get_t_testing_deposit_slip_workflow_actions",
        performAction:
            "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.perform_t_testing_deposit_slip_workflow_action",
    },
    research_consultancy: {
        label: "Research Consultancy Deposit Slip",
        getFields:
            "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.get_research_consultancy_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.save_research_consultancy_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.submit_research_consultancy_deposit_slip",
        getWorkflowActions:
            "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.get_research_consultancy_deposit_slip_workflow_actions",
        performAction:
            "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.perform_research_consultancy_deposit_slip_workflow_action",
    },
    other_event: {
        label: "Other Event Deposit Slip",
        getFields:
            "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.get_other_event_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.save_other_event_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.submit_other_event_deposit_slip",
        getWorkflowActions:
            "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.get_other_event_deposit_slip_workflow_actions",
        performAction:
            "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.perform_other_event_deposit_slip_workflow_action",
    },
    e_non_routine: {
        label: "E Non Routine Deposit Slip",
        getFields:
            "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.get_e_non_routine_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.save_e_non_routine_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.submit_e_non_routine_deposit_slip",
        getWorkflowActions:
            "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.get_e_non_routine_deposit_slip_workflow_actions",
        performAction:
            "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.perform_e_non_routine_deposit_slip_workflow_action",
    },
    d_consultancy: {
        label: "D Consultancy Deposit Slip",
        getFields:
            "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.get_d_consultancy_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.save_d_consultancy_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.submit_d_consultancy_deposit_slip",
        getWorkflowActions:
            "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.get_d_consultancy_deposit_slip_workflow_actions",
        performAction:
            "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.perform_d_consultancy_deposit_slip_workflow_action",
    },
    research_deposit_slip: {
        label: "Research Deposit Slip",
        getFields:
            "rndopsapp.rndopsapp.doctype.research_deposit_slip.research_deposit_slip.get_research_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.research_deposit_slip.research_deposit_slip.save_research_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.research_deposit_slip.research_deposit_slip.submit_research_deposit_slip",
        getWorkflowActions:
            "rndopsapp.rndopsapp.doctype.research_deposit_slip.research_deposit_slip.get_research_deposit_slip_workflow_actions",
        performAction:
            "rndopsapp.rndopsapp.doctype.research_deposit_slip.research_deposit_slip.perform_research_deposit_slip_workflow_action",
    },
};

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string;
    label: string | null;
    fieldtype: string;
    options?: string | null;
    mandatory: boolean;
    hidden: boolean;
    read_only: boolean;
    description?: string | null;
    default?: any;
    depends_on?: string | null;
    depends_on_eval?: string | null;
    fetch_from?: string;
}

interface LinkOption {
    value: string;
    label: string;
}

interface FormData {
    [key: string]: any;
}

// --- STYLED COMPONENTS ---
const FrappeCard = ({
    title,
    children,
    className,
    icon,
}: {
    title?: string;
    children: React.ReactNode;
    className?: string;
    icon?: React.ReactNode;
}) => (
    <div
        className={cn(
            "bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm",
            className,
        )}
    >
        {title && (
            <div className="px-6 py-4 border-b border-zinc-300 dark:border-zinc-700 flex items-center gap-3">
                {icon && (
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                        {icon}
                    </div>
                )}
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                    {title}
                </h3>
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

const FrappeButton = ({
    children,
    onClick,
    disabled,
    className,
    variant = "primary",
    type = "button",
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: "primary" | "ghost" | "outline" | "action";
    type?: "button" | "submit";
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
            variant === "primary" &&
            "bg-[#D97757] text-white hover:bg-[#D97757] shadow-md hover:shadow-lg border border-[#C66A4E]",
            variant === "ghost" &&
            "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 hover:text-zinc-900 dark:text-zinc-100",
            variant === "outline" &&
            "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
            variant === "action" &&
            "bg-[#D97757] text-white font-bold hover:bg-[#D97757] shadow-md hover:shadow-lg border-2 border-[#C66A4E]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className,
        )}
    >
        {children}
    </button>
);

// --- COMMENT MODAL ---
const CommentModal = ({
    isOpen,
    onClose,
    onSubmit,
    action,
    isLoading,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (comment: string) => void;
    action: string;
    isLoading: boolean;
}) => {
    const [comment, setComment] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Confirm {action}
                </h3>
                <textarea
                    className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                    rows={4}
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <FrappeButton
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </FrappeButton>
                    <FrappeButton
                        variant="primary"
                        onClick={() => {
                            onSubmit(comment);
                            setComment("");
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? "Processing..." : "Confirm"}
                    </FrappeButton>
                </div>
            </div>
        </div>
    );
};

// --- INPUT STYLES ---

// --- HELPER: Evaluate depends_on condition ---
const evaluateDependsOn = (
    dependsOn: string | null | undefined,
    formData: FormData,
): boolean => {
    if (!dependsOn) return true;

    try {
        // Remove 'eval:' prefix if present
        let expression = dependsOn;
        if (expression.startsWith("eval:")) {
            expression = expression.substring(5);
        }

        // Create a safe evaluation context with 'doc' as formData
        const doc = formData;

        // Handle common patterns safely
        // Pattern: doc.fieldname=='value' or doc.fieldname=="value"
        const equalityMatch = expression.match(
            /doc\.([\w_]+)\s*[==]+\s*['"]([^'"]*)['"]/,
        );
        if (equalityMatch) {
            const [, fieldName, expectedValue] = equalityMatch;
            return doc[fieldName] === expectedValue;
        }

        // Pattern: doc.fieldname!='value' or doc.fieldname!=="value"
        const notEqualMatch = expression.match(
            /doc\.([\w_]+)\s*!==?\s*['"]([^'"]*)['"]/,
        );
        if (notEqualMatch) {
            const [, fieldName, expectedValue] = notEqualMatch;
            return doc[fieldName] !== expectedValue;
        }

        // Pattern: doc.fieldname.includes('value')
        const includesMatch = expression.match(
            /doc\.([\w_]+)\.includes\(['"]([^'"]*)['"]\)/,
        );
        if (includesMatch) {
            const [, fieldName, searchValue] = includesMatch;
            const fieldValue = doc[fieldName];
            return (
                typeof fieldValue === "string" &&
                fieldValue.includes(searchValue)
            );
        }

        // Fallback: try eval (use with caution)
        return eval(expression);
    } catch (e) {
        console.warn("Failed to evaluate depends_on:", dependsOn, e);
        return true; // Show field if evaluation fails
    }
};

// --- WORKFLOW ACTIONS COMPONENT ---
interface FundReceivedWorkflowActionsProps {
    docname: string;
    onActionComplete: () => void;
    // Callback that returns additional args to send to the API, or null to cancel the action
    onBeforeAction?: (action: string) => Promise<{ [key: string]: any } | null>;
    // Callback to determine if an action button should be disabled
    disabledCondition?: (action: string) => boolean;
}

const FundReceivedWorkflowActions = ({
    docname,
    onActionComplete,
    onBeforeAction,
    disabledCondition,
}: FundReceivedWorkflowActionsProps) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{
        message: string[];
    }>(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_workflow_actions",
        { docname },
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.perform_fund_received_action",
    );

    const { call: addComment } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");

    const handleActionClick = (action: string) => {
        if (disabledCondition && disabledCondition(action)) return;
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            let additionalArgs: { [key: string]: any } = {};

            // If callback exists, get extra data (e.g., deposit slip form data)
            if (onBeforeAction) {
                const result = await onBeforeAction(selectedAction);
                if (result === null) {
                    setModalOpen(false);
                    return; // Action cancelled (e.g., validation failed)
                }
                additionalArgs = result;
            }

            // Perform the action (without comment in API call)
            await performAction({
                docname,
                action: selectedAction,
                ...additionalArgs,
            });

            // Add comment as activity if provided
            if (comment && comment.trim()) {
                try {
                    await addComment({
                        doctype: "Fund Received",
                        docname: docname,
                        content: `[${selectedAction}] ${comment.trim()}`,
                    });
                } catch (commentError) {
                    console.error("Error adding comment:", commentError);
                    // Don't fail the whole operation if comment fails
                }
            }

            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
            alert("Failed to perform action. Please try again.");
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <>
            <div className="flex gap-2">
                {data.message.map((action) => {
                    const isDisabled = disabledCondition
                        ? disabledCondition(action)
                        : false;
                    return (
                        <FrappeButton
                            key={action}
                            onClick={() => handleActionClick(action)}
                            disabled={actionLoading || isDisabled}
                            variant={isDisabled ? "outline" : "action"} // Visual feedback
                            className={
                                isDisabled
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                            }
                        >
                            {action}
                        </FrappeButton>
                    );
                })}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
    );
};

// --- DETAIL ROW COMPONENT ---
const DetailRow = ({
    label,
    value,
    isCurrency = false,
}: {
    label: string;
    value: any;
    isCurrency?: boolean;
}) => (
    <div className="flex justify-between py-3 border-b border-zinc-200 dark:border-zinc-800 last:border-0">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {label}
        </span>
        <span
            className={cn(
                "text-sm font-bold",
                isCurrency
                    ? "text-[#D97757]"
                    : "text-zinc-900 dark:text-zinc-100",
            )}
        >
            {isCurrency && value != null
                ? value.toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                })
                : value || "-"}
        </span>
    </div>
);

// --- ACTIVITY STREAM COMPONENT ---
interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type: string;
}

const ActivityStream = ({
    doctype,
    docname,
    onRefresh,
}: {
    doctype: string;
    docname: string;
    onRefresh?: () => void;
}) => {
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        data: activityData,
        mutate: refetchActivity,
        isLoading: isActivityLoading,
        error: activityError,
    } = useFrappeGetCall<{ message: ActivityItem[] }>(
        "rndopsapp.rndopsapp.api.get_project_activity",
        { doctype, docname },
        docname ? undefined : null, // Don't fetch if no docname
    );

    const { call: addComment } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );

    const handleCommentSubmit = async () => {
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            await addComment({ doctype, docname, content: newComment.trim() });
            setNewComment("");
            await refetchActivity();
            onRefresh?.();
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

    return (
        <div className="space-y-4">
            {/* Add Comment Section */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <label
                    htmlFor="fund-comment-textarea"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                    Add a comment
                </label>
                <textarea
                    id="fund-comment-textarea"
                    placeholder="Type here... (Ctrl+Enter to submit)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isSubmitting}
                    className="w-full resize-none bg-white dark:bg-zinc-900 p-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] text-sm"
                    rows={3}
                />
                <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {newComment.length}/1000
                    </span>
                    <FrappeButton
                        variant="primary"
                        onClick={handleCommentSubmit}
                        disabled={isSubmitting || !newComment.trim()}
                    >
                        {isSubmitting ? "Posting..." : "Post Comment"}
                    </FrappeButton>
                </div>
            </div>

            {/* Activity List */}
            <div className="space-y-3">
                {isActivityLoading && (
                    <div className="flex justify-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D97757] border-t-transparent"></div>
                    </div>
                )}
                {activityError && (
                    <div className="text-center p-4 text-red-700 border border-red-200 rounded-lg bg-red-50">
                        <p className="text-sm font-medium">
                            Failed to load activity
                        </p>
                    </div>
                )}
                {activityData?.message && activityData.message.length > 0
                    ? activityData.message.map((item, index) => (
                        <div
                            key={`${item.creation}-${index}`}
                            className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                        >
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-semibold text-[#D97757] text-xs">
                                {item.owner?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                        {item.owner || "Unknown User"}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 flex-shrink-0">
                                        <Clock className="h-3 w-3" />
                                        {item.creation
                                            ? new Date(
                                                item.creation,
                                            ).toLocaleString()
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
                        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900">
                            <MessageSquare className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                No activity yet.
                            </p>
                            <p className="text-xs mt-1">
                                Be the first to add a comment.
                            </p>
                        </div>
                    )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const FundReceivedDetails = () => {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const prjreg_title = location.state?.prjreg_title;

    // Check user roles - show deposit form only for RnD Miscellaneous
    const { isRndMiscellaneous } = useUserRoleChecks();

    // Form state
    const [fields, setFields] = useState<Field[]>([]);
    const [formData, setFormData] = useState<FormData>({});
    const [linkOptions, setLinkOptions] = useState<
        Record<string, LinkOption[]>
    >({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedDepositSlipType, setSelectedDepositSlipType] =
        useState<string>("");
    const [depositFormLoading, setDepositFormLoading] = useState(false);
    const [showActivityLog, setShowActivityLog] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [childTableMeta, setChildTableMeta] = useState<Record<string, any>>(
        {},
    );
    // Fetch the full document first (always available from URL param)
    const {
        data: docData,
        isLoading: docLoading,
        error: docError,
    } = useFrappeGetDoc("Fund Received", name || "");

    // Use prjreg_title from navigation state, or fall back to the loaded document's field.
    // This ensures the enriched list API fires even when navigating from pending tasks.
    const effectivePrjregTitle = prjreg_title || docData?.prjreg_title;

    const {
        data: apiData,
        isLoading: listLoading,
        error: listError,
        mutate,
    } = useFrappeGetCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
        effectivePrjregTitle
            ? { prjreg_title: effectivePrjregTitle, limit: 0, start: 0 }
            : undefined,
        effectivePrjregTitle || null,
    );

    // Resolve sanction_ref_no from all available sources
    const resolvedSanctionRef =
        docData?.sanction_ref_no ||
        docData?.fund_transactions?.[0]?.sanction_ref_no ||
        docData?.received_amt_breakup?.[0]?.sanction_ref_no ||
        "";

    // Fetch linked Fund Sanction document for full details
    const { data: sanctionDoc } = useFrappeGetDoc(
        "Fund Sanction",
        resolvedSanctionRef || "NONE",
    );

    // Normalize fund data
    const normalizeResponse = (raw: any) => {
        if (!raw) return [];
        if (raw.message?.message && Array.isArray(raw.message.message))
            return raw.message.message;
        if (raw.message && Array.isArray(raw.message)) return raw.message;
        if (Array.isArray(raw)) return raw;
        return [];
    };

    const funds = normalizeResponse(apiData);
    const listData = funds.find((f: any) => f.name === name);
    // Use enriched listData when available (has joined fields like sanction_ref_no),
    // merge with docData so no fields are lost. Fall back to docData only.
    const fundData = listData
        ? { ...docData, ...listData }
        : docData
            ? {
                ...docData,
                sanction_ref_no: resolvedSanctionRef,
            }
            : null;

    const isLoading =
        docLoading || (effectivePrjregTitle ? listLoading : false);
    const error = docError || (effectivePrjregTitle ? listError : null);

    const showDepositSlip =
        isRndMiscellaneous &&
        (docData?.workflow_state ===
            "Pending Misc. Staff Approval(Deposit Slip Pending)" ||
            listData?.workflow_state ===
            "Pending Misc. Staff Approval(Deposit Slip Pending)");

    // State for client script
    const [clientScript, setClientScript] = useState<string>("");

    // Initialize dynamic client script engine (fallback/legacy)
    useFrappeClientScript(clientScript, formData, setFormData);

    // Initialize native calculations hook (primary)
    useDepositSlipCalculations(formData, setFormData, selectedDepositSlipType);

    // Initialize fetch_from logic (auto-fill)
    useFrappeFetchFrom(formData, setFormData, fields);

    // Child table fetch_from logic: auto-fill linked fields in child table rows
    const childFetchRef = React.useRef<Set<string>>(new Set());
    React.useEffect(() => {
        if (!childTableMeta || Object.keys(childTableMeta).length === 0) return;

        Object.entries(childTableMeta).forEach(
            ([tableName, meta]: [string, any]) => {
                const rows = formData[tableName];
                if (!Array.isArray(rows)) return;

                // Find fields with fetch_from in this child table
                const fetchFields = (meta.fields || []).filter(
                    (f: any) => f.fetch_from && f.fetch_from.includes("."),
                );
                if (fetchFields.length === 0) return;

                rows.forEach((row: any, rowIndex: number) => {
                    fetchFields.forEach((targetField: any) => {
                        const [sourceFieldName, sourceProperty] =
                            targetField.fetch_from.split(".");
                        const sourceValue = row[sourceFieldName];

                        if (!sourceValue) return; // Skip if no source value

                        // Use row id + source value as key to allow re-fetch when source changes
                        const rowId = row.id || row.name || rowIndex;
                        const fetchKey = `${tableName}:${rowId}:${targetField.fieldname}:${sourceValue}`;
                        if (childFetchRef.current.has(fetchKey)) return;
                        childFetchRef.current.add(fetchKey);

                        // Find the source field definition to get the doctype
                        const sourceFieldDef = (meta.fields || []).find(
                            (f: any) => f.fieldname === sourceFieldName,
                        );
                        const doctype = sourceFieldDef?.options;
                        if (!doctype) return;

                        fetch("/api/method/frappe.client.get_value", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                                doctype,
                                filters: { name: sourceValue },
                                fieldname: [sourceProperty],
                            }),
                        })
                            .then((res) => res.json())
                            .then((data) => {
                                if (
                                    data.message?.[sourceProperty] !== undefined
                                ) {
                                    setFormData((prev) => {
                                        const table = [
                                            ...(prev[tableName] || []),
                                        ];
                                        if (table[rowIndex]) {
                                            table[rowIndex] = {
                                                ...table[rowIndex],
                                                [targetField.fieldname]:
                                                    data.message[
                                                    sourceProperty
                                                    ],
                                            };
                                        }
                                        return { ...prev, [tableName]: table };
                                    });
                                }
                            })
                            .catch((err) =>
                                console.error(
                                    "Child table fetch_from error:",
                                    err,
                                ),
                            );
                    });
                });
            },
        );
    }, [formData, childTableMeta]);

    // Handle deposit slip type change - fetch fields from appropriate API
    const handleDepositSlipTypeChange = async (type: string) => {
        setSelectedDepositSlipType(type);
        setFields([]);
        setFormData({});
        setClientScript(""); // Reset script
        setChildTableMeta({}); // Reset child table metadata

        if (!type || !DEPOSIT_SLIP_TYPES[type]) {
            return;
        }

        setDepositFormLoading(true);
        try {
            const response = await fetch(
                `/api/method/${DEPOSIT_SLIP_TYPES[type].getFields}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ doc_name: name || undefined }),
                },
            );
            const result = await response.json();

            console.log("Deposit slip API response for type:", type, result);
            console.log("Response status:", response.status, response.ok);

            if (!response.ok) {
                console.error("API error response:", result?.exc || result);
            }

            // Normalize: backend may return { fields: [...], ... } or the fields array directly
            const messagePayload = result?.message;
            const normalizedPayload =
                Array.isArray(messagePayload)
                    ? { fields: messagePayload }
                    : messagePayload;

            if (normalizedPayload) {
                const {
                    fields: apiFields,
                    link_options,
                    prefill_data,
                    client_scripts,
                    child_table_meta,
                    related_data,
                } = normalizedPayload;

                console.log("apiFields:", apiFields);
                console.log("Number of fields:", apiFields?.length);

                // Store child table metadata for dynamic table rendering
                if (child_table_meta) {
                    setChildTableMeta(child_table_meta);
                }

                if (Array.isArray(apiFields)) {
                    const processedFields = apiFields.map((field: any) => {
                        if (
                            field.fieldtype === "Section Break" ||
                            field.fieldtype === "SectionBreak"
                        )
                            return field;

                        const processed: Field = {
                            ...field,
                            mandatory: !!field.mandatory,
                            hidden: !!field.hidden,
                            read_only: !!field.read_only,
                        };

                        if (
                            prefill_data &&
                            prefill_data[field.fieldname] !== undefined
                        ) {
                            processed.default = prefill_data[field.fieldname];
                        }
                        return processed;
                    });
                    setFields(processedFields);

                    // Initialize form data with defaults
                    const initialData: FormData = {};
                    processedFields.forEach((f: Field) => {
                        if (f.default) initialData[f.fieldname] = f.default;
                    });

                    // Auto-fill project details from related_data (Project Registration lookup)
                    // prjreg_title may be either a Project Registration `name` or `project_no`
                    if (related_data?.prjreg_title) {
                        const prjFields = [
                            "name",
                            "pi_userid",
                            "project_no",
                            "fund_agen_initials",
                            "funding_agen",
                        ];
                        let prjDoc: any = null;

                        try {
                            // First try: lookup by name (prjreg_title might be the PR name directly)
                            const byNameResp = await fetch(
                                "/api/method/frappe.client.get_list",
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    credentials: "include",
                                    body: JSON.stringify({
                                        doctype: "Project Registration",
                                        filters: {
                                            name: related_data.prjreg_title,
                                        },
                                        fields: prjFields,
                                        limit_page_length: 1,
                                    }),
                                },
                            );
                            const byNameResult = await byNameResp.json();
                            if (byNameResult?.message?.length > 0) {
                                prjDoc = byNameResult.message[0];
                            }

                            // Second try: lookup by project_no if name lookup returned nothing
                            if (!prjDoc) {
                                const byProjNoResp = await fetch(
                                    "/api/method/frappe.client.get_list",
                                    {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                        },
                                        credentials: "include",
                                        body: JSON.stringify({
                                            doctype: "Project Registration",
                                            filters: {
                                                project_no:
                                                    related_data.prjreg_title,
                                            },
                                            fields: prjFields,
                                            limit_page_length: 1,
                                        }),
                                    },
                                );
                                const byProjNoResult =
                                    await byProjNoResp.json();
                                if (byProjNoResult?.message?.length > 0) {
                                    prjDoc = byProjNoResult.message[0];
                                }
                            }

                            if (prjDoc) {
                                console.log(
                                    "Auto-fill from Project Registration:",
                                    prjDoc,
                                );
                                if (prjDoc.name)
                                    initialData.project_title = prjDoc.name;
                                if (prjDoc.pi_userid)
                                    initialData.principal_investigator =
                                        prjDoc.pi_userid;
                                if (prjDoc.funding_agen)
                                    initialData.funding_agency =
                                        prjDoc.funding_agen;
                                else if (prjDoc.fund_agen_initials)
                                    initialData.funding_agency =
                                        prjDoc.fund_agen_initials;
                                if (prjDoc.project_no)
                                    initialData.project_no = prjDoc.project_no;
                            }
                        } catch (err) {
                            console.error(
                                "Failed to fetch Project Registration for autofill:",
                                err,
                            );
                        }
                    }

                    setFormData(initialData);

                    // Set Client Scripts
                    if (client_scripts && Array.isArray(client_scripts)) {
                        console.log(
                            "API returned client_scripts:",
                            client_scripts.length,
                            "scripts",
                        );
                        console.log(
                            "Script doctypes:",
                            client_scripts.map(
                                (cs: any) => cs.dt || cs.doctype || "unknown",
                            ),
                        );
                        // Concatenate all scripts
                        let combinedScript = client_scripts
                            .map((cs: any) => cs.script)
                            .join("\n\n");

                        // --- PATCH: Fix logic when amount is 0 ---
                        // Strategy: We append a re-definition of `calculate_deposit_slip` at the end of the script.
                        // In JavaScript, the last function declaration overrides previous ones with the same name.
                        // This bypasses the need for fragile regex/string replacement.

                        // We define the function with the SAME NAME as the original.
                        const _fixedFunction = `
                            function calculate_deposit_slip(frm) {
                                let total_inclusive = flt(frm.doc.amount_inclusive_gst_capital);
                                let multiplier = flt(frm.doc.overhead_multiplier) || 15;

                                if (total_inclusive > 0) {
                                    // Base and GST
                                    let project_balance = total_inclusive / 1.18;
                                    let cgst = project_balance * 0.09;
                                    let sgst = project_balance * 0.09;

                                    // Overhead Calculation
                                    let overhead_amount = project_balance * (multiplier / (100 + multiplier));
                                    let project_amount = project_balance - overhead_amount;

                                    // Static Credits
                                    let idf_amt = overhead_amount * (40.0 / 100);
                                    let dpf_amt = overhead_amount * (25.0 / 100);
                                    let staff_amt = overhead_amount * (5.0 / 100);
                                    let student_amt = overhead_amount * (5.0 / 100);

                                    frm.set_value({
                                        'project_balance_after_gst': project_balance,
                                        'cgst_9': cgst,
                                        'sgst_9': sgst,
                                        'total_gst': cgst + sgst,
                                        'total_budget': total_inclusive,
                                        'overhead_amount': overhead_amount,
                                        'overhead_amount_label': '<b>Overhead Amount @ ' + multiplier + '% (inclusive)</b>',
                                        'prj_amount': project_amount,
                                        'idf_amount': flt(idf_amt, 2),
                                        'dpf_cle_amount': flt(dpf_amt, 2),
                                        'staff_welfare_amount': flt(staff_amt, 2),
                                        'student_welfare_amount': flt(student_amt, 2)
                                    }).then(() => {
                                        distribute_pool_share(frm, overhead_amount);
                                    });

                                } else {
                                    // --- CORRECT ZERO LOGIC ---
                                    // Explicitly clear all calculated fields
                                    frm.set_value({
                                        'project_balance_after_gst': 0,
                                        'cgst_9': 0,
                                        'sgst_9': 0,
                                        'total_gst': 0,
                                        'total_budget': 0,
                                        'overhead_amount': 0,
                                        'overhead_amount_label': '',
                                        'prj_amount': 0,
                                        'idf_amount': 0,
                                        'dpf_cle_amount': 0,
                                        'staff_welfare_amount': 0,
                                        'student_welfare_amount': 0
                                    }).then(() => {
                                         distribute_pool_share(frm, 0);
                                    });
                                }
                            }
                        `;

                        // Just append it
                        combinedScript += "\n\n" + _fixedFunction;
                        console.log(
                            "Patched client script: Appended fixed calculation function (override).",
                        );
                        console.log(
                            "FINAL SCRIPT TO LOAD (first 500 chars):",
                            combinedScript.substring(0, 500),
                        );

                        setClientScript(combinedScript);
                    } else {
                        console.warn(
                            "No client_scripts returned from API for this deposit slip type!",
                        );
                    }
                }
                setLinkOptions((prev) => ({
                    ...prev,
                    ...(link_options || {}),
                }));

                // Fetch missing link options for known child table requirements
                const missingDoctypes = [
                    "Department_prornd",
                    "User",
                    "Budget Head",
                ];
                for (const dt of missingDoctypes) {
                    // Check if we already have options for this Doctype (either from API response or previous fetch)
                    // We check link_options (from API) and the key itself
                    if (!link_options?.[dt]) {
                        try {
                            const listResp = await fetch(
                                "/api/method/frappe.client.get_list",
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    credentials: "include",
                                    body: JSON.stringify({
                                        doctype: dt,
                                        fields:
                                            dt === "User"
                                                ? ["name", "full_name"]
                                                : dt === "Department_prornd"
                                                    ? ["name", "dept_name"]
                                                    : dt === "Budget Head"
                                                        ? ["*"]
                                                        : ["name"],
                                        limit_page_length: 500,
                                    }),
                                },
                            );
                            const listJson = await listResp.json();
                            if (listJson.message) {
                                const opts = listJson.message.map((d: any) => ({
                                    label:
                                        d.dept_name ||
                                        d.full_name ||
                                        d.budget_head ||
                                        d.head_name ||
                                        d.account_head ||
                                        d.title ||
                                        d.name,
                                    value: d.name,
                                }));
                                setLinkOptions((prev) => ({
                                    ...prev,
                                    [dt]: opts,
                                }));
                            }
                        } catch (e) {
                            console.error(
                                `Failed to fetch options for ${dt}`,
                                e,
                            );
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load deposit slip fields:", err);
        } finally {
            setDepositFormLoading(false);
        }
    };

    // Handle saving the deposit slip
    const handleSaveDepositSlip = async () => {
        if (isSubmitting || !selectedDepositSlipType) return;
        setIsSubmitting(true);

        try {
            const dataToSubmit: { [key: string]: any } = { ...formData };

            const response = await fetch(
                `/api/method/${DEPOSIT_SLIP_TYPES[selectedDepositSlipType].save}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        doc_data: JSON.stringify(dataToSubmit),
                    }),
                },
            );
            const result = await response.json();
            console.log("Deposit Slip Save result:", result);

            if (result?.message?.name) {
                alert(
                    `Deposit Slip saved successfully! Document: ${result.message.name}`,
                );
            } else {
                alert("Deposit Slip saved successfully!");
            }
            mutate(); // Refresh data
        } catch (err: any) {
            console.error("Deposit Slip Submission error:", err);
            alert(`Submission Failed: ${err.message || "Unknown Error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handler for workflow actions - attaches deposit slip data when "Forward" or "Generate Deposit Slip" is clicked
    const handleBeforeAction = useCallback(
        async (action: string): Promise<{ [key: string]: any } | null> => {
            // Only attach deposit slip data if action is "Forward" or "Generate Deposit Slip" and user is RnD Miscellaneous
            if (
                (action === "Forward" || action === "Generate Deposit Slip") &&
                isRndMiscellaneous
            ) {
                // Optional: Add validation here
                // const requiredFields = fields.filter(f => f.mandatory);
                // const missingFields = requiredFields.filter(f => !formData[f.fieldname]);
                // if (missingFields.length > 0) {
                //     alert(`Please fill required fields: ${missingFields.map(f => f.label).join(', ')}`);
                //     return null; // Cancel action
                // }

                console.log(
                    "Generate Deposit Slip - formData being sent:",
                    JSON.stringify(formData, null, 2),
                );
                return {
                    deposit_slip_data: JSON.stringify(formData),
                    deposit_slip_type: selectedDepositSlipType,
                };
            }
            return {}; // No extra data for other actions
        },
        [isRndMiscellaneous, formData, selectedDepositSlipType],
    );

    if (isLoading) return <GlobalLoader isLoading={true} />;

    if (error || !fundData) {
        return (
            <div className="bg-zinc-100 dark:bg-zinc-800 min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8">
                    <FrappeCard className="text-center py-16">
                        <FileText className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 uppercase">
                            Fund Details Not Found
                        </h2>
                        <p className="text-zinc-900 dark:text-zinc-100 mb-6">
                            The requested fund details could not be loaded.
                        </p>
                        <FrappeButton onClick={() => navigate(-1)}>
                            Go Back
                        </FrappeButton>
                    </FrappeCard>
                </main>
            </div>
        );
    }

    const {
        workflow_state,
        fund_received_amt,
        bank_account,
        received_amt_breakup,
        fund_transactions,
        sanction_ref_no,
    } = fundData;

    // --- NEW: HoS Approval View ---
    if (
        // workflow_state === "Pending HoS Approval" ||
        workflow_state === "Approved"
    ) {
        return (
            <div className="bg-zinc-100 dark:bg-zinc-800 min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8">
                    <FundReceivedWorkflowActions
                        docname={name || ""}
                        onActionComplete={() => {
                            mutate();
                            window.location.reload();
                        }}
                        onBeforeAction={handleBeforeAction}
                    />
                    <div className="mb-6"></div>
                    <HoSApprovalView fundReceivedName={name || ""} />
                </main>
            </div>
        );
    }

    const isFundReceived = workflow_state === "Fund Received";

    const renderSummaryContent = () => (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
                <FrappeCard className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <IndianRupee className="h-4 w-4 text-[#D97757]" />
                        </div>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs uppercase">
                            Total Amount
                        </span>
                    </div>
                    <p className="text-2xl font-extrabold text-[#D97757]">
                        {(fund_received_amt || 0).toLocaleString("en-IN", {
                            style: "currency",
                            currency: "INR",
                        })}
                    </p>
                </FrappeCard>
                <FrappeCard className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                            <Building2 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                        </div>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs uppercase">
                            Bank Account
                        </span>
                    </div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {bank_account || "-"}
                    </p>
                </FrappeCard>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Sanction Reference */}
                <FrappeCard
                    title="Sanction Reference"
                    icon={<Calculator className="h-4 w-4 text-[#D97757]" />}
                >
                    <div className="space-y-1">
                        <DetailRow label="Sanction" value={sanction_ref_no} />
                        {sanctionDoc && (
                            <>
                                <DetailRow
                                    label="Status"
                                    value={sanctionDoc.workflow_state}
                                />
                                <DetailRow
                                    label="Letter No"
                                    value={sanctionDoc.sanction_letter_no}
                                />
                                <DetailRow
                                    label="Date"
                                    value={sanctionDoc.sanction_date}
                                />
                                <DetailRow
                                    label="Amount"
                                    value={sanctionDoc.total_sanctioned_amount}
                                    isCurrency
                                />
                            </>
                        )}
                    </div>
                </FrappeCard>

                {/* Fund Info */}
                <FrappeCard
                    title="Fund Information"
                    icon={<Calculator className="h-4 w-4 text-[#D97757]" />}
                >
                    <div className="space-y-1">
                        <DetailRow
                            label="Total Amount Received"
                            value={fund_received_amt}
                            isCurrency
                        />
                        <DetailRow label="Bank Account" value={bank_account} />
                        <DetailRow
                            label="Workflow State"
                            value={workflow_state}
                        />
                    </div>
                </FrappeCard>
            </div>

            {/* Budget Breakup */}
            <FrappeCard
                title="Budget Breakup"
                icon={<FileText className="h-4 w-4 text-[#D97757]" />}
            >
                <div className="overflow-x-auto border border-zinc-300 dark:border-zinc-700 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-zinc-200 dark:bg-zinc-700">
                            <tr className="divide-x divide-gray-300">
                                <th className="px-3 py-2 text-left text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                                    Account Head
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                                    Amount
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                                    Remarks
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300 bg-white dark:bg-zinc-900">
                            {received_amt_breakup?.map(
                                (item: any, idx: number) => (
                                    <tr
                                        key={item.name || idx}
                                        className="divide-x divide-gray-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                    >
                                        <td className="px-3 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            <BudgetHeadName id={item.account_head} />
                                        </td>
                                        <td className="px-3 py-2 text-sm text-right font-bold text-[#D97757]">
                                            {item.amount_received?.toLocaleString(
                                                "en-IN",
                                                {
                                                    style: "currency",
                                                    currency: "INR",
                                                },
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-left text-zinc-500 dark:text-zinc-400">
                                            {item.remarks}
                                        </td>
                                    </tr>
                                ),
                            )}
                            {(!received_amt_breakup ||
                                received_amt_breakup.length === 0) && (
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="px-3 py-6 text-center text-zinc-500 dark:text-zinc-400"
                                        >
                                            No breakup details
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                </div>
            </FrappeCard>

            {/* Transactions */}
            <FrappeCard
                title="Transactions"
                icon={<CreditCard className="h-4 w-4 text-[#D97757]" />}
            >
                <div className="overflow-x-auto border border-zinc-300 dark:border-zinc-700 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-zinc-200 dark:bg-zinc-700">
                            <tr className="divide-x divide-gray-300">
                                <th className="px-3 py-2 text-left text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                                    Date
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                                    Transaction No
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                                    Amount
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                                    Attachments
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300 bg-white dark:bg-zinc-900">
                            {fund_transactions?.map(
                                (item: any, idx: number) => (
                                    <tr
                                        key={item.name || idx}
                                        className="divide-x divide-gray-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                    >
                                        <td className="px-3 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                                            {item.transaction_date}
                                        </td>
                                        <td className="px-3 py-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                            {item.transaction_number}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-right font-bold text-[#D97757]">
                                            {item.amount?.toLocaleString(
                                                "en-IN",
                                                {
                                                    style: "currency",
                                                    currency: "INR",
                                                },
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-center">
                                            <TransactionAttachment
                                                transactionName={item.name}
                                                fallbackFile={
                                                    item.attachment || item.file
                                                }
                                            />
                                        </td>
                                    </tr>
                                ),
                            )}
                            {(!fund_transactions ||
                                fund_transactions.length === 0) && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-3 py-6 text-center text-zinc-500 dark:text-zinc-400"
                                        >
                                            No transactions
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                </div>
            </FrappeCard>
        </div>
    );

    return (
        <div className="bg-zinc-100 dark:bg-zinc-800 min-h-screen">
            <GlobalLoader isLoading={isSubmitting} />
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                <FrappeCard className="mb-6 px-5 py-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700"
                            >
                                <ArrowLeft className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
                            </button>
                            <div>
                                <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                                    Fund Details & Deposit Slip
                                </h1>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                    {name}
                                </p>
                                <span
                                    className={cn(
                                        "inline-block mt-1 px-2 py-0.5 rounded border font-semibold text-[10px]",
                                        {
                                            "bg-amber-100 text-amber-800 border-amber-300":
                                                workflow_state === "Draft",
                                            "bg-blue-100 text-blue-800 border-blue-300":
                                                workflow_state === "Submitted",
                                            "bg-emerald-100 text-emerald-800 border-emerald-300":
                                                workflow_state === "Approved",
                                            "bg-red-100 text-red-800 border-red-300":
                                                workflow_state === "Rejected",
                                        },
                                    )}
                                >
                                    {workflow_state}
                                </span>
                            </div>
                            {fundData?.workflow_state === "Draft" && (
                                <FrappeButton
                                    onClick={() =>
                                        navigate(
                                            `/add-fund-received/${fundData.prjreg_title}?id=${name}`,
                                        )
                                    }
                                    className="bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200 shadow-sm ml-2 h-8 px-3 text-xs"
                                >
                                    ✏️ Edit
                                </FrappeButton>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <FundReceivedWorkflowActions
                                docname={name || ""}
                                onActionComplete={() => {
                                    mutate();
                                    window.location.reload();
                                }}
                                onBeforeAction={handleBeforeAction}
                                disabledCondition={(action) => {
                                    // Disable "Generate Deposit Slip" if form is incomplete
                                    if (action === "Generate Deposit Slip") {
                                        if (
                                            !showDepositSlip ||
                                            !selectedDepositSlipType
                                        )
                                            return true;
                                        // Check mandatory fields
                                        const mandatoryFields = fields.filter(
                                            (f) => f.mandatory && !f.hidden,
                                        );
                                        const hasEmptyMandatory =
                                            mandatoryFields.some((f) => {
                                                const val =
                                                    formData[f.fieldname];
                                                return (
                                                    val === undefined ||
                                                    val === null ||
                                                    val === ""
                                                );
                                            });
                                        return hasEmptyMandatory;
                                    }
                                    return false;
                                }}
                            />
                            {/* Hide Generate Deposit Slip button for Permanent Employees */}
                            {/* {!isPermanentEmployee && (
                                <FrappeButton onClick={() => navigate(`/deposit-slip-new/${name}`)}>
                                    <FileText className="h-4 w-4" />
                                    Generate Deposit Slip
                                </FrappeButton>
                            )} */}
                        </div>
                    </div>
                </FrappeCard>

                {/* Deposit Slip Form - Full Width (Fund Details moved to floating Summary panel) */}
                {showDepositSlip && (
                    <div className="space-y-6">
                        <FrappeCard
                            title="Deposit Slip Form"
                            icon={
                                <FileText className="h-4 w-4 text-[#D97757]" />
                            }
                        >
                            <div className="space-y-6">
                                {/* Deposit Slip Type Selector */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                        Select Deposit Slip Type{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedDepositSlipType}
                                            onChange={(e) =>
                                                handleDepositSlipTypeChange(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full h-11 px-4 pr-10 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] appearance-none"
                                        >
                                            <option value="">
                                                -- Select Type --
                                            </option>
                                            {Object.entries(
                                                DEPOSIT_SLIP_TYPES,
                                            ).map(([key, config]) => (
                                                <option key={key} value={key}>
                                                    {config.label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Loading State */}
                                {depositFormLoading && (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757]"></div>
                                    </div>
                                )}

                                {/* Dynamic Form via FormRender */}
                                {!depositFormLoading &&
                                    selectedDepositSlipType &&
                                    fields.length > 0 && (
                                        <FormRender
                                            fields={fields.map((f) => ({
                                                ...f,
                                                hidden:
                                                    !!f.hidden ||
                                                    !evaluateDependsOn(
                                                        f.depends_on ||
                                                        f.depends_on_eval,
                                                        formData,
                                                    ),
                                            }))}
                                            linkOptions={linkOptions}
                                            sections={(() => {
                                                const processed: any[] = [];
                                                let currentSection: any = {
                                                    title: "",
                                                    fields: [],
                                                    type: "default",
                                                };

                                                fields.forEach((field) => {
                                                    const isVisible =
                                                        evaluateDependsOn(
                                                            field.depends_on ||
                                                            field.depends_on_eval,
                                                            formData,
                                                        );

                                                    if (
                                                        field.fieldtype ===
                                                        "Section Break"
                                                    ) {
                                                        if (
                                                            currentSection
                                                                .fields.length >
                                                            0
                                                        )
                                                            processed.push(
                                                                currentSection,
                                                            );

                                                        // For Section Break, hide if condition fails
                                                        if (isVisible) {
                                                            currentSection = {
                                                                title:
                                                                    field.label ||
                                                                    "",
                                                                fields: [],
                                                                type: "default",
                                                            };
                                                        } else {
                                                            // If section is hidden, we use a dummy hidden section or null
                                                            // Fields that follow usually belong to this section.
                                                            // If we set currentSection to null, we can skip adding fields.
                                                            currentSection =
                                                                null;
                                                        }
                                                    } else if (
                                                        field.fieldtype ===
                                                        "Table"
                                                    ) {
                                                        if (
                                                            currentSection &&
                                                            currentSection
                                                                .fields.length >
                                                            0
                                                        ) {
                                                            processed.push(
                                                                currentSection,
                                                            );
                                                            currentSection = {
                                                                title: "",
                                                                fields: [],
                                                                type: "default",
                                                            };
                                                        }

                                                        if (isVisible) {
                                                            // Build table config dynamically from childTableMeta
                                                            let tableConfig: any =
                                                                null;
                                                            const meta =
                                                                childTableMeta[
                                                                field
                                                                    .fieldname
                                                                ];

                                                            if (
                                                                meta &&
                                                                meta.fields
                                                            ) {
                                                                // Build columns from child_table_meta.fields
                                                                const columns =
                                                                    meta.fields
                                                                        .filter(
                                                                            (
                                                                                f: any,
                                                                            ) =>
                                                                                ![
                                                                                    "Section Break",
                                                                                    "Column Break",
                                                                                    "SectionBreak",
                                                                                    "ColumnBreak",
                                                                                ].includes(
                                                                                    f.fieldtype,
                                                                                ),
                                                                        )
                                                                        .map(
                                                                            (
                                                                                f: any,
                                                                            ) => {
                                                                                let opts: any[] =
                                                                                    [];
                                                                                let type =
                                                                                    f.fieldtype;

                                                                                // Special handling for Budget Head / Account Head
                                                                                if (
                                                                                    [
                                                                                        "account_head",
                                                                                        "budget_head",
                                                                                        "head",
                                                                                    ].includes(
                                                                                        f.fieldname,
                                                                                    )
                                                                                ) {
                                                                                    opts =
                                                                                        linkOptions[
                                                                                        "Budget Head"
                                                                                        ] ||
                                                                                        linkOptions[
                                                                                        "budget_head"
                                                                                        ] ||
                                                                                        [];
                                                                                    if (
                                                                                        opts.length >
                                                                                        0
                                                                                    )
                                                                                        type =
                                                                                            "Link"; // Force Select rendering
                                                                                }

                                                                                if (
                                                                                    opts.length ===
                                                                                    0
                                                                                ) {
                                                                                    if (
                                                                                        f.fieldtype ===
                                                                                        "Select" &&
                                                                                        typeof f.options ===
                                                                                        "string"
                                                                                    ) {
                                                                                        opts =
                                                                                            f.options
                                                                                                .split(
                                                                                                    "\n",
                                                                                                )
                                                                                                .filter(
                                                                                                    (
                                                                                                        o: string,
                                                                                                    ) =>
                                                                                                        o.trim() !==
                                                                                                        "",
                                                                                                )
                                                                                                .map(
                                                                                                    (
                                                                                                        o: string,
                                                                                                    ) => ({
                                                                                                        label: o,
                                                                                                        value: o,
                                                                                                    }),
                                                                                                );
                                                                                    } else if (
                                                                                        f.options
                                                                                    ) {
                                                                                        opts =
                                                                                            linkOptions[
                                                                                            f
                                                                                                .fieldname
                                                                                            ] ||
                                                                                            linkOptions[
                                                                                            f
                                                                                                .options
                                                                                            ] ||
                                                                                            [];
                                                                                    }
                                                                                }

                                                                                return {
                                                                                    key: f.fieldname,
                                                                                    label:
                                                                                        f.label ||
                                                                                        f.fieldname,
                                                                                    type: type,
                                                                                    options:
                                                                                        opts,
                                                                                };
                                                                            },
                                                                        );

                                                                // Build newRowTemplate with default values
                                                                const newRowTemplate: Record<
                                                                    string,
                                                                    any
                                                                > = {
                                                                    doctype:
                                                                        meta.doctype, // Required for locals[cdt][cdn] in scripts
                                                                    name: `new-${Date.now()}`, // Temporary unique ID
                                                                };
                                                                meta.fields.forEach(
                                                                    (
                                                                        f: any,
                                                                    ) => {
                                                                        if (
                                                                            f.default !==
                                                                            null &&
                                                                            f.default !==
                                                                            undefined
                                                                        ) {
                                                                            newRowTemplate[
                                                                                f.fieldname
                                                                            ] =
                                                                                f.default;
                                                                        } else if (
                                                                            f.fieldtype ===
                                                                            "Currency" ||
                                                                            f.fieldtype ===
                                                                            "Float" ||
                                                                            f.fieldtype ===
                                                                            "Int"
                                                                        ) {
                                                                            newRowTemplate[
                                                                                f.fieldname
                                                                            ] =
                                                                                0;
                                                                        } else {
                                                                            newRowTemplate[
                                                                                f.fieldname
                                                                            ] =
                                                                                "";
                                                                        }
                                                                    },
                                                                );

                                                                tableConfig = {
                                                                    fieldname:
                                                                        field.fieldname,
                                                                    columns,
                                                                    newRowTemplate,
                                                                };
                                                            } else {
                                                                // Fallback if no metadata found
                                                                tableConfig = {
                                                                    fieldname:
                                                                        field.fieldname,
                                                                    columns: [
                                                                        {
                                                                            key: "name",
                                                                            label: "Name",
                                                                            type: "Data",
                                                                        },
                                                                    ],
                                                                    newRowTemplate:
                                                                        {},
                                                                };
                                                            }

                                                            processed.push({
                                                                title: field.label,
                                                                fields: [],
                                                                type: "table",
                                                                tableConfig,
                                                            });
                                                        }
                                                    } else if (
                                                        field.fieldtype ===
                                                        "Column Break" ||
                                                        field.fieldtype ===
                                                        "ColumnBreak"
                                                    ) {
                                                        // Explicitly ignore Column Break when adding to fields list
                                                        // (In a grid layout we might use it, but here we just want to hide it from being a text input)
                                                        // do nothing
                                                    } else {
                                                        // Only add field if current section is visible
                                                        if (currentSection) {
                                                            currentSection.fields.push(
                                                                field.fieldname,
                                                            );
                                                        }
                                                    }
                                                });
                                                if (
                                                    currentSection &&
                                                    currentSection.fields
                                                        .length > 0
                                                )
                                                    processed.push(
                                                        currentSection,
                                                    );
                                                return processed;
                                            })()}
                                            initialData={formData}
                                            onSubmit={handleSaveDepositSlip}
                                            onFormChange={(data) =>
                                                setFormData(data)
                                            }
                                            onCancel={() =>
                                                setSelectedDepositSlipType("")
                                            }
                                            submitButtonText="Save Deposit Slip"
                                            isSubmitting={isSubmitting}
                                            noCard
                                            hideActions={true}
                                        />
                                    )}

                                {/* No Type Selected */}
                                {!depositFormLoading &&
                                    !selectedDepositSlipType && (
                                        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                                            <p className="text-sm">
                                                Select a deposit slip type to
                                                load the form.
                                            </p>
                                        </div>
                                    )}

                                {/* No Fields */}
                                {!depositFormLoading &&
                                    selectedDepositSlipType &&
                                    fields.length === 0 && (
                                        <div className="text-center py-8 text-yellow-600">
                                            <p className="text-sm font-semibold">
                                                No form fields found for this
                                                type.
                                            </p>
                                        </div>
                                    )}
                            </div>
                        </FrappeCard>
                    </div>
                )}

                {/* INLINE SUMMARY — shown when deposit slip form is not active */}
                {!showDepositSlip && (
                    <div className="mt-8 animate-in fade-in duration-500 max-w-7xl">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                            <IndianRupee className="h-6 w-6 text-[#D97757]" />
                            Fund Summary
                        </h2>
                        {renderSummaryContent()}
                    </div>
                )}

                {/* Floating Summary Button — only shown when deposit slip form is active */}
                {showDepositSlip && (
                    <button
                        onClick={() => setShowSummary(true)}
                        className="fixed bottom-24 right-8 p-4 bg-[#D97757] text-white rounded-full shadow-lg hover:bg-[#c5684a] transition-all z-40 flex items-center gap-2"
                    >
                        <IndianRupee className="h-6 w-6" />
                        <span className="font-semibold hidden md:block">
                            Summary
                        </span>
                    </button>
                )}

                {/* Floating Activity Log Button */}
                <button
                    onClick={() => setShowActivityLog(true)}
                    className="fixed bottom-8 right-8 p-4 bg-[#D97757] text-white rounded-full shadow-lg hover:bg-[#c5684a] transition-all z-40 flex items-center gap-2"
                >
                    <MessageSquare className="h-6 w-6" />
                    <span className="font-semibold hidden md:block">
                        Activity Log
                    </span>
                </button>

                {/* Summary Panel (Slide Over) */}
                {showSummary && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                            onClick={() => setShowSummary(false)}
                        ></div>

                        {/* Panel */}
                        <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 h-full shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
                                <div className="flex items-center gap-2">
                                    <IndianRupee className="h-5 w-5 text-[#D97757]" />
                                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                                        Fund Summary
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowSummary(false)}
                                    className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 dark:bg-zinc-800/50">
                                {renderSummaryContent()}
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Log Panel (Slide Over) */}
                {showActivityLog && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                            onClick={() => setShowActivityLog(false)}
                        ></div>

                        {/* Panel */}
                        <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-[#D97757]" />
                                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                                        Activity Log
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowActivityLog(false)}
                                    className="p-2 hover:bg-zinc-200 dark:bg-zinc-700 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 dark:bg-zinc-800/50">
                                <ActivityStream
                                    doctype="Fund Received"
                                    docname={name || ""}
                                    onRefresh={() => mutate()}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default FundReceivedDetails;
