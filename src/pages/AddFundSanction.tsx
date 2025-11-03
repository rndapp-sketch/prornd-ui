

// import React, { useState, useEffect, useCallback } from 'react';
// import { AppSidebar } from "../components/RndSidebar";
// import useUserRoleCheck from "../components/UserRoleCheck";
// import { useFrappePostCall, useFrappeGetCall, useFrappeGetDocList } from 'frappe-react-sdk';
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
// }

// interface SanctionedBudgetBreakupRow {
//     id: string;
//     account_head?: string;
//     year1?: number;
//     year2?: number;
//     year3?: number;
//     year4?: number;
//     year5?: number;
//     total?: number;
// }

// interface SanctionRelatedFileRow {
//     id: string;
//     file?: File | null;
//     description?: string;
// }

// interface FundTransactionRow {
//     id: string;
//     transaction_number?: string;
//     date?: string;
//     amount?: number;
// }

// interface ReceivedAmountBreakupRow {
//     id: string;
//     account_head?: string;
//     amount_received?: number;
//     budget_year?: string;
//     remarks?: string;
// }

// // --- DYNAMIC LINK FIELD COMPONENT ---
// const LinkField: React.FC<{ field: Field; className: string }> = ({ field, className }) => {
//     if (!field.options) {
//         return <p className="text-red-500">No options defined for {field.label}</p>;
//     }

//     const { data, error } = useFrappeGetDocList<{ name: string }>(
//         field.options, 
//         { fields: ['name'], limit: 100 }
//     );

//     if (error) {
//         return <p className="text-red-500">Error loading options for {field.label}</p>;
//     }

//     return (
//         <select
//             id={field.fieldname}
//             name={field.fieldname}
//             className={className}
//             required={field.mandatory}
//             disabled={field.read_only}
//             defaultValue={field.default || ''}
//         >
//             <option value="">Select {field.label}</option>
//             {data?.map(option => (
//                 <option key={option.name} value={option.name}>
//                     {option.name}
//                 </option>
//             ))}
//         </select>
//     );
// };

// const AddFundSanction: React.FC = () => {
//     // --- STATE MANAGEMENT & API HOOKS ---
//     const [fields, setFields] = useState<Field[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const isPermanentEmployee = useUserRoleCheck();
//     const [sanctionedBudgetBreakup, setSanctionedBudgetBreakup] = useState<SanctionedBudgetBreakupRow[]>([]);
//     const [sanctionRelatedFiles, setSanctionRelatedFiles] = useState<SanctionRelatedFileRow[]>([]);
//     const [fundTransactions, setFundTransactions] = useState<FundTransactionRow[]>([]);
//     const [receivedAmountBreakup, setReceivedAmountBreakup] = useState<ReceivedAmountBreakupRow[]>([]);

//     // Fetch form fields from Frappe
//     const { data: formData, error: formError } = useFrappeGetCall<{ fields: Field[] }>(
//         'rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_fund_sanction_form_data',
//         {},
//         undefined,
//         {
//             onSuccess: (data) => {
//                 console.log("Fund sanction form",data);
//                 setLoading(false);
//                 if (data?.fields) {
//                     setFields(data.fields);
//                 }
//             },
//             onError: () => {
//                 setLoading(false);
//             }
//         }
//     );

//     const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.save_fund_sanction_data');

//     useEffect(() => {
//         if (submitResult) {
//             alert(`Fund Sanction submitted successfully: ${submitResult.message.docname}`);
//         }
//         if (submitError) {
//             alert(`Submission error: ${submitError.message}`);
//         }
//         setIsSubmitting(false);
//     }, [submitResult, submitError]);

//     // --- EVENT HANDLERS ---
//     const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

//     const addRow = useCallback((setter: React.Dispatch<React.SetStateAction<any[]>>, defaultRow: any) => {
//         setter((prev: any[]) => [...prev, { ...defaultRow, id: generateId() }]);
//     }, []);

//     const handleTableChange = useCallback((
//         setter: React.Dispatch<React.SetStateAction<any[]>>, 
//         index: number, 
//         field: string, 
//         value: any
//     ) => {
//         setter(prev => {
//             const newRows = [...prev];
//             newRows[index] = { ...newRows[index], [field]: value };
//             return newRows;
//         });
//     }, []);

//     // Stable input change handler for table fields
//     const createTableInputHandler = useCallback((
//         setter: React.Dispatch<React.SetStateAction<any[]>>,
//         index: number,
//         field: string,
//         type: 'text' | 'number' | 'date' | 'file' = 'text'
//     ) => {
//         return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//             let value: any = e.target.value;
//             if (type === 'number') {
//                 value = value === '' ? undefined : Number(value);
//             } else if (type === 'file') {
//                 value = (e.target as HTMLInputElement).files?.[0] || null;
//             }
//             handleTableChange(setter, index, field, value);
//         };
//     }, [handleTableChange]);

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (isSubmitting) return;
        
//         setIsSubmitting(true);
        
//         // Create FormData object from the form
//         const form = e.target as HTMLFormElement;
//         const formData = new FormData(form);
        
//         // Add table data to FormData (remove id fields)
//         const sanitizedBudgetBreakup = sanctionedBudgetBreakup.map(({ id, ...rest }) => rest);
//         const sanitizedRelatedFiles = sanctionRelatedFiles.map(({ id, ...rest }) => rest);
//         const sanitizedTransactions = fundTransactions.map(({ id, ...rest }) => rest);
//         const sanitizedAmountBreakup = receivedAmountBreakup.map(({ id, ...rest }) => rest);

//         sanitizedBudgetBreakup.forEach((row, index) => {
//             Object.entries(row).forEach(([key, value]) => {
//                 if (value !== undefined && value !== null) {
//                     formData.append(`sanctioned_budget_breakup[${index}][${key}]`, value.toString());
//                 }
//             });
//         });

//         sanitizedRelatedFiles.forEach((row, index) => {
//             Object.entries(row).forEach(([key, value]) => {
//                 if (value !== undefined && value !== null) {
//                     if (key === 'file' && value instanceof File) {
//                         formData.append(`sanction_related_files[${index}][${key}]`, value);
//                     } else {
//                         formData.append(`sanction_related_files[${index}][${key}]`, value.toString());
//                     }
//                 }
//             });
//         });

//         sanitizedTransactions.forEach((row, index) => {
//             Object.entries(row).forEach(([key, value]) => {
//                 if (value !== undefined && value !== null) {
//                     formData.append(`fund_transactions[${index}][${key}]`, value.toString());
//                 }
//             });
//         });

//         sanitizedAmountBreakup.forEach((row, index) => {
//             Object.entries(row).forEach(([key, value]) => {
//                 if (value !== undefined && value !== null) {
//                     formData.append(`received_amount_breakup[${index}][${key}]`, value.toString());
//                 }
//             });
//         });

//         try {
//             await submitForm({
//                 form_data: Object.fromEntries(formData.entries()),
//                 sanctioned_budget_breakup: sanitizedBudgetBreakup,
//                 sanction_related_files: sanitizedRelatedFiles,
//                 fund_transactions: sanitizedTransactions,
//                 received_amount_breakup: sanitizedAmountBreakup
//             });
//         } catch (error) {
//             console.error('Submission error:', error);
//             setIsSubmitting(false);
//         }
//     };

//     // Render form field based on fieldtype
//     const renderFormField = (field: Field) => {
//         if (field.hidden) return null;

//         const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";

//         switch (field.fieldtype) {
//             case 'Link':
//                 return <LinkField field={field} className={inputClasses} />;

//             case 'Date':
//                 return (
//                     <input
//                         type="date"
//                         id={field.fieldname}
//                         name={field.fieldname}
//                         className={inputClasses}
//                         required={field.mandatory}
//                         disabled={field.read_only}
//                         defaultValue={field.default || ''}
//                     />
//                 );

//             case 'Int':
//             case 'Float':
//             case 'Currency':
//                 return (
//                     <input
//                         type="number"
//                         id={field.fieldname}
//                         name={field.fieldname}
//                         className={inputClasses}
//                         required={field.mandatory}
//                         disabled={field.read_only}
//                         defaultValue={field.default || ''}
//                         step={field.fieldtype === 'Int' ? '1' : '0.01'}
//                     />
//                 );

//             case 'Check':
//                 return (
//                     <input
//                         type="checkbox"
//                         id={field.fieldname}
//                         name={field.fieldname}
//                         className="h-5 w-5 border-2 border-black rounded focus:ring-2 focus:ring-[#90A4AE]"
//                         defaultChecked={field.default}
//                         disabled={field.read_only}
//                     />
//                 );

//             case 'Text Editor':
//             case 'Text':
//                 return (
//                     <textarea
//                         id={field.fieldname}
//                         name={field.fieldname}
//                         className="w-full min-h-[100px] px-4 py-3 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200"
//                         required={field.mandatory}
//                         disabled={field.read_only}
//                         defaultValue={field.default || ''}
//                     />
//                 );

