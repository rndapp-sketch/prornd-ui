import { useFrappeGetCall } from "frappe-react-sdk";
import { ArrowLeft, FileText, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { GlobalLoader } from "@/components/ui/global-loader";
import { AppSidebar } from "@/components/RndSidebar";

const FrappeCard = ({ title, children, className, icon, onClick }: { title?: string; children: React.ReactNode; className?: string; icon?: React.ReactNode; onClick?: () => void }) => (
    <div className={cn("bg-white border border-gray-300 rounded-xl shadow-sm", className)} onClick={onClick}>
        {title && (
            <div className="px-6 py-4 border-b border-gray-300 flex items-center gap-3">
                {icon && <div className="p-2 bg-[#E0F7F6] rounded-lg">{icon}</div>}
                <h3 className="text-lg font-bold text-black uppercase tracking-tight">{title}</h3>
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

const DetailRow = ({ label, value, isCurrency = false, highlight = false }: { label: string; value: any; isCurrency?: boolean; highlight?: boolean }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
        <span className="text-gray-600 font-medium text-sm">{label}</span>
        <span className={cn("font-bold text-gray-900 text-sm", highlight && "text-[#0EA5A4] text-base")}>
            {isCurrency
                ? (typeof value === 'number' ? value.toLocaleString("en-IN", { style: "currency", currency: "INR" }) : value)
                : (value || '-')}
        </span>
    </div>
);

interface HoSApprovalViewProps {
    fundReceivedName: string;
}

export const HoSApprovalView = ({ fundReceivedName }: HoSApprovalViewProps) => {
    const navigate = useNavigate();

    // Fetch combined data
    const { data, isLoading, error } = useFrappeGetCall<{ message: { deposit_slip: any, fund_received: any } }>(
        "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.get_deposit_slip_with_fund_received",
        { fund_received_ref: fundReceivedName }
    );

    // Workflow Actions for Deposit Slip (Since HoS approves the Deposit Slip usually, or the Fund Received acting as wrapper?
    // User request implies "show in the hos ... show the submitted form". 
    // Assuming we perform actions on the Fund Received doc as per parent component context.

    if (isLoading) return <GlobalLoader isLoading={true} />;

    if (error || !data?.message?.deposit_slip) {
        return (
            <div className="bg-gray-100 min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8">
                    <FrappeCard className="text-center py-16">
                        <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h2 className="text-xl font-bold text-black mb-2 uppercase">Deposit Slip Not Found</h2>
                        <p className="text-gray-900 mb-6">Linked deposit slip could not be found for this fund records.</p>
                        <button onClick={() => navigate(-1)} className="text-blue-600 underline">Go Back</button>
                    </FrappeCard>
                </main>
            </div>
        );
    }

    const { deposit_slip, fund_received } = data.message;

    return (
        <div className="space-y-6">

            {/* Header / Title Area */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-900" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-black uppercase tracking-tight">Deposit Slip & Fund Overview</h1>
                        <p className="text-sm text-gray-700 font-medium mt-0.5">{fundReceivedName}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT: Deposit Slip Details */}
                <div className="space-y-6">
                    <FrappeCard
                        title={`Deposit Slip - ${deposit_slip.name}`}
                        icon={<FileText className="h-4 w-4 text-[#0EA5A4]" />}
                    >
                        <div className="mb-4">
                            <span className={cn("px-2 py-1 rounded text-xs font-bold border",
                                deposit_slip.workflow_state === 'Approved' ? "bg-green-100 text-green-800 border-green-300" :
                                    "bg-yellow-100 text-yellow-800 border-yellow-300"
                            )}>
                                {deposit_slip.workflow_state}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <DetailRow label="Project" value={deposit_slip.project_title} />
                                <DetailRow label="Principal Investigator" value={deposit_slip.principal_investigator} />
                                <DetailRow label="Bank" value={deposit_slip.bank_name} />
                                <DetailRow label="ECS A/C" value={deposit_slip.ecs_account_number} />
                            </div>

                            <div>
                                <h4 className="font-bold text-black uppercase text-xs mb-2 border-b pb-1">Financial Breakdown</h4>
                                <DetailRow label="Amount (Incl. GST)" value={deposit_slip.amount_inclusive_gst_capital} isCurrency highlight />
                                <DetailRow label="CGST (9%)" value={deposit_slip.cgst_9} isCurrency />
                                <DetailRow label="SGST (9%)" value={deposit_slip.sgst_9} isCurrency />
                                <DetailRow label="Total GST" value={deposit_slip.total_gst_amount} isCurrency />
                                <DetailRow label="Project Balance" value={deposit_slip.project_balance_after_gst} isCurrency />
                                <DetailRow label="Overhead (15%)" value={deposit_slip.overhead_amount} isCurrency />
                            </div>

                            <div>
                                <h4 className="font-bold text-black uppercase text-xs mb-2 border-b pb-1">Overhead Distribution</h4>
                                <DetailRow label="IDF Amount" value={deposit_slip.idf_amount} isCurrency />
                                <DetailRow label="DPF/CLE Amount" value={deposit_slip.dpf_amount} isCurrency />
                                <DetailRow label="Staff Welfare" value={deposit_slip.staff_welfare_amount} isCurrency />
                                <DetailRow label="Student Welfare" value={deposit_slip.student_welfare_amount} isCurrency />
                            </div>

                            {/* ECS Dates Table */}
                            {deposit_slip.ecs_dates_and_amount && deposit_slip.ecs_dates_and_amount.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-bold text-black uppercase text-xs mb-2">ECS Dates</h4>
                                    <table className="w-full text-sm border-collapse border border-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="border p-2 text-left">Date</th>
                                                <th className="border p-2 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deposit_slip.ecs_dates_and_amount.map((row: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="border p-2">{row.ecs_date}</td>
                                                    <td className="border p-2 text-right">
                                                        {(row.ecs_amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Credit Distribution Table */}
                            {deposit_slip.credit_distribution && deposit_slip.credit_distribution.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-bold text-black uppercase text-xs mb-2">Credit Distribution</h4>
                                    <table className="w-full text-sm border-collapse border border-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="border p-2 text-left">Label</th>
                                                <th className="border p-2 text-right">Amount</th>
                                                <th className="border p-2 text-left">Recipient</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deposit_slip.credit_distribution.map((row: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="border p-2">{row.label}</td>
                                                    <td className="border p-2 text-right">
                                                        {(row.amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                                    </td>
                                                    <td className="border p-2">{row.recipient_name}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </FrappeCard>
                </div>

                {/* RIGHT: Fund Received Details */}
                <div className="space-y-6">
                    <FrappeCard
                        title={`Fund Received - ${fundReceivedName}`}
                        icon={<Building2 className="h-4 w-4 text-[#0EA5A4]" />}
                    >
                        <div className="mb-4">
                            <span className={cn("px-2 py-1 rounded text-xs font-bold border",
                                fund_received.workflow_state === 'Approved' ? "bg-green-100 text-green-800 border-green-300" :
                                    "bg-yellow-100 text-yellow-800 border-yellow-300"
                            )}>
                                {fund_received.workflow_state}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <DetailRow label="Project Ref" value={fund_received.project_reference || fund_received.prjreg_title} />
                                <DetailRow label="Sanction Ref" value={fund_received.sanction_ref_no} />
                                <DetailRow label="Bank Account" value={fund_received.bank_account} />
                                <DetailRow label="Amount Received" value={fund_received.fund_received_amt} isCurrency highlight />
                            </div>

                            {/* Budget Breakup */}
                            {fund_received.received_amt_breakup && fund_received.received_amt_breakup.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-bold text-black uppercase text-xs mb-2">Budget Breakup</h4>
                                    <table className="w-full text-sm border-collapse border border-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="border p-2 text-left">Head</th>
                                                <th className="border p-2 text-right">Amount</th>
                                                <th className="border p-2 text-left">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fund_received.received_amt_breakup.map((row: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="border p-2">{row.account_head}</td>
                                                    <td className="border p-2 text-right">
                                                        {(row.amount_received || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                                    </td>
                                                    <td className="border p-2 text-xs text-gray-500">{row.remarks}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Transactions */}
                            {fund_received.fund_transactions && fund_received.fund_transactions.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-bold text-black uppercase text-xs mb-2">Transactions</h4>
                                    <table className="w-full text-sm border-collapse border border-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="border p-2 text-left">Txn #</th>
                                                <th className="border p-2 text-left">Date</th>
                                                <th className="border p-2 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fund_received.fund_transactions.map((row: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="border p-2">{row.transaction_number}</td>
                                                    <td className="border p-2">{row.transaction_date}</td>
                                                    <td className="border p-2 text-right">
                                                        {(row.amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        </div>
                    </FrappeCard>
                </div>
            </div>

            <FrappeCard className="bg-[#E0F7F6] border-[#0EA5A4]">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-bold text-[#0EA5A4] uppercase text-xs">Total Reconciliation</p>
                        <p className="text-sm text-gray-700">Compares Deposit Slip Total vs Fund Received Total</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-extrabold text-[#0EA5A4]">
                            {(deposit_slip.amount_inclusive_gst_capital === fund_received.fund_received_amt) ? "MATCHED" : "MISMATCH"}
                        </p>
                    </div>
                </div>
            </FrappeCard>

        </div>
    );
};
