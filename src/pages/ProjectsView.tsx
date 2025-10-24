// import * as React from "react";
// import { useFrappeGetDocList } from "frappe-react-sdk";
// import { Button } from "@/components/ui/button";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { useNavigate } from "react-router-dom"; // Import useNavigate
// import { AppSidebar } from "../components/RndSidebar";
// import { useSidebar } from "@/components/ui/sidebar"; // Import useSidebar
// import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk"; // Import useFrappeAuth and useFrappeGetDoc
// import { useUserRoles } from "../components/UserRole"; // Import useUserRoles
// import { WorkflowTimeline, type IWorkflowStage } from "../components/WorkflowTimeline"; // Import WorkflowTimeline and IWorkflowStage as type
// import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"; // Import icons for dropdown

// // ✅ Interfaces
// interface Task {
//   projectNumber: string;
//   projectTitle: string;
//   status?: string; // Optional: only used in pending tasks
//   actionDate: string;
// }

// interface Project {
//   name: string;
//   project_title: string;
//   workflow_state: string;
// }

// interface ProjectsViewProps {
//   setActiveView?: (view: string) => void; // Made optional
//   setSelectedProject?: (projectName: string | null) => void; // Made optional
//   initialTab?: string;
// }

// // ✅ Strongly typed mock data (can be replaced with real data fetching)
// const pendingTasks: Task[] = [];
// const applicationsUnderReview: Task[] = [];

// export function ProjectsView({ setActiveView, setSelectedProject, initialTab }: ProjectsViewProps) {
//   const { state: sidebarState } = useSidebar();
//   const [activeTab, setActiveTab] = React.useState(initialTab || "pending");
//   const [openPipeline, setOpenPipeline] = React.useState<string | null>(null); // State to manage open pipeline
//   const navigate = useNavigate(); // Initialize useNavigate

//   const { currentUser } = useFrappeAuth();
//   const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
//     fields: ["roles"],
//     enabled: !!currentUser,
//   });

//   let isPermanentEmployee = false;
//   if (userData) {
//     if (Array.isArray(userData.roles) && userData.roles.length > 0) {
//       if (typeof userData.roles[0] === 'string') {
//         isPermanentEmployee = userData.roles.includes("Permanent Employee");
//       } else if (typeof userData.roles[0] === 'object' && userData.roles[0] !== null && 'role' in userData.roles[0]) {
//         isPermanentEmployee = userData.roles.some((role: any) => role.role === "Permanent Employee");
//       }
//     }
//   }

//   React.useEffect(() => {
//     if (initialTab) {
//       setActiveTab(initialTab);
//     }
//   }, [initialTab]);

//   const {
//     data: myProjects,
//     isLoading: myProjectsLoading,
//     error: myProjectsError,
//   } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["name", "project_title", "workflow_state"],
//     limit: 100,
//   });

//   const renderContent = () => {
//     switch (activeTab) {
//       case "pending":
//         return (
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Project Number</TableHead>
//                 <TableHead>Project Title</TableHead>
//                 <TableHead>Application Status</TableHead>
//                 <TableHead>Date</TableHead>
//                 <TableHead className="text-right">Action</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {pendingTasks.length > 0 ? (
//                 pendingTasks.map((task: Task) => (
//                   <TableRow key={task.projectNumber}>
//                     <TableCell className="font-medium">{task.projectNumber}</TableCell>
//                     <TableCell>{task.projectTitle}</TableCell>
//                     <TableCell>
//                       <span
//                         className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
//                           task.status === "Under Review"
//                             ? "bg-yellow-100 text-yellow-800"
//                             : "bg-green-100 text-green-800"
//                         }`}
//                       >
//                         {task.status}
//                       </span>
//                     </TableCell>
//                     <TableCell>{task.actionDate}</TableCell>
//                     <TableCell className="text-right">
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => {
//                           navigate(`/project-details/${task.projectNumber}`);
//                         }}
//                       >
//                         View
//                       </Button>
//                     </TableCell>
//                   </TableRow>
//                 ))
//               ) : (
//                 <TableRow>
//                   <TableCell colSpan={5} className="h-24 text-center">
//                     No pending tasks.
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         );

//       case "myProjects":
//         return (
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Project Number</TableHead>
//                 <TableHead>Project Title</TableHead>
//                 <TableHead>Status</TableHead>
//                 <TableHead className="text-right">Action</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {myProjectsLoading && (
//                 <TableRow>
//                   <TableCell colSpan={4} className="h-24 text-center">
//                     Loading projects...
//                   </TableCell>
//                 </TableRow>
//               )}
//               {myProjectsError && (
//                 <TableRow>
//                   <TableCell colSpan={4} className="h-24 text-center text-red-500">
//                     Error loading projects.
//                   </TableCell>
//                 </TableRow>
//               )}
//               {!myProjectsError && myProjects && myProjects.length > 0 ? (
//                 myProjects.map((project: Project) => (
//                   <React.Fragment key={project.name}>
//                     <TableRow
//                       onClick={() => setOpenPipeline(openPipeline === project.name ? null : project.name)}
//                       className="cursor-pointer hover:bg-gray-50"
//                     >
//                       <TableCell className="font-medium">{project.name}</TableCell>
//                       <TableCell>{project.project_title}</TableCell>
//                       <TableCell>{project.workflow_state}</TableCell>
//                       <TableCell className="text-right">
//                         <Button
//                           variant="outline"
//                           size="sm"
//                           onClick={(e) => {
//                             e.stopPropagation(); // Prevent row click from triggering
//                             navigate(`/project-details/${project.name}`);
//                           }}
//                         >
//                           View
//                         </Button>
//                         {openPipeline === project.name ? (
//                           <ChevronDownIcon className="ml-2 h-4 w-4 inline-block" />
//                         ) : (
//                           <ChevronRightIcon className="ml-2 h-4 w-4 inline-block" />
//                         )}
//                       </TableCell>
//                     </TableRow>
//                     {openPipeline === project.name && (
//                       <TableRow>
//                         <TableCell colSpan={4}>
//                           <div className="p-4 bg-gray-50 rounded-md">
//                             <h5 className="font-semibold mb-2">Workflow Pipeline for {project.project_title}</h5>
//                             <WorkflowTimeline
//                               stages={[
//                                 { id: 1, title: 'Draft', status: 'completed', description: 'Project created' },
//                                 { id: 2, title: 'Submitted', status: 'in-progress', description: 'Awaiting review' },
//                                 { id: 3, title: 'Approved', status: 'pending', description: 'Ready for execution' },
//                                 { id: 4, title: 'Completed', status: 'pending', description: 'Project finished' },
//                               ]}
//                             />
//                           </div>
//                         </TableCell>
//                       </TableRow>
//                     )}
//                   </React.Fragment>
//                 ))
//               ) : (
//                 !myProjectsError && (
//                   <TableRow>
//                     <TableCell colSpan={4} className="h-24 text-center">
//                       No projects found.
//                     </TableCell>
//                   </TableRow>
//                 )
//               )}
//             </TableBody>
//           </Table>
//         );

//       case "underReview":
//         return (
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Project Number</TableHead>
//                 <TableHead>Project Title</TableHead>
//                 <TableHead>Date</TableHead>
//                 <TableHead className="text-right">Action</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {applicationsUnderReview.length > 0 ? (
//                 applicationsUnderReview.map((task: Task) => (
//                   <TableRow key={task.projectNumber}>
//                     <TableCell className="font-medium">{task.projectNumber}</TableCell>
//                     <TableCell>{task.projectTitle}</TableCell>
//                     <TableCell>{task.actionDate}</TableCell>
//                     <TableCell className="text-right">
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => {
//                           navigate(`/project-details/${task.projectNumber}`);
//                         }}
//                       >
//                         View
//                       </Button>
//                     </TableCell>
//                   </TableRow>
//                 ))
//               ) : (
//                 <TableRow>
//                   <TableCell colSpan={4} className="h-24 text-center">
//                     No applications under review.
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         );

