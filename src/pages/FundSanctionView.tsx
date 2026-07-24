import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFrappeGetDoc, useFrappePostCall } from 'frappe-react-sdk';
import { AppSidebar } from '../components/RndSidebar';
import FundDetails from '../components/FundDetails';
import { ArrowLeft, IndianRupee, FileText, Plus } from 'lucide-react';
import { ActivityLog } from '../components/ActivityLog';

const FundSanctionView: React.FC = () => {
    const navigate = useNavigate();
    const { sanctionName } = useParams<{ sanctionName: string }>();
    const { data, isLoading, error } = useFrappeGetDoc('Fund Sanction', sanctionName);

    const projectProposal = data?.project_proposal || '';
    const { data: projectRegData, mutate: mutateProjectReg } = useFrappeGetDoc(
        'Project Registration',
        projectProposal || undefined,
        projectProposal || null,
    );

    const { call: updatePfmsFields } = useFrappePostCall(
        'rndopsapp.rndopsapp.doctype.project_registration.project_registration.update_project_fields'
    );
    const [pfmsForm, setPfmsForm] = useState({
        is_the_account_type_pfms: '',
        scheme_name: '',
        enter_scheme_number: '',
        account_number: '',
        bank_name: '',
    });
    const [isSavingPfms, setIsSavingPfms] = useState(false);

    useEffect(() => {
        if (projectRegData) {
            setPfmsForm({
                is_the_account_type_pfms: projectRegData.is_the_account_type_pfms || '',
                scheme_name: projectRegData.scheme_name || '',
                enter_scheme_number: projectRegData.enter_scheme_number || '',
                account_number: projectRegData.account_number || '',
                bank_name: projectRegData.bank_name || '',
            });
        }
    }, [projectRegData]);

    const handleSavePfms = useCallback(async () => {
        if (!projectProposal) return;
        setIsSavingPfms(true);
        try {
            await updatePfmsFields({
                docname: projectProposal,
                is_the_account_type_pfms: pfmsForm.is_the_account_type_pfms,
                scheme_name: pfmsForm.scheme_name,
                enter_scheme_number: pfmsForm.enter_scheme_number,
                account_number: pfmsForm.account_number,
                bank_name: pfmsForm.bank_name,
            });
            await mutateProjectReg();
            alert('Account details saved successfully.');
        } catch (e: any) {
            alert('Failed to save account details: ' + (e?.message || 'Unknown error'));
        } finally {
            setIsSavingPfms(false);
        }
    }, [projectProposal, pfmsForm, updatePfmsFields, mutateProjectReg]);

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
                        onClick={() => navigate(`/add-fund-received/${sanctionName}/?project_no=${encodeURIComponent(projectNo)}&project_reg=${encodeURIComponent(projectProposal)}`)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D97757] hover:bg-[#c5684a] text-white font-semibold text-sm rounded-lg shadow-sm transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Add Received Fund
                    </button>
                </header>

                {/* Main content + sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Sanction Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
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

                        {/* Fund Received Records */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Received Funds</h2>
                            <FundDetails
                                project_title={projectNo}
                                sanction_ref_no={sanctionName}
                            />
                        </div>
                    </div>

                    {/* Sidebar — Account Details + Activity Log */}
                    <aside className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-5 space-y-4">
                            <h3 className="text-sm font-bold uppercase text-zinc-900 dark:text-zinc-100 tracking-wide">
                                Account Details
                            </h3>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                        Is Account Type PFMS?
                                    </label>
                                    <select
                                        className="w-full h-8 px-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                                        value={pfmsForm.is_the_account_type_pfms}
                                        onChange={e => setPfmsForm(p => ({ ...p, is_the_account_type_pfms: e.target.value }))}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Yes">PFMS</option>
                                        <option value="No">Bank Account</option>
                                    </select>
                                </div>
                                {pfmsForm.is_the_account_type_pfms === 'Yes' && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Scheme Name</label>
                                            <input
                                                type="text"
                                                className="w-full h-8 px-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                                                value={pfmsForm.scheme_name}
                                                onChange={e => setPfmsForm(p => ({ ...p, scheme_name: e.target.value }))}
                                                placeholder="Enter scheme name"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Scheme Number</label>
                                            <input
                                                type="text"
                                                className="w-full h-8 px-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                                                value={pfmsForm.enter_scheme_number}
                                                onChange={e => setPfmsForm(p => ({ ...p, enter_scheme_number: e.target.value }))}
                                                placeholder="Enter scheme number"
                                            />
                                        </div>
                                    </>
                                )}
                                {pfmsForm.is_the_account_type_pfms === 'No' && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Account Number</label>
                                            <input
                                                type="text"
                                                className="w-full h-8 px-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                                                value={pfmsForm.account_number}
                                                onChange={e => setPfmsForm(p => ({ ...p, account_number: e.target.value }))}
                                                placeholder="Enter account number"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Bank Name</label>
                                            <input
                                                type="text"
                                                className="w-full h-8 px-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                                                value={pfmsForm.bank_name}
                                                onChange={e => setPfmsForm(p => ({ ...p, bank_name: e.target.value }))}
                                                placeholder="Enter bank name"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={handleSavePfms}
                                disabled={isSavingPfms}
                                className="w-full py-2 text-xs font-semibold bg-[#D97757] hover:bg-[#c96a46] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSavingPfms ? 'Saving...' : 'Save Account Details'}
                            </button>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-5">
                            {sanctionName && (
                                <ActivityLog doctype="Fund Sanction" docname={sanctionName} />
                            )}
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default FundSanctionView;
