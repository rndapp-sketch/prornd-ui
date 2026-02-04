
// -=-=-=-=-=-=
import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../components/RndSidebar";
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from "lucide-react";
import useUserRoleCheck from "../components/UserRoleCheck";

// --- TYPE DEFINITIONS ---
interface Field {
    description: any;
    fieldname: string;
    label: string | null;
    fieldtype: string;
    mandatory: number;
    read_only: number;
    hidden: number;
    options?: string | null;
    default?: any;
}
interface LinkOption {
    value: string;
    label: string;
    project_proposal?: string;
    refnum_prj_num?: string;
}
interface FormDataResponse {
    message: {
        fields: Field[];
        link_options: { [key: string]: LinkOption[] };
        prefill_data: { [key: string]: any };
        related_project_data: { [key: string]: any };
    }
}

interface FormData {
    [key: string]: any;
    fund_transactions?: (any & { id?: string })[];
    received_amt_breakup?: (any & { id?: string })[];
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const inputClasses = "w-full h-12 px-4 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.25)] focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100 read-only:bg-gray-100";
const FrappeCard = ({ children, className }: any) => (<div className={cn("bg-white p-6 md:p-8 border border-gray-200 rounded-xl shadow-sm", className)}>{children}</div>);
const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: any) => (<button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-2.5 border border-gray-200 rounded-lg font-semibold text-gray-700 bg-white shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button>);
const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-3">{title}</h2>{children}</div>);

