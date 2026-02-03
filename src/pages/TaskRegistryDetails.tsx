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
            <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0EA5A4] border-t-transparent"></div>
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
            <div className="flex flex-col h-screen items-center justify-center bg-[#F0F4F8] p-4">
                <div className="bg-white p-8 rounded-xl shadow-md max-w-lg w-full text-center">
                    <div className="text-red-500 font-bold text-xl mb-2">Unexpected Application Error!</div>
                    <div className="text-gray-800 font-medium text-lg mb-4">404 Not Found</div>

                    <div className="bg-gray-100 p-4 rounded-lg text-left text-xs font-mono text-gray-700 overflow-auto max-h-40">
                        <div><strong>Doctype:</strong> {doctype}</div>
                        <div><strong>Name:</strong> {name}</div>
                        <div><strong>Error:</strong> {error ? JSON.stringify(error.message || error) : "No data returned"}</div>
                    </div>

                    <FrappeButton
                        onClick={() => navigate(-1)}
                        className="mt-6 bg-gray-200 hover:bg-gray-300"
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
        <div className="bg-[#F0F4F8] min-h-screen">
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-6 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">Document Details</h1>
                                <p className="text-sm text-gray-500 mt-0.5">{doctype} · <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E0F7F6] text-[#0EA5A4]">{name}</span></p>
                            </div>
                        </div>
                        {/* No action buttons for registry view as it's typically read-only / historic */}
                    </div>
                </header>

                <div className="space-y-6">
                    {/* Primary Details Section */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-5 border-b border-gray-200 pb-3">
                            Overview
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {simpleFields.map(([key, value]) => (
                                <div key={key} className="p-4 rounded-lg">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </label>
                                    <div className="text-sm font-medium text-gray-900 break-words bg-gray-50 px-3 py-2 rounded-lg">
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
                            <div key={key} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-base font-semibold text-gray-900">
                                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                {headers.map(header => (
                                                    <th key={header} className="px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">
                                                        {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </th>
                                                ))}
                                                {isBudgetTable && (
                                                    <th className="px-4 py-3 text-xs font-semibold text-[#0EA5A4] whitespace-nowrap bg-[#E0F7F6]">
                                                        Row Total
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {rows.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                    {headers.map(header => (
                                                        <td key={header} className="px-4 py-3 text-sm text-gray-700">
                                                            {budgetYearColumns.includes(header)
                                                                ? (parseFloat(row[header]) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
                                                                : String(row[header] || '-')
                                                            }
                                                        </td>
                                                    ))}
                                                    {isBudgetTable && (
                                                        <td className="px-4 py-3 text-sm font-semibold text-[#0EA5A4] bg-[#E0F7F6]/30">
                                                            {getRowTotal(row).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                            {/* Total Row */}
                                            {isBudgetTable && (
                                                <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                                                    {headers.map(header => (
                                                        <td key={header} className="px-4 py-3 text-sm text-gray-900">
                                                            {header === 'account_head'
                                                                ? 'Total'
                                                                : budgetYearColumns.includes(header)
                                                                    ? (columnTotals[header] || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
                                                                    : ''
                                                            }
                                                        </td>
                                                    ))}
                                                    <td className="px-4 py-3 text-sm font-bold text-white bg-[#0EA5A4]">
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
                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
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
