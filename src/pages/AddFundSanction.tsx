// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import { AppSidebar } from "../components/RndSidebar";
// import { useFrappePostCall, useFrappeGetDoc } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils';
// import { ArrowLeftIcon } from "lucide-react";
// import useUserRoleCheck from "../components/UserRoleCheck"; // <-- 1. IMPORT THE AUTH HOOK

// // --- TYPE DEFINITIONS ---
// interface Field {
//     fieldname: string;
//     label: string | null;
//     fieldtype: string;
//     mandatory: boolean;
//     read_only: boolean;
//     hidden: boolean;
//     options?: string | null;
//     default?: any;
// }
// interface LinkOption { value: string; label: string; }
// interface FormDataResponse {
//     message: {
//         fields: Field[];
//         link_options: { [key: string]: LinkOption[] };
//         prefill_data: { [key: string]: any };
//         related_project_data: { [key: string]: any };
//     }
// }

// const AddFundReceived: React.FC = () => {
//     const navigate = useNavigate();
//     const { projectName } = useParams<{ projectName: string }>();

//     // --- 2. CALL THE AUTH HOOK ---
//     const isPermanentEmployee = useUserRoleCheck();

//     const [fields, setFields] = useState<Field[]>([]);
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     // --- Refs for uncontrolled table management ---
//     const tableRowsRef = useRef<{
//         fund_transactions: string[];
//         received_amt_breakup: string[];
//     }>({ fund_transactions: [], received_amt_breakup: [] });

//     const containerRef = useRef<{ [key: string]: HTMLElement | null }>({});

//     // --- Frappe Hooks ---
//     const { call: fetchFormData, result, error } = useFrappePostCall<FormDataResponse>('rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_fields');
//     const { call: submitForm, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_received.fund_received.save_fund_received');
//     const { data: projectData } = useFrappeGetDoc("Project Registration", projectName ?? "", { enabled: !!projectName });

//     // --- Initial data fetch ---
//     useEffect(() => {
//         if (projectName) {
//             fetchFormData({ doc_name: projectName });
//         }
//     }, [fetchFormData, projectName]);

//     // --- Handle fetch response with safety check ---
//     useEffect(() => {
//         if (result?.message) {
//             const { fields: apiFields, link_options, prefill_data, related_project_data } = result.message;

//             if (Array.isArray(apiFields)) {
//                 const processedFields = apiFields.map(field => {
//                     const newField = { ...field };
//                     if (prefill_data?.[field.fieldname]) {
//                         newField.default = prefill_data[field.fieldname];
//                     }
//                     if (field.fieldname === 'prjreg_title' && related_project_data?.name) {
//                          newField.default = related_project_data.name;
//                     }
//                     if (field.fieldname === 'prj_type' && related_project_data?.project_type) {
//                         newField.default = related_project_data.project_type;
//                     }
//                     return newField;
//                 });
//                 setFields(processedFields);
//             } else {
//                  console.error("API did not return a valid 'fields' array.");
//             }

//             setLinkOptions(prev => ({ ...prev, ...(link_options || {}) }));
//             setLoading(false);
//         }
//         if (error) {
//             console.error("Failed to load form data:", error);
//             alert("Failed to load form data.");
//             setLoading(false);
//         }
//     }, [result, error]);

//     // --- Effect for conditional field visibility (DOM based) ---
//     useEffect(() => {
//         const gstSelect = document.getElementById('gst_invoice_issued') as HTMLSelectElement;
//         const invoiceContainer = document.getElementById('invoice_no_container');
        
//         const handleChange = () => {
//             if (invoiceContainer) {
//                 invoiceContainer.style.display = gstSelect?.value === 'Yes' ? 'grid' : 'none';
//             }
//         };

//         if (gstSelect) {
//             gstSelect.addEventListener('change', handleChange);
//             handleChange();
//         }

//         return () => {
//             gstSelect?.removeEventListener('change', handleChange);
//         };
//     }, [loading]);

//     // --- Uncontrolled Table Row Management ---
//     const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

//     const addTableRow = useCallback((tableName: keyof typeof tableRowsRef.current) => {
//         const newId = generateId();
//         tableRowsRef.current[tableName].push(newId);
//         renderTableRows(tableName, newId);
//     }, []);

