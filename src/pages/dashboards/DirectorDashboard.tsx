// import * as React from "react";
// import { useNavigate, useSearchParams } from "react-router-dom";
// import {
//     useFrappeAuth,
//     useFrappeGetDoc,
//     useFrappeGetCall,
//     useFrappeGetDocList,
// } from "frappe-react-sdk";
// import {
//     BarChart,
//     Bar,
//     XAxis,
//     YAxis,
//     CartesianGrid,
//     Tooltip,
//     ResponsiveContainer,
//     PieChart,
//     Pie,
//     Cell,
//     Legend,
// } from "recharts";
// import {
//     FileDown,
//     BarChart3,
//     Users,
//     Search,
//     Filter,
//     Building2,
//     ArrowRight,
//     ChevronLeft,
//     ChevronRight,
//     X,
// } from "lucide-react";
// import { generateDirectorReportHtml } from "@/utils/directorReportHtml";

// const CHART_COLORS = [
//     "#2563eb",
//     "#7c3aed",
//     "#059669",
//     "#d97706",
//     "#0284c7",
//     "#e11d48",
//     "#64748b",
// ];

// const formatCurrency = (amount: number): string => {
//     if (!amount) return "₹0";
//     if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
//     if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
//     return `₹${amount.toLocaleString("en-IN")}`;
// };

// function SectionDivider({ title }: { title: string }) {
//     return (
//         <div className="flex items-center gap-2.5 mb-3 mt-1">
//             <span className="text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.1em] whitespace-nowrap">
//                 {title}
//             </span>
//             <div className="flex-1 h-[1px] bg-[#E4E4E7] dark:bg-[#3F3F46]" />
//         </div>
//     );
// }

// function KpiCard({
//     label,
//     value,
//     subtext,
//     icon,
//     valueColor,
//     iconBg,
//     circleColor,
//     onClick,
//     description,
//     badges,
//     onBadgeClick,
// }: {
//     label: string;
//     value: string;
//     subtext: string;
//     icon: React.ReactNode;
//     valueColor: string;
//     iconBg: string;
//     circleColor: string;
//     onClick?: () => void;
//     description?: string;
//     badges?: Array<{
//         label: string;
//         count: number;
//         dotColor: string;
//         bgClass: string;
//         textClass: string;
//         title?: string;
//         originalState?: string;
//     }>;
//     onBadgeClick?: (badgeLabel: string) => void;
// }) {
//     return (
//         <div
//             onClick={onClick}
//             className={`bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-6 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all flex flex-col h-full min-h-[160px]${onClick ? " cursor-pointer select-none" : ""}`}
//         >
//             <div
//                 className="absolute bottom-0 right-0 w-[90px] h-[90px] rounded-full translate-x-5 translate-y-5"
//                 style={{ backgroundColor: circleColor, opacity: 0.07 }}
//             />
//             <div
//                 className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0 transition-transform"
//                 style={{ backgroundColor: iconBg, color: circleColor }}
//             >
//                 {icon}
//             </div>
//             <div className="text-[12px] font-extrabold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mb-0.5 shadow-sm">
//                 {label}
//             </div>
//             {description && (
//                 <div className="text-[10px] text-[#A1A1AA] dark:text-[#71717A] font-medium mb-1 leading-tight">
//                     {description}
//                 </div>
//             )}
//             <div
//                 className={`text-[32px] font-extrabold tracking-tight leading-none mb-2 drop-shadow-sm ${valueColor}`}
//             >
//                 {value}
//             </div>

//             <div className="mt-auto pt-4 w-full">
//                 {badges && badges.length > 0 ? (
//                     <div className="flex items-center gap-2 flex-wrap">
//                         {badges.map((b) => (
//                             <span
//                                 key={b.label}
//                                 onClick={
//                                     onBadgeClick
//                                         ? (e) => {
//                                             e.stopPropagation();
//                                             onBadgeClick(b.originalState || b.label);
//                                         }
//                                         : undefined
//                                 }
//                                 className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 ${b.bgClass} ${b.textClass}${onBadgeClick ? " cursor-pointer hover:brightness-95 transition-all" : ""}`}
//                                 title={b.title}
//                             >
//                                 <span className={`w-2 h-2 rounded-full ${b.dotColor}`} />
//                                 {b.count} {b.label}
//                             </span>
//                         ))}
//                     </div>
//                 ) : (
//                     <div className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] font-semibold leading-tight mt-2">
//                         {subtext || "\u00A0"}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }

// function StatusBadge({ status }: { status?: string }) {
//     if (!status) return null;
//     const s = status.toLowerCase();
//     if (s.includes("ongoing") || s.includes("active"))
//         return (
//             <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wide bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
//                 <span className="w-[5px] h-[5px] rounded-full bg-blue-500" />
//                 Ongoing
//             </span>
//         );
//     if (s.includes("complet"))
//         return (
//             <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wide bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
//                 <span className="w-[5px] h-[5px] rounded-full bg-emerald-500" />
//                 Completed
//             </span>
//         );
//     return (
//         <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wide bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
//             <span className="w-[5px] h-[5px] rounded-full bg-amber-500" />
//             {status}
//         </span>
//     );
// }

// /** Tooltip for the sanction bar chart */
// const BarTooltip = ({ active, payload }: any) => {
//     if (!active || !payload?.length) return null;
//     return (
//         <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl px-3 py-2 text-xs font-bold text-slate-200 shadow-xl">
//             <p className="text-slate-400 text-[10px] mb-1 font-bold">
//                 {payload[0].payload.year}
//             </p>
//             {payload.map((entry: any, i: number) => {
//                 const val = entry.value;
//                 const formatted =
//                     val >= 10000000
//                         ? `₹${(val / 10000000).toFixed(2)} Cr`
//                         : val >= 100000
//                             ? `₹${(val / 100000).toFixed(2)} L`
//                             : `₹${val.toLocaleString("en-IN")}`;
//                 return (
//                     <p key={i} style={{ color: entry.fill }} className="text-[11px]">
//                         {entry.name}: {formatted}
//                     </p>
//                 );
//             })}
//         </div>
//     );
// };

// export function DirectorDashboard() {
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const { currentUser } = useFrappeAuth();
//     const [time, setTime] = React.useState(new Date());
//     const [kpiModal, setKpiModal] = React.useState<{
//         type: string;
//         title: string;
//     } | null>(null);
//     const [kpiPage, setKpiPage] = React.useState(1);
//     const [kpiTab, setKpiTab] = React.useState<"ongoing" | "submitted">(
//         "ongoing"
//     );
//     const [kpiAllocTab, setKpiAllocTab] = React.useState<string>("ongoing");
//     const [piModalPage, setPiModalPage] = React.useState(1);
//     const [deptModalPage, setDeptModalPage] = React.useState(1);
//     const PI_PROJECTS_PAGE_SIZE = 2;
//     const DEPT_MODAL_PAGE_SIZE = 10;
//     const KPI_PAGE_SIZE = 10;

//     React.useEffect(() => {
//         const t = setInterval(() => setTime(new Date()), 1000);
//         return () => clearInterval(t);
//     }, []);

//     const viewModeParam = searchParams.get("view") as
//         | "Director"
//         | "Department"
//         | "PI";
//     const viewMode = viewModeParam || "Director";

//     const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
//         fields: ["full_name", "user_roles"],
//         enabled: !!currentUser,
//     });

//     const fullName = userData?.full_name || currentUser || "Guest";

//     const { data: dashboardData, isLoading } = useFrappeGetCall<{ message: any }>(
//         "rndopsapp.dashboard.get_director_dashboard_data"
//     );

//     const data = dashboardData?.message || {};

//     const { data: deptList } = useFrappeGetDocList("Department_prornd", {
//         fields: ["name", "dept_name"],
//         limit: 500,
//     });

//     const getDeptName = React.useCallback(
//         (idOrName: string) => {
//             if (!idOrName) return "—";
//             if (!deptList) return idOrName;
//             const found = deptList.find(
//                 (d: any) => d.name === idOrName || d.dept_name === idOrName
//             );
//             return found ? found.dept_name : idOrName;
//         },
//         [deptList]
//     );

//     // Fetch role-based project counts
//     const { data: roleBasedProjectsData } = useFrappeGetCall<{ message: any }>(
//         "rndopsapp.dashboard.get_role_based_project_counts"
//     );

//     const roleBasedProjects = roleBasedProjectsData?.message || [];

//     // Fetch all projects with start/end dates for year-wise chart and KPI modals
//     const { data: allProjectsList } = useFrappeGetDocList(
//         "Project Registration",
//         {
//             fields: [
//                 "name",
//                 "project_no",
//                 "project_title",
//                 "pi_webmail",
//                 "implementation_department",
//                 "workflow_state",
//                 "project_type",
//                 "total_budget_amount",
//                 "grand_total_proposal",
//                 "prj_start_date",
//                 "prj_end_date",
//             ],
//             limit: 2000,
//         }
//     );

//     // ── Overview / finance values ─────────────────────────────────────────────
//     const overview = data.project_overview || {};
//     const funds = data.funding_analytics || {};
//     const intl = data.international_collaboration || {};
//     const proposals = data.proposal_analytics || {};
//     const ipr = data.ipr_analytics || {};
//     const topProjects = data.top_funded_projects || [];
//     const recentProjects = data.recent_projects || [];

//     // ── Project status by year — directly from backend API ───────────────────
//     const projectStatusByYearData = React.useMemo(() => {
//         const raw: any[] = data.project_status_by_year || [];
//         if (raw.length === 0) return [];
//         return [...raw].sort((a, b) =>
//             String(a.year).localeCompare(String(b.year))
//         );
//     }, [data.project_status_by_year]);

//     const fundingTypeData = data.funding_sources || [];

//     // ── Status counts for Total Projects card ────────────────────────────────
//     const projectStatusCounts = React.useMemo(
//         () => ({
//             ongoing: overview.ongoing_projects || 0,
//             submitted: overview.submitted_projects || 0,
//         }),
//         [overview]
//     );

//     const totalProjectBadges = React.useMemo(
//         () => [
//             {
//                 label: "Ongoing",
//                 originalState: "ongoing",
//                 count: projectStatusCounts.ongoing,
//                 dotColor: "bg-emerald-500",
//                 bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
//                 textClass: "text-emerald-700 dark:text-emerald-400",
//             },
//             {
//                 label: "Submitted",
//                 originalState: "submitted",
//                 count: projectStatusCounts.submitted,
//                 title: "Registration but pending sanction",
//                 dotColor: "bg-amber-400",
//                 bgClass: "bg-amber-50 dark:bg-amber-950/30",
//                 textClass: "text-amber-700 dark:text-amber-400",
//             },
//         ],
//         [projectStatusCounts]
//     );

//     const allocBadges = React.useMemo(
//         () => [
//             {
//                 label: "Ongoing",
//                 originalState: "ongoing",
//                 count: overview.ongoing_projects || 0,
//                 dotColor: "bg-emerald-500",
//                 bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
//                 textClass: "text-emerald-700 dark:text-emerald-400",
//             },
//             {
//                 label: "Submitted",
//                 originalState: "submitted",
//                 count: overview.submitted_projects || 0,
//                 title: "Registration but pending sanction",
//                 dotColor: "bg-amber-400",
//                 bgClass: "bg-amber-50 dark:bg-amber-950/30",
//                 textClass: "text-amber-700 dark:text-amber-400",
//             },
//         ],
//         [overview]
//     );

//     // ── KPI modal rows ────────────────────────────────────────────────────────
//     const kpiModalRows = React.useMemo(() => {
//         const projects: any[] = allProjectsList ?? [];
//         if (!kpiModal) return [];

//         const submittedIds = new Set<string>(overview.submitted_project_nos || []);
//         const ongoingIds = new Set<string>(overview.ongoing_project_nos || []);

//         const isSubmitted = (id: string) => submittedIds.has(id);
//         const isOngoing = (id: string) => ongoingIds.has(id);

//         if (kpiModal.type === "total") {
//             if (kpiTab === "submitted")
//                 return projects.filter((p) => isSubmitted(p.name));
//             return projects.filter((p) => isOngoing(p.name));
//         }
//         if (kpiModal.type === "allocation") {
//             let base: any[];
//             if (kpiAllocTab === "submitted") {
//                 base = projects.filter((p) => isSubmitted(p.name));
//             } else {
//                 base = projects.filter((p) => isOngoing(p.name));
//             }
//             return [...base].sort(
//                 (a, b) =>
//                     (b.total_budget_amount || b.grand_total_proposal || 0) -
//                     (a.total_budget_amount || a.grand_total_proposal || 0)
//             );
//         }
//         if (kpiModal.type === "ongoing")
//             return projects.filter((p) => isOngoing(p.name));
//         return projects;
//     }, [allProjectsList, kpiModal, kpiTab, kpiAllocTab, overview]);

//     const kpiTotalPages = Math.max(
//         1,
//         Math.ceil(kpiModalRows.length / KPI_PAGE_SIZE)
//     );
//     const kpiPagedRows = kpiModalRows.slice(
//         (kpiPage - 1) * KPI_PAGE_SIZE,
//         kpiPage * KPI_PAGE_SIZE
//     );

//     // ── FIX: openKpiModal now initialises kpiAllocTab to "ongoing" (not raw workflow state) ──
//     const openKpiModal = (type: string, title: string) => {
//         setKpiModal({ type, title });
//         setKpiPage(1);
//         setKpiTab("ongoing");
//         setKpiAllocTab("ongoing");
//     };

//     // ── FIX: openKpiModalWithTab normalises raw state labels to tab keys ──
//     const openKpiModalWithTab = (type: string, title: string, tab: string) => {
//         setKpiModal({ type, title });
//         setKpiPage(1);
//         const t = tab.toLowerCase();
//         if (type === "total") {
//             setKpiTab(t.includes("submit") || t.includes("pending") ? "submitted" : "ongoing");
//         } else if (type === "allocation") {
//             setKpiAllocTab(t.includes("submit") || t.includes("pending") ? "submitted" : "ongoing");
//         }
//     };

//     const closeKpiModal = () => setKpiModal(null);

//     // ── Start vs End Sanction data ────────────────────────────────────────────
//     const startEndSanctionData = React.useMemo(() => {
//         const yearMap: Record<
//             string,
//             { year: string; startAmount: number; endAmount: number }
//         > = {};

//         (allProjectsList ?? []).forEach((proj: any) => {
//             const startYear = proj.prj_start_date
//                 ? new Date(proj.prj_start_date).getFullYear().toString()
//                 : null;
//             const endYear = proj.prj_end_date
//                 ? new Date(proj.prj_end_date).getFullYear().toString()
//                 : null;
//             const amount =
//                 proj.total_budget_amount || proj.grand_total_proposal || 0;

//             if (startYear) {
//                 if (!yearMap[startYear])
//                     yearMap[startYear] = {
//                         year: startYear,
//                         startAmount: 0,
//                         endAmount: 0,
//                     };
//                 yearMap[startYear].startAmount += amount;
//             }
//             if (endYear) {
//                 if (!yearMap[endYear])
//                     yearMap[endYear] = { year: endYear, startAmount: 0, endAmount: 0 };
//                 yearMap[endYear].endAmount += amount;
//             }
//         });

//         return Object.values(yearMap).sort((a, b) =>
//             a.year.localeCompare(b.year)
//         );
//     }, [allProjectsList]);

//     // ── Derived display values ────────────────────────────────────────────────
//     const totalProjects = overview.total_projects || 0;
//     const ongoingProjects = overview.ongoing_projects || 0;
//     const totalStaffCount = overview.total_staff_count || 0;

//     const fundAlloc = funds.total_allocation || 0;
//     const fundUtilized = funds.utilized || 0;
//     const fundRemaining = funds.remaining || 0;
//     const fundUtilPercent = fundAlloc > 0
//         ? ((fundUtilized / fundAlloc) * 100).toFixed(1)
//         : "0";

//     const totalFundingSources = fundingTypeData.reduce(
//         (sum: number, item: any) => sum + (item.value || 0),
//         0
//     );

//     // ── FIX: Derive researchProjects & consultancyProjects from allProjectsList
//     //    filtered to the same submitted+ongoing set used by totalProjects,
//     //    so Research + Consultancy always equals totalProjects. ─────────────────
//     const { researchProjects, consultancyProjects } = React.useMemo(() => {
//         const submittedIds = new Set<string>(overview.submitted_project_nos || []);
//         const ongoingIds = new Set<string>(overview.ongoing_project_nos || []);
//         let research = 0;
//         let consultancy = 0;
//         (allProjectsList ?? []).forEach((p: any) => {
//             if (!submittedIds.has(p.name) && !ongoingIds.has(p.name)) return;
//             const type = (p.project_type || "").toLowerCase();
//             if (type.includes("research")) research++;
//             else if (type.includes("consult")) consultancy++;
//         });
//         return { researchProjects: research, consultancyProjects: consultancy };
//     }, [allProjectsList, overview]);

//     // Process Research vs Consultancy data
//     const projectTypeData = React.useMemo(() => {
//         return [
//             { name: "Research", value: researchProjects, color: "#2563eb" },
//             { name: "Consultancy", value: consultancyProjects, color: "#7c3aed" },
//         ];
//     }, [researchProjects, consultancyProjects]);

//     // Process department-wise data
//     const departmentData = React.useMemo(() => {
//         const deptMap: Record<
//             string,
//             { dept_name: string; project_count: number; investigators: any[] }
//         > = {};

//         roleBasedProjects.forEach((item: any) => {
//             const deptKey = item.implementation_department || item.user_department;
//             if (deptKey) {
//                 if (!deptMap[deptKey]) {
//                     deptMap[deptKey] = {
//                         dept_name: deptKey,
//                         project_count: 0,
//                         investigators: [],
//                     };
//                 }
//                 deptMap[deptKey].project_count += item.project_count || 0;

