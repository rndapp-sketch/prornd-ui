import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useFrappePostCall, useFrappeAuth } from "frappe-react-sdk";
import {
    DynamicFormRenderer,
    type FormField,
} from "@/components/forms/DynamicFormRenderer";
import {
    recruitmentAdhocContractualAPI,
    prepareFormDataForApi,
} from "@/services/apiService";
import { Loader2, ArrowLeft, Save, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserRoles } from "@/components/UserRole";

type LinkOption = {
    value: string;
    label: string;
};

type LinkOptionsMap = Record<string, LinkOption[]>;

const getChairpersonLabel = (
    email: string | null | undefined,
    optionsSource: LinkOptionsMap = {},
): string | null => {
    if (!email) return null;

    const opts: LinkOption[] =
        optionsSource["chairperson_webmail_id"] ||
        optionsSource["User"] ||
        [];
    const match = opts.find((o) => o.value === email);
    return match ? match.label : null;
};

// The Frappe role name for the DORND user who is allowed to edit chairperson fields
const DORND_ROLE = "Dean, RnD";

// --- FRAAPPE UI WRAPPERS ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FrappeCard = ({ children, className }: any) => (
    <Card
        className={cn(
            "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] shadow-sm rounded-xl overflow-hidden",
            className,
        )}
    >
        <CardContent className="p-0">{children}</CardContent>
    </Card>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FrappeButton = ({
    children,
    className,
    variant = "primary",
    ...props
}: any) => (
    <Button
        variant={
            variant === "primary"
                ? "default"
                : variant === "ghost"
                    ? "ghost"
                    : "outline"
        }
        className={cn(className)}
        {...props}
    >
        {children}
    </Button>
);

const RecruitmentAdhocContractualForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const editDocName = id || searchParams.get("edit");
    const projectParam = searchParams.get("project");
    const projectNoParam = searchParams.get("projectNo"); // Often used as well for the filter
    const { currentUser } = useFrappeAuth();

    // Role-based access
    const { roles } = useUserRoles(currentUser ?? null);
    const isDoRnd = roles.includes(DORND_ROLE);

    // Core States
    const [fields, setFields] = useState<FormField[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<LinkOptionsMap>({});
    const [isLoadingFields, setIsLoadingFields] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(
        editDocName || null,
    );

    // Workflow States
    const [workflowState, setWorkflowState] = useState<string>("Draft");
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // API Hooks
    const { call: getFieldsCall } = useFrappePostCall(
        recruitmentAdhocContractualAPI.getFields,
    );
    const { call: saveCall } = useFrappePostCall(
        recruitmentAdhocContractualAPI.save,
    );
    const { call: getActionsCall } = useFrappePostCall(
        recruitmentAdhocContractualAPI.getWorkflowActions,
    );
    const { call: performActionCall } = useFrappePostCall(
        recruitmentAdhocContractualAPI.performAction,
    );
    // Hook to fetch account heads list for dropdown
    const { call: fetchAccountHeads } = useFrappePostCall<{ message: any[] }>('frappe.client.get_list');
    // Hook to fetch piheadmentor_user_id from User doctype (client script logic)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>(
        "frappe.client.get_value",
    );

    const resolveChairpersonFromDepartment = useCallback(
        async (
            departmentId: string | null | undefined,
            optionsSource: LinkOptionsMap = {},
        ): Promise<Record<string, string>> => {
            if (!departmentId) return {};

            try {
                const departmentRes = await fetchFrappeValue({
                    doctype: "Department_prornd",
                    name: departmentId,
                    fieldname: ["dept_head"],
                });
                const chairpersonEmail = departmentRes?.message?.dept_head;
                if (!chairpersonEmail) return {};

                return {
                    chairperson_webmail_id: chairpersonEmail,
                    chairperson_name:
                        getChairpersonLabel(chairpersonEmail, optionsSource) || "",
                };
            } catch (e) {
                console.error(
                    "Failed to fetch department head for chairperson autofill",
                    e,
                );
                return {};
            }
        },
        [fetchFrappeValue],
    );

    // --- DATA FETCHING ---
    const fetchFormConfiguration = useCallback(async () => {
        setIsLoadingFields(true);
        try {
            const currentDocName = editDocName || savedDocName;
            console.log(
                "Fetching config for:",
                currentDocName ? `Doc: ${currentDocName}` : "New Document",
            );

            const response = await getFieldsCall({ doc_name: currentDocName });
            if (response && response.message) {
                const {
                    fields: fetchedFields,
                    prefill_data,
                    link_options,
                } = response.message;
                console.log("Fetched Form Fields:", fetchedFields);

                // WORKAROUND: The custom Python API `get_fields` drops the `hidden` property from the schema payload.
                // Filter out system/hidden fields that should not be rendered.
                const HIDDEN_FIELDS = [
                    "amended_from",
                    "section_break_e3vp",
                    "column_break_mlei",
                    "workflow_state",
                ];
                const filteredFields = (fetchedFields || []).filter(
                    (f: any) => !HIDDEN_FIELDS.includes(f.fieldname),
                );

                // chairperson_name is always read-only (auto-derived, never manually typed).
                // chairperson_webmail_id is editable only for DoRND users.
                const processedFields = filteredFields.map((f: FormField) => {
                    if (f.fieldname === "chairperson_name") {
                        return { ...f, read_only: 1 };
                    }
                    if (f.fieldname === "chairperson_webmail_id" && !isDoRnd) {
                        return { ...f, read_only: 1 };
                    }
                    if (f.fieldname === "webmail_id") {
                        return { ...f, fieldtype: "Data" };
                    }
                    if (f.fieldtype === "Table" && f.child_fields) {
                        return {
                            ...f,
                            child_fields: f.child_fields.map((cf) => {
                                if (cf.fieldname === "webmail_id" || cf.fieldname === "email" || cf.fieldname === "member_email" || cf.label?.toLowerCase().includes("webmail") || cf.label?.toLowerCase().includes("email")) {
                                    return { ...cf, fieldtype: "Data" };
                                }
                                return cf;
                            })
                        };
                    }
                    if (f.fieldname === "account_head") {
                        return { ...f, fieldtype: "Link", options: "Budget Head" };
                    }
                    return f;
                });

                // Fetch Account Heads from 'Budget Head' doctype to populate dropdown
                let baseLinkOptions = link_options || {};
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

                setFields(processedFields);
                setLinkOptions(baseLinkOptions);

                // Initialize Form Data
                if (currentDocName && prefill_data) {
                    // For existing docs: use saved data as-is for chairperson_webmail_id,
                    // but always re-derive chairperson_name from link_options to prevent stale values.
                    const existingData: Record<string, any> = { ...prefill_data };

                    // Prefer the implementation department head if chairperson was not saved.
                    const existingDepartment =
                        existingData.upfa_department ||
                        existingData.implementation_department;
                    if (!existingData.chairperson_webmail_id && existingDepartment) {
                        Object.assign(
                            existingData,
                            await resolveChairpersonFromDepartment(
                                existingDepartment,
                                link_options || {},
                            ),
                        );
                    }

                    // Fallback: if chairperson_webmail_id was never saved, try to fetch from applicant's HOD (piheadmentor_user_id)
                    if (
                        existingData.webmail_id &&
                        !existingData.chairperson_webmail_id
                    ) {
                        try {
                            const headRes = await fetchFrappeValue({
                                doctype: "User",
                                filters: { name: existingData.webmail_id },
                                fieldname: "piheadmentor_user_id",
                            });
                            if (headRes?.message?.piheadmentor_user_id) {
                                existingData.chairperson_webmail_id = headRes.message.piheadmentor_user_id;
                            }
                        } catch (e) {
                            console.error("Failed to fetch HOD for auto-fill on existing doc:", e);
                        }
                    }

                    // Always re-derive chairperson_name (ignore any stale saved value)
                    if (existingData.chairperson_webmail_id) {
                        const labelFromOptions = getChairpersonLabel(
                            existingData.chairperson_webmail_id,
                            link_options || {},
                        );
                        
                        if (labelFromOptions) {
                            existingData.chairperson_name = labelFromOptions;
                        } else {
                            // Fetch full_name manually if not in link_options
                            try {
                                const headNameRes = await fetchFrappeValue({
                                    doctype: "User",
                                    filters: { name: existingData.chairperson_webmail_id },
                                    fieldname: "full_name",
                                });
                                if (headNameRes?.message?.full_name) {
                                    existingData.chairperson_name = headNameRes.message.full_name;
                                }
                            } catch (e) {
                                console.error("Failed to fetch chairperson full_name:", e);
                                existingData.chairperson_name = existingData.chairperson_name || "";
                            }
                        }
                    }

                    setFormData(existingData);
                    setWorkflowState(prefill_data.workflow_state || "Draft");
                } else if (!currentDocName) {
                    // Pre-fill fields for a new form
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const initialData: Record<string, any> = { ...prefill_data };

                    // Client Script Logic: Auto-set webmail_id to current logged-in user
                    if (currentUser && !initialData.webmail_id) {
                        initialData.webmail_id = currentUser;
                    }

                    // Client Script Logic: Fetch piheadmentor_user_id for head field and chairperson fields
                    if (
                        initialData.webmail_id &&
                        !["Administrator", "Guest"].includes(initialData.webmail_id)
                    ) {
                        try {
                            const headRes = await fetchFrappeValue({
                                doctype: "User",
                                filters: { name: initialData.webmail_id },
                                fieldname: "piheadmentor_user_id",
                            });
                            if (headRes?.message?.piheadmentor_user_id) {
                                const hodEmail = headRes.message.piheadmentor_user_id;
                                initialData.head = hodEmail;
                                initialData.chairperson_webmail_id = hodEmail;

                                // Fetch HOD's full name
                                const headNameRes = await fetchFrappeValue({
                                    doctype: "User",
                                    filters: { name: hodEmail },
                                    fieldname: "full_name",
                                });
                                if (headNameRes?.message?.full_name) {
                                    initialData.chairperson_name = headNameRes.message.full_name;
                                }
                            }
                        } catch (e) {
                            console.error("Failed to fetch HOD details for new form", e);
                        }
                    }

                    // Attempt to prefill project fields from URL param
                    const projectCode = projectParam || projectNoParam;
                    if (projectCode && !initialData.upfa_project_code) {
                        initialData.upfa_project_code = projectCode;

                        // Fetch implementation_department, project_title, and project_duration_months from Project Registration
                        try {
                            const projectRes = await fetchFrappeValue({
                                doctype: "Project Registration",
                                filters: { project_no: projectCode },
                                fieldname: ["implementation_department", "project_title", "project_duration_months"],
                            });

                            if (projectRes?.message) {
                                if (projectRes.message.implementation_department && !initialData.implementation_department) {
                                    initialData.implementation_department = projectRes.message.implementation_department;
                                }
                                if (projectRes.message.implementation_department && !initialData.upfa_department) {
                                    initialData.upfa_department = projectRes.message.implementation_department;
                                }
                                if (projectRes.message.project_title && !initialData.upfa_project_title) {
                                    initialData.upfa_project_title = projectRes.message.project_title;
                                }
                                if (projectRes.message.project_duration_months && !initialData.upfa_project_duration) {
                                    initialData.upfa_project_duration = projectRes.message.project_duration_months;
                                }

                                Object.assign(
                                    initialData,
                                    await resolveChairpersonFromDepartment(
                                        projectRes.message.implementation_department,
                                        link_options || {},
                                    ),
                                );
                            }
                        } catch (e) {
                            console.error("Failed to fetch project details:", e);
                        }
                    }

                    setFormData(initialData);
                    setWorkflowState("Draft");
                }
            }
        } catch (error) {
            console.error("Error fetching form details:", error);
            alert("Failed to load form schema");
        } finally {
            setIsLoadingFields(false);
        }
    }, [
        editDocName,
        savedDocName,
        getFieldsCall,
        currentUser,
        isDoRnd,
        fetchFrappeValue,
        projectParam,
        projectNoParam,
        resolveChairpersonFromDepartment,
    ]);

    const fetchWorkflowActions = useCallback(
        async (docName: string) => {
            try {
                const response = await getActionsCall({ docname: docName });
                if (response && response.message) {
                    setAvailableActions(response.message);
                }
            } catch (error) {
                console.error("Failed to fetch workflow actions:", error);
                setAvailableActions([]);
            }
        },
        [getActionsCall],
    );

    // Initial load orchestration
    useEffect(() => {
        fetchFormConfiguration();
    }, [fetchFormConfiguration]);

    // Fetch actions if we have a saved document (or if it's being edited)
    useEffect(() => {
        const docNameToUse = editDocName || savedDocName;
        if (docNameToUse) {
            fetchWorkflowActions(docNameToUse);
        }
    }, [editDocName, savedDocName, fetchWorkflowActions]);

    // --- FORM HANDLERS ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFieldChange = useCallback((fieldname: string, value: any) => {
        setFormData((prev) => ({ ...prev, [fieldname]: value }));
    }, []);

    // Client Script side-effect: when webmail_id or chairperson_webmail_id changes, re-fetch related fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFieldChangeWithSideEffects = useCallback(
        async (fieldname: string, value: any) => {
            handleFieldChange(fieldname, value);

            if (fieldname === "webmail_id") {
                if (value && !["Administrator", "Guest"].includes(value)) {
                    try {
                        const headRes = await fetchFrappeValue({
                            doctype: "User",
                            filters: { name: value },
                            fieldname: "piheadmentor_user_id",
                        });
                        if (headRes?.message?.piheadmentor_user_id) {
                            setFormData((prev) => ({
                                ...prev,
                                head: headRes.message.piheadmentor_user_id,
                            }));
                        }
                    } catch (e) {
                        console.error("Failed to fetch head for webmail_id change", e);
                    }
                } else {
                    // Clear head if webmail_id is cleared or set to system user
                    setFormData((prev) => ({ ...prev, head: "" }));
                }
            }

            // Side-effect: when chairperson_webmail_id changes, auto-fill chairperson_name from linkOptions
            if (fieldname === "chairperson_webmail_id") {
                if (value) {
                    const opts =
                        linkOptions["chairperson_webmail_id"] ||
                        linkOptions["User"] ||
                        [];
                    const match = opts.find((o) => o.value === value);
                    setFormData((prev) => ({
                        ...prev,
                        chairperson_name: match?.label || "",
                    }));
                } else {
                    // Clear chairperson_name if email is cleared
                    setFormData((prev) => ({ ...prev, chairperson_name: "" }));
                }
            }

            if (
                fieldname === "implementation_department" ||
                fieldname === "upfa_department"
            ) {
                const chairpersonData = await resolveChairpersonFromDepartment(
                    value,
                    linkOptions,
                );
                if (chairpersonData.chairperson_webmail_id) {
                    setFormData((prev) => ({
                        ...prev,
                        ...chairpersonData,
                    }));
                }
            }
        },
        [
            handleFieldChange,
            fetchFrappeValue,
            linkOptions,
            resolveChairpersonFromDepartment,
        ],
    );

    const handleFileChange = useCallback(
        (fieldname: string, file: File | null) => {
            setFormData((prev) => ({ ...prev, [fieldname]: file }));
        },
        [],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTableRowChange = useCallback(
        (tableName: string, rowIndex: number, fieldname: string, value: any) => {
            setFormData((prev) => {
                const tableData = [...(prev[tableName] || [])];
                if (tableData[rowIndex]) {
                    const updatedRow = { ...tableData[rowIndex], [fieldname]: value };

                    // Auto Calculation Logic for Project Staff Designation
                    const keys = Object.keys(updatedRow);
                    const basicPayKey = keys.find(k => k.includes('basic_pay'));
                    const hraKey = keys.find(k => k.includes('hra'));
                    const medicalKey = keys.find(k => k.includes('medical'));
                    const totalKey = keys.find(k => k.includes('total'));

                    if ((fieldname === basicPayKey || fieldname === hraKey || fieldname === medicalKey) && totalKey) {
                        const basic = parseFloat(updatedRow[basicPayKey as string]) || 0;
                        const hraStr = String(updatedRow[hraKey as string] || "0").replace('%', '');
                        const hraPercent = parseFloat(hraStr) || 0;
                        const hraAmount = (basic * hraPercent) / 100;

                        let medicalAmount = 0;
                        if (medicalKey) {
                            const medicalVal = updatedRow[medicalKey];
                            if (medicalVal === 1 || medicalVal === '1' || medicalVal === true || String(medicalVal).toLowerCase() === 'yes') {
                                medicalAmount = 1250;
                            } else if (medicalVal) {
                                const parsedStr = String(medicalVal).replace(/[^0-9.-]+/g, "");
                                const parsed = parseFloat(parsedStr);
                                if (!isNaN(parsed) && parsed > 0) {
                                    medicalAmount = parsed === 1 ? 1250 : parsed;
                                }
                            }
                        }

                        updatedRow[totalKey] = basic + hraAmount + medicalAmount;
                    }

                    tableData[rowIndex] = updatedRow;
                }
                return { ...prev, [tableName]: tableData };
            });

            // Side effect for Auto-fetching Name when Webmail ID is entered in child tables
            if ((fieldname.includes("webmail") || fieldname.includes("email")) && value && typeof value === 'string' && value.includes('@')) {
                fetchFrappeValue({
                    doctype: "User",
                    filters: { name: value },
                    fieldname: "full_name",
                }).then((res) => {
                    if (res?.message?.full_name) {
                        setFormData((prev) => {
                            const tData = [...(prev[tableName] || [])];
                            if (tData[rowIndex]) {
                                // Find the fieldname corresponding to "Name" in the current table schema
                                const tableField = fields.find(f => f.fieldname === tableName);
                                let nameKey = "name_of_the_committee_member"; // default guess
                                if (tableField && tableField.child_fields) {
                                    const nameField = tableField.child_fields.find(cf => cf.label?.toLowerCase().includes("name") && !cf.label?.toLowerCase().includes("email") && !cf.label?.toLowerCase().includes("webmail") && !cf.label?.toLowerCase().includes("designation") && !cf.label?.toLowerCase().includes("department"));
                                    if (nameField) nameKey = nameField.fieldname;
                                }
                                
                                tData[rowIndex] = { ...tData[rowIndex], [nameKey]: res.message.full_name };
                            }
                            return { ...prev, [tableName]: tData };
                        });
                    }
                }).catch(e => console.error("Auto fetch full name failed", e));
            }
        },
        [fetchFrappeValue, fields],
    );

    const handleTableFileChange = useCallback(
        (
            tableName: string,
            rowIndex: number,
            fieldname: string,
            file: File | null,
        ) => {
            setFormData((prev) => {
                const tableData = [...(prev[tableName] || [])];
                if (tableData[rowIndex]) {
                    tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: file };
                }
                return { ...prev, [tableName]: tableData };
            });
        },
        [],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddTableRow = useCallback(
        (tableName: string, newRow: Record<string, any>) => {
            setFormData((prev) => ({
                ...prev,
                [tableName]: [...(prev[tableName] || []), newRow],
            }));
        },
        [],
    );

    const handleDeleteTableRow = useCallback(
        (tableName: string, rowIndex: number) => {
            setFormData((prev) => ({
                ...prev,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                [tableName]: (prev[tableName] || []).filter(
                    (_: any, idx: number) => idx !== rowIndex,
                ),
            }));
        },
        [],
    );

    // --- ACTIONS ---
    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);
        try {
            const preparedData = await prepareFormDataForApi({
                ...formData,
                name: savedDocName || editDocName, // Include name if updating
            });

            console.log("Saving Recruitment Adhoc Contractual:", preparedData);
            const response = await saveCall({ data: preparedData });

            if (response && response.message?.status === "success") {
                const newDocName = response.message.docname;
                alert("Draft saved successfully");

                if (!savedDocName && !editDocName) {
                    setSavedDocName(newDocName);
                    navigate(`/recruitment-adhoc-contractual/${newDocName}`, {
                        replace: true,
                    });
                }

                // Refresh config locally
                fetchFormConfiguration();
            } else {
                alert(response.message?.message || "Failed to save draft");
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Save error:", error);
            const errMsg =
                error.exc_type === "ValidationError"
                    ? JSON.parse(error._server_messages || "[]")
                        .map((m: string) => JSON.parse(m).message)
                        .join(", ")
                    : "An error occurred while saving";
            alert(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWorkflowAction = async (action: string) => {
        const docNameToUse = savedDocName || editDocName;
        if (!docNameToUse) {
            alert("Please save the document first.");
            return;
        }

        setIsActionLoading(true);
        try {
            let preparedData;
            if (workflowState === "Draft" || action === "Submit") {
                preparedData = await prepareFormDataForApi({
                    ...formData,
                    name: docNameToUse,
                });
            }

            const response = await performActionCall({
                docname: docNameToUse,
                action: action,
                updated_data: preparedData,
            });

            if (
                response &&
                response.message &&
                response.message.status === "success"
            ) {
                alert(`Action "${action}" completed successfully`);
                setWorkflowState(response.message.workflow_state);
                fetchFormConfiguration();
                fetchWorkflowActions(docNameToUse);
            } else {
                const errorDetail = response?.message?.message || (response?.message ? JSON.stringify(response.message) : "");
                alert(
                    errorDetail ? `Failed to perform action ${action}: ${errorDetail}` : `Failed to perform action ${action}`,
                );
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(`Workflow Action ${action} Error:`, error);
            
            let errMsg = `An error occurred while performing action: ${action}`;
            try {
                if (error.exc_type === "ValidationError" && error._server_messages) {
                    errMsg = JSON.parse(error._server_messages)
                        .map((m: string) => JSON.parse(m).message)
                        .join("\n");
                } else if (error.message) {
                    errMsg = error.message;
                }
            } catch (e) {
                console.error("Failed to parse server messages", e);
            }
            alert(errMsg);
        } finally {
            setIsActionLoading(false);
        }
    };

    // --- RENDER HELPERS ---
    const isFormReadOnly = workflowState !== "Draft" && workflowState !== "Pending";
    const isReadOnly = isFormReadOnly;
    const deanOverrideReadOnly = isDoRnd && isFormReadOnly;

    if (isLoadingFields) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#D97757]" />
                <p className="text-zinc-500 font-medium">
                    Loading form configuration...
                </p>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <main className="max-w-8xl mx-auto p-4 md:p-8 w-full overflow-hidden">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-serif font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                            Recruitment Adhoc Contractual
                            {(editDocName || savedDocName) && (
                                <span
                                    className={cn(
                                        "text-xs font-sans px-2.5 py-1 rounded-full border",
                                        workflowState === "Approved"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50"
                                            : workflowState === "Draft"
                                                ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                                                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50",
                                    )}
                                >
                                    {workflowState}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            {editDocName || savedDocName
                                ? `Application ID: ${editDocName || savedDocName}`
                                : "New Application"}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Main Form Content */}
                    <div className="space-y-6">
                        <FrappeCard>
                            <div className="p-8">
                                <DynamicFormRenderer
                                    fields={(() => {
                                        const DEAN_ONLY_FIELDS = ["chairperson_webmail_id", "chairperson_name"];
                                        let visibleFields = isDoRnd ? fields : fields.filter(f => !DEAN_ONLY_FIELDS.includes(f.fieldname));

                                        // For Dean in non-Draft states: mark all fields except chairperson as read_only
                                        if (deanOverrideReadOnly) {
                                            visibleFields = visibleFields.map(f =>
                                                DEAN_ONLY_FIELDS.includes(f.fieldname)
                                                    ? { ...f, read_only: 0, read_only_depends_on: undefined, fieldtype: f.fieldtype === "Read Only" ? "Data" : f.fieldtype }
                                                    : { ...f, read_only: 1 }
                                            );
                                        }

                                        return visibleFields;
                                    })()}
                                    formData={formData}
                                    linkOptions={linkOptions}
                                    onChange={handleFieldChange}
                                    onFileChange={handleFileChange}
                                    onTableRowChange={handleTableRowChange}
                                    onTableFileChange={handleTableFileChange}
                                    onAddTableRow={handleAddTableRow}
                                    onDeleteTableRow={handleDeleteTableRow}
                                    onFieldChangeWithSideEffects={
                                        handleFieldChangeWithSideEffects
                                    }
                                    readOnly={deanOverrideReadOnly ? false : isReadOnly}
                                />
                            </div>

                            {/* Action Bar */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 p-6 flex items-center justify-between">
                                <div className="text-sm text-zinc-500">
                                    {(editDocName || savedDocName) &&
                                        `Last updated: ${new Date().toLocaleTimeString()}`}
                                </div>
                                <div className="flex gap-3">
                                    {workflowState === "Draft" ? (
                                        <>
                                            <FrappeButton
                                                variant="outline"
                                                onClick={handleSave}
                                                disabled={isSubmitting || isActionLoading}
                                                className="bg-white dark:bg-zinc-800 shadow-sm"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Save className="w-4 h-4 mr-2" />
                                                )}
                                                Save Draft
                                            </FrappeButton>

                                            {/* We rely on workflow actions for submission if available, otherwise fallback */}
                                            {availableActions.includes("Submit") ? (
                                                <FrappeButton
                                                    onClick={() => handleWorkflowAction("Submit")}
                                                    disabled={isSubmitting || isActionLoading}
                                                    className="bg-[#D97757] hover:opacity-90 text-white shadow-sm"
                                                >
                                                    {isActionLoading ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Send className="w-4 h-4 mr-2" />
                                                    )}
                                                    Submit
                                                </FrappeButton>
                                            ) : (
                                                <FrappeButton
                                                    onClick={handleSave} // fallback to just save if no workflow submit configured yet manually
                                                    disabled={
                                                        isSubmitting ||
                                                        isActionLoading ||
                                                        !(savedDocName || editDocName)
                                                    }
                                                    className="bg-[#D97757] hover:opacity-90 text-white shadow-sm"
                                                >
                                                    {isSubmitting ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    )}
                                                    Save & Continue
                                                </FrappeButton>
                                            )}
                                        </>
                                    ) : (
                                        /* Any Other Workflow Actions */
                                        availableActions.map((action) => (
                                            <FrappeButton
                                                key={action}
                                                onClick={() => handleWorkflowAction(action)}
                                                disabled={isActionLoading}
                                                className={cn(
                                                    "shadow-sm",
                                                    action === "Approve"
                                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        : action === "Reject"
                                                            ? "bg-red-600 hover:bg-red-700 text-white"
                                                            : "bg-[#D97757] hover:opacity-90 text-white",
                                                )}
                                            >
                                                {isActionLoading ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : null}
                                                {action}
                                            </FrappeButton>
                                        ))
                                    )}
                                </div>
                            </div>
                        </FrappeCard>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RecruitmentAdhocContractualForm;
