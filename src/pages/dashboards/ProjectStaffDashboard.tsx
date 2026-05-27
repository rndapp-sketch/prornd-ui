import React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc, useFrappeGetCall } from "frappe-react-sdk";
// import { AppSidebar } from "../../components/RndSidebar";
import { AnalyticsCard, CurrentTime } from "../../components/DashboardCards";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck, Briefcase, BarChart, Layers,
  AlertCircle, Zap, Activity, Clock,
  ArrowRight, ChevronRight, Mail
} from "lucide-react";

// --- Interfaces ---
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
  mod_vis?: number;
}

interface PendingTaskResponse {
  message: {
    page: string;
    status_value: string;
    results: TaskGroup[];
  };
}

interface TaskRegistryResponse {
  message: {
    results: TaskGroup[];
    pagination: any;
    filters: any;
  };
}

// --- Helpers ---
const getStatusStyle = (status: string) => {
  const s = status?.toLowerCase() || "";
  if (["pending", "under review", "approval pending"].some(t => s.includes(t)))
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
  if (s.includes("approved"))
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
  if (s.includes("draft"))
    return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  if (s.includes("rejected"))
    return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400";
  if (s.includes("forwarded") || s.includes("processed"))
    return "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400";
  return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
};

const getTaskRoute = (doctype: string, id: string) => {
  if (doctype === "Fund Received") return `/fund-received/${id}`;
  if (doctype === "Reimbursement") return `/reimbursement/${id}`;
  if (doctype === "Advance Settlement") return `/advance-settlement/${id}`;
  if (doctype === "Temporary Advance") return `/pending-tasks/${encodeURIComponent(doctype)}/${id}`;
  if (doctype === "Project Staff Details") return `/project-staff-joining?docname=${encodeURIComponent(id)}`;
  return `/pending-tasks/${doctype}/${id}`;
};

