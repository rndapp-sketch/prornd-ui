import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetCall, useFrappeGetDoc } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
  Banknote, CheckCircle2, ChevronRight, ClipboardList, FolderKanban, Receipt, Search, Users, X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskRecord { name: string; title: string; status: string; creation: string; modified: string; owner: string; }
interface TaskGroup { doctype: string; records: TaskRecord[]; }
interface CategorizedTaskRow {
  status: string; module: string; title: string; project_no: string; date: string;
  owner: string; doctype: string; name: string; mod_vis: number | null;
}
interface PendingTaskResponse { message: { research: CategorizedTaskRow[]; consultancy: CategorizedTaskRow[]; others: CategorizedTaskRow[] } }
interface TaskRegistryResponse { message: { results: TaskGroup[] } }
type Task = TaskRecord & { doctype: string };
type PriorityKey = "High" | "Medium" | "Normal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ageDays = (d: string) => (Date.now() - new Date(d).getTime()) / 86400000;

const priorityOf = (d: string): PriorityKey => {
  const a = ageDays(d);
  return a > 3 ? "High" : a > 1 ? "Medium" : "Normal";
};

const PRIORITY_STYLE: Record<PriorityKey, { dot: string; text: string; label: string }> = {
  High: { dot: "bg-red-500", text: "text-red-700 dark:text-red-400", label: "Overdue" },
  Medium: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", label: "Ageing" },
  Normal: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", label: "On time" },
};

const taskRoute = (doctype: string, id: string) => {
  if (doctype === "Fund Received") return `/fund-received/${id}`;
  if (doctype === "Reimbursement") return `/reimbursement/${id}`;
  if (doctype === "Advance Settlement") return `/advance-settlement/${id}`;
  if (doctype === "Temporary Advance") return `/pending-tasks/${encodeURIComponent(doctype)}/${id}`;
  if (doctype === "Project Staff Details") return `/project-staff-joining?docname=${encodeURIComponent(id)}`;
  if (doctype === "Miscellaneous Commit") return `/miscellaneous-commit/${id}`;
  if (doctype === "Loan Request") return `/loan-request/${id}`;
  return `/pending-tasks/${doctype}/${id}`;
};

const registryRoute = (doctype: string, id: string) => {
  if (doctype === "Fund Received") return `/fund-received/${id}`;
  if (doctype === "Reimbursement") return `/reimbursement/${id}`;
  return `/task-registry/${doctype}/${id}`;
};

