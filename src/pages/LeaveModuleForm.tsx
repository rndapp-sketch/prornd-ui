import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeAuth, useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppSidebar } from '@/components/RndSidebar';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { leaveModuleAPI, prepareFormDataForApi } from '@/services/apiService';

// -----------------------------------------------------------------------
// HOW THIS FORM PAGE WORKS (for learning):
//
// This follows the EXACT same pattern as TravelForm.tsx. Here's the flow:
//
// 1. ON MOUNT:
//    - Calls `get_leave_module_fields` API (via leaveModuleAPI.getFields)
//    - Backend returns:
//      a) fields[] — metadata about each form field (name, type, label,
//         depends_on expressions, etc.)
//      b) prefill_data — default values (e.g., current user's email, PI)
//      c) link_options — dropdown options for Link/Select fields
//
// 2. FORM RENDERING:
//    - <DynamicFormRenderer /> takes the fields[] and renders the form
//    - It evaluates `depends_on` expressions to show/hide fields
//      e.g., "eval:doc.leave_type == 'CL'" → only show CL date picker
//           when leave_type is CL
//    - It handles all field types: Date, Select, Table, Attach, etc.
//
// 3. SAVE DRAFT:
//    - Calls `save_leave_module_data` with the form data as JSON
//    - Backend creates a new Leave Module doc with workflow_state = "Draft"
//    - Returns the document name (e.g., "LM-00001")
//    - We store this name so the Submit button knows which doc to submit
//
// 4. SUBMIT:
//    - First saves the form (to capture any last changes)
//    - Then calls `submit_leave_module` with the docname
//    - Backend transitions: Draft → Pending PI Approval
//    - User is redirected back to the listing page
//
// KEY CONCEPT: Save vs Submit
//   - "Save" = create/update the document, keeps it in "Draft" state
//   - "Submit" = trigger the workflow, moves it to the next state
//   - You MUST save before submitting (the submit needs a docname)
// -----------------------------------------------------------------------

// Response type from the getFields API
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
    };
}

// Styled card wrapper (same as TravelForm)
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-[#FFFFFF] dark:bg-[#27272A] p-4 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow", className)}>
        {children}
    </div>
);

// Styled button (same as TravelForm)
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

