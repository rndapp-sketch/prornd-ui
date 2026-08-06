import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import {
    CalendarIcon, EditIcon, Send,
    CheckCircle2, UserIcon, IndianRupeeIcon,
    LinkIcon, Briefcase, ArrowLeftRightIcon, ArrowLeft, X, ExternalLink,
} from 'lucide-react';
import { GlobalLoader } from '@/components/ui/global-loader';
import { miscellaneousCommitAPI, prepareFormDataForApi } from '@/services/apiService';
import { DepartmentName } from '@/components/DepartmentName';
import MiscellaneousCommitActionButtons from '@/components/MiscellaneousCommitActionButtons';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';
import { type LinkOption } from '@/components/forms/DynamicFormRenderer';
import ProjectDetailsOverview from '@/pages/ProjectDetailsOverview';
import { ErrorModal } from '../../components/ErrorModal';
import { parseFrappeError } from '../../utils/errorUtils';

// --- WORKFLOW STAGES ---
const STAGES_STAFF_PATH = ['Draft', 'Pending HoS Approval', 'Pending Dean Approval', 'Approved'];
const STAGES_EMPLOYEE_PATH = ['Draft', 'Pending Staff Approval', 'Pending HoS Approval', 'Pending Dean Approval', 'Approved'];

type StageStatus = 'completed' | 'in-progress' | 'pending' | 'rejected';

function buildTimelineStages(currentState: string): { label: string; status: StageStatus }[] {
    const isApproved = currentState === 'Approved';
    const isRejected = currentState === 'Rejected';
    const stages = currentState === 'Pending HoS Approval' || currentState === 'Draft'
        ? STAGES_STAFF_PATH
        : STAGES_EMPLOYEE_PATH;
    const currentIdx = stages.findIndex(s => s === currentState);

    return stages.map((stage, idx) => {
        if (isApproved) return { label: stage, status: 'completed' as StageStatus };
        if (isRejected) {
            if (idx < stages.length - 1) return { label: stage, status: (idx < currentIdx ? 'completed' : 'pending') as StageStatus };
            return { label: 'Rejected', status: 'rejected' as StageStatus };
        }
        if (idx < currentIdx) return { label: stage, status: 'completed' as StageStatus };
        if (idx === currentIdx) return { label: stage, status: 'in-progress' as StageStatus };
        return { label: stage, status: 'pending' as StageStatus };
    });
}

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
    };
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

// --- COMPACT WORKFLOW TIMELINE (inline strip) ---
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

// --- COMMIT TYPE BADGE ---
const CommitBadge = ({ type }: { type: string }) => {
    const isCommit = type === 'Commit';
    return (
        <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-extrabold border',
            isCommit
                ? 'bg-[#D97757]/10 text-[#D97757] border-[#D97757]/25'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        )}>
            <ArrowLeftRightIcon className="w-3 h-3" />
            {type || '—'}
        </span>
    );
};

