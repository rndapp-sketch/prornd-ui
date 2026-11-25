

// -=-=-=-=-=-=-=-=-=-==-=-=-=-

import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  useFrappeAuth,
  useFrappeGetDoc,
  useFrappeGetCall,
} from "frappe-react-sdk";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";
import PendingLoansAlert from "@/components/dashboard/PendingLoansAlert";
import ProjectStaffApprovalsAlert from "@/components/dashboard/ProjectStaffApprovalsAlert";
import {
  PlusCircle,
  MessageSquare,
  RotateCcw,
  LayoutGrid,
  FileText,
  BarChart,
  PieChart,
  TrendingUp,
  AlertCircle,
  Megaphone,
  LifeBuoy,
  Mail,
  Clock,
  UsersIcon,
  SearchIcon,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Wallet,
  MapPin,
  Building2,
  Save,
  Trash2,
  BarChart3,
  ShoppingCart,
  Receipt,
  SendHorizontal,
  Home,
  Users,
  Download,
  History,
  Phone,
  Check,
  Shield,
  Calculator,
  Info,
  Award,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Search,
  Printer,
  PlayCircle,
  MonitorPlay,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KPI_TONES, type KpiTone } from "@/components/dashboard/KpiCard";
import { useMyRecentApplications } from "@/hooks/useMyRecentApplications";
import { usePiLedgerSummary } from "@/hooks/usePiLedgerSummary";
import { HelpModule } from "@/components/HelpModule";
import "@/pages/dashboards/projectStaffDashboard.css";

interface ProjectOverview {
  total_projects: number;
  draft_projects: number;
  completion_rate: number;
  pending_review: number;
  active_staff: number;
}

interface FinancialSummary {
  total_allocation: number;
  utilized: number;
  available: number;
  pending_requests: number;
  financial_year: string;
  utilization_rate: number;
}

interface RecentUpdate {
  title: string;
  meta: string;
  type: string;
}

interface PiDashboardData {
  project_overview: ProjectOverview;
  financial_summary: FinancialSummary;
  recent_updates: RecentUpdate[];
}

function formatCrore(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

/**
 * --- Reusable UI Components (Atomic Design) ---
 */

const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={cn("psd-card overflow-hidden transition-all", className)}>{children}</div>;

const SectionDivider = ({ title }: { title: string }) => (
  <div className="mb-2 mt-1 flex items-center gap-2.5">
    <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--psd-body)]">
      {title}
    </span>
    <div className="h-px flex-1 bg-[var(--psd-border)]" />
  </div>
);

// Per-section colour from the KPI palette: icon tile (light bg, strong icon) and a soft header wash.
const toneTile = (tone: KpiTone): React.CSSProperties => ({
  background: `color-mix(in srgb, ${KPI_TONES[tone].primary} 16%, var(--psd-surface))`,
  color: KPI_TONES[tone].primary,
});
const toneWash = (tone: KpiTone): React.CSSProperties => ({
  backgroundImage: `linear-gradient(to right, color-mix(in srgb, ${KPI_TONES[tone].primary} 14%, var(--psd-surface)), transparent 70%)`,
});

const PanelHeader = ({
  icon,
  title,
  action,
  tone = "violet",
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  tone?: KpiTone;
}) => (
  <div className="flex items-center justify-between border-b border-[var(--psd-border)] px-4 py-2.5" style={toneWash(tone)}>
    <div className="flex items-center gap-2.5 text-[14px] font-semibold text-[var(--psd-heading)]">
      <div className="grid size-7 place-items-center rounded-lg" style={toneTile(tone)}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 15 })}
      </div>
      {title}
    </div>
    {action}
  </div>
);

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Types `text` out one letter at a time (smooth, ~30ms/letter). Instant when reduced motion is on. */
function useTypewriter(text: string, start: boolean, msPerChar = 32) {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (!start) return;
    if (prefersReducedMotion()) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let i = 0;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Catch up by elapsed time so the speed stays even on slow frames
      const steps = Math.floor((now - last) / msPerChar);
      if (steps > 0) {
        i = Math.min(text.length, i + steps);
        last += steps * msPerChar;
        setCount(i);
      }
      if (i < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, start, msPerChar]);
  return { typed: text.slice(0, count), rest: text.slice(count), done: start && count >= text.length };
}

