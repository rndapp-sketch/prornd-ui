import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDoc } from 'frappe-react-sdk';
import { ArrowLeftIcon } from "lucide-react";
import { AppSidebar } from '@/components/RndSidebar';
import { FrappeButton } from '@/components/ui/neo-brutalism';
import ProjectDetailsView from "./ProjectDetails";

// Fields to hide from the overview
const HIDDEN_FIELDS = [
    'total_first_year_budget_1',
    'total_second_year_budget_1',
    'total_third_year_budget_1',
    'total_fourth_year_budget_1',
    'total_fifth_year_budget_1',
    'grand_total_proposal_1',
    'total_first_year_budget',
    'total_second_year_budget',
    'total_third_year_budget',
    'total_fourth_year_budget',
    'total_fifth_year_budget',
    'grand_total_proposal',
];

const TaskRegistryDetails: React.FC = () => {
    const { doctype, name } = useParams<{ doctype: string; name: string }>();
    const navigate = useNavigate();

    const { data, isLoading, error } = useFrappeGetDoc(doctype || "", name || "");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent"></div>
            </div>
        );
    }

    if (doctype === "Project Registration") {
        return (
            <ProjectDetailsView
                projectName={name}
                backUrl="/task-registry"
                backLabel="Back to Registry"
            />
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-claude-bg p-4">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-md max-w-lg w-full text-center">
                    <div className="text-red-500 font-bold text-xl mb-2">Unexpected Application Error!</div>
                    <div className="text-zinc-800 dark:text-zinc-200 font-medium text-lg mb-4">404 Not Found</div>

                    <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg text-left text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-auto max-h-40">
                        <div><strong>Doctype:</strong> {doctype}</div>
                        <div><strong>Name:</strong> {name}</div>
                        <div><strong>Error:</strong> {error ? JSON.stringify(error.message || error) : "No data returned"}</div>
                    </div>

                    <FrappeButton
                        onClick={() => navigate(-1)}
                        className="mt-6 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:bg-zinc-600"
                    >
                        Go Back
                    </FrappeButton>
                </div>
            </div>
        );
    }

    // Separate simple fields and table fields, filtering out hidden fields
    const simpleFields = Object.entries(data).filter(([key, value]) => {
        // Check if key is in hidden fields list
        if (HIDDEN_FIELDS.includes(key)) return false;
        // Simple fields are not arrays and not objects (except null), and don't start with underscore
        return !Array.isArray(value) && (typeof value !== 'object' || value === null) && !key.startsWith('_') && key !== 'docstatus' && key !== 'idx' && key !== 'creation' && key !== 'modified' && key !== 'owner' && key !== 'name' && key !== 'doctype';
    });

    const tableFields = Object.entries(data).filter(([key, value]) => {
        // Table fields must be arrays
        return Array.isArray(value) && !key.startsWith('_');
    });

    return (
        <div className="bg-claude-bg min-h-screen">
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-6 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:bg-zinc-800 transition-colors">
                                <ArrowLeftIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                            </button>
                            <div>
                                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Document Details</h1>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{doctype} · <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-50 dark:bg-zinc-800 text-[#D97757]">{name}</span></p>
                            </div>
                        </div>
                        {/* No action buttons for registry view as it's typically read-only / historic */}
                    </div>
                </header>

                <div className="space-y-6">
                    {/* Primary Details Section */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                            Overview
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {simpleFields.map(([key, value]) => (
                                <div key={key} className="p-4 rounded-lg">
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </label>
                                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 break-words bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 rounded-lg">
                                        {String(value) || '-'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Child Tables Section */}
                    {tableFields.map(([key, value]) => {
                        const rows = value as any[];
                        if (rows.length === 0) return null;

                        // Check if this is a budget breakup table
                        const isBudgetTable = key.toLowerCase().includes('budget') || key.toLowerCase().includes('breakup');

                        // Budget year columns for totals calculation
                        const budgetYearColumns = [
                            'first_year_budget',
                            'second_year_budget',
                            'third_year_budget',
                            'fourth_year_budget',
                            'fifth_year_budget'
                        ];

                        // Get headers from the first object, filtering out internal fields and unwanted columns
                        const hiddenTableColumns = ['is_total_row', 'doctype', 'total_proposal_of_heads'];
                        const headers = Object.keys(rows[0]).filter(k =>
                            !k.startsWith('_') &&
                            k !== 'name' && k !== 'owner' && k !== 'creation' &&
                            k !== 'modified' && k !== 'modified_by' && k !== 'docstatus' &&
                            k !== 'idx' && k !== 'parent' && k !== 'parentfield' && k !== 'parenttype' &&
                            !hiddenTableColumns.includes(k.toLowerCase())
                        );

                        // Calculate row totals if it's a budget table
                        const getRowTotal = (row: any) => {
                            return budgetYearColumns.reduce((sum, col) => {
                                const val = parseFloat(row[col]) || 0;
                                return sum + val;
                            }, 0);
                        };

                        // Calculate column totals
                        const columnTotals: Record<string, number> = {};
                        if (isBudgetTable) {
                            budgetYearColumns.forEach(col => {
                                columnTotals[col] = rows.reduce((sum, row) => {
                                    const val = parseFloat(row[col]) || 0;
                                    return sum + val;
                                }, 0);
                            });
                        }
                        const grandTotal = Object.values(columnTotals).reduce((sum, val) => sum + val, 0);

                        return (
                            <div key={key} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                                                {headers.map(header => (
                                                    <th key={header} className="px-4 py-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                                        {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </th>
                                                ))}
                                                {isBudgetTable && (
                                                    <th className="px-4 py-3 text-xs font-semibold text-[#D97757] whitespace-nowrap bg-zinc-50 dark:bg-zinc-800">
                                                        Row Total
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {rows.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-zinc-50 dark:bg-zinc-800/50/50 transition-colors">
                                                    {headers.map(header => (
                                                        <td key={header} className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                                                            {budgetYearColumns.includes(header)
                                                                ? (parseFloat(row[header]) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
                                                                : String(row[header] || '-')
                                                            }
                                                        </td>
                                                    ))}
                                                    {isBudgetTable && (
                                                        <td className="px-4 py-3 text-sm font-semibold text-[#D97757] bg-zinc-50 dark:bg-zinc-800/30">
                                                            {getRowTotal(row).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                            {/* Total Row */}
                                            {isBudgetTable && (
                                                <tr className="bg-zinc-100 dark:bg-zinc-800 border-t-2 border-zinc-300 dark:border-zinc-700 font-semibold">
                                                    {headers.map(header => (
                                                        <td key={header} className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                                                            {header === 'account_head'
                                                                ? 'Total'
                                                                : budgetYearColumns.includes(header)
                                                                    ? (columnTotals[header] || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
                                                                    : ''
                                                            }
                                                        </td>
                                                    ))}
                                                    <td className="px-4 py-3 text-sm font-bold text-white bg-[#D97757]">
                                                        {grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}

                    <div className="flex justify-end gap-3 pb-8">
                        <FrappeButton
                            className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
                            onClick={() => navigate(-1)}
                        >
                            Back to Registry
                        </FrappeButton>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TaskRegistryDetails;
