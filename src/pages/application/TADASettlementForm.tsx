import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from 'lucide-react';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { tadaAPI, prepareFormDataForApi } from '@/services/apiService';

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
const TADASettlementForm: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectName = searchParams.get('project') || '';
    const travelRef = searchParams.get('travel_ref') || '';
    const editDocName = searchParams.get('edit') || '';

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(tadaAPI.getFields);
    const { call: saveForm, error: saveError } = useFrappePostCall(tadaAPI.save);
    const { call: submitForm, error: submitError } = useFrappePostCall(tadaAPI.submit);
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchTravelDetails } = useFrappePostCall<{ message: any }>('frappe.client.get');

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!dataLoaded) {
            fetchFormData({
                doc_name: editDocName || null,
                project_name: projectName || null,
                travel_ref: travelRef || null
            });
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
                            doctype: 'TA DA Settlement',
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

                // Set project and travel reference if passed via URL
                if (projectName && !initialData.project_name) {
                    initialData.project_name = projectName;
                }
                if (travelRef && !initialData.travel_ref) {
                    initialData.travel_ref = travelRef;
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
                alert("Error: Could not load the TA DA Settlement form.");
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, editDocName, fetchExistingDoc, projectName, travelRef, dataLoaded]);

    // --- CALCULATE TOTALS ---
    useEffect(() => {
        // Calculate net claimed amount
        const totalClaimed = parseFloat(formData.total_claimed || 0);
        const advanceTaken = parseFloat(formData.advance_taken || 0);
        const netClaimed = totalClaimed - advanceTaken;

        if (formData.net_claimed !== netClaimed) {
            setFormData(prev => ({
                ...prev,
                net_claimed: netClaimed
            }));
        }
    }, [formData.total_claimed, formData.advance_taken]);

    // --- EVENT HANDLERS ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [fieldname]: file }));
    }, []);

    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
        handleChange(fieldname, value);

        if (fieldname === 'ta_da_travel_application' && value) {
            try {
                const result = await fetchTravelDetails({
                    doctype: 'Travel',
                    name: value
                });

                if (result?.message) {
                    const travelDoc = result.message;
                    setFormData(prev => ({
                        ...prev,
                        [fieldname]: value,
                        ta_da_name: travelDoc.applicant_name_travel || '',
                        ta_da_designation: travelDoc.designation_travel || '',
                        ta_da_department_section: travelDoc.department_travel || '',
                        ta_da_project_code: travelDoc.travel_project_number || ''
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch travel details:', err);
            }
        }
    }, [handleChange, fetchTravelDetails]);

    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: value };

            // Calculate row total if amount field changes
            if (fieldname === 'amount' || fieldname === 'quantity') {
                const row = table[rowIndex];
                const amount = parseFloat(row.amount || 0);
                const quantity = parseFloat(row.quantity || 1);
                table[rowIndex].total = amount * quantity;
            }

            // Calculate table total
            const tableTotal = table.reduce((sum, row) => sum + (parseFloat(row.total || row.amount || 0)), 0);

            return {
                ...prev,
                [tableName]: table,
                // Update total claimed if this is the expenses table
                ...(tableName === 'ta_da_other_expenses_p' ? { total_claimed: tableTotal } : {})
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

            // Recalculate total if this is the expenses table
            let updates: Record<string, any> = { [tableName]: newTable };
            if (tableName === 'ta_da_other_expenses_p') {
                const tableTotal = newTable.reduce((sum: number, row: any) => sum + (parseFloat(row.total || row.amount || 0)), 0);
                updates.total_claimed = tableTotal;
            }

            return { ...prev, ...updates };
        });
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
                alert(editDocName ? "TA DA Settlement updated successfully!" : "Draft saved successfully!");
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
                alert("TA DA Settlement submitted successfully!");
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
            <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0EA5A4] border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-lg font-medium text-gray-700">Loading form...</p>
                </div>
            </div>
        );
    }

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
                                {editDocName ? `Edit TA DA Settlement: ${editDocName}` : 'TA DA Settlement'}
                            </h1>
                            <p className="text-gray-600 mt-1">
                                {projectName && <span>For Project: <strong>{projectName}</strong></span>}
                                {travelRef && <span> | Travel Ref: <strong>{travelRef}</strong></span>}
                                {!projectName && !travelRef && 'Fill out the details below for TA DA settlement.'}
                            </p>
                        </div>
                    </div>
                </header>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Claimed</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                            ₹ {(parseFloat(formData.total_claimed || 0)).toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Advance Taken</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                            ₹ {(parseFloat(formData.advance_taken || 0)).toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Net Claimed</p>
                        <p className={cn(
                            "text-2xl font-bold mt-1",
                            (formData.net_claimed || 0) >= 0 ? "text-[#0EA5A4]" : "text-red-600"
                        )}>
                            ₹ {(parseFloat(formData.net_claimed || 0)).toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>

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
                </form>
            </main>
        </div>
    );
};

export default TADASettlementForm;