//     const removeTableRow = useCallback((tableName: keyof typeof tableRowsRef.current, id: string) => {
//         tableRowsRef.current[tableName] = tableRowsRef.current[tableName].filter(rowId => rowId !== id);
//         const row = containerRef.current[tableName]?.querySelector(`[data-id="${id}"]`);
//         if (row) row.remove();
//     }, []);

//     const renderTableRows = (tableName: keyof typeof tableRowsRef.current, rowId: string) => {
//         const container = containerRef.current[tableName];
//         if (!container) return;

//         const inputClasses = "w-full h-11 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE]";
//         const neoButtonClasses = "px-5 py-2 !bg-red-200 hover:!bg-red-300 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]";
        
//         const newRow = document.createElement("tr");
//         newRow.setAttribute("data-id", rowId);
//         newRow.className = "divide-x-2 divide-black";
        
//         if (tableName === 'fund_transactions') {
//             newRow.innerHTML = `
//                 <td class="p-2"><input type="text" name="transaction_number_${rowId}" class="${inputClasses}" /></td>
//                 <td class="p-2"><input type="date" name="transaction_date_${rowId}" class="${inputClasses}" /></td>
//                 <td class="p-2"><input type="number" step="0.01" name="amount_${rowId}" class="${inputClasses}" /></td>
//                 <td class="p-2"><input type="file" name="attachment_${rowId}" class="${inputClasses} file:mr-2" /></td>
//                 <td class="p-2 text-center"><button type="button" class="${neoButtonClasses} delete-btn" data-table="${tableName}" data-id="${rowId}">Delete</button></td>
//             `;
//         } else if (tableName === 'received_amt_breakup') {
//             const options = ['Consumables', 'Equipment', 'Contingency', 'Travel', 'Manpower', 'Overhead', 'Other']
//                 .map(opt => `<option value="${opt}">${opt}</option>`).join('');
//             newRow.innerHTML = `
//                 <td class="p-2">
//                     <select name="account_head_${rowId}" class="${inputClasses}">
//                         <option value="">Select...</option>
//                         ${options}
//                     </select>
//                 </td>
//                 <td class="p-2"><input type="number" step="0.01" name="amount_received_${rowId}" class="${inputClasses}" /></td>
//                 <td class="p-2"><input type="number" name="budget_year_funds_receive_${rowId}" class="${inputClasses}" defaultValue="1" /></td>
//                 <td class="p-2"><input type="text" name="remarks_${rowId}" class="${inputClasses}" /></td>
//                 <td class="p-2 text-center"><button type="button" class="${neoButtonClasses} delete-btn" data-table="${tableName}" data-id="${rowId}">Delete</button></td>
//             `;
//         }

//         container.appendChild(newRow);
        
//         const delBtn = newRow.querySelector('.delete-btn');
//         delBtn?.addEventListener('click', () => removeTableRow(tableName, rowId));
//     };

//     // --- Form Submission Logic ---
//     const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
//         const reader = new FileReader();
//         reader.readAsDataURL(file);
//         reader.onload = () => resolve(reader.result as string);
//         reader.onerror = error => reject(error);
//     });

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (isSubmitting) return;
//         setIsSubmitting(true);

//         try {
//             const formElement = e.currentTarget;
//             const form = new FormData(formElement);
//             const dataToSubmit: { [key: string]: any } = {};

//             fields.forEach(field => {
//                 if (field.fieldtype !== 'Table' && !field.hidden) {
//                     dataToSubmit[field.fieldname] = form.get(field.fieldname);
//                 }
//             });

//             dataToSubmit.fund_transactions = await Promise.all(
//                 tableRowsRef.current.fund_transactions.map(async (id) => {
//                     const attachment = form.get(`attachment_${id}`) as File | null;
//                     let fileData = {};
//                     if (attachment && attachment.size > 0) {
//                         const base64 = await toBase64(attachment);
//                         fileData = { file_name: attachment.name, file_data: base64 };
//                     }
//                     return {
//                         transaction_number: form.get(`transaction_number_${id}`),
//                         transaction_date: form.get(`transaction_date_${id}`),
//                         amount: form.get(`amount_${id}`),
//                         ...fileData,
//                     };
//                 })
//             );
            
//             dataToSubmit.received_amt_breakup = tableRowsRef.current.received_amt_breakup.map(id => ({
//                 account_head: form.get(`account_head_${id}`),
//                 amount_received: form.get(`amount_received_${id}`),
//                 budget_year_funds_receive: form.get(`budget_year_funds_receive_${id}`),
//                 remarks: form.get(`remarks_${id}`),
//             }));

