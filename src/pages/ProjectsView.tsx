

// // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= new code


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
//   ChevronRightIcon as ChevronRight,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { useEffect } from 'react';
// import { useUserRoles } from '../components/UserRole';
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
//   head_approver?: string; // Important for the new logic
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

// const taskIcons = {
//   "Temp Adv": UserIcon,
//   Travel: PlaneIcon,
//   Leave: CalendarIcon,
//   "Rate Contract": FileTextIcon,
//   "Contractual Recruitment": UsersIcon,
//   "Fresh Proposal Submission": SendIcon,
//   "Extension of Tenure": CalendarIcon,
//   "NIQ Generation": FileQuestionIcon,
//   "Reimbursement (Max. Limit ₹ 1 lakh)": ReceiptIcon,
// };

// // --- DESIGN: Neo-Brutalism Reusable Components with Lighter Shadows ---
// const NeoButton = React.forwardRef<
//   HTMLButtonElement,
//   React.ButtonHTMLAttributes<HTMLButtonElement>
// >(({ className, children, ...props }, ref) => (
//   <button
//     ref={ref}
//     className={cn(
//       "px-4 py-2 bg-white border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all",
//       "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
//       "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
//       "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-gray-200 disabled:translate-x-0 disabled:translate-y-0",
//       className
//     )}
//     {...props}
//   >
//     {children}
//   </button>
// ));
// NeoButton.displayName = "NeoButton";

// const NeoCard = ({
//   className,
//   children,
// }: {
//   className?: string;
//   children: React.ReactNode;
// }) => (
//   <div
//     className={cn(
//       "bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]",
//       className
//     )}
//   >
//     {children}
//   </div>
// );

// export function ProjectsView({ initialTab }: ProjectsViewProps) {
//   // --- LOGIC: All hooks and state management remain UNCHANGED ---
//   const [activeTab, setActiveTab] = React.useState(initialTab || "myProjects");
//   const [openPipeline, setOpenPipeline] = React.useState<string | null>(null);
//   const [searchQuery, setSearchQuery] = React.useState("");
//   const [sortField, setSortField] = React.useState<
//     "creation" | "name" | "project_title" | "workflow_state"
//   >("creation");
//   const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
//   const [currentPage, setCurrentPage] = React.useState(1);
//   const [itemsPerPage, setItemsPerPage] = React.useState(10);
//   const [activeTaskTab, setActiveTaskTab] = React.useState(
//     Object.keys(pendingTasksData)[0]
//   );
//   //  const { currentUser, isLoading: isAuthLoading } = useFrappeAuth();
//     // Use the new useUserRoles hook to fetch user roles


//   const navigate = useNavigate();
//   const location = useLocation();
//   const { currentUser } = useFrappeAuth();
//   const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
//     fields: ["*"],
//     enabled: !!currentUser,
//   });
// const { roles: fetchedRoles, isLoading: isRolesLoading, error: rolesError } = useUserRoles(currentUser ?? null);
// console.log("roles fetched from useUserRoles:", fetchedRoles);
// console.log("userData :", userData);

// // Using useMemo to extract roles from both sources
// const { isAdministrator, isPermanentEmployee } = React.useMemo(() => {
//   // Prefer roles from `useUserRoles` if available
//   const roles = fetchedRoles?.length > 0 ? fetchedRoles : userData?.roles?.map((r: any) => r.role) ?? [];

//   console.log("combined roles :", roles); // Check what roles are being combined
  
//   return {
//     isAdministrator: roles.includes("Administrator"),
//     isPermanentEmployee: roles.includes("Permanent Employee"),
//   };
// }, [userData, fetchedRoles]);

// // console.log("roles:", roles);

//   React.useEffect(() => {
//     if (initialTab) setActiveTab(initialTab);
//     if ((location.state as any)?.filter === "Application Under Process") {
//       setActiveTab("pending");
//     }
//   }, [initialTab, location.state]);


