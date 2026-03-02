import * as React from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { useUserRoles } from "../components/UserRole";

// --- Icon Components (unchanged logic, purely visual helpers) ---
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
    <div className="text-sm text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1 rounded-lg shadow-sm">
      {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} <span className="mx-1">|</span> {time.toLocaleTimeString()}
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
    className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-sm hover:shadow-[3px_3px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-2px] transition-all duration-150 cursor-pointer group flex flex-col h-full"
  >
    {/* Icon Container: Added border and bg-blue-50 instead of standard sky-100 for better contrast */}
    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg mb-4 group:bg-gray-800 group:text-white transition-colors duration-150">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">{title}</h3>
    <p className="text-zinc-900 dark:text-zinc-100 flex-grow text-sm font-bold">{description}</p>
  </div>
);

// --- Main Home Component ---
export function Home() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name", "user_roles"],
    enabled: !!currentUser,
  });

  const userName = currentUser || "Guest";
  const fullName = userData?.full_name || "";

  const [showAccountNumber, setShowAccountNumber] = React.useState(false);
  const [showSalary, setShowSalary] = React.useState(false);

  const { roles, isLoading: isRolesLoading } = useUserRoles(currentUser ?? null);

  useEffect(() => {
    if (isRolesLoading || !roles) return;

    // Replicate full role-based redirect logic from Dashboard.tsx
    const isDirector = roles.includes('Director');
    const isDean = roles.includes('Dean, RnD');
    const isHosRnd = roles.includes('Hos, RnD (Head of Section, RnD)');
    const isHead = roles.includes('head_approver_1');
    const isInspiredFaculty = roles.includes('Inspired Faculty');
    const isIndependentResearcher = roles.includes('Independent Researcher');
    const isPermanentEmployee = roles.includes('Permanent Employee');
    const isProjectStaff = roles.includes('project staff');
    const isRndStaff = roles.includes('staff, RnD');

    if (isDirector) {
      navigate('/director-dashboard');
    } else if (isDean) {
      navigate('/dean-dashboard');
    } else if (isHosRnd) {
      navigate('/hos-rnd-dashboard');
    } else if (isHead) {
      navigate('/head-dashboard');
    } else if (isInspiredFaculty || isIndependentResearcher) {
      // These roles stay on /home — do nothing
    } else if (isPermanentEmployee) {
      navigate('/pihomepage');
    } else if (isProjectStaff) {
      navigate('/project-staff-dashboard');
    } else if (isRndStaff) {
      navigate('/rnd-staff-dashboard');
    }
  }, [roles, isRolesLoading, navigate]);

  // Show loading spinner while roles are being fetched to prevent generic Home flash
  if (isRolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-100 dark:bg-zinc-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-zinc-800 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="w-full mx-auto">

          {/* Header */}
          <header className="mb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                {/* No gradients on text, solid colors for brutalism */}
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">R&D Portal</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-bold">Your hub for innovation and project management.</p>
              </div>
              <Clock />
            </div>

            {/* Welcome Banner: Hard borders, solid colors */}
            <div className="bg-emerald-50 border border-zinc-400 dark:border-zinc-600 text-emerald-900 p-4 rounded-lg shadow-sm flex items-center">
              <div className="w-2 h-2 bg-emerald-600 rounded-full mr-3 animate-pulse"></div>
              <p className="font-bold text-lg">Welcome back, {fullName || userName}!</p>
            </div>
          </header>

          {/* User Information Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

            {/* Card 1: Your Information */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-sm">
              <div className="flex items-center mb-5 pb-4 border-b-2 border-zinc-300 dark:border-zinc-700">
                <div className="w-10 h-10 mr-4 text-zinc-900 dark:text-zinc-100 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Your Information</h3>
              </div>

              <div className="text-zinc-900 dark:text-zinc-100 space-y-4 font-bold">
                <div className="flex justify-between items-center p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors">
                  <span className="text-zinc-700 dark:text-zinc-300">Term Completion</span>
                  <span className="font-bold">2026-04-21</span>
                </div>

                <div className="flex justify-between items-center p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors">
                  <span className="text-zinc-700 dark:text-zinc-300">Account Number</span>
                  <span className="flex items-center gap-3 font-mono font-bold">
                    {showAccountNumber ? '123456781234' : '•••• •••• 1234'}
                    <button onClick={() => setShowAccountNumber(!showAccountNumber)} className="text-zinc-900 dark:text-zinc-100 hover:bg-white dark:bg-zinc-900 p-1 rounded-md border border-zinc-300 dark:border-zinc-700 transition-all">
                      {showAccountNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </span>
                </div>

                <div className="flex justify-between items-center p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors">
                  <span className="text-zinc-700 dark:text-zinc-300">Salary Basic</span>
                  <span className="flex items-center gap-3 font-mono font-bold">
                    {showSalary ? '₹ 50,000.00' : '₹ ••••••'}
                    <button onClick={() => setShowSalary(!showSalary)} className="text-zinc-900 dark:text-zinc-100 hover:bg-white dark:bg-zinc-900 p-1 rounded-md border border-zinc-300 dark:border-zinc-700 transition-all">
                      {showSalary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </span>
                </div>

                <div className="flex justify-between items-center p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors">
                  <span className="text-zinc-700 dark:text-zinc-300">Hostel</span>
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-400 dark:border-zinc-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">No</span>
                </div>

                <div className="flex justify-between items-center p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors">
                  <span className="text-zinc-700 dark:text-zinc-300">HRA</span>
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Yes</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg text-sm text-amber-900 font-bold flex items-start">
                <Info className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <p>For discrepancies, please contact the R&D Staff immediately.</p>
              </div>
            </div>

            {/* Card 2: Leave & Policies */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-sm flex flex-col">
              <div className="flex items-center mb-5 pb-4 border-b-2 border-zinc-300 dark:border-zinc-700">
                <div className="w-10 h-10 mr-4 text-zinc-900 dark:text-zinc-100 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg">
                  <Info className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Leave & Policies</h3>
              </div>

              <div className="text-zinc-900 dark:text-zinc-100 flex-grow flex flex-col justify-center text-center py-6">
                <div className="mb-8 p-6 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg">
                  <p className="font-bold text-blue-900">Need to take time off?</p>
                  <p className="text-sm text-blue-800 mt-1 font-bold">Review your balance and apply below.</p>
                </div>

                <button
                  onClick={() => navigate("/leave-application")}
                  className="w-full bg-gray-800 text-white font-bold py-4 px-4 rounded-lg border-2 border-gray-800 shadow-sm hover:shadow-[3px_3px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-2px] transition-all duration-150 active:translate-y-0 active:shadow-none"
                >
                  Apply for Leave
                </button>
              </div>
            </div>
          </section>

          {/* Main Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <ActionCard
              icon={<PlusCircle className="w-6 h-6" />}
              title="Register Project"
              description="Start a new research or development initiative by registering it."
              onClick={() => navigate("/project-registration")}
            />
            <ActionCard
              icon={<LayoutGrid className="w-6 h-6" />}
              title="View Projects"
              description="Browse, track, and manage all ongoing and completed projects."
              onClick={() => navigate("/projects")}
            />
            <ActionCard
              icon={<UserPlus className="w-6 h-6" />}
              title="Create User"
              description="Add new team members to the portal and assign roles."
              onClick={() => navigate("/user-creation")}
            />
          </section>

          {/* Secondary Information Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 mr-3 text-zinc-900 dark:text-zinc-100"><Megaphone /></div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Announcements</h3>
              </div>
              <div className="text-zinc-700 dark:text-zinc-300 space-y-2 border-t-2 border-zinc-300 dark:border-zinc-700 pt-4 font-bold italic">
                <p>No new announcements. Please check back later for updates.</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-sm">
              <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">Resources</h3>
              <ul className="space-y-3 border-t-2 border-zinc-200 dark:border-zinc-800 pt-4">
                <li>
                  <a href="#" className="flex items-center text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg transition-colors group font-bold">
                    <FileText className="w-5 h-5 mr-3 text-zinc-500 dark:text-zinc-400 group:text-zinc-900 dark:text-zinc-100" />
                    <span>Portal Docs</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg transition-colors group font-bold">
                    <LifeBuoy className="w-5 h-5 mr-3 text-zinc-500 dark:text-zinc-400 group:text-zinc-900 dark:text-zinc-100" />
                    <span>Contact Support</span>
                  </a>
                </li>
              </ul>
            </div>
          </section>

          {/* Bottom Banner */}
          <section className="bg-gray-800 text-white p-8 rounded-lg border border-zinc-400 dark:border-zinc-600 shadow-sm text-center my-12 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 2000 1500\'%3e%3crect fill=\'%23ffffff\' width=\'2000\' height=\'1500\'/%3e%3cdefs%3e%3cpath fill=\'none\' stroke-width=\'2\' stroke-opacity=\'1\' id=\'a\' d=\'M0 750c250 0 250 0 500 0s250 0 500 0s250 0 500 0s250 0 500 0\'/%3e%3c/defs%3e%3cg transform=\'translate(0 0)\'%3e%3cuse xlink:href=\'%23a\' y=\'-150\' transform=\'rotate(5 1000 750)\' stroke=\'%23000000\'/%3e%3cuse xlink:href=\'%23a\' y=\'-100\' transform=\'rotate(10 1000 750)\' stroke=\'%23000000\'/%3e%3c/g%3e%3c/svg%3e")' }}></div>

            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2 tracking-tight">RnDOPs Automation System</h2>
              <p className="text-zinc-300 dark:text-zinc-600 font-bold">The Research & Development Section welcomes you to the future of project management.</p>
            </div>
          </section>

          <footer className="text-center text-zinc-700 dark:text-zinc-300 mt-12 pb-8 font-bold">
            <div className="flex items-center justify-center space-x-2">
              <Mail className="w-5 h-5" />
              <p>For any query, e-mail to <a href="mailto:ernd@iitg.ac.in" className="text-zinc-900 dark:text-zinc-100 hover:underline decoration-2">ernd@iitg.ac.in</a></p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default Home;