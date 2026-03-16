import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDoc, useFrappePostCall, useFrappeGetCall, useFrappeAuth } from 'frappe-react-sdk';
import { ArrowLeftIcon, FileIcon, ExternalLinkIcon } from "lucide-react";
import { AppSidebar } from '@/components/RndSidebar';
import { FrappeButton } from '@/components/ui/neo-brutalism';
import ProjectDetailsView from "./ProjectDetails";
import TemporaryAdvanceDetailsView from "./TemporaryAdvanceDetailsView";
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { travelAPI, advanceSettlementAPI, temporaryAdvanceAPI, directPurchaseAPI, tadaAPI } from '@/services/apiService';
import { ActivityStream } from '@/components/ActivityStream';
import { BudgetActionsSidebar } from '@/components/BudgetActionsSidebar';
import TemporaryAdvanceActionButtons from '@/components/TemporaryAdvanceActionButtons';
import TADASettlementActionButtons from '@/components/TADASettlementActionButtons';
import DisbursalOfHonorariumActionButtons from '@/components/DisbursalOfHonorariumActionButtons';
import { useUserRoles } from '@/components/UserRole';

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

// Style constants for generic details
const labelClasses = "text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 block";
const valueClasses = "text-[15px] font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed break-words";

const CommentModal = ({ isOpen, onClose, onSubmit, action, isLoading }: { isOpen: boolean; onClose: () => void; onSubmit: (comment: string) => void; action: string; isLoading: boolean }) => {
    const [comment, setComment] = React.useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Confirm {action}</h3>
                <textarea
                    className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(217,119,87,0.25)] focus:border-[#D97757]"
                    rows={4}
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <FrappeButton onClick={onClose} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700" disabled={isLoading}>Cancel</FrappeButton>
                    <FrappeButton
                        onClick={() => onSubmit(comment)}
                        disabled={isLoading}
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
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
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
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
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
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
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
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

const DirectPurchaseWorkflowActions = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        directPurchaseAPI.getWorkflowActions,
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        directPurchaseAPI.performAction
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
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
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
    const { doctype: rawDoctype, name } = useParams<{ doctype: string; name: string }>();
    const navigate = useNavigate();
    // Decode the doctype URL parameter
    const doctype = rawDoctype ? decodeURIComponent(rawDoctype) : '';

    const { data, isLoading, error } = useFrappeGetDoc(doctype || "", name || "");

    // Auth & Roles
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isRnDStaff = roles.some(r =>
        r === "RnD Staff" || r === "R&D Staff" || r === "Research and Development Staff" || r === "System Manager" || r === "staff, RnD" || r === "Hos, RnD (Head of Section, RnD)"
    );

    // Additional state for Travel Dynamic Form
    const [travelFields, setTravelFields] = useState<FormField[]>([]);
    const [travelLinkOptions, setTravelLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isTravelLoading, setIsTravelLoading] = useState(false);

    // State for Advance Settlement Fields
    const [advanceSettlementFields, setAdvanceSettlementFields] = useState<FormField[]>([]);
    const [advanceSettlementLinkOptions, setAdvanceSettlementLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isAdvanceSettlementLoading, setIsAdvanceSettlementLoading] = useState(false);

    // State for Temporary Advance Fields
    const [temporaryAdvanceFields, setTemporaryAdvanceFields] = useState<FormField[]>([]);
    const [temporaryAdvanceLinkOptions, setTemporaryAdvanceLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isTemporaryAdvanceLoading, setIsTemporaryAdvanceLoading] = useState(false);

    // State for TA DA Settlement Fields
    const [tadaFields, setTadaFields] = useState<FormField[]>([]);
    const [tadaLinkOptions, setTadaLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isTadaLoading, setIsTadaLoading] = useState(false);

    const { call: fetchTravelFields } = useFrappePostCall<{ message: { fields: FormField[], link_options: any } }>(travelAPI.getFields);
    const { call: fetchAdvanceSettlementFields } = useFrappePostCall<{ message: { fields: FormField[], link_options: any, child_table_meta?: any } }>(advanceSettlementAPI.getFields);
    const { call: fetchTemporaryAdvanceFields } = useFrappePostCall<{ message: { fields: FormField[], link_options: any } }>(temporaryAdvanceAPI.getFields);
    const { call: fetchTadaFields } = useFrappePostCall<{ message: { fields: FormField[], link_options: any, child_table_meta?: any } }>(tadaAPI.getFields);
    // State for display data (to handle ID resolution)
    const [displayData, setDisplayData] = useState<Record<string, any>>({});

    // Update displayData when data changes
    useEffect(() => {
        if (data) {
            setDisplayData(data);
        }
    }, [data]);

    // Helper to resolve Linked fields to readable names
    const resolveLinkFields = async (fields: FormField[], currentData: Record<string, any>) => {
        const fieldsToResolve = fields.filter(f =>
            (f.fieldname === 'applicant_department' || f.fieldname === 'applicant_category' || f.fieldname.includes('department') || f.fieldname.includes('category')) &&
            f.fieldtype === 'Link' &&
            f.options &&
            currentData[f.fieldname]
        );

        if (fieldsToResolve.length === 0) return;

        const updates: Record<string, any> = {};

        await Promise.all(fieldsToResolve.map(async (field) => {
            const value = currentData[field.fieldname];
            if (!value) return;

            try {
                // Fetch the linked document
                // We use a specific call or generic get_value if possible, but get_doc is safer without specific API
                const response = await (window as any).frappe?.call({
                    method: 'frappe.client.get',
                    args: {
                        doctype: field.options,
                        name: value
                    }
                });

                if (response?.message) {
                    const doc = response.message;
                    // Try to find a readable field
                    // Common readable fields: title, department_name, employee_category_name, name (if not hash-like)
                    // We can also check if the doc has a 'meta' title_field, but we don't have that here.

                    let readable = value;
                    if (doc.title) readable = doc.title;
                    else if (doc.department_name) readable = doc.department_name;
                    else if (doc.employee_category_name) readable = doc.employee_category_name;
                    else if (doc.designation_name) readable = doc.designation_name;
                    else if (doc.name && doc.name !== value) readable = doc.name; // If name is different from ID (unlikely in Frappe unless custom)

                    // Special case for our known hashes
                    if (field.options === 'Department' && doc.department_name) readable = doc.department_name;
                    if (field.options === 'Employee Category' && doc.name) readable = doc.name; // Often Category name IS the ID if readable, but here it's a hash
                    // If Employee Category uses 'name' as human readable but we see a hash, then maybe the field is different.
                    // Let's look for any likely field.
                    if (readable === value) {
                        // Fallback: look for any string field that isn't the ID
                        const potential = Object.values(doc).find(v => typeof v === 'string' && v !== value && (v as string).length > 2 && (v as string).length < 50);
                        if (potential) readable = potential as string;
                    }

                    updates[field.fieldname] = readable;
                }
            } catch (e) {
                console.warn(`Failed to resolve link for ${field.fieldname}`, e);
            }
        }));

        if (Object.keys(updates).length > 0) {
            setDisplayData(prev => ({ ...prev, ...updates }));
        }
    };

    // Resolve IDs for Advance Settlement
    useEffect(() => {
        if (doctype === 'Advance Settlement' && advanceSettlementFields.length > 0 && data) {
            resolveLinkFields(advanceSettlementFields, data);
        }
    }, [advanceSettlementFields, data, doctype]);

    // Resolve IDs for Temporary Advance
    useEffect(() => {
        if (doctype === 'Temporary Advance' && temporaryAdvanceFields.length > 0 && data) {
            resolveLinkFields(temporaryAdvanceFields, data);
        }
    }, [temporaryAdvanceFields, data, doctype]);

    // Use displayData for rendering forms
    // const formDataToUse = displayData;

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

    // Fetch Advance Settlement Fields
    useEffect(() => {
        if (doctype === 'Advance Settlement' && name) {
            setIsAdvanceSettlementLoading(true);
            fetchAdvanceSettlementFields({ doc_name: name })
                .then((res) => {
                    if (res?.message) {
                        // Handle child table meta if present
                        let fields = res.message.fields || [];
                        const childMeta = res.message.child_table_meta;

                        if (childMeta) {
                            fields = fields.map((field) => {
                                if (field.fieldtype === 'Table' && field.fieldname && childMeta[field.fieldname]) {
                                    const childFields = childMeta[field.fieldname].fields.map((cf: any) => ({
                                        ...cf,
                                        label: cf.label || cf.fieldname || ''
                                    }));
                                    return {
                                        ...field,
                                        child_fields: childFields
                                    };
                                }
                                return field;
                            });
                        }

                        setAdvanceSettlementFields(fields);
                        setAdvanceSettlementLinkOptions(res.message.link_options || {});
                    }
                })
                .catch(err => console.error("Error fetching advance settlement fields", err))
                .finally(() => setIsAdvanceSettlementLoading(false));
        }
    }, [doctype, name, fetchAdvanceSettlementFields]);

    // Fetch Temporary Advance Fields
    useEffect(() => {
        if (doctype === 'Temporary Advance' && name) {
            setIsTemporaryAdvanceLoading(true);
            fetchTemporaryAdvanceFields({ doc_name: name })
                .then((res) => {
                    if (res?.message) {
                        setTemporaryAdvanceFields(res.message.fields || []);
                        setTemporaryAdvanceLinkOptions(res.message.link_options || {});
                    }
                })
                .catch(err => console.error("Error fetching temporary advance fields", err))
                .finally(() => setIsTemporaryAdvanceLoading(false));
        }
    }, [doctype, name, fetchTemporaryAdvanceFields]);

    // Fetch TA DA Settlement Fields
    useEffect(() => {
        if (doctype === 'TA DA Settlement' && name) {
            setIsTadaLoading(true);
            fetchTadaFields({ doc_name: name })
                .then((res) => {
                    if (res?.message) {
                        let fields = res.message.fields || [];
                        const childMeta = (res.message as any).child_table_meta;

                        if (childMeta) {
                            fields = fields.map((field) => {
                                if (field.fieldtype === 'Table' && field.fieldname && childMeta[field.fieldname]) {
                                    const childFields = childMeta[field.fieldname].fields.map((cf: any) => ({
                                        ...cf,
                                        label: cf.label || cf.fieldname || ''
                                    }));
                                    return {
                                        ...field,
                                        child_fields: childFields
                                    };
                                }
                                return field;
                            });
                        }

                        setTadaFields(fields);
                        setTadaLinkOptions(res.message.link_options || {});
                    }
                })
                .catch(err => console.error("Error fetching TA DA Settlement fields", err))
                .finally(() => setIsTadaLoading(false));
        }
    }, [doctype, name, fetchTadaFields]);


    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg dark:bg-zinc-900">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent"></div>
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

    if (doctype === "Temporary Advance") {
        return (
            <TemporaryAdvanceDetailsView
                docName={name}
                backUrl="/pending-task"
                backLabel="Back to Pending Tasks"
            />
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-claude-bg dark:bg-zinc-900">
                <div className="text-zinc-600 dark:text-zinc-400 font-medium text-xl">Task not found</div>
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
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-6 lg:p-8">
                    <h2 className="text-lg font-serif font-semibold text-zinc-900 dark:text-zinc-100 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-700">
                        Overview
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-6">
                        {simpleFields.map(([key, value]) => {
                            const isFile = isFilePath(String(value));
                            const displayValue = isFile ? getFileName(String(value)) : String(value);

                            return (
                                <div key={key} className="flex flex-col">
                                    <span className={labelClasses}>
                                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>

                                    {isFile ? (
                                        <a
                                            href={String(value)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center gap-2 mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-700/50 text-[#D97757] rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium border border-zinc-200 dark:border-zinc-700"
                                        >
                                            <FileIcon className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate text-sm">{displayValue}</span>
                                            <ExternalLinkIcon className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    ) : (
                                        <div className={valueClasses}>
                                            {(value === null || value === undefined) ? <span className="text-zinc-400 dark:text-zinc-600">-</span> : displayValue}
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
                        <div key={key} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/80">
                                <h3 className="text-base font-serif font-semibold text-zinc-900 dark:text-zinc-100">
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                            {headers.map(header => (
                                                <th key={header} className="p-4 text-left font-semibold text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider">
                                                    {header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </th>
                                            ))}
                                            {isBudgetTable && (
                                                <th className="p-4 text-left font-semibold text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider bg-orange-50/50 dark:bg-orange-500/10 text-[#D97757]">
                                                    Row Total
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50 text-sm">
                                        {rows.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                                                {headers.map(header => (
                                                    <td key={header} className="p-4 align-middle text-zinc-700 dark:text-zinc-300">
                                                        {budgetYearColumns.includes(header)
                                                            ? (parseFloat(row[header]) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
                                                            : String(row[header] || '-')
                                                        }
                                                    </td>
                                                ))}
                                                {isBudgetTable && (
                                                    <td className="p-4 align-middle font-medium text-[#D97757] bg-orange-50/30 dark:bg-orange-500/5">
                                                        {getRowTotal(row).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        {isBudgetTable && (
                                            <tr className="bg-zinc-50 dark:bg-zinc-700/50 font-medium">
                                                {headers.map(header => (
                                                    <td key={header} className="p-4 align-middle text-zinc-900 dark:text-zinc-100">
                                                        {header === 'account_head' ? 'Total' : budgetYearColumns.includes(header) ? (columnTotals[header] || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) : ''}
                                                    </td>
                                                ))}
                                                <td className="p-4 align-middle font-bold text-white bg-[#D97757]">
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
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen text-zinc-900 dark:text-zinc-100">
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-6 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:bg-zinc-800 transition-colors">
                                <ArrowLeftIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                            </button>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-serif text-zinc-900 dark:text-zinc-50 tracking-tight">Task Details</h1>
                                <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 mt-1">{doctype} · <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 dark:bg-zinc-800 text-[#D97757] dark:text-[#E28362] ml-1">{name}</span></p>
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
                            {doctype === "Temporary Advance" && name && (
                                <TemporaryAdvanceActionButtons docname={name} onActionComplete={() => window.location.reload()} />
                            )}
                            {doctype === "Direct Purchase" && name && (
                                <DirectPurchaseWorkflowActions docname={name} onActionComplete={() => window.location.reload()} />
                            )}
                            {doctype === "TA DA Settlement" && name && (
                                <TADASettlementActionButtons docName={name} onActionComplete={() => window.location.reload()} />
                            )}
                            {doctype === "Disbursal of Honorarium" && name && (
                                <DisbursalOfHonorariumActionButtons docname={name} onActionComplete={() => window.location.reload()} />
                            )}

                        </div>
                    </div>
                </header>

                {/* Content Grid with Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Column: Main Detail View */}
                    <div className="lg:col-span-3 space-y-6">
                        {doctype === 'Travel' ? (
                            isTravelLoading ? (
                                <div className="flex h-64 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757]"></div>
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Loading details...</p>
                                    </div>
                                </div>
                            ) : travelFields.length > 0 ? (
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
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
                        ) : doctype === 'Advance Settlement' ? (
                            isAdvanceSettlementLoading ? (
                                <div className="flex h-64 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757]"></div>
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Loading details...</p>
                                    </div>
                                </div>
                            ) : advanceSettlementFields.length > 0 ? (
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
                                    <DynamicFormRenderer
                                        fields={advanceSettlementFields}
                                        formData={displayData}
                                        linkOptions={advanceSettlementLinkOptions}
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
                        ) : doctype === 'Temporary Advance' ? (
                            isTemporaryAdvanceLoading ? (
                                <div className="flex h-64 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757]"></div>
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Loading details...</p>
                                    </div>
                                </div>
                            ) : temporaryAdvanceFields.length > 0 ? (
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
                                    <DynamicFormRenderer
                                        fields={temporaryAdvanceFields}
                                        formData={displayData}
                                        linkOptions={temporaryAdvanceLinkOptions}
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
                        ) : doctype === 'TA DA Settlement' ? (
                            isTadaLoading ? (
                                <div className="flex h-64 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757]"></div>
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Loading details...</p>
                                    </div>
                                </div>
                            ) : tadaFields.length > 0 ? (
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
                                    <DynamicFormRenderer
                                        fields={tadaFields}
                                        formData={displayData}
                                        linkOptions={tadaLinkOptions}
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
                            {/* Budget Actions */}
                            {/* Setup for Travel */}
                            {doctype === 'Travel' && data?.travel_project_title && (
                                <BudgetActionsSidebar
                                    projectName={data.travel_project_title}
                                    isStaff={true}
                                    docName={name}
                                    doctype={doctype}
                                />
                            )}
                            {/* Setup for Advance Settlement */}
                            {doctype === 'Advance Settlement' && data?.project_name && (
                                <BudgetActionsSidebar
                                    projectName={data.project_name}
                                    isStaff={true}
                                    docName={name}
                                    doctype={doctype}
                                />
                            )}
                            {/* Setup for Temporary Advance */}
                            {doctype === 'Temporary Advance' && (data?.project_name || data?.project_code) && (
                                <BudgetActionsSidebar
                                    projectName={data.project_name || data.project_code}
                                    isStaff={true}
                                    docName={name}
                                    doctype={doctype}
                                />
                            )}
                            {/* Setup for TA DA Settlement */}
                            {doctype === 'TA DA Settlement' && isRnDStaff && (data?.project_no || data?.ta_da_project_code) && (
                                <BudgetActionsSidebar
                                    projectName={data.project_no || data.ta_da_project_code}
                                    isStaff={true}
                                    docName={name}
                                    doctype={doctype}
                                />
                            )}

                            <ActivityStream doctype={doctype || ""} docname={name || ""} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pb-8 mt-6">
                    <FrappeButton
                        className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
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
