import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AutocompleteEmail } from '@/components/AutocompleteEmail';

// --- TYPE DEFINITIONS ---
export interface ChildField {
    fieldname: string;
    label: string;
    fieldtype: string;
    options?: string | null;
    mandatory?: boolean | number;
    read_only?: boolean | number;
    hidden?: boolean | number;
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
    // New props for Link field support with auto-fetch
    linkOptions?: Record<string, LinkOption[]>;
    onLinkChange?: (tableName: string, rowIndex: number, fieldname: string, value: string) => void;
}

// --- STYLES ---
const inputClasses = "w-full h-11 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[rgba(217,119,87,0.18)] focus:border-[#D97757] disabled:opacity-70 disabled:bg-zinc-100 dark:bg-zinc-800";

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
            "rounded-lg px-3 py-1.5 font-medium text-xs transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-zinc-100 dark:focus:ring-zinc-700",
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
    linkOptions = {},
    onLinkChange,
}: ChildTableProps) => {
    // Filter visible columns - exclude hidden columns AND columns without labels
    const visibleColumns = columns.filter(col =>
        !col.hidden &&
        col.label &&
        col.label.trim() !== '' &&
        col.fieldname !== 'row_total' &&   // Frappe auto-field on submittable child tables
        col.fieldname !== 'idx' &&          // internal row index
        col.fieldname !== 'docstatus',      // internal status
    );

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

    // Render cell input based on field type
    const renderCellInput = (col: ChildField, row: any, rowIndex: number) => {
        const value = row[col.fieldname];
        const isReadOnly = readOnly || !!col.read_only;

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

            case 'Check':
                return (
                    <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 text-[#D97757] focus:ring-[#D97757]"
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
                    <input
                        type="file"
                        className={cn(inputClasses, "py-2 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:font-medium file:bg-zinc-50 dark:bg-zinc-800 file:text-[#D97757] hover:file:bg-[#D97757] hover:file:text-white file:transition-colors")}
                        onChange={(e) => onFileChange(tableName, rowIndex, col.fieldname, e.target.files?.[0] || null)}
                        disabled={isReadOnly}
                    />
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
                            onChange={(v) => onRowChange(tableName, rowIndex, col.fieldname, v)}
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

    const totals = calculateTotals();
    const hasNumericColumns = Object.keys(totals).length > 0;

    return (
        <div className="space-y-4">
            {label && (
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{label}</h3>
            )}

            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                        <tr className="divide-x divide-zinc-100 dark:divide-zinc-800">
                            <th className="p-3 font-medium text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider text-center w-12">
                                #
                            </th>
                            {visibleColumns.map(col => (
                                <th
                                    key={col.fieldname}
                                    className="p-3 font-medium text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider text-left whitespace-nowrap min-w-[150px]"
                                >
                                    {col.label}
                                    {!!col.mandatory && <span className="text-red-500 ml-1">*</span>}
                                </th>
                            ))}
                            {!readOnly && (
                                <th className="p-3 font-medium text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider text-center w-24">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                        {tableData.map((row, rowIndex) => (
                            <tr key={row.id || rowIndex} className="divide-x divide-zinc-100 dark:divide-zinc-800 hover:bg-zinc-50 dark:bg-zinc-800/50/50">
                                <td className="p-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                    {rowIndex + 1}
                                </td>
                                {visibleColumns.map(col => (
                                    <td key={col.fieldname} className="p-2">
                                        {renderCellInput(col, row, rowIndex)}
                                    </td>
                                ))}
                                {!readOnly && (
                                    <td className="p-2 text-center">
                                        <FrappeButton
                                            onClick={() => onDeleteRow(tableName, rowIndex)}
                                            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/30"
                                        >
                                            Delete
                                        </FrappeButton>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {tableData.length === 0 && (
                            <tr>
                                <td
                                    colSpan={visibleColumns.length + (readOnly ? 1 : 2)}
                                    className="p-8 text-center text-zinc-500 dark:text-zinc-400"
                                >
                                    No items added yet. Click "Add Row" to add an item.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {hasNumericColumns && tableData.length > 0 && (
                        <tfoot className="bg-[#D97757]/5 dark:bg-[#D97757]/10 border-t-2 border-[#D97757]/30 dark:border-[#D97757]/40">
                            <tr className="divide-x divide-zinc-100 dark:divide-zinc-800">
                                <td className="p-3 text-center text-xs text-zinc-400" />
                                {visibleColumns.map((col, i) => (
                                    <td key={col.fieldname} className="p-3">
                                        {i === 0 ? (
                                            <span className="font-bold text-sm text-zinc-700 dark:text-zinc-200 uppercase tracking-wide">
                                                Grand Total
                                            </span>
                                        ) : totals[col.fieldname] !== undefined ? (
                                            <span className="font-extrabold text-base text-[#D97757]">
                                                {col.fieldtype === 'Currency'
                                                    ? totals[col.fieldname].toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                                                    : totals[col.fieldname].toLocaleString('en-IN')}
                                            </span>
                                        ) : null}
                                    </td>
                                ))}
                                {!readOnly && <td />}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {!readOnly && (
                <FrappeButton
                    onClick={() => onAddRow(tableName, createNewRow())}
                    className="w-full py-2.5 text-sm bg-white border border-dashed border-[#D97757]/40 text-[#D97757] hover:bg-[#D97757]/5 hover:border-[#D97757]/60 hover:text-[#D97757] dark:bg-zinc-900 dark:border-[#D97757]/30 dark:text-[#D97757]/80 dark:hover:bg-[#D97757]/10 dark:hover:text-[#D97757] shadow-sm"
                >
                    + Add Row
                </FrappeButton>
            )}
        </div>
    );
});

ChildTableComponent.displayName = 'ChildTableComponent';

export default ChildTableComponent;
