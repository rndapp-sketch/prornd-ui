import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { AppSidebar } from "../components/RndSidebar";
import { useLocation } from 'react-router-dom';

import { useFrappePostCall, useFrappeAuth, useFrappeGetDoc } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { FileText, Users, IndianRupee, Shield, FileBadge, X } from 'lucide-react';
import { EndorsementCertificate, getEndorsementHtml } from '../components/EndorsementCertificate';
import { commonAPI } from '@/services/apiService';
import { AutocompleteEmail } from '../components/AutocompleteEmail';

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string; label: string | null; fieldtype: string; default?: any;
    mandatory: boolean; read_only: boolean; hidden: boolean;
    description?: string | null; options?: string | null;
    depends_on?: string | null;
    mandatory_depends_on?: string | null;
    read_only_depends_on?: string | null;
    depends_on_eval?: string | null;
    mandatory_depends_on_eval?: string | null;
    read_only_depends_on_eval?: string | null;
}
interface LinkOption { value: string; label: string; designation?: string; }
interface FormData {
    [key: string]: any;
    additional_pi_table?: (any & { id?: string })[];
    co_investigator_table?: (any & { id?: string })[];
    proposed_equipment_details?: (any & { id?: string })[];
    proposed_manpower_details?: (any & { id?: string })[];
    proposed_budget_breakup?: ({ head: string; years: (number | string)[]; id?: string })[];
    sanctioned_budget_breakup?: (any & { id?: string })[];
    sanction_related_files?: (any & { id?: string })[];
    fund_transactions?: (any & { id?: string })[];
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const inputClasses = "w-full h-9 px-3 bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-600 rounded-lg font-medium text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] disabled:opacity-70 disabled:bg-zinc-100 dark:bg-zinc-800 read-only:bg-zinc-50 dark:bg-zinc-800/50";
const checkboxClasses = "size-5 shrink-0 appearance-none bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-600 rounded checked:bg-[#D97757] checked:border-[#D97757] checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat cursor-pointer";
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (<div className={cn("bg-white dark:bg-zinc-900 p-5 md:p-6 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm", className)}>{children}</div>);
const FrappeButton = ({ children, onClick, disabled, className, variant = "primary", type = "button" }: { children: React.ReactNode; onClick?: any; disabled?: boolean; className?: string; variant?: "primary" | "secondary" | "danger" | "ghost"; type?: "button" | "submit" }) => {
    const variants = {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        secondary: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm",
        danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50",
        ghost: "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    };
    return (<button type={type} onClick={onClick} disabled={disabled} className={cn("inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed", variants[variant], className)}>{children}</button>);
};

const evaluateDependsOn = (expression: string | null | undefined, doc: any): boolean => {
    if (!expression) return true;
    try {
        // Handle "eval:" prefix if present
        const cleanExpression = expression.startsWith('eval:') ? expression.substring(5) : expression;
        // eslint-disable-next-line no-new-func
        const result = new Function('doc', `return ${cleanExpression}`)(doc);
        // console.log(`Eval '${expression}' -> ${result} (doc.project_type: ${doc.project_type})`);
        return !!result;
    } catch (e) {
        console.warn('Error evaluating depends_on:', expression, e);
        return false; // Default to false (hidden) on error to prevent broken UI
    }
};

// --- MEMOIZED CHILD COMPONENTS ---
const MemoizedFormField = memo(({ field, value, options, onChange, onFileChange }: { field: Field; value: any; options?: LinkOption[]; onChange: (fieldname: string, value: any, type?: string) => void; onFileChange: (fieldname: string, file: File | null) => void; }) => {
    if (!field || field.hidden || !field.label) return null;
    const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only };
    const renderInput = () => {
        switch (field.fieldtype) {
            case "Link":
                if (field.fieldname === 'pi_webmail') {
                    return (
                        <AutocompleteEmail
                            {...commonProps}
                            value={value || ''}
                            onChange={(val) => onChange(field.fieldname, val)}
                            options={options || []}
                        />
                    );
                }
                return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(options || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
            case "Select": return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(field.options?.split('\n').filter(o => o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
            case "Text": case "Small Text": case "Text Editor": return <textarea {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} rows={5} className={`${inputClasses} h-auto py-3`} />;
            case "Check": return (<label className="flex items-center gap-3 font-semibold text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer"><input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => onChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only} /><span>{field.label}{field.mandatory && <span className="text-red-500">*</span>}</span></label>);
            case "Date":
            case "date": // Handle lowercase date type
                return <input type="date" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
            case "Attach": return <input type="file" {...commonProps} className={`${inputClasses} py-0.5 px-2 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300 hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700`} onChange={e => onFileChange(field.fieldname, e.target.files?.[0] || null)} />;
            default: return <input type={(['Int', 'Currency', 'Float', 'Percent'].includes(field.fieldtype)) ? 'number' : 'text'} {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
        }
    };
    if (field.fieldtype === 'Check') {
        return <div className="space-y-2">
            {field.description ? <div className="prose prose-sm max-w-none text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-md p-4 bg-zinc-100 dark:bg-zinc-800" dangerouslySetInnerHTML={{ __html: field.description }} /> : null}
            {renderInput()}
        </div>
    }
    return (<div className='space-y-1.5'><label htmlFor={field.fieldname} className="block font-semibold text-sm text-zinc-700 dark:text-zinc-300">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}{field.description && field.fieldtype !== 'Check' && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{field.description}</p>}</div>);
});

const MemoizedGenericTable = memo(({ tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
    <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
        <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
            <thead className="bg-zinc-50/50 dark:bg-zinc-800/50">
                <tr>
                    {[...columns, { key: 'actions', label: 'Actions', type: 'action' }].map((c: any) => (
                        <th key={c.key} className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-xs text-left uppercase tracking-wider">{c.label}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                {(tableData || []).map((row: any, i: number) => (
                    <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                        {columns.map((col: any) => (<td key={col.key} className="px-4 py-2.5"> {col.type === 'file' ? (<input type="file" className={`${inputClasses} !h-8 !py-1.5 text-xs !border-zinc-200`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0] || null)} />) : (<input type={col.type} className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary focus:!ring-primary/20`} value={row[col.key] || ''} onChange={e => { const value = col.key === 'salary' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value; onRowChange(tableName, i, col.key, value); }} />)} </td>))}
                        <td className="px-4 py-2.5"><FrappeButton variant="danger" onClick={() => onDeleteRow(tableName, i)} className="w-full py-1.5 h-8">Delete</FrappeButton></td>
                    </tr>
                ))}
            </tbody>
        </table>
        <div className="p-3 bg-zinc-50/50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
            <FrappeButton variant="secondary" onClick={() => onAddRow(tableName, newRow)} className="w-full border-dashed">Add Row</FrappeButton>
        </div>
    </div>
));

const MemoizedCollaboratorTable = memo(({ tableName, title, tableData, piOptions, onCollaboratorChange, onRowChange, onAddRow, onDeleteRow }: any) => {
    const prefix = tableName === 'co_investigator_table' ? 'copi' : 'pi';
    const newRow = { [`${prefix}_name`]: '', [`${prefix}_email`]: '', [`${prefix}_designation`]: '', [`${prefix}_address`]: '', [`${prefix}_contact`]: '' };
    return (
        <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">{title}</h3>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
                    <thead className="bg-zinc-50/50 dark:bg-zinc-800/50">
                        <tr>
                            {["Name*", "Email ID*", "Designation*", "Address*", "Contact*", "Actions"].map(h => (
                                <th key={h} className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-xs text-left uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                        {(tableData || []).map((row: any, i: number) => (
                            <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                                <td className="px-4 py-2.5">
                                    <AutocompleteEmail
                                        className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary`}
                                        value={row[`${prefix}_name`] || ''}
                                        onChange={(val) => onCollaboratorChange(tableName, i, val)}
                                        options={piOptions || []}
                                        searchByLabel
                                        placeholder="Enter Name"
                                    />
                                </td>
                                <td className="px-4 py-2.5"><input type="email" readOnly className={`${inputClasses} !h-8 bg-zinc-50/50 !border-zinc-100 text-zinc-600 font-medium text-xs`} value={row[`${prefix}_email`] || ''} /></td>
                                <td className="px-4 py-2.5"><input type="text" readOnly className={`${inputClasses} !h-8 bg-zinc-50/50 !border-zinc-100 text-zinc-600 font-medium text-xs`} value={row[`${prefix}_designation`] || ''} /></td>
                                <td className="px-4 py-2.5"><input type="text" placeholder="Institute/Address" className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary`} value={row[`${prefix}_address`] || ''} onChange={e => onRowChange(tableName, i, `${prefix}_address`, e.target.value)} /></td>
                                <td className="px-4 py-2.5"><input type="tel" placeholder="91XXXXXXXXXX" maxLength={12} className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary`} value={row[`${prefix}_contact`] || ''} onChange={e => onRowChange(tableName, i, `${prefix}_contact`, e.target.value.replace(/[^0-9]/g, ''))} /></td>
                                <td className="px-4 py-2.5"><FrappeButton variant="danger" onClick={() => onDeleteRow(tableName, i)} className="w-full py-1.5 h-8">Delete</FrappeButton></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-3 bg-zinc-50/50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
                    <FrappeButton variant="secondary" onClick={() => onAddRow(tableName, newRow)} className="w-full border-dashed">Add Row</FrappeButton>
                </div>
            </div>
        </div>
    );
});


const MemoizedBudgetTable = memo(({ tableData, budgetYears, budgetHeadOptions, onRowChange, onAddRow, onDeleteRow, onAddYear, onDeleteYear, getYearTotal, totalBudgetAmount }: any) => (
    <div className="space-y-4">
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
                <thead className="bg-zinc-50/50 dark:bg-zinc-800/50">
                    <tr>
                        <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-xs text-left uppercase tracking-wider">Account Head</th>
                        {budgetYears.map((year: number, index: number) => (<th key={index} className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-xs text-left uppercase tracking-wider">Year {year} (₹)</th>))}
                        <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-xs text-left uppercase tracking-wider">Total (₹)</th>
                        <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 text-xs text-left uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {(tableData || []).map((row: any, rowIndex: number) => {
                        const rowTotal = (row.years || []).reduce((sum: number, val: any) => sum + Number(val || 0), 0);
                        return (
                            <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                                <td className="px-4 py-2.5">
                                    <select
                                        className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary`}
                                        value={row.head || ''}
                                        onChange={(e) => onRowChange(rowIndex, 'head', e.target.value)}
                                    >
                                        <option value="">Select Budget Head</option>
                                        {budgetHeadOptions.map((option: any) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                {budgetYears.map((_: any, yearIndex: number) => (<td key={yearIndex} className="px-4 py-2.5"><input type="number" className={`${inputClasses} !h-8 text-xs !border-zinc-200 focus:!border-primary`} value={(row.years || [])[yearIndex] || ''} onChange={(e) => onRowChange(rowIndex, 'years', e.target.value, yearIndex)} /></td>))}
                                <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100 text-right pr-6 text-xs">{rowTotal.toFixed(2)}</td>
                                <td className="px-4 py-2.5"><FrappeButton variant="danger" type="button" className="w-full py-1.5 h-8" onClick={() => onDeleteRow('proposed_budget_breakup', rowIndex)}>Delete</FrappeButton></td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="bg-zinc-50/50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
                    <tr>
                        <th className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100 text-xs">Yearly Total</th>
                        {budgetYears.map((_: any, yearIndex: number) => (<td key={yearIndex} className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-100 text-right pr-6 text-xs">{Number(getYearTotal(yearIndex)).toFixed(2)}</td>))}
                        <td className="px-4 py-3 font-bold text-primary text-right pr-6 text-xs">{totalBudgetAmount.toFixed(2)}</td>
                        <td className="px-4 py-3"></td>
                    </tr>
                </tfoot>
            </table>
            <div className="p-3 bg-zinc-50/50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                <FrappeButton variant="secondary" onClick={onAddYear}>Add Year</FrappeButton>
                <div>
                    {budgetYears.length > 1 && <FrappeButton variant="danger" onClick={onDeleteYear}>Remove Year</FrappeButton>}
                    <FrappeButton variant="secondary" onClick={() => onAddRow('proposed_budget_breakup', { head: '', years: new Array(budgetYears.length).fill(0) })} className="ml-2 border-dashed">Add Row</FrappeButton>
                </div>
            </div>
        </div>
        <div className="mt-6 flex justify-end">
            <div className="w-full md:w-1/3 space-y-2">
                <label className="block text-base font-bold text-zinc-900 dark:text-zinc-100">Grand Total (₹)</label>
                <input type="text" className={`${inputClasses} !h-10 text-lg font-bold bg-claude-bg dark:bg-zinc-900 text-[#D97757]`} readOnly value={totalBudgetAmount.toFixed(2)} />
            </div>
        </div>
    </div>
));


// --- MAIN COMPONENT ---
const ProjectRegistration: React.FC = () => {
    // --- STATE & API HOOKS ---
    const { currentUser } = useFrappeAuth();
    const [activeTab, setActiveTab] = useState(0);
    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [budgetHeadOptions, setBudgetHeadOptions] = useState<LinkOption[]>([]);
    const [formData, setFormData] = useState<FormData>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const location = useLocation();
    const [docname, setDocname] = useState<string | null>(() => {
        const params = new URLSearchParams(location.search);
        return params.get('docname');
    });
    const isApprovedEndorsement = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('isApprovedEndorsement') === 'true';
    }, [location.search]);
    const [budgetYears, setBudgetYears] = useState([1]);
    const [showEndorsementModal, setShowEndorsementModal] = useState(false);
    const [endorsementHtml, setEndorsementHtml] = useState<string>('');

    // Check if endorsement fields are filled
    const isEndorsementEnabled = useMemo(() => {
        // Project Details
        const hasProjectTitle = !!formData.project_title?.trim();
        const hasProjectType = !!formData.project_type;
        const hasDepartment = !!formData.implementation_department;
        const hasDuration = formData.project_type === 'Consultancy'
            ? !!formData.project_duration_days
            : !!formData.project_duration_months;

        // PI Details
        const hasPiWebmail = !!formData.pi_webmail;
        const hasPiName = !!formData.principal_investigator_name?.trim();
        const hasPiDesignation = !!formData.designation?.trim();
        const hasPiEmployeeId = !!formData.pi_employee_id?.trim();
        const hasPiDepartment = !!formData.applicant_department;

        return hasProjectTitle && hasProjectType && hasDepartment && hasDuration &&
            hasPiWebmail && hasPiName && hasPiDesignation && hasPiEmployeeId && hasPiDepartment;
    }, [formData]);

    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_project_form_data');
    const { data: existingDoc } = useFrappeGetDoc('Project Registration', docname ?? '', {
        enabled: !!docname,
    });
    const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_data');
    const { call: saveDraft, result: saveResult, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_draft');
    const { call: saveEndorsementDraft, result: saveEndorsementResult, error: saveEndorsementError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_endorsement_draft');
    const { call: fetchPiDetails } = useFrappePostCall(commonAPI.getUserDetailsByEmail);
    const { call: fetchAgencyDetails, result: agencyDetailsResult } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_funding_agency_details');
    const { call: fetchBudgetHeads, result: budgetHeadsResult } = useFrappePostCall('rndopsapp.rndopsapp.doctype.budget_head.budget_head.get_budget_head');
    const { call: fetchDeptHead } = useFrappePostCall('frappe.client.get_value');


    // --- STABILIZED EVENT HANDLERS & RENDER FUNCTIONS ---
    const handleFileChange = useCallback((fieldname: string, file: File | null) => { setFormData(prev => ({ ...prev, [fieldname]: file })); }, []);

    // --- BUSINESS LOGIC HELPERS ---

    const calculateConsultancy = useCallback((currentData: FormData) => {
        const category = currentData.consultancy_category;
        const gstRate = parseFloat(currentData.consultancy_gst_rate) || 18;
        const updates: Partial<FormData> = {};

        if (!category) return updates;

        // --- LOGIC FOR CATEGORY D (Technology Transfer) ---
        if (category.startsWith("Category D")) {
            const grandTotal = parseFloat(currentData.cat_d_grand_total_input) || 0;
            const cfInput = parseFloat(currentData.cat_d_consultancy_fee_input) || 0; // Gross CF
            const oeInput = parseFloat(currentData.operational_expense_input_inc_10_oh) || 0; // Gross OE

            // 1. Calculate Total Project Cost (Back calculate from Grand Total)
            const totalProjectCost = Math.round(grandTotal / (1 + (gstRate / 100)));
            const gstAmt = grandTotal - totalProjectCost;

            // 2. Breakdown Calculations
            // Institute Share = 20% of Gross CF Input
            const instShare = Math.round(cfInput * 0.20);

            // Overhead = 10% of Gross CF + 10% of Gross OE
            const overheadCf = cfInput * 0.10;
            const overheadOe = oeInput * 0.10;
            const totalOverhead = Math.round(overheadCf + overheadOe);

            // Net CF (Base) = Input - Inst Share - Overhead on CF
            const netCf = Math.round(cfInput - instShare - overheadCf);

            // Net OE (Base) = Input - Overhead on OE
            const netOe = Math.round(oeInput - overheadOe);

            // 3. Validation: CF Check (Consultancy fee should be less than 30% of total project cost)
            const limit = totalProjectCost * 0.30;
            if (totalProjectCost > 0 && cfInput > limit) {
                // We use alert here as we don't have a toast library connected in this context yet
                // console.warn(`Consultancy Fee Input (${cfInput}) exceeds 30% of Total Project Cost (${Math.round(limit)})`);
            }

            // 4. Set Values
            updates.cat_d_project_cost_excl_gst = totalProjectCost;
            updates.cat_d_cf_base = netCf;
            updates.cat_d_oe_base = netOe;
            updates.cat_d_total_overhead = totalOverhead;
            updates.cat_d_institute_share = instShare;
            updates.cat_d_gst_amt = gstAmt;
            updates.cat_d_grand_total_calc = grandTotal;

        }
        // --- LOGIC FOR CATEGORY T (Routine) & E (Non-Routine) ---
        else {
            const te = parseFloat(currentData.cat_ef_total_amount) || 0; // Total Cost Excluding GST
            let honorariumRatio = 0;
            let instituteRatio = 0;

            if (category.includes("Routine") && !category.includes("Non-Routine")) {
                // Category T: 30% Honorarium, 70% Institute
                honorariumRatio = 0.30;
                instituteRatio = 0.70;
            } else if (category.includes("Non-Routine")) {
                // Category E: 70% Honorarium, 30% Institute
                honorariumRatio = 0.70;
                instituteRatio = 0.30;
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

    const calculateParentTotals = useCallback((currentData: FormData) => {
        let total1st = 0, total2nd = 0, total3rd = 0, total4th = 0, total5th = 0;
        let grandTotal = 0;

        (currentData.proposed_budget_breakup || []).forEach((row: any) => {
            const years = row.years || [];
            total1st += parseFloat(years[0] || 0);
            total2nd += parseFloat(years[1] || 0);
            total3rd += parseFloat(years[2] || 0);
            total4th += parseFloat(years[3] || 0);
            total5th += parseFloat(years[4] || 0);
            grandTotal += (years as any[]).reduce((a, b) => a + (parseFloat(b) || 0), 0);
        });

        return {
            total_first_year_budget: total1st,
            total_second_year_budget: total2nd,
            total_third_year_budget: total3rd,
            total_fourth_year_budget: total4th,
            total_fifth_year_budget: total5th,
            grand_total_proposal: grandTotal,
            total_budget_amount: grandTotal
        };
    }, []);

    const calculateEndDate = useCallback((currentData: FormData) => {
        const startDate = currentData.prj_start_date;
        const durationMonths = parseInt(currentData.project_duration_months) || 0;
        const durationDays = parseInt(currentData.project_duration_days) || 0;

        if (!startDate) return null;

        const date = new Date(startDate);
        if (durationMonths > 0) {
            date.setMonth(date.getMonth() + durationMonths);
            date.setDate(date.getDate() - 1); // Subtract 1 day
        } else if (durationDays > 0) {
            date.setDate(date.getDate() + durationDays);
        } else {
            return null;
        }
        return date.toISOString().split('T')[0];
    }, []);

    const controlYearFieldsVisibility = useCallback((durationMonths: number) => {
        const years = durationMonths <= 12 ? 1 : durationMonths <= 24 ? 2 : durationMonths <= 36 ? 3 : durationMonths <= 48 ? 4 : 5;
        // Update fields visibility state
        setFields(prevFields => prevFields.map(field => {
            const totals = ["total_first_year_budget", "total_second_year_budget", "total_third_year_budget", "total_fourth_year_budget", "total_fifth_year_budget"];
            if (totals.includes(field.fieldname)) {
                const yearIndex = totals.indexOf(field.fieldname);
                return { ...field, hidden: (yearIndex + 1) > years };
            }
            return field;
        }));
        // Update budget table years
        setBudgetYears(Array.from({ length: years }, (_, i) => i + 1));
        // Resize budget rows if years reduced (optional, or just handle in render)
        // We'll update the rows in formData to ensure data consistency
        setFormData(prev => {
            const updatedRows = (prev.proposed_budget_breakup || []).map(row => {
                const currentYears = row.years || [];
                // Resize array
                const newYears = Array(years).fill(0).map((_, i) => currentYears[i] || 0);
                return { ...row, years: newYears };
            });
            // Recalculate totals with new years
            // We can call calculateParentTotals here but we need the function reference which is defined above.
            // Ideally we should use a separate effect or just return updates.
            // For simplicity, we just update the structure here.
            return {
                ...prev,
                proposed_budget_breakup: updatedRows
            };
        });
    }, []);

    const updateApproverAndHead = useCallback(async (deptId: string) => {
        if (!deptId) return {};
        try {
            const r = await fetchDeptHead({ doctype: 'Department_prornd', fieldname: 'dept_head', name: deptId });
            if (r?.message?.dept_head) {
                return { department_head: r.message.dept_head, head_approver: r.message.dept_head };
            }
        } catch (e) {
            console.error("Failed to fetch department head", e);
        }
        return {};
    }, [fetchDeptHead]);

    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
        // 1. Update the specific field first
        let updatedData = { ...formData, [fieldname]: value };

        // 2. Run Side Effects based on fieldname
        if (fieldname === 'pi_webmail') {
            if (value) {
                try {
                    const result = await fetchPiDetails({ user_email: value });
                    if (result?.message) {
                        const details = result.message;
                        let departmentLinkValue = "";
                        // Handle both old and new API response structures
                        const deptName = details.department_name || details.department || details.applicant_department;

                        if (deptName && linkOptions["applicant_department"]) {
                            const matchedOption = linkOptions["applicant_department"].find(opt => opt.label === deptName || opt.value === deptName);
                            departmentLinkValue = matchedOption?.value || "";
                        }
                        updatedData = {
                            ...updatedData,
                            pi_userid: value,
                            pi_employee_id: details.employee_id || details.pi_employee_id || "",
                            principal_investigator_name: details.full_name || details.principal_investigator_name || "",
                            designation: details.designation_name || details.designation || "",
                            applicant_department: departmentLinkValue
                        };
                        // Trigger Approver Update for Applicant Dept
                        const approverUpdates = await updateApproverAndHead(departmentLinkValue);
                        updatedData = { ...updatedData, ...approverUpdates };
                    }
                } catch (err) { console.error("Failed to fetch main PI details:", err); }
            } else {
                updatedData = { ...updatedData, pi_userid: "", pi_employee_id: "", principal_investigator_name: "", designation: "", applicant_department: "" };
            }
        }

        if (fieldname === 'funding_agen') {
            if (value) {
                fetchAgencyDetails({ agency_name: value });
            } else {
                // Clear agency details if cleared
                updatedData = {
                    ...updatedData,
                    funding_agency_type: "",
                    origin_of_funding_agency: "",
                    funding_agency_ministry: "",
                    funding_agency_schemes: "",
                    address_street_village_locality: "",
                    address_state: "",
                    address_postal_code: "",
                    address_country: ""
                };
            }
        }

        // Approver Logic for Implementation Dept Change
        if (fieldname === 'implementation_department') {
            const approverUpdates = await updateApproverAndHead(value);
            updatedData = { ...updatedData, ...approverUpdates };
        }

        // 3. Consultancy Calculations
        if ([
            'consultancy_category', 'consultancy_gst_rate',
            'cat_d_grand_total_input', 'cat_d_consultancy_fee_input', 'operational_expense_input_inc_10_oh',
            'cat_ef_total_amount'
        ].includes(fieldname)) {
            const consultancyUpdates = calculateConsultancy(updatedData);
            updatedData = { ...updatedData, ...consultancyUpdates };
        }

        // 4. Project Duration / End Date Logic
        if (['prj_start_date', 'project_duration_months', 'project_duration_days', 'project_type'].includes(fieldname)) {
            const newEndDate = calculateEndDate(updatedData);
            if (newEndDate) updatedData.prj_end_date = newEndDate;

            if (updatedData.project_type === 'Research' && updatedData.project_duration_months) {
                controlYearFieldsVisibility(parseInt(updatedData.project_duration_months) || 0);
            } else if ((updatedData.project_type === 'Consultancy' || updatedData.project_type === 'Testing') && updatedData.project_duration_days) {
                const days = parseInt(updatedData.project_duration_days) || 0;
                controlYearFieldsVisibility(Math.ceil(days / 30));
            }
        }

        setFormData(updatedData);
    }, [formData, fetchPiDetails, fetchAgencyDetails, linkOptions, calculateConsultancy, updateApproverAndHead, calculateEndDate, controlYearFieldsVisibility]);

    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: value }; return { ...prev, [tableName]: t }; }); }, []);
    const handleTableFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: file }; return { ...prev, [tableName]: t }; }); }, []);
    const addTableRow = useCallback((tableName: string, newRow: object) => { const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9); setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName] || []), { ...newRow, id: newId }] })); }, []);
    const deleteTableRow = useCallback((tableName: string, rowIndex: number) => { setFormData(prev => ({ ...prev, [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex) })); }, []);