//       default:
//         return null;
//     }
//   };

//   return (
//     <div>
//       <AppSidebar isPermanentEmployee={isPermanentEmployee} />
//       <div className={`flex-1 ${sidebarState === 'collapsed' ? 'p-4 md:p-6' : ''}`}>
//         <div className="border-b border-gray-200">
//           <nav className="-mb-px flex space-x-8" aria-label="Tabs">
//             <button
//               onClick={() => setActiveTab("pending")}
//               className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
//                 activeTab === "pending"
//                   ? "border-indigo-500 text-indigo-600"
//                   : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
//               }`}
//             >
//               Pending Tasks
//             </button>
//             <button
//               onClick={() => setActiveTab("myProjects")}
//               className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
//                 activeTab === "myProjects"
//                   ? "border-indigo-500 text-indigo-600"
//                   : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
//               }`}
//             >
//               Project Registered
//             </button>
//             <button
//               onClick={() => setActiveTab("underReview")}
//               className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
//                 activeTab === "underReview"
//                   ? "border-indigo-500 text-indigo-600"
//                   : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
//               }`}
//             >
//               Application Under Review
//             </button>
//           </nav>
//         </div>

//         <div className="mt-6">
//           <div className="rounded-lg border bg-white shadow-sm">
//             {renderContent()}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default ProjectsView;




// -=-=-=-=-=-=-=-=-=-=-=-====-=-=-=-=- working 


// import * as React from "react";
// import { useFrappeGetDocList } from "frappe-react-sdk";
// import { Button } from "@/components/ui/button";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { useNavigate } from "react-router-dom";
// import { AppSidebar } from "../components/RndSidebar";
// import { useSidebar } from "@/components/ui/sidebar";
// import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
// import { useUserRoles } from "../components/UserRole";
// import { WorkflowTimeline, type IWorkflowStage } from "../components/WorkflowTimeline";
// import { 
//   ChevronDownIcon, 
//   ChevronRightIcon, 
//   ClockIcon,
//   FolderOpenIcon,
//   FileSearchIcon,
//   AlertCircleIcon,
//   CheckCircleIcon,
//   MoreHorizontalIcon
// } from "lucide-react";
// import { cn } from "@/lib/utils";

// // ✅ Interfaces (unchanged)
// interface Task {
//   projectNumber: string;
//   projectTitle: string;
//   status?: string;
//   actionDate: string;
// }

// interface Project {
//   name: string;
//   project_title: string;
//   workflow_state: string;
//   pi_webmail: string; // Added pi_webmail for filtering
// }

// interface ProjectsViewProps {
//   setActiveView?: (view: string) => void;
//   setSelectedProject?: (projectName: string | null) => void;
//   initialTab?: string;
// }

// // ✅ Strongly typed mock data (unchanged)
// const pendingTasks: Task[] = [];
// const applicationsUnderReview: Task[] = [];

// export function ProjectsView({ setActiveView, setSelectedProject, initialTab }: ProjectsViewProps) {
//   const { state: sidebarState } = useSidebar();
//   const [activeTab, setActiveTab] = React.useState(initialTab || "pending");
//   const [openPipeline, setOpenPipeline] = React.useState<string | null>(null);
//   const navigate = useNavigate();

//   const { currentUser } = useFrappeAuth();
//   const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
//     fields: ["roles"],
//     enabled: !!currentUser,
//   });

//   let isPermanentEmployee = false;
//   let isAdministrator = false;
//   if (userData) {
//     if (Array.isArray(userData.roles) && userData.roles.length > 0) {
//       if (typeof userData.roles[0] === 'string') {
//         isPermanentEmployee = userData.roles.includes("Permanent Employee");
//         isAdministrator = userData.roles.includes("Administrator");
//       } else if (typeof userData.roles[0] === 'object' && userData.roles[0] !== null && 'role' in userData.roles[0]) {
//         isPermanentEmployee = userData.roles.some((role: any) => role.role === "Permanent Employee");
//         isAdministrator = userData.roles.some((role: any) => role.role === "Administrator");
//       }
//     }
//   }

//   React.useEffect(() => {
//     if (initialTab) {
//       setActiveTab(initialTab);
//     }
//   }, [initialTab]);

//   const projectFilters = React.useMemo(() => {
//     if (isAdministrator) {
//       return []; // Administrator sees all projects
//     } else if (currentUser) {
//       return [["pi_webmail", "=", currentUser as string]]; // Other users see only their projects
//     }
//     return [["name", "=", ""]]; // No projects if no user and not admin
//   }, [isAdministrator, currentUser]);

//   const {
//     data: myProjects,
//     isLoading: myProjectsLoading,
//     error: myProjectsError,
//   } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["name", "project_title", "workflow_state", "pi_webmail"], // Added pi_webmail to fields
//     filters: projectFilters,
//     limit: 100,
//     enabled: !!currentUser, // Only fetch if currentUser is available
//   });

//   const getStatusBadge = (status: string) => {
//     const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
//     switch (status?.toLowerCase()) {
//       case "under review":
//         return cn(baseClasses, "bg-yellow-100 text-yellow-800 border border-yellow-200");
//       case "approved":
//         return cn(baseClasses, "bg-green-100 text-green-800 border border-green-200");
//       case "draft":
//         return cn(baseClasses, "bg-gray-100 text-gray-800 border border-gray-200");
//       case "rejected":
//         return cn(baseClasses, "bg-red-100 text-red-800 border border-red-200");
//       default:
//         return cn(baseClasses, "bg-blue-100 text-blue-800 border border-blue-200");
//     }
//   };

//   const getWorkflowState = (state: string) => {
//     const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    
//     switch (state?.toLowerCase()) {
//       case "draft":
//         return cn(baseClasses, "bg-gray-100 text-gray-800");
//       case "submitted":
//         return cn(baseClasses, "bg-blue-100 text-blue-800");
//       case "under review":
//         return cn(baseClasses, "bg-yellow-100 text-yellow-800");
//       case "approved":
//         return cn(baseClasses, "bg-green-100 text-green-800");
//       case "completed":
//         return cn(baseClasses, "bg-purple-100 text-purple-800");
//       default:
//         return cn(baseClasses, "bg-gray-100 text-gray-800");
//     }
//   };

//   const renderContent = () => {
//     switch (activeTab) {
//       case "pending":
//         return (
//           <div className="overflow-hidden">
//             <Table>
//               <TableHeader className="bg-gray-50/80">
//                 <TableRow>
//                   <TableHead className="font-semibold text-gray-700">Project Number</TableHead>
//                   <TableHead className="font-semibold text-gray-700">Project Title</TableHead>
//                   <TableHead className="font-semibold text-gray-700">Application Status</TableHead>
//                   <TableHead className="font-semibold text-gray-700">Date</TableHead>
//                   <TableHead className="text-right font-semibold text-gray-700">Action</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {pendingTasks.length > 0 ? (
//                   pendingTasks.map((task: Task) => (
//                     <TableRow key={task.projectNumber} className="group hover:bg-blue-50/50 transition-colors">
//                       <TableCell className="font-medium text-gray-900">
//                         <div className="flex items-center gap-2">
//                           <FolderOpenIcon className="h-4 w-4 text-gray-400" />
//                           {task.projectNumber}
//                         </div>
//                       </TableCell>
//                       <TableCell className="text-gray-700">{task.projectTitle}</TableCell>
//                       <TableCell>
//                         <span className={getStatusBadge(task.status || "")}>
//                           {task.status === "Under Review" && <ClockIcon className="w-3 h-3 mr-1" />}
//                           {task.status}
//                         </span>
//                       </TableCell>
//                       <TableCell className="text-gray-600">{task.actionDate}</TableCell>
//                       <TableCell className="text-right">
//                         <Button
//                           variant="outline"
//                           size="sm"
//                           className="bg-white hover:bg-blue-50 border-gray-300 hover:border-blue-300 transition-colors"
//                           onClick={() => {
//                             navigate(`/project-details/${task.projectNumber}`);
//                           }}
//                         >
//                           View Details
//                         </Button>
//                       </TableCell>
//                     </TableRow>
//                   ))
//                 ) : (
//                   <TableRow>
//                     <TableCell colSpan={5} className="h-32 text-center">
//                       <div className="flex flex-col items-center justify-center text-gray-500">
//                         <CheckCircleIcon className="h-12 w-12 text-green-400 mb-2" />
//                         <p className="text-lg font-medium">No Pending Tasks</p>
//                         <p className="text-sm">All tasks are up to date</p>
//                       </div>
//                     </TableCell>
//                   </TableRow>
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         );

