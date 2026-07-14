import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import {
    CalendarIcon, EditIcon, Send, ChevronRight,
    CheckCircle2, XCircle, Clock, UserIcon, IndianRupeeIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalLoader } from '@/components/ui/global-loader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { miscellaneousCommitAPI, prepareFormDataForApi } from '@/services/apiService';
import { DepartmentName } from '@/components/DepartmentName';
import MiscellaneousCommitActionButtons from '@/components/MiscellaneousCommitActionButtons';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';

// --- FIELD GROUP DEFINITIONS (same as form) ---
const GROUP_A_FIELDS = new Set([
    'section_break_klxk', 'project_number',
    'applicant_webmail', 'applicant_department', 'applicant_designation',
]);
const GROUP_B_FIELDS = new Set([
    'commit_details_section', 'budget_head', 'commit_decommit', 'module',
    'commit_amount', 'commit_particular', 'linked_application',
]);

// --- WORKFLOW STAGES ---
// Two possible paths depending on who submitted:
//  - staff, RnD submits   → Draft -> Pending HoS Approval -> Pending Dean Approval -> Approved
//  - Permanent Employee   → Draft -> Pending Staff Approval -> Pending HoS Approval -> Pending Dean Approval -> Approved
const STAGES_STAFF_PATH = ['Draft', 'Pending HoS Approval', 'Pending Dean Approval', 'Approved'];
const STAGES_EMPLOYEE_PATH = ['Draft', 'Pending Staff Approval', 'Pending HoS Approval', 'Pending Dean Approval', 'Approved'];

type StageStatus = 'completed' | 'in-progress' | 'pending' | 'rejected';

function buildTimelineStages(currentState: string): { label: string; status: StageStatus }[] {
    const isApproved = currentState === 'Approved';
    const isRejected = currentState === 'Rejected';
    // Once state has passed "Pending Staff Approval" or skipped straight to "Pending HoS Approval"
    // from Draft, we can no longer tell which path was taken except by whether the state ever was
    // "Pending Staff Approval". We default to the employee path (longer/superset) unless the current
    // state is "Pending HoS Approval" and we have no other signal — in that case both paths agree
    // "Pending HoS Approval" comes right after Draft, so the staff path renders correctly too.
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
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
    };
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
                        <div className="flex flex-col items-center min-w-[90px] max-w-[130px]">
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
                                    Commit Approved
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
const MiscellaneousCommitDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                const { fields: apiFields, link_options } = formDataResult.message;

                setFields(apiFields || []);
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
            alert(`Submission failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Split fields into groups
    const groupA = useMemo(() => fields.filter(f => GROUP_A_FIELDS.has(f.fieldname)), [fields]);
    const groupB = useMemo(() => fields.filter(f => GROUP_B_FIELDS.has(f.fieldname)), [fields]);

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
    const resolvedProjectNo = useMemo(
        () => linkOptions.project_number?.find(o => o.value === formData.project_number)?.label || formData.project_number,
        [linkOptions, formData.project_number],
    );

    if (loading) return <GlobalLoader isLoading={true} />;

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={formData.name || id || 'Miscellaneous Commit'}
                    status={workflowState}
                    projectNumber={resolvedProjectNo}
                >
                    {isDraft && id && (
                        <>
                            <button
                                onClick={() => navigate(`/miscellaneous-commit-form?edit=${id}`)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
                            >
                                <EditIcon className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={handleSubmitDraft}
                                disabled={isSubmitting}
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

                {/* Action Buttons */}
                {id && !isDraft && (
                    <div className="mt-4">
                        <MiscellaneousCommitActionButtons
                            docname={id!}
                            onActionComplete={handleRefresh}
                        />
                    </div>
                )}

                {/* Main Content */}
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-4 gap-5">
                    {/* Form Groups — 3 cols */}
                    <div className="lg:col-span-3 space-y-5">
                        <GroupCard icon={UserIcon} label="Applicant Details & Project" badge="A">
                            {formData.applicant_webmail && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                    <InfoRow label="Webmail" value={formData.applicant_webmail} />
                                    <InfoRow label="Department" value={formData.applicant_department} isDept />
                                    <InfoRow label="Designation" value={formData.applicant_designation} />
                                </div>
                            )}
                            <DynamicFormRenderer fields={groupA} {...rendererProps} />
                        </GroupCard>

                        <GroupCard icon={IndianRupeeIcon} label="Commit Details" badge="B">
                            <DynamicFormRenderer fields={groupB} {...rendererProps} />
                        </GroupCard>
                    </div>

                    {/* Sidebar — 1 col */}
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
                                {formData.commit_amount != null && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Amount</span>
                                        <span className="font-bold text-[#D97757]">
                                            {Number(formData.commit_amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
            {id && <FloatingActivityLogButton doctype="Miscellaneous Commit" docname={id} />}
        </div>
    );
};

export default MiscellaneousCommitDetails;
