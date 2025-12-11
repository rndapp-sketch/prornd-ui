

// // /-=-=-=-=-=


// import React, { useState, useEffect, useCallback, memo } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import { AppSidebar } from "../components/RndSidebar";
// import { useFrappePostCall } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils';
// import { ArrowLeftIcon } from "lucide-react";

// // --- TYPE DEFINITIONS ---
// interface Field { fieldname: string; label: string | null; fieldtype: string; mandatory: boolean; read_only: boolean; hidden: boolean; options?: string | null; }
// interface LinkOption { value: string; label: string; }
// // Add the new table to the FormData interface
// interface FormData { [key: string]: any; sanctioned_budget_breakup?: (any & { id?: string })[]; sanction_related_files?: (any & { id?: string })[]; }

// // --- STYLES & REUSABLE UI COMPONENTS ---
// const inputClasses = "w-full h-12 px-4 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.25)] focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100 read-only:bg-gray-100";
// const FrappeCard = ({ children, className }: any) => (<div className={cn("bg-white p-6 md:p-8 border border-gray-200 rounded-xl shadow-sm", className)}>{children}</div>);
// const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: any) => (<button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-2.5 border border-gray-200 rounded-lg font-semibold text-gray-700 bg-white shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button>);
// const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-3">{title}</h2>{children}</div>);

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

// // const MemoizedBudgetTable = memo(({ tableData, onRowChange, onAddRow, onDeleteRow }: any) => {
// //     const newRow = { account_head: '', first_year_budget: 0 };
// //     const columns = [
// //         { key: 'account_head', label: 'Account Head', type: 'Select', options: ['Consumable', 'Equipment', 'Contingency', 'Travel', 'Manpower', 'Overhead', 'Other'] },
// //         { key: 'first_year_budget', label: 'Year 1 (₹)', type: 'Currency' },
// //         { key: 'second_year_budget', label: 'Year 2 (₹)', type: 'Currency' },
// //         { key: 'third_year_budget', label: 'Year 3 (₹)', type: 'Currency' },
// //         { key: 'fourth_year_budget', label: 'Year 4 (₹)', type: 'Currency' },
// //         { key: 'fifth_year_budget', label: 'Year 5 (₹)', type: 'Currency' },
// //     ];
// //     return (
// //         <div>
// //             <div className="overflow-x-auto border border-gray-200 rounded-md">
// //                 <table className="min-w-full divide-y divide-gray-200">
// //                     <thead className="bg-gray-50"><tr className="divide-x divide-gray-100">{[...columns, {key:'actions', label:''}].map((c:any) => (<th key={c.key} className="p-3 font-semibold text-gray-700 text-sm text-left text-sm">{c.label}</th>))}</tr></thead>
// //                     <tbody className="divide-y divide-gray-200 bg-white">
// //                         {(tableData || []).map((row: any, i: number) => (
// //                             <tr key={row.id} className="divide-x divide-gray-100">
// //                                 {columns.map((col:any) => ( <td key={col.key} className="p-2"> 
// //                                     {col.type === 'Select' ? (
// //                                         <select className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(i, col.key, e.target.value)}>
// //                                             <option value="">Select Head...</option>
// //                                             {col.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
// //                                         </select>
// //                                     ) : (
// //                                         <input type="number" className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(i, col.key, e.target.value)} />
// //                                     )}
// //                                 </td> ))}
// //                                 <td className="p-2 text-center"><FrappeButton onClick={() => onDeleteRow(i)} className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</FrappeButton></td>
// //                             </tr>
// //                         ))}
// //                     </tbody>
// //                 </table>
// //             </div>
// //             <FrappeButton onClick={() => onAddRow(newRow)} className="bg-[#A5D6A7] mt-4">Add Budget Row</FrappeButton>
// //         </div>
// //     );
// // });






// // --- NEW COMPONENT: Generic Table for Files --- grand total error

