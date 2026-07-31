import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { directPurchaseAPI } from '@/services/apiService';
import { CommentModal } from '@/components/CommentModal';
import { Plus, Trash2 } from 'lucide-react';
import { DepartmentName } from "@/components/DepartmentName";
import DirectPurchaseHelpGuide from "@/components/DirectPurchaseHelpGuide";
import { AutocompleteEmail } from "@/components/AutocompleteEmail";

// --- TYPE DEFINITIONS ---
interface ChildField {
    fieldname: string;
    label: string;
    fieldtype: string;
    options?: string;
    mandatory: number;
    in_list_view: number;
    read_only: number;
}

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
    mandatory_depends_on?: string | null;
    read_only_depends_on?: string | null;
    depends_on_eval?: string | null;
    mandatory_depends_on_eval?: string | null;
    read_only_depends_on_eval?: string | null;
    child_fields?: ChildField[];
}

interface LinkOption {
    value: string;
    label: string;
}

interface ComputationRules {
    row_calculations?: {
        table_fieldname: string;
        target_field: string;
        formula: string;
        trigger_fields: string[];
        description?: string;
    }[];
    aggregations?: {
        target_field: string;
        source_table: string;
        source_field: string;
        operation: string;
        description?: string;
    }[];
    conditional_visibility?: {
        target_field: string;
        condition: string;
        description?: string;
        on_show?: { min_rows?: number; description?: string };
        on_hide?: { clear_rows?: boolean; description?: string };
    }[];
    validations?: {
        condition: string;
        check: string;
        error_message: string;
    }[];
}

interface FormDataResponse {
    message: {
        fields: Field[];
        link_options: { [key: string]: LinkOption[] };
        prefill_data: { [key: string]: any };
        client_scripts?: any[];
        computation_rules?: ComputationRules;
    }
}

// --- STYLES ---
const inputClasses = "w-full h-10 px-3 bg-white dark:bg-[#27272A] border-[1.5px] border-[#E4E4E7] dark:border-[#3F3F46] rounded-[0.4375rem] text-[13px] font-semibold text-[#27272A] dark:text-[#F4F4F5] placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A] focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 focus:border-[#4A6CF7] disabled:opacity-100 disabled:bg-[#FAFAF9] dark:disabled:bg-[#27272A]/50 disabled:text-[#27272A] dark:disabled:text-[#F4F4F5] read-only:bg-[#FAFAF9] dark:read-only:bg-[#27272A]/50 read-only:text-[#27272A] dark:read-only:text-[#F4F4F5] transition-colors duration-150";
const tableInputClasses = "w-full h-9 px-2.5 bg-white dark:bg-[#27272A] border-[1.5px] border-[#E4E4E7] dark:border-[#3F3F46] rounded-[0.4375rem] text-[12px] font-semibold text-[#27272A] dark:text-[#F4F4F5] focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 focus:border-[#4A6CF7] disabled:opacity-100 disabled:bg-[#FAFAF9] dark:disabled:bg-[#27272A]/50 disabled:text-[#27272A] dark:disabled:text-[#F4F4F5] read-only:bg-[#FAFAF9] dark:read-only:bg-[#27272A]/50 read-only:text-[#27272A] dark:read-only:text-[#F4F4F5] transition-colors duration-150";

