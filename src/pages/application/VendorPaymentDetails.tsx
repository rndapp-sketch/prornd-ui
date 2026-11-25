import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFrappeAuth, useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRoles } from '@/components/UserRole';
import { PageHeader } from '@/components/common/PageHeader';
import ViewProjectButton from '@/components/ViewProjectButton';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { CommitPayment } from '@/components/CommitPayment';
import { ProjectLedgerModal } from '@/components/ProjectLedgerModal';
import { CommentModal } from '@/components/CommentModal';
import { ErrorModal } from '@/components/ErrorModal';
import { useProjectBudget } from '@/hooks/useProjectBudget';
import { vendorPaymentAPI } from '@/services/apiService';
import { parseFrappeError } from '@/utils/errorUtils';
import {
    STAFF_COMMIT_STATE, STAFF_ROLE, VENDOR_PAYMENT_DOCTYPE, type BudgetHeadRow,
    fetchBudgetHeadList, formatINR, isApplicant, isBackwardAction, isDraftDoc, projectOptionLabel,
    shapeVendorPaymentFields,
} from './vendorPaymentShared';

const REVIEWER_ROLES = [STAFF_ROLE, 'Hos, RnD (Head of Section, RnD)', 'Dean, RnD', 'System Manager'];

const noop = () => { };

const FrappeButton = ({ children, onClick, disabled, className, title }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    title?: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#D97757]/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
        )}
    >
        {children}
    </button>
);

const actionClass = (action: string) => {
    const a = action.toLowerCase();
    if (isBackwardAction(a)) return "bg-red-600 text-white hover:bg-red-700";
    if (a.includes('approve')) return "bg-emerald-600 text-white hover:bg-emerald-700";
    return "bg-[#D97757] text-white hover:bg-[#c66a4e]";
};

const Summary = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{value || '—'}</p>
    </div>
);

