import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDoc, useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { ArrowLeftIcon, FileTextIcon } from "lucide-react";
import { AppSidebar } from '@/components/RndSidebar';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { travelAPI, advanceSettlementAPI, temporaryAdvanceAPI, tadaAPI, recruitmentAdhocContractualAPI, selectionCommitteeReportAPI } from '@/services/apiService';
import { useUserRoles } from '@/components/UserRole';
import { POEditor } from '@/components/POEditor';
import { DeclarationFields } from '@/components/DeclarationFields';
import ProjectDetailsView from "./ProjectDetails";

// ── Shared helpers (same as PendingTaskDetails) ─────────────────────────────
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

const DPDocumentViewer = ({ data, doctype: viewerDoctype }: { data: Record<string, any>; doctype?: string }) => {
    const allScalar = Object.entries(data).filter(([key, value]) => {
        if (DP_EXCLUDED.includes(key)) return false;
        if (key.startsWith('_')) return false;
        if (Array.isArray(value)) return false;
        if (value === null || value === undefined || value === '') return false;
        return true;
    });
    const childTables = Object.entries(data).filter(([, value]) => Array.isArray(value) && (value as any[]).length > 0);
    const fileFields   = allScalar.filter(([k, v]) => isFilePath(String(v)) || k.startsWith('upload_'));
    const boolFields   = allScalar.filter(([k, v]) => dpIsBool(k, v));
    const amountFields = allScalar.filter(([k, v]) => dpIsAmt(k) && !isFilePath(String(v)) && !dpIsBool(k, v));
    const infoFields   = allScalar.filter(([k, v]) =>
        !isFilePath(String(v)) && !dpIsBool(k, v) && !dpIsAmt(k) && !k.startsWith('upload_'));

    const FieldCard = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1.5">{label}</p>
            <div className="text-sm text-[#3F3F46] dark:text-[#E4E4E7] font-medium">{children}</div>
        </div>
    );

    return (
        <div className="space-y-6">
            {infoFields.length > 0 && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-3 pb-2 border-b border-[#E4E4E7] dark:border-[#3F3F46]">General Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        {infoFields.map(([key, value]) => (
                            <FieldCard key={key} label={dpFmt(key)}>{String(value)}</FieldCard>
                        ))}
                    </div>
                </div>
            )}
            {amountFields.length > 0 && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-3 pb-2 border-b border-[#E4E4E7] dark:border-[#3F3F46]">Financial Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        {amountFields.map(([key, value]) => (
                            <FieldCard key={key} label={dpFmt(key)}>
                                {!isNaN(Number(value)) ? dpINR(value) : String(value)}
                            </FieldCard>
                        ))}
                    </div>
                </div>
            )}
            {/* Declarations */}
            {viewerDoctype && <DeclarationFields doctype={viewerDoctype} />}
            {fileFields.length > 0 && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-3 pb-2 border-b border-[#E4E4E7] dark:border-[#3F3F46]">Attachments</p>
                    <div className="flex flex-wrap gap-3">
                        {fileFields.map(([key, value]) => (
                            <a key={key} href={String(value)} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-xs font-medium text-[#D97757] hover:bg-[#FFF8F5] dark:hover:bg-zinc-800 transition-colors">
                                📎 {getFileName(String(value))}
                            </a>
                        ))}
                    </div>
                </div>
            )}
            {childTables.map(([key, value]) => {
                const rows = value as any[];
                const cols = Object.keys(rows[0]).filter(k =>
                    !k.startsWith('_') && !DP_EXCLUDED.includes(k)
                );
                const hasAmtCols = cols.some(c => dpIsAmt(c));
                const colTotals: Record<string, number> = {};
                if (hasAmtCols) cols.forEach(c => {
                    if (dpIsAmt(c)) colTotals[c] = rows.reduce((s, r) => s + (parseFloat(r[c]) || 0), 0);
                });
                return (
                    <div key={key}>
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-3 pb-2 border-b border-[#E4E4E7] dark:border-[#3F3F46]">{dpFmt(key)}</h4>
                        <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]">
                            <table className="min-w-full text-sm">
                                <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                    <tr>{cols.map(c => <th key={c} className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#1E3A8A] dark:text-[#C7D2FE] whitespace-nowrap">{dpFmt(c)}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-[#F4F4F5] dark:divide-[#3F3F46]">
                                    {rows.map((row, i) => (
                                        <tr key={i} className="hover:bg-[#FAFAF9] dark:hover:bg-zinc-800/30">
                                            {cols.map(c => (
                                                <td key={c} className="px-4 py-2.5 text-[#3F3F46] dark:text-[#E4E4E7]">
                                                    {dpIsAmt(c) && !isNaN(Number(row[c]))
                                                        ? <span className="font-medium">{dpINR(row[c])}</span>
                                                        : String(row[c] ?? '-')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {hasAmtCols && (
                                        <tr className="bg-zinc-50 dark:bg-zinc-700/50 font-medium">
                                            {cols.map(c => (
                                                <td key={c} className="px-4 py-2.5 text-[#3F3F46] dark:text-[#E4E4E7]">
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

// ── DP Tabs (read-only, no action buttons) ───────────────────────────────────
type DPTabId = 'details' | 'p11' | 'sanction' | 'po';

const DP_TABS = [
    { id: 'details'  as DPTabId, label: 'Details',        icon: '📋' },
    { id: 'p11'      as DPTabId, label: 'P-11 Form',      icon: '📝' },
    { id: 'sanction' as DPTabId, label: 'Sanction Sheet', icon: '📄' },
    { id: 'po'       as DPTabId, label: 'Purchase Order', icon: '🛒' },
];

const statusBadgeClass = (state?: string) => {
    const s = state?.toLowerCase() || '';
    if (s.includes('approved')) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';
    if (s.includes('rejected') || s.includes('cancelled')) return 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400';
    if (s.includes('draft')) return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    if (s.includes('pending') || s.includes('review')) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
    return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
};

const RegistryPanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div className="flex items-center gap-2 border-b border-[#E4E4E7] bg-[#FAFAF9] px-[22px] py-[14px] dark:border-[#3F3F46] dark:bg-[#27272A]">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-[#2563EB] dark:bg-blue-950/20">
                <FileTextIcon className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{title}</h2>
        </div>
        <div className="p-5 md:p-6">{children}</div>
    </div>
);

const DPLinkedDocTab = ({ doctype, filterField, filterValue, emptyTitle, emptyDescription }: {
    doctype: string; filterField: string; filterValue: string;
    emptyTitle: string; emptyDescription: string;
}) => {
    const filters = JSON.stringify([[filterField, '=', filterValue]]);
    const { data: listData, isLoading: listLoading } = useFrappePostCall<any>('frappe.client.get_list');
    const [docName, setDocName] = React.useState<string | null>(null);
    const { data: docData, isLoading: docLoading } = useFrappeGetDoc<Record<string, any>>(doctype, docName || '');

    React.useEffect(() => {
        fetch(`/api/v2/document/${doctype}?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent('["name"]')}`, {
            credentials: 'include', headers: { Accept: 'application/json' },
        }).then(r => r.json()).then(res => {
            setDocName(res?.data?.[0]?.name || null);
        }).catch(() => {});
    }, [doctype, filterValue]);

    if (listLoading || docLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 rounded-full border-2 border-[#D97757] border-t-transparent" /></div>;
    if (!docName || !docData) return (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <p className="font-serif text-base font-medium text-[#3F3F46] dark:text-[#E4E4E7]">{emptyTitle}</p>
            <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] max-w-xs">{emptyDescription}</p>
        </div>
    );
    return <DPDocumentViewer data={docData} doctype={doctype} />;
};

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
        }).catch(() => {}).finally(() => setIsLoadingPOData(false));
    }, [activeTab, docName, poSanctionData]);

    return (
        <div className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-zinc-800/30 pr-4">
                <div className="flex items-center overflow-x-auto">
                    {DP_TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 ${activeTab === tab.id ? 'border-[#D97757] text-[#D97757]' : 'border-transparent text-[#71717A] dark:text-[#A1A1AA] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
                {data.workflow_state && (
                    <span className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {data.workflow_state}
                    </span>
                )}
            </div>
            <div className="p-6">
                {activeTab === 'details' && <DPDocumentViewer data={data} doctype="Direct Purchase" />}
                {activeTab === 'p11' && (
                    <DPLinkedDocTab doctype="P_11 Form" filterField="app_id" filterValue={docName}
                        emptyTitle="No P-11 Form Generated Yet"
                        emptyDescription="The P-11 Form is generated after the Direct Purchase is approved." />
                )}
                {activeTab === 'sanction' && (
                    <DPLinkedDocTab doctype="sanction_sheet" filterField="app_id" filterValue={docName}
                        emptyTitle="No Sanction Sheet Generated Yet"
                        emptyDescription="The Sanction Sheet is created by RnD Staff after the P-11 Form is verified." />
                )}
                {activeTab === 'po' && (
                    <>
                        {isLoadingPOData ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D97757] border-t-transparent" />
                            </div>
                        ) : poSanctionData && (isStaffRnD || data?.workflow_state === "POGenerated") ? (
                            <POEditor ssData={poSanctionData} dpId={docName} isStaffRnD={isStaffRnD} isPIReadOnly={isPermanentEmployee && !isStaffRnD} />
                        ) : poSanctionData ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                <p className="font-serif text-base font-medium text-[#3F3F46] dark:text-[#E4E4E7]">Purchase Order Not Yet Generated</p>
                                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] max-w-xs">The Purchase Order has not been generated by staff yet. Please check back later.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                <p className="font-serif text-base font-medium text-[#3F3F46] dark:text-[#E4E4E7]">No Sanction Sheet Available</p>
                                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] max-w-xs">The Purchase Order is generated once the Sanction Sheet is approved.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// ── Generic document viewer (for non-DP doctypes) ────────────────────────────
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                    {simpleFields.map(([key, value]) => (
                        <div key={key}>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">{fmt(key)}</p>
                            {isFilePath(String(value)) ? (
                                <a href={String(value)} target="_blank" rel="noreferrer" className="text-sm text-[#D97757] underline break-all">{getFileName(String(value))}</a>
                            ) : (
                                <p className="text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] break-words">{String(value)}</p>
                            )}
                        </div>
                    ))}
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
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-3 pb-2 border-b border-[#E4E4E7] dark:border-[#3F3F46]">{fmt(key)}</h4>
                        <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]">
                            <table className="min-w-full text-sm">
                                <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                    <tr>
                                        {headers.map(h => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#1E3A8A] dark:text-[#C7D2FE] whitespace-nowrap">{fmt(h)}</th>)}
                                        {isBudget && <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#D97757] whitespace-nowrap">Row Total</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F4F4F5] dark:divide-[#3F3F46]">
                                    {rows.map((row, i) => {
                                        const rowTotal = isBudget ? budgetYearCols.reduce((s, c) => s + (parseFloat(row[c]) || 0), 0) : 0;
                                        return (
                                            <tr key={i} className="hover:bg-[#FAFAF9] dark:hover:bg-zinc-800/30">
                                                {headers.map(h => (
                                                    <td key={h} className="px-4 py-2.5 text-[#3F3F46] dark:text-[#E4E4E7]">
                                                        {budgetYearCols.includes(h)
                                                            ? (parseFloat(row[h]) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
                                                            : String(row[h] ?? '-')}
                                                    </td>
                                                ))}
                                                {isBudget && <td className="px-4 py-2.5 font-semibold text-[#D97757]">{rowTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>}
                                            </tr>
                                        );
                                    })}
                                    {isBudget && (
                                        <tr className="bg-zinc-50 dark:bg-zinc-700/50 font-semibold border-t-2 border-[#E4E4E7] dark:border-[#3F3F46]">
                                            {headers.map(h => (
                                                <td key={h} className="px-4 py-2.5 text-[#3F3F46] dark:text-[#E4E4E7]">
                                                    {h === 'account_head' ? 'Total' : colTotals[h] != null ? (colTotals[h]).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) : ''}
                                                </td>
                                            ))}
                                            <td className="px-4 py-2.5 font-bold text-white bg-[#D97757]">{grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
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

// ── Main Component ────────────────────────────────────────────────────────────
const TaskRegistryDetails: React.FC = () => {
    const { doctype: rawDoctype, name } = useParams<{ doctype: string; name: string }>();
    const navigate = useNavigate();
    const doctype = rawDoctype ? decodeURIComponent(rawDoctype) : '';

    const { data, isLoading, error } = useFrappeGetDoc(doctype || '', name || '');

    // Fields for form-based doctypes
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

    const { call: fetchTravelFields }  = useFrappePostCall<{ message: { fields: FormField[]; link_options: any } }>(travelAPI.getFields);
    const { call: fetchAdvFields }     = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_meta?: any } }>(advanceSettlementAPI.getFields);
    const { call: fetchTaFields }      = useFrappePostCall<{ message: { fields: FormField[]; link_options: any } }>(temporaryAdvanceAPI.getFields);
    const { call: fetchTadaFields }    = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_meta?: any } }>(tadaAPI.getFields);
    const { call: fetchRecFields }     = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_meta?: any } }>(recruitmentAdhocContractualAPI.getFields);
    const { call: fetchScrFields }     = useFrappePostCall<{ message: { fields: FormField[]; link_options: any; child_table_meta?: any } }>(selectionCommitteeReportAPI.getFields);

    // Redirect dedicated detail pages
    useEffect(() => {
        if (doctype === 'Disbursal of Consultancy' && name) {
            navigate(`/disbursal-of-consultancy/${name}`, { replace: true });
        }
        if (doctype === 'Travel' && name) {
            navigate(`/travel/${name}`, { replace: true });
        }
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

    // Loading state
    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9] dark:bg-[#18181B]">
            <div className="flex items-center gap-3 rounded-2xl border border-[#E4E4E7] bg-white px-5 py-4 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#D97757] border-t-transparent" />
                <span className="text-sm font-semibold text-[#71717A] dark:text-[#A1A1AA]">Loading task details</span>
            </div>
        </div>
    );

    // Project Registration — use dedicated view
    if (doctype === 'Project Registration') return (
        <ProjectDetailsView projectName={name} backUrl="/task-registry" backLabel="Back to Registry" />
    );

    // Error state
    if (error || !data) return (
        <div className="flex flex-col h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B] p-4">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-md max-w-lg w-full text-center">
                <div className="text-red-500 font-bold text-xl mb-2">Not Found</div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">{doctype} · {name}</p>
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700">Go Back</button>
            </div>
        </div>
    );

    const readOnlyRendererProps = {
        onChange: () => {},
        onFileChange: () => {},
        onTableRowChange: () => {},
        onTableFileChange: () => {},
        onAddTableRow: () => {},
        onDeleteTableRow: () => {},
        readOnly: true,
    };

    const renderContent = () => {
        // Direct Purchase — full tabbed view
        if (doctype === 'Direct Purchase') return <DirectPurchaseTabView data={data} docName={name!} />;

        // Selection Committee Report
        if (doctype === 'Selection Committee Report') {
            if (isScrLoading) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-2 border-[#D97757] border-t-transparent" /></div>;
            if (scrFields.length > 0) return (
                <RegistryPanel title="Selection Committee Report">
                    <DynamicFormRenderer
                        fields={scrFields}
                        formData={data}
                        linkOptions={scrLinkOptions}
                        {...readOnlyRendererProps}
                    />
                </RegistryPanel>
            );
        }

        // Travel
        if (doctype === 'Travel') {
            if (isTravelLoading) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-2 border-[#D97757] border-t-transparent" /></div>;
            if (travelFields.length > 0) return (
                <RegistryPanel title="Travel">
                    <DynamicFormRenderer fields={travelFields} formData={data} linkOptions={travelLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        // Advance Settlement
        if (doctype === 'Advance Settlement') {
            if (isAdvLoading) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-2 border-[#D97757] border-t-transparent" /></div>;
            if (advFields.length > 0) return (
                <RegistryPanel title="Advance Settlement">
                    <DynamicFormRenderer fields={advFields} formData={data} linkOptions={advLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        // Temporary Advance
        if (doctype === 'Temporary Advance') {
            if (isTaLoading) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-2 border-[#D97757] border-t-transparent" /></div>;
            if (taFields.length > 0) return (
                <RegistryPanel title="Temporary Advance">
                    <DynamicFormRenderer fields={taFields} formData={data} linkOptions={taLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        // TA DA Settlement
        if (doctype === 'TA DA Settlement') {
            if (isTadaLoading) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-2 border-[#D97757] border-t-transparent" /></div>;
            if (tadaFields.length > 0) return (
                <RegistryPanel title="TA DA Settlement">
                    <DynamicFormRenderer fields={tadaFields} formData={data} linkOptions={tadaLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        // Recruitment Adhoc Contractual
        if (doctype === 'Recruitment Adhoc Contractual') {
            if (isRecLoading) return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-2 border-[#D97757] border-t-transparent" /></div>;
            if (recFields.length > 0) return (
                <RegistryPanel title="Recruitment Adhoc Contractual">
                    <DynamicFormRenderer fields={recFields} formData={data} linkOptions={recLinkOptions} {...readOnlyRendererProps} />
                </RegistryPanel>
            );
        }

        // Default — generic viewer
        return (
            <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm p-6">
                <GenericDocViewer data={data} />
            </div>
        );
    };

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
            <AppSidebar />
            <main className="mx-auto max-w-[1600px] flex-1 p-6 md:p-8 w-full overflow-hidden">
                {/* Header */}
                <header className="mb-6 overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <button onClick={() => navigate(-1)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] text-[#71717A] transition-colors hover:border-[#D97757]/30 hover:bg-[#D97757]/10 hover:text-[#D97757] dark:border-[#3F3F46] dark:bg-[#18181B]">
                                <ArrowLeftIcon className="h-4 w-4" />
                            </button>
                            <div className="min-w-0">
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">Task Registry</span>
                                <h1 className="mt-1 truncate text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7]">{doctype}</h1>
                                <p className="mt-0.5 truncate text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">{name}</p>
                            </div>
                        </div>
                        {data?.workflow_state && (
                            <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${statusBadgeClass(data.workflow_state)}`}>
                                {data.workflow_state}
                            </span>
                        )}
                    </div>
                    <div className="grid gap-3 border-t border-[#E4E4E7] bg-[#FAFAF9]/70 px-5 py-4 text-sm dark:border-[#3F3F46] dark:bg-[#18181B]/40 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            ['Document Type', doctype || '-'],
                            ['Document ID', name || '-'],
                            ['Owner', data?.owner || '-'],
                            ['Modified', data?.modified ? new Date(data.modified).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'],
                        ].map(([label, value]) => (
                            <div key={label} className="min-w-0">
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">{label}</p>
                                <p className="mt-1 truncate font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{value}</p>
                            </div>
                        ))}
                    </div>
                </header>

                {/* Content */}
                <div className="space-y-6">
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
