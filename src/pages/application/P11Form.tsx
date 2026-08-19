import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { AlertCircle, Printer, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import ViewProjectButton from '@/components/ViewProjectButton';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { p11FormAPI, prepareFormDataForApi } from '@/services/apiService';
import { useFrappeClientScript } from '@/hooks/useFrappeClientScript';
import { generateP11Html } from '@/utils/p11Print';
import { P11PrintModal } from '@/components/P11PrintModal';
import { CommentModal } from '@/components/CommentModal';
import { ErrorModal } from "../../components/ErrorModal";
import { parseFrappeError } from "../../utils/errorUtils";

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        client_scripts?: { script: string }[];
    };
}

interface DirectPurchaseItemRow {
    itemname?: string;
    itemdesciption?: string;
    quantity?: number | string;
    estimatedprice?: number | string;
}

const toNumberOrDefault = (value: number | string | undefined, defaultValue: number) => {
    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : defaultValue;
};

const calculateP11RowTotal = (row: Record<string, any>) => {
    const quantity = toNumberOrDefault(row.item_quantity, 0);
    const unitPrice = toNumberOrDefault(row.item_unit_price, 0);
    const discount = toNumberOrDefault(row.item_discount, 0);
    const gst = toNumberOrDefault(row.item_gst, 0);

    return (quantity * unitPrice) - discount + gst;
};

