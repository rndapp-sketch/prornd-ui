import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppSidebar } from "../../components/RndSidebar";
import {
    useFrappePostCall,
    useFrappeGetCall,
    useFrappeAuth,
} from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
    CalendarIcon,
    UserIcon,
    FileTextIcon,
    CheckCircle2 as CheckCircleIcon,
    XCircle as XCircleIcon,
    ChevronDown,
    ChevronRight,
    Pencil as PencilIcon,
    AlertTriangle,
    FileSpreadsheetIcon as LedgerIcon,
    Printer
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { GlobalLoader } from "@/components/ui/global-loader";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { useUserRoles } from "../../components/UserRole";
import { ProjectLedgerModal } from "../../components/ProjectLedgerModal";
import { CommitPayment } from "@/components/CommitPayment";
import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";
import { ActivityLog } from "@/components/ActivityLog";
import { P11PrintModal } from "@/components/P11PrintModal";
import { generateTemporaryAdvanceHtml } from "@/utils/temporaryAdvancePrint";
import ViewProjectButton from "@/components/ViewProjectButton";
import { ToWords } from "to-words";
import { DynamicFormRenderer, type FormField, type LinkOption } from "@/components/forms/DynamicFormRenderer";
import { temporaryAdvanceAPI } from "@/services/apiService";
import { resolveDepartmentLabel } from "@/utils/resolveDepartmentLabel";
import { ErrorModal } from "../../components/ErrorModal";
import { parseFrappeError } from "../../utils/errorUtils";
import { CancellationStatusBanner } from "../../components/CancellationStatusBanner";

const toWords = new ToWords({ localeCode: "en-IN", converterOptions: { ignoreDecimal: false } });

// --- TYPE DEFINITIONS ---
interface TemporaryAdvanceData {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    workflow_state: string;
    project_code: string;
    project_name?: string;
    amount?: number;
    amount_applied?: number;
    amount_in_words?: string;
    account_head?: string;
    applying_for_select?: string;
    advance_for_id?: string;
    advance_for_department?: string;
    advance_for_designation?: string;
    applicant_webmail?: string;
    applicant_department?: string;
    applicant_designation?: string;
    applicant_category?: string;
    bank_name?: string;
    account?: string;
    bank_account_number?: string;
    ifsc_code?: string;
    justification?: string;
    reason?: string;
    purpose?: string;
    documents?: string;
    comments?: string;
    declaration_settlement?: 0 | 1;
    declaration_rate_contract?: 0 | 1;
    [key: string]: any;
}

// --- DESIGN SYSTEM ---
const FrappeCard = ({
    title,
    children,
    className = "",
}: {
    title?: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={cn(
        "bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm overflow-hidden",
        className,
    )}>
        {title && (
            <div className="px-[22px] py-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">
                    {title}
                </h3>
            </div>
        )}
        <div className="p-[18px] md:p-6">{children}</div>
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
    variant?: "primary" | "ghost" | "outline" | "action";
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
            variant === "primary" && "bg-[#D97757] text-white hover:bg-[#D97757] shadow-md hover:shadow-lg border border-[#C66A4E]",
            variant === "ghost" && "bg-transparent text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]",
            variant === "outline" && "bg-white border border-[#E4E4E7] text-[#3F3F46] hover:bg-[#FAFAF9] rounded-lg dark:bg-[#27272A] dark:border-[#3F3F46] dark:text-[#E4E4E7] dark:hover:bg-[#3F3F46]",
            variant === "action" && "bg-[#D97757] text-white font-bold hover:bg-[#D97757] shadow-md hover:shadow-lg border-2 border-[#C66A4E]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className,
        )}
    >
        {children}
    </button>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">
        {children}
    </label>
);

const FieldValue = ({ children }: { children: React.ReactNode }) => (
    <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{children}</div>
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
            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-2xl shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mb-4">
                    Confirm: {action}
                </h3>
                <textarea
                    className="w-full border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] text-[#3F3F46] dark:text-[#E4E4E7] p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                    rows={4}
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <FrappeButton variant="outline" onClick={onClose} disabled={isLoading}>Cancel</FrappeButton>
                    <FrappeButton variant="primary" onClick={() => onSubmit(comment)} disabled={isLoading}>
                        {isLoading ? "Processing..." : "Confirm"}
                    </FrappeButton>
                </div>
            </div>
        </div>
    );
};

