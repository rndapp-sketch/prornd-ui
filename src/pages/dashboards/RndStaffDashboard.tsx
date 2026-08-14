import { useMemo, useEffect, useState } from "react";
import type { ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc, useFrappeGetCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
  FolderKanban, ClipboardList, Layers, Activity,
  AlertCircle, Zap, BarChart3, ChevronRight, Search,
  Bell, Filter, X, ArrowRight, FileText, Banknote,
  Receipt, Clock, TrendingUp, CheckCircle2, Eye,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskRecord { name: string; title: string; status: string; creation: string; modified: string; owner: string; }
interface TaskGroup { doctype: string; records: TaskRecord[]; mod_vis?: number; }
interface PendingTaskResponse { message: { page: string; status_value: string; results: TaskGroup[] }; }
interface TaskRegistryResponse { message: { results: TaskGroup[]; pagination: unknown; filters: unknown }; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getAgeDays = (d: string) => (Date.now() - new Date(d).getTime()) / 86400000;

const getPriority = (d: string) => {
  const age = getAgeDays(d);
  if (age > 3) return { label: "High",   dot: "bg-red-500",     badge: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400" };
  if (age > 1) return { label: "Medium", dot: "bg-amber-400",   badge: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400" };
  return             { label: "Normal",  dot: "bg-emerald-400", badge: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" };
};

const getStatusStyle = (s: string) => {
  const l = s?.toLowerCase() || "";
  if (["pending", "under review", "approval pending"].some(t => l.includes(t)))
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40";
  if (l.includes("approved"))
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40";
  if (l.includes("draft"))
    return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/40";
  if (l.includes("rejected"))
    return "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800/40";
  if (l.includes("forwarded") || l.includes("processed"))
    return "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200 dark:border-violet-800/40";
  return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40";
};

const getTaskRoute = (doctype: string, id: string) => {
  if (doctype === "Fund Received")         return `/fund-received/${id}`;
  if (doctype === "Reimbursement")         return `/reimbursement/${id}`;
  if (doctype === "Advance Settlement")    return `/advance-settlement/${id}`;
  if (doctype === "Temporary Advance")     return `/pending-tasks/${encodeURIComponent(doctype)}/${id}`;
  if (doctype === "Project Staff Details") return `/project-staff-joining?docname=${encodeURIComponent(id)}`;
  if (doctype === "Miscellaneous Commit") return `/miscellaneous-commit/${id}`;
  if (doctype === "Loan Request") return `/loan-request/${id}`;
  return `/pending-tasks/${doctype}/${id}`;
};

const fmtTime = (dateStr: string) => {
  const m = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-[#E4E4E7] dark:border-[#3F3F46] border-t-[#71717A] rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: ElementType; message: string }) {
  return (
    <div className="py-14 flex flex-col items-center text-[#A1A1AA] dark:text-[#71717A]">
      <Icon className="h-9 w-9 mb-3 opacity-25" />
      <p className="text-[13px] font-medium">{message}</p>
    </div>
  );
}

function KpiCard({ title, value, subtitle, icon: Icon, accentColor, bgClass, textClass, onClick }: {
  title: string; value: string; subtitle: string; icon: ElementType;
  accentColor: string; bgClass: string; textClass: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl px-4 py-3 relative overflow-hidden transition-all duration-150 flex items-center gap-3",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md select-none"
      )}
    >
      <div
        className="absolute bottom-0 right-0 w-14 h-14 rounded-full translate-x-3 translate-y-3 pointer-events-none"
        style={{ backgroundColor: accentColor, opacity: 0.07 }}
      />
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", bgClass)}>
        <Icon className={cn("h-3.5 w-3.5", textClass)} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider mb-0.5 truncate">{title}</div>
        <div className={cn("text-[20px] font-extrabold tracking-tight leading-none mb-0.5", textClass)}>{value}</div>
        <div className="text-[10px] text-[#A1A1AA] dark:text-[#71717A] font-medium truncate">{subtitle}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RndStaffDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", { fields: ["full_name"], enabled: !!currentUser });

  const { data: pendingData, isLoading: pendingLoading } = useFrappeGetCall<PendingTaskResponse>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_task", { page_name: "pending-task" }
  );
  const { data: registryData, isLoading: registryLoading } = useFrappeGetCall<TaskRegistryResponse>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_task_registry", { page_name: "task-registry" }
  );

  const [liveTime, setLiveTime] = useState(new Date());
  const [search, setSearch]           = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showFilters, setShowFilters]   = useState(false);

  useEffect(() => {
    const id = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fullName = (userData?.full_name || currentUser || "Guest") as string;
  const initials = fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const greeting = liveTime.getHours() < 12 ? "Good morning" : liveTime.getHours() < 17 ? "Good afternoon" : "Good evening";
  const isLoading = pendingLoading || registryLoading;

  const pendingTasks = useMemo(() => {
    if (!pendingData?.message?.results) return [];
    const tasks: (TaskRecord & { doctype: string })[] = [];
    pendingData.message.results.forEach(g => {
      if (g.mod_vis || g.doctype === "Advance Settlement")
        g.records.forEach(r => tasks.push({ ...r, doctype: g.doctype }));
    });
    return tasks.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  }, [pendingData]);

  const registryTasks = useMemo(() => {
    if (!registryData?.message?.results) return [];
    const tasks: (TaskRecord & { doctype: string })[] = [];
    registryData.message.results.forEach(g => {
      if (Array.isArray(g.records)) g.records.forEach(r => tasks.push({ ...r, doctype: g.doctype }));
    });
    return tasks.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  }, [registryData]);

  const totalPending   = pendingTasks.length;
  const totalProcessed = registryTasks.length;
  const staleCount     = useMemo(() => pendingTasks.filter(t => getAgeDays(t.modified) > 3).length, [pendingTasks]);
  const freshCount     = useMemo(() => pendingTasks.filter(t => getAgeDays(t.modified) < 1).length, [pendingTasks]);
  const agingCount     = useMemo(() => pendingTasks.filter(t => { const a = getAgeDays(t.modified); return a >= 1 && a <= 3; }).length, [pendingTasks]);
  const todayCount     = useMemo(() => {
    const d = new Date().toDateString();
    return [...pendingTasks, ...registryTasks].filter(t => new Date(t.modified).toDateString() === d).length;
  }, [pendingTasks, registryTasks]);
  const activeModules  = useMemo(() => {
    const s = new Set<string>(); [...pendingTasks, ...registryTasks].forEach(t => s.add(t.doctype)); return s.size;
  }, [pendingTasks, registryTasks]);
  const avgAge = useMemo(() =>
    pendingTasks.length ? pendingTasks.reduce((s, t) => s + getAgeDays(t.modified), 0) / pendingTasks.length : 0,
    [pendingTasks]
  );

  const moduleBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    pendingTasks.forEach(t => { counts[t.doctype] = (counts[t.doctype] || 0) + 1; });
    return Object.entries(counts).map(([doctype, count]) => ({ doctype, count })).sort((a, b) => b.count - a.count);
  }, [pendingTasks]);
  const maxCount = Math.max(...moduleBreakdown.map(m => m.count), 1);

  const allModules  = useMemo(() => [...new Set(pendingTasks.map(t => t.doctype))], [pendingTasks]);
  const allStatuses = useMemo(() => [...new Set(pendingTasks.map(t => t.status))], [pendingTasks]);

  const filteredTasks = useMemo(() => pendingTasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.doctype.toLowerCase().includes(search.toLowerCase())) return false;
    if (moduleFilter && t.doctype !== moduleFilter) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && getPriority(t.modified).label !== priorityFilter) return false;
    return true;
  }), [pendingTasks, search, moduleFilter, statusFilter, priorityFilter]);

  const activeFilterCount = [search, moduleFilter, statusFilter, priorityFilter].filter(Boolean).length;
  const clearFilters = () => { setSearch(""); setModuleFilter(""); setStatusFilter(""); setPriorityFilter(""); };

  const quickActions = [
    { label: "Pending Tasks",  icon: ClipboardList, route: "/pending-task",   color: "#D97757" },
    { label: "Task Registry",  icon: FolderKanban,  route: "/task-registry",  color: "#4A6CF7" },
    { label: "Fund Received",  icon: Banknote,      route: "/fund-received",  color: "#10B981" },
    { label: "Reimbursements", icon: Receipt,       route: "/reimbursement",  color: "#8B5CF6" },
  ];

  return (
    <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans text-[14px] text-[#3F3F46] dark:text-[#E4E4E7]">
      <div className="px-4 md:px-6 xl:px-8 pt-6 pb-12">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between gap-4 mb-7">
          {/* Left: logo + title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-[#D97757] rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <ClipboardList size={17} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-[#27272A] dark:text-[#F4F4F5] leading-none">
                R&D Operations
              </h1>
              <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5 truncate">
                {greeting}, <span className="font-semibold text-[#3F3F46] dark:text-[#D4D4D8]">{fullName.split(" ")[0]}</span>
                <span className="hidden sm:inline"> · {liveTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
              </p>
            </div>
          </div>

          {/* Right: search + controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden md:flex items-center gap-2 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl px-3 py-2 w-48 focus-within:border-[#D97757] dark:focus-within:border-[#D97757] transition-colors">
              <Search className="h-3.5 w-3.5 text-[#A1A1AA] dark:text-[#71717A] flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="bg-transparent text-[12px] text-[#3F3F46] dark:text-[#E4E4E7] placeholder-[#A1A1AA] dark:placeholder-[#71717A] outline-none w-full"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="h-3 w-3 text-[#A1A1AA] hover:text-[#71717A]" />
                </button>
              )}
            </div>

            {/* Notifications */}
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:border-[#D97757] transition-colors">
              <Bell className="h-4 w-4" />
              {staleCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center">
                  {staleCount > 9 ? "9+" : staleCount}
                </span>
              )}
            </button>

            {/* Live clock */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-[#71717A] dark:text-[#A1A1AA] font-mono bg-white dark:bg-[#27272A] px-3 py-2 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              {liveTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl bg-[#D97757] flex items-center justify-center text-white text-[11px] font-extrabold flex-shrink-0">
              {initials}
            </div>
          </div>
        </div>

        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-7">
          <KpiCard
            title="Pending Tasks"
            value={isLoading ? "—" : String(totalPending)}
            subtitle={isLoading ? "Loading…" : `${freshCount} fresh today`}
            icon={AlertCircle}
            accentColor="#D97757"
            bgClass="bg-orange-50 dark:bg-orange-950/20"
            textClass="text-[#D97757]"
            onClick={() => navigate("/pending-task")}
          />
          <KpiCard
            title="Processed"
            value={isLoading ? "—" : String(totalProcessed)}
            subtitle="Total handled"
            icon={CheckCircle2}
            accentColor="#4A6CF7"
            bgClass="bg-blue-50 dark:bg-blue-950/20"
            textClass="text-[#4A6CF7]"
            onClick={() => navigate("/task-registry")}
          />
          <KpiCard
            title="Active Modules"
            value={isLoading ? "—" : String(activeModules)}
            subtitle={`${moduleBreakdown.length} with pending`}
            icon={Layers}
            accentColor="#8B5CF6"
            bgClass="bg-violet-50 dark:bg-violet-950/20"
            textClass="text-[#8B5CF6]"
          />
          <KpiCard
            title="Today's Activity"
            value={isLoading ? "—" : String(todayCount)}
            subtitle="Modified today"
            icon={Activity}
            accentColor="#10B981"
            bgClass="bg-emerald-50 dark:bg-emerald-950/20"
            textClass="text-emerald-600 dark:text-emerald-400"
          />
          <KpiCard
            title="Overdue Tasks"
            value={isLoading ? "—" : String(staleCount)}
            subtitle="Older than 3 days"
            icon={Clock}
            accentColor={staleCount > 0 ? "#EF4444" : "#10B981"}
            bgClass={staleCount > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-emerald-50 dark:bg-emerald-950/20"}
            textClass={staleCount > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
          />
        </div>

        {/* ─── Content Grid ─── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_268px] gap-5">

          {/* Left: Pending Tasks + Recent Activity */}
          <div className="space-y-5 min-w-0">

            {/* My Pending Tasks */}
            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">

              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="w-6 h-6 bg-orange-50 dark:bg-orange-950/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="h-3.5 w-3.5 text-[#D97757]" />
                  </div>
                  <span className="text-[13px] font-bold text-[#27272A] dark:text-[#F4F4F5]">My Pending Tasks</span>
                  {!isLoading && totalPending > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-[#D97757]/10 text-[#D97757] text-[10px] font-extrabold">{totalPending}</span>
                  )}
                  {!isLoading && staleCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 text-[10px] font-bold border border-red-100 dark:border-red-900/50">
                      {staleCount} overdue
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowFilters(v => !v)}
                    className={cn(
                      "flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors",
                      showFilters
                        ? "bg-[#D97757]/10 border-[#D97757]/30 text-[#D97757]"
                        : "bg-[#F4F4F5] dark:bg-[#3F3F46] border-transparent text-[#71717A] dark:text-[#A1A1AA] hover:border-[#E4E4E7] dark:hover:border-[#52525B]"
                    )}
                  >
                    <Filter className="h-3 w-3" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-[#D97757] text-white text-[9px] font-extrabold flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => navigate("/pending-task")}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#4A6CF7] hover:text-[#3b5cf6] transition-colors"
                  >
                    View all <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Filters panel */}
              {showFilters && (
                <div className="px-5 py-3 border-b border-[#F4F4F5] dark:border-[#3F3F46]/60 bg-[#FAFAF9] dark:bg-[#1C1C1F] flex flex-wrap gap-2 items-center">
                  {/* Mobile search */}
                  <div className="flex md:hidden items-center gap-2 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-3 py-1.5 flex-1 min-w-[140px]">
                    <Search className="h-3 w-3 text-[#A1A1AA] flex-shrink-0" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search…"
                      className="bg-transparent text-[12px] outline-none w-full text-[#3F3F46] dark:text-[#E4E4E7] placeholder-[#A1A1AA]"
                    />
                  </div>

                  <select
                    value={moduleFilter}
                    onChange={e => setModuleFilter(e.target.value)}
                    className="text-[11px] font-semibold bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2.5 py-1.5 text-[#3F3F46] dark:text-[#E4E4E7] outline-none cursor-pointer"
                  >
                    <option value="">All Modules</option>
                    {allModules.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="text-[11px] font-semibold bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2.5 py-1.5 text-[#3F3F46] dark:text-[#E4E4E7] outline-none cursor-pointer"
                  >
                    <option value="">All Statuses</option>
                    {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={e => setPriorityFilter(e.target.value)}
                    className="text-[11px] font-semibold bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2.5 py-1.5 text-[#3F3F46] dark:text-[#E4E4E7] outline-none cursor-pointer"
                  >
                    <option value="">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Normal">Normal</option>
                  </select>

                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
              )}

              {/* Task rows */}
              {isLoading ? <Spinner /> : filteredTasks.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  message={activeFilterCount > 0 ? "No tasks match your filters" : "All clear — no pending tasks"}
                />
              ) : (
                <>
                  <div className="divide-y divide-[#F4F4F5] dark:divide-[#3F3F46]/50">
                    {filteredTasks.slice(0, 6).map(task => {
                      const priority = getPriority(task.modified);
                      return (
                        <div
                          key={task.name}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAFAF9] dark:hover:bg-[#3F3F46]/20 transition-colors"
                        >
                          {/* Priority dot */}
                          <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-0.5", priority.dot)} />

                          {/* Info block */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[13px] font-semibold text-[#27272A] dark:text-[#F4F4F5] truncate">{task.title}</span>
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0", priority.badge)}>
                                {priority.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA] dark:text-[#71717A] flex-wrap">
                              <span className="font-medium px-1.5 py-0.5 bg-[#F4F4F5] dark:bg-[#3F3F46] rounded text-[10px]">
                                {task.doctype}
                              </span>
                              <span>·</span>
                              <span>{task.owner}</span>
                              <span>·</span>
                              <span className="font-mono">{fmtTime(task.modified)}</span>
                            </div>
                          </div>

                          {/* Status badge */}
                          <span className={cn("hidden sm:inline-flex px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 whitespace-nowrap", getStatusStyle(task.status))}>
                            {task.status}
                          </span>

                          {/* CTA */}
                          <button
                            onClick={() => navigate(getTaskRoute(task.doctype, task.name))}
                            className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 bg-[#D97757]/10 text-[#D97757] hover:bg-[#D97757] hover:text-white rounded-lg transition-all flex-shrink-0"
                          >
                            Review <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {filteredTasks.length > 6 && (
                    <div className="px-5 py-2.5 border-t border-[#F4F4F5] dark:border-[#3F3F46]/60 bg-[#FAFAF9]/70 dark:bg-[#27272A]/70">
                      <button onClick={() => navigate("/pending-task")} className="text-[11px] font-bold text-[#4A6CF7] hover:text-[#3b5cf6] transition-colors">
                        + {filteredTasks.length - 6} more tasks →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg flex items-center justify-center">
                    <FolderKanban className="h-3.5 w-3.5 text-[#4A6CF7]" />
                  </div>
                  <span className="text-[13px] font-bold text-[#27272A] dark:text-[#F4F4F5]">Recent Activity</span>
                  {!isLoading && totalProcessed > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-[#4A6CF7]/10 text-[#4A6CF7] text-[10px] font-extrabold">{totalProcessed}</span>
                  )}
                </div>
                <button onClick={() => navigate("/task-registry")} className="flex items-center gap-1 text-[11px] font-bold text-[#4A6CF7] hover:text-[#3b5cf6] transition-colors">
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              {isLoading ? <Spinner /> : registryTasks.length === 0 ? (
                <EmptyState icon={FolderKanban} message="No processed documents yet" />
              ) : (
                <div className="divide-y divide-[#F4F4F5] dark:divide-[#3F3F46]/50">
                  {registryTasks.slice(0, 6).map(task => (
                    <button
                      key={task.name}
                      onClick={() => {
                        if (task.doctype === "Fund Received") navigate(`/fund-received/${task.name}`);
                        else if (task.doctype === "Reimbursement") navigate(`/reimbursement/${task.name}`);
                        else navigate(`/task-registry/${task.doctype}/${task.name}`);
                      }}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAF9] dark:hover:bg-[#3F3F46]/20 transition-colors group text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#F4F4F5] dark:bg-[#3F3F46] flex items-center justify-center flex-shrink-0">
                        <FileText className="h-3.5 w-3.5 text-[#A1A1AA] dark:text-[#71717A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#27272A] dark:text-[#F4F4F5] truncate">{task.title}</p>
                        <p className="text-[11px] text-[#A1A1AA] dark:text-[#71717A] truncate mt-0.5">{task.doctype} · {task.owner}</p>
                      </div>
                      <span className={cn("hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 whitespace-nowrap", getStatusStyle(task.status))}>
                        {task.status}
                      </span>
                      <span className="text-[11px] text-[#A1A1AA] dark:text-[#71717A] flex-shrink-0 font-mono">{fmtTime(task.modified)}</span>
                      <Eye className="h-3.5 w-3.5 text-[#D4D4D8] group-hover:text-[#4A6CF7] flex-shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Right Sidebar ─── */}
          <div className="space-y-4">

            {/* Quick Actions */}
            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                <div className="w-6 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-[#71717A] dark:text-[#A1A1AA]" />
                </div>
                <span className="text-[13px] font-bold text-[#27272A] dark:text-[#F4F4F5]">Quick Actions</span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {quickActions.map(({ label, icon: Icon, route, color }) => (
                  <button
                    key={label}
                    onClick={() => navigate(route)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] hover:border-transparent hover:shadow-md transition-all group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] group-hover:text-[#3F3F46] dark:group-hover:text-[#E4E4E7] text-center leading-tight transition-colors">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pending by Module */}
            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                <div className="w-6 h-6 bg-violet-50 dark:bg-violet-950/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-[#8B5CF6]" />
                </div>
                <span className="text-[13px] font-bold text-[#27272A] dark:text-[#F4F4F5]">Pending by Module</span>
              </div>
              <div className="p-5">
                {isLoading ? <Spinner /> : moduleBreakdown.length === 0 ? (
                  <EmptyState icon={BarChart3} message="Nothing pending" />
                ) : (
                  <>
                    <div className="space-y-4">
                      {moduleBreakdown.map(({ doctype, count }) => (
                        <div key={doctype}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate mr-2">{doctype}</span>
                            <span className="text-[11px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tabular-nums flex-shrink-0">{count}</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#F4F4F5] dark:bg-[#3F3F46] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: "#8B5CF6" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-[#F4F4F5] dark:border-[#3F3F46] grid grid-cols-2 gap-2">
                      <div className="bg-[#FAFAF9] dark:bg-[#1C1C1F] rounded-xl p-3">
                        <p className="text-[9px] text-[#A1A1AA] font-bold uppercase tracking-widest mb-1">Avg Age</p>
                        <p className={cn("text-[14px] font-extrabold", avgAge > 3 ? "text-red-500" : avgAge > 1 ? "text-amber-500" : "text-emerald-500")}>
                          {avgAge > 0 ? `${avgAge.toFixed(1)}d` : "—"}
                        </p>
                      </div>
                      <div className="bg-[#FAFAF9] dark:bg-[#1C1C1F] rounded-xl p-3">
                        <p className="text-[9px] text-[#A1A1AA] font-bold uppercase tracking-widest mb-1">Oldest</p>
                        <p className="text-[13px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                          {pendingTasks.length > 0 ? fmtTime(pendingTasks[pendingTasks.length - 1].modified) : "—"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Workload Summary */}
            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-[#71717A] dark:text-[#A1A1AA]" />
                <span className="text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest">Workload Summary</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Fresh (<1d)",    value: freshCount,  dot: "bg-emerald-400" },
                  { label: "Aging (1–3d)",   value: agingCount,  dot: "bg-amber-400" },
                  { label: "Overdue (>3d)",  value: staleCount,  dot: "bg-red-500" },
                ].map(({ label, value, dot }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />
                      <span className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">{label}</span>
                    </div>
                    <span className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] tabular-nums">
                      {isLoading ? "—" : value}
                    </span>
                  </div>
                ))}
                {!isLoading && totalPending > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#F4F4F5] dark:border-[#3F3F46]">
                    <div className="flex h-2 w-full rounded-full overflow-hidden gap-0.5">
                      {freshCount > 0 && (
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(freshCount / totalPending) * 100}%` }} />
                      )}
                      {agingCount > 0 && (
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(agingCount / totalPending) * 100}%` }} />
                      )}
                      {staleCount > 0 && (
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${(staleCount / totalPending) * 100}%` }} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
