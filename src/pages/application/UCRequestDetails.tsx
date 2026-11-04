import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CancellationLockBanner } from "@/components/CancellationLock";
import { getFileUrl } from "@/utils/fileUtils";
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappePostCall, useFrappeAuth, useFrappeGetCall, useFrappeGetDoc } from 'frappe-react-sdk';
import { useUserRoles } from '@/components/UserRole';
import { cn } from '@/lib/utils';
import {
    CalendarIcon, EditIcon, Send, ChevronRight, CheckCircle2, XCircle, Clock,
    FolderIcon, FileCheck2, PaperclipIcon, Printer, Building2, Stamp, UploadIcon, Files, Save,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalLoader } from '@/components/ui/global-loader';
import { ucRequestAPI, prepareFormDataForApi } from '@/services/apiService';
import UCRequestActionButtons, { UC_PRINT_ACTIONS } from '@/components/UCRequestActionButtons';
import { GroupCard, FileField, UCProjectDetails, labelCls, inputCls } from '@/components/UCRequestShared';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';
import ViewProjectButton from '@/components/ViewProjectButton';
import { ActivityLog } from '@/components/ActivityLog';
import { P11PrintModal } from '@/components/P11PrintModal';
import { PrintBundleModal } from '@/components/PrintBundleModal';
import { generateUcHtml, getUcAttachments } from '@/utils/ucPrint';
import { ErrorModal } from '../../components/ErrorModal';
import { parseFrappeError } from '../../utils/errorUtils';

const STATE_REGISTRAR = 'Pending Registrar Verification';

const stagesFor = (ucType: string) => [
    'Draft',
    'Pending Staff Review',
    'Pending PI Verification',
    'Pending Staff Approval',
    'Pending HoS Approval',
    ...(ucType === 'Audited UC' ? [STATE_REGISTRAR] : []),
    'Pending Dean Approval',
    'Approved',
];

type StageStatus = 'completed' | 'in-progress' | 'pending' | 'rejected';