//             await submitForm({ doc_data: JSON.stringify(dataToSubmit) });
//             alert("Fund Received entry saved successfully!");
//             navigate(-1);
//         } catch (err: any) {
//             console.error(submitError || err);
//             alert(`Submission Failed: ${err.message || 'Unknown Error'}`);
//         } finally {
//             setIsSubmitting(false);
//         }
//     };
    
//     // --- UI Components and Renderers ---
//     const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
//     const NeoCard = ({ children, className }: any) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );
//     const NeoButton = ({ children, onClick, disabled, className, type = "button" }: any) => ( <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button> );
//     const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-2xl font-extrabold text-black uppercase tracking-tight border-b-2 border-black pb-3">{title}</h2>{children}</div>);

//     const renderFormField = (field: Field) => {
//         if (!field || field.hidden) return null;
        
//         const commonProps = {
//             id: field.fieldname,
//             name: field.fieldname,
//             className: inputClasses,
//             readOnly: field.read_only,
//             required: field.mandatory,
//             disabled: field.read_only,
//             defaultValue: field.default || ''
//         };

//         const renderInput = () => {
//             switch (field.fieldtype) {
//                 case "Link":
//                 case "Select":
//                     const opts = field.fieldtype === 'Link' 
//                         ? linkOptions[field.fieldname] 
//                         : (field.options?.split('\n').filter(o => o).map(o => ({ value: o, label: o })) || []);
//                     return (
//                         <select {...commonProps}>
//                             <option value="">Select...</option>
//                             {(opts || []).map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
//                         </select>
//                     );
//                 case "Currency":
//                     return <input type="number" step="0.01" {...commonProps} />;
//                 default:
//                     return <input type="text" {...commonProps} />;
//             }
//         };
//         return (
//             <div key={field.fieldname} className='space-y-2'>
//                 <label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">
//                     {field.label}{field.mandatory && <span className="text-red-500">*</span>}
//                 </label>
//                 {renderInput()}
//             </div>
//         );
//     };

//     if (loading) {
//         return (<div className="flex items-center justify-center min-h-screen">...Loading...</div>);
//     }
    
//     const invoiceNoField = fields.find(f => f.fieldname === 'invoice_no');
    
//     return (
//         <div className="bg-[#FDFCEC]">
//             {/* --- 3. PASS THE PROP TO THE SIDEBAR --- */}
//             <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
//             <main className="flex-1 p-4 md:p-8">
//                  <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//                     <div className="flex items-center gap-4">
//                         <button onClick={() => navigate(-1)} className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform"><ArrowLeftIcon className="h-6 w-6" /></button>
//                         <div>
//                             <h1 className="text-3xl font-extrabold text-black">Record Received Fund</h1>
//                             <p className="text-gray-700 font-mono mt-1">For Project: <strong>{projectData?.project_title || projectName}</strong></p>
//                         </div>
//                     </div>
//                  </header>
//                  <form onSubmit={handleSubmit}>
//                     <NeoCard className="space-y-12">
//                         <NeoSection title="Reference Details">
//                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//                                 {fields.filter(f => !f.hidden && ['prjreg_title', 'sanction_ref_no', 'prj_type'].includes(f.fieldname)).map(renderFormField)}
//                             </div>
//                         </NeoSection>
//                         <NeoSection title="Received Amount & Invoice">
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                                 {fields.filter(f => !f.hidden && ['fund_received_amt', 'bank_account', 'gst_invoice_issued'].includes(f.fieldname)).map(renderFormField)}
//                                 <div id="invoice_no_container" style={{ display: 'none' }}>
//                                     {invoiceNoField && renderFormField(invoiceNoField)}
//                                 </div>
//                             </div>
//                         </NeoSection>
                        
//                         <NeoSection title="Transaction Installments">
//                             <div className="overflow-x-auto border-2 border-black rounded-md">
//                                 <table className="min-w-full divide-y-2 divide-black">
//                                     <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{['Transaction Number', 'Date', 'Amount (₹)', 'File', ''].map((h) => (<th key={h} className="p-3 font-bold text-white uppercase text-sm">{h}</th>))}</tr></thead>
//                                     <tbody ref={el => { if(el) containerRef.current['fund_transactions'] = el; }} className="divide-y-2 divide-black bg-white" />
//                                 </table>
//                             </div>
//                             <NeoButton onClick={() => addTableRow('fund_transactions')} className="bg-[#A5D6A7] mt-4">Add Row</NeoButton>
//                         </NeoSection>

