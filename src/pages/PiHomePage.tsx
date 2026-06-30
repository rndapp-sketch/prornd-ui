

// -=-=-=-=-=-=-=-=-=-==-=-=-=-

import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  useFrappeAuth,
  useFrappeGetDoc,
  useFrappeGetCall,
} from "frappe-react-sdk";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";
import {
  PlusCircle,
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
}) => (
  <div
    className={cn(
      "bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm transition-all overflow-hidden",
      className,
    )}
  >
    {children}
  </div>
);

const SectionDivider = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2.5 mb-3 mt-1">
    <span className="text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.1em] whitespace-nowrap">
      {title}
    </span>
    <div className="flex-1 h-px bg-[#E4E4E7] dark:bg-[#3F3F46]" />
  </div>
);

const PanelHeader = ({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between px-[22px] py-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
    <div className="flex items-center gap-2 text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
      <div className="w-7 h-7 rounded-md flex items-center justify-center bg-blue-50 dark:bg-blue-950/20 text-[#2563EB] dark:text-blue-400">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 15 })}
      </div>
      {title}
    </div>
    {action}
  </div>
);

const CurrentTime = () => {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="text-right hidden sm:block">
      <div className="text-[11px] uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] font-bold">
        {time.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      </div>
      <div className="text-[#3F3F46] dark:text-[#E4E4E7] text-[15px] font-extrabold leading-tight">
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
};

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  title,
  description,
  onClick,
}) => (
  <Card className="hover:-translate-y-0.5 hover:shadow-md cursor-pointer group">
    <button
      onClick={onClick}
      className="w-full text-left p-5 flex items-start gap-4 h-full"
    >
      <div className="size-10 flex items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/20 text-[#2563EB] dark:text-blue-400 group-hover:bg-[#D97757] group-hover:text-white transition-all duration-200 shrink-0">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 19 })}
      </div>
      <div className="min-w-0">
        <h3 className="text-[15px] text-[#3F3F46] dark:text-[#E4E4E7] font-extrabold mb-1">
          {title}
        </h3>
        <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] font-medium leading-relaxed">
          {description}
        </p>
      </div>
      <ChevronRight className="size-4 ml-auto mt-1 text-zinc-300 group-hover:text-[#D97757] shrink-0" />
    </button>
  </Card>
);

const AnalyticsCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: string;
  onClick?: () => void;
}> = ({ title, value, subtitle, icon, trend, onClick }) => (
  <div
    onClick={onClick}
    className={cn(
      "p-4 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] transition-all relative overflow-hidden",
      onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-sm" : "",
    )}
  >
    <div className="absolute bottom-0 right-0 w-16 h-16 rounded-full translate-x-5 translate-y-5 bg-blue-500/5 pointer-events-none" />
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] font-extrabold">
        {title}
      </span>
      <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/20 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
        {icon}
      </div>
    </div>
    <div className="text-[28px] font-extrabold tracking-tight leading-none text-[#2563EB] dark:text-blue-400 mb-2">
      {value}
    </div>
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] font-semibold">
        {subtitle}
      </span>
      {trend && (
        <span
          className={cn(
            "text-[11px] font-medium px-1.5 py-0.5 rounded-full",
            trend.startsWith("+")
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
          )}
        >
          {trend}
        </span>
      )}
    </div>
  </div>
);

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
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name", "user_roles"],
    enabled: !!currentUser,
  });

  const { data: dashboardData, isLoading: dashboardLoading } =
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
  const financials = dashboardData?.message?.financial_summary;
  const recentUpdates = dashboardData?.message?.recent_updates ?? [];

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans transition-colors duration-300">
      <main className="px-6 md:px-8 pt-7 pb-10 overflow-y-auto w-full">
        <div className="w-full max-w-[1600px] mx-auto">
          {/* Header Section */}
          <header className="mb-7">
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
              <div className="h-1.5 bg-[linear-gradient(to_right,#4A6CF7,#2563EB,#D97757)]" />
              <div className="px-5 md:px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#71717A] dark:text-[#A1A1AA] mb-1">
                    PI Workspace
                  </div>
                  <h1 className="text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                    Dashboard
                  </h1>
                  <p className="text-[13px] text-[#71717A] dark:text-[#A1A1AA] font-medium mt-1">
                    Welcome back,{" "}
                    <span className="text-[#2563EB] dark:text-blue-400 font-bold">
                      {fullName}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                  <button
                    onClick={openPalette}
                    className="relative hidden items-center gap-2.5 w-full sm:w-[320px] px-3.5 py-2.5 text-[13px] text-[#71717A] dark:text-[#A1A1AA] bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl shadow-sm hover:border-[#2563EB]/40 transition-all"
                  >
                    <SearchIcon className="size-4 text-[#A1A1AA]" />
                    <span className="pr-8">Search projects...</span>
                    <kbd className="absolute right-3 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded text-[#A1A1AA]">
                      ⌘K
                    </kbd>
                  </button>
                  <CurrentTime />
                </div>
              </div>
            </div>
          </header>

          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={closePalette}
          />

          <SectionDivider title="Quick Actions" />
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <ActionCard
              icon={<PlusCircle />}
              title="New Project"
              description="Initiate a new research or development proposal with guided steps."
              onClick={() => navigate("/project-registration")}
            />
            <ActionCard
              icon={<LayoutGrid />}
              title="View Projects"
              description="Comprehensive repository of all your active and archived research initiatives."
              onClick={() => navigate("/projects-view")}
            />
            <ActionCard
              icon={<Clock />}
              title="Pending Tasks"
              description="Review items requiring your immediate attention or approval."
              onClick={() => navigate("/projects-view")}
            />
          </section>

          <SectionDivider title="Overview" />
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            {/* Project Analytics */}
            <Card>
              <PanelHeader
                icon={<BarChart />}
                title="Project Overview"
                action={
                  <button
                    onClick={() => navigate("/project-analytics")}
                    className="text-[11px] text-[#2563EB] dark:text-blue-400 font-bold uppercase tracking-wide hover:text-[#D97757] transition-colors"
                  >
                    View Detail
                  </button>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-[18px]">
                <AnalyticsCard
                  title="Total Projects"
                  value={
                    dashboardLoading
                      ? "—"
                      : String(overview?.total_projects ?? 0)
                  }
                  subtitle={`${overview?.draft_projects ?? 0} in draft stage`}
                  icon={<FileText size={14} />}
                />
                <AnalyticsCard
                  title="Completion"
                  value={
                    dashboardLoading
                      ? "—"
                      : `${overview?.completion_rate ?? 0}%`
                  }
                  subtitle="On track"
                  icon={<TrendingUp size={14} />}
                />
                <AnalyticsCard
                  title="Pending Review"
                  value={
                    dashboardLoading
                      ? "—"
                      : String(overview?.pending_review ?? 0)
                  }
                  subtitle="Awaiting action"
                  icon={<AlertCircle size={14} />}
                />
                <AnalyticsCard
                  title="Staffing"
                  value={
                    dashboardLoading ? "—" : String(overview?.active_staff ?? 0)
                  }
                  subtitle="Active members"
                  icon={<UsersIcon size={14} />}
                />
              </div>
            </Card>

            {/* Fund Analytics */}
            <Card>
              <PanelHeader
                icon={<PieChart />}
                title="Financial Summary"
                action={
                  <button
                    onClick={() => navigate("/fund-analytics")}
                    className="text-[11px] text-[#2563EB] dark:text-blue-400 font-bold uppercase tracking-wide hover:text-[#D97757] transition-colors"
                  >
                    View Detail
                  </button>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-[18px]">
                <AnalyticsCard
                  title="Total Allocation"
                  value={
                    dashboardLoading
                      ? "—"
                      : formatCrore(financials?.total_allocation ?? 0)
                  }
                  subtitle={`FY ${financials?.financial_year ?? "—"}`}
                  icon={<PieChart size={14} />}
                />
                <AnalyticsCard
                  title="Utilization"
                  value={
                    dashboardLoading
                      ? "—"
                      : `${financials?.utilization_rate ?? 0}%`
                  }
                  subtitle={`${formatCrore(financials?.utilized ?? 0)} spent`}
                  icon={<TrendingUp size={14} />}
                />
                <AnalyticsCard
                  title="Available"
                  value={
                    dashboardLoading
                      ? "—"
                      : formatCrore(financials?.available ?? 0)
                  }
                  subtitle="Net balance"
                  icon={<PieChart size={14} />}
                />
                <AnalyticsCard
                  title="Requests"
                  value={
                    dashboardLoading
                      ? "—"
                      : formatCrore(financials?.pending_requests ?? 0)
                  }
                  subtitle="Pending review"
                  icon={<AlertCircle size={14} />}
                />
              </div>
            </Card>
          </section>

          {/* Secondary Information */}
          <SectionDivider title="Updates & Resources" />
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-8">
            <Card className="lg:col-span-2">
              <PanelHeader icon={<Megaphone />} title="Recent Updates" />
              <div className="p-[18px] space-y-3">
                {dashboardLoading ? (
                  <p className="text-[12px] text-[#A1A1AA] font-medium">
                    Loading updates...
                  </p>
                ) : recentUpdates.length === 0 ? (
                  <p className="text-[12px] text-[#A1A1AA] font-medium">
                    No recent updates.
                  </p>
                ) : (
                  recentUpdates.map((update, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-4 group border-b border-[#F4F4F5] dark:border-zinc-800 last:border-0 pb-3 last:pb-0",
                        update.title?.toLowerCase().includes("logged out") && "hidden"
                      )}
                    >
                      <div
                        className={cn(
                          "size-2 rounded-full mt-2",
                          update.type === "announcement"
                            ? "bg-[#D97757]"
                            : "bg-[#2563EB]",
                        )}
                      ></div>
                      <div className="w-full">
                        <p className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                          {update.title}
                        </p>
                        <p className="text-[11px] text-[#A1A1AA] dark:text-zinc-500 font-medium mt-0.5">
                          {update.meta}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <PanelHeader icon={<LifeBuoy />} title="Quick Resources" />
              <ul className="p-[18px] space-y-1.5">
                {[
                  { icon: <FileText />, label: "Project Guidelines" },
                  { icon: <LifeBuoy />, label: "Support Portal" },
                  { icon: <BarChart />, label: "Analytics Reports" },
                  { icon: <PieChart />, label: "Financial Templates" },
                ].map((item, i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="flex items-center gap-2.5 p-2.5 rounded-xl text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] font-semibold hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-all group"
                    >
                      <span className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/20 text-[#2563EB] dark:text-blue-400 flex items-center justify-center group-hover:bg-[#D97757] group-hover:text-white transition-colors">
                        {React.cloneElement(
                          item.icon as React.ReactElement<any>,
                          { size: 14 },
                        )}
                      </span>
                      {item.label}
                      <ChevronRight className="size-4 ml-auto text-zinc-300 group-hover:text-[#D97757]" />
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          {/* Footer */}
          <footer className="pt-6 border-t border-[#E4E4E7] dark:border-[#3F3F46] text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
              <Mail className="size-3.5" />
              <span>For assistance, reach out to</span>
              <a
                href="mailto:ernd@iitg.ac.in"
                className="text-[#2563EB] hover:text-[#D97757] font-bold transition-colors"
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