// // const MemoizedBudgetTable = memo(({ tableData, onRowChange, onAddRow, onDeleteRow }: any) => {
// //     const columns = [
// //         { key: 'account_head', label: 'Account Head', type: 'Select', options: ['Consumable', 'Equipment', 'Contingency', 'Travel', 'Manpower', 'Overhead', 'Other'] },
// //         { key: 'first_year_budget', label: 'Year 1 (₹)', type: 'Currency' },
// //         { key: 'second_year_budget', label: 'Year 2 (₹)', type: 'Currency' },
// //         { key: 'third_year_budget', label: 'Year 3 (₹)', type: 'Currency' },
// //         { key: 'fourth_year_budget', label: 'Year 4 (₹)', type: 'Currency' },
// //         { key: 'fifth_year_budget', label: 'Year 5 (₹)', type: 'Currency' },
// //         { key: 'row_total', label: 'Total (₹)', type: 'ReadOnly' },
// //     ];

// //     const yearKeys = [
// //         'first_year_budget',
// //         'second_year_budget',
// //         'third_year_budget',
// //         'fourth_year_budget',
// //         'fifth_year_budget'
// //     ];

// //     // Calculate row total
// //     const calculateRowTotal = (row: any) => {
// //         return yearKeys.reduce((sum, key) => sum + (parseFloat(row[key]) || 0), 0);
// //     };

// //     // Year-wise totals
// //     const yearTotals: any = {};
// //     yearKeys.forEach((key) => {
// //         yearTotals[key] = (tableData || []).reduce((sum: number, row: any) => {
// //             return sum + (parseFloat(row[key]) || 0);
// //         }, 0);
// //     });

// //     // Grand Total of all rows
// //     const grandTotal = Object.values(yearTotals).reduce((sum: any, val: any) => sum + val, 0);

// //     return (
// //         <div>
// //             <div className="overflow-x-auto border border-gray-200 rounded-md">
// //                 <table className="min-w-full divide-y divide-gray-200">
// //                     <thead className="bg-gray-50">
// //                         <tr className="divide-x divide-gray-100">
// //                             {[...columns, { key: 'actions', label: '' }].map((c: any) => (
// //                                 <th key={c.key} className="p-3 font-semibold text-gray-700 text-sm text-left text-sm">
// //                                     {c.label}
// //                                 </th>
// //                             ))}
// //                         </tr>
// //                     </thead>

// //                     <tbody className="divide-y divide-gray-200 bg-white">
// //                         {(tableData || []).map((row: any, i: number) => {
// //                             const rowTotal = calculateRowTotal(row);
// //                             return (
// //                                 <tr key={row.id || i} className="divide-x divide-gray-100">
// //                                     {columns.map((col: any) => (
// //                                         <td key={col.key} className="p-2">
// //                                             {col.type === 'Select' ? (
// //                                                 <select className={`${inputClasses} !h-11`}
// //                                                     value={row[col.key] || ''}
// //                                                     onChange={(e) => onRowChange(i, col.key, e.target.value)}>
// //                                                     <option value="">Select Head...</option>
// //                                                     {col.options.map((opt: string) => (
// //                                                         <option key={opt} value={opt}>{opt}</option>
// //                                                     ))}
// //                                                 </select>
// //                                             ) : col.type === 'Currency' ? (
// //                                                 <input type="number" className={`${inputClasses} !h-11`}
// //                                                     value={row[col.key] || ''}
// //                                                     onChange={(e) => onRowChange(i, col.key, e.target.value)} />
// //                                             ) : col.type === 'ReadOnly' ? (
// //                                                 <input
// //                                                     readOnly
// //                                                     className={`${inputClasses} !h-11 bg-gray-200`}
// //                                                     value={rowTotal}
// //                                                 />
// //                                             ) : null}
// //                                         </td>
// //                                     ))}
// //                                     <td className="p-2 text-center">
// //                                         <FrappeButton onClick={() => onDeleteRow(i)}
// //                                             className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">
// //                                             Delete
// //                                         </FrappeButton>
// //                                     </td>
// //                                 </tr>
// //                             );
// //                         })}
// //                     </tbody>

