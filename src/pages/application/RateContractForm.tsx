import React, { useState, useEffect, useCallback } from 'react';
import { ToWords } from 'to-words';

const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
        ignoreDecimal: true
    }
});
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { rateContractAPI, commonAPI, prepareFormDataForApi } from '@/services/apiService';

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        child_table_fields?: Record<string, any[]>;
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

// Helper to round to 2 decimal places
const roundTo2 = (num: number): number => Math.floor(num * 100) / 100;

// --- MAIN COMPONENT ---
const RateContractForm: React.FC = () => {
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

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(rateContractAPI.getFields);
    const { call: saveForm, error: saveError } = useFrappePostCall(rateContractAPI.save);
    const { call: submitForm, error: submitError } = useFrappePostCall(rateContractAPI.submit);
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');

    // Cascading dropdown API hooks
    const { call: fetchPrincipalSuppliersByItemType } = useFrappePostCall<{ message: LinkOption[] }>(rateContractAPI.getPrincipalSuppliersByItemType);
    const { call: fetchLocalSuppliersByPrincipal } = useFrappePostCall<{ message: LinkOption[] }>(rateContractAPI.getLocalSuppliersByPrincipal);
    const { call: fetchPrincipalSupplierDetails } = useFrappePostCall<{ message: any }>(rateContractAPI.getPrincipalSupplierDetails);
    const { call: fetchLocalSupplierDetails } = useFrappePostCall<{ message: any }>(rateContractAPI.getLocalSupplierDetails);
    const { call: fetchVendorDetails } = useFrappePostCall<{ message: any }>(rateContractAPI.getVendorDetails);
    const { call: fetchVendorsByP4ItemType } = useFrappePostCall<{ message: LinkOption[] }>(rateContractAPI.getVendorsByP4ItemType);
    const { call: fetchUserDetails } = useFrappePostCall<{ message: any }>(commonAPI.getUserDetailsByEmail);

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
                const { fields: apiFields, prefill_data, link_options, child_table_fields } = formDataResult.message;

                // Merge child_fields into the Table fields
                const enhancedFields = (apiFields || []).map((field: FormField) => {
                    if (field.fieldtype === 'Table' && child_table_fields && child_table_fields[field.fieldname]) {
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
                            doctype: 'Rate Contract',
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

                // Set project if passed via URL
                if (projectName && !initialData.project_name) {
                    initialData.project_name = projectName;
                }

                // Set defaults for any missing fields
                enhancedFields.forEach((field: FormField) => {
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
                alert("Error: Could not load the Rate Contract form.");
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, editDocName, fetchExistingDoc, projectName, dataLoaded]);

    // --- EVENT HANDLERS ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [fieldname]: file }));
    }, []);

    // Handle cascading field changes with side effects
    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
        // Update the field value first
        handleChange(fieldname, value);

        try {
            switch (fieldname) {
                case 'email_id':
                    if (value) {
                        const result = await fetchUserDetails({ user_email: value });
                        if (result?.message) {
                            const user = result.message;
                            setFormData(prev => ({
                                ...prev,
                                [fieldname]: value,
                                indentor: value,
                                applicant_designation: user.designation_name || user.designation || '',
                                applicant_department: user.department_name || user.department || ''
                            }));
                        }
                    }
                    break;

                case 'item_type':
                    // P3: On item_type change - filter principal suppliers
                    if (value) {
                        const result = await fetchPrincipalSuppliersByItemType({ item_type: value });
                        if (result?.message) {
                            setLinkOptions(prev => ({ ...prev, principal_supplier: result.message }));
                        }
                    }
                    // Clear dependent fields
                    setFormData(prev => ({
                        ...prev,
                        [fieldname]: value,
                        principal_supplier: '',
                        principal_address: '',
                        agreement_no: '',
                        local_supplier: '',
                        local_address: '',
                        local_email: ''
                    }));
                    break;

                case 'principal_supplier':
                    // P3: On principal_supplier change - fetch details & filter local suppliers
                    if (value) {
                        // Fetch principal supplier details
                        const detailsResult = await fetchPrincipalSupplierDetails({ principal_supplier: value });
                        if (detailsResult?.message) {
                            setFormData(prev => ({
                                ...prev,
                                [fieldname]: value,
                                principal_address: detailsResult.message.principal_address || '',
                                agreement_no: detailsResult.message.agreement_no || ''
                            }));
                        }

                        // Fetch local suppliers filtered by principal
                        const localsResult = await fetchLocalSuppliersByPrincipal({ principal_supplier: value });
                        if (localsResult?.message) {
                            setLinkOptions(prev => ({ ...prev, local_supplier: localsResult.message }));
                        }
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            [fieldname]: '',
                            principal_address: '',
                            agreement_no: '',
                            local_supplier: '',
                            local_address: '',
                            local_email: ''
                        }));
                    }
                    break;

                case 'local_supplier':
                    // P3: On local_supplier change - fetch details
                    if (value) {
                        const result = await fetchLocalSupplierDetails({ local_supplier: value });
                        if (result?.message) {
                            setFormData(prev => ({
                                ...prev,
                                [fieldname]: value,
                                local_address: result.message.local_address || '',
                                local_email: result.message.local_email || ''
                            }));
                        }
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            [fieldname]: '',
                            local_address: '',
                            local_email: ''
                        }));
                    }
                    break;

                case 'p4_item_type':
                    // P4: On p4_item_type change - filter vendors
                    if (value) {
                        const result = await fetchVendorsByP4ItemType({ p4_item_type: value });
                        if (result?.message) {
                            setLinkOptions(prev => ({ ...prev, select_vendor: result.message }));
                        }
                    }
                    // Clear dependent fields
                    setFormData(prev => ({
                        ...prev,
                        [fieldname]: value,
                        select_vendor: '',
                        vendor_address: '',
                        vendor_email: ''
                    }));
                    break;

                case 'select_vendor':
                    // P4: On vendor change - fetch vendor details
                    if (value) {
                        const result = await fetchVendorDetails({ vendor: value });
                        if (result?.message) {
                            setFormData(prev => ({
                                ...prev,
                                [fieldname]: value,
                                vendor_address: result.message.vendor_address || '',
                                vendor_email: result.message.vendor_email || ''
                            }));
                        }
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            [fieldname]: '',
                            vendor_address: '',
                            vendor_email: ''
                        }));
                    }
                    break;

                case 'select_form_type':
                    // Clear form type specific fields when switching between P3/P4
                    const isP3 = value?.includes('P3');
                    const isP4 = value?.includes('P4');

                    if (isP3) {
                        // Clear P4 fields
                        setFormData(prev => ({
                            ...prev,
                            [fieldname]: value,
                            p4_item_type: '',
                            select_vendor: '',
                            vendor_address: '',
                            vendor_email: '',
                            justification: ''
                        }));
                    } else if (isP4) {
                        // Clear P3 fields
                        setFormData(prev => ({
                            ...prev,
                            [fieldname]: value,
                            item_type: '',
                            principal_supplier: '',
                            principal_address: '',
                            agreement_no: '',
                            local_supplier: '',
                            local_address: '',
                            local_email: '',
                            certify_authorized_firm: 0,
                            certify_current_prices: 0,
                            certify_delivery_time: 0
                        }));
                    }
                    break;

                default:
                    // No side effects needed
                    break;
            }
        } catch (error) {
            console.error(`Error handling field change for ${fieldname}:`, error);
        }
    }, [handleChange, fetchPrincipalSuppliersByItemType, fetchPrincipalSupplierDetails, fetchLocalSuppliersByPrincipal, fetchLocalSupplierDetails, fetchVendorDetails, fetchVendorsByP4ItemType, fetchUserDetails]);

    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: value };

            // Calculate amount if unit_rate, quantity, discount_percentage, or gst_percentage changes
            if (['unit_rate', 'quantity', 'discount_percentage', 'gst_percentage'].includes(fieldname)) {
                const row = table[rowIndex];
                const unitRate = parseFloat(row.unit_rate || 0);
                const quantity = parseFloat(row.quantity || 1);
                const discount = parseFloat(row.discount_percentage || 0);
                const gst = parseFloat(row.gst_percentage || 0);

                const baseAmount = unitRate * quantity;
                const discountAmount = baseAmount * (discount / 100);
                const afterDiscount = baseAmount - discountAmount;
                const gstAmount = afterDiscount * (gst / 100);
                const finalAmount = roundTo2(afterDiscount + gstAmount);

                table[rowIndex].amount = finalAmount;
            }

            // Recalculate rate_contract_total
            const total = roundTo2(table.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0));
            const packing = parseFloat(prev.rate_contract_packing || 0);
            const grandTotal = Math.round(total + packing);

            return {
                ...prev,
                [tableName]: table,
                rate_contract_total: total,
                rate_contract_grand_total: grandTotal,
                amount_in_words: toWords.convert(grandTotal.toString() as any)
            };
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
        setFormData(prev => {
            const newTable = (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex);
            const total = roundTo2(newTable.reduce((sum: number, row: any) => sum + parseFloat(row.amount || 0), 0));
            const packing = parseFloat(prev.rate_contract_packing || 0);
            const grandTotal = Math.round(total + packing);

            return {
                ...prev,
                [tableName]: newTable,
                rate_contract_total: total,
                rate_contract_grand_total: grandTotal,
                amount_in_words: toWords.convert(grandTotal.toString() as any)
            };
        });
    }, []);

    // Update grand total when packing charges change
    useEffect(() => {
        const total = parseFloat(formData.rate_contract_total || 0);
        const packing = parseFloat(formData.rate_contract_packing || 0);
        const grandTotal = Math.round(total + packing);

        if (formData.rate_contract_grand_total !== grandTotal) {
            setFormData(prev => ({
                ...prev,
                rate_contract_grand_total: grandTotal,
                amount_in_words: toWords.convert(grandTotal.toString() as any)
            }));
        }
    }, [formData.rate_contract_total, formData.rate_contract_packing]);

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
                alert(editDocName ? "Rate Contract updated successfully!" : "Draft saved successfully!");
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
                alert("Rate Contract submitted successfully!");
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
                    title={editDocName ? `Edit Rate Contract: ${editDocName}` : 'Rate Contract Application'}
                    projectName={projectName}
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
                            onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
                            readOnly={formData.docstatus === 1}
                        />
                    </FrappeCard>

                    {(!editDocName || formData.docstatus === 0) && (
                        <div className="mt-8 flex justify-end gap-4">
                            <FrappeButton
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-800/50"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Draft'}
                            </FrappeButton>
                            <FrappeButton
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-[#D97757] text-white hover:bg-[#D97757]"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                            </FrappeButton>
                        </div>
                    )}
                </form>
            </main>
        </div>
    );
};

export default RateContractForm;