//                          <NeoSection title="Breakup of this Received Amount">
//                             <div className="overflow-x-auto border-2 border-black rounded-md">
//                                 <table className="min-w-full divide-y-2 divide-black">
//                                     <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{['Account Head', 'Amount (₹)', 'Budget Year', 'Remarks', ''].map((h) => (<th key={h} className="p-3 font-bold text-white uppercase text-sm">{h}</th>))}</tr></thead>
//                                     <tbody ref={el => { if(el) containerRef.current['received_amt_breakup'] = el; }} className="divide-y-2 divide-black bg-white" />
//                                 </table>
//                             </div>
//                             <NeoButton onClick={() => addTableRow('received_amt_breakup')} className="bg-[#A5D6A7] mt-4">Add Row</NeoButton>
//                         </NeoSection>
//                     </NeoCard>
//                     <div className="mt-8 flex justify-end">
//                         <NeoButton type="submit" disabled={isSubmitting} className="bg-green-300">
//                             {isSubmitting ? 'Saving...' : 'Save Received Fund'}
//                         </NeoButton>
//                     </div>
//                  </form>
//             </main>
//         </div>
//     );
// };

// export default AddFundReceived;














// /-=-=-=-=-=


import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../components/RndSidebar";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from "lucide-react";

// --- TYPE DEFINITIONS ---
interface Field { fieldname: string; label: string | null; fieldtype: string; mandatory: boolean; read_only: boolean; hidden: boolean; options?: string | null; }
interface LinkOption { value: string; label: string; }
// Add the new table to the FormData interface
interface FormData { [key: string]: any; sanctioned_budget_breakup?: (any & { id?: string })[]; sanction_related_files?: (any & { id?: string })[]; }

// --- STYLES & REUSABLE UI COMPONENTS ---
const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
const NeoCard = ({ children, className }: any) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );
const NeoButton = ({ children, onClick, disabled, className, type = "button" }: any) => ( <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button> );
const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-2xl font-extrabold text-black uppercase tracking-tight border-b-2 border-black pb-3">{title}</h2>{children}</div>);

// --- MEMOIZED CHILD COMPONENTS ---
// const MemoizedFormField = memo(({ field, value, options, onChange }: any) => { /* ... (Your existing component is fine) ... */ });
// const MemoizedBudgetTable = memo(({ tableData, onRowChange, onAddRow, onDeleteRow }: any) => { /* ... (Your existing component is fine) ... */ });

// --- MEMOIZED CHILD COMPONENTS ---
const MemoizedFormField = memo(({ field, value, options, onChange }: any) => {
    if (!field || field.hidden) return null;
    const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only, };
    
    const renderInput = () => {
        switch (field.fieldtype) {
            case "Link": return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(options || []).map((opt: any) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
            case "Date": return <input type="date" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
            case "Currency": return <input type="number" step="0.01" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
            default: return <input type="text" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
        }
    };
    return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}</div>);
});