// //                     {/* Year Wise Totals */}
// //                     <tfoot className="bg-blue-100 border-t border-gray-200">
// //                         <tr className="divide-x divide-gray-100 font-bold">
// //                             <td className="p-3 text-right">Year Wise Total (₹):</td>
// //                             <td className="p-3">{yearTotals.first_year_budget}</td>
// //                             <td className="p-3">{yearTotals.second_year_budget}</td>
// //                             <td className="p-3">{yearTotals.third_year_budget}</td>
// //                             <td className="p-3">{yearTotals.fourth_year_budget}</td>
// //                             <td className="p-3">{yearTotals.fifth_year_budget}</td>
// //                             <td className="p-3">{grandTotal}</td>
// //                             <td />
// //                         </tr>

// //                         {/* Grand Total */}
// //                         <tr className="divide-x divide-gray-100 bg-yellow-200 text-lg font-bold">
// //                             <td colSpan={columns.length - 1} className="p-3 text-right">Grand Total (₹):</td>
// //                             <td className="p-3">{grandTotal}</td>
// //                             <td />
// //                         </tr>
// //                     </tfoot>
// //                 </table>
// //             </div>

// //             <FrappeButton
// //                 onClick={() =>
// //                     onAddRow({
// //                         account_head: '',
// //                         first_year_budget: 0,
// //                         second_year_budget: 0,
// //                         third_year_budget: 0,
// //                         fourth_year_budget: 0,
// //                         fifth_year_budget: 0
// //                     })
// //                 }
// //                 className="bg-[#A5D6A7] mt-4"
// //             >
// //                 Add Budget Row
// //             </FrappeButton>
// //         </div>
// //     );
// // });

// const MemoizedBudgetTable = memo(({ tableData, onRowChange, onAddRow, onDeleteRow }: any) => {
//     const columns = [
//         { key: 'account_head', label: 'Account Head', type: 'Select', options: ['Consumable', 'Equipment', 'Contingency', 'Travel', 'Manpower', 'Overhead', 'Other'] },
//         { key: 'first_year_budget', label: 'Year 1 (₹)', type: 'Currency' },
//         { key: 'second_year_budget', label: 'Year 2 (₹)', type: 'Currency' },
//         { key: 'third_year_budget', label: 'Year 3 (₹)', type: 'Currency' },
//         { key: 'fourth_year_budget', label: 'Year 4 (₹)', type: 'Currency' },
//         { key: 'fifth_year_budget', label: 'Year 5 (₹)', type: 'Currency' },
//         { key: 'row_total', label: 'Total (₹)', type: 'ReadOnly' },
//     ];

//     const calculateRowTotal = (row: any) => {
//         return ['first_year_budget','second_year_budget','third_year_budget','fourth_year_budget','fifth_year_budget']
//             .reduce((sum, key) => sum + (parseFloat(row[key]) || 0), 0);
//     };

//     const grandTotal = (tableData || []).reduce((sum: number, row: any) => sum + calculateRowTotal(row), 0);

//     return (
//         <div>
//             <div className="overflow-x-auto border border-gray-200 rounded-md">
//                 <table className="min-w-full divide-y divide-gray-200">
//                     <thead className="bg-gray-50">
//                         <tr className="divide-x divide-gray-100">
//                             {[...columns, {key:'actions', label:''}].map((c:any) => (
//                                 <th key={c.key} className="p-3 font-semibold text-gray-700 text-sm text-left text-sm">{c.label}</th>
//                             ))}
//                         </tr>
//                     </thead>

