// Multi-Doctype Deposit Slip Form — Redesigned
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDepositSlipCalculations } from "@/hooks/useDepositSlipCalculations";
import {
    ArrowLeftIcon,
    ChevronDown,
    Send,
    Save,
    Plus,
    Trash2,
} from "lucide-react";

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
    description: any;
    fieldname: string;
    label: string | null;
    fieldtype: string;
    mandatory: number;
    read_only: number;
    hidden: number;
    options?: string | null;
    default?: any;
    depends_on?: string | null;
}
interface LinkOption {
    value: string;
    label: string;
}

// --- REUSABLE UI COMPONENTS ---
const inputClasses =
    "w-full h-12 px-4 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] disabled:opacity-70 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 read-only:bg-zinc-100 dark:read-only:bg-zinc-800";

const FrappeCard = ({ children, className }: any) => (
    <div
        className={cn(
            "bg-white dark:bg-zinc-900 p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm",
            className,
        )}
    >
        {children}
    </div>
);

const FrappeButton = ({
    children,
    onClick,
    disabled,
    className,
    type = "button",
}: any) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-lg font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed",
            className,
        )}
    >
        {children}
    </button>
);

const NeoSection = ({ title, children }: any) => (
    <div className="space-y-5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            {title}
        </h2>
        {children}
    </div>
);

/** Prevent scroll-wheel from changing number input values */
const preventScrollChange = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.blur();
};

const DISTRIBUTION_TOTAL_FIELDS = [
    "total_amount",
    "total_amount_received",
    "amount_received",
    "fund_received_amt",
    "grand_total",
    "total_overhead_institute_share", // For D Consultancy DPF/PDF distribution
];
const PDF_DPF_TOTAL_PERCENTAGE = 25;

// --- PROJECT AUTO-FILL CONFIGURATION ---
// Link fields pointing to these doctypes trigger auto-fill of project details
const PROJECT_SOURCE_DOCTYPES = new Set([
    "Project Registration",
    "Project",
    "RND Project",
    "Research Project",
    "Consultancy Project",
    "Testing Project",
]);

// Fieldnames that, if present as a Link field, should trigger project auto-fill
// regardless of what `field.options` declares. Covers backends that return
// options as null/empty or a slightly different doctype label.
const PROJECT_TRIGGER_FIELDNAMES = new Set([
    "project_title",
    "research_project",
    "project_ref_no",
    "project_registration",
    "project",
]);

// Default doctype to query when the field has no resolvable `options` value.
const DEFAULT_PROJECT_DOCTYPE = "Project Registration";

// Map from project doc fieldnames → form fieldnames (first match wins per target).
// Does NOT include project_title — that is the trigger field, not a fill target.
const PROJECT_FIELD_MAP: Record<string, string> = {
    principal_investigator: "principal_investigator",
    pi: "principal_investigator",
    pi_name: "principal_investigator",
    funding_agency: "funding_agency",
    funding_agen: "funding_agency", // fetch_from hint: project_title.funding_agen
    sponsor: "funding_agency",
    client: "client",
    client_name: "client",
    gstin_of_funding_agency: "gstin_of_funding_agency",
    gstin: "gstin_of_funding_agency",
    agency_gstin: "gstin_of_funding_agency",
};

const PROJECT_AUTOFILL_TARGET_FIELDS = new Set([
    "principal_investigator",
    "client",
    "funding_agency",
    "gstin_of_funding_agency",
]);

// --- STATIC FIELD DEFINITIONS ---
// Used as fallback when the backend get_*_fields method is not yet implemented.
// Mirrors the field definitions in the backend spec exactly.

const E_NON_ROUTINE_FIELDS = [
    { fieldname: "project_title",             label: "Project Title",                fieldtype: "Link",     options: "Project Registration", mandatory: 1, read_only: 0, hidden: 0 },
    { fieldname: "principal_investigator",    label: "Principal Investigator",       fieldtype: "Link",     options: "User",                 mandatory: 1, read_only: 0, hidden: 0 },
    { fieldname: "client",                    label: "Client",                       fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "funding_agency",            label: "Funding Agency",               fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "gstin_of_funding_agency",   label: "GSTIN of Funding Agency",      fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "ecs_ac_no",                 label: "ECS A/C No.",                  fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "bank",                      label: "Bank",                         fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "calculations_section",      label: "Calculations",                 fieldtype: "Section Break" },
    { fieldname: "amount_inclusive_of_gst",   label: "Amount Inclusive of GST",      fieldtype: "Currency", mandatory: 1, read_only: 0, hidden: 0 },
    { fieldname: "igst_18",                   label: "IGST @18%",                    fieldtype: "Currency", mandatory: 0, read_only: 1, hidden: 0 },
    { fieldname: "consultancy_fee_x",         label: "Consultancy Fee X",            fieldtype: "Currency", mandatory: 0, read_only: 1, hidden: 0, description: "Consultancy Fee (After GST Deduction)" },
    { fieldname: "overhead_multiplier",       label: "Overhead Multiplier",          fieldtype: "Float",    default: 0.1, read_only: 0, hidden: 1 },
    { fieldname: "overhead_amount",           label: "Overhead Amount",              fieldtype: "Currency", read_only: 1, hidden: 0 },
    { fieldname: "credit_distribution_section", label: "Credit Distribution",        fieldtype: "Section Break" },
    { fieldname: "credit_distribution",       label: "Credit as follows",            fieldtype: "Table",    options: "Deposit Slip Credit Distribution" },
    { fieldname: "totals_section",            label: "Totals",                       fieldtype: "Section Break" },
    { fieldname: "total_gst",                 label: "Total GST",                    fieldtype: "Currency", read_only: 0, hidden: 0 },
    { fieldname: "total_budget",              label: "Total Budget",                 fieldtype: "Currency", read_only: 1, hidden: 0 },
];

const T_TESTING_FIELDS = [
    { fieldname: "project_title",             label: "Project Title",                fieldtype: "Link",     options: "Project Registration", mandatory: 1, read_only: 0, hidden: 0 },
    { fieldname: "principal_investigator",    label: "Principal Investigator",       fieldtype: "Link",     options: "User",                 mandatory: 1, read_only: 0, hidden: 0 },
    { fieldname: "client",                    label: "Client",                       fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "gstin_of_funding_agency",   label: "Funding Agency",               fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "ecs_ac_no",                 label: "ECS A/C No.",                  fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "bank",                      label: "Bank",                         fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "calculations_section",      label: "Calculations",                 fieldtype: "Section Break" },
    { fieldname: "amount_inclusive_of_gst",   label: "Amount Inclusive of GST",      fieldtype: "Currency", mandatory: 1, read_only: 0, hidden: 0 },
    { fieldname: "cgst_9",                    label: "CGST @9%",                     fieldtype: "Currency", read_only: 1, hidden: 0 },
    { fieldname: "sgst_9",                    label: "SGST @9%",                     fieldtype: "Currency", read_only: 1, hidden: 0 },
    { fieldname: "consultancy_fee_x",         label: "Consultancy Fee X",            fieldtype: "Currency", read_only: 1, hidden: 0, description: "Consultancy Fee (After GST Deduction)" },
    { fieldname: "overhead_multiplier",       label: "Overhead Multiplier",          fieldtype: "Float",    default: 0.7, read_only: 0, hidden: 1 },
    { fieldname: "overhead_amount",           label: "Overhead Amount",              fieldtype: "Currency", read_only: 1, hidden: 0 },
    { fieldname: "credit_distribution_section", label: "Credit Distribution",        fieldtype: "Section Break" },
    { fieldname: "idf_t_testing_fee",         label: "(a.) IDF",                     fieldtype: "Data",     read_only: 1, hidden: 0, description: "(40% of the Consultancy fee)" },
    { fieldname: "dpf_t_testing_fee",         label: "(b.) DPF/CE",                 fieldtype: "Data",     read_only: 1, hidden: 0, description: "(50% of the Consultancy fee)" },
    { fieldname: "staff_welfare_t_testing_fund",  label: "(c.) Staff Welfare fund",  fieldtype: "Data",     read_only: 1, hidden: 0, description: "(5% of Overhead amount)" },
    { fieldname: "student_welfare_t_testing_fund", label: "(d.) Student Welfare fund", fieldtype: "Data",  read_only: 1, hidden: 0, description: "(5% of Overhead amount)" },
    { fieldname: "totals_section",            label: "Totals",                       fieldtype: "Section Break" },
    { fieldname: "total_gst",                 label: "Total GST",                    fieldtype: "Currency", read_only: 0, hidden: 0 },
    { fieldname: "total_budget",              label: "Total Budget",                 fieldtype: "Currency", read_only: 1, hidden: 0 },
];

