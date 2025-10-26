// // PiHomePage.tsx

// import * as React from "react";
// import { useNavigate } from "react-router-dom"; // Import useNavigate
// import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk"; // Import Frappe hooks
// import { AppSidebar } from "../components/RndSidebar";

// // --- Icon Components (using inline SVG for portability) ---
// const PlusCircle: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
//     <circle cx="12" cy="12" r="10" />
//     <line x1="12" y1="8" x2="12" y2="16" />
//     <line x1="8" y1="12" x2="16" y2="12" />
//   </svg>
// );

// const UserPlus: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
//     <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
//     <circle cx="9" cy="7" r="4" />
//     <line x1="19" y1="8" x2="19" y2="14" />
//     <line x1="22" y1="11" x2="16" y2="11" />
//   </svg>
// );

// const LayoutGrid: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
//     <rect width="7" height="7" x="3" y="3" rx="1" />
//     <rect width="7" height="7" x="14" y="3" rx="1" />
//     <rect width="7" height="7" x="14" y="14" rx="1" />
//     <rect width="7" height="7" x="3" y="14" rx="1" />
//   </svg>
// );

// const FileText: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
//     <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
//     <polyline points="14 2 14 8 20 8" />
//     <line x1="16" y1="13" x2="8" y2="13" />
//     <line x1="16" y1="17" x2="8" y2="17" />
//     <line x1="10" y1="9" x2="8" y2="9" />
//   </svg>
// );

// const LifeBuoy: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
//     <circle cx="12" cy="12" r="10" />
//     <circle cx="12" cy="12" r="4" />
//     <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
//     <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
//     <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
//     <line x1="9.17" y1="14.83" x2="4.93" y2="19.07" />
//   </svg>
// );

// const Megaphone: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
//         <path d="m3 11 18-5v12L3 14v-3z"/>
//         <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
//     </svg>
// );

// const User: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
//     <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
//     <circle cx="12" cy="7" r="4" />
//   </svg>
// );

// const Users: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
//         <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
//         <circle cx="9" cy="7" r="4" />
//         <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
//         <path d="M16 3.13a4 4 0 0 1 0 7.75" />
//     </svg>
// );

// const Mail: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
//         <rect width="20" height="16" x="2" y="4" rx="2" />
//         <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
//     </svg>
// );

// // --- Child Components ---
// const Clock = () => {
//     const [time, setTime] = React.useState(new Date());
//     React.useEffect(() => {
//         const timerId = setInterval(() => setTime(new Date()), 1000);
//         return () => clearInterval(timerId);
//     }, []);

//     return (
//         <div className="text-sm text-slate-500 font-medium">
//             {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | {time.toLocaleTimeString()}
//         </div>
//     );
// };

// interface ActionCardProps {
//   icon: React.ReactNode;
//   title: string;
//   description: string;
//   onClick: () => void;
// }

// const ActionCard: React.FC<ActionCardProps> = ({ icon, title, description, onClick }) => (
//   <div
//     onClick={onClick}
//     className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-sky-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col"
//   >
//     <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-sky-100 text-sky-600 rounded-lg mb-4 group-hover:bg-sky-600 group-hover:text-white transition-colors duration-300">
//       {icon}
//     </div>
//     <h3 className="text-xl font-semibold mb-2 text-slate-800">{title}</h3>
//     <p className="text-slate-500 flex-grow text-sm">{description}</p>
//   </div>
// );

// // --- Main PI Home Page Component ---
// export function PiHomePage() { // Removed props from here
//   const navigate = useNavigate(); // Initialize useNavigate
//   const { currentUser } = useFrappeAuth();
//   const { data: userData, isLoading: isUserLoading, error: userError } = useFrappeGetDoc("User", currentUser ?? "", { // Added userError
//     fields: ["full_name", "designation_name", "department_name", "user_roles"],
//     enabled: !!currentUser,
//   });

