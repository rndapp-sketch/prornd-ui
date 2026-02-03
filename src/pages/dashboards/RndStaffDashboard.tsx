import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { AppSidebar } from "../../components/RndSidebar";
import { ActionCard, AnalyticsCard, CurrentTime } from "../../components/DashboardCards";
import {
  FolderKanban, Search, History, FileStack, Zap, Clock,
  AlertCircle, Megaphone, LifeBuoy, Mail
} from "lucide-react";

export function RndStaffDashboard() {
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
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-black ">R&D Processing Dashboard</h1>
                <p className="text-lg text-gray-700 ">Welcome, {fullName}</p>
              </div>
              <CurrentTime />
            </div>
          </header>

          {/* Main Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ActionCard
              icon={<FolderKanban className="size-6" />}
              title="Review Queue"
              description="Process and forward forms awaiting your review."
              onClick={() => navigate("/rnd/queue")}
            />
            <ActionCard
              icon={<Search className="size-6" />}
              title="Search All Forms"
              description="Find any form in the system by its ID, PI name, or project."
              onClick={() => navigate("/rnd/search")}
            />
            <ActionCard
              icon={<History className="size-6" />}
              title="My Processing History"
              description="View a log of all the forms you have processed."
              onClick={() => navigate("/rnd/my-history")}
            />
          </section>

          {/* Analytics Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Processing Queue */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4 gap-3"><FileStack className="size-7" /><h3 className="text-xl font-bold text-black ">Processing Queue Status</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard title="New in Queue" value="38" subtitle="Awaiting review" icon={<AlertCircle className="size-5" />} />
                <AnalyticsCard title="Processed Today" value="15" subtitle="Forwarded or reverted" icon={<Zap className="size-5" />} trend="+20%" />
                <AnalyticsCard title="Avg. Process Time" value="2.1 Days" subtitle="For your actions" icon={<Clock className="size-5" />} />
                <AnalyticsCard title="Overdue Items" value="4" subtitle="Exceeded SLA" icon={<AlertCircle className="size-5 text-red-600" />} />
              </div>
            </div>

            {/* Recently Assigned */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4 gap-3"><Megaphone className="size-7" /><h3 className="text-xl font-bold text-black ">Recently Assigned</h3></div>
              <div className="text-gray-700 space-y-3 border-t border-gray-200 pt-4  text-sm">
                <p>New <span className="font-bold">Direct Purchase</span> form from HOD (CSE)</p>
                <p>New <span className="font-bold">TA-DA Settle</span> form from HOC (EEE)</p>
                <p>New <span className="font-bold">General Indent</span> from HOD (MECH)</p>
              </div>
            </div>
          </section>

          <footer className="text-center text-gray-600 mt-10 pb-4">
            <div className="flex items-center justify-center space-x-2  text-sm">
              <Mail className="size-4" />
              <p>Internal queries? Contact HoS R&D section.</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}