// --- MAIN COMPONENT ---
const MiscellaneousCommitDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [prPreviewName, setPrPreviewName] = useState<string | null>(null);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });

    const { call: fetchFormData, result: formDataResult, error: formDataError } =
        useFrappePostCall<FormDataResponse>(miscellaneousCommitAPI.getFields);
    const { call: fetchDocument } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: saveForm } = useFrappePostCall<{ message: any }>(miscellaneousCommitAPI.save);
    const { call: submitDocument } = useFrappePostCall<{ message: any }>(miscellaneousCommitAPI.submit);

    useEffect(() => {
        if (id) fetchFormData({ doc_name: id });
    }, [id, refreshKey]);

    useEffect(() => {
        const load = async () => {
            if (formDataResult?.message && id) {
                const { link_options } = formDataResult.message;
                setLinkOptions(link_options || {});
                try {
                    const doc = await fetchDocument({ doctype: 'Miscellaneous Commit', name: id });
                    if (doc?.message) setFormData(doc.message);
                } catch (err) {
                    console.error('Error fetching document:', err);
                }
                setLoading(false);
            }
            if (formDataError) {
                console.error('Failed to load form data:', formDataError);
                setLoading(false);
            }
        };
        load();
    }, [formDataResult, formDataError, id]);

    const handleRefresh = useCallback(() => {
        setLoading(true);
        setRefreshKey(k => k + 1);
    }, []);

    const handleSubmitDraft = async () => {
        if (!id || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi({ ...formData, name: id });
            const saveRes = await saveForm({ doc_data: JSON.stringify(data) });
            if (saveRes?.message?.status !== 'success') throw new Error(saveRes?.message?.message || 'Save failed');
            const docname = saveRes.message.docname || id;
            const submitRes = await submitDocument({ docname });
            if (submitRes?.message?.status === 'success') {
                alert('Miscellaneous Commit submitted successfully!');
                handleRefresh();
            } else {
                throw new Error(submitRes?.message?.message || 'Submission failed');
            }
        } catch (err: any) {
            console.error('Submission error:', err);
            setErrorModal({ open: true, title: 'Submission Failed', message: parseFrappeError(err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const workflowState = formData.workflow_state || 'Draft';
    const isDraft = workflowState === 'Draft' || !formData.workflow_state;
    const resolvedProjectNo = useMemo(
        () => linkOptions.project_number?.find(o => o.value === formData.project_number)?.label || formData.project_number,
        [linkOptions, formData.project_number],
    );
    const budgetHeadLabel = useMemo(
        () => linkOptions.budget_head?.find(o => o.value === formData.budget_head)?.label || formData.budget_head,
        [linkOptions, formData.budget_head],
    );

    if (loading) return <GlobalLoader isLoading={true} />;

    const commitAmountFmt = formData.commit_amount != null
        ? Number(formData.commit_amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })
        : null;

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
                            {/* Back button */}
                            <button
                                onClick={() => navigate(-1)}
                                className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7] hover:border-[#D97757]/50 transition-colors"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <div className="min-w-0">
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
                                    Miscellaneous Commit
                                </span>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                    <h1 className="text-[18px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                        {formData.name || id}
                                    </h1>
                                    <StateBadge state={workflowState} />
                                </div>
                                {resolvedProjectNo && (
                                    <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                        Project: {resolvedProjectNo}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Header Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                            {formData.project_number && (
                                <button
                                    onClick={() => setPrPreviewName(formData.project_number)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#52525B] dark:text-[#A1A1AA] hover:border-[#4A6CF7]/50 hover:text-[#4A6CF7] transition-all shadow-sm"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    View Project
                                </button>
                            )}
                            {isDraft && id ? (
                                <>
                                    <button
                                        onClick={() => navigate(`/miscellaneous-commit-form?edit=${id}`)}
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
                                <MiscellaneousCommitActionButtons
                                    docname={id}
                                    onActionComplete={handleRefresh}
                                />
                            )}
                        </div>
                    </div>

                    {/* ── Compact Workflow Timeline ── */}
                    <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] px-5 py-3">
                        <WorkflowTimeline currentState={workflowState} />
                    </div>
                </FrappeCard>

                {/* ── Main Grid ─────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5">

                    {/* Left column */}
                    <div className="space-y-5">

                        {/* Applicant & Project */}
                        <FrappeCard>
                            <CardHeader icon={UserIcon} label="Applicant & Project" />
                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <InfoRow label="Project Number">
                                    {resolvedProjectNo
                                        ? <span className="font-mono text-[12.5px]">{resolvedProjectNo}</span>
                                        : <span className="text-[#A1A1AA] font-normal">—</span>
                                    }
                                </InfoRow>
                                <InfoRow label="Applicant Webmail">
                                    {formData.applicant_webmail
                                        ? <a href={`mailto:${formData.applicant_webmail}`} className="text-[#4A6CF7] hover:underline">{formData.applicant_webmail}</a>
                                        : <span className="text-[#A1A1AA] font-normal">—</span>
                                    }
                                </InfoRow>
                                <InfoRow label="Department">
                                    {formData.applicant_department
                                        ? <DepartmentName name={formData.applicant_department} />
                                        : <span className="text-[#A1A1AA] font-normal">—</span>
                                    }
                                </InfoRow>
                                <InfoRow label="Designation" value={formData.applicant_designation} />
                            </div>
                        </FrappeCard>

                        {/* Commit Details */}
                        <FrappeCard>
                            <CardHeader icon={IndianRupeeIcon} label="Commit Details" accent />
                            <div className="p-5 space-y-5">

                                {/* Amount highlight */}
                                {commitAmountFmt && (
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FFF7F4] dark:bg-[#D97757]/10 border border-[#D97757]/20">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D97757]/15 text-[#D97757] flex-shrink-0">
                                            <IndianRupeeIcon className="w-5 h-5" />
                                        </span>
                                        <div>
                                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A1A1AA]">Commit Amount</p>
                                            <p className="text-[20px] font-extrabold text-[#D97757] leading-tight">{commitAmountFmt}</p>
                                        </div>
                                        <div className="ml-auto">
                                            <CommitBadge type={formData.commit_decommit} />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <InfoRow label="Budget Head">
                                        {budgetHeadLabel
                                            ? <span>{budgetHeadLabel}</span>
                                            : <span className="text-[#A1A1AA] font-normal">—</span>
                                        }
                                    </InfoRow>
                                    <InfoRow label="Module" value={formData.module} />
                                    <InfoRow label="Commit / Decommit">
                                        {formData.commit_decommit
                                            ? <CommitBadge type={formData.commit_decommit} />
                                            : <span className="text-[#A1A1AA] font-normal">—</span>
                                        }
                                    </InfoRow>
                                    <InfoRow label="Commit Particular" value={formData.commit_particular} />
                                </div>

                                {formData.linked_application && (
                                    <InfoRow label="Linked Application">
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <LinkIcon className="w-3.5 h-3.5 text-[#4A6CF7] flex-shrink-0" />
                                            <span className="font-mono text-[12.5px] text-[#4A6CF7]">
                                                {formData.linked_application}
                                            </span>
                                        </div>
                                    </InfoRow>
                                )}
                            </div>
                        </FrappeCard>
                    </div>

                    {/* Right sidebar */}
                    <aside className="space-y-4">
                        {/* Meta */}
                        <FrappeCard>
                            <CardHeader icon={Briefcase} label="Document Info" />
                            <div className="p-4 space-y-3.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11.5px] text-[#71717A] dark:text-[#A1A1AA]">Status</span>
                                    <StateBadge state={workflowState} />
                                </div>

                                {workflowState && !isDraft && workflowState !== 'Approved' && workflowState !== 'Rejected' && (
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
                                            Commit Approved
                                        </p>
                                    </div>
                                )}

                                <div className="pt-2 space-y-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                    {formData.owner && (
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-[11.5px] text-[#71717A] dark:text-[#A1A1AA] flex-shrink-0">Applicant</span>
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
                                    {commitAmountFmt && (
                                        <div className="flex justify-between items-center pt-2 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                            <span className="text-[11.5px] text-[#71717A] dark:text-[#A1A1AA]">Amount</span>
                                            <span className="text-[13px] font-extrabold text-[#D97757]">{commitAmountFmt}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </FrappeCard>
                    </aside>
                </div>
            </main>

            {id && <FloatingActivityLogButton doctype="Miscellaneous Commit" docname={id} />}

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

export default MiscellaneousCommitDetails;
