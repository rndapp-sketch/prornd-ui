import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { ArrowLeft, Calendar, User, FileText, Phone, MapPin, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { leaveModuleAPI } from '@/services/apiService';
import LeaveModuleActionButtons from '@/components/LeaveModuleActionButtons';
import { getStateBadgeStyle } from '@/utils/workflowUtils';
import { format } from 'date-fns';

const LeaveModuleDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [doc, setDoc] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    const { call: fetchDetail } = useFrappePostCall<{
        message: { doc: Record<string, any>; workflow_state: string };
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#F9F7F2] dark:bg-zinc-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
        );
    }

    if (!doc) {
        return (
            <div className="p-6 text-center text-zinc-500">
                Leave application not found.
            </div>
        );
    }

    const workflowState = doc.workflow_state || 'Draft';

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Back button */}
            <Button
                variant="ghost"
                onClick={() => navigate('/leave-module')}
                className="mb-4 text-zinc-600 hover:text-zinc-900"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Leave Applications
            </Button>

            {/* Header card with status and actions */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            {doc.name}
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            {doc.leave_type || '—'} Leave Application
                        </p>
                    </div>
                    <span
                        className={cn(
                            'px-3 py-1 rounded-full text-sm font-medium border',
                            getStateBadgeStyle(workflowState)
                        )}
                    >
                        {workflowState}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <LeaveModuleActionButtons
                        docName={doc.name}
                        onActionComplete={handleActionComplete}
                    />
                    {workflowState === 'Draft' && (
                        <Button
                            variant="outline"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {isDeleting ? 'Deleting...' : 'Delete Draft'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Main content — two-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left column: Applicant Info + Reason & Contact */}
                <div className="space-y-6">

                    {/* Applicant Information */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                        <SectionTitle title="Applicant Information" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoCard icon={User} label="Name" value={doc.username} />
                            <InfoCard icon={User} label="Email" value={doc.email} />
                            <InfoCard icon={User} label="PI / Mentor" value={doc.pi} className="sm:col-span-2" />
                        </div>
                    </div>

                    {/* Reason & Contact */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                        <SectionTitle title="Reason & Contact" />
                        <div className="space-y-4">
                            <InfoCard icon={MessageSquare} label="Reason for Leave" value={doc.reason_for_leave} />
                            <InfoCard icon={MapPin} label="Address on Leave" value={doc.address_on_leave} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InfoCard icon={Phone} label="Contact Number" value={doc.contact_number} />
                                {doc.additional_remarks && (
                                    <InfoCard icon={MessageSquare} label="Additional Remarks" value={doc.additional_remarks} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right column: Leave Details + Station Leave + On Duty Doc */}
                <div className="space-y-6">

                    {/* Leave Details */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                        <SectionTitle title="Leave Details" />
                        <div className="space-y-4">
                            <InfoCard icon={FileText} label="Nature of Leave" value={doc.leave_type} />

                            {/* CL dates */}
                            {doc.leave_type === 'CL' && doc.cl_dates_table && doc.cl_dates_table.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">CL Dates</p>
                                    <div className="flex flex-wrap gap-2">
                                        {doc.cl_dates_table.map((row: any, i: number) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300"
                                            >
                                                {row.cl_date
                                                    ? format(new Date(row.cl_date), 'dd MMM yyyy')
                                                    : '—'}
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

                            {/* EL / On Duty Leave dates */}
                            {(doc.leave_type === 'EL' || doc.leave_type === 'On Duty Leave') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoCard
                                        icon={Calendar}
                                        label="From Date"
                                        value={doc.from_date ? format(new Date(doc.from_date), 'dd MMM yyyy') : '—'}
                                    />
                                    <InfoCard
                                        icon={Calendar}
                                        label="To Date"
                                        value={doc.to_date ? format(new Date(doc.to_date), 'dd MMM yyyy') : '—'}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Station Leave */}
                    {doc.station_leave_permission === 'Required' && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                            <SectionTitle title="Station Leave" />
                            <div className="grid grid-cols-2 gap-4">
                                <InfoCard
                                    icon={Calendar}
                                    label="Station Leave From"
                                    value={doc.sl_from_date ? format(new Date(doc.sl_from_date), 'dd MMM yyyy') : '—'}
                                />
                                <InfoCard
                                    icon={Calendar}
                                    label="Station Leave To"
                                    value={doc.sl_to_date ? format(new Date(doc.sl_to_date), 'dd MMM yyyy') : '—'}
                                />
                            </div>
                        </div>
                    )}

                    {/* On Duty document */}
                    {doc.leave_type === 'On Duty Leave' && doc.onduty_leave_docs && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                            <SectionTitle title="Attached Document" />
                            <a
                                href={doc.onduty_leave_docs}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 hover:underline text-sm font-medium"
                            >
                                <FileText className="w-4 h-4" />
                                View Attached Document
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Reusable sub-components ---

const SectionTitle = ({ title }: { title: string }) => (
    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-4 uppercase tracking-wide">
        {title}
    </h2>
);

const InfoCard = ({
    icon: Icon,
    label,
    value,
    className,
}: {
    icon: React.ElementType;
    label: string;
    value?: string | null;
    className?: string;
}) => (
    <div className={cn("flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg", className)}>
        <Icon className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-0.5 break-words">{value || '—'}</p>
        </div>
    </div>
);

export default LeaveModuleDetails;
