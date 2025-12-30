import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';

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
}

// --- STYLES ---
const inputClasses = "w-full h-11 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.18)] focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100";

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
            "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.18)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
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
}: ChildTableProps) => {
    // Filter visible columns
    const visibleColumns = columns.filter(col => !col.hidden);

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
                        type="number"
                        step="1"
                        className={inputClasses}
                        value={value || ''}
                        onChange={(e) => onRowChange(tableName, rowIndex, col.fieldname, parseInt(e.target.value) || 0)}
                        disabled={isReadOnly}
                    />
                );

            case 'Float':
            case 'Currency':
                return (
                    <input
                        type="number"
                        step="0.01"
                        className={inputClasses}
                        value={value || ''}
                        onChange={(e) => onRowChange(tableName, rowIndex, col.fieldname, parseFloat(e.target.value) || 0)}
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
                        className="w-5 h-5 rounded border-gray-300 text-[#0EA5A4] focus:ring-[#0EA5A4]"
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
                        className={cn(inputClasses, "py-2 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:font-medium file:bg-[#E0F7F6] file:text-[#0EA5A4] hover:file:bg-[#0EA5A4] hover:file:text-white file:transition-colors")}
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

            default: // Data, Link, etc.
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
                <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
            )}

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr className="divide-x divide-gray-100">
                            <th className="p-3 font-medium text-gray-600 text-xs uppercase tracking-wider text-center w-12">
                                #
                            </th>
                            {visibleColumns.map(col => (
                                <th
                                    key={col.fieldname}
                                    className="p-3 font-medium text-gray-600 text-xs uppercase tracking-wider text-left whitespace-nowrap min-w-[150px]"
                                >
                                    {col.label}
                                    {!!col.mandatory && <span className="text-red-500 ml-1">*</span>}
                                </th>
                            ))}
                            {!readOnly && (
                                <th className="p-3 font-medium text-gray-600 text-xs uppercase tracking-wider text-center w-24">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {tableData.map((row, rowIndex) => (
                            <tr key={row.id || rowIndex} className="divide-x divide-gray-100 hover:bg-gray-50/50">
                                <td className="p-2 text-center text-sm text-gray-500">
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
                                            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
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
                                    className="p-8 text-center text-gray-500"
                                >
                                    No items added yet. Click "Add Row" to add an item.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {hasNumericColumns && tableData.length > 0 && (
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                            <tr className="divide-x divide-gray-100">
                                <td className="p-3 font-semibold text-gray-700 text-sm" colSpan={1}>
                                    Total
                                </td>
                                {visibleColumns.map(col => (
                                    <td key={col.fieldname} className="p-3 font-semibold text-gray-900 text-sm">
                                        {totals[col.fieldname] !== undefined
                                            ? col.fieldtype === 'Currency'
                                                ? totals[col.fieldname].toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                                                : totals[col.fieldname].toLocaleString('en-IN')
                                            : ''
                                        }
                                    </td>
                                ))}
                                {!readOnly && <td></td>}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {!readOnly && (
                <FrappeButton
                    onClick={() => onAddRow(tableName, createNewRow())}
                    className="bg-[#0EA5A4] text-white hover:bg-[#0D9494]"
                >
                    + Add Row
                </FrappeButton>
            )}
        </div>
    );
});

ChildTableComponent.displayName = 'ChildTableComponent';

export default ChildTableComponent;
