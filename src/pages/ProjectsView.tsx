// import * as React from "react";
// import { useFrappeGetDocList, useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table"; // Assuming these are headless components
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useNavigate, useLocation } from "react-router-dom";
// import { AppSidebar } from "../components/RndSidebar";
// import { WorkflowTimeline } from "../components/WorkflowTimeline";
// import {
//   ChevronDownIcon,
//   ChevronRightIcon,
//   ClockIcon,
//   FolderOpenIcon,
//   FileSearchIcon,
//   AlertCircleIcon,
//   CheckCircleIcon,
//   UserIcon,
//   PlaneIcon,
//   FileTextIcon,
//   UsersIcon,
//   SendIcon,
//   CalendarIcon,
//   FileQuestionIcon,
//   ReceiptIcon,
//   SearchIcon,
//   ChevronLeftIcon,
//   ChevronRightIcon as ChevronRight
// } from "lucide-react";
// import { cn } from "@/lib/utils";

// // --- Interfaces & Data (Unchanged) ---
// interface Task {
//   id: string;
//   projectNumber: string;
//   projectTitle: string;
//   status?: string;
//   actionDate: string;
//   assignedTo?: string;
//   priority?: "Low" | "Medium" | "High" | "Urgent";
// }

// interface Project {
//   name: string;
//   project_title: string;
//   workflow_state: string;
//   pi_webmail: string;
//   creation?: string;
//   modified?: string;
// }

// interface ProjectsViewProps {
//   setActiveView?: (view: string) => void;
//   setSelectedProject?: (projectName: string | null) => void;
//   initialTab?: string;
// }

// const pendingTasksData: Record<string, Task[]> = {
//   "Temp Adv": [{ id: "TA-001", projectNumber: "PRJ-2024-001", projectTitle: "Research Equipment Purchase", status: "Pending Approval", actionDate: "2024-01-15", assignedTo: "Finance Dept", priority: "High" }],
//   "Travel": [{ id: "TR-001", projectNumber: "PRJ-2024-003", projectTitle: "International Conference - Singapore", status: "Approval Pending", actionDate: "2024-01-20", assignedTo: "Travel Desk", priority: "High" }],
//   "Leave": [{ id: "LV-001", projectNumber: "N/A", projectTitle: "Medical Leave Application", status: "Pending", actionDate: "2024-01-12", assignedTo: "HR Manager", priority: "Medium" }],
//   "Rate Contract": [{ id: "RC-001", projectNumber: "CON-2024-001", projectTitle: "Software License Renewal", status: "Under Negotiation", actionDate: "2024-01-18", assignedTo: "Procurement", priority: "High" }],
//   "Contractual Recruitment": [{ id: "CR-001", projectNumber: "HR-2024-001", projectTitle: "Research Assistant Position", status: "Interview Stage", actionDate: "2024-01-22", assignedTo: "HR Dept", priority: "Urgent" }],
//   "Fresh Proposal Submission": [{ id: "FP-001", projectNumber: "PROP-2024-001", projectTitle: "AI Research Initiative", status: "Draft Stage", actionDate: "2024-01-25", assignedTo: "R&D Committee", priority: "High" }],
//   "Extension of Tenure": [{ id: "ET-001", projectNumber: "EXT-2024-001", projectTitle: "Project Staff Extension", status: "Under Review", actionDate: "2024-01-14", assignedTo: "HR Director", priority: "Medium" }],
//   "NIQ Generation": [{ id: "NIQ-001", projectNumber: "NIQ-2024-001", projectTitle: "New Instrument Qualification", status: "Testing Phase", actionDate: "2024-01-16", assignedTo: "Quality Dept", priority: "High" }],
//   "Reimbursement (Max. Limit ₹ 1 lakh)": [{ id: "REIM-001", projectNumber: "REIM-2024-001", projectTitle: "Conference Expenses Reimbursement", status: "Document Verification", actionDate: "2024-01-11", assignedTo: "Accounts Dept", priority: "Medium" }],
// };

// const taskIcons = { "Temp Adv": UserIcon, "Travel": PlaneIcon, "Leave": CalendarIcon, "Rate Contract": FileTextIcon, "Contractual Recruitment": UsersIcon, "Fresh Proposal Submission": SendIcon, "Extension of Tenure": CalendarIcon, "NIQ Generation": FileQuestionIcon, "Reimbursement (Max. Limit ₹ 1 lakh)": ReceiptIcon };

// // --- Neo-Brutalism Styled Components ---

// const NeoButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
//   ({ className, children, ...props }, ref) => (
//     <button
//       ref={ref}
//       className={cn(
//         "px-4 py-2 bg-white border-2 border-black rounded-md font-bold text-black shadow-[4px_4px_0px_#000] transition-all",
//         "hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]",
//         "active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
//         "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-200 disabled:translate-x-0 disabled:translate-y-0",
//         className
//       )}
//       {...props}
//     >
//       {children}
//     </button>
//   )
// );
// NeoButton.displayName = "NeoButton";

// const NeoCard = ({ className, children }: { className?: string; children: React.ReactNode }) => (
//   <div className={cn("bg-white border-2 border-black rounded-md shadow-[6px_6px_0px_#000]", className)}>
//     {children}
//   </div>
// );

// // --- Main ProjectsView Component ---

// export function ProjectsView({ initialTab }: ProjectsViewProps) {
//   const [activeTab, setActiveTab] = React.useState(initialTab || "myProjects");
//   const [openPipeline, setOpenPipeline] = React.useState<string | null>(null);

//   // Search and Filter states
//   const [searchQuery, setSearchQuery] = React.useState("");
//   const [sortField, setSortField] = React.useState<"creation" | "name" | "project_title" | "workflow_state">("creation");
//   const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
//   const [currentPage, setCurrentPage] = React.useState(1);
//   const [itemsPerPage, setItemsPerPage] = React.useState(10);

//   const [openTaskCategories, setOpenTaskCategories] = React.useState<Record<string, boolean>>({});
//   const navigate = useNavigate();
//   const location = useLocation();

//   const { currentUser } = useFrappeAuth();
//   const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", { fields: ["roles"], enabled: !!currentUser });

//   const { isAdministrator, isPermanentEmployee } = React.useMemo(() => {
//     const roles = userData?.roles?.map((r: any) => r.role) ?? [];
//     return {
//       isAdministrator: roles.includes("Administrator"),
//       isPermanentEmployee: roles.includes("Permanent Employee"),
//     };
//   }, [userData]);

//   React.useEffect(() => {
//     if (initialTab) setActiveTab(initialTab);
//     if ((location.state as any)?.filter === "Application Under Process") {
//       setActiveTab("pending");
//       expandAllCategories();
//     }
//   }, [initialTab, location.state]);

//   const projectFilters = React.useMemo(() => {
//     if (isAdministrator) return [];
//     if (currentUser) return [["pi_webmail", "=", currentUser]];
//     return [["name", "=", "NON_EXISTENT_DOC"]]; // Prevent fetching if no user
//   }, [isAdministrator, currentUser]);

//   const { data: myProjects, isLoading: myProjectsLoading, error: myProjectsError } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["name", "project_title", "workflow_state", "pi_webmail", "creation", "modified"],
//     filters: projectFilters as any,
//     limit: 1000,
//   });

//   const filteredAndSortedProjects = React.useMemo(() => {
//     if (!myProjects) return [];
//     let filtered = myProjects.filter(p =>
//       Object.values(p).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()))
//     );
//     filtered.sort((a, b) => {
//       const aVal = (a as any)[sortField] ?? '';
//       const bVal = (b as any)[sortField] ?? '';
//       if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
//       if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
//       return 0;
//     });
//     return filtered;
//   }, [myProjects, searchQuery, sortField, sortOrder]);

//   const totalPages = Math.ceil(filteredAndSortedProjects.length / itemsPerPage);
//   const paginatedProjects = filteredAndSortedProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

//   const toggleTaskCategory = (category: string) => setOpenTaskCategories(p => ({ ...p, [category]: !p[category] }));
//   const expandAllCategories = () => setOpenTaskCategories(Object.keys(pendingTasksData).reduce((a, c) => ({ ...a, [c]: true }), {}));
//   const collapseAllCategories = () => setOpenTaskCategories({});

//   const handleSortChange = (field: "creation" | "name" | "project_title" | "workflow_state") => {
//     setSortField(field);
//     setSortOrder(sortField === field && sortOrder === "desc" ? "asc" : "desc");
//     setCurrentPage(1);
//   };

//   const getSortIcon = (field: string) => (sortField === field ? (sortOrder === "asc" ? "↑" : "↓") : "");

//   // --- Neo-Brutalism Badge Styles ---
//   const getPriorityBadge = (priority: string) => {
//     const styles: Record<string, string> = { "Low": "bg-green-300", "Medium": "bg-aqua-300", "High": "bg-orange-400", "Urgent": "bg-red-500 text-white" };
//     return cn("inline-block px-2 py-1 rounded-md text-xs font-bold border-2 border-black", styles[priority] || "bg-gray-300");
//   };

