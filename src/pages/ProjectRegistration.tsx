import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { AppSidebar } from "../components/RndSidebar";
import useUserRoleCheck from "../components/UserRoleCheck";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { FileText, Users, IndianRupee, Shield, FileBadge, X } from 'lucide-react';
import { EndorsementCertificate, getEndorsementHtml } from '../components/EndorsementCertificate';
import { commonAPI } from '@/services/apiService';

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
    proposed_budget_breakup?: ({ head: string; years: (number | string)[]; id?: string })[];
    sanctioned_budget_breakup?: (any & { id?: string })[];
    sanction_related_files?: (any & { id?: string })[];
    fund_transactions?: (any & { id?: string })[];
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const inputClasses = "w-full h-12 px-4 bg-white border border-gray-400 rounded-xl font-medium text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.18)] focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100 read-only:bg-gray-50";
const checkboxClasses = "size-5 shrink-0 appearance-none bg-white border border-gray-400 rounded checked:bg-[#0EA5A4] checked:border-[#0EA5A4] checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat cursor-pointer";
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (<div className={cn("bg-white p-6 md:p-8 border border-gray-300 rounded-xl shadow-sm", className)}>{children}</div>);
const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => (<button type={type} onClick={onClick} disabled={disabled} className={cn("inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.18)] disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button>);

// --- MEMOIZED CHILD COMPONENTS ---
const MemoizedFormField = memo(({ field, value, options, onChange, onFileChange }: { field: Field; value: any; options?: LinkOption[]; onChange: (fieldname: string, value: any, type?: string) => void; onFileChange: (fieldname: string, file: File | null) => void; }) => {
    if (!field || field.hidden || !field.label) return null;
    const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only };
    const renderInput = () => {
        switch (field.fieldtype) {
            case "Link": return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(options || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
            case "Select": return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(field.options?.split('\n').filter(o => o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
            case "Text": case "Small Text": case "Text Editor": return <textarea {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} rows={5} className={`${inputClasses} h-auto py-3`} />;
            case "Check": return (<label className="flex items-center gap-4 font-bold text-black cursor-pointer"><input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => onChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only} /><span>{field.label}{field.mandatory && <span className="text-red-500">*</span>}</span></label>);
            case "Date": return <input type="date" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
            case "Attach": return <input type="file" {...commonProps} className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-bold file:bg-[#A5D6A7] file:text-black hover:file:bg-[#8BC34A]`} onChange={e => onFileChange(field.fieldname, e.target.files?.[0] || null)} />;
            default: return <input type={(['Int', 'Currency', 'Float', 'Percent'].includes(field.fieldtype)) ? 'number' : 'text'} {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
        }
    };
    if (field.fieldtype === 'Check') {
        return <div className="space-y-2">
            {field.description ? <div className="prose prose-sm max-w-none text-black border border-gray-300 rounded-md p-4 bg-gray-100" dangerouslySetInnerHTML={{ __html: field.description }} /> : null}
            {renderInput()}
        </div>
    }
    return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-black">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}{field.description && field.fieldtype !== 'Check' && <p className="text-sm text-black font-mono mt-2">{field.description}</p>}</div>);
});

const MemoizedGenericTable = memo(({ tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
    <div>
        <div className="overflow-x-auto border border-gray-300 rounded-xl">
            <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-200">
                    <tr className="divide-x divide-gray-300">
                        {[...columns, { key: 'actions', label: 'Actions', type: 'action' }].map((c: any) => (
                            <th key={c.key} className="p-3 font-bold text-black text-sm text-left">{c.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 bg-white">
                    {(tableData || []).map((row: any, i: number) => (
                        <tr key={row.id} className="divide-x divide-gray-300 hover:bg-gray-50/50">
                            {columns.map((col: any) => (<td key={col.key} className="p-2"> {col.type === 'file' ? (<input type="file" className={`${inputClasses} !h-11 !py-2`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0] || null)} />) : (<input type={col.type} className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => { const value = col.key === 'salary' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value; onRowChange(tableName, i, col.key, value); }} />)} </td>))}
                            <td className="p-2"><FrappeButton onClick={() => onDeleteRow(tableName, i)} className="bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 w-full text-sm">Delete</FrappeButton></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <FrappeButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#0EA5A4] text-white hover:bg-[#0D9494] mt-4">Add Row</FrappeButton>
    </div>
));

const MemoizedCollaboratorTable = memo(({ tableName, title, tableData, piOptions, onCollaboratorChange, onRowChange, onAddRow, onDeleteRow }: any) => {
    const prefix = tableName === 'co_investigator_table' ? 'copi' : 'pi';
    const newRow = { [`${prefix}_name`]: '', [`${prefix}_email`]: '', [`${prefix}_designation`]: '', [`${prefix}_address`]: '', [`${prefix}_contact`]: '' };
    return (
        <div>
            <h3 className="text-lg font-bold text-black mb-4">{title}</h3>
            <div className="overflow-x-auto border border-gray-300 rounded-xl">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-200">
                        <tr className="divide-x divide-gray-300">
                            {["Name*", "Email ID*", "Designation*", "Address*", "Contact*", "Actions"].map(h => (
                                <th key={h} className="p-3 font-bold text-black text-sm text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300 bg-white">
                        {(tableData || []).map((row: any, i: number) => (
                            <tr key={row.id} className="divide-x divide-gray-300 hover:bg-gray-50/50">
                                <td className="p-2"><select className={`${inputClasses} !h-11`} value={row[`${prefix}_email`] || ''} onChange={e => onCollaboratorChange(tableName, i, e.target.value)}><option value="">Select Person...</option>{(piOptions || []).map((o: any) => (<option key={o.value} value={o.value}>{o.label}</option>))}</select></td>
                                <td className="p-2"><input type="email" readOnly className={`${inputClasses} !h-11 bg-gray-100 text-black font-medium`} value={row[`${prefix}_email`] || ''} /></td>
                                <td className="p-2"><input type="text" readOnly className={`${inputClasses} !h-11 bg-gray-100 text-black font-medium`} value={row[`${prefix}_designation`] || ''} /></td>
                                <td className="p-2"><input type="text" placeholder="Institute/Address" className={`${inputClasses} !h-11`} value={row[`${prefix}_address`] || ''} onChange={e => onRowChange(tableName, i, `${prefix}_address`, e.target.value)} /></td>
                                <td className="p-2"><input type="tel" placeholder="10-digit #" maxLength={10} className={`${inputClasses} !h-11`} value={row[`${prefix}_contact`] || ''} onChange={e => onRowChange(tableName, i, `${prefix}_contact`, e.target.value.replace(/[^0-9]/g, ''))} /></td>
                                <td className="p-2"><FrappeButton onClick={() => onDeleteRow(tableName, i)} className="bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 w-full text-sm">Delete</FrappeButton></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <FrappeButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#0EA5A4] text-white hover:bg-[#0D9494] mt-4">Add Collaborator</FrappeButton>
        </div>
    );
});


const MemoizedBudgetTable = memo(({ tableData, budgetYears, budgetHeadOptions, onRowChange, onAddRow, onDeleteRow, onAddYear, onDeleteYear, getYearTotal, totalBudgetAmount }: any) => (
    <div className="space-y-4">
        <div className="overflow-x-auto border border-gray-300 rounded-xl">
            <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-200">
                    <tr className="divide-x divide-gray-300">
                        <th className="p-3 font-bold text-black text-sm text-left">Account Head</th>
                        {budgetYears.map((year: number, index: number) => (<th key={index} className="p-3 font-bold text-black text-sm text-left">Year {year} (₹)</th>))}
                        <th className="p-3 font-bold text-black text-sm text-left">Total (₹)</th>
                        <th className="p-3 font-bold text-black text-sm text-left">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-300">
                    {(tableData || []).map((row: any, rowIndex: number) => {
                        const rowTotal = (row.years || []).reduce((sum: number, val: any) => sum + Number(val || 0), 0);
                        return (
                            <tr key={row.id} className="divide-x divide-gray-300 hover:bg-gray-50/50">
                                <td className="p-2">
                                    <select
                                        className={`${inputClasses} !h-11`}
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
                                {budgetYears.map((_: any, yearIndex: number) => (<td key={yearIndex} className="p-2"><input type="number" className={`${inputClasses} !h-11`} value={(row.years || [])[yearIndex] || ''} onChange={(e) => onRowChange(rowIndex, 'years', e.target.value, yearIndex)} /></td>))}
                                <td className="p-2 font-bold text-black text-right pr-4">{rowTotal.toFixed(2)}</td>
                                <td className="p-2"><FrappeButton type="button" className="bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 w-full text-sm" onClick={() => onDeleteRow('proposed_budget_breakup', rowIndex)}>Delete</FrappeButton></td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="bg-[#E0F7F6] border-t border-gray-300">
                    <tr className="divide-x divide-gray-300">
                        <th className="p-3 text-right font-bold text-black">Yearly Total</th>
                        {budgetYears.map((_: any, yearIndex: number) => (<td key={yearIndex} className="p-3 font-bold text-black text-right pr-4">{Number(getYearTotal(yearIndex)).toFixed(2)}</td>))}
                        <td className="p-3 font-bold text-[#0EA5A4] bg-[#0EA5A4]/10 text-right pr-4">{totalBudgetAmount.toFixed(2)}</td>
                        <td className="p-3"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div className="flex flex-wrap gap-4">
            <FrappeButton type="button" className="bg-[#0EA5A4] text-white hover:bg-[#0D9494]" onClick={onAddRow}>Add Budget Row</FrappeButton>
            <FrappeButton type="button" className="bg-gray-200 text-black border border-gray-400 hover:bg-gray-300" onClick={onAddYear} disabled={budgetYears.length >= 5}>Add Year</FrappeButton>
            <FrappeButton type="button" className="bg-amber-100 text-amber-800 border border-amber-400 hover:bg-amber-200" onClick={onDeleteYear}>Delete Last Year</FrappeButton>
        </div>
        <div className="mt-6 flex justify-end">
            <div className="w-full md:w-1/3 space-y-2">
                <label className="block text-lg font-bold text-black">Grand Total (₹)</label>
                <input type="text" className={`${inputClasses} text-xl font-bold bg-[#E0F7F6] text-[#0EA5A4]`} readOnly value={totalBudgetAmount.toFixed(2)} />
            </div>
        </div>
    </div>
));


// --- MAIN COMPONENT ---
const ProjectRegistration: React.FC = () => {
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
    const [showEndorsementModal, setShowEndorsementModal] = useState(false);
    const isPermanentEmployee = useUserRoleCheck();

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
    const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_data');
    const { call: saveDraft, result: saveResult, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_draft');
    const { call: fetchPiDetails } = useFrappePostCall(commonAPI.getUserDetailsByEmail);
    const { call: fetchAgencyDetails, result: agencyDetailsResult } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_funding_agency_details');
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

            // Fix: Ensure PI Webmail options show email as label
            const processedLinkOptions = { ...link_options };
            if (processedLinkOptions['pi_webmail']) {
                processedLinkOptions['pi_webmail'] = processedLinkOptions['pi_webmail'].map((opt: LinkOption) => ({
                    ...opt,
                    label: opt.value // Show email (value) as label
                }));
            }

            setLinkOptions(processedLinkOptions || {});
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

    useEffect(() => { if (submitResult) { alert(`Project registered: ${submitResult.message.docname}`); setDocname(submitResult.message.docname); } if (submitError) alert(`Submission error: ${submitError.message}`); setIsSubmitting(false); }, [submitResult, submitError]);
    useEffect(() => { if (saveResult) { alert(`Draft saved: ${saveResult.message.docname}`); setDocname(saveResult.message.docname); setIsDraftSaved(true); } if (saveError) alert(`Draft save error: ${saveError.message}`); setIsSavingDraft(false); }, [saveResult, saveError]);

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
                        // Handle both old and new API response structures
                        const deptName = details.department_name || details.department || details.applicant_department;

                        if (deptName && linkOptions["applicant_department"]) {
                            const matchedOption = linkOptions["applicant_department"].find(opt => opt.label === deptName || opt.value === deptName);
                            departmentLinkValue = matchedOption?.value || "";
                        }
                        setFormData(prev => ({
                            ...prev,
                            pi_userid: value,
                            pi_employee_id: details.employee_id || details.pi_employee_id || "",
                            principal_investigator_name: details.full_name || details.principal_investigator_name || "",
                            designation: details.designation_name || details.designation || "",
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
            if (!designation && selectedUserEmail) {
                try {
                    const result = await fetchPiDetails({ user_email: selectedUserEmail });
                    const details = result?.message;
                    designation = details?.designation_name || details?.designation || "";
                } catch (err) { console.error("Failed to fetch collaborator details:", err); }
            }
            setFormData(prev => {
                const t = [...(prev[tableName] || [])];
                t[rowIndex] = { ...t[rowIndex], [`${prefix}_name`]: user?.label || "", [`${prefix}_email`]: user?.value || "", [`${prefix}_designation`]: designation };
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

    // --- RENDER LOGIC ---
    if (loading) return (<div className="flex items-center justify-center min-h-screen bg-gray-100"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE] mx-auto"></div><p className="mt-4 text-2xl font-bold text-black">LOADING FORM...</p></div></div>);

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
        <div className="mt-8 flex justify-between items-center bg-white p-4 border border-gray-300 rounded-md shadow-sm">
            {/* Previous Button */}
            <FrappeButton
                onClick={() => setActiveTab(activeTab - 1)}
                className={cn("bg-white border border-gray-400 text-black hover:bg-gray-100", !showPrev && "invisible")}
            >
                Previous
            </FrappeButton>

            {/* If Last Tab → Show Only "Save as Draft" */}
            {isLast ? (
                <div className="flex flex-col sm:flex-row gap-4">
                    <FrappeButton
                        onClick={handleSaveDraft}
                        disabled={isSubmitting || isSavingDraft}
                        className="bg-white border border-gray-400 text-black hover:bg-gray-100"
                    >
                        {isSavingDraft ? "SAVING..." : "Save As Draft"}
                    </FrappeButton>
                </div>
            ) : (
                /* Otherwise Show "Next Section" */
                <FrappeButton
                    onClick={() => setActiveTab(activeTab + 1)}
                    className={cn("bg-[#A5D6A7] text-black hover:bg-[#8BC34A]", !showNext && "invisible")}
                >
                    Next Section
                </FrappeButton>
            )}
        </div>
    );

    const tabFieldGroups = {
        fundingDetails: ["funding_agen", "funding_agency_schemes", "funding_agency_type", "origin_of_funding_agency", "funding_agency_ministry"],
        agencyAddress: ["address_street_village_locality", "address_state", "address_postal_code", "address_country"],
        piDetails: ["pi_employee_id", "principal_investigator_name", "designation", "applicant_department", "pi_userid"],
        collaboratorToggles: ["is_additional_pi", "has_co_pi"],
        budgetToggles: ["equipment_checkbox", "manpower_checkbox"],
        sanction: ["total_sanctioned_amount", "sanctioned_letter_no", "sanctioned_letter_date"],
        funds: ["is_gst_invoice_issued", "invoice_details", "amount_received", "iitg_bank_account_number"]
    };

    return (
        <div className="bg-gray-100">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden bg-gray-100">
                <header className="mb-3">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight uppercase">New Project Registration</h1>
                    <p className="text-black mt-2 font-bold">Fill all sections to register a new project.</p>
                </header>
                <div className="bg-white border border-gray-300 rounded-md shadow-sm">
                    <div className="border-b border-gray-300">
                        <nav className="flex space-x-2 p-2 overflow-x-auto">
                            {tabs.map((tab, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setActiveTab(index)}
                                    className={cn(
                                        "flex-shrink-0 flex items-center gap-2 py-3 px-4 font-bold text-sm rounded-md border-2 border-transparent transition-all",
                                        activeTab === index
                                            ? "bg-gray-100 border-black shadow-sm text-black"
                                            : "text-black hover:bg-gray-200"
                                    )}
                                >
                                    <tab.icon className="h-5 w-5" /> {tab.label}
                                </button>
                            ))}
                            {/* Endorsement Button */}
                            <button
                                type="button"
                                onClick={() => setShowEndorsementModal(true)}
                                disabled={!isEndorsementEnabled}
                                className={cn(
                                    "flex-shrink-0 flex items-center gap-2 py-3 px-4 font-bold text-sm rounded-md border-2 transition-all ml-auto",
                                    isEndorsementEnabled
                                        ? "bg-[#0EA5A4] text-white border-[#0EA5A4] hover:bg-[#0D9494] shadow-sm cursor-pointer"
                                        : "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                                )}
                                title={isEndorsementEnabled ? "Generate Endorsement Certificate" : "Fill all required Project Details and PI Details to enable"}
                            >
                                <FileBadge className="h-5 w-5" /> Generate Endorsement
                            </button>
                        </nav>
                    </div>

                    <div className="bg-gray-100 p-6 md:p-8">
                        <form id="project-registration-form" onSubmit={handleSubmit}>
                            {fields.length > 0 && <>
                                <div className={activeTab === 0 ? "block" : "hidden"}>
                                    <FrappeCard className="space-y-8">
                                        <h2 className="text-3xl font-bold uppercase text-black">1. Project Description</h2>
                                        {renderField("project_title")}
                                        {renderField("project_type")}
                                        {formData.project_type === "Research" && (
                                            <div className='space-y-8'>
                                                <FrappeCard className="p-6 space-y-6 !shadow-sm border-gray-300"><h3 className="text-2xl font-bold uppercase text-black">Funding Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderFields(tabFieldGroups.fundingDetails)}</div></FrappeCard>
                                                <FrappeCard className="p-6 space-y-6 !shadow-sm border-gray-300"><h3 className="text-2xl font-bold uppercase text-black">Agency Address</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderFields(tabFieldGroups.agencyAddress)}</div></FrappeCard>
                                            </div>
                                        )}
                                        {formData.project_type === "Consultancy" && renderField("consultancy_category")}
                                        {formData.project_type === "Other" && renderField("other_project_type_name")}
                                        {renderField("implementation_department")}
                                        {renderField("project_objective")}
                                        {renderField("project_deliverables")}
                                        {renderField("executive_summary")}
                                        {renderField("upload_proj_prop")}
                                        {renderField("my_projects")}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{formData.project_type !== "Consultancy" ? renderField("project_duration_months") : renderField("project_duration_days")}</div>
                                    </FrappeCard>
                                    {renderNextPrevButtons(false, true)}
                                </div>

                                <div className={activeTab === 1 ? "block" : "hidden"}>
                                    <FrappeCard className="space-y-10">
                                        <h2 className="text-3xl font-bold uppercase text-black">2. Investigators & Collaborators</h2>
                                        <div className="p-6 space-y-6 border border-gray-300 rounded-md shadow-sm bg-white">
                                            <h3 className="text-2xl font-bold uppercase text-black">Principal Investigator (PI)</h3>
                                            <div className="space-y-8">
                                                {renderField("pi_webmail")}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-dashed border-gray-400">
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
                                        <h2 className="text-3xl font-bold uppercase text-black">3. Proposed Budget</h2>
                                        <p className="font-bold text-black">Provide a detailed year-wise breakup of the proposed budget.</p>
                                        <MemoizedBudgetTable tableData={budgetTableData} budgetYears={budgetYears} budgetHeadOptions={budgetHeadOptions} onRowChange={handleBudgetRowChange} onAddRow={addBudgetRow} onDeleteRow={deleteTableRow} onAddYear={addBudgetYear} onDeleteYear={deleteLastBudgetYear} getYearTotal={getYearTotal} totalBudgetAmount={totalBudgetAmount} />
                                        <div className="space-y-6 border-t border-gray-300 pt-8">{renderFields(tabFieldGroups.budgetToggles)}</div>
                                        {formData.equipment_checkbox ? (<MemoizedGenericTable tableName={'proposed_equipment_details'} columns={[{ key: 'item_name', label: 'Equipment Name*', type: 'text' }, { key: 'cost', label: 'Cost (₹)', type: 'number' }]} newRow={{ item_name: '', cost: 0 }} tableData={formData.proposed_equipment_details} onRowChange={handleTableRowChange} onFileChange={handleTableFileChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />) : null}
                                        {formData.manpower_checkbox ? (<MemoizedGenericTable tableName={'proposed_manpower_details'} columns={[{ key: 'designation_name', label: 'Position*', type: 'text' }, { key: 'salary', label: 'Salary (₹)', type: 'number' }]} newRow={{ designation_name: '', salary: 0 }} tableData={formData.proposed_manpower_details} onRowChange={handleTableRowChange} onFileChange={handleTableFileChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />) : null}
                                    </FrappeCard>
                                    {renderNextPrevButtons(true, true)}
                                </div>
                                <div className={activeTab === 3 ? "block" : "hidden"}>
                                    <FrappeCard className="space-y-8">
                                        <h2 className="text-3xl font-bold uppercase text-black">4. Clearance & Declaration</h2>
                                        {renderField("needs_committee_clearance")}
                                        {formData.needs_committee_clearance === "Yes" && (
                                            <div className="space-y-8 pt-8 mt-8 border-t-2 border-dashed border-gray-400">
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
                                                <FrappeCard className="space-y-8 !shadow-sm border-gray-300">
                                                    <h3 className="text-2xl font-bold uppercase text-black">Sanction Details</h3>

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
                                                <FrappeCard className="space-y-8 !shadow-sm border-gray-300">
                                                    <h3 className="text-2xl font-bold uppercase text-black">Fund Details</h3>

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
                        <div className="relative bg-white rounded-lg shadow-2xl max-w-[240mm] w-full mx-4 border border-gray-400">
                            {/* Modal Header */}
                            <div className="bg-white border-b border-gray-300 px-6 py-4 flex items-center justify-between rounded-t-lg">
                                <h2 className="text-xl font-bold text-black">Endorsement Certificate</h2>
                                <button
                                    onClick={() => setShowEndorsementModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    title="Close"
                                >
                                    <X className="h-6 w-6 text-black" />
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
                                />
                            </div>
                            {/* Modal Footer */}
                            <div className="bg-white border-t border-gray-300 px-6 py-4 flex items-center justify-end rounded-b-lg">
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={async () => {
                                        setIsSubmitting(true);
                                        try {
                                            const { doc_data, files } = await prepareDataWithFiles();
                                            await submitForm({ doc: doc_data, files });
                                            setShowEndorsementModal(false);
                                        } catch (err) {
                                            alert('Error processing endorsement.');
                                            setIsSubmitting(false);
                                        }
                                    }}
                                    className="px-6 py-3 rounded-full font-bold text-sm bg-[#0EA5A4] text-white hover:bg-[#0D9494] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
