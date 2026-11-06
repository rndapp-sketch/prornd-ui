import React, { useEffect, useRef, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { Search, Receipt, Loader2, CheckCircle2, XCircle, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { fetchApprovedFunds, rowsFromProject, fetchGeneratedPage, GENERATED_PAGE_SIZE, type InvoiceRow, type GeneratedInvoice } from "@/utils/consultancyInvoiceApi";

// Pages scanned in one load while looking for projects that still have pending funds.
const MAX_SKIPS = 10;

type Tab = "pending" | "generated";

const ConsultancyInvoice: React.FC = () => {
    const [tab, setTab] = useState<Tab>("pending");
    const [rawSearch, setRawSearch] = useState("");
    const [search] = useDebounce(rawSearch.trim(), 400);
    const [rows, setRows] = useState<InvoiceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Cursor paging from get_approved_consultancy_funds: PAGE_SIZE projects per page, and only
    // their funds without an invoice are listed. Tokens come from the previous response.
    const [cursor, setCursor] = useState<string | null>(null);
    const [pageNo, setPageNo] = useState(1);
    const [pageInfo, setPageInfo] = useState({ total: 0, nextId: null as string | null, prevId: null as string | null });
    const pendPages = Math.max(1, Math.ceil(pageInfo.total / GENERATED_PAGE_SIZE));
    const dirRef = useRef(1);
    const [pageDebug, setPageDebug] = useState("");
    const goPage = (delta: 1 | -1) => {
        const id = delta === 1 ? pageInfo.nextId : pageInfo.prevId;
        if (!id) return;
        dirRef.current = delta;
        setPageNo((n) => n + delta);
        setCursor(id);
    };
    useEffect(() => { dirRef.current = 1; setCursor(null); setPageNo(1); }, [search]);

    const navigate = useNavigate();

    // Generated invoices are paged from the backend, GENERATED_PAGE_SIZE at a time.
    const [genPage, setGenPage] = useState(0);
    const [genItems, setGenItems] = useState<GeneratedInvoice[]>([]);
    const [genTotal, setGenTotal] = useState(0);
    const [genLoading, setGenLoading] = useState(true);
    const [genError, setGenError] = useState("");
    const genPages = Math.max(1, Math.ceil(genTotal / GENERATED_PAGE_SIZE));

    useEffect(() => setGenPage(0), [search]);

    useEffect(() => {
        let cancelled = false;
        setGenLoading(true);
        setGenError("");
        fetchGeneratedPage(genPage, search)
            .then((r) => { if (!cancelled) { setGenItems(r.items); setGenTotal(r.total); } })
            .catch((e) => { if (!cancelled) setGenError(e instanceof Error ? e.message : "Failed to load generated invoices"); })
            .finally(() => { if (!cancelled) setGenLoading(false); });
        return () => { cancelled = true; };
    }, [genPage, search]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError("");
            try {
                // Keep following the cursor in the direction of travel past pages with nothing pending.
                let id = cursor;
                let moved = 0;
                let all: InvoiceRow[] = [];
                let res = await fetchApprovedFunds({ projectNo: search, paginationId: id });
                for (let tries = 0; ; tries++) {
                    all = (await Promise.all((res.data ?? []).map(rowsFromProject))).flat();
                    const nextId = dirRef.current === 1 ? res.next_id : res.previous_id;
                    if (all.some((r) => !r.invoiceNo) || !nextId || tries >= MAX_SKIPS) break;
                    id = nextId;
                    moved++;
                    res = await fetchApprovedFunds({ projectNo: search, paginationId: id });
                }
                if (cancelled) return;
                console.debug("[consultancy-invoice] last page response", res);
                setRows(all);
                const states: Record<string, number> = {};
                (res.data ?? []).forEach((p) => (p.fund_received ?? []).forEach((f) => { const k = f.workflow_state || "(none)"; states[k] = (states[k] || 0) + 1; }));
                setPageDebug(`This page: ${res.data?.length ?? 0} projects, funds by state: ${JSON.stringify(states)}, ${all.length} fund rows, ${all.filter((r) => r.invoiceNo).length} already invoiced. Sample: ${JSON.stringify(all.slice(0, 3).map((r) => ({ project_no: r.projectNo, fund_received_ref: r.fundRef, invoice: r.invoiceName, invoice_no: r.invoiceNo })))}`);
                setPageInfo({ total: res.total ?? 0, nextId: res.next_id, prevId: res.previous_id });
                if (moved) setPageNo((n) => n + dirRef.current * moved);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load projects");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [search, cursor]);

    const pending = useMemo(() => rows.filter((r) => !r.invoiceNo), [rows]);
    const visible = pending;

    const openRow = (r: InvoiceRow) =>
        navigate(`/consultancy-invoice/${encodeURIComponent(r.projectNo)}/${encodeURIComponent(r.fundRef)}`, { state: { row: r } });

    const stats = [
        { label: "Projects", value: pageInfo.total, tone: "text-[#2563EB] dark:text-[#60A5FA]" },
        { label: "Pending (this page)", value: pending.length, tone: "text-amber-600 dark:text-amber-400" },
        { label: "Generated", value: genTotal, tone: "text-emerald-600 dark:text-emerald-400" },
    ];
    const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] text-[#3F3F46] dark:text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]";
    const th = "px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]";

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans p-3 space-y-3">
            <PageHeader title="Consultancy Invoice" projectName="Invoices for consultancy fund receipts" showBack={false}>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                    <input
                        value={rawSearch}
                        onChange={(e) => setRawSearch(e.target.value)}
                        placeholder="Filter by project no."
                        className={cn(inputCls, "pl-9")}
                    />
                </div>
            </PageHeader>

            <div className="grid grid-cols-3 gap-3">
                {stats.map((s) => (
                    <div key={s.label} className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg shadow-sm px-4 py-3">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">{s.label}</div>
                        <div className={cn("text-2xl font-extrabold leading-tight", s.tone)}>{(s.label === "Generated" ? genLoading && genItems.length === 0 : loading) ? "–" : s.value}</div>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg shadow-sm overflow-hidden">
                <div className="flex gap-1 px-3 pt-2 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                    {([["pending", "Pending Invoice", pending.length], ["generated", "Generated Invoice", genTotal]] as const).map(([id, label, count]) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={cn(
                                "px-4 py-2 text-[13px] font-bold border-b-2 -mb-px transition-colors",
                                tab === id
                                    ? "border-[#2563EB] text-[#2563EB] dark:text-[#60A5FA]"
                                    : "border-transparent text-[#71717A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]",
                            )}
                        >
                            {label}
                            <span className={cn(
                                "ml-2 px-1.5 py-0.5 rounded-full text-[10px]",
                                tab === id ? "bg-[#EFF6FF] dark:bg-[#2563EB]/15" : "bg-zinc-100 dark:bg-zinc-800",
                            )}>{count}</span>
                        </button>
                    ))}
                </div>

                {error && <div className="m-3 p-3 text-sm rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">{error}</div>}

                {tab === "pending" && <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-[#FAFAF9] dark:bg-[#18181B]">
                            <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                {["Project No", "Project Title", "Fund Received", "Amount", "Fund Status", "Date", "Deposit Slip", "Action"].map((h) => (
                                    <th key={h} className={cn(th, h === "Amount" ? "text-right" : "text-left")}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                            {loading ? (
                                <tr><td colSpan={8} className="px-4 py-12 text-center text-[#71717A]"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</td></tr>
                            ) : visible.length === 0 ? (
                                <tr><td colSpan={8} className="px-4 py-12 text-center">
                                    <Receipt className="w-8 h-8 mx-auto mb-2 text-[#D4D4D8] dark:text-[#52525B]" />
                                    <p className="text-[13px] font-medium text-[#71717A]">No pending invoices.</p>
                                    {pageDebug && <p className="mt-1 text-[11px] font-mono text-[#A1A1AA]">{pageDebug}</p>}
                                </td></tr>
                            ) : visible.map((r) => (
                                <tr key={r.key} className="hover:bg-[#EFF6FF]/50 dark:hover:bg-[#2563EB]/5 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="inline-flex text-[11px] font-mono font-bold bg-[#EFF6FF] dark:bg-[#2563EB]/10 px-2 py-0.5 rounded-lg text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/20">{r.projectNo}</span>
                                    </td>
                                    <td className="px-4 py-3 text-[#3F3F46] dark:text-[#E4E4E7] max-w-xs truncate" title={r.projectTitle}>{r.projectTitle || "-"}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-[#3F3F46] dark:text-[#E4E4E7]">{r.fundRef}</td>
                                    <td className="px-4 py-3 text-right font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                        {r.amount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                    </td>
                                    <td className="px-4 py-3 text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA]">{r.fundState}</td>
                                    <td className="px-4 py-3 text-[#71717A] dark:text-[#A1A1AA]">{r.date || "-"}</td>
                                    <td className="px-4 py-3">
                                        {r.slips.length > 0 ? (
                                            <div>
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />Available</span>
                                                {r.slips.map((d) => (
                                                    <div key={d.name} className="text-[11px] font-mono text-[#71717A]">{d.name}{d.workflow_state ? ` · ${d.workflow_state}` : ""}</div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A1A1AA]"><XCircle className="w-3.5 h-3.5" />Not available</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/fund-received/${r.fundName}`)}
                                                title="View Fund Received"
                                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#2563EB]/30 text-[#2563EB] bg-[#EFF6FF] dark:bg-[#2563EB]/10 hover:bg-[#DBEAFE]"
                                            >
                                                Fund
                                            </button>
                                            <button
                                                onClick={() => navigate(`/fund-received/${r.fundName}?tab=deposit_slip`)}
                                                disabled={r.slips.length === 0}
                                                title={r.slips.length === 0 ? "No deposit slip yet" : "View Deposit Slip"}
                                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#2563EB]/30 text-[#2563EB] bg-[#EFF6FF] dark:bg-[#2563EB]/10 hover:bg-[#DBEAFE] disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Deposit
                                            </button>
                                            <button
                                                onClick={() => openRow(r)}
                                                title="Add invoice"
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg shadow-sm transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />Add Invoice
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>}
                {tab === "pending" && (
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[12px] text-[#71717A]">
                        <span>Approved consultancy projects: {pageInfo.total}</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => goPage(-1)} disabled={!pageInfo.prevId || loading} className="px-3 py-1 font-bold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] disabled:opacity-40">Previous</button>
                            <span className="font-bold">Page {pageNo} / {pendPages}</span>
                            <button onClick={() => goPage(1)} disabled={!pageInfo.nextId || loading} className="px-3 py-1 font-bold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] disabled:opacity-40">Next</button>
                        </div>
                    </div>
                )}
                {tab === "generated" && (
                    <>
                        {genError && <div className="m-3 p-3 text-sm rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">{genError}</div>}
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-[#FAFAF9] dark:bg-[#18181B]">
                                    <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                        {["Invoice Document", "Project No", "Fund Received", "Invoice Numbers", "Created", "Action"].map((h) => (
                                            <th key={h} className={cn(th, "text-left")}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                                    {genLoading ? (
                                        <tr><td colSpan={6} className="px-4 py-12 text-center text-[#71717A]"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</td></tr>
                                    ) : genItems.length === 0 ? (
                                        <tr><td colSpan={6} className="px-4 py-12 text-center">
                                            <Receipt className="w-8 h-8 mx-auto mb-2 text-[#D4D4D8] dark:text-[#52525B]" />
                                            <p className="text-[13px] font-medium text-[#71717A]">No generated invoices.</p>
                                        </td></tr>
                                    ) : genItems.map((g) => (
                                        <tr key={g.name} className="hover:bg-[#EFF6FF]/50 dark:hover:bg-[#2563EB]/5 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-[#3F3F46] dark:text-[#E4E4E7]">{g.name}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex text-[11px] font-mono font-bold bg-[#EFF6FF] dark:bg-[#2563EB]/10 px-2 py-0.5 rounded-lg text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/20">{g.projectNo || "-"}</span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-[#3F3F46] dark:text-[#E4E4E7]">{g.fundRef || "-"}</td>
                                            <td className="px-4 py-3">
                                                {g.numbers.length === 0 ? "-" : g.numbers.map((no) => (
                                                    <div key={no} className="font-bold text-emerald-700 dark:text-emerald-400">{no}</div>
                                                ))}
                                            </td>
                                            <td className="px-4 py-3 text-[#71717A] dark:text-[#A1A1AA]">{g.created || "-"}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    disabled={!g.projectNo || !g.fundRef}
                                                    onClick={() => navigate(`/consultancy-invoice/${encodeURIComponent(g.projectNo)}/${encodeURIComponent(g.fundRef)}`)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg shadow-sm disabled:opacity-40"
                                                >
                                                    <Plus className="w-3 h-3" />Open / Add
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[12px] text-[#71717A]">
                            <span>
                                {genTotal === 0 ? "0" : `${genPage * GENERATED_PAGE_SIZE + 1}–${Math.min((genPage + 1) * GENERATED_PAGE_SIZE, genTotal)}`} of {genTotal}
                            </span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setGenPage((p) => p - 1)} disabled={genPage === 0 || genLoading} className="px-3 py-1 font-bold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] disabled:opacity-40">Previous</button>
                                <span className="font-bold">Page {genPage + 1} / {genPages}</span>
                                <button onClick={() => setGenPage((p) => p + 1)} disabled={genPage + 1 >= genPages || genLoading} className="px-3 py-1 font-bold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] disabled:opacity-40">Next</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
};

export default ConsultancyInvoice;