//       case "myProjects":
//         return (
//           <div className="overflow-hidden">
//             <Table>
//               <TableHeader className="bg-gray-50/80">
//                 <TableRow>
//                   <TableHead className="font-semibold text-gray-700">Project Number</TableHead>
//                   <TableHead className="font-semibold text-gray-700">Project Title</TableHead>
//                   <TableHead className="font-semibold text-gray-700">Status</TableHead>
//                   <TableHead className="text-right font-semibold text-gray-700">Action</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {myProjectsLoading && (
//                   <TableRow>
//                     <TableCell colSpan={4} className="h-24 text-center">
//                       <div className="flex items-center justify-center">
//                         <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
//                         <span className="ml-2 text-gray-600">Loading projects...</span>
//                       </div>
//                     </TableCell>
//                   </TableRow>
//                 )}
//                 {myProjectsError && (
//                   <TableRow>
//                     <TableCell colSpan={4} className="h-24 text-center">
//                       <div className="flex flex-col items-center justify-center text-red-500">
//                         <AlertCircleIcon className="h-8 w-8 mb-2" />
//                         <p>Error loading projects</p>
//                       </div>
//                     </TableCell>
//                   </TableRow>
//                 )}
//                 {!myProjectsError && myProjects && myProjects.length > 0 ? (
//                   myProjects.map((project: Project) => (
//                     <React.Fragment key={project.name}>
//                       <TableRow
//                         onClick={() => setOpenPipeline(openPipeline === project.name ? null : project.name)}
//                         className="group cursor-pointer hover:bg-blue-50/50 transition-colors"
//                       >
//                         <TableCell className="font-medium text-gray-900">
//                           <div className="flex items-center gap-2">
//                             <FolderOpenIcon className="h-4 w-4 text-gray-400" />
//                             {project.name}
//                           </div>
//                         </TableCell>
//                         <TableCell className="text-gray-700">{project.project_title}</TableCell>
//                         <TableCell>
//                           <span className={getWorkflowState(project.workflow_state)}>
//                             {project.workflow_state}
//                           </span>
//                         </TableCell>
//                         <TableCell className="text-right">
//                           <div className="flex items-center justify-end gap-2">
//                             <Button
//                               variant="outline"
//                               size="sm"
//                               className="bg-white hover:bg-blue-50 border-gray-300 hover:border-blue-300 transition-colors"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 navigate(`/project-details/${project.name}`);
//                               }}
//                             >
//                               View
//                             </Button>
//                             {openPipeline === project.name ? (
//                               <ChevronDownIcon className="h-4 w-4 text-gray-500 transition-transform" />
//                             ) : (
//                               <ChevronRightIcon className="h-4 w-4 text-gray-500 transition-transform" />
//                             )}
//                           </div>
//                         </TableCell>
//                       </TableRow>
//                       {openPipeline === project.name && (
//                         <TableRow>
//                           <TableCell colSpan={4} className="p-0">
//                             <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200">
//                               <div className="max-w-4xl mx-auto">
//                                 <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
//                                   <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
//                                   Workflow Pipeline for {project.project_title}
//                                 </h5>
//                                 <WorkflowTimeline
//                                   stages={[
//                                     { id: 1, title: 'Draft', status: 'completed', description: 'Project created' },
//                                     { id: 2, title: 'Submitted', status: 'in-progress', description: 'Awaiting review' },
//                                     { id: 3, title: 'Approved', status: 'pending', description: 'Ready for execution' },
//                                     { id: 4, title: 'Completed', status: 'pending', description: 'Project finished' },
//                                   ]}
//                                 />
//                               </div>
//                             </div>
//                           </TableCell>
//                         </TableRow>
//                       )}
//                     </React.Fragment>
//                   ))
//                 ) : (
//                   !myProjectsError && (
//                     <TableRow>
//                       <TableCell colSpan={4} className="h-32 text-center">
//                         <div className="flex flex-col items-center justify-center text-gray-500">
//                           <FolderOpenIcon className="h-12 w-12 text-gray-400 mb-2" />
//                           <p className="text-lg font-medium">No Projects Found</p>
//                           <p className="text-sm">Get started by creating your first project</p>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   )
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         );

//       case "underReview":
//         return (
//           <div className="overflow-hidden">
//             <Table>
//               <TableHeader className="bg-gray-50/80">
//                 <TableRow>
//                   <TableHead className="font-semibold text-gray-700">Project Number</TableHead>
//                   <TableHead className="font-semibold text-gray-700">Project Title</TableHead>
//                   <TableHead className="font-semibold text-gray-700">Date</TableHead>
//                   <TableHead className="text-right font-semibold text-gray-700">Action</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {applicationsUnderReview.length > 0 ? (
//                   applicationsUnderReview.map((task: Task) => (
//                     <TableRow key={task.projectNumber} className="group hover:bg-blue-50/50 transition-colors">
//                       <TableCell className="font-medium text-gray-900">
//                         <div className="flex items-center gap-2">
//                           <FileSearchIcon className="h-4 w-4 text-gray-400" />
//                           {task.projectNumber}
//                         </div>
//                       </TableCell>
//                       <TableCell className="text-gray-700">{task.projectTitle}</TableCell>
//                       <TableCell className="text-gray-600">{task.actionDate}</TableCell>
//                       <TableCell className="text-right">
//                         <Button
//                           variant="outline"
//                           size="sm"
//                           className="bg-white hover:bg-blue-50 border-gray-300 hover:border-blue-300 transition-colors"
//                           onClick={() => {
//                             navigate(`/project-details/${task.projectNumber}`);
//                           }}
//                         >
//                           View Details
//                         </Button>
//                       </TableCell>
//                     </TableRow>
//                   ))
//                 ) : (
//                   <TableRow>
//                     <TableCell colSpan={4} className="h-32 text-center">
//                       <div className="flex flex-col items-center justify-center text-gray-500">
//                         <FileSearchIcon className="h-12 w-12 text-gray-400 mb-2" />
//                         <p className="text-lg font-medium">No Applications Under Review</p>
//                         <p className="text-sm">All applications have been processed</p>
//                       </div>
//                     </TableCell>
//                   </TableRow>
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         );

//       default:
//         return null;
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
//       <AppSidebar isPermanentEmployee={isPermanentEmployee} />
//       <div className={cn(
//         "flex-1 transition-all duration-300"
//       )}>
//         {/* Header Section */}
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Management</h1>
//           <p className="text-gray-600">Manage and track all your projects in one place</p>
//         </div>