const MemoizedBudgetTable = memo(({ tableData, onRowChange, onAddRow, onDeleteRow }: any) => {
    const newRow = { account_head: '', first_year_budget: 0 };
    const columns = [
        { key: 'account_head', label: 'Account Head', type: 'Select', options: ['Consumable', 'Equipment', 'Contingency', 'Travel', 'Manpower', 'Overhead', 'Other'] },
        { key: 'first_year_budget', label: 'Year 1 (₹)', type: 'Currency' },
        { key: 'second_year_budget', label: 'Year 2 (₹)', type: 'Currency' },
        { key: 'third_year_budget', label: 'Year 3 (₹)', type: 'Currency' },
        { key: 'fourth_year_budget', label: 'Year 4 (₹)', type: 'Currency' },
        { key: 'fifth_year_budget', label: 'Year 5 (₹)', type: 'Currency' },
    ];
    return (
        <div>
            <div className="overflow-x-auto border-2 border-black rounded-md">
                <table className="min-w-full divide-y-2 divide-black">
                    <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{[...columns, {key:'actions', label:''}].map((c:any) => (<th key={c.key} className="p-3 font-bold text-white uppercase text-sm">{c.label}</th>))}</tr></thead>
                    <tbody className="divide-y-2 divide-black bg-white">
                        {(tableData || []).map((row: any, i: number) => (
                            <tr key={row.id} className="divide-x-2 divide-black">
                                {columns.map((col:any) => ( <td key={col.key} className="p-2"> 
                                    {col.type === 'Select' ? (
                                        <select className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(i, col.key, e.target.value)}>
                                            <option value="">Select Head...</option>
                                            {col.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    ) : (
                                        <input type="number" className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(i, col.key, e.target.value)} />
                                    )}
                                </td> ))}
                                <td className="p-2 text-center"><NeoButton onClick={() => onDeleteRow(i)} className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</NeoButton></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <NeoButton onClick={() => onAddRow(newRow)} className="bg-[#A5D6A7] mt-4">Add Budget Row</NeoButton>
        </div>
    );
});

// --- NEW COMPONENT: Generic Table for Files ---
const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
    <NeoSection title={title}>
        <div className="overflow-x-auto border-2 border-black rounded-md">
            <table className="min-w-full divide-y-2 divide-black">
                <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{[...columns, {key:'actions', label:''}].map((c:any) => (<th key={c.key} className="p-3 font-bold text-white uppercase text-sm">{c.label}</th>))}</tr></thead>
                <tbody className="divide-y-2 divide-black bg-white">
                    {(tableData || []).map((row: any, i: number) => (
                        <tr key={row.id} className="divide-x-2 divide-black">
                            {columns.map((col:any) => ( <td key={col.key} className="p-2"> 
                                {col.type === 'Attach' ? (
                                    <input type="file" className={`${inputClasses} !h-11 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:font-bold file:bg-stone-200 hover:file:bg-stone-300`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0]||null)} />
                                ) : (
                                    <input type="text" className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)} />
                                )}
                            </td> ))}
                            <td className="p-2 text-center"><NeoButton onClick={() => onDeleteRow(tableName, i)} className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</NeoButton></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <NeoButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#A5D6A7] mt-4">Add Row</NeoButton>
    </NeoSection>
));


// --- MAIN COMPONENT ---
const AddFundSanction: React.FC = () => {
    const navigate = useNavigate();
    const { projectName } = useParams<{ projectName: string }>();

    const [fields, setFields] = useState<Field[]>([]);
    const [formData, setFormData] = useState<FormData>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.api.get_fund_sanction_form_data');
    const { call: submitForm, error: submitError } = useFrappePostCall('rndopsapp.api.save_fund_sanction_data');

    useEffect(() => { fetchFormData({ project_proposal: projectName }); }, [fetchFormData, projectName]);

    // This useEffect is now the single source of truth for fetching data.
    // It uses the projectName from the URL to tell the backend which project to pre-fill.
    useEffect(() => {
        if (projectName) {
            fetchFormData({ project_proposal: projectName });
        }
    }, [fetchFormData, projectName]);


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

    // --- MODIFICATION: Update handleChange to handle side effects ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => {
            const newState = { ...prev, [fieldname]: value };
            // If project_proposal is changed, update the refnum_prj_num
            if (fieldname === 'project_proposal') {
                newState['refnum_prj_num'] = value;
            }
            return newState;
        });
    }, []);
    
    // --- GENERIC TABLE HANDLERS ---
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

    // const handleSubmit = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     setIsSubmitting(true);

    //     const dataToSubmit = { ...formData };
        
    //     // Handle file uploads by converting them to base64
    //     if (dataToSubmit.sanction_related_files) {
    //         const filePromises = dataToSubmit.sanction_related_files.map(async (row: any) => {
    //             if (row.sanction_file instanceof File) {
    //                 const fileData = await toBase64(row.sanction_file);
    //                 return { ...row, sanction_file: fileData };
    //             }
    //             return row;
    //         });
    //         dataToSubmit.sanction_related_files = await Promise.all(filePromises);
    //     }
        
    //     // console.log("Submitting Data:", dataToSubmit);
    //     // // await submitForm({ doc: JSON.stringify(dataToSubmit) }); // Uncomment when ready
    //     // await new Promise(res => setTimeout(res, 1500));
    //     // alert("Form submitted (simulation). Check console for data.");
    //     // setIsSubmitting(false);
    //     // navigate(-1);

    //     try {
    //     // This is your actual API call to save the document
    //     await submitForm({ doc: JSON.stringify(dataToSubmit) });
        
    //     alert("Fund Sanction submitted successfully!");
        
    //     // --- THIS IS THE KEY CHANGE ---
    //     navigate(-1); // Go back to the previous page (ProjectDetailsOverview)
    //     // --- END CHANGE ---

    //     } catch (err) {
    //         alert(`Submission Failed: ${submitError?.message || 'Unknown error'}`);
    //     } finally {
    //         setIsSubmitting(false);
    //     }
    // };
