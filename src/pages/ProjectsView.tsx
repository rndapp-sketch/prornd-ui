// import * as React from "react";
// import {
//   useFrappeGetDocList,
//   useFrappeAuth,
//   useFrappeGetDoc,
// } from "frappe-react-sdk";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { useNavigate, useLocation } from "react-router-dom";
// import {
//   ChevronRightIcon as ChevronRight,
//   SearchIcon,
//   ChevronsUpDown,
//   CheckCircle2,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { useUserRoles } from '../components/UserRole';
// import { format } from "date-fns";

// // --- LOGIC: Interfaces & Data ---
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
//   head_approver?: string;
//   owner?: string;
//   project_no?: string; // Added field
// }

// interface ProjectsViewProps {
//   initialTab?: string;
// }

// const pendingTasksData: Record<string, Task[]> = {
//   "Temp Adv": [
//     {
//       id: "TA-001",
//       projectNumber: "PRJ-2024-001",
//       projectTitle: "Research Equipment Purchase",
//       status: "Pending Approval",
//       actionDate: "2024-01-15",
//       assignedTo: "Finance Dept",
//       priority: "High",
//     },
//   ],
//   Travel: [
//     {
//       id: "TR-001",
//       projectNumber: "PRJ-2024-003",
//       projectTitle: "International Conference - Singapore",
//       status: "Approval Pending",
//       actionDate: "2024-01-20",
//       assignedTo: "Travel Desk",
//       priority: "High",
//     },
//   ],
//   Leave: [
//     {
//       id: "LV-001",
//       projectNumber: "N/A",
//       projectTitle: "Medical Leave Application",
//       status: "Pending",
//       actionDate: "2024-01-12",
//       assignedTo: "HR Manager",
//       priority: "Medium",
//     },
//   ],
//   "Rate Contract": [
//     {
//       id: "RC-001",
//       projectNumber: "CON-2024-001",
//       projectTitle: "Software License Renewal",
//       status: "Under Negotiation",
//       actionDate: "2024-01-18",
//       assignedTo: "Procurement",
//       priority: "High",
//     },
//   ],
// };

// export function ProjectsView({ initialTab }: ProjectsViewProps) {
//   // --- LOGIC: All hooks and state management remain UNCHANGED ---
//   const [activeTab, setActiveTab] = React.useState(initialTab || "myProjects");
//   // const [openPipeline, setOpenPipeline] = React.useState<string | null>(null); // Unused
//   const [searchQuery, setSearchQuery] = React.useState("");
//   const [sortField, setSortField] = React.useState<
//     "creation" | "name" | "project_title" | "workflow_state" | "modified" | "owner"
//   >("creation");
//   const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
//   const [currentPage, setCurrentPage] = React.useState(1);
//   const [itemsPerPage, setItemsPerPage] = React.useState(10); // Unused set, but kept for future or consistency
//   const [activeTaskTab, setActiveTaskTab] = React.useState(
//     Object.keys(pendingTasksData)[0]
//   );

//   const navigate = useNavigate();
//   const location = useLocation();
//   const { currentUser } = useFrappeAuth();
//   const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
//     fields: ["*"],
//     enabled: !!currentUser,
//   });
//   const { roles: fetchedRoles, isLoading: isRolesLoading, error: rolesError } = useUserRoles(currentUser ?? null);

//   const { isAdministrator, isPermanentEmployee } = React.useMemo(() => {
//     const roles = fetchedRoles?.length > 0 ? fetchedRoles : userData?.roles?.map((r: any) => r.role) ?? [];
//     return {
//       isAdministrator: roles.includes("Administrator"),
//       isPermanentEmployee: roles.includes("Permanent Employee"),
//     };
//   }, [userData, fetchedRoles]);

//   React.useEffect(() => {
//     if (initialTab) setActiveTab(initialTab);
//     if ((location.state as any)?.filter === "Application Under Process") {
//       setActiveTab("pending");
//     }
//   }, [initialTab, location.state]);

//   const {
//     data: myCreatedProjects,
//     isLoading: createdLoading,
//     error: createdError,
//   } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["*"],
//     filters: currentUser ? [["pi_webmail", "=", currentUser]] : [["name", "=", "NON_EXISTENT_DOC"]],
//     limit: 1000,
//   });

//   const {
//     data: myApprovalProjects,
//     isLoading: approvalLoading,
//     error: approvalError,
//   } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["*"],
//     filters: currentUser ? [["head_approver", "=", currentUser]] : [["name", "=", "NON_EXISTENT_DOC"]],
//     limit: 1000,
//   });

//   const {
//     data: allProjectsForAdmin,
//     isLoading: adminLoading,
//     error: adminError,
//   } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["*"],
//     filters: [],
//     limit: 1000,
//   });