//         {/* Tab Navigation */}
//         <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
//           <div className="border-b border-gray-200">
//             <nav className="flex space-x-8 px-6" aria-label="Tabs">
//               {[
//                 { id: "pending", label: "Pending Tasks", icon: ClockIcon },
//                 { id: "myProjects", label: "Projects", icon: FolderOpenIcon },
//                 // { id: "underReview", label: "Application Under Review", icon: FileSearchIcon },
//               ].map((tab) => {
//                 const Icon = tab.icon;
//                 return (
//                   <button
//                     key={tab.id}
//                     onClick={() => setActiveTab(tab.id)}
//                     className={cn(
//                       "group flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200",
//                       activeTab === tab.id
//                         ? "border-blue-500 text-blue-600"
//                         : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
//                     )}
//                   >
//                     <Icon className={cn(
//                       "h-4 w-4 transition-colors",
//                       activeTab === tab.id ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
//                     )} />
//                     {tab.label}
//                   </button>
//                 );
//               })}
//             </nav>
//           </div>

//           {/* Content Area */}
//           <div className="p-1">
//             <div className="rounded-lg bg-white">
//               {renderContent()}
//             </div>
//           </div>
//         </div>

//         {/* Stats Summary */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Total Projects</p>
//                 <p className="text-2xl font-bold text-gray-900 mt-1">
//                   {myProjects?.length || 0}
//                 </p>
//               </div>
//               <div className="p-3 bg-blue-100 rounded-lg">
//                 <FolderOpenIcon className="h-6 w-6 text-blue-600" />
//               </div>
//             </div>
//           </div>
          
//           <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
//                 <p className="text-2xl font-bold text-gray-900 mt-1">
//                   {pendingTasks.length}
//                 </p>
//               </div>
//               <div className="p-3 bg-yellow-100 rounded-lg">
//                 <ClockIcon className="h-6 w-6 text-yellow-600" />
//               </div>
//             </div>
//           </div>
          
//           <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Under Review</p>
//                 <p className="text-2xl font-bold text-gray-900 mt-1">
//                   {applicationsUnderReview.length}
//                 </p>
//               </div>
//               <div className="p-3 bg-green-100 rounded-lg">
//                 <FileSearchIcon className="h-6 w-6 text-green-600" />
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default ProjectsView;


// =-=-=-=-=-=-=-=-=-=-= new



// import * as React from "react";
// import { useFrappeGetDocList } from "frappe-react-sdk";
// import { Button } from "@/components/ui/button";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { useNavigate } from "react-router-dom";
// import { AppSidebar } from "../components/RndSidebar";
// import { useSidebar } from "@/components/ui/sidebar";
// import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
// import { useUserRoles } from "../components/UserRole";
// import { WorkflowTimeline, type IWorkflowStage } from "../components/WorkflowTimeline";
// import { 
//   ChevronDownIcon, 
//   ChevronRightIcon, 
//   ClockIcon,
//   FolderOpenIcon,
//   FileSearchIcon,
//   AlertCircleIcon,
//   CheckCircleIcon,
//   MoreHorizontalIcon,
//   UserIcon,
//   PlaneIcon,
//   FileTextIcon,
//   UsersIcon,
//   SendIcon,
//   CalendarIcon,
//   FileQuestionIcon,
//   ReceiptIcon
// } from "lucide-react";
// import { cn } from "@/lib/utils";

// // ✅ Interfaces
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
// }

// interface ProjectsViewProps {
//   setActiveView?: (view: string) => void;
//   setSelectedProject?: (projectName: string | null) => void;
//   initialTab?: string;
// }

// // ✅ Pending Tasks Data
// const pendingTasksData = {
//   "Temp Adv": [
//     {
//       id: "TA-001",
//       projectNumber: "PRJ-2024-001",
//       projectTitle: "Research Equipment Purchase",
//       status: "Pending Approval",
//       actionDate: "2024-01-15",
//       assignedTo: "Finance Dept",
//       priority: "High"
//     },
//     {
//       id: "TA-002",
//       projectNumber: "PRJ-2024-002",
//       projectTitle: "Conference Travel Advance",
//       status: "Under Review",
//       actionDate: "2024-01-10",
//       assignedTo: "HR Dept",
//       priority: "Medium"
//     }
//   ],
//   "Travel": [
//     {
//       id: "TR-001",
//       projectNumber: "PRJ-2024-003",
//       projectTitle: "International Conference - Singapore",
//       status: "Approval Pending",
//       actionDate: "2024-01-20",
//       assignedTo: "Travel Desk",
//       priority: "High"
//     }
//   ],
//   "Leave": [
//     {
//       id: "LV-001",
//       projectNumber: "N/A",
//       projectTitle: "Medical Leave Application",
//       status: "Pending",
//       actionDate: "2024-01-12",
//       assignedTo: "HR Manager",
//       priority: "Medium"
//     },
//     {
//       id: "LV-002",
//       projectNumber: "N/A",
//       projectTitle: "Vacation Leave",
//       status: "Approved",
//       actionDate: "2024-01-08",
//       assignedTo: "Team Lead",
//       priority: "Low"
//     }
//   ],
//   "Rate Contract": [
//     {
//       id: "RC-001",
//       projectNumber: "CON-2024-001",
//       projectTitle: "Software License Renewal",
//       status: "Under Negotiation",
//       actionDate: "2024-01-18",
//       assignedTo: "Procurement",
//       priority: "High"
//     }
//   ],
//   "Contractual Recruitment": [
//     {
//       id: "CR-001",
//       projectNumber: "HR-2024-001",
//       projectTitle: "Research Assistant Position",
//       status: "Interview Stage",
//       actionDate: "2024-01-22",
//       assignedTo: "HR Dept",
//       priority: "Urgent"
//     }
//   ],
//   "Fresh Proposal Submission": [
//     {
//       id: "FP-001",
//       projectNumber: "PROP-2024-001",
//       projectTitle: "AI Research Initiative",
//       status: "Draft Stage",
//       actionDate: "2024-01-25",
//       assignedTo: "R&D Committee",
//       priority: "High"
//     }
//   ],
//   "Extension of Tenure": [
//     {
//       id: "ET-001",
//       projectNumber: "EXT-2024-001",
//       projectTitle: "Project Staff Extension",
//       status: "Under Review",
//       actionDate: "2024-01-14",
//       assignedTo: "HR Director",
//       priority: "Medium"
//     }
//   ],
//   "NIQ Generation": [
//     {
//       id: "NIQ-001",
//       projectNumber: "NIQ-2024-001",
//       projectTitle: "New Instrument Qualification",
//       status: "Testing Phase",
//       actionDate: "2024-01-16",
//       assignedTo: "Quality Dept",
//       priority: "High"
//     }
//   ],
//   "Reimbursement (Max. Limit ₹ 1 lakh)": [
//     {
//       id: "REIM-001",
//       projectNumber: "REIM-2024-001",
//       projectTitle: "Conference Expenses Reimbursement",
//       status: "Document Verification",
//       actionDate: "2024-01-11",
//       assignedTo: "Accounts Dept",
//       priority: "Medium"
//     },
//     {
//       id: "REIM-002",
//       projectNumber: "REIM-2024-002",
//       projectTitle: "Research Material Purchase",
//       status: "Pending",
//       actionDate: "2024-01-09",
//       assignedTo: "Finance Dept",
//       priority: "Low"
//     }
//   ]
// };

// const taskIcons = {
//   "Temp Adv": UserIcon,
//   "Travel": PlaneIcon,
//   "Leave": CalendarIcon,
//   "Rate Contract": FileTextIcon,
//   "Contractual Recruitment": UsersIcon,
//   "Fresh Proposal Submission": SendIcon,
//   "Extension of Tenure": CalendarIcon,
//   "NIQ Generation": FileQuestionIcon,
//   "Reimbursement (Max. Limit ₹ 1 lakh)": ReceiptIcon
// };

