import React, { useState } from 'react';
import { FaExclamationCircle, FaArrowLeft } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { AppSidebar } from '@/components/RndSidebar';
import { useNavigate } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { GlobalLoader } from '@/components/ui/global-loader';

// Define interfaces for the API response
interface PendingTaskRecord {
    name: string;
    title: string;
    status: string;
    creation: string;
    modified: string;
    owner: string;
}

interface PendingTaskResult {
    doctype: string;
    records: PendingTaskRecord[];
}

interface PendingTaskResponse {
    message: {
        page: string;
        status_value: string;
        results: PendingTaskResult[];
    };
}

// Interface for the flattened task structure used in the table
interface FlattenedTask {
    id: string;
    title: string;
    "Project Number": string;
    status: string;
    priority: string;
    creation: string;
    modified: string;
    owner: string;
    doctype: string;
}

// Frappe-styled components
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white rounded-xl border border-gray-300 shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'ghost' }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline' | 'action';
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-gray-400",
            variant === 'primary' && "bg-[#0EA5A4] text-white hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border border-[#0D9494]",
            variant === 'ghost' && "bg-transparent text-gray-900 hover:bg-gray-200 hover:text-black",
            variant === 'outline' && "bg-white border-2 border-gray-400 text-black hover:border-[#0EA5A4] hover:text-[#0EA5A4] hover:bg-gray-50",
            variant === 'action' && "bg-[#0EA5A4] text-white font-bold hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border-2 border-[#0D9494]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

