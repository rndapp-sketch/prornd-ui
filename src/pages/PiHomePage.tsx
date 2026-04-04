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
      "bg-white dark:bg-zinc-900 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm transition-all overflow-hidden",
      className,
    )}
  >
    {children}
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
      <div className="font-sans text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
        {time.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      </div>
      <div className="text-zinc-800 dark:text-zinc-200 font-serif text-lg leading-tight">
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
  <Card className="hover:border-zinc-300 dark:hover:border-zinc-500 cursor-pointer group">
    <button
      onClick={onClick}
      className="w-full text-left p-6 flex flex-col h-full"
    >
      <div className="size-10 flex items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 mb-5 group:bg-[#D97757] group:text-white transition-all duration-300">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
      </div>
      <h3 className="font-serif text-xl text-zinc-800 dark:text-zinc-100 font-medium mb-2">
        {title}
      </h3>
      <p className="font-sans text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>
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
      "p-4 rounded-lg border border-zinc-100 dark:border-zinc-700/50 bg-zinc-50/30 dark:bg-zinc-900/20 transition-all",
      onClick ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800" : "",
    )}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-sans uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">
        {title}
      </span>
      <div className="text-zinc-400 dark:text-zinc-500">{icon}</div>
    </div>
    <div className="text-xl font-serif text-zinc-800 dark:text-zinc-100 mb-1">
      {value}
    </div>
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-sans text-zinc-400 dark:text-zinc-500">
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
    <div className="min-h-screen dark:bg-zinc-900  transition-colors duration-300">
      <main className="p-4 md:p-8 overflow-y-auto w-full">
        <div className="w-full mx-auto">
          {/* Header Section */}
          <header className="mb-12 flex justify-between items-end">
            <div className="space-y-1">
              <h1 className="font-serif text-3xl text-zinc-800 dark:text-zinc-100 font-medium tracking-tight">
                Dashboard
              </h1>
              <p className="font-sans text-sm text-zinc-500 dark:text-zinc-400">
                Welcome back,{" "}
                <span className="text-claude-accent font-medium">
                  {fullName}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative group">
                <button
                  onClick={openPalette}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
                >
                  <SearchIcon className="size-4" />
                  <span className="pr-8">Search projects...</span>
                  <kbd className="absolute right-3 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-400">
                    ⌘K
                  </kbd>
                </button>
              </div>
              <CurrentTime />
            </div>
          </header>

          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={closePalette}
          />

          {/* Quick Actions */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
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

          {/* Analytics Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            {/* Project Analytics */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <BarChart className="size-4 text-zinc-400" />
                  <h3 className="font-serif text-base text-zinc-800 dark:text-zinc-100 font-medium">
                    Project Overview
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/project-analytics")}
                  className="text-xs font-sans font-semibold uppercase tracking-wider text-zinc-400 hover:text-claude-accent transition-colors"
                >
                  View Detail
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <PieChart className="size-4 text-zinc-400" />
                  <h3 className="font-serif text-base text-zinc-800 dark:text-zinc-100 font-medium">
                    Financial Summary
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/fund-analytics")}
                  className="text-xs font-sans font-semibold uppercase tracking-wider text-zinc-400 hover:text-claude-accent transition-colors"
                >
                  View Detail
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
            <Card className="lg:col-span-2 p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <Megaphone className="size-4 text-zinc-400" />
                <h3 className="font-serif text-base text-zinc-800 dark:text-zinc-100 font-medium">
                  Recent Updates
                </h3>
              </div>
              <div className="space-y-4">
                {dashboardLoading ? (
                  <p className="text-xs text-zinc-400">Loading updates...</p>
                ) : recentUpdates.length === 0 ? (
                  <p className="text-xs text-zinc-400">No recent updates.</p>
                ) : (
                  recentUpdates.map((update, i) => (
                    <div key={i} className="flex items-start gap-4 group">
                      <div
                        className={cn(
                          "size-1.5 rounded-full mt-2.5",
                          update.type === "announcement"
                            ? "bg-[#9A7D5A]"
                            : "bg-zinc-400",
                        )}
                      ></div>
                      <div className="border-b border-zinc-100 dark:border-zinc-700/50 pb-4 w-full last:border-0">
                        <p className="font-sans text-xs font-medium text-zinc-800 dark:text-zinc-200">
                          {update.title}
                        </p>
                        <p className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {update.meta}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-serif text-base text-zinc-800 dark:text-zinc-100 font-medium mb-5">
                Quick Resources
              </h3>
              <ul className="space-y-1.5">
                {[
                  { icon: <FileText />, label: "Project Guidelines" },
                  { icon: <LifeBuoy />, label: "Support Portal" },
                  { icon: <BarChart />, label: "Analytics Reports" },
                  { icon: <PieChart />, label: "Financial Templates" },
                ].map((item, i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="flex items-center gap-2.5 p-2 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
                    >
                      <span className="text-zinc-400">
                        {React.cloneElement(
                          item.icon as React.ReactElement<any>,
                          { size: 15 },
                        )}
                      </span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          {/* Footer */}
          <footer className="pt-10 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-xs font-sans text-zinc-500 dark:text-zinc-400">
              <Mail className="size-3.5" />
              <span>For assistance, reach out to</span>
              <a
                href="mailto:ernd@iitg.ac.in"
                className="text-claude-accent hover:text-[#D97757] font-medium transition-colors"
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
