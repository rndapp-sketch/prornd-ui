import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall, useFrappeGetDoc } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { Save, Send } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { commonAPI, disbursalOfConsultancyAPI } from '@/services/apiService';
import { GlobalLoader } from '@/components/ui/global-loader';
import { useFrappeClientScript } from '@/hooks/useFrappeClientScript';
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
 * Sends a POST to save_disbursal_of_consultancy_data(data).
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

// --- MAIN DISBURSAL OF CONSULTANCY FORM COMPONENT ---
const DisbursalOfConsultancyForm: React.FC = () => {
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
    const [savedDocName, setSavedDocName] = useState<string | null>(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [clientScript, setClientScript] = useState<string>("");


    // Ref so handleTableRowChange can read the latest fields without stale closure
    const fieldsRef = useRef<FormField[]>([]);
    useEffect(() => { fieldsRef.current = fields; }, [fields]);

    // Initialize client script engine
    useFrappeClientScript(clientScript, formData, setFormData);

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(
        disbursalOfConsultancyAPI.getFields
    );
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchAccountHeads } = useFrappePostCall<{ message: any[] }>('frappe.client.get_list');
    const { call: submitDocument } = useFrappePostCall<{ message: any }>(disbursalOfConsultancyAPI.submit);
    const { call: stageCommit } = useFrappePostCall('rndopsapp.rndopsapp.commitPayment.submit_commit_data');
    // Fetch current user data for auto-fill
    const { data: currentUserData } = useFrappeGetDoc("User", "");
    // Hook to fetch user details by email for auto-fill in consultancy table
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
                // Force web_mail_id to be a Link field so the Auto-fill dropdown works
                const enhancedFields = (apiFields || []).map((field: FormField) => {
                    if (field.fieldtype === 'Table' && child_table_fields && child_table_fields[field.fieldname]) {
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

                // Fetch Account Heads from 'Budget Head' doctype
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

                // Fetch Users list for the consultancy table dropdown (web_mail_id is Link to User)
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
                }

                setLinkOptions(baseLinkOptions);

                let initialData = { ...prefill_data };

                // If editing, fetch existing document data
                if (id) {
                    try {
                        const existingDoc = await fetchExistingDoc({
                            doctype: 'Disbursal of Consultancy',
                            name: id
                        });

                        if (existingDoc?.message) {
                            initialData = { ...initialData, ...existingDoc.message };
                        }
                    } catch (err) {
                        alert('Failed to load document for editing');
                    }
                }

                // Auto-fill project fields from URL params.
                // ?project=  → disbursal_project_number (e.g. "26RICPSSP0391XXLS0854")
                // ?project_name= → project title (passed directly, avoids extra backend call)
                if (projectFromUrl && !id) {
                    initialData.disbursal_project_number = projectFromUrl;

                    // Seed the dropdown with the raw URL value immediately so it shows as
                    // selected right away, in case the lookup below is slow or fails to resolve.
                    setLinkOptions(prev => {
                        const existing = prev['disbursal_project_number'] || [];
                        if (existing.some(opt => opt.value === projectFromUrl)) return prev;
                        return {
                            ...prev,
                            disbursal_project_number: [
                                ...existing,
                                { value: projectFromUrl, label: projectNameFromUrl || projectFromUrl },
                            ],
                        };
                    });

                    if (projectNameFromUrl) {
                        initialData.project_title = projectNameFromUrl;
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
                            // disbursal_project_number is a Link field to Project Registration,
                            // so its value must be the doc name — not the project_no display value —
                            // otherwise the dropdown has no matching option and renders blank.
                            initialData.disbursal_project_number = pData.name || projectFromUrl;

                            const projectOptionLabel = pData.project_no || pData.project_title || pData.name || projectFromUrl;
                            setLinkOptions(prev => {
                                const existing = prev['disbursal_project_number'] || [];
                                const withoutDup = existing.filter(opt => opt.value !== initialData.disbursal_project_number);
                                return {
                                    ...prev,
                                    disbursal_project_number: [
                                        ...withoutDup,
                                        { value: initialData.disbursal_project_number, label: projectOptionLabel },
                                    ],
                                };
                            });

                            // Only override project_title if not already set from URL param
                            if (!projectNameFromUrl) {
                                initialData.project_title = pData.project_title || pData.name || projectFromUrl;
                            }
                            if (pData.implementation_department && !initialData.department) {
                                initialData.department = pData.implementation_department;
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

                // Auto-fill PI details from current user if new document
                if (!id && currentUserData) {
                    initialData.webmail_id = initialData.webmail_id || currentUserData.name || "";
                    initialData.pi_name = initialData.pi_name || currentUserData.full_name || "";
                    initialData.designation = initialData.designation || currentUserData.designation_name || "";
                    initialData.department = initialData.department || currentUserData.department_name || "";
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
    }, [formDataResult, formDataError, id, fetchExistingDoc, projectFromUrl, projectNameFromUrl, dataLoaded, currentUserData, fetchUsersList, fetchAccountHeads]);

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
            const updatedRow = { ...table[rowIndex], [fieldname]: value };

            if (tableName === 'details_of_disbursal') {
                // Dynamically find child field names from the fields ref (avoids hardcoding Frappe field names)
                const disbursalTableField = fieldsRef.current.find(f => f.fieldname === 'details_of_disbursal');
                const childFields = disbursalTableField?.child_fields || [];

                // Amount field: a Currency/Float/Int field whose name contains 'amount'
                // but is NOT the personal or institute share field
                const amtFieldName = childFields.find(cf =>
                    (cf.fieldtype === 'Currency' || cf.fieldtype === 'Float' || cf.fieldtype === 'Int') &&
                    cf.fieldname.toLowerCase().includes('amount') &&
                    !cf.fieldname.toLowerCase().includes('personal') &&
                    !cf.fieldname.toLowerCase().includes('institute')
                )?.fieldname;

                const personalFieldName = childFields.find(cf =>
                    cf.fieldname.toLowerCase().includes('personal')
                )?.fieldname;

                const instituteFieldName = childFields.find(cf =>
                    cf.fieldname.toLowerCase().includes('institute') || cf.fieldname.toLowerCase().includes('inst_share')
                )?.fieldname;

                if (amtFieldName && fieldname === amtFieldName) {
                    const amt = parseFloat(String(value)) || 0;
                    if (personalFieldName) updatedRow[personalFieldName] = parseFloat((amt * 0.70).toFixed(2));
                    if (instituteFieldName) updatedRow[instituteFieldName] = parseFloat((amt * 0.30).toFixed(2));
                }
            }

            table[rowIndex] = updatedRow;
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

    // --- Handler for Link field selection in child tables (auto-fetch user details) ---
    // When web_mail_id is selected in any child table row, auto-fill name, emp_id, designation, department
    const handleTableLinkChange = useCallback(async (tableName: string, rowIndex: number, fieldname: string, value: string) => {
        if (fieldname === 'web_mail_id' && value) {
            try {
                const result = await fetchUserDetails({ user_email: value });
                const details = result?.message;

                if (details) {
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
            }
        }

        // Default behavior: just update the field value
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
            return { ...prev, [tableName]: table };
        });
    }, [fetchUserDetails]);

    // --- Computed: Aggregate totals and institute share breakdown from details_of_disbursal ---
    const disbursalTotals = useMemo(() => {
        const rows: any[] = formData.details_of_disbursal || [];

        // Dynamically resolve the amount fieldname from child_fields metadata
        const disbursalTableField = fields.find(f => f.fieldname === 'details_of_disbursal');
        const childFields = disbursalTableField?.child_fields || [];

        const amtFieldName = childFields.find(cf =>
            (cf.fieldtype === 'Currency' || cf.fieldtype === 'Float' || cf.fieldtype === 'Int') &&
            cf.fieldname.toLowerCase().includes('amount') &&
            !cf.fieldname.toLowerCase().includes('personal') &&
            !cf.fieldname.toLowerCase().includes('institute')
        )?.fieldname;

        let totalDisbursal = 0;
        let totalPersonal = 0;
        let totalInstitute = 0;

        rows.forEach((row: any) => {
            // Try the resolved fieldname first, then fallbacks
            const raw = amtFieldName
                ? row[amtFieldName]
                : (row.amount_to_be_disbursed ?? row.amount);
            const amt = parseFloat(String(raw ?? 0)) || 0;

            // Always derive shares from the current amount (don't trust stored 0s)
            totalDisbursal += amt;
            totalPersonal += amt * 0.70;
            totalInstitute += amt * 0.30;
        });

        const fmt = (n: number) => parseFloat(n.toFixed(2));
        return {
            total_disbursal_amount: fmt(totalDisbursal),
            total_personal_share: fmt(totalPersonal),
            total_institute_share: fmt(totalInstitute),
            idf: fmt(totalInstitute * 0.40),
            dpf: fmt(totalInstitute * 0.50),
            staff_welfare_fund: fmt(totalInstitute * 0.05),
            student_welfare_fund: fmt(totalInstitute * 0.05),
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.details_of_disbursal, fields]);

    // Sync computed aggregate values into formData so DynamicFormRenderer displays them
    useEffect(() => {
        setFormData(prev => ({ ...prev, ...disbursalTotals }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [disbursalTotals]);

    // The effective doc name: either from URL (/:id) or from a previous save
    const effectiveDocName = id || savedDocName;

    const handleSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const payload: Record<string, any> = { ...formData };
            if (effectiveDocName) payload.name = effectiveDocName;

            const res = await callSaveApi(disbursalOfConsultancyAPI.save, payload);

            if (res?.message?.status === 'success') {
                const newDocName = res.message.docname || effectiveDocName;
                if (newDocName) setSavedDocName(newDocName);
                alert(effectiveDocName ? "Disbursal updated successfully!" : "Draft saved successfully!");
                if (id) {
                    navigate(`/disbursal-of-consultancy/${id}`);
                } else if (newDocName) {
                    navigate(`/disbursal-of-consultancy/${newDocName}`);
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

            const saveRes = await callSaveApi(disbursalOfConsultancyAPI.save, payload);
            if (saveRes?.message?.status !== 'success') {
                throw new Error(saveRes?.message?.message || "Save failed");
            }

            const docname = saveRes.message.docname || effectiveDocName;
            if (!docname) throw new Error("No document name returned from save");
            setSavedDocName(docname);

            // Submit — transitions Draft → Pending Approval
            const submitRes = await submitDocument({ docname });
            const msg = submitRes?.message;
            if (msg?.status === 'success' || msg?.status === 'info' || msg?.docname) {
                // Stage the commit so Kafka can fire when Dean approves
                try {
                    await stageCommit({
                        doctype: "Disbursal of Consultancy",
                        frapAppId: docname,
                        name: docname,
                        project_name: formData.disbursal_project_number || "",
                        commit_amount: disbursalTotals.total_disbursal_amount,
                        budget_head: "Consultancy",
                    });
                } catch (commitErr) {
                }
                alert("Disbursal of Consultancy submitted successfully!");
                navigate(`/disbursal-of-consultancy/${docname}`);
            } else {
                throw new Error(msg?.message || "Submission failed");
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
                    title={id ? `Edit Disbursal: ${id}` : 'New Disbursal of Consultancy'}
                    projectName={formData.project_title}
                    projectNumber={formData.disbursal_project_number}
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
                                disabled={isSubmitting || !effectiveDocName}
                                className="bg-[#D97757] text-white hover:bg-[#D97757]"
                            >
                                {isSubmitting ? 'Saving...' : (
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
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default DisbursalOfConsultancyForm;
