import React, { useState, useEffect, useCallback, memo } from 'react';
import { AppSidebar } from "../components/RndSidebar";
import { useNavigate } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { FileText, Users, IndianRupee, Shield } from 'lucide-react';
import { AutocompleteEmail } from '../components/AutocompleteEmail';
import { CharLimitAlert } from '@/components/CharLimitAlert';
import { getFieldMaxLength } from '@/utils/fieldLimits';
import { ErrorModal } from "../components/ErrorModal";
import { parseFrappeError } from "../utils/errorUtils";

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string; label: string | null; fieldtype: string; default?: any;
    mandatory: boolean; read_only: boolean; hidden: boolean;
    description?: string | null; options?: string | null;
}
interface LinkOption { value: string; label: string; designation?: string; }
interface FormData {
    [key: string]: any;
    additional_pi_table?: (any & { id?: string })[];
    co_investigator_table?: (any & { id?: string })[];
    proposed_equipment_details?: (any & { id?: string })[];
    proposed_manpower_details?: (any & { id?: string })[];
    proposed_budget_breakup?: ({ account_head: string; years: (number | string)[]; id?: string })[];
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const inputClasses = "w-full h-12 px-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl  shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] disabled:opacity-70 disabled:bg-zinc-200 dark:bg-zinc-700 read-only:bg-zinc-200 dark:bg-zinc-700";
const checkboxClasses = "size-6 shrink-0 appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-sm checked:bg-[#D97757] checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat";
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (<div className={cn("bg-white dark:bg-zinc-900 p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm", className)}>{children}</div>);
const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => (<button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl font-semibold text-zinc-900 dark:text-zinc-100 shadow-sm transition-all hover:shadow-sm   disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-zinc-300 dark:bg-zinc-600", className)}>{children}</button>);

// --- MEMOIZED CHILD COMPONENTS ---
const MemoizedFormField = memo(({ field, value, options, onChange, onFileChange }: { field: Field; value: any; options?: LinkOption[]; onChange: (fieldname: string, value: any, type?: string) => void; onFileChange: (fieldname: string, file: File | null) => void; }) => {
    if (!field || field.hidden || !field.label) return null;
    const maxLength = getFieldMaxLength(field.fieldtype);
    const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only, maxLength };
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
            case "Check": return (<label className="flex items-center gap-4 font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"><input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => onChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only} /><span>{field.label}{!!field.mandatory && <span className="text-red-500">*</span>}</span></label>);
            case "Date": return <input type="date" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
            case "Attach": return <input type="file" {...commonProps} className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-[#D97757] text-white hover:bg-[#D97757] file:text-zinc-900 dark:text-zinc-100 hover:file:bg-[#8BC34A]`} onChange={e => onFileChange(field.fieldname, e.target.files?.[0] || null)} />;
            default: return <input type={(['Int', 'Currency', 'Float', 'Percent'].includes(field.fieldtype)) ? 'number' : 'text'} {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
        }
    };
    if (field.fieldtype === 'Check') {
        return <div className="space-y-2">
            {field.description ? <div className="prose prose-sm max-w-none  text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-100 dark:bg-zinc-800" dangerouslySetInnerHTML={{ __html: field.description }} /> : null}
            {renderInput()}
        </div>
    }
    return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-medium text-zinc-700 dark:text-zinc-300">{field.label}{!!field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}{!field.read_only && <CharLimitAlert value={value} maxLength={maxLength} />}{field.description && field.fieldtype !== 'Check' && <p className="text-sm text-zinc-700 dark:text-zinc-300  mt-2">{field.description}</p>}</div>);
});