// --- WORKFLOW TIMELINE ---
const WorkflowTimeline: React.FC<{ currentState: string; ucType: string }> = ({ currentState, ucType }) => {
    const mainStages = stagesFor(ucType);
    const currentIdx = mainStages.indexOf(currentState);
    const stages: { label: string; status: StageStatus }[] =
        currentState === 'Rejected'
            ? [...mainStages.slice(0, -1).map((label) => ({ label, status: 'completed' as StageStatus })), { label: 'Rejected', status: 'rejected' }]
            : mainStages.map((label, idx) => ({
                  label,
                  status: currentState === 'Approved' || idx < currentIdx ? 'completed' : idx === currentIdx ? 'in-progress' : 'pending',
              }));

    const iconForStatus = (status: StageStatus) => {
        if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-white" />;
        if (status === 'in-progress') return <Clock className="w-4 h-4 text-white" />;
        if (status === 'rejected') return <XCircle className="w-4 h-4 text-white" />;
        return <span className="w-2 h-2 rounded-full bg-white/60" />;
    };
    const bgForStatus = (status: StageStatus) =>
        status === 'completed' ? 'bg-emerald-500'
            : status === 'in-progress' ? 'bg-[#D97757]'
                : status === 'rejected' ? 'bg-red-500'
                    : 'bg-zinc-300 dark:bg-zinc-600';

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-5">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                Workflow Progress
            </h3>
            <div className="flex items-start overflow-x-auto pb-1">
                {stages.map((stage, idx) => (
                    <React.Fragment key={stage.label}>
                        <div className="flex flex-col items-center min-w-[90px] max-w-[110px]">
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shadow-sm flex-shrink-0', bgForStatus(stage.status))}>
                                {iconForStatus(stage.status)}
                            </div>
                            <p className={cn(
                                'mt-2 text-center text-xs leading-tight px-1',
                                stage.status === 'in-progress' && 'font-bold text-[#D97757]',
                                stage.status === 'completed' && 'text-emerald-600 dark:text-emerald-400 font-medium',
                                stage.status === 'pending' && 'text-zinc-400 dark:text-zinc-500',
                                stage.status === 'rejected' && 'text-red-500 font-bold',
                            )}>
                                {stage.label}
                            </p>
                            {stage.status === 'in-progress' && (
                                <span className="mt-1 text-[10px] font-bold text-white bg-[#D97757] px-2 py-0.5 rounded-full">
                                    Pending Here
                                </span>
                            )}
                        </div>
                        {idx < stages.length - 1 && (
                            <div className="flex-1 flex items-center pt-4 min-w-[20px]">
                                <div className={cn('h-1 w-full rounded', stage.status === 'completed' ? 'bg-emerald-400' : 'bg-zinc-200 dark:bg-zinc-700')} />
                                <ChevronRight className="w-3 h-3 text-zinc-400 flex-shrink-0 -ml-1" />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

const StateBadge = ({ state }: { state: string }) => {
    const colors: Record<string, string> = {
        Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        Draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    };
    const cls = colors[state] ?? (state?.startsWith('Pending') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-zinc-100 text-zinc-600');
    return <span className={cn('px-3 py-1 text-xs font-bold rounded-full', cls)}>{state || 'Draft'}</span>;
};

const FileLink = ({ label, url }: { label: string; url?: string }) => (
    <div className="space-y-1">
        <p className={labelCls}>{label}</p>
        {url ? (
            <a
                href={getFileUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-sm font-medium max-w-full"
            >
                <PaperclipIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{decodeURIComponent(url.split('/').pop() || 'File')}</span>
            </a>
        ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">Not uploaded</p>
        )}
    </div>
);

/** Upload a file through Frappe and bind it to the UC Request's registrar_signed_uc. */
async function uploadRegistrarCopy(docname: string, file: File) {
    const csrfToken = (window as Window & { csrf_token?: string }).csrf_token;
    const csrf: Record<string, string> = csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {};

    const fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("is_private", "0");
    fd.append("doctype", "UC Request");
    fd.append("docname", docname);
    fd.append("fieldname", "registrar_signed_uc");
    const res = await fetch(`${FRAPPE_BASE_URL}/api/method/upload_file`, { method: "POST", body: fd, credentials: "include", headers: csrf });
    if (!res.ok) throw new Error(await res.text());
    const fileUrl: string | undefined = (await res.json())?.message?.file_url;
    if (!fileUrl) throw new Error("Upload returned no file_url");

    const bindRes = await fetch(`${FRAPPE_BASE_URL}/api/method/${ucRequestAPI.attachDirectorPdf}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...csrf },
        body: JSON.stringify({ docname, file_url: fileUrl }),
    });
    if (!bindRes.ok) throw new Error(await bindRes.text());
}

// --- MAIN COMPONENT ---
const UCRequestDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [printHtml, setPrintHtml] = useState('');
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [isBundleOpen, setIsBundleOpen] = useState(false);
    // Set by Verify & Print / Print & Send to Registrar: open the print once the
    // refreshed document (with its verification stamp) has loaded.
    const [printAfterLoad, setPrintAfterLoad] = useState(false);
    const [staffEdits, setStaffEdits] = useState<{ staff_prepared_uc?: any; staff_remarks?: string }>({});
    const [isSavingStaff, setIsSavingStaff] = useState(false);
    const [isUploadingRegistrar, setIsUploadingRegistrar] = useState(false);
    const registrarInputRef = useRef<HTMLInputElement | null>(null);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Action Failed", message: "" });

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser || null);
    const isRndStaff = roles.includes('staff, RnD');
    // Approvers (Staff / HoS / Dean) get a project preview, as on the other forms
    const canViewProject = ['staff, RnD', 'Hos, RnD (Head of Section, RnD)', 'Dean, RnD']
        .some((r) => roles.includes(r));

    const { call: fetchDocument } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: submitDocument } = useFrappePostCall<{ message: any }>(ucRequestAPI.submit);
    const { call: saveStaffSection } = useFrappePostCall<{ message: any }>(ucRequestAPI.updateStaffSection);
    // Same SWR key as UCRequestActionButtons, so mutating here refreshes the buttons too
    const { data: actionsData, mutate: mutateActions } = useFrappeGetCall<{ message: string[] }>(
        ucRequestAPI.getWorkflowActions,
        { docname: id },
        id ? undefined : null,
    );
    const { data: deptDoc } = useFrappeGetDoc<{ dept_name: string }>(
        'Department_prornd',
        formData.implementation_department,
        formData.implementation_department ? undefined : null,
    );

    useEffect(() => {
        if (!id) return;
        fetchDocument({ doctype: 'UC Request', name: id })
            .then((doc) => {
                setFormData(doc?.message || {});
                setStaffEdits({ staff_remarks: doc?.message?.staff_remarks || '' });
            })
            .catch((err) => setErrorModal({ open: true, title: 'Could not load UC Request', message: parseFrappeError(err) }))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, refreshKey]);

    const handleRefresh = useCallback(() => {
        setLoading(true);
        setRefreshKey((k) => k + 1);
        mutateActions();
    }, [mutateActions]);

    const openPrint = useCallback(() => {
        const activityEl = document.getElementById('floating-activity-log-container');
        setPrintHtml(generateUcHtml(formData, deptDoc?.dept_name || '', activityEl));
        setIsPrintModalOpen(true);
    }, [formData, deptDoc]);

    const openBundle = useCallback(() => {
        const activityEl = document.getElementById('floating-activity-log-container');
        setPrintHtml(generateUcHtml(formData, deptDoc?.dept_name || '', activityEl));
        setIsBundleOpen(true);
    }, [formData, deptDoc]);

    useEffect(() => {
        if (printAfterLoad && !loading) {
            setPrintAfterLoad(false);
            openPrint();
        }
    }, [printAfterLoad, loading, openPrint]);

    const attachments = useMemo(() => getUcAttachments(formData), [formData]);

    const workflowState = formData.workflow_state || 'Draft';
    const isDraft = workflowState === 'Draft';
    const isAudited = formData.uc_type === 'Audited UC';
    const user = (currentUser || '').toLowerCase();
    const isPi = !!user && [formData.pi_webmail, formData.owner].some((u) => (u || '').toLowerCase() === user);
    const staffCanEdit = isRndStaff && workflowState.startsWith('Pending Staff');
    const hasPrintAction = (actionsData?.message ?? []).some((a) => UC_PRINT_ACTIONS.includes(a));
    // While a print action is pending, the action itself is the only way to print
    // (it confirms first). Before the PI has verified, the PI gets no separate print.
    const showPlainPrint = !isDraft && !hasPrintAction && !isRndStaff && (!isPi || !!formData.pi_verified_on);

    const handleSubmitDraft = async () => {
        if (!id || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await submitDocument({ docname: id });
            if (res?.message?.status !== 'success') throw new Error(res?.message?.message || 'Submission failed');
            alert('UC Request submitted successfully!');
            handleRefresh();
        } catch (err: any) {
            setErrorModal({ open: true, title: 'Submission Failed', message: parseFrappeError(err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveStaff = async () => {
        if (!id) return;
        setIsSavingStaff(true);
        try {
            const data = await prepareFormDataForApi({ name: id, ...staffEdits });
            const res = await saveStaffSection({ doc_data: JSON.stringify(data) });
            if (res?.message?.status !== 'success') throw new Error(res?.message?.message || 'Save failed');
            handleRefresh();
        } catch (err: any) {
            setErrorModal({ open: true, title: 'Save Failed', message: parseFrappeError(err) });
        } finally {
            setIsSavingStaff(false);
        }
    };

    const handleRegistrarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;
        setIsUploadingRegistrar(true);
        try {
            await uploadRegistrarCopy(id, file);
            handleRefresh();
        } catch (err: any) {
            setErrorModal({ open: true, title: 'Upload Failed', message: parseFrappeError(err) });
        } finally {
            setIsUploadingRegistrar(false);
            if (registrarInputRef.current) registrarInputRef.current.value = '';
        }
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    const headerBtn = "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all";

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <main className="flex-1 p-0 w-full overflow-hidden">
                <PageHeader
                    title={formData.name || id || 'UC Request'}
                    status={workflowState}
                    projectName={formData.project_title}
                    projectNumber={formData.project_no}
                >
                    {canViewProject && <ViewProjectButton doctype="UC Request" data={formData} />}
                    {showPlainPrint && (
                        <button onClick={openPrint} className={headerBtn}>
                            <Printer className="w-4 h-4" /> Print
                        </button>
                    )}
                    {isRndStaff && !isDraft && (
                        <button onClick={openBundle} className={headerBtn}>
                            <Files className="w-4 h-4" /> Print Form + Documents
                        </button>
                    )}
                    {isDraft && id && isPi && (
                        <>
                            <button onClick={() => navigate(`/uc-request?edit=${id}`)} className={headerBtn}>
                                <EditIcon className="w-4 h-4" /> Edit
                            </button>
                            <button
                                onClick={handleSubmitDraft}
                                disabled={isSubmitting || !formData.uc_type}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </>
                    )}
                </PageHeader>
                <CancellationLockBanner doctype="UC Request" name={id} />

                <div className="mt-6">
                    <WorkflowTimeline currentState={workflowState} ucType={formData.uc_type} />
                </div>

                {id && !isDraft && (
                    <div className="mt-4">
                        <UCRequestActionButtons
                            docname={id}
                            onActionComplete={handleRefresh}
                            onPrintAction={() => setPrintAfterLoad(true)}
                        />
                    </div>
                )}

                <div className="mt-5 grid grid-cols-1 lg:grid-cols-4 gap-5">
                    <div className="lg:col-span-3 space-y-5">
                        <GroupCard icon={FolderIcon} label="Project Details" badge="A">
                            <UCProjectDetails data={formData} />
                        </GroupCard>

                        <GroupCard icon={FileCheck2} label="Utilization Certificate" badge="B">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className={labelCls}>Name of the Applicant</p>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formData.pi_name || '—'}</p>
                                </div>
                                <div>
                                    <p className={labelCls}>UC Type</p>
                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formData.uc_type || '—'}</p>
                                </div>
                                <div>
                                    <p className={labelCls}>Total Sanctioned Amount</p>
                                    <p className="text-sm font-bold text-[#D97757]">
                                        ₹ {(Number(formData.total_sanction_amount) || 0).toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FileLink label="Previous UC" url={formData.prev_uc} />
                                <FileLink label="UC Format" url={formData.uc_format} />
                            </div>
                            <div className="mt-5">
                                <p className={labelCls}>Comment, If Any</p>
                                {formData.uc_comment_if_any ? (
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        {formData.uc_comment_if_any}
                                    </p>
                                ) : (
                                    <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">No comments</p>
                                )}
                            </div>
                        </GroupCard>

                        {!isDraft && (
                            <GroupCard icon={Building2} label="R&D Office" badge="C">
                                {staffCanEdit ? (
                                    <div className="space-y-4">
                                        <FileField
                                            label="UC Prepared by R&D Office"
                                            value={staffEdits.staff_prepared_uc ?? formData.staff_prepared_uc}
                                            onChange={(f) => setStaffEdits((s) => ({ ...s, staff_prepared_uc: f }))}
                                        />
                                        <div>
                                            <label className={labelCls}>R&amp;D Office Remarks</label>
                                            <textarea
                                                rows={3}
                                                value={staffEdits.staff_remarks || ''}
                                                onChange={(e) => setStaffEdits((s) => ({ ...s, staff_remarks: e.target.value }))}
                                                className={cn(inputCls, 'resize-none')}
                                            />
                                        </div>
                                        <button
                                            onClick={handleSaveStaff}
                                            disabled={isSavingStaff}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#D97757] text-white hover:bg-[#c66a4e] disabled:opacity-50"
                                        >
                                            <Save className="w-4 h-4" /> {isSavingStaff ? 'Saving...' : 'Save R&D Office Details'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FileLink label="UC Prepared by R&D Office" url={formData.staff_prepared_uc} />
                                        <div>
                                            <p className={labelCls}>R&amp;D Office Remarks</p>
                                            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                                                {formData.staff_remarks || <span className="text-zinc-400 italic">No remarks</span>}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </GroupCard>
                        )}

                        {isAudited && !isDraft && (
                            <GroupCard icon={Stamp} label="Registrar Verification (Audited UC)" badge="D">
                                {workflowState === STATE_REGISTRAR && (
                                    <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                                        {formData.registrar_signed_uc
                                            ? 'The Registrar-verified copy has been uploaded. HoS can now forward the request to the Dean.'
                                            : 'With the Registrar for offline verification. R&D Staff uploads the verified copy when it comes back; HoS then forwards it to the Dean.'}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <FileLink label="Registrar Verified UC (Signed Copy)" url={formData.registrar_signed_uc} />
                                    {workflowState === STATE_REGISTRAR && isRndStaff && (
                                        <div>
                                            <input ref={registrarInputRef} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={handleRegistrarFile} />
                                            <button
                                                onClick={() => registrarInputRef.current?.click()}
                                                disabled={isUploadingRegistrar}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#D97757] text-white hover:bg-[#c66a4e] disabled:opacity-50"
                                            >
                                                <UploadIcon className="w-4 h-4" />
                                                {isUploadingRegistrar ? 'Uploading…' : formData.registrar_signed_uc ? 'Replace Verified Copy' : 'Upload Verified Copy'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {formData.hos_printed_on && (
                                    <p className="mt-3 text-xs text-zinc-500">
                                        Sent to Registrar on {new Date(formData.hos_printed_on).toLocaleString('en-IN')}
                                    </p>
                                )}
                            </GroupCard>
                        )}
                    </div>

                    <aside className="lg:col-span-1 space-y-4">
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Status</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500 dark:text-zinc-400">State</span>
                                    <StateBadge state={workflowState} />
                                </div>
                                {formData.owner && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500 dark:text-zinc-400">Applicant</span>
                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 text-xs text-right max-w-[140px] truncate">{formData.owner}</span>
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
                                <div className="flex justify-between">
                                    <span className="text-zinc-500 dark:text-zinc-400">PI Verified</span>
                                    <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100">
                                        {formData.pi_verified_on ? new Date(formData.pi_verified_on).toLocaleDateString('en-IN') : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
            {id && (
                <div id="floating-activity-log-container" style={{ display: 'none' }}>
                    <ActivityLog doctype="UC Request" docname={id} />
                </div>
            )}
            {id && <FloatingActivityLogButton doctype="UC Request" docname={id} />}
            <P11PrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                htmlContent={printHtml}
                docName={id || ''}
                title="UC Request Print Preview"
            />
            <PrintBundleModal
                isOpen={isBundleOpen}
                onClose={() => setIsBundleOpen(false)}
                htmlContent={printHtml}
                attachments={attachments}
                docName={id || ''}
                title="UC Request — Form + Documents"
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

export default UCRequestDetails;