//                 if (
//                     item.user_name &&
//                     item.project_count > 0 &&
//                     (item.role?.includes("PI") ||
//                         item.role?.includes("Principal Investigator") ||
//                         item.role?.includes("Permanent Employee"))
//                 ) {
//                     const existing = deptMap[deptKey].investigators.find(
//                         (i) => i.user_email === item.user_email
//                     );
//                     if (existing) {
//                         existing.project_count += item.project_count;
//                     } else {
//                         deptMap[deptKey].investigators.push({
//                             user_name: item.user_name,
//                             user_email: item.user_email,
//                             project_count: item.project_count,
//                         });
//                     }
//                 }
//             }
//         });

//         const result = Object.values(deptMap).sort(
//             (a, b) => b.project_count - a.project_count
//         );
//         result.forEach((d) =>
//             d.investigators.sort((a, b) => b.project_count - a.project_count)
//         );
//         return result;
//     }, [roleBasedProjects]);

//     // Process PI-wise data
//     const piData = React.useMemo(() => {
//         const piMap: Record<
//             string,
//             {
//                 user_name: string;
//                 user_email: string;
//                 project_count: number;
//                 departments: string[];
//             }
//         > = {};

//         roleBasedProjects.forEach((item: any) => {
//             if (
//                 item.role?.includes("PI") ||
//                 item.role?.includes("Principal Investigator") ||
//                 item.role?.includes("Permanent Employee")
//             ) {
//                 const key = item.user_email;
//                 if (!piMap[key]) {
//                     piMap[key] = {
//                         user_name: item.user_name,
//                         user_email: item.user_email,
//                         project_count: 0,
//                         departments: [],
//                     };
//                 }
//                 piMap[key].project_count += item.project_count || 0;

//                 const dept = item.implementation_department || item.user_department;
//                 if (dept && !piMap[key].departments.includes(dept)) {
//                     piMap[key].departments.push(dept);
//                 }
//             }
//         });

//         return Object.values(piMap).sort(
//             (a, b) => b.project_count - a.project_count
//         );
//     }, [roleBasedProjects]);

//     // State for search/filter/expansion
//     const [deptSearch, setDeptSearch] = React.useState("");
//     const [piSearch, setPiSearch] = React.useState("");
//     const [expandedDept, setExpandedDept] = React.useState<string | null>(null);
//     const [expandedPI, setExpandedPI] = React.useState<string | null>(null);

//     // Pagination states
//     const [deptPage, setDeptPage] = React.useState(1);
//     const [piPage, setPiPage] = React.useState(1);

//     React.useEffect(() => {
//         setDeptPage(1);
//     }, [deptSearch]);
//     React.useEffect(() => {
//         setPiPage(1);
//     }, [piSearch]);

//     // Filtered data
//     const filteredDepartments = React.useMemo(() => {
//         return departmentData.filter((dept) =>
//             dept.dept_name.toLowerCase().includes(deptSearch.toLowerCase())
//         );
//     }, [departmentData, deptSearch]);

//     const filteredPIs = React.useMemo(() => {
//         return piData.filter((pi) =>
//             pi.user_name.toLowerCase().includes(piSearch.toLowerCase())
//         );
//     }, [piData, piSearch]);

//     const PAGE_SIZE = 10;

//     const paginatedDepartments = React.useMemo(() => {
//         const start = (deptPage - 1) * PAGE_SIZE;
//         return filteredDepartments.slice(start, start + PAGE_SIZE);
//     }, [filteredDepartments, deptPage]);

//     const deptTotalPages = Math.max(
//         1,
//         Math.ceil(filteredDepartments.length / PAGE_SIZE)
//     );

//     const paginatedPIs = React.useMemo(() => {
//         const start = (piPage - 1) * PAGE_SIZE;
//         return filteredPIs.slice(start, start + PAGE_SIZE);
//     }, [filteredPIs, piPage]);

//     const piTotalPages = Math.max(1, Math.ceil(filteredPIs.length / PAGE_SIZE));

//     const handleDownloadReport = () => {
//         if (isLoading) return;
//         const deptNameMap: Record<string, string> = {};
//         (deptList ?? []).forEach((d: any) => {
//             if (d.name && d.dept_name) deptNameMap[d.name] = d.dept_name;
//         });
//         const html = generateDirectorReportHtml({
//             overview, funds, intl, proposals, ipr,
//             topProjects, recentProjects,
//             projectStatusByYearData, fundingTypeData,
//             fullName, deptNameMap,
//         });
//         const win = window.open("", "_blank", "width=900,height=700");
//         if (!win) return;
//         win.document.open();
//         win.document.write(html);
//         win.document.close();
//     };

//     const liveTime = time
//         .toLocaleString("en-IN", {
//             weekday: "short", day: "2-digit", month: "short",
//             year: "numeric", hour: "2-digit", minute: "2-digit",
//             second: "2-digit", hour12: false,
//         })
//         .replace(",", "");

//     const selectedDeptDetails = React.useMemo(() => {
//         return departmentData.find((d) => d.dept_name === expandedDept) || null;
//     }, [departmentData, expandedDept]);

//     const selectedPIDetails = React.useMemo(() => {
//         return piData.find((p) => p.user_email === expandedPI) || null;
//     }, [piData, expandedPI]);

//     const selectedPIProjects = React.useMemo(() => {
//         if (!expandedPI || !allProjectsList) return [];
//         return (allProjectsList as any[])
//             .filter((p) => p.pi_webmail === expandedPI)
//             .sort((a, b) => {
//                 const aStart = a.prj_start_date
//                     ? new Date(a.prj_start_date).getTime()
//                     : 0;
//                 const bStart = b.prj_start_date
//                     ? new Date(b.prj_start_date).getTime()
//                     : 0;
//                 return bStart - aStart;
//             });
//     }, [expandedPI, allProjectsList]);

//     return (
//         <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans text-[14px] leading-relaxed text-[#3F3F46] dark:text-[#E4E4E7]">
//             <div className="px-6 md:px-8 pt-7 pb-10 max-w-[1600px] mx-auto">

//                 {/* ── Header ── */}
//                 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 w-full">
//                     <div className="relative">
//                         <div className="flex items-center gap-3">
//                             <div className="w-10 h-10 bg-[#2563eb] rounded-xl flex items-center justify-center text-white shadow-sm border border-[#2563eb]/20">
//                                 {viewMode === "Director" ? (
//                                     <BarChart3 size={20} />
//                                 ) : viewMode === "Department" ? (
//                                     <Building2 size={20} />
//                                 ) : (
//                                     <Users size={20} />
//                                 )}
//                             </div>
//                             <div>
//                                 <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.02em] text-[#3F3F46] dark:text-[#E4E4E7]">
//                                     {viewMode === "Director"
//                                         ? "Overview"
//                                         : viewMode === "Department"
//                                             ? "Department Overview"
//                                             : "PI Project Overview"}
//                                 </h1>
//                                 <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-1">
//                                     {viewMode === "Director"
//                                         ? "KPIs, Analytics & Funding tracked centrally."
//                                         : viewMode === "Department"
//                                             ? "Analyzing resource & project allocation across departments."
//                                             : "Tracking project workload and progress across investigators."}
//                                 </p>
//                             </div>
//                         </div>
//                     </div>
//                     <div className="flex items-center gap-2.5 flex-wrap">
//                         <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase">
//                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
//                             Live Data
//                         </div>
//                         <div className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] font-mono bg-white dark:bg-[#27272A] px-3 py-1.5 rounded-full border border-[#E4E4E7] dark:border-[#3F3F46]">
//                             {liveTime}
//                         </div>
//                         <button
//                             onClick={handleDownloadReport}
//                             disabled={isLoading}
//                             className="flex items-center gap-2 px-4 py-2 bg-[#D97757] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg shadow-sm transition-all"
//                         >
//                             <FileDown className="size-3.5" />
//                             Download Report
//                         </button>
//                     </div>
//                 </div>

//                 {viewMode === "Director" && (
//                     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
//                         {/* ── KPI Cards ── */}
//                         <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px] mb-6">
//                             <KpiCard
//                                 label="Total Projects"
//                                 value={isLoading ? "—" : String(totalProjects)}
//                                 subtext=""
//                                 icon={
//                                     <svg
//                                         className="w-[18px] h-[18px]"
//                                         fill="none"
//                                         stroke="currentColor"
//                                         strokeWidth="2"
//                                         strokeLinecap="round"
//                                         strokeLinejoin="round"
//                                         viewBox="0 0 24 24"
//                                     >
//                                         <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
//                                     </svg>
//                                 }
//                                 valueColor="text-blue-700 dark:text-blue-400"
//                                 iconBg="#eff6ff"
//                                 circleColor="#2563eb"
//                                 onClick={() => openKpiModal("total", "All Projects")}
//                                 badges={isLoading ? undefined : totalProjectBadges}
//                                 onBadgeClick={(badgeLabel) =>
//                                     openKpiModalWithTab("total", "All Projects", badgeLabel)
//                                 }
//                             />
//                             <KpiCard
//                                 label="Total Allocation"
//                                 description="From sanctioned & fund-approved projects"
//                                 value={isLoading ? "—" : formatCurrency(fundAlloc)}
//                                 subtext={isLoading ? "" : `${fundUtilPercent}% utilized`}
//                                 icon={
//                                     <svg
//                                         className="w-[18px] h-[18px]"
//                                         fill="none"
//                                         stroke="currentColor"
//                                         strokeWidth="2"
//                                         strokeLinecap="round"
//                                         strokeLinejoin="round"
//                                         viewBox="0 0 24 24"
//                                     >
//                                         <line x1="6" y1="5" x2="18" y2="5" />
//                                         <line x1="6" y1="10" x2="18" y2="10" />
//                                         <path d="M6 5h5a4 4 0 0 1 0 8H6" />
//                                         <path d="M9 13L15 21" />
//                                     </svg>
//                                 }
//                                 valueColor="text-emerald-700 dark:text-emerald-400"
//                                 iconBg="#ecfdf5"
//                                 circleColor="#059669"
//                                 onClick={() =>
//                                     openKpiModal("allocation", "Projects by Allocation")
//                                 }
//                                 badges={isLoading ? undefined : allocBadges}
//                                 onBadgeClick={(badgeLabel) =>
//                                     openKpiModalWithTab(
//                                         "allocation",
//                                         "Projects by Allocation",
//                                         badgeLabel
//                                     )
//                                 }
//                             />
//                             <KpiCard
//                                 label="Ongoing Projects"
//                                 value={isLoading ? "—" : String(ongoingProjects)}
//                                 subtext={
//                                     totalProjects > 0
//                                         ? `${((ongoingProjects / totalProjects) * 100).toFixed(0)}% of portfolio`
//                                         : "Currently Active"
//                                 }
//                                 icon={
//                                     <svg
//                                         className="w-[18px] h-[18px]"
//                                         fill="none"
//                                         stroke="currentColor"
//                                         strokeWidth="2"
//                                         strokeLinecap="round"
//                                         strokeLinejoin="round"
//                                         viewBox="0 0 24 24"
//                                     >
//                                         <circle cx="12" cy="12" r="10" />
//                                         <path d="M12 6v6l4 2" />
//                                     </svg>
//                                 }
//                                 valueColor="text-violet-700 dark:text-violet-400"
//                                 iconBg="#f5f3ff"
//                                 circleColor="#7c3aed"
//                                 onClick={() => openKpiModal("ongoing", "Ongoing Projects")}
//                             />
//                             <KpiCard
//                                 label="Intl. Collaborators"
//                                 value={isLoading ? "—" : String(intl.active_agencies || 0)}
//                                 subtext="Active Global Collaborators"
//                                 icon={
//                                     <svg
//                                         className="w-[18px] h-[18px]"
//                                         fill="none"
//                                         stroke="currentColor"
//                                         strokeWidth="2"
//                                         strokeLinecap="round"
//                                         strokeLinejoin="round"
//                                         viewBox="0 0 24 24"
//                                     >
//                                         <circle cx="12" cy="12" r="10" />
//                                         <line x1="2" y1="12" x2="22" y2="12" />
//                                         <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
//                                     </svg>
//                                 }
//                                 valueColor="text-sky-700 dark:text-sky-400"
//                                 iconBg="#f0f9ff"
//                                 circleColor="#0284c7"
//                             />
//                         </div>

//                         {/* ── Project Analytics ── */}
//                         <SectionDivider title="Project Analytics" />
//                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-6">
//                             <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
//                                 <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
//                                     <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
//                                         <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/20 text-[#2563eb]">
//                                             <svg
//                                                 className="w-3.5 h-3.5"
//                                                 fill="none"
//                                                 stroke="currentColor"
//                                                 strokeWidth="2"
//                                                 strokeLinecap="round"
//                                                 strokeLinejoin="round"
//                                                 viewBox="0 0 24 24"
//                                             >
//                                                 <line x1="18" y1="20" x2="18" y2="10" />
//                                                 <line x1="12" y1="20" x2="12" y2="4" />
//                                                 <line x1="6" y1="20" x2="6" y2="14" />
//                                             </svg>
//                                         </div>
//                                         Financial Year — Project Status
//                                     </div>
//                                 </div>
//                                 <div className="p-[18px] px-[22px] pb-5">
//                                     <div className="h-[250px]">
//                                         {isLoading || allProjectsList === undefined ? (
//                                             <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
//                                                 Loading chart...
//                                             </div>
//                                         ) : projectStatusByYearData.length > 0 ? (
//                                             <ResponsiveContainer width="100%" height="100%">
//                                                 <BarChart
//                                                     data={projectStatusByYearData}
//                                                     margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
//                                                     barCategoryGap="25%"
//                                                     barGap={2}
//                                                 >
//                                                     <CartesianGrid
//                                                         strokeDasharray="3 3"
//                                                         stroke="#E4E4E7"
//                                                         vertical={false}
//                                                     />
//                                                     <XAxis
//                                                         dataKey="year"
//                                                         tick={{
//                                                             fontSize: 12,
//                                                             fill: "#71717A",
//                                                             fontWeight: 600,
//                                                         }}
//                                                         axisLine={false}
//                                                         tickLine={false}
//                                                         dy={8}
//                                                     />
//                                                     <YAxis
//                                                         tick={{ fontSize: 12, fill: "#71717A" }}
//                                                         axisLine={false}
//                                                         tickLine={false}
//                                                     />
//                                                     <Tooltip
//                                                         contentStyle={{
//                                                             borderRadius: "0.75rem",
//                                                             border: "1px solid #1e293b",
//                                                             background: "#0f172a",
//                                                         }}
//                                                         labelStyle={{
//                                                             color: "#f1f5f9",
//                                                             fontWeight: 700,
//                                                             fontSize: 12,
//                                                         }}
//                                                         itemStyle={{ color: "#94a3b8", fontSize: 11 }}
//                                                         cursor={{ fill: "#f4f4f5" }}
//                                                     />
//                                                     <Bar
//                                                         dataKey="submitted"
//                                                         name="Submitted"
//                                                         stackId="a"
//                                                         fill="#2563eb"
//                                                         maxBarSize={34}
//                                                     />
//                                                     <Bar
//                                                         dataKey="ongoing"
//                                                         name="Ongoing"
//                                                         stackId="a"
//                                                         fill="#7c3aed"
//                                                         maxBarSize={34}
//                                                     />
//                                                 </BarChart>
//                                             </ResponsiveContainer>
//                                         ) : (
//                                             <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
//                                                 No data available
//                                             </div>
//                                         )}
//                                     </div>
//                                     <div className="flex items-start gap-5 flex-wrap mt-4 pt-4 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
//                                         {[
//                                             [
//                                                 "#2563eb",
//                                                 "Submitted",
//                                                 "Registered but pending sanction",
//                                             ],
//                                             [
//                                                 "#7c3aed",
//                                                 "Ongoing",
//                                                 "Fund sanctioned and formally approved",
//                                             ],
//                                         ].map(([color, label, desc]) => (
//                                             <div key={label} className="flex items-start gap-2">
//                                                 <span
//                                                     className="w-2.5 h-2.5 rounded-sm shrink-0 mt-[2px]"
//                                                     style={{ backgroundColor: color }}
//                                                 />
//                                                 <div className="flex flex-col">
//                                                     <span className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
//                                                         {label}
//                                                     </span>
//                                                     <span className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A] max-w-[120px] leading-snug mt-0.5">
//                                                         {desc}
//                                                     </span>
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Funding Sources Pie */}
//                             <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
//                                 <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                     <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
//                                         <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-violet-50 dark:bg-violet-950/20 text-[#7c3aed]">
//                                             <svg
//                                                 className="w-3.5 h-3.5"
//                                                 fill="none"
//                                                 stroke="currentColor"
//                                                 strokeWidth="2"
//                                                 strokeLinecap="round"
//                                                 strokeLinejoin="round"
//                                                 viewBox="0 0 24 24"
//                                             >
//                                                 <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
//                                                 <path d="M22 12A10 10 0 0 0 12 2v10z" />
//                                             </svg>
//                                         </div>
//                                         Funding Sources — Breakdown
//                                     </div>
//                                 </div>
//                                 <div className="p-[18px] px-[22px] pb-5">
//                                     {isLoading ? (
//                                         <div className="h-[300px] flex items-center justify-center text-[#71717A] text-sm">
//                                             Loading chart...
//                                         </div>
//                                     ) : fundingTypeData.length > 0 ? (
//                                         <div className="flex items-center gap-6 h-[300px]">
//                                             <div className="relative flex items-center justify-center w-[200px] h-[200px] shrink-0">
//                                                 <ResponsiveContainer width="100%" height="100%">
//                                                     <PieChart>
//                                                         <Pie
//                                                             data={fundingTypeData}
//                                                             cx="50%"
//                                                             cy="50%"
//                                                             innerRadius={65}
//                                                             outerRadius={88}
//                                                             dataKey="value"
//                                                             paddingAngle={3}
//                                                         >
//                                                             {fundingTypeData.map((_: any, i: number) => (
//                                                                 <Cell
//                                                                     key={i}
//                                                                     fill={CHART_COLORS[i % CHART_COLORS.length]}
//                                                                     stroke="none"
//                                                                 />
//                                                             ))}
//                                                         </Pie>
//                                                         <Tooltip
//                                                             contentStyle={{
//                                                                 borderRadius: "0.5rem",
//                                                                 border: "1px solid #1e293b",
//                                                                 background: "#0f172a",
//                                                             }}
//                                                             labelStyle={{ color: "#f1f5f9", fontWeight: 700 }}
//                                                             itemStyle={{ color: "#94a3b8", fontSize: 11 }}
//                                                             formatter={(value: number, name: string) => [
//                                                                 `${value} Projects`,
//                                                                 name,
//                                                             ]}
//                                                         />
//                                                     </PieChart>
//                                                 </ResponsiveContainer>
//                                                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
//                                                     <span className="text-[24px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-none">
//                                                         {totalFundingSources}
//                                                     </span>
//                                                     <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-widest mt-0.5">
//                                                         Total
//                                                     </span>
//                                                 </div>
//                                             </div>
//                                             <div className="flex-1 min-w-0">
//                                                 {fundingTypeData.slice(0, 6).map((item: any, i: number) => (
//                                                     <div
//                                                         key={i}
//                                                         className="flex items-center justify-between py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0"
//                                                     >
//                                                         <div className="flex items-center gap-2">
//                                                             <span
//                                                                 className="w-2.5 h-2.5 rounded-sm shrink-0"
//                                                                 style={{
//                                                                     backgroundColor:
//                                                                         CHART_COLORS[i % CHART_COLORS.length],
//                                                                 }}
//                                                             />
//                                                             <span
//                                                                 className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA] truncate max-w-[130px]"
//                                                                 title={item.name}
//                                                             >
//                                                                 {item.name}
//                                                             </span>
//                                                         </div>
//                                                         <span className="text-[13px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
//                                                             {item.value}
//                                                         </span>
//                                                     </div>
//                                                 ))}
//                                             </div>
//                                         </div>
//                                     ) : (
//                                         <div className="h-[300px] flex items-center justify-center text-[#71717A] text-sm">
//                                             No data available
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>