//                     <tbody className="divide-y divide-gray-200 bg-white">
//                         {(tableData || []).map((row: any, i: number) => {
//                             const rowTotal = calculateRowTotal(row);
//                             return (
//                                 <tr key={row.id} className="divide-x divide-gray-100">
//                                     {columns.map((col:any) => (
//                                         <td key={col.key} className="p-2">
//                                             {col.type === 'Select' ? (
//                                                 <select className={`${inputClasses} !h-11`}
//                                                     value={row[col.key] || ''}
//                                                     onChange={e => onRowChange(i, col.key, e.target.value)}>
//                                                     <option value="">Select Head...</option>
//                                                     {col.options.map((opt: string) => (
//                                                         <option key={opt} value={opt}>{opt}</option>
//                                                     ))}
//                                                 </select>
//                                             ) : col.type === 'Currency' ? (
//                                                 <input type="number" className={`${inputClasses} !h-11`}
//                                                     value={row[col.key] || ''}
//                                                     onChange={e => onRowChange(i, col.key, e.target.value)} />
//                                             ) : col.type === 'ReadOnly' ? (
//                                                 <input readOnly className={`${inputClasses} !h-11 bg-gray-200`}
//                                                     value={rowTotal} />
//                                             ) : null}
//                                         </td>
//                                     ))}
//                                     <td className="p-2 text-center">
//                                         <FrappeButton onClick={() => onDeleteRow(i)}
//                                             className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</FrappeButton>
//                                     </td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>

//                     {/* Footer totals row */}
//                     <tfoot className="bg-yellow-100 border-t border-gray-200">
//                         <tr className="divide-x divide-gray-100 font-bold">
//                             <td colSpan={columns.length - 1} className="p-3 text-right text-lg">Grand Total (₹):</td>
//                             <td className="p-3 text-lg">{grandTotal}</td>
//                             <td />
//                         </tr>
//                     </tfoot>
//                 </table>
//             </div>

//             <FrappeButton onClick={() => onAddRow({ account_head: '', first_year_budget: 0, second_year_budget: 0, third_year_budget: 0 })} className="bg-[#A5D6A7] mt-4">
//                 Add Budget Row
//             </FrappeButton>
//         </div>
//     );
// });




// const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
//     <NeoSection title={title}>
//         <div className="overflow-x-auto border border-gray-200 rounded-md">
//             <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50"><tr className="divide-x divide-gray-100">{[...columns, {key:'actions', label:''}].map((c:any) => (<th key={c.key} className="p-3 font-semibold text-gray-700 text-sm text-left text-sm">{c.label}</th>))}</tr></thead>
//                 <tbody className="divide-y divide-gray-200 bg-white">
//                     {(tableData || []).map((row: any, i: number) => (
//                         <tr key={row.id} className="divide-x divide-gray-100">
//                             {columns.map((col:any) => ( <td key={col.key} className="p-2"> 
//                                 {col.type === 'Attach' ? (
//                                     <input type="file" className={`${inputClasses} !h-11 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:font-bold file:bg-stone-200 hover:file:bg-stone-300`} onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0]||null)} />
//                                 ) : (
//                                     <input type="text" className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)} />
//                                 )}
//                             </td> ))}
//                             <td className="p-2 text-center"><FrappeButton onClick={() => onDeleteRow(tableName, i)} className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</FrappeButton></td>
//                         </tr>
//                     ))}
//                 </tbody>
//             </table>
//         </div>
//         <FrappeButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#A5D6A7] mt-4">Add Row</FrappeButton>
//     </NeoSection>
// ));


// // --- MAIN COMPONENT ---
// const AddFundSanction: React.FC = () => {
//     const navigate = useNavigate();
//     const { projectName } = useParams<{ projectName: string }>();

//     const [fields, setFields] = useState<Field[]>([]);
//     const [formData, setFormData] = useState<FormData>({});
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.api.get_fund_sanction_form_data');
//     const { call: submitForm, error: submitError } = useFrappePostCall('rndopsapp.api.save_fund_sanction_data');

//     useEffect(() => { fetchFormData({ project_proposal: projectName }); }, [fetchFormData, projectName]);

