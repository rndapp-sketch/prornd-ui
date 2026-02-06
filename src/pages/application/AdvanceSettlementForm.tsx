import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, AlertCircle } from 'lucide-react';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { advanceSettlementAPI, prepareFormDataForApi } from '@/services/apiService';

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        child_table_meta?: Record<string, { doctype: string; fields: FormField[] }>;
    };
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white p-6 md:p-8 border border-gray-200 rounded-xl shadow-sm", className)}>
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
            "focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.18)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
        )}
    >
        {children}
    </button>
);

// --- MAIN COMPONENT ---
const AdvanceSettlementForm: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectName = searchParams.get('project') || '';
    const advanceId = searchParams.get('advance') || '';
    const editDocName = searchParams.get('edit') || '';

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(advanceSettlementAPI.getFields);
    const { call: saveForm, error: saveError } = useFrappePostCall(advanceSettlementAPI.save);
    const { call: submitForm, error: submitError } = useFrappePostCall(advanceSettlementAPI.submit);
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchTemporaryAdvance } = useFrappePostCall<{ message: any }>('frappe.client.get');

    // --- Computed: Total Amount from Expenditure Details ---
    const totalAmount = useMemo(() => {
        const expenditureDetails = formData.expenditure_details || [];
        let total = 0;
        for (const row of expenditureDetails) {
            const amount = parseFloat(row.amount_in_rs || 0);
            if (!isNaN(amount)) {
                total += amount;
            }
        }
        return total;
    }, [formData.expenditure_details]);

    // Update total_amount field when computed value changes
    useEffect(() => {
        if (formData.total_amount !== totalAmount) {
            setFormData(prev => ({ ...prev, total_amount: totalAmount }));
        }
    }, [totalAmount, formData.total_amount]);

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!dataLoaded) {
            fetchFormData({ doc_name: editDocName || null });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const loadFormAndDocument = async () => {
            if (formDataResult?.message && !dataLoaded) {
                const { fields: apiFields, prefill_data, link_options, child_table_meta } = formDataResult.message;

                // Merge child_table_meta into Table fields as child_fields
                const fieldsWithChildren = (apiFields || []).map((field: FormField) => {
                    if (field.fieldtype === 'Table' && field.fieldname && child_table_meta?.[field.fieldname]) {
                        // Map child fields to ensure label is never null (for ChildField type compatibility)
                        const childFields = child_table_meta[field.fieldname].fields.map((cf: any) => ({
                            ...cf,
                            label: cf.label || cf.fieldname || ''
                        }));
                        return {
                            ...field,
                            child_fields: childFields
                        };
                    }
                    return field;
                });

                setFields(fieldsWithChildren);
                setLinkOptions(link_options || {});

                let initialData = { ...prefill_data };

                // If editing, fetch existing document data
                if (editDocName) {
                    try {
                        const existingDoc = await fetchExistingDoc({
                            doctype: 'Advance Settlement',
                            name: editDocName
                        });

                        if (existingDoc?.message) {
                            initialData = { ...initialData, ...existingDoc.message };
                        }
                    } catch (err) {
                        console.error('Error fetching existing document:', err);
                        alert('Failed to load document for editing');
                    }
                }

                // If project is passed via URL
                if (projectName) {
                    if (!initialData.project_name) {
                        initialData.project_name = projectName;
                    }
                }

                // If temporary advance is passed via URL
                if (advanceId) {
                    if (!initialData.temporary_advance_application) {
                        initialData.temporary_advance_application = advanceId;
                        // Fetch related data from the advance
                        try {
                            const advanceDoc = await fetchTemporaryAdvance({
                                doctype: 'Temporary Advance',
                                name: advanceId
                            });
                            if (advanceDoc?.message) {
                                const adv = advanceDoc.message;
                                initialData.account_head = adv.account_head || '';
                                initialData.amount = adv.amount || 0;
                                initialData.bank_account_number = adv.bank_account_number || '';
                                initialData.bank_account_holders_name = adv.account || '';
                                initialData.project_name = adv.project_name || initialData.project_name;
                                initialData.project_code = adv.project_code || '';
                            }
                        } catch (err) {
                            console.error('Error fetching temporary advance:', err);
                        }
                    }
                }

                // Set defaults for any missing fields
                (apiFields || []).forEach((field: FormField) => {
                    if (initialData[field.fieldname] === undefined && field.default !== undefined) {
                        initialData[field.fieldname] = field.default;
                    }
                });

                // Initialize expenditure_details if not present
                if (!initialData.expenditure_details) {
                    initialData.expenditure_details = [];
                }

                setFormData(initialData);
                setDataLoaded(true);
                setLoading(false);
            }
            // Only show error if we haven't successfully loaded data yet
            if (formDataError && !formDataResult?.message && !dataLoaded) {
                console.error("Failed to load form data:", formDataError);
                alert("Error: Could not load the Advance Settlement form.");
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, editDocName, fetchExistingDoc, projectName, advanceId, fetchTemporaryAdvance, dataLoaded]);

    // --- CLIENT SCRIPT VALIDATION ---
    const validateForm = useCallback((): boolean => {
        const errors: string[] = [];

        // Validate declarations
        if (!formData.declare_1) {
            errors.push("You must confirm that you have enclosed the original cash memo/invoice.");
        }
        if (!formData.declare_2) {
            errors.push("You must confirm that you have mentioned stock entry details.");
        }
        if (!formData.declare_3) {
            errors.push("You must confirm that all purchases above Rs.1,000 have supporting quotations.");
        }

        // Check if total amount exceeds advance amount
        if (formData.amount && totalAmount > parseFloat(formData.amount)) {
            errors.push("Total expenditure amount cannot exceed the approved advance amount.");
        }

        setValidationErrors(errors);
        return errors.length === 0;
    }, [formData, totalAmount]);

    // --- EVENT HANDLERS ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [fieldname]: file }));
    }, []);

    // Handle field changes with side effects (e.g., fetching linked data)
    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
        handleChange(fieldname, value);

        // When temporary_advance_application is selected, fetch its data
        if (fieldname === 'temporary_advance_application' && value) {
            try {
                const advanceDoc = await fetchTemporaryAdvance({
                    doctype: 'Temporary Advance',
                    name: value
                });
                if (advanceDoc?.message) {
                    const adv = advanceDoc.message;
                    setFormData(prev => ({
                        ...prev,
                        [fieldname]: value,
                        account_head: adv.account_head || '',
                        amount: adv.amount || 0,
                        bank_account_number: adv.bank_account_number || '',
                        bank_account_holders_name: adv.account || '',
                        project_name: adv.project_name || prev.project_name,
                        project_code: adv.project_code || ''
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch temporary advance details:', err);
            }
        }
    }, [handleChange, fetchTemporaryAdvance]);

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
                alert(editDocName ? "Advance Settlement updated successfully!" : "Draft saved successfully!");
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Validate before submit
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Save first
            const data = await prepareFormDataForApi(formData);
            const saveRes = await saveForm({ doc_data: JSON.stringify(data) });

            if (saveRes?.message?.status !== 'success') {
                throw new Error(saveRes?.message?.message || "Save failed during submission");
            }

            const docname = saveRes.message.docname;

            // 2. Submit
            const submitRes = await submitForm({ docname });
            if (submitRes?.message?.status === 'success') {
                alert("Advance Settlement submitted successfully!");
                navigate(-1);
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

    // --- Apply depends_on logic to filter visible fields ---
    const visibleFields = useMemo(() => {
        return fields.map(field => {
            const f = { ...field };

            // Make total_amount read-only (as per client script)
            if (f.fieldname === 'total_amount') {
                f.read_only = 1;
            }

            // Handle depends_on conditions
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
            <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0EA5A4] border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-lg font-medium text-gray-700">Loading form...</p>
                </div>
            </div>
        );
    }

    // Format currency for display
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    return (
        <div className="bg-[#F0F4F8] min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-8 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeftIcon className="h-5 w-5 text-gray-900" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {editDocName ? `Edit Advance Settlement: ${editDocName}` : 'Advance Settlement'}
                            </h1>
                            <p className="text-gray-600 mt-1">
                                {advanceId ? (
                                    <span>Settling Advance: <strong>{advanceId}</strong></span>
                                ) : (
                                    'Fill out the details to settle your temporary advance.'
                                )}
                            </p>
                        </div>
                    </div>
                </header>

                {/* Validation Errors */}
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

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Main Form - 3 columns */}
                        <div className="lg:col-span-3">
                            <FrappeCard className="space-y-8">
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

                            <div className="mt-8 flex justify-end gap-4">
                                <FrappeButton
                                    onClick={handleSave}
                                    disabled={isSubmitting}
                                    className="bg-white border border-gray-200 text-gray-900 hover:bg-gray-50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Draft'}
                                </FrappeButton>
                                <FrappeButton
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-[#0EA5A4] text-white hover:bg-[#0D9494]"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Settlement'}
                                </FrappeButton>
                            </div>
                        </div>

                        {/* Summary Sidebar - 1 column */}
                        <div className="lg:col-span-1">
                            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-100 sticky top-6">
                                <h3 className="font-bold text-gray-900 mb-4">Settlement Summary</h3>
                                <div className="space-y-4">
                                    <div className="bg-white/80 backdrop-blur p-4 rounded-lg border border-teal-100">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Advance Amount</p>
                                        <p className="text-xl font-bold text-gray-900">{formatCurrency(formData.amount || 0)}</p>
                                    </div>
                                    <div className="bg-white/80 backdrop-blur p-4 rounded-lg border border-teal-100">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Expenditure</p>
                                        <p className="text-xl font-bold text-teal-600">{formatCurrency(totalAmount)}</p>
                                    </div>
                                    <div className="bg-white/80 backdrop-blur p-4 rounded-lg border border-teal-100">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Balance</p>
                                        <p className={cn(
                                            "text-xl font-bold",
                                            (formData.amount || 0) - totalAmount >= 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                            {formatCurrency((formData.amount || 0) - totalAmount)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default AdvanceSettlementForm;
