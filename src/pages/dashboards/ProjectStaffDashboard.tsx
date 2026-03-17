
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { AppSidebar } from "../../components/RndSidebar";
import { ActionCard, AnalyticsCard, CurrentTime } from "../../components/DashboardCards";
import {
  FilePlus2, ListTodo, History, FileText, CheckCircle, XCircle,
  Hourglass, Megaphone, LifeBuoy, Mail
} from "lucide-react";

export function ProjectStaffDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name"],
    enabled: !!currentUser,
  });

  const fullName = userData?.full_name || currentUser || "Guest";

  return (
    <div className="min-h-screen dark:bg-zinc-900 font-sans">
      <AppSidebar />
      <div className="flex-1 p-4 md:p-8">
        <div className="w-full mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 ">Staff Dashboard</h1>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 ">Welcome, {fullName}</p>
              </div>
              <CurrentTime />
            </div>
          </header>

          {/* Main Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <ActionCard
              icon={<FilePlus2 className="size-5" />}
              title="File a New Form"
              description="Submit a new request like TA/DA, reimbursement, or purchase."
              onClick={() => navigate("/forms/new")}
            />
            <ActionCard
              icon={<ListTodo className="size-5" />}
              title="Track My Forms"
              description="Check the status of all your submitted forms and requests."
              onClick={() => navigate("/forms/track")}
            />
            <ActionCard
              icon={<History className="size-5" />}
              title="View History"
              description="Access a complete log of your past submissions and activities."
              onClick={() => navigate("/forms/history")}
            />
          </section>

          {/* Analytics & Status Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* My Forms Overview */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center mb-3 gap-2.5"><FileText className="size-5" /><h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 ">My Forms Overview</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard title="Under Process" value="5" subtitle="Awaiting action" icon={<Hourglass className="size-5 text-amber-600" />} />
                <AnalyticsCard title="Approved" value="23" subtitle="In the last 3 months" icon={<CheckCircle className="size-5 text-green-600" />} />
                <AnalyticsCard title="Needs Attention" value="2" subtitle="Reverted or rejected" icon={<XCircle className="size-5 text-red-600" />} />
                <AnalyticsCard title="Total Submitted" value="30" subtitle="In the last 3 months" icon={<FileText className="size-5" />} />
              </div>
            </div>

            {/* Recent Status Updates */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center mb-3 gap-2.5"><Megaphone className="size-5" /><h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 ">Recent Status Updates</h3></div>
              <div className="text-zinc-700 dark:text-zinc-300 space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-4  text-sm">
                <p>✅ Your TA/DA form <span className="font-bold">#TADA-012</span> has been <span className="text-green-600">approved by DORND</span>.</p>
                <p>⏳ Your Purchase Indent <span className="font-bold">#PI-088</span> is now with <span className="text-amber-600">HoS RnD</span>.</p>
                <p>❌ Your Reimbursement <span className="font-bold">#REIM-045</span> was <span className="text-red-600">reverted by HOD</span> with comments.</p>
              </div>
            </div>
          </section>

          {/* Quick Resources */}
          <section className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-base font-bold mb-3 text-zinc-900 dark:text-zinc-100 ">Quick Resources</h3>
            <ul className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <li><a href="#" className="flex items-center text-zinc-900 dark:text-zinc-100 hover:underline group font-semibold"><FileText className="size-5 mr-3 text-zinc-500 dark:text-zinc-400" /><span className="group:text-[#D97757]">Download Form Templates</span></a></li>
              <li><a href="#" className="flex items-center text-zinc-900 dark:text-zinc-100 hover:underline group font-semibold"><LifeBuoy className="size-5 mr-3 text-zinc-500 dark:text-zinc-400" /><span className="group:text-[#D97757]">View Travel Policy</span></a></li>
            </ul>
          </section>

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