// --- ACTIONS DROPDOWN ---
const ActionsDropdown = ({
    docname,
    workflowState,
    onActionComplete,
    onEdit,
    onSubmit,
    isSubmitting,
    commitRequired = false,
}: {
    docname: string;
    workflowState: string;
    onActionComplete: () => void;
    onEdit: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    commitRequired?: boolean;
}) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.get_temporary_advance_workflow_actions",
        { docname },
    );
    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.perform_temporary_advance_action",
    );

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");
    const [errorModal, setErrorModal] = useState<{
        open: boolean;
        title: string;
        message: string;
    }>({ open: false, title: "Action Failed", message: "" });
    const toggleBtnRef = React.useRef<HTMLButtonElement>(null);
    const dropdownPortalRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!dropdownOpen) return;
        const handleOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (!toggleBtnRef.current?.contains(target) && !dropdownPortalRef.current?.contains(target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [dropdownOpen]);

    const handleToggleDropdown = () => {
        if (!dropdownOpen && toggleBtnRef.current) {
            const rect = toggleBtnRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
        }
        setDropdownOpen((o) => !o);
    };

    const handleWorkflowClick = (action: string) => {
        setDropdownOpen(false);
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            setErrorModal({
                open: true,
                title: "Action Failed",
                message: parseFrappeError(error),
            });
        }
    };

    const isDraft = workflowState === "Draft" || !workflowState;
    const workflowActions = (data?.message || []).filter((a) => a.toLowerCase() !== "submit");

    const categorise = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes("forward") || a.includes("approve") || a.includes("submit") || a.includes("recommend")) return "forward";
        if (a.includes("reject") || a.includes("cancel")) return "reject";
        return "neutral";
    };

    const forwardActions = workflowActions.filter((a) => categorise(a) === "forward");
    const neutralActions = workflowActions.filter((a) => categorise(a) === "neutral");
    const rejectActions = workflowActions.filter((a) => categorise(a) === "reject");

    const itemStyle = (action: string) => {
        const cat = categorise(action);
        if (cat === "forward") return {
            icon: <CheckCircleIcon className="h-3.5 w-3.5" />,
            cls: "text-[#D97757] hover:bg-orange-50 dark:hover:bg-orange-900/20",
            iconCls: "text-[#D97757]",
        };
        if (cat === "reject") return {
            icon: <XCircleIcon className="h-3.5 w-3.5" />,
            cls: "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
            iconCls: "text-red-500",
        };
        return {
            icon: <ChevronRight className="h-3.5 w-3.5" />,
            cls: "text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-700",
            iconCls: "text-zinc-400 dark:text-zinc-500",
        };
    };

    const isLoading = actionsLoading || actionLoading || isSubmitting;

    if (!actionsLoading && workflowActions.length === 0 && !isDraft) return null;

    return (
        <>
            <div className="relative">
                <button
                    ref={toggleBtnRef}
                    onClick={handleToggleDropdown}
                    disabled={isLoading}
                    className={cn(
                        "inline-flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg shadow-sm transition-all disabled:opacity-50",
                        dropdownOpen
                            ? "bg-[#D97757] text-white border border-[#c66a4e]"
                            : "bg-[#FFF7ED] dark:bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/40 hover:bg-[#D97757] hover:text-white dark:hover:bg-[#D97757]/30",
                    )}
                >
                    {isLoading ? "Processing…" : "Actions"}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && createPortal(
                    <div
                        ref={dropdownPortalRef}
                        style={{ position: "absolute", top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
                        className="min-w-[210px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-700">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                                Actions
                            </span>
                        </div>

                        {commitRequired && (
                            <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                A commitment must be submitted before proceeding.
                            </div>
                        )}

                        {isDraft && (
                            <>
                                <button
                                    onClick={() => { setDropdownOpen(false); onEdit(); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    <span className="text-zinc-400"><PencilIcon className="h-3.5 w-3.5" /></span>
                                    Edit
                                </button>
                                <button
                                    onClick={() => { setDropdownOpen(false); onSubmit(); }}
                                    disabled={isSubmitting}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left text-[#D97757] hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
                                >
                                    <span className="text-[#D97757]"><CheckCircleIcon className="h-3.5 w-3.5" /></span>
                                    Submit
                                </button>
                            </>
                        )}

                        {(forwardActions.length > 0 || neutralActions.length > 0 || rejectActions.length > 0) && (
                            <>
                                {isDraft && <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />}
                                {[forwardActions, neutralActions, rejectActions]
                                    .filter((g) => g.length > 0)
                                    .map((group, gi) => (
                                        <React.Fragment key={gi}>
                                            {gi > 0 && <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />}
                                            {group.map((action) => {
                                                const blocked = commitRequired && categorise(action) === "forward";
                                                const { icon, cls, iconCls } = itemStyle(action);
                                                return (
                                                    <div key={action} className="relative group/item">
                                                        <button
                                                            onClick={() => { if (!blocked) handleWorkflowClick(action); }}
                                                            disabled={actionLoading || blocked}
                                                            className={cn(
                                                                "w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors disabled:cursor-not-allowed",
                                                                blocked ? "opacity-40" : cls,
                                                            )}
                                                        >
                                                            <span className={iconCls}>{icon}</span>
                                                            {action}
                                                            {blocked && <span className="ml-auto text-[10px] font-normal text-zinc-400">blocked</span>}
                                                        </button>
                                                        {blocked && (
                                                            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/item:block z-[9999]">
                                                                <div className="bg-zinc-900 text-white text-[11px] rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap">
                                                                    A commitment must be submitted before proceeding.
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                            </>
                        )}
                    </div>,
                    document.body,
                )}
            </div>

            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />

            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </>
    );
};

// --- MAIN COMPONENT ---
const TemporaryAdvanceDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState<TemporaryAdvanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resolvedAccountHead, setResolvedAccountHead] = useState<string>("");
    const [projectTitle, setProjectTitle] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const activityLogContainerRef = useRef<HTMLDivElement>(null);
    const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);
    const [resolvedApplicantDept, setResolvedApplicantDept] = useState<string>("");
    const [resolvedAdvanceForDept, setResolvedAdvanceForDept] = useState<string>("");
    const [errorModal, setErrorModal] = useState<{
        open: boolean;
        title: string;
        message: string;
    }>({ open: false, title: "Submission Failed", message: "" });

    const [taFields, setTaFields] = useState<FormField[]>([]);
    const [taLinkOptions, setTaLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isFieldsLoading, setIsFieldsLoading] = useState(false);

    const { call: fetchDoc } = useFrappePostCall<{ message: TemporaryAdvanceData }>("frappe.client.get");
    const { call: submitDoc, error: submitDocError } = useFrappePostCall<{ message: any }>(
        "rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.submit_temporary_advance",
    );
    const { call: fetchTaFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any } }>(
        temporaryAdvanceAPI.getFields,
    );
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);

    const isRnDStaff = roles.some((r) =>
        ["RnD Staff", "R&D Staff", "Research and Development Staff", "System Manager", "staff, RnD", "Hos, RnD (Head of Section, RnD)"].includes(r)
    );

    const projectCode = data?.project_code || "";
    const { heads: budgetHeads, actualBalance, commitableBalance } = useProjectBudget(projectCode);

    const { data: cancellationStatus } = useFrappeGetCall<{ message: { has_pending: boolean } }>(
        "rndopsapp.rndopsapp.cancellation_api.get_cancellation_status",
        { reference_doctype: "Temporary Advance", reference_name: id },
        id ? undefined : null,
    );

    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const res = await fetch('/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0');
                const json = await res.json();
                if (json?.data) setBudgetHeadList(json.data.map((item: any) => ({ name: item.budget_head, id: item.id })));
            } catch (err) {  }
        };
        fetchBudgetHeads();
    }, []);

    useEffect(() => {
        if (!data) return;
        if (data.applicant_department) {
            resolveDepartmentLabel(data.applicant_department).then(setResolvedApplicantDept);
        }
        if (data.advance_for_department) {
            resolveDepartmentLabel(data.advance_for_department).then(setResolvedAdvanceForDept);
        }
    }, [data?.applicant_department, data?.advance_for_department]);

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await fetchDoc({ doctype: "Temporary Advance", name: id });
            if (res?.message) setData(res.message);
            else setError("Document not found");
        } catch {
            setError("Failed to load document");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [id]);

    useEffect(() => {
        if (!id) return;
        setIsFieldsLoading(true);
        fetchTaFields({ doc_name: id })
            .then((res) => {
                if (res?.message) {
                    setTaFields(res.message.fields || []);
                    setTaLinkOptions(res.message.link_options || {});
                }
            })
            .catch(() => {})
            .finally(() => setIsFieldsLoading(false));
    }, [id]);

    useEffect(() => {
        if (!data || isSubmitting) return;
        if (searchParams.get("autoSubmit") !== "1") return;
        if (data.workflow_state !== "Draft") {
            setSearchParams({}, { replace: true });
            return;
        }
        const pendingComment = searchParams.get("comment") || "";
        setSearchParams({}, { replace: true });

        (async () => {
            setIsSubmitting(true);
            try {
                await submitDoc({ docname: data.name });
                if (pendingComment) {
                    await fetch("/api/method/frappe.desk.form.utils.add_comment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": (window as any).csrf_token || "" },
                        credentials: "include",
                        body: JSON.stringify({
                            reference_doctype: "Temporary Advance",
                            reference_name: data.name,
                            content: pendingComment,
                            comment_email: "",
                            comment_by: "",
                        }),
                    });
                }
                await loadData();
            } catch (err: any) {
                setErrorModal({
                    open: true,
                    title: "Auto-Submit Failed",
                    message: parseFrappeError(submitDocError, err),
                });
            } finally {
                setIsSubmitting(false);
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.name, data?.workflow_state]);

    useEffect(() => {
        if (!data?.account_head) return;
        fetch(`/api/v2/document/Budget%20Head/${data.account_head}`, { credentials: "include" })
            .then((r) => r.ok ? r.json() : null)
            .then((json) => setResolvedAccountHead(json?.data?.budget_head || json?.data?.name || data.account_head || ""))
            .catch(() => setResolvedAccountHead(data.account_head || ""));
    }, [data?.account_head]);

    useEffect(() => {
        const codeToResolve = data?.project_code;
        if (!codeToResolve) return;
        (async () => {
            const doctypes = ["Project Registration", "Project Proposal"];
            for (const doctype of doctypes) {
                // Strategy 1: fetch by document name (primary key)
                try {
                    const r1: Response = await fetch(
                        `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(codeToResolve)}`,
                        { credentials: "include" }
                    );
                    if (r1.ok) {
                        const json1: Record<string, any> = await r1.json();
                        const title1: string = json1?.data?.project_title || json1?.data?.title || "";
                        if (title1 && title1 !== codeToResolve) { setProjectTitle(title1); return; }
                    }
                } catch { /* try next */ }
                // Strategy 2: query by project_no field
                try {
                    const r2: Response = await fetch("/api/method/frappe.client.get_list", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ doctype, filters: { project_no: codeToResolve }, fields: ["project_title"], limit_page_length: 1 }),
                    });
                    if (r2.ok) {
                        const json2: Record<string, any> = await r2.json();
                        const title2: string = json2?.message?.[0]?.project_title || "";
                        if (title2) { setProjectTitle(title2); return; }
                    }
                } catch { /* try next */ }
            }
            setProjectTitle(data?.project_code || "");
        })();
    }, [data?.project_code]);

    const handleSubmit = async () => {
        if (!data || isSubmitting) return;
        if (!confirm("Are you sure you want to submit this Temporary Advance application?")) return;
        setIsSubmitting(true);
        try {
            await submitDoc({ docname: data.name });
            alert("Temporary Advance submitted successfully!");
            await loadData();
        } catch (err: any) {
            setErrorModal({
                open: true,
                title: "Submission Failed",
                message: parseFrappeError(submitDocError, err),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    if (error || !data) {
        return (
            <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8">
                    <FrappeCard className="text-center py-16">
                        <FileTextIcon className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
                        <h2 className="text-xl font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-2 uppercase">
                            Error Loading Document
                        </h2>
                        <p className="text-[#3F3F46] dark:text-[#E4E4E7] mb-6">{error || "Document not found"}</p>
                        <FrappeButton variant="primary" onClick={() => navigate(-1)}>Go Back</FrappeButton>
                    </FrappeCard>
                </main>
            </div>
        );
    }

    const amount = data.amount || data.amount_applied || 0;
    const amountInWords = data.amount_in_words || (amount ? toWords.convert(amount) : "-");

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <GlobalLoader isLoading={isSubmitting} />
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                <PageHeader
                    title={data.name}
                    status={data.workflow_state || "Draft"}
                    projectName={projectTitle || data.project_name}
                    projectNumber={data.project_code}
                >
                    <div className="flex items-center gap-3">
                        <ViewProjectButton doctype="Temporary Advance" data={data} />
                        {!cancellationStatus?.message?.has_pending && (
                            <ActionsDropdown
                                docname={data.name}
                                workflowState={data.workflow_state || "Draft"}
                                onActionComplete={() => loadData()}
                                onEdit={() => navigate(`/temporary-advance?edit=${data.name}`)}
                                onSubmit={handleSubmit}
                                isSubmitting={isSubmitting}
                                commitRequired={
                                    isRnDStaff &&
                                    isCommittedForGate === false &&
                                    !["Draft", "Rejected", "Cancelled"].includes(data.workflow_state)
                                }
                            />
                        )}
                        {data && (
                            <button
                                onClick={() => setIsPrintModalOpen(true)}
                                className="inline-flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-sm transition-colors"
                                title="Print / PDF"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Print / PDF
                            </button>
                        )}
                    </div>
                </PageHeader>

                {/* Cancellation warning */}
                {cancellationStatus?.message?.has_cancellation && (
                    <CancellationStatusBanner
                        requests={cancellationStatus?.message?.cancellation_requests}
                        currentUser={currentUser}
                    />
                )}

                {/* Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    {/* Main Content */}
                    <div className="xl:col-span-3 space-y-6">
                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-[18px] md:p-6">
                                {isFieldsLoading ? (
                                    <div className="flex h-64 items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757]" />
                                    </div>
                                ) : taFields.length > 0 ? (
                                    <DynamicFormRenderer
                                        fields={taFields}
                                        formData={data}
                                        linkOptions={taLinkOptions}
                                        onChange={() => {}}
                                        onFileChange={() => {}}
                                        onTableRowChange={() => {}}
                                        onTableFileChange={() => {}}
                                        onAddTableRow={() => {}}
                                        onDeleteTableRow={() => {}}
                                        readOnly={true}
                                    />
                                ) : (
                                    <p className="text-sm text-zinc-400 italic">No fields available.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <aside className="xl:col-span-1 space-y-6">
                        {/* Amount KPI */}
                        <div className="bg-white dark:bg-[#27272A] p-5 rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-4">
                                Advance Summary
                            </h3>
                            <div className="space-y-3">
                                <div className="text-center p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 dark:text-orange-400 mb-1">Requested Amount</p>
                                    <p className="text-3xl font-extrabold text-[#D97757]">₹{amount.toLocaleString("en-IN")}</p>
                                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 italic">{amountInWords}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46]">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Account Head</p>
                                    <p className="text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                        {resolvedAccountHead || data.account_head || "-"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsLedgerOpen(true)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#D97757] font-bold text-sm hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
                                >
                                    <LedgerIcon className="w-4 h-4" />
                                    View Project Ledger
                                </button>
                            </div>
                        </div>

                        {/* Commit & Payment (Staff only) */}
                        {isRnDStaff && !["Draft", "Rejected", "Cancelled"].includes(data.workflow_state) && (
                            <CommitPayment
                                doctype="Temporary Advance"
                                docName={id || ""}
                                projectName={data.project_code || ""}
                                budgetHeads={budgetHeads}
                                actualBalance={actualBalance}
                                commitableBalance={commitableBalance}
                                onCommitSuccess={() => loadData()}
                                onStagingStatusChange={(status) => setIsCommittedForGate(status)}
                            />
                        )}

                        {/* Meta */}
                        <FrappeCard>
                            <div className="space-y-4">
                                <div>
                                    <FieldLabel>Created On</FieldLabel>
                                    <FieldValue>
                                        <span className="flex items-center gap-2">
                                            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                                            {formatDate(data.creation)}
                                        </span>
                                    </FieldValue>
                                </div>
                                <div>
                                    <FieldLabel>Last Modified</FieldLabel>
                                    <FieldValue>
                                        <span className="flex items-center gap-2">
                                            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                                            {formatDate(data.modified)}
                                        </span>
                                    </FieldValue>
                                </div>
                                <div>
                                    <FieldLabel>Owner</FieldLabel>
                                    <FieldValue>
                                        <span className="flex items-center gap-2">
                                            <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                                            <span className="truncate">{data.owner}</span>
                                        </span>
                                    </FieldValue>
                                </div>
                            </div>
                        </FrappeCard>
                    </aside>
                </div>
            </main>

            {isLedgerOpen && (
                <ProjectLedgerModal
                    isOpen={isLedgerOpen}
                    onClose={() => setIsLedgerOpen(false)}
                    projectName={projectCode}
                    budgetHeadList={budgetHeadList}
                />
            )}

            <P11PrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                title="Temporary Advance Preview"
                htmlContent={
                    isPrintModalOpen && data
                        ? generateTemporaryAdvanceHtml(
                              {
                                  ...data,
                                  applicant_department: resolvedApplicantDept || data.applicant_department,
                                  advance_for_department: resolvedAdvanceForDept || data.advance_for_department,
                              },
                              projectTitle,
                              resolvedAccountHead,
                              data.applicant_name || data.owner,
                              activityLogContainerRef.current
                          )
                        : ""
                }
                docName={data?.name || id || ""}
            />

            {id && <FloatingActivityLogButton doctype="Temporary Advance" docname={id} />}

            <div style={{ display: "none" }} ref={activityLogContainerRef}>
                {id && (
                    <ActivityLog
                        doctype="Temporary Advance"
                        docname={id}
                    />
                )}
            </div>

            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default TemporaryAdvanceDetails;
