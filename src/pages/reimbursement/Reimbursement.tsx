import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from 'lucide-react';

// --- TYPE DEFINITIONS (Reused from ProjectRegistration) ---
interface Field {
    fieldname: string; label: string | null; fieldtype: string; default?: any;
    mandatory: boolean; read_only: boolean; hidden: boolean;
    description?: string | null; options?: string | null;
}
interface LinkOption { value: string; label: string; }
interface FormData { [key: string]: any; }

// --- STYLES & REUSABLE UI COMPONENTS (Reused from ProjectRegistration) ---
const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
const checkboxClasses = "size-6 shrink-0 appearance-none bg-white border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.25)] checked:bg-black checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat";
const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );
const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => ( <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button> );
const NeoSection = ({ title, children }: { title: string, children: React.ReactNode }) => (<div className="space-y-4"><h2 className="text-2xl font-extrabold text-black uppercase tracking-tight border-b-2 border-black pb-2">{title}</h2>{children}</div>);

// --- MEMOIZED FORM FIELD COMPONENT ---
const MemoizedFormField = memo(({ field, value, options, onChange }: { field: Field; value: any; options?: LinkOption[]; onChange: (fieldname: string, value: any, type?: string) => void; }) => {
    // This is a simplified version of the ProjectRegistration form field renderer
    if (!field || field.hidden || !field.label) return null;
    const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only, value: value || '', onChange: (e: any) => onChange(field.fieldname, e.target.value) };
    
    const renderInput = () => {
        switch (field.fieldtype) {
            case "Select": return (<select {...commonProps}><option value="">Select...</option>{(field.options?.split('\n').filter(o=>o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
            case "Small Text": return <textarea {...commonProps} rows={4} className={`${inputClasses} h-auto py-3`} />;
            case "Check": return (<label className="flex items-center gap-4 font-semibold text-black text-lg cursor-pointer bg-stone-100 p-3 border-2 border-black rounded-md"><input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => onChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only}/><span>{field.label}</span></label>);
            default: return <input type="text" {...commonProps} />;
        }
    };

    if (field.fieldtype === 'Check') return renderInput();
    return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}</div>);
});