//     // This useEffect is now the single source of truth for fetching data.
//     // It uses the projectName from the URL to tell the backend which project to pre-fill.
//     useEffect(() => {
//         if (projectName) {
//             fetchFormData({ project_proposal: projectName });
//         }
//     }, [fetchFormData, projectName]);


//     useEffect(() => {
//         if (formDataResult?.message) {
//             const { fields, prefill_data, link_options } = formDataResult.message;
//             setFields(fields || []);
//             setLinkOptions(link_options || {});
//             setFormData(prefill_data || {});
//             setLoading(false);
//         }
//         if (formDataError) {
//             console.error("Failed to load form data:", formDataError);
//             alert("Error: Could not load the form.");
//             setLoading(false);
//         }
//     }, [formDataResult, formDataError]);

//     // --- MODIFICATION: Update handleChange to handle side effects ---
//     const handleChange = useCallback((fieldname: string, value: any) => {
//         setFormData(prev => {
//             const newState = { ...prev, [fieldname]: value };
//             // If project_proposal is changed, update the refnum_prj_num
//             if (fieldname === 'project_proposal') {
//                 newState['refnum_prj_num'] = value;
//             }
//             return newState;
//         });
//     }, []);

//     // --- GENERIC TABLE HANDLERS ---
//     const handleGenericTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
//         setFormData(prev => {
//             const table = [...(prev[tableName] || [])];
//             table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
//             return { ...prev, [tableName]: table };
//         });
//     }, []);

//     const handleFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
//         setFormData(prev => {
//             const table = [...(prev[tableName] || [])];
//             table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
//             return { ...prev, [tableName]: table };
//         });
//     }, []);

//     const addGenericTableRow = useCallback((tableName: string, newRow: object) => {
//         const newId = Date.now().toString();
//         setFormData(prev => ({
//             ...prev,
//             [tableName]: [...(prev[tableName] || []), { ...newRow, id: newId }]
//         }));
//     }, []);

//     const deleteGenericTableRow = useCallback((tableName: string, rowIndex: number) => {
//         setFormData(prev => ({
//             ...prev,
//             [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex)
//         }));
//     }, []);

// // Add this helper function inside your component, or outside if you prefer.
// // It converts a file object into a base64 string for JSON transmission.
// const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.readAsDataURL(file);
//     // The result is a string like "data:image/png;base64,iVBORw0KGgo..."
//     reader.onload = () => resolve(reader.result as string);
//     reader.onerror = error => reject(error);
// });


// // This is the primary function to handle the form submission.
// const handleSubmit = async (e: React.FormEvent) => {
//     // 1. Prevent the browser's default form submission behavior.
//     e.preventDefault();
//     setIsSubmitting(true);

//     try {
//         // 2. Create a mutable copy of the form data to process.
//         const dataToSubmit: FormData = { ...formData };

//         // 3. Process the file uploads.
//         // Check if the 'sanction_related_files' table exists and has rows.
//         if (dataToSubmit.sanction_related_files && dataToSubmit.sanction_related_files.length > 0) {

//             // Use Promise.all to wait for all file conversions to complete.
//             const processedFiles = await Promise.all(
//                 dataToSubmit.sanction_related_files.map(async (row: any) => {
//                     // Check if the 'sanction_file' field contains a File object.
//                     if (row.sanction_file instanceof File) {
//                         const fileObject = row.sanction_file;
//                         // Convert the file to a base64 string.
//                         const base64Data = await toBase64(fileObject);

//                         // Return a new row object structured for the backend.
//                         // The backend will need to be adapted to look for these keys.
//                         return {
//                             ...row, // Keep other fields like 'description'
//                             file_name: fileObject.name,
//                             file_data: base64Data, // The base64 string
//                             sanction_file: undefined, // Remove the original File object
//                         };
//                     }
//                     // If it's not a File object, return the row as is.
//                     return row;
//                 })
//             );

//             // Replace the original file table with the processed data.
//             dataToSubmit.sanction_related_files = processedFiles;
//         }

//         console.log("Submitting this payload to Frappe:", dataToSubmit);