const formatRelativeTime = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// --- Main Component ---
export function ProjectStaffDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name"],
    enabled: !!currentUser,
  });

  // Fetch Pending Tasks
  const { data: pendingData, isLoading: pendingLoading } = useFrappeGetCall<PendingTaskResponse>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_task",
    { page_name: "pending-task" }
  );

  // Fetch Task Registry
  const { data: registryData, isLoading: registryLoading } = useFrappeGetCall<TaskRegistryResponse>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_task_registry",
    { page_name: "task-registry" }
  );

  const fullName = userData?.full_name || currentUser || "Guest";
  const isLoading = pendingLoading || registryLoading;

  // --- Computed Data ---
  const pendingTasks = React.useMemo(() => {
    if (!pendingData?.message?.results) return [];
    const tasks: (TaskRecord & { doctype: string })[] = [];
    pendingData.message.results.forEach((group) => {
      if (group.mod_vis || group.doctype === "Advance Settlement") {
        group.records.forEach((record) => {
          tasks.push({ ...record, doctype: group.doctype });
        });
      }
    });
    return tasks.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  }, [pendingData]);

  const registryTasks = React.useMemo(() => {
    if (!registryData?.message?.results) return [];
    const tasks: (TaskRecord & { doctype: string })[] = [];
    registryData.message.results.forEach((group) => {
      if (group.records && Array.isArray(group.records)) {
        group.records.forEach((record) => {
          tasks.push({ ...record, doctype: group.doctype });
        });
      }
    });
    return tasks.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  }, [registryData]);

  // Stats
  const totalPending = pendingTasks.length;
  const totalProcessed = registryTasks.length;

  const activeModules = React.useMemo(() => {
    const doctypes = new Set<string>();
    pendingTasks.forEach(t => doctypes.add(t.doctype));
    registryTasks.forEach(t => doctypes.add(t.doctype));
    return doctypes.size;
  }, [pendingTasks, registryTasks]);

  const recentActivityCount = React.useMemo(() => {
    const today = new Date().toDateString();
    return [...pendingTasks, ...registryTasks].filter(
      t => new Date(t.modified).toDateString() === today
    ).length;
  }, [pendingTasks, registryTasks]);

  // Module breakdown for pending tasks
  const moduleBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    pendingTasks.forEach(t => {
      counts[t.doctype] = (counts[t.doctype] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([doctype, count]) => ({ doctype, count }))
      .sort((a, b) => b.count - a.count);
  }, [pendingTasks]);

  const maxModuleCount = Math.max(...moduleBreakdown.map(m => m.count), 1);

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans">
      {/* <AppSidebar /> */}
      <div className="flex-1 p-4 md:p-8">
        <div className="w-full max-w-7xl mx-auto">

          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">
                  Project Staff Dashboard
                </h1>
                <p className="text-sm text-zinc-600 dark:text-[#A1A1AA] mt-1">
                  Welcome back, <span className="font-semibold text-[#27272A] dark:text-[#E4E4E7]">{fullName}</span>
                </p>
              </div>
              <CurrentTime />
            </div>
          </header>

          {/* Quick Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Pending Approvals */}
            <button
              onClick={() => navigate("/pending-task")}
              className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#4A6CF7]/30 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg group-hover:bg-[#4A6CF7]/10 transition-colors">
                  <ClipboardCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 group-hover:text-[#4A6CF7]" />
                </div>
                {totalPending > 0 && (
                  <span className="px-2.5 py-1 bg-[#D97757] text-white text-xs font-bold rounded-full shadow-sm animate-pulse">
                    {totalPending}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-1">My Pending Tasks</h3>
              <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                {totalPending > 0 ? `${totalPending} tasks awaiting your action` : "No pending tasks"}
              </p>
              <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-[#D4D4D8] group-hover:text-[#4A6CF7] group-hover:translate-x-1 transition-all" />
            </button>

            {/* Department Projects */}
            <button
              onClick={() => navigate("/projects")}
              className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#4A6CF7]/30 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg group-hover:bg-[#4A6CF7]/10 transition-colors">
                  <Briefcase className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:text-[#4A6CF7]" />
                </div>
              </div>
              <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-1">My Submissions</h3>
              <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">Monitor ongoing and completed projects</p>
              <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-[#D4D4D8] group-hover:text-[#4A6CF7] group-hover:translate-x-1 transition-all" />
            </button>

            {/* Task Registry */}
            <button
              onClick={() => navigate("/task-registry")}
              className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#4A6CF7]/30 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:bg-[#4A6CF7]/10 transition-colors">
                  <BarChart className="h-5 w-5 text-purple-600 dark:text-purple-400 group-hover:text-[#4A6CF7]" />
                </div>
                {totalProcessed > 0 && (
                  <span className="px-2.5 py-1 bg-zinc-700 text-white text-xs font-bold rounded-full">
                    {totalProcessed}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-1">My History</h3>
              <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                {totalProcessed > 0 ? `${totalProcessed} documents submitted` : "View all submitted documents"}
              </p>
              <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-[#D4D4D8] group-hover:text-[#4A6CF7] group-hover:translate-x-1 transition-all" />
            </button>
          </section>

          {/* Stats Row */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <AnalyticsCard
                title="Pending"
                value={isLoading ? "—" : String(totalPending)}
                subtitle="Awaiting action"
                icon={<AlertCircle className="h-5 w-5" />}
              />
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <AnalyticsCard
                title="Submitted"
                value={isLoading ? "—" : String(totalProcessed)}
                subtitle="Total documents"
                icon={<Zap className="h-5 w-5" />}
              />
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <AnalyticsCard
                title="Active Modules"
                value={isLoading ? "—" : String(activeModules)}
                subtitle="Document types in use"
                icon={<Layers className="h-5 w-5" />}
              />
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <AnalyticsCard
                title="Today's Activity"
                value={isLoading ? "—" : String(recentActivityCount)}
                subtitle="Modified today"
                icon={<Activity className="h-5 w-5" />}
              />
            </div>
          </section>

          {/* Two-Column: Recent Pending + Recently Processed */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Recent Pending Approvals */}
            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-[#D97757]" />
                  <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                    Recent Approvals Needed
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/pending-task")}
                  className="text-xs text-[#4A6CF7] hover:text-[#3b5cf6] font-semibold flex items-center gap-1 transition-colors"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                {isLoading ? (
                  <div className="p-8 text-center text-[#A1A1AA]">
                    <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading…</p>
                  </div>
                ) : pendingTasks.length === 0 ? (
                  <div className="p-8 text-center text-[#A1A1AA]">
                    <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-[#D4D4D8]" />
                    <p className="text-sm font-medium">No pending approvals</p>
                    <p className="text-xs mt-1">You're all caught up!</p>
                  </div>
                ) : (
                  pendingTasks.slice(0, 5).map((task) => (
                    <button
                      key={task.name}
                      onClick={() => navigate(getTaskRoute(task.doctype, task.name))}
                      className="w-full px-5 py-3 hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]/50 transition-colors flex items-center gap-3 text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", getStatusStyle(task.status))}>
                            {task.status}
                          </span>
                          <span className="text-[10px] text-[#A1A1AA] font-medium">{task.doctype}</span>
                        </div>
                        <p className="text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                          {task.owner} · {formatRelativeTime(task.modified)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#D4D4D8] group-hover:text-[#4A6CF7] flex-shrink-0 transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Recently Processed */}
            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart className="h-4 w-4 text-[#D97757]" />
                  <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                    Recently Processed
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/task-registry")}
                  className="text-xs text-[#4A6CF7] hover:text-[#3b5cf6] font-semibold flex items-center gap-1 transition-colors"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                {isLoading ? (
                  <div className="p-8 text-center text-[#A1A1AA]">
                    <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading…</p>
                  </div>
                ) : registryTasks.length === 0 ? (
                  <div className="p-8 text-center text-[#A1A1AA]">
                    <BarChart className="h-8 w-8 mx-auto mb-2 text-[#D4D4D8]" />
                    <p className="text-sm font-medium">No processed documents yet</p>
                  </div>
                ) : (
                  registryTasks.slice(0, 5).map((task) => (
                    <button
                      key={task.name}
                      onClick={() => {
                        if (task.doctype === "Fund Received") navigate(`/fund-received/${task.name}`);
                        else if (task.doctype === "Reimbursement") navigate(`/reimbursement/${task.name}`);
                        else navigate(`/task-registry/${task.doctype}/${task.name}`);
                      }}
                      className="w-full px-5 py-3 hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]/50 transition-colors flex items-center gap-3 text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", getStatusStyle(task.status))}>
                            {task.status}
                          </span>
                          <span className="text-[10px] text-[#A1A1AA] font-medium">{task.doctype}</span>
                        </div>
                        <p className="text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                          {task.owner} · {formatRelativeTime(task.modified)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#D4D4D8] group-hover:text-[#4A6CF7] flex-shrink-0 transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Module Breakdown */}
          {moduleBreakdown.length > 0 && (
            <section className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-[#D97757]" />
                <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                  Pending by Module
                </h3>
              </div>
              <div className="space-y-3">
                {moduleBreakdown.map(({ doctype, count }) => (
                  <div key={doctype} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-700 dark:text-[#D4D4D8] w-40 truncate flex-shrink-0">
                      {doctype}
                    </span>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[#4A6CF7] h-full rounded-full transition-all duration-700"
                        style={{ width: `${(count / maxModuleCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7] w-8 text-right flex-shrink-0">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="text-center text-[#71717A] dark:text-[#A1A1AA] mt-6 pb-4">
            <div className="flex items-center justify-center space-x-2 text-xs">
              <Mail className="size-3.5" />
              <p>For any query, e-mail to <a href="mailto:ernd@iitg.ac.in" className="text-[#D97757] hover:underline font-semibold">ernd@iitg.ac.in</a></p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