//   const getStatusBadge = (status: string) => {
//     const s = status?.toLowerCase();
//     let style = "bg-blue-300";
//     if (["pending", "under review", "approval pending"].some(t => s?.includes(t))) style = "bg-aqua-300";
//     else if (s?.includes("approved")) style = "bg-green-300";
//     else if (s?.includes("draft")) style = "bg-gray-300";
//     else if (s?.includes("rejected")) style = "bg-red-500 text-white";
//     return cn("inline-block px-2 py-1 rounded-md text-xs font-bold border-2 border-black", style);
//   };

//   // --- Render Functions ---

//   const renderPendingTasks = () => {
//     const totalTasks = Object.values(pendingTasksData).flat().length;
//     if (totalTasks === 0) {
//       return (
//         <NeoCard className="text-center py-12">
//           <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
//           <h3 className="text-2xl font-bold text-black">NO PENDING TASKS</h3>
//           <p className="text-gray-700 font-mono mt-2">All clear. Great job!</p>
//         </NeoCard>
//       );
//     }
//     return (
//       <div className="space-y-6">
//         <NeoCard className="p-4 flex justify-between items-center">
//           <div>
//             <h3 className="text-xl font-bold text-black uppercase">Applications Under Review ({totalTasks})</h3>
//             <p className="text-sm text-gray-700 font-mono">{Object.keys(pendingTasksData).length} categories</p>
//           </div>
//           <div className="flex gap-3">
//             <NeoButton onClick={expandAllCategories} className="text-sm flex items-center gap-2"><ChevronDownIcon className="h-4 w-4" />Expand All</NeoButton>
//             <NeoButton onClick={collapseAllCategories} className="text-sm flex items-center gap-2"><ChevronRightIcon className="h-4 w-4" />Collapse All</NeoButton>
//           </div>
//         </NeoCard>
//         <div className="space-y-4">
//           {Object.entries(pendingTasksData).map(([category, tasks]) => {
//             const Icon = (taskIcons as any)[category];
//             const isOpen = openTaskCategories[category];
//             return (
//               <NeoCard key={category} className="overflow-hidden p-0">
//                 <div className="flex items-center justify-between p-4 bg-aqua-300 border-b-2 border-black cursor-pointer hover:bg-aqua-400" onClick={() => toggleTaskCategory(category)}>
//                   <div className="flex items-center gap-3">
//                     <Icon className="h-6 w-6 text-black" />
//                     <h3 className="text-lg font-bold text-black">{category}</h3>
//                     <span className="bg-white text-black text-xs font-bold px-2 py-1 rounded-md border-2 border-black">{tasks.length}</span>
//                   </div>
//                   <ChevronDownIcon className={cn("h-6 w-6 text-black transition-transform", !isOpen && "-rotate-90")} />
//                 </div>
//                 {isOpen && (
//                   <div className="overflow-x-auto"><Table className="divide-y-2 divide-black">
//                     <TableHeader><TableRow className="divide-x-2 divide-black bg-gray-200">
//                       {["Task", "Title", "Status", "Priority", "Assigned", "Date", "Action"].map(h => <TableHead key={h} className="p-3 font-bold text-black uppercase">{h}</TableHead>)}
//                     </TableRow></TableHeader>
//                     <TableBody className="divide-y-2 divide-black bg-white">
//                       {tasks.map(task => (<TableRow key={task.id} className="divide-x-2 divide-black hover:bg-aqua-100">
//                         <TableCell className="p-3 font-mono">{task.id}</TableCell>
//                         <TableCell className="p-3 font-medium">{task.projectTitle}<br/><span className="font-mono text-gray-600 text-sm">{task.projectNumber}</span></TableCell>
//                         <TableCell className="p-3"><span className={getStatusBadge(task.status!)}>{task.status}</span></TableCell>
//                         <TableCell className="p-3"><span className={getPriorityBadge(task.priority!)}>{task.priority}</span></TableCell>
//                         <TableCell className="p-3 font-mono">{task.assignedTo}</TableCell>
//                         <TableCell className="p-3 font-mono">{new Date(task.actionDate).toLocaleDateString()}</TableCell>
//                         <TableCell className="p-3 text-right"><NeoButton className="text-sm bg-aqua-300 hover:bg-aqua-400">View</NeoButton></TableCell>
//                       </TableRow>))}
//                     </TableBody>
//                   </Table></div>
//                 )}
//               </NeoCard>
//             );
//           })}
//         </div>
//       </div>
//     );
//   };

//   const renderProjectsTable = () => (
//     <div className="space-y-6">
//       <NeoCard className="p-4">
//         <div className="flex flex-col sm:flex-row gap-4 justify-between">
//           <div className="relative w-full sm:w-72">
//             <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
//             <Input type="text" placeholder="Search projects..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-10 h-12 bg-white border-2 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-aqua-400 font-mono shadow-[2px_2px_0px_#000]" />
//           </div>
//           <div className="flex gap-3">
//             <Select value={sortField} onValueChange={(v: any) => handleSortChange(v)}>
//               <SelectTrigger className="h-12 w-full sm:w-48 bg-white border-2 border-black rounded-md font-bold shadow-[2px_2px_0px_#000]"><SelectValue placeholder="Sort by" /></SelectTrigger>
//               <SelectContent className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_#000]">
//                 <SelectItem value="creation">Latest</SelectItem><SelectItem value="name">Project Number</SelectItem><SelectItem value="project_title">Project Title</SelectItem><SelectItem value="workflow_state">Status</SelectItem>
//               </SelectContent>
//             </Select>
//             <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
//               <SelectTrigger className="h-12 w-full sm:w-32 bg-white border-2 border-black rounded-md font-bold shadow-[2px_2px_0px_#000]"><SelectValue placeholder="Show" /></SelectTrigger>
//               <SelectContent className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_#000]">
//                 {[5, 10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>Show {n}</SelectItem>)}
//               </SelectContent>
//             </Select>
//           </div>
//         </div>
//       </NeoCard>

//       <NeoCard className="overflow-hidden p-0">
//         <div className="overflow-x-auto"><Table className="divide-y-2 divide-black">
//           <TableHeader><TableRow className="divide-x-2 divide-black bg-aqua-300">
//             {(["Project Number", "Project Title", "Status"] as const).map(field => {
//               let fieldKey: "name" | "project_title" | "workflow_state";
//               if (field === "Project Number") {
//                 fieldKey = "name";
//               } else if (field === "Project Title") {
//                 fieldKey = "project_title";
//               } else {
//                 fieldKey = "workflow_state";
//               }
//               return <TableHead key={field} className="p-3 font-bold text-black uppercase tracking-wider cursor-pointer hover:bg-aqua-400" onClick={() => handleSortChange(fieldKey)}>{field} {getSortIcon(fieldKey)}</TableHead>
//             })}
//             <TableHead className="p-3 font-bold text-black uppercase tracking-wider text-right">Action</TableHead>
//           </TableRow></TableHeader>
//           <TableBody className="divide-y-2 divide-black bg-white">
//             {myProjectsLoading && <TableRow><TableCell colSpan={4} className="h-32 text-center font-bold">LOADING...</TableCell></TableRow>}
//             {myProjectsError && <TableRow><TableCell colSpan={4} className="h-32 text-center font-bold text-red-600">ERROR LOADING PROJECTS</TableCell></TableRow>}
//             {!myProjectsLoading && !myProjectsError && paginatedProjects.length > 0 ? (
//               paginatedProjects.map(p => (<React.Fragment key={p.name}>
//                 <TableRow onClick={() => setOpenPipeline(openPipeline === p.name ? null : p.name)} className="divide-x-2 divide-black cursor-pointer hover:bg-aqua-100">
//                   <TableCell className="p-4 font-mono font-bold">{p.name}</TableCell>
//                   <TableCell className="p-4">{p.project_title}</TableCell>
//                   <TableCell className="p-4"><span className={getStatusBadge(p.workflow_state)}>{p.workflow_state}</span></TableCell>
//                   <TableCell className="p-4 text-right">
//                     <NeoButton onClick={e => { e.stopPropagation(); navigate(`/project-details/${p.name}`); }} className="text-sm">View Details</NeoButton>
//                   </TableCell>
//                 </TableRow>
//                 {openPipeline === p.name && <TableRow><TableCell colSpan={4} className="p-6 bg-blue-100 border-t-2 border-black">
//                   <h5 className="font-bold text-black mb-4 uppercase">Workflow Pipeline: {p.name}</h5>
//                   <WorkflowTimeline stages={[ { id: 1, title: 'Draft', status: 'completed' }, { id: 2, title: 'Submitted', status: 'in-progress' }, { id: 3, title: 'Approved', status: 'pending' } ]} />
//                 </TableCell></TableRow>}
//               </React.Fragment>))
//             ) : (!myProjectsError && !myProjectsLoading && <TableRow><TableCell colSpan={4} className="h-48 text-center">
//               <FileSearchIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//               <h3 className="text-2xl font-bold text-black">NO PROJECTS FOUND</h3>
//               <p className="text-gray-700 font-mono mt-2">Try adjusting your search or create a new project.</p>
//             </TableCell></TableRow>)}
//           </TableBody>
//         </Table></div>
//       </NeoCard>