// const priorityColors = {
//   "Low": "bg-green-100 text-green-800 border-green-200",
//   "Medium": "bg-yellow-100 text-yellow-800 border-yellow-200",
//   "High": "bg-orange-100 text-orange-800 border-orange-200",
//   "Urgent": "bg-red-100 text-red-800 border-red-200"
// };

// export function ProjectsView({ setActiveView, setSelectedProject, initialTab }: ProjectsViewProps) {
//   const { state: sidebarState } = useSidebar();
//   const [activeTab, setActiveTab] = React.useState(initialTab || "pending");
//   const [openPipeline, setOpenPipeline] = React.useState<string | null>(null);
//   const [openTaskCategories, setOpenTaskCategories] = React.useState<Record<string, boolean>>({});
//   const navigate = useNavigate();

//   const { currentUser } = useFrappeAuth();
//   const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
//     fields: ["roles"],
//     enabled: !!currentUser,
//   });

//   let isPermanentEmployee = false;
//   let isAdministrator = false;
//   if (userData) {
//     if (Array.isArray(userData.roles) && userData.roles.length > 0) {
//       if (typeof userData.roles[0] === 'string') {
//         isPermanentEmployee = userData.roles.includes("Permanent Employee");
//         isAdministrator = userData.roles.includes("Administrator");
//       } else if (typeof userData.roles[0] === 'object' && userData.roles[0] !== null && 'role' in userData.roles[0]) {
//         isPermanentEmployee = userData.roles.some((role: any) => role.role === "Permanent Employee");
//         isAdministrator = userData.roles.some((role: any) => role.role === "Administrator");
//       }
//     }
//   }

//   React.useEffect(() => {
//     if (initialTab) {
//       setActiveTab(initialTab);
//     }
//   }, [initialTab]);

//   // Fix for filters type issue
//   const projectFilters = React.useMemo(() => {
//     if (isAdministrator) {
//       return undefined; // Administrator sees all projects
//     } else if (currentUser) {
//       // Use proper Frappe filter format
//       return [["pi_webmail", "=", currentUser as string]] as any;
//     }
//     return [["name", "=", ""]] as any; // No projects if no user and not admin
//   }, [isAdministrator, currentUser]);

//   const {
//     data: myProjects,
//     isLoading: myProjectsLoading,
//     error: myProjectsError,
//   } = useFrappeGetDocList<Project>("Project Registration", {
//     fields: ["name", "project_title", "workflow_state", "pi_webmail"],
//     filters: projectFilters,
//     limit: 100,
//   });

//   const toggleTaskCategory = (category: string) => {
//     setOpenTaskCategories(prev => ({
//       ...prev,
//       [category]: !prev[category]
//     }));
//   };

//   const getStatusBadge = (status: string) => {
//     const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
//     switch (status?.toLowerCase()) {
//       case "pending":
//       case "pending approval":
//       case "approval pending":
//         return cn(baseClasses, "bg-yellow-100 text-yellow-800 border border-yellow-200");
//       case "approved":
//         return cn(baseClasses, "bg-green-100 text-green-800 border border-green-200");
//       case "draft":
//       case "draft stage":
//         return cn(baseClasses, "bg-gray-100 text-gray-800 border border-gray-200");
//       case "rejected":
//         return cn(baseClasses, "bg-red-100 text-red-800 border border-red-200");
//       case "under review":
//       case "under negotiation":
//       case "interview stage":
//         return cn(baseClasses, "bg-blue-100 text-blue-800 border border-blue-200");
//       case "testing phase":
//       case "document verification":
//         return cn(baseClasses, "bg-purple-100 text-purple-800 border border-purple-200");
//       default:
//         return cn(baseClasses, "bg-gray-100 text-gray-800 border border-gray-200");
//     }
//   };

//   const getWorkflowState = (state: string) => {
//     const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    
//     switch (state?.toLowerCase()) {
//       case "draft":
//         return cn(baseClasses, "bg-gray-100 text-gray-800");
//       case "submitted":
//         return cn(baseClasses, "bg-blue-100 text-blue-800");
//       case "under review":
//         return cn(baseClasses, "bg-yellow-100 text-yellow-800");
//       case "approved":
//         return cn(baseClasses, "bg-green-100 text-green-800");
//       case "completed":
//         return cn(baseClasses, "bg-purple-100 text-purple-800");
//       default:
//         return cn(baseClasses, "bg-gray-100 text-gray-800");
//     }
//   };

//   const getPriorityBadge = (priority: string) => {
//     const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border";
//     return cn(baseClasses, priorityColors[priority as keyof typeof priorityColors] || "bg-gray-100 text-gray-800 border-gray-200");
//   };

//   const renderPendingTasks = () => {
//     const totalTasks = Object.values(pendingTasksData).reduce((sum, tasks) => sum + tasks.length, 0);

//     if (totalTasks === 0) {
//       return (
//         <div className="text-center py-12">
//           <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
//           <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Tasks</h3>
//           <p className="text-gray-500">All tasks are up to date and processed.</p>
//         </div>
//       );
//     }

//     return (
//       <div className="space-y-6">
//         {Object.entries(pendingTasksData).map(([category, tasks]) => {
//           if (tasks.length === 0) return null;
          
//           const Icon = taskIcons[category as keyof typeof taskIcons];
//           const isOpen = openTaskCategories[category] ?? true;

//           return (
//             <div key={category} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
//               <div 
//                 className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
//                 onClick={() => toggleTaskCategory(category)}
//               >
//                 <div className="flex items-center gap-3">
//                   {Icon && <Icon className="h-5 w-5 text-blue-600" />}
//                   <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
//                   <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
//                     {tasks.length} task{tasks.length > 1 ? 's' : ''}
//                   </span>
//                 </div>
//                 <ChevronDownIcon 
//                   className={cn(
//                     "h-5 w-5 text-gray-500 transition-transform duration-200",
//                     isOpen ? "rotate-0" : "-rotate-90"
//                   )} 
//                 />
//               </div>
              
//               {isOpen && (
//                 <div className="overflow-hidden">
//                   <Table>
//                     <TableHeader className="bg-gray-50/80">
//                       <TableRow>
//                         <TableHead className="font-semibold text-gray-700 w-20">Task ID</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Project/Title</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Status</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Priority</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Assigned To</TableHead>
//                         <TableHead className="font-semibold text-gray-700">Date</TableHead>
//                         <TableHead className="text-right font-semibold text-gray-700">Action</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {tasks.map((task) => (
//                         <TableRow key={task.id} className="group hover:bg-blue-50/50 transition-colors">
//                           <TableCell className="font-medium text-gray-900">
//                             <div className="flex items-center gap-2">
//                               <FileTextIcon className="h-4 w-4 text-gray-400" />
//                               {task.id}
//                             </div>
//                           </TableCell>
//                           <TableCell>
//                             <div>
//                               <div className="font-medium text-gray-900">{task.projectTitle}</div>
//                               {task.projectNumber !== "N/A" && (
//                                 <div className="text-sm text-gray-500">{task.projectNumber}</div>
//                               )}
//                             </div>
//                           </TableCell>
//                           <TableCell>
//                             <span className={getStatusBadge(task.status || "")}>
//                               {task.status}
//                             </span>
//                           </TableCell>
//                           <TableCell>
//                             <span className={getPriorityBadge(task.priority || "Medium")}>
//                               {task.priority}
//                             </span>
//                           </TableCell>
//                           <TableCell className="text-gray-700">{task.assignedTo}</TableCell>
//                           <TableCell className="text-gray-600">
//                             {new Date(task.actionDate).toLocaleDateString()}
//                           </TableCell>
//                           <TableCell className="text-right">
//                             <div className="flex justify-end gap-2">
//                               <Button
//                                 variant="outline"
//                                 size="sm"
//                                 className="bg-white hover:bg-blue-50 border-gray-300 hover:border-blue-300 transition-colors"
//                                 onClick={() => {
//                                   // Navigate to task details or open modal
//                                   console.log(`View details for ${task.id}`);
//                                 }}
//                               >
//                                 View
//                               </Button>
//                               <Button
//                                 variant="default"
//                                 size="sm"
//                                 className="bg-blue-600 hover:bg-blue-700 text-white"
//                                 onClick={() => {
//                                   // Take action on task
//                                   console.log(`Take action on ${task.id}`);
//                                 }}
//                               >
//                                 Action
//                               </Button>
//                             </div>
//                           </TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     );
//   };