//   const isHosRnd = fetchedRoles?.includes("Hos, RnD (Head of Section, RnD)");
//   const isRndStaff = fetchedRoles?.includes("staff, RnD");
//   const isDoRnd = fetchedRoles?.includes("Dean, RnD");

//   const {
//     data: hosAprovalProjects,
//     isLoading: hosLoading,
//     error: hosError,
//   } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["*"],
//     filters: isHosRnd ? [["workflow_state", "=", "Pending HoS Approval"]] : [["name", "=", "NON_EXISTENT_DOC"]],
//     limit: 1000,
//   });

//   const {
//     data: doRndApprovalProjects,
//     isLoading: doRndLoading,
//     error: doRndError,
//   } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["*"],
//     filters: isDoRnd
//       ? [["workflow_state", "=", "Pending Dean Approval"]]
//       : [["name", "=", "NON_EXISTENT_DOC"]],
//     limit: 1000,
//   });

//   const {
//     data: rndstaffAprovalProjects,
//     isLoading: rndstaffLoading,
//     error: rndstaffError,
//   } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["*"],
//     filters: isRndStaff ? [["workflow_state", "=", "Pending Staff Approval"]] : [["name", "=", "NON_EXISTENT_DOC"]],
//     limit: 1000,
//   });

//   const {
//     data: myOwnedProjects,
//     isLoading: ownedLoading,
//     error: ownedError,
//   } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["*"],
//     filters: currentUser ? [["owner", "=", currentUser]] : [["name", "=", "NON_EXISTENT_DOC"]],
//     limit: 1000,
//   });

//   const { myProjects, isLoading: myProjectsLoading, error: myProjectsError } = React.useMemo(() => {
//     if (isHosRnd) {
//       return { myProjects: hosAprovalProjects, isLoading: hosLoading, error: hosError };
//     }
//     if (isRndStaff) {
//       return { myProjects: rndstaffAprovalProjects, isLoading: rndstaffLoading, error: rndstaffError };
//     }
//     if (isAdministrator) {
//       return { myProjects: allProjectsForAdmin, isLoading: adminLoading, error: adminError };
//     }
//     if (isDoRnd) {
//       return { myProjects: doRndApprovalProjects, isLoading: doRndLoading, error: doRndError };
//     }

//     const combined = [...(myCreatedProjects ?? []), ...(myApprovalProjects ?? []), ...(myOwnedProjects ?? [])];
//     const uniqueProjectsMap = new Map<string, Project>();
//     combined.forEach(project => {
//       // Allow all project applications to be listed so their progress can be tracked
//       // from endorsement phase to project registration phase.
//       uniqueProjectsMap.set(project.name, project);
//     });

//     const uniqueProjects = Array.from(uniqueProjectsMap.values());

//     return {
//       myProjects: uniqueProjects,
//       isLoading: createdLoading || approvalLoading,
//       error: createdError || approvalError,
//     };
//   }, [
//     isAdministrator,
//     allProjectsForAdmin, adminLoading, adminError,
//     myCreatedProjects, createdLoading, createdError,
//     myApprovalProjects, approvalLoading, approvalError,
//     myOwnedProjects, ownedLoading, ownedError,
//     isHosRnd, hosAprovalProjects, hosLoading, hosError,
//     isRndStaff, rndstaffAprovalProjects, rndstaffLoading, rndstaffError
//   ]);

//   const filteredAndSortedProjects = React.useMemo(() => {
//     if (!myProjects) return [];
//     let filtered = myProjects.filter((p) =>
//       Object.values(p).some((val) =>
//         String(val).toLowerCase().includes(searchQuery.toLowerCase())
//       )
//     );
//     filtered.sort((a, b) => {
//       const aVal = (a as any)[sortField] ?? "";
//       const bVal = (b as any)[sortField] ?? "";
//       if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
//       if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
//       return 0;
//     });
//     return filtered;
//   }, [myProjects, searchQuery, sortField, sortOrder]);

//   const totalPages = Math.ceil(filteredAndSortedProjects.length / itemsPerPage);
//   const paginatedProjects = filteredAndSortedProjects.slice(
//     (currentPage - 1) * itemsPerPage,
//     currentPage * itemsPerPage
//   );

//   const handleSortChange = (
//     field: "creation" | "name" | "project_title" | "workflow_state" | "modified" | "owner"
//   ) => {
//     setSortField(field);
//     setSortOrder(sortField === field && sortOrder === "desc" ? "asc" : "desc");
//     setCurrentPage(1);
//   };

//   // --- DESIGN: Badge Color Logic ---
//   const getPriorityBadge = (priority: string) => {
//     let variant = "outline";
//     if (priority === "High" || priority === "Urgent") variant = "destructive";
//     if (priority === "Medium") variant = "secondary";
//     return <Badge variant={variant as any}>{priority}</Badge>;
//   };

//   const getStatusBadge = (status: string) => {
//     const s = status?.toLowerCase();
//     let className = "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 border-zinc-200"; // Default/Draft