//                         {/* ── Project Analytics & Distribution ── */}
//                         <SectionDivider title="Project Analytics & Distribution" />
//                         <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-[14px] mb-6">
//                             {/* Research vs Consultancy Pie Chart */}
//                             <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
//                                 <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                     <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
//                                         <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-950/20 text-[#7c3aed]">
//                                             <svg
//                                                 className="w-3.5 h-3.5"
//                                                 fill="none"
//                                                 stroke="currentColor"
//                                                 strokeWidth="2"
//                                                 strokeLinecap="round"
//                                                 strokeLinejoin="round"
//                                                 viewBox="0 0 24 24"
//                                             >
//                                                 <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
//                                                 <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
//                                             </svg>
//                                         </div>
//                                         Research vs Consultancy
//                                     </div>
//                                 </div>
//                                 <div className="p-[18px] px-[22px] pb-5">
//                                     <div className="h-[260px]">
//                                         {isLoading ? (
//                                             <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
//                                                 Loading chart...
//                                             </div>
//                                         ) : totalProjects === 0 ? (
//                                             <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
//                                                 No data available
//                                             </div>
//                                         ) : (
//                                             <ResponsiveContainer width="100%" height="100%">
//                                                 <PieChart>
//                                                     <Pie
//                                                         data={projectTypeData}
//                                                         cx="50%"
//                                                         cy="46%"
//                                                         innerRadius="50%"
//                                                         outerRadius="70%"
//                                                         dataKey="value"
//                                                         nameKey="name"
//                                                         paddingAngle={5}
//                                                     >
//                                                         {projectTypeData.map((entry: any, index: number) => (
//                                                             <Cell key={`cell-${index}`} fill={entry.color} />
//                                                         ))}
//                                                     </Pie>
//                                                     <Tooltip
//                                                         contentStyle={{
//                                                             borderRadius: "0.75rem",
//                                                             border: "1px solid #1e293b",
//                                                             background: "#0f172a",
//                                                         }}
//                                                         labelStyle={{
//                                                             color: "#f1f5f9",
//                                                             fontWeight: 700,
//                                                             fontSize: 12,
//                                                         }}
//                                                         itemStyle={{ color: "#94a3b8", fontSize: 11 }}
//                                                         formatter={(value: number, name: string) => [
//                                                             `${value} Projects`,
//                                                             name,
//                                                         ]}
//                                                     />
//                                                     <Legend
//                                                         iconType="circle"
//                                                         wrapperStyle={{
//                                                             fontSize: "13px",
//                                                             paddingTop: "10px",
//                                                             fontWeight: 600,
//                                                         }}
//                                                         formatter={(value) => (
//                                                             <span className="text-[#3F3F46] dark:text-[#E4E4E7]">
//                                                                 {value}
//                                                             </span>
//                                                         )}
//                                                     />
//                                                 </PieChart>
//                                             </ResponsiveContainer>
//                                         )}
//                                     </div>
//                                     <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] pt-3 mt-3">
//                                         <div className="grid grid-cols-2 gap-3">
//                                             <div className="text-center">
//                                                 <div className="text-[22px] font-extrabold text-[#2563eb]">
//                                                     {researchProjects}
//                                                 </div>
//                                                 <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-widest">
//                                                     Research
//                                                 </div>
//                                             </div>
//                                             <div className="text-center">
//                                                 <div className="text-[22px] font-extrabold text-[#7c3aed]">
//                                                     {consultancyProjects}
//                                                 </div>
//                                                 <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-widest">
//                                                     Consultancy
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Department-wise Pie Chart */}
//                             <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
//                                 <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                     <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
//                                         <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/20 text-[#2563eb]">
//                                             <Building2 size={14} strokeWidth={2.5} />
//                                         </div>
//                                         Department-wise Project Distribution
//                                     </div>
//                                 </div>
//                                 <div className="p-[18px] px-[22px] pb-5">
//                                     <div className="h-[340px]">
//                                         {isLoading ? (
//                                             <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
//                                                 Loading chart...
//                                             </div>
//                                         ) : departmentData.length === 0 ? (
//                                             <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
//                                                 No data available
//                                             </div>
//                                         ) : (
//                                             <ResponsiveContainer width="100%" height="100%">
//                                                 <PieChart>
//                                                     <Pie
//                                                         data={departmentData.slice(0, 10)}
//                                                         cx="50%"
//                                                         cy="42%"
//                                                         innerRadius="48%"
//                                                         outerRadius="68%"
//                                                         dataKey="project_count"
//                                                         nameKey="dept_name"
//                                                         paddingAngle={3}
//                                                     >
//                                                         {departmentData.slice(0, 10).map((_: any, i: number) => (
//                                                             <Cell
//                                                                 key={i}
//                                                                 fill={CHART_COLORS[i % CHART_COLORS.length]}
//                                                                 stroke="none"
//                                                             />
//                                                         ))}
//                                                     </Pie>
//                                                     <Tooltip
//                                                         contentStyle={{
//                                                             borderRadius: "0.75rem",
//                                                             border: "1px solid #1e293b",
//                                                             background: "#0f172a",
//                                                         }}
//                                                         labelStyle={{
//                                                             color: "#f1f5f9",
//                                                             fontWeight: 700,
//                                                             fontSize: 12,
//                                                         }}
//                                                         itemStyle={{ color: "#94a3b8", fontSize: 11 }}
//                                                         formatter={(value: number, name: string) => [
//                                                             `${value} Projects`,
//                                                             name,
//                                                         ]}
//                                                     />
//                                                     <Legend
//                                                         content={(props: any) => {
//                                                             const { payload } = props;
//                                                             return (
//                                                                 <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3 w-full">
//                                                                     {payload.map((entry: any, index: number) => {
//                                                                         const deptData = departmentData.find(
//                                                                             (d: any) => d.dept_name === entry.value
//                                                                         );
//                                                                         const count = deptData
//                                                                             ? deptData.project_count
//                                                                             : 0;
//                                                                         return (
//                                                                             <li
//                                                                                 key={`item-${index}`}
//                                                                                 className="flex items-center text-[11px] min-w-0 group cursor-default gap-1.5"
//                                                                             >
//                                                                                 <span
//                                                                                     className="w-2 h-2 rounded-full shrink-0"
//                                                                                     style={{ backgroundColor: entry.color }}
//                                                                                 />
//                                                                                 <span
//                                                                                     className="text-[#64748B] dark:text-[#A1A1AA] font-semibold truncate flex-1 group-hover:text-[#3F3F46] dark:group-hover:text-[#E4E4E7] transition-colors"
//                                                                                     title={entry.value}
//                                                                                 >
//                                                                                     {getDeptName(entry.value)}
//                                                                                 </span>
//                                                                                 <span className="font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] shrink-0">
//                                                                                     {count}
//                                                                                 </span>
//                                                                             </li>
//                                                                         );
//                                                                     })}
//                                                                 </ul>
//                                                             );
//                                                         }}
//                                                     />
//                                                 </PieChart>
//                                             </ResponsiveContainer>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Sanction Amount — Start vs End Year */}
//                             <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
//                                 <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                     <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
//                                         <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/20 text-[#059669]">
//                                             <svg
//                                                 className="w-3.5 h-3.5"
//                                                 fill="none"
//                                                 stroke="currentColor"
//                                                 strokeWidth="2"
//                                                 strokeLinecap="round"
//                                                 strokeLinejoin="round"
//                                                 viewBox="0 0 24 24"
//                                             >
//                                                 <line x1="18" y1="20" x2="18" y2="10" />
//                                                 <line x1="12" y1="20" x2="12" y2="4" />
//                                                 <line x1="6" y1="20" x2="6" y2="14" />
//                                             </svg>
//                                         </div>
//                                         Sanction Amount — Start vs End
//                                     </div>
//                                 </div>
//                                 <div className="p-[18px] px-[22px]">
//                                     <div className="h-[300px]">
//                                         {isLoading || allProjectsList === undefined ? (
//                                             <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
//                                                 Loading chart...
//                                             </div>
//                                         ) : startEndSanctionData.length === 0 ? (
//                                             <div className="w-full h-full flex flex-col items-center justify-center text-[#71717A] text-sm gap-2">
//                                                 <svg
//                                                     className="w-12 h-12 text-[#A1A1AA]"
//                                                     fill="none"
//                                                     stroke="currentColor"
//                                                     strokeWidth="1.5"
//                                                     viewBox="0 0 24 24"
//                                                 >
//                                                     <path
//                                                         strokeLinecap="round"
//                                                         strokeLinejoin="round"
//                                                         d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
//                                                     />
//                                                 </svg>
//                                                 <p className="font-semibold">
//                                                     No project date data available
//                                                 </p>
//                                                 <p className="text-xs text-[#A1A1AA]">
//                                                     Ensure projects have prj_start_date and prj_end_date
//                                                     filled
//                                                 </p>
//                                             </div>
//                                         ) : (
//                                             <ResponsiveContainer width="100%" height="100%">
//                                                 <BarChart
//                                                     data={startEndSanctionData}
//                                                     margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
//                                                     barCategoryGap="30%"
//                                                     barGap={3}
//                                                 >
//                                                     <CartesianGrid
//                                                         strokeDasharray="3 3"
//                                                         vertical={false}
//                                                         stroke="#E4E4E7"
//                                                     />
//                                                     <XAxis
//                                                         dataKey="year"
//                                                         axisLine={false}
//                                                         tickLine={false}
//                                                         tick={{ fontSize: 12, fontWeight: 700, fill: "#71717A" }}
//                                                         dy={8}
//                                                     />
//                                                     <YAxis
//                                                         axisLine={false}
//                                                         tickLine={false}
//                                                         tickFormatter={(v) =>
//                                                             v >= 10000000
//                                                                 ? `₹${(v / 10000000).toFixed(0)}Cr`
//                                                                 : v >= 100000
//                                                                     ? `₹${(v / 100000).toFixed(0)}L`
//                                                                     : `₹${v}`
//                                                         }
//                                                         tick={{ fontSize: 12, fill: "#71717A" }}
//                                                     />
//                                                     <Tooltip
//                                                         content={<BarTooltip />}
//                                                         cursor={{ fill: "#f4f4f5" }}
//                                                     />
//                                                     <Bar
//                                                         dataKey="startAmount"
//                                                         name="Project Start"
//                                                         fill="#2563eb"
//                                                         radius={[6, 6, 0, 0]}
//                                                         maxBarSize={36}
//                                                     />
//                                                     <Bar
//                                                         dataKey="endAmount"
//                                                         name="Project End"
//                                                         fill="#d97706"
//                                                         radius={[6, 6, 0, 0]}
//                                                         maxBarSize={36}
//                                                     />
//                                                 </BarChart>
//                                             </ResponsiveContainer>
//                                         )}
//                                     </div>
//                                     <div className="flex items-start gap-5 flex-wrap mt-4 pt-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
//                                         <div className="flex items-start gap-2">
//                                             <span
//                                                 className="w-2.5 h-2.5 rounded-sm shrink-0 mt-[2px]"
//                                                 style={{ backgroundColor: "#2563eb" }}
//                                             />
//                                             <div className="flex flex-col">
//                                                 <span className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
//                                                     Project Start
//                                                 </span>
//                                                 <span className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A] max-w-[120px] leading-snug mt-0.5">
//                                                     Budget of projects beginning this year
//                                                 </span>
//                                             </div>
//                                         </div>
//                                         <div className="flex items-start gap-2">
//                                             <span
//                                                 className="w-2.5 h-2.5 rounded-sm shrink-0 mt-[2px]"
//                                                 style={{ backgroundColor: "#d97706" }}
//                                             />
//                                             <div className="flex flex-col">
//                                                 <span className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
//                                                     Project End
//                                                 </span>
//                                                 <span className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A] max-w-[120px] leading-snug mt-0.5">
//                                                     Budget of projects closing this year
//                                                 </span>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* ── Financial Intelligence ── */}
//                         <SectionDivider title="Financial" />
//                         <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-[14px] mb-6">
//                             {/* Top Funded Projects Table */}
//                             <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
//                                 <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
//                                     <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
//                                         <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/20 text-[#059669]">
//                                             <svg
//                                                 className="w-3.5 h-3.5"
//                                                 fill="none"
//                                                 stroke="currentColor"
//                                                 strokeWidth="2"
//                                                 strokeLinecap="round"
//                                                 strokeLinejoin="round"
//                                                 viewBox="0 0 24 24"
//                                             >
//                                                 <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
//                                                 <polyline points="17 6 23 6 23 12" />
//                                             </svg>
//                                         </div>
//                                         Top Funded Projects
//                                     </div>
//                                 </div>
//                                 <div className="overflow-x-auto">
//                                     <table className="w-full border-collapse">
//                                         <thead>
//                                             <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                                 {[
//                                                     "#",
//                                                     "Project",
//                                                     "PI / Lead",
//                                                     "Department",
//                                                     "Status",
//                                                     "Amount",
//                                                 ].map((h) => (
//                                                     <th
//                                                         key={h}
//                                                         className="p-2.5 px-3.5 text-[10px] font-bold text-[#71717A] uppercase tracking-widest text-left"
//                                                     >
//                                                         {h}
//                                                     </th>
//                                                 ))}
//                                             </tr>
//                                         </thead>
//                                         <tbody>
//                                             {isLoading ? (
//                                                 <tr>
//                                                     <td
//                                                         colSpan={6}
//                                                         className="p-8 text-center text-[#71717A] text-sm"
//                                                     >
//                                                         Loading projects...
//                                                     </td>
//                                                 </tr>
//                                             ) : topProjects.length === 0 ? (
//                                                 <tr>
//                                                     <td
//                                                         colSpan={6}
//                                                         className="p-8 text-center text-[#71717A] text-sm"
//                                                     >
//                                                         No projects found.
//                                                     </td>
//                                                 </tr>
//                                             ) : (
//                                                 topProjects.map((proj: any, idx: number) => (
//                                                     <tr
//                                                         key={proj.project_id || idx}
//                                                         className="border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors"
//                                                     >
//                                                         <td className="p-3 px-3.5 align-middle text-[11px] font-extrabold text-[#71717A] font-mono">
//                                                             {String(idx + 1).padStart(2, "0")}
//                                                         </td>
//                                                         <td className="p-3 px-3.5 align-middle">
//                                                             <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
//                                                                 {proj.project_title || "Untitled"}
//                                                             </div>
//                                                             <span className="font-mono text-[9px] text-[#71717A] bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] px-1.5 py-0.5 rounded inline-block mt-1">
//                                                                 {proj.project_id}
//                                                             </span>
//                                                         </td>
//                                                         <td className="p-3 px-3.5 align-middle text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
//                                                             {proj.pi_name || "—"}
//                                                         </td>
//                                                         <td className="p-3 px-3.5 align-middle">
//                                                             <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wide">
//                                                                 {proj.department
//                                                                     ? getDeptName(proj.department)
//                                                                     : "—"}
//                                                             </span>
//                                                         </td>
//                                                         <td className="p-3 px-3.5 align-middle">
//                                                             <StatusBadge
//                                                                 status={proj.status || proj.workflow_state}
//                                                             />
//                                                         </td>
//                                                         <td className="p-3 px-3.5 align-middle font-extrabold text-[13px] text-[#059669] whitespace-nowrap">
//                                                             {formatCurrency(proj.total_budget_amount || 0)}
//                                                         </td>
//                                                     </tr>
//                                                 ))
//                                             )}
//                                         </tbody>
//                                     </table>
//                                 </div>
//                             </div>