//         // 4. *** CRITICAL FIX ***
//         // Call the API by passing the JavaScript object directly.
//         // The `useFrappePostCall` hook will automatically stringify it into a JSON body.
//         // The backend `save_fund_sanction_data(**data)` will receive all keys and values
//         // from the `dataToSubmit` object as arguments.
//         console.log("submitForm data:", dataToSubmit);
//         await submitForm(dataToSubmit);

//         // 5. If the API call is successful, show a confirmation and navigate.
//         alert("Fund Sanction submitted successfully!");

//         // Navigate back to the previous page (the project details overview).
//         navigate(-1);

//     } catch (err: any) {
//         // 6. If the API call fails, log the error and show an alert.
//         console.error("Submission Failed:", err);
//         // Display the error message returned from the Frappe backend.
//         alert(`Submission Failed: ${err.message || 'An unknown server error occurred.'}`);

//     } finally {
//         // 7. Reset the submitting state regardless of success or failure.
//         setIsSubmitting(false);
//     }
// };




//     const renderField = useCallback((fieldname: string) => {
//         const field = fields.find(f => f.fieldname === fieldname);
//         if (!field) return null;
//         return <MemoizedFormField key={field.fieldname} field={field} value={formData[field.fieldname]} options={linkOptions[field.fieldname]} onChange={handleChange} />;
//     }, [fields, formData, linkOptions, handleChange]);

//     if (loading) {
//         return (<div className="flex items-center justify-center min-h-screen">...Loading...</div>);
//     }

//     return (
//         <div className="bg-[#F0F4F8]">
//             <AppSidebar   />
//             <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//               <header className="mb-8 p-4 bg-white border border-gray-200 rounded-md shadow-sm">
//                   <div className="flex items-center gap-4">
//                       <button onClick={() => navigate(-1)} className="p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 active:translate-y-1 transition-transform">
//                           <ArrowLeftIcon className="h-6 w-6" />
//                       </button>
//                       <div>
//                           <h1 className="text-3xl font-bold text-black">Add Fund Sanction</h1>
//                           <p className="text-gray-700  mt-1">For Project: {formData.refnum_prj_num || projectName}</p>
//                       </div>
//                   </div>
//               </header>

//                 <form onSubmit={handleSubmit}>
//                     <FrappeCard className="space-y-12">
//                         <NeoSection title="Project & Sanction Details">
//                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//                                 {renderField('project_proposal')}
//                                 {renderField('refnum_prj_num')}
//                                 {renderField('total_sanctioned_amount')}
//                                 {renderField('sanctioned_letter_no')}
//                                 {renderField('sanctioned_letter_date')}
//                             </div>
//                         </NeoSection>

//                         <NeoSection title="Total Budget Break-up">
//                             <MemoizedBudgetTable 
//                                 tableData={formData.sanctioned_budget_breakup}
//                                 onRowChange={(rowIndex: number, fieldname: string, value: any) =>
//                                     handleGenericTableRowChange("sanctioned_budget_breakup", rowIndex, fieldname, value)
//                                 }
//                                 onAddRow={(newRow: object) =>
//                                     addGenericTableRow("sanctioned_budget_breakup", newRow)
//                                 }
//                                 onDeleteRow={(rowIndex: number) =>
//                                     deleteGenericTableRow("sanctioned_budget_breakup", rowIndex)
//                                 }
//                             />
//                         </NeoSection>



//                         {/* --- NEW FILE UPLOAD TABLE --- */}
//                         <MemoizedGenericTable
//                             title="Upload Sanction Related Files"
//                             tableName="sanction_related_files"
//                             columns={[
//                                 { key: 'sanction_file', label: 'File', type: 'Attach' },
//                                 { key: 'description', label: 'Description', type: 'text' },
//                             ]}
//                             newRow={{ sanction_file: null, description: '' }}
//                             tableData={formData.sanction_related_files}
//                             onRowChange={handleGenericTableRowChange}
//                             onFileChange={handleFileChange}
//                             onAddRow={addGenericTableRow}
//                             onDeleteRow={deleteGenericTableRow}
//                         />

