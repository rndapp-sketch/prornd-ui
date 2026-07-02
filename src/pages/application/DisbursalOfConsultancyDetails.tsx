import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import {
    useFrappePostCall,
    useFrappeGetCall,
    useFrappeAuth,
} from "frappe-react-sdk";
import { disbursalOfConsultancyAPI } from "@/services/apiService";
import { cn } from "@/lib/utils";
import {
    CalendarIcon,
    FileSpreadsheetIcon as LedgerIcon,
    EditIcon,
    Send,
    Printer,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { GlobalLoader } from "@/components/ui/global-loader";
import { Textarea } from "@/components/ui/textarea";
import {
    DynamicFormRenderer,
    type FormField,
    type LinkOption,
} from "@/components/forms/DynamicFormRenderer";
import DisbursalOfConsultancyActionButtons from "@/components/DisbursalOfConsultancyActionButtons";
import { CommitPayment } from "@/components/CommitPayment";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { useUserRoles } from "@/components/UserRole";
import { ProjectLedgerModal } from "@/components/ProjectLedgerModal";
import { ActivityLog } from "@/components/ActivityLog";
import ViewProjectButton from "@/components/ViewProjectButton";
import { P11PrintModal } from "@/components/P11PrintModal";
import { generateDisbursalOfConsultancyHtml } from "@/utils/disbursalOfConsultancyPrint";

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        child_table_fields?: Record<string, any[]>;
    };
}

interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type: string;
}

