import * as React from "react";
import { useNavigate } from "react-router-dom";
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
} from "recharts";
import { Briefcase, FileDown } from "lucide-react";
import { generateDirectorReportHtml } from "@/utils/directorReportHtml";
import { DepartmentName } from "@/components/DepartmentName";

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
            <span className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.1em] whitespace-nowrap">
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
}: {
    label: string;
    value: string;
    subtext: string;
    icon: React.ReactNode;
    valueColor: string;
    iconBg: string;
    circleColor: string;
}) {
    return (
        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all">
            <div
                className="absolute bottom-0 right-0 w-[70px] h-[70px] rounded-full translate-x-5 translate-y-5"
                style={{ backgroundColor: circleColor, opacity: 0.07 }}
            />
            <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3.5"
                style={{ backgroundColor: iconBg, color: circleColor }}
            >
                {icon}
            </div>
            <div className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mb-1">
                {label}
            </div>
            <div
                className={`text-[26px] font-extrabold tracking-tight leading-none mb-1.5 ${valueColor}`}
            >
                {value}
            </div>
            <div className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] font-medium">
                {subtext}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status?: string }) {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s.includes("ongoing") || s.includes("active"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wide bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                <span className="w-[5px] h-[5px] rounded-full bg-blue-500" />
                Ongoing
            </span>
        );
    if (s.includes("complet"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wide bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-500" />
                Completed
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wide bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            <span className="w-[5px] h-[5px] rounded-full bg-amber-500" />
            {status}
        </span>
    );
}

export function DirectorDashboard() {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const [time, setTime] = React.useState(new Date());

    React.useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
        fields: ["full_name", "user_roles"],
        enabled: !!currentUser,
    });

    const fullName = userData?.full_name || currentUser || "Guest";

    const { data: dashboardData, isLoading } = useFrappeGetCall<{
        message: any;
    }>("rndopsapp.dashboard.get_director_dashboard_data");

    const data = dashboardData?.message || {};

    const { data: deptList } = useFrappeGetDocList("Department_prornd", {
        fields: ["name", "dept_name"],
        limit: 500,
    });

    const projectStatusByYearData = data.project_status_by_year || [];
    const fundingTypeData = data.funding_sources || [];

    const overview = data.project_overview || {};
    const funds = data.funding_analytics || {};
    const intl = data.international_collaboration || {};
    const proposals = data.proposal_analytics || {};
    const ipr = data.ipr_analytics || {};
    const topProjects = data.top_funded_projects || [];
    const recentProjects = data.recent_projects || [];

    const totalProjects = overview.total_projects || 0;
    const researchProjects = overview.research_projects || 0;
    const consultancyProjects = overview.consultancy_projects || 0;
    const ongoingProjects = overview.ongoing_projects || 0;
    const totalStaffCount = overview.total_staff_count || 0;

    const fundAlloc = funds.total_allocation || 0;
    const fundUtilized = funds.utilized || 0;
    const fundRemaining = funds.remaining || 0;
    const fundUtilPercent =
        fundAlloc > 0 ? ((fundUtilized / fundAlloc) * 100).toFixed(1) : "0";

    const totalFundingSources = fundingTypeData.reduce(
        (sum: number, item: any) => sum + (item.value || 0),
        0,
    );

    const handleDownloadReport = () => {
        if (isLoading) return;
        const deptNameMap: Record<string, string> = {};
        (deptList ?? []).forEach((d: any) => {
            if (d.name && d.dept_name) deptNameMap[d.name] = d.dept_name;
        });
        const html = generateDirectorReportHtml({
            overview,
            funds,
            intl,
            proposals,
            ipr,
            topProjects,
            recentProjects,
            projectStatusByYearData,
            fundingTypeData,
            fullName,
            deptNameMap,
        });
        const win = window.open("", "_blank", "width=900,height=700");
        if (!win) return;
        win.document.open();
        win.document.write(html);
        win.document.close();
    };

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

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans text-[14px] leading-relaxed text-[#3F3F46] dark:text-[#E4E4E7]">
            <div className="px-6 md:px-8 pt-7 pb-10 max-w-[1600px] mx-auto">
                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-[#3F3F46] dark:text-[#E4E4E7]">
                            Director's{" "}
                            <span className="text-[#2563eb]">Overview</span>
                        </h1>
                        <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-1">
                            Welcome, {fullName} — R&D Director's Dashboard · IIT
                            Guwahati
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Data
                        </div>
                        <div className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] font-mono bg-white dark:bg-[#27272A] px-3 py-1.5 rounded-full border border-[#E4E4E7] dark:border-[#3F3F46]">
                            {liveTime}
                        </div>

                        <button
                            onClick={handleDownloadReport}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-[#D97757] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg shadow-sm transition-all"
                        >
                            <FileDown className="size-3.5" />
                            Download Report
                        </button>
                    </div>
                </div>

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-[14px] mb-6">
                    <KpiCard
                        label="Total Projects"
                        value={isLoading ? "—" : String(totalProjects)}
                        subtext={
                            isLoading
                                ? ""
                                : `${researchProjects} Res · ${consultancyProjects} Cons`
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
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                        }
                        valueColor="text-blue-700 dark:text-blue-400"
                        iconBg="#eff6ff"
                        circleColor="#2563eb"
                    />
                    <KpiCard
                        label="Total Allocation"
                        value={isLoading ? "—" : formatCurrency(fundAlloc)}
                        subtext={
                            isLoading ? "" : `${fundUtilPercent}% utilized`
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
                                {/* Indian Rupee ₹ */}
                                <line x1="6" y1="5" x2="18" y2="5" />
                                <line x1="6" y1="10" x2="18" y2="10" />
                                <path d="M6 5h5a4 4 0 0 1 0 8H6" />
                                <path d="M9 13L15 21" />
                            </svg>
                        }
                        valueColor="text-emerald-700 dark:text-emerald-400"
                        iconBg="#ecfdf5"
                        circleColor="#059669"
                    />
                    <KpiCard
                        label="Ongoing Projects"
                        value={isLoading ? "—" : String(ongoingProjects)}
                        subtext={
                            totalProjects > 0
                                ? `${((ongoingProjects / totalProjects) * 100).toFixed(0)}% of portfolio`
                                : "Currently Active"
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
                    />
                    <KpiCard
                        label="Patents Filed"
                        value={
                            isLoading
                                ? "—"
                                : String(ipr.total_patents_filed || 0)
                        }
                        subtext="Intellectual Property"
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
                                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z" />
                            </svg>
                        }
                        valueColor="text-amber-700 dark:text-amber-400"
                        iconBg="#fffbeb"
                        circleColor="#d97706"
                    />
                    <KpiCard
                        label="Intl. Agencies"
                        value={
                            isLoading ? "—" : String(intl.active_agencies || 0)
                        }
                        subtext="Active Global MOUs"
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
                    />
                </div>

                {/* ── Project Analytics ── */}
                <SectionDivider title="Project Analytics" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-6">
                    {/* FY Bar Chart */}
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                        <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                            <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
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
                                Financial Year — Project Status
                            </div>
                        </div>
                        <div className="p-[18px] px-[22px]">
                            <div className="h-[200px]">
                                {isLoading ? (
                                    <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                                        Loading chart...
                                    </div>
                                ) : projectStatusByYearData.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={projectStatusByYearData}
                                            margin={{
                                                top: 4,
                                                right: 4,
                                                left: -24,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="#E4E4E7"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="year"
                                                tick={{
                                                    fontSize: 10,
                                                    fill: "#71717A",
                                                    fontWeight: 600,
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                                dy={8}
                                            />
                                            <YAxis
                                                tick={{
                                                    fontSize: 10,
                                                    fill: "#71717A",
                                                }}
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
                                                itemStyle={{
                                                    color: "#94a3b8",
                                                    fontSize: 11,
                                                }}
                                                cursor={{ fill: "#f4f4f5" }}
                                            />
                                            <Bar
                                                dataKey="registered"
                                                name="Registered"
                                                fill="#2563eb"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={28}
                                            />
                                            <Bar
                                                dataKey="ongoing"
                                                name="Ongoing"
                                                fill="#7c3aed"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={28}
                                            />
                                            <Bar
                                                dataKey="completed"
                                                name="Completed"
                                                fill="#059669"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={28}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                                        No data available
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3.5 flex-wrap mt-3.5">
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#71717A]">
                                    <span className="w-2 h-2 rounded-sm shrink-0 bg-[#2563eb]" />
                                    Registered
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#71717A]">
                                    <span className="w-2 h-2 rounded-sm shrink-0 bg-[#7c3aed]" />
                                    Ongoing
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#71717A]">
                                    <span className="w-2 h-2 rounded-sm shrink-0 bg-[#059669]" />
                                    Completed
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Funding Sources Pie */}
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                        <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                            <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
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
                        </div>
                        <div className="p-[18px] px-[22px]">
                            {isLoading ? (
                                <div className="h-[200px] flex items-center justify-center text-[#71717A] text-sm">
                                    Loading chart...
                                </div>
                            ) : fundingTypeData.length > 0 ? (
                                <div className="flex items-center gap-5">
                                    <div className="relative flex items-center justify-center w-[140px] h-[140px] shrink-0">
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={fundingTypeData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={48}
                                                    outerRadius={65}
                                                    dataKey="value"
                                                    paddingAngle={3}
                                                >
                                                    {fundingTypeData.map(
                                                        (_: any, i: number) => (
                                                            <Cell
                                                                key={i}
                                                                fill={
                                                                    CHART_COLORS[
                                                                        i %
                                                                            CHART_COLORS.length
                                                                    ]
                                                                }
                                                                stroke="none"
                                                            />
                                                        ),
                                                    )}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: "0.5rem",
                                                        border: "1px solid #1e293b",
                                                        background: "#0f172a",
                                                    }}
                                                    labelStyle={{
                                                        color: "#f1f5f9",
                                                        fontWeight: 700,
                                                    }}
                                                    itemStyle={{
                                                        color: "#94a3b8",
                                                        fontSize: 11,
                                                    }}
                                                    formatter={(
                                                        value: number,
                                                        name: string,
                                                    ) => [
                                                        `${value} Projects`,
                                                        name,
                                                    ]}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[20px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-none">
                                                {totalFundingSources}
                                            </span>
                                            <span className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mt-0.5">
                                                Total
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 pl-1.5">
                                        {fundingTypeData
                                            .slice(0, 5)
                                            .map((item: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between py-1.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="w-2 h-2 rounded-sm shrink-0"
                                                            style={{
                                                                backgroundColor:
                                                                    CHART_COLORS[
                                                                        i %
                                                                            CHART_COLORS.length
                                                                    ],
                                                            }}
                                                        />
                                                        <span className="text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA] truncate max-w-[110px]">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                        {item.value}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[200px] flex items-center justify-center text-[#71717A] text-sm">
                                    No data available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Financial Intelligence ── */}
                <SectionDivider title="Financial Intelligence" />
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-[14px] mb-6">
                    {/* Top Funded Projects Table */}
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                        <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                            <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
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
                                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                        <polyline points="17 6 23 6 23 12" />
                                    </svg>
                                </div>
                                Top Funded Projects
                            </div>
                            <button
                                onClick={() => navigate("/projects-view")}
                                className="text-[10px] font-bold text-[#2563eb] uppercase tracking-widest hover:underline cursor-pointer"
                            >
                                See All
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                        <th className="p-2.5 px-3.5 text-[10px] font-bold text-[#71717A] uppercase tracking-widest text-left w-8">
                                            #
                                        </th>
                                        <th className="p-2.5 px-3.5 text-[10px] font-bold text-[#71717A] uppercase tracking-widest text-left">
                                            Project
                                        </th>
                                        <th className="p-2.5 px-3.5 text-[10px] font-bold text-[#71717A] uppercase tracking-widest text-left">
                                            PI / Lead
                                        </th>
                                        <th className="p-2.5 px-3.5 text-[10px] font-bold text-[#71717A] uppercase tracking-widest text-left">
                                            Department
                                        </th>
                                        <th className="p-2.5 px-3.5 text-[10px] font-bold text-[#71717A] uppercase tracking-widest text-left">
                                            Status
                                        </th>
                                        <th className="p-2.5 px-3.5 text-[10px] font-bold text-[#71717A] uppercase tracking-widest text-left">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="p-8 text-center text-[#71717A] text-sm"
                                            >
                                                Loading projects...
                                            </td>
                                        </tr>
                                    ) : topProjects.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="p-8 text-center text-[#71717A] text-sm"
                                            >
                                                No projects found.
                                            </td>
                                        </tr>
                                    ) : (
                                        topProjects.map(
                                            (proj: any, idx: number) => (
                                                <tr
                                                    key={proj.project_id || idx}
                                                    className="border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors"
                                                >
                                                    <td className="p-3 px-3.5 align-middle text-[11px] font-extrabold text-[#71717A] font-mono">
                                                        {String(
                                                            idx + 1,
                                                        ).padStart(2, "0")}
                                                    </td>
                                                    <td className="p-3 px-3.5 align-middle">
                                                        <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                                            {proj.project_title ||
                                                                "Untitled"}
                                                        </div>
                                                        <span className="font-mono text-[9px] text-[#71717A] bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] px-1.5 py-0.5 rounded inline-block mt-1">
                                                            {proj.project_id}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 px-3.5 align-middle text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                                        {proj.pi_name || "—"}
                                                    </td>
                                                    <td className="p-3 px-3.5 align-middle">
                                                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                                            {proj.department ? (
                                                                <DepartmentName
                                                                    name={
                                                                        proj.department
                                                                    }
                                                                />
                                                            ) : (
                                                                "—"
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 px-3.5 align-middle">
                                                        <StatusBadge
                                                            status={
                                                                proj.status ||
                                                                proj.workflow_state
                                                            }
                                                        />
                                                    </td>
                                                    <td className="p-3 px-3.5 align-middle font-extrabold text-[13px] text-[#059669] whitespace-nowrap">
                                                        {formatCurrency(
                                                            proj.total_budget_amount ||
                                                                0,
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Breakdown Panel */}
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                        <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                            <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
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
                                        <rect
                                            x="2"
                                            y="3"
                                            width="20"
                                            height="14"
                                            rx="2"
                                        />
                                        <line x1="8" y1="21" x2="16" y2="21" />
                                        <line x1="12" y1="17" x2="12" y2="21" />
                                    </svg>
                                </div>
                                Financial Breakdown
                            </div>
                        </div>
                        <div className="p-[18px] px-[22px] space-y-3">
                            <div className="flex gap-2">
                                <div className="flex-1 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg p-2.5 text-center">
                                    <div className="text-[18px] font-extrabold tracking-[-0.03em] text-[#2563eb]">
                                        {isLoading
                                            ? "—"
                                            : formatCurrency(fundAlloc)}
                                    </div>
                                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mt-0.5">
                                        Total Sanctioned
                                    </div>
                                </div>
                                <div className="flex-1 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg p-2.5 text-center">
                                    <div className="text-[18px] font-extrabold tracking-[-0.03em] text-[#059669]">
                                        {isLoading
                                            ? "—"
                                            : formatCurrency(fundUtilized)}
                                    </div>
                                    <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mt-0.5">
                                        Utilized
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-semibold text-[#71717A]">
                                        Utilization Rate
                                    </span>
                                    <span className="text-[10px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                        {fundUtilPercent}%
                                    </span>
                                </div>
                                <div className="h-1.5 bg-[#E4E4E7] dark:bg-[#3F3F46] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-[#059669] transition-all"
                                        style={{
                                            width: `${Math.min(parseFloat(fundUtilPercent), 100)}%`,
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-0 pt-1">
                                {[
                                    {
                                        label: "Remaining Balance",
                                        value: formatCurrency(fundRemaining),
                                        color: "text-[#059669]",
                                    },
                                    {
                                        label: "Proposals Under Review",
                                        value: String(
                                            proposals.total_proposals || 0,
                                        ),
                                        color: "text-[#3F3F46] dark:text-[#E4E4E7]",
                                    },
                                    {
                                        label: "Proposed Budget (Review)",
                                        value: formatCurrency(
                                            proposals.proposed_budget_total ||
                                                0,
                                        ),
                                        color: "text-[#3F3F46] dark:text-[#E4E4E7]",
                                    },
                                    {
                                        label: "Total Project Staff",
                                        value: `${totalStaffCount} Members`,
                                        color: "text-[#3F3F46] dark:text-[#E4E4E7]",
                                    },
                                ].map((row, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0"
                                    >
                                        <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                            {row.label}
                                        </span>
                                        <span
                                            className={`text-[12px] font-extrabold ${row.color}`}
                                        >
                                            {isLoading ? "—" : row.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Portfolio Details ── */}
                <SectionDivider title="Portfolio Details" />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[14px] mb-6">
                    {/* Project Mix & Team */}
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                        <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                            <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
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
                                    label: "Ongoing Projects",
                                    value: ongoingProjects,
                                    color: "#059669",
                                },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] gap-2"
                                >
                                    <div className="flex items-center gap-2 w-[140px] shrink-0">
                                        <span
                                            className="w-2 h-2 rounded-sm shrink-0"
                                            style={{
                                                backgroundColor: item.color,
                                            }}
                                        />
                                        <span className="text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
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
                            <div className="flex items-center justify-between py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                    Total Project Staff
                                </span>
                                <span className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                    {isLoading ? "—" : totalStaffCount} members
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2.5">
                                <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                    Proposals Under Review
                                </span>
                                <span className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                    {isLoading
                                        ? "—"
                                        : proposals.total_proposals || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Recently Registered */}
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                        <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                            <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
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
                                recentProjects
                                    .slice(0, 5)
                                    .map((proj: any, idx: number) => {
                                        const d = proj.creation
                                            ? new Date(proj.creation)
                                            : null;
                                        const isNew = d
                                            ? Date.now() - d.getTime() <
                                              30 * 24 * 3600 * 1000
                                            : false;
                                        const label = d
                                            ? isNew
                                                ? "New"
                                                : d.toLocaleString("en-IN", {
                                                      month: "short",
                                                  })
                                            : "—";
                                        return (
                                            <div
                                                key={proj.project_id || idx}
                                                className="flex items-center py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 gap-2.5"
                                            >
                                                <div className="text-[11px] font-extrabold text-[#71717A] w-5 shrink-0 font-mono">
                                                    {String(idx + 1).padStart(
                                                        2,
                                                        "0",
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                                                        {proj.project_title ||
                                                            "Untitled"}
                                                    </div>
                                                    <div className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] mt-[1px]">
                                                        {proj.department ? (
                                                            <DepartmentName
                                                                name={
                                                                    proj.department
                                                                }
                                                            />
                                                        ) : (
                                                            "—"
                                                        )}{" "}
                                                        · {proj.pi_name}
                                                    </div>
                                                </div>
                                                <div
                                                    className={`text-[11px] font-bold whitespace-nowrap ${isNew ? "text-[#2563eb]" : "text-[#71717A]"}`}
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
                            <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
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
                            ) : fundingTypeData.length === 0 ? (
                                <div className="py-8 text-center text-[#71717A] text-sm">
                                    No data available.
                                </div>
                            ) : (
                                fundingTypeData
                                    .slice(0, 5)
                                    .map((agency: any, i: number) => {
                                        const pct =
                                            totalFundingSources > 0
                                                ? Math.round(
                                                      (agency.value /
                                                          totalFundingSources) *
                                                          100,
                                                  )
                                                : 0;
                                        const color =
                                            CHART_COLORS[i] || "#64748b";
                                        return (
                                            <div key={i}>
                                                <div className="flex items-center justify-between py-[9px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                                    <div>
                                                        <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                            {agency.name}
                                                        </div>
                                                        <div className="text-[10px] text-[#71717A] dark:text-[#A1A1AA]">
                                                            {agency.value}{" "}
                                                            projects
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div
                                                            className="text-[13px] font-extrabold"
                                                            style={{ color }}
                                                        >
                                                            {pct}%
                                                        </div>
                                                        <div className="text-[9px] text-[#71717A]">
                                                            of total
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="-mt-1 mb-2">
                                                    <div className="h-1 bg-[#E4E4E7] dark:bg-[#3F3F46] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all"
                                                            style={{
                                                                backgroundColor:
                                                                    color,
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

                {/* ── Footer ── */}
                <footer className="flex items-center justify-between pt-5 border-t border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] text-[10px] font-semibold tracking-widest uppercase">
                    <span>
                        © 2026 R&D Operations · IIT Guwahati · Internal Use Only
                    </span>
                    <a
                        href="mailto:ernd@iitg.ac.in"
                        className="text-[#D97757] hover:underline normal-case font-semibold text-[11px] tracking-normal"
                    >
                        ernd@iitg.ac.in
                    </a>
                </footer>
            </div>
        </div>
    );
}
