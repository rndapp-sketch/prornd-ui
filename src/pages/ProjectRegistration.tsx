// import React, { useState, useEffect } from 'react';
// import { AppSidebar } from "../components/RndSidebar";
// import useUserRoleCheck from "../components/UserRoleCheck"; // Ensure this path is correct
// import { useFrappePostCall } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils'; // Assumes a utility for classnames

// // --- LOGIC: TYPE DEFINITIONS (Unchanged) ---
// interface Field {
//     fieldname: string;
//     label: string;
//     fieldtype: string;
//     default?: any;
//     mandatory: boolean;
//     read_only: boolean;
//     hidden: boolean;
//     description?: string;
//     options?: string;
// }

// interface LinkOption {
//     value: string;
//     label: string;
//     designation?: string;
// }

// interface FormData {
//     [key: string]: any;
//     additional_pi_table?: any[];
//     co_investigator_table?: any[];
//     proposed_equipment_details?: any[];
//     proposed_manpower_details?: any[];
//     proposed_budget_breakup?: { head: string; years: (number | string)[] }[]; // Allow string for input flexibility
//     sanctioned_budget_breakup?: any[];
//     sanction_related_files?: any[];
//     fund_transactions?: any[];
// }

// const ProjectRegistration: React.FC = () => {
//     // --- LOGIC: STATE MANAGEMENT & API HOOKS (Unchanged) ---
//     const [activeTab, setActiveTab] = useState(0);
//     const [fields, setFields] = useState<Field[]>([]);
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [formData, setFormData] = useState<FormData>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [isSavingDraft, setIsSavingDraft] = useState(false);
//     const [docname, setDocname] = useState<string | null>(null);
//     const [budgetYears, setBudgetYears] = useState([1]);
//     const isPermanentEmployee = useUserRoleCheck();
//     const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_project_form_data');
//     const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_data');
//     const { call: saveDraft, result: saveResult, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_draft');
//     const { call: fetchPiDetails, result: piDetailsResult, error: piDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi');
//     const { call: fetchAgencyDetails, result: agencyDetailsResult, error: agencyDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_funding_agency_details');
//     const [isDraftSaved, setIsDraftSaved] = useState(false);

//     // --- LOGIC: DATA FETCHING & INITIALIZATION (with Fixes) ---
//     useEffect(() => {
//         fetchFormData({});
//     }, [fetchFormData]);

//     useEffect(() => {
//         if (formDataResult && formDataResult.message.fields) {
//             const { fields: apiFields, link_options, prefill_data } = formDataResult.message;
//             setFields(apiFields);
//             setLinkOptions(link_options || {});
            
//             // FIX: Set default values for dropdowns to "No"
//             const initialFormData = {
//                 ...prefill_data,
//                 is_additional_pi: prefill_data?.is_additional_pi || 'No',
//                 has_co_pi: prefill_data?.has_co_pi || 'No',
//                 needs_committee_clearance: prefill_data?.needs_committee_clearance || 'No',
//                 have_sanction_details: prefill_data?.have_sanction_details || 'No',
//                 have_fund_details: prefill_data?.have_fund_details || 'No',
//             };
//             setFormData(initialFormData);
            
//             setLoading(false);
//             if (prefill_data && prefill_data.pi_webmail) {
//                 fetchPiDetails({ user_email: prefill_data.pi_webmail });
//             }
//         }
//         if (formDataError || (formDataResult && formDataResult.message.error)) {
//             console.error("❌ Failed to fetch form data:", formDataError || formDataResult.message.error);
//             alert("Error fetching form data. Please refresh the page.");
//             setLoading(false);
//         }
//     }, [formDataResult, formDataError, fetchPiDetails]);

//     useEffect(() => {
//         if (agencyDetailsResult?.message?.all) {
//             const d = agencyDetailsResult.message.all;
//             setFormData(p => ({ ...p, funding_agency_type: d.funding_agency_type_1, origin_of_funding_agency: d.origin_of_funding_agency, funding_agency_ministry: d.ministry_funding_agency, funding_agency_schemes: d.funding_agency_schemes, address_street_village_locality: d.fundingagency_address, address_state: d.fundingagency_state, address_postal_code: d.fundingagency_postalcode, address_country: d.fundingagency_country }));
//         }
//     }, [agencyDetailsResult]);
    
//     useEffect(() => {
//         if (piDetailsResult && piDetailsResult.message) {
//             const details = piDetailsResult.message;
//             let departmentLinkValue = '';
//             const departmentLabel = details.department || '';
            
//             if (departmentLabel && linkOptions['applicant_department']) {
//                 const matchedOption = linkOptions['applicant_department'].find(opt => opt.label === departmentLabel || opt.value === departmentLabel);
//                 departmentLinkValue = matchedOption?.value || '';
//             }
            
//             setFormData(prev => ({
//                 ...prev,
//                 pi_employee_id: details.pi_employee_id || '',
//                 principal_investigator_name: details.principal_investigator_name || '',
//                 designation: details.designation || '',
//                 // FIX: Only set applicant_department if it was successfully found, otherwise keep existing value.
//                 applicant_department: departmentLinkValue || prev.applicant_department
//             }));
//         }
//     }, [piDetailsResult, linkOptions]);

//     useEffect(() => { if (activeTab === 1 && formData.pi_webmail && !formData.principal_investigator_name) { fetchPiDetails({ user_email: formData.pi_webmail }); } }, [activeTab, formData.pi_webmail, formData.principal_investigator_name, fetchPiDetails]);
//     useEffect(() => { if (submitResult) { alert(`Project registered: ${submitResult.message.docname}`); setDocname(submitResult.message.docname); } if (submitError) { alert(`Submission error: ${submitError.message}`); } setIsSubmitting(false); }, [submitResult, submitError]);
//     useEffect(() => { if (saveResult) { alert(`Draft saved: ${saveResult.message.docname}`); setDocname(saveResult.message.docname); setIsDraftSaved(true); } if (saveError) { alert(`Draft save error: ${saveError.message}`); } setIsSavingDraft(false); }, [saveResult, saveError]);

//     // --- LOGIC: EVENT HANDLERS (with Fixes) ---
//     const handleChange = (fieldname: string, value: any, type?: string) => { setFormData(prev => ({ ...prev, [fieldname]: type === 'checkbox' ? (value ? 1 : 0) : value })); };
//     const handleFileChange = (fieldname: string, file: File | null) => { setFormData(prev => ({ ...prev, [fieldname]: file })); };
//     const handleTableRowChange = (tableName: string, rowIndex: number, fieldname: string, value: any) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: value }; return { ...prev, [tableName]: t }; }); };
//     const handleTableFileChange = (tableName: string, rowIndex: number, fieldname: string, file: File | null) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: file }; return { ...prev, [tableName]: t }; }); };
//     const addTableRow = (tableName: string, newRow: object) => { setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName] || []), newRow] })); };
//     const deleteTableRow = (tableName: string, rowIndex: number) => { setFormData(prev => ({ ...prev, [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex) })); };
    
//     // FIX: Clear PI details on PI selection change to ensure fresh data is always shown
//     const handlePiWebmailChange = (value: string) => {
//         handleChange('pi_webmail', value);
//         setFormData(prev => ({
//             ...prev,
//             pi_employee_id: '',
//             principal_investigator_name: '',
//             designation: '',
//             applicant_department: ''
//         }));
//         if (value) { fetchPiDetails({ user_email: value }); }
//     };

//     const handleFundingAgencyChange = (agencyName: string) => { handleChange('funding_agen', agencyName); if (agencyName) { fetchAgencyDetails({ agency_name: agencyName }); } else { setFormData(prev => ({ ...prev, funding_agency_schemes: '', funding_agency_type: '', origin_of_funding_agency: '', funding_agency_ministry: '', address_country: '', address_street_village_locality: '', address_state: '', address_postal_code: '' })); } };
//     const handleCollaboratorChange = (tableName: string, rowIndex: number, selectedUserEmail: string) => { const user = (linkOptions['pi_webmail'] || []).find(c => c.value === selectedUserEmail); setFormData(prev => { const t = [...(prev[tableName] || [])]; const p = tableName === 'co_investigator_table' ? 'copi' : 'pi'; t[rowIndex] = { ...t[rowIndex], [`${p}_name`]: user?.label, [`${p}_email`]: user?.value, [`${p}_designation`]: user?.designation }; return { ...prev, [tableName]: t }; }); };

//     // --- LOGIC: FORM SUBMISSION (Unchanged) ---
//     const fileToBase64 = (file: File): Promise<{ file_name: string; file_data: string }> => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => res({ file_name: file.name, file_data: r.result as string }); r.onerror = e => rej(e); });
//     const prepareDataForApi = async () => { const data = JSON.parse(JSON.stringify(formData)); if (docname) { data.name = docname; } for (const k in formData) { const v = formData[k]; if (v instanceof File) { data[k] = await fileToBase64(v); } else if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { for (const rk in v[i]) { if (v[i][rk] instanceof File) { data[k][i][rk] = await fileToBase64(v[i][rk]); } } } } } return data; };
//     const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (isSubmitting || isSavingDraft) return; setIsSubmitting(true); try { const data = await prepareDataForApi(); await submitForm({ doc: data }); } catch (err) { alert("File processing error."); setIsSubmitting(false); } };
//     const handleSaveDraft = async () => { if (isSavingDraft || isSubmitting) return; setIsSavingDraft(true); try { const data = await prepareDataForApi(); await saveDraft({ doc_data: JSON.stringify(data) }); } catch (err) { alert("File processing error."); setIsSavingDraft(false); } };

//     // --- LOGIC: BUDGET TABLE (with Calculation) ---
//     const budgetTable = formData.proposed_budget_breakup || [];
//     const totalBudgetAmount = budgetTable.reduce((acc, row) => acc + (row.years || []).reduce((sum, val) => Number(sum) + Number(val || 0), 0), 0);
//     const addBudgetYear = () => {
//         if (budgetYears.length < 5) {
//             setBudgetYears(prev => [...prev, prev.length + 1]);
//         } else {
//             alert("You can add a maximum of 5 years.");
//         }
//     };
//     const deleteLastBudgetYear = () => { if (budgetYears.length > 1) setBudgetYears(prev => prev.slice(0, -1)); };
//     const getYearTotal = (yearIndex: number) => budgetTable.reduce((sum: number, row) => sum + Number((row.years || [])[yearIndex] || 0), 0);
//     useEffect(() => { setFormData(prev => ({...prev, proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({...row, years: budgetYears.map((_, i) => row.years?.[i] || '')}))})) }, [budgetYears]);

//     // --- DESIGN: Neo-Brutalism Reusable Components & Classes (with Lighter Shadows) ---
//     const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );
//     const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => ( <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300", className)}>{children}</button> );
//     const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
//     const checkboxClasses = "size-6 shrink-0 appearance-none bg-white border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.25)] checked:bg-black checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat";
    
//     // --- DESIGN: Dynamic Field Renderer (Unchanged) ---
//     const renderField = (fieldname: string) => {
//         const field = fields.find(f => f.fieldname === fieldname);
//         if (!field || field.hidden) return null;
//         const value = formData[field.fieldname];
//         const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only };
//         const renderInput = () => {
//              switch (field.fieldtype) {
//                 case "Link": return (<select {...commonProps} value={value || ''} onChange={e => { if(field.fieldname === 'pi_webmail'){handlePiWebmailChange(e.target.value)} else if(field.fieldname === 'funding_agen'){handleFundingAgencyChange(e.target.value)} else {handleChange(field.fieldname, e.target.value)}} }><option value="">Select...</option>{(linkOptions[field.fieldname] || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
//                 case "Select": return (<select {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(field.options?.split('\n').filter(o=>o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
//                 case "Text": case "Small Text": return <textarea {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} rows={5} className={`${inputClasses} h-auto py-3`}></textarea>;
//                 case "Check": return (<label className="flex items-center gap-4 font-bold text-black text-lg cursor-pointer"><input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => handleChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only}/><span>{field.label}{field.mandatory && <span className="text-red-500">*</span>}</span></label>);
//                 case "Date": return <input type="date" {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
//                 case "Attach": return <input type="file" {...commonProps} className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-bold file:bg-cyan-300 file:text-black hover:file:bg-cyan-400`} onChange={e => handleFileChange(field.fieldname, e.target.files?.[0] || null)} />;
//                 default: return <input type={(['Int', 'Currency', 'Float'].includes(field.fieldtype)) ? 'number' : 'text'} {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
//             }
//         };
//         if (field.fieldtype === 'Check') return renderInput();
//         return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-black text-lg">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}{field.description && <p className="text-sm text-gray-700 font-mono mt-2">{field.description}</p>}</div>);
//     };
    
//     // --- DESIGN: Table Renderers (Unchanged) ---
//     const renderGenericTable = (tableName: string, columns: { key: string, label: string, type: string }[], newRow: object) => (<div><div className="overflow-x-auto border-2 border-black rounded-md"><table className="min-w-full divide-y-2 divide-black"><thead className="bg-cyan-300"><tr className="divide-x-2 divide-black">{[...columns, {key:'actions', label:'Actions', type:'action'}].map(c => <th key={c.key} className="p-3 font-bold text-black uppercase">{c.label}</th>)}</tr></thead><tbody className="divide-y-2 divide-black bg-white">{(formData[tableName] || []).map((row: any, i: number) => (<tr key={i} className="divide-x-2 divide-black">{columns.map(col => (<td key={col.key} className="p-2">{col.type === 'file' ? <input type="file" className={`${inputClasses} !h-11 !py-2`} onChange={e => handleTableFileChange(tableName, i, col.key, e.target.files?.[0]||null)} /> : <input type={col.type} className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => { const value = col.key === 'salary' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value; handleTableRowChange(tableName, i, col.key, value); }} />}</td>))}{<td className="p-2"><NeoButton onClick={() => deleteTableRow(tableName, i)} className="bg-red-500 text-white w-full text-sm !py-2">Delete</NeoButton></td>}</tr>))}</tbody></table></div><NeoButton onClick={() => addTableRow(tableName, newRow)} className="bg-green-400 mt-4">Add Row</NeoButton></div>);
//     const renderCollaboratorTable = (tableName: string, title: string) => { const prefix = tableName === 'co_investigator_table' ? 'copi' : 'pi'; const newRow = { [`${prefix}_name`]: '', [`${prefix}_email`]: '', [`${prefix}_designation`]: '', [`${prefix}_address`]: '', [`${prefix}_contact`]: '' }; return (<div><h3 className="text-2xl font-bold uppercase text-black mb-4">{title}</h3><div className="overflow-x-auto border-2 border-black rounded-md"><table className="min-w-full divide-y-2 divide-black"><thead className="bg-cyan-300"><tr className="divide-x-2 divide-black">{["Name*", "Email ID*", "Designation*", "Address*", "Contact*", "Actions"].map(h => <th key={h} className="p-3 font-bold text-black uppercase">{h}</th>)}</tr></thead><tbody className="divide-y-2 divide-black bg-white">{(formData[tableName] || []).map((row: any, i: number) => (<tr key={i} className="divide-x-2 divide-black"><td className="p-2"><select className={`${inputClasses} !h-11`} value={row[`${prefix}_email`] || ''} onChange={e => handleCollaboratorChange(tableName, i, e.target.value)}><option value="">Select Person...</option>{(linkOptions['pi_webmail'] || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></td><td className="p-2"><input type="email" readOnly className={`${inputClasses} !h-11 bg-gray-200`} value={row[`${prefix}_email`] || ''} /></td><td className="p-2"><input type="text" readOnly className={`${inputClasses} !h-11 bg-gray-200`} value={row[`${prefix}_designation`] || ''} /></td><td className="p-2"><input type="text" placeholder="Institute/Address" className={`${inputClasses} !h-11`} value={row[`${prefix}_address`] || ''} onChange={e => handleTableRowChange(tableName, i, `${prefix}_address`, e.target.value)} /></td><td className="p-2"><input type="tel" placeholder="10-digit #" maxLength={10} className={`${inputClasses} !h-11`} value={row[`${prefix}_contact`] || ''} onChange={e => handleTableRowChange(tableName, i, `${prefix}_contact`, e.target.value.replace(/[^0-9]/g, ''))} /></td><td className="p-2"><NeoButton onClick={() => deleteTableRow(tableName, i)} className="bg-red-500 text-white w-full text-sm !py-2">Delete</NeoButton></td></tr>))}</tbody></table></div><NeoButton onClick={() => addTableRow(tableName, newRow)} className="bg-green-400 mt-4">Add Collaborator</NeoButton></div>);};

//     // --- RENDER ---
//     if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-cyan-400 mx-auto"></div><p className="mt-4 text-2xl font-bold text-black">LOADING REGISTRATION FORM...</p></div></div>;
//     const tabButtons = ["Project Details", "PI & Collaborators", "Budget", "Clearance", "Sanction & Funds"];
    
//     const renderNextPrevButtons = (showPrev: boolean, showNext: boolean, isLast = false) => (
//         <div className="mt-8 flex justify-between items-center bg-white p-4 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//            <NeoButton onClick={() => setActiveTab(activeTab - 1)} className={cn("bg-white", !showPrev && 'invisible')}>Previous</NeoButton>
//            {isLast ? ( <div className="flex flex-col sm:flex-row gap-4"><NeoButton onClick={handleSaveDraft} disabled={isSubmitting || isSavingDraft} className="bg-white">{isSavingDraft ? 'SAVING...' : 'Save As Draft'}</NeoButton><NeoButton type="submit" disabled={isSubmitting || isSavingDraft || !isDraftSaved} className="bg-cyan-300">{isSubmitting ? 'SUBMITTING...' : 'Submit Registration'}</NeoButton></div> ) : ( <NeoButton onClick={() => setActiveTab(activeTab + 1)} className={cn("bg-cyan-300", !showNext && 'invisible')}>Next Section</NeoButton> )}
//        </div>
//     );
    
//     return (
//         <div className="bg-[#FDFCEC]">
//             <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
//             <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//                 <header className="mb-8">
//                     <h1 className="text-4xl md:text-5xl font-extrabold text-black tracking-tight uppercase">New Project Registration</h1>
//                     <p className="text-gray-700 mt-2 font-mono">Fill all sections to register a new project.</p>
//                 </header>
//                 <div className="border-b-2 border-black flex mb-8">
//                     {tabButtons.map((title, index) => ( <button key={index} type="button" onClick={() => setActiveTab(index)} className={cn("flex-1 py-4 px-2 font-bold text-black text-center transition-all border-r-2 border-black last:border-r-0 text-sm md:text-base", activeTab === index ? "bg-cyan-300" : "bg-white hover:bg-cyan-100")}>{title}</button> ))}
//                 </div>
                