//   const renderContent = () => {
//     switch (activeTab) {
//       case "pending":
//         return renderPendingTasks();

//       case "myProjects":
//         return (
//           <div className="overflow-hidden">
//             <Table>
//               <TableHeader className="bg-gray-50/80">
//                 <TableRow>
//                   <TableHead className="font-semibold text-gray-700">Project Number</TableHead>
//                   <TableHead className="font-semibold text-gray-700">Project Title</TableHead>
//                   <TableHead className="font-semibold text-gray-700">Status</TableHead>
//                   <TableHead className="text-right font-semibold text-gray-700">Action</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {myProjectsLoading && (
//                   <TableRow>
//                     <TableCell colSpan={4} className="h-24 text-center">
//                       <div className="flex items-center justify-center">
//                         <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
//                         <span className="ml-2 text-gray-600">Loading projects...</span>
//                       </div>
//                     </TableCell>
//                   </TableRow>
//                 )}
//                 {myProjectsError && (
//                   <TableRow>
//                     <TableCell colSpan={4} className="h-24 text-center">
//                       <div className="flex flex-col items-center justify-center text-red-500">
//                         <AlertCircleIcon className="h-8 w-8 mb-2" />
//                         <p>Error loading projects</p>
//                       </div>
//                     </TableCell>
//                   </TableRow>
//                 )}
//                 {!myProjectsError && myProjects && myProjects.length > 0 ? (
//                   myProjects.map((project: Project) => (
//                     <React.Fragment key={project.name}>
//                       <TableRow
//                         onClick={() => setOpenPipeline(openPipeline === project.name ? null : project.name)}
//                         className="group cursor-pointer hover:bg-blue-50/50 transition-colors"
//                       >
//                         <TableCell className="font-medium text-gray-900">
//                           <div className="flex items-center gap-2">
//                             <FolderOpenIcon className="h-4 w-4 text-gray-400" />
//                             {project.name}
//                           </div>
//                         </TableCell>
//                         <TableCell className="text-gray-700">{project.project_title}</TableCell>
//                         <TableCell>
//                           <span className={getWorkflowState(project.workflow_state)}>
//                             {project.workflow_state}
//                           </span>
//                         </TableCell>
//                         <TableCell className="text-right">
//                           <div className="flex items-center justify-end gap-2">
//                             <Button
//                               variant="outline"
//                               size="sm"
//                               className="bg-white hover:bg-blue-50 border-gray-300 hover:border-blue-300 transition-colors"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 navigate(`/project-details/${project.name}`);
//                               }}
//                             >
//                               View
//                             </Button>
//                             {openPipeline === project.name ? (
//                               <ChevronDownIcon className="h-4 w-4 text-gray-500 transition-transform" />
//                             ) : (
//                               <ChevronRightIcon className="h-4 w-4 text-gray-500 transition-transform" />
//                             )}
//                           </div>
//                         </TableCell>
//                       </TableRow>
//                       {openPipeline === project.name && (
//                         <TableRow>
//                           <TableCell colSpan={4} className="p-0">
//                             <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200">
//                               <div className="max-w-4xl mx-auto">
//                                 <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
//                                   <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
//                                   Workflow Pipeline for {project.project_title}
//                                 </h5>
//                                 <WorkflowTimeline
//                                   stages={[
//                                     { id: 1, title: 'Draft', status: 'completed', description: 'Project created' },
//                                     { id: 2, title: 'Submitted', status: 'in-progress', description: 'Awaiting review' },
//                                     { id: 3, title: 'Approved', status: 'pending', description: 'Ready for execution' },
//                                     { id: 4, title: 'Completed', status: 'pending', description: 'Project finished' },
//                                   ]}
//                                 />
//                               </div>
//                             </div>
//                           </TableCell>
//                         </TableRow>
//                       )}
//                     </React.Fragment>
//                   ))
//                 ) : (
//                   !myProjectsError && (
//                     <TableRow>
//                       <TableCell colSpan={4} className="h-32 text-center">
//                         <div className="flex flex-col items-center justify-center text-gray-500">
//                           <FolderOpenIcon className="h-12 w-12 text-gray-400 mb-2" />
//                           <p className="text-lg font-medium">No Projects Found</p>
//                           <p className="text-sm">Get started by creating your first project</p>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   )
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         );

//       default:
//         return null;
//     }
//   };

//   const totalPendingTasks = Object.values(pendingTasksData).reduce((sum, tasks) => sum + tasks.length, 0);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
//       <AppSidebar isPermanentEmployee={isPermanentEmployee} />
//       <div className={cn(
//         "flex-1 transition-all duration-300 p-6"
//       )}>
//         {/* Header Section */}
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Management</h1>
//           <p className="text-gray-600">Manage and track all your projects in one place</p>
//         </div>

//         {/* Tab Navigation */}
//         <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
//           <div className="border-b border-gray-200">
//             <nav className="flex space-x-8 px-6" aria-label="Tabs">
//               {[
//                 { id: "pending", label: "Pending Tasks", icon: ClockIcon },
//                 { id: "myProjects", label: "Projects", icon: FolderOpenIcon },
//               ].map((tab) => {
//                 const Icon = tab.icon;
//                 return (
//                   <button
//                     key={tab.id}
//                     onClick={() => setActiveTab(tab.id)}
//                     className={cn(
//                       "group flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200",
//                       activeTab === tab.id
//                         ? "border-blue-500 text-blue-600"
//                         : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
//                     )}
//                   >
//                     <Icon className={cn(
//                       "h-4 w-4 transition-colors",
//                       activeTab === tab.id ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
//                     )} />
//                     {tab.label}
//                   </button>
//                 );
//               })}
//             </nav>
//           </div>

//           {/* Content Area */}
//           <div className="p-1">
//             <div className="rounded-lg bg-white">
//               {renderContent()}
//             </div>
//           </div>
//         </div>

//         {/* Stats Summary */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Total Projects</p>
//                 <p className="text-2xl font-bold text-gray-900 mt-1">
//                   {myProjects?.length || 0}
//                 </p>
//               </div>
//               <div className="p-3 bg-blue-100 rounded-lg">
//                 <FolderOpenIcon className="h-6 w-6 text-blue-600" />
//               </div>
//             </div>
//           </div>
          
//           <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
//                 <p className="text-2xl font-bold text-gray-900 mt-1">
//                   {totalPendingTasks}
//                 </p>
//               </div>
//               <div className="p-3 bg-yellow-100 rounded-lg">
//                 <ClockIcon className="h-6 w-6 text-yellow-600" />
//               </div>
//             </div>
//           </div>
          
//           <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Task Categories</p>
//                 <p className="text-2xl font-bold text-gray-900 mt-1">
//                   {Object.keys(pendingTasksData).length}
//                 </p>
//               </div>
//               <div className="p-3 bg-green-100 rounded-lg">
//                 <FileTextIcon className="h-6 w-6 text-green-600" />
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default ProjectsView;



// =-=-=-=-=-=-=-=-=-=-=-

