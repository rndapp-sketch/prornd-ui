import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useFrappeGetCall, useFrappeGetDoc, useFrappePostCall } from "frappe-react-sdk";
import { ArrowLeft, DollarSign, FileText, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/RndSidebar";

const DEFAULT_PRJREG_TITLE = "2025111101DST000103";

const FundReceivedWorkflowActions = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_workflow_actions",
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.perform_fund_received_action"
    );

    const handleAction = async (action: string) => {
        try {
            await performAction({ docname, action });
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <div className="flex gap-2">
            {data.message.map((action) => (
                <button
                    key={action}
                    onClick={() => handleAction(action)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-yellow-200 hover:bg-yellow-300 text-black font-bold border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-50"
                >
                    {actionLoading ? "Processing..." : action}
                </button>
            ))}
        </div>
    );
};

const FundReceivedDetails = () => {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const prjreg_title = location.state?.prjreg_title || DEFAULT_PRJREG_TITLE;
    console.log("prjreg_title:", prjreg_title);
    console.log("name:", name);
    const { data: apiData, isLoading: listLoading, error: listError } = useFrappeGetCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
        {
            prjreg_title: prjreg_title,
            limit: 200,
            start: 0
        }
    );

    // Fallback: fetch single doc if not found in list (e.g. different project or direct link)
    const { data: docData, isLoading: docLoading, error: docError } = useFrappeGetDoc("Fund Received", name || "");

    const normalizeResponse = (raw: any) => {
        if (!raw) return [];
        if (raw.message && raw.message.message && Array.isArray(raw.message.message)) return raw.message.message;
        if (raw.message && Array.isArray(raw.message)) return raw.message;
        if (Array.isArray(raw)) return raw;
        if (raw.data && Array.isArray(raw.data)) return raw.data;
        if (raw.results && Array.isArray(raw.results)) return raw.results;
        if (raw.message && raw.message.data && Array.isArray(raw.message.data)) return raw.message.data;
        return [];
    };

    const funds = normalizeResponse(apiData);
    const listData = funds.find((f: any) => f.name === name);
    console.log("listData:", listData);
    // Prioritize list data (as requested), fallback to doc data
    const data = listData || docData;
    const isLoading = listLoading || (listData ? false : docLoading);
    const error = listError || (listData ? null : docError);




    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-cyan-300"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#FDFCEC]">
                <div className="text-black font-bold text-xl">Fund Details not found</div>
                <button onClick={() => navigate(-1)} className="ml-4 px-4 py-2 bg-black text-white rounded-md font-bold hover:bg-gray-800 transition-colors">Go Back</button>
            </div>
        );
    }

    const {
        workflow_state,
        sanction_ref_no,
        fund_received_amt,
        bank_account,
        received_amt_breakup,
        fund_transactions
    } = data;





    return (
        <div className="bg-[#FDFCEC] min-h-screen p-4 md:p-8">
            {/* Header */}
            <AppSidebar />
            <header className="mb-8 flex items-center justify-between bg-white p-4 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                            {/* <DollarSign className="h-6 w-6" /> */}
                            Fund Details
                        </h1>
                        <p className="text-sm font-mono text-gray-600">{name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <FundReceivedWorkflowActions docname={name || ""} onActionComplete={() => window.location.reload()} />



                    <div className={cn("px-3 py-1 rounded-full border-2 border-black font-bold text-sm uppercase", {
                        "bg-yellow-200": workflow_state === "Draft",
                        "bg-blue-200": workflow_state === "Submitted",
                        "bg-green-200": workflow_state === "Approved",
                        "bg-red-200": workflow_state === "Rejected",
                    })}>
                        {workflow_state}
                    </div>
                </div>
            </header>

            {/* Key Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-2 mb-2 text-gray-600">
                        <FileText className="h-5 w-5" />
                        <span className="font-bold uppercase text-xs">Sanction Ref</span>
                    </div>
                    <p className="text-xl font-mono font-bold">{sanction_ref_no || "N/A"}</p>
                </div>
                <div className="bg-white p-6 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-2 mb-2 text-gray-600">
                        {/* <DollarSign className="h-5 w-5" /> */}
                        <span className="font-bold uppercase text-xs">Total Amount</span>
                    </div>
                    <p className="text-xl font-mono font-bold text-green-600">
                        {fund_received_amt?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                    </p>
                </div>
                <div className="bg-white p-6 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-2 mb-2 text-gray-600">
                        <CreditCard className="h-5 w-5" />
                        <span className="font-bold uppercase text-xs">Bank Account</span>
                    </div>
                    <p className="text-xl font-mono font-bold">{bank_account || "N/A"}</p>
                </div>
            </div>

            {/* Budget Breakup Table */}
            <div className="mb-8">
                <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                    <span className="bg-black text-white px-2 py-1 text-sm rounded"></span>
                    Budget Breakup
                </h3>
                <div className="overflow-x-auto border-2 border-black rounded-md bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <table className="min-w-full divide-y-2 divide-black">
                        <thead className="bg-gray-100">
                            <tr className="divide-x-2 divide-black">
                                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider">Account Head</th>
                                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider">Year</th>
                                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black">
                            {received_amt_breakup?.map((item: any, idx: number) => (
                                <tr key={item.name || idx} className="divide-x-2 divide-black hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-sm font-bold">{item.account_head}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-right">
                                        {item.amount_received?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm text-center">{item.budget_year_funds_receive}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-gray-600">{item.remarks}</td>
                                </tr>
                            ))}
                            {(!received_amt_breakup || received_amt_breakup.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">No breakup details available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transactions Table */}
            <div>
                <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                    <span className="bg-black text-white px-2 py-1 text-sm rounded"></span>
                    Transactions
                </h3>
                <div className="overflow-x-auto border-2 border-black rounded-md bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <table className="min-w-full divide-y-2 divide-black">
                        <thead className="bg-gray-100">
                            <tr className="divide-x-2 divide-black">
                                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider">Transaction No</th>
                                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black">
                            {fund_transactions?.map((item: any, idx: number) => (
                                <tr key={item.name || idx} className="divide-x-2 divide-black hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-sm">{item.transaction_date}</td>
                                    <td className="px-4 py-3 font-mono text-sm font-bold">{item.transaction_number}</td>
                                    <td className="px-4 py-3 font-mono text-sm text-right">
                                        {item.amount?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                    </td>
                                </tr>
                            ))}
                            {(!fund_transactions || fund_transactions.length === 0) && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500 italic">No transaction details available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FundReceivedDetails;
