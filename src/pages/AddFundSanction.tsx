
// -=-=-=-=-=-=-=-=-=-==-=-=-=

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../components/RndSidebar";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from "lucide-react";

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
const inputClasses = "w-full h-12 px-4 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] disabled:opacity-70 disabled:bg-zinc-100 dark:bg-zinc-800 read-only:bg-zinc-100 dark:bg-zinc-800";
const FrappeCard = ({ children, className }: any) => (<div className={cn("bg-white dark:bg-zinc-900 p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm", className)}>{children}</div>);
const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: any) => (<button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-lg font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:bg-zinc-50 dark:bg-zinc-800/50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button>);

const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-3">{title}</h2>{children}</div>);

// --- MEMOIZED CHILD COMPONENTS ---
const MemoizedFormField = memo(({ field, value, options, onChange }: any) => {
    if (!field || field.hidden) return null;
    const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only, };

    const renderInput = () => {
        switch (field.fieldtype) {
            case "Link": return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(options || []).map((opt: any) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
            case "Date": return <input type="date" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
            case "Currency": return <input type="number" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
            default: return <input type="text" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
        }
    };
    return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-zinc-900 dark:text-zinc-100 text-lg uppercase">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}</div>);
});

const MemoizedBudgetTable = memo(({ tableData, onRowChange, onAddRow, onDeleteRow, budgetHeadOptions }: any) => {
    const columns = [
        { key: 'account_head', label: 'Account Head', type: 'Select', options: budgetHeadOptions || [] },
        { key: 'first_year_budget', label: 'Year 1 (₹)', type: 'Currency' },
        { key: 'second_year_budget', label: 'Year 2 (₹)', type: 'Currency' },
        { key: 'third_year_budget', label: 'Year 3 (₹)', type: 'Currency' },
        { key: 'fourth_year_budget', label: 'Year 4 (₹)', type: 'Currency' },
        { key: 'fifth_year_budget', label: 'Year 5 (₹)', type: 'Currency' },
        { key: 'row_total', label: 'Total (₹)', type: 'ReadOnly' },
    ];

    const yearKeys = [
        'first_year_budget',
        'second_year_budget',
        'third_year_budget',
        'fourth_year_budget',
        'fifth_year_budget'
    ];

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
                        <tr className="divide-x divide-zinc-100 dark:divide-zinc-800">
                            {[...columns, { key: 'actions', label: '' }].map((c: any) => (
                                <th key={c.key} className="p-3 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left text-sm">{c.label}</th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                        {(tableData || []).map((row: any, i: number) => {
                            const rowTotal = calculateRowTotal(row);
                            return (
                                <tr key={row.id || i} className="divide-x divide-zinc-100 dark:divide-zinc-800">
                                    {columns.map((col: any) => (
                                        <td key={col.key} className="p-2">
                                            {col.type === 'Select' ? (
                                                <select className={`${inputClasses} !h-11`}
                                                    value={row[col.key] || ''}
                                                    onChange={e => onRowChange(i, col.key, e.target.value)}>
                                                    <option value="">Select Head...</option>
                                                    {col.options.map((opt: string) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : col.type === 'Currency' ? (
                                                <input type="number" className={`${inputClasses} !h-11`}
                                                    value={row[col.key] || ''}
                                                    onChange={e => onRowChange(i, col.key, e.target.value)} />
                                            ) : col.type === 'ReadOnly' ? (
                                                <input readOnly className={`${inputClasses} !h-11 bg-zinc-200 dark:bg-zinc-700 font-bold`}
                                                    value={rowTotal.toFixed(2)} />
                                            ) : null}
                                        </td>
                                    ))}
                                    <td className="p-2 text-center">
                                        <FrappeButton onClick={() => onDeleteRow(i)}
                                            className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</FrappeButton>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    {/* Footer with Year-wise Totals and Grand Total */}
                    <tfoot className="bg-zinc-100 dark:bg-zinc-800 border-t-2 border-zinc-300 dark:border-zinc-700 font-bold">
                        <tr className="divide-x divide-zinc-100 dark:divide-zinc-800">
                            <td className="p-3 text-right">Yearly Totals (₹):</td>
                            {yearKeys.map(key => (
                                <td key={key} className="p-3">{yearTotals[key]?.toFixed(2) || '0.00'}</td>
                            ))}
                            <td className="p-3 bg-yellow-200 text-lg">{grandTotal.toFixed(2)}</td>
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </div>

            <FrappeButton
                onClick={() => onAddRow({
                    account_head: '',
                    first_year_budget: 0,
                    second_year_budget: 0,
                    third_year_budget: 0,
                    fourth_year_budget: 0,
                    fifth_year_budget: 0,
                })}
                className="bg-[#D97757] mt-4">
                Add Budget Row
            </FrappeButton>
        </div>
    );
});

const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
    <NeoSection title={title}>
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-md">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50"><tr className="divide-x divide-zinc-100 dark:divide-zinc-800">{[...columns, { key: 'actions', label: '' }].map((c: any) => (<th key={c.key} className="p-3 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left text-sm">{c.label}</th>))}</tr></thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                    {(tableData || []).map((row: any, i: number) => (
                        <tr key={row.id} className="divide-x divide-zinc-100 dark:divide-zinc-800">
                            {columns.map((col: any) => (<td key={col.key} className="p-2">
                                {col.type === 'Attach' ? (
                                    <input type="file" className={`${inputClasses} !h-11 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:font-bold file:bg-stone-200 hover:file:bg-stone-300`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0] || null)} />
                                ) : (
                                    <input type="text" className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)} />
                                )}
                            </td>))}
                            <td className="p-2 text-center"><FrappeButton onClick={() => onDeleteRow(tableName, i)} className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</FrappeButton></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <FrappeButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#D97757] mt-4">Add Row</FrappeButton>
    </NeoSection>
));

// --- MAIN COMPONENT ---
const AddFundSanction: React.FC = () => {
    const navigate = useNavigate();
    const { projectName } = useParams<{ projectName: string }>();

    const [fields, setFields] = useState<Field[]>([]);
    const [formData, setFormData] = useState<FormData>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [budgetHeadOptions, setBudgetHeadOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_fund_sanction_form_data');
    const { call: submitForm } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.save_fund_sanction_data');
    const { call: fetchBudgetHeads, result: budgetHeadsResult } = useFrappePostCall('rndopsapp.rndopsapp.doctype.budget_head.budget_head.get_budget_head');

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


    // Effect to process the fetched data from API
    useEffect(() => {
        if (formDataResult?.message) {
            const { fields, prefill_data, link_options } = formDataResult.message;
            setFields(fields || []);
            setLinkOptions(link_options || {});
            setFormData(prefill_data || {});
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

    const renderField = useCallback((fieldname: string) => {
        const field = fields.find(f => f.fieldname === fieldname);
        if (!field) return null;
        return <MemoizedFormField key={field.fieldname} field={field} value={formData[field.fieldname]} options={linkOptions[field.fieldname]} onChange={handleChange} />;
    }, [fields, formData, linkOptions, handleChange]);

    if (loading) {
        return (<div className="flex items-center justify-center min-h-screen text-lg font-bold">Loading Form...</div>);
    }

    return (
        <div className="bg-claude-bg dark:bg-zinc-900">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-8 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:bg-zinc-800/50 active:translate-y-1 transition-transform">
                            <ArrowLeftIcon className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Add Fund Sanction</h1>
                            <p className="text-zinc-700 dark:text-zinc-300  mt-1">For Project: {formData.refnum_prj_num || projectName}</p>
                        </div>
                    </div>
                </header>

                <form onSubmit={handleSubmit}>
                    <FrappeCard className="space-y-12">
                        <NeoSection title="Project & Sanction Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {renderField('project_proposal')}
                                {renderField('refnum_prj_num')}
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

                    <div className="mt-8 flex justify-end gap-4">
                        {formData.status !== "Draft" ? (
                            <FrappeButton type="submit" disabled={isSubmitting} className="bg-blue-300">
                                {isSubmitting ? 'Saving...' : 'Save as Draft'}
                            </FrappeButton>
                        ) : (
                            <FrappeButton type="submit" disabled={isSubmitting} className="bg-green-400">
                                {isSubmitting ? 'Submitting...' : 'Submit Sanction'}
                            </FrappeButton>
                        )}
                    </div>
                </form>
            </main>
        </div>
    );
};

export default AddFundSanction;