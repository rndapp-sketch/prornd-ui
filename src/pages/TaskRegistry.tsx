// import React, { useState, useEffect } from 'react';
// import { FaExclamationCircle, FaArrowLeft, FaSearch } from 'react-icons/fa';
// import { cn } from '@/lib/utils';
// import { AppSidebar } from '@/components/RndSidebar';
// import { useNavigate } from 'react-router-dom';
// import { useFrappeGetCall } from 'frappe-react-sdk';
// import { GlobalLoader } from '@/components/ui/global-loader';
// // import { debounce } from 'lodash';

// // Define interfaces for the API response
// interface TaskRecord {
//     name: string;
//     title: string;
//     status: string;
//     creation: string;
//     modified: string;
//     owner: string;
// }

// interface TaskResult {
//     doctype: string;
//     records: TaskRecord[];
// }

// interface PaginationData {
//     page: number;
//     page_size: number;
//     total_pages: number;
//     total_count: number;
// }

// interface TaskRegistryResponse {
//     message: {
//         results: TaskResult[];
//         pagination: PaginationData;
//         filters: {
//             search: string;
//             doctype_filter: string[];
//         };
//     };
// }

// // Interface for the flattened task structure
// interface FlattenedTask {
//     id: string;
//     title: string;
//     status: string;
//     creation: string;
//     modified: string;
//     owner: string;
//     doctype: string;
// }

// // Frappe-styled components
// const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
//     <div className={cn("bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-sm", className)}>
//         {children}
//     </div>
// );

// const FrappeButton = ({ children, onClick, disabled, className, variant = 'ghost' }: {
//     children: React.ReactNode;
//     onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
//     disabled?: boolean;
//     className?: string;
//     variant?: 'primary' | 'ghost' | 'outline' | 'action';
// }) => (
//     <button
//         onClick={onClick}
//         disabled={disabled}
//         className={cn(
//             "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-150",
//             "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
//             variant === 'primary' && "bg-[#D97757] text-white hover:bg-[#D97757] shadow-md hover:shadow-lg border border-[#D97757]",
//             variant === 'ghost' && "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 hover:text-zinc-900 dark:text-zinc-100",
//             variant === 'outline' && "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
//             variant === 'action' && "bg-[#D97757] text-white font-bold hover:bg-[#D97757] shadow-md hover:shadow-lg border-2 border-[#D97757]",
//             "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
//             className
//         )}
//     >
//         {children}
//     </button>
// );

// const DOCTYPE_OPTIONS = [
//     "Project Registration",
//     "Fund Received",
//     "Fund Sanction",
//     "Reimbursement",
//     "Rate Contract",
//     "Travel Request",
//     "Temporary Advance",
//     "Deposit Slip"
// ];

// const TaskRegistry: React.FC = () => {
//     const navigate = useNavigate();
//     const [currentPage, setCurrentPage] = useState(1);
//     const [selectedModule, setSelectedModule] = useState<string>('');
//     const [searchQuery, setSearchQuery] = useState('');
//     const [debouncedSearch, setDebouncedSearch] = useState('');
//     const itemsPerPage = 10;

//     // Debounce search input
//     useEffect(() => {
//         const timer = setTimeout(() => {
//             setDebouncedSearch(searchQuery);
//             setCurrentPage(1); // Reset page on search
//         }, 500);
//         return () => clearTimeout(timer);
//     }, [searchQuery]);

//     // Fetch processed/forwarded documents
//     const { data, isLoading, error } = useFrappeGetCall<TaskRegistryResponse>(
//         "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_task_registry",
//         {
//             page_name: "task-registry"
//         }
//     );

//     // import { debounce } from 'lodash'; // Removed unused import

//     // ...

//     // Transform API data into flattened tasks
//     const allTasks: FlattenedTask[] = React.useMemo(() => {
//         if (!data?.message?.results) return [];

//         const tasks: FlattenedTask[] = [];
//         data.message.results.forEach((group) => {
//             if (group.records && Array.isArray(group.records)) {
//                 group.records.forEach((record) => {
//                     tasks.push({
//                         id: record.name,
//                         title: record.title,
//                         status: record.status,
//                         creation: record.creation,
//                         modified: record.modified,
//                         owner: record.owner,
//                         doctype: group.doctype
//                     });
//                 });
//             }
//         });
//         return tasks;
//     }, [data]);

