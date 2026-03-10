import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFrappeGetDoc } from 'frappe-react-sdk';
import { AppSidebar } from '../components/RndSidebar';
import FundDetails from '../components/FundDetails';
import { ArrowLeft, IndianRupee, FileText, Plus } from 'lucide-react';

const FundSanctionView: React.FC = () => {
    const navigate = useNavigate();
    const { sanctionName } = useParams<{ sanctionName: string }>();
    const { data, isLoading, error } = useFrappeGetDoc('Fund Sanction', sanctionName);

    // Fetch the linked Project Registration doc to get project_no
    const projectProposal = data?.project_proposal || '';
    const { data: projectRegData } = useFrappeGetDoc(
        'Project Registration',
        projectProposal,
        { revalidateOnFocus: false, isPaused: () => !projectProposal }
    );

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full bg-claude-bg">
                <AppSidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent mx-auto mb-4"></div>
                        <p className="text-zinc-600 dark:text-zinc-400">Loading Sanction Details...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex min-h-screen w-full bg-claude-bg">
                <AppSidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                        <p className="text-lg font-semibold text-red-600 mb-4">Failed to load sanction details</p>
                        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-[#D97757] text-white rounded-lg font-medium hover:bg-[#c5684a]">Go Back</button>
                    </div>
                </main>
            </div>
        );
    }

    const projectRef = data?.project_proposal || data?.refnum_prj_num || '';
    const projectNo = projectRegData?.project_no || '';

    return (
        <div className="flex min-h-screen w-full bg-claude-bg">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                <header className="mb-6 p-4 flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                            <ArrowLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                Sanction: {data?.sanctioned_letter_no || sanctionName}
                            </h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Project: {projectRef}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/add-fund-received/${sanctionName}/?project_no=${encodeURIComponent(projectNo)}`)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D97757] hover:bg-[#c5684a] text-white font-semibold text-sm rounded-lg shadow-sm transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Add Received Fund
                    </button>
                </header>

                {/* Sanction Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                <IndianRupee className="h-4 w-4 text-[#D97757]" />
                            </div>
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Total Sanctioned</span>
                        </div>
                        <p className="text-xl font-bold text-[#D97757]">
                            {(data?.total_sanctioned_amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                <FileText className="h-4 w-4 text-[#D97757]" />
                            </div>
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Letter No</span>
                        </div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{data?.sanctioned_letter_no || '-'}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                <FileText className="h-4 w-4 text-[#D97757]" />
                            </div>
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Letter Date</span>
                        </div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{data?.sanctioned_letter_date || '-'}</p>
                    </div>
                </div>

                {/* Budget Breakup Table */}
                {data?.sanctioned_budget_breakup && data.sanctioned_budget_breakup.length > 0 && (
                    <div className="mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">Sanctioned Budget Breakup</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Account Head</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Year 1</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Year 2</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Year 3</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {data.sanctioned_budget_breakup.map((row: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                                            <td className="px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">{row.account_head}</td>
                                            <td className="px-4 py-2.5 text-sm text-right tabular-nums text-zinc-600 dark:text-zinc-300">{(parseFloat(row.first_year_budget) || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-2.5 text-sm text-right tabular-nums text-zinc-600 dark:text-zinc-300">{(parseFloat(row.second_year_budget) || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-2.5 text-sm text-right tabular-nums text-zinc-600 dark:text-zinc-300">{(parseFloat(row.third_year_budget) || 0).toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Fund Received Records — uses FundDetails component */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Received Funds</h2>
                    <FundDetails
                        project_title={projectNo}
                        sanction_ref_no={sanctionName}
                    />
                </div>
            </main>
        </div>
    );
};

export default FundSanctionView;