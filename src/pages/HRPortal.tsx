// import React, { useState } from 'react';
// import { FaUsers, FaTasks, FaUserClock, FaFileAlt, FaCalendarCheck, FaUserPlus, FaFileImport, FaCalendarAlt, FaChartBar, FaCog, FaMoneyCheckAlt, FaFileSignature, FaWallet, FaPlaneDeparture, FaSearchDollar, FaToolbox, FaUpload } from 'react-icons/fa';
// import { cn } from '@/lib/utils'; // Assuming you have a utility for classnames
// import { AppSidebar } from '@/components/RndSidebar';

// // --- Reusable Neo-Brutalism Components ---
// const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
//     <div className={cn("bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>
//         {children}
//     </div>
// );

// const NeoButton = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
//     <button
//         onClick={onClick}
//         className={cn(
//             "px-4 py-2 bg-white border-2 border-black rounded-lg font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all",
//             "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
//             "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
//             className
//         )}
//     >
//         {children}
//     </button>
// );

// const HRPortal: React.FC = () => {
//     // State to manage the dynamic content display
//     const [activeTask, setActiveTask] = useState<{ title: string; details: string } | null>(null);

//     const tasks = [
//         { title: 'Project Staff Joining - John Doe', details: 'John Doe joined on Oct 12, awaiting HR approval.', priority: 'High' },
//         { title: 'Resignation Approval - Mary Smith', details: 'Mary Smith submitted resignation on Oct 10, pending director review.', priority: 'High' },
//         { title: 'Attendance Marking - 3 employees', details: '3 employees have not marked attendance for Oct 20.', priority: 'Medium' },
//         { title: 'Payroll Verification - March', details: 'Payroll for March pending verification.', priority: 'Medium' },
//     ];

//     const stats = [
//         { icon: FaUsers, value: '142', label: 'Total Employees', color: 'bg-sky-200' },
//         { icon: FaUserClock, value: '8', label: 'On Leave Today', color: 'bg-amber-200' },
//         { icon: FaFileAlt, value: '23', label: 'Pending Approvals', color: 'bg-rose-200' },
//         { icon: FaCalendarCheck, value: '5', label: 'Upcoming Holidays', color: 'bg-indigo-200' },
//     ];
    
//     const quickActions = [
//         { icon: FaUserPlus, label: 'Add Employee' },
//         { icon: FaFileImport, label: 'Process Payroll' },
//         { icon: FaCalendarAlt, label: 'Leave Requests' },
//         { icon: FaChartBar, label: 'Reports' },
//         { icon: FaCog, label: 'Settings' },
//     ];

//     const navItems = [
//         { icon: FaMoneyCheckAlt, label: 'Payroll' },
//         { icon: FaFileSignature, label: 'Commits & Payments', badge: 4 },
//         { icon: FaWallet, label: 'Reimbursement' },
//         { icon: FaPlaneDeparture, label: 'Leave' },
//         { icon: FaSearchDollar, label: 'Project Fund Status' },
//         { icon: FaSearchDollar, label: 'Salary' },
//         { icon: FaFileAlt, label: 'HR Reports' },
//         { icon: FaToolbox, label: 'Utilities' },
//         { icon: FaUpload, label: 'Upload' },
//     ];

//     const handleTaskClick = (task: { title: string; details: string }) => {
//         setActiveTask(task);
//     };

//     const resetContent = () => {
//         setActiveTask(null);
//     };

//     const renderDashboardContent = () => (
//         <>
//             <NeoCard className="p-8 mb-8 bg-[#A5D6A7]">
//                 <h2 className="text-3xl font-extrabold text-black">Welcome to the HR Portal</h2>
//                 <p className="font-mono text-black mt-2">Manage your HR tasks efficiently with our comprehensive dashboard.</p>
//             </NeoCard>

//             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
//                 {stats.map(stat => (
//                     <NeoCard key={stat.label} className={cn("p-6 text-center transition-transform hover:-translate-y-1", stat.color)}>
//                         <stat.icon className="text-4xl text-black mx-auto mb-3" />
//                         <h3 className="text-4xl font-extrabold text-black">{stat.value}</h3>
//                         <p className="font-bold text-black uppercase mt-1">{stat.label}</p>
//                     </NeoCard>
//                 ))}
//             </div>

//             <div>
//                 <h4 className="text-2xl font-bold text-black uppercase mb-4">Quick Actions</h4>
//                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
//                     {quickActions.map(action => (
//                         <NeoButton
//                             key={action.label}
//                             onClick={() => handleTaskClick({ title: action.label, details: 'This feature is currently under development.' })}
//                             className="flex flex-col items-center justify-center p-6 text-center !shadow-[4px_4px_0px_rgba(0,0,0,0.25)] hover:bg-[#A5D6A7]"
//                         >
//                             <action.icon className="text-3xl mb-3" />
//                             <span className="font-bold text-base">{action.label}</span>
//                         </NeoButton>
//                     ))}
//                 </div>
//             </div>
//         </>
//     );

