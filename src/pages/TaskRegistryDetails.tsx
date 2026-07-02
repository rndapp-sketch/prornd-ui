import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDoc, useFrappePostCall, useFrappeAuth, useFrappeGetCall } from 'frappe-react-sdk';
import {
    FileTextIcon, ClipboardListIcon, ShoppingCartIcon,
    LayoutGridIcon, PaperclipIcon, Printer, FolderOpenIcon, XIcon,
    ExternalLinkIcon, CreditCardIcon, CheckCircle2Icon,
} from "lucide-react";
import { cn } from '@/lib/utils';

import { PageHeader } from '@/components/common/PageHeader';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { travelAPI, advanceSettlementAPI, temporaryAdvanceAPI, tadaAPI, recruitmentAdhocContractualAPI, selectionCommitteeReportAPI, disbursalOfHonorariumAPI } from '@/services/apiService';
import { useUserRoles } from '@/components/UserRole';
import { getFileUrl } from '@/utils/fileUtils';
import { POEditor } from '@/components/POEditor';
import { DeclarationFields } from '@/components/DeclarationFields';
import TravelApplicantSummary from '@/components/TravelApplicantSummary';
import ProjectDetailsView from "./ProjectDetails";
import ProjectDetailsOverview from "./ProjectDetailsOverview";
import { generateTemporaryAdvanceHtml } from '@/utils/temporaryAdvancePrint';
import { DOCTYPE_PR_LINKS } from '@/utils/projectTypeMapping';

// ── Shared helpers ────────────────────────────────────────────────────────────
const isFilePath = (value: string) => {
    if (typeof value !== 'string') return false;
    return value.startsWith('/private/files/') ||
        value.startsWith('/files/') ||
        value.startsWith('http://172.16.135.118:8081/') ||
        !!value.match(/\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/i);
};
const getFileName = (path: string) => path.split('/').pop() || path;

const DP_EXCLUDED = [
    'doctype', 'docstatus', 'idx', 'owner', 'creation', 'modified',
    'modified_by', '_user_tags', '_comments', '_assign', '_liked_by', 'name',
    'workflow_state', '_seen', 'parent', 'parenttype', 'parentfield',
];
const dpFmt = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
const dpIsAmt = (key: string) => /amount|total|price|estimate|budget|salary|fee|cost/i.test(key);
const dpIsBool = (key: string, val: any) =>
    (val === 0 || val === 1) &&
    (key.startsWith('dec_') || key.startsWith('is_') || key.startsWith('has_') || key.startsWith('declaration_'));
const dpINR = (val: any) =>
    Number(val).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

// ── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = () => (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] py-12 dark:border-[#3F3F46] dark:bg-[#18181B]">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#D97757] border-t-transparent" />
    </div>
);

// ── Section heading ───────────────────────────────────────────────────────────
const SectionHeading = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#2563EB] dark:bg-blue-950/30 dark:text-blue-300">
            <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
        </span>
        <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#A1A1AA]">
            {title}
        </span>
        <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46]" />
    </div>
);

function getOriginalApplicationRoute(refDoctype: string, refName: string): string {
    if (!refDoctype || !refName) return "";
    const name = encodeURIComponent(refName);
    
    switch (refDoctype) {
        case "Reimbursement":
            return `/reimbursement/${name}`;
        case "Disbursal of Honorarium":
            return `/disbursal-of-honorarium/${name}`;
        case "Disbursal of Consultancy":
            return `/disbursal-of-consultancy/${name}`;
        case "Travel":
            return `/travel/${name}`;
        case "Loan Request":
            return `/loan-request/${name}`;
        case "Indent General Form":
            return `/indent-general-form-details/${name}`;
        case "Indent Cum Sanction Sheet":
            return `/indent-cum-sanction-sheet/${name}`;
        case "Selection Committee Report":
            return `/selection-committee-report/${name}`;
        case "Temporary Advance":
            return `/temporary-advance/${name}`;
        case "Direct Purchase":
            return `/direct-purchase/${name}`;
        case "Advance Settlement":
            return `/advance-settlement/${name}`;
        default:
            return `/pending-tasks/${encodeURIComponent(refDoctype)}/${name}`;
    }
}

