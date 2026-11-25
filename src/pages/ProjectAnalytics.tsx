import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeAuth, useFrappeGetDocList } from 'frappe-react-sdk';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { ArrowLeft, FileText, CheckCircle, Clock, AlertCircle, PieChart as PieIcon, CalendarRange, Landmark, SearchX, FolderKanban, Search, ChevronLeft, ChevronRight, BellRing, CalendarDays, Hourglass, Layers, BadgeCheck } from 'lucide-react';
import { cn } from "@/lib/utils";
import { KpiCard } from '@/components/dashboard/KpiCard';
import "@/pages/dashboards/projectStaffDashboard.css";

// --- Types & derivation ---
// Analytics are computed from the user's Project Registration list (the same data the Projects page
// shows), so they work without a dedicated analytics endpoint.

interface ProjectRow {
    name: string;
    project_title?: string;
    project_no?: string;
    workflow_state?: string;
    creation?: string;
    modified?: string;
    project_type?: string;
}

type Slice = { name: string; value: number; color: string };

const STATUS_COLORS = {
    approved: '#0DA875',
    pending: '#F59E0B',
    draft: '#9299A9',
    rejected: '#F04455',
    other: '#4775E8',
};
const TYPE_COLORS = ['#6842D9', '#4775E8', '#0DA875', '#F59E0B', '#E94B60', '#F47721'];

const statusColor = (state: string) => {
    const s = state.toLowerCase();
    if (s.includes('reject') || s.includes('cancel')) return STATUS_COLORS.rejected;
    if (s.includes('pending')) return STATUS_COLORS.pending;
    if (s.includes('draft')) return STATUS_COLORS.draft;
    if (s.includes('approved') || s.includes('complete') || s.includes('closed')) return STATUS_COLORS.approved;
    return STATUS_COLORS.other;
};

const countBy = <T,>(rows: T[], key: (r: T) => string) => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(key(r), (m.get(key(r)) || 0) + 1));
    return [...m.entries()];
};

function deriveAnalytics(rows: ProjectRow[]) {
    const state = (r: ProjectRow) => (r.workflow_state || 'Draft').trim();
    const has = (r: ProjectRow, re: RegExp) => re.test(state(r).toLowerCase());
    return {
        stats: {
            total: rows.length,
            // Approved projects are the running ones; completed/closed are counted separately.
            active: rows.filter((r) => has(r, /^approved|proposal approved/) && !has(r, /complete|closed/)).length,
            completed: rows.filter((r) => has(r, /complete|closed/)).length,
            pending: rows.filter((r) => has(r, /pending/)).length,
        },
        status: countBy(rows, state)
            .map(([name, value]): Slice => ({ name, value, color: statusColor(name) }))
            .sort((a, b) => b.value - a.value),
        year: countBy(rows.filter((r) => r.creation), (r) => String(new Date(r.creation as string).getFullYear()))
            .map(([year, projects]) => ({ year, projects }))
            .sort((a, b) => a.year.localeCompare(b.year)),
        type: countBy(rows, (r) => (r.project_type || 'Unspecified').trim() || 'Unspecified')
            .sort((a, b) => b[1] - a[1])
            .map(([name, value], i): Slice => ({ name, value, color: TYPE_COLORS[i % TYPE_COLORS.length] })),
    };
}

// --- Shared chart styling (tokens from projectStaffDashboard.css) ---

const AXIS_TICK = { fill: 'var(--psd-body)', fontSize: 11 };
const GRID_STROKE = 'var(--psd-border)';
const TOOLTIP_STYLE: React.CSSProperties = {
    borderRadius: 10,
    border: '1px solid var(--psd-border)',
    background: 'var(--psd-surface)',
    color: 'var(--psd-heading)',
    boxShadow: '0 8px 24px -10px rgba(21,27,50,0.25)',
    fontSize: 12,
};

// --- Components ---

