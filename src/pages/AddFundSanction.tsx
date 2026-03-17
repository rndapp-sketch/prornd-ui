
// -=-=-=-=-=-=-=-=-=-==-=-=-=

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AppSidebar } from "../components/RndSidebar";
import { useFrappeGetDoc, useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, Send, Save } from "lucide-react";

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string;
    label: string | null;
    fieldtype: string;
    mandatory: boolean;
    read_only: boolean;
    hidden: boolean;
    options?: string | null;
}

interface LinkOption {
    value: string;
    label: string;
}

interface FormData {
    [key: string]: any;
    sanctioned_budget_breakup?: (any & { id?: string })[];
    sanction_related_files?: (any & { id?: string })[];
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const inputClasses = "w-full h-9 px-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] disabled:opacity-70 disabled:bg-zinc-100 dark:bg-zinc-800 read-only:bg-zinc-100 dark:bg-zinc-800";
const FrappeCard = ({ children, className }: any) => (<div className={cn("bg-white dark:bg-zinc-900 p-4 md:p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm", className)}>{children}</div>);
const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: any) => (<button type={type} onClick={onClick} disabled={disabled} className={cn("px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md font-semibold text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button>);

const NeoSection = ({ title, children }: any) => (<div className="space-y-4"><h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight border-b border-zinc-300 dark:border-zinc-700 pb-2 uppercase">{title}</h2>{children}</div>);

/** Prevent scroll-wheel from changing number input values */
const preventScrollChange = (e: React.WheelEvent<HTMLInputElement | HTMLSelectElement>) => {
    (e.target as HTMLElement).blur();
};

// --- MEMOIZED CHILD COMPONENTS ---
const MemoizedFormField = memo(({ field, value, options, onChange, readOnlyOverride }: any) => {
    if (!field || field.hidden) return null;
    const isReadOnly = field.read_only || readOnlyOverride;
    const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: isReadOnly, required: field.mandatory, disabled: isReadOnly, };

    const renderInput = () => {
        switch (field.fieldtype) {
            case "Link": return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(options || []).map((opt: any) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
            case "Date": return <input type="date" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
            case "Currency": return <input type="number" step="0.01" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} onWheel={preventScrollChange} />;
            case "Int": case "Float": return <input type="number" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} onWheel={preventScrollChange} />;
            default: return <input type="text" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
        }
    };
    return (<div className='space-y-1'><label htmlFor={field.fieldname} className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs uppercase">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}</div>);
});

const ALL_YEAR_COLUMNS = [
    { key: 'first_year_budget', label: 'Year 1 (₹)', type: 'Currency' },
    { key: 'second_year_budget', label: 'Year 2 (₹)', type: 'Currency' },
    { key: 'third_year_budget', label: 'Year 3 (₹)', type: 'Currency' },
    { key: 'fourth_year_budget', label: 'Year 4 (₹)', type: 'Currency' },
    { key: 'fifth_year_budget', label: 'Year 5 (₹)', type: 'Currency' },
] as const;

const MemoizedBudgetTable = memo(({ tableData, onRowChange, onAddRow, onDeleteRow, budgetHeadOptions, activeYearCount = 5 }: any) => {
    const activeYearColumns = ALL_YEAR_COLUMNS.slice(0, activeYearCount);

    const columns = [
        { key: 'account_head', label: 'Account Head', type: 'Select', options: budgetHeadOptions || [] },
        ...activeYearColumns,
        { key: 'row_total', label: 'Total (₹)', type: 'ReadOnly' },
    ];

    const yearKeys = activeYearColumns.map(c => c.key);

    const calculateRowTotal = (row: any) => {
        return yearKeys.reduce((sum, key) => sum + (parseFloat(row[key]) || 0), 0);
    };

    // Calculate totals for each year (column totals)
    const yearTotals = yearKeys.reduce((acc, key) => {
        const yearTotal = (tableData || []).reduce((sum: number, row: any) => sum + (parseFloat(row[key]) || 0), 0);
        return { ...acc, [key]: yearTotal };
    }, {} as Record<string, number>);


    const grandTotal = Object.values(yearTotals).reduce((sum, total) => sum + total, 0);

    return (
        <div>
            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-md">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                        <tr>
                            {[...columns, { key: 'actions', label: '' }].map((c: any) => (
                                <th key={c.key} className="px-3 py-2 font-semibold text-zinc-600 dark:text-zinc-400 text-xs text-left uppercase tracking-wider">{c.label}</th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                        {(tableData || []).map((row: any, i: number) => {
                            const rowTotal = calculateRowTotal(row);
                            return (
                                <tr key={row.id || i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    {columns.map((col: any) => (
                                        <td key={col.key} className="px-2 py-1.5">
                                            {col.type === 'Select' ? (
                                                <select className={`${inputClasses} !h-8 text-xs`}
                                                    value={row[col.key] || ''}
                                                    onChange={e => onRowChange(i, col.key, e.target.value)}>
                                                    <option value="">Select Head...</option>
                                                    {col.options.map((opt: string) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : col.type === 'Currency' ? (
                                                <input type="number" step="0.01" className={`${inputClasses} !h-8 text-xs`}
                                                    value={row[col.key] || ''}
                                                    onChange={e => onRowChange(i, col.key, e.target.value)}
                                                    onWheel={preventScrollChange} />
                                            ) : col.type === 'ReadOnly' ? (
                                                <input readOnly className={`${inputClasses} !h-8 text-xs bg-zinc-100 dark:bg-zinc-700 font-semibold`}
                                                    value={rowTotal.toFixed(2)} />
                                            ) : null}
                                        </td>
                                    ))}
                                    <td className="px-2 py-1.5 text-center">
                                        <FrappeButton onClick={() => onDeleteRow(i)}
                                            className="!py-1 text-xs bg-red-50 border-red-200 hover:bg-red-100 text-red-600">Delete</FrappeButton>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    {/* Footer with Year-wise Totals and Grand Total */}
                    <tfoot className="bg-zinc-50 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 font-semibold text-xs">
                        <tr>
                            <td className="px-3 py-2 text-right">Yearly Totals (₹):</td>
                            {yearKeys.map(key => (
                                <td key={key} className="px-3 py-2">{yearTotals[key]?.toFixed(2) || '0.00'}</td>
                            ))}
                            <td className="px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-sm font-bold text-[#D97757]">{grandTotal.toFixed(2)}</td>
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </div>

            <FrappeButton
                onClick={() => {
                    const newRow: Record<string, any> = { account_head: '' };
                    yearKeys.forEach(key => { newRow[key] = 0; });
                    onAddRow(newRow);
                }}
                className="bg-[#D97757] hover:bg-[#c5684a] text-white border-[#D97757]/20 mt-2">
                Add Budget Row
            </FrappeButton>
        </div>
    );
});

const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
    <NeoSection title={title}>
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50"><tr>{[...columns, { key: 'actions', label: '' }].map((c: any) => (<th key={c.key} className="px-3 py-2 font-semibold text-zinc-600 dark:text-zinc-400 text-xs text-left uppercase tracking-wider">{c.label}</th>))}</tr></thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                    {(tableData || []).map((row: any, i: number) => (
                        <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            {columns.map((col: any) => (<td key={col.key} className="px-2 py-1.5">
                                {col.type === 'Attach' ? (
                                    <input type="file" className={`${inputClasses} !h-8 text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 hover:file:bg-zinc-200`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0] || null)} />
                                ) : (
                                    <input type="text" className={`${inputClasses} !h-8 text-xs`} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)} />
                                )}
                            </td>))}
                            <td className="px-2 py-1.5 text-center"><FrappeButton onClick={() => onDeleteRow(tableName, i)} className="!py-1 text-xs bg-red-50 border-red-200 hover:bg-red-100 text-red-600">Delete</FrappeButton></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <FrappeButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#D97757] hover:bg-[#c5684a] text-white border-[#D97757]/20 mt-2">Add Row</FrappeButton>
    </NeoSection>
));

// --- MAIN COMPONENT ---
const AddFundSanction: React.FC = () => {
    const navigate = useNavigate();
    const { projectName } = useParams<{ projectName: string }>();
    const location = useLocation();
    const [fields, setFields] = useState<Field[]>([]);
    const [formData, setFormData] = useState<FormData>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [budgetHeadOptions, setBudgetHeadOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [projectDisplayLabel, setProjectDisplayLabel] = useState('');
    const [activeYearCount, setActiveYearCount] = useState<number>(
        (location.state as any)?.activeYearCount ?? 2
    );

    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_fund_sanction_form_data');
    const { call: submitForm } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.save_fund_sanction_data');
    const { call: fetchBudgetHeads, result: budgetHeadsResult } = useFrappePostCall('rndopsapp.rndopsapp.doctype.budget_head.budget_head.get_budget_head');

    // Fetch the Project Registration doc directly — this is the authoritative source of proposed_budget_breakup
    const { data: projectDoc } = useFrappeGetDoc(
        'Project Registration',
        projectName ?? '',
        { revalidateOnFocus: false, revalidateOnReconnect: false }
    );

    useEffect(() => {
        if (projectName) {
            fetchFormData({ project_proposal: projectName });
        }
        fetchBudgetHeads({});
    }, [fetchFormData, fetchBudgetHeads, projectName]);

    useEffect(() => {
        if (budgetHeadsResult?.message) {
            const heads = budgetHeadsResult.message.map((item: any) => item.budget_head);
            setBudgetHeadOptions(heads);
        }
    }, [budgetHeadsResult]);


    // Prefill sanctioned_budget_breakup from Project Registration doc once it arrives
    useEffect(() => {
        if (!projectDoc?.proposed_budget_breakup?.length) return;

        // Exclude is_total_row rows — those are computed summary rows, not actual budget head entries
        const sourceRows: any[] = (projectDoc.proposed_budget_breakup as any[]).filter(
            row => !row.is_total_row
        );
        if (!sourceRows.length) return;

        // Derive active year count from the actual data rows (skip total rows)
        const yearKeys = ALL_YEAR_COLUMNS.map(c => c.key);
        let resolvedYearCount: number = (location.state as any)?.activeYearCount ?? 0;
        if (!resolvedYearCount) {
            for (let i = yearKeys.length - 1; i >= 0; i--) {
                const total = sourceRows.reduce((sum, row) => sum + (parseFloat(row[yearKeys[i]]) || 0), 0);
                if (total > 0) { resolvedYearCount = i + 1; break; }
            }
        }
        if (resolvedYearCount < 1) resolvedYearCount = 1;
        setActiveYearCount(resolvedYearCount);

        setFormData(prev => {
            // Don't overwrite if rows already exist (e.g. editing an existing sanction)
            if ((prev.sanctioned_budget_breakup?.length ?? 0) > 0) return prev;

            const inactiveKeys = ALL_YEAR_COLUMNS.slice(resolvedYearCount).map(c => c.key);
            const sanctionedRows = sourceRows.map((row, i) => {
                // account_head is a Data field — copy the value directly
                const newRow: Record<string, any> = { account_head: row.account_head ?? '', id: `prefill-${i}` };
                ALL_YEAR_COLUMNS.forEach(col => { newRow[col.key] = parseFloat(row[col.key]) || 0; });
                inactiveKeys.forEach(k => { newRow[k] = 0; });
                return newRow;
            });
            return { ...prev, sanctioned_budget_breakup: sanctionedRows };
        });
    }, [projectDoc]);

    // Effect to process the fetched data from API
    useEffect(() => {
        if (formDataResult?.message) {
            const { fields, prefill_data, link_options } = formDataResult.message;
            setFields(fields || []);
            setLinkOptions(link_options || {});

            // Auto-select project and build display label
            const initialData = { ...(prefill_data || {}) };
            if (projectName) {
                initialData.project_proposal = projectName;
                initialData.refnum_prj_num = projectName;
            }

            // Build project display label (Project Title / Project Number)
            if (link_options?.project_proposal) {
                const matched = link_options.project_proposal.find((opt: LinkOption) => opt.value === projectName);
                if (matched) {
                    setProjectDisplayLabel(matched.label);
                }
            }
            if (!projectDisplayLabel && prefill_data?.project_title) {
                setProjectDisplayLabel(`${prefill_data.project_title} / ${projectName}`);
            }

            // Derive activeYearCount from proposed_budget_breakup if not explicitly passed via location.state
            // Exclude is_total_row entries from the calculation
            const yearKeys = ALL_YEAR_COLUMNS.map(c => c.key);
            const proposedDataRows: any[] = (initialData.proposed_budget_breakup as any[] ?? []).filter(
                (row: any) => !row.is_total_row
            );
            let resolvedYearCount: number = (location.state as any)?.activeYearCount ?? 0;
            if (!resolvedYearCount && proposedDataRows.length > 0) {
                for (let i = yearKeys.length - 1; i >= 0; i--) {
                    const colTotal = proposedDataRows.reduce(
                        (sum: number, row: any) => sum + (parseFloat(row[yearKeys[i]]) || 0), 0
                    );
                    if (colTotal > 0) { resolvedYearCount = i + 1; break; }
                }
            }
            if (resolvedYearCount < 1) resolvedYearCount = 1;
            setActiveYearCount(resolvedYearCount);

            // Prefill budget breakup from proposed data (fallback — primary path is the projectDoc effect)
            if ((!initialData.sanctioned_budget_breakup || initialData.sanctioned_budget_breakup.length === 0) &&
                proposedDataRows.length > 0) {
                const inactiveKeys = ALL_YEAR_COLUMNS.slice(resolvedYearCount).map(c => c.key);
                initialData.sanctioned_budget_breakup = proposedDataRows.map((row: any, i: number) => {
                    const newRow: Record<string, any> = { account_head: row.account_head ?? '', id: `prefill-${i}` };
                    ALL_YEAR_COLUMNS.forEach(col => { newRow[col.key] = parseFloat(row[col.key]) || 0; });
                    inactiveKeys.forEach(k => { newRow[k] = 0; });
                    return newRow;
                });
            }

            setFormData(initialData);
            setLoading(false);
        }
        if (formDataError) {
            console.error("Failed to load form data:", formDataError);
            alert("Error: Could not load the form.");
            setLoading(false);
        }
    }, [formDataResult, formDataError]);

    // --- FORM & TABLE HANDLERS ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => {
            const newState = { ...prev, [fieldname]: value };
            if (fieldname === 'project_proposal') {
                newState['refnum_prj_num'] = value;
            }
            return newState;
        });
    }, []);

    const handleGenericTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
            return { ...prev, [tableName]: table };
        });
    }, []);

    const handleFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
            return { ...prev, [tableName]: table };
        });
    }, []);

    const addGenericTableRow = useCallback((tableName: string, newRow: object) => {
        const newId = Date.now().toString();
        setFormData(prev => ({
            ...prev,
            [tableName]: [...(prev[tableName] || []), { ...newRow, id: newId }]
        }));
    }, []);

    const deleteGenericTableRow = useCallback((tableName: string, rowIndex: number) => {
        setFormData(prev => ({
            ...prev,
            [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex)
        }));
    }, []);

    // --- FILE HANDLING & SUBMISSION ---
    const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const dataToSubmit: FormData = { ...formData };

            if (dataToSubmit.sanction_related_files && dataToSubmit.sanction_related_files.length > 0) {
                const processedFiles = await Promise.all(
                    dataToSubmit.sanction_related_files.map(async (row: any) => {
                        if (row.sanction_file instanceof File) {
                            const fileObject = row.sanction_file;
                            const base64Data = await toBase64(fileObject);
                            return {
                                ...row,
                                file_name: fileObject.name,
                                file_data: base64Data,
                                sanction_file: undefined,
                            };
                        }
                        return row;
                    })
                );
                dataToSubmit.sanction_related_files = processedFiles;
            }

            console.log("Submitting this payload to Frappe:", dataToSubmit);
            await submitForm(dataToSubmit);

            alert("Fund Sanction submitted successfully!");
            navigate(-1);

        } catch (err: any) {
            console.error("Submission Failed:", err);
            alert(`Submission Failed: ${err.message || 'An unknown server error occurred.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderField = useCallback((fieldname: string, readOnlyOverride = false) => {
        const field = fields.find(f => f.fieldname === fieldname);
        if (!field) return null;
        return <MemoizedFormField key={field.fieldname} field={field} value={formData[field.fieldname]} options={linkOptions[field.fieldname]} onChange={handleChange} readOnlyOverride={readOnlyOverride} />;
    }, [fields, formData, linkOptions, handleChange]);

    if (loading) {
        return (<div className="flex items-center justify-center min-h-screen text-lg font-bold">Loading Form...</div>);
    }

    return (
        <div className="bg-claude-bg dark:bg-zinc-900">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-6 px-5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700">
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Add Fund Sanction</h1>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">For Project: {projectDisplayLabel || formData.refnum_prj_num || projectName}</p>
                        </div>
                    </div>
                </header>

                <form onSubmit={handleSubmit}>
                    <FrappeCard className="space-y-6">
                        <NeoSection title="Project & Sanction Details">
                            {/* Project Registered - Read-only display showing title/number */}
                            <div className="space-y-1">
                                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs uppercase">
                                    Project Registered
                                </label>
                                <input
                                    type="text"
                                    className={`${inputClasses} bg-zinc-100 dark:bg-zinc-800 font-medium`}
                                    readOnly
                                    disabled
                                    value={projectDisplayLabel || formData.project_proposal || projectName || ''}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {renderField('refnum_prj_num', true)}
                                {renderField('total_sanctioned_amount')}
                                {renderField('sanctioned_letter_no')}
                                {renderField('sanctioned_letter_date')}
                            </div>
                        </NeoSection>

                        <NeoSection title="Total Budget Break-up">
                            <MemoizedBudgetTable
                                tableData={formData.sanctioned_budget_breakup}
                                onRowChange={(rowIndex: number, fieldname: string, value: any) =>
                                    handleGenericTableRowChange("sanctioned_budget_breakup", rowIndex, fieldname, value)
                                }
                                onAddRow={(newRow: object) =>
                                    addGenericTableRow("sanctioned_budget_breakup", newRow)
                                }
                                onDeleteRow={(rowIndex: number) =>
                                    deleteGenericTableRow("sanctioned_budget_breakup", rowIndex)
                                }
                                budgetHeadOptions={budgetHeadOptions}
                                activeYearCount={activeYearCount}
                            />
                        </NeoSection>

                        <MemoizedGenericTable
                            title="Upload Sanction Related Files"
                            tableName="sanction_related_files"
                            columns={[
                                { key: 'sanction_file', label: 'File', type: 'Attach' },
                                { key: 'description', label: 'Description', type: 'text' },
                            ]}
                            newRow={{ sanction_file: null, description: '' }}
                            tableData={formData.sanction_related_files}
                            onRowChange={handleGenericTableRowChange}
                            onFileChange={handleFileChange}
                            onAddRow={addGenericTableRow}
                            onDeleteRow={deleteGenericTableRow}
                        />
                    </FrappeCard>

                    {/* Prominent Submit Buttons */}
                    <div className="mt-6 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
                        <div className="flex justify-end gap-3">
                            <FrappeButton
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600"
                            >
                                <Save className="h-4 w-4 mr-1.5 inline-block" />
                                {isSubmitting ? 'Saving...' : 'Save as Draft'}
                            </FrappeButton>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D97757] hover:bg-[#c5684a] text-white font-semibold text-sm rounded-md shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="h-4 w-4" />
                                {isSubmitting ? 'Submitting...' : 'Submit Sanction'}
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default AddFundSanction;