//     if (["pending", "under review", "approval pending", "process"].some((t) => s?.includes(t))) {
//       className = "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200"; // Pending
//     } else if (s?.includes("approved") || s?.includes("open")) {
//       className = "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200"; // Success
//     } else if (s?.includes("rejected") || s?.includes("closed")) {
//       className = "bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200"; // Error/Closed
//     }

//     return <Badge variant="outline" className={cn("border", className)}>{status}</Badge>;
//   };

//   // --- Fetch Project Proposals ---
//   const { data: projectProposals, isLoading: proposalsLoading } = useFrappeGetDocList("Project Proposal", {
//     fields: ["name", "project_title", "workflow_state", "creation", "modified", "owner"],
//     filters: currentUser ? [["owner", "=", currentUser]] : [["name", "=", "NON_EXISTENT_DOC"]],
//     limit: 100,
//   });

//   const allPendingTasks: Record<string, Task[]> = React.useMemo(() => {
//     const proposals: Task[] = (projectProposals || []).map((p: any) => ({
//       id: p.name,
//       projectNumber: p.name,
//       projectTitle: p.project_title || "Untitled Proposal",
//       status: p.workflow_state || "Draft",
//       actionDate: p.modified || p.creation,
//       assignedTo: "R&D Admin", // Default or derived
//       priority: "Medium",
//     }));

//     return {
//       "Endorsement": proposals,
//       ...pendingTasksData,
//     };
//   }, [projectProposals]);

//   // Ensure activeTaskTab is valid
//   React.useEffect(() => {
//     if (!allPendingTasks[activeTaskTab] && Object.keys(allPendingTasks).length > 0) {
//       setActiveTaskTab(Object.keys(allPendingTasks)[0]);
//     }
//   }, [allPendingTasks, activeTaskTab]);


//   // --- Render Functions ---
//   const renderPendingTasks = () => {
//     if (proposalsLoading) {
//       return (
//         <Card className="text-center py-12">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto mb-4"></div>
//           <p className="text-zinc-500 text-sm">Loading tasks...</p>
//         </Card>
//       );
//     }

//     const totalTasks = Object.values(allPendingTasks).flat().length;
//     const taskCategories = Object.keys(allPendingTasks);
//     const activeTasks = allPendingTasks[activeTaskTab] || [];

//     if (totalTasks === 0) {
//       return (
//         <Card className="text-center py-12">
//           <CheckCircle2 className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
//           <h3 className="text-lg font-medium text-zinc-900">No Pending Tasks</h3>
//           <p className="text-zinc-500 text-sm mt-1">You're all caught up!</p>
//         </Card>
//       );
//     }

//     return (
//       <div className="space-y-6 animate-in fade-in duration-500">
//         <div className="flex items-center justify-between">
//           <div>
//             <h2 className="text-lg font-serif font-medium text-zinc-900 dark:text-zinc-100">Pending Actions</h2>
//             <p className="text-sm text-zinc-500 dark:text-zinc-400">Review and approve requests.</p>
//           </div>
//           <Badge variant="secondary">{totalTasks} Total</Badge>
//         </div>

//         <Card>
//           <div className="border-b border-zinc-200 dark:border-zinc-800">
//             <div className="flex overflow-x-auto">
//               {taskCategories.map((category) => (
//                 <button
//                   key={category}
//                   onClick={() => setActiveTaskTab(category)}
//                   className={cn(
//                     "px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
//                     activeTaskTab === category
//                       ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
//                       : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200"
//                   )}
//                 >
//                   {category}
//                   <span className="ml-2 text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400">
//                     {allPendingTasks[category]?.length || 0}
//                   </span>
//                 </button>
//               ))}
//             </div>
//           </div>
//           <CardContent className="p-0">
//             <div className="overflow-x-auto">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead className="w-[80px] whitespace-nowrap">Task ID</TableHead>
//                     <TableHead className="min-w-[150px]">Details</TableHead>
//                     <TableHead className="w-[100px] whitespace-nowrap">Status</TableHead>
//                     <TableHead className="w-[80px] whitespace-nowrap">Priority</TableHead>
//                     <TableHead className="w-[100px] whitespace-nowrap">Assigned To</TableHead>
//                     <TableHead className="w-[90px] whitespace-nowrap">Date</TableHead>
//                     <TableHead className="text-right w-[60px] whitespace-nowrap">Action</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {activeTasks.length === 0 ? (
//                     <TableRow>
//                       <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
//                         No active tasks in this category.
//                       </TableCell>
//                     </TableRow>
//                   ) : (
//                     activeTasks.map((task) => (
//                       <TableRow key={task.id}>
//                         <TableCell className="font-mono text-xs whitespace-nowrap">{task.id}</TableCell>
//                         <TableCell>
//                           <div className="font-medium whitespace-normal min-w-[150px] max-w-[300px]">{task.projectTitle}</div>
//                           <div className="text-xs text-zinc-500 font-mono mt-0.5 whitespace-nowrap">{task.projectNumber}</div>
//                         </TableCell>
//                         <TableCell className="whitespace-nowrap">{getStatusBadge(task.status!)}</TableCell>
//                         <TableCell className="whitespace-nowrap">{getPriorityBadge(task.priority!)}</TableCell>
//                         <TableCell className="text-zinc-500 text-xs whitespace-nowrap">{task.assignedTo}</TableCell>
//                         <TableCell className="text-zinc-500 text-xs whitespace-nowrap">
//                           {task.actionDate ? format(new Date(task.actionDate), "MMM dd, yyyy") : "-"}
//                         </TableCell>
//                         <TableCell className="text-right whitespace-nowrap">
//                           <Button
//                             variant="default"
//                             size="sm"
//                             className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:text-zinc-900"
//                             onClick={() => {
//                               if (activeTaskTab === "Endorsement") {
//                                 navigate(`/project-proposal-details/${task.id}`);
//                               } else {
//                                 console.log("View clicked for", task.id);
//                               }
//                             }}
//                           >
//                             Review
//                           </Button>
//                         </TableCell>
//                       </TableRow>
//                     ))
//                   )}
//                 </TableBody>
//               </Table>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   };

