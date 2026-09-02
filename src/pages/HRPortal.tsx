


// -=-=-=-=-=-=-==-=

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { FaUsers, FaTasks, FaUserClock, FaFileAlt, FaCalendarCheck, FaUserPlus, FaFileImport, FaCalendarAlt, FaChartBar, FaCog, FaIdCard } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { AppSidebar } from '@/components/RndSidebar';

// --- Reusable Neo-Brutalism Components (with updated font weight) ---
const FrappeButton = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <button
        onClick={onClick}
        className={cn(
            "px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg font-semibold text-zinc-900 dark:text-zinc-100 shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all",
            "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
            "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
            className
        )}
    >
        {children}
    </button>
);

const HRPortal: React.FC = () => {
    const [activeTask, setActiveTask] = useState<{ title: string; details: string } | null>(null);
    const navigate = useNavigate();

    // Fetch pending ID Card requests
    const { data: pendingIdCards } = useFrappeGetDocList('Employee ID Card', {
        filters: [['workflow_state', 'like', '%Submit%']],
        fields: ['name'],
        limit: 500,
    });
    const pendingIdCardCount = pendingIdCards?.length ?? 0;

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
        { icon: FaIdCard, label: 'ID Card Generation', path: '/hr-id-card-management' },
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
            <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 shadow-sm">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Welcome to the HR Portal</h2>
                <p className="font-mono text-zinc-800 dark:text-zinc-200 mt-1">Manage your HR tasks efficiently with our dashboard.</p>
            </div>

            {/* Stats Section */}
            <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 uppercase mb-3">Key Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map(stat => (
                        <div key={stat.label} className="p-4 text-center border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 shadow-sm transition-transform hover:-translate-y-1">
                            <stat.icon className="text-3xl text-zinc-900 dark:text-zinc-100 mx-auto mb-2" />
                            <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</h3>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase mt-1 text-xs">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions Section */}
            <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 uppercase mb-3">Quick Actions</h3>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                    {quickActions.map(action => (
                        <button
                            key={action.label}
                            onClick={() => {
                                if ('path' in action && action.path) {
                                    navigate(action.path);
                                } else {
                                    handleTaskClick({ title: action.label, details: 'This feature is currently under development.' });
                                }
                            }}
                            className="relative flex flex-col items-center justify-center p-4 text-center border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 shadow-sm transition-all hover:bg-[#A5D6A7] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:translate-x-[2px] hover:translate-y-[2px]"
                        >
                            {action.label === 'ID Card Generation' && pendingIdCardCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-[#D97757] text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-md">
                                    {pendingIdCardCount > 99 ? '99+' : pendingIdCardCount}
                                </span>
                            )}
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
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase mb-3">{activeTask?.title}</h3>
            <p className="font-mono text-base">{activeTask?.details}</p>
            <div className="mt-5 flex gap-3">
                <FrappeButton className="bg-[#A5D6A7] hover:bg-[#81C784]">Take Action</FrappeButton>
                <FrappeButton onClick={resetContent} className="bg-white dark:bg-zinc-900">Back to Dashboard</FrappeButton>
            </div>
        </div>
    );

    return (
        <div className=" bg-claude-bg min-h-screen font-sans">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
                {/* Main Content */}
                <main className="flex-1 p-4 md:p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Primary Content Area */}
                        <div className="flex-1 bg-[#F5F5F5] p-5 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
                            {activeTask ? renderTaskDetails() : renderDashboardContent()}
                        </div>

                        {/* Sidebar */}
                        <aside className="lg:w-80 xl:w-96">
                            <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
                                <div className="flex justify-between items-center pb-3 border-b-2 border-black mb-3">
                                    <h5 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 uppercase"><FaTasks /> Tasks</h5>
                                    <span className="bg-red-500 text-white text-xs font-semibold rounded-full h-7 w-7 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                                        {tasks.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {tasks.map(task => (
                                        <div
                                            key={task.title}
                                            onClick={() => handleTaskClick(task)}
                                            className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.25)] cursor-pointer hover:bg-stone-100 transition-colors"
                                        >
                                            <p className="font-semibold text-sm">{task.title}</p>
                                            <span className={cn(
                                                "text-xs font-semibold px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 mt-1.5 inline-block",
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