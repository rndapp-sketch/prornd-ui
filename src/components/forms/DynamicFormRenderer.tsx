import React, { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    isFieldVisible,
    isFieldMandatory,
    isFieldReadOnly as checkFieldReadOnly,
    evaluateExpression,
} from "@/utils/evalExpression";
import { ChildTableComponent, type ChildField } from "./ChildTableComponent";
import { DepartmentName } from "@/components/DepartmentName";

// --- TYPE DEFINITIONS ---
export interface FormField {
    fieldname: string;
    label: string | null;
    fieldtype: string;
    mandatory?: boolean | number;
    read_only?: boolean | number;
    hidden?: boolean | number;
    options?: string | null;
    description?: string | null;
    default?: any;
    depends_on?: string;
    mandatory_depends_on?: string;
    read_only_depends_on?: string;
    child_fields?: ChildField[];
}

export interface LinkOption {
    value: string;
    label: string;
}

export interface FormSection {
    title: string;
    description?: string | null;
    fields: FormField[];
    collapsed?: boolean;
    depends_on?: string;
    hidden?: boolean | number | string;
}

export interface DynamicFormRendererProps {
    fields: FormField[];
    formData: Record<string, any>;
    linkOptions: Record<string, LinkOption[]>;
    onChange: (fieldname: string, value: any) => void;
    onFileChange: (fieldname: string, file: File | null) => void;
    onTableRowChange: (
        tableName: string,
        rowIndex: number,
        fieldname: string,
        value: any,
    ) => void;
    onTableFileChange: (
        tableName: string,
        rowIndex: number,
        fieldname: string,
        file: File | null,
    ) => void;
    onAddTableRow: (tableName: string, newRow: Record<string, any>) => void;
    onDeleteTableRow: (tableName: string, rowIndex: number) => void;
    onFieldChangeWithSideEffects?: (fieldname: string, value: any) => void;
    onTableLinkChange?: (tableName: string, rowIndex: number, fieldname: string, value: string) => void;
    readOnly?: boolean;
}

// --- STYLES ---
const inputClasses =
    "flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#27272A] px-3 py-2 text-sm ring-offset-white dark:ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 dark:focus-visible:ring-zinc-800 focus-visible:border-zinc-400 dark:focus-visible:border-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:disabled:bg-zinc-800/50 disabled:text-zinc-900 dark:disabled:text-zinc-100 transition-all duration-200";