//                             {/* Financial Breakdown Panel */}
//                             <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
//                                 <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                     <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
//                                         <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/20 text-[#d97706]">
//                                             <svg
//                                                 className="w-3.5 h-3.5"
//                                                 fill="none"
//                                                 stroke="currentColor"
//                                                 strokeWidth="2"
//                                                 strokeLinecap="round"
//                                                 strokeLinejoin="round"
//                                                 viewBox="0 0 24 24"
//                                             >
//                                                 <rect x="2" y="3" width="20" height="14" rx="2" />
//                                                 <line x1="8" y1="21" x2="16" y2="21" />
//                                                 <line x1="12" y1="17" x2="12" y2="21" />
//                                             </svg>
//                                         </div>
//                                         Financial Breakdown
//                                     </div>
//                                 </div>
//                                 <div className="p-[18px] px-[22px] space-y-3">
//                                     <div className="flex gap-2">
//                                         <div className="flex-1 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg p-2.5 text-center">
//                                             <div className="text-[18px] font-extrabold tracking-[-0.03em] text-[#2563eb]">
//                                                 {isLoading ? "—" : formatCurrency(fundAlloc)}
//                                             </div>
//                                             <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mt-0.5">
//                                                 Total Sanctioned
//                                             </div>
//                                         </div>
//                                         <div className="flex-1 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg p-2.5 text-center">
//                                             <div className="text-[18px] font-extrabold tracking-[-0.03em] text-[#059669]">
//                                                 {isLoading ? "—" : formatCurrency(fundUtilized)}
//                                             </div>
//                                             <div className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest mt-0.5">
//                                                 Utilized
//                                             </div>
//                                         </div>
//                                     </div>
//                                     <div>
//                                         <div className="flex items-center justify-between mb-1.5">
//                                             <span className="text-[10px] font-semibold text-[#71717A]">
//                                                 Utilization Rate
//                                             </span>
//                                             <span className="text-[10px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
//                                                 {fundUtilPercent}%
//                                             </span>
//                                         </div>
//                                         <div className="h-1.5 bg-[#E4E4E7] dark:bg-[#3F3F46] rounded-full overflow-hidden">
//                                             <div
//                                                 className="h-full rounded-full bg-[#059669] transition-all"
//                                                 style={{
//                                                     width: `${Math.min(parseFloat(fundUtilPercent), 100)}%`,
//                                                 }}
//                                             />
//                                         </div>
//                                     </div>
//                                     <div className="space-y-0 pt-1">
//                                         {[
//                                             {
//                                                 label: "Remaining Balance",
//                                                 value: formatCurrency(fundRemaining),
//                                                 color: "text-[#059669]",
//                                             },
//                                             {
//                                                 label: "Proposed Budget (Review)",
//                                                 value: formatCurrency(
//                                                     proposals.proposed_budget_total || 0
//                                                 ),
//                                                 color: "text-[#3F3F46] dark:text-[#E4E4E7]",
//                                             },
//                                             {
//                                                 label: "Total Project Staff",
//                                                 value: `${totalStaffCount} Members`,
//                                                 color: "text-[#3F3F46] dark:text-[#E4E4E7]",
//                                             },
//                                         ].map((row, i) => (
//                                             <div
//                                                 key={i}
//                                                 className="flex items-center justify-between py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0"
//                                             >
//                                                 <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
//                                                     {row.label}
//                                                 </span>
//                                                 <span
//                                                     className={`text-[12px] font-extrabold ${row.color}`}
//                                                 >
//                                                     {isLoading ? "—" : row.value}
//                                                 </span>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* ── Portfolio Details ── */}
//                         <SectionDivider title="Portfolio Details" />
//                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[14px] mb-6">
//                             {/* Team & Project Mix */}
//                             <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
//                                 <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                     <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
//                                         <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-sky-50 dark:bg-sky-950/20 text-[#0284c7]">
//                                             <svg
//                                                 className="w-3.5 h-3.5"
//                                                 fill="none"
//                                                 stroke="currentColor"
//                                                 strokeWidth="2"
//                                                 strokeLinecap="round"
//                                                 strokeLinejoin="round"
//                                                 viewBox="0 0 24 24"
//                                             >
//                                                 <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
//                                                 <circle cx="9" cy="7" r="4" />
//                                                 <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
//                                                 <path d="M16 3.13a4 4 0 0 1 0 7.75" />
//                                             </svg>
//                                         </div>
//                                         Team & Project Mix
//                                     </div>
//                                 </div>
//                                 <div className="p-[18px] px-[22px] pt-2.5">
//                                     {[
//                                         {
//                                             label: "Research Projects",
//                                             value: researchProjects,
//                                             color: "#2563eb",
//                                         },
//                                         {
//                                             label: "Consultancy Projects",
//                                             value: consultancyProjects,
//                                             color: "#7c3aed",
//                                         },
//                                         {
//                                             label: "Ongoing Projects",
//                                             value: ongoingProjects,
//                                             color: "#059669",
//                                         },
//                                     ].map((item, i) => (
//                                         <div
//                                             key={i}
//                                             className="flex items-center justify-between py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] gap-2"
//                                         >
//                                             <div className="flex items-center gap-2 w-[140px] shrink-0">
//                                                 <span
//                                                     className="w-2 h-2 rounded-sm shrink-0"
//                                                     style={{ backgroundColor: item.color }}
//                                                 />
//                                                 <span className="text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
//                                                     {item.label}
//                                                 </span>
//                                             </div>
//                                             <div className="flex-1 h-[3px] bg-[#E4E4E7] dark:bg-[#3F3F46] rounded-full overflow-hidden mx-2">
//                                                 <div
//                                                     className="h-full rounded-full transition-all"
//                                                     style={{
//                                                         backgroundColor: item.color,
//                                                         width:
//                                                             totalProjects > 0
//                                                                 ? `${(item.value / totalProjects) * 100}%`
//                                                                 : "0%",
//                                                     }}
//                                                 />
//                                             </div>
//                                             <span className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] w-8 text-right">
//                                                 {isLoading ? "—" : item.value}
//                                             </span>
//                                         </div>
//                                     ))}
//                                     <div className="flex items-center justify-between py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                         <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
//                                             Total Project Staff
//                                         </span>
//                                         <span className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
//                                             {isLoading ? "—" : totalStaffCount} members
//                                         </span>
//                                     </div>
//                                     <div className="flex items-center justify-between py-2.5" />
//                                 </div>
//                             </div>

//                             {/* Recently Registered */}
//                             <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
//                                 <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
//                                     <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
//                                         <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/20 text-[#d97706]">
//                                             <svg
//                                                 className="w-3.5 h-3.5"
//                                                 fill="none"
//                                                 stroke="currentColor"
//                                                 strokeWidth="2"
//                                                 strokeLinecap="round"
//                                                 strokeLinejoin="round"
//                                                 viewBox="0 0 24 24"
//                                             >
//                                                 <circle cx="12" cy="12" r="10" />
//                                                 <polyline points="12 6 12 12 16 14" />
//                                             </svg>
//                                         </div>
//                                         Recently Registered
//                                     </div>
//                                 </div>
//                                 <div className="p-[18px] px-[22px] pt-2.5">
//                                     {isLoading ? (
//                                         <div className="py-8 text-center text-[#71717A] text-sm">
//                                             Loading...
//                                         </div>
//                                     ) : recentProjects.length === 0 ? (
//                                         <div className="py-8 text-center text-[#71717A] text-sm">
//                                             No recent projects.
//                                         </div>
//                                     ) : (
//                                         recentProjects.slice(0, 5).map((proj: any, idx: number) => {
//                                             const d = proj.creation
//                                                 ? new Date(proj.creation)
//                                                 : null;
//                                             const isNew = d
//                                                 ? Date.now() - d.getTime() < 30 * 24 * 3600 * 1000
//                                                 : false;
//                                             const label = d
//                                                 ? isNew
//                                                     ? "New"
//                                                     : d.toLocaleString("en-IN", { month: "short" })
//                                                 : "—";
//                                             return (
//                                                 <div
//                                                     key={proj.project_id || idx}
//                                                     className="flex items-center py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 gap-2.5"
//                                                 >
//                                                     <div className="text-[11px] font-extrabold text-[#71717A] w-5 shrink-0 font-mono">
//                                                         {String(idx + 1).padStart(2, "0")}
//                                                     </div>
//                                                     <div className="flex-1 min-w-0">
//                                                         <div className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate">
//                                                             {proj.project_title || "Untitled"}
//                                                         </div>
//                                                         <div className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] mt-[1px]">
//                                                             {proj.department
//                                                                 ? getDeptName(proj.department)
//                                                                 : "—"}{" "}
//                                                             · {proj.pi_name}
//                                                         </div>
//                                                     </div>
//                                                     <div
//                                                         className={`text-[11px] font-bold whitespace-nowrap ${isNew ? "text-[#2563eb]" : "text-[#71717A]"
//                                                             }`}
//                                                     >
//                                                         {label}
//                                                     </div>
//                                                 </div>
//                                             );
//                                         })
//                                     )}
//                                 </div>
//                             </div>