// Add this helper function inside your component, or outside if you prefer.
// It converts a file object into a base64 string for JSON transmission.
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    // The result is a string like "data:image/png;base64,iVBORw0KGgo..."
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});


// This is the primary function to handle the form submission.
const handleSubmit = async (e: React.FormEvent) => {
    // 1. Prevent the browser's default form submission behavior.
    e.preventDefault();
    setIsSubmitting(true);

    try {
        // 2. Create a mutable copy of the form data to process.
        const dataToSubmit: FormData = { ...formData };

        // 3. Process the file uploads.
        // Check if the 'sanction_related_files' table exists and has rows.
        if (dataToSubmit.sanction_related_files && dataToSubmit.sanction_related_files.length > 0) {
            
            // Use Promise.all to wait for all file conversions to complete.
            const processedFiles = await Promise.all(
                dataToSubmit.sanction_related_files.map(async (row: any) => {
                    // Check if the 'sanction_file' field contains a File object.
                    if (row.sanction_file instanceof File) {
                        const fileObject = row.sanction_file;
                        // Convert the file to a base64 string.
                        const base64Data = await toBase64(fileObject);
                        
                        // Return a new row object structured for the backend.
                        // The backend will need to be adapted to look for these keys.
                        return {
                            ...row, // Keep other fields like 'description'
                            file_name: fileObject.name,
                            file_data: base64Data, // The base64 string
                            sanction_file: undefined, // Remove the original File object
                        };
                    }
                    // If it's not a File object, return the row as is.
                    return row;
                })
            );

            // Replace the original file table with the processed data.
            dataToSubmit.sanction_related_files = processedFiles;
        }

        console.log("Submitting this payload to Frappe:", dataToSubmit);

        // 4. *** CRITICAL FIX ***
        // Call the API by passing the JavaScript object directly.
        // The `useFrappePostCall` hook will automatically stringify it into a JSON body.
        // The backend `save_fund_sanction_data(**data)` will receive all keys and values
        // from the `dataToSubmit` object as arguments.
        console.log("submitForm data:", dataToSubmit);
        await submitForm(dataToSubmit);
        
        // 5. If the API call is successful, show a confirmation and navigate.
        alert("Fund Sanction submitted successfully!");
        
        // Navigate back to the previous page (the project details overview).
        navigate(-1);

    } catch (err: any) {
        // 6. If the API call fails, log the error and show an alert.
        console.error("Submission Failed:", err);
        // Display the error message returned from the Frappe backend.
        alert(`Submission Failed: ${err.message || 'An unknown server error occurred.'}`);

    } finally {
        // 7. Reset the submitting state regardless of success or failure.
        setIsSubmitting(false);
    }
};




    const renderField = useCallback((fieldname: string) => {
        const field = fields.find(f => f.fieldname === fieldname);
        if (!field) return null;
        return <MemoizedFormField key={field.fieldname} field={field} value={formData[field.fieldname]} options={linkOptions[field.fieldname]} onChange={handleChange} />;
    }, [fields, formData, linkOptions, handleChange]);

    if (loading) {
        return (<div className="flex items-center justify-center min-h-screen">...Loading...</div>);
    }

    return (
        <div className="bg-[#FDFCEC]">
            <AppSidebar isPermanentEmployee={true} />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
              <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                  <div className="flex items-center gap-4">
                      <button onClick={() => navigate(-1)} className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform">
                          <ArrowLeftIcon className="h-6 w-6" />
                      </button>
                      <div>
                          <h1 className="text-3xl font-extrabold text-black">Add Fund Sanction</h1>
                          <p className="text-gray-700 font-mono mt-1">For Project: {formData.refnum_prj_num || projectName}</p>
                      </div>
                  </div>
              </header>
                
                <form onSubmit={handleSubmit}>
                    <NeoCard className="space-y-12">
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
                            />
                        </NeoSection>


                        
                        {/* --- NEW FILE UPLOAD TABLE --- */}
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

                    </NeoCard>
                    <div className="mt-8 flex justify-end">
                        <NeoButton type="submit" disabled={isSubmitting} className="bg-green-300">
                            {isSubmitting ? 'Submitting...' : 'Submit Sanction'}
                        </NeoButton>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default AddFundSanction;