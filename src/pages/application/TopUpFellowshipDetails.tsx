import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import {
    ActivityIcon, CheckCircle2, Clock, XCircle, ChevronRight,
    UserIcon, GraduationCapIcon, BuildingIcon, FileTextIcon, ExternalLink,
    FileSpreadsheetIcon as LedgerIcon,
} from 'lucide-react';
import { AppSidebar } from '@/components/RndSidebar';
import { PageHeader } from '@/components/common/PageHeader';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';
import { GlobalLoader } from '@/components/ui/global-loader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { CommitPayment } from '@/components/CommitPayment';
import { BudgetHeadName } from '@/components/BudgetHeadName';
import { useUserRoles } from '@/components/UserRole';
import TopUpFellowshipActionButtons from '@/components/TopUpFellowshipActionButtons';
import { useProjectBudget } from '@/hooks/useProjectBudget';
import { ProjectLedgerModal } from '@/components/ProjectLedgerModal';

// ---------------------------------------------------------------------------
// Workflow stages
// ---------------------------------------------------------------------------
const WORKFLOW_STAGES: { state: string; label: string }[] = [
    { state: 'Draft', label: 'Draft' },
    { state: 'Pending PI Approval', label: 'PI' },
    { state: 'Pending Head Approval', label: 'Head' },
    { state: 'Pending Staff Approval', label: 'R&D Staff' },
    { state: 'Pending HoS Approval', label: 'HoS' },
    { state: 'Pending Dean Approval', label: 'Dean' },
    { state: 'Approved', label: 'Approved' },
];

type StageStatus = 'completed' | 'in-progress' | 'pending' | 'rejected';

const stageStatus = (current: string, state: string): StageStatus => {
    if (current === 'Rejected') {
        return state === 'Draft' ? 'completed' : 'rejected';
    }
    const ci = WORKFLOW_STAGES.findIndex(s => s.state === current);
    const si = WORKFLOW_STAGES.findIndex(s => s.state === state);
    if (ci === -1 || si === -1) return 'pending';
    if (si < ci) return 'completed';
    if (si === ci) return 'in-progress';
    return 'pending';
};

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
const GroupCard = ({ icon: Icon, label, children }: {
    icon: React.ElementType; label: string; children: React.ReactNode;
}) => (
    <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div className="flex items-center gap-3 border-b border-[#E4E4E7] bg-[#FAFAF9] px-5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB] dark:bg-blue-950/30 dark:text-blue-300">
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB] dark:text-blue-300">
                    Section
                </p>
                <h3 className="truncate text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                    {label}
                </h3>
            </div>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
    </div>
);