    const handleCollaboratorChange = useCallback(
        async (tableName: string, rowIndex: number, selectedUserEmail: string) => {
            const user = (linkOptions["pi_webmail"] || []).find(c => c.value === selectedUserEmail);
            const prefix = tableName === "co_investigator_table" ? "copi" : "pi";
            let designation = user?.designation || "";
            let address = "";
            let contact = "";
            if (selectedUserEmail) {
                try {
                    const result = await fetchPiDetails({ user_email: selectedUserEmail });
                    const details = result?.message;
                    if (!designation) {
                        designation = details?.designation_name || details?.designation || "";
                    }
                    address = details?.inst_name_address || details?.copi_address || details?.address || details?.department_name || details?.applicant_department || "";
                    contact = details?.mobile_no || details?.copi_contact || details?.contact_number || details?.cell_phone_number || "";
                } catch (err) { console.error("Failed to fetch collaborator details:", err); }
            }
            setFormData(prev => {
                const t = [...(prev[tableName] || [])];
                t[rowIndex] = {
                    ...t[rowIndex],
                    [`${prefix}_name`]: user?.label || "",
                    [`${prefix}_email`]: user?.value || "",
                    [`${prefix}_designation`]: designation,
                    [`${prefix}_address`]: address,
                    [`${prefix}_contact`]: contact
                };
                return { ...prev, [tableName]: t };
            });
        }, [linkOptions, fetchPiDetails]
    );

