import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { CountrySelect } from "@/components/CountrySelect";
import ProjectDetailsView from "./ProjectDetails";

import {
    useFrappePostCall,
    useFrappeAuth,
    useFrappeGetDoc,
    useFrappeGetDocList,
} from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
    FileText,
    Users,
    IndianRupee,
    Shield,
    FileBadge,
    X,
    Pencil,
} from "lucide-react";
import {
    EndorsementCertificate,
    getEndorsementHtml,
    getEndorsementDraft,
} from "../components/EndorsementCertificate";
import { commonAPI } from "@/services/apiService";
import { AutocompleteEmail } from "../components/AutocompleteEmail";
import { useUserRoles } from "@/components/UserRole";

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string;
    label: string | null;
    fieldtype: string;
    default?: any;
    mandatory: boolean;
    read_only: boolean;
    hidden: boolean;
    description?: string | null;
    options?: string | null;
    depends_on?: string | null;
    mandatory_depends_on?: string | null;
    read_only_depends_on?: string | null;
    depends_on_eval?: string | null;
    mandatory_depends_on_eval?: string | null;
    read_only_depends_on_eval?: string | null;
}
interface LinkOption {
    value: string;
    label: string;
    designation?: string;
}
interface FormData {
    [key: string]: any;
    additional_pi_table?: (any & { id?: string })[];
    co_investigator_table?: (any & { id?: string })[];
    proposed_equipment_details?: (any & { id?: string })[];
    proposed_manpower_details?: (any & { id?: string })[];
    proposed_budget_breakup?: {
        head: string;
        years: (number | string)[];
        id?: string;
    }[];
    sanctioned_budget_breakup?: (any & { id?: string })[];
    sanction_related_files?: (any & { id?: string })[];
    fund_transactions?: (any & { id?: string })[];
    upload_supporting_docs?: (any & { id?: string })[];
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const inputClasses =
    "w-full h-10 px-3 bg-white dark:bg-[#27272A] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-[0.4375rem] font-medium text-[13px] text-[#18181B] dark:text-[#E4E4E7] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#4A6CF7] focus:ring-[3px] focus:ring-[#4A6CF7]/12 disabled:opacity-60 disabled:bg-[#F4F4F5] dark:disabled:bg-[#27272A]/50 disabled:cursor-not-allowed read-only:bg-[#F4F4F5] dark:read-only:bg-[#27272A]/60 read-only:text-[#52525B] dark:read-only:text-[#A1A1AA] transition-colors duration-150";
const checkboxClasses =
    "size-5 shrink-0 appearance-none bg-white dark:bg-[#27272A] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded checked:bg-[#4A6CF7] checked:border-[#4A6CF7] checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat cursor-pointer transition-colors";
const FrappeCard = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => (
    <div
        className={cn(
            "bg-white dark:bg-[#27272A] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-2xl shadow-sm",
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
    variant = "primary",
    type = "button",
}: {
    children: React.ReactNode;
    onClick?: any;
    disabled?: boolean;
    className?: string;
    variant?: "primary" | "secondary" | "danger" | "ghost";
    type?: "button" | "submit";
}) => {
    const variants = {
        primary:
            "bg-[#4A6CF7] hover:bg-[#3558E8] text-white shadow-sm hover:shadow-md hover:shadow-[#4A6CF7]/25 border border-[#4A6CF7]",
        secondary:
            "bg-white dark:bg-[#27272A] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] text-[#3F3F46] dark:text-[#D4D4D8] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] shadow-sm",
        danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40",
        ghost: "bg-transparent text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] border border-transparent",
    };
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-[11px] uppercase tracking-wide transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/20 disabled:opacity-50 disabled:cursor-not-allowed",
                variants[variant],
                className,
            )}
        >
            {children}
        </button>
    );
};

const evaluateDependsOn = (
    expression: string | null | undefined,
    doc: any,
): boolean => {
    if (!expression) return true;
    try {
        // Handle "eval:" prefix if present
        const cleanExpression = expression.startsWith("eval:")
            ? expression.substring(5)
            : expression;
        // eslint-disable-next-line no-new-func
        const result = new Function("doc", `return ${cleanExpression}`)(doc);
        // console.log(`Eval '${expression}' -> ${result} (doc.project_type: ${doc.project_type})`);
        return !!result;
    } catch (e) {
        console.warn("Error evaluating depends_on:", expression, e);
        return false; // Default to false (hidden) on error to prevent broken UI
    }
};