// --- MEMOIZED FORM FIELD COMPONENT ---
const MemoizedFormField = memo(
    ({
        field,
        value,
        options,
        isMandatory,
        isReadOnly,
        onChange,
        onFileChange,
        onFieldChangeWithSideEffects,
    }: {
        field: FormField;
        value: any;
        options?: LinkOption[];
        isMandatory: boolean;
        isReadOnly: boolean;
        onChange: (fieldname: string, value: any) => void;
        onFileChange: (fieldname: string, file: File | null) => void;
        onFieldChangeWithSideEffects?: (fieldname: string, value: any) => void;
    }) => {
        if (!field.label && field.fieldtype !== "HTML" && field.fieldtype !== "Section Break") return null;

        const handleChange = (fieldname: string, val: any) => {
            if (onFieldChangeWithSideEffects) {
                onFieldChangeWithSideEffects(fieldname, val);
            } else {
                onChange(fieldname, val);
            }
        };

        const commonProps = {
            id: field.fieldname,
            name: field.fieldname,
            className: inputClasses,
            readOnly: isReadOnly,
            required: isMandatory,
            disabled: isReadOnly,
            value: value || "",
            onChange: (
                e: React.ChangeEvent<
                    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
                >,
            ) => handleChange(field.fieldname, e.target.value),
        };

        const renderInput = () => {
            switch (field.fieldtype) {
                case "Link":
                    // specific check: if options exist, render select. Else render text input (fallback for large link fields like User)
                    if (options && options.length > 0) {
                        return (
                            <div className="relative flex flex-col pt-1">
                                <div className="relative">
                                    <select
                                        {...commonProps}
                                        className={cn(
                                            commonProps.className || "",
                                            (field.fieldname === "department" ||
                                                field.fieldname === "department_for" ||
                                                field.fieldname === "upfa_department" ||
                                                field.fieldname === "implementation_department" ||
                                                field.fieldname === "applicant_department") && value
                                                ? "text-transparent focus:text-zinc-900 dark:focus:text-zinc-100 disabled:text-transparent dark:disabled:text-transparent bg-transparent relative z-10"
                                                : ""
                                        )}
                                    >
                                        <option value="">Select...</option>
                                        {options.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    {(field.fieldname === "department" ||
                                        field.fieldname === "department_for" ||
                                        field.fieldname === "upfa_department" ||
                                        field.fieldname === "implementation_department" ||
                                        field.fieldname === "applicant_department") &&
                                        value && (
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[calc(100%-2.5rem)] pointer-events-none z-20">
                                                <DepartmentName name={value} />
                                            </div>
                                        )}
                                </div>
                            </div>
                        );
                    }
                    // Fallback to text input for Link fields without loaded options (e.g., User, Project search)
                    return (
                        <div className="relative flex flex-col pt-1">
                            <div className="relative">
                                <input
                                    type="text"
                                    list={`list-${field.fieldname}`}
                                    {...commonProps}
                                    className={cn(
                                        inputClasses,
                                        (field.fieldname === "department" ||
                                            field.fieldname === "department_for" ||
                                            field.fieldname === "upfa_department" ||
                                            field.fieldname === "implementation_department" ||
                                            field.fieldname === "applicant_department") && value
                                            ? "text-transparent focus:text-zinc-900 dark:focus:text-zinc-100 placeholder:text-transparent focus:placeholder:text-zinc-400 disabled:text-transparent dark:disabled:text-transparent relative z-10"
                                            : "",
                                        "pr-10"
                                    )}
                                    placeholder={
                                        field.fieldtype === "Link" ? `Enter ${field.label}...` : ""
                                    }
                                />

                                {(field.fieldname === "department" ||
                                    field.fieldname === "department_for" ||
                                    field.fieldname === "upfa_department" ||
                                    field.fieldname === "implementation_department" ||
                                    field.fieldname === "applicant_department") && value ? (
                                    <>
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[calc(100%-2.5rem)] pointer-events-none z-20">
                                            <DepartmentName name={value} />
                                        </div>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 z-20">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                    </>
                                ) : (
                                    /* Optional: Add a subtle icon to indicate it's a link field */
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 z-20">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    );

                case "Select":
                    const selectOpts = field.options?.split("\n").filter(Boolean) || [];
                    return (
                        <select {...commonProps}>
                            <option value="">Select...</option>
                            {selectOpts.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    );

                case "Date":
                    return <input type="date" {...commonProps} />;

                case "Datetime":
                    return <input type="datetime-local" {...commonProps} />;

                case "Time":
                    return <input type="time" {...commonProps} />;

                case "Int":
                    return (
                        <input
                            type="number"
                            {...commonProps}
                            onChange={(e) => {
                                const val = e.target.value;
                                handleChange(
                                    field.fieldname,
                                    val === "" ? "" : parseInt(val, 10) || 0,
                                );
                            }}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        />
                    );

                case "Float":
                    return (
                        <input
                            type="number"
                            {...commonProps}
                            onChange={(e) => {
                                const val = e.target.value;
                                handleChange(
                                    field.fieldname,
                                    val === "" ? "" : parseFloat(val) || 0,
                                );
                            }}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        />
                    );

                case "Currency":
                    return (
                        <input
                            type="number"
                            {...commonProps}
                            onChange={(e) => {
                                const val = e.target.value;
                                // Round to 2 decimal places for currency
                                const numVal = parseFloat(val);
                                handleChange(
                                    field.fieldname,
                                    val === ""
                                        ? ""
                                        : isNaN(numVal)
                                            ? 0
                                            : Math.round(numVal * 100) / 100,
                                );
                            }}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        />
                    );

                case "Check":
                    // robust check for "1", 1, true, vs "0", 0, false, null
                    const isChecked = value === 1 || value === "1" || value === true;
                    return (
                        <label
                            className={cn(
                                "flex items-start gap-2 p-3 rounded-md border transition-all duration-200 cursor-pointer",
                                isChecked
                                    ? "bg-zinc-50 border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700"
                                    : "bg-white border-zinc-200 dark:bg-[#27272A] dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                            )}
                        >
                            <div className="relative flex items-center mt-0.5">
                                <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={isChecked}
                                    onChange={(e) =>
                                        handleChange(field.fieldname, e.target.checked ? 1 : 0)
                                    }
                                    disabled={isReadOnly}
                                />
                                <div className="w-4 h-4 border border-zinc-400 dark:border-zinc-500 rounded-sm peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-100 peer-checked:border-zinc-900 dark:peer-checked:border-zinc-100 transition-all focus-visible:ring-2 focus-visible:ring-zinc-100 dark:focus-visible:ring-zinc-800 focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-zinc-950"></div>
                                <svg
                                    className="absolute inset-0 w-4 h-4 text-white dark:text-zinc-900 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <span
                                className={cn(
                                    "text-sm font-medium leading-none text-zinc-700 dark:text-zinc-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none pt-0.5",
                                )}
                            >
                                {field.label}
                            </span>
                        </label>
                    );

                case "Small Text":
                case "Text":
                    return (
                        <textarea
                            {...commonProps}
                            rows={4}
                            className={cn(inputClasses, "h-auto py-3")}
                        />
                    );

                case "Text Editor":
                    return (
                        <textarea
                            {...commonProps}
                            rows={6}
                            className={cn(inputClasses, "h-auto py-3")}
                        />
                    );

                case "Attach":
                case "Attach Image":
                    // If there's an existing file URL, show it as a link
                    if (value && typeof value === "string") {
                        const fileName = value.split("/").pop() || "File";
                        return (
                            <div className="flex items-center gap-3">
                                <a
                                    href={value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-sm font-medium transition-colors h-10 ring-offset-white dark:ring-offset-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 dark:focus-visible:ring-zinc-800"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                    {fileName}
                                </a>
                                {!isReadOnly && (
                                    <input
                                        type="file"
                                        id={field.fieldname}
                                        name={field.fieldname}
                                        className={cn(
                                            inputClasses,
                                            "py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-medium file:bg-zinc-100 dark:bg-zinc-800 file:text-zinc-600 dark:text-zinc-400 hover:file:bg-zinc-200 dark:bg-zinc-700 file:transition-colors",
                                        )}
                                        onChange={(e) =>
                                            onFileChange(field.fieldname, e.target.files?.[0] || null)
                                        }
                                        accept={
                                            field.fieldtype === "Attach Image" ? "image/*" : undefined
                                        }
                                    />
                                )}
                            </div>
                        );
                    }
                    // No existing file, show file input (hidden in read-only mode)
                    if (isReadOnly) {
                        return (
                            <div className="text-zinc-400 dark:text-zinc-500 italic">
                                No file uploaded
                            </div>
                        );
                    }
                    return (
                        <input
                            type="file"
                            id={field.fieldname}
                            name={field.fieldname}
                            className={inputClasses}
                            onChange={(e) =>
                                onFileChange(field.fieldname, e.target.files?.[0] || null)
                            }
                            accept={
                                field.fieldtype === "Attach Image" ? "image/*" : undefined
                            }
                        />
                    );

                case "HTML":
                    return (
                        <div
                            className="prose prose-sm max-w-none text-zinc-900 dark:text-zinc-100 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: field.options || "" }}
                        />
                    );

                case "Read Only":
                    return (
                        <div className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100">
                            {(field.fieldname === "department" ||
                                field.fieldname === "department_for" ||
                                field.fieldname === "upfa_department" ||
                                field.fieldname === "implementation_department" ||
                                field.fieldname === "applicant_department") &&
                                value ? (
                                <DepartmentName name={value} />
                            ) : (
                                value || "-"
                            )}
                        </div>
                    );

                // ... (previous cases)

                case "Radio":
                    const radioOpts = field.options?.split("\n").filter(Boolean) || [];
                    return (
                        <div className="flex flex-col gap-3 mt-2">
                            {radioOpts.map((opt) => (
                                <label
                                    key={opt}
                                    className="flex items-center gap-3 cursor-pointer group"
                                >
                                    <div className="relative flex items-center">
                                        <input
                                            type="radio"
                                            name={field.fieldname}
                                            value={opt}
                                            checked={value === opt}
                                            onChange={(e) =>
                                                handleChange(field.fieldname, e.target.value)
                                            }
                                            disabled={isReadOnly}
                                            className="peer sr-only"
                                        />
                                        <div className="w-4 h-4 border border-zinc-400 dark:border-zinc-500 rounded-full peer-checked:border-zinc-900 dark:peer-checked:border-zinc-100 peer-checked:bg-white dark:peer-checked:bg-[#27272A] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-zinc-100 dark:focus-visible:ring-zinc-800 ring-offset-white dark:ring-offset-zinc-950 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 opacity-0 peer-checked:opacity-100 transition-opacity duration-200"></div>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium leading-none text-zinc-700 dark:text-zinc-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors">
                                        {opt}
                                    </span>
                                </label>
                            ))}
                        </div>
                    );

                case "Data":
                default:
                    return (
                        <div className="relative flex flex-col pt-1">
                            <div className="relative">
                                <input
                                    type="text"
                                    {...commonProps}
                                    className={cn(
                                        commonProps.className || "",
                                        (field.fieldname === "department" ||
                                            field.fieldname === "department_for" ||
                                            field.fieldname === "upfa_department" ||
                                            field.fieldname === "implementation_department" ||
                                            field.fieldname === "applicant_department") && value
                                            ? "text-transparent focus:text-zinc-900 dark:focus:text-zinc-100 placeholder:text-transparent focus:placeholder:text-zinc-400 disabled:text-transparent dark:disabled:text-transparent relative z-10"
                                            : ""
                                    )}
                                />
                                {(field.fieldname === "department" ||
                                    field.fieldname === "department_for" ||
                                    field.fieldname === "upfa_department" ||
                                    field.fieldname === "implementation_department" ||
                                    field.fieldname === "applicant_department") &&
                                    value && (
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[calc(100%-2.5rem)] pointer-events-none z-20">
                                            <DepartmentName name={value} />
                                        </div>
                                    )}
                            </div>
                        </div>
                    );
            }
        };

        // Checkbox has its own label rendering but still needs description
        if (field.fieldtype === "Check") {
            return (
                <div className="space-y-2">
                    {renderInput()}
                    {field.description && (
                        <p className="text-[0.8rem] text-zinc-500 dark:text-zinc-400 ml-6">
                            {field.description}
                        </p>
                    )}
                </div>
            );
        }

        // HTML fields don't need a label
        if (field.fieldtype === "HTML") {
            return <div className="col-span-full">{renderInput()}</div>;
        }

        return (
            <div className="space-y-2">
                <label
                    htmlFor={field.fieldname}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-700 dark:text-zinc-300 block mb-2"
                >
                    {field.label}
                    {isMandatory && (
                        <span className="text-red-500 dark:text-red-900 ml-1">*</span>
                    )}
                </label>
                {renderInput()}
                {field.description && (
                    <p className="text-[0.8rem] text-zinc-500 dark:text-zinc-400 mt-1">
                        {field.description}
                    </p>
                )}
            </div>
        );
    },
);

MemoizedFormField.displayName = "MemoizedFormField";

// --- SECTION COMPONENT ---
const FormSection = ({
    title,
    description,
    children,
}: {
    title: string;
    description?: string | null;
    children: React.ReactNode;
}) => (
    <div className="space-y-4 pt-4 first:pt-0">
        {(title || description) && (
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4">
                {title && (
                    <h2 className="text-lg font-serif font-medium text-zinc-900 dark:text-zinc-100">
                        {title}
                    </h2>
                )}
                {description && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        {description}
                    </p>
                )}
            </div>
        )}
        {children}
    </div>
);

// --- MAIN DYNAMIC FORM RENDERER ---
export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
    fields,
    formData,
    linkOptions,
    onChange,
    onFileChange,
    onTableRowChange,
    onTableFileChange,
    onAddTableRow,
    onDeleteTableRow,
    onFieldChangeWithSideEffects,
    onTableLinkChange,
    readOnly = false,
}) => {
    // Group fields by sections
    const groupFieldsBySection = useCallback((): FormSection[] => {
        const sections: FormSection[] = [];
        let currentSection: FormSection | null = null;
        let sectionIndex = 0;

        for (const field of fields) {
            if (field.fieldtype === "Section Break") {
                if (currentSection && currentSection.fields.length > 0) {
                    sections.push(currentSection);
                }
                sectionIndex++;
                // Use unique title or numbered fallback to avoid duplicates
                const sectionTitle = field.label || "";
                currentSection = {
                    title: sectionTitle,
                    description: field.description, // Extract description
                    fields: [],
                    depends_on: field.depends_on,
                    hidden: field.hidden,
                };
            } else if (field.fieldtype === "Column Break") {
                // Ignore column breaks for now
                continue;
            } else if (currentSection) {
                currentSection.fields.push(field);
            } else {
                // Fields before first section break - create initial section
                currentSection = { title: "", fields: [field] };
            }
        }

        if (currentSection && currentSection.fields.length > 0) {
            sections.push(currentSection);
        }

        // If no sections found, put all fields in one section
        if (sections.length === 0 && fields.length > 0) {
            sections.push({
                title: "",
                fields: fields.filter(
                    (f) =>
                        f.fieldtype !== "Section Break" && f.fieldtype !== "Column Break",
                ),
            });
        }

        return sections;
    }, [fields]);

    const sections = groupFieldsBySection();

    const renderField = (field: FormField) => {
        // Skip hidden fields
        if (!isFieldVisible(field, formData)) {
            return null;
        }

        const isMandatory = isFieldMandatory(field, formData);
        const fieldIsReadOnly = readOnly || checkFieldReadOnly(field, formData);

        // Handle Table fields
        if (field.fieldtype === "Table" && field.child_fields) {
            return (
                <div key={field.fieldname} className="col-span-full">
                    <ChildTableComponent
                        tableName={field.fieldname}
                        label={field.label || undefined}
                        columns={field.child_fields}
                        tableData={formData[field.fieldname] || []}
                        onRowChange={onTableRowChange}
                        onFileChange={onTableFileChange}
                        onAddRow={onAddTableRow}
                        onDeleteRow={onDeleteTableRow}
                        readOnly={fieldIsReadOnly}
                        linkOptions={linkOptions}
                        onLinkChange={onTableLinkChange}
                    />
                </div>
            );
        }

        return (
            <MemoizedFormField
                key={field.fieldname}
                field={field}
                value={formData[field.fieldname]}
                options={
                    linkOptions[field.options as string] || linkOptions[field.fieldname]
                }
                isMandatory={isMandatory}
                isReadOnly={fieldIsReadOnly}
                onChange={onChange}
                onFileChange={onFileChange}
                onFieldChangeWithSideEffects={onFieldChangeWithSideEffects}
            />
        );
    };

    // Import evaluateExpression for section visibility
    const isSectionVisible = (section: FormSection): boolean => {
        // If explicitly marked as hidden, don't show the section
        if (
            section.hidden === 1 ||
            section.hidden === true ||
            section.hidden === "1"
        ) {
            return false;
        }

        if (!section.depends_on) return true;

        return evaluateExpression(section.depends_on, formData);
    };

    return (
        <div className="space-y-12">
            {sections.map((section, idx) => {
                // Check if section should be visible
                if (!isSectionVisible(section)) {
                    return null;
                }

                // Check if there are any visible fields in this section
                const visibleFields = section.fields.filter((f) =>
                    isFieldVisible(f, formData),
                );
                if (visibleFields.length === 0 && !section.title) {
                    return null;
                }

                return (
                    <FormSection
                        key={idx}
                        title={section.title}
                        description={section.description}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {section.fields.map((field) => renderField(field))}
                        </div>
                    </FormSection>
                );
            })}
        </div>
    );
};

export default DynamicFormRenderer;
