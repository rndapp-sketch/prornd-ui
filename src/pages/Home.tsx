


// ================================================================================================================


import * as React from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk"; // Import Frappe hooks
import { AppSidebar } from "../components/RndSidebar";

// --- Icon Components (using inline SVG for portability) ---
const PlusCircle: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const UserPlus: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);

const LayoutGrid: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </svg>
);

const FileText: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const LifeBuoy: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
    <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
    <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
    <line x1="9.17" y1="14.83" x2="4.93" y2="19.07" />
  </svg>
);

const Megaphone: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m3 11 18-5v12L3 14v-3z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

const User: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const Info: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const Mail: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const Eye: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

// --- Child Components ---
const Clock = () => {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="text-sm text-slate-500 font-medium">
      {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | {time.toLocaleTimeString()}
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
    className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-sky-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col"
  >
    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-sky-100 text-sky-600 rounded-lg mb-4 group-hover:bg-sky-600 group-hover:text-white transition-colors duration-300">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2 text-slate-800">{title}</h3>
    <p className="text-slate-500 flex-grow text-sm">{description}</p>
  </div>
);

// --- Main Home Component ---
export function Home() { // Removed props from here
  const navigate = useNavigate(); // Initialize useNavigate
  const { currentUser } = useFrappeAuth();
  const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name", "user_roles"], // Fetch full_name and user_roles
    enabled: !!currentUser,
  });

  const userName = currentUser || "Guest";
  const fullName = userData?.full_name || "";

  const [showAccountNumber, setShowAccountNumber] = React.useState(false);
  const [showSalary, setShowSalary] = React.useState(false);

  const isPermanentEmployee = userData?.user_roles?.some((role: any) => role.role === "Permanent Employee") || false;
  console.log("isPermanentEmployee :", isPermanentEmployee)
  // Redirect Permanent Employees to PI Home Page
  if (isPermanentEmployee) {
    navigate("/pihomepage");
    return null; // Prevent rendering Home content for permanent employees
  }

  return (
    <div >
      <AppSidebar />
      <div className="flex-1 bg-slate-50 p-4 sm:p-6 md:p-8 font-sans">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-12">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">R&D Portal</h1>
                <p className="text-slate-600 mt-1">Your hub for innovation and project management.</p>
              </div>
              <Clock />
            </div>
            <div className="bg-gradient-to-r from-green-50 to-cyan-50 border-l-4 border-green-400 text-green-800 p-4 rounded-r-lg shadow-sm">
              <p className="font-semibold text-lg">Welcome back, {fullName || userName}!</p>
            </div>
          </header>

          {/* User Information Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl shadow-lg border border-slate-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 mr-4 text-slate-500 flex items-center justify-center bg-slate-100 rounded-lg"><User /></div>
                <h3 className="text-2xl font-semibold text-slate-800">Your Information</h3>
              </div>
              <div className="border-t border-slate-200 pt-4 text-slate-700 space-y-3">
                <div className="flex justify-between items-center"><strong>Term Completion:</strong> <span>2026-04-21</span></div>
                <div className="flex justify-between items-center">
                  <strong>Account Number:</strong>
                  <span className="flex items-center gap-2 font-mono">
                    {showAccountNumber ? '123456781234' : '•••• •••• 1234'}
                    <button onClick={() => setShowAccountNumber(!showAccountNumber)} className="text-sky-600 hover:text-sky-800 p-1 rounded-full hover:bg-sky-100 transition-colors">
                      {showAccountNumber ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <strong>Salary Basic:</strong>
                  <span className="flex items-center gap-2 font-mono">
                    {showSalary ? '₹ 50,000.00' : '₹ ••••••'}
                    <button onClick={() => setShowSalary(!showSalary)} className="text-sky-600 hover:text-sky-800 p-1 rounded-full hover:bg-sky-100 transition-colors">
                      {showSalary ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </span>
                </div>
                <div className="flex justify-between items-center"><strong>Hostel:</strong><span className="bg-slate-200 text-slate-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full">No</span></div>
                <div className="flex justify-between items-center"><strong>HRA:</strong><span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-full">Yes</span></div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <p>For discrepancies, please contact the R&D Staff.</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl shadow-lg border border-slate-200 flex flex-col">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 mr-4 text-slate-500 flex items-center justify-center bg-slate-100 rounded-lg"><Info /></div>
                <h3 className="text-2xl font-semibold text-slate-800">Leave & Policies</h3>
              </div>
              <div className="border-t border-slate-200 pt-4 text-slate-700 flex-grow flex flex-col justify-center text-center">
                <p className="mb-4">Need to take some time off? Apply for leave here.</p>
                <button
                  onClick={() => navigate("/leave-application")} // Use navigate
                  className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg hover:from-sky-600 hover:to-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transform hover:scale-105"
                >
                  Apply for Leave
                </button>
              </div>
            </div>
          </section>

          {/* Main Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <ActionCard
              icon={<PlusCircle className="w-6 h-6" />}
              title="Register New Project"
              description="Start a new research or development initiative by registering it in the portal."
              onClick={() => navigate("/project-registration")} // Use navigate
            />
            <ActionCard
              icon={<LayoutGrid className="w-6 h-6" />}
              title="View All Projects"
              description="Browse, track, and manage all ongoing and completed R&D projects."
              onClick={() => navigate("/projects")} // Use navigate
            />
            <ActionCard
              icon={<UserPlus className="w-6 h-6" />}
              title="Create New User"
              description="Add new team members to the portal and assign them to projects."
              onClick={() => navigate("/user-creation")} // Use navigate
            />
          </section>

          {/* Secondary Information Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-slate-200">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 mr-3 text-slate-500"><Megaphone /></div>
                <h3 className="text-2xl font-semibold text-slate-800">Announcements</h3>
              </div>
              <div className="text-slate-600 space-y-2 border-t pt-4">
                <p>No new announcements. Please check back later for updates.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
              <h3 className="text-2xl font-semibold mb-4 text-slate-800">Resources</h3>
              <ul className="space-y-4 border-t pt-4">
                <li><a href="#" className="flex items-center text-sky-600 hover:underline group"><FileText className="w-5 h-5 mr-3 text-slate-400 group-hover:text-sky-600 transition-colors" /><span>Portal Documentation</span></a></li>
                <li><a href="#" className="flex items-center text-sky-600 hover:underline group"><LifeBuoy className="w-5 h-5 mr-3 text-slate-400 group-hover:text-sky-600 transition-colors" /><span>Contact Support</span></a></li>
              </ul>
            </div>
          </section>

          <section className="bg-slate-800 text-white p-8 rounded-xl shadow-2xl text-center my-12" style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 2000 1500\'%3e%3crect fill=\'%231e293b\' width=\'2000\' height=\'1500\'/%3e%3cdefs%3e%3cpath fill=\'none\' stroke-width=\'1\' stroke-opacity=\'0.1\' id=\'a\' d=\'M0 750c250 0 250 0 500 0s250 0 500 0s250 0 500 0s250 0 500 0\'/%3e%3c/defs%3e%3cg transform=\'translate(0 0)\'%3e%3cuse xlink:href=\'%23a\' y=\'-150\' transform=\'rotate(5 1000 750)\' stroke=\'%2364748b\'/%3e%3cuse xlink:href=\'%23a\' y=\'-100\' transform=\'rotate(10 1000 750)\' stroke=\'%2364748b\'/%3e%3cuse xlink:href=\'%23a\' y=\'-50\' transform=\'rotate(15 1000 750)\' stroke=\'%2364748b\'/%3e%3cuse xlink:href=\'%23a\' y=\'0\' transform=\'rotate(20 1000 750)\' stroke=\'%2364748b\'/%3e%3cuse xlink:href=\'%23a\' y=\'50\' transform=\'rotate(25 1000 750)\' stroke=\'%2364748b\'/%3e%3cuse xlink:href=\'%23a\' y=\'100\' transform=\'rotate(30 1000 750)\' stroke=\'%2364748b\'/%3e%3cuse xlink:href=\'%23a\' y=\'150\' transform=\'rotate(35 1000 750)\' stroke=\'%2364748b\'/%3e%3c/g%3e%3c/svg%3e")' }}>
            <h2 className="text-3xl font-bold mb-2">RnDOPs Automation System</h2>
            <p className="text-slate-300">The Research & Development Section welcomes you to the future of project management.</p>
          </section>

          <footer className="text-center text-slate-500 mt-12 pb-4">
            <div className="flex items-center justify-center space-x-2">
              <Mail className="w-5 h-5" />
              <p>For any query, e-mail to <a href="mailto:ernd@iitg.ac.in" className="text-sky-600 hover:underline">ernd@iitg.ac.in</a></p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default Home;