//   // Fetch projects where the current user is the creator (pi_webmail).
//   const {
//     data: myCreatedProjects,
//     isLoading: createdLoading,
//     error: createdError,
//   } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["*"],
//     filters: currentUser ? [["pi_webmail", "=", currentUser]] : [["name", "=", "NON_EXISTENT_DOC"]],
//     limit: 1000,
   
//   });

//   // Fetch projects where the current user is the approver (head_approver).
//   const {
//     data: myApprovalProjects,
//     isLoading: approvalLoading,
//     error: approvalError,
//   } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["*"],
//     filters: currentUser ? [["head_approver", "=", currentUser]] : [["name", "=", "NON_EXISTENT_DOC"]],
//     limit: 1000,
    
//   });

//   // Fetch all projects if the user is an Administrator.
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
//   // Combine, deduplicate, and manage loading/error states from all fetches.
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

//     const combined = [...(myCreatedProjects ?? []), ...(myApprovalProjects ?? [])];
//     const uniqueProjectsMap = new Map<string, Project>();
//     combined.forEach(project => {
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
//     field: "creation" | "name" | "project_title" | "workflow_state"
//   ) => {
//     setSortField(field);
//     setSortOrder(sortField === field && sortOrder === "desc" ? "asc" : "desc");
//     setCurrentPage(1);
//   };
  
//   const getSortIcon = (field: string) =>
//     sortField === field ? (sortOrder === "asc" ? "↑" : "↓") : "";

//   // --- DESIGN: Badge Color Logic ---
//   const getPriorityBadge = (priority: string) => {
//     const styles: Record<string, string> = {
//       Low: "bg-green-300",
//       Medium: "bg-amber-300",
//       High: "bg-orange-400",
//       Urgent: "bg-red-500 text-white",
//     };
//     return cn(
//       "inline-block px-2.5 py-1 rounded-md text-xs font-bold border-2 border-black",
//       styles[priority] || "bg-slate-300"
//     );
//   };
  
//   const getStatusBadge = (status: string) => {
//     const s = status?.toLowerCase();
//     let style = "bg-sky-300";
//     if (
//       [
//         "pending",
//         "under review",
//         "approval pending",
//         "under negotiation",
//         "interview stage",
//       ].some((t) => s?.includes(t))
//     )
//       style = "bg-amber-300";
//     else if (s?.includes("approved")) style = "bg-green-300";
//     else if (s?.includes("draft")) style = "bg-slate-300";
//     else if (s?.includes("rejected")) style = "bg-red-500 text-white";
//     return cn(
//       "inline-block px-2.5 py-1 rounded-md text-xs font-bold border-2 border-black",
//       style
//     );
//   };

//   // --- Render Functions ---
//   const renderPendingTasks = () => {
//     const totalTasks = Object.values(pendingTasksData).flat().length;
//     const taskCategories = Object.keys(pendingTasksData);
//     const activeTasks = pendingTasksData[activeTaskTab] || [];

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
//       <div className="space-y-8">
//         <NeoCard className="p-4">
//           <h3 className="text-xl font-bold text-black uppercase">
//             Applications Under Review ({totalTasks})
//           </h3>
//           <p className="text-sm text-gray-700 font-mono">
//             {taskCategories.length} categories
//           </p>
//         </NeoCard>