const formatFieldLabel = (label?: string | null, fieldname?: string) => {
    const raw = label || fieldname || "";
    return raw
        .replace(/^ss_/i, "")
        .replace(/^p11_/i, "P-11 ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const FieldLabel = ({ field }: { field: Pick<Field, "fieldname" | "label" | "mandatory"> }) => (
    <label
        htmlFor={field.fieldname}
        className="inline-flex w-fit max-w-full items-start rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"
    >
        <span className="whitespace-normal break-words leading-snug">{formatFieldLabel(field.label, field.fieldname)}</span>
        {field.mandatory === 1 && <span className="ml-1 font-bold normal-case text-red-500">*</span>}
    </label>
);

// --- HELPER FUNCTION: evaluateDependsOn ---
const evaluateDependsOn = (expression: string | null | undefined, doc: any): boolean => {
    if (!expression) return true;
    try {
        const cleanExpression = expression.startsWith('eval:') ? expression.substring(5) : expression;
        // eslint-disable-next-line no-new-func
        const result = new Function('doc', `return ${cleanExpression}`)(doc);
        return !!result;
    } catch (e) {
        console.warn('Error evaluating depends_on:', expression, e);
        return false;
    }
};

// --- Evaluate a simple condition string like "total_estimate > 200000" ---
const evaluateCondition = (condition: string, doc: any): boolean => {
    try {
        // eslint-disable-next-line no-new-func
        return !!new Function('doc', `with(doc) { return ${condition}; }`)(doc);
    } catch {
        return false;
    }
};

// --- MEMOIZED FORM FIELD COMPONENT ---
const MemoizedFormField = memo(({
    field,
    value,
    linkOptions,
    onChange,
    onWebmailChange,
    hasLinkOptions,
    isWebmailField,
    webmailPrefix
}: {
    field: Field;
    value: any;
    linkOptions: LinkOption[];
    onChange: (fieldname: string, value: any) => void;
    onWebmailChange: (fieldname: string, value: string, prefix: string) => void;
    hasLinkOptions: boolean;
    isWebmailField: boolean;
    webmailPrefix: string;
}) => {
    if (!field || field.hidden || field.fieldtype === 'Section Break' || field.fieldtype === 'HTML' || field.fieldtype === 'Table') return null;
    if (!field.label) return null;

    const commonSelectProps = {
        id: field.fieldname,
        name: field.fieldname,
        className: inputClasses,
        required: field.mandatory === 1,
        disabled: field.read_only === 1,
        value: value || '',
    };

    const commonInputProps = {
        id: field.fieldname,
        name: field.fieldname,
        className: inputClasses,
        readOnly: field.read_only === 1,
        required: field.mandatory === 1,
        disabled: field.read_only === 1,
        value: value ?? '',
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
            onChange(field.fieldname, e.target.value)
    };

    const renderInput = () => {
        if (field.fieldname === 'applicant_department' || field.fieldname === 'department' || field.fieldname === 'applying_for_department') {
            return (
                <div className={cn(inputClasses, "flex items-center bg-zinc-50 dark:bg-zinc-800/40 text-[#27272A] dark:text-[#F4F4F5] overflow-hidden text-ellipsis whitespace-nowrap")}>
                    {value ? <DepartmentName name={value} /> : <span className="text-[12px] text-zinc-400 dark:text-zinc-500 italic">Not provided</span>}
                </div>
            );
        }

        if (hasLinkOptions) {
            return (
                <select
                    {...commonSelectProps}
                    onChange={(e) => {
                        if (isWebmailField) {
                            onWebmailChange(field.fieldname, e.target.value, webmailPrefix);
                        } else {
                            onChange(field.fieldname, e.target.value);
                        }
                    }}
                >
                    <option value="">Select...</option>
                    {linkOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {isWebmailField ? `${opt.label} (${opt.value})` : opt.label}
                        </option>
                    ))}
                </select>
            );
        }

        switch (field.fieldtype) {
            case "Link":
                return (
                    <select {...commonSelectProps} onChange={(e) => onChange(field.fieldname, e.target.value)}>
                        <option value="">Select...</option>
                        {linkOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );
            case "Select":
                const selectOpts = field.options?.split('\n').filter(o => o).map(o => ({ value: o, label: o })) || [];
                return (
                    <select {...commonSelectProps} onChange={(e) => onChange(field.fieldname, e.target.value)}>
                        <option value="">Select...</option>
                        {selectOpts.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );
            case "Currency":
            case "Float":
                return <input type="number" min="0" title="Enter a positive amount" {...commonInputProps} onWheel={e => e.currentTarget.blur()} onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key) || /[a-zA-Z]/.test(e.key)) e.preventDefault(); }} />;
            case "Int":
                return <input type="number" min="0" title="Enter a positive whole number" {...commonInputProps} onWheel={e => e.currentTarget.blur()} onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key) || /[a-zA-Z]/.test(e.key)) e.preventDefault(); }} />;
            case "Date":
                return <input type="date" {...commonInputProps} />;
            case "Text":
            case "Small Text":
            case "Text Editor":
                return <textarea {...commonInputProps} rows={4} className={`${inputClasses} h-auto py-3`} />;
            case "Check":
                return (
                    <label className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors duration-150",
                        !!value
                            ? "bg-[#4A6CF7]/5 border-[#4A6CF7]/40 dark:bg-[#4A6CF7]/10 dark:border-[#4A6CF7]/40"
                            : "bg-white border-[#E4E4E7] dark:bg-[#27272A] dark:border-[#3F3F46] hover:border-[#4A6CF7]/30 dark:hover:border-[#4A6CF7]/30",
                        field.read_only === 1 && "cursor-not-allowed opacity-100",
                    )}>
                        <div className={cn(
                            "w-4 h-4 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-all duration-150",
                            !!value
                                ? "bg-[#4A6CF7] border-[#4A6CF7]"
                                : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900",
                        )}>
                            {!!value && (
                                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                            <input
                                type="checkbox"
                                id={field.fieldname}
                                name={field.fieldname}
                                checked={!!value}
                                onChange={(e) => onChange(field.fieldname, e.target.checked ? 1 : 0)}
                                disabled={field.read_only === 1}
                                className="sr-only"
                            />
                        </div>
                        <span className="text-[13px] font-semibold text-[#27272A] dark:text-[#F4F4F5] leading-relaxed select-none" dangerouslySetInnerHTML={{ __html: field.description || field.label || '' }} />
                    </label>
                );
            case "Attach":
            case "Attach Image":
                return (
                    <input
                        type="file"
                        id={field.fieldname}
                        name={field.fieldname}
                        className={`${inputClasses} py-2`}
                        disabled={field.read_only === 1}
                    />
                );
            case "Data":
            default:
                return <input type="text" {...commonInputProps} />;
        }
    };

    if (field.fieldtype === 'Check') {
        return renderInput();
    }

    return (
        <div className="space-y-1.5">
            <FieldLabel field={field} />
            {renderInput()}
            {field.description && field.fieldtype !== 'Check' && (
                <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-1 leading-relaxed">{field.description}</p>
            )}
        </div>
    );
});