//     // Client-side filtering
//     const filteredTasks = React.useMemo(() => {
//         let tasks = allTasks;

//         if (debouncedSearch) {
//             const lowerSearch = debouncedSearch.toLowerCase();
//             tasks = tasks.filter(task =>
//                 task.title.toLowerCase().includes(lowerSearch) ||
//                 task.id.toLowerCase().includes(lowerSearch) ||
//                 task.owner.toLowerCase().includes(lowerSearch)
//             );
//         }

//         if (selectedModule) {
//             tasks = tasks.filter(task => task.doctype === selectedModule);
//         }

//         return tasks;
//     }, [allTasks, debouncedSearch, selectedModule]);

//     // Client-side pagination
//     const paginatedTasks = React.useMemo(() => {
//         const startIndex = (currentPage - 1) * itemsPerPage;
//         return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
//     }, [filteredTasks, currentPage, itemsPerPage]);

//     const handlePageChange = (pageNumber: number) => {
//         setCurrentPage(pageNumber);
//     };

//     const handleModuleChange = (module: string) => {
//         setSelectedModule(module);
//         setCurrentPage(1);
//     };

//     const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setSearchQuery(e.target.value);
//     };

//     const getStatusBadge = (status: string) => {
//         const s = status?.toLowerCase();
//         let style = "bg-blue-100 text-blue-800 border-blue-300";
//         if (["pending", "under review", "approval pending"].some(t => s?.includes(t))) {
//             style = "bg-amber-100 text-amber-800 border-amber-300";
//         } else if (s?.includes("approved")) {
//             style = "bg-emerald-100 text-emerald-800 border-emerald-300";
//         } else if (s?.includes("draft")) {
//             style = "bg-slate-100 text-slate-800 border-slate-300";
//         } else if (s?.includes("rejected")) {
//             style = "bg-red-100 text-red-800 border-red-300";
//         } else if (s?.includes("forwarded") || s?.includes("processed")) {
//             style = "bg-purple-100 text-purple-800 border-purple-300";
//         }
//         return cn("px-2.5 py-1 rounded-md text-xs font-bold border", style);
//     };

//     const getPageNumbers = () => {
//         const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
//         const pages: (number | string)[] = [];
//         const maxButtons = 3;

//         if (totalPages <= maxButtons) {
//             for (let i = 1; i <= totalPages; i++) pages.push(i);
//         } else {
//             if (currentPage <= 3) {
//                 pages.push(1, 2, 3, '...', totalPages);
//             } else if (currentPage >= totalPages - 2) {
//                 pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
//             } else {
//                 pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
//             }
//         }
//         return pages;
//     };

//     if (error) {
//         return (
//             <div className="flex h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-800">
//                 <FrappeCard className="p-8 text-center">
//                     <FaExclamationCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
//                     <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Error Loading Task Registry</h2>
//                     <p className="text-zinc-900 dark:text-zinc-100">{error.message}</p>
//                 </FrappeCard>
//             </div>
//         );
//     }

//     const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 0;
//     const totalCount = filteredTasks.length;
//     const currentCount = paginatedTasks.length;
//     const indexOfFirstTask = (currentPage - 1) * itemsPerPage;

//     return (
//         <div className="bg-zinc-100 dark:bg-zinc-800 min-h-screen">
//             <GlobalLoader isLoading={isLoading} />
//             <AppSidebar />

//             <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//                 {/* Header */}
//                 <FrappeCard className="mb-6 p-5">
//                     <div className="flex items-center gap-4">
//                         <button
//                             onClick={() => navigate(-1)}
//                             className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700"
//                             aria-label="Go back"
//                         >
//                             <FaArrowLeft className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
//                         </button>
//                         <div>
//                             <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Task Registry</h1>
//                             <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">View all processed and forwarded documents.</p>
//                         </div>
//                     </div>
//                 </FrappeCard>

