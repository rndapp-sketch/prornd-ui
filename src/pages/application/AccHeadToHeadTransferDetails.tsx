import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import {
    CalendarIcon, EditIcon, Send, CheckCircle2, UserIcon, IndianRupeeIcon,
    Briefcase, ArrowLeftRight, ArrowLeft, X, ExternalLink, FileTextIcon,
    Paperclip, BookOpen as LedgerIcon,
} from 'lucide-react';
import { GlobalLoader } from '@/components/ui/global-loader';
import { accHeadToHeadTransferAPI } from '@/services/apiService';
import { DepartmentName } from '@/components/DepartmentName';
import AccHeadToHeadTransferActionButtons from '@/components/AccHeadToHeadTransferActionButtons';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';
import { CommitPayment } from '@/components/CommitPayment';
import { ProjectLedgerModal } from '@/components/ProjectLedgerModal';
import { useProjectBudget } from '@/hooks/useProjectBudget';
import { useUserRoles } from '@/components/UserRole';
import ProjectDetailsOverview from '@/pages/ProjectDetailsOverview';
import { ErrorModal } from '../../components/ErrorModal';
import { parseFrappeError } from '../../utils/errorUtils';

const DOCTYPE = 'Acc Head to Head Fund Transfer';

// --- WORKFLOW STAGES (mirrors h2h_workflow) ---
const H2H_STAGES = [
    'Draft',
    'Pending Staff Approval',
    'Pending HoS Approval',
    'Pending Dean Approval',
    'Approved',
];

type StageStatus = 'completed' | 'in-progress' | 'pending' | 'rejected';

function buildTimelineStages(currentState: string): { label: string; status: StageStatus }[] {
    const isApproved = currentState === 'Approved';
    const isRejected = currentState === 'Rejected';
    const currentIdx = H2H_STAGES.findIndex(s => s === currentState);

    return H2H_STAGES.map((stage, idx) => {
        if (isApproved) return { label: stage, status: 'completed' as StageStatus };
        if (isRejected) {
            if (idx < H2H_STAGES.length - 1) return { label: stage, status: 'pending' as StageStatus };
            return { label: 'Rejected', status: 'rejected' as StageStatus };
        }
        if (idx < currentIdx) return { label: stage, status: 'completed' as StageStatus };
        if (idx === currentIdx) return { label: stage, status: 'in-progress' as StageStatus };
        return { label: stage, status: 'pending' as StageStatus };
    });
}

// --- UI PRIMITIVES ---
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn(
        'bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden',
        className,
    )}>
        {children}
    </div>
);

const CardHeader = ({ icon: Icon, label, accent = false }: {
    icon: React.ElementType;
    label: string;
    accent?: boolean;
}) => (
    <div className={cn(
        'flex items-center gap-2.5 px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46]',
        accent ? 'bg-[#FFF7F4] dark:bg-[#3F3F46]/40' : 'bg-[#FAFAF9] dark:bg-[#27272A]',
    )}>
        <span className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg',
            accent ? 'bg-[#D97757]/10 text-[#D97757]' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
        )}>
            <Icon className="w-3.5 h-3.5" />
        </span>
        <h3 className="text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[#52525B] dark:text-[#A1A1AA]">
            {label}
        </h3>
    </div>
);

const InfoRow = ({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) => (
    <div className="space-y-0.5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#A1A1AA] dark:text-[#71717A]">
            {label}
        </p>
        <div className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] leading-snug min-h-[1.25rem]">
            {children ?? (value ? value : <span className="text-[#A1A1AA] font-normal">—</span>)}
        </div>
    </div>
);