const VendorPaymentDetails: React.FC = () => {
    const { id = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isStaff = roles.includes(STAFF_ROLE);
    const isReviewer = roles.some((r) => REVIEWER_ROLES.includes(r));

    const { data: docRes, error: docError, isLoading, mutate } = useFrappeGetCall<{ message: Record<string, any> }>(
        vendorPaymentAPI.getDoc,
        { docname: id },
        id ? `vendor-payment-${id}` : null,
    );
    const doc = docRes?.message;

    const { data: fieldsRes } = useFrappeGetCall<{ message: { fields: FormField[]; related_project_data: any } }>(
        vendorPaymentAPI.getFields,
        { doc_name: doc?.project_name },
        doc?.project_name ? `vendor-payment-fields-${doc.project_name}` : null,
    );

    const [budgetHeadList, setBudgetHeadList] = useState<BudgetHeadRow[]>([]);
    useEffect(() => { fetchBudgetHeadList().then(setBudgetHeadList); }, []);

    const projectNo = doc?.project_number || '';
    const { heads, headBalances, actualBalance, commitableBalance } = useProjectBudget(projectNo);
    const accountHeadLabel = budgetHeadList.find((h) => h.name === doc?.account_head)?.budget_head || doc?.account_head || '';
    const budgetHeadIds = useMemo(
        () => Object.fromEntries(budgetHeadList.map((h) => [h.budget_head, h.id])),
        [budgetHeadList],
    );

    const project = useMemo(() => fieldsRes?.message?.related_project_data || {}, [fieldsRes]);
    const fields = useMemo(() => shapeVendorPaymentFields(fieldsRes?.message?.fields || [], { lockProject: true }), [fieldsRes]);
    const linkOptions = useMemo<Record<string, LinkOption[]>>(() => ({
        project_name: doc?.project_name ? [{ value: doc.project_name, label: projectOptionLabel({ name: doc.project_name, ...project }) }] : [],
        account_head: doc?.account_head ? [{ value: doc.account_head, label: accountHeadLabel }] : [],
    }), [doc?.project_name, doc?.account_head, accountHeadLabel, project]);

    const draft = isDraftDoc(doc);
    const applicant = isApplicant(doc, currentUser);
    const actions: string[] = doc?.next_actions || [];
    const total = Number(doc?.total_amount) || 0;

    // Staff commit the amount either on a draft they raised themselves (before Submit) or on
    // a Permanent Employee's submission waiting with them (before Forward).
    const commitStage = isStaff && ((draft && applicant) || doc?.workflow_state === STAFF_COMMIT_STATE);
    const [isCommitted, setIsCommitted] = useState<boolean | null>(null);
    const commitRequired = commitStage && isCommitted !== true;

    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState('');
    const [busy, setBusy] = useState(false);
    const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '' });

    const { call: performAction } = useFrappePostCall<{ message: any }>(vendorPaymentAPI.performAction);
    const { call: deleteDoc } = useFrappePostCall<{ message: any }>(vendorPaymentAPI.delete);
    const { call: addComment } = useFrappePostCall('rndopsapp.rndopsapp.api.add_project_comment');

    const runAction = async (comment: string) => {
        const action = pendingAction;
        setPendingAction('');
        if (!action) return;
        setBusy(true);
        try {
            const res = await performAction({ docname: id, action });
            if (res?.message?.status !== 'success') throw new Error(res?.message?.message || `Could not ${action}.`);
            if (comment.trim()) {
                try {
                    await addComment({ doctype: VENDOR_PAYMENT_DOCTYPE, docname: id, content: comment.trim() });
                } catch { /* the action itself went through */ }
            }
            await mutate();
        } catch (err) {
            setErrorModal({ open: true, title: 'Action Failed', message: parseFrappeError(err) });
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete draft ${id}? This cannot be undone.`)) return;
        setBusy(true);
        try {
            const res = await deleteDoc({ docname: id });
            if (res?.message?.status !== 'success') throw new Error(res?.message?.message || 'Delete failed');
            navigate(-1);
        } catch (err) {
            setErrorModal({ open: true, title: 'Delete Failed', message: parseFrappeError(err) });
        } finally {
            setBusy(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg dark:bg-zinc-900">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent"></div>
            </div>
        );
    }
    if (docError || !doc) {
        return (
            <div className="p-8 text-center text-red-700 bg-red-50 border border-red-200 rounded-xl">
                {docError ? parseFrappeError(docError) : `Vendor Payment ${id} not found.`}
            </div>
        );
    }

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <PageHeader
                title={`Vendor Payment: ${doc.name}`}
                projectName={project.project_title}
                projectNumber={projectNo}
                status={doc.workflow_state || 'Draft'}
            >
                <div className="flex items-center gap-2 flex-wrap">
                    <ViewProjectButton doctype={VENDOR_PAYMENT_DOCTYPE} data={doc} />
                    {draft && applicant && (
                        <>
                            <FrappeButton
                                onClick={() => navigate(`/vendor-payment-form?edit=${encodeURIComponent(doc.name)}`)}
                                disabled={busy}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            >
                                <Pencil className="w-4 h-4" /> Edit
                            </FrappeButton>
                            <FrappeButton
                                onClick={handleDelete}
                                disabled={busy}
                                className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </FrappeButton>
                        </>
                    )}
                    {actions.map((action) => {
                        const gated = commitRequired && !isBackwardAction(action);
                        return (
                            <FrappeButton
                                key={action}
                                onClick={() => setPendingAction(action)}
                                disabled={busy || gated}
                                title={gated ? 'Make the commitment first' : undefined}
                                className={actionClass(action)}
                            >
                                {action}
                            </FrappeButton>
                        );
                    })}
                </div>
            </PageHeader>

            {commitRequired && actions.some((a) => !isBackwardAction(a)) && (
                <div className="mb-4 flex gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>
                        Commit {formatINR(total)} against the project in the <strong>Make a Commitment</strong> window
                        before you {actions.filter((a) => !isBackwardAction(a)).join(' / ')} this application.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-zinc-900 p-4 md:p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                        <Summary label="Vendor" value={doc.name_of_vendor} />
                        <Summary label="Invoice / Bill No." value={doc.invoice_bill_no} />
                        <Summary label="Account Head" value={accountHeadLabel} />
                        <Summary label="Total Amount" value={formatINR(total)} />
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                        {fields.length === 0 ? (
                            <div className="py-10 flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#D97757] border-t-transparent"></div>
                            </div>
                        ) : (
                            <DynamicFormRenderer
                                fields={fields}
                                formData={doc}
                                linkOptions={linkOptions}
                                onChange={noop}
                                onFileChange={noop}
                                onTableRowChange={noop}
                                onTableFileChange={noop}
                                onAddTableRow={noop}
                                onDeleteTableRow={noop}
                                readOnly
                            />
                        )}
                    </div>
                </div>

                <aside className="xl:col-span-1 space-y-6">
                    {(commitStage || isReviewer) && projectNo && (
                        <CommitPayment
                            doctype={VENDOR_PAYMENT_DOCTYPE}
                            docName={doc.name}
                            projectName={projectNo}
                            budgetHeads={heads}
                            headBalances={headBalances}
                            budgetHeadIds={budgetHeadIds}
                            actualBalance={actualBalance}
                            commitableBalance={commitableBalance}
                            billAmount={total}
                            defaultBudgetHead={accountHeadLabel}
                            defaultParticular={`Vendor Payment to ${doc.name_of_vendor || 'vendor'}${doc.invoice_bill_no ? ` (Invoice ${doc.invoice_bill_no})` : ''}`}
                            readOnly={!commitStage}
                            onViewLedger={() => setIsLedgerOpen(true)}
                            onCommitSuccess={() => setIsCommitted(true)}
                            onStagingStatusChange={setIsCommitted}
                        />
                    )}
                </aside>
            </div>

            {isLedgerOpen && (
                <ProjectLedgerModal
                    isOpen={isLedgerOpen}
                    onClose={() => setIsLedgerOpen(false)}
                    projectName={projectNo}
                    budgetHeadList={budgetHeadList.map((h) => ({ name: h.budget_head, id: h.id }))}
                    highlightAppId={doc.name}
                />
            )}
            <CommentModal
                isOpen={!!pendingAction}
                onClose={() => setPendingAction('')}
                onSubmit={runAction}
                action={pendingAction}
                isLoading={busy}
                requireComment={isBackwardAction(pendingAction)}
            />
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default VendorPaymentDetails;