//   console.log("Debugging userData:", userData, "isUserLoading:", isUserLoading, "userError:", userError);
//   const departmentId = userData?.department_name; 
// const { data: departmentDoc, isLoading: isDepartmentLoading } = useFrappeGetDoc(
//   "Department_prornd",
//   departmentId 
// );

// console.log("Department Fetch Key:", departmentId);
// console.log("Department Name:", departmentDoc?.dept_name);




//   const userName = currentUser || "Guest";
//   const fullName = userData?.full_name || "";
//   const designation = userData?.designation_name || "N/A";
//   const department = departmentDoc?.dept_name || "N/A"; // Use the name from the fetched Department_prornd document
//   const isPermanentEmployee = userData?.user_roles?.some((role: any) => role.role === "Permanent Employee") || false;

//   return (
//     <div>
//       <AppSidebar isPermanentEmployee={isPermanentEmployee} />
//       <div className="flex-1 bg-slate-50 p-4 sm:p-6 md:p-8 font-sans">
//         <div className="max-w-7xl mx-auto">
//           {/* Header */}
//           <header className="mb-12">
//               <div className="flex justify-between items-center mb-4">
//                   <div>
//                       <h1 className="text-4xl font-bold tracking-tight text-slate-900 bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">R&D Portal</h1>
//                       <p className="text-slate-600 mt-1">Your hub for innovation and project management.</p>
//                   </div>
//                   <Clock />
//               </div>
//               <div className="bg-gradient-to-r from-green-50 to-cyan-50 border-l-4 border-green-400 text-green-800 p-4 rounded-r-lg shadow-sm">
//                   <p className="font-semibold text-lg">Welcome back, {fullName || userName}!</p>
//               </div>
//           </header>

//           {/* User Information Section */}
//           <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
//               {/* PI Information Card */}
//               <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl shadow-lg border border-slate-200">
//                   <div className="flex items-center mb-4">
//                       <div className="w-10 h-10 mr-4 text-slate-500 flex items-center justify-center bg-slate-100 rounded-lg"><User /></div>
//                       <h3 className="text-2xl font-semibold text-slate-800">Your Information</h3>
//                   </div>
//                   <div className="border-t border-slate-200 pt-4 text-slate-700 space-y-3">
//                       <div className="flex justify-between items-center"><strong>Name:</strong> <span>{fullName || "N/A"}</span></div>
//                       <div className="flex justify-between items-center"><strong>Designation:</strong> <span>{designation || "N/A"}</span></div>
//                       <div className="flex justify-between items-center"><strong>Department:</strong> <span>{department || "N/A"}</span></div>
//                   </div>
//                   <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
//                       <p>For discrepancies, please contact the R&D Staff.</p>
//                   </div>
//               </div>

//               {/* User Management Card */}
//               <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl shadow-lg border border-slate-200 flex flex-col">
//                   <div className="flex items-center mb-4">
//                       <div className="w-10 h-10 mr-4 text-slate-500 flex items-center justify-center bg-slate-100 rounded-lg"><Users /></div>
//                       <h3 className="text-2xl font-semibold text-slate-800">User Management</h3>
//                   </div>
//                   <div className="border-t border-slate-200 pt-4 text-slate-700 flex-grow flex flex-col justify-center text-center">
//                       <p className="mb-4">View and manage all users in the R&D portal.</p>
//                       <button 
//                           onClick={() => navigate("/user-list")} // Use navigate
//                           className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg hover:from-sky-600 hover:to-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transform hover:scale-105"
//                       >
//                           View All Users
//                       </button>
//                   </div>
//               </div>
//           </section>

