import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { WorkflowTimeline, type IWorkflowStage, type StageStatus } from '@/components/WorkflowTimeline';
import { CommitPayment } from '@/components/CommitPayment';
import { useUserRoles } from '@/components/UserRole';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        child_table_fields?: Record<string, any[]>;
    };
}

const WORKFLOW_STAGES: { state: string; title: string }[] = [
    { state: 'Draft', title: 'Draft' },
    { state: 'Pending PI Approval', title: 'PI' },
    { state: 'Pending Head Approval', title: 'Head' },
    { state: 'Pending Staff Approval', title: 'R&D Staff' },
    { state: 'Pending HoS Approval', title: 'HoS' },
    { state: 'Pending Dean Approval', title: 'Dean' },
    { state: 'Approved', title: 'Approved' },
];

const stageStatus = (current: string, stage: string): StageStatus => {
    if (current === 'Rejected') {
        return stage === 'Draft' ? 'completed' : 'failed';
    }
    const currentIdx = WORKFLOW_STAGES.findIndex(s => s.state === current);
    const stageIdx = WORKFLOW_STAGES.findIndex(s => s.state === stage);
    if (currentIdx === -1 || stageIdx === -1) return 'pending';
    if (stageIdx < currentIdx) return 'completed';
    if (stageIdx === currentIdx) return 'in-progress';
    return 'pending';
};

const ActionButton = ({ label, onClick, disabled, tone = 'primary' }: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    tone?: 'primary' | 'success' | 'danger' | 'neutral';
}) => {
    const tones: Record<string, string> = {
        primary: 'bg-[#4A6CF7] text-white hover:bg-[#3B5CF5]',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        neutral: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100',
    };
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-150',
                'focus:outline-none focus:ring-2 focus:ring-offset-1',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                tones[tone],
            )}
        >
            {label}
        </button>
    );
};