//             case 'Select':
//                 return (
//                     <select
//                         id={field.fieldname}
//                         name={field.fieldname}
//                         className={inputClasses}
//                         required={field.mandatory}
//                         disabled={field.read_only}
//                         defaultValue={field.default || ''}
//                     >
//                         <option value="">Select {field.label}</option>
//                         {field.options?.split('\n').map(option => (
//                             <option key={option} value={option}>
//                                 {option}
//                             </option>
//                         ))}
//                     </select>
//                 );

//             default:
//                 return (
//                     <input
//                         type="text"
//                         id={field.fieldname}
//                         name={field.fieldname}
//                         className={inputClasses}
//                         required={field.mandatory}
//                         disabled={field.read_only}
//                         defaultValue={field.default || ''}
//                     />
//                 );
//         }
//     };

//     // Filter out table fields and child table fields from main form
//     const mainFormFields = fields.filter(field => 
//         !field.fieldname.includes('sanctioned_budget_breakup') &&
//         !field.fieldname.includes('sanction_related_files') &&
//         !field.fieldname.includes('fund_transactions') &&
//         !field.fieldname.includes('received_amount_breakup') &&
//         !field.fieldtype.includes('Table')
//     );

//     // --- REUSABLE COMPONENTS ---
//     const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
//         <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div>
//     );

//     const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => (
//         <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300", className)}>{children}</button>
//     );

//     const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";

//     // --- RENDER ---
//     if (loading) return (
//         <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
//             <div className="text-center">
//                 <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE] mx-auto"></div>
//                 <p className="mt-4 text-2xl font-bold text-black">LOADING FORM...</p>
//             </div>
//         </div>
//     );

//     if (formError) return (
//         <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
//             <div className="text-center p-4">
//                 <p className="text-2xl font-bold text-red-600">Error loading form</p>
//                 <p className="mt-2 text-gray-700">There was an error fetching the form metadata. Here are the details:</p>
//                 <pre className="mt-4 text-left bg-gray-100 p-4 rounded-md overflow-x-auto shadow-inner">
//                     {JSON.stringify(formError, null, 2)}
//                 </pre>
//             </div>
//         </div>
//     );

//     return (
//         <div className="bg-[#FDFCEC]">
//             <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
//             <main className="flex-1 p-4 md:p-8 w-full overflow-hidden bg-[#FDFCEC]">
//                 <header className="mb-8">
//                     <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight uppercase">
//                         Add Fund Sanction
//                     </h1>
//                 </header>

