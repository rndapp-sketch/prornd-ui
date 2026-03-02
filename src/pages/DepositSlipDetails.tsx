
import { useParams, useNavigate } from "react-router-dom";
import { useFrappeGetDoc, useFrappePostCall } from "frappe-react-sdk";
import { ArrowLeft, IndianRupee, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/RndSidebar";

// const WorkflowActions = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
//     // Assuming a similar workflow action API exists or can be reused/adapted
//     const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
//         "rndopsapp.rndopsapp.doctype.deposit_slip.deposit_slip.get_deposit_slip_workflow_actions", // Guessing API name based on pattern
//         { docname }
//     );

//     const { call: performAction, loading: actionLoading } = useFrappePostCall(
//         "rndopsapp.rndopsapp.doctype.deposit_slip.deposit_slip.perform_deposit_slip_action" // Guessing API name
//     );

//     const handleAction = async (action: string) => {
//         try {
//             await performAction({ docname, action });
//             onActionComplete();
//         } catch (error) {
//             console.error("Error performing action:", error);
//         }
//     };

//     if (actionsLoading || !data?.message?.length) return null;

//     return (
//         <div className="flex gap-2">
//             {data.message.map((action) => (
//                 <button
//                     key={action}
//                     onClick={() => handleAction(action)}
//                     disabled={actionLoading}
//                     className="px-5 py-2.5 bg-[#D97757] hover:bg-[#D97757] text-white font-semibold border border-[#D97757] rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
//                 >
//                     {actionLoading ? "Processing..." : action}
//                 </button>
//             ))}
//         </div>
//     );
// };

const DepositSlipDetails = () => {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();

    // Fetch the document directly
    const { data, isLoading, error } = useFrappeGetDoc("Deposit slip", name || "");
    const { call: submitDoc } = useFrappePostCall('rndopsapp.rndopsapp.doctype.deposit_slip.deposit_slip.submit_deposit_slip');

    const handleInitialSubmit = async () => {
        if (!name) return;
        try {
            await submitDoc({ docname: name });
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("Failed to submit");
        }
    }


    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-cyan-300"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-claude-bg gap-4">
                <div className="text-zinc-900 dark:text-zinc-100 font-semibold text-xl">Details not found</div>
                <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-[#D97757] text-white rounded-lg font-semibold hover:bg-[#D97757] transition-colors shadow-md">Go Back</button>
            </div>
        );
    }

    const {
        project_title,
        principal_investigator,
        funding_agency,
        total_amount,
        ecs_dates, // Child table
        docstatus
    } = data;

    return (
        <div className="bg-claude-bg min-h-screen">
            <AppSidebar />
            <div className="p-4 md:p-8">
                {/* Header */}
                <header className="mb-8 flex items-center justify-between bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-50 dark:bg-zinc-800/50 rounded-full transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                                Deposit Slip Details
                            </h1>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Workflow Actions or Submit Button */}
                        {docstatus === 0 && (
                            <button
                                onClick={handleInitialSubmit}
                                className="px-5 py-2.5 bg-[#D97757] text-white font-semibold rounded-lg shadow-md hover:bg-[#D97757]"
                            >
                                Submit
                            </button>
                        )}

                        {/* If there are specific workflow actions beyond standard submit, add them here 
                        <WorkflowActions docname={name || ""} onActionComplete={() => window.location.reload()} />
                    */}

                        <div className={cn("px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 font-bold text-sm ", {
                            "bg-yellow-200": docstatus === 0,
                            "bg-green-200": docstatus === 1,
                            "bg-red-200": docstatus === 2,
                        })}>
                            {docstatus === 0 ? "Draft" : docstatus === 1 ? "Submitted" : "Cancelled"}
                        </div>
                    </div>
                </header>

                {/* Key Details Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-zinc-900 p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                <IndianRupee className="h-4 w-4 text-[#D97757]" />
                            </div>
                            <span className="font-medium text-zinc-500 dark:text-zinc-400 text-sm">Total Amount</span>
                        </div>
                        <p className="text-xl font-semibold text-[#D97757]">
                            {total_amount?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                        <span className="font-medium text-zinc-500 dark:text-zinc-400 text-sm block mb-1">Project</span>
                        <p className="font-semibold">{project_title}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                        <span className="font-medium text-zinc-500 dark:text-zinc-400 text-sm block mb-1">Funding Agency</span>
                        <p className="font-semibold">{funding_agency}</p>
                    </div>
                </div>

                {/* Other Fields Section - Dynamic or Static */}
                <div className="bg-white dark:bg-zinc-900 p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Principal Investigator</label>
                        <p className="text-zinc-900 dark:text-zinc-100 mt-1">{principal_investigator}</p>
                    </div>
                    {/* Add more fields here as needed */}
                </div>


                {/* ECS Dates Table */}
                <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-3">
                        <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <FileText className="h-4 w-4 text-[#D97757]" />
                        </div>
                        ECS / Dates
                    </h3>
                    <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
                        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                <tr className="divide-x divide-zinc-200 dark:divide-zinc-800">
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">Date</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-700 dark:text-zinc-300">Amount</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {ecs_dates?.map((item: any, idx: number) => (
                                    <tr key={item.name || idx} className="divide-x divide-zinc-200 dark:divide-zinc-800 hover:bg-zinc-50 dark:bg-zinc-800/50">
                                        <td className="px-4 py-3 text-sm">{item.ecs_date}</td>
                                        <td className="px-4 py-3 text-sm text-right">
                                            {item.amount?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{item.remarks}</td>
                                    </tr>
                                ))}
                                {(!ecs_dates || ecs_dates.length === 0) && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400 italic">No details available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepositSlipDetails;
