import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall, useFrappeGetDoc } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { Save, Send, Printer } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { commonAPI, disbursalOfHonorariumAPI, prepareFormDataForApi } from '@/services/apiService';
import { GlobalLoader } from '@/components/ui/global-loader';
import { useFrappeClientScript } from '@/hooks/useFrappeClientScript';
import { P11PrintModal } from '@/components/P11PrintModal';
import { ActivityLog } from "@/components/ActivityLog";
import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";
import { generateDisbursalOfHonorariumHtml, resolveHonorariumPrintData } from '@/utils/disbursalOfHonorariumPrint';
import { getFileUrl } from '@/utils/fileUtils';
import { ErrorModal } from '../../components/ErrorModal';
import { parseFrappeError } from '../../utils/errorUtils';

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

// --- FILE UPLOAD HELPER ---
const uploadFileToFrappe = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("is_private", "0");
    const response = await fetch("/api/method/upload_file", {
        method: "POST",
        body: fd,
        headers: {
            "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
        },
        credentials: "include",
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`File upload failed (${response.status}): ${text.slice(0, 200)}`);
    }
    const json = JSON.parse(text);
    const fileUrl = json?.message?.file_url;
    if (!fileUrl) {
        throw new Error("File upload did not return a valid file_url");
    }
    return fileUrl;
};

/**
 * Sends a POST to save_disbursal_of_honorarium_data(data).
 *
 * Any File object is uploaded to Frappe's /api/method/upload_file first,
 * and the resulting file URL (/files/...) is placed into `data` for MinIO migration.
 */
