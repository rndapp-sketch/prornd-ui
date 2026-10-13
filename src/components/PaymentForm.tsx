import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import React, { useState, useEffect } from 'react';
import { FormRender } from './FormRender';
import type { CommitRecord } from '@/types/ledgerTypes';
import { ErrorModal } from './ErrorModal';
import { parseFrappeError } from '../utils/errorUtils';

interface PaymentFormProps {
    docName?: string; // If provided, we are editing an existing payment
    commitData?: CommitRecord; // If provided (and no docName), we are creating a new payment from this commit
    resolvedBudgetHead?: string; // Pre-resolved name for the budget/account head Link field
    previousPaid?: number; // Already paid against this commit (earlier instalments)
    onSuccess: () => void;
    onCancel: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ docName, commitData, resolvedBudgetHead, previousPaid = 0, onSuccess, onCancel }) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [fieldDefs, setFieldDefs] = useState<any[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, any[]>>({});
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [error, setError] = useState<string | null>(null);
    const [payMode, setPayMode] = useState<'full' | 'remaining' | 'partial'>('full');
    const commitTotal = Number(commitData?.commitAmount) || 0;
    const remainingAmount = Math.max(0, commitTotal - previousPaid);
    const choosePayMode = (mode: 'full' | 'remaining' | 'partial') => {
        setPayMode(mode);
        if (mode === 'full') setFormData(prev => ({ ...prev, payment_amount: commitTotal }));
        else if (mode === 'remaining') setFormData(prev => ({ ...prev, payment_amount: remainingAmount }));
        else setFormData(prev => ({ ...prev, payment_amount: '' }));
    };
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });

    useEffect(() => {
        const fetchFields = async () => {
            setLoading(true);
            setError(null);
            try {
                // If editing, use docName. If creating new, use empty string.
                const docParam = docName ? `doc_name=${docName}` : 'doc_name=';
                const response = await fetch(`${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.doctype.accountheadpayment.accountheadpayment.get_account_head_payment_fields?${docParam}`);
                const result = await response.json();

                if (result?.message) {
                    const { fields, prefill_data, link_options } = result.message;
                    setFieldDefs(fields || []);
                    // Merge link options from API
                    const mergedLinkOptions = { ...(link_options || {}) };

                    if (docName) {
                        // Editing: use prefill data from API
                        setFormData({
                            ...prefill_data,
                            name: docName // ensure name is set
                        });
                    } else if (commitData) {
                        // New from Commit: Prefill from commit data
                        const budgetHeadValue = resolvedBudgetHead || String(commitData.accountHeadId);

                        // Inject the budget head value into link_options so the <select> can display it
                        if (budgetHeadValue) {
                            const existingOptions = mergedLinkOptions['budget_head'] || [];
                            const alreadyExists = existingOptions.some((opt: any) => opt.value === budgetHeadValue);
                            if (!alreadyExists) {
                                mergedLinkOptions['budget_head'] = [
                                    ...existingOptions,
                                    { value: budgetHeadValue, label: budgetHeadValue }
                                ];
                            }
                        }

                        // Try to fetch Project Registration to get the correct document name and title
                        let docNameValue = commitData.projectNumber;
                        let titleValue = '';
                        try {
                            const prRes = await fetch(`${FRAPPE_BASE_URL}/api/resource/Project%20Registration?filters=[["project_no","=","${commitData.projectNumber}"]]&fields=["name","project_title"]`);
                            if (prRes.ok) {
                                const prData = await prRes.json();
                                if (prData?.data && prData.data.length > 0) {
                                    docNameValue = prData.data[0].name;
                                    titleValue = prData.data[0].project_title || '';

                                    // Inject into link_options so it displays correctly
                                    const existingPrOptions = mergedLinkOptions['project_ref_number'] || [];
                                    const prAlreadyExists = existingPrOptions.some((opt: any) => opt.value === docNameValue);
                                    if (!prAlreadyExists) {
                                        mergedLinkOptions['project_ref_number'] = [
                                            ...existingPrOptions,
                                            { value: docNameValue, label: titleValue || docNameValue }
                                        ];
                                    }
                                }
                            }
                        } catch (err) {
                        }

                        setFormData({
                            project_ref_number: docNameValue,
                            _project_title: titleValue, // keep track of title for the header
                            payment_amount: commitData.commitAmount,
                            payment_particular: commitData.commitParticular || commitData.refDetails,
                            payment_date: new Date().toISOString().split('T')[0],
                            payment_status: 'PENDING',
                            budget_head: budgetHeadValue,
                            commit_id: commitData.transactionCommitNumber
                        });
                    }

                    setLinkOptions(mergedLinkOptions);
                } else {
                    throw new Error(result.exc || result.exception || "Invalid response from server");
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load form configuration');
            } finally {
                setLoading(false);
            }
        };

        fetchFields();
    }, [docName, commitData]);

    const handleSubmit = async (data: any) => {
        setSubmitting(true);
        try {
            // Route to the correct payment endpoint based on module
            // Advance Settlement (moduleId=8) has a dedicated Kafka-publishing endpoint
            const isAdvanceSettlement = commitData?.moduleId && String(commitData.moduleId) === '8';
            const isSalaryPayment = commitData?.moduleId && String(commitData.moduleId) === '11';
            const paymentEndpoint = isAdvanceSettlement
                ? `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.doctype.advance_settlement.advance_settlement.submit_advance_settlement_payment`
                : `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.commitPayment.submit_payment_data`;

            // Build body matching the target endpoint's function signature
            const body = isAdvanceSettlement
                ? {
                    // Explicit params of submit_advance_settlement_payment()
                    name: docName || data.name || commitData?.frapAppId || undefined,
                    project_name: data.project_ref_number || undefined,
                    payment_amount: data.payment_amount || undefined,
                    budget_head: data.budget_head || undefined,
                    bmr: data.payment_bmr || data.bmr || undefined,
                    // Additional fields read from frappe.form_dict by the backend
                    payment_date: data.payment_date || undefined,
                    payment_particular: data.payment_particular || undefined,
                    payment_status: data.payment_status || undefined,
                    payment_reference_details: data.payment_reference_details || undefined,
                    bank_transaction_number: data.bank_transaction_number || undefined,
                    bank_transaction_date: data.bank_transaction_date || undefined,
                    commit_id: data.commit_id || commitData?.transactionCommitNumber || undefined,
                }
                : isSalaryPayment
                ? {
                    // Salary staging path — triggers _is_recruitment_salary_payment on backend
                    ...data,
                    doctype: 'Recruitment Adhoc Contractual',
                    moduleName: 'Recruitment Adhoc Contractual',
                    moduleId: '11',
                    project_name: data.project_ref_number || undefined,
                    payment_amount: data.payment_amount || undefined,
                    budget_head: data.budget_head || undefined,
                    bmr: data.payment_bmr || data.bmr || undefined,
                    frapAppId: commitData?.frapAppId || undefined,
                    refDetails: commitData?.transactionCommitNumber
                        ? String(commitData.transactionCommitNumber)
                        : undefined,
                    salary_year_month: (commitData as any)?.salary_year_month || undefined,
                    salary_user_details: (commitData as any)?.salary_user_details || undefined,
                    salary_backend_details: (commitData as any)?.salary_backend_details || undefined,
                }
                : {
                    ...data,
                    doctype: 'AccountHeadPayment',
                    name: docName || data.name || undefined,
                    project_name: data.project_ref_number || undefined,
                    payment_amount: data.payment_amount || undefined,
                    budget_head: data.budget_head || undefined,
                    bmr: data.payment_bmr || data.bmr || undefined,
                    frapAppId: commitData?.frapAppId || undefined,
                    moduleName: commitData?.moduleId || undefined,
                };


            const response = await fetch(paymentEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            const result = await response.json();
            const msg = result?.message;
            if (msg?.status === 'error') throw new Error(msg?.message || 'Salary staging failed');
            if (result.exc || result.exception) {
                throw new Error(result.exc || result.exception);
            }

            const successMsg = isSalaryPayment && msg?.name
                ? `Salary staged for ${msg.name}`
                : 'Payment saved successfully!';
            alert(successMsg);
            onSuccess();
        } catch (err: any) {
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(err) });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">Loading form details...</div>;
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 font-bold mb-4">{error}</p>
                <button onClick={onCancel} className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg">Close</button>
            </div>
        );
    }

    const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const modeOptions: { id: 'full' | 'remaining' | 'partial'; label: string; hint: string }[] = [
        { id: 'full', label: 'Full', hint: money(commitTotal) },
        ...(previousPaid > 0 ? [{ id: 'remaining' as const, label: 'Remaining', hint: money(remainingAmount) }] : []),
        { id: 'partial', label: 'Partial', hint: 'enter amount' },
    ];

    // ── New payment from a commit: purpose-built layout ─────────────────────
    if (!docName && commitData) {
        const set = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));
        const headLabel =
            (linkOptions['budget_head'] || []).find((o: any) => String(o.value) === String(formData.budget_head))?.label
            || resolvedBudgetHead
            || String(formData.budget_head ?? '');
        const amount = Number(formData.payment_amount) || 0;
        const paidPct = commitTotal > 0 ? Math.min(100, (previousPaid / commitTotal) * 100) : 0;
        const thisPct = commitTotal > 0 ? Math.min(100 - paidPct, (amount / commitTotal) * 100) : 0;
        const overPct = commitTotal > 0 ? (amount / commitTotal) * 100 : 0;
        const leftPct = Math.max(0, 100 - paidPct - thisPct);
        const overpay = amount > remainingAmount && commitTotal > 0;
        const labelCls = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400';
        const inputCls = 'w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:bg-zinc-50 dark:disabled:bg-zinc-800 disabled:text-zinc-500';

        return (
            <>
                <div className="p-5 space-y-5">
                    {/* Summary */}
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{commitData.projectNumber}</div>
                                {formData._project_title && (
                                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{formData._project_title}</div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                                <span className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-zinc-700 dark:text-zinc-300">
                                    Commit #{String(formData.commit_id ?? commitData.transactionCommitNumber ?? '-')}
                                </span>
                                <span className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-zinc-700 dark:text-zinc-300">
                                    {headLabel || '-'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                            {[
                                ['Committed', commitTotal],
                                ['Paid so far', previousPaid],
                                ['Remaining', remainingAmount],
                            ].map(([label, val]) => (
                                <div key={label as string} className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2">
                                    <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label as string}</div>
                                    <div className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{money(val as number)}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700" title="Paid / this payment / remaining">
                            <div className="bg-[#2563EB] transition-all" style={{ width: `${paidPct}%` }} />
                            <div className={`${overpay ? 'bg-red-500' : 'bg-emerald-500'} transition-all`} style={{ width: `${thisPct}%` }} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />Paid {paidPct.toFixed(1)}%</span>
                            <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${overpay ? 'bg-red-500' : 'bg-emerald-500'}`} />This payment {overpay ? overPct.toFixed(1) : thisPct.toFixed(1)}%</span>
                            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />Left after {leftPct.toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">How much to pay</div>
                        <div className={`grid grid-cols-1 gap-2 ${modeOptions.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`} role="radiogroup">
                            {modeOptions.map(o => {
                                const active = payMode === o.id;
                                return (
                                    <button
                                        key={o.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => choosePayMode(o.id)}
                                        className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                                            active
                                                ? 'border-[#D97757] bg-[#D97757]/[0.07] ring-1 ring-[#D97757]'
                                                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-500'
                                        }`}
                                    >
                                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                            active ? 'border-[#D97757]' : 'border-zinc-300 dark:border-zinc-600'
                                        }`}>
                                            {active && <span className="h-2 w-2 rounded-full bg-[#D97757]" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-bold leading-tight text-zinc-900 dark:text-zinc-100">{o.label}</span>
                                            <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">{o.hint}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Payment Amount</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-3 flex items-center text-sm font-bold text-zinc-400">₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.payment_amount ?? ''}
                                        disabled={payMode !== 'partial'}
                                        onChange={(e) => set('payment_amount', e.target.value)}
                                        placeholder="Enter amount"
                                        className={`${inputCls} pl-7 text-lg font-extrabold`}
                                    />
                                </div>
                                {overpay && (
                                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                                        Cannot exceed the remaining {money(remainingAmount)}.
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className={labelCls}>Payment Date</label>
                                <input
                                    type="date"
                                    value={formData.payment_date ?? ''}
                                    onChange={(e) => set('payment_date', e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Payment Particular</label>
                            <textarea
                                rows={4}
                                value={formData.payment_particular ?? ''}
                                onChange={(e) => set('payment_particular', e.target.value)}
                                className={`${inputCls} resize-y`}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Payment Reference Details</label>
                            <textarea
                                rows={4}
                                value={formData.payment_reference_details ?? ''}
                                onChange={(e) => set('payment_reference_details', e.target.value)}
                                className={`${inputCls} resize-y`}
                            />
                        </div>
                        <div className="md:col-span-2 md:max-w-sm">
                            <label className={labelCls}>BMR</label>
                            <input
                                type="text"
                                value={formData.payment_bmr ?? formData.bmr ?? ''}
                                onChange={(e) => set('payment_bmr', e.target.value)}
                                className={inputCls}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-5 py-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={submitting || !(amount > 0) || overpay || !formData.payment_date}
                        title={overpay ? `Amount cannot exceed the remaining ${money(remainingAmount)}` : undefined}
                        onClick={() => handleSubmit({ ...formData, payment_amount: amount })}
                        className="rounded-lg bg-[#D97757] px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#c66a4e] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Saving…' : `Pay ${amount > 0 ? money(amount) : ''}`.trim()}
                    </button>
                </div>
                <ErrorModal
                    open={errorModal.open}
                    title={errorModal.title}
                    message={errorModal.message}
                    onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
                />
            </>
        );
    }

    return (
        <>
            <FormRender
                fields={fieldDefs.map(f => {
                    // New payment from a commit: the amount is fixed for Full / Remaining and
                    // only editable in Partial mode.
                    if (f.fieldname === 'payment_amount' && !docName && commitData && payMode !== 'partial') {
                        return { ...f, read_only: 1 };
                    }
                    // Free-text fields get a multi-line box instead of a one-line input
                    if (f.fieldname === 'payment_particular' || f.fieldname === 'payment_reference_details') {
                        return { ...f, fieldtype: 'Long Text' };
                    }
                    return f;
                })}
                linkOptions={linkOptions}
                initialData={formData}
                onSubmit={handleSubmit}
                onCancel={onCancel}
                submitButtonText={docName ? "Update Payment" : "Create Payment"}
                title={docName ? `Edit Payment · ${docName}` : commitData ? `Payment · ${commitData.projectNumber}${formData._project_title ? ' · ' + formData._project_title : ''}` : "New Payment"}
                isSubmitting={submitting}
                onFormChange={(newData) => setFormData(newData)}
            />
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </>
    );
};

