import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../components/RndSidebar";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from "lucide-react";

// --- TYPE DEFINITIONS & REUSABLE UI COMPONENTS (Same as AddFundSanction) ---
// ...

const AddFundReceived: React.FC = () => {
    const navigate = useNavigate();
    const { sanctionName } = useParams<{ sanctionName: string }>(); // Gets parent sanction docname

    const [fields, setFields] = useState<any[]>([]);
    const [formData, setFormData] = useState<any>({});
    const [linkOptions, setLinkOptions] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { call: fetchFormData, result, error } = useFrappePostCall('rndopsapp.api.get_fund_received_fields');
    const { call: submitForm } = useFrappePostCall('rndopsapp.api.save_fund_received');

    useEffect(() => {
        if (sanctionName) {
            fetchFormData({ fund_sanction: sanctionName });
        }
    }, [fetchFormData, sanctionName]);

    useEffect(() => {
        if (result?.message) {
            setFields(result.message.fields || []);
            setLinkOptions(result.message.link_options || {});
            setFormData(result.message.prefill_data || {});
            setLoading(false);
        }
        if (error) { console.error("Failed to load form:", error); setLoading(false); }
    }, [result, error]);

    // ... (Your handlers: handleChange, add/delete/change table rows)

    const handleSubmit = async (e: React.FormEvent) => { /* ... Submit logic ... */ };
    const renderField = useCallback((fieldname: string) => { /* ... Your renderField logic ... */ });

    if (loading) return <div>Loading Received Fund Form...</div>;

    return (
        <div className="bg-[#FDFCEC]">
            <AppSidebar isPermanentEmployee={true} />
            <main className="flex-1 p-4 md:p-8">
                 <header className="mb-8 p-4 bg-white border-2 border-black ...">
                    <div>
                        <h1 className="text-3xl font-extrabold text-black">Record Received Fund</h1>
                        <p className="text-gray-700 font-mono mt-1">
                            For Sanction Letter No: <strong>{formData.sqnction_letter_no}</strong>
                        </p>
                    </div>
                 </header>
                 <form onSubmit={handleSubmit}>
                    <NeoCard className="space-y-12">
                        <NeoSection title="Transaction & Invoice Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {renderField('fund_received_amt')}
                                {renderField('bank_account')}
                                {renderField('gst_invoice_issued')}
                                {renderField('invoice_no')}
                            </div>
                        </NeoSection>
                        <NeoSection title="Transaction Installments">
                            {/* <MemoizedGenericTable for fund_transactions /> */}
                            <p>Transaction details table goes here.</p>
                        </NeoSection>
                         <NeoSection title="Breakup of this Received Amount">
                            {/* <MemoizedGenericTable for received_amt_breakup /> */}
                            <p>Received amount breakup table goes here.</p>
                        </NeoSection>
                    </NeoCard>
                    <div className="mt-8 flex justify-end">
                        <NeoButton type="submit" disabled={isSubmitting} className="bg-green-300">
                            {isSubmitting ? 'Saving...' : 'Save Received Fund'}
                        </NeoButton>
                    </div>
                 </form>
            </main>
        </div>
    );
};

export default AddFundReceived;