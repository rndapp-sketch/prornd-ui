import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../../components/RndSidebar";
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { CalendarIcon, UserIcon, EditIcon } from "lucide-react";
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalLoader } from '@/components/ui/global-loader';
import { Textarea } from '@/components/ui/textarea';
import { directPurchaseAPI } from '@/services/apiService';

// --- TYPE DEFINITIONS ---
interface DirectPurchaseData {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    workflow_state: string;
    project_name?: string;
    applicant_name?: string;
    applicant_department?: string;
    applicant_designation?: string;
    account_head?: string;
    [key: string]: any;
}

interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type: string;
}

// Frappe-styled components
const FrappeCard = ({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm", className)}>
        {title && (
            <div className="px-6 py-4 border-b border-zinc-300 dark:border-zinc-700">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{title}</h3>
            </div>
        )}
        <div className="p-6">
            {children}
        </div>
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'ghost' }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline' | 'action';
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
            variant === 'primary' && "bg-[#D97757] text-white hover:bg-[#C66A4E] shadow-md hover:shadow-lg border border-[#C66A4E]",
            variant === 'ghost' && "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 hover:text-zinc-900 dark:text-zinc-100",
            variant === 'outline' && "bg-white dark:bg-zinc-900 border-2 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 hover:border-[#D97757] hover:text-[#D97757] hover:bg-zinc-50 dark:bg-zinc-800/50",
            variant === 'action' && "bg-[#D97757] text-white font-bold hover:bg-[#C66A4E] shadow-md hover:shadow-lg border-2 border-[#C66A4E]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

const ActivityStream = ({ doctype, docname }: { doctype: string; docname: string }) => {
    const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{ message: ActivityItem[] }>(
        "rndopsapp.rndopsapp.api.get_project_activity",
        { doctype, docname }
    );

    useEffect(() => {
        refetchActivity();
    }, [docname]);

    return (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {activityData?.message && activityData.message.length > 0 ? (
                activityData.message.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#FDF3F0] flex items-center justify-center font-bold text-[#D97757] text-xs">
                            {activity.owner?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                            <div
                                className="text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: activity.content }}
                            />
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {activity.owner} · {activity.creation ? new Date(activity.creation).toLocaleString() : ''}
                            </p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">No recent activity found.</p>
            )}
        </div>
    );
};

// --- Workflow Action Buttons Component ---
const DirectPurchaseActionButtons = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
    const [actions, setActions] = useState<string[]>([]);
    const [isPerforming, setIsPerforming] = useState(false);
    const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(directPurchaseAPI.getWorkflowActions);
    const { call: performAction } = useFrappePostCall(directPurchaseAPI.performAction);

    useEffect(() => {
        const loadActions = async () => {
            try {
                const res = await fetchActions({ docname });
                if (res?.message) {
                    setActions(Array.isArray(res.message) ? res.message : []);
                }
            } catch (err) {
                console.error("Error fetching workflow actions:", err);
            }
        };
        loadActions();
    }, [docname]);

    const handleAction = async (action: string) => {
        if (!confirm(`Are you sure you want to perform "${action}"?`)) return;
        setIsPerforming(true);
        try {
            const result: any = await performAction({ docname, action });
            if (result?.message?.status === 'success') {
                alert(result.message.message || `Action "${action}" completed.`);
                onActionComplete();
            } else if (result?.message?.status === 'error') {
                alert(`Error: ${result.message.message}`);
            } else {
                alert(`Action "${action}" completed.`);
                onActionComplete();
            }
        } catch (err: any) {
            console.error("Action error:", err);
            alert(`Action failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsPerforming(false);
        }
    };

    if (actions.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {actions.map(action => (
                <FrappeButton
                    key={action}
                    variant="action"
                    onClick={() => handleAction(action)}
                    disabled={isPerforming}
                >
                    {isPerforming ? "Processing..." : action}
                </FrappeButton>
            ))}
        </div>
    );
};


const DirectPurchaseDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<DirectPurchaseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { call: fetchDoc } = useFrappePostCall<{ message: DirectPurchaseData }>(
        'frappe.client.get'
    );

    // Sidebar State
    const [sidebarComment, setSidebarComment] = useState("");
    const [isAddingComment, setIsAddingComment] = useState(false);
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

    // Fetch Document Data
    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const docRes = await fetchDoc({ doctype: "Direct Purchase", name: id });
            if (docRes?.message) {
                setData(docRes.message);
            } else {
                setError("Document not found");
            }
        } catch (err) {
            console.error("Error loading document:", err);
            setError("Failed to load document");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleSidebarCommentSubmit = async () => {
        if (!sidebarComment.trim() || !id) return;
        setIsAddingComment(true);
        try {
            await addComment({
                reference_doctype: "Direct Purchase",
                reference_name: id,
                content: sidebarComment,
                comment_type: "Comment"
            });
            setSidebarComment("");
            loadData();
        } catch (error) {
            console.error("Error adding comment:", error);
        } finally {
            setIsAddingComment(false);
        }
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-800/50">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
                    <p className="text-zinc-600 dark:text-zinc-400">{error || "Document not found"}</p>
                    <button onClick={() => navigate(-1)} className="mt-4 text-[#D97757] hover:underline">Go Back</button>
                </div>
            </div>
        );
    }

    // Dynamically render all fields from the document
    const renderFieldValue = (key: string, value: any) => {
        if (value === null || value === undefined || value === '') return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (value === 1 || value === 0) {
            // Check if it looks like a boolean field
            if (key.startsWith('declaration_') || key.startsWith('is_') || key.startsWith('has_')) {
                return value === 1 ? 'Yes' : 'No';
            }
        }
        if (Array.isArray(value)) return null; // Skip arrays (child tables) in grid display
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    // Filter fields to display (exclude internal/meta fields)
    const excludedFields = ['doctype', 'docstatus', 'idx', 'owner', 'creation', 'modified',
        'modified_by', '_user_tags', '_comments', '_assign', '_liked_by', 'name',
        'workflow_state', '_seen'];

    const displayFields = Object.entries(data)
        .filter(([key, value]) => {
            if (excludedFields.includes(key)) return false;
            if (key.startsWith('_')) return false;
            if (Array.isArray(value)) return false; // Handle child tables separately
            if (value === null || value === undefined || value === '') return false;
            return true;
        });

    // Find child tables
    const childTables = Object.entries(data)
        .filter(([, value]) => Array.isArray(value) && value.length > 0);

    // Format field name for display
    const formatFieldName = (key: string) => {
        return key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
            <AppSidebar />

            <main className="transition-all duration-300 ease-in-out p-6 md:p-10">
                {/* Header Actions */}
                <PageHeader
                    title={data.name}
                    status={data.workflow_state}
                    projectName={data.project_name}
                >
                    <div className="flex items-center gap-3">
                        {data.workflow_state === 'Draft' && id && (
                            <button
                                onClick={() => navigate(`/direct-purchase?edit=${id}`)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#D97757] text-white hover:bg-[#C66A4E] shadow-md transition-all"
                            >
                                <EditIcon className="w-4 h-4" />
                                Edit
                            </button>
                        )}
                        {id && <DirectPurchaseActionButtons docname={id} onActionComplete={() => loadData()} />}
                    </div>
                </PageHeader>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - Left Column (2/3 width) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Document Details Card */}
                        <FrappeCard title="Purchase Details" className="border-t-4 border-t-[#D97757]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {displayFields.map(([key, value]) => (
                                    <div key={key}>
                                        <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                            {formatFieldName(key)}
                                        </label>
                                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {renderFieldValue(key, value)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </FrappeCard>

                        {/* Child Tables */}
                        {childTables.map(([key, rows]) => (
                            <FrappeCard key={key} title={formatFieldName(key)}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                                {Object.keys((rows as any[])[0] || {})
                                                    .filter(k => !k.startsWith('_') && !excludedFields.includes(k) && k !== 'parent' && k !== 'parenttype' && k !== 'parentfield')
                                                    .map(col => (
                                                        <th key={col} className="px-3 py-2 text-left text-xs font-bold text-zinc-500 uppercase">
                                                            {formatFieldName(col)}
                                                        </th>
                                                    ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(rows as any[]).map((row, idx) => (
                                                <tr key={idx} className="border-b border-zinc-100 dark:border-zinc-800">
                                                    {Object.entries(row)
                                                        .filter(([k]) => !k.startsWith('_') && !excludedFields.includes(k) && k !== 'parent' && k !== 'parenttype' && k !== 'parentfield')
                                                        .map(([k, v]) => (
                                                            <td key={k} className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                                                                {v !== null && v !== undefined ? String(v) : '-'}
                                                            </td>
                                                        ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </FrappeCard>
                        ))}
                    </div>

                    {/* Sidebar - Right Column (1/3 width) */}
                    <div className="space-y-6">
                        {/* Latest Activity Stream */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center justify-between">
                                Latest Activity
                            </h3>
                            {id && <ActivityStream doctype="Direct Purchase" docname={id} />}
                        </div>

                        {/* Add Comment Section */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3">Add Comment</h3>
                            <Textarea
                                className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                rows={3}
                                placeholder="Type your comment here..."
                                value={sidebarComment}
                                onChange={(e) => setSidebarComment(e.target.value)}
                            />
                            <FrappeButton
                                className="w-full"
                                variant="primary"
                                onClick={handleSidebarCommentSubmit}
                                disabled={isAddingComment}
                            >
                                {isAddingComment ? "Submitting..." : "Submit Comment"}
                            </FrappeButton>
                        </div>

                        {/* Meta Info */}
                        <FrappeCard>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Created By</label>
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                        <UserIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                                        {data.owner || "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Created On</label>
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                                        {data.creation ? new Date(data.creation).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'long', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        }) : "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Last Modified</label>
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                                        {data.modified ? new Date(data.modified).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        }) : "-"}
                                    </div>
                                </div>
                            </div>
                        </FrappeCard>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DirectPurchaseDetails;