    const addBudgetRow = useCallback(() => addTableRow("proposed_budget_breakup", { head: "", years: budgetYears.map(() => "") }), [addTableRow, budgetYears]);
    const addBudgetYear = useCallback(() => { if (budgetYears.length < 5) { setBudgetYears(prev => [...prev, prev.length + 1]); setFormData(prev => ({ ...prev, proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({ ...row, years: [...(row.years || []), ""] })) })); } else { alert("Maximum of 5 years allowed."); } }, [budgetYears]);
    const deleteLastBudgetYear = useCallback(() => { if (budgetYears.length > 1) { setBudgetYears(prev => prev.slice(0, -1)); setFormData(prev => ({ ...prev, proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({ ...row, years: (row.years || []).slice(0, -1) })) })); } }, [budgetYears]);
    const handleBudgetRowChange = useCallback((rowIndex: number, fieldname: string, value: any, yearIndex?: number) => {
        setFormData(prev => {
            const table = [...(prev.proposed_budget_breakup || [])];
            const row = { ...table[rowIndex] } as { head: string; years: (number | string)[] };

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
    }, []);

    const ALWAYS_HIDDEN_FIELDS = ["department_head", "head_approver"];

    const renderField = useCallback((fieldname: string) => {
        const field = fields.find(f => f.fieldname === fieldname);
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

        const effectiveField = { ...field, mandatory: isMandatory, read_only: isReadOnly };
        const options = linkOptions[field.options as string] || linkOptions[fieldname];

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
    }, [fields, formData, linkOptions, handleFieldChangeWithSideEffects, handleFileChange]);

    const renderFields = (fieldnames: string[]) => fieldnames.map(fn => renderField(fn));

    const fileToBase64 = (file: File): Promise<{ filename: string; content: string }> => new Promise((res, rej) => {
        const r = new FileReader();
        r.readAsDataURL(file);
        r.onload = () => res({ filename: file.name, content: r.result as string });
        r.onerror = e => rej(e);
    });

    /**
     * Prepares form data for API submission.
     * Returns { doc_data, files } where files is an array of base64-encoded file objects.
     */
    const prepareDataWithFiles = async (): Promise<{ doc_data: Record<string, any>; files: { filename: string; content: string }[] }> => {
        const data: Record<string, any> = JSON.parse(JSON.stringify(formData));
        const filesArray: { filename: string; content: string }[] = [];

        if (docname) data.name = docname;

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting || isSavingDraft) return;
        setIsSubmitting(true);
        try {
            const { doc_data, files } = await prepareDataWithFiles();
            await submitForm({ doc: doc_data, files });
        } catch (err) {
            alert("File processing error.");
            setIsSubmitting(false);
        }
    };

    const handleSaveDraft = async () => {
        console.log(">>> handleSaveDraft called! isSavingDraft:", isSavingDraft, "isSubmitting:", isSubmitting);
        if (isSavingDraft || isSubmitting) {
            console.log(">>> Early return due to isSavingDraft or isSubmitting");
            return;
        }
        setIsSavingDraft(true);
        try {
            const { doc_data, files } = await prepareDataWithFiles();

            // Generate endorsement HTML content
            const budgetTotal = (formData.proposed_budget_breakup || []).reduce(
                (acc: number, row: any) => acc + (row.years || []).reduce((sum: number, val: any) => sum + Number(val || 0), 0),
                0
            );

            const endorsementHtml = getEndorsementHtml({
                proposalId: docname || "IITG/RND/NEW",
                piName: formData.principal_investigator_name,
                piDesignation: formData.designation,
                piDepartment: formData.applicant_department,
                coPiName: formData.co_investigator_table?.[0]?.copi_name || "",
                coPiDesignation: formData.co_investigator_table?.[0]?.copi_designation || "",
                coPiDepartment: formData.co_investigator_table?.[0]?.copi_department || "",
                projectTitle: formData.project_title,
                fundingAgency: formData.funding_agen,
                duration: formData.project_type === 'Consultancy'
                    ? `${formData.project_duration_days} days`
                    : `${formData.project_duration_months} months`,
                totalCost: String(budgetTotal)
            });

            // Debug logging
            console.log("=== SAVE DRAFT DEBUG ===");
            console.log("doc_data keys:", Object.keys(doc_data));
            console.log("files count:", files.length);
            console.log("html_content length:", endorsementHtml?.length || 0);
            console.log("html_content preview:", endorsementHtml?.substring(0, 200));

            const payload = {
                doc_data: JSON.stringify(doc_data),
                files: files.length > 0 ? files : null,
                html_content: endorsementHtml
            };

            console.log("API Payload keys:", Object.keys(payload));
            console.log("html_content in payload:", payload.html_content ? `${payload.html_content.length} chars` : "MISSING!");

            await saveDraft(payload);
        } catch (err) {
            console.error("Save draft error:", err);
            alert("File processing error.");
            setIsSavingDraft(false);
        }
    };

    // --- DATA FETCHING & INITIALIZATION ---
    useEffect(() => {
        fetchFormData({ docname: docname || undefined });
        fetchBudgetHeads({});
    }, [fetchFormData, fetchBudgetHeads, docname]);

    useEffect(() => {
        if (budgetHeadsResult) {
            const options = budgetHeadsResult.message.map((item: any) => ({ value: item.budget_head, label: item.budget_head, }));
            setBudgetHeadOptions(options);
        }
    }, [budgetHeadsResult]);

    useEffect(() => {
        if (formDataResult?.message?.fields) {
            const { fields: apiFields, link_options, prefill_data } = formDataResult.message;
            setFields(apiFields);

            setLinkOptions(link_options || {});
            const initialFormData = { ...prefill_data };
            apiFields.forEach((field: Field) => {
                if (initialFormData[field.fieldname] === undefined) {
                    initialFormData[field.fieldname] = field.default ?? '';
                }
            });
            setFormData(initialFormData);
            setLoading(false);
            if (prefill_data?.pi_webmail) {
                handleFieldChangeWithSideEffects('pi_webmail', prefill_data.pi_webmail);
            } else if (currentUser) {
                // Auto-select current user if no draft/saved data
                handleFieldChangeWithSideEffects('pi_webmail', currentUser);
            }
        }
        if (formDataError) {
            console.error("❌ Failed to fetch form data:", formDataError);
            alert("Error fetching form data.");
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formDataResult, formDataError, currentUser]);

    // --- SIDE EFFECTS for dependent API calls ---
    useEffect(() => {
        if (existingDoc) {
            const mappedDoc = { ...existingDoc };

            // Map proposed_budget_breakup to include the years array and head
            if (mappedDoc.proposed_budget_breakup && Array.isArray(mappedDoc.proposed_budget_breakup)) {
                mappedDoc.proposed_budget_breakup = mappedDoc.proposed_budget_breakup.map((row: any) => ({
                    ...row,
                    head: row.budget_head || row.account_head || row.head || "",
                    years: [
                        row.first_year || row.year_1 || 0,
                        row.second_year || row.year_2 || 0,
                        row.third_year || row.year_3 || 0,
                        row.fourth_year || row.year_4 || 0,
                        row.fifth_year || row.year_5 || 0
                    ]
                }));
            }

            setFormData(prev => ({ ...prev, ...mappedDoc }));

            // Pre-fill budget years based on duration
            const pType = existingDoc.project_type;
            let durationMonthsToParse = 0;
            if (pType === 'Research') {
                durationMonthsToParse = parseInt(existingDoc.project_duration_months) || 0;
            } else if (pType === 'Consultancy' || pType === 'Testing') {
                const days = parseInt(existingDoc.project_duration_days) || 0;
                durationMonthsToParse = Math.ceil(days / 30);
            }
            if (durationMonthsToParse > 0) {
                // We shouldn't call controlYearFieldsVisibility directly because it modifies 
                // formData which could overwrite our setFormData above. 
                // Let's implement the logic safely here.
                const years = durationMonthsToParse <= 12 ? 1 : durationMonthsToParse <= 24 ? 2 : durationMonthsToParse <= 36 ? 3 : durationMonthsToParse <= 48 ? 4 : 5;
                setBudgetYears(Array.from({ length: years }, (_, i) => i + 1));

                setFields(prevFields => prevFields.map(field => {
                    const totals = ["total_first_year_budget", "total_second_year_budget", "total_third_year_budget", "total_fourth_year_budget", "total_fifth_year_budget"];
                    if (totals.includes(field.fieldname)) {
                        const yearIndex = totals.indexOf(field.fieldname);
                        return { ...field, hidden: (yearIndex + 1) > years };
                    }
                    return field;
                }));
            }
        }
    }, [existingDoc]);

    useEffect(() => {
        if (agencyDetailsResult?.message?.all) {
            const d = agencyDetailsResult.message.all;
            setFormData(prev => ({ ...prev, funding_agency_type: d.funding_agency_type_1, origin_of_funding_agency: d.origin_of_funding_agency, funding_agency_ministry: d.ministry_funding_agency, funding_agency_schemes: d.funding_agency_schemes, address_street_village_locality: d.fundingagency_address, address_state: d.fundingagency_state, address_postal_code: d.fundingagency_postalcode, address_country: d.fundingagency_country }));
        }
    }, [agencyDetailsResult]);

    useEffect(() => { if (submitResult) { alert(`Project registered: ${submitResult.message.docname}`); setDocname(submitResult.message.docname); } if (submitError) alert(`Submission error: ${submitError.message}`); setIsSubmitting(false); }, [submitResult, submitError]);
    useEffect(() => { if (saveResult) { alert(`Draft saved: ${saveResult.message.docname}`); setDocname(saveResult.message.docname); } if (saveError) alert(`Draft save error: ${saveError.message}`); setIsSavingDraft(false); }, [saveResult, saveError]);
    useEffect(() => { if (saveEndorsementResult) { alert(`Endorsement Submitted!`); } if (saveEndorsementError) { alert(`Endorsement save error: ${saveEndorsementError.message}`); } }, [saveEndorsementResult, saveEndorsementError]);

    // --- RENDER LOGIC ---
    if (loading) return (<div className="flex items-center justify-center min-h-screen bg-zinc-100 dark:bg-zinc-800"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE] mx-auto"></div><p className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">LOADING FORM...</p></div></div>);

    const budgetTableData = formData.proposed_budget_breakup || [];
    const totalBudgetAmount = budgetTableData.reduce((acc, row) => acc + (row.years || []).reduce((sum: number, val) => sum + Number(val || 0), 0), 0);
    const getYearTotal = (yearIndex: number) => budgetTableData.reduce((sum: number, row) => sum + Number((row.years || [])[yearIndex] || 0), 0);

    const tabs = [
        { label: "Project Details", icon: FileText },
        { label: "PI & Collaborators", icon: Users },
        { label: "Budget", icon: IndianRupee },
        { label: "Clearance", icon: Shield }
    ];
    const renderNextPrevButtons = (showPrev: boolean, showNext: boolean, isLast = false) => (
        <div className="mt-8 flex justify-between items-center bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm">
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
                    <FrappeButton
                        variant="secondary"
                        onClick={handleSaveDraft}
                        disabled={isSubmitting || isSavingDraft}
                    >
                        {isSavingDraft ? "SAVING..." : "Save As Draft"}
                    </FrappeButton>
                    {isApprovedEndorsement && (
                        <FrappeButton
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting || isSavingDraft}
                        >
                            {isSubmitting ? "REGISTERING..." : "Register Project"}
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
        fundingDetails: ["funding_agen", "funding_agency_other", "funding_agency_schemes", "funding_agency_type", "funding_agency_type_other", "nature_funding_agency_non_govt", "select_funding_agency", "origin_of_funding_agency", "funding_agency_ministry", "fund_agen_initials"],
        agencyAddress: ["address_street_village_locality", "address_state", "address_postal_code", "address_country"],
        piDetails: ["pi_employee_id", "principal_investigator_name", "designation", "applicant_department", "pi_userid"],
        collaboratorToggles: ["is_additional_pi", "has_co_pi"],
        budgetToggles: ["equipment_checkbox", "manpower_checkbox"],
        sanction: ["total_sanctioned_amount", "sanctioned_letter_no", "sanctioned_letter_date"],
        funds: ["is_gst_invoice_issued", "invoice_details", "amount_received", "iitg_bank_account_number"]
    };



    return (
        <div className="bg-zinc-100 dark:bg-zinc-800">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <header className="mb-3">
                    <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight uppercase">New Project Registration</h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1 font-medium text-sm">Fill all sections to register a new project.</p>
                </header>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm">
                    <div className="border-b border-zinc-300 dark:border-zinc-700">
                        <nav className="flex space-x-2 p-2 overflow-x-auto">
                            {tabs.map((tab, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setActiveTab(index)}
                                    className={cn(
                                        "flex-shrink-0 flex items-center gap-2 py-2 px-3 font-medium text-xs rounded-md border border-transparent transition-all",
                                        activeTab === index
                                            ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100"
                                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    <tab.icon className="h-4 w-4" /> {tab.label}
                                </button>
                            ))}
                            {/* Endorsement Button */}
                            {!isApprovedEndorsement && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const budgetTotal = (formData.proposed_budget_breakup || []).reduce(
                                            (acc: number, row: any) => acc + (row.years || []).reduce((sum: number, val: any) => sum + Number(val || 0), 0),
                                            0
                                        );
                                        const initialHtml = getEndorsementHtml({
                                            proposalId: docname || "IITG/RND/NEW",
                                            piName: formData.principal_investigator_name,
                                            piDesignation: formData.designation,
                                            piDepartment: formData.applicant_department,
                                            coPiName: formData.co_investigator_table?.[0]?.copi_name || "",
                                            coPiDesignation: formData.co_investigator_table?.[0]?.copi_designation || "",
                                            coPiDepartment: formData.co_investigator_table?.[0]?.copi_department || "",
                                            projectTitle: formData.project_title,
                                            fundingAgency: formData.funding_agen,
                                            duration: formData.project_type === 'Consultancy'
                                                ? `${formData.project_duration_days} days`
                                                : `${formData.project_duration_months} months`,
                                            totalCost: String(budgetTotal)
                                        });
                                        setEndorsementHtml(initialHtml);
                                        setShowEndorsementModal(true);
                                    }}
                                    disabled={!isEndorsementEnabled}
                                    className={cn(
                                        "flex-shrink-0 flex items-center gap-2 py-2 px-3 font-medium text-xs rounded-md border transition-all ml-auto",
                                        isEndorsementEnabled
                                            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer"
                                            : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 cursor-not-allowed"
                                    )}
                                    title={isEndorsementEnabled ? "Generate Endorsement Certificate" : "Fill all required Project Details and PI Details to enable"}
                                >
                                    <FileBadge className="h-4 w-4" /> Generate Endorsement
                                </button>
                            )}
                        </nav>
                    </div>

                    <div className="bg-zinc-100 dark:bg-zinc-800 p-4 md:p-6">
                        <form id="project-registration-form" onSubmit={handleSubmit}>
                            {fields.length > 0 && <>
                                <div className={activeTab === 0 ? "block" : "hidden"}>
                                    <FrappeCard className="space-y-6">
                                        <h2 className="text-xl font-bold uppercase text-zinc-900 dark:text-zinc-100">1. Project Description</h2>
                                        {renderField("project_no")}
                                        {renderField("project_title")}
                                        {renderField("project_type")}
                                        {formData.project_type === "Research" && (
                                            <div className='space-y-8'>
                                                <FrappeCard className="p-5 space-y-5 !shadow-sm border-zinc-300 dark:border-zinc-700">
                                                    {/* <div className="flex items-center justify-between flex-wrap gap-4">
                                                        <h3 className="text-lg font-bold uppercase text-zinc-900 dark:text-zinc-100">Funding Details</h3>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                window.open(`${import.meta.env.VITE_BASE_PATH || ''}/new-funding-agency`, '_blank');
                                                            }}
                                                            className="text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md shadow-sm transition-colors uppercase tracking-wider"
                                                        >
                                                            Add Funding Agency
                                                        </button>
                                                    </div> */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderFields(tabFieldGroups.fundingDetails)}</div>
                                                </FrappeCard>
                                                <FrappeCard className="p-5 space-y-5 !shadow-sm border-zinc-300 dark:border-zinc-700"><h3 className="text-lg font-bold uppercase text-zinc-900 dark:text-zinc-100">Agency Address</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderFields(tabFieldGroups.agencyAddress)}</div></FrappeCard>
                                            </div>
                                        )}
                                        {formData.project_type === "Consultancy" && (
                                            <div className="space-y-8">
                                                <div className="space-y-4">
                                                    {renderField("consultancy_category")}
                                                    {renderField("consultancy_gstin")}
                                                    {renderField("consultancy_gst_rate")}
                                                    {renderField("involves_international_travel")}

                                                    {/* Category D Fields */}
                                                    {formData.consultancy_category?.startsWith("Category D") && (
                                                        <div className="space-y-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                                            <h4 className="font-bold text-base text-zinc-700 dark:text-zinc-300">Category D Details</h4>
                                                            {renderField("category_d_note")}
                                                            {renderField("cat_d_grand_total_input")}
                                                            {renderField("cat_d_project_cost_excl_gst")}
                                                            {renderField("cat_d_consultancy_fee_input")}
                                                            {renderField("operational_expense_input_inc_10_oh")}
                                                            {renderField("cat_d_cf_base")}
                                                            {renderField("cat_d_oe_base")}
                                                            {renderField("cat_d_total_overhead")}
                                                            {renderField("cat_d_institute_share")}
                                                            {renderField("cat_d_gst_amt")}
                                                            {renderField("cat_d_grand_total_calc")}
                                                        </div>
                                                    )}

                                                    {/* Category T & E Fields */}
                                                    {(!formData.consultancy_category?.startsWith("Category D") && formData.consultancy_category) && (
                                                        <div className="space-y-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                                            <h4 className="font-bold text-base text-zinc-700 dark:text-zinc-300">
                                                                {formData.consultancy_category?.includes("Routine") && !formData.consultancy_category?.includes("Non-Routine") ? "Category T Details" : "Category E Details"}
                                                            </h4>
                                                            {renderField("category_e_note")}
                                                            {renderField("category_t_note")}
                                                            {renderField("cat_ef_total_amount")}
                                                            {renderField("cat_ef_honorarium")}
                                                            {renderField("cat_ef_institute_share")}
                                                            {renderField("cat_ef_gst")}
                                                            {renderField("cat_ef_grand_total")}
                                                        </div>
                                                    )}
                                                </div>
                                                <FrappeCard className="p-5 space-y-5 !shadow-sm border-zinc-300 dark:border-zinc-700">
                                                    {/* <div className="flex items-center justify-between flex-wrap gap-4">
                                                        <h3 className="text-lg font-bold uppercase text-zinc-900 dark:text-zinc-100">Funding Details</h3>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                window.open(`${import.meta.env.VITE_BASE_PATH || ''}/new-funding-agency`, '_blank');
                                                            }}
                                                            className="text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md shadow-sm transition-colors uppercase tracking-wider"
                                                        >
                                                            Add Funding Agency
                                                        </button>
                                                    </div> */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderFields(tabFieldGroups.fundingDetails)}</div>
                                                </FrappeCard>
                                                <FrappeCard className="p-5 space-y-5 !shadow-sm border-zinc-300 dark:border-zinc-700"><h3 className="text-lg font-bold uppercase text-zinc-900 dark:text-zinc-100">Agency Address</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderFields(tabFieldGroups.agencyAddress)}</div></FrappeCard>
                                            </div>
                                        )}
                                        {formData.project_type === "Other" && renderField("other_project_type_name")}
                                        {renderField("implementation_department")}
                                        {renderField("project_objective")}
                                        {renderField("project_deliverables")}
                                        {renderField("executive_summary")}
                                        {renderField("upload_proj_prop")}
                                        {renderField("my_projects")}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{formData.project_type !== "Consultancy" ? renderField("project_duration_months") : renderField("project_duration_days")}</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {renderField("prj_start_date")}
                                            {renderField("prj_end_date")}
                                        </div>
                                    </FrappeCard>
                                    {renderNextPrevButtons(false, true)}
                                </div>

                                <div className={activeTab === 1 ? "block" : "hidden"}>
                                    <FrappeCard className="space-y-6">
                                        <h2 className="text-xl font-bold uppercase text-zinc-900 dark:text-zinc-100">2. Investigators & Collaborators</h2>
                                        <div className="p-5 space-y-5 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm bg-white dark:bg-zinc-900">
                                            <h3 className="text-lg font-bold uppercase text-zinc-900 dark:text-zinc-100">Principal Investigator (PI)</h3>
                                            <div className="space-y-8">
                                                {renderField("pi_webmail")}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-dashed border-zinc-400 dark:border-zinc-600">
                                                    {renderField("principal_investigator_name")}
                                                    {renderField("pi_employee_id")}
                                                    {renderField("designation")}
                                                    {renderField("applicant_department")}
                                                    {renderField("pi_userid")}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-6">{renderFields(tabFieldGroups.collaboratorToggles)}</div>
                                        {formData.is_additional_pi === "Yes" && <MemoizedCollaboratorTable tableName="additional_pi_table" title="Details of Additional PI(s)" tableData={formData.additional_pi_table} piOptions={linkOptions["pi_webmail"]} onCollaboratorChange={handleCollaboratorChange} onRowChange={handleTableRowChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />}
                                        {formData.has_co_pi === "Yes" && <MemoizedCollaboratorTable tableName="co_investigator_table" title="Details of Co-PI(s)" tableData={formData.co_investigator_table} piOptions={linkOptions["pi_webmail"]} onCollaboratorChange={handleCollaboratorChange} onRowChange={handleTableRowChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />}
                                    </FrappeCard>
                                    {renderNextPrevButtons(true, true)}
                                </div>

                                <div className={activeTab === 2 ? "block" : "hidden"}>
                                    <FrappeCard className="space-y-6">
                                        <h2 className="text-xl font-bold uppercase text-zinc-900 dark:text-zinc-100">3. Proposed Budget</h2>
                                        <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Provide a detailed year-wise breakup of the proposed budget.</p>
                                        <MemoizedBudgetTable tableData={budgetTableData} budgetYears={budgetYears} budgetHeadOptions={budgetHeadOptions} onRowChange={handleBudgetRowChange} onAddRow={addBudgetRow} onDeleteRow={deleteTableRow} onAddYear={addBudgetYear} onDeleteYear={deleteLastBudgetYear} getYearTotal={getYearTotal} totalBudgetAmount={totalBudgetAmount} />
                                        <div className="space-y-6 border-t border-zinc-300 dark:border-zinc-700 pt-8">{renderFields(tabFieldGroups.budgetToggles)}</div>
                                        {formData.equipment_checkbox ? (<MemoizedGenericTable tableName={'proposed_equipment_details'} columns={[{ key: 'item_name', label: 'Equipment Name*', type: 'text' }, { key: 'cost', label: 'Cost (₹)', type: 'number' }]} newRow={{ item_name: '', cost: 0 }} tableData={formData.proposed_equipment_details} onRowChange={handleTableRowChange} onFileChange={handleTableFileChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />) : null}
                                        {formData.manpower_checkbox ? (<MemoizedGenericTable tableName={'proposed_manpower_details'} columns={[{ key: 'designation_name', label: 'Position*', type: 'text' }, { key: 'manpower_salary', label: 'Salary (₹)', type: 'number' }]} newRow={{ designation_name: '', manpower_salary: 0 }} tableData={formData.proposed_manpower_details} onRowChange={handleTableRowChange} onFileChange={handleTableFileChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />) : null}
                                    </FrappeCard>
                                    {renderNextPrevButtons(true, true)}
                                </div>
                                <div className={activeTab === 3 ? "block" : "hidden"}>
                                    <FrappeCard className="space-y-6">
                                        <h2 className="text-xl font-bold uppercase text-zinc-900 dark:text-zinc-100">4. Clearance & Declaration</h2>
                                        {renderField("needs_committee_clearance")}
                                        {formData.needs_committee_clearance === "Yes" && (
                                            <div className="space-y-8 pt-8 mt-8 border-t-2 border-dashed border-zinc-400 dark:border-zinc-600">
                                                {renderField("committees")}
                                                {formData.committees === "Other" && renderField("other_committee_specify")}
                                                {formData.committees === "Ethics Committee" && (
                                                    <>
                                                        {renderField("ethics_committee_details")}
                                                        {renderField("ethics_other_details")}
                                                    </>
                                                )}
                                                {formData.committees === "Biosafety Committee" && (
                                                    <>
                                                        {renderField("biosafety_category")}
                                                        {renderField("declaration_html")}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </FrappeCard>
                                    {renderNextPrevButtons(true, true)}
                                </div>
                                <div className={activeTab === 4 ? "block" : "hidden"}>
                                    <FrappeCard className="space-y-10">
                                        <div className="space-y-6">
                                            {renderField("have_sanction_details")}

                                            {formData.have_sanction_details === "Yes" && (
                                                <FrappeCard className="space-y-6 !shadow-sm border-zinc-300 dark:border-zinc-700">
                                                    <h3 className="text-lg font-bold uppercase text-zinc-900 dark:text-zinc-100">Sanction Details</h3>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        {renderFields(tabFieldGroups.sanction)}
                                                    </div>

                                                    <div className="space-y-4">
                                                        <MemoizedGenericTable
                                                            tableName={'sanctioned_budget_breakup'}
                                                            columns={[
                                                                { key: 'head', label: 'Budget Head', type: 'text' },
                                                                { key: 'amount', label: 'Amount (₹)', type: 'number' },
                                                            ]}
                                                            newRow={{ head: '', amount: 0 }}
                                                            tableData={formData.sanctioned_budget_breakup}
                                                            onRowChange={handleTableRowChange}
                                                            onFileChange={handleTableFileChange}
                                                            onAddRow={addTableRow}
                                                            onDeleteRow={deleteTableRow}
                                                        />
                                                    </div>

                                                    <div className="space-y-4">
                                                        <MemoizedGenericTable
                                                            tableName={'sanction_related_files'}
                                                            columns={[{ key: 'file', label: 'File', type: 'file' }]}
                                                            newRow={{ file: null }}
                                                            tableData={formData.sanction_related_files}
                                                            onRowChange={handleTableRowChange}
                                                            onFileChange={handleTableFileChange}
                                                            onAddRow={addTableRow}
                                                            onDeleteRow={deleteTableRow}
                                                        />
                                                    </div>
                                                </FrappeCard>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            {renderField("have_fund_details")}

                                            {formData.have_fund_details === "Yes" && (
                                                <FrappeCard className="space-y-6 !shadow-sm border-zinc-300 dark:border-zinc-700">
                                                    <h3 className="text-lg font-bold uppercase text-zinc-900 dark:text-zinc-100">Fund Details</h3>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        {renderFields(tabFieldGroups.funds)}
                                                    </div>

                                                    <div className="space-y-4">
                                                        <MemoizedGenericTable
                                                            tableName={'fund_transactions'}
                                                            columns={[
                                                                { key: 'installmentNo', label: 'Installment No.', type: 'text' },
                                                                { key: 'dateReceived', label: 'Date Received', type: 'date' },
                                                                { key: 'amount', label: 'Amount (₹)', type: 'number' },
                                                            ]}
                                                            newRow={{ installmentNo: '', dateReceived: '', amount: 0 }}
                                                            tableData={formData.fund_transactions}
                                                            onRowChange={handleTableRowChange}
                                                            onFileChange={handleTableFileChange}
                                                            onAddRow={addTableRow}
                                                            onDeleteRow={deleteTableRow}
                                                        />
                                                    </div>
                                                </FrappeCard>
                                            )}
                                        </div>

                                        {/* 🟢 Instruction after saving */}
                                        <div className="p-4 mt-6 border-l-4 border-green-600 bg-green-50 text-green-900 rounded-md shadow-sm font-bold">
                                            💡 <strong>Next Step:</strong> After saving this project draft, go to the <strong>Project View</strong> page,
                                            open your specific project, and then click <strong>Submit</strong> to proceed.
                                        </div>
                                    </FrappeCard>

                                    {renderNextPrevButtons(true, false, true)}
                                </div>
                            </>}
                        </form>
                    </div>
                </div>

                {/* Endorsement Certificate Modal */}
                {showEndorsementModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8">
                        <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-2xl max-w-[240mm] w-full mx-4 border border-zinc-400 dark:border-zinc-600">
                            {/* Modal Header */}
                            <div className="bg-white dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Endorsement Certificate</h2>
                                <button
                                    onClick={() => setShowEndorsementModal(false)}
                                    className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors"
                                    title="Close"
                                >
                                    <X className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                                </button>
                            </div>
                            {/* Modal Body */}
                            <div className="p-0">
                                <EndorsementCertificate
                                    proposalId={docname || "IITG/RND/NEW"}
                                    piName={formData.principal_investigator_name}
                                    piDesignation={formData.designation}
                                    piDepartment={formData.applicant_department}
                                    coPiName={formData.co_investigator_table?.[0]?.copi_name || ""}
                                    coPiDesignation={formData.co_investigator_table?.[0]?.copi_designation || ""}
                                    coPiDepartment={formData.co_investigator_table?.[0]?.copi_department || ""}
                                    projectTitle={formData.project_title}
                                    fundingAgency={formData.funding_agen}
                                    duration={formData.project_type === 'Consultancy'
                                        ? `${formData.project_duration_days} days`
                                        : `${formData.project_duration_months} months`}
                                    totalCost={String(budgetTableData.reduce((acc: number, row: any) => acc + (row.years || []).reduce((sum: number, val: any) => sum + Number(val || 0), 0), 0))}
                                    onHtmlChange={setEndorsementHtml}
                                />
                            </div>
                            {/* Modal Footer */}
                            <div className="bg-white dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-700 px-6 py-4 flex items-center justify-end rounded-b-lg">
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={async () => {
                                        setIsSubmitting(true);
                                        try {
                                            const { doc_data, files } = await prepareDataWithFiles();
                                            // Generate fresh full HTML using the standalone function
                                            // (avoids DOM innerHTML stripping structural tags)
                                            const budgetTotal = (formData.proposed_budget_breakup || []).reduce(
                                                (acc: number, row: any) => acc + (row.years || []).reduce((sum: number, val: any) => sum + Number(val || 0), 0),
                                                0
                                            );
                                            const fullHtml = getEndorsementHtml({
                                                proposalId: docname || "IITG/RND/NEW",
                                                piName: formData.principal_investigator_name,
                                                piDesignation: formData.designation,
                                                piDepartment: formData.applicant_department,
                                                coPiName: formData.co_investigator_table?.[0]?.copi_name || "",
                                                coPiDesignation: formData.co_investigator_table?.[0]?.copi_designation || "",
                                                coPiDepartment: formData.co_investigator_table?.[0]?.copi_department || "",
                                                projectTitle: formData.project_title,
                                                fundingAgency: formData.funding_agen,
                                                duration: formData.project_type === 'Consultancy'
                                                    ? `${formData.project_duration_days} days`
                                                    : `${formData.project_duration_months} months`,
                                                totalCost: String(budgetTotal),
                                                bodyHtml: endorsementHtml || undefined, // inject edited body content
                                            });
                                            console.log('=== ENDORSEMENT SUBMIT DEBUG ===');
                                            console.log('Full HTML length:', fullHtml.length);
                                            console.log('Starts with DOCTYPE:', fullHtml.trimStart().startsWith('<!DOCTYPE'));
                                            await saveEndorsementDraft({
                                                doc_data: JSON.stringify(doc_data),
                                                html_content: fullHtml,
                                                files: files.length > 0 ? files : null,
                                                endorsement: 1
                                            });
                                            setShowEndorsementModal(false);
                                        } catch (err) {
                                            alert('Error processing endorsement.');
                                        } finally {
                                            setIsSubmitting(false);
                                        }
                                    }}
                                    className="px-6 py-3 rounded-md font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProjectRegistration;
