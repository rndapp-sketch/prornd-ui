import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc, useFrappeGetCall, useFrappeGetDocList } from "frappe-react-sdk";
import { AnalyticsCard, CurrentTime } from "../../components/DashboardCards";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck, Briefcase, BarChart, Layers,
  AlertCircle, Zap, Activity, Clock,
  ArrowRight, ChevronRight, Mail, User as UserIcon, IdCard,
  Receipt, Wallet, RotateCcw, ShoppingCart, FileText, Search, ListTodo, CheckCircle2,
  Plane, CalendarDays, LogOut, LayoutGrid, ChevronLeft, Inbox, X
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

const TONE_STYLES: Record<StatusTone, { pill: string; dot: string }> = {
  pending: {
    pill: "bg-amber-50 text-amber-800 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
    dot: "bg-amber-500",
  },
  approved: {
    pill: "bg-emerald-50 text-emerald-800 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
  },
  draft: {
    pill: "bg-zinc-100 text-zinc-600 ring-zinc-500/15 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-600/40",
    dot: "bg-zinc-400",
  },
  rejected: {
    pill: "bg-rose-50 text-rose-800 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20",
    dot: "bg-rose-500",
  },
  progress: {
    pill: "bg-sky-50 text-sky-800 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
    dot: "bg-sky-500",
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

const getInitials = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "PS";

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
const SURFACE =
  "rounded-3xl border border-zinc-200/70 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04),0_18px_40px_-24px_rgba(24,24,27,0.12)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none";

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
        <span className="text-zinc-500 dark:text-zinc-400">Engagement term</span>
        <span
          className={cn(
            "font-mono tabular-nums",
            ended ? "text-rose-600 dark:text-rose-400" : closing ? "text-amber-700 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"
          )}
        >
          {ended ? "Term ended" : `${daysLeft} days left`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={cn(
            "h-full origin-left rounded-full transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
            ended ? "bg-rose-500" : closing ? "bg-amber-500" : "bg-emerald-600"
          )}
          style={{ transform: `scaleX(${ready ? ratio : 0})` }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
        <span>{formatDate(start)}</span>
        <span>{Math.round(ratio * 100)}%</span>
        <span>{formatDate(end)}</span>
      </div>
    </div>
  );
}

function ProfileRow({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <dt className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-right text-sm font-medium text-zinc-900 dark:text-zinc-100",
          mono && "font-mono text-[13px] tabular-nums"
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function StatCell({
  label,
  value,
  caption,
  dot,
  loading,
  className,
}: {
  label: string;
  value: number;
  caption: string;
  dot: string;
  loading: boolean;
  className?: string;
}) {
  return (
    <div className={cn("bg-white px-4 py-3.5 dark:bg-zinc-900", className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        <span className={cn("size-1.5 rounded-full", dot)} />
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-10" />
      ) : (
        <div className="mt-2 font-mono text-2xl font-medium leading-none tracking-tighter tabular-nums text-zinc-900 dark:text-zinc-50">
          {String(value).padStart(2, "0")}
        </div>
      )}
      <p className="mt-1.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">{caption}</p>
    </div>
  );
}
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

// --- Main Component ---
export function ProjectStaffDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "";
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", currentUser ? undefined : null);

  // Basic Details (joined via username = part of erp_mail before '@')
  const { data: basicResp, isLoading: basicLoading } = useFrappeGetCall<{
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
      ...pendingData.message.research,
      ...pendingData.message.consultancy,
      ...pendingData.message.others,
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
    <div className="relative min-h-[100dvh] overflow-x-clip bg-[#FAFAF9] font-sans text-zinc-900 dark:bg-[#18181B] dark:text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(48rem_22rem_at_8%_-8%,rgba(16,185,129,0.08),transparent_70%)] dark:bg-[radial-gradient(48rem_22rem_at_8%_-8%,rgba(16,185,129,0.10),transparent_70%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12">

        {/* Header */}
        <header className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-zinc-900 text-lg font-semibold tracking-tight text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] dark:bg-zinc-100 dark:text-zinc-900 md:size-16 md:text-xl">
              {getInitials(displayName)}
              <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-emerald-500 ring-[3px] ring-[#FAFAF9] dark:ring-[#18181B]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Project Staff Dashboard
              </p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-3xl">
                {getGreeting()}, {firstName}
              </h1>
              {(basic?.ps_designation || basic?.project_no) && (
                <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {basic?.ps_designation}
                  {basic?.ps_designation && basic?.project_no && <span className="mx-2 text-zinc-300 dark:text-zinc-600">/</span>}
                  {basic?.project_no && <span className="font-mono text-[13px]">{basic.project_no}</span>}
                </p>
              )}
            </div>
          </div>
          <CurrentTime />
        </header>

        {/* Internal Navigation Tabs */}
        <nav className="mb-8 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-zinc-200/60 p-1 dark:bg-zinc-800/80">
          <button
            onClick={() => navigate("/project-staff-dashboard")}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 active:scale-[0.98]",
              isOverview
                ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(24,24,27,0.08)] dark:bg-zinc-700 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
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
              "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 active:scale-[0.98]",
              activeTab === "tracking"
                ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(24,24,27,0.08)] dark:bg-zinc-700 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            <ListTodo className="size-4" strokeWidth={1.75} />
            Track Applications
            {!trackingLoading && trackingItems.length > 0 && (
              <span className="rounded-full bg-zinc-900/[0.07] px-1.5 py-0.5 font-mono text-[10px] tabular-nums dark:bg-white/10">
                {trackingItems.length}
              </span>
            )}
          </button>
        </nav>

        {/* Tab Content: Overview */}
        {isOverview && (
          <div className="mb-8 space-y-6">
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

            {/* Status strip: hairline-divided instead of boxed cards */}
            <section
              aria-label="Application summary"
              className={cn(
                SURFACE,
                REVEAL,
                "grid grid-cols-2 gap-px overflow-hidden !rounded-2xl bg-zinc-200/70 dark:bg-zinc-800 md:grid-cols-4"
              )}
            >
              <StatCell
                label="Total applications"
                value={trackingItems.length}
                caption={`Across ${uniqueDoctypes.length - 1} application ${uniqueDoctypes.length - 1 === 1 ? "type" : "types"}`}
                dot="bg-zinc-900 dark:bg-zinc-100"
                loading={trackingLoading}
              />
              <StatCell
                label="In review"
                value={statusCounts.review}
                caption="Waiting on a decision"
                dot="bg-amber-500"
                loading={trackingLoading}
              />
              <StatCell
                label="Approved"
                value={statusCounts.approved}
                caption="Cleared and completed"
                dot="bg-emerald-500"
                loading={trackingLoading}
              />
              <StatCell
                label="Drafts & returned"
                value={statusCounts.attention}
                caption="Need your input"
                dot="bg-rose-500"
                loading={trackingLoading}
              />
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-8">
              {/* Recent Submissions */}
              <section className={cn(SURFACE, "overflow-hidden")}>
                <div className="flex items-end justify-between gap-4 px-6 pb-4 pt-6">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                      Recent submissions
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Your latest activity across all applications</p>
                  </div>
                  {trackingItems.length > 0 && (
                    <button
                      onClick={() => navigate("/project-staff-dashboard?tab=tracking")}
                      className="group inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 active:scale-[0.98] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      View all
                      <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}
                </div>

                {trackingLoading ? (
                  <div className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-4 px-6 py-4">
                        <Skeleton className="size-10 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3.5 w-40" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : trackingItems.length === 0 ? (
                  <div className="flex flex-col items-center border-t border-zinc-100 px-6 py-16 text-center dark:border-zinc-800">
                    <div className="grid size-14 place-items-center rounded-2xl border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700">
                      <Inbox className="size-6" strokeWidth={1.5} />
                    </div>
                    <p className="mt-5 text-sm font-medium text-zinc-900 dark:text-zinc-100">Nothing submitted yet</p>
                    <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
                      Applications you submit will show up here with their live approval status.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                    {trackingItems.slice(0, 5).map((item, i) => {
                      const Icon = DOCTYPE_ICONS[item.doctype] || FileText;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.route)}
                          style={{ animationDelay: `${i * 60}ms` }}
                          className={cn(
                            REVEAL,
                            "group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none dark:hover:bg-zinc-800/50 dark:focus-visible:bg-zinc-800/50"
                          )}
                        >
                          <span className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-700 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-emerald-500/10 dark:group-hover:text-emerald-300">
                            <Icon className="size-[18px]" strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.doctype}</span>
                            <span className="mt-0.5 block truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                              {item.id}
                              <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">/</span>
                              <span className="font-sans">Created {formatDate(item.creation)}</span>
                            </span>
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="flex flex-col items-end gap-1.5">
                              <StatusPill status={item.workflow_state} />
                              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{formatRelativeTime(item.modified)}</span>
                            </span>
                            <ChevronRight className="size-4 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:text-zinc-600 dark:group-hover:text-zinc-300" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Basic Details */}
              <aside className={cn(SURFACE, "self-start p-6")}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Profile</h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Your project staff record</p>
                  </div>
                  {basic?.ps_emp_id && (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-mono text-[11px] tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {basic.ps_emp_id}
                    </span>
                  )}
                </div>

                {showBasicSkeleton ? (
                  <div className="mt-6 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex justify-between gap-6">
                        <Skeleton className="h-3.5 w-20" />
                        <Skeleton className="h-3.5 w-32" />
                      </div>
                    ))}
                  </div>
                ) : !basic ? (
                  <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center dark:border-zinc-700">
                    <UserIcon className="size-6 text-zinc-400" strokeWidth={1.5} />
                    <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">No record linked</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      No project staff record is linked to your account.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-6">
                      <TermProgress start={basic.ps_joining_date} end={basic.ps_term_completion_date} />
                    </div>
                    <dl className="mt-5 divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                      <ProfileRow label="Name">{basicFullName || "—"}</ProfileRow>
                      <ProfileRow label="Employee ID" mono>{basic.ps_emp_id || "—"}</ProfileRow>
                      <ProfileRow label="ERP mail">
                        <span className="break-all">{basic.erp_mail || "—"}</span>
                      </ProfileRow>
                      <ProfileRow label="Department">
                        {basic.ps_department_name || basic.ps_department ? (
                          <DepartmentName name={basic.ps_department_name || basic.ps_department || ""} />
                        ) : "—"}
                      </ProfileRow>
                      <ProfileRow label="Designation">{basic.ps_designation || "—"}</ProfileRow>
                      <ProfileRow label="Project no" mono>{basic.project_no || "—"}</ProfileRow>
                      <ProfileRow label="Phone" mono>{basic.ps_phone_number || "—"}</ProfileRow>
                      <ProfileRow label="Date of birth" mono>{basic.ps_date_of_birth || "—"}</ProfileRow>
                      <ProfileRow label="Joining date" mono>{basic.ps_joining_date || "—"}</ProfileRow>
                      <ProfileRow label="Term completion" mono>{basic.ps_term_completion_date || "—"}</ProfileRow>
                    </dl>
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
          <section className="mb-8 space-y-5">
            {/* Search & Filter */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by type, ID or status"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 w-full rounded-full border border-zinc-200 bg-white pl-11 pr-10 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-emerald-600/50 focus:ring-4 focus:ring-emerald-600/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-emerald-500/15"
                />
                {searchTerm && (
                  <button
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {filteredItems.length} of {trackingItems.length} applications
              </p>
            </div>

            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
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
                      "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 active:scale-[0.97]",
                      active
                        ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                    )}
                  >
                    {dt}
                    <span className={cn("font-mono text-[10px] tabular-nums", active ? "opacity-60" : "text-zinc-400 dark:text-zinc-500")}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Applications Table */}
            <div className={cn(SURFACE, "overflow-hidden")}>
              {trackingLoading ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <div className="h-11 bg-zinc-50/70 dark:bg-zinc-900" />
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-6 px-5 py-4">
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
                <div className="flex flex-col items-center px-6 py-20 text-center">
                  <div className="grid size-14 place-items-center rounded-2xl border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700">
                    <Search className="size-6" strokeWidth={1.5} />
                  </div>
                  <p className="mt-5 text-sm font-medium text-zinc-900 dark:text-zinc-100">No applications match</p>
                  <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
                    {trackingItems.length === 0
                      ? "Applications you submit will appear here."
                      : "Try a different search term or clear the active filters."}
                  </p>
                  {trackingItems.length > 0 && (
                    <button
                      onClick={clearFilters}
                      className="mt-5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-50 transition-all hover:bg-zinc-700 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader className="bg-zinc-50/70 dark:bg-zinc-900">
                      <TableRow className="border-zinc-100 hover:bg-transparent dark:border-zinc-800 dark:hover:bg-transparent">
                        <TableHead className="h-11 px-5 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">Application</TableHead>
                        <TableHead className="h-11 px-5 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">Status</TableHead>
                        <TableHead className="hidden h-11 px-5 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400 md:table-cell">Created</TableHead>
                        <TableHead className="hidden h-11 px-5 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400 sm:table-cell">Modified</TableHead>
                        <TableHead className="h-11 w-12 px-5" />
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
                              "group cursor-pointer border-zinc-100 transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none dark:border-zinc-800 dark:hover:bg-zinc-800/50 dark:focus-visible:bg-zinc-800/50"
                            )}
                          >
                            <TableCell className="px-5 py-4">
                              <div className="flex items-center gap-3.5">
                                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-700 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-emerald-500/10 dark:group-hover:text-emerald-300">
                                  <Icon className="size-4" strokeWidth={1.75} />
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.doctype}</p>
                                  <p className="mt-0.5 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{item.id}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-4">
                              <StatusPill status={item.workflow_state} />
                            </TableCell>
                            <TableCell className="hidden px-5 py-4 font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400 md:table-cell">
                              {new Date(item.creation).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </TableCell>
                            <TableCell className="hidden px-5 py-4 text-xs text-zinc-500 dark:text-zinc-400 sm:table-cell">
                              {formatRelativeTime(item.modified)}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-right">
                              <ChevronRight className="ml-auto size-4 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:text-zinc-600 dark:group-hover:text-zinc-300" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/50 px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                        {String((currentPage - 1) * itemsPerPage + 1).padStart(2, "0")}
                        &ndash;
                        {String(Math.min(currentPage * itemsPerPage, filteredItems.length)).padStart(2, "0")}
                        {" of "}
                        {filteredItems.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="mr-1 font-mono text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((prev) => prev - 1)}
                          aria-label="Previous page"
                          className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-all hover:border-zinc-300 hover:text-zinc-900 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          <ChevronLeft className="size-3.5" />
                          Previous
                        </button>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((prev) => prev + 1)}
                          aria-label="Next page"
                          className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-all hover:border-zinc-300 hover:text-zinc-900 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
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
          )}

          {/* Stats Row */}
          {false && (
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
          )}

          {/* Two-Column: Recent Pending + Recently Processed */}
          {false && (
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
          )}

        {/* Module Breakdown */}
        {moduleBreakdown.length > 0 && (
          <section className={cn(SURFACE, "mb-8 p-6")}>
            <div className="mb-5">
              <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Pending by module</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Where your open tasks are concentrated</p>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {moduleBreakdown.map(({ doctype, count }) => (
                <div key={doctype} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2rem] items-center gap-4 py-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_2rem]">
                  <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{doctype}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full origin-left rounded-full bg-emerald-600 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{ transform: `scaleX(${count / maxModuleCount})` }}
                    />
                  </div>
                  <span className="text-right font-mono text-sm tabular-nums text-zinc-900 dark:text-zinc-100">{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-10 flex items-center gap-2 border-t border-zinc-200/70 pt-6 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <Mail className="size-3.5" strokeWidth={1.75} />
          <p>
            Questions? Write to{" "}
            <a href="mailto:ernd@iitg.ac.in" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition-colors hover:decoration-emerald-600 dark:text-zinc-100 dark:decoration-zinc-600">
              ernd@iitg.ac.in
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