const CommentModal = ({
    isOpen,
    onClose,
    onSubmit,
    action,
    isLoading,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (comment: string) => void;
    action: string;
    isLoading: boolean;
}) => {
    const [comment, setComment] = useState("");

    useEffect(() => {
        if (!isOpen) setComment("");
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-sm font-bold mb-4 capitalize text-zinc-900 dark:text-zinc-100">
                    Confirm {action}
                </h3>
                <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                    Please provide a comment for this action.
                </p>
                <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Enter your comment here..."
                    className="mb-4 min-h-[100px] border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-[#D97757]/20"
                />
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onSubmit(comment)}
                        disabled={isLoading || !comment.trim()}
                    >
                        {isLoading ? "Submit..." : "Submit"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const actionToneFor = (action: string): 'primary' | 'success' | 'danger' | 'neutral' => {
    const a = action.toLowerCase();
    if (a.includes('approve')) return 'success';
    if (a.includes('reject')) return 'danger';
    if (a.includes('forward') || a.includes('submit')) return 'primary';
    return 'neutral';
};

const TopUpFellowshipDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id: docName } = useParams<{ id: string }>();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [workflowState, setWorkflowState] = useState<string>('Draft');
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);

    const { call: fetchFormData } = useFrappePostCall<FormDataResponse>(
        'rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_top_up_fellowship_fields'
    );
    const { call: fetchDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchWorkflowActions } = useFrappePostCall<{ message: string[] }>(
        'rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_top_up_fellowship_workflow_actions'
    );
    const { call: performAction } = useFrappePostCall<{ message: any }>(
        'rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.perform_top_up_fellowship_action'
    );
    const { call: insertComment } = useFrappePostCall<{ message: any }>(
        'frappe.client.insert'
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string>("");
    const { call: fetchCommitDetails } = useFrappePostCall<{ message: any }>(
        'rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_top_up_fellowship_commit_details'
    );

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isRnDStaff = !!roles && roles.includes('staff, RnD');

    const [commitDetails, setCommitDetails] = useState<any>(null);
    const [isCommitted, setIsCommitted] = useState(false);

    const isPendingStaff = workflowState === 'Pending Staff Approval';
    const hasFacultyPdf = !!(formData.faculty_admission_pdf && String(formData.faculty_admission_pdf).trim());

    const refreshActions = useCallback(async () => {
        if (!docName) return;
        try {
            const res = await fetchWorkflowActions({ docname: docName });
            setAvailableActions(res?.message || []);
        } catch (err) {
            console.warn('Failed to fetch workflow actions:', err);
            setAvailableActions([]);
        }
    }, [docName, fetchWorkflowActions]);

    const loadAll = useCallback(async () => {
        if (!docName) return;
        setLoading(true);
        try {
            const meta = await fetchFormData({});
            const apiFields = meta?.message?.fields || [];
            const childFields = meta?.message?.child_table_fields || {};
            const enhanced = apiFields
                .filter((f: FormField) => f.fieldname !== 'amended_from')
                .map((f: FormField) =>
                    f.fieldtype === 'Table' && childFields[f.fieldname]
                        ? { ...f, child_fields: childFields[f.fieldname] }
                        : f,
                );
            setFields(enhanced);
            setLinkOptions(meta?.message?.link_options || {});

            const docRes = await fetchDoc({ doctype: 'Top Up Fellowship', name: docName });
            const doc = docRes?.message || {};
            setFormData(doc);
            setWorkflowState(doc.workflow_state || (doc.docstatus === 1 ? 'Approved' : 'Draft'));

            try {
                const cd = await fetchCommitDetails({ docname: docName });
                if (cd?.message) setCommitDetails(cd.message);
            } catch (err) {
                console.warn('Could not fetch commit details:', err);
            }

            await refreshActions();
        } catch (err) {
            console.error('Failed to load Top Up Fellowship details:', err);
            alert('Could not load this Top Up Fellowship document.');
        } finally {
            setLoading(false);
        }
    }, [docName, fetchFormData, fetchDoc, refreshActions, fetchCommitDetails]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const handleAction = (action: string) => {
        if (!docName || isBusy) return;
        // Client-side guard: staff cannot Forward from Pending Staff Approval
        // unless (a) the Faculty Admission signed PDF has been uploaded and
        // (b) a commit has been submitted.
        if (isPendingStaff && action.toLowerCase() === 'forward') {
            if (!hasFacultyPdf) {
                alert('Please upload the Faculty Admission signed PDF before forwarding to HoS.');
                return;
            }
            if (!isCommitted) {
                alert('Please submit the commit (budget head + amount) before forwarding to HoS.');
                return;
            }
        }
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        if (!docName || !selectedAction) return;
        setIsBusy(true);
        try {
            if (comment.trim()) {
                try {
                    await insertComment({
                        doc: {
                            doctype: 'Comment',
                            comment_type: 'Comment',
                            reference_doctype: 'Top Up Fellowship',
                            reference_name: docName,
                            content: `[${selectedAction}] ${comment.trim()}`,
                        },
                    });
                } catch (commentErr) {
                    console.error('Failed to save comment:', commentErr);
                }
            }
            const res = await performAction({ docname: docName, action: selectedAction });
            if (res?.message?.status === 'success') {
                setWorkflowState(res.message.workflow_state || workflowState);
                setAvailableActions(res.message.next_actions || []);
                await loadAll();
                setModalOpen(false);
                setSelectedAction("");
            } else {
                throw new Error(res?.message?.message || 'Action failed');
            }
        } catch (err: any) {
            console.error('Workflow action failed:', err);
            alert(`Action "${selectedAction}" failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsBusy(false);
        }
    };

    const stages: IWorkflowStage[] = WORKFLOW_STAGES.map(s => ({
        id: s.state,
        title: s.title,
        status: stageStatus(workflowState, s.state),
        description: s.state,
    }));
    if (workflowState === 'Rejected') {
        stages.push({ id: 'Rejected', title: 'Rejected', status: 'failed', description: 'Rejected' });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent mx-auto" />
                    <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">Loading…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={`Top Up Fellowship — ${docName}`}
                    projectName={formData.project_title || formData.project_code || ''}
                    projectNumber={formData.project_code || ''}
                    status={workflowState}
                    showBack={true}
                />

                {/* Workflow timeline */}
                <div className="bg-white dark:bg-zinc-900 p-4 md:p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-3 w-1 rounded-full bg-[#4A6CF7]" />
                        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-[#93C5FD]">
                            Workflow Progress
                        </h3>
                    </div>
                    <WorkflowTimeline stages={stages} orientation="horizontal" />
                </div>

                {/* Document body (read-only) */}
                <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm space-y-8">
                    <DynamicFormRenderer
                        fields={fields}
                        formData={formData}
                        linkOptions={linkOptions}
                        onChange={() => { }}
                        onFileChange={() => { }}
                        onTableRowChange={() => { }}
                        onTableFileChange={() => { }}
                        onAddTableRow={() => { }}
                        onDeleteTableRow={() => { }}
                        readOnly={true}
                    />
                </div>

                {/* Staff guidance: at Pending Staff Approval the signed PDF must be
                    uploaded via the sidebar "Faculty Admission PDF Upload" page
                    before Forwarding to HoS. */}
                {isPendingStaff && !hasFacultyPdf && (
                    <div className="mt-6 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-[12px] text-amber-800 dark:text-amber-300">
                        <strong>Forward is blocked.</strong> Upload the Faculty Admission signed PDF from the
                        sidebar &rarr; <em>Faculty Admission PDF Upload</em> page, then return here to forward.
                    </div>
                )}

                {/* Staff commit panel — only visible to R&D Staff while the doc is
                    in Pending Staff Approval. Submitting the commit stages a row in
                    Kafka Commit Staging which the backend will publish to Kafka
                    once the workflow reaches Approved. Forward is gated on this. */}
                {isPendingStaff && isRnDStaff && commitDetails && (
                    <div className="mt-6">
                        <CommitPayment
                            doctype="Top Up Fellowship"
                            docName={docName || ''}
                            projectName={commitDetails.project_number || commitDetails.project_code || ''}
                            budgetHeads={commitDetails.account_head ? [commitDetails.account_head] : []}
                            billAmount={Number(commitDetails.total_amount) || 0}
                            onCommitSuccess={() => setIsCommitted(true)}
                            onStagingStatusChange={setIsCommitted}
                        />
                        {!isCommitted && (
                            <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-[12px] text-amber-800 dark:text-amber-300">
                                <strong>Forward is blocked.</strong> Submit the commit above before forwarding to HoS.
                            </div>
                        )}
                    </div>
                )}

                {/* Workflow actions */}
                {availableActions.length > 0 && (
                    <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                        {workflowState === 'Draft' && (
                            <ActionButton
                                label="Edit Draft"
                                tone="neutral"
                                onClick={() => navigate(`/top-up-fellowship?edit=${docName}`)}
                                disabled={isBusy}
                            />
                        )}
                        {availableActions.map(action => (
                            <ActionButton
                                key={action}
                                label={action}
                                tone={actionToneFor(action)}
                                disabled={isBusy}
                                onClick={() => handleAction(action)}
                            />
                        ))}
                    </div>
                )}
                {availableActions.length === 0 && workflowState === 'Draft' && (
                    <div className="mt-6 flex justify-end">
                        <ActionButton
                            label="Edit Draft"
                            tone="primary"
                            onClick={() => navigate(`/top-up-fellowship?edit=${docName}`)}
                        />
                    </div>
                )}

                <CommentModal
                    isOpen={modalOpen}
                    onClose={() => { setModalOpen(false); setSelectedAction(""); }}
                    onSubmit={handleConfirmAction}
                    action={selectedAction}
                    isLoading={isBusy}
                />
            </main>
        </div>
    );
};

export default TopUpFellowshipDetails;
