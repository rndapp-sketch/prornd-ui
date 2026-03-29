import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
    useFrappeAuth,
    useFrappeGetDoc,
    useFrappeGetCall,
} from "frappe-react-sdk";

import { AnalyticsCard, CurrentTime } from "@/components/DashboardCards";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import {
    Briefcase,
    Building2,
    Landmark,
    Globe,
    Users,
    TrendingUp,
    CheckCircle,
    FileText,
    Mail,
    IndianRupee,
    Scale,
    ChevronRight,
    Hash,
    Clock,
} from "lucide-react";

const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#A333C8",
    "#21BA45",
    "#F2711C",
];

export function DirectorDashboard() {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();

    const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
        fields: ["full_name", "user_roles"],
        enabled: !!currentUser,
    });

    const fullName = userData?.full_name || currentUser || "Guest";

    // Fetch API Dashboard Data
    const { data: dashboardData, isLoading } = useFrappeGetCall<{
        message: any;
    }>("rndopsapp.dashboard.get_director_dashboard_data");

    const data = dashboardData?.message || {};

    const projectStatusByYearData = data.project_status_by_year || [];
    const fundingTypeData = data.funding_sources || [];

    // Formatting currency
    const formatCurrency = (amount: number) => {
        if (!amount) return "₹0";
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
        return `₹${amount.toLocaleString("en-IN")}`;
    };

    const overview = data.project_overview || {};
    const funds = data.funding_analytics || {};
    const intl = data.international_collaboration || {};
    const proposals = data.proposal_analytics || {};
    const ipr = data.ipr_analytics || {};
    const topProjects = data.top_funded_projects || [];
    const recentProjects = data.recent_projects || [];

    // Default values if data isn't loaded yet
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

    return (
        <div className="bg-zinc-50/50 dark:bg-[#09090b] min-h-screen font-sans">
            <div className="flex-1 p-4 md:p-6 lg:p-10 max-w-[1600px] mx-auto">
                <div className="w-full">
                    {/* Header */}
                    <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                                Director's Overview
                            </h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                Welcome back, {fullName}. Here's what's
                                happening across the institute.
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate("/projects-view")}
                                className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
                            >
                                <Briefcase className="size-4" /> All Projects
                            </button>
                            <div className="hidden sm:block px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                <CurrentTime />
                            </div>
                        </div>
                    </header>

                    {/* Top KPI Strip */}
                    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6 mb-8">
                        <AnalyticsCard
                            title="Total Projects"
                            value={isLoading ? "..." : String(totalProjects)}
                            subtitle=""
                            icon={
                                <Building2 className="size-5 text-indigo-500" />
                            }
                        />
                        <AnalyticsCard
                            title="Total Allocation"
                            value={
                                isLoading ? "..." : formatCurrency(fundAlloc)
                            }
                            subtitle="Fiscal Year Budget"
                            icon={
                                <IndianRupee className="size-5 text-emerald-600" />
                            }
                        />
                        <AnalyticsCard
                            title="Ongoing Projects"
                            value={isLoading ? "..." : String(ongoingProjects)}
                            subtitle="Currently Active"
                            icon={
                                <CheckCircle className="size-5 text-emerald-500" />
                            }
                        />
                        <AnalyticsCard
                            title="Patents Filed"
                            value={
                                isLoading
                                    ? "..."
                                    : String(ipr.total_patents_filed || 0)
                            }
                            subtitle="Intellectual Property"
                            icon={<Scale className="size-5 text-amber-500" />}
                        />
                        <AnalyticsCard
                            title="Intl. Agencies"
                            value={
                                isLoading
                                    ? "..."
                                    : String(intl.active_agencies || 0)
                            }
                            subtitle="Active Global MOUs"
                            icon={<Globe className="size-5 text-blue-500" />}
                        />
                    </section>

                    {/* Charts Row */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Bar Chart */}
                        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                                <TrendingUp className="size-5 text-zinc-400" />{" "}
                                Project Status trajectory
                            </h3>
                            <div className="h-80 flex-1 min-h-[300px]">
                                {isLoading ? (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
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
                                                top: 5,
                                                right: 10,
                                                left: -20,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="#e4e4e7"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="year"
                                                tick={{
                                                    fontSize: 12,
                                                    fill: "#71717a",
                                                }}
                                                axisLine={{ stroke: "#e4e4e7" }}
                                                tickLine={false}
                                                dy={10}
                                            />
                                            <YAxis
                                                tick={{
                                                    fontSize: 12,
                                                    fill: "#71717a",
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                                dx={-10}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: "0.75rem",
                                                    border: "1px solid #e4e4e7",
                                                    boxShadow:
                                                        "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                                }}
                                                cursor={{ fill: "#f4f4f5" }}
                                            />
                                            <Legend
                                                wrapperStyle={{
                                                    fontSize: 12,
                                                    paddingTop: "15px",
                                                }}
                                                iconType="circle"
                                            />
                                            <Bar
                                                dataKey="registered"
                                                stackId="a"
                                                fill="#0088FE"
                                                name="Registered"
                                                radius={[0, 0, 4, 4]}
                                                maxBarSize={40}
                                            />
                                            <Bar
                                                dataKey="ongoing"
                                                stackId="a"
                                                fill="#00C49F"
                                                name="Ongoing"
                                                maxBarSize={40}
                                            />
                                            <Bar
                                                dataKey="completed"
                                                stackId="a"
                                                fill="#FFBB28"
                                                name="Completed"
                                                radius={[4, 4, 0, 0]}
                                                maxBarSize={40}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                        No data available
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pie Chart */}
                        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                                <Landmark className="size-5 text-zinc-400" />{" "}
                                Funding Sources
                            </h3>
                            <div className="h-80 flex-1 relative min-h-[300px]">
                                {isLoading ? (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                        Loading chart...
                                    </div>
                                ) : fundingTypeData.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <PieChart>
                                            <Pie
                                                data={fundingTypeData}
                                                cx="50%"
                                                cy="45%"
                                                labelLine={false}
                                                outerRadius={110}
                                                innerRadius={70}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {fundingTypeData.map(
                                                    (
                                                        entry: any,
                                                        index: number,
                                                    ) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={
                                                                COLORS[
                                                                    index %
                                                                        COLORS.length
                                                                ]
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: "0.75rem",
                                                    border: "1px solid #e4e4e7",
                                                }}
                                                formatter={(
                                                    value: number,
                                                    name: string,
                                                ) => [
                                                    `${value} Projects`,
                                                    name,
                                                ]}
                                            />
                                            <Legend
                                                layout="horizontal"
                                                verticalAlign="bottom"
                                                align="center"
                                                wrapperStyle={{
                                                    fontSize: 12,
                                                    bottom: -10,
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                        No data available
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Bottom Detailed Row */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Deep Dive Stats */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
                                <h3 className="font-bold text-lg border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                                    <Landmark className="size-5 text-zinc-400" />{" "}
                                    Financial Breakdown
                                </h3>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                                        Utilized Funds
                                    </span>
                                    <span className="font-bold text-zinc-900 dark:text-white">
                                        {isLoading
                                            ? "..."
                                            : formatCurrency(fundUtilized)}{" "}
                                        <span className="text-xs text-zinc-400 font-normal">
                                            ({fundUtilPercent}%)
                                        </span>
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                                        Remaining Balance
                                    </span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {isLoading
                                            ? "..."
                                            : formatCurrency(fundRemaining)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                    <span className="text-zinc-500 dark:text-zinc-400">
                                        Proposed Budget (Under Review)
                                    </span>
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                                        {isLoading
                                            ? "..."
                                            : formatCurrency(
                                                  proposals.proposed_budget_total ||
                                                      0,
                                              )}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
                                <h3 className="font-bold text-lg border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                                    <Users className="size-5 text-zinc-400" />{" "}
                                    Team & Structure
                                </h3>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                                        Project Categories
                                    </span>
                                    <div className="text-right">
                                        <span className="font-bold text-zinc-900 dark:text-white">
                                            {isLoading
                                                ? "..."
                                                : researchProjects}{" "}
                                            <span className="text-xs text-zinc-400 font-normal">
                                                Res
                                            </span>
                                        </span>
                                        <span className="mx-2 text-zinc-300 dark:text-zinc-700">
                                            |
                                        </span>
                                        <span className="font-bold text-zinc-900 dark:text-white">
                                            {isLoading
                                                ? "..."
                                                : consultancyProjects}{" "}
                                            <span className="text-xs text-zinc-400 font-normal">
                                                Cons
                                            </span>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                                        Total Project Staff
                                    </span>
                                    <span className="font-bold text-zinc-900 dark:text-white">
                                        {isLoading ? "..." : totalStaffCount}{" "}
                                        Members
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                                        Proposals Under Review
                                    </span>
                                    <span className="font-bold text-zinc-900 dark:text-white">
                                        {isLoading
                                            ? "..."
                                            : proposals.total_proposals || 0}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Top Funded Projects List */}
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-full overflow-hidden">
                            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight">
                                        Top Funded
                                    </h3>
                                </div>
                                <button
                                    onClick={() => navigate("/projects-view")}
                                    className="text-xs text-[#D97757] hover:bg-[#D97757]/10 px-2 py-1 rounded transition-colors font-semibold flex items-center gap-1"
                                >
                                    View All{" "}
                                    <ChevronRight className="h-3 w-3" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto divide-y divide-zinc-50 dark:divide-zinc-800/50">
                                {isLoading ? (
                                    <div className="p-8 text-center text-zinc-400">
                                        Loading projects...
                                    </div>
                                ) : topProjects.length === 0 ? (
                                    <div className="p-8 text-center text-zinc-400">
                                        No projects found.
                                    </div>
                                ) : (
                                    topProjects.map(
                                        (proj: any, idx: number) => (
                                            <div
                                                key={proj.project_id || idx}
                                                className="px-6 py-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors flex items-center justify-between gap-4 group"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#D97757] transition-colors">
                                                        {proj.project_title ||
                                                            "Untitled Project"}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                                                        <span className="flex items-center gap-1">
                                                            <Hash className="size-3" />{" "}
                                                            {proj.project_id}
                                                        </span>
                                                        <span className="text-zinc-300 dark:text-zinc-700">
                                                            •
                                                        </span>
                                                        <span>
                                                            {proj.pi_name}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                                                        {proj.department}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-md">
                                                        {formatCurrency(
                                                            proj.total_budget_amount ||
                                                                0,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ),
                                    )
                                )}
                            </div>
                        </div>

                        {/* Recent Projects List */}
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-full overflow-hidden">
                            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-blue-500" />
                                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight">
                                        Recent Registrations
                                    </h3>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto divide-y divide-zinc-50 dark:divide-zinc-800/50">
                                {isLoading ? (
                                    <div className="p-8 text-center text-zinc-400">
                                        Loading projects...
                                    </div>
                                ) : recentProjects.length === 0 ? (
                                    <div className="p-8 text-center text-zinc-400">
                                        No projects found.
                                    </div>
                                ) : (
                                    recentProjects.map(
                                        (proj: any, idx: number) => (
                                            <div
                                                key={proj.project_id || idx}
                                                className="px-6 py-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors flex items-center justify-between gap-4 group"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {proj.project_title ||
                                                            "Untitled Project"}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                                                        <span className="flex items-center gap-1">
                                                            <Hash className="size-3" />{" "}
                                                            {proj.project_id}
                                                        </span>
                                                        <span className="text-zinc-300 dark:text-zinc-700">
                                                            •
                                                        </span>
                                                        <span>
                                                            {proj.pi_name}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                                                        {proj.department}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-xs font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                                        {proj.creation
                                                            ? new Date(
                                                                  proj.creation,
                                                              ).toLocaleDateString(
                                                                  undefined,
                                                                  {
                                                                      month: "short",
                                                                      day: "numeric",
                                                                      year: "numeric",
                                                                  },
                                                              )
                                                            : "Unknown"}
                                                    </p>
                                                </div>
                                            </div>
                                        ),
                                    )
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Footer */}
                    <footer className="text-center text-zinc-500 dark:text-zinc-400 mt-8 pb-4">
                        <div className="flex items-center justify-center space-x-2 text-xs">
                            <Mail className="size-3.5" />
                            <p>
                                For any query, e-mail to{" "}
                                <a
                                    href="mailto:ernd@iitg.ac.in"
                                    className="text-[#D97757] hover:underline font-semibold"
                                >
                                    ernd@iitg.ac.in
                                </a>
                            </p>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}