// --- UI COMPONENTS ---
const FrappeCard = ({
    title,
    children,
    className = "",
}: {
    title?: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div
        className={cn(
            "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm",
            className,
        )}
    >
        {title && (
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
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
    variant = "ghost",
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: "primary" | "ghost" | "outline";
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400",
            variant === "primary" &&
                "bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-md border border-[#C66A4E]",
            variant === "ghost" &&
                "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700",
            variant === "outline" &&
                "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className,
        )}
    >
        {children}
    </button>
);

// --- ACTIVITY STREAM ---
const ActivityStream = ({
    doctype,
    docname,
}: {
    doctype: string;
    docname: string;
}) => {
    const { data: activityData, mutate: refetch } = useFrappeGetCall<{
        message: ActivityItem[];
    }>("rndopsapp.rndopsapp.api.get_project_activity", { doctype, docname });

    useEffect(() => {
        refetch();
    }, [docname]);

    return (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {activityData?.message?.length ? (
                activityData.message.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center font-bold text-[#D97757] text-xs">
                            {item.owner?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                            <div
                                className="text-sm text-zinc-800 dark:text-zinc-200 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: item.content }}
                            />
                            <p className="text-xs text-zinc-500 mt-0.5">
                                {item.owner} ·{" "}
                                {item.creation
                                    ? new Date(item.creation).toLocaleString()
                                    : ""}
                            </p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-sm text-zinc-500 italic">No activity yet.</p>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
const DisbursalOfConsultancyDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // Sidebar state
    const [sidebarComment, setSidebarComment] = useState("");
    const [isAddingComment, setIsAddingComment] = useState(false);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);

    // Commit / Payment state
    const [commitHead, setCommitHead] = useState("");
    // commitAmount moved to CommitPayment component
    const [paymentAmount, setPaymentAmount] = useState("");
    // Staged commit: tracked locally because consultancy commits are staged (ledger not updated until Dean approves)
    const [stagedCommit, setStagedCommit] = useState<{ head: string; amount: number } | null>(null);

    // --- API HOOKS ---
    const {
        call: fetchFormData,
        result: formDataResult,
        error: formDataError,
    } = useFrappePostCall<FormDataResponse>(disbursalOfConsultancyAPI.getFields);
    const { call: fetchDocument } = useFrappePostCall<{ message: any }>(
        "frappe.client.get",
    );
    const { call: fetchUsersList } = useFrappePostCall<{ message: any[] }>(
        "frappe.client.get_list",
    );
    const { call: addComment } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );
    const { call: submitDocument } = useFrappePostCall<{ message: any }>(disbursalOfConsultancyAPI.submit);
    const { call: stageCommit } = useFrappePostCall("rndopsapp.rndopsapp.commitPayment.submit_commit_data");
    // submitCommit moved to CommitPayment component
    const { call: submitPayment, loading: isPaying } = useFrappePostCall(
        "rndopsapp.rndopsapp.commitPayment.submit_payment_data",
    );

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);

    // --- PROJECT BUDGET ---
    // Consultancy uses disbursal_project_number as the project identifier
    const projectTitle =
        formData?.disbursal_project_number ||
        formData?.project_title ||
        "";

    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);

    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch(
                    '/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0',
                    { credentials: "include" },
                );
                const result = await response.json();
                if (result?.data) {
                    setBudgetHeadList(
                        result.data.map((item: any) => ({
                            name: item.budget_head,
                            id: item.id,
                        })),
                    );
                }
            } catch (err) {
                console.error("Failed to fetch Budget Heads:", err);
            }
        };
        fetchBudgetHeads();
    }, []);

    const {
        budgetData,
        heads: budgetHeads,
        actualBalance,
    } = useProjectBudget(projectTitle);

    const balanceApiParams = React.useMemo(
        () => ({ project_number: projectTitle }),
        [projectTitle],
    );
    const balanceApiOptions = React.useMemo(
        () => ({ revalidateOnFocus: false, isPaused: () => !projectTitle }),
        [projectTitle],
    );
    const { data: projectAmountsData } = useFrappeGetCall<{
        message: {
            status: string;
            data: {
                availableCommitAmount: number;
                availablePaymentAmount: number;
            };
        };
    }>(
        "rndopsapp.rndopsapp.commitPayment.get_project_available_amounts",
        balanceApiParams,
        balanceApiOptions,
    );

    const projectAmountsResult =
        (projectAmountsData as any)?.message?.data ??
        (projectAmountsData as any)?.data ??
        {};
    const totalCommitableBalance =
        projectAmountsResult?.availablePaymentAmount ?? 0;

    const linkedCommitment = budgetData.find(
        (e) =>
            (e.ref === (id || "") || e.frapAppId === (id || "")) &&
            e.type === "commitment",
    );

    const isCommitted = !!linkedCommitment || !!stagedCommit;

    // Unified commitment display: prefer ledger data (linkedCommitment), fall back to staged
    const displayCommitment = linkedCommitment
        ? { head: linkedCommitment.head, committed: linkedCommitment.committed }
        : stagedCommit
          ? { head: stagedCommit.head, committed: stagedCommit.amount }
          : null;

    useEffect(() => {
        if (budgetHeads.length > 0 && !commitHead) {
            setCommitHead(budgetHeads[0]);
        }
    }, [budgetHeads]);

    useEffect(() => {
        if (linkedCommitment) {
            setCommitHead(linkedCommitment.head || "");
            if (!paymentAmount)
                setPaymentAmount(String(linkedCommitment.committed));
        } else if (stagedCommit) {
            setCommitHead(stagedCommit.head);
            if (!paymentAmount)
                setPaymentAmount(String(stagedCommit.amount));
        }
    }, [linkedCommitment, stagedCommit]);

    const isRnDStaff = roles.some(
        (r) =>
            r === "RnD Staff" ||
            r === "R&D Staff" ||
            r === "Research and Development Staff" ||
            r === "System Manager" ||
            r === "staff, RnD" ||
            r === "Hos, RnD (Head of Section, RnD)",
    );

    // --- DATA FETCHING ---
    useEffect(() => {
        if (id) {
            fetchFormData({ doc_name: id });
        }
    }, [id, refreshKey]);

    useEffect(() => {
        const loadDocument = async () => {
            if (formDataResult?.message && id) {
                const {
                    fields: apiFields,
                    link_options,
                    child_table_fields,
                } = formDataResult.message;

                // Merge child_fields into Table fields, force web_mail_id as Link
                const enhancedFields = (apiFields || []).map((field: FormField) => {
                    if (
                        field.fieldtype === "Table" &&
                        child_table_fields &&
                        child_table_fields[field.fieldname]
                    ) {
                        const processedChildFields = child_table_fields[
                            field.fieldname
                        ].map((cf: any) => {
                            if (cf.fieldname === "web_mail_id") {
                                return { ...cf, fieldtype: "Link", options: "User" };
                            }
                            return cf;
                        });
                        return { ...field, child_fields: processedChildFields };
                    }
                    return field;
                });

                setFields(enhancedFields);

                let baseLinkOptions = link_options || {};

                // Fetch Budget Heads for link options
                try {
                    const headsRes = await fetchUsersList({
                        doctype: "Budget Head",
                        fields: ["name", "budget_head"],
                        limit_page_length: 0,
                    });
                    if (headsRes?.message) {
                        baseLinkOptions["account_head"] = headsRes.message.map(
                            (h: any) => ({
                                value: h.name,
                                label: h.budget_head || h.name,
                            }),
                        );
                    }
                } catch (_) {}

                // Fetch Users for web_mail_id link options
                try {
                    const usersRes = await fetchUsersList({
                        doctype: "User",
                        fields: ["name", "full_name"],
                        filters: [["enabled", "=", 1]],
                        limit_page_length: 0,
                    });
                    if (usersRes?.message) {
                        baseLinkOptions["web_mail_id"] = usersRes.message.map(
                            (u: any) => ({
                                value: u.name,
                                label: u.full_name
                                    ? `${u.full_name} (${u.name})`
                                    : u.name,
                            }),
                        );
                        baseLinkOptions["User"] = baseLinkOptions["web_mail_id"];
                    }
                } catch (_) {}

                setLinkOptions(baseLinkOptions);

                // Fetch actual document
                try {
                    const doc = await fetchDocument({
                        doctype: "Disbursal of Consultancy",
                        name: id,
                    });
                    if (doc?.message) {
                        setFormData(doc.message);
                    }
                } catch (err) {
                    console.error("Error fetching document:", err);
                }

                setLoading(false);
            }
            if (formDataError) {
                console.error("Failed to load form data:", formDataError);
                setLoading(false);
            }
        };

        loadDocument();
    }, [formDataResult, formDataError, id]);

    const handleRefresh = useCallback(() => {
        setRefreshKey((k) => k + 1);
        setLoading(true);
    }, []);

    // --- SUBMIT DRAFT ---
    const handleSubmitDraft = async () => {
        if (!id || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const submitRes = await submitDocument({ docname: id });
            const msg = submitRes?.message;
            if (msg?.status === "success" || msg?.status === "info" || msg?.docname) {
                // Stage commit so Kafka fires on Dean approval
                try {
                    await stageCommit({
                        doctype: "Disbursal of Consultancy",
                        frapAppId: id,
                        name: id,
                        project_name: formData.disbursal_project_number || "",
                        commit_amount: formData.total_disbursal_amount ?? 0,
                        budget_head: "Consultancy",
                    });
                } catch (commitErr) {
                    console.warn("Commit staging failed (non-fatal):", commitErr);
                }
                alert("Disbursal of Consultancy submitted successfully!");
                handleRefresh();
            } else {
                throw new Error(msg?.message || "Submission failed");
            }
        } catch (err: any) {
            alert(`Submission failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // handleCommit moved to CommitPayment component

    // --- PAYMENT ---
    const handlePayment = async () => {
        if (!paymentAmount || !commitHead || !id || !formData) {
            alert("Please select a budget head and enter an amount.");
            return;
        }
        try {
            await submitPayment({
                doctype: "Disbursal of Consultancy",
                name: id,
                project_name: projectTitle,
                payment_amount: parseFloat(paymentAmount),
                budget_head: commitHead,
                bmr: "",
            });
            alert("Payment recorded successfully!");
            setPaymentAmount("");
            window.location.reload();
        } catch (error: any) {
            alert(`Payment failed: ${error.message || "Unknown error"}`);
        }
    };

    // --- COMMENT ---
    const handleSidebarCommentSubmit = async () => {
        if (!sidebarComment.trim() || !id) return;
        setIsAddingComment(true);
        try {
            await addComment({
                doctype: "Disbursal of Consultancy",
                docname: id,
                content: sidebarComment,
            });
            setSidebarComment("");
            handleRefresh();
        } catch {
            alert("Failed to submit comment.");
        } finally {
            setIsAddingComment(false);
        }
    };

    // No-op handlers for read-only form
    const noOp = () => {};
    const noOpTable = () => {};

    // --- RENDER ---
    if (loading) return <GlobalLoader isLoading={true} />;

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                {/* Header */}
                <PageHeader
                    title={formData.name || id || "Disbursal of Consultancy"}
                    status={formData.workflow_state || "Draft"}
                    projectName={formData.project_title}
                    projectNumber={formData.disbursal_project_number}
                >
                    <ViewProjectButton doctype="Disbursal of Consultancy" data={formData} />
                    {id && (
                        <button
                            onClick={() => setIsPrintModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
                        >
                            <Printer className="w-4 h-4" />
                            Print / PDF
                        </button>
                    )}
                    {(formData.workflow_state === "Draft" ||
                        !formData.workflow_state) &&
                        id && (
                            <>
                                <button
                                    onClick={() =>
                                        navigate(`/disbursal-of-consultancy-form/${id}`)
                                    }
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
                                >
                                    <EditIcon className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={handleSubmitDraft}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm transition-all disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                    {isSubmitting ? "Submitting..." : "Submit Application"}
                                </button>
                            </>
                        )}
                </PageHeader>

                <P11PrintModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    htmlContent={
                        isPrintModalOpen
                            ? generateDisbursalOfConsultancyHtml(formData)
                            : ""
                    }
                    docName={formData.name || id || ""}
                />

                {/* Workflow Action Buttons — only after submission */}
                {id &&
                    formData.workflow_state &&
                    formData.workflow_state !== "Draft" && (
                        <div className="mb-6">
                            <DisbursalOfConsultancyActionButtons
                                docname={id}
                                onActionComplete={handleRefresh}
                            />
                        </div>
                    )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Content — read-only form */}
                    <div className="lg:col-span-3">
                        <FrappeCard>
                            <DynamicFormRenderer
                                fields={fields}
                                formData={formData}
                                linkOptions={linkOptions}
                                onChange={noOp}
                                onFileChange={noOpTable}
                                onTableRowChange={noOpTable}
                                onTableFileChange={noOpTable}
                                onAddTableRow={noOp}
                                onDeleteTableRow={noOp}
                                readOnly={true}
                            />
                        </FrappeCard>
                    </div>

                    {/* Sidebar */}
                    <aside className="lg:col-span-1 space-y-5">
                        {/* Status */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                                Status
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-600 dark:text-zinc-400">
                                        Workflow State
                                    </span>
                                    <span
                                        className={cn(
                                            "px-3 py-1 text-xs font-bold rounded-full",
                                            formData.workflow_state === "Approved" &&
                                                "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                            formData.workflow_state === "Rejected" &&
                                                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                            formData.workflow_state === "Draft" &&
                                                "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
                                            !["Approved", "Rejected", "Draft"].includes(
                                                formData.workflow_state || "",
                                            ) &&
                                                "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                        )}
                                    >
                                        {formData.workflow_state || "Draft"}
                                    </span>
                                </div>
                                {formData.modified && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-600 dark:text-zinc-400">
                                            Last Modified
                                        </span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                                            <CalendarIcon className="w-3 h-3" />
                                            {new Date(
                                                formData.modified,
                                            ).toLocaleDateString("en-IN")}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Project Budget */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                Project Budget
                            </h3>
                            <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 mb-3">
                                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Commitable Balance
                                </p>
                                <p className="text-lg font-bold text-[#D97757]">
                                    ₹{" "}
                                    {totalCommitableBalance.toLocaleString("en-IN")}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsLedgerOpen(true)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-[#D97757] font-bold text-sm hover:bg-[#B2DFDB] transition-colors"
                            >
                                <LedgerIcon className="w-4 h-4" />
                                View Project Ledger
                            </button>
                        </div>

                        {/* Activity Stream */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                Latest Activity
                            </h3>
                            {id && (
                                <ActivityStream
                                    doctype="Disbursal of Consultancy"
                                    docname={id}
                                />
                            )}
                        </div>

                        {/* Document Activity Log (new endpoint) */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            {id && <ActivityLog doctype="Disbursal of Consultancy" docname={id} />}
                        </div>

                        {/* Add Comment */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                                Add Comment
                            </h3>
                            <Textarea
                                rows={3}
                                placeholder="Type your comment here..."
                                value={sidebarComment}
                                onChange={(e) => setSidebarComment(e.target.value)}
                                className="w-full mb-3 text-sm"
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

                        {/* Make a Commitment / Committed Data Display */}
                        {(formData.workflow_state === "Pending Staff Approval" ||
                            formData.workflow_state === "Approved") &&
                            isRnDStaff &&
                            id && (
                                <CommitPayment
                                    doctype="Disbursal of Consultancy"
                                    docName={id}
                                    projectName={projectTitle}
                                    budgetHeads={budgetHeads}
                                    actualBalance={actualBalance}
                                    onCommitSuccess={(head, amount) => {
                                        setStagedCommit({ head, amount });
                                    }}
                                />
                            )}

                        {/* Record Payment */}
                        {(formData.workflow_state === "Pending Staff Approval" ||
                            formData.workflow_state === "Approved") &&
                            isRnDStaff && (
                                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                    <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                        Record Payment
                                    </h3>
                                    {isCommitted ? (
                                        <div className="space-y-4">
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-1">
                                                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                                                    Linked Commitment
                                                </p>
                                                <div className="flex justify-between items-end">
                                                    <p className="text-sm font-medium text-blue-900">
                                                        {displayCommitment?.head}
                                                    </p>
                                                    <p className="text-lg font-bold text-blue-700">
                                                        ₹{" "}
                                                        {Number(displayCommitment?.committed || 0).toLocaleString(
                                                            "en-IN",
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                    Payment Amount (₹)
                                                </label>
                                                <input
                                                    type="number"
                                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25"
                                                    placeholder="e.g., 5000"
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                                    max={displayCommitment?.committed}
                                                />
                                                <p className="text-xs text-zinc-500 mt-1">
                                                    Max: ₹{" "}
                                                    {Number(displayCommitment?.committed || 0).toLocaleString("en-IN")}
                                                </p>
                                            </div>
                                            <FrappeButton
                                                className="w-full"
                                                variant="outline"
                                                onClick={handlePayment}
                                                disabled={
                                                    isPaying ||
                                                    !paymentAmount ||
                                                    parseFloat(paymentAmount) >
                                                        (displayCommitment?.committed || 0)
                                                }
                                            >
                                                {isPaying ? "Processing..." : "Submit Payment"}
                                            </FrappeButton>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 px-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
                                            <div className="mx-auto w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-3">
                                                <LedgerIcon className="w-5 h-5 text-zinc-400" />
                                            </div>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                Commitment Required
                                            </p>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                Make a commitment above before recording payment.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                    </aside>
                </div>
            </main>

            {/* Budget Ledger Modal */}
            {isLedgerOpen && (
                <ProjectLedgerModal
                    isOpen={isLedgerOpen}
                    onClose={() => setIsLedgerOpen(false)}
                    projectName={projectTitle}
                    budgetHeadList={budgetHeadList}
                />
            )}
        </div>
    );
};

export default DisbursalOfConsultancyDetails;
