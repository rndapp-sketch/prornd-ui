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
const inputClasses = "w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.18)] focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100 read-only:bg-gray-50";
const checkboxClasses = "size-5 shrink-0 appearance-none bg-white border border-gray-300 rounded checked:bg-[#0EA5A4] checked:border-[#0EA5A4] checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat cursor-pointer";
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (<div className={cn("bg-white p-6 md:p-8 border border-gray-200 rounded-xl shadow-sm", className)}>{children}</div>);
const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => (<button type={type} onClick={onClick} disabled={disabled} className={cn("inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.18)] disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button>);
const NeoSection = ({ title, children }: { title: string, children: React.ReactNode }) => (<div className="space-y-4"><h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">{title}</h2>{children}</div>);

// --- MEMOIZED FORM FIELD COMPONENT ---
const MemoizedFormField = memo(({ field, value, options, onChange, onFileChange }: { field: Field; value: any; options?: LinkOption[]; onChange: (fieldname: string, value: any, type?: string) => void; onFileChange: (fieldname: string, file: File | null) => void; }) => {
    if (!field || field.hidden || !field.label) return null;
    const commonProps = { id: field.fieldname, name: field.fieldname, className: inputClasses, readOnly: field.read_only, required: field.mandatory, disabled: field.read_only, value: value || '', onChange: (e: any) => onChange(field.fieldname, e.target.value) };

    const renderInput = () => {
        switch (field.fieldtype) {
            case "Link": return (<select {...commonProps}><option value="">Select...</option>{(options || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>);
            case "Select": return (<select {...commonProps}><option value="">Select...</option>{(field.options?.split('\n').filter(o => o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>);
            case "Small Text": return <textarea {...commonProps} rows={4} className={`${inputClasses} h-auto py-3`} />;
            case "Check": return (<label className="flex items-center gap-3 font-medium text-gray-700 cursor-pointer bg-gray-50 p-3 border border-gray-200 rounded-xl"><input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => onChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only} /><span>{field.label}</span></label>);
            case "Attach": return <input type="file" {...commonProps} className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-medium file:bg-[#E0F7F6] file:text-[#0EA5A4] hover:file:bg-[#0EA5A4] hover:file:text-white file:transition-colors`} onChange={e => onFileChange(field.fieldname, e.target.files?.[0] || null)} />;
            default: return <input type="text" {...commonProps} />;
        }
    };

    if (field.fieldtype === 'Check') return renderInput();
    return (<div className='space-y-2'><label htmlFor={field.fieldname} className="block font-medium text-gray-700">{field.label}{!!field.mandatory && <span className="text-red-500 ml-1">*</span>}</label>{renderInput()}{field.description && <p className="text-sm text-gray-500">{field.description}</p>}</div>);
});

// --- ITEMS TABLE COMPONENT ---
// --- GENERIC TABLE COMPONENT ---
const MemoizedGenericTable = memo(({ tableName, columns, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => {
    const getColKey = (col: any) => col.fieldname || col.key;
    const getColType = (col: any) => col.fieldtype || col.type;

    const newRow = columns.reduce((acc: any, col: any) => ({ ...acc, [getColKey(col)]: getColType(col) === 'number' ? 0 : '' }), {});

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr className="divide-x divide-gray-100">
                            {columns.map((col: any) => (
                                <th key={getColKey(col)} className="p-3 font-medium text-gray-600 text-sm whitespace-nowrap text-left">
                                    {col.label}
                                </th>
                            ))}
                            <th className="p-3 font-medium text-gray-600 text-sm"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {(tableData || []).map((row: any, rowIndex: number) => (
                            <tr key={row.id || rowIndex} className="divide-x divide-gray-100 hover:bg-gray-50/50">
                                {columns.map((col: any) => {
                                    const key = getColKey(col);
                                    const type = getColType(col);
                                    return (
                                        <td key={key} className="p-2 min-w-[150px]">
                                            {type === 'Attach' ? (
                                                <input
                                                    type="file"
                                                    className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-medium file:bg-[#E0F7F6] file:text-[#0EA5A4] hover:file:bg-[#0EA5A4] hover:file:text-white file:transition-colors`}
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
                                    <FrappeButton onClick={() => onDeleteRow(tableName, rowIndex)} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
                                        Delete
                                    </FrappeButton>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <FrappeButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#0EA5A4] text-white hover:bg-[#0D9494]">
                Add Row
            </FrappeButton>
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
    if (loading) return (<div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE] mx-auto"></div><p className="mt-4 text-2xl font-bold text-black">LOADING FORM...</p></div></div>);

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
        <div className="bg-[#F0F4F8] min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-8 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
                            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Reimbursement Application</h1>
                            <p className="text-gray-500 mt-1">Fill out the details below to apply for reimbursement.</p>
                        </div>
                    </div>
                </header>

                <form onSubmit={handleSubmit}>
                    <FrappeCard className="space-y-12">
                        {htmlContent && htmlContent.options && (
                            <div className="prose prose-sm max-w-none text-gray-700 p-4 bg-amber-50 border border-amber-200 rounded-xl"
                                dangerouslySetInnerHTML={{ __html: htmlContent.options }}
                            />
                        )}

                        {sections.map((section, idx) => (
                            <NeoSection key={idx} title={section.title}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {section.fields.map(field => {
                                        if (field.fieldtype === 'Table') {
                                            return (
                                                <div key={field.fieldname} className="col-span-full">
                                                    <h3 className="text-lg font-semibold text-gray-900 pt-4 mb-3">{field.label}</h3>
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
                    </FrappeCard>

                    <div className="mt-8 flex justify-end gap-4">
                        <FrappeButton onClick={handleSave} disabled={isSubmitting} className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">
                            {isSubmitting ? 'Saving...' : 'Save Draft'}
                        </FrappeButton>
                        <FrappeButton type="submit" disabled={isSubmitting} className="bg-[#0EA5A4] text-white hover:bg-[#0D9494]">
                            {isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </FrappeButton>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default Reimbursement;