//   const renderProjectsTable = () => (
//     <div className="space-y-6 animate-in fade-in duration-500">
//       <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
//         <div className="relative w-full sm:w-72">
//           <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
//           <Input
//             placeholder="Search projects by ID, title..."
//             value={searchQuery}
//             onChange={(e) => {
//               setSearchQuery(e.target.value);
//               setCurrentPage(1);
//             }}
//             className="pl-9 bg-white dark:bg-zinc-900"
//           />
//         </div>
//         <div className="flex gap-2 w-full sm:w-auto">
//           <Select value={sortField} onValueChange={(v: any) => handleSortChange(v)}>
//             <SelectTrigger className="w-[180px] bg-white dark:bg-zinc-900">
//               <SelectValue placeholder="Sort by" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="creation">Creation Date</SelectItem>
//               <SelectItem value="modified">Modified Date</SelectItem>
//               <SelectItem value="name">Project Number</SelectItem>
//               <SelectItem value="project_title">Title</SelectItem>
//               <SelectItem value="workflow_state">Status</SelectItem>
//             </SelectContent>
//           </Select>
//           <Button
//             variant="outline"
//             size="icon"
//             onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
//             className="bg-white dark:bg-zinc-900 shrink-0"
//           >
//             <ChevronsUpDown className="h-4 w-4" />
//           </Button>
//         </div>
//       </div>

//       <Card>
//         <CardContent className="p-0">
//           <div className="overflow-x-auto">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead className="w-[80px] whitespace-nowrap">Number</TableHead>
//                   <TableHead className="min-w-[150px] whitespace-nowrap">Project Title</TableHead>
//                   <TableHead className="w-[120px] whitespace-nowrap">Funding Agency</TableHead>
//                   <TableHead className="w-[90px] whitespace-nowrap">Date</TableHead>
//                   <TableHead className="w-[100px] whitespace-nowrap">Status</TableHead>
//                   <TableHead className="text-right w-[60px] whitespace-nowrap">Action</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {myProjectsLoading ? (
//                   Array.from({ length: 5 }).map((_, i) => (
//                     <TableRow key={i}>
//                       <TableCell><div className="h-4 w-20 bg-zinc-100 rounded animate-pulse" /></TableCell>
//                       <TableCell><div className="h-4 w-48 bg-zinc-100 rounded animate-pulse" /></TableCell>
//                       <TableCell><div className="h-4 w-24 bg-zinc-100 rounded animate-pulse" /></TableCell>
//                       <TableCell><div className="h-4 w-24 bg-zinc-100 rounded animate-pulse" /></TableCell>
//                       <TableCell><div className="h-4 w-16 bg-zinc-100 rounded animate-pulse" /></TableCell>
//                       <TableCell><div className="h-8 w-8 bg-zinc-100 rounded animate-pulse ml-auto" /></TableCell>
//                     </TableRow>
//                   ))
//                 ) : myProjectsError ? (
//                   <TableRow>
//                     <TableCell colSpan={8} className="h-24 text-center text-red-500">
//                       Error loading projects. Please try again.
//                     </TableCell>
//                   </TableRow>
//                 ) : paginatedProjects.length === 0 ? (
//                   <TableRow>
//                     <TableCell colSpan={8} className="h-24 text-center text-zinc-500">
//                       No projects found matching your criteria.
//                     </TableCell>
//                   </TableRow>
//                 ) : (
//                   paginatedProjects.map((p: any) => (
//                     <TableRow
//                       key={p.name}
//                       className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
//                       onClick={() => {
//                         const targetPath =
//                           p.workflow_state === "Approved" || p.workflow_state === "Proposal Approved"
//                             ? `/project-details-overview/${p.name}`
//                             : `/project-details/${p.name}`;
//                         navigate(targetPath);
//                       }}
//                     >
//                       <TableCell className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
//                         {p.project_no || p.name}
//                       </TableCell>
//                       <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
//                         <div className="line-clamp-2 min-w-[150px] max-w-[300px]" title={p.project_title}>{p.project_title}</div>
//                       </TableCell>
//                       <TableCell className="text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap">
//                         {p.funding_agen || "-"}
//                       </TableCell>
//                       <TableCell className="text-zinc-500 text-xs whitespace-nowrap">
//                         {p.creation ? format(new Date(p.creation), "MMM dd, yyyy") : "-"}
//                       </TableCell>
//                       <TableCell className="whitespace-nowrap">
//                         {getStatusBadge(p.workflow_state)}
//                       </TableCell>
//                       <TableCell className="text-right whitespace-nowrap">
//                         {p.workflow_state === "Endorsement Approved" ? (
//                           <Button
//                             variant="default"
//                             size="sm"
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               navigate(`/project-registration?docname=${p.name}&isApprovedEndorsement=true`);
//                             }}
//                           >
//                             Register Project
//                           </Button>
//                         ) : (
//                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//                             <ChevronRight className="h-4 w-4" />
//                             <span className="sr-only">View</span>
//                           </Button>
//                         )}
//                       </TableCell>
//                     </TableRow>
//                   ))
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         </CardContent>
//       </Card>

