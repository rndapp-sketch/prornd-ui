import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import {
    useFrappePostCall,
    useFrappeGetCall,
    useFrappeAuth,
} from "frappe-react-sdk";
import { disbursalOfHonorariumAPI } from "@/services/apiService";

// --- FILE SAVE HELPER (mirrors DisbursalOfHonorariumForm) ---
const uploadFileToFrappe = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("is_private", "0");
    const response = await fetch("/api/method/upload_file", {
        method: "POST",
        body: fd,
        headers: {
            "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
        },
        credentials: "include",
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`File upload failed (${response.status}): ${text.slice(0, 200)}`);
    }
    const json = JSON.parse(text);
    const fileUrl = json?.message?.file_url;
    if (!fileUrl) {
        throw new Error("File upload did not return a valid file_url");
    }
    return fileUrl;
};

const callSaveApi = async (endpoint: string, formData: Record<string, any>): Promise<any> => {
    const data: Record<string, any> = {};

    for (const key in formData) {
        const value = formData[key];

        if (value instanceof File) {
            const fileUrl = await uploadFileToFrappe(value);
            data[key] = fileUrl;
        } else if (Array.isArray(value)) {
            data[key] = await Promise.all(
                value.map(async (row: any) => {
                    const cleanRow: Record<string, any> = {};
                    for (const rowKey in row) {
                        const rowVal = row[rowKey];
                        if (rowVal instanceof File) {
                            cleanRow[rowKey] = await uploadFileToFrappe(rowVal);
                        } else {
                            cleanRow[rowKey] = rowVal;
                        }
                    }
                    return cleanRow;
                })
            );
        } else {
            data[key] = value;
        }
    }

    const fd = new globalThis.FormData();
    fd.append('data', JSON.stringify(data));

    const response = await fetch(`/api/method/${endpoint}`, {
        method: 'POST',
        body: fd,
        headers: { 'X-Frappe-CSRF-Token': (window as any).csrf_token || '' },
        credentials: 'include',
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Save failed (${response.status}): ${text.slice(0, 200)}`);
    try { return JSON.parse(text); } catch { throw new Error(`Unexpected response: ${text.slice(0, 200)}`); }
};
import { cn } from "@/lib/utils";
import {
    CalendarIcon,
    FileSpreadsheetIcon as LedgerIcon,
    EditIcon,
    Send,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { GlobalLoader } from "@/components/ui/global-loader";
import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";
import {
    DynamicFormRenderer,
    type FormField,
    type LinkOption,
} from "@/components/forms/DynamicFormRenderer";
import DisbursalOfHonorariumActionButtons from "@/components/DisbursalOfHonorariumActionButtons";
import { CommitPayment } from "@/components/CommitPayment";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { useUserRoles } from "@/components/UserRole";
import { ProjectLedgerModal } from "@/components/ProjectLedgerModal";
import { P11PrintModal } from "@/components/P11PrintModal";
import { generateDisbursalOfHonorariumHtml, resolveHonorariumPrintData } from "@/utils/disbursalOfHonorariumPrint";
import { ErrorModal } from "../../components/ErrorModal";
import { parseFrappeError } from "../../utils/errorUtils";

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

// --- MAIN COMPONENT ---
const DisbursalOfHonorariumDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<
        Record<string, LinkOption[]>
    >({});
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [resolvedProjectTitle, setResolvedProjectTitle] = useState<string>("");
    const [applicantFullName, setApplicantFullName] = useState<string>("");

    const [isLedgerOpen, setIsLedgerOpen] = useState(false);

    // Commit / Payment state (commitAmount moved to CommitPayment component)
    const [commitHead, setCommitHead] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");
    // Track commitment staging status to gate workflow action buttons for Staff RnD
    const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);

    // --- API HOOKS ---
    const {
        call: fetchFormData,
        result: formDataResult,
        error: formDataError,
    } = useFrappePostCall<FormDataResponse>(disbursalOfHonorariumAPI.getFields);
    const { call: fetchDocument } = useFrappePostCall<{ message: any }>(
        "frappe.client.get",
    );
    const { call: fetchUsersList } = useFrappePostCall<{ message: any[] }>(
        "frappe.client.get_list",
    );
    const { data: activityData } = useFrappeGetCall<{ message: ActivityItem[] }>(
        "rndopsapp.rndopsapp.api.get_project_activity",
        { doctype: "Disbursal of Honorarium", docname: id },
        id ? undefined : null,
    );
    const { data: docActivityData } = useFrappeGetCall<{ message: any[] }>(
        "rndopsapp.rndopsapp.api.get_document_activity",
        { doctype: "Disbursal of Honorarium", docname: id },
        id ? undefined : null,
    );
    // CommitPayment component handles submit_commit_data internally
    const { call: submitPayment, loading: isPaying } = useFrappePostCall(
        "rndopsapp.rndopsapp.commitPayment.submit_payment_data",
    );
    const { call: submitForm } = useFrappePostCall(
        disbursalOfHonorariumAPI.submit,
    );

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);

    // --- RESOLVE PRINT DISPLAY FIELDS via authenticated SDK calls ---
    useEffect(() => {
        if (!formData.name) return;
        const run = async () => {
            // Project title: look up by project_no (frappe.client.get_list — same as form)
            if (formData.project_no) {
                try {
                    const res = await fetchUsersList({
                        doctype: "Project Registration",
                        filters: [["project_no", "=", formData.project_no]],
                        fields: ["name", "project_title"],
                        limit_page_length: 1,
                    });
                    const title = res?.message?.[0]?.project_title;
                    if (title) setResolvedProjectTitle(title);
                } catch (_) { }
            }
            // Fallback: fetch Project Registration doc by stored docname
            if (!resolvedProjectTitle) {
                const prDocName = formData.project_title || formData.project_name;
                if (prDocName && prDocName !== formData.project_no) {
                    try {
                        const res = await fetchDocument({
                            doctype: "Project Registration",
                            name: prDocName,
                        });
                        const title = res?.message?.project_title;
                        if (title) setResolvedProjectTitle(title);
                    } catch (_) { }
                }
            }
            // Applicant full name: look up User by webmail_id
            const userEmail = formData.webmail_id || formData.web_mail_id;
            if (userEmail) {
                try {
                    const res = await fetchDocument({ doctype: "User", name: userEmail });
                    const fullName = res?.message?.full_name;
                    if (fullName) setApplicantFullName(fullName);
                } catch (_) { }
            }
            // (document activity is fetched via useFrappeGetCall hook — docActivityData)
        };
        run();
    }, [formData.name, formData.project_no]);

    // --- PROJECT BUDGET ---
    const projectTitle =
        formData?.project_no ||
        formData?.project_name ||
        formData?.project_title ||
        "";

    const [budgetHeadList, setBudgetHeadList] = useState<
        { name: string; id: string }[]
    >([]);

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
            }
        };
        fetchBudgetHeads();
    }, []);

    const {
        budgetData,
        heads: budgetHeads,
        actualBalance,
        commitableBalance,
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

    const isCommitted = !!linkedCommitment;

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
        }
    }, [linkedCommitment]);

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

                // Merge child_fields into Table fields (same as the form)
                const enhancedFields = (apiFields || []).map(
                    (field: FormField) => {
                        if (
                            field.fieldtype === "Table" &&
                            child_table_fields &&
                            child_table_fields[field.fieldname]
                        ) {
                            const processedChildFields = child_table_fields[
                                field.fieldname
                            ].map((cf: any) => {
                                if (cf.fieldname === "web_mail_id") {
                                    return {
                                        ...cf,
                                        fieldtype: "Link",
                                        options: "User",
                                    };
                                }
                                return cf;
                            });
                            return {
                                ...field,
                                child_fields: processedChildFields,
                            };
                        }
                        return field;
                    },
                );

                setFields(enhancedFields);

                // Fetch Users for link options
                let baseLinkOptions = link_options || {};

                try {
                    const headsRes = await fetchUsersList({
                        doctype: "Budget Head",
                        fields: ["name", "budget_head"],
                        limit_page_length: 0,
                    });
                    if (headsRes?.message) {
                        const bhOptions = headsRes.message.map((h: any) => ({
                            value: h.name,
                            label: h.budget_head || h.name,
                        }));
                        // Key by both fieldname and doctype so DynamicFormRenderer's merge picks it up
                        baseLinkOptions["account_head"] = bhOptions;
                        baseLinkOptions["Budget Head"] = bhOptions;
                    }
                } catch (_) { }

                try {
                    const deptRes = await fetchUsersList({
                        doctype: "Department_prornd",
                        fields: ["name", "dept_name"],
                        limit_page_length: 0,
                    });
                    if (deptRes?.message) {
                        const deptOptions = deptRes.message.map((d: any) => ({
                            value: d.name,
                            label: d.dept_name || d.name,
                        }));
                        baseLinkOptions["applicant_department"] = deptOptions;
                        baseLinkOptions["department_for"] = deptOptions;
                        baseLinkOptions["department"] = deptOptions;
                        baseLinkOptions["Department_prornd"] = deptOptions;
                    }
                } catch (_) { }

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
                        baseLinkOptions["User"] =
                            baseLinkOptions["web_mail_id"];
                    }
                } catch (_) { }

                setLinkOptions(baseLinkOptions);

                try {
                    const doc = await fetchDocument({
                        doctype: "Disbursal of Honorarium",
                        name: id,
                    });
                    if (doc?.message) {
                        setFormData(doc.message);
                    }
                } catch (err) {
                }

                setLoading(false);
            }
            if (formDataError) {
                setLoading(false);
            }
        };

        loadDocument();
    }, [formDataResult, formDataError, id]);

    const handleRefresh = useCallback(() => {
        setRefreshKey((k) => k + 1);
        setLoading(true);
    }, []);

    // handleCommit moved to CommitPayment component

    // --- PAYMENT ---
    const handlePayment = async () => {
        if (!paymentAmount || !commitHead || !id || !formData) {
            alert("Please select a budget head and enter an amount.");
            return;
        }
        try {
            await submitPayment({
                doctype: "Disbursal of Honorarium",
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
            setErrorModal({ open: true, title: "Payment Failed", message: parseFrappeError(error) });
        }
    };

    // --- SUBMIT APPLICATION ---
    const handleSubmitApplication = async () => {
        if (!id || isSubmitting) return;
        if (!window.confirm("Are you sure you want to submit this application?")) return;
        setIsSubmitting(true);
        try {
            const payload: Record<string, any> = { ...formData, name: id };
            const saveRes = await callSaveApi(disbursalOfHonorariumAPI.save, payload);
            if (saveRes?.message?.status !== 'success') {
                throw new Error(saveRes?.message?.message || "Save failed during submission");
            }
            const docname = saveRes.message.docname || id;
            const submitRes = await submitForm({ docname });
            if (submitRes?.message?.status === 'success' || submitRes?.message) {
                alert("Disbursal of Honorarium submitted successfully!");
                handleRefresh();
            } else {
                throw new Error(submitRes?.message?.message || "Submission failed");
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(err) });
        } finally {
            setIsSubmitting(false);
        }
    };


    // No-op handlers for read-only form
    const noOp = () => { };
    const noOpTable = () => { };

    // --- RENDER ---
    if (loading) return <GlobalLoader isLoading={true} />;

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                {/* Header */}
                <PageHeader
                    title={formData.name || id || "Disbursal of Honorarium"}
                    status={formData.workflow_state || "Draft"}
                    projectName={
                        resolvedProjectTitle || formData.project_title
                    }
                    projectNumber={formData.project_no}
                >
                    <div className="flex items-center gap-2">
                        {(formData.workflow_state === "Draft" || !formData.workflow_state) && id && (
                            <>
                                <button
                                    onClick={() => navigate(`/disbursal-of-honorarium-form/${id}`)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
                                >
                                    <EditIcon className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={handleSubmitApplication}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-4 h-4" />
                                    {isSubmitting ? "Submitting..." : "Submit Application"}
                                </button>
                            </>
                        )}
                        {id && (
                            <DisbursalOfHonorariumActionButtons
                                docname={id}
                                onActionComplete={handleRefresh}
                                onPrint={() => setIsPrintModalOpen(true)}
                                commitRequired={
                                    isRnDStaff &&
                                    formData.workflow_state === "Pending Staff Approval" &&
                                    isCommittedForGate === false
                                }
                            />
                        )}
                    </div>
                </PageHeader>

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
                    <aside className="lg:col-span-1 space-y-3">
                        {/* Status + Last Modified */}
                        <div className="bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span
                                    className={cn(
                                        "px-2.5 py-1 text-xs font-bold rounded-full",
                                        formData.workflow_state === "Approved" &&
                                        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                        formData.workflow_state === "Rejected" &&
                                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                        formData.workflow_state === "Draft" &&
                                        "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
                                        !["Approved", "Rejected", "Draft"].includes(formData.workflow_state || "") &&
                                        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                    )}
                                >
                                    {formData.workflow_state || "Draft"}
                                </span>
                                {formData.modified && (
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                        <CalendarIcon className="w-3 h-3" />
                                        {new Date(formData.modified).toLocaleDateString("en-IN")}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Project Budget */}
                        <div className="bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Commitable Balance</span>
                                <span className="text-base font-bold text-[#D97757]">₹ {totalCommitableBalance.toLocaleString("en-IN")}</span>
                            </div>
                            <button
                                onClick={() => setIsLedgerOpen(true)}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-[#D97757] font-semibold text-xs hover:bg-[#B2DFDB] transition-colors"
                            >
                                <LedgerIcon className="w-3.5 h-3.5" />
                                View Ledger
                            </button>
                        </div>


                        {/* Make a Commitment / Committed Data Display */}
                        {(formData.workflow_state === "Pending Staff Approval" ||
                            formData.workflow_state === "Approved") &&
                            isRnDStaff &&
                            id && (
                                <CommitPayment
                                    doctype="Disbursal of Honorarium"
                                    docName={id}
                                    projectName={projectTitle}
                                    budgetHeads={budgetHeads}
                                    actualBalance={actualBalance}
                                    commitableBalance={commitableBalance}
                                    onCommitSuccess={() => handleRefresh()}
                                    onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
                                />
                            )}


                        {/* Record Payment */}
                        {(formData.workflow_state ===
                            "Pending Staff Approval" ||
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
                                                        {linkedCommitment?.head}
                                                    </p>
                                                    <p className="text-lg font-bold text-blue-700">
                                                        ₹{" "}
                                                        {linkedCommitment?.committed.toLocaleString(
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
                                                    onChange={(e) =>
                                                        setPaymentAmount(
                                                            e.target.value,
                                                        )
                                                    }
                                                    max={
                                                        linkedCommitment?.committed
                                                    }
                                                />
                                                <p className="text-xs text-zinc-500 mt-1">
                                                    Max: ₹{" "}
                                                    {linkedCommitment?.committed.toLocaleString(
                                                        "en-IN",
                                                    )}
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
                                                    (linkedCommitment?.committed ||
                                                        0)
                                                }
                                            >
                                                {isPaying
                                                    ? "Processing..."
                                                    : "Submit Payment"}
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
                                                Make a commitment above before
                                                recording payment.
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
            <P11PrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                htmlContent={
                    isPrintModalOpen
                        ? generateDisbursalOfHonorariumHtml(
                            resolveHonorariumPrintData({
                                ...formData,
                                project_name: resolvedProjectTitle || formData.project_name,
                                name_of_applicant: applicantFullName || formData.name_of_applicant,
                            }, linkOptions),
                            activityData?.message || [],
                            docActivityData?.message,
                        )
                        : ""
                }
                docName={formData.name || id || ""}
            />
            {id && (
                <FloatingActivityLogButton
                    doctype="Disbursal of Honorarium"
                    docname={id}
                />
            )}
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default DisbursalOfHonorariumDetails;
