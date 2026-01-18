import React, { useState, useCallback, memo } from 'react';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useFrappeGetCall, useFrappeGetDoc, useFrappePostCall } from "frappe-react-sdk";
import { ArrowLeft, IndianRupee, FileText, CreditCard, Calculator, Building2, MessageSquare, Clock, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/RndSidebar";
import { GlobalLoader } from "@/components/ui/global-loader";
import { useUserRoleChecks } from "../components/UserRoleCheck";

// --- DEPOSIT SLIP TYPE CONFIGURATION ---
const DEPOSIT_SLIP_TYPES: Record<string, {
    label: string;
    getFields: string;
    save: string;
    submit: string;
    getWorkflowActions: string;
    performAction: string;
}> = {
    t_testing: {
        label: "T Testing Deposit Slip",
        getFields: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.get_t_testing_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.save_t_testing_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.submit_t_testing_deposit_slip",
        getWorkflowActions: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.get_t_testing_deposit_slip_workflow_actions",
        performAction: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.perform_t_testing_deposit_slip_workflow_action"
    },
    research_consultancy: {
        label: "Research Consultancy Deposit Slip",
        getFields: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.get_research_consultancy_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.save_research_consultancy_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.submit_research_consultancy_deposit_slip",
        getWorkflowActions: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.get_research_consultancy_deposit_slip_workflow_actions",
        performAction: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.perform_research_consultancy_deposit_slip_workflow_action"
    },
    other_event: {
        label: "Other Event Deposit Slip",
        getFields: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.get_other_event_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.save_other_event_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.submit_other_event_deposit_slip",
        getWorkflowActions: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.get_other_event_deposit_slip_workflow_actions",
        performAction: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.perform_other_event_deposit_slip_workflow_action"
    },
    e_non_routine: {
        label: "E Non Routine Deposit Slip",
        getFields: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.get_e_non_routine_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.save_e_non_routine_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.submit_e_non_routine_deposit_slip",
        getWorkflowActions: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.get_e_non_routine_deposit_slip_workflow_actions",
        performAction: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.perform_e_non_routine_deposit_slip_workflow_action"
    },
    d_consultancy: {
        label: "D Consultancy Deposit Slip",
        getFields: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.get_d_consultancy_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.save_d_consultancy_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.submit_d_consultancy_deposit_slip",
        getWorkflowActions: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.get_d_consultancy_deposit_slip_workflow_actions",
        performAction: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.perform_d_consultancy_deposit_slip_workflow_action"
    }
};

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string;
    label: string | null;
    fieldtype: string;
    options?: string | null;
    mandatory: number;
    hidden: number;
    read_only: number;
    description?: string | null;
    default?: any;
    depends_on?: string | null;
    depends_on_eval?: string | null;
}

interface LinkOption {
    value: string;
    label: string;
}

interface FormData {
    [key: string]: any;
}