//                 <form id="project-registration-form" onSubmit={handleSubmit}>
//                     <div className={activeTab === 0 ? 'block' : 'hidden'}><NeoCard className="space-y-8"><h2 className="text-3xl font-bold uppercase text-black">1. Project Description</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("pi_webmail")}{renderField("project_title")}</div>{renderField("project_type")}{formData.project_type === 'Consultancy' && renderField("consultancy_category")}{formData.project_type === 'Other' && renderField("other_project_type_name")}{formData.project_type === 'Research' && <div className='space-y-8'><NeoCard className="p-6 space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Funding Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("funding_agen")}{renderField("funding_agency_type")}{renderField("origin_of_funding_agency")}{renderField("funding_agency_ministry")}{renderField("funding_agency_schemes")}</div></NeoCard><NeoCard className="p-6 space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Agency Address</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("address_street_village_locality")}{renderField("address_state")}{renderField("address_postal_code")}{renderField("address_country")}</div></NeoCard></div>}{renderField("project_objective")}{renderField("project_deliverables")}{renderField("executive_summary")}<div className="grid grid-cols-1 md:grid-cols-2 gap-8">{formData.project_type !== 'Consultancy' ? renderField("project_duration_months") : renderField("project_duration_days")}</div>{renderField("upload_proj_prop")}</NeoCard>{renderNextPrevButtons(false, true)}</div>
//                     <div className={activeTab === 1 ? 'block' : 'hidden'}><NeoCard className="space-y-10"><h2 className="text-3xl font-bold uppercase text-black">2. Investigators & Collaborators</h2><NeoCard className="p-6 space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Principal Investigator (PI)</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("pi_employee_id")}{renderField("principal_investigator_name")}{renderField("designation")}{renderField("applicant_department")}</div></NeoCard><div className="space-y-6">{renderField("is_additional_pi")}{renderField("has_co_pi")}</div>{formData.is_additional_pi === 'Yes' && renderCollaboratorTable('additional_pi_table', 'Details of Additional PI(s)')}{formData.has_co_pi === 'Yes' && renderCollaboratorTable('co_investigator_table', 'Details of Co-PI(s)')}</NeoCard>{renderNextPrevButtons(true, true)}</div>
//                     <div className={activeTab === 2 ? 'block' : 'hidden'}><NeoCard className="space-y-8"><h2 className="text-3xl font-bold uppercase text-black">3. Proposed Budget</h2><p className="font-mono text-gray-700">Provide a detailed year-wise breakup of the proposed budget.</p><div className="overflow-x-auto border-2 border-black rounded-md"><table className="min-w-full divide-y-2 divide-black"><thead className="bg-cyan-300"><tr className="divide-x-2 divide-black"><th className="p-3 font-bold text-black uppercase">Budget Head</th>{budgetYears.map((year, index) => (<th key={index} className="p-3 font-bold text-black uppercase">Year {year} (₹)</th>))}<th className="p-3 font-bold text-black uppercase">Total (₹)</th><th className="p-3 font-bold text-black uppercase">Actions</th></tr></thead><tbody className="bg-white divide-y-2 divide-black">{(budgetTable).map((row, rowIndex) => { const rowTotal = (row.years || []).reduce((sum: number, val) => sum + Number(val || 0), 0); return (<tr key={rowIndex} className="divide-x-2 divide-black"><td className="p-2"><input type="text" className={`${inputClasses} !h-11`} placeholder="e.g., Equipment" value={row.head} onChange={(e) => handleTableRowChange('proposed_budget_breakup', rowIndex, 'head', e.target.value)} /></td>{(row.years || []).map((_, yearIndex) => (<td key={yearIndex} className="p-2"><input type="number" className={`${inputClasses} !h-11`} value={(row.years || [])[yearIndex] || ''} onChange={(e) => { const newYears = [...(row.years || [])]; newYears[yearIndex] = e.target.value; handleTableRowChange('proposed_budget_breakup', rowIndex, 'years', newYears);}} /></td>))}<td className="p-2 font-mono font-bold text-right pr-4">{rowTotal.toFixed(2)}</td><td className="p-2"><NeoButton type="button" className="table-action-button delete bg-red-500 hover:bg-red-600 text-white w-full !py-2 text-sm" onClick={() => deleteTableRow('proposed_budget_breakup', rowIndex)}>Delete</NeoButton></td></tr>)})}</tbody><tfoot className="bg-gray-200 border-t-2 border-black"><tr className="divide-x-2 divide-black"><th className="p-3 text-right font-bold text-black uppercase">Yearly Total</th>{budgetYears.map((_, yearIndex) => (<td key={yearIndex} className="p-3 font-bold text-black font-mono text-right pr-4">{Number(getYearTotal(yearIndex)).toFixed(2)}</td>))}<td className="p-3 font-bold text-black font-mono bg-gray-300 text-right pr-4">{totalBudgetAmount.toFixed(2)}</td><td className="p-3"></td></tr></tfoot></table></div><div className="flex flex-wrap gap-4"><NeoButton type="button" className="bg-green-400" onClick={() => addTableRow('proposed_budget_breakup', {head: '', years: budgetYears.map(() => '')})}>Add Budget Row</NeoButton><NeoButton type="button" className="bg-cyan-300" onClick={addBudgetYear} disabled={budgetYears.length >= 5}>Add Year</NeoButton><NeoButton type="button" className="bg-red-500 text-white" onClick={deleteLastBudgetYear}>Delete Last Year</NeoButton></div><div className="mt-6 flex justify-end"><div className="w-full md:w-1/3 space-y-2"><label className="block text-xl font-bold text-black">Grand Total (₹)</label><input type="text" className={`${inputClasses} text-xl font-bold bg-gray-200`} readOnly value={totalBudgetAmount.toFixed(2)} /></div></div><div className="space-y-6 border-t-2 border-black pt-8">{renderField("equipment_checkbox")}{renderField("manpower_checkbox")}</div>{formData.equipment_checkbox ? <div className="space-y-4"><h3 className="text-2xl font-bold uppercase text-black">Proposed Equipment</h3>{renderGenericTable('proposed_equipment_details', [{key: 'item_name', label: 'Equipment Name*', type: 'text'}, {key: 'cost', label: 'Cost (₹)', type: 'number'}], {item_name: '', cost: 0})}</div> : null}{formData.manpower_checkbox ? <div className="space-y-4"><h3 className="text-2xl font-bold uppercase text-black">Proposed Manpower</h3>{renderGenericTable('proposed_manpower_details', [{key: 'designation_name', label: 'Position*', type: 'text'}, {key: 'salary', label: 'Salary (₹)', type: 'number'}], {designation_name: '', salary: 0})}</div> : null}</NeoCard>{renderNextPrevButtons(true, true)}</div>
//                     <div className={activeTab === 3 ? 'block' : 'hidden'}><NeoCard className="space-y-8"><h2 className="text-3xl font-bold uppercase text-black">4. Clearance & Declaration</h2>{renderField("needs_committee_clearance")}{formData.needs_committee_clearance === 'Yes' && <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("committees")}{formData.committees === 'Other' && renderField("other_committee_specify")}</div>}{formData.committees === 'Biosafety Committee' && <NeoCard className="!shadow-[2px_2px_0px_rgba(0,0,0,0.25)] space-y-4"><h3 className="text-2xl font-bold uppercase text-black">Declaration</h3><div className="prose prose-sm max-w-none font-mono text-black border-2 border-black rounded-md p-4 bg-gray-100" dangerouslySetInnerHTML={{__html: "<p><strong>Biosafety Categories:</strong></p><ul class='list-disc list-inside'><li><strong>Category I:</strong>...</li><li><strong>Category II:</strong>...</li><li><strong>Category III:</strong>...</li></ul><p>In case of a multi-department/centre project...</p>"}}/>{renderField("declaration_html")}</NeoCard>}</NeoCard>{renderNextPrevButtons(true, true)}</div>
//                     <div className={activeTab === 4 ? 'block' : 'hidden'}><NeoCard className="space-y-10"><h2 className="text-3xl font-bold uppercase text-black">5. Sanction & Funds</h2><div className="space-y-6">{renderField("have_sanction_details")}{formData.have_sanction_details === 'Yes' && <NeoCard className="space-y-8 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Sanction Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("total_sanctioned_amount")}{renderField("sanctioned_letter_no")}{renderField("sanctioned_letter_date")}</div><div className="space-y-4"><h4 className="text-xl font-bold uppercase text-black">Sanctioned Budget</h4>{renderGenericTable('sanctioned_budget_breakup', [{key: 'head', label: 'Budget Head', type: 'text'}, {key: 'amount', label: 'Amount (₹)', type: 'number'}], {head: '', amount: 0})}</div><div className="space-y-4"><h4 className="text-xl font-bold uppercase text-black">Sanction Files</h4>{renderGenericTable('sanction_related_files', [{key: 'file', label: 'File', type: 'file'}], {file: null})}</div></NeoCard>}</div><div className="space-y-6">{renderField("have_fund_details")}{formData.have_fund_details === 'Yes' && <NeoCard className="space-y-8 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Fund Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("amount_received")}{renderField("iitg_bank_account_number")}{renderField("is_gst_invoice_issued")}</div><div className="space-y-4"><h4 className="text-xl font-bold uppercase text-black">Installment Details</h4>{renderGenericTable('fund_transactions', [{key: 'installmentNo', label: 'Installment No.', type: 'text'}, {key: 'dateReceived', label: 'Date Received', type: 'date'}, {key: 'amount', label: 'Amount (₹)', type: 'number'}], {installmentNo: '', dateReceived: '', amount: 0})}</div></NeoCard>}</div></NeoCard>{renderNextPrevButtons(true, false, true)}</div>
//                 </form>
//             </main>
//         </div>
//     );
// };

// export default ProjectRegistration;







// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=


// import React, { useState, useEffect } from 'react';
// import { AppSidebar } from "../components/RndSidebar";
// import useUserRoleCheck from "../components/UserRoleCheck"; // Ensure this path is correct
// import { useFrappePostCall } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils'; // Assumes a utility for classnames

// // --- LOGIC: TYPE DEFINITIONS (Unchanged) ---
// interface Field {
//     fieldname: string;
//     label: string;
//     fieldtype: string;
//     default?: any;
//     mandatory: boolean;
//     read_only: boolean;
//     hidden: boolean;
//     description?: string;
//     options?: string;
// }

// interface LinkOption {
//     value: string;
//     label: string;
//     designation?: string;
// }

// interface FormData {
//     [key: string]: any;
//     additional_pi_table?: any[];
//     co_investigator_table?: any[];
//     proposed_equipment_details?: any[];
//     proposed_manpower_details?: any[];
//     proposed_budget_breakup?: { head: string; years: (number | string)[] }[];
//     sanctioned_budget_breakup?: any[];
//     sanction_related_files?: any[];
//     fund_transactions?: any[];
// }

// const ProjectRegistration: React.FC = () => {
//     // --- LOGIC: STATE MANAGEMENT & API HOOKS (Unchanged) ---
//     const [activeTab, setActiveTab] = useState(0);
//     const [fields, setFields] = useState<Field[]>([]);
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [formData, setFormData] = useState<FormData>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [isSavingDraft, setIsSavingDraft] = useState(false);
//     const [docname, setDocname] = useState<string | null>(null);
//     const [budgetYears, setBudgetYears] = useState([1]);
//     const isPermanentEmployee = useUserRoleCheck();
//     const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_project_form_data');
//     const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_data');
//     const { call: saveDraft, result: saveResult, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_draft');
//     const { call: fetchPiDetails, result: piDetailsResult, error: piDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi');
//     const { call: fetchAgencyDetails, result: agencyDetailsResult, error: agencyDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_funding_agency_details');
//     const [isDraftSaved, setIsDraftSaved] = useState(false);

//     // --- LOGIC: DATA FETCHING & INITIALIZATION (with Fixes) ---
//     useEffect(() => { fetchFormData({}); }, [fetchFormData]);
//     useEffect(() => {
//         if (formDataResult && formDataResult.message.fields) {
//             const { fields: apiFields, link_options, prefill_data } = formDataResult.message;
//             setFields(apiFields);
//             setLinkOptions(link_options || {});
//             const initialFormData = { ...prefill_data, is_additional_pi: prefill_data?.is_additional_pi || 'No', has_co_pi: prefill_data?.has_co_pi || 'No', needs_committee_clearance: prefill_data?.needs_committee_clearance || 'No', have_sanction_details: prefill_data?.have_sanction_details || 'No', have_fund_details: prefill_data?.have_fund_details || 'No' };
//             setFormData(initialFormData);
//             setLoading(false);
//             if (prefill_data && prefill_data.pi_webmail) { fetchPiDetails({ user_email: prefill_data.pi_webmail }); }
//         }
//         if (formDataError || (formDataResult && formDataResult.message.error)) { console.error("❌ Failed to fetch form data:", formDataError || formDataResult.message.error); alert("Error fetching form data."); setLoading(false); }
//     }, [formDataResult, formDataError, fetchPiDetails]);
//     useEffect(() => { if (agencyDetailsResult?.message?.all) { const d = agencyDetailsResult.message.all; setFormData(p => ({ ...p, funding_agency_type: d.funding_agency_type_1, origin_of_funding_agency: d.origin_of_funding_agency, funding_agency_ministry: d.ministry_funding_agency, funding_agency_schemes: d.funding_agency_schemes, address_street_village_locality: d.fundingagency_address, address_state: d.fundingagency_state, address_postal_code: d.fundingagency_postalcode, address_country: d.fundingagency_country })); } }, [agencyDetailsResult]);
//     useEffect(() => {
//         if (piDetailsResult && piDetailsResult.message) {
//             const details = piDetailsResult.message;
//             let departmentLinkValue = '';
//             const departmentLabel = details.department || '';
//             if (departmentLabel && linkOptions['applicant_department']) {
//                 const matchedOption = linkOptions['applicant_department'].find(opt => opt.label === departmentLabel || opt.value === departmentLabel);
//                 departmentLinkValue = matchedOption?.value || '';
//             }
//             setFormData(prev => ({ ...prev, pi_employee_id: details.pi_employee_id || '', principal_investigator_name: details.principal_investigator_name || '', designation: details.designation || '', applicant_department: departmentLinkValue || prev.applicant_department }));
//         }
//     }, [piDetailsResult, linkOptions]);
//     useEffect(() => { if (activeTab === 1 && formData.pi_webmail && !formData.principal_investigator_name) { fetchPiDetails({ user_email: formData.pi_webmail }); } }, [activeTab, formData.pi_webmail, formData.principal_investigator_name, fetchPiDetails]);
//     useEffect(() => { if (submitResult) { alert(`Project registered: ${submitResult.message.docname}`); setDocname(submitResult.message.docname); } if (submitError) { alert(`Submission error: ${submitError.message}`); } setIsSubmitting(false); }, [submitResult, submitError]);
//     useEffect(() => { if (saveResult) { alert(`Draft saved: ${saveResult.message.docname}`); setDocname(saveResult.message.docname); setIsDraftSaved(true); } if (saveError) { alert(`Draft save error: ${saveError.message}`); } setIsSavingDraft(false); }, [saveResult, saveError]);

//     // --- LOGIC: EVENT HANDLERS (with Table Input Fix) ---
//     const handleChange = (fieldname: string, value: any, type?: string) => { setFormData(prev => ({ ...prev, [fieldname]: type === 'checkbox' ? (value ? 1 : 0) : value })); };
//     const handleFileChange = (fieldname: string, file: File | null) => { setFormData(prev => ({ ...prev, [fieldname]: file })); };
    
//     // FIX: Correctly update table row data without causing input focus loss
//     const handleTableRowChange = (tableName: string, rowIndex: number, fieldname: string, value: any) => {
//         setFormData(prev => {
//             const newTableData = [...(prev[tableName] || [])];
//             newTableData[rowIndex] = { ...newTableData[rowIndex], [fieldname]: value };
//             return { ...prev, [tableName]: newTableData };
//         });
//     };
    
//     const handleTableFileChange = (tableName: string, rowIndex: number, fieldname: string, file: File | null) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: file }; return { ...prev, [tableName]: t }; }); };
//     const addTableRow = (tableName: string, newRow: object) => { setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName] || []), newRow] })); };
//     const deleteTableRow = (tableName: string, rowIndex: number) => { setFormData(prev => ({ ...prev, [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex) })); };
//     const handlePiWebmailChange = (value: string) => { handleChange('pi_webmail', value); setFormData(prev => ({ ...prev, pi_employee_id: '', principal_investigator_name: '', designation: '', applicant_department: '' })); if (value) { fetchPiDetails({ user_email: value }); } };
//     const handleFundingAgencyChange = (agencyName: string) => { handleChange('funding_agen', agencyName); if (agencyName) { fetchAgencyDetails({ agency_name: agencyName }); } else { setFormData(prev => ({ ...prev, funding_agency_schemes: '', funding_agency_type: '', origin_of_funding_agency: '', funding_agency_ministry: '', address_country: '', address_street_village_locality: '', address_state: '', address_postal_code: '' })); } };
//     const handleCollaboratorChange = (tableName: string, rowIndex: number, selectedUserEmail: string) => { const user = (linkOptions['pi_webmail'] || []).find(c => c.value === selectedUserEmail); setFormData(prev => { const t = [...(prev[tableName] || [])]; const p = tableName === 'co_investigator_table' ? 'copi' : 'pi'; t[rowIndex] = { ...t[rowIndex], [`${p}_name`]: user?.label, [`${p}_email`]: user?.value, [`${p}_designation`]: user?.designation }; return { ...prev, [tableName]: t }; }); };

//     // --- LOGIC: FORM SUBMISSION (Unchanged) ---
//     const fileToBase64 = (file: File): Promise<{ file_name: string; file_data: string }> => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => res({ file_name: file.name, file_data: r.result as string }); r.onerror = e => rej(e); });
//     const prepareDataForApi = async () => { const data = JSON.parse(JSON.stringify(formData)); if (docname) { data.name = docname; } for (const k in formData) { const v = formData[k]; if (v instanceof File) { data[k] = await fileToBase64(v); } else if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { for (const rk in v[i]) { if (v[i][rk] instanceof File) { data[k][i][rk] = await fileToBase64(v[i][rk]); } } } } } return data; };
//     const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (isSubmitting || isSavingDraft) return; setIsSubmitting(true); try { const data = await prepareDataForApi(); await submitForm({ doc: data }); } catch (err) { alert("File processing error."); setIsSubmitting(false); } };
//     const handleSaveDraft = async () => { if (isSavingDraft || isSubmitting) return; setIsSavingDraft(true); try { const data = await prepareDataForApi(); await saveDraft({ doc_data: JSON.stringify(data) }); } catch (err) { alert("File processing error."); setIsSavingDraft(false); } };

