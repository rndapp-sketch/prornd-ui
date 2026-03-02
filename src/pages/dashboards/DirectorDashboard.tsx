import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { AppSidebar } from "@/components/RndSidebar";
import { ActionCard, AnalyticsCard, CurrentTime } from "@/components/DashboardCards";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Briefcase, Building2, Landmark, Globe, Users, TrendingUp, CheckCircle,
  FileText, Mail, IndianRupee
} from "lucide-react";
import {
  Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";


// --- Dummy Data (No changes here) ---
const projectStatusByYearData = [
  { year: '2020', ongoing: 45, completed: 30, registered: 50 },
  { year: '2021', ongoing: 55, completed: 35, registered: 60 },
  { year: '2022', ongoing: 60, completed: 42, registered: 75 },
  { year: '2023', ongoing: 75, completed: 50, registered: 80 },
  { year: '2024', ongoing: 85, completed: 25, registered: 40 },
];

const fundingTypeData = [
  { name: 'Government (DST, DBT, etc.)', value: 210 },
  { name: 'Private Sector', value: 85 },
  { name: 'International Agencies', value: 45 },
  { name: 'Internal Institute Funds', value: 10 },
];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const departmentWiseProjects = [
  { name: 'CSE', value: 65 },
  { name: 'ECE', value: 52 },
  { name: 'ME', value: 48 },
  { name: 'CE', value: 45 },
  { name: 'DD', value: 38 },
  { name: 'BSBE', value: 32 },
  { name: 'Others', value: 70 },
];


export function DirectorDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name", "user_roles"],
    enabled: !!currentUser,
  });

  const fullName = userData?.full_name || currentUser || "Guest";
  const isPermanentEmployee = userData?.user_roles?.some((role: any) => role.role === "Permanent Employee") || false;

  const DepartmentTooltipContent = () => (
    <div className="bg-zinc-50 dark:bg-zinc-800 text-[#D97757] p-2 rounded-md border border-white/20  text-xs">
      <h4 className="font-bold mb-1 border-b border-white/20 pb-1">Projects by Department</h4>
      <ul className="space-y-1 mt-2">
        {departmentWiseProjects.map(dept => (
          <li key={dept.name} className="flex justify-between gap-4">
            <span>{dept.name}:</span>
            <span>{dept.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="bg-claude-bg min-h-screen font-sans">
      <AppSidebar />
      <div className="flex-1 p-4 md:p-8">
        <div className="w-full mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 ">Director's Dashboard</h1>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 ">Strategic Overview for {fullName}</p>
              </div>
              <CurrentTime />
            </div>
          </header>

          {/* Top Level Sections */}
          {/* --- CHANGE START: Modified the grid layout --- */}
          <section className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6">
            {/* Column 1: "View All Projects" takes 1 column space */}
            <ActionCard
              icon={<Briefcase className="size-5" />}
              title="View All Projects"
              description="Access a detailed data table of all institute projects."
              onClick={() => navigate("/director/all-projects")}
              className="lg:col-span-1 justify-center text-center" // Changed to col-span-1
            />

            {/* Column 2-4: "Project Overview" takes the remaining 3 column spaces */}
            <div className="lg:col-span-3 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center mb-3 gap-2.5"><Building2 className="size-5" /><h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 ">Project Overview</h3></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <TooltipProvider>
                  <ShadTooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <AnalyticsCard title="Total Projects" value="350" subtitle="Hover for dept. breakdown" icon={<FileText className="size-5" />} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <DepartmentTooltipContent />
                    </TooltipContent>
                  </ShadTooltip>
                </TooltipProvider>

                <AnalyticsCard title="Category" value="260/90" subtitle="Research / Consultancy" icon={<FileText className="size-5" />} />
                <AnalyticsCard title="Completed Projects" value="127" subtitle="Successfully concluded" icon={<CheckCircle className="size-5 text-green-600" />} />
                <AnalyticsCard title="Total Project Staff" value="580" subtitle="Researchers & Assistants" icon={<Users className="size-5" />} trend="+12%" />
              </div>
            </div>

            {/* Row 2: Fund & Collaborators Analytics takes the full 4 column spaces */}
            <div className="lg:col-span-4 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <div className="flex items-center mb-3 gap-2.5"><Landmark className="size-5 text-green-600" /><h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 ">Fund Analytics</h3></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Changed currency symbol and icon */}
                  <AnalyticsCard title="Total Allocation" value="₹250Cr" subtitle="Current fiscal year" icon={<IndianRupee className="size-5" />} />
                  <AnalyticsCard title="Utilization" value="71%" subtitle="₹177.5Cr Utilized" icon={<TrendingUp className="size-5" />} />
                  <AnalyticsCard title="Available Funds" value="₹72.5Cr" subtitle="Remaining balance" icon={<IndianRupee className="size-5" />} />
                </div>
              </div>
              <div>
                <div className="flex items-center mb-3 gap-2.5"><Globe className="size-5 text-[#D97757]" /><h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 ">International Collaborations</h3></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <AnalyticsCard title="Funding Agencies" value="18" subtitle="Active MOUs" icon={<Landmark className="size-5" />} />
                  <AnalyticsCard title="Additional PIs" value="32" subtitle="From partner institutes" icon={<Users className="size-5" />} />
                  <AnalyticsCard title="Co-PIs (Intl)" value="45" subtitle="Across all projects" icon={<Users className="size-5" />} />
                </div>
              </div>
            </div>
          </section>
          {/* --- CHANGE END --- */}


          {/* Charts Section (No changes here) */}
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Bar Chart */}
            <div className="lg:col-span-3 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100  mb-3">Project Status by Year</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectStatusByYearData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="year" tick={{ fontFamily: 'monospace', fontSize: 12 }} />
                    <YAxis tick={{ fontFamily: 'monospace', fontSize: 12 }} />
                    <Tooltip contentStyle={{ fontFamily: 'monospace', border: '2px solid black', borderRadius: '0.5rem' }} />
                    <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 12 }} />
                    <Bar dataKey="registered" stackId="a" fill="#0088FE" name="Registered" />
                    <Bar dataKey="ongoing" stackId="a" fill="#00C49F" name="Ongoing" />
                    <Bar dataKey="completed" stackId="a" fill="#FFBB28" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100  mb-3">Projects by Funding Source</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fundingTypeData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value">
                      {fundingTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontFamily: 'monospace', border: '2px solid black', borderRadius: '0.5rem' }} />
                    <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 12, marginTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Footer (No changes here) */}
          <footer className="text-center text-zinc-600 dark:text-zinc-400 mt-6 pb-2">
            <div className="flex items-center justify-center space-x-2  text-xs">
              <Mail className="size-3.5" />
              <p>For any query, e-mail to <a href="mailto:ernd@iitg.ac.in" className="text-[#D97757] hover:underline font-semibold">ernd@iitg.ac.in</a></p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}