//     const renderTaskDetails = () => (
//         <NeoCard className="p-8">
//             <h4 className="text-3xl font-extrabold text-black uppercase mb-4">{activeTask?.title}</h4>
//             <p className="font-mono text-lg">{activeTask?.details}</p>
//             <div className="mt-6 flex gap-4">
//                 <NeoButton className="bg-[#A5D6A7] hover:bg-[#81C784]">Take Action</NeoButton>
//                 <NeoButton onClick={resetContent} className="bg-white">Back to Dashboard</NeoButton>
//             </div>
//         </NeoCard>
//     );

//     return (
//         <div className="flex bg-[#FDFCEC] min-h-screen font-sans">
//             <AppSidebar isPermanentEmployee={false} />
//             <div className="flex-1 flex flex-col">
//                 {/* Navbar */}
//                 <nav className="bg-black text-white p-4 border-b-4 border-black sticky top-0 z-10">
//                     <div className="container mx-auto flex justify-between items-center">
//                     <a className="text-2xl font-extrabold flex items-center gap-3" href="#">
//                         <FaUsers /> HR Portal
//                     </a>
//                     <div className="hidden lg:flex items-center gap-2">
//                         {navItems.map(item => (
//                             <NeoButton key={item.label} className="bg-gray-800 text-white !shadow-none hover:bg-gray-700 relative">
//                                 <item.icon className="inline-block mr-2" />
//                                 {item.label}
//                                 {item.badge && (
//                                     <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-black">
//                                         {item.badge}
//                                     </span>
//                                 )}
//                             </NeoButton>
//                         ))}
//                     </div>
//                 </div>
//             </nav>

//             {/* Main Content */}
//             <div className="container mx-auto p-4 md:p-8">
//                 <div className="flex flex-col lg:flex-row gap-8">
//                     {/* Sidebar */}
//                     <aside className="lg:w-1/3 xl:w-1/4">
//                         <NeoCard className="bg-[#90A4AE] p-6">
//                             <div className="flex justify-between items-center pb-4 border-b-2 border-black mb-4">
//                                 <h5 className="text-xl font-bold text-black flex items-center gap-3 uppercase"><FaTasks /> Pending Tasks</h5>
//                                 <span className="bg-red-500 text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center border-2 border-black">
//                                     {tasks.length}
//                                 </span>
//                             </div>
//                             <div className="space-y-3">
//                                 {tasks.map(task => (
//                                     <div
//                                         key={task.title}
//                                         onClick={() => handleTaskClick(task)}
//                                         className="p-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.25)] cursor-pointer hover:bg-stone-100 transition-colors"
//                                     >
//                                         <p className="font-bold">{task.title}</p>
//                                         <span className={cn(
//                                             "text-xs font-bold px-2 py-1 rounded-md border-2 border-black mt-2 inline-block",
//                                             task.priority === 'High' ? 'bg-orange-400' : 'bg-amber-300'
//                                         )}>
//                                             {task.priority} Priority
//                                         </span>
//                                     </div>
//                                 ))}
//                             </div>
//                         </NeoCard>
//                     </aside>

//                     {/* Content Area */}
//                     <main className="flex-1">
//                         <div className="bg-[#F5F5F5] p-6 border-2 border-black rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//                             {activeTask ? renderTaskDetails() : renderDashboardContent()}
//                         </div>
//                     </main>
//                 </div>
//             </div>

//             {/* Footer */}
//             <footer className="bg-black text-white text-center p-4 border-t-4 border-black mt-8">
//                 <p className="font-mono text-sm">
//                     © 2025 HR Portal | Designed & Developed by Technical Team, R&D Section, IITG
//                 </p>
//             </footer>
//             </div>
//         </div>
//     );
// };

// export default HRPortal;




// -=-=-=-=-=-=-==-=

import React, { useState } from 'react';
import { FaUsers, FaTasks, FaUserClock, FaFileAlt, FaCalendarCheck, FaUserPlus, FaFileImport, FaCalendarAlt, FaChartBar, FaCog } from 'react-icons/fa';
import { cn } from '@/lib/utils'; // Assuming you have a utility for classnames
import { AppSidebar } from '@/components/RndSidebar'; // Assuming this is your project's sidebar

// --- Reusable Neo-Brutalism Components (with updated font weight) ---
const NeoButton = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <button
        onClick={onClick}
        className={cn(
            "px-4 py-2 bg-white border-2 border-black rounded-lg font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all", // font-bold changed to font-semibold
            "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
            "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
            className
        )}
    >
        {children}
    </button>
);

