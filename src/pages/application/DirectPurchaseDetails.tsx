

// -=-=-=======================================================================================

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
    useFrappePostCall,
    useFrappeGetCall,
    useFrappeGetDoc,
    useFrappeAuth,
} from "frappe-react-sdk";
import { useUserRoles } from "@/components/UserRole";
import { cn } from "@/lib/utils";
import {
    CalendarIcon,
    UserIcon,
    EditIcon,
    FileTextIcon,
    ClipboardListIcon,
    ShoppingCartIcon,
    LayoutGridIcon,
    FileIcon,
    ExternalLinkIcon,
    CheckCircle2Icon,
    XCircleIcon,
    Printer,
    PaperclipIcon,
    ReceiptIcon,
    PlusIcon,
    Trash2Icon,
    SaveIcon,
    AlertCircleIcon,
    ActivityIcon,
    Clock,
    ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { GlobalLoader } from "@/components/ui/global-loader";
import { Textarea } from "@/components/ui/textarea";
import {
    directPurchaseAPI,
    dpPoAPI,
    p11FormAPI,
    sanctionSheetAPI,
    commonAPI,
} from "@/services/apiService";
import { DepartmentName } from "@/components/DepartmentName";
import { BudgetHeadName } from "@/components/BudgetHeadName";
import { generateP11Html } from "@/utils/p11Print";
import { generateSanctionSheetHtml } from "@/utils/sanctionSheetPrint";
import { generateDpHtml } from "@/utils/dpPrint";
import { generatePOHtml } from "@/utils/DpPoPrint";
import { P11PrintModal } from "@/components/P11PrintModal";
import { POEditor } from "@/components/POEditor";
import { DeclarationFields } from "@/components/DeclarationFields";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { ActivityLog, clearActivityLogCache } from "@/components/ActivityLog";
import ViewProjectButton from "@/components/ViewProjectButton";
import { CommitPayment } from "@/components/CommitPayment";
import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";
import { ErrorModal } from "../../components/ErrorModal";
import { parseFrappeError } from "../../utils/errorUtils";
import DirectPurchaseHelpGuide from "@/components/DirectPurchaseHelpGuide";
import { CharLimitAlert } from "@/components/CharLimitAlert";

// --- TYPE DEFINITIONS ---
interface DirectPurchaseData {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    workflow_state: string;
    project_name?: string;
    project_no?: string;
    project?: string;
    applicant_name?: string;
    applicant_department?: string;
    applicant_designation?: string;
    account_head?: string;
    [key: string]: any;
}

type TabId = "details" | "p11" | "sanction" | "po" | "settlement";

// ---------------------------------------------------------------------------
// Direct Purchase Workflow Timeline
// ---------------------------------------------------------------------------
type DPStageStatus = "completed" | "in-progress" | "pending" | "rejected";

interface DPStage {
    label: string;
    sublabel?: string;
    description: string;
    status: DPStageStatus;
    conditional?: boolean;
    nextAction?: string;
}

const DP_FIRST_APPROVAL_STATES = [
    "Pending PI Approval",
    "Pending Mentor Approval",
    "Pending Head Approval",
];

const DP_PHASE1_ORDER = [
    "Draft",               // 0
    "__first__",           // 1 — any of DP_FIRST_APPROVAL_STATES
    "Pending Staff Approval",     // 2
    "Pending HoS Approval",       // 3
    "Pending Dean Approval",      // 4
    "Pending Director Approval",  // 5
    "Approved",                   // 6
];

const DP_PHASE2_ORDER = [
    "Pending Staff Verification",
    "RDP-11 Verified",
    "Sanction Sheet Generated",
    "Sanction Sheet Printed",
    "Sanction Approved",
    "POGenerated",
];

function dpP1Idx(state: string): number {
    if (DP_FIRST_APPROVAL_STATES.includes(state)) return 1;
    return DP_PHASE1_ORDER.indexOf(state);
}

const DP_PHASE2_LABELS: Record<string, { label: string; description: string; nextAction?: string }> = {
    "Pending Staff Verification": {
        label: "P-11 Submitted",
        description: "Applicant submits the P-11 form. Items from the purchase list are mapped into the P-11 document for staff to verify.",
        nextAction: "Verify Hardcopy",
    },
    "RDP-11 Verified": {
        label: "P-11 Verified",
        description: "R&D Staff verifies the physical hardcopy of the RDP-11 document against the system record.",
        nextAction: "Generate Sanction Sheet",
    },
    "Sanction Sheet Generated": {
        label: "Sanction Created",
        description: "R&D Staff generates the Sanction Sheet from the verified P-11. Rates, GST, make/model details are filled in.",
        nextAction: "Mark Print Taken",
    },
    "Sanction Sheet Printed": {
        label: "Print Taken",
        description: "The applicant (Permanent Employee) acknowledges that a physical print of the Sanction Sheet has been taken.",
        nextAction: "Verify Sanction Sheet",
    },
    "Sanction Approved": {
        label: "Sanction Approved",
        description: "R&D Staff verifies the signed Sanction Sheet and marks it as approved before generating the Purchase Order.",
        nextAction: "Generate PO",
    },
    "POGenerated": {
        label: "PO Generated",
        description: "R&D Staff generates the Purchase Order. Final value = Basic Value + Packing & Forwarding + Freight. Document is submitted (finalised).",
    },
};

function buildDPWorkflow(
    workflowState: string,
    accountHead?: string,
    totalEstimate?: number,
): { phase1: DPStage[]; phase2: DPStage[] } {
    const isRejected = workflowState === "Rejected";
    const isInPhase2 = DP_PHASE2_ORDER.includes(workflowState);
    const isApprovedOrBeyond = workflowState === "Approved" || isInPhase2;

    const needsDirector =
        (accountHead === "Consumable" || accountHead === "Contingency") &&
        (totalEstimate ?? 0) > 300000;
    const showDirector = needsDirector || workflowState === "Pending Director Approval";

    const currentP1 = isApprovedOrBeyond ? 99 : dpP1Idx(workflowState);

    const p1Status = (stageIdx: number): DPStageStatus => {
        if (isRejected) return stageIdx === 0 ? "completed" : "rejected";
        if (isApprovedOrBeyond) return "completed";
        if (currentP1 === -1) return "pending";
        if (stageIdx < currentP1) return "completed";
        if (stageIdx === currentP1) return "in-progress";
        return "pending";
    };

    const firstLabel =
        workflowState === "Pending PI Approval" ? "PI Review" :
            workflowState === "Pending Mentor Approval" ? "Mentor Review" :
                workflowState === "Pending Head Approval" ? "Head Review" :
                    "Initial Review";

    const firstDesc =
        workflowState === "Pending PI Approval"
            ? "Submitted by project staff. The Principal Investigator reviews and forwards the application to R&D Staff."
            : workflowState === "Pending Mentor Approval"
                ? "Submitted by an Independent Researcher. The Mentor reviews and forwards the application to R&D Staff."
                : workflowState === "Pending Head Approval"
                    ? "Submitted by Inspired Faculty. The Head approver reviews and forwards the application to R&D Staff."
                    : "Application is reviewed by PI, Mentor, or Head — determined by the applicant's role at submission time.";

    const phase1: DPStage[] = [
        {
            label: "Draft",
            description: "Applicant fills in item details, quantities, and estimated prices. If total estimate exceeds ₹2,00,000 a Purchase Committee with at least 3 members is required.",
            status: p1Status(0),
            nextAction: "Submit",
        },
        {
            label: firstLabel,
            sublabel: "PI / Mentor / Head",
            description: firstDesc,
            status: p1Status(1),
            nextAction: "Forward",
        },
        {
            label: "R&D Staff",
            description: "R&D Staff verifies the application, commits the budget head and payment amount, then forwards the application to the Head of Section.",
            status: p1Status(2),
            nextAction: "Forward",
        },
        {
            label: "HoS R&D",
            description: "The Head of Section (R&D) reviews the application and forwards it to the Dean for approval.",
            status: p1Status(3),
            nextAction: "Forward",
        },
        {
            label: "Dean",
            description: needsDirector
                ? "Dean reviews but must escalate to Director — account head is Consumable/Contingency and total estimate exceeds ₹3,00,000."
                : "Dean approves directly. Account head is non-consumable/contingency, or total estimate is within the ₹3,00,000 threshold.",
            status: p1Status(4),
            nextAction: showDirector ? "Forward" : "Approve",
        },
    ];

    if (showDirector) {
        phase1.push({
            label: "Director",
            sublabel: needsDirector ? "> ₹3 L" : undefined,
            description: "Director approval is required because the account head is Consumable or Contingency and the total estimate exceeds ₹3,00,000.",
            conditional: !needsDirector,
            status: p1Status(5),
            nextAction: "Approve",
        });
        phase1.push({
            label: "Approved",
            description: "The application is fully approved. A Kafka budget-commit notification is published. The applicant can now submit the P-11 form to proceed.",
            status: isRejected ? "rejected" : isApprovedOrBeyond ? "completed" : p1Status(6),
        });
    } else {
        phase1.push({
            label: "Approved",
            description: "The application is fully approved. A Kafka budget-commit notification is published. The applicant can now submit the P-11 form to proceed.",
            status: isRejected ? "rejected" : isApprovedOrBeyond ? "completed" : p1Status(5),
        });
    }

    const currentP2 = DP_PHASE2_ORDER.indexOf(workflowState);
    const isPODone = workflowState === "POGenerated";

    const phase2: DPStage[] = DP_PHASE2_ORDER.map((state, idx) => {
        const meta = DP_PHASE2_LABELS[state];
        let status: DPStageStatus = "pending";
        if (!isInPhase2) {
            status = "pending";
        } else if (isPODone) {
            status = "completed";
        } else if (idx < currentP2) {
            status = "completed";
        } else if (idx === currentP2) {
            status = "in-progress";
        }
        return { label: meta.label, description: meta.description, nextAction: meta.nextAction, status };
    });

    return { phase1, phase2 };
}

const DPWorkflowTimeline: React.FC<{
    workflowState: string;
    accountHead?: string;
    totalEstimate?: number;
}> = ({ workflowState, accountHead, totalEstimate }) => {
    const { phase1, phase2 } = buildDPWorkflow(workflowState, accountHead, totalEstimate);
    const [hoveredP1, setHoveredP1] = useState<DPStage | null>(null);
    const [hoveredP2, setHoveredP2] = useState<DPStage | null>(null);
    const isInPhase2 = DP_PHASE2_ORDER.includes(workflowState) || workflowState === "POGenerated";
    const [phase2Open, setPhase2Open] = useState(isInPhase2);
    const [open, setOpen] = useState(false);

    const nodeIcon = (status: DPStageStatus, conditional?: boolean) => {
        if (conditional && status === "pending")
            return <span className="text-[10px] font-bold text-zinc-400">?</span>;
        if (status === "completed") return <CheckCircle2Icon className="w-3.5 h-3.5 text-white" />;
        if (status === "in-progress") return <Clock className="w-3.5 h-3.5 text-white" />;
        if (status === "rejected") return <XCircleIcon className="w-3.5 h-3.5 text-white" />;
        return <span className="w-2 h-2 rounded-full bg-white/50" />;
    };

    const nodeBg = (status: DPStageStatus, conditional?: boolean) => {
        if (conditional && status === "pending")
            return "bg-transparent border-2 border-dashed border-zinc-300 dark:border-zinc-600";
        if (status === "completed") return "bg-emerald-500";
        if (status === "in-progress") return "bg-[#D97757]";
        if (status === "rejected") return "bg-red-500";
        return "bg-zinc-300 dark:bg-zinc-600";
    };

    const connectorCls = (fromStatus: DPStageStatus) =>
        fromStatus === "completed" ? "bg-emerald-400" : "bg-zinc-200 dark:bg-zinc-700";

    const renderStages = (
        stages: DPStage[],
        hovered: DPStage | null,
        setHovered: (s: DPStage | null) => void,
    ) => (
        <div>
            <div className="flex items-start overflow-x-auto pb-1">
                {stages.map((stage, idx) => (
                    <React.Fragment key={`${stage.label}-${idx}`}>
                        <div
                            className="flex flex-col items-center min-w-[72px] max-w-[96px] cursor-default"
                            onMouseEnter={() => setHovered(stage)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 transition-transform duration-150",
                                nodeBg(stage.status, stage.conditional),
                                hovered?.label === stage.label && "scale-110 ring-2 ring-offset-1 ring-zinc-300 dark:ring-zinc-600",
                            )}>
                                {nodeIcon(stage.status, stage.conditional)}
                            </div>
                            <p className={cn(
                                "mt-1.5 text-center text-[10px] leading-tight px-1 font-medium",
                                stage.status === "in-progress" && "font-bold text-[#D97757]",
                                stage.status === "completed" && "text-emerald-600 dark:text-emerald-400",
                                stage.status === "pending" && "text-zinc-400 dark:text-zinc-500",
                                stage.status === "rejected" && "text-red-500 font-bold",
                            )}>
                                {stage.label}
                            </p>
                            {stage.sublabel && (
                                <p className="text-[9px] text-zinc-400 dark:text-zinc-600 text-center px-1 leading-tight mt-0.5">
                                    {stage.sublabel}
                                </p>
                            )}
                            {stage.status === "in-progress" && (
                                <span className="mt-1 text-[9px] font-bold text-white bg-[#D97757] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                    Here
                                </span>
                            )}
                        </div>
                        {idx < stages.length - 1 && (
                            <div className="flex flex-col items-center min-w-[12px] flex-1">
                                <div className="flex items-center w-full pt-3.5">
                                    <div className={cn("h-0.5 w-full rounded", connectorCls(stage.status))} />
                                    <ChevronRight className="w-3 h-3 text-zinc-400 flex-shrink-0 -ml-1" />
                                </div>
                                {stage.nextAction && (
                                    <span className="text-[8px] text-zinc-400 dark:text-zinc-500 text-center leading-none mt-1 px-0.5 italic whitespace-nowrap">
                                        {stage.nextAction}
                                    </span>
                                )}
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
            {/* Hover description */}
            <div className={cn(
                "mt-2.5 rounded-lg px-3 py-2 text-[11px] leading-relaxed transition-all duration-200",
                hovered
                    ? "bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 opacity-100"
                    : "opacity-0 pointer-events-none h-0 mt-0 overflow-hidden border-0 p-0",
            )}>
                {hovered && (
                    <>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-100">{hovered.label}: </span>
                        <span className="text-zinc-600 dark:text-zinc-300">{hovered.description}</span>
                    </>
                )}
            </div>
        </div>
    );

    const summaryLabel =
        workflowState === "Rejected" ? "Rejected" :
            workflowState === "POGenerated" ? "Complete" :
                workflowState === "Approved" ? "Awaiting P-11" :
                    "In Progress";

    const p2CompletedCount = phase2.filter(s => s.status === "completed").length;
    const p2ActiveLabel = isInPhase2
        ? `${p2CompletedCount}/${phase2.length} steps done`
        : "Starts after approval";

    return (
        <div className="rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A] mb-5">
            {/* Collapsible header — click to toggle entire panel */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2.5 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors rounded-2xl"
            >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-[#2563EB] dark:bg-blue-950/30 dark:text-blue-300 shrink-0">
                    <ActivityIcon className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#A1A1AA]">
                    Workflow Progress
                </h3>
                <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46]" />
                <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                    workflowState === "Rejected" && "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
                    workflowState === "POGenerated" && "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400",
                    workflowState === "Approved" && "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
                    !["Rejected", "POGenerated", "Approved"].includes(workflowState) && "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400",
                )}>
                    {summaryLabel}
                </span>
                {!open && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 italic">
                        click to see details
                    </span>
                )}
                <ChevronRight
                    className={cn(
                        "w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 transition-transform duration-200",
                        open && "rotate-90",
                    )}
                />
            </button>

            {/* Expandable body */}
            {open && (
                <div className="px-5 pb-5">
                    <div className="h-px bg-[#E4E4E7] dark:bg-[#3F3F46] mb-4" />

                    {/* Phase 1: Approval Chain */}
                    <div className="mb-3">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB] dark:text-blue-400 mb-2.5 flex items-center gap-2">
                            <span className="inline-block w-4 h-px bg-[#2563EB]/50" />
                            Approval Chain
                            <span className="flex-1 h-px bg-[#2563EB]/20" />
                        </p>
                        {renderStages(phase1, hoveredP1, setHoveredP1)}
                    </div>

                    {/* Phase 2: Post-Approval Pipeline — collapsible */}
                    <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] pt-3">
                        <button
                            type="button"
                            onClick={() => setPhase2Open(o => !o)}
                            className="w-full flex items-center gap-2 mb-2.5"
                        >
                            <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400 flex items-center gap-2 flex-1">
                                <span className="inline-block w-4 h-px bg-emerald-600/50" />
                                Post-Approval Pipeline
                                <span className="flex-1 h-px bg-emerald-600/20" />
                            </span>
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 shrink-0 mr-1">{p2ActiveLabel}</span>
                            <ChevronRight
                                className={cn(
                                    "w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 transition-transform duration-200",
                                    phase2Open && "rotate-90",
                                )}
                            />
                        </button>

                        {phase2Open && renderStages(phase2, hoveredP2, setHoveredP2)}
                    </div>

                    {!["Draft", "Approved", "POGenerated", "Rejected"].includes(workflowState) && (
                        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                Pending at:{" "}
                                <span className="font-semibold text-[#D97757]">{workflowState}</span>
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- SHARED CONSTANTS ---
const EXCLUDED_FIELDS = [
    "doctype",
    "docstatus",
    "idx",
    "owner",
    "creation",
    "modified",
    "modified_by",
    "_user_tags",
    "_comments",
    "_assign",
    "_liked_by",
    "name",
    "workflow_state",
    "workflow_status",
    "_seen",
    "parent",
    "parenttype",
    "parentfield",
];

// --- HELPERS ---
const FIELD_LABEL_OVERRIDES: Record<string, string> = {
    app_id: "Application ID",
    p11_no: "P-11 Number",
    project_no: "Project Number",
    ss_file_number: "File Number",
    ss_applicant_name: "Applicant Name",
    ss_year_period_of_sanction: "Year / Period Of Sanction",
    ss_department_for_purchase: "Department For Purchase",
    ss_account_head: "Account Head",
    ss_funding_agency: "Funding Agency",
    ss_funds_allocated: "Funds Allocated",
    ss_balance_available: "Balance Available",
    ss_actual_expenditure: "Actual Expenditure",
    ss_name_of_firms: "Name Of Firms",
    ss_pack_forward: "Packing And Forwarding",
    ss_freight: "Freight",
    ss_other_charges: "Other Charges",
    ss_warranty: "Warranty",
    ss_delivery: "Delivery",
    ss_payment: "Payment",
    file_path: "File Path",
    check_the_below_declaration: "Declaration",
    the_purchase_committe_recommends_purchase_of_the_items_from_ms:
        "Purchase Committee Recommendation",
    quotation_recieved_for_purchase_of_the_items_from_ms:
        "Quotation Received From",
    packing_and_forwarding: "Packing And Forwarding",
};

const formatFieldName = (key: string) => {
    if (FIELD_LABEL_OVERRIDES[key]) return FIELD_LABEL_OVERRIDES[key];

    const cleaned = key
        .replace(/^ss_/, "")
        .replace(/^p11_/, "p_11_")
        .replace(/_/g, " ");

    return cleaned.replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatDate = (val: string, format: "long" | "short" = "long") =>
    new Date(val).toLocaleDateString(
        "en-IN",
        format === "long"
            ? {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }
            : { day: "numeric", month: "short", year: "numeric" },
    );

// --- REUSABLE UI PRIMITIVES ---

const ClaudeCard = ({
    title,
    children,
    className = "",
    accentTop = false,
}: {
    title?: string;
    children: React.ReactNode;
    className?: string;
    accentTop?: boolean;
}) => (
    <div
        className={cn(
            "rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden",
            accentTop && "border-t-[3px] border-t-[#D97757]",
            className,
        )}
    >
        {title && (
            <div className="px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                <h3 className="text-[13px] font-extrabold tracking-wide text-[#3F3F46] dark:text-[#E4E4E7] uppercase">
                    {title}
                </h3>
            </div>
        )}
        <div className="p-4 sm:p-5 min-w-0">{children}</div>
    </div>
);

const ClaudeButton = ({
    children,
    onClick,
    disabled,
    className,
    variant = "outline",
    title,
    id,
    "data-action": dataAction,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: "primary" | "outline" | "ghost" | "action";
    title?: string;
    id?: string;
    "data-action"?: string;
}) => (
    <button
        id={id}
        data-action={dataAction}
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200 dark:focus-visible:ring-zinc-700",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            variant === "primary" &&
            "bg-[#D97757] text-white hover:opacity-90 shadow-sm",
            variant === "action" &&
            "bg-[#D97757] text-white hover:opacity-90 shadow-sm border border-[#C66A4E]",
            variant === "outline" &&
            "border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-transparent text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-800",
            variant === "ghost" &&
            "text-[#71717A] dark:text-[#A1A1AA] hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]",
            className,
        )}
    >
        {children}
    </button>
);

const TAB_TONES: Record<
    TabId,
    {
        active: string;
        accentText: string;
        icon: string;
        header: string;
        border: string;
    }
> = {
    details: {
        active: "border-[#2563EB] bg-blue-50 text-[#1D4ED8] shadow-sm dark:border-blue-500/50 dark:bg-blue-950/25 dark:text-blue-300",
        accentText: "text-[#2563EB] dark:text-blue-300",
        icon: "bg-blue-50 text-[#2563EB] dark:bg-blue-950/30 dark:text-blue-300",
        header: "from-blue-50 via-white to-white dark:from-blue-950/20 dark:via-[#27272A] dark:to-[#27272A]",
        border: "border-t-[#2563EB]",
    },
    p11: {
        active: "border-[#4A6CF7] bg-indigo-50 text-[#4338CA] shadow-sm dark:border-indigo-500/50 dark:bg-indigo-950/25 dark:text-indigo-300",
        accentText: "text-[#4A6CF7] dark:text-indigo-300",
        icon: "bg-indigo-50 text-[#4A6CF7] dark:bg-indigo-950/30 dark:text-indigo-300",
        header: "from-indigo-50 via-white to-white dark:from-indigo-950/20 dark:via-[#27272A] dark:to-[#27272A]",
        border: "border-t-[#4A6CF7]",
    },
    sanction: {
        active: "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-950/25 dark:text-emerald-300",
        accentText: "text-emerald-700 dark:text-emerald-300",
        icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
        header: "from-emerald-50 via-white to-white dark:from-emerald-950/20 dark:via-[#27272A] dark:to-[#27272A]",
        border: "border-t-emerald-500",
    },
    po: {
        active: "border-[#D97757] bg-orange-50 text-[#B45309] shadow-sm dark:border-[#D97757]/60 dark:bg-orange-950/20 dark:text-orange-300",
        accentText: "text-[#D97757] dark:text-orange-300",
        icon: "bg-orange-50 text-[#D97757] dark:bg-orange-950/25 dark:text-orange-300",
        header: "from-orange-50 via-white to-white dark:from-orange-950/20 dark:via-[#27272A] dark:to-[#27272A]",
        border: "border-t-[#D97757]",
    },
    settlement: {
        active: "border-violet-500 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-500/50 dark:bg-violet-950/25 dark:text-violet-300",
        accentText: "text-violet-700 dark:text-violet-300",
        icon: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300",
        header: "from-violet-50 via-white to-white dark:from-violet-950/20 dark:via-[#27272A] dark:to-[#27272A]",
        border: "border-t-violet-500",
    },
};

const TabSectionHeader = ({
    icon,
    eyebrow,
    title,
    description,
    action,
    tone = "details",
}: {
    icon: React.ReactNode;
    eyebrow: string;
    title: string;
    description: string;
    action?: React.ReactNode;
    tone?: TabId;
}) => (
    <div
        className={cn(
            "mb-4 flex flex-col gap-3 rounded-xl border border-[#E4E4E7] bg-gradient-to-r px-4 py-3 dark:border-[#3F3F46] sm:flex-row sm:items-center sm:justify-between",
            TAB_TONES[tone].header,
        )}
    >
        <div className="flex min-w-0 items-start gap-3">
            <div
                className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    TAB_TONES[tone].icon,
                )}
            >
                <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
            </div>
            <div className="min-w-0">
                {eyebrow && (
                    <p
                        className={cn(
                            "text-[10px] font-extrabold uppercase tracking-[0.16em]",
                            TAB_TONES[tone].accentText,
                        )}
                    >
                        {eyebrow}
                    </p>
                )}
                <h3 className="mt-0.5 text-[17px] font-extrabold leading-tight text-[#3F3F46] dark:text-[#E4E4E7]">
                    {title}
                </h3>
                <p className="mt-1 max-w-2xl text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">
                    {description}
                </p>
            </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
    </div>
);

const HighlightHeading = ({
    icon,
    title,
    tone = "details",
}: {
    icon: React.ReactNode;
    title: string;
    tone?: TabId;
}) => (
    <div className="mb-3 flex items-center gap-2.5">
        <span
            className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                TAB_TONES[tone].icon,
            )}
        >
            <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
        </span>
        <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#A1A1AA]">
            {title}
        </span>
        <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46]" />
    </div>
);

// --- FIELD TYPE HELPERS ---
const MINIO_HOST = import.meta.env.VITE_MINIO_HOST || "172.16.135.118";
const MINIO_ALT_PORT = import.meta.env.VITE_MINIO_ALT_PORT || "8081";
const isFilePath = (val: any): boolean => {
    if (typeof val !== "string") return false;
    return (
        val.startsWith("/private/files/") ||
        val.startsWith("/files/") ||
        val.startsWith(`http://${MINIO_HOST}:${MINIO_ALT_PORT}/`) ||
        /\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx|zip)$/i.test(val)
    );
};

const isAmountField = (key: string): boolean =>
    /amount|total|price|estimate|budget|salary|fee|cost|funds|balance|expenditure|charges|freight|pack_forward|packing_and_forwarding/i.test(
        key,
    );

const isBoolCheck = (key: string, val: any): boolean =>
    (val === 0 || val === 1) &&
    (key.startsWith("dec_") ||
        key.startsWith("is_") ||
        key.startsWith("has_") ||
        key.startsWith("declaration_") ||
        key.includes("declaration"));

const formatINR = (val: any): string =>
    Number(val).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    });

