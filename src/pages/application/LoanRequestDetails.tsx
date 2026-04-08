import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import {
    CalendarIcon, EditIcon, Send, ChevronRight,
    CheckCircle2, XCircle, Clock, UserIcon, IndianRupeeIcon,
    TableIcon, FileTextIcon, ActivityIcon, MessageSquare, AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalLoader } from '@/components/ui/global-loader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { loanRequestAPI, prepareFormDataForApi } from '@/services/apiService';
import { DepartmentName } from '@/components/DepartmentName';
import LoanRequestActionButtons from '@/components/LoanRequestActionButtons';

// --- FIELD GROUP DEFINITIONS (same as form) ---
const GROUP_A_FIELDS = new Set([
    'section_break_aadt', 'self_other', 'applying_for_section',
    'loan_for_webmail_id', 'loan_for_name', 'loan_for_department', 'loan_for_designation',
    'applicant_details_section', 'applicant_webmail', 'applicant_department', 'applicant_designation',
    'project_details_section', 'project_name', 'project_number',
]);
const GROUP_B_FIELDS = new Set([
    'loan_details_section', 'loan_account_type',
    'section_break_hzoo', 'section_break_voiw', 'loan_amount',
]);
const GROUP_C_FIELDS = new Set(['account_head_fund_breakup']);
const GROUP_D_FIELDS = new Set([
    'loan_agreements_section', 'agreement_no_1', 'agreement_no_2',
    'section_break_fqlm', 'witness_attachment',
]);

// --- WORKFLOW STAGES ---
const MAIN_STAGES = [
    'Draft',
    'Pending Staff Approval',
    'Pending HoS Approval',
    'Pending Dean Approval',
    'Pending @ Staff (Deposit Loan)',
    'Approved',
];

type StageStatus = 'completed' | 'in-progress' | 'pending' | 'rejected';

function buildTimelineStages(currentState: string): { label: string; status: StageStatus }[] {
    const isApproved = currentState === 'Approved';
    const isRejected = currentState === 'Rejected';
    const isPutBack = currentState === 'Put Back';
    const normalizedState = isPutBack ? 'Pending Staff Approval' : currentState;
    const currentIdx = MAIN_STAGES.findIndex(s => s === normalizedState);

    return MAIN_STAGES.map((stage, idx) => {
        if (isApproved) return { label: stage, status: 'completed' };
        if (isRejected) {
            if (idx < MAIN_STAGES.length - 1) return { label: stage, status: idx < currentIdx ? 'completed' : idx === currentIdx ? 'rejected' : 'pending' };
            return { label: 'Rejected', status: 'rejected' };
        }
        if (idx < currentIdx) return { label: stage, status: 'completed' };
        if (idx === currentIdx) return { label: isPutBack ? `${stage} (Put Back)` : stage, status: 'in-progress' };
        return { label: stage, status: 'pending' };
    });
}

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        child_table_fields?: Record<string, any[]>;
    };
}

interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type: string;
}

// --- UI COMPONENTS ---
const GroupCard = ({
    icon: Icon, label, badge, children, className,
}: {
    icon: React.ElementType;
    label: string;
    badge: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={cn(
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden',
        className,
    )}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#D97757]/10 text-[#D97757] font-bold text-xs">
                {badge}
            </span>
            <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                {label}
            </h3>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const InfoRow = ({ label, value, isDept }: { label: string; value: string; isDept?: boolean }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 min-h-[1.5rem]">
            {isDept && value ? <DepartmentName name={value} /> : (value || <span className="text-zinc-400">—</span>)}
        </p>
    </div>
);

// --- WORKFLOW TIMELINE ---
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
                        <div className="flex flex-col items-center min-w-[90px] max-w-[110px]">
                            <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center shadow-sm flex-shrink-0',
                                bgForStatus(stage.status),
                            )}>
                                {iconForStatus(stage.status)}
                            </div>
                            <p className={cn(
                                'mt-2 text-center text-xs leading-tight px-1',
                                stage.status === 'in-progress' ? 'font-bold text-[#D97757]' : '',
                                stage.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : '',
                                stage.status === 'pending' ? 'text-zinc-400 dark:text-zinc-500' : '',
                                stage.status === 'rejected' ? 'text-red-500 font-bold' : '',
                            )}>
                                {stage.label}
                            </p>
                            {stage.status === 'in-progress' && (
                                <span className="mt-1 text-[10px] font-bold text-white bg-[#D97757] px-2 py-0.5 rounded-full">
                                    Pending Here
                                </span>
                            )}
                            {currentState === 'Approved' && stage.label === 'Approved' && (
                                <span className="mt-1 text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    Loan Application Complete
                                </span>
                            )}
                        </div>
                        {idx < stages.length - 1 && (
                            <div className="flex-1 flex items-center pt-4 min-w-[20px]">
                                <div className={cn('h-1 w-full rounded', connectorColor(stage.status))} />
                                <ChevronRight className="w-3 h-3 text-zinc-400 flex-shrink-0 -ml-1" />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
            {/* Pending at text */}
            {currentState && currentState !== 'Draft' && currentState !== 'Approved' && currentState !== 'Rejected' && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Currently pending at:{' '}
                        <span className="font-semibold text-[#D97757]">{currentState}</span>
                    </p>
                </div>
            )}
        </div>
    );
};