import * as React from "react";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "../components/RndSidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { useUserRoles } from "../components/UserRole";
import { WorkflowTimeline, type IWorkflowStage } from "../components/WorkflowTimeline";
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  ClockIcon,
  FolderOpenIcon,
  FileSearchIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  MoreHorizontalIcon,
  UserIcon,
  PlaneIcon,
  FileTextIcon,
  UsersIcon,
  SendIcon,
  CalendarIcon,
  FileQuestionIcon,
  ReceiptIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// ✅ Interfaces
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
}

interface ProjectsViewProps {
  setActiveView?: (view: string) => void;
  setSelectedProject?: (projectName: string | null) => void;
  initialTab?: string;
}

// ✅ Pending Tasks Data
const pendingTasksData = {
  "Temp Adv": [
    {
      id: "TA-001",
      projectNumber: "PRJ-2024-001",
      projectTitle: "Research Equipment Purchase",
      status: "Pending Approval",
      actionDate: "2024-01-15",
      assignedTo: "Finance Dept",
      priority: "High"
    },
    {
      id: "TA-002",
      projectNumber: "PRJ-2024-002",
      projectTitle: "Conference Travel Advance",
      status: "Under Review",
      actionDate: "2024-01-10",
      assignedTo: "HR Dept",
      priority: "Medium"
    }
  ],
  "Travel": [
    {
      id: "TR-001",
      projectNumber: "PRJ-2024-003",
      projectTitle: "International Conference - Singapore",
      status: "Approval Pending",
      actionDate: "2024-01-20",
      assignedTo: "Travel Desk",
      priority: "High"
    }
  ],
  "Leave": [
    {
      id: "LV-001",
      projectNumber: "N/A",
      projectTitle: "Medical Leave Application",
      status: "Pending",
      actionDate: "2024-01-12",
      assignedTo: "HR Manager",
      priority: "Medium"
    },
    {
      id: "LV-002",
      projectNumber: "N/A",
      projectTitle: "Vacation Leave",
      status: "Approved",
      actionDate: "2024-01-08",
      assignedTo: "Team Lead",
      priority: "Low"
    }
  ],
  "Rate Contract": [
    {
      id: "RC-001",
      projectNumber: "CON-2024-001",
      projectTitle: "Software License Renewal",
      status: "Under Negotiation",
      actionDate: "2024-01-18",
      assignedTo: "Procurement",
      priority: "High"
    }
  ],
  "Contractual Recruitment": [
    {
      id: "CR-001",
      projectNumber: "HR-2024-001",
      projectTitle: "Research Assistant Position",
      status: "Interview Stage",
      actionDate: "2024-01-22",
      assignedTo: "HR Dept",
      priority: "Urgent"
    }
  ],
  "Fresh Proposal Submission": [
    {
      id: "FP-001",
      projectNumber: "PROP-2024-001",
      projectTitle: "AI Research Initiative",
      status: "Draft Stage",
      actionDate: "2024-01-25",
      assignedTo: "R&D Committee",
      priority: "High"
    }
  ],
  "Extension of Tenure": [
    {
      id: "ET-001",
      projectNumber: "EXT-2024-001",
      projectTitle: "Project Staff Extension",
      status: "Under Review",
      actionDate: "2024-01-14",
      assignedTo: "HR Director",
      priority: "Medium"
    }
  ],
  "NIQ Generation": [
    {
      id: "NIQ-001",
      projectNumber: "NIQ-2024-001",
      projectTitle: "New Instrument Qualification",
      status: "Testing Phase",
      actionDate: "2024-01-16",
      assignedTo: "Quality Dept",
      priority: "High"
    }
  ],
  "Reimbursement (Max. Limit ₹ 1 lakh)": [
    {
      id: "REIM-001",
      projectNumber: "REIM-2024-001",
      projectTitle: "Conference Expenses Reimbursement",
      status: "Document Verification",
      actionDate: "2024-01-11",
      assignedTo: "Accounts Dept",
      priority: "Medium"
    },
    {
      id: "REIM-002",
      projectNumber: "REIM-2024-002",
      projectTitle: "Research Material Purchase",
      status: "Pending",
      actionDate: "2024-01-09",
      assignedTo: "Finance Dept",
      priority: "Low"
    }
  ]
};

const taskIcons = {
  "Temp Adv": UserIcon,
  "Travel": PlaneIcon,
  "Leave": CalendarIcon,
  "Rate Contract": FileTextIcon,
  "Contractual Recruitment": UsersIcon,
  "Fresh Proposal Submission": SendIcon,
  "Extension of Tenure": CalendarIcon,
  "NIQ Generation": FileQuestionIcon,
  "Reimbursement (Max. Limit ₹ 1 lakh)": ReceiptIcon
};

const priorityColors = {
  "Low": "bg-green-100 text-green-800 border-green-200",
  "Medium": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "High": "bg-orange-100 text-orange-800 border-orange-200",
  "Urgent": "bg-red-100 text-red-800 border-red-200"
};