//                 {/* Filter & Search Section */}
//                 <FrappeCard className="mb-4 p-4">
//                     <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
//                         <div className="flex flex-1 items-center gap-4 w-full">
//                             {/* Search Input */}
//                             <div className="relative w-full md:w-64">
//                                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                                     <FaSearch className="text-zinc-400 dark:text-zinc-500" />
//                                 </div>
//                                 <input
//                                     type="text"
//                                     placeholder="Search documents..."
//                                     value={searchQuery}
//                                     onChange={handleSearchChange}
//                                     className="w-full pl-10 pr-4 py-2 border-2 border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-0 transition-colors"
//                                 />
//                             </div>

//                             {/* Module Filter */}
//                             <div className="flex items-center gap-2">
//                                 <label htmlFor="module-filter" className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-sm whitespace-nowrap hidden md:block">
//                                     Filter:
//                                 </label>
//                                 <select
//                                     id="module-filter"
//                                     value={selectedModule}
//                                     onChange={(e) => handleModuleChange(e.target.value)}
//                                     className="h-10 px-4 bg-white dark:bg-zinc-900 border-2 border-zinc-400 dark:border-zinc-600 rounded-lg font-bold text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:border-zinc-900 dark:focus:border-zinc-100"
//                                 >
//                                     <option value="">All Modules</option>
//                                     {DOCTYPE_OPTIONS.map((module) => (
//                                         <option key={module} value={module}>
//                                             {module}
//                                         </option>
//                                     ))}
//                                 </select>
//                                 {selectedModule && (
//                                     <FrappeButton
//                                         onClick={() => handleModuleChange('')}
//                                         className="text-red-600 hover:bg-red-50 border border-red-200"
//                                     >
//                                         Clear
//                                     </FrappeButton>
//                                 )}
//                             </div>
//                         </div>

//                         <div className="text-sm text-zinc-900 dark:text-zinc-100 font-bold whitespace-nowrap">
//                             Total: {totalCount} documents
//                         </div>
//                     </div>
//                 </FrappeCard>

//                 {/* Table */}
//                 <FrappeCard className="overflow-hidden p-0">
//                     <div className="overflow-x-auto">
//                         <table className="w-full divide-y divide-gray-300">
//                             <thead className="bg-zinc-200 dark:bg-zinc-700">
//                                 <tr className="divide-x divide-gray-300">
//                                     <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Status</th>
//                                     <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Module</th>
//                                     <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Title</th>
//                                     <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Document ID</th>
//                                     <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Created</th>
//                                     <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Modified</th>
//                                     <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Owner</th>
//                                     <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Action</th>
//                                 </tr>
//                             </thead>
//                             <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
//                                 {paginatedTasks.length > 0 ? (
//                                     paginatedTasks.map((task) => (
//                                         <tr
//                                             key={task.id}
//                                             onClick={() => {
//                                                 if (task.doctype === "Fund Received") {
//                                                     navigate(`/fund-received/${task.id}`);
//                                                 } else if (task.doctype === "Reimbursement") {
//                                                     navigate(`/reimbursement/${task.id}`);
//                                                 } else if (task.doctype === "Disbursal of Consultancy") {
//                                                     navigate(`/disbursal-of-consultancy/${task.id}`);
//                                                 } else if (task.doctype === "Project Registration" && task.status?.toLowerCase().includes("approved")) {
//                                                     navigate(`/project-details-overview/${task.id}`);
//                                                 } else {
//                                                     navigate(`/task-registry/${task.doctype}/${task.id}`);
//                                                 }
//                                             }}
//                                             className="hover:bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer transition-colors"
//                                         >
//                                             <td className="p-4">
//                                                 <span className={getStatusBadge(task.status)}>
//                                                     {task.status}
//                                                 </span>
//                                             </td>
//                                             <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
//                                                 {task.doctype}
//                                             </td>
//                                             <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100 text-sm">
//                                                 {task.title.length > 30 ? `${task.title.substring(0, 30)}...` : task.title}
//                                             </td>
//                                             <td className="p-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
//                                                 {task.id.length > 25 ? `${task.id.substring(0, 25)}...` : task.id}
//                                             </td>
//                                             <td className="p-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
//                                                 {task.creation ? new Date(task.creation).toLocaleDateString("en-IN") : "-"}
//                                             </td>
//                                             <td className="p-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
//                                                 {task.modified ? new Date(task.modified).toLocaleDateString("en-IN") : "-"}
//                                             </td>
//                                             <td className="p-4 text-sm text-zinc-900 dark:text-zinc-100">
//                                                 {task.owner.length > 20 ? `${task.owner.substring(0, 20)}...` : task.owner}
//                                             </td>
//                                             <td className="p-4">
//                                                 <FrappeButton
//                                                     variant="action"
//                                                     onClick={(e) => {
//                                                         e?.stopPropagation();
//                                                         if (task.doctype === "Fund Received") {
//                                                             navigate(`/fund-received/${task.id}`);
//                                                         } else if (task.doctype === "Reimbursement") {
//                                                             navigate(`/reimbursement/${task.id}`);
//                                                         } else if (task.doctype === "Disbursal of Consultancy") {
//                                                             navigate(`/disbursal-of-consultancy/${task.id}`);
//                                                         } else if (task.doctype === "Project Registration" && task.status?.toLowerCase().includes("approved")) {
//                                                             navigate(`/project-details-overview/${task.id}`);
//                                                         } else {
//                                                             navigate(`/task-registry/${task.doctype}/${task.id}`);
//                                                         }
//                                                     }}
//                                                     className="text-xs px-4 py-2"
//                                                 >
//                                                     View
//                                                 </FrappeButton>
//                                             </td>
//                                         </tr>
//                                     ))
//                                 ) : (
//                                     <tr>
//                                         <td colSpan={8} className="p-8 text-center text-zinc-900 dark:text-zinc-100 font-bold">
//                                             {isLoading ? "Loading documents..." : "No documents found matching your criteria."}
//                                         </td>
//                                     </tr>
//                                 )}
//                             </tbody>
//                         </table>
//                     </div>

