import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { AppSidebar } from "../../components/RndSidebar";
import { ActionCard, AnalyticsCard, CurrentTime } from "../../components/DashboardCards"; // Assuming you extracted components
import {
  ClipboardCheck, Briefcase, BarChart, Users, DollarSign,
  TrendingUp, AlertCircle, FileText, Megaphone, LifeBuoy, Mail
} from "lucide-react";

export function HeadDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name", "user_roles"],
    enabled: !!currentUser,
  });

  const fullName = userData?.full_name || currentUser || "Guest";

  return (
    <div className="bg-[#FDFCEC] min-h-screen font-sans">
      <AppSidebar /> {/* Pass appropriate props */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-extrabold text-black uppercase">Head's Dashboard</h1>
                <p className="text-lg text-neutral-700 font-mono">Welcome, {fullName}</p>
              </div>
              <CurrentTime />
            </div>
          </header>

          {/* Main Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ActionCard
              icon={<ClipboardCheck className="size-6" />}
              title="Pending Approvals"
              description="Review and approve/reject requests from your department."
              onClick={() => navigate("/approvals/pending")}
            />
            <ActionCard
              icon={<Briefcase className="size-6" />}
              title="Department Projects"
              description="Monitor all ongoing and completed projects within your department."
              onClick={() => navigate("/department/projects")}
            />
            <ActionCard
              icon={<BarChart className="size-6" />}
              title="Department Reports"
              description="Generate financial and performance reports for your unit."
              onClick={() => navigate("/department/reports")}
            />
          </section>

          {/* Analytics Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Department Project Analytics */}
            <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
              <div className="flex items-center mb-4 gap-3"><Briefcase className="size-7" /><h3 className="text-xl font-bold text-black uppercase">Department Overview</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard title="Total Projects" value="45" subtitle="In your department" icon={<FileText className="size-5" />} trend="+8%" />
                <AnalyticsCard title="Active PIs" value="12" subtitle="Leading projects" icon={<Users className="size-5" />} />
                <AnalyticsCard title="Pending Approvals" value="14" subtitle="Awaiting your action" icon={<AlertCircle className="size-5" />} />
                <AnalyticsCard title="Completed This Year" value="8" subtitle="Successfully concluded" icon={<TrendingUp className="size-5" />} />
              </div>
            </div>

            {/* Department Fund Analytics */}
            <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
              <div className="flex items-center mb-4 gap-3"><DollarSign className="size-7 text-green-600" /><h3 className="text-xl font-bold text-black uppercase">Department Funds</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard title="Total Allocation" value="₹8.5Cr" subtitle="Current fiscal year" icon={<DollarSign className="size-5" />} />
                <AnalyticsCard title="Utilization Rate" value="68%" subtitle="₹5.78Cr utilized" icon={<TrendingUp className="size-5" />} trend="+11%" />
                <AnalyticsCard title="Pending Requests" value="₹82L" subtitle="Awaiting approval" icon={<AlertCircle className="size-5" />} />
                <AnalyticsCard title="Available Funds" value="₹2.72Cr" subtitle="Remaining balance" icon={<DollarSign className="size-5" />} />
              </div>
            </div>
          </section>

          {/* Information Section */}
          <section className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
            <div className="flex items-center mb-4 gap-3"><Megaphone className="size-6" /><h3 className="text-xl font-bold text-black uppercase">Recent Submissions for Approval</h3></div>
            <div className="text-neutral-700 space-y-4 border-t-2 border-black pt-4 font-mono text-sm">
              <p>Travel Request - Dr. A. Kumar - Project GTY-567</p>
              <p>Direct Purchase - Dr. S. Verma - Project CXD-102</p>
              <p>Honorarium Claim - Dr. R. Singh - Project MNB-901</p>
              <p>General Indent - Dr. P. Sharma - Project GTY-567</p>
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