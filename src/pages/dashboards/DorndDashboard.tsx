import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { AppSidebar } from "../../components/RndSidebar";
import { ActionCard, AnalyticsCard, CurrentTime } from "../../components/DashboardCards";
import {
  CheckSquare, BarChartBig, PieChart, FileText, TrendingUp, AlertCircle,
  Megaphone, Mail, Building, DollarSign
} from "lucide-react";

export function DorndDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name"],
    enabled: !!currentUser,
  });

  const fullName = userData?.full_name || currentUser || "Guest";

  return (
    <div className="bg-[#F0F4F8] min-h-screen font-sans">
      <AppSidebar />
      <div className="flex-1 p-4 md:p-8">
        <div className="w-full mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 ">Dean's R&D Dashboard</h1>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 ">Welcome, {fullName}</p>
              </div>
              <CurrentTime />
            </div>
          </header>

          {/* Main Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <ActionCard
              icon={<CheckSquare className="size-5" />}
              title="Final Approvals"
              description="Review and provide final approval on high-value or critical requests."
              onClick={() => navigate("/dornd/approvals")}
            />
            <ActionCard
              icon={<BarChartBig className="size-5" />}
              title="Institute Analytics"
              description="Access comprehensive analytics on projects, funding, and IPR."
              onClick={() => navigate("/dornd/analytics")}
            />
            <ActionCard
              icon={<Megaphone className="size-5" />}
              title="New Announcement"
              description="Broadcast updates or policy changes to all PIs and staff."
              onClick={() => navigate("/dornd/announce")}
            />
          </section>

          {/* Analytics Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Institute Project Health */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center mb-3 gap-2.5"><Building className="size-5" /><h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 ">Institute Project Health</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard title="Total Active Projects" value="350" subtitle="Across all departments" icon={<FileText className="size-5" />} trend="+15%" />
                <AnalyticsCard title="New Projects (MoM)" value="22" subtitle="Month-over-month growth" icon={<TrendingUp className="size-5" />} trend="+8%" />
                <AnalyticsCard title="Pending Final Approval" value="18" subtitle="Awaiting your action" icon={<AlertCircle className="size-5" />} />
                <AnalyticsCard title="IPRs Filed (YTD)" value="48" subtitle="Patents & Copyrights" icon={<FileText className="size-5" />} trend="+25%" />
              </div>
            </div>

            {/* Institute Financial Health */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center mb-3 gap-2.5"><PieChart className="size-5 text-green-600" /><h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 ">Institute R&D Funds</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard title="Total Sanctioned" value="₹250Cr" subtitle="Current fiscal year" icon={<DollarSign className="size-5" />} />
                <AnalyticsCard title="Overall Utilization" value="71%" subtitle="₹177.5Cr utilized" icon={<TrendingUp className="size-5" />} />
                <AnalyticsCard title="High-Value Requests" value="₹5.2Cr" subtitle="Pending your approval" icon={<AlertCircle className="size-5" />} />
                <AnalyticsCard title="Disbursed (YTD)" value="₹150Cr" subtitle="To projects" icon={<PieChart className="size-5" />} />
              </div>
            </div>
          </section>

          <footer className="text-center text-zinc-600 dark:text-zinc-400 mt-6 pb-2">
            <div className="flex items-center justify-center space-x-2  text-xs">
              <Mail className="size-3.5" />
              <p>For any query, e-mail to <a href="mailto:ernd@iitg.ac.in" className="text-[#0EA5A4] hover:underline font-semibold">ernd@iitg.ac.in</a></p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}