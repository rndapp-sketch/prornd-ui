import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall, useFrappeGetDoc } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { Save, Send } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { prepareFormDataForApi } from '@/services/apiService';
import { GlobalLoader } from '@/components/ui/global-loader';
import { useFrappeClientScript } from '@/hooks/useFrappeClientScript';

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        child_table_fields?: Record<string, any[]>;
        client_scripts?: { script: string }[];
    };
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-zinc-900 p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: "button" | "submit";
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#D97757]/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
        )}
    >
        {children}
    </button>
);

// --- MAIN DISBURSAL OF HONORARIUM FORM COMPONENT ---
const DisbursalOfHonorariumForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const [searchParams] = useSearchParams();
    const projectFromUrl = searchParams.get('project');

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [clientScript, setClientScript] = useState<string>("");

    // Initialize client script engine
    useFrappeClientScript(clientScript, formData, setFormData);

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(
        'rndopsapp.rndopsapp.doctype.disbursal_of_honorarium.disbursal_of_honorarium.get_disbursal_of_honorarium_fields'
    );
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchAccountHeads } = useFrappePostCall<{ message: any[] }>('frappe.client.get_list');
    const { call: saveForm, error: saveError } = useFrappePostCall(
        'rndopsapp.rndopsapp.doctype.disbursal_of_honorarium.disbursal_of_honorarium.save_disbursal_of_honorarium_data'
    );
    const { call: submitForm, error: submitError } = useFrappePostCall(
        'rndopsapp.rndopsapp.doctype.disbursal_of_honorarium.disbursal_of_honorarium.submit_disbursal_of_honorarium'
    );
    // Hook to fetch project details from Project Registration
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>('frappe.client.get_value');
    // Fetch current user data for auto-fill
    const { data: currentUserData } = useFrappeGetDoc("User", "");

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!dataLoaded) {
            fetchFormData({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const loadFormAndDocument = async () => {
            if (formDataResult?.message && !dataLoaded) {
                const { fields: apiFields, prefill_data, link_options, child_table_fields, client_scripts } = formDataResult.message;

                // Load Client Scripts
                if (client_scripts && Array.isArray(client_scripts)) {
                    const combinedScript = client_scripts.map((cs: any) => cs.script).join('\n\n');
                    setClientScript(combinedScript);
                }


                // Merge child_fields into the Table fields
                const enhancedFields = (apiFields || []).map((field: FormField) => {
                    if (field.fieldtype === 'Table' && child_table_fields && child_table_fields[field.fieldname]) {
                        return { ...field, child_fields: child_table_fields[field.fieldname] };
                    }
                    return field;
                });

                setFields(enhancedFields);

                // Initialize link options from backend
                let baseLinkOptions = link_options || {};

                // Fetch Account Heads from 'Budget Head' doctype (fields.md source of truth)
                try {
                    const headsRes = await fetchAccountHeads({
                        doctype: 'Budget Head',
                        fields: ['name', 'budget_head'],
                        limit_page_length: 0
                    });
                    if (headsRes?.message) {
                        baseLinkOptions['account_head'] = headsRes.message.map((head: any) => ({
                            value: head.name,
                            label: head.budget_head || head.name
                        }));
                    }
                } catch (err) {
                    console.error('Error fetching account heads:', err);
                }

                setLinkOptions(baseLinkOptions);

                let initialData = { ...prefill_data };

                // If editing, fetch existing document data
                if (id) {
                    try {
                        const existingDoc = await fetchExistingDoc({
                            doctype: 'Disbursal of Honorarium',
                            name: id
                        });

                        if (existingDoc?.message) {
                            initialData = { ...initialData, ...existingDoc.message };
                        }
                    } catch (err) {
                        console.error('Error fetching existing document:', err);
                        alert('Failed to load document for editing');
                    }
                }

                // Auto-fill project fields from URL if provided
                if (projectFromUrl && !id) {
                    if (!initialData.project_no) {
                        initialData.project_no = projectFromUrl;
                    }

                    // Fetch implementation_department from Project Registration
                    try {
                        const projectRes = await fetchFrappeValue({
                            doctype: 'Project Registration',
                            filters: { project_no: projectFromUrl },
                            fieldname: ['implementation_department'],
                        });

                        if (projectRes?.message) {
                            if (projectRes.message.implementation_department && !initialData.department_for) {
                                initialData.department_for = projectRes.message.implementation_department;
                            }
                            if (projectRes.message.implementation_department && !initialData.applicant_department) {
                                initialData.applicant_department = projectRes.message.implementation_department;
                            }
                        }
                    } catch (e) {
                        console.error('Failed to fetch project details:', e);
                    }
                }

                // Set defaults for any missing fields
                enhancedFields.forEach((field: FormField) => {
                    if (initialData[field.fieldname] === undefined && field.default !== undefined) {
                        initialData[field.fieldname] = field.default;
                    }
                });

                // Auto-fill applicant details from current user if new document
                if (!id && currentUserData) {
                    initialData.webmail_id = initialData.webmail_id || currentUserData.name || "";
                    initialData.name_of_applicant = initialData.name_of_applicant || currentUserData.full_name || "";
                    initialData.designation_of_applicant = initialData.designation_of_applicant || currentUserData.designation_name || "";
                    initialData.applicant_department = initialData.applicant_department || currentUserData.department_name || "";
                }

                setFormData(initialData);
                setDataLoaded(true);
                setLoading(false);
            }
            if (formDataError) {
                console.error("Failed to load form data:", formDataError);
                alert("Error: Could not load the form.");
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, id, fetchExistingDoc, projectFromUrl, dataLoaded, currentUserData]);

    // --- EVENT HANDLERS ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [fieldname]: file }));
    }, []);

    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
            return { ...prev, [tableName]: table };
        });
    }, []);

    const handleTableFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
            return { ...prev, [tableName]: table };
        });
    }, []);

    const addTableRow = useCallback((tableName: string, newRow: Record<string, any>) => {
        setFormData(prev => ({
            ...prev,
            [tableName]: [...(prev[tableName] || []), newRow]
        }));
    }, []);

    const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
        setFormData(prev => ({
            ...prev,
            [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex)
        }));
    }, []);

    // --- Computed: Total Amount from table_weoy (amount column) ---
    const totalAmount = useMemo(() => {
        const rows = formData.table_weoy || [];
        return rows.reduce((sum: number, row: any) => {
            const amt = parseFloat(row.amount || 0);
            return sum + (isNaN(amt) ? 0 : amt);
        }, 0);
    }, [formData.table_weoy]);

    // Sync total_amount field when computed value changes
    useEffect(() => {
        if (formData.total_amount !== String(totalAmount)) {
            setFormData(prev => ({ ...prev, total_amount: String(totalAmount) }));
        }
    }, [totalAmount]);

    const handleSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);

            if (id) {
                data.name = id;
            }

            const res = await saveForm({ data: JSON.stringify(data) });

            if (res?.message?.status === 'success') {
                setIsSaved(true);
                alert("Draft saved successfully!");
                // Navigate back to list on save if it's a new document
                if (!id && res.message.docname) {
                    navigate(`/disbursal-of-honorarium-form/${res.message.docname}`);
                }
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

        if (!isSaved && !id) {
            alert("Please save the form as draft first before submitting.");
            return;
        }

        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);

            // Save first if editing
            let docname = id;
            if (id) {
                data.name = id;
                const saveRes = await saveForm({ data: JSON.stringify(data) });

                if (saveRes?.message?.status !== 'success') {
                    throw new Error(saveRes?.message?.message || "Save failed during submission");
                }
                docname = saveRes.message.docname || id;
            }

            if (!docname) {
                throw new Error("No document name available for submission");
            }

            const submitRes = await submitForm({ docname });
            if (submitRes?.message?.status === 'success') {
                alert("Disbursal of Honorarium submitted successfully!");
                navigate('/disbursal-of-honorarium');
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
    if (loading) {
        return <GlobalLoader isLoading={true} />;
    }

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={id ? `Edit Disbursal: ${id}` : 'New Disbursal of Honorarium'}
                    projectName={formData.project_title}
                    projectNumber={formData.project_number}
                />

                <form onSubmit={handleSubmit}>
                    <FrappeCard className="space-y-12">
                        <DynamicFormRenderer
                            fields={fields}
                            formData={formData}
                            linkOptions={linkOptions}
                            onChange={handleChange}
                            onFileChange={handleFileChange}
                            onTableRowChange={handleTableRowChange}
                            onTableFileChange={handleTableFileChange}
                            onAddTableRow={addTableRow}
                            onDeleteTableRow={deleteTableRow}
                            readOnly={formData.docstatus === 1}
                        />
                    </FrappeCard>

                    {(!id || formData.docstatus === 0) && (
                        <div className="mt-8 flex justify-end gap-4">
                            <FrappeButton
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                            >
                                {isSubmitting ? 'Saving...' : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Draft
                                    </>
                                )}
                            </FrappeButton>
                            <FrappeButton
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-[#D97757] text-white hover:bg-[#D97757]"
                            >
                                {isSubmitting ? 'Submitting...' : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit Application
                                    </>
                                )}
                            </FrappeButton>
                        </div>
                    )}
                </form>
            </main>
        </div>
    );
};

export default DisbursalOfHonorariumForm;