const OriginalCommitmentModal = ({
    record,
    onClose,
}: {
    record: any;
    onClose: () => void;
}) => {
    let payloadObj: Record<string, any> = {};
    try {
        const raw = record.payload ?? record.commit_payload ?? "{}";
        payloadObj = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
        payloadObj = {};
    }

    const commitAmount = payloadObj.commit_amount ?? payloadObj.commitAmount;
    const budgetHead = payloadObj.budget_head ?? payloadObj.budgetHead;
    const projectName = payloadObj.project_name ?? payloadObj.projectName;
    const particulars = payloadObj.commit_particular ?? payloadObj.commitParticular;

    const rawStatus: string = record.status ?? "";
    const displayStatus = rawStatus === "PUBLISHED" ? "Committed" : rawStatus;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-lg flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-2.5">
                        <CreditCardIcon className="w-5 h-5 text-[#D97757]" />
                        <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                            Commitment Details
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                        aria-label="Close separate window"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                    <div className="text-center py-4 bg-orange-50/50 dark:bg-zinc-800/30 rounded-xl border border-orange-100/50 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider mb-1">Commit Amount</p>
                        <p className="text-3xl font-extrabold text-[#D97757]">
                            ₹{commitAmount !== undefined ? Number(commitAmount).toLocaleString("en-IN") : "0"}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Reference ID</span>
                            <span className="col-span-2 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 text-right break-all">
                                {record.reference_name}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Reference Type</span>
                            <span className="col-span-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 text-right">
                                {record.reference_doctype}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Budget Head</span>
                            <span className="col-span-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 text-right break-all">
                                {budgetHead || "-"}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Project Name</span>
                            <span className="col-span-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 text-right break-all">
                                {projectName || "-"}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Staging Status</span>
                            <div className="col-span-2 text-right">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    displayStatus === "Committed"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                                }`}>
                                    {displayStatus}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Staging ID</span>
                            <span className="col-span-2 text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400 text-right break-all">
                                {record.name}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Modified By</span>
                            <span className="col-span-2 text-xs text-zinc-800 dark:text-zinc-200 text-right break-all">
                                {record.modified_by || "-"}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Modified</span>
                            <span className="col-span-2 text-xs text-zinc-800 dark:text-zinc-200 text-right">
                                {record.modified ? new Date(record.modified).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </span>
                        </div>
                    </div>

                    {particulars && (
                        <div className="flex flex-col gap-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Particulars / Comments</span>
                            <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
                                {particulars}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const OriginalCommitmentSidebar = ({ refName, refDoctype }: { refName?: string; refDoctype?: string }) => {
    const [record, setRecord] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!refName) return;
        setLoading(true);
        const fetchStaging = async () => {
            try {
                const url = `/api/method/rndopsapp.rndopsapp.cancellation_api.get_original_commitment?reference_doctype=${encodeURIComponent(refDoctype || '')}&reference_name=${encodeURIComponent(refName)}`;
                const res = await fetch(url, { credentials: "include" });
                if (res.ok) {
                    const json = await res.json();
                    const record = json?.message || null;
                    if (record) {
                        setRecord(record);
                    }
                }
            } catch (err) {
                console.error("Error fetching original commitment:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStaging();
    }, [refName, refDoctype]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#D97757] border-t-transparent" />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading original commitment…</span>
            </div>
        );
    }

    if (!record) {
        return (
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <CreditCardIcon className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Original Commitment
                    </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    No active budget commitment was found for the original application <span className="font-semibold">{refName}</span>.
                </p>
            </div>
        );
    }

    let payloadObj: Record<string, any> = {};
    try {
        const raw = record.payload ?? record.commit_payload ?? "{}";
        payloadObj = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
        payloadObj = {};
    }

    const commitAmount = payloadObj.commit_amount ?? payloadObj.commitAmount;
    const budgetHead = payloadObj.budget_head ?? payloadObj.budgetHead;
    const projectName = payloadObj.project_name ?? payloadObj.projectName;
    const particulars = payloadObj.commit_particular ?? payloadObj.commitParticular;

    return (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <CheckCircle2Icon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Original Commitment
                </h3>
            </div>

            <div className="space-y-3 text-sm">
                {commitAmount !== undefined && (
                    <div className="flex justify-between items-center gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Commit Amount</span>
                        <span className="font-bold text-[#D97757] text-right">
                            ₹{Number(commitAmount).toLocaleString("en-IN")}
                        </span>
                    </div>
                )}
                {budgetHead && (
                    <div className="flex justify-between items-center gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Budget Head</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-right break-all">
                            {budgetHead}
                        </span>
                    </div>
                )}
                {projectName && (
                    <div className="flex justify-between items-center gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Project Name</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-right break-all">
                            {projectName}
                        </span>
                    </div>
                )}
                {particulars && (
                    <div className="flex flex-col gap-1 py-1.5">
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Particulars</span>
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg mt-1 border border-zinc-100 dark:border-zinc-800/80">
                            {particulars}
                        </span>
                    </div>
                )}
                <div className="flex justify-between items-center gap-2 pt-2 text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Status</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold uppercase text-[10px]">
                        {record.status === "PUBLISHED" ? "Committed" : record.status}
                    </span>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors border border-zinc-200/60 dark:border-zinc-800"
                    >
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                        Open in Separate Window
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <OriginalCommitmentModal
                    record={record}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};

const DPDocumentViewer = ({ data, doctype: viewerDoctype }: { data: Record<string, any>; doctype?: string }) => {
    const allScalar = Object.entries(data).filter(([key, value]) => {
        if (DP_EXCLUDED.includes(key)) return false;
        if (key.startsWith('_')) return false;
        if (Array.isArray(value)) return false;
        if (value === null || value === undefined || value === '') return false;
        return true;
    });
    const childTables = Object.entries(data).filter(([, value]) => Array.isArray(value) && (value as any[]).length > 0);
    const fileFields = allScalar.filter(([k, v]) => isFilePath(String(v)) || k.startsWith('upload_'));
    const amountFields = allScalar.filter(([k, v]) => dpIsAmt(k) && !isFilePath(String(v)) && !dpIsBool(k, v));
    const infoFields = allScalar.filter(([k, v]) =>
        !isFilePath(String(v)) && !dpIsBool(k, v) && !k.startsWith('upload_'));

    return (
        <div className="space-y-6">
            {/* Financial KPI strip */}
            {amountFields.length > 0 && (
                <div className={cn(
                    "grid gap-3",
                    amountFields.length === 1 && "grid-cols-1 max-w-xs",
                    amountFields.length === 2 && "grid-cols-1 sm:grid-cols-2",
                    amountFields.length >= 3 && "grid-cols-1 sm:grid-cols-3",
                )}>
                    {amountFields.slice(0, 3).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm dark:border-[#3F3F46] dark:bg-zinc-800/50">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">{dpFmt(key)}</p>
                            <p className="text-[17px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">
                                {!isNaN(Number(value)) ? dpINR(value) : String(value)}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Info fields */}
            {infoFields.length > 0 && (
                <div>
                    <SectionHeading icon={<LayoutGridIcon />} title="Information" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {infoFields.map(([key, value]) => (
                            <div key={key} className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]">
                                    <span className="truncate">{dpFmt(key)}</span>
                                </div>
                                <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">
                                    {String(value)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Declarations */}
            {viewerDoctype && <DeclarationFields doctype={viewerDoctype} />}

            {/* Attachments */}
            {fileFields.length > 0 && (
                <div>
                    <SectionHeading icon={<PaperclipIcon />} title="Attachments" />
                    <div className="flex flex-wrap gap-2">
                        {fileFields.map(([key, value]) => (
                            <a key={key} href={String(value)} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800 text-[#D97757] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm font-medium">
                                <PaperclipIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate max-w-[200px]">{getFileName(String(value))}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Child tables */}
            {childTables.map(([key, value]) => {
                const rows = value as any[];
                const cols = Object.keys(rows[0]).filter(k => !k.startsWith('_') && !DP_EXCLUDED.includes(k));
                const hasAmtCols = cols.some(c => dpIsAmt(c));
                const colTotals: Record<string, number> = {};
                if (hasAmtCols) cols.forEach(c => {
                    if (dpIsAmt(c)) colTotals[c] = rows.reduce((s, r) => s + (parseFloat(r[c]) || 0), 0);
                });
                return (
                    <div key={key}>
                        <SectionHeading icon={<FileTextIcon />} title={dpFmt(key)} />
                        <div className="overflow-hidden rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                            <table className="w-full table-fixed text-[11px]">
                                <thead>
                                    <tr className="border-b border-[#E4E4E7] bg-[#EEF2FF] dark:border-[#3F3F46] dark:bg-[#1E3A8A]/20">
                                        <th className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] w-9">#</th>
                                        {cols.map(c => (
                                            <th key={c} className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] break-words">{dpFmt(c)}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => (
                                        <tr key={i} className={cn(
                                            "border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors",
                                            i % 2 === 1 && "bg-[#FAFAF9]/60 dark:bg-zinc-800/20",
                                        )}>
                                            <td className="px-2.5 py-2 align-top text-[10px] text-[#71717A] dark:text-[#A1A1AA] font-mono">{i + 1}</td>
                                            {cols.map(c => (
                                                <td key={c} className="px-2.5 py-2 align-top text-[#3F3F46] dark:text-[#E4E4E7] break-words whitespace-normal">
                                                    {dpIsAmt(c) && !isNaN(Number(row[c]))
                                                        ? <span className="font-medium">{dpINR(row[c])}</span>
                                                        : String(row[c] ?? '—')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {hasAmtCols && (
                                        <tr className="border-t-2 border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800/60 font-semibold">
                                            <td className="px-2.5 py-2 text-[10px] text-[#71717A] dark:text-[#A1A1AA]" />
                                            {cols.map(c => (
                                                <td key={c} className="px-2.5 py-2 text-[#3F3F46] dark:text-[#E4E4E7] break-words">
                                                    {colTotals[c] != null
                                                        ? <span className="font-semibold text-[#D97757]">{dpINR(colTotals[c])}</span>
                                                        : ''}
                                                </td>
                                            ))}
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ── DP Tab config ─────────────────────────────────────────────────────────────
type DPTabId = 'details' | 'p11' | 'sanction' | 'po';

const DP_TABS: { id: DPTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'details',  label: 'Details',         icon: <LayoutGridIcon className="h-3.5 w-3.5" /> },
    { id: 'p11',      label: 'P-11 Form',       icon: <ClipboardListIcon className="h-3.5 w-3.5" /> },
    { id: 'sanction', label: 'Sanction Sheet',  icon: <FileTextIcon className="h-3.5 w-3.5" /> },
    { id: 'po',       label: 'Purchase Order',  icon: <ShoppingCartIcon className="h-3.5 w-3.5" /> },
];

const DP_TAB_ACTIVE: Record<DPTabId, string> = {
    details:  'border-[#2563EB] bg-blue-50 text-[#1D4ED8] shadow-sm dark:border-blue-500/50 dark:bg-blue-950/25 dark:text-blue-300',
    p11:      'border-[#4A6CF7] bg-indigo-50 text-[#4338CA] shadow-sm dark:border-indigo-500/50 dark:bg-indigo-950/25 dark:text-indigo-300',
    sanction: 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-950/25 dark:text-emerald-300',
    po:       'border-[#D97757] bg-orange-50 text-[#B45309] shadow-sm dark:border-[#D97757]/60 dark:bg-orange-950/20 dark:text-orange-300',
};

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] px-5 py-12 text-center gap-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#A1A1AA] shadow-sm dark:bg-[#27272A] dark:text-[#71717A]">
            {icon}
        </div>
        <p className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">{title}</p>
        <p className="max-w-md text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">{description}</p>
    </div>
);

// ── Project Preview Modal ─────────────────────────────────────────────────────
const ProjectPreviewModal = ({ projectName, onClose }: { projectName: string; onClose: () => void }) => (
    <div
        className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
        <div className="relative flex-1 mx-auto my-4 w-full max-w-7xl flex flex-col bg-[#FAFAF9] dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <FolderOpenIcon className="w-4 h-4 text-[#D97757]" />
                    Project Registration Preview
                    <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 dark:bg-zinc-800 text-[#D97757] font-mono border border-orange-100 dark:border-zinc-700">
                        {projectName}
                    </span>
                </span>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    aria-label="Close project preview"
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <ProjectDetailsOverview projectName={projectName} embedded />
            </div>
        </div>
    </div>
);

// ── DPLinkedDocTab ────────────────────────────────────────────────────────────
const DPLinkedDocTab = ({ doctype, filterField, filterValue, emptyTitle, emptyDescription, emptyIcon }: {
    doctype: string; filterField: string; filterValue: string;
    emptyTitle: string; emptyDescription: string; emptyIcon: React.ReactNode;
}) => {
    const filters = JSON.stringify([[filterField, '=', filterValue]]);
    const [docName, setDocName] = React.useState<string | null>(null);
    const [listLoading, setListLoading] = React.useState(true);
    const { data: docData, isLoading: docLoading } = useFrappeGetDoc<Record<string, any>>(doctype, docName || '');

    React.useEffect(() => {
        setListLoading(true);
        fetch(`/api/v2/document/${doctype}?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent('["name"]')}`, {
            credentials: 'include', headers: { Accept: 'application/json' },
        }).then(r => r.json()).then(res => {
            setDocName(res?.data?.[0]?.name || null);
        }).catch(() => { }).finally(() => setListLoading(false));
    }, [doctype, filterValue]);

    if (listLoading || docLoading) return <Spinner />;
    if (!docName || !docData) return (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <span className="rounded-md border border-[#E4E4E7] bg-[#FAFAF9] px-2 py-1 font-mono text-[11px] font-bold text-[#71717A] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#A1A1AA]">
                    {docName}
                </span>
            </div>
            <DPDocumentViewer data={docData} doctype={doctype} />
        </div>
    );
};

// ── DP Workflow stepper ───────────────────────────────────────────────────────
const DP_WORKFLOW_STAGES = [
    "Draft",
    "Pending PI Approval",
    "Pending RnD Approval",
    "Approved",
    "RDP-11 Generated",
    "RDP-11 Verified",
    "Sanction Sheet Generated",
    "Sanction Sheet Printed",
    "Sanction Approved",
    "POGenerated",
    "PO Sent",
    "Completed",
];

const ROLE_ABBR: Record<string, string> = {
    "staff, RnD": "RnD",
    "Staff RnD": "RnD",
    "RnD Staff": "RnD",
    "System Manager": "Admin",
    "Permanent Employee": "PI",
    "project staff": "PI",
    "head_approver_1": "Head",
    "Ado_RnD": "Ado",
    "Hos, RnD": "HoS",
    "Dean, RnD": "Dean",
    "Director": "Dir",
    "All_ProRnd_User": "All",
};

const abbreviateRole = (role: string) => ROLE_ABBR[role] ?? role.split(/[\s,_]/)[0];

const useDPWorkflowRoles = () => {
    const { data: wfList } = useFrappeGetCall<{ message: { name: string }[] }>(
        'frappe.client.get_list',
        { doctype: 'Workflow', filters: JSON.stringify([['document_type', '=', 'Direct Purchase'], ['is_active', '=', 1]]), fields: JSON.stringify(['name']), limit_page_length: 1 }
    );
    const wfName = wfList?.message?.[0]?.name;
    const { data: wfDoc } = useFrappeGetCall<{ message: { transitions: { state: string; allowed: string }[] } }>(
        'frappe.client.get',
        { doctype: 'Workflow', name: wfName },
        wfName ? undefined : null
    );
    return React.useMemo(() => {
        const map: Record<string, string[]> = {};
        (wfDoc?.message?.transitions || []).forEach(t => {
            if (!map[t.state]) map[t.state] = [];
            const abbr = abbreviateRole(t.allowed);
            if (abbr && !map[t.state].includes(abbr)) map[t.state].push(abbr);
        });
        return map;
    }, [wfDoc]);
};

const DPWorkflowStepper = ({ currentState }: { currentState: string }) => {
    const currentIdx = DP_WORKFLOW_STAGES.indexOf(currentState);
    const isRejected = currentState?.toLowerCase().includes("reject") || currentState?.toLowerCase().includes("cancel");
    const rolesByState = useDPWorkflowRoles();

    return (
        <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-none">
            {DP_WORKFLOW_STAGES.map((stage, idx) => {
                const isDone = currentIdx > idx;
                const isActive = currentIdx === idx;
                const roles = rolesByState[stage] || [];
                return (
                    <React.Fragment key={stage}>
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold border-2 transition-all",
                                isDone && "bg-emerald-500 border-emerald-500 text-white",
                                isActive && !isRejected && "bg-[#D97757] border-[#D97757] text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30 scale-110",
                                isActive && isRejected && "bg-red-500 border-red-500 text-white",
                                !isDone && !isActive && "bg-white dark:bg-zinc-800 border-[#E4E4E7] dark:border-zinc-600 text-[#A1A1AA]",
                            )}>
                                {isDone ? <CheckCircle2Icon className="w-3 h-3" /> : idx + 1}
                            </div>
                            <span className={cn(
                                "text-[8px] font-bold text-center leading-tight max-w-[52px] break-words",
                                isDone && "text-emerald-600 dark:text-emerald-400",
                                isActive && !isRejected && "text-[#D97757]",
                                isActive && isRejected && "text-red-500",
                                !isDone && !isActive && "text-[#A1A1AA] dark:text-zinc-500",
                            )}>
                                {stage}
                            </span>
                            {roles.length > 0 && (
                                <span className={cn(
                                    "text-[7px] font-semibold text-center leading-tight max-w-[52px]",
                                    isActive ? "text-[#D97757]/80" : "text-[#C1C1C8] dark:text-zinc-600",
                                )}>
                                    {roles.join("/")}
                                </span>
                            )}
                        </div>
                        {idx < DP_WORKFLOW_STAGES.length - 1 && (
                            <div className={cn(
                                "h-[2px] flex-1 min-w-[10px] mx-0.5 mb-6 rounded-full transition-all",
                                currentIdx > idx ? "bg-emerald-400 dark:bg-emerald-600" : "bg-[#E4E4E7] dark:bg-zinc-700",
                            )} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// ── DirectPurchaseTabView ─────────────────────────────────────────────────────
const DirectPurchaseTabView = ({ data, docName }: { data: Record<string, any>; docName: string }) => {
    const [activeTab, setActiveTab] = React.useState<DPTabId>('details');
    const [poSanctionData, setPoSanctionData] = React.useState<Record<string, any> | null>(null);
    const [isLoadingPOData, setIsLoadingPOData] = React.useState(false);
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isStaffRnD = roles.some(r => ["staff, RnD", "Staff RnD", "RnD Staff", "System Manager"].includes(r));
    const isPermanentEmployee = roles.some(r => r === "Permanent Employee");

    React.useEffect(() => {
        if (activeTab !== 'po' || !docName || poSanctionData) return;
        setIsLoadingPOData(true);
        const filters = JSON.stringify([["app_id", "=", docName]]);
        fetch(`/api/v2/document/sanction_sheet?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent('["name"]')}`, {
            credentials: 'include', headers: { Accept: 'application/json' },
        }).then(r => r.json()).then(async res => {
            const ssName = res?.data?.[0]?.name;
            if (ssName) {
                const docRes = await fetch('/api/method/frappe.client.get', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Frappe-CSRF-Token': (window as any).csrf_token || '' },
                    body: JSON.stringify({ doctype: 'sanction_sheet', name: ssName }),
                }).then(r => r.json()).catch(() => null);
                if (docRes?.message) setPoSanctionData(docRes.message);
            }
        }).catch(() => { }).finally(() => setIsLoadingPOData(false));
    }, [activeTab, docName, poSanctionData]);

    const workflowState = data?.workflow_state || 'Draft';
    const estimatedAmount = data?.estimated_amount || data?.total_amount || data?.amount;
    const applicant = data?.applicant_name || data?.applicant || data?.owner;
    const projectNo = data?.project_no || data?.project_code || data?.project;
    const createdDate = data?.creation ? new Date(data.creation).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
    const purpose = data?.purpose || data?.particulars || data?.item_description;

    return (
        <div className="space-y-5">
            {/* ── Hero summary card ── */}
            <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden">
                {/* Top accent bar */}
                <div className="h-1 bg-gradient-to-r from-[#D97757] via-orange-400 to-amber-300" />

                <div className="p-5 md:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        {/* Left: key fields */}
                        <div className="space-y-3 min-w-0">
                            <div className="flex items-center gap-2">
                                <ShoppingCartIcon className="h-4 w-4 text-[#D97757] flex-shrink-0" />
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#A1A1AA]">Direct Purchase</span>
                            </div>
                            <p className="font-mono text-[11px] text-[#A1A1AA] dark:text-zinc-500 break-all">{docName}</p>
                            {purpose && (
                                <p className="text-[14px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] leading-snug max-w-md">{purpose}</p>
                            )}
                            <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1">
                                {applicant && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                        <span className="font-extrabold uppercase tracking-wider">Applicant</span>
                                        <span className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{applicant}</span>
                                    </div>
                                )}
                                {projectNo && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                        <span className="font-extrabold uppercase tracking-wider">Project</span>
                                        <span className="font-mono font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{projectNo}</span>
                                    </div>
                                )}
                                {createdDate && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                        <span className="font-extrabold uppercase tracking-wider">Created</span>
                                        <span className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{createdDate}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: amount + status */}
                        <div className="flex flex-row sm:flex-col items-start sm:items-end gap-3 flex-shrink-0">
                            {estimatedAmount != null && (
                                <div className="rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 px-4 py-3 text-right">
                                    <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-orange-500 dark:text-orange-400 mb-0.5">Est. Amount</p>
                                    <p className="text-[20px] font-extrabold text-[#D97757] tracking-tight leading-none">
                                        ₹{Number(estimatedAmount).toLocaleString('en-IN')}
                                    </p>
                                </div>
                            )}
                            <span className={cn(
                                "inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                                workflowState === "Completed" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40",
                                workflowState === "Draft" && "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
                                workflowState?.toLowerCase().includes("pending") && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40",
                                workflowState?.toLowerCase().includes("approved") && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40",
                                workflowState?.toLowerCase().includes("reject") && "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
                                !["Completed","Draft"].includes(workflowState) && !workflowState?.toLowerCase().includes("pending") && !workflowState?.toLowerCase().includes("approved") && !workflowState?.toLowerCase().includes("reject") && "bg-orange-50 text-[#D97757] border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30",
                            )}>
                                {workflowState}
                            </span>
                        </div>
                    </div>

                    {/* Workflow stepper */}
                    <div className="mt-5 pt-4 border-t border-[#F4F4F5] dark:border-[#3F3F46]">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#A1A1AA] dark:text-zinc-500 mb-3">Workflow Progress</p>
                        <DPWorkflowStepper currentState={workflowState} />
                    </div>
                </div>
            </div>

            {/* ── Tab navigation ── */}
            <div className="flex gap-1 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] p-1">
                {DP_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition-all duration-150",
                            activeTab === tab.id
                                ? DP_TAB_ACTIVE[tab.id]
                                : "border border-transparent text-[#71717A] hover:bg-white dark:hover:bg-zinc-800 hover:text-[#3F3F46] dark:text-[#A1A1AA] dark:hover:text-[#E4E4E7]",
                        )}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    </button>
                ))}
            </div>

            {/* ── Tab content ── */}
            <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden">
                {/* Tab header strip */}
                <div className={cn(
                    "px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center gap-2",
                    activeTab === 'details' && "bg-blue-50/60 dark:bg-blue-950/10",
                    activeTab === 'p11' && "bg-indigo-50/60 dark:bg-indigo-950/10",
                    activeTab === 'sanction' && "bg-emerald-50/60 dark:bg-emerald-950/10",
                    activeTab === 'po' && "bg-orange-50/60 dark:bg-orange-950/10",
                )}>
                    {DP_TABS.find(t => t.id === activeTab)?.icon}
                    <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#3F3F46] dark:text-[#E4E4E7]">
                        {DP_TABS.find(t => t.id === activeTab)?.label}
                    </span>
                </div>

                <div className="p-5 md:p-6">
                    {activeTab === 'details' && <DPDocumentViewer data={data} doctype="Direct Purchase" />}
                    {activeTab === 'p11' && (
                        <DPLinkedDocTab
                            doctype="P_11 Form" filterField="app_id" filterValue={docName}
                            emptyTitle="No P-11 Form Generated Yet"
                            emptyDescription="The P-11 Form is generated after the Direct Purchase is approved."
                            emptyIcon={<ClipboardListIcon className="h-5 w-5" />}
                        />
                    )}
                    {activeTab === 'sanction' && (
                        <DPLinkedDocTab
                            doctype="sanction_sheet" filterField="app_id" filterValue={docName}
                            emptyTitle="No Sanction Sheet Generated Yet"
                            emptyDescription="The Sanction Sheet is created by RnD Staff after the P-11 Form is verified."
                            emptyIcon={<FileTextIcon className="h-5 w-5" />}
                        />
                    )}
                    {activeTab === 'po' && (
                        isLoadingPOData ? <Spinner /> :
                        data?.workflow_state === "Sanction Sheet Generated" ? (
                            <EmptyState
                                icon={<ShoppingCartIcon className="h-5 w-5" />}
                                title="Purchase Order Locked"
                                description={`The Purchase Order is locked. The Sanction Sheet has not been printed yet${applicant ? ` by ${applicant}` : ""}. Once the PI prints the Sanction Sheet, this form will move to "Sanction Sheet Printed" and the Purchase Order will be enabled.`}
                            />
                        ) :
                        poSanctionData && (isStaffRnD || data?.workflow_state === "POGenerated" || data?.workflow_state === "Sanction Sheet Printed") ? (
                            <POEditor ssData={poSanctionData} dpId={docName} isStaffRnD={isStaffRnD} isPIReadOnly={isPermanentEmployee && !isStaffRnD} />
                        ) : poSanctionData ? (
                            <EmptyState
                                icon={<ShoppingCartIcon className="h-5 w-5" />}
                                title="Purchase Order Not Yet Generated"
                                description="The Purchase Order has not been generated by staff yet. Please check back later."
                            />
                        ) : (
                            <EmptyState
                                icon={<ShoppingCartIcon className="h-5 w-5" />}
                                title="No Sanction Sheet Available"
                                description="The Purchase Order is generated once the Sanction Sheet is approved."
                            />
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

// ── GenericDocViewer ──────────────────────────────────────────────────────────
const GenericDocViewer = ({ data, doctype }: { data: Record<string, any>; doctype?: string }) => {
    const navigate = useNavigate();
    const EXCLUDED = ['doctype', 'docstatus', 'idx', 'owner', 'creation', 'modified', 'modified_by', '_user_tags', '_comments', '_assign', '_liked_by', '_seen'];
    const simpleFields = Object.entries(data).filter(([key, value]) => {
        if (EXCLUDED.includes(key) || key.startsWith('_')) return false;
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) return false;
        return value !== null && value !== undefined && value !== '';
    });
    const tableFields = Object.entries(data).filter(([key, value]) => Array.isArray(value) && !key.startsWith('_'));
    const budgetYearCols = ['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget'];
    const fmt = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return (
        <div className="space-y-6">
            {simpleFields.length > 0 && (
                <div>
                    <SectionHeading icon={<LayoutGridIcon />} title="Information" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {simpleFields.map(([key, value]) => (
                            <div key={key} className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]">
                                    <span className="truncate">{fmt(key)}</span>
                                </div>
                                {isFilePath(String(value)) ? (
                                    <a href={String(value)} target="_blank" rel="noreferrer"
                                        className="text-[13px] font-semibold text-[#D97757] underline break-words">{getFileName(String(value))}</a>
                                ) : doctype === "Cancellation Request" && key === "reference_name" && data?.reference_doctype ? (
                                    <button
                                        onClick={() => {
                                            const route = getOriginalApplicationRoute(
                                                data.reference_doctype,
                                                String(value),
                                            );
                                            if (route) navigate(route);
                                        }}
                                        className="text-left text-[13px] font-semibold text-[#D97757] hover:underline hover:text-[#c66a4e] transition-colors inline-flex items-center gap-1 break-words"
                                    >
                                        {String(value)}
                                        <ExternalLinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                    </button>
                                ) : (
                                    <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">
                                        {(doctype === "Cancellation Request" && key === "status" && value === "Approved") ? "Cancelled" : String(value)}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {tableFields.map(([key, value]) => {
                const rows = value as any[];
                if (!rows.length) return null;
                const isBudget = key.toLowerCase().includes('budget') || key.toLowerCase().includes('breakup');
                const headers = Object.keys(rows[0]).filter(k =>
                    !k.startsWith('_') && !['name', 'owner', 'creation', 'modified', 'modified_by', 'docstatus', 'idx', 'parent', 'parentfield', 'parenttype', 'doctype'].includes(k)
                );
                const colTotals: Record<string, number> = {};
                if (isBudget) budgetYearCols.forEach(c => { colTotals[c] = rows.reduce((s, r) => s + (parseFloat(r[c]) || 0), 0); });
                const grandTotal = Object.values(colTotals).reduce((s, v) => s + v, 0);
                return (
                    <div key={key}>
                        <SectionHeading icon={<FileTextIcon />} title={fmt(key)} />
                        <div className="overflow-hidden rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                            <table className="w-full table-fixed text-[11px]">
                                <thead>
                                    <tr className="border-b border-[#E4E4E7] bg-[#EEF2FF] dark:border-[#3F3F46] dark:bg-[#1E3A8A]/20">
                                        {headers.map(h => (
                                            <th key={h} className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] break-words">{fmt(h)}</th>
                                        ))}
                                        {isBudget && <th className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#D97757]">Row Total</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => {
                                        const rowTotal = isBudget ? budgetYearCols.reduce((s, c) => s + (parseFloat(row[c]) || 0), 0) : 0;
                                        return (
                                            <tr key={i} className={cn(
                                                "border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors",
                                                i % 2 === 1 && "bg-[#FAFAF9]/60 dark:bg-zinc-800/20",
                                            )}>
                                                {headers.map(h => (
                                                    <td key={h} className="px-2.5 py-2 align-top text-[#3F3F46] dark:text-[#E4E4E7] break-words whitespace-normal">
                                                        {budgetYearCols.includes(h)
                                                            ? (parseFloat(row[h]) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
                                                            : String(row[h] ?? '—')}
                                                    </td>
                                                ))}
                                                {isBudget && (
                                                    <td className="px-2.5 py-2 font-semibold text-[#D97757]">
                                                        {rowTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {isBudget && (
                                        <tr className="border-t-2 border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800/60 font-semibold">
                                            {headers.map(h => (
                                                <td key={h} className="px-2.5 py-2 text-[#3F3F46] dark:text-[#E4E4E7] break-words">
                                                    {h === 'account_head' ? 'Total' : colTotals[h] != null
                                                        ? colTotals[h].toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
                                                        : ''}
                                                </td>
                                            ))}
                                            <td className="px-2.5 py-2 font-bold text-white bg-[#D97757]">
                                                {grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ── RegistryPanel ─────────────────────────────────────────────────────────────
const RegistryPanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div className="px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
            <h3 className="text-[13px] font-extrabold tracking-wide text-[#3F3F46] dark:text-[#E4E4E7] uppercase">{title}</h3>
        </div>
        <div className="p-5 md:p-6">{children}</div>
    </div>
);

// ── FundSanctionView ──────────────────────────────────────────────────────────
const FundSanctionView = ({ data, docname, canEdit, onRefresh }: {
    data: Record<string, any>;
    docname: string;
    canEdit: boolean;
    onRefresh: () => void;
}) => {
    type FsFileRow = {
        _key: string;
        description: string;
        sanction_file: string;
        filename?: string;
        content?: string;
        is_new: boolean;
    };
    type BudgetRow = {
        account_head: string;
        first_year_budget: number;
        second_year_budget: number;
        third_year_budget: number;
        fourth_year_budget: number;
        fifth_year_budget: number;
    };
    const [fsFiles, setFsFiles] = useState<FsFileRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [editBudgetRows, setEditBudgetRows] = useState<BudgetRow[]>([]);
    const [isSavingBudget, setIsSavingBudget] = useState(false);
    const [budgetMsg, setBudgetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [budgetHeadList, setBudgetHeadList] = useState<string[]>([]);

    useEffect(() => {
        fetch('/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0')
            .then(r => r.json())
            .then(j => { if (j?.data) setBudgetHeadList(j.data.map((x: any) => x.budget_head).filter(Boolean)); })
            .catch(() => {});
    }, []);

    const startEditBudget = () => {
        setEditBudgetRows(
            (data.sanctioned_budget_breakup ?? []).map((r: any) => ({
                account_head: r.account_head ?? '',
                first_year_budget: parseFloat(r.first_year_budget) || 0,
                second_year_budget: parseFloat(r.second_year_budget) || 0,
                third_year_budget: parseFloat(r.third_year_budget) || 0,
                fourth_year_budget: parseFloat(r.fourth_year_budget) || 0,
                fifth_year_budget: parseFloat(r.fifth_year_budget) || 0,
            }))
        );
        setIsEditingBudget(true);
        setBudgetMsg(null);
    };

    const cancelEditBudget = () => {
        setIsEditingBudget(false);
        setEditBudgetRows([]);
        setBudgetMsg(null);
    };

    const saveBudget = async () => {
        setIsSavingBudget(true);
        setBudgetMsg(null);
        try {
            const res = await fetch(
                '/api/method/rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.update_sanctioned_budget_breakup',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Frappe-CSRF-Token': (window as any).csrf_token || '',
                    },
                    body: JSON.stringify({ docname, rows: editBudgetRows }),
                },
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.exception || `HTTP ${res.status}`);
            onRefresh();
            setIsEditingBudget(false);
            setEditBudgetRows([]);
            setBudgetMsg({ type: 'success', text: 'Budget breakup updated.' });
        } catch (e: any) {
            setBudgetMsg({ type: 'error', text: e?.message || 'Failed to save.' });
        } finally {
            setIsSavingBudget(false);
        }
    };

    useEffect(() => {
        const rows: any[] = data?.sanction_related_files || [];
        setFsFiles(rows.map((r: any, i: number) => ({
            _key: `existing-${i}-${r.sanction_file || i}`,
            description: r.description || '',
            sanction_file: r.sanction_file || '',
            is_new: false,
        })));
    }, [data?.sanction_related_files]);

    const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            setMsg({ type: 'error', text: `"${file.name}" exceeds the 10 MB limit.` });
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
            setFsFiles(prev => [...prev, {
                _key: `new-${Date.now()}-${file.name}`,
                description: '',
                sanction_file: '',
                filename: file.name,
                content: base64,
                is_new: true,
            }]);
            setMsg(null);
        };
        reader.onerror = () => setMsg({ type: 'error', text: 'Failed to read file.' });
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMsg(null);
        try {
            const existingFiles = fsFiles.filter(f => !f.is_new).map(f => ({ sanction_file: f.sanction_file, description: f.description }));
            const newFiles = fsFiles.filter(f => f.is_new).map(f => ({
                filename: f.filename || 'file',
                content: f.content || '',
                description: f.description,
                is_private: 1,
                fieldname: '',
            }));
            const res = await fetch(
                '/api/method/rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.update_fund_sanction_files',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Frappe-CSRF-Token': (window as any).csrf_token || '',
                    },
                    body: JSON.stringify({
                        docname,
                        files: newFiles,
                        existing_files: existingFiles,
                        project_reg: data?.project_proposal || undefined,
                        replace: true,
                    }),
                },
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json?.message?.status === 'error') {
                throw new Error(json?.message?.message || json?.exception || `HTTP ${res.status}`);
            }
            onRefresh();
            const total = json?.message?.total_file_rows ?? fsFiles.length;
            setMsg({ type: 'success', text: `Saved. ${total} file${total !== 1 ? 's' : ''} on record.` });
        } catch (e: any) {
            setMsg({ type: 'error', text: e?.message || 'Failed to save files.' });
        } finally {
            setIsSaving(false);
        }
    };

    const years = ['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget'];

    return (
        <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    { label: 'Total Sanctioned', value: data.total_sanctioned_amount != null ? Number(data.total_sanctioned_amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) : '—' },
                    { label: 'Letter No', value: data.sanctioned_letter_no || '—' },
                    { label: 'Letter Date', value: data.sanctioned_letter_date || '—' },
                ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-4 py-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#A1A1AA] mb-1">{label}</p>
                        <p className={label === 'Total Sanctioned' ? 'text-xl font-bold text-[#D97757]' : 'text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]'}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Sanction details */}
            <RegistryPanel title="Sanction Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {[
                        { label: 'Project', value: data.project_proposal || data.refnum_prj_num },
                        { label: 'Project Title', value: data.project_title },
                        { label: 'Funding Agency', value: data.funding_agency },
                        { label: 'Sanction Order No', value: data.sanction_order_no || data.sanctioned_letter_no },
                        { label: 'Date of Sanction', value: data.date_of_sanction || data.sanctioned_letter_date },
                        { label: 'Duration (Months)', value: data.duration_of_project },
                        { label: 'Start Date', value: data.start_date },
                        { label: 'End Date', value: data.end_date },
                        { label: 'Principal Investigator', value: data.principal_investigator || data.pi_name },
                        { label: 'Department', value: data.department },
                        { label: 'Remarks', value: data.remarks },
                    ].filter(f => f.value != null && f.value !== '').map(({ label, value }) => (
                        <div key={label} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-3.5 py-3">
                            <div className="inline-flex w-fit items-center rounded-md bg-white dark:bg-[#27272A] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] dark:text-blue-300 ring-1 ring-[#E4E4E7] dark:ring-[#3F3F46]">
                                {label}
                            </div>
                            <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-snug">{String(value)}</p>
                        </div>
                    ))}
                </div>
            </RegistryPanel>

            {/* Budget breakup */}
            {(data.sanctioned_budget_breakup?.length > 0 || canEdit) && (
                <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                        <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-[#3F3F46] dark:text-[#E4E4E7]">Sanctioned Budget Breakup</h3>
                        {canEdit && !isEditingBudget && (
                            <button
                                type="button"
                                onClick={startEditBudget}
                                className="inline-flex items-center gap-1.5 h-7 px-3 text-[11px] font-bold uppercase tracking-wide rounded-lg bg-[#D97757]/10 hover:bg-[#D97757]/20 text-[#D97757] border border-[#D97757]/30 transition-colors"
                            >
                                <PaperclipIcon className="h-3 w-3" />
                                Edit
                            </button>
                        )}
                        {canEdit && isEditingBudget && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={cancelEditBudget}
                                    disabled={isSavingBudget}
                                    className="inline-flex items-center gap-1 h-7 px-3 text-[11px] font-bold uppercase tracking-wide rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                                >
                                    <XIcon className="h-3 w-3" />
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveBudget}
                                    disabled={isSavingBudget}
                                    className="inline-flex items-center gap-1 h-7 px-3 text-[11px] font-bold uppercase tracking-wide rounded-lg bg-[#D97757] hover:bg-[#c5684a] text-white disabled:opacity-50 transition-colors"
                                >
                                    {isSavingBudget ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="p-4 space-y-3">
                        {budgetMsg && (
                            <div className={cn(
                                'px-3 py-2 rounded-lg text-[12px] font-medium',
                                budgetMsg.type === 'success'
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
                            )}>
                                {budgetMsg.text}
                            </div>
                        )}
                        {isEditingBudget ? (
                            <div className="space-y-3">
                                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                                        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Budget Head</th>
                                                {[{ key: 'first_year_budget', label: 'Year 1' }, { key: 'second_year_budget', label: 'Year 2' }, { key: 'third_year_budget', label: 'Year 3' }, { key: 'fourth_year_budget', label: 'Year 4' }, { key: 'fifth_year_budget', label: 'Year 5' }].map(y => (
                                                    <th key={y.key} className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">{y.label}</th>
                                                ))}
                                                <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Total</th>
                                                <th className="px-3 py-2 w-8" />
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                                            {editBudgetRows.map((row, idx) => {
                                                const yearKeys = ['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget'] as const;
                                                const rowTotal = yearKeys.reduce((s, k) => s + (row[k] || 0), 0);
                                                return (
                                                    <tr key={idx}>
                                                        <td className="px-2 py-1.5">
                                                            <select
                                                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-1 text-xs"
                                                                value={row.account_head}
                                                                onChange={e => {
                                                                    const updated = [...editBudgetRows];
                                                                    updated[idx] = { ...updated[idx], account_head: e.target.value };
                                                                    setEditBudgetRows(updated);
                                                                }}
                                                            >
                                                                <option value="">— Select —</option>
                                                                {budgetHeadList.map(bh => <option key={bh} value={bh}>{bh}</option>)}
                                                            </select>
                                                        </td>
                                                        {yearKeys.map(k => (
                                                            <td key={k} className="px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    className="w-24 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-1 text-xs text-right"
                                                                    value={row[k] || ''}
                                                                    onChange={e => {
                                                                        const updated = [...editBudgetRows];
                                                                        updated[idx] = { ...updated[idx], [k]: Number(e.target.value) };
                                                                        setEditBudgetRows(updated);
                                                                    }}
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="px-2 py-1.5 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                                            {rowTotal.toLocaleString('en-IN')}
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            <button
                                                                type="button"
                                                                className="text-zinc-400 hover:text-red-500"
                                                                onClick={() => setEditBudgetRows(editBudgetRows.filter((_, i) => i !== idx))}
                                                            >
                                                                <XIcon className="h-3.5 w-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-zinc-100 dark:bg-zinc-800">
                                            <tr>
                                                <td className="px-3 py-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">Total</td>
                                                {(['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget'] as const).map(k => (
                                                    <td key={k} className="px-3 py-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 text-right">
                                                        {editBudgetRows.reduce((s, r) => s + (r[k] || 0), 0).toLocaleString('en-IN')}
                                                    </td>
                                                ))}
                                                <td className="px-3 py-2 text-xs font-bold text-[#D97757] text-right">
                                                    ₹ {editBudgetRows.reduce((s, r) => s + r.first_year_budget + r.second_year_budget + r.third_year_budget + r.fourth_year_budget + r.fifth_year_budget, 0).toLocaleString('en-IN')}
                                                </td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditBudgetRows([...editBudgetRows, { account_head: '', first_year_budget: 0, second_year_budget: 0, third_year_budget: 0, fourth_year_budget: 0, fifth_year_budget: 0 }])}
                                    className="inline-flex items-center gap-1 h-7 px-3 text-[11px] font-bold uppercase tracking-wide rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    + Add Row
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full table-fixed text-[11px]">
                                    <thead>
                                        <tr className="border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                            <th className="px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#1E3A8A] dark:text-[#C7D2FE]">Account Head</th>
                                            {['Yr 1', 'Yr 2', 'Yr 3', 'Yr 4', 'Yr 5', 'Total'].map(h => (
                                                <th key={h} className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-[#1E3A8A] dark:text-[#C7D2FE]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.sanctioned_budget_breakup.map((row: any, i: number) => {
                                            const rowTotal = years.reduce((s, k) => s + (parseFloat(row[k]) || 0), 0);
                                            return (
                                                <tr key={i} className="border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                                                    <td className="px-3 py-2 font-mono text-xs text-zinc-800 dark:text-zinc-100">{row.account_head}</td>
                                                    {years.map(k => (
                                                        <td key={k} className="px-3 py-2 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                                                            {parseFloat(row[k]) ? Number(row[k]).toLocaleString('en-IN') : '—'}
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2 text-right tabular-nums font-bold text-zinc-900 dark:text-zinc-100">
                                                        {rowTotal ? rowTotal.toLocaleString('en-IN') : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="border-t-2 border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                                        <tr>
                                            <td className="px-3 py-2.5 text-[10px] font-bold uppercase text-zinc-700 dark:text-zinc-300">Total</td>
                                            {years.map(k => {
                                                const t = data.sanctioned_budget_breakup.reduce((s: number, r: any) => s + (parseFloat(r[k]) || 0), 0);
                                                return <td key={k} className="px-3 py-2.5 text-right tabular-nums font-bold text-zinc-800 dark:text-zinc-100">{t ? t.toLocaleString('en-IN') : '—'}</td>;
                                            })}
                                            <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[#D97757]">
                                                ₹ {years.reduce((grand, k) => grand + data.sanctioned_budget_breakup.reduce((s: number, r: any) => s + (parseFloat(r[k]) || 0), 0), 0).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sanction letter attachment */}
            {data.sanction_letter && (
                <RegistryPanel title="Sanction Letter">
                    <a href={data.sanction_letter} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800 text-[#D97757] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm font-medium">
                        <PaperclipIcon className="h-4 w-4" />
                        {getFileName(data.sanction_letter)}
                    </a>
                </RegistryPanel>
            )}

            {/* Sanction files — editable for staff, RnD; read-only for others */}
            <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                    <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-[#3F3F46] dark:text-[#E4E4E7]">Sanction Files</h3>
                    {canEdit && (
                        <>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 h-7 px-3 text-[11px] font-bold uppercase tracking-wide rounded-lg bg-[#D97757]/10 hover:bg-[#D97757]/20 text-[#D97757] border border-[#D97757]/30 transition-colors"
                            >
                                <PaperclipIcon className="h-3 w-3" />
                                Add File
                            </button>
                            <input ref={fileInputRef} type="file" className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                onChange={handleFileAdd} />
                        </>
                    )}
                </div>
                <div className="p-5 space-y-3">
                    {msg && (
                        <div className={cn(
                            'px-3 py-2 rounded-lg text-[12px] font-medium',
                            msg.type === 'success'
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
                        )}>
                            {msg.text}
                        </div>
                    )}
                    {fsFiles.length === 0 ? (
                        <p className="text-[12px] text-[#A1A1AA] py-2">
                            {canEdit ? 'No files attached. Click "Add File" to upload.' : 'No sanction files attached.'}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {fsFiles.map((row, idx) => (
                                <div key={row._key} className="flex items-start gap-2 p-3 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                                    <PaperclipIcon className="h-4 w-4 text-[#D97757] mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0 space-y-1">
                                        {row.is_new ? (
                                            <p className="text-[12px] font-mono text-zinc-600 dark:text-zinc-300 truncate">{row.filename}</p>
                                        ) : (
                                            <a href={getFileUrl(row.sanction_file)} target="_blank" rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#D97757] hover:underline truncate">
                                                {getFileName(row.sanction_file)}
                                            </a>
                                        )}
                                        {canEdit ? (
                                            <input
                                                type="text"
                                                placeholder="Description (optional)"
                                                value={row.description}
                                                onChange={e => setFsFiles(prev => prev.map((f, i) => i === idx ? { ...f, description: e.target.value } : f))}
                                                className="w-full h-7 px-2 text-[12px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#D97757]/30 focus:border-[#D97757]"
                                            />
                                        ) : row.description ? (
                                            <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">{row.description}</p>
                                        ) : null}
                                    </div>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => setFsFiles(prev => prev.filter((_, i) => i !== idx))}
                                            className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                                            title="Remove"
                                        >
                                            <span className="text-[14px] leading-none">×</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {canEdit && (
                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="h-8 px-5 bg-[#D97757] hover:bg-[#c5684a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[11px] uppercase tracking-wide rounded-lg transition-colors"
                            >
                                {isSaving ? 'Saving…' : 'Save Files'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const TaskRegistryDetails: React.FC = () => {
    const { doctype: rawDoctype, name } = useParams<{ doctype: string; name: string }>();
    const navigate = useNavigate();
    const doctype = rawDoctype ? decodeURIComponent(rawDoctype) : '';

    const { data, isLoading, error, mutate } = useFrappeGetDoc(doctype || '', name || '');
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const canEditFsFiles = roles.some(r => ["staff, RnD", "Staff RnD", "RnD Staff", "System Manager"].includes(r));
    const isStaffRnD = roles.some(r => ["staff, RnD", "Staff RnD", "RnD Staff", "System Manager"].includes(r));

    const [travelFields, setTravelFields] = useState<FormField[]>([]);
    const [travelLinkOptions, setTravelLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isTravelLoading, setIsTravelLoading] = useState(false);

    const [advFields, setAdvFields] = useState<FormField[]>([]);
    const [advLinkOptions, setAdvLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isAdvLoading, setIsAdvLoading] = useState(false);

    const [taFields, setTaFields] = useState<FormField[]>([]);
    const [taLinkOptions, setTaLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isTaLoading, setIsTaLoading] = useState(false);

    const [tadaFields, setTadaFields] = useState<FormField[]>([]);
    const [tadaLinkOptions, setTadaLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isTadaLoading, setIsTadaLoading] = useState(false);

    const [recFields, setRecFields] = useState<FormField[]>([]);
    const [recLinkOptions, setRecLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isRecLoading, setIsRecLoading] = useState(false);

    const [scrFields, setScrFields] = useState<FormField[]>([]);
    const [scrLinkOptions, setScrLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isScrLoading, setIsScrLoading] = useState(false);

    const [dohFields, setDohFields] = useState<FormField[]>([]);
    const [dohLinkOptions, setDohLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isDohLoading, setIsDohLoading] = useState(false);

    const [resolvedAccountHead, setResolvedAccountHead] = useState<string>("");
    const [resolvedProjectTitle, setResolvedProjectTitle] = useState<string>("");
    const [resolvedApplicantName, setResolvedApplicantName] = useState<string>("");

    const [prPreviewName, setPrPreviewName] = useState<string | null>(null);
    const [prPreviewLoading, setPrPreviewLoading] = useState(false);

    const [displayData, setDisplayData] = useState<Record<string, any>>({});

    useEffect(() => {
        if (data) {
            setDisplayData(data);
        }
    }, [data]);

    const resolveLinkFields = async (
        fields: FormField[],
        currentData: Record<string, any>,
    ) => {
        const fieldsToResolve = fields.filter(
            (f) =>
                (f.fieldname === "applicant_department" ||
                    f.fieldname === "applicant_category" ||
                    f.fieldname.includes("department") ||
                    f.fieldname.includes("category")) &&
                f.fieldtype === "Link" &&
                f.options &&
                currentData[f.fieldname],
        );

        if (fieldsToResolve.length === 0) return;

        const updates: Record<string, any> = {};

        await Promise.all(
            fieldsToResolve.map(async (field) => {
                const value = currentData[field.fieldname];
                if (!value) return;

                try {
                    const res = await fetch(`/api/v2/document/${encodeURIComponent(field.options ?? '')}/${encodeURIComponent(String(value))}`, {
                        credentials: "include",
                        headers: { Accept: "application/json" },
                    });
                    if (!res.ok) return;
                    const json = await res.json();
                    if (json?.data) {
                        const doc = json.data;
                        let readable = value;
                        if (doc.title) readable = doc.title;
                        else if (doc.dept_name) readable = doc.dept_name;
                        else if (doc.department_name) readable = doc.department_name;
                        else if (doc.employee_category_name)
                            readable = doc.employee_category_name;
                        else if (doc.employee_category)
                            readable = doc.employee_category;
                        else if (doc.category_name)
                            readable = doc.category_name;
                        else if (doc.designation_name)
                            readable = doc.designation_name;
                        else if (doc.name && doc.name !== value)
                            readable = doc.name;

                        if (
                            (field.options === "Department" || field.options === "Department_prornd") &&
                            (doc.dept_name || doc.department_name)
                        )
                            readable = doc.dept_name || doc.department_name;
                        if (
                            field.options === "Employee Category" &&
                            (doc.employee_category || doc.employee_category_name)
                        )
                            readable = doc.employee_category || doc.employee_category_name;

                        if (readable === value) {
                            const potential = Object.values(doc).find(
                                (v) =>
                                    typeof v === "string" &&
                                    v !== value &&
                                    (v as string).length > 2 &&
                                    (v as string).length < 50,
                            );
                            if (potential) readable = potential as string;
                        }

                        updates[field.fieldname] = readable;
                    }
                } catch (e) {
                    console.warn(
                        `Failed to resolve link for ${field.fieldname}`,
                        e,
                    );
                }
            }),
        );

        if (Object.keys(updates).length > 0) {
            setDisplayData((prev) => ({ ...prev, ...updates }));
        }
    };

    useEffect(() => {
        if (data) {
            let activeFields: FormField[] = [];
            if (doctype === 'Travel') activeFields = travelFields;
            else if (doctype === 'Advance Settlement') activeFields = advFields;
            else if (doctype === 'Temporary Advance') activeFields = taFields;
            else if (doctype === 'TA DA Settlement') activeFields = tadaFields;
            else if (doctype === 'Recruitment Adhoc Contractual') activeFields = recFields;
            else if (doctype === 'Selection Committee Report') activeFields = scrFields;
            else if (doctype === 'Disbursal of Honorarium') activeFields = dohFields;

            if (activeFields.length > 0) {
                resolveLinkFields(activeFields, data);
            }
        }
    }, [data, doctype, travelFields, advFields, taFields, tadaFields, recFields, scrFields, dohFields]);

    useEffect(() => {
        if (doctype === "Temporary Advance" && data) {
            // Account Head
            if (data.account_head) {
                fetch(`/api/v2/document/Budget%20Head/${data.account_head}`)
                    .then(r => r.json())
                    .then(res => {
                        if (res.data) setResolvedAccountHead(res.data.budget_head || res.data.name);
                    })
                    .catch(err => console.error("Failed to resolve budget head", err));
            }

            // Department — resolve raw ID to human-readable name for print
            const deptId = data.applicant_department;
            if (deptId) {
                fetch(`/api/v2/document/Department_prornd/${encodeURIComponent(deptId)}`, { credentials: "include" })
                    .then(r => r.json())
                    .then(res => {
                        const name = res.data?.dept_name;
                        if (name) setDisplayData(prev => ({ ...prev, applicant_department: name }));
                    })
                    .catch(() => {});
            }

            // Applicant full name — applicant_name may store email; resolve from User
            const email = data.applicant_webmail || data.owner || "";
            if (email) {
                fetch(`/api/method/frappe.client.get_value?doctype=User&filters=${encodeURIComponent(email)}&fieldname=full_name`, { credentials: "include" })
                    .then(r => r.json())
                    .then(res => {
                        const fullName = res.message?.full_name;
                        if (fullName) setResolvedApplicantName(fullName);
                    })
                    .catch(() => {});
            }

            // Project Title — project_code/project_no is the project number, NOT the Frappe doc name.
            // Must search by project_no filter, not fetch by document name.
            const projectRef = data.project_code || data.project_no;
            if (projectRef) {
                const resolveProjectTitle = async () => {
                    // 1. Check loaded link options for a label that differs from the raw ID
                    const opts = taLinkOptions[data.project_code ? 'project_code' : 'project_no']
                        || taLinkOptions['Project Registration']
                        || taLinkOptions['Project Proposal'] || [];
                    const fromOpts = (opts as any[]).find((o) => o.value === projectRef);
                    if (fromOpts?.label && fromOpts.label !== projectRef) {
                        setResolvedProjectTitle(fromOpts.label);
                        setDisplayData(prev => ({ ...prev, project_name: fromOpts.label }));
                        return;
                    }
                    // 2. Search Project Registration by project_no using POST (GET with encoded filters is unreliable)
                    try {
                        const postOpts = { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include" as RequestCredentials };
                        let res = await fetch("/api/method/frappe.client.get_list", { ...postOpts, body: JSON.stringify({ doctype: "Project Registration", filters: { project_no: projectRef }, fields: ["project_title"], limit_page_length: 1 }) });
                        let json = await res.json();
                        let title = json?.message?.[0]?.project_title || "";
                        // 3. Fall back to Project Proposal
                        if (!title) {
                            res = await fetch("/api/method/frappe.client.get_list", { ...postOpts, body: JSON.stringify({ doctype: "Project Proposal", filters: { project_no: projectRef }, fields: ["project_title"], limit_page_length: 1 }) });
                            json = await res.json();
                            title = json?.message?.[0]?.project_title || "";
                        }
                        if (title) {
                            setResolvedProjectTitle(title);
                            setDisplayData(prev => ({ ...prev, project_name: title }));
                        } else if (data.project_name) {
                            setResolvedProjectTitle(data.project_name);
                        }
                    } catch (err) {
                        console.error("Failed to resolve project", err);
                        if (data.project_name) setResolvedProjectTitle(data.project_name);
                    }
                };
                resolveProjectTitle();
            }
        }
    }, [data, doctype, taLinkOptions]);

    const handlePrintTemporaryAdvance = () => {
        if (!data) return;
        const html = generateTemporaryAdvanceHtml(displayData, resolvedProjectTitle, resolvedAccountHead, resolvedApplicantName);
        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    const { call: fetchTravelFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any } }>(travelAPI.getFields);
    const { call: fetchAdvFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_meta?: any } }>(advanceSettlementAPI.getFields);
    const { call: fetchTaFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any } }>(temporaryAdvanceAPI.getFields);
    const { call: fetchTadaFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_meta?: any } }>(tadaAPI.getFields);
    const { call: fetchRecFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_meta?: any } }>(recruitmentAdhocContractualAPI.getFields);
    const { call: fetchScrFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_meta?: any } }>(selectionCommitteeReportAPI.getFields);
    const { call: fetchDohFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_fields?: any } }>(disbursalOfHonorariumAPI.getFields);

    useEffect(() => {
        if (doctype === 'Disbursal of Consultancy' && name) navigate(`/disbursal-of-consultancy/${name}`, { replace: true });
        if (doctype === 'Travel' && name) navigate(`/travel/${name}`, { replace: true });
    }, [doctype, name]);

    useEffect(() => {
        if (doctype === 'Travel' && name) {
            setIsTravelLoading(true);
            fetchTravelFields({ doc_name: name }).then(res => {
                if (res?.message) { setTravelFields(res.message.fields || []); setTravelLinkOptions(res.message.link_options || {}); }
            }).finally(() => setIsTravelLoading(false));
        }
    }, [doctype, name]);

    useEffect(() => {
        if (doctype === 'Advance Settlement' && name) {
            setIsAdvLoading(true);
            fetchAdvFields({ doc_name: name }).then(res => {
                if (res?.message) { setAdvFields(res.message.fields || []); setAdvLinkOptions(res.message.link_options || {}); }
            }).finally(() => setIsAdvLoading(false));
        }
    }, [doctype, name]);

    useEffect(() => {
        if (doctype === 'Temporary Advance' && name) {
            setIsTaLoading(true);
            fetchTaFields({ doc_name: name }).then(res => {
                if (res?.message) { setTaFields(res.message.fields || []); setTaLinkOptions(res.message.link_options || {}); }
            }).finally(() => setIsTaLoading(false));
        }
    }, [doctype, name]);

    useEffect(() => {
        if (doctype === 'TA DA Settlement' && name) {
            setIsTadaLoading(true);
            fetchTadaFields({ doc_name: name }).then(res => {
                if (res?.message) { setTadaFields(res.message.fields || []); setTadaLinkOptions(res.message.link_options || {}); }
            }).finally(() => setIsTadaLoading(false));
        }
    }, [doctype, name]);

    useEffect(() => {
        if (doctype === 'Recruitment Adhoc Contractual' && name) {
            setIsRecLoading(true);
            fetchRecFields({ doc_name: name }).then(res => {
                if (res?.message) { setRecFields(res.message.fields || []); setRecLinkOptions(res.message.link_options || {}); }
            }).finally(() => setIsRecLoading(false));
        }
    }, [doctype, name]);

    useEffect(() => {
        if (doctype === 'Selection Committee Report' && name) {
            setIsScrLoading(true);
            fetchScrFields({ doc_name: name }).then(res => {
                if (res?.message) { setScrFields(res.message.fields || []); setScrLinkOptions(res.message.link_options || {}); }
            }).finally(() => setIsScrLoading(false));
        }
    }, [doctype, name]);

    useEffect(() => {
        if (doctype === 'Disbursal of Honorarium' && name) {
            setIsDohLoading(true);

            const postList = (doctype: string, fields: string[]) =>
                fetch('/api/method/frappe.client.get_list', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': (window as any).csrf_token || '' },
                    body: JSON.stringify({ doctype, fields, limit_page_length: 0 }),
                }).then(r => r.json()).catch(() => null);

            Promise.all([
                fetchDohFields({ doc_name: name }),
                postList('Budget Head', ['name', 'budget_head']),
                postList('Department_prornd', ['name', 'dept_name']),
            ]).then(([fieldsRes, bhRes, deptRes]) => {
                if (fieldsRes?.message) {
                    const { fields: apiFields, link_options, child_table_fields } = fieldsRes.message;
                    const enhanced = (apiFields || []).map((f: FormField) => {
                        if (f.fieldtype === 'Table' && child_table_fields?.[f.fieldname]) {
                            return { ...f, child_fields: child_table_fields[f.fieldname] };
                        }
                        return f;
                    });
                    setDohFields(enhanced);

                    const merged: Record<string, LinkOption[]> = { ...(link_options || {}) };

                    if (bhRes?.message) {
                        const bhOpts: LinkOption[] = bhRes.message.map((h: any) => ({ value: h.name, label: h.budget_head || h.name }));
                        merged['account_head'] = bhOpts;
                        merged['Budget Head'] = bhOpts;
                    }
                    if (deptRes?.message) {
                        const deptOpts: LinkOption[] = deptRes.message.map((d: any) => ({ value: d.name, label: d.dept_name || d.name }));
                        merged['applicant_department'] = deptOpts;
                        merged['department_for'] = deptOpts;
                        merged['department'] = deptOpts;
                        merged['Department_prornd'] = deptOpts;
                    }
                    setDohLinkOptions(merged);
                }
            }).finally(() => setIsDohLoading(false));
        }
    }, [doctype, name]);

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9] dark:bg-[#18181B]">
            <div className="flex items-center gap-3 rounded-2xl border border-[#E4E4E7] bg-white px-5 py-4 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#D97757] border-t-transparent" />
                <span className="text-sm font-semibold text-[#71717A] dark:text-[#A1A1AA]">Loading…</span>
            </div>
        </div>
    );

    if (doctype === 'Project Registration') return (
        <ProjectDetailsView projectName={name} backUrl="/task-registry" backLabel="Back to Registry" />
    );

    if (error || !data) return (
        <div className="flex flex-col h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B] p-4">
            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-8 rounded-2xl shadow-sm max-w-lg w-full text-center">
                <div className="text-red-500 font-extrabold text-xl mb-2">Document Not Found</div>
                <p className="text-[#71717A] dark:text-[#A1A1AA] text-sm mb-4">{doctype} · {name}</p>
                <button onClick={() => navigate(-1)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-transparent text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    Go Back
                </button>
            </div>
        </div>
    );

    const readOnlyRendererProps = {
        onChange: () => { }, onFileChange: () => { }, onTableRowChange: () => { },
        onTableFileChange: () => { }, onAddTableRow: () => { }, onDeleteTableRow: () => { },
        readOnly: true,
    };

    const renderContent = () => {
        if (doctype === 'Fund Sanction') return (
            <FundSanctionView
                data={data}
                docname={name!}
                canEdit={canEditFsFiles}
                onRefresh={() => mutate()}
            />
        );

        if (doctype === 'Direct Purchase') return <DirectPurchaseTabView data={data} docName={name!} />;

        if (doctype === 'Selection Committee Report') {
            if (isScrLoading) return <Spinner />;
            if (scrFields.length > 0) return (
                <RegistryPanel title="Selection Committee Report">
                    <DynamicFormRenderer fields={scrFields} formData={data} linkOptions={scrLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        if (doctype === 'Travel') {
            if (isTravelLoading) return <Spinner />;
            if (travelFields.length > 0) return (
                <RegistryPanel title="Travel">
                    <TravelApplicantSummary className="mb-6"
                        webmail={data?.webmail_id_travel} fullName={data?.applicant_name_travel}
                        department={data?.department_travel} designation={data?.designation_travel}
                        projectNo={data?.travel_project_number} />
                    <DynamicFormRenderer fields={travelFields} formData={displayData} linkOptions={travelLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        if (doctype === 'Advance Settlement') {
            if (isAdvLoading) return <Spinner />;
            if (advFields.length > 0) return (
                <RegistryPanel title="Advance Settlement">
                    <DynamicFormRenderer fields={advFields} formData={displayData} linkOptions={advLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        if (doctype === 'Temporary Advance') {
            if (isTaLoading) return <Spinner />;
            if (taFields.length > 0) return (
                <RegistryPanel title="Temporary Advance">
                    <DynamicFormRenderer fields={taFields.filter(f => f.fieldname !== 'applying_for_select')} formData={displayData} linkOptions={taLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        if (doctype === 'TA DA Settlement') {
            if (isTadaLoading) return <Spinner />;
            if (tadaFields.length > 0) return (
                <RegistryPanel title="TA DA Settlement">
                    <DynamicFormRenderer fields={tadaFields} formData={displayData} linkOptions={tadaLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        if (doctype === 'Recruitment Adhoc Contractual') {
            if (isRecLoading) return <Spinner />;
            if (recFields.length > 0) return (
                <RegistryPanel title="Recruitment Adhoc Contractual">
                    <DynamicFormRenderer fields={recFields} formData={displayData} linkOptions={recLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        if (doctype === 'Disbursal of Honorarium') {
            if (isDohLoading) return <Spinner />;
            if (dohFields.length > 0) return (
                <RegistryPanel title="Disbursal of Honorarium">
                    <DynamicFormRenderer fields={dohFields} formData={displayData} linkOptions={dohLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        return (
            <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                    <h3 className="text-[13px] font-extrabold tracking-wide text-[#3F3F46] dark:text-[#E4E4E7] uppercase">{doctype}</h3>
                </div>
                <div className="p-5 md:p-6">
                    <GenericDocViewer data={displayData} doctype={doctype} />
                </div>
            </div>
        );
    };

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans overflow-x-hidden">
            <main className="transition-all duration-300 ease-in-out px-5 py-6 md:px-8 md:py-7 overflow-x-hidden">
                <PageHeader
                    title={name || ''}
                    status={data?.workflow_state}
                    projectName={data?.project_name || data?.project_no}
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
                        {/* Meta strip */}
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                            <span><span className="font-extrabold uppercase tracking-wider">Type</span> &nbsp;{doctype}</span>
                            <span><span className="font-extrabold uppercase tracking-wider">Owner</span> &nbsp;{data?.owner || '—'}</span>
                            {data?.modified && (
                                <span>
                                    <span className="font-extrabold uppercase tracking-wider">Modified</span>
                                    &nbsp;{new Date(data.modified).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {doctype !== 'Project Registration' && data && (
                                <button
                                    onClick={async () => {
                                        const mapping = DOCTYPE_PR_LINKS[doctype];
                                        if (!mapping) return;
                                        const strategy = mapping.primary;
                                        if (strategy.type === 'pr_name') {
                                            const val = data[strategy.field];
                                            if (val) { setPrPreviewName(val); return; }
                                        }
                                        if (strategy.type === 'self') {
                                            setPrPreviewName(name!);
                                            return;
                                        }
                                        const noField = strategy.type === 'pr_project_no' ? strategy.field
                                            : mapping.fallback?.type === 'pr_project_no' ? (mapping.fallback as any).field
                                            : null;
                                        const projectNo = noField ? data[noField] : null;
                                        if (!projectNo) return;
                                        setPrPreviewLoading(true);
                                        try {
                                            const params = new URLSearchParams({
                                                filters: JSON.stringify([['project_no', '=', projectNo]]),
                                                fields: JSON.stringify(['name']),
                                                limit: '1',
                                            });
                                            const res = await fetch(`/api/resource/Project%20Registration?${params}`, { credentials: 'include' }).then(r => r.json());
                                            const prName = (res?.data ?? res?.message ?? [])[0]?.name;
                                            if (prName) setPrPreviewName(prName);
                                        } finally {
                                            setPrPreviewLoading(false);
                                        }
                                    }}
                                    disabled={prPreviewLoading}
                                    className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-bold uppercase tracking-wide rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-[#D97757] hover:text-[#D97757] shadow-sm transition-all disabled:opacity-60"
                                >
                                    <FolderOpenIcon className="h-3.5 w-3.5" />
                                    {prPreviewLoading ? 'Loading…' : 'View Project'}
                                </button>
                            )}
                            {doctype === 'Temporary Advance' && isStaffRnD && (
                                <button
                                    onClick={handlePrintTemporaryAdvance}
                                    className="inline-flex items-center justify-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[#FAFAF9] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-[#EFF6FF] dark:hover:bg-[#2563EB]/10 hover:border-[#2563EB]/40 shadow-sm transition-all"
                                    title="Print Temporary Advance"
                                >
                                    <Printer className="h-4 w-4 text-[#2563EB] dark:text-[#60A5FA]" />
                                    Print
                                </button>
                            )}
                            {doctype === "Cancellation Request" && data?.reference_doctype && data?.reference_name && (
                                <button
                                    onClick={() => {
                                        const route = getOriginalApplicationRoute(
                                            data.reference_doctype,
                                            data.reference_name,
                                        );
                                        if (route) navigate(route);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 h-fit rounded-md text-xs font-medium border border-[#E4E4E7] bg-[#FAFAF9] text-[#71717A] transition-colors hover:border-[#D97757]/30 hover:bg-[#D97757]/10 hover:text-[#D97757] dark:border-[#3F3F46] dark:bg-[#18181B]"
                                >
                                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                                    View Original Application
                                </button>
                            )}
                        </div>
                    </div>
                </PageHeader>

                {doctype === "Cancellation Request" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3 space-y-6">
                            {renderContent()}
                        </div>
                        <div className="lg:col-span-1 space-y-6">
                            <div className="sticky top-6 space-y-6">
                                <OriginalCommitmentSidebar
                                    refName={data?.reference_name}
                                    refDoctype={data?.reference_doctype}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {renderContent()}
                    </div>
                )}
            </main>

            {name && doctype && (
                <FloatingActivityLogButton doctype={doctype} docname={name} />
            )}

            {prPreviewName && (
                <ProjectPreviewModal
                    projectName={prPreviewName}
                    onClose={() => setPrPreviewName(null)}
                />
            )}
        </div>
    );
};

export default TaskRegistryDetails;