//                             {/* Top Funding Agencies */}
//                             <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
//                                 <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                     <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
//                                         <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-violet-50 dark:bg-violet-950/20 text-[#7c3aed]">
//                                             <svg
//                                                 className="w-3.5 h-3.5"
//                                                 fill="none"
//                                                 stroke="currentColor"
//                                                 strokeWidth="2"
//                                                 strokeLinecap="round"
//                                                 strokeLinejoin="round"
//                                                 viewBox="0 0 24 24"
//                                             >
//                                                 <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
//                                                 <polyline points="9 22 9 12 15 12 15 22" />
//                                             </svg>
//                                         </div>
//                                         Top Funding Agencies
//                                     </div>
//                                 </div>
//                                 <div className="p-[18px] px-[22px] pt-2.5">
//                                     {isLoading ? (
//                                         <div className="py-8 text-center text-[#71717A] text-sm">
//                                             Loading...
//                                         </div>
//                                     ) : fundingTypeData.length === 0 ? (
//                                         <div className="py-8 text-center text-[#71717A] text-sm">
//                                             No data available.
//                                         </div>
//                                     ) : (
//                                         fundingTypeData.slice(0, 5).map((agency: any, i: number) => {
//                                             const pct =
//                                                 totalFundingSources > 0
//                                                     ? Math.round(
//                                                         (agency.value / totalFundingSources) * 100
//                                                     )
//                                                     : 0;
//                                             const color = CHART_COLORS[i] || "#64748b";
//                                             return (
//                                                 <div key={i}>
//                                                     <div className="flex items-center justify-between py-[9px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                                         <div>
//                                                             <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
//                                                                 {agency.name}
//                                                             </div>
//                                                             <div className="text-[10px] text-[#71717A] dark:text-[#A1A1AA]">
//                                                                 {agency.value} projects
//                                                             </div>
//                                                         </div>
//                                                         <div className="text-right">
//                                                             <div
//                                                                 className="text-[13px] font-extrabold"
//                                                                 style={{ color }}
//                                                             >
//                                                                 {pct}%
//                                                             </div>
//                                                             <div className="text-[9px] text-[#71717A]">
//                                                                 of total
//                                                             </div>
//                                                         </div>
//                                                     </div>
//                                                     <div className="-mt-1 mb-2">
//                                                         <div className="h-1 bg-[#E4E4E7] dark:bg-[#3F3F46] rounded-full overflow-hidden">
//                                                             <div
//                                                                 className="h-full rounded-full transition-all"
//                                                                 style={{
//                                                                     backgroundColor: color,
//                                                                     width: `${pct}%`,
//                                                                 }}
//                                                             />
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             );
//                                         })
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 {viewMode === "Department" && (
//                     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
//                         <div className="flex items-center justify-between mb-6">
//                             <h2 className="text-[16px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7]">
//                                 Department Allocations
//                             </h2>
//                             <div className="relative">
//                                 <Search
//                                     className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] dark:text-[#A1A1AA]"
//                                     size={16}
//                                 />
//                                 <input
//                                     type="text"
//                                     placeholder="Search departments..."
//                                     value={deptSearch}
//                                     onChange={(e) => setDeptSearch(e.target.value)}
//                                     className="pl-9 pr-4 py-2 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] outline-none w-56 transition-all focus:border-[#2563eb] shadow-sm"
//                                 />
//                             </div>
//                         </div>

//                         <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
//                             <div className="overflow-x-auto">
//                                 <table className="w-full text-left border-collapse">
//                                     <thead>
//                                         <tr className="bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA] text-[11px] font-extrabold uppercase tracking-widest border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                             <th className="px-6 py-4">Department Name</th>
//                                             <th className="px-6 py-4">Active Projects</th>
//                                             <th className="px-6 py-4 text-right">View Data</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
//                                         {paginatedDepartments && paginatedDepartments.length > 0 ? (
//                                             paginatedDepartments.map((dept: any, index: number) => (
//                                                 <tr
//                                                     key={dept.dept_name || index}
//                                                     className="hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors group cursor-pointer"
//                                                     onClick={() => {
//                                                         setExpandedDept(dept.dept_name);
//                                                         setDeptModalPage(1);
//                                                     }}
//                                                 >
//                                                     <td className="px-6 py-4">
//                                                         <div className="flex items-center gap-3.5">
//                                                             <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-[#2563eb] font-bold text-[14px] border border-blue-100 dark:border-blue-800 shrink-0">
//                                                                 <Building2 size={16} />
//                                                             </div>
//                                                             <div>
//                                                                 <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight group-hover:text-[#2563eb] transition-colors">
//                                                                     {dept.dept_name}
//                                                                 </div>
//                                                             </div>
//                                                         </div>
//                                                     </td>
//                                                     <td className="px-6 py-4">
//                                                         <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
//                                                             {dept.project_count}
//                                                         </div>
//                                                     </td>
//                                                     <td className="px-6 py-4 text-right">
//                                                         <button
//                                                             onClick={(e) => {
//                                                                 e.stopPropagation();
//                                                                 setExpandedDept(dept.dept_name);
//                                                                 setDeptModalPage(1);
//                                                             }}
//                                                             className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#A1A1AA] hover:text-[#2563eb] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
//                                                         >
//                                                             <ArrowRight
//                                                                 size={16}
//                                                                 className="group-hover:translate-x-0.5 transition-transform"
//                                                             />
//                                                         </button>
//                                                     </td>
//                                                 </tr>
//                                             ))
//                                         ) : (
//                                             <tr>
//                                                 <td
//                                                     colSpan={3}
//                                                     className="px-6 py-20 text-center text-[#71717A] dark:text-[#A1A1AA] text-[13px]"
//                                                 >
//                                                     {deptSearch
//                                                         ? "No matching departments found."
//                                                         : "No departments found."}
//                                                 </td>
//                                             </tr>
//                                         )}
//                                     </tbody>
//                                 </table>
//                             </div>
//                             {filteredDepartments.length > 0 && (
//                                 <div className="flex items-center justify-between px-6 py-4 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
//                                     <span className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
//                                         Showing {(deptPage - 1) * PAGE_SIZE + 1} to{" "}
//                                         {Math.min(deptPage * PAGE_SIZE, filteredDepartments.length)}{" "}
//                                         of {filteredDepartments.length} entries
//                                     </span>
//                                     <div className="flex items-center gap-1.5">
//                                         <button
//                                             disabled={deptPage === 1}
//                                             onClick={() => setDeptPage((p) => p - 1)}
//                                             className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] disabled:opacity-50 transition-colors"
//                                         >
//                                             <ChevronLeft size={16} />
//                                         </button>
//                                         <span className="text-[12px] font-semibold px-2 text-[#3F3F46] dark:text-[#E4E4E7]">
//                                             Page {deptPage} of {deptTotalPages}
//                                         </span>
//                                         <button
//                                             disabled={deptPage === deptTotalPages}
//                                             onClick={() => setDeptPage((p) => p + 1)}
//                                             className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] disabled:opacity-50 transition-colors"
//                                         >
//                                             <ChevronRight size={16} />
//                                         </button>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 )}

//                 {viewMode === "PI" && (
//                     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
//                         <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
//                             <div className="px-6 py-5 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex flex-col md:flex-row md:items-center justify-between gap-4">
//                                 <h2 className="text-[16px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7]">
//                                     Investigator Workloads
//                                 </h2>
//                                 <div className="flex items-center gap-3">
//                                     <div className="relative">
//                                         <Search
//                                             className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] dark:text-[#A1A1AA]"
//                                             size={16}
//                                         />
//                                         <input
//                                             type="text"
//                                             placeholder="Search PIs..."
//                                             value={piSearch}
//                                             onChange={(e) => setPiSearch(e.target.value)}
//                                             className="pl-9 pr-4 py-2 bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] outline-none w-56 transition-all focus:border-[#2563eb]"
//                                         />
//                                     </div>
//                                     <button className="inline-flex items-center gap-2 px-4 py-2 text-[13px] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA] font-bold transition-all shadow-sm">
//                                         <Filter size={16} />
//                                         Filter
//                                     </button>
//                                 </div>
//                             </div>
//                             <div className="overflow-x-auto">
//                                 <table className="w-full text-left border-collapse">
//                                     <thead>
//                                         <tr className="bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA] text-[11px] font-extrabold uppercase tracking-widest border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                             <th className="px-6 py-4">Investigator Name</th>
//                                             <th className="px-6 py-4">Active Projects</th>
//                                             <th className="px-6 py-4 text-right">View Profile</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
//                                         {paginatedPIs && paginatedPIs.length > 0 ? (
//                                             paginatedPIs.map((pi: any, index: number) => (
//                                                 <tr
//                                                     key={pi.user_email || index}
//                                                     className="hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors group cursor-pointer"
//                                                     onClick={() => setExpandedPI(pi.user_email)}
//                                                 >
//                                                     <td className="px-6 py-4">
//                                                         <div className="flex items-center gap-3.5">
//                                                             <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-[#4f46e5] font-bold text-[14px] border border-indigo-100 dark:border-indigo-800 shrink-0">
//                                                                 {pi.user_name
//                                                                     ? pi.user_name.charAt(0).toUpperCase()
//                                                                     : "U"}
//                                                             </div>
//                                                             <div>
//                                                                 <p className="text-[14px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight group-hover:text-[#4f46e5] transition-colors">
//                                                                     {pi.user_name || "Unknown PI"}
//                                                                 </p>
//                                                                 <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
//                                                                     {pi.user_email}
//                                                                 </p>
//                                                             </div>
//                                                         </div>
//                                                     </td>
//                                                     <td className="px-6 py-4">
//                                                         <div className="flex items-center gap-1.5 inline-flex bg-[#FAFAF9] dark:bg-[#18181B] px-3 py-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
//                                                             <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
//                                                             <span className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
//                                                                 {pi.project_count}
//                                                             </span>
//                                                         </div>
//                                                     </td>
//                                                     <td className="px-6 py-4 text-right">
//                                                         <button
//                                                             onClick={(e) => {
//                                                                 e.stopPropagation();
//                                                                 setExpandedPI(pi.user_email);
//                                                             }}
//                                                             className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#A1A1AA] hover:text-[#4f46e5] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all border border-transparent shadow-sm"
//                                                         >
//                                                             <ArrowRight
//                                                                 size={16}
//                                                                 className="group-hover:translate-x-0.5 transition-transform"
//                                                             />
//                                                         </button>
//                                                     </td>
//                                                 </tr>
//                                             ))
//                                         ) : (
//                                             <tr>
//                                                 <td
//                                                     colSpan={3}
//                                                     className="px-6 py-16 text-center text-[#71717A] font-medium"
//                                                 >
//                                                     {piSearch
//                                                         ? "No matching investigators found."
//                                                         : "No Investigators found."}
//                                                 </td>
//                                             </tr>
//                                         )}
//                                     </tbody>
//                                 </table>
//                             </div>
//                             {filteredPIs.length > 0 && (
//                                 <div className="flex items-center justify-between px-6 py-4 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
//                                     <span className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
//                                         Showing {(piPage - 1) * PAGE_SIZE + 1} to{" "}
//                                         {Math.min(piPage * PAGE_SIZE, filteredPIs.length)} of{" "}
//                                         {filteredPIs.length} entries
//                                     </span>
//                                     <div className="flex items-center gap-1.5">
//                                         <button
//                                             disabled={piPage === 1}
//                                             onClick={() => setPiPage((p) => p - 1)}
//                                             className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] disabled:opacity-50 transition-colors"
//                                         >
//                                             <ChevronLeft size={16} />
//                                         </button>
//                                         <span className="text-[12px] font-semibold px-2 text-[#3F3F46] dark:text-[#E4E4E7]">
//                                             Page {piPage} of {piTotalPages}
//                                         </span>
//                                         <button
//                                             disabled={piPage === piTotalPages}
//                                             onClick={() => setPiPage((p) => p + 1)}
//                                             className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] disabled:opacity-50 transition-colors"
//                                         >
//                                             <ChevronRight size={16} />
//                                         </button>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 )}

//                 {/* ── Footer ── */}
//                 <footer className="flex items-center justify-between pt-5 border-t border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] text-[10px] font-semibold tracking-widest uppercase">
//                     <span>© 2026 R&D Operations · IIT Guwahati · Internal Use Only</span>
//                     <a
//                         href="mailto:ernd@iitg.ac.in"
//                         className="text-[#D97757] hover:underline normal-case font-semibold text-[11px] tracking-normal"
//                     >
//                         ernd@iitg.ac.in
//                     </a>
//                 </footer>
//             </div>

//             {/* ── Modal: Department Details ── */}
//             {expandedDept && selectedDeptDetails && (
//                 <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
//                     <div
//                         className="absolute inset-0"
//                         onClick={() => setExpandedDept(null)}
//                     />
//                     <div className="relative bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
//                         <div className="px-6 py-5 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between sticky top-0 bg-white dark:bg-[#18181B] rounded-t-2xl z-10">
//                             <div>
//                                 <h2 className="text-[18px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7]">
//                                     {getDeptName(selectedDeptDetails.dept_name)}
//                                 </h2>
//                                 <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
//                                     {selectedDeptDetails.investigators?.length || 0} Principal
//                                     Investigators
//                                 </p>
//                             </div>
//                             <button
//                                 onClick={() => setExpandedDept(null)}
//                                 className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717A] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
//                             >
//                                 <svg
//                                     className="w-5 h-5"
//                                     fill="none"
//                                     stroke="currentColor"
//                                     strokeWidth="2"
//                                     strokeLinecap="round"
//                                     strokeLinejoin="round"
//                                     viewBox="0 0 24 24"
//                                 >
//                                     <path d="M18 6L6 18M6 6l12 12" />
//                                 </svg>
//                             </button>
//                         </div>
//                         <div className="overflow-y-auto px-6 py-4 bg-slate-50/50 dark:bg-slate-900/20 custom-scrollbar flex-1">
//                             {selectedDeptDetails.investigators &&
//                                 selectedDeptDetails.investigators.length > 0 ? (
//                                 (() => {
//                                     const devTotalPages = Math.ceil(
//                                         selectedDeptDetails.investigators.length /
//                                         DEPT_MODAL_PAGE_SIZE
//                                     );
//                                     const pagedInvestigators =
//                                         selectedDeptDetails.investigators.slice(
//                                             (deptModalPage - 1) * DEPT_MODAL_PAGE_SIZE,
//                                             deptModalPage * DEPT_MODAL_PAGE_SIZE
//                                         );
//                                     return (
//                                         <>
//                                             <div className="space-y-3">
//                                                 {pagedInvestigators.map((inv: any, idx: number) => (
//                                                     <div
//                                                         key={idx}
//                                                         onClick={() => {
//                                                             setExpandedPI(inv.user_email);
//                                                             setPiModalPage(1);
//                                                         }}
//                                                         className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
//                                                     >
//                                                         <div className="flex items-center gap-4">
//                                                             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-900/30 flex items-center justify-center text-[#4f46e5] dark:text-indigo-400 font-extrabold text-[14px] border border-indigo-100/50 dark:border-indigo-800/50 shrink-0 shadow-sm">
//                                                                 {inv.user_name
//                                                                     ? inv.user_name.charAt(0).toUpperCase()
//                                                                     : "U"}
//                                                             </div>
//                                                             <div>
//                                                                 <div className="text-[14px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight mb-1">
//                                                                     {inv.user_name}
//                                                                 </div>
//                                                                 <div className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1.5">
//                                                                     <svg
//                                                                         className="w-3.5 h-3.5"
//                                                                         fill="none"
//                                                                         stroke="currentColor"
//                                                                         strokeWidth="2"
//                                                                         strokeLinecap="round"
//                                                                         strokeLinejoin="round"
//                                                                         viewBox="0 0 24 24"
//                                                                     >
//                                                                         <rect
//                                                                             width="20"
//                                                                             height="16"
//                                                                             x="2"
//                                                                             y="4"
//                                                                             rx="2"
//                                                                         />
//                                                                         <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
//                                                                     </svg>
//                                                                     {inv.user_email}
//                                                                 </div>
//                                                             </div>
//                                                         </div>
//                                                         <div className="inline-flex items-center gap-1.5 bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-[#2563eb] dark:hover:text-blue-400 px-3 py-1.5 rounded-lg shadow-sm text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] transition-all">
//                                                             <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
//                                                             {inv.project_count}{" "}
//                                                             {inv.project_count === 1 ? "Project" : "Projects"}
//                                                         </div>
//                                                     </div>
//                                                 ))}
//                                             </div>
//                                             {selectedDeptDetails.investigators.length >
//                                                 DEPT_MODAL_PAGE_SIZE && (
//                                                     <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
//                                                         <button
//                                                             disabled={deptModalPage === 1}
//                                                             onClick={() =>
//                                                                 setDeptModalPage((p) => Math.max(1, p - 1))
//                                                             }
//                                                             className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
//                                                         >
//                                                             <svg
//                                                                 className="w-3.5 h-3.5"
//                                                                 fill="none"
//                                                                 stroke="currentColor"
//                                                                 strokeWidth="2"
//                                                                 viewBox="0 0 24 24"
//                                                             >
//                                                                 <path d="M15 18l-6-6 6-6" />
//                                                             </svg>
//                                                             Prev
//                                                         </button>
//                                                         <span className="text-[11px] font-semibold text-[#A1A1AA]">
//                                                             Page {deptModalPage} of {devTotalPages}
//                                                         </span>
//                                                         <button
//                                                             disabled={deptModalPage === devTotalPages}
//                                                             onClick={() =>
//                                                                 setDeptModalPage((p) =>
//                                                                     Math.min(devTotalPages, p + 1)
//                                                                 )
//                                                             }
//                                                             className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] bg-white dark:bg-[#27272A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
//                                                         >
//                                                             Next
//                                                             <svg
//                                                                 className="w-3.5 h-3.5"
//                                                                 fill="none"
//                                                                 stroke="currentColor"
//                                                                 strokeWidth="2"
//                                                                 viewBox="0 0 24 24"
//                                                             >
//                                                                 <path d="M9 18l6-6-6-6" />
//                                                             </svg>
//                                                         </button>
//                                                     </div>
//                                                 )}
//                                         </>
//                                     );
//                                 })()
//                             ) : (
//                                 <div className="py-12 flex flex-col items-center justify-center text-center">
//                                     <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
//                                         <Users className="w-6 h-6 text-slate-400" />
//                                     </div>
//                                     <p className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
//                                         No specific investigators detailed.
//                                     </p>
//                                     <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-1.5 max-w-xs leading-relaxed">
//                                         Project counts are aggregated internally but PI mappings are
//                                         currently unavailable for this department.
//                                     </p>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* ── Modal: PI Details ── */}
//             {expandedPI && selectedPIDetails && (
//                 <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
//                     <div
//                         className="absolute inset-0"
//                         onClick={() => setExpandedPI(null)}
//                     />
//                     <div className="relative bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-2xl w-full max-w-[780px] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
//                         <div className="px-5 pt-5 pb-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-start justify-between relative bg-white dark:bg-[#18181B] rounded-t-2xl z-10 overflow-hidden">
//                             <div className="absolute top-0 left-0 w-full h-14 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 dark:from-indigo-500/20 dark:to-blue-500/20 z-0" />
//                             <div className="flex items-center gap-4 relative z-10 pt-4">
//                                 <div className="w-14 h-14 rounded-full bg-white dark:bg-[#27272A] flex items-center justify-center text-[#4f46e5] font-extrabold text-[20px] border border-indigo-100 dark:border-indigo-800 shadow-md ring-4 ring-white dark:ring-[#18181B]">
//                                     {selectedPIDetails.user_name
//                                         ? selectedPIDetails.user_name.charAt(0).toUpperCase()
//                                         : "U"}
//                                 </div>
//                                 <div>
//                                     <h2 className="text-[18px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
//                                         {selectedPIDetails.user_name}
//                                     </h2>
//                                     <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1.5 mt-0.5">
//                                         <svg
//                                             className="w-3.5 h-3.5"
//                                             fill="none"
//                                             stroke="currentColor"
//                                             strokeWidth="2"
//                                             strokeLinecap="round"
//                                             strokeLinejoin="round"
//                                             viewBox="0 0 24 24"
//                                         >
//                                             <rect width="20" height="16" x="2" y="4" rx="2" />
//                                             <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
//                                         </svg>
//                                         {selectedPIDetails.user_email}
//                                     </p>
//                                 </div>
//                             </div>
//                             <button
//                                 onClick={() => setExpandedPI(null)}
//                                 className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717A] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10 relative"
//                             >
//                                 <svg
//                                     className="w-5 h-5"
//                                     fill="none"
//                                     stroke="currentColor"
//                                     strokeWidth="2"
//                                     strokeLinecap="round"
//                                     strokeLinejoin="round"
//                                     viewBox="0 0 24 24"
//                                 >
//                                     <path d="M18 6L6 18M6 6l12 12" />
//                                 </svg>
//                             </button>
//                         </div>

//                         <div className="p-5 bg-slate-50/50 dark:bg-slate-900/20 overflow-y-auto max-h-[75vh]">
//                             {(() => {
//                                 return (
//                                     <div className="grid grid-cols-2 gap-3 mb-6">
//                                         <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-4 rounded-xl shadow-sm text-center">
//                                             <div className="text-[20px] font-extrabold text-[#2563eb] leading-tight">
//                                                 {selectedPIDetails.project_count}
//                                             </div>
//                                             <div className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">
//                                                 Active Projects
//                                             </div>
//                                         </div>
//                                         <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-4 rounded-xl shadow-sm text-center">
//                                             <div className="text-[20px] font-extrabold text-[#7c3aed] leading-tight">
//                                                 {selectedPIDetails.departments?.length || 0}
//                                             </div>
//                                             <div className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">
//                                                 Affiliated Depts
//                                             </div>
//                                         </div>

//                                     </div>
//                                 );
//                             })()}

//                             <div>
//                                 <h3 className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] mb-3 uppercase tracking-widest flex items-center gap-2">
//                                     <Building2 size={14} className="text-[#A1A1AA]" />
//                                     Department Affiliations
//                                 </h3>
//                                 {selectedPIDetails.departments &&
//                                     selectedPIDetails.departments.length > 0 ? (
//                                     <div className="flex flex-col gap-2">
//                                         {selectedPIDetails.departments.map(
//                                             (dept: string, idx: number) => (
//                                                 <div
//                                                     key={idx}
//                                                     className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg p-3 flex items-center justify-between text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] shadow-sm"
//                                                 >
//                                                     {getDeptName(dept)}
//                                                 </div>
//                                             )
//                                         )}
//                                     </div>
//                                 ) : (
//                                     <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg p-4 text-center text-[#71717A] text-[12px]">
//                                         No specific departmental affiliations found in recent
//                                         records.
//                                     </div>
//                                 )}
//                             </div>

//                             {selectedPIProjects.length > 0 &&
//                                 (() => {
//                                     const piProjectTotalPages = Math.ceil(
//                                         selectedPIProjects.length / PI_PROJECTS_PAGE_SIZE
//                                     );
//                                     const pagedProjects = selectedPIProjects.slice(
//                                         (piModalPage - 1) * PI_PROJECTS_PAGE_SIZE,
//                                         piModalPage * PI_PROJECTS_PAGE_SIZE
//                                     );
//                                     return (
//                                         <div className="mt-5">
//                                             <h3 className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] mb-3 uppercase tracking-widest flex items-center gap-2">
//                                                 <svg
//                                                     className="w-3.5 h-3.5 text-[#A1A1AA]"
//                                                     fill="none"
//                                                     stroke="currentColor"
//                                                     strokeWidth="2"
//                                                     strokeLinecap="round"
//                                                     strokeLinejoin="round"
//                                                     viewBox="0 0 24 24"
//                                                 >
//                                                     <rect x="3" y="4" width="18" height="18" rx="2" />
//                                                     <line x1="16" y1="2" x2="16" y2="6" />
//                                                     <line x1="8" y1="2" x2="8" y2="6" />
//                                                     <line x1="3" y1="10" x2="21" y2="10" />
//                                                 </svg>
//                                                 Project Timeline
//                                                 <span className="ml-auto text-[10px] font-semibold text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2 py-0.5 rounded-full normal-case tracking-normal">
//                                                     {selectedPIProjects.length} project
//                                                     {selectedPIProjects.length !== 1 ? "s" : ""}
//                                                 </span>
//                                             </h3>
//                                             <div className="flex flex-col gap-3">
//                                                 {pagedProjects.map((proj: any, idx: number) => {
//                                                     const globalIdx =
//                                                         (piModalPage - 1) * PI_PROJECTS_PAGE_SIZE + idx;
//                                                     const startDate = proj.prj_start_date
//                                                         ? new Date(proj.prj_start_date)
//                                                         : null;
//                                                     const endDate = proj.prj_end_date
//                                                         ? new Date(proj.prj_end_date)
//                                                         : null;
//                                                     const totalMonths =
//                                                         startDate && endDate
//                                                             ? Math.max(
//                                                                 0,
//                                                                 Math.round(
//                                                                     (endDate.getTime() -
//                                                                         startDate.getTime()) /
//                                                                     (1000 * 60 * 60 * 24 * 30.44)
//                                                                 )
//                                                             )
//                                                             : null;
//                                                     const now = new Date();
//                                                     const isActive =
//                                                         startDate &&
//                                                         endDate &&
//                                                         now >= startDate &&
//                                                         now <= endDate;
//                                                     const isCompleted = endDate && now > endDate;
//                                                     const formatDate = (d: Date | null) =>
//                                                         d
//                                                             ? d.toLocaleDateString("en-IN", {
//                                                                 day: "2-digit",
//                                                                 month: "short",
//                                                                 year: "numeric",
//                                                             })
//                                                             : "—";
//                                                     const progressPct =
//                                                         startDate && endDate && now > startDate
//                                                             ? Math.min(
//                                                                 100,
//                                                                 Math.round(
//                                                                     ((now.getTime() - startDate.getTime()) /
//                                                                         (endDate.getTime() -
//                                                                             startDate.getTime())) *
//                                                                     100
//                                                                 )
//                                                             )
//                                                             : 0;
//                                                     const COLORS = [
//                                                         "#2563eb",
//                                                         "#7c3aed",
//                                                         "#059669",
//                                                         "#d97706",
//                                                         "#0284c7",
//                                                         "#e11d48",
//                                                     ];
//                                                     const accentColor =
//                                                         COLORS[globalIdx % COLORS.length];
//                                                     const startYear = startDate
//                                                         ? startDate.getFullYear()
//                                                         : null;
//                                                     const endYear = endDate
//                                                         ? endDate.getFullYear()
//                                                         : null;
//                                                     const yearRange =
//                                                         startYear && endYear
//                                                             ? startYear === endYear
//                                                                 ? `${startYear}`
//                                                                 : `${startYear} – ${endYear}`
//                                                             : "—";
//                                                     return (
//                                                         <div
//                                                             key={proj.name}
//                                                             className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl p-4 shadow-sm"
//                                                         >
//                                                             <div className="flex items-start justify-between gap-3 mb-3">
//                                                                 <div className="flex-1 min-w-0">
//                                                                     <div className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-snug line-clamp-2">
//                                                                         {proj.project_title || proj.name}
//                                                                     </div>
//                                                                     {proj.project_no && (
//                                                                         <div className="text-[10px] font-mono text-[#A1A1AA] mt-0.5">
//                                                                             {proj.project_no}
//                                                                         </div>
//                                                                     )}
//                                                                     {(() => {
//                                                                         const fund = proj.total_budget_amount || proj.grand_total_proposal || 0;
//                                                                         if (!fund) return null;
//                                                                         const formattedFund = fund >= 10000000
//                                                                             ? `₹${(fund / 10000000).toFixed(2)} Cr`
//                                                                             : fund >= 100000
//                                                                                 ? `₹${(fund / 100000).toFixed(2)} L`
//                                                                                 : `₹${fund.toLocaleString("en-IN")}`;
//                                                                         return (
//                                                                             <div className="text-[10px] font-extrabold mt-1" style={{ color: accentColor }}>
//                                                                                 {formattedFund}
//                                                                             </div>
//                                                                         );
//                                                                     })()}
//                                                                 </div>
//                                                                 <span
//                                                                     className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${isCompleted
//                                                                         ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
//                                                                         : isActive
//                                                                             ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
//                                                                             : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
//                                                                         }`}
//                                                                 >
//                                                                     {isCompleted
//                                                                         ? "Completed"
//                                                                         : isActive
//                                                                             ? "● Active"
//                                                                             : "Upcoming"}
//                                                                 </span>
//                                                             </div>
//                                                             <div className="grid grid-cols-3 gap-2 mb-3">
//                                                                 <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5 text-center">
//                                                                     <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">
//                                                                         Start
//                                                                     </div>
//                                                                     <div className="text-[11px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
//                                                                         {formatDate(startDate)}
//                                                                     </div>
//                                                                 </div>
//                                                                 <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5 text-center">
//                                                                     <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">
//                                                                         End
//                                                                     </div>
//                                                                     <div className="text-[11px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
//                                                                         {formatDate(endDate)}
//                                                                     </div>
//                                                                 </div>
//                                                                 <div
//                                                                     className="rounded-lg p-2.5 text-center"
//                                                                     style={{
//                                                                         backgroundColor: accentColor + "15",
//                                                                     }}
//                                                                 >
//                                                                     <div
//                                                                         className="text-[10px] font-bold uppercase tracking-widest mb-1"
//                                                                         style={{ color: accentColor }}
//                                                                     >
//                                                                         Duration
//                                                                     </div>
//                                                                     <div
//                                                                         className="text-[13px] font-extrabold leading-tight"
//                                                                         style={{ color: accentColor }}
//                                                                     >
//                                                                         {totalMonths !== null
//                                                                             ? `${totalMonths}mo`
//                                                                             : "—"}
//                                                                     </div>
//                                                                     <div className="text-[9px] font-semibold text-[#A1A1AA] mt-0.5">
//                                                                         {yearRange}
//                                                                     </div>
//                                                                 </div>
//                                                             </div>
//                                                             {startDate &&
//                                                                 endDate &&
//                                                                 (isActive || isCompleted) && (
//                                                                     <div>
//                                                                         {(() => {
//                                                                             const progressColor =
//                                                                                 isCompleted
//                                                                                     ? "#A1A1AA"
//                                                                                     : progressPct >= 80
//                                                                                         ? "#EF4444"
//                                                                                         : progressPct >= 60
//                                                                                             ? "#FB923C"
//                                                                                             : progressPct >= 40
//                                                                                                 ? "#FACC15"
//                                                                                                 : "#22C55E";
//                                                                             return (
//                                                                                 <>
//                                                                                     <div className="flex justify-between items-center mb-1">
//                                                                                         <span
//                                                                                             className="text-[10px] font-bold"
//                                                                                             style={{ color: progressColor }}
//                                                                                         >
//                                                                                             {progressPct}% complete
//                                                                                         </span>
//                                                                                         <span className="text-[10px] font-semibold text-[#A1A1AA]">
//                                                                                             {isCompleted
//                                                                                                 ? "Finished"
//                                                                                                 : `${Math.max(
//                                                                                                     0,
//                                                                                                     Math.round(
//                                                                                                         (endDate.getTime() -
//                                                                                                             now.getTime()) /
//                                                                                                         (1000 * 60 * 60 * 24 * 30.44)
//                                                                                                     )
//                                                                                                 )}mo left`}
//                                                                                         </span>
//                                                                                     </div>
//                                                                                     <div className="h-1.5 bg-[#F4F4F5] dark:bg-[#3F3F46] rounded-full overflow-hidden">
//                                                                                         <div
//                                                                                             className="h-full rounded-full transition-all"
//                                                                                             style={{
//                                                                                                 width: `${progressPct}%`,
//                                                                                                 backgroundColor: progressColor,
//                                                                                             }}
//                                                                                         />
//                                                                                     </div>
//                                                                                 </>
//                                                                             );
//                                                                         })()}
//                                                                     </div>
//                                                                 )}
//                                                         </div>
//                                                     );
//                                                 })}
//                                             </div>
//                                             {piProjectTotalPages > 1 && (
//                                                 <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
//                                                     <button
//                                                         disabled={piModalPage === 1}
//                                                         onClick={() =>
//                                                             setPiModalPage((p) => Math.max(1, p - 1))
//                                                         }
//                                                         className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
//                                                     >
//                                                         <svg
//                                                             className="w-3.5 h-3.5"
//                                                             fill="none"
//                                                             stroke="currentColor"
//                                                             strokeWidth="2"
//                                                             viewBox="0 0 24 24"
//                                                         >
//                                                             <path d="M15 18l-6-6 6-6" />
//                                                         </svg>
//                                                         Prev
//                                                     </button>
//                                                     <span className="text-[11px] font-semibold text-[#A1A1AA]">
//                                                         Page {piModalPage} of {piProjectTotalPages}
//                                                     </span>
//                                                     <button
//                                                         disabled={piModalPage === piProjectTotalPages}
//                                                         onClick={() =>
//                                                             setPiModalPage((p) =>
//                                                                 Math.min(piProjectTotalPages, p + 1)
//                                                             )
//                                                         }
//                                                         className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] bg-white dark:bg-[#27272A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
//                                                     >
//                                                         Next
//                                                         <svg
//                                                             className="w-3.5 h-3.5"
//                                                             fill="none"
//                                                             stroke="currentColor"
//                                                             strokeWidth="2"
//                                                             viewBox="0 0 24 24"
//                                                         >
//                                                             <path d="M9 18l6-6-6-6" />
//                                                         </svg>
//                                                     </button>
//                                                 </div>
//                                             )}
//                                         </div>
//                                     );
//                                 })()}
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* ── Modal: KPI ── */}
//             {kpiModal && (
//                 <div
//                     className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
//                     style={{
//                         backdropFilter: "blur(6px)",
//                         WebkitBackdropFilter: "blur(6px)",
//                         backgroundColor: "rgba(0,0,0,0.45)",
//                     }}
//                     onClick={closeKpiModal}
//                 >
//                     <div
//                         className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl border border-[#E4E4E7] dark:border-[#3F3F46] w-full max-w-4xl max-h-[85vh] flex flex-col"
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46] shrink-0">
//                             <div>
//                                 <p className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] mb-0.5">
//                                     Projects
//                                 </p>
//                                 <h2 className="text-[16px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">
//                                     {kpiModal.title}
//                                 </h2>
//                             </div>
//                             <div className="flex items-center gap-3">
//                                 <span className="text-[11px] font-semibold text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2.5 py-1 rounded-full">
//                                     {kpiModalRows.length} record
//                                     {kpiModalRows.length !== 1 ? "s" : ""}
//                                 </span>
//                                 <button
//                                     onClick={closeKpiModal}
//                                     className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] transition-colors"
//                                 >
//                                     <X size={16} />
//                                 </button>
//                             </div>
//                         </div>