// --- MEMOIZED CHILD COMPONENTS ---
const MemoizedFormField = memo(
    ({
        field,
        value,
        options,
        onChange,
        onFileChange,
    }: {
        field: Field;
        value: any;
        options?: LinkOption[];
        onChange: (fieldname: string, value: any, type?: string) => void;
        onFileChange: (fieldname: string, file: File | null) => void;
    }) => {
        if (!field || field.hidden || !field.label) return null;
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
                case "Link":
                    if (field.fieldname === "pi_webmail") {
                        return (
                            <AutocompleteEmail
                                {...commonProps}
                                value={value || ""}
                                onChange={(val) =>
                                    onChange(field.fieldname, val)
                                }
                                options={options || []}
                            />
                        );
                    }
                    if (field.fieldname === "funding_agen") {
                        return (
                            <AutocompleteEmail
                                {...commonProps}
                                value={value || ""}
                                onChange={(val) =>
                                    onChange(field.fieldname, val)
                                }
                                options={options || []}
                                placeholder="Search funding agency..."
                                searchByLabel
                                showAllOnFocus
                                displayOnlyLabel
                                footerMessage="Not in the list? Select Other Funding Agency"
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
                            {(options || []).map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    );
                case "Select":
                    return (
                        <select
                            {...commonProps}
                            value={value || ""}
                            onChange={(e) =>
                                onChange(field.fieldname, e.target.value)
                            }
                        >
                            <option value="">Select...</option>
                            {(
                                field.options?.split("\n").filter((o) => o) ||
                                []
                            ).map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    );
                case "Text":
                case "Small Text":
                case "Text Editor":
                    return (
                        <textarea
                            {...commonProps}
                            value={value || ""}
                            onChange={(e) =>
                                onChange(field.fieldname, e.target.value)
                            }
                            rows={5}
                            className={`${inputClasses} h-auto py-3`}
                        />
                    );
                case "Check":
                    return (
                        <label className="flex items-center gap-3 font-semibold text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer">
                            <input
                                type="checkbox"
                                className={checkboxClasses}
                                checked={!!value}
                                onChange={(e) =>
                                    onChange(
                                        field.fieldname,
                                        e.target.checked,
                                        "checkbox",
                                    )
                                }
                                disabled={field.read_only}
                            />
                            <span>
                                {field.label}
                                {field.mandatory && (
                                    <span className="text-red-500">*</span>
                                )}
                            </span>
                        </label>
                    );
                case "Date":
                case "date": // Handle lowercase date type
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
                case "Attach":
                    return (
                        <input
                            type="file"
                            {...commonProps}
                            className={`${inputClasses} py-0.5 px-2 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300 hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700`}
                            onChange={(e) =>
                                onFileChange(
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
                            inputMode={
                                ["Int"].includes(field.fieldtype)
                                    ? "numeric"
                                    : ["Currency", "Float", "Percent"].includes(field.fieldtype)
                                        ? "decimal"
                                        : "text"
                            }
                            {...commonProps}
                            value={value || ""}
                            onChange={(e) =>
                                onChange(field.fieldname, e.target.value)
                            }
                        />
                    );
            }
        };
        if (field.fieldtype === "Check") {
            return (
                <div className="space-y-2">
                    {field.description ? (
                        <div
                            className="prose prose-sm max-w-none text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-md p-4 bg-zinc-100 dark:bg-zinc-800"
                            dangerouslySetInnerHTML={{
                                __html: field.description,
                            }}
                        />
                    ) : null}
                    {renderInput()}
                </div>
            );
        }
        return (
            <div className="space-y-1.5">
                <label
                    htmlFor={field.fieldname}
                    className="block text-[11px] font-bold uppercase tracking-widest text-[#27272A] dark:text-[#E4E4E7]"
                >
                    {field.label}
                    {field.mandatory && <span className="text-red-500 ml-0.5 normal-case">*</span>}
                </label>
                {renderInput()}
                {field.description && field.fieldtype !== "Check" && (
                    <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-1 leading-relaxed">
                        {field.description}
                    </p>
                )}
            </div>
        );
    },
);

const MemoizedGenericTable = memo(
    ({
        tableName,
        columns,
        newRow,
        tableData,
        onRowChange,
        onFileChange,
        onAddRow,
        onDeleteRow,
        onOpenQuickEntry, // EDITED BY MKY | 2026-04-14 14:52 IST: Added Quick Entry hook prop
    }: any) => (
        <div className="overflow-x-auto border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-xl shadow-sm">
            <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
                <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/20">
                    <tr>
                        {[
                            ...columns,
                            {
                                key: "actions",
                                label: "Actions",
                                type: "action",
                            },
                        ].map((c: any) => (
                            <th
                                key={c.key}
                                className="px-4 py-3 font-bold text-[#1E3A8A] dark:text-[#93C5FD] text-[10px] text-left uppercase tracking-widest border-r border-[#C7D2FE]/60 dark:border-[#4A6CF7]/20 last:border-r-0"
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {(tableData || []).map((row: any, i: number) => (
                        <tr
                            key={row.id}
                            className="hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]/50 transition-colors"
                        >
                            {columns.map((col: any) => (
                                <td key={col.key} className="px-4 py-2.5">
                                    {" "}
                                    {col.type === "file" ? (
                                        <div className="space-y-1">
                                            {row[col.key] && typeof row[col.key] === "string" && (
                                                <div className="flex items-center gap-1.5">
                                                    <a
                                                        href={row[col.key].startsWith("http") ? row[col.key] : `http://172.16.135.118:9000/prod-rnd-files${row[col.key]}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] text-[#D97757] underline truncate max-w-[160px]"
                                                        title={row[col.key].split("/").pop()}
                                                    >
                                                        {row[col.key].split("/").pop()}
                                                    </a>
                                                    <span className="text-[9px] text-zinc-400">(replace)</span>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                className={`${inputClasses} !h-8 !py-1.5 text-xs !border-zinc-200`}
                                                onChange={(e) =>
                                                    onFileChange(
                                                        tableName,
                                                        i,
                                                        col.key,
                                                        e.target.files?.[0] || null,
                                                    )
                                                }
                                            />
                                        </div>
                                    ) : col.type === "select" ? (
                                        <select
                                            className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary focus:!ring-primary/20`}
                                            value={row[col.key] || ""}
                                            onChange={(e) => {
                                                // ============================================================
                                                // EDITED BY MKY | 2026-04-14 14:52 IST
                                                // START OF EDIT — Intercept "CREATE_NEW" selections
                                                // Launch the quick entry modal instead of writing the placeholder to state.
                                                // ============================================================
                                                if (e.target.value === "CREATE_NEW" && onOpenQuickEntry) {
                                                    onOpenQuickEntry(tableName, i, col.key);
                                                } else {
                                                    onRowChange(
                                                        tableName,
                                                        i,
                                                        col.key,
                                                        e.target.value,
                                                    );
                                                }
                                                // END OF EDIT — MKY | 2026-04-14 14:52 IST
                                                // ============================================================
                                            }}
                                        >
                                            <option value="">Select...</option>
                                            {(col.options || []).map(
                                                (opt: any) => (
                                                    <option
                                                        key={opt.value}
                                                        value={opt.value}
                                                    >
                                                        {opt.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    ) : (
                                        <input
                                            type={col.type}
                                            readOnly={!!col.readOnly}
                                            className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary focus:!ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none${col.readOnly ? " bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500" : ""}`}
                                            value={row[col.key] || ""}
                                            onChange={(e) => {
                                                if (col.readOnly) return;
                                                const value =
                                                    col.key === "salary"
                                                        ? e.target.value.replace(
                                                            /[^0-9]/g,
                                                            "",
                                                        )
                                                        : e.target.value;
                                                onRowChange(
                                                    tableName,
                                                    i,
                                                    col.key,
                                                    value,
                                                );
                                            }}
                                            onWheel={
                                                col.type === "number"
                                                    ? (e) =>
                                                        (
                                                            e.target as HTMLInputElement
                                                        ).blur()
                                                    : undefined
                                            }
                                        />
                                    )}{" "}
                                </td>
                            ))}
                            <td className="px-4 py-2.5">
                                <FrappeButton
                                    variant="danger"
                                    onClick={() => onDeleteRow(tableName, i)}
                                    className="w-full py-1.5 h-8"
                                >
                                    Delete
                                </FrappeButton>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="p-3 bg-[#FAFAF9] dark:bg-[#27272A]/60 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                <FrappeButton
                    variant="secondary"
                    onClick={() => onAddRow(tableName, newRow)}
                    className="w-full border-dashed"
                >
                    Add Row
                </FrappeButton>
            </div>
        </div>
    ),
);

const MemoizedCollaboratorTable = memo(
    ({
        tableName,
        title,
        tableData,
        piOptions,
        onCollaboratorChange,
        onRowChange,
        onAddRow,
        onDeleteRow,
    }: any) => {
        const prefix = tableName === "co_investigator_table" ? "copi" : "pi";
        const newRow = {
            [`${prefix}_name`]: "",
            [`${prefix}_email`]: "",
            [`${prefix}_designation`]: "",
            [`${prefix}_department`]: "",
            [`${prefix}_address`]: "",
            [`${prefix}_contact`]: "",
        };
        return (
            <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                    {title}
                </h3>
                <div className="border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-xl shadow-sm">
                    <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
                        <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/20">
                            <tr>
                                {[
                                    "Name*",
                                    "Email ID*",
                                    "Designation",
                                    "Department",
                                    "Institute / Address",
                                    "Contact",
                                    "Actions",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 font-bold text-[#1E3A8A] dark:text-[#93C5FD] text-[10px] text-left uppercase tracking-widest border-r border-[#C7D2FE]/60 dark:border-[#4A6CF7]/20 last:border-r-0"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#27272A] divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                            {(tableData || []).map((row: any, i: number) => (
                                <tr
                                    key={row.id}
                                    className="hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]/50 transition-colors"
                                >
                                    <td className="px-4 py-2.5">
                                        <AutocompleteEmail
                                            className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary`}
                                            value={row[`${prefix}_name`] || ""}
                                            onChange={(val) =>
                                                onCollaboratorChange(
                                                    tableName,
                                                    i,
                                                    val,
                                                )
                                            }
                                            options={piOptions || []}
                                            searchByLabel
                                            strictMatch
                                            showAllOnFocus
                                            placeholder="Select Name"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <input
                                            type="email"
                                            readOnly
                                            className={`${inputClasses} !h-8 bg-zinc-50/50 !border-zinc-100 text-zinc-600 font-medium text-xs`}
                                            value={row[`${prefix}_email`] || ""}
                                        />
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <input
                                            type="text"
                                            readOnly
                                            className={`${inputClasses} !h-8 bg-zinc-50/50 !border-zinc-100 text-zinc-600 font-medium text-xs`}
                                            value={
                                                row[`${prefix}_designation`] ||
                                                ""
                                            }
                                        />
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <input
                                            type="text"
                                            readOnly
                                            className={`${inputClasses} !h-8 bg-zinc-50/50 !border-zinc-100 text-zinc-600 font-medium text-xs`}
                                            value={
                                                row[`${prefix}_department`] ||
                                                ""
                                            }
                                        />
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <input
                                            type="text"
                                            placeholder="Institute/Address"
                                            className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary`}
                                            value={
                                                row[`${prefix}_address`] || ""
                                            }
                                            onChange={(e) =>
                                                onRowChange(
                                                    tableName,
                                                    i,
                                                    `${prefix}_address`,
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <input
                                            type="tel"
                                            placeholder="91XXXXXXXXXX"
                                            maxLength={12}
                                            className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary`}
                                            value={
                                                row[`${prefix}_contact`] || ""
                                            }
                                            onChange={(e) =>
                                                onRowChange(
                                                    tableName,
                                                    i,
                                                    `${prefix}_contact`,
                                                    e.target.value.replace(
                                                        /[^0-9]/g,
                                                        "",
                                                    ),
                                                )
                                            }
                                        />
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <FrappeButton
                                            variant="danger"
                                            onClick={() =>
                                                onDeleteRow(tableName, i)
                                            }
                                            className="w-full py-1.5 h-8"
                                        >
                                            Delete
                                        </FrappeButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-3 bg-[#FAFAF9] dark:bg-[#27272A]/60 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                        <FrappeButton
                            variant="secondary"
                            onClick={() => onAddRow(tableName, newRow)}
                            className="w-full border-dashed"
                        >
                            Add Row
                        </FrappeButton>
                    </div>
                </div>
            </div>
        );
    },
);

const MemoizedBudgetTable = memo(
    ({
        tableData,
        budgetYears,
        budgetHeadOptions,
        onRowChange,
        onAddRow,
        onDeleteRow,
        onAddYear,
        onDeleteYear,
        getYearTotal,
        totalBudgetAmount,
        allowYearActions = true,
        readOnly = false,
    }: any) => (
        <div className="space-y-4">
            <div className="overflow-x-auto border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-xl shadow-sm">
                <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
                    <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/20">
                        <tr>
                            <th className="px-4 py-3 font-bold text-[#1E3A8A] dark:text-[#93C5FD] text-[10px] text-left uppercase tracking-widest border-r border-[#C7D2FE]/60 dark:border-[#4A6CF7]/20">
                                Account Head
                            </th>
                            {budgetYears.map((year: number, index: number) => (
                                <th
                                    key={index}
                                    className="px-4 py-3 font-bold text-[#1E3A8A] dark:text-[#93C5FD] text-[10px] text-left uppercase tracking-widest border-r border-[#C7D2FE]/60 dark:border-[#4A6CF7]/20 last:border-r-0"
                                >
                                    {allowYearActions ? `Year ${year} (₹)` : "Budget (₹)"}
                                </th>
                            ))}
                            <th className="px-4 py-3 font-bold text-[#1E3A8A] dark:text-[#93C5FD] text-[10px] text-left uppercase tracking-widest border-r border-[#C7D2FE]/60 dark:border-[#4A6CF7]/20">
                                Total (₹)
                            </th>
                            <th className="px-4 py-3 font-bold text-[#1E3A8A] dark:text-[#93C5FD] text-[10px] text-left uppercase tracking-widest">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                        {(tableData || []).map((row: any, rowIndex: number) => {
                            const rowTotal = (row.years || []).reduce(
                                (sum: number, val: any) =>
                                    sum + Number(val || 0),
                                0,
                            );
                            return (
                                <tr
                                    key={row.id}
                                    className="hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]/50 transition-colors"
                                >
                                    <td className="px-4 py-2.5">
                                        <select
                                            className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary`}
                                            value={row.head || ""}
                                            disabled={readOnly}
                                            onChange={(e) =>
                                                onRowChange(
                                                    rowIndex,
                                                    "head",
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select Budget Head
                                            </option>
                                            {row.head &&
                                                !budgetHeadOptions.some(
                                                    (o: any) => o.value === row.head,
                                                ) && (
                                                    <option value={row.head}>
                                                        {row.head}
                                                    </option>
                                                )}
                                            {budgetHeadOptions.map(
                                                (option: any) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </td>
                                    {budgetYears.map(
                                        (_: any, yearIndex: number) => (
                                            <td
                                                key={yearIndex}
                                                className="px-4 py-2.5"
                                            >
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    title="Enter a positive budget amount"
                                                    className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary`}
                                                    value={String((row.years || [])[yearIndex] ?? "")}
                                                    readOnly={readOnly}
                                                    disabled={readOnly}
                                                    onChange={(e) => {
                                                        if (readOnly) return;
                                                        const v = e.target.value;
                                                        if (v === "" || /^\d*\.?\d*$/.test(v)) {
                                                            onRowChange(rowIndex, "years", v, yearIndex);
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        if (readOnly) return;
                                                        const v = e.target.value;
                                                        if (v !== "") onRowChange(rowIndex, "years", parseFloat(v) || 0, yearIndex);
                                                    }}
                                                />
                                            </td>
                                        ),
                                    )}
                                    <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100 text-right pr-6 text-xs">
                                        {rowTotal.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <FrappeButton
                                            variant="danger"
                                            type="button"
                                            className="w-full py-1.5 h-8"
                                            disabled={readOnly}
                                            onClick={() =>
                                                onDeleteRow(
                                                    "proposed_budget_breakup",
                                                    rowIndex,
                                                )
                                            }
                                        >
                                            Delete
                                        </FrappeButton>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-[#F4F4F5] dark:bg-[#27272A]/60 border-t-[1.5px] border-[#D4D4D8] dark:border-[#52525B]">
                        <tr>
                            <th className="px-4 py-3 text-right font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-[11px] uppercase tracking-wide">
                                Yearly Total
                            </th>
                            {budgetYears.map((_: any, yearIndex: number) => (
                                <td
                                    key={yearIndex}
                                    className="px-4 py-3 font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-right pr-6 text-[12px]"
                                >
                                    {Number(getYearTotal(yearIndex)).toFixed(2)}
                                </td>
                            ))}
                            <td className="px-4 py-3 font-extrabold text-[#4A6CF7] dark:text-[#818CF8] text-right pr-6 text-[12px]">
                                {totalBudgetAmount.toFixed(2)}
                            </td>
                            <td className="px-4 py-3"></td>
                        </tr>
                    </tfoot>
                </table>
                <div className="p-3 bg-zinc-50/50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                    <FrappeButton
                        variant="secondary"
                        disabled={readOnly}
                        onClick={() => {
                            if (readOnly) return;
                            onAddRow("proposed_budget_breakup", {
                                head: "",
                                years: new Array(budgetYears.length).fill(0),
                            })
                        }}
                        className="border-dashed"
                    >
                        + Add Row
                    </FrappeButton>
                    {allowYearActions && (
                        <div className="flex gap-2">
                            {budgetYears.length > 1 && (
                                <FrappeButton
                                    variant="danger"
                                    onClick={onDeleteYear}
                                >
                                    Remove Year
                                </FrappeButton>
                            )}
                            <FrappeButton variant="secondary" onClick={onAddYear}>
                                + Add Year
                            </FrappeButton>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <div className="w-full md:w-1/3 space-y-2">
                    <label className="block text-base font-bold text-zinc-900 dark:text-zinc-100">
                        Grand Total (₹)
                    </label>
                    <input
                        type="text"
                        className={`${inputClasses} !h-10 text-lg font-bold bg-claude-bg dark:bg-zinc-900 text-[#D97757]`}
                        readOnly
                        value={totalBudgetAmount.toFixed(2)}
                    />
                </div>
            </div>
        </div>
    ),
);

// --- MAIN COMPONENT ---
const ProjectRegistration: React.FC = () => {
    // --- STATE & API HOOKS ---
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isStaffRnD = roles.some((r) =>
        ["staff, RnD", "Staff RnD", "RnD Staff", "System Manager"].includes(r),
    );
    const [isSavingPfms, setIsSavingPfms] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<
        Record<string, LinkOption[]>
    >({});
    const [budgetHeadOptions, setBudgetHeadOptions] = useState<LinkOption[]>(
        [],
    );
    const [formData, setFormData] = useState<FormData>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isFetchingPiDetails, setIsFetchingPiDetails] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { docname: pathDocname, tempId: pathTempId } = useParams<{ docname?: string; tempId?: string }>();
    const [docname, setDocname] = useState<string | null>(() => {
        if (pathDocname) return decodeURIComponent(pathDocname);
        const params = new URLSearchParams(location.search);
        return params.get("docname");
    });

    // If landed on bare /project-registration, redirect to /project-registration/new/<tempId>
    useEffect(() => {
        if (!pathDocname && !pathTempId) {
            const newId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            navigate(`/project-registration/new/${newId}`, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Stable IndexedDB key: tempId from URL for new forms, real docname for existing
    const endorsementSessionId = pathTempId || docname || "";

    const isApprovedEndorsement = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get("isApprovedEndorsement") === "true";
    }, [location.search]);
    const [budgetYears, setBudgetYears] = useState([1]);
    const isConsultancyProject =
        formData.project_type?.toLowerCase() === "consultancy";
    const [showEndorsementModal, setShowEndorsementModal] = useState(false);
    const endorsementCertRef = React.useRef<HTMLDivElement>(null);
    const [showSubmitInsteadModal, setShowSubmitInsteadModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showPreviewAfterSave, setShowPreviewAfterSave] = useState(false);

    // Comment modal state for final submission
    const [showSubmitCommentModal, setShowSubmitCommentModal] = useState(false);
    const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);

    // ============================================================
    // EDITED BY MKY | 2026-04-14 14:52 IST
    // START OF EDIT — Quick Entry State & API
    // ============================================================
    const [quickEntryState, setQuickEntryState] = useState<{ isOpen: boolean; tableName: string; rowIndex: number; columnKey: string; pendingValue: string; isSubmitting: boolean } | null>(null);
    const { call: createCustomDesignation } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.project_registration.project_registration.create_custom_designation"
    );
    // END OF EDIT — MKY | 2026-04-14 14:52 IST
    // ============================================================

    // Edit mode: new forms start editable; existing docs start read-only
    const [isEditMode, setIsEditMode] = useState<boolean>(() => {
        const params = new URLSearchParams(location.search);
        // New doc OR explicitly navigated with edit=true → start editable
        return !params.get("docname") || params.get("edit") === "true";
    });

    // Check if endorsement fields are filled
    const isEndorsementEnabled = useMemo(() => {
        // Project Details
        const hasProjectTitle = !!formData.project_title?.trim();
        const hasProjectType = !!formData.project_type;
        const hasDepartment = !!formData.implementation_department;
        const hasDuration =
            formData.project_type === "Consultancy"
                ? !!formData.project_duration_days
                : !!formData.project_duration_months;

        // PI Details
        const hasPiWebmail = !!formData.pi_webmail;
        const hasPiName = !!formData.principal_investigator_name?.trim();
        const hasPiDesignation = !!formData.designation?.trim();
        const hasPiEmployeeId = !!formData.pi_employee_id?.trim();
        const hasPiDepartment = !!formData.applicant_department;

        const hasFundingAgency = !!formData.funding_agen;

        return (
            hasProjectTitle &&
            hasProjectType &&
            hasDepartment &&
            hasDuration &&
            hasFundingAgency &&
            hasPiWebmail &&
            hasPiName &&
            hasPiDesignation &&
            hasPiEmployeeId &&
            hasPiDepartment
        );
    }, [formData]);

    // Build list of missing endorsement fields for user feedback
    const missingEndorsementFields = useMemo(() => {
        const missing: string[] = [];
        if (!formData.project_title?.trim()) missing.push("Project Title");
        if (!formData.project_type) missing.push("Project Type");
        if (!formData.implementation_department) missing.push("Department/Centre");
        const hasDuration =
            formData.project_type === "Consultancy"
                ? !!formData.project_duration_days
                : !!formData.project_duration_months;
        if (!hasDuration) missing.push("Duration of the Project");
        if (!formData.funding_agen) missing.push("Funding Agency");
        if (!formData.pi_webmail || !formData.principal_investigator_name?.trim())
            missing.push("Principal Investigator (PI)");
        return missing;
    }, [formData]);

    const {
        call: fetchFormData,
        result: formDataResult,
        error: formDataError,
    } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_project_form_data",
    );
    const { data: existingDoc } = useFrappeGetDoc(
        "Project Registration",
        docname ?? "",
        {
            enabled: !!docname,
        },
    );
    const {
        call: submitForm,
        result: submitResult,
        error: submitError,
    } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_data",
    );
    const { call: submitProjectRegistration } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.project_registration.project_registration.submit_project_registration"
    );
    const {
        call: saveDraft,
        result: saveResult,
        error: saveError,
    } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_draft",
    );
    const {
        call: saveEndorsementDraft,
        result: saveEndorsementResult,
        error: saveEndorsementError,
    } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_endorsement_draft",
    );
    const { call: fetchPiDetails } = useFrappePostCall(
        commonAPI.getUserDetailsByEmail,
    );
    const { data: allFundingAgencies, mutate: mutateFundingAgencies } = useFrappeGetDocList("fundingagency_", {
        fields: [
            "name",
            "funding_agency_name",
            "funding_agency_initials",
            "funding_agency_type_1",
            "origin_of_funding_agency",
            "ministry_funding_agency",
            "fundingagency_address",
            "fundingagency_state",
            "fundingagency_postalcode",
            "fundingagency_country",
            "funding_agency_email",
            "funding_agency_contact_no",
            "gstin_of_funding_agency",
            "funding_agency_overhead",
            "funding_agency_id",
        ],
        limit: 0,
        revalidateOnFocus: false,
    } as any);

    // Keep a ref to allFundingAgencies so callbacks always see the latest data
    const allFundingAgenciesRef = useRef(allFundingAgencies);
    useEffect(() => {
        allFundingAgenciesRef.current = allFundingAgencies;
    }, [allFundingAgencies]);

    // Funding Agency Sheet state (must be after allFundingAgencies)
    const [showFundingAgencySheet, setShowFundingAgencySheet] = useState(false);
    const [newAgencyData, setNewAgencyData] = useState<Record<string, string>>({ fundingagency_country: "India" });
    const [isSavingAgency, setIsSavingAgency] = useState(false);
    const { call: insertDoc } = useFrappePostCall("frappe.client.insert");

    const duplicateAgency = useMemo(() => {
        const typedName = newAgencyData.funding_agency_name?.trim().toLowerCase();
        const typedInitials = newAgencyData.funding_agency_initials?.trim().toLowerCase();
        if (!allFundingAgencies) return null;
        return allFundingAgencies.find((a: any) => {
            const existingName = a.funding_agency_name?.trim().toLowerCase() ?? "";
            const existingInitials = a.funding_agency_initials?.trim().toLowerCase() ?? "";
            if (!existingName) return false;
            const existingPrefix = existingName.split(" - ")[0].trim();
            if (typedName && typedName.length >= 2) {
                if (existingName === typedName || existingPrefix === typedName || existingInitials === typedName) return true;
                if (typedName.length >= 3 && existingName.includes(typedName)) return true;
            }
            if (typedInitials && typedInitials.length >= 1 && existingInitials && existingInitials === typedInitials) return true;
            return false;
        }) || null;
    }, [newAgencyData.funding_agency_name, newAgencyData.funding_agency_initials, allFundingAgencies]);

    const handleAgencyFieldChange = (key: string, value: string) => {
        setNewAgencyData(prev => {
            const next = { ...prev, [key]: value };
            if (key === "funding_agency_type_1") {
                if (value !== "Others") next.specify_other_funding_agency_type = "";
                if (value !== "Government") { next.ministry_funding_agency = ""; next.specify_other_ministry = ""; }
            }
            if (key === "ministry_funding_agency" && value !== "Others") {
                next.specify_other_ministry = "";
            }
            if (key === "origin_of_funding_agency") {
                if (value === "International") {
                    next.gstin_of_funding_agency = "";
                    next.fundingagency_state = "";
                    next.fundingagency_country = "";
                }
                if (value === "National") {
                    next.fundingagency_country = "India";
                }
            }
            return next;
        });
    };

    const handleSaveFundingAgency = async () => {
        const d = newAgencyData;
        const errors: string[] = [];
        if (!d.funding_agency_name?.trim()) errors.push("Funding Agency Name is required.");
        if (d.origin_of_funding_agency === "National") {
            if (!d.fundingagency_state?.trim()) errors.push("State is required for National agencies.");
        }
        if (d.funding_agency_type_1 === "Others" && !d.specify_other_funding_agency_type?.trim()) {
            errors.push("Please specify the funding agency type.");
        }
        if (d.funding_agency_type_1 === "Government" && d.origin_of_funding_agency === "National" && !d.ministry_funding_agency?.trim()) {
            errors.push("Ministry / Department is required.");
        }
        if (d.ministry_funding_agency === "Others" && !d.specify_other_ministry?.trim()) {
            errors.push("Please specify the ministry.");
        }
        if (errors.length) { alert(errors.join("\n")); return; }
        if (duplicateAgency) return;
        setIsSavingAgency(true);
        try {
            await insertDoc({ doc: { doctype: "fundingagency_", ...newAgencyData } });
            setShowFundingAgencySheet(false);
            setNewAgencyData({ fundingagency_country: "India" });
            mutateFundingAgencies();
        } catch (err: any) {
            alert("Failed to save: " + (err?.message || "Unknown error"));
        } finally {
            setIsSavingAgency(false);
        }
    };

    const { call: fetchBudgetHeads, result: budgetHeadsResult } =
        useFrappePostCall(
            "rndopsapp.rndopsapp.doctype.budget_head.budget_head.get_budget_head",
        );
    const { call: fetchDeptHead } = useFrappePostCall(
        "frappe.client.get_value",
    );
    const { call: updatePfmsFields } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.project_registration.project_registration.update_project_fields",
    );

    // --- STABILIZED EVENT HANDLERS & RENDER FUNCTIONS ---
    const handleFileChange = useCallback(
        (fieldname: string, file: File | null) => {
            setFormData((prev) => ({ ...prev, [fieldname]: file }));
        },
        [],
    );

    // --- BUSINESS LOGIC HELPERS ---

    const calculateConsultancy = useCallback((currentData: FormData) => {
        const category = currentData.consultancy_category;
        const gstRate = parseFloat(currentData.consultancy_gst_rate) || 18;
        const updates: Partial<FormData> = {};

        if (!category) return updates;

        // --- LOGIC FOR CATEGORY D (Technology Transfer) ---
        if (category.startsWith("Category D")) {
            // r2: round to 2dp for user-facing decimal fields (net CF, net OE)
            const r2 = (v: number) => Math.round(v * 100) / 100;

            // User inputs — keep as entered (may have decimals)
            const grandTotal = parseFloat(currentData.cat_d_grand_total_input) || 0;
            const cfInput = parseFloat(currentData.cat_d_consultancy_fee_input) || 0;

            // 1. project_cost_excl_gst = round(grand_total / (1 + gst_rate/100))  → integer
            const projectCostExclGst = Math.round(grandTotal / (1 + gstRate / 100));

            // 2. operational_expense = round(project_cost - consultancy_fee)  → integer, >= 0
            const operationalExpense = Math.max(0, Math.round(projectCostExclGst - cfInput));

            // 3. institute_share = round(consultancy_fee × 0.20)  → integer
            const instituteShare = Math.round(cfInput * 0.2);

            // 4. overhead_on_cf = round(consultancy_fee × 0.10)  → integer
            const overheadOnCf = Math.round(cfInput * 0.1);

            // 5. overhead_on_oe = round(operational_expense × 0.10)  → integer
            const overheadOnOe = Math.round(operationalExpense * 0.1);

            // 6. total_overhead = overhead_on_cf + overhead_on_oe  (both already integers)
            const totalOverhead = overheadOnCf + overheadOnOe;

            // 7. net_consultancy_fee = consultancy_fee - institute_share - overhead_on_cf
            //    IS and OH are integers so subtraction is clean; r2 kills any float dust
            const netConsultancyFee = r2(Math.max(0, cfInput - instituteShare - overheadOnCf));

            // 8. net_operational_expense = operational_expense - overhead_on_oe
            //    OE and OH are integers so result is clean
            const netOperationalExpense = Math.max(0, operationalExpense - overheadOnOe);

            // 9. gst_amount = round(grand_total - project_cost_excl_gst)  → integer, >= 0
            const gstAmount = Math.max(0, Math.round(grandTotal - projectCostExclGst));

            updates.cat_d_project_cost_excl_gst = projectCostExclGst;
            updates.operational_expense_input_inc_10_oh = operationalExpense;
            updates.cat_d_institute_share = instituteShare;
            updates.cat_d_total_overhead = totalOverhead;
            updates.cat_d_cf_base = netConsultancyFee;
            updates.cat_d_oe_base = netOperationalExpense;
            updates.cat_d_gst_amt = gstAmount;
            updates.cat_d_grand_total_calc = grandTotal;
        }
        // --- LOGIC FOR CATEGORY T (Routine) & E (Non-Routine) ---
        else {
            const te = parseFloat(currentData.cat_ef_total_amount) || 0; // Total Cost Excluding GST
            let honorariumRatio = 0;
            let instituteRatio = 0;

            if (
                category.includes("Routine") &&
                !category.includes("Non-Routine")
            ) {
                // Category T: 30% Honorarium, 70% Institute
                honorariumRatio = 0.3;
                instituteRatio = 0.7;
            } else if (category.includes("Non-Routine")) {
                // Category E: 70% Honorarium, 30% Institute
                honorariumRatio = 0.7;
                instituteRatio = 0.3;
            }

            const honorarium = Math.round(te * honorariumRatio);
            const instShare = Math.round(te * instituteRatio);

            const gstAmtEf = Math.round(te * (gstRate / 100));
            const grandTotalEf = te + gstAmtEf;

            updates.cat_ef_honorarium = honorarium;
            updates.cat_ef_institute_share = instShare;
            updates.cat_ef_gst = gstAmtEf;
            updates.cat_ef_grand_total = grandTotalEf;
        }
        return updates;
    }, []);

    const buildConsultancyBudgetRows = useCallback(
        (currentData: FormData, numYears: number) => {
            const category = currentData.consultancy_category;
            if (!category) return null;

            const n = Math.max(1, numYears);
            const makeRow = (head: string, amount: number) => ({
                head,
                years: Array.from({ length: n }, (_, i) =>
                    i === 0 ? amount : 0,
                ),
            });

            if (category.startsWith("Category D")) {
                const overhead =
                    (parseFloat(currentData.cat_d_institute_share) || 0) +
                    (parseFloat(currentData.cat_d_total_overhead) || 0);
                return [
                    makeRow("Overhead", overhead),
                    makeRow(
                        "Consultancy Fee",
                        parseFloat(currentData.cat_d_cf_base) || 0,
                    ),
                    makeRow(
                        "Operational",
                        parseFloat(currentData.cat_d_oe_base) || 0,
                    ),
                    makeRow("Others", parseFloat(currentData.cat_d_gst_amt) || 0),
                ];
            } else if (
                category.includes("Routine") &&
                !category.includes("Non-Routine")
            ) {
                return [
                    makeRow(
                        "Overhead",
                        parseFloat(currentData.cat_ef_institute_share) || 0,
                    ),
                    makeRow(
                        "Consultancy Fee",
                        parseFloat(currentData.cat_ef_honorarium) || 0,
                    ),
                    makeRow(
                        "Others",
                        parseFloat(currentData.cat_ef_gst) || 0,
                    ),
                ];
            } else if (category.includes("Non-Routine")) {
                return [
                    makeRow(
                        "Overhead",
                        parseFloat(currentData.cat_ef_institute_share) || 0,
                    ),
                    makeRow(
                        "Consultancy Fee",
                        parseFloat(currentData.cat_ef_honorarium) || 0,
                    ),
                    makeRow(
                        "Others",
                        parseFloat(currentData.cat_ef_gst) || 0,
                    ),
                ];
            }
            return null;
        },
        [],
    );

    const calculateParentTotals = useCallback((currentData: FormData) => {
        let total1st = 0,
            total2nd = 0,
            total3rd = 0,
            total4th = 0,
            total5th = 0;
        let grandTotal = 0;

        (currentData.proposed_budget_breakup || []).forEach((row: any) => {
            const years = row.years || [];
            total1st += parseFloat(years[0] || 0);
            total2nd += parseFloat(years[1] || 0);
            total3rd += parseFloat(years[2] || 0);
            total4th += parseFloat(years[3] || 0);
            total5th += parseFloat(years[4] || 0);
            grandTotal += (years as any[]).reduce(
                (a, b) => a + (parseFloat(b) || 0),
                0,
            );
        });

        return {
            total_first_year_budget: total1st,
            total_second_year_budget: total2nd,
            total_third_year_budget: total3rd,
            total_fourth_year_budget: total4th,
            total_fifth_year_budget: total5th,
            grand_total_proposal: grandTotal,
            total_budget_amount: grandTotal,
        };
    }, []);

    useEffect(() => {
        if (!isConsultancyProject) return;
        if (budgetYears.length !== 1) {
            setBudgetYears([1]);
        }
        setFormData((prev) => {
            const rows = prev.proposed_budget_breakup || [];
            if (!rows.some((row: any) => (row.years || []).length !== 1)) {
                return prev;
            }
            const nextData = {
                ...prev,
                proposed_budget_breakup: rows.map((row: any) => ({
                    ...row,
                    years: [Number((row.years || [])[0] || 0)],
                })),
            };
            return { ...nextData, ...calculateParentTotals(nextData) };
        });
    }, [isConsultancyProject, budgetYears.length, calculateParentTotals]);

    const calculateEndDate = useCallback((currentData: FormData) => {
        const startDate = currentData.prj_start_date;
        const durationMonths =
            parseInt(currentData.project_duration_months) || 0;
        const durationDays = parseInt(currentData.project_duration_days) || 0;

        if (!startDate) return null;

        const date = new Date(startDate);
        let valid = false;

        if (durationMonths > 0) {
            date.setMonth(date.getMonth() + durationMonths);
            date.setDate(date.getDate() - 1); // Subtract 1 day
            valid = true;
        }
        if (durationDays > 0) {
            date.setDate(date.getDate() + durationDays);
            valid = true;
        }

        if (!valid) return null;
        return date.toISOString().split("T")[0];
    }, []);

    const controlYearFieldsVisibility = useCallback(
        (durationMonths: number) => {
            const years =
                durationMonths <= 12
                    ? 1
                    : durationMonths <= 24
                        ? 2
                        : durationMonths <= 36
                            ? 3
                            : durationMonths <= 48
                                ? 4
                                : 5;
            // Update fields visibility state
            setFields((prevFields) =>
                prevFields.map((field) => {
                    const totals = [
                        "total_first_year_budget",
                        "total_second_year_budget",
                        "total_third_year_budget",
                        "total_fourth_year_budget",
                        "total_fifth_year_budget",
                    ];
                    if (totals.includes(field.fieldname)) {
                        const yearIndex = totals.indexOf(field.fieldname);
                        return { ...field, hidden: yearIndex + 1 > years };
                    }
                    return field;
                }),
            );
            // Update budget table years
            setBudgetYears(Array.from({ length: years }, (_, i) => i + 1));
            // Resize budget rows if years reduced (optional, or just handle in render)
            // We'll update the rows in formData to ensure data consistency
            setFormData((prev) => {
                const updatedRows = (prev.proposed_budget_breakup || []).map(
                    (row) => {
                        const currentYears = row.years || [];
                        // Resize array
                        const newYears = Array(years)
                            .fill(0)
                            .map((_, i) => currentYears[i] || 0);
                        return { ...row, years: newYears };
                    },
                );
                // Recalculate totals with new years
                // We can call calculateParentTotals here but we need the function reference which is defined above.
                // Ideally we should use a separate effect or just return updates.
                // For simplicity, we just update the structure here.
                return {
                    ...prev,
                    proposed_budget_breakup: updatedRows,
                };
            });
        },
        [],
    );

    const updateApproverAndHead = useCallback(
        async (deptId: string) => {
            if (!deptId) return {};
            try {
                const r = await fetchDeptHead({
                    doctype: "Department_prornd",
                    fieldname: "dept_head",
                    name: deptId,
                });
                if (r?.message?.dept_head) {
                    return {
                        department_head: r.message.dept_head,
                        head_approver: r.message.dept_head,
                    };
                }
            } catch (e) {
                console.error("Failed to fetch department head", e);
            }
            return {};
        },
        [fetchDeptHead],
    );

    const handleFieldChangeWithSideEffects = useCallback(
        async (fieldname: string, value: any) => {
            // 1. Update the specific field first
            let updatedData = { ...formData, [fieldname]: value };

            // 2. Run Side Effects based on fieldname
            if (fieldname === "pi_webmail") {
                if (value) {
                    setIsFetchingPiDetails(true);
                    try {
                        const result = await fetchPiDetails({
                            user_email: value,
                        });
                        if (result?.message) {
                            const details = result.message;
                            let departmentLinkValue = "";
                            // Handle both old and new API response structures
                            const deptName =
                                details.department_name ||
                                details.department ||
                                details.applicant_department;

                            if (
                                deptName &&
                                linkOptions["applicant_department"]
                            ) {
                                const matchedOption = linkOptions[
                                    "applicant_department"
                                ].find(
                                    (opt) =>
                                        opt.label === deptName ||
                                        opt.value === deptName,
                                );
                                departmentLinkValue =
                                    matchedOption?.value || "";
                            }
                            updatedData = {
                                ...updatedData,
                                pi_userid: value,
                                pi_employee_id:
                                    details.employee_id ||
                                    details.pi_employee_id ||
                                    "",
                                principal_investigator_name:
                                    details.full_name ||
                                    details.principal_investigator_name ||
                                    "",
                                designation:
                                    details.designation_name ||
                                    details.designation ||
                                    "",
                                applicant_department: departmentLinkValue,
                            };
                            // Trigger Approver Update for Applicant Dept
                            const approverUpdates =
                                await updateApproverAndHead(
                                    departmentLinkValue,
                                );
                            updatedData = {
                                ...updatedData,
                                ...approverUpdates,
                            };
                        }
                    } catch (err) {
                        console.error("Failed to fetch main PI details:", err);
                    } finally {
                        setIsFetchingPiDetails(false);
                    }
                } else {
                    updatedData = {
                        ...updatedData,
                        pi_userid: "",
                        pi_employee_id: "",
                        principal_investigator_name: "",
                        designation: "",
                        applicant_department: "",
                    };
                }
            }

            if (fieldname === "funding_agen") {
                const agencies = allFundingAgenciesRef.current;
                if (value && agencies?.length) {
                    // Auto-fill from the selected Funding Agency immediately
                    const agency = (agencies as any[]).find(
                        (a: any) =>
                            String(a.name) === String(value) ||
                            a.funding_agency_name === value,
                    );
                    if (agency) {
                        updatedData = {
                            ...updatedData,
                            fund_agen_initials: agency.funding_agency_initials || "",
                            funding_agency_type: agency.funding_agency_type_1 || "",
                            origin_of_funding_agency: agency.origin_of_funding_agency || "",
                            funding_agency_ministry: agency.ministry_funding_agency || "",
                            address_country: agency.fundingagency_country || "",
                            address_state: agency.fundingagency_state || "",
                            address_street_village_locality: agency.fundingagency_address || "",
                            address_postal_code: agency.fundingagency_postalcode || "",
                            gstin_number: agency.gstin_of_funding_agency || "",
                            funding_agency_id: agency.funding_agency_id || "",
                        };
                    }
                } else if (!value) {
                    // Funding agency cleared — reset all dependent fields
                    updatedData = {
                        ...updatedData,
                        fund_agen_initials: "",
                        funding_agency_type: "",
                        origin_of_funding_agency: "",
                        funding_agency_ministry: "",
                        funding_agency_schemes: "",
                        address_street_village_locality: "",
                        address_state: "",
                        address_postal_code: "",
                        address_country: "",
                        gstin_number: "",
                        funding_agency_id: "",
                    };
                }
            }

            // Approver Logic for Implementation Dept Change
            if (fieldname === "implementation_department") {
                const approverUpdates = await updateApproverAndHead(value);
                updatedData = { ...updatedData, ...approverUpdates };
            }

            // 3. Consultancy Calculations
            if (
                [
                    "consultancy_category",
                    "consultancy_gst_rate",
                    "cat_d_grand_total_input",
                    "cat_d_consultancy_fee_input",
                    "cat_ef_total_amount",
                ].includes(fieldname)
            ) {
                // Validate CF input does not exceed 29.99% of project cost excl. GST
                if (
                    updatedData.consultancy_category?.startsWith("Category D") &&
                    fieldname === "cat_d_consultancy_fee_input"
                ) {
                    const gstR = parseFloat(updatedData.consultancy_gst_rate) || 18;
                    const gt = parseFloat(updatedData.cat_d_grand_total_input) || 0;
                    const projectCost = Math.round(gt / (1 + gstR / 100));
                    const maxCf = Math.floor(projectCost * 0.2999 * 100) / 100;
                    const enteredCf = parseFloat(updatedData.cat_d_consultancy_fee_input) || 0;
                    if (projectCost > 0 && enteredCf > maxCf) {
                        alert(
                            `Consultancy Fee cannot exceed 29.99% of Total Project Cost.\n\nMax allowed: ${maxCf.toLocaleString()} (29.99% of ${projectCost.toLocaleString()})`,
                        );
                        // Revert to previous valid value
                        updatedData = { ...updatedData, cat_d_consultancy_fee_input: formData.cat_d_consultancy_fee_input ?? "" };
                        setFormData(updatedData);
                        return;
                    }
                }
                const consultancyUpdates = calculateConsultancy(updatedData);
                updatedData = { ...updatedData, ...consultancyUpdates };

                // Auto-fill proposed budget rows from calculated consultancy amounts
                const budgetRows = buildConsultancyBudgetRows(updatedData, 1);
                if (budgetRows) {
                    updatedData = { ...updatedData, proposed_budget_breakup: budgetRows };
                    const totals = calculateParentTotals(updatedData);
                    updatedData = { ...updatedData, ...totals };
                }
            }

            // 4. Project Duration / End Date Logic
            if (
                [
                    "prj_start_date",
                    "project_duration_months",
                    "project_duration_days",
                    "project_type",
                ].includes(fieldname)
            ) {
                const newEndDate = calculateEndDate(updatedData);
                updatedData.prj_end_date = newEndDate || "";

                if (
                    updatedData.project_type === "Research" &&
                    updatedData.project_duration_months
                ) {
                    controlYearFieldsVisibility(
                        parseInt(updatedData.project_duration_months) || 0,
                    );
                } else if (
                    updatedData.project_type === "Consultancy"
                ) {
                    controlYearFieldsVisibility(1);
                    setBudgetYears([1]);
                    updatedData.proposed_budget_breakup = (
                        updatedData.proposed_budget_breakup || []
                    ).map((row: any) => ({
                        ...row,
                        years: [Number((row.years || [])[0] || 0)],
                    }));
                    updatedData = {
                        ...updatedData,
                        ...calculateParentTotals(updatedData),
                    };
                } else if (
                    updatedData.project_type === "Testing" &&
                    updatedData.project_duration_days
                ) {
                    const days =
                        parseInt(updatedData.project_duration_days) || 0;
                    controlYearFieldsVisibility(Math.ceil(days / 30));
                }
            }

            setFormData(updatedData);
        },
        [
            formData,
            fetchPiDetails,
            linkOptions,

            calculateConsultancy,
            buildConsultancyBudgetRows,
            calculateParentTotals,
            budgetYears,
            updateApproverAndHead,
            calculateEndDate,
            controlYearFieldsVisibility,
        ],
    );

    // ============================================================
    // EDITED BY MKY | 2026-04-14 14:52 IST
    // START OF EDIT — Quick Entry Handlers
    // ============================================================
    const handleOpenQuickEntry = useCallback((tableName: string, rowIndex: number, columnKey: string) => {
        setQuickEntryState({ isOpen: true, tableName, rowIndex, columnKey, pendingValue: "", isSubmitting: false });
    }, []);

    const handleQuickEntrySave = async () => {
        if (!quickEntryState || !quickEntryState.pendingValue.trim()) return;

        setQuickEntryState(prev => prev ? { ...prev, isSubmitting: true } : null);

        // ============================================================
        // EDITED BY MKY | 2026-04-14 15:35 IST
        // START OF EDIT — Handle duplicate designation alert + new entry creation
        // Backend now returns status="duplicate" when the designation already exists.
        // We alert the user and keep the modal open so they can change their input.
        // ============================================================
        try {
            const apiRes = await createCustomDesignation({
                designation_name: quickEntryState.pendingValue,
                designation_type: "Project Staff"
            });

            const result = apiRes?.message;

            if (result?.status === "duplicate") {
                // Alert the user and keep the modal open for correction
                alert(`⚠️ Designation already exists: "${result.message || result.designation_name}". Please choose it from the dropdown or enter a different name.`);
                setQuickEntryState(prev => prev ? { ...prev, isSubmitting: false } : null);
                return;
            }

            if (result?.status === "success") {
                const finalDesignation = result.designation_name;

                // Optimistically inject into dropdown options so it's immediately selectable
                setLinkOptions((prev: any) => {
                    const currentOpts = prev["designation_name"] || [];
                    if (!currentOpts.find((o: any) => String(o.value) === String(finalDesignation))) {
                        return {
                            ...prev,
                            "designation_name": [...currentOpts, { value: finalDesignation, label: finalDesignation }]
                        };
                    }
                    return prev;
                });

                // Apply the new designation to the paused table row
                handleTableRowChange(quickEntryState.tableName, quickEntryState.rowIndex, quickEntryState.columnKey, finalDesignation);
                setQuickEntryState(null); // Close modal
            } else {
                alert(`Error: ${result?.message || 'Failed to create custom designation.'}`);
                setQuickEntryState(prev => prev ? { ...prev, isSubmitting: false } : null);
            }
        } catch (e: any) {
            console.error("Quick Entry error", e);
            alert("Failed to create custom designation. Please try again.");
            setQuickEntryState(prev => prev ? { ...prev, isSubmitting: false } : null);
        }
        // END OF EDIT — MKY | 2026-04-14 15:35 IST
        // ============================================================
    };
    // END OF EDIT — MKY | 2026-04-14 14:52 IST
    // ============================================================


    const handleTableRowChange = useCallback(
        (
            tableName: string,
            rowIndex: number,
            fieldname: string,
            value: any,
        ) => {
            setFormData((prev) => {
                const t = [...(prev[tableName] || [])];
                t[rowIndex] = { ...t[rowIndex], [fieldname]: value };
                return { ...prev, [tableName]: t };
            });
        },
        [],
    );
    const handleEquipmentRowChange = useCallback(
        (
            tableName: string,
            rowIndex: number,
            fieldname: string,
            value: any,
        ) => {
            setFormData((prev) => {
                const t = [...(prev[tableName] || [])];
                t[rowIndex] = { ...t[rowIndex], [fieldname]: value };
                const qty =
                    parseFloat(
                        fieldname === "item_quantity"
                            ? value
                            : t[rowIndex].item_quantity,
                    ) || 0;
                const unitCost =
                    parseFloat(
                        fieldname === "equip_unit_cost"
                            ? value
                            : t[rowIndex].equip_unit_cost,
                    ) || 0;
                t[rowIndex].equip_total_unit_cost = (qty * unitCost).toFixed(2);
                return { ...prev, [tableName]: t };
            });
        },
        [],
    );
    const handleTableFileChange = useCallback(
        (
            tableName: string,
            rowIndex: number,
            fieldname: string,
            file: File | null,
        ) => {
            setFormData((prev) => {
                const t = [...(prev[tableName] || [])];
                t[rowIndex] = { ...t[rowIndex], [fieldname]: file };
                return { ...prev, [tableName]: t };
            });
        },
        [],
    );
    const addTableRow = useCallback((tableName: string, newRow: object) => {
        const newId =
            Date.now().toString() + Math.random().toString(36).substring(2, 9);
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

    const handleCollaboratorChange = useCallback(
        async (
            tableName: string,
            rowIndex: number,
            selectedUserEmail: string,
        ) => {
            const user = (linkOptions["pi_webmail"] || []).find(
                (c) => c.value === selectedUserEmail,
            );
            const prefix =
                tableName === "co_investigator_table" ? "copi" : "pi";
            let designation = user?.designation || "";
            let department = "";
            let address = "";
            let contact = "";
            if (selectedUserEmail) {
                try {
                    const result = await fetchPiDetails({
                        user_email: selectedUserEmail,
                    });
                    const details = result?.message;
                    if (!designation) {
                        designation =
                            details?.designation_name ||
                            details?.designation ||
                            "";
                    }
                    department =
                        details?.department_name ||
                        details?.applicant_department ||
                        "";
                    address =
                        details?.inst_name_address ||
                        details?.copi_address ||
                        details?.address ||
                        "";
                    contact =
                        details?.mobile_no ||
                        details?.copi_contact ||
                        details?.contact_number ||
                        details?.cell_phone_number ||
                        "";
                } catch (err) {
                    console.error("Failed to fetch collaborator details:", err);
                }
            }
            setFormData((prev) => {
                const t = [...(prev[tableName] || [])];
                t[rowIndex] = {
                    ...t[rowIndex],
                    [`${prefix}_name`]: user?.label || "",
                    [`${prefix}_email`]: user?.value || "",
                    [`${prefix}_designation`]: designation,
                    [`${prefix}_department`]: department,
                    [`${prefix}_address`]: address,
                    [`${prefix}_contact`]: contact,
                };
                return { ...prev, [tableName]: t };
            });
        },
        [linkOptions, fetchPiDetails],
    );

    const addBudgetRow = useCallback(
        () =>
            addTableRow("proposed_budget_breakup", {
                head: "",
                years: budgetYears.map(() => ""),
            }),
        [addTableRow, budgetYears],
    );
    const addBudgetYear = useCallback(() => {
        if (isConsultancyProject) {
            setBudgetYears([1]);
            return;
        }
        if (budgetYears.length < 5) {
            setBudgetYears((prev) => [...prev, prev.length + 1]);
            setFormData((prev) => ({
                ...prev,
                proposed_budget_breakup: (
                    prev.proposed_budget_breakup || []
                ).map((row) => ({ ...row, years: [...(row.years || []), ""] })),
            }));
        } else {
            alert("Maximum of 5 years allowed.");
        }
    }, [budgetYears, isConsultancyProject]);
    const deleteLastBudgetYear = useCallback(() => {
        if (budgetYears.length > 1) {
            setBudgetYears((prev) => prev.slice(0, -1));
            setFormData((prev) => ({
                ...prev,
                proposed_budget_breakup: (
                    prev.proposed_budget_breakup || []
                ).map((row) => ({
                    ...row,
                    years: (row.years || []).slice(0, -1),
                })),
            }));
        }
    }, [budgetYears]);
    const handleBudgetRowChange = useCallback(
        (
            rowIndex: number,
            fieldname: string,
            value: any,
            yearIndex?: number,
        ) => {
            setFormData((prev) => {
                const table = [...(prev.proposed_budget_breakup || [])];
                const row = { ...table[rowIndex] } as {
                    head: string;
                    years: (number | string)[];
                };

                if (fieldname === "years" && yearIndex !== undefined) {
                    const years = [...(row.years || [])];
                    years[yearIndex] = value;
                    row.years = years;
                } else if (fieldname === "head") {
                    row.head = value;
                }

                table[rowIndex] = row;
                const newData = { ...prev, proposed_budget_breakup: table };
                const totals = calculateParentTotals(newData);
                return { ...newData, ...totals };
            });
        },
        [],
    );

    const ALWAYS_HIDDEN_FIELDS = ["department_head", "head_approver"];

    const CONSULTANCY_CALCULATED_FIELDS = new Set([
        "cat_d_project_cost_excl_gst",
        "operational_expense_input_inc_10_oh",
        "cat_d_cf_base",
        "cat_d_oe_base",
        "cat_d_total_overhead",
        "cat_d_institute_share",
        "cat_d_gst_amt",
        "cat_d_grand_total_calc",
    ]);

    const renderField = useCallback(
        (fieldname: string, labelOverride?: string) => {
            const field = fields.find((f) => f.fieldname === fieldname);
            if (!field) {
                if (!ALWAYS_HIDDEN_FIELDS.includes(fieldname)) {
                    // console.warn(`⚠️ Warning: Field '${fieldname}' expected for rendering but not found in API response.`);
                }
                return null;
            }

            if (ALWAYS_HIDDEN_FIELDS.includes(fieldname)) return null;

            // Evaluate depends_on for visibility
            let evalExpr = field.depends_on_eval;
            if (!evalExpr && field.depends_on) {
                evalExpr = field.depends_on;
            }

            if (evalExpr) {
                const isVisible = evaluateDependsOn(evalExpr, formData);
                if (!isVisible) return null;
            }

            // Evaluate dynamic mandatory and read_only states
            let isMandatory = field.mandatory;
            let isReadOnly = field.read_only;

            let mandatoryEval = field.mandatory_depends_on_eval;
            if (!mandatoryEval && field.mandatory_depends_on) {
                mandatoryEval = field.mandatory_depends_on;
            }
            if (mandatoryEval) {
                if (evaluateDependsOn(mandatoryEval, formData)) {
                    isMandatory = true;
                }
            }

            let readOnlyEval = field.read_only_depends_on_eval;
            if (!readOnlyEval && field.read_only_depends_on) {
                readOnlyEval = field.read_only_depends_on;
            }
            if (readOnlyEval) {
                if (evaluateDependsOn(readOnlyEval, formData)) {
                    isReadOnly = true;
                }
            }

            // If form is in view mode, all fields are read-only
            if (!isEditMode) isReadOnly = true;

            // Fields auto-filled from selected Funding Agency are always read-only
            if (AGENCY_READONLY_FIELDS.has(fieldname) && formData.funding_agen) {
                isReadOnly = true;
            }

            // Consultancy calculated fields are always read-only
            if (CONSULTANCY_CALCULATED_FIELDS.has(fieldname)) {
                isReadOnly = true;
            }

            const effectiveField = {
                ...field,
                mandatory: isMandatory,
                read_only: isReadOnly,
                ...(labelOverride ? { label: labelOverride } : {}),
            };
            const options =
                linkOptions[field.options as string] || linkOptions[fieldname];

            return (
                <MemoizedFormField
                    key={field.fieldname}
                    field={effectiveField}
                    value={formData[fieldname]}
                    options={options}
                    onChange={handleFieldChangeWithSideEffects}
                    onFileChange={handleFileChange}
                />
            );
        },
        [
            fields,
            formData,
            linkOptions,
            handleFieldChangeWithSideEffects,
            handleFileChange,
            isEditMode,
        ],
    );

    const renderFields = (fieldnames: string[]) =>
        fieldnames.map((fn) => renderField(fn));

    const fileToBase64 = (
        file: File,
    ): Promise<{ filename: string; content: string }> =>
        new Promise((res, rej) => {
            const r = new FileReader();
            r.readAsDataURL(file);
            r.onload = () =>
                res({ filename: file.name, content: r.result as string });
            r.onerror = (e) => rej(e);
        });

    /**
     * Prepares form data for API submission.
     * Returns { doc_data, files } where files is an array of base64-encoded file objects.
     */
    const prepareDataWithFiles = async (): Promise<{
        doc_data: Record<string, any>;
        files: { filename: string; content: string }[];
    }> => {
        // Re-run consultancy calculations so saved values are always up-to-date
        const recalculated = calculateConsultancy(formData);
        const data: Record<string, any> = JSON.parse(
            JSON.stringify({ ...formData, ...recalculated }),
        );
        const filesArray: { filename: string; content: string }[] = [];

        if (docname) data.name = docname;

        // Remove frappe standard fields that cause "Document modified" conflicts
        delete data.modified;
        delete data.creation;
        delete data.modified_by;
        delete data.owner;
        delete data.docstatus;

        for (const k in formData) {
            const v = formData[k];
            if (v instanceof File) {
                const fileData = await fileToBase64(v);
                filesArray.push(fileData);
                data[k] = v.name; // Store filename in doc_data
            } else if (Array.isArray(v)) {
                for (let i = 0; i < v.length; i++) {
                    for (const rk in v[i]) {
                        if (v[i][rk] instanceof File) {
                            const fileData = await fileToBase64(v[i][rk]);
                            filesArray.push(fileData);
                            data[k][i][rk] = v[i][rk].name; // Store filename
                        }
                    }
                }
            }
        }
        return { doc_data: data, files: filesArray };
    };

    const validateMandatoryFields = (): string[] => {
        const errors: string[] = [];

        // --- Top-level fields ---
        for (const field of fields) {
            if (field.hidden) continue;
            if (
                field.depends_on_eval &&
                !evaluateDependsOn(field.depends_on_eval, formData)
            )
                continue;
            let isMandatory = field.mandatory;
            if (!isMandatory && field.mandatory_depends_on_eval) {
                isMandatory = evaluateDependsOn(
                    field.mandatory_depends_on_eval,
                    formData,
                );
            }
            if (!isMandatory) continue;
            if (field.fieldtype === "Table") continue;
            const value = formData[field.fieldname];
            const isEmpty =
                value === null || value === undefined || value === "";
            if (isEmpty) errors.push(field.label || field.fieldname);
        }

        // --- Consultancy Category D: CF gross must be <= 30% of project cost excl. GST ---
        if (formData.consultancy_category?.startsWith("Category D")) {
            const cfInput = parseFloat(formData.cat_d_consultancy_fee_input) || 0;
            const projectCost = parseFloat(formData.cat_d_project_cost_excl_gst) || 0;
            const limit = Math.round(projectCost * 0.3);
            if (projectCost > 0 && cfInput > limit) {
                errors.push(
                    `Consultancy Fee (₹${cfInput.toLocaleString()}) exceeds 30% of Project Cost Excl. GST — max allowed: ₹${limit.toLocaleString()}`,
                );
            }
        }

        // --- Budget breakup: validate rows only if any rows exist ---
        const budgetRows: any[] = formData.proposed_budget_breakup || [];
        budgetRows.forEach((row, i) => {
            if (!row.head)
                errors.push(
                    `Budget Breakup Row ${i + 1}: Budget Head is required`,
                );
        });

        // --- Additional PI table (only when toggle is "Yes") ---
        if (formData.is_additional_pi === "Yes") {
            const rows: any[] = formData.additional_pi_table || [];
            if (rows.length === 0) {
                errors.push("Additional PI (at least one row required)");
            } else {
                rows.forEach((row, i) => {
                    if (!row.pi_name)
                        errors.push(
                            `Additional PI Row ${i + 1}: Name is required`,
                        );
                });
            }
        }

        // --- Co-Investigator table (only when toggle is "Yes") ---
        if (formData.has_co_pi === "Yes") {
            const rows: any[] = formData.co_investigator_table || [];
            if (rows.length === 0) {
                errors.push("Co-Investigator (at least one row required)");
            } else {
                rows.forEach((row, i) => {
                    if (!row.copi_name)
                        errors.push(`Co-PI Row ${i + 1}: Name is required`);
                });
            }
        }

        // --- Equipment details (only when checkbox is on) ---
        const equipOn =
            formData.equipment_checkbox === true ||
            formData.equipment_checkbox === 1 ||
            formData.equipment_checkbox === "1";
        if (equipOn) {
            const rows: any[] = formData.proposed_equipment_details || [];
            if (rows.length === 0) {
                errors.push("Equipment Details (at least one row required)");
            } else {
                rows.forEach((row, i) => {
                    if (!row.item_name)
                        errors.push(
                            `Equipment Row ${i + 1}: Item Name is required`,
                        );
                });
            }
        }

        // --- Manpower details (only when checkbox is on) ---
        const manpowerOn =
            formData.manpower_checkbox === true ||
            formData.manpower_checkbox === 1 ||
            formData.manpower_checkbox === "1";
        if (manpowerOn) {
            const rows: any[] = formData.proposed_manpower_details || [];
            if (rows.length === 0) {
                errors.push("Manpower Details (at least one row required)");
            } else {
                rows.forEach((row, i) => {
                    if (!row.designation_name)
                        errors.push(
                            `Manpower Row ${i + 1}: Position is required`,
                        );
                });
            }
        }

        return errors;
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isSubmitting || isSavingDraft) return;
        const errors = validateMandatoryFields();
        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }
        setIsSubmitting(true);
        try {
            const { doc_data, files } = await prepareDataWithFiles();
            await submitForm({ docname, doc: doc_data, files });
        } catch (err) {
            alert("File processing error.");
            setIsSubmitting(false);
        }
    };

    const savePageHtmlToIndexedDB = (key: string, html: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("ProjectDraftDB", 1);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains("pageHtml")) {
                    db.createObjectStore("pageHtml", { keyPath: "docname" });
                }
            };
            request.onsuccess = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const tx = db.transaction("pageHtml", "readwrite");
                const store = tx.objectStore("pageHtml");
                store.put({ docname: key, html, savedAt: new Date().toISOString() });
                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = () => { db.close(); reject(tx.error); };
            };
            request.onerror = () => reject(request.error);
        });
    };

    const handleSaveDraft = async () => {
        console.log(
            ">>> handleSaveDraft called! isSavingDraft:",
            isSavingDraft,
            "isSubmitting:",
            isSubmitting,
        );
        if (isSavingDraft || isSubmitting) {
            console.log(
                ">>> Early return due to isSavingDraft or isSubmitting",
            );
            return;
        }
        const errors = validateMandatoryFields();
        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }
        setIsSavingDraft(true);
        try {
            const { doc_data, files } = await prepareDataWithFiles();

            // Generate endorsement HTML content (same as save_endorsement_draft)
            const budgetTotal = (formData.proposed_budget_breakup || []).reduce(
                (acc: number, row: any) =>
                    acc +
                    (row.years || []).reduce(
                        (sum: number, val: any) => sum + Number(val || 0),
                        0,
                    ),
                0,
            );


            const isConsultancy = formData.project_type === "Consultancy";

            const savedBodyHtml = isConsultancy
                ? null
                : await getEndorsementDraft(
                    endorsementSessionId,
                    currentUser || "guest",
                );

            // Endorsement is optional for now — allow saving even if endorsement body is empty

            const endorsementHtml = (isConsultancy || !savedBodyHtml || savedBodyHtml.trim() === "") ? null : getEndorsementHtml({
                proposalId: docname || "IITG-",
                piName: formData.principal_investigator_name,
                piDesignation: formData.designation,
                piDepartment: formData.applicant_department,
                coPiName: formData.co_investigator_table?.[0]?.copi_name || "",
                coPiDesignation:
                    formData.co_investigator_table?.[0]?.copi_designation || "",
                coPiDepartment:
                    formData.co_investigator_table?.[0]?.copi_department || "",
                projectTitle: formData.project_title,
                fundingAgency: formData.funding_agen,
                duration:
                    formData.project_type === "Consultancy"
                        ? `${formData.project_duration_days} days`
                        : `${formData.project_duration_months} months`,
                totalCost: String(budgetTotal),
                bodyHtml: savedBodyHtml || undefined,
            });

            // Debug logging
            console.log("=== SAVE DRAFT DEBUG ===");
            console.log("doc_data keys:", Object.keys(doc_data));
            console.log("files count:", files.length);
            console.log("html_content length:", endorsementHtml?.length || 0);
            console.log(
                "html_content preview:",
                endorsementHtml?.substring(0, 200),
            );

            const payload = {
                docname,
                doc_data: JSON.stringify(doc_data),
                files: files.length > 0 ? files : null,
                html_content: endorsementHtml,
            };

            console.log("API Payload keys:", Object.keys(payload));
            console.log(
                "html_content in payload:",
                payload.html_content
                    ? `${payload.html_content.length} chars`
                    : "MISSING!",
            );

            await saveDraft(payload);

            // Save full page HTML to IndexedDB
            await savePageHtmlToIndexedDB(
                docname || "new",
                document.documentElement.outerHTML,
            );
        } catch (err) {
            console.error("Save draft error:", err);
            alert("File processing error.");
            setIsSavingDraft(false);
        }
    };

    const handleConfirmSubmitInstead = async () => {
        setShowSubmitInsteadModal(false);
        if (isSubmitting || isSavingDraft) return;
        const errors = validateMandatoryFields();
        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }
        setIsSubmitting(true);
        try {
            const { doc_data, files } = await prepareDataWithFiles();
            await submitForm({ doc: doc_data, files });
        } catch (err) {
            alert("File processing error.");
            setIsSubmitting(false);
        }
    };

    // --- DATA FETCHING & INITIALIZATION ---
    useEffect(() => {
        fetchFormData({ docname: docname || undefined });
        fetchBudgetHeads({});
    }, [fetchFormData, fetchBudgetHeads, docname]);

    useEffect(() => {
        if (budgetHeadsResult) {
            const options = budgetHeadsResult.message.map((item: any) => ({
                value: item.budget_head,
                label: item.budget_head,
            }));
            setBudgetHeadOptions(options);
        }
    }, [budgetHeadsResult]);

    useEffect(() => {
        if (formDataResult?.message?.fields) {
            const {
                fields: apiFields,
                link_options,
                prefill_data,
            } = formDataResult.message;

            const modifiedFields = apiFields.map((field: Field) => {
                if (
                    field.fieldname === "involves_international_travel" ||
                    field.fieldname === "project_duration_months" ||
                    field.fieldname === "project_duration_days"
                ) {
                    return {
                        ...field,
                        mandatory: false,
                        mandatory_depends_on: "",
                        mandatory_depends_on_eval: "",
                        depends_on: "",
                        depends_on_eval: ""
                    };
                }
                return field;
            });

            setFields(modifiedFields);
            setLinkOptions(link_options || {});

            const initialFormData: Record<string, any> = { ...prefill_data };
            apiFields.forEach((field: Field) => {
                if (initialFormData[field.fieldname] === undefined) {
                    initialFormData[field.fieldname] = field.default ?? "";
                }
            });

            // Make Equipment and Manpower default unselect as requested
            initialFormData.equipment_checkbox = 0;
            initialFormData.manpower_checkbox = 0;

            // Explicitly unset select defaults to prevent auto-expanding sections
            if (!initialFormData.name) {
                initialFormData.needs_committee_clearance = "";
                initialFormData.is_additional_pi = "";
                initialFormData.has_co_pi = "";
            }

            // Merge: prefill_data provides defaults, but any data already set by
            // existingDoc useEffect takes priority (prev wins over initialFormData)
            setFormData((prev) => ({ ...initialFormData, ...prev }));
            setLoading(false);

            // Only auto-fill PI details for new docs — on edit, existingDoc already has all PI fields.
            // Calling handleFieldChangeWithSideEffects when docname is set would overwrite
            // existingDoc data because it captures stale formData={} in its closure.
            if (!docname) {
                if (prefill_data?.pi_webmail) {
                    handleFieldChangeWithSideEffects(
                        "pi_webmail",
                        prefill_data.pi_webmail,
                    );
                } else if (currentUser) {
                    handleFieldChangeWithSideEffects("pi_webmail", currentUser);
                }
            }
        }
        if (formDataError) {
            console.error("❌ Failed to fetch form data:", formDataError);
            alert("Error fetching form data.");
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formDataResult, formDataError, currentUser]);

    // Override funding_agen options with the full unbounded list from Frappe
    useEffect(() => {
        if (allFundingAgencies && allFundingAgencies.length > 0) {
            const agencyOptions = allFundingAgencies.map((a: any) => ({
                value: a.name,
                label: a.funding_agency_name || a.name,
            }));
            // Store under both the doctype key ("fundingagency_") and the fieldname key
            // so the renderField lookup (linkOptions[field.options] || linkOptions[fieldname]) finds it
            setLinkOptions((prev) => ({
                ...prev,
                "fundingagency_": agencyOptions,
                funding_agen: agencyOptions,
            }));
        }
    }, [allFundingAgencies]);

    // Fields that are auto-filled from the selected Funding Agency (kept read-only)
    const AGENCY_READONLY_FIELDS = new Set([
        "fund_agen_initials",
        "funding_agency_type",
        "origin_of_funding_agency",
        "address_country",
        "address_state",
        "address_street_village_locality",
        "address_postal_code",
        "gstin_number",
        "funding_agency_id",
    ]);

    // Auto-fill agency fields whenever funding_agen or the agencies list changes
    // (fallback for existing docs that load with a pre-set agency)
    useEffect(() => {
        const agencyId = formData.funding_agen;
        if (!agencyId || !allFundingAgencies?.length) return;

        const agency = (allFundingAgencies as any[]).find(
            (a: any) =>
                String(a.name) === String(agencyId) ||
                a.funding_agency_name === agencyId,
        );

        if (!agency) return;

        setFormData((prev) => ({
            ...prev,
            fund_agen_initials: agency.funding_agency_initials || "",
            funding_agency_type: agency.funding_agency_type_1 || "",
            origin_of_funding_agency: agency.origin_of_funding_agency || "",
            funding_agency_ministry: agency.ministry_funding_agency || "",
            address_country: agency.fundingagency_country || "",
            address_state: agency.fundingagency_state || "",
            address_street_village_locality: agency.fundingagency_address || "",
            address_postal_code: agency.fundingagency_postalcode || "",
            gstin_number: agency.gstin_of_funding_agency || "",
            funding_agency_id: agency.funding_agency_id || "",
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.funding_agen, allFundingAgencies]);

    // --- SIDE EFFECTS for dependent API calls ---
    useEffect(() => {
        if (existingDoc) {
            const mappedDoc = { ...existingDoc };

            // Map proposed_budget_breakup to include the years array and head
            // Try all known Frappe field name conventions for year values
            const getYearVal = (row: any, idx: number) => {
                const names = [
                    [
                        `first_year_budget`,
                        `first_year`,
                        `year_1`,
                        `amount_1`,
                        `year1`,
                        `yr_1`,
                    ],
                    [
                        `second_year_budget`,
                        `second_year`,
                        `year_2`,
                        `amount_2`,
                        `year2`,
                        `yr_2`,
                    ],
                    [
                        `third_year_budget`,
                        `third_year`,
                        `year_3`,
                        `amount_3`,
                        `year3`,
                        `yr_3`,
                    ],
                    [
                        `fourth_year_budget`,
                        `fourth_year`,
                        `year_4`,
                        `amount_4`,
                        `year4`,
                        `yr_4`,
                    ],
                    [
                        `fifth_year_budget`,
                        `fifth_year`,
                        `year_5`,
                        `amount_5`,
                        `year5`,
                        `yr_5`,
                    ],
                ];
                for (const key of names[idx] || []) {
                    if (
                        row[key] !== undefined &&
                        row[key] !== null &&
                        row[key] !== ""
                    )
                        return row[key];
                }
                return 0;
            };

            if (
                mappedDoc.proposed_budget_breakup &&
                Array.isArray(mappedDoc.proposed_budget_breakup)
            ) {
                mappedDoc.proposed_budget_breakup =
                    mappedDoc.proposed_budget_breakup.map((row: any) => ({
                        ...row,
                        head:
                            row.budget_head ||
                            row.account_head ||
                            row.head ||
                            "",
                        years: [0, 1, 2, 3, 4].map((i) => getYearVal(row, i)),
                    }));
            }

            setFormData((prev) => ({ ...prev, ...mappedDoc }));
            setLoading(false);

            // Determine number of budget year columns
            const pType = existingDoc.project_type;
            let durationMonthsToParse = 0;
            if (pType === "Research") {
                durationMonthsToParse =
                    parseInt(existingDoc.project_duration_months) || 0;
            } else if (pType === "Consultancy") {
                durationMonthsToParse = 1;
                if (mappedDoc.proposed_budget_breakup?.length > 0) {
                    mappedDoc.proposed_budget_breakup =
                        mappedDoc.proposed_budget_breakup.map((row: any) => ({
                            ...row,
                            years: [Number((row.years || [])[0] || 0)],
                        }));
                    setFormData((prev) => ({
                        ...prev,
                        ...mappedDoc,
                        ...calculateParentTotals(mappedDoc),
                    }));
                }
            } else if (pType === "Testing") {
                const days = parseInt(existingDoc.project_duration_days) || 0;
                durationMonthsToParse = Math.ceil(days / 30);
            }

            let yearCount =
                durationMonthsToParse > 0
                    ? durationMonthsToParse <= 12
                        ? 1
                        : durationMonthsToParse <= 24
                            ? 2
                            : durationMonthsToParse <= 36
                                ? 3
                                : durationMonthsToParse <= 48
                                    ? 4
                                    : 5
                    : 0;

            // Fallback: derive from how many year columns have data in the rows
            if (
                yearCount === 0 &&
                mappedDoc.proposed_budget_breakup?.length > 0
            ) {
                const firstRow = mappedDoc.proposed_budget_breakup[0];
                for (let i = 4; i >= 0; i--) {
                    if (Number(firstRow.years?.[i]) > 0) {
                        yearCount = i + 1;
                        break;
                    }
                }
                if (yearCount === 0) yearCount = 1;
            }

            if (yearCount > 0) {
                setBudgetYears(
                    Array.from({ length: yearCount }, (_, i) => i + 1),
                );
                setFields((prevFields) =>
                    prevFields.map((field) => {
                        const totals = [
                            "total_first_year_budget",
                            "total_second_year_budget",
                            "total_third_year_budget",
                            "total_fourth_year_budget",
                            "total_fifth_year_budget",
                        ];
                        if (totals.includes(field.fieldname)) {
                            return {
                                ...field,
                                hidden:
                                    totals.indexOf(field.fieldname) + 1 >
                                    yearCount,
                            };
                        }
                        return field;
                    }),
                );
            }
        }
    }, [existingDoc]);


    useEffect(() => {
        if (submitResult) {
            const savedDocname = submitResult.message.docname;
            setDocname(savedDocname);
            navigate(`/project-details/${savedDocname}`);
        }
        if (submitError) alert(`Submission error: ${submitError.message}`);
        setIsSubmitting(false);
    }, [submitResult, submitError]);
    useEffect(() => {
        if (saveResult) {
            const savedDocname = saveResult.message.docname;
            setDocname(savedDocname);
            setShowPreviewModal(true);
        }
        if (saveError) alert(`Draft save error: ${saveError.message}`);
        setIsSavingDraft(false);
    }, [saveResult, saveError]);
    useEffect(() => {
        if (saveEndorsementResult) {
            alert(`Endorsement Submitted!

After the Dean approves this endorsement, the project can be registered as a full project.
Until then, the project is not yet eligible for submission.`);
            navigate("/projects-view");
        }
        if (saveEndorsementError) {
            alert(`Endorsement save error: ${saveEndorsementError.message}`);
        }
    }, [saveEndorsementResult, saveEndorsementError]);

    // --- RENDER LOGIC ---
    if (loading)
        return (
            <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] p-4 sm:p-6">
                {/* Skeleton header bar */}
                <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between">
                    <div className="h-6 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                    <div className="h-8 w-28 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                </div>

                {/* Skeleton tab bar */}
                <div className="max-w-5xl mx-auto mb-4 flex gap-2">
                    {[100, 80, 120, 90, 110].map((w, i) => (
                        <div
                            key={i}
                            className="h-7 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse"
                            style={{ width: w }}
                        />
                    ))}
                </div>

                {/* Skeleton form card */}
                <div className="max-w-5xl mx-auto space-y-4">
                    {[1, 2, 3].map((card) => (
                        <div
                            key={card}
                            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4"
                        >
                            {/* Section title */}
                            <div className="h-4 w-36 rounded bƒg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map((field) => (
                                    <div key={field} className="space-y-1.5">
                                        <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                                        <div className="h-9 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Spinner + label at bottom */}
                    <div className="flex items-center justify-center gap-3 py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#D97757] border-t-transparent" />
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            Fetching form data…
                        </span>
                    </div>
                </div>
            </div>
        );

    if (docname && !formData.project_title) {
        return (
            <div className="min-h-screen bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-[#27272A] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-2xl shadow-sm p-8 max-w-md w-full text-center space-y-4">
                    <div className="text-3xl">⚠️</div>
                    <h2 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                        Data failed to load
                    </h2>
                    <p className="text-[13px] text-[#71717A] dark:text-[#A1A1AA]">
                        The form data did not load correctly. Please go back and click <span className="font-semibold text-[#4A6CF7]">Edit</span> again to reload.
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="btn-primary-accent justify-center"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const budgetTableData = formData.proposed_budget_breakup || [];
    const totalBudgetAmount = budgetTableData.reduce(
        (acc, row) =>
            acc +
            (row.years || []).reduce(
                (sum: number, val) => sum + Number(val || 0),
                0,
            ),
        0,
    );
    const getYearTotal = (yearIndex: number) =>
        budgetTableData.reduce(
            (sum: number, row) =>
                sum + Number((row.years || [])[yearIndex] || 0),
            0,
        );

    const tabs = [
        {
            label: "Project Details",
            icon: FileText,
            activeClass: "bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A] shadow-sm shadow-[#4A6CF7]/10 dark:bg-[#4A6CF7]/18 dark:border-[#818CF8] dark:text-[#C7D2FE]",
            inactiveClass: "border-[#C7D2FE] bg-[#EEF2FF]/55 text-[#1E3A8A] hover:bg-[#EEF2FF] dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/10 dark:text-[#C7D2FE]",
            iconClass: "text-[#4A6CF7] dark:text-[#A5B4FC]",
        },
        {
            label: "PI & Collaborators",
            icon: Users,
            activeClass: "bg-[#ECFDF5] border-[#10B981] text-[#065F46] shadow-sm shadow-[#10B981]/10 dark:bg-[#10B981]/15 dark:border-[#34D399] dark:text-[#A7F3D0]",
            inactiveClass: "border-[#A7F3D0] bg-[#ECFDF5]/60 text-[#047857] hover:bg-[#ECFDF5] dark:border-[#10B981]/30 dark:bg-[#10B981]/10 dark:text-[#A7F3D0]",
            iconClass: "text-[#059669] dark:text-[#6EE7B7]",
        },
        {
            label: "Budget",
            icon: IndianRupee,
            activeClass: "bg-[#FFF7ED] border-[#F97316] text-[#9A3412] shadow-sm shadow-[#F97316]/10 dark:bg-[#F97316]/15 dark:border-[#FB923C] dark:text-[#FED7AA]",
            inactiveClass: "border-[#FED7AA] bg-[#FFF7ED]/65 text-[#C2410C] hover:bg-[#FFF7ED] dark:border-[#F97316]/30 dark:bg-[#F97316]/10 dark:text-[#FED7AA]",
            iconClass: "text-[#EA580C] dark:text-[#FDBA74]",
        },
        {
            label: "Clearance",
            icon: Shield,
            activeClass: "bg-[#FDF2F8] border-[#DB2777] text-[#9D174D] shadow-sm shadow-[#DB2777]/10 dark:bg-[#DB2777]/15 dark:border-[#F472B6] dark:text-[#FBCFE8]",
            inactiveClass: "border-[#FBCFE8] bg-[#FDF2F8]/65 text-[#BE185D] hover:bg-[#FDF2F8] dark:border-[#DB2777]/30 dark:bg-[#DB2777]/10 dark:text-[#FBCFE8]",
            iconClass: "text-[#DB2777] dark:text-[#F9A8D4]",
        },
    ];
    const renderNextPrevButtons = (
        showPrev: boolean,
        showNext: boolean,
        isLast = false,
    ) => (
        <div className="mt-8 flex justify-between items-center bg-white dark:bg-[#27272A] p-4 border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-xl shadow-sm">
            {/* Previous Button */}
            <FrappeButton
                variant="secondary"
                onClick={() => setActiveTab(activeTab - 1)}
                className={cn("", !showPrev && "invisible")}
            >
                Previous
            </FrappeButton>

            {/* If Last Tab → Show Only "Save as Draft" */}
            {isLast ? (
                <div className="flex flex-col sm:flex-row gap-4">
                    {isEditMode && (
                        <FrappeButton
                            variant="secondary"
                            onClick={handleSaveDraft}
                            disabled={isSubmitting || isSavingDraft}
                        >
                            {isSavingDraft ? "SAVING..." : "Save As Draft"}
                        </FrappeButton>
                    )}
                    {isEditMode && isApprovedEndorsement && (
                        <FrappeButton
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting || isSavingDraft}
                        >
                            {isSubmitting
                                ? "REGISTERING..."
                                : "Register Project"}
                        </FrappeButton>
                    )}
                </div>
            ) : (
                /* Otherwise Show "Next Section" */
                <FrappeButton
                    variant="primary"
                    onClick={() => setActiveTab(activeTab + 1)}
                    className={cn("", !showNext && "invisible")}
                >
                    Next Section
                </FrappeButton>
            )}
        </div>
    );

    const tabFieldGroups = {
        fundingDetails: [
            "funding_agen",
            "funding_agency_other",
            "funding_agency_schemes",
            "funding_agency_type",
            "funding_agency_type_other",
            "nature_funding_agency_non_govt",
            "select_funding_agency",
            "origin_of_funding_agency",
            "funding_agency_ministry",
            "fund_agen_initials",
        ],
        agencyAddress: [
            "address_street_village_locality",
            "address_state",
            "address_postal_code",
            "address_country",
        ],
        piDetails: [
            "pi_employee_id",
            "principal_investigator_name",
            "designation",
            "applicant_department",
            "pi_userid",
        ],
        collaboratorToggles: ["is_additional_pi", "has_co_pi"],
        budgetToggles: ["equipment_checkbox", "manpower_checkbox"],
        sanction: [
            "total_sanctioned_amount",
            "sanctioned_letter_no",
            "sanctioned_letter_date",
        ],
        funds: [
            "is_gst_invoice_issued",
            "invoice_details",
            "amount_received",
            "iitg_bank_account_number",
        ],
    };

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B]">
            {/* Mandatory fields validation modal */}
            {validationErrors.length > 0 && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-[#27272A] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Modal top accent */}
                        <div className="h-[3px] bg-gradient-to-r from-red-500 to-red-400" />
                        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-[#F4F4F5] dark:border-[#3F3F46]">
                            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 flex items-center justify-center">
                                <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[13px] font-bold text-[#18181B] dark:text-[#E4E4E7]">
                                    Required Fields Missing
                                </h3>
                                <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                                    Please fill in all mandatory fields before proceeding.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setValidationErrors([])}
                                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] transition-colors"
                            >
                                <X className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA]" />
                            </button>
                        </div>
                        <ul className="px-6 py-4 space-y-2 max-h-60 overflow-y-auto">
                            {validationErrors.map((err, i) => (
                                <li
                                    key={i}
                                    className="flex items-center gap-2 text-[13px] font-medium text-[#3F3F46] dark:text-[#D4D4D8]"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                    {err}
                                </li>
                            ))}
                        </ul>
                        <div className="px-6 pb-6">
                            <button
                                onClick={() => setValidationErrors([])}
                                className="btn-primary-accent w-full justify-center py-2.5 text-[12px]"
                            >
                                OK, I'll fix these
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <main className="w-full overflow-hidden bg-[#FAFAF9] dark:bg-[#18181B]">
                {/* Page header */}
                <header className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="font-sans text-[21px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7]">
                            {docname ? "Project Registration" : "New Project Registration"}
                        </h1>
                        <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-1 font-medium">
                            {isEditMode
                                ? "Fill all sections to register a new project."
                                : "Viewing saved draft — click Edit to make changes."}
                        </p>
                    </div>
                    {docname && !isEditMode && (
                        <button
                            type="button"
                            onClick={() => setIsEditMode(true)}
                            className="flex-shrink-0 btn-primary-accent"
                        >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                    )}
                </header>

                {/* Tab navigation card */}
                <div className="bg-white dark:bg-[#27272A] border border-[#D4D4D8] dark:border-[#52525B] rounded-xl shadow-sm overflow-hidden">
                    <div className="border-b border-[#D4D4D8] dark:border-[#52525B] bg-[#FAFAF9] dark:bg-[#27272A]">
                        <nav className="flex items-center gap-1 p-2 overflow-x-auto">
                            {tabs.map((tab, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setActiveTab(index)}
                                    className={cn(
                                        "flex-shrink-0 flex h-8 items-center gap-1.5 px-2.5 font-bold text-[11px] uppercase tracking-wide rounded-lg border transition-all",
                                        activeTab === index ? tab.activeClass : tab.inactiveClass,
                                    )}
                                >
                                    <tab.icon className={cn("h-3.5 w-3.5", tab.iconClass)} /> {tab.label}
                                </button>
                            ))}
                            {/* Endorsement Button */}
                            {!isApprovedEndorsement && formData.project_type !== "Consultancy" && (
                                <div className="ml-auto flex flex-col items-end gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowEndorsementModal(true)}
                                        disabled={!isEndorsementEnabled}
                                        className={cn(
                                            "flex-shrink-0 flex h-8 items-center gap-1.5 px-2.5 font-semibold text-[11px] rounded-lg border transition-all",
                                            isEndorsementEnabled
                                                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer"
                                                : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 cursor-not-allowed",
                                        )}
                                        title={
                                            isEndorsementEnabled
                                                ? "Generate Endorsement Certificate"
                                                : "Fill all required Project Details and PI Details to enable"
                                        }
                                    >
                                        <FileBadge className="h-4 w-4" />
                                        Endorsement
                                    </button>
                                    {!isEndorsementEnabled && missingEndorsementFields.length > 0 && (
                                        <span className="text-[10px] text-red-500 dark:text-red-400 max-w-[220px] text-right leading-tight">
                                            Required: {missingEndorsementFields.join(", ")}
                                        </span>
                                    )}
                                </div>
                            )}
                        </nav>
                    </div>

                    <div className="bg-zinc-100 dark:bg-zinc-800 p-4 md:p-5">
                        {/* Form loading skeleton — shown until fields arrive */}
                        {(loading || fields.length === 0) && (
                            <div className="space-y-4">
                                {[1, 2, 3].map((card) => (
                                    <div
                                        key={card}
                                        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4"
                                    >
                                        <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[1, 2, 3, 4].map((f) => (
                                                <div key={f} className="space-y-1.5">
                                                    <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                                                    <div className="h-9 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-center justify-center gap-2 py-3">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#D97757] border-t-transparent" />
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Fetching form fields…</span>
                                </div>
                            </div>
                        )}
                        <form
                            id="project-registration-form"
                            onSubmit={handleSubmit}
                            className={loading || fields.length === 0 ? "hidden" : ""}
                        >
                            {fields.length > 0 && (
                                <>
                                    <div
                                        className={
                                            activeTab === 0 ? "block" : "hidden"
                                        }
                                    >
                                        <FrappeCard className="overflow-hidden p-5 space-y-5">
                                            <h2 className="-mx-5 -mt-5 mb-2 px-5 py-3 bg-[#EEF2FF]/80 dark:bg-[#1E3A8A]/10 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 font-sans text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#1E3A8A] dark:text-[#93C5FD] flex items-center gap-3">
                                                <span className="inline-block w-1 h-5 bg-[#4A6CF7] rounded-full flex-shrink-0" />
                                                1. Project Description
                                            </h2>
                                            {renderField("project_no")}
                                            {renderField("project_title")}
                                            {renderField("project_type")}
                                            {formData.project_type ===
                                                "Research" && (
                                                    <div className="space-y-8">
                                                        {renderField("involves_international_travel")}
                                                        <FrappeCard className="overflow-hidden p-5 space-y-5 !shadow-sm border-zinc-300 dark:border-zinc-700">
                                                            <div className="flex items-center justify-between flex-wrap gap-4">
                                                                <h3 className="-mx-5 -mt-5 px-5 py-3 mb-0 bg-[#EEF2FF]/80 dark:bg-[#1E3A8A]/10 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/20 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#1E3A8A] dark:text-[#93C5FD]">Funding Details</h3>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setShowFundingAgencySheet(true);
                                                                    }}
                                                                    className="text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md shadow-sm transition-colors uppercase tracking-wider"
                                                                >
                                                                    Add Funding Agency
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                {renderFields(
                                                                    tabFieldGroups.fundingDetails,
                                                                )}
                                                            </div>
                                                        </FrappeCard>
                                                        <FrappeCard className="overflow-hidden p-5 space-y-5 !shadow-sm border-zinc-300 dark:border-zinc-700">
                                                            <h3 className="-mx-5 -mt-5 mb-2 px-5 py-3 bg-[#EEF2FF]/80 dark:bg-[#1E3A8A]/10 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/20 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#1E3A8A] dark:text-[#93C5FD]">
                                                                Agency Address
                                                            </h3>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                {renderFields(
                                                                    tabFieldGroups.agencyAddress,
                                                                )}
                                                            </div>
                                                        </FrappeCard>
                                                    </div>
                                                )}
                                            {formData.project_type ===
                                                "Consultancy" && (
                                                    <div className="space-y-8">
                                                        <div className="space-y-4">
                                                            {renderField(
                                                                "consultancy_category",
                                                            )}
                                                            {renderField(
                                                                "consultancy_gstin",
                                                            )}
                                                            {renderField(
                                                                "consultancy_gst_rate",
                                                            )}

                                                            {/* Category D Fields */}
                                                            {formData.consultancy_category?.startsWith(
                                                                "Category D",
                                                            ) && (
                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-xl bg-[#FAFAF9] dark:bg-[#27272A]/60 min-w-0 overflow-hidden">
                                                                        <div className="space-y-4 min-w-0">
                                                                            <h4 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-[#1E3A8A] dark:text-[#93C5FD]">
                                                                                Category D Details
                                                                            </h4>
                                                                            {renderField("category_d_note")}
                                                                            {renderField("cat_d_grand_total_input")}
                                                                            {renderField("cat_d_project_cost_excl_gst")}
                                                                            <div className="space-y-1">
                                                                                {renderField("cat_d_consultancy_fee_input")}
                                                                                {(() => {
                                                                                    const gt = parseFloat(formData.cat_d_grand_total_input) || 0;
                                                                                    const gstRate = parseFloat(formData.consultancy_gst_rate) || 18;
                                                                                    const pjCost = Math.round(gt / (1 + gstRate / 100));
                                                                                    if (pjCost > 0) {
                                                                                        const maxCf = Math.floor(pjCost * 0.2999 * 100) / 100;
                                                                                        return (
                                                                                            <p className="text-xs text-red-500 font-medium px-1">
                                                                                                * Max allowed limit: ₹{maxCf.toLocaleString('en-IN', {
                                                                                                    minimumFractionDigits: 2,
                                                                                                    maximumFractionDigits: 2
                                                                                                })} (must be less than 30% of the Total Project Cost)
                                                                                            </p>
                                                                                        );
                                                                                    }
                                                                                    return null;
                                                                                })()}
                                                                            </div>
                                                                            {renderField("operational_expense_input_inc_10_oh")}
                                                                            {renderField("cat_d_cf_base")}
                                                                            {renderField("cat_d_oe_base")}
                                                                            {renderField("cat_d_total_overhead")}
                                                                            {renderField("cat_d_institute_share")}
                                                                            {renderField("cat_d_gst_amt")}
                                                                            {renderField("cat_d_grand_total_calc")}
                                                                        </div>
                                                                        <div className="space-y-4 min-w-0 overflow-hidden">
                                                                            <h4 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-[#1E3A8A] dark:text-[#93C5FD]">
                                                                                Calculation Breakdown
                                                                            </h4>
                                                                            {(() => {
                                                                                const gt = parseFloat(formData.cat_d_grand_total_input) || 0;
                                                                                const cf = parseFloat(formData.cat_d_consultancy_fee_input) || 0;
                                                                                const gstRate = parseFloat(formData.consultancy_gst_rate) || 18;

                                                                                const projectCostExclGst = Math.round(gt / (1 + gstRate / 100));
                                                                                const oe = Math.max(0, Math.round(projectCostExclGst - cf));
                                                                                const instShare = Math.round(cf * 0.2);
                                                                                const ohCf = Math.round(cf * 0.1);
                                                                                const ohOe = Math.round(oe * 0.1);
                                                                                const totalOh = ohCf + ohOe;
                                                                                const netCf = Math.round(Math.max(0, cf - instShare - ohCf) * 100) / 100;
                                                                                const netOe = Math.max(0, oe - ohOe);
                                                                                const gstAmt = Math.max(0, Math.round(gt - projectCostExclGst));

                                                                                return (
                                                                                    <div className="w-full max-w-full min-w-0 overflow-hidden rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                                                                                        <table className="w-full table-fixed divide-y divide-[#E4E4E7] dark:divide-[#3F3F46] text-sm">
                                                                                            <colgroup>
                                                                                                <col className="w-[31%]" />
                                                                                                <col className="w-[46%]" />
                                                                                                <col className="w-[23%]" />
                                                                                            </colgroup>
                                                                                            <thead className="bg-[#EEF2FF] dark:bg-blue-950/20">
                                                                                                <tr>
                                                                                                    <th scope="col" className="px-2 py-2 text-left text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200 border-r border-[#C7D2FE] dark:border-blue-900/40 last:border-r-0">Step</th>
                                                                                                    <th scope="col" className="px-2 py-2 text-left text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200 border-r border-[#C7D2FE] dark:border-blue-900/40 last:border-r-0">Formula</th>
                                                                                                    <th scope="col" className="px-2 py-2 text-right text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200">Result</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46] bg-white dark:bg-[#27272A]">
                                                                                                <tr>
                                                                                                    <td className="px-2 py-2 align-top break-words text-[12px] font-bold text-zinc-900 dark:text-zinc-100">Project Cost Excl GST</td>
                                                                                                    <td className="px-2 py-2 align-top break-all text-[11px] text-zinc-500 dark:text-zinc-400">round({gt.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / (1 + {gstRate}/100))</td>
                                                                                                    <td className="px-2 py-2 align-top text-right break-all text-zinc-900 dark:text-zinc-100 [overflow-wrap:anywhere]">{projectCostExclGst.toLocaleString('en-IN')} ✓</td>
                                                                                                </tr>
                                                                                                <tr>
                                                                                                    <td className="px-2 py-2 align-top break-words text-[12px] font-bold text-zinc-900 dark:text-zinc-100">Operational Expense</td>
                                                                                                    <td className="px-2 py-2 align-top break-all text-[11px] text-zinc-500 dark:text-zinc-400">round({projectCostExclGst.toLocaleString('en-IN')} - {cf.toLocaleString('en-IN', { maximumFractionDigits: 2 })})</td>
                                                                                                    <td className="px-2 py-2 align-top text-right break-all text-zinc-900 dark:text-zinc-100 [overflow-wrap:anywhere]">{oe.toLocaleString('en-IN')} ✓</td>
                                                                                                </tr>
                                                                                                <tr>
                                                                                                    <td className="px-2 py-2 align-top break-words text-[12px] font-bold text-zinc-900 dark:text-zinc-100">Institute Share</td>
                                                                                                    <td className="px-2 py-2 align-top break-all text-[11px] text-zinc-500 dark:text-zinc-400">round({cf.toLocaleString('en-IN', { maximumFractionDigits: 2 })} × 0.20)</td>
                                                                                                    <td className="px-2 py-2 align-top text-right break-all text-zinc-900 dark:text-zinc-100 [overflow-wrap:anywhere]">{instShare.toLocaleString('en-IN')} ✓</td>
                                                                                                </tr>
                                                                                                <tr>
                                                                                                    <td className="px-2 py-2 align-top break-words text-[12px] font-bold text-zinc-900 dark:text-zinc-100">Overhead on Consultancy Fee</td>
                                                                                                    <td className="px-2 py-2 align-top break-all text-[11px] text-zinc-500 dark:text-zinc-400">round({cf.toLocaleString('en-IN', { maximumFractionDigits: 2 })} × 0.10)</td>
                                                                                                    <td className="px-2 py-2 align-top text-right break-all text-zinc-900 dark:text-zinc-100 [overflow-wrap:anywhere]">{ohCf.toLocaleString('en-IN')} ✓</td>
                                                                                                </tr>
                                                                                                <tr>
                                                                                                    <td className="px-2 py-2 align-top break-words text-[12px] font-bold text-zinc-900 dark:text-zinc-100">Overhead on Operational Expense</td>
                                                                                                    <td className="px-2 py-2 align-top break-all text-[11px] text-zinc-500 dark:text-zinc-400">round({oe.toLocaleString('en-IN')} × 0.10)</td>
                                                                                                    <td className="px-2 py-2 align-top text-right break-all text-zinc-900 dark:text-zinc-100 [overflow-wrap:anywhere]">{ohOe.toLocaleString('en-IN')} ✓</td>
                                                                                                </tr>
                                                                                                <tr className="bg-zinc-50/50 dark:bg-zinc-800/50">
                                                                                                    <td className="px-2 py-2 align-top break-words text-[12px] font-extrabold text-zinc-900 dark:text-zinc-100">Total Overhead</td>
                                                                                                    <td className="px-2 py-2 align-top break-all text-[11px] text-zinc-500 dark:text-zinc-400">{ohCf.toLocaleString('en-IN')} + {ohOe.toLocaleString('en-IN')}</td>
                                                                                                    <td className="px-2 py-2 align-top text-right break-all font-semibold text-zinc-900 dark:text-zinc-100 [overflow-wrap:anywhere]">{totalOh.toLocaleString('en-IN')} ✓</td>
                                                                                                </tr>
                                                                                                <tr>
                                                                                                    <td className="px-2 py-2 align-top break-words text-[12px] font-bold text-zinc-900 dark:text-zinc-100">Net Consultancy Fee</td>
                                                                                                    <td className="px-2 py-2 align-top break-all text-[11px] text-zinc-500 dark:text-zinc-400">r2({cf.toLocaleString('en-IN', { maximumFractionDigits: 2 })} - {instShare.toLocaleString('en-IN')} - {ohCf.toLocaleString('en-IN')})</td>
                                                                                                    <td className="px-2 py-2 align-top text-right break-all text-zinc-900 dark:text-zinc-100 [overflow-wrap:anywhere]">{netCf.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ✓</td>
                                                                                                </tr>
                                                                                                <tr>
                                                                                                    <td className="px-2 py-2 align-top break-words text-[12px] font-bold text-zinc-900 dark:text-zinc-100">Net Operational Expense</td>
                                                                                                    <td className="px-2 py-2 align-top break-all text-[11px] text-zinc-500 dark:text-zinc-400">{oe.toLocaleString('en-IN')} - {ohOe.toLocaleString('en-IN')}</td>
                                                                                                    <td className="px-2 py-2 align-top text-right break-all text-zinc-900 dark:text-zinc-100 [overflow-wrap:anywhere]">{netOe.toLocaleString('en-IN')} ✓</td>
                                                                                                </tr>
                                                                                                <tr className="bg-zinc-50/50 dark:bg-zinc-800/50">
                                                                                                    <td className="px-2 py-2 align-top break-words text-[12px] font-extrabold text-zinc-900 dark:text-zinc-100">GST Amount</td>
                                                                                                    <td className="px-2 py-2 align-top break-all text-[11px] text-zinc-500 dark:text-zinc-400">round({gt.toLocaleString('en-IN', { maximumFractionDigits: 2 })} - {projectCostExclGst.toLocaleString('en-IN')}) (@ {gstRate}%)</td>
                                                                                                    <td className="px-2 py-2 align-top text-right break-all font-semibold text-zinc-900 dark:text-zinc-100 [overflow-wrap:anywhere]">{gstAmt.toLocaleString('en-IN')} ✓</td>
                                                                                                </tr>
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                            {/* Category T & E Fields */}
                                                            {!formData.consultancy_category?.startsWith(
                                                                "Category D",
                                                            ) &&
                                                                formData.consultancy_category && (
                                                                    <div className="space-y-4 p-4 border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-xl bg-[#FAFAF9] dark:bg-[#27272A]/60">
                                                                        <h4 className="font-bold text-base text-zinc-700 dark:text-zinc-300">
                                                                            {formData.consultancy_category?.includes(
                                                                                "Routine",
                                                                            ) &&
                                                                                !formData.consultancy_category?.includes(
                                                                                    "Non-Routine",
                                                                                )
                                                                                ? "Category T Details"
                                                                                : "Category E Details"}
                                                                        </h4>
                                                                        {renderField(
                                                                            "category_e_note",
                                                                        )}
                                                                        {renderField(
                                                                            "category_t_note",
                                                                        )}
                                                                        {renderField(
                                                                            "cat_ef_total_amount",
                                                                        )}
                                                                        {renderField(
                                                                            "cat_ef_honorarium",
                                                                            formData.consultancy_category?.includes("Non-Routine")
                                                                                ? "Honorarium and other expenses (0.7 * TE)"
                                                                                : "Honorarium and other expenses (0.3 * TE)",
                                                                        )}
                                                                        {renderField(
                                                                            "cat_ef_institute_share",
                                                                            formData.consultancy_category?.includes("Non-Routine")
                                                                                ? "Institute Overhead/Share (0.3 * TE)"
                                                                                : "Institute Overhead/Share (0.7 * TE)",
                                                                        )}
                                                                        {renderField(
                                                                            "cat_ef_gst",
                                                                        )}
                                                                        {renderField(
                                                                            "cat_ef_grand_total",
                                                                        )}
                                                                    </div>
                                                                )}
                                                        </div>
                                                        <FrappeCard className="overflow-hidden p-5 space-y-5 !shadow-sm border-zinc-300 dark:border-zinc-700">
                                                            <div className="flex items-center justify-between flex-wrap gap-4">
                                                                <h3 className="-mx-5 -mt-5 px-5 py-3 mb-0 bg-[#EEF2FF]/80 dark:bg-[#1E3A8A]/10 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/20 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#1E3A8A] dark:text-[#93C5FD]">Funding Details</h3>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setShowFundingAgencySheet(true);
                                                                    }}
                                                                    className="text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md shadow-sm transition-colors uppercase tracking-wider"
                                                                >
                                                                    Add Funding Agency
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                {renderFields(
                                                                    tabFieldGroups.fundingDetails,
                                                                )}
                                                            </div>
                                                        </FrappeCard>
                                                        <FrappeCard className="overflow-hidden p-5 space-y-5 !shadow-sm border-zinc-300 dark:border-zinc-700">
                                                            <h3 className="-mx-5 -mt-5 mb-2 px-5 py-3 bg-[#EEF2FF]/80 dark:bg-[#1E3A8A]/10 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/20 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#1E3A8A] dark:text-[#93C5FD]">
                                                                Agency Address
                                                            </h3>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                {renderFields(
                                                                    tabFieldGroups.agencyAddress,
                                                                )}
                                                            </div>
                                                        </FrappeCard>
                                                    </div>
                                                )}
                                            {formData.project_type ===
                                                "Other" &&
                                                renderField(
                                                    "other_project_type_name",
                                                )}
                                            {renderField(
                                                "implementation_department",
                                            )}
                                            {renderField("project_objective")}
                                            {renderField(
                                                "project_deliverables",
                                            )}
                                            {formData.project_type === "Consultancy"
                                                ? renderField("executive_summary", "Executive Summary (If Applicable)")
                                                : renderField("executive_summary")}
                                            {renderField("upload_proj_prop")}
                                            <div className="space-y-3">
                                                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                                    Upload Supporting Docs ( Project Proposal / Invitation Letter)
                                                </h3>
                                                <MemoizedGenericTable
                                                    tableName="upload_supporting_docs"
                                                    columns={[
                                                        {
                                                            key: "file_description",
                                                            label: "Document Description",
                                                            type: "text",
                                                        },
                                                        {
                                                            key: "project_file",
                                                            label: "Upload File",
                                                            type: "file",
                                                        },
                                                    ]}
                                                    newRow={{
                                                        file_description: "",
                                                        project_file: null,
                                                    }}
                                                    tableData={formData.upload_supporting_docs}
                                                    onRowChange={
                                                        isEditMode
                                                            ? handleTableRowChange
                                                            : () => { }
                                                    }
                                                    onFileChange={
                                                        isEditMode
                                                            ? handleTableFileChange
                                                            : () => { }
                                                    }
                                                    onAddRow={
                                                        isEditMode
                                                            ? addTableRow
                                                            : () => { }
                                                    }
                                                    onDeleteRow={
                                                        isEditMode
                                                            ? deleteTableRow
                                                            : () => { }
                                                    }
                                                />
                                            </div>
                                            {renderField("my_projects")}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {formData.project_type === "Consultancy" ? (
                                                    <>
                                                        {renderField("project_duration_months")}
                                                        {renderField("project_duration_days")}
                                                    </>
                                                ) : formData.project_type === "Testing" ? (
                                                    renderField("project_duration_days")
                                                ) : (
                                                    renderField("project_duration_months")
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {renderField("prj_start_date")}
                                                {renderField("prj_end_date")}
                                            </div>
                                            {isStaffRnD && (
                                                <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                                                    <h3 className="text-base font-bold uppercase text-zinc-900 dark:text-zinc-100">
                                                        Account Details
                                                    </h3>
                                                    {renderField(
                                                        "is_the_account_type_pfms",
                                                    )}
                                                    {formData.is_the_account_type_pfms ===
                                                        "Yes" && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                {renderField(
                                                                    "scheme_name",
                                                                )}
                                                                {renderField(
                                                                    "enter_scheme_number",
                                                                )}
                                                            </div>
                                                        )}
                                                    {formData.is_the_account_type_pfms ===
                                                        "No" && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                {renderField(
                                                                    "account_number",
                                                                )}
                                                                {renderField(
                                                                    "bank_name",
                                                                )}
                                                            </div>
                                                        )}
                                                    {docname && (
                                                        <div className="flex justify-end pt-2">
                                                            <FrappeButton
                                                                variant="primary"
                                                                disabled={
                                                                    isSavingPfms
                                                                }
                                                                onClick={async () => {
                                                                    if (
                                                                        !docname
                                                                    )
                                                                        return;
                                                                    setIsSavingPfms(
                                                                        true,
                                                                    );
                                                                    try {
                                                                        await updatePfmsFields(
                                                                            {
                                                                                docname:
                                                                                    docname,
                                                                                is_the_account_type_pfms:
                                                                                    formData.is_the_account_type_pfms ||
                                                                                    "",
                                                                                scheme_name:
                                                                                    formData.scheme_name ||
                                                                                    "",
                                                                                enter_scheme_number:
                                                                                    formData.enter_scheme_number ||
                                                                                    "",
                                                                                account_number:
                                                                                    formData.account_number ||
                                                                                    "",
                                                                                bank_name:
                                                                                    formData.bank_name ||
                                                                                    "",
                                                                            },
                                                                        );
                                                                        alert(
                                                                            "Account details saved successfully.",
                                                                        );
                                                                    } catch (e: any) {
                                                                        alert(
                                                                            "Failed to save account details: " +
                                                                            (e?.message ||
                                                                                "Unknown error"),
                                                                        );
                                                                    } finally {
                                                                        setIsSavingPfms(
                                                                            false,
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                {isSavingPfms
                                                                    ? "Saving..."
                                                                    : "Save Account Details"}
                                                            </FrappeButton>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </FrappeCard>
                                        {renderNextPrevButtons(false, true)}
                                    </div>

                                    <div
                                        className={
                                            activeTab === 1 ? "block" : "hidden"
                                        }
                                    >
                                        <FrappeCard className="overflow-hidden p-5 space-y-5">
                                            <h2 className="-mx-5 -mt-5 mb-2 px-5 py-3 bg-[#EEF2FF]/80 dark:bg-[#1E3A8A]/10 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 font-sans text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#1E3A8A] dark:text-[#93C5FD] flex items-center gap-3">
                                                <span className="inline-block w-1 h-5 bg-[#4A6CF7] rounded-full flex-shrink-0" />
                                                2. Investigators & Collaborators
                                            </h2>
                                            <div className="overflow-hidden border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm bg-white dark:bg-zinc-900">
                                                <div className="px-5 py-3 bg-[#EEF2FF]/80 dark:bg-[#1E3A8A]/10 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/20 flex items-center gap-3">
                                                    <h3 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#1E3A8A] dark:text-[#93C5FD]">
                                                        Principal Investigator (PI)
                                                    </h3>
                                                    {isFetchingPiDetails && (
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium animate-pulse">
                                                            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                                                            Fetching PI details…
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="p-5 space-y-8">
                                                    {renderField("pi_webmail")}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-dashed border-zinc-400 dark:border-zinc-600">
                                                        {renderField(
                                                            "principal_investigator_name",
                                                        )}
                                                        {renderField(
                                                            "pi_employee_id",
                                                        )}
                                                        {renderField(
                                                            "designation",
                                                        )}
                                                        {renderField(
                                                            "applicant_department",
                                                        )}
                                                        {renderField(
                                                            "pi_userid",
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-8">
                                                <div className="space-y-4">
                                                    {renderField("is_additional_pi")}
                                                    {formData.is_additional_pi ===
                                                        "Yes" && (
                                                            <>
                                                                <div className="flex items-start justify-between gap-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                                                                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                                                        <span className="font-semibold">Note:</span> In-house IIT Guwahati PIs are not required to register. If an <span className="font-semibold">external or other PI</span> is not found in the list, they must first be registered as a stakeholder.
                                                                    </p>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => window.open("http://172.16.135.118:8081/universal-registration", "_blank")}
                                                                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                                                        Register New User
                                                                    </button>
                                                                </div>
                                                                <MemoizedCollaboratorTable
                                                                    tableName="additional_pi_table"
                                                                    title="Details of Additional PI(s)"
                                                                    tableData={
                                                                        formData.additional_pi_table
                                                                    }
                                                                    piOptions={
                                                                        linkOptions[
                                                                        "pi_webmail"
                                                                        ]
                                                                    }
                                                                    onCollaboratorChange={
                                                                        isEditMode
                                                                            ? handleCollaboratorChange
                                                                            : () => { }
                                                                    }
                                                                    onRowChange={
                                                                        isEditMode
                                                                            ? handleTableRowChange
                                                                            : () => { }
                                                                    }
                                                                    onAddRow={
                                                                        isEditMode
                                                                            ? addTableRow
                                                                            : () => { }
                                                                    }
                                                                    onDeleteRow={
                                                                        isEditMode
                                                                            ? deleteTableRow
                                                                            : () => { }
                                                                    }
                                                                />
                                                            </>
                                                        )}
                                                </div>
                                                <div className="space-y-4">
                                                    {renderField("has_co_pi")}
                                                    {formData.has_co_pi === "Yes" && (
                                                        <>
                                                            <div className="flex items-start justify-between gap-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                                                                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                                                    <span className="font-semibold">Note:</span> In-house IIT Guwahati Co-PIs are not required to register. If an <span className="font-semibold">external or other Co-PI</span> is not found in the list, they must first be registered as a stakeholder.
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => window.open("http://172.16.135.118:8081/universal-registration", "_blank")}
                                                                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                                                    Register New User
                                                                </button>
                                                            </div>
                                                            <MemoizedCollaboratorTable
                                                                tableName="co_investigator_table"
                                                                title="Details of Co-PI(s)"
                                                                tableData={
                                                                    formData.co_investigator_table
                                                                }
                                                                piOptions={
                                                                    linkOptions[
                                                                    "pi_webmail"
                                                                    ]
                                                                }
                                                                onCollaboratorChange={
                                                                    isEditMode
                                                                        ? handleCollaboratorChange
                                                                        : () => { }
                                                                }
                                                                onRowChange={
                                                                    isEditMode
                                                                        ? handleTableRowChange
                                                                        : () => { }
                                                                }
                                                                onAddRow={
                                                                    isEditMode
                                                                        ? addTableRow
                                                                        : () => { }
                                                                }
                                                                onDeleteRow={
                                                                    isEditMode
                                                                        ? deleteTableRow
                                                                        : () => { }
                                                                }
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </FrappeCard>
                                        {renderNextPrevButtons(true, true)}
                                    </div>

                                    <div
                                        className={
                                            activeTab === 2 ? "block" : "hidden"
                                        }
                                    >
                                        <FrappeCard className="overflow-hidden p-5 space-y-5">
                                            <h2 className="-mx-5 -mt-5 mb-2 px-5 py-3 bg-[#EEF2FF]/80 dark:bg-[#1E3A8A]/10 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 font-sans text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#1E3A8A] dark:text-[#93C5FD] flex items-center gap-3">
                                                <span className="inline-block w-1 h-5 bg-[#4A6CF7] rounded-full flex-shrink-0" />
                                                3. Proposed Budget
                                            </h2>
                                            {formData.project_type?.toLowerCase() === "consultancy" && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-medium">
                            <span>⚠️</span>
                            <span>Consultancy projects use a single read-only budget column calculated from consultancy inputs. Duration months/days do not split this budget into years.</span>
                        </div>
                                            )}
                                            <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                                                {isConsultancyProject
                                                    ? "Provide the single proposed budget breakup for this consultancy project."
                                                    : "Provide a detailed year-wise breakup of the proposed budget."}
                                            </p>
                                            <MemoizedBudgetTable
                                                tableData={budgetTableData}
                                                budgetYears={budgetYears}
                                                budgetHeadOptions={
                                                    budgetHeadOptions
                                                }
                                                onRowChange={
                                                    isEditMode
                                                        ? handleBudgetRowChange
                                                        : () => { }
                                                }
                                                onAddRow={
                                                    isEditMode
                                                        ? addBudgetRow
                                                        : () => { }
                                                }
                                                onDeleteRow={
                                                    isEditMode
                                                        ? deleteTableRow
                                                        : () => { }
                                                }
                                                onAddYear={
                                                    isEditMode
                                                        ? addBudgetYear
                                                        : () => { }
                                                }
                                                onDeleteYear={
                                                    isEditMode
                                                        ? deleteLastBudgetYear
                                                        : () => { }
                                                }
                                                getYearTotal={getYearTotal}
                                                totalBudgetAmount={
                                                    totalBudgetAmount
                                                }
                                                allowYearActions={!isConsultancyProject}
                                                readOnly={isConsultancyProject}
                                            />
                                            <div className="space-y-6 border-t border-zinc-300 dark:border-zinc-700 pt-8">
                                                <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                                                    Enter the details of Equipment and Manpower (Optional)
                                                </p>
                                                {renderField(
                                                    "equipment_checkbox",
                                                )}
                                                {(formData.equipment_checkbox ===
                                                    true ||
                                                    formData.equipment_checkbox ===
                                                    1 ||
                                                    formData.equipment_checkbox ===
                                                    "1") && (
                                                        <MemoizedGenericTable
                                                            tableName={
                                                                "proposed_equipment_details"
                                                            }
                                                            columns={[
                                                                {
                                                                    key: "item_name",
                                                                    label: "Item Name*",
                                                                    type: "text",
                                                                },
                                                                {
                                                                    key: "item_description",
                                                                    label: "Description",
                                                                    type: "text",
                                                                },
                                                                {
                                                                    key: "item_quantity",
                                                                    label: "Quantity",
                                                                    type: "number",
                                                                },
                                                                {
                                                                    key: "equip_unit_cost",
                                                                    label: "Unit Cost (₹)",
                                                                    type: "number",
                                                                },
                                                                {
                                                                    key: "equip_total_unit_cost",
                                                                    label: "Total Cost (₹)",
                                                                    type: "number",
                                                                    readOnly: true,
                                                                },
                                                            ]}
                                                            newRow={{
                                                                item_name: "",
                                                                item_description:
                                                                    "",
                                                                item_quantity: "",
                                                                equip_unit_cost: "",
                                                                equip_total_unit_cost:
                                                                    "",
                                                            }}
                                                            tableData={
                                                                formData.proposed_equipment_details
                                                            }
                                                            onRowChange={
                                                                isEditMode
                                                                    ? handleEquipmentRowChange
                                                                    : () => { }
                                                            }
                                                            onFileChange={
                                                                isEditMode
                                                                    ? handleTableFileChange
                                                                    : () => { }
                                                            }
                                                            onAddRow={
                                                                isEditMode
                                                                    ? addTableRow
                                                                    : () => { }
                                                            }
                                                            onDeleteRow={
                                                                isEditMode
                                                                    ? deleteTableRow
                                                                    : () => { }
                                                            }
                                                        />
                                                    )}
                                                {renderField(
                                                    "manpower_checkbox",
                                                )}
                                                {(formData.manpower_checkbox ===
                                                    true ||
                                                    formData.manpower_checkbox ===
                                                    1 ||
                                                    formData.manpower_checkbox ===
                                                    "1") && (
                                                        <MemoizedGenericTable
                                                            tableName={
                                                                "proposed_manpower_details"
                                                            }
                                                            columns={[
                                                                {
                                                                    key: "designation_name",
                                                                    label: "Position*",
                                                                    type: "select",
                                                                    options:
                                                                        linkOptions[
                                                                        "designation_name"
                                                                        ] || [],
                                                                },
                                                                {
                                                                    key: "vacancies",
                                                                    label: "Number of Posts",
                                                                    type: "number",
                                                                },
                                                                {
                                                                    key: "manpower_salary",
                                                                    label: "Salary (₹)",
                                                                    type: "number",
                                                                },
                                                            ]}
                                                            newRow={{
                                                                designation_name:
                                                                    "",
                                                                vacancies: "",
                                                                manpower_salary: 0,
                                                            }}
                                                            tableData={
                                                                formData.proposed_manpower_details
                                                            }
                                                            onRowChange={
                                                                isEditMode
                                                                    ? handleTableRowChange
                                                                    : () => { }
                                                            }
                                                            onFileChange={
                                                                isEditMode
                                                                    ? handleTableFileChange
                                                                    : () => { }
                                                            }
                                                            onAddRow={
                                                                isEditMode
                                                                    ? addTableRow
                                                                    : () => { }
                                                            }
                                                            onDeleteRow={
                                                                isEditMode
                                                                    ? deleteTableRow
                                                                    : () => { }
                                                            }
                                                            // EDITED BY MKY | 2026-04-14 14:52 IST - START: Wire Quick Entry to manpower table
                                                            onOpenQuickEntry={
                                                                isEditMode
                                                                    ? handleOpenQuickEntry
                                                                    : undefined
                                                            }
                                                        // EDITED BY MKY | 2026-04-14 14:52 IST - END
                                                        />
                                                    )}
                                            </div>
                                        </FrappeCard>
                                        {renderNextPrevButtons(true, true)}
                                    </div>
                                    <div
                                        className={
                                            activeTab === 3 ? "block" : "hidden"
                                        }
                                    >
                                        <FrappeCard className="overflow-hidden p-5 space-y-5">
                                            <h2 className="-mx-5 -mt-5 mb-2 px-5 py-3 bg-[#EEF2FF]/80 dark:bg-[#1E3A8A]/10 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 font-sans text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#1E3A8A] dark:text-[#93C5FD] flex items-center gap-3">
                                                <span className="inline-block w-1 h-5 bg-[#4A6CF7] rounded-full flex-shrink-0" />
                                                4. Clearance & Declaration
                                            </h2>
                                            {renderField(
                                                "needs_committee_clearance",
                                            )}
                                            {formData.needs_committee_clearance ===
                                                "Yes" && (
                                                    <div className="space-y-8 pt-8 mt-8 border-t-2 border-dashed border-zinc-400 dark:border-zinc-600">
                                                        {renderField("committees")}
                                                        {formData.committees ===
                                                            "Other" &&
                                                            renderField(
                                                                "other_committee_specify",
                                                            )}
                                                        {formData.committees ===
                                                            "Ethics Committee" && (
                                                                <>
                                                                    {renderField(
                                                                        "ethics_committee_details",
                                                                    )}
                                                                    {renderField(
                                                                        "ethics_other_details",
                                                                    )}
                                                                </>
                                                            )}
                                                        {formData.committees ===
                                                            "Biosafety Committee" && (
                                                                <>
                                                                    {renderField(
                                                                        "biosafety_category",
                                                                    )}
                                                                    {renderField(
                                                                        "declaration_html",
                                                                    )}
                                                                </>
                                                            )}
                                                    </div>
                                                )}
                                        </FrappeCard>
                                        {renderNextPrevButtons(true, true)}
                                    </div>
                                    <div
                                        className={
                                            activeTab === 4 ? "block" : "hidden"
                                        }
                                    >
                                        <FrappeCard className="space-y-10">
                                            <div className="space-y-6">
                                                {renderField(
                                                    "have_sanction_details",
                                                )}

                                                {formData.have_sanction_details ===
                                                    "Yes" && (
                                                        <FrappeCard className="overflow-hidden p-6 space-y-6 !shadow-sm border-zinc-300 dark:border-zinc-700">
                                                            <h3 className="-mx-6 -mt-6 mb-2 px-6 py-4 bg-gradient-to-r from-[#EEF2FF] to-[#F5F3FF] dark:from-[#1E3A8A]/15 dark:to-[#4A6CF7]/10 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#1E3A8A] dark:text-[#93C5FD]">
                                                                Sanction Details
                                                            </h3>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                {renderFields(
                                                                    tabFieldGroups.sanction,
                                                                )}
                                                            </div>

                                                            <div className="space-y-4">
                                                                <MemoizedGenericTable
                                                                    tableName={
                                                                        "sanctioned_budget_breakup"
                                                                    }
                                                                    columns={[
                                                                        {
                                                                            key: "head",
                                                                            label: "Budget Head",
                                                                            type: "text",
                                                                        },
                                                                        {
                                                                            key: "amount",
                                                                            label: "Amount (₹)",
                                                                            type: "number",
                                                                        },
                                                                    ]}
                                                                    newRow={{
                                                                        head: "",
                                                                        amount: 0,
                                                                    }}
                                                                    tableData={
                                                                        formData.sanctioned_budget_breakup
                                                                    }
                                                                    onRowChange={
                                                                        handleTableRowChange
                                                                    }
                                                                    onFileChange={
                                                                        handleTableFileChange
                                                                    }
                                                                    onAddRow={
                                                                        addTableRow
                                                                    }
                                                                    onDeleteRow={
                                                                        deleteTableRow
                                                                    }
                                                                />
                                                            </div>

                                                            <div className="space-y-4">
                                                                <MemoizedGenericTable
                                                                    tableName={
                                                                        "sanction_related_files"
                                                                    }
                                                                    columns={[
                                                                        {
                                                                            key: "file",
                                                                            label: "File",
                                                                            type: "file",
                                                                        },
                                                                    ]}
                                                                    newRow={{
                                                                        file: null,
                                                                    }}
                                                                    tableData={
                                                                        formData.sanction_related_files
                                                                    }
                                                                    onRowChange={
                                                                        handleTableRowChange
                                                                    }
                                                                    onFileChange={
                                                                        handleTableFileChange
                                                                    }
                                                                    onAddRow={
                                                                        addTableRow
                                                                    }
                                                                    onDeleteRow={
                                                                        deleteTableRow
                                                                    }
                                                                />
                                                            </div>
                                                        </FrappeCard>
                                                    )}
                                            </div>

                                            <div className="space-y-6">
                                                {renderField(
                                                    "have_fund_details",
                                                )}

                                                {formData.have_fund_details ===
                                                    "Yes" && (
                                                        <FrappeCard className="overflow-hidden p-6 space-y-6 !shadow-sm border-zinc-300 dark:border-zinc-700">
                                                            <h3 className="-mx-6 -mt-6 mb-2 px-6 py-4 bg-gradient-to-r from-[#EEF2FF] to-[#F5F3FF] dark:from-[#1E3A8A]/15 dark:to-[#4A6CF7]/10 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 text-[14px] font-extrabold uppercase tracking-[0.08em] text-[#1E3A8A] dark:text-[#93C5FD]">
                                                                Fund Details
                                                            </h3>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                {renderFields(
                                                                    tabFieldGroups.funds,
                                                                )}
                                                            </div>

                                                            <div className="space-y-4">
                                                                <MemoizedGenericTable
                                                                    tableName={
                                                                        "fund_transactions"
                                                                    }
                                                                    columns={[
                                                                        {
                                                                            key: "installmentNo",
                                                                            label: "Installment No.",
                                                                            type: "text",
                                                                        },
                                                                        {
                                                                            key: "dateReceived",
                                                                            label: "Date Received",
                                                                            type: "date",
                                                                        },
                                                                        {
                                                                            key: "amount",
                                                                            label: "Amount (₹)",
                                                                            type: "number",
                                                                        },
                                                                    ]}
                                                                    newRow={{
                                                                        installmentNo:
                                                                            "",
                                                                        dateReceived:
                                                                            "",
                                                                        amount: 0,
                                                                    }}
                                                                    tableData={
                                                                        formData.fund_transactions
                                                                    }
                                                                    onRowChange={
                                                                        handleTableRowChange
                                                                    }
                                                                    onFileChange={
                                                                        handleTableFileChange
                                                                    }
                                                                    onAddRow={
                                                                        addTableRow
                                                                    }
                                                                    onDeleteRow={
                                                                        deleteTableRow
                                                                    }
                                                                />
                                                            </div>
                                                        </FrappeCard>
                                                    )}
                                            </div>

                                            {/* 🟢 Instruction after saving */}
                                            <div className="p-4 mt-6 border-l-4 border-green-600 bg-green-50 text-green-900 rounded-md shadow-sm font-bold">
                                                💡 <strong>Next Step:</strong>{" "}
                                                After saving this project draft,
                                                go to the{" "}
                                                <strong>Project View</strong>{" "}
                                                page, open your specific
                                                project, and then click{" "}
                                                <strong>Submit</strong> to
                                                proceed.
                                            </div>
                                        </FrappeCard>

                                        {renderNextPrevButtons(
                                            true,
                                            false,
                                            true,
                                        )}
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                </div>

                {/* Endorsement Required Modal */}
                {showSubmitInsteadModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl max-w-md w-full mx-4 border border-zinc-300 dark:border-zinc-700">
                            <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-3">
                                <span className="text-red-500 text-xl">⚠️</span>
                                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                    Endorsement Certificate Required
                                </h2>
                            </div>
                            <div className="px-6 py-5">
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                    The endorsement certificate <strong>must</strong> be filled in before you can submit the project. Please complete the endorsement certificate and try again.
                                </p>
                            </div>
                            <div className="px-6 py-4 border-t border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowSubmitInsteadModal(false)}
                                    className="btn-neutral"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowSubmitInsteadModal(false);
                                        endorsementCertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                                    }}
                                    className="btn-primary-accent"
                                >
                                    Go to Endorsement
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Endorsement Certificate Modal */}
                {showEndorsementModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-8">
                        <div className="relative bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl max-w-[240mm] w-full mx-4 border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] overflow-hidden">
                            {/* Modal Header */}
                            <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-transparent" />
                            <div className="bg-[#FAFAF9] dark:bg-[#27272A] border-b border-[#E4E4E7] dark:border-[#3F3F46] px-6 py-4 flex items-center justify-between">
                                <h2 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                    Endorsement Certificate
                                </h2>
                                <button
                                    onClick={() =>
                                        setShowEndorsementModal(false)
                                    }
                                    className="p-2 hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] rounded-lg transition-colors"
                                    title="Close"
                                >
                                    <X className="h-5 w-5 text-[#71717A] dark:text-[#A1A1AA]" />
                                </button>
                            </div>
                            {/* Guidance message */}
                            <div className="flex gap-3 px-6 py-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs leading-relaxed">
                                <span className="text-base leading-none mt-0.5">💡</span>
                                <div className="space-y-1">
                                    <p><span className="font-semibold">Submitting endorsement only?</span> Fill the endorsement and click the <span className="font-semibold">Submit</span> button below.</p>
                                    <p><span className="font-semibold">Registering a full project?</span> Fill the endorsement here, then <span className="font-semibold">close this panel</span> and use the main <span className="font-semibold">Submit Project</span> button — do not submit from here.</p>
                                </div>
                            </div>
                            {/* Modal Body */}
                            <div className="p-0" ref={endorsementCertRef}>
                                <EndorsementCertificate
                                    proposalId={docname || "IITG-"}
                                    sessionId={endorsementSessionId}
                                    piName={
                                        formData.principal_investigator_name
                                    }
                                    piDesignation={formData.designation}
                                    piDepartment={formData.applicant_department}
                                    coPiName={
                                        formData.co_investigator_table?.[0]
                                            ?.copi_name || ""
                                    }
                                    coPiDesignation={
                                        formData.co_investigator_table?.[0]
                                            ?.copi_designation || ""
                                    }
                                    coPiDepartment={
                                        formData.co_investigator_table?.[0]
                                            ?.copi_department || ""
                                    }
                                    projectTitle={formData.project_title}
                                    fundingAgency={formData.funding_agen}
                                    duration={
                                        formData.project_type === "Consultancy"
                                            ? `${formData.project_duration_days} days`
                                            : `${formData.project_duration_months} months`
                                    }
                                    totalCost={String(
                                        budgetTableData.reduce(
                                            (acc: number, row: any) =>
                                                acc +
                                                (row.years || []).reduce(
                                                    (sum: number, val: any) =>
                                                        sum + Number(val || 0),
                                                    0,
                                                ),
                                            0,
                                        ),
                                    )}
                                />
                            </div>
                            {/* Modal Footer */}
                            <div className="bg-white dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-700 px-6 py-4 rounded-b-lg">
                                <div className="flex items-center justify-end">
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={async () => {
                                            setIsSubmitting(true);
                                            try {
                                                const { doc_data, files } =
                                                    await prepareDataWithFiles();

                                                const savedBodyHtml = await getEndorsementDraft(
                                                    endorsementSessionId,
                                                    currentUser || "guest",
                                                );

                                                const budgetTotal = (formData.proposed_budget_breakup || []).reduce(
                                                    (acc: number, row: any) =>
                                                        acc + (row.years || []).reduce(
                                                            (sum: number, val: any) => sum + Number(val || 0), 0,
                                                        ),
                                                    0,
                                                );

                                                const html_content = getEndorsementHtml({
                                                    proposalId: docname || "IITG-",
                                                    piName: formData.principal_investigator_name,
                                                    piDesignation: formData.designation,
                                                    piDepartment: formData.applicant_department,
                                                    coPiName: formData.co_investigator_table?.[0]?.copi_name || "",
                                                    coPiDesignation: formData.co_investigator_table?.[0]?.copi_designation || "",
                                                    coPiDepartment: formData.co_investigator_table?.[0]?.copi_department || "",
                                                    projectTitle: formData.project_title,
                                                    fundingAgency: formData.funding_agen,
                                                    duration:
                                                        formData.project_type === "Consultancy"
                                                            ? `${formData.project_duration_days} days`
                                                            : `${formData.project_duration_months} months`,
                                                    totalCost: String(budgetTotal),
                                                    bodyHtml: savedBodyHtml || undefined,
                                                });

                                                await saveEndorsementDraft({
                                                    doc_data: JSON.stringify(doc_data),
                                                    html_content,
                                                    files: files.length > 0 ? files : null,
                                                    endorsement: 1,
                                                });
                                                setShowEndorsementModal(false);
                                            } catch (err) {
                                                alert(
                                                    "Error processing endorsement.",
                                                );
                                            } finally {
                                                setIsSubmitting(false);
                                            }
                                        }}
                                        className="px-6 py-3 rounded-md font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? "Submitting..." : "Submit"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Modal */}
                {showPreviewModal && docname && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 sm:p-6 overflow-hidden">
                        <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl flex flex-col w-full max-w-7xl h-full max-h-screen border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] overflow-hidden">
                            {/* Header accent */}
                            <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-transparent shrink-0" />
                            {/* Header */}
                            <div className="flex justify-between items-center px-6 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] z-10 shrink-0">
                                <div>
                                    <h2 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                        Project Preview
                                    </h2>
                                    <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">Review your draft. Click Submit when ready to finalize Registration.</p>
                                </div>
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="p-2 text-[#71717A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto w-full relative bg-[#FAFAF9] dark:bg-[#18181B] project-preview-wrapper">
                                <style>
                                    {`
                                    .project-preview-wrapper header button {
                                        display: none !important;
                                    }
                                    `}
                                </style>
                                <div className="w-full min-h-full">
                                    <ProjectDetailsView projectName={docname} backUrl="" backLabel="" />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="form-action-bar shrink-0 justify-end gap-3">
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="btn-neutral"
                                >
                                    Continue Editing
                                </button>
                                <button
                                    onClick={() => {
                                        setShowSubmitCommentModal(true);
                                    }}
                                    disabled={isSubmitting || isFinalSubmitting}
                                    className="btn-primary-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isFinalSubmitting ? "Submitting..." : "Submit Project"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================ */}
                {/* EDITED BY MKY | 2026-04-14 14:52 IST                           */}
                {/* START OF EDIT — Quick Entry Modal                            */}
                {/* ============================================================ */}
                {quickEntryState?.isOpen && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999999] p-4">
                        <div className="bg-white dark:bg-[#27272A] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] p-6 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                            <div className="h-[2px] -mx-6 -mt-6 mb-5 bg-gradient-to-r from-[#4A6CF7] to-transparent" />
                            <h3 className="text-[13px] font-bold mb-4 text-[#3F3F46] dark:text-[#E4E4E7]">
                                Create New Designation
                            </h3>
                            <input
                                type="text"
                                autoFocus
                                placeholder="Enter designation name..."
                                value={quickEntryState.pendingValue}
                                onChange={(e) => setQuickEntryState(prev => prev ? { ...prev, pendingValue: e.target.value } : null)}
                                className={`${inputClasses} w-full mb-4`}
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setQuickEntryState(null)}
                                    disabled={quickEntryState.isSubmitting}
                                    className="btn-neutral"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleQuickEntrySave}
                                    disabled={quickEntryState.isSubmitting || !quickEntryState.pendingValue.trim()}
                                    className="btn-primary-accent disabled:opacity-50"
                                >
                                    {quickEntryState.isSubmitting ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* END OF EDIT — MKY | 2026-04-14 14:52 IST */}
                {/* ============================================================ */}

                {/* Final Submission Comment Modal */}
                {showSubmitCommentModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999999] p-4">
                        <div className="bg-white dark:bg-[#27272A] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] p-6 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="h-[2px] -mx-6 -mt-6 mb-5 bg-gradient-to-r from-[#4A6CF7] to-transparent" />
                            <h3 className="text-[13px] font-bold mb-1.5 text-[#3F3F46] dark:text-[#E4E4E7]">
                                Confirm Submit
                            </h3>
                            <p className="mb-4 text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                                Please provide a comment for this submission.
                            </p>
                            <textarea
                                id="finalSubmitComment"
                                placeholder="Enter your comment here..."
                                className="w-full mb-4 min-h-[100px] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] bg-white dark:bg-[#27272A] text-[#18181B] dark:text-[#E4E4E7] focus:outline-none focus:border-[#4A6CF7] focus:ring-[3px] focus:ring-[#4A6CF7]/12 p-3 rounded-lg text-[13px] font-medium resize-none"
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    className="btn-neutral"
                                    onClick={() => setShowSubmitCommentModal(false)}
                                    disabled={isFinalSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn-primary-accent disabled:opacity-50 cursor-pointer"
                                    onClick={async () => {
                                        const commentEl = document.getElementById("finalSubmitComment") as HTMLTextAreaElement;
                                        const comment = commentEl ? commentEl.value : "";
                                        if (!comment.trim()) return;

                                        setIsFinalSubmitting(true);
                                        try {
                                            await submitProjectRegistration({ docname: docname, comment: comment });
                                            setShowSubmitCommentModal(false);
                                            setShowPreviewModal(false);
                                            navigate(`/project-details/${docname}`);
                                        } catch (err: any) {
                                            alert("Submit failed: " + err.message);
                                        } finally {
                                            setIsFinalSubmitting(false);
                                        }
                                    }}
                                    disabled={isFinalSubmitting}
                                >
                                    {isFinalSubmitting ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Add Funding Agency Sheet */}
            <Sheet open={showFundingAgencySheet} onOpenChange={setShowFundingAgencySheet}>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
                        <SheetTitle>Register Funding Agency</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-4 p-6">
                        {/* Funding Agency Name */}
                        {(() => {
                            const typedName = newAgencyData.funding_agency_name?.trim().toLowerCase() ?? "";
                            const existingName = duplicateAgency?.funding_agency_name?.trim().toLowerCase() ?? "";
                            const existingPrefix = existingName.split(" - ")[0].trim();
                            const existingInitials = duplicateAgency?.funding_agency_initials?.trim().toLowerCase() ?? "";
                            const hasDupe = !!duplicateAgency && (existingName === typedName || existingPrefix === typedName || existingInitials === typedName || (typedName.length >= 3 && existingName.includes(typedName)));
                            return (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Funding Agency Name <span className="text-red-500">*</span></label>
                                    <input type="text" value={newAgencyData.funding_agency_name || ""} onChange={(e) => handleAgencyFieldChange("funding_agency_name", e.target.value)}
                                        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors ${hasDupe ? "border-red-400 dark:border-red-500 focus:ring-red-300" : "border-zinc-300 dark:border-zinc-700 focus:ring-primary/30"}`} />
                                    {hasDupe && <p className="text-xs text-red-500 font-medium">Duplicate: "{duplicateAgency!.funding_agency_name}" already exists.</p>}
                                </div>
                            );
                        })()}

                        {/* Initials */}
                        {(() => {
                            const typedInitials = newAgencyData.funding_agency_initials?.trim().toLowerCase() ?? "";
                            const existingInitials = duplicateAgency?.funding_agency_initials?.trim().toLowerCase() ?? "";
                            const hasDupe = !!duplicateAgency && typedInitials.length >= 1 && existingInitials === typedInitials;
                            return (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Initials / Abbreviation</label>
                                    <input type="text" value={newAgencyData.funding_agency_initials || ""} onChange={(e) => handleAgencyFieldChange("funding_agency_initials", e.target.value)}
                                        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors ${hasDupe ? "border-red-400 dark:border-red-500 focus:ring-red-300" : "border-zinc-300 dark:border-zinc-700 focus:ring-primary/30"}`} />
                                    {hasDupe && <p className="text-xs text-red-500 font-medium">Duplicate: "{duplicateAgency!.funding_agency_name}" already exists.</p>}
                                </div>
                            );
                        })()}

                        {/* Origin */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Origin of Funding Agency</label>
                            <select value={newAgencyData.origin_of_funding_agency || ""} onChange={(e) => handleAgencyFieldChange("origin_of_funding_agency", e.target.value)}
                                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
                                <option value="">— Select —</option>
                                <option value="National">National</option>
                                <option value="International">International</option>
                            </select>
                        </div>

                        {/* Funding Agency Type */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Funding Agency Type</label>
                            <select value={newAgencyData.funding_agency_type_1 || ""} onChange={(e) => handleAgencyFieldChange("funding_agency_type_1", e.target.value)}
                                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
                                <option value="">— Select —</option>
                                <option value="Government">Government</option>
                                <option value="Industry">Industry</option>
                                <option value="International">International</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>

                        {/* Specify other type */}
                        {newAgencyData.funding_agency_type_1 === "Others" && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Specify Type <span className="text-red-500">*</span></label>
                                <input type="text" value={newAgencyData.specify_other_funding_agency_type || ""} onChange={(e) => handleAgencyFieldChange("specify_other_funding_agency_type", e.target.value)}
                                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" />
                            </div>
                        )}

                        {/* Ministry — only when Government + National */}
                        {newAgencyData.funding_agency_type_1 === "Government" && newAgencyData.origin_of_funding_agency === "National" && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Ministry / Department <span className="text-red-500">*</span></label>
                                <select value={newAgencyData.ministry_funding_agency || ""} onChange={(e) => handleAgencyFieldChange("ministry_funding_agency", e.target.value)}
                                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
                                    <option value="">— Select —</option>
                                    <option value="Defence">Defence</option>
                                    <option value="Education">Education</option>
                                    <option value="Water">Water</option>
                                    <option value="Health">Health</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>
                        )}

                        {/* Specify other ministry */}
                        {newAgencyData.ministry_funding_agency === "Others" && newAgencyData.funding_agency_type_1 === "Government" && newAgencyData.origin_of_funding_agency === "National" && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Specify Ministry <span className="text-red-500">*</span></label>
                                <input type="text" value={newAgencyData.specify_other_ministry || ""} onChange={(e) => handleAgencyFieldChange("specify_other_ministry", e.target.value)}
                                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" />
                            </div>
                        )}

                        {/* GSTIN — only when National */}
                        {newAgencyData.origin_of_funding_agency === "National" && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">GSTIN</label>
                                <input type="text" value={newAgencyData.gstin_of_funding_agency || ""} onChange={(e) => handleAgencyFieldChange("gstin_of_funding_agency", e.target.value)}
                                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" />
                            </div>
                        )}

                        {/* Address */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Address</label>
                            <textarea rows={2} value={newAgencyData.fundingagency_address || ""} onChange={(e) => handleAgencyFieldChange("fundingagency_address", e.target.value)}
                                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 resize-none" />
                        </div>

                        {/* Country */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Country</label>
                            <CountrySelect value={newAgencyData.fundingagency_country || ""} onChange={(val) => handleAgencyFieldChange("fundingagency_country", val)} />
                        </div>

                        {/* State — only when National */}
                        {newAgencyData.origin_of_funding_agency === "National" && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">State <span className="text-red-500">*</span></label>
                                <select value={newAgencyData.fundingagency_state || ""} onChange={(e) => handleAgencyFieldChange("fundingagency_state", e.target.value)}
                                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
                                    <option value="">— Select State —</option>
                                    {["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Postal Code */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Postal Code</label>
                            <input type="text" value={newAgencyData.fundingagency_postalcode || ""} onChange={(e) => handleAgencyFieldChange("fundingagency_postalcode", e.target.value)}
                                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" />
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Email</label>
                            <input type="email" value={newAgencyData.funding_agency_email || ""} onChange={(e) => handleAgencyFieldChange("funding_agency_email", e.target.value)}
                                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" />
                        </div>

                        {/* Contact */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Contact No.</label>
                            <input type="text" value={newAgencyData.funding_agency_contact_no || ""} onChange={(e) => handleAgencyFieldChange("funding_agency_contact_no", e.target.value)}
                                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100" />
                        </div>

                    </div>
                    <SheetFooter>
                        <button
                            type="button"
                            onClick={() => { setShowFundingAgencySheet(false); setNewAgencyData({ fundingagency_country: "India" }); }}
                            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            disabled={isSavingAgency}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveFundingAgency}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            disabled={isSavingAgency || !!duplicateAgency}
                        >
                            {isSavingAgency ? "Saving..." : "Save"}
                        </button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>


        </div>
    );
};

export default ProjectRegistration;