//       {totalPages > 1 && (
//         <div className="flex items-center justify-between py-4">
//           <div className="text-sm text-zinc-500">
//             Page {currentPage} of {totalPages}
//           </div>
//           <div className="flex items-center gap-2">
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
//               disabled={currentPage === 1}
//             >
//               Previous
//             </Button>
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
//               disabled={currentPage === totalPages}
//             >
//               Next
//             </Button>
//           </div>
//         </div>
//       )}
//     </div>
//   );

//   return (
//     <div className="w-full mx-auto space-y-8 animate-in fade-in duration-500">
//       {/* Page Header */}
//       <div className="flex flex-col gap-1">
//         <h1 className="text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-50">Projects</h1>
//         <p className="text-zinc-500 dark:text-zinc-400">Manage and track all your research projects.</p>
//       </div>

//       {/* Tabs */}
//       <div className="flex flex-col space-y-4">
//         <div className="border-b border-zinc-200 dark:border-zinc-800">
//           <nav className="-mb-px flex space-x-8" aria-label="Tabs">
//             {[
//               { id: "myProjects", label: "My Projects", count: myProjects?.length || 0 }
//             ].map((tab) => (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id)}
//                 className={cn(
//                   "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
//                   activeTab === tab.id
//                     ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
//                     : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200"
//                 )}
//               >
//                 {tab.label}
//                 {tab.count > 0 && (
//                   <span className={cn(
//                     "ml-2 py-0.5 px-2 rounded-full text-xs font-medium",
//                     activeTab === tab.id
//                       ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
//                       : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
//                   )}>
//                     {tab.count}
//                   </span>
//                 )}
//               </button>
//             ))}
//           </nav>
//         </div>

//         <div className="pt-2">
//           {activeTab === "pending" ? renderPendingTasks() : renderProjectsTable()}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default ProjectsView;




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
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronRightIcon as ChevronRight,
  SearchIcon,
  ChevronsUpDown,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRoles } from "../components/UserRole";
import { format } from "date-fns";

// --- LOGIC: Interfaces & Data ---
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
  head_approver?: string;
  owner?: string;
  project_no?: string; // Added field
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