const getFileName = (path: string): string => path.split("/").pop() || path;

// --- DOCUMENT VIEWER ---
// Renders any Frappe document with smart field-type detection, a financial KPI strip,
// sectioned layout (Info / Declarations / Attachments) and enhanced child tables.
const DOCUMENT_FIELD_EXCLUSIONS: Record<string, string[]> = {
    "P_11 Form": ["workflow_status"],
};

const DocumentViewer = ({
    data,
    doctype,
}: {
    data: Record<string, any>;
    doctype?: string;
}) => {
    const hiddenFields = new Set([
        ...EXCLUDED_FIELDS,
        ...(doctype ? DOCUMENT_FIELD_EXCLUSIONS[doctype] || [] : []),
    ]);

    const allScalar = Object.entries(data).filter(([key, value]) => {
        if (hiddenFields.has(key)) return false;
        if (key.startsWith("_")) return false;
        if (Array.isArray(value)) return false;
        if (value === null || value === undefined || value === "") return false;
        return true;
    });

    const childTables = Object.entries(data).filter(
        ([, value]) => Array.isArray(value) && (value as any[]).length > 0,
    );

    // Partition scalar fields into logical groups
    const fileFields = allScalar.filter(
        ([k, v]) => isFilePath(v) || k.startsWith("upload_"),
    );
    const amountFields = allScalar.filter(
        ([k, v]) => isAmountField(k) && !isFilePath(v) && !isBoolCheck(k, v),
    );
    const infoFields = allScalar.filter(([k, v]) => !isFilePath(v) && !k.startsWith("upload_"));

    const renderValue = (key: string, value: any): React.ReactNode => {
        if (value === null || value === undefined || value === "")
            return (
                <span className="text-[#71717A] dark:text-[#A1A1AA]">—</span>
            );

        if (isFilePath(value)) {
            return (
                <a
                    href={String(value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800 text-[#D97757] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm font-medium max-w-full"
                >
                    <FileIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">
                        {getFileName(String(value))}
                    </span>
                    <ExternalLinkIcon className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
            );
        }

        if (isBoolCheck(key, value)) {
            return value === 1 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2Icon className="w-3.5 h-3.5" />
                    Yes
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-[#71717A] dark:text-[#A1A1AA] border border-[#E4E4E7] dark:border-[#3F3F46]">
                    <XCircleIcon className="w-3.5 h-3.5" />
                    No
                </span>
            );
        }

        if (isAmountField(key) && !isNaN(Number(value))) {
            return (
                <span className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                    {formatINR(value)}
                </span>
            );
        }

        if (
            key === "applicant_department" ||
            key === "applying_for_department"
        ) {
            return <DepartmentName name={value} />;
        }
        if (key === "account_head") {
            return <BudgetHeadName id={value} />;
        }
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
    };

    if (allScalar.length === 0 && childTables.length === 0) {
        return (
            <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] italic">
                No data to display.
            </p>
        );
    }

    // KPI strip — show if any amount fields exist
    const kpiAmounts = amountFields.slice(0, 3);

    return (
        <div className="space-y-6 min-w-0">
            {/* Financial KPI strip */}
            {kpiAmounts.length > 0 && (
                <div
                    className={cn(
                        "grid gap-3",
                        kpiAmounts.length === 1 && "grid-cols-1 max-w-xs",
                        kpiAmounts.length === 2 && "grid-cols-1 sm:grid-cols-2",
                        kpiAmounts.length >= 3 && "grid-cols-1 sm:grid-cols-3",
                    )}
                >
                    {kpiAmounts.map(([key, value]) => (
                        <div
                            key={key}
                            className="stat-card stat-card-blue rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm dark:border-[#3F3F46] dark:bg-zinc-800/50 min-w-0"
                        >
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
                                {formatFieldName(key)}
                            </p>
                            <p className="text-[17px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight break-words">
                                {!isNaN(Number(value))
                                    ? formatINR(value)
                                    : String(value)}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Main info fields */}
            {infoFields.length > 0 && (
                <div>
                    <HighlightHeading
                        icon={<LayoutGridIcon />}
                        title="Information"
                        tone="details"
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {infoFields.map(([key, value]) => (
                            <div
                                key={key}
                                className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]"
                            >
                                <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]">
                                    <span className="truncate">
                                        {formatFieldName(key)}
                                    </span>
                                </div>
                                <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">
                                    {renderValue(key, value)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Declarations */}
            <DeclarationFields doctype="Direct Purchase" />

            {/* Attachments */}
            {fileFields.length > 0 && (
                <div>
                    <HighlightHeading
                        icon={<PaperclipIcon />}
                        title="Attachments"
                        tone="po"
                    />
                    <div className="flex flex-col gap-2">
                        {fileFields.map(([key, value]) => (
                            <div key={key} className="flex items-center gap-3">
                                <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] w-36 shrink-0 font-medium uppercase tracking-wider">
                                    {formatFieldName(key)}
                                </span>
                                {renderValue(key, value)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Child tables */}
            {childTables.map(([key, rows]) => {
                const cols = Object.keys((rows as any[])[0] || {}).filter(
                    (k) => !k.startsWith("_") && !EXCLUDED_FIELDS.includes(k),
                );
                const hasAmountCols = cols.some((c) => isAmountField(c));
                const colTotals: Record<string, number> = {};
                if (hasAmountCols) {
                    cols.forEach((c) => {
                        if (isAmountField(c)) {
                            colTotals[c] = (rows as any[]).reduce(
                                (s, r) => s + (parseFloat(r[c]) || 0),
                                0,
                            );
                        }
                    });
                }

                return (
                    <div key={key}>
                        <HighlightHeading
                            icon={<FileTextIcon />}
                            title={formatFieldName(key)}
                            tone="sanction"
                        />
                        <div className="overflow-hidden rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                            <table className="w-full table-fixed text-[11px]">
                                <thead>
                                    <tr className="border-b border-[#E4E4E7] bg-[#EEF2FF] dark:border-[#3F3F46] dark:bg-[#1E3A8A]/20">
                                        <th className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] w-9">
                                            #
                                        </th>
                                        {cols.map((col) => (
                                            <th
                                                key={col}
                                                className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] break-words"
                                            >
                                                {formatFieldName(col)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(rows as any[]).map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className={cn(
                                                "border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors",
                                                idx % 2 === 1 &&
                                                "bg-[#FAFAF9]/60 dark:bg-zinc-800/20",
                                            )}
                                        >
                                            <td className="px-2.5 py-2 align-top text-[10px] text-[#71717A] dark:text-[#A1A1AA] font-mono">
                                                {idx + 1}
                                            </td>
                                            {cols.map((k) => (
                                                <td
                                                    key={k}
                                                    className="px-2.5 py-2 align-top text-[#3F3F46] dark:text-[#E4E4E7] break-words whitespace-normal"
                                                >
                                                    {isAmountField(k) &&
                                                        !isNaN(Number(row[k])) ? (
                                                        <span className="font-medium">
                                                            {formatINR(row[k])}
                                                        </span>
                                                    ) : row[k] !== null &&
                                                        row[k] !== undefined ? (
                                                        String(row[k])
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {hasAmountCols && (
                                        <tr className="border-t-2 border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800/60 font-semibold">
                                            <td className="px-2.5 py-2 text-[10px] text-[#71717A] dark:text-[#A1A1AA]" />
                                            {cols.map((c) => (
                                                <td
                                                    key={c}
                                                    className="px-2.5 py-2 text-[#3F3F46] dark:text-[#E4E4E7] break-words"
                                                >
                                                    {colTotals[c] != null ? (
                                                        <span className="font-semibold text-[#D97757]">
                                                            {formatINR(
                                                                colTotals[c],
                                                            )}
                                                        </span>
                                                    ) : (
                                                        ""
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- WORKFLOW ACTION BUTTONS ---
const DirectPurchaseActionButtons = ({
    docname,
    onActionComplete,
    p11DocName,
    onP11Missing,
    commitRequired = false,
    sanctionRequired = false,
    onSanctionMissing,
    highlight = false,
    onActionsLoaded,
    autoTrigger,
    onAutoTriggerConsumed,
}: {
    docname: string;
    onActionComplete: () => void;
    p11DocName?: string;
    onP11Missing?: () => void;
    commitRequired?: boolean;
    sanctionRequired?: boolean;
    onSanctionMissing?: () => void;
    highlight?: boolean;
    onActionsLoaded?: (actions: string[]) => void;
    // When set and `autoTrigger.action` is currently available, runs that action
    // immediately with the given comment — no modal, no manual "Confirm" click.
    // Used to chain "Mark Print Taken" onto the Sanction Sheet's Print/PDF button.
    autoTrigger?: { action: string; comment?: string } | null;
    onAutoTriggerConsumed?: () => void;
}) => {
    const [actions, setActions] = useState<string[]>([]);
    const [isPerforming, setIsPerforming] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");
    const [comment, setComment] = useState("");
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Action Failed", message: "" });
    const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(
        directPurchaseAPI.getWorkflowActions,
    );
    const { call: performAction } = useFrappePostCall(
        directPurchaseAPI.performAction,
    );
    const { call: addComment } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );

    useEffect(() => {
        fetchActions({ docname })
            .then((res) => {
                const loaded = Array.isArray(res?.message) ? res.message : [];
                setActions(loaded);
                onActionsLoaded?.(loaded);
            })
            .catch(() => {});
    }, [docname]);

    const refreshActions = () => {
        fetchActions({ docname })
            .then((res) => {
                setActions(Array.isArray(res?.message) ? res.message : []);
            })
            .catch(() => setActions([]));
    };

    const runAction = async (action: string, actionComment: string) => {
        setShowCommentModal(false);
        setIsPerforming(true);
        try {
            const result: any = await performAction({ docname, action, comment: actionComment });
            const success = result?.message?.status === "success" || (result?.message && result.message.status !== "error");
            if (result?.message?.status === "error") {
                setErrorModal({ open: true, title: "Action Failed", message: parseFrappeError(result?.message) });
            } else {
                if (actionComment.trim()) {
                    try {
                        await addComment({ doctype: "Direct Purchase", docname, content: actionComment.trim() });
                    } catch (e) {
                    }
                }
                alert(result?.message?.message || `Action "${action}" completed.`);
                if (success) { refreshActions(); onActionComplete(); }
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "Action Failed", message: parseFrappeError(err) });
        } finally {
            setIsPerforming(false);
            setComment("");
        }
    };

    // Fire the auto-trigger the moment its action shows up as available — skips the
    // comment modal entirely and submits with the given (or empty) comment.
    const autoTriggerHandled = useRef(false);
    useEffect(() => {
        if (!autoTrigger || autoTriggerHandled.current) return;
        if (!actions.includes(autoTrigger.action)) return;
        autoTriggerHandled.current = true;
        runAction(autoTrigger.action, autoTrigger.comment ?? "");
        onAutoTriggerConsumed?.();
    }, [autoTrigger, actions]);

    const handleActionClick = (action: string) => {
        if (action === "Submit P-11" && !p11DocName) {
            alert(
                "The P-11 Form has not been created yet.\n\nPlease go to the \"P-11 Form\" tab, fill in the P-11 Form, and then return here to submit.",
            );
            onP11Missing?.();
            return;
        }
        if (sanctionRequired) {
            onSanctionMissing?.();
            return;
        }
        setSelectedAction(action);
        setShowCommentModal(true);
    };

    const handleActionConfirm = (actionComment: string) =>
        runAction(selectedAction, actionComment);

    if (!actions.length) return null;

    return (
        <>
            <div className="flex flex-col gap-2">
                {sanctionRequired && (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 font-medium">
                        Create the Sanction Sheet first — go to the <strong>Sanction Sheet</strong> tab.
                    </div>
                )}
                {commitRequired && !sanctionRequired && (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 font-medium">
                        A commitment must be submitted before forwarding this application.
                    </div>
                )}
                <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                        <ClaudeButton
                            key={action}
                            data-action={action}
                            variant="action"
                            onClick={() => handleActionClick(action)}
                            disabled={isPerforming || commitRequired || sanctionRequired}
                            className={cn(
                                action === "Submit P-11" && !p11DocName
                                    ? "opacity-60 cursor-not-allowed"
                                    : undefined,
                                (commitRequired || sanctionRequired) && "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border-0",
                                highlight && !commitRequired && !sanctionRequired && "animate-pulse ring-2 ring-offset-2 ring-amber-400"
                            )}
                            title={
                                sanctionRequired
                                    ? "Create the Sanction Sheet first"
                                    : commitRequired
                                        ? "Submit a commitment first"
                                        : undefined
                            }
                        >
                            {isPerforming ? "Processing…" : action}
                        </ClaudeButton>
                    ))}
                </div>
            </div>

            {showCommentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-xl shadow-lg w-full max-w-md">
                        <h3 className="text-lg font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mb-2">
                            Confirm: {selectedAction}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                            Optionally add a comment before performing this action.
                        </p>
                        <Textarea
                            rows={4}
                            placeholder="Add a comment (optional)..."
                            maxLength={65535}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            autoFocus
                            className="w-full text-sm resize-none border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg mb-4"
                        />
                        <CharLimitAlert value={comment} maxLength={65535} className="-mt-3 mb-3" />
                        <div className="flex justify-end gap-2">
                            <ClaudeButton variant="outline" onClick={() => { setShowCommentModal(false); setComment(""); }}>
                                Cancel
                            </ClaudeButton>
                            <ClaudeButton variant="action" disabled={isPerforming} onClick={() => handleActionConfirm(comment)}>
                                {isPerforming ? "Processing…" : "Confirm"}
                            </ClaudeButton>
                        </div>
                    </div>
                </div>
            )}
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </>
    );
};

// --- P11 FORM WORKFLOW ACTION BUTTONS ---
const P11FormActionButtons = ({
    docname,
    onActionComplete,
}: {
    docname: string;
    onActionComplete: () => void;
}) => {
    const [actions, setActions] = useState<string[]>([]);
    const [isPerforming, setIsPerforming] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");
    const [comment, setComment] = useState("");
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Action Failed", message: "" });

    const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(
        p11FormAPI.getWorkflowActions,
    );
    const { call: performAction } = useFrappePostCall(p11FormAPI.performAction);
    const { call: addComment } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );

    useEffect(() => {
        if (docname) {
            fetchActions({ docname })
                .then((res) => {
                    if (res?.message) {
                        setActions(
                            Array.isArray(res.message) ? res.message : [],
                        );
                    }
                })
                .catch(() => {});
        }
    }, [docname]);

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setShowCommentModal(true);
    };

    const refreshP11Actions = () => {
        if (!docname) return;
        fetchActions({ docname })
            .then((res) => {
                setActions(Array.isArray(res?.message) ? res.message : []);
            })
            .catch(() => setActions([]));
    };

    const handleActionConfirm = async (
        action: string,
        actionComment: string,
    ) => {
        setIsPerforming(true);
        setShowCommentModal(false);

        try {
            const result: any = await performAction({
                docname,
                action,
                comment: actionComment,
            });

            if (result?.message?.status === "error") {
                setErrorModal({ open: true, title: "Action Failed", message: parseFrappeError(result?.message) });
            } else {
                if (actionComment.trim()) {
                    try {
                        await addComment({ doctype: "P_11 Form", docname, content: actionComment.trim() });
                    } catch (e) {
                    }
                }
                alert(result?.message?.message || `Action "${action}" completed successfully.`);
                refreshP11Actions();
                onActionComplete();
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "Action Failed", message: parseFrappeError(err) });
        } finally {
            setIsPerforming(false);
            setComment("");
        }
    };

    const getActionButtonClass = (action: string): string => {
        const actionLower = action.toLowerCase();
        if (actionLower.includes("reject")) {
            return "bg-red-600 hover:bg-red-700 text-white border-red-700";
        }
        if (actionLower.includes("approve") || actionLower.includes("verify")) {
            return "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700";
        }
        if (actionLower.includes("generate")) {
            return "bg-blue-600 hover:bg-blue-700 text-white border-blue-700";
        }
        return "";
    };

    if (!actions.length) return null;

    return (
        <>
            <div className="mt-6 pt-6 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-3">
                    Workflow Actions
                </p>
                <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                        <ClaudeButton
                            key={action}
                            variant="action"
                            className={getActionButtonClass(action)}
                            onClick={() => handleActionClick(action)}
                            disabled={isPerforming}
                        >
                            {isPerforming ? "Processing…" : action}
                        </ClaudeButton>
                    ))}
                </div>
            </div>

            {/* Comment Modal */}
            {showCommentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-xl shadow-lg w-full max-w-md">
                        <h3 className="text-lg font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mb-4">
                            Confirm: {selectedAction}
                        </h3>
                        <Textarea
                            rows={4}
                            placeholder="Add a comment (optional)..."
                            maxLength={65535}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full text-sm resize-none border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg mb-4"
                        />
                        <CharLimitAlert value={comment} maxLength={65535} className="-mt-3 mb-3" />
                        <div className="flex justify-end gap-2">
                            <ClaudeButton
                                variant="outline"
                                onClick={() => {
                                    setShowCommentModal(false);
                                    setComment("");
                                }}
                            >
                                Cancel
                            </ClaudeButton>
                            <ClaudeButton
                                variant="action"
                                onClick={() =>
                                    handleActionConfirm(selectedAction, comment)
                                }
                            >
                                Confirm
                            </ClaudeButton>
                        </div>
                    </div>
                </div>
            )}
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </>
    );
};

// --- SANCTION SHEET WORKFLOW ACTION BUTTONS ---
const SanctionSheetActionButtons = ({
    docname,
    onActionComplete,
    hiddenActions = [],
    onActionsChange,
}: {
    docname: string;
    onActionComplete: () => void;
    hiddenActions?: string[];
    // Reports the fetched action list up so callers (e.g. the Print/PDF button, which
    // needs to know whether "Mark Print Taken" is really in the DOM before clicking it)
    // read the exact same state instead of running their own separate, possibly-racing fetch.
    onActionsChange?: (actions: string[]) => void;
}) => {
    const [actions, setActions] = useState<string[]>([]);
    const [isPerforming, setIsPerforming] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");
    const [comment, setComment] = useState("");
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Action Failed", message: "" });

    const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(
        sanctionSheetAPI.getWorkflowActions,
    );
    const { call: performAction } = useFrappePostCall(
        sanctionSheetAPI.performAction,
    );
    const { call: addComment } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );

    useEffect(() => {
        if (docname) {
            fetchActions({ docname })
                .then((res) => {
                    if (res?.message) {
                        const list = Array.isArray(res.message) ? res.message : [];
                        setActions(list);
                        onActionsChange?.(list);
                    }
                })
                .catch(() => {});
        }
    }, [docname]);

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setShowCommentModal(true);
    };

    const refreshSanctionActions = () => {
        if (!docname) return;
        fetchActions({ docname })
            .then((res) => {
                setActions(Array.isArray(res?.message) ? res.message : []);
            })
            .catch(() => setActions([]));
    };

    const handleActionConfirm = async (
        action: string,
        actionComment: string,
    ) => {
        setIsPerforming(true);
        setShowCommentModal(false);

        try {
            const result: any = await performAction({
                docname,
                action,
                comment: actionComment,
            });

            if (result?.message?.status === "error") {
                setErrorModal({ open: true, title: "Action Failed", message: parseFrappeError(result?.message) });
            } else {
                if (actionComment.trim()) {
                    try {
                        await addComment({ doctype: "sanction_sheet", docname, content: actionComment.trim() });
                    } catch (e) {
                    }
                }
                alert(result?.message?.message || `Action "${action}" completed successfully.`);
                refreshSanctionActions();
                onActionComplete();
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "Action Failed", message: parseFrappeError(err) });
        } finally {
            setIsPerforming(false);
            setComment("");
        }
    };

    const getActionButtonClass = (action: string): string => {
        const actionLower = action.toLowerCase();
        if (actionLower.includes("reject")) {
            return "bg-red-600 hover:bg-red-700 text-white border-red-700";
        }
        if (actionLower.includes("verify") || actionLower.includes("print")) {
            return "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700";
        }
        if (actionLower.includes("generate")) {
            return "bg-blue-600 hover:bg-blue-700 text-white border-blue-700";
        }
        return "";
    };

    const visibleActions = actions.filter(a => !hiddenActions.includes(a));
    if (!visibleActions.length) return null;

    return (
        <>
            <div className="mt-6 pt-6 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-3">
                    Workflow Actions
                </p>
                <div className="flex flex-wrap gap-2">
                    {visibleActions.map((action) => (
                        <ClaudeButton
                            key={action}
                            data-action={action}
                            variant="action"
                            className={getActionButtonClass(action)}
                            onClick={() => handleActionClick(action)}
                            disabled={isPerforming}
                        >
                            {isPerforming ? "Processing…" : action}
                        </ClaudeButton>
                    ))}
                </div>
            </div>

            {/* Comment Modal */}
            {showCommentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-xl shadow-lg w-full max-w-md">
                        <h3 className="text-lg font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mb-4">
                            Confirm: {selectedAction}
                        </h3>
                        <Textarea
                            rows={4}
                            placeholder="Add a comment (optional)..."
                            maxLength={65535}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full text-sm resize-none border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg mb-4"
                        />
                        <CharLimitAlert value={comment} maxLength={65535} className="-mt-3 mb-3" />
                        <div className="flex justify-end gap-2">
                            <ClaudeButton
                                variant="outline"
                                onClick={() => {
                                    setShowCommentModal(false);
                                    setComment("");
                                }}
                            >
                                Cancel
                            </ClaudeButton>
                            <ClaudeButton
                                variant="action"
                                onClick={() =>
                                    handleActionConfirm(selectedAction, comment)
                                }
                            >
                                Confirm
                            </ClaudeButton>
                        </div>
                    </div>
                </div>
            )}
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </>
    );
};

// --- LINKED DOCUMENT TAB ---
// Fetches a single linked Frappe document via get_list + get_doc, then renders it.
const LinkedDocTab = ({
    doctype,
    filterField,
    filterValue,
    emptyTitle,
    emptyDescription,
    onDataReload,
    parentData,
    onRequestMarkPrintTaken,
}: {
    doctype: string;
    filterField: string;
    filterValue: string;
    emptyTitle: string;
    emptyDescription: string;
    onDataReload?: () => void;
    parentData?: Record<string, any>;
    // For sanction_sheet only — called when Print/PDF is clicked, to auto-run the
    // Direct Purchase document's "Mark Print Taken" action (in the page header).
    onRequestMarkPrintTaken?: () => void;
}) => {
    const {
        data: listData,
        isLoading: listLoading,
        mutate: reloadList,
    } = useFrappeGetCall<{ message: { name: string }[] }>(
        "frappe.client.get_list",
        {
            doctype,
            filters: JSON.stringify([[filterField, "=", filterValue]]),
            fields: JSON.stringify(["name"]),
            limit: 1,
        },
    );

    const docName = listData?.message?.[0]?.name || "";

    const {
        data: docData,
        isLoading: docLoading,
        mutate: reloadDoc,
    } = useFrappeGetDoc<Record<string, any>>(doctype, docName);

    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // Reload handler
    const handleReload = () => {
        reloadList();
        reloadDoc();
        if (onDataReload) onDataReload();
    };

    // Clicking "Print / PDF" opens the print preview, then — after a short delay so it
    // doesn't fight with the print modal's own opening transition — asks the parent to
    // auto-run "Mark Print Taken". That action belongs to the Direct Purchase document's
    // own workflow (rendered in the page header, next to "View Project"), not the
    // sanction_sheet doctype, so this component can't perform it directly.
    const handleMergedPrint = () => {
        setIsPrintModalOpen(true);
        if (doctype !== "sanction_sheet" || !onRequestMarkPrintTaken) return;
        setTimeout(() => {
            onRequestMarkPrintTaken();
        }, 500);
    };

    const handleSanctionPrintModalClose = () => {
        setIsPrintModalOpen(false);
    };

    if (listLoading || docLoading) {
        return (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] py-12 dark:border-[#3F3F46] dark:bg-[#18181B]">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#D97757] border-t-transparent" />
            </div>
        );
    }

    if (!docName || !docData) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] px-5 py-12 text-center gap-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#A1A1AA] shadow-sm dark:bg-[#27272A] dark:text-[#71717A]">
                    <FileTextIcon className="h-5 w-5" />
                </div>
                <p className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                    {emptyTitle}
                </p>
                <p className="max-w-md text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">
                    {emptyDescription}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 dark:border-[#3F3F46] dark:bg-[#27272A] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-[#E4E4E7] bg-[#FAFAF9] px-2 py-1 font-mono text-[11px] font-bold text-[#71717A] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#A1A1AA]">
                        {docName}
                    </span>
                </div>
                {doctype === "P_11 Form" && (
                    <button
                        onClick={() => setIsPrintModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-bold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <Printer className="h-3.5 w-3.5" /> Print / PDF
                    </button>
                )}
                {doctype === "sanction_sheet" && (
                    <button
                        onClick={handleMergedPrint}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-bold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <Printer className="h-3.5 w-3.5" /> Print / PDF
                    </button>
                )}
            </div>

            <DocumentViewer data={docData} doctype={doctype} />

            {/* Render workflow actions based on doctype */}
            {doctype === "P_11 Form" && (
                <>
                    <P11FormActionButtons
                        docname={docName}
                        onActionComplete={handleReload}
                    />
                    <P11PrintModal
                        title="P_11 Form Preview"
                        isOpen={isPrintModalOpen}
                        onClose={() => setIsPrintModalOpen(false)}
                        htmlContent={
                            isPrintModalOpen ? generateP11Html({
                                // Merge parent Direct Purchase fields so table_teqd (PC members) is available
                                ...parentData,
                                ...docData,
                            }) : ""
                        }
                        docName={docName}
                    />
                </>
            )}

            {doctype === "sanction_sheet" && (
                <>
                    <SanctionSheetActionButtons
                        docname={docName}
                        onActionComplete={handleReload}
                    />
                    <P11PrintModal
                        title="Indent Cum Sanction Sheet Preview"
                        isOpen={isPrintModalOpen}
                        onClose={handleSanctionPrintModalClose}
                        htmlContent={
                            isPrintModalOpen
                                ? generateSanctionSheetHtml(docData)
                                : ""
                        }
                        docName={docName}
                    />
                </>
            )}
        </div>
    );
};

// --- FINAL SETTLEMENT TAB ---
const FS_FIELDS_API =
    "rndopsapp.rndopsapp.doctype.po_commit_adjustment.po_commit_adjustment.get_po_commit_adjustment_fields";
const FS_SAVE_API =
    "rndopsapp.rndopsapp.doctype.po_commit_adjustment.po_commit_adjustment.save_po_commit_adjustment_data";

interface FSChildRow {
    name?: string;
    account_head: string;
    amount: number | string;
    particulars: string;
}

interface FSFormData {
    name?: string;
    purchase_order_number: string;
    po_total_value: number | string;
    total_committed_till_now: number | string;
    account_head: string;
    other_expenses: string;
    particulars: string;
    ref_details: string | number;
    settlement_accounts: FSChildRow[];
    upload_attachments: { file_name: string; file_data: string } | string | null;
}

const INIT_FS: FSFormData = {
    purchase_order_number: "",
    po_total_value: "",
    total_committed_till_now: "",
    account_head: "",
    other_expenses: "",
    particulars: "",
    ref_details: "",
    settlement_accounts: [],
    upload_attachments: null,
};

type FSLoadState = "loading" | "ready" | "saving" | "load_error";

const FinalSettlementTab = ({ dpId }: { dpId: string }) => {
    const [loadState, setLoadState] = useState<FSLoadState>("loading");
    const [linkOptions, setLinkOptions] = useState<Record<string, Array<Record<string, any>>>>({});
    const [formData, setFormData] = useState<FSFormData>(INIT_FS);
    const [kafkaPayload, setKafkaPayload] = useState<Record<string, any> | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const rowIdx = useRef(0);

    const csrfToken = () => (window as any).csrf_token || "";

    // Currency fields from Frappe may come back as {source, parsedValue} objects
    const toNum = (v: any): number | string => {
        if (v === null || v === undefined || v === "") return "";
        if (typeof v === "object" && "parsedValue" in v) return v.parsedValue ?? "";
        return v;
    };

    const postApi = async (method: string, bodyParams: Record<string, string>) => {
        const body = new URLSearchParams(bodyParams);
        const res = await fetch(`/api/method/${method}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Frappe-CSRF-Token": csrfToken(),
            },
            body,
        });
        const json = await res.json().catch(() => ({}));
        return { res, json };
    };

    const loadFormFields = async (docName?: string) => {
        const params: Record<string, string> = {
            ref_doctype: "Direct Purchase",
            ref_name: dpId,
        };
        if (docName) params.doc_name = docName;
        const { res, json } = await postApi(FS_FIELDS_API, params);
        if (!res.ok) throw new Error("Failed to load form fields");
        return json?.message as {
            fields: any[];
            link_options: Record<string, Array<Record<string, any>>>;
            doc_data: Record<string, any>;
            kafka_payload: Record<string, any>;
        };
    };

    const applyDocData = (doc: Record<string, any>, kafka?: Record<string, any>, resolvedAH?: string) => {
        setFormData({
            name: doc.name,
            purchase_order_number: doc.purchase_order_number || "",
            po_total_value: toNum(doc.po_total_value),
            total_committed_till_now: toNum(doc.total_committed_till_now),
            account_head: doc.account_head || resolvedAH || "",
            other_expenses: doc.other_expenses || "",
            particulars: doc.particulars || kafka?.commit_particular || "",
            ref_details: doc.ref_details ?? "",
            settlement_accounts: (doc.settlement_accounts ?? []).map((r: any) => ({
                name: r.name,
                account_head: r.account_head || "",
                amount: toNum(r.amount),
                particulars: r.particulars || "",
            })),
            upload_attachments: doc.upload_attachments ?? null,
        });
    };

    useEffect(() => {
        if (!dpId) return;
        let cancelled = false;

        const init = async () => {
            setLoadState("loading");
            setSaveSuccess(false);
            try {
                // Find existing PO Commit Adjustment linked to this DP
                const fsFilters = JSON.stringify([["frap_app_id", "=", dpId]]);
                const fsRes = await fetch(
                    `/api/method/frappe.client.get_list?doctype=PO Commit Adjustment&filters=${encodeURIComponent(fsFilters)}&fields=${encodeURIComponent('["name"]')}&limit=1`,
                    { credentials: "include", headers: { Accept: "application/json" } },
                ).then((r) => r.json()).catch(() => ({ message: [] }));
                const existingDoc: string = fsRes?.message?.[0]?.name || "";

                const data = await loadFormFields(existingDoc || undefined);
                if (cancelled) return;

                setLinkOptions(data.link_options || {});
                const kafka = data.kafka_payload || null;
                setKafkaPayload(kafka);

                // Resolve account_head ID from kafka label (used in both branches)
                const ahOpts = data.link_options?.account_head || [];
                const matchedAH = ahOpts.find(
                    (o: any) => o.label === kafka?.budget_head || o.value === kafka?.budget_head
                );
                const resolvedAH: string = matchedAH?.value || "";

                if (data.doc_data && Object.keys(data.doc_data).length > 0) {
                    applyDocData(data.doc_data, kafka ?? undefined, resolvedAH);
                } else {
                    // Auto-select the PO matching this direct purchase + pre-fill from kafka
                    const poOpts = data.link_options?.purchase_order_number || [];
                    const matched = poOpts.find((o) => o.app_id === dpId);
                    setFormData({
                        ...INIT_FS,
                        purchase_order_number: matched?.value || "",
                        po_total_value: toNum(matched?.ss_grand_total) ?? "",
                        account_head: resolvedAH,
                        particulars: kafka?.commit_particular || "",
                        ref_details: data.doc_data?.ref_details ?? "",
                    });
                }
                setLoadState("ready");
            } catch {
                if (!cancelled) setLoadState("load_error");
            }
        };
        init();
        return () => { cancelled = true; };
    }, [dpId]);

    // Fill po_total_value from link_options when the PO number is auto-selected but total is still empty
    useEffect(() => {
        if (!formData.purchase_order_number) return;
        if (toNum(formData.po_total_value) !== "") return;
        const po = (linkOptions.purchase_order_number || []).find(
            (o) => String(o.value) === String(formData.purchase_order_number),
        );
        const total = toNum(po?.ss_grand_total);
        if (total !== "") {
            setFormData((prev) => ({ ...prev, po_total_value: total }));
        }
    }, [formData.purchase_order_number, linkOptions.purchase_order_number]);

    const setField = <K extends keyof FSFormData>(fieldname: K, value: FSFormData[K]) => {
        setFormData((prev) => {
            const next = { ...prev, [fieldname]: value };
            if (fieldname === "purchase_order_number") {
                const po = (linkOptions.purchase_order_number || []).find(
                    (o) => String(o.value) === String(value),
                );
                next.po_total_value = toNum(po?.ss_grand_total) ?? "";
            }
            return next;
        });
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const b64 = (reader.result as string).split(",")[1];
            setFormData((prev) => ({
                ...prev,
                upload_attachments: { file_name: file.name, file_data: b64 },
            }));
        };
        reader.readAsDataURL(file);
    };

    const addRow = () => {
        rowIdx.current += 1;
        setFormData((prev) => ({
            ...prev,
            settlement_accounts: [
                ...prev.settlement_accounts,
                {
                    name: `new-row-${rowIdx.current}`,
                    account_head: "",
                    amount: "",
                    particulars: "",
                },
            ],
        }));
    };

    const updateRow = (i: number, field: keyof FSChildRow, value: string | number) => {
        setFormData((prev) => {
            const rows = [...prev.settlement_accounts];
            rows[i] = { ...rows[i], [field]: value };
            return { ...prev, settlement_accounts: rows };
        });
    };

    const removeRow = (i: number) => {
        setFormData((prev) => ({
            ...prev,
            settlement_accounts: prev.settlement_accounts.filter((_, idx) => idx !== i),
        }));
    };

    const validate = (): string[] => {
        const errs: string[] = [];
        if (!formData.purchase_order_number) errs.push("Purchase Order Number is required.");
        if (!formData.account_head) errs.push("Account Head is required.");
        if (formData.other_expenses === "Yes") {
            for (const [i, row] of formData.settlement_accounts.entries()) {
                if (!row.account_head) errs.push(`Row ${i + 1}: Account Head is required.`);
                const rowAmt = parseFloat(String(row.amount));
                if (!row.amount || isNaN(rowAmt) || rowAmt <= 0)
                    errs.push(`Row ${i + 1}: Amount must be greater than 0.`);
            }
        }
        return errs;
    };

    const handleSave = async () => {
        const errs = validate();
        if (errs.length) {
            setErrors(errs);
            setSaveSuccess(false);
            return;
        }
        setErrors([]);
        setLoadState("saving");
        setSaveSuccess(false);

        try {
            const payload: Record<string, any> = {
                ref_doctype: "Direct Purchase",
                ref_name: dpId,
                purchase_order_number: formData.purchase_order_number,
                account_head: formData.account_head,
                other_expenses: formData.other_expenses || "",
                particulars: formData.particulars || "",
                ref_details: formData.ref_details ?? "",
                settlement_accounts: formData.other_expenses === "Yes"
                    ? formData.settlement_accounts.map((r) => ({
                        name: r.name,
                        account_head: r.account_head,
                        amount: Number(r.amount),
                        particulars: r.particulars || "",
                    }))
                    : [],
                upload_attachments: formData.other_expenses === "Yes"
                    ? (typeof formData.upload_attachments === "string"
                        ? formData.upload_attachments
                        : formData.upload_attachments || null)
                    : null,
            };
            if (formData.name) payload.name = formData.name;

            const { res, json } = await postApi(FS_SAVE_API, {
                data: JSON.stringify(payload),
            });

            if (!res.ok) {
                const raw = json?._server_messages;
                let msgs: string[] = [];
                if (raw) {
                    try {
                        msgs = JSON.parse(raw).map((m: any) => JSON.parse(m).message);
                    } catch {
                        msgs = ["Server error. Please try again."];
                    }
                } else {
                    msgs = [json?.exc_type || "Save failed."];
                }
                setErrors(msgs);
                setLoadState("ready");
                return;
            }

            const { status, docname } = json?.message || {};
            if (status === "success" && docname) {
                setSaveSuccess(true);
                try {
                    const refreshed = await loadFormFields(docname);
                    setLinkOptions(refreshed.link_options || linkOptions);
                    const kafka = refreshed.kafka_payload || kafkaPayload;
                    setKafkaPayload(kafka);
                    const ahOptsR = (refreshed.link_options || linkOptions)?.account_head || [];
                    const matchedAHR = ahOptsR.find(
                        (o: any) => o.label === kafka?.budget_head || o.value === kafka?.budget_head
                    );
                    if (refreshed.doc_data && Object.keys(refreshed.doc_data).length > 0) {
                        applyDocData(refreshed.doc_data, kafka ?? undefined, matchedAHR?.value || "");
                    } else {
                        setFormData((prev) => ({ ...prev, name: docname }));
                    }
                } catch {
                    setFormData((prev) => ({ ...prev, name: docname }));
                }
                setLoadState("ready");
            } else {
                setErrors(["Save failed. Please try again."]);
                setLoadState("ready");
            }
        } catch (err: any) {
            setErrors([err.message || "An unexpected error occurred."]);
            setLoadState("ready");
        }
    };

    const inputCls =
        "w-full rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] px-3 py-2 text-[13px] font-medium text-[#3F3F46] dark:text-[#E4E4E7] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
    const labelCls =
        "block text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1";

    const selectOpts = (opts: Array<Record<string, any>>) =>
        opts.map((o) => (
            <option key={o.value} value={o.value}>
                {o.label}
            </option>
        ));

    const isSaving = loadState === "saving";
    const childAccountOpts =
        linkOptions.settlement_accounts_account_head || linkOptions.account_head || [];

    const amtStr = (v: number | string) =>
        v !== "" && !isNaN(Number(v))
            ? Number(v).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
            : "—";

    if (loadState === "loading") {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
            </div>
        );
    }

    if (loadState === "load_error") {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <AlertCircleIcon className="h-9 w-9 text-red-400" />
                <p className="text-[14px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                    Failed to load PO Commit Adjustment
                </p>
                <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                    Check your connection and reload the page.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Doc badge */}
            {formData.name && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-md border border-violet-200 dark:border-violet-800">
                        {formData.name}
                    </span>
                    {saveSuccess && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2Icon className="h-3.5 w-3.5" /> Saved
                        </span>
                    )}
                </div>
            )}

            {/* Validation errors */}
            {errors.length > 0 && (
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-4 py-3 space-y-1">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">
                        Please fix the following errors
                    </p>
                    {errors.map((e, i) => (
                        <p key={i} className="text-[12px] font-semibold text-red-700 dark:text-red-300">
                            • {e}
                        </p>
                    ))}
                </div>
            )}

            {/* Main scalar fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>
                        Purchase Order Number <span className="text-red-500">*</span>
                    </label>
                    <select
                        className={inputCls}
                        value={formData.purchase_order_number}
                        onChange={(e) => setField("purchase_order_number", e.target.value)}
                        disabled={isSaving}
                    >
                        <option value="">— Select Sanction Sheet —</option>
                        {(linkOptions.purchase_order_number || []).map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.value}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={labelCls}>PO Total Value</label>
                    <div className="flex items-center h-[38px] rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] px-3 text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                        {amtStr(formData.po_total_value)}
                    </div>
                </div>

                <div>
                    <label className={labelCls}>
                        Account Head <span className="text-red-500">*</span>
                    </label>
                    <select
                        className={inputCls}
                        value={formData.account_head}
                        onChange={(e) => setField("account_head", e.target.value)}
                        disabled={isSaving}
                    >
                        <option value="">— Select —</option>
                        {selectOpts(linkOptions.account_head || [])}
                    </select>
                    {formData.account_head && (
                        <p className="mt-1 text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                            <BudgetHeadName value={formData.account_head} />
                        </p>
                    )}
                </div>

                <div>
                    <label className={labelCls}>Other Expenses</label>
                    <select
                        className={inputCls}
                        value={formData.other_expenses}
                        onChange={(e) => setField("other_expenses", e.target.value)}
                        disabled={isSaving}
                    >
                        <option value="">— Select —</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>

                <div>
                    <label className={labelCls}>Particulars</label>
                    <input
                        type="text"
                        className={inputCls}
                        placeholder="Description of purchase"
                        maxLength={140}
                        value={formData.particulars}
                        onChange={(e) => setField("particulars", e.target.value)}
                        disabled={isSaving}
                    />
                    <CharLimitAlert value={formData.particulars} maxLength={140} className="mt-1" />
                </div>

                <div>
                    <label className={labelCls}>Total Committed Till Now</label>
                    <div className="flex items-center h-[38px] rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] px-3 text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                        {amtStr(Number(formData.total_committed_till_now) || 0)}
                    </div>
                </div>

                <div>
                    <label className={labelCls}>Transaction Ref</label>
                    <div className="flex items-center h-[38px] rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] px-3 text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                        {formData.ref_details || "—"}
                    </div>
                </div>
            </div>

            {/* Settlement Accounts child table — only when other_expenses === Yes */}
            {formData.other_expenses === "Yes" && <div>
                <HighlightHeading
                    icon={<ReceiptIcon />}
                    title="Settlement Accounts"
                    tone="settlement"
                />
                <div className="overflow-hidden rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]">
                    {formData.settlement_accounts.length > 0 ? (
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-violet-50/80 dark:bg-violet-950/20">
                                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] w-8">
                                        #
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
                                        Account Head <span className="text-red-400">*</span>
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] w-36">
                                        Amount <span className="text-red-400">*</span>
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
                                        Particulars
                                    </th>
                                    <th className="px-3 py-2 w-9" />
                                </tr>
                            </thead>
                            <tbody>
                                {formData.settlement_accounts.map((row, i) => (
                                    <tr
                                        key={row.name || i}
                                        className={cn(
                                            "border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0",
                                            i % 2 === 1 && "bg-[#FAFAF9]/60 dark:bg-zinc-800/20",
                                        )}
                                    >
                                        <td className="px-3 py-2 text-[#71717A] dark:text-[#A1A1AA] font-mono">
                                            {i + 1}
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                className={inputCls}
                                                value={row.account_head}
                                                onChange={(e) =>
                                                    updateRow(i, "account_head", e.target.value)
                                                }
                                                disabled={isSaving}
                                            >
                                                <option value="">— Select —</option>
                                                {selectOpts(childAccountOpts)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className={inputCls}
                                                placeholder="0.00"
                                                value={row.amount}
                                                onChange={(e) =>
                                                    updateRow(i, "amount", e.target.value)
                                                }
                                                onWheel={(e) => e.currentTarget.blur()}
                                                disabled={isSaving}
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                className={inputCls}
                                                placeholder="Description…"
                                                maxLength={140}
                                                value={row.particulars}
                                                onChange={(e) =>
                                                    updateRow(i, "particulars", e.target.value)
                                                }
                                                disabled={isSaving}
                                            />
                                            <CharLimitAlert value={row.particulars} maxLength={140} className="mt-1" />
                                        </td>
                                        <td className="px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={() => removeRow(i)}
                                                disabled={isSaving}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
                                            >
                                                <Trash2Icon className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 border-[#E4E4E7] dark:border-[#3F3F46] bg-violet-50/60 dark:bg-violet-950/10">
                                    <td className="px-3 py-2" />
                                    <td className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
                                        Total
                                    </td>
                                    <td className="px-3 py-2 text-[13px] font-extrabold text-violet-700 dark:text-violet-300">
                                        {amtStr(
                                            formData.settlement_accounts.reduce(
                                                (s, r) => s + (parseFloat(String(r.amount)) || 0),
                                                0,
                                            ),
                                        )}
                                    </td>
                                    <td colSpan={2} />
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                            <ReceiptIcon className="h-7 w-7 text-[#E4E4E7] dark:text-[#3F3F46]" />
                            <p className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                No settlement accounts added yet.
                            </p>
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={addRow}
                    disabled={isSaving}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-violet-300 dark:border-violet-700 px-3 py-1.5 text-[11px] font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors disabled:opacity-50"
                >
                    <PlusIcon className="h-3.5 w-3.5" /> Add Row
                </button>
            </div>}

            {/* Attachments — only when other_expenses === Yes */}
            {formData.other_expenses === "Yes" && <div>
                <HighlightHeading icon={<PaperclipIcon />} title="Attachments" tone="po" />
                {typeof formData.upload_attachments === "string" &&
                    formData.upload_attachments ? (
                    <div className="flex items-center gap-3">
                        <a
                            href={formData.upload_attachments}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800 text-[#D97757] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-[12px] font-medium"
                        >
                            <FileIcon className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[220px]">
                                {(formData.upload_attachments as string).split("/").pop()}
                            </span>
                            <ExternalLinkIcon className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                        <button
                            type="button"
                            onClick={() =>
                                setFormData((prev) => ({ ...prev, upload_attachments: null }))
                            }
                            className="text-[11px] font-semibold text-red-500 hover:underline"
                        >
                            Remove
                        </button>
                    </div>
                ) : typeof formData.upload_attachments === "object" &&
                    formData.upload_attachments?.file_name ? (
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                            <FileIcon className="h-3.5 w-3.5 text-violet-500" />
                            {formData.upload_attachments.file_name}
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                setFormData((prev) => ({ ...prev, upload_attachments: null }))
                            }
                            className="text-[11px] font-semibold text-red-500 hover:underline"
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#E4E4E7] dark:border-[#3F3F46] px-4 py-2.5 text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA] hover:border-violet-300 hover:text-violet-700 dark:hover:border-violet-700 dark:hover:text-violet-300 transition-colors">
                        <PaperclipIcon className="h-4 w-4" />
                        Choose file…
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleFile}
                            disabled={isSaving}
                        />
                    </label>
                )}
            </div>}

            {/* Save */}
            <div className="pt-2 flex items-center gap-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-[12px] font-extrabold text-white hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm mt-4"
                >
                    {isSaving ? (
                        <>
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            Saving…
                        </>
                    ) : (
                        <>
                            <SaveIcon className="h-3.5 w-3.5" />
                            {formData.name ? "Update PO Commit Adjustment" : "Save PO Commit Adjustment"}
                        </>
                    )}
                </button>
                {saveSuccess && !isSaving && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-4">
                        <CheckCircle2Icon className="h-3.5 w-3.5" /> Saved successfully
                    </span>
                )}
            </div>
        </div>
    );
};

// --- TABS ---
interface Tab {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    eyebrow: string;
    description: string;
}

const TABS: Tab[] = [
    {
        id: "details",
        label: "Direct Purchase",
        icon: <LayoutGridIcon className="w-4 h-4" />,
        eyebrow: "Application",
        description: "Request snapshot",
    },
    {
        id: "p11",
        label: "P-11 Form",
        icon: <ClipboardListIcon className="w-4 h-4" />,
        eyebrow: "Approval",
        description: "Form workflow",
    },
    {
        id: "sanction",
        label: "Sanction Sheet",
        icon: <FileTextIcon className="w-4 h-4" />,
        eyebrow: "Sanction",
        description: "Office approval",
    },
    {
        id: "po",
        label: "Purchase Order",
        icon: <ShoppingCartIcon className="w-4 h-4" />,
        eyebrow: "Order",
        description: "PO documents",
    },
    {
        id: "settlement",
        label: "PO Commit Adjustment",
        icon: <ReceiptIcon className="w-4 h-4" />,
        eyebrow: "Settlement",
        description: "PO Commit Adjustment",
    },
];

// --- MAIN COMPONENT ---
const DirectPurchaseDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();

    const {
        data,
        error,
        isLoading: loading,
        mutate: reloadData,
    } = useFrappeGetDoc<DirectPurchaseData>("Direct Purchase", id || "");

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isStaffRnD = roles.some((r) =>
        ["staff, RnD", "Staff RnD", "RnD Staff", "System Manager"].includes(r),
    );
    const isPermanentEmployee = roles.some((r) => r === "Permanent Employee");

    const [activeTab, setActiveTab] = useState<TabId>(
        (searchParams.get("tab") as TabId) || "details",
    );
    const highlightAction = searchParams.get("highlight_action") === "1";
    const [dpActions, setDpActions] = useState<string[]>([]);
    // Set by the Sanction Sheet's Print/PDF button to auto-run the header's
    // "Mark Print Taken" workflow action (skipping its confirm modal) once it's available.
    const [dpAutoTrigger, setDpAutoTrigger] = useState<{ action: string; comment?: string } | null>(null);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });
    const [isGeneratingPO, setIsGeneratingPO] = useState(false);
    const [isGeneratingP11, setIsGeneratingP11] = useState(false);
    const [isOpeningSanctionSheet, setIsOpeningSanctionSheet] = useState(false);
    const [poSanctionData, setPoSanctionData] = useState<Record<
        string,
        any
    > | null>(null);
    const [isLoadingPOData, setIsLoadingPOData] = useState(false);
    const [dpPoDocname, setDpPoDocname] = useState<string | null>(null);

    const { call: addComment } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );
    const { call: generatePO } = useFrappePostCall(
        directPurchaseAPI.generatePurchaseOrder,
    );
    const { call: generateP11 } = useFrappePostCall(
        directPurchaseAPI.generateP11Form,
    );
    const { call: fetchUserDetails } = useFrappePostCall<{ message: any }>(commonAPI.getUserDetailsByEmail);

    const [fetchedOwnerName, setFetchedOwnerName] = useState<string>("");

    useEffect(() => {
        if (data?.owner) {
            fetchUserDetails({ user_email: data.owner })
                .then(res => {
                    if (res?.message?.full_name) {
                        setFetchedOwnerName(res.message.full_name);
                    }
                })
                .catch(err => console.warn("Could not fetch owner details", err));
        }
    }, [data?.owner, fetchUserDetails]);

    // Check if P-11 Form exists for this Direct Purchase
    const { data: p11ListData } = useFrappeGetCall<{
        message: { name: string }[];
    }>("frappe.client.get_list", {
        doctype: "P_11 Form",
        filters: JSON.stringify([["app_id", "=", id || ""]]),
        fields: JSON.stringify(["name"]),
        limit: 1,
    });
    const p11DocName = p11ListData?.message?.[0]?.name ?? "";

    // Check if Sanction Sheet exists for this Direct Purchase
    const { data: ssListData, mutate: reloadSsCheck } = useFrappeGetCall<{
        message: { name: string }[];
    }>("frappe.client.get_list", {
        doctype: "sanction_sheet",
        filters: JSON.stringify([["app_id", "=", id || ""]]),
        fields: JSON.stringify(["name"]),
        limit: 1,
    });
    const ssDocName = ssListData?.message?.[0]?.name ?? "";
    const ssExists = !!ssDocName;

    // Commit Payment state
    const [resolvedProjectNo, setResolvedProjectNo] = useState<string>("");
    const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);
    const { call: fetchDocument } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const directPurchaseProject =
        data?.project_name || data?.project_no || data?.project || "";

    // --- RESOLVE ACTUAL PROJECT NUMBER ---
    useEffect(() => {
        const linkedName = directPurchaseProject;
        if (!linkedName) {
            setResolvedProjectNo("");
            return;
        }
        fetchDocument({ doctype: "Project Registration", name: linkedName })
            .then((res) => {
                const projectDoc = res?.message;
                if (projectDoc?.project_no) {
                    setResolvedProjectNo(projectDoc.project_no);
                } else {
                    setResolvedProjectNo(linkedName);
                }
            })
            .catch(() => {
                setResolvedProjectNo(linkedName);
            });
    }, [directPurchaseProject, fetchDocument]);

    const [poRefDetailsId, setPoRefDetailsId] = useState<string | null>(null);

    // Fetch the first commit's staging record, then call ref_details_id with its payload values
    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        const run = async () => {
            try {
                const encodedFilter = encodeURIComponent(
                    JSON.stringify([["reference_name", "=", id]])
                );
                const stagingRes = await fetch(
                    `/api/v2/document/Kafka Commit Staging?filters=${encodedFilter}&fields=["*"]`,
                    { credentials: "include" }
                );
                if (!stagingRes.ok || cancelled) return;
                const stagingJson = await stagingRes.json();
                const record = (stagingJson?.data ?? [])[0];
                if (!record) return;

                let payload: Record<string, any> = {};
                try {
                    const raw = record.payload ?? record.commit_payload ?? "{}";
                    payload = typeof raw === "string" ? JSON.parse(raw) : raw;
                } catch { return; }

                const commitAmount = payload.commit_amount;
                const budgetHead = payload.budget_head;
                const projectName = payload.project_name;
                const frapAppIdVal = payload.frap_app_id ?? payload.frapAppId ?? id;
                if (!commitAmount || !projectName) return;

                const params = new URLSearchParams({
                    commitAmount: String(commitAmount),
                    projectName: String(projectName),
                    frapAppId: String(frapAppIdVal),
                    ...(budgetHead ? { budgetHead: String(budgetHead) } : {}),
                });
                const refRes = await fetch(
                    `/api/method/rndopsapp.rndopsapp.doctype.dp_po.dp_po.ref_details_id?${params}`,
                    { credentials: "include" }
                );
                if (!refRes.ok || cancelled) return;
                const refJson = await refRes.json();
                const refId = refJson?.message?.refDetailsId;
                if (refId != null && !cancelled) setPoRefDetailsId(String(refId));
            } catch {
                // silently ignore — poRefDetailsId stays null
            }
        };
        run();
        return () => { cancelled = true; };
    }, [id]);

    const [commitHead, setCommitHead] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");
    const [isDpPrintOpen, setIsDpPrintOpen] = useState(false);
    const [isPoPrintOpen, setIsPoPrintOpen] = useState(false);
    const detailsContainerRef = useRef<HTMLDivElement>(null);
    const activityLogContainerRef = useRef<HTMLDivElement>(null);

    const { call: submitPayment, loading: isPaying } = useFrappePostCall(
        "rndopsapp.rndopsapp.commitPayment.submit_payment_data",
    );

    const projectTitle = resolvedProjectNo || directPurchaseProject;
    const {
        budgetData,
        heads: budgetHeadsFromLedger,
        actualBalance,
        commitableBalance,
    } = useProjectBudget(projectTitle);

    // Fetch Budget Heads directly (matching DisbursalOfHonorariumDetails / TravelDetails pattern)
    // This is the canonical source for the CommitPayment dropdown, with session cookie sent.
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);
    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch(
                    '/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0',
                    { credentials: "include", headers: { Accept: "application/json" } },
                );
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }
                const result = await response.json();
                if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
                    setBudgetHeadList(
                        result.data.map((item: any) => ({
                            name: item.budget_head,
                            id: item.id,
                        })),
                    );
                } else {
                    throw new Error("No data returned or empty array");
                }
            } catch (err) {
                setBudgetHeadList([
                    { name: 'Overhead', id: '1' },
                    { name: 'Manpower', id: '2' },
                    { name: 'Travel', id: '3' },
                    { name: 'Contingency', id: '4' },
                    { name: 'Consumable', id: '5' },
                    { name: 'Equipments', id: '6' },
                    { name: 'GST', id: '7' },
                    { name: 'Recurring', id: '8' },
                    { name: 'Non-Recurring', id: '9' },
                    { name: 'SSR', id: '10' },
                    { name: 'Research Grant', id: '11' },
                    { name: 'Operational', id: '12' },
                    { name: 'Consultancy Fee', id: '13' },
                    { name: 'HRD (Human Resource Development)', id: '14' },
                    { name: 'Outsource', id: '15' },
                    { name: 'Data', id: '16' },
                    { name: 'Others', id: '17' },
                    { name: 'License Fee', id: '18' },
                    { name: 'Training and Workshop', id: '19' },
                    { name: 'Facilitation', id: '20' },
                    { name: 'Funding Support for FDP', id: '21' },
                    { name: 'Fellowship', id: '22' },
                    { name: 'Miscellaneous', id: '23' },
                    { name: 'Manpower (C-Step)', id: '24' }
                ]);
            }
        };
        fetchBudgetHeads();
    }, []);

    // budgetHeads for CommitPayment comes from the direct fetch (more reliable)
    // Fall back to ledger hook heads if local list is still loading
    const budgetHeads = budgetHeadList.length > 0
        ? budgetHeadList.map((h) => h.name)
        : budgetHeadsFromLedger;

    const linkedCommitment = budgetData.find(
        (e) =>
            (e.ref === (id || "") || e.frapAppId === (id || "")) &&
            e.type === "commitment",
    );
    const isCommitted = !!linkedCommitment;

    const commitRequired =
        (data?.workflow_state === "Pending Staff Approval" ||
            data?.workflow_state === "Pending Staff Verification") &&
        isStaffRnD &&
        isCommittedForGate === false;

    const sanctionRequired =
        data?.workflow_state === "RDP-11 Verified" &&
        isStaffRnD &&
        !ssExists;

    useEffect(() => {
        if (budgetHeads.length > 0 && !commitHead)
            setCommitHead(budgetHeads[0]);
    }, [budgetHeads]);

    useEffect(() => {
        if (linkedCommitment) {
            setCommitHead(linkedCommitment.head || "");
            if (!paymentAmount)
                setPaymentAmount(String(linkedCommitment.committed));
        }
    }, [linkedCommitment]);

    const loadData = () => {
        if (id) {
            reloadData();
            reloadSsCheck();
            clearActivityLogCache("Direct Purchase", id);
        }
    };

    // Fetch sanction sheet + dp_po data for PO editor
    useEffect(() => {
        if (!id) return;
        if (poSanctionData) return; // already fetched

        const fetchSSAndDpPo = async () => {
            setIsLoadingPOData(true);
            try {
                // ── 1. Fetch Sanction Sheet ────────────────────────────────────
                const filters = JSON.stringify([["app_id", "=", id]]);
                const listRes = await fetch(
                    `/api/v2/document/sanction_sheet?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent('["name"]')}`,
                    { credentials: "include", headers: { Accept: "application/json" } },
                )
                    .then((r) => r.json())
                    .catch(() => ({ data: [] }));

                const ssName = listRes?.data?.[0]?.name;
                if (!ssName) return;

                const ssRes = await fetch("/api/method/frappe.client.get", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
                    },
                    body: JSON.stringify({ doctype: "sanction_sheet", name: ssName }),
                })
                    .then((r) => r.json())
                    .catch(() => null);

                const ssDoc = ssRes?.message;
                if (!ssDoc) return;

                // ── 2. Look up existing dp_po for this Direct Purchase ─────────
                const dpPoRes = await fetch(
                    `/api/method/${dpPoAPI.getByDirectPurchase}`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                            "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
                        },
                        body: JSON.stringify({ dp_docname: id }),
                    },
                )
                    .then((r) => r.json())
                    .catch(() => null);

                let dpPoData = dpPoRes?.message?.data ?? null;
                let dpPoName = dpPoRes?.message?.docname ?? null;

                // ── 3. Auto-create dp_po if it doesn't exist yet ──────────────
                if (!dpPoName) {
                    const genRes = await fetch(
                        `/api/method/${dpPoAPI.generateFromSS}`,
                        {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/json",
                                Accept: "application/json",
                                "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
                            },
                            body: JSON.stringify({
                                dp_docname: id,
                                sanction_sheet_name: ssName,
                            }),
                        },
                    )
                        .then((r) => r.json())
                        .catch(() => null);

                    dpPoName = genRes?.message?.docname ?? null;

                    if (dpPoName) {
                        const freshRes = await fetch(
                            `/api/method/${dpPoAPI.getByDirectPurchase}`,
                            {
                                method: "POST",
                                credentials: "include",
                                headers: {
                                    "Content-Type": "application/json",
                                    Accept: "application/json",
                                    "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
                                },
                                body: JSON.stringify({ dp_docname: id }),
                            },
                        )
                            .then((r) => r.json())
                            .catch(() => null);
                        dpPoData = freshRes?.message?.data ?? null;
                    }
                }

                // ── 4. Fetch signatory details (HoS RnD → fallback rndadmin) ──
                let signeeName = dpPoData?.signee_name || "";
                let signeeDesignation = dpPoData?.signee_designation || "";

                if (!signeeName) {
                    try {
                        const csrf = (window as any).csrf_token || "";
                        // Find who holds the HoS RnD role
                        const roleRes = await fetch("/api/method/frappe.client.get_list", {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json", Accept: "application/json", "X-Frappe-CSRF-Token": csrf },
                            body: JSON.stringify({ doctype: "Has Role", filters: [["role", "=", "Hos, RnD (Head of Section, RnD)"], ["parenttype", "=", "User"]], fields: ["parent"], limit_page_length: 1 }),
                        }).then((r) => r.json()).catch(() => null);

                        const hosEmail = roleRes?.message?.[0]?.parent || "";
                        const targetEmail = hosEmail || "rndadmin@iitg.ac.in";

                        const detailsRes = await fetch(`/api/method/${directPurchaseAPI.getUserDetails}`, {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json", Accept: "application/json", "X-Frappe-CSRF-Token": csrf },
                            body: JSON.stringify({ user_email: targetEmail }),
                        }).then((r) => r.json()).catch(() => null);

                        const details = detailsRes?.message || {};
                        signeeName = details.full_name || details.applicant_name || details.name || targetEmail;
                        signeeDesignation = details.designation_name || details.designation || "";
                    } catch {
                        // signatory fetch failed — leave blank, user can fill manually
                    }
                }

                // ── 5. Merge: SS doc is the base; dp_po fields override ────────
                const merged = {
                    ...ssDoc,
                    ...(dpPoData
                        ? {
                            vendor_address: dpPoData.vendor_name_address || ssDoc.ss_name_of_firms || "",
                            po_number: dpPoData.po_number || ssDoc.name || "",
                            po_date: dpPoData.po_date || "",
                            quotation_no: dpPoData.quotation_ref_no || "",
                            amount_in_words: dpPoData.amount_in_words || "",
                            terms_and_conditions: dpPoData.terms_and_conditions || "",
                            _dp_po_items: dpPoData.items || [],
                        }
                        : {}),
                    signee_name: signeeName,
                    signee_designation: signeeDesignation,
                    _dp_po_name: dpPoName,
                    dp_indent_value: data?.total_estimate ?? "",
                };

                setDpPoDocname(dpPoName);
                setPoSanctionData(merged);
            } catch (err) {
            } finally {
                setIsLoadingPOData(false);
            }
        };

        fetchSSAndDpPo();
    }, [activeTab, id, data?.workflow_state, poSanctionData]);




    const handlePayment = async () => {
        if (!paymentAmount || !commitHead || !id || !data) {
            alert("Please select a budget head and enter an amount.");
            return;
        }
        try {
            await submitPayment({
                doctype: "Direct Purchase",
                name: id,
                project_name: data.project_name,
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

    const handleSaveDpPo = async (poData: Record<string, any>) => {
        const csrf = (window as any).csrf_token || "";
        const payload: Record<string, any> = {
            name: dpPoDocname || undefined,
            direct_purchase_ref: id,
            sanction_sheet_ref: poSanctionData?.name || "",
            vendor_name_address: poData.vendor_address || "",
            po_number: poData.po_number || "",
            po_date: (() => {
                const raw = poData.po_date || "";
                const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
                return m ? `${m[3]}-${m[2]}-${m[1]}` : raw;
            })(),
            quotation_ref_no: poData.quotation_no || "",
            signee_name: poData.signee_name || "",
            signee_designation: poData.signee_designation || "",
            amount_in_words: poData.amount_in_words || "",
            terms_and_conditions: poData.terms_and_conditions || "",
            items: Array.isArray(poData.table_bttk)
                ? poData.table_bttk.map((row: any) => ({
                    item_name: row.item_name || "",
                    make: row.item_make || "",
                    model: row.item_model || "",
                    qty: row.item_quantity || 0,
                    unit_price: row.item_unit_price || 0,
                    discount: row.item_discount || 0,
                    gst: row.item_gst || 0,
                    total: row.dp_total_price || 0,
                }))
                : [],
        };

        const res = await fetch(`/api/method/${dpPoAPI.save}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-Frappe-CSRF-Token": csrf,
            },
            body: JSON.stringify({ data: JSON.stringify(payload) }),
        }).then((r) => r.json());

        if (res?.message?.status !== "success") {
            throw new Error(res?.message?.message || "Save failed");
        }
        if (res.message.docname && !dpPoDocname) {
            setDpPoDocname(res.message.docname);
        }
    };

    const handleGeneratePO = async () => {
        if (!id) return;
        setIsGeneratingPO(true);
        try {
            const res = await generatePO({ docname: id });
            if (res?.message?.status === "success") {
                alert("Purchase Order generated successfully!");
                loadData();
            } else {
                throw new Error(
                    res?.message?.message || "Failed to generate PO",
                );
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "Purchase Order Generation Failed", message: parseFrappeError(err) });
        } finally {
            setIsGeneratingPO(false);
        }
    };

    const [isDownloadingPO, setIsDownloadingPO] = useState(false);
    const handleDownloadPO = async () => {
        if (!id) return;
        setIsDownloadingPO(true);
        try {
            // Get sanction sheet name and project_no (use cached or fetch)
            let ssName = poSanctionData?.name;
            let projectNo = poSanctionData?.project_no;
            if (!ssName) {
                const filters = JSON.stringify([["app_id", "=", id]]);
                const listRes = await fetch(
                    `/api/v2/document/sanction_sheet?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent('["name","project_no"]')}`,
                    {
                        credentials: "include",
                        headers: { Accept: "application/json" },
                    },
                )
                    .then((r) => r.json())
                    .catch(() => ({ data: [] }));
                ssName = listRes?.data?.[0]?.name;
                projectNo = listRes?.data?.[0]?.project_no;
            }
            if (!ssName) throw new Error("Sanction Sheet not found");

            const params = new URLSearchParams({
                docname: ssName,
                app_id: id,
                project_no: projectNo || "",
            });
            const res = await fetch(
                `/api/method/rndopsapp.rndopsapp.doctype.direct_purchase.direct_purchase.get_po_document?${params}`,
                {
                    credentials: "include",
                    headers: { Accept: "application/json" },
                },
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json?.message?.status === false)
                throw new Error(json?.message?.message || "Failed to fetch PO");

            const fileUrl = json?.message?.file_url || json?.message?.url;
            if (fileUrl) {
                window.open(fileUrl, "_blank");
            } else {
                throw new Error("No file URL returned");
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "Download Failed", message: parseFrappeError(err) });
        } finally {
            setIsDownloadingPO(false);
        }
    };

    const handleGenerateP11 = async () => {
        if (!id) return;
        setIsGeneratingP11(true);
        try {
            const res = await generateP11({ docname: id });
            if (res?.message?.status === "success") {
                alert("P-11 Form generated successfully!");
                loadData();
            } else {
                throw new Error(
                    res?.message?.message || "Failed to generate P-11 Form",
                );
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "P-11 Form Generation Failed", message: parseFrappeError(err) });
        } finally {
            setIsGeneratingP11(false);
        }
    };

    const handleOpenSanctionSheet = async () => {
        if (!id) return;
        setIsOpeningSanctionSheet(true);
        try {
            const filters = JSON.stringify([["app_id", "=", id]]);
            const res = await fetch(
                `/api/v2/document/sanction_sheet?filters=${encodeURIComponent(filters)}&fields=["name"]`,
                {
                    credentials: "include",
                    headers: { Accept: "application/json" },
                },
            );
            if (res.ok) {
                const result = await res.json();
                const existing = result.data?.[0];
                if (existing?.name) {
                    navigate(`/sanction-sheet?edit=${existing.name}`);
                    return;
                }
            }
            navigate(
                `/sanction-sheet?app_id=${id}&project_no=${encodeURIComponent(data?.project_name || "")}`,
            );
        } catch {
            navigate(
                `/sanction-sheet?app_id=${id}&project_no=${encodeURIComponent(data?.project_name || "")}`,
            );
        } finally {
            setIsOpeningSanctionSheet(false);
        }
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B]">
                <div className="text-center space-y-2">
                    <h2 className="font-serif text-xl font-medium text-red-600">
                        Unable to load document
                    </h2>
                    <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                        {error
                            ? (error as any).message ||
                            "Failed to load document"
                            : "Document not found"}
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 text-sm text-[#D97757] hover:underline"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans overflow-x-hidden">


            <main className="transition-all duration-300 ease-in-out px-5 py-6 md:px-8 md:py-7 overflow-x-hidden">
                {/* Page Header */}
                <PageHeader
                    title={data.name}
                    status={data.workflow_state}
                    projectName={data.project_name}
                >
                    <div className="flex items-center gap-2 flex-wrap">
                        <ViewProjectButton doctype="Direct Purchase" data={data} />
                        {data.workflow_state === "Draft" && id && (
                            <ClaudeButton
                                variant="outline"
                                onClick={() =>
                                    navigate(`/direct-purchase?edit=${id}`)
                                }
                            >
                                <EditIcon className="w-3.5 h-3.5" />
                                Edit
                            </ClaudeButton>
                        )}
                        {/*{data.workflow_state === 'Approved' && id && (
                            <ClaudeButton
                                variant="primary"
                                onClick={handleGenerateP11}
                                disabled={isGeneratingP11}
                            >
                                {isGeneratingP11 ? 'Generating…' : 'Generate P-11 Form'}
                            </ClaudeButton>
                        )}*/}
                        {/*{data.workflow_state === "POGenerated" && id && (
                            <ClaudeButton
                                variant="outline"
                                onClick={handleDownloadPO}
                                disabled={isDownloadingPO}
                            >
                                {isDownloadingPO ? "Loading…" : "Print PO"}
                            </ClaudeButton>
                        )}*/}
                        {id && (
                            <DirectPurchaseActionButtons
                                docname={id}
                                onActionComplete={loadData}
                                p11DocName={p11DocName}
                                onP11Missing={() => setActiveTab("p11")}
                                commitRequired={commitRequired}
                                sanctionRequired={sanctionRequired}
                                onSanctionMissing={() => setActiveTab("sanction")}
                                highlight={highlightAction}
                                onActionsLoaded={setDpActions}
                                autoTrigger={dpAutoTrigger}
                                onAutoTriggerConsumed={() => setDpAutoTrigger(null)}
                            />
                        )}
                    </div>
                </PageHeader>

                {dpActions.length > 0 && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-950/30">
                        <div className="mt-0.5 flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                            <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] font-bold text-amber-800 dark:text-amber-300">
                                Action Required — {dpActions.join(" / ")}
                            </p>
                            <p className="mt-0.5 text-[12px] font-medium leading-5 text-amber-700 dark:text-amber-400">
                                Click the <span className="font-bold">"{dpActions[0]}"</span> button above to {dpActions[0] === "Generate PO" ? "generate the Purchase Order." : "proceed to the next step."}
                            </p>
                        </div>
                    </div>
                )}

                <DPWorkflowTimeline
                    workflowState={data.workflow_state}
                    accountHead={data.account_head}
                    totalEstimate={data.total_estimate}
                />

                <div className={cn("min-w-0 space-y-0", isStaffRnD && (data.workflow_state === "Pending Staff Approval" || data.workflow_state === "Pending Staff Verification") && activeTab === "details" ? "grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start" : "")}>
                <div className="min-w-0 space-y-0">
                    {/* Tab navigation */}
                    <div className={cn("mb-4 grid grid-cols-1 gap-2 rounded-2xl border border-[#E4E4E7] bg-white p-2 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A] sm:grid-cols-2", isStaffRnD ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
                        {TABS.filter((tab) => tab.id !== "settlement" || isStaffRnD).map((tab) => {
                            const showSanctionPulse =
                                tab.id === "sanction" &&
                                sanctionRequired &&
                                activeTab !== "sanction";
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "group relative inline-flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-150",
                                        activeTab === tab.id
                                            ? TAB_TONES[tab.id].active
                                            : "border-transparent text-[#71717A] hover:border-[#E4E4E7] hover:bg-[#FAFAF9] hover:text-[#3F3F46] dark:text-[#A1A1AA] dark:hover:border-[#3F3F46] dark:hover:bg-[#18181B] dark:hover:text-[#E4E4E7]",
                                        showSanctionPulse && "border-amber-300 dark:border-amber-700",
                                    )}
                                >
                                    {/* Pulse dot tutorial indicator */}
                                    {showSanctionPulse && (
                                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                                            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-500" />
                                        </span>
                                    )}
                                    <span
                                        className={cn(
                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5",
                                            activeTab === tab.id
                                                ? "bg-white/70 text-current dark:bg-white/10"
                                                : TAB_TONES[tab.id].icon,
                                            showSanctionPulse && "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
                                        )}
                                    >
                                        {tab.icon}
                                    </span>
                                    <span className="min-w-0">
                                        <span className={cn(
                                            "block truncate text-[11px] font-extrabold uppercase tracking-wide",
                                            showSanctionPulse && "text-amber-700 dark:text-amber-400",
                                        )}>
                                            {tab.label}
                                        </span>
                                        <span className="mt-0.5 block truncate text-[10px] font-semibold normal-case tracking-normal opacity-75">
                                            {tab.description}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab content */}
                    <ClaudeCard
                        className={cn(
                            "border-t-[3px]",
                            TAB_TONES[activeTab].border,
                        )}
                    >
                        {activeTab === "details" && (
                            <>
                                <TabSectionHeader
                                    icon={<LayoutGridIcon />}
                                    eyebrow="Application Details"
                                    title="Direct Purchase Request"
                                    description="Key financials, applicant information, declarations, attachments, and purchase tables for this request."
                                    tone="details"
                                    action={
                                        <button
                                            onClick={() => setIsDpPrintOpen(true)}
                                            disabled={!!data.owner && !fetchedOwnerName}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-bold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Printer className="h-3.5 w-3.5" /> Print / PDF
                                        </button>
                                    }
                                />
                                <div ref={detailsContainerRef}>
                                    <DocumentViewer data={data} />
                                </div>
                                <div style={{ display: "none" }} ref={activityLogContainerRef}>
                                    {id && (
                                        <ActivityLog 
                                            doctype="Direct Purchase" 
                                            docname={id} 
                                            fallbackOwner={data.owner}
                                            fallbackCreation={data.creation}
                                            fallbackOwnerName={fetchedOwnerName || data.owner}
                                        />
                                    )}
                                </div>


                                {/* Record Payment — details tab only */}
                                {isStaffRnD &&
                                    data.workflow_state === "Pending Staff Approval" &&
                                    isCommitted && (
                                        <div className="mt-4">
                                            <ClaudeCard title="Record Payment" accentTop>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
                                                            Payment Amount (₹)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            className="w-full px-3 py-2 border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg text-sm bg-white dark:bg-[#27272A] text-[#3F3F46] dark:text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                                            placeholder="Enter payment amount"
                                                            value={paymentAmount}
                                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                        />
                                                    </div>
                                                    <ClaudeButton
                                                        variant="primary"
                                                        className="w-full"
                                                        onClick={handlePayment}
                                                        disabled={isPaying}
                                                    >
                                                        {isPaying ? "Recording…" : "Record Payment"}
                                                    </ClaudeButton>
                                                </div>
                                            </ClaudeCard>
                                        </div>
                                    )}

                            </>
                        )}

                        {activeTab === "p11" && id && (
                            <>
                                <TabSectionHeader
                                    icon={<ClipboardListIcon />}
                                    eyebrow=""
                                    title="P-11 Form"
                                    description="Fill, review, print, and submit the P-11 form linked to this Direct Purchase application."
                                    tone="p11"
                                    action={data.workflow_state === "Approved" ? (
                                        <button
                                            onClick={() =>
                                                p11DocName
                                                    ? navigate(`/p11-form?edit=${p11DocName}&app_id=${id}`)
                                                    : navigate(`/p11-form?app_id=${id}`)
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D97757] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#c66a4e]"
                                        >
                                            <ClipboardListIcon className="h-3.5 w-3.5" />
                                            {p11DocName ? "Edit P-11 Form" : "Fill P-11 Form"}
                                        </button>
                                    ) : undefined}
                                />
                                {["RDP-11 Verified", "Sanction Sheet Generated", "Sanction Sheet Printed", "Sanction Approved", "POGenerated"].includes(data?.workflow_state ?? "") ? (
                                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-semibold leading-5 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                                        <CheckCircle2Icon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        The P-11 Form has been verified by R&amp;D Staff.
                                    </div>
                                ) : (
                                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold leading-5 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                                        A printed hard copy of the P-11 Form must be submitted to the R&amp;D Office for further processing.
                                    </div>
                                )}
                                <LinkedDocTab
                                    doctype="P_11 Form"
                                    filterField="app_id"
                                    filterValue={id}
                                    emptyTitle="No P-11 Form Filled Yet"
                                    emptyDescription={'Click "Fill P-11 Form" above to create and submit the P-11 Form. You must fill and submit P-11 before the "Submit P-11" workflow action becomes available.'}
                                    onDataReload={loadData}
                                    parentData={data ?? undefined}
                                />
                            </>
                        )}

                        {activeTab === "sanction" && id && (
                            <>
                                <TabSectionHeader
                                    icon={<FileTextIcon />}
                                    eyebrow="Approval Document"
                                    title="Sanction Sheet"
                                    description="Create or review the sanction sheet after the P-11 form has been verified by R&D."
                                    tone="sanction"
                                    action={
                                        data?.workflow_state === "RDP-11 Verified" && isStaffRnD ? (
                                            <button
                                                onClick={handleOpenSanctionSheet}
                                                disabled={isOpeningSanctionSheet}
                                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                                            >
                                                {isOpeningSanctionSheet
                                                    ? "Opening…"
                                                    : ssExists
                                                        ? "Edit Sanction Sheet"
                                                        : "Create Sanction Sheet"}
                                            </button>
                                        ) : undefined
                                    }
                                />

                                {/* Step guidance for RDP-11 Verified state */}
                                {data?.workflow_state === "RDP-11 Verified" && isStaffRnD && (
                                    ssExists ? (
                                        <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/20">
                                            <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                            <div>
                                                <p className="text-[12px] font-extrabold text-emerald-800 dark:text-emerald-300">
                                                    Sanction Sheet created
                                                </p>
                                                <p className="mt-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                                    Now click the workflow action button at the top of the page to proceed.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
                                            <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                            <div>
                                                <p className="text-[12px] font-extrabold text-amber-800 dark:text-amber-300">
                                                    Action required — create the Sanction Sheet first
                                                </p>
                                                <p className="mt-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                                                    Click <strong>Create Sanction Sheet</strong> above to fill in and save the sanction sheet. The workflow action button will unlock once the sanction sheet is saved.
                                                </p>
                                            </div>
                                        </div>
                                    )
                                )}

                                {!isStaffRnD && !["Sanction Sheet Generated", "Sanction Sheet Printed", "Sanction Approved", "POGenerated"].includes(data?.workflow_state ?? "") ? (
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50 px-5 py-12 text-center gap-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm dark:bg-[#27272A]">
                                            <FileTextIcon className="h-5 w-5" />
                                        </div>
                                        <p className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                            Sanction Sheet Not Yet Available
                                        </p>
                                        <p className="max-w-md text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">
                                            The Sanction Sheet will be visible here once R&amp;D Staff generates it after verifying your P-11 Form.
                                        </p>
                                    </div>
                                ) : (
                                    <LinkedDocTab
                                        doctype="sanction_sheet"
                                        filterField="app_id"
                                        filterValue={id}
                                        emptyTitle="No Sanction Sheet Generated Yet"
                                        emptyDescription="The Sanction Sheet is created by RnD Staff after the P-11 Form is verified and approved."
                                        onDataReload={loadData}
                                        onRequestMarkPrintTaken={() =>
                                            setDpAutoTrigger({
                                                action: "Mark Print Taken",
                                                comment:
                                                    "Auto-confirmed after printing the Sanction Sheet.",
                                            })
                                        }
                                    />
                                )}
                            </>
                        )}

                        {activeTab === "po" && (
                            <>
                                <TabSectionHeader
                                    icon={<ShoppingCartIcon />}
                                    eyebrow="Purchase Order"
                                    title="Purchase Order"
                                    description="Prepare, preview, print, and upload the signed purchase order generated from the sanction sheet."
                                    tone="po"
                                />
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                                    {/* Left — PO editor / empty states */}
                                    <div className="min-w-0">
                                        {isLoadingPOData ? (
                                            <div className="flex items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] py-12 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                                <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#D97757] border-t-transparent" />
                                            </div>
                                        ) : (data?.workflow_state === "Pending Staff Verification" || data?.workflow_state === "RDP-11 Verified") ? (
                                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50 px-5 py-12 text-center gap-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm dark:bg-[#27272A]">
                                                    <ShoppingCartIcon className="h-5 w-5" />
                                                </div>
                                                <p className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                    Purchase Order Locked
                                                </p>
                                                <p className="max-w-md text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">
                                                    {data?.workflow_state === "RDP-11 Verified"
                                                        ? "The P-11 Form has been verified. R&D Staff must generate the Sanction Sheet before the Purchase Order becomes available."
                                                        : "The P-11 Form has been submitted and is awaiting verification by R&D Staff. The Purchase Order will be available after the Sanction Sheet is generated."}
                                                </p>
                                            </div>
                                        ) : (data?.workflow_state === "Sanction Sheet Generated" || data?.workflow_state === "Sanction Sheet Printed") ? (
                                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50 px-5 py-12 text-center gap-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm dark:bg-[#27272A]">
                                                    <ShoppingCartIcon className="h-5 w-5" />
                                                </div>
                                                <p className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                    Purchase Order Locked
                                                </p>
                                                <p className="max-w-md text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">
                                                    {data?.workflow_state === "Sanction Sheet Printed"
                                                        ? "The Sanction Sheet has been printed. This tab will be enabled once the Sanction is Approved by R&D Staff."
                                                        : `The Sanction Sheet has not been printed yet${data?.applicant_name ? ` by ${data.applicant_name}` : ""}. Once the PI prints the Sanction Sheet, this form will move to "Sanction Sheet Printed" and the Purchase Order will be enabled.`}
                                                </p>
                                            </div>
                                        ) : poSanctionData &&
                                            (isStaffRnD ||
                                                data?.workflow_state === "POGenerated") ? (
                                            <POEditor
                                                ssData={poSanctionData}
                                                dpId={id || ""}
                                                isStaffRnD={isStaffRnD}
                                                isPIReadOnly={
                                                    isPermanentEmployee &&
                                                    !isStaffRnD
                                                }
                                                isSaved={!!dpPoDocname}
                                                onSave={isStaffRnD ? handleSaveDpPo : undefined}
                                                onUploadSignedPO={async (
                                                    file: File,
                                                ) => {
                                                    const formData = new FormData();
                                                    formData.append(
                                                        "file",
                                                        file,
                                                        file.name,
                                                    );
                                                    formData.append(
                                                        "docname",
                                                        poSanctionData.name,
                                                    );
                                                    formData.append(
                                                        "app_id",
                                                        id || "",
                                                    );
                                                    formData.append(
                                                        "project_no",
                                                        poSanctionData.project_no ||
                                                        "",
                                                    );
                                                    const res = await fetch(
                                                        "/api/method/rndopsapp.rndopsapp.doctype.direct_purchase.direct_purchase.upload_po_document",
                                                        {
                                                            method: "POST",
                                                            body: formData,
                                                            credentials: "include",
                                                            headers: {
                                                                "X-Frappe-CSRF-Token":
                                                                    (window as any)
                                                                        .csrf_token ||
                                                                    "",
                                                            },
                                                        },
                                                    );
                                                    const json = await res
                                                        .json()
                                                        .catch(() => ({}));
                                                    if (
                                                        !res.ok ||
                                                        json?.message?.status ===
                                                        false
                                                    )
                                                        throw new Error(
                                                            json?.message
                                                                ?.message ||
                                                            "Upload failed",
                                                        );
                                                    // Reset so the effect re-fetches with updated file_path
                                                    setPoSanctionData(null);
                                                    setDpPoDocname(null);
                                                }}
                                            />
                                        ) : poSanctionData ? (
                                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] px-5 py-12 text-center gap-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#A1A1AA] shadow-sm dark:bg-[#27272A] dark:text-[#71717A]">
                                                    <ShoppingCartIcon className="h-5 w-5" />
                                                </div>
                                                <p className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                    Purchase Order Not Yet Generated
                                                </p>
                                                <p className="max-w-md text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">
                                                    The Purchase Order has not been
                                                    generated by staff yet. Please
                                                    check back later.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] px-5 py-12 text-center gap-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#A1A1AA] shadow-sm dark:bg-[#27272A] dark:text-[#71717A]">
                                                    <ShoppingCartIcon className="h-5 w-5" />
                                                </div>
                                                <p className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                    No Sanction Sheet Available
                                                </p>
                                                <p className="max-w-md text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">
                                                    The Purchase Order editor
                                                    requires a Sanction Sheet to be
                                                    created first.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right — Commit Payment (only when PO tab is unlocked) */}
                                    {isStaffRnD && !!poSanctionData && ["Sanction Approved", "POGenerated"].includes(data?.workflow_state ?? "") && (
                                        <div className="min-w-0 space-y-4">
                                            <CommitPayment
                                                key={`commit-main-${id}`}
                                                doctype="Direct Purchase"
                                                docName={id || ""}
                                                projectName={projectTitle}
                                                budgetHeads={budgetHeads}
                                                actualBalance={actualBalance}
                                                commitableBalance={commitableBalance}
                                                onCommitSuccess={() => loadData()}
                                                onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
                                            />
                                            <CommitPayment
                                                key={`commit-po-${id}`}
                                                doctype="Direct Purchase"
                                                docName={id || ""}
                                                stagingReferenceName={`${id}-po`}
                                                frapAppId={id}
                                                projectName={projectTitle}
                                                budgetHeads={budgetHeads}
                                                actualBalance={actualBalance}
                                                commitableBalance={commitableBalance}
                                                title="Additional PO Commitment"
                                                description="Submit a linked commitment for this Purchase Order, referencing the existing commitment's transaction ID."
                                                forcedRefDetails={poRefDetailsId ?? undefined}
                                                onCommitSuccess={() => loadData()}
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === "settlement" && id && isStaffRnD && (
                            <>
                                <TabSectionHeader
                                    icon={<ReceiptIcon />}
                                    eyebrow="Settlement"
                                    title="PO Commit Adjustment"
                                    description="Submit the PO Commit Adjustment for this direct purchase after the PO is fulfilled."
                                    tone="settlement"
                                />
                                {!["PO Sent", "Completed"].includes(data.workflow_state ?? "") ? (
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] px-5 py-12 text-center gap-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#A1A1AA] shadow-sm dark:bg-[#27272A] dark:text-[#71717A]">
                                            <ReceiptIcon className="h-5 w-5" />
                                        </div>
                                        <p className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                            Settlement Locked
                                        </p>
                                        <p className="max-w-md text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">
                                            The PO Commit Adjustment can only be submitted after the Purchase Order has been sent. This section will be available once the status reaches <span className="font-semibold">"PO Sent"</span>.
                                        </p>
                                    </div>
                                ) : (
                                    <FinalSettlementTab dpId={id} />
                                )}
                            </>
                        )}
                    </ClaudeCard>

                </div>{/* end inner tab column */}

                {/* Sidebar — Make a Commitment (details tab + Pending Staff Approval / Pending Staff Verification) */}
                {isStaffRnD && (data.workflow_state === "Pending Staff Approval" || data.workflow_state === "Pending Staff Verification") && activeTab === "details" && (
                    <div className="sticky top-4 space-y-4">
                        <CommitPayment
                            doctype="Direct Purchase"
                            docName={id || ""}
                            projectName={projectTitle}
                            budgetHeads={budgetHeads}
                            actualBalance={actualBalance}
                            commitableBalance={commitableBalance}
                            onCommitSuccess={() => loadData()}
                            onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
                        />
                    </div>
                )}

                </div>{/* end outer grid */}

                {id && <FloatingActivityLogButton doctype="Direct Purchase" docname={id} />}
                {id && data && (
                    <P11PrintModal
                        isOpen={isDpPrintOpen}
                        onClose={() => setIsDpPrintOpen(false)}
                        htmlContent={
                            isDpPrintOpen
                                ? generateDpHtml(
                                      data,
                                      activityLogContainerRef.current,
                                      detailsContainerRef.current
                                  )
                                : ""
                        }
                        docName={id}
                        title="Direct Purchase Preview"
                    />
                )}
                <P11PrintModal
                    isOpen={isPoPrintOpen}
                    onClose={() => setIsPoPrintOpen(false)}
                    htmlContent={
                        isPoPrintOpen && poSanctionData ? generatePOHtml(poSanctionData) : ""
                    }
                    docName={dpPoDocname || id || ""}
                    title="Purchase Order Preview"
                />
                <DirectPurchaseHelpGuide />
            </main>
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default DirectPurchaseDetails;
