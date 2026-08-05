
// -=-=-=-=-=-=-=-=-=-==-=-=-=

import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AppSidebar } from "../components/RndSidebar";
import { useFrappeGetDoc, useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, Send, Save } from "lucide-react";
import { CharLimitAlert } from '@/components/CharLimitAlert';
import { getFieldMaxLength } from '@/utils/fieldLimits';

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

async function resolveUniqueSanctionLetterNo(
    letterNo: string,
    docname?: string,
): Promise<{ isDuplicate: boolean; finalValue: string; existingDoc: string | null }> {
    const res = await fetch(
        "/api/method/rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.check_sanctioned_letter_no",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
            },
            credentials: "include",
            body: JSON.stringify({ sanctioned_letter_no: letterNo, ...(docname ? { docname } : {}) }),
        },
    );
    const data = await res.json();
    const m = data.message || {};
    if (m.status !== "success") throw new Error(m.message || "Check failed");
    return { isDuplicate: m.is_duplicate, finalValue: m.is_duplicate ? m.suggested : letterNo, existingDoc: m.existing_doc || null };
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const inputClasses = "w-full h-10 px-3 bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-medium text-[#3F3F46] dark:text-[#E4E4E7] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/20 focus:border-[#4A6CF7] disabled:opacity-70 disabled:bg-[#F4F4F5] dark:disabled:bg-zinc-800/40 read-only:bg-[#F4F4F5] dark:read-only:bg-zinc-800/40 transition-colors duration-150";
const FrappeCard = ({ children, className }: any) => (<div className={cn("bg-white dark:bg-[#27272A] p-5 md:p-6 border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm", className)}>{children}</div>);
const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: any) => (<button type={type} onClick={onClick} disabled={disabled} className={cn("h-10 px-4 border rounded-xl font-bold text-[11px] uppercase tracking-wide transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button>);

const NeoSection = ({ title, children }: any) => (
    <div className="space-y-4 rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20">
            <div className="w-1 h-5 rounded-full bg-[#4A6CF7] shrink-0" />
            <h2 className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#1E3A8A] dark:text-blue-200">{title}</h2>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

/** Prevent scroll-wheel from changing number input values */
const preventScrollChange = (e: React.WheelEvent<HTMLInputElement | HTMLSelectElement>) => {
    (e.target as HTMLElement).blur();
};

// --- MEMOIZED CHILD COMPONENTS ---
const MemoizedFormField = memo(({ field, value, options, onChange, readOnlyOverride }: any) => {
    if (!field || field.hidden) return null;
    const isReadOnly = field.read_only || readOnlyOverride;
    const maxLength = getFieldMaxLength(field.fieldtype);
    const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: isReadOnly, required: field.mandatory, disabled: isReadOnly, maxLength, };

    const renderInput = () => {
        switch (field.fieldtype) {
            case "Link": return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(options || []).map((opt: any) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
            case "Date": return <input type="date" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
            case "Currency": return <input type="number" step="0.01" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} onWheel={preventScrollChange} />;
            case "Int": case "Float": return <input type="number" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} onWheel={preventScrollChange} />;
            default: return <input type="text" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
        }
    };
    return (<div className="space-y-1.5"><label htmlFor={field.fieldname} className="inline-flex items-center rounded-md border border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200">{field.label}{field.mandatory && <span className="text-red-500 ml-1 normal-case font-bold">*</span>}</label>{renderInput()}{!isReadOnly && <CharLimitAlert value={value} maxLength={maxLength} />}</div>);
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
        <div className="space-y-2">
            <div className="overflow-x-auto border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl">
                <table className="min-w-full divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                    <thead className="bg-[#EEF2FF] dark:bg-blue-950/20">
                        <tr>
                            {[...columns, { key: 'actions', label: '' }].map((c: any) => (
                                <th key={c.key} className="px-3 py-2.5 text-[10px] font-extrabold text-[#1E3A8A] dark:text-blue-200 text-left uppercase tracking-widest whitespace-nowrap border-r border-[#C7D2FE] dark:border-blue-900/40 last:border-r-0">{c.label}</th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46] bg-white dark:bg-[#27272A]">
                        {(tableData || []).map((row: any, i: number) => {
                            const rowTotal = calculateRowTotal(row);
                            return (
                                <tr key={row.id || i} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-colors">
                                    {columns.map((col: any) => (
                                        <td key={col.key} className="px-2 py-1.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] last:border-r-0">
                                            {col.type === 'Select' ? (
                                                <select className={`${inputClasses} !h-9`}
                                                    value={row[col.key] || ''}
                                                    onChange={e => onRowChange(i, col.key, e.target.value)}>
                                                    <option value="">Select Head...</option>
                                                    {col.options.map((opt: string) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : col.type === 'Currency' ? (
                                                <input type="number" step="0.01" className={`${inputClasses} !h-9`}
                                                    value={row[col.key] || ''}
                                                    onChange={e => onRowChange(i, col.key, e.target.value)}
                                                    onWheel={preventScrollChange} />
                                            ) : col.type === 'ReadOnly' ? (
                                                <input readOnly className={`${inputClasses} !h-9 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-300 font-semibold`}
                                                    value={rowTotal.toFixed(2)} />
                                            ) : null}
                                        </td>
                                    ))}
                                    <td className="px-2 py-1.5 text-center">
                                        <button type="button" onClick={() => onDeleteRow(i)}
                                            className="h-8 px-3 rounded-md text-[11px] font-semibold uppercase tracking-wide text-red-500 border border-zinc-200 dark:border-zinc-700 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 transition-colors">
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    <tfoot className="bg-[#FAFAF9] dark:bg-[#18181B] border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                        <tr>
                            <td className="px-3 py-2.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-100 uppercase tracking-wider text-right">Yearly Totals</td>
                            {yearKeys.map(key => (
                                <td key={key} className="px-3 py-2.5 text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">{yearTotals[key]?.toFixed(2) || '0.00'}</td>
                            ))}
                            <td className="px-3 py-2.5 bg-[#D97757]/10 dark:bg-[#D97757]/15 text-[13px] font-extrabold text-[#D97757]">{grandTotal.toFixed(2)}</td>
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </div>

            <button
                type="button"
                onClick={() => {
                    const newRow: Record<string, any> = { account_head: '' };
                    yearKeys.forEach(key => { newRow[key] = 0; });
                    onAddRow(newRow);
                }}
                className="w-full py-2.5 rounded-md border border-dashed border-[#D97757]/40 text-[11px] font-bold uppercase tracking-wider text-[#D97757] hover:border-[#D97757]/70 hover:bg-[#D97757]/5 dark:hover:bg-[#D97757]/10 transition-colors duration-150">
                + Add Budget Row
            </button>
        </div>
    );
});

const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
    <NeoSection title={title}>
        <div className="space-y-2">
            <div className="overflow-x-auto border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl">
                <table className="min-w-full divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                    <thead className="bg-[#EEF2FF] dark:bg-blue-950/20">
                        <tr>{[...columns, { key: 'actions', label: '' }].map((c: any) => (
                            <th key={c.key} className="px-3 py-2.5 text-[10px] font-extrabold text-[#1E3A8A] dark:text-blue-200 text-left uppercase tracking-widest whitespace-nowrap border-r border-[#C7D2FE] dark:border-blue-900/40 last:border-r-0">{c.label}</th>
                        ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46] bg-white dark:bg-[#27272A]">
                        {(tableData || []).length === 0 ? (
                            <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center">
                                <p className="text-[12px] font-medium text-zinc-400 dark:text-zinc-500">No files added yet</p>
                                <p className="text-[11px] text-zinc-300 dark:text-zinc-600 mt-1">Click "+ Add Row" below to attach files</p>
                            </td></tr>
                        ) : (tableData || []).map((row: any, i: number) => (
                            <tr key={row.id} className="hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors">
                                {columns.map((col: any) => (<td key={col.key} className="px-2 py-1.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] last:border-r-0">
                                    {col.type === 'Attach' ? (
                                        <input type="file" className={`${inputClasses} !h-9 file:mr-2 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:uppercase file:tracking-wide file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-600 dark:file:text-zinc-300 file:rounded`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0] || null)} />
                                    ) : (
                                        <>
                                            <input type="text" className={`${inputClasses} !h-9`} maxLength={140} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)} />
                                            <CharLimitAlert value={row[col.key]} maxLength={140} className="mt-1 text-[10px]" />
                                        </>
                                    )}
                                </td>))}
                                <td className="px-2 py-1.5 text-center">
                                    <button type="button" onClick={() => onDeleteRow(tableName, i)}
                                        className="h-8 px-3 rounded-md text-[11px] font-semibold uppercase tracking-wide text-red-500 border border-zinc-200 dark:border-zinc-700 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 transition-colors">
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button type="button" onClick={() => onAddRow(tableName, newRow)}
                className="w-full py-2.5 rounded-md border border-dashed border-[#D97757]/40 text-[11px] font-bold uppercase tracking-wider text-[#D97757] hover:border-[#D97757]/70 hover:bg-[#D97757]/5 dark:hover:bg-[#D97757]/10 transition-colors duration-150">
                + Add Row
            </button>
        </div>
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
    const [savedDocName, setSavedDocName] = useState<string>(
        (location.state as any)?.sanctionName || (location.state as any)?.docname || ''
    );
    const [savedAsDraft, setSavedAsDraft] = useState(false);
    const [letterNoHint, setLetterNoHint] = useState<{
        status: 'idle' | 'checking' | 'available' | 'duplicate';
        message: string;
    }>({ status: 'idle', message: '' });
    // System-appended tail (e.g. "-1") added when the typed letter no. was a duplicate.
    // Kept separate from the editable base so users can't quietly delete it and
    // resubmit the original duplicate value.
    const [letterNoSuffix, setLetterNoSuffix] = useState('');
    const letterNoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Last non-empty letter no. the user had. If they clear the field entirely
    // (e.g. deleting the base text under a locked suffix), save/submit silently
    // falls back to this instead of sending an empty value.
    const lastValidLetterNoRef = useRef<string>('');

    const budgetGrandTotal = useMemo(() => {
        const yearKeys = ALL_YEAR_COLUMNS.slice(0, activeYearCount).map(c => c.key);
        return (formData.sanctioned_budget_breakup || []).reduce((sum: number, row: any) =>
            sum + yearKeys.reduce((rowSum, key) => rowSum + (parseFloat(row[key]) || 0), 0), 0
        );
    }, [formData.sanctioned_budget_breakup, activeYearCount]);

    const totalSanctioned = parseFloat(formData.total_sanctioned_amount) || 0;
    const isTotalEmpty = !formData.total_sanctioned_amount && formData.total_sanctioned_amount !== 0;
    const isBudgetMismatch = !isTotalEmpty && Math.abs(totalSanctioned - budgetGrandTotal) > 0.01;

    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_fund_sanction_form_data');
    const { call: submitForm } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.save_fund_sanction_data');
    const { call: fetchBudgetHeads, result: budgetHeadsResult } = useFrappePostCall('rndopsapp.rndopsapp.doctype.budget_head.budget_head.get_budget_head');

    const getSavedDocNameFromResponse = (response: any, fallback = ''): string => {
        if (typeof response?.message === 'string') return response.message;
        return response?.message?.docname ||
            response?.message?.name ||
            response?.message?.data?.docname ||
            response?.message?.data?.name ||
            response?.docname ||
            response?.name ||
            fallback;
    };

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
            const existingDocName = initialData.name || initialData.docname || '';
            if (existingDocName) {
                setSavedDocName(existingDocName);
                setSavedAsDraft(true);
            }
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

    // baseValue is what the user typed in the editable box (the locked suffix, if any,
    // is appended separately so it can't be erased by editing/select-all-delete).
    const handleLetterNoChange = useCallback((baseValue: string) => {
        const combined = baseValue + letterNoSuffix;
        handleChange('sanctioned_letter_no', combined);
        setLetterNoHint({ status: 'idle', message: '' });
        if (letterNoTimerRef.current) clearTimeout(letterNoTimerRef.current);
        if (!combined.trim()) return;
        lastValidLetterNoRef.current = combined;
        letterNoTimerRef.current = setTimeout(async () => {
            setLetterNoHint({ status: 'checking', message: 'Checking...' });
            try {
                const r = await resolveUniqueSanctionLetterNo(combined, savedDocName || undefined);
                if (r.isDuplicate) {
                    const newSuffix = r.finalValue.startsWith(combined) && r.finalValue.length > combined.length
                        ? r.finalValue.slice(combined.length)
                        : '';
                    setLetterNoSuffix(newSuffix);
                    handleChange('sanctioned_letter_no', r.finalValue);
                    setLetterNoHint({
                        status: 'duplicate',
                        message: `"${combined}" already used in ${r.existingDoc} — changed to "${r.finalValue}"`,
                    });
                } else {
                    setLetterNoSuffix('');
                    setLetterNoHint({ status: 'available', message: 'Letter number is available' });
                }
            } catch (err: any) {
                setLetterNoHint({ status: 'idle', message: `Could not verify: ${err.message}` });
            }
        }, 500);
    }, [handleChange, savedDocName, letterNoSuffix]);

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

    const preparePayload = async (docNameOverride = savedDocName): Promise<FormData> => {
        const dataToSubmit: FormData = { ...formData };
        if (!dataToSubmit.sanctioned_letter_no?.trim() && lastValidLetterNoRef.current) {
            dataToSubmit.sanctioned_letter_no = lastValidLetterNoRef.current;
        }
        const effectiveDocName = docNameOverride || dataToSubmit.name || dataToSubmit.docname || '';

        if (effectiveDocName) {
            dataToSubmit.name = effectiveDocName;
            dataToSubmit.docname = effectiveDocName;
        }

        if (dataToSubmit.sanction_related_files?.length) {
            const newFiles: any[] = [];
            const existingRows: any[] = [];

            for (const row of dataToSubmit.sanction_related_files) {
                if (row.sanction_file instanceof File) {
                    const fileObj = row.sanction_file as File;
                    const base64Data = await toBase64(fileObj);
                    // Backend reads from files_payload: expects file_name, file_data, description
                    newFiles.push({
                        file_name: fileObj.name,
                        file_data: base64Data,
                        description: row.description || fileObj.name,
                        is_private: 1,
                    });
                } else {
                    // Already-uploaded row (has a URL string in sanction_file)
                    existingRows.push(row);
                }
            }

            dataToSubmit.sanction_related_files = existingRows;
            if (newFiles.length) {
                (dataToSubmit as any).files = newFiles;
            }
        }

        return dataToSubmit;
    };

    const handleSaveDraft = async () => {
        if (isBudgetMismatch) return;
        setIsSubmitting(true);
        try {
            const payload = await preparePayload();
            if (payload.sanctioned_letter_no) {
                try {
                    const r = await resolveUniqueSanctionLetterNo(
                        payload.sanctioned_letter_no,
                        payload.name || payload.docname || undefined,
                    );
                    if (r.isDuplicate) {
                        payload.sanctioned_letter_no = r.finalValue;
                        setFormData(prev => ({ ...prev, sanctioned_letter_no: r.finalValue }));
                        setLetterNoHint({ status: 'duplicate', message: `Letter no was duplicate — saved as "${r.finalValue}"` });
                    }
                } catch { /* non-fatal */ }
            }
            const response = await submitForm({ ...payload, save_mode: 'draft' });
            const docName = getSavedDocNameFromResponse(response, savedDocName || payload.name || payload.docname || '');
            if (docName) {
                setSavedDocName(docName);
                setFormData(prev => ({ ...prev, name: docName, docname: docName }));
            }
            setSavedAsDraft(true);
            alert("Fund Sanction saved as draft!");
        } catch (err: any) {
            console.error("Save Failed:", err);
            alert(`Save Failed: ${err.message || 'An unknown server error occurred.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasLetterNo = !!(formData.sanctioned_letter_no?.trim() || lastValidLetterNoRef.current);

    const handleSubmitSanction = async () => {
        if (isBudgetMismatch || !savedAsDraft || !hasLetterNo) return;
        setIsSubmitting(true);
        try {
            const payload = await preparePayload(savedDocName);
            if (payload.sanctioned_letter_no) {
                try {
                    const r = await resolveUniqueSanctionLetterNo(
                        payload.sanctioned_letter_no,
                        payload.name || payload.docname || undefined,
                    );
                    if (r.isDuplicate) {
                        payload.sanctioned_letter_no = r.finalValue;
                        setFormData(prev => ({ ...prev, sanctioned_letter_no: r.finalValue }));
                    }
                } catch { /* non-fatal */ }
            }
            const response = await submitForm({ ...payload, save_mode: 'submit' });
            const docName = getSavedDocNameFromResponse(response, savedDocName || payload.name || payload.docname || '');
            if (docName) {
                setSavedDocName(docName);
                setFormData(prev => ({ ...prev, name: docName, docname: docName }));
            }
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
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
            <AppSidebar />
            <main className="flex-1 px-6 md:px-8 pt-7 pb-10 w-full overflow-hidden">
                <header className="mb-5 overflow-hidden bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm">
                    <div className="h-1.5 bg-[linear-gradient(to_right,#4A6CF7,#2563EB,#D97757)]" />
                    <div className="p-5 flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="h-10 w-10 flex items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl hover:text-[#D97757] transition-colors">
                            <ArrowLeftIcon className="h-4 w-4" />
                        </button>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97757] mb-1">Fund Sanction</div>
                            <h1 className="text-[22px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-normal">Add Fund Sanction</h1>
                            <p className="text-[13px] text-[#71717A] dark:text-[#A1A1AA] mt-1 font-medium break-words">Project: {projectDisplayLabel || formData.refnum_prj_num || projectName}</p>
                        </div>
                    </div>
                </header>

                <form>
                    <FrappeCard className="space-y-6">
                        <NeoSection title="Project & Sanction Details">
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-100">
                                    Project Registered
                                </label>
                                <input
                                    type="text"
                                    className={`${inputClasses} bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-300`}
                                    readOnly
                                    disabled
                                    value={projectDisplayLabel || formData.project_proposal || projectName || ''}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                                {renderField('refnum_prj_num', true)}
                                {renderField('total_sanctioned_amount')}
                                {(() => {
                                    const field = fields.find(f => f.fieldname === 'sanctioned_letter_no');
                                    if (!field) return null;
                                    const fullValue = formData.sanctioned_letter_no || '';
                                    const baseValue = letterNoSuffix && fullValue.endsWith(letterNoSuffix)
                                        ? fullValue.slice(0, fullValue.length - letterNoSuffix.length)
                                        : fullValue;
                                    return (
                                        <div className="space-y-1.5">
                                            <label htmlFor="sanctioned_letter_no" className="inline-flex items-center rounded-md border border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200">
                                                {field.label}{field.mandatory && <span className="text-red-500 ml-1 normal-case font-bold">*</span>}
                                            </label>
                                            <div className="flex items-stretch">
                                                <input
                                                    id="sanctioned_letter_no"
                                                    type="text"
                                                    className={cn(inputClasses, letterNoSuffix && 'rounded-r-none border-r-0')}
                                                    maxLength={140}
                                                    value={baseValue}
                                                    onChange={e => handleLetterNoChange(e.target.value)}
                                                />
                                                {letterNoSuffix && (
                                                    <span
                                                        title="System-generated to keep this letter number unique. Change the text before it to pick a different number."
                                                        className="flex items-center px-3 h-10 rounded-r-xl border border-l-0 border-[#E4E4E7] dark:border-[#3F3F46] bg-[#F4F4F5] dark:bg-zinc-800/40 text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] select-none whitespace-nowrap"
                                                    >
                                                        {letterNoSuffix}
                                                    </span>
                                                )}
                                            </div>
                                            <CharLimitAlert value={baseValue} maxLength={140} />
                                            {letterNoHint.status !== 'idle' && (
                                                <p className={`text-[11px] mt-1 ${
                                                    letterNoHint.status === 'available' ? 'text-emerald-600 dark:text-emerald-400' :
                                                    letterNoHint.status === 'duplicate' ? 'text-amber-600 dark:text-amber-400' :
                                                    'text-zinc-400 dark:text-zinc-500'
                                                }`}>
                                                    {letterNoHint.status === 'available' && '✓ '}
                                                    {letterNoHint.status === 'duplicate' && '⚠ '}
                                                    {letterNoHint.message}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
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

                        <NeoSection title="Account Details">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="inline-flex items-center rounded-md border border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200">
                                        Is Account Type PFMS?
                                    </label>
                                    <select
                                        className={inputClasses}
                                        value={formData.is_the_account_type_pfms || ''}
                                        onChange={e => handleChange('is_the_account_type_pfms', e.target.value)}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                {formData.is_the_account_type_pfms === 'Yes' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                        <div className="space-y-1.5">
                                            <label className="inline-flex items-center rounded-md border border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200">
                                                Scheme Name
                                            </label>
                                            <input type="text" className={inputClasses} maxLength={140} value={formData.scheme_name || ''} onChange={e => handleChange('scheme_name', e.target.value)} />
                                            <CharLimitAlert value={formData.scheme_name} maxLength={140} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="inline-flex items-center rounded-md border border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200">
                                                Scheme Number
                                            </label>
                                            <input type="text" className={inputClasses} maxLength={140} value={formData.enter_scheme_number || ''} onChange={e => handleChange('enter_scheme_number', e.target.value)} />
                                            <CharLimitAlert value={formData.enter_scheme_number} maxLength={140} />
                                        </div>
                                    </div>
                                )}
                                {formData.is_the_account_type_pfms === 'No' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                        <div className="space-y-1.5">
                                            <label className="inline-flex items-center rounded-md border border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200">
                                                Account Number
                                            </label>
                                            <input type="text" className={inputClasses} maxLength={140} value={formData.account_number || ''} onChange={e => handleChange('account_number', e.target.value)} />
                                            <CharLimitAlert value={formData.account_number} maxLength={140} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="inline-flex items-center rounded-md border border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200">
                                                Bank Name
                                            </label>
                                            <input type="text" className={inputClasses} maxLength={140} value={formData.bank_name || ''} onChange={e => handleChange('bank_name', e.target.value)} />
                                            <CharLimitAlert value={formData.bank_name} maxLength={140} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </NeoSection>
                    </FrappeCard>

                    {/* Missing total warning */}
                    {isTotalEmpty && (
                        <div className="mt-4 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-[12px] text-amber-700 dark:text-amber-400"><span className="font-semibold">Total Sanctioned Amount is required</span> before saving.</p>
                        </div>
                    )}

                    {/* Missing sanction letter no. warning */}
                    {savedAsDraft && !isBudgetMismatch && !hasLetterNo && (
                        <div className="mt-4 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-[12px] text-amber-700 dark:text-amber-400"><span className="font-semibold">Sanctioned Letter No. is required</span> before submitting.</p>
                        </div>
                    )}

                    {/* Budget mismatch warning */}
                    {isBudgetMismatch && (
                        <div className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                            <p className="text-[12px] text-red-600 dark:text-red-400"><span className="font-semibold">Amount mismatch:</span> Total Sanctioned Amount (₹{totalSanctioned.toFixed(2)}) does not equal the Total Budget Break-up (₹{budgetGrandTotal.toFixed(2)}). Please reconcile before saving.</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-5 flex items-center justify-between py-3.5 px-4 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm">
                        {!savedAsDraft && !isBudgetMismatch ? (
                            <p className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-3 py-1.5 rounded-lg">Save as draft first to enable Submit</p>
                        ) : <div />}
                        <div className="flex gap-2.5">
                            <FrappeButton
                                type="button"
                                onClick={handleSaveDraft}
                                disabled={isSubmitting || isTotalEmpty || isBudgetMismatch}
                                className="bg-[#D97757]/10 text-[#D97757] border-[#D97757]/30 hover:bg-[#D97757]/20 hover:border-[#D97757]/50 inline-flex items-center gap-1.5"
                            >
                                <Save className="h-3.5 w-3.5" />
                                {isSubmitting ? 'Saving...' : 'Save as Draft'}
                            </FrappeButton>
                            <FrappeButton
                                type="button"
                                onClick={handleSubmitSanction}
                                disabled={isSubmitting || isBudgetMismatch || !savedAsDraft || !hasLetterNo}
                                className="bg-[#D97757] text-white border-[#D97757] hover:bg-[#c5684a] inline-flex items-center gap-1.5"
                            >
                                <Send className="h-3.5 w-3.5" />
                                {isSubmitting ? 'Submitting...' : 'Submit Sanction'}
                            </FrappeButton>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default AddFundSanction;
