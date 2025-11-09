import * as React from "react";
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
    <div className="bg-[#FDFCEC] min-h-screen font-sans">
      <AppSidebar isPermanentEmployee={true} />
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-extrabold text-black uppercase">Staff Dashboard</h1>
                <p className="text-lg text-neutral-700 font-mono">Welcome, {fullName}</p>
              </div>
              <CurrentTime />
            </div>
          </header>

          {/* Main Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ActionCard 
              icon={<FilePlus2 className="size-6"/>}
              title="File a New Form"
              description="Submit a new request like TA/DA, reimbursement, or purchase."
              onClick={() => navigate("/forms/new")}
            />
            <ActionCard 
              icon={<ListTodo className="size-6"/>}
              title="Track My Forms"
              description="Check the status of all your submitted forms and requests."
              onClick={() => navigate("/forms/track")}
            />
            <ActionCard 
              icon={<History className="size-6"/>}
              title="View History"
              description="Access a complete log of your past submissions and activities."
              onClick={() => navigate("/forms/history")}
            />
          </section>

          {/* Analytics & Status Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* My Forms Overview */}
            <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
              <div className="flex items-center mb-4 gap-3"><FileText className="size-7"/><h3 className="text-xl font-bold text-black uppercase">My Forms Overview</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard title="Under Process" value="5" subtitle="Awaiting action" icon={<Hourglass className="size-5 text-amber-600" />} />
                <AnalyticsCard title="Approved" value="23" subtitle="In the last 3 months" icon={<CheckCircle className="size-5 text-green-600" />} />
                <AnalyticsCard title="Needs Attention" value="2" subtitle="Reverted or rejected" icon={<XCircle className="size-5 text-red-600" />}/>
                <AnalyticsCard title="Total Submitted" value="30" subtitle="In the last 3 months" icon={<FileText className="size-5" />} />
              </div>
            </div>

            {/* Recent Status Updates */}
            <div className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                <div className="flex items-center mb-4 gap-3"><Megaphone className="size-7" /><h3 className="text-xl font-bold text-black uppercase">Recent Status Updates</h3></div>
                <div className="text-neutral-700 space-y-3 border-t-2 border-black pt-4 font-mono text-sm">
                    <p>✅ Your TA/DA form <span className="font-bold">#TADA-012</span> has been <span className="text-green-600">approved by DORND</span>.</p>
                    <p>⏳ Your Purchase Indent <span className="font-bold">#PI-088</span> is now with <span className="text-amber-600">HoS RnD</span>.</p>
                    <p>❌ Your Reimbursement <span className="font-bold">#REIM-045</span> was <span className="text-red-600">reverted by HOD</span> with comments.</p>
                </div>
            </div>
          </section>

          {/* Quick Resources */}
           <section className="bg-white p-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
              <h3 className="text-xl font-bold mb-4 text-black uppercase">Quick Resources</h3>
              <ul className="space-y-3 border-t-2 border-black pt-4">
                <li><a href="#" className="flex items-center text-black hover:underline group font-semibold"><FileText className="size-5 mr-3 text-neutral-500"/><span className="group-hover:text-blue-600">Download Form Templates</span></a></li>
                <li><a href="#" className="flex items-center text-black hover:underline group font-semibold"><LifeBuoy className="size-5 mr-3 text-neutral-500"/><span className="group-hover:text-blue-600">View Travel Policy</span></a></li>
              </ul>
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