//                     {/* Pagination Controls */}
//                     {allTasks.length > 0 && (
//                         <div className="p-4 border-t border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
//                             <div>
//                                 <div className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">
//                                     Showing {indexOfFirstTask + 1} to {indexOfFirstTask + currentCount} of {totalCount} entries
//                                 </div>
//                             </div>
//                             <div className="flex gap-1">
//                                 <FrappeButton
//                                     onClick={() => handlePageChange(currentPage - 1)}
//                                     disabled={currentPage === 1}
//                                     variant="outline"
//                                 >
//                                     Previous
//                                 </FrappeButton>
//                                 {getPageNumbers().map((page, index) => (
//                                     <FrappeButton
//                                         key={index}
//                                         onClick={() => typeof page === 'number' && handlePageChange(page)}
//                                         disabled={typeof page !== 'number'}
//                                         variant={page === currentPage ? "primary" : "outline"}
//                                         className={cn(typeof page !== 'number' && "cursor-default")}
//                                     >
//                                         {page}
//                                     </FrappeButton>
//                                 ))}
//                                 <FrappeButton
//                                     onClick={() => handlePageChange(currentPage + 1)}
//                                     disabled={currentPage === totalPages}
//                                     variant="outline"
//                                 >
//                                     Next
//                                 </FrappeButton>
//                             </div>
//                         </div>
//                     )}
//                 </FrappeCard>
//             </main>
//         </div>
//     );
// };

// export default TaskRegistry;






