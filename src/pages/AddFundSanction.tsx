import React, { useState, useEffect } from 'react';
import { AppSidebar } from "../components/RndSidebar";
import useUserRoleCheck from "../components/UserRoleCheck";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string;
    label: string;
    fieldtype: string;
    default?: any;
    mandatory: boolean;
    read_only: boolean;
    hidden: boolean;
    description?: string;
    options?: string;
}

interface LinkOption {
    value: string;
    label: string;
}

interface FormData {
    [key: string]: any;
}

interface SanctionedBudgetBreakupRow {
    account_head?: string;
    year1?: number;
    year2?: number;
    year3?: number;
    year4?: number;
    year5?: number;
    total?: number;
}

interface SanctionRelatedFileRow {
    file?: File | null;
    description?: string;
}

interface FundTransactionRow {
    transaction_number?: string;
    date?: string;
    amount?: number;
}

interface ReceivedAmountBreakupRow {
    account_head?: string;
    amount_received?: number;
    budget_year?: string;
    remarks?: string;
}

const AddFundSanction: React.FC = () => {
    // --- STATE MANAGEMENT & API HOOKS ---
    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [formData, setFormData] = useState<FormData>({
        project_proposal: '',
        total_sanctioned_amount: '',
        sanctioned_letter_no: '',
        sanctioned_letter_date: '',
        received_fund: 'no',
        amount_received: '',
        iitg_bank_account_number: ''
    });
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isPermanentEmployee = useUserRoleCheck();
    const [sanctionedBudgetBreakup, setSanctionedBudgetBreakup] = useState<SanctionedBudgetBreakupRow[]>([]);
    const [sanctionRelatedFiles, setSanctionRelatedFiles] = useState<SanctionRelatedFileRow[]>([]);
    const [fundTransactions, setFundTransactions] = useState<FundTransactionRow[]>([]);
    const [receivedAmountBreakup, setReceivedAmountBreakup] = useState<ReceivedAmountBreakupRow[]>([]);

    const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.save_fund_sanction_data');

    useEffect(() => {
        if (submitResult) {
            alert(`Fund Sanction submitted successfully: ${submitResult.message.docname}`);
        }
        if (submitError) {
            alert(`Submission error: ${submitError.message}`);
        }
        setIsSubmitting(false);
    }, [submitResult, submitError]);

    // --- EVENT HANDLERS ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addRow = (setter: React.Dispatch<React.SetStateAction<any[]>>) => {
        setter((prev: any[]) => [...prev, {}]);
    };

    const handleTableChange = (setter: React.Dispatch<React.SetStateAction<any[]>>, index: number, field: string, value: any) => {
        setter(prev => {
            const newRows = [...prev];
            newRows[index] = { ...newRows[index], [field]: value };
            return newRows;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        console.log(formData);
        // Mock submission
        setTimeout(() => {
            setIsSubmitting(false);
            alert('Form submitted successfully!');
        }, 1000);
    };

    // --- REUSABLE COMPONENTS ---
    const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div>
    );

    const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => (
        <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300", className)}>{children}</button>
    );

    const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";

    // --- RENDER ---
    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE] mx-auto"></div>
                <p className="mt-4 text-2xl font-bold text-black">LOADING FORM...</p>
            </div>
        </div>
    );

    return (
        <div className="bg-[#FDFCEC]">
            <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden bg-[#FDFCEC]">
                <header className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight uppercase">
                        Project Registered
                    </h1>
                </header>

                <form onSubmit={handleSubmit}>
                    <NeoCard className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label htmlFor="project_proposal" className="block font-bold text-black text-lg">Link to the associated Project Proposal.</label>
                                <input type="text" id="project_proposal" name="project_proposal" className={inputClasses} onChange={handleChange} value={formData.project_proposal} />
                            </div>
                            <div>
                                <label htmlFor="total_sanctioned_amount" className="block font-bold text-black text-lg">Total sanctioned Amount (₹)</label>
                                <input type="number" id="total_sanctioned_amount" name="total_sanctioned_amount" className={inputClasses} onChange={handleChange} value={formData.total_sanctioned_amount} />
                            </div>
                            <div>
                                <label htmlFor="sanctioned_letter_no" className="block font-bold text-black text-lg">Sanctioned Letter No.</label>
                                <input type="text" id="sanctioned_letter_no" name="sanctioned_letter_no" className={inputClasses} onChange={handleChange} value={formData.sanctioned_letter_no} />
                            </div>
                            <div>
                                <label htmlFor="sanctioned_letter_date" className="block font-bold text-black text-lg">Date of Sanctioned Letter</label>
                                <input type="date" id="sanctioned_letter_date" name="sanctioned_letter_date" className={inputClasses} onChange={handleChange} value={formData.sanctioned_letter_date} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-black">Total Budget Break-up</h2>
                                <NeoButton onClick={() => addRow(setSanctionedBudgetBreakup)}>Add Row</NeoButton>
                            </div>
                            <table className="w-full border-collapse border-2 border-black">
                                <thead>
                                    <tr>
                                        <th className="border-2 border-black p-2">No.</th>
                                        <th className="border-2 border-black p-2">Account Head</th>
                                        <th className="border-2 border-black p-2">1st Year</th>
                                        <th className="border-2 border-black p-2">2nd Year</th>
                                        <th className="border-2 border-black p-2">3rd Year</th>
                                        <th className="border-2 border-black p-2">4th Year</th>
                                        <th className="border-2 border-black p-2">5th Year</th>
                                        <th className="border-2 border-black p-2">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sanctionedBudgetBreakup.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center p-4">Grid Empty State No Data</td>
                                        </tr>
                                    ) : (
                                        sanctionedBudgetBreakup.map((row, index) => (
                                            <tr key={index}>
                                                <td className="border-2 border-black p-2">{index + 1}</td>
                                                <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.account_head || ''} onChange={e => handleTableChange(setSanctionedBudgetBreakup, index, 'account_head', e.target.value)} /></td>
                                                <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year1 || ''} onChange={e => handleTableChange(setSanctionedBudgetBreakup, index, 'year1', e.target.value === '' ? undefined : Number(e.target.value))} /></td>
                                                <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year2 || ''} onChange={e => handleTableChange(setSanctionedBudgetBreakup, index, 'year2', e.target.value === '' ? undefined : Number(e.target.value))} /></td>
                                                <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year3 || ''} onChange={e => handleTableChange(setSanctionedBudgetBreakup, index, 'year3', e.target.value === '' ? undefined : Number(e.target.value))} /></td>
                                                <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year4 || ''} onChange={e => handleTableChange(setSanctionedBudgetBreakup, index, 'year4', e.target.value === '' ? undefined : Number(e.target.value))} /></td>
                                                <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.year5 || ''} onChange={e => handleTableChange(setSanctionedBudgetBreakup, index, 'year5', e.target.value === '' ? undefined : Number(e.target.value))} /></td>
                                                <td className="border-2 border-black p-2">{(row.year1 || 0) + (row.year2 || 0) + (row.year3 || 0) + (row.year4 || 0) + (row.year5 || 0)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={2} className="text-right font-bold p-2 border-2 border-black">Total</td>
                                        <td className="p-2 border-2 border-black">₹ {sanctionedBudgetBreakup.reduce((acc, row) => acc + (row.year1 || 0), 0)}</td>
                                        <td className="p-2 border-2 border-black">₹ {sanctionedBudgetBreakup.reduce((acc, row) => acc + (row.year2 || 0), 0)}</td>
                                        <td className="p-2 border-2 border-black">₹ {sanctionedBudgetBreakup.reduce((acc, row) => acc + (row.year3 || 0), 0)}</td>
                                        <td className="p-2 border-2 border-black">₹ {sanctionedBudgetBreakup.reduce((acc, row) => acc + (row.year4 || 0), 0)}</td>
                                        <td className="p-2 border-2 border-black">₹ {sanctionedBudgetBreakup.reduce((acc, row) => acc + (row.year5 || 0), 0)}</td>
                                        <td className="p-2 border-2 border-black">₹ {sanctionedBudgetBreakup.reduce((acc, row) => acc + (row.year1 || 0) + (row.year2 || 0) + (row.year3 || 0) + (row.year4 || 0) + (row.year5 || 0), 0)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-black">Upload Sanction Related Files</h2>
                                <NeoButton onClick={() => addRow(setSanctionRelatedFiles)}>Add Row</NeoButton>
                            </div>
                            <table className="w-full border-collapse border-2 border-black">
                                <thead>
                                    <tr>
                                        <th className="border-2 border-black p-2">No.</th>
                                        <th className="border-2 border-black p-2">File</th>
                                        <th className="border-2 border-black p-2">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sanctionRelatedFiles.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="text-center p-4">Grid Empty State No Data</td>
                                        </tr>
                                    ) : (
                                        sanctionRelatedFiles.map((row, index) => (
                                            <tr key={index}>
                                                <td className="border-2 border-black p-2">{index + 1}</td>
                                                <td className="border-2 border-black p-2"><input type="file" className={inputClasses} onChange={e => handleTableChange(setSanctionRelatedFiles, index, 'file', e.target.files?.[0])} /></td>
                                                <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.description || ''} onChange={e => handleTableChange(setSanctionRelatedFiles, index, 'description', e.target.value)} /></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <label className="block font-bold text-black text-lg">Have You Received Fund?</label>
                            <p className="text-sm text-gray-700 font-mono mt-2">if you have received fund ,Which will allow you to go next step of Project Registration.</p>
                            <div className="flex items-center gap-4 mt-2">
                                <label>
                                    <input type="radio" name="received_fund" value="yes" onChange={handleChange} checked={formData.received_fund === 'yes'} />
                                    Yes
                                </label>
                                <label>
                                    <input type="radio" name="received_fund" value="no" onChange={handleChange} checked={formData.received_fund === 'no'} />
                                    No
                                </label>
                            </div>
                        </div>

                        {formData.received_fund === 'yes' && (
                            <>
                                <div>
                                    <label htmlFor="amount_received" className="block font-bold text-black text-lg">Amount Received (₹) :</label>
                                    <input type="number" id="amount_received" name="amount_received" className={inputClasses} onChange={handleChange} value={formData.amount_received} />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-2xl font-bold text-black">Sanction Transactions Details</h2>
                                        <NeoButton onClick={() => addRow(setFundTransactions)}>Add Row</NeoButton>
                                    </div>
                                    <table className="w-full border-collapse border-2 border-black">
                                        <thead>
                                            <tr>
                                                <th className="border-2 border-black p-2">No.</th>
                                                <th className="border-2 border-black p-2">Transaction Number (UTR No)</th>
                                                <th className="border-2 border-black p-2">Date</th>
                                                <th className="border-2 border-black p-2">Amount (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fundTransactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="text-center p-4">Grid Empty State No Data</td>
                                                </tr>
                                            ) : (
                                                fundTransactions.map((row, index) => (
                                                    <tr key={index}>
                                                        <td className="border-2 border-black p-2">{index + 1}</td>
                                                        <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.transaction_number || ''} onChange={e => handleTableChange(setFundTransactions, index, 'transaction_number', e.target.value)} /></td>
                                                        <td className="border-2 border-black p-2"><input type="date" className={inputClasses} value={row.date || ''} onChange={e => handleTableChange(setFundTransactions, index, 'date', e.target.value)} /></td>
                                                        <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.amount || ''} onChange={e => handleTableChange(setFundTransactions, index, 'amount', e.target.value === '' ? undefined : Number(e.target.value))} /></td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div>
                                    <label htmlFor="iitg_bank_account_number" className="block font-bold text-black text-lg">IITG Bank Account Number where amount has been transfered :</label>
                                    <input type="text" id="iitg_bank_account_number" name="iitg_bank_account_number" className={inputClasses} onChange={handleChange} value={formData.iitg_bank_account_number} />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-2xl font-bold text-black">Budget Breakup of the Received Amount</h2>
                                        <NeoButton onClick={() => addRow(setReceivedAmountBreakup)}>Add Row</NeoButton>
                                    </div>
                                    <table className="w-full border-collapse border-2 border-black">
                                        <thead>
                                            <tr>
                                                <th className="border-2 border-black p-2">No.</th>
                                                <th className="border-2 border-black p-2">Account Head.</th>
                                                <th className="border-2 border-black p-2">Amount Received (₹)</th>
                                                <th className="border-2 border-black p-2">Budget Year</th>
                                                <th className="border-2 border-black p-2">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {receivedAmountBreakup.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="text-center p-4">Grid Empty State No Data</td>
                                                </tr>
                                            ) : (
                                                receivedAmountBreakup.map((row, index) => (
                                                    <tr key={index}>
                                                        <td className="border-2 border-black p-2">{index + 1}</td>
                                                        <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.account_head || ''} onChange={e => handleTableChange(setReceivedAmountBreakup, index, 'account_head', e.target.value)} /></td>
                                                        <td className="border-2 border-black p-2"><input type="number" className={inputClasses} value={row.amount_received || ''} onChange={e => handleTableChange(setReceivedAmountBreakup, index, 'amount_received', e.target.value === '' ? undefined : Number(e.target.value))} /></td>
                                                        <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.budget_year || ''} onChange={e => handleTableChange(setReceivedAmountBreakup, index, 'budget_year', e.target.value)} /></td>
                                                        <td className="border-2 border-black p-2"><input type="text" className={inputClasses} value={row.remarks || ''} onChange={e => handleTableChange(setReceivedAmountBreakup, index, 'remarks', e.target.value)} /></td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                    </NeoCard>
                    <div className="mt-8 flex justify-end">
                        <NeoButton type="submit" disabled={isSubmitting} className="bg-[#A5D6A7]">
                            {isSubmitting ? 'SUBMITTING...' : 'Submit'}
                        </NeoButton>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default AddFundSanction;