//       {totalPages > 1 && <div className="flex items-center justify-between gap-4 py-4">
//         <div className="text-sm font-bold text-black">PAGE {currentPage} OF {totalPages}</div>
//         <div className="flex items-center gap-2">
//           <NeoButton onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeftIcon className="h-4 w-4" /></NeoButton>
//           <NeoButton onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></NeoButton>
//         </div>
//       </div>}
//     </div>
//   );

//   const totalPendingTasks = Object.values(pendingTasksData).flat().length;

//   return (
//     <div >
//       <AppSidebar isPermanentEmployee={isPermanentEmployee} />
//       <main className="flex-1 p-8">
//         <header className="mb-8">
//           <h1 className="text-4xl font-extrabold text-black tracking-tight">Project Dashboard</h1>
//           <p className="text-gray-700 mt-1 font-mono">Track, manage, and execute all your projects.</p>
//         </header>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <NeoCard className="p-6"><p className="font-bold text-black uppercase">Total Projects</p><p className="text-5xl font-extrabold text-black mt-1">{myProjects?.length ?? 0}</p></NeoCard>
//           <NeoCard className="p-6"><p className="font-bold text-black uppercase">Pending Tasks</p><p className="text-5xl font-extrabold text-black mt-1">{totalPendingTasks}</p></NeoCard>
//           <NeoCard className="p-6"><p className="font-bold text-black uppercase">Task Categories</p><p className="text-5xl font-extrabold text-black mt-1">{Object.keys(pendingTasksData).length}</p></NeoCard>
//         </div>

//         <div className="border-2 border-black rounded-md">
//           <div className="border-b-2 border-black flex">
//             {[ { id: "myProjects", label: "All Projects" }, { id: "pending", label: "Under Review" } ].map(tab => (
//               <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn( "flex-1 py-3 px-4 font-bold text-black text-center transition-all border-r-2 border-black last:border-r-0", activeTab === tab.id ? "bg-aqua-300" : "bg-white hover:bg-aqua-100" )}>
//                 {tab.label}
//               </button>
//             ))}
//           </div>
//           <div className="p-6 bg-white">
//             {activeTab === 'pending' ? renderPendingTasks() : renderProjectsTable()}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }

// export default ProjectsView;

// -=-==-=-=-=-=-=-=-=-=-v2

// import * as React from "react";
// import { useFrappeGetDocList, useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table"; // Assuming these are headless components
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useNavigate, useLocation } from "react-router-dom";
// import { AppSidebar } from "../components/RndSidebar";
// import { WorkflowTimeline } from "../components/WorkflowTimeline";
// import {
//   ChevronDownIcon,
//   ChevronRightIcon,
//   ClockIcon,
//   FolderOpenIcon,
//   FileSearchIcon,
//   AlertCircleIcon,
//   CheckCircleIcon,
//   UserIcon,
//   PlaneIcon,
//   FileTextIcon,
//   UsersIcon,
//   SendIcon,
//   CalendarIcon,
//   FileQuestionIcon,
//   ReceiptIcon,
//   SearchIcon,
//   ChevronLeftIcon,
//   ChevronRightIcon as ChevronRight
// } from "lucide-react";
// import { cn } from "@/lib/utils";

// // --- LOGIC: Interfaces & Data (Unchanged) ---
// interface Task {
//   id: string;
//   projectNumber: string;
//   projectTitle: string;
//   status?: string;
//   actionDate: string;
//   assignedTo?: string;
//   priority?: "Low" | "Medium" | "High" | "Urgent";
// }

// interface Project {
//   name: string;
//   project_title: string;
//   workflow_state: string;
//   pi_webmail: string;
//   creation?: string;
//   modified?: string;
// }

// interface ProjectsViewProps {
//   initialTab?: string;
// }

// const pendingTasksData: Record<string, Task[]> = {
//   "Temp Adv": [{ id: "TA-001", projectNumber: "PRJ-2024-001", projectTitle: "Research Equipment Purchase", status: "Pending Approval", actionDate: "2024-01-15", assignedTo: "Finance Dept", priority: "High" }],
//   "Travel": [{ id: "TR-001", projectNumber: "PRJ-2024-003", projectTitle: "International Conference - Singapore", status: "Approval Pending", actionDate: "2024-01-20", assignedTo: "Travel Desk", priority: "High" }],
//   "Leave": [{ id: "LV-001", projectNumber: "N/A", projectTitle: "Medical Leave Application", status: "Pending", actionDate: "2024-01-12", assignedTo: "HR Manager", priority: "Medium" }],
//   "Rate Contract": [{ id: "RC-001", projectNumber: "CON-2024-001", projectTitle: "Software License Renewal", status: "Under Negotiation", actionDate: "2024-01-18", assignedTo: "Procurement", priority: "High" }],
//   "Contractual Recruitment": [{ id: "CR-001", projectNumber: "HR-2024-001", projectTitle: "Research Assistant Position", status: "Interview Stage", actionDate: "2024-01-22", assignedTo: "HR Dept", priority: "Urgent" }],
//   "Fresh Proposal Submission": [{ id: "FP-001", projectNumber: "PROP-2024-001", projectTitle: "AI Research Initiative", status: "Draft Stage", actionDate: "2024-01-25", assignedTo: "R&D Committee", priority: "High" }],
//   "Extension of Tenure": [{ id: "ET-001", projectNumber: "EXT-2024-001", projectTitle: "Project Staff Extension", status: "Under Review", actionDate: "2024-01-14", assignedTo: "HR Director", priority: "Medium" }],
//   "NIQ Generation": [{ id: "NIQ-001", projectNumber: "NIQ-2024-001", projectTitle: "New Instrument Qualification", status: "Testing Phase", actionDate: "2024-01-16", assignedTo: "Quality Dept", priority: "High" }],
//   "Reimbursement (Max. Limit ₹ 1 lakh)": [{ id: "REIM-001", projectNumber: "REIM-2024-001", projectTitle: "Conference Expenses Reimbursement", status: "Document Verification", actionDate: "2024-01-11", assignedTo: "Accounts Dept", priority: "Medium" }],
// };

// const taskIcons = { "Temp Adv": UserIcon, "Travel": PlaneIcon, "Leave": CalendarIcon, "Rate Contract": FileTextIcon, "Contractual Recruitment": UsersIcon, "Fresh Proposal Submission": SendIcon, "Extension of Tenure": CalendarIcon, "NIQ Generation": FileQuestionIcon, "Reimbursement (Max. Limit ₹ 1 lakh)": ReceiptIcon };

// // --- DESIGN: Neo-Brutalism Reusable Components ---
// const NeoButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>( ({ className, children, ...props }, ref) => ( <button ref={ref} className={cn( "px-4 py-2 bg-white border-2 border-black rounded-md font-bold text-black shadow-[4px_4px_0px_#000] transition-all", "hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]", "active:shadow-none active:translate-x-[4px] active:translate-y-[4px]", "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-200 disabled:translate-x-0 disabled:translate-y-0", className )} {...props}>{children}</button> ));
// NeoButton.displayName = "NeoButton";
// const NeoCard = ({ className, children }: { className?: string; children: React.ReactNode }) => ( <div className={cn("bg-white border-2 border-black rounded-md shadow-[8px_8px_0px_#000]", className)}>{children}</div> );

// export function ProjectsView({ initialTab }: ProjectsViewProps) {
//   // --- LOGIC: All hooks and state management remain UNCHANGED ---
//   const [activeTab, setActiveTab] = React.useState(initialTab || "myProjects");
//   const [openPipeline, setOpenPipeline] = React.useState<string | null>(null);
//   const [searchQuery, setSearchQuery] = React.useState("");
//   const [sortField, setSortField] = React.useState<"creation" | "name" | "project_title" | "workflow_state">("creation");
//   const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
//   const [currentPage, setCurrentPage] = React.useState(1);
//   const [itemsPerPage, setItemsPerPage] = React.useState(10);
//   const [openTaskCategories, setOpenTaskCategories] = React.useState<Record<string, boolean>>({});
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { currentUser } = useFrappeAuth();
//   const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", { fields: ["roles"], enabled: !!currentUser });
//   const { isAdministrator, isPermanentEmployee } = React.useMemo(() => { const roles = userData?.roles?.map((r: any) => r.role) ?? []; return { isAdministrator: roles.includes("Administrator"), isPermanentEmployee: roles.includes("Permanent Employee") }; }, [userData]);
//   React.useEffect(() => { if (initialTab) setActiveTab(initialTab); if ((location.state as any)?.filter === "Application Under Process") { setActiveTab("pending"); expandAllCategories(); } }, [initialTab, location.state]);
//   const projectFilters = React.useMemo(() => { if (isAdministrator) return []; if (currentUser) return [["pi_webmail", "=", currentUser]]; return [["name", "=", "NON_EXISTENT_DOC"]]; }, [isAdministrator, currentUser]);
//   const { data: myProjects, isLoading: myProjectsLoading, error: myProjectsError } = useFrappeGetDocList<Project>("Project Registration", { fields: ["name", "project_title", "workflow_state", "pi_webmail", "creation", "modified"], filters: projectFilters as any, limit: 1000 });
//   const filteredAndSortedProjects = React.useMemo(() => { if (!myProjects) return []; let filtered = myProjects.filter(p => Object.values(p).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()))); filtered.sort((a, b) => { const aVal = (a as any)[sortField] ?? ''; const bVal = (b as any)[sortField] ?? ''; if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1; if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1; return 0; }); return filtered; }, [myProjects, searchQuery, sortField, sortOrder]);
//   const totalPages = Math.ceil(filteredAndSortedProjects.length / itemsPerPage);
//   const paginatedProjects = filteredAndSortedProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
//   const toggleTaskCategory = (category: string) => setOpenTaskCategories(p => ({ ...p, [category]: !p[category] }));
//   const expandAllCategories = () => setOpenTaskCategories(Object.keys(pendingTasksData).reduce((a, c) => ({ ...a, [c]: true }), {}));
//   const collapseAllCategories = () => setOpenTaskCategories({});
//   const handleSortChange = (field: "creation" | "name" | "project_title" | "workflow_state") => { setSortField(field); setSortOrder(sortField === field && sortOrder === "desc" ? "asc" : "desc"); setCurrentPage(1); };
//   const getSortIcon = (field: string) => (sortField === field ? (sortOrder === "asc" ? "↑" : "↓") : "");

