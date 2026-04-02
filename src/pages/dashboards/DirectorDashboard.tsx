import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Legend,
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
} from "lucide-react";
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

/** Tooltip for the PI-wise pie chart */
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl px-3 py-2 text-xs font-bold text-slate-200 shadow-xl">
      <p className="text-slate-400 text-[10px] mb-0.5">{payload[0].name}</p>
      <p>{payload[0].value} projects</p>
    </div>
  );
};

/** Tooltip for the FY sanction bar chart */
const BarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const formatted =
    val >= 10000000
      ? `₹${(val / 10000000).toFixed(2)} Cr`
      : val >= 100000
        ? `₹${(val / 100000).toFixed(2)} L`
        : `₹${val.toLocaleString("en-IN")}`;
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl px-3 py-2 text-xs font-bold text-slate-200 shadow-xl">
      <p className="text-slate-400 text-[10px] mb-0.5">
        {payload[0].payload.year}
      </p>
      <p>{formatted}</p>
    </div>
  );
};

export function DirectorDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useFrappeAuth();
  const [time, setTime] = React.useState(new Date());

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

  const { data: dashboardData, isLoading } = useFrappeGetCall<{ message: any }>(
    "rndopsapp.dashboard.get_director_dashboard_data",
  );

  const data = dashboardData?.message || {};

  const { data: deptList } = useFrappeGetDocList("Department_prornd", {
    fields: ["name", "dept_name"],
    limit: 500,
  });

  // Fetch role-based project counts
  const { data: roleBasedProjectsData } = useFrappeGetCall<{ message: any }>(
    "rndopsapp.dashboard.get_role_based_project_counts",
  );

  const roleBasedProjects = roleBasedProjectsData?.message || [];

  // Helper to normalize "2025" or "2026" to "2024-25" / "2025-26"
  const normalizeFyYear = (y: any) => {
    const s = String(y);
    if (s.length === 4 && !isNaN(Number(s))) {
      const yr = parseInt(s, 10);
      return `${yr - 1}-${s.slice(2)}`;
    }
    return s;
  };

  // Helper to merge API data with the 3 required financial years
  const mergeWithRequiredYears = (apiData: any[], defaultItems: any[]) => {
    const result = [...defaultItems]; // start with required defaults
    if (apiData && apiData.length > 0) {
      apiData.forEach((d: any) => {
        const normYear = normalizeFyYear(d.year);
        const existingIdx = result.findIndex((r) => r.year === normYear);
        if (existingIdx >= 0) {
          result[existingIdx] = {
            ...result[existingIdx],
            ...d,
            year: normYear,
          };
        } else {
          result.push({ ...d, year: normYear });
        }
      });
    }
    // sort by year string (e.g. 2023-24 < 2024-25)
    return result.sort((a, b) => a.year.localeCompare(b.year));
  };

  // ── Existing data keys ───────────────────────────────────────────────────
  const projectStatusByYearData = mergeWithRequiredYears(
    data.project_status_by_year || [],
    [
      // { year: "2024-25", registered: 0, ongoing: 0, completed: 0 },
      { year: "2025-26", registered: 0, ongoing: 0, completed: 0 },
    ],
  );

  const fundingTypeData = data.funding_sources || [];

  // ── FY Sanction data ──
  // For now, hide the FY sanction chart if no data available
  // TODO: Add fy_wise_sanction to backend API: rndopsapp.dashboard.get_director_dashboard_data
  const fyWiseSanction = React.useMemo(() => {
    if (data.fy_wise_sanction && data.fy_wise_sanction.length > 0) {
      return mergeWithRequiredYears(data.fy_wise_sanction, [
        { year: "2023-24", amount: 0 },
        { year: "2024-25", amount: 0 },
        { year: "2025-26", amount: 0 },
      ]);
    }
    // Return empty array to hide chart when no data
    return [];
  }, [data.fy_wise_sanction]);

  // ── Overview / finance values ────────────────────────────────────────────
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

  // Process Research vs Consultancy data
  const projectTypeData = React.useMemo(() => {
    return [
      { name: "Research", value: researchProjects, color: "#2563eb" },
      { name: "Consultancy", value: consultancyProjects, color: "#7c3aed" },
    ];
  }, [researchProjects, consultancyProjects]);

  // Process department-wise data
  const departmentData = React.useMemo(() => {
    const deptMap: Record<
      string,
      { dept_name: string; project_count: number }
    > = {};

    roleBasedProjects.forEach((item: any) => {
      const deptKey = item.implementation_department || item.user_department;
      if (deptKey) {
        if (!deptMap[deptKey]) {
          deptMap[deptKey] = { dept_name: deptKey, project_count: 0 };
        }
        deptMap[deptKey].project_count += item.project_count || 0;
      }
    });

    const result = Object.values(deptMap).sort(
      (a, b) => b.project_count - a.project_count,
    );
    console.log("[DirectorDashboard] Department data:", result);
    return result;
  }, [roleBasedProjects]);

  // Process PI-wise data (filter for PI role only)
  const piData = React.useMemo(() => {
    const piMap: Record<
      string,
      { user_name: string; user_email: string; project_count: number }
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
          };
        }
        piMap[key].project_count += item.project_count || 0;
      }
    });

    const result = Object.values(piMap).sort(
      (a, b) => b.project_count - a.project_count,
    );
    console.log("[DirectorDashboard] PI data:", result);
    console.log(
      "[DirectorDashboard] Raw roleBasedProjects:",
      roleBasedProjects,
    );
    return result;
  }, [roleBasedProjects]);

  // State for search/filter
  const [deptSearch, setDeptSearch] = React.useState("");
  const [piSearch, setPiSearch] = React.useState("");

  // Pagination states
  const [deptPage, setDeptPage] = React.useState(1);
  const [piPage, setPiPage] = React.useState(1);

  // Reset page to 1 when search query changes
  React.useEffect(() => {
    setDeptPage(1);
  }, [deptSearch]);
  React.useEffect(() => {
    setPiPage(1);
  }, [piSearch]);

  // Filtered data
  const filteredDepartments = React.useMemo(() => {
    return departmentData.filter((dept) =>
      dept.dept_name.toLowerCase().includes(deptSearch.toLowerCase()),
    );
  }, [departmentData, deptSearch]);

  const filteredPIs = React.useMemo(() => {
    return piData.filter((pi) =>
      pi.user_name.toLowerCase().includes(piSearch.toLowerCase()),
    );
  }, [piData, piSearch]);

  // Paginated logic (10 per page)
  const PAGE_SIZE = 10;

  const paginatedDepartments = React.useMemo(() => {
    const start = (deptPage - 1) * PAGE_SIZE;
    return filteredDepartments.slice(start, start + PAGE_SIZE);
  }, [filteredDepartments, deptPage]);

  const deptTotalPages = Math.max(
    1,
    Math.ceil(filteredDepartments.length / PAGE_SIZE),
  );

  const paginatedPIs = React.useMemo(() => {
    const start = (piPage - 1) * PAGE_SIZE;
    return filteredPIs.slice(start, start + PAGE_SIZE);
  }, [filteredPIs, piPage]);

  const piTotalPages = Math.max(1, Math.ceil(filteredPIs.length / PAGE_SIZE));

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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 w-full relative z-[9999]">
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
                    ? "Director's Overview"
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

        {viewMode === "Director" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                subtext={isLoading ? "" : `${fundUtilPercent}% utilized`}
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
                label="Intl. Agencies"
                value={isLoading ? "—" : String(intl.active_agencies || 0)}
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
              {/* FY Bar Chart — existing */}
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
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={projectStatusByYearData}
                          margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                          barCategoryGap="25%"
                          barGap={2}
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
                            tick={{ fontSize: 10, fill: "#71717A" }}
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
                            dataKey="registered"
                            name="Registered"
                            stackId="a"
                            fill="#2563eb"
                            maxBarSize={22}
                          />
                          <Bar
                            dataKey="ongoing"
                            name="Ongoing"
                            stackId="a"
                            fill="#7c3aed"
                            maxBarSize={22}
                          />
                          <Bar
                            dataKey="completed"
                            name="Completed"
                            stackId="a"
                            fill="#059669"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={22}
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
                    {[
                      ["#2563eb", "Registered"],
                      ["#7c3aed", "Ongoing"],
                      ["#059669", "Completed"],
                    ].map(([color, label]) => (
                      <div
                        key={label}
                        className="flex items-center gap-1.5 text-[10px] font-semibold text-[#71717A]"
                      >
                        <span
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Funding Sources Pie — existing */}
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
                        <ResponsiveContainer width="100%" height="100%">
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
                              {fundingTypeData.map((_: any, i: number) => (
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
                                      CHART_COLORS[i % CHART_COLORS.length],
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

            {/* ── NEW: PI-wise, Project Types & FY Sanction ── */}
            <SectionDivider title="Project Analytics & Distribution" />
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-[14px] mb-6">
              {/* Research vs Consultancy Pie Chart — NEW */}
              <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                  <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-950/20 text-[#7c3aed]">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                      >
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                      </svg>
                    </div>
                    Research vs Consultancy
                  </div>
                </div>
                <div className="p-[18px] px-[22px]">
                  <div className="h-[240px]">
                    {isLoading ? (
                      <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                        Loading chart...
                      </div>
                    ) : totalProjects === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                        No data available
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={projectTypeData}
                            cx="50%"
                            cy="50%"
                            innerRadius="55%"
                            outerRadius="75%"
                            dataKey="value"
                            nameKey="name"
                            paddingAngle={5}
                          >
                            {projectTypeData.map(
                              (entry: any, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ),
                            )}
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
                          <Legend
                            iconType="circle"
                            wrapperStyle={{
                              fontSize: "11px",
                              paddingTop: "12px",
                              fontWeight: 600,
                            }}
                            formatter={(value) => (
                              <span className="text-[#3F3F46] dark:text-[#E4E4E7]">
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  {/* Stats below chart */}
                  <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] pt-3 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <div className="text-[18px] font-extrabold text-[#2563eb]">
                          {researchProjects}
                        </div>
                        <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest">
                          Research
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[18px] font-extrabold text-[#7c3aed]">
                          {consultancyProjects}
                        </div>
                        <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest">
                          Consultancy
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PI-wise Pie Chart — NEW */}
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
                    PI-wise Project Distribution
                  </div>
                </div>
                <div className="p-[18px] px-[22px]">
                  <div className="h-[240px]">
                    {isLoading ? (
                      <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                        Loading chart...
                      </div>
                    ) : piData.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                        No data available
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={piData.slice(0, 10)}
                            cx="50%"
                            cy="45%"
                            outerRadius="68%"
                            dataKey="project_count"
                            nameKey="user_name"
                          >
                            {piData.slice(0, 10).map((_: any, i: number) => (
                              <Cell
                                key={i}
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<PieTooltip />} />
                          <Legend
                            iconType="circle"
                            wrapperStyle={{
                              fontSize: "10px",
                              paddingTop: "8px",
                            }}
                            formatter={(value) => (
                              <span className="text-[#71717A] dark:text-[#A1A1AA]">
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* FY-wise Sanction Bar — NEW, tighter bars, 3 correct years */}
              <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
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
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </div>
                    Total Sanction Amount (FY Wise)
                  </div>
                </div>
                <div className="p-[18px] px-[22px]">
                  <div className="h-[240px]">
                    {isLoading ? (
                      <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                        Loading chart...
                      </div>
                    ) : fyWiseSanction.length === 0 ? (
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
                          No FY sanction data available
                        </p>
                        <p className="text-xs text-[#A1A1AA]">
                          This data will be available once configured in the
                          backend
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={fyWiseSanction}
                          margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                          barCategoryGap="35%"
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
                            tick={{
                              fontSize: 11,
                              fontWeight: 700,
                              fill: "#71717A",
                            }}
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
                            tick={{ fontSize: 10, fill: "#71717A" }}
                          />
                          <Tooltip
                            content={<BarTooltip />}
                            cursor={{ fill: "#f4f4f5" }}
                          />
                          <Bar
                            dataKey="amount"
                            name="Sanctioned"
                            fill="#2563eb"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={56}
                          >
                            {fyWiseSanction.map((_: any, i: number) => (
                              <Cell
                                key={i}
                                fill={["#2563eb", "#7c3aed", "#059669"][i % 3]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
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
                        {[
                          "#",
                          "Project",
                          "PI / Lead",
                          "Department",
                          "Status",
                          "Amount",
                        ].map((h) => (
                          <th
                            key={h}
                            className="p-2.5 px-3.5 text-[10px] font-bold text-[#71717A] uppercase tracking-widest text-left"
                          >
                            {h}
                          </th>
                        ))}
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
                        topProjects.map((proj: any, idx: number) => (
                          <tr
                            key={proj.project_id || idx}
                            className="border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors"
                          >
                            <td className="p-3 px-3.5 align-middle text-[11px] font-extrabold text-[#71717A] font-mono">
                              {String(idx + 1).padStart(2, "0")}
                            </td>
                            <td className="p-3 px-3.5 align-middle">
                              <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                {proj.project_title || "Untitled"}
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
                                  <DepartmentName name={proj.department} />
                                ) : (
                                  "—"
                                )}
                              </span>
                            </td>
                            <td className="p-3 px-3.5 align-middle">
                              <StatusBadge
                                status={proj.status || proj.workflow_state}
                              />
                            </td>
                            <td className="p-3 px-3.5 align-middle font-extrabold text-[13px] text-[#059669] whitespace-nowrap">
                              {formatCurrency(proj.total_budget_amount || 0)}
                            </td>
                          </tr>
                        ))
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
                        <rect x="2" y="3" width="20" height="14" rx="2" />
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
                        {isLoading ? "—" : formatCurrency(fundAlloc)}
                      </div>
                      <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mt-0.5">
                        Total Sanctioned
                      </div>
                    </div>
                    <div className="flex-1 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg p-2.5 text-center">
                      <div className="text-[18px] font-extrabold tracking-[-0.03em] text-[#059669]">
                        {isLoading ? "—" : formatCurrency(fundUtilized)}
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
                        value: String(proposals.total_proposals || 0),
                        color: "text-[#3F3F46] dark:text-[#E4E4E7]",
                      },
                      {
                        label: "Proposed Budget (Review)",
                        value: formatCurrency(
                          proposals.proposed_budget_total || 0,
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
              {/* Team & Project Mix */}
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
                          style={{ backgroundColor: item.color }}
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
                      {isLoading ? "—" : proposals.total_proposals || 0}
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
                    recentProjects.slice(0, 5).map((proj: any, idx: number) => {
                      const d = proj.creation ? new Date(proj.creation) : null;
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
                          className="flex items-center py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 gap-2.5"
                        >
                          <div className="text-[11px] font-extrabold text-[#71717A] w-5 shrink-0 font-mono">
                            {String(idx + 1).padStart(2, "0")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                              {proj.project_title || "Untitled"}
                            </div>
                            <div className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] mt-[1px]">
                              {proj.department ? (
                                <DepartmentName name={proj.department} />
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
                                (agency.value / totalFundingSources) * 100,
                              )
                            : 0;
                        const color = CHART_COLORS[i] || "#64748b";
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between py-[9px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                              <div>
                                <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                  {agency.name}
                                </div>
                                <div className="text-[10px] text-[#71717A] dark:text-[#A1A1AA]">
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
                          className="hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-[#2563eb] font-bold text-[14px] border border-blue-100 dark:border-blue-800 shrink-0">
                                <Building2 size={16} />
                              </div>
                              <div>
                                <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
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
                            <button className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#A1A1AA] hover:text-[#2563eb] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
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

              {/* Pagination Controls */}
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
                <h2 className="text-[16px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7]">
                  Investigator Workloads
                </h2>
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
                  <button className="inline-flex items-center gap-2 px-4 py-2 text-[13px] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA] font-bold transition-all shadow-sm">
                    <Filter size={16} />
                    Filter
                  </button>
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
                      paginatedPIs.map((pi: any, index: number) => {
                        return (
                          <tr
                            key={pi.user_email || index}
                            className="hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3.5">
                                <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-[#4f46e5] font-bold text-[14px] border border-indigo-100 dark:border-indigo-800 shrink-0">
                                  {pi.user_name
                                    ? pi.user_name.charAt(0).toUpperCase()
                                    : "U"}
                                </div>
                                <div>
                                  <p className="text-[14px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                    {pi.user_name || "Unknown PI"}
                                  </p>
                                  <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                                    {pi.user_email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 inline-flex bg-slate-100 dark:bg-[#27272A] px-2.5 py-1 rounded-full border border-[#E4E4E7] dark:border-[#3F3F46]">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                  {pi.project_count}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="p-2 text-[#71717A] dark:text-[#A1A1AA] hover:text-[#2563eb] hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-transparent rounded-lg transition-all outline-none inline-flex items-center justify-center">
                                <ArrowRight size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-6 py-16 text-center text-[#71717A] font-medium"
                        >
                          {piSearch
                            ? "No matching investigators found."
                            : "No Investigators found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
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
        <footer className="flex items-center justify-between pt-5 border-t border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] text-[10px] font-semibold tracking-widest uppercase">
          <span>© 2026 R&D Operations · IIT Guwahati · Internal Use Only</span>
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