const Panel = ({
    icon,
    title,
    subtitle,
    className,
    compact,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    className?: string;
    compact?: boolean;
    children: React.ReactNode;
}) => (
    <section className={cn('psd-card overflow-hidden', className)}>
        <div className={cn('flex items-center gap-2.5 border-b border-[var(--psd-border)]', compact ? 'px-3 py-1.5' : 'px-4 py-2.5')}>
            <span className="grid size-7 place-items-center rounded-lg bg-[var(--psd-primary-light)] text-[var(--psd-primary)]">
                {icon}
            </span>
            <div className="min-w-0">
                <h3 className="text-[14px] font-semibold leading-tight text-[var(--psd-heading)]">{title}</h3>
                {subtitle && <p className="text-[11px] text-[var(--psd-body)]">{subtitle}</p>}
            </div>
        </div>
        <div className={compact ? 'p-3' : 'p-4'}>{children}</div>
    </section>
);

const EmptyChart = ({ height }: { height: number }) => (
    <div className="flex flex-col items-center justify-center gap-2 text-[var(--psd-body)]" style={{ height }}>
        <span className="grid size-10 place-items-center rounded-xl bg-[var(--psd-primary-light)] text-[var(--psd-primary)]">
            <SearchX className="size-5" strokeWidth={1.6} />
        </span>
        <p className="text-[13px] font-medium">No data available</p>
    </div>
);

const ChartSkeleton = ({ height }: { height: number }) => (
    <div className="animate-pulse rounded-lg bg-zinc-200/70 dark:bg-zinc-700/50" style={{ height }} />
);

const fmtDate = (d?: string) => {
    const t = d ? new Date(d.replace(' ', 'T')) : null;
    return t && !isNaN(t.getTime()) ? t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};
const TABLE_PAGE = 8;

const waiting = (d?: string) => {
    const t = d ? new Date(d.replace(' ', 'T')).getTime() : NaN;
    if (isNaN(t)) return '';
    const days = Math.floor((Date.now() - t) / 86400000);
    return days < 1 ? 'Updated today' : days === 1 ? 'Waiting 1 day' : `Waiting ${days} days`;
};

const StatusPill = ({ state }: { state: string }) => {
    const c = statusColor(state);
    return (
        <span
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
            style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}
        >
            <span className="size-1.5 rounded-full" style={{ background: c }} />
            {state}
        </span>
    );
};