//           {/* Main Action Cards */}
//           <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
//             <ActionCard 
//               icon={<PlusCircle className="w-6 h-6"/>}
//               title="Register New Project"
//               description="Start a new research or development initiative by registering it in the portal."
//               onClick={() => navigate("/project-registration")} // Use navigate
//             />
//             <ActionCard 
//               icon={<LayoutGrid className="w-6 h-6"/>}
//               title="View All Projects"
//               description="Browse, track, and manage all ongoing and completed R&D projects."
//               onClick={() => navigate("/projects")} // Use navigate
//             />
//             <ActionCard 
//               icon={<FileText className="w-6 h-6"/>} // Changed icon
//               title="Pending Tasks" // Changed title
//               description="View and manage your assigned pending tasks." // Changed description
//               onClick={() => navigate("/pending-tasks")} // Changed navigation path
//             />
//           </section>

//           {/* Secondary Information Section */}
//           <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//               <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-slate-200">
//                   <div className="flex items-center mb-4">
//                       <div className="w-8 h-8 mr-3 text-slate-500"><Megaphone/></div>
//                       <h3 className="text-2xl font-semibold text-slate-800">Announcements</h3>
//                   </div>
//                   <div className="text-slate-600 space-y-2 border-t pt-4">
//                       <p>No new announcements. Please check back later for updates.</p>
//                   </div>
//               </div>
//               <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
//                   <h3 className="text-2xl font-semibold mb-4 text-slate-800">Resources</h3>
//                   <ul className="space-y-4 border-t pt-4">
//                     <li><a href="#" className="flex items-center text-sky-600 hover:underline group"><FileText className="w-5 h-5 mr-3 text-slate-400 group-hover:text-sky-600 transition-colors"/><span>Portal Documentation</span></a></li>
//                     <li><a href="#" className="flex items-center text-sky-600 hover:underline group"><LifeBuoy className="w-5 h-5 mr-3 text-slate-400 group-hover:text-sky-600 transition-colors"/><span>Contact Support</span></a></li>
//                   </ul>
//               </div>
//           </section>
          
//           <section className="bg-slate-800 text-white p-8 rounded-xl shadow-2xl text-center my-12" style={{backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 2000 1500\'%3e%3crect fill=\'%231e293b\' width=\'2000\' height=\'1500\'/%3e%3cdefs%3e%3cpath fill=\'none\' stroke-width=\'1\' stroke-opacity=\'0.1\' id=\'a\' d=\'M0 750c250 0 250 0 500 0s250 0 500 0s250 0 500 0s250 0 500 0\'/%3e%3c/defs%3e%3cg transform=\'translate(0 0)\'%3e%3cuse xlink:href=\'%23a\' y=\'-150\' transform=\'rotate(5 1000 750)\' stroke=\'%2364748b\'/%3e%3cuse xlink:href=\'%23a\' y=\'-100\' transform=\'rotate(10 1000 750)\' stroke=\'%2364748b\'/%3e%3cuse xlink:href=\'%23a\' y=\'-50\' transform=\'rotate(15 1000 750)\' stroke=\'%2364748b\'/%3e%3cuse xlink:href=\'%23a\' y=\'0\' transform=\'rotate(20 1000 750)\' stroke=\'%2364748b\'/%3e%3cuse xlink:href=\'%23a\' y=\'50\' transform=\'rotate(25 1000 750)\' stroke=\'%2364748b\'/%3e%3cuse xlink:href=\'%23a\' y=\'100\' transform=\'rotate(30 1000 750)\' stroke=\'%2364748b\'/%3e%3cuse xlink:href=\'%23a\' y=\'150\' transform=\'rotate(35 1000 750)\' stroke=\'%2364748b\'/%3e%3c/g%3e%3c/svg%3e")'}}>
//               <h2 className="text-3xl font-bold mb-2">RnDOPs Automation System</h2>
//               <p className="text-slate-300">The Research & Development Section welcomes you to the future of project management.</p>
//           </section>
          
//           <footer className="text-center text-slate-500 mt-12 pb-4">
//               <div className="flex items-center justify-center space-x-2">
//                   <Mail className="w-5 h-5"/>
//                   <p>For any query, e-mail to <a href="mailto:ernd@iitg.ac.in" className="text-sky-600 hover:underline">ernd@iitg.ac.in</a></p>
//               </div>
//           </footer>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default PiHomePage;