// --- ACTIVITY STREAM ---
const ActivityStream: React.FC<{ doctype: string; docname: string; onRefresh?: () => void }> = ({ doctype, docname, onRefresh }) => {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        data: activityData,
        mutate: refetchActivity,
        isLoading: isActivityLoading,
        error: activityError,
    } = useFrappeGetCall<{ message: ActivityItem[] }>(
        'rndopsapp.rndopsapp.api.get_project_activity',
        { doctype, docname },
        docname ? undefined : null,
    );

    const { call: addComment } = useFrappePostCall('rndopsapp.rndopsapp.api.add_project_comment');

    const handleCommentSubmit = async () => {
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            await addComment({ doctype, docname, content: newComment.trim() });
            setNewComment('');
            await refetchActivity();
            onRefresh?.();
        } catch (err: any) {
            console.error('Failed to add comment:', err);
            alert('Error: Could not post comment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const items = activityData?.message || [];

    return (
        <div className="space-y-4">
            {/* Add Comment */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Add a comment
                </label>
                <textarea
                    placeholder="Type here... (Ctrl+Enter to submit)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCommentSubmit(); }}
                    disabled={isSubmitting}
                    className="w-full resize-none bg-white dark:bg-zinc-900 p-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] text-sm"
                    rows={3}
                />
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-zinc-400">{newComment.length}/1000</span>
                    <button
                        onClick={handleCommentSubmit}
                        disabled={isSubmitting || !newComment.trim()}
                        className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#D97757] text-white hover:bg-[#c66a4e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isSubmitting ? 'Posting...' : 'Post Comment'}
                    </button>
                </div>
            </div>

            {/* Activity List */}
            <div className="space-y-3">
                {isActivityLoading && (
                    <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#D97757] border-t-transparent" />
                    </div>
                )}
                {activityError && (
                    <div className="text-center p-3 text-red-700 border border-red-200 rounded-lg bg-red-50 text-xs">
                        Failed to load activity
                    </div>
                )}
                {items.length > 0
                    ? items.map((item, idx) => (
                        <div key={`${item.creation}-${idx}`} className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-semibold text-[#D97757] text-xs">
                                {item.owner?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.owner || 'Unknown'}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 flex-shrink-0">
                                        <Clock className="h-3 w-3" />
                                        {item.creation ? new Date(item.creation).toLocaleString() : 'N/A'}
                                    </p>
                                </div>
                                <div
                                    className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm max-w-none leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: item.content || 'No content' }}
                                />
                            </div>
                        </div>
                    ))
                    : !isActivityLoading && (
                        <div className="text-center py-6 text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900">
                            <MessageSquare className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                            <p className="text-sm font-medium">No activity yet.</p>
                            <p className="text-xs mt-1">Be the first to add a comment.</p>
                        </div>
                    )
                }
            </div>
        </div>
    );
};

// --- STATUS BADGE ---
const StateBadge = ({ state }: { state: string }) => {
    const colors: Record<string, string> = {
        Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        Draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    };
    const isPending = state?.startsWith('Pending');
    const cls = colors[state] ?? (isPending ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-zinc-100 text-zinc-600');
    return (
        <span className={cn('px-3 py-1 text-xs font-bold rounded-full', cls)}>
            {state || 'Draft'}
        </span>
    );
};

// --- MAIN COMPONENT ---
const LoanRequestDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bmrValues, setBmrValues] = useState({ bmr: '', bmr_date: '' });

    const { call: fetchFormData, result: formDataResult, error: formDataError } =
        useFrappePostCall<FormDataResponse>(loanRequestAPI.getFields);
    const { call: fetchDocument } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: saveForm } = useFrappePostCall<{ message: any }>(loanRequestAPI.save);
    const { call: submitDocument } = useFrappePostCall<{ message: any }>(loanRequestAPI.submit);

    useEffect(() => {
        if (id) fetchFormData({ doc_name: id });
    }, [id, refreshKey]);

    useEffect(() => {
        const load = async () => {
            if (formDataResult?.message && id) {
                const { fields: apiFields, link_options, child_table_fields } = formDataResult.message;

                const enhancedFields = (apiFields || []).map((field: FormField) => {
                    if (field.fieldtype === 'Table' && child_table_fields?.[field.fieldname]) {
                        return { ...field, child_fields: child_table_fields[field.fieldname] };
                    }
                    return field;
                });

                setFields(enhancedFields);
                setLinkOptions(link_options || {});
                try {
                    const doc = await fetchDocument({ doctype: 'Loan Request', name: id });
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
        if (!formData.agreement_no_1 || !formData.agreement_no_2) {
            alert('Both Loan Agreement checkboxes must be checked before submitting.');
            return;
        }
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi({ ...formData, name: id });
            const saveRes = await saveForm({ doc_data: JSON.stringify(data) });
            if (saveRes?.message?.status !== 'success') throw new Error(saveRes?.message?.message || 'Save failed');
            const docname = saveRes.message.docname || id;
            const submitRes = await submitDocument({ docname });
            if (submitRes?.message?.status === 'success') {
                alert('Loan Request submitted successfully!');
                handleRefresh();
            } else {
                throw new Error(submitRes?.message?.message || 'Submission failed');
            }
        } catch (err: any) {
            alert(`Submission failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Split fields into groups
    const groupA = useMemo(() => fields.filter(f => GROUP_A_FIELDS.has(f.fieldname)), [fields]);
    const groupB = useMemo(() => fields.filter(f => GROUP_B_FIELDS.has(f.fieldname)), [fields]);
    const groupC = useMemo(() => fields.filter(f => GROUP_C_FIELDS.has(f.fieldname)), [fields]);
    const groupD = useMemo(() => fields.filter(f => GROUP_D_FIELDS.has(f.fieldname)), [fields]);

    const noOp = () => {};
    const rendererProps = {
        formData,
        linkOptions,
        onChange: noOp,
        onFileChange: noOp,
        onTableRowChange: noOp,
        onTableFileChange: noOp,
        onAddTableRow: noOp,
        onDeleteTableRow: noOp,
        readOnly: true,
    };

    const workflowState = formData.workflow_state || 'Draft';
    const isDraft = workflowState === 'Draft' || !formData.workflow_state;

    if (loading) return <GlobalLoader isLoading={true} />;

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={formData.name || id || 'Loan Request'}
                    status={workflowState}
                    projectName={formData.project_title}
                    projectNumber={formData.project_no}
                >
                    {isDraft && id && (
                        <>
                            <button
                                onClick={() => navigate(`/loan-request?edit=${id}`)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
                            >
                                <EditIcon className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={handleSubmitDraft}
                                disabled={isSubmitting || !formData.agreement_no_1 || !formData.agreement_no_2}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </>
                    )}
                </PageHeader>

                {/* Workflow Timeline */}
                <div className="mt-6">
                    <WorkflowTimeline currentState={workflowState} />
                </div>

                {/* BMR Fields — only at Pending @ Staff (Deposit Loan) */}
                {workflowState === 'Pending @ Staff (Deposit Loan)' && (
                    <div className="mt-4 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                                Action Required — Enter Deposit Details
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                    BMR No. <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. BMR-2026-001"
                                    value={bmrValues.bmr}
                                    onChange={(e) => setBmrValues(v => ({ ...v, bmr: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                    BMR Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={bmrValues.bmr_date}
                                    onChange={(e) => setBmrValues(v => ({ ...v, bmr_date: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {id && !isDraft && (
                    <div className="mt-4">
                        <LoanRequestActionButtons
                            docname={id!}
                            onActionComplete={handleRefresh}
                            onBeforeAction={async (action) => {
                                if (action === 'Deposit Loan') {
                                    if (!bmrValues.bmr.trim()) {
                                        alert('BMR No. is required before depositing.');
                                        return null;
                                    }
                                    if (!bmrValues.bmr_date) {
                                        alert('BMR Date is required before depositing.');
                                        return null;
                                    }
                                    return { bmr: bmrValues.bmr.trim(), bmr_date: bmrValues.bmr_date };
                                }
                                return {};
                            }}
                        />
                    </div>
                )}

                {/* Main Content */}
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-4 gap-5">
                    {/* Form Groups — 3 cols */}
                    <div className="lg:col-span-3 space-y-5">
                        {/* GROUP A */}
                        <GroupCard icon={UserIcon} label="Applicant Details & Project" badge="A">
                            {formData.applicant_webmail && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                    <InfoRow label="Webmail" value={formData.applicant_webmail} />
                                    <InfoRow label="Department" value={formData.applicant_department} isDept />
                                    <InfoRow label="Designation" value={formData.applicant_designation} />
                                    <InfoRow label="Project No." value={formData.project_number} />
                                </div>
                            )}
                            <DynamicFormRenderer fields={groupA} {...rendererProps} />
                        </GroupCard>

                        {/* GROUP B */}
                        <GroupCard icon={IndianRupeeIcon} label="Loan Details" badge="B">
                            <DynamicFormRenderer fields={groupB} {...rendererProps} />
                        </GroupCard>

                        {/* GROUP C */}
                        <GroupCard icon={TableIcon} label="Account Head Fund Breakup" badge="C">
                            {groupC.length > 0 ? (
                                <DynamicFormRenderer fields={groupC} {...rendererProps} />
                            ) : (
                                <p className="text-sm text-zinc-500 italic">No fund breakup data.</p>
                            )}
                        </GroupCard>

                        {/* GROUP D */}
                        <GroupCard icon={FileTextIcon} label="Agreements & Attachment" badge="D">
                            <DynamicFormRenderer fields={groupD} {...rendererProps} />
                        </GroupCard>
                    </div>

                    {/* Sidebar — 1 col */}
                    <aside className="lg:col-span-1 space-y-4">
                        {/* Status Card */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                Status
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500 dark:text-zinc-400">State</span>
                                    <StateBadge state={workflowState} />
                                </div>
                                {workflowState && !isDraft && workflowState !== 'Approved' && workflowState !== 'Rejected' && (
                                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                                            Pending at
                                        </p>
                                        <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mt-0.5">
                                            {workflowState}
                                        </p>
                                    </div>
                                )}
                                {formData.owner && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Applicant</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 text-xs text-right max-w-[140px] truncate">
                                            {formData.owner}
                                        </span>
                                    </div>
                                )}
                                {formData.creation && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Created</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1 text-xs">
                                            <CalendarIcon className="w-3 h-3" />
                                            {new Date(formData.creation).toLocaleDateString('en-IN')}
                                        </span>
                                    </div>
                                )}
                                {formData.modified && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Modified</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1 text-xs">
                                            <CalendarIcon className="w-3 h-3" />
                                            {new Date(formData.modified).toLocaleDateString('en-IN')}
                                        </span>
                                    </div>
                                )}
                                {formData.loan_amount != null && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Loan Amount</span>
                                        <span className="font-bold text-[#D97757]">
                                            {Number(formData.loan_amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Activity Log + Add Comment (self-contained) */}
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <ActivityIcon className="w-4 h-4 text-zinc-400" />
                                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Activity Log
                                </h3>
                            </div>
                            {id && <ActivityStream doctype="Loan Request" docname={id} onRefresh={handleRefresh} />}
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default LoanRequestDetails;
