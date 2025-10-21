

// // v5


// import React, { useState, useEffect } from 'react';
// import { AppSidebar } from "../components/RndSidebar";
// import useUserRoleCheck from "../components/UserRoleCheck"; // Ensure this path is correct
// import { useFrappePostCall } from 'frappe-react-sdk';

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
//     value: string; // Typically the user's email (user.name)
//     label: string; // Typically the user's full name
//     designation?: string; // Add designation for auto-filling
// }

// interface FormData {
//     [key: string]: any;
//     additional_pi_table?: any[];
//     co_investigator_table?: any[];
//     proposed_equipment_details?: any[];
//     proposed_manpower_details?: any[];
//     proposed_budget_breakup?: { head: string; years: number[] }[];
//     sanctioned_budget_breakup?: any[];
//     sanction_related_files?: any[];
//     fund_transactions?: any[];
// }

// const ProjectRegistration: React.FC = () => {
//     // --- STATE MANAGEMENT ---
//     const [activeTab, setActiveTab] = useState(0);
//     const [fields, setFields] = useState<Field[]>([]);
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [formData, setFormData] = useState<FormData>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [budgetYears, setBudgetYears] = useState([1]);

//     // --- API HOOKS ---
//     const isPermanentEmployee = useUserRoleCheck();
//     const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_project_form_data');
//     const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_data');
//     const { call: fetchPiDetails, result: piDetailsResult, error: piDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi');

//     // --- DATA FETCHING & INITIALIZATION ---
//     useEffect(() => {
//         fetchFormData({});
//     }, [fetchFormData]);

//     useEffect(() => {
//         if (formDataResult) {
//             const { fields: apiFields, link_options, prefill_data } = formDataResult.message;
//             setFields(apiFields);
//             setLinkOptions(link_options);
//             setFormData(prefill_data || {});
//             setLoading(false);
//         }
//         if (formDataError) {
//             console.error("❌ Failed to fetch form data:", formDataError);
//             alert("Error fetching form data. Please refresh the page.");
//             setLoading(false);
//         }
//     }, [formDataResult, formDataError]);
    
//     useEffect(() => {
//         if (piDetailsResult && piDetailsResult.message) {
//             const details = piDetailsResult.message;
//             setFormData(prev => ({ ...prev, principal_investigator_name: details.principal_investigator_name || '', designation: details.designation || '', applicant_department: details.department || '' }));
//         }
//         if (piDetailsError) { console.error("❌ Failed to fetch PI details:", piDetailsError); }
//     }, [piDetailsResult, piDetailsError]);

//     useEffect(() => {
//         if (submitResult) {
//             alert(`Project registered successfully! Document Name: ${submitResult.message.docname}`);
//         }
//         if (submitError) {
//             console.error("Failed to submit form:", submitError);
//             alert("An error occurred during submission. Please check the console and try again.");
//         }
//         setIsSubmitting(false);
//     }, [submitResult, submitError]);

//     // --- EVENT HANDLERS ---
//     const handleChange = (fieldname: string, value: any, type?: string) => {
//         setFormData(prev => ({ ...prev, [fieldname]: type === 'checkbox' ? (value ? 1 : 0) : value }));
//     };

//     const handleFileChange = (fieldname: string, file: File | null) => {
//         setFormData(prev => ({ ...prev, [fieldname]: file }));
//     };

//     const handleTableRowChange = (tableName: string, rowIndex: number, fieldname: string, value: any) => {
//         setFormData(prev => {
//             const tableData = [...(prev[tableName] || [])];
//             tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: value };
//             return { ...prev, [tableName]: tableData };
//         });
//     };

//     const handleTableFileChange = (tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
//         setFormData(prev => {
//             const tableData = [...(prev[tableName] || [])];
//             tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: file };
//             return { ...prev, [tableName]: tableData };
//         });
//     };

//     const addTableRow = (tableName: string, newRow: object) => {
//         setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName] || []), newRow] }));
//     };

//     const deleteTableRow = (tableName: string, rowIndex: number) => {
//         setFormData(prev => ({ ...prev, [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex) }));
//     };

//     const handlePiWebmailChange = (value: string) => {
//         handleChange('pi_webmail', value);
//         if (value) {
//             fetchPiDetails({ user_email: value });
//         } else {
//             setFormData(prev => ({...prev, principal_investigator_name: '', designation: '', applicant_department: ''}));
//         }
//     };
    
//     const handleCollaboratorChange = (tableName: string, rowIndex: number, selectedUserEmail: string) => {
//         const collaboratorList = linkOptions['pi_webmail'] || [];
//         const selectedCollaborator = collaboratorList.find(c => c.value === selectedUserEmail);

//         setFormData(prev => {
//             const tableData = [...(prev[tableName] || [])];
//             let currentRow = { ...tableData[rowIndex] };

//             if (selectedCollaborator) {
//                 currentRow = {
//                     ...currentRow,
//                     name: selectedUserEmail, // The 'value' from dropdown is the user's email
//                     email: selectedCollaborator.value,
//                     designation: selectedCollaborator.designation || ''
//                 };
//             } else {
//                 currentRow = { ...currentRow, name: '', email: '', designation: '' };
//             }
            
//             tableData[rowIndex] = currentRow;
//             return { ...prev, [tableName]: tableData };
//         });
//     };
    
//     // --- FORM SUBMISSION LOGIC ---
//     const fileToBase64 = (file: File): Promise<{ file_name: string; file_data: string }> => {
//         return new Promise((resolve, reject) => {
//             const reader = new FileReader();
//             reader.readAsDataURL(file);
//             reader.onload = () => resolve({ file_name: file.name, file_data: reader.result as string });
//             reader.onerror = error => reject(error);
//         });
//     };
    
//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (isSubmitting) return;
//         setIsSubmitting(true);
    