//                         {kpiModal.type === "total" && (
//                             <div className="flex items-center gap-1 px-6 pt-3 pb-0 shrink-0 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                                 {(
//                                     [
//                                         {
//                                             key: "ongoing",
//                                             label: "Ongoing",
//                                             count: projectStatusCounts.ongoing,
//                                             activeClass:
//                                                 "border-emerald-500 text-emerald-700 dark:text-emerald-400",
//                                         },
//                                         {
//                                             key: "submitted",
//                                             label: "Submitted",
//                                             count: projectStatusCounts.submitted,
//                                             activeClass:
//                                                 "border-amber-500 text-amber-700 dark:text-amber-400",
//                                         },
//                                     ] as const
//                                 ).map((tab) => (
//                                     <button
//                                         key={tab.key}
//                                         onClick={() => {
//                                             setKpiTab(tab.key);
//                                             setKpiPage(1);
//                                         }}
//                                         className={`flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-[11px] font-bold border-b-2 transition-colors ${kpiTab === tab.key
//                                             ? tab.activeClass + " border-current"
//                                             : "border-transparent text-[#71717A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]"
//                                             }`}
//                                     >
//                                         {tab.label}
//                                         <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F4F4F5] dark:bg-[#3F3F46] text-[#71717A]">
//                                             {tab.count}
//                                         </span>
//                                     </button>
//                                 ))}
//                             </div>
//                         )}

//                         {kpiModal.type === "allocation" && (
//                             <div className="flex items-center gap-1 px-6 pt-3 pb-0 shrink-0 border-b border-[#E4E4E7] dark:border-[#3F3F46] overflow-x-auto">
//                                 {(
//                                     [
//                                         {
//                                             key: "ongoing",
//                                             label: "Ongoing",
//                                             count: overview.ongoing_projects || 0,
//                                             activeColor: "text-emerald-600 border-emerald-500",
//                                         },
//                                         {
//                                             key: "submitted",
//                                             label: "Submitted",
//                                             count: overview.submitted_projects || 0,
//                                             activeColor: "text-amber-600 border-amber-400",
//                                         },
//                                     ] as const
//                                 ).map((tab) => {
//                                     const isActive = kpiAllocTab === tab.key;
//                                     return (
//                                         <button
//                                             key={tab.key}
//                                             onClick={() => {
//                                                 setKpiAllocTab(tab.key);
//                                                 setKpiPage(1);
//                                             }}
//                                             className={`flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-[11px] font-bold border-b-2 whitespace-nowrap transition-colors ${isActive
//                                                 ? tab.activeColor
//                                                 : "border-transparent text-[#71717A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]"
//                                                 }`}
//                                         >
//                                             {tab.label}
//                                             <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F4F4F5] dark:bg-[#3F3F46] text-[#71717A]">
//                                                 {tab.count}
//                                             </span>
//                                         </button>
//                                     );
//                                 })}
//                             </div>
//                         )}

