// import React, { useState, useEffect, useCallback, memo } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import { AppSidebar } from "../components/RndSidebar";
// import { useFrappePostCall } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils';
// import { ArrowLeftIcon } from "lucide-react";

// // --- TYPE DEFINITIONS ---
// interface Field { fieldname: string; label: string | null; fieldtype: string; mandatory: boolean; read_only: boolean; hidden: boolean; options?: string | null; }
// interface LinkOption { value: string; label: string; }
// interface FormData { [key: string]: any; fund_transactions?: (any & { id?: string })[]; received_amt_breakup?: (any & { id?: string })[]; }

// // --- STYLES & REUSABLE UI COMPONENTS ---
// const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
// const NeoCard = ({ children, className }: any) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );
// const NeoButton = ({ children, onClick, disabled, className, type = "button" }: any) => ( <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button> );
// const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-2xl font-extrabold text-black uppercase tracking-tight border-b-2 border-black pb-3">{title}</h2>{children}</div>);

// // --- MEMOIZED CHILD COMPONENTS ---
// const MemoizedFormField = memo(({ field, value, options, onChange }: any) => {
//     if (!field || field.hidden) return null;
//     const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only, };
//     const renderInput = () => {
//         switch (field.fieldtype) {
//             case "Link":
//             case "Select":
//                 const opts = field.fieldtype === 'Link' ? options : (field.options?.split('\n').filter((o: string)=>o).map((o: string) => ({value: o, label: o})) || []);
//                 return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(opts || []).map((opt: any) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
//             case "Currency": return <input type="number" step="0.01" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
//             default: return <input type="text" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
//         }
//     };
//     return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}</div>);
// });

// const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
//     <NeoSection title={title}>
//         <div className="overflow-x-auto border-2 border-black rounded-md">
//             <table className="min-w-full divide-y-2 divide-black">
//                 <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{[...columns, {key:'actions', label:''}].map((c:any) => (<th key={c.key} className="p-3 font-bold text-white uppercase text-sm">{c.label}</th>))}</tr></thead>
//                 <tbody className="divide-y-2 divide-black bg-white">
//                     {(tableData || []).map((row: any, i: number) => (
//                         <tr key={row.id} className="divide-x-2 divide-black">
//                             {columns.map((col:any) => ( <td key={col.key} className="p-2"> 
//                                 {col.type === 'Attach' ? (<input type="file" className={`${inputClasses} !h-11 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:font-bold file:bg-stone-200 hover:file:bg-stone-300`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0]||null)} />)
//                                 : col.type === 'Select' ? (<select className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)}><option value="">Select...</option>{col.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}</select>)
//                                 : (<input type={col.type || 'text'} className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)} />)}
//                             </td> ))}
//                             <td className="p-2 text-center"><NeoButton onClick={() => onDeleteRow(tableName, i)} className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</NeoButton></td>
//                         </tr>
//                     ))}
//                 </tbody>
//             </table>
//         </div>
//         <NeoButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#A5D6A7] mt-4">Add Row</NeoButton>
//     </NeoSection>
// ));

// const AddFundReceived: React.FC = () => {
//     const navigate = useNavigate();
//     const { sanctionName } = useParams<{ sanctionName: string }>();

//     const [fields, setFields] = useState<Field[]>([]);
//     const [formData, setFormData] = useState<FormData>({});
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     const { call: fetchFormData, result, error } = useFrappePostCall('rndopsapp.doctype.fund_received.fund_received.get_fund_received_fields');
//     const { call: submitForm, error: submitError } = useFrappePostCall('rndopsapp.doctype.fund_received.fund_received.save_fund_received');

//     useEffect(() => {
//         fetchFormData({ fund_sanction: sanctionName });
//     }, [fetchFormData, sanctionName]);

//     useEffect(() => {
//         if (result?.message) {
//             setFields(result.message.fields || []);
//             setLinkOptions(result.message.link_options || {});
//             setFormData(result.message.prefill_data || {});
//             setLoading(false);
//         }
//         if (error) {
//             console.error("Failed to load form:", error);
//             alert("Error: Could not load Received Fund form. Check console for details.");
//             setLoading(false);
//         }
//     }, [result, error]);

