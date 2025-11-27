import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string; label: string | null; fieldtype: string; default?: any;
    mandatory: boolean; read_only: boolean; hidden: boolean;
    description?: string | null; options?: string | null;
    child_fields?: Field[]; // Added for Table fields
}
interface LinkOption { value: string; label: string; }
interface FormData { [key: string]: any; }

// --- STYLES & REUSABLE UI COMPONENTS ---
const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
const checkboxClasses = "size-6 shrink-0 appearance-none bg-white border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.25)] checked:bg-black checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat";
const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (<div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div>);
const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => (<button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button>);
const NeoSection = ({ title, children }: { title: string, children: React.ReactNode }) => (<div className="space-y-4"><h2 className="text-2xl font-extrabold text-black uppercase tracking-tight border-b-2 border-black pb-2">{title}</h2>{children}</div>);

// --- MEMOIZED FORM FIELD COMPONENT ---
const MemoizedFormField = memo(({ field, value, options, onChange, onFileChange }: { field: Field; value: any; options?: LinkOption[]; onChange: (fieldname: string, value: any, type?: string) => void; onFileChange: (fieldname: string, file: File | null) => void; }) => {
    if (!field || field.hidden || !field.label) return null;
    const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only, value: value || '', onChange: (e: any) => onChange(field.fieldname, e.target.value) };

    const renderInput = () => {
        switch (field.fieldtype) {
            case "Link": return (<select {...commonProps}><option value="">Select...</option>{(options || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
            case "Select": return (<select {...commonProps}><option value="">Select...</option>{(field.options?.split('\n').filter(o => o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
            case "Small Text": return <textarea {...commonProps} rows={4} className={`${inputClasses} h-auto py-3`} />;
            case "Check": return (<label className="flex items-center gap-4 font-semibold text-black text-lg cursor-pointer bg-stone-100 p-3 border-2 border-black rounded-md"><input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => onChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only} /><span>{field.label}</span></label>);
            case "Attach": return <input type="file" {...commonProps} className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-bold file:bg-[#A5D6A7] file:text-black hover:file:bg-[#8BC34A]`} onChange={e => onFileChange(field.fieldname, e.target.files?.[0] || null)} />;
            default: return <input type="text" {...commonProps} />;
        }
    };

    if (field.fieldtype === 'Check') return renderInput();
    return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">{field.label}{!!field.mandatory && <span className="text-red-500">*</span>}</label>{renderInput()}{field.description && <p className="text-sm text-gray-500">{field.description}</p>}</div>);
});

// --- ITEMS TABLE COMPONENT ---
// --- GENERIC TABLE COMPONENT ---
const MemoizedGenericTable = memo(({ tableName, columns, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => {
    const getColKey = (col: any) => col.fieldname || col.key;
    const getColType = (col: any) => col.fieldtype || col.type;

    const newRow = columns.reduce((acc: any, col: any) => ({ ...acc, [getColKey(col)]: getColType(col) === 'number' ? 0 : '' }), {});

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto border-2 border-black rounded-md">
                <table className="min-w-full divide-y-2 divide-black">
                    <thead className="bg-[#90A4AE]">
                        <tr className="divide-x-2 divide-black">
                            {columns.map((col: any) => (
                                <th key={getColKey(col)} className="p-3 font-bold text-white uppercase text-sm whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                            <th className="p-3 font-bold text-white uppercase text-sm"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black bg-white">
                        {(tableData || []).map((row: any, rowIndex: number) => (
                            <tr key={row.id || rowIndex} className="divide-x-2 divide-black">
                                {columns.map((col: any) => {
                                    const key = getColKey(col);
                                    const type = getColType(col);
                                    return (
                                        <td key={key} className="p-2 min-w-[150px]">
                                            {type === 'Attach' ? (
                                                <input
                                                    type="file"
                                                    className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-bold file:bg-[#A5D6A7] file:text-black hover:file:bg-[#8BC34A]`}
                                                    onChange={(e) => onFileChange(tableName, rowIndex, key, e.target.files?.[0] || null)}
                                                />
                                            ) : (
                                                <input
                                                    type={type === 'number' || type === 'Currency' || type === 'Float' || type === 'Int' ? 'number' : type === 'Date' ? 'date' : 'text'}
                                                    className={`${inputClasses} !h-11`}
                                                    value={row[key] || ''}
                                                    onChange={(e) => onRowChange(tableName, rowIndex, key, e.target.value)}
                                                />
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="p-2 text-center w-[100px]">
                                    <NeoButton onClick={() => onDeleteRow(tableName, rowIndex)} className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">
                                        Delete
                                    </NeoButton>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <NeoButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#A5D6A7]">
                Add Row
            </NeoButton>
        </div>
    );
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
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.get_reimbursement_fields');
    const { call: saveForm, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.save_reimbursement_data');
    const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.submit_reimbursement');
    const { call: fetchPiDetails } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi');

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

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [fieldname]: file }));
    }, []);

    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any, type?: string) => {
        handleChange(fieldname, value, type);
        if (fieldname === 'reimbursement_for_id' && value) {
            try {
                const result = await fetchPiDetails({ user_email: value });
                if (result?.message) {
                    const details = result.message;
                    setFormData(prev => ({
                        ...prev,
                        reimbursement_for_id: value,
                        reimbursement_for_designation: details.designation || "",
                        reimbursement_for_department: details.applicant_department || ""
                    }));
                }
            } catch (err) { console.error("Failed to fetch PI details:", err); }
        } else if (fieldname === 'reimbursement_for_id' && !value) {
            setFormData(prev => ({ ...prev, reimbursement_for_id: "", reimbursement_for_designation: "", reimbursement_for_department: "" }));
        }

        if (fieldname === 'applicant_webmail' && value) {
            try {
                const result = await fetchPiDetails({ user_email: value });
                if (result?.message) {
                    const details = result.message;
                    setFormData(prev => ({
                        ...prev,
                        applicant_webmail: value,
                        applicant_designation: details.designation || "",
                        applicant_department: details.applicant_department || ""
                    }));
                }
            } catch (err) { console.error("Failed to fetch Applicant details:", err); }
        } else if (fieldname === 'applicant_webmail' && !value) {
            setFormData(prev => ({ ...prev, applicant_webmail: "", applicant_designation: "", applicant_department: "" }));
        }
    }, [handleChange, fetchPiDetails]);

    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const t = [...(prev[tableName] || [])];
            t[rowIndex] = { ...t[rowIndex], [fieldname]: value };
            return { ...prev, [tableName]: t };
        });
    }, []);

    const handleTableFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
        setFormData(prev => {
            const t = [...(prev[tableName] || [])];
            t[rowIndex] = { ...t[rowIndex], [fieldname]: file };
            return { ...prev, [tableName]: t };
        });
    }, []);

    const addTableRow = useCallback((tableName: string, newRow: object) => {
        const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        setFormData(prev => ({ ...prev, [tableName]: [...(prev[tableName] || []), { ...newRow, id: newId }] }));
    }, []);

    const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
        setFormData(prev => ({ ...prev, [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex) }));
    }, []);

    const fileToBase64 = (file: File): Promise<{ file_name: string; file_data: string }> => new Promise((res, rej) => {
        const r = new FileReader();
        r.readAsDataURL(file);
        r.onload = () => res({ file_name: file.name, file_data: r.result as string });
        r.onerror = e => rej(e);
    });

    const prepareDataForApi = async () => {
        const data = JSON.parse(JSON.stringify(formData));
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

    const handleSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const data = await prepareDataForApi();
            const res = await saveForm({ data: JSON.stringify(data) });
            if (res?.message?.status === 'success') {
                alert("Draft saved successfully!");
                // Optionally update docname if returned and needed for future updates
            } else {
                throw new Error(res?.message?.message || "Save failed");
            }
        } catch (err: any) {
            console.error(saveError || err);
            alert(`Save failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            // 1. Save first
            const data = await prepareDataForApi();
            const saveRes = await saveForm({ data: JSON.stringify(data) });

            if (saveRes?.message?.status !== 'success') {
                throw new Error(saveRes?.message?.message || "Save failed during submission");
            }

            const docname = saveRes.message.docname;

            // 2. Submit
            const submitRes = await submitForm({ docname });
            if (submitRes?.message?.status === 'success') {
                alert("Reimbursement application submitted successfully!");
                navigate(-1);
            } else {
                throw new Error(submitRes?.message?.message || "Submission failed");
            }
        } catch (err: any) {
            console.error(submitError || err);
            alert(`Submission failed: ${err.message || "Please check the console for details."}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER LOGIC ---
    if (loading) return (<div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE] mx-auto"></div><p className="mt-4 text-2xl font-bold text-black">LOADING FORM...</p></div></div>);

    // Group fields by sections
    const sections: { title: string; fields: Field[] }[] = [];
    let currentSection: { title: string; fields: Field[] } | null = null;
    let htmlContent: Field | null = null;

    for (const field of fields) {
        if (field.fieldtype === 'Section Break') {
            if (currentSection) sections.push(currentSection);
            currentSection = { title: field.label || '', fields: [] };
        } else if (field.fieldtype === 'HTML') {
            htmlContent = field;
        } else if (field.fieldtype === 'Column Break') {
            // Ignore for now or handle layout if needed
        } else if (currentSection && !field.hidden) {
            currentSection.fields.push(field);
        } else if (field.fieldtype === 'Table' && currentSection) {
            // Treat Table as a field within the current section for now, or handle separately if needed
            currentSection.fields.push(field);
        }
    }
    if (currentSection) sections.push(currentSection);

    return (
        <div className="bg-[#FDFCEC] min-h-screen">
            <AppSidebar />
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
                        {htmlContent && htmlContent.options && (
                            <div className="prose prose-sm max-w-none text-gray-800 font-mono p-4 bg-amber-100 border-2 border-black rounded-md"
                                dangerouslySetInnerHTML={{ __html: htmlContent.options }}
                            />
                        )}

                        {sections.map((section, idx) => (
                            <NeoSection key={idx} title={section.title}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {section.fields.map(field => {
                                        if (field.fieldtype === 'Table') {
                                            return (
                                                <div key={field.fieldname} className="col-span-full">
                                                    <h3 className="text-xl font-bold text-black uppercase pt-4 mb-2">{field.label}</h3>
                                                    <MemoizedGenericTable
                                                        tableName={field.fieldname}
                                                        columns={field.child_fields || []}
                                                        tableData={formData[field.fieldname]}
                                                        onRowChange={handleTableRowChange}
                                                        onFileChange={handleTableFileChange}
                                                        onAddRow={addTableRow}
                                                        onDeleteRow={deleteTableRow}
                                                    />
                                                </div>
                                            );
                                        }
                                        return (
                                            <MemoizedFormField
                                                key={field.fieldname}
                                                field={field}
                                                value={formData[field.fieldname]}
                                                options={linkOptions[field.options as string] || linkOptions[field.fieldname]}
                                                onChange={handleFieldChangeWithSideEffects}
                                                onFileChange={handleFileChange}
                                            />
                                        );
                                    })}
                                </div>
                            </NeoSection>
                        ))}
                    </NeoCard>

                    <div className="mt-8 flex justify-end gap-4">
                        <NeoButton onClick={handleSave} disabled={isSubmitting} className="bg-white hover:bg-gray-100">
                            {isSubmitting ? 'Saving...' : 'Save Draft'}
                        </NeoButton>
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