//                         <div className="overflow-auto flex-1">
//                             <table className="w-full text-left border-collapse">
//                                 <thead>
//                                     <tr className="bg-[#FAFAF9] dark:bg-[#18181B] sticky top-0">
//                                         {["#", "Project", "PI", "Dept", "Status", "Budget"].map(
//                                             (h) => (
//                                                 <th
//                                                     key={h}
//                                                     className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#71717A]${h === "Budget" ? " text-right" : ""
//                                                         }`}
//                                                 >
//                                                     {h}
//                                                 </th>
//                                             )
//                                         )}
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {kpiPagedRows.length === 0 ? (
//                                         <tr>
//                                             <td
//                                                 colSpan={6}
//                                                 className="px-4 py-10 text-center text-[#71717A] text-sm"
//                                             >
//                                                 {allProjectsList === undefined
//                                                     ? "Loading…"
//                                                     : "No projects found."}
//                                             </td>
//                                         </tr>
//                                     ) : (
//                                         kpiPagedRows.map((proj: any, idx: number) => (
//                                             <tr
//                                                 key={proj.name || idx}
//                                                 className="border-t border-[#F4F4F5] dark:border-[#3F3F46] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors"
//                                             >
//                                                 <td className="px-4 py-3 text-[10px] font-bold text-[#71717A] font-mono">
//                                                     {(kpiPage - 1) * KPI_PAGE_SIZE + idx + 1}
//                                                 </td>
//                                                 <td className="px-4 py-3">
//                                                     <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-1">
//                                                         {proj.project_title || proj.name || "—"}
//                                                     </div>
//                                                     {proj.project_no && (
//                                                         <span className="font-mono text-[9px] text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-1.5 py-0.5 rounded mt-0.5 inline-block">
//                                                             {proj.project_no}
//                                                         </span>
//                                                     )}
//                                                 </td>
//                                                 <td className="px-4 py-3 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
//                                                     {proj.pi_webmail || "—"}
//                                                 </td>
//                                                 <td className="px-4 py-3 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
//                                                     {getDeptName(proj.implementation_department)}
//                                                 </td>
//                                                 <td className="px-4 py-3">
//                                                     <StatusBadge status={proj.workflow_state} />
//                                                 </td>
//                                                 <td className="px-4 py-3 text-right">
//                                                     <div className="text-[12px] font-extrabold text-[#059669] whitespace-nowrap">
//                                                         {proj.total_budget_amount || proj.grand_total_proposal
//                                                             ? formatCurrency(
//                                                                 proj.total_budget_amount ||
//                                                                 proj.grand_total_proposal
//                                                             )
//                                                             : "—"}
//                                                     </div>
//                                                     {proj.project_type?.toLowerCase() === "consultancy" && (
//                                                         <div className="text-[9px] text-[#F59E0B] font-medium mt-0.5 whitespace-nowrap">
//                                                             Ignore if consultancy project
//                                                         </div>
//                                                     )}
//                                                 </td>
//                                             </tr>
//                                         ))
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>

//                         {kpiTotalPages > 1 && (
//                             <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#E4E4E7] dark:border-[#3F3F46] shrink-0">
//                                 <span className="text-[11px] text-[#71717A]">
//                                     Page {kpiPage} of {kpiTotalPages}
//                                 </span>
//                                 <div className="flex items-center gap-1.5">
//                                     <button
//                                         onClick={() => setKpiPage((p) => Math.max(1, p - 1))}
//                                         disabled={kpiPage === 1}
//                                         className="w-7 h-7 rounded-lg flex items-center justify-center text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
//                                     >
//                                         <ChevronLeft size={14} />
//                                     </button>
//                                     {Array.from(
//                                         { length: Math.min(5, kpiTotalPages) },
//                                         (_, i) => {
//                                             const start = Math.max(
//                                                 1,
//                                                 Math.min(kpiPage - 2, kpiTotalPages - 4)
//                                             );
//                                             const page = start + i;
//                                             return (
//                                                 <button
//                                                     key={page}
//                                                     onClick={() => setKpiPage(page)}
//                                                     className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-colors ${page === kpiPage
//                                                         ? "bg-[#2563eb] text-white"
//                                                         : "text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]"
//                                                         }`}
//                                                 >
//                                                     {page}
//                                                 </button>
//                                             );
//                                         }
//                                     )}
//                                     <button
//                                         onClick={() =>
//                                             setKpiPage((p) => Math.min(kpiTotalPages, p + 1))
//                                         }
//                                         disabled={kpiPage === kpiTotalPages}
//                                         className="w-7 h-7 rounded-lg flex items-center justify-center text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
//                                     >
//                                         <ChevronRight size={14} />
//                                     </button>
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }



// -=-=-=-=------------------=============





import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
    useFrappeAuth,
    useFrappeGetDoc,
    useFrappeGetCall,
    useFrappeGetDocList,
} from "frappe-react-sdk";
import { useUserRoles } from "../../components/UserRole";
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
    X,
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
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0 transition-transform"
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
            <div
                className={`text-[32px] font-extrabold tracking-tight leading-none mb-2 drop-shadow-sm ${valueColor}`}
            >
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

    // Handle exact computed _status keys from the table filter
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
    if (status === "pending")
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-amber-500 shrink-0" />
                Pending
            </span>
        );

    const s = status.toLowerCase();

    // Sanctioned / Ongoing
    if (s.includes("ongoing") || s.includes("sanctioned") || s.includes("active"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-500 shrink-0" />
                Ongoing (Sanctioned)
            </span>
        );

    // Submitted — approved but waiting for sanction
    if (s.includes("submitted") || s.includes("pending sanction") || s.includes("approved"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-blue-500 shrink-0" />
                Submitted (Pending Sanction)
            </span>
        );

    // Draft
    if (s.includes("draft"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-zinc-400 shrink-0" />
                Draft
            </span>
        );

    // Completed
    if (s.includes("complet"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-violet-500 shrink-0" />
                Completed
            </span>
        );

    // Cancelled / Rejected
    if (s.includes("cancel") || s.includes("reject"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-red-500 shrink-0" />
                Cancelled
            </span>
        );

    // Pending / Awaiting something
    if (s.includes("pending") || s.includes("review") || s.includes("waiting"))
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 whitespace-nowrap">
                <span className="w-[5px] h-[5px] rounded-full bg-amber-500 shrink-0" />
                Pending
            </span>
        );

    // Fallback
    return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 whitespace-nowrap">
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
            <p className="text-slate-400 text-[10px] mb-1 font-bold">
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

export function DirectorDashboard() {
    const [searchParams] = useSearchParams();
    const { currentUser } = useFrappeAuth();
    const [time, setTime] = React.useState(new Date());
    const [kpiModal, setKpiModal] = React.useState<{
        type: string;
        title: string;
    } | null>(null);
    const [kpiPage, setKpiPage] = React.useState(1);
    const [kpiTab, setKpiTab] = React.useState<"ongoing" | "submitted">(
        "ongoing"
    );
    const [kpiAllocTab, setKpiAllocTab] = React.useState<string>("ongoing");
    const [piModalPage, setPiModalPage] = React.useState(1);
    const [deptModalPage, setDeptModalPage] = React.useState(1);
    const PI_PROJECTS_PAGE_SIZE = 2;
    const DEPT_MODAL_PAGE_SIZE = 10;
    const KPI_PAGE_SIZE = 10;

    // Projects table filter & pagination
    const [projectTableFilter, setProjectTableFilter] = React.useState<string>("all");
    const [projectTablePage, setProjectTablePage] = React.useState(1);
    const PROJECT_TABLE_PAGE_SIZE = 10;

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

    // Fetch role-based project counts
    const { data: roleBasedProjectsData } = useFrappeGetCall<{ message: any }>(
        "rndopsapp.dashboard.get_role_based_project_counts"
    );

    const roleBasedProjects = roleBasedProjectsData?.message || [];

    // Fetch all projects with start/end dates for year-wise chart and KPI modals
    const { data: allProjectsList } = useFrappeGetDocList(
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

    // ── Overview / finance values ─────────────────────────────────────────────
    const overview = data.project_overview || {};
    const funds = data.funding_analytics || {};
    const intl = data.international_collaboration || {};
    const proposals = data.proposal_analytics || {};
    const ipr = data.ipr_analytics || {};
    const topProjects = data.top_funded_projects || [];
    const recentProjects = data.recent_projects || [];

    // ── Project status by year — strict frontend count to guarantee 83 match ───
    const projectStatusByYearData = React.useMemo(() => {
        const yearMap: Record<string, { year: string; ongoing: number; submitted: number }> = {};
        const submittedIds = new Set<string>(overview?.submitted_project_nos || []);
        const ongoingIds = new Set<string>(overview?.ongoing_project_nos || []);

        (allProjectsList || []).forEach((proj: any) => {
            const isOngoing = ongoingIds.has(proj.name);
            const isSubmitted = submittedIds.has(proj.name);
            if (!isOngoing && !isSubmitted) return;

            let yearLabel = "Unknown";
            if (proj.prj_start_date) {
                yearLabel = String(new Date(proj.prj_start_date).getFullYear());
            } else {
                // Fallback if missing start date
                yearLabel = "2024";
            }

            if (!yearMap[yearLabel]) {
                yearMap[yearLabel] = { year: yearLabel, ongoing: 0, submitted: 0 };
            }

            if (isOngoing) {
                yearMap[yearLabel].ongoing += 1;
            } else if (isSubmitted) {
                yearMap[yearLabel].submitted += 1;
            }
        });

        return Object.values(yearMap).sort((a, b) => a.year.localeCompare(b.year));
    }, [allProjectsList, overview]);

    const fundingTypeData = data.funding_sources || [];

    // ── Status counts — from backend (single source of truth) ───────────────
    // Ongoing  = has submitted Fund Sanction  (backend: ongoing_project_nos)
    // Submitted = no Fund Sanction yet        (backend: submitted_project_nos)
    const ongoingIds = React.useMemo(
        () => new Set<string>(overview.ongoing_project_nos || []),
        [overview]
    );
    const submittedIds = React.useMemo(
        () => new Set<string>(overview.submitted_project_nos || []),
        [overview]
    );
    const projectStatusCounts = {
        ongoing: overview.ongoing_projects || 0,
        submitted: overview.submitted_projects || 0,
    };

    const totalProjectBadges = React.useMemo(
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
                title: "Registration but pending sanction",
                dotColor: "bg-amber-400",
                bgClass: "bg-amber-50 dark:bg-amber-950/30",
                textClass: "text-amber-700 dark:text-amber-400",
            },
        ],
        [projectStatusCounts]
    );

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
                title: "Registration but pending sanction",
                dotColor: "bg-amber-400",
                bgClass: "bg-amber-50 dark:bg-amber-950/30",
                textClass: "text-amber-700 dark:text-amber-400",
            },
        ],
        [projectStatusCounts]
    );




    // ── KPI modal rows — use backend-provided ID sets ────────────────────────
    const kpiModalRows = React.useMemo(() => {
        const projects: any[] = allProjectsList ?? [];
        if (!kpiModal) return [];

        // Ongoing  = in ongoingIds  (has submitted Fund Sanction)
        // Submitted = in submittedIds (no Fund Sanction yet)
        if (kpiModal.type === "total") {
            if (kpiTab === "submitted") return projects.filter((p) => submittedIds.has(p.name));
            return projects.filter((p) => ongoingIds.has(p.name));
        }
        if (kpiModal.type === "allocation") {
            const base = kpiAllocTab === "submitted"
                ? projects.filter((p) => submittedIds.has(p.name))
                : projects.filter((p) => ongoingIds.has(p.name));
            return [...base].sort(
                (a, b) =>
                    (b.total_budget_amount || b.grand_total_proposal || 0) -
                    (a.total_budget_amount || a.grand_total_proposal || 0)
            );
        }
        if (kpiModal.type === "ongoing") return projects.filter((p) => ongoingIds.has(p.name));
        if (kpiModal.type === "intl") {
            return projects.filter(
                (p) => (p.origin_of_funding_agency || "").toLowerCase() === "international"
            );
        }
        return projects;
    }, [allProjectsList, ongoingIds, submittedIds, kpiModal, kpiTab, kpiAllocTab]);

    const kpiTotalPages = Math.max(
        1,
        Math.ceil(kpiModalRows.length / KPI_PAGE_SIZE)
    );
    const kpiPagedRows = kpiModalRows.slice(
        (kpiPage - 1) * KPI_PAGE_SIZE,
        kpiPage * KPI_PAGE_SIZE
    );

    // ── FIX: openKpiModal now initialises kpiAllocTab to "ongoing" (not raw workflow state) ──
    const openKpiModal = (type: string, title: string) => {
        setKpiModal({ type, title });
        setKpiPage(1);
        setKpiTab("ongoing");
        setKpiAllocTab("ongoing");
    };

    // ── FIX: openKpiModalWithTab normalises raw state labels to tab keys ──
    const openKpiModalWithTab = (type: string, title: string, tab: string) => {
        setKpiModal({ type, title });
        setKpiPage(1);
        const t = tab.toLowerCase();
        if (type === "total") {
            setKpiTab(t.includes("submit") || t.includes("pending") ? "submitted" : "ongoing");
        } else if (type === "allocation") {
            setKpiAllocTab(t.includes("submit") || t.includes("pending") ? "submitted" : "ongoing");
        }
    };

    const closeKpiModal = () => setKpiModal(null);

    // ── Start vs End Sanction data ────────────────────────────────────────────
    const startEndSanctionData = React.useMemo(() => {
        const yearMap: Record<
            string,
            { year: string; startAmount: number; endAmount: number }
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
                    };
                yearMap[startYear].startAmount += amount;
            }
            if (endYear) {
                if (!yearMap[endYear])
                    yearMap[endYear] = { year: endYear, startAmount: 0, endAmount: 0 };
                yearMap[endYear].endAmount += amount;
            }
        });

        return Object.values(yearMap).sort((a, b) =>
            a.year.localeCompare(b.year)
        );
    }, [allProjectsList]);

    // ── Derived display values ────────────────────────────────────────────────
    const totalProjects = overview.total_projects || 0;
    const ongoingProjects = overview.ongoing_projects || 0;
    const totalStaffCount = overview.total_staff_count || 0;

    const fundAlloc = funds.total_allocation || 0;
    const fundUtilized = funds.utilized || 0;
    const fundRemaining = funds.remaining || 0;
    const fundUtilPercent =
        fundAlloc > 0 ? ((fundUtilized / fundAlloc) * 100).toFixed(1) : "0";

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
        researchOngoing,
        researchSubmitted,
        consultancyOngoing,
        consultancySubmitted
    } = React.useMemo(() => {
        const submittedIds = new Set<string>(overview.submitted_project_nos || []);
        const ongoingIds = new Set<string>(overview.ongoing_project_nos || []);
        let ro = 0, rs = 0, co = 0, cs = 0;
        (allProjectsList ?? []).forEach((p: any) => {
            const isOngoing = ongoingIds.has(p.name);
            const isSubmitted = submittedIds.has(p.name);
            if (!isOngoing && !isSubmitted) return;

            const type = (p.project_type || "").toLowerCase();
            if (type.includes("research")) {
                if (isOngoing) ro++;
                if (isSubmitted) rs++;
            }
            else if (type.includes("consult")) {
                if (isOngoing) co++;
                if (isSubmitted) cs++;
            }
        });
        return {
            researchOngoing: ro,
            researchSubmitted: rs,
            consultancyOngoing: co,
            consultancySubmitted: cs,
            researchProjects: ro + rs,
            consultancyProjects: co + cs
        };
    }, [allProjectsList, overview]);


    // Process Research vs Consultancy data
    const projectTypeData = React.useMemo(() => {
        return [
            { name: "Research", value: researchProjects, color: "#2563eb" },
            { name: "Consultancy", value: consultancyProjects, color: "#7c3aed" },
        ];
    }, [researchProjects, consultancyProjects]);

    // Process strict department-wise data for Pie Chart (only unique approved/submitted projects)
    const pieChartDeptData = React.useMemo(() => {
        const deptMap: Record<string, { dept_name: string; project_count: number }> = {};
        const submittedIds = new Set<string>(overview?.submitted_project_nos || []);
        const ongoingIds = new Set<string>(overview?.ongoing_project_nos || []);

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
    }, [allProjectsList, overview]);

    // Process strict funding data for Pie Chart (incorporating data.funding_sources and padding the difference)
    const pieChartFundingData = React.useMemo(() => {
        const backendFundingData = data?.funding_sources || [];

        // We want the total to exactly match our unique active pipeline counts.
        const submittedIds = new Set<string>(overview?.submitted_project_nos || []);
        const ongoingIds = new Set<string>(overview?.ongoing_project_nos || []);

        // Let's count how many unique valid projects exist
        let exactProjectCount = 0;
        (allProjectsList || []).forEach((proj: any) => {
            if (ongoingIds.has(proj.name) || submittedIds.has(proj.name)) {
                exactProjectCount++;
            }
        });

        // Calculate how many projects are already in backendFundingData
        let currentTotal = backendFundingData.reduce((sum: number, item: any) => sum + item.value, 0);

        let chartData = backendFundingData.map((d: any) => ({ funding_agency: d.name, value: d.value }));

        // If there's a difference, pad "Unknown"
        if (exactProjectCount > currentTotal) {
            const difference = exactProjectCount - currentTotal;
            const unknownIndex = chartData.findIndex((d: any) => d.funding_agency === "Unknown" || d.funding_agency === "Others");
            if (unknownIndex >= 0) {
                chartData[unknownIndex].value += difference;
            } else {
                chartData.push({ funding_agency: "Unknown", value: difference });
            }
        }

        const sortedData = chartData.sort((a: any, b: any) => b.value - a.value);

        // Group any excess beyond top 5 into "Others" to prevent UI overflow while maintaining exact totals
        if (sortedData.length > 6) {
            const top5 = sortedData.slice(0, 5);
            const others = sortedData.slice(5);
            const othersCount = others.reduce((sum: number, d: any) => sum + d.value, 0);

            const existingOtherIndex = top5.findIndex((d: any) => d.funding_agency === "Others" || d.funding_agency === "Other Agencies");

            if (existingOtherIndex >= 0) {
                top5[existingOtherIndex].value += othersCount;
                return top5;
            } else {
                return [...top5, { funding_agency: "Others", value: othersCount }];
            }
        }

        return sortedData;
    }, [data?.funding_sources, allProjectsList, overview]);

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
    const [expandedPI, setExpandedPI] = React.useState<string | null>(null);

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
    // Priority: select_funding_agency → origin_of_funding_agency → funding_agency_other → "Unknown"
    const getProjectAgency = React.useCallback((proj: any): string => {
        return (
            (proj.select_funding_agency || "").trim() ||
            (proj.origin_of_funding_agency || "").trim() ||
            (proj.funding_agency_other || "").trim() ||
            "Unknown"
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

    // Build a name-lookup map from roleBasedProjects: lowercase email → display name
    const emailToNameMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        roleBasedProjects.forEach((item: any) => {
            if (item.user_email && item.user_name) {
                map[(item.user_email || "").toLowerCase().trim()] = item.user_name;
            }
        });
        return map;
    }, [roleBasedProjects]);

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

        if (process.env.NODE_ENV !== "production") {
            console.group(`[FundFilter] PIs for "${piFundingFilter}"`);
            console.log("Total projects in allProjectsList:", (allProjectsList || []).length);
            console.log(`Found ${result.length} PIs with projects under "${piFundingFilter}"`);
            console.log("Sample PI results:", result.slice(0, 5));
            console.groupEnd();
        }

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

    const handleDownloadReport = () => {
        if (isLoading) return;
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
            researchStats,
            consultancyStats,
            startEndSanctionData,
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

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans text-[14px] leading-relaxed text-[#3F3F46] dark:text-[#E4E4E7]">
            <div className="px-6 md:px-8 pt-7 pb-10 max-w-[1600px] mx-auto">
                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 w-full">
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
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px] mb-6">
                            <KpiCard
                                label="Total Projects"
                                value={isLoading ? "—" : String(totalProjects)}
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
                                badges={isLoading ? undefined : totalProjectBadges}
                                onBadgeClick={(badgeLabel) =>
                                    openKpiModalWithTab("total", "All Projects", badgeLabel)
                                }
                            />
                            <KpiCard
                                label="Total Allocation"
                                description="From sanctioned & fund-approved projects"
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
                                onClick={() =>
                                    openKpiModal("allocation", "Projects by Allocation")
                                }
                                badges={isLoading ? undefined : allocBadges}
                                onBadgeClick={(badgeLabel) =>
                                    openKpiModalWithTab(
                                        "allocation",
                                        "Projects by Allocation",
                                        badgeLabel
                                    )
                                }
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
                                onClick={() => openKpiModal("ongoing", "Ongoing Projects")}
                            />
                            <KpiCard
                                label="Intl. Collaborators"
                                value={isLoading ? "—" : String(intl.active_agencies || 0)}
                                subtext="Active Global Collaborators"
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
                                        Financial Year — Project Status
                                    </div>
                                </div>
                                <div className="p-[18px] px-[22px] pb-5">
                                    <div className="h-[250px]">
                                        {isLoading || allProjectsList === undefined ? (
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
                                                        stackId="a"
                                                        fill="#2563eb"
                                                        maxBarSize={34}
                                                        isAnimationActive={false}
                                                    >
                                                        <LabelList
                                                            dataKey="submitted"
                                                            position="center"
                                                            fill="#ffffff"
                                                            fontSize={11}
                                                            fontWeight={700}
                                                            formatter={(val: any) => (val > 0 ? val : "")}
                                                        />
                                                    </Bar>
                                                    <Bar
                                                        dataKey="ongoing"
                                                        name="Ongoing"
                                                        stackId="a"
                                                        fill="#7c3aed"
                                                        maxBarSize={34}
                                                        isAnimationActive={false}
                                                    >
                                                        <LabelList
                                                            dataKey="ongoing"
                                                            position="center"
                                                            fill="#ffffff"
                                                            fontSize={11}
                                                            fontWeight={700}
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
                                    <div className="flex items-start gap-5 flex-wrap mt-4 pt-4 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                        {[
                                            [
                                                "#2563eb",
                                                `Submitted (${projectStatusCounts.submitted})`,
                                                "Registration but pending sanction",
                                            ],
                                            [
                                                "#7c3aed",
                                                `Ongoing (${projectStatusCounts.ongoing})`,
                                                "Fund sanctioned and formally approved",
                                            ],
                                        ].map(([color, label, desc]) => (
                                            <div key={label} className="flex items-start gap-2">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-sm shrink-0 mt-[2px]"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight flex items-center">
                                                        {label}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A] max-w-[120px] leading-snug mt-0.5">
                                                        {desc}
                                                    </span>
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
                                <div className="p-[18px] px-[22px] pb-5">
                                    {isLoading ? (
                                        <div className="h-[300px] flex items-center justify-center text-[#71717A] text-sm">
                                            Loading chart...
                                        </div>
                                    ) : pieChartFundingData.length > 0 ? (
                                        <div className="flex items-center gap-6 h-[300px]">
                                            <div className="relative flex items-center justify-center w-[200px] h-[200px] shrink-0">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={pieChartFundingData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={65}
                                                            outerRadius={88}
                                                            dataKey="value"
                                                            nameKey="funding_agency"
                                                            paddingAngle={3}
                                                            isAnimationActive={false}
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
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                    <span className="text-[24px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-none">
                                                        {pieChartFundingData.reduce((sum: number, d: any) => sum + d.value, 0)}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-widest mt-0.5">
                                                        Total
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {pieChartFundingData.map((item: any, i: number) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center justify-between py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="w-2.5 h-2.5 rounded-sm shrink-0"
                                                                style={{
                                                                    backgroundColor:
                                                                        CHART_COLORS[i % CHART_COLORS.length],
                                                                }}
                                                            />
                                                            <span
                                                                className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA] truncate max-w-[130px]"
                                                                title={item.funding_agency}
                                                            >
                                                                {item.funding_agency}
                                                            </span>
                                                        </div>
                                                        <span className="text-[13px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                            {item.value}
                                                        </span>
                                                    </div>
                                                ))}
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

                        {/* ── Project Analytics & Distribution ── */}
                        <SectionDivider title="Project Analytics & Distribution" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-[14px] mb-6">
                            {/* Research vs Consultancy Pie Chart */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
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
                                <div className="p-[18px] px-[22px] pb-5">
                                    <div className="h-[260px] relative">
                                        {isLoading ? (
                                            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                                                Loading chart...
                                            </div>
                                        ) : totalProjects === 0 ? (
                                            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">
                                                No data available
                                            </div>
                                        ) : (
                                            <>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                                    <span className="text-3xl font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-none">
                                                        {researchProjects + consultancyProjects}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest mt-1">
                                                        Total
                                                    </span>
                                                </div>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={projectTypeData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius="60%"
                                                            outerRadius="80%"
                                                            dataKey="value"
                                                            nameKey="name"
                                                            paddingAngle={5}
                                                            isAnimationActive={false}
                                                        >
                                                            {projectTypeData.map((entry: any, index: number) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
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
                                            </>
                                        )}
                                    </div>
                                    <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] pt-3 mt-3">
                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                            <div className="flex flex-col items-center justify-start border-r border-[#E4E4E7] dark:border-[#3F3F46]">
                                                <div className="text-[22px] font-extrabold text-[#2563eb] leading-tight">
                                                    {researchProjects}
                                                </div>
                                                <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-widest mb-2">
                                                    Research
                                                </div>
                                                <div className="flex flex-col gap-1.5 w-full px-2 lg:px-4">
                                                    <span className="inline-flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 cursor-default">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                            Ongoing (Sanctioned)
                                                        </div>
                                                        <span>{researchOngoing}</span>
                                                    </span>
                                                    <span className="inline-flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 cursor-default" title="Registration but pending sanction">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                            Submitted (Pending Sanction)
                                                        </div>
                                                        <span>{researchSubmitted}</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center justify-start">
                                                <div className="text-[22px] font-extrabold text-[#7c3aed] leading-tight">
                                                    {consultancyProjects}
                                                </div>
                                                <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-widest mb-2">
                                                    Consultancy
                                                </div>
                                                <div className="flex flex-col gap-1.5 w-full px-2 lg:px-4">
                                                    <span className="inline-flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 cursor-default">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                            Ongoing (Sanctioned)
                                                        </div>
                                                        <span>{consultancyOngoing}</span>
                                                    </span>
                                                    <span className="inline-flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 cursor-default" title="Registration but pending sanction">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                            Submitted (Pending Sanction)
                                                        </div>
                                                        <span>{consultancySubmitted}</span>
                                                    </span>
                                                </div>
                                            </div>
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

                                                const totalDeptCount = pieChartDeptData.reduce((sum, d) => sum + d.project_count, 0);

                                                return (
                                                    <div className="flex flex-col w-full h-full">
                                                        <div className="relative w-full shrink-0" style={{ height: "240px" }}>
                                                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-10 w-full">
                                                                <span className="text-3xl font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-none">
                                                                    {totalDeptCount}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest mt-1">
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
                                                                        nameKey="dept_name"
                                                                        paddingAngle={3}
                                                                        isAnimationActive={false}
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
                                                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 w-full">
                                                                {pieData.map((entry: any, index: number) => (
                                                                    <li
                                                                        key={`item-${index}`}
                                                                        className="flex items-center text-[11px] min-w-0 group cursor-default gap-1.5"
                                                                    >
                                                                        <span
                                                                            className="w-2 h-2 rounded-full shrink-0"
                                                                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                                                        />
                                                                        <span
                                                                            className="text-[#64748B] dark:text-[#A1A1AA] font-semibold truncate flex-1 group-hover:text-[#3F3F46] dark:group-hover:text-[#E4E4E7] transition-colors"
                                                                            title={entry.dept_name}
                                                                        >
                                                                            {getDeptName(entry.dept_name)}
                                                                        </span>
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
                                                    margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                                                    barCategoryGap="30%"
                                                    barGap={3}
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
                                                    />
                                                    <Bar
                                                        dataKey="endAmount"
                                                        name="Project End"
                                                        fill="#d97706"
                                                        radius={[6, 6, 0, 0]}
                                                        maxBarSize={36}
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
                                                <span className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A] max-w-[120px] leading-snug mt-0.5">
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
                                                <span className="text-[10px] font-medium text-[#A1A1AA] dark:text-[#71717A] max-w-[120px] leading-snug mt-0.5">
                                                    Budget of projects closing this year
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Financial Intelligence ── */}
                        <SectionDivider title="Financial" />
                        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-[14px] mb-6">
                            {/* All Projects Table */}
                            {(() => {
                                // Director-only restrict filter
                                const directorAllowedFilters = new Set(["all", "ongoing", "submitted"]);

                                const STATUS_FILTER_OPTIONS = [
                                    { value: "all", label: "All Projects" },
                                    { value: "ongoing", label: "Ongoing (Sanctioned)" },
                                    { value: "submitted", label: "Submitted (Pending Sanction)" },
                                    { value: "draft", label: "Draft" },
                                    { value: "pending", label: "Pending" },
                                    { value: "completed", label: "Completed" },
                                    { value: "cancelled", label: "Cancelled" },
                                ];

                                const _ongoingIds = new Set<string>(overview?.ongoing_project_nos || []);
                                const _submittedIds = new Set<string>(overview?.submitted_project_nos || []);

                                let allProjs: any[] = (allProjectsList || []).map((p: any) => {
                                    // Classify using the same ID sets used by all other charts
                                    let computedStatus: string;
                                    if (_ongoingIds.has(p.name)) computedStatus = "ongoing";
                                    else if (_submittedIds.has(p.name)) computedStatus = "submitted";
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
                                }).sort((a: any, b: any) => (b.total_budget_amount - a.total_budget_amount));

                                // Restrict the base array for 'Director' role to ONLY ongoing & submitted globally
                                if (isDirectorOnly) {
                                    allProjs = allProjs.filter((p: any) => ["ongoing", "submitted"].includes(p._status));
                                }

                                const filtered = allProjs.filter((p: any) => {
                                    if (projectTableFilter === "all") return true;
                                    return p._status === projectTableFilter;
                                });

                                const totalPages = Math.max(1, Math.ceil(filtered.length / PROJECT_TABLE_PAGE_SIZE));
                                const safePage = Math.min(projectTablePage, totalPages);
                                const pageSlice = filtered.slice((safePage - 1) * PROJECT_TABLE_PAGE_SIZE, safePage * PROJECT_TABLE_PAGE_SIZE);

                                return (
                                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
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
                                                <span className="ml-1 text-[11px] font-bold text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2 py-0.5 rounded-full">
                                                    {filtered.length}
                                                </span>
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

                                        {/* Table */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                                                        {["#", "Project", "PI / Lead", "Department", "Status", "Amount"].map((h) => (
                                                            <th key={h} className="p-2.5 px-3.5 text-[10px] font-bold text-[#71717A] uppercase tracking-widest text-left whitespace-nowrap">
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
                                                                    className="border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors"
                                                                >
                                                                    <td className="p-3 px-3.5 align-middle text-[11px] font-extrabold text-[#A1A1AA] font-mono">
                                                                        {String(globalIdx + 1).padStart(2, "0")}
                                                                    </td>
                                                                    <td className="p-3 px-3.5 align-middle max-w-[300px]">
                                                                        <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-2">
                                                                            {proj.project_title || "Untitled"}
                                                                        </div>
                                                                        <span className="font-mono text-[9px] text-[#71717A] bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] px-1.5 py-0.5 rounded inline-block mt-1">
                                                                            {proj.name}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3 px-3.5 align-middle text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA] whitespace-nowrap">
                                                                        {proj.pi_webmail ? proj.pi_webmail.split("@")[0] : "—"}
                                                                    </td>
                                                                    <td className="p-3 px-3.5 align-middle">
                                                                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                                                            {proj.department ? getDeptName(proj.department) : "—"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3 px-3.5 align-middle">
                                                                        <StatusBadge status={proj._status} />
                                                                    </td>
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

                                        {/* Pagination Footer */}
                                        {filtered.length > PROJECT_TABLE_PAGE_SIZE && (
                                            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                                                <span className="text-[11px] text-[#71717A] font-semibold">
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
                                                                    : "border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46]"
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

                            {/* Financial Breakdown Panel */}
                            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden">
                                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
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
                                                label: "Proposed Budget (Review)",
                                                value: formatCurrency(
                                                    proposals.proposed_budget_total || 0
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
                                    <div className="flex items-center justify-between py-2.5" />
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
                                                            {proj.department
                                                                ? getDeptName(proj.department)
                                                                : "—"}{" "}
                                                            · {proj.pi_name}
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={`text-[11px] font-bold whitespace-nowrap ${isNew ? "text-[#2563eb]" : "text-[#71717A]"
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
                                                <div key={i}>
                                                    <div className="flex items-center justify-between py-[9px] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                                        <div>
                                                            <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                                {agency.funding_agency}
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
                                                                className="text-[10px] font-semibold text-[#2563eb] hover:underline"
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
                                                    onClick={() => setExpandedPI(pi.user_email)}
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
                    <div className="relative bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-2xl w-full max-w-[780px] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
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

                        <div className="p-5 bg-slate-50/50 dark:bg-slate-900/20 overflow-y-auto max-h-[75vh]">
                            {(() => {
                                const totalSanctioned = selectedPIProjects.reduce((sum: number, proj: any) => {
                                    return sum + (proj.total_budget_amount || proj.grand_total_proposal || 0);
                                }, 0);

                                const formattedTotalSanctioned = totalSanctioned >= 10000000
                                    ? `₹${(totalSanctioned / 10000000).toFixed(2)} Cr`
                                    : totalSanctioned >= 100000
                                        ? `₹${(totalSanctioned / 100000).toFixed(2)} L`
                                        : `₹${totalSanctioned.toLocaleString("en-IN")}`;

                                return (
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center flex flex-col justify-center">
                                            <div className="text-[18px] sm:text-[20px] font-extrabold text-[#2563eb] leading-tight">
                                                {selectedPIDetails.project_count}
                                            </div>
                                            <div className="text-[9px] sm:text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">
                                                Projects
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center flex flex-col justify-center">
                                            <div className="text-[18px] sm:text-[20px] font-extrabold text-[#7c3aed] leading-tight">
                                                {selectedPIDetails.departments?.length || 0}
                                            </div>
                                            <div className="text-[9px] sm:text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">
                                                Depts
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-3 rounded-xl shadow-sm text-center flex flex-col justify-center">
                                            <div className="text-[18px] sm:text-[20px] font-extrabold text-[#059669] leading-tight">
                                                {totalSanctioned > 0 ? formattedTotalSanctioned : "—"}
                                            </div>
                                            <div className="text-[9px] sm:text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mt-1">
                                                Sanctioned
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

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
                                    const piProjectTotalPages = Math.ceil(
                                        selectedPIProjects.length / PI_PROJECTS_PAGE_SIZE
                                    );
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
                                                <span className="ml-auto text-[10px] font-semibold text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2 py-0.5 rounded-full normal-case tracking-normal">
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
                                                                        <div className="text-[10px] font-mono text-[#A1A1AA] mt-0.5">
                                                                            {proj.project_no}
                                                                        </div>
                                                                    )}
                                                                    {(() => {
                                                                        const fund = proj.total_budget_amount || proj.grand_total_proposal || 0;
                                                                        if (!fund) return null;
                                                                        const formattedFund = fund >= 10000000
                                                                            ? `₹${(fund / 10000000).toFixed(2)} Cr`
                                                                            : fund >= 100000
                                                                                ? `₹${(fund / 100000).toFixed(2)} L`
                                                                                : `₹${fund.toLocaleString("en-IN")}`;
                                                                        return (
                                                                            <div className="text-[10px] font-extrabold mt-1 text-[#3F3F46] dark:text-[#E4E4E7]">
                                                                                {formattedFund}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                                <span
                                                                    className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${isCompleted
                                                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                                                        : isActive
                                                                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                                                                            : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                                                                        }`}
                                                                >
                                                                    {isCompleted
                                                                        ? "Completed"
                                                                        : isActive
                                                                            ? "● Active"
                                                                            : "Upcoming"}
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5 text-center">
                                                                    <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">
                                                                        Start
                                                                    </div>
                                                                    <div className="text-[11px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                                                        {formatDate(startDate)}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5 text-center">
                                                                    <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">
                                                                        End
                                                                    </div>
                                                                    <div className="text-[11px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                                                        {formatDate(endDate)}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-2.5 text-center">
                                                                    <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">
                                                                        Duration
                                                                    </div>
                                                                    <div className="text-[13px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                                                        {totalMonths !== null
                                                                            ? `${totalMonths}mo`
                                                                            : "—"}
                                                                    </div>
                                                                    <div className="text-[9px] font-semibold text-[#A1A1AA] mt-0.5">
                                                                        {yearRange}
                                                                    </div>
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
                                                                                            className="text-[10px] font-bold"
                                                                                            style={{ color: progressColor }}
                                                                                        >
                                                                                            {progressPct}% complete
                                                                                        </span>
                                                                                        <span className="text-[10px] font-semibold text-[#A1A1AA]">
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
                                            {piProjectTotalPages > 1 && (
                                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
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
                                        </div>
                                    );
                                })()}
                        </div>
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
                        className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl border border-[#E4E4E7] dark:border-[#3F3F46] w-full max-w-4xl max-h-[85vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46] shrink-0">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] mb-0.5">
                                    Projects
                                </p>
                                <h2 className="text-[16px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">
                                    {kpiModal.title}
                                </h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-semibold text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2.5 py-1 rounded-full">
                                    {kpiModalRows.length} record
                                    {kpiModalRows.length !== 1 ? "s" : ""}
                                </span>
                                <button
                                    onClick={closeKpiModal}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {kpiModal.type === "total" && (
                            <div className="flex items-center gap-1 px-6 pt-3 pb-0 shrink-0 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                {(
                                    [
                                        {
                                            key: "ongoing",
                                            label: "Ongoing",
                                            count: projectStatusCounts.ongoing,
                                            activeClass:
                                                "border-emerald-500 text-emerald-700 dark:text-emerald-400",
                                        },
                                        {
                                            key: "submitted",
                                            label: "Submitted",
                                            count: projectStatusCounts.submitted,
                                            activeClass:
                                                "border-amber-500 text-amber-700 dark:text-amber-400",
                                        },
                                    ] as const
                                ).map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => {
                                            setKpiTab(tab.key);
                                            setKpiPage(1);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-[11px] font-bold border-b-2 transition-colors ${kpiTab === tab.key
                                            ? tab.activeClass + " border-current"
                                            : "border-transparent text-[#71717A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]"
                                            }`}
                                    >
                                        {tab.label}
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F4F4F5] dark:bg-[#3F3F46] text-[#71717A]">
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {kpiModal.type === "allocation" && (
                            <div className="flex items-center gap-1 px-6 pt-3 pb-0 shrink-0 border-b border-[#E4E4E7] dark:border-[#3F3F46] overflow-x-auto">
                                {(
                                    [
                                        {
                                            key: "ongoing",
                                            label: "Ongoing",
                                            count: overview.ongoing_projects || 0,
                                            activeColor: "text-emerald-600 border-emerald-500",
                                        },
                                        {
                                            key: "submitted",
                                            label: "Submitted",
                                            count: overview.submitted_projects || 0,
                                            activeColor: "text-amber-600 border-amber-400",
                                        },
                                    ] as const
                                ).map((tab) => {
                                    const isActive = kpiAllocTab === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => {
                                                setKpiAllocTab(tab.key);
                                                setKpiPage(1);
                                            }}
                                            className={`flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-[11px] font-bold border-b-2 whitespace-nowrap transition-colors ${isActive
                                                ? tab.activeColor
                                                : "border-transparent text-[#71717A] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]"
                                                }`}
                                        >
                                            {tab.label}
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F4F4F5] dark:bg-[#3F3F46] text-[#71717A]">
                                                {tab.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="overflow-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#FAFAF9] dark:bg-[#18181B] sticky top-0">
                                        {["#", "Project", "PI", "Dept", "Status", "Budget"].map(
                                            (h) => (
                                                <th
                                                    key={h}
                                                    className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#71717A]${h === "Budget" ? " text-right" : ""
                                                        }`}
                                                >
                                                    {h}
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
                                                {allProjectsList === undefined
                                                    ? "Loading…"
                                                    : "No projects found."}
                                            </td>
                                        </tr>
                                    ) : (
                                        kpiPagedRows.map((proj: any, idx: number) => (
                                            <tr
                                                key={proj.name || idx}
                                                className="border-t border-[#F4F4F5] dark:border-[#3F3F46] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors"
                                            >
                                                <td className="px-4 py-3 text-[10px] font-bold text-[#71717A] font-mono">
                                                    {(kpiPage - 1) * KPI_PAGE_SIZE + idx + 1}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-1">
                                                        {proj.project_title || proj.name || "—"}
                                                    </div>
                                                    {proj.project_no && (
                                                        <span className="font-mono text-[9px] text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                                            {proj.project_no}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                                    {proj.pi_webmail || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                                    {getDeptName(proj.implementation_department)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={proj.workflow_state} />
                                                </td>
                                                <td className="px-4 py-3 text-right text-[12px] font-extrabold text-[#059669] whitespace-nowrap">
                                                    {proj.total_budget_amount || proj.grand_total_proposal
                                                        ? formatCurrency(
                                                            proj.total_budget_amount ||
                                                            proj.grand_total_proposal
                                                        )
                                                        : "—"}
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
        </div>
    );
}