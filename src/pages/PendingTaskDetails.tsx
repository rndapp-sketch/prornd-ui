import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDoc, useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { ArrowLeftIcon, FileIcon, ExternalLinkIcon } from "lucide-react";
import { AppSidebar } from '@/components/RndSidebar';
import { FrappeButton } from '@/components/ui/neo-brutalism';
import ProjectDetailsView from "./ProjectDetails";
import { cn } from '@/lib/utils';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { travelAPI } from '@/services/apiService';
import { ActivityStream } from '@/components/ActivityStream';
import { BudgetActionsSidebar } from '@/components/BudgetActionsSidebar';

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
    'amended_from',
    'workflow_state'
];

// Style constants matching DynamicFormRenderer
const inputClasses = "w-full min-h-[48px] px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 shadow-sm flex items-center";
const labelClasses = "block font-medium text-gray-900 mb-2";

const CommentModal = ({ isOpen, onClose, onSubmit, action, isLoading }: { isOpen: boolean; onClose: () => void; onSubmit: (comment: string) => void; action: string; isLoading: boolean }) => {
    const [comment, setComment] = React.useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm {action}</h3>
                <textarea
                    className="w-full border border-gray-300 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.25)] focus:border-[#0EA5A4]"
                    rows={4}
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <FrappeButton onClick={onClose} className="bg-gray-100 hover:bg-gray-200" disabled={isLoading}>Cancel</FrappeButton>
                    <FrappeButton
                        onClick={() => onSubmit(comment)}
                        disabled={isLoading}
                        className="bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white"
                    >
                        {isLoading ? "Processing..." : "Confirm"}
                    </FrappeButton>
                </div>
            </div>
        </div>
    );
};

const ReimbursementWorkflowActions = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.get_reimbursement_workflow_actions",
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.perform_reimbursement_action"
    );

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <>
            <div className="flex gap-2">
                {data.message.map((action) => (
                    <FrappeButton
                        key={action}
                        onClick={() => handleActionClick(action)}
                        disabled={actionLoading}
                        className="bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white"
                    >
                        {action}
                    </FrappeButton>
                ))}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
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

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <>
            <div className="flex gap-2">
                {data.message.map((action) => (
                    <FrappeButton
                        key={action}
                        onClick={() => handleActionClick(action)}
                        disabled={actionLoading}
                        className="bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white"
                    >
                        {action}
                    </FrappeButton>
                ))}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
    );
};

const TravelWorkflowActions = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.travel.travel.get_travel_workflow_actions",
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.travel.travel.perform_travel_action"
    );

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <>
            <div className="flex gap-2">
                {data.message.map((action) => (
                    <FrappeButton
                        key={action}
                        onClick={() => handleActionClick(action)}
                        disabled={actionLoading}
                        className="bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white"
                    >
                        {action}
                    </FrappeButton>
                ))}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
    );
};

// Helper to check if a value is a file path
const isFilePath = (value: string) => {
    if (typeof value !== 'string') return false;
    // Check for common file indicators
    return value.startsWith('/private/files/') ||
        value.startsWith('/files/') ||
        value.match(/\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/i);
};

// Function to get filename from path
const getFileName = (path: string) => {
    return path.split('/').pop() || path;
};