const ProjectAnalytics = () => {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();

    const { data: projects, isLoading, error } = useFrappeGetDocList<ProjectRow>(
        'Project Registration',
        {
            fields: ['name', 'project_title', 'project_no', 'workflow_state', 'creation', 'modified', 'project_type'],
            filters: [['pi_webmail', '=', currentUser ?? '']],
            limit: 1000,
        },
        currentUser ? undefined : null,
    );

    const failed = !!error;
    const { stats, status: statusData, year: yearData, type: typeData } = React.useMemo(
        () => deriveAnalytics(projects ?? []),
        [projects],
    );
    const charts = { status: statusData, year: yearData, types: typeData };
    const statusTotal = charts.status.reduce((sum, s) => sum + (s.value || 0), 0);
    const typeHeight = Math.max(84, charts.types.length * 26 + 8);

    // Extra project information (no funds): what needs attention, what changed lately, and a few facts
    const info = React.useMemo(() => {
        const rows = (projects ?? []).map((p) => ({ ...p, state: (p.workflow_state || 'Draft').trim() }));
        const when = (p: { modified?: string; creation?: string }) => p.modified || p.creation || '';
        const attention = rows
            .filter((p) => /draft|reject|return|pending/i.test(p.state))
            .sort((a, b) => (when(a) < when(b) ? -1 : 1))
            .slice(0, 5);
        const recent = rows.slice().sort((a, b) => (when(a) < when(b) ? 1 : -1)).slice(0, 5);
        const dated = rows.filter((p) => p.creation).sort((a, b) => ((a.creation as string) < (b.creation as string) ? 1 : -1));
        const ageMonths = dated.length
            ? Math.round(dated.reduce((n, p) => n + (Date.now() - new Date((p.creation as string).replace(' ', 'T')).getTime()) / 2629800000, 0) / dated.length)
            : 0;
        const submitted = rows.filter((p) => !/draft/i.test(p.state)).length;
        const approved = rows.filter((p) => /^approved|proposal approved|complete|closed/i.test(p.state)).length;
        return {
            attention,
            recent,
            latest: dated[0],
            ageMonths,
            topType: typeData[0],
            approvedShare: submitted ? Math.round((approved / submitted) * 100) : 0,
            submitted,
        };
    }, [projects, typeData]);

    // Portfolio table: every project of the PI, most recently updated first
    const [query, setQuery] = React.useState('');
    const [tablePage, setTablePage] = React.useState(1);
    const portfolio = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        return (projects ?? [])
            .slice()
            .sort((a, b) => (((a.modified || a.creation || '') < (b.modified || b.creation || '')) ? 1 : -1))
            .filter((p) => !q || [p.project_title, p.project_no, p.name, p.workflow_state, p.project_type].some((v) => (v || '').toLowerCase().includes(q)));
    }, [projects, query]);
    const tablePages = Math.max(1, Math.ceil(portfolio.length / TABLE_PAGE));
    const tablePageSafe = Math.min(tablePage, tablePages);
    const tableRows = portfolio.slice((tablePageSafe - 1) * TABLE_PAGE, tablePageSafe * TABLE_PAGE);
    const openProject = (p: ProjectRow) => {
        const approved = p.workflow_state === 'Approved' || p.workflow_state === 'Proposal Approved';
        navigate(approved ? `/project-details-overview/${p.name}` : `/project-details/${p.name}`);
    };

    return (
        <div className="psd-root min-h-screen font-sans">
            <div className="w-full px-0 pb-6 pt-0">
                {/* Header */}
                <header className="psd-hero relative mb-3 flex items-center justify-between gap-3 overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2">
                    <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                        <button
                            onClick={() => navigate(-1)}
                            aria-label="Go back"
                            className="psd-focus grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]"
                        >
                            <ArrowLeft className="size-4" />
                        </button>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">Insights</div>
                            <h1 className="mt-0.5 text-[17px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">
                                Project Analytics
                            </h1>
                        </div>
                    </div>
                    <p className="relative z-10 hidden text-xs text-[var(--psd-body)] sm:block">Your projects at a glance</p>
                </header>

                {failed && (
                    <div role="alert" className="mb-3 flex items-start gap-2.5 rounded-lg border border-[var(--psd-returned)]/30 bg-[var(--psd-returned-bg)] px-3 py-2.5 text-[13px] text-[#C42B3C] dark:text-rose-300">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <div>
                            <p className="font-semibold">Couldn't load your projects</p>
                            <p className="text-[12px] opacity-90">
                                The project list didn't load, so the figures below are empty rather than zero. Please refresh the page, or contact support if it continues.
                            </p>
                        </div>
                    </div>
                )}

                {/* KPIs */}
                <section aria-label="Summary" className="mb-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
                    <KpiCard title="Total Projects" value={stats.total} description="All your projects" icon={FileText} tone="violet" loading={isLoading} error={failed} />
                    <KpiCard title="Active Projects" value={stats.active} description="Currently running" icon={Clock} tone="emerald" loading={isLoading} error={failed} />
                    <KpiCard title="Completed" value={stats.completed} description="Finished projects" icon={CheckCircle} tone="blue" loading={isLoading} error={failed} />
                    <KpiCard title="Pending Review" value={stats.pending} description="Awaiting action" icon={AlertCircle} tone="amber" loading={isLoading} error={failed} />
                </section>

                {/* Compact charts */}
                <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <Panel compact icon={<PieIcon className="size-3.5" />} title="Status" subtitle="Projects by status">
                        {isLoading ? (
                            <ChartSkeleton height={100} />
                        ) : charts.status.length > 0 ? (
                            <div className="flex items-center gap-3">
                                <div className="relative size-[100px] shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={charts.status} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={2} dataKey="value" stroke="var(--psd-surface)" strokeWidth={2}>
                                                {charts.status.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-[15px] font-bold leading-none tabular-nums text-[var(--psd-heading)]">{statusTotal}</span>
                                        <span className="text-[9px] text-[var(--psd-body)]">projects</span>
                                    </div>
                                </div>
                                <ul className="min-w-0 flex-1 space-y-1">
                                    {charts.status.slice(0, 5).map((st) => (
                                        <li key={st.name} className="flex items-center gap-1.5 text-[11.5px]">
                                            <span className="size-2 shrink-0 rounded-full" style={{ background: st.color }} />
                                            <span className="min-w-0 flex-1 truncate text-[var(--psd-body)]">{st.name}</span>
                                            <span className="font-semibold tabular-nums text-[var(--psd-heading)]">{st.value}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <EmptyChart height={100} />
                        )}
                    </Panel>

                    <Panel compact icon={<CalendarRange className="size-3.5" />} title="By Year" subtitle="Projects initiated each year">
                        {isLoading ? (
                            <ChartSkeleton height={100} />
                        ) : charts.year.length > 0 ? (
                            <div className="h-[100px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={charts.year} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                                        <XAxis dataKey="year" tick={AXIS_TICK} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                                        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip cursor={{ fill: 'var(--psd-primary-light)' }} contentStyle={TOOLTIP_STYLE} />
                                        <Bar dataKey="projects" name="Projects" fill="var(--psd-primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyChart height={100} />
                        )}
                    </Panel>

                    <Panel compact icon={<Landmark className="size-3.5" />} title="By Type" subtitle="Research, consultancy and others">
                        {isLoading ? (
                            <ChartSkeleton height={100} />
                        ) : charts.types.length > 0 ? (
                            <div className="w-full" style={{ height: Math.max(100, typeHeight) }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={charts.types} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                                        <XAxis type="number" hide allowDecimals={false} />
                                        <YAxis dataKey="name" type="category" tick={AXIS_TICK} axisLine={false} tickLine={false} width={82} />
                                        <Tooltip cursor={{ fill: 'var(--psd-primary-light)' }} contentStyle={TOOLTIP_STYLE} />
                                        <Bar dataKey="value" name="Projects" radius={[0, 4, 4, 0]} maxBarSize={14} label={{ position: 'right', fontSize: 11, fill: 'var(--psd-heading)' }}>
                                            {charts.types.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyChart height={100} />
                        )}
                    </Panel>
                </div>

                {/* Project facts */}
                <section aria-label="Project facts" className="psd-card mb-3 grid grid-cols-2 divide-x divide-y divide-[var(--psd-border)] overflow-hidden sm:grid-cols-4 sm:divide-y-0">
                    {([
                        { icon: <CalendarDays className="size-3.5" />, tone: '#6842D9', bg: '#F0EBFF', label: 'Latest registered', value: info.latest ? fmtDate(info.latest.creation) : '—', sub: info.latest?.project_title || info.latest?.name || '' },
                        { icon: <Hourglass className="size-3.5" />, tone: '#E99A16', bg: '#FFF3D9', label: 'Average project age', value: info.ageMonths ? `${info.ageMonths} month${info.ageMonths === 1 ? '' : 's'}` : '—', sub: 'Since registration' },
                        { icon: <Layers className="size-3.5" />, tone: '#4775E8', bg: '#EEF3FF', label: 'Most common type', value: info.topType?.name || '—', sub: info.topType ? `${info.topType.value} project${info.topType.value === 1 ? '' : 's'}` : '' },
                        { icon: <BadgeCheck className="size-3.5" />, tone: '#0DA875', bg: '#E3F7EF', label: 'Approved (of submitted)', value: info.submitted ? `${info.approvedShare}%` : '—', sub: `${info.submitted} submitted` },
                    ]).map((f) => (
                        <div key={f.label} className="flex items-center gap-2.5 px-3 py-2">
                            <span className="grid size-7 shrink-0 place-items-center rounded-lg" style={{ background: f.bg, color: f.tone }}>{f.icon}</span>
                            <div className="min-w-0 leading-tight">
                                <div className="text-[10.5px] font-medium text-[var(--psd-body)]">{f.label}</div>
                                {isLoading ? <div className="mt-0.5 h-4 w-16 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-700/60" /> : <div className="truncate text-[14px] font-bold text-[var(--psd-heading)]">{f.value}</div>}
                                <div className="truncate text-[10.5px] text-[var(--psd-muted)]">{f.sub}</div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Attention + all projects, side by side */}
                <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
                    <Panel compact icon={<BellRing className="size-3.5" />} title="Needs Attention" subtitle="Drafts, returned and pending projects, longest waiting first">
                        {isLoading ? (
                            <ChartSkeleton height={120} />
                        ) : info.attention.length === 0 ? (
                            <p className="py-6 text-center text-[12.5px] text-[var(--psd-body)]">Nothing waiting. All your projects are up to date.</p>
                        ) : (
                            <ul className="-mx-3 -my-3 divide-y divide-[var(--psd-border)]">
                                {info.attention.map((p) => (
                                    <li key={p.name}>
                                        <button onClick={() => openProject(p)} className="psd-focus flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--psd-primary-light)]/50">
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[12.5px] font-semibold text-[var(--psd-heading)]">{p.project_title || p.name}</span>
                                                <span className="block text-[11px] text-[var(--psd-muted)]">{waiting(p.modified || p.creation)}</span>
                                            </span>
                                            <StatusPill state={p.state} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    {/* All projects */}
                    {/* All projects */}
                    <Panel icon={<FolderKanban className="size-4" />} title="All My Projects" subtitle="Status and latest update for every project. Click a row to open it." className="lg:col-span-2">
                        <div className="-mx-4 -mt-4 mb-3 flex items-center gap-2 border-b border-[var(--psd-border)] px-4 py-2.5">
                            <div className="relative w-full sm:max-w-xs">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--psd-muted)]" />
                                <input
                                    value={query}
                                    onChange={(e) => { setQuery(e.target.value); setTablePage(1); }}
                                    placeholder="Search title, number, status, type…"
                                    className="h-8 w-full rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] pl-8 pr-2.5 text-[12.5px] text-[var(--psd-heading)] outline-none focus:border-[var(--psd-primary)] focus:ring-2 focus:ring-[var(--psd-primary)]/15"
                                />
                            </div>
                            <span className="ml-auto text-xs font-medium tabular-nums text-[var(--psd-body)]">{portfolio.length} project{portfolio.length === 1 ? '' : 's'}</span>
                        </div>
                        {isLoading ? (
                            <ChartSkeleton height={200} />
                        ) : portfolio.length === 0 ? (
                            <EmptyChart height={160} />
                        ) : (
                            <div className="-mx-4 -mb-4 overflow-x-auto">
                                <table className="w-full min-w-[640px] text-left text-[12.5px]">
                                    <thead className="bg-[var(--psd-bg)]">
                                        <tr className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--psd-body)]">
                                            <th className="px-4 py-2">Project</th>
                                            <th className="px-3 py-2">Type</th>
                                            <th className="px-3 py-2">Status</th>
                                            <th className="px-3 py-2">Created</th>
                                            <th className="px-3 py-2">Last updated</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--psd-border)]">
                                        {tableRows.map((p) => {
                                            const state = (p.workflow_state || 'Draft').trim();
                                            return (
                                                <tr key={p.name} onClick={() => openProject(p)} className="cursor-pointer transition-colors hover:bg-[var(--psd-primary-light)]/50" style={{ boxShadow: `inset 3px 0 0 ${statusColor(state)}` }}>
                                                    <td className="max-w-[320px] px-4 py-2">
                                                        <div className="truncate font-semibold text-[var(--psd-heading)]">{p.project_title || p.name}</div>
                                                        <div className="font-mono text-[11px] text-[var(--psd-muted)]">{p.project_no || p.name}</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-[var(--psd-body)]">{(p.project_type || 'Unspecified').trim() || 'Unspecified'}</td>
                                                    <td className="px-3 py-2"><StatusPill state={state} /></td>
                                                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[var(--psd-body)]">{fmtDate(p.creation)}</td>
                                                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[var(--psd-body)]">{fmtDate(p.modified)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {portfolio.length > TABLE_PAGE && (
                                    <div className="flex items-center justify-between border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-2">
                                        <p className="text-xs font-medium tabular-nums text-[var(--psd-body)]">{(tablePageSafe - 1) * TABLE_PAGE + 1}–{Math.min(tablePageSafe * TABLE_PAGE, portfolio.length)} of {portfolio.length}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium tabular-nums text-[var(--psd-body)]">{tablePageSafe} / {tablePages}</span>
                                            <button disabled={tablePageSafe === 1} onClick={() => setTablePage(tablePageSafe - 1)} aria-label="Previous page" className="psd-focus inline-flex items-center gap-1 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--psd-body)] hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-3.5" /> Previous</button>
                                            <button disabled={tablePageSafe === tablePages} onClick={() => setTablePage(tablePageSafe + 1)} aria-label="Next page" className="psd-focus inline-flex items-center gap-1 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--psd-body)] hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight className="size-3.5" /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Panel>
                </div>
            </div>
        </div>
    );
};

export default ProjectAnalytics;