//         const dataToSubmit = JSON.parse(JSON.stringify(formData));
//         try {
//             const filePromises: Promise<void>[] = [];
//             for (const key in formData) {
//                 const value = formData[key];
//                 if (value instanceof File) {
//                     const promise = fileToBase64(value).then(result => { dataToSubmit[key] = result; });
//                     filePromises.push(promise);
//                 } else if (Array.isArray(value)) {
//                     for (let i = 0; i < value.length; i++) {
//                         for (const rowKey in value[i]) {
//                             if (value[i][rowKey] instanceof File) {
//                                 const promise = fileToBase64(value[i][rowKey]).then(result => { dataToSubmit[key][i][rowKey] = result; });
//                                 filePromises.push(promise);
//                             }
//                         }
//                     }
//                 }
//             }
//             await Promise.all(filePromises);
//             console.log("Submitting form data:", dataToSubmit);
//             submitForm({ doc: dataToSubmit });
//         } catch (err) {
//             console.error("Error processing files:", err);
//             alert("A file could not be processed. Please try again.");
//             setIsSubmitting(false);
//         }
//     };
    
//     // --- DYNAMIC RENDERERS ---
//     const renderField = (fieldname: string) => {
//         const field = fields.find(f => f.fieldname === fieldname);
//         if (!field || field.hidden) return null;
//         const value = formData[field.fieldname];
//         const commonProps = { id: field.fieldname, name: field.fieldname, className: "form-input block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm", readOnly: field.read_only, required: field.mandatory };

//         const renderInput = () => {
//              switch (field.fieldtype) {
//                 case "Link":
//                     if (field.fieldname === 'pi_webmail') { return (<select {...commonProps} value={value || ''} onChange={e => handlePiWebmailChange(e.target.value)}><option value="">Select User...</option>{(linkOptions[field.fieldname] || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>); }
//                     return (<select {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(linkOptions[field.fieldname] || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
//                 case "Select": const options = field.options?.split('\n').filter(o => o) || []; return (<select {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)}><option value="">Select...</option>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
//                 case "Text": case "Small Text": return <textarea {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} rows={3}></textarea>;
//                 case "Check": return (<label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" checked={!!value} onChange={e => handleChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only}/><span>{field.label}{field.mandatory && <span className="text-red-500">*</span>}</span></label>);
//                 case "Date": return <input type="date" {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
//                 case "Attach": return <input type="file" {...commonProps} className="form-input block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" onChange={e => handleFileChange(field.fieldname, e.target.files ? e.target.files[0] : null)} />;
//                 default:
//                     const inputType = (['Int', 'Currency', 'Percent', 'Float'].includes(field.fieldtype)) ? 'number' : 'text';
//                     return <input type={inputType} {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
//             }
//         };

//         if (field.fieldtype === 'Check') return renderInput();
//         return (<div><label htmlFor={field.fieldname} className="block text-sm font-medium text-gray-700 mb-1">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}{field.description && <p className="text-sm text-gray-500 mt-1">{field.description}</p>}</div>);
//     };

//     const renderGenericTable = (tableName: string, columns: { key: string, label: string, type: string }[], newRow: object) => (
//         <div>
//             <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
//                     <thead className="bg-gray-50"><tr>{columns.map(c => <th key={c.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">{c.label}</th>)}<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Actions</th></tr></thead>
//                     <tbody className="bg-white divide-y divide-gray-200">
//                         {(formData[tableName] || []).map((row: any, rowIndex: number) => (
//                             <tr key={rowIndex}>
//                                 {columns.map(col => (
//                                     <td key={col.key} className="px-6 py-4 whitespace-nowrap border">
//                                         {col.type === 'file' ? (<input type="file" className="..." onChange={e => handleTableFileChange(tableName, rowIndex, col.key, e.target.files ? e.target.files[0] : null)} />
//                                         ) : (<input type={col.type} className="form-input block w-full sm:text-sm" value={row[col.key] || ''} onChange={e => handleTableRowChange(tableName, rowIndex, col.key, e.target.value)} />)}
//                                     </td>
//                                 ))}
//                                 <td className="px-6 py-4 whitespace-nowrap border"><button type="button" className="table-action-button delete bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium" onClick={() => deleteTableRow(tableName, rowIndex)}>Delete</button></td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>
//             <button type="button" className="table-action-button mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium" onClick={() => addTableRow(tableName, newRow)}>Add Row</button>
//         </div>
//     );
    
//     const renderCollaboratorTable = (tableName: string, title: string) => {
//         const tableData = formData[tableName] || [];
//         const options = linkOptions['pi_webmail'] || [];
//         return (
//             <div>
//                 <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
//                 <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 border border-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Email ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Designation</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Actions</th></tr></thead>
//                     <tbody className="bg-white divide-y divide-gray-200">
//                         {tableData.map((row: any, rowIndex: number) => (
//                             <tr key={rowIndex}>
//                                 <td className="px-6 py-4 whitespace-nowrap border"><select className="form-input block w-full sm:text-sm" value={row.name || ''} onChange={e => handleCollaboratorChange(tableName, rowIndex, e.target.value)}><option value="">Select a Person...</option>{options.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></td>
//                                 <td className="px-6 py-4 whitespace-nowrap border"><input type="email" readOnly className="form-input block w-full sm:text-sm bg-gray-100" value={row.email || ''} /></td>
//                                 <td className="px-6 py-4 whitespace-nowrap border"><input type="text" readOnly className="form-input block w-full sm:text-sm bg-gray-100" value={row.designation || ''} /></td>
//                                 <td className="px-6 py-4 whitespace-nowrap border"><button type="button" className="table-action-button delete bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium" onClick={() => deleteTableRow(tableName, rowIndex)}>Delete</button></td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table></div>
//                 <button type="button" className="table-action-button mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium" onClick={() => addTableRow(tableName, { name: '', email: '', designation: '' })}>Add Row</button>
//             </div>
//         );
//     };

