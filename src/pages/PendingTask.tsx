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
            High: 'bg-red-50 text-red-700 border-red-200',
            Medium: 'bg-amber-50 text-amber-700 border-amber-200',
            Low: 'bg-green-50 text-green-700 border-green-200',
        };
        return cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", styles[priority] || 'bg-gray-50 text-gray-700 border-gray-200');
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
            <div className="flex h-screen items-center justify-center bg-[#F0F4F8]">
                <div className="text-red-600 font-medium text-lg">Error loading tasks: {error.message}</div>
            </div>
        );
    }

    return (
        <div className="bg-[#F0F4F8] min-h-screen">
            <GlobalLoader isLoading={isLoading} />
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-6 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            aria-label="Go back"
                        >
                            <FaArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">Pending Tasks</h1>
                            <p className="text-sm text-[#6B7280] mt-0.5">Manage and track your pending tasks.</p>
                        </div>
                    </div>
                </header>

                {/* Filter Section */}
                <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4 flex-wrap">
                        <label htmlFor="module-filter" className="frappe-label">
                            Filter by Module:
                        </label>
                        <select
                            id="module-filter"
                            value={selectedModule}
                            onChange={(e) => handleModuleChange(e.target.value)}
                            className="frappe-select"
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
                                className="frappe-btn frappe-btn-ghost text-red-600 hover:bg-red-50"
                            >
                                Clear Filter
                            </button>
                        )}
                        <div className="ml-auto text-sm text-[#6B7280]">
                            Showing {filteredTasks.length} of {allTasks.length} tasks
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="frappe-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Module</th>
                                    <th>Title</th>
                                    <th>Project Number</th>
                                    <th>Creation</th>
                                    <th>Modified</th>
                                    <th>Owner</th>
                                    <th>Priority</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentTasks.length > 0 ? (
                                    currentTasks.map((task) => (
                                        <tr key={task.id}>
                                            <td>
                                                <div className="flex items-center gap-1.5 text-amber-600 font-medium text-sm">
                                                    <FaExclamationCircle className="w-4 h-4" />
                                                    <span>{task.status}</span>
                                                </div>
                                            </td>
                                            <td className="font-medium text-gray-900">
                                                {task.doctype}
                                            </td>
                                            <td className="font-medium text-gray-900">
                                                {task.title}
                                            </td>
                                            <td className="text-sm text-gray-600">
                                                {task["Project Number"]}
                                            </td>
                                            <td className="text-sm text-gray-600">
                                                {task.creation ? new Date(task.creation).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }) : "-"}
                                            </td>
                                            <td className="text-sm text-gray-600">
                                                {task.modified ? new Date(task.modified).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }) : "-"}
                                            </td>
                                            <td className="text-sm text-gray-600">
                                                {task.owner}
                                            </td>
                                            <td>
                                                <span className={getPriorityBadge(task.priority)}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="frappe-btn frappe-btn-primary text-sm"
                                                    onClick={() => {
                                                        if (task.doctype === "Fund Received") {
                                                            navigate(`/fund-received/${task.id}`);
                                                        } else {
                                                            navigate(`/pending-tasks/${task.doctype}/${task.id}`);
                                                        }
                                                    }}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-[#6B7280]">
                                            {isLoading ? "Loading tasks..." : "No pending tasks found."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredTasks.length > 0 && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-between items-center">
                            <div className="text-sm text-[#6B7280]">
                                Showing {indexOfFirstTask + 1} to {Math.min(indexOfLastTask, filteredTasks.length)} of {filteredTasks.length} entries
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="frappe-btn frappe-btn-ghost disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                {getPageNumbers().map((page, index) => (
                                    <button
                                        key={index}
                                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                                        disabled={typeof page !== 'number'}
                                        className={cn(
                                            "frappe-btn",
                                            page === currentPage ? "frappe-btn-primary" : "frappe-btn-ghost",
                                            typeof page !== 'number' && "cursor-default"
                                        )}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="frappe-btn frappe-btn-ghost disabled:opacity-50"
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
