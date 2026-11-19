import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc, useFrappeGetCall, useFrappeGetDocList } from "frappe-react-sdk";
import { AnalyticsCard } from "../../components/DashboardCards";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import "./projectStaffDashboard.css";
import {
  Files, Hourglass, CircleCheck, FileX, Plus, FolderKanban,
  ClipboardCheck, Briefcase, BarChart, Layers,
  AlertCircle, Zap, Activity, Clock,
  ArrowRight, ChevronRight, Mail, User as UserIcon, IdCard,
  Receipt, Wallet, RotateCcw, ShoppingCart, FileText, Search, ListTodo, CheckCircle2,
  Phone, Building2, Cake, CalendarCheck, CalendarClock, Plane, CalendarDays, LogOut, LayoutGrid, ChevronLeft, X
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { resignationAPI, extensionAPI } from "@/services/apiService";
import { DepartmentName } from "@/components/DepartmentName";

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

// Row shape returned by get_categorized_pending_task, already bucketed into
// research/consultancy/others and resolved server-side via DOCTYPE_PR_LINKS.
// It has no `modified` field — only `date` (creation, truncated) — so recency
// sorting/display below is keyed off creation date, not last-modified.
interface CategorizedTaskRow {
  status: string;
  module: string;
  title: string;
  project_no: string;
  date: string;
  owner: string;
  doctype: string;
  name: string;
  mod_vis: number | null;
  deposit_slip?: string;
}

interface PendingTaskResponse {
  message: {
    research: CategorizedTaskRow[];
    consultancy: CategorizedTaskRow[];
    others: CategorizedTaskRow[];
  };
}

interface TaskRegistryResponse {
  message: {
    results: TaskGroup[];
    pagination: any;
    filters: any;
  };
}

interface BasicDetailsRecord {
  name: string;
  erp_mail?: string;
  ps_first_name?: string;
  ps_middle_name?: string;
  ps_last_name?: string;
  ps_fathers_name?: string;
  ps_gender?: string;
  ps_date_of_birth?: string;
  ps_blood_group?: string;
  ps_maritial_status?: string;
  ps_citizenship?: string;
  ps_phone_number?: string;
  ps_email_id?: string;
  ps_present_address?: string;
  ps_permanent_address?: string;
  ps_department?: string;
  ps_department_name?: string;
  ps_designation?: string;
  ps_emp_id?: string;
  project_no?: string;
  ps_joining_date?: string;
  ps_term_completion_date?: string;
  bank_account_number?: string;
  ps_aadhar_number?: string;
  ps_pan?: string;
  ps_photo?: string;
  username?: string;
  full_name?: string;
  email?: string;
}

// --- Helpers ---
type StatusTone = "pending" | "approved" | "draft" | "rejected" | "progress";

const getStatusTone = (status: string): StatusTone => {
  const s = status?.toLowerCase() || "";
  if (["pending", "under review", "approval pending"].some(t => s.includes(t))) return "pending";
  if (["approved", "generated", "completed"].some(t => s.includes(t))) return "approved";
  if (s.includes("draft")) return "draft";
  if (s.includes("rejected")) return "rejected";
  return "progress";
};

// Status palette follows the dashboard tokens (see projectStaffDashboard.css).
const TONE_STYLES: Record<StatusTone, { pill: string; dot: string }> = {
  pending: {
    pill: "bg-[var(--psd-review-bg)] text-[#B45309] ring-black/5 dark:text-amber-300 dark:ring-white/10",
    dot: "bg-[var(--psd-review)]",
  },
  approved: {
    pill: "bg-[var(--psd-approved-bg)] text-[#0A7F58] ring-black/5 dark:text-emerald-300 dark:ring-white/10",
    dot: "bg-[var(--psd-approved)]",
  },
  draft: {
    pill: "bg-[var(--psd-returned-bg)] text-[#C42B3C] ring-black/5 dark:text-rose-300 dark:ring-white/10",
    dot: "bg-[var(--psd-returned)]",
  },
  rejected: {
    pill: "bg-[var(--psd-returned-bg)] text-[#C42B3C] ring-black/5 dark:text-rose-300 dark:ring-white/10",
    dot: "bg-[var(--psd-returned)]",
  },
  progress: {
    pill: "bg-[var(--psd-info-bg)] text-[#2F5BC4] ring-black/5 dark:text-blue-300 dark:ring-white/10",
    dot: "bg-[var(--psd-info)]",
  },
};

const getStatusStyle = (status: string) => TONE_STYLES[getStatusTone(status)].pill;

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

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const DOCTYPE_ICONS: Record<string, React.ElementType> = {
  "Direct Purchase": ShoppingCart,
  "Indent General Form": FileText,
  "Indent Cum Sanction Sheet": Receipt,
  "Temporary Advance": Wallet,
  "Advance Settlement": RotateCcw,
  "Reimbursement": Receipt,
  "Travel": Plane,
  "TA DA Settlement": Receipt,
  "Project Staff Resignation": LogOut,
  "Project Staff Extension": Clock,
  "Leave Module": CalendarDays,
  "Employee ID Card": IdCard,
};

// Shared surface: tinted, wide-spreading shadow instead of a hard drop shadow
const SURFACE = "psd-card";

const REVEAL = "animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-500 motion-reduce:animate-none";

// --- Presentational pieces ---
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zinc-200/70 dark:bg-zinc-700/50", className)} />;
}

function StatusPill({ status }: { status: string }) {
  const tone = TONE_STYLES[getStatusTone(status)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
        tone.pill
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {status}
    </span>
  );
}

type BannerTone = "amber" | "emerald" | "sky";