//         <div className="border-2 border-black rounded-md">
//           <div className="border-b-2 border-black flex flex-wrap">
//             {taskCategories.map((category) => (
//               <button
//                 key={category}
//                 onClick={() => setActiveTaskTab(category)}
//                 className={cn(
//                   "flex-grow p-3 font-bold text-black text-center transition-all border-b-2 sm:border-b-0 sm:border-r-2 border-black last:border-r-0 text-sm",
//                   activeTaskTab === category
//                     ? "bg-[#90A4AE]"
//                     : "bg-white hover:bg-[#90A4AE]"
//                 )}
//               >
//                 {category}
//               </button>
//             ))}
//           </div>
//           <div className="p-4 bg-[#FDFCEC]">
//             <div className="overflow-x-auto">
//               <Table className="divide-y-2 divide-black">
//                 <TableHeader>
//                   <TableRow className="divide-x-2 divide-black bg-slate-200">
//                     {[
//                       "Task ID",
//                       "Project Title",
//                       "Status",
//                       "Priority",
//                       "Assigned To",
//                       "Date",
//                       "Action",
//                     ].map((h) => (
//                       <TableHead
//                         key={h}
//                         className="p-3 font-bold text-black uppercase"
//                       >
//                         {h}
//                       </TableHead>
//                     ))}
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody className="divide-y-2 divide-black bg-white">
//                   {activeTasks.map((task) => (
//                     <TableRow
//                       key={task.id}
//                       className="divide-x-2 divide-black hover:bg-slate-100"
//                     >
//                       <TableCell className="p-3 font-mono">{task.id}</TableCell>
//                       <TableCell className="p-3 font-medium">
//                         {task.projectTitle}
//                         <br />
//                         <span className="font-mono text-gray-600 text-sm">
//                           {task.projectNumber}
//                         </span>
//                       </TableCell>
//                       <TableCell className="p-3">
//                         <span className={getStatusBadge(task.status!)}>
//                           {task.status}
//                         </span>
//                       </TableCell>
//                       <TableCell className="p-3">
//                         <span className={getPriorityBadge(task.priority!)}>
//                           {task.priority}
//                         </span>
//                       </TableCell>
//                       <TableCell className="p-3 font-mono">
//                         {task.assignedTo}
//                       </TableCell>
//                       <TableCell className="p-3 font-mono">
//                         {new Date(task.actionDate).toLocaleDateString()}
//                       </TableCell>
//                       <TableCell className="p-3 text-right">
//                         <NeoButton className="text-sm bg-[#A5D6A7] hover:bg-[#A5D6A7]">
//                           View
//                         </NeoButton>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   const renderProjectsTable = () => (
//     <div className="space-y-8 bg-[#FDFCEC]">
//       <NeoCard className="p-4">
//         <div className="flex flex-col sm:flex-row gap-4 justify-between">
//           <div className="relative w-full sm:w-72">
//             <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
//             <Input
//               type="text"
//               placeholder="Search projects..."
//               value={searchQuery}
//               onChange={(e) => {
//                 setSearchQuery(e.target.value);
//                 setCurrentPage(1);
//               }}
//               className="pl-10 h-12 bg-white border-2 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
//             />
//           </div>
//           <div className="flex gap-3">
//             <Select
//               value={sortField}
//               onValueChange={(v: any) => handleSortChange(v)}
//             >
//               <SelectTrigger className="h-12 w-full sm:w-48 bg-white border-2 border-black rounded-md font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
//                 <SelectValue placeholder="Sort by" />
//               </SelectTrigger>
//               <SelectContent className="bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
//                 <SelectItem value="creation">Latest</SelectItem>
//                 <SelectItem value="name">Project Number</SelectItem>
//                 <SelectItem value="project_title">Project Title</SelectItem>
//                 <SelectItem value="workflow_state">Status</SelectItem>
//               </SelectContent>
//             </Select>
//             <Select
//               value={String(itemsPerPage)}
//               onValueChange={(v) => {
//                 setItemsPerPage(Number(v));
//                 setCurrentPage(1);
//               }}
//             >
//               <SelectTrigger className="h-12 w-full sm:w-32 bg-white border-2 border-black rounded-md font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
//                 <SelectValue placeholder="Show" />
//               </SelectTrigger>
//               <SelectContent className="bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
//                 {[5, 10, 20, 50].map((n) => (
//                   <SelectItem key={n} value={String(n)}>
//                     Show {n}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
//         </div>
//       </NeoCard>
//       <NeoCard className="overflow-hidden p-0">
//         <div className="overflow-x-auto">
//           <Table className="divide-y-2 divide-black">
//             <TableHeader>
//               <TableRow className="divide-x-2 divide-black bg-[#90A4AE]">
//                 {(["Project Number", "Project Title", "Status"] as const).map(
//                   (field) => {
//                     const fieldKey =
//                       field === "Project Number"
//                         ? "name"
//                         : field === "Project Title"
//                         ? "project_title"
//                         : "workflow_state";
//                     return (
//                       <TableHead
//                         key={field}
//                         className="p-3 font-bold text-black uppercase tracking-wider cursor-pointer hover:bg-[#90A4AE]"
//                         onClick={() => handleSortChange(fieldKey)}
//                       >
//                         {field} {getSortIcon(fieldKey)}
//                       </TableHead>
//                     );
//                   }
//                 )}
//                 <TableHead className="p-3 font-bold text-black uppercase tracking-wider text-right">
//                   Action
//                 </TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody className="divide-y-2 divide-black bg-white">
//               {myProjectsLoading && (
//                 <TableRow>
//                   <TableCell colSpan={4} className="h-32 text-center font-bold">
//                     LOADING...
//                   </TableCell>
//                 </TableRow>
//               )}
//               {myProjectsError && (
//                 <TableRow>
//                   <TableCell
//                     colSpan={4}
//                     className="h-32 text-center font-bold text-red-600"
//                   >
//                     ERROR LOADING PROJECTS
//                   </TableCell>
//                 </TableRow>
//               )}
//               {!myProjectsLoading &&
//                 !myProjectsError &&
//                 paginatedProjects.length > 0
//                 ? paginatedProjects.map((p) => (
//                   <React.Fragment key={p.name}>
//                     <TableRow
//                       onClick={() =>
//                         setOpenPipeline(
//                           openPipeline === p.name ? null : p.name
//                         )
//                       }
//                       className="bg-[#F5F5F5] divide-x-2 divide-black cursor-pointer hover:bg-[#E0E0E0]"
//                     >
//                       <TableCell className="p-4 font-mono font-bold">
//                         {p.name.length > 40 ? `${p.name.substring(0, 40)}...` : p.name}
//                       </TableCell>
//                       <TableCell className="p-4">{p.project_title.length > 25 ? `${p.project_title.substring(0, 25)}...` : p.project_title}</TableCell>
//                       <TableCell className="p-4">
//                         <span className={getStatusBadge(p.workflow_state)}>
//                           {p.workflow_state}
//                         </span>
//                       </TableCell>
//                       <TableCell className="p-4 text-right">
//                         <NeoButton
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             const targetPath =
//                               p.workflow_state === "Approved"
//                                 ? `/project-details-overview/${p.name}`
//                                 : `/project-details/${p.name}`;
//                             navigate(targetPath);
//                           }}
//                           className="text-sm"
//                         >
//                           View Details
//                         </NeoButton>
//                       </TableCell>
//                     </TableRow>
//                     {openPipeline === p.name && (
//                       <TableRow>
//                         <TableCell
//                           colSpan={4}
//                           className="p-6 bg-sky-100 border-t-2 border-black"
//                         >
//                            {/* <WorkflowTimeline doctype="Project Registration" docname={p.name} /> */}
//                         </TableCell>
//                       </TableRow>
//                     )}
//                   </React.Fragment>
//                 ))
//                 : !myProjectsError &&
//                 !myProjectsLoading && (
//                   <TableRow>
//                     <TableCell colSpan={4} className="h-48 text-center">
//                       <FileSearchIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//                       <h3 className="text-2xl font-bold text-black">
//                         NO PROJECTS FOUND
//                       </h3>
//                       <p className="text-gray-700 font-mono mt-2">
//                         Try adjusting your search.
//                       </p>
//                     </TableCell>
//                   </TableRow>
//                 )}
//             </TableBody>
//           </Table>
//         </div>
//       </NeoCard>
//       {totalPages > 1 && (
//         <div className="flex items-center justify-between gap-4 py-4">
//           <div className="text-sm font-bold text-black">
//             PAGE {currentPage} OF {totalPages}
//           </div>
//           <div className="flex items-center gap-2">
//             <NeoButton
//               onClick={() => setCurrentPage((p) => p - 1)}
//               disabled={currentPage === 1}
//             >
//               <ChevronLeftIcon className="h-4 w-4" />
//             </NeoButton>
//             <NeoButton
//               onClick={() => setCurrentPage((p) => p + 1)}
//               disabled={currentPage === totalPages}
//             >
//               <ChevronRight className="h-4 w-4" />
//             </NeoButton>
//           </div>
//         </div>
//       )}
//     </div>
//   );

