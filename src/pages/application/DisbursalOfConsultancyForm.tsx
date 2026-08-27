import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall, useFrappeGetDoc } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { Save, Send } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { commonAPI, disbursalOfConsultancyAPI, prepareFormDataForApi } from '@/services/apiService';
import { GlobalLoader } from '@/components/ui/global-loader';
import { useFrappeClientScript } from '@/hooks/useFrappeClientScript';
import { Printer } from 'lucide-react';
import { P11PrintModal } from '@/components/P11PrintModal';
import { generateDisbursalOfConsultancyHtml } from '@/utils/disbursalOfConsultancyPrint';
import { ActivityLog } from '@/components/ActivityLog';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';
import { getFileUrl } from '@/utils/fileUtils';

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
    const [savedDocName, setSavedDocName] = useState<string | null>(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [clientScript, setClientScript] = useState<string>("");
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const activityLogContainerRef = useRef<HTMLDivElement>(null);
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
    const { call: saveForm } = useFrappePostCall<{ message: any }>(disbursalOfConsultancyAPI.save);
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
                    console.error('Error fetching account heads:', err);
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
                    console.error('Error fetching users list:', err);
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
                        console.error('Error fetching existing document:', err);
                        alert('Failed to load document for editing');
                    }
                }

                // Auto-fill project fields from URL params.
                // ?project=  → disbursal_project_number (e.g. "26RICPSSP0391XXLS0854")
                // ?project_name= → project title (passed directly, avoids extra backend call)
                if (projectFromUrl && !id) {
                    initialData.disbursal_project_number = projectFromUrl;

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
                            initialData.disbursal_project_number = pData.project_no || projectFromUrl;
                            // Only override project_title if not already set from URL param
                            if (!projectNameFromUrl) {
                                initialData.project_title = pData.project_title || pData.name || projectFromUrl;
                            }
                            if (pData.implementation_department && !initialData.department) {
                                initialData.department = pData.implementation_department;
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
                console.error("Failed to load form data:", formDataError);
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

            const data = await prepareFormDataForApi(payload);
            const res = await saveForm({ data: JSON.stringify(data) });

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
            console.error(err);
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
            const payload: Record<string, any> = { ...formData };
            if (effectiveDocName) payload.name = effectiveDocName;

            const data = await prepareFormDataForApi(payload);
            const saveRes = await saveForm({ data: JSON.stringify(data) });
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
                    console.warn("Commit staging failed (non-fatal):", commitErr);
                }
                alert("Disbursal of Consultancy submitted successfully!");
                navigate(`/disbursal-of-consultancy/${docname}`);
            } else {
                throw new Error(msg?.message || "Submission failed");
            }
        } catch (err: any) {
            console.error(err);
            alert(`Submission failed: ${err.message || "Unknown error"}`);
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
                >
                    {id && (
                        <button
                            type="button"
                            onClick={() => setIsPrintModalOpen(true)}
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

            {effectiveDocName && <FloatingActivityLogButton doctype="Disbursal of Consultancy" docname={effectiveDocName} />}
            
            <div style={{ display: "none" }} ref={activityLogContainerRef}>
                {effectiveDocName && (
                    <ActivityLog 
                        doctype="Disbursal of Consultancy" 
                        docname={effectiveDocName} 
                        fallbackOwner={formData.owner}
                        fallbackCreation={formData.creation}
                        fallbackOwnerName={formData.pi_name || formData.applicant_name || formData.owner}
                    />
                )}
            </div>

            <P11PrintModal
                title="Disbursal of Consultancy Preview"
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                htmlContent={
                    isPrintModalOpen
                        ? generateDisbursalOfConsultancyHtml(
                              {
                                  ...formData,
                                  pi_name: formData.pi_name || formData.applicant_name || formData.owner
                              }, 
                              [], 
                              [], 
                              activityLogContainerRef.current
                          )
                        : ""
                }
                docName={formData.name || id || ""}
                attachments={[
                    ...(formData.please_attach_a_copy_of_completion_report ? [{ label: "Completion Report", url: getFileUrl(formData.please_attach_a_copy_of_completion_report) }] : []),
                    ...(formData.disbursal_additional_documents ? [{ label: "Additional Documents", url: getFileUrl(formData.disbursal_additional_documents) }] : [])
                ]}
            />
        </div>
    );
};

export default DisbursalOfConsultancyForm;
