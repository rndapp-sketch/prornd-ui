import React, { useState } from 'react';
import { FaClock, FaExclamationCircle, FaArrowLeft } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { AppSidebar } from '@/components/RndSidebar';
import { NeoButton } from '@/components/ui/neo-brutalism';
import { useNavigate } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { GlobalLoader } from '@/components/ui/global-loader';

// Define interfaces for the API response
interface PendingTaskRecord {
    name: string;
    title: string;
    status: string;
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
    description: string; // We'll use the title or doctype as description for now since API doesn't provide one
    status: string;
    priority: string; // API doesn't provide priority, will default
    date: string; // API doesn't provide date, will default
    doctype: string;
}

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
                    description: `${group.doctype} - ${record.name}`, // Construct a description
                    status: record.status, // Use actual status from API
                    priority: 'Medium', // Default priority
                    date: record.modified?.split(' ')[0] || new Date().toISOString().split('T')[0], // Use modified date
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
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-orange-400';
            case 'Medium': return 'bg-amber-300';
            case 'Low': return 'bg-green-300';
            default: return 'bg-gray-200';
        }
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
            <div className="flex h-screen items-center justify-center bg-[#FDFCEC]">
                <div className="text-red-600 font-bold text-xl">Error loading tasks: {error.message}</div>
            </div>
        );
    }

    return (
        <div className="bg-[#FDFCEC] min-h-screen">
            <GlobalLoader isLoading={isLoading} />
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform">
                            <FaArrowLeft className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-black">Pending Tasks</h1>
                            <p className="text-gray-700 font-mono mt-1">Manage and track your pending tasks.</p>
                        </div>
                    </div>
                </header>

                {/* Filter Section */}
                <div className="mb-4 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-4">
                        <label htmlFor="module-filter" className="font-bold text-black">
                            Filter by Module:
                        </label>
                        <select
                            id="module-filter"
                            value={selectedModule}
                            onChange={(e) => handleModuleChange(e.target.value)}
                            className="px-4 py-2 border-2 border-black rounded-md font-bold bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
                        >
                            <option value="all">All Modules</option>
                            {moduleNames.map((module) => (
                                <option key={module} value={module}>
                                    {module}
                                </option>
                            ))}
                        </select>
                        {selectedModule !== 'all' && (
                            <button
                                onClick={() => handleModuleChange('all')}
                                className="px-3 py-2 border-2 border-black rounded-md font-bold bg-red-100 hover:bg-red-200 text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                            >
                                Clear Filter
                            </button>
                        )}
                        <div className="ml-auto text-sm font-bold text-gray-700">
                            Showing {filteredTasks.length} of {allTasks.length} tasks
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-black">
                                    <th className="p-4 font-extrabold text-black border-r-2 border-black uppercase tracking-wider">Status</th>
                                    <th className="p-4 font-extrabold text-black border-r-2 border-black uppercase tracking-wider">Module Name</th>
                                    <th className="p-4 font-extrabold text-black border-r-2 border-black uppercase tracking-wider">Title</th>
                                    <th className="p-4 font-extrabold text-black border-r-2 border-black uppercase tracking-wider">Description</th>
                                    <th className="p-4 font-extrabold text-black border-r-2 border-black uppercase tracking-wider">Date</th>
                                    <th className="p-4 font-extrabold text-black border-r-2 border-black uppercase tracking-wider">Priority</th>
                                    <th className="p-4 font-extrabold text-black uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentTasks.length > 0 ? (
                                    currentTasks.map((task) => (
                                        <tr key={task.id} className="border-b-2 border-black last:border-b-0 hover:bg-[#FDFCEC] transition-colors">
                                            <td className="p-4 border-r-2 border-black">
                                                <div className="flex items-center gap-2 text-orange-600 font-bold">
                                                    <FaExclamationCircle className="w-5 h-5" />
                                                    <span>{task.status}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 border-r-2 border-black font-bold text-black">
                                                {task.doctype}
                                            </td>
                                            <td className="p-4 border-r-2 border-black font-bold text-black">
                                                {task.title}
                                            </td>
                                            <td className="p-4 border-r-2 border-black font-mono text-gray-800">
                                                {task.description}
                                            </td>
                                            <td className="p-4 border-r-2 border-black font-mono font-semibold">
                                                <div className="flex items-center gap-2">
                                                    <FaClock className="w-4 h-4 text-gray-600" />
                                                    {task.date}
                                                </div>
                                            </td>
                                            <td className="p-4 border-r-2 border-black">
                                                <span className={cn("px-3 py-1 rounded-md border-2 border-black text-black font-bold text-sm inline-block", getPriorityColor(task.priority))}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <NeoButton
                                                    className="bg-[#A5D6A7] hover:bg-[#81C784] text-sm py-2 px-4 w-full"
                                                    onClick={() => {
                                                        if (task.doctype === "Fund Received") {
                                                            navigate(`/fund-received/${task.id}`);
                                                        } else {
                                                            navigate(`/pending-tasks/${task.doctype}/${task.id}`);
                                                        }
                                                    }}
                                                >
                                                    View
                                                </NeoButton>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center font-bold text-gray-500">
                                            {isLoading ? "Loading tasks..." : "No pending tasks found."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredTasks.length > 0 && (
                        <div className="p-4 border-t-2 border-black bg-gray-50 flex justify-between items-center">
                            <div className="text-sm font-bold text-black">
                                Showing {indexOfFirstTask + 1} to {Math.min(indexOfLastTask, filteredTasks.length)} of {filteredTasks.length} entries
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border-2 border-black rounded-md font-bold bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_rgba(0,0,0,0.25)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                                >
                                    Previous
                                </button>
                                {getPageNumbers().map((page, index) => (
                                    <button
                                        key={index}
                                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                                        disabled={typeof page !== 'number'}
                                        className={cn(
                                            "px-3 py-1 border-2 border-black rounded-md font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.25)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all",
                                            page === currentPage ? "bg-[#A5D6A7]" : "bg-white hover:bg-gray-200",
                                            typeof page !== 'number' && "cursor-default hover:bg-white shadow-none border-none active:translate-x-0 active:translate-y-0"
                                        )}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 border-2 border-black rounded-md font-bold bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_rgba(0,0,0,0.25)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PendingTask;
