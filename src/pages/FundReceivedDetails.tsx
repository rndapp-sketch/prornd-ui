import React, { useState, useCallback } from "react";
import { useSWRConfig } from "swr";
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
    MessageSquare,
    X,
    ChevronDown,
    ReceiptText,
    Landmark,
    BadgeCheck,
    ExternalLink,
    PencilLine,
    AlertTriangle,
    Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalLoader } from "@/components/ui/global-loader";
import { useUserRoleChecks } from "../components/UserRoleCheck";
import { FormRender } from "../components/FormRender";
import { useFrappeClientScript } from "../hooks/useFrappeClientScript";
import { useDepositSlipCalculations } from "../hooks/useDepositSlipCalculations";
import { useFrappeFetchFrom } from "../hooks/useFrappeFetchFrom";
import { HoSApprovalView } from "./HoSApprovalView";
import { ActivityLog } from "@/components/ActivityLog";
import ViewProjectButton from "@/components/ViewProjectButton";
import { getFileUrl } from "@/utils/fileUtils";
import { BudgetHeadName } from "@/components/BudgetHeadName";
import { ErrorModal } from "../components/ErrorModal";
import { parseFrappeError } from "../utils/errorUtils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Attachment helper ──────────────────────────────────────────────────────────
const TransactionAttachment = ({
    transactionName,
    fallbackFile,
}: {
    transactionName: string;
    fallbackFile?: string;
}) => {
    const { data } = useFrappeGetCall<{ message: any[] }>(
        "frappe.client.get_list",
        { doctype: "File", filters: { attached_to_name: transactionName }, fields: ["file_url", "file_name"], limit_page_length: 1 },
    );
    const file = data?.message?.[0];
    const rawUrl = file?.file_url || fallbackFile;
    const fileName = file?.file_name || "Attachment";
    if (!rawUrl) return <span className="text-[#A1A1AA]">—</span>;
    const resolvedUrl = getFileUrl(rawUrl);
    return (
        <a href={resolvedUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4A6CF7] hover:text-[#2563EB] transition-colors"
            title={fileName}>
            <ExternalLink className="h-3 w-3" />
            View
        </a>
    );
};

// ── Deposit slip type config ───────────────────────────────────────────────────
const DEPOSIT_SLIP_TYPES: Record<string, { label: string; getFields: string; save: string; submit: string; getWorkflowActions: string; performAction: string }> = {
    t_testing: { label: "T Testing Deposit Slip", getFields: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.get_t_testing_deposit_slip_fields", save: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.save_t_testing_deposit_slip", submit: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.submit_t_testing_deposit_slip", getWorkflowActions: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.get_t_testing_deposit_slip_workflow_actions", performAction: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.perform_t_testing_deposit_slip_workflow_action" },
    research_consultancy: { label: "Research Consultancy Deposit Slip", getFields: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.get_research_consultancy_deposit_slip_fields", save: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.save_research_consultancy_deposit_slip", submit: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.submit_research_consultancy_deposit_slip", getWorkflowActions: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.get_research_consultancy_deposit_slip_workflow_actions", performAction: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.perform_research_consultancy_deposit_slip_workflow_action" },
    other_event: { label: "Other Event Deposit Slip", getFields: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.get_other_event_deposit_slip_fields", save: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.save_other_event_deposit_slip", submit: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.submit_other_event_deposit_slip", getWorkflowActions: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.get_other_event_deposit_slip_workflow_actions", performAction: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.perform_other_event_deposit_slip_workflow_action" },
    e_non_routine: { label: "E Non Routine Deposit Slip", getFields: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.get_e_non_routine_deposit_slip_fields", save: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.save_e_non_routine_deposit_slip", submit: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.submit_e_non_routine_deposit_slip", getWorkflowActions: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.get_e_non_routine_deposit_slip_workflow_actions", performAction: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.perform_e_non_routine_deposit_slip_workflow_action" },
    d_consultancy: { label: "D Consultancy Deposit Slip", getFields: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.get_d_consultancy_deposit_slip_fields", save: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.save_d_consultancy_deposit_slip", submit: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.submit_d_consultancy_deposit_slip", getWorkflowActions: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.get_d_consultancy_deposit_slip_workflow_actions", performAction: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.perform_d_consultancy_deposit_slip_workflow_action" },
    research_deposit_slip: { label: "Research Deposit Slip", getFields: "rndopsapp.rndopsapp.doctype.research_deposit_slip.research_deposit_slip.get_research_deposit_slip_fields", save: "rndopsapp.rndopsapp.doctype.research_deposit_slip.research_deposit_slip.save_research_deposit_slip", submit: "rndopsapp.rndopsapp.doctype.research_deposit_slip.research_deposit_slip.submit_research_deposit_slip", getWorkflowActions: "rndopsapp.rndopsapp.doctype.research_deposit_slip.research_deposit_slip.get_research_deposit_slip_workflow_actions", performAction: "rndopsapp.rndopsapp.doctype.research_deposit_slip.research_deposit_slip.perform_research_deposit_slip_workflow_action" },
};

interface Field { fieldname: string; label: string | null; fieldtype: string; options?: string | null; mandatory: boolean; hidden: boolean; read_only: boolean; description?: string | null; default?: any; depends_on?: string | null; depends_on_eval?: string | null; fetch_from?: string }
interface LinkOption { value: string; label: string }
interface FormData { [key: string]: any }

// ── Static field definitions (fallback when backend method not yet implemented) ─
const DEPOSIT_SLIP_STATIC_FIELDS: Record<string, any[]> = {
    e_non_routine: [
        { fieldname: "project_title", label: "Project Title", fieldtype: "Link", options: "Project Registration", mandatory: true, read_only: false, hidden: false },
        { fieldname: "principal_investigator", label: "Principal Investigator", fieldtype: "Link", options: "User", mandatory: true, read_only: false, hidden: false },
        { fieldname: "client", label: "Client", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "funding_agency", label: "Funding Agency", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "gstin_of_funding_agency", label: "GSTIN of Funding Agency", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "ecs_ac_no", label: "ECS A/C No.", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "bank", label: "Bank", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "calculations_section", label: "Calculations", fieldtype: "Section Break" },
        { fieldname: "amount_inclusive_of_gst", label: "Amount Inclusive of GST", fieldtype: "Currency", mandatory: true, read_only: false, hidden: false },
        { fieldname: "income_tax_tds", label: "Income Tax TDS", fieldtype: "Currency", mandatory: false, read_only: false, hidden: false },
        { fieldname: "gst_tds_2", label: "GST TDS", fieldtype: "Currency", mandatory: false, read_only: false, hidden: false },
        { fieldname: "amount_actually_received", label: "Amount Actually Received", fieldtype: "Currency", mandatory: false, read_only: true, hidden: false, description: "Amount Inclusive of GST − Income Tax TDS − GST TDS" },
        { fieldname: "cgst_9", label: "CGST @9%", fieldtype: "Currency", mandatory: false, read_only: false, hidden: false },
        { fieldname: "sgst_9", label: "SGST @9%", fieldtype: "Currency", mandatory: false, read_only: false, hidden: false },
        { fieldname: "igst_18", label: "IGST @18%", fieldtype: "Currency", mandatory: false, read_only: false, hidden: false },
        { fieldname: "consultancy_fee_x", label: "Consultancy Fee X", fieldtype: "Currency", mandatory: false, read_only: true, hidden: false, description: "Amount Actually Received − GST (CGST+SGST or IGST)" },
        { fieldname: "overhead_multiplier", label: "Overhead Multiplier", fieldtype: "Float", mandatory: false, read_only: false, hidden: false, default: "0.3", description: "Default: 0.3 (30%)" },
        { fieldname: "overhead_amount", label: "Overhead Amount", fieldtype: "Currency", read_only: true, hidden: false, description: "Overhead Multiplier × Consultancy Fee X" },
        { fieldname: "credit_distribution_section", label: "Credit Distribution", fieldtype: "Section Break" },
        { fieldname: "credit_distribution", label: "Credit Distribution", fieldtype: "Table", read_only: false, hidden: false },
        { fieldname: "totals_section", label: "Totals", fieldtype: "Section Break" },
        { fieldname: "total_gst", label: "Total GST", fieldtype: "Currency", read_only: false, hidden: false },
        { fieldname: "total_budget", label: "Total Budget", fieldtype: "Currency", read_only: true, hidden: false },
    ],
    t_testing: [
        { fieldname: "project_title", label: "Project Title", fieldtype: "Link", options: "Project Registration", mandatory: true, read_only: false, hidden: false },
        { fieldname: "principal_investigator", label: "Principal Investigator", fieldtype: "Link", options: "User", mandatory: true, read_only: false, hidden: false },
        { fieldname: "client", label: "Client", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "gstin_of_funding_agency", label: "Funding Agency", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "ecs_ac_no", label: "ECS A/C No.", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "bank", label: "Bank", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "calculations_section", label: "Calculations", fieldtype: "Section Break" },
        { fieldname: "amount_inclusive_of_gst", label: "Amount Inclusive of GST", fieldtype: "Currency", mandatory: true, read_only: false, hidden: false },
        { fieldname: "cgst_9", label: "CGST @9%", fieldtype: "Currency", read_only: true, hidden: false },
        { fieldname: "sgst_9", label: "SGST @9%", fieldtype: "Currency", read_only: true, hidden: false },
        { fieldname: "consultancy_fee_x", label: "Consultancy Fee X", fieldtype: "Currency", read_only: true, hidden: false },
        { fieldname: "overhead_amount", label: "Overhead Amount", fieldtype: "Currency", read_only: true, hidden: false },
        { fieldname: "totals_section", label: "Totals", fieldtype: "Section Break" },
        { fieldname: "total_gst", label: "Total GST", fieldtype: "Currency", read_only: false, hidden: false },
        { fieldname: "total_budget", label: "Total Budget", fieldtype: "Currency", read_only: true, hidden: false },
    ],
    d_consultancy: [
        { fieldname: "primary_details", label: "Primary Details", fieldtype: "Section Break" },
        { fieldname: "consultancy_title", label: "Consultancy Title", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "category_d", label: "Category", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "principal_consultant", label: "Principal Consultant", fieldtype: "Link", options: "User", mandatory: false, read_only: false, hidden: false },
        { fieldname: "client", label: "Client", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "funding_agency", label: "Funding Agency", fieldtype: "Link", options: "fundingagency_", mandatory: false, read_only: false, hidden: false },
        { fieldname: "gstin_of_funding_agency", label: "GSTIN of Funding Agency", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "iitg_invoice_no", label: "IITG Invoice No.", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "bank", label: "Bank", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "ecs_ac_no", label: "ECS A/C No.", fieldtype: "Data", mandatory: false, read_only: false, hidden: false },
        { fieldname: "section_break_mqkq", label: "GST and Fee Calculations", fieldtype: "Section Break" },
        { fieldname: "amount_inclusive_of_gst", label: "Amount Inclusive of GST", fieldtype: "Currency", mandatory: false, read_only: false, hidden: false },
        { fieldname: "igst_18_on_consultancy", label: "IGST @18% on Consultancy Fee", fieldtype: "Currency", mandatory: false, read_only: false, hidden: false },
        { fieldname: "amount_after_gst_tds", label: "Amount after GST TDS @ 2%", fieldtype: "Currency", mandatory: false, read_only: false, hidden: false },
        { fieldname: "total_cost_x", label: "Total Cost X", fieldtype: "Currency", read_only: false, hidden: false, description: "Total Cost X (Balance after GST Deduction)" },
        { fieldname: "consultancy_charge_y", label: "Consultancy Charge (Y)", fieldtype: "Currency", mandatory: false, read_only: false, hidden: false },
        { fieldname: "operational_charge_z", label: "Operational Charge (Z)", fieldtype: "Currency", mandatory: false, read_only: false, hidden: false },
        { fieldname: "overhead_from_y_amount", label: "Overhead from Y (10% * Y) Amount", fieldtype: "Currency", read_only: true, hidden: false },
        { fieldname: "overhead_from_z_amount", label: "Overhead from Z (10% * Z) Amount", fieldtype: "Currency", read_only: true, hidden: false },
        { fieldname: "total_overhead_amount", label: "Total Overhead ((10% * Y) + (10% * Z)) Amount", fieldtype: "Currency", read_only: true, hidden: false },
        { fieldname: "institute_share_amount", label: "Institute Share (20% * Y) Amount", fieldtype: "Currency", read_only: true, hidden: false },
        { fieldname: "total_overhead_institute_share", label: "Overhead + Institute Share", fieldtype: "Currency", read_only: true, hidden: false },
        { fieldname: "credit_distribution_section", label: "Credit Distribution", fieldtype: "Section Break" },
        { fieldname: "idf_amount", label: "IDF", fieldtype: "Currency", read_only: false, hidden: false, description: "(40% of Overhead + Institute Share)" },
        { fieldname: "dpf_amount", label: "DPF/CE", fieldtype: "Currency", read_only: false, hidden: false, description: "(50% of Overhead + Institute Share)" },
        { fieldname: "staff_welfare_amount", label: "Staff welfare Amount", fieldtype: "Currency", read_only: false, hidden: false, description: "(5% of Overhead + Institute Share)" },
        { fieldname: "student_welfare_amount", label: "Student welfare Amount", fieldtype: "Currency", read_only: false, hidden: false, description: "(5% of Overhead + Institute Share)" },
        { fieldname: "final_totals", label: "Final Totals", fieldtype: "Section Break" },
        { fieldname: "balance_consultancy_fee", label: "Balance Consultancy Fee", fieldtype: "Currency", read_only: true, hidden: false },
        { fieldname: "balance_operation_charge", label: "Balance Operation Charge", fieldtype: "Currency", read_only: true, hidden: false },
        { fieldname: "total_gst", label: "Total GST", fieldtype: "Currency", read_only: false, hidden: false },
        { fieldname: "total_amount", label: "Total Amount", fieldtype: "Currency", read_only: true, hidden: false },
    ],
};

// ── Status badge ───────────────────────────────────────────────────────────────
const statusStyle = (state: string) => {
    const s = state?.toLowerCase() ?? "";
    if (s.includes("approved") || s.includes("received")) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
    if (s.includes("pending") || s.includes("review")) return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
    if (s.includes("reject") || s.includes("cancel")) return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400";
    if (s.includes("draft")) return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    if (s.includes("submitted") || s.includes("forward")) return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
    return "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400";
};

const StatusBadge = ({ state }: { state: string }) => (
    <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap", statusStyle(state))}>
        <span className={cn("w-[5px] h-[5px] rounded-full shrink-0",
            state?.toLowerCase().includes("approved") || state?.toLowerCase().includes("received") ? "bg-emerald-500" :
            state?.toLowerCase().includes("pending") ? "bg-amber-500" :
            state?.toLowerCase().includes("reject") ? "bg-red-500" :
            state?.toLowerCase().includes("submitted") ? "bg-blue-500" : "bg-violet-500"
        )} />
        {state}
    </span>
);

// ── Comment modal ──────────────────────────────────────────────────────────────
const CommentModal = ({ isOpen, onClose, onSubmit, action, isLoading }: { isOpen: boolean; onClose: () => void; onSubmit: (comment: string) => void; action: string; isLoading: boolean }) => {
    const [comment, setComment] = useState("");
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-2xl shadow-xl w-full max-w-md mx-4">
                <h3 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-1">Confirm Action</h3>
                <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mb-4">You are about to perform: <span className="font-bold text-[#D97757]">{action}</span></p>
                <textarea
                    className="w-full border-[1.5px] border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-3 rounded-lg text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] placeholder:text-[#A1A1AA] mb-4 resize-none focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 focus:border-[#4A6CF7] transition-colors"
                    rows={3}
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} disabled={isLoading} className="btn-neutral text-sm px-4 py-2 rounded-lg font-semibold">Cancel</button>
                    <button onClick={() => { onSubmit(comment); setComment(""); }} disabled={isLoading} className="btn-primary-accent text-sm px-4 py-2 rounded-lg font-semibold">
                        {isLoading ? "Processing…" : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── depends_on evaluator ───────────────────────────────────────────────────────
const evaluateDependsOn = (dependsOn: string | null | undefined, formData: FormData): boolean => {
    if (!dependsOn) return true;
    try {
        let expression = dependsOn.startsWith("eval:") ? dependsOn.substring(5) : dependsOn;
        const doc = formData;
        const equalityMatch = expression.match(/doc\.([\w_]+)\s*[==]+\s*['"]([^'"]*)['"]/);
        if (equalityMatch) return doc[equalityMatch[1]] === equalityMatch[2];
        const notEqualMatch = expression.match(/doc\.([\w_]+)\s*!==?\s*['"]([^'"]*)['"]/);
        if (notEqualMatch) return doc[notEqualMatch[1]] !== notEqualMatch[2];
        const includesMatch = expression.match(/doc\.([\w_]+)\.includes\(['"]([^'"]*)['"]\)/);
        if (includesMatch) { const v = doc[includesMatch[1]]; return typeof v === "string" && v.includes(includesMatch[2]); }
        return eval(expression);
    } catch { return true; }
};

// ── Workflow actions ───────────────────────────────────────────────────────────
interface FundReceivedWorkflowActionsProps {
    docname: string;
    onActionComplete: (result?: Record<string, any>) => void;
    onBeforeAction?: (action: string) => Promise<{ [key: string]: any } | null>;
    disabledCondition?: (action: string) => boolean;
}

const FundReceivedWorkflowActions = ({ docname, onActionComplete, onBeforeAction, disabledCondition }: FundReceivedWorkflowActionsProps) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_workflow_actions", { docname },
    );
    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.perform_fund_received_action",
    );
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");

    const handleActionClick = (action: string) => {
        if (disabledCondition && disabledCondition(action)) return;
        setSelectedAction(action); setModalOpen(true);
    };
    const handleConfirmAction = async (comment: string) => {
        try {
            let additionalArgs: { [key: string]: any } = {};
            if (onBeforeAction) {
                const result = await onBeforeAction(selectedAction);
                if (result === null) { setModalOpen(false); return; }
                additionalArgs = result;
            }
            const actionResult = await performAction({ docname, action: selectedAction, ...additionalArgs });
            if (comment?.trim()) {
                try { await addComment({ doctype: "Fund Received", docname, content: `[${selectedAction}] ${comment.trim()}` }); } catch {}
            }
            setModalOpen(false); onActionComplete(actionResult as Record<string, any> | undefined);
        } catch { alert("Failed to perform action. Please try again."); }
    };

    if (actionsLoading || !data?.message?.length) return null;

    if (data.message.length === 1) {
        const action = data.message[0];
        const isDisabled = disabledCondition ? disabledCondition(action) : false;
        return (
            <>
                <button onClick={() => handleActionClick(action)}
                    disabled={actionLoading || isDisabled}
                    className={cn("inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wide transition-all",
                        isDisabled ? "opacity-40 cursor-not-allowed bg-[#FAFAF9] dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A]"
                                   : "bg-[#D97757] hover:bg-[#c66a4e] text-white shadow-sm hover:shadow-md"
                    )}>
                    {action}
                </button>
                <CommentModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleConfirmAction} action={selectedAction} isLoading={actionLoading} />
            </>
        );
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wide transition-all bg-[#D97757] hover:bg-[#c66a4e] text-white shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed">
                        Actions
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {data.message.map((action) => {
                        const isDisabled = disabledCondition ? disabledCondition(action) : false;
                        return (
                            <DropdownMenuItem key={action} disabled={isDisabled}
                                onSelect={() => handleActionClick(action)}>
                                {action}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
            <CommentModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleConfirmAction} action={selectedAction} isLoading={actionLoading} />
        </>
    );
};

// ── Account Portal alert toast ──────────────────────────────────────────────────
interface AccountPortalAlertEntry { content: string; timestamp: string; label: string; }

function useAccountPortalAlert(docname?: string) {
    const [entry, setEntry] = useState<AccountPortalAlertEntry | null>(null);
    React.useEffect(() => {
        if (!docname) return;
        let cancelled = false;
        fetch(`/api/method/rndopsapp.rndopsapp.api.get_document_activity?doctype=Fund%20Received&docname=${encodeURIComponent(docname)}`,
            { credentials: "include" })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (cancelled || !json) return;
                const entries: any[] = Array.isArray(json?.message) ? json.message : [];
                // Only surface the alert while the most recent comment is the "[Put Back]" one —
                // once the document moves on (a newer comment/action is logged), it goes away.
                const latestComment = entries
                    .filter((e) => e.type === "comment")
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                if (!latestComment || !String(latestComment.content || "").toLowerCase().includes("[put back]")) {
                    setEntry(null);
                    return;
                }
                setEntry({ content: latestComment.content || "", timestamp: latestComment.timestamp, label: latestComment.label });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [docname]);
    return entry;
}

const AccountPortalToast = ({ entry, onDismiss, onOpen }: { entry: AccountPortalAlertEntry; onDismiss: () => void; onOpen: () => void }) => {
    return (
        <div className="fixed top-4 right-4 z-[9999] w-full max-w-sm animate-in slide-in-from-right-4 fade-in duration-300">
            <div onClick={onOpen} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
                className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl shadow-2xl overflow-hidden cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] transition-shadow">
                <div className="h-1 bg-[#D97757]" />
                <div className="p-4 flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 text-[#D97757]">
                        <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-0.5">Put Back</p>
                        <div className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: entry.content }} />
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                        className="p-1 rounded-lg hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] text-[#71717A] transition-colors flex-shrink-0">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── KPI mini card ──────────────────────────────────────────────────────────────
const KpiMini = ({ label, value, icon, accent }: { label: string; value: React.ReactNode; icon: React.ReactNode; accent: string }) => (
    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-5 relative overflow-hidden flex flex-col gap-3">
        <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full translate-x-4 translate-y-4 pointer-events-none" style={{ backgroundColor: accent, opacity: 0.07 }} />
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-0.5">{label}</p>
            <div className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">{value || "—"}</div>
        </div>
    </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const FundReceivedDetails = () => {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const prjreg_title = location.state?.prjreg_title;
    const routeSanctionName = location.state?.sanction_ref_no || "";
    const { isRndMiscellaneous, isRndStaff } = useUserRoleChecks();
    const { mutate: globalMutate } = useSWRConfig();
    const [optimisticWorkflowState, setOptimisticWorkflowState] = useState<string | null>(null);

    const [fields, setFields] = useState<Field[]>([]);
    const [formData, setFormData] = useState<FormData>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedDepositSlipType, setSelectedDepositSlipType] = useState<string>("");
    const [depositFormLoading, setDepositFormLoading] = useState(false);
    const [showActivityLog, setShowActivityLog] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [childTableMeta, setChildTableMeta] = useState<Record<string, any>>({});
    const prevProjectTitleRef = React.useRef<string>("");

    const [isEditMode, setIsEditMode] = useState(false);
    const [editBankAccount, setEditBankAccount] = useState("");
    const [editBreakup, setEditBreakup] = useState<any[]>([]);
    const [editTransactions, setEditTransactions] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });

    // Tab state — deposit slip tab appears once a linked slip is found
    const [activeTab, setActiveTab] = useState<"fund" | "deposit_slip">("fund");
    const [linkedDepositSlip, setLinkedDepositSlip] = useState<{ name: string; doctype: string } | null>(null);
    const [slipRefreshKey, setSlipRefreshKey] = useState(0);

    const { data: docData, isLoading: docLoading, error: docError, mutate: mutateDoc } = useFrappeGetDoc("Fund Received", name || "");

    // Find deposit slip linked to this Fund Received document across all deposit slip doctypes.
    // `fund_received_ref` on the deposit slip doctypes is a plain Data field, and depending on
    // when the record was created it may store either the Fund Received docname (e.g.
    // "REC_1007261745-prjreg_refnum") or the separate `fund_received_ref_number` value (e.g. "124") —
    // so both candidates must be checked. `fund_received_ref_number` is fetched directly here
    // (rather than relying on `docData`) so the search isn't gated behind that separate load.
    React.useEffect(() => {
        if (!name) return;
        const doctypes = [
            "Research Consultancy Deposit Slip", "D Consultancy Deposit Slip",
            "E Non Routine Deposit Slip", "T Testing Deposit Slip",
            "Other Event Deposit Slip", "Research Deposit Slip",
        ];
        let cancelled = false;
        (async () => {
            let refCandidates: string[] = [name];
            try {
                const frRes = await fetch(
                    `/api/v2/document/Fund%20Received/${encodeURIComponent(name)}?fields=["fund_received_ref_number"]`,
                    { credentials: "include" },
                );
                if (frRes.ok) {
                    const frJson = await frRes.json();
                    const refNo = frJson?.data?.fund_received_ref_number;
                    if (refNo) refCandidates = [...new Set([name, refNo])];
                }
            } catch {}
            if (cancelled) return;

            for (const doctype of doctypes) {
                try {
                    // Primary: POST-based get_list (reliable across all Frappe versions)
                    const res = await fetch("/api/method/frappe.client.get_list", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            doctype,
                            filters: [["fund_received_ref", "in", refCandidates]],
                            fields: ["name"],
                            limit_page_length: 1,
                            order_by: "creation desc",
                        }),
                    });
                    if (res.ok) {
                        const json = await res.json();
                        if (json.message?.length > 0) {
                            if (!cancelled) setLinkedDepositSlip({ name: json.message[0].name, doctype });
                            return;
                        }
                        continue;
                    }
                    // Fallback: v2 document list API (without fields param to avoid encoding issues)
                    const res2 = await fetch(
                        `/api/v2/document/${encodeURIComponent(doctype)}?filters=${encodeURIComponent(JSON.stringify([["fund_received_ref", "in", refCandidates]]))}&order_by=creation desc&limit_page_length=1`,
                        { credentials: "include" },
                    );
                    if (!res2.ok) continue;
                    const json2 = await res2.json();
                    if (json2.data?.length > 0) {
                        if (!cancelled) setLinkedDepositSlip({ name: json2.data[0].name, doctype });
                        return;
                    }
                } catch {}
            }

            // Trimmed-exact fallback: `fund_received_ref` is a plain Data field that's
            // sometimes hand-entered, so stray leading/trailing whitespace can make an
            // exact "in" match miss a real link — retry with each candidate trimmed.
            // Deliberately NOT a substring/wildcard match: that previously caused false
            // positives, linking documents whose fund_received_ref merely contained the
            // candidate as a substring rather than equaling it.
            const trimmedCandidates = [...new Set(refCandidates.map((c) => String(c).trim()).filter(Boolean))]
                .filter((c) => !refCandidates.includes(c));
            if (trimmedCandidates.length > 0) {
                for (const doctype of doctypes) {
                    try {
                        const res = await fetch("/api/method/frappe.client.get_list", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                                doctype,
                                filters: [["fund_received_ref", "in", trimmedCandidates]],
                                fields: ["name"],
                                limit_page_length: 1,
                                order_by: "creation desc",
                            }),
                        });
                        if (!res.ok) continue;
                        const json = await res.json();
                        if (json.message?.length > 0) {
                            if (!cancelled) setLinkedDepositSlip({ name: json.message[0].name, doctype });
                            return;
                        }
                    } catch {}
                }
            }

            if (!cancelled) setLinkedDepositSlip(null);
        })();
        return () => { cancelled = true; };
    }, [name, slipRefreshKey]);

    const effectivePrjregTitle = prjreg_title || docData?.prjreg_title;
    const { data: apiData, isLoading: listLoading, error: listError, mutate } = useFrappeGetCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
        effectivePrjregTitle ? { prjreg_title: effectivePrjregTitle, limit: 0, start: 0 } : undefined,
        effectivePrjregTitle || null,
    );
    const normalizeResponse = (raw: any) => {
        if (!raw) return [];
        if (raw.message?.message && Array.isArray(raw.message.message)) return raw.message.message;
        if (raw.message && Array.isArray(raw.message)) return raw.message;
        if (Array.isArray(raw)) return raw;
        return [];
    };
    const funds = normalizeResponse(apiData);
    const listData = funds.find((f: any) => f.name === name);
    const fundData = listData ? { ...docData, ...listData } : docData ?? null;
    const findChildSanctionName = (doc: any) => {
        const childTables = [doc?.fund_transactions, doc?.received_amt_breakup];
        for (const table of childTables) {
            const rowWithSanction = Array.isArray(table)
                ? table.find((row: any) => row?.sanction_ref_no)
                : null;
            if (rowWithSanction?.sanction_ref_no) return rowWithSanction.sanction_ref_no;
        }
        return "";
    };
    const savedSanctionName =
        fundData?.sanction_ref_no ||
        docData?.sanction_ref_no ||
        findChildSanctionName(fundData) ||
        findChildSanctionName(docData) ||
        routeSanctionName ||
        "";
    const { data: projectRegLookup } = useFrappeGetCall<{ message: any[] }>(
        "frappe.client.get_list",
        {
            doctype: "Project Registration",
            filters: { project_no: effectivePrjregTitle },
            fields: ["name"],
            limit_page_length: 1,
        },
        savedSanctionName || !effectivePrjregTitle ? null : `project-registration-for-${effectivePrjregTitle}`,
        { revalidateOnFocus: false },
    );
    const sanctionLookupProjectName = projectRegLookup?.message?.[0]?.name || effectivePrjregTitle;
    // Fund Received stores the selected sanction in sanction_ref_no. Prefer that exact
    // document name; project lookups are only a fallback for older/incomplete records.
    const { data: sanctionsForProject } = useFrappeGetCall<{ message: any[] }>(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project",
        { project_name: sanctionLookupProjectName },
        savedSanctionName ? null : sanctionLookupProjectName || null,
        { revalidateOnFocus: false },
    );
    const fallbackSanction = sanctionsForProject?.message?.[0];
    const sanctionName = savedSanctionName || fallbackSanction?.name || "";
    const { data: sanctionDoc } = useFrappeGetDoc(
        "Fund Sanction",
        sanctionName,
        sanctionName ? undefined : null,
        { revalidateOnFocus: false },
    );
    const sanctionDetails = sanctionDoc || fallbackSanction;
    const { data: budgetHeadsData } = useFrappeGetCall<{ message: { name: string; budget_head: string; id?: number | string }[] }>(
        "frappe.client.get_list",
        { doctype: "Budget Head", fields: ["name", "budget_head", "id"], limit_page_length: 0, order_by: "budget_head asc" },
        "budget-head-list",
        { revalidateOnFocus: false },
    );
    const budgetHeadOptions = budgetHeadsData?.message ?? [];
    const isLoading = docLoading || (effectivePrjregTitle ? listLoading : false);
    const error = docError || (effectivePrjregTitle ? listError : null);
    const showDepositSlip = isRndMiscellaneous && !optimisticWorkflowState && !linkedDepositSlip && (
        docData?.workflow_state === "Pending Misc. Staff Approval(Deposit Slip Pending)" ||
        listData?.workflow_state === "Pending Misc. Staff Approval(Deposit Slip Pending)"
    );

    const [clientScript, setClientScript] = useState<string>("");
    useFrappeClientScript(clientScript, formData, setFormData);
    useDepositSlipCalculations(formData, setFormData, selectedDepositSlipType);
    useFrappeFetchFrom(formData, setFormData, fields);

    React.useEffect(() => {
        if (fundData) {
            setEditBankAccount(fundData.bank_account || "");
            setEditBreakup(fundData.received_amt_breakup ? fundData.received_amt_breakup.map((r: any) => ({ ...r })) : []);
            setEditTransactions(fundData.fund_transactions ? fundData.fund_transactions.map((r: any) => ({ ...r })) : []);
        }
    // Use primitive fields so the effect only runs when the document actually changes,
    // not on every render (fundData is a new object reference each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fundData?.name, fundData?.modified]);

    const handleSaveEdits = async () => {
        setIsSaving(true);
        try {
            const docData: Record<string, any> = {
                bank_account: editBankAccount,
                fund_transactions: editTransactions.map((t: any) => ({
                    transaction_number: t.transaction_number || "",
                    transaction_date: t.date || t.transaction_date || "",
                    amount: t.amount ?? 0,
                    ...(t.file_name ? { file_name: t.file_name, file_data: t.file_data } : {}),
                })),
                received_amt_breakup: editBreakup.map((b: any) => ({
                    account_head: b.account_head || "",
                    amount_received: b.amount_received ?? 0,
                    budget_year_funds_receive: b.budget_year_funds_receive || "",
                    remarks: b.remarks || "",
                })),
            };

            const res = await fetch(
                "/api/method/rndopsapp.rndopsapp.doctype.fund_received.fund_received.update_fund_received",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        docname: name,
                        doc_data: JSON.stringify(docData),
                    }),
                }
            );
            const json = await res.json();
            if (json.exc) throw new Error(json.exc);
            if (json.message?.error) throw new Error(json.message.error);
            await mutate();
            setIsEditMode(false);
        } catch (err: any) {
            console.error("Failed to save Fund Received edits:", err);
            setErrorModal({ open: true, title: "Save Failed", message: parseFrappeError(err) });
        } finally {
            setIsSaving(false);
        }
    };

    const cancelEdits = () => {
        setIsEditMode(false);
        setEditBankAccount(fundData?.bank_account || "");
        setEditBreakup(fundData?.received_amt_breakup ? fundData.received_amt_breakup.map((r: any) => ({ ...r })) : []);
        setEditTransactions(fundData?.fund_transactions ? fundData.fund_transactions.map((r: any) => ({ ...r })) : []);
    };

    const handleFileSelect = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setEditTransactions(prev => {
                const r = [...prev];
                r[idx] = { ...r[idx], file_name: file.name, file_data: reader.result as string };
                return r;
            });
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const childFetchRef = React.useRef<Set<string>>(new Set());
    React.useEffect(() => {
        if (!childTableMeta || Object.keys(childTableMeta).length === 0) return;
        Object.entries(childTableMeta).forEach(([tableName, meta]: [string, any]) => {
            const rows = formData[tableName];
            if (!Array.isArray(rows)) return;
            const fetchFields = (meta.fields || []).filter((f: any) => f.fetch_from && f.fetch_from.includes("."));
            if (fetchFields.length === 0) return;
            rows.forEach((row: any, rowIndex: number) => {
                fetchFields.forEach((targetField: any) => {
                    const [sourceFieldName, sourceProperty] = targetField.fetch_from.split(".");
                    const sourceValue = row[sourceFieldName];
                    if (!sourceValue) return;
                    const rowId = row.id || row.name || rowIndex;
                    const fetchKey = `${tableName}:${rowId}:${targetField.fieldname}:${sourceValue}`;
                    if (childFetchRef.current.has(fetchKey)) return;
                    childFetchRef.current.add(fetchKey);
                    const sourceFieldDef = (meta.fields || []).find((f: any) => f.fieldname === sourceFieldName);
                    const doctype = sourceFieldDef?.options;
                    if (!doctype) return;
                    fetch("/api/method/frappe.client.get_value", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ doctype, filters: { name: sourceValue }, fieldname: [sourceProperty] }) })
                        .then(r => r.json()).then(data => {
                            if (data.message?.[sourceProperty] !== undefined) {
                                setFormData(prev => {
                                    const table = [...(prev[tableName] || [])];
                                    if (table[rowIndex]) table[rowIndex] = { ...table[rowIndex], [targetField.fieldname]: data.message[sourceProperty] };
                                    return { ...prev, [tableName]: table };
                                });
                            }
                        }).catch(() => {});
                });
            });
        });
    }, [formData, childTableMeta]);

    // Fetches a Project Registration doc and returns mapped auto-fill values.
    const autoFillFromProject = async (projectName: string): Promise<Partial<FormData>> => {
        try {
            const resp = await fetch("/api/method/frappe.client.get", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ doctype: "Project Registration", name: projectName }),
            });
            const result = await resp.json();
            const doc = result?.message;
            if (!doc) return {};
            const fills: Partial<FormData> = {};
            const pi = doc.principal_investigator || doc.pi_userid || doc.pi || doc.pi_name;
            if (pi) { fills.principal_investigator = pi; fills.principal_consultant = pi; }
            const fa = doc.funding_agency || doc.funding_agen || doc.fund_agen_initials || doc.sponsor;
            if (fa) fills.funding_agency = fa;
            if (doc.client || doc.client_name) fills.client = doc.client || doc.client_name;
            const gstin = doc.gstin_of_funding_agency || doc.gstin || doc.agency_gstin;
            if (gstin) fills.gstin_of_funding_agency = gstin;
            const title = doc.project_title || doc.title;
            if (title) fills.consultancy_title = title;
            if (doc.project_type) fills.category_d = doc.project_type;
            return fills;
        } catch {
            return {};
        }
    };

    // Wraps setFormData; triggers project auto-fill when project_title changes.
    const handleFormChange = useCallback(async (data: FormData) => {
        setFormData(data);
        const newTitle = data.project_title;
        if (newTitle && newTitle !== prevProjectTitleRef.current) {
            prevProjectTitleRef.current = newTitle;
            const fills = await autoFillFromProject(newTitle);
            if (Object.keys(fills).length > 0) {
                setFormData(prev => ({ ...prev, ...fills }));
            }
        } else if (!newTitle) {
            prevProjectTitleRef.current = "";
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDepositSlipTypeChange = async (type: string) => {
        setSelectedDepositSlipType(type); setFields([]); setFormData({}); setClientScript(""); setChildTableMeta({});
        prevProjectTitleRef.current = "";
        if (!type || !DEPOSIT_SLIP_TYPES[type]) return;
        setDepositFormLoading(true);
        console.log(`[DepositSlip] type selected: "${type}", getFields: ${DEPOSIT_SLIP_TYPES[type].getFields}`);

        // Step 1: try backend — extract what we can, silently ignore failures.
        let apiFields: any[] | undefined;
        let link_options: Record<string, any> = {};
        let prefill_data: any = null;
        let client_scripts: any[] | undefined;
        let related_data: any = null;

        try {
            const getFieldsUrl = `/api/method/${DEPOSIT_SLIP_TYPES[type].getFields}`;
            console.log(`[DepositSlip] fetching fields from: ${getFieldsUrl}`);
            const response = await fetch(getFieldsUrl, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ doc_name: name || undefined }) });
            console.log(`[DepositSlip] response status: ${response.status}`);
            const result = await response.json();
            console.log(`[DepositSlip] raw result:`, result);
            const messagePayload = result?.message;
            const payload = Array.isArray(messagePayload) ? { fields: messagePayload } : (messagePayload && typeof messagePayload === "object" ? messagePayload : null);
            console.log(`[DepositSlip] payload:`, payload);
            if (payload) {
                apiFields = payload.fields;
                link_options = payload.link_options || {};
                prefill_data = payload.prefill_data || null;
                client_scripts = payload.client_scripts;
                related_data = payload.related_data || null;
                if (payload.child_table_meta) setChildTableMeta(payload.child_table_meta);
                // Inject e_non_routine credit_distribution meta if backend doesn't return it
                if (type === "e_non_routine" && (!payload.child_table_meta || !payload.child_table_meta.credit_distribution)) {
                    setChildTableMeta(prev => ({
                        ...prev,
                        credit_distribution: {
                            fields: [
                                { fieldname: "label", label: "Account", fieldtype: "Data", read_only: false },
                                { fieldname: "percentage_of_overhead", label: "Percentage (%)", fieldtype: "Float", read_only: false },
                                { fieldname: "amount", label: "Amount", fieldtype: "Currency", read_only: true },
                            ],
                        },
                    }));
                }
                console.log(`[DepositSlip] apiFields from backend: ${apiFields?.length ?? 0} fields`);
            } else {
                console.log(`[DepositSlip] backend returned no usable payload — will use static fallback`);
            }
        } catch (err) {
            console.log(`[DepositSlip] backend fetch failed (will use static fallback):`, err);
        }

        // Step 2: resolve fields — backend wins, static fallback if backend returned nothing.
        const staticFields = DEPOSIT_SLIP_STATIC_FIELDS[type] || [];
        const resolvedFields: any[] = Array.isArray(apiFields) && apiFields.length > 0
            ? apiFields
            : staticFields;
        console.log(`[DepositSlip] resolvedFields: ${resolvedFields.length} fields (source: ${Array.isArray(apiFields) && apiFields.length > 0 ? "backend" : "static"})`);
        console.log(`[DepositSlip] DEPOSIT_SLIP_STATIC_FIELDS["${type}"] length: ${staticFields.length}`);

        if (resolvedFields.length > 0) {
            const processedFields = resolvedFields.map((field: any) => {
                if (field.fieldtype === "Section Break" || field.fieldtype === "SectionBreak") return field;
                return { ...field, mandatory: !!field.mandatory, hidden: !!field.hidden, read_only: !!field.read_only, ...(prefill_data && prefill_data[field.fieldname] !== undefined ? { default: prefill_data[field.fieldname] } : {}) };
            });
            console.log(`[DepositSlip] calling setFields with ${processedFields.length} fields`);
            setFields(processedFields);
            const initialData: FormData = {};
            processedFields.forEach((f: Field) => { if (f.default) initialData[f.fieldname] = f.default; });
            // Ensure e_non_routine defaults
            if (type === "e_non_routine" && !initialData.overhead_multiplier) {
                initialData.overhead_multiplier = 0.3;
            }

            // Step 3: auto-fill from project registration — type-aware field mapping.
            // Bank/ECS fill is unconditional (from the Fund Received doc itself).
            const bankAccount = docData?.bank_account || fundData?.bank_account;
            if (bankAccount) initialData.bank = bankAccount;
            const ecsAcNo = sanctionDetails?.ecs_ac_no || docData?.ecs_ac_no || fundData?.ecs_ac_no;
            if (ecsAcNo) initialData.ecs_ac_no = ecsAcNo;

            // prjregHint is the project_no value stored on the Fund Received doc.
            // In Frappe, Project Registration naming series often uses project_no as the name,
            // so we try frappe.client.get first (fastest), then fall back to get_list filters.
            // sanctionDetails is already loaded and may carry a project reference too.
            const prjregHint = related_data?.prjreg_title || docData?.prjreg_title || effectivePrjregTitle;
            // Also check sanction doc for a direct project registration reference
            const sanctionProjectRef = sanctionDetails?.prjreg_title || sanctionDetails?.project_registration
                || sanctionDetails?.project || sanctionDetails?.project_name;
            console.log(`[DepositSlip] prjregHint:`, prjregHint, `sanctionProjectRef:`, sanctionProjectRef);

            if (prjregHint || sanctionProjectRef) {
                const prjFields = ["name", "pi_userid", "project_no", "fund_agen_initials", "funding_agen",
                                   "principal_investigator", "client", "funding_agency", "gstin_of_funding_agency",
                                   "project_title", "title", "project_type"];
                let prjDoc: any = null;
                try {
                    // Attempt 1: frappe.client.get — works when project_no IS the doc name
                    if (prjregHint) {
                        const r0 = await fetch("/api/method/frappe.client.get", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ doctype: "Project Registration", name: prjregHint }) });
                        const j0 = await r0.json();
                        if (j0?.message && !j0.exc) prjDoc = j0.message;
                    }
                    // Attempt 2: frappe.client.get via sanction project reference
                    if (!prjDoc && sanctionProjectRef) {
                        const r0b = await fetch("/api/method/frappe.client.get", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ doctype: "Project Registration", name: sanctionProjectRef }) });
                        const j0b = await r0b.json();
                        if (j0b?.message && !j0b.exc) prjDoc = j0b.message;
                    }
                    // Attempt 3: get_list by project_no
                    if (!prjDoc && prjregHint) {
                        const r2 = await fetch("/api/method/frappe.client.get_list", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ doctype: "Project Registration", filters: { project_no: prjregHint }, fields: prjFields, limit_page_length: 1 }) });
                        const j2 = await r2.json();
                        if (j2?.message?.length > 0) prjDoc = j2.message[0];
                    }
                    // Attempt 4: get_list by project_no from sanction reference
                    if (!prjDoc && sanctionProjectRef) {
                        const r3 = await fetch("/api/method/frappe.client.get_list", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ doctype: "Project Registration", filters: { project_no: sanctionProjectRef }, fields: prjFields, limit_page_length: 1 }) });
                        const j3 = await r3.json();
                        if (j3?.message?.length > 0) prjDoc = j3.message[0];
                    }
                    console.log(`[DepositSlip] prjDoc fetched:`, prjDoc);
                    if (prjDoc) {
                        const pi = prjDoc.principal_investigator || prjDoc.pi_userid;
                        const fa = prjDoc.funding_agency || prjDoc.funding_agen || prjDoc.fund_agen_initials;
                        if (type === "d_consultancy") {
                            if (pi) initialData.principal_consultant = pi;
                            const projTitle = prjDoc.project_title || prjDoc.title;
                            if (projTitle) initialData.consultancy_title = projTitle;
                            if (prjDoc.project_type) initialData.category_d = prjDoc.project_type;
                        } else {
                            if (prjDoc.name) initialData.project_title = prjDoc.name;
                            if (pi) initialData.principal_investigator = pi;
                            if (prjDoc.project_no) initialData.project_no = prjDoc.project_no;
                            prevProjectTitleRef.current = prjDoc.name || "";
                        }
                        if (fa) initialData.funding_agency = fa;
                        if (prjDoc.client) initialData.client = prjDoc.client;
                        if (prjDoc.gstin_of_funding_agency) initialData.gstin_of_funding_agency = prjDoc.gstin_of_funding_agency;
                    }
                } catch (err) {
                    console.log(`[DepositSlip] prjDoc fetch failed:`, err);
                }
            }
            // Always stamp the current Fund Received doc name so all deposit slip
            // types (including the 4 that previously lacked the column) get the ref.
            if (name) initialData.fund_received_ref = name;
            setFormData(initialData);

            if (client_scripts && Array.isArray(client_scripts)) {
                let combinedScript = client_scripts.map((cs: any) => cs.script).join("\n\n");
                const _fixedFunction = `function calculate_deposit_slip(frm){let total_inclusive=flt(frm.doc.amount_inclusive_gst_capital);let multiplier=flt(frm.doc.overhead_multiplier)||15;if(total_inclusive>0){let project_balance=total_inclusive/1.18;let cgst=project_balance*0.09;let sgst=project_balance*0.09;let overhead_amount=project_balance*(multiplier/(100+multiplier));let project_amount=project_balance-overhead_amount;let idf_amt=overhead_amount*(40.0/100);let dpf_amt=overhead_amount*(25.0/100);let staff_amt=overhead_amount*(5.0/100);let student_amt=overhead_amount*(5.0/100);frm.set_value({'project_balance_after_gst':project_balance,'cgst_9':cgst,'sgst_9':sgst,'total_gst':cgst+sgst,'total_budget':total_inclusive,'overhead_amount':overhead_amount,'overhead_amount_label':'<b>Overhead Amount @ '+multiplier+'% (inclusive)</b>','prj_amount':project_amount,'idf_amount':flt(idf_amt,2),'dpf_cle_amount':flt(dpf_amt,2),'staff_welfare_amount':flt(staff_amt,2),'student_welfare_amount':flt(student_amt,2)}).then(()=>{distribute_pool_share(frm,overhead_amount);});}else{frm.set_value({'project_balance_after_gst':0,'cgst_9':0,'sgst_9':0,'total_gst':0,'total_budget':0,'overhead_amount':0,'overhead_amount_label':'','prj_amount':0,'idf_amount':0,'dpf_cle_amount':0,'staff_welfare_amount':0,'student_welfare_amount':0}).then(()=>{distribute_pool_share(frm,0);});}}`;
                combinedScript += "\n\n" + _fixedFunction;
                setClientScript(combinedScript);
            }
        }

        // Step 4: merge backend link_options and fetch any missing ones.
        setLinkOptions(prev => ({ ...prev, ...link_options }));
        const missingDoctypes = ["Department_prornd", "User", "Budget Head", "Project Registration"];
        for (const dt of missingDoctypes) {
            const alreadyLoaded = dt === "Project Registration"
                ? link_options?.["project_title"] || link_options?.["Project Registration"]
                : link_options?.[dt];
            if (!alreadyLoaded) {
                try {
                    const listResp = await fetch("/api/method/frappe.client.get_list", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ doctype: dt, fields: dt === "User" ? ["name", "full_name"] : dt === "Department_prornd" ? ["name", "dept_name"] : dt === "Project Registration" ? ["name", "project_title"] : ["*"], limit_page_length: 0 }) });
                    const listJson = await listResp.json();
                    if (listJson.message) {
                        const opts = listJson.message.map((d: any) => dt === "Project Registration" ? { label: d.project_title || d.name, value: d.name } : ({ label: d.dept_name || d.full_name || d.budget_head || d.head_name || d.account_head || d.title || d.name, value: d.name }));
                        setLinkOptions(prev => ({ ...prev, [dt]: opts, ...(dt === "User" ? { select_copi_id: opts, principal_investigator: opts, principal_consultant: opts } : {}), ...(dt === "Project Registration" ? { project_title: opts } : {}) }));
                    }
                } catch {}
            }
        }

        setDepositFormLoading(false);
    };

    const handleSaveDepositSlip = async () => {
        if (isSubmitting || !selectedDepositSlipType) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/method/${DEPOSIT_SLIP_TYPES[selectedDepositSlipType].save}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ doc_data: JSON.stringify({ ...formData }) }) });
            const result = await response.json();
            alert(result?.message?.name ? `Deposit Slip saved: ${result.message.name}` : "Deposit Slip saved successfully!");
            mutate();
        } catch (err: any) {
            console.error("Failed to save Deposit Slip:", err);
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(err) });
        } finally { setIsSubmitting(false); }
    };

    const handleBeforeAction = useCallback(async (action: string): Promise<{ [key: string]: any } | null> => {
        if ((action === "Forward" || action === "Generate Deposit Slip") && isRndMiscellaneous && !linkedDepositSlip) {
            return { deposit_slip_data: JSON.stringify(formData), deposit_slip_type: selectedDepositSlipType };
        }
        return {};
    }, [isRndMiscellaneous, formData, selectedDepositSlipType, linkedDepositSlip]);

    const accountPortalAlertEntry = useAccountPortalAlert(name);
    const [accountPortalAlertDismissed, setAccountPortalAlertDismissed] = useState(false);

    if (isLoading) return <GlobalLoader isLoading delay={0} />;

    if (error || !fundData) {
        return (
            <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] flex items-center justify-center p-8">
                <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-12 text-center max-w-md w-full">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-6 h-6 text-red-500" />
                    </div>
                    <h2 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-2">Fund Details Not Found</h2>
                    <p className="text-[13px] text-[#71717A] dark:text-[#A1A1AA] mb-6">The requested fund details could not be loaded.</p>
                    <button onClick={() => navigate(-1)} className="btn-neutral px-4 py-2 rounded-lg text-sm font-semibold">Go Back</button>
                </div>
            </div>
        );
    }

    const { workflow_state: rawWorkflowState, fund_received_amt, bank_account, received_amt_breakup, fund_transactions } = fundData;
    const workflow_state = optimisticWorkflowState || rawWorkflowState;

    const missingRequired = {
        bankAccount: !bank_account,
        budgetBreakup: !(received_amt_breakup?.length > 0),
        transactions: !(fund_transactions?.length > 0),
    };
    const hasMissingRequired = Object.values(missingRequired).some(Boolean);

    if (workflow_state === "Approved") {
        return (
            <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
                {accountPortalAlertEntry && !accountPortalAlertDismissed && name && (
                    <AccountPortalToast entry={accountPortalAlertEntry}
                        onDismiss={() => setAccountPortalAlertDismissed(true)}
                        onOpen={() => { setAccountPortalAlertDismissed(true); setShowActivityLog(true); }} />
                )}
                <main className="px-6 md:px-8 pt-7 pb-10">
                    <div className="mb-4 flex items-center gap-3 flex-wrap">
                        <FundReceivedWorkflowActions docname={name || ""} onActionComplete={(result) => { const s = result?.message?.workflow_state ?? result?.workflow_state; if (s) setOptimisticWorkflowState(s); globalMutate(() => true); mutateDoc(); mutate(); setSlipRefreshKey(k => k + 1); setActiveTab("deposit_slip"); }} onBeforeAction={handleBeforeAction} />
                    </div>
                    <HoSApprovalView fundReceivedName={name || ""} />
                </main>

                {showActivityLog && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setShowActivityLog(false)} />
                        <div className="relative w-full max-w-md bg-white dark:bg-[#27272A] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-md bg-[#EEF2FF] flex items-center justify-center text-[#4A6CF7]"><MessageSquare className="h-3.5 w-3.5" /></div>
                                    <h3 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Activity Log</h3>
                                </div>
                                <button onClick={() => setShowActivityLog(false)} className="p-1.5 rounded-lg hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] text-[#71717A] transition-colors"><X className="h-4 w-4" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 bg-[#FAFAF9] dark:bg-[#18181B]">
                                {name && <ActivityLog doctype="Fund Received" docname={name} maxHeight="100%" />}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }


    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans text-[#3F3F46] dark:text-[#E4E4E7]">
            {accountPortalAlertEntry && !accountPortalAlertDismissed && name && (
                <AccountPortalToast entry={accountPortalAlertEntry}
                    onDismiss={() => setAccountPortalAlertDismissed(true)}
                    onOpen={() => { setAccountPortalAlertDismissed(true); setShowActivityLog(true); }} />
            )}
            <GlobalLoader isLoading={isSubmitting} />

            <main className="px-6 md:px-8 pt-7 pb-16">

                {/* ── Page Header + KPI strip hidden when printing from Deposit Slip tab ── */}
                <div className={activeTab === "deposit_slip" ? "deposit-slip-non-print" : undefined}>
                <header className="mb-5 overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="flex items-start justify-between gap-4 px-5 py-4 flex-wrap">
                        {/* Left: back + title */}
                        <div className="flex items-start gap-3 min-w-0">
                            <button onClick={() => navigate(-1)}
                                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#D97757] hover:border-[#D97757]/30 hover:bg-[#D97757]/10 transition-colors">
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">Fund Received</span>
                                    <StatusBadge state={workflow_state || "—"} />
                                </div>
                                <h1 className="font-sans text-[18px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                    Fund Details & Deposit Slip
                                </h1>
                                <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA] font-mono">{name}</p>
                            </div>
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {fundData?.workflow_state === "Draft" && (
                                <button onClick={() => navigate(`/add-fund-received/${fundData.prjreg_title}?id=${name}`)}
                                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#4A6CF7] hover:border-[#4A6CF7]/30 hover:bg-[#EEF2FF] text-[11px] font-bold uppercase tracking-wide transition-colors">
                                    <PencilLine className="h-3 w-3" /> Edit
                                </button>
                            )}
                            {isRndStaff && !showDepositSlip && workflow_state === "Pending Misc. Staff Approval" && (
                                isEditMode ? (
                                    <>
                                        <button onClick={cancelEdits} disabled={isSaving}
                                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#3F3F46] text-[11px] font-bold uppercase tracking-wide transition-colors">
                                            Cancel
                                        </button>
                                        <button onClick={handleSaveEdits} disabled={isSaving}
                                            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-[#4A6CF7] hover:bg-[#3B5CE6] text-white text-[11px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50">
                                            {isSaving ? "Saving…" : "Save Changes"}
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => setIsEditMode(true)}
                                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#4A6CF7] hover:border-[#4A6CF7]/30 hover:bg-[#EEF2FF] text-[11px] font-bold uppercase tracking-wide transition-colors">
                                        <PencilLine className="h-3 w-3" /> Edit Fields
                                    </button>
                                )
                            )}
                            <ViewProjectButton doctype="Fund Received" data={fundData} />
                            <FundReceivedWorkflowActions
                                docname={name || ""}
                                onActionComplete={(result) => { const s = result?.message?.workflow_state ?? result?.workflow_state; if (s) setOptimisticWorkflowState(s); globalMutate(() => true); mutateDoc(); mutate(); setSlipRefreshKey(k => k + 1); setActiveTab("deposit_slip"); }}
                                onBeforeAction={handleBeforeAction}
                                disabledCondition={(action) => {
                                    if (action === "Put Back") return false;
                                    if (action === "Forward" && hasMissingRequired) return true;
                                    if (action === "Generate Deposit Slip") {
                                        if (!showDepositSlip || !selectedDepositSlipType) return true;
                                        return fields.filter(f => f.mandatory && !f.hidden).some(f => { const v = formData[f.fieldname]; return v === undefined || v === null || v === ""; });
                                    }
                                    return false;
                                }}
                            />
                        </div>
                    </div>
                </header>

                {/* ── KPI strip ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    <KpiMini label="Total Amount" icon={<IndianRupee className="h-4 w-4" />} accent="#D97757"
                        value={fund_received_amt != null ? fund_received_amt.toLocaleString("en-IN", { style: "currency", currency: "INR" }) : "—"} />
                    <KpiMini label="Bank Account" icon={<Landmark className="h-4 w-4" />} accent="#4A6CF7"
                        value={isRndStaff && isEditMode
                            ? <input value={editBankAccount} onChange={e => setEditBankAccount(e.target.value)}
                                className="w-full bg-transparent border-b-2 border-[#4A6CF7] text-[14px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] outline-none py-0.5"
                                placeholder="Bank account…" />
                            : <span className="text-[13px]">{bank_account || "—"}</span>
                        } />
                    <KpiMini label="Sanction Ref" icon={<Calculator className="h-4 w-4" />} accent="#10B981"
                        value={<span className="text-[13px] font-mono">{sanctionName || "—"}</span>} />
                    <KpiMini label="Transactions" icon={<CreditCard className="h-4 w-4" />} accent="#8B5CF6"
                        value={fund_transactions?.length ?? 0} />
                </div>

                {/* ── Tab bar — shown when a linked deposit slip exists ── */}
                {linkedDepositSlip && (
                    <div className="flex gap-0 mb-5 border-b-2 border-[#E4E4E7] dark:border-[#3F3F46]">
                        <button
                            onClick={() => setActiveTab("fund")}
                            className={`px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-widest border-b-2 -mb-[2px] transition-colors ${
                                activeTab === "fund"
                                    ? "border-[#4A6CF7] text-[#4A6CF7]"
                                    : "border-transparent text-[#71717A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]"
                            }`}
                        >
                            Fund Details
                        </button>
                        <button
                            onClick={() => setActiveTab("deposit_slip")}
                            className={`px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-widest border-b-2 -mb-[2px] transition-colors ${
                                activeTab === "deposit_slip"
                                    ? "border-[#D97757] text-[#D97757]"
                                    : "border-transparent text-[#71717A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]"
                            }`}
                        >
                            Deposit Slip
                        </button>
                    </div>
                )}

                </div> {/* end deposit-slip-non-print wrapper */}

                {/* ── Deposit Slip tab content ── */}
                {activeTab === "deposit_slip" && linkedDepositSlip && (
                    <HoSApprovalView fundReceivedName={name || ""} />
                )}

                {/* ── Fund Details tab content (always rendered when tab = "fund") ── */}
                {activeTab === "fund" && <>

                {/* ── Section separator ── */}
                <div className="border-t-2 border-[#4A6CF7]/35 dark:border-[#818CF8]/35 pt-4 mb-4" />

                {/* ── Mandatory fields validation banner ── */}
                {hasMissingRequired && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/25 px-4 py-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400 mb-1">
                                Submission blocked — required fields are missing
                            </p>
                            <ul className="text-[11px] text-amber-600 dark:text-amber-500 list-disc list-inside space-y-0.5">
                                {missingRequired.bankAccount && <li>Bank Account Number / Scheme</li>}
                                {missingRequired.budgetBreakup && <li>Budget Breakup — at least one row required</li>}
                                {missingRequired.transactions && <li>Transaction Details — at least one row required</li>}
                            </ul>
                        </div>
                    </div>
                )}

                {/* ── Deposit Slip Form (when applicable) ── */}
                {showDepositSlip && (
                    <div className="mb-6 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden shadow-sm">
                        {/* Panel header */}
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                            <div className="w-7 h-7 rounded-md flex items-center justify-center bg-[#FFF7ED] dark:bg-[#D97757]/20 text-[#D97757]">
                                <FileText className="w-3.5 h-3.5" />
                            </div>
                            <h3 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Deposit Slip Form</h3>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Type selector */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                                    Select Deposit Slip Type <span className="text-red-500 normal-case font-bold">*</span>
                                </label>
                                <div className="relative">
                                    <select value={selectedDepositSlipType} onChange={e => handleDepositSlipTypeChange(e.target.value)}
                                        className="design-input pr-10 appearance-none cursor-pointer">
                                        <option value="">— Select Type —</option>
                                        {Object.entries(DEPOSIT_SLIP_TYPES).map(([key, cfg]) => (
                                            <option key={key} value={key}>{cfg.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A1A1AA] pointer-events-none" />
                                </div>
                            </div>

                            {depositFormLoading && (
                                <div className="flex flex-col items-center gap-2 py-10 text-[#71717A]">
                                    <div className="w-8 h-8 rounded-full border-2 border-[#E4E4E7] border-t-[#4A6CF7] animate-spin" />
                                    <p className="text-[12px] font-semibold">Loading form fields…</p>
                                </div>
                            )}

                            {!depositFormLoading && !selectedDepositSlipType && (
                                <div className="py-10 text-center text-[13px] text-[#A1A1AA]">
                                    Select a deposit slip type above to load the form.
                                </div>
                            )}

                            {!depositFormLoading && selectedDepositSlipType && fields.length === 0 && (
                                <div className="py-10 text-center text-[13px] text-amber-600 font-semibold">
                                    No form fields found for this type.
                                </div>
                            )}

                            {!depositFormLoading && selectedDepositSlipType && fields.length > 0 && (
                                <FormRender
                                    fields={fields.map(f => ({ ...f, hidden: !!f.hidden || !evaluateDependsOn(f.depends_on || f.depends_on_eval, formData) }))}
                                    linkOptions={linkOptions}
                                    sections={(() => {
                                        const processed: any[] = [];
                                        let currentSection: any = { title: "", fields: [], type: "default" };
                                        fields.forEach(field => {
                                            const isVisible = evaluateDependsOn(field.depends_on || field.depends_on_eval, formData);
                                            if (field.fieldtype === "Section Break" || field.fieldtype === "SectionBreak") {
                                                if (currentSection?.fields.length > 0) processed.push(currentSection);
                                                currentSection = isVisible ? { title: field.label || "", fields: [], type: "default" } : null;
                                            } else if (field.fieldtype === "Table") {
                                                if (currentSection?.fields.length > 0) { processed.push(currentSection); currentSection = { title: "", fields: [], type: "default" }; }
                                                if (isVisible) {
                                                    const meta = childTableMeta[field.fieldname];
                                                    let tableConfig: any = null;
                                                    if (meta?.fields) {
                                                        const columns = meta.fields.filter((f: any) => !["Section Break","Column Break","SectionBreak","ColumnBreak"].includes(f.fieldtype)).map((f: any) => {
                                                            let opts: any[] = [], type = f.fieldtype, combineEmailInValue = false;
                                                            if (f.fieldname === "select_copi_id") { opts = linkOptions["select_copi_id"] || linkOptions["principal_investigator"] || linkOptions["User"] || []; type = "UserAutocomplete"; }
                                                            if (f.fieldname === "label" && meta.doctype === "Deposit Slip Credit Distribution") { opts = linkOptions["label"] || linkOptions["User"] || []; type = "UserAutocomplete"; combineEmailInValue = true; }
                                                            if (["account_head","budget_head","head"].includes(f.fieldname)) { opts = linkOptions["Budget Head"] || linkOptions["budget_head"] || []; if (opts.length > 0) type = "Link"; }
                                                            if (opts.length === 0) { if (f.fieldtype === "Select" && typeof f.options === "string") opts = f.options.split("\n").filter((o: string) => o.trim()).map((o: string) => ({ label: o, value: o })); else if (f.options) opts = linkOptions[f.fieldname] || linkOptions[f.options] || []; }
                                                            return { key: f.fieldname, label: f.label || f.fieldname, type, options: opts, combineEmailInValue };
                                                        });
                                                        const newRowTemplate: Record<string, any> = { doctype: meta.doctype, name: `new-${Date.now()}` };
                                                        meta.fields.forEach((f: any) => {
                                                            const skipDefault = f.fieldname === "label" && meta.doctype === "Deposit Slip Credit Distribution";
                                                            newRowTemplate[f.fieldname] = skipDefault ? "" : (f.default ?? (["Currency","Float","Int"].includes(f.fieldtype) ? 0 : ""));
                                                        });
                                                        tableConfig = { fieldname: field.fieldname, columns, newRowTemplate };
                                                    } else { tableConfig = { fieldname: field.fieldname, columns: [{ key: "name", label: "Name", type: "Data" }], newRowTemplate: {} }; }
                                                    processed.push({ title: field.label, fields: [], type: "table", tableConfig });
                                                }
                                            } else if (field.fieldtype !== "Column Break" && field.fieldtype !== "ColumnBreak") {
                                                if (currentSection) currentSection.fields.push(field.fieldname);
                                            }
                                        });
                                        if (currentSection?.fields.length > 0) processed.push(currentSection);
                                        return processed;
                                    })()}
                                    initialData={formData}
                                    onSubmit={handleSaveDepositSlip}
                                    onFormChange={handleFormChange}
                                    onCancel={() => setSelectedDepositSlipType("")}
                                    submitButtonText="Save Deposit Slip"
                                    isSubmitting={isSubmitting}
                                    noCard
                                    hideActions={true}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* ── Main content: stacked sections ── */}
                {!showDepositSlip && (
                    <div className="space-y-4">

                        {/* ── Budget Breakup ── */}
                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden shadow-sm">
                            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                                <div className="w-7 h-7 rounded-md bg-[#EEF2FF] flex items-center justify-center text-[#4A6CF7]">
                                    <ReceiptText className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Budget Breakup</h3>
                                {(isRndStaff && isEditMode ? editBreakup : received_amt_breakup)?.length > 0 && (
                                    <span className="ml-auto text-[11px] font-bold text-[#4A6CF7] bg-[#EEF2FF] dark:bg-[#4A6CF7]/15 dark:text-[#818CF8] px-2 py-0.5 rounded-md">
                                        {(isRndStaff && isEditMode ? editBreakup : received_amt_breakup).length} {(isRndStaff && isEditMode ? editBreakup : received_amt_breakup).length === 1 ? "item" : "items"}
                                    </span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Account Head</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Amount</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Remarks</th>
                                            {isRndStaff && isEditMode && <th className="px-4 py-3 w-10" />}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46] bg-white dark:bg-[#27272A]">
                                        {isRndStaff && isEditMode ? (
                                            <>
                                                {editBreakup.map((item: any, idx: number) => (
                                                    <tr key={item.name || idx} className="bg-[#FAFAF9] dark:bg-[#18181B]">
                                                        <td className="px-3 py-2 border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                            <select
                                                                value={item.account_head || ""}
                                                                onChange={e => { const r = [...editBreakup]; r[idx] = { ...r[idx], account_head: e.target.value }; setEditBreakup(r); }}
                                                                className="w-full bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-md px-2 py-1.5 text-[12px] text-[#3F3F46] dark:text-[#D4D4D8] outline-none focus:border-[#4A6CF7] transition-colors appearance-none cursor-pointer"
                                                            >
                                                                <option value="">— Select Account Head —</option>
                                                                {budgetHeadOptions.map(bh => (
                                                                    <option key={bh.name} value={bh.name}>{bh.budget_head}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-3 py-2 border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                            <input type="number" value={item.amount_received ?? ""} onChange={e => { const r = [...editBreakup]; r[idx] = { ...r[idx], amount_received: parseFloat(e.target.value) || 0 }; setEditBreakup(r); }}
                                                                className="w-full bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-md px-2 py-1.5 text-[12px] text-right font-bold text-[#D97757] outline-none focus:border-[#4A6CF7] transition-colors" placeholder="0" />
                                                        </td>
                                                        <td className="px-3 py-2 border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                            <input value={item.remarks || ""} onChange={e => { const r = [...editBreakup]; r[idx] = { ...r[idx], remarks: e.target.value }; setEditBreakup(r); }}
                                                                className="w-full bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-md px-2 py-1.5 text-[12px] text-[#71717A] dark:text-[#A1A1AA] outline-none focus:border-[#4A6CF7] transition-colors" placeholder="Remarks…" />
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <button onClick={() => setEditBreakup(editBreakup.filter((_, i) => i !== idx))}
                                                                className="p-1 rounded text-[#71717A] hover:text-red-500 hover:bg-red-50 transition-colors">
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-2">
                                                        <button onClick={() => setEditBreakup([...editBreakup, { doctype: "Received Amt Breakup", account_head: "", amount_received: 0, remarks: "", name: `new-${Date.now()}` }])}
                                                            className="text-[11px] font-bold text-[#4A6CF7] hover:text-[#3B5CE6] uppercase tracking-wide transition-colors">
                                                            + Add Row
                                                        </button>
                                                    </td>
                                                </tr>
                                            </>
                                        ) : received_amt_breakup?.length > 0 ? received_amt_breakup.map((item: any, idx: number) => (
                                            <tr key={item.name || idx} className="hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]/40 transition-colors">
                                                <td className="px-4 py-3 text-[13px] text-[#3F3F46] dark:text-[#D4D4D8] border-r border-[#F4F4F5] dark:border-[#3F3F46]/80"><BudgetHeadName value={item.account_head} options={budgetHeadOptions} /></td>
                                                <td className="px-4 py-3 text-[13px] text-right font-bold text-[#D97757] border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">{item.amount_received?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td>
                                                <td className="px-4 py-3 text-[13px] text-[#71717A] dark:text-[#A1A1AA]">{item.remarks || "—"}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={3} className="px-4 py-10 text-center text-[13px] text-[#A1A1AA]">No breakup details available.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── Transactions ── */}
                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden shadow-sm">
                            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                                <div className="w-7 h-7 rounded-md bg-[#FFF7ED] flex items-center justify-center text-[#D97757]">
                                    <CreditCard className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Transactions</h3>
                                {(isRndStaff && isEditMode ? editTransactions : fund_transactions)?.length > 0 && (
                                    <span className="ml-auto text-[11px] font-bold text-[#D97757] bg-[#FFF7ED] dark:bg-[#D97757]/15 px-2 py-0.5 rounded-md">
                                        {(isRndStaff && isEditMode ? editTransactions : fund_transactions).length} {(isRndStaff && isEditMode ? editTransactions : fund_transactions).length === 1 ? "entry" : "entries"}
                                    </span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Date</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Transaction No.</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Amount</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Attachment</th>
                                            {isRndStaff && isEditMode && <th className="px-4 py-3 w-10" />}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46] bg-white dark:bg-[#27272A]">
                                        {isRndStaff && isEditMode ? (
                                            <>
                                                {editTransactions.map((item: any, idx: number) => (
                                                    <tr key={item.name || idx} className="bg-[#FAFAF9] dark:bg-[#18181B]">
                                                        <td className="px-3 py-2 border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                            <input type="date" value={item.date || item.transaction_date || ""} onChange={e => { const r = [...editTransactions]; r[idx] = { ...r[idx], date: e.target.value }; setEditTransactions(r); }}
                                                                className="w-full bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-md px-2 py-1.5 text-[12px] font-mono text-[#3F3F46] dark:text-[#D4D4D8] outline-none focus:border-[#4A6CF7] transition-colors" />
                                                        </td>
                                                        <td className="px-3 py-2 border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                            <input value={item.transaction_number || ""} onChange={e => { const r = [...editTransactions]; r[idx] = { ...r[idx], transaction_number: e.target.value }; setEditTransactions(r); }}
                                                                className="w-full bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-md px-2 py-1.5 text-[12px] font-bold text-[#3F3F46] dark:text-[#D4D4D8] outline-none focus:border-[#4A6CF7] transition-colors" placeholder="Transaction no…" />
                                                        </td>
                                                        <td className="px-3 py-2 border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                            <input type="number" value={item.amount ?? ""} onChange={e => { const r = [...editTransactions]; r[idx] = { ...r[idx], amount: parseFloat(e.target.value) || 0 }; setEditTransactions(r); }}
                                                                className="w-full bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-md px-2 py-1.5 text-[12px] text-right font-bold text-[#D97757] outline-none focus:border-[#4A6CF7] transition-colors" placeholder="0" />
                                                        </td>
                                                        <td className="px-3 py-2 border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                            {item.file_name ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Paperclip className="h-3 w-3 text-[#4A6CF7] shrink-0" />
                                                                    <span className="text-[11px] text-[#4A6CF7] font-semibold truncate max-w-[110px]" title={item.file_name}>{item.file_name}</span>
                                                                    <button onClick={() => { const r = [...editTransactions]; r[idx] = { ...r[idx], file_name: undefined, file_data: undefined }; setEditTransactions(r); }}
                                                                        className="p-0.5 rounded text-[#71717A] hover:text-red-500 transition-colors shrink-0">
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-start gap-1">
                                                                    <TransactionAttachment transactionName={item.name} fallbackFile={item.attachment || item.file} />
                                                                    <label className="inline-flex items-center gap-1 cursor-pointer text-[10px] font-bold text-[#4A6CF7] hover:text-[#3B5CE6] uppercase tracking-wide transition-colors">
                                                                        <Paperclip className="h-3 w-3" />
                                                                        {item.attachment || item.file ? "Replace" : "Upload"}
                                                                        <input type="file" className="hidden" onChange={e => handleFileSelect(idx, e)} />
                                                                    </label>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <button onClick={() => setEditTransactions(editTransactions.filter((_, i) => i !== idx))}
                                                                className="p-1 rounded text-[#71717A] hover:text-red-500 hover:bg-red-50 transition-colors">
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-2">
                                                        <button onClick={() => setEditTransactions([...editTransactions, { doctype: "Fund Transactions", date: "", transaction_number: "", amount: 0, name: `new-${Date.now()}` }])}
                                                            className="text-[11px] font-bold text-[#D97757] hover:text-[#c66a4e] uppercase tracking-wide transition-colors">
                                                            + Add Row
                                                        </button>
                                                    </td>
                                                </tr>
                                            </>
                                        ) : fund_transactions?.length > 0 ? fund_transactions.map((item: any, idx: number) => (
                                            <tr key={item.name || idx} className="hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]/40 transition-colors">
                                                <td className="px-4 py-3 text-[13px] font-mono text-[#3F3F46] dark:text-[#D4D4D8] border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">{item.date || item.transaction_date || "—"}</td>
                                                <td className="px-4 py-3 text-[13px] font-bold text-[#3F3F46] dark:text-[#D4D4D8] border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">{item.transaction_number || "—"}</td>
                                                <td className="px-4 py-3 text-[13px] text-right font-bold text-[#D97757] border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">{item.amount?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td>
                                                <td className="px-4 py-3 text-center"><TransactionAttachment transactionName={item.name} fallbackFile={item.attachment || item.file} /></td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={4} className="px-4 py-10 text-center text-[13px] text-[#A1A1AA]">No transactions recorded.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── Sanction Details ── */}
                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden shadow-sm">
                            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                                <div className="w-7 h-7 rounded-md bg-[#ECFDF5] flex items-center justify-center text-emerald-600">
                                    <BadgeCheck className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Sanction Details</h3>
                                {sanctionName && (
                                    <span className="ml-auto text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-[#ECFDF5] dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg">
                                        {sanctionName}
                                    </span>
                                )}
                            </div>
                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-12">
                                {[
                                    { label: "Sanction Reference No.", value: sanctionName },
                                    { label: "Sanction Letter No.", value: sanctionDetails?.sanctioned_letter_no || sanctionDetails?.sanction_letter_no },
                                    { label: "Sanction Date", value: sanctionDetails?.sanctioned_letter_date || sanctionDetails?.sanction_date },
                                    { label: "Total Sanctioned Amount", value: sanctionDetails?.total_sanctioned_amount != null ? sanctionDetails.total_sanctioned_amount.toLocaleString("en-IN", { style: "currency", currency: "INR" }) : null },
                                    { label: "Workflow Status", value: sanctionDetails?.sanction_workflow_status || sanctionDetails?.workflow_state },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex items-start justify-between gap-4 py-3 border-b border-[#F4F4F5] dark:border-[#3F3F46] last:border-0">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] shrink-0">{label}</span>
                                        <span className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] text-right">
                                            {label === "Workflow Status" && value ? <StatusBadge state={value} /> : (value || "—")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

                {/* ── Floating: Summary (when deposit slip is shown) ── */}
                {showDepositSlip && (
                    <button onClick={() => setShowSummary(true)}
                        className="fixed bottom-[86px] right-7 z-40 flex h-11 items-center gap-2 rounded-full border border-[#D97757]/30 bg-white/95 dark:bg-[#27272A]/95 px-3.5 text-[#D97757] dark:text-[#FDBA74] shadow-lg backdrop-blur hover:-translate-y-0.5 hover:border-[#D97757]/50 hover:bg-[#FFF7ED] dark:border-[#D97757]/35 transition-all">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#D97757] text-white shadow-sm">
                            <IndianRupee className="h-4 w-4" />
                        </span>
                        <span className="text-[12px] font-extrabold uppercase tracking-wide hidden md:block">Summary</span>
                    </button>
                )}

                {/* ── Floating: Activity Log ── */}
                <button onClick={() => setShowActivityLog(true)}
                    className="fixed bottom-8 right-7 z-40 flex h-11 items-center gap-2 rounded-full border border-[#4A6CF7]/30 bg-white/95 dark:bg-[#27272A]/95 px-3.5 text-[#1E3A8A] dark:text-[#C7D2FE] shadow-lg backdrop-blur hover:-translate-y-0.5 hover:border-[#4A6CF7]/50 hover:bg-[#EEF2FF] dark:border-[#4A6CF7]/35 transition-all">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4A6CF7] text-white shadow-sm">
                        <MessageSquare className="h-4 w-4" />
                    </span>
                    <span className="text-[12px] font-extrabold uppercase tracking-wide hidden md:block">Activity Log</span>
                </button>

                </> /* end Fund Details tab */}
            </main>

            {/* ── Summary slide-over ── */}
            {showSummary && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setShowSummary(false)} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-[#27272A] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-md bg-[#FFF7ED] flex items-center justify-center text-[#D97757]"><IndianRupee className="h-3.5 w-3.5" /></div>
                                <h3 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Fund Summary</h3>
                            </div>
                            <button onClick={() => setShowSummary(false)} className="p-1.5 rounded-lg hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] text-[#71717A] transition-colors"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FAFAF9] dark:bg-[#18181B]">
                            {/* KPI recap */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl p-4">
                                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#71717A] mb-1">Total Amount</p>
                                    <p className="text-[18px] font-extrabold text-[#D97757]">{fund_received_amt?.toLocaleString("en-IN", { style: "currency", currency: "INR" }) || "—"}</p>
                                </div>
                                <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl p-4">
                                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#71717A] mb-1">Bank Account</p>
                                    <p className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] truncate">{bank_account || "—"}</p>
                                </div>
                            </div>

                            {/* Sanction info */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                                    <div className="w-6 h-6 rounded-md bg-[#ECFDF5] flex items-center justify-center text-emerald-600"><BadgeCheck className="h-3.5 w-3.5" /></div>
                                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#3F3F46] dark:text-[#E4E4E7]">Sanction Details</span>
                                </div>
                                <div className="p-4 space-y-2">
                                    {[["Reference", sanctionName], ["Letter No.", sanctionDetails?.sanctioned_letter_no || sanctionDetails?.sanction_letter_no], ["Date", sanctionDetails?.sanctioned_letter_date || sanctionDetails?.sanction_date], ["Sanctioned Amt", sanctionDetails?.total_sanctioned_amount?.toLocaleString("en-IN", { style: "currency", currency: "INR" })], ["Status", sanctionDetails?.sanction_workflow_status || sanctionDetails?.workflow_state]].map(([l, v]) => (
                                        <div key={l as string} className="flex justify-between gap-2 py-1.5 border-b border-[#F4F4F5] dark:border-[#3F3F46] last:border-0">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">{l as string}</span>
                                            <span className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] text-right">{(v as string) || "—"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Budget breakup */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                                    <div className="w-6 h-6 rounded-md bg-[#EEF2FF] flex items-center justify-center text-[#4A6CF7]"><ReceiptText className="h-3.5 w-3.5" /></div>
                                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#3F3F46] dark:text-[#E4E4E7]">Budget Breakup</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Account Head</th>
                                                <th className="px-4 py-2 text-right text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                                            {received_amt_breakup?.length > 0 ? received_amt_breakup.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]/40">
                                                    <td className="px-4 py-2 text-[12px] text-[#3F3F46] dark:text-[#D4D4D8] border-r border-[#F4F4F5] dark:border-[#3F3F46]/80"><BudgetHeadName value={item.account_head} options={budgetHeadOptions} /></td>
                                                    <td className="px-4 py-2 text-[12px] text-right font-bold text-[#D97757]">{item.amount_received?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td>
                                                </tr>
                                            )) : <tr><td colSpan={2} className="px-4 py-6 text-center text-[12px] text-[#A1A1AA]">No breakup.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Activity Log slide-over ── */}
            {showActivityLog && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setShowActivityLog(false)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-[#27272A] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-md bg-[#EEF2FF] flex items-center justify-center text-[#4A6CF7]"><MessageSquare className="h-3.5 w-3.5" /></div>
                                <h3 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Activity Log</h3>
                            </div>
                            <button onClick={() => setShowActivityLog(false)} className="p-1.5 rounded-lg hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] text-[#71717A] transition-colors"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 bg-[#FAFAF9] dark:bg-[#18181B]">
                            {name && <ActivityLog doctype="Fund Received" docname={name} maxHeight="100%" />}
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
        </div>
    );
};

export default FundReceivedDetails;