// --- STYLED COMPONENTS ---
const FrappeCard = ({ title, children, className, icon }: { title?: string; children: React.ReactNode; className?: string; icon?: React.ReactNode }) => (
    <div className={cn("bg-white border border-gray-300 rounded-xl shadow-sm", className)}>
        {title && (
            <div className="px-6 py-4 border-b border-gray-300 flex items-center gap-3">
                {icon && <div className="p-2 bg-[#E0F7F6] rounded-lg">{icon}</div>}
                <h3 className="text-lg font-bold text-black uppercase tracking-tight">{title}</h3>
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'primary', type = 'button' }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline' | 'action';
    type?: 'button' | 'submit';
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-gray-400",
            variant === 'primary' && "bg-[#0EA5A4] text-white hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border border-[#0D9494]",
            variant === 'ghost' && "bg-transparent text-gray-900 hover:bg-gray-200 hover:text-black",
            variant === 'outline' && "bg-white border-2 border-gray-400 text-black hover:border-[#0EA5A4] hover:text-[#0EA5A4] hover:bg-gray-50",
            variant === 'action' && "bg-[#0EA5A4] text-white font-bold hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border-2 border-[#0D9494]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

// --- COMMENT MODAL ---
const CommentModal = ({ isOpen, onClose, onSubmit, action, isLoading }: {
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
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm {action}</h3>
                <textarea
                    className="w-full border border-gray-300 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
                    rows={4}
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <FrappeButton variant="outline" onClick={onClose} disabled={isLoading}>Cancel</FrappeButton>
                    <FrappeButton
                        variant="primary"
                        onClick={() => { onSubmit(comment); setComment(""); }}
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
const inputClasses = "w-full h-11 px-4 bg-white border border-gray-300 rounded-lg text-black font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/30 focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100 read-only:bg-gray-50";
const selectClasses = "w-full h-11 px-4 bg-white border border-gray-300 rounded-lg text-black font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/30 focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100";

// --- HELPER: Evaluate depends_on condition ---
const evaluateDependsOn = (dependsOn: string | null | undefined, formData: FormData): boolean => {
    if (!dependsOn) return true;

    try {
        // Remove 'eval:' prefix if present
        let expression = dependsOn;
        if (expression.startsWith('eval:')) {
            expression = expression.substring(5);
        }

        // Create a safe evaluation context with 'doc' as formData
        const doc = formData;

        // Handle common patterns safely
        // Pattern: doc.fieldname=='value' or doc.fieldname=="value"
        const equalityMatch = expression.match(/doc\.([\w_]+)\s*[==]+\s*['"]([^'"]*)['"]/);
        if (equalityMatch) {
            const [, fieldName, expectedValue] = equalityMatch;
            return doc[fieldName] === expectedValue;
        }

        // Pattern: doc.fieldname!='value' or doc.fieldname!=="value"
        const notEqualMatch = expression.match(/doc\.([\w_]+)\s*!==?\s*['"]([^'"]*)['"]/);
        if (notEqualMatch) {
            const [, fieldName, expectedValue] = notEqualMatch;
            return doc[fieldName] !== expectedValue;
        }

        // Pattern: doc.fieldname.includes('value')
        const includesMatch = expression.match(/doc\.([\w_]+)\.includes\(['"]([^'"]*)['"]\)/);
        if (includesMatch) {
            const [, fieldName, searchValue] = includesMatch;
            const fieldValue = doc[fieldName];
            return typeof fieldValue === 'string' && fieldValue.includes(searchValue);
        }

        // Fallback: try eval (use with caution)
        return eval(expression);
    } catch (e) {
        console.warn('Failed to evaluate depends_on:', dependsOn, e);
        return true; // Show field if evaluation fails
    }
};

// --- FORM FIELD COMPONENT ---
const FormField = memo(({ field, value, options, onChange, formData }: {
    field: Field;
    value: any;
    options?: LinkOption[];
    onChange: (fieldname: string, value: any) => void;
    formData: FormData;
}) => {
    if (!field || field.hidden || !field.label) return null;

    // Check depends_on condition
    const dependsOn = field.depends_on || field.depends_on_eval;
    if (!evaluateDependsOn(dependsOn, formData)) {
        return null;
    }

    const commonProps = {
        id: field.fieldname,
        name: field.fieldname,
        readOnly: !!field.read_only,
        disabled: !!field.read_only,
        value: value ?? '',
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange(field.fieldname, e.target.value)
    };

    const renderInput = () => {
        switch (field.fieldtype) {
            case "Link":
            case "Select":
                const selectOptions = field.fieldtype === "Select"
                    ? (field.options?.split('\n').filter(o => o) || []).map(opt => ({ value: opt, label: opt }))
                    : options || [];
                return (
                    <select {...commonProps} className={selectClasses}>
                        <option value="">Select...</option>
                        {selectOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );
            case "Currency":
            case "Float":
            case "Int":
                return <input type="number" {...commonProps} className={inputClasses} step={field.fieldtype === 'Int' ? '1' : 'any'} />;
            case "Date":
                return <input type="date" {...commonProps} className={inputClasses} />;
            case "Small Text":
            case "Text":
                return <textarea {...commonProps} rows={3} className={`${inputClasses} h-auto py-3`} />;
            default:
                return <input type="text" {...commonProps} className={inputClasses} />;
        }
    };

    return (
        <div className="space-y-2">
            <label htmlFor={field.fieldname} className="block font-bold text-black text-sm uppercase">
                {field.label}
                {!!field.mandatory && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderInput()}
            {field.description && <p className="text-xs text-gray-600">{field.description}</p>}
        </div>
    );
});

// --- WORKFLOW ACTIONS COMPONENT ---
interface FundReceivedWorkflowActionsProps {
    docname: string;
    onActionComplete: () => void;
    // Callback that returns additional args to send to the API, or null to cancel the action
    onBeforeAction?: (action: string) => Promise<{ [key: string]: any } | null>;
}

const FundReceivedWorkflowActions = ({ docname, onActionComplete, onBeforeAction }: FundReceivedWorkflowActionsProps) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_workflow_actions",
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.perform_fund_received_action"
    );

    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");

    const handleActionClick = (action: string) => {
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
                ...additionalArgs
            });

            // Add comment as activity if provided
            if (comment && comment.trim()) {
                try {
                    await addComment({
                        doctype: "Fund Received",
                        docname: docname,
                        content: `[${selectedAction}] ${comment.trim()}`
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
                {data.message.map((action) => (
                    <FrappeButton
                        key={action}
                        onClick={() => handleActionClick(action)}
                        disabled={actionLoading}
                        variant="action"
                    >
                        {action}
                    </FrappeButton>
                ))}
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
const DetailRow = ({ label, value, isCurrency = false }: { label: string; value: any; isCurrency?: boolean }) => (
    <div className="flex justify-between py-3 border-b border-gray-200 last:border-0">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={cn("text-sm font-bold", isCurrency ? "text-[#0EA5A4]" : "text-black")}>
            {isCurrency && value != null
                ? value.toLocaleString("en-IN", { style: "currency", currency: "INR" })
                : value || '-'}
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

const ActivityStream = ({ doctype, docname, onRefresh }: { doctype: string; docname: string; onRefresh?: () => void }) => {
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: activityData, mutate: refetchActivity, isLoading: isActivityLoading, error: activityError } = useFrappeGetCall<{ message: ActivityItem[] }>(
        "rndopsapp.rndopsapp.api.get_project_activity",
        { doctype, docname },
        docname ? undefined : null // Don't fetch if no docname
    );

    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

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
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <label htmlFor="fund-comment-textarea" className="block text-sm font-medium text-gray-700 mb-2">
                    Add a comment
                </label>
                <textarea
                    id="fund-comment-textarea"
                    placeholder="Type here... (Ctrl+Enter to submit)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isSubmitting}
                    className="w-full resize-none bg-white p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4] text-sm"
                    rows={3}
                />
                <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-500">{newComment.length}/1000</span>
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
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0EA5A4] border-t-transparent"></div>
                    </div>
                )}
                {activityError && (
                    <div className="text-center p-4 text-red-700 border border-red-200 rounded-lg bg-red-50">
                        <p className="text-sm font-medium">Failed to load activity</p>
                    </div>
                )}
                {activityData?.message && activityData.message.length > 0
                    ? activityData.message.map((item, index) => (
                        <div
                            key={`${item.creation}-${index}`}
                            className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                        >
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#E0F7F6] border border-gray-200 flex items-center justify-center font-semibold text-[#0EA5A4] text-xs">
                                {item.owner?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {item.owner || "Unknown User"}
                                    </p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                                        <Clock className="h-3 w-3" />
                                        {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
                                    </p>
                                </div>
                                <div
                                    className="text-sm text-gray-700 prose prose-sm max-w-none leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: item.content || "No content" }}
                                />
                            </div>
                        </div>
                    ))
                    : !isActivityLoading && (
                        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg bg-white">
                            <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-600">No activity yet.</p>
                            <p className="text-xs mt-1">Be the first to add a comment.</p>
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
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedDepositSlipType, setSelectedDepositSlipType] = useState<string>("");
    const [depositFormLoading, setDepositFormLoading] = useState(false);
    const [showActivityLog, setShowActivityLog] = useState(false);

    // Fetch fund received data (conditional fetch: only when prjreg_title exists)
    const { data: apiData, isLoading: listLoading, error: listError, mutate } = useFrappeGetCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
        prjreg_title ? { prjreg_title: prjreg_title, limit: 200, start: 0 } : undefined,
        prjreg_title || undefined
    );

    const { data: docData, isLoading: docLoading, error: docError } = useFrappeGetDoc("Fund Received", name || "");

    // Normalize fund data
    const normalizeResponse = (raw: any) => {
        if (!raw) return [];
        if (raw.message?.message && Array.isArray(raw.message.message)) return raw.message.message;
        if (raw.message && Array.isArray(raw.message)) return raw.message;
        if (Array.isArray(raw)) return raw;
        return [];
    };

    const funds = normalizeResponse(apiData);
    const listData = funds.find((f: any) => f.name === name);
    const fundData = listData || docData;

    const isLoading = listLoading || (!listData && docLoading);
    const error = listError || (!listData && docError);

    const showDepositSlip = isRndMiscellaneous && (docData?.workflow_state === "Pending Misc. Staff Approval(Deposit Slip Pending)" || listData?.workflow_state === "Pending Misc. Staff Approval(Deposit Slip Pending)");


    // Handle deposit slip type change - fetch fields from appropriate API
    const handleDepositSlipTypeChange = async (type: string) => {
        setSelectedDepositSlipType(type);
        setFields([]);
        setFormData({});

        if (!type || !DEPOSIT_SLIP_TYPES[type]) {
            return;
        }

        setDepositFormLoading(true);
        try {
            const response = await fetch(`/api/method/${DEPOSIT_SLIP_TYPES[type].getFields}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ doc_name: name || undefined })
            });
            const result = await response.json();

            if (result?.message) {
                const { fields: apiFields, link_options, prefill_data } = result.message;

                if (Array.isArray(apiFields)) {
                    const processedFields = apiFields.map((field: Field) => {
                        if (field.fieldtype === 'Section Break' || field.fieldtype === 'SectionBreak') return field;
                        if (prefill_data && prefill_data[field.fieldname] !== undefined) {
                            return { ...field, default: prefill_data[field.fieldname] };
                        }
                        return field;
                    });
                    setFields(processedFields);

                    // Initialize form data with defaults
                    const initialData: FormData = {};
                    processedFields.forEach((f: Field) => {
                        if (f.default) initialData[f.fieldname] = f.default;
                    });
                    setFormData(initialData);
                }
                setLinkOptions(prev => ({ ...prev, ...(link_options || {}) }));
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

            const response = await fetch(`/api/method/${DEPOSIT_SLIP_TYPES[selectedDepositSlipType].save}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ doc_data: JSON.stringify(dataToSubmit) })
            });
            const result = await response.json();
            console.log('Deposit Slip Save result:', result);

            if (result?.message?.name) {
                alert(`Deposit Slip saved successfully! Document: ${result.message.name}`);
            } else {
                alert("Deposit Slip saved successfully!");
            }
            mutate(); // Refresh data
        } catch (err: any) {
            console.error('Deposit Slip Submission error:', err);
            alert(`Submission Failed: ${err.message || 'Unknown Error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    // Handler for workflow actions - attaches deposit slip data when "Forward" is clicked
    const handleBeforeAction = useCallback(async (action: string): Promise<{ [key: string]: any } | null> => {
        // Only attach deposit slip data if action is "Forward" and user is RnD Miscellaneous
        if (action === "Forward" && isRndMiscellaneous) {
            // Optional: Add validation here
            // const requiredFields = fields.filter(f => f.mandatory);
            // const missingFields = requiredFields.filter(f => !formData[f.fieldname]);
            // if (missingFields.length > 0) {
            //     alert(`Please fill required fields: ${missingFields.map(f => f.label).join(', ')}`);
            //     return null; // Cancel action
            // }

            return {
                deposit_slip_data: JSON.stringify(formData)
            };
        }
        return {}; // No extra data for other actions
    }, [isRndMiscellaneous, formData]);



    if (isLoading) return <GlobalLoader isLoading={true} />;

    if (error || !fundData) {
        return (
            <div className="bg-gray-100 min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8">
                    <FrappeCard className="text-center py-16">
                        <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h2 className="text-xl font-bold text-black mb-2 uppercase">Fund Details Not Found</h2>
                        <p className="text-gray-900 mb-6">The requested fund details could not be loaded.</p>
                        <FrappeButton onClick={() => navigate(-1)}>Go Back</FrappeButton>
                    </FrappeCard>
                </main>
            </div>
        );
    }

    const { workflow_state, fund_received_amt, bank_account, received_amt_breakup, fund_transactions, sanction_ref_no } = fundData;

    // Group fields by sections with depends_on support
    const groupFieldsBySections = () => {
        const sections: { title: string; fields: Field[]; dependsOn?: string | null }[] = [];
        let currentSection: { title: string; fields: Field[]; dependsOn?: string | null } | null = null;

        for (const field of fields) {
            if (field.fieldtype === 'Section Break') {
                if (currentSection && currentSection.fields.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = {
                    title: field.label || '',
                    fields: [],
                    dependsOn: field.depends_on || field.depends_on_eval
                };
            } else if (field.fieldtype !== 'Column Break' && field.fieldtype !== 'HTML' && !field.hidden && currentSection) {
                currentSection.fields.push(field);
            }
        }
        if (currentSection && currentSection.fields.length > 0) {
            sections.push(currentSection);
        }
        // Filter sections based on depends_on
        return sections.filter(s => s.fields.length > 0 && evaluateDependsOn(s.dependsOn, formData));
    };

    const sections = groupFieldsBySections();

    return (
        <div className="bg-gray-100 min-h-screen">
            <GlobalLoader isLoading={isSubmitting} />
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                <FrappeCard className="mb-6 p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                            >
                                <ArrowLeft className="h-5 w-5 text-gray-900" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-black uppercase tracking-tight">Fund Details & Deposit Slip</h1>
                                <p className="text-sm text-gray-700 font-medium mt-0.5">{name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <FundReceivedWorkflowActions
                                docname={name || ""}
                                onActionComplete={() => mutate()}
                                onBeforeAction={handleBeforeAction}
                            />
                            <span className={cn("px-3 py-1.5 rounded-md border font-bold text-sm", {
                                "bg-amber-100 text-amber-800 border-amber-300": workflow_state === "Draft",
                                "bg-blue-100 text-blue-800 border-blue-300": workflow_state === "Submitted",
                                "bg-emerald-100 text-emerald-800 border-emerald-300": workflow_state === "Approved",
                                "bg-red-100 text-red-800 border-red-300": workflow_state === "Rejected",
                            })}>
                                {workflow_state}
                            </span>
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

                {/* Side by Side Layout - with Deposit Slip and Fund Details */}
                <div className={cn("grid gap-6 grid-cols-1", showDepositSlip ? "lg:grid-cols-2" : "lg:grid-cols-1")}>
                    {/* LEFT SIDE: Deposit Slip Form - Show only for specific workflow state */}
                    {showDepositSlip && (
                        <div className="lg:col-span-1 space-y-6">
                            <FrappeCard title="Deposit Slip Form" icon={<FileText className="h-4 w-4 text-[#0EA5A4]" />}>
                                <div className="space-y-6">
                                    {/* Deposit Slip Type Selector */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-800">
                                            Select Deposit Slip Type <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedDepositSlipType}
                                                onChange={(e) => handleDepositSlipTypeChange(e.target.value)}
                                                className="w-full h-11 px-4 pr-10 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4] appearance-none"
                                            >
                                                <option value="">-- Select Type --</option>
                                                {Object.entries(DEPOSIT_SLIP_TYPES).map(([key, config]) => (
                                                    <option key={key} value={key}>{config.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Loading State */}
                                    {depositFormLoading && (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0EA5A4]"></div>
                                        </div>
                                    )}

                                    {/* Dynamic Form Fields */}
                                    {!depositFormLoading && selectedDepositSlipType && fields.length > 0 && (
                                        <>
                                            {sections.map((section, idx) => (
                                                <div key={idx} className="space-y-4">
                                                    {section.title && (
                                                        <h4 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-2">
                                                            {section.title}
                                                        </h4>
                                                    )}
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {section.fields.map(field => (
                                                            <FormField
                                                                key={field.fieldname}
                                                                field={field}
                                                                value={formData[field.fieldname]}
                                                                options={linkOptions[field.options as string] || linkOptions[field.fieldname]}
                                                                onChange={handleChange}
                                                                formData={formData}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                                <FrappeButton variant="outline" onClick={() => setSelectedDepositSlipType("")}>
                                                    Cancel
                                                </FrappeButton>
                                                <FrappeButton
                                                    variant="primary"
                                                    onClick={handleSaveDepositSlip}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? 'Saving...' : 'Save Deposit Slip'}
                                                </FrappeButton>
                                            </div>
                                        </>
                                    )}

                                    {/* No Type Selected */}
                                    {!depositFormLoading && !selectedDepositSlipType && (
                                        <div className="text-center py-8 text-gray-500">
                                            <p className="text-sm">Select a deposit slip type to load the form.</p>
                                        </div>
                                    )}

                                    {/* No Fields */}
                                    {!depositFormLoading && selectedDepositSlipType && fields.length === 0 && (
                                        <div className="text-center py-8 text-yellow-600">
                                            <p className="text-sm font-semibold">No form fields found for this type.</p>
                                        </div>
                                    )}
                                </div>
                            </FrappeCard>
                        </div>
                    )}

                    {/* CENTER: Fund Details */}
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <FrappeCard className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-[#E0F7F6] rounded-lg">
                                        <IndianRupee className="h-4 w-4 text-[#0EA5A4]" />
                                    </div>
                                    <span className="font-bold text-gray-700 text-xs uppercase">Total Amount</span>
                                </div>
                                <p className="text-2xl font-extrabold text-[#0EA5A4]">
                                    {(fund_received_amt || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </p>
                            </FrappeCard>
                            <FrappeCard className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-gray-100 rounded-lg">
                                        <Building2 className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <span className="font-bold text-gray-700 text-xs uppercase">Bank Account</span>
                                </div>
                                <p className="text-sm font-bold text-gray-900 truncate">{bank_account || '-'}</p>
                            </FrappeCard>
                        </div>

                        {/* Sanction Reference */}
                        <FrappeCard title="Sanction Reference" icon={<Calculator className="h-4 w-4 text-[#0EA5A4]" />}>
                            <DetailRow label="Sanction Reference" value={sanction_ref_no} />
                        </FrappeCard>

                        {/* Fund Info */}
                        <FrappeCard title="Fund Information" icon={<Calculator className="h-4 w-4 text-[#0EA5A4]" />}>
                            <div className="space-y-1">
                                <DetailRow label="Total Amount Received" value={fund_received_amt} isCurrency />
                                <DetailRow label="Bank Account" value={bank_account} />
                                <DetailRow label="Workflow State" value={workflow_state} />
                            </div>
                        </FrappeCard>

                        {/* Budget Breakup */}
                        <FrappeCard title="Budget Breakup" icon={<FileText className="h-4 w-4 text-[#0EA5A4]" />}>
                            <div className="overflow-x-auto border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-200">
                                        <tr className="divide-x divide-gray-300">
                                            <th className="px-3 py-2 text-left text-xs font-bold text-black uppercase">Account Head</th>
                                            <th className="px-3 py-2 text-right text-xs font-bold text-black uppercase">Amount</th>
                                            <th className="px-3 py-2 text-center text-xs font-bold text-black uppercase">Year</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300 bg-white">
                                        {received_amt_breakup?.map((item: any, idx: number) => (
                                            <tr key={item.name || idx} className="divide-x divide-gray-300 hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm font-medium text-black">{item.account_head}</td>
                                                <td className="px-3 py-2 text-sm text-right font-bold text-[#0EA5A4]">
                                                    {item.amount_received?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-center text-gray-900">{item.budget_year_funds_receive}</td>
                                            </tr>
                                        ))}
                                        {(!received_amt_breakup || received_amt_breakup.length === 0) && (
                                            <tr>
                                                <td colSpan={3} className="px-3 py-6 text-center text-gray-500">No breakup details</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </FrappeCard>

                        {/* Transactions */}
                        <FrappeCard title="Transactions" icon={<CreditCard className="h-4 w-4 text-[#0EA5A4]" />}>
                            <div className="overflow-x-auto border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-200">
                                        <tr className="divide-x divide-gray-300">
                                            <th className="px-3 py-2 text-left text-xs font-bold text-black uppercase">Date</th>
                                            <th className="px-3 py-2 text-left text-xs font-bold text-black uppercase">Transaction No</th>
                                            <th className="px-3 py-2 text-right text-xs font-bold text-black uppercase">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300 bg-white">
                                        {fund_transactions?.map((item: any, idx: number) => (
                                            <tr key={item.name || idx} className="divide-x divide-gray-300 hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm font-mono text-gray-900">{item.transaction_date}</td>
                                                <td className="px-3 py-2 text-sm font-bold text-black">{item.transaction_number}</td>
                                                <td className="px-3 py-2 text-sm text-right font-bold text-[#0EA5A4]">
                                                    {item.amount?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!fund_transactions || fund_transactions.length === 0) && (
                                            <tr>
                                                <td colSpan={3} className="px-3 py-6 text-center text-gray-500">No transactions</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </FrappeCard>
                    </div>
                </div>

                {/* Floating Activity Log Button */}
                <button
                    onClick={() => setShowActivityLog(true)}
                    className="fixed bottom-8 right-8 p-4 bg-[#0EA5A4] text-white rounded-full shadow-lg hover:bg-[#0C8F8E] transition-all z-40 flex items-center gap-2"
                >
                    <MessageSquare className="h-6 w-6" />
                    <span className="font-semibold hidden md:block">Activity Log</span>
                </button>

                {/* Activity Log Panel (Slide Over) */}
                {showActivityLog && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                            onClick={() => setShowActivityLog(false)}
                        ></div>

                        {/* Panel */}
                        <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-[#0EA5A4]" />
                                    <h3 className="font-bold text-lg text-gray-900">Activity Log</h3>
                                </div>
                                <button
                                    onClick={() => setShowActivityLog(false)}
                                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
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