const HRPortal: React.FC = () => {
    // --- LOGIC: All state and handlers remain unchanged ---
    const [activeTask, setActiveTask] = useState<{ title: string; details: string } | null>(null);

    const tasks = [
        { title: 'Project Staff Joining - John Doe', details: 'John Doe joined on Oct 12, awaiting HR approval.', priority: 'High' },
        { title: 'Resignation Approval - Mary Smith', details: 'Mary Smith submitted resignation on Oct 10, pending director review.', priority: 'High' },
        { title: 'Attendance Marking - 3 employees', details: '3 employees have not marked attendance for Oct 20.', priority: 'Medium' },
        { title: 'Payroll Verification - March', details: 'Payroll for March pending verification.', priority: 'Medium' },
    ];

    const stats = [
        { icon: FaUsers, value: '142', label: 'Total Employees' },
        { icon: FaUserClock, value: '8', label: 'On Leave' },
        { icon: FaFileAlt, value: '23', label: 'Pending Approvals' },
        { icon: FaCalendarCheck, value: '5', label: 'Holidays' },
    ];
    
    const quickActions = [
        { icon: FaUserPlus, label: 'Add Employee' },
        { icon: FaFileImport, label: 'Process Payroll' },
        { icon: FaCalendarAlt, label: 'Leave Requests' },
        { icon: FaChartBar, label: 'Reports' },
        { icon: FaCog, label: 'Settings' },
    ];

    const handleTaskClick = (task: { title: string; details: string }) => {
        setActiveTask(task);
    };

    const resetContent = () => {
        setActiveTask(null);
    };

    // --- RENDER FUNCTIONS with smaller and less bold fonts ---

    const renderDashboardContent = () => (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="p-6 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                <h2 className="text-2xl font-bold text-black">Welcome to the HR Portal</h2> 
                <p className="font-mono text-gray-800 mt-1">Manage your HR tasks efficiently with our dashboard.</p>
            </div>

            {/* Stats Section */}
            <div>
                <h3 className="text-xl font-bold text-black uppercase mb-3">Key Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map(stat => (
                        <div key={stat.label} className="p-4 text-center border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-1">
                            <stat.icon className="text-3xl text-black mx-auto mb-2" />
                            <h3 className="text-3xl font-bold text-black">{stat.value}</h3>
                            <p className="font-semibold text-black uppercase mt-1 text-xs">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions Section */}
            <div>
                <h3 className="text-xl font-bold text-black uppercase mb-3">Quick Actions</h3>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                    {quickActions.map(action => (
                        <button
                            key={action.label}
                            onClick={() => handleTaskClick({ title: action.label, details: 'This feature is currently under development.' })}
                            className="flex flex-col items-center justify-center p-4 text-center border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.25)] transition-all hover:bg-[#A5D6A7] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:translate-x-[2px] hover:translate-y-[2px]"
                        >
                            <action.icon className="text-2xl mb-2" />
                            <span className="font-semibold text-sm">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderTaskDetails = () => (
        <div>
            <h3 className="text-2xl font-bold text-black uppercase mb-3">{activeTask?.title}</h3>
            <p className="font-mono text-base">{activeTask?.details}</p>
            <div className="mt-5 flex gap-3">
                <NeoButton className="bg-[#A5D6A7] hover:bg-[#81C784]">Take Action</NeoButton>
                <NeoButton onClick={resetContent} className="bg-white">Back to Dashboard</NeoButton>
            </div>
        </div>
    );

    return (
        <div className=" bg-[#FDFCEC] min-h-screen font-sans">
            <AppSidebar isPermanentEmployee={false} />
            <div className="flex-1 flex flex-col">
                {/* Main Content */}
                <main className="flex-1 p-4 md:p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Primary Content Area */}
                        <div className="flex-1 bg-[#F5F5F5] p-5 border-2 border-black rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                            {activeTask ? renderTaskDetails() : renderDashboardContent()}
                        </div>

                        {/* Sidebar */}
                        <aside className="lg:w-80 xl:w-96">
                            <div className="p-5 bg-[#90A4AE] border-2 border-black rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                                <div className="flex justify-between items-center pb-3 border-b-2 border-black mb-3">
                                    <h5 className="text-lg font-semibold text-black flex items-center gap-2 uppercase"><FaTasks /> Tasks</h5>
                                    <span className="bg-red-500 text-white text-xs font-semibold rounded-full h-7 w-7 flex items-center justify-center border-2 border-black">
                                        {tasks.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {tasks.map(task => (
                                        <div
                                            key={task.title}
                                            onClick={() => handleTaskClick(task)}
                                            className="p-3 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.25)] cursor-pointer hover:bg-stone-100 transition-colors"
                                        >
                                            <p className="font-semibold text-sm">{task.title}</p>
                                            <span className={cn(
                                                "text-xs font-semibold px-1.5 py-0.5 rounded-md border-2 border-black mt-1.5 inline-block",
                                                task.priority === 'High' ? 'bg-orange-400' : 'bg-amber-300'
                                            )}>
                                                {task.priority} Priority
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default HRPortal;