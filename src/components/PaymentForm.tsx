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

                        // Try to fetch Project Registration to get the correct document name and title
                        let docNameValue = commitData.projectNumber;
                        let titleValue = '';
                        try {
                            const prRes = await fetch(`/api/resource/Project%20Registration?filters=[["project_no","=","${commitData.projectNumber}"]]&fields=["name","project_title"]`);
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
                            console.error("Failed to fetch Project Registration for PaymentForm:", err);
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
        console.log('=== PAYMENT FORM DATA ===', {
            submittedData: data,
            commitData,
            docName,
            resolvedBudgetHead,
            formDataState: formData
        });
        setSubmitting(true);
        try {
            // Route to the correct payment endpoint based on module
            // Advance Settlement (moduleId=8) has a dedicated Kafka-publishing endpoint
            const isAdvanceSettlement = commitData?.moduleId && String(commitData.moduleId) === '8';
            const paymentEndpoint = isAdvanceSettlement
                ? '/api/method/rndopsapp.rndopsapp.doctype.advance_settlement.advance_settlement.submit_advance_settlement_payment'
                : '/api/method/rndopsapp.rndopsapp.commitPayment.submit_payment_data';
            // const paymentEndpoint = isAdvanceSettlement
            //     ? '/api/method/rndopsapp.rndopsapp.commitPayment.submit_payment_data'
            //     : '/api/method/rndopsapp.rndopsapp.commitPayment.submit_payment_data';

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

            console.log(`Submitting Payment (${isAdvanceSettlement ? 'Advance Settlement' : 'Generic'}):`, body);

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

    return (
        <FormRender
            fields={fieldDefs}
            linkOptions={linkOptions}
            initialData={formData}
            onSubmit={handleSubmit}
            onCancel={onCancel}
            submitButtonText={docName ? "Update Payment" : "Create Payment"}
            title={docName ? `Edit Payment · ${docName}` : commitData ? `Payment · ${commitData.projectNumber}${formData._project_title ? ' · ' + formData._project_title : ''}` : "New Payment"}
            isSubmitting={submitting}
            onFormChange={(newData) => setFormData(newData)}
        />
    );
};