//     // --- BUDGET TABLE LOGIC ---
//     const budgetTable = formData.proposed_budget_breakup || [];
//     const totalBudgetAmount = budgetTable.reduce((acc, row) => acc + (row.years || []).reduce((sum, val) => sum + (Number(val) || 0), 0), 0);
//     const addBudgetYear = () => setBudgetYears(prev => [...prev, prev.length + 1]);
//     const deleteLastBudgetYear = () => { if (budgetYears.length > 1) setBudgetYears(prev => prev.slice(0, -1)) };
//     const getYearTotal = (yearIndex: number) => budgetTable.reduce((sum, row) => sum + (Number((row.years || [])[yearIndex]) || 0), 0);
//     useEffect(() => {
//         setFormData(prev => ({...prev, proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({...row, years: budgetYears.map((_, i) => row.years?.[i] || 0)}))}))
//     }, [budgetYears]);

//     // --- RENDER ---
//     if (loading) return <div className="text-center p-8 font-semibold">Loading Project Registration Form...</div>;
    
//     // const tabButtons = ["Project Details", "PI & Collaborators", "Proposed Budget", "Clearance & Declaration", "Sanction & Funds"];
//     const tabButtons = ["Project Details", "PI & Collaborators", "Proposed Budget", "Clearance & Declaration"];


//     const renderNextPrevButtons = (showPrev: boolean, showNext: boolean, isLast = false) => (
//         <div className="mt-8 flex justify-between">
//            <button type="button" className={`px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 ${!showPrev && 'invisible'}`} onClick={() => setActiveTab(activeTab - 1)}>Previous</button>
//            {isLast ? (
//                <div className="flex gap-4">
//                    <button type="button" disabled={isSubmitting} className="px-4 py-2 border rounded-md shadow-sm text-sm font-medium bg-gray-300 hover:bg-gray-400 text-gray-800 disabled:opacity-50">Save Draft</button>
//                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Submitting...' : 'Submit Registration'}</button>
//                </div>
//            ) : (
//                 <button type="button" className={`px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 ${!showNext && 'invisible'}`} onClick={() => setActiveTab(activeTab + 1)}>Next</button>
//            )}
//        </div>
//     );
//     // const isPermanentEmployee = useUserRoleCheck() ?? false;
//     return (
//         <div className="bg-gray-50 p-4 sm:p-6 md:p-8">
//             <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
//             <div className="max-w-7xl mx-auto">
//                 <header className="mb-8"> <h1 className="text-3xl font-bold text-gray-800">New Project Registration</h1> <p className="text-gray-500 mt-1">Fill in the details below to register a new project.</p> </header>
//                 <div className="mb-6 border-b border-gray-200">
//                     <nav className="flex flex-wrap -mb-px"> {tabButtons.map((title, index) => ( <button key={index} type="button" className={`text-sm font-medium text-center border-b-2 px-4 py-3 ${activeTab === index ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} onClick={() => setActiveTab(index)}> {title} </button> ))} </nav>
//                 </div>
                