// =============================================================================
// CHILD TABLE COMPONENT
// =============================================================================
const ChildTableEditor = ({
    field,
    rows,
    onChange,
    computationRules,
    linkOptions,
    onLinkSelect,
}: {
    field: Field;
    rows: any[];
    onChange: (rows: any[]) => void;
    computationRules?: ComputationRules;
    linkOptions?: Record<string, LinkOption[]>;
    onLinkSelect?: (tableFieldname: string, rowIndex: number, linkFieldname: string, value: string, childField: ChildField) => void;
}) => {
    // Try in_list_view first, fallback to ALL child fields if none have in_list_view
    const allChildFields = (field.child_fields || []).filter(cf =>
        cf.fieldname !== 'name' && cf.fieldname !== 'idx'
    );
    const listViewFields = allChildFields.filter(cf => cf.in_list_view);
    const childFields = listViewFields.length > 0 ? listViewFields : allChildFields;

    console.log(`[ChildTable] "${field.fieldname}": child_fields raw=${(field.child_fields || []).length}, in_list_view=${listViewFields.length}, rendering=${childFields.length}`,
        field.child_fields?.map(cf => ({ name: cf.fieldname, type: cf.fieldtype, options: cf.options, in_list_view: cf.in_list_view })));

    if (childFields.length === 0) {
        console.warn(`[ChildTable] "${field.fieldname}" has NO child fields — nothing to render`);
        return null;
    }

    // Find row_calculation rules for this table
    const rowCalcRules = (computationRules?.row_calculations || []).filter(
        r => r.table_fieldname === field.fieldname
    );

    const updateRow = (index: number, fieldname: string, value: any) => {
        const updated = [...rows];
        updated[index] = { ...updated[index], [fieldname]: value };

        // Apply row-level calculations
        for (const rule of rowCalcRules) {
            if (rule.trigger_fields.includes(fieldname)) {
                try {
                    const row = updated[index];
                    // eslint-disable-next-line no-new-func
                    const result = new Function(
                        ...rule.trigger_fields.map(f => f),
                        `return ${rule.formula};`
                    )(...rule.trigger_fields.map(f => parseFloat(row[f]) || 0));
                    updated[index][rule.target_field] = Math.round(result * 100) / 100;
                } catch (e) {
                    console.warn('Row calculation error:', e);
                }
            }
        }

        onChange(updated);
    };

    const handleLinkChange = (index: number, cf: ChildField, value: string) => {
        // When a link field changes, clear dependent auto-populated fields
        // so the auto-populate useEffect can re-fetch
        const updated = [...rows];
        updated[index] = { ...updated[index], [cf.fieldname]: value };

        // If this is a webmail/user field, clear the auto-populated fields
        if (cf.fieldname === 'webmail_id' || cf.fieldname.includes('webmail') || cf.options === 'User') {
            updated[index].pc_name = '';
            updated[index].designation = '';
        }

        onChange(updated);

        // Notify parent for auto-populate
        if (onLinkSelect) {
            onLinkSelect(field.fieldname, index, cf.fieldname, value, cf);
        }
    };

    const addRow = () => {
        const emptyRow: Record<string, any> = {};
        childFields.forEach(cf => {
            emptyRow[cf.fieldname] = cf.fieldtype === 'Int' || cf.fieldtype === 'Float' || cf.fieldtype === 'Currency' ? 0 : '';
        });
        onChange([...rows, emptyRow]);
    };

    const removeRow = (index: number) => {
        onChange(rows.filter((_, i) => i !== index));
    };

    const getInputType = (cf: ChildField) => {
        switch (cf.fieldtype) {
            case 'Int': return 'number';
            case 'Float':
            case 'Currency': return 'number';
            case 'Date': return 'date';
            default: return 'text';
        }
    };

    const isComputedField = (fieldname: string) => {
        return rowCalcRules.some(r => r.target_field === fieldname);
    };

    // Get link options for a child field — works for Link fields AND Data fields with matching linkOptions
    const getChildLinkOptions = (cf: ChildField): LinkOption[] => {
        // Check by fieldname first, then by doctype/options
        const opts = linkOptions?.[cf.fieldname] || (cf.options ? linkOptions?.[cf.options] : undefined) || [];
        return opts;
    };

    return (
        <div className="col-span-full">
            {field.description && (
                <p className="mb-3 text-[11px] leading-relaxed text-[#71717A] dark:text-[#A1A1AA]">{field.description}</p>
            )}

            <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]">
                <table className="w-full text-[12px]">
                    <thead>
                        <tr className="border-b border-[#E4E4E7] bg-[#EEF2FF] dark:border-[#3F3F46] dark:bg-[#1E3A8A]/20">
                            <th className="px-3 py-2.5 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-widest w-10">#</th>
                            {childFields.map(cf => (
                                <th key={cf.fieldname} className="px-3 py-2.5 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-widest">
                                    {cf.label}
                                    {cf.mandatory === 1 && <span className="text-red-500 ml-0.5 normal-case font-bold">*</span>}
                                </th>
                            ))}
                            <th className="px-3 py-2.5 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={childFields.length + 2} className="px-4 py-8 text-center">
                                    <p className="text-[12px] font-medium text-zinc-400 dark:text-zinc-500">No rows added yet</p>
                                    <p className="text-[11px] text-zinc-300 dark:text-zinc-600 mt-1">Click "+ Add Row" below to begin</p>
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, idx) => (
                                <tr key={idx} className="border-b border-[#E4E4E7] last:border-b-0 dark:border-[#3F3F46] hover:bg-[#FAFAF9] dark:hover:bg-[#3F3F46]/30">
                                    <td className="px-3 py-2 text-[11px] font-mono text-zinc-400">{idx + 1}</td>
                                    {childFields.map(cf => {
                                        const computed = isComputedField(cf.fieldname);
                                        const childLinkOpts = getChildLinkOptions(cf);
                                        const isDropdown = childLinkOpts.length > 0;

                                        const selectedInOtherRows = isDropdown
                                            ? rows
                                                .filter((_, rIdx) => rIdx !== idx)
                                                .map(r => r[cf.fieldname])
                                                .filter(Boolean)
                                            : [];
                                        const filteredOpts = isDropdown
                                            ? childLinkOpts.filter(opt => !selectedInOtherRows.includes(opt.value))
                                            : [];

                                        return (
                                            <td key={cf.fieldname} className="px-2 py-1.5">
                                                {computed ? (
                                                    <div className="px-2.5 py-1.5 text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] bg-[#FAFAF9] dark:bg-[#18181B] rounded-md border border-[#E4E4E7] dark:border-[#3F3F46]">
                                                        {cf.fieldtype === 'Currency' || cf.fieldtype === 'Float'
                                                            ? `₹ ${(parseFloat(row[cf.fieldname]) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                                            : row[cf.fieldname] ?? 0
                                                        }
                                                    </div>
                                                ) : isDropdown && (cf.fieldname.toLowerCase().includes('webmail') || cf.fieldname.toLowerCase().includes('email')) ? (
                                                    <AutocompleteEmail
                                                        options={filteredOpts}
                                                        value={row[cf.fieldname] || ''}
                                                        onChange={(value) => handleLinkChange(idx, cf, value)}
                                                        className={tableInputClasses}
                                                        placeholder="Search webmail..."
                                                        showAllOnFocus
                                                        disabled={cf.read_only === 1}
                                                    />
                                                ) : isDropdown ? (
                                                    <select
                                                        value={row[cf.fieldname] || ''}
                                                        onChange={(e) => handleLinkChange(idx, cf, e.target.value)}
                                                        className={tableInputClasses}
                                                        disabled={cf.read_only === 1}
                                                    >
                                                        <option value="">Select...</option>
                                                        {filteredOpts.map(opt => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label !== opt.value ? `${opt.label} (${opt.value})` : opt.value}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : cf.fieldtype === 'Select' && cf.options ? (
                                                    <select
                                                        value={row[cf.fieldname] || ''}
                                                        onChange={(e) => updateRow(idx, cf.fieldname, e.target.value)}
                                                        className={tableInputClasses}
                                                        disabled={cf.read_only === 1}
                                                    >
                                                        <option value="">Select...</option>
                                                        {cf.options.split('\n').filter(Boolean).map(o => (
                                                            <option key={o} value={o}>{o}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={getInputType(cf)}
                                                        value={row[cf.fieldname] ?? ''}
                                                        onChange={(e) => updateRow(idx, cf.fieldname, e.target.value)}
                                                        className={tableInputClasses}
                                                        readOnly={cf.read_only === 1}
                                                        disabled={cf.read_only === 1}
                                                        required={cf.mandatory === 1}
                                                        onWheel={getInputType(cf) === 'number' ? e => e.currentTarget.blur() : undefined}
                                                    />
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="px-2 py-1.5">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(idx)}
                                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                            title="Remove row"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <button
                type="button"
                onClick={addRow}
                className="mt-2 w-full py-2.5 rounded-md border border-dashed border-[#D97757]/40 text-[11px] font-bold uppercase tracking-wider text-[#D97757] hover:border-[#D97757]/70 hover:bg-[#D97757]/5 dark:hover:bg-[#D97757]/10 transition-colors duration-150 inline-flex items-center justify-center gap-1.5"
            >
                <Plus className="w-3.5 h-3.5" />
                Add Row
            </button>
        </div>
    );
};

// --- REUSABLE UI COMPONENTS ---
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-[#27272A] p-4 sm:p-5 border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: "button" | "submit"
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex h-9 items-center justify-center gap-2 rounded-[0.4375rem] border px-5 text-[12px] font-bold uppercase tracking-wide transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
            className
        )}
    >
        {children}
    </button>
);

const NeoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div className="border-b border-[#E4E4E7] bg-[#FAFAF9] px-5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-[#3F3F46] dark:text-[#E4E4E7]">{title}</h2>
        </div>
        <div className="p-4 sm:p-5">
            {children}
        </div>
    </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const DirectPurchase: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectName = searchParams.get('project_no') || searchParams.get('project') || '';
    const editDocName = searchParams.get('edit') || '';

    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [childTableData, setChildTableData] = useState<Record<string, any[]>>({});
    const [computationRules, setComputationRules] = useState<ComputationRules>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string>(editDocName || '');
    const [dataLoaded, setDataLoaded] = useState(false);
    const [declarationAccepted, setDeclarationAccepted] = useState(false);
    const [commentModalOpen, setCommentModalOpen] = useState(false);

    const { call: fetchFormData, result, error } = useFrappePostCall<FormDataResponse>(
        directPurchaseAPI.getFields
    );
    const { call: submitForm, error: submitError } = useFrappePostCall(
        directPurchaseAPI.save
    );
    const { call: submitDocCall } = useFrappePostCall(
        directPurchaseAPI.performAction
    );
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>(
        'frappe.client.get'
    );

    // ── Aggregations: compute parent-level values from child table data ──
    const computedAggregations = useMemo(() => {
        const aggs: Record<string, number> = {};
        for (const rule of (computationRules.aggregations || [])) {
            const rows = childTableData[rule.source_table] || [];
            if (rule.operation === 'sum') {
                aggs[rule.target_field] = rows.reduce(
                    (sum, row) => sum + (parseFloat(row[rule.source_field]) || 0), 0
                );
            }
        }
        console.log('[Aggregations] Computed:', aggs, 'from childTableData:', Object.keys(childTableData));
        return aggs;
    }, [childTableData, computationRules.aggregations]);

    // Merged formData with computed aggregations for condition evaluation
    const effectiveFormData = useMemo(() => ({
        ...formData,
        ...computedAggregations,
        // Also expose child table lengths for validation conditions
        ...Object.fromEntries(
            Object.entries(childTableData).map(([key, rows]) => [key, rows])
        ),
    }), [formData, computedAggregations, childTableData]);

    // ── Conditional visibility for child tables ──
    const visibilityMap = useMemo(() => {
        const map: Record<string, boolean> = {};
        for (const rule of (computationRules.conditional_visibility || [])) {
            map[rule.target_field] = evaluateCondition(rule.condition, effectiveFormData);
        }
        return map;
    }, [computationRules.conditional_visibility, effectiveFormData]);

    // ── Auto-add/clear rows based on conditional visibility ──
    useEffect(() => {
        for (const rule of (computationRules.conditional_visibility || [])) {
            const isVisible = visibilityMap[rule.target_field];
            const currentRows = childTableData[rule.target_field] || [];

            if (isVisible && rule.on_show?.min_rows) {
                if (currentRows.length < rule.on_show.min_rows) {
                    const needed = rule.on_show.min_rows - currentRows.length;
                    const tableField = fields.find(f => f.fieldname === rule.target_field);
                    const childFields = tableField?.child_fields || [];
                    const emptyRows = Array.from({ length: needed }, () => {
                        const row: Record<string, any> = {};
                        childFields.forEach(cf => {
                            row[cf.fieldname] = cf.fieldtype === 'Int' || cf.fieldtype === 'Float' || cf.fieldtype === 'Currency' ? 0 : '';
                        });
                        return row;
                    });
                    setChildTableData(prev => ({
                        ...prev,
                        [rule.target_field]: [...currentRows, ...emptyRows]
                    }));
                }
            } else if (!isVisible && rule.on_hide?.clear_rows && currentRows.length > 0) {
                setChildTableData(prev => ({
                    ...prev,
                    [rule.target_field]: []
                }));
            }
        }
    }, [visibilityMap, computationRules.conditional_visibility, fields]);

    // ── Auto-populate Name/Designation when webmail_id is selected in committee table ──
    useEffect(() => {
        const committeeRows = childTableData['table_teqd'] || [];
        if (committeeRows.length === 0) return;

        // Check if any row has webmail_id set but pc_name empty (needs auto-populate)
        const rowsToPopulate = committeeRows
            .map((row, idx) => ({ row, idx }))
            .filter(({ row }) => row.webmail_id && !row.pc_name);

        if (rowsToPopulate.length === 0) return;

        console.log('[AutoPopulate] Rows needing populate:', rowsToPopulate.map(r => r.row.webmail_id));

        // Use existing linkOptions to get the name (no API call needed)
        const userList = linkOptions['User'] || linkOptions['webmail_id'] || linkOptions['applying_for_name'] || [];

        const updates: { idx: number; fullName: string }[] = [];
        for (const { row, idx } of rowsToPopulate) {
            const userOpt = userList.find(u => u.value === row.webmail_id);
            if (userOpt) {
                updates.push({ idx, fullName: userOpt.label });
            }
        }

        if (updates.length > 0) {
            setChildTableData(prev => {
                const rows = [...(prev['table_teqd'] || [])];
                for (const update of updates) {
                    if (rows[update.idx]) {
                        rows[update.idx] = {
                            ...rows[update.idx],
                            pc_name: update.fullName,
                        };
                    }
                }
                console.log('[AutoPopulate] Updated rows from linkOptions:', rows);
                return { ...prev, table_teqd: rows };
            });
        }

        // Fetch user details for the committee members
        const fetchDesignations = async () => {
            for (const { row, idx } of rowsToPopulate) {
                try {
                    const response = await fetch('/api/method/' + directPurchaseAPI.getUserDetails, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Frappe-CSRF-Token': (window as any).csrf_token || '' },
                        credentials: 'include',
                        body: JSON.stringify({ user_email: row.webmail_id })
                    });
                    if (response.ok) {
                        const result = await response.json();
                        const data = result?.message || {};
                        const designation = data.designation_name || '';
                        const department = data.department_name || '';
                        const fullName = data.full_name || row.pc_name; // fallback to earlier mapped

                        console.log(`[AutoPopulate] Details for ${row.webmail_id}:`, data);

                        setChildTableData(prev => {
                            const rows = [...(prev['table_teqd'] || [])];
                            if (rows[idx]) {
                                rows[idx] = {
                                    ...rows[idx],
                                    designation,
                                    department,
                                    pc_name: fullName
                                };
                            }
                            return { ...prev, table_teqd: rows };
                        });
                    }
                } catch (err) {
                    console.error(`[AutoPopulate] Error fetching details for ${row.webmail_id}:`, err);
                }
            }
        };
        fetchDesignations();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [childTableData['table_teqd']]);

    // Initial data fetch
    useEffect(() => {
        if (!dataLoaded) {
            fetchFormData({ doc_name: editDocName || null });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editDocName]);

    useEffect(() => {
        if (result?.message && !dataLoaded) {
            const initForm = async () => {
                const { fields: apiFields, link_options, prefill_data, computation_rules: rules } = result.message;

                console.log('=== DIRECT PURCHASE FORM DATA ===');
                console.log('API Result:', result);
                console.log('Computation Rules:', rules);

                if (rules) {
                    setComputationRules(rules);
                }

                if (Array.isArray(apiFields)) {
                    let initialData: Record<string, any> = { ...prefill_data };
                    const initialChildData: Record<string, any[]> = {};

                    // If editing, fetch existing document data
                    if (editDocName) {
                        try {
                            const existingDoc = await fetchExistingDoc({
                                doctype: 'Direct Purchase',
                                name: editDocName
                            });
                            if (existingDoc?.message) {
                                const docData = existingDoc.message;
                                // Separate child table data from parent fields
                                for (const [key, value] of Object.entries(docData)) {
                                    if (Array.isArray(value)) {
                                        initialChildData[key] = value;
                                    } else {
                                        initialData[key] = value;
                                    }
                                }
                            }
                        } catch (err) {
                            console.error('Error fetching existing document:', err);
                            alert('Failed to load document for editing');
                        }
                    }

                    // Also extract any child table data from prefill
                    for (const [key, value] of Object.entries(initialData)) {
                        if (Array.isArray(value)) {
                            initialChildData[key] = value;
                            delete initialData[key];
                        }
                    }

                    apiFields.forEach(field => {
                        if (prefill_data?.[field.fieldname] !== undefined && !Array.isArray(prefill_data[field.fieldname])) {
                            initialData[field.fieldname] = prefill_data[field.fieldname];
                        } else if (field.default !== undefined && initialData[field.fieldname] === undefined) {
                            initialData[field.fieldname] = field.default;
                        }
                    });

                    // Set project if passed via URL
                    if (projectName && !initialData.project_name) {
                        initialData.project_name = projectName;
                    }
                    if (projectName && !initialData.project_no) {
                        initialData.project_no = projectName;
                    }

                    setFields(apiFields);
                    setFormData(initialData);
                    setChildTableData(initialChildData);
                } else {
                    console.error("API did not return a valid 'fields' array.");
                }

                setLinkOptions(prev => {
                    const merged = { ...prev, ...(link_options || {}) };
                    // Ensure User list is available under multiple keys for child table fields
                    const userList = merged['applying_for_name'] || merged['User'] || [];
                    if (userList.length > 0) {
                        if (!merged['User']) merged['User'] = userList;
                        if (!merged['webmail_id']) merged['webmail_id'] = userList;
                    }
                    return merged;
                });
                setDataLoaded(true);
                setLoading(false);
            };

            initForm();
        }
        if (error) {
            console.error("Failed to load form data:", error);
            alert("Failed to load form data.");
            setLoading(false);
        }
    }, [result, error, projectName, editDocName, dataLoaded, fetchExistingDoc]);

    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleWebmailChange = async (fieldname: string, value: string, _prefix: string) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));

        if (value) {
            try {
                const response = await fetch('/api/method/' + directPurchaseAPI.getUserDetails, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Frappe-CSRF-Token': (window as any).csrf_token || '' },
                    credentials: 'include',
                    body: JSON.stringify({ user_email: value })
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result?.message) {
                        const { full_name, department_name, designation_name } = result.message;
                        setFormData(prev => ({
                            ...prev,
                            // applying_for auto-population mappings
                            applicant_name: full_name || prev.applicant_name,
                            applying_for_department: department_name || prev.applying_for_department,
                            applying_for_designation: designation_name || prev.applying_for_designation,
                            department: department_name || prev.department,
                            designation: designation_name || prev.designation
                        }));
                    }
                }
            } catch (err) {
                console.error("Error fetching user details:", err);
            }
        }
    };

    const handleChildTableChange = useCallback((tableFieldname: string, rows: any[]) => {
        setChildTableData(prev => ({ ...prev, [tableFieldname]: rows }));
    }, []);

    // Handle Link field selection in child tables — auto-populate related fields
    const handleChildLinkSelect = useCallback(async (
        _tableFieldname: string,
        _rowIndex: number,
        _linkFieldname: string,
        _value: string,
        _childField: ChildField
    ) => {
        // Auto-populate is now handled by the useEffect above
        // This callback is kept for future extensibility
    }, []);

    // ── Validation before save ──
    const validateBeforeSave = (): boolean => {
        for (const rule of (computationRules.validations || [])) {
            if (evaluateCondition(rule.condition, effectiveFormData)) {
                // Evaluate the check
                const rows = childTableData[rule.check.split('.')[0]] || [];
                const checkExpr = rule.check.replace(/(\w+)\.length/, String(rows.length));
                try {
                    // eslint-disable-next-line no-new-func
                    if (!new Function(`return ${checkExpr}`)()) {
                        alert(rule.error_message);
                        return false;
                    }
                } catch {
                    // Fallback: manual check
                    if (rule.check.includes('table_teqd.length >= 3')) {
                        const committeeRows = (childTableData['table_teqd'] || []).filter(
                            r => r.pc_name || r.webmail_id
                        );
                        if (committeeRows.length < 3) {
                            alert(rule.error_message);
                            return false;
                        }
                    }
                }
            }
        }

        // Validate: all committee members must be different
        const committeeRows = (childTableData['table_teqd'] || []).filter(r => r.webmail_id);
        if (committeeRows.length > 1) {
            const webmailIds = committeeRows.map(r => r.webmail_id);
            const duplicates = webmailIds.filter((id, idx) => webmailIds.indexOf(id) !== idx);
            if (duplicates.length > 0) {
                alert(`Duplicate committee members found: ${[...new Set(duplicates)].join(', ')}. All committee members must be different.`);
                return false;
            }
        }

        return true;
    };

    const buildPayload = () => {
        return {
            ...formData,
            ...computedAggregations,
            ...childTableData,
        };
    };

    const handleSaveDraft = async () => {
        if (isSavingDraft) return;
        setIsSavingDraft(true);

        try {
            const dataToSubmit = buildPayload();
            // If already saved, include the doc name for update
            if (savedDocName) {
                dataToSubmit.name = savedDocName;
            }
            console.log('Saving Draft:', dataToSubmit);

            const result: any = await submitForm({ data: JSON.stringify(dataToSubmit) });
            console.log('Draft save result (full):', JSON.stringify(result));

            // Extract doc name from various possible response structures
            const docName = result?.message?.name
                || result?.message?.docname
                || result?.message  // API might return just the name string
                || result?.name
                || savedDocName;

            console.log('Extracted docName:', docName, 'type:', typeof docName);

            if (docName && typeof docName === 'string') {
                setSavedDocName(docName);
                console.log('savedDocName set to:', docName);
            } else if (docName && typeof docName === 'object' && docName.name) {
                setSavedDocName(docName.name);
                console.log('savedDocName set to:', docName.name);
            }

            alert('Direct Purchase saved as draft successfully!');
        } catch (err: any) {
            console.error('Draft save error:', submitError || err);
            alert(`Save Failed: ${err.message || 'Unknown Error'}`);
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleSubmitDoc = () => {
        if (isSubmitting) return;
        if (!validateBeforeSave()) return;

        const hasDeclarations = fields.some(f => f.fieldtype === 'HTML' && f.options?.trim());
        if (hasDeclarations && !declarationAccepted) {
            alert('You must read and accept all declarations before submitting.');
            return;
        }

        if (!savedDocName) {
            alert('Please save as draft first before submitting.');
            return;
        }

        setCommentModalOpen(true);
    };

    const handleConfirmSubmit = async (comment: string) => {
        setCommentModalOpen(false);
        setIsSubmitting(true);

        try {
            const result = await submitDocCall({
                docname: savedDocName,
                action: 'Submit',
                comment: comment.trim() || undefined,
            });
            console.log('Submit result:', result);

            alert('Direct Purchase submitted successfully!');
            const targetProject = formData.project_no || projectName || formData.project_name || formData.project || '';
            navigate(`/project-details-overview/${targetProject}`, {
                state: { tab: 'quick-actions', category: 'Purchase', app: 'Direct Purchase' }
            });
        } catch (err: any) {
            console.error('Submit error:', err);
            alert(`Submission Failed: ${err.message || 'Unknown Error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Default form submit action is save as draft
        handleSaveDraft();
    };

    // Render HTML field content
    const renderHtmlField = (field: Field) => {
        if (field.fieldtype !== 'HTML' || !field.options) return null;
        return (
            <div key={field.fieldname} className="col-span-full">
                <div
                    className="text-[13px] text-zinc-700 dark:text-zinc-300 prose prose-sm max-w-none p-4 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/70 dark:border-amber-800/50 rounded-lg dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: field.options }}
                />
            </div>
        );
    };

    // Group fields by section based on section breaks
    const groupFieldsBySection = () => {
        const sections: { title: string; fields: Field[] }[] = [];
        let currentSection: { title: string; fields: Field[] } | null = null;
        let initialFields: Field[] = [];
        let hasStartedSections = false;

        fields.forEach(field => {
            let isVisible = true;

            // For Table fields with computation_rules conditional_visibility,
            // let the computation_rules take FULL precedence (over depends_on AND hidden)
            const hasComputationVisibility = field.fieldtype === 'Table' &&
                visibilityMap.hasOwnProperty(field.fieldname);

            if (hasComputationVisibility) {
                // Use computation_rules visibility (overrides depends_on AND hidden)
                isVisible = visibilityMap[field.fieldname];
                console.log(`[Visibility] Table "${field.fieldname}": computation_rules -> ${isVisible}`,
                    { effectiveTotal: effectiveFormData.total_estimate, hidden: field.hidden });
            } else {
                // Standard depends_on evaluation
                if (field.depends_on_eval) {
                    isVisible = evaluateDependsOn(field.depends_on_eval, effectiveFormData);
                } else if (field.depends_on) {
                    isVisible = evaluateDependsOn(field.depends_on, effectiveFormData);
                }
                // Only apply hidden flag for non-computation-controlled fields
                if (field.hidden) isVisible = false;
            }

            // For Section Breaks: check if the section CONTAINS a computation-controlled
            // table that is visible — if so, force the section visible too
            if (field.fieldtype === 'Section Break') {
                hasStartedSections = true;
                if (currentSection) {
                    sections.push(currentSection);
                }

                let sectionHidden = !isVisible;

                // Check if any following field (up to next Section Break) is a
                // computation-controlled table that is currently visible
                if (sectionHidden) {
                    const fieldIdx = fields.indexOf(field);
                    for (let i = fieldIdx + 1; i < fields.length; i++) {
                        if (fields[i].fieldtype === 'Section Break') break;
                        if (fields[i].fieldtype === 'Table' && visibilityMap[fields[i].fieldname] === true) {
                            sectionHidden = false;
                            console.log(`[Visibility] Section "${field.label}" forced visible — contains visible table "${fields[i].fieldname}"`);
                            break;
                        }
                    }
                }

                currentSection = {
                    title: field.label || 'Details',
                    fields: []
                };
                (currentSection as any).hidden = sectionHidden;
            } else {
                if (!hasStartedSections) {
                    if (isVisible) initialFields.push(field);
                } else {
                    if (currentSection) {
                        if (!(currentSection as any).hidden && isVisible) {
                            currentSection.fields.push(field);
                        }
                    }
                }
            }
        });

        if (currentSection) {
            sections.push(currentSection);
        }

        if (initialFields.length > 0) {
            sections.unshift({
                title: 'Application Details',
                fields: initialFields
            });
        }

        const result = sections.filter(s => !(s as any).hidden && s.fields.length > 0);
        console.log('[Sections] Final sections:', result.map(s => ({ title: s.title, fieldCount: s.fields.length, fieldNames: s.fields.map(f => f.fieldname) })));
        return result;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg dark:bg-zinc-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b border-zinc-200 dark:border-zinc-800 mx-auto"></div>
                    <p className="mt-4 text-lg font-semibold">Loading form data...</p>
                </div>
            </div>
        );
    }

    const sections = groupFieldsBySection();

    return (
        <div className="min-h-screen bg-[#FAFAF9] font-sans dark:bg-[#18181B]">

            <main className="flex-1 px-5 py-6 md:px-8 md:py-7">
                <PageHeader
                    title="Direct Purchase Application"
                    projectName={projectName}
                />

                <form onSubmit={handleFormSubmit}>
                    <div className="space-y-5">
                        {sections.map((section, index) => (
                            <NeoSection key={index} title={section.title}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-5">
                                    {section.fields.map(field => {
                                        if (field.fieldtype === 'HTML') {
                                            return renderHtmlField(field);
                                        }

                                        // Render Table fields with ChildTableEditor
                                        if (field.fieldtype === 'Table') {
                                            return (
                                                <ChildTableEditor
                                                    key={field.fieldname}
                                                    field={field}
                                                    rows={childTableData[field.fieldname] || []}
                                                    onChange={(rows) => handleChildTableChange(field.fieldname, rows)}
                                                    computationRules={computationRules}
                                                    linkOptions={linkOptions}
                                                    onLinkSelect={handleChildLinkSelect}
                                                />
                                            );
                                        }

                                        // Evaluate read_only dependencies
                                        let isReadOnly = field.read_only === 1;
                                        if (field.read_only_depends_on || field.read_only_depends_on_eval) {
                                            const roExpr = field.read_only_depends_on_eval || field.read_only_depends_on;
                                            if (evaluateDependsOn(roExpr, effectiveFormData)) {
                                                isReadOnly = true;
                                            }
                                        }

                                        // Evaluate mandatory dependencies
                                        let isMandatory = field.mandatory === 1;
                                        if (field.mandatory_depends_on || field.mandatory_depends_on_eval) {
                                            const mExpr = field.mandatory_depends_on_eval || field.mandatory_depends_on;
                                            if (evaluateDependsOn(mExpr, effectiveFormData)) {
                                                isMandatory = true;
                                            }
                                        }

                                        const effectiveField = {
                                            ...field,
                                            read_only: isReadOnly ? 1 : 0,
                                            mandatory: isMandatory ? 1 : 0
                                        };

                                        // Check if this is an aggregated field (read-only computed)
                                        const isAggregated = computedAggregations.hasOwnProperty(field.fieldname);
                                        if (isAggregated) {
                                            effectiveField.read_only = 1;
                                        }

                                        const hasLinkOpts = linkOptions[field.fieldname] && linkOptions[field.fieldname].length > 0;
                                        const isWebmail = field.fieldname === 'applying_for_name';
                                        const prefix = 'applicant';

                                        return (
                                            <MemoizedFormField
                                                key={field.fieldname}
                                                field={effectiveField}
                                                value={isAggregated ? computedAggregations[field.fieldname] : formData[field.fieldname]}
                                                linkOptions={linkOptions[field.fieldname] || linkOptions[field.options || ''] || []}
                                                onChange={handleChange}
                                                onWebmailChange={handleWebmailChange}
                                                hasLinkOptions={hasLinkOpts}
                                                isWebmailField={isWebmail}
                                                webmailPrefix={prefix}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Show aggregation totals after sections containing source tables */}
                                {(computationRules.aggregations || []).map(agg => {
                                    const sourceTableInSection = section.fields.some(f => f.fieldname === agg.source_table);
                                    if (!sourceTableInSection) return null;
                                    return (
                                        <div key={agg.target_field} className="mt-4 flex items-center justify-end gap-4 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-4 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                            <span className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider">
                                                {agg.description || agg.target_field}
                                            </span>
                                            <span className="text-base font-black text-[#2563EB] dark:text-blue-300">
                                                ₹ {(computedAggregations[agg.target_field] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </NeoSection>
                        ))}
                    </div>

                    {/* Declaration Acceptance Checkbox */}
                    {fields.some(f => f.fieldtype === 'HTML' && f.options?.trim()) && (
                        <label htmlFor="declarationAccepted" className={cn(
                            "mt-5 flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors duration-150",
                            declarationAccepted
                                ? "bg-[#4A6CF7]/5 border-[#4A6CF7]/40 dark:bg-[#4A6CF7]/10 dark:border-[#4A6CF7]/40"
                                : "bg-white border-[#E4E4E7] dark:bg-[#27272A] dark:border-[#3F3F46] hover:border-[#4A6CF7]/30 dark:hover:border-[#4A6CF7]/30",
                        )}>
                            <div className={cn(
                                "w-4 h-4 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-all duration-150",
                                declarationAccepted
                                    ? "bg-[#4A6CF7] border-[#4A6CF7]"
                                    : "border-zinc-300 dark:border-zinc-600",
                            )}>
                                {declarationAccepted && (
                                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                                <input
                                    type="checkbox"
                                    id="declarationAccepted"
                                    checked={declarationAccepted}
                                    onChange={e => setDeclarationAccepted(e.target.checked)}
                                    className="sr-only"
                                />
                            </div>
                            <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 select-none">
                                I have read and accept all the above declarations. <span className="text-red-500">*</span>
                            </span>
                        </label>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-8 flex justify-end gap-2.5">
                        <FrappeButton
                            type="button"
                            onClick={() => {
                                const targetProject = formData.project_no || projectName || formData.project_name || formData.project || '';
                                navigate(`/project-details-overview/${targetProject}`, {
                                    state: { tab: 'quick-actions', category: 'Purchase', app: 'Direct Purchase' }
                                });
                            }}
                            className="bg-white text-[#71717A] border-[#E4E4E7] hover:bg-[#FAFAF9] dark:bg-[#27272A] dark:text-[#A1A1AA] dark:border-[#3F3F46]"
                        >
                            Cancel
                        </FrappeButton>
                        <FrappeButton
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={isSavingDraft}
                            className="bg-blue-50 text-[#2563EB] border-blue-200 hover:bg-blue-100 hover:border-blue-300 disabled:opacity-50 dark:bg-blue-950/25 dark:text-blue-300 dark:border-blue-900/40"
                        >
                            {isSavingDraft ? 'Saving...' : (savedDocName ? 'Update Draft' : 'Save as Draft')}
                        </FrappeButton>
                        <FrappeButton
                            type="button"
                            onClick={handleSubmitDoc}
                            disabled={isSubmitting || !savedDocName}
                            className="bg-[#D97757] text-white border-[#D97757] hover:bg-[#c5694d] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </FrappeButton>
                    </div>
                </form>
            </main>

            <CommentModal
                isOpen={commentModalOpen}
                onClose={() => setCommentModalOpen(false)}
                onSubmit={handleConfirmSubmit}
                action="Submit Direct Purchase"
                isLoading={isSubmitting}
            />
            <DirectPurchaseHelpGuide />
        </div>
    );
};

export default DirectPurchase;
