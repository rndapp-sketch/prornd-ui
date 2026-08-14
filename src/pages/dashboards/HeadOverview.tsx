

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
    BarChart3,
    Users,
    Search,
    Building2,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    X,
    Filter,
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
    }>;
    onBadgeClick?: (badgeLabel: string) => void;
}) {
    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-6 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all flex flex-col h-full min-h-[160px]${onClick ? " cursor-pointer select-none" : ""}`}
        >
            <div
                className="absolute bottom-0 right-0 w-[90px] h-[90px] rounded-full translate-x-5 translate-y-5"
                style={{ backgroundColor: circleColor, opacity: 0.07 }}
            />
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0"
                style={{ backgroundColor: iconBg, color: circleColor }}
            >
                {icon}
            </div>
            <div className="text-[12px] font-extrabold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mb-0.5 shadow-sm">
                {label}
            </div>
            {description && (
                <div className="text-[10px] text-[#A1A1AA] dark:text-[#71717A] font-medium mb-1 leading-tight">
                    {description}
                </div>
            )}
            <div className={`text-[32px] font-extrabold tracking-tight leading-none mb-2 drop-shadow-sm ${valueColor}`}>
                {value}
            </div>
            <div className="mt-auto pt-4 w-full">
                {badges && badges.length > 0 ? (
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
                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 ${b.bgClass} ${b.textClass}${onBadgeClick ? " cursor-pointer hover:brightness-95 transition-all" : ""}`}
                                title={b.title}
                            >
                                <span className={`w-2 h-2 rounded-full ${b.dotColor}`} />
                                {b.count} {b.label}
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
    const [kpiModal, setKpiModal] = React.useState<{ type: string; title: string } | null>(null);
    const [kpiPage, setKpiPage] = React.useState(1);
    const [kpiTab, setKpiTab] = React.useState<"ongoing" | "submitted">("ongoing");
    const [kpiAllocTab, setKpiAllocTab] = React.useState<string>("ongoing");
    const [piModalPage, setPiModalPage] = React.useState<number>(location.state?.piModalPage || 1);
    const [expandedPI, setExpandedPI] = React.useState<string | null>(location.state?.expandedPI || null);
    const [projectTableFilter, setProjectTableFilter] = React.useState<string>("all");
    const [projectTablePage, setProjectTablePage] = React.useState(1);
    const [piSearch, setPiSearch] = React.useState("");
    const [piPage, setPiPage] = React.useState(1);
    const [piFundingFilter, setPiFundingFilter] = React.useState<string>("all");
    const [showFundingFilterDropdown, setShowFundingFilterDropdown] = React.useState(false);
    const [showAllDepts, setShowAllDepts] = React.useState(false);

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
                "select_funding_agency",
                "funding_agency_other",
                "total_budget_amount",
                "grand_total_proposal",
                "prj_start_date",
                "prj_end_date",
            ],
            limit: 2000,
        }
    );

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

    // ── Funding sources pie (dept-scoped) ───────────────────────────────────
    const pieChartFundingData = React.useMemo(() => {
        const source = deptProjects.length > 0 ? deptProjects : apiProjectsFlat;
        const useApiStatus = deptProjects.length === 0;
        const agencyMap: Record<string, number> = {};
        source.forEach((p: any) => {
            const isOngoing = useApiStatus ? p._api_status === "ongoing" : deptOngoingIds.has(p.name);
            const isSubmitted = useApiStatus ? p._api_status === "submitted" : deptSubmittedIds.has(p.name);
            if (!isOngoing && !isSubmitted) return;
            const agency =
                (p.select_funding_agency || "").trim() ||
                (p.origin_of_funding_agency || "").trim() ||
                (p.funding_agency_other || "").trim() ||
                "Unknown";
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
    }, [deptProjects, apiProjectsFlat, deptOngoingIds, deptSubmittedIds]);

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

    const getProjectAgency = React.useCallback((proj: any): string => {
        return (
            (proj.select_funding_agency || "").trim() ||
            (proj.origin_of_funding_agency || "").trim() ||
            (proj.funding_agency_other || "").trim() ||
            "Unknown"
        );
    }, []);

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
            return source.filter((p: any) =>
                deptProjects.length > 0 ? deptOngoingIds.has(p.name) : p._api_status === "ongoing"
            );
        }
        if (kpiModal.type === "intl") {
            return source.filter(
                (p: any) => (p.origin_of_funding_agency || "").toLowerCase() === "international"
            );
        }
        return source;
    }, [deptProjects, apiProjectsFlat, deptOngoingIds, deptSubmittedIds, kpiModal, kpiTab, kpiAllocTab]);

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

    // ── Badges ────────────────────────────────────────────────────────────────
    const totalProjectBadges = React.useMemo(() => [
        {
            label: "Ongoing",
            originalState: "ongoing",
            count: projectOverview.ongoing_projects || stats.ongoing,
            dotColor: "bg-emerald-500",
            bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
            textClass: "text-emerald-700 dark:text-emerald-400",
        },
        {
            label: "Submitted",
            originalState: "submitted",
            count: projectOverview.submitted_projects || stats.submitted,
            title: "Registration but pending sanction",
            dotColor: "bg-amber-400",
            bgClass: "bg-amber-50 dark:bg-amber-950/30",
            textClass: "text-amber-700 dark:text-amber-400",
        },
    ], [stats, projectOverview]);

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
                </div>

                {viewMode !== "PI" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* ── KPI Cards ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px] mb-6">
                            <KpiCard
                                label="Total Projects"
                                value={isLoading || isHeadDataLoading ? "—" : String((projectOverview.ongoing_projects || stats.ongoing) + (projectOverview.submitted_projects || stats.submitted))}
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
                                badges={isLoading || isHeadDataLoading ? undefined : totalProjectBadges}
                                onBadgeClick={(badgeLabel) => openKpiModalWithTab("total", "All Department Projects", badgeLabel)}
                            />
                            <KpiCard
                                label="Total Allocation"
                                description="From sanctioned & fund-approved projects"
                                value={isLoading || isHeadDataLoading ? "—" : formatCurrency(fundAnalytics.total_allocation || stats.totalAlloc)}
                                subtext="Combined dept. pipeline value"
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
                                badges={isLoading || isHeadDataLoading ? undefined : totalProjectBadges}
                                onBadgeClick={(badgeLabel) => openKpiModalWithTab("allocation", "Projects by Allocation", badgeLabel)}
                            />
                            <KpiCard
                                label="Ongoing Projects"
                                value={isLoading || isHeadDataLoading ? "—" : String(projectOverview.ongoing_projects || stats.ongoing)}
                                subtext={(() => { const tot = (projectOverview.ongoing_projects || stats.ongoing) + (projectOverview.submitted_projects || stats.submitted); return tot > 0 ? `${(((projectOverview.ongoing_projects || stats.ongoing) / tot) * 100).toFixed(0)}% of portfolio` : "Currently Active"; })()}
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
                            />
                            <KpiCard
                                label="Intl. Collaborations"
                                value={isLoading || isHeadDataLoading ? "—" : String(stats.intlCount)}
                                subtext="International Funding Sources"
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
                            />
                        </div>

                        {/* ── Project Analytics ── */}
                        <SectionDivider title="Project Analytics" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-6">
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
                                        Financial Year — Project Status
                                    </div>
                                </div>
                                <div className="p-[18px] px-[22px] pb-5">
                                    <div className="h-[250px]">
                                        {isLoading || isHeadDataLoading ? (
                                            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">Loading chart...</div>
                                        ) : stats.yearData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.yearData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="25%" barGap={2}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                                                    <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#71717A", fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                                                    <YAxis tick={{ fontSize: 12, fill: "#71717A" }} axisLine={false} tickLine={false} />
                                                    <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid #1e293b", background: "#0f172a" }} labelStyle={{ color: "#f1f5f9", fontWeight: 700, fontSize: 12 }} itemStyle={{ color: "#94a3b8", fontSize: 11 }} cursor={{ fill: "#f4f4f5" }} />
                                                    <Bar dataKey="submitted" name="Submitted" stackId="a" fill="#2563eb" maxBarSize={34} isAnimationActive={false}>
                                                        <LabelList dataKey="submitted" position="center" fill="#ffffff" fontSize={11} fontWeight={700} formatter={(val: any) => (val > 0 ? val : "")} />
                                                    </Bar>
                                                    <Bar dataKey="ongoing" name="Ongoing" stackId="a" fill="#7c3aed" maxBarSize={34} isAnimationActive={false}>
                                                        <LabelList dataKey="ongoing" position="center" fill="#ffffff" fontSize={11} fontWeight={700} formatter={(val: any) => (val > 0 ? val : "")} />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">No data available</div>
                                        )}
                                    </div>
                                    <div className="flex items-start gap-5 flex-wrap mt-4 pt-4 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                        {[
                                            ["#2563eb", `Submitted (${projectOverview.submitted_projects || stats.submitted})`, "Registration but pending sanction"],
                                            ["#7c3aed", `Ongoing (${projectOverview.ongoing_projects || stats.ongoing})`, "Fund sanctioned and formally approved"],
                                        ].map(([color, label, desc]) => (
                                            <div key={label} className="flex items-start gap-2">
                                                <span className="w-2.5 h-2.5 rounded-sm shrink-0 mt-[2px]" style={{ backgroundColor: color }} />
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">{label}</span>
                                                    <span className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A] max-w-[120px] leading-snug mt-0.5">{desc}</span>
                                                </div>
                                            </div>
                                        ))}
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
                                    {isLoading || isHeadDataLoading ? (
                                        <div className="h-[300px] flex items-center justify-center text-[#71717A] text-sm">Loading chart...</div>
                                    ) : pieChartFundingData.length > 0 ? (
                                        <div className="flex items-center gap-6 h-[300px]">
                                            <div className="relative flex items-center justify-center w-[200px] h-[200px] shrink-0">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={pieChartFundingData} cx="50%" cy="50%" innerRadius={65} outerRadius={88} dataKey="value" nameKey="funding_agency" paddingAngle={3} isAnimationActive={false}>
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
                                            <div className="flex-1 min-w-0">
                                                {pieChartFundingData.map((item: any, i: number) => (
                                                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                                            <span className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA] truncate max-w-[130px]" title={item.funding_agency}>{item.funding_agency}</span>
                                                        </div>
                                                        <span className="text-[13px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">{item.value}</span>
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-[14px] mb-6">
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
                                        {isLoading || isHeadDataLoading ? (
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
                                            <div className="flex flex-col items-center justify-start border-r border-[#E4E4E7] dark:border-[#3F3F46]">
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
                                            <div className="flex flex-col items-center justify-start">
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

                            {/* Sanction Amount — Start vs End */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden lg:col-span-2 xl:col-span-2">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/20 text-[#059669]">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                                            </svg>
                                        </div>
                                        Sanction Amount — Start vs End Year
                                    </div>
                                </div>
                                <div className="p-[18px] px-[22px]">
                                    <div className="h-[300px]">
                                        {isLoading || isHeadDataLoading ? (
                                            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">Loading chart...</div>
                                        ) : stats.startEndData.length === 0 ? (
                                            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">No data available</div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.startEndData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barCategoryGap="30%" barGap={3}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                                                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: "#71717A" }} dy={8} />
                                                    <YAxis axisLine={false} tickLine={false}
                                                        tickFormatter={(v) => v >= 10000000 ? `₹${(v / 10000000).toFixed(0)}Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : `₹${v}`}
                                                        tick={{ fontSize: 12, fill: "#71717A" }}
                                                    />
                                                    <Tooltip content={<BarTooltip />} cursor={{ fill: "#f4f4f5" }} />
                                                    <Bar dataKey="startAmount" name="Project Start" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={36} />
                                                    <Bar dataKey="endAmount" name="Project End" fill="#d97706" radius={[6, 6, 0, 0]} maxBarSize={36} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                    <div className="flex items-start gap-5 flex-wrap mt-4 pt-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                        {[
                                            ["#2563eb", "Project Start", "Budget of projects beginning this year"],
                                            ["#d97706", "Project End", "Budget of projects closing this year"],
                                        ].map(([color, label, desc]) => (
                                            <div key={label} className="flex items-start gap-2">
                                                <span className="w-2.5 h-2.5 rounded-sm shrink-0 mt-[2px]" style={{ backgroundColor: color }} />
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">{label}</span>
                                                    <span className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A] max-w-[120px] leading-snug mt-0.5">{desc}</span>
                                                </div>
                                            </div>
                                        ))}
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
                                        project_title: p.project_title,
                                        pi_webmail: p.pi_webmail,
                                        department: p.implementation_department,
                                        workflow_state: p.workflow_state,
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
                                                    {isLoading || isHeadDataLoading ? (
                                                        <tr><td colSpan={5} className="p-8 text-center text-[#71717A] text-sm">Loading projects...</td></tr>
                                                    ) : pageSlice.length === 0 ? (
                                                        <tr><td colSpan={5} className="p-8 text-center text-[#71717A] text-sm">No projects match the selected filter.</td></tr>
                                                    ) : (
                                                        pageSlice.map((proj: any, idx: number) => {
                                                            const globalIdx = (safePage - 1) * PROJECT_TABLE_PAGE_SIZE + idx;
                                                            return (
                                                                <tr key={proj.name || idx} className="border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors">
                                                                    <td className="p-3 px-3.5 align-middle text-[11px] font-extrabold text-[#A1A1AA] font-mono">{String(globalIdx + 1).padStart(2, "0")}</td>
                                                                    <td className="p-3 px-3.5 align-middle max-w-[300px]">
                                                                        <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-2">{proj.project_title || "Untitled"}</div>
                                                                        <span className="font-mono text-[9px] text-[#71717A] bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] px-1.5 py-0.5 rounded inline-block mt-1">{proj.name}</span>
                                                                    </td>
                                                                    <td className="p-3 px-3.5 align-middle text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA] whitespace-nowrap">
                                                                        {proj.pi_webmail ? proj.pi_webmail.split("@")[0] : "—"}
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
                                            <div className="text-[18px] font-extrabold tracking-[-0.03em] text-[#2563eb]">{isLoading || isHeadDataLoading ? "—" : formatCurrency(fundAnalytics.total_allocation || stats.totalAlloc)}</div>
                                            <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mt-0.5">Total Sanctioned</div>
                                        </div>
                                        <div className="flex-1 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg p-2.5 text-center">
                                            <div className="text-[18px] font-extrabold tracking-[-0.03em] text-[#059669]">{isLoading || isHeadDataLoading ? "—" : String(projectOverview.ongoing_projects || stats.ongoing)}</div>
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
                                                <span className={`text-[12px] font-extrabold ${row.color}`}>{isLoading || isHeadDataLoading ? "—" : row.value}</span>
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
                                        {paginatedPIs && paginatedPIs.length > 0 ? (
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
                            {(() => {
                                const totalSanctioned = selectedPIProjects.reduce((sum: number, proj: any) => sum + (proj.total_budget_amount || proj.grand_total_proposal || 0), 0);
                                const formatted = totalSanctioned >= 10000000 ? `₹${(totalSanctioned / 10000000).toFixed(2)} Cr` : totalSanctioned >= 100000 ? `₹${(totalSanctioned / 100000).toFixed(2)} L` : `₹${totalSanctioned.toLocaleString("en-IN")}`;
                                return (
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center">
                                            <div className="text-[20px] font-extrabold text-[#2563eb] leading-tight">{selectedPIDetails.project_count}</div>
                                            <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest mt-1">Projects</div>
                                        </div>
                                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center">
                                            <div className="text-[20px] font-extrabold text-[#059669] leading-tight">{totalSanctioned > 0 ? formatted : "—"}</div>
                                            <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest mt-1">Sanctioned</div>
                                        </div>
                                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center">
                                            <div className="text-[20px] font-extrabold text-[#7c3aed] leading-tight">{resolvedDeptName}</div>
                                            <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest mt-1">Implementation Department</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Project Timeline */}
                            {selectedPIProjects.length > 0 && (() => {
                                const pagedProjects = selectedPIProjects.slice(
                                    (piModalPage - 1) * PI_PROJECTS_PAGE_SIZE,
                                    piModalPage * PI_PROJECTS_PAGE_SIZE
                                );
                                return (
                                    <div>
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
                                                const totalMonths = startDate && endDate ? Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))) : null;
                                                const progressPct = startDate && endDate && now > startDate ? Math.min(100, Math.round(((now.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100)) : 0;
                                                const formatDate = (d: Date | null) => d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                                                const fund = proj.total_budget_amount || proj.grand_total_proposal || 0;
                                                const formattedFund = fund >= 10000000 ? `₹${(fund / 10000000).toFixed(2)} Cr` : fund >= 100000 ? `₹${(fund / 100000).toFixed(2)} L` : fund > 0 ? `₹${fund.toLocaleString("en-IN")}` : null;
                                                const progressColor = isCompleted ? "#A1A1AA" : progressPct >= 80 ? "#EF4444" : progressPct >= 60 ? "#FB923C" : progressPct >= 40 ? "#FACC15" : "#22C55E";

                                                return (
                                                    <div key={proj.name} className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl p-4 shadow-sm">
                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-snug line-clamp-2">{proj.project_title || proj.name}</div>
                                                                {proj.project_no && <div className="text-[10px] font-mono text-[#A1A1AA] mt-0.5">{proj.project_no}</div>}
                                                                {formattedFund && <div className="text-[10px] font-extrabold mt-1 text-[#3F3F46] dark:text-[#E4E4E7]">{formattedFund}</div>}
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCompleted ? "bg-slate-100 dark:bg-slate-800 text-slate-500" : isActive ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"}`}>
                                                                    {isCompleted ? "Completed" : isActive ? "● Active" : "Upcoming"}
                                                                </span>
                                                                <button onClick={() => navigate(`/project-details-overview/${proj.name}`, { state: { returnTo: location.pathname + location.search, expandedPI, piModalPage } })}
                                                                    className="text-[10px] font-semibold text-[#D97757] hover:text-[#c26245] flex items-center gap-1 group transition-colors">
                                                                    View Project
                                                                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                                            {[
                                                                { label: "Start", value: formatDate(startDate) },
                                                                { label: "End", value: formatDate(endDate) },
                                                                { label: "Duration", value: totalMonths !== null ? `${totalMonths}mo` : "—" },
                                                            ].map((cell) => (
                                                                <div key={cell.label} className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5 text-center">
                                                                    <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">{cell.label}</div>
                                                                    <div className="text-[11px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">{cell.value}</div>
                                                                </div>
                                                            ))}
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
                    <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl border border-[#E4E4E7] dark:border-[#3F3F46] w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46] shrink-0">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] mb-0.5">Projects</p>
                                <h2 className="text-[16px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">{kpiModal.title}</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-semibold text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2.5 py-1 rounded-full">{kpiModalRows.length} record{kpiModalRows.length !== 1 ? "s" : ""}</span>
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
                                        {["#", "Project", "PI", "Status", "Budget"].map((h) => (
                                            <th key={h} className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#71717A]${h === "Budget" ? " text-right" : ""}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {kpiPagedRows.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-10 text-center text-[#71717A] text-sm">{isLoading || isHeadDataLoading ? "Loading…" : "No projects found."}</td></tr>
                                    ) : (
                                        kpiPagedRows.map((proj: any, idx: number) => (
                                            <tr key={proj.name || idx} className="border-t border-[#F4F4F5] dark:border-[#3F3F46] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors">
                                                <td className="px-4 py-3 text-[10px] font-bold text-[#71717A] font-mono">{(kpiPage - 1) * KPI_PAGE_SIZE + idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-1">{proj.project_title || proj.name || "—"}</div>
                                                    {proj.project_no && <span className="font-mono text-[9px] text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-1.5 py-0.5 rounded mt-0.5 inline-block">{proj.project_no}</span>}
                                                </td>
                                                <td className="px-4 py-3 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">{proj.pi_webmail || "—"}</td>
                                                <td className="px-4 py-3"><StatusBadge status={proj.workflow_state} /></td>
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