const MemoizedGenericTable = memo(({ tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
    <div>
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50"><tr className="divide-x divide-zinc-200 dark:divide-zinc-800">{[...columns, { key: 'actions', label: 'Actions', type: 'action' }].map((c: any) => (<th key={c.key} className="p-3 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left">{c.label}</th>))}</tr></thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                    {(tableData || []).map((row: any, i: number) => (
                        <tr key={row.id} className="divide-x divide-zinc-200 dark:divide-zinc-800">
                            {columns.map((col: any) => (<td key={col.key} className="p-2"> {col.type === 'file' ? (<input type="file" className={`${inputClasses} !h-11 !py-2`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0] || null)} />) : (<>
                                <input type={col.type} className={`${inputClasses} !h-11`} maxLength={col.type === 'text' ? 140 : undefined} value={row[col.key] || ''} onChange={e => { const value = col.key === 'salary' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value; onRowChange(tableName, i, col.key, value); }} />
                                {col.type === 'text' && <CharLimitAlert value={row[col.key]} maxLength={140} className="mt-1 text-[10px]" />}
                            </>)} </td>))}
                            <td className="p-2"><FrappeButton onClick={() => onDeleteRow(tableName, i)} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 w-full text-sm !py-2">Delete</FrappeButton></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <FrappeButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#D97757] text-white hover:bg-[#D97757] mt-4">Add Row</FrappeButton>
    </div>
));

const MemoizedCollaboratorTable = memo(({ tableName, title, tableData, piOptions, onCollaboratorChange, onRowChange, onAddRow, onDeleteRow }: any) => {
    const prefix = tableName === 'co_investigator_table' ? 'copi' : 'pi';
    const newRow = { [`${prefix}_name`]: '', [`${prefix}_email`]: '', [`${prefix}_designation`]: '', [`${prefix}_address`]: '', [`${prefix}_contact`]: '' };
    return (
        <div>
            <h3 className="text-2xl font-bold  text-zinc-900 dark:text-zinc-100 mb-4">{title}</h3>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50"><tr className="divide-x divide-zinc-200 dark:divide-zinc-800">{["Name*", "Email ID*", "Designation*", "Address*", "Contact*", "Actions"].map(h => (<th key={h} className="p-3 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left">{h}</th>))}</tr></thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                        {(tableData || []).map((row: any, i: number) => (
                            <tr key={row.id} className="divide-x divide-zinc-200 dark:divide-zinc-800">
                                <td className="p-2">
                                    <AutocompleteEmail
                                        className={`${inputClasses} !h-11`}
                                        value={row[`${prefix}_email`] || ''}
                                        onChange={(val) => onCollaboratorChange(tableName, i, val)}
                                        options={piOptions || []}
                                    />
                                </td>
                                <td className="p-2"><input type="email" readOnly className={`${inputClasses} !h-11 bg-zinc-200 dark:bg-zinc-700`} value={row[`${prefix}_email`] || ''} /></td>
                                <td className="p-2"><input type="text" readOnly className={`${inputClasses} !h-11 bg-zinc-200 dark:bg-zinc-700`} value={row[`${prefix}_designation`] || ''} /></td>
                                <td className="p-2">
                                    <input type="text" placeholder="Institute/Address" maxLength={140} className={`${inputClasses} !h-11`} value={row[`${prefix}_address`] || ''} onChange={e => onRowChange(tableName, i, `${prefix}_address`, e.target.value)} />
                                    <CharLimitAlert value={row[`${prefix}_address`]} maxLength={140} className="mt-1 text-[10px]" />
                                </td>
                                <td className="p-2"><input type="tel" placeholder="91XXXXXXXXXX" maxLength={12} className={`${inputClasses} !h-11`} value={row[`${prefix}_contact`] || ''} onChange={e => onRowChange(tableName, i, `${prefix}_contact`, e.target.value.replace(/[^0-9]/g, ''))} /></td>
                                <td className="p-2"><FrappeButton onClick={() => onDeleteRow(tableName, i)} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 w-full text-sm !py-2">Delete</FrappeButton></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <FrappeButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#D97757] text-white hover:bg-[#D97757] mt-4">Add Collaborator</FrappeButton>
        </div>
    );
});


