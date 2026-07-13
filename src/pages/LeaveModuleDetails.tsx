import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import {
    EditIcon, Trash2Icon, CalendarIcon, UserIcon, FileTextIcon,
    PhoneIcon, MapPinIcon, MessageSquareIcon, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import { AppSidebar } from '@/components/RndSidebar';
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalLoader } from '@/components/ui/global-loader';
import { cn } from '@/lib/utils';
import { leaveModuleAPI } from '@/services/apiService';
import LeaveModuleActionButtons from '@/components/LeaveModuleActionButtons';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';
import { getStateBadgeStyle } from '@/utils/workflowUtils';
import { format } from 'date-fns';

// --- WORKFLOW STAGES ---
// Canonical path per the Leave Module workflow transitions. "Pending PI Approval" and
// "Pending Mentor Approval" occupy the same slot — which one applies depends on the
// applicant's role (project staff use PI, Inspired Faculty / Independent Researcher use
// Mentor) — so the node is relabeled when the doc is actually sitting at the Mentor state.
const MAIN_STAGES = [
    'Draft',
    'Pending PI Approval',
    'Pending Staff Approval',
    'Pending HoS Approval',
    'Pending Associate Dean Approval',
    'Approved',
];
const PI_STAGE_IDX = 1;

type StageStatus = 'completed' | 'in-progress' | 'pending' | 'rejected';

function buildTimelineStages(currentState: string): { label: string; status: StageStatus }[] {
    const isApproved = currentState === 'Approved';
    const isRejected = currentState === 'Rejected';
    const isMentorPath = currentState === 'Pending Mentor Approval';
    const normalizedState = isMentorPath ? 'Pending PI Approval' : currentState;
    const currentIdx = MAIN_STAGES.findIndex((s) => s === normalizedState);

    return MAIN_STAGES.map((stage, idx) => {
        const label = idx === PI_STAGE_IDX && isMentorPath ? 'Pending Mentor Approval' : stage;

        if (isApproved) return { label, status: 'completed' as StageStatus };

        if (isRejected) {
            // Reject can happen from PI/Mentor Approval or Associate Dean Approval — the
            // exact origin isn't recoverable from workflow_state alone, so only Draft is
            // shown as known-complete and the pipeline's end is marked rejected.
            if (idx === 0) return { label, status: 'completed' as StageStatus };
            if (idx === MAIN_STAGES.length - 1) return { label: 'Rejected', status: 'rejected' as StageStatus };
            return { label, status: 'pending' as StageStatus };
        }

        if (idx < currentIdx) return { label, status: 'completed' as StageStatus };
        if (idx === currentIdx) return { label, status: 'in-progress' as StageStatus };
        return { label, status: 'pending' as StageStatus };
    });
}