const InfoRow = ({ label, value, isFile, children }: {
    label: string; value?: any; isFile?: boolean; children?: React.ReactNode;
}) => (
    <div className="min-w-0 rounded-xl border border-[#E4E4E7] bg-white px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div className="mb-2 inline-flex max-w-full items-center rounded-md bg-[#FAFAF9] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#18181B] dark:text-blue-300 dark:ring-[#3F3F46]">
            <span className="truncate">{label}</span>
        </div>
        {children ? (
            <div className="min-h-[1.5rem] text-[13px] font-semibold leading-relaxed text-[#3F3F46] dark:text-[#E4E4E7]">
                {children}
            </div>
        ) : isFile && value ? (
            <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 mt-1 text-[13px] font-semibold text-[#2563EB] dark:text-blue-300 hover:underline"
            >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                View PDF
            </a>
        ) : (
            <p className="min-h-[1.5rem] break-words text-[13px] font-semibold leading-relaxed text-[#3F3F46] dark:text-[#E4E4E7]">
                {value || <span className="text-[#A1A1AA]">—</span>}
            </p>
        )}
    </div>
);

// ---------------------------------------------------------------------------
// Inline workflow timeline (same style as IndentGeneralFormDetails)
// ---------------------------------------------------------------------------
const WorkflowTimeline: React.FC<{ currentState: string }> = ({ currentState }) => {
    const stages = currentState === 'Rejected'
        ? [...WORKFLOW_STAGES.slice(0, -1), { state: 'Rejected', label: 'Rejected' }]
        : WORKFLOW_STAGES;

    const icon = (s: StageStatus) => {
        if (s === 'completed') return <CheckCircle2 className="w-3 h-3 text-white" />;
        if (s === 'in-progress') return <Clock className="w-3 h-3 text-white" />;
        if (s === 'rejected') return <XCircle className="w-3 h-3 text-white" />;
        return <span className="w-1.5 h-1.5 rounded-full bg-white/60" />;
    };
    const bg = (s: StageStatus) => {
        if (s === 'completed') return 'bg-emerald-500';
        if (s === 'in-progress') return 'bg-[#D97757]';
        if (s === 'rejected') return 'bg-red-500';
        return 'bg-zinc-300 dark:bg-zinc-600';
    };
    const connector = (s: StageStatus) =>
        s === 'completed' ? 'bg-emerald-400' : 'bg-zinc-200 dark:bg-zinc-700';

    return (
        <div className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
            <div className="mb-3 flex items-center gap-2">
                <ActivityIcon className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-300" />
                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#A1A1AA]">
                    Workflow Progress
                </h3>
                <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46]" />
                {currentState && currentState !== 'Draft' && currentState !== 'Approved' && currentState !== 'Rejected' && (
                    <span className="text-[10px] font-semibold text-[#D97757]">{currentState}</span>
                )}
            </div>
            <div className="flex items-start overflow-x-auto pb-1">
                {stages.map((stage, idx) => {
                    const ss = stageStatus(currentState, stage.state);
                    return (
                        <React.Fragment key={stage.state}>
                            <div className="flex flex-col items-center min-w-[72px] max-w-[90px]">
                                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shadow-sm flex-shrink-0', bg(ss))}>
                                    {icon(ss)}
                                </div>
                                <p className={cn(
                                    'mt-1.5 text-center text-[10px] leading-tight px-0.5',
                                    ss === 'in-progress' && 'font-bold text-[#D97757]',
                                    ss === 'completed' && 'text-emerald-600 dark:text-emerald-400 font-medium',
                                    ss === 'pending' && 'text-zinc-400 dark:text-zinc-500',
                                    ss === 'rejected' && 'text-red-500 font-bold',
                                )}>
                                    {stage.label}
                                </p>
                            </div>
                            {idx < stages.length - 1 && (
                                <div className="flex-1 flex items-center pt-3 min-w-[12px]">
                                    <div className={cn('h-0.5 w-full rounded', connector(ss))} />
                                    <ChevronRight className="w-2.5 h-2.5 text-zinc-400 flex-shrink-0 -ml-1" />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        child_table_fields?: Record<string, any[]>;
    };
}

const TopUpFellowshipDetails: React.FC = () => {
    const { id: docName } = useParams<{ id: string }>();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isCommitted, setIsCommitted] = useState(false);
    const [commitDetails, setCommitDetails] = useState<any>(null);
    const [accountHeadLabel, setAccountHeadLabel] = useState<string>('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isRnDStaff = roles.some(r => ['staff, RnD', 'Staff RnD', 'RnD Staff', 'System Manager'].includes(r));

    const { call: fetchFormData } = useFrappePostCall<FormDataResponse>(
        'rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_top_up_fellowship_fields',
    );
    const { call: fetchDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchCommitDetails } = useFrappePostCall<{ message: any }>(
        'rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_top_up_fellowship_commit_details',
    );
    const { call: fetchValue } = useFrappePostCall<{ message: any }>('frappe.client.get_value');

    const loadAll = useCallback(async () => {
        if (!docName) return;
        setLoading(true);
        try {
            const [meta, docRes] = await Promise.all([
                fetchFormData({}),
                fetchDoc({ doctype: 'Top Up Fellowship', name: docName }),
            ]);

            const apiFields: FormField[] = meta?.message?.fields || [];
            const childFields = meta?.message?.child_table_fields || {};
            const enhanced = apiFields
                .filter(f => f.fieldname !== 'amended_from')
                .map(f =>
                    f.fieldtype === 'Table' && childFields[f.fieldname]
                        ? { ...f, child_fields: childFields[f.fieldname] }
                        : f,
                );
            setFields(enhanced);
            setLinkOptions(meta?.message?.link_options || {});

            const doc = docRes?.message || {};
            setFormData(doc);

            // Resolve account_head doc name → human-readable budget_head label
            const rawAccountHead = doc.account_head;
            if (rawAccountHead) {
                try {
                    const bhRes = await fetchValue({
                        doctype: 'Budget Head',
                        filters: { name: rawAccountHead },
                        fieldname: 'budget_head',
                    });
                    const label = bhRes?.message?.budget_head;
                    if (label) setAccountHeadLabel(label);
                } catch { /* non-critical — falls back to BudgetHeadName component */ }
            }

            try {
                const cd = await fetchCommitDetails({ docname: docName });
                if (cd?.message) setCommitDetails(cd.message);
            } catch { /* non-critical */ }
        } catch (err) {
            console.error('Failed to load Top Up Fellowship details:', err);
        } finally {
            setLoading(false);
        }
    }, [docName, fetchFormData, fetchDoc, fetchCommitDetails, fetchValue]);

    useEffect(() => { loadAll(); }, [loadAll, refreshKey]);

    const handleRefresh = () => setRefreshKey(k => k + 1);

    useEffect(() => {
        fetch('/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0', { credentials: 'include' })
            .then(r => r.json())
            .then(result => {
                if (result?.data)
                    setBudgetHeadList(result.data.map((item: any) => ({ name: item.budget_head, id: item.id })));
            })
            .catch(() => {});
    }, []);

    // Derive projectCode before the early return so useProjectBudget is always called
    // project_no / project_number hold the human-readable number for the ledger API
    const projectCode = formData.project_no || formData.project_number || formData.project_code || '';
    const { heads: budgetHeads, actualBalance, commitableBalance } = useProjectBudget(projectCode);

    if (loading) return <GlobalLoader isLoading delay={0} />;

    const workflowState: string = formData.workflow_state || 'Draft';
    const isPendingStaff = workflowState === 'Pending Staff Approval';
    const sentToFa = !!formData.send_to_faculty_admission;
    const facultyPdfUrl = String(formData.faculty_admission_pdf || '').trim();
    const hasFacultyPdf = !!facultyPdfUrl;
    const projectTitle = formData.project_title || formData.project_name || '';

    // Separate display fields by section
    // Key summary fields always shown at top
    const KEY_FIELDS = [
        'applicant_name', 'name_of_applicant', 'full_name',
        'webmail_id', 'email', 'department', 'dept_centre',
        'designation', 'project_code', 'project_number', 'project_title',
        'account_head', 'total_amount', 'fellowship_type',
    ];

    // Non-array fields excluding internal/hidden ones
    const ALWAYS_SKIP = new Set([
        'name', 'doctype', 'docstatus', 'idx', 'creation', 'modified', 'modified_by',
        'owner', 'amended_from', 'workflow_state', 'send_to_faculty_admission',
        'faculty_admission_pdf', 'checkbox1', 'checkbox2', 'checkbox3',
        '_user_tags', '_comments', '_assign', '_liked_by',
    ]);

    const summaryFields = KEY_FIELDS
        .filter(k => formData[k] !== undefined && formData[k] !== null && formData[k] !== '')
        .map(k => ({ key: k, value: formData[k] }));

    const noOp = () => { };
    const rendererProps = {
        formData,
        linkOptions,
        onChange: noOp,
        onFileChange: noOp,
        onTableRowChange: noOp,
        onTableFileChange: noOp,
        onAddTableRow: noOp,
        onDeleteTableRow: noOp,
        readOnly: true as const,
        hideSectionHeaders: false,
    };

    const formatLabel = (key: string) =>
        key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <div className="min-h-screen bg-[#FAFAF9] font-sans dark:bg-[#18181B]">
            <AppSidebar />
            <main className="w-full overflow-hidden px-5 py-6 md:px-8 md:py-7">
                <PageHeader
                    title={docName || 'Top Up Fellowship'}
                    status={workflowState}
                    projectName={projectTitle || projectCode}
                    projectNumber={projectCode}
                >
                    {facultyPdfUrl && isPendingStaff && (
                        <a
                            href={facultyPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                        >
                            <FileTextIcon className="h-3.5 w-3.5" />
                            Faculty Admission PDF
                        </a>
                    )}
                    {docName && (
                        <TopUpFellowshipActionButtons
                            docname={docName}
                            onActionComplete={handleRefresh}
                            commitRequired={isRnDStaff && isPendingStaff && isCommitted === false}
                            sentToFa={sentToFa}
                            hasFacultyPdf={hasFacultyPdf}
                            facultyPdfUrl={facultyPdfUrl}
                        />
                    )}
                </PageHeader>

                {/* Warning banners */}
                {isPendingStaff && !sentToFa && (
                    <div className="mt-4 max-w-fit rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                        Send to Faculty Admission first using the Actions menu before forwarding.
                    </div>
                )}
                {isPendingStaff && sentToFa && !hasFacultyPdf && (
                    <div className="mt-4 max-w-fit rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[12px] font-semibold text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        Waiting for Faculty Admission to upload the signed PDF.
                    </div>
                )}

                {/* Workflow Timeline */}
                <div className="mt-6">
                    <WorkflowTimeline currentState={workflowState} />
                </div>

                {/* Main content grid */}
                <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="min-w-0 space-y-5">

                        {/* Summary card */}
                        {summaryFields.length > 0 && (
                            <GroupCard icon={UserIcon} label="Application Summary">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {summaryFields.map(({ key, value }) =>
                                        key === 'account_head' ? (
                                            <InfoRow key={key} label={formatLabel(key)}>
                                                <BudgetHeadName value={String(value)} className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]" />
                                            </InfoRow>
                                        ) : (
                                            <InfoRow key={key} label={formatLabel(key)} value={String(value)} />
                                        )
                                    )}
                                </div>
                            </GroupCard>
                        )}

                        {/* Faculty Admission PDF card (when uploaded + approved) */}
                        {facultyPdfUrl && !isPendingStaff && (
                            <GroupCard icon={FileTextIcon} label="Faculty Admission">
                                <InfoRow
                                    label="Signed PDF"
                                    value={facultyPdfUrl}
                                    isFile
                                />
                            </GroupCard>
                        )}

                        {/* Full form via DynamicFormRenderer */}
                        {fields.length > 0 ? (
                            <GroupCard icon={GraduationCapIcon} label="Fellowship Details">
                                <DynamicFormRenderer fields={fields} {...rendererProps} />
                            </GroupCard>
                        ) : (
                            /* Fallback: show all non-hidden scalar + table fields */
                            <>
                                {/* Scalar fields */}
                                {(() => {
                                    const others = Object.entries(formData).filter(([k, v]) =>
                                        !ALWAYS_SKIP.has(k) &&
                                        !KEY_FIELDS.includes(k) &&
                                        !Array.isArray(v) &&
                                        (typeof v !== 'object' || v === null) &&
                                        !k.startsWith('_')
                                    );
                                    if (!others.length) return null;
                                    return (
                                        <GroupCard icon={BuildingIcon} label="Additional Details">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                {others.map(([k, v]) => (
                                                    <InfoRow key={k} label={formatLabel(k)} value={String(v ?? '')} />
                                                ))}
                                            </div>
                                        </GroupCard>
                                    );
                                })()}
                                {/* Child tables */}
                                {Object.entries(formData)
                                    .filter(([k, v]) => Array.isArray(v) && !k.startsWith('_'))
                                    .map(([tableKey, rows]) => {
                                        const typedRows = rows as Record<string, any>[];
                                        if (!typedRows.length) return null;
                                        const headers = Object.keys(typedRows[0]).filter(h =>
                                            !['name', 'doctype', 'docstatus', 'idx', 'parent', 'parentfield', 'parenttype', 'owner', 'creation', 'modified', 'modified_by'].includes(h)
                                        );
                                        return (
                                            <GroupCard key={tableKey} icon={GraduationCapIcon} label={formatLabel(tableKey)}>
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                                                {headers.map(h => (
                                                                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
                                                                        {formatLabel(h)}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[#F4F4F5] dark:divide-[#3F3F46]">
                                                            {typedRows.map((row, i) => (
                                                                <tr key={i} className="hover:bg-[#FAFAF9] dark:hover:bg-[#3F3F46]/30 transition-colors">
                                                                    {headers.map(h => (
                                                                        <td key={h} className="px-4 py-2.5 text-[13px] font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
                                                                            {String(row[h] ?? '—')}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </GroupCard>
                                        );
                                    })}
                            </>
                        )}
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-5">
                        {/* Faculty Admission PDF for staff at Pending Staff Approval */}
                        {isPendingStaff && hasFacultyPdf && (
                            <div className="overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                                <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-2">
                                    Faculty Admission PDF
                                </p>
                                <p className="text-[12px] text-emerald-700 dark:text-emerald-300 mb-3">
                                    The signed PDF has been uploaded. Review it before forwarding to HoS.
                                </p>
                                <a
                                    href={facultyPdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Open PDF
                                </a>
                            </div>
                        )}

                        {/* Commitable Balance */}
                        <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-4 space-y-3">
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

                        {/* Commit Payment — R&D Staff only at Pending Staff Approval */}
                        {isPendingStaff && isRnDStaff && commitDetails && (
                            <CommitPayment
                                doctype="Top Up Fellowship"
                                docName={docName || ''}
                                projectName={commitDetails.project_number || commitDetails.project_code || projectCode}
                                budgetHeads={budgetHeads.length > 0 ? budgetHeads : accountHeadLabel ? [accountHeadLabel] : commitDetails.account_head ? [commitDetails.account_head] : []}
                                actualBalance={actualBalance}
                                commitableBalance={commitableBalance}
                                billAmount={Number(commitDetails.total_amount) || 0}
                                onCommitSuccess={() => { setIsCommitted(true); handleRefresh(); }}
                                onStagingStatusChange={setIsCommitted}
                            />
                        )}
                        {isPendingStaff && isRnDStaff && !commitDetails && (
                            <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-4">
                                <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-2">
                                    Budget Commitment
                                </p>
                                <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                                    Commit details could not be loaded.
                                </p>
                            </div>
                        )}

                        {/* Quick info panel */}
                        <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A]">
                            <div className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-5 py-3">
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#71717A] dark:text-[#A1A1AA]">
                                    Document Info
                                </p>
                            </div>
                            <div className="p-4 space-y-3">
                                {[
                                    { label: 'Document ID', value: docName },
                                    { label: 'Status', value: workflowState },
                                    formData.modified && { label: 'Last Modified', value: new Date(formData.modified).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                                    formData.owner && { label: 'Owner', value: formData.owner },
                                ].filter(Boolean).map((item: any) => (
                                    <div key={item.label}>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] dark:text-[#71717A]">{item.label}</p>
                                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mt-0.5">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <FloatingActivityLogButton doctype="Top Up Fellowship" docname={docName || ''} />

            <ProjectLedgerModal
                isOpen={isLedgerOpen}
                onClose={() => setIsLedgerOpen(false)}
                projectName={projectCode}
                budgetHeadList={budgetHeadList}
            />
        </div>
    );
};

export default TopUpFellowshipDetails;
