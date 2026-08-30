import * as React from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
    useFrappeAuth,
    useFrappeGetDoc,
    useFrappeGetCall,
    useFrappeGetDocList,
    useFrappePostCall,
} from "frappe-react-sdk";
import { useUserRoles } from "../../components/UserRole";
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    LabelList,
} from "recharts";
import {
    FileDown,
    BarChart3,
    Users,
    Search,
    Filter,
    Building2,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    X,
    Printer,
    FileText,
    Loader2,
    CheckCircle,
    TrendingUp,
    TrendingDown,
    Minus,
} from "lucide-react";
import { generateDirectorReportHtml } from "@/utils/directorReportHtml";


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

function FundingAgencyNameDisplay({
    agencyId,
    fallbackText,
    fundingAgencyMap,
}: {
    agencyId: string;
    fallbackText: string;
    fundingAgencyMap: Record<string, string>;
}) {
    const { call, result } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_funding_agency_details"
    );

    React.useEffect(() => {
        const isMappedToSelf = fundingAgencyMap[agencyId] === agencyId;
        // If it's not in the map, or if the map just returned the raw ID (which happens with search_link)
        if (agencyId && (!fundingAgencyMap[agencyId] || isMappedToSelf) && agencyId !== fallbackText) {
            call({ agency_name: agencyId });
        }
    }, [agencyId, fundingAgencyMap, fallbackText, call]);

    const mappedName = fundingAgencyMap[agencyId];
    const fetchedName = result?.message?.all?.funding_agency_name;

    const display = fetchedName || mappedName || fallbackText || "—";

    return (
        <div
            className="text-[11px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-2"
            title={display}
        >
            {display}
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
        count: number | string;
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
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform"
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
                        <div
                            className={`text-[26px] font-extrabold tracking-tight leading-none drop-shadow-sm ${valueColor}`}
                        >
                            {isLoading ? (
                                <span className="text-[13px] font-bold text-[#71717A] dark:text-[#A1A1AA] animate-pulse">Loading…</span>
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

// Badge now driven purely by proj._status (computed from sync maps in the table's allProjs.map())
const AsyncTableStatusBadge: React.FC<{ proj: any; fundReceived?: boolean }> = ({ proj }) => {
    return <StatusBadge status={proj._status} />;
};

// Mirrors a table's current-page (+ next page) project names into a ref the fund-sync
// loop reads, so it can prioritize whatever's actually on screen. Renders nothing —
// `active` lets the caller suppress this when a different view (e.g. the KPI modal) is
// what the user is actually looking at, so the two trackers don't stomp each other.
const VisiblePageTracker: React.FC<{
    pageSlice: any[];
    nextPageSlice: any[];
    targetRef: React.MutableRefObject<Set<string>>;
    active: boolean;
}> = ({ pageSlice, nextPageSlice, targetRef, active }) => {
    React.useEffect(() => {
        if (!active) return;
        targetRef.current = new Set([...pageSlice, ...nextPageSlice].map((p: any) => p.name));
    });
    return null;
};

function StatusBadge({ status }: { status?: string }) {
    if (!status) return <span className="text-[#A1A1AA] text-[10px]">—</span>;

    // Fund-received status not fetched for this project yet — show this instead of a
    // guess that could silently flip (Pending → Active) once the background fetch lands.
    if (status === "loading")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 whitespace-nowrap animate-pulse">
                <span className="w-[5px] h-[5px] rounded-full bg-zinc-400 shrink-0" />
                Loading…
            </span>
        );

    // Granular computed statuses from sync maps
    if (status === "ongoing")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-500 shrink-0" />
                Active
            </span>
        );
    if (status === "pending_fund")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-sky-500 shrink-0" />
                Fund Pending
            </span>
        );
    if (status === "approved_sanction")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-purple-500 shrink-0" />
                Sanction Approved
            </span>
        );
    if (status === "pending_sanction" || status === "submitted")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-amber-400 shrink-0" />
                Pending Sanction
            </span>
        );
    if (status === "draft")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-zinc-400 shrink-0" />
                Draft
            </span>
        );
    if (status === "completed")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-violet-500 shrink-0" />
                Completed
            </span>
        );
    if (status === "cancelled")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-red-500 shrink-0" />
                Cancelled
            </span>
        );
    if (status === "pending")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-amber-500 shrink-0" />
                Pending
            </span>
        );

    const s = status.toLowerCase();

    // Sanctioned / Ongoing
    if (s.includes("ongoing") || s.includes("sanctioned") || s.includes("active"))
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-500 shrink-0" />
                Ongoing (Sanctioned)
            </span>
        );

    // Submitted — approved but waiting for sanction
    if (s.includes("submitted") || s.includes("pending sanction") || s.includes("approved"))
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-blue-500 shrink-0" />
                Submitted (Pending Sanction)
            </span>
        );

    // Draft
    if (s.includes("draft"))
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-zinc-400 shrink-0" />
                Draft
            </span>
        );

    // Completed
    if (s.includes("complet"))
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-violet-500 shrink-0" />
                Completed
            </span>
        );

    // Cancelled / Rejected
    if (s.includes("cancel") || s.includes("reject"))
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-red-500 shrink-0" />
                Cancelled
            </span>
        );

    // Pending / Awaiting something
    if (s.includes("pending") || s.includes("review") || s.includes("waiting"))
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-amber-500 shrink-0" />
                Pending
            </span>
        );

    // Fallback
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 whitespace-nowrap">
            <span className="w-[5px] h-[5px] rounded-full bg-zinc-400 shrink-0" />
            {status}
        </span>
    );
}

/** Tooltip for the sanction bar chart */
const BarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl px-3 py-2 text-xs font-bold text-slate-200 shadow-xl">
            <p className="text-slate-400 text-[11px] mb-1 font-bold">
                {payload[0].payload.year}
            </p>
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

// ── Cache for Fund Received API Calls ────────────────────────────────────────
const fundReceivedPromiseCache: Record<string, Promise<number>> = {};
const fundReceivedValueCache: Record<string, number> = {};

// ── Hook: fetch approved Fund Received total for all of a PI's projects ──────
function usePIFundReceivedTotal(projects: any[]) {
    const [total, setTotal] = React.useState<number | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const projectNamesKey = projects.map((p: any) => p.name).filter(Boolean).join(",");

    React.useEffect(() => {
        const projectNames = projects.filter((p: any) => p.name).map((p: any) => p.name);
        if (projectNames.length === 0) { setTotal(null); setProgress(0); return; }
        let cancelled = false;
        let done = 0;
        setLoading(true);
        setProgress(0);
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

                return fundReceivedPromiseCache[docname].finally(() => {
                    if (!cancelled) {
                        done += 1;
                        setProgress(Math.round((done / projectNames.length) * 100));
                    }
                });
            })
        ).then(amounts => {
            if (!cancelled) {
                setTotal(amounts.reduce((a, b) => a + b, 0));
                setLoading(false);
                setProgress(100);
            }
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectNamesKey]);

    return { total, loading, progress };
}

// ── Project Fund Status Badge ──────────────────────────────────────────────
function getProjectTimelineStatusBadge(latestStatus: string | undefined | null) {
    const s = (latestStatus || "").toLowerCase();
    if (s.includes("fund received")) {
        return {
            label: "Fund Received",
            className: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
        };
    }
    if (s.includes("sanction approved")) {
        return {
            label: "● Active",
            className: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
        };
    }
    return {
        label: "Pending Sanction",
        className: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
    };
}

// Same normalization as FundDetails.tsx — handles all response shapes
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