//   // --- DESIGN: Updated Badge Color Logic ---
//   const getPriorityBadge = (priority: string) => { const styles: Record<string, string> = { "Low": "bg-green-300", "Medium": "bg-amber-300", "High": "bg-orange-400", "Urgent": "bg-red-500 text-white" }; return cn("inline-block px-2.5 py-1 rounded-md text-xs font-bold border-2 border-black", styles[priority] || "bg-slate-300"); };
//   const getStatusBadge = (status: string) => { const s = status?.toLowerCase(); let style = "bg-sky-300"; if (["pending", "under review", "approval pending", "under negotiation", "interview stage"].some(t => s?.includes(t))) style = "bg-amber-300"; else if (s?.includes("approved")) style = "bg-green-300"; else if (s?.includes("draft")) style = "bg-slate-300"; else if (s?.includes("rejected")) style = "bg-red-500 text-white"; return cn("inline-block px-2.5 py-1 rounded-md text-xs font-bold border-2 border-black", style); };

//   // --- Render Functions (with updated coloring) ---
//   const renderPendingTasks = () => {
//     const totalTasks = Object.values(pendingTasksData).flat().length;
//     // ... (no tasks view remains the same)
//     const categoryColors = ["bg-sky-200", "bg-emerald-200", "bg-rose-200", "bg-amber-200", "bg-indigo-200", "bg-pink-200", "bg-lime-200", "bg-violet-200", "bg-teal-200"];
//     return (
//       <div className="space-y-8">
//         <NeoCard className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
//           <div><h3 className="text-xl font-bold text-black uppercase">Applications Under Review ({totalTasks})</h3><p className="text-sm text-gray-700 font-mono">{Object.keys(pendingTasksData).length} categories</p></div>
//           <div className="flex gap-3"><NeoButton onClick={expandAllCategories} className="text-sm flex items-center gap-2"><ChevronDownIcon className="h-4 w-4" />Expand All</NeoButton><NeoButton onClick={collapseAllCategories} className="text-sm flex items-center gap-2"><ChevronRightIcon className="h-4 w-4" />Collapse All</NeoButton></div>
//         </NeoCard>
//         <div className="space-y-6">
//           {Object.entries(pendingTasksData).map(([category, tasks], idx) => {
//             const Icon = (taskIcons as any)[category];
//             const isOpen = openTaskCategories[category];
//             const headerColor = categoryColors[idx % categoryColors.length];
//             return (
//               <NeoCard key={category} className="overflow-hidden p-0">
//                 <div className={cn("flex items-center justify-between p-4 border-b-2 border-black cursor-pointer", headerColor)} onClick={() => toggleTaskCategory(category)}>
//                   <div className="flex items-center gap-3"><Icon className="h-6 w-6 text-black" /><h3 className="text-lg font-bold text-black">{category}</h3><span className="bg-white text-black text-xs font-bold px-2 py-1 rounded-md border-2 border-black">{tasks.length}</span></div><ChevronDownIcon className={cn("h-6 w-6 text-black transition-transform", !isOpen && "-rotate-90")} />
//                 </div>
//                 {isOpen && (<div className="overflow-x-auto"><Table className="divide-y-2 divide-black"><TableHeader><TableRow className="divide-x-2 divide-black bg-slate-200">{["Task", "Title", "Status", "Priority", "Assigned", "Date", "Action"].map(h => <TableHead key={h} className="p-3 font-bold text-black uppercase">{h}</TableHead>)}</TableRow></TableHeader><TableBody className="divide-y-2 divide-black bg-white">{tasks.map(task => (<TableRow key={task.id} className="divide-x-2 divide-black hover:bg-slate-100"><TableCell className="p-3 font-mono">{task.id}</TableCell><TableCell className="p-3 font-medium">{task.projectTitle}<br/><span className="font-mono text-gray-600 text-sm">{task.projectNumber}</span></TableCell><TableCell className="p-3"><span className={getStatusBadge(task.status!)}>{task.status}</span></TableCell><TableCell className="p-3"><span className={getPriorityBadge(task.priority!)}>{task.priority}</span></TableCell><TableCell className="p-3 font-mono">{task.assignedTo}</TableCell><TableCell className="p-3 font-mono">{new Date(task.actionDate).toLocaleDateString()}</TableCell><TableCell className="p-3 text-right"><NeoButton className="text-sm bg-cyan-300 hover:bg-cyan-400">View</NeoButton></TableCell></TableRow>))}</TableBody></Table></div>)}
//               </NeoCard>
//             );
//           })}
//         </div>
//       </div>
//     );
//   };
//   const renderProjectsTable = () => (
//     <div className="space-y-8">
//       <NeoCard className="p-4"><div className="flex flex-col sm:flex-row gap-4 justify-between">
//         <div className="relative w-full sm:w-72"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" /><Input type="text" placeholder="Search projects..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-10 h-12 bg-white border-2 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono shadow-[2px_2px_0px_#000]" /></div>
//         <div className="flex gap-3"><Select value={sortField} onValueChange={(v: any) => handleSortChange(v)}><SelectTrigger className="h-12 w-full sm:w-48 bg-white border-2 border-black rounded-md font-bold shadow-[2px_2px_0px_#000]"><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_#000]"><SelectItem value="creation">Latest</SelectItem><SelectItem value="name">Project Number</SelectItem><SelectItem value="project_title">Project Title</SelectItem><SelectItem value="workflow_state">Status</SelectItem></SelectContent></Select><Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }}><SelectTrigger className="h-12 w-full sm:w-32 bg-white border-2 border-black rounded-md font-bold shadow-[2px_2px_0px_#000]"><SelectValue placeholder="Show" /></SelectTrigger><SelectContent className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_#000]">{[5, 10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>Show {n}</SelectItem>)}</SelectContent></Select></div>
//       </div></NeoCard>
//       <NeoCard className="overflow-hidden p-0"><div className="overflow-x-auto"><Table className="divide-y-2 divide-black"><TableHeader><TableRow className="divide-x-2 divide-black bg-cyan-300">{ (["Project Number", "Project Title", "Status"] as const).map(field => { const fieldKey = field === "Project Number" ? "name" : field === "Project Title" ? "project_title" : "workflow_state"; return <TableHead key={field} className="p-3 font-bold text-black uppercase tracking-wider cursor-pointer hover:bg-cyan-400" onClick={() => handleSortChange(fieldKey)}>{field} {getSortIcon(fieldKey)}</TableHead> })}<TableHead className="p-3 font-bold text-black uppercase tracking-wider text-right">Action</TableHead></TableRow></TableHeader><TableBody className="divide-y-2 divide-black bg-white">{myProjectsLoading && <TableRow><TableCell colSpan={4} className="h-32 text-center font-bold">LOADING...</TableCell></TableRow>}{myProjectsError && <TableRow><TableCell colSpan={4} className="h-32 text-center font-bold text-red-600">ERROR LOADING PROJECTS</TableCell></TableRow>}{!myProjectsLoading && !myProjectsError && paginatedProjects.length > 0 ? (paginatedProjects.map(p => (<React.Fragment key={p.name}><TableRow onClick={() => setOpenPipeline(openPipeline === p.name ? null : p.name)} className="divide-x-2 divide-black cursor-pointer hover:bg-cyan-100"><TableCell className="p-4 font-mono font-bold">{p.name}</TableCell><TableCell className="p-4">{p.project_title}</TableCell><TableCell className="p-4"><span className={getStatusBadge(p.workflow_state)}>{p.workflow_state}</span></TableCell><TableCell className="p-4 text-right"><NeoButton onClick={e => { e.stopPropagation(); navigate(`/project-details/${p.name}`); }} className="text-sm">View Details</NeoButton></TableCell></TableRow>{openPipeline === p.name && <TableRow><TableCell colSpan={4} className="p-6 bg-sky-100 border-t-2 border-black"><h5 className="font-bold text-black mb-4 uppercase">Workflow Pipeline: {p.name}</h5><WorkflowTimeline stages={[ { id: 1, title: 'Draft', status: 'completed' }, { id: 2, title: 'Submitted', status: 'in-progress' }, { id: 3, title: 'Approved', status: 'pending' } ]} /></TableCell></TableRow>}</React.Fragment>))) : (!myProjectsError && !myProjectsLoading && <TableRow><TableCell colSpan={4} className="h-48 text-center"><FileSearchIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" /><h3 className="text-2xl font-bold text-black">NO PROJECTS FOUND</h3><p className="text-gray-700 font-mono mt-2">Try adjusting your search.</p></TableCell></TableRow>)}</TableBody></Table></div></NeoCard>
//       {totalPages > 1 && <div className="flex items-center justify-between gap-4 py-4"><div className="text-sm font-bold text-black">PAGE {currentPage} OF {totalPages}</div><div className="flex items-center gap-2"><NeoButton onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeftIcon className="h-4 w-4" /></NeoButton><NeoButton onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></NeoButton></div></div>}
//     </div>
//   );
//   const totalPendingTasks = Object.values(pendingTasksData).flat().length;

