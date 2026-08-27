import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { useUserRoles } from '@/components/UserRole';
import { useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import {
    ArrowLeft, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCwIcon,
    IndianRupeeIcon, Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalLoader } from '@/components/ui/global-loader';
import { loanSettlementAPI } from '@/services/apiService';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';

const STATE_PENDING_STAFF = 'Pending Staff Processing';
const STATE_PROCESSED = 'Processed';
const STATE_REJECTED = 'Rejected';

const SETTLEMENT_MODES = ['Physical', 'PFMS', 'Offline', 'Online'];

interface LoanSettlementDoc {
    name: string;
    loan_reference?: string;
    ledger_loan_number?: number;
    project?: string;
    project_number?: string;
    settlement_type?: string;
    settlement_amount?: number;
    settlement_date?: string;
    settlement_mode?: string;
    remarks?: string;
    loan_amount_at_request?: number;
    outstanding_at_request?: number;
    fund_received_reference?: string;
    requested_by?: string;
    publish_status?: string;
    publish_error?: string;
    workflow_state?: string;
    current_outstanding?: number | null;
    current_loan_status?: string | null;
}

const FrappeCard = ({ title, children, className }: {
    title?: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={cn(
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm',
        className,
    )}>
        {title && (
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    {title}
                </h3>
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

const StateBadge = ({ state }: { state?: string }) => {
    const cls =
        state === STATE_PROCESSED
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : state === STATE_REJECTED
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    return <span className={cn('px-3 py-1 text-xs font-bold rounded-full', cls)}>{state || '-'}</span>;
};

const PublishBadge = ({ status }: { status?: string }) => {
    if (!status) return null;
    const map: Record<string, { cls: string; icon: React.ReactNode }> = {
        Published: {
            cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            icon: <CheckCircle2 className="w-3 h-3" />,
        },
        Failed: {
            cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            icon: <XCircle className="w-3 h-3" />,
        },
        Pending: {
            cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            icon: <Clock className="w-3 h-3" />,
        },
    };
    const cfg = map[status] ?? map.Pending;
    return (
        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold', cfg.cls)}>
            {cfg.icon}
            {status === 'Published' ? 'Sent to Accounts' : status === 'Failed' ? 'Not sent' : 'Not sent yet'}
        </span>
    );
};

const Row = ({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) => (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">{label}</span>
        <span className={cn(
            'text-sm font-medium text-zinc-900 dark:text-zinc-100 text-right break-all',
            mono && 'font-mono text-xs',
        )}>
            {value ?? '-'}
        </span>
    </div>
);

const fmtAmount = (v?: number | null) =>
    v == null ? '-' : `₹ ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const LoanSettlementDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);

    const [doc, setDoc] = useState<LoanSettlementDoc | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [settlementMode, setSettlementMode] = useState('');
    const [remarks, setRemarks] = useState('');

    const isRndStaff = roles.some(
        (r) => r === 'staff, RnD' || r === 'RnD Staff' || r === 'R&D Staff' || r === 'System Manager',
    );

    const { call: fetchDetails } = useFrappePostCall<{ message: { status: string; data: LoanSettlementDoc } }>(
        loanSettlementAPI.getDetails,
    );
    const { call: performAction } = useFrappePostCall<{ message: any }>(loanSettlementAPI.performAction);
    const { call: retryPublish } = useFrappePostCall<{ message: any }>(loanSettlementAPI.retryPublish);

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await fetchDetails({ docname: id });
            const data = res?.message?.data;
            if (data) {
                setDoc(data);
                setSettlementMode(data.settlement_mode || '');
                setRemarks(data.remarks || '');
                setError(null);
            } else {
                setError('Loan Settlement not found.');
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to load Loan Settlement.');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const workflowState = doc?.workflow_state || STATE_PENDING_STAFF;
    const canProcess = workflowState === STATE_PENDING_STAFF && isRndStaff;
    const showRetry = workflowState === STATE_PROCESSED && doc?.publish_status === 'Failed' && isRndStaff;

    const handleAction = async (action: 'Process' | 'Reject') => {
        setFormError(null);

        if (action === 'Process' && !settlementMode) {
            setFormError('Select a settlement mode before processing.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await performAction({
                docname: id,
                action,
                settlement_mode: action === 'Process' ? settlementMode : undefined,
                remarks: action === 'Process' ? remarks : undefined,
            });
            if (res?.message?.status === 'error') {
                setFormError(res.message.message || 'Action failed.');
                return;
            }
            await load();
        } catch (err: any) {
            setFormError(err?.message || 'Action failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRetry = async () => {
        setFormError(null);
        setRetrying(true);
        try {
            const res = await retryPublish({ docname: id });
            if (res?.message?.status === 'error') {
                setFormError(res.message.message || 'Publish failed again.');
            }
            await load();
        } catch (err: any) {
            setFormError(err?.message || 'Publish retry failed.');
        } finally {
            setRetrying(false);
        }
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    if (error || !doc) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B]">
                <FrappeCard className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                        Error Loading Loan Settlement
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
                </FrappeCard>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={doc.name}
                    status={workflowState}
                    projectNumber={doc.project_number}
                >
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                </PageHeader>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Settlement details */}
                    <div className="lg:col-span-2 space-y-6">
                        <FrappeCard title="Settlement Details">
                            <div className="space-y-1">
                                <Row label="Loan (Frappe)" value={doc.loan_reference} mono />
                                <Row label="Loan Number (Accounts)" value={doc.ledger_loan_number} mono />
                                <Row label="Project Number" value={doc.project_number} mono />
                                <Row
                                    label="Settlement Type"
                                    value={
                                        <span className={cn(
                                            'px-2 py-0.5 rounded text-[11px] font-bold',
                                            doc.settlement_type === 'Full'
                                                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                                        )}>
                                            {doc.settlement_type}
                                        </span>
                                    }
                                />
                                <Row
                                    label="Settlement Amount"
                                    value={<span className="text-[#D97757] font-bold">{fmtAmount(doc.settlement_amount)}</span>}
                                />
                                <Row label="Settlement Date" value={doc.settlement_date} />
                                <Row label="Requested By" value={doc.requested_by} />
                                <Row label="Fund Received" value={doc.fund_received_reference} mono />
                            </div>
                        </FrappeCard>

                        <FrappeCard title="Loan Balance">
                            <div className="space-y-1">
                                <Row label="Loan Amount (at request)" value={fmtAmount(doc.loan_amount_at_request)} />
                                <Row label="Outstanding (at request)" value={fmtAmount(doc.outstanding_at_request)} />
                                <Row
                                    label="Outstanding (live, from Accounts)"
                                    value={
                                        doc.current_outstanding == null
                                            ? <span className="text-zinc-400">Unavailable</span>
                                            : fmtAmount(doc.current_outstanding)
                                    }
                                />
                                <Row label="Loan Status (live)" value={doc.current_loan_status || '-'} />
                            </div>
                        </FrappeCard>

                        {/* Staff processing block */}
                        {canProcess && (
                            <FrappeCard title="For Office Use — Process Settlement">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                                            Settlement Mode <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={settlementMode}
                                            onChange={(e) => setSettlementMode(e.target.value)}
                                            disabled={submitting}
                                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                        >
                                            <option value="">— Select Settlement Mode —</option>
                                            {SETTLEMENT_MODES.map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                                            Remarks
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            disabled={submitting}
                                            placeholder="Optional note about this settlement…"
                                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] resize-none"
                                        />
                                    </div>

                                    {formError && (
                                        <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            {formError}
                                        </div>
                                    )}

                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                        Processing records the settlement and sends it to the Accounts service.
                                        This is the point at which the settlement is reported — a rejected
                                        settlement is never sent.
                                    </p>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleAction('Process')}
                                            disabled={submitting}
                                            className="flex-1 flex items-center justify-center gap-2 bg-[#D97757] hover:bg-[#c66a4e] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            {submitting ? 'Processing…' : 'Process Settlement'}
                                        </button>
                                        <button
                                            onClick={() => handleAction('Reject')}
                                            disabled={submitting}
                                            className="flex items-center justify-center gap-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </FrappeCard>
                        )}

                        {/* Already-processed read-only view */}
                        {!canProcess && (workflowState === STATE_PROCESSED || workflowState === STATE_REJECTED) && (
                            <FrappeCard title="For Office Use">
                                <div className="space-y-1">
                                    <Row label="Settlement Mode" value={doc.settlement_mode} />
                                    <Row label="Remarks" value={doc.remarks} />
                                </div>
                            </FrappeCard>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-5">
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                                Status
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-600 dark:text-zinc-400">Workflow</span>
                                    <StateBadge state={workflowState} />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-600 dark:text-zinc-400">Accounts</span>
                                    <PublishBadge status={doc.publish_status} />
                                </div>
                            </div>

                            {doc.publish_status === 'Failed' && (
                                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-[11px] font-bold text-red-700 dark:text-red-300 mb-1">
                                        Could not send to Accounts
                                    </p>
                                    <p className="text-[11px] text-red-600 dark:text-red-400 break-words leading-relaxed">
                                        {doc.publish_error || 'Unknown error — see Error Log.'}
                                    </p>
                                </div>
                            )}

                            {showRetry && (
                                <button
                                    onClick={handleRetry}
                                    disabled={retrying}
                                    className="mt-3 w-full flex items-center justify-center gap-2 bg-[#D97757] hover:bg-[#c66a4e] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <RefreshCwIcon className={cn('w-4 h-4', retrying && 'animate-spin')} />
                                    {retrying ? 'Retrying…' : 'Retry Send to Accounts'}
                                </button>
                            )}

                            {showRetry && (
                                <p className="mt-2 text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                    Safe to retry — the Accounts service ignores duplicates, so this can never
                                    settle the loan twice.
                                </p>
                            )}
                        </div>

                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <IndianRupeeIcon className="w-4 h-4 text-[#D97757]" />
                                Amount
                            </h3>
                            <p className="text-2xl font-extrabold text-[#D97757]">
                                {fmtAmount(doc.settlement_amount)}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                {doc.settlement_type} settlement against loan {doc.loan_reference}
                            </p>
                        </div>
                    </aside>
                </div>
            </main>

            {id && <FloatingActivityLogButton doctype="Loan Settlement" docname={id} />}
        </div>
    );
};

export default LoanSettlementDetails;
