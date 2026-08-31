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
    <div className="text-sm text-[#3F3F46] dark:text-[#E4E4E7] font-bold border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1 rounded-lg shadow-sm">
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
    className="bg-white dark:bg-[#27272A] p-6 rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group flex flex-col h-full"
  >
    <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 bg-[#4A6CF7]/10 dark:bg-[#4A6CF7]/15 text-[#4A6CF7] dark:text-[#818CF8] rounded-lg mb-4 group-hover:bg-[#4A6CF7]/20 transition-colors duration-150">
      {icon}
    </div>
    <h3 className="text-sm font-semibold mb-1 text-[#3F3F46] dark:text-[#E4E4E7]">{title}</h3>
    <p className="text-[#71717A] dark:text-[#A1A1AA] flex-grow text-xs leading-relaxed">{description}</p>
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
    const isAdoRnd = roles.includes('Ado_RnD');
    const isHosRnd = roles.includes('Hos, RnD (Head of Section, RnD)');
    const isHead = roles.includes('head_approver_1');
    const isInspiredFaculty = roles.includes('Inspired Faculty');
    const isIndependentResearcher = roles.includes('Independent Researcher');
    const isPermanentEmployee = roles.includes('Permanent Employee');
    const isProjectStaff = roles.includes('project staff');
    const isRndStaff = roles.includes('staff, RnD');
    const isStudent = roles.includes('Student');

    if (isDirector) {
      navigate('/director-dashboard');
    } else if (isDean) {
      navigate('/dean-dashboard');
    } else if (isAdoRnd) {
      navigate('/ado-rnd-dashboard');
    } else if (isHosRnd) {
      navigate('/hos-rnd-dashboard');
    } else if (isHead) {
      navigate('/head-dashboard');
    } else if (isRndStaff) {
      // RnD staff before project staff as they have broader scope
      navigate('/rnd-staff-dashboard');
    } else if (isStudent) {
      // Student before project staff — a student tied to a project can also
      // carry the "project staff" role, but should still land on their own
      // dashboard, not the project staff one.
      navigate('/student-dashboard');
    } else if (isProjectStaff) {
      navigate('/project-staff-dashboard');
    } else if (isInspiredFaculty || isIndependentResearcher) {
      // These roles stay on /home — do nothing
    } else if (isPermanentEmployee) {
      navigate('/pihomepage');
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
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans text-[#3F3F46] dark:text-[#E4E4E7]">
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-5xl mx-auto">

          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-6 rounded-full bg-[#4A6CF7]" />
                  <h1 className="text-2xl font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7]">R&D Portal</h1>
                </div>
                <p className="text-[#71717A] dark:text-[#A1A1AA] ml-3 text-sm">Your hub for research and project management.</p>
              </div>
              <Clock />
            </div>

            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-[#EEF2FF] to-[#F0F9FF] dark:from-[#4A6CF7]/10 dark:to-[#0EA5E9]/5 border border-[#4A6CF7]/20 dark:border-[#4A6CF7]/15 p-4 rounded-xl flex items-center gap-3">
              <div className="w-2 h-2 bg-[#4A6CF7] rounded-full animate-pulse flex-shrink-0" />
              <p className="font-bold text-sm text-[#1E3A8A] dark:text-[#93C5FD]">Welcome back, {fullName || userName}!</p>
              <div className="ml-auto text-[10px] font-bold uppercase tracking-widest text-[#4A6CF7]/60 dark:text-[#60A5FA]/50 hidden md:block">
                IIT Guwahati · R&D Operations
              </div>
            </div>
          </header>

          {/* User Information Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">

            {/* Card 1: Your Information */}
            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] flex items-center gap-2.5">
                <div className="w-7 h-7 flex items-center justify-center bg-[#4A6CF7]/10 text-[#4A6CF7] rounded-lg flex-shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-widest">Your Information</h3>
              </div>

              <div className="divide-y divide-[#F4F4F5] dark:divide-[#27272A] px-5">
                <div className="flex justify-between items-center py-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Term Completion</span>
                  <span className="text-[13px] font-semibold text-[#27272A] dark:text-[#E4E4E7] font-mono">2026-04-21</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Account Number</span>
                  <span className="flex items-center gap-2 text-[13px] font-mono text-[#27272A] dark:text-[#E4E4E7]">
                    {showAccountNumber ? '123456781234' : '•••• •••• 1234'}
                    <button onClick={() => setShowAccountNumber(!showAccountNumber)} className="text-zinc-400 hover:text-[#4A6CF7] transition-colors">
                      {showAccountNumber ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Salary Basic</span>
                  <span className="flex items-center gap-2 text-[13px] font-mono text-[#27272A] dark:text-[#E4E4E7]">
                    {showSalary ? '₹ 50,000.00' : '₹ ••••••'}
                    <button onClick={() => setShowSalary(!showSalary)} className="text-zinc-400 hover:text-[#4A6CF7] transition-colors">
                      {showSalary ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Hostel</span>
                  <span className="status-neutral">No</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">HRA</span>
                  <span className="status-success">Yes</span>
                </div>
              </div>

              <div className="mx-5 mb-4 mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg flex items-start gap-2">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="text-[11px] text-amber-800 dark:text-amber-400">For discrepancies, please contact the R&D Staff immediately.</p>
              </div>
            </div>

            {/* Card 2: Leave & Policies */}
            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] flex items-center gap-2.5">
                <div className="w-7 h-7 flex items-center justify-center bg-[#4A6CF7]/10 text-[#4A6CF7] rounded-lg flex-shrink-0">
                  <Info className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-widest">Leave & Policies</h3>
              </div>
              <div className="flex-grow flex flex-col justify-center p-6">
                <div className="mb-5 p-4 bg-[#EEF2FF] dark:bg-[#4A6CF7]/8 border border-[#4A6CF7]/20 rounded-xl text-center">
                  <p className="font-bold text-sm text-[#1E3A8A] dark:text-[#93C5FD]">Need to take time off?</p>
                  <p className="text-xs text-[#3B5CF5] dark:text-[#93C5FD]/80 mt-1 font-medium">Review your balance and apply below.</p>
                </div>
                <button
                  onClick={() => navigate("/leave-application")}
                  className="btn-primary-accent w-full justify-center h-10 text-sm"
                >
                  Apply for Leave
                </button>
              </div>
            </div>
          </section>

          {/* Main Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {[
              { icon: <PlusCircle className="w-5 h-5" />, title: "Register Project", desc: "Start a new research or development initiative.", route: "/project-registration", color: "#4A6CF7" },
              { icon: <LayoutGrid className="w-5 h-5" />, title: "View Projects", desc: "Browse, track, and manage all ongoing projects.", route: "/projects", color: "#059669" },
              { icon: <UserPlus className="w-5 h-5" />, title: "Create User", desc: "Add team members and assign roles to the portal.", route: "/user-creation", color: "#D97757" },
            ].map(({ icon, title, desc, route, color }) => (
              <div
                key={title}
                onClick={() => navigate(route)}
                className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-[#4A6CF7]/30 transition-all cursor-pointer p-5 group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 transition-transform group-hover:scale-105"
                  style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
                >
                  {icon}
                </div>
                <h3 className="text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5 tracking-tight">{title}</h3>
                <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">{desc}</p>
              </div>
            ))}
          </section>

          {/* Secondary Information Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
            <div className="lg:col-span-2 bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#D97757]" />
                <h3 className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-widest">Announcements</h3>
              </div>
              <div className="px-5 py-6 text-[#71717A] dark:text-[#A1A1AA] text-sm italic">
                No new announcements. Please check back later for updates.
              </div>
            </div>

            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                <h3 className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-widest">Resources</h3>
              </div>
              <div className="p-3">
                {[
                  { icon: FileText, label: "Portal Docs" },
                  { icon: LifeBuoy, label: "Contact Support" },
                ].map(({ icon: Icon, label }) => (
                  <a key={label} href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-[#EEF2FF] dark:hover:bg-[#4A6CF7]/8 hover:text-[#4A6CF7] transition-colors group">
                    <Icon className="w-4 h-4 text-zinc-400 group-hover:text-[#4A6CF7] flex-shrink-0 transition-colors" />
                    <span className="text-[13px] font-semibold">{label}</span>
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom Banner */}
          <section className="bg-[#1C2434] p-7 rounded-xl text-center relative overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4A6CF7]/20 via-transparent to-[#D97757]/10 pointer-events-none" />
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A6CF7]/70 mb-1">IIT Guwahati</p>
              <h2 className="text-lg font-extrabold mb-2 tracking-tight text-white">RnDOPs Automation System</h2>
              <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto">The Research & Development Section — managing the complete lifecycle of research projects and funding.</p>
            </div>
          </section>

          <footer className="text-center mt-4 pb-6">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#A1A1AA] dark:text-[#71717A]">
              <Mail className="w-3 h-3" />
              <p>For any query, e-mail to <a href="mailto:ernd@iitg.ac.in" className="text-[#D97757] hover:underline font-bold">ernd@iitg.ac.in</a></p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default Home;