// --- MAIN REIMBURSEMENT COMPONENT ---
const Reimbursement: React.FC = () => {
    const navigate = useNavigate();
    const [fields, setFields] = useState<Field[]>([]);
    const [formData, setFormData] = useState<FormData>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- API HOOKS ---
    // **IMPORTANT**: Replace `your_app` with your actual Frappe app name
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.api.get_reimbursement_form_fields');
    const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.api.submit_reimbursement'); // Create a submit endpoint too

    // --- DATA FETCHING ---
    useEffect(() => {
        fetchFormData({});
    }, [fetchFormData]);

    useEffect(() => {
        if (formDataResult?.message) {
            const { fields: apiFields, prefill_data, link_options } = formDataResult.message;
            setFields(apiFields || []);
            setLinkOptions(link_options || {});
            const initialData = { ...prefill_data };
            (apiFields || []).forEach((field: Field) => {
                if (initialData[field.fieldname] === undefined) {
                    initialData[field.fieldname] = field.default ?? '';
                }
            });
            setFormData(initialData);
            setLoading(false);
        }
        if (formDataError) {
            console.error("Failed to load form data:", formDataError);
            alert("Error: Could not load the reimbursement form.");
            setLoading(false);
        }
    }, [formDataResult, formDataError]);
    
    // --- EVENT HANDLERS ---
    const handleChange = useCallback((fieldname: string, value: any, type?: string) => {
        setFormData(prev => ({ ...prev, [fieldname]: type === 'checkbox' ? (value ? 1 : 0) : value }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Add a submit endpoint in your backend API
            await submitForm({ doc: formData });
            alert("Reimbursement application submitted successfully!");
            navigate(-1);
        } catch (err) {
            console.error(submitError || err);
            alert("Submission failed. Please check the console for details.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // --- RENDER LOGIC ---
    if (loading) return (<div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE] mx-auto"></div><p className="mt-4 text-2xl font-bold text-black">LOADING FORM...</p></div></div>);
    
    const rulesContent = fields.find(f => f.fieldname === 'rules_content');
    const applyingForFields = ['reimbursement_user', 'for_department', 'pi_designation'];
    const applicantFields = ['applicat_webmail', 'applicant_department', 'applicant_designation'];
    const bankFields = ['bank_name', 'account_holder_name', 'data_brvb', 'ifsc_code'];
    const projectFields = ['project_number', 'project_name', 'account_head', 'comment'];
    const declarationFields = ['dec1', 'dec2', 'dec3', 'dec4'];

    const renderFields = (fieldnames: string[]) => fields.filter(f => fieldnames.includes(f.fieldname)).map(field => (
        <MemoizedFormField
            key={field.fieldname}
            field={field}
            value={formData[field.fieldname]}
            options={linkOptions[field.options as string] || linkOptions[field.fieldname]}
            onChange={handleChange}
        />
    ));

    return (
        <div className="bg-[#FDFCEC] min-h-screen">
            <AppSidebar isPermanentEmployee={true} />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform">
                            <ArrowLeftIcon className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-black">Reimbursement Application</h1>
                            <p className="text-gray-700 font-mono mt-1">Fill out the details below to apply for reimbursement.</p>
                        </div>
                    </div>
                </header>
                
                <form onSubmit={handleSubmit}>
                    <NeoCard className="space-y-12">
                        {rulesContent?.options && (
                            <div className="prose prose-sm max-w-none text-gray-800 font-mono p-4 bg-amber-100 border-2 border-black rounded-md"
                                 dangerouslySetInnerHTML={{ __html: rulesContent.options }}
                            />
                        )}

                        <NeoSection title="Applying For">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{renderFields(applyingForFields)}</div>
                        </NeoSection>
                        
                        <NeoSection title="Applicant Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{renderFields(applicantFields)}</div>
                        </NeoSection>

                        <NeoSection title="Bank Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{renderFields(bankFields)}</div>
                        </NeoSection>
                        
                        <NeoSection title="Project and Item Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{renderFields(projectFields)}</div>
                            <p className="font-mono mt-8">Item details table will be implemented here.</p>
                        </NeoSection>
                        
                        <NeoSection title="Declarations">
                            <div className="space-y-4">{renderFields(declarationFields)}</div>
                        </NeoSection>
                    </NeoCard>

                    <div className="mt-8 flex justify-end">
                        <NeoButton type="submit" disabled={isSubmitting} className="bg-[#A5D6A7] hover:bg-[#81C784]">
                            {isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </NeoButton>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default Reimbursement;





// import React, { useState, useEffect, useCallback, memo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { AppSidebar } from '@/components/RndSidebar';
// import { useFrappePostCall } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils';
// import { ArrowLeftIcon } from 'lucide-react';

// // --- TYPE DEFINITIONS ---
// interface Field {
//     fieldname: string; label: string | null; fieldtype: string; default?: any;
//     mandatory: boolean; read_only: boolean; hidden: boolean;
//     description?: string | null; options?: string | null;
// }
// interface LinkOption { value: string; label: string; }
// interface FormData { 
//     [key: string]: any;
//     table_bosk?: (any & { id?: string })[]; // For the particulars table
// }

// // --- STYLES & REUSABLE UI COMPONENTS ---
// const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
// const checkboxClasses = "size-6 shrink-0 appearance-none bg-white border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.25)] checked:bg-black checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat";
// const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );
// const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => ( <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button> );
// const NeoSection = ({ title, children }: { title: string, children: React.ReactNode }) => (<div className="space-y-6"><h2 className="text-2xl font-extrabold text-black uppercase tracking-tight border-b-2 border-black pb-3">{title}</h2>{children}</div>);

// // --- MEMOIZED CHILD COMPONENTS ---
// const MemoizedFormField = memo(({ field, value, options, onChange }: { field: Field; value: any; options?: LinkOption[]; onChange: (fieldname: string, value: any, type?: string) => void; }) => {
//     if (!field || field.hidden || !field.label) return null;
//     const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only, };
    
//     const renderInput = () => {
//         switch (field.fieldtype) {
//             case "Link": return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(options || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
//             case "Select": return (<select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}><option value="">Select...</option>{(field.options?.split('\n').filter(o=>o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
//             case "Small Text": return <textarea {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} rows={4} className={`${inputClasses} h-auto py-3`} />;
//             case "Check": return (<label className="flex items-center gap-4 font-semibold text-black text-lg cursor-pointer bg-stone-100 p-3 border-2 border-black rounded-md"><input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => onChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only}/><span>{field.label}</span></label>);
//             default: return <input type="text" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
//         }
//     };

//     if (field.fieldtype === 'Check') return renderInput();
//     return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">{field.label}{field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}</div>);
// });

// const MemoizedItemsTable = memo(({ tableData, onRowChange, onAddRow, onDeleteRow }: any) => {
//     const newRow = { item_name: '', quantity: 1, rate: 0 };
//     const columns = [
//         { key: 'item_name', label: 'Item Description', type: 'text' },
//         { key: 'quantity', label: 'Quantity', type: 'number' },
//         { key: 'rate', label: 'Rate (₹)', type: 'number' },
//         { key: 'amount', label: 'Amount (₹)', type: 'number' },
//     ];
//     return (
//         <div>
//             <div className="overflow-x-auto border-2 border-black rounded-md">
//                 <table className="min-w-full divide-y-2 divide-black">
//                     <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{[...columns, {key:'actions', label:''}].map((c:any) => (<th key={c.key} className="p-3 font-bold text-white uppercase text-sm">{c.label}</th>))}</tr></thead>
//                     <tbody className="divide-y-2 divide-black bg-white">
//                         {(tableData || []).map((row: any, i: number) => {
//                             const amount = (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0);
//                             return (
//                                 <tr key={row.id} className="divide-x-2 divide-black">
//                                     {columns.map((col:any) => (
//                                         <td key={col.key} className="p-2">
//                                             <input
//                                                 type={col.type}
//                                                 className={`${inputClasses} !h-11`}
//                                                 readOnly={col.key === 'amount'} // Make amount field read-only
//                                                 value={col.key === 'amount' ? amount.toFixed(2) : (row[col.key] || '')}
//                                                 onChange={e => onRowChange('table_bosk', i, col.key, e.target.value)}
//                                             />
//                                         </td>
//                                     ))}
//                                     <td className="p-2 text-center"><NeoButton onClick={() => onDeleteRow('table_bosk', i)} className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</NeoButton></td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </table>
//             </div>
//             <NeoButton onClick={() => onAddRow('table_bosk', newRow)} className="bg-[#A5D6A7] mt-4">Add Item</NeoButton>
//         </div>
//     );
// });


// // --- MAIN REIMBURSEMENT COMPONENT ---
// const Reimbursement: React.FC = () => {
//     const navigate = useNavigate();
//     const [fields, setFields] = useState<Field[]>([]);
//     const [formData, setFormData] = useState<FormData>({});
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     // --- API HOOKS ---
//     const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('your_app.api.get_reimbursement_form_fields');
//     const { call: submitForm, error: submitError } = useFrappePostCall('your_app.api.submit_reimbursement');

//     // --- DATA FETCHING & INITIALIZATION ---
//     useEffect(() => { fetchFormData({}); }, [fetchFormData]);
//     useEffect(() => {
//         if (formDataResult?.message) {
//             const { fields: apiFields, prefill_data, link_options } = formDataResult.message;
//             setFields(apiFields || []);
//             setLinkOptions(link_options || {});
//             const initialData = { ...prefill_data };
//             (apiFields || []).forEach((field: Field) => {
//                 if (initialData[field.fieldname] === undefined) initialData[field.fieldname] = field.default ?? '';
//             });
//             setFormData(initialData);
//             setLoading(false);
//         }
//         if (formDataError) {
//             console.error("Failed to load form data:", formDataError);
//             alert("Error: Could not load the reimbursement form.");
//             setLoading(false);
//         }
//     }, [formDataResult, formDataError]);
    
//     // --- EVENT HANDLERS ---
//     const handleChange = useCallback((fieldname: string, value: any, type?: string) => {
//         setFormData(prev => {
//             const newState = { ...prev, [fieldname]: type === 'checkbox' ? (value ? 1 : 0) : value };
//             // Conditional logic for 'other_head'
//             if (fieldname === 'account_head' && value !== 'Other') {
//                 newState['other_head'] = ''; // Clear other_head if not 'Other'
//             }
//             return newState;
//         });
//     }, []);

//     const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => { setFormData(prev => { const t = [...(prev[tableName] || [])]; t[rowIndex] = { ...t[rowIndex], [fieldname]: value }; return { ...prev, [tableName]: t }; }); }, []);
//     const addTableRow = useCallback((tableName: string, newRow: object) => { const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9); setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName] || []), { ...newRow, id: newId }] })); }, []);
//     const deleteTableRow = useCallback((tableName: string, rowIndex: number) => { setFormData(prev => ({ ...prev, [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex) })); }, []);

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setIsSubmitting(true);
//         // Prepare table data by calculating amount and removing client-side id
//         const finalFormData = { ...formData };
//         if (finalFormData.table_bosk) {
//             finalFormData.table_bosk = finalFormData.table_bosk.map(({ id, ...row }) => ({
//                 ...row,
//                 amount: (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0)
//             }));
//         }
//         try {
//             await submitForm({ doc: JSON.stringify(finalFormData) }); // Send as JSON string
//             alert("Reimbursement application submitted successfully!");
//             navigate(-1);
//         } catch (err) {
//             console.error(submitError || err);
//             alert(`Submission failed: ${submitError?.message || 'Unknown error'}`);
//         } finally {
//             setIsSubmitting(false);
//         }
//     };
    
//     // --- RENDER LOGIC ---
//     if (loading) return (<div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE] mx-auto"></div><p className="mt-4 text-2xl font-bold text-black">LOADING FORM...</p></div></div>);
    
//     const rulesContent = fields.find(f => f.fieldname === 'rules_content');
//     const declarationFields = ['dec1', 'dec2', 'dec3', 'dec4'];

//     const renderFields = (fieldnames: string[]) => fields.filter(f => fieldnames.includes(f.fieldname)).map(field => (
//         <MemoizedFormField key={field.fieldname} field={field} value={formData[field.fieldname]} options={linkOptions[field.options as string] || linkOptions[field.fieldname]} onChange={handleChange} />
//     ));

//     return (
//         <div className="bg-[#FDFCEC] min-h-screen">
//             <AppSidebar isPermanentEmployee={true} />
//             <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//                 <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//                     <div className="flex items-center gap-4">
//                         <button onClick={() => navigate(-1)} className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform"><ArrowLeftIcon className="h-6 w-6" /></button>
//                         <div>
//                             <h1 className="text-3xl font-extrabold text-black">Reimbursement Application</h1>
//                             <p className="text-gray-700 font-mono mt-1">Fill out the details below to apply for reimbursement.</p>
//                         </div>
//                     </div>
//                 </header>
                
//                 <form onSubmit={handleSubmit}>
//                     <NeoCard className="space-y-12">
//                         {rulesContent?.options && (<div className="prose prose-sm max-w-none text-gray-800 font-mono p-4 bg-amber-100 border-2 border-black rounded-md" dangerouslySetInnerHTML={{ __html: rulesContent.options }} />)}

//                         <NeoSection title="Applying For"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{renderFields(['reimbursement_user', 'for_department', 'pi_designation'])}</div></NeoSection>
//                         <NeoSection title="Applicant Details"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{renderFields(['applicat_webmail', 'applicant_department', 'applicant_designation'])}</div></NeoSection>
//                         <NeoSection title="Bank Details"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{renderFields(['bank_name', 'account_holder_name', 'data_brvb', 'ifsc_code'])}</div></NeoSection>
                        
//                         <NeoSection title="Project and Item Details">
//                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//                                 {renderFields(['project_number', 'project_name', 'account_head'])}
//                                 {formData.account_head === 'Other' && renderFields(['other_head'])}
//                                 <div className="md:col-span-2 lg:col-span-3">{renderFields(['comment'])}</div>
//                             </div>
//                             <h3 className="text-xl font-bold text-black uppercase pt-4">Particulars of Items</h3>
//                             <MemoizedItemsTable tableData={formData.table_bosk} onRowChange={handleTableRowChange} onAddRow={addTableRow} onDeleteRow={deleteTableRow} />
//                         </NeoSection>
                        
//                         <NeoSection title="Declarations"><div className="space-y-4">{renderFields(declarationFields)}</div></NeoSection>
//                     </NeoCard>

//                     <div className="mt-8 flex justify-end">
//                         <NeoButton type="submit" disabled={isSubmitting} className="bg-[#A5D6A7] hover:bg-[#81C784]">
//                             {isSubmitting ? 'Submitting...' : 'Submit Application'}
//                         </NeoButton>
//                     </div>
//                 </form>
//             </main>
//         </div>
//     );
// };

// export default Reimbursement;