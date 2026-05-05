// Multi-Doctype Deposit Slip Form — Redesigned
import React, { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
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
];
const PDF_DPF_TOTAL_PERCENTAGE = 25;

const parseNumericValue = (value: any): number => {
    const parsed = parseFloat(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumericInput = (value: number): string => {
    if (!Number.isFinite(value) || value === 0) return "0";
    return Number(value.toFixed(2)).toString();
};

const roundToTwo = (value: number): number => Number(value.toFixed(2));

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

    const generateId = () =>
        `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
        setEcsDates([]);
        setCreditDistribution([]);
        setPdfCreditDistribution([]);
        setDpfCreditDistributions([]);
        setLoading(true);

        if (!type || !DEPOSIT_SLIP_TYPES[type]) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(
                `/api/method/${DEPOSIT_SLIP_TYPES[type].getFields}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        doc_name: fundReceivedName || undefined,
                    }),
                },
            );
            const result = await response.json();

            if (result?.message) {
                const {
                    fields: apiFields,
                    link_options,
                    prefill_data,
                } = result.message;

                if (Array.isArray(apiFields)) {
                    const processedFields = apiFields.map((field) => {
                        if (
                            field.fieldtype === "Section Break" ||
                            field.fieldtype === "SectionBreak"
                        )
                            return field;
                        if (
                            prefill_data &&
                            prefill_data[field.fieldname] !== undefined
                        ) {
                            return {
                                ...field,
                                default: prefill_data[field.fieldname],
                            };
                        }
                        return field;
                    });
                    setFields(processedFields);

                    const initialValues: Record<string, any> = {};
                    processedFields.forEach((f) => {
                        if (f.default) initialValues[f.fieldname] = f.default;
                    });
                    setFormValues(initialValues);
                }
                setLinkOptions((prev) => ({
                    ...prev,
                    ...(link_options || {}),
                }));

                // Fetch missing link options for known field requirements
                const missingDoctypes = [
                    "Department_prornd",
                    "User",
                    "Budget Head",
                ];
                for (const dt of missingDoctypes) {
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
                                        limit_page_length: 0,
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
            console.error("Failed to load form fields:", err);
            alert("Error loading form fields. Please try again.");
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

    // Fields that should always be read-only
    const readOnlyFieldNames = [
        "project_title",
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

        const forceReadOnly = readOnlyFieldNames.includes(field.fieldname);
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
        linkOptions.select_copi_id || linkOptions.principal_investigator || [];
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
                                                        <td className="p-2">
                                                            <select
                                                                className={
                                                                    inputClasses
                                                                }
                                                                value={
                                                                    row.select_copi_id
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
                                                                        select_copi_id:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    };
                                                                    setPdfCreditDistribution(
                                                                        newRows,
                                                                    );
                                                                }}
                                                            >
                                                                <option value="">
                                                                    Select PI...
                                                                </option>
                                                                {piOptions.map(
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
