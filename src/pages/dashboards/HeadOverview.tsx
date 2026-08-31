

////// v2



import * as React from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
    useFrappeAuth,
    useFrappeGetDoc,
    useFrappeGetCall,
    useFrappeGetDocList,
} from "frappe-react-sdk";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LabelList,
} from "recharts";
import {
    FileDown,
    Printer,
    BarChart3,
    Users,
    Search,
    Building2,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    X,
    Filter,
    FileText,
    TrendingUp,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const CHART_COLORS = [
    "#2563eb",
    "#7c3aed",
    "#059669",
    "#d97706",
    "#0284c7",
    "#e11d48",
    "#64748b",
];

const formatCurrency = (amount: number): string => {
    if (!amount) return "₹0";
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${amount.toLocaleString("en-IN")}`;
};

function normalizeFundResp(raw: any): any[] {
    if (!raw) return [];
    if (raw.message && raw.message.message && Array.isArray(raw.message.message)) return raw.message.message;
    if (raw.message && Array.isArray(raw.message)) return raw.message;
    if (Array.isArray(raw)) return raw;
    if (raw.data && Array.isArray(raw.data)) return raw.data;
    if (raw.results && Array.isArray(raw.results)) return raw.results;
    if (raw.message && raw.message.data && Array.isArray(raw.message.data)) return raw.message.data;
    return [];
}

// ── Cache for Fund Received API calls (shared across the dashboard's lifetime) ──
const fundReceivedPromiseCache: Record<string, Promise<number>> = {};
// Resolved per-project amount, keyed by docname — lets consumers read a single
// project's utilized amount synchronously (e.g. to split the aggregate total by
// project type) without re-deriving it from the promise cache.
const fundReceivedValueCache: Record<string, number> = {};

// ── Hook: fetch approved Fund Received total for a list of projects ─────────────
function usePIFundReceivedTotal(projects: any[]) {
    const [total, setTotal] = React.useState<number | null>(null);
    const [loading, setLoading] = React.useState(false);
    const projectNamesKey = projects.map((p: any) => p.name).filter(Boolean).join(",");

    React.useEffect(() => {
        const projectNames = projects.filter((p: any) => p.name).map((p: any) => p.name);
        if (projectNames.length === 0) { setTotal(null); return; }
        let cancelled = false;
        setLoading(true);
        Promise.all(
            projectNames.map((docname: string) => {
                if (!fundReceivedPromiseCache[docname]) {
                    fundReceivedPromiseCache[docname] = fetch(
                        `/api/method/rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg?prjreg_title=${encodeURIComponent(docname)}&limit=200&start=0`,
                        { headers: { "X-Frappe-CSRF-Token": (window as any).csrf_token || "" } }
                    )
                        .then(r => r.json())
                        .then(json => normalizeFundResp(json))
                        .then(records => {
                            const amount = records
                                .filter((r: any) => {
                                    const s = (r.workflow_state || r.status || "").toLowerCase();
                                    return s === "approved" || s.includes("fund received");
                                })
                                .reduce((s: number, r: any) => s + (Number(r.fund_received_amt) || Number(r.amount_received) || Number(r.amount) || 0), 0);
                            fundReceivedValueCache[docname] = amount;
                            return amount;
                        })
                        .catch(() => 0);
                }
                return fundReceivedPromiseCache[docname];
            })
        ).then(amounts => {
            if (!cancelled) {
                setTotal(amounts.reduce((a, b) => a + b, 0));
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectNamesKey]);

    return { total, loading };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-2.5 mb-3 mt-1">
            <span className="text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.1em] whitespace-nowrap">
                {title}
            </span>
            <div className="flex-1 h-[1px] bg-[#E4E4E7] dark:bg-[#3F3F46]" />
        </div>
    );
}

function KpiCard({
    label,
    value,
    subtext,
    icon,
    valueColor,
    iconBg,
    circleColor,
    onClick,
    description,
    badges,
    onBadgeClick,
    valueAdornment,
    customBottom,
    isLoading,
}: {
    label: string;
    value: string;
    subtext: string;
    icon: React.ReactNode;
    valueColor: string;
    iconBg: string;
    circleColor: string;
    onClick?: () => void;
    description?: string;
    badges?: Array<{
        label: string;
        count: number;
        dotColor: string;
        bgClass: string;
        textClass: string;
        title?: string;
        originalState?: string;
        sublabel?: string;
    }>;
    onBadgeClick?: (badgeLabel: string) => void;
    valueAdornment?: React.ReactNode;
    customBottom?: React.ReactNode;
    isLoading?: boolean;
}) {
    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all flex flex-col h-full min-h-[136px]${onClick ? " cursor-pointer select-none" : ""}`}
        >
            <div
                className="absolute bottom-0 right-0 w-[90px] h-[90px] rounded-full translate-x-5 translate-y-5"
                style={{ backgroundColor: circleColor, opacity: 0.07 }}
            />
            <div className="flex items-start gap-3 mb-1.5">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: iconBg, color: circleColor }}
                >
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide mb-0.5">
                        {label}
                    </div>
                    {description && (
                        <div className="text-[12px] text-[#52525B] dark:text-[#D4D4D8] font-semibold mb-1 leading-snug">
                            {description}
                        </div>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className={`text-[26px] font-extrabold tracking-tight leading-none drop-shadow-sm ${valueColor}`}>
                            {isLoading ? (
                                <span className="text-[13px] font-bold text-[#A1A1AA] dark:text-[#71717A] animate-pulse">Loading…</span>
                            ) : (
                                value
                            )}
                        </div>
                        {valueAdornment}
                    </div>
                </div>
            </div>
            <div className="mt-auto pt-3 w-full">
                {customBottom ? (
                    customBottom
                ) : badges && badges.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                        {badges.map((b) => (
                            <span
                                key={b.label}
                                onClick={
                                    onBadgeClick
                                        ? (e) => {
                                            e.stopPropagation();
                                            onBadgeClick(b.originalState || b.label);
                                        }
                                        : undefined
                                }
                                className={`inline-flex items-start gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 ${b.bgClass} ${b.textClass}${onBadgeClick ? " cursor-pointer hover:brightness-95 transition-all" : ""}`}
                                title={b.title}
                            >
                                <span className={`w-2 h-2 rounded-full ${b.dotColor} mt-1 shrink-0`} />
                                <span className="flex flex-col leading-tight">
                                    <span>{b.count} {b.label}</span>
                                    {b.sublabel && (
                                        <span className="text-[10px] font-semibold opacity-70">{b.sublabel}</span>
                                    )}
                                </span>
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] font-semibold leading-tight mt-2">
                        {subtext || "\u00A0"}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status?: string }) {
    if (!status) return <span className="text-[#A1A1AA] text-[9px]">—</span>;

    if (status === "ongoing")
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-500 shrink-0" />
                Ongoing (Sanctioned)
            </span>
        );
    if (status === "submitted")
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-blue-500 shrink-0" />
                Submitted (Pending Sanction)
            </span>
        );
    if (status === "draft")
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-zinc-400 shrink-0" />
                Draft
            </span>
        );
    if (status === "completed")
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-violet-500 shrink-0" />
                Completed
            </span>
        );
    if (status === "cancelled")
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-red-500 shrink-0" />
                Cancelled
            </span>
        );

    const s = status.toLowerCase();
    if (s.includes("ongoing") || s.includes("sanctioned") || s.includes("active"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-500 shrink-0" />
                Ongoing (Sanctioned)
            </span>
        );
    if (s.includes("submitted") || s.includes("pending sanction"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-blue-500 shrink-0" />
                Submitted (Pending Sanction)
            </span>
        );
    if (s.includes("draft"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-zinc-400 shrink-0" />
                Draft
            </span>
        );
    if (s.includes("complet"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-violet-500 shrink-0" />
                Completed
            </span>
        );
    if (s.includes("cancel") || s.includes("reject"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-red-500 shrink-0" />
                Cancelled
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 whitespace-nowrap">
            <span className="w-[5px] h-[5px] rounded-full bg-zinc-400 shrink-0" />
            {status}
        </span>
    );
}

// ── PI modal: live fund-status badge (mirrors DirectorDashboard's ProjectFundStatusBadge) ──
// Replaces a date-only Active/Upcoming/Completed guess with the real workflow signal: a
// project only counts as Active once its sanction is approved AND the fund has actually
// been received — dates alone can't tell you that.
const ProjectFundStatusBadge: React.FC<{ projectName: string | undefined }> = ({ projectName }) => {
    const { data: sanctionResp, isLoading: sanctionLoading } = useFrappeGetCall<{ message: any }>(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project",
        { project_name: projectName || "" },
        projectName ? undefined : null,
        { revalidateOnFocus: false },
    );
    const { data: fundResp, isLoading: fundLoading } = useFrappeGetCall<{ message: any }>(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
        { prjreg_title: projectName || "", limit: 200, start: 0 },
        projectName ? undefined : null,
        { revalidateOnFocus: false },
    );
    const isLoading = sanctionLoading || fundLoading;

    const raw = sanctionResp as any;
    let sanctionRecords: any[] = [];
    if (raw) {
        if (raw.message && raw.message.message && Array.isArray(raw.message.message)) sanctionRecords = raw.message.message;
        else if (raw.message && Array.isArray(raw.message)) sanctionRecords = raw.message;
        else if (Array.isArray(raw)) sanctionRecords = raw;
        else if (raw.data && Array.isArray(raw.data)) sanctionRecords = raw.data;
        else if (raw.message && raw.message.data && Array.isArray(raw.message.data)) sanctionRecords = raw.message.data;
    }
    const fundRecords: any[] = normalizeFundResp(fundResp);

    const hasSanctionApproved = sanctionRecords.some(r => (r.sanction_workflow_status || r.workflow_state || "").toLowerCase().includes("sanction approved"));
    const isFundApproved = (r: any) => {
        const s = (r.workflow_state || r.status || "").toLowerCase();
        return s === "approved" || s.includes("fund received");
    };
    const hasFundReceived = fundRecords.some(isFundApproved);

    let label: string;
    let className: string;
    if (hasSanctionApproved && hasFundReceived) {
        label = "● Active";
        className = "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400";
    } else if (hasSanctionApproved) {
        label = "Pending Fund Received";
        className = "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400";
    } else {
        label = "Pending Sanction";
        className = "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400";
    }

    if (isLoading) {
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 animate-pulse">Loading…</span>;
    }
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${className}`}>{label}</span>;
};

// ── PI modal: live-corrected sanction amount ──────────────────────────────────
// total_budget_amount/grand_total_proposal is 0 for a lot of real projects — the true
// sanctioned amount then only lives on the Fund Sanction record. Falls back to a live
// per-project lookup only when the row's own budget field is empty.
const ProjectSanctionAmountLive: React.FC<{ proj: any; className?: string; emptyClassName?: string }> = ({ proj, className, emptyClassName }) => {
    const bulkAmount = Number(proj.total_budget_amount || proj.grand_total_proposal) || 0;
    const needsLiveLookup = bulkAmount <= 0;
    const { data: sanctionResp, isLoading } = useFrappeGetCall<{ message: any }>(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project",
        { project_name: proj.name || "" },
        needsLiveLookup && proj.name ? undefined : null,
        { revalidateOnFocus: false },
    );

    const fmt = (v: number) => v >= 10000000
        ? `₹${(v / 10000000).toFixed(2)} Cr`
        : v >= 100000
            ? `₹${(v / 100000).toFixed(2)} L`
            : `₹${v.toLocaleString("en-IN")}`;

    if (!needsLiveLookup) return <div className={className}>{fmt(bulkAmount)}</div>;
    if (isLoading) return <div className={`${emptyClassName ?? className ?? ""} animate-pulse`}>Loading…</div>;

    const raw = sanctionResp as any;
    let records: any[] = [];
    if (raw) {
        if (raw.message && raw.message.message && Array.isArray(raw.message.message)) records = raw.message.message;
        else if (raw.message && Array.isArray(raw.message)) records = raw.message;
        else if (Array.isArray(raw)) records = raw;
        else if (raw.data && Array.isArray(raw.data)) records = raw.data;
        else if (raw.message && raw.message.data && Array.isArray(raw.message.data)) records = raw.message.data;
    }
    const approved = records.find(r => (r.sanction_workflow_status || r.workflow_state || "").toLowerCase().includes("sanction approved") && Number(r.total_sanctioned_amount) > 0);
    const anyWithAmount = records.find(r => Number(r.total_sanctioned_amount) > 0);
    const liveAmount = Number((approved || anyWithAmount)?.total_sanctioned_amount) || 0;

    return liveAmount > 0 ? <div className={className}>{fmt(liveAmount)}</div> : <div className={emptyClassName ?? className}>—</div>;
};

// ── PI modal: stat cards row (extracted to satisfy Rules of Hooks — usePIFundReceivedTotal
// can't be called from inside a nested render-time closure) ────────────────────
const PIStatCardsHead: React.FC<{ piDetails: any; projects: any[] }> = ({ piDetails, projects }) => {
    const totalSanctioned = projects.reduce((sum: number, proj: any) => {
        const own = Number(proj.total_budget_amount || proj.grand_total_proposal) || 0;
        return sum + own;
    }, 0);
    const { total: liveFundTotal, loading: fundTotalLoading } = usePIFundReceivedTotal(projects);

    const fmt = (v: number) => v >= 10000000
        ? `₹${(v / 10000000).toFixed(2)} Cr`
        : v >= 100000
            ? `₹${(v / 100000).toFixed(2)} L`
            : `₹${v.toLocaleString("en-IN")}`;

    const formattedLiveFund = liveFundTotal && liveFundTotal > 0 ? fmt(liveFundTotal) : null;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center flex flex-col justify-center">
                <div className="text-[18px] sm:text-[20px] font-extrabold text-[#2563eb] leading-tight">{piDetails.project_count}</div>
                <div className="text-[9px] sm:text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">Projects</div>
            </div>
            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center flex flex-col justify-center">
                <div className="text-[18px] sm:text-[20px] font-extrabold text-[#7c3aed] leading-tight">{piDetails.departments?.length || 0}</div>
                <div className="text-[9px] sm:text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">Implementing Departments</div>
            </div>
            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center flex flex-col justify-center">
                <div className="text-[18px] sm:text-[20px] font-extrabold text-[#059669] leading-tight">{totalSanctioned > 0 ? fmt(totalSanctioned) : "—"}</div>
                <div className="text-[9px] sm:text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">Sanctioned</div>
            </div>
            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center flex flex-col justify-center">
                <div className="text-[18px] sm:text-[20px] font-extrabold text-[#d97706] leading-tight">
                    {fundTotalLoading ? <span className="text-[12px] font-bold text-[#A1A1AA] animate-pulse">Loading…</span> : formattedLiveFund ?? "—"}
                </div>
                <div className="text-[9px] sm:text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">Fund Rcvd</div>
            </div>
        </div>
    );
};

const BarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl px-3 py-2 text-xs font-bold text-slate-200 shadow-xl">
            <p className="text-slate-400 text-[10px] mb-1 font-bold">{payload[0].payload.year}</p>
            {payload.map((entry: any, i: number) => {
                const val = entry.value;
                const formatted =
                    val >= 10000000
                        ? `₹${(val / 10000000).toFixed(2)} Cr`
                        : val >= 100000
                            ? `₹${(val / 100000).toFixed(2)} L`
                            : `₹${val.toLocaleString("en-IN")}`;
                return (
                    <p key={i} style={{ color: entry.fill }} className="text-[11px]">
                        {entry.name}: {formatted}
                    </p>
                );
            })}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function HeadOverview() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { currentUser } = useFrappeAuth();
    const [time, setTime] = React.useState(new Date());

    const viewMode = searchParams.get("view") || "Overview";

    // ── Pagination / modal state ─────────────────────────────────────────────
    const [kpiModal, setKpiModal] = React.useState<{ type: string; title: string; fundingAgency?: string; excludedFundingAgencies?: string[]; projectType?: string; onlyOngoing?: boolean; fundStatus?: "active" | "pending_fund" } | null>(null);
    const [kpiPage, setKpiPage] = React.useState(1);
    const [kpiTab, setKpiTab] = React.useState<"ongoing" | "submitted">("ongoing");
    const [kpiAllocTab, setKpiAllocTab] = React.useState<string>("ongoing");
    const [piModalPage, setPiModalPage] = React.useState<number>(location.state?.piModalPage || 1);
    const [expandedPI, setExpandedPI] = React.useState<string | null>(location.state?.expandedPI || null);
    const [projectTableFilter, setProjectTableFilter] = React.useState<string>("all");
    const [projectTablePage, setProjectTablePage] = React.useState(1);
    // Header search bar — quick project lookup by title/no/PI/dept, scoped to this
    // department's projects. Mirrors DirectorDashboard's header search.
    const [headerSearchText, setHeaderSearchText] = React.useState("");
    const [headerSearchFocused, setHeaderSearchFocused] = React.useState(false);
    const [piSearch, setPiSearch] = React.useState("");
    const [piPage, setPiPage] = React.useState(1);
    const [piFundingFilter, setPiFundingFilter] = React.useState<string>("all");
    const [showFundingFilterDropdown, setShowFundingFilterDropdown] = React.useState(false);
    const [showAllDepts, setShowAllDepts] = React.useState(false);

    // ── Chart year/type filters (Financial Year — Project Status) ───────────
    const [chartYearFilter, setChartYearFilter] = React.useState<string>("All Time");
    const [chartProjectTypeFilter, setChartProjectTypeFilter] = React.useState<string>("all");
    // ── Chart year/type filters (Financial Trends) ───────────────────────────
    const [financialYearFilter, setFinancialYearFilter] = React.useState<string>("all");
    const [financialProjectTypeFilter, setFinancialProjectTypeFilter] = React.useState<string>("all");

    const KPI_PAGE_SIZE = 10;
    const PROJECT_TABLE_PAGE_SIZE = 10;
    const PI_PROJECTS_PAGE_SIZE = 2;
    const PAGE_SIZE = 10;

    React.useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // ── Fetch current user info & department ─────────────────────────────────
    const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
        fields: ["full_name", "department"],
        enabled: !!currentUser,
    });
    const fullName = userData?.full_name || currentUser || "Guest";
    const userDept = userData?.department || "";

    // ── Fetch Head-level Dashboard Data ──────────────────────────────────────
    const { data: headDataRes, isLoading: isHeadDataLoading } = useFrappeGetCall<{ message: any }>(
        "rndopsapp.dashboard.get_head_dashboard_data",
        { user_email: currentUser, department: userDept },
        { enabled: !!currentUser && !!userDept }
    );
    const headData = headDataRes?.message || {};
    const projectOverview = headData.project_overview || {};
    const fundAnalytics = headData.fund_analytics || {};
    const piWiseProjects = headData.pi_wise_projects || [];

    // ── Fetch dept list for display names ────────────────────────────────────
    const { data: deptList } = useFrappeGetDocList("Department_prornd", {
        fields: ["name", "dept_name"],
        limit: 500,
    });

    const getDeptName = React.useCallback(
        (idOrName: string) => {
            if (!idOrName) return "—";
            if (!deptList) return idOrName;
            const found = deptList.find(
                (d: any) => d.name === idOrName || d.dept_name === idOrName
            );
            return found ? found.dept_name : idOrName;
        },
        [deptList]
    );

    // ── Fetch ALL projects for the specific detailed charts ──────────────────
    const { data: allProjectsList, isLoading } = useFrappeGetDocList(
        "Project Registration",
        {
            fields: [
                "name",
                "project_no",
                "project_title",
                "pi_webmail",
                "implementation_department",
                "workflow_state",
                "project_type",
                "origin_of_funding_agency",
                "funding_agen",
                "select_funding_agency",
                "funding_agency_other",
                "total_budget_amount",
                "grand_total_proposal",
                "prj_start_date",
                "prj_end_date",
                "creation",
            ],
            limit: 2000,
        }
    );

    // Until the user's department resolves, the Head-data call stays disabled — so
    // isHeadDataLoading reports false (not "loading", just "not yet asked"), and every
    // stat/chart briefly renders its empty state ("0", "No data available") instead of a
    // loading indicator. `data === undefined` is the reliable "no response yet" signal here
    // (unlike currentUser/userDept, which can resolve on a slower/different timeline and
    // left the page stuck showing "Loading…" forever when used directly).
    const isPageLoading = isLoading || isHeadDataLoading || allProjectsList === undefined || headDataRes === undefined;

    // Projects — especially freshly Submitted ones that haven't reached sanction yet —
    // often have no prj_start_date at all. Charts that bucket by year were silently
    // dropping those rows (visible as "0 Submitted" totals that didn't match the
    // Research/Consultancy/Others breakdown, which counts regardless of date), so every
    // date-bucketed memo below falls back to the record's creation date instead.
    const getEffectiveStartDate = React.useCallback((p: any) => p.prj_start_date || p.creation || null, []);

    // ── Funding agency ID → display-name map ─────────────────────────────────
    // The real agency name lives behind the `funding_agen` Link field (→ fundingagency_
    // doctype), not the select_funding_agency/funding_agency_other text fields — those are
    // usually empty, which is why the agency column was falling all the way back to
    // origin_of_funding_agency ("National"/"International") for nearly every row.
    const { data: fundingSearchLinkData } = useFrappeGetCall<{ message: { value: string, description: string, label?: string }[] }>(
        "frappe.desk.search.search_link",
        {
            txt: "",
            doctype: "fundingagency_",
            ignore_user_permissions: 1,
            reference_doctype: "Project Registration",
            page_length: 5000
        },
        "funding-agencies-search-link"
    );
    // search_link alone missed some agencies (e.g. IDs "2850", "44" still showed raw), likely
    // due to its own result-scoping quirks — a direct doctype list read has no such cap, so
    // it's the primary source; search_link only fills in anything it happens to add on top.
    const { data: fundingAgencyDocList } = useFrappeGetDocList<{ name: string; funding_agency_name: string }>(
        "fundingagency_",
        { fields: ["name", "funding_agency_name"], limit: 5000 }
    );
    const fundingAgencyMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        if (fundingSearchLinkData?.message && Array.isArray(fundingSearchLinkData.message)) {
            fundingSearchLinkData.message.forEach(opt => {
                if (opt.value) map[opt.value] = opt.description || opt.label || opt.value;
            });
        }
        (fundingAgencyDocList || []).forEach((agency) => {
            if (agency.name && agency.funding_agency_name) map[agency.name] = agency.funding_agency_name;
        });
        return map;
    }, [fundingSearchLinkData, fundingAgencyDocList]);

    // ── Compute ongoing/submitted ID sets specifically from Head API response ──
    // Do this FIRST so deptProjects can use the known IDs as primary filter
    const { deptOngoingIds, deptSubmittedIds } = React.useMemo(() => {
        const ongoing = new Set<string>();
        const submitted = new Set<string>();
        piWiseProjects.forEach((pi: any) => {
            (pi.projects || []).forEach((p: any) => {
                if (p.status === "ongoing") ongoing.add(p.project_id);
                if (p.status === "submitted") submitted.add(p.project_id);
            });
        });
        return { deptOngoingIds: ongoing, deptSubmittedIds: submitted };
    }, [piWiseProjects]);

    // ── Flat project list from Head API (for chart/modal fallback) ────────────
    const apiProjectsFlat = React.useMemo(() => {
        const map: Record<string, any> = {};
        piWiseProjects.forEach((pi: any) => {
            (pi.projects || []).forEach((p: any) => {
                if (!map[p.project_id]) {
                    map[p.project_id] = {
                        name: p.project_id,
                        project_no: p.project_no || "",
                        project_title: p.project_title || p.project_id,
                        pi_webmail: pi.pi_email,
                        workflow_state: p.workflow_state || p.status || "",
                        project_type: p.project_type || "",
                        origin_of_funding_agency: p.origin_of_funding_agency || "",
                        select_funding_agency: p.select_funding_agency || "",
                        funding_agency_other: p.funding_agency_other || "",
                        total_budget_amount: p.total_budget_amount || p.grand_total_proposal || 0,
                        grand_total_proposal: p.grand_total_proposal || 0,
                        prj_start_date: p.prj_start_date || null,
                        prj_end_date: p.prj_end_date || null,
                        implementation_department: userDept,
                        _api_status: p.status,
                    };
                }
            });
        });
        return Object.values(map);
    }, [piWiseProjects, userDept]);

    // ── Filter projects to THIS department only ──────────────────────────────
    // Primary: match by known project IDs from Head API (guaranteed correct)
    // Fallback: match by implementation_department field
    const deptProjects = React.useMemo(() => {
        if (!allProjectsList) return [];
        const allKnownIds = new Set([...deptOngoingIds, ...deptSubmittedIds]);
        if (allKnownIds.size > 0) {
            // Use Head API project IDs — avoids dept ID/name mismatch
            return (allProjectsList as any[]).filter((p) => allKnownIds.has(p.name));
        }
        // Fallback: filter by department field
        if (!userDept) return [];
        return (allProjectsList as any[]).filter(
            (p) => p.implementation_department === userDept
        );
    }, [allProjectsList, userDept, deptOngoingIds, deptSubmittedIds]);

    // Bulk fund-received status for this department's ongoing projects — mirrors
    // DirectorDashboard's fundStatusMap sync, scoped to deptProjects/deptOngoingIds
    // instead of the whole institute. Powers the Ongoing Projects card's Active/
    // Pending Fund split without a per-row live fetch per project.
    const [fundStatusMap, setFundStatusMap] = React.useState<Map<string, boolean>>(new Map());

    React.useEffect(() => {
        let isCancelled = false;
        if (deptProjects.length === 0) return;

        const syncFunds = async () => {
            const map = new Map<string, boolean>();
            const projectsToFetch = deptProjects.filter((p: any) => deptOngoingIds.has(p.name));
            const total = projectsToFetch.length;
            if (total === 0) return;

            const chunkSize = 20;
            for (let i = 0; i < total; i += chunkSize) {
                if (isCancelled) break;
                const chunk = projectsToFetch.slice(i, i + chunkSize);

                await Promise.all(chunk.map(async (p: any) => {
                    try {
                        const csrf = (window as any).csrf_token || "";
                        const headers = { "X-Frappe-CSRF-Token": csrf, "Content-Type": "application/json" };
                        const res = await fetch(`/api/method/rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg?prjreg_title=${encodeURIComponent(p.name)}&limit=10&start=0`, { headers }).then(r => r.json()).catch(() => null);

                        const fundsRaw = res?.message || res?.data || [];
                        const funds = Array.isArray(fundsRaw) ? fundsRaw : (fundsRaw.message || []);

                        const hasFund = funds.some((r: any) => {
                            const s = (r.workflow_state || r.status || "").toLowerCase();
                            return s === "approved" || s.includes("fund received");
                        });
                        map.set(p.name, hasFund);
                    } catch {
                        map.set(p.name, false);
                    }
                }));

                if (!isCancelled) setFundStatusMap(new Map(map));
            }
        };

        syncFunds();
        return () => { isCancelled = true; };
    }, [deptProjects, deptOngoingIds]);

    // ── Resolved department display name ─────────────────────────────────
    // Tries: userDept lookup → first project's implementation_department → raw userDept
    const resolvedDeptName = React.useMemo(() => {
        if (userDept) {
            const n = getDeptName(userDept);
            if (n && n !== "—") return n;
        }
        // Fallback: read implementation_department from first matching project in doclist
        if (allProjectsList) {
            const allKnownIds = new Set([...deptOngoingIds, ...deptSubmittedIds]);
            const firstMatch = (allProjectsList as any[]).find(
                (p) => allKnownIds.has(p.name) && p.implementation_department
            );
            if (firstMatch?.implementation_department) {
                const n2 = getDeptName(firstMatch.implementation_department);
                return n2 && n2 !== "—" ? n2 : firstMatch.implementation_department;
            }
        }
        return userDept || "—";
    }, [userDept, getDeptName, allProjectsList, deptOngoingIds, deptSubmittedIds]);

    // ── Core stats ───────────────────────────────────────────────────────────
    const stats = React.useMemo(() => {
        // Use deptProjects (doclist with full fields) if available; else fall back to apiProjectsFlat
        const source = deptProjects.length > 0 ? deptProjects : apiProjectsFlat;
        const useApiStatus = deptProjects.length === 0;

        let ongoingCount = 0,
            submittedCount = 0,
            researchOngoing = 0,
            researchSubmitted = 0,
            consultancyOngoing = 0,
            consultancySubmitted = 0,
            totalAlloc = 0,
            intlCount = 0;

        const yearMap: Record<string, { year: string; ongoing: number; submitted: number }> = {};
        const startEndMap: Record<string, { year: string; startAmount: number; endAmount: number }> = {};

        source.forEach((p: any) => {
            const isOngoing = useApiStatus ? p._api_status === "ongoing" : deptOngoingIds.has(p.name);
            const isSubmitted = useApiStatus ? p._api_status === "submitted" : deptSubmittedIds.has(p.name);
            if (!isOngoing && !isSubmitted) return;

            const type = (p.project_type || "").toLowerCase();
            const amt = p.total_budget_amount || p.grand_total_proposal || 0;
            const yearLabel = p.prj_start_date
                ? new Date(p.prj_start_date).getFullYear().toString()
                : "Current";

            if (isOngoing) {
                ongoingCount++;
                totalAlloc += amt;
                if (type.includes("research")) researchOngoing++;
                else if (type.includes("consult")) consultancyOngoing++;
            }
            if (isSubmitted) {
                submittedCount++;
                if (type.includes("research")) researchSubmitted++;
                else if (type.includes("consult")) consultancySubmitted++;
            }

            if ((p.origin_of_funding_agency || "").toLowerCase() === "international") intlCount++;

            if (!yearMap[yearLabel]) yearMap[yearLabel] = { year: yearLabel, ongoing: 0, submitted: 0 };
            if (isOngoing) yearMap[yearLabel].ongoing++;
            else yearMap[yearLabel].submitted++;

            // start/end sanction chart
            const startYear = p.prj_start_date ? new Date(p.prj_start_date).getFullYear().toString() : null;
            const endYear = p.prj_end_date ? new Date(p.prj_end_date).getFullYear().toString() : null;
            if (startYear) {
                if (!startEndMap[startYear]) startEndMap[startYear] = { year: startYear, startAmount: 0, endAmount: 0 };
                startEndMap[startYear].startAmount += amt;
            }
            if (endYear) {
                if (!startEndMap[endYear]) startEndMap[endYear] = { year: endYear, startAmount: 0, endAmount: 0 };
                startEndMap[endYear].endAmount += amt;
            }
        });

        return {
            total: ongoingCount + submittedCount,
            ongoing: ongoingCount,
            submitted: submittedCount,
            researchOngoing,
            researchSubmitted,
            researchProjects: researchOngoing + researchSubmitted,
            consultancyOngoing,
            consultancySubmitted,
            consultancyProjects: consultancyOngoing + consultancySubmitted,
            totalAlloc,
            intlCount,
            yearData: Object.values(yearMap).sort((a, b) => a.year.localeCompare(b.year)),
            startEndData: Object.values(startEndMap).sort((a, b) => a.year.localeCompare(b.year)),
        };
    }, [deptProjects, apiProjectsFlat, deptOngoingIds, deptSubmittedIds]);

    const classifyProjectType = (p: any) => {
        const type = (p.project_type || "").toLowerCase();
        const isResearch = type.includes("research") || type === "r&d project";
        const isConsultancy = type.includes("consult") || type === "testing";
        return { isResearch, isConsultancy };
    };

    // Same classification the "Department Projects" table below uses — factored out so
    // the KPI modal can show real Ongoing/Submitted/Draft/etc labels instead of the raw
    // workflow_state fallback (which just showed "Approved" for every row regardless of tab).
    const getDeptProjectStatus = (p: any): string => {
        if (deptOngoingIds.has(p.name)) return "ongoing";
        if (deptSubmittedIds.has(p.name)) return "submitted";
        const s = (p.workflow_state || "").toLowerCase();
        if (s.includes("draft")) return "draft";
        if (s.includes("complet")) return "completed";
        if (s.includes("cancel") || s.includes("reject")) return "cancelled";
        return "pending";
    };

    // ── Financial Year — Project Status: Type + Year filterable chart data ───
    // Recomputed from deptProjects directly (rather than stats.yearData, which has no
    // type dimension) so the Type dropdown can narrow the bars.
    const chartDisplayData = React.useMemo(() => {
        const yearMap: Record<string, { year: string; ongoing: number; submitted: number }> = {};
        deptProjects.forEach((p: any) => {
            const isOngoing = deptOngoingIds.has(p.name);
            const isSubmitted = !isOngoing && deptSubmittedIds.has(p.name);
            if (!isOngoing && !isSubmitted) return;

            if (chartProjectTypeFilter !== "all") {
                const { isResearch, isConsultancy } = classifyProjectType(p);
                if (chartProjectTypeFilter === "research" && !isResearch) return;
                if (chartProjectTypeFilter === "consultancy" && !isConsultancy) return;
                if (chartProjectTypeFilter === "others" && (isResearch || isConsultancy)) return;
            }

            const effDate = getEffectiveStartDate(p);
            if (!effDate) return;
            const yr = new Date(effDate).getFullYear();
            if (isNaN(yr) || yr < 2019 || yr >= 2100) return;
            const yearLabel = String(yr);
            if (!yearMap[yearLabel]) yearMap[yearLabel] = { year: yearLabel, ongoing: 0, submitted: 0 };
            if (isOngoing) yearMap[yearLabel].ongoing += 1;
            else yearMap[yearLabel].submitted += 1;
        });

        let list = Object.values(yearMap).map(d => ({
            year: d.year,
            ongoing: d.ongoing === 0 ? null : d.ongoing,
            submitted: d.submitted === 0 ? null : d.submitted,
        })).sort((a, b) => a.year.localeCompare(b.year));

        if (chartYearFilter !== "All Time") list = list.filter(d => d.year === chartYearFilter);
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deptProjects, deptOngoingIds, deptSubmittedIds, chartProjectTypeFilter, chartYearFilter]);

    // Research/Consultancy/Others split for the panel's legend area — respects the Year
    // filter but always shows all three types regardless of the Type dropdown, so it stays
    // a comparison reference.
    const chartTypeBreakdown = React.useMemo(() => {
        let ro = 0, rs = 0, co = 0, cs = 0, oo = 0, os = 0;
        deptProjects.forEach((p: any) => {
            const isOngoing = deptOngoingIds.has(p.name);
            const isSubmitted = !isOngoing && deptSubmittedIds.has(p.name);
            if (!isOngoing && !isSubmitted) return;

            if (chartYearFilter !== "All Time") {
                const effDate = getEffectiveStartDate(p);
                const yr = effDate ? new Date(effDate).getFullYear() : null;
                if (String(yr) !== chartYearFilter) return;
            }

            const { isResearch, isConsultancy } = classifyProjectType(p);
            if (isResearch) { if (isOngoing) ro++; else rs++; }
            else if (isConsultancy) { if (isOngoing) co++; else cs++; }
            else { if (isOngoing) oo++; else os++; }
        });
        return { researchOngoing: ro, researchSubmitted: rs, consultancyOngoing: co, consultancySubmitted: cs, othersOngoing: oo, othersSubmitted: os };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deptProjects, deptOngoingIds, deptSubmittedIds, chartYearFilter]);

    const chartYearSubmittedTotal = React.useMemo(
        () => chartDisplayData.reduce((s, d) => s + (Number(d.submitted) || 0), 0),
        [chartDisplayData]
    );
    const chartYearOngoingTotal = React.useMemo(
        () => chartDisplayData.reduce((s, d) => s + (Number(d.ongoing) || 0), 0),
        [chartDisplayData]
    );
    const chartAvailableYears = React.useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years: string[] = [];
        for (let y = currentYear; y >= 2019; y--) years.push(String(y));
        return years;
    }, []);

    // ── Financial Trends: Sanctioned / Utilized / Remaining, Type + Year filterable ──
    const financialAvailableYears = React.useMemo(() => {
        const years = new Set<string>();
        deptProjects.forEach((p: any) => {
            const effDate = getEffectiveStartDate(p);
            if (effDate) {
                const yr = new Date(effDate).getFullYear();
                if (yr >= 2000 && yr <= 2100) years.add(yr.toString());
            }
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deptProjects]);

    const fundAlloc = React.useMemo(() => {
        let sum = 0;
        deptProjects.forEach((p: any) => {
            if (!deptOngoingIds.has(p.name)) return;
            if (financialYearFilter !== "all") {
                const effDate = getEffectiveStartDate(p);
                const year = effDate ? new Date(effDate).getFullYear().toString() : null;
                if (year !== financialYearFilter) return;
            }
            if (financialProjectTypeFilter !== "all") {
                const { isResearch, isConsultancy } = classifyProjectType(p);
                if (financialProjectTypeFilter === "research" && !isResearch) return;
                if (financialProjectTypeFilter === "consultancy" && !isConsultancy) return;
                if (financialProjectTypeFilter === "others" && (isResearch || isConsultancy)) return;
            }
            sum += (p.total_budget_amount || p.grand_total_proposal || 0);
        });
        return sum;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deptProjects, deptOngoingIds, financialYearFilter, financialProjectTypeFilter]);

    const ongoingProjectsListForFunds = React.useMemo(() => {
        return deptProjects.filter((p: any) => {
            if (!deptOngoingIds.has(p.name)) return false;
            if (financialYearFilter !== "all") {
                const effDate = getEffectiveStartDate(p);
                const year = effDate ? new Date(effDate).getFullYear().toString() : null;
                if (year !== financialYearFilter) return false;
            }
            if (financialProjectTypeFilter !== "all") {
                const { isResearch, isConsultancy } = classifyProjectType(p);
                if (financialProjectTypeFilter === "research" && !isResearch) return false;
                if (financialProjectTypeFilter === "consultancy" && !isConsultancy) return false;
                if (financialProjectTypeFilter === "others" && (isResearch || isConsultancy)) return false;
            }
            return true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deptProjects, deptOngoingIds, financialYearFilter, financialProjectTypeFilter]);

    const { total: liveFundUtilized, loading: fundUtilizedLoading } = usePIFundReceivedTotal(ongoingProjectsListForFunds);
    const fundUtilized = liveFundUtilized || 0;
    const fundRemaining = Math.max(0, fundAlloc - fundUtilized);
    const fundUtilPercent = fundAlloc > 0 ? ((fundUtilized / fundAlloc) * 100).toFixed(1) : "0";

    // ── Funding sources pie (dept-scoped) ───────────────────────────────────
    const pieChartFundingData = React.useMemo(() => {
        const source = deptProjects.length > 0 ? deptProjects : apiProjectsFlat;
        const useApiStatus = deptProjects.length === 0;
        const agencyMap: Record<string, number> = {};
        source.forEach((p: any) => {
            const isOngoing = useApiStatus ? p._api_status === "ongoing" : deptOngoingIds.has(p.name);
            const isSubmitted = useApiStatus ? p._api_status === "submitted" : deptSubmittedIds.has(p.name);
            if (!isOngoing && !isSubmitted) return;
            let agency =
                (fundingAgencyMap[p.funding_agen] || "").trim() ||
                (p.select_funding_agency || "").trim() ||
                (p.funding_agency_other || "").trim() ||
                (p.origin_of_funding_agency || "").trim() ||
                "Missing Funding Agency Name";
            // "Other"/"Others"/"Other Funding Agency" is the select field's own
            // placeholder label, not a real agency name — defer to funding_agency_other.
            if (/^other/i.test(agency)) {
                agency = (p.funding_agency_other || "").trim() || "Missing Funding Agency Name";
            }
            agencyMap[agency] = (agencyMap[agency] || 0) + 1;
        });
        const arr = Object.entries(agencyMap)
            .map(([funding_agency, value]) => ({ funding_agency, value }))
            .sort((a, b) => b.value - a.value);
        if (arr.length > 6) {
            const top5 = arr.slice(0, 5);
            const othersCount = arr.slice(5).reduce((s, d) => s + d.value, 0);
            return [...top5, { funding_agency: "Others", value: othersCount }];
        }
        return arr;
    }, [deptProjects, apiProjectsFlat, deptOngoingIds, deptSubmittedIds, fundingAgencyMap]);

    // ── PI workload (dept-scoped) directly from Head API ──────────────────────
    const piData = React.useMemo(() => {
        return piWiseProjects.map((pi: any) => ({
            user_email: pi.pi_email,
            user_name: pi.pi_name,
            project_count: pi.project_count,
            departments: [userDept],
            projects: pi.projects
        })).sort((a: any, b: any) => b.project_count - a.project_count);
    }, [piWiseProjects, userDept]);

    // Matches raw Funding Agency doc-ID formats seen in this data — plain numbers
    // ("2074") and short-prefix autonames ("FA-02529") — as opposed to a real
    // agency/company name, which never looks like just an ID.
    const looksLikeAgencyId = (s: string) => /^([A-Za-z]{1,4}-)?\d+$/.test(s);

    const getProjectAgency = React.useCallback((proj: any): string => {
        let resolved = (
            (fundingAgencyMap[proj.funding_agen] || "").trim() ||
            (proj.select_funding_agency || "").trim() ||
            (proj.funding_agency_other || "").trim() ||
            (proj.origin_of_funding_agency || "").trim()
        );
        // "Other"/"Others"/"Other Funding Agency" is the select field's own placeholder
        // label, not a real agency name — defer to funding_agency_other instead.
        if (/^other/i.test(resolved)) {
            resolved = (proj.funding_agency_other || "").trim();
        }
        // Some legacy records have select_funding_agency populated with the raw
        // funding_agen link ID (e.g. "2074" or "FA-02529") instead of a resolved name.
        // If it looks like an ID, try the map once more in case that exact ID happens
        // to be covered (it's keyed by ID -> name) before giving up on it.
        if (resolved && looksLikeAgencyId(resolved) && fundingAgencyMap[resolved]) {
            resolved = fundingAgencyMap[resolved];
        }
        // fundingAgencyMap only covers whatever the search_link API returned, not
        // every ID in the data — a raw ID is never a real agency name, so treat any
        // that's still unresolved as unresolved rather than showing the ID as if it
        // were one.
        if (!resolved || looksLikeAgencyId(resolved)) return "Missing Funding Agency Name";
        return resolved;
    }, [fundingAgencyMap]);

    const piWorkloadAgencies = React.useMemo(() => {
        const agencyMap: Record<string, { agency_name: string; piEmails: Set<string>; project_count: number }> = {};
        deptProjects.forEach((proj: any) => {
            const agency = getProjectAgency(proj);
            const email = (proj.pi_webmail || "").toLowerCase().trim();
            if (!agencyMap[agency]) agencyMap[agency] = { agency_name: agency, piEmails: new Set(), project_count: 0 };
            agencyMap[agency].project_count++;
            if (email) agencyMap[agency].piEmails.add(email);
        });
        return Object.values(agencyMap)
            .sort((a, b) => b.project_count - a.project_count)
            .map(({ agency_name, piEmails, project_count }) => ({ agency_name, pi_count: piEmails.size, project_count }));
    }, [deptProjects, getProjectAgency]);

    const piNameMap = React.useMemo(() => {
        const m: Record<string, string> = {};
        piWiseProjects.forEach((pi: any) => {
            m[pi.pi_email.toLowerCase()] = pi.pi_name;
        });
        return m;
    }, [piWiseProjects]);

    // Header search bar results — matches project title, no, PI email/name, department
    // — scoped to deptProjects, capped to a short list for a dropdown.
    const HEADER_SEARCH_LIMIT = 8;
    const headerSearchResults = React.useMemo(() => {
        const query = headerSearchText.toLowerCase().trim();
        if (!query) return [];
        const matches: any[] = [];
        for (const p of deptProjects) {
            const title = (p.project_title || p.name || "").toLowerCase();
            const projNo = (p.project_no || p.name || "").toLowerCase();
            const piEmail = (p.pi_webmail || "").toLowerCase();
            const piName = (p.pi_webmail ? (piNameMap[p.pi_webmail.toLowerCase().trim()] || p.pi_webmail.split("@")[0]) : "").toLowerCase();
            const deptName = (p.implementation_department || "").toLowerCase();
            if (title.includes(query) || projNo.includes(query) || piEmail.includes(query) || piName.includes(query) || deptName.includes(query)) {
                matches.push(p);
                if (matches.length >= HEADER_SEARCH_LIMIT) break;
            }
        }
        return matches;
    }, [deptProjects, headerSearchText, piNameMap]);

    const filteredPIsFromProjects = React.useMemo(() => {
        if (piFundingFilter === "all") return null;
        const piMap: Record<string, { user_email: string; user_name: string; project_count: number; departments: string[] }> = {};
        deptProjects.forEach((proj: any) => {
            if (getProjectAgency(proj) !== piFundingFilter) return;
            if (!deptOngoingIds.has(proj.name) && !deptSubmittedIds.has(proj.name)) return;
            const email = (proj.pi_webmail || "").toLowerCase().trim();
            if (!email) return;
            if (!piMap[email]) {
                piMap[email] = {
                    user_email: email,
                    user_name: piNameMap[email] || email.split("@")[0],
                    project_count: 0,
                    departments: [userDept]
                };
            }
            piMap[email].project_count++;
        });
        return Object.values(piMap).sort((a, b) => b.project_count - a.project_count);
    }, [deptProjects, piFundingFilter, getProjectAgency, deptOngoingIds, deptSubmittedIds, piNameMap, userDept]);

    const filteredPIs = React.useMemo(() => {
        const source = filteredPIsFromProjects !== null ? filteredPIsFromProjects : piData;
        return source.filter((pi: any) =>
            pi.user_name.toLowerCase().includes(piSearch.toLowerCase()) ||
            pi.user_email.toLowerCase().includes(piSearch.toLowerCase())
        );
    }, [piData, filteredPIsFromProjects, piSearch]);

    const paginatedPIs = React.useMemo(() => {
        const start = (piPage - 1) * PAGE_SIZE;
        return filteredPIs.slice(start, start + PAGE_SIZE);
    }, [filteredPIs, piPage]);
    const piTotalPages = Math.max(1, Math.ceil(filteredPIs.length / PAGE_SIZE));

    // ── Selected PI details & projects ───────────────────────────────────────
    const selectedPIDetails = React.useMemo(
        () => piData.find((p: any) => p.user_email === expandedPI) || null,
        [piData, expandedPI]
    );

    const selectedPIProjects = React.useMemo(() => {
        if (!expandedPI || !deptProjects) return [];
        return deptProjects
            .filter((p: any) => (p.pi_webmail || "").toLowerCase() === expandedPI)
            .sort((a: any, b: any) => {
                const aStart = a.prj_start_date ? new Date(a.prj_start_date).getTime() : 0;
                const bStart = b.prj_start_date ? new Date(b.prj_start_date).getTime() : 0;
                return bStart - aStart;
            });
    }, [expandedPI, deptProjects]);

    // ── KPI modal rows ────────────────────────────────────────────────────────
    // Use deptProjects (doclist) when available; fall back to apiProjectsFlat from Head API
    const kpiModalRows = React.useMemo(() => {
        if (!kpiModal) return [];
        const source = deptProjects.length > 0 ? deptProjects : apiProjectsFlat;
        if (kpiModal.type === "total") {
            if (kpiTab === "submitted") {
                return source.filter((p: any) =>
                    deptProjects.length > 0 ? deptSubmittedIds.has(p.name) : p._api_status === "submitted"
                );
            }
            return source.filter((p: any) =>
                deptProjects.length > 0 ? deptOngoingIds.has(p.name) : p._api_status === "ongoing"
            );
        }
        if (kpiModal.type === "allocation") {
            const base = (() => {
                const tab = kpiModal.type === "allocation" ? kpiAllocTab : kpiTab;
                if (tab === "submitted") {
                    return source.filter((p: any) =>
                        deptProjects.length > 0 ? deptSubmittedIds.has(p.name) : p._api_status === "submitted"
                    );
                }
                return source.filter((p: any) =>
                    deptProjects.length > 0 ? deptOngoingIds.has(p.name) : p._api_status === "ongoing"
                );
            })();
            return [...base].sort(
                (a: any, b: any) =>
                    (b.total_budget_amount || b.grand_total_proposal || 0) -
                    (a.total_budget_amount || a.grand_total_proposal || 0)
            );
        }
        if (kpiModal.type === "ongoing") {
            let base = source.filter((p: any) =>
                deptProjects.length > 0 ? deptOngoingIds.has(p.name) : p._api_status === "ongoing"
            );
            // fundStatus narrows further to just Active (fund received) or Pending Fund —
            // set when the click came from the Ongoing Projects card's Active/Pending Fund
            // badges rather than the card itself.
            if (kpiModal.fundStatus === "active") {
                base = base.filter((p: any) => fundStatusMap.get(p.name) === true);
            } else if (kpiModal.fundStatus === "pending_fund") {
                base = base.filter((p: any) => fundStatusMap.get(p.name) !== true);
            }
            return base;
        }
        if (kpiModal.type === "intl") {
            let filtered = source.filter(
                (p: any) => (p.origin_of_funding_agency || "").toLowerCase() === "international"
            );
            if (kpiModal.projectType) {
                filtered = filtered.filter((p: any) => {
                    const { isResearch, isConsultancy } = classifyProjectType(p);
                    if (kpiModal.projectType === "research") return isResearch;
                    if (kpiModal.projectType === "consultancy") return isConsultancy;
                    return !isResearch && !isConsultancy;
                });
            }
            return filtered;
        }
        const activeOrSubmitted = source.filter((p: any) =>
            deptProjects.length > 0
                ? deptOngoingIds.has(p.name) || deptSubmittedIds.has(p.name)
                : p._api_status === "ongoing" || p._api_status === "submitted"
        );
        if (kpiModal.type === "fundingAgency") {
            return activeOrSubmitted.filter((p: any) => {
                const agency = getProjectAgency(p);
                if (kpiModal.fundingAgency === "Others") {
                    return !(kpiModal.excludedFundingAgencies || []).includes(agency);
                }
                return agency === kpiModal.fundingAgency;
            });
        }
        if (kpiModal.type === "projectType") {
            // onlyOngoing narrows to the ongoing subset — used when the click came from a
            // card/row that's itself scoped to ongoing projects only (e.g. the "Ongoing
            // Projects" KPI card's per-type rows), so the modal's row count matches what
            // was clicked instead of pulling in submitted projects of that type too.
            const base = kpiModal.onlyOngoing
                ? source.filter((p: any) =>
                    deptProjects.length > 0 ? deptOngoingIds.has(p.name) : p._api_status === "ongoing"
                )
                : activeOrSubmitted;
            return base.filter((p: any) => {
                const { isResearch, isConsultancy } = classifyProjectType(p);
                if (kpiModal.projectType === "research") return isResearch;
                if (kpiModal.projectType === "consultancy") return isConsultancy;
                return !isResearch && !isConsultancy;
            });
        }
        return source;
    }, [deptProjects, apiProjectsFlat, deptOngoingIds, deptSubmittedIds, kpiModal, kpiTab, kpiAllocTab, getProjectAgency, fundStatusMap]);

    const kpiTotalPages = Math.max(1, Math.ceil(kpiModalRows.length / KPI_PAGE_SIZE));
    const kpiPagedRows = kpiModalRows.slice((kpiPage - 1) * KPI_PAGE_SIZE, kpiPage * KPI_PAGE_SIZE);

    const openKpiModal = (type: string, title: string) => {
        setKpiModal({ type, title });
        setKpiPage(1);
        setKpiTab("ongoing");
        setKpiAllocTab("ongoing");
    };
    const openKpiModalWithTab = (type: string, title: string, tab: string) => {
        setKpiModal({ type, title });
        setKpiPage(1);
        const t = tab.toLowerCase();
        if (type === "total") setKpiTab(t.includes("submit") || t.includes("pending") ? "submitted" : "ongoing");
        else if (type === "allocation") setKpiAllocTab(t.includes("submit") || t.includes("pending") ? "submitted" : "ongoing");
    };
    const closeKpiModal = () => setKpiModal(null);

    // For clicking a Research/Consultancy/Others column inside a compact breakdown
    // grid — narrows the modal to that one project type instead of showing every
    // project the whole card's own onClick would. Reuses kpiModalRows' existing
    // "projectType"/"intl" filter branches (onlyOngoing scopes to ongoing-only cards
    // — Allocation and Ongoing Projects — since Total Projects and Intl. Collaborators
    // show both ongoing and submitted).
    const openKpiModalForType = (
        type: "total" | "allocation" | "ongoing" | "intl",
        title: string,
        projectTypeTab: "research" | "consultancy" | "others",
    ) => {
        if (type === "intl") {
            setKpiModal({ type: "intl", title, projectType: projectTypeTab });
        } else {
            setKpiModal({
                type: "projectType",
                title,
                projectType: projectTypeTab,
                onlyOngoing: type === "allocation" || type === "ongoing",
            });
        }
        setKpiPage(1);
    };

    // ── Research/Consultancy/Others breakdown (unfiltered — mirrors Director's KPI card
    // detail panels) ─────────────────────────────────────────────────────────────
    const {
        researchProjects: allResearchProjects,
        consultancyProjects: allConsultancyProjects,
        othersProjects: allOthersProjects,
        researchOngoing: allResearchOngoing,
        researchSubmitted: allResearchSubmitted,
        consultancyOngoing: allConsultancyOngoing,
        consultancySubmitted: allConsultancySubmitted,
        othersOngoing: allOthersOngoing,
        othersSubmitted: allOthersSubmitted,
    } = React.useMemo(() => {
        let ro = 0, rs = 0, co = 0, cs = 0, oo = 0, os = 0;
        deptProjects.forEach((p: any) => {
            const isOngoing = deptOngoingIds.has(p.name);
            const isSubmitted = !isOngoing && deptSubmittedIds.has(p.name);
            if (!isOngoing && !isSubmitted) return;
            const { isResearch, isConsultancy } = classifyProjectType(p);
            if (isResearch) { if (isOngoing) ro++; else rs++; }
            else if (isConsultancy) { if (isOngoing) co++; else cs++; }
            else { if (isOngoing) oo++; else os++; }
        });
        return {
            researchOngoing: ro, researchSubmitted: rs,
            consultancyOngoing: co, consultancySubmitted: cs,
            othersOngoing: oo, othersSubmitted: os,
            researchProjects: ro + rs, consultancyProjects: co + cs, othersProjects: oo + os,
        };
    }, [deptProjects, deptOngoingIds, deptSubmittedIds]);

    // Percentage that n represents of total, rounded — used throughout the compact
    // breakdown grids so "170 Ongoing" also reads as "170 (58%)" without a separate row.
    const pctOf = (n: number, total: number): number => (total > 0 ? Math.round((n / total) * 100) : 0);

    const renderStatusBadge = (status: "ongoing" | "submitted", count: number, total: number) => {
        const isOngoing = status === "ongoing";
        return (
            <span
                className={`flex flex-col w-full text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-black/5 dark:border-white/5 ${isOngoing
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                    }`}
            >
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1">
                        <span className={`w-1 h-1 rounded-full ${isOngoing ? "bg-emerald-500" : "bg-amber-400"}`}></span>
                        {isOngoing ? "Ongoing" : "Submitted"}
                    </div>
                    <span>{count}</span>
                </div>
                <div className="text-right text-[8px] font-semibold opacity-70">{pctOf(count, total)}%</div>
            </span>
        );
    };

    // Compact Research/Consultancy/Others × Ongoing/Submitted breakdown — three
    // columns side by side rather than a stacked list, so the card stays short.
    // Shared by both Total Projects and Total Allocation (neither drills into a
    // per-type click target here; the whole card's onClick already opens the
    // detailed KPI modal).
    const projectBreakdownGrid = React.useMemo(() => (
        <div className={`grid ${allOthersProjects > 0 ? "grid-cols-3" : "grid-cols-2"} gap-2 pt-2 border-t border-[#E4E4E7] dark:border-[#3F3F46]`}>
            <div
                className="flex flex-col items-center justify-start border-r border-[#E4E4E7] dark:border-[#3F3F46] cursor-pointer hover:opacity-75 transition-opacity"
                onClick={(e) => { e.stopPropagation(); openKpiModalForType("total", "Projects: Research", "research"); }}
            >
                <div className="text-[14px] font-extrabold text-[#2563eb] leading-tight">
                    {allResearchProjects}
                </div>
                <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">
                    Research
                </div>
                <div className="flex flex-col gap-1 w-full px-1">
                    {renderStatusBadge("ongoing", allResearchOngoing, allResearchProjects)}
                    {renderStatusBadge("submitted", allResearchSubmitted, allResearchProjects)}
                </div>
            </div>
            <div
                className={`flex flex-col items-center justify-start cursor-pointer hover:opacity-75 transition-opacity ${allOthersProjects > 0 ? "border-r border-[#E4E4E7] dark:border-[#3F3F46]" : ""}`}
                onClick={(e) => { e.stopPropagation(); openKpiModalForType("total", "Projects: Consultancy", "consultancy"); }}
            >
                <div className="text-[14px] font-extrabold text-[#7c3aed] leading-tight">
                    {allConsultancyProjects}
                </div>
                <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">
                    Consultancy
                </div>
                <div className="flex flex-col gap-1 w-full px-1">
                    {renderStatusBadge("ongoing", allConsultancyOngoing, allConsultancyProjects)}
                    {renderStatusBadge("submitted", allConsultancySubmitted, allConsultancyProjects)}
                </div>
            </div>
            {allOthersProjects > 0 && (
                <div
                    className="flex flex-col items-center justify-start cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); openKpiModalForType("total", "Projects: Others", "others"); }}
                >
                    <div className="text-[14px] font-extrabold text-[#059669] leading-tight">
                        {allOthersProjects}
                    </div>
                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">
                        Others
                    </div>
                    <div className="flex flex-col gap-1 w-full px-1">
                        {renderStatusBadge("ongoing", allOthersOngoing, allOthersProjects)}
                        {renderStatusBadge("submitted", allOthersSubmitted, allOthersProjects)}
                    </div>
                </div>
            )}
        </div>
    ), [
        allResearchProjects, allResearchOngoing, allResearchSubmitted,
        allConsultancyProjects, allConsultancyOngoing, allConsultancySubmitted,
        allOthersProjects, allOthersOngoing, allOthersSubmitted,
    ]);

    // ₹ allocation AND ₹ utilization split by project type, among ongoing (sanction-
    // approved) projects only — matches DirectorDashboard's Total Allocation card.
    // pending tracks how many ongoing projects don't yet have a fundReceivedValueCache
    // entry — used to show "Loading…" instead of a false "₹0" if the loading flag has
    // already flipped false but the cache isn't fully populated yet.
    const allocationByType = React.useMemo(() => {
        let rAmt = 0, cAmt = 0, oAmt = 0;
        let rUtil = 0, cUtil = 0, oUtil = 0;
        let pending = 0;
        deptProjects.forEach((p: any) => {
            if (!deptOngoingIds.has(p.name)) return;
            const { isResearch, isConsultancy } = classifyProjectType(p);
            const amt = p.total_budget_amount || p.grand_total_proposal || 0;
            if (!Object.prototype.hasOwnProperty.call(fundReceivedValueCache, p.name)) pending++;
            const util = fundReceivedValueCache[p.name] || 0;
            if (isResearch) { rAmt += amt; rUtil += util; }
            else if (isConsultancy) { cAmt += amt; cUtil += util; }
            else { oAmt += amt; oUtil += util; }
        });
        return { rAmt, cAmt, oAmt, rUtil, cUtil, oUtil, pending };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deptProjects, deptOngoingIds, fundUtilized, fundUtilizedLoading]);

    const isFundUtilDataReady = !fundUtilizedLoading && allocationByType.pending === 0;

    const renderMoneyBadge = (kind: "utilized" | "left", amount: number, ready: boolean) => {
        const isUtilized = kind === "utilized";
        return (
            <span
                className={`flex items-center justify-between w-full text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-black/5 dark:border-white/5 ${isUtilized
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                    }`}
            >
                <div className="flex items-center gap-1">
                    <span className={`w-1 h-1 rounded-full ${isUtilized ? "bg-emerald-500" : "bg-amber-400"}`}></span>
                    {isUtilized ? "Utilized" : "Left"}
                </div>
                <span>{ready ? formatCurrency(amount) : "Loading…"}</span>
            </span>
        );
    };

    // Total Fund Allocation card's own breakdown — allocated amount per type as the
    // headline, then Utilized/Left in money instead of Ongoing/Submitted project
    // counts, since this card is specifically about money, not project status.
    const allocationBreakdownGrid = React.useMemo(() => {
        const { rAmt, cAmt, oAmt, rUtil, cUtil, oUtil } = allocationByType;
        const showOthers = allOthersOngoing > 0;
        return (
            <div className={`grid ${showOthers ? "grid-cols-3" : "grid-cols-2"} gap-2 pt-2 border-t border-[#E4E4E7] dark:border-[#3F3F46]`}>
                <div
                    className="flex flex-col items-center justify-start border-r border-[#E4E4E7] dark:border-[#3F3F46] cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); openKpiModalForType("allocation", "Projects by Allocation: Research", "research"); }}
                >
                    <div className="text-[13px] font-extrabold text-[#2563eb] leading-tight">{formatCurrency(rAmt)}</div>
                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">Research</div>
                    <div className="flex flex-col gap-1 w-full px-1">
                        {renderMoneyBadge("utilized", rUtil, isFundUtilDataReady)}
                        {renderMoneyBadge("left", Math.max(0, rAmt - rUtil), isFundUtilDataReady)}
                    </div>
                </div>
                <div
                    className={`flex flex-col items-center justify-start cursor-pointer hover:opacity-75 transition-opacity ${showOthers ? "border-r border-[#E4E4E7] dark:border-[#3F3F46]" : ""}`}
                    onClick={(e) => { e.stopPropagation(); openKpiModalForType("allocation", "Projects by Allocation: Consultancy", "consultancy"); }}
                >
                    <div className="text-[13px] font-extrabold text-[#7c3aed] leading-tight">{formatCurrency(cAmt)}</div>
                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">Consultancy</div>
                    <div className="flex flex-col gap-1 w-full px-1">
                        {renderMoneyBadge("utilized", cUtil, isFundUtilDataReady)}
                        {renderMoneyBadge("left", Math.max(0, cAmt - cUtil), isFundUtilDataReady)}
                    </div>
                </div>
                {showOthers && (
                    <div
                        className="flex flex-col items-center justify-start cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); openKpiModalForType("allocation", "Projects by Allocation: Others", "others"); }}
                    >
                        <div className="text-[13px] font-extrabold text-[#059669] leading-tight">{formatCurrency(oAmt)}</div>
                        <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">Others</div>
                        <div className="flex flex-col gap-1 w-full px-1">
                            {renderMoneyBadge("utilized", oUtil, isFundUtilDataReady)}
                            {renderMoneyBadge("left", Math.max(0, oAmt - oUtil), isFundUtilDataReady)}
                        </div>
                    </div>
                )}
            </div>
        );
    }, [allocationByType, allOthersOngoing, isFundUtilDataReady]);

    // Ongoing Projects card: split by fund-received status, not just project type —
    // "sanction approved" alone doesn't tell the Head whether a project is truly
    // active (fund in hand) or still waiting on disbursal. Mirrors DirectorDashboard's
    // ongoingFundStatusBreakdown, scoped to deptProjects/deptOngoingIds.
    const ongoingFundStatusBreakdown = React.useMemo(() => {
        let active = 0, pendingFund = 0, checking = 0;
        deptProjects.forEach((p: any) => {
            if (!deptOngoingIds.has(p.name)) return;
            if (!fundStatusMap.has(p.name)) { checking++; return; }
            if (fundStatusMap.get(p.name) === true) active++;
            else pendingFund++;
        });
        return { active, pendingFund, checking };
    }, [deptProjects, deptOngoingIds, fundStatusMap]);

    const openOngoingFundStatusModal = (status: "active" | "pending_fund", title: string) => {
        setKpiModal({ type: "ongoing", title, fundStatus: status });
        setKpiPage(1);
    };

    // Same Received Fund/Pending split as ongoingFundStatusBreakdown, broken out per
    // project type — so a Research-heavy pending-fund backlog isn't hidden inside an
    // aggregate that looks healthy overall.
    const ongoingByTypeFundStatus = React.useMemo(() => {
        const counts: Record<"Research" | "Consultancy" | "Others", { received: number; pending: number }> = {
            Research: { received: 0, pending: 0 },
            Consultancy: { received: 0, pending: 0 },
            Others: { received: 0, pending: 0 },
        };
        deptProjects.forEach((p: any) => {
            if (!deptOngoingIds.has(p.name)) return;
            if (!fundStatusMap.has(p.name)) return;
            const { isResearch, isConsultancy } = classifyProjectType(p);
            const bucket: "Research" | "Consultancy" | "Others" = isResearch ? "Research" : isConsultancy ? "Consultancy" : "Others";
            if (fundStatusMap.get(p.name) === true) counts[bucket].received++;
            else counts[bucket].pending++;
        });
        return counts;
    }, [deptProjects, deptOngoingIds, fundStatusMap]);

    const renderFundBadge = (kind: "received" | "pending", count: number, total: number, ready: boolean) => {
        const isReceived = kind === "received";
        return (
            <span
                className={`flex flex-col w-full text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-black/5 dark:border-white/5 ${isReceived
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                    }`}
            >
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1">
                        <span className={`w-1 h-1 rounded-full ${isReceived ? "bg-emerald-500" : "bg-amber-400"}`}></span>
                        Fund
                    </div>
                    <span>{ready ? count : "Loading…"}</span>
                </div>
                {ready && (
                    <div className="flex items-center justify-between w-full text-[8px] font-semibold opacity-70">
                        <span>{isReceived ? "Received" : "Pending"}</span>
                        <span>{pctOf(count, total)}%</span>
                    </div>
                )}
            </span>
        );
    };

    // Same compact grid as projectBreakdownGrid/allocationBreakdownGrid — headline
    // ongoing count per type, then Received/Pending fund badges instead of
    // Ongoing/Submitted, so this card matches the other three visually instead of
    // standing out as a row of horizontal pills.
    const ongoingBreakdownGrid = React.useMemo(() => {
        const showOthers = allOthersOngoing > 0;
        // Some ongoing projects' fund status may still be resolving even once the
        // headline counts are known — show "…" per badge rather than a false "0"
        // that looks identical to a genuine zero.
        const ready = ongoingFundStatusBreakdown.checking === 0;
        return (
            <div className={`grid ${showOthers ? "grid-cols-3" : "grid-cols-2"} gap-2 pt-2 border-t border-[#E4E4E7] dark:border-[#3F3F46]`}>
                <div
                    className="flex flex-col items-center justify-start border-r border-[#E4E4E7] dark:border-[#3F3F46] cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); openKpiModalForType("ongoing", "Ongoing Projects: Research", "research"); }}
                >
                    <div className="text-[14px] font-extrabold text-[#2563eb] leading-tight">{allResearchOngoing}</div>
                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">Research</div>
                    <div className="flex flex-col gap-1 w-full px-1">
                        {renderFundBadge("received", ongoingByTypeFundStatus.Research.received, allResearchOngoing, ready)}
                        {renderFundBadge("pending", ongoingByTypeFundStatus.Research.pending, allResearchOngoing, ready)}
                    </div>
                </div>
                <div
                    className={`flex flex-col items-center justify-start cursor-pointer hover:opacity-75 transition-opacity ${showOthers ? "border-r border-[#E4E4E7] dark:border-[#3F3F46]" : ""}`}
                    onClick={(e) => { e.stopPropagation(); openKpiModalForType("ongoing", "Ongoing Projects: Consultancy", "consultancy"); }}
                >
                    <div className="text-[14px] font-extrabold text-[#7c3aed] leading-tight">{allConsultancyOngoing}</div>
                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">Consultancy</div>
                    <div className="flex flex-col gap-1 w-full px-1">
                        {renderFundBadge("received", ongoingByTypeFundStatus.Consultancy.received, allConsultancyOngoing, ready)}
                        {renderFundBadge("pending", ongoingByTypeFundStatus.Consultancy.pending, allConsultancyOngoing, ready)}
                    </div>
                </div>
                {showOthers && (
                    <div
                        className="flex flex-col items-center justify-start cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); openKpiModalForType("ongoing", "Ongoing Projects: Others", "others"); }}
                    >
                        <div className="text-[14px] font-extrabold text-[#059669] leading-tight">{allOthersOngoing}</div>
                        <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">Others</div>
                        <div className="flex flex-col gap-1 w-full px-1">
                            {renderFundBadge("received", ongoingByTypeFundStatus.Others.received, allOthersOngoing, ready)}
                            {renderFundBadge("pending", ongoingByTypeFundStatus.Others.pending, allOthersOngoing, ready)}
                        </div>
                    </div>
                )}
            </div>
        );
    }, [allResearchOngoing, allConsultancyOngoing, allOthersOngoing, ongoingByTypeFundStatus, ongoingFundStatusBreakdown]);

    // Same compact grid as projectBreakdownGrid, scoped to projects with an
    // international funding agency.
    const intlBreakdownGrid = React.useMemo(() => {
        let rP = 0, rO = 0, rS = 0;
        let cP = 0, cO = 0, cS = 0;
        let oP = 0, oO = 0, oS = 0;

        deptProjects.forEach((p: any) => {
            if ((p.origin_of_funding_agency || "").toLowerCase() !== "international") return;
            const { isResearch, isConsultancy } = classifyProjectType(p);
            const isOngoing = deptOngoingIds.has(p.name);
            const isSubmitted = deptSubmittedIds.has(p.name);
            if (isResearch) { rP++; if (isOngoing) rO++; if (isSubmitted) rS++; }
            else if (isConsultancy) { cP++; if (isOngoing) cO++; if (isSubmitted) cS++; }
            else { oP++; if (isOngoing) oO++; if (isSubmitted) oS++; }
        });

        return (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                <div
                    className="flex flex-col items-center justify-start border-r border-[#E4E4E7] dark:border-[#3F3F46] cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); openKpiModalForType("intl", "International Collaborator Projects: Research", "research"); }}
                >
                    <div className="text-[14px] font-extrabold text-[#2563eb] leading-tight">{rP}</div>
                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">Research</div>
                    <div className="flex flex-col gap-1 w-full px-1">
                        {renderStatusBadge("ongoing", rO, rP)}
                        {renderStatusBadge("submitted", rS, rP)}
                    </div>
                </div>
                <div
                    className="flex flex-col items-center justify-start border-r border-[#E4E4E7] dark:border-[#3F3F46] cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); openKpiModalForType("intl", "International Collaborator Projects: Consultancy", "consultancy"); }}
                >
                    <div className="text-[14px] font-extrabold text-[#7c3aed] leading-tight">{cP}</div>
                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">Consultancy</div>
                    <div className="flex flex-col gap-1 w-full px-1">
                        {renderStatusBadge("ongoing", cO, cP)}
                        {renderStatusBadge("submitted", cS, cP)}
                    </div>
                </div>
                <div
                    className="flex flex-col items-center justify-start cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); openKpiModalForType("intl", "International Collaborator Projects: Others", "others"); }}
                >
                    <div className="text-[14px] font-extrabold text-[#059669] leading-tight">{oP}</div>
                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">Others</div>
                    <div className="flex flex-col gap-1 w-full px-1">
                        {renderStatusBadge("ongoing", oO, oP)}
                        {renderStatusBadge("submitted", oS, oP)}
                    </div>
                </div>
            </div>
        );
    }, [deptProjects, deptOngoingIds, deptSubmittedIds]);

    // ═════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════════════════════════

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans text-[14px] leading-relaxed text-[#3F3F46] dark:text-[#E4E4E7]">
            <div className="px-6 md:px-8 pt-7 pb-10 max-w-[1600px] mx-auto">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 w-full">
                    <div className="relative">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#2563eb] rounded-xl flex items-center justify-center text-white shadow-sm border border-[#2563eb]/20">
                                {viewMode === "PI" ? <Users size={20} /> : <BarChart3 size={20} />}
                            </div>
                            <div>
                                <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.02em] text-[#3F3F46] dark:text-[#E4E4E7]">
                                    {viewMode === "PI"
                                        ? "PI Project Overview"
                                        : `${resolvedDeptName !== "—" ? resolvedDeptName : "Department"} Overview`
                                    }
                                </h1>
                                <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-1">
                                    {viewMode === "PI"
                                        ? "Tracking project workload and progress across investigators."
                                        : "KPIs, Analytics & Funding for your department."
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                    {viewMode !== "PI" && (
                        <div className="relative w-full md:w-[320px] shrink-0">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400 dark:text-zinc-500">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search project title, no, PI, dept..."
                                value={headerSearchText}
                                onChange={(e) => setHeaderSearchText(e.target.value)}
                                onFocus={() => setHeaderSearchFocused(true)}
                                onBlur={() => setTimeout(() => setHeaderSearchFocused(false), 150)}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                        setHeaderSearchText("");
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                className="w-full h-10 text-[13px] font-semibold pl-9 pr-8 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg outline-none focus:border-[#2563eb] text-[#3F3F46] dark:text-[#E4E4E7] placeholder-zinc-400 transition-colors shadow-sm"
                            />
                            {headerSearchText && (
                                <button
                                    onClick={() => setHeaderSearchText("")}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#71717A] hover:text-black dark:hover:text-white"
                                    type="button"
                                    tabIndex={-1}
                                >
                                    <X size={13} />
                                </button>
                            )}
                            {headerSearchFocused && headerSearchText.trim() && (
                                <div className="absolute z-50 mt-1.5 w-full max-h-[360px] overflow-y-auto bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg shadow-lg">
                                    {headerSearchResults.length === 0 ? (
                                        <div className="px-4 py-3 text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                                            No projects match &ldquo;{headerSearchText}&rdquo;
                                        </div>
                                    ) : (
                                        headerSearchResults.map((p) => {
                                            const piName = p.pi_webmail ? (piNameMap[p.pi_webmail.toLowerCase().trim()] || p.pi_webmail.split("@")[0]) : "";
                                            return (
                                                <div
                                                    key={p.name}
                                                    onClick={() => {
                                                        setHeaderSearchText("");
                                                        navigate(`/project-details-overview/${p.name}`, { state: { returnTo: location.pathname + location.search } });
                                                    }}
                                                    className="px-4 py-2.5 border-b last:border-b-0 border-[#F4F4F5] dark:border-[#3F3F46] cursor-pointer hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors"
                                                >
                                                    <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                                                        {p.project_title || p.name}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#71717A] dark:text-[#A1A1AA] truncate">
                                                        <span>{p.project_no || p.name}</span>
                                                        {piName && (<><span>&middot;</span><span className="truncate">{piName}</span></>)}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    {headerSearchResults.length === HEADER_SEARCH_LIMIT && (
                                        <div className="px-4 py-2 text-[10.5px] text-[#A1A1AA] dark:text-[#71717A] border-t border-[#F4F4F5] dark:border-[#3F3F46]">
                                            Showing first {HEADER_SEARCH_LIMIT} matches — refine your search for more.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {viewMode !== "PI" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* ── KPI Cards ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px] mb-6">
                            <KpiCard
                                label="Total Projects"
                                value={String((projectOverview.ongoing_projects || stats.ongoing) + (projectOverview.submitted_projects || stats.submitted))}
                                isLoading={isPageLoading}
                                subtext=""
                                icon={
                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                    </svg>
                                }
                                valueColor="text-blue-700 dark:text-blue-400"
                                iconBg="#eff6ff"
                                circleColor="#2563eb"
                                onClick={() => openKpiModal("total", "All Department Projects")}
                                customBottom={!isLoading && !isHeadDataLoading && projectBreakdownGrid}
                                valueAdornment={
                                    !isLoading && !isHeadDataLoading && (
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 cursor-pointer hover:brightness-95 transition-all"
                                                onClick={(e) => { e.stopPropagation(); openKpiModalWithTab("total", "All Department Projects", "ongoing"); }}
                                            >
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                {projectOverview.ongoing_projects || stats.ongoing} Ongoing
                                            </span>
                                            <span
                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 cursor-pointer hover:brightness-95 transition-all"
                                                title="Registration but pending sanction"
                                                onClick={(e) => { e.stopPropagation(); openKpiModalWithTab("total", "All Department Projects", "submitted"); }}
                                            >
                                                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                                {projectOverview.submitted_projects || stats.submitted} Submitted
                                            </span>
                                        </div>
                                    )
                                }
                            />
                            <KpiCard
                                label="Fund Allocation for Ongoing Projects"
                                value={formatCurrency(fundAnalytics.total_allocation || stats.totalAlloc)}
                                isLoading={isPageLoading}
                                subtext=""
                                valueAdornment={
                                    !isPageLoading && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                            {fundUtilizedLoading ? (
                                                <span className="animate-pulse">Loading…</span>
                                            ) : (
                                                `${fundUtilPercent}% utilized`
                                            )}
                                        </span>
                                    )
                                }
                                icon={
                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <line x1="6" y1="5" x2="18" y2="5" />
                                        <line x1="6" y1="10" x2="18" y2="10" />
                                        <path d="M6 5h5a4 4 0 0 1 0 8H6" />
                                        <path d="M9 13L15 21" />
                                    </svg>
                                }
                                valueColor="text-emerald-700 dark:text-emerald-400"
                                iconBg="#ecfdf5"
                                circleColor="#059669"
                                onClick={() => openKpiModal("allocation", "Projects by Allocation")}
                                customBottom={!isLoading && !isHeadDataLoading && allocationBreakdownGrid}
                            />
                            <KpiCard
                                label="Ongoing Projects"
                                value={String(projectOverview.ongoing_projects || stats.ongoing)}
                                isLoading={isPageLoading}
                                subtext=""
                                valueAdornment={
                                    !isPageLoading && (projectOverview.ongoing_projects || stats.ongoing) > 0 && (
                                        <div className="flex items-center gap-2">
                                            {ongoingFundStatusBreakdown.checking > 0 ? (
                                                // Fund-status is still resolving for some ongoing projects —
                                                // show a plain loading state rather than partial, steadily-
                                                // increasing Active/Pending Fund counts that look inconsistent
                                                // mid-fetch. Final numbers only appear once fully resolved.
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 animate-pulse">
                                                    Loading…
                                                </span>
                                            ) : (
                                                <>
                                                    <span
                                                        className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 cursor-pointer hover:brightness-95 transition-all"
                                                        title="Sanctioned and fund received"
                                                        onClick={(e) => { e.stopPropagation(); openOngoingFundStatusModal("active", "Ongoing Projects: Received Fund"); }}
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                        {ongoingFundStatusBreakdown.active} Received
                                                    </span>
                                                    <span
                                                        className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 cursor-pointer hover:brightness-95 transition-all"
                                                        title="Sanctioned but fund not yet received"
                                                        onClick={(e) => { e.stopPropagation(); openOngoingFundStatusModal("pending_fund", "Ongoing Projects: Pending Fund Received"); }}
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                                        {ongoingFundStatusBreakdown.pendingFund} Pending
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )
                                }
                                icon={
                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 6v6l4 2" />
                                    </svg>
                                }
                                valueColor="text-violet-700 dark:text-violet-400"
                                iconBg="#f5f3ff"
                                circleColor="#7c3aed"
                                onClick={() => openKpiModal("ongoing", "Ongoing Projects")}
                                customBottom={!isPageLoading && ongoingBreakdownGrid}
                            />
                            <KpiCard
                                label="International Collaborators"
                                value={String(stats.intlCount)}
                                isLoading={isPageLoading}
                                subtext=""
                                icon={
                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="2" y1="12" x2="22" y2="12" />
                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                    </svg>
                                }
                                valueColor="text-sky-700 dark:text-sky-400"
                                iconBg="#f0f9ff"
                                circleColor="#0284c7"
                                onClick={() => openKpiModal("intl", "International Collaborator Projects")}
                                customBottom={!isLoading && !isHeadDataLoading && intlBreakdownGrid}
                            />
                        </div>

                        {/* ── Project Analytics ── */}
                        <SectionDivider title="Project Analytics" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-6 items-start">
                            {/* Financial Year Chart */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/20 text-[#2563eb]">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <line x1="18" y1="20" x2="18" y2="10" />
                                                <line x1="12" y1="20" x2="12" y2="4" />
                                                <line x1="6" y1="20" x2="6" y2="14" />
                                            </svg>
                                        </div>
                                        Yearwise Project Status
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Type selector */}
                                        <select
                                            value={chartProjectTypeFilter}
                                            onChange={(e) => setChartProjectTypeFilter(e.target.value)}
                                            className="bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2 py-1 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none focus:border-[#2563eb] cursor-pointer"
                                        >
                                            <option value="all">All Types</option>
                                            <option value="research">Research</option>
                                            <option value="consultancy">Consultancy</option>
                                            <option value="others">Others</option>
                                        </select>
                                        {/* Year selector */}
                                        <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider ml-1">Year:</span>
                                        <div className="relative">
                                            <select
                                                value={chartYearFilter}
                                                onChange={(e) => setChartYearFilter(e.target.value)}
                                                className="appearance-none pl-2.5 pr-7 py-1 text-[11px] font-bold bg-[#F4F4F5] dark:bg-[#3F3F46] border border-[#E4E4E7] dark:border-[#52525B] text-[#3F3F46] dark:text-[#E4E4E7] rounded-lg outline-none cursor-pointer hover:bg-[#E4E4E7] dark:hover:bg-[#52525B] transition-colors"
                                            >
                                                <option value="All Time">All Years</option>
                                                {chartAvailableYears.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                            <svg className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-[18px] px-[22px] pb-5">
                                    <div className="h-[250px]">
                                        {isPageLoading ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-[#71717A] text-sm gap-3">
                                                <div className="w-5 h-5 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
                                                <span className="font-medium">Loading projects...</span>
                                            </div>
                                        ) : chartDisplayData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={chartDisplayData}
                                                    margin={{ top: 20, right: 4, left: -24, bottom: 0 }}
                                                    barCategoryGap="25%"
                                                    barGap={2}
                                                    onClick={(state: any, e: any) => {
                                                        if (state && state.activeLabel) {
                                                            let status = "ongoing";
                                                            if (e && e.target && typeof e.target.getAttribute === "function") {
                                                                const name = e.target.getAttribute("name");
                                                                if (name === "Submitted") status = "submitted";
                                                                else if (name === "Ongoing") status = "ongoing";
                                                            }
                                                            openKpiModalWithTab("total", "All Department Projects", status);
                                                        }
                                                    }}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                                                    <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#71717A", fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                                                    <YAxis tick={{ fontSize: 12, fill: "#71717A" }} axisLine={false} tickLine={false} />
                                                    <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid #1e293b", background: "#0f172a" }} labelStyle={{ color: "#f1f5f9", fontWeight: 700, fontSize: 12 }} itemStyle={{ color: "#94a3b8", fontSize: 11 }} cursor={{ fill: "#f4f4f5" }} />
                                                    <Bar dataKey="submitted" name="Submitted" fill="#2563eb" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} cursor="pointer">
                                                        <LabelList dataKey="submitted" position="top" fill="#71717A" fontSize={11} fontWeight={600} formatter={(val: any) => (val > 0 ? val : "")} />
                                                    </Bar>
                                                    <Bar dataKey="ongoing" name="Ongoing" fill="#7c3aed" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} cursor="pointer">
                                                        <LabelList dataKey="ongoing" position="top" fill="#71717A" fontSize={11} fontWeight={600} formatter={(val: any) => (val > 0 ? val : "")} />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">No data available</div>
                                        )}
                                    </div>
                                    <div className="mt-2.5 pt-2.5 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                        <div className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] overflow-hidden grid grid-cols-2 divide-x divide-[#E4E4E7] dark:divide-[#3F3F46]">
                                            <div className="px-3 py-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/30 text-[#2563eb]">
                                                        <FileText size={14} strokeWidth={2.5} />
                                                    </div>
                                                    <div className="min-w-0 flex items-baseline gap-1.5 flex-wrap">
                                                        <span className="text-[18px] font-extrabold text-[#2563eb] leading-none tabular-nums">{isPageLoading ? "Loading…" : chartYearSubmittedTotal}</span>
                                                        <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider">Submitted</span>
                                                        <span className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A]">(Pending Sanction)</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-[#E4E4E7]/70 dark:border-[#3F3F46]/70">
                                                    <div className="text-center">
                                                        <div className="text-[9px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide leading-none">Research</div>
                                                        <div className="text-[12px] font-extrabold text-[#2563eb] tabular-nums leading-none mt-1">{isPageLoading ? "Loading…" : chartTypeBreakdown.researchSubmitted}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-[9px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide leading-none">Consultancy</div>
                                                        <div className="text-[12px] font-extrabold text-[#2563eb] tabular-nums leading-none mt-1">{isPageLoading ? "Loading…" : chartTypeBreakdown.consultancySubmitted}</div>
                                                    </div>
                                                    {(isPageLoading || chartTypeBreakdown.othersSubmitted > 0) && (
                                                        <div className="text-center">
                                                            <div className="text-[9px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide leading-none">Others</div>
                                                            <div className="text-[12px] font-extrabold text-[#2563eb] tabular-nums leading-none mt-1">{isPageLoading ? "Loading…" : chartTypeBreakdown.othersSubmitted}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="px-3 py-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-violet-50 dark:bg-violet-950/30 text-[#7c3aed]">
                                                        <TrendingUp size={14} strokeWidth={2.5} />
                                                    </div>
                                                    <div className="min-w-0 flex items-baseline gap-1.5 flex-wrap">
                                                        <span className="text-[18px] font-extrabold text-[#7c3aed] leading-none tabular-nums">{isPageLoading ? "Loading…" : chartYearOngoingTotal}</span>
                                                        <span className="text-[10px] font-bold text-[#7c3aed] uppercase tracking-wider">Ongoing</span>
                                                        <span className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A]">(Sanction approved)</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-[#E4E4E7]/70 dark:border-[#3F3F46]/70">
                                                    <div className="text-center">
                                                        <div className="text-[9px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide leading-none">Research</div>
                                                        <div className="text-[12px] font-extrabold text-[#7c3aed] tabular-nums leading-none mt-1">{isPageLoading ? "Loading…" : chartTypeBreakdown.researchOngoing}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-[9px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide leading-none">Consultancy</div>
                                                        <div className="text-[12px] font-extrabold text-[#7c3aed] tabular-nums leading-none mt-1">{isPageLoading ? "Loading…" : chartTypeBreakdown.consultancyOngoing}</div>
                                                    </div>
                                                    {(isPageLoading || chartTypeBreakdown.othersOngoing > 0) && (
                                                        <div className="text-center">
                                                            <div className="text-[9px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide leading-none">Others</div>
                                                            <div className="text-[12px] font-extrabold text-[#7c3aed] tabular-nums leading-none mt-1">{isPageLoading ? "Loading…" : chartTypeBreakdown.othersOngoing}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Funding Sources Pie */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-violet-50 dark:bg-violet-950/20 text-[#7c3aed]">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                                                <path d="M22 12A10 10 0 0 0 12 2v10z" />
                                            </svg>
                                        </div>
                                        Funding Sources — Breakdown
                                    </div>
                                </div>
                                <div className="p-[18px] px-[22px] pb-5">
                                    {isPageLoading || fundingSearchLinkData === undefined || fundingAgencyDocList === undefined ? (
                                        <div className="h-[300px] flex flex-col items-center justify-center text-[#71717A] text-sm gap-3">
                                            <div className="w-5 h-5 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
                                            <span className="font-medium">Loading…</span>
                                        </div>
                                    ) : pieChartFundingData.length > 0 ? (
                                        <div className="flex flex-col items-center gap-5">
                                            <div className="relative flex items-center justify-center w-[200px] h-[200px] shrink-0">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={pieChartFundingData}
                                                            cx="50%" cy="50%" innerRadius={65} outerRadius={88} dataKey="value" nameKey="funding_agency" paddingAngle={3} isAnimationActive={false}
                                                            onClick={(entry: any) => {
                                                                const clickedAgency = entry?.funding_agency;
                                                                if (!clickedAgency) return;
                                                                if (clickedAgency === "Others") {
                                                                    const excludedAgencies = pieChartFundingData.slice(0, pieChartFundingData.length - 1).map((d: any) => d.funding_agency);
                                                                    setKpiModal({ type: "fundingAgency", title: "Funding: Others", fundingAgency: "Others", excludedFundingAgencies: excludedAgencies });
                                                                } else {
                                                                    setKpiModal({ type: "fundingAgency", title: `Funding: ${clickedAgency}`, fundingAgency: clickedAgency });
                                                                }
                                                                setKpiPage(1);
                                                            }}
                                                            style={{ cursor: "pointer" }}
                                                        >
                                                            {pieChartFundingData.map((_: any, i: number) => (
                                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid #1e293b", background: "#0f172a" }} labelStyle={{ color: "#f1f5f9", fontWeight: 700 }} itemStyle={{ color: "#94a3b8", fontSize: 11 }} formatter={(value: number, name: string) => [`${value} Projects`, name]} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                    <span className="text-[24px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-none">
                                                        {pieChartFundingData.reduce((sum: number, d: any) => sum + d.value, 0)}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-widest mt-0.5">Total</span>
                                                </div>
                                            </div>
                                            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
                                                {pieChartFundingData.map((item: any, i: number) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => {
                                                            if (item.funding_agency === "Others") {
                                                                const excludedAgencies = pieChartFundingData.slice(0, pieChartFundingData.length - 1).map((d: any) => d.funding_agency);
                                                                setKpiModal({ type: "fundingAgency", title: "Funding: Others", fundingAgency: "Others", excludedFundingAgencies: excludedAgencies });
                                                            } else {
                                                                setKpiModal({ type: "fundingAgency", title: `Funding: ${item.funding_agency}`, fundingAgency: item.funding_agency });
                                                            }
                                                            setKpiPage(1);
                                                        }}
                                                        className="flex items-center justify-between py-2 border-b border-[#E4E4E7] dark:border-[#3F3F46] cursor-pointer hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] px-2 -mx-2 rounded transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                                            <span className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA] truncate" title={item.funding_agency}>{item.funding_agency}</span>
                                                        </div>
                                                        <span className="text-[13px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] shrink-0 ml-2">{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-[300px] flex items-center justify-center text-[#71717A] text-sm">No data available</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Project Analytics & Distribution ── */}
                        <SectionDivider title="Project Analytics & Distribution" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-6">
                            {/* Research vs Consultancy */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-950/20 text-[#7c3aed]">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                            </svg>
                                        </div>
                                        Research vs Consultancy
                                    </div>
                                </div>
                                <div className="p-[18px] px-[22px] pb-5">
                                    <div className="h-[260px] relative">
                                        {isPageLoading ? (
                                            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">Loading chart...</div>
                                        ) : ((projectOverview.ongoing_projects || stats.ongoing) + (projectOverview.submitted_projects || stats.submitted)) === 0 ? (
                                            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">No data available</div>
                                        ) : (
                                            <>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                                    <span className="text-3xl font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-none">{stats.researchProjects + stats.consultancyProjects}</span>
                                                    <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest mt-1">Total</span>
                                                </div>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={[
                                                                { name: "Research", value: stats.researchProjects, color: "#2563eb" },
                                                                { name: "Consultancy", value: stats.consultancyProjects, color: "#7c3aed" },
                                                            ]}
                                                            cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" dataKey="value" nameKey="name" paddingAngle={5} isAnimationActive={false}
                                                            onClick={(entry: any) => {
                                                                const t = entry?.name === "Research" ? "research" : "consultancy";
                                                                setKpiModal({ type: "projectType", title: `Projects: ${entry?.name}`, projectType: t });
                                                                setKpiPage(1);
                                                            }}
                                                            style={{ cursor: "pointer" }}
                                                        >
                                                            <Cell fill="#2563eb" stroke="none" />
                                                            <Cell fill="#7c3aed" stroke="none" />
                                                        </Pie>
                                                        <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid #1e293b", background: "#0f172a" }} labelStyle={{ color: "#f1f5f9", fontWeight: 700, fontSize: 12 }} itemStyle={{ color: "#94a3b8", fontSize: 11 }} formatter={(value: number, name: string) => [`${value} Projects`, name]} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </>
                                        )}
                                    </div>
                                    <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] pt-3 mt-3">
                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                            <div
                                                className="flex flex-col items-center justify-start border-r border-[#E4E4E7] dark:border-[#3F3F46] cursor-pointer hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] rounded-lg transition-colors py-1"
                                                onClick={() => { setKpiModal({ type: "projectType", title: "Projects: Research", projectType: "research" }); setKpiPage(1); }}
                                            >
                                                <div className="text-[22px] font-extrabold text-[#2563eb] leading-tight">{stats.researchProjects}</div>
                                                <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-widest mb-2">Research</div>
                                                <div className="flex flex-col gap-1.5 w-full px-2 lg:px-4">
                                                    <span className="inline-flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 cursor-default">
                                                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Ongoing</div>
                                                        <span>{stats.researchOngoing}</span>
                                                    </span>
                                                    <span className="inline-flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 cursor-default">
                                                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Submitted</div>
                                                        <span>{stats.researchSubmitted}</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                className="flex flex-col items-center justify-start cursor-pointer hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] rounded-lg transition-colors py-1"
                                                onClick={() => { setKpiModal({ type: "projectType", title: "Projects: Consultancy", projectType: "consultancy" }); setKpiPage(1); }}
                                            >
                                                <div className="text-[22px] font-extrabold text-[#7c3aed] leading-tight">{projectOverview.consultancy_projects || stats.consultancyProjects}</div>
                                                <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-widest mb-2">Consultancy</div>
                                                <div className="flex flex-col gap-1.5 w-full px-2 lg:px-4">
                                                    <span className="inline-flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 cursor-default">
                                                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Ongoing</div>
                                                        <span>{stats.consultancyOngoing}</span>
                                                    </span>
                                                    <span className="inline-flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 cursor-default">
                                                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Submitted</div>
                                                        <span>{stats.consultancySubmitted}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Trends */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden flex flex-col">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/20 text-[#d97706]">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">Financial Trends</div>
                                            <div className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A] leading-tight">Ongoing (sanction-approved) projects only</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={financialProjectTypeFilter}
                                            onChange={(e) => setFinancialProjectTypeFilter(e.target.value)}
                                            className="bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2 py-1 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none focus:border-[#2563eb] cursor-pointer"
                                        >
                                            <option value="all">All Types</option>
                                            <option value="research">Research</option>
                                            <option value="consultancy">Consultancy</option>
                                            <option value="others">Others</option>
                                        </select>
                                        <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider ml-1">Year:</span>
                                        <select
                                            value={financialYearFilter}
                                            onChange={(e) => setFinancialYearFilter(e.target.value)}
                                            className="bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2 py-1 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none focus:border-[#2563eb] cursor-pointer"
                                        >
                                            <option value="all">All Years</option>
                                            {financialAvailableYears.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="p-[18px] px-[22px] flex-1 flex flex-col">
                                    <div className="flex gap-4 mb-5">
                                        <div
                                            className="flex-1 bg-[#FAFAF9] dark:bg-[#18181B] rounded-xl p-3.5 text-center shadow-sm border border-black/5 dark:border-white/5 cursor-pointer hover:scale-[1.02] transition-transform"
                                            onClick={() => openKpiModalWithTab("total", "Projects: Total Sanctioned", "ongoing")}
                                        >
                                            <div className="text-[20px] font-extrabold tracking-[-0.03em] text-[#2563eb]">
                                                {isPageLoading ? "—" : formatCurrency(fundAlloc)}
                                            </div>
                                            <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest mt-1">
                                                Total Sanctioned
                                            </div>
                                        </div>
                                        <div
                                            className="flex-1 bg-[#FAFAF9] dark:bg-[#18181B] rounded-xl p-3.5 text-center shadow-sm border border-black/5 dark:border-white/5 cursor-pointer hover:scale-[1.02] transition-transform"
                                            onClick={() => openKpiModalWithTab("total", "Projects: Utilized", "ongoing")}
                                        >
                                            <div className="text-[20px] font-extrabold tracking-[-0.03em] text-[#059669]">
                                                {isPageLoading || fundUtilizedLoading ? "—" : formatCurrency(fundUtilized)}
                                            </div>
                                            <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest mt-1">
                                                Utilized
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-[220px] w-full mt-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={[
                                                    { name: "Sanctioned", value: fundAlloc, fill: "#2563eb", title: "Projects: Total Sanctioned" },
                                                    { name: "Utilized", value: fundUtilized, fill: "#059669", title: "Projects: Utilized" },
                                                    { name: "Remaining", value: fundRemaining, fill: "#0ea5e9", title: "Projects: Remaining Balance" },
                                                ]}
                                                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                                                barSize={40}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" className="dark:stroke-[#3F3F46]" />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: "#71717A", fontSize: 11, fontWeight: 700 }}
                                                    dy={10}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                                                    contentStyle={{
                                                        borderRadius: "0.75rem",
                                                        border: "1px solid #1e293b",
                                                        background: "#0f172a",
                                                    }}
                                                    labelStyle={{ display: "none" }}
                                                    itemStyle={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}
                                                    formatter={(value: any, name: string, props: any) => [
                                                        formatCurrency(value),
                                                        props.payload.name
                                                    ]}
                                                />
                                                <Bar
                                                    dataKey="value"
                                                    radius={[6, 6, 0, 0]}
                                                    cursor="pointer"
                                                    isAnimationActive={false}
                                                    onClick={(data: any) => {
                                                        if (data && data.payload) {
                                                            openKpiModalWithTab("total", data.payload.title, "ongoing");
                                                        }
                                                    }}
                                                >
                                                    <LabelList
                                                        dataKey="value"
                                                        position="top"
                                                        formatter={(val: any) => (val && Number(val) > 0) ? formatCurrency(Number(val)) : ""}
                                                        style={{ fontSize: '10px', fontWeight: 'bold', fill: '#71717a' }}
                                                    />
                                                    {
                                                        [
                                                            { name: "Sanctioned", value: fundAlloc, fill: "#2563eb" },
                                                            { name: "Utilized", value: fundUtilized, fill: "#059669" },
                                                            { name: "Remaining", value: fundRemaining, fill: "#0ea5e9" },
                                                        ].map((entry, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={entry.fill}
                                                                className="hover:opacity-80 transition-opacity"
                                                            />
                                                        ))
                                                    }
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] pt-4 mt-auto">
                                        <div className="space-y-1">
                                            <div
                                                className="flex items-center justify-between py-2 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-2 -mx-2 rounded transition-colors"
                                                onClick={() => openKpiModalWithTab("total", "Projects: Total Sanctioned", "ongoing")}
                                            >
                                                <span className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">Total Sanctioned</span>
                                                <span className="text-[13px] font-extrabold text-[#2563eb]">
                                                    {isPageLoading ? "—" : formatCurrency(fundAlloc)}
                                                </span>
                                            </div>
                                            <div
                                                className="flex items-center justify-between py-2 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-2 -mx-2 rounded transition-colors"
                                                onClick={() => openKpiModalWithTab("total", "Projects: Utilized", "ongoing")}
                                            >
                                                <span className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">Utilized</span>
                                                <span className="text-[13px] font-extrabold text-[#059669]">
                                                    {isPageLoading || fundUtilizedLoading ? "—" : formatCurrency(fundUtilized)}
                                                </span>
                                            </div>
                                            <div
                                                className="flex items-center justify-between py-2 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-2 -mx-2 rounded transition-colors"
                                                onClick={() => openKpiModalWithTab("total", "Projects: Remaining Balance", "ongoing")}
                                            >
                                                <span className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">Remaining Balance</span>
                                                <span className="text-[13px] font-extrabold text-[#0ea5e9]">
                                                    {isPageLoading || fundUtilizedLoading ? "—" : formatCurrency(fundRemaining)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Financial / Projects Table ── */}
                        <SectionDivider title="Financial" />
                        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-[14px] mb-6">
                            {/* All Projects Table */}
                            {(() => {
                                const STATUS_FILTER_OPTIONS = [
                                    { value: "all", label: "All Projects" },
                                    { value: "ongoing", label: "Ongoing (Sanctioned)" },
                                    { value: "submitted", label: "Submitted (Pending Sanction)" },
                                    { value: "draft", label: "Draft" },
                                    { value: "completed", label: "Completed" },
                                    { value: "cancelled", label: "Cancelled" },
                                ];

                                const allProjs: any[] = deptProjects.map((p: any) => {
                                    let computedStatus: string;
                                    if (deptOngoingIds.has(p.name)) computedStatus = "ongoing";
                                    else if (deptSubmittedIds.has(p.name)) computedStatus = "submitted";
                                    else {
                                        const s = (p.workflow_state || "").toLowerCase();
                                        if (s.includes("draft")) computedStatus = "draft";
                                        else if (s.includes("complet")) computedStatus = "completed";
                                        else if (s.includes("cancel") || s.includes("reject")) computedStatus = "cancelled";
                                        else computedStatus = "pending";
                                    }
                                    return {
                                        name: p.name,
                                        project_no: p.project_no,
                                        project_title: p.project_title,
                                        project_type: p.project_type,
                                        pi_webmail: p.pi_webmail,
                                        department: p.implementation_department,
                                        workflow_state: p.workflow_state,
                                        prj_start_date: getEffectiveStartDate(p),
                                        _status: computedStatus,
                                        total_budget_amount: p.total_budget_amount || p.grand_total_proposal || 0,
                                    };
                                }).sort((a: any, b: any) => b.total_budget_amount - a.total_budget_amount);

                                const filtered = allProjs.filter((p: any) => projectTableFilter === "all" ? true : p._status === projectTableFilter);
                                const totalPages = Math.max(1, Math.ceil(filtered.length / PROJECT_TABLE_PAGE_SIZE));
                                const safePage = Math.min(projectTablePage, totalPages);
                                const pageSlice = filtered.slice((safePage - 1) * PROJECT_TABLE_PAGE_SIZE, safePage * PROJECT_TABLE_PAGE_SIZE);

                                return (
                                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                        <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between flex-wrap gap-3">
                                            <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/20 text-[#059669]">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                                                    </svg>
                                                </div>
                                                Department Projects
                                                <span className="ml-1 text-[11px] font-bold text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2 py-0.5 rounded-full">{filtered.length}</span>
                                            </div>
                                            <select
                                                value={projectTableFilter}
                                                onChange={(e) => { setProjectTableFilter(e.target.value); setProjectTablePage(1); }}
                                                className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-3 py-1.5 outline-none focus:border-[#2563eb] cursor-pointer transition-colors"
                                            >
                                                {STATUS_FILTER_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                                                        {["#", "Project", "PI / Lead", "Status", "Amount"].map((h) => (
                                                            <th key={h} className="p-2.5 px-3.5 text-[10px] font-bold text-[#71717A] uppercase tracking-widest text-left whitespace-nowrap">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {isPageLoading ? (
                                                        <tr><td colSpan={5} className="p-8 text-center text-[#71717A] text-sm">Loading projects...</td></tr>
                                                    ) : pageSlice.length === 0 ? (
                                                        <tr><td colSpan={5} className="p-8 text-center text-[#71717A] text-sm">No projects match the selected filter.</td></tr>
                                                    ) : (
                                                        pageSlice.map((proj: any, idx: number) => {
                                                            const globalIdx = (safePage - 1) * PROJECT_TABLE_PAGE_SIZE + idx;
                                                            const piName = proj.pi_webmail ? (piNameMap[proj.pi_webmail.toLowerCase().trim()] || proj.pi_webmail) : "—";
                                                            return (
                                                                <tr
                                                                    key={proj.name || idx}
                                                                    className="border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors cursor-pointer"
                                                                    onClick={() => {
                                                                        if (window.getSelection()?.toString()) return;
                                                                        navigate(`/project-details-overview/${proj.name}`);
                                                                    }}
                                                                >
                                                                    <td className="p-3 px-3.5 align-middle text-[11px] font-extrabold text-[#A1A1AA] font-mono">{String(globalIdx + 1).padStart(2, "0")}</td>
                                                                    <td className="p-3 px-3.5 align-middle max-w-[340px]">
                                                                        <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-2">{proj.project_title || "Untitled"}</div>
                                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                                            {proj.project_no && (
                                                                                <span className="font-mono text-[9px] text-[#71717A] bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] px-1.5 py-0.5 rounded inline-block">{proj.project_no}</span>
                                                                            )}
                                                                            {proj.project_type && (
                                                                                <span className="font-mono text-[9px] text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded inline-block">{proj.project_type}</span>
                                                                            )}
                                                                            {proj.prj_start_date && (
                                                                                <span className="font-mono text-[9px] text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded inline-block">
                                                                                    {String(proj.prj_start_date).split(" ")[0]}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 px-3.5 align-middle text-[11px] whitespace-nowrap">
                                                                        <div className="font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{piName}</div>
                                                                        {proj.pi_webmail && <div className="text-[#71717A] dark:text-[#A1A1AA] mt-0.5">{proj.pi_webmail}</div>}
                                                                    </td>
                                                                    <td className="p-3 px-3.5 align-middle"><StatusBadge status={proj._status} /></td>
                                                                    <td className="p-3 px-3.5 align-middle font-extrabold text-[13px] text-[#059669] whitespace-nowrap">
                                                                        {formatCurrency(proj.total_budget_amount || 0)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        {filtered.length > PROJECT_TABLE_PAGE_SIZE && (
                                            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                                                <span className="text-[11px] text-[#71717A] font-semibold">
                                                    Showing {(safePage - 1) * PROJECT_TABLE_PAGE_SIZE + 1}–{Math.min(safePage * PROJECT_TABLE_PAGE_SIZE, filtered.length)} of {filtered.length}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setProjectTablePage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#E4E4E7] dark:border-[#3F3F46] disabled:opacity-40 hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46] transition-colors">‹ Prev</button>
                                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                        const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                                                        const page = start + i;
                                                        return (
                                                            <button key={page} onClick={() => setProjectTablePage(page)} className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-colors ${page === safePage ? "bg-[#2563eb] text-white" : "border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46]"}`}>{page}</button>
                                                        );
                                                    })}
                                                    <button onClick={() => setProjectTablePage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#E4E4E7] dark:border-[#3F3F46] disabled:opacity-40 hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46] transition-colors">Next ›</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Financial Breakdown Panel */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/20 text-[#d97706]">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                                            </svg>
                                        </div>
                                        Financial Breakdown
                                    </div>
                                </div>
                                <div className="p-[18px] px-[22px] space-y-3">
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg p-2.5 text-center">
                                            <div className="text-[18px] font-extrabold tracking-[-0.03em] text-[#2563eb]">{isPageLoading ? "—" : formatCurrency(fundAnalytics.total_allocation || stats.totalAlloc)}</div>
                                            <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mt-0.5">Total Sanctioned</div>
                                        </div>
                                        <div className="flex-1 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg p-2.5 text-center">
                                            <div className="text-[18px] font-extrabold tracking-[-0.03em] text-[#059669]">{isPageLoading ? "—" : String(projectOverview.ongoing_projects || stats.ongoing)}</div>
                                            <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mt-0.5">Ongoing</div>
                                        </div>
                                    </div>
                                    <div className="space-y-0 pt-1">
                                        {[
                                            { label: "Research Projects", value: `${stats.researchProjects} projects`, color: "text-[#2563eb]" },
                                            { label: "Consultancy Projects", value: `${stats.consultancyProjects} projects`, color: "text-[#7c3aed]" },
                                            { label: "Intl. Collaborations", value: `${stats.intlCount} projects`, color: "text-[#0284c7]" },
                                            { label: "Total PIs", value: `${piData.length} investigators`, color: "text-[#3F3F46] dark:text-[#E4E4E7]" },
                                        ].map((row, i) => (
                                            <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0">
                                                <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">{row.label}</span>
                                                <span className={`text-[12px] font-extrabold ${row.color}`}>{isPageLoading ? "—" : row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Conditionally render PI Workload ── */}
                {viewMode === "PI" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
                        <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden mb-6">
                            <div className="px-6 py-5 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-[16px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7]">Investigator Workloads</h2>
                                    {piFundingFilter !== "all" && (
                                        <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                                            Filtered by: <span className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{piFundingFilter}</span>
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative hidden">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] dark:text-[#A1A1AA]" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search PIs..."
                                            value={piSearch}
                                            onChange={(e) => { setPiSearch(e.target.value); setPiPage(1); }}
                                            className="pl-9 pr-4 py-2 bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] outline-none w-56 transition-all focus:border-[#2563eb]"
                                        />
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowFundingFilterDropdown((v) => !v)}
                                            className={`inline-flex items-center gap-2 px-4 py-2 text-[13px] border rounded-xl font-bold transition-all shadow-sm ${piFundingFilter !== "all" ? "border-[#2563eb] bg-blue-50 dark:bg-blue-950/30 text-[#2563eb]" : "border-[#E4E4E7] dark:border-[#3F3F46] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA]"}`}
                                        >
                                            <Filter size={16} />
                                            Filter
                                            {piFundingFilter !== "all" && (
                                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#2563eb] text-white text-[9px] font-extrabold leading-none ml-0.5 cursor-pointer hover:bg-red-500 transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); setPiFundingFilter("all"); setShowFundingFilterDropdown(false); }} title="Clear filter">×</span>
                                            )}
                                        </button>
                                        {showFundingFilterDropdown && (
                                            <>
                                                <div className="fixed inset-0 z-[990]" onClick={() => setShowFundingFilterDropdown(false)} />
                                                <div className="absolute right-0 top-[calc(100%+6px)] z-[999] bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl shadow-xl w-64 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                                    <div className="px-4 py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                                                        <span className="text-[11px] font-extrabold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest">Filter by Fund</span>
                                                        {piFundingFilter !== "all" && (
                                                            <button onClick={() => { setPiFundingFilter("all"); setShowFundingFilterDropdown(false); }} className="text-[10px] font-semibold text-[#2563eb] hover:underline">Clear</button>
                                                        )}
                                                    </div>
                                                    <button onClick={() => { setPiFundingFilter("all"); setShowFundingFilterDropdown(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${piFundingFilter === "all" ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]"}`}>
                                                        <span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-[#71717A]" />
                                                        <span className="flex-1 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">All Funds</span>
                                                        {piFundingFilter === "all" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                                    </button>
                                                    <div className="max-h-56 overflow-y-auto">
                                                        {piWorkloadAgencies.map((agency, i) => {
                                                            const color = CHART_COLORS[i % CHART_COLORS.length] || "#64748b";
                                                            const isActive = piFundingFilter === agency.agency_name;
                                                            return (
                                                                <button key={agency.agency_name} onClick={() => { setPiFundingFilter(agency.agency_name); setShowFundingFilterDropdown(false); }}
                                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]"}`}>
                                                                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                                                                    <span className="flex-1 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate" title={agency.agency_name}>{agency.agency_name}</span>
                                                                    <span className="text-[11px] font-extrabold text-[#71717A] dark:text-[#A1A1AA]">{agency.project_count}</span>
                                                                    {isActive && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA] text-[11px] font-extrabold uppercase tracking-widest border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                            <th className="px-6 py-4">Investigator Name</th>
                                            <th className="px-6 py-4">Active Projects</th>
                                            <th className="px-6 py-4 text-right">View Profile</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                                        {isPageLoading ? (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-16 text-center text-[#71717A] font-medium">
                                                    <div className="flex flex-col items-center justify-center gap-3">
                                                        <div className="w-5 h-5 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
                                                        <span>Loading data…</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : paginatedPIs && paginatedPIs.length > 0 ? (
                                            paginatedPIs.map((pi: any, index: number) => (
                                                <tr key={pi.user_email || index} className="hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors group cursor-pointer" onClick={() => { setExpandedPI(pi.user_email); setPiModalPage(1); }}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3.5">
                                                            <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-[#4f46e5] font-bold text-[14px] border border-indigo-100 dark:border-indigo-800 shrink-0">
                                                                {pi.user_name ? pi.user_name.charAt(0).toUpperCase() : "U"}
                                                            </div>
                                                            <div>
                                                                <p className="text-[14px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight group-hover:text-[#4f46e5] transition-colors">{pi.user_name || "Unknown PI"}</p>
                                                                <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">{pi.user_email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5 inline-flex bg-[#FAFAF9] dark:bg-[#18181B] px-3 py-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                            <span className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">{pi.project_count}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={(e) => { e.stopPropagation(); setExpandedPI(pi.user_email); setPiModalPage(1); }} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#A1A1AA] hover:text-[#4f46e5] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all border border-transparent shadow-sm">
                                                            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-16 text-center text-[#71717A] font-medium">
                                                    {piFundingFilter !== "all" ? `No investigators found for "${piFundingFilter}"${piSearch ? " matching your search" : ""}.` : piSearch ? "No matching investigators found." : "No Investigators found."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {filteredPIs.length > PAGE_SIZE && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                    <span className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                                        Showing {(piPage - 1) * PAGE_SIZE + 1} to {Math.min(piPage * PAGE_SIZE, filteredPIs.length)} of {filteredPIs.length} entries
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button disabled={piPage === 1} onClick={() => setPiPage((p) => p - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] disabled:opacity-50 transition-colors"><ChevronLeft size={16} /></button>
                                        <span className="text-[12px] font-semibold px-2 text-[#3F3F46] dark:text-[#E4E4E7]">Page {piPage} of {piTotalPages}</span>
                                        <button disabled={piPage === piTotalPages} onClick={() => setPiPage((p) => p + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] disabled:opacity-50 transition-colors"><ChevronRight size={16} /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Footer ── */}
                <footer className="flex items-center justify-between pt-5 border-t border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] text-[10px] font-semibold tracking-widest uppercase">
                    <span>© 2026 R&D Operations · IIT Guwahati · Internal Use Only</span>
                    <a href="mailto:ernd@iitg.ac.in" className="text-[#D97757] hover:underline normal-case font-semibold text-[11px] tracking-normal">ernd@iitg.ac.in</a>
                </footer>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* MODAL: PI Details                                               */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {expandedPI && selectedPIDetails && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => setExpandedPI(null)} />
                    <div className="relative bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-2xl w-full max-w-[1200px] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="px-5 pt-5 pb-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-start justify-between relative bg-white dark:bg-[#18181B] rounded-t-2xl z-10 overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-14 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 dark:from-indigo-500/20 dark:to-blue-500/20 z-0" />
                            <div className="flex items-center gap-4 relative z-10 pt-4">
                                <div className="w-14 h-14 rounded-full bg-white dark:bg-[#27272A] flex items-center justify-center text-[#4f46e5] font-extrabold text-[20px] border border-indigo-100 dark:border-indigo-800 shadow-md ring-4 ring-white dark:ring-[#18181B]">
                                    {selectedPIDetails.user_name ? selectedPIDetails.user_name.charAt(0).toUpperCase() : "U"}
                                </div>
                                <div>
                                    <h2 className="text-[18px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">{selectedPIDetails.user_name}</h2>
                                    <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1.5 mt-0.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                        {selectedPIDetails.user_email}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setExpandedPI(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717A] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10 relative">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 bg-slate-50/50 dark:bg-slate-900/20 overflow-y-auto flex-1 min-h-0">
                            {/* Stats row */}
                            <PIStatCardsHead piDetails={selectedPIDetails} projects={selectedPIProjects} />

                            {/* Department Affiliations */}
                            <div>
                                <h3 className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] mb-3 uppercase tracking-widest flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-[#A1A1AA]" />
                                    Department Affiliations
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {(selectedPIDetails?.departments || [resolvedDeptName]).map((dept: string, i: number) => (
                                        <div key={`${dept}-${i}`} className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg p-3 flex items-center justify-between text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] shadow-sm">
                                            {getDeptName(dept) !== "—" ? getDeptName(dept) : dept}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Project Timeline */}
                            {selectedPIProjects.length > 0 && (() => {
                                const pagedProjects = selectedPIProjects.slice(
                                    (piModalPage - 1) * PI_PROJECTS_PAGE_SIZE,
                                    piModalPage * PI_PROJECTS_PAGE_SIZE
                                );
                                return (
                                    <div className="mt-5">
                                        <h3 className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] mb-3 uppercase tracking-widest flex items-center gap-2">
                                            <svg className="w-3.5 h-3.5 text-[#A1A1AA]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                            Project Timeline
                                            <span className="ml-auto text-[10px] font-semibold text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2 py-0.5 rounded-full normal-case tracking-normal">{selectedPIProjects.length} project{selectedPIProjects.length !== 1 ? "s" : ""}</span>
                                        </h3>
                                        <div className="flex flex-col gap-3">
                                            {pagedProjects.map((proj: any) => {
                                                const startDate = proj.prj_start_date ? new Date(proj.prj_start_date) : null;
                                                const endDate = proj.prj_end_date ? new Date(proj.prj_end_date) : null;
                                                const now = new Date();
                                                const isActive = startDate && endDate && now >= startDate && now <= endDate;
                                                const isCompleted = endDate && now > endDate;
                                                const progressPct = startDate && endDate && now > startDate ? Math.min(100, Math.round(((now.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100)) : 0;
                                                const progressColor = isCompleted ? "#A1A1AA" : progressPct >= 80 ? "#EF4444" : progressPct >= 60 ? "#FB923C" : progressPct >= 40 ? "#FACC15" : "#22C55E";

                                                return (
                                                    <div key={proj.name} className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl p-4 shadow-sm">
                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-snug line-clamp-2">{proj.project_title || proj.name}</div>
                                                                {proj.project_no && <div className="text-[10px] font-mono font-semibold text-[#71717A] dark:text-[#A1A1AA] mt-0.5">{proj.project_no}</div>}
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                                <ProjectFundStatusBadge projectName={proj.name} />
                                                                <button onClick={() => navigate(`/project-details-overview/${proj.name}`, { state: { returnTo: location.pathname + location.search, expandedPI, piModalPage } })}
                                                                    className="text-[10px] font-semibold text-[#D97757] hover:text-[#c26245] flex items-center gap-1 group transition-colors">
                                                                    View Project
                                                                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5 text-center flex flex-col justify-center">
                                                                <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">Sanction Amount</div>
                                                                <ProjectSanctionAmountLive
                                                                    proj={proj}
                                                                    className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight"
                                                                    emptyClassName="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight"
                                                                />
                                                            </div>
                                                            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5 text-center flex flex-col justify-center">
                                                                <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">Funding Agency</div>
                                                                <div className="text-[11px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-2" title={getProjectAgency(proj)}>
                                                                    {getProjectAgency(proj)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {startDate && endDate && (isActive || isCompleted) && (
                                                            <>
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-[10px] font-bold" style={{ color: progressColor }}>{progressPct}% complete</span>
                                                                    <span className="text-[10px] font-semibold text-[#A1A1AA]">{isCompleted ? "Finished" : `${Math.max(0, Math.round((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)))}mo left`}</span>
                                                                </div>
                                                                <div className="h-1.5 bg-[#F4F4F5] dark:bg-[#3F3F46] rounded-full overflow-hidden">
                                                                    <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: progressColor }} />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Pagination footer */}
                        {(() => {
                            const piProjectTotalPages = Math.ceil(selectedPIProjects.length / PI_PROJECTS_PAGE_SIZE);
                            if (piProjectTotalPages <= 1) return null;
                            return (
                                <div className="p-4 border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] rounded-b-2xl shrink-0 flex items-center justify-between">
                                    <button disabled={piModalPage === 1} onClick={() => setPiModalPage((p) => Math.max(1, p - 1))} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-40 transition-all">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
                                        Prev
                                    </button>
                                    <span className="text-[11px] font-semibold text-[#A1A1AA]">Page {piModalPage} of {piProjectTotalPages}</span>
                                    <button disabled={piModalPage === piProjectTotalPages} onClick={() => setPiModalPage((p) => Math.min(piProjectTotalPages, p + 1))} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-40 transition-all">
                                        Next
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* MODAL: KPI                                                      */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {kpiModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.45)" }} onClick={closeKpiModal}>
                    <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl border border-[#E4E4E7] dark:border-[#3F3F46] w-[95vw] max-w-[1100px] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46] shrink-0">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] mb-0.5">Projects</p>
                                <h2 className="text-[16px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">{kpiModal.title}</h2>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-[11px] font-semibold text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2.5 py-1 rounded-full">{kpiModalRows.length} record{kpiModalRows.length !== 1 ? "s" : ""}</span>
                                <button
                                    title="Export to Excel / CSV"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!kpiModalRows || kpiModalRows.length === 0) return;
                                        const csvContent = [
                                            ["Sl.", "Project No", "Project Title", "PI Name", "PI Email", "Department", "Project Type", "Funding Agency", "Origin", "Total Budget", "Start Date", "End Date", "Status"],
                                            ...kpiModalRows.map((p: any, idx: number) => [
                                                (idx + 1).toString(),
                                                p.project_no || "",
                                                `"${(p.project_title || "").replace(/"/g, '""')}"`,
                                                `"${(p.pi_webmail ? (piNameMap[p.pi_webmail.toLowerCase().trim()] || p.pi_webmail) : "").replace(/"/g, '""')}"`,
                                                `"${(p.pi_webmail || "").replace(/"/g, '""')}"`,
                                                `"${resolvedDeptName.replace(/"/g, '""')}"`,
                                                p.project_type || "",
                                                `"${getProjectAgency(p).replace(/"/g, '""')}"`,
                                                p.origin_of_funding_agency || "",
                                                p.total_budget_amount || p.grand_total_proposal || 0,
                                                p.prj_start_date || "",
                                                p.prj_end_date || "",
                                                `"${getDeptProjectStatus(p)}"`,
                                            ])
                                        ].map(e => e.join(",")).join("\n");
                                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement("a");
                                        link.setAttribute("href", url);
                                        link.setAttribute("download", `${kpiModal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-lg text-[11px] font-bold transition-colors"
                                >
                                    <FileDown size={14} />
                                    <span className="hidden sm:inline">Export</span>
                                </button>
                                <button
                                    title="Print as PDF (Landscape)"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!kpiModalRows || kpiModalRows.length === 0) return;
                                        const html = `
                                            <!DOCTYPE html><html><head><title>${kpiModal.title}</title>
                                            <style>
                                                @page { size: A4 landscape; margin: 10mm; }
                                                body { font-family: -apple-system, sans-serif; font-size: 9pt; padding: 20px; }
                                                h2 { margin-top: 0; font-size: 14pt; }
                                                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                                                th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
                                                th { background: #f8fafc; font-weight: bold; }
                                            </style></head><body>
                                            <h2>${kpiModal.title}</h2>
                                            <table><thead><tr>
                                                <th>Sl.</th><th>Project No</th><th>Project Title</th><th>PI Name</th><th>PI Email</th><th>Department</th>
                                                <th>Type</th><th>Funding Agency</th><th>Origin</th><th style="text-align:right;">Total Budget</th><th>Start Date</th><th>End Date</th><th>Status</th>
                                            </tr></thead><tbody>
                                                ${kpiModalRows.map((p: any, idx: number) => {
                                            const pi = p.pi_webmail ? (piNameMap[p.pi_webmail.toLowerCase().trim()] || p.pi_webmail) : "";
                                            const budget = p.total_budget_amount || p.grand_total_proposal || 0;
                                            const sDate = p.prj_start_date ? String(p.prj_start_date).split(" ")[0] : "";
                                            const eDate = p.prj_end_date ? String(p.prj_end_date).split(" ")[0] : "";
                                            return `<tr>
                                                        <td>${idx + 1}</td><td>${p.project_no || ""}</td><td>${p.project_title || ""}</td>
                                                        <td>${pi}</td><td>${p.pi_webmail || ""}</td><td>${resolvedDeptName}</td><td>${p.project_type || ""}</td>
                                                        <td>${getProjectAgency(p)}</td><td>${p.origin_of_funding_agency || ""}</td>
                                                        <td style="text-align:right;">${budget ? formatCurrency(budget) : "0"}</td>
                                                        <td>${sDate}</td><td>${eDate}</td><td>${getDeptProjectStatus(p)}</td>
                                                    </tr>`;
                                        }).join('')}
                                            </tbody></table>
                                            <script>window.onload = function() { window.print(); window.close(); }</script>
                                            </body></html>
                                        `;
                                        const win = window.open("", "_blank");
                                        if (win) { win.document.open(); win.document.write(html); win.document.close(); }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-lg text-[11px] font-bold transition-colors"
                                >
                                    <Printer size={14} />
                                    <span className="hidden sm:inline">Print</span>
                                </button>
                                <button onClick={closeKpiModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] transition-colors"><X size={16} /></button>
                            </div>
                        </div>

                        {/* Tabs for total/allocation */}
                        {(kpiModal.type === "total" || kpiModal.type === "allocation") && (
                            <div className="flex items-center gap-1 px-6 pt-3 pb-0 shrink-0 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                {[
                                    { key: "ongoing", label: "Ongoing", count: projectOverview.ongoing_projects || stats.ongoing, activeClass: "border-emerald-500 text-emerald-700 dark:text-emerald-400" },
                                    { key: "submitted", label: "Submitted", count: projectOverview.submitted_projects || stats.submitted, activeClass: "border-amber-500 text-amber-700 dark:text-amber-400" },
                                ].map((tab) => {
                                    const isActive = kpiModal.type === "total" ? kpiTab === tab.key : kpiAllocTab === tab.key;
                                    return (
                                        <button key={tab.key}
                                            onClick={() => { kpiModal.type === "total" ? setKpiTab(tab.key as any) : setKpiAllocTab(tab.key); setKpiPage(1); }}
                                            className={`flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-[11px] font-bold border-b-2 transition-colors ${isActive ? tab.activeClass + " border-current" : "border-transparent text-[#71717A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]"}`}>
                                            {tab.label}
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F4F4F5] dark:bg-[#3F3F46] text-[#71717A]">{tab.count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="overflow-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#FAFAF9] dark:bg-[#18181B] sticky top-0">
                                        {["#", "Project", "PI", "Funding Agency", "Status", "Budget"].map((h) => (
                                            <th key={h} className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#71717A]${h === "Budget" ? " text-right" : ""}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {kpiPagedRows.length === 0 ? (
                                        <tr><td colSpan={6} className="px-4 py-10 text-center text-[#71717A] text-sm">{isPageLoading ? "Loading…" : "No projects found."}</td></tr>
                                    ) : (
                                        kpiPagedRows.map((proj: any, idx: number) => (
                                            <tr
                                                key={proj.name || idx}
                                                className="border-t border-[#F4F4F5] dark:border-[#3F3F46] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors cursor-pointer"
                                                onClick={() => {
                                                    if (window.getSelection()?.toString()) return;
                                                    navigate(`/project-details-overview/${proj.name}`);
                                                }}
                                            >
                                                <td className="px-4 py-3 text-[10px] font-bold text-[#71717A] font-mono">{(kpiPage - 1) * KPI_PAGE_SIZE + idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-1">{proj.project_title || proj.name || "—"}</div>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                        {proj.project_no && (
                                                            <span className="font-mono text-[9px] text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-1.5 py-0.5 rounded inline-block">{proj.project_no}</span>
                                                        )}
                                                        {proj.project_type && (
                                                            <span className="font-mono text-[9px] text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded inline-block">{proj.project_type}</span>
                                                        )}
                                                        {proj.prj_start_date && (
                                                            <span className="font-mono text-[9px] text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded inline-block">
                                                                {String(proj.prj_start_date).split(" ")[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                                    <div className="font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                        {proj.pi_webmail ? (piNameMap[proj.pi_webmail.toLowerCase().trim()] || proj.pi_webmail) : "—"}
                                                    </div>
                                                    {proj.pi_webmail && <div className="mt-0.5">{proj.pi_webmail}</div>}
                                                </td>
                                                <td className="px-4 py-3 text-[11px] text-[#71717A] dark:text-[#A1A1AA] max-w-[160px] truncate" title={getProjectAgency(proj)}>
                                                    {getProjectAgency(proj)}
                                                </td>
                                                <td className="px-4 py-3"><StatusBadge status={getDeptProjectStatus(proj)} /></td>
                                                <td className="px-4 py-3 text-right text-[12px] font-extrabold text-[#059669] whitespace-nowrap">
                                                    {proj.total_budget_amount || proj.grand_total_proposal ? formatCurrency(proj.total_budget_amount || proj.grand_total_proposal) : "—"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {kpiTotalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#E4E4E7] dark:border-[#3F3F46] shrink-0">
                                <span className="text-[11px] text-[#71717A]">Page {kpiPage} of {kpiTotalPages}</span>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setKpiPage((p) => Math.max(1, p - 1))} disabled={kpiPage === 1} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
                                    {Array.from({ length: Math.min(5, kpiTotalPages) }, (_, i) => {
                                        const start = Math.max(1, Math.min(kpiPage - 2, kpiTotalPages - 4));
                                        const page = start + i;
                                        return <button key={page} onClick={() => setKpiPage(page)} className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-colors ${page === kpiPage ? "bg-[#2563eb] text-white" : "text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]"}`}>{page}</button>;
                                    })}
                                    <button onClick={() => setKpiPage((p) => Math.min(kpiTotalPages, p + 1))} disabled={kpiPage === kpiTotalPages} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