//   return (
//     <div className="bg-[#FDFCEC]">
//       <AppSidebar isPermanentEmployee={isPermanentEmployee} />
//       <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//         <header className="mb-8">
//           <h1 className="text-4xl md:text-5xl font-extrabold text-black tracking-tight uppercase">Project Dashboard</h1>
//           <p className="text-gray-700 mt-2 font-mono">Track, manage, and execute all your projects.</p>
//         </header>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
//           <NeoCard className="p-6 bg-amber-200 transition-transform hover:-translate-y-1"><p className="font-bold text-black uppercase">Total Projects</p><p className="text-5xl font-extrabold text-black mt-1">{myProjects?.length ?? 0}</p></NeoCard>
//           <NeoCard className="p-6 bg-cyan-200 transition-transform hover:-translate-y-1"><p className="font-bold text-black uppercase">Pending Tasks</p><p className="text-5xl font-extrabold text-black mt-1">{totalPendingTasks}</p></NeoCard>
//           <NeoCard className="p-6 bg-emerald-200 transition-transform hover:-translate-y-1"><p className="font-bold text-black uppercase">Task Categories</p><p className="text-5xl font-extrabold text-black mt-1">{Object.keys(pendingTasksData).length}</p></NeoCard>
//         </div>
//         <div className="border-2 border-black rounded-md">
//           <div className="border-b-2 border-black flex">
//             {[ { id: "myProjects", label: "All Projects" }, { id: "pending", label: "Under Review" } ].map(tab => ( <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn( "flex-1 py-4 px-4 font-bold text-black text-center transition-all border-r-2 border-black last:border-r-0", activeTab === tab.id ? "bg-cyan-300" : "bg-white hover:bg-cyan-100" )}>{tab.label}</button> ))}
//           </div>
//           <div className="p-6 bg-white">
//             {activeTab === 'pending' ? renderPendingTasks() : renderProjectsTable()}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }

// export default ProjectsView;

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

// import * as React from "react";
// import { useFrappeGetDocList, useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table"; // Assuming these are headless components
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useNavigate, useLocation } from "react-router-dom";
// import { AppSidebar } from "../components/RndSidebar";
// import { WorkflowTimeline } from "../components/WorkflowTimeline";
// import {
//   ChevronDownIcon,
//   ChevronRightIcon,
//   ClockIcon,
//   FolderOpenIcon,
//   FileSearchIcon,
//   AlertCircleIcon,
//   CheckCircleIcon,
//   UserIcon,
//   PlaneIcon,
//   FileTextIcon,
//   UsersIcon,
//   SendIcon,
//   CalendarIcon,
//   FileQuestionIcon,
//   ReceiptIcon,
//   SearchIcon,
//   ChevronLeftIcon,
//   ChevronRightIcon as ChevronRight
// } from "lucide-react";
// import { cn } from "@/lib/utils";

// // --- LOGIC: Interfaces & Data (Unchanged) ---
// interface Task {
//   id: string;
//   projectNumber: string;
//   projectTitle: string;
//   status?: string;
//   actionDate: string;
//   assignedTo?: string;
//   priority?: "Low" | "Medium" | "High" | "Urgent";
// }

// interface Project {
//   name: string;
//   project_title: string;
//   workflow_state: string;
//   pi_webmail: string;
//   creation?: string;
//   modified?: string;
// }

// interface ProjectsViewProps {
//   initialTab?: string;
// }

// const pendingTasksData: Record<string, Task[]> = {
//   "Temp Adv": [{ id: "TA-001", projectNumber: "PRJ-2024-001", projectTitle: "Research Equipment Purchase", status: "Pending Approval", actionDate: "2024-01-15", assignedTo: "Finance Dept", priority: "High" }],
//   "Travel": [{ id: "TR-001", projectNumber: "PRJ-2024-003", projectTitle: "International Conference - Singapore", status: "Approval Pending", actionDate: "2024-01-20", assignedTo: "Travel Desk", priority: "High" }],
//   "Leave": [{ id: "LV-001", projectNumber: "N/A", projectTitle: "Medical Leave Application", status: "Pending", actionDate: "2024-01-12", assignedTo: "HR Manager", priority: "Medium" }],
//   "Rate Contract": [{ id: "RC-001", projectNumber: "CON-2024-001", projectTitle: "Software License Renewal", status: "Under Negotiation", actionDate: "2024-01-18", assignedTo: "Procurement", priority: "High" }],
//   "Contractual Recruitment": [{ id: "CR-001", projectNumber: "HR-2024-001", projectTitle: "Research Assistant Position", status: "Interview Stage", actionDate: "2024-01-22", assignedTo: "HR Dept", priority: "Urgent" }],
//   "Fresh Proposal Submission": [{ id: "FP-001", projectNumber: "PROP-2024-001", projectTitle: "AI Research Initiative", status: "Draft Stage", actionDate: "2024-01-25", assignedTo: "R&D Committee", priority: "High" }],
//   "Extension of Tenure": [{ id: "ET-001", projectNumber: "EXT-2024-001", projectTitle: "Project Staff Extension", status: "Under Review", actionDate: "2024-01-14", assignedTo: "HR Director", priority: "Medium" }],
//   "NIQ Generation": [{ id: "NIQ-001", projectNumber: "NIQ-2024-001", projectTitle: "New Instrument Qualification", status: "Testing Phase", actionDate: "2024-01-16", assignedTo: "Quality Dept", priority: "High" }],
//   "Reimbursement (Max. Limit ₹ 1 lakh)": [{ id: "REIM-001", projectNumber: "REIM-2024-001", projectTitle: "Conference Expenses Reimbursement", status: "Document Verification", actionDate: "2024-01-11", assignedTo: "Accounts Dept", priority: "Medium" }],
// };

// const taskIcons = { "Temp Adv": UserIcon, "Travel": PlaneIcon, "Leave": CalendarIcon, "Rate Contract": FileTextIcon, "Contractual Recruitment": UsersIcon, "Fresh Proposal Submission": SendIcon, "Extension of Tenure": CalendarIcon, "NIQ Generation": FileQuestionIcon, "Reimbursement (Max. Limit ₹ 1 lakh)": ReceiptIcon };

// // --- DESIGN: Neo-Brutalism Reusable Components with Lighter Shadows ---
// const NeoButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>( ({ className, children, ...props }, ref) => (
//     <button
//         ref={ref}
//         className={cn(
//             "px-4 py-2 bg-white border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all",
//             "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
//             "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
//             "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-200 disabled:translate-x-0 disabled:translate-y-0",
//             className
//         )}
//         {...props}
//     >
//         {children}
//     </button>
// ));
// NeoButton.displayName = "NeoButton";

// const NeoCard = ({ className, children }: { className?: string; children: React.ReactNode }) => (
//     <div className={cn("bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>
//         {children}
//     </div>
// );