// --- COMPACT WORKFLOW TIMELINE ---
const WorkflowTimeline: React.FC<{ currentState: string }> = ({ currentState }) => {
    const stages = buildTimelineStages(currentState);
    return (
        <div className="flex items-center gap-0 overflow-x-auto">
            {stages.map((stage, idx) => (
                <React.Fragment key={stage.label}>
                    <div className="flex flex-col items-center min-w-fit">
                        <div className={cn(
                            'h-2 w-2 rounded-full flex-shrink-0',
                            stage.status === 'completed' && 'bg-emerald-500',
                            stage.status === 'in-progress' && 'bg-[#D97757] ring-2 ring-[#D97757]/30',
                            stage.status === 'rejected' && 'bg-red-500',
                            stage.status === 'pending' && 'bg-[#D4D4D8] dark:bg-[#52525B]',
                        )} />
                        <p className={cn(
                            'mt-1 text-[10px] leading-tight whitespace-nowrap font-semibold',
                            stage.status === 'in-progress' && 'text-[#D97757]',
                            stage.status === 'completed' && 'text-emerald-600 dark:text-emerald-400',
                            stage.status === 'pending' && 'text-[#A1A1AA]',
                            stage.status === 'rejected' && 'text-red-500',
                        )}>
                            {stage.label}
                        </p>
                    </div>
                    {idx < stages.length - 1 && (
                        <div className={cn(
                            'h-px flex-1 min-w-[12px] mx-1 mb-3',
                            stage.status === 'completed' ? 'bg-emerald-400' : 'bg-[#E4E4E7] dark:bg-[#3F3F46]',
                        )} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

// --- STATUS BADGE ---
const StateBadge = ({ state }: { state: string }) => {
    const colors: Record<string, string> = {
        Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
        Draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    };
    const isPending = state?.startsWith('Pending');
    const cls = colors[state] ?? (isPending
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
        : 'bg-zinc-100 text-zinc-600 border-zinc-200');
    return (
        <span className={cn('inline-flex items-center px-2.5 py-1 text-[11px] font-extrabold rounded-full border', cls)}>
            {state || 'Draft'}
        </span>
    );
};

const inr = (n: number) =>
    Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

const fileUrl = (url: string) => (url?.startsWith('http') ? url : `${window.location.origin}${url}`);

// --- MAIN COMPONENT ---
const AccHeadToHeadTransferDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCommitted, setIsCommitted] = useState(false);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);
    const [prPreviewName, setPrPreviewName] = useState<string | null>(null);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: 'Submission Failed', message: '' });

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isRnDStaff = roles.some(r => ['staff, RnD', 'Staff RnD', 'RnD Staff', 'System Manager'].includes(r));

    const { call: fetchDoc } = useFrappePostCall<{ message: any }>(accHeadToHeadTransferAPI.get);
    const { call: submitDocument } = useFrappePostCall<{ message: any }>(accHeadToHeadTransferAPI.submit);

    const projectCode = formData.h2h_proj_num || '';
    const { heads: budgetHeads, actualBalance, commitableBalance, headBalances } = useProjectBudget(projectCode);

    const load = useCallback(async () => {
        if (!id) return;
        try {
            const res = await fetchDoc({ docname: id });
            if (res?.message) setFormData(res.message);
        } catch (err) {
            console.error('Failed to load Head to Head Transfer:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load, refreshKey]);

    useEffect(() => {
        fetch('/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0', { credentials: 'include' })
            .then(r => r.json())
            .then(result => {
                if (result?.data)
                    setBudgetHeadList(result.data.map((item: any) => ({ name: item.budget_head, id: item.id })));
            })
            .catch(() => { });
    }, []);

    const handleRefresh = useCallback(() => {
        setLoading(true);
        setRefreshKey(k => k + 1);
    }, []);

    const handleSubmitDraft = async () => {
        if (!id || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await submitDocument({ docname: id });
            if (res?.message?.status === 'success') {
                alert('Head to Head Transfer submitted successfully!');
                handleRefresh();
            } else {
                throw new Error(res?.message?.message || 'Submission failed');
            }
        } catch (err: any) {
            console.error('Submission error:', err);
            setErrorModal({ open: true, title: 'Submission Failed', message: parseFrappeError(err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const workflowState = formData.workflow_state || 'Draft';
    const isDraft = workflowState === 'Draft';
    const isPendingStaff = workflowState === 'Pending Staff Approval';

    const fromLabel = formData.h2h_transfer_from_label || formData.h2h_transfer_from;
    const toLabel = formData.h2h_transfer_to_label || formData.h2h_transfer_to;

    const budgetHeadIds = useMemo(() => {
        const map: Record<string, string> = {};
        budgetHeadList.forEach(h => { map[h.name] = h.id; });
        return map;
    }, [budgetHeadList]);

    // The transfer draws money out of the source head, so that is what gets committed.
    const commitHeads = budgetHeads.length > 0 ? budgetHeads : [fromLabel].filter(Boolean);

    if (loading) return <GlobalLoader isLoading={true} />;

    const amountFmt = formData.h2h_amount != null ? inr(Number(formData.h2h_amount)) : null;
    const creationDate = formData.creation
        ? new Date(formData.creation).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : null;
    const modifiedDate = formData.modified
        ? new Date(formData.modified).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : null;

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <AppSidebar />
            <main className="flex-1 px-4 md:px-8 pt-6 pb-12 w-full overflow-hidden">

                {/* ── Header ────────────────────────────────────── */}
                <FrappeCard className="mb-5">
                    <div className="h-[3px] bg-gradient-to-r from-[#D97757] via-[#c66a4e] to-[#4A6CF7]" />
                    <div className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                            <button
                                onClick={() => navigate(-1)}
                                className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7] hover:border-[#D97757]/50 transition-colors"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <div className="min-w-0">
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
                                    Head to Head Transfer
                                </span>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                    <h1 className="text-[18px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                        {formData.name || id}
                                    </h1>
                                    <StateBadge state={workflowState} />
                                </div>
                                {(formData.h2h_proj_num || formData.h2h_proj_title) && (
                                    <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                        Project: {formData.h2h_proj_num}
                                        {formData.h2h_proj_title ? ` — ${formData.h2h_proj_title}` : ''}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Header Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                            {formData.h2h_proj_code && (
                                <button
                                    onClick={() => setPrPreviewName(formData.h2h_proj_code)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#52525B] dark:text-[#A1A1AA] hover:border-[#4A6CF7]/50 hover:text-[#4A6CF7] transition-all shadow-sm"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    View Project
                                </button>
                            )}
                            {isDraft && id ? (
                                <>
                                    <button
                                        onClick={() => navigate(`/head-to-head-transfer-form?edit=${id}`)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#52525B] dark:text-[#A1A1AA] hover:border-[#D97757]/50 hover:text-[#D97757] transition-all shadow-sm"
                                    >
                                        <EditIcon className="w-3.5 h-3.5" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleSubmitDraft}
                                        disabled={isSubmitting}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold bg-[#D97757] hover:bg-[#c66a4e] text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        {isSubmitting ? 'Submitting…' : 'Submit'}
                                    </button>
                                </>
                            ) : id && (
                                <AccHeadToHeadTransferActionButtons
                                    docname={id}
                                    onActionComplete={handleRefresh}
                                    commitRequired={isRnDStaff && isPendingStaff && !isCommitted}
                                />
                            )}
                        </div>
                    </div>

                    <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] px-5 py-3">
                        <WorkflowTimeline currentState={workflowState} />
                    </div>
                </FrappeCard>

                {/* ── Main Grid ─────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">

                    {/* Left column */}
                    <div className="space-y-5">

                        {/* Applicant & Project */}
                        <FrappeCard>
                            <CardHeader icon={UserIcon} label="Applicant & Project" />
                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <InfoRow label="Applicant Webmail">
                                    {formData.h2h_app_webmail
                                        ? <a href={`mailto:${formData.h2h_app_webmail}`} className="text-[#4A6CF7] hover:underline">{formData.h2h_app_webmail}</a>
                                        : <span className="text-[#A1A1AA] font-normal">—</span>}
                                </InfoRow>
                                <InfoRow label="Applicant Name" value={formData.h2h_app_name} />
                                <InfoRow label="Designation" value={formData.h2h_app_designation} />
                                <InfoRow label="Department">
                                    {formData.h2h_dept
                                        ? <DepartmentName name={formData.h2h_dept} />
                                        : <span className="text-[#A1A1AA] font-normal">—</span>}
                                </InfoRow>
                                <InfoRow label="Applicant Category" value={formData.h2h_app_category} />
                                <InfoRow label="Project Number">
                                    {formData.h2h_proj_num
                                        ? <span className="font-mono text-[12.5px]">{formData.h2h_proj_num}</span>
                                        : <span className="text-[#A1A1AA] font-normal">—</span>}
                                </InfoRow>
                                <InfoRow label="Project Title" value={formData.h2h_proj_title} />
                                <InfoRow label="PI Webmail">
                                    {formData.h2h_pi_webmail
                                        ? <a href={`mailto:${formData.h2h_pi_webmail}`} className="text-[#4A6CF7] hover:underline">{formData.h2h_pi_webmail}</a>
                                        : <span className="text-[#A1A1AA] font-normal">—</span>}
                                </InfoRow>
                            </div>
                        </FrappeCard>

                        {/* Transfer Details */}
                        <FrappeCard>
                            <CardHeader icon={ArrowLeftRight} label="Fund Transfer Details" accent />
                            <div className="p-5 space-y-5">
                                {amountFmt && (
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FFF7F4] dark:bg-[#D97757]/10 border border-[#D97757]/20">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D97757]/15 text-[#D97757] flex-shrink-0">
                                            <IndianRupeeIcon className="w-5 h-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A1A1AA]">Amount to Transfer</p>
                                            <p className="text-[20px] font-extrabold text-[#D97757] leading-tight">{amountFmt}</p>
                                            {formData.h2h_amount_in_words && (
                                                <p className="text-[11.5px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                                                    {formData.h2h_amount_in_words}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                                    <div className="min-w-0">
                                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A1A1AA]">From</p>
                                        <p className="text-[13px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">{fromLabel || '—'}</p>
                                    </div>
                                    <ArrowLeftRight className="w-5 h-5 text-[#D97757] flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A1A1AA]">To</p>
                                        <p className="text-[13px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">{toLabel || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </FrappeCard>

                        {/* Justification */}
                        <FrappeCard>
                            <CardHeader icon={FileTextIcon} label="Justification" />
                            <div className="p-5 space-y-5">
                                <InfoRow label="Justification for Transfer">
                                    {formData.h2h_justification
                                        ? <p className="whitespace-pre-wrap font-normal">{formData.h2h_justification}</p>
                                        : <span className="text-[#A1A1AA] font-normal">—</span>}
                                </InfoRow>
                                <InfoRow label="Remarks">
                                    {formData.h2h_remarks
                                        ? <p className="whitespace-pre-wrap font-normal">{formData.h2h_remarks}</p>
                                        : <span className="text-[#A1A1AA] font-normal">—</span>}
                                </InfoRow>
                                <InfoRow label="Supporting Document">
                                    {formData.h2h_supporting_document ? (
                                        <a
                                            href={fileUrl(formData.h2h_supporting_document)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-[#4A6CF7] hover:underline"
                                        >
                                            <Paperclip className="w-3.5 h-3.5" />
                                            Open attachment
                                        </a>
                                    ) : <span className="text-[#A1A1AA] font-normal">—</span>}
                                </InfoRow>
                            </div>
                        </FrappeCard>
                    </div>

                    {/* Right sidebar */}
                    <aside className="space-y-4">

                        {/* Commitable balance — R&D Staff only */}
                        {isRnDStaff && projectCode && (
                            <FrappeCard>
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">
                                            Commitable Balance
                                        </p>
                                        <p className="text-base font-bold text-[#D97757]">
                                            ₹ {(commitableBalance || 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsLedgerOpen(true)}
                                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-[#E4E4E7] dark:border-[#3F3F46] text-[#D97757] font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                    >
                                        <LedgerIcon className="h-3.5 w-3.5" />
                                        View Project Ledger
                                    </button>
                                </div>
                            </FrappeCard>
                        )}

                        {/* Commit window — R&D Staff at Pending Staff Approval */}
                        {isRnDStaff && isPendingStaff && id && (
                            <CommitPayment
                                doctype={DOCTYPE}
                                docName={id}
                                projectName={projectCode}
                                budgetHeads={commitHeads}
                                defaultBudgetHead={fromLabel || ''}
                                budgetHeadIds={budgetHeadIds}
                                headBalances={headBalances}
                                actualBalance={actualBalance}
                                commitableBalance={commitableBalance}
                                billAmount={Number(formData.h2h_amount) || 0}
                                title="Make a Commitment"
                                description={`Commit the transfer amount against ${fromLabel || 'the source account head'} before forwarding.`}
                                onCommitSuccess={() => { setIsCommitted(true); handleRefresh(); }}
                                onStagingStatusChange={setIsCommitted}
                            />
                        )}

                        {/* Meta */}
                        <FrappeCard>
                            <CardHeader icon={Briefcase} label="Document Info" />
                            <div className="p-4 space-y-3.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11.5px] text-[#71717A] dark:text-[#A1A1AA]">Status</span>
                                    <StateBadge state={workflowState} />
                                </div>

                                {!isDraft && workflowState !== 'Approved' && workflowState !== 'Rejected' && (
                                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">
                                            Pending at
                                        </p>
                                        <p className="text-[13px] font-extrabold text-amber-800 dark:text-amber-200">
                                            {workflowState}
                                        </p>
                                    </div>
                                )}

                                {workflowState === 'Approved' && (
                                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                        <p className="text-[13px] font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Transfer Approved
                                        </p>
                                    </div>
                                )}

                                <div className="pt-2 space-y-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                    {formData.owner && (
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-[11.5px] text-[#71717A] dark:text-[#A1A1AA] flex-shrink-0">Created By</span>
                                            <span className="text-[11.5px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] text-right break-all">
                                                {formData.owner}
                                            </span>
                                        </div>
                                    )}
                                    {creationDate && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11.5px] text-[#71717A] dark:text-[#A1A1AA]">Created</span>
                                            <span className="text-[11.5px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3 text-[#A1A1AA]" />
                                                {creationDate}
                                            </span>
                                        </div>
                                    )}
                                    {modifiedDate && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11.5px] text-[#71717A] dark:text-[#A1A1AA]">Modified</span>
                                            <span className="text-[11.5px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3 text-[#A1A1AA]" />
                                                {modifiedDate}
                                            </span>
                                        </div>
                                    )}
                                    {amountFmt && (
                                        <div className="flex justify-between items-center pt-2 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                            <span className="text-[11.5px] text-[#71717A] dark:text-[#A1A1AA]">Amount</span>
                                            <span className="text-[13px] font-extrabold text-[#D97757]">{amountFmt}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </FrappeCard>
                    </aside>
                </div>
            </main>

            {id && <FloatingActivityLogButton doctype={DOCTYPE} docname={id} />}

            <ProjectLedgerModal
                isOpen={isLedgerOpen}
                onClose={() => setIsLedgerOpen(false)}
                projectName={projectCode}
                budgetHeadList={budgetHeadList}
            />

            {/* ── View Project Modal ── */}
            {prPreviewName && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                            <h2 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Project Details</h2>
                            <button
                                onClick={() => setPrPreviewName(null)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4">
                            <ProjectDetailsOverview projectName={prPreviewName} embedded hideActions />
                        </div>
                    </div>
                </div>
            )}

            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default AccHeadToHeadTransferDetails;
