// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= new design

import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { cn } from "@/lib/utils";
import { AutocompleteEmail } from "@/components/AutocompleteEmail";

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string;
    label: string | null;
    fieldtype: string;
    mandatory: boolean;
    read_only: boolean;
    hidden: boolean;
    options?: string | null;
    description?: string | null;
}

interface LinkOption {
    value: string;
    label: string;
}

interface FormData {
    [key: string]: any;
}

interface UniversalFormProps {
    fields: Field[];
    linkOptions: Record<string, LinkOption[]>;
    initialData?: FormData;
    onSubmit: (data: FormData) => Promise<void>;
    submitButtonText?: string;
    title?: string;
    sections?: SectionConfig[];
    isSubmitting?: boolean;
    customTableComponents?: Record<string, React.ComponentType<any>>;
}

interface SectionConfig {
    title: string;
    fields: string[];
    type?: "default" | "table";
    tableConfig?: TableConfig;
}

interface TableConfig {
    fieldname: string;
    columns: Array<{
        key: string;
        label: string;
        type: string;
        options?: string[];
    }>;
    newRowTemplate: Record<string, any>;
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const inputClasses =
    "w-full h-10 px-3 bg-white dark:bg-[#27272A] border-[1.5px] border-[#E4E4E7] dark:border-[#3F3F46] " +
    "rounded-[0.4375rem] text-[13px] font-semibold text-[#27272A] dark:text-[#F4F4F5] " +
    "placeholder:text-zinc-400 dark:placeholder:text-zinc-500 " +
    "focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 focus:border-[#4A6CF7] " +
    "disabled:opacity-100 disabled:bg-[#FAFAF9] dark:disabled:bg-[#27272A]/50 disabled:text-[#27272A] dark:disabled:text-[#F4F4F5] " +
    "transition-colors duration-150";

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

const formatFieldLabel = (field: Pick<Field, "fieldname" | "label">) => {
    const raw = FIELD_LABEL_OVERRIDES[field.fieldname] || field.label || field.fieldname;
    if (FIELD_LABEL_OVERRIDES[field.fieldname]) return raw;

    return raw
        .replace(/^ss_/i, "")
        .replace(/^p11_/i, "P-11 ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const FieldLabel = ({
    field,
}: {
    field: Pick<Field, "fieldname" | "label" | "mandatory">;
}) => (
    <label
        htmlFor={field.fieldname}
        className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"
    >
        <span className="truncate">{formatFieldLabel(field)}</span>
        {!!field.mandatory && (
            <span className="text-red-500 ml-1 normal-case font-bold">*</span>
        )}
    </label>
);

const FrappeCard = ({ children, className }: any) => (
    <div
        className={cn(
            "bg-white dark:bg-[#27272A] p-6 md:p-8 border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm",
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
            "inline-flex items-center justify-center gap-1.5 h-9 px-5",
            "border border-[#E4E4E7] dark:border-[#3F3F46] rounded-[0.4375rem]",
            "text-[11px] font-bold uppercase tracking-wide",
            "text-[#3F3F46] dark:text-[#E4E4E7] bg-white dark:bg-[#27272A]",
            "transition-all duration-150",
            "hover:bg-[#FAFAF9] dark:hover:bg-[#3F3F46] hover:border-zinc-400 hover:shadow-sm",
            "active:translate-y-0 active:shadow-none",
            "disabled:opacity-45 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
            className,
        )}
    >
        {children}
    </button>
);

const NeoSection = ({ title, children }: any) => {
    if (!title) return <>{children}</>;

    return (
        <div className="form-section-card">
            <div className="form-section-header">
                <div className="form-section-header-accent" />
                <h2 className="form-section-title">{title}</h2>
            </div>
            <div className="form-section-body">{children}</div>
        </div>
    );
};

// --- MEMOIZED FORM FIELD COMPONENT (WITH HTML RENDERING) ---
const MemoizedFormField = memo(({ field, value, options, onChange }: any) => {
    if (!field || field.hidden) return null;

    // Section breaks are structural here. Section titles are rendered by NeoSection,
    // so rendering the field itself creates duplicate headers.
    if (field.fieldtype === "Section Break") {
        return null;
    }

    const displayLabel = formatFieldLabel(field);

    // Handle Column Break - skip rendering
    if (field.fieldtype === "Column Break") {
        return null;
    }

    const commonProps = {
        id: field.fieldname,
        name: field.fieldname,
        className: inputClasses,
        readOnly: field.read_only,
        required: field.mandatory,
        disabled: field.read_only,
    };

    const renderInput = () => {
        switch (field.fieldtype) {
            case "HTML":
                return (
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg min-h-[8rem]">
                        <div
                            className="prose prose-sm dark:prose-invert max-w-none text-zinc-900 dark:text-zinc-100 font-bold"
                            dangerouslySetInnerHTML={{
                                __html: field.options || value || "",
                            }}
                        />
                    </div>
                );
            case "Link":
            case "Dynamic Link":
                if (field.fieldname === "principal_investigator") {
                    return (
                        <AutocompleteEmail
                            id={field.fieldname}
                            name={field.fieldname}
                            className={inputClasses}
                            value={value || ""}
                            onChange={(val) => onChange(field.fieldname, val)}
                            options={options || []}
                            placeholder={`Search ${displayLabel.toLowerCase()}...`}
                            readOnly={field.read_only}
                            required={field.mandatory}
                            disabled={field.read_only}
                            searchByLabel
                            showAllOnFocus
                            displayOnlyLabel
                        />
                    );
                }
                return (
                    <select
                        {...commonProps}
                        value={value || ""}
                        onChange={(e) =>
                            onChange(field.fieldname, e.target.value)
                        }
                    >
                        <option value="">Select...</option>
                        {(options || []).map((opt: any) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );
            case "Select":
                const selectOptions =
                    field.options?.split("\n").filter(Boolean) || [];
                return (
                    <select
                        {...commonProps}
                        value={value || ""}
                        onChange={(e) =>
                            onChange(field.fieldname, e.target.value)
                        }
                    >
                        <option value="">Select...</option>
                        {selectOptions.map((opt: string) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                );
            case "Date":
                return (
                    <input
                        type="date"
                        {...commonProps}
                        value={value || ""}
                        onChange={(e) =>
                            onChange(field.fieldname, e.target.value)
                        }
                    />
                );
            case "Text Editor":
            case "Small Text":
            case "Long Text":
                return (
                    <textarea
                        {...commonProps}
                        value={value || ""}
                        onChange={(e) =>
                            onChange(field.fieldname, e.target.value)
                        }
                        rows={4}
                        className={cn(inputClasses, "!h-auto py-3")}
                    />
                );
            case "Attach":
                return (
                    <input
                        type="file"
                        className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-[#F4F4F5] dark:file:bg-[#3F3F46] file:text-[#3F3F46] dark:file:text-[#E4E4E7] hover:file:bg-[#E4E4E7] dark:hover:file:bg-[#52525B]`}
                        onChange={(e) =>
                            onChange(
                                field.fieldname,
                                e.target.files?.[0] || null,
                            )
                        }
                    />
                );
            default:
                return (
                    <input
                        type="text"
                        {...commonProps}
                        value={value || ""}
                        onChange={(e) =>
                            onChange(field.fieldname, e.target.value)
                        }
                        placeholder={`${displayLabel}...`}
                    />
                );
        }
    };

    return (
        <div className="min-w-0 space-y-2">
            <FieldLabel field={field} />
            {renderInput()}
            {!!field.description && (
                <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-1 leading-relaxed">
                    {field.description}
                </p>
            )}
        </div>
    );
});

// --- GENERIC TABLE COMPONENT (REFINED STYLING) ---
const MemoizedGenericTable = memo(
    ({
        title,
        tableName,
        columns,
        newRow,
        tableData,
        onRowChange,
        onAddRow,
        onDeleteRow,
    }: any) => {
        const renderCell = (col: any, row: any, i: number) => {
            if (col.type === "UserAutocomplete") {
                return (
                    <AutocompleteEmail
                        className={`${inputClasses} !h-8 text-xs`}
                        value={row[col.key] || ""}
                        onChange={(val) => onRowChange(tableName, i, col.key, val)}
                        options={col.options || []}
                        placeholder="Search by name or email..."
                        searchByLabel
                        showAllOnFocus
                    />
                );
            }

            if (
                col.type === "Link" ||
                col.type === "Dynamic Link" ||
                col.type === "Select"
            ) {
                return (
                    <select
                        className={`${inputClasses} !h-8 text-xs`}
                        value={row[col.key] || ""}
                        onChange={(e) =>
                            onRowChange(tableName, i, col.key, e.target.value)
                        }
                    >
                        <option value="">Select...</option>
                        {(col.options || []).map((opt: any) => {
                            const val =
                                typeof opt === "object" ? opt.value : opt;
                            const lbl =
                                typeof opt === "object" ? opt.label : opt;
                            return (
                                <option key={val} value={val}>
                                    {lbl}
                                </option>
                            );
                        })}
                    </select>
                );
            }

            if (col.type === "Date") {
                return (
                    <input
                        type="date"
                        className={`${inputClasses} !h-8 text-xs`}
                        value={row[col.key] || ""}
                        onChange={(e) =>
                            onRowChange(tableName, i, col.key, e.target.value)
                        }
                    />
                );
            }

            const type =
                col.type === "Currency" ||
                col.type === "Float" ||
                col.type === "Int"
                    ? "number"
                    : "text";
            return (
                <input
                    type={type}
                    className={`${inputClasses} !h-8 text-xs`}
                    value={row[col.key] || ""}
                    onChange={(e) =>
                        onRowChange(tableName, i, col.key, e.target.value)
                    }
                />
            );
        };

        return (
            <NeoSection title={title}>
                <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                    <table className="min-w-full">
                        <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                            <tr>
                                {[
                                    ...columns,
                                    { key: "actions", label: "" },
                                ].map((c: any) => (
                                    <th
                                        key={c.key}
                                        className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25 last:border-r-0"
                                    >
                                        {c.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46] bg-white dark:bg-[#27272A]">
                            {(tableData || []).map((row: any, i: number) => (
                                <tr
                                    key={row.id || i}
                                    className="hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]/40 transition-colors"
                                >
                                    {columns.map((col: any) => (
                                        <td
                                            key={col.key}
                                            className="px-3 py-2 min-w-[140px] border-r border-[#F4F4F5] dark:border-[#3F3F46]/80 last:border-r-0"
                                        >
                                            {renderCell(col, row, i)}
                                        </td>
                                    ))}
                                    <td className="px-3 py-2 text-center w-[80px]">
                                        <FrappeButton
                                            onClick={() =>
                                                onDeleteRow(tableName, i)
                                            }
                                            className="!py-1 text-xs bg-red-50 border-red-200 hover:bg-red-100 text-red-600 w-full"
                                        >
                                            Delete
                                        </FrappeButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <FrappeButton
                    onClick={() => onAddRow(tableName, newRow)}
                    className="mt-3 h-9 px-4 bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#1E3A8A] border border-[#C7D2FE] shadow-none text-[11px] font-extrabold uppercase tracking-wide"
                >
                    + Add Row
                </FrappeButton>
            </NeoSection>
        );
    },
);

// --- UNIVERSAL FORM RENDERER ---
export const FormRender: React.FC<
    UniversalFormProps & {
        noCard?: boolean;
        onCancel?: () => void;
        onFormChange?: (data: FormData) => void;
        hideActions?: boolean;
    }
> = ({
    fields,
    linkOptions,
    initialData = {},
    onSubmit,
    submitButtonText = "Submit",
    title = "Form",
    sections,
    isSubmitting = false,
    customTableComponents = {},
    noCard = false,
    onCancel,
    onFormChange,
    hideActions = false,
}) => {
    const [formData, setFormData] = useState<FormData>(initialData);

    // Track the last data we emitted to the parent (or received and accepted)
    const lastEmittedDataRef = useRef(initialData);
    // When true, the next formData change was caused by accepting parent data
    // and should NOT be re-emitted back to the parent (prevents loops).
    const suppressEmitRef = useRef(false);

    useEffect(() => {
        // Accept incoming initialData if it genuinely differs from what we last emitted.
        // This catches external updates (e.g., calculation hooks updating child tables).
        const incomingJson = JSON.stringify(initialData);
        const emittedJson = JSON.stringify(lastEmittedDataRef.current);
        if (incomingJson !== emittedJson) {
            suppressEmitRef.current = true; // Don't re-emit this back to parent
            setFormData(initialData);
            lastEmittedDataRef.current = initialData;
        }
    }, [initialData]);

    // Notify parent of changes
    useEffect(() => {
        // Skip emitting if this change came from accepting parent data
        if (suppressEmitRef.current) {
            suppressEmitRef.current = false;
            return;
        }
        if (onFormChange) {
            if (
                JSON.stringify(formData) !==
                JSON.stringify(lastEmittedDataRef.current)
            ) {
                lastEmittedDataRef.current = formData;
                onFormChange(formData);
            }
        }
    }, [formData, onFormChange]);

    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData((prev) => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleTableRowChange = useCallback(
        (
            tableName: string,
            rowIndex: number,
            fieldname: string,
            value: any,
        ) => {
            setFormData((prev) => {
                const table = [...(prev[tableName] || [])];
                table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
                return { ...prev, [tableName]: table };
            });
        },
        [],
    );

    const handleFileChange = useCallback(
        (
            tableName: string,
            rowIndex: number,
            fieldname: string,
            file: File | null,
        ) => {
            setFormData((prev) => {
                const table = [...(prev[tableName] || [])];
                table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
                return { ...prev, [tableName]: table };
            });
        },
        [],
    );

    const addTableRow = useCallback((tableName: string, newRow: object) => {
        const newId = Date.now().toString();
        setFormData((prev) => ({
            ...prev,
            [tableName]: [...(prev[tableName] || []), { ...newRow, id: newId }],
        }));
    }, []);

    const deleteTableRow = useCallback(
        (tableName: string, rowIndex: number) => {
            setFormData((prev) => ({
                ...prev,
                [tableName]: (prev[tableName] || []).filter(
                    (_: any, i: number) => i !== rowIndex,
                ),
            }));
        },
        [],
    );

    const renderField = useCallback(
        (fieldname: string) => {
            const field = fields.find((f) => f.fieldname === fieldname);
            if (!field) return null;
            return (
                <MemoizedFormField
                    key={field.fieldname}
                    field={field}
                    value={formData[field.fieldname]}
                    options={linkOptions[field.fieldname]}
                    onChange={handleChange}
                />
            );
        },
        [fields, formData, linkOptions, handleChange],
    );

    const handleSubmitClick = async () => {
        await onSubmit(formData);
    };

    const renderSection = (section: SectionConfig, index: number) => {
        if (section.type === "table" && section.tableConfig) {
            const CustomTable =
                customTableComponents[section.tableConfig.fieldname];
            if (CustomTable) {
                return (
                    <CustomTable
                        key={index}
                        formData={formData}
                        tableConfig={section.tableConfig}
                        onRowChange={handleTableRowChange}
                        onFileChange={handleFileChange}
                        onAddRow={addTableRow}
                        onDeleteRow={deleteTableRow}
                    />
                );
            }
            return (
                <MemoizedGenericTable
                    key={index}
                    title={section.title}
                    tableName={section.tableConfig.fieldname}
                    columns={section.tableConfig.columns}
                    newRow={section.tableConfig.newRowTemplate}
                    tableData={formData[section.tableConfig.fieldname]}
                    onRowChange={handleTableRowChange}
                    onFileChange={handleFileChange}
                    onAddRow={addTableRow}
                    onDeleteRow={deleteTableRow}
                />
            );
        }

        return (
            <NeoSection key={index} title={section.title}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.fields.map((fieldname) => renderField(fieldname))}
                </div>
            </NeoSection>
        );
    };

    const Content = (
        <div className="space-y-6">
            {sections ? (
                sections.map((section, index) => renderSection(section, index))
            ) : (
                <NeoSection title={title}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fields.map((field) => renderField(field.fieldname))}
                    </div>
                </NeoSection>
            )}
        </div>
    );

    return (
        <div>
            {noCard ? (
                Content
            ) : (
                <FrappeCard className="space-y-6">{Content}</FrappeCard>
            )}

            {!hideActions && (
                <div className="mt-8 flex justify-end gap-3">
                    {onCancel && (
                        <FrappeButton
                            onClick={onCancel}
                            className="border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#FAFAF9] dark:hover:bg-[#3F3F46]"
                        >
                            Cancel
                        </FrappeButton>
                    )}
                    <FrappeButton
                        onClick={handleSubmitClick}
                        disabled={isSubmitting}
                        className="bg-[#4A6CF7] hover:bg-blue-700 text-white border-[#4A6CF7]/20 shadow-sm hover:shadow-md hover:shadow-blue-500/20"
                    >
                        {isSubmitting ? "Submitting..." : submitButtonText}
                    </FrappeButton>
                </div>
            )}
        </div>
    );
};

export default FormRender;