// export function ProjectsView({ initialTab }: ProjectsViewProps) {
//   // --- LOGIC: All hooks and state management remain UNCHANGED ---
//   const [activeTab, setActiveTab] = React.useState(initialTab || "myProjects");
//   const [openPipeline, setOpenPipeline] = React.useState<string | null>(null);
//   const [searchQuery, setSearchQuery] = React.useState("");
//   const [sortField, setSortField] = React.useState<"creation" | "name" | "project_title" | "workflow_state">("creation");
//   const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
//   const [currentPage, setCurrentPage] = React.useState(1);
//   const [itemsPerPage, setItemsPerPage] = React.useState(10);
//   const [openTaskCategories, setOpenTaskCategories] = React.useState<Record<string, boolean>>({});
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { currentUser } = useFrappeAuth();
//   const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", { fields: ["roles"], enabled: !!currentUser });
//   const { isAdministrator, isPermanentEmployee } = React.useMemo(() => { const roles = userData?.roles?.map((r: any) => r.role) ?? []; return { isAdministrator: roles.includes("Administrator"), isPermanentEmployee: roles.includes("Permanent Employee") }; }, [userData]);
//   React.useEffect(() => { if (initialTab) setActiveTab(initialTab); if ((location.state as any)?.filter === "Application Under Process") { setActiveTab("pending"); expandAllCategories(); } }, [initialTab, location.state]);
//   const projectFilters = React.useMemo(() => { if (isAdministrator) return []; if (currentUser) return [["pi_webmail", "=", currentUser]]; return [["name", "=", "NON_EXISTENT_DOC"]]; }, [isAdministrator, currentUser]);
//   const { data: myProjects, isLoading: myProjectsLoading, error: myProjectsError } = useFrappeGetDocList<Project>("Project Registration", { fields: ["name", "project_title", "workflow_state", "pi_webmail", "creation", "modified"], filters: projectFilters as any, limit: 1000 });
//   const filteredAndSortedProjects = React.useMemo(() => { if (!myProjects) return []; let filtered = myProjects.filter(p => Object.values(p).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()))); filtered.sort((a, b) => { const aVal = (a as any)[sortField] ?? ''; const bVal = (b as any)[sortField] ?? ''; if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1; if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1; return 0; }); return filtered; }, [myProjects, searchQuery, sortField, sortOrder]);
//   const totalPages = Math.ceil(filteredAndSortedProjects.length / itemsPerPage);
//   const paginatedProjects = filteredAndSortedProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
//   const toggleTaskCategory = (category: string) => setOpenTaskCategories(p => ({ ...p, [category]: !p[category] }));
//   const expandAllCategories = () => setOpenTaskCategories(Object.keys(pendingTasksData).reduce((a, c) => ({ ...a, [c]: true }), {}));
//   const collapseAllCategories = () => setOpenTaskCategories({});
//   const handleSortChange = (field: "creation" | "name" | "project_title" | "workflow_state") => { setSortField(field); setSortOrder(sortField === field && sortOrder === "desc" ? "asc" : "desc"); setCurrentPage(1); };
//   const getSortIcon = (field: string) => (sortField === field ? (sortOrder === "asc" ? "↑" : "↓") : "");

//   // --- DESIGN: Badge Color Logic (Unchanged) ---
//   const getPriorityBadge = (priority: string) => { const styles: Record<string, string> = { "Low": "bg-green-300", "Medium": "bg-amber-300", "High": "bg-orange-400", "Urgent": "bg-red-500 text-white" }; return cn("inline-block px-2.5 py-1 rounded-md text-xs font-bold border-2 border-black", styles[priority] || "bg-slate-300"); };
//   const getStatusBadge = (status: string) => { const s = status?.toLowerCase(); let style = "bg-sky-300"; if (["pending", "under review", "approval pending", "under negotiation", "interview stage"].some(t => s?.includes(t))) style = "bg-amber-300"; else if (s?.includes("approved")) style = "bg-green-300"; else if (s?.includes("draft")) style = "bg-slate-300"; else if (s?.includes("rejected")) style = "bg-red-500 text-white"; return cn("inline-block px-2.5 py-1 rounded-md text-xs font-bold border-2 border-black", style); };

//   // --- Render Functions (with updated coloring) ---
//   const renderPendingTasks = () => {
//     const totalTasks = Object.values(pendingTasksData).flat().length;
//     const categoryColors = ["bg-sky-200", "bg-emerald-200", "bg-rose-200", "bg-amber-200", "bg-indigo-200", "bg-pink-200", "bg-lime-200", "bg-violet-200", "bg-teal-200"];
//     if (totalTasks === 0) {
//         return ( <NeoCard className="text-center py-12"><CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" /><h3 className="text-2xl font-bold text-black">NO PENDING TASKS</h3><p className="text-gray-700 font-mono mt-2">All clear. Great job!</p></NeoCard> );
//     }
//     return (
//       <div className="space-y-8">
//         <NeoCard className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
//           <div><h3 className="text-xl font-bold text-black uppercase">Applications Under Review ({totalTasks})</h3><p className="text-sm text-gray-700 font-mono">{Object.keys(pendingTasksData).length} categories</p></div>
//           <div className="flex gap-3"><NeoButton onClick={expandAllCategories} className="text-sm flex items-center gap-2"><ChevronDownIcon className="h-4 w-4" />Expand All</NeoButton><NeoButton onClick={collapseAllCategories} className="text-sm flex items-center gap-2"><ChevronRightIcon className="h-4 w-4" />Collapse All</NeoButton></div>
//         </NeoCard>
//         <div className="space-y-6">
//           {Object.entries(pendingTasksData).map(([category, tasks], idx) => {
//             const Icon = (taskIcons as any)[category];
//             const isOpen = openTaskCategories[category];
//             const headerColor = categoryColors[idx % categoryColors.length];
//             return (
//               <NeoCard key={category} className="overflow-hidden p-0">
//                 <div className={cn("flex items-center justify-between p-4 border-b-2 border-black cursor-pointer", headerColor)} onClick={() => toggleTaskCategory(category)}>
//                   <div className="flex items-center gap-3"><Icon className="h-6 w-6 text-black" /><h3 className="text-lg font-bold text-black">{category}</h3><span className="bg-white text-black text-xs font-bold px-2 py-1 rounded-md border-2 border-black">{tasks.length}</span></div><ChevronDownIcon className={cn("h-6 w-6 text-black transition-transform", !isOpen && "-rotate-90")} />
//                 </div>
//                 {isOpen && (<div className="overflow-x-auto"><Table className="divide-y-2 divide-black"><TableHeader><TableRow className="divide-x-2 divide-black bg-slate-200">{["Task", "Title", "Status", "Priority", "Assigned", "Date", "Action"].map(h => <TableHead key={h} className="p-3 font-bold text-black uppercase">{h}</TableHead>)}</TableRow></TableHeader><TableBody className="divide-y-2 divide-black bg-white">{tasks.map(task => (<TableRow key={task.id} className="divide-x-2 divide-black hover:bg-slate-100"><TableCell className="p-3 font-mono">{task.id}</TableCell><TableCell className="p-3 font-medium">{task.projectTitle}<br/><span className="font-mono text-gray-600 text-sm">{task.projectNumber}</span></TableCell><TableCell className="p-3"><span className={getStatusBadge(task.status!)}>{task.status}</span></TableCell><TableCell className="p-3"><span className={getPriorityBadge(task.priority!)}>{task.priority}</span></TableCell><TableCell className="p-3 font-mono">{task.assignedTo}</TableCell><TableCell className="p-3 font-mono">{new Date(task.actionDate).toLocaleDateString()}</TableCell><TableCell className="p-3 text-right"><NeoButton className="text-sm bg-cyan-300 hover:bg-cyan-400">View</NeoButton></TableCell></TableRow>))}</TableBody></Table></div>)}
//               </NeoCard>
//             );
//           })}
//         </div>
//       </div>
//     );
//   };
//   const renderProjectsTable = () => (
//     <div className="space-y-8">
//       <NeoCard className="p-4"><div className="flex flex-col sm:flex-row gap-4 justify-between">
//         <div className="relative w-full sm:w-72"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" /><Input type="text" placeholder="Search projects..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-10 h-12 bg-white border-2 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)]" /></div>
//         <div className="flex gap-3"><Select value={sortField} onValueChange={(v: any) => handleSortChange(v)}><SelectTrigger className="h-12 w-full sm:w-48 bg-white border-2 border-black rounded-md font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent className="bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><SelectItem value="creation">Latest</SelectItem><SelectItem value="name">Project Number</SelectItem><SelectItem value="project_title">Project Title</SelectItem><SelectItem value="workflow_state">Status</SelectItem></SelectContent></Select><Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }}><SelectTrigger className="h-12 w-full sm:w-32 bg-white border-2 border-black rounded-md font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"><SelectValue placeholder="Show" /></SelectTrigger><SelectContent className="bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">{[5, 10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>Show {n}</SelectItem>)}</SelectContent></Select></div>
//       </div></NeoCard>
//       <NeoCard className="overflow-hidden p-0"><div className="overflow-x-auto"><Table className="divide-y-2 divide-black"><TableHeader><TableRow className="divide-x-2 divide-black bg-[#80CBC4]">{ (["Project Number", "Project Title", "Status"] as const).map(field => { const fieldKey = field === "Project Number" ? "name" : field === "Project Title" ? "project_title" : "workflow_state"; return <TableHead key={field} className="p-3 font-bold text-black uppercase tracking-wider cursor-pointer hover:bg-[#80CBC4]" onClick={() => handleSortChange(fieldKey)}>{field} {getSortIcon(fieldKey)}</TableHead> })}<TableHead className="p-3 font-bold text-black uppercase tracking-wider text-right">Action</TableHead></TableRow></TableHeader><TableBody className="divide-y-2 divide-black bg-white">{myProjectsLoading && <TableRow><TableCell colSpan={4} className="h-32 text-center font-bold">LOADING...</TableCell></TableRow>}{myProjectsError && <TableRow><TableCell colSpan={4} className="h-32 text-center font-bold text-red-600">ERROR LOADING PROJECTS</TableCell></TableRow>}{!myProjectsLoading && !myProjectsError && paginatedProjects.length > 0 ? (paginatedProjects.map(p => (<React.Fragment key={p.name}><TableRow onClick={() => setOpenPipeline(openPipeline === p.name ? null : p.name)} className="divide-x-2 divide-black cursor-pointer hover:bg-cyan-100"><TableCell className="p-4 font-mono font-bold">{p.name}</TableCell><TableCell className="p-4">{p.project_title}</TableCell><TableCell className="p-4"><span className={getStatusBadge(p.workflow_state)}>{p.workflow_state}</span></TableCell><TableCell className="p-4 text-right"><NeoButton onClick={e => { e.stopPropagation(); navigate(`/project-details/${p.name}`); }} className="text-sm">View Details</NeoButton></TableCell></TableRow>{openPipeline === p.name && <TableRow><TableCell colSpan={4} className="p-6 bg-sky-100 border-t-2 border-black"><h5 className="font-bold text-black mb-4 uppercase">Workflow Pipeline: {p.name}</h5><WorkflowTimeline stages={[ { id: 1, title: 'Draft', status: 'completed' }, { id: 2, title: 'Submitted', status: 'in-progress' }, { id: 3, title: 'Approved', status: 'pending' } ]} /></TableCell></TableRow>}</React.Fragment>))) : (!myProjectsError && !myProjectsLoading && <TableRow><TableCell colSpan={4} className="h-48 text-center"><FileSearchIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" /><h3 className="text-2xl font-bold text-black">NO PROJECTS FOUND</h3><p className="text-gray-700 font-mono mt-2">Try adjusting your search.</p></TableCell></TableRow>)}</TableBody></Table></div></NeoCard>
//       {totalPages > 1 && <div className="flex items-center justify-between gap-4 py-4"><div className="text-sm font-bold text-black">PAGE {currentPage} OF {totalPages}</div><div className="flex items-center gap-2"><NeoButton onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeftIcon className="h-4 w-4" /></NeoButton><NeoButton onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></NeoButton></div></div>}
//     </div>
//   );
//   // const totalPendingTasks = Object.values(pendingTasksData).flat().length;

