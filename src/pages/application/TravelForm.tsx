import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, Wallet, TrendingUp, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { travelAPI, prepareFormDataForApi, commonAPI } from '@/services/apiService';

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

// --- FUND DETAILS SIDEBAR COMPONENT ---
const FundDetailsSidebar = ({ projectCode }: { projectCode: string }) => {
    // Use the correct API that ProjectDetailsOverview uses
    // IMPORTANT: API expects 'project_number' not 'project_id'
    const { data: projectAmounts, isLoading } = useFrappeGetCall<{
        message: {
            status: string;
            data: {
                projectNumber: string;
                totalFundReceived: number;
                totalCommitted: number;
                totalPaid: number;
                availableCommitAmount: number;
                availablePaymentAmount: number;
            }
        }
    }>(
        'rndopsapp.rndopsapp.commitPayment.get_project_available_amounts',
        { project_number: projectCode },
        projectCode ? undefined : null // Skip if no project code
    );

    // Debug: Log API response
    console.log('[FundDetailsSidebar] projectCode:', projectCode, 'API response:', projectAmounts);

    // Extract fund data from API response
    const projectData = (projectAmounts as any)?.message?.data ?? (projectAmounts as any)?.data ?? {};

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    if (!projectCode) {
        return (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-200 rounded-lg">
                        <Info className="h-5 w-5 text-gray-500" />
                    </div>
                    <h3 className="font-semibold text-gray-700">Fund Details</h3>
                </div>
                <p className="text-sm text-gray-500">Select a project to view fund details</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-100 animate-pulse">
                <div className="h-6 bg-teal-100 rounded w-32 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-16 bg-teal-100/50 rounded"></div>
                    <div className="h-16 bg-teal-100/50 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-100 sticky top-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-teal-500 rounded-lg">
                    <Wallet className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Project Fund Details</h3>
            </div>

            <div className="space-y-4">
                {/* Total Fund Received */}
                <div className="bg-white/80 backdrop-blur p-4 rounded-lg border border-teal-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Fund Received</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(projectData.totalFundReceived)}</p>
                </div>

                {/* Available Balance */}
                <div className="bg-white/80 backdrop-blur p-4 rounded-lg border border-teal-100">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-teal-600" />
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Available Balance</p>
                    </div>
                    <p className="text-2xl font-bold text-teal-600">{formatCurrency(projectData.availableCommitAmount)}</p>
                </div>

                {/* Fund Breakdown */}
                <div className="pt-4 border-t border-teal-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Fund Breakdown</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Total Committed</span>
                            <span className="font-semibold text-amber-600">{formatCurrency(projectData.totalCommitted)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Total Paid</span>
                            <span className="font-semibold text-red-600">{formatCurrency(projectData.totalPaid)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Payable Balance</span>
                            <span className="font-semibold text-blue-600">{formatCurrency(projectData.availablePaymentAmount)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- ESTIMATE VALIDATION COMPONENT ---
const EstimateValidation = ({ formData }: { formData: Record<string, any> }) => {
    const totalFunds = (formData.travel_contribution || 0) +
        (formData.contingency_contribution || 0) +
        (formData.other_contribution || 0);

    const totalEstimates = (formData.est_travel_amt || 0) +
        (formData.est_reg_amt || 0) +
        (formData.est_accom_amt || 0) +
        (formData.est_other_amt || 0);

    const diff = totalEstimates - totalFunds;
    const isBalanced = diff === 0;

    if (totalEstimates === 0 && totalFunds === 0) return null;

    return (
        <div className={cn(
            "p-4 rounded-lg border-2 flex items-center gap-3",
            isBalanced ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        )}>
            {isBalanced ? (
                <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700">Budget Balanced</span>
                </>
            ) : (
                <>
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-700">
                        ₹{Math.abs(diff).toLocaleString('en-IN')} {diff > 0 ? 'needs to be allocated' : 'excess allocated'}
                    </span>
                </>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
const TravelForm: React.FC = () => {
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

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(travelAPI.getFields);
    const { call: saveForm, error: saveError } = useFrappePostCall(travelAPI.save);
    const { call: submitForm, error: submitError } = useFrappePostCall(travelAPI.submit);
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchUserDetails } = useFrappePostCall<{ message: any }>(commonAPI.getUserDetails);
    const { call: fetchUserDetailsByEmail } = useFrappePostCall<{ message: any }>(commonAPI.getUserDetailsByEmail);

    // --- Computed: Total Estimate ---
    // --- Computed: Total Estimate ---
    const totalEstimate = useMemo(() => {
        const travel = parseFloat(formData.est_travel_amt || 0);
        const reg = parseFloat(formData.est_reg_amt || 0);
        const accom = parseFloat(formData.est_accom_amt || 0);
        const other = parseFloat(formData.est_other_amt || 0);

        return (isNaN(travel) ? 0 : travel) +
            (isNaN(reg) ? 0 : reg) +
            (isNaN(accom) ? 0 : accom) +
            (isNaN(other) ? 0 : other);
    }, [formData.est_travel_amt, formData.est_reg_amt, formData.est_accom_amt, formData.est_other_amt]);

    // Update total estimate field when computed value changes
    useEffect(() => {
        if (formData.total_estimate !== totalEstimate) {
            setFormData(prev => ({ ...prev, total_estimate: totalEstimate }));
        }
    }, [totalEstimate, formData.total_estimate]);

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
                            doctype: 'Travel',
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
                if (projectName) {
                    // Set project number (used for filtering in list views)
                    if (!initialData.travel_project_number) {
                        initialData.travel_project_number = projectName;
                    }
                    // Set project title (display field)
                    if (!initialData.travel_project_title) {
                        initialData.travel_project_title = projectName;
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
                alert("Error: Could not load the Travel form.");
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, editDocName, fetchExistingDoc, projectName, dataLoaded]);

    // --- CLIENT SCRIPT VALIDATION (from provided Frappe script) ---
    const validateForm = useCallback((): boolean => {
        const errors: string[] = [];

        // Travel date validation
        if (formData.from_date && formData.to_date && formData.to_date < formData.from_date) {
            errors.push("To Date cannot be earlier than From Date.");
        }

        // Financial assistance validation
        if (formData.travel_financial_assistance === "Yes" && !formData.travel_mode_of_travel) {
            errors.push("Please select the Mode of Travel.");
        }

        // Special casual leave validation
        if (formData.travel_special_casual_leave === "Required") {
            if (!formData.travel_leave_from_date || !formData.travel_leave_to_date) {
                errors.push("Please select Leave Period From Date and To Date.");
            }
            if (formData.travel_leave_to_date < formData.travel_leave_from_date) {
                errors.push("Leave To Date cannot be earlier than Leave From Date.");
            }
        }

        // Station leave validation
        if (formData.travel_station_leave_from_date && !formData.travel_station_leave_from_session) {
            errors.push("Please select Station Leave session for From Date.");
        }
        if (formData.travel_station_leave_to_date && !formData.travel_station_leave_to_session) {
            errors.push("Please select Station Leave session for To Date.");
        }
        if (formData.travel_station_leave_from_date && formData.travel_station_leave_to_date &&
            formData.travel_station_leave_to_date < formData.travel_station_leave_from_date) {
            errors.push("Station Leave To Date cannot be earlier than From Date.");
        }

        // Declaration validation
        if (!formData.travel_declaration_accepted) {
            errors.push("You must accept the declaration before submitting the form.");
        }

        setValidationErrors(errors);
        return errors.length === 0;
    }, [formData]);

    // --- EVENT HANDLERS ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [fieldname]: file }));
    }, []);

    // Handle field changes with side effects
    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
        handleChange(fieldname, value);

        // International travel confirmation
        if (fieldname === 'nature_of_travel' && value === 'International') {
            const confirmed = window.confirm("Please select International only if the travel involves visiting a destination outside India.");
            if (!confirmed) {
                handleChange(fieldname, '');
                return;
            }
        }

        // Auto-fill applicant details when webmail_id_travel is selected
        if (fieldname === 'webmail_id_travel' && value) {
            try {
                const result = await fetchUserDetailsByEmail({ user_email: value });
                if (result?.message) {
                    const user = result.message;
                    setFormData(prev => ({
                        ...prev,
                        [fieldname]: value,
                        applicant_name_travel: user.full_name || '',
                        designation_travel: user.designation_name || user.designation || '',
                        department_travel: user.department_name || user.department || ''
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch user details:', err);
            }
        }

        // Auto-fill traveler details when other traveler selected
        if (fieldname === 'other_traveler' && value) {
            try {
                const result = await fetchUserDetailsByEmail({ user_email: value });
                if (result?.message) {
                    const user = result.message;
                    setFormData(prev => ({
                        ...prev,
                        [fieldname]: value,
                        other_traveler_address: `${user.designation_name || ''}, ${user.department_name || ''}`
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch traveler details:', err);
            }
        }
    }, [handleChange, fetchUserDetailsByEmail]);

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
                alert(editDocName ? "Travel updated successfully!" : "Draft saved successfully!");
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
                alert("Travel application submitted successfully!");
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

            // Handle depends_on conditions
            if (f.depends_on) {
                const evalStr = String(f.depends_on).replace(/;$/, ''); // Remove trailing semicolon
                try {
                    // Create a simple evaluator for doc.field == "value" patterns
                    const match = evalStr.match(/doc\.(\w+)\s*==\s*['"]([^'"]+)['"]/);
                    if (match) {
                        const [, fieldName, expectedValue] = match;
                        f.hidden = formData[fieldName] !== expectedValue ? 1 : 0;
                    }
                } catch {
                    // If evaluation fails, show the field
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
                                {editDocName ? `Edit Travel: ${editDocName}` : 'Travel Application'}
                            </h1>
                            <p className="text-gray-600 mt-1">
                                {projectName ? (
                                    <span>For Project: <strong>{projectName}</strong></span>
                                ) : (
                                    'Fill out the details below to apply for travel.'
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

                                {/* Estimate Validation Display */}
                                <EstimateValidation formData={formData} />
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
                                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                                </FrappeButton>
                            </div>
                        </div>

                        {/* Fund Details Sidebar - 1 column */}
                        <div className="lg:col-span-1">
                            <FundDetailsSidebar projectCode={formData.travel_project_title || projectName} />
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default TravelForm;