const fmtAge = (d: string) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${Math.max(m, 0)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

// ─── Small pieces ────────────────────────────────────────────────────────────

const Panel = ({ title, action, children, className }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) => (
  <section className={cn("rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#27272A]", className)}>
    <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
      <h2 className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
      {action}
    </header>
    {children}
  </section>
);

const LinkButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[#D97757] hover:underline">
    {children} <ChevronRight className="h-3.5 w-3.5" />
  </button>
);

const Empty = ({ icon: Icon, text }: { icon: ElementType; text: string }) => (
  <div className="flex flex-col items-center py-12 text-zinc-400">
    <Icon className="mb-2 h-7 w-7 opacity-40" />
    <p className="text-[13px]">{text}</p>
  </div>
);

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function RndStaffDashboardV2() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", currentUser ? undefined : null);

  const { data: pendingData, isLoading: pendingLoading } = useFrappeGetCall<PendingTaskResponse>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_categorized_pending_task",
    { page_name: "pending-task" },
  );
  const { data: registryData, isLoading: registryLoading } = useFrappeGetCall<TaskRegistryResponse>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_task_registry",
    { page_name: "task-registry" },
  );

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"" | PriorityKey>("");
  const [visibleCount, setVisibleCount] = useState(12);

  const now = new Date();
  const fullName = (userData?.full_name || currentUser || "there") as string;
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const loading = pendingLoading || registryLoading;

  const pending = useMemo<Task[]>(() => {
    const m = pendingData?.message;
    if (!m) return [];
    return [...(m.research ?? []), ...(m.consultancy ?? []), ...(m.others ?? [])]
      .filter((r) => r.mod_vis || r.doctype === "Advance Settlement")
      .map((r) => ({ name: r.name, title: r.title, status: r.status, creation: r.date, modified: r.date, owner: r.owner, doctype: r.doctype }))
      .sort((a, b) => new Date(a.modified).getTime() - new Date(b.modified).getTime()); // oldest first
  }, [pendingData]);

  const processed = useMemo<Task[]>(() => {
    const out: Task[] = [];
    registryData?.message?.results?.forEach((g) => {
      if (Array.isArray(g.records)) g.records.forEach((r) => out.push({ ...r, doctype: g.doctype }));
    });
    return out.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  }, [registryData]);

  const counts = useMemo(() => {
    const c: Record<PriorityKey, number> = { High: 0, Medium: 0, Normal: 0 };
    pending.forEach((t) => { c[priorityOf(t.modified)] += 1; });
    return c;
  }, [pending]);

  const avgAge = pending.length ? pending.reduce((s, t) => s + ageDays(t.modified), 0) / pending.length : 0;
  const oldest = pending[0];

  const byModule = useMemo(() => {
    const m: Record<string, number> = {};
    pending.forEach((t) => { m[t.doctype] = (m[t.doctype] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [pending]);
  const maxModule = Math.max(...byModule.map(([, n]) => n), 1);

  const filtered = useMemo(() => pending.filter((t) => {
    const q = search.trim().toLowerCase();
    if (q && !t.title.toLowerCase().includes(q) && !t.doctype.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q)) return false;
    if (moduleFilter && t.doctype !== moduleFilter) return false;
    if (priorityFilter && priorityOf(t.modified) !== priorityFilter) return false;
    return true;
  }), [pending, search, moduleFilter, priorityFilter]);

  const hasFilters = !!(search || moduleFilter || priorityFilter);
  const clear = () => { setSearch(""); setModuleFilter(""); setPriorityFilter(""); };

  const quick = [
    { label: "Pending Tasks", icon: ClipboardList, route: "/pending-task" },
    { label: "Task Registry", icon: FolderKanban, route: "/task-registry" },
    { label: "Project Staff", icon: Users, route: "/project-staff-details" },
    { label: "Fund Received", icon: Banknote, route: "/fund-received" },
    { label: "Reimbursements", icon: Receipt, route: "/reimbursement" },
  ];

  const kpis = [
    { label: "Pending", value: pending.length, note: pending.length ? `${counts.Normal} on time` : "All clear" },
    { label: "Overdue", value: counts.High, note: "Waiting more than 3 days", alert: counts.High > 0 },
    { label: "Average age", value: `${avgAge.toFixed(1)}d`, note: oldest ? `Oldest: ${fmtAge(oldest.modified)}` : "—" },
    { label: "Processed", value: processed.length, note: `${byModule.length} module${byModule.length === 1 ? "" : "s"} pending` },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans text-[14px] text-zinc-800 dark:bg-[#18181B] dark:text-zinc-200">
      <div className="w-full space-y-3 px-0 pb-4 pt-0">
        {/* Title */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-zinc-900 dark:text-white">R&amp;D Operations</h1>
            <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">
              {greeting}, {fullName.split(" ")[0]} ·{" "}
              {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, modules, IDs"
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-8 text-[13px] placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-[#27272A]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-[#27272A] lg:grid-cols-4 lg:divide-x">
          {kpis.map((k) => (
            <div key={k.label} className="px-5 py-4">
              <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">{k.label}</p>
              <p className={cn("mt-1 text-[26px] font-bold leading-none tracking-tight", k.alert ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-white")}>
                {loading ? "—" : k.value}
              </p>
              <p className="mt-1.5 text-[12px] text-zinc-500 dark:text-zinc-400">{loading ? "Loading…" : k.note}</p>
            </div>
          ))}
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Work queue */}
          <Panel
            title="Work queue"
            action={<LinkButton onClick={() => navigate("/pending-task")}>Open all</LinkButton>}
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-5 py-2.5 dark:border-zinc-800">
              {(["", "High", "Medium", "Normal"] as const).map((p) => {
                const active = priorityFilter === p;
                const label = p === "" ? "All" : PRIORITY_STYLE[p].label;
                const n = p === "" ? pending.length : counts[p];
                return (
                  <button
                    key={p || "all"}
                    onClick={() => setPriorityFilter(p)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors",
                      active ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
                    )}
                  >
                    {label} <span className="font-normal opacity-70">{n}</span>
                  </button>
                );
              })}
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="ml-auto rounded-md border border-zinc-200 bg-white px-2 py-1 text-[12px] text-zinc-700 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300"
              >
                <option value="">All modules</option>
                {byModule.map(([m]) => <option key={m} value={m}>{m}</option>)}
              </select>
              {hasFilters && (
                <button onClick={clear} className="text-[12px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">Clear</button>
              )}
            </div>

            {loading ? (
              <div className="py-14 text-center text-[13px] text-zinc-400">Loading tasks…</div>
            ) : filtered.length === 0 ? (
              <Empty icon={CheckCircle2} text={hasFilters ? "No tasks match these filters" : "No pending tasks"} />
            ) : (
              <>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
                      <th className="px-5 py-2">Task</th>
                      <th className="hidden px-3 py-2 md:table-cell">Module</th>
                      <th className="hidden px-3 py-2 lg:table-cell">Status</th>
                      <th className="px-5 py-2 text-right">Waiting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, visibleCount).map((t) => {
                      const p = PRIORITY_STYLE[priorityOf(t.modified)];
                      return (
                        <tr
                          key={`${t.doctype}-${t.name}`}
                          onClick={() => navigate(taskRoute(t.doctype, t.name))}
                          className="cursor-pointer border-b border-zinc-50 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
                        >
                          <td className="px-5 py-2.5">
                            <p className="truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{t.title || t.name}</p>
                            <p className="font-mono text-[11px] text-zinc-500">{t.name}</p>
                          </td>
                          <td className="hidden px-3 py-2.5 text-[13px] text-zinc-700 dark:text-zinc-300 md:table-cell">{t.doctype}</td>
                          <td className="hidden px-3 py-2.5 text-[12px] text-zinc-600 dark:text-zinc-400 lg:table-cell">{t.status}</td>
                          <td className="px-5 py-2.5 text-right">
                            <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-semibold", p.text)}>
                              <span className={cn("h-1.5 w-1.5 rounded-full", p.dot)} />
                              {fmtAge(t.modified)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-5 py-2.5 text-[12px] text-zinc-500">
                  <span>Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} · oldest first</span>
                  {filtered.length > visibleCount && (
                    <button onClick={() => setVisibleCount((n) => n + 12)} className="font-semibold text-[#D97757] hover:underline">Show more</button>
                  )}
                </div>
              </>
            )}
          </Panel>

          {/* Side column */}
          <div className="space-y-5">
            <Panel title="Ageing">
              <div className="space-y-3 px-5 py-4">
                <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  {pending.length > 0 && (["Normal", "Medium", "High"] as const).map((k) => (
                    <div key={k} className={PRIORITY_STYLE[k].dot} style={{ width: `${(counts[k] / pending.length) * 100}%` }} />
                  ))}
                </div>
                <ul className="space-y-1.5 text-[13px]">
                  {(["Normal", "Medium", "High"] as const).map((k) => (
                    <li key={k} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <span className={cn("h-2 w-2 rounded-full", PRIORITY_STYLE[k].dot)} />
                        {PRIORITY_STYLE[k].label}
                        <span className="text-[11px] text-zinc-400">{k === "Normal" ? "< 1 day" : k === "Medium" ? "1–3 days" : "> 3 days"}</span>
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{counts[k]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel title="Pending by module">
              {byModule.length === 0 ? (
                <Empty icon={CheckCircle2} text="Nothing pending" />
              ) : (
                <ul className="space-y-3 px-5 py-4">
                  {byModule.slice(0, 7).map(([m, n]) => (
                    <li key={m}>
                      <button onClick={() => setModuleFilter(m)} className="w-full text-left">
                        <div className="mb-1 flex items-center justify-between text-[13px]">
                          <span className="truncate text-zinc-700 dark:text-zinc-300">{m}</span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{n}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div className="h-full rounded-full bg-[#D97757]" style={{ width: `${(n / maxModule) * 100}%` }} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Recently processed" action={<LinkButton onClick={() => navigate("/task-registry")}>Registry</LinkButton>}>
              {processed.length === 0 ? (
                <Empty icon={ClipboardList} text="No processed tasks yet" />
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {processed.slice(0, 5).map((t) => (
                    <li key={`${t.doctype}-${t.name}`}>
                      <button onClick={() => navigate(registryRoute(t.doctype, t.name))} className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{t.title || t.name}</span>
                          <span className="block truncate text-[11px] text-zinc-500">{t.doctype}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-zinc-500">{fmtDate(t.modified)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Shortcuts">
              <ul className="p-2">
                {quick.map(({ label, icon: Icon, route }) => (
                  <li key={route}>
                    <button onClick={() => navigate(route)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50">
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-zinc-400" />
                        {label}
                      </span>
                      <ChevronRight className="h-4 w-4 text-zinc-300" />
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
