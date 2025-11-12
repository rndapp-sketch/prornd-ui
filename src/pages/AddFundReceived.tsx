import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../components/RndSidebar";
import { useFrappePostCall, useFrappeGetDoc } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from "lucide-react";
import useUserRoleCheck from "../components/UserRoleCheck";

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string;
    label: string | null;
    fieldtype: string;
    mandatory: boolean;
    read_only: boolean;
    hidden: boolean;
    options?: string | null;
    default?: any;
}
interface LinkOption { value: string; label: string; }
interface FormDataResponse {
    message: {
        fields: Field[];
        link_options: { [key: string]: LinkOption[] };
        prefill_data: { [key: string]: any };
        related_project_data: { [key: string]: any };
    }
}

const AddFundReceived: React.FC = () => {
    const navigate = useNavigate();
    const { projectName } = useParams<{ projectName: string }>();
    const isPermanentEmployee = useUserRoleCheck();

    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const tableRowsRef = useRef<{
        fund_transactions: string[];
        received_amt_breakup: string[];
    }>({ fund_transactions: [], received_amt_breakup: [] });

    const containerRef = useRef<{ [key: string]: HTMLElement | null }>({});

    const { call: fetchFormData, result, error } = useFrappePostCall<FormDataResponse>('rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_fields');
    const { call: submitForm, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_received.fund_received.save_fund_received');
    const { data: projectData } = useFrappeGetDoc("Project Registration", projectName ?? "", { enabled: !!projectName });

    useEffect(() => {
        if (projectName) {
            fetchFormData({ doc_name: projectName });
        }
    }, [fetchFormData, projectName]);

    // --- MODIFIED: Handle fetch response with robust pre-filling logic ---
    useEffect(() => {
        if (result?.message) {
            const { fields: apiFields, link_options, prefill_data, related_project_data } = result.message;

            if (Array.isArray(apiFields)) {
                // 1. Create a consolidated object with all data meant for pre-filling.
                // This makes the process more reliable.
                const finalPrefillData: { [key: string]: any } = {
                    ...(prefill_data || {}),
                    prjreg_title: related_project_data?.name,
                    prj_type: related_project_data?.project_type,
                };

                // 2. Map over the fields from the API and assign the `default` property
                // if a matching key exists in our consolidated pre-fill data.
                const processedFields = apiFields.map(field => {
                    if (finalPrefillData[field.fieldname] !== undefined) {
                        return { ...field, default: finalPrefillData[field.fieldname] };
                    }
                    return field;
                });

                setFields(processedFields);
            } else {
                 console.error("API did not return a valid 'fields' array.");
            }

            setLinkOptions(prev => ({ ...prev, ...(link_options || {}) }));
            setLoading(false);
        }
        if (error) {
            console.error("Failed to load form data:", error);
            alert("Failed to load form data.");
            setLoading(false);
        }
    }, [result, error]);

    useEffect(() => {
        const gstSelect = document.getElementById('gst_invoice_issued') as HTMLSelectElement;
        const invoiceContainer = document.getElementById('invoice_no_container');
        
        const handleChange = () => {
            if (invoiceContainer) {
                invoiceContainer.style.display = gstSelect?.value === 'Yes' ? 'grid' : 'none';
            }
        };

        if (gstSelect) {
            gstSelect.addEventListener('change', handleChange);
            handleChange();
        }

        return () => {
            gstSelect?.removeEventListener('change', handleChange);
        };
    }, [loading]);

    const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const addTableRow = useCallback((tableName: keyof typeof tableRowsRef.current) => {
        const newId = generateId();
        tableRowsRef.current[tableName].push(newId);
        renderTableRows(tableName, newId);
    }, []);

    const removeTableRow = useCallback((tableName: keyof typeof tableRowsRef.current, id: string) => {
        tableRowsRef.current[tableName] = tableRowsRef.current[tableName].filter(rowId => rowId !== id);
        const row = containerRef.current[tableName]?.querySelector(`[data-id="${id}"]`);
        if (row) row.remove();
    }, []);

    const renderTableRows = (tableName: keyof typeof tableRowsRef.current, rowId: string) => {
        const container = containerRef.current[tableName];
        if (!container) return;

        const inputClasses = "w-full h-11 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE]";
        const neoButtonClasses = "px-5 py-2 !bg-red-200 hover:!bg-red-300 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]";
        
        const newRow = document.createElement("tr");
        newRow.setAttribute("data-id", rowId);
        newRow.className = "divide-x-2 divide-black";
        
        if (tableName === 'fund_transactions') {
            newRow.innerHTML = `
                <td class="p-2"><input type="text" name="transaction_number_${rowId}" class="${inputClasses}" /></td>
                <td class="p-2"><input type="date" name="transaction_date_${rowId}" class="${inputClasses}" /></td>
                <td class="p-2"><input type="number" step="0.01" name="amount_${rowId}" class="${inputClasses}" /></td>
                <td class="p-2"><input type="file" name="attachment_${rowId}" class="${inputClasses} file:mr-2" /></td>
                <td class="p-2 text-center"><button type="button" class="${neoButtonClasses} delete-btn" data-table="${tableName}" data-id="${rowId}">Delete</button></td>
            `;
        } else if (tableName === 'received_amt_breakup') {
            const options = ['Consumables', 'Equipment', 'Contingency', 'Travel', 'Manpower', 'Overhead', 'Other']
                .map(opt => `<option value="${opt}">${opt}</option>`).join('');
            newRow.innerHTML = `
                <td class="p-2">
                    <select name="account_head_${rowId}" class="${inputClasses}">
                        <option value="">Select...</option>
                        ${options}
                    </select>
                </td>
                <td class="p-2"><input type="number" step="0.01" name="amount_received_${rowId}" class="${inputClasses}" /></td>
                <td class="p-2"><input type="number" name="budget_year_funds_receive_${rowId}" class="${inputClasses}" defaultValue="1" /></td>
                <td class="p-2"><input type="text" name="remarks_${rowId}" class="${inputClasses}" /></td>
                <td class="p-2 text-center"><button type="button" class="${neoButtonClasses} delete-btn" data-table="${tableName}" data-id="${rowId}">Delete</button></td>
            `;
        }

        container.appendChild(newRow);
        
        const delBtn = newRow.querySelector('.delete-btn');
        delBtn?.addEventListener('click', () => removeTableRow(tableName, rowId));
    };

    const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const formElement = e.currentTarget;
            const form = new FormData(formElement);
            const dataToSubmit: { [key: string]: any } = {};

            fields.forEach(field => {
                if (field.fieldtype !== 'Table' && !field.hidden) {
                    dataToSubmit[field.fieldname] = form.get(field.fieldname);
                }
            });

            dataToSubmit.fund_transactions = await Promise.all(
                tableRowsRef.current.fund_transactions.map(async (id) => {
                    const attachment = form.get(`attachment_${id}`) as File | null;
                    let fileData = {};
                    if (attachment && attachment.size > 0) {
                        const base64 = await toBase64(attachment);
                        fileData = { file_name: attachment.name, file_data: base64 };
                    }
                    return {
                        transaction_number: form.get(`transaction_number_${id}`),
                        transaction_date: form.get(`transaction_date_${id}`),
                        amount: form.get(`amount_${id}`),
                        ...fileData,
                    };
                })
            );
            
            dataToSubmit.received_amt_breakup = tableRowsRef.current.received_amt_breakup.map(id => ({
                account_head: form.get(`account_head_${id}`),
                amount_received: form.get(`amount_received_${id}`),
                budget_year_funds_receive: form.get(`budget_year_funds_receive_${id}`),
                remarks: form.get(`remarks_${id}`),
            }));

            await submitForm({ doc_data: JSON.stringify(dataToSubmit) });
            alert("Fund Received entry saved successfully!");
            navigate(-1);
        } catch (err: any) {
            console.error(submitError || err);
            alert(`Submission Failed: ${err.message || 'Unknown Error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
    const NeoCard = ({ children, className }: any) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );
    const NeoButton = ({ children, onClick, disabled, className, type = "button" }: any) => ( <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button> );
    const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-2xl font-extrabold text-black uppercase tracking-tight border-b-2 border-black pb-3">{title}</h2>{children}</div>);

    const renderFormField = (field: Field) => {
        if (!field || field.hidden) return null;
        
        const commonProps = {
            id: field.fieldname,
            name: field.fieldname,
            className: inputClasses,
            readOnly: field.read_only,
            required: field.mandatory,
            disabled: field.read_only,
            defaultValue: field.default || ''
        };

        const renderInput = () => {
            switch (field.fieldtype) {
                case "Link":
                case "Select":
                    const opts = field.fieldtype === 'Link' 
                        ? linkOptions[field.fieldname] 
                        : (field.options?.split('\n').filter(o => o).map(o => ({ value: o, label: o })) || []);
                    return (
                        <select {...commonProps}>
                            <option value="">Select...</option>
                            {(opts || []).map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                        </select>
                    );
                case "Currency":
                    return <input type="number" step="0.01" {...commonProps} />;
                default:
                    return <input type="text" {...commonProps} />;
            }
        };
        return (
            <div key={field.fieldname} className='space-y-2'>
                <label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">
                    {field.label}{field.mandatory && <span className="text-red-500">*</span>}
                </label>
                {renderInput()}
            </div>
        );
    };

    if (loading) {
        return (<div className="flex items-center justify-center min-h-screen">...Loading...</div>);
    }
    
    const invoiceNoField = fields.find(f => f.fieldname === 'invoice_no');
    
    return (
        <div className="bg-[#FDFCEC]">
            <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
            <main className="flex-1 p-4 md:p-8">
                 <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform"><ArrowLeftIcon className="h-6 w-6" /></button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-black">Record Received Fund</h1>
                            <p className="text-gray-700 font-mono mt-1">For Project: <strong>{projectName}</strong></p>
                        </div>
                    </div>
                 </header>
                 <form onSubmit={handleSubmit}>
                    <NeoCard className="space-y-12">
                        <NeoSection title="Reference Details">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {fields.filter(f => !f.hidden && ['prjreg_title', 'sanction_ref_no', 'prj_type'].includes(f.fieldname)).map(renderFormField)}
                            </div>
                        </NeoSection>
                        <NeoSection title="Received Amount & Invoice">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {fields.filter(f => !f.hidden && ['fund_received_amt', 'bank_account', 'gst_invoice_issued'].includes(f.fieldname)).map(renderFormField)}
                                <div id="invoice_no_container" style={{ display: 'none' }}>
                                    {invoiceNoField && renderFormField(invoiceNoField)}
                                </div>
                            </div>
                        </NeoSection>
                        
                        <NeoSection title="Transaction Installments">
                            <div className="overflow-x-auto border-2 border-black rounded-md">
                                <table className="min-w-full divide-y-2 divide-black">
                                    <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{['Transaction Number', 'Date', 'Amount (₹)', 'File', ''].map((h) => (<th key={h} className="p-3 font-bold text-white uppercase text-sm">{h}</th>))}</tr></thead>
                                    <tbody ref={el => { if(el) containerRef.current['fund_transactions'] = el; }} className="divide-y-2 divide-black bg-white" />
                                </table>
                            </div>
                            <NeoButton onClick={() => addTableRow('fund_transactions')} className="bg-[#A5D6A7] mt-4">Add Row</NeoButton>
                        </NeoSection>

                         <NeoSection title="Breakup of this Received Amount">
                            <div className="overflow-x-auto border-2 border-black rounded-md">
                                <table className="min-w-full divide-y-2 divide-black">
                                    <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{['Account Head', 'Amount (₹)', 'Budget Year', 'Remarks', ''].map((h) => (<th key={h} className="p-3 font-bold text-white uppercase text-sm">{h}</th>))}</tr></thead>
                                    <tbody ref={el => { if(el) containerRef.current['received_amt_breakup'] = el; }} className="divide-y-2 divide-black bg-white" />
                                </table>
                            </div>
                            <NeoButton onClick={() => addTableRow('received_amt_breakup')} className="bg-[#A5D6A7] mt-4">Add Row</NeoButton>
                        </NeoSection>
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
