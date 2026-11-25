import React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth } from "frappe-react-sdk";
import {
    ArrowLeft, Banknote, CircleDollarSign, Download, FolderKanban, HandCoins, History, PiggyBank,
    RefreshCw, Search, SearchX, AlertCircle, ChevronLeft, ChevronRight, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { usePiLedgerData, summarize, type LedgerTx } from "@/hooks/usePiLedgerSummary";
import "@/pages/dashboards/projectStaffDashboard.css";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const amt = (n: number) => (n ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—");
const fmtDate = (d: string) => {
    const t = new Date(d);
    return isNaN(t.getTime()) ? d || "—" : t.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const typeLabel = (t: string) => {
    const u = t.toUpperCase();
    if (u === "FUND_RECEIVED") return "Fund Received";
    if (u === "COMMIT" || u === "COMMITMENT") return "Commitment";
    if (u.includes("PAY")) return "Payment";
    return t ? t.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "—";
};
const typePill = (label: string) =>
    label === "Fund Received"
        ? "bg-[var(--psd-approved-bg)] text-[#0A7F58] dark:text-emerald-300"
        : label === "Commitment"
            ? "bg-[var(--psd-review-bg)] text-[#B45309] dark:text-amber-300"
            : label === "Payment"
                ? "bg-[var(--psd-info-bg)] text-[#2F5BC4] dark:text-blue-300"
                : "bg-[var(--psd-primary-light)] text-[var(--psd-primary)]";

// Same palette as the KPI cards: violet = allocation, amber = committed, blue = paid, green = available.
const C = {
    alloc: { text: "text-[#5632C5] dark:text-violet-300", head: "text-[#5632C5] dark:text-violet-300", bar: "#6842D9" },
    commit: { text: "text-[#B45309] dark:text-amber-300", head: "text-[#B45309] dark:text-amber-300", bar: "#E99A16" },
    paid: { text: "text-[#2F5BC4] dark:text-blue-300", head: "text-[#2F5BC4] dark:text-blue-300", bar: "#4775E8" },
    avail: { text: "text-[#0A7F58] dark:text-emerald-300", head: "text-[#0A7F58] dark:text-emerald-300", bar: "#0DA875" },
};
const PANEL_TONES = {
    violet: { tile: "bg-[#F0EBFF] text-[#6842D9] dark:bg-violet-500/20 dark:text-violet-300", wash: "from-[#F0EBFF]/80" },
    blue: { tile: "bg-[#EEF3FF] text-[#4775E8] dark:bg-blue-500/20 dark:text-blue-300", wash: "from-[#EEF3FF]/80" },
};
const utilColor = (u: number) => (u >= 90 ? "#F04455" : u >= 70 ? "#F59E0B" : "#0DA875");

const PAGE_SIZE = 20;
const PROJECT_PAGE_SIZE = 5;
const field =
    "h-8 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-2.5 text-[12.5px] text-[var(--psd-heading)] outline-none transition-shadow focus:border-[var(--psd-primary)] focus:ring-2 focus:ring-[var(--psd-primary)]/15";

const Panel = ({ icon, title, subtitle, action, tone = "violet", children }: { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode; tone?: keyof typeof PANEL_TONES; children: React.ReactNode }) => (
    <section className="psd-card overflow-hidden">
        <div className={cn("flex items-center justify-between gap-3 border-b border-[var(--psd-border)] bg-gradient-to-r to-transparent px-4 py-2.5", PANEL_TONES[tone].wash)}>
            <div className="flex min-w-0 items-center gap-2.5">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", PANEL_TONES[tone].tile)}>{icon}</span>
                <div className="min-w-0">
                    <h2 className="text-[14px] font-semibold leading-tight text-[var(--psd-heading)]">{title}</h2>
                    {subtitle && <p className="text-[11px] text-[var(--psd-body)]">{subtitle}</p>}
                </div>
            </div>
            {action}
        </div>
        {children}
    </section>
);

const Th = ({ children, right, tint }: { children?: React.ReactNode; right?: boolean; tint?: string }) => (
    <th className={cn("whitespace-nowrap px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.08em]", tint ?? "text-[var(--psd-body)]", right && "text-right")}>{children}</th>
);

export function PiFinancialDashboard() {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const { projects, isLoading, error, refresh } = usePiLedgerData(currentUser);

    const [projectFilter, setProjectFilter] = React.useState("");
    const [headFilter, setHeadFilter] = React.useState("");
    const [typeFilter, setTypeFilter] = React.useState("");
    const [search, setSearch] = React.useState("");
    const [page, setPage] = React.useState(1);
    const [projPage, setProjPage] = React.useState(1);
    const [refreshing, setRefreshing] = React.useState(false);
    const ledgerRef = React.useRef<HTMLDivElement>(null);

    const list = projects ?? [];
    const totals = React.useMemo(() => summarize(list), [list]);
    const failedCount = list.filter((p) => p.failed).length;
    const projPages = Math.max(1, Math.ceil(list.length / PROJECT_PAGE_SIZE));
    const projPageSafe = Math.min(projPage, projPages);
    const projRows = list.slice((projPageSafe - 1) * PROJECT_PAGE_SIZE, projPageSafe * PROJECT_PAGE_SIZE);

    const allRows = React.useMemo<LedgerTx[]>(
        () => list.flatMap((p) => p.rows).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.transactionId ?? 0) - (a.transactionId ?? 0))),
        [list],
    );

    const headOptions = React.useMemo(
        () => [...new Set(list.filter((p) => !projectFilter || p.project_no === projectFilter).flatMap((p) => p.heads))].sort(),
        [list, projectFilter],
    );
    const typeOptions = React.useMemo(() => [...new Set(allRows.map((r) => typeLabel(r.type)))].sort(), [allRows]);

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        return allRows.filter(
            (r) =>
                (!projectFilter || r.project_no === projectFilter) &&
                (!headFilter || r.head === headFilter) &&
                (!typeFilter || typeLabel(r.type) === typeFilter) &&
                (!q || [r.particulars, r.ref, r.bmr, r.frapAppId, r.project_no, r.head, r.bankTransactionNumber].some((v) => v.toLowerCase().includes(q))),
        );
    }, [allRows, projectFilter, headFilter, typeFilter, search]);

    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const sums = React.useMemo(
        () => filtered.reduce((s, r) => ({ rec: s.rec + r.received, com: s.com + (r.status === "CANCELLED" ? 0 : r.committed), pay: s.pay + (r.status === "CANCELLED" ? 0 : r.payment) }), { rec: 0, com: 0, pay: 0 }),
        [filtered],
    );

    const pickProject = (code: string) => {
        setProjectFilter((cur) => (cur === code ? "" : code));
        setHeadFilter("");
        setPage(1);
        if (projectFilter !== code) setTimeout(() => ledgerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    };

    const exportCsv = () => {
        const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const head = ["Date", "Project No", "Project", "Budget Head", "Type", "Particulars", "Ref", "BMR", "Bank Txn", "Status", "Received", "Committed", "Payment"];
        const lines = filtered.map((r) => [r.date, r.project_no, r.project_title, r.head, typeLabel(r.type), r.particulars, r.ref, r.bmr, r.bankTransactionNumber, r.status, r.received, r.committed, r.payment].map(esc).join(","));
        const blob = new Blob([[head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "my-projects-ledger.csv";
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const doRefresh = async () => {
        setRefreshing(true);
        try { await refresh(); } finally { setRefreshing(false); }
    };

    const failed = error;

    return (
        <div className="psd-root min-h-screen font-sans">
            <div className="w-full space-y-3 px-0 pb-6 pt-0">
                {/* Hero */}
                <header className="psd-hero relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2">
                    <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                        <button onClick={() => navigate(-1)} aria-label="Go back" className="psd-focus grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]">
                            <ArrowLeft className="size-4" />
                        </button>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">PI Finance</div>
                            <h1 className="mt-0.5 text-[17px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">Financial Dashboard</h1>
                        </div>
                    </div>
                    <button onClick={doRefresh} disabled={refreshing || isLoading} className="psd-focus relative z-10 inline-flex items-center gap-1.5 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--psd-heading)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] disabled:opacity-50">
                        <RefreshCw className={cn("size-3.5", (refreshing || isLoading) && "animate-spin")} /> Refresh
                    </button>
                </header>

                {failed && (
                    <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-[var(--psd-returned)]/30 bg-[var(--psd-returned-bg)] px-3 py-2.5 text-[13px] text-[#C42B3C] dark:text-rose-300">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <div>
                            <p className="font-semibold">Couldn't load the ledger</p>
                            <p className="text-[12px] opacity-90">The ledger for your projects didn't load, so nothing is shown rather than zeros. Please refresh, or contact support if it continues.</p>
                        </div>
                    </div>
                )}
                {!failed && failedCount > 0 && (
                    <div role="status" className="flex items-start gap-2.5 rounded-lg border border-[var(--psd-review)]/30 bg-[var(--psd-review-bg)] px-3 py-2 text-[12.5px] text-[#B45309] dark:text-amber-300">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        {failedCount} of {list.length} projects could not be read from the ledger, so the totals below may be understated.
                    </div>
                )}

                {/* KPIs */}
                <section aria-label="Totals" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
                    <KpiCard title="Total Allocation" valueText={inr(totals.received)} description={`Across ${totals.projectsWithFunds} funded project${totals.projectsWithFunds === 1 ? "" : "s"}`} icon={PiggyBank} tone="violet" loading={isLoading} error={failed} />
                    <KpiCard title="Committed" valueText={inr(totals.committed)} description={`${totals.utilization}% of allocation`} icon={HandCoins} tone="amber" loading={isLoading} error={failed} />
                    <KpiCard title="Paid" valueText={inr(totals.paid)} description={`${inr(totals.awaitingPayment)} awaiting payment`} icon={Banknote} tone="blue" loading={isLoading} error={failed} />
                    <KpiCard title="Available" valueText={inr(totals.commitable)} description={`${inr(totals.actualBalance)} actual balance`} icon={CircleDollarSign} tone="emerald" loading={isLoading} error={failed} />
                </section>

                {/* Projects */}
                <Panel icon={<FolderKanban className="size-4" />} tone="violet" title="My Projects" subtitle="Account summary per project. Select a project to filter the ledger below.">
                    {isLoading ? (
                        <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-zinc-200/70 dark:bg-zinc-700/50" />)}</div>
                    ) : list.length === 0 ? (
                        <p className="p-4 text-[13px] text-[var(--psd-body)]">{failed ? "" : "You have no funded projects with a project number yet."}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] text-left text-[12.5px]">
                                <thead className="bg-[var(--psd-bg)]"><tr>
                                    <Th>Project</Th><Th right tint={C.alloc.head}>Allocation</Th><Th right tint={C.commit.head}>Committed</Th><Th right tint={C.paid.head}>Paid</Th><Th right tint={C.avail.head}>Available</Th><Th>Utilization</Th><Th />
                                </tr></thead>
                                <tbody className="divide-y divide-[var(--psd-border)]">
                                    {projRows.map((p) => (
                                        <tr key={p.project_no} onClick={() => pickProject(p.project_no)} style={{ boxShadow: `inset 3px 0 0 ${p.failed ? "#F04455" : utilColor(p.utilization)}` }} className={cn("cursor-pointer transition-colors hover:bg-[var(--psd-primary-light)]/50", projectFilter === p.project_no && "bg-[var(--psd-primary-light)]")}>
                                            <td className="max-w-[320px] px-3 py-2">
                                                <div className="truncate font-semibold text-[var(--psd-heading)]">{p.project_title}</div>
                                                <div className="font-mono text-[11px] text-[var(--psd-muted)]">{p.project_no}</div>
                                            </td>
                                            {p.failed ? (
                                                <td colSpan={5} className="px-3 py-2 text-[12px] text-[var(--psd-returned)]">Couldn't read the ledger for this project</td>
                                            ) : (
                                                <>
                                                    <td className={cn("px-3 py-2 text-right font-medium tabular-nums", C.alloc.text)}>{inr(p.received)}</td>
                                                    <td className={cn("px-3 py-2 text-right font-medium tabular-nums", C.commit.text)}>{inr(p.committed)}</td>
                                                    <td className={cn("px-3 py-2 text-right font-medium tabular-nums", C.paid.text)}>{inr(p.paid)}</td>
                                                    <td className={cn("px-3 py-2 text-right font-bold tabular-nums", C.avail.text)}>{inr(p.commitable)}</td>
                                                    <td className="w-[150px] px-3 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800">
                                                                <div className="h-full rounded-full" style={{ width: `${Math.min(p.utilization, 100)}%`, background: utilColor(p.utilization) }} />
                                                            </div>
                                                            <span className="w-9 text-right text-[11px] font-semibold tabular-nums text-[var(--psd-heading)]">{p.utilization}%</span>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/project-details-overview/${p.name}`); }}
                                                    aria-label={`Open ${p.project_no}`}
                                                    title="Open project"
                                                    className="psd-focus grid size-7 place-items-center rounded-md text-[var(--psd-muted)] transition-colors hover:bg-[var(--psd-primary-light)] hover:text-[var(--psd-primary)]"
                                                >
                                                    <ExternalLink className="size-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!isLoading && list.length > PROJECT_PAGE_SIZE && (
                        <div className="flex items-center justify-between border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-2">
                            <p className="text-xs font-medium tabular-nums text-[var(--psd-body)]">
                                {(projPageSafe - 1) * PROJECT_PAGE_SIZE + 1}–{Math.min(projPageSafe * PROJECT_PAGE_SIZE, list.length)} of {list.length} projects
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium tabular-nums text-[var(--psd-body)]">{projPageSafe} / {projPages}</span>
                                <button disabled={projPageSafe === 1} onClick={() => setProjPage(projPageSafe - 1)} aria-label="Previous projects page" className="psd-focus inline-flex items-center gap-1 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--psd-body)] hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-3.5" /> Previous</button>
                                <button disabled={projPageSafe === projPages} onClick={() => setProjPage(projPageSafe + 1)} aria-label="Next projects page" className="psd-focus inline-flex items-center gap-1 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--psd-body)] hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight className="size-3.5" /></button>
                            </div>
                        </div>
                    )}
                </Panel>

                {/* Ledger records */}
                <div ref={ledgerRef} className="scroll-mt-4">
                    <Panel
                        icon={<History className="size-4" />}
                        tone="blue"
                        title="Ledger Records"
                        subtitle={`${filtered.length} of ${allRows.length} transactions across all your projects`}
                        action={
                            <button onClick={exportCsv} disabled={filtered.length === 0} className="psd-focus inline-flex items-center gap-1.5 rounded-lg border border-[var(--psd-border)] px-2.5 py-1 text-xs font-semibold text-[var(--psd-heading)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] disabled:opacity-40">
                                <Download className="size-3.5" /> Export CSV
                            </button>
                        }
                    >
                        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--psd-border)] px-4 py-2.5">
                            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--psd-muted)]" />
                                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search particulars, ref, BMR…" className={cn(field, "w-full pl-8")} />
                            </div>
                            <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setHeadFilter(""); setPage(1); }} className={cn(field, "max-w-[220px]")} aria-label="Project">
                                <option value="">All projects</option>
                                {list.map((p) => <option key={p.project_no} value={p.project_no}>{p.project_no}</option>)}
                            </select>
                            <select value={headFilter} onChange={(e) => { setHeadFilter(e.target.value); setPage(1); }} className={cn(field, "max-w-[200px]")} aria-label="Budget head">
                                <option value="">All budget heads</option>
                                {headOptions.map((h) => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className={field} aria-label="Type">
                                <option value="">All types</option>
                                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {(projectFilter || headFilter || typeFilter || search) && (
                                <button onClick={() => { setProjectFilter(""); setHeadFilter(""); setTypeFilter(""); setSearch(""); setPage(1); }} className="text-xs font-semibold text-[var(--psd-primary)] hover:underline">Clear</button>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-700/50" />)}</div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                                <span className="grid size-10 place-items-center rounded-xl bg-[var(--psd-primary-light)] text-[var(--psd-primary)]"><SearchX className="size-5" strokeWidth={1.6} /></span>
                                <p className="text-[13px] font-semibold text-[var(--psd-heading)]">{allRows.length === 0 ? "No ledger records yet" : "No transactions match"}</p>
                                <p className="text-xs text-[var(--psd-body)]">{allRows.length === 0 ? "Fund received, commitments and payments on your projects will appear here." : "Try a different search or clear the filters."}</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[980px] text-left text-[12.5px]">
                                        <thead className="bg-[var(--psd-bg)]"><tr>
                                            <Th>Date</Th><Th>Project</Th><Th>Budget Head</Th><Th>Particulars</Th><Th>Type</Th><Th right tint={C.avail.head}>Received</Th><Th right tint={C.commit.head}>Committed</Th><Th right tint={C.paid.head}>Payment</Th><Th right tint={C.alloc.head}>Commit Bal.</Th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-[var(--psd-border)]">
                                            {pageRows.map((r, i) => {
                                                const label = typeLabel(r.type);
                                                const cancelled = r.status === "CANCELLED";
                                                return (
                                                    <tr key={`${r.project_no}-${r.head}-${r.transactionId}-${i}`} className={cn("transition-colors hover:bg-[var(--psd-primary-light)]/40", cancelled && "opacity-55")}>
                                                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[var(--psd-body)]">{fmtDate(r.date)}</td>
                                                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-[var(--psd-heading)]">{r.project_no}</td>
                                                        <td className="px-3 py-2 text-[var(--psd-body)]">{r.head}</td>
                                                        <td className="max-w-[340px] px-3 py-2">
                                                            <div className={cn("truncate text-[var(--psd-heading)]", cancelled && "line-through")} title={r.particulars}>{r.particulars || "—"}</div>
                                                            {(r.ref || r.bmr || r.frapAppId) && (
                                                                <div className="truncate text-[11px] text-[var(--psd-muted)]">{[r.frapAppId, r.ref, r.bmr && `BMR ${r.bmr}`].filter(Boolean).join(" · ")}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2"><span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", typePill(label))}>{cancelled ? "Cancelled" : label}</span></td>
                                                        <td className={cn("px-3 py-2 text-right font-medium tabular-nums", r.received ? C.avail.text : "text-[var(--psd-muted)]")}>{amt(r.received)}</td>
                                                        <td className={cn("px-3 py-2 text-right font-medium tabular-nums", r.committed ? C.commit.text : "text-[var(--psd-muted)]")}>{amt(r.committed)}</td>
                                                        <td className={cn("px-3 py-2 text-right font-medium tabular-nums", r.payment ? C.paid.text : "text-[var(--psd-muted)]")}>{amt(r.payment)}</td>
                                                        <td className={cn("px-3 py-2 text-right tabular-nums", C.alloc.text)}>{amt(r.commitableBalance)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-[var(--psd-border)] bg-[var(--psd-bg)] font-semibold text-[var(--psd-heading)]">
                                                <td colSpan={5} className="px-3 py-2 text-right text-[11px] uppercase tracking-wider text-[var(--psd-body)]">Total of {filtered.length} filtered</td>
                                                <td className={cn("px-3 py-2 text-right tabular-nums", C.avail.text)}>{amt(sums.rec)}</td>
                                                <td className={cn("px-3 py-2 text-right tabular-nums", C.commit.text)}>{amt(sums.com)}</td>
                                                <td className={cn("px-3 py-2 text-right tabular-nums", C.paid.text)}>{amt(sums.pay)}</td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                {pages > 1 && (
                                    <div className="flex items-center justify-between border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-2">
                                        <p className="text-xs font-medium tabular-nums text-[var(--psd-body)]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium tabular-nums text-[var(--psd-body)]">{page} / {pages}</span>
                                            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page" className="psd-focus inline-flex items-center gap-1 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--psd-body)] hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-3.5" /> Previous</button>
                                            <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page" className="psd-focus inline-flex items-center gap-1 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--psd-body)] hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight className="size-3.5" /></button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </Panel>
                </div>
            </div>
        </div>
    );
}

export default PiFinancialDashboard;