// new design plain version



// PiHomePage.tsx

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { AppSidebar } from "../components/RndSidebar";

// --- Icon Components ---
const PlusCircle: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
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

const BarChart: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

const PieChart: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

const TrendingUp: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const AlertCircle: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const Megaphone: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m3 11 18-5v12L3 14v-3z"/>
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
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

const Mail: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const Clock: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// --- Child Components ---
const CurrentTime = () => {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="text-sm text-gray-600 font-medium">
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
    className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-500 transition-all duration-300 cursor-pointer group flex flex-col"
  >
    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-lg mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2 text-gray-800">{title}</h3>
    <p className="text-gray-600 flex-grow text-sm">{description}</p>
  </div>
);

// --- Analytics Card Component ---
const AnalyticsCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: string;
  onClick?: () => void;
}> = ({ title, value, subtitle, icon, trend, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white p-6 rounded-lg border border-gray-200 ${onClick ? 'cursor-pointer hover:border-blue-500 transition-all duration-300' : ''}`}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <div className="text-blue-600">
        {icon}
      </div>
    </div>
    <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-600">{subtitle}</div>
      {trend && (
        <div className={`text-sm ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </div>
      )}
    </div>
  </div>
);

// --- Quick Stats Component ---
const QuickStats: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}> = ({ icon, title, value, description }) => (
  <div className="bg-white p-4 rounded-lg border border-gray-200">
    <div className="flex items-center mb-3">
      <div className="w-8 h-8 mr-3 text-blue-600">
        {icon}
      </div>
      <h4 className="font-semibold text-gray-800">{title}</h4>
    </div>
    <div className="text-xl font-bold text-gray-900 mb-1">{value}</div>
    <div className="text-sm text-gray-600">{description}</div>
  </div>
);