//     // --- LOGIC: BUDGET TABLE (Unchanged) ---
//     const budgetTable = formData.proposed_budget_breakup || [];
//     const totalBudgetAmount = budgetTable.reduce((acc, row) => acc + (row.years || []).reduce((sum: number, val) => sum + Number(val || 0), 0), 0);
//     const addBudgetYear = () => { if (budgetYears.length < 5) { setBudgetYears(prev => [...prev, prev.length + 1]); } else { alert("Maximum of 5 years allowed."); } };
//     const deleteLastBudgetYear = () => { if (budgetYears.length > 1) setBudgetYears(prev => prev.slice(0, -1)); };
//     const getYearTotal = (yearIndex: number) => budgetTable.reduce((sum: number, row) => sum + Number((row.years || [])[yearIndex] || 0), 0);
//     useEffect(() => { setFormData(prev => ({...prev, proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({...row, years: budgetYears.map((_, i) => row.years?.[i] || '')}))})) }, [budgetYears]);

//     // --- DESIGN: Reusable Components & Classes (with Lighter Shadows) ---
//     const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );
//     const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => ( <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300", className)}>{children}</button> );
//     const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
//     const checkboxClasses = "size-6 shrink-0 appearance-none bg-white border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.25)] checked:bg-black checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat";
    
//     // --- DESIGN: Dynamic Field Renderer (with read-only text display) ---
//     const renderField = (fieldname: string) => {
//         const field = fields.find(f => f.fieldname === fieldname);
//         if (!field || field.hidden) return null;
//         const value = formData[field.fieldname];
//         const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only };
        
//         // FIX: If field is read-only and has a value, display it as plain text instead of a disabled input box
//         if (field.read_only && value) {
//             return (
//                 <div className='space-y-2'>
//                     <label className="block font-bold text-black text-lg">{field.label}</label>
//                     <p className="font-mono text-gray-800 text-base h-12 flex items-center">{value}</p>
//                 </div>
//             );
//         }

//         const renderInput = () => {
//              switch (field.fieldtype) {
//                 case "Link": return (<select {...commonProps} value={value || ''} onChange={e => { if(field.fieldname === 'pi_webmail'){handlePiWebmailChange(e.target.value)} else if(field.fieldname === 'funding_agen'){handleFundingAgencyChange(e.target.value)} else {handleChange(field.fieldname, e.target.value)}} }><option value="">Select...</option>{(linkOptions[field.fieldname] || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
//                 case "Select": return (<select {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(field.options?.split('\n').filter(o=>o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
//                 case "Text": case "Small Text": return <textarea {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} rows={5} className={`${inputClasses} h-auto py-3`}></textarea>;
//                 case "Check": return (<label className="flex items-center gap-4 font-bold text-black text-lg cursor-pointer"><input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => handleChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only}/><span>{field.label}{field.mandatory && <span className="text-red-500">*</span>}</span></label>);
//                 case "Date": return <input type="date" {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
//                 case "Attach": return <input type="file" {...commonProps} className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-bold file:bg-cyan-300 file:text-black hover:file:bg-cyan-400`} onChange={e => handleFileChange(field.fieldname, e.target.files?.[0] || null)} />;
//                 default: return <input type={(['Int', 'Currency', 'Float'].includes(field.fieldtype)) ? 'number' : 'text'} {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
//             }
//         };
//         if (field.fieldtype === 'Check') return renderInput();
//         return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-black text-lg">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}{field.description && <p className="text-sm text-gray-700 font-mono mt-2">{field.description}</p>}</div>);
//     };
    
//     // --- DESIGN: Table Renderers (Unchanged from previous version) ---
//     const renderGenericTable = (tableName: string, columns: { key: string, label: string, type: string }[], newRow: object) => (<div><div className="overflow-x-auto border-2 border-black rounded-md"><table className="min-w-full divide-y-2 divide-black"><thead className="bg-cyan-300"><tr className="divide-x-2 divide-black">{[...columns, {key:'actions', label:'Actions', type:'action'}].map(c => <th key={c.key} className="p-3 font-bold text-black uppercase">{c.label}</th>)}</tr></thead><tbody className="divide-y-2 divide-black bg-white">{(formData[tableName] || []).map((row: any, i: number) => (<tr key={i} className="divide-x-2 divide-black">{columns.map(col => (<td key={col.key} className="p-2">{col.type === 'file' ? <input type="file" className={`${inputClasses} !h-11 !py-2`} onChange={e => handleTableFileChange(tableName, i, col.key, e.target.files?.[0]||null)} /> : <input type={col.type} className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => { const value = col.key === 'salary' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value; handleTableRowChange(tableName, i, col.key, value); }} />}</td>))}{<td className="p-2"><NeoButton onClick={() => deleteTableRow(tableName, i)} className="bg-red-500 text-white w-full text-sm !py-2">Delete</NeoButton></td>}</tr>))}</tbody></table></div><NeoButton onClick={() => addTableRow(tableName, newRow)} className="bg-green-400 mt-4">Add Row</NeoButton></div>);
//     const renderCollaboratorTable = (tableName: string, title: string) => { const prefix = tableName === 'co_investigator_table' ? 'copi' : 'pi'; const newRow = { [`${prefix}_name`]: '', [`${prefix}_email`]: '', [`${prefix}_designation`]: '', [`${prefix}_address`]: '', [`${prefix}_contact`]: '' }; return (<div><h3 className="text-2xl font-bold uppercase text-black mb-4">{title}</h3><div className="overflow-x-auto border-2 border-black rounded-md"><table className="min-w-full divide-y-2 divide-black"><thead className="bg-cyan-300"><tr className="divide-x-2 divide-black">{["Name*", "Email ID*", "Designation*", "Address*", "Contact*", "Actions"].map(h => <th key={h} className="p-3 font-bold text-black uppercase">{h}</th>)}</tr></thead><tbody className="divide-y-2 divide-black bg-white">{(formData[tableName] || []).map((row: any, i: number) => (<tr key={i} className="divide-x-2 divide-black"><td className="p-2"><select className={`${inputClasses} !h-11`} value={row[`${prefix}_email`] || ''} onChange={e => handleCollaboratorChange(tableName, i, e.target.value)}><option value="">Select Person...</option>{(linkOptions['pi_webmail'] || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></td><td className="p-2"><input type="email" readOnly className={`${inputClasses} !h-11 bg-gray-200`} value={row[`${prefix}_email`] || ''} /></td><td className="p-2"><input type="text" readOnly className={`${inputClasses} !h-11 bg-gray-200`} value={row[`${prefix}_designation`] || ''} /></td><td className="p-2"><input type="text" placeholder="Institute/Address" className={`${inputClasses} !h-11`} value={row[`${prefix}_address`] || ''} onChange={e => handleTableRowChange(tableName, i, `${prefix}_address`, e.target.value)} /></td><td className="p-2"><input type="tel" placeholder="10-digit #" maxLength={10} className={`${inputClasses} !h-11`} value={row[`${prefix}_contact`] || ''} onChange={e => handleTableRowChange(tableName, i, `${prefix}_contact`, e.target.value.replace(/[^0-9]/g, ''))} /></td><td className="p-2"><NeoButton onClick={() => deleteTableRow(tableName, i)} className="bg-red-500 text-white w-full text-sm !py-2">Delete</NeoButton></td></tr>))}</tbody></table></div><NeoButton onClick={() => addTableRow(tableName, newRow)} className="bg-green-400 mt-4">Add Collaborator</NeoButton></div>);};

//     // --- RENDER ---
//     if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-cyan-400 mx-auto"></div><p className="mt-4 text-2xl font-bold text-black">LOADING REGISTRATION FORM...</p></div></div>;
//     const tabButtons = ["Project Details", "PI & Collaborators", "Budget", "Clearance", "Sanction & Funds"];
    
//     const renderNextPrevButtons = (showPrev: boolean, showNext: boolean, isLast = false) => (
//         <div className="mt-8 flex justify-between items-center bg-white p-4 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//            <NeoButton onClick={() => setActiveTab(activeTab - 1)} className={cn("bg-white", !showPrev && 'invisible')}>Previous</NeoButton>
//            {isLast ? ( <div className="flex flex-col sm:flex-row gap-4"><NeoButton onClick={handleSaveDraft} disabled={isSubmitting || isSavingDraft} className="bg-white">{isSavingDraft ? 'SAVING...' : 'Save As Draft'}</NeoButton><NeoButton type="submit" disabled={isSubmitting || isSavingDraft || !isDraftSaved} className="bg-cyan-300">{isSubmitting ? 'SUBMITTING...' : 'Submit Registration'}</NeoButton></div> ) : ( <NeoButton onClick={() => setActiveTab(activeTab + 1)} className={cn("bg-cyan-300", !showNext && 'invisible')}>Next Section</NeoButton> )}
//        </div>
//     );
    
//     return (
//         <div className="bg-[#FDFCEC]">
//             <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
//             <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//                 <header className="mb-8">
//                     <h1 className="text-4xl md:text-5xl font-extrabold text-black tracking-tight uppercase">New Project Registration</h1>
//                     <p className="text-gray-700 mt-2 font-mono">Fill all sections to register a new project.</p>
//                 </header>
//                 <div className="border-b-2 border-black flex mb-8">
//                     {tabButtons.map((title, index) => ( <button key={index} type="button" onClick={() => setActiveTab(index)} className={cn("flex-1 py-4 px-2 font-bold text-black text-center transition-all border-r-2 border-black last:border-r-0 text-sm md:text-base", activeTab === index ? "bg-cyan-300" : "bg-white hover:bg-cyan-100")}>{title}</button>))}
//                 </div>
                
//                 <form id="project-registration-form" onSubmit={handleSubmit}>
//                     <div className={activeTab === 0 ? 'block' : 'hidden'}><NeoCard className="space-y-8"><h2 className="text-3xl font-bold uppercase text-black">1. Project Description</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("pi_webmail")}{renderField("project_title")}</div>{renderField("project_type")}{formData.project_type === 'Consultancy' && renderField("consultancy_category")}{formData.project_type === 'Other' && renderField("other_project_type_name")}{formData.project_type === 'Research' && <div className='space-y-8'><NeoCard className="p-6 space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Funding Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("funding_agen")}{renderField("funding_agency_type")}{renderField("origin_of_funding_agency")}{renderField("funding_agency_ministry")}{renderField("funding_agency_schemes")}</div></NeoCard><NeoCard className="p-6 space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Agency Address</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("address_street_village_locality")}{renderField("address_state")}{renderField("address_postal_code")}{renderField("address_country")}</div></NeoCard></div>}{renderField("project_objective")}{renderField("project_deliverables")}{renderField("executive_summary")}<div className="grid grid-cols-1 md:grid-cols-2 gap-8">{formData.project_type !== 'Consultancy' ? renderField("project_duration_months") : renderField("project_duration_days")}</div>{renderField("upload_proj_prop")}</NeoCard>{renderNextPrevButtons(false, true)}</div>
//                     <div className={activeTab === 1 ? 'block' : 'hidden'}><NeoCard className="space-y-10"><h2 className="text-3xl font-bold uppercase text-black">2. Investigators & Collaborators</h2><NeoCard className="p-6 space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Principal Investigator (PI)</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("pi_employee_id")}{renderField("principal_investigator_name")}{renderField("designation")}{renderField("applicant_department")}</div></NeoCard><div className="space-y-6">{renderField("is_additional_pi")}{renderField("has_co_pi")}</div>{formData.is_additional_pi === 'Yes' && renderCollaboratorTable('additional_pi_table', 'Details of Additional PI(s)')}{formData.has_co_pi === 'Yes' && renderCollaboratorTable('co_investigator_table', 'Details of Co-PI(s)')}</NeoCard>{renderNextPrevButtons(true, true)}</div>
//                     <div className={activeTab === 2 ? 'block' : 'hidden'}><NeoCard className="space-y-8"><h2 className="text-3xl font-bold uppercase text-black">3. Proposed Budget</h2><p className="font-mono text-gray-700">Provide a detailed year-wise breakup of the proposed budget.</p><div className="overflow-x-auto border-2 border-black rounded-md"><table className="min-w-full divide-y-2 divide-black"><thead className="bg-cyan-300"><tr className="divide-x-2 divide-black"><th className="p-3 font-bold text-black uppercase">Budget Head</th>{budgetYears.map((year, index) => (<th key={index} className="p-3 font-bold text-black uppercase">Year {year} (₹)</th>))}<th className="p-3 font-bold text-black uppercase">Total (₹)</th><th className="p-3 font-bold text-black uppercase">Actions</th></tr></thead><tbody className="bg-white divide-y-2 divide-black">{(budgetTable).map((row, rowIndex) => { const rowTotal = (row.years || []).reduce((sum: number, val) => sum + Number(val || 0), 0); return (<tr key={rowIndex} className="divide-x-2 divide-black"><td className="p-2"><input type="text" className={`${inputClasses} !h-11`} placeholder="e.g., Equipment" value={row.head || ''} onChange={(e) => handleTableRowChange('proposed_budget_breakup', rowIndex, 'head', e.target.value)} /></td>{budgetYears.map((_, yearIndex) => (<td key={yearIndex} className="p-2"><input type="number" className={`${inputClasses} !h-11`} value={(row.years || [])[yearIndex] || ''} onChange={(e) => { const newYears = [...(row.years || [])]; newYears[yearIndex] = e.target.value; handleTableRowChange('proposed_budget_breakup', rowIndex, 'years', newYears);}} /></td>))}<td className="p-2 font-mono font-bold text-right pr-4">{rowTotal.toFixed(2)}</td><td className="p-2"><NeoButton type="button" className="table-action-button delete bg-red-500 hover:bg-red-600 text-white w-full !py-2 text-sm" onClick={() => deleteTableRow('proposed_budget_breakup', rowIndex)}>Delete</NeoButton></td></tr>)})}</tbody><tfoot className="bg-gray-200 border-t-2 border-black"><tr className="divide-x-2 divide-black"><th className="p-3 text-right font-bold text-black uppercase">Yearly Total</th>{budgetYears.map((_, yearIndex) => (<td key={yearIndex} className="p-3 font-bold text-black font-mono text-right pr-4">{Number(getYearTotal(yearIndex)).toFixed(2)}</td>))}<td className="p-3 font-bold text-black font-mono bg-gray-300 text-right pr-4">{totalBudgetAmount.toFixed(2)}</td><td className="p-3"></td></tr></tfoot></table></div><div className="flex flex-wrap gap-4"><NeoButton type="button" className="bg-green-400" onClick={() => addTableRow('proposed_budget_breakup', {head: '', years: budgetYears.map(() => '')})}>Add Budget Row</NeoButton><NeoButton type="button" className="bg-cyan-300" onClick={addBudgetYear} disabled={budgetYears.length >= 5}>Add Year</NeoButton><NeoButton type="button" className="bg-red-500 text-white" onClick={deleteLastBudgetYear}>Delete Last Year</NeoButton></div><div className="mt-6 flex justify-end"><div className="w-full md:w-1/3 space-y-2"><label className="block text-xl font-bold text-black">Grand Total (₹)</label><input type="text" className={`${inputClasses} text-xl font-bold bg-gray-200`} readOnly value={totalBudgetAmount.toFixed(2)} /></div></div><div className="space-y-6 border-t-2 border-black pt-8">{renderField("equipment_checkbox")}{renderField("manpower_checkbox")}</div>{formData.equipment_checkbox ? <div className="space-y-4"><h3 className="text-2xl font-bold uppercase text-black">Proposed Equipment</h3>{renderGenericTable('proposed_equipment_details', [{key: 'item_name', label: 'Equipment Name*', type: 'text'}, {key: 'cost', label: 'Cost (₹)', type: 'number'}], {item_name: '', cost: 0})}</div> : null}{formData.manpower_checkbox ? <div className="space-y-4"><h3 className="text-2xl font-bold uppercase text-black">Proposed Manpower</h3>{renderGenericTable('proposed_manpower_details', [{key: 'designation_name', label: 'Position*', type: 'text'}, {key: 'salary', label: 'Salary (₹)', type: 'number'}], {designation_name: '', salary: 0})}</div> : null}</NeoCard>{renderNextPrevButtons(true, true)}</div>
//                     <div className={activeTab === 3 ? 'block' : 'hidden'}><NeoCard className="space-y-8"><h2 className="text-3xl font-bold uppercase text-black">4. Clearance & Declaration</h2>{renderField("needs_committee_clearance")}{formData.needs_committee_clearance === 'Yes' && <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("committees")}{formData.committees === 'Other' && renderField("other_committee_specify")}</div>}{formData.committees === 'Biosafety Committee' && <NeoCard className="!shadow-[2px_2px_0px_rgba(0,0,0,0.25)] space-y-4"><h3 className="text-2xl font-bold uppercase text-black">Declaration</h3><div className="prose prose-sm max-w-none font-mono text-black border-2 border-black rounded-md p-4 bg-gray-100" dangerouslySetInnerHTML={{__html: "<p><strong>Biosafety Categories:</strong></p><ul class='list-disc list-inside'><li><strong>Category I:</strong>...</li><li><strong>Category II:</strong>...</li><li><strong>Category III:</strong>...</li></ul><p>In case of a multi-department/centre project...</p>"}}/>{renderField("declaration_html")}</NeoCard>}</NeoCard>{renderNextPrevButtons(true, true)}</div>
//                     <div className={activeTab === 4 ? 'block' : 'hidden'}><NeoCard className="space-y-10"><h2 className="text-3xl font-bold uppercase text-black">5. Sanction & Funds</h2><div className="space-y-6">{renderField("have_sanction_details")}{formData.have_sanction_details === 'Yes' && <NeoCard className="space-y-8 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Sanction Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("total_sanctioned_amount")}{renderField("sanctioned_letter_no")}{renderField("sanctioned_letter_date")}</div><div className="space-y-4"><h4 className="text-xl font-bold uppercase text-black">Sanctioned Budget</h4>{renderGenericTable('sanctioned_budget_breakup', [{key: 'head', label: 'Budget Head', type: 'text'}, {key: 'amount', label: 'Amount (₹)', type: 'number'}], {head: '', amount: 0})}</div><div className="space-y-4"><h4 className="text-xl font-bold uppercase text-black">Sanction Files</h4>{renderGenericTable('sanction_related_files', [{key: 'file', label: 'File', type: 'file'}], {file: null})}</div></NeoCard>}</div><div className="space-y-6">{renderField("have_fund_details")}{formData.have_fund_details === 'Yes' && <NeoCard className="space-y-8 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><h3 className="text-2xl font-bold uppercase text-black">Fund Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-8">{renderField("amount_received")}{renderField("iitg_bank_account_number")}{renderField("is_gst_invoice_issued")}</div><div className="space-y-4"><h4 className="text-xl font-bold uppercase text-black">Installment Details</h4>{renderGenericTable('fund_transactions', [{key: 'installmentNo', label: 'Installment No.', type: 'text'}, {key: 'dateReceived', label: 'Date Received', type: 'date'}, {key: 'amount', label: 'Amount (₹)', type: 'number'}], {installmentNo: '', dateReceived: '', amount: 0})}</div></NeoCard>}</div></NeoCard>{renderNextPrevButtons(true, false, true)}</div>
//                 </form>
//             </main>
//         </div>
//     );
// };