export function ProjectsView({ setActiveView, setSelectedProject, initialTab }: ProjectsViewProps) {
  const { state: sidebarState } = useSidebar();
  const [activeTab, setActiveTab] = React.useState(initialTab || "pending");
  const [openPipeline, setOpenPipeline] = React.useState<string | null>(null);
  // Initialize all task categories as collapsed by default
  const [openTaskCategories, setOpenTaskCategories] = React.useState<Record<string, boolean>>(
    Object.keys(pendingTasksData).reduce((acc, category) => {
      acc[category] = false;
      return acc;
    }, {} as Record<string, boolean>)
  );
  const navigate = useNavigate();

  const { currentUser } = useFrappeAuth();
  const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["roles"],
    enabled: !!currentUser,
  });

  let isPermanentEmployee = false;
  let isAdministrator = false;
  if (userData) {
    if (Array.isArray(userData.roles) && userData.roles.length > 0) {
      if (typeof userData.roles[0] === 'string') {
        isPermanentEmployee = userData.roles.includes("Permanent Employee");
        isAdministrator = userData.roles.includes("Administrator");
      } else if (typeof userData.roles[0] === 'object' && userData.roles[0] !== null && 'role' in userData.roles[0]) {
        isPermanentEmployee = userData.roles.some((role: any) => role.role === "Permanent Employee");
        isAdministrator = userData.roles.some((role: any) => role.role === "Administrator");
      }
    }
  }

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Fix for filters type issue
  const projectFilters = React.useMemo(() => {
    if (isAdministrator) {
      return undefined; // Administrator sees all projects
    } else if (currentUser) {
      // Use proper Frappe filter format
      return [["pi_webmail", "=", currentUser as string]] as any;
    }
    return [["name", "=", ""]] as any; // No projects if no user and not admin
  }, [isAdministrator, currentUser]);

  const {
    data: myProjects,
    isLoading: myProjectsLoading,
    error: myProjectsError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["name", "project_title", "workflow_state", "pi_webmail"], // Added pi_webmail to fields
    filters: projectFilters,
    limit: 100,
  });

  const toggleTaskCategory = (category: string) => {
    setOpenTaskCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Function to expand all categories
  const expandAllCategories = () => {
    const expandedState = Object.keys(pendingTasksData).reduce((acc, category) => {
      acc[category] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setOpenTaskCategories(expandedState);
  };

  // Function to collapse all categories
  const collapseAllCategories = () => {
    const collapsedState = Object.keys(pendingTasksData).reduce((acc, category) => {
      acc[category] = false;
      return acc;
    }, {} as Record<string, boolean>);
    setOpenTaskCategories(collapsedState);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status?.toLowerCase()) {
      case "pending":
      case "pending approval":
      case "approval pending":
        return cn(baseClasses, "bg-yellow-100 text-yellow-800 border border-yellow-200");
      case "approved":
        return cn(baseClasses, "bg-green-100 text-green-800 border border-green-200");
      case "draft":
      case "draft stage":
        return cn(baseClasses, "bg-gray-100 text-gray-800 border border-gray-200");
      case "rejected":
        return cn(baseClasses, "bg-red-100 text-red-800 border border-red-200");
      case "under review":
      case "under negotiation":
      case "interview stage":
        return cn(baseClasses, "bg-blue-100 text-blue-800 border border-blue-200");
      case "testing phase":
      case "document verification":
        return cn(baseClasses, "bg-purple-100 text-purple-800 border border-purple-200");
      default:
        return cn(baseClasses, "bg-gray-100 text-gray-800 border border-gray-200");
    }
  };

  const getWorkflowState = (state: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    
    switch (state?.toLowerCase()) {
      case "draft":
        return cn(baseClasses, "bg-gray-100 text-gray-800");
      case "submitted":
        return cn(baseClasses, "bg-blue-100 text-blue-800");
      case "under review":
        return cn(baseClasses, "bg-yellow-100 text-yellow-800");
      case "approved":
        return cn(baseClasses, "bg-green-100 text-green-800");
      case "completed":
        return cn(baseClasses, "bg-purple-100 text-purple-800");
      default:
        return cn(baseClasses, "bg-gray-100 text-gray-800");
    }
  };

  const getPriorityBadge = (priority: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border";
    return cn(baseClasses, priorityColors[priority as keyof typeof priorityColors] || "bg-gray-100 text-gray-800 border-gray-200");
  };

  const renderPendingTasks = () => {
    const totalTasks = Object.values(pendingTasksData).reduce((sum, tasks) => sum + tasks.length, 0);

    if (totalTasks === 0) {
      return (
        <div className="text-center py-12">
          <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Tasks</h3>
          <p className="text-gray-500">All tasks are up to date and processed.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Bulk Actions */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Application Under Review ({totalTasks})
            </h3>
            <p className="text-sm text-gray-500">
              {Object.keys(pendingTasksData).length} categories available
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAllCategories}
              className="flex items-center gap-2"
            >
              <ChevronDownIcon className="h-4 w-4" />
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAllCategories}
              className="flex items-center gap-2"
            >
              <ChevronRightIcon className="h-4 w-4" />
              Collapse All
            </Button>
          </div>
        </div>

        {/* Task Categories */}
        <div className="space-y-3">
          {Object.entries(pendingTasksData).map(([category, tasks]) => {
            if (tasks.length === 0) return null;
            
            const Icon = taskIcons[category as keyof typeof taskIcons];
            const isOpen = openTaskCategories[category] ?? false; // Default to false (collapsed)

            return (
              <div key={category} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleTaskCategory(category)}
                >
                  <div className="flex items-center gap-3">
                    {Icon && <Icon className="h-5 w-5 text-blue-600" />}
                    <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {tasks.length} task{tasks.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {isOpen ? 'Click to collapse' : 'Click to expand'}
                    </span>
                    <ChevronDownIcon 
                      className={cn(
                        "h-5 w-5 text-gray-500 transition-transform duration-200",
                        isOpen ? "rotate-0" : "-rotate-90"
                      )} 
                    />
                  </div>
                </div>
                
                {isOpen && (
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50/80">
                        <TableRow>
                          <TableHead className="font-semibold text-gray-700 w-20">Task ID</TableHead>
                          <TableHead className="font-semibold text-gray-700">Project/Title</TableHead>
                          <TableHead className="font-semibold text-gray-700">Status</TableHead>
                          <TableHead className="font-semibold text-gray-700">Priority</TableHead>
                          <TableHead className="font-semibold text-gray-700">Assigned To</TableHead>
                          <TableHead className="font-semibold text-gray-700">Date</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.map((task) => (
                          <TableRow key={task.id} className="group hover:bg-blue-50/50 transition-colors">
                            <TableCell className="font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                <FileTextIcon className="h-4 w-4 text-gray-400" />
                                {task.id}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-gray-900">{task.projectTitle}</div>
                                {task.projectNumber !== "N/A" && (
                                  <div className="text-sm text-gray-500">{task.projectNumber}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={getStatusBadge(task.status || "")}>
                                {task.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={getPriorityBadge(task.priority || "Medium")}>
                                {task.priority}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-700">{task.assignedTo}</TableCell>
                            <TableCell className="text-gray-600">
                              {new Date(task.actionDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-white hover:bg-blue-50 border-gray-300 hover:border-blue-300 transition-colors"
                                  onClick={() => {
                                    // Navigate to task details or open modal
                                    console.log(`View details for ${task.id}`);
                                  }}
                                >
                                  View
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => {
                                    // Take action on task
                                    console.log(`Take action on ${task.id}`);
                                  }}
                                >
                                  Action
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "pending":
        return renderPendingTasks();

      case "myProjects":
        return (
          <div className="overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow>
                  <TableHead className="font-semibold text-gray-700">Project Number</TableHead>
                  <TableHead className="font-semibold text-gray-700">Project Title</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myProjectsLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Loading projects...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {myProjectsError && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-red-500">
                        <AlertCircleIcon className="h-8 w-8 mb-2" />
                        <p>Error loading projects</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!myProjectsError && myProjects && myProjects.length > 0 ? (
                  myProjects.map((project: Project) => (
                    <React.Fragment key={project.name}>
                      <TableRow
                        onClick={() => setOpenPipeline(openPipeline === project.name ? null : project.name)}
                        className="group cursor-pointer hover:bg-blue-50/50 transition-colors"
                      >
                        <TableCell className="font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <FolderOpenIcon className="h-4 w-4 text-gray-400" />
                            {project.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700">{project.project_title}</TableCell>
                        <TableCell>
                          <span className={getWorkflowState(project.workflow_state)}>
                            {project.workflow_state}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white hover:bg-blue-50 border-gray-300 hover:border-blue-300 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/project-details/${project.name}`);
                              }}
                            >
                              View
                            </Button>
                            {openPipeline === project.name ? (
                              <ChevronDownIcon className="h-4 w-4 text-gray-500 transition-transform" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-gray-500 transition-transform" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {openPipeline === project.name && (
                        <TableRow>
                          <TableCell colSpan={4} className="p-0">
                            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200">
                              <div className="max-w-4xl mx-auto">
                                <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                  Workflow Pipeline for {project.project_title}
                                </h5>
                                <WorkflowTimeline
                                  stages={[
                                    { id: 1, title: 'Draft', status: 'completed', description: 'Project created' },
                                    { id: 2, title: 'Submitted', status: 'in-progress', description: 'Awaiting review' },
                                    { id: 3, title: 'Approved', status: 'pending', description: 'Ready for execution' },
                                    { id: 4, title: 'Completed', status: 'pending', description: 'Project finished' },
                                  ]}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  !myProjectsError && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <FolderOpenIcon className="h-12 w-12 text-gray-400 mb-2" />
                          <p className="text-lg font-medium">No Projects Found</p>
                          <p className="text-sm">Get started by creating your first project</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        );

      default:
        return null;
    }
  };

  const totalPendingTasks = Object.values(pendingTasksData).reduce((sum, tasks) => sum + tasks.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <AppSidebar isPermanentEmployee={isPermanentEmployee} />
      <div className={cn(
        "flex-1 transition-all duration-300 p-6"
      )}>
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Management</h1>
          <p className="text-gray-600">Manage and track all your projects in one place</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: "pending", label: "Application Under Review", icon: ClockIcon },
                { id: "myProjects", label: "Projects", icon: FolderOpenIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "group flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200",
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 transition-colors",
                      activeTab === tab.id ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                    )} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="p-1">
            <div className="rounded-lg bg-white">
              {renderContent()}
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {myProjects?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FolderOpenIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalPendingTasks}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Task Categories</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {Object.keys(pendingTasksData).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FileTextIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectsView;
