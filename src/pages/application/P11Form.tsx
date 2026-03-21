import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { AlertCircle, Printer } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { p11FormAPI, prepareFormDataForApi } from '@/services/apiService';
import { useFrappeClientScript } from '@/hooks/useFrappeClientScript';
import { generateP11Html } from '@/utils/p11Print';
import { P11PrintModal } from '@/components/P11PrintModal';

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
    const [clientScript, setClientScript] = useState('');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const initializedTableSignatureRef = useRef('');

    // Workflow state
    const [workflowActions, setWorkflowActions] = useState<string[]>([]);

    const { triggerEvent } = useFrappeClientScript(clientScript, formData, setFormData);

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(p11FormAPI.getFields);
    const { call: saveForm, error: saveError } = useFrappePostCall(p11FormAPI.save);
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');

    const { call: performAction } = useFrappePostCall(p11FormAPI.performAction);

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
                        console.error('Error fetching existing document:', err);
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
                        console.error('Error fetching Direct Purchase for P-11 prefill:', err);
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
                console.error("Failed to load form data:", formDataError);
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
                    // If editing, go back
                    alert("Form updated successfully!");
                    navigate(-1);
                } else {
                    // If creating new, redirect to edit mode to show submit button
                    alert("Draft saved successfully! You can now submit the form.");
                    navigate(`/p11-form/${docname}`);
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

        // Optional: Ask for a comment if the action is typically a rejection
        let comment = "";
        if (action.toLowerCase().includes('reject') || action.toLowerCase().includes('put back')) {
            const userComment = prompt(`Please provide a reason for '${action}':`);
            if (userComment === null) return; // Cancelled
            comment = userComment;
        }

        setIsSubmitting(true);
        try {
            // Force a save first to ensure latest data is processed
            const data = await prepareFormDataForApi(formData);
            const saveRes = await saveForm({ data: JSON.stringify(data) });

            if (saveRes?.message?.status !== 'success') {
                throw new Error("Failed to save draft before processing action.");
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
                <div className="flex items-center justify-between mb-2">
                    <PageHeader
                        title={editDocName ? `P-11 Form: ${editDocName}` : 'P-11 Form'}
                        projectName={projectName}
                    />
                    {(viewOnly || editDocName) && (
                        <button
                            onClick={() => setIsPrintModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 shrink-0"
                        >
                            <Printer className="w-4 h-4" /> Print / PDF
                        </button>
                    )}
                </div>

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
                            {!viewOnly && !editDocName && (
                                <FrappeButton
                                    onClick={handleSave}
                                    disabled={isSubmitting}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-800/50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Draft'}
                                </FrappeButton>
                            )}

                            {/* Workflow Action Buttons */}
                            {!viewOnly && editDocName && workflowActions.length > 0 ? (
                                workflowActions.map((action, idx) => {
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
                                })
                            ) : (
                                // For initial submission if required, though usually handled via saving a draft then workflow
                                !viewOnly && editDocName && workflowActions.length === 0 && (
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
            <P11PrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                htmlContent={isPrintModalOpen ? generateP11Html(formData) : ''}
                docName={editDocName || formData.name || ''}
            />
        </div>
    );
};

export default P11Form;
