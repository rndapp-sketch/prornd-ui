/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFrappePostCall, useFrappeGetCall, useFrappeAuth } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
    EditIcon, ChevronRight, CheckCircle2, XCircle,
    Clock, CalendarIcon, ActivityIcon,
    UserIcon, ShoppingCartIcon, UsersIcon, FileTextIcon,
    TruckIcon, FileSearch2, PrinterIcon, ExternalLink, UploadIcon,
} from "lucide-react";
// import { AppSidebar } from "@/components/RndSidebar";
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
import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";
import { ProjectLedgerModal } from "@/components/ProjectLedgerModal";
import IndentGeneralFormActionButtons from "@/components/IndentGeneralFormActionButtons";
import ProjectDetailsOverview from "@/pages/ProjectDetailsOverview";
import { generateIgfPrintHtml } from "@/utils/igfPrint";

// ---------------------------------------------------------------------------
// Workflow pipeline
// ---------------------------------------------------------------------------
const BASE_WORKFLOW_STAGES = [
    "Draft",
    "Pending Staff Approval",
    "Pending HoS Approval",
    "Pending Dean Approval",
    "Approved",
];

type StageStatus = "completed" | "in-progress" | "pending" | "rejected";

function buildTimeline(
    currentState: string,
    includeDirector: boolean,
): { label: string; status: StageStatus }[] {
    const isApproved = currentState === "Approved";
    const isRejected = currentState === "Rejected";

    const stages = [
        ...BASE_WORKFLOW_STAGES.slice(0, -1),
        ...(includeDirector ? ["Pending Director Approval"] : []),
        "Approved",
    ];
    const stagesForRejected = [...stages.slice(0, -1), "Rejected"];
    const activeStages = isRejected ? stagesForRejected : stages;

    let currentIdx = activeStages.findIndex((s) => s === currentState);
    if (currentIdx === -1) currentIdx = 1;

    return activeStages.map((stage, idx) => {
        if (isApproved) return { label: stage, status: "completed" };
        if (isRejected) {
            if (idx === activeStages.length - 1) return { label: stage, status: "rejected" };
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
const WorkflowTimeline: React.FC<{ currentState: string; includeDirector?: boolean }> = ({ currentState, includeDirector = false }) => {
    const stages = buildTimeline(currentState, includeDirector);

    const icon = (status: StageStatus) => {
        if (status === "completed") return <CheckCircle2 className="w-3 h-3 text-white" />;
        if (status === "in-progress") return <Clock className="w-3 h-3 text-white" />;
        if (status === "rejected") return <XCircle className="w-3 h-3 text-white" />;
        return <span className="w-1.5 h-1.5 rounded-full bg-white/60" />;
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
        <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
            <div className="mb-3 flex items-center gap-2">
                <ActivityIcon className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-300" />
                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#A1A1AA]">
                    Workflow Progress
                </h3>
                <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46]" />
                {currentState && currentState !== "Draft" && currentState !== "Approved" && currentState !== "Rejected" && (
                    <span className="text-[10px] font-semibold text-[#D97757]">{currentState}</span>
                )}
            </div>
            <div className="flex items-start overflow-x-auto pb-1">
                {stages.map((stage, idx) => (
                    <React.Fragment key={stage.label}>
                        <div className="flex flex-col items-center min-w-[72px] max-w-[90px]">
                            <div
                                className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center shadow-sm flex-shrink-0",
                                    bg(stage.status),
                                )}
                            >
                                {icon(stage.status)}
                            </div>
                            <p
                                className={cn(
                                    "mt-1.5 text-center text-[10px] leading-tight px-0.5",
                                    stage.status === "in-progress" && "font-bold text-[#D97757]",
                                    stage.status === "completed" && "text-emerald-600 dark:text-emerald-400 font-medium",
                                    stage.status === "pending" && "text-zinc-400 dark:text-zinc-500",
                                    stage.status === "rejected" && "text-red-500 font-bold",
                                )}
                            >
                                {stage.label}
                            </p>
                        </div>
                        {idx < stages.length - 1 && (
                            <div className="flex-1 flex items-center pt-3 min-w-[12px]">
                                <div className={cn("h-0.5 w-full rounded", connector(stage.status))} />
                                <ChevronRight className="w-2.5 h-2.5 text-zinc-400 flex-shrink-0 -ml-1" />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
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
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);

    // Commit Payment state
    const [commitHead, setCommitHead] = useState("");
    const [selectedCommitHead, setSelectedCommitHead] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");
    const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);
    const [deptName, setDeptName] = useState("");
    const [prPreviewName, setPrPreviewName] = useState<string | null>(null);

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isStaffRnD = roles.some((r) =>
        ["staff, RnD", "Staff RnD", "RnD Staff", "System Manager"].includes(r),
    );
    const isDeanRnD = roles.some((r) =>
        ["Dean, RnD", "System Manager"].includes(r),
    );

    const [isUpdatingDirectorFlag, setIsUpdatingDirectorFlag] = useState(false);
    const directorPdfInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);
    const [hasPrinted, setHasPrinted] = useState(false);
    const [directorPdfUrl, setDirectorPdfUrl] = useState("");

    const { call: fetchFields } = useFrappePostCall<{ message: any }>(indentGeneralFormAPI.getFields);
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>("frappe.client.get_value");
    const { call: submitPayment, loading: isPaying } = useFrappePostCall<{ message: any }>(
        "rndopsapp.rndopsapp.commitPayment.submit_payment_data",
    );
    const { call: updateSendToDirectorCall } = useFrappePostCall(
        indentGeneralFormAPI.updateSendToDirector,
    );
    const { call: performWorkflowAction, loading: isForwarding } = useFrappePostCall(
        indentGeneralFormAPI.performAction,
    );
    const { data: workflowActionsData } = useFrappeGetCall<{ message: string[] | { actions?: string[] } }>(
        indentGeneralFormAPI.getWorkflowActions,
        id ? { docname: id } : undefined,
    );
    const { data: activityData } = useFrappeGetCall<{ message: { owner: string; creation: string; content: string; comment_type?: string }[] }>(
        "rndopsapp.rndopsapp.api.get_project_activity",
        id ? { doctype: "Indent General Form", docname: id } : undefined,
    );

    // igf_project_code is the project number used by the ledger/budget API
    // igf_project_title is the Frappe Link value (auto-ID) used for ProjectDetailsOverview
    const projectCode = formData.igf_project_code || "";
    const projectName = formData.igf_project_title || "";
    const { budgetData, heads: budgetHeads, headBalances, actualBalance, commitableBalance } = useProjectBudget(projectCode);

    // Only pass heads that have received funds to CommitPayment
    const fundedBudgetHeads = budgetHeads.filter((h) => (headBalances[h]?.received ?? 0) > 0);

    // Resolve igf_account_head (stored as Budget Head doc name) to the human-readable label
    // that matches headBalances keys (which use h.budget_head text)
    const igfAccountHeadLabel =
        linkOptions?.igf_account_head?.find(
            (o: any) => o.value === formData.igf_account_head,
        )?.label ||
        formData.igf_account_head ||
        "";

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

    useEffect(() => {
        fetch(
            '/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0',
            { credentials: "include" },
        )
            .then((r) => r.json())
            .then((result) => {
                if (result?.data) {
                    setBudgetHeadList(
                        result.data.map((item: any) => ({ name: item.budget_head, id: item.id })),
                    );
                }
            })
            .catch(() => { /* ignore */ });
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
                project_name: projectCode,
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

                // Fetch department display name
                const deptId = prefill_data?.igf_department_centre_section;
                if (deptId) {
                    try {
                        const deptRes = await fetchFrappeValue({
                            doctype: "Department_prornd",
                            filters: { name: deptId },
                            fieldname: "dept_name",
                        });
                        setDeptName(deptRes?.message?.dept_name || "");
                    } catch { /* ignore */ }
                }

                setLinkOptions(merged);
                setFormData(prefill_data || {});

                // Fetch hidden field director_signed_pdf explicitly (not always in prefill_data)
                if (id) {
                    try {
                        const pdfRes = await fetchFrappeValue({
                            doctype: "Indent General Form",
                            filters: { name: id },
                            fieldname: "director_signed_pdf",
                        });
                        setDirectorPdfUrl(String(pdfRes?.message?.director_signed_pdf || "").trim());
                    } catch { /* ignore */ }
                }
            } catch (e) {
                console.error("Failed to load IGF details:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, refreshKey]);

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
    const sendToDirector = Boolean(Number(formData.send_to_director || 0));
    const directorSignedPdf = String(formData.director_signed_pdf || "").trim() || directorPdfUrl;
    const isAtDeanApproval = workflowState === "Pending Dean Approval";
    const isAtDirectorApproval = workflowState === "Pending Director Approval";
    const includeDirectorStage = sendToDirector || isAtDirectorApproval;
    const directorPdfBlocked = isDeanRnD && isAtDirectorApproval && !directorSignedPdf;

    // Mirror backend _resolve_igf_next_state() thresholds: Equipment > ₹10L, Consumable > ₹3L
    // → Approve auto-routes to Director Approval (no manual send needed).
    const accountHeadLabel = igfAccountHeadLabel?.toLowerCase() ?? "";
    const totalEstimate = Number(formData.igf_total_estimate || 0);
    const autoRequiresDirector =
        (accountHeadLabel.includes("equipment") && totalEstimate > 1000000) ||
        (accountHeadLabel.includes("consumable") && totalEstimate > 300000);

    const rawActions = workflowActionsData?.message;
    const allWorkflowActions: string[] = Array.isArray(rawActions) ? rawActions : (rawActions as any)?.actions || [];
    const forwardAction = allWorkflowActions.find((a) => {
        const al = a.toLowerCase();
        return al.includes("approve") || al.includes("forward");
    }) ?? null;

    const handleForwardAction = async () => {
        if (!id || !forwardAction) return;
        try {
            await performWorkflowAction({ docname: id, action: forwardAction, comment: "" });
            handleRefresh();
        } catch (err: any) {
            alert(err?.message || "Failed to perform action.");
        }
    };

    const handleSendToDirector = async () => {
        if (!id || isUpdatingDirectorFlag) return;
        setIsUpdatingDirectorFlag(true);
        try {
            await updateSendToDirectorCall({ docname: id, send_to_director: 1 });
            setFormData((prev: any) => ({ ...prev, send_to_director: 1 }));
            handleRefresh();
        } catch (err: any) {
            alert(err?.message || "Failed to send for Director approval.");
        } finally {
            setIsUpdatingDirectorFlag(false);
        }
    };

    const handleDirectorPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;
        setIsUploadingPdf(true);
        try {
            const fd = new FormData();
            fd.append("file", file, file.name);
            fd.append("is_private", "0");
            fd.append("doctype", "Indent General Form");
            fd.append("docname", id);
            fd.append("fieldname", "director_signed_pdf");
            const csrfToken = (window as any).csrf_token;
            const uploadRes = await fetch("/api/method/upload_file", {
                method: "POST", body: fd, credentials: "include",
                headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : undefined,
            });
            if (!uploadRes.ok) throw new Error(await uploadRes.text());
            const uploadJson = await uploadRes.json();
            const fileUrl: string = uploadJson?.message?.file_url;
            if (!fileUrl) throw new Error("Upload returned no file_url");
            const bindRes = await fetch(`/api/method/${indentGeneralFormAPI.attachDirectorPdf}`, {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {}) },
                body: JSON.stringify({ docname: id, file_url: fileUrl }),
            });
            if (!bindRes.ok) throw new Error(await bindRes.text());
            setDirectorPdfUrl(fileUrl);
            handleRefresh();
        } catch (err: any) {
            alert(err?.message || "Upload failed.");
        } finally {
            setIsUploadingPdf(false);
            if (directorPdfInputRef.current) directorPdfInputRef.current.value = "";
        }
    };

    const handlePrint = async () => {
        const resolvedAccountHead = linkOptions?.igf_account_head?.find((o: any) => o.value === formData.igf_account_head)?.label || formData.igf_account_head || "";
        const html = generateIgfPrintHtml(
            formData,
            deptName,
            resolvedAccountHead,
            projectTitle,
            activityData?.message || [],
        );
        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400); }
        setHasPrinted(true);

        // Dean printing at Pending Dean Approval auto-forwards the form —
        // no separate click needed once the print is triggered.
        if (isDeanRnD && isAtDeanApproval) {
            if (autoRequiresDirector) {
                if (forwardAction && id) {
                    try {
                        await performWorkflowAction({ docname: id, action: forwardAction, comment: "" });
                        handleRefresh();
                    } catch (err: any) {
                        alert(err?.message || "Failed to perform action.");
                    }
                }
            } else if (id) {
                setIsUpdatingDirectorFlag(true);
                try {
                    await updateSendToDirectorCall({ docname: id, send_to_director: 1 });
                    setFormData((prev: any) => ({ ...prev, send_to_director: 1 }));
                    handleRefresh();
                } catch (err: any) {
                    alert(err?.message || "Failed to send for Director approval.");
                } finally {
                    setIsUpdatingDirectorFlag(false);
                }
            }
        }
    };

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
            {/* <AppSidebar /> */}
            <main className="w-full overflow-hidden px-5 py-6 md:px-8 md:py-7">
                <PageHeader
                    title={formData.name || id || "Indent General Form"}
                    status={workflowState}
                    projectName={projectTitle || formData.igf_project_code}
                    projectNumber={formData.igf_project_code}
                >
                    {/* NIQ Form button — Approved, Limited Tender, below ₹50 lakh; Dean R&D does not initiate NIQ */}
                    {!isDeanRnD &&
                        workflowState === "Approved" &&
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
                    {projectName && (
                        <button
                            onClick={() => setPrPreviewName(projectName)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
                        >
                            View Project
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
                    {isDeanRnD && (isAtDeanApproval || isAtDirectorApproval) && (
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            Print PDF
                        </button>
                    )}
                    {id && (
                        <IndentGeneralFormActionButtons
                            docname={id}
                            onActionComplete={handleRefresh}
                            commitRequired={
                                isStaffRnD &&
                                isCommittedForGate === false &&
                                workflowState === "Pending Staff Approval"
                            }
                            directorPdfBlocked={directorPdfBlocked}
                            hideForwardActions={isDeanRnD && isAtDeanApproval && (!autoRequiresDirector || !hasPrinted)}
                        />
                    )}
                </PageHeader>

                {isStaffRnD && isCommittedForGate === false && workflowState === "Pending Staff Approval" && (
                    <div className="mt-4 max-w-fit rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                        A commitment must be submitted before forwarding this application.
                    </div>
                )}

                {isDeanRnD && isAtDirectorApproval && directorSignedPdf && (
                    <div className="mt-4 flex items-center gap-4 rounded-xl border border-blue-300 bg-blue-50 px-5 py-4 shadow-sm dark:border-blue-700 dark:bg-blue-900/20">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50">
                            <FileTextIcon className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-extrabold text-blue-800 dark:text-blue-200">
                                Director-Signed PDF has been uploaded
                            </p>
                            <p className="mt-0.5 text-[11.5px] text-blue-600 dark:text-blue-400 leading-relaxed">
                                The signed document is ready. Review it and proceed with your final approval from the Actions menu.
                            </p>
                        </div>
                        <button
                            onClick={() => window.open(directorSignedPdf, "_blank", "noopener,noreferrer")}
                            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View PDF
                        </button>
                    </div>
                )}

                {workflowState === "Approved" && directorSignedPdf && (
                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-900/20">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                            <FileTextIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-emerald-800 dark:text-emerald-300">
                                Director-Signed PDF is available
                            </p>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                The signed document has been uploaded and is ready to download.
                            </p>
                        </div>
                        <button
                            onClick={() => window.open(directorSignedPdf, "_blank", "noopener,noreferrer")}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Download
                        </button>
                    </div>
                )}

                {/* Workflow Timeline */}
                <div className="mt-6">
                    <WorkflowTimeline currentState={workflowState} includeDirector={includeDirectorStage} />
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
                                    value={deptName || formData.igf_department_centre_section}
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
                    <aside className="min-w-0 space-y-3">
                        {/* Status card — compact */}
                        <div className="bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <StateBadge state={workflowState} />
                                {formData.modified && (
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                        <CalendarIcon className="w-3 h-3" />
                                        {new Date(formData.modified).toLocaleDateString("en-IN")}
                                    </span>
                                )}
                            </div>
                            {formData.igf_total_estimate != null && (
                                <div className="mt-2 flex justify-between items-center text-xs">
                                    <span className="text-zinc-500 dark:text-zinc-400">Total Estimate</span>
                                    <span className="font-bold text-[#D97757]">
                                        {Number(formData.igf_total_estimate).toLocaleString("en-IN", {
                                            style: "currency",
                                            currency: "INR",
                                            maximumFractionDigits: 0,
                                        })}
                                    </span>
                                </div>
                            )}
                            {formData.igf_tender_type && (
                                <div className="mt-1 flex justify-between items-center text-xs">
                                    <span className="text-zinc-500 dark:text-zinc-400">Tender Type</span>
                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{formData.igf_tender_type}</span>
                                </div>
                            )}
                        </div>

                        {/* Project Budget / Ledger */}
                        <div className="bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Commitable Balance
                                </span>
                                <span className={`text-sm font-bold ${actualBalance < 0 ? "text-red-500" : "text-[#D97757]"}`}>
                                    ₹ {(actualBalance || 0).toLocaleString("en-IN")}
                                </span>
                            </div>

                            {/* Per-head breakdown */}
                            {budgetHeads.filter((h) => headBalances[h]?.received !== 0).length > 0 && (
                                <div className="mb-2 divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden">
                                    {budgetHeads
                                        .filter((h) => headBalances[h]?.received !== 0)
                                        .map((head) => {
                                            const bal = headBalances[head];
                                            if (!bal) return null;
                                            const isNegative = bal.commitable < 0;
                                            const isSelected = selectedCommitHead === head;
                                            return (
                                                <div key={head} className={cn(
                                                    "flex items-center justify-between px-3 py-1.5",
                                                    isSelected
                                                        ? "bg-[#D97757]/10 dark:bg-[#D97757]/15 ring-inset ring-1 ring-[#D97757]/30"
                                                        : "bg-zinc-50 dark:bg-zinc-900/50"
                                                )}>
                                                    <span className={cn(
                                                        "text-[11px] truncate max-w-[130px]",
                                                        isSelected ? "font-semibold text-zinc-700 dark:text-zinc-200" : "text-zinc-500 dark:text-zinc-400"
                                                    )} title={head}>
                                                        {head}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[11px] font-bold tabular-nums",
                                                        isNegative ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
                                                    )}>
                                                        ₹ {bal.commitable.toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    {/* Total row */}
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
                                        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
                                            Total
                                        </span>
                                        <span className={cn(
                                            "text-[11px] font-bold tabular-nums",
                                            actualBalance < 0 ? "text-red-500" : "text-[#D97757]"
                                        )}>
                                            ₹ {(actualBalance || 0).toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setIsLedgerOpen(true)}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-[#D97757] font-semibold text-xs hover:bg-[#B2DFDB] transition-colors"
                            >
                                View Project Ledger
                            </button>
                        </div>

                        {/* Make a Commitment via CommitPayment component */}
                        {isStaffRnD && workflowState === "Pending Staff Approval" && (
                            <CommitPayment
                                doctype="Indent General Form"
                                docName={id || ""}
                                projectName={projectCode}
                                budgetHeads={fundedBudgetHeads}
                                actualBalance={actualBalance}
                                commitableBalance={commitableBalance}
                                headBalances={headBalances}
                                defaultBudgetHead={igfAccountHeadLabel}
                                onHeadChange={setSelectedCommitHead}
                                onCommitSuccess={() => handleRefresh()}
                                onStagingStatusChange={(status) => setIsCommittedForGate(status)}
                            />
                        )}

                        {/* Director Approval — shown to Dean at Pending Dean Approval */}
                        {isDeanRnD && isAtDeanApproval && (
                            <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-4 shadow-sm">
                                <h3 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-3">
                                    Director Approval
                                </h3>
                                {autoRequiresDirector ? (
                                    /* Amount above threshold — Approve auto-routes; gated by print */
                                    <div className="space-y-2.5">
                                        {!hasPrinted ? (
                                            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 px-3 py-3 space-y-1.5">
                                                <p className="text-[11.5px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">Print Required Before Forwarding</p>
                                                <p className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">
                                                    The total estimate requires Director Approval. Click <strong>Print PDF</strong> (top-right) first — the forward button will appear once you print.
                                                </p>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleForwardAction}
                                                disabled={isForwarding || !forwardAction}
                                                className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-[#D97757] hover:bg-[#c66a4e] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                {isForwarding ? "Forwarding…" : (forwardAction ?? "Approve")}
                                            </button>
                                        )}
                                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-3 py-2.5 space-y-1">
                                            <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">ⓘ What happens after forwarding</p>
                                            <p className="text-[12px] text-blue-600 dark:text-blue-300 leading-relaxed">
                                                The status moves to <strong>Pending Director Approval</strong>. Staff will upload the Director-signed document. Once uploaded, you can return here to give the final approval.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Below threshold — manual Director send, also gated by print */
                                    <div className="space-y-3">
                                        {!hasPrinted ? (
                                            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 px-3 py-3 space-y-1.5">
                                                <p className="text-[11.5px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">Step 1 — Print the Form</p>
                                                <p className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">
                                                    Click <strong>Print PDF</strong> (top-right) to generate the form. Get it signed by the <strong>Director</strong>, then come back here to send it for approval.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 px-3 py-2.5 text-[12px] text-emerald-700 dark:text-emerald-300 font-semibold">
                                                ✓ Form printed — get it signed by the Director, then click the button below.
                                            </div>
                                        )}
                                        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-3 py-2.5 space-y-1">
                                            <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">ⓘ What happens after</p>
                                            <p className="text-[12px] text-blue-600 dark:text-blue-300 leading-relaxed">
                                                Status changes to <strong>Pending Director Approval</strong>. Staff will upload the signed scan. Once uploaded, your <strong>Actions → Approve</strong> is unblocked for final approval.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleSendToDirector}
                                            disabled={isUpdatingDirectorFlag || !hasPrinted}
                                            className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            {isUpdatingDirectorFlag ? "Saving…" : "Send for Director Approval"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Director-Signed PDF — view/download when Approved */}
                        {workflowState === "Approved" && directorSignedPdf && (
                            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-4 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                                    Director-Signed PDF
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                        PDF available
                                    </div>
                                    <button
                                        onClick={() => window.open(directorSignedPdf, "_blank", "noopener,noreferrer")}
                                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 transition-all"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        View / Download PDF
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Director Approval — PDF upload for Staff / view + gate for Dean */}
                        {isAtDirectorApproval && (isStaffRnD || isDeanRnD) && (
                            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-4 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                                    Director-Signed PDF
                                </h3>
                                {directorSignedPdf ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                            PDF uploaded
                                        </div>
                                        <button
                                            onClick={() => window.open(directorSignedPdf, "_blank", "noopener,noreferrer")}
                                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 transition-all"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            View Director PDF
                                        </button>
                                        {isStaffRnD && (
                                            <>
                                                <input ref={directorPdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleDirectorPdfUpload} />
                                                <button
                                                    onClick={() => directorPdfInputRef.current?.click()}
                                                    disabled={isUploadingPdf}
                                                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition-all disabled:opacity-50"
                                                >
                                                    <UploadIcon className="w-3.5 h-3.5" />
                                                    {isUploadingPdf ? "Replacing…" : "Replace PDF"}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                            {isStaffRnD ? "Upload the Director-signed scan to unblock Dean approval." : "Awaiting Director-signed PDF upload by Staff."}
                                        </div>
                                        {isStaffRnD && (
                                            <>
                                                <input ref={directorPdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleDirectorPdfUpload} />
                                                <button
                                                    onClick={() => directorPdfInputRef.current?.click()}
                                                    disabled={isUploadingPdf}
                                                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#D97757] hover:bg-[#c66a4e] text-white disabled:opacity-50 transition-all"
                                                >
                                                    <UploadIcon className="w-3.5 h-3.5" />
                                                    {isUploadingPdf ? "Uploading…" : "Upload Director PDF"}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Record Payment */}
                        {isStaffRnD && workflowState === "Pending Staff Approval" && isCommitted && (
                            <div className="rounded-2xl border border-[#E4E4E7] bg-white p-4 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                                    Record Payment
                                </h3>
                                <div className="space-y-3">
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                        placeholder="Payment amount (₹)"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                    />
                                    <button
                                        onClick={handlePayment}
                                        disabled={isPaying}
                                        className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-[#D97757] text-white hover:bg-[#c66a4e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isPaying ? "Recording…" : "Record Payment"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </main>

            {id && (
                <FloatingActivityLogButton
                    doctype="Indent General Form"
                    docname={id}
                />
            )}

            <ProjectLedgerModal
                isOpen={isLedgerOpen}
                onClose={() => setIsLedgerOpen(false)}
                projectName={projectCode}
                budgetHeadList={budgetHeadList}
            />

            {prPreviewName && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Project Details</h2>
                            <button
                                onClick={() => setPrPreviewName(null)}
                                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xl font-bold leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-4">
                            <ProjectDetailsOverview projectName={prPreviewName} embedded />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IndentGeneralFormDetails;
