import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetCall, useFrappeGetDoc, useFrappeGetDocList } from "frappe-react-sdk";
import {
    Activity,
    AlertTriangle,
    ArrowDownUp,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    Clock,
    Inbox,
    Mail,
    RefreshCw,
    Search,
    X,
} from "lucide-react";
import { CurrentTime } from "@/components/DashboardCards";
import { StaffLeaderboardCard } from "@/components/StaffLeaderboardCard";
import { FundingAgencyName } from "@/components/FundingAgencyName";
import { UserFullName } from "@/components/UserFullName";
import { cn } from "@/lib/utils";

/* ───────────────────────── types ───────────────────────── */

export interface CategorizedTaskRow {
    status: string;
    module: string;
    title: string;
    project_no: string;
    date: string;
    owner: string;
    doctype: string;
    name: string;
    mod_vis: number | null;
    deposit_slip?: string;
}

interface TaskRecord {
    name: string;
    title: string;
    status: string;
    creation: string;
    modified: string;
    owner: string;
}

interface TaskGroup {
    doctype: string;
    records: TaskRecord[];
}

interface PendingTaskResponse {
    message: {
        research: CategorizedTaskRow[];
        consultancy: CategorizedTaskRow[];
        others: CategorizedTaskRow[];
    };
}

interface TaskRegistryResponse {
    message: { results: TaskGroup[] };
}

interface ListItem {
    name: string;
    title: string;
    status: string;
    date: string;
    owner: string;
    doctype: string;
    projectNo?: string;
}

export interface QuickLink {
    label: string;
    description: string;
    path: string;
    icon: React.ReactNode;
}

export interface ApproverDashboardProps {
    title: string;
    /** Label for the pending-approvals queue, e.g. "Final Approvals". */
    queueLabel: string;
    quickLinks: QuickLink[];
    /** Replaces the default pending rule (`mod_vis` set, or an Advance Settlement). */
    includePending?: (row: CategorizedTaskRow) => boolean;
}

/* ───────────────────────── helpers ───────────────────────── */

const OVERDUE_DAYS = 7;
const PAGE_STEP = 10;

const statusStyle = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (["pending", "under review", "approval pending"].some((t) => s.includes(t)))
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40";
    if (s.includes("approved"))
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40";
    if (s.includes("draft"))
        return "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
    if (s.includes("rejected"))
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/40";
    if (s.includes("forwarded") || s.includes("processed"))
        return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/40";
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40";
};

const pendingRoute = (doctype: string, id: string) => {
    if (doctype === "Fund Received") return `/fund-received/${id}`;
    if (doctype === "Reimbursement") return `/reimbursement/${id}`;
    if (doctype === "Advance Settlement") return `/advance-settlement/${id}`;
    if (doctype === "Temporary Advance") return `/pending-tasks/${encodeURIComponent(doctype)}/${id}`;
    if (doctype === "Project Staff Details") return `/project-staff-joining?docname=${encodeURIComponent(id)}`;
    if (doctype === "Miscellaneous Commit") return `/miscellaneous-commit/${id}`;
    if (doctype === "Loan Request") return `/loan-request/${id}`;
    if (doctype === "Proforma_Invoice") return `/proforma-invoice/${id}`;
    return `/pending-tasks/${doctype}/${id}`;
};

const registryRoute = (doctype: string, id: string) => {
    if (doctype === "Fund Received") return `/fund-received/${id}`;
    if (doctype === "Reimbursement") return `/reimbursement/${id}`;
    return `/task-registry/${doctype}/${id}`;
};

const ageInDays = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    if (Number.isNaN(t)) return 0;
    return Math.floor((Date.now() - t) / 86400000);
};

const absoluteDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const relativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/* ───────────────────────── component ───────────────────────── */

type Tab = "pending" | "processed";

