import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { AppSidebar } from "../../components/RndSidebar";
import { ActionCard, AnalyticsCard, CurrentTime } from "../../components/DashboardCards";
import {
  ClipboardCheck, Users, BarChart3, FolderKanban, Zap, Clock,
  AlertCircle, Megaphone, Mail, Filter
} from "lucide-react";

export function HosRndDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name"],
    enabled: !!currentUser,
  });

  const fullName = userData?.full_name || currentUser || "Guest";

  return (
    <div className="bg-[#FDFCEC] min-h-screen font-sans">
      <AppSidebar />
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-extrabold text-black uppercase">HoS R&D Dashboard</h1>
                <p className="text-lg text-neutral-700 font-mono">Welcome, {fullName}</p>
              </div>
              <CurrentTime />
            </div>
          </header>

          {/* Main Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ActionCard
              icon={<ClipboardCheck className="size-6" />}
              title="Section Approvals"
              description="Approve forms forwarded by the R&D processing staff."
              onClick={() => navigate("/hos-rnd/approvals")}
            />
            <ActionCard
              icon={<Users className="size-6" />}
              title="Team's Queue"
              description="Monitor the workload and performance of your section's staff."
              onClick={() => navigate("/hos-rnd/team-queue")}
            />
            <ActionCard
              icon={<BarChart3 className="size-6" />}
              title="Performance Reports"
              description="Analyze processing times and identify workflow bottlenecks."
              onClick={() => navigate("/hos-rnd/reports")}
            />
          </section>

          {/* Analytics Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Team Performance */}
            <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
              <div className="flex items-center mb-4 gap-3"><Users className="size-7" /><h3 className="text-xl font-bold text-black uppercase">Team Performance</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard title="Pending My Approval" value="21" subtitle="Awaiting your action" icon={<AlertCircle className="size-5" />} />
                <AnalyticsCard title="Total in Team Queue" value="112" subtitle="Across all staff" icon={<FolderKanban className="size-5" />} />
                <AnalyticsCard title="Team Avg. Time" value="2.8 Days" subtitle="Per form" icon={<Clock className="size-5" />} trend="-0.2d" />
                <AnalyticsCard title="Team Throughput" value="45/day" subtitle="Forms processed" icon={<Zap className="size-5" />} />
              </div>
            </div>

            {/* Workflow Bottlenecks */}
            <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
              <div className="flex items-center mb-4 gap-3"><Filter className="size-7" /><h3 className="text-xl font-bold text-black uppercase">Workflow Hotspots</h3></div>
              <div className="text-neutral-700 space-y-3 border-t-2 border-black pt-4 font-mono text-sm">
                <p>🐢 Slowest Form: <span className="font-bold">Rate Contract (Avg: 5.2 days)</span></p>
                <p>🔥 Busiest Dept: <span className="font-bold">CSE (48 active forms)</span></p>
                <p>📈 High Volume: <span className="font-bold">General Indent requests up 30%</span></p>
              </div>
            </div>
          </section>

          <footer className="text-center text-neutral-600 mt-10 pb-4">
            <div className="flex items-center justify-center space-x-2 font-mono text-sm">
              <Mail className="size-4" />
              <p>For any query, e-mail to <a href="mailto:ernd@iitg.ac.in" className="text-blue-600 hover:underline font-semibold">ernd@iitg.ac.in</a></p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}