const createChildRowName = () => `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const ensureP11ItemRowMeta = (row: Record<string, any>) => ({
    ...row,
    doctype: row.doctype || 'p_11_item_table',
    name: row.name || createChildRowName(),
});

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
const P11Form: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectName = searchParams.get('project') || '';
    const editDocName = searchParams.get('edit') || '';
    const projectNo = searchParams.get('project_no') || '';
    const appId = searchParams.get('app_id') || '';
    const viewOnly = searchParams.get('view') === 'true';

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [savedDocName, setSavedDocName] = useState<string | null>(editDocName || null);
    const [savePopup, setSavePopup] = useState(false);
    const [clientScript, setClientScript] = useState('');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const initializedTableSignatureRef = useRef('');

    // Workflow state
    const [workflowActions, setWorkflowActions] = useState<string[]>([]);
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [pendingWorkflowAction, setPendingWorkflowAction] = useState<string>('');
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });

    const { triggerEvent } = useFrappeClientScript(clientScript, formData, setFormData);

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(p11FormAPI.getFields);
    const { call: saveForm, error: saveError } = useFrappePostCall(p11FormAPI.save);
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');

    const { call: performAction } = useFrappePostCall(p11FormAPI.performAction);
    const { call: fetchWorkflowActions } = useFrappePostCall<{ message: string[] }>(p11FormAPI.getWorkflowActions);
    const { call: addActionComment } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );

    const refreshWorkflowActions = () => {
        if (!savedDocName) {
            return;
        }
        fetchWorkflowActions({ docname: savedDocName })
            .then((res) => {
                const list = Array.isArray(res?.message) ? res.message : [];
                setWorkflowActions(list);
            })
            .catch((err) => {
                setWorkflowActions([]);
            });
    };

    // Fetch available workflow actions for the current document/user whenever we're
    // looking at an existing (already-saved) P-11 Form, in view mode or otherwise.
    useEffect(() => {
        refreshWorkflowActions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedDocName]);

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
                const { fields: apiFields, prefill_data, link_options, client_scripts } = formDataResult.message;
                setFields(apiFields || []);
                setLinkOptions(link_options || {});

                if (client_scripts && Array.isArray(client_scripts)) {
                    setClientScript(client_scripts.map((clientScriptItem) => clientScriptItem.script).join('\n\n'));
                }

                let initialData = { ...prefill_data };

                // If editing, fetch existing document data
                if (editDocName) {
                    try {
                        const existingDoc = await fetchExistingDoc({
                            doctype: 'P_11 Form',
                            name: editDocName
                        });

                        if (existingDoc?.message) {
                            initialData = { ...initialData, ...existingDoc.message };
                        }
                    } catch (err) {
                    }
                }

                if (appId && !editDocName) {
                    try {
                        const directPurchase = await fetchExistingDoc({
                            doctype: 'Direct Purchase',
                            name: appId
                        });

                        const directPurchaseItems = Array.isArray(directPurchase?.message?.table_gdxp)
                            ? directPurchase.message.table_gdxp
                            : [];

                        initialData.table_hsrb = directPurchaseItems.map((row: DirectPurchaseItemRow) => ensureP11ItemRowMeta({
                            item_name: row.itemname || '',
                            item_description: row.itemdesciption || '',
                            item_quantity: toNumberOrDefault(row.quantity, 0),
                            item_unit_price: toNumberOrDefault(row.estimatedprice, 0),
                            item_make: '',
                            item_model: '',
                            item_discount: 0,
                            item_gst: 0,
                        }));
                    } catch (err) {
                    }
                }

                // Set defaults for any missing fields
                (apiFields || []).forEach((field: FormField) => {
                    if (initialData[field.fieldname] === undefined && field.default !== undefined) {
                        initialData[field.fieldname] = field.default;
                    }
                });

                // Prefill project_no and app_id if provided in URL
                if (projectNo && !initialData.project_no) {
                    initialData.project_no = projectNo;
                }
                if (appId && !initialData.app_id) {
                    initialData.app_id = appId;
                }

                if (Array.isArray(initialData.table_hsrb)) {
                    initialData.table_hsrb = initialData.table_hsrb.map((row: Record<string, any>) => ensureP11ItemRowMeta(row));
                }

                setFormData(initialData);
                setDataLoaded(true);
                setLoading(false);
            }
            if (formDataError) {
                alert("Error: Could not load the P_11 Form.");
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, editDocName, fetchExistingDoc, dataLoaded, appId, projectNo]);

    useEffect(() => {
        if (dataLoaded && clientScript) {
            const tableRows = formData.table_hsrb || [];
            const tableSignature = tableRows.map((row: Record<string, any>) => row.name || row.id || '').join('|');

            if (initializedTableSignatureRef.current === tableSignature) {
                return;
            }

            initializedTableSignatureRef.current = tableSignature;

            tableRows.forEach((row: Record<string, any>) => {
                if (row.doctype && row.name) {
                    triggerEvent('item_quantity', row.doctype, row.name);
                }
            });
            triggerEvent('refresh');
        }
    }, [clientScript, dataLoaded, formData.table_hsrb, triggerEvent]);

    useEffect(() => {
        const rows = Array.isArray(formData.table_hsrb) ? formData.table_hsrb : [];
        const normalizedRows = rows.map((row: Record<string, any>) => {
            const nextTotal = calculateP11RowTotal(row);
            const currentTotal = toNumberOrDefault(row.dp_total_price, 0);

            if (currentTotal === nextTotal) {
                return row;
            }

            return {
                ...row,
                dp_total_price: nextTotal,
            };
        });

        const totalBasicValue = normalizedRows.reduce(
            (sum: number, row: Record<string, any>) => sum + toNumberOrDefault(row.dp_total_price, 0),
            0
        );

        const grandTotal =
            totalBasicValue
            + toNumberOrDefault(formData.packing_and_forwarding, 0)
            + toNumberOrDefault(formData.freight, 0)
            + toNumberOrDefault(formData.other_charges, 0);

        const rowsChanged = normalizedRows.some((row: Record<string, any>, index: number) => row !== rows[index]);
        const totalBasicValueChanged = toNumberOrDefault(formData.total_basic_value, 0) !== totalBasicValue;
        const grandTotalChanged = toNumberOrDefault(formData.grand_total, 0) !== grandTotal;

        if (!rowsChanged && !totalBasicValueChanged && !grandTotalChanged) {
            return;
        }

        setFormData((prev) => ({
            ...prev,
            table_hsrb: rowsChanged ? normalizedRows : prev.table_hsrb,
            total_basic_value: totalBasicValue,
            grand_total: grandTotal,
        }));
    }, [
        formData.table_hsrb,
        formData.packing_and_forwarding,
        formData.freight,
        formData.other_charges,
        formData.total_basic_value,
        formData.grand_total,
    ]);

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

            // Re-calculate totals if needed here, depending on table modifications permitted in P_11
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
        const nextRow = tableName === 'table_hsrb' ? ensureP11ItemRowMeta(newRow) : newRow;
        setFormData(prev => ({
            ...prev,
            [tableName]: [...(prev[tableName] || []), nextRow]
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
            const res = await saveForm({ data: JSON.stringify(data) });

            if (res?.message?.status === 'success') {
                const docname = res.message.docname || editDocName;
                setSavedDocName(docname);

                if (editDocName) {
                    // If editing existing doc: show popup then navigate to direct-purchase p11 tab
                    setSavePopup(true);
                    const targetAppId = appId || formData.app_id;
                    if (targetAppId) {
                        setTimeout(() => {
                            setSavePopup(false);
                            navigate(`/direct-purchase/${targetAppId}?tab=p11`);
                        }, 2500);
                    } else {
                        setTimeout(() => { setSavePopup(false); navigate(-1); }, 2500);
                    }
                } else {
                    // If creating new, show popup then go to direct-purchase p11 tab for submission
                    setSavePopup(true);
                    const targetAppId = appId || formData.app_id;
                    if (targetAppId) {
                        setTimeout(() => {
                            setSavePopup(false);
                            navigate(`/direct-purchase/${targetAppId}?tab=p11`);
                        }, 2500);
                    } else {
                        setTimeout(() => {
                            setSavePopup(false);
                            navigate(`/p11-form/${docname}`);
                        }, 2500);
                    }
                }
            } else {
                throw new Error(res?.message?.message || "Save failed");
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "Save Failed", message: parseFrappeError(saveError, err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWorkflowAction = (action: string) => {
        if (isSubmitting || !savedDocName) return;
        setPendingWorkflowAction(action);
        setCommentModalOpen(true);
    };

    const handleConfirmWorkflowAction = async (comment: string) => {
        setCommentModalOpen(false);
        const action = pendingWorkflowAction;
        if (!action || !savedDocName) return;

        setIsSubmitting(true);
        try {
            // Only force a save first when the form is actually editable — in view mode
            // (e.g. a reviewer performing Verify/Approve) there's nothing new to persist,
            // and doing so risks a permission error since the viewer may not own the doc.
            if (!viewOnly) {
                const data = await prepareFormDataForApi(formData);
                const saveRes = await saveForm({ data: JSON.stringify(data) });

                if (saveRes?.message?.status !== 'success') {
                    throw new Error("Failed to save draft before processing action.");
                }
            }

            const res = await performAction({
                docname: savedDocName,
                action: action,
                comment: comment.trim() || undefined,
            });

            if (res?.message?.status === 'success') {
                if (comment.trim()) {
                    try {
                        await addActionComment({ doctype: 'P_11 Form', docname: savedDocName, content: comment.trim() });
                    } catch (e) {
                    }
                }
                alert(`Action '${action}' completed successfully!`);
                refreshWorkflowActions();
            } else {
                throw new Error(res?.message?.message || `Failed to perform action '${action}'.`);
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "Action Failed", message: parseFrappeError(err) });
        } finally {
            setIsSubmitting(false);
            setPendingWorkflowAction('');
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

            {/* Save Success Popup */}
            {savePopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl px-8 py-8 max-w-sm w-full mx-4 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                            <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 text-center">
                            Draft Saved Successfully!
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                            Redirecting you to the P-11 submission page…
                        </p>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full animate-[progress_2.5s_linear_forwards]" style={{ width: '0%', animation: 'none', transition: 'width 2.5s linear' }} ref={(el) => { if (el) { requestAnimationFrame(() => { el.style.width = '100%'; }); } }} />
                        </div>
                    </div>
                </div>
            )}
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={editDocName ? `P-11 Form: ${editDocName}` : 'P-11 Form'}
                    projectName={projectName}
                    status={formData.workflow_status}
                >
                    <div className="flex items-center gap-2 flex-wrap">
                        {editDocName && (
                            <ViewProjectButton doctype="P_11 Form" data={formData} />
                        )}
                        {viewOnly && editDocName && formData.docstatus !== 1 && (
                            <button
                                onClick={() => navigate(`/p11-form?edit=${editDocName}`)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 shrink-0"
                            >
                                Edit
                            </button>
                        )}
                        {(viewOnly || editDocName) && (
                            <button
                                onClick={() => setIsPrintModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 shrink-0"
                            >
                                <Printer className="w-4 h-4" /> Print / PDF
                            </button>
                        )}
                    </div>
                </PageHeader>

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
                                readOnly={viewOnly || formData.docstatus === 1}
                            />
                        </FrappeCard>

                        <div className="mt-8 flex flex-wrap justify-end gap-4">
                            {!viewOnly && formData.docstatus !== 1 && (
                                <FrappeButton
                                    onClick={handleSave}
                                    disabled={isSubmitting}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-800/50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Draft'}
                                </FrappeButton>
                            )}

                            {/* "Submit" gets a dedicated, prominent button — filtered out of the
                                generic workflow action list below to avoid showing it twice. */}
                            {!viewOnly && editDocName && workflowActions.includes('Submit') && (
                                <FrappeButton
                                    onClick={() => handleWorkflowAction('Submit')}
                                    disabled={isSubmitting}
                                    className="bg-[#D97757] text-white hover:bg-[#c66a4e]"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                </FrappeButton>
                            )}

                            {/* Workflow Action Buttons */}
                            {editDocName &&
                                workflowActions
                                    .filter((action) => action !== 'Submit')
                                    .map((action, idx) => {
                                        const isRejectAction = action.toLowerCase().includes('reject');
                                        const isPutBackAction = action.toLowerCase().includes('put back');

                                        let buttonClass = "bg-[#D97757] text-white hover:bg-[#c66a4e]"; // Default to orange

                                        if (isRejectAction) {
                                            buttonClass = "bg-red-600 text-white hover:bg-red-700";
                                        } else if (isPutBackAction) {
                                            buttonClass = "bg-amber-600 text-white hover:bg-amber-700";
                                        } else if (action.toLowerCase().includes('approve')) {
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
                                    })}
                        </div>
                    </div>
                </div>
            </main>
            <P11PrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                htmlContent={isPrintModalOpen ? generateP11Html(formData) : ''}
                docName={editDocName || formData.name || ''}
            />
            <CommentModal
                isOpen={commentModalOpen}
                onClose={() => { setCommentModalOpen(false); setPendingWorkflowAction(''); }}
                onSubmit={handleConfirmWorkflowAction}
                action={pendingWorkflowAction}
                isLoading={isSubmitting}
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

export default P11Form;