export function ApproverDashboard({ title, queueLabel, quickLinks, includePending }: ApproverDashboardProps) {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", currentUser ? undefined : null);

    const {
        data: pendingData,
        isLoading: pendingLoading,
        mutate: refreshPending,
        isValidating: pendingValidating,
    } = useFrappeGetCall<PendingTaskResponse>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_categorized_pending_task",
        { page_name: "pending-task" },
    );
    const {
        data: registryData,
        isLoading: registryLoading,
        mutate: refreshRegistry,
        isValidating: registryValidating,
    } = useFrappeGetCall<TaskRegistryResponse>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_task_registry",
        { page_name: "task-registry" },
    );

    // Project context for each row (title / funding agency / PI), keyed by both the
    // project number and the document name since pending rows may carry either.
    const { data: projectList } = useFrappeGetDocList<{
        name: string;
        project_no?: string;
        project_title?: string;
        funding_agen?: string;
        pi_webmail?: string;
    }>("Project Registration", {
        fields: ["name", "project_no", "project_title", "funding_agen", "pi_webmail"],
        limit: 5000,
    });
    const projectIndex = React.useMemo(() => {
        const map = new Map<string, NonNullable<typeof projectList>[number]>();
        projectList?.forEach((p) => {
            map.set(p.name, p);
            if (p.project_no) map.set(p.project_no, p);
        });
        return map;
    }, [projectList]);

    const [tab, setTab] = React.useState<Tab>("pending");
    const [search, setSearch] = React.useState("");
    const [moduleFilter, setModuleFilter] = React.useState<string | null>(null);
    const [overdueOnly, setOverdueOnly] = React.useState(false);
    const [newestFirst, setNewestFirst] = React.useState(true);
    const [visible, setVisible] = React.useState(PAGE_STEP);

    const isLoading = pendingLoading || registryLoading;
    const isRefreshing = pendingValidating || registryValidating;
    const fullName = userData?.full_name || currentUser || "Guest";

    const pendingItems = React.useMemo<ListItem[]>(() => {
        if (!pendingData?.message) return [];
        const rows = [
            ...(pendingData.message.research ?? []),
            ...(pendingData.message.consultancy ?? []),
            ...(pendingData.message.others ?? []),
        ];
        return rows
            .filter((r) => (includePending ? includePending(r) : Boolean(r.mod_vis) || r.doctype === "Advance Settlement"))
            .map((r) => ({
                name: r.name,
                title: r.title,
                status: r.status,
                date: r.date,
                owner: r.owner,
                doctype: r.doctype,
                projectNo: r.project_no,
            }));
    }, [pendingData, includePending]);

    const processedItems = React.useMemo<ListItem[]>(() => {
        const out: ListItem[] = [];
        registryData?.message?.results?.forEach((group) => {
            group.records?.forEach((r) =>
                out.push({
                    name: r.name,
                    title: r.title,
                    status: r.status,
                    date: r.modified || r.creation,
                    owner: r.owner,
                    doctype: group.doctype,
                    // The registry endpoint isn't typed to return a project reference, but
                    // some doctypes include one — use it when present to show project details.
                    projectNo:
                        (r as any).project_no ||
                        (r as any).project_number ||
                        (r as any).project ||
                        undefined,
                }),
            );
        });
        return out;
    }, [registryData]);

    const overdueCount = React.useMemo(
        () => pendingItems.filter((t) => ageInDays(t.date) > OVERDUE_DAYS).length,
        [pendingItems],
    );
    const todayCount = React.useMemo(() => {
        const today = new Date().toDateString();
        return [...pendingItems, ...processedItems].filter((t) => new Date(t.date).toDateString() === today).length;
    }, [pendingItems, processedItems]);

    const source = tab === "pending" ? pendingItems : processedItems;

    const moduleBreakdown = React.useMemo(() => {
        const counts: Record<string, number> = {};
        source.forEach((t) => {
            counts[t.doctype] = (counts[t.doctype] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([doctype, count]) => ({ doctype, count }))
            .sort((a, b) => b.count - a.count);
    }, [source]);
    const maxModule = Math.max(...moduleBreakdown.map((m) => m.count), 1);

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = source.filter((t) => {
            if (moduleFilter && t.doctype !== moduleFilter) return false;
            if (overdueOnly && tab === "pending" && ageInDays(t.date) <= OVERDUE_DAYS) return false;
            if (!q) return true;
            const proj = t.projectNo ? projectIndex.get(t.projectNo) : undefined;
            return [t.title, t.name, t.owner, t.doctype, t.status, t.projectNo, proj?.project_title, proj?.pi_webmail].some((v) =>
                v?.toLowerCase().includes(q),
            );
        });
        list.sort((a, b) => {
            const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
            return newestFirst ? diff : -diff;
        });
        return list;
    }, [source, search, moduleFilter, overdueOnly, newestFirst, tab, projectIndex]);

    React.useEffect(() => {
        setVisible(PAGE_STEP);
    }, [tab, search, moduleFilter, overdueOnly, newestFirst]);

    const switchTab = (next: Tab) => {
        setTab(next);
        setModuleFilter(null);
        setOverdueOnly(false);
    };

    const refresh = () => {
        refreshPending();
        refreshRegistry();
    };

    const hasFilters = Boolean(search || moduleFilter || overdueOnly);
    const clearFilters = () => {
        setSearch("");
        setModuleFilter(null);
        setOverdueOnly(false);
    };

    const kpis = [
        {
            key: "pending",
            label: "Pending",
            value: pendingItems.length,
            hint: "Awaiting your approval",
            icon: <ClipboardCheck className="h-4 w-4" />,
            color: "#D97757",
            active: tab === "pending" && !overdueOnly,
            onClick: () => {
                switchTab("pending");
            },
        },
        {
            key: "overdue",
            label: `Overdue (>${OVERDUE_DAYS}d)`,
            value: overdueCount,
            hint: "Needs attention",
            icon: <AlertTriangle className="h-4 w-4" />,
            color: "#DC2626",
            active: tab === "pending" && overdueOnly,
            onClick: () => {
                setTab("pending");
                setModuleFilter(null);
                setOverdueOnly((v) => (tab === "pending" ? !v : true));
            },
        },
        {
            key: "processed",
            label: "Processed",
            value: processedItems.length,
            hint: "Approved / forwarded",
            icon: <CheckCircle2 className="h-4 w-4" />,
            color: "#059669",
            active: tab === "processed",
            onClick: () => switchTab("processed"),
        },
        {
            key: "today",
            label: "Today's Activity",
            value: todayCount,
            hint: "Modified today",
            icon: <Activity className="h-4 w-4" />,
            color: "#2563EB",
            active: false,
            onClick: () => {
                setSearch("");
                setNewestFirst(true);
            },
        },
    ];

    return (
        <div className="w-full space-y-3 font-sans">
            {/* Header */}
            <div className="overflow-hidden rounded-lg border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                <div className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-[18px] font-extrabold leading-tight text-[#3F3F46] dark:text-[#E4E4E7]">{title}</h1>
                        <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                            Welcome back, <span className="font-bold text-[#2563EB] dark:text-blue-400">{fullName}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={refresh}
                            disabled={isRefreshing}
                            title="Refresh data"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] px-2.5 text-[12px] font-semibold text-[#52525B] transition-colors hover:bg-[#EEF2FF] disabled:opacity-60 dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#A1A1AA]"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                            Refresh
                        </button>
                        <CurrentTime />
                    </div>
                </div>
            </div>

            {/* KPI tiles — click to filter the list */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {kpis.map((k) => (
                    <button
                        key={k.key}
                        type="button"
                        onClick={k.onClick}
                        aria-pressed={k.active}
                        className={cn(
                            "group flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-[#27272A]",
                            k.active
                                ? "border-[#4A6CF7] ring-2 ring-[#4A6CF7]/20"
                                : "border-[#E4E4E7] dark:border-[#3F3F46]",
                        )}
                    >
                        <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `color-mix(in srgb, ${k.color} 12%, transparent)`, color: k.color }}
                        >
                            {k.icon}
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[11px] font-extrabold uppercase tracking-wide text-[#71717A] dark:text-[#A1A1AA]">
                                {k.label}
                            </span>
                            <span className="block text-[22px] font-extrabold leading-tight tabular-nums" style={{ color: k.color }}>
                                {isLoading ? "—" : k.value}
                            </span>
                            <span className="block truncate text-[11px] text-[#71717A] dark:text-[#A1A1AA]">{k.hint}</span>
                        </span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                {/* Work queue */}
                <section className="overflow-hidden rounded-lg border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2 dark:border-[#4A6CF7]/30 dark:bg-[#1E3A8A]/18">
                        <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 dark:bg-[#18181B]">
                            {(
                                [
                                    ["pending", queueLabel, pendingItems.length],
                                    ["processed", "Recently Processed", processedItems.length],
                                ] as const
                            ).map(([key, label, count]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => switchTab(key)}
                                    className={cn(
                                        "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-bold transition-colors",
                                        tab === key
                                            ? "bg-[#2563EB] text-white shadow-sm"
                                            : "text-[#52525B] hover:bg-[#EEF2FF] dark:text-[#A1A1AA] dark:hover:bg-[#27272A]",
                                    )}
                                >
                                    {label}
                                    <span
                                        className={cn(
                                            "rounded-full px-1.5 text-[10px] font-extrabold",
                                            tab === key ? "bg-white/25 text-white" : "bg-[#F4F4F5] text-[#52525B] dark:bg-[#3F3F46] dark:text-[#D4D4D8]",
                                        )}
                                    >
                                        {isLoading ? "…" : count}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate(tab === "pending" ? "/pending-task" : "/task-registry")}
                            className="inline-flex items-center gap-1 text-[12px] font-bold text-[#1E3A8A] hover:underline dark:text-[#C7D2FE]"
                        >
                            Open full {tab === "pending" ? "inbox" : "registry"}
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* toolbar */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-[#E4E4E7] px-3 py-2 dark:border-[#3F3F46]">
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71717A]" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search title, ID, owner, module…"
                                className="h-8 w-full rounded-lg border border-[#D4D4D8] bg-[#FAFAF9] pl-8 pr-2 text-[12px] text-[#3F3F46] outline-none focus:border-[#4A6CF7] focus:ring-2 focus:ring-[#4A6CF7]/20 dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setNewestFirst((v) => !v)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D4D4D8] bg-white px-2.5 text-[12px] font-semibold text-[#52525B] transition-colors hover:bg-[#EEF2FF] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#A1A1AA]"
                            title="Toggle sort order"
                        >
                            <ArrowDownUp className="h-3.5 w-3.5" />
                            {newestFirst ? "Newest first" : "Oldest first"}
                        </button>
                        {tab === "pending" && (
                            <button
                                type="button"
                                onClick={() => setOverdueOnly((v) => !v)}
                                aria-pressed={overdueOnly}
                                className={cn(
                                    "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold transition-colors",
                                    overdueOnly
                                        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                                        : "border-[#D4D4D8] bg-white text-[#52525B] hover:bg-red-50 dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#A1A1AA]",
                                )}
                            >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Overdue only
                            </button>
                        )}
                        {hasFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-[#2563EB] hover:underline"
                            >
                                <X className="h-3.5 w-3.5" />
                                Clear
                            </button>
                        )}
                    </div>

                    {moduleFilter && (
                        <div className="border-b border-[#E4E4E7] bg-[#FAFAF9] px-3 py-1.5 text-[12px] text-[#52525B] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#A1A1AA]">
                            Module: <span className="font-bold text-[#1E3A8A] dark:text-[#C7D2FE]">{moduleFilter}</span>
                        </div>
                    )}

                    {/* rows */}
                    <div className="divide-y divide-[#F4F4F5] dark:divide-[#3F3F46]">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                                    <div className="h-9 w-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                                        <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                                    </div>
                                </div>
                            ))
                        ) : filtered.length === 0 ? (
                            <div className="px-4 py-10 text-center">
                                <Inbox className="mx-auto mb-2 h-8 w-8 text-[#D4D4D8]" />
                                <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                                    {hasFilters ? "Nothing matches these filters" : tab === "pending" ? "No pending approvals" : "No processed documents yet"}
                                </p>
                                {hasFilters && (
                                    <button type="button" onClick={clearFilters} className="mt-1 text-[12px] font-semibold text-[#2563EB] hover:underline">
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            filtered.slice(0, visible).map((t) => {
                                const age = ageInDays(t.date);
                                const overdue = tab === "pending" && age > OVERDUE_DAYS;
                                const proj = t.projectNo ? projectIndex.get(t.projectNo) : undefined;
                                return (
                                    <button
                                        key={`${t.doctype}-${t.name}`}
                                        type="button"
                                        onClick={() => navigate(tab === "pending" ? pendingRoute(t.doctype, t.name) : registryRoute(t.doctype, t.name))}
                                        className="group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[#EEF2FF] dark:hover:bg-[#3F3F46]/40"
                                    >
                                        <span
                                            className={cn(
                                                "w-1 self-stretch rounded-full",
                                                overdue ? "bg-red-500" : tab === "pending" ? "bg-amber-400" : "bg-emerald-400",
                                            )}
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="mb-0.5 flex flex-wrap items-center gap-1.5">
                                                <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold", statusStyle(t.status))}>
                                                    {t.status}
                                                </span>
                                                <span className="text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">{t.doctype}</span>
                                                {overdue && (
                                                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/30 dark:text-red-400">
                                                        {age}d old
                                                    </span>
                                                )}
                                            </span>
                                            <span className="block truncate text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{t.title}</span>
                                            {proj?.project_title && (
                                                <span className="block truncate text-[11px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
                                                    Project: {proj.project_title}
                                                </span>
                                            )}
                                            <span className="block truncate text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                                {t.owner} · {relativeTime(t.date)}
                                            </span>
                                        </span>
                                        <span className="hidden w-[190px] shrink-0 flex-col gap-1 lg:flex">
                                            {proj ? (
                                                <>
                                                    <span className="min-w-0">
                                                        <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[#A1A1AA]">PI</span>
                                                        <span className="block truncate text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                            {proj.pi_webmail ? <UserFullName email={proj.pi_webmail} /> : <span className="text-[#A1A1AA]">—</span>}
                                                        </span>
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[#A1A1AA]">Funding agency</span>
                                                        <span className="block truncate text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                            {proj.funding_agen ? <FundingAgencyName value={proj.funding_agen} /> : <span className="text-[#A1A1AA]">—</span>}
                                                        </span>
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="min-w-0">
                                                        <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[#A1A1AA]">Applicant</span>
                                                        <span className="block truncate text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                            {t.owner ? <UserFullName email={t.owner} /> : <span className="text-[#A1A1AA]">—</span>}
                                                        </span>
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[#A1A1AA]">
                                                            {tab === "processed" ? "Processed on" : "Submitted on"}
                                                        </span>
                                                        <span className="block truncate text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                            {absoluteDate(t.date) || "—"}
                                                        </span>
                                                    </span>
                                                </>
                                            )}
                                        </span>
                                        <span className="hidden shrink-0 flex-col items-end gap-1 text-right sm:flex">
                                            {t.projectNo && (
                                                <span className="max-w-[180px] truncate rounded border border-[#C7D2FE] bg-[#EEF2FF] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#1E3A8A] dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/15 dark:text-[#C7D2FE]">
                                                    {t.projectNo}
                                                </span>
                                            )}
                                            <span className="text-[11px] font-medium text-[#52525B] dark:text-[#A1A1AA]">
                                                {absoluteDate(t.date)}
                                            </span>
                                        </span>
                                        <span
                                            className={cn(
                                                "hidden h-7 shrink-0 items-center gap-1 rounded-md border px-2.5 text-[12px] font-bold transition-colors md:inline-flex",
                                                tab === "pending"
                                                    ? "border-[#2563EB] bg-[#2563EB] text-white group-hover:bg-[#1D4ED8]"
                                                    : "border-[#D4D4D8] bg-white text-[#2563EB] group-hover:bg-[#EEF2FF] dark:border-[#3F3F46] dark:bg-[#18181B]",
                                            )}
                                        >
                                            {tab === "pending" ? "Review" : "View"}
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {!isLoading && filtered.length > 0 && (
                        <div className="flex items-center justify-between border-t border-[#E4E4E7] bg-[#FAFAF9] px-3 py-2 text-[12px] text-[#52525B] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#A1A1AA]">
                            <span>
                                Showing {Math.min(visible, filtered.length)} of {filtered.length}
                            </span>
                            {visible < filtered.length && (
                                <button
                                    type="button"
                                    onClick={() => setVisible((v) => v + PAGE_STEP)}
                                    className="rounded-lg border border-[#D4D4D8] bg-white px-2.5 py-1 text-[12px] font-bold text-[#2563EB] hover:bg-[#EEF2FF] dark:border-[#3F3F46] dark:bg-[#27272A]"
                                >
                                    Show {Math.min(PAGE_STEP, filtered.length - visible)} more
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* Side column */}
                <aside className="space-y-3">
                    <section className="rounded-lg border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                        <div className="flex items-center justify-between border-b border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2 dark:border-[#4A6CF7]/30 dark:bg-[#1E3A8A]/18">
                            <h3 className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-[#1E3A8A] dark:text-[#C7D2FE]">
                                <Clock className="h-3.5 w-3.5" />
                                {tab === "pending" ? "Pending" : "Processed"} by module
                            </h3>
                            {moduleFilter && (
                                <button type="button" onClick={() => setModuleFilter(null)} className="text-[11px] font-bold text-[#2563EB] hover:underline">
                                    Reset
                                </button>
                            )}
                        </div>
                        <div className="max-h-72 space-y-1 overflow-y-auto p-2">
                            {moduleBreakdown.length === 0 ? (
                                <p className="px-2 py-4 text-center text-[12px] text-[#71717A]">No data</p>
                            ) : (
                                moduleBreakdown.map(({ doctype, count }) => {
                                    const active = moduleFilter === doctype;
                                    return (
                                        <button
                                            key={doctype}
                                            type="button"
                                            onClick={() => setModuleFilter(active ? null : doctype)}
                                            aria-pressed={active}
                                            className={cn(
                                                "w-full rounded-md px-2 py-1.5 text-left transition-colors",
                                                active ? "bg-[#EEF2FF] ring-1 ring-[#4A6CF7]/40 dark:bg-[#4A6CF7]/15" : "hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]/40",
                                            )}
                                        >
                                            <span className="mb-1 flex items-center justify-between gap-2">
                                                <span className="truncate text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{doctype}</span>
                                                <span className="text-[12px] font-extrabold tabular-nums text-[#3F3F46] dark:text-[#E4E4E7]">{count}</span>
                                            </span>
                                            <span className="block h-1.5 overflow-hidden rounded-full bg-[#F4F4F5] dark:bg-[#3F3F46]">
                                                <span
                                                    className="block h-full rounded-full bg-[#4A6CF7] transition-all duration-500"
                                                    style={{ width: `${(count / maxModule) * 100}%` }}
                                                />
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section className="space-y-2">
                        {quickLinks.map((l) => (
                            <button
                                key={l.path + l.label}
                                type="button"
                                onClick={() => navigate(l.path)}
                                className="group flex w-full items-center gap-3 rounded-lg border border-[#E4E4E7] bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#4A6CF7]/40 hover:shadow-md dark:border-[#3F3F46] dark:bg-[#27272A]"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4A6CF7] transition-colors group-hover:bg-[#4A6CF7] group-hover:text-white dark:bg-[#4A6CF7]/15">
                                    {l.icon}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{l.label}</span>
                                    <span className="block truncate text-[11px] text-[#71717A] dark:text-[#A1A1AA]">{l.description}</span>
                                </span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-[#D4D4D8] group-hover:text-[#4A6CF7]" />
                            </button>
                        ))}
                    </section>
                </aside>
            </div>

            <StaffLeaderboardCard />

            <footer className="pb-2 text-center text-[#71717A] dark:text-[#A1A1AA]">
                <div className="flex items-center justify-center gap-2 text-[12px]">
                    <Mail className="size-3.5" />
                    <p>
                        For any query, e-mail to{" "}
                        <a href="mailto:ernd@iitg.ac.in" className="font-semibold text-[#D97757] hover:underline">
                            ernd@iitg.ac.in
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}
