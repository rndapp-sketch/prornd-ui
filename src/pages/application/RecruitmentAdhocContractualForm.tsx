import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { DynamicFormRenderer, type FormField } from '@/components/forms/DynamicFormRenderer';
import { recruitmentAdhocContractualAPI, prepareFormDataForApi, commonAPI } from '@/services/apiService';
import { Loader2, ArrowLeft, Save, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// --- FRAAPPE UI WRAPPERS ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FrappeCard = ({ children, className }: any) => (
    <Card className={cn("border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] shadow-sm rounded-xl overflow-hidden", className)}>
        <CardContent className="p-0">
            {children}
        </CardContent>
    </Card>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FrappeButton = ({ children, className, variant = 'primary', ...props }: any) => (
    <Button
        variant={variant === 'primary' ? 'default' : variant === 'ghost' ? 'ghost' : 'outline'}
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
    const editDocName = id || searchParams.get('edit');
    const projectParam = searchParams.get('project');
    const projectNoParam = searchParams.get('projectNo'); // Often used as well for the filter
    const { currentUser } = useFrappeAuth();

    // Core States
    const [fields, setFields] = useState<FormField[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [formData, setFormData] = useState<Record<string, any>>({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [linkOptions, setLinkOptions] = useState<Record<string, any[]>>({});
    const [isLoadingFields, setIsLoadingFields] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(editDocName || null);

    // Workflow States
    const [workflowState, setWorkflowState] = useState<string>('Draft');
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // API Hooks
    const { call: getFieldsCall } = useFrappePostCall(recruitmentAdhocContractualAPI.getFields);
    const { call: saveCall } = useFrappePostCall(recruitmentAdhocContractualAPI.save);
    const { call: getActionsCall } = useFrappePostCall(recruitmentAdhocContractualAPI.getWorkflowActions);
    const { call: performActionCall } = useFrappePostCall(recruitmentAdhocContractualAPI.performAction);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { call: fetchUserDetails } = useFrappePostCall<{ message: any }>(commonAPI.getUserDetailsByEmail);

    // --- DATA FETCHING ---
    const fetchFormConfiguration = useCallback(async () => {
        setIsLoadingFields(true);
        try {
            const currentDocName = editDocName || savedDocName;
            console.log("Fetching config for:", currentDocName ? `Doc: ${currentDocName}` : "New Document");

            const response = await getFieldsCall({ doc_name: currentDocName });
            if (response && response.message) {
                const { fields: fetchedFields, prefill_data, link_options } = response.message;
                setFields(fetchedFields || []);
                setLinkOptions(link_options || {});

                // Initialize Form Data
                if (currentDocName && prefill_data) {
                    setFormData(prefill_data);
                    setWorkflowState(prefill_data.workflow_state || 'Draft');
                } else if (!currentDocName) {
                    // Pre-fill fields for a new form
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const initialData: Record<string, any> = { ...prefill_data };

                    // Fetch current user details if missing
                    if (currentUser && !initialData.applicant_name) {
                        try {
                            const userDetailsResponse = await fetchUserDetails({ email: currentUser });
                            if (userDetailsResponse && userDetailsResponse.message) {
                                initialData.applicant_name = userDetailsResponse.message.full_name;
                                initialData.department = userDetailsResponse.message.department;
                            }
                        } catch (e) {
                            console.error("Failed to get user details", e);
                        }
                    }

                    // Attempt to prefill project if passed via URL
                    if (projectParam && !initialData.project_code) {
                        initialData.project_code = projectParam;
                    } else if (projectNoParam && !initialData.project_code) {
                        initialData.project_code = projectNoParam;
                    }

                    setFormData(initialData);
                    setWorkflowState('Draft');
                }
            }
        } catch (error) {
            console.error('Error fetching form details:', error);
            alert("Failed to load form schema");
        } finally {
            setIsLoadingFields(false);
        }
    }, [editDocName, savedDocName, getFieldsCall, currentUser, fetchUserDetails, projectParam, projectNoParam]);

    const fetchWorkflowActions = useCallback(async (docName: string) => {
        try {
            const response = await getActionsCall({ docname: docName });
            if (response && response.message) {
                setAvailableActions(response.message);
            }
        } catch (error) {
            console.error("Failed to fetch workflow actions:", error);
            setAvailableActions([]);
        }
    }, [getActionsCall]);

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
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [fieldname]: file }));
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const tableData = [...(prev[tableName] || [])];
            if (tableData[rowIndex]) {
                tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: value };
            }
            return { ...prev, [tableName]: tableData };
        });
    }, []);

    const handleTableFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
        setFormData(prev => {
            const tableData = [...(prev[tableName] || [])];
            if (tableData[rowIndex]) {
                tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: file };
            }
            return { ...prev, [tableName]: tableData };
        });
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddTableRow = useCallback((tableName: string, newRow: Record<string, any>) => {
        setFormData(prev => ({
            ...prev,
            [tableName]: [...(prev[tableName] || []), newRow]
        }));
    }, []);

    const handleDeleteTableRow = useCallback((tableName: string, rowIndex: number) => {
        setFormData(prev => ({
            ...prev,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [tableName]: (prev[tableName] || []).filter((_: any, idx: number) => idx !== rowIndex)
        }));
    }, []);


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

            if (response && response.message?.status === 'success') {
                const newDocName = response.message.docname;
                alert('Draft saved successfully');

                if (!savedDocName && !editDocName) {
                    setSavedDocName(newDocName);
                    navigate(`/recruitment-adhoc-contractual/${newDocName}`, { replace: true });
                }

                // Refresh config locally
                fetchFormConfiguration();
            } else {
                alert(response.message?.message || "Failed to save draft");
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Save error:", error);
            const errMsg = error.exc_type === "ValidationError"
                ? JSON.parse(error._server_messages || "[]").map((m: string) => JSON.parse(m).message).join(", ")
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
            if (workflowState === 'Draft' || action === 'Submit') {
                preparedData = await prepareFormDataForApi({
                    ...formData,
                    name: docNameToUse
                });
            }

            const response = await performActionCall({
                docname: docNameToUse,
                action: action,
                updated_data: preparedData
            });

            if (response && response.message && response.message.status === 'success') {
                alert(`Action "${action}" completed successfully`);
                setWorkflowState(response.message.workflow_state);
                fetchFormConfiguration();
                fetchWorkflowActions(docNameToUse);
            } else {
                alert(response.message?.message || `Failed to perform action ${action}`);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(`Workflow Action ${action} Error:`, error);
            alert(`An error occurred while performing action: ${action}`);
        } finally {
            setIsActionLoading(false);
        }
    };


    // --- RENDER HELPERS ---
    const isReadOnly = workflowState !== 'Draft' && workflowState !== 'Pending';

    if (isLoadingFields) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#D97757]" />
                <p className="text-zinc-500 font-medium">Loading form configuration...</p>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <main className="max-w-5xl mx-auto p-4 md:p-8 w-full overflow-hidden">
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
                                <span className={cn(
                                    "text-xs font-sans px-2.5 py-1 rounded-full border",
                                    workflowState === 'Approved' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50" :
                                        workflowState === 'Draft' ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700" :
                                            "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50"
                                )}>
                                    {workflowState}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            {editDocName || savedDocName ? `Application ID: ${editDocName || savedDocName}` : 'New Application'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Main Form Content */}
                    <div className="space-y-6">
                        <FrappeCard>
                            <div className="p-8">
                                <DynamicFormRenderer
                                    fields={fields}
                                    formData={formData}
                                    linkOptions={linkOptions}
                                    onChange={handleFieldChange}
                                    onFileChange={handleFileChange}
                                    onTableRowChange={handleTableRowChange}
                                    onTableFileChange={handleTableFileChange}
                                    onAddTableRow={handleAddTableRow}
                                    onDeleteTableRow={handleDeleteTableRow}
                                    readOnly={isReadOnly}
                                />
                            </div>

                            {/* Action Bar */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 p-6 flex items-center justify-between">
                                <div className="text-sm text-zinc-500">
                                    {(editDocName || savedDocName) && `Last updated: ${new Date().toLocaleTimeString()}`}
                                </div>
                                <div className="flex gap-3">
                                    {workflowState === 'Draft' ? (
                                        <>
                                            <FrappeButton
                                                variant="outline"
                                                onClick={handleSave}
                                                disabled={isSubmitting || isActionLoading}
                                                className="bg-white dark:bg-zinc-800 shadow-sm"
                                            >
                                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                                Save Draft
                                            </FrappeButton>

                                            {/* We rely on workflow actions for submission if available, otherwise fallback */}
                                            {availableActions.includes('Submit') ? (
                                                <FrappeButton
                                                    onClick={() => handleWorkflowAction('Submit')}
                                                    disabled={isSubmitting || isActionLoading}
                                                    className="bg-[#D97757] hover:opacity-90 text-white shadow-sm"
                                                >
                                                    {isActionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                                    Submit
                                                </FrappeButton>
                                            ) : (
                                                <FrappeButton
                                                    onClick={handleSave} // fallback to just save if no workflow submit configured yet manually
                                                    disabled={isSubmitting || isActionLoading || !(savedDocName || editDocName)}
                                                    className="bg-[#D97757] hover:opacity-90 text-white shadow-sm"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                                    Save & Continue
                                                </FrappeButton>
                                            )}
                                        </>
                                    ) : (
                                        /* Any Other Workflow Actions */
                                        availableActions.map(action => (
                                            <FrappeButton
                                                key={action}
                                                onClick={() => handleWorkflowAction(action)}
                                                disabled={isActionLoading}
                                                className={cn(
                                                    "shadow-sm",
                                                    action === 'Approve' ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
                                                        action === 'Reject' ? "bg-red-600 hover:bg-red-700 text-white" :
                                                            "bg-[#D97757] hover:opacity-90 text-white"
                                                )}
                                            >
                                                {isActionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
