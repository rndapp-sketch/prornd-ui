import React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc, useFrappeGetCall } from "frappe-react-sdk";
// import { AppSidebar } from "../../components/RndSidebar";
import { AnalyticsCard, CurrentTime } from "../../components/DashboardCards";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck, Users, Layers,
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
  message: { page: string; status_value: string; results: TaskGroup[] };
}

interface TaskRegistryResponse {
  message: { results: TaskGroup[]; pagination: any; filters: any };
}

// --- Helpers ---
const getStatusStyle = (status: string) => {
  const s = status?.toLowerCase() || "";
  if (["pending", "under review", "approval pending"].some(t => s.includes(t)))
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (s.includes("approved")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s.includes("draft")) return "bg-zinc-100 text-zinc-600 border-zinc-200";
  if (s.includes("rejected")) return "bg-red-50 text-red-700 border-red-200";
  if (s.includes("forwarded") || s.includes("processed")) return "bg-purple-50 text-purple-700 border-purple-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
};

const getTaskRoute = (doctype: string, id: string) => {
  if (doctype === "Fund Received") return `/fund-received/${id}`;
  if (doctype === "Reimbursement") return `/reimbursement/${id}`;
  if (doctype === "Advance Settlement") return `/advance-settlement/${id}`;
  if (doctype === "Temporary Advance") return `/pending-tasks/${encodeURIComponent(doctype)}/${id}`;
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
export function DorndDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name"],
    enabled: !!currentUser,
  });

  const { data: pendingData, isLoading: pendingLoading } = useFrappeGetCall<PendingTaskResponse>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_task",
    { page_name: "pending-task" }
  );

  const { data: registryData, isLoading: registryLoading } = useFrappeGetCall<TaskRegistryResponse>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_task_registry",
    { page_name: "task-registry" }
  );

  const fullName = userData?.full_name || currentUser || "Guest";
  const isLoading = pendingLoading || registryLoading;

  const pendingTasks = React.useMemo(() => {
    if (!pendingData?.message?.results) return [];
    const tasks: (TaskRecord & { doctype: string })[] = [];
    pendingData.message.results.forEach((group) => {
      if (group.mod_vis || group.doctype === "Advance Settlement") {
        group.records.forEach((r) => tasks.push({ ...r, doctype: group.doctype }));
      }
    });
    return tasks.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  }, [pendingData]);

  const registryTasks = React.useMemo(() => {
    if (!registryData?.message?.results) return [];
    const tasks: (TaskRecord & { doctype: string })[] = [];
    registryData.message.results.forEach((group) => {
      if (group.records && Array.isArray(group.records)) {
        group.records.forEach((r) => tasks.push({ ...r, doctype: group.doctype }));
      }
    });
    return tasks.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  }, [registryData]);

  const totalPending = pendingTasks.length;
  const totalProcessed = registryTasks.length;
  const activeModules = React.useMemo(() => {
    const set = new Set<string>();
    pendingTasks.forEach(t => set.add(t.doctype));
    registryTasks.forEach(t => set.add(t.doctype));
    return set.size;
  }, [pendingTasks, registryTasks]);
  const recentActivityCount = React.useMemo(() => {
    const today = new Date().toDateString();
    return [...pendingTasks, ...registryTasks].filter(t => new Date(t.modified).toDateString() === today).length;
  }, [pendingTasks, registryTasks]);

  const moduleBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    pendingTasks.forEach(t => { counts[t.doctype] = (counts[t.doctype] || 0) + 1; });
    return Object.entries(counts).map(([doctype, count]) => ({ doctype, count })).sort((a, b) => b.count - a.count);
  }, [pendingTasks]);
  const maxModuleCount = Math.max(...moduleBreakdown.map(m => m.count), 1);

  return (
    <div className="min-h-screen bg-[#F8F6F3] dark:bg-zinc-900 font-sans">
      {/* <AppSidebar /> */}
      <div className="flex-1 p-4 md:p-8">
        <div className="w-full max-w-7xl mx-auto">

          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Dean's R&D Dashboard</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Welcome back, <span className="font-semibold text-zinc-800 dark:text-zinc-200">{fullName}</span>
                </p>
              </div>
              <CurrentTime />
            </div>
          </header>

          {/* Quick Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button onClick={() => navigate("/pending-task")} className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#D97757]/40 transition-all text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg group-hover:bg-[#D97757]/10 transition-colors"><ClipboardCheck className="h-5 w-5 text-amber-600 group-hover:text-[#D97757]" /></div>
                {totalPending > 0 && <span className="px-2.5 py-1 bg-[#D97757] text-white text-xs font-bold rounded-full shadow-sm animate-pulse">{totalPending}</span>}
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Final Approvals</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{totalPending > 0 ? `${totalPending} requests awaiting final approval` : "No pending approvals"}</p>
              <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-zinc-300 group-hover:text-[#D97757] group-hover:translate-x-1 transition-all" />
            </button>

            <button onClick={() => navigate("/task-registry")} className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#D97757]/40 transition-all text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:bg-[#D97757]/10 transition-colors"><Users className="h-5 w-5 text-purple-600 group-hover:text-[#D97757]" /></div>
                {totalProcessed > 0 && <span className="px-2.5 py-1 bg-zinc-700 text-white text-xs font-bold rounded-full">{totalProcessed}</span>}
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Institute Analytics</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{totalProcessed > 0 ? `${totalProcessed} documents processed` : "View processed documents"}</p>
              <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-zinc-300 group-hover:text-[#D97757] group-hover:translate-x-1 transition-all" />
            </button>

            <button onClick={() => navigate("/projects")} className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#D97757]/40 transition-all text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg group-hover:bg-[#D97757]/10 transition-colors"><Layers className="h-5 w-5 text-emerald-600 group-hover:text-[#D97757]" /></div>
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Projects</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">View and manage all projects</p>
              <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-zinc-300 group-hover:text-[#D97757] group-hover:translate-x-1 transition-all" />
            </button>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <AnalyticsCard title="Pending" value={isLoading ? "—" : String(totalPending)} subtitle="Awaiting your approval" icon={<AlertCircle className="h-5 w-5" />} />
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <AnalyticsCard title="Processed" value={isLoading ? "—" : String(totalProcessed)} subtitle="Approved / Forwarded" icon={<Zap className="h-5 w-5" />} />
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <AnalyticsCard title="Active Modules" value={isLoading ? "—" : String(activeModules)} subtitle="Document types in use" icon={<Layers className="h-5 w-5" />} />
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <AnalyticsCard title="Today's Activity" value={isLoading ? "—" : String(recentActivityCount)} subtitle="Modified today" icon={<Activity className="h-5 w-5" />} />
            </div>
          </section>

          {/* Two-Column: Pending + Processed */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pending */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-[#D97757]" /><h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm uppercase tracking-wide">Recent Approvals Needed</h3></div>
                <button onClick={() => navigate("/pending-task")} className="text-xs text-[#D97757] hover:text-[#c5684a] font-semibold flex items-center gap-1 transition-colors">View All <ChevronRight className="h-3 w-3" /></button>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {isLoading ? (
                  <div className="p-8 text-center text-zinc-400"><div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-2" /><p className="text-sm">Loading…</p></div>
                ) : pendingTasks.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400"><ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-zinc-300" /><p className="text-sm font-medium">No pending approvals</p></div>
                ) : (
                  pendingTasks.slice(0, 5).map((task) => (
                    <button key={task.name} onClick={() => navigate(getTaskRoute(task.doctype, task.name))} className="w-full px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors flex items-center gap-3 text-left group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", getStatusStyle(task.status))}>{task.status}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">{task.doctype}</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{task.title}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{task.owner} · {formatRelativeTime(task.modified)}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-[#D97757] flex-shrink-0 transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Processed */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#D97757]" /><h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm uppercase tracking-wide">Recently Processed</h3></div>
                <button onClick={() => navigate("/task-registry")} className="text-xs text-[#D97757] hover:text-[#c5684a] font-semibold flex items-center gap-1 transition-colors">View All <ChevronRight className="h-3 w-3" /></button>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {isLoading ? (
                  <div className="p-8 text-center text-zinc-400"><div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-2" /><p className="text-sm">Loading…</p></div>
                ) : registryTasks.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400"><Users className="h-8 w-8 mx-auto mb-2 text-zinc-300" /><p className="text-sm font-medium">No processed documents yet</p></div>
                ) : (
                  registryTasks.slice(0, 5).map((task) => (
                    <button key={task.name} onClick={() => { if (task.doctype === "Fund Received") navigate(`/fund-received/${task.name}`); else if (task.doctype === "Reimbursement") navigate(`/reimbursement/${task.name}`); else navigate(`/task-registry/${task.doctype}/${task.name}`); }} className="w-full px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors flex items-center gap-3 text-left group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", getStatusStyle(task.status))}>{task.status}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">{task.doctype}</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{task.title}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{task.owner} · {formatRelativeTime(task.modified)}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-[#D97757] flex-shrink-0 transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Module Breakdown */}
          {moduleBreakdown.length > 0 && (
            <section className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5 mb-6">
              <div className="flex items-center gap-2 mb-4"><Clock className="h-4 w-4 text-[#D97757]" /><h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm uppercase tracking-wide">Pending by Module</h3></div>
              <div className="space-y-3">
                {moduleBreakdown.map(({ doctype, count }) => (
                  <div key={doctype} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-40 truncate flex-shrink-0">{doctype}</span>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-[#D97757] h-full rounded-full transition-all duration-700" style={{ width: `${(count / maxModuleCount) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 w-8 text-right flex-shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <footer className="text-center text-zinc-500 dark:text-zinc-400 mt-6 pb-4">
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