import React, { useState, useEffect } from 'react';
import { FaExclamationCircle, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { AppSidebar } from '@/components/RndSidebar';
import { useNavigate } from 'react-router-dom';
import { useFrappeGetCall, useFrappeGetDocList } from 'frappe-react-sdk';
import { GlobalLoader } from '@/components/ui/global-loader';
import { ActivityLog } from '@/components/ActivityLog';
import { XIcon, ActivityIcon } from 'lucide-react';
// import { debounce } from 'lodash';

// Define interfaces for the API response
interface TaskRecord {
    name: string;
    title: string;
    status: string;
    creation: string;
    modified: string;
    owner: string;
}

interface TaskResult {
    doctype: string;
    records: TaskRecord[];
}

interface PaginationData {
    page: number;
    page_size: number;
    total_pages: number;
    total_count: number;
}

interface TaskRegistryResponse {
    message: {
        results: TaskResult[];
        pagination: PaginationData;
        filters: {
            search: string;
            doctype_filter: string[];
        };
    };
}

// Interface for the flattened task structure
interface FlattenedTask {
    id: string;
    title: string;
    status: string;
    creation: string;
    modified: string;
    owner: string;
    doctype: string;
}

// Frappe-styled components
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'ghost' }: {
    children: React.ReactNode;
    onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline' | 'action';
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
            variant === 'primary' && "bg-[#D97757] text-white hover:bg-[#D97757] shadow-md hover:shadow-lg border border-[#D97757]",
            variant === 'ghost' && "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 hover:text-zinc-900 dark:text-zinc-100",
            variant === 'outline' && "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
            variant === 'action' && "bg-[#D97757] text-white font-bold hover:bg-[#D97757] shadow-md hover:shadow-lg border-2 border-[#D97757]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

const DOCTYPE_OPTIONS = [
    "Project Registration",
    "Fund Received",
    "Fund Sanction",
    "Reimbursement",
    "Rate Contract",
    "Travel Request",
    "Temporary Advance",
    "Deposit Slip",
    "Recruitment Adhoc Contractual",
];

const TaskRegistry: React.FC = () => {
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedModule, setSelectedModule] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const itemsPerPage = 10;

    // Activity peek panel state
    const [selectedTask, setSelectedTask] = useState<{ doctype: string; docname: string; title: string } | null>(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch processed/forwarded documents
    const { data, isLoading, error } = useFrappeGetCall<TaskRegistryResponse>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_task_registry",
        {
            page_name: "task-registry",
            debug: 1,
        }
    );

    // Supplemental fetch: Recruitment Adhoc Contractual is not returned by the
    // task-registry endpoint, so fetch them directly and merge below.
    const { data: recData } = useFrappeGetDocList<{
        name: string;
        upfa_project_title?: string;
        workflow_state?: string;
        creation: string;
        modified: string;
        owner: string;
    }>("Recruitment Adhoc Contractual", {
        fields: ["name", "upfa_project_title", "workflow_state", "creation", "modified", "owner"],
        limit: 500,
        orderBy: { field: "modified", order: "desc" },
    });

    // import { debounce } from 'lodash'; // Removed unused import

    // ...

    // Transform API data into flattened tasks
    const allTasks: FlattenedTask[] = React.useMemo(() => {
        const existingIds = new Set<string>();
        const tasks: FlattenedTask[] = [];

        if (data?.message?.results) {
            data.message.results.forEach((group) => {
                if (group.records && Array.isArray(group.records)) {
                    group.records.forEach((record) => {
                        existingIds.add(record.name);
                        tasks.push({
                            id: record.name,
                            title: record.title,
                            status: record.status,
                            creation: record.creation,
                            modified: record.modified,
                            owner: record.owner,
                            doctype: group.doctype,
                        });
                    });
                }
            });
        }

        // Merge Recruitment Adhoc Contractual records not already in the registry response
        if (recData) {
            recData.forEach((rec) => {
                if (!existingIds.has(rec.name)) {
                    tasks.push({
                        id: rec.name,
                        title: rec.upfa_project_title || rec.name,
                        status: rec.workflow_state || '',
                        creation: rec.creation,
                        modified: rec.modified,
                        owner: rec.owner,
                        doctype: 'Recruitment Adhoc Contractual',
                    });
                }
            });
        }

        return tasks;
    }, [data, recData]);

    // Client-side filtering
    const filteredTasks = React.useMemo(() => {
        let tasks = allTasks;

        if (debouncedSearch) {
            const lowerSearch = debouncedSearch.toLowerCase();
            tasks = tasks.filter(task =>
                task.title.toLowerCase().includes(lowerSearch) ||
                task.id.toLowerCase().includes(lowerSearch) ||
                task.owner.toLowerCase().includes(lowerSearch)
            );
        }

        if (selectedModule) {
            tasks = tasks.filter(task => task.doctype === selectedModule);
        }

        return tasks;
    }, [allTasks, debouncedSearch, selectedModule]);

    // Client-side pagination
    const paginatedTasks = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTasks, currentPage, itemsPerPage]);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const handleModuleChange = (module: string) => {
        setSelectedModule(module);
        setCurrentPage(1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
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
        } else if (s?.includes("forwarded") || s?.includes("processed")) {
            style = "bg-purple-100 text-purple-800 border-purple-300";
        }
        return cn("px-2.5 py-1 rounded-md text-xs font-bold border", style);
    };

    const getPageNumbers = () => {
        const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
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
            <div className="flex h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                <FrappeCard className="p-8 text-center">
                    <FaExclamationCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Error Loading Task Registry</h2>
                    <p className="text-zinc-900 dark:text-zinc-100">{error.message}</p>
                </FrappeCard>
            </div>
        );
    }

    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 0;
    const totalCount = filteredTasks.length;
    const currentCount = paginatedTasks.length;
    const indexOfFirstTask = (currentPage - 1) * itemsPerPage;

    return (
        <>
        <div className="bg-zinc-100 dark:bg-zinc-800 min-h-screen">
            <GlobalLoader isLoading={isLoading} />
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                {/* Header */}
                <FrappeCard className="mb-6 p-5">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700"
                            aria-label="Go back"
                        >
                            <FaArrowLeft className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Task Registry</h1>
                            <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">View all processed and forwarded documents.</p>
                        </div>
                    </div>
                </FrappeCard>

                {/* Filter & Search Section */}
                <FrappeCard className="mb-4 p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-1 items-center gap-4 w-full">
                            {/* Search Input */}
                            <div className="relative w-full md:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaSearch className="text-zinc-400 dark:text-zinc-500" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search documents..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-4 py-2 border-2 border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-0 transition-colors"
                                />
                            </div>

                            {/* Module Filter */}
                            <div className="flex items-center gap-2">
                                <label htmlFor="module-filter" className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-sm whitespace-nowrap hidden md:block">
                                    Filter:
                                </label>
                                <select
                                    id="module-filter"
                                    value={selectedModule}
                                    onChange={(e) => handleModuleChange(e.target.value)}
                                    className="h-10 px-4 bg-white dark:bg-zinc-900 border-2 border-zinc-400 dark:border-zinc-600 rounded-lg font-bold text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:border-zinc-900 dark:focus:border-zinc-100"
                                >
                                    <option value="">All Modules</option>
                                    {DOCTYPE_OPTIONS.map((module) => (
                                        <option key={module} value={module}>
                                            {module}
                                        </option>
                                    ))}
                                </select>
                                {selectedModule && (
                                    <FrappeButton
                                        onClick={() => handleModuleChange('')}
                                        className="text-red-600 hover:bg-red-50 border border-red-200"
                                    >
                                        Clear
                                    </FrappeButton>
                                )}
                            </div>
                        </div>

                        <div className="text-sm text-zinc-900 dark:text-zinc-100 font-bold whitespace-nowrap">
                            Total: {totalCount} documents
                        </div>
                    </div>
                </FrappeCard>

                {/* Table */}
                <FrappeCard className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-gray-300">
                            <thead className="bg-zinc-200 dark:bg-zinc-700">
                                <tr className="divide-x divide-gray-300">
                                    <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Status</th>
                                    <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Module</th>
                                    <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Title</th>
                                    <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Document ID</th>
                                    <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Created</th>
                                    <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Modified</th>
                                    <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Owner</th>
                                    <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {paginatedTasks.length > 0 ? (
                                    paginatedTasks.map((task) => (
                                        <tr
                                            key={task.id}
                                            onClick={() => {
                                                if (task.doctype === "Fund Received") {
                                                    navigate(`/fund-received/${task.id}`);
                                                } else if (task.doctype === "Reimbursement") {
                                                    navigate(`/reimbursement/${task.id}`);
                                                } else if (task.doctype === "Disbursal of Consultancy") {
                                                    navigate(`/disbursal-of-consultancy/${task.id}`);
                                                } else if (task.doctype === "Travel") {
                                                    navigate(`/travel/${task.id}`);
                                                } else if (task.doctype === "Project Registration" && task.status?.toLowerCase().includes("approved")) {
                                                    navigate(`/project-details-overview/${task.id}`, { state: { fromTaskRegistry: true } });
                                                } else {
                                                    navigate(`/task-registry/${task.doctype}/${task.id}`);
                                                }
                                            }}
                                            className="hover:bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer transition-colors"
                                        >
                                            <td className="p-4">
                                                <span className={getStatusBadge(task.status)}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                                                {task.doctype}
                                            </td>
                                            <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                                                <button
                                                    className="text-left hover:text-[#D97757] transition-colors flex items-center gap-1.5 group"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTask({ doctype: task.doctype, docname: task.id, title: task.title });
                                                    }}
                                                    title="Click to preview activity log"
                                                >
                                                    {task.title.length > 30 ? `${task.title.substring(0, 30)}...` : task.title}
                                                    <ActivityIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#D97757] flex-shrink-0 transition-opacity" />
                                                </button>
                                            </td>
                                            <td className="p-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                                                {task.id.length > 25 ? `${task.id.substring(0, 25)}...` : task.id}
                                            </td>
                                            <td className="p-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                                                {task.creation ? new Date(task.creation).toLocaleDateString("en-IN") : "-"}
                                            </td>
                                            <td className="p-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                                                {task.modified ? new Date(task.modified).toLocaleDateString("en-IN") : "-"}
                                            </td>
                                            <td className="p-4 text-sm text-zinc-900 dark:text-zinc-100">
                                                {task.owner.length > 20 ? `${task.owner.substring(0, 20)}...` : task.owner}
                                            </td>
                                            <td className="p-4">
                                                <FrappeButton
                                                    variant="action"
                                                    onClick={(e) => {
                                                        e?.stopPropagation();
                                                        if (task.doctype === "Fund Received") {
                                                            navigate(`/fund-received/${task.id}`);
                                                        } else if (task.doctype === "Reimbursement") {
                                                            navigate(`/reimbursement/${task.id}`);
                                                        } else if (task.doctype === "Disbursal of Consultancy") {
                                                            navigate(`/disbursal-of-consultancy/${task.id}`);
                                                        } else if (task.doctype === "Travel") {
                                                            navigate(`/travel/${task.id}`);
                                                        } else if (task.doctype === "Project Registration" && task.status?.toLowerCase().includes("approved")) {
                                                            navigate(`/project-details-overview/${task.id}`, { state: { fromTaskRegistry: true } });
                                                        } else {
                                                            navigate(`/task-registry/${task.doctype}/${task.id}`);
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
                                        <td colSpan={8} className="p-8 text-center text-zinc-900 dark:text-zinc-100 font-bold">
                                            {isLoading ? "Loading documents..." : "No documents found matching your criteria."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {allTasks.length > 0 && (
                        <div className="p-4 border-t border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
                            <div>
                                <div className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                                    Showing {indexOfFirstTask + 1} to {indexOfFirstTask + currentCount} of {totalCount} entries
                                </div>
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

            {/* Activity Log Peek Panel */}
            {selectedTask && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSelectedTask(null)}
                >
                    <div
                        className="absolute right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-0.5">
                                    {selectedTask.doctype}
                                </p>
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                    {selectedTask.title}
                                </p>
                                <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 truncate">
                                    {selectedTask.docname}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="ml-3 p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors flex-shrink-0"
                                aria-label="Close panel"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Activity log */}
                        <div className="flex-1 overflow-y-auto p-5">
                            <ActivityLog
                                doctype={selectedTask.doctype}
                                docname={selectedTask.docname}
                                maxHeight="100%"
                            />
                        </div>

                        {/* Footer action */}
                        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                            <button
                                onClick={() => {
                                    setSelectedTask(null);
                                    // Navigate based on same logic as existing rows
                                    const t = selectedTask;
                                    if (t.doctype === 'Fund Received') navigate(`/fund-received/${t.docname}`);
                                    else if (t.doctype === 'Reimbursement') navigate(`/reimbursement/${t.docname}`);
                                    else if (t.doctype === 'Disbursal of Consultancy') navigate(`/disbursal-of-consultancy/${t.docname}`);
                                    else if (t.doctype === 'Travel') navigate(`/travel/${t.docname}`);
                                    else navigate(`/task-registry/${t.doctype}/${t.docname}`);
                                }}
                                className="w-full py-2.5 px-4 bg-[#D97757] text-white text-sm font-bold rounded-lg hover:bg-[#c66a4e] transition-colors"
                            >
                                View Full Details →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TaskRegistry;