//   return (
//     <div className="bg-[#FDFCEC]">
//       <AppSidebar isPermanentEmployee={isPermanentEmployee} />
//       <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//         <header className="mb-3">
//           <h1 className="text-4xl md:text-5xl font-extrabold text-black tracking-tight uppercase">Project Dashboard</h1>
//           <p className="text-gray-700 mt-2 font-mono">Track, manage, and execute all your projects.</p>
//         </header>
//         {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
//           <NeoCard className="p-6 bg-amber-200 transition-transform hover:-translate-y-1"><p className="font-bold text-black uppercase">Total Projects</p><p className="text-5xl font-extrabold text-black mt-1">{myProjects?.length ?? 0}</p></NeoCard>
//           <NeoCard className="p-6 bg-cyan-200 transition-transform hover:-translate-y-1"><p className="font-bold text-black uppercase">Pending Tasks</p><p className="text-5xl font-extrabold text-black mt-1">{totalPendingTasks}</p></NeoCard>
//           <NeoCard className="p-6 bg-emerald-200 transition-transform hover:-translate-y-1"><p className="font-bold text-black uppercase">Task Categories</p><p className="text-5xl font-extrabold text-black mt-1">{Object.keys(pendingTasksData).length}</p></NeoCard>
//         </div> */}
//         <div className="border-2 border-black rounded-md">
//           <div className="border-b-2 border-black flex">
//             {[ { id: "myProjects", label: "All Projects" }, { id: "pending", label: "Under Review" } ].map(tab => ( <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn( "flex-1 py-4 px-4 font-bold text-black text-center transition-all border-r-2 border-black last:border-r-0", activeTab === tab.id ? "bg-cyan-300" : "bg-white hover:bg-cyan-100" )}>{tab.label}</button>))}
//           </div>
//           <div className="p-6 bg-[#F5F5F4]">
//             {activeTab === 'pending' ? renderPendingTasks() : renderProjectsTable()}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }

// export default ProjectsView;

// -=-=-=-=-=-=-=-=-= Under view table

import * as React from "react";
import {
  useFrappeGetDocList,
  useFrappeAuth,
  useFrappeGetDoc,
} from "frappe-react-sdk";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Assuming these are headless components
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, useLocation } from "react-router-dom";
import { AppSidebar } from "../components/RndSidebar";
import { WorkflowTimeline } from "../components/WorkflowTimeline";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  FolderOpenIcon,
  FileSearchIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  UserIcon,
  PlaneIcon,
  FileTextIcon,
  UsersIcon,
  SendIcon,
  CalendarIcon,
  FileQuestionIcon,
  ReceiptIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon as ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- LOGIC: Interfaces & Data (Unchanged) ---
interface Task {
  id: string;
  projectNumber: string;
  projectTitle: string;
  status?: string;
  actionDate: string;
  assignedTo?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
}

interface Project {
  name: string;
  project_title: string;
  workflow_state: string;
  pi_webmail: string;
  creation?: string;
  modified?: string;
}

interface ProjectsViewProps {
  initialTab?: string;
}

const pendingTasksData: Record<string, Task[]> = {
  "Temp Adv": [
    {
      id: "TA-001",
      projectNumber: "PRJ-2024-001",
      projectTitle: "Research Equipment Purchase",
      status: "Pending Approval",
      actionDate: "2024-01-15",
      assignedTo: "Finance Dept",
      priority: "High",
    },
  ],
  Travel: [
    {
      id: "TR-001",
      projectNumber: "PRJ-2024-003",
      projectTitle: "International Conference - Singapore",
      status: "Approval Pending",
      actionDate: "2024-01-20",
      assignedTo: "Travel Desk",
      priority: "High",
    },
  ],
  Leave: [
    {
      id: "LV-001",
      projectNumber: "N/A",
      projectTitle: "Medical Leave Application",
      status: "Pending",
      actionDate: "2024-01-12",
      assignedTo: "HR Manager",
      priority: "Medium",
    },
  ],
  "Rate Contract": [
    {
      id: "RC-001",
      projectNumber: "CON-2024-001",
      projectTitle: "Software License Renewal",
      status: "Under Negotiation",
      actionDate: "2024-01-18",
      assignedTo: "Procurement",
      priority: "High",
    },
  ],
};

const taskIcons = {
  "Temp Adv": UserIcon,
  Travel: PlaneIcon,
  Leave: CalendarIcon,
  "Rate Contract": FileTextIcon,
  "Contractual Recruitment": UsersIcon,
  "Fresh Proposal Submission": SendIcon,
  "Extension of Tenure": CalendarIcon,
  "NIQ Generation": FileQuestionIcon,
  "Reimbursement (Max. Limit ₹ 1 lakh)": ReceiptIcon,
};

// --- DESIGN: Neo-Brutalism Reusable Components with Lighter Shadows ---
const NeoButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "px-4 py-2 bg-white border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all",
      "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
      "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-200 disabled:translate-x-0 disabled:translate-y-0",
      className
    )}
    {...props}
  >
    {children}
  </button>
));
NeoButton.displayName = "NeoButton";

const NeoCard = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]",
      className
    )}
  >
    {children}
  </div>
);