const BANNER_TONES: Record<BannerTone, { bar: string; iconWrap: string }> = {
  amber: { bar: "bg-amber-500", iconWrap: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  emerald: { bar: "bg-emerald-500", iconWrap: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  sky: { bar: "bg-sky-500", iconWrap: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" },
};

function AlertBanner({
  tone,
  icon: Icon,
  title,
  actionLabel,
  onAction,
  urgent,
  children,
}: {
  tone: BannerTone;
  icon: React.ElementType;
  title: string;
  actionLabel: string;
  onAction: () => void;
  urgent?: boolean;
  children: React.ReactNode;
}) {
  const t = BANNER_TONES[tone];
  return (
    <div
      className={cn(
        SURFACE,
        REVEAL,
        "relative flex flex-col gap-4 overflow-hidden p-5 pl-7 sm:flex-row sm:items-center sm:justify-between"
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1.5", t.bar)} />
      <div className="flex items-start gap-4">
        <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl", t.iconWrap)}>
          <Icon className="size-5" strokeWidth={1.75} />
          {urgent && (
            <span className="absolute -right-1 -top-1 size-3 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900" />
          )}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h3>
          <div className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{children}</div>
        </div>
      </div>
      <button
        onClick={onAction}
        className="group inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-50 transition-all hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 sm:self-auto"
      >
        {actionLabel}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

// Term elapsed bar. Animates via transform (scaleX), never width.
function TermProgress({ start, end }: { start?: string; end?: string }) {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const s = start ? new Date(start).getTime() : NaN;
  const e = end ? new Date(end).getTime() : NaN;
  if (isNaN(s) || isNaN(e) || e <= s) return null;

  const now = Date.now();
  const ratio = Math.min(1, Math.max(0, (now - s) / (e - s)));
  const daysLeft = Math.ceil((e - now) / 86_400_000);
  const ended = daysLeft <= 0;
  const closing = !ended && daysLeft <= 90;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="font-semibold text-[var(--psd-heading)]">Engagement progress</span>
        <span
          className={cn(
            "font-mono tabular-nums",
            ended ? "text-[var(--psd-returned)]" : closing ? "text-[#B45309] dark:text-amber-400" : "text-[var(--psd-heading)]"
          )}
        >
          {ended ? "Term ended" : `${daysLeft} days left`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#FFEBDC] dark:bg-zinc-800">
        <div
          className={cn(
            "h-full origin-left rounded-full transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
            ended ? "bg-[var(--psd-returned)]" : closing ? "bg-[var(--psd-review)]" : "bg-[var(--psd-accent)]"
          )}
          style={{ transform: `scaleX(${ready ? ratio : 0})` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-medium tabular-nums text-[var(--psd-body)]">
        <span>{formatDate(start)}</span>
        <span className="font-semibold text-[var(--psd-heading)]">{Math.round(ratio * 100)}% complete</span>
        <span>{formatDate(end)}</span>
      </div>
    </div>
  );
}

// One labelled detail: icon tile, small label above, value below (wraps instead of truncating).
function ProfileField({ icon: Icon, label, mono, children }: { icon: React.ElementType; label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[var(--psd-primary-light)] text-[var(--psd-primary)]">
        <Icon className="size-3" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold leading-tight text-[var(--psd-body)]">{label}</div>
        <div className={cn("break-words text-[12px] font-semibold leading-snug text-[var(--psd-heading)]", mono && "font-mono tabular-nums")}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Small date tile for the "Key dates" row
function DateTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-[var(--psd-border)] bg-[var(--psd-bg)]/60 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--psd-body)]">
        <Icon className="size-3" strokeWidth={1.8} /> {label}
      </div>
      <div className="mt-0.5 text-[12px] font-semibold tabular-nums text-[var(--psd-heading)]">{formatDate(value)}</div>
    </div>
  );
}

const initialsOf = (name: string) =>
  name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "PS";

// --- Application Module Groups ---
const applicationGroups = [
  {
    group: "Purchase",
    icon: ShoppingCart,
    color: {
      icon: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    items: [
      { label: "Direct Purchase", description: "Raise a direct purchase request", icon: ShoppingCart, path: "/direct-purchase" },
      { label: "Indent General Form", description: "Submit a general indent request", icon: FileText, path: "/indent-general-form" },
      { label: "Indent Cum Sanction Sheet", description: "Submit indent with sanction details", icon: Receipt, path: "/indent-cum-sanction-sheet" },
    ],
  },
  {
    group: "Advance",
    icon: Wallet,
    color: {
      icon: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    items: [
      { label: "Temporary Advance", description: "Apply for a temporary advance", icon: Wallet, path: "/temporary-advance" },
      { label: "Advance Settlement", description: "Settle a previously taken advance", icon: RotateCcw, path: "/advance-settlement" },
    ],
  },
  {
    group: "Reimbursement",
    icon: Receipt,
    color: {
      icon: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    items: [
      { label: "Reimbursement", description: "Claim expense reimbursement", icon: Receipt, path: "/reimbursement" },
    ],
  },
  {
    group: "Staff Services",
    icon: UserIcon,
    color: {
      icon: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
    items: [
      { label: "ID Card Request", description: "Request your Employee ID Card", icon: IdCard, path: "/id-card-request" },
      { label: "Project Staff Extension", description: "Apply for extension of project staff tenure", icon: Clock, path: "/project-staff-extension" },
      { label: "Project Staff Resignation", description: "Submit project staff resignation request", icon: FileText, path: "/project-staff-resignation" },
    ],
  },
];

// --- Dashboard-local pieces ---
function HeroClock() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="relative z-10 shrink-0 rounded-xl border border-[var(--psd-border)] bg-[var(--psd-surface)]/80 px-2.5 py-1 text-right backdrop-blur-sm">
      <div className="text-[13px] font-semibold leading-none tabular-nums text-[var(--psd-heading)]">{now.toLocaleTimeString()}</div>
      <div className="mt-0.5 text-[10px] text-[var(--psd-body)]">
        {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
      </div>
    </div>
  );
}

// "+ New Application": offers the existing application routes (same list the dashboard already defines).
function NewApplicationMenu({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="psd-focus inline-flex items-center gap-1.5 rounded-lg bg-[var(--psd-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--psd-primary-hover)] active:scale-[0.98]">
          <Plus className="size-4" strokeWidth={2.25} /> New Application
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="max-h-80 w-64 overflow-y-auto">
        {applicationGroups.map((g, gi) => (
          <React.Fragment key={g.group}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-[var(--psd-muted)]">{g.group}</DropdownMenuLabel>
            {g.items.map((it) => (
              <DropdownMenuItem key={it.path} onSelect={() => onNavigate(it.path)} className="cursor-pointer gap-2">
                <it.icon className="size-4 text-[var(--psd-primary)]" strokeWidth={1.75} />
                {it.label}
              </DropdownMenuItem>
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// --- Main Component ---
export function ProjectStaffDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "";
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", currentUser ? undefined : null);

  // Basic Details (joined via username = part of erp_mail before '@')
  const { data: basicResp, isLoading: basicLoading, error: basicError } = useFrappeGetCall<{
    message: BasicDetailsRecord | null;
  }>(
    "rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.get_my_basic_details",
    undefined,
    currentUser ? undefined : null,
  );
  const basic = basicResp?.message ?? undefined;
  const basicFullName = basic
    ? [basic.ps_first_name, basic.ps_middle_name, basic.ps_last_name].filter(Boolean).join(" ")
    : "";

  // Fetch Pending Tasks
  const { data: pendingData, isLoading: pendingLoading } = useFrappeGetCall<PendingTaskResponse>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_categorized_pending_task",
    { page_name: "pending-task" }
  );

  // Fetch Task Registry
  const { data: registryData, isLoading: registryLoading } = useFrappeGetCall<TaskRegistryResponse>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_task_registry",
    { page_name: "task-registry" }
  );

  const fullName = userData?.full_name || currentUser || "Guest";
  const isLoading = pendingLoading || registryLoading;

  // Parallel list queries for all forms owned by current user
  const dpResult = useFrappeGetDocList<any>("Direct Purchase", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser ? [["owner", "=", currentUser]] : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const igResult = useFrappeGetDocList<any>("Indent General Form", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser ? [["owner", "=", currentUser]] : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const icResult = useFrappeGetDocList<any>("Indent Cum Sanction Sheet", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser ? [["owner", "=", currentUser]] : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const taResult = useFrappeGetDocList<any>("Temporary Advance", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser ? [["owner", "=", currentUser]] : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const asResult = useFrappeGetDocList<any>("Advance Settlement", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser ? [["owner", "=", currentUser]] : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const rbResult = useFrappeGetDocList<any>("Reimbursement", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser ? [["owner", "=", currentUser]] : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const trResult = useFrappeGetDocList<any>("Travel", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser ? [["owner", "=", currentUser]] : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const tdResult = useFrappeGetDocList<any>("TA DA Settlement", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser ? [["owner", "=", currentUser]] : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });
  const { data: rsListResp, isLoading: rsLoading } = useFrappeGetCall<any>(
    resignationAPI.getList,
    undefined,
    currentUser ? undefined : null,
    { revalidateOnFocus: false }
  );

  const { data: exListResp, isLoading: exLoading } = useFrappeGetCall<any>(
    extensionAPI.getList,
    undefined,
    currentUser ? undefined : null,
    { revalidateOnFocus: false }
  );

  const lvResult = useFrappeGetDocList<any>("Leave Module", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser ? [["owner", "=", currentUser]] : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const peResult = useFrappeGetDocList<any>("Project Staff Extension", {
    fields: ["name", "workflow_state", "modified", "creation", "owner", "ex_emp_id"],
    filters: currentUser ? [["owner", "=", currentUser]] : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const { data: myIdCardDetailsResp, isLoading: idCardLoading } = useFrappeGetCall<any>(
    "rndopsapp.rndopsapp.doctype.employee_id_card.employee_id_card.get_my_id_card_details",
    undefined,
    currentUser ? undefined : null,
  );

  const myIdCardList = React.useMemo(() => {
    if (Array.isArray(myIdCardDetailsResp?.message)) return myIdCardDetailsResp.message;
    if (Array.isArray(myIdCardDetailsResp)) return myIdCardDetailsResp;
    return [];
  }, [myIdCardDetailsResp]);

  // A request HR sent back: Draft again, carrying HR's comment
  const returnedIdCardAlert = React.useMemo(() => {
    if (!myIdCardList || !Array.isArray(myIdCardList)) return null;
    return myIdCardList.find(
      (d: any) => (d.workflow_state === "Draft" || !d.workflow_state) && (d.remarks || d.hr_comments),
    );
  }, [myIdCardList]);

  // The latest request once HR has verified it or generated the card
  const activeIdCardAlert = React.useMemo(() => {
    if (!myIdCardList || !Array.isArray(myIdCardList) || myIdCardList.length === 0) return null;
    const doc = myIdCardList[0];
    const st = (doc?.workflow_state || "").toLowerCase();
    if (st.includes("verified")) return { type: "verified", doc };
    if (st.includes("generated")) return { type: "generated", doc };
    return null;
  }, [myIdCardList]);

  // Only treat the data as unavailable when every source failed. One list erroring (e.g. a doctype this
  // account can't read) must not blank the counts that did load.
  const trackingQueries = [dpResult, igResult, icResult, taResult, asResult, rbResult, trResult, tdResult, lvResult, peResult];
  const trackingError = trackingQueries.every((q) => !!q.error);

  const trackingInitialLoad = dpResult.isLoading || igResult.isLoading || icResult.isLoading ||
    taResult.isLoading || asResult.isLoading || rbResult.isLoading ||
    trResult.isLoading || tdResult.isLoading || rsLoading || exLoading || peResult.isLoading || lvResult.isLoading ||
    idCardLoading;
  // Skeletons are for the first load only. Once the page has rendered real data, a later
  // key change or revalidation must never swap it back to skeletons (reads as flicker).
  const trackingLoadedOnce = React.useRef(false);
  if (!trackingInitialLoad) trackingLoadedOnce.current = true;
  const trackingLoading = trackingInitialLoad && !trackingLoadedOnce.current;
  const basicLoadedOnce = React.useRef(false);
  if (!basicLoading) basicLoadedOnce.current = true;
  const showBasicSkeleton = basicLoading && !basicLoadedOnce.current;
  const [searchTerm, setSearchTerm] = React.useState("");
  const [actionSearch, setActionSearch] = React.useState("");
  const [selectedDoctype, setSelectedDoctype] = React.useState("All");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const trackingItems = React.useMemo(() => {
    const items: {
      id: string;
      doctype: string;
      workflow_state: string;
      modified: string;
      creation: string;
      route: string;
    }[] = [];

    const formatState = (state?: string) => state || "Draft";
    const extSeen = new Set<string>();

    if (dpResult.data) {
      dpResult.data.forEach(d => items.push({
        id: d.name,
        doctype: "Direct Purchase",
        workflow_state: formatState(d.workflow_state),
        modified: d.modified,
        creation: d.creation,
        route: `/direct-purchase/${d.name}`,
      }));
    }
    if (igResult.data) {
      igResult.data.forEach(d => items.push({
        id: d.name,
        doctype: "Indent General Form",
        workflow_state: formatState(d.workflow_state),
        modified: d.modified,
        creation: d.creation,
        route: `/indent-general-form-details/${d.name}`,
      }));
    }
    if (icResult.data) {
      icResult.data.forEach(d => items.push({
        id: d.name,
        doctype: "Indent Cum Sanction Sheet",
        workflow_state: formatState(d.workflow_state),
        modified: d.modified,
        creation: d.creation,
        route: `/indent-cum-sanction-sheet?edit=${d.name}`,
      }));
    }
    if (taResult.data) {
      taResult.data.forEach(d => items.push({
        id: d.name,
        doctype: "Temporary Advance",
        workflow_state: formatState(d.workflow_state),
        modified: d.modified,
        creation: d.creation,
        route: `/temporary-advance/${d.name}`,
      }));
    }
    if (asResult.data) {
      asResult.data.forEach(d => items.push({
        id: d.name,
        doctype: "Advance Settlement",
        workflow_state: formatState(d.workflow_state),
        modified: d.modified,
        creation: d.creation,
        route: `/advance-settlement/${d.name}`,
      }));
    }
    if (rbResult.data) {
      rbResult.data.forEach(d => items.push({
        id: d.name,
        doctype: "Reimbursement",
        workflow_state: formatState(d.workflow_state),
        modified: d.modified,
        creation: d.creation,
        route: `/reimbursement/${d.name}`,
      }));
    }
    if (trResult.data) {
      trResult.data.forEach(d => items.push({
        id: d.name,
        doctype: "Travel",
        workflow_state: formatState(d.workflow_state),
        modified: d.modified,
        creation: d.creation,
        route: `/travel/${d.name}`,
      }));
    }
    if (tdResult.data) {
      tdResult.data.forEach(d => items.push({
        id: d.name,
        doctype: "TA DA Settlement",
        workflow_state: formatState(d.workflow_state),
        modified: d.modified,
        creation: d.creation,
        route: `/ta-da-settlement?edit=${d.name}`,
      }));
    }
    if (rsListResp?.message?.data) {
      rsListResp.message.data.forEach((d: any) => {
        const isMine =
          (basic?.erp_mail && d.applicant_email_id === basic.erp_mail) ||
          d.owner === currentUser ||
          (currentUser && d.applicant_email_id?.startsWith(currentUser.split("@")[0]));
        if (isMine) {
          items.push({
            id: d.name,
            doctype: "Project Staff Resignation",
            workflow_state: formatState(d.workflow_state),
            modified: d.modified || d.resignation_date || new Date().toISOString(),
            creation: d.creation || d.resignation_date || new Date().toISOString(),
            route: `/project-staff-resignation?edit=${d.name}`,
          });
        }
      });
    }

    if (peResult.data) {
      peResult.data.forEach(d => {
        extSeen.add(d.name);
        items.push({
          id: d.name,
          doctype: "Project Staff Extension",
          workflow_state: formatState(d.workflow_state),
          modified: d.modified,
          creation: d.creation,
          route: `/project-staff-extension?edit=${d.name}`,
        });
      });
    }

    const rawExtData = exListResp?.message?.data || exListResp?.message || exListResp?.data;
    if (Array.isArray(rawExtData)) {
      rawExtData.forEach((d: any) => {
        if (extSeen.has(d.name)) return;
        const isMine =
          (basic?.ps_emp_id && d.ex_emp_id === basic.ps_emp_id) ||
          d.owner === currentUser ||
          (currentUser && d.ex_emp_id === basic?.ps_emp_id) ||
          (currentUser && d.owner === currentUser) ||
          (currentUser && d.owner?.toLowerCase() === currentUser?.toLowerCase());
        if (isMine) {
          extSeen.add(d.name);
          items.push({
            id: d.name,
            doctype: "Project Staff Extension",
            workflow_state: formatState(d.workflow_state),
            modified: d.modified || new Date().toISOString(),
            creation: d.creation || d.modified || new Date().toISOString(),
            route: `/project-staff-extension?edit=${d.name}`,
          });
        }
      });
    }

    if (lvResult.data) {
      lvResult.data.forEach(d => items.push({
        id: d.name,
        doctype: "Leave Module",
        workflow_state: formatState(d.workflow_state),
        modified: d.modified,
        creation: d.creation,
        route: `/leave-module`,
      }));
    }

    if (myIdCardList && myIdCardList.length > 0) {
      myIdCardList.forEach((d: any) => items.push({
        id: d.name,
        doctype: "Employee ID Card",
        workflow_state: formatState(d.workflow_state),
        modified: d.modified,
        creation: d.creation,
        route: `/id-card-request?edit=${d.name}`,
      }));
    }

    return items.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  }, [
    dpResult.data, igResult.data, icResult.data, taResult.data, asResult.data,
    rbResult.data, trResult.data, tdResult.data, rsListResp, exListResp, peResult.data, lvResult.data, myIdCardList,
    basic?.erp_mail, basic?.ps_emp_id, currentUser
  ]);

  const filteredItems = React.useMemo(() => {
    return trackingItems.filter(item => {
      const matchesSearch =
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.doctype.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.workflow_state.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDoctype = selectedDoctype === "All" || item.doctype === selectedDoctype;

      return matchesSearch && matchesDoctype;
    });
  }, [trackingItems, searchTerm, selectedDoctype]);

  const paginatedItems = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const uniqueDoctypes = React.useMemo(() => {
    const list = new Set<string>();
    trackingItems.forEach(item => list.add(item.doctype));
    return ["All", ...Array.from(list)];
  }, [trackingItems]);

  const totalActionsCount = React.useMemo(
    () => applicationGroups.reduce((sum, g) => sum + g.items.length, 0),
    []
  );

  const filteredApplicationGroups = React.useMemo(() => {
    const q = actionSearch.trim().toLowerCase();
    if (!q) return applicationGroups;
    return applicationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            group.group.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [actionSearch]);

  // --- Computed Data ---
  const pendingTasks = React.useMemo(() => {
    if (!pendingData?.message) return [];
    const records = [
      ...(pendingData.message.research ?? []),
      ...(pendingData.message.consultancy ?? []),
      ...(pendingData.message.others ?? []),
    ];
    const tasks: (TaskRecord & { doctype: string })[] = records
      .filter((r) => r.mod_vis || r.doctype === "Advance Settlement")
      .map((r) => ({
        name: r.name,
        title: r.title,
        status: r.status,
        creation: r.date,
        modified: r.date,
        owner: r.owner,
        doctype: r.doctype,
      }));
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

  // --- Presentation-only derived data ---
  const displayName = basicFullName || fullName;
  const firstName = displayName.split(/[\s@]/)[0] || "there";
  const isOverview = !activeTab || activeTab === "overview";

  const statusCounts = React.useMemo(() => {
    let review = 0;
    let approved = 0;
    let attention = 0;
    trackingItems.forEach((i) => {
      const tone = getStatusTone(i.workflow_state);
      if (tone === "approved") approved++;
      else if (tone === "draft" || tone === "rejected") attention++;
      else review++;
    });
    return { review, approved, attention };
  }, [trackingItems]);

  const doctypeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    trackingItems.forEach((i) => {
      counts[i.doctype] = (counts[i.doctype] || 0) + 1;
    });
    return counts;
  }, [trackingItems]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedDoctype("All");
    setCurrentPage(1);
  };

  return (
    <div className="psd-root relative min-h-[100dvh] overflow-x-clip font-sans">
      <div className="relative w-full px-0 pb-4 pt-0">

        {/* Hero */}
        <header className="psd-hero relative mb-2 flex flex-col gap-2 overflow-hidden rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)]/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative z-10 flex min-w-0 items-center gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--psd-primary-light)] text-[var(--psd-primary)]">
              <Layers className="size-4" strokeWidth={1.6} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[17px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">
                Project Staff Dashboard
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                {(basic?.ps_designation || basic?.project_no) && (
                <>
                  {basic?.ps_designation && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--psd-primary-light)] px-2 py-0.5 font-medium text-[var(--psd-primary)]">
                      <Briefcase className="size-3" /> {basic.ps_designation}
                    </span>
                  )}
                  {basic?.project_no && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--psd-border)] px-2 py-0.5 font-medium text-[var(--psd-body)]">
                      <FolderKanban className="size-3" /> Project ID <span className="font-mono text-[var(--psd-heading)]">{basic.project_no}</span>
                    </span>
                  )}
                </>
                )}
              </div>
            </div>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-2">
        <nav aria-label="Dashboard sections" className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-[var(--psd-border)] bg-[var(--psd-surface)] p-1 shadow-sm">
          <button
            onClick={() => navigate("/project-staff-dashboard")}
            className={cn(
              "psd-focus inline-flex items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold transition-all duration-200",
              isOverview
                ? "bg-[var(--psd-primary)] text-white shadow-sm"
                : "text-[var(--psd-body)] hover:bg-[var(--psd-primary-light)] hover:text-[var(--psd-primary)]"
            )}
          >
            <LayoutGrid className="size-4" strokeWidth={1.75} />
            Overview
          </button>
          {/* New Application tab — commented out, keep code for later re-enable.
          <button
            onClick={() => navigate("/project-staff-dashboard?tab=quick-actions")}
            className={cn(
              "px-5 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2",
              activeTab === "quick-actions"
                ? "border-[#4A6CF7] text-[#4A6CF7] font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:border-zinc-300"
            )}
          >
            <Layers className="h-4 w-4" />
            New Application
          </button>
          */}
          <button
            onClick={() => navigate("/project-staff-dashboard?tab=tracking")}
            className={cn(
              "psd-focus inline-flex items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold transition-all duration-200",
              activeTab === "tracking"
                ? "bg-[var(--psd-primary)] text-white shadow-sm"
                : "text-[var(--psd-body)] hover:bg-[var(--psd-primary-light)] hover:text-[var(--psd-primary)]"
            )}
          >
            <ListTodo className="size-4" strokeWidth={1.75} />
            Track Applications
            {!trackingLoading && trackingItems.length > 0 && (
              <span className="rounded-full bg-black/10 px-1.5 dark:bg-white/15 py-0.5 text-[10px] tabular-nums">
                {trackingItems.length}
              </span>
            )}
          </button>
        </nav>
            <HeroClock />
          </div>
        </header>

        {/* Greeting (kept out of the header card) */}
        <div className="mb-3 px-0.5">
          <h2 className="text-[15px] font-semibold text-[var(--psd-heading)]">
            {getGreeting()}, {displayName || firstName}!
          </h2>
          <p className="text-xs text-[var(--psd-body)]">
            {isOverview ? "Here's a quick look at your applications and profile." : "Track the status of every application you've submitted."}
          </p>
        </div>


        {/* Tab Content: Overview */}
        {isOverview && (
          <div className="mb-2 space-y-3">
            {/* Action Required Alert for Returned ID Card Request */}
            {returnedIdCardAlert && (
              <AlertBanner
                tone="amber"
                icon={AlertCircle}
                urgent
                title="Action required: HR returned your ID card request"
                actionLabel="Edit & resubmit"
                onAction={() => navigate(`/id-card-request?edit=${returnedIdCardAlert.name}`)}
              >
                <span className="text-zinc-500 dark:text-zinc-500">HR comment</span>
                <span className="mt-1 block rounded-xl bg-amber-50/80 px-3 py-2 text-[13px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                  &ldquo;{returnedIdCardAlert.remarks || returnedIdCardAlert.hr_comments}&rdquo;
                </span>
              </AlertBanner>
            )}

            {/* HR Verified Alert Banner */}
            {activeIdCardAlert?.type === "verified" && (
              <AlertBanner
                tone="emerald"
                icon={CheckCircle2}
                title="HR verified your ID card request"
                actionLabel="View status"
                onAction={() => navigate(`/id-card-request?edit=${activeIdCardAlert.doc.name}`)}
              >
                Your ID card request has been verified by HR.
              </AlertBanner>
            )}

            {/* ID Card Generated Alert Banner */}
            {activeIdCardAlert?.type === "generated" && (
              <AlertBanner
                tone="sky"
                icon={IdCard}
                title="Your ID card is ready"
                actionLabel="View status"
                onAction={() => navigate(`/id-card-request?edit=${activeIdCardAlert.doc.name}`)}
              >
                Your ID card has been generated. Please collect it from the R&amp;D office.
              </AlertBanner>
            )}

            {/* KPI summary */}
            <section
              aria-label="Application summary"
              className={cn(REVEAL, "grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3")}
            >
              <KpiCard
                title="Total Applications"
                value={trackingItems.length}
                description="Across all application types"
                icon={Files}
                tone="violet"
                loading={trackingLoading}
                error={trackingError}
              />
              <KpiCard
                title="In Review"
                value={statusCounts.review}
                description="Waiting for a decision"
                icon={Hourglass}
                tone="amber"
                loading={trackingLoading}
                error={trackingError}
              />
              <KpiCard
                title="Approved"
                value={statusCounts.approved}
                description="Cleared and completed"
                icon={CircleCheck}
                tone="emerald"
                loading={trackingLoading}
                error={trackingError}
              />
              <KpiCard
                title="Drafts / Returned"
                value={statusCounts.attention}
                description="Needs your attention"
                icon={FileX}
                tone="coral"
                loading={trackingLoading}
                error={trackingError}
              />
            </section>

            <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              {/* Recent Submissions */}
              <section className={cn(SURFACE, "flex min-h-0 flex-col overflow-hidden")}>
                <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--psd-primary-light)] text-[var(--psd-primary)]">
                      <ClipboardCheck className="size-4" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-semibold tracking-tight text-[var(--psd-heading)]">Recent Submissions</h2>
                      <p className="mt-0.5 text-xs text-[var(--psd-body)]">Your latest application activity and updates.</p>
                    </div>
                  </div>
                  {trackingItems.length > 0 && (
                    <button
                      onClick={() => navigate("/project-staff-dashboard?tab=tracking")}
                      className="psd-focus group inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--psd-primary)] transition-colors hover:bg-[var(--psd-primary-light)] active:scale-[0.98]"
                    >
                      View all
                      <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}
                </div>

                {trackingLoading ? (
                  <div className="divide-y divide-[var(--psd-border)] border-t border-[var(--psd-border)]">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <Skeleton className="size-8 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3.5 w-40" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : trackingError && trackingItems.length === 0 ? (
                  <div role="alert" className="flex flex-col items-center border-t border-[var(--psd-border)] px-6 py-8 text-center">
                    <span className="grid size-12 place-items-center rounded-2xl bg-[var(--psd-returned-bg)] text-[var(--psd-returned)]">
                      <AlertCircle className="size-6" strokeWidth={1.6} />
                    </span>
                    <p className="mt-4 text-[15px] font-semibold text-[var(--psd-heading)]">Couldn't load your submissions</p>
                    <p className="mt-1 max-w-sm text-[13px] text-[var(--psd-body)]">Something went wrong while fetching your applications. Please refresh the page and try again.</p>
                  </div>
                ) : trackingItems.length === 0 ? (
                  <div className="flex flex-col items-center border-t border-[var(--psd-border)] px-6 py-8 text-center">
                    <span className="relative grid size-12 place-items-center rounded-2xl bg-[var(--psd-primary-light)] text-[var(--psd-primary)]">
                      <FileText className="size-5" strokeWidth={1.5} />
                      <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border-2 border-[var(--psd-surface)] bg-[var(--psd-accent)] text-white">
                        <Plus className="size-3.5" strokeWidth={3} />
                      </span>
                    </span>
                    <p className="mt-3 text-[15px] font-semibold text-[var(--psd-heading)]">No submissions yet</p>
                    <p className="mb-3 mt-1 max-w-sm text-xs leading-relaxed text-[var(--psd-body)]">
                      Applications you submit will show up here with their latest status and updates.
                    </p>
                    <NewApplicationMenu onNavigate={(path) => navigate(path)} />
                  </div>
                ) : (
                  <div className="min-h-0 flex-1 divide-y divide-[var(--psd-border)] overflow-y-auto border-t border-[var(--psd-border)] lg:max-h-[420px]">
                    {trackingItems.slice(0, 5).map((item, i) => {
                      const Icon = DOCTYPE_ICONS[item.doctype] || FileText;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.route)}
                          style={{ animationDelay: `${i * 60}ms` }}
                          className={cn(
                            REVEAL,
                            "group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--psd-primary-light)]/50 focus-visible:bg-[var(--psd-primary-light)]/50 focus-visible:outline-none"
                          )}
                        >
                          <span className="grid size-8 place-items-center rounded-lg bg-[var(--psd-primary-light)] text-[var(--psd-primary)] transition-transform duration-200 group-hover:scale-105">
                            <Icon className="size-4" strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-semibold text-[var(--psd-heading)]">{item.doctype}</span>
                            <span className="block truncate text-[11px] text-[var(--psd-muted)]">
                              <span className="font-mono">{item.id}</span>
                              <span className="mx-1.5">·</span>
                              Submitted {formatDate(item.creation)}
                            </span>
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="flex flex-col items-end gap-1">
                              <StatusPill status={item.workflow_state} />
                              <span className="text-[11px] text-[var(--psd-muted)]">{formatRelativeTime(item.modified)}</span>
                            </span>
                            <span className="hidden items-center gap-0.5 text-xs font-semibold text-[var(--psd-primary)] sm:inline-flex">
                              View <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Profile */}
              <aside className={cn(SURFACE, "self-start overflow-hidden")}>
                {showBasicSkeleton ? (
                  <div className="space-y-4 p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-11 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-14 w-full" />
                    {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : !basic ? (
                  <div className="p-4">
                    <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--psd-border)] px-4 py-8 text-center">
                      <UserIcon className="size-6 text-[var(--psd-muted)]" strokeWidth={1.5} />
                      <p className="mt-3 text-sm font-semibold text-[var(--psd-heading)]">
                        {basicError ? "Couldn't load your profile" : "No record linked"}
                      </p>
                      <p className="mt-1 text-[13px] text-[var(--psd-body)]">
                        {basicError
                          ? "The profile request failed. Check your connection and sign-in, then refresh."
                          : "No project staff record is linked to your account."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Identity */}
                    <div className="relative border-b border-[var(--psd-border)] bg-gradient-to-br from-[var(--psd-primary-light)] via-transparent to-[#FFF3EA] px-4 pb-2.5 pt-3 dark:to-transparent">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--psd-primary)] text-[15px] font-bold text-white shadow-sm ring-4 ring-[var(--psd-surface)]">
                          {initialsOf(basicFullName || displayName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-[15px] font-bold leading-tight text-[var(--psd-heading)]">{basicFullName || displayName || "—"}</h2>
                          <p className="mt-0.5 truncate text-xs text-[var(--psd-body)]">{basic.ps_designation || "Project staff"}</p>
                        </div>
                        {basic.ps_emp_id && (
                          <span className="shrink-0 rounded-md bg-[var(--psd-surface)] px-2 py-1 text-center ring-1 ring-[var(--psd-border)]">
                            <span className="block text-[9px] font-semibold uppercase tracking-wider text-[var(--psd-muted)]">Employee ID</span>
                            <span className="block font-mono text-[11px] font-bold tabular-nums text-[var(--psd-primary)]">{basic.ps_emp_id}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="px-4 pb-3 pt-2.5">
                      {/* Engagement progress */}
                      <div className="rounded-lg bg-[#FFF8F3] px-3 py-2 ring-1 ring-[#FFE3CF] dark:bg-zinc-800/50 dark:ring-zinc-700">
                        <TermProgress start={basic.ps_joining_date} end={basic.ps_term_completion_date} />
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-x-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                          <ProfileField icon={Mail} label="ERP Mail">
                            <span className="break-all">{basic.erp_mail || "—"}</span>
                          </ProfileField>
                        </div>
                        <ProfileField icon={Phone} label="Phone" mono>{basic.ps_phone_number || "—"}</ProfileField>
                        <ProfileField icon={Building2} label="Department">
                          {basic.ps_department_name || basic.ps_department ? (
                            <DepartmentName name={basic.ps_department_name || basic.ps_department || ""} />
                          ) : "—"}
                        </ProfileField>
                        <ProfileField icon={Briefcase} label="Designation">{basic.ps_designation || "—"}</ProfileField>
                        <ProfileField icon={FolderKanban} label="Project Number" mono>{basic.project_no || "—"}</ProfileField>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <DateTile icon={Cake} label="Date of Birth" value={basic.ps_date_of_birth} />
                        <DateTile icon={CalendarCheck} label="Joining" value={basic.ps_joining_date} />
                        <DateTile icon={CalendarClock} label="Term ends" value={basic.ps_term_completion_date} />
                      </div>
                    </div>
                  </>
                )}
              </aside>
            </div>
          </div>
        )}

          {/* Tab Content: New Application — commented out (disabled via `false &&`
              rather than a block comment, since this JSX contains nested
              {/* ... *\/} comments that would otherwise prematurely close a
              wrapping comment). Remove `false && ` to re-enable. */}
          {false && activeTab === "quick-actions" && (
            <section className="mb-6 space-y-6">
              {/* Intro + Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                <div>
                  <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm">
                    Start a new application
                  </h2>
                  <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                    {totalActionsCount} application types across {applicationGroups.length} categories
                  </p>
                </div>
                <div className="relative w-full md:max-w-xs shrink-0">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="text"
                    placeholder="Search application types..."
                    value={actionSearch}
                    onChange={(e) => setActionSearch(e.target.value)}
                    className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-sm h-9 rounded-lg"
                  />
                </div>
              </div>

              {filteredApplicationGroups.length === 0 ? (
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm py-12 text-center text-[#A1A1AA]">
                  <Layers className="h-10 w-10 mx-auto mb-3 text-[#D4D4D8]" />
                  <p className="text-sm font-semibold">No matching application types</p>
                  <p className="text-xs mt-1">Try a different search term.</p>
                </div>
              ) : (
                filteredApplicationGroups.map((group) => (
                  <div key={group.group}>
                    {/* Section header */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className={cn("size-6 flex items-center justify-center rounded-md shrink-0", group.color.bg)}>
                        <group.icon className={cn("size-3.5", group.color.icon)} />
                      </div>
                      <span className="text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.1em] whitespace-nowrap">
                        {group.group}
                      </span>
                      <span className="text-[10px] font-semibold text-[#A1A1AA] bg-zinc-100 dark:bg-zinc-700/50 rounded-full px-1.5 py-0.5">
                        {group.items.length}
                      </span>
                      <div className="flex-1 h-px bg-[#E4E4E7] dark:bg-[#3F3F46]" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {group.items.map((item) => (
                        <div
                          key={item.label}
                          className="group relative bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#4A6CF7]/30 transition-all cursor-pointer"
                          onClick={() => {
                            const projectNo = basic?.project_no;
                            const params = new URLSearchParams();
                            if (projectNo) params.set("project", projectNo);
                            if (item.path === "/direct-purchase") params.set("from_project_staff", "1");
                            const qs = params.toString() ? `?${params.toString()}` : "";
                            navigate(`${item.path}${qs}`);
                          }}
                        >
                          <button className="w-full text-left p-5 flex items-start gap-4 h-full">
                            <div className={cn(
                              "p-2.5 rounded-lg transition-colors shrink-0 group-hover:bg-[#4A6CF7]/10",
                              group.color.bg
                            )}>
                              <item.icon className={cn("h-5 w-5 group-hover:text-[#4A6CF7]", group.color.icon)} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-1">
                                {item.label}
                              </h3>
                              <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                                {item.description}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 ml-auto mt-1 text-[#D4D4D8] group-hover:text-[#4A6CF7] group-hover:translate-x-1 transition-all shrink-0" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </section>
          )}

        {/* Tab Content: Track Applications */}
        {activeTab === "tracking" && (
          <section className="mb-2 space-y-3">
            {/* Search & Filter */}
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--psd-muted)]" />
                <input
                  type="text"
                  placeholder="Search by type, ID or status"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 w-full rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] pl-9 pr-9 text-[13px] text-[var(--psd-heading)] outline-none transition-shadow placeholder:text-[var(--psd-muted)] focus:border-[var(--psd-primary)] focus:ring-2 focus:ring-[var(--psd-primary)]/15"
                />
                {searchTerm && (
                  <button
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-[var(--psd-muted)] transition-colors hover:bg-[var(--psd-primary-light)] hover:text-[var(--psd-primary)]"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs font-medium tabular-nums text-[var(--psd-body)]">
                {filteredItems.length} of {trackingItems.length} applications
              </p>
            </div>

            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
              {uniqueDoctypes.map((dt) => {
                const active = selectedDoctype === dt;
                const count = dt === "All" ? trackingItems.length : doctypeCounts[dt] || 0;
                return (
                  <button
                    key={dt}
                    onClick={() => {
                      setSelectedDoctype(dt);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "psd-focus inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-[0.97]",
                      active
                        ? "border-[var(--psd-primary)] bg-[var(--psd-primary)] text-white shadow-sm"
                        : "border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] hover:border-[var(--psd-primary)]/50 hover:text-[var(--psd-primary)]"
                    )}
                  >
                    {dt}
                    <span className={cn("text-[10px] tabular-nums", active ? "opacity-80" : "text-[var(--psd-muted)]")}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Applications Table */}
            <div className={cn(SURFACE, "overflow-hidden")}>
              {trackingLoading ? (
                <div className="divide-y divide-[var(--psd-border)]">
                  <div className="h-9 bg-[var(--psd-bg)]" />
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-40" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="hidden h-3.5 w-28 md:block" />
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <div className="grid size-12 place-items-center rounded-xl bg-[var(--psd-primary-light)] text-[var(--psd-primary)]">
                    <Search className="size-5" strokeWidth={1.5} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[var(--psd-heading)]">No applications match</p>
                  <p className="mt-1 max-w-xs text-[13px] text-[var(--psd-body)]">
                    {trackingItems.length === 0
                      ? "Applications you submit will appear here."
                      : "Try a different search term or clear the active filters."}
                  </p>
                  {trackingItems.length > 0 && (
                    <button
                      onClick={clearFilters}
                      className="psd-focus mt-3 rounded-lg bg-[var(--psd-primary)] px-3.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[var(--psd-primary-hover)] active:scale-[0.98]"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader className="bg-[var(--psd-bg)]">
                      <TableRow className="border-[var(--psd-border)] hover:bg-transparent">
                        <TableHead className="h-9 px-4 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--psd-body)]">Application</TableHead>
                        <TableHead className="h-9 px-4 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--psd-body)]">Status</TableHead>
                        <TableHead className="hidden h-9 px-4 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--psd-body)] md:table-cell">Created</TableHead>
                        <TableHead className="hidden h-9 px-4 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--psd-body)] sm:table-cell">Modified</TableHead>
                        <TableHead className="h-9 w-10 px-4" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((item, i) => {
                        const Icon = DOCTYPE_ICONS[item.doctype] || FileText;
                        return (
                          <TableRow
                            key={item.id}
                            tabIndex={0}
                            onClick={() => navigate(item.route)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") navigate(item.route);
                            }}
                            style={{ animationDelay: `${i * 30}ms` }}
                            className={cn(
                              REVEAL,
                              "group cursor-pointer border-[var(--psd-border)] transition-colors hover:bg-[var(--psd-primary-light)]/50 focus-visible:bg-[var(--psd-primary-light)]/50 focus-visible:outline-none"
                            )}
                          >
                            <TableCell className="px-4 py-2.5">
                              <div className="flex items-center gap-3">
                                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--psd-primary-light)] text-[var(--psd-primary)] transition-transform duration-200 group-hover:scale-105">
                                  <Icon className="size-4" strokeWidth={1.75} />
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-[13px] font-semibold text-[var(--psd-heading)]">{item.doctype}</p>
                                  <p className="truncate font-mono text-[11px] text-[var(--psd-muted)]">{item.id}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-2.5">
                              <StatusPill status={item.workflow_state} />
                            </TableCell>
                            <TableCell className="hidden px-4 py-2.5 text-xs tabular-nums text-[var(--psd-body)] md:table-cell">
                              {new Date(item.creation).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </TableCell>
                            <TableCell className="hidden px-4 py-2.5 text-xs text-[var(--psd-body)] sm:table-cell">
                              {formatRelativeTime(item.modified)}
                            </TableCell>
                            <TableCell className="px-4 py-2.5 text-right">
                              <ChevronRight className="ml-auto size-4 text-[var(--psd-muted)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--psd-primary)]" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-col gap-3 border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-medium tabular-nums text-[var(--psd-body)]">
                        {String((currentPage - 1) * itemsPerPage + 1).padStart(2, "0")}
                        &ndash;
                        {String(Math.min(currentPage * itemsPerPage, filteredItems.length)).padStart(2, "0")}
                        {" of "}
                        {filteredItems.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="mr-1 text-xs font-medium tabular-nums text-[var(--psd-body)]">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((prev) => prev - 1)}
                          aria-label="Previous page"
                          className="psd-focus inline-flex items-center gap-1 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--psd-body)] transition-all hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                        >
                          <ChevronLeft className="size-3.5" />
                          Previous
                        </button>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((prev) => prev + 1)}
                          aria-label="Next page"
                          className="psd-focus inline-flex items-center gap-1 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--psd-body)] transition-all hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                        >
                          Next
                          <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}


          {/* Quick Action Cards */}
          {false && (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
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
          )}

          {/* Stats Row */}
          {false && (
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
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
          )}

          {/* Two-Column: Recent Pending + Recently Processed */}
          {false && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
              {/* Recent Pending Approvals */}
              <div className="bg-white dark:bg-[#27272A] rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
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
              <div className="bg-white dark:bg-[#27272A] rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
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
          )}

        {/* Module Breakdown */}
        {moduleBreakdown.length > 0 && (
          <section className={cn(SURFACE, "mb-4 p-4")}>
            <div className="mb-3">
              <h3 className="text-[15px] font-semibold tracking-tight text-[var(--psd-heading)]">Pending by module</h3>
              <p className="mt-0.5 text-xs text-[var(--psd-body)]">Where your open tasks are concentrated</p>
            </div>
            <div className="divide-y divide-[var(--psd-border)]">
              {moduleBreakdown.map(({ doctype, count }) => (
                <div key={doctype} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2rem] items-center gap-4 py-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_2rem]">
                  <span className="truncate text-[13px] text-[var(--psd-body)]">{doctype}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--psd-primary-light)]">
                    <div
                      className="h-full origin-left rounded-full bg-[var(--psd-primary)] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{ transform: `scaleX(${count / maxModuleCount})` }}
                    />
                  </div>
                  <span className="text-right text-[13px] font-semibold tabular-nums text-[var(--psd-heading)]">{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-4 flex items-center gap-2 border-t border-[var(--psd-border)] pt-3 text-xs text-[var(--psd-body)]">
          <Mail className="size-3.5" strokeWidth={1.75} />
          <p>
            Questions? Write to{" "}
            <a href="mailto:ernd@iitg.ac.in" className="font-medium text-[var(--psd-primary)] underline decoration-[var(--psd-primary)]/30 underline-offset-4 transition-colors hover:decoration-[var(--psd-primary)]">
              ernd@iitg.ac.in
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
