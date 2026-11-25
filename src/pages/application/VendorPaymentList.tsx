import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { vendorPaymentAPI } from '@/services/apiService';
import { formatINR } from './vendorPaymentShared';

interface VendorPaymentRow {
    name: string;
    project_number?: string;
    name_of_vendor?: string;
    invoice_bill_no?: string;
    workflow_state?: string;
    webmail_id?: string;
    total_amount?: number;
    modified: string;
}

type Tab = 'pending' | 'mine';

const stateClass = (s = '') => {
    const l = s.toLowerCase();
    if (l.includes('approved')) return 'bg-green-100 text-green-700';
    if (l.includes('reject')) return 'bg-red-100 text-red-700';
    if (l === 'draft' || !l) return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
    if (l.includes('pending')) return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
};

const VendorPaymentList: React.FC = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('pending');
    const [search, setSearch] = useState('');

    const { data: pendingRes, isLoading: pendingLoading } = useFrappeGetCall<{ message: VendorPaymentRow[] }>(
        vendorPaymentAPI.getPending, { page_length: 500 }, 'vendor-payment-pending',
    );
    const { data: mineRes, isLoading: mineLoading } = useFrappeGetCall<{ message: VendorPaymentRow[] }>(
        vendorPaymentAPI.getMine, { page_length: 500 }, 'vendor-payment-mine',
    );

    const rows = useMemo(() => (tab === 'pending' ? pendingRes?.message : mineRes?.message) || [], [tab, pendingRes, mineRes]);
    const loading = tab === 'pending' ? pendingLoading : mineLoading;
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) =>
            [r.name, r.project_number, r.name_of_vendor, r.invoice_bill_no, r.webmail_id]
                .some((v) => String(v || '').toLowerCase().includes(q)));
    }, [rows, search]);

    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: 'pending', label: 'Awaiting my action', count: pendingRes?.message?.length ?? 0 },
        { key: 'mine', label: 'Raised by me', count: mineRes?.message?.length ?? 0 },
    ];

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <PageHeader title="Vendor Payment">
                <button
                    onClick={() => navigate('/vendor-payment-form')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] text-white hover:bg-[#c66a4e]"
                >
                    <Plus className="w-4 h-4" /> New Vendor Payment
                </button>
            </PageHeader>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                'rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
                                tab === t.key
                                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
                            )}
                        >
                            {t.label} <span className="font-normal opacity-70">{t.count}</span>
                        </button>
                    ))}
                    <div className="relative ml-auto w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search ID, project, vendor, invoice"
                            className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-[13px] placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-14 text-center text-[13px] text-zinc-400">Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className="py-14 text-center text-[13px] text-zinc-400">
                        {search ? 'No vendor payments match this search' : tab === 'pending' ? 'Nothing awaiting your action' : 'You have not raised any vendor payments yet'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                    <th className="px-4 py-2.5">ID</th>
                                    <th className="px-4 py-2.5">Project No.</th>
                                    <th className="px-4 py-2.5">Vendor</th>
                                    <th className="px-4 py-2.5">Invoice</th>
                                    {tab === 'pending' && <th className="px-4 py-2.5">Applicant</th>}
                                    <th className="px-4 py-2.5 text-right">Amount</th>
                                    <th className="px-4 py-2.5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {filtered.map((r) => (
                                    <tr
                                        key={r.name}
                                        onClick={() => navigate(`/vendor-payment/${encodeURIComponent(r.name)}`)}
                                        className="cursor-pointer text-[13px] hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                                    >
                                        <td className="px-4 py-2.5 font-mono text-[12px] text-zinc-900 dark:text-zinc-100">{r.name}</td>
                                        <td className="px-4 py-2.5">{r.project_number || '—'}</td>
                                        <td className="px-4 py-2.5">{r.name_of_vendor || '—'}</td>
                                        <td className="px-4 py-2.5">{r.invoice_bill_no || '—'}</td>
                                        {tab === 'pending' && <td className="px-4 py-2.5">{r.webmail_id || '—'}</td>}
                                        <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(Number(r.total_amount) || 0)}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-full', stateClass(r.workflow_state))}>
                                                {r.workflow_state || 'Draft'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorPaymentList;