//                     </FrappeCard>
//                     {/* <div className="mt-8 flex justify-end">
//                         <FrappeButton type="submit" disabled={isSubmitting} className="bg-green-300">
//                             {isSubmitting ? 'Submitting...' : 'Submit Sanction'}
//                         </FrappeButton>
//                     </div> */}

//                     <div className="mt-8 flex justify-end gap-4">
//     {formData.status !== "Draft" ? (
//         <FrappeButton type="submit" disabled={isSubmitting} className="bg-blue-300">
//             {isSubmitting ? 'Saving...' : 'Save as Draft'}
//         </FrappeButton>
//     ) : (
//         <FrappeButton type="submit" disabled={isSubmitting} className="bg-green-400">
//             {isSubmitting ? 'Submitting...' : 'Submit Sanction'}
//         </FrappeButton>
//     )}
// </div>

//                 </form>
//             </main>
//         </div>
//     );
// };

// export default AddFundSanction;




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
const inputClasses = "w-full h-12 px-4 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.25)] focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100 read-only:bg-gray-100";
const FrappeCard = ({ children, className }: any) => (<div className={cn("bg-white p-6 md:p-8 border border-gray-200 rounded-xl shadow-sm", className)}>{children}</div>);
const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: any) => (<button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-2.5 border border-gray-200 rounded-lg font-semibold text-gray-700 bg-white shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button>);

const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-3">{title}</h2>{children}</div>);

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
    const columns = [
        { key: 'account_head', label: 'Account Head', type: 'Select', options: ['Consumable', 'Equipment', 'Contingency', 'Travel', 'Manpower', 'Overhead', 'Other'] },
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
            <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr className="divide-x divide-gray-100">
                            {[...columns, { key: 'actions', label: '' }].map((c: any) => (
                                <th key={c.key} className="p-3 font-semibold text-gray-700 text-sm text-left text-sm">{c.label}</th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                        {(tableData || []).map((row: any, i: number) => {
                            const rowTotal = calculateRowTotal(row);
                            return (
                                <tr key={row.id || i} className="divide-x divide-gray-100">
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
                                                <input type="number" step="0.01" className={`${inputClasses} !h-11`}
                                                    value={row[col.key] || ''}
                                                    onChange={e => onRowChange(i, col.key, e.target.value)} />
                                            ) : col.type === 'ReadOnly' ? (
                                                <input readOnly className={`${inputClasses} !h-11 bg-gray-200 font-bold`}
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
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                        <tr className="divide-x divide-gray-100">
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
                className="bg-[#A5D6A7] mt-4">
                Add Budget Row
            </FrappeButton>
        </div>
    );
});

const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
    <NeoSection title={title}>
        <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr className="divide-x divide-gray-100">{[...columns, { key: 'actions', label: '' }].map((c: any) => (<th key={c.key} className="p-3 font-semibold text-gray-700 text-sm text-left text-sm">{c.label}</th>))}</tr></thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {(tableData || []).map((row: any, i: number) => (
                        <tr key={row.id} className="divide-x divide-gray-100">
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
        <FrappeButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#A5D6A7] mt-4">Add Row</FrappeButton>
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

    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_fund_sanction_form_data');
    const { call: submitForm } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.save_fund_sanction_data');

    // Initial data fetch effect based on project name from URL
    useEffect(() => {
        if (projectName) {
            fetchFormData({ project_proposal: projectName });
        }
    }, [fetchFormData, projectName]);

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
        <div className="bg-[#F0F4F8]">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-8 p-4 bg-white border border-gray-200 rounded-md shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 active:translate-y-1 transition-transform">
                            <ArrowLeftIcon className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-black">Add Fund Sanction</h1>
                            <p className="text-gray-700  mt-1">For Project: {formData.refnum_prj_num || projectName}</p>
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