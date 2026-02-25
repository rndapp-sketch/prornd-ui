import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectName: string;
    budgetHeadList?: { name: string; id: number | string }[];
    initialData?: any; // To prefill from a commitment if available
    onSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    projectName,
    budgetHeadList = [],
    initialData,
    onSuccess
}) => {
    const [paymentFieldDefs, setPaymentFieldDefs] = useState<any[]>([]);
    const [paymentLinkOptions, setPaymentLinkOptions] = useState<Record<string, any[]>>({});
    const [paymentFormData, setPaymentFormData] = useState<Record<string, any>>({});
    const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
    const [isLoadingFields, setIsLoadingFields] = useState(false);

    // Fetch fields when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchFields = async () => {
                setIsLoadingFields(true);
                try {
                    const response = await fetch('/api/method/rndopsapp.rndopsapp.commitPayment.get_account_head_payment_fields');
                    const result = await response.json();
                    if (result?.message) {
                        const { fields, prefill_data, link_options } = result.message;
                        setPaymentFieldDefs(fields || []);
                        setPaymentLinkOptions(link_options || {});

                        const baseData = {
                            ...prefill_data,
                            project_ref_number: projectName || '',
                            payment_date: new Date().toISOString().split('T')[0],
                            ...initialData
                        };

                        setPaymentFormData(baseData);
                    }
                } catch (err) {
                    console.error('Failed to fetch payment fields:', err);
                } finally {
                    setIsLoadingFields(false);
                }
            };

            fetchFields();
        }
    }, [isOpen, projectName, initialData]);

    const handlePaymentFieldChange = (fieldname: string, value: any) => {
        setPaymentFormData(prev => ({ ...prev, [fieldname]: value }));
    };

    const handleSubmitPayment = async () => {
        setIsPaymentSubmitting(true);
        try {
            const response = await fetch('/api/method/rndopsapp.rndopsapp.doctype.accountheadpayment.accountheadpayment.submit_payment_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    doctype: 'AccountHeadPayment',
                    name: '',
                    project_name: paymentFormData.project_ref_number || projectName,
                    payment_amount: paymentFormData.payment_amount,
                    budget_head: paymentFormData.budget_head,
                    bmr: paymentFormData.payment_bmr,
                })
            });
            const result = await response.json();
            if (result.exc || result.exception) {
                throw new Error(result.exc || result.exception);
            }
            onSuccess?.();
            onClose();
            alert('Payment submitted successfully!');
        } catch (err: any) {
            console.error('Payment submission failed:', err);
            alert('Failed to submit payment: ' + (err.message || 'Unknown error'));
        } finally {
            setIsPaymentSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const inputClasses = "w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4] placeholder:text-zinc-400 dark:placeholder:text-zinc-500";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Record Payment</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">Submit payment details</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-auto p-6 space-y-4">
                    {isLoadingFields ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0EA5A4]"></div>
                        </div>
                    ) : (
                        paymentFieldDefs.filter((f: any) => !f.hidden).map((field: any) => {
                            const value = paymentFormData[field.fieldname] || '';
                            const options = paymentLinkOptions[field.fieldname] || [];

                            if (field.fieldtype === 'Section Break') {
                                return (
                                    <div key={field.fieldname} className="pt-4 border-t border-zinc-200 dark:border-zinc-800 first:border-0 first:pt-0">
                                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">{field.label}</h3>
                                    </div>
                                );
                            }

                            return (
                                <div key={field.fieldname}>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                        {field.label} {field.mandatory ? <span className="text-red-500">*</span> : ''}
                                    </label>

                                    {(field.fieldtype === 'Select' || field.fieldtype === 'Link') ? (
                                        <select
                                            className={inputClasses}
                                            value={value}
                                            onChange={(e) => handlePaymentFieldChange(field.fieldname, e.target.value)}
                                            disabled={field.read_only}
                                        >
                                            <option value="">Select {field.label}...</option>
                                            {field.fieldname === 'budget_head' && budgetHeadList.length > 0
                                                ? budgetHeadList.map(bh => (
                                                    <option key={bh.id} value={bh.name}>{bh.name}</option>
                                                ))
                                                : options.map((opt: any) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label || opt.value}
                                                    </option>
                                                ))}
                                        </select>
                                    ) : field.fieldtype === 'Date' ? (
                                        <input
                                            type="date"
                                            className={inputClasses}
                                            value={value}
                                            onChange={(e) => handlePaymentFieldChange(field.fieldname, e.target.value)}
                                            disabled={field.read_only}
                                        />
                                    ) : field.fieldtype === 'Currency' || field.fieldtype === 'Float' ? (
                                        <input
                                            type="number"
                                            step="0.01"
                                            className={inputClasses}
                                            value={value}
                                            onChange={(e) => handlePaymentFieldChange(field.fieldname, parseFloat(e.target.value) || 0)}
                                            disabled={field.read_only}
                                            placeholder="0.00"
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            className={inputClasses}
                                            value={value}
                                            onChange={(e) => handlePaymentFieldChange(field.fieldname, e.target.value)}
                                            disabled={field.read_only}
                                            placeholder={field.description || ''}
                                        />
                                    )}
                                    {field.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{field.description}</p>}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmitPayment}
                        disabled={isPaymentSubmitting || isLoadingFields}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#0EA5A4] rounded-lg hover:bg-[#0D9494] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPaymentSubmitting ? 'Submitting...' : 'Submit Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
};