const MemoizedBudgetTable = memo(({ tableData, budgetYears, budgetHeadOptions, onRowChange, onAddRow, onDeleteRow, onAddYear, onDeleteYear, getYearTotal, totalBudgetAmount }: any) => (
    <div className="space-y-4">
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr className="divide-x divide-zinc-200 dark:divide-zinc-800">
                        <th className="p-3 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left">Account Head</th>
                        {budgetYears.map((year: number, index: number) => (<th key={index} className="p-3 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left">Year {year} (₹)</th>))}
                        <th className="p-3 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left">Total (₹)</th>
                        <th className="p-3 font-semibold text-zinc-700 dark:text-zinc-300 text-sm text-left">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                    {(tableData || []).map((row: any, rowIndex: number) => {
                        const rowTotal = (row.years || []).reduce((sum: number, val: any) => sum + Number(val || 0), 0);
                        return (
                            <tr key={row.id} className="divide-x divide-zinc-200 dark:divide-zinc-800">
                                <td className="p-2">
                                    <select
                                        className={`${inputClasses} !h-11`}
                                        value={row.account_head || ''}
                                        onChange={(e) => onRowChange(rowIndex, 'account_head', e.target.value)}
                                    >
                                        <option value="">Select Budget Head</option>
                                        {budgetHeadOptions.map((option: any) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                {budgetYears.map((_: any, yearIndex: number) => (<td key={yearIndex} className="p-2"><input type="number" className={`${inputClasses} !h-11`} value={(row.years || [])[yearIndex] || ''} onChange={(e) => onRowChange(rowIndex, 'years', e.target.value, yearIndex)} /></td>))}
                                <td className="p-2  font-bold text-right pr-4">{rowTotal.toFixed(2)}</td>
                                <td className="p-2"><FrappeButton type="button" className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 w-full !py-2 text-sm" onClick={() => onDeleteRow('proposed_budget_breakup', rowIndex)}>Delete</FrappeButton></td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="bg-zinc-200 dark:bg-zinc-700 border-t border-zinc-200 dark:border-zinc-800">
                    <tr className="divide-x divide-zinc-200 dark:divide-zinc-800">
                        <th className="p-3 text-right font-semibold text-zinc-900 dark:text-zinc-100 ">Yearly Total</th>
                        {budgetYears.map((_: any, yearIndex: number) => (<td key={yearIndex} className="p-3 font-semibold text-zinc-900 dark:text-zinc-100  text-right pr-4">{Number(getYearTotal(yearIndex)).toFixed(2)}</td>))}
                        <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100  bg-zinc-300 dark:bg-zinc-600 text-right pr-4">{totalBudgetAmount.toFixed(2)}</td>
                        <td className="p-3"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div className="flex flex-wrap gap-4">
            <FrappeButton type="button" className="bg-[#D97757] text-white hover:bg-[#D97757]" onClick={onAddRow}>Add Budget Row</FrappeButton>
            <FrappeButton type="button" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700" onClick={onAddYear} disabled={budgetYears.length >= 5}>Add Year</FrappeButton>
            <FrappeButton type="button" className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200" onClick={onDeleteYear}>Delete Last Year</FrappeButton>
        </div>
        <div className="mt-6 flex justify-end">
            <div className="w-full md:w-1/3 space-y-2">
                <label className="block text-xl font-semibold text-zinc-900 dark:text-zinc-100">Grand Total (₹)</label>
                <input type="text" className={`${inputClasses} text-xl font-bold bg-zinc-200 dark:bg-zinc-700`} readOnly value={totalBudgetAmount.toFixed(2)} />
            </div>
        </div>
    </div>
));


// --- MAIN COMPONENT ---
const ProjectProposal: React.FC = () => {
    const navigate = useNavigate();
    // --- STATE & API HOOKS ---
    const [activeTab, setActiveTab] = useState(0);
    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [budgetHeadOptions, setBudgetHeadOptions] = useState<LinkOption[]>([]);
    const [formData, setFormData] = useState<FormData>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [docname, setDocname] = useState<string | null>(null);
    const [budgetYears, setBudgetYears] = useState([1]);
    const [isDraftSaved, setIsDraftSaved] = useState(false);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });

    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_proposal.project_proposal.get_project_proposal_fields');
    const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_proposal.project_proposal.submit_project_proposal'); // Assumed endpoint
    const { call: saveDraft, result: saveResult, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_proposal.project_proposal.save_project_proposal'); // Assumed endpoint
    const { call: fetchPiDetails } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi'); // Reusing existing endpoint
    const { call: fetchAgencyDetails, result: agencyDetailsResult } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_funding_agency_details'); // Reusing existing endpoint
    const { call: fetchBudgetHeads, result: budgetHeadsResult } = useFrappePostCall('rndopsapp.rndopsapp.doctype.budget_head.budget_head.get_budget_head');

    // --- DATA FETCHING & INITIALIZATION ---
    useEffect(() => {
        fetchFormData({});
        fetchBudgetHeads({});
    }, [fetchFormData, fetchBudgetHeads]);

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
            }
        }
        if (formDataError) {
            console.error("❌ Failed to fetch form data:", formDataError);
            alert("Error fetching form data.");
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formDataResult, formDataError]);

    // --- SIDE EFFECTS for dependent API calls ---
    useEffect(() => {
        if (agencyDetailsResult?.message?.all) {
            const d = agencyDetailsResult.message.all;
            setFormData(prev => ({ ...prev, funding_agency_type: d.funding_agency_type_1, origin_of_funding_agency: d.origin_of_funding_agency, funding_agency_ministry: d.ministry_funding_agency, funding_agency_schemes: d.funding_agency_schemes, address_street_village_locality: d.fundingagency_address, address_state: d.fundingagency_state, address_postal_code: d.fundingagency_postalcode, address_country: d.fundingagency_country }));
        }
    }, [agencyDetailsResult]);

    useEffect(() => { if (submitResult) { alert(`Project Proposal registered: ${submitResult.message.docname}`); setDocname(submitResult.message.docname); } if (submitError) setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(submitError) }); setIsSubmitting(false); }, [submitResult, submitError]);
    useEffect(() => { if (saveResult) { alert(`Draft saved: ${saveResult.message.docname}`); setDocname(saveResult.message.docname); setIsDraftSaved(true); } if (saveError) setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(saveError) }); setIsSavingDraft(false); }, [saveResult, saveError]);

    // --- STABILIZED EVENT HANDLERS & RENDER FUNCTIONS ---
    const handleChange = useCallback((fieldname: string, value: any, type?: string) => { setFormData(prev => ({ ...prev, [fieldname]: type === 'checkbox' ? (value ? 1 : 0) : value })); }, []);
    const handleFileChange = useCallback((fieldname: string, file: File | null) => { setFormData(prev => ({ ...prev, [fieldname]: file })); }, []);

    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
        handleChange(fieldname, value);
        if (fieldname === 'pi_webmail') {
            if (value) {
                try {
                    const result = await fetchPiDetails({ user_email: value });
                    if (result?.message) {
                        const details = result.message;
                        let departmentLinkValue = "";
                        if (details.applicant_department && linkOptions["applicant_department"]) {
                            const matchedOption = linkOptions["applicant_department"].find(opt => opt.label === details.applicant_department || opt.value === details.applicant_department);
                            departmentLinkValue = matchedOption?.value || "";
                        }
                        setFormData(prev => ({
                            ...prev,
                            pi_userid: value,
                            pi_employee_id: details.pi_employee_id || "",
                            principal_investigator_name: details.principal_investigator_name || "",
                            designation: details.designation || "",
                            applicant_department: departmentLinkValue
                        }));
                    }
                } catch (err) { console.error("Failed to fetch main PI details:", err); }
            } else {
                setFormData(prev => ({ ...prev, pi_userid: "", pi_employee_id: "", principal_investigator_name: "", designation: "", applicant_department: "" }));
            }
        }
        if (fieldname === 'funding_agen' && value) {
            fetchAgencyDetails({ agency_name: value });
        }
    }, [handleChange, fetchPiDetails, fetchAgencyDetails, linkOptions]);

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

    const addBudgetRow = useCallback(() => addTableRow("proposed_budget_breakup", { account_head: "", years: budgetYears.map(() => "") }), [addTableRow, budgetYears]);
    const addBudgetYear = useCallback(() => { if (budgetYears.length < 5) { setBudgetYears(prev => [...prev, prev.length + 1]); setFormData(prev => ({ ...prev, proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({ ...row, years: [...(row.years || []), ""] })) })); } else { alert("Maximum of 5 years allowed."); } }, [budgetYears]);
    const deleteLastBudgetYear = useCallback(() => { if (budgetYears.length > 1) { setBudgetYears(prev => prev.slice(0, -1)); setFormData(prev => ({ ...prev, proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({ ...row, years: (row.years || []).slice(0, -1) })) })); } }, [budgetYears]);
    const handleBudgetRowChange = useCallback((rowIndex: number, fieldname: string, value: any, yearIndex?: number) => {
        setFormData(prev => {
            const table = [...(prev.proposed_budget_breakup || [])];
            const row = { ...table[rowIndex] } as { account_head: string; years: (number | string)[] };

            if (fieldname === "years" && yearIndex !== undefined) {
                const years = [...(row.years || [])];
                years[yearIndex] = value;
                row.years = years;
            } else if (fieldname === "account_head") {
                row.account_head = value;
            }

            table[rowIndex] = row;
            return { ...prev, proposed_budget_breakup: table };
        });
    }, []);

    const ALWAYS_HIDDEN_FIELDS = ["department_head", "head_approver"];

    const renderField = useCallback((fieldname: string) => {
        const field = fields.find(f => f.fieldname === fieldname);
        if (!field || ALWAYS_HIDDEN_FIELDS.includes(fieldname)) return null;
        const options = linkOptions[field.options as string] || linkOptions[fieldname];
        return (
            <MemoizedFormField
                key={field.fieldname}
                field={field}
                value={formData[fieldname]}
                options={options}
                onChange={handleFieldChangeWithSideEffects}
                onFileChange={handleFileChange}
            />
        );
    }, [fields, formData, linkOptions, handleFieldChangeWithSideEffects, handleFileChange]);

    const renderFields = (fieldnames: string[]) => fieldnames.map(fn => renderField(fn));

    const fileToBase64 = (file: File): Promise<{ file_name: string; file_data: string }> => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => res({ file_name: file.name, file_data: r.result as string }); r.onerror = e => rej(e); });
    const prepareDataForApi = async () => { const data = JSON.parse(JSON.stringify(formData)); if (docname) data.name = docname; for (const k in formData) { const v = formData[k]; if (v instanceof File) data[k] = await fileToBase64(v); else if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) for (const rk in v[i]) if (v[i][rk] instanceof File) data[k][i][rk] = await fileToBase64(v[i][rk]); } } return data; };
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (isSubmitting || isSavingDraft) return; setIsSubmitting(true); try { const data = await prepareDataForApi(); await submitForm({ doc: data }); } catch (err) { const errorMessage = err instanceof Error ? err.message : typeof err === "string" ? err : "File processing error."; alert(errorMessage); setIsSubmitting(false); } };
    const handleSaveDraft = async () => { if (isSavingDraft || isSubmitting) return; setIsSavingDraft(true); try { const data = await prepareDataForApi(); await saveDraft({ data: JSON.stringify(data) }); } catch (err) { const errorMessage = err instanceof Error ? err.message : typeof err === "string" ? err : "File processing error."; alert(errorMessage); setIsSavingDraft(false); } };

    // --- RENDER LOGIC ---
    if (loading) return (<div className="flex items-center justify-center min-h-screen bg-claude-bg dark:bg-zinc-900"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-zinc-200 dark:border-zinc-800 border-t-[#D97757] mx-auto"></div><p className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">LOADING FORM...</p></div></div>);

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
        <div className="mt-8 flex justify-between items-center bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
            <FrappeButton
                onClick={() => setActiveTab(activeTab - 1)}
                className={cn("bg-white dark:bg-zinc-900", !showPrev && "invisible")}
            >
                Previous
            </FrappeButton>

            {isLast ? (
                <div className="flex flex-col sm:flex-row gap-4">
                    <FrappeButton
                        onClick={handleSaveDraft}
                        disabled={isSubmitting || isSavingDraft}
                        className="bg-white dark:bg-zinc-900"
                    >
                        {isSavingDraft ? "SAVING..." : "Save As Draft"}
                    </FrappeButton>
                    <FrappeButton
                        type="submit"
                        disabled={isSubmitting || isSavingDraft || !isDraftSaved}
                        className="bg-[#D97757] text-white hover:bg-[#D97757] disabled:bg-zinc-300 dark:bg-zinc-600"
                    >
                        {isSubmitting ? "SUBMITTING..." : "Submit Proposal"}
                    </FrappeButton>
                </div>
            ) : (
                <FrappeButton
                    onClick={() => setActiveTab(activeTab + 1)}
                    className={cn("bg-[#D97757] text-white hover:bg-[#D97757]", !showNext && "invisible")}
                >
                    Next Section
                </FrappeButton>
            )}
        </div>
    );

    const tabFieldGroups = {
        fundingDetails: ["funding_agen", "funding_agency_schemes", "funding_agency_type", "origin_of_funding_agency", "funding_agency_ministry", "fund_agen_initials"],
        agencyAddress: ["address_street_village_locality", "address_state", "address_postal_code", "address_country"],
        piDetails: ["pi_employee_id", "principal_investigator_name", "designation", "applicant_department", "pi_userid"],
        collaboratorToggles: ["is_additional_pi", "has_co_pi"],
        budgetToggles: ["equipment_checkbox", "manpower_checkbox"],
    };

    return (
        <div className="bg-claude-bg dark:bg-zinc-900">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden bg-claude-bg dark:bg-zinc-900">
                <header className="mb-3">
                    <h1 className="text-3xl md:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight ">New Endorsement</h1>
                    <p className="text-zinc-700 dark:text-zinc-300 mt-2 ">Fill all sections to submit a new endorsement.</p>
                </header>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <div className="border-b border-zinc-200 dark:border-zinc-800">
                        <nav className="flex space-x-2 p-2 overflow-x-auto">
                            {tabs.map((tab, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setActiveTab(index)}
                                    className={cn(
                                        "flex-shrink-0 flex items-center gap-2 py-3 px-4 font-bold text-sm rounded-xl border-2 border-transparent transition-all",
                                        activeTab === index
                                            ? "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 shadow-sm"
                                            : "text-zinc-900 dark:text-zinc-100 hover:bg-[#CFD8DC]"
                                    )}
                                >
                                    <tab.icon className="h-5 w-5" /> {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="bg-[#F5F5F5] p-6 md:p-8">

                        <form id="project-proposal-form" onSubmit={handleSubmit}>
                            {fields.length > 0 && <>
                                <div className={activeTab === 0 ? "block" : "hidden"}>
                                    <FrappeCard className="space-y-8">
                                        <h2 className="text-3xl font-bold  text-zinc-900 dark:text-zinc-100">1. Project Description</h2>
                                        {renderField("project_title")}
                                        {renderField("project_type")}
                                        {formData.project_type === "Research" && (
                                            <div className='space-y-8'>
                                                <FrappeCard className="p-6 space-y-6 !shadow-sm"><h3 className="text-2xl font-bold  text-zinc-900 dark:text-zinc-100">Funding Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderFields(tabFieldGroups.fundingDetails)}</div></FrappeCard>
                                                <FrappeCard className="p-6 space-y-6 !shadow-sm"><h3 className="text-2xl font-bold  text-zinc-900 dark:text-zinc-100">Agency Address</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderFields(tabFieldGroups.agencyAddress)}</div></FrappeCard>
                                            </div>
                                        )}
                                        {formData.project_type === "Consultancy" && renderField("consultancy_category")}
                                        {formData.project_type === "Other" && renderField("other_project_type_name")}
                                        {renderField("implementation_department")}
                                        {renderField("project_objective")}
                                        {renderField("project_deliverables")}
                                        {renderField("executive_summary")}
                                        {renderField("upload_proj_prop")}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{formData.project_type !== "Consultancy" ? renderField("project_duration_months") : renderField("project_duration_days")}</div>
                                    </FrappeCard>
                                    {renderNextPrevButtons(false, true)}
                                </div>

                                <div className={activeTab === 1 ? "block" : "hidden"}>
                                    <FrappeCard className="space-y-10">
                                        <h2 className="text-3xl font-bold  text-zinc-900 dark:text-zinc-100">2. Investigators & Collaborators</h2>
                                        <div className="p-6 space-y-6 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                            <h3 className="text-2xl font-bold  text-zinc-900 dark:text-zinc-100">Principal Investigator (PI)</h3>
                                            <div className="space-y-8">
                                                {renderField("pi_webmail")}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-dashed">
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
                                    <FrappeCard className="space-y-8">
                                        <h2 className="text-3xl font-bold  text-zinc-900 dark:text-zinc-100">3. Proposed Budget</h2>
                                        <p className=" text-zinc-700 dark:text-zinc-300">Provide a detailed year-wise breakup of the proposed budget.</p>
                                        <MemoizedBudgetTable tableData={budgetTableData} budgetYears={budgetYears} budgetHeadOptions={budgetHeadOptions} onRowChange={handleBudgetRowChange} onAddRow={addBudgetRow} onDeleteRow={deleteTableRow} onAddYear={addBudgetYear} onDeleteYear={deleteLastBudgetYear} getYearTotal={getYearTotal} totalBudgetAmount={totalBudgetAmount} />
                                        <div className="space-y-6 border-t border-zinc-200 dark:border-zinc-800 pt-8">{renderFields(tabFieldGroups.budgetToggles)}</div>
                                        {formData.equipment_checkbox ? (<MemoizedGenericTable tableName={'proposed_equipment_details'} columns={[{ key: 'item_name', label: 'Equipment Name*', type: 'text' }, { key: 'equip_unit_cost', label: 'Cost (₹)', type: 'number' }]} newRow={{ item_name: '', equip_unit_cost: 0 }} tableData={formData.proposed_equipment_details} onRowChange={handleTableRowChange} onFileChange={handleTableFileChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />) : null}
                                        {formData.manpower_checkbox ? (<MemoizedGenericTable tableName={'proposed_manpower_details'} columns={[{ key: 'designation_name', label: 'Position*', type: 'text' }, { key: 'manpower_salary', label: 'Salary (₹)', type: 'number' }]} newRow={{ designation_name: '', manpower_salary: 0 }} tableData={formData.proposed_manpower_details} onRowChange={handleTableRowChange} onFileChange={handleTableFileChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />) : null}
                                    </FrappeCard>
                                    {renderNextPrevButtons(true, true)}
                                </div>
                                <div className={activeTab === 3 ? "block" : "hidden"}>
                                    <FrappeCard className="space-y-8">
                                        <h2 className="text-3xl font-bold  text-zinc-900 dark:text-zinc-100">4. Clearance & Declaration</h2>
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
                                        {/* 🟢 Instruction after saving */}
                                        <div className="p-4 mt-6 border-l-4 border-green-600 bg-green-50 text-green-800 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                                            <div>
                                                💡 <strong>Next Step:</strong> After saving this draft, navigate to the <strong>Projects View</strong> page, switch to the <strong>Under Review</strong> tab, open your proposal, and click <strong>Submit</strong> to proceed.
                                            </div>
                                            <FrappeButton
                                                onClick={() => navigate('/projects-view', { state: { filter: "Application Under Process" } })}
                                                className="bg-green-600 text-white hover:bg-green-700 border-green-800 whitespace-nowrap"
                                            >
                                                Go to Projects
                                            </FrappeButton>
                                        </div>
                                    </FrappeCard>
                                    {renderNextPrevButtons(true, false, true)}
                                </div>
                            </>}
                        </form>
                    </div>
                </div>
            </main>
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default ProjectProposal;