// --- Main PI Home Page Component ---
export function PiHomePage() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name", "user_roles"],
    enabled: !!currentUser,
  });

  const fullName = userData?.full_name || currentUser || "Guest";
  const isPermanentEmployee = userData?.user_roles?.some((role: any) => role.role === "Permanent Employee") || false;

  return (
    <div>
      <AppSidebar isPermanentEmployee={isPermanentEmployee} />
      <div className="flex-1 bg-gray-50 p-6 font-sans">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                {/* <h1 className="text-3xl font-bold text-gray-900">R&D Portal Dashboard</h1> */}
                <h1 className="text-3xl font-bold text-gray-900">Welcome back, {fullName}</h1>
              </div>
              <CurrentTime />
            </div>
          </header>

          {/* Quick Stats Section */}
          {/* <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <QuickStats
              icon={<Clock className="w-6 h-6" />}
              title="Avg. Approval Time"
              value="3.2 days"
              description="Faster than last month"
            />
            <QuickStats
              icon={<TrendingUp className="w-6 h-6" />}
              title="Project Growth"
              value="+15%"
              description="This quarter"
            />
            <QuickStats
              icon={<FileText className="w-6 h-6" />}
              title="Documents"
              value="47"
              description="Pending review"
            />
            <QuickStats
              icon={<AlertCircle className="w-6 h-6" />}
              title="Deadlines"
              value="5"
              description="Within 7 days"
            />
          </section> */}

          {/* Analytics Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Project Analytics */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 mr-3 text-blue-600">
                  <BarChart />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Project Analytics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard
                  title="Total Projects"
                  value="24"
                  subtitle="Active: 18 | Draft: 6"
                  icon={<FileText className="w-5 h-5" />}
                  trend="+12%"
                  onClick={() => navigate("/project-analytics")}
                />
                <AnalyticsCard
                  title="Completion Rate"
                  value="87%"
                  subtitle="On track projects"
                  icon={<TrendingUp className="w-5 h-5" />}
                  trend="+5%"
                />
                <AnalyticsCard
                  title="Pending Review"
                  value="8"
                  subtitle="Awaiting approval"
                  icon={<AlertCircle className="w-5 h-5" />}
                />
                <AnalyticsCard
                  title="Team Members"
                  value="42"
                  subtitle="Active researchers"
                  icon={<FileText className="w-5 h-5" />}
                  trend="+8%"
                />
              </div>
            </div>

            {/* Fund Analytics */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 mr-3 text-green-600">
                  <PieChart />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Fund Analytics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard
                  title="Total Allocation"
                  value="₹4.2Cr"
                  subtitle="Current fiscal year"
                  icon={<PieChart className="w-5 h-5" />}
                  trend="+18%"
                  onClick={() => navigate("/fund-analytics")}
                />
                <AnalyticsCard
                  title="Utilization"
                  value="76%"
                  subtitle="₹3.2Cr utilized"
                  icon={<TrendingUp className="w-5 h-5" />}
                  trend="+8%"
                />
                <AnalyticsCard
                  title="Available Funds"
                  value="₹1.0Cr"
                  subtitle="Remaining balance"
                  icon={<PieChart className="w-5 h-5" />}
                />
                <AnalyticsCard
                  title="Pending Requests"
                  value="₹45L"
                  subtitle="Approval pending"
                  icon={<AlertCircle className="w-5 h-5" />}
                />
              </div>
            </div>
          </section>

          {/* Main Action Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ActionCard 
              icon={<PlusCircle className="w-6 h-6"/>}
              title="Register New Project"
              description="Start a new research or development initiative with proper documentation"
              onClick={() => navigate("/project-registration")}
            />
            <ActionCard 
              icon={<LayoutGrid className="w-6 h-6"/>}
              title="View All Projects"
              description="Browse, track, and manage all ongoing and completed R&D projects"
              onClick={() => navigate("/projects-view", { state: { filter: "Application Under Process" } })}
            />
            <ActionCard 
              icon={<FileText className="w-6 h-6"/>}
              title="Pending Tasks"
              description="Review and take action on your assigned tasks and approvals"
              onClick={() => navigate("/pending-tasks")}
            />
          </section>

          {/* Information Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-6 h-6 mr-3 text-gray-600">
                  <Megaphone/>
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Recent Updates</h3>
              </div>
              <div className="text-gray-600 space-y-3 border-t pt-4">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium">New funding opportunity available for AI research</p>
                    <p className="text-sm text-gray-500">Deadline: March 15, 2024</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium">Quarterly review meeting scheduled for next week</p>
                    <p className="text-sm text-gray-500">March 10, 2024 | 10:00 AM</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium">System maintenance scheduled for this weekend</p>
                    <p className="text-sm text-gray-500">March 9-10, 2024 | 10 PM - 6 AM</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Quick Resources</h3>
              <ul className="space-y-4 border-t pt-4">
                <li>
                  <a href="#" className="flex items-center text-blue-600 hover:underline group">
                    <FileText className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-600 transition-colors"/>
                    <span>Project Guidelines</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center text-blue-600 hover:underline group">
                    <LifeBuoy className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-600 transition-colors"/>
                    <span>Support Portal</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center text-blue-600 hover:underline group">
                    <BarChart className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-600 transition-colors"/>
                    <span>Analytics Reports</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center text-blue-600 hover:underline group">
                    <PieChart className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-600 transition-colors"/>
                    <span>Financial Templates</span>
                  </a>
                </li>
              </ul>
            </div>
          </section>
          
          <section className="bg-gray-800 text-white p-6 rounded-lg text-center my-8">
            <h2 className="text-2xl font-bold mb-2">R&D Operations Portal</h2>
            <p className="text-gray-300">Streamlining research project management and fund utilization</p>
          </section>
          
          <footer className="text-center text-gray-600 mt-8 pb-4">
            <div className="flex items-center justify-center space-x-2">
              <Mail className="w-5 h-5"/>
              <p>For any query, e-mail to <a href="mailto:ernd@iitg.ac.in" className="text-blue-600 hover:underline">ernd@iitg.ac.in</a></p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default PiHomePage;
