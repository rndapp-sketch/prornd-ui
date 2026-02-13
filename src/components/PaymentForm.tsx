import React, { useState, useEffect } from 'react';
import { FormRender } from './FormRender';
import type { CommitRecord } from '@/types/ledgerTypes';

interface PaymentFormProps {
    docName?: string; // If provided, we are editing an existing payment
    commitData?: CommitRecord; // If provided (and no docName), we are creating a new payment from this commit
    resolvedBudgetHead?: string; // Pre-resolved name for the budget/account head Link field
    onSuccess: () => void;
    onCancel: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ docName, commitData, resolvedBudgetHead, onSuccess, onCancel }) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [fieldDefs, setFieldDefs] = useState<any[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, any[]>>({});
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFields = async () => {
            setLoading(true);
            setError(null);
            try {
                // If editing, use docName. If creating new, use empty string.
                const docParam = docName ? `doc_name=${docName}` : 'doc_name=';
                const response = await fetch(`/api/method/rndopsapp.rndopsapp.doctype.accountheadpayment.accountheadpayment.get_account_head_payment_fields?${docParam}`);
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

                        setFormData({
                            project_ref_number: commitData.projectNumber,
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
                    console.error("API Error Result:", result);
                    throw new Error(result.exc || result.exception || "Invalid response from server");
                }
            } catch (err: any) {
                console.error('Failed to load form:', err);
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
            // Match backend API signature: doctype, name, project_name, payment_amount, budget_head, bmr
            const body = {
                ...data, // Include all form data
                doctype: 'AccountHeadPayment',
                name: docName || data.name || undefined,
                project_name: data.project_ref_number || undefined,
                payment_amount: data.payment_amount || undefined,
                budget_head: data.budget_head || undefined,
                bmr: data.payment_bmr || data.bmr || undefined,
            };
            console.log("Submitting Payment Data:", body);

            const response = await fetch('/api/method/rndopsapp.rndopsapp.commitPayment.submit_payment_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            const result = await response.json();
            if (result.exc || result.exception) {
                throw new Error(result.exc || result.exception);
            }

            alert('Payment saved successfully!');
            onSuccess();
        } catch (err: any) {
            console.error('Submission failed:', err);
            alert('Failed to save payment: ' + (err.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading form details...</div>;
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 font-bold mb-4">{error}</p>
                <button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-lg">Close</button>
            </div>
        );
    }

    return (
        <FormRender
            fields={fieldDefs}
            linkOptions={linkOptions}
            initialData={formData}
            onSubmit={handleSubmit}
            onCancel={onCancel}
            submitButtonText={docName ? "Update Payment" : "Create Payment"}
            title={docName ? `Edit Payment · ${docName}` : commitData ? `Payment · ${commitData.projectNumber}` : "New Payment"}
            isSubmitting={submitting}
            onFormChange={(newData) => setFormData(newData)}
        />
    );
};