//   return (
//     <div className=" bg-[#FDFCEC]">
//       <AppSidebar isPermanentEmployee={isPermanentEmployee} />
//       <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//         <div className="border-2 border-black rounded-md">
//           <div className="border-b-2 border-black flex">
//             {[
//               { id: "myProjects", label: "All Projects" },
//               { id: "pending", label: "Under Review" },
//             ].map((tab) => (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id)}
//                 className={cn(
//                   "flex-1 py-4 px-4 font-bold text-black text-center transition-all border-r-2 border-black last:border-r-0",
//                   activeTab === tab.id
//                     ? "bg-[#90A4AE]"
//                     : "bg-white hover:bg-cyan-100"
//                 )}
//               >
//                 {tab.label}
//               </button>
//             ))}
//           </div>
//           <div className="p-6 bg-[#F5F5F5]">
//             {activeTab === "pending"
//               ? renderPendingTasks()
//               : renderProjectsTable()}
//           </div>
//         </div>
//       </main>
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
import { useEffect } from 'react';
import { useUserRoles } from '../components/UserRole';

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

// --- DESIGN: Refined Neo-Brutalism Components ---
const NeoButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "px-4 py-2 bg-white border-2 border-gray-900 rounded-lg font-semibold text-gray-900 shadow-[1px_1px_0px_rgba(0,0,0,0.1)] transition-all",
      "hover:shadow-[2px_2px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-1px]",
      "active:shadow-none active:translate-y-[0px]",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-stone-100",
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
      "bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.1)]",
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
  const [activeTaskTab, setActiveTaskTab] = React.useState(
    Object.keys(pendingTasksData)[0]
  );

  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["*"],
    enabled: !!currentUser,
  });
  const { roles: fetchedRoles, isLoading: isRolesLoading, error: rolesError } = useUserRoles(currentUser ?? null);

  const { isAdministrator, isPermanentEmployee } = React.useMemo(() => {
    const roles = fetchedRoles?.length > 0 ? fetchedRoles : userData?.roles?.map((r: any) => r.role) ?? [];
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
    filters: currentUser ? [["pi_webmail", "=", currentUser]] : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const {
    data: myApprovalProjects,
    isLoading: approvalLoading,
    error: approvalError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: currentUser ? [["head_approver", "=", currentUser]] : [["name", "=", "NON_EXISTENT_DOC"]],
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
    filters: isHosRnd ? [["workflow_state", "=", "Pending HoS Approval"]] : [["name", "=", "NON_EXISTENT_DOC"]],
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
    filters: isRndStaff ? [["workflow_state", "=", "Pending Staff Approval"]] : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const { myProjects, isLoading: myProjectsLoading, error: myProjectsError } = React.useMemo(() => {
    if (isHosRnd) {
      return { myProjects: hosAprovalProjects, isLoading: hosLoading, error: hosError };
    }
    if (isRndStaff) {
      return { myProjects: rndstaffAprovalProjects, isLoading: rndstaffLoading, error: rndstaffError };
    }
    if (isAdministrator) {
      return { myProjects: allProjectsForAdmin, isLoading: adminLoading, error: adminError };
    }
    if (isDoRnd) {
      return { myProjects: doRndApprovalProjects, isLoading: doRndLoading, error: doRndError };
    }

    const combined = [...(myCreatedProjects ?? []), ...(myApprovalProjects ?? [])];
    const uniqueProjectsMap = new Map<string, Project>();
    combined.forEach(project => {
      uniqueProjectsMap.set(project.name, project);
    });
    
    const uniqueProjects = Array.from(uniqueProjectsMap.values());

    return {
      myProjects: uniqueProjects,
      isLoading: createdLoading || approvalLoading,
      error: createdError || approvalError,
    };
  }, [
    isAdministrator,
    allProjectsForAdmin, adminLoading, adminError,
    myCreatedProjects, createdLoading, createdError,
    myApprovalProjects, approvalLoading, approvalError,
    isHosRnd, hosAprovalProjects, hosLoading, hosError,
    isRndStaff, rndstaffAprovalProjects, rndstaffLoading, rndstaffError
  ]);

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

  // --- DESIGN: Badge Color Logic ---
  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      Low: "bg-emerald-100 text-emerald-800",
      Medium: "bg-amber-100 text-amber-800",
      High: "bg-orange-100 text-orange-800",
      Urgent: "bg-red-100 text-red-800",
    };
    return cn(
      "inline-block px-2.5 py-1 rounded-md text-xs font-semibold border border-gray-300",
      styles[priority] || "bg-slate-100 text-slate-800"
    );
  };
  
  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    let style = "bg-blue-100 text-blue-800";
    if (
      [
        "pending",
        "under review",
        "approval pending",
        "under negotiation",
        "interview stage",
      ].some((t) => s?.includes(t))
    )
      style = "bg-amber-100 text-amber-800";
    else if (s?.includes("approved")) style = "bg-emerald-100 text-emerald-800";
    else if (s?.includes("draft")) style = "bg-slate-100 text-slate-800";
    else if (s?.includes("rejected")) style = "bg-red-100 text-red-800";
    return cn(
      "inline-block px-2.5 py-1 rounded-md text-xs font-semibold border border-gray-300",
      style
    );
  };

  // --- Render Functions ---
  const renderPendingTasks = () => {
    const totalTasks = Object.values(pendingTasksData).flat().length;
    const taskCategories = Object.keys(pendingTasksData);
    const activeTasks = pendingTasksData[activeTaskTab] || [];

    if (totalTasks === 0) {
      return (
        <NeoCard className="text-center py-12">
          <CheckCircleIcon className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900">NO PENDING TASKS</h3>
          <p className="text-gray-600 text-sm mt-2">All clear. Great job!</p>
        </NeoCard>
      );
    }

    return (
      <div className="space-y-6">
        <NeoCard className="p-4">
          <h3 className="text-lg font-bold text-gray-900">
            Applications Under Review ({totalTasks})
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {taskCategories.length} categories
          </p>
        </NeoCard>

        <NeoCard className="overflow-hidden p-0">
          <div className="border-b-2 border-gray-900 flex flex-wrap">
            {taskCategories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveTaskTab(category)}
                className={cn(
                  "flex-grow p-3 font-semibold text-gray-900 text-center transition-all border-r-2 border-gray-300 last:border-r-0 text-sm",
                  activeTab === category
                    ? "bg-slate-600 text-white border-r-gray-900"
                    : "bg-white hover:bg-stone-50"
                )}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="p-4 bg-stone-50">
            <div className="overflow-x-auto">
              <Table className="divide-y divide-gray-200">
                <TableHeader>
                  <TableRow className="divide-x divide-gray-200 bg-slate-100">
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
                        className="p-3 font-semibold text-gray-900 text-sm"
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200 bg-white">
                  {activeTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className="divide-x divide-gray-200 hover:bg-stone-50 transition-colors"
                    >
                      <TableCell className="p-3 font-mono text-sm">{task.id}</TableCell>
                      <TableCell className="p-3 font-medium text-sm">
                        {task.projectTitle}
                        <br />
                        <span className="font-mono text-gray-500 text-xs">
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
                      <TableCell className="p-3 font-mono text-sm">
                        {task.assignedTo}
                      </TableCell>
                      <TableCell className="p-3 font-mono text-sm">
                        {new Date(task.actionDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="p-3 text-right">
                        <NeoButton className="text-xs">
                          View
                        </NeoButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </NeoCard>
      </div>
    );
  };

  const renderProjectsTable = () => (
    <div className="space-y-6 bg-stone-50">
      <NeoCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 h-10 bg-white border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-600 font-mono text-sm shadow-[1px_1px_0px_rgba(0,0,0,0.1)]"
            />
          </div>
          <div className="flex gap-3">
            <Select
              value={sortField}
              onValueChange={(v: any) => handleSortChange(v)}
            >
              <SelectTrigger className="h-10 w-full sm:w-48 bg-white border-2 border-gray-900 rounded-lg font-semibold text-sm shadow-[1px_1px_0px_rgba(0,0,0,0.1)]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
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
              <SelectTrigger className="h-10 w-full sm:w-32 bg-white border-2 border-gray-900 rounded-lg font-semibold text-sm shadow-[1px_1px_0px_rgba(0,0,0,0.1)]">
                <SelectValue placeholder="Show" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
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
          <Table className="divide-y divide-gray-200">
            <TableHeader>
              <TableRow className="divide-x divide-gray-200 bg-slate-100">
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
                        className="p-3 font-semibold text-gray-900 text-sm cursor-pointer hover:bg-slate-200 transition-colors"
                        onClick={() => handleSortChange(fieldKey)}
                      >
                        {field} {getSortIcon(fieldKey)}
                      </TableHead>
                    );
                  }
                )}
                <TableHead className="p-3 font-semibold text-gray-900 text-sm text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200 bg-white">
              {myProjectsLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center font-semibold text-gray-900">
                    LOADING...
                  </TableCell>
                </TableRow>
              )}
              {myProjectsError && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center font-semibold text-red-600"
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
                      className="bg-stone-50 divide-x divide-gray-200 cursor-pointer hover:bg-stone-100 transition-colors"
                    >
                      <TableCell className="p-4 font-mono font-semibold text-sm">
                        {p.name.length > 40 ? `${p.name.substring(0, 40)}...` : p.name}
                      </TableCell>
                      <TableCell className="p-4 text-sm">{p.project_title.length > 25 ? `${p.project_title.substring(0, 25)}...` : p.project_title}</TableCell>
                      <TableCell className="p-4">
                        <span className={getStatusBadge(p.workflow_state)}>
                          {p.workflow_state}
                        </span>
                      </TableCell>
                      <TableCell className="p-4 text-right">
                        <NeoButton
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetPath =
                              p.workflow_state === "Approved"
                                ? `/project-details-overview/${p.name}`
                                : `/project-details/${p.name}`;
                            navigate(targetPath);
                          }}
                          className="text-xs"
                        >
                          View Details
                        </NeoButton>
                      </TableCell>
                    </TableRow>
                    {openPipeline === p.name && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="p-6 bg-blue-50 border-t-2 border-gray-900"
                        >
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
                      <h3 className="text-2xl font-bold text-gray-900">
                        NO PROJECTS FOUND
                      </h3>
                      <p className="text-gray-600 text-sm mt-2">
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
          <div className="text-sm font-semibold text-gray-900">
            PAGE {currentPage} OF {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <NeoButton
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
              className="px-3"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </NeoButton>
            <NeoButton
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages}
              className="px-3"
            >
              <ChevronRight className="h-4 w-4" />
            </NeoButton>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-stone-50 min-h-screen">
      <AppSidebar isPermanentEmployee={isPermanentEmployee} />
      <main className="flex-1 p-4 md:p-8 w-full overflow-auto">
        <NeoCard className="overflow-hidden">
          <div className="border-b-2 border-gray-900 flex">
            {[
              { id: "myProjects", label: "All Projects" },
              { id: "pending", label: "Under Review" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-4 px-4 font-semibold text-gray-900 text-center transition-all border-r-2 border-gray-300 last:border-r-0",
                  activeTab === tab.id
                    ? "bg-slate-600 text-white"
                    : "bg-white hover:bg-stone-50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-6 bg-white">
            {activeTab === "pending"
              ? renderPendingTasks()
              : renderProjectsTable()}
          </div>
        </NeoCard>
      </main>
    </div>
  );
}

export default ProjectsView;