const LeaveModuleForm = () => {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();

    // --- LEAVE BALANCE GUARD ---
    const [totalAbsents, setTotalAbsents] = useState<number | null>(null);

    const { data: leaveBalanceData } = useFrappeGetCall<{
        message: { el: number; cl: number } | null;
    }>(
        leaveModuleAPI.getLeaveBalance,
        {},
        {
            enabled: !!currentUser,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    useEffect(() => {
        if (!currentUser) return;
        const username = currentUser.split('@')[0];
        fetch(`/attendance-api/attendance/absents/${username}`)
            .then((res) => res.json())
            .then((result) => {
                if (result.success && result.data) {
                    setTotalAbsents(result.data.totalAbsents);
                }
            })
            .catch(() => {});
    }, [currentUser]);

    const leaveBalance = leaveBalanceData?.message;

    const { actualCL, actualEL, canApplyLeave, balanceLoaded } = useMemo(() => {
        const loaded = leaveBalance !== undefined && totalAbsents !== null;
        if (!loaded) return { actualCL: 0, actualEL: 0, canApplyLeave: true, balanceLoaded: false };

        const rawCL = leaveBalance?.cl ?? 0;
        const rawEL = leaveBalance?.el ?? 0;
        const absents = totalAbsents ?? 0;

        let remainingAbsents = absents;
        let computedCL = rawCL;
        let computedEL = rawEL;

        if (remainingAbsents > 0) {
            const clDeduction = Math.min(remainingAbsents, rawCL);
            computedCL = rawCL - clDeduction;
            remainingAbsents -= clDeduction;
        }
        if (remainingAbsents > 0) {
            computedEL = rawEL - Math.ceil(remainingAbsents);
        }

        const allowed = computedCL > 0 || computedEL > 0;
        return { actualCL: computedCL, actualEL: computedEL, canApplyLeave: allowed, balanceLoaded: true };
    }, [leaveBalance, totalAbsents]);

    // --- STATE ---
    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [savedDocName, setSavedDocName] = useState<string | null>(null);

    // --- API HOOKS ---
    // Each useFrappePostCall gives us a `call` function and result/error tracking
    const { call: fetchFormData, result: formDataResult, error: formDataError } =
        useFrappePostCall<FormDataResponse>(leaveModuleAPI.getFields);
    const { call: saveForm } =
        useFrappePostCall(leaveModuleAPI.save);
    const { call: submitForm } =
        useFrappePostCall(leaveModuleAPI.submit);

    // --- FETCH FORM METADATA ON MOUNT ---
    useEffect(() => {
        if (!dataLoaded) {
            // Pass doc_name=null for a new form (backend will prefill user info)
            fetchFormData({ doc_name: null });
        }
    }, []);

    // --- PROCESS API RESPONSE ---
    useEffect(() => {
        if (formDataResult?.message && !dataLoaded) {
            const { fields: apiFields, prefill_data, link_options } = formDataResult.message;

            setFields(apiFields || []);
            setLinkOptions(link_options || {});

            // Set initial form data from prefill + defaults
            const initialData = { ...prefill_data };
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
            alert("Error: Could not load the Leave form.");
            setLoading(false);
        }
    }, [formDataResult, formDataError, dataLoaded]);

    // --- VALIDATION ---
    const validateForm = useCallback((): boolean => {
        const errors: string[] = [];

        if (!formData.leave_type) {
            errors.push("Please select the Nature of Leave.");
        }

        // CL validation
        if (formData.leave_type === 'CL') {
            if (balanceLoaded && actualCL <= 0) {
                errors.push("Cannot apply for CL — your actual Casual Leave balance is 0 or exhausted.");
            }
            if (!formData.cl_dates_table || formData.cl_dates_table.length === 0) {
                errors.push("Please select at least one CL date.");
            }
        }

        // EL balance check
        if (formData.leave_type === 'EL') {
            if (balanceLoaded && actualEL <= 0) {
                errors.push("Cannot apply for EL — your actual Earned Leave balance is 0 or exhausted.");
            }
        }

        // EL / On Duty Leave validation
        if (formData.leave_type === 'EL' || formData.leave_type === 'On Duty Leave') {
            if (!formData.from_date) errors.push("From Date is required.");
            if (!formData.to_date) errors.push("To Date is required.");
            if (formData.from_date && formData.to_date && formData.from_date > formData.to_date) {
                errors.push("From Date cannot be after To Date.");
            }
        }

        // Station leave date validation
        if (formData.station_leave_permission === 'Required') {
            if (formData.sl_from_date && formData.sl_to_date && formData.sl_from_date > formData.sl_to_date) {
                errors.push("Station Leave From cannot be after Station Leave To.");
            }
        }

        if (!formData.reason_for_leave) errors.push("Reason for Leave is required.");
        if (!formData.address_on_leave) errors.push("Address on Leave is required.");
        if (!formData.contact_number) {
            errors.push("Contact Number is required.");
        } else if (!/^\d{10}$/.test(formData.contact_number)) {
            errors.push("Contact Number must be exactly 10 digits.");
        }

        setValidationErrors(errors);
        if (errors.length > 0) {
            alert("Please fix the following errors:\n" + errors.join("\n"));
        }
        return errors.length === 0;
    }, [formData]);

    // --- EVENT HANDLERS ---
    // These are passed to DynamicFormRenderer as callbacks

    const handleChange = useCallback((fieldname: string, value: any) => {
        if (fieldname === 'contact_number') {
            // Only allow digits, max 10 characters
            value = String(value).replace(/\D/g, '').slice(0, 10);
        }
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [fieldname]: file }));
    }, []);

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
            [tableName]: [...(prev[tableName] || []), newRow],
        }));
    }, []);

    const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
        setFormData(prev => ({
            ...prev,
            [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex),
        }));
    }, []);

    // --- SAVE DRAFT ---
    const handleSave = async () => {
        if (isSubmitting) return;
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);
            if (savedDocName) {
                data.name = savedDocName;
            }
            const res = await saveForm({ data: JSON.stringify(data) });

            if (res?.message?.status === 'success') {
                const docname = res.message.docname;
                setSavedDocName(docname);
                alert("Draft saved successfully!");
            } else {
                throw new Error(res?.message?.message || "Save failed");
            }
        } catch (err: any) {
            console.error("Save error:", err);
            alert(`Save failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- SUBMIT ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            // Step 1: Save first (to capture latest changes)
            const data = await prepareFormDataForApi(formData);
            if (savedDocName) {
                data.name = savedDocName;
            }
            const saveRes = await saveForm({ data: JSON.stringify(data) });

            if (saveRes?.message?.status !== 'success') {
                throw new Error(saveRes?.message?.message || "Save failed during submission");
            }

            const docname = saveRes.message.docname;

            // Step 2: Submit (triggers workflow: Draft → Pending PI Approval)
            const submitRes = await submitForm({ docname });
            if (submitRes?.message?.status === 'success') {
                alert("Leave application submitted successfully!");
                navigate('/leave-module');
            } else {
                throw new Error(submitRes?.message?.message || "Submission failed");
            }
        } catch (err: any) {
            console.error("Submit error:", err);
            alert(`Submission failed: ${err.message || "Please check the console for details."}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- PROCESS depends_on VISIBILITY ---
    // DynamicFormRenderer handles most of this, but we can also pre-process here
    const visibleFields = useMemo(() => {
        return fields.map(field => ({ ...field }));
    }, [fields, formData]);

    // --- BLOCKED SCREEN (leave balance exhausted) ---
    if (balanceLoaded && !canApplyLeave) {
        return (
            <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                    <PageHeader title="New Leave Application" />
                    <div className="max-w-xl mx-auto mt-16 text-center">
                        <div className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800 rounded-2xl p-8 shadow-sm">
                            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-5">
                                <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                                Leave Application Not Allowed
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                                Your actual leave balance is exhausted after deducting absences.
                            </p>
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3">
                                    <p className="text-xs text-zinc-500 uppercase">Actual CL</p>
                                    <p className={`text-lg font-bold ${actualCL <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>{actualCL}</p>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3">
                                    <p className="text-xs text-zinc-500 uppercase">Actual EL</p>
                                    <p className={`text-lg font-bold ${actualEL <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>{actualEL}</p>
                                </div>
                            </div>
                            <p className="text-xs text-zinc-400 mb-6">
                                Absents ({totalAbsents}) are first deducted from CL, then from EL. Please contact your PI or Admin for assistance.
                            </p>
                            <button
                                onClick={() => navigate('/leave-module')}
                                className="inline-flex items-center px-5 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
                            >
                                ← Back to Leave Applications
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // --- LOADING STATE ---
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg dark:bg-zinc-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent mx-auto" />
                    <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">Loading form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader title="New Leave Application" />

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
                        />
                    </FrappeCard>

                    {/* Save & Submit Buttons */}
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
                            disabled={isSubmitting || !savedDocName}
                            className="bg-[#D97757] text-white hover:opacity-90 shadow-sm"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </FrappeButton>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default LeaveModuleForm;