// --- MEMOIZED TABLE COMPONENTS ---
const MemoizedTransactionsTable = memo(({ tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => {
    return (
        <div>
            <h3 className="text-xl font-bold text-black mb-4">Transaction Details</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr className="divide-x divide-gray-100">
                            {['Transaction Number', 'Date', 'Amount (₹)', 'Attachment', ''].map((h) => (
                                <th key={h} className="p-3 font-semibold text-gray-700 text-sm text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {(tableData || []).map((row: any, i: number) => (
                            <tr key={row.id || i} className="divide-x divide-gray-100">
                                <td className="p-2">
                                    <input type="text" className={`${inputClasses} !h-11`}
                                        value={row.transaction_number || ''}
                                        onChange={e => onRowChange(i, 'transaction_number', e.target.value)}
                                        placeholder="Transaction ID" />
                                </td>
                                <td className="p-2">
                                    <input type="date" className={`${inputClasses} !h-11`}
                                        value={row.transaction_date || ''}
                                        onChange={e => onRowChange(i, 'transaction_date', e.target.value)} />
                                </td>
                                <td className="p-2">
                                    <input type="number" step="0.01" className={`${inputClasses} !h-11`}
                                        value={row.amount || ''}
                                        onChange={e => onRowChange(i, 'amount', e.target.value)}
                                        placeholder="0.00" />
                                </td>
                                <td className="p-2">
                                    <input type="file" className={`${inputClasses} !h-11 file:mr-2`}
                                        onChange={e => onFileChange(i, 'attachment', e.target.files?.[0] || null)} />
                                    {row.attachment_name && <span className="text-xs text-gray-500 mt-1 block">{row.attachment_name}</span>}
                                </td>
                                <td className="p-2 text-center">
                                    <FrappeButton onClick={() => onDeleteRow(i)} className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</FrappeButton>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <FrappeButton onClick={() => onAddRow({ transaction_number: '', transaction_date: '', amount: '', attachment: null })} className="bg-[#A5D6A7] hover:bg-[#81C784] mt-4">
                + Add Transaction
            </FrappeButton>
        </div>
    );
});

// Progress Bar Component
const ProgressBar = ({ current, total, label, showWarning }: { current: number; total: number; label: string; showWarning: boolean }) => {
    const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
    const isOverLimit = current > total;

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
                <span className={isOverLimit ? 'text-red-600' : 'text-gray-700'}>{label}</span>
                <span className={isOverLimit ? 'text-red-600 font-bold' : 'text-gray-600'}>
                    ₹{current.toLocaleString()} / ₹{total.toLocaleString()}
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                        isOverLimit
                            ? 'bg-red-600'
                            : percentage > 90
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showWarning && isOverLimit && (
                <p className="text-xs text-red-600 font-semibold">⚠️ Exceeds limit by ₹{(current - total).toLocaleString()}</p>
            )}
        </div>
    );
};

// Validation Alert Component
const ValidationAlert = ({ isValid, message, type = 'total' }: { isValid: boolean; message: string; type?: 'total' | 'head' }) => {
    if (!message || message === 'No sanction selected') return null;

    return (
        <div className={`p-3 rounded-lg border ${
            isValid
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-300 text-red-800'
        }`}>
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
};

const MemoizedBudgetBreakupTable = memo(({ tableData, onRowChange, onAddRow, onDeleteRow, budgetHeadOptions }: any) => {
    const options = budgetHeadOptions.length > 0 ? budgetHeadOptions : ['Consumables', 'Equipment', 'Contingency', 'Travel', 'Manpower', 'Overhead', 'Other'];
    return (
        <div>
            <h3 className="text-xl font-bold text-black mb-4">Budget Breakup of Received Amount</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr className="divide-x divide-gray-100">
                            {['Account Head', 'Amount (₹)', 'Remarks', ''].map((h) => (
                                <th key={h} className="p-3 font-semibold text-gray-700 text-sm text-left">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {(tableData || []).map((row: any, i: number) => (
                            <tr key={row.id || i} className="divide-x divide-gray-100">
                                <td className="p-2">
                                    <select className={`${inputClasses} !h-11`}
                                        value={row.account_head || ''}
                                        onChange={e => onRowChange(i, 'account_head', e.target.value)}>
                                        <option value="">Select Account Head...</option>
                                        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </td>
                                <td className="p-2">
                                    <input type="number" step="0.01" className={`${inputClasses} !h-11`}
                                        value={row.amount_received || ''}
                                        onChange={e => onRowChange(i, 'amount_received', e.target.value)}
                                        placeholder="0.00" />
                                </td>
                                <td className="p-2">
                                    <input type="text" className={`${inputClasses} !h-11`}
                                        value={row.remarks || ''}
                                        onChange={e => onRowChange(i, 'remarks', e.target.value)}
                                        placeholder="Remarks" />
                                </td>
                                <td className="p-2 text-center">
                                    <FrappeButton onClick={() => onDeleteRow(i)} className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm">Delete</FrappeButton>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <FrappeButton onClick={() => onAddRow({ account_head: '', amount_received: '', remarks: '' })} className="bg-[#A5D6A7] hover:bg-[#81C784] mt-4">
                + Add Budget Item
            </FrappeButton>
        </div>
    );
});

// Validation state interface
interface ValidationState {
    totalValidation: {
        isValid: boolean;
        message: string;
        currentTotal: number;
        previousTotal: number;
        sanctionedTotal: number;
        remaining: number;
    };
    headValidations: Record<string, {
        isValid: boolean;
        message: string;
        currentTotal: number;
        previousTotal: number;
        sanctionedLimit: number;
        remaining: number;
    }>;
}

const AddFundReceived: React.FC = () => {
    const navigate = useNavigate();
    const { projectName } = useParams<{ projectName: string }>();
    const isPermanentEmployee = useUserRoleCheck();

    const [fields, setFields] = useState<Field[]>([]);
    const [formData, setFormData] = useState<FormData>({
        fund_transactions: [],
        received_amt_breakup: []
    });
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [budgetHeadOptions, setBudgetHeadOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationState, setValidationState] = useState<ValidationState>({
        totalValidation: {
            isValid: true,
            message: '',
            currentTotal: 0,
            previousTotal: 0,
            sanctionedTotal: 0,
            remaining: 0
        },
        headValidations: {}
    });

    const { call: fetchFormData, result, error } = useFrappePostCall<FormDataResponse>('rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_fields');
    const { call: submitForm, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_received.fund_received.save_fund_received');
    const { call: fetchBudgetHeads, result: budgetHeadsResult } = useFrappePostCall('rndopsapp.rndopsapp.doctype.budget_head.budget_head.get_budget_head');

    // Fetch sanction details for the project
    const { data: sanctionData, isLoading: sanctionLoading } = useFrappeGetCall(
        'rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project',
        { project_name: projectName },
        { revalidateOnFocus: false }
    );

    // Fetch previous Fund Received Data for validation
    const { data: previousFundsData } = useFrappeGetCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
        { prjreg_title: projectName, limit: 1000 },
        { revalidateOnFocus: false, isPaused: () => !projectName }
    );

    useEffect(() => {
        if (projectName) {
            fetchFormData({ doc_name: projectName });
        }
        fetchBudgetHeads({});
    }, [fetchFormData, fetchBudgetHeads, projectName]);

    useEffect(() => {
        if (budgetHeadsResult?.message) {
            const heads = budgetHeadsResult.message.map((item: any) => item.budget_head);
            setBudgetHeadOptions(heads);
        }
    }, [budgetHeadsResult]);

    useEffect(() => {
        if (result?.message) {
            const { fields: apiFields, link_options, prefill_data, related_project_data } = result.message;

            if (Array.isArray(apiFields)) {
                const prefillData: { [key: string]: any } = {
                    ...(prefill_data || {}),
                    prjreg_title: related_project_data?.name || projectName,
                    prj_type: related_project_data?.project_type || '',
                };

                const processedFields = apiFields.map(field => {
                    if (field.fieldtype === 'Section Break') return field;
                    if (prefillData[field.fieldname] !== undefined) {
                        return { ...field, default: prefillData[field.fieldname] };
                    }
                    if (field.fieldname === 'gst_invoice_issued' && !field.default) {
                        return { ...field, default: "No" };
                    }
                    return field;
                });

                setFields(processedFields);
                // Initialize formData with prefill values
                setFormData(prev => ({
                    ...prev,
                    ...prefillData,
                    fund_transactions: [],
                    received_amt_breakup: []
                }));
            }
            setLinkOptions(prev => ({ ...prev, ...(link_options || {}) }));
            setLoading(false);
        }
        if (error) {
            console.error("Failed to load form data:", error);
            alert("Failed to load form data.");
            setLoading(false);
        }
    }, [result, error, projectName]);

    // GST invoice visibility handler
    useEffect(() => {
        const gstValue = formData.gst_invoice_issued;
        const invoiceContainer = document.getElementById('invoice_no_container');
        if (invoiceContainer) {
            invoiceContainer.style.display = gstValue === 'Yes' ? 'grid' : 'none';
        }
    }, [formData.gst_invoice_issued]);

    // Real-time validation function
    const performValidation = useCallback(() => {
        const selectedSanction = formData.sanction_ref_no
            ? sanctionData?.message?.find((s: any) => s.name === formData.sanction_ref_no)
            : sanctionData?.message?.[0];

        if (!selectedSanction) {
            setValidationState({
                totalValidation: {
                    isValid: true,
                    message: 'No sanction selected',
                    currentTotal: 0,
                    previousTotal: 0,
                    sanctionedTotal: 0,
                    remaining: 0
                },
                headValidations: {}
            });
            return;
        }

        // 1. Calculate Previous Totals (Total & Per Head)
        let prevTotal = 0;
        const prevHeadTotals: Record<string, number> = {};

        const rawFunds = previousFundsData?.message?.message || previousFundsData?.message || [];
        const relevantFunds = Array.isArray(rawFunds)
            ? rawFunds.filter((f: any) => f.sanction_ref_no === selectedSanction.name)
            : [];

        relevantFunds.forEach((fund: any) => {
            if (fund.received_amt_breakup && Array.isArray(fund.received_amt_breakup)) {
                fund.received_amt_breakup.forEach((item: any) => {
                    const amt = item.amount_received || 0;
                    const head = item.account_head;
                    prevTotal += amt;
                    if (head) {
                        prevHeadTotals[head] = (prevHeadTotals[head] || 0) + amt;
                    }
                });
            }
        });

        // 2. Calculate Current Totals from Form Data
        let currentTotal = 0;
        const currentHeadTotals: Record<string, number> = {};

        (formData.received_amt_breakup || []).forEach((row: any) => {
            const amt = row.amount_received ? parseFloat(row.amount_received) : 0;
            const head = row.account_head;
            currentTotal += amt;
            if (head) {
                currentHeadTotals[head] = (currentHeadTotals[head] || 0) + amt;
            }
        });

        // 3. Validate Total Amount
        const totalSanctioned = selectedSanction.total_sanctioned_amount || 0;
        const newTotalReceived = prevTotal + currentTotal;
        const remainingTotal = totalSanctioned - newTotalReceived;

        const totalValidation = {
            isValid: newTotalReceived <= totalSanctioned,
            message: newTotalReceived > totalSanctioned
                ? `⚠️ EXCEEDS sanctioned amount by ₹${(newTotalReceived - totalSanctioned).toLocaleString()}`
                : remainingTotal > 0
                    ? `✓ ₹${remainingTotal.toLocaleString()} remaining`
                    : '✓ Full amount utilized',
            currentTotal,
            previousTotal: prevTotal,
            sanctionedTotal: totalSanctioned,
            remaining: remainingTotal
        };

        // 4. Validate Head-wise Amount
        const sanctionedHeadMap: Record<string, number> = {};
        if (selectedSanction.sanctioned_budget_breakup && Array.isArray(selectedSanction.sanctioned_budget_breakup)) {
            const yearKeys = ['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget'];
            selectedSanction.sanctioned_budget_breakup.forEach((row: any) => {
                const headTotalSanctioned = yearKeys.reduce((sum, key) => sum + (row[key] || 0), 0);
                sanctionedHeadMap[row.account_head] = headTotalSanctioned;
            });
        }

        const headValidations: Record<string, any> = {};

        // Check all heads that have sanctioned amounts
        Object.keys(sanctionedHeadMap).forEach(head => {
            const currentAmt = currentHeadTotals[head] || 0;
            const prevAmt = prevHeadTotals[head] || 0;
            const totalForHead = prevAmt + currentAmt;
            const limit = sanctionedHeadMap[head];
            const remaining = limit - totalForHead;

            headValidations[head] = {
                isValid: totalForHead <= limit,
                message: totalForHead > limit
                    ? `⚠️ EXCEEDS by ₹${(totalForHead - limit).toLocaleString()}`
                    : remaining > 0
                        ? `✓ ₹${remaining.toLocaleString()} remaining`
                        : '✓ Fully utilized',
                currentTotal: currentAmt,
                previousTotal: prevAmt,
                sanctionedLimit: limit,
                remaining
            };
        });

        setValidationState({
            totalValidation,
            headValidations
        });
    }, [formData, sanctionData, previousFundsData]);

    // Trigger validation whenever form data changes
    useEffect(() => {
        performValidation();
    }, [performValidation]);

    // --- FORM HANDLERS ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    // --- TABLE HANDLERS ---
    const handleTransactionRowChange = useCallback((rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const table = [...(prev.fund_transactions || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
            return { ...prev, fund_transactions: table };
        });
    }, []);

    const handleTransactionFileChange = useCallback((rowIndex: number, fieldname: string, file: File | null) => {
        setFormData(prev => {
            const table = [...(prev.fund_transactions || [])];
            table[rowIndex] = {
                ...table[rowIndex],
                [fieldname]: file,
                attachment_name: file?.name || ''
            };
            return { ...prev, fund_transactions: table };
        });
    }, []);

    const addTransactionRow = useCallback((newRow: object) => {
        const newId = Date.now().toString();
        setFormData(prev => ({
            ...prev,
            fund_transactions: [...(prev.fund_transactions || []), { ...newRow, id: newId }]
        }));
    }, []);

    const deleteTransactionRow = useCallback((rowIndex: number) => {
        setFormData(prev => ({
            ...prev,
            fund_transactions: (prev.fund_transactions || []).filter((_: any, i: number) => i !== rowIndex)
        }));
    }, []);

    const handleBudgetRowChange = useCallback((rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const table = [...(prev.received_amt_breakup || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
            return { ...prev, received_amt_breakup: table };
        });
    }, []);

    const addBudgetRow = useCallback((newRow: object) => {
        const newId = Date.now().toString();
        setFormData(prev => ({
            ...prev,
            received_amt_breakup: [...(prev.received_amt_breakup || []), { ...newRow, id: newId }]
        }));
    }, []);

    const deleteBudgetRow = useCallback((rowIndex: number) => {
        setFormData(prev => ({
            ...prev,
            received_amt_breakup: (prev.received_amt_breakup || []).filter((_: any, i: number) => i !== rowIndex)
        }));
    }, []);

    // --- FILE HANDLING & SUBMISSION ---
    const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        // --- ENHANCED VALIDATION LOGIC WITH DETAILED MESSAGES ---
        try {
            // Check if overall validation state is valid
            if (!validationState.totalValidation.isValid) {
                const { currentTotal, previousTotal, sanctionedTotal } = validationState.totalValidation;
                const exceeded = (currentTotal + previousTotal) - sanctionedTotal;
                throw new Error(
                    `❌ TOTAL FUND VALIDATION FAILED\n\n` +
                    `Total Fund Received: ₹${(currentTotal + previousTotal).toLocaleString()}\n` +
                    `Sanctioned Amount: ₹${sanctionedTotal.toLocaleString()}\n` +
                    `Exceeded By: ₹${exceeded.toLocaleString()}\n\n` +
                    `Breakdown:\n` +
                    `- Previously Received: ₹${previousTotal.toLocaleString()}\n` +
                    `- Current Entry: ₹${currentTotal.toLocaleString()}\n\n` +
                    `Please reduce the current fund amount to stay within sanctioned limits.`
                );
            }

            // Check head-wise validations
            const invalidHeads = Object.entries(validationState.headValidations)
                .filter(([_, validation]) => !validation.isValid);

            if (invalidHeads.length > 0) {
                const errorDetails = invalidHeads.map(([head, validation]) => {
                    const exceeded = (validation.currentTotal + validation.previousTotal) - validation.sanctionedLimit;
                    return (
                        `\n📌 ${head}:\n` +
                        `   Total: ₹${(validation.currentTotal + validation.previousTotal).toLocaleString()} ` +
                        `(Limit: ₹${validation.sanctionedLimit.toLocaleString()})\n` +
                        `   Exceeded by: ₹${exceeded.toLocaleString()}\n` +
                        `   - Previous: ₹${validation.previousTotal.toLocaleString()}\n` +
                        `   - Current: ₹${validation.currentTotal.toLocaleString()}`
                    );
                }).join('\n');

                throw new Error(
                    `❌ BUDGET HEAD VALIDATION FAILED\n\n` +
                    `${invalidHeads.length} budget head(s) exceed sanctioned limits:` +
                    errorDetails +
                    `\n\nPlease adjust the amounts for these budget heads.`
                );
            }

            // Get selected sanction for final validation
            const selectedSanction = formData.sanction_ref_no
                ? sanctionData?.message?.find((s: any) => s.name === formData.sanction_ref_no)
                : sanctionData?.message?.[0];

            if (!selectedSanction) {
                throw new Error("❌ No Sanction details found. Please select a sanction reference before submitting.");
            }

            // Validation passed - log success
            console.log('✅ All validations passed:', {
                total: validationState.totalValidation,
                heads: validationState.headValidations
            });
        } catch (validationError: any) {
            alert(validationError.message);
            setIsSubmitting(false);
            return;
        }

        try {
            const dataToSubmit: { [key: string]: any } = {};

            // Collect regular form fields from formData state
            fields.forEach(field => {
                if (field.fieldtype !== 'Table' && field.fieldtype !== 'Section Break' && !field.hidden) {
                    if (formData[field.fieldname] !== undefined) {
                        dataToSubmit[field.fieldname] = formData[field.fieldname];
                    }
                }
            });

            // Process fund transactions table
            dataToSubmit.fund_transactions = await Promise.all(
                (formData.fund_transactions || []).map(async (row: any) => {
                    if (!row.transaction_number && !row.transaction_date && (!row.amount || parseFloat(row.amount) === 0)) {
                        return null;
                    }
                    let fileData = {};
                    if (row.attachment instanceof File) {
                        try {
                            const base64 = await toBase64(row.attachment);
                            fileData = {
                                file_name: row.attachment.name,
                                file_data: base64.split(',')[1]
                            };
                        } catch (fileError) {
                            console.error('Error processing file:', fileError);
                        }
                    }
                    return {
                        transaction_number: row.transaction_number || "",
                        transaction_date: row.transaction_date || "",
                        amount: row.amount ? parseFloat(row.amount) : 0,
                        sanction_ref_no: formData.sanction_ref_no || null,
                        ...fileData,
                    };
                })
            );
            dataToSubmit.fund_transactions = dataToSubmit.fund_transactions.filter((r: any) => r !== null);

            // Process received amount breakup table
            dataToSubmit.received_amt_breakup = (formData.received_amt_breakup || []).map((row: any) => {
                if (!row.account_head && (!row.amount_received || parseFloat(row.amount_received) === 0)) {
                    return null;
                }
                return {
                    account_head: row.account_head || "",
                    amount_received: row.amount_received ? parseFloat(row.amount_received) : 0,
                    sanction_ref_no: formData.sanction_ref_no || null,
                    remarks: row.remarks || "",
                };
            }).filter((r: any) => r !== null);

            console.log('Submitting data:', dataToSubmit);
            await submitForm({ doc_data: JSON.stringify(dataToSubmit) });
            alert("Fund Received entry saved successfully!");
            navigate(-1);
        } catch (err: any) {
            console.error('Submission error:', submitError || err);
            alert(`Submission Failed: ${err.message || 'Unknown Error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderFormField = (field: Field) => {
        if (!field || field.hidden || field.fieldtype === 'Section Break') return null;

        const commonProps = {
            id: field.fieldname,
            name: field.fieldname,
            className: inputClasses,
            readOnly: field.read_only === 1,
            required: field.mandatory === 1,
            disabled: field.read_only === 1,
            value: formData[field.fieldname] ?? field.default ?? '',
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => handleChange(field.fieldname, e.target.value)
        };

        const renderInput = () => {
            switch (field.fieldtype) {
                case "Link":
                    let linkOpts = linkOptions[field.fieldname] || [];
                    if (field.fieldname === 'prjreg_title' && linkOpts.length === 0 && linkOptions.prjreg_refnum) {
                        linkOpts = linkOptions.prjreg_refnum;
                    }
                    return (
                        <select {...commonProps}>
                            <option value="">Select..</option>
                            {linkOpts.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    );
                case "Select":
                    if (field.fieldname === 'sanction_ref_no' && linkOptions.sanction_ref_no) {
                        return (
                            <select {...commonProps}>
                                <option value="">Select Sanction Reference...</option>
                                {linkOptions.sanction_ref_no.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label} ({opt.value})</option>
                                ))}
                            </select>
                        );
                    }
                    const selectOpts = field.options?.split('\n').filter(o => o).map(o => ({ value: o, label: o })) || [];
                    return (
                        <select {...commonProps}>
                            <option value="">Select...</option>
                            {selectOpts.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    );
                case "Currency":
                    return <input type="number" step="0.01" {...commonProps} />;
                case "Date":
                    return <input type="date" {...commonProps} />;
                case "Data":
                default:
                    return <input type="text" {...commonProps} />;
            }
        };

        return (
            <div key={field.fieldname} className='space-y-2'>
                <label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">
                    {field.label}{field.mandatory === 1 && <span className="text-red-500">*</span>}
                </label>
                {renderInput()}
                {field.description && (
                    <p className="text-sm text-gray-600 mt-1">{field.description}</p>
                )}
            </div>
        );
    };

    const groupFieldsBySection = () => {
        const sections: { title: string; fields: Field[] }[] = [];
        let currentSection: { title: string; fields: Field[] } | null = null;

        fields.forEach(field => {
            if (field.fieldtype === 'Section Break') {
                if (currentSection) sections.push(currentSection);
                currentSection = { title: field.label || 'Section', fields: [] };
            } else if (currentSection && !field.hidden) {
                currentSection.fields.push(field);
            }
        });
        if (currentSection) sections.push(currentSection);
        return sections;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b border-gray-200 mx-auto"></div>
                    <p className="mt-4 text-lg font-semibold">Loading form data...</p>
                </div>
            </div>
        );
    }

    const sections = groupFieldsBySection();
    const projectTitle = result?.message?.related_project_data?.project_title || projectName;

    // Get selected sanction details based on sanction_ref_no
    // Note: This logic is also duplicated in handleSubmit for validation.
    // Keeping it here for UI display.
    const selectedSanction = formData.sanction_ref_no
        ? sanctionData?.message?.find((s: any) => s.name === formData.sanction_ref_no)
        : sanctionData?.message?.[0];

    return (
        <div className="bg-[#F0F4F8] min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8">
                <header className="mb-8 p-6 bg-white border border-gray-200 rounded-md shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 active:translate-y-1 transition-transform"
                        >
                            <ArrowLeftIcon className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-black">Record Received Fund</h1>
                            <p className="text-gray-700 mt-1">
                                For Project: <strong>{projectName}</strong> - {projectTitle}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left: Main Form */}
                    <div className="lg:col-span-3">
                        <form onSubmit={handleSubmit}>
                            <FrappeCard className="space-y-12">
                                {sections.map((section, index) => (
                                    <NeoSection key={index} title={section.title}>
                                        {section.title === "Transaction & Budget Breakups" ? (
                                            <div className="space-y-8">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {section.fields
                                                        .filter(f => ['gst_invoice_issued', 'invoice_no'].includes(f.fieldname))
                                                        .map(field =>
                                                            field.fieldname === 'invoice_no' ? (
                                                                <div key={field.fieldname} id="invoice_no_container" style={{ display: 'none' }}>
                                                                    {renderFormField(field)}
                                                                </div>
                                                            ) : (
                                                                renderFormField(field)
                                                            )
                                                        )
                                                    }
                                                </div>
                                                <MemoizedTransactionsTable
                                                    tableData={formData.fund_transactions}
                                                    onRowChange={handleTransactionRowChange}
                                                    onFileChange={handleTransactionFileChange}
                                                    onAddRow={addTransactionRow}
                                                    onDeleteRow={deleteTransactionRow}
                                                />
                                                <MemoizedBudgetBreakupTable
                                                    tableData={formData.received_amt_breakup}
                                                    onRowChange={handleBudgetRowChange}
                                                    onAddRow={addBudgetRow}
                                                    onDeleteRow={deleteBudgetRow}
                                                    budgetHeadOptions={budgetHeadOptions}
                                                />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                {section.fields.map(renderFormField)}
                                            </div>
                                        )}
                                    </NeoSection>
                                ))}
                            </FrappeCard>

                            <div className="mt-8 flex justify-end gap-4">
                                <FrappeButton
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="bg-gray-200 hover:bg-gray-300"
                                >
                                    Cancel
                                </FrappeButton>
                                <FrappeButton
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-green-300 hover:bg-green-400 disabled:bg-gray-300"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Fund Received Entry'}
                                </FrappeButton>
                            </div>
                        </form>
                    </div>

                    {/* Right: Sanction Details Panel */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4 space-y-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-[#E0F7F6]">📋</span>
                                Sanction Details
                            </h3>

                            {sanctionLoading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0EA5A4] mx-auto"></div>
                                    <p className="text-sm text-gray-500 mt-2">Loading...</p>
                                </div>
                            ) : selectedSanction ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase">Sanction Reference</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedSanction.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase">Sanction Letter No</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedSanction.sanction_letter_no || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase">Sanction Date</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedSanction.sanction_date || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase">Total Amount</p>
                                        <p className="text-lg font-bold text-[#0EA5A4]">₹ {(selectedSanction.total_sanctioned_amount || 0).toLocaleString('en-IN')}</p>
                                    </div>

                                    {selectedSanction.sanctioned_budget_breakup?.length > 0 && (() => {
                                        // Determine which years have data
                                        const yearKeys = [
                                            { key: 'first_year_budget', label: 'Y1' },
                                            { key: 'second_year_budget', label: 'Y2' },
                                            { key: 'third_year_budget', label: 'Y3' },
                                            { key: 'fourth_year_budget', label: 'Y4' },
                                            { key: 'fifth_year_budget', label: 'Y5' },
                                        ];
                                        const activeYears = yearKeys.filter(year =>
                                            selectedSanction.sanctioned_budget_breakup.some((row: any) => (row[year.key] || 0) > 0)
                                        );

                                        return (
                                            <div className="pt-3 border-t border-gray-200">
                                                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Budget Breakup (Year-wise)</p>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-gray-200">
                                                                <th className="text-left py-2 font-semibold text-gray-600">Head</th>
                                                                {activeYears.map(year => (
                                                                    <th key={year.key} className="text-right py-2 font-semibold text-gray-600">{year.label}</th>
                                                                ))}
                                                                <th className="text-right py-2 font-bold text-gray-700">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedSanction.sanctioned_budget_breakup.map((row: any, i: number) => {
                                                                const total = activeYears.reduce((sum, year) => sum + (row[year.key] || 0), 0);
                                                                return (
                                                                    <tr key={i} className="border-b border-gray-100">
                                                                        <td className="py-1.5 text-gray-700 truncate max-w-[80px]" title={row.account_head}>{row.account_head}</td>
                                                                        {activeYears.map(year => {
                                                                            const val = row[year.key] || 0;
                                                                            return <td key={year.key} className="py-1.5 text-right text-gray-600">{val > 0 ? (val / 1000).toFixed(0) + 'k' : '-'}</td>;
                                                                        })}
                                                                        <td className="py-1.5 text-right font-semibold text-gray-900">{(total / 1000).toFixed(0)}k</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                        <tfoot className="bg-gray-50">
                                                            <tr>
                                                                <td className="py-1.5 font-bold text-gray-800">Total</td>
                                                                {activeYears.map(year => {
                                                                    const yearTotal = selectedSanction.sanctioned_budget_breakup.reduce((sum: number, row: any) => sum + (row[year.key] || 0), 0);
                                                                    return <td key={year.key} className="py-1.5 text-right font-semibold text-gray-700">{yearTotal > 0 ? (yearTotal / 1000).toFixed(0) + 'k' : '-'}</td>;
                                                                })}
                                                                <td className="py-1.5 text-right font-bold text-[#0EA5A4]">
                                                                    {(selectedSanction.sanctioned_budget_breakup.reduce((sum: number, row: any) =>
                                                                        activeYears.reduce((s, y) => s + (row[y.key] || 0), sum), 0
                                                                    ) / 1000).toFixed(0)}k
                                                                </td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm text-gray-500">No sanction details found.</p>
                                    <p className="text-xs text-gray-400 mt-1">Please add a sanction first.</p>
                                </div>
                            )}
                        </div>

                        {/* Validation Summary Panel */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mt-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-blue-100">✓</span>
                                Real-time Validation
                            </h3>

                            {/* Total Budget Validation */}
                            <div className="space-y-3 mb-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase">Total Budget Status</p>
                                <ProgressBar
                                    current={validationState.totalValidation.previousTotal + validationState.totalValidation.currentTotal}
                                    total={validationState.totalValidation.sanctionedTotal}
                                    label="Total Funds"
                                    showWarning={true}
                                />
                                <ValidationAlert
                                    isValid={validationState.totalValidation.isValid}
                                    message={validationState.totalValidation.message}
                                />
                                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                                    <div className="bg-gray-50 p-2 rounded">
                                        <p className="text-gray-500">Previously Received</p>
                                        <p className="font-bold text-gray-800">₹{validationState.totalValidation.previousTotal.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded">
                                        <p className="text-gray-500">Current Entry</p>
                                        <p className="font-bold text-blue-600">₹{validationState.totalValidation.currentTotal.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Budget Head-wise Validation */}
                            {Object.keys(validationState.headValidations).length > 0 && (
                                <div className="pt-4 border-t border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Budget Head Status</p>
                                    <div className="space-y-3 max-h-80 overflow-y-auto">
                                        {Object.entries(validationState.headValidations).map(([head, validation]) => (
                                            <div key={head} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                                                <p className="font-semibold text-sm text-gray-800">{head}</p>
                                                <ProgressBar
                                                    current={validation.previousTotal + validation.currentTotal}
                                                    total={validation.sanctionedLimit}
                                                    label=""
                                                    showWarning={false}
                                                />
                                                <div className="flex justify-between text-xs">
                                                    <span className={validation.isValid ? 'text-green-600' : 'text-red-600'}>
                                                        {validation.message}
                                                    </span>
                                                    <span className="text-gray-600">
                                                        Prev: ₹{validation.previousTotal.toLocaleString()} |
                                                        Curr: ₹{validation.currentTotal.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Overall Status Badge */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                {validationState.totalValidation.isValid &&
                                 Object.values(validationState.headValidations).every(v => v.isValid) ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                        <p className="text-green-800 font-semibold">✓ Ready to Submit</p>
                                        <p className="text-xs text-green-600 mt-1">All validations passed</p>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                        <p className="text-red-800 font-semibold">⚠️ Cannot Submit</p>
                                        <p className="text-xs text-red-600 mt-1">Please fix validation errors above</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AddFundReceived;