const PendingTaskDetails: React.FC = () => {
    const { doctype, name } = useParams<{ doctype: string; name: string }>();
    const navigate = useNavigate();

    const { data, isLoading, error } = useFrappeGetDoc(doctype || "", name || "");

    // Additional state for Travel Dynamic Form
    const [travelFields, setTravelFields] = useState<FormField[]>([]);
    const [travelLinkOptions, setTravelLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isTravelLoading, setIsTravelLoading] = useState(false);

    const { call: fetchTravelFields } = useFrappePostCall<{ message: { fields: FormField[], link_options: any } }>(travelAPI.getFields);

    // Fetch Travel Fields if doctype is Travel
    useEffect(() => {
        if (doctype === 'Travel' && name) {
            setIsTravelLoading(true);
            fetchTravelFields({ doc_name: name })
                .then((res) => {
                    if (res?.message) {
                        setTravelFields(res.message.fields || []);
                        setTravelLinkOptions(res.message.link_options || {});
                    }
                })
                .catch(err => console.error("Error fetching travel fields", err))
                .finally(() => setIsTravelLoading(false));
        }
    }, [doctype, name, fetchTravelFields]);


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
                backUrl="/pending-task"
                backLabel="Back to Pending Tasks"
            />
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#F0F4F8]">
                <div className="text-gray-600 font-medium text-xl">Task not found</div>
            </div>
        );
    }

    // Default Render Logic (for non-Travel or fallback)
    const renderGenericDetails = () => {
        const simpleFields = Object.entries(data).filter(([key, value]) => {
            if (HIDDEN_FIELDS.includes(key)) return false;
            return !Array.isArray(value) && (typeof value !== 'object' || value === null) && !key.startsWith('_') && key !== 'docstatus' && key !== 'idx' && key !== 'creation' && key !== 'modified' && key !== 'owner' && key !== 'name' && key !== 'doctype';
        });

        const tableFields = Object.entries(data).filter(([key, value]) => {
            return Array.isArray(value) && !key.startsWith('_');
        });

        return (
            <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-5 border-b border-gray-200 pb-3">
                        Overview
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {simpleFields.map(([key, value]) => {
                            const isFile = isFilePath(String(value));
                            const displayValue = isFile ? getFileName(String(value)) : String(value);

                            return (
                                <div key={key}>
                                    <label className={labelClasses}>
                                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </label>

                                    {isFile ? (
                                        <div className="flex items-center gap-3">
                                            <a
                                                href={String(value)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-3 bg-[#E0F7F6] text-[#0EA5A4] rounded-xl hover:bg-[#0EA5A4] hover:text-white transition-colors font-medium w-full border border-transparent hover:border-[#0EA5A4]"
                                            >
                                                <FileIcon className="h-4 w-4 flex-shrink-0" />
                                                <span className="truncate">{displayValue}</span>
                                                <ExternalLinkIcon className="h-3 w-3 ml-auto flex-shrink-0 opacity-50" />
                                            </a>
                                        </div>
                                    ) : (
                                        <div className={cn(inputClasses, "text-sm break-words")}>
                                            {(value === null || value === undefined) ? '-' : displayValue}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {tableFields.map(([key, value]) => {
                    const rows = value as any[];
                    if (rows.length === 0) return null;

                    const isBudgetTable = key.toLowerCase().includes('budget') || key.toLowerCase().includes('breakup');
                    const budgetYearColumns = [
                        'first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget'
                    ];
                    const hiddenTableColumns = ['is_total_row', 'doctype', 'total_proposal_of_heads'];
                    const headers = Object.keys(rows[0]).filter(k =>
                        !k.startsWith('_') && k !== 'name' && k !== 'owner' && k !== 'creation' && k !== 'modified' && k !== 'modified_by' && k !== 'docstatus' && k !== 'idx' && k !== 'parent' && k !== 'parentfield' && k !== 'parenttype' && !hiddenTableColumns.includes(k.toLowerCase())
                    );

                    const getRowTotal = (row: any) => budgetYearColumns.reduce((sum, col) => sum + (parseFloat(row[col]) || 0), 0);
                    const columnTotals: Record<string, number> = {};
                    if (isBudgetTable) {
                        budgetYearColumns.forEach(col => {
                            columnTotals[col] = rows.reduce((sum, row) => sum + (parseFloat(row[col]) || 0), 0);
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
                                                <th className="px-4 py-3 text-xs font-semibold text-[#0EA5A4] whitespace-nowrap bg-[#E0F7F6]">Row Total</th>
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
                                        {isBudgetTable && (
                                            <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                                                {headers.map(header => (
                                                    <td key={header} className="px-4 py-3 text-sm text-gray-900">
                                                        {header === 'account_head' ? 'Total' : budgetYearColumns.includes(header) ? (columnTotals[header] || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) : ''}
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
            </div>
        );
    };

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
                                <h1 className="text-xl font-semibold text-gray-900">Task Details</h1>
                                <p className="text-sm text-gray-500 mt-0.5">{doctype} · <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E0F7F6] text-[#0EA5A4]">{name}</span></p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {doctype === "Reimbursement" && name && (
                                <ReimbursementWorkflowActions docname={name} onActionComplete={() => window.location.reload()} />
                            )}
                            {doctype === "Fund Sanction" && name && (
                                <FundSanctionWorkflowActions docname={name} onActionComplete={() => window.location.reload()} />
                            )}
                            {doctype === "Travel" && name && (
                                <TravelWorkflowActions docname={name} onActionComplete={() => window.location.reload()} />
                            )}
                        </div>
                    </div>
                </header>

                {/* Content Grid with Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Main Detail View */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Render Dynamic Form for Travel if fields are available, else fallback to generic */}
                        {doctype === 'Travel' ? (
                            isTravelLoading ? (
                                <div className="flex h-64 items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0EA5A4]"></div>
                                        <p className="text-gray-500 text-sm">Loading details...</p>
                                    </div>
                                </div>
                            ) : travelFields.length > 0 ? (
                                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                                    <DynamicFormRenderer
                                        fields={travelFields}
                                        formData={data}
                                        linkOptions={travelLinkOptions}
                                        onChange={() => { }}
                                        onFileChange={() => { }}
                                        onTableRowChange={() => { }}
                                        onTableFileChange={() => { }}
                                        onAddTableRow={() => { }}
                                        onDeleteTableRow={() => { }}
                                        readOnly={true}
                                    />
                                </div>
                            ) : (
                                renderGenericDetails()
                            )
                        ) : (
                            renderGenericDetails()
                        )}
                    </div>

                    {/* Right Column: Activity Stream Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="sticky top-6 space-y-6">
                            {/* Budget Actions (Only for Travel if project info available) */}
                            {doctype === 'Travel' && data?.travel_project_title && (
                                <BudgetActionsSidebar
                                    projectName={data.travel_project_title}
                                    isStaff={true} // Assuming user is staff if viewing Pending Task
                                />
                            )}
                            <ActivityStream doctype={doctype || ""} docname={name || ""} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pb-8 mt-6">
                    <FrappeButton
                        className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                        onClick={() => navigate(-1)}
                    >
                        Back to List
                    </FrappeButton>
                </div>
            </main>
        </div>
    );
};

export default PendingTaskDetails;