// export default ProjectRegistration;


// -=-=-=-=-=-=-=-=-v3



import React, { useState, useEffect } from 'react';
import { AppSidebar } from "../components/RndSidebar";
import useUserRoleCheck from "../components/UserRoleCheck";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string;
    label: string;
    fieldtype: string;
    default?: any;
    mandatory: boolean;
    read_only: boolean;
    hidden: boolean;
    description?: string;
    options?: string;
}

interface LinkOption {
    value: string;
    label: string;
    designation?: string;
}

interface FormData {
    [key: string]: any;
    additional_pi_table?: any[];
    co_investigator_table?: any[];
    proposed_equipment_details?: any[];
    proposed_manpower_details?: any[];
    proposed_budget_breakup?: { head: string; years: (number | string)[] }[];
    sanctioned_budget_breakup?: any[];
    sanction_related_files?: any[];
    fund_transactions?: any[];
}

const ProjectRegistration: React.FC = () => {
    // --- STATE MANAGEMENT & API HOOKS ---
    const [activeTab, setActiveTab] = useState(0);
    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [formData, setFormData] = useState<FormData>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [docname, setDocname] = useState<string | null>(null);
    const [budgetYears, setBudgetYears] = useState([1]);
    const isPermanentEmployee = useUserRoleCheck();
    
    // API calls
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_project_form_data');
    const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_data');
    const { call: saveDraft, result: saveResult, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_draft');
    const { call: fetchPiDetails, result: piDetailsResult, error: piDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi');
    const { call: fetchAgencyDetails, result: agencyDetailsResult, error: agencyDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_funding_agency_details');
    const [isDraftSaved, setIsDraftSaved] = useState(false);

    // --- DATA FETCHING & INITIALIZATION ---
    useEffect(() => { fetchFormData({}); }, [fetchFormData]);
    
    useEffect(() => {
        if (formDataResult && formDataResult.message.fields) {
            const { fields: apiFields, link_options, prefill_data } = formDataResult.message;
            setFields(apiFields);
            setLinkOptions(link_options || {});
            const initialFormData = { 
                ...prefill_data, 
                is_additional_pi: prefill_data?.is_additional_pi || 'No', 
                has_co_pi: prefill_data?.has_co_pi || 'No', 
                needs_committee_clearance: prefill_data?.needs_committee_clearance || 'No', 
                have_sanction_details: prefill_data?.have_sanction_details || 'No', 
                have_fund_details: prefill_data?.have_fund_details || 'No',
                // Initialize tables with empty arrays if not present
                proposed_budget_breakup: prefill_data?.proposed_budget_breakup || [{ head: '', years: [''] }],
                proposed_equipment_details: prefill_data?.proposed_equipment_details || [],
                proposed_manpower_details: prefill_data?.proposed_manpower_details || []
            };
            setFormData(initialFormData);
            setLoading(false);
            if (prefill_data && prefill_data.pi_webmail) { 
                fetchPiDetails({ user_email: prefill_data.pi_webmail }); 
            }
        }
        if (formDataError || (formDataResult && formDataResult.message.error)) { 
            console.error("❌ Failed to fetch form data:", formDataError || formDataResult.message.error); 
            alert("Error fetching form data."); 
            setLoading(false); 
        }
    }, [formDataResult, formDataError, fetchPiDetails]);

    useEffect(() => { 
        if (agencyDetailsResult?.message?.all) { 
            const d = agencyDetailsResult.message.all; 
            setFormData(p => ({ 
                ...p, 
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

    useEffect(() => {
        if (piDetailsResult && piDetailsResult.message) {
            const details = piDetailsResult.message;
            let departmentLinkValue = '';
            const departmentLabel = details.department || '';
            if (departmentLabel && linkOptions['applicant_department']) {
                const matchedOption = linkOptions['applicant_department'].find(opt => opt.label === departmentLabel || opt.value === departmentLabel);
                departmentLinkValue = matchedOption?.value || '';
            }
            setFormData(prev => ({ 
                ...prev, 
                pi_employee_id: details.pi_employee_id || '', 
                principal_investigator_name: details.principal_investigator_name || '', 
                designation: details.designation || '', 
                applicant_department: departmentLinkValue || prev.applicant_department 
            }));
        }
    }, [piDetailsResult, linkOptions]);

    useEffect(() => { 
        if (activeTab === 1 && formData.pi_webmail && !formData.principal_investigator_name) { 
            fetchPiDetails({ user_email: formData.pi_webmail }); 
        } 
    }, [activeTab, formData.pi_webmail, formData.principal_investigator_name, fetchPiDetails]);

    useEffect(() => { 
        if (submitResult) { 
            alert(`Project registered: ${submitResult.message.docname}`); 
            setDocname(submitResult.message.docname); 
        } 
        if (submitError) { 
            alert(`Submission error: ${submitError.message}`); 
        } 
        setIsSubmitting(false); 
    }, [submitResult, submitError]);

    useEffect(() => { 
        if (saveResult) { 
            alert(`Draft saved: ${saveResult.message.docname}`); 
            setDocname(saveResult.message.docname); 
            setIsDraftSaved(true); 
        } 
        if (saveError) { 
            alert(`Draft save error: ${saveError.message}`); 
        } 
        setIsSavingDraft(false); 
    }, [saveResult, saveError]);

    // --- FIXED EVENT HANDLERS ---
    const handleChange = (fieldname: string, value: any, type?: string) => { 
        setFormData(prev => ({ 
            ...prev, 
            [fieldname]: type === 'checkbox' ? (value ? 1 : 0) : value 
        })); 
    };

    const handleFileChange = (fieldname: string, file: File | null) => { 
        setFormData(prev => ({ ...prev, [fieldname]: file })); 
    };
    
    // FIXED: Proper table row update with stable references
    const handleTableRowChange = (tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const currentTable = prev[tableName] ? [...prev[tableName]] : [];
            const updatedRow = { 
                ...currentTable[rowIndex], 
                [fieldname]: value 
            };
            
            const updatedTable = [
                ...currentTable.slice(0, rowIndex),
                updatedRow,
                ...currentTable.slice(rowIndex + 1)
            ];
            
            return {
                ...prev,
                [tableName]: updatedTable
            };
        });
    };

    const handleTableFileChange = (tableName: string, rowIndex: number, fieldname: string, file: File | null) => { 
        setFormData(prev => { 
            const t = [...(prev[tableName] || [])]; 
            t[rowIndex] = { ...t[rowIndex], [fieldname]: file }; 
            return { ...prev, [tableName]: t }; 
        }); 
    };

    const addTableRow = (tableName: string, newRow: object) => { 
        setFormData(prev => ({ 
            ...prev, 
            [tableName]: [...(prev[tableName] || []), newRow] 
        })); 
    };

    const deleteTableRow = (tableName: string, rowIndex: number) => { 
        setFormData(prev => ({ 
            ...prev, 
            [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex) 
        })); 
    };

    const handlePiWebmailChange = (value: string) => { 
        handleChange('pi_webmail', value); 
        setFormData(prev => ({ 
            ...prev, 
            pi_employee_id: '', 
            principal_investigator_name: '', 
            designation: '', 
            applicant_department: '' 
        })); 
        if (value) { 
            fetchPiDetails({ user_email: value }); 
        } 
    };

    const handleFundingAgencyChange = (agencyName: string) => { 
        handleChange('funding_agen', agencyName); 
        if (agencyName) { 
            fetchAgencyDetails({ agency_name: agencyName }); 
        } else { 
            setFormData(prev => ({ 
                ...prev, 
                funding_agency_schemes: '', 
                funding_agency_type: '', 
                origin_of_funding_agency: '', 
                funding_agency_ministry: '', 
                address_country: '', 
                address_street_village_locality: '', 
                address_state: '', 
                address_postal_code: '' 
            })); 
        } 
    };

    const handleCollaboratorChange = (tableName: string, rowIndex: number, selectedUserEmail: string) => { 
        const user = (linkOptions['pi_webmail'] || []).find(c => c.value === selectedUserEmail); 
        setFormData(prev => { 
            const t = [...(prev[tableName] || [])]; 
            const p = tableName === 'co_investigator_table' ? 'copi' : 'pi'; 
            t[rowIndex] = { 
                ...t[rowIndex], 
                [`${p}_name`]: user?.label, 
                [`${p}_email`]: user?.value, 
                [`${p}_designation`]: user?.designation 
            }; 
            return { ...prev, [tableName]: t }; 
        }); 
    };

    // --- FORM SUBMISSION ---
    const fileToBase64 = (file: File): Promise<{ file_name: string; file_data: string }> => new Promise((res, rej) => { 
        const r = new FileReader(); 
        r.readAsDataURL(file); 
        r.onload = () => res({ file_name: file.name, file_data: r.result as string }); 
        r.onerror = e => rej(e); 
    });

    const prepareDataForApi = async () => { 
        const data = JSON.parse(JSON.stringify(formData)); 
        if (docname) { 
            data.name = docname; 
        } 
        for (const k in formData) { 
            const v = formData[k]; 
            if (v instanceof File) { 
                data[k] = await fileToBase64(v); 
            } else if (Array.isArray(v)) { 
                for (let i = 0; i < v.length; i++) { 
                    for (const rk in v[i]) { 
                        if (v[i][rk] instanceof File) { 
                            data[k][i][rk] = await fileToBase64(v[i][rk]); 
                        } 
                    } 
                } 
            } 
        } 
        return data; 
    };

    const handleSubmit = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (isSubmitting || isSavingDraft) return; 
        setIsSubmitting(true); 
        try { 
            const data = await prepareDataForApi(); 
            await submitForm({ doc: data }); 
        } catch (err) { 
            alert("File processing error."); 
            setIsSubmitting(false); 
        } 
    };

    const handleSaveDraft = async () => { 
        if (isSavingDraft || isSubmitting) return; 
        setIsSavingDraft(true); 
        try { 
            const data = await prepareDataForApi(); 
            await saveDraft({ doc_data: JSON.stringify(data) }); 
        } catch (err) { 
            alert("File processing error."); 
            setIsSavingDraft(false); 
        } 
    };

    // --- FIXED BUDGET TABLE LOGIC ---
    const budgetTable = formData.proposed_budget_breakup || [];
    const totalBudgetAmount = budgetTable.reduce((acc, row) => acc + (row.years || []).reduce((sum: number, val) => sum + Number(val || 0), 0), 0);
    
    const addBudgetYear = () => { 
        if (budgetYears.length < 5) { 
            setBudgetYears(prev => [...prev, prev.length + 1]);
            // Update existing rows with new year column
            setFormData(prev => ({
                ...prev,
                proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({
                    ...row,
                    years: [...(row.years || []), '']
                }))
            }));
        } else { 
            alert("Maximum of 5 years allowed."); 
        } 
    };

    const deleteLastBudgetYear = () => { 
        if (budgetYears.length > 1) {
            setBudgetYears(prev => prev.slice(0, -1));
            // Remove last year column from existing rows
            setFormData(prev => ({
                ...prev,
                proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({
                    ...row,
                    years: (row.years || []).slice(0, -1)
                }))
            }));
        }
    };

    const getYearTotal = (yearIndex: number) => budgetTable.reduce((sum: number, row) => sum + Number((row.years || [])[yearIndex] || 0), 0);

    // FIXED: Add budget row with proper year columns
    const addBudgetRow = () => {
        addTableRow('proposed_budget_breakup', { 
            head: '', 
            years: budgetYears.map(() => '') 
        });
    };

    // FIXED: Budget row change handler
    const handleBudgetRowChange = (rowIndex: number, fieldname: string, value: any, yearIndex?: number) => {
        if (fieldname === 'years' && yearIndex !== undefined) {
            setFormData(prev => {
                const currentTable = prev.proposed_budget_breakup ? [...prev.proposed_budget_breakup] : [];
                const currentRow = currentTable[rowIndex] || { head: '', years: [] };
                const updatedYears = [...(currentRow.years || [])];
                updatedYears[yearIndex] = value;
                
                const updatedRow = { 
                    ...currentRow, 
                    years: updatedYears 
                };
                
                const updatedTable = [
                    ...currentTable.slice(0, rowIndex),
                    updatedRow,
                    ...currentTable.slice(rowIndex + 1)
                ];
                
                return {
                    ...prev,
                    proposed_budget_breakup: updatedTable
                };
            });
        } else {
            handleTableRowChange('proposed_budget_breakup', rowIndex, fieldname, value);
        }
    };

    // --- REUSABLE COMPONENTS ---
    const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => ( 
        <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> 
    );

    const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => ( 
        <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300", className)}>{children}</button> 
    );

    const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
    const checkboxClasses = "size-6 shrink-0 appearance-none bg-white border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.25)] checked:bg-black checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat";

    // --- FIELD RENDERER ---
    const renderField = (fieldname: string) => {
        const field = fields.find(f => f.fieldname === fieldname);
        if (!field || field.hidden) return null;
        const value = formData[field.fieldname];
        const commonProps = { 
            id: field.fieldname, 
            name: field.fieldname, 
            className: inputClasses, 
            readOnly: field.read_only, 
            required: field.mandatory, 
            disabled: field.read_only 
        };
        
        if (field.read_only && value) {
            return (
                <div className='space-y-2'>
                    <label className="block font-bold text-black text-lg">{field.label}</label>
                    <p className="font-mono text-gray-800 text-base h-12 flex items-center px-1">{value}</p>
                </div>
            );
        }

        const renderInput = () => {
            switch (field.fieldtype) {
                case "Link":
                    return (
                        <select {...commonProps} value={value || ''} onChange={e => {
                            if(field.fieldname === 'pi_webmail') {
                                handlePiWebmailChange(e.target.value);
                            } else if(field.fieldname === 'funding_agen') {
                                handleFundingAgencyChange(e.target.value);
                            } else {
                                handleChange(field.fieldname, e.target.value);
                            }
                        }}>
                            <option value="">Select...</option>
                            {(linkOptions[field.fieldname] || []).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    );
                case "Select":
                    return (
                        <select {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)}>
                            <option value="">Select...</option>
                            {(field.options?.split('\n').filter(o=>o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    );
                case "Text":
                case "Small Text":
                    return <textarea {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} rows={5} className={`${inputClasses} h-auto py-3`}></textarea>;
                case "Check":
                    return (
                        <label className="flex items-center gap-4 font-bold text-black text-lg cursor-pointer">
                            <input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => handleChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only}/>
                            <span>{field.label}{field.mandatory && <span className="text-red-500">*</span>}</span>
                        </label>
                    );
                case "Date":
                    return <input type="date" {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
                case "Attach":
                    return <input type="file" {...commonProps} className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-bold file:bg-cyan-300 file:text-black hover:file:bg-cyan-400`} onChange={e => handleFileChange(field.fieldname, e.target.files?.[0] || null)} />;
                default:
                    return <input type={(['Int', 'Currency', 'Float'].includes(field.fieldtype)) ? 'number' : 'text'} {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
            }
        };

        if (field.fieldtype === 'Check') return renderInput();
        
        return (
            <div className='space-y-2'>
                <label htmlFor={field.fieldname} className="block font-bold text-black text-lg">
                    {field.label}{field.mandatory && <span className="text-red-500">*</span>}
                </label>
                {renderInput()}
                {field.description && <p className="text-sm text-gray-700 font-mono mt-2">{field.description}</p>}
            </div>
        );
    };

    // --- FIXED TABLE RENDERERS ---
    const renderGenericTable = (tableName: string, columns: { key: string, label: string, type: string }[], newRow: object) => (
        <div>
            <div className="overflow-x-auto border-2 border-black rounded-md">
                <table className="min-w-full divide-y-2 divide-black">
                    <thead className="bg-cyan-300">
                        <tr className="divide-x-2 divide-black">
                            {[...columns, {key:'actions', label:'Actions', type:'action'}].map(c => (
                                <th key={c.key} className="p-3 font-bold text-black uppercase">{c.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black bg-white">
                        {(formData[tableName] || []).map((row: any, i: number) => (
                            <tr key={i} className="divide-x-2 divide-black">
                                {columns.map(col => (
                                    <td key={col.key} className="p-2">
                                        {col.type === 'file' ? (
                                            <input 
                                                type="file" 
                                                className={`${inputClasses} !h-11 !py-2`} 
                                                onChange={e => handleTableFileChange(tableName, i, col.key, e.target.files?.[0]||null)} 
                                            />
                                        ) : (
                                            <input 
                                                type={col.type} 
                                                className={`${inputClasses} !h-11`} 
                                                value={row[col.key] || ''} 
                                                onChange={e => { 
                                                    const value = col.key === 'salary' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value; 
                                                    handleTableRowChange(tableName, i, col.key, value); 
                                                }} 
                                            />
                                        )}
                                    </td>
                                ))}
                                <td className="p-2">
                                    <NeoButton onClick={() => deleteTableRow(tableName, i)} className="bg-red-500 text-white w-full text-sm !py-2">
                                        Delete
                                    </NeoButton>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <NeoButton onClick={() => addTableRow(tableName, newRow)} className="bg-green-400 mt-4">
                Add Row
            </NeoButton>
        </div>
    );

    const renderCollaboratorTable = (tableName: string, title: string) => {
        const prefix = tableName === 'co_investigator_table' ? 'copi' : 'pi';
        const newRow = { 
            [`${prefix}_name`]: '', 
            [`${prefix}_email`]: '', 
            [`${prefix}_designation`]: '', 
            [`${prefix}_address`]: '', 
            [`${prefix}_contact`]: '' 
        };
        
        return (
            <div>
                <h3 className="text-2xl font-bold uppercase text-black mb-4">{title}</h3>
                <div className="overflow-x-auto border-2 border-black rounded-md">
                    <table className="min-w-full divide-y-2 divide-black">
                        <thead className="bg-cyan-300">
                            <tr className="divide-x-2 divide-black">
                                {["Name*", "Email ID*", "Designation*", "Address*", "Contact*", "Actions"].map(h => (
                                    <th key={h} className="p-3 font-bold text-black uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black bg-white">
                            {(formData[tableName] || []).map((row: any, i: number) => (
                                <tr key={i} className="divide-x-2 divide-black">
                                    <td className="p-2">
                                        <select 
                                            className={`${inputClasses} !h-11`} 
                                            value={row[`${prefix}_email`] || ''} 
                                            onChange={e => handleCollaboratorChange(tableName, i, e.target.value)}
                                        >
                                            <option value="">Select Person...</option>
                                            {(linkOptions['pi_webmail'] || []).map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input type="email" readOnly className={`${inputClasses} !h-11 bg-gray-200`} value={row[`${prefix}_email`] || ''} />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" readOnly className={`${inputClasses} !h-11 bg-gray-200`} value={row[`${prefix}_designation`] || ''} />
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            type="text" 
                                            placeholder="Institute/Address" 
                                            className={`${inputClasses} !h-11`} 
                                            value={row[`${prefix}_address`] || ''} 
                                            onChange={e => handleTableRowChange(tableName, i, `${prefix}_address`, e.target.value)} 
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            type="tel" 
                                            placeholder="10-digit #" 
                                            maxLength={10} 
                                            className={`${inputClasses} !h-11`} 
                                            value={row[`${prefix}_contact`] || ''} 
                                            onChange={e => handleTableRowChange(tableName, i, `${prefix}_contact`, e.target.value.replace(/[^0-9]/g, ''))} 
                                        />
                                    </td>
                                    <td className="p-2">
                                        <NeoButton onClick={() => deleteTableRow(tableName, i)} className="bg-red-500 text-white w-full text-sm !py-2">
                                            Delete
                                        </NeoButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <NeoButton onClick={() => addTableRow(tableName, newRow)} className="bg-green-400 mt-4">
                    Add Collaborator
                </NeoButton>
            </div>
        );
    };

    // --- FIXED BUDGET TABLE RENDERER ---
    const renderBudgetTable = () => (
        <div className="space-y-4">
            <div className="overflow-x-auto border-2 border-black rounded-md">
                <table className="min-w-full divide-y-2 divide-black">
                    <thead className="bg-cyan-300">
                        <tr className="divide-x-2 divide-black">
                            <th className="p-3 font-bold text-black uppercase">Budget Head</th>
                            {budgetYears.map((year, index) => (
                                <th key={index} className="p-3 font-bold text-black uppercase">Year {year} (₹)</th>
                            ))}
                            <th className="p-3 font-bold text-black uppercase">Total (₹)</th>
                            <th className="p-3 font-bold text-black uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-black">
                        {budgetTable.map((row, rowIndex) => {
                            const rowTotal = (row.years || []).reduce((sum: number, val) => sum + Number(val || 0), 0);
                            return (
                                <tr key={rowIndex} className="divide-x-2 divide-black">
                                    <td className="p-2">
                                        <input 
                                            type="text" 
                                            className={`${inputClasses} !h-11`} 
                                            placeholder="e.g., Equipment" 
                                            value={row.head || ''} 
                                            onChange={(e) => handleBudgetRowChange(rowIndex, 'head', e.target.value)} 
                                        />
                                    </td>
                                    {budgetYears.map((_, yearIndex) => (
                                        <td key={yearIndex} className="p-2">
                                            <input 
                                                type="number" 
                                                className={`${inputClasses} !h-11`} 
                                                value={(row.years || [])[yearIndex] || ''} 
                                                onChange={(e) => handleBudgetRowChange(rowIndex, 'years', e.target.value, yearIndex)} 
                                            />
                                        </td>
                                    ))}
                                    <td className="p-2 font-mono font-bold text-right pr-4">
                                        {rowTotal.toFixed(2)}
                                    </td>
                                    <td className="p-2">
                                        <NeoButton 
                                            type="button" 
                                            className="bg-red-500 hover:bg-red-600 text-white w-full !py-2 text-sm" 
                                            onClick={() => deleteTableRow('proposed_budget_breakup', rowIndex)}
                                        >
                                            Delete
                                        </NeoButton>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-200 border-t-2 border-black">
                        <tr className="divide-x-2 divide-black">
                            <th className="p-3 text-right font-bold text-black uppercase">Yearly Total</th>
                            {budgetYears.map((_, yearIndex) => (
                                <td key={yearIndex} className="p-3 font-bold text-black font-mono text-right pr-4">
                                    {Number(getYearTotal(yearIndex)).toFixed(2)}
                                </td>
                            ))}
                            <td className="p-3 font-bold text-black font-mono bg-gray-300 text-right pr-4">
                                {totalBudgetAmount.toFixed(2)}
                            </td>
                            <td className="p-3"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div className="flex flex-wrap gap-4">
                <NeoButton type="button" className="bg-green-400" onClick={addBudgetRow}>
                    Add Budget Row
                </NeoButton>
                <NeoButton type="button" className="bg-cyan-300" onClick={addBudgetYear} disabled={budgetYears.length >= 5}>
                    Add Year
                </NeoButton>
                <NeoButton type="button" className="bg-red-500 text-white" onClick={deleteLastBudgetYear}>
                    Delete Last Year
                </NeoButton>
            </div>
            
            <div className="mt-6 flex justify-end">
                <div className="w-full md:w-1/3 space-y-2">
                    <label className="block text-xl font-bold text-black">Grand Total (₹)</label>
                    <input 
                        type="text" 
                        className={`${inputClasses} text-xl font-bold bg-gray-200`} 
                        readOnly 
                        value={totalBudgetAmount.toFixed(2)} 
                    />
                </div>
            </div>
        </div>
    );

    // --- RENDER ---
    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-cyan-400 mx-auto"></div>
                <p className="mt-4 text-2xl font-bold text-black">LOADING REGISTRATION FORM...</p>
            </div>
        </div>
    );

    const tabButtons = ["Project Details", "PI & Collaborators", "Budget", "Clearance", "Sanction & Funds"];
    
    const renderNextPrevButtons = (showPrev: boolean, showNext: boolean, isLast = false) => (
        <div className="mt-8 flex justify-between items-center bg-white p-4 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
            <NeoButton onClick={() => setActiveTab(activeTab - 1)} className={cn("bg-white", !showPrev && 'invisible')}>
                Previous
            </NeoButton>
            {isLast ? (
                <div className="flex flex-col sm:flex-row gap-4">
                    <NeoButton onClick={handleSaveDraft} disabled={isSubmitting || isSavingDraft} className="bg-white">
                        {isSavingDraft ? 'SAVING...' : 'Save As Draft'}
                    </NeoButton>
                    <NeoButton type="submit" disabled={isSubmitting || isSavingDraft || !isDraftSaved} className="bg-cyan-300 disabled:bg-gray-300">
                        {isSubmitting ? 'SUBMITTING...' : 'Submit Registration'}
                    </NeoButton>
                </div>
            ) : (
                <NeoButton onClick={() => setActiveTab(activeTab + 1)} className={cn("bg-cyan-300", !showNext && 'invisible')}>
                    Next Section
                </NeoButton>
            )}
        </div>
    );

    return (
        <div className="bg-[#FDFCEC]">
            <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-3">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight uppercase">
                        New Project Registration
                    </h1>
                    <p className="text-gray-700 mt-2 font-mono">
                        Fill all sections to register a new project.
                    </p>
                </header>
                
                <div className="border-b-2 border-black flex mb-8">
                    {tabButtons.map((title, index) => (
                        <button 
                            key={index} 
                            type="button" 
                            onClick={() => setActiveTab(index)}
                            className={cn(
                                "flex-1 py-4 px-2 font-bold text-black text-center transition-all border-r-2 border-black last:border-r-0 text-sm md:text-base",
                                activeTab === index ? "bg-cyan-300" : "bg-white hover:bg-cyan-100"
                            )}
                        >
                            {title}
                        </button>
                    ))}
                </div>
                
                <form id="project-registration-form" onSubmit={handleSubmit}>
                    {/* Tab 0: Project Details */}
                    <div className={activeTab === 0 ? 'block' : 'hidden'}>
                        <NeoCard className="space-y-8">
                            <h2 className="text-3xl font-bold uppercase text-black">1. Project Description</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {renderField("pi_webmail")}
                                {renderField("project_title")}
                            </div>
                            {renderField("project_type")}
                            {formData.project_type === 'Consultancy' && renderField("consultancy_category")}
                            {formData.project_type === 'Other' && renderField("other_project_type_name")}
                            {formData.project_type === 'Research' && (
                                <div className='space-y-8'>
                                    <NeoCard className="p-6 space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                                        <h3 className="text-2xl font-bold uppercase text-black">Funding Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {renderField("funding_agen")}
                                            {renderField("funding_agency_type")}
                                            {renderField("origin_of_funding_agency")}
                                            {renderField("funding_agency_ministry")}
                                            {renderField("funding_agency_schemes")}
                                        </div>
                                    </NeoCard>
                                    <NeoCard className="p-6 space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                                        <h3 className="text-2xl font-bold uppercase text-black">Agency Address</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {renderField("address_street_village_locality")}
                                            {renderField("address_state")}
                                            {renderField("address_postal_code")}
                                            {renderField("address_country")}
                                        </div>
                                    </NeoCard>
                                </div>
                            )}
                            {renderField("project_objective")}
                            {renderField("project_deliverables")}
                            {renderField("executive_summary")}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {formData.project_type !== 'Consultancy' ? 
                                    renderField("project_duration_months") : 
                                    renderField("project_duration_days")
                                }
                            </div>
                            {renderField("upload_proj_prop")}
                        </NeoCard>
                        {renderNextPrevButtons(false, true)}
                    </div>

                    {/* Tab 1: PI & Collaborators */}
                    <div className={activeTab === 1 ? 'block' : 'hidden'}>
                        <NeoCard className="space-y-10">
                            <h2 className="text-3xl font-bold uppercase text-black">2. Investigators & Collaborators</h2>
                            <div className="p-6 space-y-6 border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                                <h3 className="text-2xl font-bold uppercase text-black">Principal Investigator (PI)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    {renderField("pi_employee_id")}
                                    {renderField("principal_investigator_name")}
                                    {renderField("designation")}
                                    {renderField("applicant_department")}
                                </div>
                            </div>
                            <div className="space-y-6">
                                {renderField("is_additional_pi")}
                                {renderField("has_co_pi")}
                            </div>
                            {formData.is_additional_pi === 'Yes' && renderCollaboratorTable('additional_pi_table', 'Details of Additional PI(s)')}
                            {formData.has_co_pi === 'Yes' && renderCollaboratorTable('co_investigator_table', 'Details of Co-PI(s)')}
                        </NeoCard>
                        {renderNextPrevButtons(true, true)}
                    </div>

                    {/* Tab 2: Budget - FIXED */}
                    <div className={activeTab === 2 ? 'block' : 'hidden'}>
                        <NeoCard className="space-y-8">
                            <h2 className="text-3xl font-bold uppercase text-black">3. Proposed Budget</h2>
                            <p className="font-mono text-gray-700">
                                Provide a detailed year-wise breakup of the proposed budget.
                            </p>
                            
                            {/* FIXED: Using the new budget table renderer */}
                            {renderBudgetTable()}
                            
                            <div className="space-y-6 border-t-2 border-black pt-8">
                                {renderField("equipment_checkbox")}
                                {renderField("manpower_checkbox")}
                            </div>
                            
                            {formData.equipment_checkbox && (
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-bold uppercase text-black">Proposed Equipment</h3>
                                    {renderGenericTable('proposed_equipment_details', [
                                        {key: 'item_name', label: 'Equipment Name*', type: 'text'}, 
                                        {key: 'cost', label: 'Cost (₹)', type: 'number'}
                                    ], {item_name: '', cost: 0})}
                                </div>
                            )}
                            
                            {formData.manpower_checkbox && (
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-bold uppercase text-black">Proposed Manpower</h3>
                                    {renderGenericTable('proposed_manpower_details', [
                                        {key: 'designation_name', label: 'Position*', type: 'text'}, 
                                        {key: 'salary', label: 'Salary (₹)', type: 'number'}
                                    ], {designation_name: '', salary: 0})}
                                </div>
                            )}
                        </NeoCard>
                        {renderNextPrevButtons(true, true)}
                    </div>

                    {/* Tab 3: Clearance */}
                    <div className={activeTab === 3 ? 'block' : 'hidden'}>
                        <NeoCard className="space-y-8">
                            <h2 className="text-3xl font-bold uppercase text-black">4. Clearance & Declaration</h2>
                            {renderField("needs_committee_clearance")}
                            {formData.needs_committee_clearance === 'Yes' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {renderField("committees")}
                                    {formData.committees === 'Other' && renderField("other_committee_specify")}
                                </div>
                            )}
                            {formData.committees === 'Biosafety Committee' && (
                                <NeoCard className="!shadow-[2px_2px_0px_rgba(0,0,0,0.25)] space-y-4">
                                    <h3 className="text-2xl font-bold uppercase text-black">Declaration</h3>
                                    <div className="prose prose-sm max-w-none font-mono text-black border-2 border-black rounded-md p-4 bg-gray-100" 
                                         dangerouslySetInnerHTML={{__html: "<p><strong>Biosafety Categories:</strong></p><ul class='list-disc list-inside'><li><strong>Category I:</strong>...</li><li><strong>Category II:</strong>...</li><li><strong>Category III:</strong>...</li></ul><p>In case of a multi-department/centre project...</p>"}}/>
                                    {renderField("declaration_html")}
                                </NeoCard>
                            )}
                        </NeoCard>
                        {renderNextPrevButtons(true, true)}
                    </div>

                    {/* Tab 4: Sanction & Funds */}
                    <div className={activeTab === 4 ? 'block' : 'hidden'}>
                        <NeoCard className="space-y-10">
                            <h2 className="text-3xl font-bold uppercase text-black">5. Sanction & Funds</h2>
                            <div className="space-y-6">
                                {renderField("have_sanction_details")}
                                {formData.have_sanction_details === 'Yes' && (
                                    <NeoCard className="space-y-8 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                                        <h3 className="text-2xl font-bold uppercase text-black">Sanction Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {renderField("total_sanctioned_amount")}
                                            {renderField("sanctioned_letter_no")}
                                            {renderField("sanctioned_letter_date")}
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-xl font-bold uppercase text-black">Sanctioned Budget</h4>
                                            {renderGenericTable('sanctioned_budget_breakup', [
                                                {key: 'head', label: 'Budget Head', type: 'text'}, 
                                                {key: 'amount', label: 'Amount (₹)', type: 'number'}
                                            ], {head: '', amount: 0})}
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-xl font-bold uppercase text-black">Sanction Files</h4>
                                            {renderGenericTable('sanction_related_files', [
                                                {key: 'file', label: 'File', type: 'file'}
                                            ], {file: null})}
                                        </div>
                                    </NeoCard>
                                )}
                            </div>
                            <div className="space-y-6">
                                {renderField("have_fund_details")}
                                {formData.have_fund_details === 'Yes' && (
                                    <NeoCard className="space-y-8 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                                        <h3 className="text-2xl font-bold uppercase text-black">Fund Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {renderField("amount_received")}
                                            {renderField("iitg_bank_account_number")}
                                            {renderField("is_gst_invoice_issued")}
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-xl font-bold uppercase text-black">Installment Details</h4>
                                            {renderGenericTable('fund_transactions', [
                                                {key: 'installmentNo', label: 'Installment No.', type: 'text'}, 
                                                {key: 'dateReceived', label: 'Date Received', type: 'date'}, 
                                                {key: 'amount', label: 'Amount (₹)', type: 'number'}
                                            ], {installmentNo: '', dateReceived: '', amount: 0})}
                                        </div>
                                    </NeoCard>
                                )}
                            </div>
                        </NeoCard>
                        {renderNextPrevButtons(true, false, true)}
                    </div>
                </form>
            </main>
        </div>
    );
};

export default ProjectRegistration;





// -=-=-=-=-=-=-=-=-=-=-=-= v5 font size


// import React, { useState, useEffect } from 'react';
// import { AppSidebar } from "../components/RndSidebar";
// import useUserRoleCheck from "../components/UserRoleCheck";
// import { useFrappePostCall } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils';

// // --- TYPE DEFINITIONS ---
// interface Field {
//     fieldname: string;
//     label: string;
//     fieldtype: string;
//     default?: any;
//     mandatory: boolean;
//     read_only: boolean;
//     hidden: boolean;
//     description?: string;
//     options?: string;
// }

// interface LinkOption {
//     value: string;
//     label: string;
//     designation?: string;
// }

// interface FormData {
//     [key: string]: any;
//     additional_pi_table?: any[];
//     co_investigator_table?: any[];
//     proposed_equipment_details?: any[];
//     proposed_manpower_details?: any[];
//     proposed_budget_breakup?: { head: string; years: (number | string)[] }[];
//     sanctioned_budget_breakup?: any[];
//     sanction_related_files?: any[];
//     fund_transactions?: any[];
// }

// const ProjectRegistration: React.FC = () => {
//     // --- STATE MANAGEMENT & API HOOKS ---
//     const [activeTab, setActiveTab] = useState(0);
//     const [fields, setFields] = useState<Field[]>([]);
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [formData, setFormData] = useState<FormData>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [isSavingDraft, setIsSavingDraft] = useState(false);
//     const [docname, setDocname] = useState<string | null>(null);
//     const [budgetYears, setBudgetYears] = useState([1]);
//     const isPermanentEmployee = useUserRoleCheck();
    
//     // API calls
//     const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_project_form_data');
//     const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_data');
//     const { call: saveDraft, result: saveResult, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_draft');
//     const { call: fetchPiDetails, result: piDetailsResult, error: piDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi');
//     const { call: fetchAgencyDetails, result: agencyDetailsResult, error: agencyDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_funding_agency_details');
//     const [isDraftSaved, setIsDraftSaved] = useState(false);

//     // --- DATA FETCHING & INITIALIZATION ---
//     useEffect(() => { fetchFormData({}); }, [fetchFormData]);
    
//     useEffect(() => {
//         if (formDataResult && formDataResult.message.fields) {
//             const { fields: apiFields, link_options, prefill_data } = formDataResult.message;
//             setFields(apiFields);
//             setLinkOptions(link_options || {});
//             const initialFormData = { 
//                 ...prefill_data, 
//                 is_additional_pi: prefill_data?.is_additional_pi || 'No', 
//                 has_co_pi: prefill_data?.has_co_pi || 'No', 
//                 needs_committee_clearance: prefill_data?.needs_committee_clearance || 'No', 
//                 have_sanction_details: prefill_data?.have_sanction_details || 'No', 
//                 have_fund_details: prefill_data?.have_fund_details || 'No',
//                 // Initialize tables with empty arrays if not present
//                 proposed_budget_breakup: prefill_data?.proposed_budget_breakup || [{ head: '', years: [''] }],
//                 proposed_equipment_details: prefill_data?.proposed_equipment_details || [],
//                 proposed_manpower_details: prefill_data?.proposed_manpower_details || []
//             };
//             setFormData(initialFormData);
//             setLoading(false);
//             if (prefill_data && prefill_data.pi_webmail) { 
//                 fetchPiDetails({ user_email: prefill_data.pi_webmail }); 
//             }
//         }
//         if (formDataError || (formDataResult && formDataResult.message.error)) { 
//             console.error("❌ Failed to fetch form data:", formDataError || formDataResult.message.error); 
//             alert("Error fetching form data."); 
//             setLoading(false); 
//         }
//     }, [formDataResult, formDataError, fetchPiDetails]);

//     useEffect(() => { 
//         if (agencyDetailsResult?.message?.all) { 
//             const d = agencyDetailsResult.message.all; 
//             setFormData(p => ({ 
//                 ...p, 
//                 funding_agency_type: d.funding_agency_type_1, 
//                 origin_of_funding_agency: d.origin_of_funding_agency, 
//                 funding_agency_ministry: d.ministry_funding_agency, 
//                 funding_agency_schemes: d.funding_agency_schemes, 
//                 address_street_village_locality: d.fundingagency_address, 
//                 address_state: d.fundingagency_state, 
//                 address_postal_code: d.fundingagency_postalcode, 
//                 address_country: d.fundingagency_country 
//             })); 
//         } 
//     }, [agencyDetailsResult]);

//     useEffect(() => {
//         if (piDetailsResult && piDetailsResult.message) {
//             const details = piDetailsResult.message;
//             let departmentLinkValue = '';
//             const departmentLabel = details.department || '';
//             if (departmentLabel && linkOptions['applicant_department']) {
//                 const matchedOption = linkOptions['applicant_department'].find(opt => opt.label === departmentLabel || opt.value === departmentLabel);
//                 departmentLinkValue = matchedOption?.value || '';
//             }
//             setFormData(prev => ({ 
//                 ...prev, 
//                 pi_employee_id: details.pi_employee_id || '', 
//                 principal_investigator_name: details.principal_investigator_name || '', 
//                 designation: details.designation || '', 
//                 applicant_department: departmentLinkValue || prev.applicant_department 
//             }));
//         }
//     }, [piDetailsResult, linkOptions]);

//     useEffect(() => { 
//         if (activeTab === 1 && formData.pi_webmail && !formData.principal_investigator_name) { 
//             fetchPiDetails({ user_email: formData.pi_webmail }); 
//         } 
//     }, [activeTab, formData.pi_webmail, formData.principal_investigator_name, fetchPiDetails]);

//     useEffect(() => { 
//         if (submitResult) { 
//             alert(`Project registered: ${submitResult.message.docname}`); 
//             setDocname(submitResult.message.docname); 
//         } 
//         if (submitError) { 
//             alert(`Submission error: ${submitError.message}`); 
//         } 
//         setIsSubmitting(false); 
//     }, [submitResult, submitError]);

//     useEffect(() => { 
//         if (saveResult) { 
//             alert(`Draft saved: ${saveResult.message.docname}`); 
//             setDocname(saveResult.message.docname); 
//             setIsDraftSaved(true); 
//         } 
//         if (saveError) { 
//             alert(`Draft save error: ${saveError.message}`); 
//         } 
//         setIsSavingDraft(false); 
//     }, [saveResult, saveError]);

//     // --- FIXED EVENT HANDLERS ---
//     const handleChange = (fieldname: string, value: any, type?: string) => { 
//         setFormData(prev => ({ 
//             ...prev, 
//             [fieldname]: type === 'checkbox' ? (value ? 1 : 0) : value 
//         })); 
//     };

//     const handleFileChange = (fieldname: string, file: File | null) => { 
//         setFormData(prev => ({ ...prev, [fieldname]: file })); 
//     };
    
//     // FIXED: Proper table row update with stable references
//     const handleTableRowChange = (tableName: string, rowIndex: number, fieldname: string, value: any) => {
//         setFormData(prev => {
//             const currentTable = prev[tableName] ? [...prev[tableName]] : [];
//             const updatedRow = { 
//                 ...currentTable[rowIndex], 
//                 [fieldname]: value 
//             };
            
//             const updatedTable = [
//                 ...currentTable.slice(0, rowIndex),
//                 updatedRow,
//                 ...currentTable.slice(rowIndex + 1)
//             ];
            
//             return {
//                 ...prev,
//                 [tableName]: updatedTable
//             };
//         });
//     };

//     const handleTableFileChange = (tableName: string, rowIndex: number, fieldname: string, file: File | null) => { 
//         setFormData(prev => { 
//             const t = [...(prev[tableName] || [])]; 
//             t[rowIndex] = { ...t[rowIndex], [fieldname]: file }; 
//             return { ...prev, [tableName]: t }; 
//         }); 
//     };

//     const addTableRow = (tableName: string, newRow: object) => { 
//         setFormData(prev => ({ 
//             ...prev, 
//             [tableName]: [...(prev[tableName] || []), newRow] 
//         })); 
//     };

//     const deleteTableRow = (tableName: string, rowIndex: number) => { 
//         setFormData(prev => ({ 
//             ...prev, 
//             [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex) 
//         })); 
//     };

//     const handlePiWebmailChange = (value: string) => { 
//         handleChange('pi_webmail', value); 
//         setFormData(prev => ({ 
//             ...prev, 
//             pi_employee_id: '', 
//             principal_investigator_name: '', 
//             designation: '', 
//             applicant_department: '' 
//         })); 
//         if (value) { 
//             fetchPiDetails({ user_email: value }); 
//         } 
//     };

//     const handleFundingAgencyChange = (agencyName: string) => { 
//         handleChange('funding_agen', agencyName); 
//         if (agencyName) { 
//             fetchAgencyDetails({ agency_name: agencyName }); 
//         } else { 
//             setFormData(prev => ({ 
//                 ...prev, 
//                 funding_agency_schemes: '', 
//                 funding_agency_type: '', 
//                 origin_of_funding_agency: '', 
//                 funding_agency_ministry: '', 
//                 address_country: '', 
//                 address_street_village_locality: '', 
//                 address_state: '', 
//                 address_postal_code: '' 
//             })); 
//         } 
//     };

//     const handleCollaboratorChange = (tableName: string, rowIndex: number, selectedUserEmail: string) => { 
//         const user = (linkOptions['pi_webmail'] || []).find(c => c.value === selectedUserEmail); 
//         setFormData(prev => { 
//             const t = [...(prev[tableName] || [])]; 
//             const p = tableName === 'co_investigator_table' ? 'copi' : 'pi'; 
//             t[rowIndex] = { 
//                 ...t[rowIndex], 
//                 [`${p}_name`]: user?.label, 
//                 [`${p}_email`]: user?.value, 
//                 [`${p}_designation`]: user?.designation 
//             }; 
//             return { ...prev, [tableName]: t }; 
//         }); 
//     };

//     // --- FORM SUBMISSION ---
//     const fileToBase64 = (file: File): Promise<{ file_name: string; file_data: string }> => new Promise((res, rej) => { 
//         const r = new FileReader(); 
//         r.readAsDataURL(file); 
//         r.onload = () => res({ file_name: file.name, file_data: r.result as string }); 
//         r.onerror = e => rej(e); 
//     });

//     const prepareDataForApi = async () => { 
//         const data = JSON.parse(JSON.stringify(formData)); 
//         if (docname) { 
//             data.name = docname; 
//         } 
//         for (const k in formData) { 
//             const v = formData[k]; 
//             if (v instanceof File) { 
//                 data[k] = await fileToBase64(v); 
//             } else if (Array.isArray(v)) { 
//                 for (let i = 0; i < v.length; i++) { 
//                     for (const rk in v[i]) { 
//                         if (v[i][rk] instanceof File) { 
//                             data[k][i][rk] = await fileToBase64(v[i][rk]); 
//                         } 
//                     } 
//                 } 
//             } 
//         } 
//         return data; 
//     };

//     const handleSubmit = async (e: React.FormEvent) => { 
//         e.preventDefault(); 
//         if (isSubmitting || isSavingDraft) return; 
//         setIsSubmitting(true); 
//         try { 
//             const data = await prepareDataForApi(); 
//             await submitForm({ doc: data }); 
//         } catch (err) { 
//             alert("File processing error."); 
//             setIsSubmitting(false); 
//         } 
//     };

//     const handleSaveDraft = async () => { 
//         if (isSavingDraft || isSubmitting) return; 
//         setIsSavingDraft(true); 
//         try { 
//             const data = await prepareDataForApi(); 
//             await saveDraft({ doc_data: JSON.stringify(data) }); 
//         } catch (err) { 
//             alert("File processing error."); 
//             setIsSavingDraft(false); 
//         } 
//     };

//     // --- FIXED BUDGET TABLE LOGIC ---
//     const budgetTable = formData.proposed_budget_breakup || [];
//     const totalBudgetAmount = budgetTable.reduce((acc, row) => acc + (row.years || []).reduce((sum: number, val) => sum + Number(val || 0), 0), 0);
    
//     const addBudgetYear = () => { 
//         if (budgetYears.length < 5) { 
//             setBudgetYears(prev => [...prev, prev.length + 1]);
//             // Update existing rows with new year column
//             setFormData(prev => ({
//                 ...prev,
//                 proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({
//                     ...row,
//                     years: [...(row.years || []), '']
//                 }))
//             }));
//         } else { 
//             alert("Maximum of 5 years allowed."); 
//         } 
//     };

//     const deleteLastBudgetYear = () => { 
//         if (budgetYears.length > 1) {
//             setBudgetYears(prev => prev.slice(0, -1));
//             // Remove last year column from existing rows
//             setFormData(prev => ({
//                 ...prev,
//                 proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({
//                     ...row,
//                     years: (row.years || []).slice(0, -1)
//                 }))
//             }));
//         }
//     };

//     const getYearTotal = (yearIndex: number) => budgetTable.reduce((sum: number, row) => sum + Number((row.years || [])[yearIndex] || 0), 0);

//     // FIXED: Add budget row with proper year columns
//     const addBudgetRow = () => {
//         addTableRow('proposed_budget_breakup', { 
//             head: '', 
//             years: budgetYears.map(() => '') 
//         });
//     };

//     // FIXED: Budget row change handler
//     const handleBudgetRowChange = (rowIndex: number, fieldname: string, value: any, yearIndex?: number) => {
//         if (fieldname === 'years' && yearIndex !== undefined) {
//             setFormData(prev => {
//                 const currentTable = prev.proposed_budget_breakup ? [...prev.proposed_budget_breakup] : [];
//                 const currentRow = currentTable[rowIndex] || { head: '', years: [] };
//                 const updatedYears = [...(currentRow.years || [])];
//                 updatedYears[yearIndex] = value;
                
//                 const updatedRow = { 
//                     ...currentRow, 
//                     years: updatedYears 
//                 };
                
//                 const updatedTable = [
//                     ...currentTable.slice(0, rowIndex),
//                     updatedRow,
//                     ...currentTable.slice(rowIndex + 1)
//                 ];
                
//                 return {
//                     ...prev,
//                     proposed_budget_breakup: updatedTable
//                 };
//             });
//         } else {
//             handleTableRowChange('proposed_budget_breakup', rowIndex, fieldname, value);
//         }
//     };

//     // --- REUSABLE COMPONENTS ---
//     const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => ( 
//         <div className={cn("bg-white p-4 md:p-6 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> 
//     );

//     const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => ( 
//         <button type={type} onClick={onClick} disabled={disabled} className={cn("px-4 py-2 border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300", className)}>{children}</button> 
//     );

//     const inputClasses = "w-full h-10 px-3 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200 text-sm";
//     const checkboxClasses = "size-5 shrink-0 appearance-none bg-white border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.25)] checked:bg-black checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat";

//     // --- FIELD RENDERER ---
//     const renderField = (fieldname: string) => {
//         const field = fields.find(f => f.fieldname === fieldname);
//         if (!field || field.hidden) return null;
//         const value = formData[field.fieldname];
//         const commonProps = { 
//             id: field.fieldname, 
//             name: field.fieldname, 
//             className: inputClasses, 
//             readOnly: field.read_only, 
//             required: field.mandatory, 
//             disabled: field.read_only 
//         };
        
//         if (field.read_only && value) {
//             return (
//                 <div className='space-y-1'>
//                     <label className="block font-bold text-black text-base">{field.label}</label>
//                     <p className="font-mono text-gray-800 text-sm h-10 flex items-center px-1">{value}</p>
//                 </div>
//             );
//         }

//         const renderInput = () => {
//             switch (field.fieldtype) {
//                 case "Link":
//                     return (
//                         <select {...commonProps} value={value || ''} onChange={e => {
//                             if(field.fieldname === 'pi_webmail') {
//                                 handlePiWebmailChange(e.target.value);
//                             } else if(field.fieldname === 'funding_agen') {
//                                 handleFundingAgencyChange(e.target.value);
//                             } else {
//                                 handleChange(field.fieldname, e.target.value);
//                             }
//                         }}>
//                             <option value="">Select...</option>
//                             {(linkOptions[field.fieldname] || []).map(opt => (
//                                 <option key={opt.value} value={opt.value}>{opt.label}</option>
//                             ))}
//                         </select>
//                     );
//                 case "Select":
//                     return (
//                         <select {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)}>
//                             <option value="">Select...</option>
//                             {(field.options?.split('\n').filter(o=>o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
//                         </select>
//                     );
//                 case "Text":
//                 case "Small Text":
//                     return <textarea {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} rows={4} className={`${inputClasses} h-auto py-2`}></textarea>;
//                 case "Check":
//                     return (
//                         <label className="flex items-center gap-3 font-bold text-black text-base cursor-pointer">
//                             <input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => handleChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only}/>
//                             <span>{field.label}{field.mandatory && <span className="text-red-500">*</span>}</span>
//                         </label>
//                     );
//                 case "Date":
//                     return <input type="date" {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
//                 case "Attach":
//                     return <input type="file" {...commonProps} className={`${inputClasses} p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:font-bold file:bg-cyan-300 file:text-black hover:file:bg-cyan-400 file:text-sm`} onChange={e => handleFileChange(field.fieldname, e.target.files?.[0] || null)} />;
//                 default:
//                     return <input type={(['Int', 'Currency', 'Float'].includes(field.fieldtype)) ? 'number' : 'text'} {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
//             }
//         };

//         if (field.fieldtype === 'Check') return renderInput();
        
//         return (
//             <div className='space-y-1'>
//                 <label htmlFor={field.fieldname} className="block font-bold text-black text-base">
//                     {field.label}{field.mandatory && <span className="text-red-500">*</span>}
//                 </label>
//                 {renderInput()}
//                 {field.description && <p className="text-xs text-gray-700 font-mono mt-1">{field.description}</p>}
//             </div>
//         );
//     };

//     // --- FIXED TABLE RENDERERS ---
//     const renderGenericTable = (tableName: string, columns: { key: string, label: string, type: string }[], newRow: object) => (
//         <div>
//             <div className="overflow-x-auto border-2 border-black rounded-md">
//                 <table className="min-w-full divide-y-2 divide-black">
//                     <thead className="bg-cyan-300">
//                         <tr className="divide-x-2 divide-black">
//                             {[...columns, {key:'actions', label:'Actions', type:'action'}].map(c => (
//                                 <th key={c.key} className="p-2 font-bold text-black uppercase text-sm">{c.label}</th>
//                             ))}
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y-2 divide-black bg-white">
//                         {(formData[tableName] || []).map((row: any, i: number) => (
//                             <tr key={i} className="divide-x-2 divide-black">
//                                 {columns.map(col => (
//                                     <td key={col.key} className="p-1">
//                                         {col.type === 'file' ? (
//                                             <input 
//                                                 type="file" 
//                                                 className={`${inputClasses} !h-9 !py-1`} 
//                                                 onChange={e => handleTableFileChange(tableName, i, col.key, e.target.files?.[0]||null)} 
//                                             />
//                                         ) : (
//                                             <input 
//                                                 type={col.type} 
//                                                 className={`${inputClasses} !h-9`} 
//                                                 value={row[col.key] || ''} 
//                                                 onChange={e => { 
//                                                     const value = col.key === 'salary' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value; 
//                                                     handleTableRowChange(tableName, i, col.key, value); 
//                                                 }} 
//                                             />
//                                         )}
//                                     </td>
//                                 ))}
//                                 <td className="p-1">
//                                     <NeoButton onClick={() => deleteTableRow(tableName, i)} className="bg-red-500 text-white w-full text-xs !py-1">
//                                         Delete
//                                     </NeoButton>
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>
//             <NeoButton onClick={() => addTableRow(tableName, newRow)} className="bg-green-400 mt-3 text-sm">
//                 Add Row
//             </NeoButton>
//         </div>
//     );

//     const renderCollaboratorTable = (tableName: string, title: string) => {
//         const prefix = tableName === 'co_investigator_table' ? 'copi' : 'pi';
//         const newRow = { 
//             [`${prefix}_name`]: '', 
//             [`${prefix}_email`]: '', 
//             [`${prefix}_designation`]: '', 
//             [`${prefix}_address`]: '', 
//             [`${prefix}_contact`]: '' 
//         };
        
//         return (
//             <div>
//                 <h3 className="text-xl font-bold uppercase text-black mb-3">{title}</h3>
//                 <div className="overflow-x-auto border-2 border-black rounded-md">
//                     <table className="min-w-full divide-y-2 divide-black">
//                         <thead className="bg-cyan-300">
//                             <tr className="divide-x-2 divide-black">
//                                 {["Name*", "Email ID*", "Designation*", "Address*", "Contact*", "Actions"].map(h => (
//                                     <th key={h} className="p-2 font-bold text-black uppercase text-sm">{h}</th>
//                                 ))}
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y-2 divide-black bg-white">
//                             {(formData[tableName] || []).map((row: any, i: number) => (
//                                 <tr key={i} className="divide-x-2 divide-black">
//                                     <td className="p-1">
//                                         <select 
//                                             className={`${inputClasses} !h-9`} 
//                                             value={row[`${prefix}_email`] || ''} 
//                                             onChange={e => handleCollaboratorChange(tableName, i, e.target.value)}
//                                         >
//                                             <option value="">Select Person...</option>
//                                             {(linkOptions['pi_webmail'] || []).map(o => (
//                                                 <option key={o.value} value={o.value}>{o.label}</option>
//                                             ))}
//                                         </select>
//                                     </td>
//                                     <td className="p-1">
//                                         <input type="email" readOnly className={`${inputClasses} !h-9 bg-gray-200`} value={row[`${prefix}_email`] || ''} />
//                                     </td>
//                                     <td className="p-1">
//                                         <input type="text" readOnly className={`${inputClasses} !h-9 bg-gray-200`} value={row[`${prefix}_designation`] || ''} />
//                                     </td>
//                                     <td className="p-1">
//                                         <input 
//                                             type="text" 
//                                             placeholder="Institute/Address" 
//                                             className={`${inputClasses} !h-9`} 
//                                             value={row[`${prefix}_address`] || ''} 
//                                             onChange={e => handleTableRowChange(tableName, i, `${prefix}_address`, e.target.value)} 
//                                         />
//                                     </td>
//                                     <td className="p-1">
//                                         <input 
//                                             type="tel" 
//                                             placeholder="10-digit #" 
//                                             maxLength={10} 
//                                             className={`${inputClasses} !h-9`} 
//                                             value={row[`${prefix}_contact`] || ''} 
//                                             onChange={e => handleTableRowChange(tableName, i, `${prefix}_contact`, e.target.value.replace(/[^0-9]/g, ''))} 
//                                         />
//                                     </td>
//                                     <td className="p-1">
//                                         <NeoButton onClick={() => deleteTableRow(tableName, i)} className="bg-red-500 text-white w-full text-xs !py-1">
//                                             Delete
//                                         </NeoButton>
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//                 <NeoButton onClick={() => addTableRow(tableName, newRow)} className="bg-green-400 mt-3 text-sm">
//                     Add Collaborator
//                 </NeoButton>
//             </div>
//         );
//     };

//     // --- FIXED BUDGET TABLE RENDERER ---
//     const renderBudgetTable = () => (
//         <div className="space-y-3">
//             <div className="overflow-x-auto border-2 border-black rounded-md">
//                 <table className="min-w-full divide-y-2 divide-black">
//                     <thead className="bg-cyan-300">
//                         <tr className="divide-x-2 divide-black">
//                             <th className="p-2 font-bold text-black uppercase text-sm">Budget Head</th>
//                             {budgetYears.map((year, index) => (
//                                 <th key={index} className="p-2 font-bold text-black uppercase text-sm">Year {year} (₹)</th>
//                             ))}
//                             <th className="p-2 font-bold text-black uppercase text-sm">Total (₹)</th>
//                             <th className="p-2 font-bold text-black uppercase text-sm">Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody className="bg-white divide-y-2 divide-black">
//                         {budgetTable.map((row, rowIndex) => {
//                             const rowTotal = (row.years || []).reduce((sum: number, val) => sum + Number(val || 0), 0);
//                             return (
//                                 <tr key={rowIndex} className="divide-x-2 divide-black">
//                                     <td className="p-1">
//                                         <input 
//                                             type="text" 
//                                             className={`${inputClasses} !h-9`} 
//                                             placeholder="e.g., Equipment" 
//                                             value={row.head || ''} 
//                                             onChange={(e) => handleBudgetRowChange(rowIndex, 'head', e.target.value)} 
//                                         />
//                                     </td>
//                                     {budgetYears.map((_, yearIndex) => (
//                                         <td key={yearIndex} className="p-1">
//                                             <input 
//                                                 type="number" 
//                                                 className={`${inputClasses} !h-9`} 
//                                                 value={(row.years || [])[yearIndex] || ''} 
//                                                 onChange={(e) => handleBudgetRowChange(rowIndex, 'years', e.target.value, yearIndex)} 
//                                             />
//                                         </td>
//                                     ))}
//                                     <td className="p-1 font-mono font-bold text-right pr-3 text-sm">
//                                         {rowTotal.toFixed(2)}
//                                     </td>
//                                     <td className="p-1">
//                                         <NeoButton 
//                                             type="button" 
//                                             className="bg-red-500 hover:bg-red-600 text-white w-full text-xs !py-1" 
//                                             onClick={() => deleteTableRow('proposed_budget_breakup', rowIndex)}
//                                         >
//                                             Delete
//                                         </NeoButton>
//                                     </td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                     <tfoot className="bg-gray-200 border-t-2 border-black">
//                         <tr className="divide-x-2 divide-black">
//                             <th className="p-2 text-right font-bold text-black uppercase text-sm">Yearly Total</th>
//                             {budgetYears.map((_, yearIndex) => (
//                                 <td key={yearIndex} className="p-2 font-bold text-black font-mono text-right pr-3 text-sm">
//                                     {Number(getYearTotal(yearIndex)).toFixed(2)}
//                                 </td>
//                             ))}
//                             <td className="p-2 font-bold text-black font-mono bg-gray-300 text-right pr-3 text-sm">
//                                 {totalBudgetAmount.toFixed(2)}
//                             </td>
//                             <td className="p-2"></td>
//                         </tr>
//                     </tfoot>
//                 </table>
//             </div>
            
//             <div className="flex flex-wrap gap-3">
//                 <NeoButton type="button" className="bg-green-400 text-sm" onClick={addBudgetRow}>
//                     Add Budget Row
//                 </NeoButton>
//                 <NeoButton type="button" className="bg-cyan-300 text-sm" onClick={addBudgetYear} disabled={budgetYears.length >= 5}>
//                     Add Year
//                 </NeoButton>
//                 <NeoButton type="button" className="bg-red-500 text-white text-sm" onClick={deleteLastBudgetYear}>
//                     Delete Last Year
//                 </NeoButton>
//             </div>
            
//             <div className="mt-4 flex justify-end">
//                 <div className="w-full md:w-1/3 space-y-1">
//                     <label className="block text-lg font-bold text-black">Grand Total (₹)</label>
//                     <input 
//                         type="text" 
//                         className={`${inputClasses} text-lg font-bold bg-gray-200`} 
//                         readOnly 
//                         value={totalBudgetAmount.toFixed(2)} 
//                     />
//                 </div>
//             </div>
//         </div>
//     );

//     // --- RENDER ---
//     if (loading) return (
//         <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
//             <div className="text-center">
//                 <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-cyan-400 mx-auto"></div>
//                 <p className="mt-3 text-lg font-bold text-black">LOADING REGISTRATION FORM...</p>
//             </div>
//         </div>
//     );

//     const tabButtons = ["Project Details", "PI & Collaborators", "Budget", "Clearance", "Sanction & Funds"];
    
//     const renderNextPrevButtons = (showPrev: boolean, showNext: boolean, isLast = false) => (
//         <div className="mt-6 flex justify-between items-center bg-white p-3 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//             <NeoButton onClick={() => setActiveTab(activeTab - 1)} className={cn("bg-white text-sm", !showPrev && 'invisible')}>
//                 Previous
//             </NeoButton>
//             {isLast ? (
//                 <div className="flex flex-col sm:flex-row gap-3">
//                     <NeoButton onClick={handleSaveDraft} disabled={isSubmitting || isSavingDraft} className="bg-white text-sm">
//                         {isSavingDraft ? 'SAVING...' : 'Save As Draft'}
//                     </NeoButton>
//                     <NeoButton type="submit" disabled={isSubmitting || isSavingDraft || !isDraftSaved} className="bg-cyan-300 disabled:bg-gray-300 text-sm">
//                         {isSubmitting ? 'SUBMITTING...' : 'Submit Registration'}
//                     </NeoButton>
//                 </div>
//             ) : (
//                 <NeoButton onClick={() => setActiveTab(activeTab + 1)} className={cn("bg-cyan-300 text-sm", !showNext && 'invisible')}>
//                     Next Section
//                 </NeoButton>
//             )}
//         </div>
//     );

//     return (
//         <div className="bg-[#FDFCEC]">
//             <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
//             <main className="flex-1 p-3 md:p-6 w-full overflow-hidden">
//                 <header className="mb-3">
//                     <h1 className="text-2xl md:text-3xl font-extrabold text-black tracking-tight uppercase">
//                         New Project Registration
//                     </h1>
//                     <p className="text-gray-700 mt-1 font-mono text-sm">
//                         Fill all sections to register a new project.
//                     </p>
//                 </header>
                
//                 <div className="border-b-2 border-black flex mb-6">
//                     {tabButtons.map((title, index) => (
//                         <button 
//                             key={index} 
//                             type="button" 
//                             onClick={() => setActiveTab(index)}
//                             className={cn(
//                                 "flex-1 py-3 px-2 font-bold text-black text-center transition-all border-r-2 border-black last:border-r-0 text-xs md:text-sm",
//                                 activeTab === index ? "bg-cyan-300" : "bg-white hover:bg-cyan-100"
//                             )}
//                         >
//                             {title}
//                         </button>
//                     ))}
//                 </div>
                
//                 <form id="project-registration-form" onSubmit={handleSubmit}>
//                     {/* Tab 0: Project Details */}
//                     <div className={activeTab === 0 ? 'block' : 'hidden'}>
//                         <NeoCard className="space-y-6">
//                             <h2 className="text-2xl font-bold uppercase text-black">1. Project Description</h2>
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                 {renderField("pi_webmail")}
//                                 {renderField("project_title")}
//                             </div>
//                             {renderField("project_type")}
//                             {formData.project_type === 'Consultancy' && renderField("consultancy_category")}
//                             {formData.project_type === 'Other' && renderField("other_project_type_name")}
//                             {formData.project_type === 'Research' && (
//                                 <div className='space-y-6'>
//                                     <NeoCard className="p-4 space-y-4 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
//                                         <h3 className="text-xl font-bold uppercase text-black">Funding Details</h3>
//                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                             {renderField("funding_agen")}
//                                             {renderField("funding_agency_type")}
//                                             {renderField("origin_of_funding_agency")}
//                                             {renderField("funding_agency_ministry")}
//                                             {renderField("funding_agency_schemes")}
//                                         </div>
//                                     </NeoCard>
//                                     <NeoCard className="p-4 space-y-4 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
//                                         <h3 className="text-xl font-bold uppercase text-black">Agency Address</h3>
//                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                             {renderField("address_street_village_locality")}
//                                             {renderField("address_state")}
//                                             {renderField("address_postal_code")}
//                                             {renderField("address_country")}
//                                         </div>
//                                     </NeoCard>
//                                 </div>
//                             )}
//                             {renderField("project_objective")}
//                             {renderField("project_deliverables")}
//                             {renderField("executive_summary")}
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                 {formData.project_type !== 'Consultancy' ? 
//                                     renderField("project_duration_months") : 
//                                     renderField("project_duration_days")
//                                 }
//                             </div>
//                             {renderField("upload_proj_prop")}
//                         </NeoCard>
//                         {renderNextPrevButtons(false, true)}
//                     </div>

//                     {/* Tab 1: PI & Collaborators */}
//                     <div className={activeTab === 1 ? 'block' : 'hidden'}>
//                         <NeoCard className="space-y-8">
//                             <h2 className="text-2xl font-bold uppercase text-black">2. Investigators & Collaborators</h2>
//                             <div className="p-4 space-y-4 border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
//                                 <h3 className="text-xl font-bold uppercase text-black">Principal Investigator (PI)</h3>
//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
//                                     {renderField("pi_employee_id")}
//                                     {renderField("principal_investigator_name")}
//                                     {renderField("designation")}
//                                     {renderField("applicant_department")}
//                                 </div>
//                             </div>
//                             <div className="space-y-4">
//                                 {renderField("is_additional_pi")}
//                                 {renderField("has_co_pi")}
//                             </div>
//                             {formData.is_additional_pi === 'Yes' && renderCollaboratorTable('additional_pi_table', 'Details of Additional PI(s)')}
//                             {formData.has_co_pi === 'Yes' && renderCollaboratorTable('co_investigator_table', 'Details of Co-PI(s)')}
//                         </NeoCard>
//                         {renderNextPrevButtons(true, true)}
//                     </div>

//                     {/* Tab 2: Budget - FIXED */}
//                     <div className={activeTab === 2 ? 'block' : 'hidden'}>
//                         <NeoCard className="space-y-6">
//                             <h2 className="text-2xl font-bold uppercase text-black">3. Proposed Budget</h2>
//                             <p className="font-mono text-gray-700 text-sm">
//                                 Provide a detailed year-wise breakup of the proposed budget.
//                             </p>
                            
//                             {/* FIXED: Using the new budget table renderer */}
//                             {renderBudgetTable()}
                            
//                             <div className="space-y-4 border-t-2 border-black pt-6">
//                                 {renderField("equipment_checkbox")}
//                                 {renderField("manpower_checkbox")}
//                             </div>
                            
//                             {formData.equipment_checkbox && (
//                                 <div className="space-y-3">
//                                     <h3 className="text-xl font-bold uppercase text-black">Proposed Equipment</h3>
//                                     {renderGenericTable('proposed_equipment_details', [
//                                         {key: 'item_name', label: 'Equipment Name*', type: 'text'}, 
//                                         {key: 'cost', label: 'Cost (₹)', type: 'number'}
//                                     ], {item_name: '', cost: 0})}
//                                 </div>
//                             )}
                            
//                             {formData.manpower_checkbox && (
//                                 <div className="space-y-3">
//                                     <h3 className="text-xl font-bold uppercase text-black">Proposed Manpower</h3>
//                                     {renderGenericTable('proposed_manpower_details', [
//                                         {key: 'designation_name', label: 'Position*', type: 'text'}, 
//                                         {key: 'salary', label: 'Salary (₹)', type: 'number'}
//                                     ], {designation_name: '', salary: 0})}
//                                 </div>
//                             )}
//                         </NeoCard>
//                         {renderNextPrevButtons(true, true)}
//                     </div>

//                     {/* Tab 3: Clearance */}
//                     <div className={activeTab === 3 ? 'block' : 'hidden'}>
//                         <NeoCard className="space-y-6">
//                             <h2 className="text-2xl font-bold uppercase text-black">4. Clearance & Declaration</h2>
//                             {renderField("needs_committee_clearance")}
//                             {formData.needs_committee_clearance === 'Yes' && (
//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                     {renderField("committees")}
//                                     {formData.committees === 'Other' && renderField("other_committee_specify")}
//                                 </div>
//                             )}
//                             {formData.committees === 'Biosafety Committee' && (
//                                 <NeoCard className="!shadow-[2px_2px_0px_rgba(0,0,0,0.25)] space-y-3">
//                                     <h3 className="text-xl font-bold uppercase text-black">Declaration</h3>
//                                     <div className="prose prose-sm max-w-none font-mono text-black border-2 border-black rounded-md p-3 bg-gray-100 text-sm" 
//                                          dangerouslySetInnerHTML={{__html: "<p><strong>Biosafety Categories:</strong></p><ul class='list-disc list-inside'><li><strong>Category I:</strong>...</li><li><strong>Category II:</strong>...</li><li><strong>Category III:</strong>...</li></ul><p>In case of a multi-department/centre project...</p>"}}/>
//                                     {renderField("declaration_html")}
//                                 </NeoCard>
//                             )}
//                         </NeoCard>
//                         {renderNextPrevButtons(true, true)}
//                     </div>

//                     {/* Tab 4: Sanction & Funds */}
//                     <div className={activeTab === 4 ? 'block' : 'hidden'}>
//                         <NeoCard className="space-y-8">
//                             <h2 className="text-2xl font-bold uppercase text-black">5. Sanction & Funds</h2>
//                             <div className="space-y-4">
//                                 {renderField("have_sanction_details")}
//                                 {formData.have_sanction_details === 'Yes' && (
//                                     <NeoCard className="space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
//                                         <h3 className="text-xl font-bold uppercase text-black">Sanction Details</h3>
//                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                             {renderField("total_sanctioned_amount")}
//                                             {renderField("sanctioned_letter_no")}
//                                             {renderField("sanctioned_letter_date")}
//                                         </div>
//                                         <div className="space-y-3">
//                                             <h4 className="text-lg font-bold uppercase text-black">Sanctioned Budget</h4>
//                                             {renderGenericTable('sanctioned_budget_breakup', [
//                                                 {key: 'head', label: 'Budget Head', type: 'text'}, 
//                                                 {key: 'amount', label: 'Amount (₹)', type: 'number'}
//                                             ], {head: '', amount: 0})}
//                                         </div>
//                                         <div className="space-y-3">
//                                             <h4 className="text-lg font-bold uppercase text-black">Sanction Files</h4>
//                                             {renderGenericTable('sanction_related_files', [
//                                                 {key: 'file', label: 'File', type: 'file'}
//                                             ], {file: null})}
//                                         </div>
//                                     </NeoCard>
//                                 )}
//                             </div>
//                             <div className="space-y-4">
//                                 {renderField("have_fund_details")}
//                                 {formData.have_fund_details === 'Yes' && (
//                                     <NeoCard className="space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
//                                         <h3 className="text-xl font-bold uppercase text-black">Fund Details</h3>
//                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                             {renderField("amount_received")}
//                                             {renderField("iitg_bank_account_number")}
//                                             {renderField("is_gst_invoice_issued")}
//                                         </div>
//                                         <div className="space-y-3">
//                                             <h4 className="text-lg font-bold uppercase text-black">Installment Details</h4>
//                                             {renderGenericTable('fund_transactions', [
//                                                 {key: 'installmentNo', label: 'Installment No.', type: 'text'}, 
//                                                 {key: 'dateReceived', label: 'Date Received', type: 'date'}, 
//                                                 {key: 'amount', label: 'Amount (₹)', type: 'number'}
//                                             ], {installmentNo: '', dateReceived: '', amount: 0})}
//                                         </div>
//                                     </NeoCard>
//                                 )}
//                             </div>
//                         </NeoCard>
//                         {renderNextPrevButtons(true, false, true)}
//                     </div>
//                 </form>
//             </main>
//         </div>
//     );
// };

// export default ProjectRegistration;




// fix form upload



// import useUserRoleCheck from "../components/UserRoleCheck";
// import React, { useState, useEffect, useMemo, useCallback } from 'react';
// // Make sure these paths are correct for your project structure
// import { AppSidebar } from "../components/RndSidebar";

// import { useFrappePostCall } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils';

// // --- TYPE DEFINITIONS for Strict Typing ---
// interface Field {
//     fieldname: string;
//     label: string;
//     fieldtype: string;
//     mandatory: boolean;
//     read_only: boolean;
//     hidden: boolean;
//     options?: string;
//     description?: string;
// }

// interface LinkOption {
//     value: string;
//     label: string;
//     designation?: string;
// }

// // --- Child Table Row Types ---
// interface BudgetRow {
//     account_head: string;
//     years: (string | number)[];
// }

// interface EquipmentRow {
//     item_name: string;
//     item_description: string;
//     item_quantity: number | string;
//     equip_unit_cost: number | string;
//     equip_total_unit_cost?: number;
// }

// interface ManpowerRow {
//     designation_name: string;
//     vacancies: number | string;
//     manpower_salary: number | string;
// }

// interface CollaboratorRow {
//     pi_name?: string;
//     pi_email?: string;
//     pi_designation?: string;
//     pi_address?: string;
//     pi_contact?: string;
//     copi_name?: string;
//     copi_email?: string;
//     copi_designation?: string;
//     copi_address?: string;
//     copi_contact?: string;
// }

// interface SanctionBudgetRow {
//     head: string;
//     amount: number | string;
// }

// interface SanctionFileRow {
//     file: File | null;
//     description: string;
// }

// interface FundTransactionRow {
//     installmentNo: string;
//     dateReceived: string;
//     amount: number | string;
// }

// // --- Main Form Data Type ---
// interface FormData {
//     [key: string]: any; // For all other dynamic string/number/check fields
//     additional_pi_table?: CollaboratorRow[];
//     co_investigator_table?: CollaboratorRow[];
//     proposed_budget_breakup?: BudgetRow[];
//     proposed_equipment_details?: EquipmentRow[];
//     proposed_manpower_details?: ManpowerRow[];
//     sanctioned_budget_breakup?: SanctionBudgetRow[];
//     sanction_related_files?: SanctionFileRow[];
//     fund_transactions?: FundTransactionRow[];
//     grand_total_proposal?: number;
// }

// // --- MAIN COMPONENT ---
// const ProjectRegistration: React.FC = () => {
//     // --- STATE MANAGEMENT & API HOOKS ---
//     const [activeTab, setActiveTab] = useState(0);
//     const [fields, setFields] = useState<Field[]>([]);
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [formData, setFormData] = useState<FormData>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [isSavingDraft, setIsSavingDraft] = useState(false);
//     const [docname, setDocname] = useState<string | null>(null);
//     const [budgetYears, setBudgetYears] = useState([1]);
//     const isPermanentEmployee = useUserRoleCheck();
    
//     const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_project_form_data');
//     const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_data');
//     const { call: saveDraft, result: saveResult, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_draft');
//     const { call: fetchPiDetails, result: piDetailsResult, error: piDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi');
//     const { call: fetchAgencyDetails, result: agencyDetailsResult, error: agencyDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_funding_agency_details');
//     const [isDraftSaved, setIsDraftSaved] = useState(false);

//     // --- DATA FETCHING & SIDE EFFECTS ---
//     useEffect(() => { fetchFormData({}); }, [fetchFormData]);
    
//     useEffect(() => {
//         if (formDataResult?.message) {
//             const { fields: apiFields = [], link_options = {}, prefill_data = {} } = formDataResult.message;
//             setFields(apiFields);
//             setLinkOptions(link_options);
//             setFormData({
//                 ...prefill_data,
//                 proposed_budget_breakup: prefill_data.proposed_budget_breakup || [{ account_head: '', years: [''] }],
//             });
//             setLoading(false);
//             if (prefill_data.pi_webmail) {
//                 fetchPiDetails({ user_email: prefill_data.pi_webmail });
//             }
//         }
//         if (formDataError) {
//             console.error("❌ Failed to fetch form data:", formDataError);
//             alert("Error fetching form data.");
//             setLoading(false);
//         }
//     }, [formDataResult, formDataError, fetchPiDetails]);

//     useEffect(() => { 
//         if (submitResult) { alert(`Project registered: ${submitResult.message.docname}`); setDocname(submitResult.message.docname); } 
//         if (submitError) { alert(`Submission error: ${submitError.message}`); } 
//         setIsSubmitting(false); 
//     }, [submitResult, submitError]);

//     useEffect(() => { 
//         if (saveResult) { alert(`Draft saved: ${saveResult.message.docname}`); setDocname(saveResult.message.docname); setIsDraftSaved(true); } 
//         if (saveError) { alert(`Draft save error: ${saveError.message}`); } 
//         setIsSavingDraft(false); 
//     }, [saveResult, saveError]);

//     // --- EVENT HANDLERS (MEMOIZED) ---
//     const handleChange = useCallback((fieldname: string, value: any) => {
//         setFormData(prev => ({ ...prev, [fieldname]: value }));
//     }, []);

//     const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
//         setFormData(prev => {
//             const table = [...(prev[tableName as keyof FormData] || [])];
//             const updatedRow = { ...table[rowIndex], [fieldname]: value };

//             if (tableName === 'proposed_equipment_details') {
//                 const qty = parseFloat(String(updatedRow.item_quantity || 0));
//                 const unitCost = parseFloat(String(updatedRow.equip_unit_cost || 0));
//                 updatedRow.equip_total_unit_cost = qty * unitCost;
//             }

//             table[rowIndex] = updatedRow;
//             return { ...prev, [tableName]: table };
//         });
//     }, []);

//     const addTableRow = useCallback((tableName: string, newRow: object) => {
//         setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName as keyof FormData] || []), newRow] }));
//     }, []);

//     const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
//         setFormData(prev => ({
//             ...prev,
//             [tableName]: (prev[tableName as keyof FormData] || []).filter((_: any, i: number) => i !== rowIndex)
//         }));
//     }, []);

//     // --- FILE HANDLING & SUBMISSION ---
//     const fileToBase64 = (file: File): Promise<{ file_name: string; file_data: string }> => new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.readAsDataURL(file);
//         reader.onload = () => resolve({ file_name: file.name, file_data: reader.result as string });
//         reader.onerror = error => reject(error);
//     });

//     const prepareDataForApi = async (): Promise<any> => {
//         const data = JSON.parse(JSON.stringify(formData));
//         if (docname) { data.name = docname; }

//         for (const key in data) {
//             if (data[key] instanceof File) {
//                 data[key] = await fileToBase64(data[key]);
//             } else if (Array.isArray(data[key])) {
//                 data[key] = await Promise.all(
//                     data[key].map(async (row: any) => {
//                         const newRow = { ...row };
//                         for (const rowKey in newRow) {
//                             if (newRow[rowKey] instanceof File) {
//                                 newRow[rowKey] = await fileToBase64(newRow[rowKey]);
//                             }
//                         }
//                         return newRow;
//                     })
//                 );
//             }
//         }
//         return data;
//     };
    
//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setIsSubmitting(true);
//         try {
//             const apiData = await prepareDataForApi();
//             await submitForm({ doc: apiData });
//         } catch (err) {
//             console.error(err);
//             alert("Submission failed. Check the console for details.");
//         } finally {
//             setIsSubmitting(false);
//         }
//     };
    
//     const handleSaveDraft = async () => {
//         setIsSavingDraft(true);
//         try {
//             const apiData = await prepareDataForApi();
//             await saveDraft({ doc_data: JSON.stringify(apiData) });
//         } catch (err) {
//             console.error(err);
//             alert("Failed to save draft. Check the console for details.");
//         } finally {
//             setIsSavingDraft(false);
//         }
//     };

//     // --- BUDGET LOGIC ---
//     const budgetTable = useMemo(() => formData.proposed_budget_breakup || [], [formData.proposed_budget_breakup]);
//     const totalBudgetAmount = useMemo(() => budgetTable.reduce((tableTotal, row) => tableTotal + (row.years || []).reduce((sum, val) => sum + Number(val || 0), 0), 0), [budgetTable]);
//     useEffect(() => { if (formData.grand_total_proposal !== totalBudgetAmount) { handleChange('grand_total_proposal', totalBudgetAmount); } }, [totalBudgetAmount, formData.grand_total_proposal, handleChange]);
    
//     const addBudgetYear = () => {
//         if (budgetYears.length < 5) {
//             setBudgetYears(prev => [...prev, prev.length + 1]);
//             setFormData(prev => ({
//                 ...prev,
//                 proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({
//                     ...row,
//                     years: [...(row.years || []), '']
//                 }))
//             }));
//         }
//     };

//     const deleteLastBudgetYear = () => {
//         if (budgetYears.length > 1) {
//             setBudgetYears(prev => prev.slice(0, -1));
//             setFormData(prev => ({
//                 ...prev,
//                 proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({
//                     ...row,
//                     years: (row.years || []).slice(0, -1)
//                 }))
//             }));
//         }
//     };

//     const getYearTotal = useCallback((yearIndex: number) => {
//         return budgetTable.reduce((sum, row) => sum + Number((row.years || [])[yearIndex] || 0), 0);
//     }, [budgetTable]);
    
//     const addBudgetRow = () => addTableRow('proposed_budget_breakup', { account_head: '', years: Array(budgetYears.length).fill('') });

//     // --- REUSABLE UI COMPONENTS ---
//     const NeoCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (<div className={cn("bg-white p-4 md:p-6 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div>);
//     const NeoButton: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }> = ({ children, type = "button", ...props }) => (<button type={type} {...props} className={cn("px-4 py-2 border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed", props.className)}>{children}</button>);
//     const inputClasses = "w-full h-10 px-3 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-70 disabled:bg-gray-200 text-sm";
    
//     const FileInput: React.FC<{ file: File | null; onChange: (file: File | null) => void; disabled?: boolean }> = ({ file, onChange, disabled }) => (
//         <div className="flex items-center gap-2">
//             <label className="relative cursor-pointer flex-grow">
//                 <input type="file" className="sr-only" onChange={e => onChange(e.target.files?.[0] || null)} disabled={disabled} />
//                 <div className={cn(inputClasses, "flex items-center justify-between !h-10")}>
//                     <span className="truncate pr-2 text-gray-700">{file ? file.name : 'Select file...'}</span>
//                     <div className="px-3 py-1 rounded-md font-bold bg-cyan-300 text-black text-sm">Browse</div>
//                 </div>
//             </label>
//             {file && <NeoButton onClick={() => onChange(null)} className="!py-1 !px-2 bg-red-500 text-white" disabled={disabled}>&#x2715;</NeoButton>}
//         </div>
//     );
    
//     // --- RENDER FUNCTIONS FOR UI CLEANLINESS ---
//     const renderField = useCallback((fieldname: string) => {
//         const field = fields.find(f => f.fieldname === fieldname);
//         if (!field || field.hidden) return null;

//         const commonProps = {
//             id: field.fieldname,
//             name: field.fieldname,
//             className: inputClasses,
//             required: field.mandatory,
//             disabled: field.read_only
//         };

//         const renderInput = () => {
//             switch (field.fieldtype) {
//                 case "Link":
//                     return (
//                         <select {...commonProps} value={formData[fieldname] || ''} onChange={e => handleChange(fieldname, e.target.value)}>
//                             <option value="">Select...</option>
//                             {(linkOptions[field.fieldname] || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
//                         </select>
//                     );
//                 case "Select":
//                     return (
//                         <select {...commonProps} value={formData[fieldname] || ''} onChange={e => handleChange(fieldname, e.target.value)}>
//                             <option value="">Select...</option>
//                             {(field.options?.split('\n').filter(o => o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
//                         </select>
//                     );
//                 case "Attach":
//                     return <FileInput file={formData[fieldname] instanceof File ? formData[fieldname] : null} onChange={file => handleChange(fieldname, file)} disabled={field.read_only} />;
//                 case "Date":
//                     return <input type="date" {...commonProps} value={formData[fieldname] || ''} onChange={e => handleChange(fieldname, e.target.value)} />;
//                 case "Text":
//                 case "Small Text":
//                     return <textarea {...commonProps} value={formData[fieldname] || ''} onChange={e => handleChange(fieldname, e.target.value)} rows={4} className={`${inputClasses} h-auto py-2`} />;
//                 case "Check":
//                      return (
//                         <label className="flex items-center gap-3 font-bold text-black text-base cursor-pointer">
//                             <input type="checkbox" className="size-5 shrink-0 appearance-none bg-white border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.25)] checked:bg-black checked:bg-center checked:bg-no-repeat" style={{backgroundImage: "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"}} checked={!!formData[fieldname]} onChange={e => handleChange(fieldname, e.target.checked ? 1 : 0)} disabled={field.read_only} />
//                             <span>{field.label}{field.mandatory && <span className="text-red-500">*</span>}</span>
//                         </label>
//                     );
//                 default:
//                     const type = ['Int', 'Currency', 'Float'].includes(field.fieldtype) ? 'number' : 'text';
//                     return <input type={type} {...commonProps} value={formData[fieldname] || ''} onChange={e => handleChange(fieldname, e.target.value)} />;
//             }
//         };

//         if (field.fieldtype === 'Check') return renderInput();

//         return (
//             <div className='space-y-1'>
//                 <label htmlFor={fieldname} className="block font-bold text-black text-base">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>
//                 {renderInput()}
//                 {field.description && <p className="text-xs text-gray-700 font-mono mt-1">{field.description}</p>}
//             </div>
//         );
//     }, [fields, formData, linkOptions, handleChange]);

//     const renderCollaboratorTable = useCallback((tableName: 'additional_pi_table' | 'co_investigator_table', title: string) => {
//         const prefix = tableName === 'co_investigator_table' ? 'copi' : 'pi';
//         const tableData = formData[tableName] || [];
//         const newRow = { [`${prefix}_email`]: '' };
        
//         return (
//              <div className="space-y-3">
//                 <h3 className="text-xl font-bold uppercase text-black">{title}</h3>
//                 {/* ... Table JSX ... */}
//                 <NeoButton onClick={() => addTableRow(tableName, newRow)}>Add Collaborator</NeoButton>
//             </div>
//         )
//     }, [formData, linkOptions, handleTableRowChange, addTableRow, deleteTableRow]);

//     // --- MAIN RENDER ---
//     if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-cyan-400 mx-auto"></div><p className="mt-3 text-lg font-bold">LOADING FORM...</p></div></div>;

//     return (
//         <div className="bg-[#FDFCEC]">
//             <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
//             <main className="flex-1 p-3 md:p-6 w-full overflow-hidden">
//                 <header className="mb-6">
//                     <h1 className="text-3xl font-extrabold text-black uppercase tracking-tight">New Project Registration</h1>
//                     <p className="text-gray-700 mt-1 font-mono text-sm">Fill all sections to register a new project. Drafts can be saved at any time.</p>
//                 </header>
                
//                 <div className="border-b-2 border-black flex mb-6">
//                     {["Project Details", "Investigators", "Budget & Resources", "Clearance", "Sanction & Funds"].map((title, index) => (
//                         <button key={index} type="button" onClick={() => setActiveTab(index)} className={cn("flex-1 py-3 px-2 font-bold text-black text-center text-xs md:text-sm border-r-2 border-black last:border-r-0", activeTab === index ? "bg-cyan-300" : "bg-white hover:bg-cyan-100")}>{title}</button>
//                     ))}
//                 </div>

//                 <form onSubmit={handleSubmit}>
//                     {/* Tab 0: Project Details */}
//                     <div className={activeTab === 0 ? 'block' : 'hidden'}>
//                         <NeoCard className="space-y-6">
//                             <h2 className="text-2xl font-bold uppercase">1. Project Description</h2>
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                 {renderField("pi_webmail")}
//                                 {renderField("project_title")}
//                             </div>
//                             {renderField("project_type")}
//                             {renderField("upload_proj_prop")}
//                         </NeoCard>
//                     </div>

//                     {/* Tab 1: Investigators */}
//                     <div className={activeTab === 1 ? 'block' : 'hidden'}>
//                         <NeoCard className="space-y-8">
//                              <h2 className="text-2xl font-bold uppercase">2. Investigators & Collaborators</h2>
//                              {renderField("is_additional_pi")}
//                              {formData.is_additional_pi === 'Yes' && renderCollaboratorTable('additional_pi_table', 'Details of Additional PI(s)')}
//                              {renderField("has_co_pi")}
//                              {formData.has_co_pi === 'Yes' && renderCollaboratorTable('co_investigator_table', 'Details of Co-PI(s)')}
//                         </NeoCard>
//                     </div>

//                     {/* Tab 2: Budget & Resources */}
//                     <div className={activeTab === 2 ? 'block' : 'hidden'}>
//                         <NeoCard className="space-y-6">
//                             <h2 className="text-2xl font-bold uppercase">3. Proposed Budget</h2>
//                             {/* Budget Table Component is called here */}
                            
//                             <div className="border-t-2 border-black pt-6 space-y-4">
//                                 {renderField("equipment_checkbox")}
//                                 {formData.equipment_checkbox ? <div>Equipment Table JSX</div> : null}
//                                 {renderField("manpower_checkbox")}
//                                 {formData.manpower_checkbox ? <div>Manpower Table JSX</div> : null}
//                             </div>
//                         </NeoCard>
//                     </div>

//                     {/* Tab 3: Clearance */}
//                     <div className={activeTab === 3 ? 'block' : 'hidden'}>
//                        <NeoCard className="space-y-6">
//                             <h2 className="text-2xl font-bold uppercase">4. Clearance & Declaration</h2>
//                             {renderField("needs_committee_clearance")}
//                         </NeoCard>
//                     </div>

//                     {/* Tab 4: Sanction & Funds */}
//                     <div className={activeTab === 4 ? 'block' : 'hidden'}>
//                         <NeoCard className="space-y-8">
//                             <h2 className="text-2xl font-bold uppercase">5. Sanction & Funds</h2>
//                             {renderField("have_sanction_details")}
//                             {formData.have_sanction_details === 'Yes' && <div>Sanction Details JSX</div>}
//                         </NeoCard>
//                     </div>

//                     {/* Navigation Buttons */}
//                     <div className="mt-6 flex justify-between items-center bg-white p-3 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//                         <NeoButton onClick={() => setActiveTab(p => p - 1)} disabled={activeTab === 0} className={cn("bg-white text-sm", activeTab === 0 && 'invisible')}>Previous</NeoButton>
//                         <div className="flex flex-col sm:flex-row gap-3">
//                             <NeoButton onClick={handleSaveDraft} disabled={isSubmitting || isSavingDraft} className="bg-white text-sm">{isSavingDraft ? 'SAVING...' : 'Save As Draft'}</NeoButton>
//                             {activeTab === 4 ? (
//                                 <NeoButton type="submit" disabled={isSubmitting || isSavingDraft || !isDraftSaved} className="bg-cyan-300 text-sm">{isSubmitting ? 'SUBMITTING...' : 'Submit Registration'}</NeoButton>
//                             ) : (
//                                 <NeoButton onClick={() => setActiveTab(p => p + 1)} className="bg-cyan-300 text-sm">Next Section</NeoButton>
//                             )}
//                         </div>
//                     </div>
//                 </form>
//             </main>
//         </div>
//     );
// };

// export default ProjectRegistration;