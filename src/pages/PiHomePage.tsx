// new neo design


import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { AppSidebar } from "../components/RndSidebar";
import { 
    PlusCircle, LayoutGrid, FileText, BarChart, PieChart, TrendingUp, 
    AlertCircle, Megaphone, LifeBuoy, Mail, Clock, 
    UsersIcon
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
        <div className="font-mono text-sm text-neutral-700 text-right">
            <div>{time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div>{time.toLocaleTimeString()}</div>
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
        className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer group flex flex-col"
    >
        <div className="flex-shrink-0 flex items-center justify-center size-12 bg-black text-white rounded-lg border-2 border-black mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-2 text-black uppercase">{title}</h3>
        <p className="text-neutral-700 flex-grow text-sm font-mono">{description}</p>
    </div>
);

const AnalyticsCard: React.FC<{ title: string; value: string; subtitle: string; icon: React.ReactNode; trend?: string; onClick?: () => void; }> = 
({ title, value, subtitle, icon, trend, onClick }) => (
    <div
        onClick={onClick}
        className={cn("p-4 rounded-lg border-2 border-black", onClick ? 'cursor-pointer hover:bg-stone-50' : '')}
    >
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-black uppercase">{title}</h3>
            <div className="text-black">{icon}</div>
        </div>
        <div className="text-3xl font-bold text-black">{value}</div>
        <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-neutral-600 font-mono">{subtitle}</div>
            {trend && (<div className={`text-xs font-bold ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{trend}</div>)}
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

  return (
    <div className=" bg-[#FDFCEC] min-h-screen  font-sans">
      <AppSidebar isPermanentEmployee={isPermanentEmployee} />
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-extrabold text-black uppercase">Dashboard</h1>
                <p className="text-lg text-neutral-700 font-mono">Welcome back, {fullName}</p>
              </div>
              <CurrentTime />
            </div>
          </header>

          {/* Main Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ActionCard 
              icon={<PlusCircle className="size-6"/>}
              title="New Project"
              description="Start a new research or development initiative."
              onClick={() => navigate("/project-registration")}
            />
            <ActionCard 
              icon={<LayoutGrid className="size-6"/>}
              title="View Projects"
              description="Browse, track, and manage all ongoing and completed projects."
              onClick={() => navigate("/projects-view")}
            />
            <ActionCard 
              icon={<Clock className="size-6"/>}
              title="Pending Tasks"
              description="Review and take action on your assigned tasks and approvals."
              onClick={() => navigate("/projects-view", { state: { filter: "Application Under Process" } })}
            />
          </section>

          {/* Analytics Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Project Analytics */}
            <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
              <div className="flex items-center mb-4 gap-3"><BarChart className="size-7"/><h3 className="text-xl font-bold text-black uppercase">Project Overview</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard title="Total Projects" value="24" subtitle="Active: 18 | Draft: 6" icon={<FileText className="size-5" />} trend="+12%" onClick={() => navigate("/project-analytics")}/>
                <AnalyticsCard title="Completion Rate" value="87%" subtitle="On track projects" icon={<TrendingUp className="size-5" />} trend="+5%"/>
                <AnalyticsCard title="Pending Review" value="8" subtitle="Awaiting approval" icon={<AlertCircle className="size-5" />}/>
                <AnalyticsCard title="Project Staffs" value="42" subtitle="Active project Staffs" icon={<UsersIcon className="size-5" />} trend="+8%"/>
              </div>
            </div>

            {/* Fund Analytics */}
            <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                <div className="flex items-center mb-4 gap-3"><PieChart className="size-7 text-green-600" /><h3 className="text-xl font-bold text-black uppercase">Fund Analytics</h3></div>
                <div className="grid grid-cols-2 gap-4">
                    <AnalyticsCard title="Total Allocation" value="₹4.2Cr" subtitle="Current fiscal year" icon={<PieChart className="size-5" />} trend="+18%" onClick={() => navigate("/fund-analytics")}/>
                    <AnalyticsCard title="Utilization" value="76%" subtitle="₹3.2Cr utilized" icon={<TrendingUp className="size-5" />} trend="+8%"/>
                    <AnalyticsCard title="Available Funds" value="₹1.0Cr" subtitle="Remaining balance" icon={<PieChart className="size-5" />}/>
                    <AnalyticsCard title="Pending Requests" value="₹45L" subtitle="Approval pending" icon={<AlertCircle className="size-5" />}/>
                </div>
            </div>
          </section>

          {/* Information Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
              <div className="flex items-center mb-4 gap-3"><Megaphone className="size-6"/><h3 className="text-xl font-bold text-black uppercase">Recent Updates</h3></div>
              <div className="text-neutral-700 space-y-4 border-t-2 border-black pt-4">
                <div className="flex items-start gap-3"><div className="size-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div><div><p className="font-semibold">New funding opportunity for AI research</p><p className="text-sm text-neutral-500 font-mono">Deadline: March 15, 2024</p></div></div>
                <div className="flex items-start gap-3"><div className="size-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div><div><p className="font-semibold">Quarterly review meeting scheduled</p><p className="text-sm text-neutral-500 font-mono">March 10, 2024 | 10:00 AM</p></div></div>
                <div className="flex items-start gap-3"><div className="size-2 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></div><div><p className="font-semibold">System maintenance this weekend</p><p className="text-sm text-neutral-500 font-mono">March 9-10, 2024 | 10 PM - 6 AM</p></div></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
              <h3 className="text-xl font-bold mb-4 text-black uppercase">Quick Resources</h3>
              <ul className="space-y-3 border-t-2 border-black pt-4">
                <li><a href="#" className="flex items-center text-black hover:underline group font-semibold"><FileText className="size-5 mr-3 text-neutral-500"/><span className="group-hover:text-blue-600">Project Guidelines</span></a></li>
                <li><a href="#" className="flex items-center text-black hover:underline group font-semibold"><LifeBuoy className="size-5 mr-3 text-neutral-500"/><span className="group-hover:text-blue-600">Support Portal</span></a></li>
                <li><a href="#" className="flex items-center text-black hover:underline group font-semibold"><BarChart className="size-5 mr-3 text-neutral-500"/><span className="group-hover:text-blue-600">Analytics Reports</span></a></li>
                <li><a href="#" className="flex items-center text-black hover:underline group font-semibold"><PieChart className="size-5 mr-3 text-neutral-500"/><span className="group-hover:text-blue-600">Financial Templates</span></a></li>
              </ul>
            </div>
          </section>
          
          <footer className="text-center text-neutral-600 mt-10 pb-4">
            <div className="flex items-center justify-center space-x-2 font-mono text-sm">
              <Mail className="size-4"/>
              <p>For any query, e-mail to <a href="mailto:ernd@iitg.ac.in" className="text-blue-600 hover:underline font-semibold">ernd@iitg.ac.in</a></p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default PiHomePage;

