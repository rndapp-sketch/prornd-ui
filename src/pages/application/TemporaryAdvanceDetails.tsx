import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../../components/RndSidebar";
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, CalendarIcon, UserIcon } from "lucide-react";
import { GlobalLoader } from '@/components/ui/global-loader';
import { Textarea } from '@/components/ui/textarea';
import TemporaryAdvanceActionButtons from '../../components/TemporaryAdvanceActionButtons';

// --- TYPE DEFINITIONS ---
interface TemporaryAdvanceData {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    workflow_state: string;
    project_code: string;
    project_name?: string;
    amount_applied: number;
    advance_for_id: string;
    advance_for_department: string;
    advance_for_designation: string;
    applicant_webmail: string;
    applicant_department: string;
    applicant_designation: string;
    reason?: string;
    purpose?: string;
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
    <div className={cn("bg-white border border-gray-300 rounded-xl shadow-sm", className)}>
        {title && (
            <div className="px-6 py-4 border-b border-gray-300">
                <h3 className="text-lg font-bold text-black uppercase tracking-tight">{title}</h3>
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
            "focus:outline-none focus:ring-2 focus:ring-gray-400",
            variant === 'primary' && "bg-[#0EA5A4] text-white hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border border-[#0D9494]",
            variant === 'ghost' && "bg-transparent text-gray-900 hover:bg-gray-200 hover:text-black",
            variant === 'outline' && "bg-white border-2 border-gray-400 text-black hover:border-[#0EA5A4] hover:text-[#0EA5A4] hover:bg-gray-50",
            variant === 'action' && "bg-[#0EA5A4] text-white font-bold hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border-2 border-[#0D9494]",
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

    // Initial refetch when mounted
    useEffect(() => {
        refetchActivity();
    }, [docname]);

    return (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {activityData?.message && activityData.message.length > 0 ? (
                activityData.message.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#E0F7F6] flex items-center justify-center font-bold text-[#0EA5A4] text-xs">
                            {activity.owner?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                            <div
                                className="text-sm text-gray-800 line-clamp-2 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: activity.content }}
                            />
                            <p className="text-xs text-gray-500 mt-0.5">
                                {activity.owner} · {activity.creation ? new Date(activity.creation).toLocaleString() : ''}
                            </p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-sm text-gray-500 italic">No recent activity found.</p>
            )}
        </div>
    );
};

const TemporaryAdvanceDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<TemporaryAdvanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { call: fetchDoc } = useFrappePostCall<{ message: TemporaryAdvanceData }>(
        'frappe.client.get'
    );

    // Sidebar State
    const [sidebarComment, setSidebarComment] = useState("");
    const [isAddingComment, setIsAddingComment] = useState(false);
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

    // Fetch Document Data
    useEffect(() => {
        if (!id) return;
        const loadData = async () => {
            setLoading(true);
            try {
                const docRes = await fetchDoc({ doctype: "Temporary Advance", name: id });
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
        loadData();
    }, [id]);

    const handleSidebarCommentSubmit = async () => {
        if (!sidebarComment.trim() || !id) return;
        setIsAddingComment(true);
        try {
            await addComment({
                reference_doctype: "Temporary Advance",
                reference_name: id,
                content: sidebarComment,
                comment_type: "Comment"
            });
            setSidebarComment("");
            // Force reload - simpler than prop propagation for now, or could use context
            window.location.reload();
        } catch (error) {
            console.error("Error adding comment:", error);
        } finally {
            setIsAddingComment(false);
        }
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
                    <p className="text-gray-600">{error || "Document not found"}</p>
                    <button onClick={() => navigate(-1)} className="mt-4 text-[#0EA5A4] hover:underline">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#F0F4F8] min-h-screen font-sans">
            <AppSidebar />

            <main className="transition-all duration-300 ease-in-out p-6 md:p-10">
                {/* Header Actions */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            aria-label="Go back"
                        >
                            <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                                    {data.name}
                                </h1>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                                    data.workflow_state === "Approved" && "bg-emerald-100 text-emerald-800 border-emerald-200",
                                    data.workflow_state === "Pending" && "bg-amber-100 text-amber-800 border-amber-200",
                                    data.workflow_state === "Rejected" && "bg-red-100 text-red-800 border-red-200",
                                    data.workflow_state === "Draft" && "bg-slate-100 text-slate-800 border-slate-200",
                                )}>
                                    {data.workflow_state}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1 font-medium">Temporary Advance Request</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - Left Column (2/3 width) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Project Details Card */}
                        <FrappeCard title="Project Details" className="border-t-4 border-t-[#0EA5A4]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Project Code</label>
                                    <div className="font-semibold text-gray-900">{data.project_code || "-"}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Project Name</label>
                                    <div className="font-semibold text-gray-900">{data.project_name || "-"}</div>
                                </div>
                            </div>
                        </FrappeCard>

                        {/* Advance Info Card */}
                        <FrappeCard title="Advance Information">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Amount Applied</label>
                                    <div className="text-2xl font-black text-[#0EA5A4]">
                                        ₹ {data.amount_applied?.toLocaleString('en-IN') || "0"}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Requested By</label>
                                    <div className="font-semibold text-gray-900">{data.owner}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {data.reason && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reason</label>
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 text-sm whitespace-pre-wrap">
                                            {data.reason}
                                        </div>
                                    </div>
                                )}
                                {data.purpose && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Purpose</label>
                                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 text-sm whitespace-pre-wrap">
                                            {data.purpose}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </FrappeCard>

                        {/* Applicant Details */}
                        <FrappeCard title="Applicant Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Applicant Webmail</label>
                                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                                        <UserIcon className="w-4 h-4 text-gray-400" />
                                        {data.applicant_webmail || "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Applicant Department</label>
                                    <div className="font-semibold text-gray-900">{data.applicant_department || "-"}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Applicant Designation</label>
                                    <div className="font-semibold text-gray-900">{data.applicant_designation || "-"}</div>
                                </div>
                            </div>
                        </FrappeCard>

                        {/* Advance For Details */}
                        <FrappeCard title="Advance For (Beneficiary)">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Beneficiary ID</label>
                                    <div className="font-semibold text-gray-900">{data.advance_for_id || "-"}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Department</label>
                                    <div className="font-semibold text-gray-900">{data.advance_for_department || "-"}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Designation</label>
                                    <div className="font-semibold text-gray-900">{data.advance_for_designation || "-"}</div>
                                </div>
                            </div>
                        </FrappeCard>
                    </div>

                    {/* Sidebar - Right Column (1/3 width) - Restored and Enhanced */}
                    <div className="space-y-6">

                        {/* Latest Activity Stream */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                                Latest Activity
                            </h3>
                            {id && <ActivityStream doctype="Temporary Advance" docname={id} />}
                        </div>

                        {/* Add Comment Section */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Add Comment</h3>
                            <Textarea
                                className="w-full border border-gray-300 p-3 rounded-lg text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
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
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Created On</label>
                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                                        {data.creation ? new Date(data.creation).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'long', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        }) : "-"}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Last Modified</label>
                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-gray-400" />
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

export default TemporaryAdvanceDetails;
