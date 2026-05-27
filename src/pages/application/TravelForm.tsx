import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FieldMessage, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
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
    <div className={cn("bg-[#FFFFFF] dark:bg-[#27272A] p-4 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow", className)}>
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
            "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white dark:ring-offset-zinc-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 dark:focus-visible:ring-zinc-800 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2",
            className
        )}
    >
        {children}
    </button>
);

// --- ESTIMATE VALIDATION COMPONENT ---
const EstimateValidation = ({ formData }: { formData: Record<string, any> }) => {
    // Use parseFloat to ensure numeric addition, not string concatenation
    const parseNum = (val: any) => parseFloat(val) || 0;

    // Use contribution amounts for calculations but use heads for display/logic
    // Note: If heads are mutually exclusive, usually only one contribution is active
    const totalFunds = parseNum(formData.travel_contribution) +
        parseNum(formData.contingency_contribution) +
        parseNum(formData.other_contribution);

    const totalEstimates = parseNum(formData.est_travel_amt) +
        parseNum(formData.est_reg_amt) +
        parseNum(formData.est_accom_amt) +
        parseNum(formData.est_other_amt);

    // Round to avoid floating point issues
    const diff = Math.round((totalEstimates - totalFunds) * 100) / 100;
    const isBalanced = diff === 0;

    if (totalEstimates === 0 && totalFunds === 0) return null;

    return (
        <div className={cn(
            "p-4 rounded-xl border flex items-center gap-3",
            isBalanced ? "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900"
        )}>
            {isBalanced ? (
                <>
                    <CheckCircle2 className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Budget Balanced</span>
                </>
            ) : (
                <>
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-500">
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
    const [savedDocName, setSavedDocName] = useState<string | null>(editDocName || null); // Track if draft is saved
    const [sclBalance, setSclBalance] = useState<{
        eligible?: boolean;
        available?: number | null;
        credited?: number | null;
        utilized?: number | null;
        message?: string;
    } | null>(null);
    const [isSclLoading, setIsSclLoading] = useState(false);

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(travelAPI.getFields);
    const { call: saveForm, error: saveError } = useFrappePostCall(travelAPI.save);
    const { call: submitForm, error: submitError } = useFrappePostCall(travelAPI.submit);
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchAccountHeads } = useFrappePostCall<{ message: any[] }>('frappe.client.get_list');
    const { call: fetchSclBalance } = useFrappePostCall<{ message: any }>(travelAPI.getSclBalance);

    const { call: fetchUserDetailsByEmail } = useFrappePostCall<{ message: any }>(commonAPI.getUserDetailsByEmail);

    // --- Computed: Total Estimate ---
    const totalEstimate = useMemo(() => {
        const travel = parseFloat(formData.est_travel_amt || 0);
        const reg = parseFloat(formData.est_reg_amt || 0);
        const accom = parseFloat(formData.est_accom_amt || 0);
        const other = parseFloat(formData.est_other_amt || 0);

        const total = (isNaN(travel) ? 0 : travel) +
            (isNaN(reg) ? 0 : reg) +
            (isNaN(accom) ? 0 : accom) +
            (isNaN(other) ? 0 : other);

        // Round to 2 decimal places to avoid floating point display issues
        return Math.round(total * 100) / 100;
    }, [formData.est_travel_amt, formData.est_reg_amt, formData.est_accom_amt, formData.est_other_amt]);

    // Update total estimate field when computed value changes
    useEffect(() => {
        if (formData.total_estimate !== totalEstimate) {
            setFormData(prev => ({ ...prev, total_estimate: totalEstimate }));
        }
    }, [totalEstimate, formData.total_estimate]);

    const requestedSclDays = useMemo(() => {
        if (
            formData.travel_special_casual_leave !== "Required" ||
            !formData.travel_leave_from_date ||
            !formData.travel_leave_to_date
        ) {
            return 0;
        }

        const from = new Date(formData.travel_leave_from_date);
        const to = new Date(formData.travel_leave_to_date);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
            return 0;
        }

        return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
    }, [
        formData.travel_special_casual_leave,
        formData.travel_leave_from_date,
        formData.travel_leave_to_date,
    ]);

    const sclFieldMessages = useMemo<Record<string, FieldMessage>>(() => {
        if (formData.travel_special_casual_leave !== "Required") return {};
        if (isSclLoading) {
            return {
                travel_special_casual_leave: {
                    type: "loading",
                    message: "Checking Special Casual Leave balance...",
                },
            };
        }
        if (!formData.webmail_id_travel) {
            return {
                webmail_id_travel: {
                    type: "info",
                    message: "Select the applicant webmail ID to check Special Casual Leave balance.",
                },
            };
        }
        if (!sclBalance) return {};
        if (sclBalance.eligible === false) {
            return {
                travel_special_casual_leave: {
                    type: "warning",
                    message: sclBalance.message || "This applicant is not eligible for Special Casual Leave.",
                },
            };
        }

        const available = sclBalance.available;
        const balanceText =
            available == null
                ? sclBalance.message || "Special Casual Leave balance could not be verified."
                : `Available SCL balance: ${available} day${available === 1 ? "" : "s"}.`;
        const overLimit =
            available != null && requestedSclDays > 0 && requestedSclDays > available;

        return {
            travel_special_casual_leave: {
                type: overLimit ? "warning" : "success",
                message: overLimit
                    ? `Requested ${requestedSclDays} day${requestedSclDays === 1 ? "" : "s"}, but only ${available} day${available === 1 ? "" : "s"} are available.`
                    : requestedSclDays > 0
                      ? `${balanceText} Requested period uses ${requestedSclDays} day${requestedSclDays === 1 ? "" : "s"}.`
                      : balanceText,
            },
        };
    }, [
        formData.travel_special_casual_leave,
        formData.webmail_id_travel,
        isSclLoading,
        requestedSclDays,
        sclBalance,
    ]);

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

                // Fetch Budget Heads and inject into linkOptions for account_head
                let baseLinkOptions = { ...(link_options || {}) };
                try {
                    const headsRes = await fetchAccountHeads({
                        doctype: 'Budget Head',
                        fields: ['name', 'budget_head'],
                        limit_page_length: 0,
                    });
                    if (headsRes?.message) {
                        baseLinkOptions['account_head'] = headsRes.message.map((h: any) => ({
                            value: h.name,
                            label: h.budget_head || h.name,
                        }));
                    }
                } catch (err) {
                    console.error('Error fetching account heads:', err);
                }
                setLinkOptions(baseLinkOptions);

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

    useEffect(() => {
        const applicant = formData.webmail_id_travel;
        if (!applicant || formData.travel_special_casual_leave !== "Required") {
            setSclBalance(null);
            return;
        }

        let cancelled = false;
        const loadSclBalance = async () => {
            setIsSclLoading(true);
            try {
                const result = await fetchSclBalance({ employee: applicant });
                const payload = result?.message || {};
                if (cancelled) return;
                setSclBalance({
                    eligible: payload.eligible ?? payload.is_eligible,
                    available:
                        payload.available_balance ??
                        payload.available ??
                        payload.balance ??
                        null,
                    credited: payload.total_credited ?? null,
                    utilized: payload.utilized_balance ?? null,
                    message: payload.message,
                });
            } catch (err) {
                console.error("Failed to fetch SCL balance:", err);
                if (!cancelled) {
                    setSclBalance({
                        available: null,
                        message: "Special Casual Leave balance could not be verified right now.",
                    });
                }
            } finally {
                if (!cancelled) setIsSclLoading(false);
            }
        };

        loadSclBalance();
        return () => {
            cancelled = true;
        };
    }, [fetchSclBalance, formData.travel_special_casual_leave, formData.webmail_id_travel]);

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

        // Account Head Mutual Exclusivity - FIX: Target the HEAD fields, not contribution amounts
        // If one is checked, uncheck the others
        if (['travel_head', 'contingency_head', 'other_acc_head'].includes(fieldname) && (value === 1 || value === true || value === '1')) {
            if (fieldname !== 'travel_head') handleChange('travel_head', 0);
            if (fieldname !== 'contingency_head') handleChange('contingency_head', 0);
            if (fieldname !== 'other_acc_head') handleChange('other_acc_head', 0);
        }

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
                        department_travel: user.department_name || user.department || '',
                        employee_id: user.employee_id || prev.employee_id || ''
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
                const docname = res.message.docname || editDocName;
                setSavedDocName(docname); // Track that the form has been saved
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
            // 1. Save first — reuse draft docname to avoid creating a duplicate
            const effectiveName = savedDocName || editDocName;
            const data = await prepareFormDataForApi(formData);
            if (effectiveName) data.name = effectiveName;
            const saveRes = await saveForm({ doc_data: JSON.stringify(data) });

            if (saveRes?.message?.status !== 'success') {
                throw new Error(saveRes?.message?.message || "Save failed during submission");
            }

            const docname = saveRes.message.docname || effectiveName;

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

            // Override specific fields to be Radio buttons for better UX
            if (['nature_of_travel', 'travel_financial_assistance', 'travel_mode_of_travel'].includes(f.fieldname)) {
                f.fieldtype = 'Radio';
            }

            // Hide old checkbox-based account head fields — replaced by account_head dropdown
            if (['travel_head', 'contingency_head', 'other_acc_head', 'specify_other_acc_head'].includes(f.fieldname)) {
                f.hidden = 1;
            }

            // Override account_head to Link so DynamicFormRenderer renders it as a dropdown
            if (f.fieldname === 'account_head') {
                f.fieldtype = 'Link';
            }

            return f;
        });
    }, [fields, formData]);

    // --- RENDER LOGIC ---
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9] dark:bg-[#18181B]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">Loading form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={editDocName ? `Edit Travel: ${editDocName}` : 'Travel Application'}
                    projectName={projectName}
                />

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
                    <div className="w-full">
                        <div className="w-full">
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
                                    readOnly={formData.docstatus === 1}
                                    fieldMessages={sclFieldMessages}
                                />

                                {/* Estimate Validation Display */}
                                <EstimateValidation formData={formData} />
                            </FrappeCard>

                            {(!editDocName || formData.docstatus === 0) && (
                                <div className="mt-8 flex justify-end gap-3">
                                    <FrappeButton
                                        onClick={handleSave}
                                        disabled={isSubmitting}
                                        className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-sm"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Draft'}
                                    </FrappeButton>
                                    <FrappeButton
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-[#D97757] text-white hover:opacity-90 shadow-sm"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Application'}
                                    </FrappeButton>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default TravelForm;





// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import { AppSidebar } from '@/components/RndSidebar';
// import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils';
// import { ArrowLeft, Wallet, TrendingUp, AlertCircle, CheckCircle2, Info, Sun, Moon } from 'lucide-react';
// import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
// import { travelAPI, prepareFormDataForApi, commonAPI } from '@/services/apiService';

// // --- TYPE DEFINITIONS ---
// interface FormDataResponse {
//     message: {
//         fields: FormField[];
//         link_options: Record<string, LinkOption[]>;
//         prefill_data: Record<string, any>;
//     };
// }

// // --- CUSTOM HOOK ---
// const useTheme = () => {
//     const [theme, setTheme] = useState<'light' | 'dark'>(() => {
//         const saved = localStorage.getItem('theme') as 'light' | 'dark';
//         if (saved) return saved;
//         return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
//     });

//     useEffect(() => {
//         const root = document.documentElement;
//         if (theme === 'dark') {
//             root.classList.add('dark');
//         } else {
//             root.classList.remove('dark');
//         }
//         localStorage.setItem('theme', theme);
//     }, [theme]);

//     const toggle = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
//     return { theme, toggle };
// };

// // --- FUND DETAILS SIDEBAR ---
// const FundDetailsSidebar = ({ projectCode }: { projectCode: string }) => {
//     const { data: projectAmounts, isLoading } = useFrappeGetCall<{
//         message: { status: string; data: any };
//     }>(
//         'rndopsapp.rndopsapp.commitPayment.get_project_available_amounts',
//         { project_number: projectCode },
//         projectCode ? undefined : null
//     );

//     const projectData = (projectAmounts as any)?.message?.data ?? (projectAmounts as any)?.data ?? {};

//     const formatCurrency = (amount: number) => {
//         return new Intl.NumberFormat('en-IN', {
//             style: 'currency',
//             currency: 'INR',
//             maximumFractionDigits: 0
//         }).format(amount || 0);
//     };

//     if (!projectCode) {
//         return (
//             <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700">
//                 <div className="flex items-center gap-3 mb-4">
//                     <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
//                         <Info className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
//                     </div>
//                     <h3 className="font-serif font-medium text-zinc-800 dark:text-zinc-200">Fund Details</h3>
//                 </div>
//                 <p className="font-sans text-sm text-zinc-500 dark:text-zinc-400">Select a project to view fund details</p>
//             </div>
//         );
//     }

//     if (isLoading) {
//         return (
//             <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 animate-pulse">
//                 <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-32 mb-4"></div>
//                 <div className="space-y-3">
//                     <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
//                     <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 sticky top-6">
//             <div className="flex items-center gap-3 mb-6">
//                 <div className="p-2 bg-[#D97757]/10 rounded-lg">
//                     <Wallet className="h-5 w-5 text-[#D97757]" />
//                 </div>
//                 <h3 className="font-serif font-medium text-zinc-800 dark:text-zinc-200">Project Fund Details</h3>
//             </div>

//             <div className="space-y-4">
//                 <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
//                     <p className="font-sans text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-1">
//                         Total Fund Received
//                     </p>
//                     <p className="font-serif text-xl font-medium text-zinc-800 dark:text-zinc-200">
//                         {formatCurrency(projectData.totalFundReceived)}
//                     </p>
//                 </div>

//                 <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
//                     <div className="flex items-center gap-2 mb-1">
//                         <TrendingUp className="h-4 w-4 text-claude-accent" />
//                         <p className="font-sans text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
//                             Available Balance
//                         </p>
//                     </div>
//                     <p className="font-serif text-2xl font-medium text-claude-accent">
//                         {formatCurrency(projectData.availableCommitAmount)}
//                     </p>
//                 </div>

//                 <div className="pt-2 space-y-3">
//                     <p className="font-sans text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
//                         Fund Breakdown
//                     </p>
//                     <div className="space-y-2">
//                         <div className="flex justify-between items-center font-sans text-sm">
//                             <span className="text-zinc-600 dark:text-zinc-400">Total Committed</span>
//                             <span className="font-medium text-amber-600 dark:text-amber-500">{formatCurrency(projectData.totalCommitted)}</span>
//                         </div>
//                         <div className="flex justify-between items-center font-sans text-sm">
//                             <span className="text-zinc-600 dark:text-zinc-400">Total Paid</span>
//                             <span className="font-medium text-red-600 dark:text-red-500">{formatCurrency(projectData.totalPaid)}</span>
//                         </div>
//                         <div className="flex justify-between items-center font-sans text-sm">
//                             <span className="text-zinc-600 dark:text-zinc-400">Payable Balance</span>
//                             <span className="font-medium text-blue-600 dark:text-blue-500">{formatCurrency(projectData.availablePaymentAmount)}</span>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // --- ESTIMATE VALIDATION ---
// const EstimateValidation = ({ formData }: { formData: Record<string, any> }) => {
//     const parseNum = (val: any) => parseFloat(val) || 0;

//     const totalFunds = parseNum(formData.travel_contribution) +
//         parseNum(formData.contingency_contribution) +
//         parseNum(formData.other_contribution);

//     const totalEstimates = parseNum(formData.est_travel_amt) +
//         parseNum(formData.est_reg_amt) +
//         parseNum(formData.est_accom_amt) +
//         parseNum(formData.est_other_amt);

//     const diff = Math.round((totalEstimates - totalFunds) * 100) / 100;
//     const isBalanced = diff === 0;

//     if (totalEstimates === 0 && totalFunds === 0) return null;

//     return (
//         <div className={cn(
//             "p-4 rounded-lg border flex items-center gap-3 font-sans",
//             isBalanced
//                 ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
//                 : "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
//         )}>
//             {isBalanced ? (
//                 <>
//                     <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
//                     <span className="font-medium text-green-700 dark:text-green-400">Budget Balanced</span>
//                 </>
//             ) : (
//                 <>
//                     <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
//                     <span className="font-medium text-red-700 dark:text-red-400">
//                         ₹{Math.abs(diff).toLocaleString('en-IN')} {diff > 0 ? 'needs to be allocated' : 'excess allocated'}
//                     </span>
//                 </>
//             )}
//         </div>
//     );
// };

// // --- MAIN COMPONENT ---
// const TravelForm: React.FC = () => {
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const { theme, toggle: toggleTheme } = useTheme();

//     const projectName = searchParams.get('project') || '';
//     const editDocName = searchParams.get('edit') || '';

//     const [fields, setFields] = useState<FormField[]>([]);
//     const [formData, setFormData] = useState<Record<string, any>>({});
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [dataLoaded, setDataLoaded] = useState(false);
//     const [validationErrors, setValidationErrors] = useState<string[]>([]);
//     const [savedDocName, setSavedDocName] = useState<string | null>(editDocName || null);

//     // --- API HOOKS ---
//     const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(travelAPI.getFields);
//     const { call: saveForm, error: saveError } = useFrappePostCall(travelAPI.save);
//     const { call: submitForm, error: submitError } = useFrappePostCall(travelAPI.submit);
//     const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
//     const { call: fetchUserDetailsByEmail } = useFrappePostCall<{ message: any }>(commonAPI.getUserDetailsByEmail);

//     // --- Computed: Total Estimate ---
//     const totalEstimate = useMemo(() => {
//         const travel = parseFloat(formData.est_travel_amt || 0);
//         const reg = parseFloat(formData.est_reg_amt || 0);
//         const accom = parseFloat(formData.est_accom_amt || 0);
//         const other = parseFloat(formData.est_other_amt || 0);

//         const total = (isNaN(travel) ? 0 : travel) +
//             (isNaN(reg) ? 0 : reg) +
//             (isNaN(accom) ? 0 : accom) +
//             (isNaN(other) ? 0 : other);

//         return Math.round(total * 100) / 100;
//     }, [formData.est_travel_amt, formData.est_reg_amt, formData.est_accom_amt, formData.est_other_amt]);

//     useEffect(() => {
//         if (formData.total_estimate !== totalEstimate) {
//             setFormData(prev => ({ ...prev, total_estimate: totalEstimate }));
//         }
//     }, [totalEstimate, formData.total_estimate]);

//     // --- DATA FETCHING ---
//     useEffect(() => {
//         if (!dataLoaded) {
//             fetchFormData({ doc_name: editDocName || null, project_name: projectName || null });
//         }
//     }, []);

//     useEffect(() => {
//         const loadFormAndDocument = async () => {
//             if (formDataResult?.message && !dataLoaded) {
//                 const { fields: apiFields, prefill_data, link_options } = formDataResult.message;
//                 setFields(apiFields || []);
//                 setLinkOptions(link_options || {});

//                 let initialData = { ...prefill_data };

//                 if (editDocName) {
//                     try {
//                         const existingDoc = await fetchExistingDoc({
//                             doctype: 'Travel',
//                             name: editDocName
//                         });

//                         if (existingDoc?.message) {
//                             initialData = { ...initialData, ...existingDoc.message };
//                         }
//                     } catch (err) {
//                         console.error('Error fetching existing document:', err);
//                     }
//                 }

//                 if (projectName) {
//                     if (!initialData.travel_project_number) {
//                         initialData.travel_project_number = projectName;
//                     }
//                     if (!initialData.travel_project_title) {
//                         initialData.travel_project_title = projectName;
//                     }
//                 }

//                 (apiFields || []).forEach((field: FormField) => {
//                     if (initialData[field.fieldname] === undefined && field.default !== undefined) {
//                         initialData[field.fieldname] = field.default;
//                     }
//                 });

//                 setFormData(initialData);
//                 setDataLoaded(true);
//                 setLoading(false);
//             }
//             if (formDataError) {
//                 console.error("Failed to load form data:", formDataError);
//                 setLoading(false);
//             }
//         };

//         loadFormAndDocument();
//     }, [formDataResult, formDataError, editDocName, fetchExistingDoc, projectName, dataLoaded]);

//     // --- VALIDATION ---
//     const validateForm = useCallback((): boolean => {
//         const errors: string[] = [];

//         if (formData.from_date && formData.to_date && formData.to_date < formData.from_date) {
//             errors.push("To Date cannot be earlier than From Date.");
//         }

//         if (formData.travel_financial_assistance === "Yes" && !formData.travel_mode_of_travel) {
//             errors.push("Please select the Mode of Travel.");
//         }

//         if (formData.travel_special_casual_leave === "Required") {
//             if (!formData.travel_leave_from_date || !formData.travel_leave_to_date) {
//                 errors.push("Please select Leave Period From Date and To Date.");
//             }
//             if (formData.travel_leave_to_date < formData.travel_leave_from_date) {
//                 errors.push("Leave To Date cannot be earlier than Leave From Date.");
//             }
//         }

//         if (formData.travel_station_leave_from_date && !formData.travel_station_leave_from_session) {
//             errors.push("Please select Station Leave session for From Date.");
//         }
//         if (formData.travel_station_leave_to_date && !formData.travel_station_leave_to_session) {
//             errors.push("Please select Station Leave session for To Date.");
//         }
//         if (formData.travel_station_leave_from_date && formData.travel_station_leave_to_date &&
//             formData.travel_station_leave_to_date < formData.travel_station_leave_from_date) {
//             errors.push("Station Leave To Date cannot be earlier than From Date.");
//         }

//         if (!formData.travel_declaration_accepted) {
//             errors.push("You must accept the declaration before submitting the form.");
//         }

//         setValidationErrors(errors);
//         return errors.length === 0;
//     }, [formData]);

//     // --- EVENT HANDLERS ---
//     const handleChange = useCallback((fieldname: string, value: any) => {
//         setFormData(prev => ({ ...prev, [fieldname]: value }));
//     }, []);

//     const handleFileChange = useCallback((fieldname: string, file: File | null) => {
//         setFormData(prev => ({ ...prev, [fieldname]: file }));
//     }, []);

//     const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
//         handleChange(fieldname, value);

//         if (fieldname === 'nature_of_travel' && value === 'International') {
//             const confirmed = window.confirm("Please select International only if the travel involves visiting a destination outside India.");
//             if (!confirmed) {
//                 handleChange(fieldname, '');
//                 return;
//             }
//         }

//         if (fieldname === 'webmail_id_travel' && value) {
//             try {
//                 const result = await fetchUserDetailsByEmail({ user_email: value });
//                 if (result?.message) {
//                     const user = result.message;
//                     setFormData(prev => ({
//                         ...prev,
//                         [fieldname]: value,
//                         applicant_name_travel: user.full_name || '',
//                         designation_travel: user.designation_name || user.designation || '',
//                         department_travel: user.department_name || user.department || ''
//                     }));
//                 }
//             } catch (err) {
//                 console.error('Failed to fetch user details:', err);
//             }
//         }

//         if (fieldname === 'other_traveler' && value) {
//             try {
//                 const result = await fetchUserDetailsByEmail({ user_email: value });
//                 if (result?.message) {
//                     const user = result.message;
//                     setFormData(prev => ({
//                         ...prev,
//                         [fieldname]: value,
//                         other_traveler_address: `${user.designation_name || ''}, ${user.department_name || ''}`
//                     }));
//                 }
//             } catch (err) {
//                 console.error('Failed to fetch traveler details:', err);
//             }
//         }
//     }, [handleChange, fetchUserDetailsByEmail]);

//     const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
//         setFormData(prev => {
//             const table = [...(prev[tableName] || [])];
//             table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
//             return { ...prev, [tableName]: table };
//         });
//     }, []);

//     const handleTableFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
//         setFormData(prev => {
//             const table = [...(prev[tableName] || [])];
//             table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
//             return { ...prev, [tableName]: table };
//         });
//     }, []);

//     const addTableRow = useCallback((tableName: string, newRow: Record<string, any>) => {
//         setFormData(prev => ({
//             ...prev,
//             [tableName]: [...(prev[tableName] || []), newRow]
//         }));
//     }, []);

//     const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
//         setFormData(prev => ({
//             ...prev,
//             [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex)
//         }));
//     }, []);

//     const handleSave = async () => {
//         if (isSubmitting) return;
//         setIsSubmitting(true);
//         try {
//             const data = await prepareFormDataForApi(formData);
//             if (editDocName) {
//                 data.name = editDocName;
//             }
//             const res = await saveForm({ doc_data: JSON.stringify(data) });

//             if (res?.message?.status === 'success') {
//                 const docname = res.message.docname || editDocName;
//                 setSavedDocName(docname);
//                 if (editDocName) {
//                     navigate(-1);
//                 }
//             } else {
//                 throw new Error(res?.message?.message || "Save failed");
//             }
//         } catch (err: any) {
//             console.error(saveError || err);
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (isSubmitting) return;

//         if (!validateForm()) {
//             return;
//         }

//         setIsSubmitting(true);
//         try {
//             const data = await prepareFormDataForApi(formData);
//             const saveRes = await saveForm({ doc_data: JSON.stringify(data) });

//             if (saveRes?.message?.status !== 'success') {
//                 throw new Error(saveRes?.message?.message || "Save failed during submission");
//             }

//             const docname = saveRes.message.docname;
//             const submitRes = await submitForm({ docname });
//             if (submitRes?.message?.status === 'success') {
//                 navigate(-1);
//             } else {
//                 throw new Error(submitRes?.message?.message || "Submission failed");
//             }
//         } catch (err: any) {
//             console.error(submitError || err);
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const visibleFields = useMemo(() => {
//         return fields.map(field => {
//             const f = { ...field };

//             if (f.depends_on) {
//                 const evalStr = String(f.depends_on).replace(/;$/, '');
//                 try {
//                     const match = evalStr.match(/doc\.(\w+)\s*==\s*['"]([^'"]+)['"]/);
//                     if (match) {
//                         const [, fieldName, expectedValue] = match;
//                         f.hidden = formData[fieldName] !== expectedValue ? 1 : 0;
//                     }
//                 } catch {
//                     f.hidden = 0;
//                 }
//             }

//             // Override specific fields to be Radio buttons for better UX
//             if (['nature_of_travel', 'travel_financial_assistance', 'travel_mode_of_travel'].includes(f.fieldname)) {
//                 f.fieldtype = 'Radio';
//             }

//             return f;
//         });
//     }, [fields, formData]);

//     if (loading) {
//         return (
//             <div className="flex items-center justify-center min-h-screen bg-claude-bg dark:bg-zinc-900">
//                 <div className="text-center">
//                     <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-200 border-t-[#D97757] dark:border-zinc-700 dark:border-t-[#D97757] mx-auto"></div>
//                     <p className="mt-4 font-sans text-sm text-zinc-500 dark:text-zinc-400">Loading form...</p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen font-sans">
//             <AppSidebar />

//             <button
//                 onClick={toggleTheme}
//                 className="fixed top-4 right-4 p-2 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700/50 transition-colors z-50"
//                 aria-label="Toggle theme"
//             >
//                 {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
//             </button>

//             <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//                 <header className="mb-8">
//                     <div className="flex items-center gap-3">
//                         <button
//                             onClick={() => navigate(-1)}
//                             className="p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
//                         >
//                             <ArrowLeft className="h-5 w-5" />
//                         </button>
//                         <div>
//                             <h1 className="font-serif text-2xl font-medium tracking-tight text-zinc-800 dark:text-zinc-200">
//                                 {editDocName ? `Edit Travel: ${editDocName}` : 'Travel Application'}
//                             </h1>
//                             {projectName && (
//                                 <p className="font-sans text-sm text-zinc-500 dark:text-zinc-400 mt-1">
//                                     For Project: {projectName}
//                                 </p>
//                             )}
//                         </div>
//                     </div>
//                 </header>

//                 {validationErrors.length > 0 && (
//                     <div className="mb-6 p-4 bg-red-50/50 border border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-900">
//                         <h4 className="font-sans text-xs uppercase tracking-wider text-red-700 dark:text-red-400 font-semibold mb-2 flex items-center gap-2">
//                             <AlertCircle className="h-4 w-4" />
//                             Please fix the following errors
//                         </h4>
//                         <ul className="font-sans text-sm text-red-600 dark:text-red-300 space-y-1">
//                             {validationErrors.map((err, idx) => (
//                                 <li key={idx} className="flex items-start gap-2">
//                                     <span className="text-red-400 dark:text-red-600">•</span>
//                                     {err}
//                                 </li>
//                             ))}
//                         </ul>
//                     </div>
//                 )}

//                 <form onSubmit={handleSubmit}>
//                     <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
//                         <div className="lg:col-span-3 space-y-6">
//                             <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm p-6 md:p-8">
//                                 <DynamicFormRenderer
//                                     fields={visibleFields}
//                                     formData={formData}
//                                     linkOptions={linkOptions}
//                                     onChange={handleChange}
//                                     onFileChange={handleFileChange}
//                                     onTableRowChange={handleTableRowChange}
//                                     onTableFileChange={handleTableFileChange}
//                                     onAddTableRow={addTableRow}
//                                     onDeleteTableRow={deleteTableRow}
//                                     onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
//                                 />

//                                 <div className="mt-6">
//                                     <EstimateValidation formData={formData} />
//                                 </div>
//                             </div>

//                             <div className="flex justify-end gap-3">
//                                 <button
//                                     onClick={handleSave}
//                                     disabled={isSubmitting}
//                                     type="button"
//                                     className={cn(
//                                         "rounded-lg px-4 py-2 font-medium transition-all duration-200",
//                                         "disabled:opacity-50 disabled:cursor-not-allowed",
//                                         "focus:outline-none focus:ring-2 focus:ring-zinc-100 dark:focus:ring-zinc-700",
//                                         "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50",
//                                         "dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700/50"
//                                     )}
//                                 >
//                                     {isSubmitting ? 'Saving...' : 'Save Draft'}
//                                 </button>
//                                 <button
//                                     type="submit"
//                                     disabled={isSubmitting || !savedDocName}
//                                     className={cn(
//                                         "rounded-lg px-4 py-2 font-medium transition-all duration-200",
//                                         "disabled:opacity-50 disabled:cursor-not-allowed",
//                                         "focus:outline-none focus:ring-2 focus:ring-zinc-100 dark:focus:ring-zinc-700",
//                                         "bg-[#D97757] text-white hover:opacity-90",
//                                         "dark:bg-[#D97757] dark:text-white"
//                                     )}
//                                 >
//                                     {isSubmitting ? 'Submitting...' : 'Submit Application'}
//                                 </button>
//                             </div>
//                         </div>

//                         <div className="lg:col-span-1">
//                             <FundDetailsSidebar projectCode={formData.travel_project_title || projectName} />
//                         </div>
//                     </div>
//                 </form>
//             </main>
//         </div>
//     );
// };

// export default TravelForm;