const D_CONSULTANCY_FIELDS = [
    { fieldname: "primary_details",           label: "Primary Details",              fieldtype: "Section Break" },
    { fieldname: "consultancy_title",         label: "Consultancy Title",            fieldtype: "Data",     mandatory: 1, read_only: 0, hidden: 0 },
    { fieldname: "category_d",               label: "Category",                     fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "principal_consultant",      label: "Principal Consultant",         fieldtype: "Link",     options: "User", mandatory: 1, read_only: 0, hidden: 0 },
    { fieldname: "client",                    label: "Client",                       fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "funding_agency",            label: "Funding Agency",               fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "gstin_of_funding_agency",   label: "GSTIN of Funding Agency",      fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "iitg_invoice_no",           label: "IITG Invoice No.",             fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "bank",                      label: "Bank",                         fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "ecs_ac_no",                 label: "ECS A/C No.",                  fieldtype: "Data",     mandatory: 0, read_only: 0, hidden: 0 },
    { fieldname: "section_break_mqkq",        label: "GST and Fee Calculations",     fieldtype: "Section Break" },
    { fieldname: "amount_inclusive_of_gst",   label: "Amount Inclusive of GST",      fieldtype: "Currency", mandatory: 1, read_only: 0, hidden: 0, description: "Enter the total amount inclusive of 18% GST" },
    { fieldname: "igst_18_on_consultancy",    label: "IGST @18% on Consultancy Fee", fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: Taxable Amount × 0.18 (where Taxable Amount = Amount ÷ 1.18)" },
    { fieldname: "amount_after_gst_tds",      label: "Amount after GST TDS @ 2%",    fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: Amount Inclusive - TDS Amount (2% of Taxable Amount, rounded)" },
    { fieldname: "total_cost_x",              label: "Total Cost X",                 fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: Amount after TDS - IGST (Balance after GST deduction from amount received)" },
    { fieldname: "consultancy_charge_y",      label: "Consultancy Charge (Y)",       fieldtype: "Currency", mandatory: 0, read_only: 0, hidden: 0, description: "Auto-filled as 30% of Total Cost X. Can be manually adjusted; Z will recalculate as X - Y" },
    { fieldname: "operational_charge_z",      label: "Operational Charge (Z)",       fieldtype: "Currency", mandatory: 0, read_only: 0, hidden: 0, description: "Calculated as: Total Cost X - Consultancy Charge (Y)" },
    { fieldname: "overhead_from_y_amount",    label: "Overhead from Y (10% * Y)",    fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: Consultancy Charge (Y) × 0.10" },
    { fieldname: "overhead_from_z_amount",    label: "Overhead from Z (10% * Z)",    fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: Operational Charge (Z) × 0.10" },
    { fieldname: "total_overhead_amount",     label: "Total Overhead",               fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: Overhead from Y + Overhead from Z" },
    { fieldname: "institute_share_amount",    label: "Institute Share (20% * Y)",    fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: Consultancy Charge (Y) × 0.20" },
    { fieldname: "total_overhead_institute_share", label: "Overhead + Institute Share", fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: Total Overhead + Institute Share (Base for all credit distributions)" },
    { fieldname: "credit_distribution_section", label: "Credit Distribution",        fieldtype: "Section Break", description: "Total allocation must equal 100%: IDF% + DPF% (sum of rows) + Staff 5% + Student 5% = 100%" },
    { fieldname: "idf_percentage",            label: "IDF % age",                    fieldtype: "Float",    read_only: 0, hidden: 0, default: 40, description: "User-editable IDF percentage (default: 40%). Enter custom percentage; DPF will adjust to maintain 100% total." },
    { fieldname: "idf_amount",                label: "IDF Amount",                   fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: (Overhead + Institute Share) × (IDF % / 100)" },
    { fieldname: "dpf_amount",                label: "Total DPF/CE Amount",          fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: (Overhead + Institute Share) × (Remaining % / 100) where Remaining = 100% - IDF% - 5% - 5%" },
    { fieldname: "staff_welfare_amount",      label: "Staff Welfare Amount",         fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: (Overhead + Institute Share) × 0.05 (5% - Fixed)" },
    { fieldname: "student_welfare_amount",    label: "Student Welfare Amount",       fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: (Overhead + Institute Share) × 0.05 (5% - Fixed)" },
    { fieldname: "final_totals",              label: "Final Totals",                 fieldtype: "Section Break" },
    { fieldname: "balance_consultancy_fee",   label: "Balance Consultancy Fee",      fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: Y - Overhead(Y) - Institute Share = Y × 0.70" },
    { fieldname: "balance_operation_charge",  label: "Balance Operation Charge",     fieldtype: "Currency", read_only: 1, hidden: 0, description: "Calculated as: Z - Overhead(Z) = Z × 0.90" },
    { fieldname: "total_gst",                 label: "Total GST",                    fieldtype: "Currency", read_only: 0, hidden: 0, description: "Equals IGST @18% calculated at the top" },
    { fieldname: "total_amount",              label: "Total Amount",                 fieldtype: "Currency", read_only: 1, hidden: 0, description: "Equals Amount after GST TDS @ 2%" },
];

// Map from deposit slip type key → static field definitions
const STATIC_FIELDS: Record<string, any[]> = {
    e_non_routine: E_NON_ROUTINE_FIELDS,
    t_testing: T_TESTING_FIELDS,
    d_consultancy: D_CONSULTANCY_FIELDS,
};

const parseNumericValue = (value: any): number => {
    const parsed = parseFloat(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumericInput = (value: number): string => {
    if (!Number.isFinite(value) || value === 0) return "0";
    return Number(value.toFixed(2)).toString();
};

const roundToTwo = (value: number): number => Number(value.toFixed(2));

const fuzzyMatch = (text: string, query: string): boolean => {
    if (!query) return true;
    const t = text.toLowerCase();
    const q = query.toLowerCase();
    let ti = 0;
    for (let qi = 0; qi < q.length; qi++) {
        while (ti < t.length && t[ti] !== q[qi]) ti++;
        if (ti >= t.length) return false;
        ti++;
    }
    return true;
};

// --- MAIN COMPONENT ---
const DepositSlipForm: React.FC = () => {
    const navigate = useNavigate();
    const { fundReceivedName } = useParams<{ fundReceivedName: string }>();

    const [selectedType, setSelectedType] = useState<string>("");
    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<
        Record<string, LinkOption[]>
    >({});
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

    // Table data managed in React state instead of DOM manipulation
    const [ecsDates, setEcsDates] = useState<
        { id: string; ecs_date: string; amount: string; remarks: string }[]
    >([]);
    const [creditDistribution, setCreditDistribution] = useState<
        { id: string; label: string; percentage: string; amount: string }[]
    >([]);
    const [pdfCreditDistribution, setPdfCreditDistribution] = useState<
        {
            id: string;
            select_copi_id: string;
            employee_id: string;
            pdf_percentage: string;
            pdf_amount: string;
        }[]
    >([]);
    const [dpfCreditDistributions, setDpfCreditDistributions] = useState<
        {
            id: string;
            select_dpf_dept_center_school: string;
            department_id: string;
            dpf_percentage: string;
            dpf_amount: string;
        }[]
    >([]);

    const [pdfPiSearch, setPdfPiSearch] = useState<Record<number, string>>({});
    const [pdfPiOpen, setPdfPiOpen] = useState<Record<number, boolean>>({});
    const [pdfPiDropdownPos, setPdfPiDropdownPos] = useState<Record<number, { top: number; left: number; width: number }>>({});
    const pdfPiInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

    // Run auto-calculations based on deposit slip type
    useDepositSlipCalculations(formValues, setFormValues, selectedType);

    // Handle manual edits to Consultancy Charge (Y) - recalculate Z and downstream
    useEffect(() => {
        if (selectedType === "d_consultancy") {
            const totalCostX = parseNumericValue(formValues.total_cost_x || 0);
            const chargeY = parseNumericValue(formValues.consultancy_charge_y || 0);

            // If Y was manually edited (and differs from default 30% of X)
            if (chargeY > 0 && Math.abs(chargeY - totalCostX * 0.30) > 0.01) {
                // User manually changed Y, so recalculate Z and downstream
                const chargeZ = roundToTwo(totalCostX - chargeY);

                // Recalculate overheads and distributions with the new Z
                const ohY = roundToTwo(chargeY * 0.10);
                const ohZ = roundToTwo(chargeZ * 0.10);
                const totalOh = roundToTwo(ohY + ohZ);
                const instShare = roundToTwo(chargeY * 0.20);
                const totalOhShare = roundToTwo(totalOh + instShare);

                setFormValues((prev) => ({
                    ...prev,
                    operational_charge_z: chargeZ,
                    overhead_from_y_amount: ohY,
                    overhead_from_z_amount: ohZ,
                    total_overhead_amount: totalOh,
                    institute_share_amount: instShare,
                    total_overhead_institute_share: totalOhShare,
                    idf_amount: roundToTwo(totalOhShare * 0.40),
                    dpf_amount: roundToTwo(totalOhShare * 0.50),
                    staff_welfare_amount: roundToTwo(totalOhShare * 0.05),
                    student_welfare_amount: roundToTwo(totalOhShare * 0.05),
                    balance_consultancy_fee: roundToTwo(chargeY - ohY - instShare),
                    balance_operation_charge: roundToTwo(chargeZ - ohZ),
                }));
            }
        }
    }, [formValues.consultancy_charge_y, formValues.total_cost_x, selectedType]);

    // Sync DPF row amounts based on user-entered dpf_percentage
    // Formula: dpf_amount = total_overhead_institute_share × (dpf_percentage / 100)
    useEffect(() => {
        if (selectedType !== "d_consultancy" || dpfCreditDistributions.length === 0) {
            return;
        }

        const totalOverheadShare = parseNumericValue(formValues.total_overhead_institute_share);

        // Recalculate all DPF row amounts based on their percentages
        const updatedDpf = dpfCreditDistributions.map((row) => {
            const dpfPct = parseNumericValue(row.dpf_percentage);
            const dpfAmount = roundToTwo((totalOverheadShare * dpfPct) / 100);

            return {
                ...row,
                dpf_amount: formatNumericInput(dpfAmount),
            };
        });

        setDpfCreditDistributions(updatedDpf);
    }, [selectedType, formValues.total_overhead_institute_share, dpfCreditDistributions.length, setDpfCreditDistributions]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const openEntries = Object.entries(pdfPiOpen).filter(([, v]) => v);
            openEntries.forEach(([idxStr]) => {
                const inputEl = pdfPiInputRefs.current[Number(idxStr)];
                if (inputEl && !inputEl.contains(e.target as Node)) {
                    const target = e.target as HTMLElement;
                    if (!target.closest(`[data-pdf-pi-dropdown="${idxStr}"]`)) {
                        setPdfPiOpen((prev) => ({ ...prev, [idxStr]: false }));
                    }
                }
            });
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [pdfPiOpen]);

    const generateId = () =>
        `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fetchAndAutoFillProjectDetails = useCallback(
        async (projectName: string, doctype: string) => {
            const tryDoctypes = Array.from(
                new Set([doctype, DEFAULT_PROJECT_DOCTYPE].filter(Boolean)),
            );

            for (const dt of tryDoctypes) {
                try {
                    const resp = await fetch("/api/method/frappe.client.get", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ doctype: dt, name: projectName }),
                    });
                    if (!resp.ok) {
                        console.warn(
                            `[DepositSlip auto-fill] frappe.client.get ${dt}/${projectName} → HTTP ${resp.status}`,
                        );
                        continue;
                    }
                    const data = await resp.json();
                    const doc = data?.message;
                    if (!doc) {
                        console.warn(
                            `[DepositSlip auto-fill] No doc returned for ${dt}/${projectName}`,
                        );
                        continue;
                    }

                    console.log(
                        `[DepositSlip auto-fill] Fetched ${dt}/${projectName}; keys:`,
                        Object.keys(doc),
                    );

                    const fills: Record<string, any> = {};
                    Object.entries(PROJECT_FIELD_MAP).forEach(
                        ([docField, formField]) => {
                            if (
                                doc[docField] != null &&
                                doc[docField] !== "" &&
                                !(formField in fills)
                            ) {
                                fills[formField] = doc[docField];
                            }
                        },
                    );

                    if (Object.keys(fills).length > 0) {
                        console.log(
                            "[DepositSlip auto-fill] Filling fields:",
                            fills,
                        );
                        setFormValues((prev) => ({ ...prev, ...fills }));
                        setAutoFilledFields(new Set(Object.keys(fills)));
                    } else {
                        console.warn(
                            "[DepositSlip auto-fill] No mapped fields found on project doc. Check PROJECT_FIELD_MAP vs doc keys.",
                        );
                    }
                    return;
                } catch (e) {
                    console.error(
                        `[DepositSlip auto-fill] Failed for ${dt}/${projectName}:`,
                        e,
                    );
                }
            }
        },
        [],
    );

    const getDistributionBaseAmount = useCallback(
        (values: Record<string, any>) => {
            for (const fieldname of DISTRIBUTION_TOTAL_FIELDS) {
                const amount = parseNumericValue(values[fieldname]);
                if (amount > 0) return amount;
            }
            return 0;
        },
        [],
    );

    const recalculateDistributionAmounts = useCallback(
        (
            rows: any[],
            percentageKey: string,
            amountKey: string,
            totalAmount: number,
        ) =>
            rows.map((row) => {
                const percentage = parseNumericValue(row[percentageKey]);
                return {
                    ...row,
                    [amountKey]:
                        percentage > 0
                            ? formatNumericInput(
                                  roundToTwo((totalAmount * percentage) / 100),
                              )
                            : "",
                };
            }),
        [],
    );

    const splitDistributionRows = useCallback(
        (
            rows: any[],
            percentageKey: string,
            amountKey: string,
            totalAmount: number,
            totalPercentage: number,
        ) => {
            if (rows.length === 0) return rows;

            const basePercentage = roundToTwo(totalPercentage / rows.length);
            let remainingPercentage = roundToTwo(totalPercentage);
            let remainingAmount = roundToTwo((totalAmount * totalPercentage) / 100);

            return rows.map((row, index) => {
                const isLastRow = index === rows.length - 1;
                const percentage = isLastRow
                    ? roundToTwo(remainingPercentage)
                    : basePercentage;
                const amount = isLastRow
                    ? roundToTwo(remainingAmount)
                    : roundToTwo((totalAmount * percentage) / 100);

                remainingPercentage = roundToTwo(
                    remainingPercentage - percentage,
                );
                remainingAmount = roundToTwo(remainingAmount - amount);

                return {
                    ...row,
                    [percentageKey]: formatNumericInput(percentage),
                    [amountKey]: formatNumericInput(amount),
                };
            });
        },
        [],
    );

    const handleTypeChange = async (type: string) => {
        setSelectedType(type);
        setFields([]);
        setFormValues({});
        setAutoFilledFields(new Set());
        setEcsDates([]);
        setCreditDistribution([]);
        setPdfCreditDistribution([]);
        setDpfCreditDistributions([]);
        setLoading(true);

        if (!type || !DEPOSIT_SLIP_TYPES[type]) {
            setLoading(false);
            return;
        }

        // Helper: apply a resolved field list + optional prefill/link_options
        const applyFields = (
            rawFields: any[],
            link_options: Record<string, any> | null,
            prefill_data: Record<string, any> | null,
        ) => {
            const processedFields = rawFields.map((field) => {
                if (
                    field.fieldtype === "Section Break" ||
                    field.fieldtype === "SectionBreak"
                )
                    return field;
                if (prefill_data && prefill_data[field.fieldname] !== undefined) {
                    return { ...field, default: prefill_data[field.fieldname] };
                }
                return field;
            });
            setFields(processedFields);

            const initialValues: Record<string, any> = {};
            processedFields.forEach((f) => {
                if (f.default !== undefined && f.default !== null)
                    initialValues[f.fieldname] = f.default;
            });
            setFormValues(initialValues);

            if (prefill_data) {
                const prefillKeys = new Set<string>(
                    processedFields
                        .filter((f) => prefill_data[f.fieldname] !== undefined)
                        .map((f) => f.fieldname),
                );
                if (prefillKeys.size > 0) setAutoFilledFields(prefillKeys);
            }

            if (link_options) {
                setLinkOptions((prev) => ({ ...prev, ...link_options }));
            }
        };

        // Helper: fetch link options for known doctypes not already loaded
        const fetchMissingLinkOptions = async (
            alreadyLoaded: Record<string, any>,
        ) => {
            const missingDoctypes = [
                "Department_prornd",
                "User",
                "Budget Head",
                "Project Registration",
            ];
            for (const dt of missingDoctypes) {
                const loaded =
                    dt === "Project Registration"
                        ? alreadyLoaded?.["project_title"] ||
                          alreadyLoaded?.["Project Registration"]
                        : alreadyLoaded?.[dt];
                if (loaded) continue;
                try {
                    const listResp = await fetch(
                        "/api/method/frappe.client.get_list",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
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
                                            : dt === "Project Registration"
                                              ? ["name", "project_title"]
                                              : ["name"],
                                limit_page_length: 0,
                            }),
                        },
                    );
                    const listJson = await listResp.json();
                    if (listJson.message) {
                        const opts = listJson.message.map((d: any) => {
                            if (dt === "User")
                                return { label: d.full_name || d.name, value: d.name };
                            if (dt === "Project Registration")
                                return { label: d.project_title || d.name, value: d.name };
                            return {
                                label:
                                    d.dept_name ||
                                    d.full_name ||
                                    d.budget_head ||
                                    d.head_name ||
                                    d.account_head ||
                                    d.title ||
                                    d.name,
                                value: d.name,
                            };
                        });
                        setLinkOptions((prev) => ({
                            ...prev,
                            [dt]: opts,
                            ...(dt === "User"
                                ? { select_copi_id: opts, principal_investigator: opts, principal_consultant: opts }
                                : {}),
                            ...(dt === "Project Registration"
                                ? { project_title: opts }
                                : {}),
                        }));
                    }
                } catch (e) {
                    console.error(`Failed to fetch options for ${dt}`, e);
                }
            }
        };

        const methodPath = DEPOSIT_SLIP_TYPES[type].getFields;
        console.log(`[DepositSlip] Calling getFields for type="${type}":`, methodPath);

        try {
            const response = await fetch(`/api/method/${methodPath}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ doc_name: fundReceivedName || undefined }),
            });
            console.log(`[DepositSlip] getFields HTTP status:`, response.status, response.statusText);

            const result = await response.json();
            console.log(`[DepositSlip] getFields raw response:`, result);

            const apiFields = result?.message?.fields;
            const link_options = result?.message?.link_options || {};
            const prefill_data = result?.message?.prefill_data || null;

            console.log(`[DepositSlip] apiFields count:`, Array.isArray(apiFields) ? apiFields.length : "not an array", apiFields);
            console.log(`[DepositSlip] link_options keys:`, Object.keys(link_options));
            console.log(`[DepositSlip] prefill_data:`, prefill_data);

            if (Array.isArray(apiFields) && apiFields.length > 0) {
                // Backend returned fields — use them
                applyFields(apiFields, link_options, prefill_data);
                await fetchMissingLinkOptions(link_options);
            } else {
                // Backend not implemented yet — fall back to static field definitions
                const staticFields = STATIC_FIELDS[type];
                if (staticFields) {
                    console.warn(
                        `[DepositSlip] Backend returned no fields for "${type}" — using static fallback.`,
                    );
                    applyFields(staticFields, null, null);
                    await fetchMissingLinkOptions({});
                } else {
                    console.error(
                        `[DepositSlip] No fields from backend and no static fallback for type "${type}"`,
                    );
                }
            }
        } catch (err) {
            console.error("[DepositSlip] getFields threw an exception:", err);
            // On network error, still try the static fallback
            const staticFields = STATIC_FIELDS[type];
            if (staticFields) {
                console.warn(
                    `[DepositSlip] Backend unreachable for "${type}" — using static fallback.`,
                );
                applyFields(staticFields, null, null);
                await fetchMissingLinkOptions({});
            } else {
                alert("Error loading form fields. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (fieldname: string, value: any) => {
        setFormValues((prev) => {
            const nextValues = { ...prev, [fieldname]: value };

            if (DISTRIBUTION_TOTAL_FIELDS.includes(fieldname)) {
                const totalAmount = getDistributionBaseAmount(nextValues);
                setPdfCreditDistribution((prevRows) =>
                    recalculateDistributionAmounts(
                        prevRows,
                        "pdf_percentage",
                        "pdf_amount",
                        totalAmount,
                    ),
                );
                setDpfCreditDistributions((prevRows) =>
                    recalculateDistributionAmounts(
                        prevRows,
                        "dpf_percentage",
                        "dpf_amount",
                        totalAmount,
                    ),
                );
            }

            return nextValues;
        });

        // Project auto-fill: trigger when a project-like Link field changes.
        // We match on EITHER the declared doctype options OR the fieldname,
        // because some backends return options as null/empty for these fields.
        const field = fields.find((f) => f.fieldname === fieldname);
        const optionsDoctype = (field?.options || "").trim();
        const matchesDoctype =
            !!optionsDoctype && PROJECT_SOURCE_DOCTYPES.has(optionsDoctype);
        const matchesFieldname = PROJECT_TRIGGER_FIELDNAMES.has(fieldname);
        const isProjectLink =
            field?.fieldtype === "Link" && (matchesDoctype || matchesFieldname);

        if (isProjectLink) {
            if (value) {
                const doctype = matchesDoctype
                    ? optionsDoctype
                    : DEFAULT_PROJECT_DOCTYPE;
                console.log(
                    `[DepositSlip auto-fill] Trigger: field="${fieldname}" doctype="${doctype}" value="${value}"`,
                );
                fetchAndAutoFillProjectDetails(value, doctype);
            } else {
                setFormValues((prev) => {
                    const next = { ...prev };
                    PROJECT_AUTOFILL_TARGET_FIELDS.forEach((f) => delete next[f]);
                    return next;
                });
                setAutoFilledFields(new Set());
            }
        }
    };

    const checkDependency = (field: Field | null | undefined) => {
        if (!field || !field["depends_on"]) return true;
        const dep = field["depends_on"] as string;
        if (!dep) return true;

        if (dep.startsWith("eval:")) {
            const expression = dep.replace("eval:", "").trim();
            const doc = formValues;

            try {
                if (expression.includes("==")) {
                    const [lhs, rhsraw] = expression.split("==");
                    const key = lhs.replace("doc.", "").trim();
                    const val = rhsraw.replace(/['"]/g, "").trim();
                    return doc[key] == val;
                }
                if (expression.includes("!==") || expression.includes("!=")) {
                    const operator = expression.includes("!==") ? "!==" : "!=";
                    const [lhs, rhsraw] = expression.split(operator);
                    const key = lhs.replace("doc.", "").trim();
                    const val = rhsraw.replace(/['"]/g, "").trim();
                    return doc[key] != val;
                }
                if (expression.includes(".includes(")) {
                    const [keyPart, rest] = expression.split(".includes(");
                    const key = keyPart.replace("doc.", "").trim();
                    const valueToCheck = rest
                        .replace(")", "")
                        .replace(/['"]/g, "")
                        .trim();
                    return doc[key]?.includes(valueToCheck);
                }
            } catch (e) {
                console.warn("Failed to parse dependency:", dep, e);
                return true;
            }
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting || !selectedType) return;
        setIsSubmitting(true);

        try {
            const dataToSubmit: { [key: string]: any } = {};

            // Collect form field values from React state
            fields.forEach((field) => {
                if (
                    field.fieldtype !== "Table" &&
                    field.fieldtype !== "Section Break" &&
                    !field.hidden
                ) {
                    const value = formValues[field.fieldname];
                    if (value !== undefined && value !== null) {
                        dataToSubmit[field.fieldname] = value;
                    }
                }
            });

            // ECS Dates from React state
            dataToSubmit.ecs_dates = ecsDates
                .filter(
                    (row) =>
                        row.ecs_date ||
                        (row.amount && parseFloat(row.amount) !== 0),
                )
                .map((row) => ({
                    ecs_date: row.ecs_date || "",
                    amount: row.amount ? parseFloat(row.amount) : 0,
                    remarks: row.remarks || "",
                }));

            // Credit Distribution from React state
            dataToSubmit.credit_distribution = creditDistribution
                .filter((row) => row.label || row.percentage || row.amount)
                .map((row) => ({
                    label: row.label || "",
                    percentage: row.percentage ? parseFloat(row.percentage) : 0,
                    amount: row.amount ? parseFloat(row.amount) : 0,
                }));

            dataToSubmit.pdf_credit_distribution = pdfCreditDistribution
                .filter(
                    (row) =>
                        row.select_copi_id ||
                        row.employee_id ||
                        row.pdf_percentage ||
                        row.pdf_amount,
                )
                .map((row) => ({
                    select_copi_id: row.select_copi_id || "",
                    employee_id: row.employee_id || "",
                    pdf_percentage: row.pdf_percentage
                        ? parseFloat(row.pdf_percentage)
                        : 0,
                    pdf_amount: row.pdf_amount ? parseFloat(row.pdf_amount) : 0,
                }));

            dataToSubmit.dpf_credit_distributions = dpfCreditDistributions
                .filter(
                    (row) =>
                        row.select_dpf_dept_center_school ||
                        row.department_id ||
                        row.dpf_percentage ||
                        row.dpf_amount,
                )
                .map((row) => ({
                    select_dpf_dept_center_school:
                        row.select_dpf_dept_center_school || "",
                    department_id: row.department_id || "",
                    dpf_percentage: row.dpf_percentage
                        ? parseFloat(row.dpf_percentage)
                        : 0,
                    dpf_amount: row.dpf_amount ? parseFloat(row.dpf_amount) : 0,
                }));

            console.log("Submitting Deposit Slip:", dataToSubmit);

            const response = await fetch(
                `/api/method/${DEPOSIT_SLIP_TYPES[selectedType].save}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        doc_data: JSON.stringify(dataToSubmit),
                    }),
                },
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(
                    errData?.exc_type ||
                        errData?._server_messages ||
                        `Server error: ${response.status}`,
                );
            }

            const result = await response.json();

            if (result?.message?.name) {
                alert(
                    `Deposit Slip saved successfully! Document: ${result.message.name}`,
                );
            } else {
                alert("Deposit Slip saved successfully!");
            }
            navigate(-1);
        } catch (err: any) {
            console.error("Submission error:", err);
            alert(`Submission Failed: ${err.message || "Unknown Error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Statically read-only fields (legacy / other slip types).
    // project_title is intentionally excluded — for E/T types the user must select it;
    // for Research type it is covered by autoFilledFields (populated from prefill_data).
    const readOnlyFieldNames = [
        "research_project",
        "project_ref_no",
        "project_registration",
    ];

    const renderFormField = (field: Field) => {
        if (!checkDependency(field)) return null;
        if (
            !field ||
            field.hidden ||
            field.fieldtype === "Section Break" ||
            field.fieldtype === "SectionBreak" ||
            field.fieldtype === "Column Break" ||
            field.fieldtype === "ColumnBreak"
        )
            return null;
        if (
            field.fieldname.endsWith("_multiplier") ||
            field.fieldname.endsWith("_label")
        )
            return null;
        if (field.fieldtype === "Table") return null;

        const forceReadOnly =
            readOnlyFieldNames.includes(field.fieldname) ||
            autoFilledFields.has(field.fieldname);
        const isReadOnly = field.read_only === 1 || forceReadOnly;

        const commonProps = {
            id: field.fieldname,
            name: field.fieldname,
            className: inputClasses,
            readOnly: isReadOnly,
            required: field.mandatory === 1,
            disabled: isReadOnly,
            value: formValues[field.fieldname] || "",
            onChange: (e: any) =>
                handleFieldChange(field.fieldname, e.target.value),
        };

        const renderInput = () => {
            if (field.fieldtype === "Link") {
                let opts = linkOptions[field.fieldname] || [];
                if (opts.length === 0) {
                    if (
                        field.fieldname === "project_title" ||
                        field.fieldname === "research_project"
                    ) {
                        if (linkOptions["project_ref_no"])
                            opts = linkOptions["project_ref_no"];
                        else if (linkOptions["project_registration"])
                            opts = linkOptions["project_registration"];
                    }
                }

                if (forceReadOnly) {
                    // Show as read-only text instead of dropdown
                    const displayLabel =
                        opts.find(
                            (o) => o.value === formValues[field.fieldname],
                        )?.label ||
                        formValues[field.fieldname] ||
                        "";
                    return (
                        <input
                            type="text"
                            {...commonProps}
                            value={displayLabel}
                            readOnly
                            disabled
                        />
                    );
                }

                return (
                    <select {...commonProps}>
                        <option value="">Select...</option>
                        {opts.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );
            }
            if (field.fieldtype === "Select") {
                const selectOpts =
                    typeof field.options === "string"
                        ? field.options
                              .split("\n")
                              .filter((o) => o)
                              .map((o) => ({ value: o, label: o }))
                        : [];
                return (
                    <select {...commonProps}>
                        <option value="">Select...</option>
                        {selectOpts.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );
            }
            if (field.fieldtype === "Date")
                return <input type="date" {...commonProps} />;
            if (
                field.fieldtype === "Currency" ||
                field.fieldtype === "Float" ||
                field.fieldtype === "Int"
            ) {
                return (
                    <input
                        type="number"
                        min="0"
                        title="Enter a positive amount"
                        {...commonProps}
                        onWheel={preventScrollChange}
                        onWheelCapture={preventScrollChange}
                        onKeyDown={(e) => {
                            if (["e", "E", "+", "-"].includes(e.key) || /[a-zA-Z]/.test(e.key)) {
                                e.preventDefault();
                            }
                        }}
                    />
                );
            }
            if (field.fieldtype === "HTML")
                return (
                    <div
                        dangerouslySetInnerHTML={{
                            __html: field.options || "",
                        }}
                        className="prose text-sm text-zinc-600 dark:text-zinc-400"
                    />
                );
            return <input type="text" {...commonProps} />;
        };

        return (
            <div key={field.fieldname} className="space-y-2">
                <label
                    htmlFor={field.fieldname}
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                    {field.label}
                    {field.mandatory === 1 && (
                        <span className="text-red-500 ml-1">*</span>
                    )}
                    {forceReadOnly && (
                        <span className="text-xs text-zinc-400 ml-2">
                            (auto-filled)
                        </span>
                    )}
                </label>
                {renderInput()}
                {field.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {field.description}
                    </p>
                )}
            </div>
        );
    };

    const groupFieldsBySection = () => {
        const sections: {
            title: string;
            fields: Field[];
            sectionField?: Field;
        }[] = [];
        let currentSection: {
            title: string;
            fields: Field[];
            sectionField?: Field;
        } | null = null;

        if (
            fields.length > 0 &&
            fields[0].fieldtype !== "Section Break" &&
            fields[0].fieldtype !== "SectionBreak"
        ) {
            currentSection = { title: "General Information", fields: [] };
        }

        fields.forEach((field) => {
            if (
                field.fieldtype === "Section Break" ||
                field.fieldtype === "SectionBreak"
            ) {
                if (currentSection) sections.push(currentSection);
                currentSection = {
                    title: field.label || "Section",
                    fields: [],
                    sectionField: field,
                };
            } else if (
                currentSection &&
                !field.hidden &&
                field.fieldtype !== "Table" &&
                field.fieldtype !== "Column Break" &&
                field.fieldtype !== "ColumnBreak"
            ) {
                currentSection.fields.push(field);
            }
        });
        if (currentSection) sections.push(currentSection);
        return sections;
    };

    const sections = groupFieldsBySection();
    const distributionBaseAmount = getDistributionBaseAmount(formValues);
    const hasPdfCreditDistribution = fields.some(
        (field) => field.fieldname === "pdf_credit_distribution",
    );
    const hasDpfCreditDistribution = fields.some(
        (field) => field.fieldname === "dpf_credit_distributions",
    );
    const piOptions =
        linkOptions.select_copi_id ||
        linkOptions.principal_investigator ||
        linkOptions.User ||
        [];
    const departmentOptions =
        linkOptions.select_dpf_dept_center_school ||
        linkOptions.Department_prornd ||
        [];

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <header className="mb-8 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <ArrowLeftIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            New Deposit Slip
                        </h1>
                        {selectedType && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                {DEPOSIT_SLIP_TYPES[selectedType]?.label}
                            </p>
                        )}
                    </div>
                </div>
            </header>

            {/* Deposit Slip Type Selector */}
            <FrappeCard className="mb-8">
                <div className="space-y-3">
                    <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Select Deposit Slip Type{" "}
                        <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <select
                            value={selectedType}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            className="w-full h-14 px-4 pr-12 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] appearance-none"
                        >
                            <option value="">
                                -- Select Deposit Slip Type --
                            </option>
                            {Object.entries(DEPOSIT_SLIP_TYPES).map(
                                ([key, config]) => (
                                    <option key={key} value={key}>
                                        {config.label}
                                    </option>
                                ),
                            )}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                    </div>
                </div>
            </FrappeCard>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-24">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D97757] mx-auto"></div>
                        <p className="mt-4 text-lg font-semibold text-zinc-600 dark:text-zinc-400">
                            Loading form fields...
                        </p>
                    </div>
                </div>
            )}

            {/* Form Content */}
            {!loading && selectedType && fields.length > 0 && (
                <form onSubmit={handleSubmit}>
                    <FrappeCard className="space-y-12">
                        {sections.map((section, index) => {
                            if (
                                section.sectionField &&
                                !checkDependency(section.sectionField)
                            )
                                return null;

                            return (
                                <NeoSection key={index} title={section.title}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {section.fields.map(renderFormField)}
                                    </div>
                                </NeoSection>
                            );
                        })}

                        {/* ECS Dates Table — React-managed */}
                        <NeoSection title="ECS Dates">
                            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                        <tr>
                                            {[
                                                "Date",
                                                "Amount (₹)",
                                                "Remarks",
                                                "",
                                            ].map((h) => (
                                                <th
                                                    key={h}
                                                    className="p-3 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                        {ecsDates.map((row, idx) => (
                                            <tr key={row.id}>
                                                <td className="p-2">
                                                    <input
                                                        type="date"
                                                        className={inputClasses}
                                                        value={row.ecs_date}
                                                        onChange={(e) => {
                                                            const newRows = [
                                                                ...ecsDates,
                                                            ];
                                                            newRows[idx] = {
                                                                ...newRows[idx],
                                                                ecs_date:
                                                                    e.target
                                                                        .value,
                                                            };
                                                            setEcsDates(
                                                                newRows,
                                                            );
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        title="Enter a positive amount"
                                                        className={inputClasses}
                                                        placeholder="0.00"
                                                        value={row.amount}
                                                        onChange={(e) => {
                                                            const newRows = [
                                                                ...ecsDates,
                                                            ];
                                                            newRows[idx] = {
                                                                ...newRows[idx],
                                                                amount: e.target
                                                                    .value,
                                                            };
                                                            setEcsDates(
                                                                newRows,
                                                            );
                                                        }}
                                                        onWheel={
                                                            preventScrollChange
                                                        }
                                                        onWheelCapture={
                                                            preventScrollChange
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (["e", "E", "+", "-"].includes(e.key) || /[a-zA-Z]/.test(e.key)) {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        className={inputClasses}
                                                        placeholder="Remarks"
                                                        value={row.remarks}
                                                        onChange={(e) => {
                                                            const newRows = [
                                                                ...ecsDates,
                                                            ];
                                                            newRows[idx] = {
                                                                ...newRows[idx],
                                                                remarks:
                                                                    e.target
                                                                        .value,
                                                            };
                                                            setEcsDates(
                                                                newRows,
                                                            );
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setEcsDates(
                                                                (prev) =>
                                                                    prev.filter(
                                                                        (
                                                                            _,
                                                                            i,
                                                                        ) =>
                                                                            i !==
                                                                            idx,
                                                                    ),
                                                            )
                                                        }
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {ecsDates.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="p-6 text-center text-zinc-400 text-sm italic"
                                                >
                                                    No ECS dates added yet
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <FrappeButton
                                onClick={() =>
                                    setEcsDates((prev) => [
                                        ...prev,
                                        {
                                            id: generateId(),
                                            ecs_date: "",
                                            amount: "",
                                            remarks: "",
                                        },
                                    ])
                                }
                                className="mt-4"
                            >
                                <Plus className="h-4 w-4" /> Add Row
                            </FrappeButton>
                        </NeoSection>

                        {/* Credit Distribution Table — React-managed */}
                        <NeoSection title="Credit Distribution">
                            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                        <tr>
                                            {[
                                                "Label",
                                                "Percentage (%)",
                                                "Amount (₹)",
                                                "",
                                            ].map((h) => (
                                                <th
                                                    key={h}
                                                    className="p-3 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                        {creditDistribution.map((row, idx) => (
                                            <tr key={row.id}>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        className={inputClasses}
                                                        placeholder="Label"
                                                        value={row.label}
                                                        onChange={(e) => {
                                                            const newRows = [
                                                                ...creditDistribution,
                                                            ];
                                                            newRows[idx] = {
                                                                ...newRows[idx],
                                                                label: e.target
                                                                    .value,
                                                            };
                                                            setCreditDistribution(
                                                                newRows,
                                                            );
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        title="Enter a positive percentage"
                                                        className={inputClasses}
                                                        placeholder="%"
                                                        value={row.percentage}
                                                        onChange={(e) => {
                                                            const newRows = [
                                                                ...creditDistribution,
                                                            ];
                                                            newRows[idx] = {
                                                                ...newRows[idx],
                                                                percentage:
                                                                    e.target
                                                                        .value,
                                                            };
                                                            setCreditDistribution(
                                                                newRows,
                                                            );
                                                        }}
                                                        onWheel={
                                                            preventScrollChange
                                                        }
                                                        onWheelCapture={
                                                            preventScrollChange
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (["e", "E", "+", "-"].includes(e.key) || /[a-zA-Z]/.test(e.key)) {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        title="Enter a positive amount in ₹"
                                                        className={inputClasses}
                                                        placeholder="Amount"
                                                        value={row.amount}
                                                        onChange={(e) => {
                                                            const newRows = [
                                                                ...creditDistribution,
                                                            ];
                                                            newRows[idx] = {
                                                                ...newRows[idx],
                                                                amount: e.target
                                                                    .value,
                                                            };
                                                            setCreditDistribution(
                                                                newRows,
                                                            );
                                                        }}
                                                        onWheel={
                                                            preventScrollChange
                                                        }
                                                        onWheelCapture={
                                                            preventScrollChange
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (["e", "E", "+", "-"].includes(e.key) || /[a-zA-Z]/.test(e.key)) {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setCreditDistribution(
                                                                (prev) =>
                                                                    prev.filter(
                                                                        (
                                                                            _,
                                                                            i,
                                                                        ) =>
                                                                            i !==
                                                                            idx,
                                                                    ),
                                                            )
                                                        }
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {creditDistribution.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="p-6 text-center text-zinc-400 text-sm italic"
                                                >
                                                    No credit distribution added
                                                    yet
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <FrappeButton
                                onClick={() =>
                                    setCreditDistribution((prev) => [
                                        ...prev,
                                        {
                                            id: generateId(),
                                            label: "",
                                            percentage: "",
                                            amount: "",
                                        },
                                    ])
                                }
                                className="mt-4"
                            >
                                <Plus className="h-4 w-4" /> Add Row
                            </FrappeButton>
                        </NeoSection>

                        {hasPdfCreditDistribution && (
                            <NeoSection title="PDF Credit Distribution">
                                <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                                    <span>Auto split from total amount</span>
                                    <span>
                                        Total base: ₹
                                        {distributionBaseAmount.toLocaleString(
                                            "en-IN",
                                            { maximumFractionDigits: 2 },
                                        )}
                                    </span>
                                </div>
                                <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                            <tr>
                                                {[
                                                    "Select PI for PDF distribution",
                                                    "Employee Id",
                                                    "PDF % age",
                                                    "PDF Amount (₹)",
                                                    "",
                                                ].map((h) => (
                                                    <th
                                                        key={h}
                                                        className="p-3 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left"
                                                    >
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                            {pdfCreditDistribution.map(
                                                (row, idx) => (
                                                    <tr key={row.id}>
                                                        <td className="p-2" style={{ minWidth: 220 }}>
                                                            {(() => {
                                                                const selectedOpt = piOptions.find((o) => o.value === row.select_copi_id);
                                                                const displayValue = pdfPiOpen[idx]
                                                                    ? (pdfPiSearch[idx] ?? "")
                                                                    : selectedOpt
                                                                        ? `${selectedOpt.label}${selectedOpt.label !== selectedOpt.value ? ` (${selectedOpt.value})` : ""}`
                                                                        : (row.select_copi_id || "");
                                                                const filtered = piOptions.filter(
                                                                    (opt) => fuzzyMatch(opt.label, pdfPiSearch[idx] ?? "") || fuzzyMatch(opt.value, pdfPiSearch[idx] ?? "")
                                                                );
                                                                const pos = pdfPiDropdownPos[idx];
                                                                return (
                                                                    <>
                                                                        <input
                                                                            ref={(el) => { pdfPiInputRefs.current[idx] = el; }}
                                                                            type="text"
                                                                            className={inputClasses}
                                                                            placeholder="Search by name or email..."
                                                                            value={displayValue}
                                                                            onFocus={() => {
                                                                                const rect = pdfPiInputRefs.current[idx]?.getBoundingClientRect();
                                                                                if (rect) {
                                                                                    setPdfPiDropdownPos((prev) => ({
                                                                                        ...prev,
                                                                                        [idx]: { top: rect.bottom + window.scrollY + 2, left: rect.left + window.scrollX, width: rect.width },
                                                                                    }));
                                                                                }
                                                                                setPdfPiSearch((prev) => ({ ...prev, [idx]: "" }));
                                                                                setPdfPiOpen((prev) => ({ ...prev, [idx]: true }));
                                                                            }}
                                                                            onChange={(e) => {
                                                                                setPdfPiSearch((prev) => ({ ...prev, [idx]: e.target.value }));
                                                                                setPdfPiOpen((prev) => ({ ...prev, [idx]: true }));
                                                                            }}
                                                                        />
                                                                        {pdfPiOpen[idx] && pos && (
                                                                            <div
                                                                                data-pdf-pi-dropdown={idx}
                                                                                style={{ position: "fixed", top: pos.top, left: pos.left, width: Math.max(pos.width, 280), zIndex: 9999 }}
                                                                                className="max-h-56 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl"
                                                                            >
                                                                                {filtered.map((opt) => (
                                                                                    <button
                                                                                        key={opt.value}
                                                                                        type="button"
                                                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex flex-col"
                                                                                        onMouseDown={(e) => {
                                                                                            e.preventDefault();
                                                                                            const newRows = [...pdfCreditDistribution];
                                                                                            newRows[idx] = { ...newRows[idx], select_copi_id: opt.value };
                                                                                            setPdfCreditDistribution(newRows);
                                                                                            setPdfPiOpen((prev) => ({ ...prev, [idx]: false }));
                                                                                            setPdfPiSearch((prev) => ({ ...prev, [idx]: "" }));
                                                                                        }}
                                                                                    >
                                                                                        <span className="font-medium text-zinc-800 dark:text-zinc-100">{opt.label !== opt.value ? opt.label : opt.value}</span>
                                                                                        {opt.label !== opt.value && (
                                                                                            <span className="text-xs text-zinc-400 dark:text-zinc-500">{opt.value}</span>
                                                                                        )}
                                                                                    </button>
                                                                                ))}
                                                                                {filtered.length === 0 && (
                                                                                    <p className="px-3 py-2 text-sm text-zinc-400 dark:text-zinc-500">No results found</p>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                className={
                                                                    inputClasses
                                                                }
                                                                placeholder="Employee Id"
                                                                value={
                                                                    row.employee_id
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const newRows =
                                                                        [
                                                                            ...pdfCreditDistribution,
                                                                        ];
                                                                    newRows[
                                                                        idx
                                                                    ] = {
                                                                        ...newRows[
                                                                            idx
                                                                        ],
                                                                        employee_id:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    };
                                                                    setPdfCreditDistribution(
                                                                        newRows,
                                                                    );
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className={
                                                                    inputClasses
                                                                }
                                                                placeholder="%"
                                                                value={
                                                                    row.pdf_percentage
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const newRows =
                                                                        [
                                                                            ...pdfCreditDistribution,
                                                                        ];
                                                                    newRows[
                                                                        idx
                                                                    ] = {
                                                                        ...newRows[
                                                                            idx
                                                                        ],
                                                                        pdf_percentage:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    };
                                                                    setPdfCreditDistribution(
                                                                        recalculateDistributionAmounts(
                                                                            newRows,
                                                                            "pdf_percentage",
                                                                            "pdf_amount",
                                                                            distributionBaseAmount,
                                                                        ),
                                                                    );
                                                                }}
                                                                onWheel={
                                                                    preventScrollChange
                                                                }
                                                                onWheelCapture={
                                                                    preventScrollChange
                                                                }
                                                                min="0"
                                                                title="Enter a positive percentage"
                                                                onKeyDown={(e) => {
                                                                    if (["e", "E", "+", "-"].includes(e.key) || /[a-zA-Z]/.test(e.key)) {
                                                                        e.preventDefault();
                                                                    }
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className={
                                                                    inputClasses
                                                                }
                                                                placeholder="Amount"
                                                                value={
                                                                    row.pdf_amount
                                                                }
                                                                readOnly
                                                                disabled
                                                                onWheel={
                                                                    preventScrollChange
                                                                }
                                                                onWheelCapture={
                                                                    preventScrollChange
                                                                }
                                                            />
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const nextRows =
                                                                        pdfCreditDistribution.filter(
                                                                            (
                                                                                _,
                                                                                i,
                                                                            ) =>
                                                                                i !==
                                                                                idx,
                                                                        );
                                                                    setPdfCreditDistribution(
                                                                        splitDistributionRows(
                                                                            nextRows,
                                                                            "pdf_percentage",
                                                                            "pdf_amount",
                                                                            distributionBaseAmount,
                                                                            PDF_DPF_TOTAL_PERCENTAGE,
                                                                        ),
                                                                    );
                                                                }}
                                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                            {pdfCreditDistribution.length ===
                                                0 && (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="p-6 text-center text-zinc-400 text-sm italic"
                                                    >
                                                        No PDF credit
                                                        distribution rows added
                                                        yet
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <FrappeButton
                                    onClick={() => {
                                        const nextRows = [
                                            ...pdfCreditDistribution,
                                            {
                                                id: generateId(),
                                                select_copi_id: "",
                                                employee_id: "",
                                                pdf_percentage: "",
                                                pdf_amount: "",
                                            },
                                        ];
                                        setPdfCreditDistribution(
                                            splitDistributionRows(
                                                nextRows,
                                                "pdf_percentage",
                                                "pdf_amount",
                                                distributionBaseAmount,
                                                PDF_DPF_TOTAL_PERCENTAGE,
                                            ),
                                        );
                                    }}
                                    className="mt-4"
                                >
                                    <Plus className="h-4 w-4" /> Add Row
                                </FrappeButton>
                            </NeoSection>
                        )}

                        {hasDpfCreditDistribution && (
                            <NeoSection title="DPF Credit Distribution">
                                <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                                    <span>Auto split from total amount</span>
                                    <span>
                                        Total base: ₹
                                        {distributionBaseAmount.toLocaleString(
                                            "en-IN",
                                            { maximumFractionDigits: 2 },
                                        )}
                                    </span>
                                </div>
                                <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                            <tr>
                                                {[
                                                    "Department/Center/School",
                                                    "Department Id",
                                                    "DPF % age",
                                                    "DPF Amount (₹)",
                                                    "",
                                                ].map((h) => (
                                                    <th
                                                        key={h}
                                                        className="p-3 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left"
                                                    >
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                            {dpfCreditDistributions.map(
                                                (row, idx) => (
                                                    <tr key={row.id}>
                                                        <td className="p-2">
                                                            <select
                                                                className={
                                                                    inputClasses
                                                                }
                                                                value={
                                                                    row.select_dpf_dept_center_school
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const newRows =
                                                                        [
                                                                            ...dpfCreditDistributions,
                                                                        ];
                                                                    newRows[
                                                                        idx
                                                                    ] = {
                                                                        ...newRows[
                                                                            idx
                                                                        ],
                                                                        select_dpf_dept_center_school:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    };
                                                                    setDpfCreditDistributions(
                                                                        newRows,
                                                                    );
                                                                }}
                                                            >
                                                                <option value="">
                                                                    Select
                                                                    Department...
                                                                </option>
                                                                {departmentOptions.map(
                                                                    (opt) => (
                                                                        <option
                                                                            key={
                                                                                opt.value
                                                                            }
                                                                            value={
                                                                                opt.value
                                                                            }
                                                                        >
                                                                            {
                                                                                opt.label
                                                                            }
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                className={
                                                                    inputClasses
                                                                }
                                                                placeholder="Department Id"
                                                                value={
                                                                    row.department_id
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const newRows =
                                                                        [
                                                                            ...dpfCreditDistributions,
                                                                        ];
                                                                    newRows[
                                                                        idx
                                                                    ] = {
                                                                        ...newRows[
                                                                            idx
                                                                        ],
                                                                        department_id:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    };
                                                                    setDpfCreditDistributions(
                                                                        newRows,
                                                                    );
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className={
                                                                    inputClasses
                                                                }
                                                                placeholder="%"
                                                                value={
                                                                    row.dpf_percentage
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const newRows =
                                                                        [
                                                                            ...dpfCreditDistributions,
                                                                        ];
                                                                    newRows[
                                                                        idx
                                                                    ] = {
                                                                        ...newRows[
                                                                            idx
                                                                        ],
                                                                        dpf_percentage:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    };
                                                                    setDpfCreditDistributions(
                                                                        recalculateDistributionAmounts(
                                                                            newRows,
                                                                            "dpf_percentage",
                                                                            "dpf_amount",
                                                                            distributionBaseAmount,
                                                                        ),
                                                                    );
                                                                }}
                                                                onWheel={
                                                                    preventScrollChange
                                                                }
                                                                onWheelCapture={
                                                                    preventScrollChange
                                                                }
                                                                min="0"
                                                                title="Enter a positive percentage"
                                                                onKeyDown={(e) => {
                                                                    if (["e", "E", "+", "-"].includes(e.key) || /[a-zA-Z]/.test(e.key)) {
                                                                        e.preventDefault();
                                                                    }
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className={
                                                                    inputClasses
                                                                }
                                                                placeholder="Amount"
                                                                value={
                                                                    row.dpf_amount
                                                                }
                                                                readOnly
                                                                disabled
                                                                onWheel={
                                                                    preventScrollChange
                                                                }
                                                                onWheelCapture={
                                                                    preventScrollChange
                                                                }
                                                            />
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const nextRows =
                                                                        dpfCreditDistributions.filter(
                                                                            (
                                                                                _,
                                                                                i,
                                                                            ) =>
                                                                                i !==
                                                                                idx,
                                                                        );
                                                                    setDpfCreditDistributions(
                                                                        splitDistributionRows(
                                                                            nextRows,
                                                                            "dpf_percentage",
                                                                            "dpf_amount",
                                                                            distributionBaseAmount,
                                                                            PDF_DPF_TOTAL_PERCENTAGE,
                                                                        ),
                                                                    );
                                                                }}
                                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                            {dpfCreditDistributions.length ===
                                                0 && (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="p-6 text-center text-zinc-400 text-sm italic"
                                                    >
                                                        No DPF credit
                                                        distribution rows added
                                                        yet
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <FrappeButton
                                    onClick={() => {
                                        const nextRows = [
                                            ...dpfCreditDistributions,
                                            {
                                                id: generateId(),
                                                select_dpf_dept_center_school:
                                                    "",
                                                department_id: "",
                                                dpf_percentage: "",
                                                dpf_amount: "",
                                            },
                                        ];
                                        setDpfCreditDistributions(
                                            splitDistributionRows(
                                                nextRows,
                                                "dpf_percentage",
                                                "dpf_amount",
                                                distributionBaseAmount,
                                                PDF_DPF_TOTAL_PERCENTAGE,
                                            ),
                                        );
                                    }}
                                    className="mt-4"
                                >
                                    <Plus className="h-4 w-4" /> Add Row
                                </FrappeButton>
                            </NeoSection>
                        )}
                    </FrappeCard>

                    {/* Prominent Action Buttons */}
                    <div className="mt-8 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                        <div className="flex justify-end gap-4">
                            <FrappeButton
                                type="button"
                                onClick={() => navigate(-1)}
                                className="hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                Cancel
                            </FrappeButton>
                            <FrappeButton
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-zinc-100 dark:bg-zinc-800"
                            >
                                <Save className="h-4 w-4" />
                                {isSubmitting ? "Saving..." : "Save as Draft"}
                            </FrappeButton>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#D97757] hover:bg-[#c5684a] text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="h-4 w-4" />
                                {isSubmitting
                                    ? "Submitting..."
                                    : "Submit Deposit Slip"}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* No Type Selected */}
            {!loading && !selectedType && (
                <FrappeCard className="text-center py-20">
                    <p className="text-lg text-zinc-500 dark:text-zinc-400">
                        Please select a deposit slip type to continue.
                    </p>
                </FrappeCard>
            )}

            {/* No Fields Loaded */}
            {!loading && selectedType && fields.length === 0 && (
                <FrappeCard className="text-center py-20">
                    <p className="text-lg font-semibold text-yellow-600">
                        No form fields found for this deposit slip type.
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                        Please check the backend API configuration.
                    </p>
                </FrappeCard>
            )}
        </div>
    );
};

export default DepositSlipForm;