//                 <form onSubmit={handleSubmit}>
//                     <NeoCard className="space-y-8">
//                         {/* Dynamically rendered main form fields */}
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                             {mainFormFields.map(field => (
//                                 <div key={field.fieldname} className={field.fieldtype === 'Text Editor' || field.fieldtype === 'Text' ? 'md:col-span-2' : ''}>
//                                     <label htmlFor={field.fieldname} className="block font-bold text-black text-lg">
//                                         {field.label}
//                                         {field.mandatory && <span className="text-red-500 ml-1">*</span>}
//                                     </label>
//                                     {field.description && (
//                                         <p className="text-sm text-gray-700 font-mono mt-1">{field.description}</p>
//                                     )}
//                                     {renderFormField(field)}
//                                 </div>
//                             ))}
//                         </div>

//                         {/* Total Budget Break-up Table */}
//                         <div>
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-2xl font-bold text-black">Total Budget Break-up</h2>
//                                 <NeoButton onClick={() => addRow(setSanctionedBudgetBreakup, {})}>Add Row</NeoButton>
//                             </div>
//                             <table className="w-full border-collapse border-2 border-black">
//                                 <thead>
//                                     <tr>
//                                         <th className="border-2 border-black p-2">No.</th>
//                                         <th className="border-2 border-black p-2">Account Head</th>
//                                         <th className="border-2 border-black p-2">1st Year</th>
//                                         <th className="border-2 border-black p-2">2nd Year</th>
//                                         <th className="border-2 border-black p-2">3rd Year</th>
//                                         <th className="border-2 border-black p-2">4th Year</th>
//                                         <th className="border-2 border-black p-2">5th Year</th>
//                                         <th className="border-2 border-black p-2">Total</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {sanctionedBudgetBreakup.length === 0 ? (
//                                         <tr>
//                                             <td colSpan={8} className="text-center p-4">Grid Empty State No Data</td>
//                                         </tr>
//                                     ) : (
//                                         sanctionedBudgetBreakup.map((row, index) => (
//                                             <tr key={row.id}>
//                                                 <td className="border-2 border-black p-2">{index + 1}</td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="text" 
//                                                         className={inputClasses}
//                                                         value={row.account_head || ''}
//                                                         onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'account_head', 'text')}
//                                                     />
//                                                 </td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="number" 
//                                                         className={inputClasses}
//                                                         value={row.year1 || ''}
//                                                         onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year1', 'number')}
//                                                     />
//                                                 </td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="number" 
//                                                         className={inputClasses}
//                                                         value={row.year2 || ''}
//                                                         onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year2', 'number')}
//                                                     />
//                                                 </td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="number" 
//                                                         className={inputClasses}
//                                                         value={row.year3 || ''}
//                                                         onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year3', 'number')}
//                                                     />
//                                                 </td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="number" 
//                                                         className={inputClasses}
//                                                         value={row.year4 || ''}
//                                                         onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year4', 'number')}
//                                                     />
//                                                 </td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="number" 
//                                                         className={inputClasses}
//                                                         value={row.year5 || ''}
//                                                         onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year5', 'number')}
//                                                     />
//                                                 </td>
//                                                 <td className="border-2 border-black p-2">
//                                                     {(row.year1 || 0) + (row.year2 || 0) + (row.year3 || 0) + (row.year4 || 0) + (row.year5 || 0)}
//                                                 </td>
//                                             </tr>
//                                         ))
//                                     )}
//                                 </tbody>
//                                 <tfoot>
//                                     <tr>
//                                         <td colSpan={2} className="text-right font-bold p-2 border-2 border-black">Total</td>
//                                         <td className="p-2 border-2 border-black">₹ {sanctionedBudgetBreakup.reduce((acc, row) => acc + (row.year1 || 0), 0)}</td>
//                                         <td className="p-2 border-2 border-black">₹ {sanctionedBudgetBreakup.reduce((acc, row) => acc + (row.year2 || 0), 0)}</td>
//                                         <td className="p-2 border-2 border-black">₹ {sanctionedBudgetBreakup.reduce((acc, row) => acc + (row.year3 || 0), 0)}</td>
//                                         <td className="p-2 border-2 border-black">₹ {sanctionedBudgetBreakup.reduce((acc, row) => acc + (row.year4 || 0), 0)}</td>
//                                         <td className="p-2 border-2 border-black">₹ {sanctionedBudgetBreakup.reduce((acc, row) => acc + (row.year5 || 0), 0)}</td>
//                                         <td className="p-2 border-2 border-black">₹ {sanctionedBudgetBreakup.reduce((acc, row) => acc + (row.year1 || 0) + (row.year2 || 0) + (row.year3 || 0) + (row.year4 || 0) + (row.year5 || 0), 0)}</td>
//                                     </tr>
//                                 </tfoot>
//                             </table>
//                         </div>

//                         {/* Upload Sanction Related Files Table */}
//                         <div>
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-2xl font-bold text-black">Upload Sanction Related Files</h2>
//                                 <NeoButton onClick={() => addRow(setSanctionRelatedFiles, {})}>Add Row</NeoButton>
//                             </div>
//                             <table className="w-full border-collapse border-2 border-black">
//                                 <thead>
//                                     <tr>
//                                         <th className="border-2 border-black p-2">No.</th>
//                                         <th className="border-2 border-black p-2">File</th>
//                                         <th className="border-2 border-black p-2">Description</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {sanctionRelatedFiles.length === 0 ? (
//                                         <tr>
//                                             <td colSpan={3} className="text-center p-4">Grid Empty State No Data</td>
//                                         </tr>
//                                     ) : (
//                                         sanctionRelatedFiles.map((row, index) => (
//                                             <tr key={row.id}>
//                                                 <td className="border-2 border-black p-2">{index + 1}</td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="file" 
//                                                         className={inputClasses}
//                                                         onChange={createTableInputHandler(setSanctionRelatedFiles, index, 'file', 'file')}
//                                                     />
//                                                 </td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="text" 
//                                                         className={inputClasses}
//                                                         value={row.description || ''}
//                                                         onChange={createTableInputHandler(setSanctionRelatedFiles, index, 'description', 'text')}
//                                                     />
//                                                 </td>
//                                             </tr>
//                                         ))
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Fund Transactions Table */}
//                         <div>
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-2xl font-bold text-black">Sanction Transactions Details</h2>
//                                 <NeoButton onClick={() => addRow(setFundTransactions, {})}>Add Row</NeoButton>
//                             </div>
//                             <table className="w-full border-collapse border-2 border-black">
//                                 <thead>
//                                     <tr>
//                                         <th className="border-2 border-black p-2">No.</th>
//                                         <th className="border-2 border-black p-2">Transaction Number (UTR No)</th>
//                                         <th className="border-2 border-black p-2">Date</th>
//                                         <th className="border-2 border-black p-2">Amount (₹)</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {fundTransactions.length === 0 ? (
//                                         <tr>
//                                             <td colSpan={4} className="text-center p-4">Grid Empty State No Data</td>
//                                         </tr>
//                                     ) : (
//                                         fundTransactions.map((row, index) => (
//                                             <tr key={row.id}>
//                                                 <td className="border-2 border-black p-2">{index + 1}</td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="text" 
//                                                         className={inputClasses}
//                                                         value={row.transaction_number || ''}
//                                                         onChange={createTableInputHandler(setFundTransactions, index, 'transaction_number', 'text')}
//                                                     />
//                                                 </td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="date" 
//                                                         className={inputClasses}
//                                                         value={row.date || ''}
//                                                         onChange={createTableInputHandler(setFundTransactions, index, 'date', 'date')}
//                                                     />
//                                                 </td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="number" 
//                                                         className={inputClasses}
//                                                         value={row.amount || ''}
//                                                         onChange={createTableInputHandler(setFundTransactions, index, 'amount', 'number')}
//                                                     />
//                                                 </td>
//                                             </tr>
//                                         ))
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Received Amount Breakup Table */}
//                         <div>
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-2xl font-bold text-black">Budget Breakup of the Received Amount</h2>
//                                 <NeoButton onClick={() => addRow(setReceivedAmountBreakup, {})}>Add Row</NeoButton>
//                             </div>
//                             <table className="w-full border-collapse border-2 border-black">
//                                 <thead>
//                                     <tr>
//                                         <th className="border-2 border-black p-2">No.</th>
//                                         <th className="border-2 border-black p-2">Account Head.</th>
//                                         <th className="border-2 border-black p-2">Amount Received (₹)</th>
//                                         <th className="border-2 border-black p-2">Budget Year</th>
//                                         <th className="border-2 border-black p-2">Remarks</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {receivedAmountBreakup.length === 0 ? (
//                                         <tr>
//                                             <td colSpan={5} className="text-center p-4">Grid Empty State No Data</td>
//                                         </tr>
//                                     ) : (
//                                         receivedAmountBreakup.map((row, index) => (
//                                             <tr key={row.id}>
//                                                 <td className="border-2 border-black p-2">{index + 1}</td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="text" 
//                                                         className={inputClasses}
//                                                         value={row.account_head || ''}
//                                                         onChange={createTableInputHandler(setReceivedAmountBreakup, index, 'account_head', 'text')}
//                                                     />
//                                                 </td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="number" 
//                                                         className={inputClasses}
//                                                         value={row.amount_received || ''}
//                                                         onChange={createTableInputHandler(setReceivedAmountBreakup, index, 'amount_received', 'number')}
//                                                     />
//                                                 </td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="text" 
//                                                         className={inputClasses}
//                                                         value={row.budget_year || ''}
//                                                         onChange={createTableInputHandler(setReceivedAmountBreakup, index, 'budget_year', 'text')}
//                                                     />
//                                                 </td>
//                                                 <td className="border-2 border-black p-2">
//                                                     <input 
//                                                         type="text" 
//                                                         className={inputClasses}
//                                                         value={row.remarks || ''}
//                                                         onChange={createTableInputHandler(setReceivedAmountBreakup, index, 'remarks', 'text')}
//                                                     />
//                                                 </td>
//                                             </tr>
//                                         ))
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </NeoCard>
//                     <div className="mt-8 flex justify-end">
//                         <NeoButton type="submit" disabled={isSubmitting} className="bg-[#A5D6A7]">
//                             {isSubmitting ? 'SUBMITTING...' : 'Submit'}
//                         </NeoButton>
//                     </div>
//                 </form>
//             </main>
//         </div>
//     );
// };

// export default AddFundSanction;



// -0=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-


// import React, { useState, useEffect, useCallback } from 'react';
// import { AppSidebar } from "../components/RndSidebar"; // Assuming this path is correct
// import useUserRoleCheck from "../components/UserRoleCheck"; // Assuming this path is correct
// import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils'; // Assuming this path is correct

// // --- TYPE DEFINITIONS ---

// // Describes a single field from the API
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

// // Describes a single option for a 'Link' field dropdown
// interface LinkOption {
//     value: string;
//     label: string;
// }

// // Describes the full structure of the API response
// interface FundSanctionFormResponse {
//     message: {
//         fields: Field[];
//         link_options: {
//             [key: string]: LinkOption[];
//         };
//     }
// }

// // Describes the data structure for each row in the four tables
// interface SanctionedBudgetBreakupRow {
//     id: string; // Client-side only ID for React key
//     account_head?: string;
//     year1?: number;
//     year2?: number;
//     year3?: number;
//     year4?: number;
//     year5?: number;
// }

// interface SanctionRelatedFileRow {
//     id: string;
//     file?: File | null;
//     description?: string;
// }

// interface FundTransactionRow {
//     id: string;
//     transaction_number?: string;
//     date?: string;
//     amount?: number;
// }

// interface ReceivedAmountBreakupRow {
//     id:string;
//     account_head?: string;
//     amount_received?: number;
//     budget_year?: string;
//     remarks?: string;
// }


// // --- REUSABLE SUB-COMPONENTS ---

// /**
//  * A simplified, efficient component to render a dropdown for 'Link' fields.
//  * It receives its options as a prop instead of fetching them itself.
//  */
// const LinkField: React.FC<{ field: Field; className: string; options: LinkOption[] }> = ({ field, className, options = [] }) => {
//     return (
//         <select
//             id={field.fieldname}
//             name={field.fieldname}
//             className={className}
//             required={field.mandatory}
//             disabled={field.read_only}
//             defaultValue={field.default || ''}
//         >
//             <option value="">Select {field.label}</option>
//             {options.map(option => (
//                 <option key={option.value} value={option.value}>
//                     {option.label}
//                 </option>
//             ))}
//         </select>
//     );
// };


// // --- MAIN COMPONENT ---

// const AddFundSanction: React.FC = () => {
//     // --- STATE MANAGEMENT ---
//     const [fields, setFields] = useState<Field[]>([]);
//     const [linkOptions, setLinkOptions] = useState<{ [key: string]: LinkOption[] }>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const isPermanentEmployee = useUserRoleCheck();

//     // State for each of the four tables
//     const [sanctionedBudgetBreakup, setSanctionedBudgetBreakup] = useState<SanctionedBudgetBreakupRow[]>([]);
//     const [sanctionRelatedFiles, setSanctionRelatedFiles] = useState<SanctionRelatedFileRow[]>([]);
//     const [fundTransactions, setFundTransactions] = useState<FundTransactionRow[]>([]);
//     const [receivedAmountBreakup, setReceivedAmountBreakup] = useState<ReceivedAmountBreakupRow[]>([]);
// useEffect(() => {
//   console.log("🔁 AddFundSanction mounted");
// }, []);

//     // --- API HOOKS ---
//     // Fetch the entire form structure in one call
//     // const { error: formError } = useFrappeGetCall<FundSanctionFormResponse>(
//     //     'rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_fund_sanction_form_data',
//     //     {},
//     //     undefined,
//     //     {
//     //         onSuccess: (data) => {
//     //             setLoading(false);
//     //             if (data?.message?.fields) {
//     //                 setFields(data.message.fields);
//     //             }
//     //             if (data?.message?.link_options) {
//     //                 setLinkOptions(data.message.link_options);
//     //             }
//     //         },
//     //         onError: () => {
//     //             setLoading(false);
//     //         }
//     //     }
//     // );

//     // --- API HOOKS ---
// // ✅ Memoize args and ensure the hook runs only once
// const stableArgs = React.useMemo(() => ({}), []);

// // ✅ Fetch once — prevent re-fetch on every render
// const { data: formData, error: formError, isLoading } =
//   useFrappeGetCall<FundSanctionFormResponse>(
//     'rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_fund_sanction_form_data',
//     stableArgs,
//     undefined,
//     { revalidateOnFocus: false, revalidateIfStale: false } // 👈 prevents unwanted revalidation
//   );

// // ✅ Effect to update local state only when data changes
// useEffect(() => {
//   if (formData?.message) {
//     setFields(formData.message.fields || []);
//     setLinkOptions(formData.message.link_options || {});
//     setLoading(false);
//   }
// }, [formData]);

// // ✅ Handle error + loading flags properly
// useEffect(() => {
//   if (formError) {
//     console.error('Error loading form data:', formError);
//     setLoading(false);
//   }
// }, [formError]);



//     // Hook for submitting the form data
//     const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.save_fund_sanction_data');

//     // Effect to handle submission feedback
//     useEffect(() => {
//         if (submitResult) {
//             alert(`Fund Sanction submitted successfully!`);
//             // Optionally, redirect the user or clear the form here
//         }
//         if (submitError) {
//             alert(`Submission error: ${submitError.message}`);
//         }
//         setIsSubmitting(false);
//     }, [submitResult, submitError]);


//     // --- EVENT HANDLERS & HELPERS ---
//     const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

//     // Generic function to add a new row to any table
//     const addRow = useCallback(<T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, defaultRow: Omit<T, 'id'>) => {
//         setter((prev) => [...prev, { ...defaultRow, id: generateId() } as T]);
//     }, []);
    
//     // Generic handler to update a cell in any table
//     // const createTableInputHandler = useCallback(<T extends object>(
//     //     setter: React.Dispatch<React.SetStateAction<T[]>>,
//     //     index: number,
//     //     field: keyof T,
//     //     type: 'text' | 'number' | 'date' | 'file' = 'text'
//     // ) => {
//     //     return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     //         let value: any;
//     //         if (type === 'file') {
//     //             value = (e.target as HTMLInputElement).files?.[0] || null;
//     //         } else {
//     //             value = e.target.value;
//     //             if (type === 'number') {
//     //                 value = value === '' ? undefined : Number(value);
//     //             }
//     //         }
//     //         setter(prev => {
//     //             const newRows = [...prev];
//     //             newRows[index] = { ...newRows[index], [field]: value };
//     //             return newRows;
//     //         });
//     //     };
//     // }, []);

//     const createTableInputHandler = useCallback(<T extends Record<string, any>>(
//     setter: React.Dispatch<React.SetStateAction<T[]>>,
//     index: number,
//     field: keyof T,
//     type: 'text' | 'number' | 'date' | 'file' = 'text'
// ) => {
//     return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//         let value: any;
//         if (type === 'file') {
//             value = (e.target as HTMLInputElement).files?.[0] || null;
//         } else {
//             value = e.target.value;
//             if (type === 'number') {
//                 value = value === '' ? undefined : Number(value);
//             }
//         }

// setter(prev => {
//   console.log('prev before update:', prev);
//   const newRows = prev.map((row, i) =>
//     i === index ? { ...row, [field]: value } : row
//   );
//   console.log('newRows after update:', newRows);
//   return newRows;
// });
//     };
// }, []);


//     // Form submission handler
//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (isSubmitting) return;
//         setIsSubmitting(true);

//         const formElement = e.target as HTMLFormElement;
//         const formData = new FormData(formElement);
        
//         // Add table data to the FormData object as JSON strings
//         // The backend will need to parse these strings
//         formData.append('sanctioned_budget_breakup', JSON.stringify(sanctionedBudgetBreakup.map(({ id, ...rest }) => rest)));
//         formData.append('fund_transactions', JSON.stringify(fundTransactions.map(({ id, ...rest }) => rest)));
//         formData.append('received_amount_breakup', JSON.stringify(receivedAmountBreakup.map(({ id, ...rest }) => rest)));

//         // Handle file uploads separately
//         const fileData = sanctionRelatedFiles.map(({ id, ...rest }) => rest);
//         formData.append('sanction_related_files_meta', JSON.stringify(fileData.map(f => ({description: f.description}))));
        
//         fileData.forEach((row, index) => {
//             if (row.file) {
//                 // Append each file with a unique key
//                 formData.append(`file_${index}`, row.file);
//             }
//         });

//         // Convert FormData to a plain object for the API call
//         const formObject: { [key: string]: any } = {};
//         formData.forEach((value, key) => {
//             formObject[key] = value;
//         });

//         try {
//             await submitForm({form_data: formObject});
//         } catch (error) {
//             console.error('Submission processing error:', error);
//             setIsSubmitting(false);
//         }
//     };


//     // --- DYNAMIC FIELD RENDERER ---
//     const renderFormField = (field: Field) => {
//         if (field.hidden) return null;
//         const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";

//         switch (field.fieldtype) {
//             case 'Link':
//                 return <LinkField field={field} className={inputClasses} options={linkOptions[field.fieldname]} />;
//             case 'Date':
//                 return <input type="date" id={field.fieldname} name={field.fieldname} className={inputClasses} required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''} />;
//             case 'Currency':
//             case 'Float':
//             case 'Int':
//                 return <input type="number" id={field.fieldname} name={field.fieldname} className={inputClasses} required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''} step={field.fieldtype === 'Int' ? '1' : '0.01'} />;
//             case 'Select':
//                 return (
//                     <select id={field.fieldname} name={field.fieldname} className={inputClasses} required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''}>
//                         <option value="">Select {field.label}</option>
//                         {field.options?.split('\n').filter(opt => opt.trim() !== '').map(option => (<option key={option} value={option}>{option}</option>))}
//                     </select>
//                 );
//             case 'Text Editor':
//             case 'Text':
//                 return <textarea id={field.fieldname} name={field.fieldname} className="w-full min-h-[100px] px-4 py-3 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE]" required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''} />;
//             default: // Catches 'Data' and other text types
//                 return <input type="text" id={field.fieldname} name={field.fieldname} className={inputClasses} required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''} />;
//         }
//     };

//     // Filter out table definitions from the main form fields
//     const mainFormFields = fields.filter(field => field.fieldtype !== 'Table');
    

//     // --- REUSABLE UI COMPONENTS ---
//     const NeoCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div>;
//     const NeoButton: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }> = ({ children, onClick, disabled, className, type = "button" }) => <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50", className)}>{children}</button>;
//     const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE]";


//     // --- RENDER SECTION ---
//     if (loading) return (
//         <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
//             <div className="text-center">
//                 <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE]"></div>
//                 <p className="mt-4 text-2xl font-bold">LOADING FORM...</p>
//             </div>
//         </div>
//     );

//     if (formError) return (
//         <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC] p-4">
//              <div className="text-center p-4 max-w-2xl">
//                 <p className="text-2xl font-bold text-red-600">Error Loading Form</p>
//                 <p className="mt-2 text-gray-700">Could not fetch form metadata from the server.</p>
//                 <pre className="mt-4 text-left bg-gray-100 p-4 rounded-md overflow-x-auto shadow-inner">
//                     {JSON.stringify(formError, null, 2)}
//                 </pre>
//             </div>
//         </div>
//     );

//     return (
//         <div className="bg-[#FDFCEC]">
//             <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
//             <main className="flex-1 p-4 md:p-8 w-full overflow-hidden bg-[#FDFCEC]">
//                 <header className="mb-8">
//                     <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight uppercase">
//                         Add Fund Sanction
//                     </h1>
//                 </header>

//                 <form onSubmit={handleSubmit} encType="multipart/form-data">
//                     <NeoCard className="space-y-12">
//                         {/* Section 1: Main form fields */}
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                             {mainFormFields.map(field => (
//                                 <div key={field.fieldname} className={field.fieldtype.includes('Text') ? 'md:col-span-2' : ''}>
//                                     <label htmlFor={field.fieldname} className="block font-bold text-black text-lg mb-2">
//                                         {field.label} {field.mandatory && <span className="text-red-500">*</span>}
//                                     </label>
//                                     {field.description && <p className="text-sm text-gray-700 font-mono mt-1 mb-2">{field.description}</p>}
//                                     {renderFormField(field)}
//                                 </div>
//                             ))}
//                         </div>

//                         {/* Section 2: Total Budget Break-up Table */}
//                         <div className="overflow-x-auto">
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-2xl font-bold text-black">Total Budget Break-up</h2>
//                                 <NeoButton onClick={() => addRow(setSanctionedBudgetBreakup, {})}>Add Row</NeoButton>
//                             </div>
//                             <table className="w-full min-w-[900px] border-collapse border-2 border-black">
//                                 <thead className="bg-gray-100">
//                                     <tr>
//                                         {['No.', 'Account Head', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Total'].map(h => <th key={h} className="border-2 border-black p-2 text-left">{h}</th>)}
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {sanctionedBudgetBreakup.length === 0 ? (
//                                         <tr><td colSpan={8} className="text-center p-4">No budget data added.</td></tr>
//                                     ) : (
//                                         sanctionedBudgetBreakup.map((row, index) => {
//                                             const total = (row.year1 || 0) + (row.year2 || 0) + (row.year3 || 0) + (row.year4 || 0) + (row.year5 || 0);
//                                             return (
//                                             <tr key={row.id}>
//                                                 <td className="border-2 border-black p-2">{index + 1}</td>
//                                                 <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.account_head || ''} onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'account_head')} /></td>
//                                                 <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year1 || ''} onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year1', 'number')} /></td>
//                                                 <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year2 || ''} onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year2', 'number')} /></td>
//                                                 <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year3 || ''} onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year3', 'number')} /></td>
//                                                 <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year4 || ''} onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year4', 'number')} /></td>
//                                                 <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year5 || ''} onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year5', 'number')} /></td>
//                                                 <td className="border-2 border-black p-2 bg-gray-100 font-bold">₹ {total.toLocaleString('en-IN')}</td>
//                                             </tr>
//                                             );
//                                         })
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Section 3: Upload Sanction Related Files Table */}
//                         <div className="overflow-x-auto">
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-2xl font-bold text-black">Upload Sanction Related Files</h2>
//                                 <NeoButton onClick={() => addRow(setSanctionRelatedFiles, {})}>Add Row</NeoButton>
//                             </div>
//                             <table className="w-full border-collapse border-2 border-black">
//                                 <thead className="bg-gray-100"><tr><th className="border-2 border-black p-2 text-left">No.</th><th className="border-2 border-black p-2 text-left">File</th><th className="border-2 border-black p-2 text-left">Description</th></tr></thead>
//                                 <tbody>
//                                     {sanctionRelatedFiles.map((row, index) => (
//                                         <tr key={row.id}>
//                                             <td className="border-2 border-black p-2">{index + 1}</td>
//                                             <td className="border-2 border-black p-2"><input type="file" className={inputClasses} onChange={createTableInputHandler(setSanctionRelatedFiles, index, 'file', 'file')} /></td>
//                                             <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.description || ''} onChange={createTableInputHandler(setSanctionRelatedFiles, index, 'description')} /></td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Section 4: Sanction Transactions Details Table */}
//                         <div className="overflow-x-auto">
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-2xl font-bold text-black">Sanction Transactions Details</h2>
//                                 <NeoButton onClick={() => addRow(setFundTransactions, {})}>Add Row</NeoButton>
//                             </div>
//                             <table className="w-full border-collapse border-2 border-black">
//                                 <thead className="bg-gray-100"><tr><th className="border-2 border-black p-2 text-left">No.</th><th className="border-2 border-black p-2 text-left">Transaction Number (UTR No)</th><th className="border-2 border-black p-2 text-left">Date</th><th className="border-2 border-black p-2 text-left">Amount (₹)</th></tr></thead>
//                                 <tbody>
//                                     {fundTransactions.map((row, index) => (
//                                         <tr key={row.id}>
//                                             <td className="border-2 border-black p-2">{index + 1}</td>
//                                             <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.transaction_number || ''} onChange={createTableInputHandler(setFundTransactions, index, 'transaction_number')} /></td>
//                                             <td className="border-2 border-black p-2"><input type="date" className={inputClasses} value={row.date || ''} onChange={createTableInputHandler(setFundTransactions, index, 'date', 'date')} /></td>
//                                             <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.amount || ''} onChange={createTableInputHandler(setFundTransactions, index, 'amount', 'number')} /></td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Section 5: Budget Breakup of the Received Amount Table */}
//                         <div className="overflow-x-auto">
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-2xl font-bold text-black">Budget Breakup of Received Amount</h2>
//                                 <NeoButton onClick={() => addRow(setReceivedAmountBreakup, {})}>Add Row</NeoButton>
//                             </div>
//                             <table className="w-full border-collapse border-2 border-black">
//                                 <thead className="bg-gray-100"><tr><th className="border-2 border-black p-2 text-left">No.</th><th className="border-2 border-black p-2 text-left">Account Head</th><th className="border-2 border-black p-2 text-left">Amount Received (₹)</th><th className="border-2 border-black p-2 text-left">Budget Year</th><th className="border-2 border-black p-2 text-left">Remarks</th></tr></thead>
//                                 <tbody>
//                                     {receivedAmountBreakup.map((row, index) => (
//                                         <tr key={row.id}>
//                                             <td className="border-2 border-black p-2">{index + 1}</td>
//                                             <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.account_head || ''} onChange={createTableInputHandler(setReceivedAmountBreakup, index, 'account_head')} /></td>
//                                             <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.amount_received || ''} onChange={createTableInputHandler(setReceivedAmountBreakup, index, 'amount_received', 'number')} /></td>
//                                             <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.budget_year || ''} onChange={createTableInputHandler(setReceivedAmountBreakup, index, 'budget_year')} /></td>
//                                             <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.remarks || ''} onChange={createTableInputHandler(setReceivedAmountBreakup, index, 'remarks')} /></td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </NeoCard>

//                     <div className="mt-8 flex justify-end">
//                         <NeoButton type="submit" disabled={isSubmitting} className="bg-[#A5D6A7] w-full md:w-auto">
//                             {isSubmitting ? 'SUBMITTING...' : 'Submit Fund Sanction'}
//                         </NeoButton>
//                     </div>
//                 </form>
//             </main>
//         </div>
//     );
// };

// export default AddFundSanction;





// -=-=-=-=-=-=-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-=-=


// import React, { useState, useEffect, useCallback } from 'react';
// import { AppSidebar } from "../components/RndSidebar";
// import useUserRoleCheck from "../components/UserRoleCheck";
// import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
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
// }

// interface FundSanctionFormResponse {
//     message: {
//         fields: Field[];
//         link_options: {
//             [key: string]: LinkOption[];
//         };
//     }
// }

// interface SanctionedBudgetBreakupRow {
//     id: string;
//     account_head?: string;
//     year1?: number;
//     year2?: number;
//     year3?: number;
//     year4?: number;
//     year5?: number;
// }

// interface SanctionRelatedFileRow {
//     id: string;
//     file?: File | null;
//     description?: string;
// }

// interface FundTransactionRow {
//     id: string;
//     transaction_number?: string;
//     date?: string;
//     amount?: number;
// }

// interface ReceivedAmountBreakupRow {
//     id: string;
//     account_head?: string;
//     amount_received?: number;
//     budget_year?: string;
//     remarks?: string;
// }

// // --- REUSABLE SUB-COMPONENTS ---
// const LinkField: React.FC<{ field: Field; className: string; options: LinkOption[] }> = ({ field, className, options = [] }) => {
//     return (
//         <select
//             id={field.fieldname}
//             name={field.fieldname}
//             className={className}
//             required={field.mandatory}
//             disabled={field.read_only}
//             defaultValue={field.default || ''}
//         >
//             <option value="">Select {field.label}</option>
//             {options.map(option => (
//                 <option key={option.value} value={option.value}>
//                     {option.label}
//                 </option>
//             ))}
//         </select>
//     );
// };

// // --- MAIN COMPONENT ---
// const AddFundSanction: React.FC = () => {
//     // --- STATE MANAGEMENT ---
//     const [fields, setFields] = useState<Field[]>([]);
//     const [linkOptions, setLinkOptions] = useState<{ [key: string]: LinkOption[] }>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const isPermanentEmployee = useUserRoleCheck();

//     const [sanctionedBudgetBreakup, setSanctionedBudgetBreakup] = useState<SanctionedBudgetBreakupRow[]>([]);
//     const [sanctionRelatedFiles, setSanctionRelatedFiles] = useState<SanctionRelatedFileRow[]>([]);
//     const [fundTransactions, setFundTransactions] = useState<FundTransactionRow[]>([]);
//     const [receivedAmountBreakup, setReceivedAmountBreakup] = useState<ReceivedAmountBreakupRow[]>([]);

//     // --- API HOOKS ---
//     const stableArgs = React.useMemo(() => ({}), []);

//     const { data: formData, error: formError } = useFrappeGetCall<FundSanctionFormResponse>(
//         'rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_fund_sanction_form_data',
//         stableArgs,
//         undefined,
//         { revalidateOnFocus: false, revalidateIfStale: false }
//     );

//     useEffect(() => {
//         if (formData?.message) {
//             setFields(formData.message.fields || []);
//             setLinkOptions(formData.message.link_options || {});
//             setLoading(false);
//         }
//     }, [formData]);

//     useEffect(() => {
//         if (formError) {
//             console.error('Error loading form data:', formError);
//             setLoading(false);
//         }
//     }, [formError]);

//     const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.save_fund_sanction_data');

//     useEffect(() => {
//         if (submitResult) {
//             alert('Fund Sanction submitted successfully!');
//             // Reset form or redirect here if needed
//         }
//         if (submitError) {
//             alert(`Submission error: ${submitError.message}`);
//         }
//         setIsSubmitting(false);
//     }, [submitResult, submitError]);

//     // --- EVENT HANDLERS & HELPERS ---
//     const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

//     const addRow = useCallback(<T extends { id: string }>(
//         setter: React.Dispatch<React.SetStateAction<T[]>>,
//         defaultRow: Omit<T, 'id'>
//     ) => {
//         setter((prev) => [...prev, { ...defaultRow, id: generateId() } as T]);
//     }, []);

//     const createTableInputHandler = useCallback(<T extends Record<string, any>>(
//         setter: React.Dispatch<React.SetStateAction<T[]>>,
//         index: number,
//         field: keyof T,
//         type: 'text' | 'number' | 'date' | 'file' = 'text'
//     ) => {
//         return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//             let value: any;
            
//             if (type === 'file') {
//                 value = (e.target as HTMLInputElement).files?.[0] || null;
//             } else {
//                 value = e.target.value;
//                 if (type === 'number') {
//                     value = value === '' ? undefined : Number(value);
//                 }
//             }

//             setter(prev => {
//                 const newRows = [...prev];
//                 newRows[index] = { ...newRows[index], [field]: value };
//                 return newRows;
//             });
//         };
//     }, []);

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (isSubmitting) return;
//         setIsSubmitting(true);

//         try {
//             const formElement = e.target as HTMLFormElement;
//             const formData = new FormData(formElement);

//             // Add table data as JSON strings
//             formData.append('sanctioned_budget_breakup', JSON.stringify(sanctionedBudgetBreakup.map(({ id, ...rest }) => rest)));
//             formData.append('fund_transactions', JSON.stringify(fundTransactions.map(({ id, ...rest }) => rest)));
//             formData.append('received_amount_breakup', JSON.stringify(receivedAmountBreakup.map(({ id, ...rest }) => rest)));

//             // Handle files
//             const fileData = sanctionRelatedFiles.map(({ id, ...rest }) => rest);
//             formData.append('sanction_related_files_meta', JSON.stringify(fileData.map(f => ({ description: f.description }))));

//             fileData.forEach((row, index) => {
//                 if (row.file) {
//                     formData.append(`file_${index}`, row.file);
//                 }
//             });

//             // Convert FormData to object for API
//             const formObject: { [key: string]: any } = {};
//             formData.forEach((value, key) => {
//                 formObject[key] = value;
//             });

//             await submitForm({ form_data: formObject });
//         } catch (error) {
//             console.error('Submission error:', error);
//             setIsSubmitting(false);
//         }
//     };

//     // --- DYNAMIC FIELD RENDERER ---
//     const renderFormField = (field: Field) => {
//         if (field.hidden) return null;
//         const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200";

//         switch (field.fieldtype) {
//             case 'Link':
//                 return <LinkField field={field} className={inputClasses} options={linkOptions[field.fieldname] || []} />;
//             case 'Date':
//                 return <input type="date" id={field.fieldname} name={field.fieldname} className={inputClasses} required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''} />;
//             case 'Currency':
//             case 'Float':
//             case 'Int':
//                 return <input type="number" id={field.fieldname} name={field.fieldname} className={inputClasses} required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''} step={field.fieldtype === 'Int' ? '1' : '0.01'} />;
//             case 'Select':
//                 return (
//                     <select id={field.fieldname} name={field.fieldname} className={inputClasses} required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''}>
//                         <option value="">Select {field.label}</option>
//                         {field.options?.split('\n').filter(opt => opt.trim() !== '').map(option => (
//                             <option key={option} value={option}>{option}</option>
//                         ))}
//                     </select>
//                 );
//             case 'Text Editor':
//             case 'Text':
//                 return <textarea id={field.fieldname} name={field.fieldname} className="w-full min-h-[100px] px-4 py-3 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE]" required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''} />;
//             default:
//                 return <input type="text" id={field.fieldname} name={field.fieldname} className={inputClasses} required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''} />;
//         }
//     };

//     const mainFormFields = fields.filter(field => field.fieldtype !== 'Table');

//     // --- REUSABLE UI COMPONENTS ---
//     const NeoCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
//         <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>
//             {children}
//         </div>
//     );

//     const NeoButton: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }> = ({ children, onClick, disabled, className, type = "button" }) => (
//         <button 
//             type={type} 
//             onClick={onClick} 
//             disabled={disabled} 
//             className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50", className)}
//         >
//             {children}
//         </button>
//     );

//     const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE]";

//     // --- RENDER SECTION ---
//     if (loading) {
//         return (
//             <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
//                 <div className="text-center">
//                     <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE]"></div>
//                     <p className="mt-4 text-2xl font-bold">LOADING FORM...</p>
//                 </div>
//             </div>
//         );
//     }

//     if (formError) {
//         return (
//             <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC] p-4">
//                 <div className="text-center p-4 max-w-2xl">
//                     <p className="text-2xl font-bold text-red-600">Error Loading Form</p>
//                     <p className="mt-2 text-gray-700">Could not fetch form metadata from the server.</p>
//                     <pre className="mt-4 text-left bg-gray-100 p-4 rounded-md overflow-x-auto shadow-inner">
//                         {JSON.stringify(formError, null, 2)}
//                     </pre>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="bg-[#FDFCEC]">
//             <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
//             <main className="flex-1 p-4 md:p-8 w-full overflow-hidden bg-[#FDFCEC]">
//                 <header className="mb-8">
//                     <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight uppercase">
//                         Add Fund Sanction
//                     </h1>
//                 </header>

//                 <form onSubmit={handleSubmit} encType="multipart/form-data">
//                     <NeoCard className="space-y-12">
//                         {/* Section 1: Main Form Fields */}
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                             {mainFormFields.map(field => (
//                                 <div key={field.fieldname} className={field.fieldtype.includes('Text') ? 'md:col-span-2' : ''}>
//                                     <label htmlFor={field.fieldname} className="block font-bold text-black text-lg mb-2">
//                                         {field.label} {field.mandatory && <span className="text-red-500">*</span>}
//                                     </label>
//                                     {field.description && <p className="text-sm text-gray-700 font-mono mt-1 mb-2">{field.description}</p>}
//                                     {renderFormField(field)}
//                                 </div>
//                             ))}
//                         </div>

//                         {/* Section 2: Total Budget Break-up Table */}
//                         <div className="overflow-x-auto">
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-2xl font-bold text-black">Total Budget Break-up</h2>
//                                 <NeoButton onClick={() => addRow(setSanctionedBudgetBreakup, {})}>Add Row</NeoButton>
//                             </div>
//                             <table className="w-full min-w-[900px] border-collapse border-2 border-black">
//                                 <thead className="bg-gray-100">
//                                     <tr>
//                                         {['No.', 'Account Head', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Total'].map(h => <th key={h} className="border-2 border-black p-2 text-left">{h}</th>)}
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {sanctionedBudgetBreakup.length === 0 ? (
//                                         <tr><td colSpan={8} className="text-center p-4">No budget data added.</td></tr>
//                                     ) : (
//                                         sanctionedBudgetBreakup.map((row, index) => {
//                                             const total = (row.year1 || 0) + (row.year2 || 0) + (row.year3 || 0) + (row.year4 || 0) + (row.year5 || 0);
//                                             return (
//                                                 <tr key={row.id}>
//                                                     <td className="border-2 border-black p-2">{index + 1}</td>
//                                                     <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.account_head || ''} onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'account_head')} /></td>
//                                                     <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year1 || ''} onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year1', 'number')} /></td>
//                                                     <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year2 || ''} onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year2', 'number')} /></td>
//                                                     <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year3 || ''} onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year3', 'number')} /></td>
//                                                     <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year4 || ''} onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year4', 'number')} /></td>
//                                                     <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year5 || ''} onChange={createTableInputHandler(setSanctionedBudgetBreakup, index, 'year5', 'number')} /></td>
//                                                     <td className="border-2 border-black p-2 bg-gray-100 font-bold">₹ {total.toLocaleString('en-IN')}</td>
//                                                 </tr>
//                                             );
//                                         })
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Section 3: Upload Sanction Related Files Table */}
//                         <div className="overflow-x-auto">
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-2xl font-bold text-black">Upload Sanction Related Files</h2>
//                                 <NeoButton onClick={() => addRow(setSanctionRelatedFiles, {})}>Add Row</NeoButton>
//                             </div>
//                             <table className="w-full border-collapse border-2 border-black">
//                                 <thead className="bg-gray-100">
//                                     <tr>
//                                         <th className="border-2 border-black p-2 text-left">No.</th>
//                                         <th className="border-2 border-black p-2 text-left">File</th>
//                                         <th className="border-2 border-black p-2 text-left">Description</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {sanctionRelatedFiles.map((row, index) => (
//                                         <tr key={row.id}>
//                                             <td className="border-2 border-black p-2">{index + 1}</td>
//                                             <td className="border-2 border-black p-2"><input type="file" className={inputClasses} onChange={createTableInputHandler(setSanctionRelatedFiles, index, 'file', 'file')} /></td>
//                                             <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.description || ''} onChange={createTableInputHandler(setSanctionRelatedFiles, index, 'description')} /></td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Section 4: Sanction Transactions Details Table */}
//                         <div className="overflow-x-auto">
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-2xl font-bold text-black">Sanction Transactions Details</h2>
//                                 <NeoButton onClick={() => addRow(setFundTransactions, {})}>Add Row</NeoButton>
//                             </div>
//                             <table className="w-full border-collapse border-2 border-black">
//                                 <thead className="bg-gray-100">
//                                     <tr>
//                                         <th className="border-2 border-black p-2 text-left">No.</th>
//                                         <th className="border-2 border-black p-2 text-left">Transaction Number (UTR No)</th>
//                                         <th className="border-2 border-black p-2 text-left">Date</th>
//                                         <th className="border-2 border-black p-2 text-left">Amount (₹)</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {fundTransactions.map((row, index) => (
//                                         <tr key={row.id}>
//                                             <td className="border-2 border-black p-2">{index + 1}</td>
//                                             <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.transaction_number || ''} onChange={createTableInputHandler(setFundTransactions, index, 'transaction_number')} /></td>
//                                             <td className="border-2 border-black p-2"><input type="date" className={inputClasses} value={row.date || ''} onChange={createTableInputHandler(setFundTransactions, index, 'date', 'date')} /></td>
//                                             <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.amount || ''} onChange={createTableInputHandler(setFundTransactions, index, 'amount', 'number')} /></td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* Section 5: Budget Breakup of the Received Amount Table */}
//                         <div className="overflow-x-auto">
//                             <div className="flex justify-between items-center mb-4">
//                                 <h2 className="text-2xl font-bold text-black">Budget Breakup of Received Amount</h2>
//                                 <NeoButton onClick={() => addRow(setReceivedAmountBreakup, {})}>Add Row</NeoButton>
//                             </div>
//                             <table className="w-full border-collapse border-2 border-black">
//                                 <thead className="bg-gray-100">
//                                     <tr>
//                                         <th className="border-2 border-black p-2 text-left">No.</th>
//                                         <th className="border-2 border-black p-2 text-left">Account Head</th>
//                                         <th className="border-2 border-black p-2 text-left">Amount Received (₹)</th>
//                                         <th className="border-2 border-black p-2 text-left">Budget Year</th>
//                                         <th className="border-2 border-black p-2 text-left">Remarks</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {receivedAmountBreakup.map((row, index) => (
//                                         <tr key={row.id}>
//                                             <td className="border-2 border-black p-2">{index + 1}</td>
//                                             <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.account_head || ''} onChange={createTableInputHandler(setReceivedAmountBreakup, index, 'account_head')} /></td>
//                                             <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.amount_received || ''} onChange={createTableInputHandler(setReceivedAmountBreakup, index, 'amount_received', 'number')} /></td>
//                                             <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.budget_year || ''} onChange={createTableInputHandler(setReceivedAmountBreakup, index, 'budget_year')} /></td>
//                                             <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.remarks || ''} onChange={createTableInputHandler(setReceivedAmountBreakup, index, 'remarks')} /></td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </NeoCard>

//                     <div className="mt-8 flex justify-end">
//                         <NeoButton type="submit" disabled={isSubmitting} className="bg-[#A5D6A7] w-full md:w-auto">
//                             {isSubmitting ? 'SUBMITTING...' : 'Submit Fund Sanction'}
//                         </NeoButton>
//                     </div>
//                 </form>
//             </main>
//         </div>
//     );
// };

// export default AddFundSanction;



// -=-=-=-=-=-=-=-=-= claude

import React, { useState, useEffect, useRef } from 'react';
import { AppSidebar } from "../components/RndSidebar";
import useUserRoleCheck from "../components/UserRoleCheck";
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';

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
}

interface FundSanctionFormResponse {
    message: {
        fields: Field[];
        link_options: { [key: string]: LinkOption[] };
    }
}

const AddFundSanction: React.FC = () => {
    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<{ [key: string]: LinkOption[] }>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isPermanentEmployee = useUserRoleCheck();
    const stableArgs = React.useMemo(() => ({}), []);

    // Use refs to store table rows - this doesn't trigger re-render
    const tableRowsRef = useRef({
        sanctioned_budget_breakup: [] as string[],
        sanction_related_files: [] as string[],
        fund_transactions: [] as string[],
        received_amount_breakup: [] as string[]
    });

    const containerRef = useRef<{ [key: string]: HTMLElement | null }>({});
    const forceUpdateRef = useRef(0);
    const [, setForceUpdate] = useState(0);

    const { data: formData, error: formError } = useFrappeGetCall<FundSanctionFormResponse>(
        'rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_fund_sanction_form_data',
        stableArgs,
        undefined,
        { revalidateOnFocus: false, revalidateIfStale: false }
    );

    useEffect(() => {
        if (formData?.message) {
            setFields(formData.message.fields || []);
            setLinkOptions(formData.message.link_options || {});
            setLoading(false);
        }
    }, [formData]);

    useEffect(() => {
        if (formError) {
            console.error('Error loading form data:', formError);
            setLoading(false);
        }
    }, [formError]);

    const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.save_fund_sanction_data');

    useEffect(() => {
        if (submitResult) {
            alert('Fund Sanction submitted successfully!');
            setIsSubmitting(false);
        }
        if (submitError) {
            alert(`Submission error: ${submitError.message}`);
            setIsSubmitting(false);
        }
    }, [submitResult, submitError]);

    const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const addTableRow = (tableName: keyof typeof tableRowsRef.current) => {
    tableRowsRef.current[tableName].push(generateId());
    renderTableRows(tableName);
};
const removeTableRow = (tableName: keyof typeof tableRowsRef.current, id: string) => {
    tableRowsRef.current[tableName] = tableRowsRef.current[tableName].filter(rowId => rowId !== id);
    const row = containerRef.current[tableName]?.querySelector(`[data-id="${id}"]`)?.closest('tr');
    if (row) row.remove();

    // Reindex remaining rows (optional)
    const allRows = containerRef.current[tableName]?.querySelectorAll('tr');
    allRows?.forEach((tr, i) => {
        const firstCell = tr.querySelector('td');
        if (firstCell) firstCell.textContent = String(i + 1);
    });
};
const renderTableRows = (tableName: keyof typeof tableRowsRef.current) => {
    const container = containerRef.current[tableName];
    if (!container) return;

    // Clear "no data" placeholder row if present
    const placeholder = container.querySelector('.no-data-row');
    if (placeholder) placeholder.remove();

    const rows = tableRowsRef.current[tableName];
    const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE]";

    // Get the last added rowId (only render that)
    const rowId = rows[rows.length - 1];
    if (!rowId) return;

    let newRow = document.createElement("tr");
    const index = rows.length;

    if (tableName === 'sanctioned_budget_breakup') {
        newRow.innerHTML = `
            <td class="border-2 border-black p-2">${index}</td>
            <td class="border-2 border-black p-2"><input type="text" name="sanctioned_account_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="sanctioned_year1_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="sanctioned_year2_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="sanctioned_year3_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="sanctioned_year4_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="sanctioned_year5_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2 bg-gray-100 font-bold">₹ 0</td>
            <td class="border-2 border-black p-2">
                <button type="button" class="text-red-600 font-bold delete-btn" data-table="${tableName}" data-id="${rowId}">X</button>
            </td>
        `;
    } else if (tableName === 'sanction_related_files') {
        newRow.innerHTML = `
            <td class="border-2 border-black p-2">${index}</td>
            <td class="border-2 border-black p-2"><input type="file" name="file_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="text" name="file_desc_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2">
                <button type="button" class="text-red-600 font-bold delete-btn" data-table="${tableName}" data-id="${rowId}">X</button>
            </td>
        `;
    } else if (tableName === 'fund_transactions') {
        newRow.innerHTML = `
            <td class="border-2 border-black p-2">${index}</td>
            <td class="border-2 border-black p-2"><input type="text" name="fund_trans_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="date" name="fund_date_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="fund_amount_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2">
                <button type="button" class="text-red-600 font-bold delete-btn" data-table="${tableName}" data-id="${rowId}">X</button>
            </td>
        `;
    } else if (tableName === 'received_amount_breakup') {
        newRow.innerHTML = `
            <td class="border-2 border-black p-2">${index}</td>
            <td class="border-2 border-black p-2"><input type="text" name="received_account_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="received_amount_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="text" name="received_year_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="text" name="received_remarks_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2">
                <button type="button" class="text-red-600 font-bold delete-btn" data-table="${tableName}" data-id="${rowId}">X</button>
            </td>
        `;
    }

    // Append only the new row
    container.appendChild(newRow);

    // Attach delete button
    const delBtn = newRow.querySelector('.delete-btn');
    if (delBtn) {
        delBtn.addEventListener('click', () => {
            removeTableRow(tableName, rowId);
        });
    }
};


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const formElement = e.currentTarget;
            const formData = new FormData(formElement);

            // Get table data
            const sanctionedBudgetData = tableRowsRef.current.sanctioned_budget_breakup.map(rowId => {
                const year1 = (formData.get(`sanctioned_year1_${rowId}`) as string) || '';
                const year2 = (formData.get(`sanctioned_year2_${rowId}`) as string) || '';
                const year3 = (formData.get(`sanctioned_year3_${rowId}`) as string) || '';
                const year4 = (formData.get(`sanctioned_year4_${rowId}`) as string) || '';
                const year5 = (formData.get(`sanctioned_year5_${rowId}`) as string) || '';
                return {
                    account_head: formData.get(`sanctioned_account_${rowId}`),
                    year1: year1 ? Number(year1) : undefined,
                    year2: year2 ? Number(year2) : undefined,
                    year3: year3 ? Number(year3) : undefined,
                    year4: year4 ? Number(year4) : undefined,
                    year5: year5 ? Number(year5) : undefined,
                };
            });

            const fundTransactionData = tableRowsRef.current.fund_transactions.map(rowId => ({
                transaction_number: formData.get(`fund_trans_${rowId}`),
                date: formData.get(`fund_date_${rowId}`),
                amount: formData.get(`fund_amount_${rowId}`) ? Number(formData.get(`fund_amount_${rowId}`)) : undefined,
            }));

            const receivedAmountData = tableRowsRef.current.received_amount_breakup.map(rowId => ({
                account_head: formData.get(`received_account_${rowId}`),
                amount_received: formData.get(`received_amount_${rowId}`) ? Number(formData.get(`received_amount_${rowId}`)) : undefined,
                budget_year: formData.get(`received_year_${rowId}`),
                remarks: formData.get(`received_remarks_${rowId}`),
            }));

            const fileMetadata: { description: string }[] = [];
            const filesData: { [key: string]: any } = {};
            tableRowsRef.current.sanction_related_files.forEach((rowId, index) => {
                const file = (formData.get(`file_${rowId}`) as File) || null;
                const desc = formData.get(`file_desc_${rowId}`);
                if (file) {
                    filesData[`file_${index}`] = file;
                }
                fileMetadata.push({ description: desc as string });
            });

            const submitData: { [key: string]: any } = {};
            
            fields.forEach(field => {
                if (field.fieldtype !== 'Table') {
                    submitData[field.fieldname] = formData.get(field.fieldname);
                }
            });

            submitData.sanctioned_budget_breakup = JSON.stringify(sanctionedBudgetData);
            submitData.fund_transactions = JSON.stringify(fundTransactionData);
            submitData.received_amount_breakup = JSON.stringify(receivedAmountData);
            submitData.sanction_related_files_meta = JSON.stringify(fileMetadata);

            const finalFormData = new FormData();
            Object.entries(submitData).forEach(([key, value]) => {
                finalFormData.append(key, String(value));
            });
            Object.entries(filesData).forEach(([key, file]) => {
                finalFormData.append(key, file);
            });

const submitObject: { [key: string]: any } = {};
finalFormData.forEach((value, key) => {
    submitObject[key] = value;
});

// ✅ Log before submitting
console.group("🚀 Fund Sanction Form Data Preview");
console.log("Submit Object:", submitObject);
console.log("Table Data:", {
    sanctionedBudgetData,
    fundTransactionData,
    receivedAmountData,
    fileMetadata,
});
console.groupEnd();
            await submitForm({ form_data: submitObject });
        } catch (error) {
            console.error('Submission error:', error);
            setIsSubmitting(false);
        }
    };

    const renderFormField = (field: Field) => {
        if (field.hidden) return null;
        const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200";

        switch (field.fieldtype) {
            case 'Link':
                return (
                    <select
                        name={field.fieldname}
                        className={inputClasses}
                        required={field.mandatory}
                        disabled={field.read_only}
                        defaultValue={field.default || ''}
                    >
                        <option value="">Select {field.label}</option>
                        {(linkOptions[field.fieldname] || []).map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );
            case 'Date':
                return <input type="date" name={field.fieldname} className={inputClasses} required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''} />;
            case 'Currency':
            case 'Float':
            case 'Int':
                return <input type="number" name={field.fieldname} className={inputClasses} required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''} step={field.fieldtype === 'Int' ? '1' : '0.01'} />;
            case 'Select':
                return (
                    <select name={field.fieldname} className={inputClasses} required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''}>
                        <option value="">Select {field.label}</option>
                        {field.options?.split('\n').filter(opt => opt.trim() !== '').map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                );
            case 'Text Editor':
            case 'Text':
                return <textarea name={field.fieldname} className="w-full min-h-[100px] px-4 py-3 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE]" required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''} />;
            default:
                return <input type="text" name={field.fieldname} className={inputClasses} required={field.mandatory} disabled={field.read_only} defaultValue={field.default || ''} />;
        }
    };

    const mainFormFields = fields.filter(field => field.fieldtype !== 'Table');
    const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE]";

    const NeoButton = ({ children, onClick, disabled, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit" }) => (
        <button 
            type={type}
            onClick={onClick}
            disabled={disabled}
            className="px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50"
        >
            {children}
        </button>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE]"></div>
                    <p className="mt-4 text-2xl font-bold">LOADING FORM...</p>
                </div>
            </div>
        );
    }

    if (formError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC] p-4">
                <div className="text-center p-4 max-w-2xl">
                    <p className="text-2xl font-bold text-red-600">Error Loading Form</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FDFCEC]">
            <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden bg-[#FDFCEC]">
                <header className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight uppercase">
                        Add Fund Sanction
                    </h1>
                </header>

                <form onSubmit={handleSubmit} encType="multipart/form-data">
                    <div className="bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                        <div className="space-y-12">
                            {/* Main Form Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {mainFormFields.map(field => (
                                    <div key={field.fieldname} className={field.fieldtype.includes('Text') ? 'md:col-span-2' : ''}>
                                        <label className="block font-bold text-black text-lg mb-2">
                                            {field.label} {field.mandatory && <span className="text-red-500">*</span>}
                                        </label>
                                        {field.description && <p className="text-sm text-gray-700 font-mono mt-1 mb-2">{field.description}</p>}
                                        {renderFormField(field)}
                                    </div>
                                ))}
                            </div>

                            {/* Total Budget Break-up Table */}
                            <div className="overflow-x-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-black">Total Budget Break-up</h2>
                                    <NeoButton onClick={() => addTableRow('sanctioned_budget_breakup')}>Add Row</NeoButton>
                                </div>
                                <table className="w-full min-w-[900px] border-collapse border-2 border-black">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            {['No.', 'Account Head', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Total', 'Delete'].map(h => <th key={h} className="border-2 border-black p-2 text-left">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody ref={el => { if (el) containerRef.current['sanctioned_budget_breakup'] = el; }}>
                                        {tableRowsRef.current.sanctioned_budget_breakup.length === 0 && <tr><td colSpan={9} className="text-center p-4"></td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            {/* Upload Sanction Related Files */}
                            <div className="overflow-x-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-black">Upload Sanction Related Files</h2>
                                    <NeoButton onClick={() => addTableRow('sanction_related_files')}>Add Row</NeoButton>
                                </div>
                                <table className="w-full border-collapse border-2 border-black">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border-2 border-black p-2 text-left">No.</th>
                                            <th className="border-2 border-black p-2 text-left">File</th>
                                            <th className="border-2 border-black p-2 text-left">Description</th>
                                            <th className="border-2 border-black p-2 text-left">Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody ref={el => { if (el) containerRef.current['sanction_related_files'] = el; }}>
                                        {tableRowsRef.current.sanction_related_files.length === 0 && <tr><td colSpan={4} className="text-center p-4"></td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            {/* Sanction Transactions Details */}
                            <div className="overflow-x-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-black">Sanction Transactions Details</h2>
                                    <NeoButton onClick={() => addTableRow('fund_transactions')}>Add Row</NeoButton>
                                </div>
                                <table className="w-full border-collapse border-2 border-black">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border-2 border-black p-2 text-left">No.</th>
                                            <th className="border-2 border-black p-2 text-left">Transaction Number</th>
                                            <th className="border-2 border-black p-2 text-left">Date</th>
                                            <th className="border-2 border-black p-2 text-left">Amount (₹)</th>
                                            <th className="border-2 border-black p-2 text-left">Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody ref={el => { if (el) containerRef.current['fund_transactions'] = el; }}>
                                        {tableRowsRef.current.fund_transactions.length === 0 && <tr><td colSpan={5} className="text-center p-4"></td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            {/* Budget Breakup of Received Amount */}
                            <div className="overflow-x-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-black">Budget Breakup of Received Amount</h2>
                                    <NeoButton onClick={() => addTableRow('received_amount_breakup')}>Add Row</NeoButton>
                                </div>
                                <table className="w-full border-collapse border-2 border-black">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border-2 border-black p-2 text-left">No.</th>
                                            <th className="border-2 border-black p-2 text-left">Account Head</th>
                                            <th className="border-2 border-black p-2 text-left">Amount Received (₹)</th>
                                            <th className="border-2 border-black p-2 text-left">Budget Year</th>
                                            <th className="border-2 border-black p-2 text-left">Remarks</th>
                                            <th className="border-2 border-black p-2 text-left">Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody ref={el => { if (el) containerRef.current['received_amount_breakup'] = el; }}>
                                        {tableRowsRef.current.received_amount_breakup.length === 0 && <tr><td colSpan={6} className="text-center p-4">.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <NeoButton type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'SUBMITTING...' : 'Submit Fund Sanction'}
                        </NeoButton>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default AddFundSanction;