//     const handleChange = useCallback((fieldname: string, value: any) => { setFormData(prev => ({ ...prev, [fieldname]: value })); }, []);
//     const handleGenericTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: value }; return { ...prev, [tableName]: t }; }); }, []);
//     const addGenericTableRow = useCallback((tableName: string, newRow: object) => { const id = Date.now().toString(); setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName] || []), { ...newRow, id }] })); }, []);
//     const deleteGenericTableRow = useCallback((tableName: string, rowIndex: number) => { setFormData(prev => ({ ...prev, [tableName]: (prev[tableName] || []).filter((_, i: number) => i !== rowIndex) })); }, []);
//     const handleFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => { /* ... file handler ... */ }, []);

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setIsSubmitting(true);
//         try {
//             await submitForm({ doc_data: JSON.stringify(formData) });
//             alert("Fund Received entry saved successfully!");
//             navigate(-1);
//         } catch(err) {
//             console.error(submitError || err);
//             alert(`Submission Failed: ${submitError?.message || 'Unknown Error'}`);
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const renderField = useCallback((fieldname: string) => {
//         const field = fields.find(f => f.fieldname === fieldname);
//         if (!field || field.hidden) return null;
//         return <MemoizedFormField key={field.fieldname} field={field} value={formData[field.fieldname]} options={linkOptions[field.fieldname]} onChange={handleChange} />;
//     }, [fields, formData, linkOptions, handleChange]);

//     if (loading) {
//         return (<div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE]"></div><p className="mt-4 text-2xl font-bold">LOADING FORM...</p></div></div>);
//     }

//     return (
//         <div className="bg-[#FDFCEC]">
//             <AppSidebar isPermanentEmployee={true} />
//             <main className="flex-1 p-4 md:p-8">
//                  <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//                     <div className="flex items-center gap-4">
//                         <button onClick={() => navigate(-1)} className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform"><ArrowLeftIcon className="h-6 w-6" /></button>
//                         <div>
//                             <h1 className="text-3xl font-extrabold text-black">Record Received Fund</h1>
//                             <p className="text-gray-700 font-mono mt-1">For Sanction: <strong>{formData.sanction_ref_no}</strong> on Project: <strong>{formData.prjreg_refnum}</strong></p>
//                         </div>
//                     </div>
//                  </header>
//                  <form onSubmit={handleSubmit}>
//                     <NeoCard className="space-y-12">
//                         <NeoSection title="Reference Details">
//                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//                                 {renderField('prjreg_refnum')}
//                                 {renderField('sanction_ref_no')}
//                                 {renderField('prj_type')}
//                                 {renderField('amended_from')}
//                             </div>
//                         </NeoSection>
//                         <NeoSection title="Received Amount & Invoice">
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                                 {renderField('fund_received_amt')}
//                                 {renderField('bank_account')}
//                                 {renderField('gst_invoice_issued')}
//                                 {formData.gst_invoice_issued === 'Yes' && renderField('invoice_no')}
//                             </div>
//                         </NeoSection>
                        
//                         <MemoizedGenericTable
//                             title="Transaction Installments"
//                             tableName="fund_transactions"
//                             columns={[{ key: 'transaction_number', label: 'Transaction Number', type: 'text' }, { key: 'transaction_date', label: 'Date', type: 'date' }, { key: 'amount', label: 'Amount (₹)', type: 'Currency' }, { key: 'attachment', label: 'File', type: 'Attach' }]}
//                             newRow={{ transaction_number: '', transaction_date: '', amount: 0, attachment: null }}
//                             tableData={formData.fund_transactions}
//                             onRowChange={handleGenericTableRowChange} onFileChange={handleFileChange} onAddRow={addGenericTableRow} onDeleteRow={deleteGenericTableRow}
//                         />

//                          <MemoizedGenericTable
//                             title="Breakup of this Received Amount"
//                             tableName="received_amt_breakup"
//                             columns={[{ key: 'account_head', label: 'Account Head', type: 'Select', options: ['Consumables', 'Equipment', 'Contingency', 'Travel', 'Manpower', 'Overhead', 'Other']}, { key: 'amount_received', label: 'Amount (₹)', type: 'Currency' }, { key: 'budget_year_funds_receive', label: 'Budget Year', type: 'number' }, { key: 'remarks', label: 'Remarks', type: 'text' }]}
//                             newRow={{ account_head: '', amount_received: 0, budget_year_funds_receive: 1, remarks: '' }}
//                             tableData={formData.received_amt_breakup}
//                             onRowChange={handleGenericTableRowChange} onAddRow={addGenericTableRow} onDeleteRow={deleteGenericTableRow}
//                         />
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


// ---------------------------------------------------------------------v2 MKY (10-11-2025)---------------------------------------------------------------------

// import React, { useState, useEffect, useCallback, memo } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import { AppSidebar } from "../components/RndSidebar";
// import { useFrappePostCall } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils';
// import { ArrowLeftIcon } from "lucide-react";

// // --- TYPE DEFINITIONS ---
// interface Field { fieldname: string; label: string | null; fieldtype: string; mandatory: boolean; read_only: boolean; hidden: boolean; options?: string | null; }
// interface LinkOption { value: string; label: string; }
// interface FormData { [key: string]: any; fund_transactions?: (any & { id?: string })[]; received_amt_breakup?: (any & { id?: string })[]; }

// // --- STYLES & REUSABLE UI COMPONENTS ---
// const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
// const NeoCard = ({ children, className }: any) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );
// const NeoButton = ({ children, onClick, disabled, className, type = "button" }: any) => ( <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all ...", className)}>{children}</button> );
// const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-2xl font-extrabold text-black uppercase tracking-tight border-b-2 border-black pb-3">{title}</h2>{children}</div>);

// // --- MEMOIZED CHILD COMPONENTS ---
// const MemoizedFormField = memo(({ field, value, options, onChange }: any) => {
//     if (!field || field.hidden) return null;
//     const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only, };
    
//     const renderInput = () => {
//         switch (field.fieldtype) {
//             case "Link": return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(options || []).map((opt: any) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
//             case "Date": return <input type="date" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
//             case "Currency": return <input type="number" step="0.01" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
//             default: return <input type="text" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
//         }
//     };
//     return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}</div>);
// });

// const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
//     <NeoSection title={title}>
//         <div className="overflow-x-auto border-2 border-black rounded-md">
//             <table className="min-w-full divide-y-2 divide-black">
//                 <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{[...columns, {key:'actions', label:''}].map((c:any) => (<th key={c.key} className="p-3 font-bold text-white uppercase text-sm">{c.label}</th>))}</tr></thead>
//                 <tbody className="divide-y-2 divide-black bg-white">
//                     {(tableData || []).map((row: any, i: number) => (
//                         <tr key={row.id} className="divide-x-2 divide-black">
//                             {columns.map((col:any) => ( <td key={col.key} className="p-2"> 
//                                 {col.type === 'Attach' ? (
//                                     <input type="file" className={`${inputClasses} !h-11 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:font-bold file:bg-stone-200 hover:file:bg-stone-300`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0]||null)} />
//                                 ) : (
//                                     <input type="text" className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)} />
//                                 )}
//                             </td> ))}
//                             <td className="p-2 text-center"><NeoButton onClick={() => onDeleteRow(tableName, i)} className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</NeoButton></td>
//                         </tr>
//                     ))}
//                 </tbody>
//             </table>
//         </div>
//         <NeoButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#A5D6A7] mt-4">Add Row</NeoButton>
//     </NeoSection>
// ));


// const AddFundReceived: React.FC = () => {
//     const navigate = useNavigate();
//     const { sanctionName } = useParams<{ sanctionName: string }>();
//     const { projectName } = useParams<{ projectName: string }>();

//     const [fields, setFields] = useState<Field[]>([]);
//     const [formData, setFormData] = useState<FormData>({});
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     const { call: fetchFormData, result, error } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_fields');
//     const { call: submitForm, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_received.fund_received.save_fund_received');

//     useEffect(() => { fetchFormData({ fund_sanction: sanctionName }); }, [fetchFormData, sanctionName]);

//     useEffect(() => {
//         if (result?.message) {
//             setFields(result.message.fields || []);
//             setLinkOptions(result.message.link_options || {});
//             setFormData(result.message.prefill_data || {});
//             setLoading(false);
//         }
//         if (error) {
//             console.error("Failed to load form:", error);
//             alert("Error: Could not load Received Fund form.");
//             setLoading(false);
//         }
//     }, [result, error]);

//     const handleChange = useCallback((fieldname: string, value: any) => { setFormData(prev => ({ ...prev, [fieldname]: value })); }, []);
//     const handleGenericTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: value }; return { ...prev, [tableName]: t }; }); }, []);
//     const handleFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: file }; return { ...prev, [tableName]: t }; }); }, []);
//     const addGenericTableRow = useCallback((tableName: string, newRow: object) => { const id = Date.now().toString(); setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName] || []), { ...newRow, id }] })); }, []);
//     const deleteGenericTableRow = useCallback((tableName: string, rowIndex: number) => { setFormData(prev => ({ ...prev, [tableName]: (prev[tableName] || []).filter((_, i: number) => i !== rowIndex) })); }, []);
    
//     const toBase64 = (file: File) => new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.readAsDataURL(file);
//         // The result is a string like "data:image/png;base64,iVBORw0KGgo..."
//         reader.onload = () => resolve(reader.result as string);
//         reader.onerror = error => reject(error);
//      });

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setIsSubmitting(true);
//         try {
//             const dataToSubmit: FormData = { ...formData };
//             if (dataToSubmit.fund_transactions) {
//                 const processedFiles = await Promise.all(
//                     dataToSubmit.fund_transactions.map(async (row: any) => {
//                         if (row.attachment instanceof File) {
//                             const fileData = await toBase64(row.attachment);
//                             return { ...row, file_name: row.attachment.name, file_data: fileData, attachment: undefined };
//                         }
//                         return row;
//                     })
//                 );
//                 dataToSubmit.fund_transactions = processedFiles;
//             }
//             await submitForm({ doc_data: JSON.stringify(dataToSubmit) });
//             alert("Fund Received entry saved successfully!");
//             navigate(-1);
//         } catch(err: any) {
//             console.error(submitError || err);
//             alert(`Submission Failed: ${err.message || 'Unknown Error'}`);
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const renderField = useCallback((fieldname: string) => {
//         const field = fields.find(f => f.fieldname === fieldname);
//         if (!field || field.hidden) return null;
//         return <MemoizedFormField key={field.fieldname} field={field} value={formData[field.fieldname]} options={linkOptions[field.fieldname]} onChange={handleChange} />;
//     }, [fields, formData, linkOptions, handleChange]);

//     if (loading) return (<div className="flex items-center justify-center min-h-screen">...Loading...</div>);

//     return (
//         <div className="bg-[#FDFCEC]">
//             <AppSidebar isPermanentEmployee={true} />
//             <main className="flex-1 p-4 md:p-8">
//                  <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//                     <div className="flex items-center gap-4">
//                         <button onClick={() => navigate(-1)} className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform">
//                             <ArrowLeftIcon className="h-6 w-6" />
//                         </button>
//                         <div>
//                             <h1 className="text-3xl font-extrabold text-black">Add Fund Sanction</h1>
//                             <p className="text-gray-700 font-mono mt-1">For Project: {formData.refnum_prj_num || projectName}</p>
//                         </div>
//                     </div>
//                  </header>
//                  <form onSubmit={handleSubmit}>
//                     <NeoCard className="space-y-12">
//                         <NeoSection title="Reference Details">
//                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//                                 {renderField('prjreg_refnum')}
//                                 {renderField('sanction_ref_no')}
//                                 {renderField('prj_type')}
//                                 {renderField('amended_from')}
//                             </div>
//                         </NeoSection>
//                         <NeoSection title="Received Amount & Invoice">
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                                 {renderField('fund_received_amt')}
//                                 {renderField('bank_account')}
//                                 {renderField('gst_invoice_issued')}
//                                 {formData.gst_invoice_issued === 'Yes' && renderField('invoice_no')}
//                             </div>
//                         </NeoSection>
                        
//                         <MemoizedGenericTable
//                             title="Transaction Installments"
//                             tableName="fund_transactions"
//                             columns={[
//                                 { key: 'transaction_number', label: 'Transaction Number', type: 'text' },
//                                 { key: 'transaction_date', label: 'Date', type: 'date' },
//                                 { key: 'amount', label: 'Amount (₹)', type: 'Currency' },
//                                 { key: 'attachment', label: 'File', type: 'Attach' },
//                             ]}
//                             newRow={{ transaction_number: '', transaction_date: '', amount: 0, attachment: null }}
//                             tableData={formData.fund_transactions}
//                             onRowChange={handleGenericTableRowChange} onFileChange={handleFileChange} onAddRow={addGenericTableRow} onDeleteRow={deleteGenericTableRow}
//                         />

//                          <MemoizedGenericTable
//                             title="Breakup of this Received Amount"
//                             tableName="received_amt_breakup"
//                             columns={[
//                                 { key: 'account_head', label: 'Account Head', type: 'Select', options: ['Consumables', 'Equipment', 'Contingency', 'Travel', 'Manpower', 'Overhead', 'Other']},
//                                 { key: 'amount_received', label: 'Amount (₹)', type: 'Currency' },
//                                 { key: 'budget_year_funds_receive', label: 'Budget Year', type: 'number' },
//                                 { key: 'remarks', label: 'Remarks', type: 'text' },
//                             ]}
//                             newRow={{ account_head: '', amount_received: 0, budget_year_funds_receive: 1, remarks: '' }}
//                             tableData={formData.received_amt_breakup}
//                             onRowChange={handleGenericTableRowChange} onAddRow={addGenericTableRow} onDeleteRow={deleteGenericTableRow}
//                         />
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


// ---------------------------------------------------------------------V3 MKY (11-11-2025)---------------------------------------------------------------------


// import React, { useState, useEffect, useCallback, memo } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import { AppSidebar } from "../components/RndSidebar";
// import { useFrappePostCall } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils';
// import { ArrowLeftIcon } from "lucide-react";

// // --- TYPE DEFINITIONS ---
// interface Field { fieldname: string; label: string | null; fieldtype: string; mandatory: boolean; read_only: boolean; hidden: boolean; options?: string | null; }
// interface LinkOption { value: string; label: string; }
// interface FormData { [key: string]: any; fund_transactions?: (any & { id?: string })[]; received_amt_breakup?: (any & { id?: string })[]; }

// // --- STYLES & REUSABLE UI COMPONENTS ---
// const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
// const NeoCard = ({ children, className }: any) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );
// const NeoButton = ({ children, onClick, disabled, className, type = "button" }: any) => ( <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all ...", className)}>{children}</button> );
// const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-2xl font-extrabold text-black uppercase tracking-tight border-b-2 border-black pb-3">{title}</h2>{children}</div>);

// // --- MEMOIZED CHILD COMPONENTS ---
// const MemoizedFormField = memo(({ field, value, options, onChange }: any) => {
//     if (!field || field.hidden) return null;
//     const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only, };
//     const renderInput = () => {
//         switch (field.fieldtype) {
//             case "Link":
//             case "Select":
//                 const opts = field.fieldtype === 'Link' ? options : (field.options?.split('\n').filter((o: string)=>o).map((o: string) => ({value: o, label: o})) || []);
//                 return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(opts || []).map((opt: any) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
//             case "Currency": return <input type="number" step="0.01" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
//             default: return <input type="text" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
//         }
//     };
//     return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}</div>);
// });

// const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
//     <NeoSection title={title}>
//         <div className="overflow-x-auto border-2 border-black rounded-md">
//             <table className="min-w-full divide-y-2 divide-black">
//                 <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{[...columns, {key:'actions', label:''}].map((c:any) => (<th key={c.key} className="p-3 font-bold text-white uppercase text-sm">{c.label}</th>))}</tr></thead>
//                 <tbody className="divide-y-2 divide-black bg-white">
//                     {(tableData || []).map((row: any, i: number) => (
//                         <tr key={row.id} className="divide-x-2 divide-black">
//                             {columns.map((col:any) => ( <td key={col.key} className="p-2"> 
//                                 {col.type === 'Attach' ? (<input type="file" className={`${inputClasses} !h-11 file:mr-2 ...`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0]||null)} />)
//                                 : col.type === 'Select' ? (<select className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)}><option value="">Select...</option>{col.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}</select>)
//                                 : (<input type={col.type || 'text'} className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)} />)}
//                             </td> ))}
//                             <td className="p-2 text-center"><NeoButton onClick={() => onDeleteRow(tableName, i)} className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</NeoButton></td>
//                         </tr>
//                     ))}
//                 </tbody>
//             </table>
//         </div>
//         <NeoButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#A5D6A7] mt-4">Add Row</NeoButton>
//     </NeoSection>
// ));


// const AddFundReceived: React.FC = () => {
//     const navigate = useNavigate();
//     const { projectName } = useParams<{ projectName: string }>();

//     const [fields, setFields] = useState<Field[]>([]);
//     const [formData, setFormData] = useState<FormData>({});
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     const { call: fetchFormData, result, error } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_fields');
//     const { call: submitForm, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_received.fund_received.save_fund_received');

//     useEffect(() => {
//         if (projectName) {
//             fetchFormData({ doc_name: projectName });
//         }
//     }, [fetchFormData, projectName]);

//     useEffect(() => {
//         if (result?.message) {
//             setFields(result.message.fields || []);
//             setLinkOptions(result.message.link_options || {});
//             setFormData(result.message.prefill_data || {});
//             setLoading(false);
//         }
//         if (error) {
//             console.error("Failed to load form:", error);
//             alert("Error: Could not load Received Fund form. Check console.");
//             setLoading(false);
//         }
//     }, [result, error]);

//     const handleChange = useCallback((fieldname: string, value: any) => { setFormData(prev => ({ ...prev, [fieldname]: value })); }, []);
//     const handleGenericTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: value }; return { ...prev, [tableName]: t }; }); }, []);
//     const addGenericTableRow = useCallback((tableName: string, newRow: object) => { const id = Date.now().toString(); setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName] || []), { ...newRow, id }] })); }, []);
//     const deleteGenericTableRow = useCallback((tableName: string, rowIndex: number) => { setFormData(prev => ({ ...prev, [tableName]: (prev[tableName] || []).filter((_, i: number) => i !== rowIndex) })); }, []);
//     const handleFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: file }; return { ...prev, [tableName]: t }; }); }, []);
    
//     const toBase64 = (file: File) => new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.readAsDataURL(file);
//         reader.onload = () => resolve(reader.result as string);
//         reader.onerror = error => reject(error);
//     });

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setIsSubmitting(true);
//         try {
//             const dataToSubmit: FormData = { ...formData };
//             if (dataToSubmit.fund_transactions) {
//                 const processedFiles = await Promise.all(
//                     dataToSubmit.fund_transactions.map(async (row: any) => {
//                         if (row.attachment instanceof File) {
//                             const fileData = await toBase64(row.attachment);
//                             return { ...row, file_name: row.attachment.name, file_data: fileData, attachment: undefined };
//                         }
//                         return row;
//                     })
//                 );
//                 dataToSubmit.fund_transactions = processedFiles;
//             }
//             await submitForm({ doc_data: JSON.stringify(dataToSubmit) });
//             alert("Fund Received entry saved successfully!");
//             navigate(-1);
//         } catch(err: any) {
//             console.error(submitError || err);
//             alert(`Submission Failed: ${err.message || 'Unknown Error'}`);
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const renderField = useCallback((fieldname: string) => {
//         const field = fields.find(f => f.fieldname === fieldname);
//         if (!field || field.hidden) return null;
//         // Your JSON has prjreg_refnum but the field is prjreg_title, let's adapt
//         const effectiveFieldname = fieldname === 'prjreg_refnum' ? 'prjreg_title' : fieldname;
//         const realField = fields.find(f => f.fieldname === effectiveFieldname);
//         if (!realField || realField.hidden) return null;
        
//         return <MemoizedFormField key={realField.fieldname} field={realField} value={formData[realField.fieldname]} options={linkOptions[realField.fieldname]} onChange={handleChange} />;
//     }, [fields, formData, linkOptions, handleChange]);

//     if (loading) return (<div className="flex items-center justify-center min-h-screen">...Loading...</div>);

//     return (
//         <div className="bg-[#FDFCEC]">
//             <AppSidebar isPermanentEmployee={true} />
//             <main className="flex-1 p-4 md:p-8">
//                 <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//                     <div className="flex items-center gap-4">
//                         <button onClick={() => navigate(-1)} className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform">
//                             <ArrowLeftIcon className="h-6 w-6" />
//                         </button>
//                         <div>
//                             <h1 className="text-3xl font-extrabold text-black">Add Fund Sanction</h1>
//                             <p className="text-gray-700 font-mono mt-1">For Project: {formData.refnum_prj_num || projectName}</p>
//                         </div>
//                     </div>
//                 </header>
//                  <form onSubmit={handleSubmit}>
//                     <NeoCard className="space-y-12">
//                         <NeoSection title="Reference Details">
//                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//                                 {renderField('prjreg_title')}
//                                 {renderField('sanction_ref_no')}
//                                 {renderField('prj_type')}
//                                 {renderField('amended_from')}
//                             </div>
//                         </NeoSection>
//                         <NeoSection title="Received Amount & Invoice">
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                                 {renderField('fund_received_amt')}
//                                 {renderField('bank_account')}
//                                 {renderField('gst_invoice_issued')}
//                                 {formData.gst_invoice_issued === 'Yes' && renderField('invoice_no')}
//                             </div>
//                         </NeoSection>
                        
//                         <MemoizedGenericTable
//                             title="Transaction Installments"
//                             tableName="fund_transactions"
//                             columns={[{ key: 'transaction_number', label: 'Transaction Number', type: 'text' }, { key: 'transaction_date', label: 'Date', type: 'date' }, { key: 'amount', label: 'Amount (₹)', type: 'Currency' }, { key: 'attachment', label: 'File', type: 'Attach' }]}
//                             newRow={{ transaction_number: '', transaction_date: '', amount: 0, attachment: null }}
//                             tableData={formData.fund_transactions}
//                             onRowChange={handleGenericTableRowChange} onFileChange={handleFileChange} onAddRow={addGenericTableRow} onDeleteRow={deleteGenericTableRow}
//                         />

//                          <MemoizedGenericTable
//                             title="Breakup of this Received Amount"
//                             tableName="received_amt_breakup"
//                             columns={[{ key: 'account_head', label: 'Account Head', type: 'Select', options: ['Consumables', 'Equipment', 'Contingency', 'Travel', 'Manpower', 'Overhead', 'Other']}, { key: 'amount_received', label: 'Amount (₹)', type: 'Currency' }, { key: 'budget_year_funds_receive', label: 'Budget Year', type: 'number' }, { key: 'remarks', label: 'Remarks', type: 'text' }]}
//                             newRow={{ account_head: '', amount_received: 0, budget_year_funds_receive: 1, remarks: '' }}
//                             tableData={formData.received_amt_breakup}
//                             onRowChange={handleGenericTableRowChange} onAddRow={addGenericTableRow} onDeleteRow={deleteGenericTableRow}
//                         />
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


// ---------------------------------------------------------------------V4 MKY (11-11-2025)---------------------------------------------------------------------


import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../components/RndSidebar";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from "lucide-react";

// --- TYPE DEFINITIONS ---
interface Field { fieldname: string; label: string | null; fieldtype: string; mandatory: boolean; read_only: boolean; hidden: boolean; options?: string | null; }
interface LinkOption { value: string; label: string; }
interface FormData { [key: string]: any; fund_transactions?: (any & { id?: string })[]; received_amt_breakup?: (any & { id?: string })[]; }

// --- STYLES & REUSABLE UI COMPONENTS ---
const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
const NeoCard = ({ children, className }: any) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );
const NeoButton = ({ children, onClick, disabled, className, type = "button" }: any) => ( <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button> );
const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-2xl font-extrabold text-black uppercase tracking-tight border-b-2 border-black pb-3">{title}</h2>{children}</div>);

// --- MEMOIZED CHILD COMPONENTS ---
const MemoizedFormField = memo(({ field, value, options, onChange }: any) => {
    if (!field || field.hidden) return null;
    const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only, };
    const renderInput = () => {
        switch (field.fieldtype) {
            case "Link":
            case "Select":
                const opts = field.fieldtype === 'Link' ? options : (field.options?.split('\n').filter((o: string)=>o).map((o: string) => ({value: o, label: o})) || []);
                return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(opts || []).map((opt: any) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
            case "Currency": return <input type="number" step="0.01" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
            default: return <input type="text" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
        }
    };
    return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}</div>);
});

const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
    <NeoSection title={title}>
        <div className="overflow-x-auto border-2 border-black rounded-md">
            <table className="min-w-full divide-y-2 divide-black">
                <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{[...columns, {key:'actions', label:''}].map((c:any) => (<th key={c.key} className="p-3 font-bold text-white uppercase text-sm">{c.label}</th>))}</tr></thead>
                <tbody className="divide-y-2 divide-black bg-white">
                    {(tableData || []).map((row: any, i: number) => (
                        <tr key={row.id} className="divide-x-2 divide-black">
                            {columns.map((col:any) => ( <td key={col.key} className="p-2"> 
                                {col.type === 'Attach' ? (<input type="file" className={`${inputClasses} !h-11 file:mr-2 ...`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0]||null)} />)
                                : col.type === 'Select' ? (<select className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)}><option value="">Select...</option>{col.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}</select>)
                                : (<input type={col.type || 'text'} className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)} />)}
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

const AddFundReceived: React.FC = () => {
    const navigate = useNavigate();
    const { projectName } = useParams<{ projectName: string }>();

    const [fields, setFields] = useState<Field[]>([]);
    const [formData, setFormData] = useState<FormData>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { call: fetchFormData, result, error } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_fields');
    const { call: submitForm, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_received.fund_received.save_fund_received');

    // Initial data fetch when the component mounts
    useEffect(() => {
        if (projectName) {
            fetchFormData({ doc_name: projectName });
        }
    }, [fetchFormData, projectName]);

    // Handles the response from ANY fetchFormData call
    useEffect(() => {
        if (result?.message) {
            setFields(prev => result.message.fields || prev);
            // Merge new link options with existing ones
            setLinkOptions(prev => ({ ...prev, ...result.message.link_options }));
            // Only set form data on the initial load to avoid overwriting user input
            if (loading) {
                setFormData(result.message.prefill_data || {});
                setLoading(false);
            }
        }
        if (error) {
            console.error("Failed to load form data:", error);
            if (loading) setLoading(false);
        }
    }, [result, error, loading]);

    // Re-fetches filtered sanctions when the project selection changes
    useEffect(() => {
        const selectedProject = formData['prjreg_title'];
        // Avoid running on initial load if the project is already set by the URL
        if (selectedProject && selectedProject !== projectName) {
            fetchFormData({ doc_name: selectedProject });
        }
    }, [formData['prjreg_title'], projectName, fetchFormData]);

    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => {
            const newState = { ...prev, [fieldname]: value };
            if (fieldname === 'prjreg_title') {
                // When project changes, clear the selected sanction to force re-selection
                newState['sanction_ref_no'] = '';
                // You could also fetch and set prj_type here if needed,
                // but the backend should handle it on the next fetch.
            }
            return newState;
        });
    }, []);

    const handleGenericTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: value }; return { ...prev, [tableName]: t }; }); }, []);
    const addGenericTableRow = useCallback((tableName: string, newRow: object) => { const id = Date.now().toString(); setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName] || []), { ...newRow, id }] })); }, []);
    const deleteGenericTableRow = useCallback((tableName: string, rowIndex: number) => { setFormData(prev => ({ ...prev, [tableName]: (prev[tableName] || []).filter((_, i: number) => i !== rowIndex) })); }, []);
    const handleFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: file }; return { ...prev, [tableName]: t }; }); }, []);

    const toBase64 = (file: File) => new Promise((resolve, reject) => {
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
            if (dataToSubmit.fund_transactions) {
                const processedFiles = await Promise.all(
                    dataToSubmit.fund_transactions.map(async (row: any) => {
                        if (row.attachment instanceof File) {
                            const fileData = await toBase64(row.attachment);
                            return { ...row, file_name: row.attachment.name, file_data: fileData, attachment: undefined };
                        }
                        return row;
                    })
                );
                dataToSubmit.fund_transactions = processedFiles;
            }
            await submitForm({ doc_data: JSON.stringify(dataToSubmit) });
            alert("Fund Received entry saved successfully!");
            navigate(-1);
        } catch(err: any) {
            console.error(submitError || err);
            alert(`Submission Failed: ${err.message || 'Unknown Error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderField = useCallback((fieldname: string) => {
        const field = fields.find(f => f.fieldname === fieldname);
        if (!field || field.hidden) return null;
        return <MemoizedFormField key={field.fieldname} field={field} value={formData[field.fieldname]} options={linkOptions[field.fieldname]} onChange={handleChange} />;
    }, [fields, formData, linkOptions, handleChange]);

    if (loading) {
        return (<div className="flex items-center justify-center min-h-screen">...Loading...</div>);
    }

    return (
        <div className="bg-[#FDFCEC]">
            <AppSidebar isPermanentEmployee={true} />
            <main className="flex-1 p-4 md:p-8">
                 <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform"><ArrowLeftIcon className="h-6 w-6" /></button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-black">Record Received Fund</h1>
                            <p className="text-gray-700 font-mono mt-1">For Project: <strong>{formData.prjreg_refnum || projectName}</strong></p>
                        </div>
                    </div>
                 </header>
                 <form onSubmit={handleSubmit}>
                    <NeoCard className="space-y-12">
                        <NeoSection title="Reference Details">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {renderField('prjreg_title')}
                                {renderField('sanction_ref_no')}
                                {renderField('prj_type')}
                                {renderField('amended_from')}
                            </div>
                        </NeoSection>
                        <NeoSection title="Received Amount & Invoice">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {renderField('fund_received_amt')}
                                {renderField('bank_account')}
                                {renderField('gst_invoice_issued')}
                                {formData.gst_invoice_issued === 'Yes' && renderField('invoice_no')}
                            </div>
                        </NeoSection>
                        
                        <MemoizedGenericTable
                            title="Transaction Installments"
                            tableName="fund_transactions"
                            columns={[{ key: 'transaction_number', label: 'Transaction Number', type: 'text' }, { key: 'transaction_date', label: 'Date', type: 'date' }, { key: 'amount', label: 'Amount (₹)', type: 'Currency' }, { key: 'attachment', label: 'File', type: 'Attach' }]}
                            newRow={{ transaction_number: '', transaction_date: '', amount: 0, attachment: null }}
                            tableData={formData.fund_transactions}
                            onRowChange={handleGenericTableRowChange} onFileChange={handleFileChange} onAddRow={addGenericTableRow} onDeleteRow={deleteGenericTableRow}
                        />

                         <MemoizedGenericTable
                            title="Breakup of this Received Amount"
                            tableName="received_amt_breakup"
                            columns={[{ key: 'account_head', label: 'Account Head', type: 'Select', options: ['Consumables', 'Equipment', 'Contingency', 'Travel', 'Manpower', 'Overhead', 'Other']}, { key: 'amount_received', label: 'Amount (₹)', type: 'Currency' }, { key: 'budget_year_funds_receive', label: 'Budget Year', type: 'number' }, { key: 'remarks', label: 'Remarks', type: 'text' }]}
                            newRow={{ account_head: '', amount_received: 0, budget_year_funds_receive: 1, remarks: '' }}
                            tableData={formData.received_amt_breakup}
                            onRowChange={handleGenericTableRowChange} onAddRow={addGenericTableRow} onDeleteRow={deleteGenericTableRow}
                        />
                    </NeoCard>
                    <div className="mt-8 flex justify-end">
                        <NeoButton type="submit" disabled={isSubmitting} className="bg-green-300">
                            {isSubmitting ? 'Saving...' : 'Save Received Fund'}
                        </NeoButton>
                    </div>
                 </form>
            </main>
        </div>
    );
};

export default AddFundReceived;