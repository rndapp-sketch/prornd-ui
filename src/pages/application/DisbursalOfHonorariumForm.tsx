import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall, useFrappeGetDoc } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { Save, Send } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { prepareFormDataForApi, commonAPI } from '@/services/apiService';
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
    const projectNameFromUrl = searchParams.get('project_name');

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(null);
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
    // Hook to fetch user details by email for auto-fill in honorarium table
    const { call: fetchUserDetails } = useFrappePostCall<{ message: any }>(commonAPI.getUserDetailsByEmail);
    // Hook to fetch users list for dropdown
    const { call: fetchUsersList } = useFrappePostCall<{ message: any[] }>('frappe.client.get_list');

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
                        // Force web_mail_id to be a Link field so the Auto-fill dropdown works
                        const processedChildFields = child_table_fields[field.fieldname].map((childField: any) => {
                            if (childField.fieldname === 'web_mail_id') {
                                return { ...childField, fieldtype: 'Link', options: 'User' };
                            }
                            return childField;
                        });
                        return { ...field, child_fields: processedChildFields };
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

                // Fetch Users list for the honorarium table dropdown (username field is Link to User)
                try {
                    const usersRes = await fetchUsersList({
                        doctype: 'User',
                        fields: ['name', 'full_name', 'email'],
                        filters: [['enabled', '=', 1]],
                        limit_page_length: 0
                    });
                    if (usersRes?.message) {
                        baseLinkOptions['web_mail_id'] = usersRes.message.map((user: any) => ({
                            value: user.name,
                            label: user.full_name ? `${user.full_name} (${user.name})` : user.name
                        }));
                        // Also add as 'User' key for generic Link field support
                        baseLinkOptions['User'] = baseLinkOptions['web_mail_id'];
                    }
                } catch (err) {
                    console.error('Error fetching users list:', err);
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
                            setIsSaved(true); // Existing doc is already saved, enable submit
                        }
                    } catch (err) {
                        console.error('Error fetching existing document:', err);
                        alert('Failed to load document for editing');
                    }
                }

                // Auto-fill project fields from URL params.
                // ?project=  → project_no (e.g. "26RICPSSP0391XXLS0854")
                // ?project_name= → project title (passed directly, avoids extra backend call)
                if (projectFromUrl && !id) {
                    // Always set project_no from URL immediately
                    initialData.project_no     = projectFromUrl;
                    initialData.project_number = projectFromUrl;

                    // If project_name was passed in the URL use it directly
                    if (projectNameFromUrl) {
                        initialData.project_name = projectNameFromUrl;
                    }

                    try {
                        let pData: any = null;

                        // Lookup by project_no to get department and any missing fields
                        const byNoResp = await fetchUsersList({
                            doctype: 'Project Registration',
                            filters: [['project_no', '=', projectFromUrl]],
                            fields: ['name', 'project_no', 'project_title', 'implementation_department'],
                            limit: 1,
                        });
                        if (byNoResp?.message?.length > 0) {
                            pData = byNoResp.message[0];
                        }

                        // Fallback: look up by doc name (internal ID)
                        if (!pData) {
                            const projectDoc = await fetchExistingDoc({
                                doctype: 'Project Registration',
                                name: projectFromUrl,
                            });
                            if (projectDoc?.message) {
                                pData = projectDoc.message;
                            }
                        }

                        if (pData) {
                            initialData.project_no     = pData.project_no || projectFromUrl;
                            initialData.project_number = initialData.project_no;
                            // Only override project_name if not already set from URL param
                            if (!projectNameFromUrl) {
                                initialData.project_name = pData.project_title || pData.name || projectFromUrl;
                            }
                            if (pData.implementation_department && !initialData.department_for) {
                                initialData.department_for = pData.implementation_department;
                            }
                            if (pData.implementation_department && !initialData.applicant_department) {
                                initialData.applicant_department = pData.implementation_department;
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
    }, [formDataResult, formDataError, id, fetchExistingDoc, projectFromUrl, dataLoaded, currentUserData, fetchUsersList, fetchAccountHeads, fetchFrappeValue]);

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

    // --- Handler for Link field selection in child tables (for auto-fetch functionality) ---
    const handleTableLinkChange = useCallback(async (tableName: string, rowIndex: number, fieldname: string, value: string) => {
        // Handle username field selection in the honorarium table (table_weoy)
        if (tableName === 'table_weoy' && fieldname === 'web_mail_id' && value) {
            try {
                // Fetch user details by email
                const result = await fetchUserDetails({ user_email: value });
                const details = result?.message;
                
                if (details) {
                    // Update the row with fetched user details
                    setFormData(prev => {
                        const table = [...(prev[tableName] || [])];
                        table[rowIndex] = {
                            ...table[rowIndex],
                            web_mail_id: value,
                            name1: details.full_name || '',
                            emp_id: details.employee_id || '',
                            designation: details.designation_name || details.designation || '',
                            department_section: details.department_name || ''
                        };
                        return { ...prev, [tableName]: table };
                    });
                    return;
                }
            } catch (err) {
                console.error('Failed to fetch user details:', err);
            }
        }
        
        // Default behavior: just update the field value
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
            return { ...prev, [tableName]: table };
        });
    }, [fetchUserDetails]);

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

    // The effective doc name: either from URL (/:id) or from a previous save
    const effectiveDocName = id || savedDocName;

    const handleSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);

            if (effectiveDocName) {
                data.name = effectiveDocName;
            }

            console.log('[DisbursalForm] Saving data:', data);

            const res = await saveForm({ data: JSON.stringify(data) });

            if (res?.message?.status === 'success') {
                setIsSaved(true);
                // Remember the docname so future saves/submits update the same document
                const newDocName = res.message.docname || effectiveDocName;
                if (newDocName) setSavedDocName(newDocName);
                alert(effectiveDocName ? "Disbursal updated successfully!" : "Draft saved successfully!");
                if (id) {
                    navigate(`/disbursal-of-honorarium/${id}`);
                } else if (newDocName) {
                    navigate(`/disbursal-of-honorarium/${newDocName}`);
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
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);

            if (effectiveDocName) {
                data.name = effectiveDocName;
            }

            // Always save first, then submit
            const saveRes = await saveForm({ data: JSON.stringify(data) });

            if (saveRes?.message?.status !== 'success') {
                throw new Error(saveRes?.message?.message || "Save failed during submission");
            }

            const docname = saveRes.message.docname || effectiveDocName;
            // Remember it in case submit fails and user retries
            if (docname) setSavedDocName(docname);

            if (!docname) {
                throw new Error("No document name available for submission");
            }

            const submitRes = await submitForm({ docname });
            if (submitRes?.message?.status === 'success' || submitRes?.message) {
                alert("Disbursal of Honorarium submitted successfully!");
                navigate(`/disbursal-of-honorarium/${docname}`);
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
                            onTableLinkChange={handleTableLinkChange}
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
                                disabled={isSubmitting || !isSaved}
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