export function ProjectsView({ initialTab }: ProjectsViewProps) {
  // --- LOGIC: All hooks and state management remain UNCHANGED ---
  const [activeTab, setActiveTab] = React.useState(initialTab || "myProjects");
  const [openPipeline, setOpenPipeline] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortField, setSortField] = React.useState<
    "creation" | "name" | "project_title" | "workflow_state"
  >("creation");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  // State for the new sub-tabs in "Under Review" section
  const [activeTaskTab, setActiveTaskTab] = React.useState(
    Object.keys(pendingTasksData)[0]
  );

  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["roles"],
    enabled: !!currentUser,
  });
  const { isAdministrator, isPermanentEmployee } = React.useMemo(() => {
    const roles = userData?.roles?.map((r: any) => r.role) ?? [];
    return {
      isAdministrator: roles.includes("Administrator"),
      isPermanentEmployee: roles.includes("Permanent Employee"),
    };
  }, [userData]);

  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if ((location.state as any)?.filter === "Application Under Process") {
      setActiveTab("pending");
    }
  }, [initialTab, location.state]);

  const projectFilters = React.useMemo(() => {
    if (isAdministrator) return [];
    if (currentUser) return [["pi_webmail", "=", currentUser]];
    return [["name", "=", "NON_EXISTENT_DOC"]];
  }, [isAdministrator, currentUser]);
  const {
    data: myProjects,
    isLoading: myProjectsLoading,
    error: myProjectsError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: [
      "name",
      "project_title",
      "workflow_state",
      "pi_webmail",
      "creation",
      "modified",
    ],
    filters: projectFilters as any,
    limit: 1000,
  });
  const filteredAndSortedProjects = React.useMemo(() => {
    if (!myProjects) return [];
    let filtered = myProjects.filter((p) =>
      Object.values(p).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortField] ?? "";
      const bVal = (b as any)[sortField] ?? "";
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [myProjects, searchQuery, sortField, sortOrder]);
  const totalPages = Math.ceil(filteredAndSortedProjects.length / itemsPerPage);
  const paginatedProjects = filteredAndSortedProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const handleSortChange = (
    field: "creation" | "name" | "project_title" | "workflow_state"
  ) => {
    setSortField(field);
    setSortOrder(sortField === field && sortOrder === "desc" ? "asc" : "desc");
    setCurrentPage(1);
  };
  const getSortIcon = (field: string) =>
    sortField === field ? (sortOrder === "asc" ? "↑" : "↓") : "";

  // --- DESIGN: Badge Color Logic (Unchanged) ---
  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      Low: "bg-green-300",
      Medium: "bg-amber-300",
      High: "bg-orange-400",
      Urgent: "bg-red-500 text-white",
    };
    return cn(
      "inline-block px-2.5 py-1 rounded-md text-xs font-bold border-2 border-black",
      styles[priority] || "bg-slate-300"
    );
  };
  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    let style = "bg-sky-300";
    if (
      [
        "pending",
        "under review",
        "approval pending",
        "under negotiation",
        "interview stage",
      ].some((t) => s?.includes(t))
    )
      style = "bg-amber-300";
    else if (s?.includes("approved")) style = "bg-green-300";
    else if (s?.includes("draft")) style = "bg-slate-300";
    else if (s?.includes("rejected")) style = "bg-red-500 text-white";
    return cn(
      "inline-block px-2.5 py-1 rounded-md text-xs font-bold border-2 border-black",
      style
    );
  };

  // --- Render Functions (with structural change) ---

  const renderPendingTasks = () => {
    const totalTasks = Object.values(pendingTasksData).flat().length;
    const taskCategories = Object.keys(pendingTasksData);
    const activeTasks = pendingTasksData[activeTaskTab] || [];

    if (totalTasks === 0) {
      return (
        <NeoCard className="text-center py-12">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-black">NO PENDING TASKS</h3>
          <p className="text-gray-700 font-mono mt-2">All clear. Great job!</p>
        </NeoCard>
      );
    }

    return (
      <div className="space-y-8">
        <NeoCard className="p-4">
          <h3 className="text-xl font-bold text-black uppercase">
            Applications Under Review ({totalTasks})
          </h3>
          <p className="text-sm text-gray-700 font-mono">
            {taskCategories.length} categories
          </p>
        </NeoCard>

        {/* New Tabbed Interface */}
        <div className="border-2 border-black rounded-md">
          <div className="border-b-2 border-black flex flex-wrap">
            {taskCategories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveTaskTab(category)}
                className={cn(
                  "flex-grow p-3 font-bold text-black text-center transition-all border-b-2 sm:border-b-0 sm:border-r-2 border-black last:border-r-0 text-sm",
                  activeTaskTab === category
                    ? "bg-[#90A4AE]"
                    : "bg-white hover:bg-[#90A4AE]"
                )}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="p-4 bg-[#FDFCEC]">
            <div className="overflow-x-auto">
              <Table className="divide-y-2 divide-black">
                <TableHeader>
                  <TableRow className="divide-x-2 divide-black bg-slate-200">
                    {[
                      "Task ID",
                      "Project Title",
                      "Status",
                      "Priority",
                      "Assigned To",
                      "Date",
                      "Action",
                    ].map((h) => (
                      <TableHead
                        key={h}
                        className="p-3 font-bold text-black uppercase"
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y-2 divide-black bg-white">
                  {activeTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className="divide-x-2 divide-black hover:bg-slate-100"
                    >
                      <TableCell className="p-3 font-mono">{task.id}</TableCell>
                      <TableCell className="p-3 font-medium">
                        {task.projectTitle}
                        <br />
                        <span className="font-mono text-gray-600 text-sm">
                          {task.projectNumber}
                        </span>
                      </TableCell>
                      <TableCell className="p-3">
                        <span className={getStatusBadge(task.status!)}>
                          {task.status}
                        </span>
                      </TableCell>
                      <TableCell className="p-3">
                        <span className={getPriorityBadge(task.priority!)}>
                          {task.priority}
                        </span>
                      </TableCell>
                      <TableCell className="p-3 font-mono">
                        {task.assignedTo}
                      </TableCell>
                      <TableCell className="p-3 font-mono">
                        {new Date(task.actionDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="p-3 text-right">
                        <NeoButton className="text-sm bg-[#A5D6A7] hover:bg-[#A5D6A7]">
                          View
                        </NeoButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectsTable = () => (
    <div className="space-y-8 bg-[#FDFCEC]">
      <NeoCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 h-12 bg-white border-2 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
            />
          </div>
          <div className="flex gap-3">
            <Select
              value={sortField}
              onValueChange={(v: any) => handleSortChange(v)}
            >
              <SelectTrigger className="h-12 w-full sm:w-48 bg-white border-2 border-black rounded-md font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                <SelectItem value="creation">Latest</SelectItem>
                <SelectItem value="name">Project Number</SelectItem>
                <SelectItem value="project_title">Project Title</SelectItem>
                <SelectItem value="workflow_state">Status</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(v) => {
                setItemsPerPage(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-12 w-full sm:w-32 bg-white border-2 border-black rounded-md font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                <SelectValue placeholder="Show" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                {[5, 10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Show {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </NeoCard>
      <NeoCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table className="divide-y-2 divide-black">
            <TableHeader>
              <TableRow className="divide-x-2 divide-black bg-[#90A4AE]">
                {(["Project Number", "Project Title", "Status"] as const).map(
                  (field) => {
                    const fieldKey =
                      field === "Project Number"
                        ? "name"
                        : field === "Project Title"
                        ? "project_title"
                        : "workflow_state";
                    return (
                      <TableHead
                        key={field}
                        className="p-3 font-bold text-black uppercase tracking-wider cursor-pointer hover:bg-[#90A4AE]"
                        onClick={() => handleSortChange(fieldKey)}
                      >
                        {field} {getSortIcon(fieldKey)}
                      </TableHead>
                    );
                  }
                )}
                <TableHead className="p-3 font-bold text-black uppercase tracking-wider text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y-2 divide-black bg-white">
              {myProjectsLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center font-bold">
                    LOADING...
                  </TableCell>
                </TableRow>
              )}
              {myProjectsError && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center font-bold text-red-600"
                  >
                    ERROR LOADING PROJECTS
                  </TableCell>
                </TableRow>
              )}
              {!myProjectsLoading &&
              !myProjectsError &&
              paginatedProjects.length > 0
                ? paginatedProjects.map((p) => (
                    <React.Fragment key={p.name}>
                      <TableRow
                        onClick={() =>
                          setOpenPipeline(
                            openPipeline === p.name ? null : p.name
                          )
                        }
                        className="bg-[#F5F5F5] divide-x-2 divide-black cursor-pointer hover:bg-[#E0E0E0]"
                      >
                        <TableCell className="p-4 font-mono font-bold">
                          {p.name}
                        </TableCell>
                        <TableCell className="p-4">{p.project_title}</TableCell>
                        <TableCell className="p-4">
                          <span className={getStatusBadge(p.workflow_state)}>
                            {p.workflow_state}
                          </span>
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          <NeoButton
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/project-details/${p.name}`);
                            }}
                            className="text-sm"
                          >
                            View Details
                          </NeoButton>
                        </TableCell>
                      </TableRow>
                      {openPipeline === p.name && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="p-6 bg-sky-100 border-t-2 border-black"
                          >
                            <h5 className="font-bold text-black mb-4 uppercase">
                              Workflow Pipeline: {p.name}
                            </h5>
                            <WorkflowTimeline
                              stages={[
                                { id: 1, title: "Draft", status: "completed" },
                                {
                                  id: 2,
                                  title: "Submitted",
                                  status: "in-progress",
                                },
                                { id: 3, title: "Approved", status: "pending" },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                : !myProjectsError &&
                  !myProjectsLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-48 text-center">
                        <FileSearchIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-black">
                          NO PROJECTS FOUND
                        </h3>
                        <p className="text-gray-700 font-mono mt-2">
                          Try adjusting your search.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
            </TableBody>
          </Table>
        </div>
      </NeoCard>
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="text-sm font-bold text-black">
            PAGE {currentPage} OF {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <NeoButton
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </NeoButton>
            <NeoButton
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </NeoButton>
          </div>
        </div>
      )}
    </div>
  );
  const totalPendingTasks = Object.values(pendingTasksData).flat().length;

  return (
    <div className=" bg-[#FDFCEC]">
      <AppSidebar isPermanentEmployee={isPermanentEmployee} />
      <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
        <div className="border-2 border-black rounded-md">
          <div className="border-b-2 border-black flex">
            {[
              { id: "myProjects", label: "All Projects" },
              { id: "pending", label: "Under Review" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-4 px-4 font-bold text-black text-center transition-all border-r-2 border-black last:border-r-0",
                  activeTab === tab.id
                    ? "bg-[#90A4AE]"
                    : "bg-white hover:bg-cyan-100"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-6 bg-[#F5F5F5]">
            {activeTab === "pending"
              ? renderPendingTasks()
              : renderProjectsTable()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProjectsView;
