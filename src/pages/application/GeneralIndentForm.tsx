/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useFrappePostCall, useFrappeAuth } from "frappe-react-sdk";
import {
    DynamicFormRenderer,
    type FormField,
    type LinkOption,
} from "@/components/forms/DynamicFormRenderer";
import { generalIndentAPI, prepareFormDataForApi } from "@/services/apiService";
import { Loader2, ArrowLeft, Save, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        child_table_fields?: Record<string, any[]>;
    };
}

// --- UI WRAPPERS ---
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

const DOCTYPE = "Indent General Form";

const GeneralIndentForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const editDocName = id || searchParams.get("edit");
    const projectParam = searchParams.get("project");
    const { currentUser } = useFrappeAuth();

    // Core States
    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(null);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Workflow States
    const [workflowState, setWorkflowState] = useState<string>("Draft");
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [docStatus, setDocStatus] = useState<number>(0);

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } =
        useFrappePostCall<FormDataResponse>(generalIndentAPI.getFields);
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>("frappe.client.get");
    const { call: saveForm } = useFrappePostCall(generalIndentAPI.save);
    const { call: fetchProjectDetails } = useFrappePostCall<{ message: any }>("frappe.client.get");
    const { call: fetchUserDetails } = useFrappePostCall<{ message: any }>(generalIndentAPI.getUserDetails);
    const { call: getActionsCall } = useFrappePostCall<{ message: string[] }>(generalIndentAPI.getWorkflowActions);
    const { call: performActionCall } = useFrappePostCall<{ message: any }>(generalIndentAPI.performAction);

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!dataLoaded) {
            fetchFormData({ doc_name: projectParam || undefined });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const loadFormAndDocument = async () => {
            if (formDataResult?.message && !dataLoaded) {
                const { fields: apiFields, prefill_data, link_options, child_table_fields } = formDataResult.message;

                // Merge child_fields into the Table fields
                const enhancedFields = (apiFields || []).map((field: FormField) => {
                    if (field.fieldtype === "Table" && child_table_fields && child_table_fields[field.fieldname]) {
                        return { ...field, child_fields: child_table_fields[field.fieldname] };
                    }
                    return field;
                });

                setFields(enhancedFields);
                setLinkOptions(link_options || {});

                let initialData = { ...prefill_data };

                // If editing, fetch existing document data
                if (editDocName) {
                    try {
                        const existingDoc = await fetchExistingDoc({
                            doctype: DOCTYPE,
                            name: editDocName,
                        });
                        if (existingDoc?.message) {
                            initialData = { ...initialData, ...existingDoc.message };
                            setWorkflowState(existingDoc.message.workflow_state || "Draft");
                            setDocStatus(existingDoc.message.docstatus || 0);
                        }
                    } catch (err) {
                        console.error("Error fetching existing document:", err);
                        alert("Failed to load document for editing");
                    }
                }

                // Auto-fill project from URL if not editing and not already prefilled by backend
                if (projectParam && !editDocName && !initialData.igf_project_title) {
                    try {
                        const projectDoc = await fetchProjectDetails({
                            doctype: "Project Registration",
                            name: projectParam,
                        });
                        if (projectDoc?.message) {
                            const pData = projectDoc.message;
                            initialData.igf_project_title = pData.name || projectParam;
                            initialData.igf_project_code = pData.project_no || "";
                            initialData.igf_department_centre_section = pData.implementation_department || "";
                        } else {
                            initialData.igf_project_title = projectParam;
                        }
                    } catch {
                        initialData.igf_project_title = projectParam;
                    }
                }

                // Set defaults for any missing fields
                enhancedFields.forEach((field: FormField) => {
                    if (initialData[field.fieldname] === undefined && field.default !== undefined) {
                        initialData[field.fieldname] = field.default;
                    }
                });

                // Default webmail to current user if not already set
                if (!initialData.igf_webmail_id && !editDocName && currentUser) {
                    initialData.igf_webmail_id = currentUser;
                }

                setFormData(initialData);
                setDataLoaded(true);
                setLoading(false);
            }
            if (formDataError) {
                console.error("Failed to load form data:", formDataError);
                alert("Error: Could not load the General Indent form.");
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, editDocName, fetchExistingDoc, projectParam, dataLoaded, fetchProjectDetails, currentUser]);

    // Fetch workflow actions when editing an existing doc
    useEffect(() => {
        const docNameToUse = editDocName || savedDocName;
        if (docNameToUse && dataLoaded) {
            getActionsCall({ docname: docNameToUse })
                .then((res) => {
                    setAvailableActions(res?.message || []);
                })
                .catch(() => setAvailableActions([]));
        }
    }, [editDocName, savedDocName, dataLoaded, getActionsCall]);

    // --- EVENT HANDLERS ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData((prev) => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData((prev) => ({ ...prev, [fieldname]: file }));
    }, []);

    const handleFieldChangeWithSideEffects = useCallback(
        async (fieldname: string, value: any) => {
            handleChange(fieldname, value);

            try {
                // Auto-populate user details when webmail_id changes
                if (fieldname === "igf_webmail_id") {
                    if (value) {
                        const res = await fetchUserDetails({ webmail_id: value });
                        if (res?.message) {
                            setFormData((prev) => ({
                                ...prev,
                                igf_webmail_id: value,
                                igf_indenter: res.message.igf_indenter || prev.igf_indenter,
                                igf_indenter_designation: res.message.igf_indenter_designation || prev.igf_indenter_designation,
                                igf_webmail_user_id: res.message.igf_webmail_user_id || prev.igf_webmail_user_id,
                                igf_employee_code: res.message.igf_employee_code || prev.igf_employee_code,
                            }));
                        }
                    } else {
                        setFormData((prev) => ({
                            ...prev,
                            igf_webmail_id: "",
                            igf_indenter: "",
                            igf_indenter_designation: "",
                            igf_webmail_user_id: "",
                            igf_employee_code: "",
                        }));
                    }
                    return;
                }

                // Auto-populate project details when project_title changes
                if (fieldname === "igf_project_title") {
                    if (value) {
                        try {
                            const projectDoc = await fetchProjectDetails({
                                doctype: "Project Registration",
                                name: value,
                            });
                            if (projectDoc?.message) {
                                const pData = projectDoc.message;
                                setFormData((prev) => ({
                                    ...prev,
                                    igf_project_title: value,
                                    igf_project_code: pData.project_no || prev.igf_project_code,
                                    igf_department_centre_section: pData.implementation_department || prev.igf_department_centre_section,
                                }));
                            }
                        } catch (err) {
                            console.warn("Could not fetch project details:", err);
                        }
                    }
                    return;
                }
            } catch (error) {
                console.error(`Error handling field change for ${fieldname}:`, error);
            }
        },
        [handleChange, fetchUserDetails, fetchProjectDetails],
    );

    const handleTableRowChange = useCallback(
        (tableName: string, rowIndex: number, fieldname: string, value: any) => {
            setFormData((prev) => {
                const tableData = [...(prev[tableName] || [])];
                if (tableData[rowIndex]) {
                    tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: value };

                    // Auto-calculate estimated_cost for items table
                    if (tableName === "igf_items" && ["quantity", "estimated_rate"].includes(fieldname)) {
                        const qty = parseFloat(tableData[rowIndex].quantity || 0);
                        const rate = parseFloat(tableData[rowIndex].estimated_rate || 0);
                        tableData[rowIndex].estimated_cost = qty * rate;
                    }
                }

                const next = { ...prev, [tableName]: tableData };

                // Recalculate total estimate
                if (tableName === "igf_items") {
                    next.igf_total_estimate = tableData.reduce(
                        (sum: number, row: any) => sum + (parseFloat(row.estimated_cost) || 0),
                        0,
                    );
                }

                return next;
            });
        },
        [],
    );

    const handleTableFileChange = useCallback(
        (tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
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
            setFormData((prev) => {
                const updated = (prev[tableName] || []).filter(
                    (_: any, idx: number) => idx !== rowIndex,
                );
                const next = { ...prev, [tableName]: updated };

                if (tableName === "igf_items") {
                    next.igf_total_estimate = updated.reduce(
                        (sum: number, row: any) => sum + (parseFloat(row.estimated_cost) || 0),
                        0,
                    );
                }

                return next;
            });
        },
        [],
    );

    // --- SAVE ---
    const effectiveDocName = editDocName || savedDocName;

    const handleSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);
            if (effectiveDocName) {
                data.name = effectiveDocName;
            }

            const res = await saveForm({ data: JSON.stringify(data) });

            if (res?.message?.status === "success") {
                setIsSaved(true);
                const newDocName = res.message.docname || effectiveDocName;
                if (newDocName) {
                    setSavedDocName(newDocName);
                    if (!effectiveDocName) {
                        navigate(`/general-indent/${newDocName}`, { replace: true });
                    }
                }
                setWorkflowState("Draft");
                alert(effectiveDocName ? "General Indent updated successfully!" : "Draft saved successfully!");

                // Refresh workflow actions
                if (newDocName) {
                    getActionsCall({ docname: newDocName })
                        .then((r) => setAvailableActions(r?.message || []))
                        .catch(() => {});
                }
            } else {
                throw new Error(res?.message?.message || "Save failed");
            }
        } catch (err: any) {
            console.error("Save error:", err);
            alert(`Save failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- WORKFLOW ACTION ---
    const handleWorkflowAction = async (action: string) => {
        const docNameToUse = effectiveDocName;
        if (!docNameToUse) {
            alert("Please save the document first.");
            return;
        }

        setIsActionLoading(true);
        try {
            // Save first if in draft
            if (workflowState === "Draft") {
                const data = await prepareFormDataForApi(formData);
                data.name = docNameToUse;
                const saveRes = await saveForm({ data: JSON.stringify(data) });
                if (saveRes?.message?.status !== "success") {
                    throw new Error(saveRes?.message?.message || "Save failed before workflow action");
                }
            }

            const res = await performActionCall({ docname: docNameToUse, action });

            if (res?.message?.status === "success") {
                alert(`Action "${action}" completed successfully`);
                setWorkflowState(res.message.workflow_state || workflowState);
                setAvailableActions(res.message.next_actions || []);

                // Refresh document data
                const updatedDoc = await fetchExistingDoc({
                    doctype: DOCTYPE,
                    name: docNameToUse,
                });
                if (updatedDoc?.message) {
                    setFormData(updatedDoc.message);
                    setDocStatus(updatedDoc.message.docstatus || 0);
                }
            } else {
                throw new Error(res?.message?.message || `Action "${action}" failed`);
            }
        } catch (err: any) {
            console.error(`Workflow Action ${action} Error:`, err);
            alert(`Action failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    // --- RENDER ---
    const isReadOnly = docStatus === 1 || (workflowState !== "Draft" && workflowState !== "Pending");
    const isSubmitted = docStatus === 1;

    if (loading) {
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
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-serif font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                            General Indent Form
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
                    {/* Form Card */}
                    <FrappeCard>
                        <div className="border-b border-zinc-100 dark:border-zinc-800 px-8 py-4 flex items-center gap-3">
                            <div className="w-1 h-5 bg-[#D97757] rounded-full" />
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                                General Indent Form
                            </h2>
                        </div>
                        <div className="p-8">
                            <DynamicFormRenderer
                                fields={fields}
                                formData={formData}
                                linkOptions={linkOptions}
                                onChange={handleChange}
                                onFileChange={handleFileChange}
                                onTableRowChange={handleTableRowChange}
                                onTableFileChange={handleTableFileChange}
                                onAddTableRow={handleAddTableRow}
                                onDeleteTableRow={handleDeleteTableRow}
                                onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
                                readOnly={isReadOnly}
                            />
                        </div>
                    </FrappeCard>

                    {/* Action Bar */}
                    {!isSubmitted && (
                        <FrappeCard>
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 p-6 flex items-center justify-between">
                                <div className="text-sm text-zinc-500">
                                    {(editDocName || savedDocName) &&
                                        `Document: ${editDocName || savedDocName}`}
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

                                            {availableActions.length > 0 ? (
                                                availableActions.map((action) => (
                                                    <FrappeButton
                                                        key={action}
                                                        onClick={() => handleWorkflowAction(action)}
                                                        disabled={isSubmitting || isActionLoading || !isSaved}
                                                        className="bg-[#D97757] hover:opacity-90 text-white shadow-sm"
                                                    >
                                                        {isActionLoading ? (
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <Send className="w-4 h-4 mr-2" />
                                                        )}
                                                        {action}
                                                    </FrappeButton>
                                                ))
                                            ) : (
                                                <FrappeButton
                                                    onClick={() => handleWorkflowAction("Submit")}
                                                    disabled={isSubmitting || isActionLoading || !isSaved}
                                                    className="bg-[#D97757] hover:opacity-90 text-white shadow-sm"
                                                >
                                                    {isActionLoading ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    )}
                                                    Submit
                                                </FrappeButton>
                                            )}
                                        </>
                                    ) : (
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
                    )}
                </div>
            </main>
        </div>
    );
};

export default GeneralIndentForm;
