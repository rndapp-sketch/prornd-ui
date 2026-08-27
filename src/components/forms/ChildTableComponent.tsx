


// ============================================================

import React, { memo, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { AutocompleteEmail } from '@/components/AutocompleteEmail';
import { DepartmentName } from '@/components/DepartmentName';
import { evaluateExpression } from '@/utils/evalExpression';
import { getFileUrl } from '@/utils/fileUtils';
import { useFrappeGetCall } from 'frappe-react-sdk';

// --- SELF-FETCHING DEPARTMENT SELECT ---
const DepartmentSelect = ({ value, onChange, disabled, className }: any) => {
    const { data } = useFrappeGetCall<{ message: any[] }>(
        "frappe.client.get_list",
        { doctype: "Department_prornd", fields: ["name", "dept_name"], limit_page_length: 0 },
        undefined,
        { revalidateOnFocus: false }
    );
    const options = data?.message?.map(d => ({ value: d.name, label: d.dept_name || d.name })) || [];

    return (
        <select className={className} value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}>
            <option value="">Select...</option>
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    );
};

// --- TYPE DEFINITIONS ---
export interface ChildField {
    fieldname: string;
    label: string;
    fieldtype: string;
    options?: string | null;
    mandatory?: boolean | number;
    read_only?: boolean | number;
    hidden?: boolean | number;
    /** Row-scoped visibility condition, e.g. "eval:doc.mode_of_journey == 'Other'" — evaluated against the row */
    depends_on?: string | null;
}

export interface LinkOption {
    value: string;
    label: string;
}

export interface ChildTableProps {
    tableName: string;
    label?: string;
    columns: ChildField[];
    tableData: any[];
    onRowChange: (tableName: string, rowIndex: number, fieldname: string, value: any) => void;
    onFileChange: (tableName: string, rowIndex: number, fieldname: string, file: File | null) => void;
    onAddRow: (tableName: string, newRow: Record<string, any>) => void;
    onDeleteRow: (tableName: string, rowIndex: number) => void;
    readOnly?: boolean;
    /** Maximum number of rows allowed. When reached, the "Add Row" button is hidden. */
    maxRows?: number;
    /** Automatically add the first row if the table is empty. If number, adds that many rows. */
    autoAddFirstRow?: boolean | number;
    /** Disable deleting rows (hides the Actions column) */
    disableDelete?: boolean;
    /** Whether this table field is mandatory */
    mandatory?: boolean;
    // New props for Link field support with auto-fetch
    linkOptions?: Record<string, LinkOption[]>;
    onLinkChange?: (tableName: string, rowIndex: number, fieldname: string, value: string) => void;
    /** Pre-filled data for automatically added rows */
    defaultRows?: Record<string, any>[];
}

// --- STYLES ---
const inputClasses = "w-full h-10 px-3 bg-white dark:bg-[#27272A] border-[1.5px] border-[#E4E4E7] dark:border-[#3F3F46] rounded-[0.4375rem] text-[13px] font-semibold text-[#27272A] dark:text-[#F4F4F5] placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A] focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 focus:border-[#4A6CF7] disabled:opacity-100 disabled:bg-[#FAFAF9] dark:disabled:bg-[#27272A]/50 disabled:text-[#27272A] dark:disabled:text-[#F4F4F5] transition-colors duration-150";

const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: "button" | "submit";
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "rounded-md px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wide transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700",
            className
        )}
    >
        {children}
    </button>
);

// --- CHILD TABLE COMPONENT ---
export const ChildTableComponent = memo(({
    tableName,
    label,
    columns,
    tableData = [],
    onRowChange,
    onFileChange,
    onAddRow,
    onDeleteRow,
    readOnly = false,
    maxRows,
    autoAddFirstRow,
    disableDelete = false,
    mandatory = false,
    linkOptions = {},
    onLinkChange,
    defaultRows = [],
}: ChildTableProps) => {
    const canAddRow = !maxRows || tableData.length < maxRows;
    const isOfficialIdentification = label && String(label).includes('Official Identification');
    const rowLabel = label?.replace(/\b(details|table|section)\b/gi, '').trim() || 'Row';

    // Filter visible columns - exclude hidden columns AND columns without labels
    const visibleColumns = columns.filter(col =>
        !col.hidden &&
        col.label &&
        col.label.trim() !== '' &&
        col.fieldname !== 'row_total' &&   // Frappe auto-field on submittable child tables
        col.fieldname !== 'idx' &&          // internal row index
        col.fieldname !== 'docstatus' &&    // internal status
        !(isOfficialIdentification && col.label === 'Expiry Date')
    );

    // Per-row visibility — some columns (e.g. "specify other mode") only apply
    // depending on another field's value within the *same* row.
    const getRowColumns = useCallback(
        (row: any) => visibleColumns.filter(col => !col.depends_on || evaluateExpression(col.depends_on, row)),
        [visibleColumns],
    );

    const [collapsedRows, setCollapsedRows] = useState<Record<string, boolean>>({});

    const toggleRow = useCallback((rowKey: string) => {
        setCollapsedRows(prev => ({ ...prev, [rowKey]: !prev[rowKey] }));
    }, []);

    // Create a new row template
    const createNewRow = useCallback(() => {
        const newRow: Record<string, any> = { id: Date.now().toString() + Math.random().toString(36).substring(2, 9) };
        visibleColumns.forEach(col => {
            if (col.fieldtype === 'Int' || col.fieldtype === 'Float' || col.fieldtype === 'Currency') {
                newRow[col.fieldname] = 0;
            } else if (col.fieldtype === 'Check') {
                newRow[col.fieldname] = 0;
            } else {
                newRow[col.fieldname] = '';
            }
        });
        return newRow;
    }, [visibleColumns]);

    const handleAddClick = useCallback(() => {
        const newRow = createNewRow();
        onAddRow(tableName, newRow);
        setCollapsedRows(prev => ({ ...prev, [newRow.id]: false }));
    }, [createNewRow, onAddRow, tableName]);

    // Automatically add rows if the table is empty and autoAddFirstRow or defaultRows is set
    const hasAutoAdded = React.useRef(false);
    useEffect(() => {
        if ((autoAddFirstRow || defaultRows.length > 0) && tableData.length === 0 && !readOnly && !hasAutoAdded.current) {
            hasAutoAdded.current = true;
            if (defaultRows.length > 0) {
                defaultRows.forEach(row => {
                    const newRowData = { ...createNewRow(), ...row };
                    onAddRow(tableName, newRowData);
                    setCollapsedRows(prev => ({ ...prev, [newRowData.id]: false }));
                });
            } else {
                const rowsToAdd = typeof autoAddFirstRow === 'number' ? autoAddFirstRow : 1;
                for (let i = 0; i < rowsToAdd; i++) {
                    const newRowData = createNewRow();
                    onAddRow(tableName, newRowData);
                    setCollapsedRows(prev => ({ ...prev, [newRowData.id]: false }));
                }
            }
        }
    }, [autoAddFirstRow, defaultRows, tableData.length, readOnly, onAddRow, tableName, createNewRow]);

    // Render cell input based on field type
    const renderCellInput = (col: ChildField, row: any, rowIndex: number) => {
        const value = row[col.fieldname];
        const isReadOnly = readOnly || !!col.read_only;

        // Resolve department-linked fields to human-readable names in read-only mode
        const isDeptField =
            col.fieldname === 'department_section' ||
            col.fieldname === 'department' ||
            col.fieldname === 'department_for' ||
            col.fieldname === 'upfa_department' ||
            col.fieldname === 'ps_department' ||
            col.fieldname === 'implementation_department' ||
            col.fieldname === 'applicant_department';
        if (isReadOnly && isDeptField && value) {
            return <DepartmentName name={value} />;
        }

        switch (col.fieldtype) {
            case 'Int':
                return (
                    <input
                        type="text"
                        inputMode="numeric"
                        title="Enter a positive whole number"
                        className={inputClasses}
                        value={String(value ?? '')}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === '' || /^\d*$/.test(v)) onRowChange(tableName, rowIndex, col.fieldname, v);
                        }}
                        onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== '') onRowChange(tableName, rowIndex, col.fieldname, parseInt(v, 10) || 0);
                        }}
                        disabled={isReadOnly}
                    />
                );

            case 'Float':
            case 'Currency':
                return (
                    <input
                        type="text"
                        inputMode="decimal"
                        title="Enter a positive amount"
                        className={inputClasses}
                        value={String(value ?? '')}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === '' || /^\d*\.?\d*$/.test(v)) onRowChange(tableName, rowIndex, col.fieldname, v);
                        }}
                        onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== '') onRowChange(tableName, rowIndex, col.fieldname, parseFloat(v) || 0);
                        }}
                        disabled={isReadOnly}
                    />
                );

            case 'Date':
                return (
                    <input
                        type="date"
                        className={inputClasses}
                        value={value || ''}
                        onChange={(e) => onRowChange(tableName, rowIndex, col.fieldname, e.target.value)}
                        disabled={isReadOnly}
                    />
                );

            case 'Time':
                // Frappe returns Time fields as "HH:MM:SS" or "HH:MM:SS.ffffff", but a
                // step-less <input type="time"> only accepts "HH:MM" as a valid value —
                // anything else is silently rejected and renders blank, which looks like
                // the saved time was lost even though it's still present in the row data.
                return (
                    <input
                        type="time"
                        className={inputClasses}
                        value={typeof value === 'string' ? value.slice(0, 5) : ''}
                        onChange={(e) => onRowChange(tableName, rowIndex, col.fieldname, e.target.value)}
                        disabled={isReadOnly}
                    />
                );

            case 'Check':
                return (
                    <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 text-[#4A6CF7] focus:ring-[#4A6CF7]"
                        checked={!!value}
                        onChange={(e) => onRowChange(tableName, rowIndex, col.fieldname, e.target.checked ? 1 : 0)}
                        disabled={isReadOnly}
                    />
                );

            case 'Select':
                const options = col.options?.split('\n').filter(Boolean) || [];
                return (
                    <select
                        className={inputClasses}
                        value={value || ''}
                        onChange={(e) => onRowChange(tableName, rowIndex, col.fieldname, e.target.value)}
                        disabled={isReadOnly}
                    >
                        <option value="">Select...</option>
                        {options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );

            case 'Attach':
                return (
                    <div className="space-y-1">
                        {value && typeof value === 'string' && (
                            <div className="flex items-center gap-1.5">
                                <a
                                    href={getFileUrl(value)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-[#D97757] underline truncate max-w-[220px]"
                                    title={value.split('/').pop()}
                                >
                                    {value.split('/').pop()}
                                </a>
                                {!isReadOnly && <span className="text-[10px] text-zinc-400">(replace)</span>}
                            </div>
                        )}
                        {!isReadOnly && (
                            <input
                                type="file"
                                className={cn(inputClasses, "py-2 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:font-medium file:bg-zinc-50 dark:bg-zinc-800 file:text-[#D97757] hover:file:bg-[#D97757] hover:file:text-white file:transition-colors")}
                                onChange={(e) => onFileChange(tableName, rowIndex, col.fieldname, e.target.files?.[0] || null)}
                            />
                        )}
                    </div>
                );

            case 'Small Text':
            case 'Text':
                return (
                    <textarea
                        className={cn(inputClasses, "h-auto py-2")}
                        rows={2}
                        value={value || ''}
                        onChange={(e) => onRowChange(tableName, rowIndex, col.fieldname, e.target.value)}
                        disabled={isReadOnly}
                    />
                );

            case 'Link': {
                // For User-linked fields (webmail/email), prefer autocomplete over select
                const isUserLink =
                    col.options === 'User' ||
                    col.fieldname.includes('webmail') ||
                    col.fieldname.includes('email');

                if (isUserLink) {
                    // Collect user options from all possible keys the backend may use
                    const userOpts =
                        linkOptions[col.fieldname] ||
                        linkOptions['User'] ||
                        linkOptions['webmail_id'] ||
                        linkOptions[col.options as string] ||
                        [];
                    return (
                        <AutocompleteEmail
                            options={userOpts}
                            value={value || ''}
                            onChange={(v) => {
                                if (onLinkChange) {
                                    onLinkChange(tableName, rowIndex, col.fieldname, v);
                                } else {
                                    onRowChange(tableName, rowIndex, col.fieldname, v);
                                }
                            }}
                            className={inputClasses}
                            placeholder={`Enter ${col.label || 'Email'}`}
                            showAllOnFocus={true}
                            disabled={isReadOnly}
                        />
                    );
                }

                const linkOpts = linkOptions[col.fieldname] || linkOptions[col.options as string] || [];
                if (linkOpts.length > 0) {
                    return (
                        <select
                            className={inputClasses}
                            value={value || ''}
                            onChange={(e) => {
                                const selectedValue = e.target.value;
                                if (onLinkChange) {
                                    onLinkChange(tableName, rowIndex, col.fieldname, selectedValue);
                                } else {
                                    onRowChange(tableName, rowIndex, col.fieldname, selectedValue);
                                }
                            }}
                            disabled={isReadOnly}
                        >
                            <option value="">Select...</option>
                            {linkOpts.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    );
                }

                // Foolproof fallback: if parent form failed to provide linkOptions for Department_prornd, fetch it locally
                if (col.fieldname === 'department_section' || col.options === 'Department_prornd') {
                    return (
                        <DepartmentSelect
                            className={inputClasses}
                            value={value}
                            onChange={(val: string) => {
                                if (onLinkChange) onLinkChange(tableName, rowIndex, col.fieldname, val);
                                else onRowChange(tableName, rowIndex, col.fieldname, val);
                            }}
                            disabled={isReadOnly}
                        />
                    );
                }

                return (
                    <input
                        type="text"
                        className={inputClasses}
                        value={value || ''}
                        onChange={(e) => onRowChange(tableName, rowIndex, col.fieldname, e.target.value)}
                        disabled={isReadOnly}
                    />
                );
            }

            default: { // Data, etc.
                // Foolproof fallback: if the backend misconfigured this as "Data", force it to be a Link dropdown
                if (col.fieldname === 'department_section' || col.options === 'Department_prornd') {
                    return (
                        <DepartmentSelect
                            className={inputClasses}
                            value={value}
                            onChange={(val: string) => {
                                if (onLinkChange) onLinkChange(tableName, rowIndex, col.fieldname, val);
                                else onRowChange(tableName, rowIndex, col.fieldname, val);
                            }}
                            disabled={isReadOnly}
                        />
                    );
                }

                const isEmailField =
                    col.fieldname.includes('webmail') ||
                    col.fieldname.includes('email') ||
                    col.label?.toLowerCase().includes('webmail') ||
                    col.label?.toLowerCase().includes('email');
                const userOpts = linkOptions['User'] || linkOptions['webmail_id'] || linkOptions[col.fieldname] || [];

                if (isEmailField && userOpts.length > 0 && !isReadOnly) {
                    return (
                        <AutocompleteEmail
                            options={userOpts}
                            value={value || ''}
                            onChange={(v) => onRowChange(tableName, rowIndex, col.fieldname, v)}
                            className={inputClasses}
                            placeholder={`Enter ${col.label || 'Email'}`}
                        />
                    );
                }

                return (
                    <input
                        type="text"
                        className={inputClasses}
                        value={value || ''}
                        onChange={(e) => onRowChange(tableName, rowIndex, col.fieldname, e.target.value)}
                        disabled={isReadOnly}
                    />
                );
            }
        }
    };

    // Calculate totals for numeric columns
    const calculateTotals = () => {
        const totals: Record<string, number> = {};
        visibleColumns.forEach(col => {
            if (col.fieldtype === 'Currency' || col.fieldtype === 'Float' || col.fieldtype === 'Int') {
                totals[col.fieldname] = tableData.reduce((sum, row) => {
                    const val = parseFloat(row[col.fieldname]) || 0;
                    return sum + val;
                }, 0);
            }
        });
        return totals;
    };

    calculateTotals();

    return (
        <div className="space-y-4">
            {label && (
                <div className="flex items-center gap-2 rounded-lg border border-[#C7D2FE] dark:border-[#4A6CF7]/30 bg-[#EEF2FF] dark:bg-[#1E3A8A]/18 px-3 py-2">
                    <span className="h-4 w-1 rounded-full bg-[#4A6CF7] dark:bg-[#818CF8]" />
                    <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1E3A8A] dark:text-[#C7D2FE]">
                        {label}
                        {mandatory && <span className="text-red-500 ml-1 normal-case font-bold">*</span>}
                    </h3>
                </div>
            )}

            <div className="space-y-4">
                {tableData.map((row, rowIndex) => {
                    const rowKey = row.name || row.id || String(rowIndex);
                    const isExpanded = !collapsedRows[rowKey];

                    return (
                        <div key={rowKey} className="border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl overflow-hidden transition-all duration-150 shadow-sm"  >
                            {isExpanded ? (
                                <div className="bg-white dark:bg-[#27272A]">
                                    <div className="flex items-center justify-between px-5 py-3 border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                        <span className="text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-widest">
                                            {rowLabel} #{rowIndex + 1}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <FrappeButton
                                                onClick={() => toggleRow(rowKey)}
                                                className="bg-[#4A6CF7] text-white border-[#4A6CF7] hover:bg-[#3B5CF5]"
                                            >
                                                Done
                                            </FrappeButton>
                                            {!readOnly && !disableDelete && (
                                                <FrappeButton
                                                    onClick={() => onDeleteRow(tableName, rowIndex)}
                                                    className="bg-white/70 text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40 dark:hover:bg-red-950/30"
                                                >
                                                    Remove
                                                </FrappeButton>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-5">
                                        {getRowColumns(row).map(col => (
                                            <div key={col.fieldname} className="space-y-1.5 flex flex-col">
                                                <label className="inline-flex w-fit max-w-full items-start rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]">
                                                    <span className="whitespace-normal break-words leading-snug">
                                                        {col.label === 'Total Experience' ? 'Total Experience (Months)' : col.label}
                                                    </span>
                                                    {!!col.mandatory && <span className="text-red-500 ml-1 normal-case font-bold">*</span>}
                                                </label>
                                                <div className="flex-1">
                                                    {renderCellInput(col, row, rowIndex)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="px-4 py-3.5 flex items-center justify-between gap-4 bg-white dark:bg-[#27272A] border-l-[3px] border-l-[#2563EB]">
                                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                        <div className="shrink-0 w-6 h-6 rounded-full bg-[#4A6CF7]/10 flex items-center justify-center text-[10px] font-bold text-[#4A6CF7] border border-[#4A6CF7]/25">
                                            {rowIndex + 1}
                                        </div>
                                        <div className="flex flex-wrap gap-x-8 gap-y-1 flex-1">
                                            {getRowColumns(row).slice(0, 3).map(col => (
                                                <div key={col.fieldname} className="flex flex-col max-w-[200px]">
                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#71717A] dark:text-[#A1A1AA]">
                                                        {col.label === 'Total Experience' ? 'Total Exp. (Mo.)' : col.label}
                                                    </span>
                                                    <span className="truncate text-[13px] font-medium text-[#3F3F46] dark:text-[#E4E4E7]" title={String(row[col.fieldname] || '-')}>
                                                        {(row[col.fieldname] !== undefined && row[col.fieldname] !== null && row[col.fieldname] !== '') ? String(row[col.fieldname]) : '—'}
                                                    </span>
                                                </div>
                                            ))}
                                            {getRowColumns(row).length > 3 && (
                                                <div className="flex items-end text-[10px] text-[#A1A1AA] font-semibold uppercase tracking-wider">
                                                    +{getRowColumns(row).length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2 border-l border-[#E4E4E7] dark:border-[#3F3F46] pl-4">
                                        <FrappeButton
                                            onClick={() => toggleRow(rowKey)}
                                            className="bg-[#4A6CF7]/8 text-[#4A6CF7] border border-[#4A6CF7]/30 hover:bg-[#4A6CF7]/15 hover:border-[#4A6CF7]/50 dark:bg-[#4A6CF7]/10 dark:text-[#60A5FA] dark:border-[#4A6CF7]/30"
                                        >
                                            Edit
                                        </FrappeButton>
                                        {!readOnly && !disableDelete && (
                                            <FrappeButton
                                                onClick={() => onDeleteRow(tableName, rowIndex)}
                                                className="bg-transparent text-red-500 border border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-800/40 dark:text-red-400 dark:hover:bg-red-900/20"
                                            >
                                                Remove
                                            </FrappeButton>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {tableData.length === 0 && (
                    <div className="py-10 text-center rounded-lg border border-dashed border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]/30">
                        <p className="text-[12px] font-bold uppercase tracking-wide text-[#A1A1AA] dark:text-[#71717A]">No {rowLabel.toLowerCase()} records added yet</p>
                        <p className="text-[11px] text-[#D4D4D8] dark:text-[#52525B] mt-1">Click "Add Row" below to get started</p>
                    </div>
                )}
            </div>

            {/* {hasNumericColumns && tableData.length > 0 && (
                <div className="p-5 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 rounded-xl mt-4">
                    <h4 className="text-sm border-b border-orange-200/60 dark:border-orange-900/40 pb-2 mb-3 font-bold text-orange-800 dark:text-orange-200 uppercase tracking-wide">
                        Grand Total
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visibleColumns
                            .filter(col => totals[col.fieldname] !== undefined)
                            .map(col => (
                                <div key={`total-${col.fieldname}`} className="flex flex-col p-3 bg-white dark:bg-zinc-900 rounded-lg border border-orange-100 dark:border-orange-900/50 shadow-sm">
                                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-100 mb-1">{col.label}</span>
                                    <span className="font-extrabold text-[#D97757] text-lg">
                                        {col.fieldtype === 'Currency'
                                            ? totals[col.fieldname].toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                                            : totals[col.fieldname].toLocaleString('en-IN')}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>
            )} */}

            {!readOnly && canAddRow && (
                <div className="pt-1">
                    <button
                        type="button"
                        onClick={handleAddClick}
                        className="w-full py-2.5 rounded-[0.4375rem] border border-dashed border-[#4A6CF7]/40 text-[11px] font-bold uppercase tracking-widest text-[#4A6CF7] hover:border-[#4A6CF7]/60 hover:bg-[#4A6CF7]/5 dark:text-[#60A5FA] dark:border-[#60A5FA]/30 dark:hover:bg-[#4A6CF7]/8 transition-all duration-150"
                    >
                        + Add Row
                    </button>
                </div>
            )}
        </div>
    );
});

ChildTableComponent.displayName = 'ChildTableComponent';

export default ChildTableComponent;
