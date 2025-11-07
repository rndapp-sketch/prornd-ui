import React, { useState, useEffect, useCallback, memo } from 'react';
import { AppSidebar } from "../components/RndSidebar";
import useUserRoleCheck from "../components/UserRoleCheck";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';

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
const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
const checkboxClasses = "size-6 shrink-0 appearance-none bg-white border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.25)] checked:bg-black checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat";
const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );
const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => ( <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300", className)}>{children}</button> );

// --- MEMOIZED CHILD COMPONENTS ---
const MemoizedFormField = memo(({ field, value, options, onChange, onFileChange }: { field: Field; value: any; options?: LinkOption[]; onChange: (fieldname: string, value: any, type?: string) => void; onFileChange: (fieldname: string, file: File | null) => void; }) => {
    if (!field || field.hidden || !field.label) return null;
    const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only };
    const renderInput = () => {
        switch (field.fieldtype) {
            case "Link": return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(options || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
            case "Select": return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(field.options?.split('\n').filter(o=>o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
            case "Text": case "Small Text": case "Text Editor": return <textarea {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} rows={5} className={`${inputClasses} h-auto py-3`} />;
            case "Check": return (<label className="flex items-center gap-4 font-bold text-black text-lg cursor-pointer"><input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => onChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only}/><span>{field.label}{field.mandatory && <span className="text-red-500">*</span>}</span></label>);
            case "Date": return <input type="date" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
            case "Attach": return <input type="file" {...commonProps} className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-bold file:bg-[#A5D6A7] file:text-black hover:file:bg-[#8BC34A]`} onChange={e => onFileChange(field.fieldname, e.target.files?.[0] || null)} />;
            default: return <input type={(['Int', 'Currency', 'Float', 'Percent'].includes(field.fieldtype)) ? 'number' : 'text'} {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
        }
    };
    if (field.fieldtype === 'Check') {
        return <div className="space-y-2">
            {field.description ? <div className="prose prose-sm max-w-none font-mono text-black border-2 border-black rounded-md p-4 bg-gray-100" dangerouslySetInnerHTML={{__html: field.description}}/> : null}
            {renderInput()}
        </div>
    }
    return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-black text-lg">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}{field.description && field.fieldtype !== 'Check' && <p className="text-sm text-gray-700 font-mono mt-2">{field.description}</p>}</div>);
});

const MemoizedGenericTable = memo(({ tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
    <div>
        <div className="overflow-x-auto border-2 border-black rounded-md">
            <table className="min-w-full divide-y-2 divide-black">
                <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{[...columns, {key:'actions', label:'Actions', type:'action'}].map((c:any) => (<th key={c.key} className="p-3 font-bold text-white uppercase">{c.label}</th>))}</tr></thead>
                <tbody className="divide-y-2 divide-black bg-white">
                    {(tableData || []).map((row: any, i: number) => (
                        <tr key={row.id} className="divide-x-2 divide-black">
                            {columns.map((col:any) => ( <td key={col.key} className="p-2"> {col.type === 'file' ? (<input type="file" className={`${inputClasses} !h-11 !py-2`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0]||null)} />) : (<input type={col.type} className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => { const value = col.key === 'salary' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value; onRowChange(tableName, i, col.key, value); }} />)} </td> ))}
                            <td className="p-2"><NeoButton onClick={() => onDeleteRow(tableName, i)} className="bg-red-500 text-white w-full text-sm !py-2">Delete</NeoButton></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <NeoButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#A5D6A7] mt-4">Add Row</NeoButton>
    </div>
));

const MemoizedCollaboratorTable = memo(({ tableName, title, tableData, piOptions, onCollaboratorChange, onRowChange, onAddRow, onDeleteRow }: any) => {
    const prefix = tableName === 'co_investigator_table' ? 'copi' : 'pi';
    const newRow = { [`${prefix}_name`]: '', [`${prefix}_email`]: '', [`${prefix}_designation`]: '', [`${prefix}_address`]: '', [`${prefix}_contact`]: '' };
    return (
        <div>
            <h3 className="text-2xl font-bold uppercase text-black mb-4">{title}</h3>
            <div className="overflow-x-auto border-2 border-black rounded-md">
                <table className="min-w-full divide-y-2 divide-black">
                    <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{["Name*", "Email ID*", "Designation*", "Address*", "Contact*", "Actions"].map(h => (<th key={h} className="p-3 font-bold text-white uppercase">{h}</th>))}</tr></thead>
                    <tbody className="divide-y-2 divide-black bg-white">
                        {(tableData || []).map((row: any, i: number) => (
                            <tr key={row.id} className="divide-x-2 divide-black">
                                <td className="p-2"><select className={`${inputClasses} !h-11`} value={row[`${prefix}_email`] || ''} onChange={e => onCollaboratorChange(tableName, i, e.target.value)}><option value="">Select Person...</option>{(piOptions || []).map((o: any) => (<option key={o.value} value={o.value}>{o.label}</option>))}</select></td>
                                <td className="p-2"><input type="email" readOnly className={`${inputClasses} !h-11 bg-gray-200`} value={row[`${prefix}_email`] || ''} /></td>
                                <td className="p-2"><input type="text" readOnly className={`${inputClasses} !h-11 bg-gray-200`} value={row[`${prefix}_designation`] || ''} /></td>
                                <td className="p-2"><input type="text" placeholder="Institute/Address" className={`${inputClasses} !h-11`} value={row[`${prefix}_address`] || ''} onChange={e => onRowChange(tableName, i, `${prefix}_address`, e.target.value)} /></td>
                                <td className="p-2"><input type="tel" placeholder="10-digit #" maxLength={10} className={`${inputClasses} !h-11`} value={row[`${prefix}_contact`] || ''} onChange={e => onRowChange(tableName, i, `${prefix}_contact`, e.target.value.replace(/[^0-9]/g, ''))} /></td>
                                <td className="p-2"><NeoButton onClick={() => onDeleteRow(tableName, i)} className="bg-red-500 text-white w-full text-sm !py-2">Delete</NeoButton></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <NeoButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#A5D6A7] mt-4">Add Collaborator</NeoButton>
        </div>
    );
});

const MemoizedBudgetTable = memo(({ tableData, budgetYears, onRowChange, onAddRow, onDeleteRow, onAddYear, onDeleteYear, getYearTotal, totalBudgetAmount }: any) => (
    <div className="space-y-4">
        <div className="overflow-x-auto border-2 border-black rounded-md">
            <table className="min-w-full divide-y-2 divide-black">
                <thead className="bg-[#90A4AE]">
                    <tr className="divide-x-2 divide-black">
                        <th className="p-3 font-bold text-white uppercase">Budget Head</th>
                        {budgetYears.map((year: number, index: number) => (<th key={index} className="p-3 font-bold text-white uppercase">Year {year} (₹)</th>))}
                        <th className="p-3 font-bold text-white uppercase">Total (₹)</th>
                        <th className="p-3 font-bold text-white uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y-2 divide-black">
                    {(tableData || []).map((row: any, rowIndex: number) => {
                        const rowTotal = (row.years || []).reduce((sum: number, val: any) => sum + Number(val || 0), 0);
                        return (
                            <tr key={row.id} className="divide-x-2 divide-black">
                                <td className="p-2"><input type="text" className={`${inputClasses} !h-11`} placeholder="e.g., Equipment" value={row.head || ''} onChange={(e) => onRowChange(rowIndex, 'head', e.target.value)} /></td>
                                {budgetYears.map((_: any, yearIndex: number) => (<td key={yearIndex} className="p-2"><input type="number" className={`${inputClasses} !h-11`} value={(row.years || [])[yearIndex] || ''} onChange={(e) => onRowChange(rowIndex, 'years', e.target.value, yearIndex)} /></td>))}
                                <td className="p-2 font-mono font-bold text-right pr-4">{rowTotal.toFixed(2)}</td>
                                <td className="p-2"><NeoButton type="button" className="bg-red-500 text-white w-full !py-2 text-sm" onClick={() => onDeleteRow('proposed_budget_breakup', rowIndex)}>Delete</NeoButton></td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="bg-gray-200 border-t-2 border-black">
                    <tr className="divide-x-2 divide-black">
                        <th className="p-3 text-right font-bold text-black uppercase">Yearly Total</th>
                        {budgetYears.map((_: any, yearIndex: number) => (<td key={yearIndex} className="p-3 font-bold text-black font-mono text-right pr-4">{Number(getYearTotal(yearIndex)).toFixed(2)}</td>))}
                        <td className="p-3 font-bold text-black font-mono bg-gray-300 text-right pr-4">{totalBudgetAmount.toFixed(2)}</td>
                        <td className="p-3"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div className="flex flex-wrap gap-4">
            <NeoButton type="button" className="bg-[#A5D6A7]" onClick={onAddRow}>Add Budget Row</NeoButton>
            <NeoButton type="button" className="bg-[#90A4AE] text-white" onClick={onAddYear} disabled={budgetYears.length >= 5}>Add Year</NeoButton>
            <NeoButton type="button" className="bg-[#A1887F] text-white" onClick={onDeleteYear}>Delete Last Year</NeoButton>
        </div>
        <div className="mt-6 flex justify-end">
            <div className="w-full md:w-1/3 space-y-2">
                <label className="block text-xl font-bold text-black">Grand Total (₹)</label>
                <input type="text" className={`${inputClasses} text-xl font-bold bg-gray-200`} readOnly value={totalBudgetAmount.toFixed(2)} />
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
    const [formData, setFormData] = useState<FormData>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [docname, setDocname] = useState<string | null>(null);
    const [budgetYears, setBudgetYears] = useState([1]);
    const [isDraftSaved, setIsDraftSaved] = useState(false);
    const isPermanentEmployee = useUserRoleCheck();
    
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_project_form_data');
    const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_data');
    const { call: saveDraft, result: saveResult, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_draft');
    const { call: fetchPiDetails, result: piDetailsResult, error: piDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi');
    const { call: fetchAgencyDetails, result: agencyDetailsResult, error: agencyDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_funding_agency_details');

    // --- DATA FETCHING & INITIALIZATION ---
    useEffect(() => { fetchFormData({}); }, [fetchFormData]);
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
            if (prefill_data?.pi_webmail) fetchPiDetails({ user_email: prefill_data.pi_webmail });
        }
        if (formDataError) { 
            console.error("❌ Failed to fetch form data:", formDataError); 
            alert("Error fetching form data."); 
            setLoading(false); 
        }
    }, [formDataResult, formDataError, fetchPiDetails]);

    useEffect(() => {
        if (agencyDetailsResult?.message?.all) {
            const d = agencyDetailsResult.message.all;
            setFormData(prev => ({ 
                ...prev, 
                funding_agency_type: d.funding_agency_type_1, 
                origin_of_funding_agency: d.origin_of_funding_agency, 
                funding_agency_ministry: d.ministry_funding_agency, 
                funding_agency_schemes: d.funding_agency_schemes, 
                address_street_village_locality: d.fundingagency_address, 
                address_state: d.fundingagency_state, 
                address_postal_code: d.fundingagency_postalcode, 
                address_country: d.fundingagency_country 
            }));
        }
    }, [agencyDetailsResult]);

    useEffect(() => { if (piDetailsResult?.message) { const details = piDetailsResult.message; let departmentLinkValue = ''; const departmentLabel = details.department || ''; if (departmentLabel && linkOptions['applicant_department']) { const matchedOption = linkOptions['applicant_department'].find(opt => opt.label === departmentLabel || opt.value === departmentLabel); departmentLinkValue = matchedOption?.value || ''; } setFormData(prev => ({ ...prev, pi_employee_id: details.pi_employee_id || '', principal_investigator_name: details.principal_investigator_name || '', designation: details.designation || '', applicant_department: departmentLinkValue || prev.applicant_department })); } }, [piDetailsResult, linkOptions]);
    useEffect(() => { if (activeTab === 1 && formData.pi_webmail && !formData.principal_investigator_name) fetchPiDetails({ user_email: formData.pi_webmail }); }, [activeTab, formData.pi_webmail, formData.principal_investigator_name, fetchPiDetails]);
    useEffect(() => { if (submitResult) { alert(`Project registered: ${submitResult.message.docname}`); setDocname(submitResult.message.docname); } if (submitError) alert(`Submission error: ${submitError.message}`); setIsSubmitting(false); }, [submitResult, submitError]);
    useEffect(() => { if (saveResult) { alert(`Draft saved: ${saveResult.message.docname}`); setDocname(saveResult.message.docname); setIsDraftSaved(true); } if (saveError) alert(`Draft save error: ${saveError.message}`); setIsSavingDraft(false); }, [saveResult, saveError]);

    // --- STABILIZED EVENT HANDLERS & RENDER FUNCTIONS ---
    const handleChange = useCallback((fieldname: string, value: any, type?: string) => { setFormData(prev => ({ ...prev, [fieldname]: type === 'checkbox' ? (value ? 1 : 0) : value })); }, []);
    const handleFileChange = useCallback((fieldname: string, file: File | null) => { setFormData(prev => ({ ...prev, [fieldname]: file })); }, []);
    
    const handleFieldChangeWithSideEffects = useCallback((fieldname: string, value: any) => {
        handleChange(fieldname, value);
        if (fieldname === 'pi_webmail' && value) { fetchPiDetails({ user_email: value }); }
        if (fieldname === 'funding_agen' && value) { fetchAgencyDetails({ agency_name: value }); }
    }, [handleChange, fetchPiDetails, fetchAgencyDetails]);
    
    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: value }; return { ...prev, [tableName]: t }; }); }, []);
    const handleTableFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: file }; return { ...prev, [tableName]: t }; }); }, []);
    const addTableRow = useCallback((tableName: string, newRow: object) => { const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9); setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName] || []), { ...newRow, id: newId }] })); }, []);
    const deleteTableRow = useCallback((tableName: string, rowIndex: number) => { setFormData(prev => ({ ...prev, [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex) })); }, []);
    const handleCollaboratorChange = useCallback((tableName: string, rowIndex: number, selectedUserEmail: string) => { const user = (linkOptions['pi_webmail'] || []).find(c => c.value === selectedUserEmail); const prefix = tableName === 'co_investigator_table' ? 'copi' : 'pi'; setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [`${prefix}_name`]: user?.label || '', [`${prefix}_email`]: user?.value || '', [`${prefix}_designation`]: user?.designation || '', }; return { ...prev, [tableName]: t }; }); }, [linkOptions]);
    
    const addBudgetRow = useCallback(() => addTableRow('proposed_budget_breakup', { head: '', years: budgetYears.map(() => '') }), [addTableRow, budgetYears]);
    const addBudgetYear = useCallback(() => { if (budgetYears.length < 5) { setBudgetYears(prev => [...prev, prev.length + 1]); setFormData(prev => ({ ...prev, proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({ ...row, years: [...(row.years || []), ''] })) })); } else { alert("Maximum of 5 years allowed."); } }, [budgetYears]);
    const deleteLastBudgetYear = useCallback(() => { if (budgetYears.length > 1) { setBudgetYears(prev => prev.slice(0, -1)); setFormData(prev => ({ ...prev, proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({ ...row, years: (row.years || []).slice(0, -1) })) })); } }, [budgetYears]);
    const handleBudgetRowChange = useCallback((rowIndex: number, fieldname: string, value: any, yearIndex?: number) => { if (fieldname === 'years' && yearIndex !== undefined) { setFormData(prev => { const t = [...(prev.proposed_budget_breakup || [])]; const y = [...(t[rowIndex].years || [])]; y[yearIndex] = value; t[rowIndex] = { ...t[rowIndex], years: y }; return { ...prev, proposed_budget_breakup: t }; }); } else { handleTableRowChange('proposed_budget_breakup', rowIndex, fieldname, value); } }, [handleTableRowChange]);

    const ALWAYS_HIDDEN_FIELDS = ['department_head', 'head_approver'];

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
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (isSubmitting || isSavingDraft) return; setIsSubmitting(true); try { const data = await prepareDataForApi(); await submitForm({ doc: data }); } catch (err) { alert("File processing error."); setIsSubmitting(false); } };
    const handleSaveDraft = async () => { if (isSavingDraft || isSubmitting) return; setIsSavingDraft(true); try { const data = await prepareDataForApi(); await saveDraft({ doc_data: JSON.stringify(data) }); } catch (err) { alert("File processing error."); setIsSavingDraft(false); } };

    // --- RENDER LOGIC ---
    if (loading) return (<div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE] mx-auto"></div><p className="mt-4 text-2xl font-bold text-black">LOADING FORM...</p></div></div>);
    
    const budgetTableData = formData.proposed_budget_breakup || [];
    const totalBudgetAmount = budgetTableData.reduce((acc, row) => acc + (row.years || []).reduce((sum: number, val) => sum + Number(val || 0), 0), 0);
    const getYearTotal = (yearIndex: number) => budgetTableData.reduce((sum: number, row) => sum + Number((row.years || [])[yearIndex] || 0), 0);
    
    const tabButtons = ["Project Details", "PI & Collaborators", "Budget", "Clearance", "Sanction & Funds"];
    const renderNextPrevButtons = (showPrev: boolean, showNext: boolean, isLast = false) => (
        <div className="mt-8 flex justify-between items-center bg-white p-4 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
            <NeoButton onClick={() => setActiveTab(activeTab - 1)} className={cn("bg-white", !showPrev && 'invisible')}>Previous</NeoButton>
            {isLast ? (<div className="flex flex-col sm:flex-row gap-4"><NeoButton onClick={handleSaveDraft} disabled={isSubmitting || isSavingDraft} className="bg-white">{isSavingDraft ? 'SAVING...' : 'Save As Draft'}</NeoButton><NeoButton type="submit" disabled={isSubmitting || isSavingDraft || !isDraftSaved} className="bg-[#A5D6A7] disabled:bg-gray-300">{isSubmitting ? 'SUBMITTING...' : 'Submit Registration'}</NeoButton></div>) 
            : (<NeoButton onClick={() => setActiveTab(activeTab + 1)} className={cn("bg-[#A5D6A7]", !showNext && 'invisible')}>Next Section</NeoButton>)}
        </div>
    );

    const tabFieldGroups = {
        projectDetails: ['pi_webmail', 'project_title', 'project_type', 'implementation_department', 'project_objective', 'project_deliverables', 'executive_summary', 'upload_proj_prop', 'my_projects'],
        fundingDetails: ['funding_agen', 'funding_agency_schemes', 'funding_agency_type', 'origin_of_funding_agency', 'funding_agency_ministry', 'fund_agen_initials'],
        agencyAddress: ['address_street_village_locality', 'address_state', 'address_postal_code', 'address_country'],
        piDetails: ['pi_employee_id', 'principal_investigator_name', 'designation', 'applicant_department', 'pi_userid'],
        collaboratorToggles: ['is_additional_pi', 'has_co_pi'],
        budgetToggles: ['equipment_checkbox', 'manpower_checkbox'],
        clearance: ['needs_committee_clearance', 'committees', 'other_committee_specify', 'ethics_committee_details', 'ethics_other_details', 'biosafety_category', 'declaration_html'],
        sanction: ['have_sanction_details', 'total_sanctioned_amount', 'sanctioned_letter_no', 'sanctioned_letter_date'],
        funds: ['have_fund_details', 'is_gst_invoice_issued', 'invoice_details', 'amount_received', 'iitg_bank_account_number']
    };

    return (
        <div className="bg-[#FDFCEC]">
            <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden bg-[#FDFCEC]]">
                <header className="mb-3">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight uppercase">New Project Registration</h1>
                    <p className="text-gray-700 mt-2 font-mono">Fill all sections to register a new project.</p>
                </header>
                <div className="border-b-2 border-black flex mb-8">
                    {tabButtons.map((title, index) => (<button key={index} type="button" onClick={() => setActiveTab(index)} className={cn("flex-1 py-4 px-2 font-bold text-black text-center transition-all border-r-2 border-black last:border-r-0 text-sm md:text-base", activeTab === index ? "bg-[#B0BEC5] text-white" : "bg-white hover:bg-gray-100")}>{title}</button>))}
                </div>
                
                <form id="project-registration-form" onSubmit={handleSubmit}>
                    {fields.length > 0 && <>
                        <div className={activeTab === 0 ? 'block' : 'hidden'}>
                            <NeoCard className="space-y-8">
                                <h2 className="text-3xl font-bold uppercase text-black">1. Project Description</h2>
                                <div className="space-y-8">
                                    {renderFields(tabFieldGroups.projectDetails)}
                                </div>
                                {formData.project_type === 'Consultancy' && renderField("consultancy_category")}
                                {formData.project_type === 'Other' && renderField("other_project_type_name")}
                                {formData.project_type === 'Research' && (
                                    <div className='space-y-8'>
                                        <NeoCard className="p-6 space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Funding Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderFields(tabFieldGroups.fundingDetails)}</div></NeoCard>
                                        <NeoCard className="p-6 space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Agency Address</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderFields(tabFieldGroups.agencyAddress)}</div></NeoCard>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{formData.project_type !== 'Consultancy' ? renderField("project_duration_months") : renderField("project_duration_days")}</div>
                            </NeoCard>
                            {renderNextPrevButtons(false, true)}
                        </div>
                        <div className={activeTab === 1 ? 'block' : 'hidden'}>
                            <NeoCard className="space-y-10">
                                <h2 className="text-3xl font-bold uppercase text-black">2. Investigators & Collaborators</h2>
                                <div className="p-6 space-y-6 border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Principal Investigator (PI)</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">{renderFields(tabFieldGroups.piDetails)}</div></div>
                                <div className="space-y-6">{renderFields(tabFieldGroups.collaboratorToggles)}</div>
                                {formData.is_additional_pi === 'Yes' && <MemoizedCollaboratorTable tableName="additional_pi_table" title="Details of Additional PI(s)" tableData={formData.additional_pi_table} piOptions={linkOptions['pi_webmail']} onCollaboratorChange={handleCollaboratorChange} onRowChange={handleTableRowChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />}
                                {formData.has_co_pi === 'Yes' && <MemoizedCollaboratorTable tableName="co_investigator_table" title="Details of Co-PI(s)" tableData={formData.co_investigator_table} piOptions={linkOptions['pi_webmail']} onCollaboratorChange={handleCollaboratorChange} onRowChange={handleTableRowChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />}
                            </NeoCard>
                            {renderNextPrevButtons(true, true)}
                        </div>
                        <div className={activeTab === 2 ? 'block' : 'hidden'}>
                            <NeoCard className="space-y-8">
                                <h2 className="text-3xl font-bold uppercase text-black">3. Proposed Budget</h2>
                                <p className="font-mono text-gray-700">Provide a detailed year-wise breakup of the proposed budget.</p>
                                <MemoizedBudgetTable tableData={budgetTableData} budgetYears={budgetYears} onRowChange={handleBudgetRowChange} onAddRow={addBudgetRow} onDeleteRow={deleteTableRow} onAddYear={addBudgetYear} onDeleteYear={deleteLastBudgetYear} getYearTotal={getYearTotal} totalBudgetAmount={totalBudgetAmount} />
                                <div className="space-y-6 border-t-2 border-black pt-8">{renderFields(tabFieldGroups.budgetToggles)}</div>
                                {formData.equipment_checkbox ? (<MemoizedGenericTable tableName={'proposed_equipment_details'} columns={[{key: 'item_name', label: 'Equipment Name*', type: 'text'}, {key: 'cost', label: 'Cost (₹)', type: 'number'}]} newRow={{item_name: '', cost: 0}} tableData={formData.proposed_equipment_details} onRowChange={handleTableRowChange} onFileChange={handleTableFileChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />) : null}
                                {formData.manpower_checkbox ? (<MemoizedGenericTable tableName={'proposed_manpower_details'} columns={[{key: 'designation_name', label: 'Position*', type: 'text'}, {key: 'salary', label: 'Salary (₹)', type: 'number'}]} newRow={{designation_name: '', salary: 0}} tableData={formData.proposed_manpower_details} onRowChange={handleTableRowChange} onFileChange={handleTableFileChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />) : null}
                            </NeoCard>
                            {renderNextPrevButtons(true, true)}
                        </div>
                        <div className={activeTab === 3 ? 'block' : 'hidden'}>
                            <NeoCard className="space-y-8">
                                <h2 className="text-3xl font-bold uppercase text-black">4. Clearance & Declaration</h2>
                                <div className="space-y-6">
                                    {renderFields(tabFieldGroups.clearance)}
                                </div>
                            </NeoCard>
                            {renderNextPrevButtons(true, true)}
                        </div>
                        <div className={activeTab === 4 ? 'block' : 'hidden'}>
                            <NeoCard className="space-y-10">
                                <h2 className="text-3xl font-bold uppercase text-black">5. Sanction & Funds</h2>
                                <div className="space-y-6">
                                    {renderField("have_sanction_details")}
                                    {formData.have_sanction_details === 'Yes' && (<NeoCard className="space-y-8 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Sanction Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderFields(tabFieldGroups.sanction.slice(1))}</div><div className="space-y-4"><MemoizedGenericTable tableName={'sanctioned_budget_breakup'} columns={[{key: 'head', label: 'Budget Head', type: 'text'}, {key: 'amount', label: 'Amount (₹)', type: 'number'}]} newRow={{head: '', amount: 0}} tableData={formData.sanctioned_budget_breakup} onRowChange={handleTableRowChange} onFileChange={handleTableFileChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} /></div><div className="space-y-4"><MemoizedGenericTable tableName={'sanction_related_files'} columns={[{key: 'file', label: 'File', type: 'file'}]} newRow={{file: null}} tableData={formData.sanction_related_files} onRowChange={handleTableRowChange} onFileChange={handleTableFileChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} /></div></NeoCard>)}
                                </div>
                                <div className="space-y-6">
                                    {renderField("have_fund_details")}
                                    {formData.have_fund_details === 'Yes' && (<NeoCard className="space-y-8 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Fund Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderFields(tabFieldGroups.funds.slice(1))}</div><div className="space-y-4"><MemoizedGenericTable tableName={'fund_transactions'} columns={[{key: 'installmentNo', label: 'Installment No.', type: 'text'}, {key: 'dateReceived', label: 'Date Received', type: 'date'}, {key: 'amount', label: 'Amount (₹)', type: 'number'}]} newRow={{installmentNo: '', dateReceived: '', amount: 0}} tableData={formData.fund_transactions} onRowChange={handleTableRowChange} onFileChange={handleTableFileChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} /></div></NeoCard>)}
                                </div>
                            </NeoCard>
                            {renderNextPrevButtons(true, false, true)}
                        </div>
                    </>}
                </form>
            </main>
        </div>
    );
};

export default ProjectRegistration;