/**
 * Counts a formatted figure up from zero ("6", "68%", "₹4.2Cr", "₹11L"), keeping its prefix, suffix and
 * decimals. Anything that isn't a number is shown as is.
 */
function CountUp({ value, duration = 900 }: { value: string; duration?: number }) {
  const m = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/.exec(value);
  const target = m ? parseFloat(m[2].replace(/,/g, "")) : NaN;
  const decimals = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const grouped = !!m && m[2].includes(",");
  const [shown, setShown] = React.useState<number>(prefersReducedMotion() ? target : 0);

  React.useEffect(() => {
    if (!m || isNaN(target)) return;
    if (prefersReducedMotion()) {
      setShown(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setShown(target * (1 - Math.pow(1 - p, 3))); // easeOutCubic
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  if (!m || isNaN(target)) return <>{value}</>;
  const text = shown.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  });
  return (
    <>
      {m[1]}
      {text}
      {m[3]}
    </>
  );
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const HeroClock = () => {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="relative z-10 hidden shrink-0 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)]/80 px-2.5 py-1 text-right backdrop-blur-sm sm:block">
      <div className="text-[13px] font-semibold leading-none tabular-nums text-[var(--psd-heading)]">
        {time.toLocaleTimeString()}
      </div>
      <div className="mt-0.5 text-[10px] text-[var(--psd-body)]">
        {time.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
      </div>
    </div>
  );
};

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  tone: KpiTone;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, title, description, onClick, tone }) => {
  const c = KPI_TONES[tone].primary;
  return (
    <button
      onClick={onClick}
      // Deeper tint of the card's own colour (mixed with the surface, so it also works in dark mode)
      style={{
        backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${c} 16%, var(--psd-surface)), color-mix(in srgb, ${c} 32%, var(--psd-surface)))`,
        borderColor: `color-mix(in srgb, ${c} 45%, transparent)`,
      }}
      className="psd-card psd-focus group flex w-full items-center gap-3 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--psd-surface)] shadow-sm transition-transform duration-200 group-hover:scale-110"
        style={{ color: c }}
      >
        {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold text-[var(--psd-heading)]">{title}</span>
        <span className="block text-[12px] font-medium leading-snug text-[var(--psd-heading)]/75">{description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: c }} />
    </button>
  );
};

// Slim stat: small coloured icon, label and value on one compact row.
const MiniStat = ({
  label,
  value,
  hint,
  icon,
  tone,
  loading,
  error,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone: KpiTone;
  loading?: boolean;
  error?: boolean;
}) => {
  const t = KPI_TONES[tone];
  return (
    <div title={hint} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5">
      <span
        className="grid size-6 shrink-0 place-items-center rounded-md"
        style={{ background: `color-mix(in srgb, ${t.primary} 16%, var(--psd-surface))`, color: t.primary }}
      >
        {React.cloneElement(icon as React.ReactElement<any>, { size: 13 })}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[10.5px] font-medium text-[var(--psd-body)]">{label}</span>
        {loading ? (
          <span className="mt-0.5 block h-3.5 w-9 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-700/60" />
        ) : (
          <span className="block text-[15px] font-bold tabular-nums text-[var(--psd-heading)]">{error ? "—" : <CountUp value={value} />}</span>
        )}
      </span>
    </div>
  );
};

// A slim card: title and "View Detail" on one line, then a single row of stats.
const StatStrip = ({
  icon,
  title,
  action,
  columns = 4,
  tone = "violet",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  columns?: 3 | 4;
  tone?: KpiTone;
  children: React.ReactNode;
}) => (
  <div className="psd-card overflow-hidden px-2.5 pb-2" style={{ boxShadow: `inset 0 3px 0 ${KPI_TONES[tone].primary}` }}>
    <div className="-mx-2.5 mb-1 flex items-center justify-between px-3.5 pb-1 pt-2.5" style={toneWash(tone)}>
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--psd-heading)]">
        <span className="grid size-5 place-items-center rounded-md" style={toneTile(tone)}>
          {React.cloneElement(icon as React.ReactElement<any>, { size: 12 })}
        </span>
        {title}
      </div>
      {action}
    </div>
    <div className={cn("grid grid-cols-2 gap-x-1", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4")}>{children}</div>
  </div>
);

const relativeTime = (dateStr: string) => {
  const diffMins = Math.floor((Date.now() - new Date(dateStr.replace(" ", "T")).getTime()) / 60000);
  if (isNaN(diffMins)) return "";
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const hrs = Math.floor(diffMins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr.replace(" ", "T")).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const stateDot = (state: string) => {
  const s = state.toLowerCase();
  if (s.includes("reject") || s.includes("cancel") || s.includes("draft")) return "bg-[var(--psd-returned)]";
  if (s.includes("pending")) return "bg-[var(--psd-review)]";
  if (s.includes("approved") || s.includes("complete") || s.includes("closed") || s.includes("generated")) return "bg-[var(--psd-approved)]";
  return "bg-[var(--psd-info)]";
};

const statePill = (state: string) => {
  const s = state.toLowerCase();
  if (s.includes("reject") || s.includes("cancel") || s.includes("draft"))
    return "bg-[var(--psd-returned-bg)] text-[#C42B3C] dark:text-rose-300";
  if (s.includes("pending")) return "bg-[var(--psd-review-bg)] text-[#B45309] dark:text-amber-300";
  if (s.includes("approved") || s.includes("complete") || s.includes("closed") || s.includes("generated"))
    return "bg-[var(--psd-approved-bg)] text-[#0A7F58] dark:text-emerald-300";
  return "bg-[var(--psd-info-bg)] text-[#2F5BC4] dark:text-blue-300";
};

/**
 * --- Help Module Component ---
 */
const MANUAL_STEPS = [
  {
    id: 0,
    title: "Endorsement",
    icon: <Award className="size-4" />,
    content: (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Award className="size-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Endorsement Procedure</h2>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 p-4 mb-6 rounded-r-xl">
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
            <strong>Pre-check:</strong> If the Endorsement is already approved, proceed to Project Registration steps. Email the Dean with the approved copy attached for faster processing.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 text-slate-600 dark:text-slate-300 text-sm">
          <div className="p-4 border border-slate-100 dark:border-zinc-800 rounded-xl flex gap-4 bg-white dark:bg-zinc-900/30">
            <div className="text-blue-500 shrink-0 mt-0.5"><Search className="size-4" /></div>
            <p><strong className="text-slate-800 dark:text-slate-200">Validation:</strong> Check the top right for a red warning message. All required fields (Title, Type, etc.) must be filled before the "Endorsement" button works.</p>
          </div>
          <div className="p-4 border border-slate-100 dark:border-zinc-800 rounded-xl flex gap-4 bg-white dark:bg-zinc-900/30">
            <div className="text-blue-500 shrink-0 mt-0.5"><Printer className="size-4" /></div>
            <p><strong className="text-slate-800 dark:text-slate-200">Generate & Preview:</strong> Click "Endorsement" (top right). A pop-up window displays the certificate. You can type additional details directly into the body if required.</p>
          </div>
        </div>

        <div className="mt-8 bg-amber-50 dark:bg-amber-950/20 p-5 rounded-xl border border-amber-200 dark:border-amber-800/40">
          <h4 className="text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider mb-3">Submission Protocol</h4>
          <ul className="list-disc ml-5 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li><strong>Endorsement Only:</strong> Click "Submit" within the certificate pop-up.</li>
            <li><strong>Full Registration:</strong> Close the pop-up panel and use the "Submit Project" button on the main dashboard.</li>
            <li>All applications initially save as <strong>"Draft"</strong>.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 1,
    title: "Project Details",
    icon: <Info className="size-4" />,
    content: (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Info className="size-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Section 1: Project Details</h2>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-zinc-900/30 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-3">Basic Information</h4>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5">
              <li>• <strong className="text-slate-700 dark:text-slate-300">Project Title:</strong> Enter the full proposed title.</li>
              <li>• <strong className="text-slate-700 dark:text-slate-300">Project Type:</strong> Select Research, Consultancy, or Other. (If "Other," specify in the text box provided).</li>
              <li>• <strong className="text-slate-700 dark:text-slate-300">Department/Centre:</strong> Select implementation unit from the searchable list.</li>
            </ul>
          </div>

          <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="bg-indigo-600 px-4 py-2.5 font-bold text-xs text-white uppercase tracking-wider">Type-Specific Logic</div>

            <div className="p-4 border-b border-slate-100 dark:border-zinc-800">
              <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2">Research Projects</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                <div className="p-2.5 bg-slate-50 dark:bg-zinc-900/30 rounded-lg"><strong className="text-slate-700 dark:text-slate-300">Funding Agency:</strong> Search/Select (e.g., Halcyon). Type/Address will auto-populate and lock.</div>
                <div className="p-2.5 bg-slate-50 dark:bg-zinc-900/30 rounded-lg"><strong className="text-slate-700 dark:text-slate-300">Scheme/Origin:</strong> Enter the Name of Research Scheme and Origin of Funding.</div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-zinc-900/20">
              <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2">Consultancy Projects</h5>
              <div className="mb-4">
                <span className="bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold">CATEGORY D: Technology Transfer / Research Based</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">Enter <strong>GSTIN</strong> and verify <strong>GST %</strong>. Enter the <strong>Grand Total</strong> (Incl. GST). The system auto-calculates Net Honorarium, Institute Share, and 10% Overhead from inputs.</p>
              </div>
              <div>
                <span className="bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold">CATEGORY T & E: Routine / Testing / Non-Routine</span>
                <ul className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 space-y-1">
                  <li>• <strong>Total Amount (Excl. GST):</strong> The primary financial input.</li>
                  <li>• <strong>Calculations:</strong> Honorarium/Expenses (30%) and Institute Share (70%) are auto-filled.</li>
                  <li>• <strong>Grand Total:</strong> Sum of Total Amount + GST calculated automatically.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-zinc-900/30 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2">Timeline & Attachments</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400">
              <p><strong className="text-slate-700 dark:text-slate-300">Proposal:</strong> Upload document via "Choose File".</p>
              <p><strong className="text-slate-700 dark:text-slate-300">Duration:</strong> Enter total months. Start/End dates auto-calculate.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Investigators",
    icon: <Users className="size-4" />,
    content: (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <Users className="size-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Section 2: Investigators & Collaborators</h2>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800 p-5 rounded-xl">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2">Principal Investigator (PI)</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Enter the PI's Email ID. If registering for someone else, select their official email. ID, Designation, and Dept will auto-populate.</p>
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-3 text-[11px] text-rose-700 dark:text-rose-400 rounded-lg flex items-center gap-2">
              <Info className="size-3.5 shrink-0" /> User missing? Contact Tech Team 3090.
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800 p-5 rounded-xl">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2">Additional PI / Co-PI</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Toggle "Yes" to add more members. Click "Add Row" and select their name from the dropdown. All profile details lock once selected.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Proposed Budget",
    icon: <Calculator className="size-4" />,
    content: (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Calculator className="size-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Section 3: Proposed Budget</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-zinc-900/30 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2">Yearly Breakdown</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Use <strong>"+ Add Row"</strong> for budget heads (Overhead, Manpower, Travel, etc.) and <strong>"+ Add Year"</strong> for subsequent years.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/30">
              <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase mb-2">Equipment (Optional)</h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">Check the box to enable. Enter Item Name, Description, Quantity, and Unit Cost.</p>
            </div>
            <div className="p-4 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/30">
              <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase mb-2">Manpower (Optional)</h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">Check the box to enable. Select Position from dropdown. Provide Posts and Salary.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: "Clearance & Declaration",
    icon: <Shield className="size-4" />,
    content: (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl">
            <Shield className="size-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Section 4: Clearance & Declaration</h2>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-zinc-900/30 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-4">Committee Clearances</h4>
            <div className="grid grid-cols-1 gap-4 text-xs">
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900/40 rounded-lg border border-slate-100 dark:border-zinc-800">
                <div className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Ethics Committee</span>
                  <span className="text-slate-600 dark:text-slate-400">Select Type: rDNA, GMO, Transgenic Plants, or Other.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-900/40 rounded-lg border border-slate-100 dark:border-zinc-800">
                <div className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Bio-safety Committee</span>
                  <span className="text-slate-600 dark:text-slate-400">Select Category: I, II, or III.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 dark:bg-zinc-950 text-white p-6 rounded-2xl border border-slate-800 dark:border-zinc-800">
            <h4 className="text-lg font-bold mb-3">Final Step</h4>
            <p className="text-slate-400 text-sm mb-4">Saving only creates a "Project Draft". To finalize registration:</p>
            <div className="flex items-center gap-4 bg-slate-800 dark:bg-zinc-900 p-4 rounded-xl text-sm">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
                <div className="h-4 w-px bg-slate-700" />
                <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
              </div>
              <div className="space-y-3">
                <p>Go to the <strong>Project View</strong> page.</p>
                <p>Open your specific project and click <strong>Submit</strong>.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];


/**
 * --- Main PI Home Page Component ---
 */
export function PiHomePage() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", currentUser ? undefined : null);

  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } =
    useFrappeGetCall<{ message: PiDashboardData }>(
      "rndopsapp.dashboard.get_pi_dashboard_data",
      { user: currentUser },
      currentUser ? undefined : null,
      { revalidateOnFocus: false },
    );

  const fullName = userData?.full_name || currentUser || "Guest";
  const {
    isOpen: isCommandPaletteOpen,
    openPalette,
    closePalette,
  } = useCommandPalette();

  const overview = dashboardData?.message?.project_overview;
  // Top 6, with "logged out" entries dropped first so six real updates are shown.
  const recentUpdates = (dashboardData?.message?.recent_updates ?? [])
    .filter((u) => !u.title?.toLowerCase().includes("logged out"))
    .slice(0, 6);
  const failed = !!dashboardError;
  // Figures stay behind the loading shimmer until the real data is in, so the count-up (and the greeting)
  // always play after loading, never against an early placeholder zero.
  const dashPending = !failed && (!currentUser || dashboardLoading || !dashboardData);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const { summary: ledger, isLoading: ledgerLoading, error: ledgerError } = usePiLedgerSummary(currentUser);
  const ledgerPending = !ledgerError && (!currentUser || ledgerLoading || !ledger);

  // Start typing once the real name and the dashboard data have loaded (or after a short wait, so it never stays blank).
  const [nameWaited, setNameWaited] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setNameWaited(true), 2500);
    return () => clearTimeout(t);
  }, []);
  const greetingText = `${getGreeting()}, ${fullName}!`;
  const greeting = useTypewriter(greetingText, (!!userData?.full_name && !dashPending) || nameWaited);
  const { items: activity, putBacks, isLoading: activityLoading, error: activityError } = useMyRecentApplications(currentUser, 8, 40);

  const viewDetail = (path: string) => (
    <button
      onClick={() => navigate(path)}
      className="psd-focus rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--psd-primary)] transition-colors hover:bg-[var(--psd-primary-light)]"
    >
      View Detail
    </button>
  );

  return (
    <div className="psd-root flex min-h-screen flex-col font-sans transition-colors duration-300">
      {/* overflow-x-clip (not overflow-y-auto) so the sticky footer sticks to the viewport, not to this box */}
      <main className="flex w-full flex-1 flex-col overflow-x-clip px-0 pb-0 pt-0">
        <div className="flex w-full flex-1 flex-col">
          {/* Hero */}
          <header className="psd-hero relative mb-2 flex flex-col gap-2 overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative z-10 flex min-w-0 items-center gap-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
                <LayoutGrid className="size-4" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">
                  PI Workspace
                </div>
                <h1 className="mt-0.5 text-[17px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">
                  PI Dashboard
                </h1>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-2">
              <button
                onClick={openPalette}
                className="psd-focus relative hidden w-full items-center gap-2.5 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-3 py-1.5 text-[13px] text-[var(--psd-body)] shadow-sm transition-all hover:border-[var(--psd-primary)]/50 sm:w-[260px]"
              >
                <SearchIcon className="size-4 text-[var(--psd-muted)]" />
                <span className="pr-8">Search projects...</span>
                <kbd className="absolute right-3 hidden items-center rounded border border-[var(--psd-border)] bg-[var(--psd-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--psd-muted)] sm:inline-flex">
                  ⌘K
                </kbd>
              </button>
              <HeroClock />
            </div>
          </header>

          {/* Greeting (kept out of the header card) */}
          <div className="mb-3 px-0.5">
            <h2 className="text-[15px] font-semibold text-[var(--psd-heading)]" aria-label={greetingText}>
              {/* The untyped remainder stays in the layout (invisible), so nothing jumps while it types */}
              <span aria-hidden>{greeting.typed}</span>
              <span
                aria-hidden
                className={cn(
                  "mx-px inline-block h-[1em] w-[2px] translate-y-[2px] rounded-sm bg-[var(--psd-primary)] transition-opacity duration-500",
                  greeting.done ? "opacity-0" : "animate-pulse opacity-100",
                )}
              />
              <span aria-hidden className="invisible">{greeting.rest}</span>
            </h2>
            <p className="text-xs text-[var(--psd-body)]">
              Here's a quick look at your projects, funds and latest updates.
            </p>
          </div>

          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={closePalette}
          />
          <HelpModule isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

          <SectionDivider title="Quick Actions" />
          <section className="mb-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <ActionCard
              icon={<PlusCircle />}
              title="New Project"
              description="Initiate a new research or development proposal with guided steps."
              onClick={() => navigate("/project-registration")}
              tone="violet"
            />
            <ActionCard
              icon={<LayoutGrid />}
              title="View Projects"
              description="Comprehensive repository of all your active and archived research initiatives."
              onClick={() => navigate("/projects-view")}
              tone="blue"
            />
            <ActionCard
              icon={<Clock />}
              title="Pending Tasks"
              description="Review applications awaiting your approval as Principal Investigator."
              onClick={() => navigate("/pending-application")}
              tone="amber"
            />
          </section>

          <SectionDivider title="Overview" />
          <PendingLoansAlert />
          <ProjectStaffApprovalsAlert />
          <section className="mb-3 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            <StatStrip icon={<BarChart />} title="Project Overview" columns={3} tone="violet" action={viewDetail("/project-analytics")}>
              <MiniStat label="Total Projects" value={String(overview?.total_projects ?? 0)} hint={`${overview?.draft_projects ?? 0} in draft stage`} icon={<FileText />} tone="violet" loading={dashPending} error={failed} />
              <MiniStat label="Pending Review" value={String(overview?.pending_review ?? 0)} hint="Awaiting action" icon={<AlertCircle />} tone="amber" loading={dashPending} error={failed} />
              <MiniStat label="Staffing" value={String(overview?.active_staff ?? 0)} hint="Active members" icon={<UsersIcon />} tone="blue" loading={dashPending} error={failed} />
            </StatStrip>

            <StatStrip icon={<PieChart />} title="Financial Summary" tone="emerald" action={viewDetail("/pi-financial-dashboard")}>
              <MiniStat
                label="Allocation"
                value={formatCrore(ledger?.received ?? 0)}
                hint={`Fund received across ${ledger?.projectsWithFunds ?? 0} of ${ledger?.projectsTotal ?? 0} projects${ledger?.partial ? " (some projects could not be read)" : ""}`}
                icon={<PieChart />}
                tone="violet"
                loading={ledgerPending}
                error={ledgerError}
              />
              <MiniStat
                label="Utilization"
                value={`${ledger?.utilization ?? 0}%`}
                hint={`${formatCrore(ledger?.committed ?? 0)} committed · ${formatCrore(ledger?.paid ?? 0)} paid`}
                icon={<TrendingUp />}
                tone="amber"
                loading={ledgerPending}
                error={ledgerError}
              />
              <MiniStat
                label="Available"
                value={formatCrore(ledger?.commitable ?? 0)}
                hint={`Can still be committed · ${formatCrore(ledger?.actualBalance ?? 0)} actual balance`}
                icon={<PieChart />}
                tone="emerald"
                loading={ledgerPending}
                error={ledgerError}
              />
              <MiniStat
                label="Awaiting Payment"
                value={formatCrore(ledger?.awaitingPayment ?? 0)}
                hint="Committed but not yet paid"
                icon={<AlertCircle />}
                tone="coral"
                loading={ledgerPending}
                error={ledgerError}
              />
            </StatStrip>
          </section>

          {/* Activity & updates */}
          <SectionDivider title="Activity & Updates" />
          <section className="grid grid-cols-1 gap-3 pb-2 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <PanelHeader icon={<History />} title="Application Activity" tone="emerald" />
              <div className="max-h-[340px] overflow-y-auto">
                {activityLoading ? (
                  <div className="divide-y divide-[var(--psd-border)]">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="size-2 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-44 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-700/50" />
                          <div className="h-2.5 w-28 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-700/50" />
                        </div>
                        <div className="h-5 w-20 animate-pulse rounded-full bg-zinc-200/70 dark:bg-zinc-700/50" />
                      </div>
                    ))}
                  </div>
                ) : activityError ? (
                  <p role="alert" className="p-4 text-[12px] font-medium text-[var(--psd-returned)]">
                    Couldn't load your application activity. Please refresh the page.
                  </p>
                ) : activity.length === 0 ? (
                  <p className="p-4 text-[12px] font-medium text-[var(--psd-body)]">
                    No application activity yet. Applications you create or update will appear here.
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--psd-border)]">
                    {activity.map((a) => {
                      const created = Math.abs(new Date(a.modified.replace(" ", "T")).getTime() - new Date(a.creation.replace(" ", "T")).getTime()) < 60000;
                      return (
                        <li key={`${a.doctype}-${a.id}`}>
                          <button
                            onClick={() => navigate(a.route)}
                            className="psd-focus group block w-full px-4 py-3 text-left transition-colors hover:bg-[var(--psd-primary-light)]/40"
                          >
                            {/* Line 1: what it is, and where it stands */}
                            <span className="flex items-center justify-between gap-3">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className={cn("size-2 shrink-0 rounded-full", stateDot(a.workflow_state))} />
                                <span className="truncate text-[13.5px] font-bold text-[var(--psd-heading)]">{a.title || a.doctype}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <span className="hidden text-[11px] text-[var(--psd-muted)] sm:inline">
                                  {created ? "Created" : "Updated"} {relativeTime(a.modified)}
                                </span>
                                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statePill(a.workflow_state))}>{a.workflow_state}</span>
                                <ChevronRight className="size-4 text-[var(--psd-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--psd-primary)]" />
                              </span>
                            </span>

                            {/* Line 2: ID and project, plain muted text */}
                            <span className="mt-0.5 block truncate pl-4 font-mono text-[11px] text-[var(--psd-muted)]">
                              {a.title ? `${a.doctype} · ` : ""}{a.id}{a.projectNo ? `  ·  ${a.projectNo}` : ""}
                            </span>

                            {/* Line 3: latest comment. A Put Back comment is highlighted so it can't be missed. */}
                            {(() => {
                              const c = a.latestComment;
                              if (c === undefined)
                                return <span className="mt-1.5 block h-3 w-2/3 animate-pulse rounded bg-zinc-200/70 pl-4 dark:bg-zinc-700/50" />;
                              if (c === null)
                                return <span className="mt-1.5 block pl-4 text-[12px] italic text-[var(--psd-muted)]">No comments yet</span>;
                              const putBack = /put\s*back/i.test(c.text.slice(0, 40));
                              return putBack ? (
                                <span
                                  className="ml-4 mt-1.5 flex items-start gap-2 rounded-lg border border-[var(--psd-returned)]/35 bg-[var(--psd-returned-bg)] px-2.5 py-1.5 text-[12px]"
                                  title={`${c.user}${c.role ? ` (${c.role})` : ""}, ${relativeTime(c.timestamp)}: ${c.text}`}
                                >
                                  <RotateCcw className="mt-0.5 size-3.5 shrink-0 text-[var(--psd-returned)]" />
                                  <span className="min-w-0">
                                    <span className="flex flex-wrap items-center gap-x-1.5">
                                      <span className="rounded bg-[var(--psd-returned)] px-1.5 py-px text-[9.5px] font-extrabold uppercase tracking-wider text-white">Put back</span>
                                      <span className="font-bold text-[var(--psd-heading)]">{c.user}</span>
                                      {c.role && <span className="font-semibold text-[#0B6B63] dark:text-teal-300">{c.role}</span>}
                                      <span className="text-[10.5px] text-[var(--psd-muted)]">{relativeTime(c.timestamp)}</span>
                                    </span>
                                    <span className="line-clamp-2 font-medium text-[#8F1F2D] dark:text-rose-200">{c.text}</span>
                                  </span>
                                </span>
                              ) : (
                                <span className="mt-1.5 flex items-center gap-1.5 pl-4 text-[12px]">
                                  <MessageSquare className="size-3 shrink-0 text-[var(--psd-muted)]" />
                                  <span className="shrink-0 font-bold text-[var(--psd-heading)]">{c.user}</span>
                                  {c.role && <span className="shrink-0 font-semibold text-[#0B6B63] dark:text-teal-300">{c.role}</span>}
                                  <span className="min-w-0 truncate text-[var(--psd-body)]" title={`${c.text} (${relativeTime(c.timestamp)})`}>
                                    {c.text}
                                  </span>
                                </span>
                              );
                            })()}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>

            <Card>
              <PanelHeader icon={<RotateCcw />} title="Put Back" tone="coral" />
              <div className="max-h-[340px] overflow-y-auto">
                {activityLoading ? (
                  <p className="p-4 text-[12px] font-medium text-[var(--psd-body)]">Checking your applications...</p>
                ) : putBacks.length === 0 ? (
                  <p className="p-4 text-[12px] font-medium text-[var(--psd-body)]">Nothing has been put back to you.</p>
                ) : (
                  <ul className="divide-y divide-[var(--psd-border)]">
                    {putBacks.map((a) => {
                      const c = a.latestComment!;
                      return (
                        <li key={`${a.doctype}-${a.id}`}>
                          <button
                            onClick={() => navigate(a.route)}
                            className="psd-focus group block w-full px-4 py-2.5 text-left transition-colors hover:bg-[var(--psd-primary-light)]/40"
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] font-bold text-[var(--psd-heading)]">{a.title || a.doctype}</span>
                              <span className="shrink-0 rounded bg-[var(--psd-returned)] px-1.5 py-px text-[9.5px] font-extrabold uppercase tracking-wider text-white">Put back</span>
                            </span>
                            <span className="block truncate font-mono text-[11px] text-[var(--psd-muted)]">
                              {a.title ? `${a.doctype} · ` : ""}{a.id}{a.projectNo ? `  ·  ${a.projectNo}` : ""}
                            </span>
                            <span className="mt-1 block text-[12px]" title={c.text}>
                              <span className="font-bold text-[var(--psd-heading)]">{c.user}</span>
                              {c.role && <span className="ml-1 font-semibold text-[#0B6B63] dark:text-teal-300">{c.role}</span>}
                              <span className="ml-1.5 text-[10.5px] text-[var(--psd-muted)]">{relativeTime(c.timestamp)}</span>
                              <span className="mt-0.5 line-clamp-2 block font-medium text-[#8F1F2D] dark:text-rose-200">{c.text}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>

          </section>

          {/* Footer */}
          <footer className="sticky bottom-0 z-20 mt-auto flex flex-col items-center justify-between gap-2 rounded-t-xl border-t border-[var(--psd-border)] bg-[var(--psd-surface)]/90 px-3 py-2 shadow-[0_-8px_18px_-12px_rgba(21,27,50,0.3)] backdrop-blur-md sm:flex-row">
            <nav aria-label="Quick resources" className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="mr-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--psd-body)]">Quick Resources</span>
              {(
                [
                  // Opens the same user guides / videos / PDFs as the sidebar Help
                  { icon: <FileText />, label: "Project Guidelines", tone: "violet", onClick: () => setIsHelpOpen(true) },
                  { icon: <LifeBuoy />, label: "Support Portal", tone: "emerald", href: "mailto:ernd@iitg.ac.in?subject=ProRnD%20support%20request" },
                  { icon: <BarChart />, label: "Analytics Reports", tone: "amber", onClick: () => navigate("/project-analytics") },
                ] as { icon: React.ReactNode; label: string; tone: KpiTone; onClick?: () => void; href?: string }[]
              ).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => (item.href ? window.open(item.href, "_self") : item.onClick?.())}
                  className="psd-focus group inline-flex items-center gap-1.5 rounded-full border border-[var(--psd-border)] bg-[var(--psd-surface)] py-1 pl-1 pr-2.5 text-[12px] font-semibold text-[var(--psd-heading)] transition-all hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <span className="grid size-5 place-items-center rounded-full" style={toneTile(item.tone)}>
                    {React.cloneElement(item.icon as React.ReactElement<any>, { size: 11 })}
                  </span>
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="inline-flex items-center gap-2 text-[12px] font-medium text-[var(--psd-body)]">
              <Mail className="size-3.5" />
              <span>For assistance, reach out to</span>
              <a
                href="mailto:ernd@iitg.ac.in"
                className="font-bold text-[var(--psd-primary)] transition-colors hover:text-[var(--psd-primary-hover)]"
              >
                ernd@iitg.ac.in
              </a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default PiHomePage;
