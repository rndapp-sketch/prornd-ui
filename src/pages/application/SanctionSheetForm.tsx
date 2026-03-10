import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { sanctionSheetAPI, prepareFormDataForApi } from '@/services/apiService';

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
    };
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-zinc-900 p-4 md:p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm", className)}>
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

// --- MAIN COMPONENT ---
const SanctionSheetForm: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectName = searchParams.get('project') || '';
    const editDocName = searchParams.get('edit') || '';

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [savedDocName, setSavedDocName] = useState<string | null>(editDocName || null);

    // Workflow state
    const [workflowActions, setWorkflowActions] = useState<string[]>([]);

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(sanctionSheetAPI.getFields);
    const { call: saveForm, error: saveError } = useFrappePostCall(sanctionSheetAPI.save);
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');

    // Workflow Action API
    const { call: fetchWorkflowActions } = useFrappePostCall<{ message: string[] }>(sanctionSheetAPI.getWorkflowActions);
    const { call: performAction } = useFrappePostCall(sanctionSheetAPI.performAction);

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!dataLoaded) {
            fetchFormData({ doc_name: editDocName || null, project_name: projectName || null });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const loadFormAndDocument = async () => {
            if (formDataResult?.message && !dataLoaded) {
                const { fields: apiFields, prefill_data, link_options } = formDataResult.message;
                setFields(apiFields || []);
                setLinkOptions(link_options || {});

                let initialData = { ...prefill_data };

                // If editing, fetch existing document data
                if (editDocName) {
                    try {
                        const existingDoc = await fetchExistingDoc({
                            doctype: 'Sanction Sheet',
                            name: editDocName
                        });

                        if (existingDoc?.message) {
                            initialData = { ...initialData, ...existingDoc.message };
                        }

                        // Fetch workflow actions
                        const actionsRes = await fetchWorkflowActions({ docname: editDocName });
                        if (actionsRes?.message) {
                            setWorkflowActions(actionsRes.message);
                        }
                    } catch (err) {
                        console.error('Error fetching existing document or workflow actions:', err);
                        alert('Failed to load document for editing');
                    }
                }

                // Set defaults for any missing fields
                (apiFields || []).forEach((field: FormField) => {
                    if (initialData[field.fieldname] === undefined && field.default !== undefined) {
                        initialData[field.fieldname] = field.default;
                    }
                });

                setFormData(initialData);
                setDataLoaded(true);
                setLoading(false);
            }
            if (formDataError) {
                console.error("Failed to load form data:", formDataError);
                alert("Error: Could not load the Sanction Sheet.");
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, editDocName, fetchExistingDoc, fetchWorkflowActions, dataLoaded]);

    // --- EVENT HANDLERS ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [fieldname]: file }));
    }, []);

    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
        handleChange(fieldname, value);
    }, [handleChange]);

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

    // --- Workflows & Saving ---
    const handleSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);
            if (editDocName) {
                data.name = editDocName;
            }
            const res = await saveForm({ doc_data: JSON.stringify(data) });

            if (res?.message?.status === 'success') {
                const docname = res.message.docname || editDocName;
                setSavedDocName(docname);
                alert(editDocName ? "Sanction Sheet updated successfully!" : "Sanction Sheet draft saved successfully!");
                if (editDocName) {
                    navigate(-1);
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

    const handleWorkflowAction = async (action: string) => {
        if (isSubmitting || !savedDocName) return;

        let comment = "";
        if (action.toLowerCase().includes('reject') || action.toLowerCase().includes('put back')) {
            const userComment = prompt(`Please provide a reason for '${action}':`);
            if (userComment === null) return; // Cancelled
            comment = userComment;
        }

        setIsSubmitting(true);
        try {
            // Save first to push "Other Charges" to the document.
            const data = await prepareFormDataForApi(formData);
            const saveRes = await saveForm({ doc_data: JSON.stringify(data) });

            if (saveRes?.message?.status !== 'success') {
                throw new Error("Failed to save data before processing action.");
            }

            const res = await performAction({
                docname: savedDocName,
                action: action,
                comment: comment
            });

            if (res?.message?.status === 'success') {
                alert(`Action '${action}' completed successfully!`);
                navigate(-1);
            } else {
                throw new Error(res?.message?.message || `Failed to perform action '${action}'.`);
            }
        } catch (err: any) {
            console.error(err);
            alert(`Action failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Apply depends_on logic to filter visible fields ---
    const visibleFields = useMemo(() => {
        return fields.map(field => {
            const f = { ...field };
            if (f.depends_on) {
                const evalStr = String(f.depends_on).replace(/;$/, '');
                try {
                    const match = evalStr.match(/doc\.(\w+)\s*==\s*['"]([^'"]+)['"]/);
                    if (match) {
                        const [, fieldName, expectedValue] = match;
                        f.hidden = formData[fieldName] !== expectedValue ? 1 : 0;
                    }
                } catch {
                    f.hidden = 0;
                }
            }
            return f;
        });
    }, [fields, formData]);

    // --- RENDER LOGIC ---
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg dark:bg-zinc-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">Loading form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={editDocName ? `Sanction Sheet: ${editDocName}` : 'Sanction Sheet'}
                    projectName={projectName}
                />

                {validationErrors.length > 0 && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Please fix the following errors:
                        </h4>
                        <ul className="list-disc list-inside text-red-700 space-y-1">
                            {validationErrors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                    <div className="col-span-1">
                        <FrappeCard className="space-y-6">
                            <DynamicFormRenderer
                                fields={visibleFields}
                                formData={formData}
                                linkOptions={linkOptions}
                                onChange={handleChange}
                                onFileChange={handleFileChange}
                                onTableRowChange={handleTableRowChange}
                                onTableFileChange={handleTableFileChange}
                                onAddTableRow={addTableRow}
                                onDeleteTableRow={deleteTableRow}
                                onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
                            />
                        </FrappeCard>

                        <div className="mt-8 flex flex-wrap justify-end gap-4">
                            {!editDocName && (
                                <FrappeButton
                                    onClick={handleSave}
                                    disabled={isSubmitting}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-800/50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Data'}
                                </FrappeButton>
                            )}

                            {/* Workflow Action Buttons */}
                            {editDocName && workflowActions.length > 0 ? (
                                workflowActions.map((action, idx) => {
                                    const isRejectAction = action.toLowerCase().includes('reject');
                                    const isPutBackAction = action.toLowerCase().includes('put back');

                                    let buttonClass = "bg-[#D97757] text-white hover:bg-[#c66a4e]"; // Default to orange

                                    if (isRejectAction) {
                                        buttonClass = "bg-red-600 text-white hover:bg-red-700";
                                    } else if (isPutBackAction) {
                                        buttonClass = "bg-amber-600 text-white hover:bg-amber-700";
                                    } else if (action.toLowerCase().includes('approve') || action.toLowerCase().includes('print taken') || action.toLowerCase().includes('verified')) {
                                        buttonClass = "bg-emerald-600 text-white hover:bg-emerald-700";
                                    }

                                    return (
                                        <FrappeButton
                                            key={idx}
                                            onClick={() => handleWorkflowAction(action)}
                                            disabled={isSubmitting}
                                            className={buttonClass}
                                        >
                                            {action}
                                        </FrappeButton>
                                    );
                                })
                            ) : (
                                editDocName && workflowActions.length === 0 && (
                                    <FrappeButton
                                        onClick={handleSave}
                                        disabled={isSubmitting}
                                        className="bg-[#D97757] text-white hover:bg-[#c66a4e]"
                                    >
                                        Update Details
                                    </FrappeButton>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SanctionSheetForm;
