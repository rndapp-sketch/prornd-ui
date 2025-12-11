// new neo design


import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { AppSidebar } from "../components/RndSidebar";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";
import {
  PlusCircle, LayoutGrid, FileText, BarChart, PieChart, TrendingUp,
  AlertCircle, Megaphone, LifeBuoy, Mail, Clock,
  UsersIcon, SearchIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Child Components with Neo-Brutalism Style ---
const CurrentTime = () => {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);
  return (
    <div className="text-sm text-gray-600 text-right bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
      <div className="font-medium">{time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
      <div className="text-gray-500">{time.toLocaleTimeString()}</div>
    </div>
  );
};

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, title, description, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-all duration-150 hover:shadow-md hover:border-gray-200 cursor-pointer group flex flex-col"
  >
    <div className="flex-shrink-0 flex items-center justify-center size-11 bg-[#E0F7F6] text-[#0EA5A4] rounded-xl mb-4 group-hover:bg-[#0EA5A4] group-hover:text-white transition-colors">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2 text-gray-900">{title}</h3>
    <p className="text-gray-500 flex-grow text-sm">{description}</p>
  </div>
);

const AnalyticsCard: React.FC<{ title: string; value: string; subtitle: string; icon: React.ReactNode; trend?: string; onClick?: () => void; }> =
  ({ title, value, subtitle, icon, trend, onClick }) => (
    <div
      onClick={onClick}
      className={cn("p-4 rounded-xl border border-gray-200 bg-gray-50/50", onClick ? 'cursor-pointer hover:bg-[#E0F7F6]/30 hover:border-[#0EA5A4]/20 transition-colors' : '')}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className="text-[#0EA5A4]">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="flex items-center justify-between mt-1">
        <div className="text-xs text-gray-500">{subtitle}</div>
        {trend && (<div className={`text-xs font-semibold ${trend.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>{trend}</div>)}
      </div>
    </div>
  );

// --- Main PI Home Page Component ---
export function PiHomePage() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name", "user_roles"],
    enabled: !!currentUser,
  });

  const fullName = userData?.full_name || currentUser || "Guest";
  const isPermanentEmployee = userData?.user_roles?.some((role: any) => role.role === "Permanent Employee") || false;
  const { isOpen: isCommandPaletteOpen, openPalette, closePalette } = useCommandPalette();

  return (
    <div className=" bg-[#F0F4F8] min-h-screen  font-sans">
      <AppSidebar />
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">Welcome back, {fullName}</p>
              </div>
              <div className="flex items-center gap-4">
                <CurrentTime />
                {/* Search Button */}
                <button
                  onClick={openPalette}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm transition-colors"
                >
                  <SearchIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Search...</span>
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono bg-gray-50 border border-gray-300 rounded">
                    ⌘K
                  </kbd>
                </button>
              </div>
            </div>
          </header>
          {/* Command Palette */}
          <CommandPalette isOpen={isCommandPaletteOpen} onClose={closePalette} />

          {/* Main Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ActionCard
              icon={<PlusCircle className="size-6" />}
              title="New Project"
              description="Start a new research or development initiative."
              onClick={() => navigate("/project-registration")}
            />
            <ActionCard
              icon={<LayoutGrid className="size-6" />}
              title="View Projects"
              description="Browse, track, and manage all ongoing and completed projects."
              onClick={() => navigate("/projects-view")}
            />
            <ActionCard
              icon={<Clock className="size-6" />}
              title="Pending Tasks"
              description="Review and take action on your assigned tasks and approvals."
              onClick={() => navigate("/projects-view", { state: { filter: "Application Under Process" } })}
            />
          </section>

          {/* Analytics Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Project Analytics */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4 gap-3"><BarChart className="size-6 text-[#0EA5A4]" /><h3 className="text-lg font-semibold text-gray-900">Project Overview</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard title="Total Projects" value="24" subtitle="Active: 18 | Draft: 6" icon={<FileText className="size-5" />} trend="+12%" onClick={() => navigate("/project-analytics")} />
                <AnalyticsCard title="Completion Rate" value="87%" subtitle="On track projects" icon={<TrendingUp className="size-5" />} trend="+5%" />
                <AnalyticsCard title="Pending Review" value="8" subtitle="Awaiting approval" icon={<AlertCircle className="size-5" />} />
                <AnalyticsCard title="Project Staffs" value="42" subtitle="Active project Staffs" icon={<UsersIcon className="size-5" />} trend="+8%" />
              </div>
            </div>

            {/* Fund Analytics */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4 gap-3"><PieChart className="size-6 text-[#0EA5A4]" /><h3 className="text-lg font-semibold text-gray-900">Fund Analytics</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard title="Total Allocation" value="₹4.2Cr" subtitle="Current fiscal year" icon={<PieChart className="size-5" />} trend="+18%" onClick={() => navigate("/fund-analytics")} />
                <AnalyticsCard title="Utilization" value="76%" subtitle="₹3.2Cr utilized" icon={<TrendingUp className="size-5" />} trend="+8%" />
                <AnalyticsCard title="Available Funds" value="₹1.0Cr" subtitle="Remaining balance" icon={<PieChart className="size-5" />} />
                <AnalyticsCard title="Pending Requests" value="₹45L" subtitle="Approval pending" icon={<AlertCircle className="size-5" />} />
              </div>
            </div>
          </section>

          {/* Information Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4 gap-3"><Megaphone className="size-5 text-[#0EA5A4]" /><h3 className="text-lg font-semibold text-gray-900">Recent Updates</h3></div>
              <div className="text-gray-600 space-y-4 border-t border-gray-200 pt-4">
                <div className="flex items-start gap-3"><div className="size-2 bg-[#0EA5A4] rounded-full mt-1.5 flex-shrink-0"></div><div><p className="font-medium text-gray-900">New funding opportunity for AI research</p><p className="text-sm text-gray-500">Deadline: March 15, 2024</p></div></div>
                <div className="flex items-start gap-3"><div className="size-2 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div><div><p className="font-medium text-gray-900">Quarterly review meeting scheduled</p><p className="text-sm text-gray-500">March 10, 2024 | 10:00 AM</p></div></div>
                <div className="flex items-start gap-3"><div className="size-2 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></div><div><p className="font-medium text-gray-900">System maintenance this weekend</p><p className="text-sm text-gray-500">March 9-10, 2024 | 10 PM - 6 AM</p></div></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Quick Resources</h3>
              <ul className="space-y-3 border-t border-gray-200 pt-4">
                <li><a href="#" className="flex items-center text-gray-700 hover:text-[#0EA5A4] p-2 rounded-lg hover:bg-[#E0F7F6]/30 transition-colors group font-medium"><FileText className="size-5 mr-3 text-gray-400 group-hover:text-[#0EA5A4]" /><span>Project Guidelines</span></a></li>
                <li><a href="#" className="flex items-center text-gray-700 hover:text-[#0EA5A4] p-2 rounded-lg hover:bg-[#E0F7F6]/30 transition-colors group font-medium"><LifeBuoy className="size-5 mr-3 text-gray-400 group-hover:text-[#0EA5A4]" /><span>Support Portal</span></a></li>
                <li><a href="#" className="flex items-center text-gray-700 hover:text-[#0EA5A4] p-2 rounded-lg hover:bg-[#E0F7F6]/30 transition-colors group font-medium"><BarChart className="size-5 mr-3 text-gray-400 group-hover:text-[#0EA5A4]" /><span>Analytics Reports</span></a></li>
                <li><a href="#" className="flex items-center text-gray-700 hover:text-[#0EA5A4] p-2 rounded-lg hover:bg-[#E0F7F6]/30 transition-colors group font-medium"><PieChart className="size-5 mr-3 text-gray-400 group-hover:text-[#0EA5A4]" /><span>Financial Templates</span></a></li>
              </ul>
            </div>
          </section>

          <footer className="text-center text-gray-500 mt-10 pb-4">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Mail className="size-4" />
              <p>For any query, e-mail to <a href="mailto:ernd@iitg.ac.in" className="text-[#0EA5A4] hover:underline font-medium">ernd@iitg.ac.in</a></p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default PiHomePage;

