import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDoc, useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import {
    FileTextIcon, ClipboardListIcon, ShoppingCartIcon,
    LayoutGridIcon, PaperclipIcon,
} from "lucide-react";
import { cn } from '@/lib/utils';

import { PageHeader } from '@/components/common/PageHeader';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { travelAPI, advanceSettlementAPI, temporaryAdvanceAPI, tadaAPI, recruitmentAdhocContractualAPI, selectionCommitteeReportAPI } from '@/services/apiService';
import { useUserRoles } from '@/components/UserRole';
import { POEditor } from '@/components/POEditor';
import { DeclarationFields } from '@/components/DeclarationFields';
import TravelApplicantSummary from '@/components/TravelApplicantSummary';
import ProjectDetailsView from "./ProjectDetails";

// ── Shared helpers ────────────────────────────────────────────────────────────
const isFilePath = (value: string) => {
    if (typeof value !== 'string') return false;
    return value.startsWith('/private/files/') ||
        value.startsWith('/files/') ||
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

// ── DPDocumentViewer ──────────────────────────────────────────────────────────
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

    return (
        <div className="space-y-4">
            {/* Tab nav */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#E4E4E7] bg-white p-2 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A] lg:grid-cols-4">
                {DP_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-bold transition-all duration-150",
                            activeTab === tab.id
                                ? DP_TAB_ACTIVE[tab.id]
                                : "border-transparent text-[#71717A] hover:bg-zinc-50 hover:text-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-zinc-800 dark:hover:text-[#E4E4E7]",
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A] overflow-hidden">
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
                        poSanctionData && (isStaffRnD || data?.workflow_state === "POGenerated") ? (
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
const GenericDocViewer = ({ data }: { data: Record<string, any> }) => {
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
                                ) : (
                                    <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">{String(value)}</p>
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

// ── Main Component ────────────────────────────────────────────────────────────
const TaskRegistryDetails: React.FC = () => {
    const { doctype: rawDoctype, name } = useParams<{ doctype: string; name: string }>();
    const navigate = useNavigate();
    const doctype = rawDoctype ? decodeURIComponent(rawDoctype) : '';

    const { data, isLoading, error } = useFrappeGetDoc(doctype || '', name || '');

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

    const { call: fetchTravelFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any } }>(travelAPI.getFields);
    const { call: fetchAdvFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_meta?: any } }>(advanceSettlementAPI.getFields);
    const { call: fetchTaFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any } }>(temporaryAdvanceAPI.getFields);
    const { call: fetchTadaFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_meta?: any } }>(tadaAPI.getFields);
    const { call: fetchRecFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_meta?: any } }>(recruitmentAdhocContractualAPI.getFields);
    const { call: fetchScrFields } = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_meta?: any } }>(selectionCommitteeReportAPI.getFields);

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
                    <DynamicFormRenderer fields={travelFields} formData={data} linkOptions={travelLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        if (doctype === 'Advance Settlement') {
            if (isAdvLoading) return <Spinner />;
            if (advFields.length > 0) return (
                <RegistryPanel title="Advance Settlement">
                    <DynamicFormRenderer fields={advFields} formData={data} linkOptions={advLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        if (doctype === 'Temporary Advance') {
            if (isTaLoading) return <Spinner />;
            if (taFields.length > 0) return (
                <RegistryPanel title="Temporary Advance">
                    <DynamicFormRenderer fields={taFields} formData={data} linkOptions={taLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        if (doctype === 'TA DA Settlement') {
            if (isTadaLoading) return <Spinner />;
            if (tadaFields.length > 0) return (
                <RegistryPanel title="TA DA Settlement">
                    <DynamicFormRenderer fields={tadaFields} formData={data} linkOptions={tadaLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        if (doctype === 'Recruitment Adhoc Contractual') {
            if (isRecLoading) return <Spinner />;
            if (recFields.length > 0) return (
                <RegistryPanel title="Recruitment Adhoc Contractual">
                    <DynamicFormRenderer fields={recFields} formData={data} linkOptions={recLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        return (
            <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                    <h3 className="text-[13px] font-extrabold tracking-wide text-[#3F3F46] dark:text-[#E4E4E7] uppercase">{doctype}</h3>
                </div>
                <div className="p-5 md:p-6">
                    <GenericDocViewer data={data} />
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
                </PageHeader>

                <div className="space-y-4">
                    {renderContent()}
                </div>
            </main>

            {name && doctype && (
                <FloatingActivityLogButton doctype={doctype} docname={name} />
            )}
        </div>
    );
};

export default TaskRegistryDetails;