const WorkflowTimeline: React.FC<{ currentState: string }> = ({ currentState }) => {
    const stages = buildTimelineStages(currentState);

    const iconForStatus = (status: StageStatus) => {
        if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-white" />;
        if (status === 'in-progress') return <Clock className="w-4 h-4 text-white" />;
        if (status === 'rejected') return <XCircle className="w-4 h-4 text-white" />;
        return <span className="w-2 h-2 rounded-full bg-white/60" />;
    };

    const bgForStatus = (status: StageStatus) => {
        if (status === 'completed') return 'bg-emerald-500';
        if (status === 'in-progress') return 'bg-[#D97757]';
        if (status === 'rejected') return 'bg-red-500';
        return 'bg-zinc-300 dark:bg-zinc-600';
    };

    const connectorColor = (status: StageStatus) =>
        status === 'completed' ? 'bg-emerald-400' : 'bg-zinc-200 dark:bg-zinc-700';

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-5">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                Workflow Progress
            </h3>
            <div className="flex items-start overflow-x-auto pb-1">
                {stages.map((stage, idx) => (
                    <React.Fragment key={stage.label}>
                        <div className="flex flex-col items-center min-w-[110px]">
                            <div className={cn('flex items-center justify-center w-8 h-8 rounded-full shadow-sm', bgForStatus(stage.status))}>
                                {iconForStatus(stage.status)}
                            </div>
                            <p className={cn(
                                'mt-2 text-[11px] font-semibold text-center leading-tight',
                                stage.status === 'pending' ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-300',
                            )}>
                                {stage.label}
                            </p>
                        </div>
                        {idx < stages.length - 1 && (
                            <div className={cn('flex-1 h-0.5 mt-4 mx-1', connectorColor(stage.status))} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

// --- UI COMPONENTS ---
const GroupCard = ({
    icon: Icon, label, children, className,
}: {
    icon: React.ElementType;
    label: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={cn(
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden',
        className,
    )}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <Icon className="w-4 h-4 text-[#D97757]" />
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                {label}
            </h3>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const InfoRow = ({ icon: Icon, label, value, className }: {
    icon: React.ElementType;
    label: string;
    value?: string | null;
    className?: string;
}) => (
    <div className={cn('flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg', className)}>
        <Icon className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 break-words">{value || '—'}</p>
        </div>
    </div>
);

const StateBadge = ({ state }: { state: string }) => (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold border', getStateBadgeStyle(state))}>
        {state}
    </span>
);

const LeaveModuleDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [doc, setDoc] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    const { call: fetchDetail } = useFrappePostCall<{
        message: { doc: Record<string, any>; workflow_state: string; error?: string };
    }>(leaveModuleAPI.getDetail);

    useEffect(() => {
        if (id) {
            setLoading(true);
            fetchDetail({ docname: id })
                .then((res) => {
                    if (res?.message?.doc) {
                        setDoc(res.message.doc);
                    } else if (res?.message?.error) {
                        console.error(res.message.error);
                    }
                })
                .catch((err) => console.error("Failed to fetch leave detail:", err))
                .finally(() => setLoading(false));
        }
    }, [id, refreshKey]);

    const handleActionComplete = () => {
        setRefreshKey((prev) => prev + 1);
    };

    const handleDelete = async () => {
        if (!doc || !confirm('Are you sure you want to delete this draft?')) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/resource/Leave Module/${doc.name}`, { method: 'DELETE' });
            if (res.ok) {
                alert('Draft deleted successfully.');
                navigate('/leave-module');
            } else {
                const data = await res.json();
                alert(data?.exc_type || 'Failed to delete draft.');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete draft.');
        } finally {
            setIsDeleting(false);
        }
    };

    const workflowState = doc?.workflow_state || 'Draft';
    const isDraft = workflowState === 'Draft';

    const clDates = useMemo(() => {
        if (!doc || doc.leave_type !== 'CL') return [];
        return doc.cl_dates_table || [];
    }, [doc]);

    if (loading) {
        return <GlobalLoader isLoading={true} />;
    }

    if (!doc) {
        return (
            <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                    <PageHeader title="Leave Application" />
                    <div className="mt-16 text-center text-zinc-500 dark:text-zinc-400">
                        Leave application not found.
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={`${doc.name} — ${doc.leave_type || 'Leave'} Application`}
                    status={workflowState}
                >
                    {isDraft && (
                        <>
                            <button
                                onClick={() => navigate(`/leave-module/new?edit=${doc.name}`)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
                            >
                                <EditIcon className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40 shadow-sm transition-all disabled:opacity-50"
                            >
                                <Trash2Icon className="w-4 h-4" />
                                {isDeleting ? 'Deleting...' : 'Delete Draft'}
                            </button>
                        </>
                    )}
                    {!isDraft && (
                        <LeaveModuleActionButtons
                            docName={doc.name}
                            onActionComplete={handleActionComplete}
                            variant="dropdown"
                        />
                    )}
                </PageHeader>

                {/* Workflow Timeline */}
                <div className="mt-6">
                    <WorkflowTimeline currentState={workflowState} />
                </div>

                {/* Main Content */}
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-4 gap-5">
                    <div className="lg:col-span-3 space-y-5">
                        {/* Applicant Information */}
                        <GroupCard icon={UserIcon} label="Applicant Information">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InfoRow icon={UserIcon} label="Name" value={doc.username} />
                                <InfoRow icon={UserIcon} label="Email" value={doc.email} />
                                <InfoRow icon={UserIcon} label="PI / Mentor" value={doc.pi} className="sm:col-span-2" />
                            </div>
                        </GroupCard>

                        {/* Leave Details */}
                        <GroupCard icon={FileTextIcon} label="Leave Details">
                            <div className="space-y-4">
                                <InfoRow icon={FileTextIcon} label="Nature of Leave" value={doc.leave_type} />

                                {doc.leave_type === 'CL' && clDates.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">CL Dates</p>
                                        <div className="flex flex-wrap gap-2">
                                            {clDates.map((row: any, i: number) => (
                                                <span
                                                    key={i}
                                                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                                >
                                                    {row.cl_date ? format(new Date(row.cl_date), 'dd MMM yyyy') : '—'}
                                                    {row.day_type && (
                                                        <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                            ({row.day_type})
                                                        </span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(doc.leave_type === 'EL' || doc.leave_type === 'On Duty Leave') && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <InfoRow
                                            icon={CalendarIcon}
                                            label="From Date"
                                            value={doc.from_date ? format(new Date(doc.from_date), 'dd MMM yyyy') : '—'}
                                        />
                                        <InfoRow
                                            icon={CalendarIcon}
                                            label="To Date"
                                            value={doc.to_date ? format(new Date(doc.to_date), 'dd MMM yyyy') : '—'}
                                        />
                                    </div>
                                )}

                                {doc.station_leave_permission === 'Required' && (
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                        <InfoRow
                                            icon={CalendarIcon}
                                            label="Station Leave From"
                                            value={doc.sl_from_date ? format(new Date(doc.sl_from_date), 'dd MMM yyyy') : '—'}
                                        />
                                        <InfoRow
                                            icon={CalendarIcon}
                                            label="Station Leave To"
                                            value={doc.sl_to_date ? format(new Date(doc.sl_to_date), 'dd MMM yyyy') : '—'}
                                        />
                                    </div>
                                )}

                                {doc.leave_type === 'On Duty Leave' && doc.onduty_leave_docs && (
                                    <a
                                        href={doc.onduty_leave_docs}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-[#D97757] hover:text-[#c66a4e] hover:underline text-sm font-semibold"
                                    >
                                        <FileTextIcon className="w-4 h-4" />
                                        View Attached Document
                                    </a>
                                )}
                            </div>
                        </GroupCard>

                        {/* Reason & Contact */}
                        <GroupCard icon={MessageSquareIcon} label="Reason & Contact">
                            <div className="space-y-4">
                                <InfoRow icon={MessageSquareIcon} label="Reason for Leave" value={doc.reason_for_leave} />
                                <InfoRow icon={MapPinIcon} label="Address on Leave" value={doc.address_on_leave} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InfoRow icon={PhoneIcon} label="Contact Number" value={doc.contact_number} />
                                    {doc.additional_remarks && (
                                        <InfoRow icon={MessageSquareIcon} label="Additional Remarks" value={doc.additional_remarks} />
                                    )}
                                </div>
                            </div>
                        </GroupCard>
                    </div>

                    {/* Sidebar — Status */}
                    <aside className="lg:col-span-1 space-y-4">
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                Status
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500 dark:text-zinc-400">State</span>
                                    <StateBadge state={workflowState} />
                                </div>
                                {!isDraft && workflowState !== 'Approved' && workflowState !== 'Rejected' && (
                                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Pending at</p>
                                        <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mt-0.5">{workflowState}</p>
                                    </div>
                                )}
                                {doc.owner && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Applicant</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 text-xs text-right max-w-[140px] truncate">
                                            {doc.owner}
                                        </span>
                                    </div>
                                )}
                                {doc.creation && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Created</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1 text-xs">
                                            <CalendarIcon className="w-3 h-3" />
                                            {new Date(doc.creation).toLocaleDateString('en-IN')}
                                        </span>
                                    </div>
                                )}
                                {doc.modified && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Modified</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1 text-xs">
                                            <CalendarIcon className="w-3 h-3" />
                                            {new Date(doc.modified).toLocaleDateString('en-IN')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
            <FloatingActivityLogButton doctype="Leave Module" docname={doc.name} />
        </div>
    );
};

export default LeaveModuleDetails;