const ProjectFundStatusBadge: React.FC<{ projectName: string | undefined }> = ({ projectName }) => {
    // Fetch sanction data — sanction_workflow_status "Sanction Approved" means project is active
    const { data: sanctionResp, isLoading: sanctionLoading } = useFrappeGetCall<{ message: any }>(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project",
        { project_name: projectName || "" },
        projectName ? undefined : null,
        { revalidateOnFocus: false },
    );

    // Fetch fund received data — use proj.name (docname) as prjreg_title, same as FundDetails.tsx
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
        if (raw.message && raw.message.message && Array.isArray(raw.message.message)) {
            sanctionRecords = raw.message.message;
        } else if (raw.message && Array.isArray(raw.message)) {
            sanctionRecords = raw.message;
        } else if (Array.isArray(raw)) {
            sanctionRecords = raw;
        } else if (raw.data && Array.isArray(raw.data)) {
            sanctionRecords = raw.data;
        } else if (raw.message && raw.message.data && Array.isArray(raw.message.data)) {
            sanctionRecords = raw.message.data;
        }
    }

    // Normalize fund received records — handles all API response shapes
    const fundRecords: any[] = normalizeFundResp(fundResp);

    // Determine badge — requires BOTH sanction approved + fund received/approved for Active
    const hasSanctionApproved = sanctionRecords.some(r => (r.sanction_workflow_status || r.workflow_state || "").toLowerCase().includes("sanction approved"));
    // Fund records are approved when workflow_state is "Approved" or contains "fund received"
    const isFundApproved = (r: any) => {
        const s = (r.workflow_state || r.status || "").toLowerCase();
        return s === "approved" || s.includes("fund received");
    };
    const hasFundReceived = fundRecords.some(isFundApproved);

    let label: string;
    let className: string;
    if (hasSanctionApproved && hasFundReceived) {
        // Both approved — project is truly active
        label = "● Active";
        className = "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400";
    } else if (hasSanctionApproved) {
        // Sanction approved but fund receipt still pending
        label = "Pending Fund Received";
        className = "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400";
    } else {
        // No sanction yet
        label = "Pending Sanction";
        className = "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400";
    }

    if (isLoading) {
        return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 animate-pulse">Loading…</span>;
    }

    return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${className}`}>{label}</span>;
};

// getSanctionedAmount's bulk Fund Sanction map still comes back 0 for some projects
// (permission-scoped records, refnum_prj_num format mismatches, etc.) even though the
// project genuinely has an approved sanction — ProjectFundStatusBadge's own live lookup
// above proves the record exists. This live-corrects just those zero rows via the same
// per-project API, without adding an extra call for rows the bulk map already answered.
const ProjectSanctionAmountLive: React.FC<{ proj: any; bulkAmount: number }> = ({ proj, bulkAmount }) => {
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

    if (!needsLiveLookup) return <>{fmt(bulkAmount)}</>;
    if (isLoading) return <span className="text-[#A1A1AA] animate-pulse">Loading…</span>;

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

    return <>{liveAmount > 0 ? fmt(liveAmount) : "—"}</>;
};

export const ProjectDateBadge: React.FC<{ proj: any }> = ({ proj }) => {
    const { data: sanctionResp, isLoading } = useFrappeGetCall<{ message: any }>(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project",
        { project_name: proj.name || "" },
        proj.name ? undefined : null,
        { revalidateOnFocus: false },
    );

    const isSanc = proj._status === "ongoing" || proj._status === "completed" || (proj.workflow_state || "").toLowerCase().includes("sanction approved") || proj._status === "Fund sanctioned and formally approved";

    if (isLoading) {
        return <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded inline-block animate-pulse">Loading...</span>;
    }

    const raw = sanctionResp as any;
    let sanctionRecords: any[] = [];
    if (raw) {
        if (raw.message && raw.message.message && Array.isArray(raw.message.message)) {
            sanctionRecords = raw.message.message;
        } else if (raw.message && Array.isArray(raw.message)) {
            sanctionRecords = raw.message;
        } else if (Array.isArray(raw)) {
            sanctionRecords = raw;
        } else if (raw.data && Array.isArray(raw.data)) {
            sanctionRecords = raw.data;
        } else if (raw.message && raw.message.data && Array.isArray(raw.message.data)) {
            sanctionRecords = raw.message.data;
        }
    }

    let childSanctionDate = null;
    if (sanctionRecords.length > 0) {
        const validSanctions = sanctionRecords.filter(r => r.sanctioned_letter_date);
        if (validSanctions.length > 0) {
            childSanctionDate = validSanctions[0].sanctioned_letter_date;
        }
    }

    const d = childSanctionDate || proj.prj_start_date || proj.sanctioned_letter_date || proj.creation;

    if (!d) return null;

    const displayDate = typeof d === 'string' ? d.split(' ')[0] : new Date(d).toISOString().split('T')[0];

    return (
        <span className="font-mono text-[10px] text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded inline-block">
            {displayDate}
        </span>
    );
};

// Live-corrects the sanctioned amount for a single Ongoing row when the bulk Fund
// Sanction fetch didn't surface a matching amount (e.g. some migrated projects' Fund
// Sanction record isn't returned by the bulk list query for this user, even though the
// whitelisted per-project lookup — the same one ProjectDateBadge already uses — finds
// it). Only fires for Ongoing rows whose bulk amount is 0, not every row, so this
// doesn't reintroduce a per-project fetch loop.
const SanctionAmountOverride: React.FC<{ projectName: string; isOngoing: boolean; bulkAmount: number }> = ({ projectName, isOngoing, bulkAmount }) => {
    const shouldFetch = isOngoing && bulkAmount <= 0 && !!projectName;
    const { data } = useFrappeGetCall<{ message: any }>(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project",
        { project_name: projectName },
        shouldFetch ? undefined : null,
        { revalidateOnFocus: false },
    );

    let amount = bulkAmount;
    if (shouldFetch && data) {
        const raw = data as any;
        let records: any[] = [];
        if (Array.isArray(raw?.message?.message)) records = raw.message.message;
        else if (Array.isArray(raw?.message)) records = raw.message;
        else if (Array.isArray(raw)) records = raw;
        else if (Array.isArray(raw?.data)) records = raw.data;
        else if (Array.isArray(raw?.message?.data)) records = raw.message.data;

        const approved = records.find((r: any) => (r.sanction_workflow_status || r.workflow_state || "").toLowerCase().includes("sanction approved")) || records[0];
        if (approved) {
            const amt = Number(approved.total_sanctioned_amount) || 0;
            if (amt > 0) amount = amt;
        }
    }

    return <>{formatCurrency(amount)}</>;
};

// ── Dynamic Budget Cell (Fetches real utilized per row lazily) ───────────────
const ProjectDynamicBudgetCell: React.FC<{ proj: any; type: "sanctioned" | "utilized" | "remaining" | "proposed" }> = ({ proj, type }) => {
    const needsUtilized = type === "utilized" || type === "remaining";
    const memoizedProj = React.useMemo(() => [proj], [proj]);
    const { total, loading } = usePIFundReceivedTotal(needsUtilized ? memoizedProj : []);

    if (type === "sanctioned" || type === "proposed") {
        return (
            <div className="text-[12px] font-extrabold text-[#059669] whitespace-nowrap">
                {proj.total_budget_amount || proj.grand_total_proposal
                    ? formatCurrency(proj.total_budget_amount || proj.grand_total_proposal)
                    : "—"}
            </div>
        );
    }

    if (loading) {
        return <div className="text-[12px] font-extrabold text-[#71717A] opacity-50 whitespace-nowrap animate-pulse">Loading…</div>;
    }

    const utilizedAmount = total || 0;

    if (type === "utilized") {
        return (
            <div className="text-[12px] font-extrabold text-[#059669] whitespace-nowrap">
                {formatCurrency(utilizedAmount)}
            </div>
        );
    }

    if (type === "remaining") {
        const sanctionedAmount = proj.total_budget_amount || proj.grand_total_proposal || 0;
        const remainingAmount = Math.max(0, sanctionedAmount - utilizedAmount);
        return (
            <div className="text-[12px] font-extrabold text-[#2563eb] whitespace-nowrap">
                {formatCurrency(remainingAmount)}
            </div>
        );
    }

    return <div>—</div>;
};

// ── PI Stat Cards (extracted to satisfy Rules of Hooks) ──────────────────────
const PIStatCards: React.FC<{ piDetails: any; projects: any[]; getSanctionedAmount: (p: any) => number }> = ({ piDetails, projects, getSanctionedAmount }) => {
    const totalSanctioned = projects.reduce((sum: number, proj: any) =>
        sum + getSanctionedAmount(proj), 0);

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
                <div className="text-[10px] sm:text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">Projects</div>
            </div>
            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center flex flex-col justify-center">
                <div className="text-[18px] sm:text-[20px] font-extrabold text-[#7c3aed] leading-tight">{piDetails.departments?.length || 0}</div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">Implementing Departments</div>
            </div>
            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center flex flex-col justify-center">
                <div className="text-[18px] sm:text-[20px] font-extrabold text-[#059669] leading-tight">{totalSanctioned > 0 ? fmt(totalSanctioned) : "—"}</div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">Sanctioned</div>
            </div>
            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center flex flex-col justify-center">
                <div className="text-[18px] sm:text-[20px] font-extrabold text-[#d97706] leading-tight">
                    {fundTotalLoading ? <span className="text-[12px] font-bold text-[#A1A1AA] animate-pulse">Loading…</span> : formattedLiveFund ?? "—"}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">Fund Rcvd</div>
            </div>
        </div>
    );
};

interface StaffRecord {
    name: string;
    ps_designation: string;
    ps_department: string;
    pi_id: string;
    project_no: string;
}

const normalizeSchemeName = (name: string) => {
    if (!name) return "";
    const lower = name.toLowerCase().trim();
    if (lower.includes("matrics")) return "MATRICS";
    if (lower.includes("pmecrg") || lower.includes("prime minister") || lower.includes("early career research grant")) return "Prime Minister Early Career Research Grant (PM-ECRG)";
    if (lower.includes("irg") || lower.includes("inclusivity")) return "Inclusivity Research Grant (IRG)";
    if (lower.includes("ecrg")) return "Early Career Research Grant (ECRG)";
    if (lower.includes("pre-proposal") || lower.includes("preproposal")) return "ARG Pre-proposal";
    if (lower.includes("arg") || lower.includes("advance research grant") || lower.includes("advanced research grant")) return "Advanced Research Grant (ARG)";
    if (lower.includes("basic core research")) return "Basic Core Research";
    if (lower.includes("maha") && lower.includes("water")) return "MAHA for Water";
    if (lower.includes("maha") && lower.includes("drone")) return "MAHA Drones";
    if (lower.includes("maha") && lower.includes("leapfrog")) return "MAHA Leapfrog";
    return name.trim();
};

export function DirectorDashboard() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { currentUser } = useFrappeAuth();
    const [time, setTime] = React.useState(new Date());
    const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);
    const [isWaitingForFunds, setIsWaitingForFunds] = React.useState(false);
    const [previewHtml, setPreviewHtml] = React.useState<string | null>(null);
    const [kpiModal, setKpiModal] = React.useState<{
        type: string;
        title: string;
        year?: string;
        fundingAgency?: string;
        excludedFundingAgencies?: string[];
        allowedDepts?: string[];
        projectType?: string;
    } | null>(location.state?.kpiModal || null);
    const [kpiPage, setKpiPage] = React.useState<number>(location.state?.kpiPage || 1);
    const [kpiTab, setKpiTab] = React.useState<string>(location.state?.kpiTab || "all");
    const [kpiStatusFilter, setKpiStatusFilter] = React.useState<string>(location.state?.kpiStatusFilter || "all");
    const [kpiSchemeFilter, setKpiSchemeFilter] = React.useState<string[]>(location.state?.kpiSchemeFilter || []);
    const [isKpiSchemeDropdownOpen, setIsKpiSchemeDropdownOpen] = React.useState(false);
    const kpiSchemeDropdownRef = React.useRef<HTMLDivElement>(null);
    const [kpiAgeFilter, setKpiAgeFilter] = React.useState<string>(location.state?.kpiAgeFilter || "all");
    const [kpiAllocTab, setKpiAllocTab] = React.useState<string>(location.state?.kpiAllocTab || "ongoing");
    const [piModalPage, setPiModalPage] = React.useState<number>(location.state?.piModalPage || 1);
    const [deptModalPage, setDeptModalPage] = React.useState(1);
    const [kpiSearchText, setKpiSearchText] = React.useState<string>(location.state?.kpiSearchText || "");
    // Header search bar — quick project lookup by title/no/PI/dept, separate from
    // kpiSearchText above (which only filters rows already inside an open KPI modal).
    const [headerSearchText, setHeaderSearchText] = React.useState("");
    const [headerSearchFocused, setHeaderSearchFocused] = React.useState(false);
    const PI_PROJECTS_PAGE_SIZE = 2;
    const DEPT_MODAL_PAGE_SIZE = 10;
    const KPI_PAGE_SIZE = 10;

    // Projects table filter & pagination
    const [projectTableFilter, setProjectTableFilter] = React.useState<string>("all");
    const [projectTableSearch, setProjectTableSearch] = React.useState<string>(location.state?.projectTableSearch || "");
    const [showAllFunding, setShowAllFunding] = React.useState(false);
    const [projectTablePage, setProjectTablePage] = React.useState(1);
    const PROJECT_TABLE_PAGE_SIZE = 10;

    const [dashboardProjectTypeFilter, setDashboardProjectTypeFilter] = React.useState<"all" | "research" | "consultancy" | "others">("all");
    const [financialYearFilter, setFinancialYearFilter] = React.useState<string>("all");
    const [financialProjectTypeFilter, setFinancialProjectTypeFilter] = React.useState<string>("all");
    const getDashboardState = () => ({
        kpiModal, kpiPage, kpiTab, kpiStatusFilter, kpiSchemeFilter, kpiAgeFilter, kpiAllocTab, kpiSearchText,
        piModalPage, expandedPI, deptModalPage,
        projectTableFilter, projectTableSearch, showAllFunding, projectTablePage,
        dashboardProjectTypeFilter, financialYearFilter, financialProjectTypeFilter
    });

    React.useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const viewModeParam = searchParams.get("view") as
        | "Director"
        | "Department"
        | "PI";
    const viewMode = viewModeParam || "Director";

    const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
        fields: ["full_name", "user_roles"],
        enabled: !!currentUser,
    });

    const fullName = userData?.full_name || currentUser || "Guest";

    const { roles: currentUserRoles } = useUserRoles(currentUser ?? null);

    const { data: dashboardData, isLoading } = useFrappeGetCall<{
        message: any;
    }>("rndopsapp.dashboard.get_director_dashboard_data");

    // ── System Activity (forms processed, all doctypes) — purely additive widget,
    // doesn't touch or depend on anything above. See note.txt for the endpoint's response
    // shape and how each part is meant to be used.
    const { data: processCountsResp, isLoading: isProcessCountsLoading } = useFrappeGetCall<{
        message: {
            totals: { today: number; this_week: number; this_month: number; total: number };
            doctype_counts: Array<{
                doctype: string;
                module: string;
                today: number;
                this_week: number;
                this_month: number;
                total: number;
                children: Array<{ doctype: string; fieldname: string; today: number; this_week: number; this_month: number; total: number }>;
            }>;
            daily_trend: Array<{ date: string; count: number }>;
            weekly_trend: Array<{ week_start: string; count: number }>;
            monthly_trend: Array<{ month: string; count: number }>;
        };
    }>("rndopsapp.dashboard.get_module_process_counts");

    const processCounts = processCountsResp?.message;
    const [expandedActivityDoctypes, setExpandedActivityDoctypes] = React.useState<Set<string>>(new Set());
    const toggleActivityDoctype = React.useCallback((doctype: string) => {
        setExpandedActivityDoctypes(prev => {
            const next = new Set(prev);
            if (next.has(doctype)) next.delete(doctype);
            else next.add(doctype);
            return next;
        });
    }, []);

    // "myProjects" is a test/leftover doctype entry from the backend — hide it from
    // the Application-wise Activity list and everything derived from it.
    const sortedDoctypeCounts = React.useMemo(() => {
        return [...(processCounts?.doctype_counts || [])]
            .filter(r => r.doctype !== "myProjects")
            .sort((a, b) => b.total - a.total);
    }, [processCounts]);

    const ACTIVITY_TOP_N = 10;
    const [showAllActivityApps, setShowAllActivityApps] = React.useState(false);
    const visibleDoctypeCounts = showAllActivityApps ? sortedDoctypeCounts : sortedDoctypeCounts.slice(0, ACTIVITY_TOP_N);
    const maxDoctypeTotal = React.useMemo(
        () => Math.max(1, ...sortedDoctypeCounts.map(r => r.total)),
        [sortedDoctypeCounts]
    );

    // Bucketed by hundreds (0-100, 101-200, 201-300, ...) so rows are colour-coded by
    // volume tier instead of every bar looking identical — cool/muted for low activity,
    // warm/vibrant for high activity.
    const VOLUME_BUCKET_COLORS = [
        { from: "#94a3b8", to: "#64748b", text: "text-slate-600 dark:text-slate-400" },
        { from: "#38bdf8", to: "#0284c7", text: "text-sky-600 dark:text-sky-400" },
        { from: "#22d3ee", to: "#0891b2", text: "text-cyan-600 dark:text-cyan-400" },
        { from: "#2dd4bf", to: "#0d9488", text: "text-teal-600 dark:text-teal-400" },
        { from: "#34d399", to: "#059669", text: "text-emerald-600 dark:text-emerald-400" },
        { from: "#4ade80", to: "#16a34a", text: "text-green-600 dark:text-green-400" },
        { from: "#a3e635", to: "#65a30d", text: "text-lime-600 dark:text-lime-400" },
        { from: "#facc15", to: "#ca8a04", text: "text-yellow-600 dark:text-yellow-400" },
        { from: "#fb923c", to: "#ea580c", text: "text-orange-600 dark:text-orange-400" },
        { from: "#f87171", to: "#dc2626", text: "text-red-600 dark:text-red-400" },
    ];
    const getVolumeBucketColor = (total: number) => {
        const idx = Math.min(Math.floor(total / 100), VOLUME_BUCKET_COLORS.length - 1);
        return VOLUME_BUCKET_COLORS[idx];
    };
    const presentVolumeTiers = React.useMemo(() => {
        const idxSet = new Set(sortedDoctypeCounts.map(r => Math.min(Math.floor(r.total / 100), VOLUME_BUCKET_COLORS.length - 1)));
        return Array.from(idxSet).sort((a, b) => a - b).map(idx => {
            const isTop = idx === VOLUME_BUCKET_COLORS.length - 1 && maxDoctypeTotal >= idx * 100 + 100;
            return {
                color: VOLUME_BUCKET_COLORS[idx],
                label: isTop ? `${idx * 100 + 1}+` : `${idx * 100 + 1}-${idx * 100 + 100}`,
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortedDoctypeCounts, maxDoctypeTotal]);

    const USAGE_TIER_METRICS = {
        total: { label: "Total (All Time)", getValue: (r: { today: number; this_week: number; this_month: number; total: number }) => r.total },
        daily: { label: "Daily", getValue: (r: { today: number; this_week: number; this_month: number; total: number }) => r.today },
        weekly_avg: { label: "Weekly Avg/Day", getValue: (r: { today: number; this_week: number; this_month: number; total: number }) => Math.round((r.this_week / 7) * 10) / 10 },
        monthly_avg: { label: "Monthly Avg/Day", getValue: (r: { today: number; this_week: number; this_month: number; total: number }) => Math.round((r.this_month / 30) * 10) / 10 },
    } as const;
    const [usageTierMetric, setUsageTierMetric] = React.useState<keyof typeof USAGE_TIER_METRICS>("total");
    const [expandedUsageTier, setExpandedUsageTier] = React.useState<string | null>(null);
    const usageTierGetValue = USAGE_TIER_METRICS[usageTierMetric].getValue;

    // Splits applications into 3 equal-sized tiers by rank (not by fixed thresholds) so the
    // pie always has 3 meaningful groups regardless of how the selected metric is distributed.
    const usageTierBreakdown = React.useMemo(() => {
        const n = sortedDoctypeCounts.length;
        if (n === 0) return [];
        const unused = sortedDoctypeCounts.filter(r => usageTierGetValue(r) <= 0);
        const used = sortedDoctypeCounts
            .filter(r => usageTierGetValue(r) > 0)
            .sort((a, b) => usageTierGetValue(b) - usageTierGetValue(a));
        const third = Math.ceil(used.length / 3);
        const tiers = [
            { name: "Most Used", rows: used.slice(0, third), color: "#16a34a" },
            { name: "Moderately Used", rows: used.slice(third, third * 2), color: "#f59e0b" },
            { name: "Least Used", rows: used.slice(third * 2), color: "#3b82f6" },
            { name: "No Use", rows: unused, color: "#dc2626" },
        ];
        return tiers
            .filter(t => t.rows.length > 0)
            .map(t => ({
                name: t.name,
                color: t.color,
                appCount: t.rows.length,
                rows: t.rows,
                value: t.rows.reduce((s, r) => s + usageTierGetValue(r), 0),
            }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortedDoctypeCounts, usageTierMetric]);
    const usageTierTotal = usageTierBreakdown.reduce((s, t) => s + t.value, 0);
    // "No Use" always sums to 0 and would render an invisible slice — give zero-value tiers
    // a small nominal sliver purely for the pie's geometry while every label/tooltip still
    // reads the real value off usageTierBreakdown.
    const usageTierPieData = usageTierBreakdown.map(t => ({
        ...t,
        pieValue: t.value > 0 ? t.value : Math.max(1, Math.round(usageTierTotal * 0.03)),
    }));

    const TREND_SERIES_STYLE = {
        daily: { key: "daily", stroke: "#2563eb", gradientId: "formsActivityGradientDaily", label: "Daily", chipBg: "bg-blue-50 dark:bg-blue-950/30", textColor: "text-blue-600 dark:text-blue-400" },
        weeklyAvg: { key: "weeklyAvg", stroke: "#7c3aed", gradientId: "formsActivityGradientWeekly", label: "Weekly Avg/Day", chipBg: "bg-violet-50 dark:bg-violet-950/30", textColor: "text-violet-600 dark:text-violet-400" },
        monthlyAvg: { key: "monthlyAvg", stroke: "#059669", gradientId: "formsActivityGradientMonthly", label: "Monthly Avg/Day", chipBg: "bg-emerald-50 dark:bg-emerald-950/30", textColor: "text-emerald-600 dark:text-emerald-400" },
    } as const;

    const combinedTrendData = React.useMemo(() => {
        if (!processCounts) return [];
        // Daily has ~150 points across the dataset — trim to the most recent 30 so the
        // chart stays readable. Weekly/monthly totals are normalized to a "per day" rate
        // (their bucket's total / days in that bucket) so all three series share one scale
        // and can be overlaid on the same 30-day axis instead of forcing a tab switch.
        const days = processCounts.daily_trend.slice(-30);
        const weeklySorted = [...processCounts.weekly_trend].sort((a, b) => a.week_start.localeCompare(b.week_start));
        const monthlyByMonth = new Map(processCounts.monthly_trend.map(m => [m.month, m.count]));

        return days.map(d => {
            let weeklyTotal = 0;
            for (let i = weeklySorted.length - 1; i >= 0; i--) {
                if (weeklySorted[i].week_start <= d.date) { weeklyTotal = weeklySorted[i].count; break; }
            }
            const month = d.date.slice(0, 7);
            const monthlyTotal = monthlyByMonth.get(month) ?? 0;
            return {
                label: d.date.slice(5),
                daily: d.count,
                weeklyAvg: Math.round((weeklyTotal / 7) * 10) / 10,
                monthlyAvg: Math.round((monthlyTotal / 30) * 10) / 10,
            };
        });
    }, [processCounts]);

    const combinedTrendStats = React.useMemo(() => {
        if (!combinedTrendData.length) {
            return { dailyAvg: 0, weeklyAvg: 0, monthlyAvg: 0, trendPct: 0, trendDirection: "flat" as "up" | "down" | "flat" };
        }
        const last = combinedTrendData[combinedTrendData.length - 1];
        const prevDaily = combinedTrendData.length > 1 ? combinedTrendData[combinedTrendData.length - 2].daily : 0;
        const dailyAvg = Math.round((combinedTrendData.reduce((s, d) => s + d.daily, 0) / combinedTrendData.length) * 10) / 10;
        const trendPct = prevDaily > 0 ? Math.round(((last.daily - prevDaily) / prevDaily) * 100) : (last.daily > 0 ? 100 : 0);
        const trendDirection: "up" | "down" | "flat" = trendPct > 0 ? "up" : trendPct < 0 ? "down" : "flat";
        return { dailyAvg, weeklyAvg: last.weeklyAvg, monthlyAvg: last.monthlyAvg, trendPct, trendDirection };
    }, [combinedTrendData]);

    const data = dashboardData?.message || {};

    // isDirectorOnly = has Director role but NOT any of the other privileged roles
    const safeRoles = currentUserRoles || [];
    const isDirectorOnly =
        safeRoles.includes("Director") &&
        !safeRoles.some((r) =>
            ["Dean, RnD", "Ado_RnD", "Hos, RnD (Head of Section, RnD)", "head_approver_1"].includes(r)
        );

    const { data: deptList } = useFrappeGetDocList("Department_prornd", {
        fields: ["name", "dept_name"],
        limit: 5000,
    });

    const { data: standardDeptList } = useFrappeGetDocList("Department", {
        fields: ["name", "department_name"],
        limit: 5000,
    });

    const getDeptName = React.useCallback(
        (idOrName: string) => {
            if (!idOrName) return "—";

            if (deptList) {
                const found = deptList.find(
                    (d: any) => d.name === idOrName || d.dept_name === idOrName
                );
                if (found) return found.dept_name;
            }

            if (standardDeptList) {
                const foundStd = standardDeptList.find(
                    (d: any) => d.name === idOrName || d.department_name === idOrName
                );
                if (foundStd) return foundStd.department_name;
            }

            // Fallbacks for legacy/orphaned hashes
            if (idOrName === "hgdri9hvfq") {
                return "Jyoti and Bhupat Mehta School of Health Sciences and Technology";
            }

            return idOrName;
        },
        [deptList, standardDeptList]
    );

    // ── Staff Breakdown Fetching ──
    const [staffBreakdownOpen, setStaffBreakdownOpen] = React.useState(false);
    const [staffGroupBy, setStaffGroupBy] = React.useState<"designation" | "department" | "pi">("designation");

    // We use the exact same fetch method as SalaryRegisterFull to bypass potential useFrappeGetDocList limit caps
    const { data: staffBreakdownRes, isLoading: staffBreakdownLoading } = useFrappeGetCall<{ message: any[] }>(
        "rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.get_project_staff_details_list",
        {
            limit_page_length: 5000
        },
        staffBreakdownOpen ? undefined : null // only fetch if modal is open
    );

    const activeStaffList: StaffRecord[] = staffBreakdownRes?.message || [];

    // Fetch role-based project counts
    const { data: roleBasedProjectsData } = useFrappeGetCall<{ message: any }>(
        "rndopsapp.dashboard.get_role_based_project_counts"
    );

    const roleBasedProjects = roleBasedProjectsData?.message || [];

    // Build a name-lookup map from roleBasedProjects: lowercase email → display name
    // Prefer longer, more complete names over short salutations like "sir", "madam"
    const emailToNameMap = React.useMemo(() => {
        const SALUTATIONS = new Set(["sir", "madam", "ma'am", "dr", "prof", "professor"]);
        const map: Record<string, string> = {};
        roleBasedProjects.forEach((item: any) => {
            if (item.user_email && item.user_name) {
                const key = (item.user_email || "").toLowerCase().trim();
                const newName = item.user_name.trim();
                const existing = map[key];
                if (!existing) {
                    map[key] = newName;
                } else {
                    // Replace if current is a salutation but new one isn't, or new one is longer
                    const existingIsSalutation = SALUTATIONS.has(existing.toLowerCase());
                    const newIsSalutation = SALUTATIONS.has(newName.toLowerCase());
                    if (existingIsSalutation && !newIsSalutation) {
                        map[key] = newName;
                    } else if (!existingIsSalutation && !newIsSalutation && newName.length > existing.length) {
                        map[key] = newName;
                    }
                }
            }
        });
        return map;
    }, [roleBasedProjects]);

    // Fetch all projects with start/end dates for year-wise chart and KPI modals
    const { data: allProjectsList } = useFrappeGetDocList(
        "Project Registration",
        {
            fields: [
                "name",
                "project_no",
                "project_title",
                "pi_webmail",
                "principal_investigator_name",
                "implementation_department",
                "workflow_state",
                "project_type",
                "origin_of_funding_agency",
                "select_funding_agency",
                "funding_agency_other",
                "total_budget_amount",
                "grand_total_proposal",
                "prj_start_date",
                "prj_end_date",
                "project_duration_months",
                "sanctioned_letter_date",
                "creation",
                "funding_agen",
                "funding_agen.funding_agency_name",
                "funding_agency_schemes",
                "scheme_name",
            ],
            limit: 2000,
        }
    );


    // Fetch the master list of funding agencies using the project proposal fields API.
    // This API returns `link_options` which maps the IDs to human-readable labels and typically bypasses strict doc-level read restrictions.
    const { data: proposalFieldsData } = useFrappeGetCall<{ message: { link_options?: Record<string, { value: string, label: string }[]> } }>(
        "rndopsapp.rndopsapp.doctype.project_proposal.project_proposal.get_project_proposal_fields"
    );

    // Also fetch using search_link since the proposal fields API might only return the first 50 results.
    // This allows us to fetch up to 5000 agencies bypassing standard list restrictions if the user has search permission.
    const { data: searchLinkData } = useFrappeGetCall<{ message: { value: string, description: string, label?: string }[] }>(
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

    const fundingAgencyMap = React.useMemo(() => {
        const map: Record<string, string> = {};

        // Merge from search_link API
        if (searchLinkData?.message && Array.isArray(searchLinkData.message)) {
            searchLinkData.message.forEach(opt => {
                if (opt.value) {
                    // search_link usually puts the title in description or label
                    map[opt.value] = opt.description || opt.label || opt.value;
                }
            });
        }

        // Merge from proposal fields API (takes precedence if available as it often has exactly formatted labels)
        const fundingOptions = proposalFieldsData?.message?.link_options?.["funding_agen"] || [];
        fundingOptions.forEach(opt => {
            if (opt.value) map[opt.value] = opt.label;
        });

        return map;
    }, [proposalFieldsData, searchLinkData]);

    // ── Overview / finance values ─────────────────────────────────────────────
    const overview = data.project_overview || {};
    const funds = data.funding_analytics || {};
    const intl = data.international_collaboration || {};
    const proposals = data.proposal_analytics || {};
    const ipr = data.ipr_analytics || {};
    const topProjects = data.top_funded_projects || [];
    const recentProjects = data.recent_projects || [];

    // ── Status counts — from backend (single source of truth) ───────────────
    const ongoingIds = React.useMemo(() => {
        // Backend-provided (rndopsapp.dashboard.get_director_dashboard_data): Ongoing =
        // has at least one submitted (docstatus=1) Fund Sanction record. This is the
        // single source of truth — do not "correct" it with total_budget_amount, which
        // is a project's proposed budget and has no bearing on whether it's sanctioned.
        const ids = new Set<string>(overview.ongoing_project_nos || []);

        if (dashboardProjectTypeFilter === "all") return ids;
        const newIds = new Set<string>();
        (allProjectsList ?? []).forEach((p: any) => {
            if (ids.has(p.name)) {
                const type = (p.project_type || "").toLowerCase();
                if (dashboardProjectTypeFilter === "research" && (type.includes("research") || type === "r&d project")) newIds.add(p.name);
                else if (dashboardProjectTypeFilter === "consultancy" && (type.includes("consult") || type === "testing")) newIds.add(p.name);
                else if (dashboardProjectTypeFilter === "others" && !type.includes("research") && type !== "r&d project" && !type.includes("consult") && type !== "testing") newIds.add(p.name);
            }
        });
        return newIds;
    }, [overview, dashboardProjectTypeFilter, allProjectsList]);

    const submittedIds = React.useMemo(() => {
        // Same backend-provided source of truth as ongoingIds above — no budget-based override.
        const ids = new Set<string>(overview.submitted_project_nos || []);

        if (dashboardProjectTypeFilter === "all") return ids;
        const newIds = new Set<string>();
        (allProjectsList ?? []).forEach((p: any) => {
            if (ids.has(p.name)) {
                const type = (p.project_type || "").toLowerCase();
                if (dashboardProjectTypeFilter === "research" && (type.includes("research") || type === "r&d project")) newIds.add(p.name);
                else if (dashboardProjectTypeFilter === "consultancy" && (type.includes("consult") || type === "testing")) newIds.add(p.name);
                else if (dashboardProjectTypeFilter === "others" && !type.includes("research") && type !== "r&d project" && !type.includes("consult") && type !== "testing") newIds.add(p.name);
            }
        });
        return newIds;
    }, [overview, dashboardProjectTypeFilter, allProjectsList]);

    const globalTypeCounts = React.useMemo(() => {
        let r = 0, c = 0, o = 0;
        (allProjectsList ?? []).forEach((p: any) => {
            if (!ongoingIds.has(p.name) && !submittedIds.has(p.name)) return;
            const type = (p.project_type || "").toLowerCase();
            if (type.includes("research") || type === "r&d project") r++;
            else if (type.includes("consult") || type === "testing") c++;
            else o++;
        });
        return { r, c, o, all: r + c + o };
    }, [allProjectsList, ongoingIds, submittedIds]);

    // Header search bar results — same match fields as kpiSearchText (project title,
    // no, PI email/name, department), capped to a short list for a dropdown rather
    // than the full KPI-modal table.
    const HEADER_SEARCH_LIMIT = 8;
    const headerSearchResults = React.useMemo(() => {
        const query = headerSearchText.toLowerCase().trim();
        if (!query) return [];
        const matches: any[] = [];
        for (const p of (allProjectsList ?? [])) {
            const title = (p.project_title || p.name || "").toLowerCase();
            const projNo = (p.project_no || p.name || "").toLowerCase();
            const piEmail = (p.pi_webmail || "").toLowerCase();
            const piName = (p.pi_webmail ? (emailToNameMap[p.pi_webmail.toLowerCase().trim()] || p.pi_webmail.split("@")[0]) : "").toLowerCase();
            const deptName = (p.implementation_department || p.user_department || p.dept_name || "").toLowerCase();
            if (title.includes(query) || projNo.includes(query) || piEmail.includes(query) || piName.includes(query) || deptName.includes(query)) {
                matches.push(p);
                if (matches.length >= HEADER_SEARCH_LIMIT) break;
            }
        }
        return matches;
    }, [allProjectsList, headerSearchText, emailToNameMap]);

    // Fund Sanction supports bulk List-View access (confirmed working elsewhere in
    // this app), so fetch it in one request. Submitted vs Ongoing classification
    // comes from the backend's authoritative ongoingIds/submittedIds (see
    // get_director_dashboard_data), not from this list — this is used only for the
    // sanction letter date (year-bucketing) and, as a display-only fallback, the
    // sanctioned amount for projects whose Project Registration budget field is 0.
    const { data: allFundSanctionList } = useFrappeGetDocList(
        "Fund Sanction",
        {
            fields: ["refnum_prj_num", "sanctioned_letter_date", "total_sanctioned_amount", "workflow_state"],
            limit: 20000,
        }
    );

    const { sanctionDateMap, sanctionAmountMap } = React.useMemo(() => {
        // A project can have more than one Fund Sanction record (drafts, superseded
        // revisions, stray records from legacy-system migrations). Without an explicit
        // orderBy, an unordered query's row order isn't guaranteed stable across different
        // LIMIT values, so "first record wins" alone can non-deterministically pick a
        // stale record. Prefer the record whose workflow_state shows it's actually
        // approved; only fall back to an unapproved one if no approved record exists.
        const dateMap = new Map<string, string>();
        const amountMap = new Map<string, number>();
        const approvedDate = new Map<string, string>();
        const approvedAmount = new Map<string, number>();
        (allFundSanctionList || []).forEach((rec: any) => {
            if (!rec.refnum_prj_num) return;
            const isApproved = (rec.workflow_state || "").toLowerCase().includes("sanction approved");
            if (rec.sanctioned_letter_date) {
                if (!dateMap.has(rec.refnum_prj_num)) dateMap.set(rec.refnum_prj_num, rec.sanctioned_letter_date);
                if (isApproved && !approvedDate.has(rec.refnum_prj_num)) approvedDate.set(rec.refnum_prj_num, rec.sanctioned_letter_date);
            }
            const amt = Number(rec.total_sanctioned_amount) || 0;
            if (amt > 0) {
                if (!amountMap.has(rec.refnum_prj_num)) amountMap.set(rec.refnum_prj_num, amt);
                if (isApproved && !approvedAmount.has(rec.refnum_prj_num)) approvedAmount.set(rec.refnum_prj_num, amt);
            }
        });
        approvedDate.forEach((v, k) => dateMap.set(k, v));
        approvedAmount.forEach((v, k) => amountMap.set(k, v));
        return { sanctionDateMap: dateMap, sanctionAmountMap: amountMap };
    }, [allFundSanctionList]);

    // Display-only fallback for the sanctioned amount — some legacy projects only
    // carry the real sanctioned amount on the Fund Sanction record, not on their
    // own total_budget_amount/grand_total_proposal field. Not used for status.
    const getSanctionedAmount = React.useCallback((p: any) => {
        const own = Number(p.total_budget_amount || p.grand_total_proposal) || 0;
        if (own > 0) return own;
        return sanctionAmountMap.get(p.name) || sanctionAmountMap.get(p.project_no) || 0;
    }, [sanctionAmountMap]);

    // Synchronous funding-agency resolution for CSV/print exports, which can't await the
    // live per-project lookup FundingAgencyNameDisplay does on screen. Mirrors that same
    // priority order (funding_agen resolved via fundingAgencyMap, then direct text fields,
    // then scheme-based inference) so exported data matches what the table displays.
    const resolveAgencyName = React.useCallback((p: any) => {
        let agency = fundingAgencyMap[p.funding_agen] || p.select_funding_agency || p["funding_agen.funding_agency_name"]
            || p.funding_agency_name || p.funding_agency || p.funding_agency_other || "";
        if (!agency && (p.origin_of_funding_agency === "National" || p.origin_of_funding_agency === "International")) {
            agency = "";
        } else if (!agency) {
            agency = p.origin_of_funding_agency || "";
        }

        if (!agency || agency.trim() === "" || agency === "—") {
            const scheme = (p.funding_agency_schemes || p.scheme_name || "").toUpperCase();
            if (scheme.includes("ANRF")) agency = "ANRF - (Anusandhan National Research Foundation)";
            else if (scheme.includes("SERB")) agency = "SERB";
            else if (scheme.includes("DST")) agency = "Department Of Science and Technology";
            else if (scheme.includes("DBT")) agency = "DBT - Department of Biotechnology";
        } else if (agency.trim().toUpperCase() === "ANRF") {
            agency = "ANRF - (Anusandhan National Research Foundation)";
        }

        return agency.trim();
    }, [fundingAgencyMap]);

    // Fallback for projects with no sanction/start date on file: derive a date from the
    // "Dean approval" comment on the project's timeline. Bulk-fetched (single request,
    // Comment is a standard doctype) rather than per-project, to avoid re-introducing the
    // slow per-project sync loop. Best-effort match on comment text containing "dean".
    const { data: deanCommentList } = useFrappeGetDocList(
        "Comment",
        {
            fields: ["reference_name", "content", "creation"],
            filters: [
                ["reference_doctype", "=", "Project Registration"],
                ["content", "like", "%dean%"],
            ],
            orderBy: { field: "creation", order: "asc" },
            limit: 20000,
        }
    );

    const deanApprovalDateMap = React.useMemo(() => {
        const fallback = new Map<string, string>();
        const approved = new Map<string, string>();
        (deanCommentList || []).forEach((c: any) => {
            if (!c.reference_name || !c.creation) return;
            const text = (c.content || "").toLowerCase();
            if (!text.includes("dean")) return;
            // Prefer comments that read like an actual approval action over a mere mention
            if (/approv/.test(text)) {
                if (!approved.has(c.reference_name)) approved.set(c.reference_name, c.creation);
            } else if (!fallback.has(c.reference_name)) {
                fallback.set(c.reference_name, c.creation);
            }
        });
        approved.forEach((v, k) => fallback.set(k, v));
        return fallback;
    }, [deanCommentList]);

    // Single source of truth for a project's "effective" start date, walking the full
    // fallback chain: real sanction date → recorded start date → Dean approval comment → creation.
    const getEffectiveStartDate = React.useCallback((p: any) => {
        return sanctionDateMap.get(p.name) || sanctionDateMap.get(p.project_no)
            || p.sanctioned_letter_date || p.prj_start_date
            || deanApprovalDateMap.get(p.name) || deanApprovalDateMap.get(p.project_no)
            || p.creation;
    }, [sanctionDateMap, deanApprovalDateMap]);

    // Fund Received doesn't support bulk List-View access on this Frappe instance,
    // so it's still fetched per-project via the whitelisted method, in the
    // background. This only refines the Active / Pending-Fund-Received distinction
    // in more detailed views (KPI modal, per-row badges) — it no longer blocks the
    // main chart above.
    const [fundStatusMap, setFundStatusMap] = React.useState<Map<string, boolean>>(new Map());
    // Surfaces the background sync below so the UI can show a "still syncing" indicator
    // instead of silently flipping Status badges (Fund Pending → Active) as data trickles
    // in, and so Export/Print can wait for it instead of capturing a transient snapshot.
    const [isSyncingFunds, setIsSyncingFunds] = React.useState(false);
    // Whatever's currently on screen (current page + the next one, so paging forward
    // already has a head start) — kept live via a ref rather than a useEffect dependency
    // so updating it doesn't restart the sync loop below. Read once at the start of each
    // sync pass, so fund status resolves for visible rows before the rest of the list.
    const visibleProjectNamesRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        let isCancelled = false;
        if (!allProjectsList || allProjectsList.length === 0) return;

        const syncFunds = async () => {
            if (!isCancelled) setIsSyncingFunds(true);
            const map = new Map<string, boolean>();
            // ongoingIds is authoritative (submitted Fund Sanction exists) — only those
            // projects can possibly have a fund received against them.
            const unordered = allProjectsList.filter((p: any) => ongoingIds && ongoingIds.has(p.name));
            // Sync whatever's currently on screen first, so its Active/Fund Pending badges
            // resolve before the rest of the (possibly much longer) list finishes in the
            // background — instead of syncing in arbitrary list order.
            const visible = visibleProjectNamesRef.current;
            const projectsToFetch = [...unordered].sort((a: any, b: any) => {
                const aVis = visible.has(a.name) ? 0 : 1;
                const bVis = visible.has(b.name) ? 0 : 1;
                return aVis - bVis;
            });
            const total = projectsToFetch.length;

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
                    } catch (e) {
                        map.set(p.name, false);
                    }
                }));

                if (!isCancelled) {
                    setFundStatusMap(new Map(map));
                }
            }
            if (!isCancelled) setIsSyncingFunds(false);
        };

        syncFunds();
        return () => { isCancelled = true; };
    }, [ongoingIds, allProjectsList]);

    const getProjectStatusLabel = React.useCallback((p: any) => {
        // ongoingIds is the backend's authoritative signal (submitted Fund Sanction
        // exists) — no need to re-derive it from budget amount or workflow_state text.
        const isOngoing = ongoingIds && (ongoingIds.has(p.name) || ongoingIds.has(p.project_no));

        if (isOngoing) {
            const hasStartDate = !!(sanctionDateMap.get(p.name) || sanctionDateMap.get(p.project_no) || p.sanctioned_letter_date);
            const hasFundReceived = fundStatusMap.get(p.name) === true;
            if (hasFundReceived) return "● Active";
            if (hasStartDate) return "Pending Fund Received";
            return "Approved Sanction";
        }

        if (submittedIds && (submittedIds.has(p.name) || submittedIds.has(p.project_no))) return "Pending Sanction";

        const s = (p.workflow_state || "").toLowerCase();
        if (s.includes("draft")) return "Draft";
        if (s.includes("complet")) return "Completed";
        if (s.includes("cancel") || s.includes("reject")) return "Cancelled";
        if (p.workflow_state) return p.workflow_state;
        return "New Registered";
    }, [ongoingIds, submittedIds, sanctionDateMap, fundStatusMap]);

    // ── projectStatusCounts ──────────────────────────────────────────────────
    // ongoingIds/submittedIds are already the backend's authoritative classification
    // (Fund Sanction docstatus=1 = Ongoing) — no per-project re-verification or sync
    // wait needed, unlike before.
    const projectStatusCounts = React.useMemo(() => {
        let ongoing = 0, submitted = 0;
        (allProjectsList || []).forEach((proj: any) => {
            if (ongoingIds.has(proj.name)) ongoing++;
            else if (submittedIds.has(proj.name)) submitted++;
        });
        return { ongoing, submitted };
    }, [allProjectsList, ongoingIds, submittedIds]);

    // ── Project status by year ─────────────────────────────────────────────
    // ongoingIds/submittedIds are authoritative — bucket directly by year, no
    // further per-project sanction-approval re-check needed.
    const projectStatusByYearData = React.useMemo(() => {
        const yearMap: Record<string, { year: string; ongoing: number; submitted: number }> = {};

        (allProjectsList || []).forEach((proj: any) => {
            const isOngoing = ongoingIds.has(proj.name);
            const isSubmitted2 = !isOngoing && submittedIds.has(proj.name);
            if (!isOngoing && !isSubmitted2) return;

            const dateStr = getEffectiveStartDate(proj);
            if (!dateStr) return;

            const yr = new Date(dateStr).getFullYear();
            if (isNaN(yr) || yr < 2019 || yr >= 2100) return;

            const yearLabel = String(yr);
            if (!yearMap[yearLabel]) yearMap[yearLabel] = { year: yearLabel, ongoing: 0, submitted: 0 };

            if (isOngoing) yearMap[yearLabel].ongoing += 1;
            else if (isSubmitted2) yearMap[yearLabel].submitted += 1;
        });

        return Object.values(yearMap).map(d => ({
            year: d.year,
            ongoing: d.ongoing === 0 ? null : d.ongoing,
            submitted: d.submitted === 0 ? null : d.submitted,
        })).sort((a, b) => a.year.localeCompare(b.year));
    }, [allProjectsList, ongoingIds, submittedIds, getEffectiveStartDate]);

    // ── Chart year/type filters ──
    const [chartYearFilter, setChartYearFilter] = React.useState<string>("All Time");
    const [chartProjectTypeFilter, setChartProjectTypeFilter] = React.useState<string>("all");

    // Recomputed from allProjectsList directly (rather than filtering
    // projectStatusByYearData, which has no type dimension) so the Type dropdown can
    // narrow the bars. projectStatusByYearData itself stays untouched — it also feeds the
    // separate annual-report generator, which should always use the unfiltered totals.
    const chartDisplayData = React.useMemo(() => {
        const yearMap: Record<string, { year: string; ongoing: number; submitted: number }> = {};
        (allProjectsList || []).forEach((proj: any) => {
            const isOngoing = ongoingIds.has(proj.name);
            const isSubmitted2 = !isOngoing && submittedIds.has(proj.name);
            if (!isOngoing && !isSubmitted2) return;

            if (chartProjectTypeFilter !== "all") {
                const type = (proj.project_type || "").toLowerCase();
                if (chartProjectTypeFilter === "research" && !(type.includes("research") || type === "r&d project")) return;
                if (chartProjectTypeFilter === "consultancy" && !(type.includes("consult") || type === "testing")) return;
                if (chartProjectTypeFilter === "others" && (type.includes("research") || type === "r&d project" || type.includes("consult") || type === "testing")) return;
            }

            const dateStr = getEffectiveStartDate(proj);
            if (!dateStr) return;

            const yr = new Date(dateStr).getFullYear();
            if (isNaN(yr) || yr < 2019 || yr >= 2100) return;

            const yearLabel = String(yr);
            if (!yearMap[yearLabel]) yearMap[yearLabel] = { year: yearLabel, ongoing: 0, submitted: 0 };

            if (isOngoing) yearMap[yearLabel].ongoing += 1;
            else if (isSubmitted2) yearMap[yearLabel].submitted += 1;
        });

        let list = Object.values(yearMap).map(d => ({
            year: d.year,
            ongoing: d.ongoing === 0 ? null : d.ongoing,
            submitted: d.submitted === 0 ? null : d.submitted,
        })).sort((a, b) => a.year.localeCompare(b.year));

        if (chartYearFilter !== "All Time") list = list.filter(d => d.year === chartYearFilter);
        return list;
    }, [allProjectsList, ongoingIds, submittedIds, getEffectiveStartDate, chartProjectTypeFilter, chartYearFilter]);

    // Research/Consultancy/Others split for the panel's legend area — respects the Year
    // filter (for "at a glance" context matching what's charted) but always shows all
    // three types regardless of the Type dropdown, so it stays a comparison reference.
    const chartTypeBreakdown = React.useMemo(() => {
        let ro = 0, rs = 0, co = 0, cs = 0, oo = 0, os = 0;
        (allProjectsList ?? []).forEach((p: any) => {
            const isOngoing = ongoingIds.has(p.name);
            const isSubmitted = !isOngoing && submittedIds.has(p.name);
            if (!isOngoing && !isSubmitted) return;

            if (chartYearFilter !== "All Time") {
                const dateStr = getEffectiveStartDate(p);
                const yr = dateStr ? new Date(dateStr).getFullYear() : null;
                if (String(yr) !== chartYearFilter) return;
            }

            const type = (p.project_type || "").toLowerCase();
            if (type.includes("research") || type === "r&d project") {
                if (isOngoing) ro++; else rs++;
            } else if (type.includes("consult") || type === "testing") {
                if (isOngoing) co++; else cs++;
            } else {
                if (isOngoing) oo++; else os++;
            }
        });
        return { researchOngoing: ro, researchSubmitted: rs, consultancyOngoing: co, consultancySubmitted: cs, othersOngoing: oo, othersSubmitted: os };
    }, [allProjectsList, ongoingIds, submittedIds, getEffectiveStartDate, chartYearFilter]);

    const chartYearSubmittedTotal = React.useMemo(() => {
        return chartDisplayData.reduce((s, d) => s + (Number(d.submitted) || 0), 0);
    }, [chartDisplayData]);

    const chartYearOngoingTotal = React.useMemo(() => {
        return chartDisplayData.reduce((s, d) => s + (Number(d.ongoing) || 0), 0);
    }, [chartDisplayData]);

    const chartAvailableYears = React.useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years: string[] = [];
        for (let y = currentYear; y >= 2019; y--) years.push(String(y));
        return years;
    }, []);

    const fundingTypeData = data.funding_sources || [];



    const allocBadges = React.useMemo(
        () => [
            {
                label: "Ongoing",
                originalState: "ongoing",
                count: projectStatusCounts.ongoing,
                dotColor: "bg-emerald-500",
                bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
                textClass: "text-emerald-700 dark:text-emerald-400",
            },
            {
                label: "Submitted",
                originalState: "submitted",
                count: projectStatusCounts.submitted,
                title: "Pending Sanction / Approved Sanction / Pending Fund Received",
                dotColor: "bg-amber-400",
                bgClass: "bg-amber-50 dark:bg-amber-950/30",
                textClass: "text-amber-700 dark:text-amber-400",
            },
        ],
        [projectStatusCounts]
    );



    // ── KPI modal rows — use backend-provided ID sets ────────────────────────
    const kpiAvailableSchemes = React.useMemo(() => {
        if (!kpiModal || !allProjectsList || (kpiModal.type !== "total" && kpiModal.type !== "ongoing" && kpiModal.type !== "allocation")) return [];
        let base = [...allProjectsList];
        if (kpiModal.fundingAgency) {
            if (kpiModal.fundingAgency === "Missing Funding Agency Name") {
                base = base.filter(p => !p.funding_agency && !p.funding_agency_name && !p.funding_agency_schemes && !p.scheme_name);
            } else if (kpiModal.fundingAgency === "Others" && kpiModal.excludedFundingAgencies) {
                base = base.filter(p => {
                    const agency = p.funding_agency || p.funding_agency_name || p.funding_agency_schemes || p.scheme_name;
                    return agency && !kpiModal.excludedFundingAgencies!.includes(agency);
                });
            } else {
                base = base.filter(p => (p.funding_agency || p.funding_agency_name || p.funding_agency_schemes || p.scheme_name) === kpiModal.fundingAgency);
            }
        }
        if (kpiModal.allowedDepts) {
            base = base.filter(p => {
                const d = p.implementation_department || p.user_department || p.dept_name;
                return d && kpiModal.allowedDepts!.includes(d);
            });
        }
        const schemes = new Set<string>();
        base.forEach(p => {
            const s = (p.funding_agency_schemes || p.scheme_name || "").trim();
            if (s && s !== "—") schemes.add(normalizeSchemeName(s));
        });
        return Array.from(schemes).sort();
    }, [allProjectsList, kpiModal]);

    const kpiModalRows = React.useMemo(() => {
        const projects: any[] = allProjectsList ?? [];
        if (!kpiModal) return [];

        const kpiGetStatus = (p: any): string => {
            // ongoingIds is authoritative (submitted Fund Sanction exists) — no
            // further budget/workflow-state re-derivation needed.
            if (!ongoingIds.has(p.name)) {
                if (submittedIds.has(p.name)) return "pending_sanction";
                // Neither ongoing nor submitted — derive an actual label from
                // workflow_state (same fallback as getProjectStatusLabel) instead of the
                // meaningless placeholder "other", which used to leak straight into the
                // Status column via StatusBadge's fallback case.
                const s = (p.workflow_state || "").toLowerCase();
                if (s.includes("draft")) return "draft";
                if (s.includes("complet")) return "completed";
                if (s.includes("cancel") || s.includes("reject")) return "cancelled";
                return p.workflow_state || "draft";
            }
            // fund-received status is fetched per-project in the background (no bulk API
            // for that doctype) — show a Loading badge instead of a guess that could
            // silently flip from Pending to Active once the fetch resolves.
            if (!fundStatusMap.has(p.name)) return "loading";
            const hasStartDate = !!(sanctionDateMap.get(p.name) || p.prj_start_date || p.sanctioned_letter_date);
            const hasFundReceived = fundStatusMap.get(p.name) === true;
            if (hasFundReceived) return "ongoing";
            if (hasStartDate) return "pending_fund";
            return "approved_sanction";
        };

        const getBaseRows = () => {
            if (kpiModal.type === "total" || kpiModal.type === "ongoing" || kpiModal.type === "allocation") {
                let filtered = projects;

                // Apply year filter — use same date priority as the year chart
                if (kpiModal.year) {
                    filtered = filtered.filter(p => {
                        const dateStr = getEffectiveStartDate(p);
                        if (!dateStr) return false;
                        const yr = new Date(dateStr).getFullYear();
                        return !isNaN(yr) && String(yr) === kpiModal.year;
                    });
                }

                // Apply strict projectType filter if present
                if (kpiModal.projectType) {
                    if (kpiModal.projectType === "research") {
                        filtered = filtered.filter(p => p.project_type?.toLowerCase() === "research" || p.project_type?.toLowerCase() === "r&d project");
                    } else if (kpiModal.projectType === "consultancy") {
                        filtered = filtered.filter(p => p.project_type?.toLowerCase() === "consultancy" || p.project_type?.toLowerCase() === "testing");
                    } else if (kpiModal.projectType === "others") {
                        filtered = filtered.filter(p => {
                            const pt = p.project_type?.toLowerCase() || "";
                            return pt !== "research" && pt !== "r&d project" && pt !== "consultancy" && pt !== "testing";
                        });
                    }
                }

                // Apply funding filter if present
                if (kpiModal.fundingAgency) {
                    if (kpiModal.fundingAgency === "Missing Funding Agency Name") {
                        filtered = filtered.filter(p => !p.funding_agency && !p.funding_agency_name && !p.funding_agency_schemes && !p.scheme_name);
                    } else if (kpiModal.fundingAgency === "Others" && kpiModal.excludedFundingAgencies) {
                        filtered = filtered.filter(p => {
                            const agency = p.funding_agency || p.funding_agency_name || p.funding_agency_schemes || p.scheme_name;
                            return agency && !kpiModal.excludedFundingAgencies!.includes(agency);
                        });
                    } else {
                        filtered = filtered.filter(p => (p.funding_agency || p.funding_agency_name || p.funding_agency_schemes || p.scheme_name) === kpiModal.fundingAgency);
                    }
                }

                // Apply department filter if present
                if (kpiModal.allowedDepts) {
                    filtered = filtered.filter(p => {
                        const d = p.implementation_department || p.user_department || p.dept_name;
                        return d && kpiModal.allowedDepts!.includes(d);
                    });
                }

                const isProjectComplete = (p: any) => {
                    const hasBudget = Number(p.total_budget_amount || p.grand_total_proposal || 0) > 0;
                    const hasProjectNo = !!(p.project_no && p.project_no.trim());
                    const agencyRaw = p.funding_agency_name || p.funding_agency || p.funding_agency_other || p.origin_of_funding_agency || p.funding_agency_schemes || p.scheme_name || "";
                    const hasAgency = !!agencyRaw.trim();
                    return hasBudget && hasProjectNo && hasAgency;
                };

                if (kpiTab !== "draft" && kpiTab !== "pending") {
                    // Narrower statuses are checked before the broad "ongoing" fallback below —
                    // otherwise kpiModal.type === "ongoing" (true for every Ongoing Projects
                    // modal open) would always win first and swallow a more specific
                    // kpiStatusFilter like "active"/"pending_fund" before it's ever read.
                    if (kpiStatusFilter === "active") {
                        // True Active = sanction approved AND fund received, distinct from the
                        // broader "ongoing" bucket below (which also includes Pending Fund).
                        filtered = filtered.filter((p) => kpiGetStatus(p) === "ongoing");
                    } else if (kpiStatusFilter === "pending_fund") {
                        filtered = filtered.filter((p) => kpiGetStatus(p) === "pending_fund");
                    } else if (kpiStatusFilter === "approved_sanction") {
                        filtered = filtered.filter((p) => kpiGetStatus(p) === "approved_sanction");
                    } else if (kpiStatusFilter === "submitted") {
                        // Submitted = not yet sanction-approved.
                        filtered = filtered.filter((p) => kpiGetStatus(p) === "pending_sanction");
                    } else if (kpiStatusFilter === "pending_sanction") {
                        filtered = filtered.filter((p) => kpiGetStatus(p) === "pending_sanction");
                    } else if (kpiModal.type === "ongoing" || kpiStatusFilter === "ongoing") {
                        // Ongoing = sanction approved, regardless of fund-received status:
                        // covers Approved Sanction, Fund Received Pending, and Active alike.
                        filtered = filtered.filter((p) => {
                            const s = kpiGetStatus(p);
                            return s === "ongoing" || s === "pending_fund" || s === "approved_sanction";
                        });
                    } else {
                        filtered = filtered.filter((p) => ongoingIds.has(p.name) || submittedIds.has(p.name));
                    }
                } else {
                    // For draft/pending tabs, we explicitly want projects NOT in ongoing or submitted
                    filtered = filtered.filter((p) => !ongoingIds.has(p.name) && !submittedIds.has(p.name));
                }

                // Tab filtering
                if (kpiTab === "all") {
                    // No additional filter for 'All Projects'
                } else if (kpiTab === "valid") {
                    filtered = filtered.filter(isProjectComplete);
                } else if (kpiTab === "research") {
                    // No isProjectComplete gate here — Research/Consultancy/Others must add up to
                    // the full status-filtered total (e.g. all of Ongoing), not just the "Valid
                    // Projects" subset. That completeness check is what the "Valid Projects" tab is for.
                    filtered = filtered.filter(p => (p.project_type || "").toLowerCase().includes("research"));
                } else if (kpiTab === "consultancy") {
                    filtered = filtered.filter(p => (p.project_type || "").toLowerCase().includes("consult"));
                } else if (kpiTab === "others") {
                    filtered = filtered.filter(p => {
                        const t = (p.project_type || "").toLowerCase();
                        return !t.includes("research") && !t.includes("consult");
                    });
                } else if (kpiTab === "missing_budget") {
                    filtered = filtered.filter(p => Number(p.total_budget_amount || p.grand_total_proposal || 0) <= 0);
                } else if (kpiTab === "missing_no") {
                    filtered = filtered.filter(p => !(p.project_no?.trim()));
                } else if (kpiTab === "missing_agency") {
                    filtered = filtered.filter(p => {
                        const agencyRaw = p.funding_agency_name || p.funding_agency || p.funding_agency_other || p.origin_of_funding_agency || p.funding_agency_schemes || p.scheme_name || "";
                        return !agencyRaw.trim();
                    });
                } else if (kpiTab === "draft") {
                    filtered = filtered.filter(p => (p.workflow_state || "").toLowerCase().includes("draft") || p.docstatus === 0);
                } else if (kpiTab === "pending") {
                    filtered = filtered.filter(p => !((p.workflow_state || "").toLowerCase().includes("draft") || p.docstatus === 0));
                }


                if (kpiAgeFilter === "old") {
                    filtered = filtered.filter(p => {
                        if (p.is_old_project === 1 || p.is_old_project === true) return true;
                        if (p.prj_start_date) return new Date(p.prj_start_date).getFullYear() < 2026;
                        return false;
                    });
                } else if (kpiAgeFilter === "new") {
                    filtered = filtered.filter(p => {
                        if (p.is_old_project === 1 || p.is_old_project === true) return false;
                        if (p.prj_start_date) return new Date(p.prj_start_date).getFullYear() >= 2026;
                        return true;
                    });
                }

                if (kpiSchemeFilter.length > 0) {
                    filtered = filtered.filter(p => kpiSchemeFilter.includes(normalizeSchemeName(p.funding_agency_schemes || p.scheme_name || "")));
                }

                if (kpiModal.title === "Projects: Utilized") {
                    filtered = filtered.filter(p => (fundReceivedValueCache[p.name] || 0) > 0);
                } else if (kpiModal.title === "Projects: Remaining Balance") {
                    filtered = filtered.filter(p => {
                        const utilized = fundReceivedValueCache[p.name] || 0;
                        const sanctioned = Number(p.total_budget_amount || p.grand_total_proposal || 0);
                        return Math.max(0, sanctioned - utilized) > 0;
                    });
                } else if (kpiModal.title === "Projects: Total Sanctioned") {
                    filtered = filtered.filter(p => Number(p.total_budget_amount || p.grand_total_proposal || 0) > 0);
                } else if (kpiModal.title === "Projects: Proposed Budget") {
                    filtered = filtered.filter(p => Number(p.grand_total_proposal || p.total_budget_amount || 0) > 0);
                } else if (kpiModal.title === "Projects: Research Projects") {
                    filtered = filtered.filter(p => (p.project_type || "").toLowerCase().includes("research"));
                } else if (kpiModal.title === "Projects: Consultancy Projects") {
                    filtered = filtered.filter(p => (p.project_type || "").toLowerCase().includes("consult"));
                } else if (kpiModal.title === "Projects: Others Projects") {
                    filtered = filtered.filter(p => {
                        const pt = (p.project_type || "").toLowerCase();
                        return !pt.includes("research") && !pt.includes("consult");
                    });
                }

                if (kpiModal.type === "allocation") {
                    filtered = [...filtered].sort(
                        (a, b) =>
                            (b.total_budget_amount || b.grand_total_proposal || 0) -
                            (a.total_budget_amount || a.grand_total_proposal || 0)
                    );
                }

                return filtered;
            }
            if (kpiModal.type === "intl") {
                let filtered = projects.filter(
                    (p) => (p.origin_of_funding_agency || "").toLowerCase() === "international"
                );
                if (kpiTab === "research") {
                    filtered = filtered.filter(p => (p.project_type || "").toLowerCase().includes("research"));
                } else if (kpiTab === "consultancy") {
                    filtered = filtered.filter(p => (p.project_type || "").toLowerCase().includes("consult"));
                } else if (kpiTab === "others") {
                    filtered = filtered.filter(p => {
                        const t = (p.project_type || "").toLowerCase();
                        return !t.includes("research") && !t.includes("consult");
                    });
                }
                return filtered;
            }
            return projects;
        };

        let result = getBaseRows();

        if (kpiSearchText.trim()) {
            const query = kpiSearchText.toLowerCase().trim();
            result = result.filter(p => {
                const title = (p.project_title || p.name || "").toLowerCase();
                const projNo = (p.project_no || p.name || "").toLowerCase();
                const piEmail = (p.pi_webmail || "").toLowerCase();
                const piName = (p.pi_webmail ? (emailToNameMap[p.pi_webmail.toLowerCase().trim()] || p.pi_webmail.split("@")[0]) : "").toLowerCase();
                const deptName = (p.implementation_department || p.user_department || p.dept_name || "").toLowerCase();
                return (
                    title.includes(query) ||
                    projNo.includes(query) ||
                    piEmail.includes(query) ||
                    piName.includes(query) ||
                    deptName.includes(query)
                );
            });
        }

        // Attach _status to every row so badges render correctly in the modal table
        return result.map(p => ({ ...p, _status: kpiGetStatus(p) }));
    }, [allProjectsList, ongoingIds, submittedIds, fundStatusMap, sanctionDateMap, getEffectiveStartDate, kpiModal, kpiTab, kpiAllocTab, kpiStatusFilter, kpiAgeFilter, kpiSchemeFilter, kpiSearchText]);

    const kpiTotalPages = Math.max(
        1,
        Math.ceil(kpiModalRows.length / KPI_PAGE_SIZE)
    );
    const kpiPagedRows = kpiModalRows.slice(
        (kpiPage - 1) * KPI_PAGE_SIZE,
        kpiPage * KPI_PAGE_SIZE
    );

    // Keep the fund-sync priority ref pointed at whatever's on screen — current page plus
    // the next one, so paging forward already has a head start. When the KPI modal is open
    // it's what the user is actually looking at, so it takes priority over the (hidden
    // behind it) main dashboard table below.
    React.useEffect(() => {
        if (!kpiModal) return;
        const start = (kpiPage - 1) * KPI_PAGE_SIZE;
        const end = start + KPI_PAGE_SIZE * 2;
        visibleProjectNamesRef.current = new Set(kpiModalRows.slice(start, end).map((p: any) => p.name));
    }, [kpiModal, kpiModalRows, kpiPage]);

    // ── FIX: openKpiModal now initialises kpiAllocTab to "ongoing" (not raw workflow state) ──
    const openKpiModal = (type: string, title: string) => {
        setKpiModal({ type, title });
        setKpiPage(1);
        setKpiTab("all");
        if (type === "ongoing" || type === "allocation") setKpiStatusFilter("ongoing");
        else setKpiStatusFilter("all");
        setKpiSchemeFilter([]);
        setKpiAgeFilter("all");
        setKpiAllocTab("ongoing");
    };

    const openKpiModalWithTab = (type: string, title: string, tab: string) => {
        setKpiModal({ type, title });
        setKpiPage(1);
        const t = tab.toLowerCase();

        let normalizedTab = "all";
        let statusFilter = "all";

        if (t.includes("submit") || t.includes("pending")) statusFilter = "submitted";
        else if (t.includes("ongoing")) statusFilter = "ongoing";
        else if (t.includes("research")) normalizedTab = "research";
        else if (t.includes("consult")) normalizedTab = "consultancy";
        else if (t.includes("other")) normalizedTab = "others";

        setKpiTab(normalizedTab);
        setKpiStatusFilter(type === "ongoing" ? "ongoing" : statusFilter);
        setKpiSchemeFilter([]);
        setKpiAgeFilter("all");
    };

    // Ongoing Projects card's Active/Pending Fund badges — openKpiModalWithTab can't
    // express this distinction (it hardcodes kpiStatusFilter to "ongoing" whenever
    // type === "ongoing"), so this calls openKpiModal's baseline setup and then
    // overrides the status filter directly to the finer-grained value.
    const openOngoingFundStatusModal = (status: "active" | "pending_fund", title: string) => {
        openKpiModal("ongoing", title);
        setKpiStatusFilter(status);
    };

    // For clicking a Research/Consultancy/Others column inside a compact breakdown
    // grid — narrows the modal to that one project type instead of showing every
    // project the whole card's own onClick would (so clicking "Research" actually
    // shows Research, not the same unfiltered list as clicking anywhere else).
    const openKpiModalForType = (type: string, title: string, projectTypeTab: "research" | "consultancy" | "others") => {
        openKpiModal(type, title);
        setKpiTab(projectTypeTab);
    };

    const openKpiModalWithYear = (year: string, status: string) => {
        setKpiModal({ type: "total", title: `Projects in ${year}`, year });
        setKpiPage(1);
        setKpiTab("all");
        setKpiStatusFilter(status);
        setKpiSchemeFilter([]);
        setKpiAgeFilter("all");
        setKpiAllocTab("ongoing");
    };

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (kpiSchemeDropdownRef.current && !kpiSchemeDropdownRef.current.contains(event.target as Node)) {
                setIsKpiSchemeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const closeKpiModal = () => {
        setKpiModal(null);
        setKpiSearchText("");
    };

    // ── Start vs End Sanction data ────────────────────────────────────────────
    const startEndSanctionData = React.useMemo(() => {
        const yearMap: Record<
            string,
            { year: string; startAmount: number; endAmount: number; startCount: number; endCount: number }
        > = {};

        (allProjectsList ?? []).forEach((proj: any) => {
            const startYear = proj.prj_start_date
                ? new Date(proj.prj_start_date).getFullYear().toString()
                : null;
            const endYear = proj.prj_end_date
                ? new Date(proj.prj_end_date).getFullYear().toString()
                : null;
            const amount =
                proj.total_budget_amount || proj.grand_total_proposal || 0;

            if (startYear) {
                if (!yearMap[startYear])
                    yearMap[startYear] = {
                        year: startYear,
                        startAmount: 0,
                        endAmount: 0,
                        startCount: 0,
                        endCount: 0
                    };
                yearMap[startYear].startAmount += amount;
                yearMap[startYear].startCount += 1;
            }
            if (endYear) {
                if (!yearMap[endYear])
                    yearMap[endYear] = { year: endYear, startAmount: 0, endAmount: 0, startCount: 0, endCount: 0 };
                yearMap[endYear].endAmount += amount;
                yearMap[endYear].endCount += 1;
            }
        });

        return Object.values(yearMap).map(d => ({
            year: d.year,
            startAmount: d.startAmount === 0 ? null : d.startAmount,
            endAmount: d.endAmount === 0 ? null : d.endAmount,
            startCount: d.startCount === 0 ? null : d.startCount,
            endCount: d.endCount === 0 ? null : d.endCount
        })).sort((a, b) => a.year.localeCompare(b.year));
    }, [allProjectsList]);

    // ── Derived display values — use backend ID sets (not async getProjectStatusLabel) ─
    const totalProjects = React.useMemo(() =>
        (allProjectsList ?? []).filter((p: any) => ongoingIds.has(p.name) || submittedIds.has(p.name)).length,
        [allProjectsList, ongoingIds, submittedIds]
    );
    const ongoingProjects = React.useMemo(() =>
        (allProjectsList ?? []).filter((p: any) => ongoingIds.has(p.name)).length,
        [allProjectsList, ongoingIds]
    );
    const submittedProjectsCount = React.useMemo(() =>
        (allProjectsList ?? []).filter((p: any) => submittedIds.has(p.name)).length,
        [allProjectsList, submittedIds]
    );
    const totalStaffCount = overview.total_staff_count || 0;
    // ── Pre-process PI and User Names ──

    const availableYears = React.useMemo(() => {
        const years = new Set<string>();
        (allProjectsList ?? []).forEach((p: any) => {
            const dateStr = getEffectiveStartDate(p);
            if (dateStr) {
                const yr = new Date(dateStr).getFullYear();
                if (yr >= 2000 && yr <= 2100) years.add(yr.toString());
            }
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [allProjectsList, getEffectiveStartDate]);

    // "Total Sanctioned" must be scoped to ongoing (actually-sanctioned) projects only —
    // it used to also include submittedIds (proposed-but-not-yet-sanctioned) projects,
    // which inflated this number relative to fundUtilized/fundRemaining below (those are
    // computed over ongoingProjectsListForFunds, ongoing-only), producing a mismatched
    // Sanctioned-minus-Utilized subtraction. Proposed-but-unsanctioned budget already has
    // its own separate metric: computedProposedBudget.
    const fundAlloc = React.useMemo(() => {
        let sum = 0;
        (allProjectsList ?? []).forEach((p: any) => {
            if (!ongoingIds.has(p.name)) return;
            if (financialYearFilter !== "all") {
                const d = getEffectiveStartDate(p);
                const year = d ? new Date(d).getFullYear().toString() : null;
                if (year !== financialYearFilter) return;
            }
            if (financialProjectTypeFilter !== "all") {
                const type = (p.project_type || "").toLowerCase();
                if (financialProjectTypeFilter === "research" && !(type.includes("research") || type === "r&d project")) return;
                if (financialProjectTypeFilter === "consultancy" && !(type.includes("consult") || type === "testing")) return;
                if (financialProjectTypeFilter === "others" && (type.includes("research") || type === "r&d project" || type.includes("consult") || type === "testing")) return;
            }
            sum += (p.total_budget_amount || p.grand_total_proposal || 0);
        });
        return sum;
    }, [allProjectsList, ongoingIds, financialYearFilter, financialProjectTypeFilter, getEffectiveStartDate]);

    const computedProposedBudget = React.useMemo(() => {
        let sum = 0;
        (allProjectsList ?? []).forEach((p: any) => {
            if (submittedIds.has(p.name)) {
                if (financialYearFilter !== "all") {
                    const d = getEffectiveStartDate(p);
                    const year = d ? new Date(d).getFullYear().toString() : null;
                    if (year !== financialYearFilter) return;
                }
                if (financialProjectTypeFilter !== "all") {
                    const type = (p.project_type || "").toLowerCase();
                    if (financialProjectTypeFilter === "research" && !(type.includes("research") || type === "r&d project")) return;
                    if (financialProjectTypeFilter === "consultancy" && !(type.includes("consult") || type === "testing")) return;
                    if (financialProjectTypeFilter === "others" && (type.includes("research") || type === "r&d project" || type.includes("consult") || type === "testing")) return;
                }
                sum += (p.total_budget_amount || p.grand_total_proposal || 0);
            }
        });
        return sum;
    }, [allProjectsList, submittedIds, financialYearFilter, financialProjectTypeFilter, getEffectiveStartDate]);

    const ongoingProjectsListForFunds = React.useMemo(() => {
        return (allProjectsList ?? []).filter((p: any) => {
            if (!ongoingIds.has(p.name)) return false;
            if (financialYearFilter !== "all") {
                const d = getEffectiveStartDate(p);
                const year = d ? new Date(d).getFullYear().toString() : null;
                if (year !== financialYearFilter) return false;
            }
            if (financialProjectTypeFilter !== "all") {
                const type = (p.project_type || "").toLowerCase();
                if (financialProjectTypeFilter === "research" && !(type.includes("research") || type === "r&d project")) return false;
                if (financialProjectTypeFilter === "consultancy" && !(type.includes("consult") || type === "testing")) return false;
                if (financialProjectTypeFilter === "others" && (type.includes("research") || type === "r&d project" || type.includes("consult") || type === "testing")) return false;
            }
            return true;
        });
    }, [allProjectsList, ongoingIds, financialYearFilter, financialProjectTypeFilter, getEffectiveStartDate]);

    const { total: liveGlobalUtilized, loading: globalUtilizedLoading, progress: globalUtilizedProgress } = usePIFundReceivedTotal(ongoingProjectsListForFunds);

    const fundUtilized = liveGlobalUtilized || 0;
    const fundRemaining = Math.max(0, fundAlloc - fundUtilized);
    const fundUtilPercent = fundAlloc > 0 ? ((fundUtilized / fundAlloc) * 100).toFixed(1) : "0";

    const totalFundingSources = fundingTypeData.reduce(
        (sum: number, item: any) => sum + (item.value || 0),
        0
    );

    // ── FIX: Derive researchProjects & consultancyProjects from allProjectsList
    //    filtered to the same submitted+ongoing set used by totalProjects,
    //    so Research + Consultancy always equals totalProjects. ─────────────────
    const {
        researchProjects,
        consultancyProjects,
        othersProjects,
        researchOngoing,
        researchSubmitted,
        consultancyOngoing,
        consultancySubmitted,
        othersOngoing,
        othersSubmitted
    } = React.useMemo(() => {
        let ro = 0, rs = 0, co = 0, cs = 0, oo = 0, os = 0;
        (allProjectsList ?? []).forEach((p: any) => {
            const isOngoing = ongoingIds.has(p.name);
            const isSubmitted = submittedIds.has(p.name);
            if (!isOngoing && !isSubmitted) return;

            const type = (p.project_type || "").toLowerCase();
            if (type.includes("research")) {
                if (isOngoing) ro++;
                if (isSubmitted) rs++;
            } else if (type.includes("consult")) {
                if (isOngoing) co++;
                if (isSubmitted) cs++;
            } else {
                if (isOngoing) oo++;
                if (isSubmitted) os++;
            }
        });
        return {
            researchOngoing: ro,
            researchSubmitted: rs,
            consultancyOngoing: co,
            consultancySubmitted: cs,
            othersOngoing: oo,
            othersSubmitted: os,
            researchProjects: ro + rs,
            consultancyProjects: co + cs,
            othersProjects: oo + os
        };
    }, [allProjectsList, ongoingIds, submittedIds]);

    const totalProjectBadges = React.useMemo(() => {
        const badges = [
            {
                label: "Research",
                count: researchProjects,
                dotColor: "bg-blue-500",
                bgClass: "bg-blue-50 dark:bg-blue-950/30",
                textClass: "text-blue-700 dark:text-blue-400",
            },
            {
                label: "Consultancy",
                count: consultancyProjects,
                dotColor: "bg-purple-500",
                bgClass: "bg-purple-50 dark:bg-purple-950/30",
                textClass: "text-purple-700 dark:text-purple-400",
            },
        ];
        if (othersProjects > 0) {
            badges.push({
                label: "Others",
                count: othersProjects,
                dotColor: "bg-emerald-500",
                bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
                textClass: "text-emerald-700 dark:text-emerald-400",
            });
        }
        return badges;
    }, [researchProjects, consultancyProjects, othersProjects]);


    // Process Research vs Consultancy data
    const projectTypeData = React.useMemo(() => {
        const data = [
            { name: "Research", value: researchProjects, color: "#2563eb" },
            { name: "Consultancy", value: consultancyProjects, color: "#7c3aed" },
        ];
        if (othersProjects > 0) {
            data.push({ name: "Others", value: othersProjects, color: "#059669" });
        }
        return data;
    }, [researchProjects, consultancyProjects, othersProjects]);

    // Process strict department-wise data for Pie Chart (only unique approved/submitted projects)
    const pieChartDeptData = React.useMemo(() => {
        const deptMap: Record<string, { dept_name: string; project_count: number }> = {};

        (allProjectsList || []).forEach((proj: any) => {
            const isOngoing = ongoingIds.has(proj.name);
            const isSubmitted = submittedIds.has(proj.name);
            if (!isOngoing && !isSubmitted) return;

            const deptKey = proj.implementation_department;
            if (deptKey) {
                if (!deptMap[deptKey]) {
                    deptMap[deptKey] = { dept_name: deptKey, project_count: 0 };
                }
                deptMap[deptKey].project_count += 1;
            }
        });

        return Object.values(deptMap).sort((a, b) => b.project_count - a.project_count);
    }, [allProjectsList, ongoingIds, submittedIds]);

    // Process strict funding data for Pie Chart from allProjectsList to guarantee modal sync
    const pieChartFundingData = React.useMemo(() => {
        if (!allProjectsList || !overview) return [];

        const agencyCounts: Record<string, number> = {};

        (allProjectsList as any[]).forEach((proj) => {
            if (ongoingIds.has(proj.name) || submittedIds.has(proj.name)) {
                // Same logic as kpiModalRows to ensure 1:1 match
                const agency = proj.funding_agency || proj.funding_agency_name || proj.funding_agency_schemes || proj.scheme_name;
                const key = agency ? agency.trim() : "Missing Funding Agency Name";
                agencyCounts[key] = (agencyCounts[key] || 0) + 1;
            }
        });

        let chartData = Object.entries(agencyCounts).map(([agency, count]) => ({
            funding_agency: agency,
            value: count
        })).sort((a, b) => {
            const aIsOther = a.funding_agency === "Others" || a.funding_agency === "Other Agencies";
            const bIsOther = b.funding_agency === "Others" || b.funding_agency === "Other Agencies";
            if (aIsOther && !bIsOther) return 1;
            if (!aIsOther && bIsOther) return -1;
            return b.value - a.value;
        });

        if (!showAllFunding && chartData.length > 8) {
            const topAgencies = chartData.slice(0, 7);
            const others = chartData.slice(7);
            const othersCount = others.reduce((sum: number, d: any) => sum + d.value, 0);
            return [...topAgencies, { funding_agency: "Others", value: othersCount }];
        }

        return chartData;
    }, [allProjectsList, ongoingIds, submittedIds, overview, showAllFunding]);

    // Process department-wise data
    const departmentData = React.useMemo(() => {
        const deptMap: Record<
            string,
            { dept_name: string; project_count: number; investigators: any[] }
        > = {};

        roleBasedProjects.forEach((item: any) => {
            const deptKey = item.implementation_department || item.user_department;
            if (deptKey) {
                if (!deptMap[deptKey]) {
                    deptMap[deptKey] = {
                        dept_name: deptKey,
                        project_count: 0,
                        investigators: [],
                    };
                }
                deptMap[deptKey].project_count += item.project_count || 0;

                if (
                    item.user_name &&
                    item.project_count > 0 &&
                    (item.role?.includes("PI") ||
                        item.role?.includes("Principal Investigator") ||
                        item.role?.includes("Permanent Employee"))
                ) {
                    const existing = deptMap[deptKey].investigators.find(
                        (i) => i.user_email === item.user_email
                    );
                    if (existing) {
                        existing.project_count += item.project_count;
                    } else {
                        deptMap[deptKey].investigators.push({
                            user_name: item.user_name,
                            user_email: item.user_email,
                            project_count: item.project_count,
                        });
                    }
                }
            }
        });

        const result = Object.values(deptMap).sort(
            (a, b) => b.project_count - a.project_count
        );
        result.forEach((d) =>
            d.investigators.sort((a, b) => b.project_count - a.project_count)
        );
        return result;
    }, [roleBasedProjects]);

    // Process PI-wise data
    const piData = React.useMemo(() => {
        const piMap: Record<
            string,
            {
                user_name: string;
                user_email: string;
                project_count: number;
                departments: string[];
            }
        > = {};

        roleBasedProjects.forEach((item: any) => {
            if (
                item.role?.includes("PI") ||
                item.role?.includes("Principal Investigator") ||
                item.role?.includes("Permanent Employee")
            ) {
                const key = item.user_email;
                if (!piMap[key]) {
                    piMap[key] = {
                        user_name: item.user_name,
                        user_email: item.user_email,
                        project_count: 0,
                        departments: [],
                    };
                }
                piMap[key].project_count += item.project_count || 0;

                const dept = item.implementation_department || item.user_department;
                if (dept && !piMap[key].departments.includes(dept)) {
                    piMap[key].departments.push(dept);
                }
            }
        });

        return Object.values(piMap).sort(
            (a, b) => b.project_count - a.project_count
        );
    }, [roleBasedProjects]);

    // State for search/filter/expansion
    const [deptSearch, setDeptSearch] = React.useState("");
    const [piSearch, setPiSearch] = React.useState("");
    const [piFundingFilter, setPiFundingFilter] = React.useState<string>("all");
    const [showFundingFilterDropdown, setShowFundingFilterDropdown] = React.useState(false);
    const [expandedDept, setExpandedDept] = React.useState<string | null>(null);
    const [expandedPI, setExpandedPI] = React.useState<string | null>(location.state?.expandedPI || null);

    // Pagination states
    const [deptPage, setDeptPage] = React.useState(1);
    const [piPage, setPiPage] = React.useState(1);
    const [showAllDepts, setShowAllDepts] = React.useState(false);

    React.useEffect(() => {
        setDeptPage(1);
    }, [deptSearch]);
    React.useEffect(() => {
        setPiPage(1);
    }, [piSearch, piFundingFilter]);

    // ── PI Funding Filter ────────────────────────────────────────────────────
    //
    // SELF-CONSISTENT APPROACH: extract a single agency label from each project
    // using ONE function, then use that same label for BOTH the dropdown and the
    // filter — zero mismatch possible.

    // Extract a consistent agency label from a project record.
    // Priority: select_funding_agency → origin_of_funding_agency → funding_agency_other → schemes → "Missing Funding Agency Name"
    const getProjectAgency = React.useCallback((proj: any): string => {
        return (
            (proj.select_funding_agency || "").trim() ||
            (proj.origin_of_funding_agency || "").trim() ||
            (proj.funding_agency_other || "").trim() ||
            (proj.funding_agency_schemes || "").trim() ||
            (proj.scheme_name || "").trim() ||
            "Missing Funding Agency Name"
        );
    }, []);

    // Build agency list for the PI workload filter dropdown, derived directly
    // from allProjectsList (same source used for filtering).
    const piWorkloadAgencies = React.useMemo(() => {
        const agencyMap: Record<string, { agency_name: string; piEmails: Set<string>; project_count: number }> = {};
        (allProjectsList || []).forEach((proj: any) => {
            const agency = getProjectAgency(proj);
            const email = (proj.pi_webmail || "").toLowerCase().trim();
            if (!agencyMap[agency]) {
                agencyMap[agency] = { agency_name: agency, piEmails: new Set(), project_count: 0 };
            }
            agencyMap[agency].project_count += 1;
            if (email) agencyMap[agency].piEmails.add(email);
        });
        return Object.values(agencyMap)
            .sort((a, b) => b.project_count - a.project_count)
            .map(({ agency_name, piEmails, project_count }) => ({
                agency_name,
                pi_count: piEmails.size,
                project_count,
            }));
    }, [allProjectsList, getProjectAgency]);



    const getPiName = React.useCallback(
        (email: string) => {
            if (!email) return "—";
            const lcEmail = email.toLowerCase().trim();

            let rawName = emailToNameMap[lcEmail];
            if (!rawName) {
                // Fallback: capitalize the part before @
                const username = lcEmail.split("@")[0];
                rawName = username.charAt(0).toUpperCase() + username.slice(1);
            }

            // Deduplicate consecutive identical words (e.g., "Laishram Laishram Boeing" -> "Laishram Boeing")
            return rawName.split(/\s+/).filter((word, pos, arr) =>
                pos === 0 || word.toLowerCase() !== arr[pos - 1].toLowerCase()
            ).join(" ");
        },
        [emailToNameMap]
    );

    // When a fund filter is active, build PI rows directly from allProjectsList
    // grouped by pi_webmail using EXACT match on getProjectAgency().
    const filteredPIsFromProjects = React.useMemo(() => {
        if (piFundingFilter === "all") return null;
        const piMap: Record<string, {
            user_email: string;
            user_name: string;
            project_count: number;
            departments: string[];
        }> = {};

        (allProjectsList || []).forEach((proj: any) => {
            // Exact match against the same extracted label
            if (getProjectAgency(proj) !== piFundingFilter) return;
            const email = (proj.pi_webmail || "").toLowerCase().trim();
            if (!email) return;
            if (!piMap[email]) {
                const name =
                    emailToNameMap[email] ||
                    emailToNameMap[email.split("@")[0]] ||
                    email.split("@")[0];
                piMap[email] = { user_email: email, user_name: name, project_count: 0, departments: [] };
            }
            piMap[email].project_count += 1;
            const dept = proj.implementation_department;
            if (dept && !piMap[email].departments.includes(dept)) {
                piMap[email].departments.push(dept);
            }
        });

        const result = Object.values(piMap).sort((a, b) => b.project_count - a.project_count);

        return result;
    }, [allProjectsList, piFundingFilter, getProjectAgency, emailToNameMap]);

    // Filtered data
    const filteredDepartments = React.useMemo(() => {
        return departmentData.filter((dept) =>
            dept.dept_name.toLowerCase().includes(deptSearch.toLowerCase())
        );
    }, [departmentData, deptSearch]);

    const filteredPIs = React.useMemo(() => {
        const source = filteredPIsFromProjects !== null ? filteredPIsFromProjects : piData;
        return source.filter((pi) =>
            pi.user_name.toLowerCase().includes(piSearch.toLowerCase())
        );
    }, [piData, filteredPIsFromProjects, piSearch]);

    const PAGE_SIZE = 10;

    const paginatedDepartments = React.useMemo(() => {
        const start = (deptPage - 1) * PAGE_SIZE;
        return filteredDepartments.slice(start, start + PAGE_SIZE);
    }, [filteredDepartments, deptPage]);

    const deptTotalPages = Math.max(
        1,
        Math.ceil(filteredDepartments.length / PAGE_SIZE)
    );

    const paginatedPIs = React.useMemo(() => {
        const start = (piPage - 1) * PAGE_SIZE;
        return filteredPIs.slice(start, start + PAGE_SIZE);
    }, [filteredPIs, piPage]);

    const piTotalPages = Math.max(1, Math.ceil(filteredPIs.length / PAGE_SIZE));

    const generateReportHTMLString = () => {
        try {
            const deptNameMap: Record<string, string> = {};
            (deptList ?? []).forEach((d: any) => {
                if (d.name && d.dept_name) deptNameMap[d.name] = d.dept_name;
            });
            const researchStats = {
                ongoing: researchOngoing,
                submitted: researchSubmitted,
                total: researchProjects,
            };
            const consultancyStats = {
                ongoing: consultancyOngoing,
                submitted: consultancySubmitted,
                total: consultancyProjects,
            };

            const totalStaffCount = overview?.total_staff_count || 1651;

            const filteredOverview = {
                ...overview,
                total_projects: totalProjects,
                ongoing_projects: ongoingProjects,
                submitted_projects: projectStatusCounts.submitted,
                total_staff_count: totalStaffCount,
            };

            const computedUtilized = liveGlobalUtilized && liveGlobalUtilized > 0
                ? liveGlobalUtilized
                : fundUtilized;
            const computedRemaining = Math.max(0, fundAlloc - computedUtilized);

            const filteredFunds = {
                ...funds,
                total_allocation: fundAlloc,
                utilized: computedUtilized,
                remaining: computedRemaining,
                proposed: computedProposedBudget,
            };

            const filteredTopProjects = dashboardProjectTypeFilter === "all" ? topProjects : topProjects.filter((p: any) => ongoingIds.has(p.project_id) || submittedIds.has(p.project_id));
            const filteredRecentProjects = dashboardProjectTypeFilter === "all" ? recentProjects : recentProjects.filter((p: any) => ongoingIds.has(p.project_id) || submittedIds.has(p.project_id));

            const filteredFundingTypeData = dashboardProjectTypeFilter === "all" ? fundingTypeData : pieChartFundingData.map((d: any) => ({ name: d.name, value: d.value, funding_agency: d.name }));

            const filteredStartEndSanctionData = dashboardProjectTypeFilter === "all" ? startEndSanctionData : (() => {
                const yearMap: Record<string, { year: string; startAmount: number; endAmount: number }> = {};
                (allProjectsList ?? []).forEach((proj: any) => {
                    if (!ongoingIds.has(proj.name) && !submittedIds.has(proj.name)) return;
                    const startYear = proj.prj_start_date ? new Date(proj.prj_start_date).getFullYear().toString() : null;
                    const endYear = proj.prj_end_date ? new Date(proj.prj_end_date).getFullYear().toString() : null;
                    const amount = proj.total_budget_amount || proj.grand_total_proposal || 0;

                    if (startYear) {
                        if (!yearMap[startYear]) yearMap[startYear] = { year: startYear, startAmount: 0, endAmount: 0 };
                        yearMap[startYear].startAmount += amount;
                    }
                    if (endYear) {
                        if (!yearMap[endYear]) yearMap[endYear] = { year: endYear, startAmount: 0, endAmount: 0 };
                        yearMap[endYear].endAmount += amount;
                    }
                });
                return Object.values(yearMap).map(d => ({
                    year: d.year,
                    startAmount: d.startAmount,
                    endAmount: d.endAmount
                })).sort((a, b) => a.year.localeCompare(b.year));
            })();

            const sanitizedProjectStatusByYearData = projectStatusByYearData.map((d: any) => ({
                year: d.year,
                submitted: d.submitted === null ? 0 : d.submitted,
                ongoing: d.ongoing === null ? 0 : d.ongoing
            }));

            const piBudgetMap: Record<string, number> = {};
            (allProjectsList ?? []).forEach((proj: any) => {
                const email = (proj.pi_webmail || "").toLowerCase().trim();
                if (email) {
                    piBudgetMap[email] = (piBudgetMap[email] || 0) + (proj.total_budget_amount || proj.grand_total_proposal || 0);
                }
            });
            const enrichedPIs = filteredPIs.slice(0, 8).map((pi: any) => ({
                ...pi,
                total_budget: piBudgetMap[(pi.user_email || "").toLowerCase().trim()] || 0,
            }));

            const resolvedPieChartDeptData = pieChartDeptData.map((d: any) => ({
                ...d,
                dept_name: getDeptName(d.dept_name),
            }));

            const resolvedFundingTypeData = pieChartFundingData.map((f: any) => ({
                name: f.funding_agency || f.name,
                value: f.value,
            }));

            const html = generateDirectorReportHtml({
                overview: filteredOverview,
                funds: filteredFunds,
                intl,
                proposals,
                ipr,
                topProjects: filteredTopProjects,
                recentProjects: filteredRecentProjects,
                projectStatusByYearData: sanitizedProjectStatusByYearData,
                fundingTypeData: resolvedFundingTypeData,
                topInvestigators: enrichedPIs,
                pieChartDeptData: resolvedPieChartDeptData,
                fullName,
                deptNameMap,
                researchStats,
                consultancyStats,
                startEndSanctionData: filteredStartEndSanctionData.map((d: any) => ({
                    year: d.year,
                    startAmount: d.startAmount === null ? 0 : d.startAmount,
                    endAmount: d.endAmount === null ? 0 : d.endAmount
                })),
            });
            return html;
        } catch (err) {
            console.error("Failed to generate report:", err);
            return null;
        }
    };

    const executeReportGeneration = () => {
        // Use a tiny timeout to let the React loading modal render
        setTimeout(() => {
            let html = generateReportHTMLString();
            if (html) {
                // Intercept the back button to use postMessage instead of window.close

                html = html.replace('onclick="window.close()"', 'onclick="window.parent.postMessage(\'close-preview\', \'*\')"');
                setPreviewHtml(html);
            }
            setIsGeneratingReport(false);
        }, 300);
    };

    const handleDownloadClick = () => {
        if (isLoading) return;

        setIsGeneratingReport(true);

        if (globalUtilizedLoading) {
            setIsWaitingForFunds(true);
            return;
        }

        // If data is already loaded, generate instantly
        executeReportGeneration();
    };

    React.useEffect(() => {
        if (isWaitingForFunds && !globalUtilizedLoading) {
            setIsWaitingForFunds(false);
            executeReportGeneration();
        }
    }, [isWaitingForFunds, globalUtilizedLoading]);

    // Listen for the back button message from the iframe
    React.useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data === 'close-preview') {
                setPreviewHtml(null);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    const liveTime = time
        .toLocaleString("en-IN", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        })
        .replace(",", "");

    const selectedDeptDetails = React.useMemo(() => {
        return departmentData.find((d) => d.dept_name === expandedDept) || null;
    }, [departmentData, expandedDept]);

    const selectedPIDetails = React.useMemo(() => {
        return piData.find((p) => p.user_email === expandedPI) || null;
    }, [piData, expandedPI]);

    const selectedPIProjects = React.useMemo(() => {
        if (!expandedPI || !allProjectsList) return [];
        return (allProjectsList as any[])
            .filter((p) => p.pi_webmail === expandedPI)
            .sort((a, b) => {
                const aStart = a.prj_start_date
                    ? new Date(a.prj_start_date).getTime()
                    : 0;
                const bStart = b.prj_start_date
                    ? new Date(b.prj_start_date).getTime()
                    : 0;
                return bStart - aStart;
            });
    }, [expandedPI, allProjectsList]);

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
        <div className={`grid ${othersProjects > 0 ? "grid-cols-3" : "grid-cols-2"} gap-2 pt-2 border-t border-[#E4E4E7] dark:border-[#3F3F46]`}>
            <div
                className="flex flex-col items-center justify-start border-r border-[#E4E4E7] dark:border-[#3F3F46] cursor-pointer hover:opacity-75 transition-opacity"
                onClick={(e) => { e.stopPropagation(); openKpiModalForType("total", "Projects: Research", "research"); }}
            >
                <div className="text-[14px] font-extrabold text-[#2563eb] leading-tight">
                    {researchProjects}
                </div>
                <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">
                    Research
                </div>
                <div className="flex flex-col gap-1 w-full px-1">
                    {renderStatusBadge("ongoing", researchOngoing, researchProjects)}
                    {renderStatusBadge("submitted", researchSubmitted, researchProjects)}
                </div>
            </div>
            <div
                className={`flex flex-col items-center justify-start cursor-pointer hover:opacity-75 transition-opacity ${othersProjects > 0 ? "border-r border-[#E4E4E7] dark:border-[#3F3F46]" : ""}`}
                onClick={(e) => { e.stopPropagation(); openKpiModalForType("total", "Projects: Consultancy", "consultancy"); }}
            >
                <div className="text-[14px] font-extrabold text-[#7c3aed] leading-tight">
                    {consultancyProjects}
                </div>
                <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">
                    Consultancy
                </div>
                <div className="flex flex-col gap-1 w-full px-1">
                    {renderStatusBadge("ongoing", consultancyOngoing, consultancyProjects)}
                    {renderStatusBadge("submitted", consultancySubmitted, consultancyProjects)}
                </div>
            </div>
            {othersProjects > 0 && (
                <div
                    className="flex flex-col items-center justify-start cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); openKpiModalForType("total", "Projects: Others", "others"); }}
                >
                    <div className="text-[14px] font-extrabold text-[#059669] leading-tight">
                        {othersProjects}
                    </div>
                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">
                        Others
                    </div>
                    <div className="flex flex-col gap-1 w-full px-1">
                        {renderStatusBadge("ongoing", othersOngoing, othersProjects)}
                        {renderStatusBadge("submitted", othersSubmitted, othersProjects)}
                    </div>
                </div>
            )}
        </div>
    ), [
        researchProjects, researchOngoing, researchSubmitted,
        consultancyProjects, consultancyOngoing, consultancySubmitted,
        othersProjects, othersOngoing, othersSubmitted
    ]);

    // Same compact grid as projectBreakdownGrid, scoped to projects with an
    // international funding agency.
    const intlBreakdownGrid = React.useMemo(() => {
        let rP = 0, rO = 0, rS = 0;
        let cP = 0, cO = 0, cS = 0;
        let oP = 0, oO = 0, oS = 0;

        (allProjectsList ?? []).forEach((p: any) => {
            if ((p.origin_of_funding_agency || "").toLowerCase() !== "international") return;

            const type = (p.project_type || "").toLowerCase();
            const isOngoing = ongoingIds.has(p.name);
            const isSubmitted = submittedIds.has(p.name);

            if (type.includes("research") || type.includes("r&d project")) {
                rP++;
                if (isOngoing) rO++;
                if (isSubmitted) rS++;
            } else if (type.includes("consult") || type.includes("testing")) {
                cP++;
                if (isOngoing) cO++;
                if (isSubmitted) cS++;
            } else {
                oP++;
                if (isOngoing) oO++;
                if (isSubmitted) oS++;
            }
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
    }, [allProjectsList, ongoingIds, submittedIds]);

    // ₹ allocation AND ₹ utilization split by project type, among ongoing
    // (sanction-approved) projects only — allocation must match fundAlloc's scope
    // exactly so the three amounts sum to the Total Allocation headline figure above
    // them. Utilized reads fundReceivedValueCache (populated by the same
    // usePIFundReceivedTotal(ongoingProjectsListForFunds) call that computes the
    // headline's own fundUtilized), so it's recomputed once that background fetch
    // resolves via the fundUtilized/globalUtilizedLoading deps below.
    const allocationByType = React.useMemo(() => {
        let rAmt = 0, cAmt = 0, oAmt = 0;
        let rUtil = 0, cUtil = 0, oUtil = 0;
        // Don't trust globalUtilizedLoading alone to mean "cache is populated" — track
        // whether every ongoing project actually has an entry in fundReceivedValueCache.
        // usePIFundReceivedTotal's loading flag only toggles for the exact project set it
        // was called with; if that set doesn't (yet, or ever) cover every project counted
        // here, loading can read false while this cache is still incomplete, which
        // previously rendered as a false "₹0 utilized / 0.0%" instead of "still fetching."
        let pending = 0;
        (allProjectsList ?? []).forEach((p: any) => {
            if (!ongoingIds.has(p.name)) return;
            const type = (p.project_type || "").toLowerCase();
            const amt = p.total_budget_amount || p.grand_total_proposal || 0;
            if (!Object.prototype.hasOwnProperty.call(fundReceivedValueCache, p.name)) pending++;
            const util = fundReceivedValueCache[p.name] || 0;
            if (type.includes("research") || type === "r&d project") { rAmt += amt; rUtil += util; }
            else if (type.includes("consult") || type === "testing") { cAmt += amt; cUtil += util; }
            else { oAmt += amt; oUtil += util; }
        });
        return { rAmt, cAmt, oAmt, rUtil, cUtil, oUtil, pending };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allProjectsList, ongoingIds, fundUtilized, globalUtilizedLoading]);

    // Ongoing Projects card: split by fund-received status, not just project type —
    // "sanction approved" alone doesn't tell the Director whether a project is truly
    // active (fund in hand) or still waiting on disbursal. Mirrors kpiGetStatus's
    // ongoing/pending_fund classification so the card and the modal it opens agree.
    const ongoingFundStatusBreakdown = React.useMemo(() => {
        let active = 0, pendingFund = 0, checking = 0;
        (allProjectsList ?? []).forEach((p: any) => {
            if (!ongoingIds.has(p.name)) return;
            if (!fundStatusMap.has(p.name)) { checking++; return; }
            if (fundStatusMap.get(p.name) === true) active++;
            else pendingFund++;
        });
        return { active, pendingFund, checking };
    }, [allProjectsList, ongoingIds, fundStatusMap]);

    const isFundUtilDataReady = !globalUtilizedLoading && allocationByType.pending === 0;

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
        const showOthers = othersOngoing > 0;
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
    }, [allocationByType, othersOngoing, isFundUtilDataReady]);

    // Same Received Fund/Pending split as ongoingFundStatusBreakdown, broken out per
    // project type — so a Research-heavy pending-fund backlog isn't hidden inside an
    // aggregate that looks healthy overall.
    const ongoingByTypeFundStatus = React.useMemo(() => {
        const counts: Record<"Research" | "Consultancy" | "Others", { received: number; pending: number }> = {
            Research: { received: 0, pending: 0 },
            Consultancy: { received: 0, pending: 0 },
            Others: { received: 0, pending: 0 },
        };
        (allProjectsList ?? []).forEach((p: any) => {
            if (!ongoingIds.has(p.name)) return;
            if (!fundStatusMap.has(p.name)) return;
            const type = (p.project_type || "").toLowerCase();
            const bucket: "Research" | "Consultancy" | "Others" =
                type.includes("research") || type.includes("r&d project") ? "Research"
                    : type.includes("consult") || type.includes("testing") ? "Consultancy"
                        : "Others";
            if (fundStatusMap.get(p.name) === true) counts[bucket].received++;
            else counts[bucket].pending++;
        });
        return counts;
    }, [allProjectsList, ongoingIds, fundStatusMap]);

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
                        {isReceived ? "Received" : "Pending"}
                    </div>
                    <span>{ready ? count : "Loading…"}</span>
                </div>
                {ready && (
                    <div className="text-right text-[8px] font-semibold opacity-70">{pctOf(count, total)}%</div>
                )}
            </span>
        );
    };

    // Same compact grid as projectBreakdownGrid/allocationBreakdownGrid — headline
    // ongoing count per type, then Received/Pending fund badges instead of
    // Ongoing/Submitted, so this card matches the other three visually instead of
    // standing out as a row of horizontal pills.
    const ongoingBreakdownGrid = React.useMemo(() => {
        const showOthers = othersOngoing > 0;
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
                    <div className="text-[14px] font-extrabold text-[#2563eb] leading-tight">{researchOngoing}</div>
                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">Research</div>
                    <div className="flex flex-col gap-1 w-full px-1">
                        {renderFundBadge("received", ongoingByTypeFundStatus.Research.received, researchOngoing, ready)}
                        {renderFundBadge("pending", ongoingByTypeFundStatus.Research.pending, researchOngoing, ready)}
                    </div>
                </div>
                <div
                    className={`flex flex-col items-center justify-start cursor-pointer hover:opacity-75 transition-opacity ${showOthers ? "border-r border-[#E4E4E7] dark:border-[#3F3F46]" : ""}`}
                    onClick={(e) => { e.stopPropagation(); openKpiModalForType("ongoing", "Ongoing Projects: Consultancy", "consultancy"); }}
                >
                    <div className="text-[14px] font-extrabold text-[#7c3aed] leading-tight">{consultancyOngoing}</div>
                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">Consultancy</div>
                    <div className="flex flex-col gap-1 w-full px-1">
                        {renderFundBadge("received", ongoingByTypeFundStatus.Consultancy.received, consultancyOngoing, ready)}
                        {renderFundBadge("pending", ongoingByTypeFundStatus.Consultancy.pending, consultancyOngoing, ready)}
                    </div>
                </div>
                {showOthers && (
                    <div
                        className="flex flex-col items-center justify-start cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); openKpiModalForType("ongoing", "Ongoing Projects: Others", "others"); }}
                    >
                        <div className="text-[14px] font-extrabold text-[#059669] leading-tight">{othersOngoing}</div>
                        <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mb-1.5">Others</div>
                        <div className="flex flex-col gap-1 w-full px-1">
                            {renderFundBadge("received", ongoingByTypeFundStatus.Others.received, othersOngoing, ready)}
                            {renderFundBadge("pending", ongoingByTypeFundStatus.Others.pending, othersOngoing, ready)}
                        </div>
                    </div>
                )}
            </div>
        );
    }, [researchOngoing, consultancyOngoing, othersOngoing, ongoingByTypeFundStatus, ongoingFundStatusBreakdown]);

    // ── Dynamic Tab Counts for Modal ─────────────────────────────────────────
    const getDynamicTabCount = React.useCallback((tabKey: string) => {
        const isProjectComplete = (p: any) => {
            const hasBudget = Number(p.total_budget_amount || p.grand_total_proposal || 0) > 0;
            const hasProjectNo = !!(p.project_no && p.project_no.trim());
            const agencyRaw = p.funding_agency_name || p.funding_agency || p.funding_agency_other || p.origin_of_funding_agency || p.funding_agency_schemes || p.scheme_name || "";
            const hasAgency = !!agencyRaw.trim();
            return hasBudget && hasProjectNo && hasAgency;
        };

        const projectsList = allProjectsList ?? [];
        let base = projectsList;

        // "intl" modal is scoped to international-agency projects only, and — like
        // getBaseRows()'s matching branch above — doesn't apply the ongoing/submitted
        // status filter at all (an international collaboration count isn't split by
        // sanction status the way the other cards are), so it returns early here.
        if (kpiModal?.type === "intl") {
            base = base.filter(p => (p.origin_of_funding_agency || "").toLowerCase() === "international");
            return base.filter(p => {
                if (tabKey === "all") return true;
                const t = (p.project_type || "").toLowerCase();
                if (tabKey === "research") return t.includes("research");
                if (tabKey === "consultancy") return t.includes("consult");
                if (tabKey === "others") return !t.includes("research") && !t.includes("consult");
                return false;
            }).length;
        }

        if (kpiModal?.year) {
            base = base.filter(p => {
                const dateStr = getEffectiveStartDate(p);
                if (!dateStr) return false;
                const yr = new Date(dateStr).getFullYear();
                return !isNaN(yr) && String(yr) === kpiModal.year;
            });
        }
        if (kpiModal?.projectType) {
            if (kpiModal.projectType === "research") {
                base = base.filter(p => p.project_type?.toLowerCase() === "research" || p.project_type?.toLowerCase() === "r&d project");
            } else if (kpiModal.projectType === "consultancy") {
                base = base.filter(p => p.project_type?.toLowerCase() === "consultancy" || p.project_type?.toLowerCase() === "testing");
            } else if (kpiModal.projectType === "others") {
                base = base.filter(p => {
                    const pt = p.project_type?.toLowerCase() || "";
                    return pt !== "research" && pt !== "r&d project" && pt !== "consultancy" && pt !== "testing";
                });
            }
        }
        if (kpiModal?.fundingAgency) {
            if (kpiModal.fundingAgency === "Missing Funding Agency Name") {
                base = base.filter(p => !p.funding_agency && !p.funding_agency_name && !p.funding_agency_schemes && !p.scheme_name);
            } else if (kpiModal.fundingAgency === "Others" && kpiModal.excludedFundingAgencies) {
                base = base.filter(p => {
                    const agency = p.funding_agency || p.funding_agency_name || p.funding_agency_schemes || p.scheme_name;
                    return agency && !kpiModal.excludedFundingAgencies!.includes(agency);
                });
            } else {
                base = base.filter(p => (p.funding_agency || p.funding_agency_name || p.funding_agency_schemes || p.scheme_name) === kpiModal.fundingAgency);
            }
        }
        if (kpiModal?.allowedDepts) {
            base = base.filter(p => {
                const d = p.implementation_department || p.user_department || p.dept_name;
                return d && kpiModal.allowedDepts!.includes(d);
            });
        }

        const getStatusKey = (p: any): string => {
            if (!ongoingIds.has(p.name)) return submittedIds.has(p.name) ? "pending_sanction" : "other";
            const hasStartDate = !!(sanctionDateMap.get(p.name) || p.prj_start_date || p.sanctioned_letter_date);
            const hasFundReceived = fundStatusMap.get(p.name) === true;
            if (hasFundReceived) return "ongoing";
            if (hasStartDate) return "pending_fund";
            return "approved_sanction";
        };

        if (tabKey !== "draft" && tabKey !== "pending") {
            // Narrower statuses are checked before the broad "ongoing" fallback below —
            // see the matching comment in kpiModalRows's getBaseRows for why the order
            // matters here.
            if (kpiStatusFilter === "active") {
                base = base.filter(p => getStatusKey(p) === "ongoing");
            } else if (kpiStatusFilter === "pending_fund") {
                base = base.filter(p => getStatusKey(p) === "pending_fund");
            } else if (kpiStatusFilter === "approved_sanction") {
                base = base.filter(p => getStatusKey(p) === "approved_sanction");
            } else if (kpiStatusFilter === "submitted") {
                // Submitted = not yet sanction-approved.
                base = base.filter(p => getStatusKey(p) === "pending_sanction");
            } else if (kpiStatusFilter === "pending_sanction") {
                base = base.filter(p => getStatusKey(p) === "pending_sanction");
            } else if (kpiModal?.type === "ongoing" || kpiStatusFilter === "ongoing") {
                // Ongoing = sanction approved, regardless of fund-received status:
                // covers Approved Sanction, Fund Received Pending, and Active alike.
                base = base.filter(p => {
                    const s = getStatusKey(p);
                    return s === "ongoing" || s === "pending_fund" || s === "approved_sanction";
                });
            } else {
                base = base.filter(p => ongoingIds.has(p.name) || submittedIds.has(p.name));
            }
        } else {
            base = base.filter(p => !ongoingIds.has(p.name) && !submittedIds.has(p.name));
        }

        if (kpiAgeFilter === "old") {
            base = base.filter(p => {
                if (p.is_old_project === 1 || p.is_old_project === true) return true;
                if (p.prj_start_date) return new Date(p.prj_start_date).getFullYear() < 2026;
                return false;
            });
        } else if (kpiAgeFilter === "new") {
            base = base.filter(p => {
                if (p.is_old_project === 1 || p.is_old_project === true) return false;
                if (p.prj_start_date) return new Date(p.prj_start_date).getFullYear() >= 2026;
                return true;
            });
        }

        if (kpiSchemeFilter.length > 0) {
            base = base.filter(p => kpiSchemeFilter.includes((p.funding_agency_schemes || p.scheme_name || "").trim()));
        }

        if (kpiModal?.title === "Projects: Utilized") {
            base = base.filter(p => (fundReceivedValueCache[p.name] || 0) > 0);
        } else if (kpiModal?.title === "Projects: Remaining Balance") {
            base = base.filter(p => {
                const utilized = fundReceivedValueCache[p.name] || 0;
                const sanctioned = Number(p.total_budget_amount || p.grand_total_proposal || 0);
                return Math.max(0, sanctioned - utilized) > 0;
            });
        } else if (kpiModal?.title === "Projects: Total Sanctioned") {
            base = base.filter(p => Number(p.total_budget_amount || p.grand_total_proposal || 0) > 0);
        } else if (kpiModal?.title === "Projects: Proposed Budget") {
            base = base.filter(p => Number(p.grand_total_proposal || p.total_budget_amount || 0) > 0);
        } else if (kpiModal?.title === "Projects: Research Projects") {
            base = base.filter(p => (p.project_type || "").toLowerCase().includes("research"));
        } else if (kpiModal?.title === "Projects: Consultancy Projects") {
            base = base.filter(p => (p.project_type || "").toLowerCase().includes("consult"));
        } else if (kpiModal?.title === "Projects: Others Projects") {
            base = base.filter(p => {
                const pt = (p.project_type || "").toLowerCase();
                return !pt.includes("research") && !pt.includes("consult");
            });
        }

        return base.filter(p => {
            if (tabKey === "all") return true;
            if (tabKey === "valid") return isProjectComplete(p);
            if (tabKey === "missing_budget") return Number(p.total_budget_amount || p.grand_total_proposal || 0) <= 0;
            if (tabKey === "missing_no") return !(p.project_no?.trim());
            if (tabKey === "missing_agency") {
                const agencyRaw = p.funding_agency_name || p.funding_agency || p.funding_agency_other || p.origin_of_funding_agency || p.funding_agency_schemes || p.scheme_name || "";
                return !agencyRaw.trim();
            }
            if (tabKey === "draft") return (p.workflow_state || "").toLowerCase().includes("draft") || p.docstatus === 0;
            if (tabKey === "pending") return !((p.workflow_state || "").toLowerCase().includes("draft") || p.docstatus === 0);
            const t = (p.project_type || "").toLowerCase();
            // No isProjectComplete gate — Research/Consultancy/Others must sum to the full
            // status-filtered total, matching kpiModalRows' equivalent tab filter above.
            if (tabKey === "research") return t.includes("research");
            if (tabKey === "consultancy") return t.includes("consult");
            if (tabKey === "others") return !t.includes("research") && !t.includes("consult");
            return false;
        }).length;
    }, [kpiModal, kpiStatusFilter, kpiAgeFilter, kpiSchemeFilter, allProjectsList, ongoingIds, submittedIds, fundStatusMap, sanctionDateMap, getEffectiveStartDate]);

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans text-[14px] leading-relaxed text-[#3F3F46] dark:text-[#E4E4E7]">
            <div className="px-6 md:px-8 pt-0 pb-10 max-w-[1600px] mx-auto">
                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 w-full">
                    <div className="relative">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#2563eb] rounded-xl flex items-center justify-center text-white shadow-sm border border-[#2563eb]/20">
                                {viewMode === "Director" ? (
                                    <BarChart3 size={20} />
                                ) : viewMode === "Department" ? (
                                    <Building2 size={20} />
                                ) : (
                                    <Users size={20} />
                                )}
                            </div>
                            <div>
                                <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.02em] text-[#3F3F46] dark:text-[#E4E4E7]">
                                    {viewMode === "Director"
                                        ? "Overview"
                                        : viewMode === "Department"
                                            ? "Department Overview"
                                            : "PI Project Overview"}
                                </h1>
                                <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-1">
                                    {viewMode === "Director"
                                        ? "KPIs, Analytics & Funding tracked centrally."
                                        : viewMode === "Department"
                                            ? "Analyzing resource & project allocation across departments."
                                            : "Tracking project workload and progress across investigators."}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Live Data
                            </div>
                            <div className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] font-mono bg-white dark:bg-[#27272A] px-3 py-1.5 rounded-full border border-[#E4E4E7] dark:border-[#3F3F46]">
                                {liveTime}
                            </div>
                        </div>
                        <button
                            onClick={handleDownloadClick}
                            disabled={isLoading || isWaitingForFunds}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#D97757] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg shadow-sm transition-all shrink-0"
                        >
                            {isWaitingForFunds ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
                            {isWaitingForFunds ? "Generating Overview..." : "Download Director Overview Report"}
                        </button>
                        <button
                            onClick={() => navigate("/generate-report")}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-semibold rounded-lg shadow-sm transition-all shrink-0"
                        >
                            <FileText className="size-3.5" />
                            Genarate Detailed Report
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-400/30 text-white ml-1">NEW</span>
                        </button>
                    </div>
                </div>

                {viewMode === "Director" && (
                    <div className="mb-8 border-t-2 border-[#4A6CF7]/35 pt-1.5 dark:border-[#818CF8]/35 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#71717A] dark:text-[#A1A1AA]">
                                Project Type
                            </div>
                            <div className="relative w-full md:w-[420px] shrink-0">
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
                                                const piName = p.pi_webmail ? (emailToNameMap[p.pi_webmail.toLowerCase().trim()] || p.pi_webmail.split("@")[0]) : "";
                                                return (
                                                    <div
                                                        key={p.name}
                                                        onClick={() => {
                                                            setHeaderSearchText("");
                                                            navigate(`/project-details-overview/${p.name}`, { state: { returnTo: location.pathname + location.search, ...getDashboardState() } });
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
                        </div>
                        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                            <button
                                onClick={() => setDashboardProjectTypeFilter("all")}
                                className={`flex h-9 flex-shrink-0 items-center gap-2 rounded-lg border px-3.5 text-[11px] font-extrabold uppercase tracking-wide transition-all duration-150 ${dashboardProjectTypeFilter === "all"
                                    ? "bg-[#F5F3FF] border-[#7C3AED] text-[#4C1D95] shadow-sm shadow-[#7C3AED]/10 dark:bg-[#7C3AED]/18 dark:border-[#A78BFA] dark:text-[#DDD6FE]"
                                    : "border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8]"
                                    }`}
                            >
                                All Projects
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${dashboardProjectTypeFilter === "all"
                                    ? "bg-[#7C3AED] text-white"
                                    : "bg-[#F4F4F5] text-[#71717A] dark:bg-[#18181B]/50 dark:text-[#A1A1AA]"
                                    }`}>
                                    {isLoading ? "Loading…" : globalTypeCounts.all}
                                </span>
                            </button>
                            <button
                                onClick={() => setDashboardProjectTypeFilter("research")}
                                className={`flex h-9 flex-shrink-0 items-center gap-2 rounded-lg border px-3.5 text-[11px] font-extrabold uppercase tracking-wide transition-all duration-150 ${dashboardProjectTypeFilter === "research"
                                    ? "bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A] shadow-sm shadow-[#4A6CF7]/10 dark:bg-[#4A6CF7]/18 dark:border-[#818CF8] dark:text-[#C7D2FE]"
                                    : "border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8]"
                                    }`}
                            >
                                Research
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${dashboardProjectTypeFilter === "research"
                                    ? "bg-[#4A6CF7] text-white"
                                    : "bg-[#F4F4F5] text-[#71717A] dark:bg-[#18181B]/50 dark:text-[#A1A1AA]"
                                    }`}>
                                    {isLoading ? "Loading…" : globalTypeCounts.r}
                                </span>
                            </button>
                            <button
                                onClick={() => setDashboardProjectTypeFilter("consultancy")}
                                className={`flex h-9 flex-shrink-0 items-center gap-2 rounded-lg border px-3.5 text-[11px] font-extrabold uppercase tracking-wide transition-all duration-150 ${dashboardProjectTypeFilter === "consultancy"
                                    ? "border-[#A7F3D0] bg-[#ECFDF5]/60 text-[#047857] shadow-sm shadow-[#10B981]/10 dark:border-[#10B981]/30 dark:bg-[#10B981]/10 dark:text-[#A7F3D0]"
                                    : "border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8]"
                                    }`}
                            >
                                Consultancy
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${dashboardProjectTypeFilter === "consultancy"
                                    ? "bg-white/80 text-[#059669] dark:bg-[#18181B]/50"
                                    : "bg-[#F4F4F5] text-[#71717A] dark:bg-[#18181B]/50 dark:text-[#A1A1AA]"
                                    }`}>
                                    {isLoading ? "Loading…" : globalTypeCounts.c}
                                </span>
                            </button>
                            <button
                                onClick={() => setDashboardProjectTypeFilter("others")}
                                className={`flex h-9 flex-shrink-0 items-center gap-2 rounded-lg border px-3.5 text-[11px] font-extrabold uppercase tracking-wide transition-all duration-150 ${dashboardProjectTypeFilter === "others"
                                    ? "bg-[#FAFAF9] border-[#71717A] text-[#27272A] shadow-sm dark:bg-[#27272A] dark:border-[#A1A1AA] dark:text-[#F4F4F5]"
                                    : "border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8]"
                                    }`}
                            >
                                Others
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${dashboardProjectTypeFilter === "others"
                                    ? "bg-[#71717A] text-white dark:bg-[#A1A1AA] dark:text-black"
                                    : "bg-[#F4F4F5] text-[#71717A] dark:bg-[#18181B]/50 dark:text-[#A1A1AA]"
                                    }`}>
                                    {isLoading ? "Loading…" : globalTypeCounts.o}
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {viewMode === "Director" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* ── KPI Cards ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px] mb-6">
                            <KpiCard
                                label="Total Projects"
                                value={String(totalProjects)}
                                isLoading={isLoading}
                                subtext=""
                                icon={
                                    <svg
                                        className="w-[18px] h-[18px]"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                    </svg>
                                }
                                valueColor="text-blue-700 dark:text-blue-400"
                                iconBg="#eff6ff"
                                circleColor="#2563eb"
                                onClick={() => openKpiModal("total", "All Projects")}
                                customBottom={!isLoading && projectBreakdownGrid}
                                valueAdornment={
                                    !isLoading && (
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 cursor-pointer hover:brightness-95 transition-all"
                                                onClick={(e) => { e.stopPropagation(); openKpiModalWithTab("total", "All Projects", "Ongoing"); }}
                                            >
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                {ongoingProjects} Ongoing
                                            </span>
                                            <span
                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 cursor-pointer hover:brightness-95 transition-all"
                                                title="Pending Sanction / Approved Sanction / Pending Fund Received"
                                                onClick={(e) => { e.stopPropagation(); openKpiModalWithTab("total", "All Projects", "Submitted"); }}
                                            >
                                                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                                {submittedProjectsCount} Submitted
                                            </span>
                                        </div>
                                    )
                                }
                            />
                            <KpiCard
                                label="Fund Allocation for Ongoing Projects"
                                value={formatCurrency(fundAlloc)}
                                isLoading={isLoading}
                                subtext=""
                                valueAdornment={
                                    !isLoading && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                            {!isFundUtilDataReady ? (
                                                <span className="animate-pulse">Loading…</span>
                                            ) : (
                                                `${fundUtilPercent}% utilized`
                                            )}
                                        </span>
                                    )
                                }
                                icon={
                                    <svg
                                        className="w-[18px] h-[18px]"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        viewBox="0 0 24 24"
                                    >
                                        <line x1="6" y1="5" x2="18" y2="5" />
                                        <line x1="6" y1="10" x2="18" y2="10" />
                                        <path d="M6 5h5a4 4 0 0 1 0 8H6" />
                                        <path d="M9 13L15 21" />
                                    </svg>
                                }
                                valueColor="text-emerald-700 dark:text-emerald-400"
                                iconBg="#ecfdf5"
                                circleColor="#059669"
                                onClick={() =>
                                    openKpiModal("allocation", "Projects by Allocation")
                                }
                                customBottom={!isLoading && allocationBreakdownGrid}
                            />
                            <KpiCard
                                label="Ongoing Projects"
                                value={String(ongoingProjects)}
                                isLoading={isLoading}
                                subtext=""
                                valueAdornment={
                                    !isLoading && ongoingProjects > 0 && (
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
                                    <svg
                                        className="w-[18px] h-[18px]"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 6v6l4 2" />
                                    </svg>
                                }
                                valueColor="text-violet-700 dark:text-violet-400"
                                iconBg="#f5f3ff"
                                circleColor="#7c3aed"
                                onClick={() => openKpiModal("ongoing", "Ongoing Projects")}
                                customBottom={!isLoading && ongoingBreakdownGrid}
                            />
                            <KpiCard
                                label="International Collaborators"
                                value={String(intl.active_agencies || 0)}
                                isLoading={isLoading}
                                subtext=""
                                icon={
                                    <svg
                                        className="w-[18px] h-[18px]"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="2" y1="12" x2="22" y2="12" />
                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                    </svg>
                                }
                                valueColor="text-sky-700 dark:text-sky-400"
                                iconBg="#f0f9ff"
                                circleColor="#0284c7"
                                onClick={() => openKpiModal("intl", "International Collaborator Projects")}
                                customBottom={!isLoading && intlBreakdownGrid}
                            />
                        </div>

                        {/* ── Project Analytics ── */}
                        <SectionDivider title="Project Analytics" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-6">
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/20 text-[#2563eb]">
                                            <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                viewBox="0 0 24 24"
                                            >
                                                <line x1="18" y1="20" x2="18" y2="10" />
                                                <line x1="12" y1="20" x2="12" y2="4" />
                                                <line x1="6" y1="20" x2="6" y2="14" />
                                            </svg>
                                        </div>
                                        Year-Wise Project Status
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
                                        <span className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider ml-1">Year:</span>
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
                                        {isLoading || allProjectsList === undefined ? (
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
                                                            let status = "all";
                                                            if (e && e.target && typeof e.target.getAttribute === "function") {
                                                                const name = e.target.getAttribute("name");
                                                                if (name === "Submitted") status = "submitted";
                                                                else if (name === "Ongoing") status = "ongoing";
                                                            }
                                                            openKpiModalWithYear(state.activeLabel, status);
                                                        }
                                                    }}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        stroke="#E4E4E7"
                                                        vertical={false}
                                                    />
                                                    <XAxis
                                                        dataKey="year"
                                                        tick={{
                                                            fontSize: 12,
                                                            fill: "#71717A",
                                                            fontWeight: 600,
                                                        }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        dy={8}
                                                    />
                                                    <YAxis
                                                        tick={{ fontSize: 12, fill: "#71717A" }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            borderRadius: "0.75rem",
                                                            border: "1px solid #1e293b",
                                                            background: "#0f172a",
                                                        }}
                                                        labelStyle={{
                                                            color: "#f1f5f9",
                                                            fontWeight: 700,
                                                            fontSize: 12,
                                                        }}
                                                        itemStyle={{ color: "#94a3b8", fontSize: 11 }}
                                                        cursor={{ fill: "#f4f4f5" }}
                                                    />
                                                    <Bar
                                                        dataKey="submitted"
                                                        name="Submitted"
                                                        fill="#2563eb"
                                                        maxBarSize={24}
                                                        radius={[4, 4, 0, 0]}
                                                        isAnimationActive={false}
                                                        cursor="pointer"
                                                    >
                                                        <LabelList
                                                            dataKey="submitted"
                                                            position="top"
                                                            fill="#71717A"
                                                            fontSize={11}
                                                            fontWeight={600}
                                                            formatter={(val: any) => (val > 0 ? val : "")}
                                                        />
                                                    </Bar>
                                                    <Bar
                                                        dataKey="ongoing"
                                                        name="Ongoing"
                                                        fill="#7c3aed"
                                                        maxBarSize={24}
                                                        radius={[4, 4, 0, 0]}
                                                        isAnimationActive={false}
                                                        cursor="pointer"
                                                    >
                                                        <LabelList
                                                            dataKey="ongoing"
                                                            position="top"
                                                            fill="#71717A"
                                                            fontSize={11}
                                                            fontWeight={600}
                                                            formatter={(val: any) => (val > 0 ? val : "")}
                                                        />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                                                No data available
                                            </div>
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
                                                        <span className="text-[18px] font-extrabold text-[#2563eb] leading-none tabular-nums">{chartYearSubmittedTotal}</span>
                                                        <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider">Submitted</span>
                                                        <span className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A]">(Pending Sanction)</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-[#E4E4E7]/70 dark:border-[#3F3F46]/70">
                                                    <div className="text-center">
                                                        <div className="text-[9px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide leading-none">Research</div>
                                                        <div className="text-[12px] font-extrabold text-[#2563eb] tabular-nums leading-none mt-1">{chartTypeBreakdown.researchSubmitted}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-[9px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide leading-none">Consultancy</div>
                                                        <div className="text-[12px] font-extrabold text-[#2563eb] tabular-nums leading-none mt-1">{chartTypeBreakdown.consultancySubmitted}</div>
                                                    </div>
                                                    {chartTypeBreakdown.othersSubmitted > 0 && (
                                                        <div className="text-center">
                                                            <div className="text-[9px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide leading-none">Others</div>
                                                            <div className="text-[12px] font-extrabold text-[#2563eb] tabular-nums leading-none mt-1">{chartTypeBreakdown.othersSubmitted}</div>
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
                                                        <span className="text-[18px] font-extrabold text-[#7c3aed] leading-none tabular-nums">{chartYearOngoingTotal}</span>
                                                        <span className="text-[10px] font-bold text-[#7c3aed] uppercase tracking-wider">Ongoing</span>
                                                        <span className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A]">(Sanction approved)</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-[#E4E4E7]/70 dark:border-[#3F3F46]/70">
                                                    <div className="text-center">
                                                        <div className="text-[9px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide leading-none">Research</div>
                                                        <div className="text-[12px] font-extrabold text-[#7c3aed] tabular-nums leading-none mt-1">{chartTypeBreakdown.researchOngoing}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-[9px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide leading-none">Consultancy</div>
                                                        <div className="text-[12px] font-extrabold text-[#7c3aed] tabular-nums leading-none mt-1">{chartTypeBreakdown.consultancyOngoing}</div>
                                                    </div>
                                                    {chartTypeBreakdown.othersOngoing > 0 && (
                                                        <div className="text-center">
                                                            <div className="text-[9px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-wide leading-none">Others</div>
                                                            <div className="text-[12px] font-extrabold text-[#7c3aed] tabular-nums leading-none mt-1">{chartTypeBreakdown.othersOngoing}</div>
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
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center justify-between w-full">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-violet-50 dark:bg-violet-950/20 text-[#7c3aed]">
                                                <svg
                                                    className="w-3.5 h-3.5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                                                    <path d="M22 12A10 10 0 0 0 12 2v10z" />
                                                </svg>
                                            </div>
                                            Funding Sources — Breakdown
                                        </div>
                                        <button
                                            onClick={() => setShowAllFunding(!showAllFunding)}
                                            className="text-[11px] font-bold text-[#2563eb] dark:text-blue-400 hover:underline whitespace-nowrap bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md transition-colors"
                                        >
                                            {showAllFunding ? "Show Top 7" : "Show All"}
                                        </button>
                                    </div>
                                </div>
                                <div className="p-[18px] px-[22px] pb-5">
                                    {isLoading ? (
                                        <div className="h-[300px] flex items-center justify-center text-[#71717A] text-sm">
                                            Loading chart...
                                        </div>
                                    ) : pieChartFundingData.length > 0 ? (
                                        <div className="flex flex-col w-full h-full">
                                            <div className="relative w-full shrink-0" style={{ height: "200px" }}>
                                                <div
                                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform z-10 w-28 h-28 rounded-full"
                                                    onClick={() => {
                                                        setKpiModal({ type: "total", title: `Funding: All Sources` });
                                                        setKpiPage(1);
                                                        setKpiTab("all");
                                                        setKpiStatusFilter("all");
                                                    }}
                                                >
                                                    <span className="text-3xl font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-none">
                                                        {pieChartFundingData.reduce((sum: number, d: any) => sum + d.value, 0)}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">
                                                        Total
                                                    </span>
                                                </div>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={pieChartFundingData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius="60%"
                                                            outerRadius="80%"
                                                            dataKey="value"
                                                            nameKey="funding_agency"
                                                            paddingAngle={3}
                                                            isAnimationActive={false}
                                                            onClick={(data: any) => {
                                                                if (data && data.payload && data.payload.funding_agency) {
                                                                    const clickedAgency = data.payload.funding_agency;

                                                                    if (clickedAgency === "Others") {
                                                                        const excludedAgencies = pieChartFundingData.slice(0, 7).map((d: any) => d.funding_agency);
                                                                        setKpiModal({
                                                                            type: "total",
                                                                            title: `Funding: Others`,
                                                                            fundingAgency: "Others",
                                                                            excludedFundingAgencies: excludedAgencies
                                                                        });
                                                                    } else {
                                                                        setKpiModal({ type: "total", title: `Funding: ${clickedAgency}`, fundingAgency: clickedAgency });
                                                                    }

                                                                    setKpiPage(1);
                                                                    setKpiTab("all");
                                                                    setKpiStatusFilter("all");
                                                                    setKpiSchemeFilter([]);
                                                                    setKpiAgeFilter("all");
                                                                }
                                                            }}
                                                            style={{ cursor: "pointer" }}
                                                        >
                                                            {pieChartFundingData.map((_: any, i: number) => (
                                                                <Cell
                                                                    key={i}
                                                                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                                                                    stroke="none"
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{
                                                                borderRadius: "0.5rem",
                                                                border: "1px solid #1e293b",
                                                                background: "#0f172a",
                                                            }}
                                                            labelStyle={{ color: "#f1f5f9", fontWeight: 700 }}
                                                            itemStyle={{ color: "#94a3b8", fontSize: 11 }}
                                                            formatter={(value: number, name: string) => [
                                                                `${value} Projects`,
                                                                name,
                                                            ]}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="w-full mt-0.5">
                                                <ul className={`grid grid-cols-1 sm:grid-cols-2 gap-x-20 gap-y-1 w-full ${showAllFunding ? "overflow-y-auto max-h-[160px] custom-scrollbar pr-2" : ""}`}>
                                                    {pieChartFundingData.map((item: any, i: number) => (
                                                        <li
                                                            key={i}
                                                            className="flex items-start justify-between min-w-0 text-[11px] group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors gap-1.5 py-1"
                                                            onClick={() => {
                                                                const clickedAgency = item.funding_agency;

                                                                if (clickedAgency === "Others") {
                                                                    const excludedAgencies = pieChartFundingData.slice(0, 7).map((d: any) => d.funding_agency);
                                                                    setKpiModal({
                                                                        type: "total",
                                                                        title: `Funding: Others`,
                                                                        fundingAgency: "Others",
                                                                        excludedFundingAgencies: excludedAgencies
                                                                    });
                                                                } else {
                                                                    setKpiModal({ type: "total", title: `Funding: ${clickedAgency}`, fundingAgency: clickedAgency });
                                                                }

                                                                setKpiPage(1);
                                                                setKpiTab("all");
                                                                setKpiStatusFilter("all");
                                                                setKpiSchemeFilter([]);
                                                                setKpiAgeFilter("all");
                                                            }}
                                                        >
                                                            <div className="flex items-start gap-2 pr-2">
                                                                <span
                                                                    className="w-2.5 h-2.5 rounded-sm shrink-0 mt-[2px]"
                                                                    style={{
                                                                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                                                                    }}
                                                                />
                                                                <span
                                                                    className="text-[#64748B] dark:text-[#A1A1AA] font-semibold break-words whitespace-normal flex-1 group-hover:text-[#3F3F46] dark:group-hover:text-[#E4E4E7] transition-colors leading-snug"
                                                                    title={item.funding_agency}
                                                                >
                                                                    {item.funding_agency}
                                                                </span>
                                                            </div>
                                                            <span className="font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] shrink-0 mt-[1px]">
                                                                {item.value}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-[300px] flex items-center justify-center text-[#71717A] text-sm">
                                            No data available
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── System Activity (forms processed across the app, all doctypes) ── */}
                        <SectionDivider title="System Activity — Form Submissions" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px] mb-[14px]">
                            <KpiCard
                                label="Today"
                                value={String(processCounts?.totals.today ?? 0)}
                                isLoading={isProcessCountsLoading}
                                subtext={
                                    isProcessCountsLoading || !processCounts?.totals.this_week
                                        ? ""
                                        : `${Math.round((processCounts.totals.today / processCounts.totals.this_week) * 100)}% of this week's volume`
                                }
                                icon={
                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                }
                                valueColor="text-orange-700 dark:text-orange-400"
                                iconBg="#fff7ed"
                                circleColor="#ea580c"
                            />
                            <KpiCard
                                label="This Week"
                                value={String(processCounts?.totals.this_week ?? 0)}
                                isLoading={isProcessCountsLoading}
                                subtext={
                                    isProcessCountsLoading || !processCounts?.totals.this_month
                                        ? ""
                                        : `${Math.round((processCounts.totals.this_week / processCounts.totals.this_month) * 100)}% of this month's volume`
                                }
                                icon={
                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
                                    </svg>
                                }
                                valueColor="text-blue-700 dark:text-blue-400"
                                iconBg="#eff6ff"
                                circleColor="#2563eb"
                            />
                            <KpiCard
                                label="This Month"
                                value={String(processCounts?.totals.this_month ?? 0)}
                                isLoading={isProcessCountsLoading}
                                subtext={
                                    isProcessCountsLoading || !processCounts?.totals.total
                                        ? ""
                                        : `${Math.round((processCounts.totals.this_month / processCounts.totals.total) * 100)}% of all-time total`
                                }
                                icon={
                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />
                                    </svg>
                                }
                                valueColor="text-violet-700 dark:text-violet-400"
                                iconBg="#f5f3ff"
                                circleColor="#7c3aed"
                            />
                            <KpiCard
                                label="Total (All Time)"
                                value={String(processCounts?.totals.total ?? 0)}
                                isLoading={isProcessCountsLoading}
                                subtext={
                                    isProcessCountsLoading || sortedDoctypeCounts.length === 0
                                        ? ""
                                        : `Across ${sortedDoctypeCounts.length} application types`
                                }
                                icon={
                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                                    </svg>
                                }
                                valueColor="text-emerald-700 dark:text-emerald-400"
                                iconBg="#ecfdf5"
                                circleColor="#059669"
                            />
                        </div>
                        {/* Trend chart — hidden per feedback: unclear what it shows; revisit once a
                            per-staff processing-time metric is available from the backend */}
                        {false && (
                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden mb-[14px]">
                            <div className="p-[18px] px-[24px] pb-[16px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                                <div>
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/30">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
                                            </svg>
                                        </div>
                                        Forms Processed Over Time
                                    </div>
                                    <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA] mt-1 ml-[42px]">Daily volume with weekly &amp; monthly averages overlaid — last 30 days</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {Object.values(TREND_SERIES_STYLE).map((s) => (
                                        <div key={s.key} className="flex items-center gap-1.5">
                                            <span className="w-[9px] h-[9px] rounded-full shrink-0" style={{ backgroundColor: s.stroke }} />
                                            <span className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{s.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-[18px] px-[22px] pb-6">
                                {!isProcessCountsLoading && combinedTrendData.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                                        <div className={`rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] ${TREND_SERIES_STYLE.daily.chipBg} px-3.5 py-2.5`}>
                                            <div className="text-[10.5px] font-bold text-[#52525B] dark:text-[#D4D4D8] uppercase tracking-wide mb-1">
                                                Daily Avg (30D)
                                            </div>
                                            <div className="text-[17px] font-extrabold tabular-nums" style={{ color: TREND_SERIES_STYLE.daily.stroke }}>
                                                {combinedTrendStats.dailyAvg.toLocaleString("en-IN")}
                                            </div>
                                        </div>
                                        <div className={`rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] ${TREND_SERIES_STYLE.weeklyAvg.chipBg} px-3.5 py-2.5`}>
                                            <div className="text-[10.5px] font-bold text-[#52525B] dark:text-[#D4D4D8] uppercase tracking-wide mb-1">
                                                Weekly Avg/Day
                                            </div>
                                            <div className="text-[17px] font-extrabold tabular-nums" style={{ color: TREND_SERIES_STYLE.weeklyAvg.stroke }}>
                                                {combinedTrendStats.weeklyAvg.toLocaleString("en-IN")}
                                            </div>
                                        </div>
                                        <div className={`rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] ${TREND_SERIES_STYLE.monthlyAvg.chipBg} px-3.5 py-2.5`}>
                                            <div className="text-[10.5px] font-bold text-[#52525B] dark:text-[#D4D4D8] uppercase tracking-wide mb-1">
                                                Monthly Avg/Day
                                            </div>
                                            <div className="text-[17px] font-extrabold tabular-nums" style={{ color: TREND_SERIES_STYLE.monthlyAvg.stroke }}>
                                                {combinedTrendStats.monthlyAvg.toLocaleString("en-IN")}
                                            </div>
                                        </div>
                                        <div className={`rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] px-3.5 py-2.5 ${combinedTrendStats.trendDirection === "up" ? "bg-emerald-50 dark:bg-emerald-950/20" : combinedTrendStats.trendDirection === "down" ? "bg-red-50 dark:bg-red-950/20" : "bg-[#FAFAF9] dark:bg-[#18181B]"}`}>
                                            <div className="text-[10.5px] font-bold text-[#52525B] dark:text-[#D4D4D8] uppercase tracking-wide mb-1">
                                                Today vs Yesterday
                                            </div>
                                            <div className={`text-[17px] font-extrabold tabular-nums flex items-center gap-1 ${combinedTrendStats.trendDirection === "up" ? "text-emerald-600 dark:text-emerald-400" : combinedTrendStats.trendDirection === "down" ? "text-red-600 dark:text-red-400" : "text-[#3F3F46] dark:text-[#E4E4E7]"}`}>
                                                {combinedTrendStats.trendDirection === "up" && <TrendingUp size={15} />}
                                                {combinedTrendStats.trendDirection === "down" && <TrendingDown size={15} />}
                                                {combinedTrendStats.trendDirection === "flat" && <Minus size={15} />}
                                                {combinedTrendStats.trendPct > 0 ? "+" : ""}{combinedTrendStats.trendPct}%
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="h-[300px]">
                                    {isProcessCountsLoading ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-[#71717A] text-sm gap-3">
                                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="font-medium">Loading activity...</span>
                                        </div>
                                    ) : combinedTrendData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedTrendData} margin={{ top: 20, right: 12, left: -18, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id={TREND_SERIES_STYLE.daily.gradientId} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={TREND_SERIES_STYLE.daily.stroke} stopOpacity={0.28} />
                                                        <stop offset="100%" stopColor={TREND_SERIES_STYLE.daily.stroke} stopOpacity={0.02} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#71717A", fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} interval={4} />
                                                <YAxis tick={{ fontSize: 12, fill: "#71717A" }} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: "0.75rem", border: "1px solid #27272A", background: "#18181B", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}
                                                    labelStyle={{ color: "#f4f4f5", fontWeight: 700, fontSize: 12, marginBottom: 4 }}
                                                    itemStyle={{ fontSize: 12, fontWeight: 600 }}
                                                    cursor={{ stroke: "#A1A1AA", strokeWidth: 1, strokeDasharray: "4 4" }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="daily"
                                                    name={TREND_SERIES_STYLE.daily.label}
                                                    stroke={TREND_SERIES_STYLE.daily.stroke}
                                                    strokeWidth={2.5}
                                                    fill={`url(#${TREND_SERIES_STYLE.daily.gradientId})`}
                                                    dot={false}
                                                    activeDot={{ r: 5, fill: TREND_SERIES_STYLE.daily.stroke, strokeWidth: 2, stroke: "#fff" }}
                                                    isAnimationActive={false}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="weeklyAvg"
                                                    name={TREND_SERIES_STYLE.weeklyAvg.label}
                                                    stroke={TREND_SERIES_STYLE.weeklyAvg.stroke}
                                                    strokeWidth={2.5}
                                                    strokeDasharray="5 3"
                                                    dot={false}
                                                    activeDot={{ r: 4.5, fill: TREND_SERIES_STYLE.weeklyAvg.stroke, strokeWidth: 2, stroke: "#fff" }}
                                                    isAnimationActive={false}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="monthlyAvg"
                                                    name={TREND_SERIES_STYLE.monthlyAvg.label}
                                                    stroke={TREND_SERIES_STYLE.monthlyAvg.stroke}
                                                    strokeWidth={2.5}
                                                    strokeDasharray="2 2"
                                                    dot={false}
                                                    activeDot={{ r: 4.5, fill: TREND_SERIES_STYLE.monthlyAvg.stroke, strokeWidth: 2, stroke: "#fff" }}
                                                    isAnimationActive={false}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                                            No data available
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[14px] mb-6 items-start">
                        {/* Application-wise breakdown */}
                        <div className="lg:col-span-2 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden flex flex-col">
                            <div className="p-[18px] px-[24px] pb-[16px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                                <div>
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/30">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M8 13h2" /><path d="M14 13h2" /><path d="M8 17h2" /><path d="M14 17h2" />
                                            </svg>
                                        </div>
                                        Application-wise Activity
                                    </div>
                                    <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA] mt-1 ml-[42px]">Ranked by total submissions, most active first</p>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span className="text-[11px] font-bold text-[#059669] bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                        {showAllActivityApps ? sortedDoctypeCounts.length : Math.min(ACTIVITY_TOP_N, sortedDoctypeCounts.length)} of {sortedDoctypeCounts.length} apps
                                    </span>
                                    <div className="hidden md:flex items-center gap-2 flex-wrap justify-end max-w-[280px]">
                                        {presentVolumeTiers.map((tier) => (
                                            <div key={tier.label} className="flex items-center gap-1">
                                                <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: tier.color.to }} />
                                                <span className="text-[11px] font-semibold text-[#52525B] dark:text-[#D4D4D8]">{tier.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="max-h-[560px] overflow-y-auto">
                                {isProcessCountsLoading ? (
                                    <div className="flex flex-col items-center justify-center text-[#71717A] text-sm gap-3 py-16">
                                        <div className="w-5 h-5 border-2 border-[#059669] border-t-transparent rounded-full animate-spin"></div>
                                        <span className="font-medium">Loading applications...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="hidden sm:flex items-center gap-3 px-[22px] py-2 border-b border-[#E4E4E7] dark:border-[#3F3F46] text-[10.5px] font-bold uppercase tracking-widest text-[#52525B] dark:text-[#D4D4D8]">
                                            <span className="w-6 shrink-0" />
                                            <span className="w-[220px] shrink-0">Application</span>
                                            <span className="flex-1">Volume</span>
                                            <span className="w-[168px] shrink-0 text-right">Today &nbsp;·&nbsp; Week &nbsp;·&nbsp; Month</span>
                                            <span className="w-[54px] shrink-0 text-right">Total</span>
                                        </div>
                                        <div className="divide-y divide-[#F4F4F5] dark:divide-[#3F3F46]">
                                            {visibleDoctypeCounts.map((row, idx) => {
                                                const isExpanded = expandedActivityDoctypes.has(row.doctype);
                                                const hasChildren = row.children.length > 0;
                                                const pct = Math.max(3, Math.round((row.total / maxDoctypeTotal) * 100));
                                                const volumeColor = getVolumeBucketColor(row.total);
                                                const rankColors = idx === 0
                                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                                    : idx === 1
                                                        ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                                        : idx === 2
                                                            ? "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                                                            : "bg-[#F4F4F5] text-[#71717A] dark:bg-[#18181B] dark:text-[#A1A1AA]";
                                                return (
                                                    <div key={row.doctype}>
                                                        <div
                                                            className={`flex items-center gap-3 px-[22px] py-2.5 ${hasChildren ? "cursor-pointer hover:bg-[#FAFAF9] dark:hover:bg-[#18181B]" : ""} transition-colors`}
                                                            onClick={() => hasChildren && toggleActivityDoctype(row.doctype)}
                                                        >
                                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 tabular-nums ${rankColors}`}>
                                                                {idx + 1}
                                                            </span>
                                                            <div className="w-[220px] shrink-0 flex items-center gap-1.5 min-w-0">
                                                                {hasChildren ? (
                                                                    <ChevronDown size={12} className={`text-[#A1A1AA] shrink-0 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                                                                ) : (
                                                                    <span className="w-3 shrink-0" />
                                                                )}
                                                                <span className="text-[12.5px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                                                                    {row.doctype}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 h-[7px] rounded-full bg-[#F4F4F5] dark:bg-[#3F3F46] overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{ width: `${pct}%`, background: `linear-gradient(to right, ${volumeColor.from}, ${volumeColor.to})` }}
                                                                />
                                                            </div>
                                                            <div className="hidden sm:flex w-[168px] shrink-0 items-center justify-end gap-2 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] tabular-nums">
                                                                <span className="w-[38px] text-right">{row.today}</span>
                                                                <span className="text-[#A1A1AA] dark:text-[#71717A]">·</span>
                                                                <span className="w-[38px] text-right">{row.this_week}</span>
                                                                <span className="text-[#A1A1AA] dark:text-[#71717A]">·</span>
                                                                <span className="w-[38px] text-right">{row.this_month}</span>
                                                            </div>
                                                            <span className={`w-[54px] shrink-0 text-right text-[13.5px] font-extrabold tabular-nums ${volumeColor.text}`}>
                                                                {row.total}
                                                            </span>
                                                        </div>
                                                        {isExpanded && hasChildren && (
                                                            <div className="bg-[#FAFAF9] dark:bg-[#18181B] px-[22px] py-1.5 space-y-1">
                                                                {row.children.map((child) => (
                                                                    <div key={`${row.doctype}-${child.fieldname}`} className="flex items-center gap-3 pl-9">
                                                                        <span className="text-[11.5px] text-[#52525B] dark:text-[#D4D4D8] truncate flex-1">
                                                                            ↳ {child.doctype}
                                                                        </span>
                                                                        <span className="hidden sm:inline text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] tabular-nums w-[168px] text-right">
                                                                            {child.today} · {child.this_week} · {child.this_month}
                                                                        </span>
                                                                        <span className="text-[10.5px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] tabular-nums w-[54px] text-right">
                                                                            {child.total}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                            {!isProcessCountsLoading && sortedDoctypeCounts.length > ACTIVITY_TOP_N && (
                                <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] p-2.5 shrink-0">
                                    <button
                                        onClick={() => setShowAllActivityApps((v) => !v)}
                                        className="w-full py-2 rounded-lg text-[11.5px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors"
                                    >
                                        {showAllActivityApps ? "Show Top 10" : `Show All (${sortedDoctypeCounts.length})`}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Usage tier distribution */}
                        <div className="lg:col-span-1 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden flex flex-col h-full">
                            <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between gap-2">
                                <div>
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-sm shadow-rose-500/30">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
                                            </svg>
                                        </div>
                                        Usage Distribution
                                    </div>
                                    <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA] mt-1 ml-[42px]">Apps grouped into 3 tiers · click a tier for details</p>
                                </div>
                                <select
                                    value={usageTierMetric}
                                    onChange={(e) => { setUsageTierMetric(e.target.value as keyof typeof USAGE_TIER_METRICS); setExpandedUsageTier(null); }}
                                    className="shrink-0 appearance-none bg-[#F4F4F5] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2.5 py-1 text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] outline-none cursor-pointer hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46] transition-colors"
                                >
                                    {Object.entries(USAGE_TIER_METRICS).map(([key, m]) => (
                                        <option key={key} value={key}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="p-[18px] px-[22px] flex-1 flex flex-col">
                                {isProcessCountsLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-[#71717A] text-sm gap-3 py-10">
                                        <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="font-medium">Loading...</span>
                                    </div>
                                ) : usageTierBreakdown.length > 0 ? (
                                    <>
                                        <div className="shrink-0 relative" style={{ height: "240px" }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: "0.75rem", border: "1px solid #27272A", background: "#18181B", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}
                                                        labelStyle={{ color: "#f4f4f5", fontWeight: 700, fontSize: 12, marginBottom: 2 }}
                                                        itemStyle={{ color: "#e4e4e7", fontSize: 12, fontWeight: 600 }}
                                                        formatter={(_value: number, name: string, props: { payload?: { value: number; appCount: number } }) => {
                                                            const real = props.payload?.value ?? 0;
                                                            const suffix = usageTierMetric === "weekly_avg" || usageTierMetric === "monthly_avg" ? "/day" : "";
                                                            return [`${real.toLocaleString("en-IN")}${suffix} · ${props.payload?.appCount ?? 0} apps`, name];
                                                        }}
                                                    />
                                                    <Pie
                                                        data={usageTierPieData}
                                                        dataKey="pieValue"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius="60%"
                                                        outerRadius="80%"
                                                        paddingAngle={3}
                                                        isAnimationActive={false}
                                                        onClick={(t: { name: string }) => setExpandedUsageTier(prev => prev === t.name ? null : t.name)}
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        {usageTierPieData.map((t) => (
                                                            <Cell key={t.name} fill={t.color} stroke={expandedUsageTier === t.name ? "#3F3F46" : "none"} strokeWidth={expandedUsageTier === t.name ? 2 : 0} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-10 w-28 h-28 rounded-full pointer-events-none">
                                                <span className="text-3xl font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-none tabular-nums">
                                                    {usageTierTotal.toLocaleString("en-IN")}
                                                </span>
                                                <span className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">
                                                    Total
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mt-2 flex-1">
                                            {usageTierBreakdown.map((t) => {
                                                const sharePct = usageTierTotal > 0 ? Math.round((t.value / usageTierTotal) * 100) : 0;
                                                const isOpen = expandedUsageTier === t.name;
                                                return (
                                                    <div key={t.name} className="rounded-lg bg-[#FAFAF9] dark:bg-[#18181B] overflow-hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedUsageTier(prev => prev === t.name ? null : t.name)}
                                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left hover:bg-white dark:hover:bg-[#27272A] transition-colors"
                                                        >
                                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-[11.5px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] truncate">{t.name}</div>
                                                                <div className="text-[10.5px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">{t.appCount} app{t.appCount === 1 ? "" : "s"}</div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <div className="text-[13px] font-extrabold tabular-nums" style={{ color: t.color }}>{sharePct}%</div>
                                                                <div className="text-[11px] font-semibold text-[#52525B] dark:text-[#D4D4D8] tabular-nums">{t.value.toLocaleString("en-IN")}</div>
                                                            </div>
                                                            <ChevronDown size={13} className={`text-[#71717A] dark:text-[#A1A1AA] shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                                                        </button>
                                                        {isOpen && (
                                                            <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] px-2.5 py-1.5 max-h-[220px] overflow-y-auto space-y-0.5">
                                                                {t.rows.map((r, i) => (
                                                                    <div key={r.doctype} className="flex items-center gap-2 py-1">
                                                                        <span className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] w-4 text-right shrink-0 tabular-nums">{i + 1}</span>
                                                                        <span className="text-[11.5px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate flex-1">{r.doctype}</span>
                                                                        <span className="text-[10.5px] font-extrabold tabular-nums shrink-0" style={{ color: t.color }}>
                                                                            {usageTierGetValue(r).toLocaleString("en-IN")}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-[#71717A] text-sm py-10">
                                        No data available
                                    </div>
                                )}
                            </div>
                        </div>
                        </div>

                        {/* ── Project Analytics & Distribution ── */}
                        <SectionDivider title="Project Analytics & Distribution" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-6">
                            {/* Financial Trends Line Chart */}
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
                                            <div className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] leading-tight">Ongoing (sanction-approved) projects only</div>
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
                                        <span className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider ml-1">Year:</span>
                                        <select
                                            value={financialYearFilter}
                                            onChange={(e) => setFinancialYearFilter(e.target.value)}
                                            className="bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2 py-1 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none focus:border-[#2563eb] cursor-pointer"
                                        >
                                            <option value="all">All Years</option>
                                            {availableYears.map(y => (
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
                                                {isLoading ? "—" : formatCurrency(fundAlloc)}
                                            </div>
                                            <div className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">
                                                Total Sanctioned
                                            </div>
                                        </div>
                                        <div
                                            className="flex-1 bg-[#FAFAF9] dark:bg-[#18181B] rounded-xl p-3.5 text-center shadow-sm border border-black/5 dark:border-white/5 cursor-pointer hover:scale-[1.02] transition-transform"
                                            onClick={() => openKpiModalWithTab("total", "Projects: Utilized", "ongoing")}
                                        >
                                            <div className="text-[20px] font-extrabold tracking-[-0.03em] text-[#059669]">
                                                {isLoading ? "—" : globalUtilizedLoading ? (
                                                    <span className="text-[13px] font-bold text-[#71717A] dark:text-[#A1A1AA] animate-pulse">Loading…</span>
                                                ) : formatCurrency(fundUtilized)}
                                            </div>
                                            <div className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">
                                                Utilized
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-[220px] w-full mt-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={[
                                                    { name: "Sanctioned", value: fundAlloc, fill: "#2563eb", filter: "ongoing", title: "Projects: Total Sanctioned" },
                                                    { name: "Utilized", value: fundUtilized, fill: "#059669", filter: "ongoing", title: "Projects: Utilized" },
                                                    { name: "Remaining", value: fundRemaining, fill: "#0ea5e9", filter: "ongoing", title: "Projects: Remaining Balance" },
                                                    // { name: "Proposed", value: computedProposedBudget, fill: "#71717a", filter: "submitted", title: "Projects: Proposed Budget" }
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
                                                            openKpiModalWithTab("total", data.payload.title, data.payload.filter);
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
                                                            { name: "Sanctioned", value: fundAlloc, fill: "#2563eb", filter: "ongoing", title: "Projects: Total Sanctioned" },
                                                            { name: "Utilized", value: fundUtilized, fill: "#059669", filter: "ongoing", title: "Projects: Utilized" },
                                                            { name: "Remaining", value: fundRemaining, fill: "#0ea5e9", filter: "ongoing", title: "Projects: Remaining Balance" },
                                                            // { name: "Proposed", value: computedProposedBudget, fill: "#71717a", filter: "submitted", title: "Projects: Proposed Budget" }
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
                                                    {isLoading ? "—" : formatCurrency(fundAlloc)}
                                                </span>
                                            </div>
                                            <div
                                                className="flex items-center justify-between py-2 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-2 -mx-2 rounded transition-colors"
                                                onClick={() => openKpiModalWithTab("total", "Projects: Utilized", "ongoing")}
                                            >
                                                <span className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">Utilized</span>
                                                <span className="text-[13px] font-extrabold text-[#059669]">
                                                    {isLoading ? "—" : globalUtilizedLoading ? (
                                                        <span className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] animate-pulse">Loading…</span>
                                                    ) : formatCurrency(fundUtilized)}
                                                </span>
                                            </div>
                                            <div
                                                className="flex items-center justify-between py-2 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-2 -mx-2 rounded transition-colors"
                                                onClick={() => openKpiModalWithTab("total", "Projects: Remaining Balance", "ongoing")}
                                            >
                                                <span className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">Remaining Balance</span>
                                                <span className="text-[13px] font-extrabold text-[#0ea5e9]">
                                                    {isLoading ? "—" : globalUtilizedLoading ? (
                                                        <span className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] animate-pulse">Loading…</span>
                                                    ) : formatCurrency(fundRemaining)}
                                                </span>
                                            </div>
                                            {/* 
                                            <div 
                                                className="flex items-center justify-between py-2 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-2 -mx-2 rounded transition-colors"
                                                onClick={() => openKpiModalWithTab("total", "Projects: Proposed Budget", "submitted")}
                                            >
                                                <span className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">Proposed Budget (Review)</span>
                                                <span className="text-[13px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                    {isLoading ? "—" : formatCurrency(computedProposedBudget)}
                                                </span>
                                            </div>
                                            */}
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Department-wise Pie Chart */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/20 text-[#2563eb]">
                                            <Building2 size={14} strokeWidth={2.5} />
                                        </div>
                                        Department-wise Project Distribution
                                    </div>
                                    {pieChartDeptData.length > 10 && (
                                        <button
                                            onClick={() => setShowAllDepts((prev) => !prev)}
                                            className="text-[11px] font-bold text-[#2563eb] dark:text-blue-400 hover:underline whitespace-nowrap bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md transition-colors"
                                        >
                                            {showAllDepts ? "Show Less" : "Show All"}
                                        </button>
                                    )}
                                </div>
                                <div className="p-[18px] px-[22px] pb-5">
                                    <div className="transition-all duration-300 w-full min-h-[340px]">
                                        {isLoading ? (
                                            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                                                Loading chart...
                                            </div>
                                        ) : pieChartDeptData.length === 0 ? (
                                            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                                                No data available
                                            </div>
                                        ) : (
                                            (() => {
                                                let pieData = pieChartDeptData;
                                                if (!showAllDepts && pieChartDeptData.length > 10) {
                                                    const top10 = pieChartDeptData.slice(0, 10);
                                                    const others = pieChartDeptData.slice(10);
                                                    const othersCount = others.reduce((sum, d) => sum + d.project_count, 0);
                                                    if (othersCount > 0) {
                                                        pieData = [...top10, { dept_name: "Other Departments", project_count: othersCount }];
                                                    } else {
                                                        pieData = top10;
                                                    }
                                                }

                                                // Inject formatted names for tooltip & modal rendering
                                                pieData = pieData.map(d => ({
                                                    ...d,
                                                    formatted_name: d.dept_name === "Other Departments" ? "Other Departments" : getDeptName(d.dept_name)
                                                }));

                                                const totalDeptCount = pieChartDeptData.reduce((sum, d) => sum + d.project_count, 0);

                                                return (
                                                    <div className="flex flex-col w-full h-full">
                                                        <div className="relative w-full shrink-0" style={{ height: "240px" }}>
                                                            <div
                                                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform z-10 w-28 h-28 rounded-full"
                                                                onClick={() => {
                                                                    setKpiModal({ type: "total", title: `Departments: All` });
                                                                    setKpiPage(1);
                                                                    setKpiTab("all");
                                                                    setKpiStatusFilter("all");
                                                                }}
                                                            >
                                                                <span className="text-3xl font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-none">
                                                                    {totalDeptCount}
                                                                </span>
                                                                <span className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">
                                                                    Projects
                                                                </span>
                                                            </div>
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie
                                                                        data={pieData}
                                                                        cx="50%"
                                                                        cy="50%"
                                                                        innerRadius="60%"
                                                                        outerRadius="80%"
                                                                        dataKey="project_count"
                                                                        nameKey="formatted_name"
                                                                        paddingAngle={3}
                                                                        isAnimationActive={false}
                                                                        onClick={(data: any) => {
                                                                            if (data && data.payload && data.payload.dept_name) {
                                                                                const isOther = data.payload.dept_name === "Other Departments";
                                                                                const allowedDepts = isOther ? pieChartDeptData.slice(10).map((d: any) => d.dept_name) : [data.payload.dept_name];
                                                                                setKpiModal({ type: "total", title: `Department: ${data.payload.formatted_name}`, allowedDepts });
                                                                                setKpiPage(1);
                                                                                setKpiTab("all");
                                                                                setKpiStatusFilter("all");
                                                                            }
                                                                        }}
                                                                        style={{ cursor: "pointer" }}
                                                                    >
                                                                        {pieData.map((_: any, i: number) => (
                                                                            <Cell
                                                                                key={i}
                                                                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                                                                                stroke="none"
                                                                            />
                                                                        ))}
                                                                    </Pie>
                                                                    <Tooltip
                                                                        contentStyle={{
                                                                            borderRadius: "0.75rem",
                                                                            border: "1px solid #1e293b",
                                                                            background: "#0f172a",
                                                                        }}
                                                                        labelStyle={{
                                                                            color: "#f1f5f9",
                                                                            fontWeight: 700,
                                                                            fontSize: 12,
                                                                        }}
                                                                        itemStyle={{ color: "#94a3b8", fontSize: 11 }}
                                                                        formatter={(value: number, name: string) => [
                                                                            `${value} Projects`,
                                                                            name,
                                                                        ]}
                                                                    />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        </div>

                                                        <div className="w-full mt-2">
                                                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-20 gap-y-1 w-full">
                                                                {pieData.map((entry: any, index: number) => (
                                                                    <li
                                                                        key={`item-${index}`}
                                                                        className="flex items-center justify-between text-[11px] min-w-0 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors gap-1.5 py-1"
                                                                        onClick={() => {
                                                                            if (entry.dept_name) {
                                                                                const isOther = entry.dept_name === "Other Departments";
                                                                                const allowedDepts = isOther ? pieChartDeptData.slice(10).map((d: any) => d.dept_name) : [entry.dept_name];
                                                                                setKpiModal({ type: "total", title: `Department: ${entry.formatted_name}`, allowedDepts });
                                                                                setKpiPage(1);
                                                                                setKpiTab("all");
                                                                                setKpiStatusFilter("all");
                                                                            }
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-1.5 pr-2 truncate">
                                                                            <span
                                                                                className="w-2 h-2 rounded-full shrink-0"
                                                                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                                                            />
                                                                            <span
                                                                                className="text-[#64748B] dark:text-[#A1A1AA] font-semibold truncate group-hover:text-[#3F3F46] dark:group-hover:text-[#E4E4E7] transition-colors"
                                                                                title={entry.formatted_name}
                                                                            >
                                                                                {entry.formatted_name}
                                                                            </span>
                                                                        </div>
                                                                        <span className="font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] shrink-0">
                                                                            {entry.project_count}
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Project Timeline (Year-wise) ── */}
                            {false && (
                                <div className="lg:col-span-2 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden flex flex-col">
                                    <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                                        <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-indigo-50 dark:bg-indigo-950/20 text-[#6366f1]">
                                                <BarChart3 size={14} strokeWidth={2.5} />
                                            </div>
                                            Project Timeline (Year-wise)
                                        </div>
                                        <div className="flex items-center gap-4 text-[11px] font-bold text-[#71717A]">
                                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#2563eb]"></div>Started</div>
                                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#8b5cf6]"></div>Completed</div>
                                        </div>
                                    </div>
                                    <div className="p-[18px] px-[22px]">
                                        <div className="h-[260px] w-full">
                                            {startEndSanctionData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={startEndSanctionData}
                                                        margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" className="dark:stroke-[#3F3F46]" />
                                                        <XAxis
                                                            dataKey="year"
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
                                                            labelStyle={{
                                                                color: "#f1f5f9",
                                                                fontWeight: 700,
                                                                fontSize: 13,
                                                                marginBottom: 6
                                                            }}
                                                            itemStyle={{ fontSize: 13, fontWeight: 700 }}
                                                            formatter={(value: any, name: string) => [
                                                                `${value} Projects`,
                                                                name === "startCount" ? "Started" : "Completed"
                                                            ]}
                                                        />
                                                        <Bar
                                                            dataKey="startCount"
                                                            name="startCount"
                                                            fill="#2563eb"
                                                            radius={[4, 4, 0, 0]}
                                                            cursor="pointer"
                                                            barSize={16}
                                                            onClick={(data: any) => {
                                                                const year = data?.payload?.year || data?.year;
                                                                if (year) openKpiModalWithYear(year, "ongoing");
                                                            }}
                                                            className="hover:opacity-80 transition-opacity"
                                                        >
                                                            <LabelList dataKey="startCount" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#71717a' }} />
                                                        </Bar>
                                                        <Bar
                                                            dataKey="endCount"
                                                            name="endCount"
                                                            fill="#8b5cf6"
                                                            radius={[4, 4, 0, 0]}
                                                            cursor="pointer"
                                                            barSize={16}
                                                            onClick={(data: any) => {
                                                                const year = data?.payload?.year || data?.year;
                                                                if (year) openKpiModalWithYear(year, "completed");
                                                            }}
                                                            className="hover:opacity-80 transition-opacity"
                                                        >
                                                            <LabelList dataKey="endCount" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#71717a' }} />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm font-medium">
                                                    No timeline data available
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {false && (
                                <>
                                    {/* Sanction Amount — Start vs End Year */}
                                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                        <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                            <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/20 text-[#059669]">
                                                    <svg
                                                        className="w-3.5 h-3.5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <line x1="18" y1="20" x2="18" y2="10" />
                                                        <line x1="12" y1="20" x2="12" y2="4" />
                                                        <line x1="6" y1="20" x2="6" y2="14" />
                                                    </svg>
                                                </div>
                                                Sanction Amount — Start vs End
                                            </div>
                                        </div>
                                        <div className="p-[18px] px-[22px]">
                                            <div className="h-[300px]">
                                                {isLoading || allProjectsList === undefined ? (
                                                    <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                                                        Loading chart...
                                                    </div>
                                                ) : startEndSanctionData.length === 0 ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-[#71717A] text-sm gap-2">
                                                        <svg
                                                            className="w-12 h-12 text-[#A1A1AA]"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                                                            />
                                                        </svg>
                                                        <p className="font-semibold">
                                                            No project date data available
                                                        </p>
                                                        <p className="text-xs text-[#A1A1AA]">
                                                            Ensure projects have prj_start_date and prj_end_date
                                                            filled
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            data={startEndSanctionData}
                                                            margin={{ top: 20, right: 4, left: -10, bottom: 0 }}
                                                            barCategoryGap="30%"
                                                            barGap={3}
                                                            onClick={(state: any) => {
                                                                if (state && state.activeLabel) {
                                                                    openKpiModalWithYear(state.activeLabel, "all");
                                                                }
                                                            }}
                                                            style={{ cursor: "pointer" }}
                                                        >
                                                            <CartesianGrid
                                                                strokeDasharray="3 3"
                                                                vertical={false}
                                                                stroke="#E4E4E7"
                                                            />
                                                            <XAxis
                                                                dataKey="year"
                                                                axisLine={false}
                                                                tickLine={false}
                                                                tick={{ fontSize: 12, fontWeight: 700, fill: "#71717A" }}
                                                                dy={8}
                                                            />
                                                            <YAxis
                                                                axisLine={false}
                                                                tickLine={false}
                                                                tickFormatter={(v) =>
                                                                    v >= 10000000
                                                                        ? `₹${(v / 10000000).toFixed(0)}Cr`
                                                                        : v >= 100000
                                                                            ? `₹${(v / 100000).toFixed(0)}L`
                                                                            : `₹${v}`
                                                                }
                                                                tick={{ fontSize: 12, fill: "#71717A" }}
                                                            />
                                                            <Tooltip
                                                                content={<BarTooltip />}
                                                                cursor={{ fill: "#f4f4f5" }}
                                                            />
                                                            <Bar
                                                                dataKey="startAmount"
                                                                name="Project Start"
                                                                fill="#2563eb"
                                                                radius={[6, 6, 0, 0]}
                                                                maxBarSize={36}
                                                                cursor="pointer"
                                                                onClick={(data: any) => openKpiModalWithYear(data.year, "all")}
                                                            />
                                                            <Bar
                                                                dataKey="endAmount"
                                                                name="Project End"
                                                                fill="#d97706"
                                                                radius={[6, 6, 0, 0]}
                                                                maxBarSize={36}
                                                                cursor="pointer"
                                                                onClick={(data: any) => openKpiModalWithYear(data.year, "all")}
                                                            />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                )}
                                            </div>
                                            <div className="flex items-start gap-5 flex-wrap mt-4 pt-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                                <div className="flex items-start gap-2">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-sm shrink-0 mt-[2px]"
                                                        style={{ backgroundColor: "#2563eb" }}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                                            Project Start
                                                        </span>
                                                        <span className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] max-w-[120px] leading-snug mt-0.5">
                                                            Budget of projects beginning this year
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-sm shrink-0 mt-[2px]"
                                                        style={{ backgroundColor: "#d97706" }}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                                            Project End
                                                        </span>
                                                        <span className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] max-w-[120px] leading-snug mt-0.5">
                                                            Budget of projects closing this year
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ── Financial Intelligence ── */}
                        <SectionDivider title="Financial" />
                        <div className="mb-6">
                            {/* All Projects Table */}
                            {(() => {
                                // Director-only restrict filter
                                const directorAllowedFilters = new Set(["all", "ongoing", "pending_fund", "approved_sanction", "pending_sanction", "submitted"]);

                                const STATUS_FILTER_OPTIONS = [
                                    { value: "all", label: "All Projects" },
                                    { value: "ongoing", label: "Ongoing (Sanction Approved)" },
                                    { value: "pending_fund", label: "Fund Received Pending" },
                                    { value: "approved_sanction", label: "Approved Sanction" },
                                    { value: "pending_sanction", label: "Pending Sanction" },
                                    { value: "completed", label: "Completed" },
                                    { value: "cancelled", label: "Cancelled" },
                                ];

                                let allProjs: any[] = (allProjectsList || []).map((p: any) => {
                                    let computedStatus: string;
                                    const sanctioned = getSanctionedAmount(p);

                                    if (ongoingIds.has(p.name)) {
                                        // fund-received status is fetched per-project in the background (no bulk
                                        // API for that doctype) — show a Loading badge instead of a guess that
                                        // could silently flip from Pending to Active once the fetch resolves.
                                        if (!fundStatusMap.has(p.name)) {
                                            computedStatus = "loading";
                                        } else {
                                            const hasStartDate = !!(sanctionDateMap.get(p.name) || p.prj_start_date || p.sanctioned_letter_date);
                                            const hasFundReceived = fundStatusMap.get(p.name) === true;

                                            if (hasFundReceived) {
                                                computedStatus = "ongoing";
                                            } else if (hasStartDate) {
                                                computedStatus = "pending_fund";
                                            } else {
                                                computedStatus = "approved_sanction";
                                            }
                                        }
                                    }
                                    else if (submittedIds.has(p.name)) computedStatus = "pending_sanction";
                                    else {
                                        const s = (p.workflow_state || "").toLowerCase();
                                        if (s.includes("draft") || p.docstatus === 0) computedStatus = "draft";
                                        else if (s.includes("complet")) computedStatus = "completed";
                                        else if (s.includes("cancel") || s.includes("reject")) computedStatus = "cancelled";
                                        else computedStatus = "pending";
                                    }
                                    return {
                                        ...p,
                                        department: p.implementation_department,
                                        _status: computedStatus,
                                        total_budget_amount: sanctioned,
                                    };
                                }).sort((a: any, b: any) => (b.total_budget_amount - a.total_budget_amount));

                                // Restrict the base array for 'Director' role to ONLY active statuses
                                if (isDirectorOnly) {
                                    allProjs = allProjs.filter((p: any) => ["ongoing", "pending_fund", "approved_sanction", "pending_sanction"].includes(p._status));
                                }

                                const filtered = allProjs.filter((p: any) => {
                                    if (projectTableFilter === "all") return true;
                                    // "submitted" kept for backward compatibility — same as pending_sanction
                                    if (projectTableFilter === "submitted") return p._status === "pending_sanction";
                                    return p._status === projectTableFilter;
                                }).filter((p: any) => {
                                    if (!projectTableSearch.trim()) return true;
                                    const query = projectTableSearch.toLowerCase().trim();
                                    const title = (p.project_title || p.name || "").toLowerCase();
                                    const projNo = (p.project_no || p.name || "").toLowerCase();
                                    const piEmail = (p.pi_webmail || "").toLowerCase();
                                    const piName = (p.pi_webmail ? (emailToNameMap[p.pi_webmail.toLowerCase().trim()] || p.pi_webmail.split("@")[0]) : "").toLowerCase();
                                    const deptName = (p.implementation_department || p.user_department || p.dept_name || "").toLowerCase();
                                    return (
                                        title.includes(query) ||
                                        projNo.includes(query) ||
                                        piEmail.includes(query) ||
                                        piName.includes(query) ||
                                        deptName.includes(query)
                                    );
                                });

                                const totalPages = Math.max(1, Math.ceil(filtered.length / PROJECT_TABLE_PAGE_SIZE));
                                const safePage = Math.min(projectTablePage, totalPages);
                                const pageSlice = filtered.slice((safePage - 1) * PROJECT_TABLE_PAGE_SIZE, safePage * PROJECT_TABLE_PAGE_SIZE);
                                const nextPageSlice = filtered.slice(safePage * PROJECT_TABLE_PAGE_SIZE, (safePage + 1) * PROJECT_TABLE_PAGE_SIZE);

                                return (
                                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                        <VisiblePageTracker
                                            pageSlice={pageSlice}
                                            nextPageSlice={nextPageSlice}
                                            targetRef={visibleProjectNamesRef}
                                            active={!kpiModal}
                                        />
                                        {/* Header */}
                                        <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between flex-wrap gap-3">
                                            <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/20 text-[#059669]">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                                        <polyline points="17 6 23 6 23 12" />
                                                    </svg>
                                                </div>
                                                All Projects
                                                <span className="ml-1 text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2 py-0.5 rounded-full">
                                                    {filtered.length}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {/* Search Input */}
                                                <div className="relative min-w-[200px] sm:min-w-[280px]">
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400 dark:text-zinc-500">
                                                        <Search className="w-3.5 h-3.5" />
                                                    </span>
                                                    <input
                                                        type="text"
                                                        placeholder="Search project title, no, PI, dept..."
                                                        value={projectTableSearch}
                                                        onChange={(e) => {
                                                            setProjectTableSearch(e.target.value);
                                                            setProjectTablePage(1);
                                                        }}
                                                        className="w-full text-[11px] font-bold pl-8 pr-8 py-1.5 bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg outline-none focus:border-[#2563eb] text-[#3F3F46] dark:text-[#E4E4E7] placeholder-zinc-400 transition-colors shadow-sm"
                                                    />
                                                    {projectTableSearch && (
                                                        <button
                                                            onClick={() => {
                                                                setProjectTableSearch("");
                                                                setProjectTablePage(1);
                                                            }}
                                                            className="absolute inset-y-0 right-0 flex items-center pr-2 text-[#71717A] hover:text-black dark:hover:text-white"
                                                            type="button"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Status filter dropdown */}
                                                <select
                                                    value={projectTableFilter}
                                                    onChange={(e) => { setProjectTableFilter(e.target.value); setProjectTablePage(1); }}
                                                    className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-3 py-1.5 outline-none focus:border-[#2563eb] cursor-pointer transition-colors"
                                                >
                                                    {STATUS_FILTER_OPTIONS.filter(opt => !(isDirectorOnly && !directorAllowedFilters.has(opt.value))).map(opt => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Table */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                                                        {["#", "Project", "PI / Lead", "Department", "Status", "Amount"].map((h) => (
                                                            <th key={h} className="p-2.5 px-3.5 text-[11px] font-bold text-[#52525B] dark:text-[#D4D4D8] uppercase tracking-widest text-left whitespace-nowrap">
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {isLoading || allProjectsList === undefined ? (
                                                        <tr>
                                                            <td colSpan={6} className="p-8 text-center text-[#71717A] text-sm">Loading projects...</td>
                                                        </tr>
                                                    ) : pageSlice.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="p-8 text-center text-[#71717A] text-sm">No projects match the selected filter.</td>
                                                        </tr>
                                                    ) : (
                                                        pageSlice.map((proj: any, idx: number) => {
                                                            const globalIdx = (safePage - 1) * PROJECT_TABLE_PAGE_SIZE + idx;
                                                            return (
                                                                <tr
                                                                    key={proj.name || idx}
                                                                    onClick={() => { if (window.getSelection()?.toString()) return; navigate(`/project-details-overview/${proj.name}`, { state: { returnTo: location.pathname + location.search, ...getDashboardState() } }); }}
                                                                    className="border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors cursor-pointer"
                                                                >
                                                                    <td className="p-3 px-3.5 align-middle text-[11px] font-extrabold text-[#71717A] dark:text-[#A1A1AA] font-mono">
                                                                        {String(globalIdx + 1).padStart(2, "0")}
                                                                    </td>
                                                                    <td className="p-3 px-3.5 align-middle max-w-[300px]">
                                                                        <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-2">
                                                                            {proj.project_title || proj.name || "Untitled"}
                                                                        </div>
                                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                                            {proj.project_no ? (
                                                                                <span className="font-mono text-[10px] text-[#71717A] dark:text-[#A1A1AA] bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] px-1.5 py-0.5 rounded inline-block">
                                                                                    {proj.project_no}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="font-mono text-[10px] text-[#71717A] dark:text-[#A1A1AA] bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] px-1.5 py-0.5 rounded inline-block">
                                                                                    {proj.name}
                                                                                </span>
                                                                            )}
                                                                            {(() => {
                                                                                const d = getEffectiveStartDate(proj);
                                                                                const isOld = proj.is_old_project === 1 || proj.is_old_project === true || (d && new Date(d).getFullYear() < 2026);
                                                                                return isOld ? (
                                                                                    <span className="font-mono text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded inline-block">Old</span>
                                                                                ) : (
                                                                                    <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded inline-block">New</span>
                                                                                );
                                                                            })()}
                                                                            <ProjectDateBadge proj={proj} />
                                                                            {proj.project_type && (
                                                                                <span className="font-mono text-[10px] text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded inline-block">
                                                                                    {proj.project_type}
                                                                                </span>
                                                                            )}
                                                                            {(() => {
                                                                                const scheme = normalizeSchemeName(proj.funding_agency_schemes || proj.scheme_name || "");
                                                                                return scheme ? (
                                                                                    <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded inline-block">
                                                                                        {scheme}
                                                                                    </span>
                                                                                ) : null;
                                                                            })()}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 px-3.5 align-middle text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                                                        <div className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap">
                                                                            {proj.principal_investigator_name || (proj.pi_webmail ? (emailToNameMap[proj.pi_webmail.toLowerCase().trim()] || proj.pi_webmail.split("@")[0]) : "—")}
                                                                        </div>
                                                                        {proj.pi_webmail && (
                                                                            <div className="mt-0.5">
                                                                                {proj.pi_webmail}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 px-3.5 align-middle">
                                                                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                                                            {proj.department ? getDeptName(proj.department) : "—"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3 px-3.5 align-middle">
                                                                        <AsyncTableStatusBadge proj={proj} fundReceived={fundStatusMap.get(proj.name)} />
                                                                    </td>
                                                                    <td className="p-3 px-3.5 align-middle font-extrabold text-[13px] text-[#059669] whitespace-nowrap">
                                                                        <SanctionAmountOverride
                                                                            projectName={proj.name}
                                                                            isOngoing={!!(ongoingIds && (ongoingIds.has(proj.name) || ongoingIds.has(proj.project_no)))}
                                                                            bulkAmount={proj.total_budget_amount || 0}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination Footer */}
                                        {filtered.length > PROJECT_TABLE_PAGE_SIZE && (
                                            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                                                <span className="text-[12px] text-[#52525B] dark:text-[#D4D4D8] font-semibold">
                                                    Showing {(safePage - 1) * PROJECT_TABLE_PAGE_SIZE + 1}–{Math.min(safePage * PROJECT_TABLE_PAGE_SIZE, filtered.length)} of {filtered.length} projects
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setProjectTablePage((p) => Math.max(1, p - 1))}
                                                        disabled={safePage === 1}
                                                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] disabled:opacity-40 hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46] transition-colors"
                                                    >
                                                        ‹ Prev
                                                    </button>
                                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                        const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                                                        const page = start + i;
                                                        return (
                                                            <button
                                                                key={page}
                                                                onClick={() => setProjectTablePage(page)}
                                                                className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-colors ${page === safePage
                                                                    ? "bg-[#2563eb] text-white"
                                                                    : "border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46]"
                                                                    }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        );
                                                    })}
                                                    <button
                                                        onClick={() => setProjectTablePage((p) => Math.min(totalPages, p + 1))}
                                                        disabled={safePage === totalPages}
                                                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] disabled:opacity-40 hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46] transition-colors"
                                                    >
                                                        Next ›
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                        </div>

                        {/* ── Portfolio Details ── */}
                        <SectionDivider title="Portfolio Details" />
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[14px] mb-6">
                            {/* Team & Project Mix */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-sky-50 dark:bg-sky-950/20 text-[#0284c7]">
                                            <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                <circle cx="9" cy="7" r="4" />
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                            </svg>
                                        </div>
                                        Team & Project Mix
                                    </div>
                                </div>
                                <div className="p-[18px] px-[22px] pt-2.5">
                                    {[
                                        {
                                            label: "Research Projects",
                                            value: researchProjects,
                                            color: "#2563eb",
                                        },
                                        {
                                            label: "Consultancy Projects",
                                            value: consultancyProjects,
                                            color: "#7c3aed",
                                        },
                                        {
                                            label: "Others Projects",
                                            value: othersProjects,
                                            color: "#f59e0b",
                                        },
                                        {
                                            label: "Ongoing Projects",
                                            value: ongoingProjects,
                                            color: "#059669",
                                        },
                                    ].map((item, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] gap-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-2 -mx-2 rounded transition-colors"
                                            onClick={() => {
                                                if (item.label === "Research Projects") {
                                                    openKpiModalWithTab("total", "Projects: Research Projects", "all");
                                                } else if (item.label === "Consultancy Projects") {
                                                    openKpiModalWithTab("total", "Projects: Consultancy Projects", "all");
                                                } else if (item.label === "Others Projects") {
                                                    openKpiModalWithTab("total", "Projects: Others Projects", "all");
                                                } else if (item.label === "Ongoing Projects") {
                                                    openKpiModalWithTab("ongoing", "Projects: Ongoing Projects", "ongoing");
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-2 w-[140px] shrink-0">
                                                <span
                                                    className="w-2 h-2 rounded-sm shrink-0"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <span className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                    {item.label}
                                                </span>
                                            </div>
                                            <div className="flex-1 h-[3px] bg-[#E4E4E7] dark:bg-[#3F3F46] rounded-full overflow-hidden mx-2">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        backgroundColor: item.color,
                                                        width:
                                                            totalProjects > 0
                                                                ? `${(item.value / totalProjects) * 100}%`
                                                                : "0%",
                                                    }}
                                                />
                                            </div>
                                            <span className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] w-8 text-right">
                                                {isLoading ? "—" : item.value}
                                            </span>
                                        </div>
                                    ))}

                                    {/* <button 
                                        onClick={() => setStaffBreakdownOpen(true)}
                                        className="w-full mt-2 flex items-center justify-between py-2.5 px-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors group"
                                    >
                                        <span className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                            View Active Staff Breakdown
                                        </span>
                                        <span className="text-[11px] font-bold text-[#2563eb] group-hover:text-indigo-600 dark:text-blue-400">
                                            Check All →
                                        </span>
                                    </button> */}
                                </div>
                            </div>

                            {/* Recently Registered */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/20 text-[#d97706]">
                                            <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12 6 12 12 16 14" />
                                            </svg>
                                        </div>
                                        Recently Registered
                                    </div>
                                </div>
                                <div className="p-[18px] px-[22px] pt-2.5">
                                    {isLoading ? (
                                        <div className="py-8 text-center text-[#71717A] text-sm">
                                            Loading...
                                        </div>
                                    ) : recentProjects.length === 0 ? (
                                        <div className="py-8 text-center text-[#71717A] text-sm">
                                            No recent projects.
                                        </div>
                                    ) : (
                                        recentProjects.slice(0, 5).map((proj: any, idx: number) => {
                                            const d = proj.creation
                                                ? new Date(proj.creation)
                                                : null;
                                            const isNew = d
                                                ? Date.now() - d.getTime() < 30 * 24 * 3600 * 1000
                                                : false;
                                            const label = d
                                                ? isNew
                                                    ? "New"
                                                    : d.toLocaleString("en-IN", { month: "short" })
                                                : "—";
                                            return (
                                                <div
                                                    key={proj.project_id || idx}
                                                    className="flex items-center py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 gap-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-2 -mx-2 rounded transition-colors"
                                                    onClick={() => { if (window.getSelection()?.toString()) return; navigate(`/project-details-overview/${proj.name}`, { state: { returnTo: location.pathname + location.search, ...getDashboardState() } }); }}
                                                >
                                                    <div className="text-[11px] font-extrabold text-[#71717A] dark:text-[#A1A1AA] w-5 shrink-0 font-mono">
                                                        {String(idx + 1).padStart(2, "0")}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                                                            {proj.project_title || "Untitled"}
                                                        </div>
                                                        <div className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-[1px]">
                                                            {proj.department
                                                                ? getDeptName(proj.department)
                                                                : "—"}{" "}
                                                            · {proj.pi_name}
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={`text-[11px] font-bold whitespace-nowrap ${isNew ? "text-[#2563eb] dark:text-blue-400" : "text-[#71717A] dark:text-[#A1A1AA]"
                                                            }`}
                                                    >
                                                        {label}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Top Funding Agencies */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-violet-50 dark:bg-violet-950/20 text-[#7c3aed]">
                                            <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                <polyline points="9 22 9 12 15 12 15 22" />
                                            </svg>
                                        </div>
                                        Top Funding Agencies
                                    </div>
                                </div>
                                <div className="p-[18px] px-[22px] pt-2.5">
                                    {isLoading ? (
                                        <div className="py-8 text-center text-[#71717A] text-sm">
                                            Loading...
                                        </div>
                                    ) : pieChartFundingData.length === 0 ? (
                                        <div className="py-8 text-center text-[#71717A] text-sm">
                                            No data available.
                                        </div>
                                    ) : (
                                        pieChartFundingData.map((agency: any, i: number) => {
                                            const totalFundingSourcesCount = pieChartFundingData.reduce((sum: number, d: any) => sum + d.value, 0);
                                            const pct =
                                                totalFundingSourcesCount > 0
                                                    ? Math.round(
                                                        (agency.value / totalFundingSourcesCount) * 100
                                                    )
                                                    : 0;
                                            const color = CHART_COLORS[i] || "#64748b";
                                            return (
                                                <div
                                                    key={i}
                                                    className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-2 -mx-2 rounded transition-colors group"
                                                    onClick={() => {
                                                        const clickedAgency = agency.funding_agency;
                                                        if (clickedAgency === "Others") {
                                                            const excludedAgencies = pieChartFundingData.slice(0, 7).map((d: any) => d.funding_agency);
                                                            setKpiModal({
                                                                type: "total",
                                                                title: `Funding: Others`,
                                                                fundingAgency: "Others",
                                                                excludedFundingAgencies: excludedAgencies
                                                            });
                                                        } else {
                                                            setKpiModal({
                                                                type: "total",
                                                                title: `Funding: ${clickedAgency}`,
                                                                fundingAgency: clickedAgency
                                                            });
                                                        }
                                                        setKpiPage(1);
                                                        setKpiTab("all");
                                                        setKpiStatusFilter("all");
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between py-[9px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                                        <div>
                                                            <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                                {agency.funding_agency}
                                                            </div>
                                                            <div className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                                                {agency.value} projects
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div
                                                                className="text-[13px] font-extrabold"
                                                                style={{ color }}
                                                            >
                                                                {pct}%
                                                            </div>
                                                            <div className="text-[10.5px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                                                of total
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="-mt-1 mb-2">
                                                        <div className="h-1 bg-[#E4E4E7] dark:bg-[#3F3F46] rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all"
                                                                style={{
                                                                    backgroundColor: color,
                                                                    width: `${pct}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === "Department" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[16px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7]">
                                Department Allocations
                            </h2>
                            <div className="relative">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] dark:text-[#A1A1AA]"
                                    size={16}
                                />
                                <input
                                    type="text"
                                    placeholder="Search departments..."
                                    value={deptSearch}
                                    onChange={(e) => setDeptSearch(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] outline-none w-56 transition-all focus:border-[#2563eb] shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA] text-[11px] font-extrabold uppercase tracking-widest border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                            <th className="px-6 py-4">Department Name</th>
                                            <th className="px-6 py-4">Active Projects</th>
                                            <th className="px-6 py-4 text-right">View Data</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                                        {paginatedDepartments && paginatedDepartments.length > 0 ? (
                                            paginatedDepartments.map((dept: any, index: number) => (
                                                <tr
                                                    key={dept.dept_name || index}
                                                    className="hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors group cursor-pointer"
                                                    onClick={() => {
                                                        setExpandedDept(dept.dept_name);
                                                        setDeptModalPage(1);
                                                    }}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3.5">
                                                            <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-[#2563eb] font-bold text-[14px] border border-blue-100 dark:border-blue-800 shrink-0">
                                                                <Building2 size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight group-hover:text-[#2563eb] transition-colors">
                                                                    {dept.dept_name}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                            {dept.project_count}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedDept(dept.dept_name);
                                                                setDeptModalPage(1);
                                                            }}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#A1A1AA] hover:text-[#2563eb] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                                        >
                                                            <ArrowRight
                                                                size={16}
                                                                className="group-hover:translate-x-0.5 transition-transform"
                                                            />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="px-6 py-20 text-center text-[#71717A] dark:text-[#A1A1AA] text-[13px]"
                                                >
                                                    {deptSearch
                                                        ? "No matching departments found."
                                                        : "No departments found."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {filteredDepartments.length > 0 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                    <span className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                                        Showing {(deptPage - 1) * PAGE_SIZE + 1} to{" "}
                                        {Math.min(deptPage * PAGE_SIZE, filteredDepartments.length)}{" "}
                                        of {filteredDepartments.length} entries
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            disabled={deptPage === 1}
                                            onClick={() => setDeptPage((p) => p - 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] disabled:opacity-50 transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-[12px] font-semibold px-2 text-[#3F3F46] dark:text-[#E4E4E7]">
                                            Page {deptPage} of {deptTotalPages}
                                        </span>
                                        <button
                                            disabled={deptPage === deptTotalPages}
                                            onClick={() => setDeptPage((p) => p + 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] disabled:opacity-50 transition-colors"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {viewMode === "PI" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
                        <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-[16px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7]">
                                        Investigator Workloads
                                    </h2>
                                    {piFundingFilter !== "all" && (
                                        <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                                            Filtered by:{" "}
                                            <span className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{piFundingFilter}</span>
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Search
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] dark:text-[#A1A1AA]"
                                            size={16}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Search PIs..."
                                            value={piSearch}
                                            onChange={(e) => setPiSearch(e.target.value)}
                                            className="pl-9 pr-4 py-2 bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] outline-none w-56 transition-all focus:border-[#2563eb]"
                                        />
                                    </div>

                                    {/* ── Fund Filter Button + Dropdown ── */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowFundingFilterDropdown((v) => !v)}
                                            className={`inline-flex items-center gap-2 px-4 py-2 text-[13px] border rounded-xl font-bold transition-all shadow-sm ${piFundingFilter !== "all"
                                                ? "border-[#2563eb] bg-blue-50 dark:bg-blue-950/30 text-[#2563eb]"
                                                : "border-[#E4E4E7] dark:border-[#3F3F46] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA]"
                                                }`}
                                        >
                                            <Filter size={16} />
                                            Filter
                                            {piFundingFilter !== "all" && (
                                                <span
                                                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#2563eb] text-white text-[9px] font-extrabold leading-none ml-0.5 cursor-pointer hover:bg-red-500 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPiFundingFilter("all");
                                                        setShowFundingFilterDropdown(false);
                                                    }}
                                                    title="Clear filter"
                                                >
                                                    ×
                                                </span>
                                            )}
                                        </button>

                                        {showFundingFilterDropdown && (
                                            <>
                                                {/* backdrop to close */}
                                                <div
                                                    className="fixed inset-0 z-[990]"
                                                    onClick={() => setShowFundingFilterDropdown(false)}
                                                />
                                                <div className="absolute right-0 top-[calc(100%+6px)] z-[999] bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl shadow-xl w-64 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                                    {/* Header */}
                                                    <div className="px-4 py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                                                        <span className="text-[11px] font-extrabold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest">Filter by Fund</span>
                                                        {piFundingFilter !== "all" && (
                                                            <button
                                                                onClick={() => {
                                                                    setPiFundingFilter("all");
                                                                    setShowFundingFilterDropdown(false);
                                                                }}
                                                                className="text-[11px] font-semibold text-[#2563eb] hover:underline"
                                                            >
                                                                Clear
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* All option */}
                                                    <button
                                                        onClick={() => {
                                                            setPiFundingFilter("all");
                                                            setShowFundingFilterDropdown(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${piFundingFilter === "all"
                                                            ? "bg-blue-50 dark:bg-blue-950/30"
                                                            : "hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]"
                                                            }`}
                                                    >
                                                        <span className="w-2.5 h-2.5 rounded-sm shrink-0 bg-[#71717A]" />
                                                        <span className="flex-1 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate">All Funds</span>
                                                        {piFundingFilter === "all" && (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                        )}
                                                    </button>

                                                    {/* Fund agency options — built from allProjectsList for consistency */}
                                                    <div className="max-h-56 overflow-y-auto">
                                                        {piWorkloadAgencies.map((agency, i) => {
                                                            const color = CHART_COLORS[i % CHART_COLORS.length] || "#64748b";
                                                            const isActive = piFundingFilter === agency.agency_name;
                                                            return (
                                                                <button
                                                                    key={agency.agency_name}
                                                                    onClick={() => {
                                                                        setPiFundingFilter(agency.agency_name);
                                                                        setShowFundingFilterDropdown(false);
                                                                    }}
                                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive
                                                                        ? "bg-blue-50 dark:bg-blue-950/30"
                                                                        : "hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]"
                                                                        }`}
                                                                >
                                                                    <span
                                                                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                                                                        style={{ backgroundColor: color }}
                                                                    />
                                                                    <span className="flex-1 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate" title={agency.agency_name}>
                                                                        {agency.agency_name}
                                                                    </span>
                                                                    <span className="text-[11px] font-extrabold text-[#71717A] dark:text-[#A1A1AA]">
                                                                        {agency.project_count}
                                                                    </span>
                                                                    {isActive && (
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                                    )}
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
                                        {paginatedPIs && paginatedPIs.length > 0 ? (
                                            paginatedPIs.map((pi: any, index: number) => (
                                                <tr
                                                    key={pi.user_email || index}
                                                    className="hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors group cursor-pointer"
                                                    onClick={() => { setExpandedPI(pi.user_email); setPiModalPage(1); }}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3.5">
                                                            <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-[#4f46e5] font-bold text-[14px] border border-indigo-100 dark:border-indigo-800 shrink-0">
                                                                {pi.user_name
                                                                    ? pi.user_name.charAt(0).toUpperCase()
                                                                    : "U"}
                                                            </div>
                                                            <div>
                                                                <p className="text-[14px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight group-hover:text-[#4f46e5] transition-colors">
                                                                    {pi.user_name || "Unknown PI"}
                                                                </p>
                                                                <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                                                                    {pi.user_email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5 inline-flex bg-[#FAFAF9] dark:bg-[#18181B] px-3 py-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                            <span className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                                {pi.project_count}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedPI(pi.user_email);
                                                                setPiModalPage(1);
                                                            }}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#A1A1AA] hover:text-[#4f46e5] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all border border-transparent shadow-sm"
                                                        >
                                                            <ArrowRight
                                                                size={16}
                                                                className="group-hover:translate-x-0.5 transition-transform"
                                                            />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="px-6 py-16 text-center text-[#71717A] font-medium"
                                                >
                                                    {piFundingFilter !== "all"
                                                        ? `No investigators found for "${piFundingFilter}"${piSearch ? " matching your search" : ""}.`
                                                        : piSearch
                                                            ? "No matching investigators found."
                                                            : "No Investigators found."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {filteredPIs.length > 0 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                    <span className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                                        Showing {(piPage - 1) * PAGE_SIZE + 1} to{" "}
                                        {Math.min(piPage * PAGE_SIZE, filteredPIs.length)} of{" "}
                                        {filteredPIs.length} entries
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            disabled={piPage === 1}
                                            onClick={() => setPiPage((p) => p - 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] disabled:opacity-50 transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-[12px] font-semibold px-2 text-[#3F3F46] dark:text-[#E4E4E7]">
                                            Page {piPage} of {piTotalPages}
                                        </span>
                                        <button
                                            disabled={piPage === piTotalPages}
                                            onClick={() => setPiPage((p) => p + 1)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] disabled:opacity-50 transition-colors"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Footer ── */}
                <footer className="flex items-center justify-between pt-5 border-t border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] text-[11px] font-semibold tracking-widest uppercase">
                    <span>© 2026 R&D Operations · IIT Guwahati · Internal Use Only</span>
                    <a
                        href="mailto:ernd@iitg.ac.in"
                        className="text-[#D97757] hover:underline normal-case font-semibold text-[11px] tracking-normal"
                    >
                        ernd@iitg.ac.in
                    </a>
                </footer>
            </div>

            {/* ── Modal: Department Details ── */}
            {expandedDept && selectedDeptDetails && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0"
                        onClick={() => setExpandedDept(null)}
                    />
                    <div className="relative bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                        <div className="px-6 py-5 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between sticky top-0 bg-white dark:bg-[#18181B] rounded-t-2xl z-10">
                            <div>
                                <h2 className="text-[18px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7]">
                                    {getDeptName(selectedDeptDetails.dept_name)}
                                </h2>
                                <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                                    {selectedDeptDetails.investigators?.length || 0} Principal
                                    Investigators
                                </p>
                            </div>
                            <button
                                onClick={() => setExpandedDept(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717A] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto px-6 py-4 bg-slate-50/50 dark:bg-slate-900/20 custom-scrollbar flex-1">
                            {selectedDeptDetails.investigators &&
                                selectedDeptDetails.investigators.length > 0 ? (
                                (() => {
                                    const devTotalPages = Math.ceil(
                                        selectedDeptDetails.investigators.length /
                                        DEPT_MODAL_PAGE_SIZE
                                    );
                                    const pagedInvestigators =
                                        selectedDeptDetails.investigators.slice(
                                            (deptModalPage - 1) * DEPT_MODAL_PAGE_SIZE,
                                            deptModalPage * DEPT_MODAL_PAGE_SIZE
                                        );
                                    return (
                                        <>
                                            <div className="space-y-3">
                                                {pagedInvestigators.map((inv: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => {
                                                            setExpandedPI(inv.user_email);
                                                            setPiModalPage(1);
                                                        }}
                                                        className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-900/30 flex items-center justify-center text-[#4f46e5] dark:text-indigo-400 font-extrabold text-[14px] border border-indigo-100/50 dark:border-indigo-800/50 shrink-0 shadow-sm">
                                                                {inv.user_name
                                                                    ? inv.user_name.charAt(0).toUpperCase()
                                                                    : "U"}
                                                            </div>
                                                            <div>
                                                                <div className="text-[14px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight mb-1">
                                                                    {inv.user_name}
                                                                </div>
                                                                <div className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1.5">
                                                                    <svg
                                                                        className="w-3.5 h-3.5"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <rect
                                                                            width="20"
                                                                            height="16"
                                                                            x="2"
                                                                            y="4"
                                                                            rx="2"
                                                                        />
                                                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                                    </svg>
                                                                    {inv.user_email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="inline-flex items-center gap-1.5 bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-[#2563eb] dark:hover:text-blue-400 px-3 py-1.5 rounded-lg shadow-sm text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] transition-all">
                                                            <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
                                                            {inv.project_count}{" "}
                                                            {inv.project_count === 1 ? "Project" : "Projects"}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {selectedDeptDetails.investigators.length >
                                                DEPT_MODAL_PAGE_SIZE && (
                                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                                        <button
                                                            disabled={deptModalPage === 1}
                                                            onClick={() =>
                                                                setDeptModalPage((p) => Math.max(1, p - 1))
                                                            }
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                        >
                                                            <svg
                                                                className="w-3.5 h-3.5"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path d="M15 18l-6-6 6-6" />
                                                            </svg>
                                                            Prev
                                                        </button>
                                                        <span className="text-[11px] font-semibold text-[#A1A1AA]">
                                                            Page {deptModalPage} of {devTotalPages}
                                                        </span>
                                                        <button
                                                            disabled={deptModalPage === devTotalPages}
                                                            onClick={() =>
                                                                setDeptModalPage((p) =>
                                                                    Math.min(devTotalPages, p + 1)
                                                                )
                                                            }
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] bg-white dark:bg-[#27272A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                        >
                                                            Next
                                                            <svg
                                                                className="w-3.5 h-3.5"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path d="M9 18l6-6-6-6" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                        </>
                                    );
                                })()
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                        <Users className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                        No specific investigators detailed.
                                    </p>
                                    <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-1.5 max-w-xs leading-relaxed">
                                        Project counts are aggregated internally but PI mappings are
                                        currently unavailable for this department.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: PI Details ── */}
            {expandedPI && selectedPIDetails && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0"
                        onClick={() => setExpandedPI(null)}
                    />
                    <div className="relative bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-2xl w-full max-w-[1200px] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                        <div className="px-5 pt-5 pb-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-start justify-between relative bg-white dark:bg-[#18181B] rounded-t-2xl z-10 overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-14 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 dark:from-indigo-500/20 dark:to-blue-500/20 z-0" />
                            <div className="flex items-center gap-4 relative z-10 pt-4">
                                <div className="w-14 h-14 rounded-full bg-white dark:bg-[#27272A] flex items-center justify-center text-[#4f46e5] font-extrabold text-[20px] border border-indigo-100 dark:border-indigo-800 shadow-md ring-4 ring-white dark:ring-[#18181B]">
                                    {selectedPIDetails.user_name
                                        ? selectedPIDetails.user_name.charAt(0).toUpperCase()
                                        : "U"}
                                </div>
                                <div>
                                    <h2 className="text-[18px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                        {selectedPIDetails.user_name}
                                    </h2>
                                    <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1.5 mt-0.5">
                                        <svg
                                            className="w-3.5 h-3.5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            viewBox="0 0 24 24"
                                        >
                                            <rect width="20" height="16" x="2" y="4" rx="2" />
                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                        </svg>
                                        {selectedPIDetails.user_email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setExpandedPI(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717A] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10 relative"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-5 bg-slate-50/50 dark:bg-slate-900/20 overflow-y-auto flex-1 min-h-0">
                            <PIStatCards piDetails={selectedPIDetails} projects={selectedPIProjects} getSanctionedAmount={getSanctionedAmount} />

                            <div>
                                <h3 className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] mb-3 uppercase tracking-widest flex items-center gap-2">
                                    <Building2 size={14} className="text-[#A1A1AA]" />
                                    Department Affiliations
                                </h3>
                                {selectedPIDetails.departments &&
                                    selectedPIDetails.departments.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {selectedPIDetails.departments.map(
                                            (dept: string, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg p-3 flex items-center justify-between text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] shadow-sm"
                                                >
                                                    {getDeptName(dept)}
                                                </div>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg p-4 text-center text-[#71717A] text-[12px]">
                                        No specific departmental affiliations found in recent
                                        records.
                                    </div>
                                )}
                            </div>

                            {selectedPIProjects.length > 0 &&
                                (() => {
                                    const pagedProjects = selectedPIProjects.slice(
                                        (piModalPage - 1) * PI_PROJECTS_PAGE_SIZE,
                                        piModalPage * PI_PROJECTS_PAGE_SIZE
                                    );
                                    return (
                                        <div className="mt-5">
                                            <h3 className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] mb-3 uppercase tracking-widest flex items-center gap-2">
                                                <svg
                                                    className="w-3.5 h-3.5 text-[#A1A1AA]"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <rect x="3" y="4" width="18" height="18" rx="2" />
                                                    <line x1="16" y1="2" x2="16" y2="6" />
                                                    <line x1="8" y1="2" x2="8" y2="6" />
                                                    <line x1="3" y1="10" x2="21" y2="10" />
                                                </svg>
                                                Project Timeline
                                                <span className="ml-auto text-[11px] font-semibold text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2 py-0.5 rounded-full normal-case tracking-normal">
                                                    {selectedPIProjects.length} project
                                                    {selectedPIProjects.length !== 1 ? "s" : ""}
                                                </span>
                                            </h3>
                                            <div className="flex flex-col gap-3">
                                                {pagedProjects.map((proj: any, idx: number) => {
                                                    const globalIdx =
                                                        (piModalPage - 1) * PI_PROJECTS_PAGE_SIZE + idx;
                                                    const startDate = proj.prj_start_date
                                                        ? new Date(proj.prj_start_date)
                                                        : null;
                                                    const endDate = proj.prj_end_date
                                                        ? new Date(proj.prj_end_date)
                                                        : null;
                                                    const totalMonths =
                                                        startDate && endDate
                                                            ? Math.max(
                                                                0,
                                                                Math.round(
                                                                    (endDate.getTime() -
                                                                        startDate.getTime()) /
                                                                    (1000 * 60 * 60 * 24 * 30.44)
                                                                )
                                                            )
                                                            : null;
                                                    const now = new Date();
                                                    const isActive =
                                                        startDate &&
                                                        endDate &&
                                                        now >= startDate &&
                                                        now <= endDate;
                                                    const isCompleted = endDate && now > endDate;
                                                    const formatDate = (d: Date | null) =>
                                                        d
                                                            ? d.toLocaleDateString("en-IN", {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric",
                                                            })
                                                            : "—";
                                                    const progressPct =
                                                        startDate && endDate && now > startDate
                                                            ? Math.min(
                                                                100,
                                                                Math.round(
                                                                    ((now.getTime() - startDate.getTime()) /
                                                                        (endDate.getTime() -
                                                                            startDate.getTime())) *
                                                                    100
                                                                )
                                                            )
                                                            : 0;
                                                    const startYear = startDate
                                                        ? startDate.getFullYear()
                                                        : null;
                                                    const endYear = endDate
                                                        ? endDate.getFullYear()
                                                        : null;
                                                    const yearRange =
                                                        startYear && endYear
                                                            ? startYear === endYear
                                                                ? `${startYear}`
                                                                : `${startYear} – ${endYear}`
                                                            : "—";
                                                    return (
                                                        <div
                                                            key={proj.name}
                                                            className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl p-4 shadow-sm"
                                                        >
                                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-snug line-clamp-2">
                                                                        {proj.project_title || proj.name}
                                                                    </div>
                                                                    {proj.project_no && (
                                                                        <div className="text-[11px] font-mono font-semibold text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                                                                            {proj.project_no}
                                                                        </div>
                                                                    )}
                                                                    {(() => {
                                                                        const fund = getSanctionedAmount(proj);
                                                                        if (!fund) return null;
                                                                        const formattedFund = fund >= 10000000
                                                                            ? `₹${(fund / 10000000).toFixed(2)} Cr`
                                                                            : fund >= 100000
                                                                                ? `₹${(fund / 100000).toFixed(2)} L`
                                                                                : `₹${fund.toLocaleString("en-IN")}`;
                                                                        return (
                                                                            <div className="text-[11px] font-extrabold mt-1 text-[#3F3F46] dark:text-[#E4E4E7]">
                                                                                {formattedFund}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                                    <ProjectFundStatusBadge projectName={proj.name} />
                                                                    <button
                                                                        onClick={() => { if (window.getSelection()?.toString()) return; navigate(`/project-details-overview/${proj.name}`, { state: { returnTo: location.pathname + location.search, ...getDashboardState() } }); }}
                                                                        className="text-[11px] font-semibold text-[#D97757] hover:text-[#c26245] flex items-center gap-1 group transition-colors"
                                                                    >
                                                                        View Project
                                                                        <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5 text-center flex flex-col justify-center">
                                                                    <div className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">
                                                                        Sanction Amount
                                                                    </div>
                                                                    <div className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                                                        <ProjectSanctionAmountLive proj={proj} bulkAmount={getSanctionedAmount(proj)} />
                                                                    </div>
                                                                </div>
                                                                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5 text-center flex flex-col justify-center">
                                                                    <div className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">
                                                                        Funding Agency
                                                                    </div>
                                                                    {proj.select_funding_agency === "Other" ? (
                                                                        <div
                                                                            className="text-[11px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-2"
                                                                            title={proj.funding_agency_other}
                                                                        >
                                                                            {proj.funding_agency_other}
                                                                        </div>
                                                                    ) : (
                                                                        <FundingAgencyNameDisplay
                                                                            agencyId={proj.funding_agen}
                                                                            fallbackText={proj.select_funding_agency || proj["funding_agen.funding_agency_name"] || proj.funding_agency_schemes || proj.scheme_name}
                                                                            fundingAgencyMap={fundingAgencyMap}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {startDate &&
                                                                endDate &&
                                                                (isActive || isCompleted) && (
                                                                    <div>
                                                                        {(() => {
                                                                            const progressColor =
                                                                                isCompleted
                                                                                    ? "#A1A1AA"
                                                                                    : progressPct >= 80
                                                                                        ? "#EF4444"
                                                                                        : progressPct >= 60
                                                                                            ? "#FB923C"
                                                                                            : progressPct >= 40
                                                                                                ? "#FACC15"
                                                                                                : "#22C55E";
                                                                            return (
                                                                                <>
                                                                                    <div className="flex justify-between items-center mb-1">
                                                                                        <span
                                                                                            className="text-[11px] font-bold"
                                                                                            style={{ color: progressColor }}
                                                                                        >
                                                                                            {progressPct}% complete
                                                                                        </span>
                                                                                        <span className="text-[11px] font-semibold text-[#A1A1AA]">
                                                                                            {isCompleted
                                                                                                ? "Finished"
                                                                                                : `${Math.max(
                                                                                                    0,
                                                                                                    Math.round(
                                                                                                        (endDate.getTime() -
                                                                                                            now.getTime()) /
                                                                                                        (1000 * 60 * 60 * 24 * 30.44)
                                                                                                    )
                                                                                                )}mo left`}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="h-1.5 bg-[#F4F4F5] dark:bg-[#3F3F46] rounded-full overflow-hidden">
                                                                                        <div
                                                                                            className="h-full rounded-full transition-all"
                                                                                            style={{
                                                                                                width: `${progressPct}%`,
                                                                                                backgroundColor: progressColor,
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                        </div>

                        {/* ── Fixed Footer for Pagination ── */}
                        {(() => {
                            const piProjectTotalPages = Math.ceil(
                                selectedPIProjects.length / PI_PROJECTS_PAGE_SIZE
                            );
                            if (piProjectTotalPages <= 1) return null;
                            return (
                                <div className="p-4 border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] rounded-b-2xl shrink-0 flex items-center justify-between">
                                    <button
                                        disabled={piModalPage === 1}
                                        onClick={() =>
                                            setPiModalPage((p) => Math.max(1, p - 1))
                                        }
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <svg
                                            className="w-3.5 h-3.5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M15 18l-6-6 6-6" />
                                        </svg>
                                        Prev
                                    </button>
                                    <span className="text-[11px] font-semibold text-[#A1A1AA]">
                                        Page {piModalPage} of {piProjectTotalPages}
                                    </span>
                                    <button
                                        disabled={piModalPage === piProjectTotalPages}
                                        onClick={() =>
                                            setPiModalPage((p) =>
                                                Math.min(piProjectTotalPages, p + 1)
                                            )
                                        }
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        Next
                                        <svg
                                            className="w-3.5 h-3.5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* ── Modal: KPI ── */}
            {kpiModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{
                        backdropFilter: "blur(6px)",
                        WebkitBackdropFilter: "blur(6px)",
                        backgroundColor: "rgba(0,0,0,0.45)",
                    }}
                    onClick={closeKpiModal}
                >
                    <div
                        className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl border border-[#E4E4E7] dark:border-[#3F3F46] w-[95vw] max-w-[1400px] max-h-[96vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46] shrink-0">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] mb-0.5">
                                    Projects
                                </p>
                                <h2 className="text-[16px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight flex items-center gap-2">
                                    {kpiModal.title}
                                    {isSyncingFunds && (
                                        <span
                                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full animate-pulse whitespace-nowrap"
                                            title="Fund-received status is still syncing in the background — Active/Fund Pending badges may still change. Export/Print are disabled until this finishes so they capture the final data."
                                        >
                                            Syncing fund status…
                                        </span>
                                    )}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    disabled={isSyncingFunds}
                                    title={isSyncingFunds ? "Waiting for fund status to finish syncing…" : "Export to Excel / CSV"}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isSyncingFunds || !kpiModalRows || kpiModalRows.length === 0) return;
                                        const csvContent = [
                                            ["Sl.", "Project No", "Project Title", "PI Name", "PI Email", "Department", "Project Type", "Funding Agency", "Scheme", "Total Budget", "Start Date", "Category", "Status"],
                                            ...kpiModalRows.map((p, idx) => {
                                                const d = getEffectiveStartDate(p);
                                                const isOld = p.is_old_project === 1 || p.is_old_project === true || (d && new Date(d).getFullYear() < 2026);
                                                return [
                                                    (idx + 1).toString(),
                                                    p.project_no || "",
                                                    `"${(p.project_title || "").replace(/"/g, '""')}"`,
                                                    `"${((p.principal_investigator_name || (p.pi_webmail ? (emailToNameMap[p.pi_webmail.toLowerCase().trim()] || p.pi_webmail) : "")) || "").replace(/"/g, '""')}"`,
                                                    `"${(p.pi_webmail || "").replace(/"/g, '""')}"`,
                                                    `"${(getDeptName(p.implementation_department || p.user_department) || p.dept_name || "").replace(/"/g, '""')}"`,
                                                    p.project_type || "",
                                                    `"${resolveAgencyName(p).replace(/"/g, '""')}"`,
                                                    `"${normalizeSchemeName(p.funding_agency_schemes || p.scheme_name || "")}"`,
                                                    getSanctionedAmount(p),
                                                    d ? (typeof d === 'string' ? d.split(' ')[0] : new Date(d).toISOString().split('T')[0]) : "",
                                                    isOld ? "Old" : "New",
                                                    `"${getProjectStatusLabel(p)}"`
                                                ];
                                            })
                                        ].map(e => e.join(",")).join("\n");

                                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement("a");
                                        link.setAttribute("href", url);
                                        link.setAttribute("download", `${kpiModal?.title ? kpiModal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'projects'}.csv`);
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-50 dark:disabled:hover:bg-emerald-500/10"
                                >
                                    <FileDown size={14} />
                                    <span className="hidden sm:inline">Export</span>
                                </button>
                                <button
                                    disabled={isSyncingFunds}
                                    title={isSyncingFunds ? "Waiting for fund status to finish syncing…" : "Print as PDF (Landscape)"}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isSyncingFunds) return;
                                        if (!kpiModalRows || kpiModalRows.length === 0) return;

                                        const html = `
                                            <!DOCTYPE html>
                                            <html>
                                            <head>
                                                <title>${kpiModal.title || "Projects"}</title>
                                                <style>
                                                    @page { size: A4 landscape; margin: 10mm; }
                                                    body { font-family: -apple-system, sans-serif; font-size: 9pt; padding: 20px; }
                                                    h2 { margin-top: 0; font-size: 14pt; }
                                                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                                                    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
                                                    th { background: #f8fafc; font-weight: bold; }
                                                </style>
                                            </head>
                                            <body>
                                                <h2>${kpiModal.title || "Projects"}</h2>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Sl.</th>
                                                            <th>Project No</th>
                                                            <th>Project Title</th>
                                                            <th>PI Name</th>
                                                            <th>PI Email</th>
                                                            <th>Department</th>
                                                            <th>Type</th>
                                                            <th>Funding Agency</th>
                                                            <th>Start Date</th>
                                                            <th>Category</th>
                                                            <th style="text-align: right;">Total Budget</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${kpiModalRows.map((p: any, idx: number) => {
                                            const d = getEffectiveStartDate(p);
                                            const isOld = p.is_old_project === 1 || p.is_old_project === true || (d && new Date(d).getFullYear() < 2026);
                                            const cat = isOld ? "Old" : "New";
                                            const pi = p.pi_webmail ? emailToNameMap[p.pi_webmail.toLowerCase().trim()] || p.pi_webmail : "";
                                            const dept = getDeptName(p.implementation_department || p.user_department) || p.dept_name || "";
                                            const sDate = d ? (typeof d === 'string' ? d.split(' ')[0] : new Date(d).toISOString().split('T')[0]) : "";
                                            const projNoStr = p.project_no || "";
                                            const sanctioned = getSanctionedAmount(p);
                                            const budgetStr = sanctioned > 0 ? "Rs. " + sanctioned : "0";
                                            const agency = resolveAgencyName(p);
                                            const scheme = normalizeSchemeName(p.funding_agency_schemes || p.scheme_name || "");
                                            const status = getProjectStatusLabel(p);
                                            return `
                                                                <tr>
                                                                    <td>${idx + 1}</td>
                                                                    <td>${projNoStr}</td>
                                                                    <td>${p.project_title || ""}</td>
                                                                    <td>${pi}</td>
                                                                    <td>${p.pi_webmail || ""}</td>
                                                                    <td>${dept}</td>
                                                                    <td>${p.project_type || ""}</td>
                                                                    <td>
                                                                        <div style="font-weight: bold;">${agency}</div>
                                                                        ${scheme ? `<div style="font-size: 8pt; color: #2563eb; margin-top: 2px;">${scheme}</div>` : ""}
                                                                    </td>
                                                                    <td>${sDate}</td>
                                                                    <td>${cat}</td>
                                                                    <td style="text-align: right;">${budgetStr}</td>
                                                                    <td>${status}</td>
                                                                </tr>
                                                            `;
                                        }).join('')}
                                                    </tbody>
                                                </table>
                                                <script>
                                                    window.onload = function() { window.print(); window.close(); }
                                                </script>
                                            </body>
                                            </html>
                                        `;
                                        const win = window.open("", "_blank");
                                        if (win) {
                                            win.document.open();
                                            win.document.write(html);
                                            win.document.close();
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-50 dark:disabled:hover:bg-blue-500/10"
                                >
                                    <Printer size={14} />
                                    <span className="hidden sm:inline">Print</span>
                                </button>
                                <button
                                    onClick={closeKpiModal}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {kpiModal.type === "total" || kpiModal.type === "ongoing" || kpiModal.type === "allocation" ? (
                            <div className="flex flex-col gap-3 px-6 pt-4 pb-0 shrink-0 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <select
                                            value={kpiModal.type === "ongoing" ? "ongoing" : kpiStatusFilter}
                                            disabled={kpiModal.type === "ongoing"}
                                            onChange={(e) => {
                                                setKpiStatusFilter(e.target.value);
                                                setKpiPage(1);
                                            }}
                                            className="bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] font-bold px-3 py-1.5 rounded-lg text-[#3F3F46] dark:text-[#E4E4E7] outline-none shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="ongoing">Ongoing (Active)</option>
                                            <option value="submitted">Submitted (Inactive)</option>
                                            <option value="pending_fund">— Fund Received Pending</option>
                                            <option value="approved_sanction">— Approved Sanction</option>
                                            <option value="pending_sanction">— Pending Sanction</option>
                                        </select>
                                        <select
                                            value={kpiAgeFilter}
                                            onChange={(e) => {
                                                setKpiAgeFilter(e.target.value);
                                                setKpiPage(1);
                                            }}
                                            className="bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] font-bold px-3 py-1.5 rounded-lg text-[#3F3F46] dark:text-[#E4E4E7] outline-none shadow-sm cursor-pointer"
                                        >
                                            <option value="all">Old & New</option>
                                            <option value="new">New Projects</option>
                                            <option value="old">Old Projects</option>
                                        </select>
                                        {kpiAvailableSchemes.length > 0 && (
                                            <div className="relative" ref={kpiSchemeDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsKpiSchemeDropdownOpen(!isKpiSchemeDropdownOpen)}
                                                    className="bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] font-bold px-3 py-1.5 rounded-lg text-[#3F3F46] dark:text-[#E4E4E7] outline-none shadow-sm cursor-pointer max-w-[150px] truncate pr-8 relative text-left"
                                                >
                                                    {kpiSchemeFilter.length === 0
                                                        ? "All Schemes"
                                                        : kpiSchemeFilter.length === 1
                                                            ? kpiSchemeFilter[0]
                                                            : `${kpiSchemeFilter.length} schemes`}
                                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" size={14} />
                                                </button>
                                                {isKpiSchemeDropdownOpen && (
                                                    <div className="absolute z-50 left-0 min-w-[200px] mt-1 bg-white dark:bg-[#18181B] border border-gray-300 dark:border-[#3F3F46] rounded shadow-md max-h-[300px] overflow-y-auto py-1">
                                                        <label className="flex items-center px-2 py-1.5 hover:bg-[#e5e5e5] dark:hover:bg-[#3F3F46] cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={kpiSchemeFilter.length === 0}
                                                                onChange={() => {
                                                                    setKpiSchemeFilter([]);
                                                                    setKpiPage(1);
                                                                }}
                                                                className="w-3.5 h-3.5 rounded-sm border-gray-300 text-[#2563eb] focus:ring-0 accent-[#2563eb] cursor-pointer"
                                                            />
                                                            <span className="ml-2.5 text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">All Schemes</span>
                                                        </label>
                                                        {kpiAvailableSchemes.map((scheme) => (
                                                            <label key={scheme} className="flex items-start px-2 py-1.5 hover:bg-[#e5e5e5] dark:hover:bg-[#3F3F46] cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={kpiSchemeFilter.includes(scheme)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setKpiSchemeFilter([...kpiSchemeFilter, scheme]);
                                                                        } else {
                                                                            setKpiSchemeFilter(kpiSchemeFilter.filter(s => s !== scheme));
                                                                        }
                                                                        setKpiPage(1);
                                                                    }}
                                                                    className="w-3.5 h-3.5 mt-0.5 rounded-sm border-gray-300 text-[#2563eb] focus:ring-0 accent-[#2563eb] cursor-pointer shrink-0"
                                                                />
                                                                <span className="ml-2.5 text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">{scheme}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* Search Input */}
                                        <div className="relative min-w-[200px] sm:min-w-[280px]">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-400 dark:text-zinc-500">
                                                <Search className="w-3.5 h-3.5" />
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="Search project title, no, PI, dept..."
                                                value={kpiSearchText}
                                                onChange={(e) => {
                                                    setKpiSearchText(e.target.value);
                                                    setKpiPage(1);
                                                }}
                                                className="w-full text-[11px] font-bold pl-8 pr-8 py-1.5 bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg outline-none focus:border-[#2563eb] text-[#3F3F46] dark:text-[#E4E4E7] placeholder-zinc-400 transition-colors shadow-sm"
                                            />
                                            {kpiSearchText && (
                                                <button
                                                    onClick={() => {
                                                        setKpiSearchText("");
                                                        setKpiPage(1);
                                                    }}
                                                    className="absolute inset-y-0 right-0 flex items-center pr-2 text-[#71717A] hover:text-black dark:hover:text-white"
                                                    type="button"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {!kpiModal.projectType && (
                                    <div className="flex items-center gap-1 overflow-x-auto">
                                        {(
                                            [
                                                {
                                                    key: "all",
                                                    // Not literally every project — matches total_projects (submitted +
                                                    // ongoing) per DASHBOARD_API_DOCUMENTATION.md, further narrowed by
                                                    // the Status dropdown above. Label tracks that dropdown so it never
                                                    // says "Submitted & Ongoing" while actually showing just one of them.
                                                    label: kpiStatusFilter === "active" ? "Active"
                                                        : kpiStatusFilter === "ongoing" ? "Ongoing"
                                                        : kpiStatusFilter === "submitted" ? "Submitted"
                                                        : kpiStatusFilter === "pending_fund" ? "Fund Received Pending"
                                                        : kpiStatusFilter === "approved_sanction" ? "Approved Sanction"
                                                        : kpiStatusFilter === "pending_sanction" ? "Pending Sanction"
                                                        : "Submitted & Ongoing",
                                                    count: getDynamicTabCount("all"),
                                                    activeClass: "border-slate-500 text-slate-700 dark:text-slate-400",
                                                },
                                                {
                                                    key: "valid",
                                                    label: "Valid Projects",
                                                    count: getDynamicTabCount("valid"),
                                                    activeClass: "border-indigo-500 text-indigo-700 dark:text-indigo-400",
                                                },
                                                {
                                                    key: "research",
                                                    label: "Research",
                                                    count: getDynamicTabCount("research"),
                                                    activeClass: "border-blue-500 text-blue-700 dark:text-blue-400",
                                                },
                                                {
                                                    key: "consultancy",
                                                    label: "Consultancy",
                                                    count: getDynamicTabCount("consultancy"),
                                                    activeClass: "border-purple-500 text-purple-700 dark:text-purple-400",
                                                },
                                                ...(othersProjects > 0 ? [{
                                                    key: "others",
                                                    label: "Others",
                                                    count: getDynamicTabCount("others"),
                                                    activeClass: "border-emerald-500 text-emerald-700 dark:text-emerald-400",
                                                }] : []),
                                                ...(getDynamicTabCount("missing_budget") > 0 ? [{
                                                    key: "missing_budget",
                                                    label: "Missing Budget",
                                                    count: getDynamicTabCount("missing_budget"),
                                                    activeClass: "border-rose-500 text-rose-700 dark:text-rose-400",
                                                }] : []),
                                                ...(getDynamicTabCount("missing_no") > 0 ? [{
                                                    key: "missing_no",
                                                    label: "Missing Project No",
                                                    count: getDynamicTabCount("missing_no"),
                                                    activeClass: "border-orange-500 text-orange-700 dark:text-orange-400",
                                                }] : []),
                                                ...(getDynamicTabCount("missing_agency") > 0 ? [{
                                                    key: "missing_agency",
                                                    label: "Missing Funding Agency",
                                                    count: getDynamicTabCount("missing_agency"),
                                                    activeClass: "border-amber-500 text-amber-700 dark:text-amber-400",
                                                }] : []),
                                            ] as const
                                        ).map((tab) => (
                                            <button
                                                key={tab.key}
                                                onClick={() => {
                                                    setKpiTab(tab.key);
                                                    setKpiPage(1);
                                                }}
                                                className={`flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-[11px] font-bold border-b-2 transition-colors whitespace-nowrap ${kpiTab === tab.key
                                                    ? tab.activeClass + " border-current"
                                                    : "border-transparent text-[#71717A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]"
                                                    }`}
                                            >
                                                {tab.label}
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#F4F4F5] dark:bg-[#3F3F46] text-[#71717A]">
                                                    {tab.count}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : null}

                        <div className="overflow-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#FAFAF9] dark:bg-[#18181B] sticky top-0">
                                        {["#", "Project", "PI", "Dept", "Status", "Budget"].map(
                                            (h) => (
                                                <th
                                                    key={h}
                                                    className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#71717A]${h === "Budget" ? " text-right" : ""
                                                        }`}
                                                >
                                                    {h === "Budget" && kpiModal.title === "Projects: Utilized" ? "Utilized" :
                                                        h === "Budget" && kpiModal.title === "Projects: Remaining Balance" ? "Remaining" :
                                                            h === "Budget" && kpiModal.title === "Projects: Proposed Budget" ? "Proposed" :
                                                                h === "Budget" && kpiModal.title === "Projects: Total Sanctioned" ? "Sanctioned" : h}
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {kpiPagedRows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-4 py-10 text-center text-[#71717A] text-sm"
                                            >
                                                {allProjectsList === undefined || isLoading || isSyncingFunds
                                                    ? "Loading…"
                                                    : "No projects found."}
                                            </td>
                                        </tr>
                                    ) : (
                                        kpiPagedRows.map((proj: any, idx: number) => (
                                            <tr
                                                key={proj.name || idx}
                                                className="border-t border-[#F4F4F5] dark:border-[#3F3F46] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors cursor-pointer"
                                                onClick={() => {
                                                    if (window.getSelection()?.toString()) return;
                                                    navigate(`/project-details-overview/${proj.name}`, { state: { returnTo: location.pathname + location.search, ...getDashboardState() } });
                                                }}
                                            >
                                                <td className="px-4 py-3 text-[11px] font-bold text-[#71717A] font-mono">
                                                    {(kpiPage - 1) * KPI_PAGE_SIZE + idx + 1}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-1">
                                                        {proj.project_title || proj.name || "—"}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                        {proj.project_no && (
                                                            <span className="font-mono text-[10px] text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-1.5 py-0.5 rounded inline-block">
                                                                {proj.project_no}
                                                            </span>
                                                        )}
                                                        {(() => {
                                                            const d = getEffectiveStartDate(proj);
                                                            const isOld = proj.is_old_project === 1 || proj.is_old_project === true || (d && new Date(d).getFullYear() < 2026);
                                                            return isOld ? (
                                                                <span className="font-mono text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded inline-block">Old</span>
                                                            ) : (
                                                                <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded inline-block">New</span>
                                                            );
                                                        })()}
                                                        <ProjectDateBadge proj={proj} />
                                                        {proj.project_type && (
                                                            <span className="font-mono text-[10px] text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded inline-block">
                                                                {proj.project_type}
                                                            </span>
                                                        )}
                                                        {(() => {
                                                            const scheme = normalizeSchemeName(proj.funding_agency_schemes || proj.scheme_name || "");
                                                            return scheme ? (
                                                                <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded inline-block">
                                                                    {scheme}
                                                                </span>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                                    <div className="font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                        {proj.principal_investigator_name || (proj.pi_webmail ? (emailToNameMap[proj.pi_webmail.toLowerCase().trim()] || proj.pi_webmail.split("@")[0]) : "—")}
                                                    </div>
                                                    {proj.pi_webmail && (
                                                        <div className="mt-0.5">
                                                            {proj.pi_webmail}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                                    {getDeptName(proj.implementation_department)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <AsyncTableStatusBadge proj={proj} fundReceived={fundStatusMap.get(proj.name)} />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {kpiModal.title === "Projects: Utilized" ? (
                                                        <ProjectDynamicBudgetCell proj={proj} type="utilized" />
                                                    ) : kpiModal.title === "Projects: Remaining Balance" ? (
                                                        <ProjectDynamicBudgetCell proj={proj} type="remaining" />
                                                    ) : kpiModal.title === "Projects: Proposed Budget" ? (
                                                        <ProjectDynamicBudgetCell proj={proj} type="proposed" />
                                                    ) : kpiModal.title === "Projects: Total Sanctioned" ? (
                                                        <ProjectDynamicBudgetCell proj={proj} type="sanctioned" />
                                                    ) : (
                                                        <div className="text-[12px] font-extrabold text-[#059669] whitespace-nowrap">
                                                            {proj.total_budget_amount || proj.grand_total_proposal
                                                                ? formatCurrency(
                                                                    proj.total_budget_amount ||
                                                                    proj.grand_total_proposal
                                                                )
                                                                : "—"}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {kpiTotalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#E4E4E7] dark:border-[#3F3F46] shrink-0">
                                <span className="text-[11px] text-[#71717A]">
                                    Page {kpiPage} of {kpiTotalPages}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setKpiPage((p) => Math.max(1, p - 1))}
                                        disabled={kpiPage === 1}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    {Array.from(
                                        { length: Math.min(5, kpiTotalPages) },
                                        (_, i) => {
                                            const start = Math.max(
                                                1,
                                                Math.min(kpiPage - 2, kpiTotalPages - 4)
                                            );
                                            const page = start + i;
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setKpiPage(page)}
                                                    className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-colors ${page === kpiPage
                                                        ? "bg-[#2563eb] text-white"
                                                        : "text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]"
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        }
                                    )}
                                    <button
                                        onClick={() =>
                                            setKpiPage((p) => Math.min(kpiTotalPages, p + 1))
                                        }
                                        disabled={kpiPage === kpiTotalPages}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Staff Breakdown Modal */}
            {staffBreakdownOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm sm:p-6">
                    <div className="w-full max-w-4xl bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="shrink-0 p-5 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
                            <div>
                                <h2 className="text-lg font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                    Active Project Staff Breakdown
                                </h2>
                                <p className="text-xs text-[#71717A] mt-1">
                                    {staffBreakdownLoading ? "Loading staff records..." : `Total Approved Staff: ${activeStaffList.length}`}
                                </p>
                            </div>
                            <button
                                onClick={() => setStaffBreakdownOpen(false)}
                                className="p-2 text-[#71717A] hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="p-4 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] flex gap-2">
                            {["designation", "department", "pi"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setStaffGroupBy(tab as any)}
                                    className={`px-4 py-2 text-sm font-bold rounded-lg capitalize transition-colors ${staffGroupBy === tab
                                        ? "bg-[#2563eb] text-white"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-[#71717A] hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                        }`}
                                >
                                    By {tab === "pi" ? "Project PI" : tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 bg-[#FAFAF9] dark:bg-[#27272A]">
                            {staffBreakdownLoading ? (
                                <div className="flex flex-col items-center justify-center h-40">
                                    <svg className="w-8 h-8 animate-spin text-[#2563eb]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <span className="mt-4 text-sm font-semibold text-zinc-500">Fetching live staff records...</span>
                                </div>
                            ) : (
                                (() => {
                                    if (!activeStaffList.length) {
                                        return <div className="text-center py-10 text-sm font-medium text-zinc-500">No approved staff found.</div>;
                                    }

                                    const groups: Record<string, number> = {};
                                    activeStaffList.forEach(staff => {
                                        let key = "Unknown";
                                        if (staffGroupBy === "designation") key = staff.ps_designation || "Unknown";
                                        else if (staffGroupBy === "department") key = staff.ps_department ? getDeptName(staff.ps_department) : "Unknown";
                                        else if (staffGroupBy === "pi") {
                                            const rawEmail = staff.pi_id || "Unknown";
                                            const name = emailToNameMap[rawEmail.toLowerCase().trim()];
                                            key = name ? `${name} (${rawEmail})` : rawEmail;
                                        }

                                        groups[key] = (groups[key] || 0) + 1;
                                    });

                                    const sortedGroups = Object.entries(groups).sort((a, b) => b[1] - a[1]);

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {sortedGroups.map(([label, count], idx) => (
                                                <div key={idx} className="bg-white dark:bg-[#18181B] p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 flex justify-between items-center shadow-sm">
                                                    <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 truncate pr-3" title={label}>
                                                        {label}
                                                    </span>
                                                    <span className="text-[15px] font-extrabold text-[#2563eb] bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-lg shrink-0">
                                                        {count}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Professional Loading Modal for Director Report Generation */}
            {isGeneratingReport && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#27272A] p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-5 border border-[#E4E4E7] dark:border-[#3F3F46] max-w-sm w-full mx-4 animate-in zoom-in-95 duration-300">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute inset-0 bg-[#D97757]/20 rounded-full blur-xl animate-pulse"></div>
                            <Loader2 className="animate-spin text-[#D97757] relative z-10" size={48} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-[18px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                                Generating Overview
                            </h3>
                            <p className="text-[13px] font-semibold text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                                {isWaitingForFunds
                                    ? `Fetching live financial data from servers (${Math.round(globalUtilizedProgress)}%). This may take a few moments...`
                                    : "Aggregating institutional metrics and formatting print layout. Please wait a moment..."}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setIsGeneratingReport(false);
                                setIsWaitingForFunds(false);
                            }}
                            className="mt-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[12px] font-bold rounded-lg transition-colors w-full"
                        >
                            Cancel Generation
                        </button>
                    </div>
                </div>
            )}

            {/* Direct Open Full-Screen Iframe Preview (Bypasses Popup Blockers) */}
            {previewHtml && (
                <div className="fixed inset-0 z-[200] bg-white dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-300">
                    <iframe
                        srcDoc={previewHtml}
                        className="w-full h-full border-none"
                        title="Director Report Preview"
                    />
                </div>
            )}
        </div>
    );
}