//                 <form id="project-registration-form" onSubmit={handleSubmit}>
//                     <div className={activeTab === 0 ? 'block' : 'hidden'}>
//                         <div className="bg-white p-8 rounded-lg shadow space-y-6">
//                             <h2 className="text-xl font-semibold text-gray-700">Project Description</h2>
//                             {renderField("pi_webmail")} {renderField("project_title")}
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("project_type")} {formData.project_type === 'Consultancy' && renderField("consultancy_category")} {formData.project_type === 'Other' && renderField("other_project_type_name")}</div>
//                             {formData.project_type === 'Research' && (<div className='space-y-6'> <hr/><h3 className="text-lg font-semibold text-gray-700">Funding Details</h3> {renderField("funding_agen")} <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("funding_agency_type")} {renderField("origin_of_funding_agency")} {renderField("funding_agency_ministry")} {renderField("funding_agency_schemes")}</div> <div className="p-4 border rounded-md bg-gray-50"><h3 className="font-medium text-gray-700 mb-2">Agency Address</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("address_street_village_locality")} {renderField("address_state")} {renderField("address_postal_code")} {renderField("address_country")}</div></div> <hr/><h3 className="text-lg font-semibold text-gray-700">Implementation Details</h3> {renderField("implementation_department")} {renderField("involves_international_travel")} <hr/> </div>)}
//                             {renderField("project_objective")} {renderField("project_deliverables")} {renderField("executive_summary")}
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{formData.project_type !== 'Consultancy' ? renderField("project_duration_months") : renderField("project_duration_days")}</div>
//                             {renderField("upload_proj_prop")}
//                         </div>
//                         {renderNextPrevButtons(false, true)}
//                     </div>
//                     <div className={activeTab === 1 ? 'block' : 'hidden'}>
//                         <div className="bg-white p-8 rounded-lg shadow space-y-6">
//                             <h2 className="text-xl font-semibold text-gray-700">Principal Investigator (PI) Details</h2>
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("pi_employee_id")} {renderField("principal_investigator_name")} {renderField("designation")} {renderField("applicant_department")}</div>
//                             <hr/><h2 className="text-xl font-semibold text-gray-700">Collaborators</h2>
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("is_additional_pi")} {renderField("has_co_pi")}</div>
//                             {formData.is_additional_pi === 'Yes' && renderCollaboratorTable('additional_pi_table', 'Details of Additional PI(s)')}
//                             {formData.has_co_pi === 'Yes' && renderCollaboratorTable('co_investigator_table', 'Details of Co-PI(s)')}
//                         </div>
//                         {renderNextPrevButtons(true, true)}
//                     </div>
//                     <div className={activeTab === 2 ? 'block' : 'hidden'}>
//                         <div className="bg-white p-8 rounded-lg shadow space-y-6">
//                             <h2 className="text-xl font-semibold text-gray-700">Proposed Budget Breakup</h2>
//                             <p className="text-gray-600">Please provide a detailed year-wise breakup of the proposed budget.</p>
//                             <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget Head</th>{budgetYears.map((year, index) => (<th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year {year} (₹)</th>))}<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{(budgetTable).map((row, rowIndex) => (<tr key={rowIndex}><td className="px-6 py-4"><input type="text" className="form-input block w-full sm:text-sm" placeholder="e.g., Equipment" value={row.head} onChange={(e) => handleTableRowChange('proposed_budget_breakup', rowIndex, 'head', e.target.value)} /></td>{(row.years || []).map((_, yearIndex) => (<td key={yearIndex} className="px-6 py-4"><input type="number" className="form-input block w-full sm:text-sm" value={(row.years || [])[yearIndex] || 0} onChange={(e) => { const newYears = [...(row.years || [])]; newYears[yearIndex] = Number(e.target.value); handleTableRowChange('proposed_budget_breakup', rowIndex, 'years', newYears);}} /></td>))}<td className="px-6 py-4"><button type="button" className="table-action-button delete bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md" onClick={() => deleteTableRow('proposed_budget_breakup', rowIndex)}>Delete</button></td></tr>))}</tbody><tfoot className="bg-gray-50"><tr><th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Total</th>{budgetYears.map((_, yearIndex) => (<td key={yearIndex} className="px-6 py-4 font-semibold">{getYearTotal(yearIndex).toFixed(2)}</td>))}<td></td></tr></tfoot></table></div>
//                             <div className="flex space-x-2"><button type="button" className="table-action-button bg-green-500 text-white px-4 py-2 rounded-md" onClick={() => addTableRow('proposed_budget_breakup', {head: '', years: budgetYears.map(() => 0)})}>Add Row</button><button type="button" className="table-action-button bg-green-500 text-white px-4 py-2 rounded-md" onClick={addBudgetYear}>Add Year</button><button type="button" className="table-action-button delete bg-red-500 text-white px-4 py-2 rounded-md" onClick={deleteLastBudgetYear}>Delete Last Year</button></div>
//                             <div className="mt-6 flex justify-end"><div className="w-full md:w-1/3"><label className="block text-lg font-bold text-gray-700">Grand Total (₹)</label><input type="text" className="form-input bg-gray-100 text-lg font-bold" readOnly value={totalBudgetAmount.toFixed(2)} /></div></div>
//                             <hr/><h3 className="text-lg font-semibold text-gray-700">Project Head Details</h3>
//                             <div className="flex space-x-8">{renderField("equipment_checkbox")} {renderField("manpower_checkbox")}</div>
//                             {formData.equipment_checkbox ? <div><h3 className="text-lg font-semibold text-gray-700 mb-4">Proposed Equipment Details</h3>{renderGenericTable('proposed_equipment_details', [{key: 'name', label: 'Equipment Name', type: 'text'}, {key: 'cost', label: 'Cost (₹)', type: 'number'}], {name: '', cost: 0})}</div> : null}
//                             {formData.manpower_checkbox ? <div><h3 className="text-lg font-semibold text-gray-700 mb-4">Proposed Manpower Details</h3>{renderGenericTable('proposed_manpower_details', [{key: 'position', label: 'Position', type: 'text'}, {key: 'salary', label: 'Salary (₹)', type: 'number'}, {key: 'vacancy', label: 'Vacancy', type: 'number'}], {position: '', salary: 0, vacancy: 0})}</div> : null}
//                         </div>
//                         {renderNextPrevButtons(true, true)}
//                     </div>
//                     <div className={activeTab === 3 ? 'block' : 'hidden'}>
//                         <div className="bg-white p-8 rounded-lg shadow space-y-6">
//                             <h2 className="text-xl font-semibold text-gray-700">Committee Clearance</h2>
//                             {renderField("needs_committee_clearance")}
//                             {formData.needs_committee_clearance === 'Yes' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("committees")} {formData.committees === 'Other' && renderField("other_committee_specify")}</div>)}
//                             {formData.committees === 'Biosafety Committee' && (
//                                 <>
//                                     <hr/><h2 className="text-xl font-semibold text-gray-700">Declaration</h2>
//                                     <div className="p-4 bg-gray-100 rounded-md text-sm text-gray-700 space-y-3"><p><strong>Biosafety Categories:</strong></p><ul className="list-disc list-inside space-y-1"><li><strong>Category I:</strong>...</li><li><strong>Category II:</strong>...</li><li><strong>Category III:</strong>...</li></ul><p>In case of a multi-department/centre project...</p></div>
//                                     {renderField("declaration_html")}
//                                 </>
//                             )}
//                         </div>
//                         {renderNextPrevButtons(true, true)}
//                     </div>
//                     <div className={activeTab === 4 ? 'block' : 'hidden'}>
//                         <div className="bg-white p-8 rounded-lg shadow space-y-8">
//                             <div><h2 className="text-xl font-semibold text-gray-700">Sanction Details</h2>{renderField("have_sanction_details")}
//                                 {formData.have_sanction_details === 'Yes' && (<div className="mt-6 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("total_sanctioned_amount")} {renderField("sanctioned_letter_no")} {renderField("sanctioned_letter_date")}</div><div><h3 className="text-lg font-semibold text-gray-700 mb-4">Sanctioned Budget Breakup</h3>{renderGenericTable('sanctioned_budget_breakup', [{key: 'head', label: 'Budget Head', type: 'text'}, {key: 'amount', label: 'Amount (₹)', type: 'number'}], {head: '', amount: 0})}</div><div><h3 className="text-lg font-semibold text-gray-700 mb-4">Upload Sanction Related Files</h3>{renderGenericTable('sanction_related_files', [{key: 'file', label: 'File', type: 'file'}], {file: null})}</div></div>)}
//                             </div><hr/>
//                             <div><h2 className="text-xl font-semibold text-gray-700">Fund Details</h2>{renderField("have_fund_details")}
//                                 {formData.have_fund_details === 'Yes' && (<div className="mt-6 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("amount_received")} {renderField("iitg_bank_account_number")} {renderField("is_gst_invoice_issued")}</div><div><h3 className="text-lg font-semibold text-gray-700 mb-4">Installment Details</h3>{renderGenericTable('fund_transactions', [{key: 'installmentNo', label: 'Installment No.', type: 'text'}, {key: 'dateReceived', label: 'Date Received', type: 'date'}, {key: 'amount', label: 'Amount (₹)', type: 'number'}], {installmentNo: '', dateReceived: '', amount: 0})}</div></div>)}
//                             </div>
//                         </div>
//                         {renderNextPrevButtons(true, false, true)}
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// export default ProjectRegistration;