const callSaveApi = async (endpoint: string, formData: Record<string, any>): Promise<any> => {
    const data: Record<string, any> = {};

    for (const key in formData) {
        const value = formData[key];

        if (value instanceof File) {
            const fileUrl = await uploadFileToFrappe(value);
            data[key] = fileUrl;
        } else if (Array.isArray(value)) {
            data[key] = await Promise.all(
                value.map(async (row: any) => {
                    const cleanRow: Record<string, any> = {};
                    for (const rowKey in row) {
                        const rowVal = row[rowKey];
                        if (rowVal instanceof File) {
                            cleanRow[rowKey] = await uploadFileToFrappe(rowVal);
                        } else {
                            cleanRow[rowKey] = rowVal;
                        }
                    }
                    return cleanRow;
                })
            );
        } else {
            data[key] = value;
        }
    }

    const fd = new globalThis.FormData();
    fd.append('data', JSON.stringify(data));

    const response = await fetch(`/api/method/${endpoint}`, {
        method: 'POST',
        body: fd,
        headers: {
            'X-Frappe-CSRF-Token': (window as any).csrf_token || '',
        },
        credentials: 'include',
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Save failed (${response.status}): ${text.slice(0, 200)}`);
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`Unexpected response: ${text.slice(0, 200)}`);
    }
};

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
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });
    const [isSaved, setIsSaved] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [clientScript, setClientScript] = useState<string>("");
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const activityLogContainerRef = useRef<HTMLDivElement>(null);
    const [fetchedOwnerName, setFetchedOwnerName] = useState<string>("");

    // Initialize client script engine
    useFrappeClientScript(clientScript, formData, setFormData);

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(
        disbursalOfHonorariumAPI.getFields
    );
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchAccountHeads } = useFrappePostCall<{ message: any[] }>('frappe.client.get_list');
    const { call: fetchDeptList } = useFrappePostCall<{ message: any[] }>('frappe.client.get_list');
    const { call: saveForm } = useFrappePostCall<{ message: any }>(disbursalOfHonorariumAPI.save);
    const { call: submitForm } = useFrappePostCall(
        disbursalOfHonorariumAPI.submit
    );
    // Fetch current user data for auto-fill
    const { data: currentUserData } = useFrappeGetDoc("User", "");
    // Hook to fetch combined User + Universal Registration profile for honorarium row auto-fill
    const { call: fetchUserProfile } = useFrappePostCall<{ message: any }>(commonAPI.getUserRegistrationProfile);
    // Hook to fetch users list for dropdown
    const { call: fetchUsersList } = useFrappePostCall<{ message: any[] }>('frappe.client.get_list');
    
    const { call: getOwnerDetails } = useFrappePostCall<{ message: any }>(commonAPI.getUserDetailsByEmail);

    // --- DATA FETCHING ---
    useEffect(() => {
        if (formData.owner && !fetchedOwnerName) {
            getOwnerDetails({ user_email: formData.owner })
                .then(res => {
                    if (res?.message?.full_name) {
                        setFetchedOwnerName(res.message.full_name);
                    } else {
                        setFetchedOwnerName(formData.owner);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch owner details:", err);
                    setFetchedOwnerName(formData.owner);
                });
        }
    }, [formData.owner, fetchedOwnerName, getOwnerDetails]);

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
                        // Force web_mail_id to be a Link field so the Auto-fill dropdown works,
                        // and force department_section to be a Link so it shows human-readable names instead of IDs.
                        const processedChildFields = child_table_fields[field.fieldname].map((childField: any) => {
                            if (childField.fieldname === 'web_mail_id') {
                                return { ...childField, fieldtype: 'Link', options: 'User' };
                            }
                            if (childField.fieldname === 'department_section') {
                                return { ...childField, fieldtype: 'Link', options: 'Department_prornd' };
                            }
                            return childField;
                        });
                        return { ...field, child_fields: processedChildFields };
                    }
                    return field;
                });

                setFields(enhancedFields);

                // Initialize link options from backend (create a new object to ensure React detects the state change)
                let baseLinkOptions = link_options ? { ...link_options } : {};

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
                }

                // Fetch Departments for human-readable print mapping
                try {
                    const deptRes = await fetchDeptList({
                        doctype: "Department_prornd",
                        fields: ["name", "dept_name"],
                        limit_page_length: 0,
                    });
                    if (deptRes?.message) {
                        const deptOptions = deptRes.message.map((d: any) => ({
                            value: d.name,
                            label: d.dept_name || d.name,
                        }));
                        baseLinkOptions["applicant_department"] = deptOptions;
                        baseLinkOptions["department_for"] = deptOptions;
                        baseLinkOptions["department"] = deptOptions;
                        baseLinkOptions["Department_prornd"] = deptOptions;
                    }
                } catch (_) { }

                // Fetch System Users for the initial static dropdown options.
                // UNIREG-only individuals (no User account) are surfaced on-demand
                // via the async search function below — no bulk pre-fetch needed.
                try {
                    const usersRes = await fetchUsersList({
                        doctype: 'User',
                        fields: ['name', 'full_name'],
                        filters: [['enabled', '=', 1]],
                        limit_page_length: 0
                    });
                    if (usersRes?.message) {
                        const userOpts = usersRes.message.map((user: any) => ({
                            value: user.name,
                            label: user.full_name ? `${user.full_name} (${user.name})` : user.name
                        }));
                        baseLinkOptions['web_mail_id'] = userOpts;
                        baseLinkOptions['User'] = userOpts;
                    }
                } catch (err) {
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
                alert("Error: Could not load the form.");
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, id, fetchExistingDoc, projectFromUrl, dataLoaded, currentUserData, fetchUsersList, fetchAccountHeads]);

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
        // Handle username/webmail selection in the honorarium table (table_weoy)
        if (tableName === 'table_weoy' && fieldname === 'web_mail_id' && value) {
            try {
                // Use the combined User + Universal Registration profile endpoint.
                // `search` mode returns a list; we pick the first matching profile.
                const result = await fetchUserProfile({ search: value });
                let details: any = null;

                if (Array.isArray(result?.message) && result.message.length > 0) {
                    // search mode → list of profiles; use the first result
                    details = result.message[0];
                } else if (result?.message && !Array.isArray(result.message)) {
                    // single-profile mode (fallback)
                    details = result.message;
                }

                if (details) {
                    // Normalise field names: prefer User fields, fall back to
                    // Universal Registration__ suffixed variants (_u_r).
                    const fullName      = details.full_name       || details.full_name_u_r       || '';
                    const employeeId    = details.employee_id     || '';
                    const designation   = details.designation_name|| details.designation         || '';
                    const department    = details.department_name || '';

                    setFormData(prev => {
                        const table = [...(prev[tableName] || [])];
                        table[rowIndex] = {
                            ...table[rowIndex],
                            web_mail_id:        value,
                            name1:              fullName,
                            emp_id:             employeeId,
                            designation:        designation,
                            department_section: department,
                        };
                        return { ...prev, [tableName]: table };
                    });
                    return;
                }
            } catch (err) {
            }
        }

        // Default behavior: just update the field value
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
            return { ...prev, [tableName]: table };
        });
    }, [fetchUserProfile]);

    // --- Async search function map passed to the honorarium child table ---
    // When the user types in the web_mail_id autocomplete, this fires a live
    // search against get_user_registration_profile (covers both User accounts
    // and UNIREG-only individuals like sbco2012@gmail.com).
    const tableAsyncSearch = useMemo(() => ({
        web_mail_id: async (query: string) => {
            if (!query || query.length < 2) return [];
            try {
                const result = await fetchUserProfile({ search: query });
                const list: any[] = Array.isArray(result?.message)
                    ? result.message
                    : result?.message ? [result.message] : [];

                return list.map((p: any) => {
                    // Prefer User fields; fall back to Universal Registration__ variants
                    const email = p.email || p.email_address_u_r || p.name || '';
                    const name  = p.full_name || p.full_name_u_r || '';
                    return {
                        value: email,
                        label: name ? `${name} (${email})` : email,
                    };
                }).filter((o: any) => o.value);
            } catch {
                return [];
            }
        },
    }), [fetchUserProfile]);

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
            const payload: Record<string, any> = { ...formData };
            if (effectiveDocName) payload.name = effectiveDocName;

            const data = await prepareFormDataForApi(payload);
            const res = await saveForm({ data: JSON.stringify(data) });

            if (res?.message?.status === 'success') {
                setIsSaved(true);
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
            setErrorModal({ open: true, title: "Save Failed", message: parseFrappeError(err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const payload: Record<string, any> = { ...formData };
            if (effectiveDocName) payload.name = effectiveDocName;

            const data = await prepareFormDataForApi(payload);
            const saveRes = await saveForm({ data: JSON.stringify(data) });

            if (saveRes?.message?.status !== 'success') {
                throw new Error(saveRes?.message?.message || "Save failed during submission");
            }

            const docname = saveRes.message.docname || effectiveDocName;
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
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(err) });
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
                >
                    {id && (
                        <button
                            type="button"
                            onClick={() => setIsPrintModalOpen(true)}
                            disabled={!!formData.owner && !fetchedOwnerName}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Print this document"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </button>
                    )}
                </PageHeader>

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
                            asyncSearchFnsForTables={tableAsyncSearch}
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

            {effectiveDocName && <FloatingActivityLogButton doctype="Disbursal of Honorarium" docname={effectiveDocName} />}

            <div style={{ display: "none" }} ref={activityLogContainerRef}>
                {effectiveDocName && (
                    <ActivityLog
                        doctype="Disbursal of Honorarium"
                        docname={effectiveDocName}
                        fallbackOwner={formData.owner}
                        fallbackCreation={formData.creation}
                        fallbackOwnerName={fetchedOwnerName || formData.owner}
                    />
                )}
            </div>

            <P11PrintModal
                title="Disbursal of Honorarium Preview"
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                htmlContent={
                    isPrintModalOpen
                        ? generateDisbursalOfHonorariumHtml(
                            {
                                ...resolveHonorariumPrintData(formData, linkOptions),
                                resolved_owner_name: fetchedOwnerName || formData.owner
                            },
                            [],
                            [],
                            activityLogContainerRef.current
                        )
                        : ""
                }
                docName={formData.name || id || ""}
                attachments={[
                    ...(formData.attached_approvals ? [{ label: "Merged Approvals", url: getFileUrl(formData.attached_approvals) }] : []),
                    ...(formData.additional_documents ? [{ label: "Additional Documents", url: getFileUrl(formData.additional_documents) }] : [])
                ]}
            />
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default DisbursalOfHonorariumForm;