const PendingTask: React.FC = () => {
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedModule, setSelectedModule] = useState<string>('all');
    const itemsPerPage = 5;

    // Fetch data from the API
    const { data, isLoading, error } = useFrappeGetCall<PendingTaskResponse>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_task",
        {
            page_name: "pending-task"
        }
    );

    // Transform API data into flattened tasks
    const allTasks: FlattenedTask[] = React.useMemo(() => {
        if (!data?.message?.results) return [];

        const tasks: FlattenedTask[] = [];
        data.message.results.forEach((group) => {
            group.records.forEach((record) => {
                tasks.push({
                    id: record.name,
                    title: record.title,
                    "Project Number": record.name,
                    status: record.status,
                    priority: 'Medium',
                    creation: record.creation,
                    modified: record.modified,
                    owner: record.owner,
                    doctype: group.doctype
                });
            });
        });
        return tasks;
    }, [data]);

    // Get unique module names for filter dropdown
    const moduleNames = React.useMemo(() => {
        const uniqueModules = new Set(allTasks.map(task => task.doctype));
        return Array.from(uniqueModules).sort();
    }, [allTasks]);

    // Filter tasks based on selected module
    const filteredTasks = React.useMemo(() => {
        if (selectedModule === 'all') return allTasks;
        return allTasks.filter(task => task.doctype === selectedModule);
    }, [allTasks, selectedModule]);

    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
    const indexOfLastTask = currentPage * itemsPerPage;
    const indexOfFirstTask = indexOfLastTask - itemsPerPage;
    const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const handleModuleChange = (module: string) => {
        setSelectedModule(module);
        setCurrentPage(1);
    };

    const getPriorityBadge = (priority: string) => {
        const styles: Record<string, string> = {
            High: 'bg-red-100 text-red-800 border-red-300',
            Medium: 'bg-amber-100 text-amber-800 border-amber-300',
            Low: 'bg-green-100 text-green-800 border-green-300',
        };
        return cn("px-2.5 py-1 rounded-md text-xs font-bold border", styles[priority] || 'bg-gray-100 text-gray-800 border-gray-300');
    };

    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase();
        let style = "bg-blue-100 text-blue-800 border-blue-300";
        if (["pending", "under review", "approval pending"].some(t => s?.includes(t))) {
            style = "bg-amber-100 text-amber-800 border-amber-300";
        } else if (s?.includes("approved")) {
            style = "bg-emerald-100 text-emerald-800 border-emerald-300";
        } else if (s?.includes("draft")) {
            style = "bg-slate-100 text-slate-800 border-slate-300";
        } else if (s?.includes("rejected")) {
            style = "bg-red-100 text-red-800 border-red-300";
        }
        return cn("px-2.5 py-1 rounded-md text-xs font-bold border", style);
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxButtons = 3;

        if (totalPages <= maxButtons) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <FrappeCard className="p-8 text-center">
                    <FaExclamationCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-black mb-2">Error Loading Tasks</h2>
                    <p className="text-gray-900">{error.message}</p>
                </FrappeCard>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen">
            <GlobalLoader isLoading={isLoading} />
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                {/* Header */}
                <FrappeCard className="mb-6 p-5">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                            aria-label="Go back"
                        >
                            <FaArrowLeft className="h-5 w-5 text-gray-900" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-black uppercase tracking-tight">Pending Tasks</h1>
                            <p className="text-sm text-gray-900 mt-0.5">Manage and track your pending tasks.</p>
                        </div>
                    </div>
                </FrappeCard>

                {/* Filter Section */}
                <FrappeCard className="mb-4 p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <label htmlFor="module-filter" className="font-bold text-black uppercase text-sm">
                            Filter by Module:
                        </label>
                        <select
                            id="module-filter"
                            value={selectedModule}
                            onChange={(e) => handleModuleChange(e.target.value)}
                            className="h-10 px-4 bg-white border-2 border-gray-400 rounded-lg font-bold text-sm text-black focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-900"
                        >
                            <option value="all">All Modules</option>
                            {moduleNames.map((module) => (
                                <option key={module} value={module}>
                                    {module}
                                </option>
                            ))}
                        </select>
                        {selectedModule !== 'all' && (
                            <FrappeButton
                                onClick={() => handleModuleChange('all')}
                                className="text-red-600 hover:bg-red-50 border border-red-200"
                            >
                                Clear Filter
                            </FrappeButton>
                        )}
                        <div className="ml-auto text-sm text-gray-900 font-bold">
                            Showing {filteredTasks.length} of {allTasks.length} tasks
                        </div>
                    </div>
                </FrappeCard>

                {/* Table */}
                <FrappeCard className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-gray-300">
                            <thead className="bg-gray-200">
                                <tr className="divide-x divide-gray-300">
                                    <th className="p-3 text-left font-bold text-black text-sm">Status</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Module</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Title</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Project Number</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Date</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Owner</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Priority</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-300 bg-white">
                                {currentTasks.length > 0 ? (
                                    currentTasks.map((task) => (
                                        <tr key={task.id} className="divide-x divide-gray-300 hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <span className={getStatusBadge(task.status)}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold text-black text-sm">
                                                {task.doctype}
                                            </td>
                                            <td className="p-4 font-medium text-gray-900 text-sm">
                                                {task.title.length > 30 ? `${task.title.substring(0, 30)}...` : task.title}
                                            </td>
                                            <td className="p-4 text-sm font-mono text-gray-900">
                                                {task["Project Number"].length > 25 ? `${task["Project Number"].substring(0, 25)}...` : task["Project Number"]}
                                            </td>
                                            <td className="p-4 text-sm font-mono text-gray-900">
                                                {task.creation ? new Date(task.creation).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }) : "-"}
                                            </td>
                                            <td className="p-4 text-sm text-gray-900">
                                                {task.owner.length > 20 ? `${task.owner.substring(0, 20)}...` : task.owner}
                                            </td>
                                            <td className="p-4">
                                                <span className={getPriorityBadge(task.priority)}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <FrappeButton
                                                    variant="action"
                                                    onClick={() => {
                                                        if (task.doctype === "Fund Received") {
                                                            navigate(`/fund-received/${task.id}`);
                                                        } else if (task.doctype === "Reimbursement") {
                                                            navigate(`/reimbursement/${task.id}`);
                                                        } else {
                                                            navigate(`/pending-tasks/${task.doctype}/${task.id}`);
                                                        }
                                                    }}
                                                    className="text-xs px-4 py-2"
                                                >
                                                    View
                                                </FrappeButton>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-gray-900 font-bold">
                                            {isLoading ? "Loading tasks..." : "No pending tasks found."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredTasks.length > 0 && (
                        <div className="p-4 border-t border-gray-300 bg-gray-50 flex justify-between items-center">
                            <div className="text-sm text-gray-900 font-medium">
                                Showing {indexOfFirstTask + 1} to {Math.min(indexOfLastTask, filteredTasks.length)} of {filteredTasks.length} entries
                            </div>
                            <div className="flex gap-1">
                                <FrappeButton
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    variant="outline"
                                >
                                    Previous
                                </FrappeButton>
                                {getPageNumbers().map((page, index) => (
                                    <FrappeButton
                                        key={index}
                                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                                        disabled={typeof page !== 'number'}
                                        variant={page === currentPage ? "primary" : "outline"}
                                        className={cn(typeof page !== 'number' && "cursor-default")}
                                    >
                                        {page}
                                    </FrappeButton>
                                ))}
                                <FrappeButton
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    variant="outline"
                                >
                                    Next
                                </FrappeButton>
                            </div>
                        </div>
                    )}
                </FrappeCard>
            </main>
        </div>
    );
};

export default PendingTask;