// 


import React, { useState, useEffect } from 'react';
import { AppSidebar } from "../components/RndSidebar";
import useUserRoleCheck from "../components/UserRoleCheck"; // Ensure this path is correct
import { useFrappePostCall } from 'frappe-react-sdk';

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
    value: string; // Typically the document's name (e.g., user's email)
    label: string; // The display text (e.g., user's full name)
    designation?: string; // Custom property for auto-filling
}

interface FormData {
    [key: string]: any;
    additional_pi_table?: any[];
    co_investigator_table?: any[];
    proposed_equipment_details?: any[];
    proposed_manpower_details?: any[];
    proposed_budget_breakup?: { head: string; years: number[] }[];
    sanctioned_budget_breakup?: any[];
    sanction_related_files?: any[];
    fund_transactions?: any[];
}

const ProjectRegistration: React.FC = () => {
    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState(0);
    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [formData, setFormData] = useState<FormData>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [budgetYears, setBudgetYears] = useState([1]);

    // --- API HOOKS (All pointing to the consolidated backend file) ---
    const isPermanentEmployee = useUserRoleCheck();
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_project_form_data');
    const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_data');
    const { call: fetchPiDetails, result: piDetailsResult, error: piDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi');
    const { call: fetchAgencyDetails, result: agencyDetailsResult, error: agencyDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_funding_agency_details');

    // --- DATA FETCHING & INITIALIZATION ---
    useEffect(() => {
        fetchFormData({});
    }, [fetchFormData]);

    useEffect(() => {
        if (formDataResult && formDataResult.message.fields) {
            const { fields: apiFields, link_options, prefill_data } = formDataResult.message;
            setFields(apiFields);
            setLinkOptions(link_options || {});
            setFormData(prefill_data || {});
            setLoading(false);
        }
        if (formDataError || (formDataResult && formDataResult.message.error)) {
            console.error("❌ Failed to fetch form data:", formDataError || formDataResult.message.error);
            alert("Error fetching form data. Please refresh the page.");
            setLoading(false);
        }
    }, [formDataResult, formDataError]);

    useEffect(() => {
        if (agencyDetailsResult && agencyDetailsResult.message && agencyDetailsResult.message.all) {
            console.log("Agency Details Result:", agencyDetailsResult);
            const agencyData = agencyDetailsResult.message.all;
            setFormData(prev => ({
                ...prev,
                funding_agency_type: agencyData.funding_agency_type_1 || '',
                origin_of_funding_agency: agencyData.origin_of_funding_agency || '',
                funding_agency_ministry: agencyData.ministry_funding_agency || '',
                funding_agency_schemes: agencyData.funding_agency_schemes || '',
                address_street_village_locality: agencyData.fundingagency_address || '',
                address_state: agencyData.fundingagency_state || '',
                address_postal_code: agencyData.fundingagency_postalcode || '',
                address_country: agencyData.fundingagency_country || '',
            }));
        }
        if (agencyDetailsError) {
            console.error("❌ Failed to fetch funding agency details:", agencyDetailsError);
        }
    }, [agencyDetailsResult, agencyDetailsError]);

    useEffect(() => {
        if (piDetailsResult && piDetailsResult.message) {
            const details = piDetailsResult.message;
            setFormData(prev => ({ ...prev, principal_investigator_name: details.principal_investigator_name || '', designation: details.designation || '', applicant_department: details.department || '' }));
        }
        if (piDetailsError) {
            console.error("❌ Failed to fetch PI details:", piDetailsError);
        }
    }, [piDetailsResult, piDetailsError]);

    useEffect(() => {
        if (submitResult) {
            alert(`Project registered successfully! Document Name: ${submitResult.message.docname}`);
        }
        if (submitError) {
            console.error("Failed to submit form:", submitError);
            alert("An error occurred during submission. Please check the console and try again.");
        }
        setIsSubmitting(false);
    }, [submitResult, submitError]);

    // --- EVENT HANDLERS ---
    const handleChange = (fieldname: string, value: any, type?: string) => { setFormData(prev => ({ ...prev, [fieldname]: type === 'checkbox' ? (value ? 1 : 0) : value })); };
    const handleFileChange = (fieldname: string, file: File | null) => { setFormData(prev => ({ ...prev, [fieldname]: file })); };
    const handleTableRowChange = (tableName: string, rowIndex: number, fieldname: string, value: any) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: value }; return { ...prev, [tableName]: t }; }); };
    const handleTableFileChange = (tableName: string, rowIndex: number, fieldname: string, file: File | null) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: file }; return { ...prev, [tableName]: t }; }); };
    const addTableRow = (tableName: string, newRow: object) => { setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName] || []), newRow] })); };
    const deleteTableRow = (tableName: string, rowIndex: number) => { setFormData(prev => ({ ...prev, [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex) })); };
    const handlePiWebmailChange = (value: string) => { handleChange('pi_webmail', value); if (value) { fetchPiDetails({ user_email: value }); } else { setFormData(prev => ({...prev, principal_investigator_name: '', designation: '', applicant_department: ''})); } };
    const handleFundingAgencyChange = (agencyName: string) => { handleChange('funding_agen', agencyName); if (agencyName) { fetchAgencyDetails({ agency_name: agencyName }); } else { setFormData(prev => ({ ...prev, funding_agency_schemes: '', funding_agency_type: '', origin_of_funding_agency: '', funding_agency_ministry: '', address_country: '', address_street_village_locality: '', address_state: '', address_postal_code: '' })); } };
    const handleCollaboratorChange = (tableName: string, rowIndex: number, selectedUserEmail: string) => {
        const userList = linkOptions['pi_webmail'] || [];
        const selectedUser = userList.find(c => c.value === selectedUserEmail);
        setFormData(prev => {
            const tableData = [...(prev[tableName] || [])];
            let currentRow = { ...tableData[rowIndex] };
            if (selectedUser) {
                currentRow = { ...currentRow, name: selectedUserEmail, email: selectedUser.value, designation: selectedUser.designation || '' };
            } else {
                currentRow = { ...currentRow, name: '', email: '', designation: '' };
            }
            tableData[rowIndex] = currentRow;
            return { ...prev, [tableName]: tableData };
        });
    };
    
    // --- FORM SUBMISSION LOGIC ---
    const fileToBase64 = (file: File): Promise<{ file_name: string; file_data: string }> => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => res({ file_name: file.name, file_data: r.result as string }); r.onerror = e => rej(e); });
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        const dataToSubmit = JSON.parse(JSON.stringify(formData));
        try {
            const promises: Promise<void>[] = [];
            for (const k in formData) {
                const v = formData[k];
                if (v instanceof File) { promises.push(fileToBase64(v).then(r => { dataToSubmit[k] = r; })); }
                else if (Array.isArray(v)) {
                    for (let i = 0; i < v.length; i++) {
                        for (const rk in v[i]) {
                            if (v[i][rk] instanceof File) { promises.push(fileToBase64(v[i][rk]).then(r => { dataToSubmit[k][i][rk] = r; }));}
                        }
                    }
                }
            }
            await Promise.all(promises);
            console.log("Submitting form data:", dataToSubmit);
            submitForm({ doc: dataToSubmit });
        } catch (err) {
            console.error("Error processing files:", err);
            alert("A file could not be processed.");
            setIsSubmitting(false);
        }
    };
    
    // --- DYNAMIC RENDERERS ---
    const renderField = (fieldname: string) => {
        if (!Array.isArray(fields) || fields.length === 0) return null;
        const field = fields.find(f => f.fieldname === fieldname);
        if (!field || field.hidden) return null;
        const value = formData[field.fieldname];
        const commonProps = { id: field.fieldname, name: field.fieldname, className: "form-input block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm", readOnly: field.read_only, required: field.mandatory };

        const renderInput = () => {
             switch (field.fieldtype) {
                case "Link":
                    if (field.fieldname === 'funding_agen') { return (<select {...commonProps} value={value || ''} onChange={e => handleFundingAgencyChange(e.target.value)}><option value="">Select Agency...</option>{(linkOptions[field.fieldname] || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>); }
                    if (field.fieldname === 'pi_webmail') { return (<select {...commonProps} value={value || ''} onChange={e => handlePiWebmailChange(e.target.value)}><option value="">Select User...</option>{(linkOptions[field.fieldname] || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>); }
                    return (<select {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(linkOptions[field.fieldname] || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
                case "Select": const options = field.options?.split('\n').filter(o => o) || []; return (<select {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)}><option value="">Select...</option>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
                case "Text": case "Small Text": return <textarea {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} rows={3}></textarea>;
                case "Check": return (<label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" checked={!!value} onChange={e => handleChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only}/><span>{field.label}{field.mandatory && <span className="text-red-500">*</span>}</span></label>);
                case "Date": return <input type="date" {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
                case "Attach": return <input type="file" {...commonProps} className="form-input block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" onChange={e => handleFileChange(field.fieldname, e.target.files ? e.target.files[0] : null)} />;
                default:
                    const inputType = (['Int', 'Currency', 'Percent', 'Float'].includes(field.fieldtype)) ? 'number' : 'text';
                    return <input type={inputType} {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
            }
        };

        if (field.fieldtype === 'Check') return renderInput();
        return (<div><label htmlFor={field.fieldname} className="block text-sm font-medium text-gray-700 mb-1">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}{field.description && <p className="text-sm text-gray-500 mt-1">{field.description}</p>}</div>);
    };

    const renderGenericTable = (tableName: string, columns: { key: string, label: string, type: string }[], newRow: object) => (<div><div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 border border-gray-200"><thead className="bg-gray-50"><tr>{columns.map(c => <th key={c.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">{c.label}</th>)}<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{(formData[tableName] || []).map((row: any, rowIndex: number) => (<tr key={rowIndex}>{columns.map(col => (<td key={col.key} className="px-6 py-4 whitespace-nowrap border">{col.type === 'file' ? (<input type="file" className="..." onChange={e => handleTableFileChange(tableName, rowIndex, col.key, e.target.files ? e.target.files[0] : null)} />) : (<input type={col.type} className="form-input block w-full sm:text-sm" value={row[col.key] || ''} onChange={e => handleTableRowChange(tableName, rowIndex, col.key, e.target.value)} />)}</td>))}<td className="px-6 py-4 whitespace-nowrap border"><button type="button" className="table-action-button delete bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium" onClick={() => deleteTableRow(tableName, rowIndex)}>Delete</button></td></tr>))}</tbody></table></div><button type="button" className="table-action-button mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium" onClick={() => addTableRow(tableName, newRow)}>Add Row</button></div>);
    
    const renderCollaboratorTable = (tableName: string, title: string) => {
        const tableData = formData[tableName] || [];
        const options = linkOptions['pi_webmail'] || [];
        return (<div><h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3><div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 border border-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Email ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Designation</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{tableData.map((row: any, rowIndex: number) => (<tr key={rowIndex}><td className="px-6 py-4 whitespace-nowrap border"><select className="form-input block w-full sm:text-sm" value={row.name || ''} onChange={e => handleCollaboratorChange(tableName, rowIndex, e.target.value)}><option value="">Select a Person...</option>{options.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select></td><td className="px-6 py-4 whitespace-nowrap border"><input type="email" readOnly className="form-input block w-full sm:text-sm bg-gray-100" value={row.email || ''} /></td><td className="px-6 py-4 whitespace-nowrap border"><input type="text" readOnly className="form-input block w-full sm:text-sm bg-gray-100" value={row.designation || ''} /></td><td className="px-6 py-4 whitespace-nowrap border"><button type="button" className="table-action-button delete bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium" onClick={() => deleteTableRow(tableName, rowIndex)}>Delete</button></td></tr>))}</tbody></table></div><button type="button" className="table-action-button mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium" onClick={() => addTableRow(tableName, { name: '', email: '', designation: '' })}>Add Row</button></div>);
    };

    // --- BUDGET TABLE LOGIC ---
    const budgetTable = formData.proposed_budget_breakup || [];
    const totalBudgetAmount = budgetTable.reduce((acc, row) => acc + (row.years || []).reduce((sum, val) => sum + (Number(val) || 0), 0), 0);
    const addBudgetYear = () => setBudgetYears(prev => [...prev, prev.length + 1]);
    const deleteLastBudgetYear = () => { if (budgetYears.length > 1) setBudgetYears(prev => prev.slice(0, -1)) };
    const getYearTotal = (yearIndex: number) => budgetTable.reduce((sum, row) => sum + (Number((row.years || [])[yearIndex]) || 0), 0);
    useEffect(() => { setFormData(prev => ({...prev, proposed_budget_breakup: (prev.proposed_budget_breakup || []).map(row => ({...row, years: budgetYears.map((_, i) => row.years?.[i] || 0)}))})) }, [budgetYears]);

    // --- RENDER ---
    if (loading) return <div className="text-center p-8 font-semibold">Loading Project Registration Form...</div>;
    if (fields.length === 0) return <div className="text-center p-8 font-semibold text-red-500">Failed to load form fields. Please try refreshing.</div>;

    const tabButtons = ["Project Details", "PI & Collaborators", "Proposed Budget", "Clearance & Declaration", "Sanction & Funds"];
    const renderNextPrevButtons = (showPrev: boolean, showNext: boolean, isLast = false) => (
        <div className="mt-8 flex justify-between">
           <button type="button" className={`px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 ${!showPrev && 'invisible'}`} onClick={() => setActiveTab(activeTab - 1)}>Previous</button>
           {isLast ? (
               <div className="flex gap-4">
                   <button type="button" disabled={isSubmitting} className="px-4 py-2 border rounded-md shadow-sm text-sm font-medium bg-gray-300 hover:bg-gray-400 text-gray-800 disabled:opacity-50">Save Draft</button>
                   <button type="submit" disabled={isSubmitting} className="px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Submitting...' : 'Submit Registration'}</button>
               </div>
           ) : ( <button type="button" className={`px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 ${!showNext && 'invisible'}`} onClick={() => setActiveTab(activeTab + 1)}>Next</button> )}
       </div>
    );
    
    return (
        <div className="bg-gray-50 p-4 sm:p-6 md:p-8">
            <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
            <div className="max-w-7xl mx-auto">
                <header className="mb-8"> <h1 className="text-3xl font-bold text-gray-800">New Project Registration</h1> <p className="text-gray-500 mt-1">Fill in the details below to register a new project.</p> </header>
                <div className="mb-6 border-b border-gray-200">
                    <nav className="flex flex-wrap -mb-px"> {tabButtons.map((title, index) => ( <button key={index} type="button" className={`text-sm font-medium text-center border-b-2 px-4 py-3 ${activeTab === index ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} onClick={() => setActiveTab(index)}> {title} </button> ))} </nav>
                </div>
                
                <form id="project-registration-form" onSubmit={handleSubmit}>
                    <div className={activeTab === 0 ? 'block' : 'hidden'}>
                        <div className="bg-white p-8 rounded-lg shadow space-y-6">
                            <h2 className="text-xl font-semibold text-gray-700">Project Description</h2>
                            {renderField("pi_webmail")} {renderField("project_title")}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("project_type")} {formData.project_type === 'Consultancy' && renderField("consultancy_category")} {formData.project_type === 'Other' && renderField("other_project_type_name")}</div>
                            {formData.project_type === 'Research' && (<div className='space-y-6'> <hr/><h3 className="text-lg font-semibold text-gray-700">Funding Details</h3> {renderField("funding_agen")} <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("funding_agency_type")} {renderField("origin_of_funding_agency")} {renderField("funding_agency_ministry")} {renderField("funding_agency_schemes")}</div> <div className="p-4 border rounded-md bg-gray-50"><h3 className="font-medium text-gray-700 mb-2">Agency Address</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("address_street_village_locality")} {renderField("address_state")} {renderField("address_postal_code")} {renderField("address_country")}</div></div> <hr/><h3 className="text-lg font-semibold text-gray-700">Implementation Details</h3> {renderField("implementation_department")} {renderField("involves_international_travel")} <hr/> </div>)}
                            {renderField("project_objective")} {renderField("project_deliverables")} {renderField("executive_summary")}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{formData.project_type !== 'Consultancy' ? renderField("project_duration_months") : renderField("project_duration_days")}</div>
                            {renderField("upload_proj_prop")}
                        </div>
                        {renderNextPrevButtons(false, true)}
                    </div>
                    <div className={activeTab === 1 ? 'block' : 'hidden'}>
                        <div className="bg-white p-8 rounded-lg shadow space-y-6">
                            <h2 className="text-xl font-semibold text-gray-700">Principal Investigator (PI) Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("pi_employee_id")} {renderField("principal_investigator_name")} {renderField("designation")} {renderField("applicant_department")}</div>
                            <hr/><h2 className="text-xl font-semibold text-gray-700">Collaborators</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("is_additional_pi")} {renderField("has_co_pi")}</div>
                            {formData.is_additional_pi === 'Yes' && renderCollaboratorTable('additional_pi_table', 'Details of Additional PI(s)')}
                            {formData.has_co_pi === 'Yes' && renderCollaboratorTable('co_investigator_table', 'Details of Co-PI(s)')}
                        </div>
                        {renderNextPrevButtons(true, true)}
                    </div>
                    <div className={activeTab === 2 ? 'block' : 'hidden'}>
                        <div className="bg-white p-8 rounded-lg shadow space-y-6">
                            <h2 className="text-xl font-semibold text-gray-700">Proposed Budget Breakup</h2>
                            <p className="text-gray-600">Please provide a detailed year-wise breakup of the proposed budget.</p>
                            <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget Head</th>{budgetYears.map((year, index) => (<th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year {year} (₹)</th>))}<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{(budgetTable).map((row, rowIndex) => (<tr key={rowIndex}><td className="px-6 py-4"><input type="text" className="form-input block w-full sm:text-sm" placeholder="e.g., Equipment" value={row.head} onChange={(e) => handleTableRowChange('proposed_budget_breakup', rowIndex, 'head', e.target.value)} /></td>{(row.years || []).map((_, yearIndex) => (<td key={yearIndex} className="px-6 py-4"><input type="number" className="form-input block w-full sm:text-sm" value={(row.years || [])[yearIndex] || 0} onChange={(e) => { const newYears = [...(row.years || [])]; newYears[yearIndex] = Number(e.target.value); handleTableRowChange('proposed_budget_breakup', rowIndex, 'years', newYears);}} /></td>))}<td className="px-6 py-4"><button type="button" className="table-action-button delete bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md" onClick={() => deleteTableRow('proposed_budget_breakup', rowIndex)}>Delete</button></td></tr>))}</tbody><tfoot className="bg-gray-50"><tr><th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Total</th>{budgetYears.map((_, yearIndex) => (<td key={yearIndex} className="px-6 py-4 font-semibold">{getYearTotal(yearIndex).toFixed(2)}</td>))}<td></td></tr></tfoot></table></div>
                            <div className="flex space-x-2"><button type="button" className="table-action-button bg-green-500 text-white px-4 py-2 rounded-md" onClick={() => addTableRow('proposed_budget_breakup', {head: '', years: budgetYears.map(() => 0)})}>Add Row</button><button type="button" className="table-action-button bg-green-500 text-white px-4 py-2 rounded-md" onClick={addBudgetYear}>Add Year</button><button type="button" className="table-action-button delete bg-red-500 text-white px-4 py-2 rounded-md" onClick={deleteLastBudgetYear}>Delete Last Year</button></div>
                            <div className="mt-6 flex justify-end"><div className="w-full md:w-1/3"><label className="block text-lg font-bold text-gray-700">Grand Total (₹)</label><input type="text" className="form-input bg-gray-100 text-lg font-bold" readOnly value={totalBudgetAmount.toFixed(2)} /></div></div>
                            <hr/><h3 className="text-lg font-semibold text-gray-700">Project Head Details</h3>
                            <div className="flex space-x-8">{renderField("equipment_checkbox")} {renderField("manpower_checkbox")}</div>
                            {formData.equipment_checkbox ? <div><h3 className="text-lg font-semibold text-gray-700 mb-4">Proposed Equipment Details</h3>{renderGenericTable('proposed_equipment_details', [{key: 'name', label: 'Equipment Name', type: 'text'}, {key: 'cost', label: 'Cost (₹)', type: 'number'}], {name: '', cost: 0})}</div> : null}
                            {formData.manpower_checkbox ? <div><h3 className="text-lg font-semibold text-gray-700 mb-4">Proposed Manpower Details</h3>{renderGenericTable('proposed_manpower_details', [{key: 'position', label: 'Position', type: 'text'}, {key: 'salary', label: 'Salary (₹)', type: 'number'}], {position: '', salary: 0})}</div> : null}
                        </div>
                        {renderNextPrevButtons(true, true)}
                    </div>
                    <div className={activeTab === 3 ? 'block' : 'hidden'}>
                        <div className="bg-white p-8 rounded-lg shadow space-y-6">
                            <h2 className="text-xl font-semibold text-gray-700">Committee Clearance</h2>
                            {renderField("needs_committee_clearance")}
                            {formData.needs_committee_clearance === 'Yes' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("committees")} {formData.committees === 'Other' && renderField("other_committee_specify")}</div>)}
                            <hr/><h2 className="text-xl font-semibold text-gray-700">Declaration</h2>
                            <div className="p-4 bg-gray-100 rounded-md text-sm text-gray-700 space-y-3"><p><strong>Biosafety Categories:</strong></p><ul className="list-disc list-inside space-y-1"><li><strong>Category I:</strong>...</li><li><strong>Category II:</strong>...</li><li><strong>Category III:</strong>...</li></ul><p>In case of a multi-department/centre project...</p></div>
                            {renderField("declaration_html")}
                        </div>
                        {renderNextPrevButtons(true, true)}
                    </div>
                    <div className={activeTab === 4 ? 'block' : 'hidden'}>
                        <div className="bg-white p-8 rounded-lg shadow space-y-8">
                            <div><h2 className="text-xl font-semibold text-gray-700">Sanction Details</h2>{renderField("have_sanction_details")}
                                {formData.have_sanction_details === 'Yes' && (<div className="mt-6 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("total_sanctioned_amount")} {renderField("sanctioned_letter_no")} {renderField("sanctioned_letter_date")}</div><div><h3 className="text-lg font-semibold text-gray-700 mb-4">Sanctioned Budget Breakup</h3>{renderGenericTable('sanctioned_budget_breakup', [{key: 'head', label: 'Budget Head', type: 'text'}, {key: 'amount', label: 'Amount (₹)', type: 'number'}], {head: '', amount: 0})}</div><div><h3 className="text-lg font-semibold text-gray-700 mb-4">Upload Sanction Related Files</h3>{renderGenericTable('sanction_related_files', [{key: 'file', label: 'File', type: 'file'}], {file: null})}</div></div>)}
                            </div><hr/>
                            <div><h2 className="text-xl font-semibold text-gray-700">Fund Details</h2>{renderField("have_fund_details")}
                                {formData.have_fund_details === 'Yes' && (<div className="mt-6 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderField("amount_received")} {renderField("iitg_bank_account_number")} {renderField("is_gst_invoice_issued")}</div><div><h3 className="text-lg font-semibold text-gray-700 mb-4">Installment Details</h3>{renderGenericTable('fund_transactions', [{key: 'installmentNo', label: 'Installment No.', type: 'text'}, {key: 'dateReceived', label: 'Date Received', type: 'date'}, {key: 'amount', label: 'Amount (₹)', type: 'number'}], {installmentNo: '', dateReceived: '', amount: 0})}</div></div>)}
                            </div>
                        </div>
                        {renderNextPrevButtons(true, false, true)}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectRegistration;
