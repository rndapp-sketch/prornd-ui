import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDoc, useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { FaArrowLeft } from 'react-icons/fa';
import { AppSidebar } from '@/components/RndSidebar';
import { NeoButton } from '@/components/ui/neo-brutalism';
import ProjectDetailsView from "./ProjectDetails";

const ReimbursementWorkflowActions = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.get_reimbursement_workflow_actions",
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.perform_reimbursement_action"
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
                <NeoButton
                    key={action}
                    onClick={() => handleAction(action)}
                    disabled={actionLoading}
                    className="bg-yellow-200 hover:bg-yellow-300 text-black border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
                >
                    {actionLoading ? "Processing..." : action}
                </NeoButton>
            ))}
        </div>
    );
};

const FundSanctionWorkflowActions = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_fund_sanction_workflow_actions",
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.perform_fund_sanction_action"
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
                <NeoButton
                    key={action}
                    onClick={() => handleAction(action)}
                    disabled={actionLoading}
                    className="bg-yellow-200 hover:bg-yellow-300 text-black border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
                >
                    {actionLoading ? "Processing..." : action}
                </NeoButton>
            ))}
        </div>
    );
};

const PendingTaskDetails: React.FC = () => {
    const { doctype, name } = useParams<{ doctype: string; name: string }>();
    const navigate = useNavigate();

    const { data, isLoading, error, mutate } = useFrappeGetDoc(doctype || "", name || "");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-cyan-300"></div>
            </div>
        );
    }

    if (doctype === "Project Registration") {
        return (
            <ProjectDetailsView
                projectName={name}
                backUrl="/pending-task"
                backLabel="Back to Pending Tasks"
            />
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#FDFCEC]">
                <div className="text-black font-bold text-xl">Task not found</div>
            </div>
        );
    }

    // Separate simple fields and table fields
    const simpleFields = Object.entries(data).filter(([key, value]) => {
        // Simple fields are not arrays and not objects (except null), and don't start with underscore
        return !Array.isArray(value) && (typeof value !== 'object' || value === null) && !key.startsWith('_');
    });

    const tableFields = Object.entries(data).filter(([key, value]) => {
        // Table fields must be arrays
        return Array.isArray(value) && !key.startsWith('_');
    });

    return (
        <div className="bg-[#FDFCEC] min-h-screen">
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform">
                                <FaArrowLeft className="h-6 w-6" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-extrabold text-black">Task Details</h1>
                                <p className="text-gray-700 font-mono mt-1">{doctype} - {name}</p>
                            </div>
                        </div>
                        {doctype === "Reimbursement" && name && (
                            <ReimbursementWorkflowActions docname={name} onActionComplete={() => { mutate(); navigate(-1); }} />
                        )}
                        {doctype === "Fund Sanction" && name && (
                            <FundSanctionWorkflowActions docname={name} onActionComplete={() => { mutate(); navigate(-1); }} />
                        )}
                    </div>
                </header>

                <div className="space-y-8">
                    {/* Primary Details Section */}
                    <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)] p-6">
                        <h2 className="text-2xl font-extrabold text-black mb-6 border-b-2 border-black pb-2">
                            Overview
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {simpleFields.map(([key, value]) => (
                                <div key={key} className="bg-gray-50 p-3 rounded border-2 border-gray-200 hover:border-black transition-colors">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wider">
                                        {key.replace(/_/g, ' ')}
                                    </label>
                                    <div className="text-base font-bold text-black break-words">
                                        {String(value)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Child Tables Section */}
                    {tableFields.map(([key, value]) => {
                        const rows = value as any[];
                        if (rows.length === 0) return null;

                        // Get headers from the first object, filtering out internal fields
                        const headers = Object.keys(rows[0]).filter(k => !k.startsWith('_') && k !== 'name' && k !== 'owner' && k !== 'creation' && k !== 'modified' && k !== 'modified_by' && k !== 'docstatus' && k !== 'idx' && k !== 'parent' && k !== 'parentfield' && k !== 'parenttype');

                        return (
                            <div key={key} className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden">
                                <div className="p-4 border-b-2 border-black bg-gray-100">
                                    <h3 className="text-xl font-extrabold text-black uppercase tracking-tight">
                                        {key.replace(/_/g, ' ')}
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b-2 border-black">
                                                {headers.map(header => (
                                                    <th key={header} className="p-3 font-bold text-black border-r-2 border-black last:border-r-0 uppercase text-sm whitespace-nowrap">
                                                        {header.replace(/_/g, ' ')}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row, idx) => (
                                                <tr key={idx} className="border-b-2 border-black last:border-b-0 hover:bg-[#FDFCEC]">
                                                    {headers.map(header => (
                                                        <td key={header} className="p-3 border-r-2 border-black last:border-r-0 text-sm font-medium text-gray-800">
                                                            {String(row[header] || '-')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}

                    <div className="flex justify-end gap-4 pb-8">
                        <NeoButton
                            className="bg-white hover:bg-gray-100 text-black border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]"
                            onClick={() => navigate(-1)}
                        >
                            Back to List
                        </NeoButton>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PendingTaskDetails;
