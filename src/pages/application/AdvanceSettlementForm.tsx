import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { AlertCircle, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { advanceSettlementAPI, prepareFormDataForApi } from '@/services/apiService';
import { ErrorModal } from '../../components/ErrorModal';
import { parseFrappeError } from '../../utils/errorUtils';

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
            "rounded-lg px-4 py-2 font-medium transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-zinc-100 dark:focus:ring-zinc-700",
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
    const [budgetHeads, setBudgetHeads] = useState<{ label: string; value: string }[]>([]);
    const [savedDocName, setSavedDocName] = useState<string>(editDocName || '');
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });

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
                alert("Error: Could not load the Advance Settlement form.");
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, editDocName, fetchExistingDoc, projectName, advanceId, fetchTemporaryAdvance, dataLoaded]);

    // --- FETCH BUDGET HEADS ---
    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                // Fetch all budget heads to populate the Account Head field
                const response = await fetch('/api/resource/Budget%20Head?fields=["budget_head","name"]&limit_page_length=0');
                if (response.ok) {
                    const result = await response.json();
                    if (result.data) {
                        const heads = result.data.map((item: any) => ({
                            label: item.budget_head,
                            value: item.name // ID is usually the name/key in Frappe
                        }));
                        setBudgetHeads(heads);
                    }
                }
            } catch (error) {
            }
        };

        fetchBudgetHeads();
    }, []);

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

    // Use editDocName from URL or savedDocName from a previous save
    const effectiveDocName = editDocName || savedDocName;

    const handleSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);
            let res;

            if (effectiveDocName) {
                // Update existing document
                data.name = effectiveDocName;
                res = await saveForm({ doc_data: JSON.stringify(data) });
            } else {
                // Create new document
                res = await saveForm({ doc_data: JSON.stringify(data) });
            }

            if (res?.message?.status === 'success') {
                const newDocName = res.message.docname || effectiveDocName;
                if (newDocName) setSavedDocName(newDocName);
                alert(effectiveDocName ? `Advance Settlement updated successfully: ${newDocName}` : `Draft saved successfully: ${newDocName}`);
            } else {
                throw new Error(res?.message?.message || "Save failed");
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "Save Failed", message: parseFrappeError(saveError, err) });
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
            const data = await prepareFormDataForApi(formData);
            let docname = effectiveDocName;

            if (docname) {
                // Update existing document first
                data.name = docname;
                const saveRes = await saveForm({ doc_data: JSON.stringify(data) });
                if (saveRes?.message?.status !== 'success') {
                    throw new Error(saveRes?.message?.message || "Save failed during submission");
                }
                docname = saveRes.message.docname || docname;
            } else {
                // Create new document
                const saveRes = await saveForm({ doc_data: JSON.stringify(data) });
                if (saveRes?.message?.status !== 'success') {
                    throw new Error(saveRes?.message?.message || "Save failed during submission");
                }
                docname = saveRes.message.docname;
            }

            if (docname) setSavedDocName(docname);

            // Submit the document
            const submitRes = await submitForm({ docname });

            if (submitRes && (submitRes.message?.status === 'success' || submitRes.message)) {
                alert("Advance Settlement submitted successfully!");
                navigate(-1);
            } else {
                throw new Error(submitRes?.message?.message || "Submission failed (no success response)");
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(submitError, err) });
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

            // Override Account Head to be a Select with fetched options
            // Override Account Head to be a Link with fetched options (to support ID value vs Label display)
            if (f.fieldname === 'account_head') {
                f.fieldtype = 'Link'; // Use Link type so DynamicFormRenderer uses linkOptions
            }

            return f;
        });
    }, [fields, formData, budgetHeads]);

    // Auto-select if only one budget head is available or if we want to default to something
    useEffect(() => {
        if (budgetHeads.length === 1 && !formData.account_head) {
            handleChange('account_head', budgetHeads[0].value);
        }
    }, [budgetHeads, formData.account_head, handleChange]);

    // Inject our fetched budget heads into linkOptions for 'account_head'
    const combinedLinkOptions = useMemo(() => {
        const opts = { ...linkOptions };
        if (budgetHeads.length > 0) {
            opts['account_head'] = budgetHeads;
        }
        return opts;
    }, [linkOptions, budgetHeads]);

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

    // Format currency for display
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={editDocName ? `Edit Advance Settlement: ${editDocName}` : 'Advance Settlement'}
                    projectName={formData.project_name}
                    projectNumber={formData.project_code}
                >
                    {advanceId && (
                        <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-md text-sm border border-zinc-200 dark:border-zinc-700">
                            <span className="text-zinc-500 dark:text-zinc-400 mr-2">Settling Advance:</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{advanceId}</span>
                        </div>
                    )}
                </PageHeader>

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
                                    linkOptions={combinedLinkOptions}
                                    onChange={handleChange}
                                    onFileChange={handleFileChange}
                                    onTableRowChange={handleTableRowChange}
                                    onTableFileChange={handleTableFileChange}
                                    onAddTableRow={addTableRow}
                                    onDeleteTableRow={deleteTableRow}
                                    onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
                                    readOnly={formData.docstatus === 1}
                                />
                            </FrappeCard>

                            {(!effectiveDocName || formData.docstatus === 0) && (
                                <div className="mt-8 flex justify-end gap-4">
                                    <FrappeButton
                                        onClick={handleSave}
                                        disabled={isSubmitting}
                                        className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700/50"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Draft'}
                                    </FrappeButton>
                                    <FrappeButton
                                        type="submit"
                                        disabled={isSubmitting || !savedDocName}
                                        className="bg-[#D97757] text-white hover:opacity-90 dark:bg-[#D97757] dark:text-white"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Settlement'}
                                    </FrappeButton>
                                </div>
                            )}
                        </div>

                        {/* Summary Sidebar - 1 column */}
                        <div className="lg:col-span-1">
                            <div className="bg-gradient-to-br from-[#FDF3F0] to-zinc-50 dark:from-zinc-900 dark:to-zinc-900 p-6 rounded-xl border border-[#D97757]/20 sticky top-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-[#D97757] rounded-lg">
                                        <Wallet className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Settlement Summary</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-4 rounded-lg border border-[#D97757]/20">
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Advance Amount</p>
                                        <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(formData.amount || 0)}</p>
                                    </div>

                                    <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-4 rounded-lg border border-[#D97757]/20">
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Total Expenditure</p>
                                        <p className="text-xl font-bold text-[#D97757]">{formatCurrency(totalAmount)}</p>
                                    </div>

                                    <div className="pt-4 border-t border-[#D97757]/20">
                                        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-4 rounded-lg border border-[#D97757]/20">
                                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Balance</p>
                                            <p className={cn(
                                                "text-xl font-bold",
                                                (formData.amount || 0) - totalAmount >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                                            )}>
                                                {formatCurrency((formData.amount || 0) - totalAmount)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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

export default AdvanceSettlementForm;