export function ProjectsView({ initialTab }: ProjectsViewProps) {
  // --- LOGIC: All hooks and state management remain UNCHANGED ---
  const [activeTab, setActiveTab] = React.useState(
    initialTab || "myProjects",
  );
  // const [openPipeline, setOpenPipeline] = React.useState<string | null>(null); // Unused
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortField, setSortField] = React.useState<
    | "creation"
    | "name"
    | "project_title"
    | "workflow_state"
    | "modified"
    | "owner"
  >("creation");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10); // Unused set, but kept for future or consistency
  const [activeTaskTab, setActiveTaskTab] = React.useState(
    Object.keys(pendingTasksData)[0],
  );

  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["*"],
    enabled: !!currentUser,
  });
  const {
    roles: fetchedRoles,
    isLoading: isRolesLoading,
    error: rolesError,
  } = useUserRoles(currentUser ?? null);

  const { isAdministrator, isPermanentEmployee } = React.useMemo(() => {
    const roles =
      fetchedRoles?.length > 0
        ? fetchedRoles
        : (userData?.roles?.map((r: any) => r.role) ?? []);
    return {
      isAdministrator: roles.includes("Administrator"),
      isPermanentEmployee: roles.includes("Permanent Employee"),
    };
  }, [userData, fetchedRoles]);

  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if ((location.state as any)?.filter === "Application Under Process") {
      setActiveTab("pending");
    }
  }, [initialTab, location.state]);

  const {
    data: myCreatedProjects,
    isLoading: createdLoading,
    error: createdError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: currentUser
      ? [["pi_webmail", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const {
    data: myApprovalProjects,
    isLoading: approvalLoading,
    error: approvalError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: currentUser
      ? [["head_approver", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const {
    data: allProjectsForAdmin,
    isLoading: adminLoading,
    error: adminError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: [],
    limit: 1000,
  });

  const isHosRnd = fetchedRoles?.includes("Hos, RnD (Head of Section, RnD)");
  const isRndStaff = fetchedRoles?.includes("staff, RnD");
  const isDoRnd = fetchedRoles?.includes("Dean, RnD");

  const {
    data: hosAprovalProjects,
    isLoading: hosLoading,
    error: hosError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: isHosRnd
      ? [["workflow_state", "=", "Pending HoS Approval"]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const {
    data: doRndApprovalProjects,
    isLoading: doRndLoading,
    error: doRndError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: isDoRnd
      ? [["workflow_state", "=", "Pending Dean Approval"]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const {
    data: rndstaffAprovalProjects,
    isLoading: rndstaffLoading,
    error: rndstaffError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: isRndStaff
      ? [["workflow_state", "=", "Pending Staff Approval"]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const {
    data: myOwnedProjects,
    isLoading: ownedLoading,
    error: ownedError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: currentUser
      ? [["owner", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const {
    myProjects,
    isLoading: myProjectsLoading,
    error: myProjectsError,
  } = React.useMemo(() => {
    if (isHosRnd) {
      return {
        myProjects: hosAprovalProjects,
        isLoading: hosLoading,
        error: hosError,
      };
    }
    if (isRndStaff) {
      return {
        myProjects: rndstaffAprovalProjects,
        isLoading: rndstaffLoading,
        error: rndstaffError,
      };
    }
    if (isAdministrator) {
      return {
        myProjects: allProjectsForAdmin,
        isLoading: adminLoading,
        error: adminError,
      };
    }
    if (isDoRnd) {
      return {
        myProjects: doRndApprovalProjects,
        isLoading: doRndLoading,
        error: doRndError,
      };
    }

    const combined = [
      ...(myCreatedProjects ?? []),
      ...(myOwnedProjects ?? []),
    ];
    const uniqueProjectsMap = new Map<string, Project>();
    combined.forEach((project) => {
      // Allow all project applications to be listed so their progress can be tracked
      // from endorsement phase to project registration phase.
      uniqueProjectsMap.set(project.name, project);
    });

    const uniqueProjects = Array.from(uniqueProjectsMap.values());

    return {
      myProjects: uniqueProjects,
      isLoading: createdLoading || ownedLoading,
      error: createdError || ownedError,
    };
  }, [
    isAdministrator,
    allProjectsForAdmin,
    adminLoading,
    adminError,
    myCreatedProjects,
    createdLoading,
    createdError,
    myApprovalProjects,
    approvalLoading,
    approvalError,
    myOwnedProjects,
    ownedLoading,
    ownedError,
    isHosRnd,
    hosAprovalProjects,
    hosLoading,
    hosError,
    isRndStaff,
    rndstaffAprovalProjects,
    rndstaffLoading,
    rndstaffError,
  ]);

  const filteredAndSortedProjects = React.useMemo(() => {
    if (!myProjects) return [];
    let filtered = myProjects.filter((p) =>
      Object.values(p).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase()),
      ),
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

  const totalPages = Math.ceil(
    filteredAndSortedProjects.length / itemsPerPage,
  );
  const paginatedProjects = filteredAndSortedProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleSortChange = (
    field:
      | "creation"
      | "name"
      | "project_title"
      | "workflow_state"
      | "modified"
      | "owner",
  ) => {
    setSortField(field);
    setSortOrder(
      sortField === field && sortOrder === "desc" ? "asc" : "desc",
    );
    setCurrentPage(1);
  };

  // --- DESIGN: Badge Color Logic ---
  const getPriorityBadge = (priority: string) => {
    let variant = "outline";
    if (priority === "High" || priority === "Urgent")
      variant = "destructive";
    if (priority === "Medium") variant = "secondary";
    return <Badge variant={variant as any}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    let className =
      "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 border-zinc-200"; // Default/Draft

    if (
      ["pending", "under review", "approval pending", "process"].some(
        (t) => s?.includes(t),
      )
    ) {
      className =
        "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200"; // Pending
    } else if (s?.includes("approved") || s?.includes("open")) {
      className =
        "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200"; // Success
    } else if (s?.includes("rejected") || s?.includes("closed")) {
      className =
        "bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200"; // Error/Closed
    }

    return (
      <Badge variant="outline" className={cn("border", className)}>
        {status}
      </Badge>
    );
  };

  // --- Fetch all Fund Sanctions: only "Sanction Approved" ones hide the "(Pending Sanction)" label ---
  // Fund Sanction.refnum_prj_num stores the Project Registration name (p.name)
  const { data: allSanctions } = useFrappeGetDocList("Fund Sanction", {
    fields: ["refnum_prj_num"],
    filters: [["workflow_state", "=", "Sanction Approved"]],
    limit: 2000,
  });

  const sanctionedProjectsSet = React.useMemo(() => {
    const s = new Set<string>();
    (allSanctions ?? []).forEach((doc: any) => {
      if (doc.refnum_prj_num) s.add(doc.refnum_prj_num);
    });
    console.log("[Sanction] allSanctions raw:", allSanctions);
    console.log("[Sanction] sanctionedProjectsSet:", Array.from(s));
    return s;
  }, [allSanctions]);

  // p.name == Fund Sanction.refnum_prj_num
  const hasSanction = (p: any) => {
    const result = sanctionedProjectsSet.has(p.name);
    console.log(`[Sanction] hasSanction(${p.name}):`, result, "| set size:", sanctionedProjectsSet.size);
    return result;
  };

  // --- Fetch Project Proposals ---
  const { data: projectProposals, isLoading: proposalsLoading } =
    useFrappeGetDocList("Project Registration", {
      fields: [
        "name",
        "project_title",
        "workflow_state",
        "creation",
        "modified",
        "pi_webmail",
      ],
      filters: currentUser
        ? [["pi_webmail", "=", currentUser]]
        : [["name", "=", "NON_EXISTENT_DOC"]],
      limit: 100,
    });

  // --- Fetch all Funding Agencies for name lookup ---
  const { data: allFundingAgencies } = useFrappeGetDocList("fundingagency_", {
    fields: ["name", "funding_agency_name"],
    limit: 0,
  } as any);

  const fundingAgencyNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    (allFundingAgencies ?? []).forEach((agency: any) => {
      if (agency.name && agency.funding_agency_name) {
        map.set(agency.name, agency.funding_agency_name);
      }
    });
    return map;
  }, [allFundingAgencies]);

  const allPendingTasks: Record<string, Task[]> = React.useMemo(() => {
    const proposals: Task[] = (projectProposals || []).map((p: any) => ({
      id: p.name,
      projectNumber: p.name,
      projectTitle: p.project_title || "Untitled Proposal",
      status: p.workflow_state || "Draft",
      actionDate: p.modified || p.creation,
      assignedTo: "R&D Admin", // Default or derived
      priority: "Medium",
    }));

    return {
      Endorsement: proposals,
      ...pendingTasksData,
    };
  }, [projectProposals]);

  // Ensure activeTaskTab is valid
  React.useEffect(() => {
    if (
      !allPendingTasks[activeTaskTab] &&
      Object.keys(allPendingTasks).length > 0
    ) {
      setActiveTaskTab(Object.keys(allPendingTasks)[0]);
    }
  }, [allPendingTasks, activeTaskTab]);

  // --- Render Functions ---
  const renderPendingTasks = () => {
    if (proposalsLoading) {
      return (
        <Card className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto mb-4"></div>
          <p className="text-zinc-500 text-sm">Loading tasks...</p>
        </Card>
      );
    }

    const totalTasks = Object.values(allPendingTasks).flat().length;
    const taskCategories = Object.keys(allPendingTasks);
    const activeTasks = allPendingTasks[activeTaskTab] || [];

    if (totalTasks === 0) {
      return (
        <Card className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900">
            No Pending Tasks
          </h3>
          <p className="text-zinc-500 text-sm mt-1">
            You're all caught up!
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-medium text-zinc-900 dark:text-zinc-100">
              Pending Actions
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Review and approve requests.
            </p>
          </div>
          <Badge variant="secondary">{totalTasks} Total</Badge>
        </div>

        <Card>
          <div className="border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex overflow-x-auto">
              {taskCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveTaskTab(category)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
                    activeTaskTab === category
                      ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                      : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200",
                  )}
                >
                  {category}
                  <span className="ml-2 text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400">
                    {allPendingTasks[category]?.length || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] whitespace-nowrap">
                      Task ID
                    </TableHead>
                    <TableHead className="min-w-[150px]">
                      Details
                    </TableHead>
                    <TableHead className="w-[100px] whitespace-nowrap">
                      Status
                    </TableHead>
                    <TableHead className="w-[80px] whitespace-nowrap">
                      Priority
                    </TableHead>
                    <TableHead className="w-[100px] whitespace-nowrap">
                      Assigned To
                    </TableHead>
                    <TableHead className="w-[90px] whitespace-nowrap">
                      Date
                    </TableHead>
                    <TableHead className="text-right w-[60px] whitespace-nowrap">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTasks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-zinc-500"
                      >
                        No active tasks in this
                        category.
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {task.id}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium whitespace-normal min-w-[150px] max-w-[300px]">
                            {task.projectTitle}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono mt-0.5 whitespace-nowrap">
                            {task.projectNumber}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getStatusBadge(
                            task.status!,
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getPriorityBadge(
                            task.priority!,
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-xs whitespace-nowrap">
                          {task.assignedTo}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-xs whitespace-nowrap">
                          {task.actionDate
                            ? format(
                              new Date(
                                task.actionDate,
                              ),
                              "MMM dd, yyyy",
                            )
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:text-zinc-900"
                            onClick={() => {
                              if (
                                activeTaskTab ===
                                "Endorsement"
                              ) {
                                navigate(
                                  `/project-proposal-details/${task.id}`,
                                );
                              } else {
                                console.log(
                                  "View clicked for",
                                  task.id,
                                );
                              }
                            }}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderProjectsTable = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search projects by ID, title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 bg-white dark:bg-zinc-900"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select
            value={sortField}
            onValueChange={(v: any) => handleSortChange(v)}
          >
            <SelectTrigger className="w-[180px] bg-white dark:bg-zinc-900">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="creation">
                Creation Date
              </SelectItem>
              <SelectItem value="modified">
                Modified Date
              </SelectItem>
              <SelectItem value="name">Project Number</SelectItem>
              <SelectItem value="project_title">Title</SelectItem>
              <SelectItem value="workflow_state">
                Status
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
            }
            className="bg-white dark:bg-zinc-900 shrink-0"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] whitespace-nowrap">
                    Number
                  </TableHead>
                  <TableHead className="min-w-[150px] whitespace-nowrap">
                    Project Title
                  </TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap">
                    Funding Agency
                  </TableHead>
                  <TableHead className="w-[90px] whitespace-nowrap">
                    Date
                  </TableHead>
                  <TableHead className="w-[100px] whitespace-nowrap">
                    Status
                  </TableHead>
                  <TableHead className="text-right w-[60px] whitespace-nowrap">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myProjectsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="h-4 w-20 bg-zinc-100 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-48 bg-zinc-100 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 bg-zinc-100 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 bg-zinc-100 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-16 bg-zinc-100 rounded animate-pulse" />
                      </TableCell>
                      <TableCell>
                        <div className="h-8 w-8 bg-zinc-100 rounded animate-pulse ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : myProjectsError ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-red-500"
                    >
                      Error loading projects. Please try
                      again.
                    </TableCell>
                  </TableRow>
                ) : paginatedProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-zinc-500"
                    >
                      No projects found matching your
                      criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProjects.map((p: any) => (
                    <TableRow
                      key={p.name}
                      className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                      onClick={() => {
                        const targetPath =
                          p.workflow_state ===
                            "Approved" ||
                            p.workflow_state ===
                            "Proposal Approved"
                            ? `/project-details-overview/${p.name}`
                            : `/project-details/${p.name}`;
                        navigate(targetPath);
                      }}
                    >
                      <TableCell className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {p.project_no || p.name}
                      </TableCell>
                      <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                        <div
                          className="line-clamp-2 min-w-[150px] max-w-[300px]"
                          title={p.project_title}
                        >
                          {p.project_title}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap">
                        {fundingAgencyNameMap.get(p.funding_agen) || p.funding_agen || "-"}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-xs whitespace-nowrap">
                        {p.creation
                          ? format(
                            new Date(p.creation),
                            "MMM dd, yyyy",
                          )
                          : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {getStatusBadge(p.workflow_state)}
                          {p.workflow_state === "Approved" && (
                            hasSanction(p) ? (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                (Sanction Approved)
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                (Pending Sanction)
                              </span>
                            )
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {p.workflow_state ===
                          "Endorsement Approved" ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/project-registration?docname=${p.name}&isApprovedEndorsement=true`,
                              );
                            }}
                          >
                            Register Project
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">
                              View
                            </span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-zinc-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((p) => Math.max(1, p - 1))
              }
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(totalPages, p + 1),
                )
              }
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-50">
          Projects
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Manage and track all your research projects.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-col space-y-4">
        <div className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
              {
                id: "myProjects",
                label: "My Projects",
                count: myProjects?.length || 0,
              },
              // { id: "pending", label: "Pending Review", count: Object.values(allPendingTasks).flat().length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
                    ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200",
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "ml-2 py-0.5 px-2 rounded-full text-xs font-medium",
                      activeTab === tab.id
                        ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-2">
          {activeTab === "pending"
            ? renderPendingTasks()
            : renderProjectsTable()}
        </div>
      </div>
    </div>
  );
}

export default ProjectsView;
