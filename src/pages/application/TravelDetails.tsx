import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { useFrappePostCall, useFrappeGetCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { CalendarIcon, FileSpreadsheetIcon as LedgerIcon, EditIcon, Send, ReceiptText, AlertTriangle, CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalLoader } from '@/components/ui/global-loader';
import { Textarea } from '@/components/ui/textarea';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { travelAPI } from '@/services/apiService';
import TravelActionButtons from '@/components/TravelActionButtons';
import { useProjectBudget } from '@/hooks/useProjectBudget';
import { useUserRoles } from '@/components/UserRole';
import { ProjectLedgerModal } from '@/components/ProjectLedgerModal';
import { CommitPayment } from '@/components/CommitPayment';
import { ActivityLog } from '@/components/ActivityLog';
import ViewProjectButton from '@/components/ViewProjectButton';
import TravelApplicantSummary from '@/components/TravelApplicantSummary';
import { generateTravelDirectorReviewHtml, buildSclBalanceRow, type SclBalanceData } from '@/utils/travelDirectorPrint';
import { resolveDepartmentLabel } from '@/utils/resolveDepartmentLabel';
import { fetchDeclarationFields } from '@/utils/fetchDeclarationHtml';
import { fetchActivityLogHtml } from '@/utils/fetchActivityLogHtml';
import { Printer, Download, UploadCloud } from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        scl_balance?: SclBalanceData;
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

// --- WORKFLOW TIMELINE ---
// Core forward path for a Travel application. `Pending PI Approval` /
// `Pending Mentor Approval` only apply to Student/project staff and
// Independent Researcher applicants respectively — Permanent Employee
// (the common case) skips straight from Draft to Pending Head Approval.
const TRAVEL_CORE_STAGES = [
    'Pending Head Approval',
    'Pending Staff Approval',
    'Pending HoS Approval',
    'Pending Dean Approval',
    'Approved',
];

// International travel routes through a real "Pending Director Approval"
// workflow state between Dean approval and final Approved — see
// docs/travel-director-approval-implementation.md
const TRAVEL_DIRECTOR_STAGES = [
    'Pending Head Approval',
    'Pending Staff Approval',
    'Pending HoS Approval',
    'Pending Dean Approval',
    'Pending Director Approval',
    'Approved',
];

type StageStatus = 'completed' | 'in-progress' | 'pending' | 'rejected';

function buildTravelTimelineStages(
    currentState: string,
    isInternational: boolean,
): { label: string; status: StageStatus }[] {
    const isApproved = currentState === 'Approved';
    const isRejected = currentState === 'Rejected';
    const entryStage =
        currentState === 'Pending PI Approval' || currentState === 'Pending Mentor Approval'
            ? currentState
            : null;

    const coreStages =
        isInternational || currentState === 'Pending Director Approval'
            ? TRAVEL_DIRECTOR_STAGES
            : TRAVEL_CORE_STAGES;
    const stages = ['Draft', ...(entryStage ? [entryStage] : []), ...coreStages];
    const stagesForRejected = [...stages.slice(0, -1), 'Rejected'];
    const activeStages = isRejected ? stagesForRejected : stages;

    let currentIdx = activeStages.findIndex((s) => s === currentState);
    if (currentIdx === -1) currentIdx = currentState ? 1 : 0;

    return activeStages.map((stage, idx) => {
        if (isApproved) return { label: stage, status: 'completed' };
        if (isRejected) {
            if (idx === activeStages.length - 1) return { label: stage, status: 'rejected' };
            return { label: stage, status: 'pending' };
        }
        if (idx < currentIdx) return { label: stage, status: 'completed' };
        if (idx === currentIdx) return { label: stage, status: 'in-progress' };
        return { label: stage, status: 'pending' };
    });
}

const WorkflowTimeline: React.FC<{ currentState: string; isInternational?: boolean }> = ({ currentState, isInternational = false }) => {
    const stages = buildTravelTimelineStages(currentState || 'Draft', isInternational);

    const iconForStatus = (status: StageStatus) => {
        if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-white" />;
        if (status === 'in-progress') return <Clock className="w-4 h-4 text-white" />;
        if (status === 'rejected') return <XCircle className="w-4 h-4 text-white" />;
        return <span className="w-2 h-2 rounded-full bg-white/60" />;
    };

    const bgForStatus = (status: StageStatus) => {
        if (status === 'completed') return 'bg-emerald-500';
        if (status === 'in-progress') return 'bg-[#D97757]';
        if (status === 'rejected') return 'bg-red-500';
        return 'bg-zinc-300 dark:bg-zinc-600';
    };

    const connectorColor = (status: StageStatus) =>
        status === 'completed' ? 'bg-emerald-400' : 'bg-zinc-200 dark:bg-zinc-700';

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-5">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                Workflow Progress
            </h3>
            <div className="flex items-start overflow-x-auto pb-1">
                {stages.map((stage, idx) => (
                    <React.Fragment key={stage.label}>
                        <div className="flex flex-col items-center min-w-[90px] max-w-[110px]">
                            <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center shadow-sm flex-shrink-0',
                                bgForStatus(stage.status),
                            )}>
                                {iconForStatus(stage.status)}
                            </div>
                            <p className={cn(
                                'mt-2 text-center text-xs leading-tight px-1',
                                stage.status === 'in-progress' ? 'font-bold text-[#D97757]' : '',
                                stage.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : '',
                                stage.status === 'pending' ? 'text-zinc-400 dark:text-zinc-500' : '',
                                stage.status === 'rejected' ? 'text-red-500 font-bold' : '',
                            )}>
                                {stage.label}
                            </p>
                            {stage.status === 'in-progress' && (
                                <span className="mt-1 text-[10px] font-bold text-white bg-[#D97757] px-2 py-0.5 rounded-full">
                                    Pending Here
                                </span>
                            )}
                        </div>
                        {idx < stages.length - 1 && (
                            <div className="flex-1 flex items-center pt-4 min-w-[20px]">
                                <div className={cn('h-1 w-full rounded', connectorColor(stage.status))} />
                                <ChevronRight className="w-3 h-3 text-zinc-400 flex-shrink-0 -ml-1" />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const TravelDetails: React.FC = () => {
    const { docName } = useParams<{ docName: string }>();
    const navigate = useNavigate();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    // Real, per-applicant SCL balance computed server-side (see get_travel_fields),
    // used to print a compact balance row instead of the large styled card shown
    // on the live form.
    const [sclBalanceData, setSclBalanceData] = useState<SclBalanceData | null>(null);

    // Override account_head fieldtype to Link so DynamicFormRenderer uses BudgetHeadName overlay
    const renderedFields = useMemo(() =>
        fields.map(f => f.fieldname === 'account_head' ? { ...f, fieldtype: 'Link' } : f),
    [fields]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sidebar state
    const [sidebarComment, setSidebarComment] = useState("");
    const [isAddingComment, setIsAddingComment] = useState(false);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);

    const [commitHead, setCommitHead] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");
    // Track Kafka Commit Staging status to gate workflow action buttons for Staff RnD
    const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);

    // Budget head list for ledger modal
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);

    // Resolved project number — travel_project_number is a Link field whose value is
    // the Frappe docname of Project Registration (may be an internal ID like "110001").
    // We fetch the actual project_no from that document to use for budget lookups & display.
    const [resolvedProjectNo, setResolvedProjectNo] = useState<string>("");
    // travel_project_title is also a Link to the same Project Registration
    // docname (not free text) — resolve its actual project_title alongside
    // project_no in the same fetch below.
    const [resolvedProjectTitle, setResolvedProjectTitle] = useState<string>("");

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(travelAPI.getFields);
    const { call: fetchDocument } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: submitDocument } = useFrappePostCall<{ message: any }>(travelAPI.submit);
    const { call: addComment } = useFrappePostCall('rndopsapp.rndopsapp.api.add_project_comment');
    const { call: performTravelAction, loading: isSendingToDirector } = useFrappePostCall(travelAPI.performAction);
    const { call: attachDirectorPdf, loading: isUploadingDirectorPdf } = useFrappePostCall(travelAPI.attachDirectorPdf);

    // Fetch linked TA/DA Settlement status
    const { data: tadaListData } = useFrappeGetCall<{ message: { name: string; workflow_state: string }[] }>(
        'frappe.client.get_list',
        docName ? {
            doctype: 'TA DA Settlement',
            filters: JSON.stringify([['ta_da_travel_application', '=', docName]]),
            fields: JSON.stringify(['name', 'workflow_state']),
            limit: 1,
        } : undefined,
        undefined,
        { revalidateOnFocus: false, isPaused: () => !docName },
    );
    const tadaSettlement = tadaListData?.message?.[0] ?? null;
    // submitCommit moved to CommitPayment component
    const { call: submitPayment, loading: isPaying } = useFrappePostCall(
        'rndopsapp.rndopsapp.commitPayment.submit_payment_data',
    );

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);

    // --- RESOLVE ACTUAL PROJECT NUMBER ---
    // travel_project_number is a Link field whose stored value is the Frappe docname of
    // Project Registration (may be an internal ID like "110001").
    // Fetch the linked document to get the actual project_no field (e.g. "26RBSBESP0391XXLS0010").
    useEffect(() => {
        const linkedName = formData?.travel_project_number;
        if (!linkedName) return;
        fetchDocument({ doctype: "Project Registration", name: linkedName })
            .then((res) => {
                const projectDoc = res?.message;
                if (projectDoc?.project_no) {
                    setResolvedProjectNo(projectDoc.project_no);
                } else {
                    // Fallback: use the raw link value if project_no not found
                    setResolvedProjectNo(linkedName);
                }
                setResolvedProjectTitle(projectDoc?.project_title || "");
            })
            .catch(() => {
                setResolvedProjectNo(linkedName);
            });
    }, [formData?.travel_project_number]);

    // --- PROJECT BUDGET ---
    // Use the resolved project_no (actual code) for all budget/ledger lookups
    const projectTitle = resolvedProjectNo || formData?.travel_project_title || "";

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
    const totalCommitableBalance = projectAmountsResult?.availablePaymentAmount ?? 0;
    const defaultCommitBudgetHead = useMemo(() => {
        const rawHead = String(formData.account_head || '').trim();
        if (!rawHead) return '';

        const directMatch = budgetHeads.find(
            (head) => head.trim().toLowerCase() === rawHead.toLowerCase(),
        );
        if (directMatch) return directMatch;

        const optionMatch = (linkOptions.account_head || linkOptions['Budget Head'] || []).find(
            (option) => String(option.value).trim().toLowerCase() === rawHead.toLowerCase(),
        );
        if (optionMatch?.label) {
            return (
                budgetHeads.find(
                    (head) =>
                        head.trim().toLowerCase() ===
                        String(optionMatch.label).trim().toLowerCase(),
                ) || optionMatch.label
            );
        }

        return rawHead;
    }, [budgetHeads, formData.account_head, linkOptions]);

    const linkedCommitment = budgetData.find(
        (e) =>
            (e.ref === (docName || "") || e.frapAppId === (docName || "")) &&
            e.type === "commitment",
    );

    const linkedPayment = budgetData.find(
        (e) =>
            (e.ref === (docName || "") || e.frapAppId === (docName || "")) &&
            e.type === "transaction" &&
            e.payment > 0,
    );

    const isCommitted = !!linkedCommitment;

    const { data: cancellationStatus } = useFrappeGetCall<{
        message: {
            has_pending: boolean;
            has_cancellation: boolean;
            cancellation_requests: any[];
        };
    }>(
        "rndopsapp.rndopsapp.cancellation_api.get_cancellation_status",
        {
            reference_doctype: "Travel",
            reference_name: docName,
        },
        docName ? undefined : null
    );

    // Unified commitment display: prefer ledger data
    const displayCommitment = linkedCommitment
        ? { head: linkedCommitment.head, committed: linkedCommitment.committed }
        : null;

    const isRnDStaff = roles.some(
        (r) =>
            r === "RnD Staff" ||
            r === "R&D Staff" ||
            r === "Research and Development Staff" ||
            r === "System Manager" ||
            r === "staff, RnD",
    );

    const isHoS = roles.some((r) => r === "Hos, RnD (Head of Section, RnD)");

    // Only staff, RnD (not Hos, RnD) actually submit a commitment — HoS is an
    // approver and should only ever see what staff, RnD already committed.
    const canSubmitCommitment = roles.some(
        (r) =>
            r === "RnD Staff" ||
            r === "R&D Staff" ||
            r === "Research and Development Staff" ||
            r === "System Manager" ||
            r === "staff, RnD",
    );

    const isDeanRnd = roles.some((r) => r === "Dean, RnD" || r === "System Manager");

    // Director approval (International travel) — a real Workflow branch, see
    // docs/travel-director-approval-implementation.md. "Pending Director
    // Approval" is a genuine workflow_state (added via
    // rndopsapp.patchs.add_travel_director_approval_workflow), not a flag —
    // the backend only offers "Send for Director Approval" / "Approve" as
    // available actions when their transition conditions are met, so no
    // client-side gating is needed beyond showing/hiding this panel.
    const isInternational = formData.nature_of_travel === "International";
    const directorSignedPdf = formData.director_signed_pdf || "";
    const isPendingDeanApproval = formData.workflow_state === "Pending Dean Approval";
    const isPendingDirectorApproval = formData.workflow_state === "Pending Director Approval";
    const showDirectorPanel =
        isPendingDirectorApproval || (isPendingDeanApproval && isInternational);

    // Advance / Settle logic
    const needsAdvance = formData.travel_financial_assistance === "Yes";
    const isApproved = formData.workflow_state === "Approved";
    // Only the applicant who initiated this Travel application should see "Settle Travel" —
    // not the approvers (HoS/Dean/Ado_RnD/etc.) reviewing/approving it.
    const isApplicant =
        !!currentUser &&
        !!formData.webmail_id_travel &&
        currentUser.toLowerCase() === String(formData.webmail_id_travel).toLowerCase();
    // Settle: after Dean approval; if advance needed, only after payment recorded;
    // and only when a TA/DA Settlement hasn't already been raised for this travel.
    const showSettleButton = isApplicant && isApproved && !tadaSettlement && (needsAdvance ? !!linkedPayment : true);


    // Block "Forward" when R&D Staff hasn't committed yet but advance is required
    const commitRequired =
        formData.workflow_state === "Pending Staff Approval" &&
        isRnDStaff &&
        needsAdvance &&
        isCommittedForGate === false;

    // Show commit section for any in-progress workflow state (not Draft/Rejected/Cancelled)
    const showCommitSection =
        isRnDStaff &&
        formData.workflow_state &&
        !["Draft", "Rejected", "Cancelled"].includes(formData.workflow_state);

    // HoS sees a read-only view of the commitment made by R&D Staff
    const showCommitReadOnly =
        isHoS &&
        isCommitted &&
        formData.workflow_state &&
        !["Draft", "Rejected", "Cancelled"].includes(formData.workflow_state);

    useEffect(() => {
        if (!showCommitSection || isCommitted || !formData.account_head) return;
        setCommitHead(formData.account_head);
    }, [showCommitSection, isCommitted, formData.account_head]);

    useEffect(() => {
        if (budgetHeads.length > 0 && !commitHead) {
            setCommitHead(budgetHeads[0] || "Overhead");
        }
    }, [budgetHeads]);

    useEffect(() => {
        if (linkedCommitment) {
            setCommitHead(linkedCommitment.head || "");
            if (!paymentAmount) setPaymentAmount(String(linkedCommitment.committed));
        }
    }, [linkedCommitment]);

    // Fetch budget head list — also used to resolve account_head docname → label
    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch(
                    '/api/resource/Budget%20Head?fields=["name","budget_head","id"]&order_by=id%20asc&limit_page_length=0',
                    { credentials: "include" },
                );
                const result = await response.json();
                if (result?.data) {
                    const mapped = result.data.map((item: any) => ({
                        uid: item.name,          // Frappe docname — stored in account_head
                        label: item.budget_head, // Human-readable label
                        id: item.id,
                    }));
                    setBudgetHeadList(mapped.map((h: any) => ({ name: h.label, id: h.id })));
                    // Inject into linkOptions so DynamicFormRenderer resolves account_head uid → label
                    const budgetHeadOptions = mapped.map((h: any) => ({ value: h.uid, label: h.label }));
                    setLinkOptions(prev => ({
                        ...prev,
                        'Budget Head': budgetHeadOptions,
                        'account_head': budgetHeadOptions,
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch Budget Heads:", err);
            }
        };
        fetchBudgetHeads();
    }, []);

    // --- DATA FETCHING ---
    useEffect(() => {
        if (docName) {
            fetchFormData({ doc_name: docName });
        }
    }, [docName, refreshKey]);

    useEffect(() => {
        const loadDocument = async () => {
            if (formDataResult?.message && docName) {
                const { fields: apiFields, link_options, scl_balance } = formDataResult.message;
                setFields(apiFields || []);
                setLinkOptions(link_options || {});
                setSclBalanceData(scl_balance || null);

                try {
                    const doc = await fetchDocument({
                        doctype: 'Travel',
                        name: docName,
                    });
                    if (doc?.message) {
                        setFormData(doc.message);
                    }
                } catch (err) {
                    console.error('Error fetching document:', err);
                }

                setLoading(false);
            }
            if (formDataError) {
                console.error("Failed to load form data:", formDataError);
                setLoading(false);
            }
        };

        loadDocument();
    }, [formDataResult, formDataError, docName]);

    const handleRefresh = useCallback(() => {
        setRefreshKey((k) => k + 1);
        setLoading(true);
    }, []);

    // --- SUBMIT DRAFT ---
    const handleSubmitDraft = async () => {
        if (!docName || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const submitRes = await submitDocument({ docname: docName });
            if (submitRes?.message?.status === 'success') {
                alert("Travel application submitted successfully!");
                handleRefresh();
            } else {
                throw new Error(submitRes?.message?.message || "Submission failed");
            }
        } catch (err: any) {
            alert(`Submission failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- DIRECTOR APPROVAL (International travel) ---
    // See docs/travel-director-approval-implementation.md
    const openDirectorReviewPrintWindow = async () => {
        const [resolvedDepartment, declarationFields, activityLogHtml] = await Promise.all([
            resolveDepartmentLabel(formData.department_travel),
            fetchDeclarationFields("Travel"),
            fetchActivityLogHtml("Travel", docName || ""),
        ]);
        // travel_leave_balance_html isn't a declaration — it's the applicant's
        // SCL balance card, which prints as its own compact table row (built
        // from the real, per-applicant scl_balance data — see sclBalanceData)
        // instead of being shown here or as the large styled card.
        const declarationsHtml = Object.entries(declarationFields)
            .filter(([fieldname]) => fieldname !== "travel_leave_balance_html")
            .map(([, html]) => html)
            .join("");
        const sclBalanceRow = buildSclBalanceRow(sclBalanceData);
        const html = generateTravelDirectorReviewHtml(
            formData,
            defaultCommitBudgetHead,
            resolvedDepartment,
            declarationsHtml,
            activityLogHtml,
            sclBalanceRow,
            resolvedProjectTitle,
        );
        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        }
    };

    // First time: print the review copy AND perform the real "Send for
    // Director Approval" workflow transition, in one click, per the
    // requirement — this moves workflow_state to "Pending Director Approval".
    const handlePrintAndSendToDirector = async () => {
        if (!docName) return;
        openDirectorReviewPrintWindow();
        try {
            const res = await performTravelAction({ docname: docName, action: "Send for Director Approval" });
            if (res?.message?.status && res.message.status !== "success") {
                throw new Error(res.message.message || "Action failed");
            }
            handleRefresh();
        } catch (err: any) {
            alert(`Failed to send for Director approval: ${err.message || "Unknown error"}`);
        }
    };

    // Any time after that: reprint only, no API call — covers a lost/forgotten
    // hard copy without re-triggering the status flip.
    const handleDownloadDirectorReview = () => {
        openDirectorReviewPrintWindow();
    };

    const handleDirectorPdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !docName) return;
        try {
            const fd = new FormData();
            fd.append("file", file, file.name);
            fd.append("doctype", "Travel");
            fd.append("docname", docName);
            fd.append("fieldname", "director_signed_pdf");
            fd.append("is_private", "1");
            const uploadRes = await fetch("/api/method/upload_file", {
                method: "POST",
                body: fd,
                credentials: "include",
            });
            const uploadJson = await uploadRes.json();
            const fileUrl = uploadJson?.message?.file_url;
            if (!uploadRes.ok || !fileUrl) {
                throw new Error(uploadJson?.message?.message || "Upload failed");
            }
            await attachDirectorPdf({ docname: docName, file_url: fileUrl });
            handleRefresh();
        } catch (err: any) {
            alert(`Failed to upload Director-signed copy: ${err.message || "Unknown error"}`);
        }
    };

    // --- COMMIT ---
    // handleCommit moved to CommitPayment component

    // --- PAYMENT ---
    const handlePayment = async () => {
        if (!paymentAmount || !commitHead || !docName) {
            alert("Please select a budget head and enter an amount.");
            return;
        }
        try {
            await submitPayment({
                doctype: "Travel",
                name: docName,
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
        if (!sidebarComment.trim() || !docName) return;
        setIsAddingComment(true);
        try {
            await addComment({
                doctype: "Travel",
                docname: docName,
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

    // --- RENDER ---
    if (loading) return <GlobalLoader isLoading={true} />;

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                {/* Header */}
                <PageHeader
                    title={formData.name || docName || "Travel"}
                    status={formData.workflow_state || "Draft"}
                    projectName={resolvedProjectTitle || formData.travel_project_title}
                    projectNumber={resolvedProjectNo || formData.travel_project_number}
                >
                    <ViewProjectButton doctype="Travel" data={formData} />
                    {!cancellationStatus?.message?.has_pending && docName && formData.workflow_state && formData.workflow_state !== "Draft" && (
                        <TravelActionButtons
                            docName={docName}
                            onActionComplete={handleRefresh}
                            commitRequired={commitRequired}
                        />
                    )}
                    {(formData.workflow_state === "Draft" || !formData.workflow_state) && docName && (
                        <>
                            <button
                                onClick={() => navigate(`/travel?edit=${docName}`)}
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
                    {showSettleButton && docName && (
                        <button
                            onClick={() => navigate(`/ta-da-settlement?project=${resolvedProjectNo || formData.travel_project_number}&travel_ref=${docName}`)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm transition-all"
                        >
                            <ReceiptText className="w-4 h-4" />
                            Settle Travel
                        </button>
                    )}
                </PageHeader>

                {/* Workflow Timeline */}
                <div className="mt-6 mb-6">
                    <WorkflowTimeline currentState={formData.workflow_state || 'Draft'} isInternational={isInternational} />
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

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Content — read-only form */}
                    <div className="lg:col-span-3">
                        <FrappeCard className="space-y-6">
                            <TravelApplicantSummary
                                webmail={formData.webmail_id_travel}
                                fullName={formData.applicant_name_travel}
                                department={formData.department_travel}
                                designation={formData.designation_travel}
                                projectNo={resolvedProjectNo || formData.travel_project_number}
                            />
                            <DynamicFormRenderer
                                fields={renderedFields}
                                formData={formData}
                                linkOptions={linkOptions}
                                onChange={noOp}
                                onFileChange={noOp}
                                onTableRowChange={noOp}
                                onTableFileChange={noOp}
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
                                    <span className="text-zinc-600 dark:text-zinc-400">Workflow State</span>
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
                                {tadaSettlement && (
                                    <div className="flex justify-between items-center pt-1 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                                        <span className="text-zinc-600 dark:text-zinc-400">TA/DA Settlement</span>
                                        <span
                                            className={cn(
                                                "px-3 py-1 text-xs font-bold rounded-full",
                                                tadaSettlement.workflow_state === "Approved" &&
                                                    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                                tadaSettlement.workflow_state === "Rejected" &&
                                                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                                !["Approved", "Rejected"].includes(tadaSettlement.workflow_state || "") &&
                                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                            )}
                                        >
                                            {tadaSettlement.workflow_state || "Pending"}
                                        </span>
                                    </div>
                                )}
                                {formData.modified && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-600 dark:text-zinc-400">Last Modified</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                                            <CalendarIcon className="w-3 h-3" />
                                            {new Date(formData.modified).toLocaleDateString("en-IN")}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Director Approval — International travel only.
                            See docs/travel-director-approval-implementation.md */}
                        {showDirectorPanel && (
                            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                                    Director Approval
                                </h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
                                    This is an International travel application and requires Director
                                    approval before the Dean can give final approval.
                                </p>

                                <div className="space-y-3">
                                    {/* Dean: first-time print & send (real "Send for Director Approval" transition) */}
                                    {isDeanRnd && isPendingDeanApproval && (
                                        <button
                                            onClick={handlePrintAndSendToDirector}
                                            disabled={isSendingToDirector}
                                            className="w-full flex items-center justify-center gap-2 bg-[#D97757] hover:bg-[#c66a4e] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            <Printer className="w-4 h-4" />
                                            {isSendingToDirector ? "Sending…" : "Print & Send for Director Approval"}
                                        </button>
                                    )}

                                    {/* Dean: reprint any time after the first send, while the signed copy is outstanding */}
                                    {isDeanRnd && isPendingDirectorApproval && !directorSignedPdf && (
                                        <button
                                            onClick={handleDownloadDirectorReview}
                                            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download for Director Approval
                                        </button>
                                    )}

                                    {/* staff, RnD: upload the Director-signed copy once sent */}
                                    {isRnDStaff && isPendingDirectorApproval && !directorSignedPdf && (
                                        <label className="w-full flex items-center justify-center gap-2 bg-[#D97757] hover:bg-[#c66a4e] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50">
                                            <UploadCloud className="w-4 h-4" />
                                            {isUploadingDirectorPdf ? "Uploading…" : "Upload Director-Signed Copy"}
                                            <input
                                                type="file"
                                                accept="application/pdf,image/*"
                                                className="hidden"
                                                disabled={isUploadingDirectorPdf}
                                                onChange={handleDirectorPdfFileChange}
                                            />
                                        </label>
                                    )}

                                    {isPendingDeanApproval && !isDeanRnd && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Awaiting the Dean to send this application for Director approval.
                                        </p>
                                    )}

                                    {isPendingDirectorApproval && !directorSignedPdf && !isRnDStaff && !isDeanRnd && (
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                            Sent for Director approval — awaiting the signed copy from staff, RnD.
                                        </p>
                                    )}

                                    {directorSignedPdf && (
                                        <a
                                            href={directorSignedPdf}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5"
                                        >
                                            <Download className="w-4 h-4" />
                                            View Director-Signed Copy
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

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
                                    ₹ {totalCommitableBalance.toLocaleString("en-IN")}
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

                        {/* Latest Activity */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                Latest Activity
                            </h3>
                            {docName && (
                                <ActivityStream
                                    doctype="Travel"
                                    docname={docName}
                                />
                            )}
                        </div>

                        {/* Document Activity Log (new endpoint) */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            {docName && <ActivityLog doctype="Travel" docname={docName} />}
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

                        {/* HoS read-only commitment view */}
                        {showCommitReadOnly && (
                            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                    Commitment by R&D Staff
                                </h3>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 flex flex-col gap-1">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">
                                        Linked Commitment
                                    </p>
                                    <div className="flex justify-between items-end">
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                                            {displayCommitment?.head}
                                        </p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                            ₹ {Number(displayCommitment?.committed || 0).toLocaleString("en-IN")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Commit Payment — centralised component handles staging check + form/display card */}
                        {showCommitSection && (
                            <CommitPayment
                                doctype="Travel"
                                docName={docName || ""}
                                projectName={projectTitle}
                                budgetHeads={budgetHeads}
                                defaultBudgetHead={defaultCommitBudgetHead}
                                actualBalance={actualBalance}
                                commitableBalance={commitableBalance}
                                billAmount={Number(formData.total_estimate) || undefined}
                                disabled={!canSubmitCommitment}
                                disabledReason="Only staff, RnD can submit a commitment. Hos, RnD can view what staff, RnD already committed here."
                                onCommitSuccess={() => handleRefresh()}
                                onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
                            />
                        )}

                        {/* Record Payment */}
                        {showCommitSection && (
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
                                                    ₹ {Number(displayCommitment?.committed || 0).toLocaleString("en-IN")}
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
                                                Max: ₹ {Number(displayCommitment?.committed || 0).toLocaleString("en-IN")}
                                            </p>
                                        </div>
                                        <FrappeButton
                                            className="w-full"
                                            variant="outline"
                                            onClick={handlePayment}
                                            disabled={
                                                isPaying ||
                                                !paymentAmount ||
                                                parseFloat(paymentAmount) > (displayCommitment?.committed || 0)
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

export default TravelDetails;
