// import React, {
//   useState,
//   useCallback,
//   useImperativeHandle,
//   forwardRef,
//   useRef,
//   useEffect,
// } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import {
//   useFrappeGetDoc,
//   useFrappePostCall,
//   useFrappeGetCall,
//   useFrappeAuth,
// } from "frappe-react-sdk";
// import { Textarea } from "@/components/ui/textarea";
// import { AppSidebar } from "../components/RndSidebar";
// import {
//   ArrowLeftIcon,
//   FileTextIcon,
//   UsersIcon,
//   DollarSignIcon,
//   ShieldIcon,
//   MessageSquareIcon,
//   SettingsIcon,
//   CalendarIcon,
//   UserIcon,
//   BuildingIcon,
//   CreditCardIcon,
//   UploadIcon,
//   ShoppingCartIcon,
//   UsersIcon as UsersGroupIcon,
//   PlaneIcon,
//   PlusIcon,
//   FilePlusIcon,
//   MapPinIcon,
//   MailIcon, // <-- ADD THIS ICON TO THE LIST
//   GlobeIcon,
//   TargetIcon,
//   ClockIcon,
//   CheckCircleIcon,
//   XCircleIcon,
//   PrinterIcon,
// } from "lucide-react";
// import { cn } from "@/lib/utils";

// // --- Interfaces (Unchanged) ---
// interface ActivityItem {
//   owner: string;
//   creation: string;
//   content: string;
//   comment_type: string;
// }
// interface ActivityStreamProps {
//   doctype: string;
//   docname: string;
// }
// interface ActivityStreamHandle {
//   refetch: () => void;
// }
// interface ProjectDetailsProps {}

// // --- Section Wrapper Component for better organization ---
// const SectionWrapper = ({
//   title,
//   icon: Icon,
//   children,
//   className,
// }: {
//   title: string;
//   icon: any;
//   children: React.ReactNode;
//   className?: string;
// }) => (
//   <div
//     className={cn(
//       "p-4 md:p-6 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]",
//       className
//     )}
//   >
//     <div className="flex items-center gap-3 mb-4">
//       <Icon className="h-5 w-5 text-black" />
//       <h3 className="text-xl font-bold text-black uppercase">{title}</h3>
//     </div>
//     <div className="space-y-4">{children}</div>
//   </div>
// );

// // --- DESIGN: FieldDisplay Component (Unchanged) ---
// const FieldDisplay = ({
//   label,
//   value,
//   icon: Icon,
// }: {
//   label: string;
//   value: any;
//   icon?: any;
// }) => {
//   if (!value && value !== 0 && value !== "No") return null;
//   return (
//     <div className="py-3">
//       <div className="flex items-center gap-2 mb-1">
//         {Icon && <Icon className="h-4 w-4 text-black" />}
//         <p className="text-sm font-bold text-black uppercase tracking-wider">
//           {label}
//         </p>
//       </div>
//       <p className="bg-[#ECEFF1] text-base text-gray-800 font-mono">{String(value)}</p>
//     </div>
//   );
// };

// const NeoCard = ({ children, className }: any) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );


// // --- Styled Helper Components (Cleaned up from print styles) ---
// const HtmlContent = ({
//   title,
//   htmlString,
//   icon: Icon,
// }: {
//   title: string;
//   htmlString: string | undefined;
//   icon?: any;
// }) => {
//   if (!htmlString) return null;
//   return (
//     <SectionWrapper title={title} icon={Icon}>
//       <div
//         className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-mono"
//         dangerouslySetInnerHTML={{ __html: htmlString }}
//       />
//     </SectionWrapper>
//   );
// };

// const TableDisplay = ({
//   label,
//   data,
//   columns,
//   icon: Icon,
// }: {
//   label: string;
//   data: any[] | undefined;
//   columns: { fieldname: string; label: string }[];
//   icon?: any;
// }) => {
//   if (!data || data.length === 0) return null;
//   return (
//     <SectionWrapper title={label} icon={Icon}>
//       <div className="overflow-x-auto border-2 border-black rounded-md">
//         <table className="min-w-full divide-y-2 divide-black">
//           <thead className="bg-[#90A4AE]">
//             <tr className="divide-x-2 divide-black">
//               {columns.map((col) => (
//                 <th
//                   key={col.fieldname}
//                   className="px-4 py-3 text-left text-sm font-bold text-black uppercase tracking-wider"
//                 >
//                   {col.label}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody className="divide-y-2 divide-black bg-white">
//             {data.map((row, index) => (
//               <tr
//                 key={index}
//                 className="divide-x-2 divide-black hover:bg-[#CFD8DC]"
//               >
//                 {columns.map((col) => (
//                   <td
//                     key={col.fieldname}
//                     className="px-4 py-3 text-sm text-gray-800 font-mono"
//                   >
//                     {row[col.fieldname]}
//                   </td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </SectionWrapper>
//   );
// };

// const NeoButton = ({
//   children,
//   className,
//   ...props
// }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
//   <button
//     className={cn(
//       "px-5 py-3 bg-white border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all",
//       "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
//       "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
//       "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300",
//       className
//     )}
//     {...props}
//   >
//     {children}
//   </button>
// );

// // --- Activity Stream Component (Unchanged logic) ---
// const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(
//   ({ doctype, docname }, ref) => {
//     // ... (internal logic is unchanged, same as original file)
//     const [newComment, setNewComment] = useState("");
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{ message: ActivityItem[] }>(
//       "rndopsapp.rndopsapp.api.get_project_activity",
//       { doctype, docname }
//     );
//     const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");
//     useImperativeHandle(ref, () => ({ refetch() { refetchActivity(); } }));
//     const handleCommentSubmit = async () => { /* ... */ };
//     const handleKeyPress = (e: React.KeyboardEvent) => { /* ... */ };

//     return (
//       <div className="space-y-6">
//         <div className="p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//           <label htmlFor="comment-textarea" className="block text-sm font-bold text-black mb-3 uppercase">
//             Add a comment
//           </label>
//           <Textarea
//             id="comment-textarea"
//             placeholder="Type here... (Ctrl+Enter to submit)"
//             value={newComment}
//             onChange={(e) => setNewComment(e.target.value)}
//             onKeyDown={handleKeyPress}
//             disabled={isSubmitting}
//             className="resize-none bg-white p-3 border-2 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
//             rows={4}
//           />
//           <div className="flex items-center justify-between mt-4">
//             <span className="text-sm text-gray-600 font-mono">{newComment.length}/1000</span>
//             <NeoButton onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()} className="bg-cyan-300 hover:bg-cyan-400">
//               {isSubmitting ? "Submitting..." : "Submit"}
//             </NeoButton>
//           </div>
//         </div>
//         <div className="space-y-4">
//           {activityData?.message?.map((item, index) => (
//             <div
//               key={`${item.creation}-${index}`}
//               className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
//             >
//               <div className="flex-shrink-0 h-12 w-12 rounded-full bg-cyan-300 border-2 border-black flex items-center justify-center font-bold text-black text-xl">
//                 {item.owner?.charAt(0).toUpperCase() || "U"}
//               </div>
//               <div className="flex-1">
//                 <div className="flex justify-between items-center mb-1">
//                   <p className="text-base font-bold text-black">{item.owner || "Unknown User"}</p>
//                   <p className="text-sm text-gray-600 flex items-center gap-1.5 font-mono">
//                     <ClockIcon className="h-4 w-4" />
//                     {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
//                   </p>
//                 </div>
//                 <div className="text-base text-gray-800 prose prose-sm max-w-none leading-relaxed font-mono"
//                   dangerouslySetInnerHTML={{ __html: item.content || "No content" }}
//                 />
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     );
//   }
// );
// ActivityStream.displayName = "ActivityStream";

// // --- Workflow Actions Component (Unchanged) ---
// const WorkflowActions = ({ docname, onAction, isLoading }: { docname: string; onAction: (action: string) => void; isLoading: boolean; }) => {
//   const { data } = useFrappeGetCall<{ message: string[] }>(
//     "rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions",
//     { docname }
//   );
//   if (!data?.message || data.message.length === 0) return null;
//   return (
//     <div className="flex items-center gap-3">
//       {data.message.map((actionString: string) => (
//         <NeoButton key={actionString} onClick={() => onAction(actionString)} className={cn(/* ... */)} disabled={isLoading}>
//           {isLoading ? "Processing..." : actionString}
//         </NeoButton>
//       ))}
//     </div>
//   );
// };

// // --- Main Component ---
// const ProjectDetailsOverview: React.FC<ProjectDetailsProps> = () => {
//   const { projectName } = useParams<{ projectName: string }>();
//   const navigate = useNavigate();
//   const [activeTab, setActiveTab] = useState("overview");
//   const activityStreamRef = useRef<ActivityStreamHandle>(null);
//   const { currentUser } = useFrappeAuth();
//   const { data, error, isLoading, mutate } = useFrappeGetDoc(
//     "Project Registration",
//     projectName ?? ""
//   );
//   const { call: triggerWorkflowAction, loading: isActionLoading } = useFrappePostCall("rndopsapp.rndopsapp.api.handle_workflow_action");
//   const { call: submitProjectRegistration } = useFrappePostCall("rndopsapp.rndopsapp.api.submit_project_registration");

//   // --- NEW DATA FETCH FOR SANCTION DETAILS ---
//   const { data: sanctionData, error: sanctionError, isLoading: sanctionIsLoading, mutate: refetchSanctions } = useFrappeGetCall(
//     'rndopsapp.api.get_sanctions_for_project',
//     { project_name: projectName },
//     // This is important: it ensures this hook re-runs if the user navigates away and back
//     { revalidateOnFocus: true }
//   );
//   // --- END NEW DATA FETCH ---

//   useEffect(() => {
//       // This will automatically refetch sanctions when the component is focused
//       // (e.g., when navigating back from the add sanction page)
//       refetchSanctions();
//   }, []); // Run once on mount, revalidateOnFocus will handle the rest
  
//   const handleWorkflowAction = useCallback(
//     (action: string) => {
//       const apiCall =
//         action.toLowerCase() === "submit"
//           ? submitProjectRegistration({ doc_data: projectName })
//           : triggerWorkflowAction({
//               doctype: "Project Registration",
//               docname: projectName,
//               action: action,
//             });
//       apiCall
//         .then(() => {
//           mutate();
//           activityStreamRef.current?.refetch();
//         })
//         .catch((err: any) =>
//           console.error(`Error during workflow action:`, err)
//         );
//     },
//     [triggerWorkflowAction, submitProjectRegistration, mutate, projectName]
//   );
//   const isCurrentUserPI = currentUser && data?.pi_webmail === currentUser;
  
//   const handleAddFunds = () => alert("Add Funds functionality will be implemented here.");
//   // const handleAddSanctionDetails = () => navigate('/add-fund-sanction');
//   // const handleAddSanctionDetails = () => {
//   //   navigate(`/add-fund-sanction/${projectName}`);
//   // };
//   const handleAddSanctionDetails = () => {
//     // Navigate to the new nested route. Notice the URL structure.
//     navigate(`/project-details-overview/${projectName}/add-fund-sanction`);
//   }; 
// // --- NEW COMPONENT: FilesDisplay ---
// // This component is specifically designed to handle the file data from your API
// const FilesDisplay = ({
//   label,
//   files,
//   icon: Icon,
// }: {
//   label: string;
//   files: any[] | undefined;
//   icon?: any;
// }) => {
//   // Don't render the section if there are no files
//   if (!files || files.length === 0) return null;

//   // Helper function to determine the file's MIME type from its name for the data URL
//   const getMimeType = (fileName = "") => {
//     if (fileName.endsWith('.pdf')) return 'application/pdf';
//     if (fileName.endsWith('.png')) return 'image/png';
//     if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
//     if (fileName.endsWith('.txt')) return 'text/plain';
//     // A generic fallback for other file types
//     return 'application/octet-stream';
//   };

//   return (
//     <SectionWrapper title={label} icon={Icon}>
//       <div className="space-y-3">
//         {files.map((file, index) => {
//           // Don't render a link if the file content is missing
//           if (!file.file_data) {
//             return (
//               <div key={index} className="p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md">
//                 Could not load file: {file.description || file.file_name || 'Unknown File'}
//               </div>
//             );
//           }

//           // Construct the "Data URL". This tells the browser how to interpret the Base64 data.
//           const dataUrl = `data:${getMimeType(file.file_name)};base64,${file.file_data}`;

//           return (
//             <div
//               key={file.name || index}
//               className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white border-2 border-dashed border-black rounded-md"
//             >
//               <div className="flex-1">
//                 <p className="font-bold text-black">{file.file_name || "Download"}</p>
//                 <p className="text-sm text-gray-700 font-mono">{file.description}</p>
//               </div>
//               <a
//                 href={dataUrl}
//                 download={file.file_name} // The `download` attribute prompts the user to save the file
//                 className="flex-shrink-0 px-4 py-2 font-semibold text-white bg-cyan-600 border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:bg-cyan-700 active:translate-y-px"
//               >
//                 Download File
//               </a>
//             </div>
//           );
//         })}
//       </div>
//     </SectionWrapper>
//   );
// };
//   // UPDATED: Tabs array with Activity Log
//   const tabs = [
//     { id: "overview", label: "Overview", icon: FileTextIcon },
//     { id: "sanction-details", label: "Sanction Details", icon: CreditCardIcon },
//     { id: "activity", label: "Activity Log", icon: MessageSquareIcon },
//   ];

//   const renderContent = () => {
//     if (isLoading) { /* ... Loading State ... */ }
//     if (error) { /* ... Error State ... */ }

//     return (
//       <>
//         <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//           <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
//             <div className="flex items-center gap-4">
//               <button
//                 onClick={() => navigate("/projects-view")}
//                 className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform"
//               >
//                 <ArrowLeftIcon className="h-6 w-6" />
//               </button>
//               <div>
//                 <h1 className="text-3xl font-extrabold text-black">{data?.project_title || "Project Details"}</h1>
//                 <p className="text-gray-700 font-mono mt-1">ID: {projectName} | Status: <span className="font-bold text-black">{data?.workflow_state || "Draft"}</span></p>
//               </div>
//             </div>
//             <div className="flex items-center gap-3 flex-wrap">
//               {isCurrentUserPI && (
//                 <div className="flex gap-3">
//                   <NeoButton
//                     onClick={handleAddFunds}
//                      className="bg-[#A5D6A7] hover:bg-[#81C784] flex items-center gap-2"
//                   >
//                     <PlusIcon className="h-4 w-4" /> Add Funds
//                   </NeoButton>
//                   <NeoButton
//                     onClick={handleAddSanctionDetails}
//                      className="bg-[#A5D6A7] hover:bg-[#81C784] flex items-center gap-2"
//                   >
//                     <FilePlusIcon className="h-4 w-4" /> Add Sanction
//                   </NeoButton>
//                 </div>
//               )}
//               <WorkflowActions docname={projectName!} onAction={handleWorkflowAction} isLoading={isActionLoading} />
//             </div>
//           </div>
//         </header>

//         {/* --- Tab Navigation and Content --- */}
//         <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//           <div className="border-b-2 border-black">
//             <nav className="flex space-x-2 p-2 overflow-x-auto">
//               {tabs.map((tab) => (
//                 <button
//                   key={tab.id}
//                   onClick={() => setActiveTab(tab.id)}
//                   className={cn(
//                     "flex-shrink-0 flex items-center gap-2 py-3 px-4 font-bold text-sm rounded-md border-2 border-transparent transition-all",
//                     activeTab === tab.id
//                       ? "bg-[#90A4AE] border-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
//                       : "text-black hover:bg-[#CFD8DC]"
//                   )}
//                 >
//                   <tab.icon className="h-5 w-5" /> {tab.label}
//                 </button>
//               ))}
//             </nav>
//           </div>
//           <div className="bg-[#F5F5F5] p-6 md:p-8">
//             {activeTab === "overview" && (
//               <div className="space-y-8">
//                 {/* --- General Information Section --- */}
//                 <SectionWrapper title="General Information" icon={FileTextIcon}>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
//                     <FieldDisplay label="Project Type" value={data?.project_type} icon={FileTextIcon} />
//                     <FieldDisplay label="Implementation Dept" value={data?.implementation_department} icon={BuildingIcon} />
//                     <FieldDisplay label="Status" value={data?.workflow_state} icon={TargetIcon} />
//                     <FieldDisplay label="Project Duration" value={`${data?.project_duration_months}m ${data?.project_duration_days || 0}d`} icon={CalendarIcon}/>
//                     <FieldDisplay label="International Travel" value={data?.involves_international_travel} icon={PlaneIcon} />
//                   </div>
//                 </SectionWrapper>
                
//                 {/* --- Funding Agency Section --- */}
//                 <SectionWrapper title="Funding Agency" icon={BuildingIcon}>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
//                     <FieldDisplay label="Agency Name" value={data?.funding_agen} icon={BuildingIcon} />
//                     <FieldDisplay label="Agency Type" value={data?.funding_agency_type} icon={UsersIcon} />
//                     <FieldDisplay label="Origin" value={data?.origin_of_funding_agency} icon={GlobeIcon} />
//                     <FieldDisplay label="Ministry" value={data?.funding_agency_ministry} icon={BuildingIcon} />
//                     <FieldDisplay label="Scheme" value={data?.funding_agency_schemes} icon={FileTextIcon} />
//                     <FieldDisplay label="Address" value={`${data?.address_street_village_locality}, ${data?.address_state}, ${data?.address_country} - ${data?.address_postal_code}`} icon={MapPinIcon}/>
//                   </div>
//                 </SectionWrapper>

//                 {/* --- Investigators Section --- */}
//                 <SectionWrapper title="Investigators" icon={UsersIcon}>
//                   <h4 className="font-bold text-lg text-black uppercase">Principal Investigator (PI)</h4>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
//                     <FieldDisplay label="Name" value={data?.principal_investigator_name} icon={UserIcon} />
//                     <FieldDisplay label="Email" value={data?.pi_webmail} icon={MailIcon} />
//                     <FieldDisplay label="Employee ID" value={data?.pi_employee_id} icon={UserIcon} />
//                     <FieldDisplay label="Designation" value={data?.designation} icon={UsersIcon} />
//                     <FieldDisplay label="Department" value={data?.applicant_department} icon={BuildingIcon} />
//                   </div>
//                 </SectionWrapper>
//                 {data?.is_additional_pi === "Yes" && <TableDisplay label="Additional PIs" data={data?.additional_pi_table} columns={[ { fieldname: "pi_name", label: "Name" }, { fieldname: "pi_designation", label: "Designation" }, { fieldname: "pi_email", label: "Email" }, ]} icon={UsersIcon} />}
//                 {data?.has_co_pi === "Yes" && <TableDisplay label="Co-Investigators" data={data?.co_investigator_table} columns={[ { fieldname: "copi_name", label: "Name" }, { fieldname: "copi_designation", label: "Designation" }, { fieldname: "copi_email", label: "Email" }, ]} icon={UsersIcon} />}
                
//                 {/* --- Funding & Budget Section --- */}
//                 <TableDisplay label="Proposed Budget Breakup" data={data?.proposed_budget_breakup} columns={[ { fieldname: "account_head", label: "Budget Head" }, { fieldname: "first_year_budget", label: "Year 1" }, { fieldname: "second_year_budget", label: "Year 2" }, ]} icon={DollarSignIcon} />
//                 {data?.equipment_checkbox === 1 && <TableDisplay label="Proposed Equipment" data={data?.proposed_equipment_details} columns={[ { fieldname: "item_name", label: "Equipment Name" }, { fieldname: "equip_total_unit_cost", label: "Cost" }, ]} icon={ShoppingCartIcon} />}
//                 {data?.manpower_checkbox === 1 && <TableDisplay label="Proposed Manpower" data={data?.proposed_manpower_details} columns={[ { fieldname: "designation_name", label: "Position" }, { fieldname: "manpower_salary", label: "Salary" }, ]} icon={UsersGroupIcon} />}
                
//                 {/* --- HTML Content Section --- */}
//                 <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} icon={FileTextIcon} />
//                 <HtmlContent title="Project Objective" htmlString={data?.project_objective} icon={TargetIcon} />
//                 <HtmlContent title="Project Deliverables" htmlString={data?.project_deliverables} icon={CheckCircleIcon} />
                
//                 {/* --- Clearance Section --- */}
//                 <SectionWrapper title="Clearance Details" icon={ShieldIcon}>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
//                     <FieldDisplay label="Needs Committee Clearance" value={data?.needs_committee_clearance} icon={ShieldIcon} />
//                     <FieldDisplay label="Committee" value={data?.committees} icon={UsersIcon} />
//                     <FieldDisplay label="Ethics Committee Details" value={data?.ethics_committee_details} icon={FileTextIcon} />
//                     <FieldDisplay label="Biosafety Category" value={data?.biosafety_category} icon={ShieldIcon} />
//                     <FieldDisplay label="Needs Endorsement" value={data?.need_endorsement_copy} icon={CheckCircleIcon} />
//                   </div>
//                 </SectionWrapper>
//               </div>
//             )}

//             {/* --- MODIFIED SANCTION DETAILS TAB --- */}
//             {/* --- MODIFIED SANCTION DETAILS TAB --- */}
//             {activeTab === "sanction-details" && (
//               <div className="space-y-8">
//                 {sanctionIsLoading && <p>Loading Sanction Details...</p>}
//                 {sanctionError && <p className="text-red-600">Error loading sanctions: {sanctionError.message}</p>}
                
//                 {sanctionData?.message && sanctionData.message.length > 0 ? (
//                   sanctionData.message.map((sanction: any, index: number) => (
//                     <NeoCard key={sanction.name || index} className="space-y-4">
//                       <div className="pb-3 border-b-2 border-black">
//                         <h3 className="text-xl font-bold uppercase text-black">
//                           Sanction Letter No: {sanction.sanctioned_letter_no}
//                         </h3>
//                         <p className="font-mono text-sm text-gray-700">
//                           Date: {sanction.sanctioned_letter_date} | Total Amount: {(sanction.total_sanctioned_amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
//                         </p>
//                       </div>
                      
//                       <TableDisplay
//                         label="Budget Breakup"
//                         data={sanction.sanctioned_budget_breakup}
//                         columns={[
//                           { fieldname: "account_head", label: "Account Head" },
//                           { fieldname: "first_year_budget", label: "Year 1" },
//                           { fieldname: "second_year_budget", label: "Year 2" },
//                           { fieldname: "third_year_budget", label: "Year 3" },
//                         ]}
//                         icon={DollarSignIcon}
//                       />
                      
//                       {/* --- THIS IS THE NEWLY ADDED PART --- */}
//                       <FilesDisplay
//                         label="Attached Files"
//                         files={sanction.sanction_related_files}
//                         icon={UploadIcon}
//                       />
//                       {/* --- END OF NEW PART --- */}

//                     </NeoCard>
//                   ))
//                 ) : (
//                   <div className="text-center py-12 text-gray-600 border-2 border-dashed border-black rounded-md bg-white">
//                     <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                     <p className="font-bold text-lg">No Sanction Details Found</p>
//                     <p className="text-sm mt-1">Click "Add Sanction" to create the first entry for this project.</p>
//                   </div>
//                 )}
//               </div>
//             )}
            
//             {activeTab === "activity" && (
//               <ActivityStream
//                 ref={activityStreamRef}
//                 doctype="Project Registration"
//                 docname={projectName!}
//               />
//             )}
//           </div>
//         </div>
//       </>
//     );
//   };

//   return (
//     <div className="bg-[#FDFCEC]">
//       <AppSidebar isPermanentEmployee={true} />
//       <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//         {renderContent()}
//       </main>
//     </div>
//   );
// };

// export default ProjectDetailsOverview;




// -=-=-=-=-=-=-==-=-=-=-


// import React, {
//   useState,
//   useCallback,
//   useImperativeHandle,
//   forwardRef,
//   useRef,
//   useEffect,
// } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import {
//   useFrappeGetDoc,
//   useFrappePostCall,
//   useFrappeGetCall,
//   useFrappeAuth,
// } from "frappe-react-sdk";
// import { Textarea } from "@/components/ui/textarea";
// import { AppSidebar } from "../components/RndSidebar";
// import {
//   ArrowLeftIcon,
//   FileTextIcon,
//   UsersIcon,
//   DollarSignIcon,
//   ShieldIcon,
//   MessageSquareIcon,
//   DownloadIcon, // Added for the download button
//   CalendarIcon,
//   UserIcon,
//   BuildingIcon,
//   CreditCardIcon,
//   UploadIcon,
//   ShoppingCartIcon,
//   UsersIcon as UsersGroupIcon,
//   PlaneIcon,
//   PlusIcon,
//   FilePlusIcon,
//   MapPinIcon,
//   MailIcon,
//   GlobeIcon,
//   TargetIcon,
//   ClockIcon,
//   CheckCircleIcon,
// } from "lucide-react";
// import { cn } from "@/lib/utils";

// // --- Interfaces ---
// interface ActivityItem {
//   owner: string;
//   creation: string;
//   content: string;
//   comment_type: string;
// }
// interface ActivityStreamProps {
//   doctype: string;
//   docname: string;
// }
// interface ActivityStreamHandle {
//   refetch: () => void;
// }
// interface ProjectDetailsProps {}

// // --- Section Wrapper Component for better organization ---
// const SectionWrapper = ({
//   title,
//   icon: Icon,
//   children,
//   className,
// }: {
//   title: string;
//   icon: any;
//   children: React.ReactNode;
//   className?: string;
// }) => (
//   <div
//     className={cn(
//       "p-4 md:p-6 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]",
//       className
//     )}
//   >
//     <div className="flex items-center gap-3 mb-4">
//       <Icon className="h-5 w-5 text-black" />
//       <h3 className="text-xl font-bold text-black uppercase">{title}</h3>
//     </div>
//     <div className="space-y-4">{children}</div>
//   </div>
// );

// // --- FieldDisplay Component ---
// const FieldDisplay = ({
//   label,
//   value,
//   icon: Icon,
// }: {
//   label: string;
//   value: any;
//   icon?: any;
// }) => {
//   if (!value && value !== 0 && value !== "No") return null;
//   return (
//     <div className="py-3">
//       <div className="flex items-center gap-2 mb-1">
//         {Icon && <Icon className="h-4 w-4 text-black" />}
//         <p className="text-sm font-bold text-black uppercase tracking-wider">
//           {label}
//         </p>
//       </div>
//       <p className="bg-[#ECEFF1] p-2 text-base text-gray-800 font-mono">{String(value)}</p>
//     </div>
//   );
// };

// // --- NeoCard Component ---
// const NeoCard = ({ children, className }: any) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );


// // --- Styled Helper Components ---
// const HtmlContent = ({
//   title,
//   htmlString,
//   icon: Icon,
// }: {
//   title: string;
//   htmlString: string | undefined;
//   icon?: any;
// }) => {
//   if (!htmlString) return null;
//   return (
//     <SectionWrapper title={title} icon={Icon}>
//       <div
//         className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-mono"
//         dangerouslySetInnerHTML={{ __html: htmlString }}
//       />
//     </SectionWrapper>
//   );
// };

// const TableDisplay = ({
//   label,
//   data,
//   columns,
//   icon: Icon,
// }: {
//   label: string;
//   data: any[] | undefined;
//   columns: { fieldname: string; label: string }[];
//   icon?: any;
// }) => {
//   if (!data || data.length === 0) return null;
//   return (
//     <SectionWrapper title={label} icon={Icon}>
//       <div className="overflow-x-auto border-2 border-black rounded-md">
//         <table className="min-w-full divide-y-2 divide-black">
//           <thead className="bg-[#90A4AE]">
//             <tr className="divide-x-2 divide-black">
//               {columns.map((col) => (
//                 <th
//                   key={col.fieldname}
//                   className="px-4 py-3 text-left text-sm font-bold text-black uppercase tracking-wider"
//                 >
//                   {col.label}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody className="divide-y-2 divide-black bg-white">
//             {data.map((row, index) => (
//               <tr
//                 key={index}
//                 className="divide-x-2 divide-black hover:bg-[#CFD8DC]"
//               >
//                 {columns.map((col) => (
//                   <td
//                     key={col.fieldname}
//                     className="px-4 py-3 text-sm text-gray-800 font-mono"
//                   >
//                     {row[col.fieldname]}
//                   </td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </SectionWrapper>
//   );
// };

// const NeoButton = ({
//   children,
//   className,
//   ...props
// }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
//   <button
//     className={cn(
//       "px-5 py-3 bg-white border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all",
//       "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
//       "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
//       "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300",
//       className
//     )}
//     {...props}
//   >
//     {children}
//   </button>
// );

// // --- Activity Stream Component ---
// const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(
//   ({ doctype, docname }, ref) => {
//     const [newComment, setNewComment] = useState("");
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{ message: ActivityItem[] }>(
//       "rndopsapp.rndopsapp.api.get_project_activity",
//       { doctype, docname }
//     );
//     const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");
    
//     useImperativeHandle(ref, () => ({ refetch() { refetchActivity(); } }));
    
//     const handleCommentSubmit = async () => {
//       if (!newComment.trim()) return;
//       setIsSubmitting(true);
//       try {
//         await addComment({
//           doctype: doctype,
//           docname: docname,
//           comment: newComment,
//         });
//         setNewComment("");
//         refetchActivity();
//       } catch (error) {
//         console.error("Failed to add comment:", error);
//       } finally {
//         setIsSubmitting(false);
//       }
//     };
    
//     const handleKeyPress = (e: React.KeyboardEvent) => {
//       if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
//         handleCommentSubmit();
//       }
//     };

//     return (
//       <div className="space-y-6">
//         <div className="p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//           <label htmlFor="comment-textarea" className="block text-sm font-bold text-black mb-3 uppercase">
//             Add a comment
//           </label>
//           <Textarea
//             id="comment-textarea"
//             placeholder="Type here... (Ctrl+Enter to submit)"
//             value={newComment}
//             onChange={(e) => setNewComment(e.target.value)}
//             onKeyDown={handleKeyPress}
//             disabled={isSubmitting}
//             className="resize-none bg-white p-3 border-2 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
//             rows={4}
//           />
//           <div className="flex items-center justify-between mt-4">
//             <span className="text-sm text-gray-600 font-mono">{newComment.length}/1000</span>
//             <NeoButton onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()} className="bg-cyan-300 hover:bg-cyan-400">
//               {isSubmitting ? "Submitting..." : "Submit"}
//             </NeoButton>
//           </div>
//         </div>
//         <div className="space-y-4">
//           {activityData?.message?.map((item, index) => (
//             <div
//               key={`${item.creation}-${index}`}
//               className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
//             >
//               <div className="flex-shrink-0 h-12 w-12 rounded-full bg-cyan-300 border-2 border-black flex items-center justify-center font-bold text-black text-xl">
//                 {item.owner?.charAt(0).toUpperCase() || "U"}
//               </div>
//               <div className="flex-1">
//                 <div className="flex justify-between items-center mb-1">
//                   <p className="text-base font-bold text-black">{item.owner || "Unknown User"}</p>
//                   <p className="text-sm text-gray-600 flex items-center gap-1.5 font-mono">
//                     <ClockIcon className="h-4 w-4" />
//                     {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
//                   </p>
//                 </div>
//                 <div className="text-base text-gray-800 prose prose-sm max-w-none leading-relaxed font-mono"
//                   dangerouslySetInnerHTML={{ __html: item.content || "No content" }}
//                 />
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     );
//   }
// );
// ActivityStream.displayName = "ActivityStream";

// // --- Workflow Actions Component ---
// const WorkflowActions = ({ docname, onAction, isLoading }: { docname: string; onAction: (action: string) => void; isLoading: boolean; }) => {
//   const { data } = useFrappeGetCall<{ message: string[] }>(
//     "rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions",
//     { docname }
//   );
//   if (!data?.message || data.message.length === 0) return null;
//   return (
//     <div className="flex items-center gap-3">
//       {data.message.map((actionString: string) => (
//         <NeoButton key={actionString} onClick={() => onAction(actionString)} className={cn("bg-yellow-200 hover:bg-yellow-300")} disabled={isLoading}>
//           {isLoading ? "Processing..." : actionString}
//         </NeoButton>
//       ))}
//     </div>
//   );
// };

// // --- Main Component ---
// const ProjectDetailsOverview: React.FC<ProjectDetailsProps> = () => {
//   const { projectName } = useParams<{ projectName: string }>();
//   const navigate = useNavigate();
//   const [activeTab, setActiveTab] = useState("overview");
//   const activityStreamRef = useRef<ActivityStreamHandle>(null);
//   const { currentUser } = useFrappeAuth();
//   const { data, error, isLoading, mutate } = useFrappeGetDoc(
//     "Project Registration",
//     projectName ?? ""
//   );
//   const { call: triggerWorkflowAction, loading: isActionLoading } = useFrappePostCall("rndopsapp.rndopsapp.api.handle_workflow_action");
//   const { call: submitProjectRegistration } = useFrappePostCall("rndopsapp.rndopsapp.api.submit_project_registration");

//   const { data: sanctionData, error: sanctionError, isLoading: sanctionIsLoading, mutate: refetchSanctions } = useFrappeGetCall(
//     'rndopsapp.api.get_sanctions_for_project',
//     { project_name: projectName },
//     { revalidateOnFocus: true }
//   );
  
//   useEffect(() => {
//       refetchSanctions();
//   }, [refetchSanctions]); 
  
//   const handleWorkflowAction = useCallback(
//     (action: string) => {
//       const apiCall =
//         action.toLowerCase() === "submit"
//           ? submitProjectRegistration({ doc_data: projectName })
//           : triggerWorkflowAction({
//               doctype: "Project Registration",
//               docname: projectName,
//               action: action,
//             });
//       apiCall
//         .then(() => {
//           mutate();
//           activityStreamRef.current?.refetch();
//         })
//         .catch((err: any) =>
//           console.error(`Error during workflow action:`, err)
//         );
//     },
//     [triggerWorkflowAction, submitProjectRegistration, mutate, projectName]
//   );
  
//   const isCurrentUserPI = currentUser && data?.pi_webmail === currentUser;
//   const handleAddFunds = () => alert("Add Funds functionality will be implemented here.");
//   const handleAddSanctionDetails = () => {
//     navigate(`/project-details-overview/${projectName}/add-fund-sanction`);
//   }; 

//   const tabs = [
//     { id: "overview", label: "Overview", icon: FileTextIcon },
//     { id: "sanction-details", label: "Sanction Details", icon: CreditCardIcon },
//     { id: "activity", label: "Activity Log", icon: MessageSquareIcon },
//   ];

//   // Helper function to create download links from Base64 data
//   const getMimeType = (fileName = "") => {
//     if (fileName.endsWith('.pdf')) return 'application/pdf';
//     if (fileName.endsWith('.png')) return 'image/png';
//     if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
//     return 'application/octet-stream';
//   };

//   const budgetColumns = [
//       { fieldname: "account_head", label: "Account Head" },
//       { fieldname: "first_year_budget", label: "Year 1" },
//       { fieldname: "second_year_budget", label: "Year 2" },
//       { fieldname: "third_year_budget", label: "Year 3" },
//   ];

//   const renderContent = () => {
//     if (isLoading) {
//       return (
//         <div className="flex items-center justify-center h-screen">
//           <p className="text-lg font-semibold">Loading Project Details...</p>
//         </div>
//       );
//     }
//     if (error) {
//       return (
//         <div className="p-8 text-center">
//           <p className="text-lg font-semibold text-red-600">Error loading project: {error.message}</p>
//         </div>
//       );
//     }

//     return (
//       <>
//         <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//           <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
//             <div className="flex items-center gap-4">
//               <button
//                 onClick={() => navigate("/projects-view")}
//                 className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform"
//               >
//                 <ArrowLeftIcon className="h-6 w-6" />
//               </button>
//               <div>
//                 <h1 className="text-3xl font-extrabold text-black">{data?.project_title || "Project Details"}</h1>
//                 <p className="text-gray-700 font-mono mt-1">ID: {projectName} | Status: <span className="font-bold text-black">{data?.workflow_state || "Draft"}</span></p>
//               </div>
//             </div>
//             <div className="flex items-center gap-3 flex-wrap">
//               {isCurrentUserPI && (
//                 <div className="flex gap-3">
//                   <NeoButton
//                     onClick={handleAddFunds}
//                      className="bg-[#A5D6A7] hover:bg-[#81C784] flex items-center gap-2"
//                   >
//                     <PlusIcon className="h-4 w-4" /> Add Funds
//                   </NeoButton>
//                   <NeoButton
//                     onClick={handleAddSanctionDetails}
//                      className="bg-[#A5D6A7] hover:bg-[#81C784] flex items-center gap-2"
//                   >
//                     <FilePlusIcon className="h-4 w-4" /> Add Sanction
//                   </NeoButton>
//                 </div>
//               )}
//               <WorkflowActions docname={projectName!} onAction={handleWorkflowAction} isLoading={isActionLoading} />
//             </div>
//           </div>
//         </header>

//         <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//           <div className="border-b-2 border-black">
//             <nav className="flex space-x-2 p-2 overflow-x-auto">
//               {tabs.map((tab) => (
//                 <button
//                   key={tab.id}
//                   onClick={() => setActiveTab(tab.id)}
//                   className={cn(
//                     "flex-shrink-0 flex items-center gap-2 py-3 px-4 font-bold text-sm rounded-md border-2 border-transparent transition-all",
//                     activeTab === tab.id
//                       ? "bg-[#90A4AE] border-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
//                       : "text-black hover:bg-[#CFD8DC]"
//                   )}
//                 >
//                   <tab.icon className="h-5 w-5" /> {tab.label}
//                 </button>
//               ))}
//             </nav>
//           </div>
//           <div className="bg-[#F5F5F5] p-6 md:p-8">
//             {activeTab === "overview" && (
//               <div className="space-y-8">
//                 <SectionWrapper title="General Information" icon={FileTextIcon}>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
//                     <FieldDisplay label="Project Type" value={data?.project_type} icon={FileTextIcon} />
//                     <FieldDisplay label="Implementation Dept" value={data?.implementation_department} icon={BuildingIcon} />
//                     <FieldDisplay label="Status" value={data?.workflow_state} icon={TargetIcon} />
//                     <FieldDisplay label="Project Duration" value={`${data?.project_duration_months}m ${data?.project_duration_days || 0}d`} icon={CalendarIcon}/>
//                     <FieldDisplay label="International Travel" value={data?.involves_international_travel} icon={PlaneIcon} />
//                   </div>
//                 </SectionWrapper>
                
//                 <SectionWrapper title="Funding Agency" icon={BuildingIcon}>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
//                     <FieldDisplay label="Agency Name" value={data?.funding_agen} icon={BuildingIcon} />
//                     <FieldDisplay label="Agency Type" value={data?.funding_agency_type} icon={UsersIcon} />
//                     <FieldDisplay label="Origin" value={data?.origin_of_funding_agency} icon={GlobeIcon} />
//                     <FieldDisplay label="Ministry" value={data?.funding_agency_ministry} icon={BuildingIcon} />
//                     <FieldDisplay label="Scheme" value={data?.funding_agency_schemes} icon={FileTextIcon} />
//                     <FieldDisplay label="Address" value={`${data?.address_street_village_locality}, ${data?.address_state}, ${data?.address_country} - ${data?.address_postal_code}`} icon={MapPinIcon}/>
//                   </div>
//                 </SectionWrapper>

//                 <SectionWrapper title="Investigators" icon={UsersIcon}>
//                   <h4 className="font-bold text-lg text-black uppercase">Principal Investigator (PI)</h4>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
//                     <FieldDisplay label="Name" value={data?.principal_investigator_name} icon={UserIcon} />
//                     <FieldDisplay label="Email" value={data?.pi_webmail} icon={MailIcon} />
//                     <FieldDisplay label="Employee ID" value={data?.pi_employee_id} icon={UserIcon} />
//                     <FieldDisplay label="Designation" value={data?.designation} icon={UsersIcon} />
//                     <FieldDisplay label="Department" value={data?.applicant_department} icon={BuildingIcon} />
//                   </div>
//                 </SectionWrapper>
//                 {data?.is_additional_pi === "Yes" && <TableDisplay label="Additional PIs" data={data?.additional_pi_table} columns={[ { fieldname: "pi_name", label: "Name" }, { fieldname: "pi_designation", label: "Designation" }, { fieldname: "pi_email", label: "Email" }, ]} icon={UsersIcon} />}
//                 {data?.has_co_pi === "Yes" && <TableDisplay label="Co-Investigators" data={data?.co_investigator_table} columns={[ { fieldname: "copi_name", label: "Name" }, { fieldname: "copi_designation", label: "Designation" }, { fieldname: "copi_email", label: "Email" }, ]} icon={UsersIcon} />}
                
//                 <TableDisplay label="Proposed Budget Breakup" data={data?.proposed_budget_breakup} columns={[ { fieldname: "account_head", label: "Budget Head" }, { fieldname: "first_year_budget", label: "Year 1" }, { fieldname: "second_year_budget", label: "Year 2" }, ]} icon={DollarSignIcon} />
//                 {data?.equipment_checkbox === 1 && <TableDisplay label="Proposed Equipment" data={data?.proposed_equipment_details} columns={[ { fieldname: "item_name", label: "Equipment Name" }, { fieldname: "equip_total_unit_cost", label: "Cost" }, ]} icon={ShoppingCartIcon} />}
//                 {data?.manpower_checkbox === 1 && <TableDisplay label="Proposed Manpower" data={data?.proposed_manpower_details} columns={[ { fieldname: "designation_name", label: "Position" }, { fieldname: "manpower_salary", label: "Salary" }, ]} icon={UsersGroupIcon} />}
                
//                 <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} icon={FileTextIcon} />
//                 <HtmlContent title="Project Objective" htmlString={data?.project_objective} icon={TargetIcon} />
//                 <HtmlContent title="Project Deliverables" htmlString={data?.project_deliverables} icon={CheckCircleIcon} />
                
//                 <SectionWrapper title="Clearance Details" icon={ShieldIcon}>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
//                     <FieldDisplay label="Needs Committee Clearance" value={data?.needs_committee_clearance} icon={ShieldIcon} />
//                     <FieldDisplay label="Committee" value={data?.committees} icon={UsersIcon} />
//                     <FieldDisplay label="Ethics Committee Details" value={data?.ethics_committee_details} icon={FileTextIcon} />
//                     <FieldDisplay label="Biosafety Category" value={data?.biosafety_category} icon={ShieldIcon} />
//                     <FieldDisplay label="Needs Endorsement" value={data?.need_endorsement_copy} icon={CheckCircleIcon} />
//                   </div>
//                 </SectionWrapper>
//               </div>
//             )}

//             {/* --- REVISED SANCTION DETAILS TAB --- */}
//             {activeTab === "sanction-details" && (
//               <div className="space-y-8">
//                 {sanctionIsLoading && <p>Loading Sanction Details...</p>}
//                 {sanctionError && <p className="text-red-600">Error: {sanctionError.message}</p>}
                
//                 {sanctionData?.message && sanctionData.message.length > 0 ? (
//                   sanctionData.message.map((sanction: any) => (
//                     <NeoCard key={sanction.name} className="space-y-6">
//                       {/* === MODIFIED HEADER === */}
//                       <div className="pb-4 border-b-2 border-black">
//                         <h3 className="text-xl font-bold uppercase text-black">
//                           Sanction Reference No: {sanction.name}
//                         </h3>
//                         <p className="font-mono text-sm text-gray-700 mt-1">
//                           Letter No: <span className="font-semibold text-gray-800">{sanction.sanctioned_letter_no}</span> | 
//                           Date: <span className="font-semibold text-gray-800">{sanction.sanctioned_letter_date}</span> | 
//                           Amount: <span className="font-semibold text-gray-800">{(sanction.total_sanctioned_amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
//                         </p>
//                       </div>

//                       {/* === BUDGET TABLE (CLEANER DESIGN) === */}
//                       {(sanction.sanctioned_budget_breakup?.length > 0) && (
//                         <div>
//                             <h4 className="text-lg font-bold text-black uppercase mb-3">Budget Breakup</h4>
//                             <div className="overflow-x-auto border-2 border-black rounded-md">
//                                 <table className="min-w-full divide-y-2 divide-black">
//                                     <thead className="bg-[#90A4AE]"><tr className="divide-x-2 divide-black">{budgetColumns.map(c => <th key={c.fieldname} className="px-4 py-3 text-left text-sm font-bold text-black uppercase">{c.label}</th>)}</tr></thead>
//                                     <tbody className="divide-y-2 divide-black bg-white">
//                                     {sanction.sanctioned_budget_breakup.map((row: any, i: number) => (
//                                         <tr key={i} className="divide-x-2 divide-black hover:bg-[#CFD8DC]">{budgetColumns.map(c => <td key={c.fieldname} className="px-4 py-3 text-sm text-gray-800 font-mono">{row[c.fieldname]}</td>)}</tr>
//                                     ))}
//                                     </tbody>
//                                 </table>
//                             </div>
//                         </div>
//                       )}

//                       {/* === ATTACHED FILES (CLEANER DESIGN) === */}
//                       {(sanction.sanction_related_files?.length > 0) && (
//                         <div>
//                           <h4 className="text-lg font-bold text-black uppercase mb-3">Attached Files</h4>
//                           <div className="space-y-3">
//                             {sanction.sanction_related_files.map((file: any, i: number) => (
//                               <div key={i} className="flex items-center justify-between gap-4 p-3 border-2 border-gray-300 rounded-md bg-white">
//                                 <div className="flex-1">
//                                   <p className="font-bold text-gray-800">{file.file_name || 'File'}</p>
//                                   <p className="text-sm text-gray-600 font-mono">{file.description}</p>
//                                 </div>
//                                 {file.file_data ? (
//                                   <a
//                                     href={`data:${getMimeType(file.file_name)};base64,${file.file_data}`}
//                                     download={file.file_name}
//                                     className="flex items-center gap-2 px-4 py-2 font-semibold text-white bg-cyan-600 border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:bg-cyan-700 active:translate-y-px"
//                                   >
//                                     <DownloadIcon className="h-4 w-4" /> Download
//                                   </a>
//                                 ) : <span className="text-sm text-red-500">Could not load</span>}
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       )}
//                     </NeoCard>
//                   ))
//                 ) : (
//                   <div className="text-center py-12 text-gray-600 border-2 border-dashed border-black rounded-md bg-white">
//                     <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                     <p className="font-bold text-lg">No Sanction Details Found</p>
//                     <p className="text-sm mt-1">Click "Add Sanction" to create the first entry for this project.</p>
//                   </div>
//                 )}
//               </div>
//             )}
            
//             {activeTab === "activity" && (
//               <ActivityStream
//                 ref={activityStreamRef}
//                 doctype="Project Registration"
//                 docname={projectName!}
//               />
//             )}
//           </div>
//         </div>
//       </>
//     );
//   };

//   return (
//     <div className="bg-[#FDFCEC]">
//       <AppSidebar isPermanentEmployee={true} />
//       <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//         {renderContent()}
//       </main>
//     </div>
//   );
// };

// export default ProjectDetailsOverview;



//  status updated

import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useRef,
  useEffect,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useFrappeGetDoc,
  useFrappePostCall,
  useFrappeGetCall,
  useFrappeAuth,
} from "frappe-react-sdk";
import { Textarea } from "@/components/ui/textarea";
import { AppSidebar } from "../components/RndSidebar";
import {
  ArrowLeftIcon,
  FileTextIcon,
  UsersIcon,
  DollarSignIcon,
  ShieldIcon,
  MessageSquareIcon,
  DownloadIcon,
  CalendarIcon,
  UserIcon,
  BuildingIcon,
  CreditCardIcon,
  UploadIcon,
  ShoppingCartIcon,
  UsersIcon as UsersGroupIcon,
  PlaneIcon,
  PlusIcon,
  FilePlusIcon,
  MapPinIcon,
  MailIcon,
  GlobeIcon,
  TargetIcon,
  ClockIcon,
  CheckCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Interfaces ---
interface ActivityItem {
  owner: string;
  creation: string;
  content: string;
  comment_type: string;
}
interface ActivityStreamProps {
  doctype: string;
  docname: string;
}
interface ActivityStreamHandle {
  refetch: () => void;
}
interface ProjectDetailsProps {}

// --- Section Wrapper Component for better organization ---
const SectionWrapper = ({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "p-4 md:p-6 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]",
      className
    )}
  >
    <div className="flex items-center gap-3 mb-4">
      <Icon className="h-5 w-5 text-black" />
      <h3 className="text-xl font-bold text-black uppercase">{title}</h3>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

// --- FieldDisplay Component ---
const FieldDisplay = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: any;
  icon?: any;
}) => {
  if (!value && value !== 0 && value !== "No") return null;
  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-4 w-4 text-black" />}
        <p className="text-sm font-bold text-black uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className="bg-[#ECEFF1] p-2 text-base text-gray-800 font-mono">{String(value)}</p>
    </div>
  );
};

// --- NeoCard Component ---
const NeoCard = ({ children, className }: any) => ( <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> );


// --- Styled Helper Components ---
const HtmlContent = ({
  title,
  htmlString,
  icon: Icon,
}: {
  title: string;
  htmlString: string | undefined;
  icon?: any;
}) => {
  if (!htmlString) return null;
  return (
    <SectionWrapper title={title} icon={Icon}>
      <div
        className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-mono"
        dangerouslySetInnerHTML={{ __html: htmlString }}
      />
    </SectionWrapper>
  );
};

const TableDisplay = ({
  label,
  data,
  columns,
  icon: Icon,
}: {
  label: string;
  data: any[] | undefined;
  columns: { fieldname: string; label: string }[];
  icon?: any;
}) => {
  if (!data || data.length === 0) return null;
  return (
    <SectionWrapper title={label} icon={Icon}>
      <div className="overflow-x-auto border-2 border-black rounded-md">
        <table className="min-w-full divide-y-2 divide-black">
          <thead className="bg-[#90A4AE]">
            <tr className="divide-x-2 divide-black">
              {columns.map((col) => (
                <th
                  key={col.fieldname}
                  className="px-4 py-3 text-left text-sm font-bold text-black uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black bg-white">
            {data.map((row, index) => (
              <tr
                key={index}
                className="divide-x-2 divide-black hover:bg-[#CFD8DC]"
              >
                {columns.map((col) => (
                  <td
                    key={col.fieldname}
                    className="px-4 py-3 text-sm text-gray-800 font-mono"
                  >
                    {row[col.fieldname]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionWrapper>
  );
};

const NeoButton = ({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      "px-5 py-3 bg-white border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all",
      "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
      "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300",
      className
    )}
    {...props}
  >
    {children}
  </button>
);

// --- Activity Stream Component ---
const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(
  ({ doctype, docname }, ref) => {
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{ message: ActivityItem[] }>(
      "rndopsapp.rndopsapp.api.get_project_activity",
      { doctype, docname }
    );
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");
    
    useImperativeHandle(ref, () => ({ refetch() { refetchActivity(); } }));
    
    const handleCommentSubmit = async () => {
      if (!newComment.trim()) return;
      setIsSubmitting(true);
      try {
        await addComment({
          doctype: doctype,
          docname: docname,
          comment: newComment,
        });
        setNewComment("");
        refetchActivity();
      } catch (error) {
        console.error("Failed to add comment:", error);
      } finally {
        setIsSubmitting(false);
      }
    };
    
    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        handleCommentSubmit();
      }
    };

    return (
      <div className="space-y-6">
        <div className="p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
          <label htmlFor="comment-textarea" className="block text-sm font-bold text-black mb-3 uppercase">
            Add a comment
          </label>
          <Textarea
            id="comment-textarea"
            placeholder="Type here... (Ctrl+Enter to submit)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isSubmitting}
            className="resize-none bg-white p-3 border-2 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
            rows={4}
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-600 font-mono">{newComment.length}/1000</span>
            <NeoButton onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()} className="bg-cyan-300 hover:bg-cyan-400">
              {isSubmitting ? "Submitting..." : "Submit"}
            </NeoButton>
          </div>
        </div>
        <div className="space-y-4">
          {activityData?.message?.map((item, index) => (
            <div
              key={`${item.creation}-${index}`}
              className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
            >
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-cyan-300 border-2 border-black flex items-center justify-center font-bold text-black text-xl">
                {item.owner?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-base font-bold text-black">{item.owner || "Unknown User"}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1.5 font-mono">
                    <ClockIcon className="h-4 w-4" />
                    {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
                  </p>
                </div>
                <div className="text-base text-gray-800 prose prose-sm max-w-none leading-relaxed font-mono"
                  dangerouslySetInnerHTML={{ __html: item.content || "No content" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
ActivityStream.displayName = "ActivityStream";

// --- Workflow Actions Component ---
const WorkflowActions = ({ docname, onAction, isLoading }: { docname: string; onAction: (action: string) => void; isLoading: boolean; }) => {
  const { data } = useFrappeGetCall<{ message: string[] }>(
    "rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions",
    { docname }
  );
  if (!data?.message || data.message.length === 0) return null;
  return (
    <div className="flex items-center gap-3">
      {data.message.map((actionString: string) => (
        <NeoButton key={actionString} onClick={() => onAction(actionString)} className={cn("bg-yellow-200 hover:bg-yellow-300")} disabled={isLoading}>
          {isLoading ? "Processing..." : actionString}
        </NeoButton>
      ))}
    </div>
  );
};

// --- Main Component ---
const ProjectDetailsOverview: React.FC<ProjectDetailsProps> = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const activityStreamRef = useRef<ActivityStreamHandle>(null);
  const { currentUser } = useFrappeAuth();
  const { data, error, isLoading, mutate } = useFrappeGetDoc(
    "Project Registration",
    projectName ?? ""
  );
  const { call: triggerWorkflowAction, loading: isActionLoading } = useFrappePostCall("rndopsapp.rndopsapp.api.handle_workflow_action");
  const { call: submitProjectRegistration } = useFrappePostCall("rndopsapp.rndopsapp.api.submit_project_registration");

  const { data: sanctionData, error: sanctionError, isLoading: sanctionIsLoading, mutate: refetchSanctions } = useFrappeGetCall(
    'rndopsapp.api.get_sanctions_for_project',
    { project_name: projectName },
    { revalidateOnFocus: true }
  );
  
  useEffect(() => {
      refetchSanctions();
  }, [refetchSanctions]); 
  
  const handleWorkflowAction = useCallback(
    (action: string) => {
      const apiCall =
        action.toLowerCase() === "submit"
          ? submitProjectRegistration({ doc_data: projectName })
          : triggerWorkflowAction({
              doctype: "Project Registration",
              docname: projectName,
              action: action,
            });
      apiCall
        .then(() => {
          mutate();
          activityStreamRef.current?.refetch();
        })
        .catch((err: any) =>
          console.error(`Error during workflow action:`, err)
        );
    },
    [triggerWorkflowAction, submitProjectRegistration, mutate, projectName]
  );
  
  const isCurrentUserPI = currentUser && data?.pi_webmail === currentUser;
  const handleAddFunds = () => alert("Add Funds functionality will be implemented here.");
  const handleAddSanctionDetails = () => {
    navigate(`/project-details-overview/${projectName}/add-fund-sanction`);
  }; 

  const tabs = [
    { id: "overview", label: "Overview", icon: FileTextIcon },
    { id: "sanction-details", label: "Sanction Details", icon: CreditCardIcon },
    { id: "activity", label: "Activity Log", icon: MessageSquareIcon },
  ];

  // Helper function to create download links from Base64 data
  const getMimeType = (fileName = "") => {
    if (fileName.endsWith('.pdf')) return 'application/pdf';
    if (fileName.endsWith('.png')) return 'image/png';
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  };

  // Helper function to get a colored badge for the status
  const getStatusBadgeClass = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'draft':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <p className="text-lg font-semibold">Loading Project Details...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="p-8 text-center">
          <p className="text-lg font-semibold text-red-600">Error loading project: {error.message}</p>
        </div>
      );
    }

    return (
      <>
        <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/projects-view")}
                className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-extrabold text-black">{data?.project_title || "Project Details"}</h1>
                <p className="text-gray-700 font-mono mt-1">ID: {projectName} | Status: <span className="font-bold text-black">{data?.workflow_state || "Draft"}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {isCurrentUserPI && (
                <div className="flex gap-3">
                  <NeoButton
                    onClick={handleAddFunds}
                     className="bg-[#A5D6A7] hover:bg-[#81C784] flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" /> Add Funds
                  </NeoButton>
                  <NeoButton
                    onClick={handleAddSanctionDetails}
                     className="bg-[#A5D6A7] hover:bg-[#81C784] flex items-center gap-2"
                  >
                    <FilePlusIcon className="h-4 w-4" /> Add Sanction
                  </NeoButton>
                </div>
              )}
              <WorkflowActions docname={projectName!} onAction={handleWorkflowAction} isLoading={isActionLoading} />
            </div>
          </div>
        </header>

        <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
          <div className="border-b-2 border-black">
            <nav className="flex space-x-2 p-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-2 py-3 px-4 font-bold text-sm rounded-md border-2 border-transparent transition-all",
                    activeTab === tab.id
                      ? "bg-[#90A4AE] border-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
                      : "text-black hover:bg-[#CFD8DC]"
                  )}
                >
                  <tab.icon className="h-5 w-5" /> {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="bg-[#F5F5F5] p-6 md:p-8">
            {activeTab === "overview" && (
              <div className="space-y-8">
                <SectionWrapper title="General Information" icon={FileTextIcon}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                    <FieldDisplay label="Project Type" value={data?.project_type} icon={FileTextIcon} />
                    <FieldDisplay label="Implementation Dept" value={data?.implementation_department} icon={BuildingIcon} />
                    <FieldDisplay label="Status" value={data?.workflow_state} icon={TargetIcon} />
                    <FieldDisplay label="Project Duration" value={`${data?.project_duration_months}m ${data?.project_duration_days || 0}d`} icon={CalendarIcon}/>
                    <FieldDisplay label="International Travel" value={data?.involves_international_travel} icon={PlaneIcon} />
                  </div>
                </SectionWrapper>
                
                <SectionWrapper title="Funding Agency" icon={BuildingIcon}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                    <FieldDisplay label="Agency Name" value={data?.funding_agen} icon={BuildingIcon} />
                    <FieldDisplay label="Agency Type" value={data?.funding_agency_type} icon={UsersIcon} />
                    <FieldDisplay label="Origin" value={data?.origin_of_funding_agency} icon={GlobeIcon} />
                    <FieldDisplay label="Ministry" value={data?.funding_agency_ministry} icon={BuildingIcon} />
                    <FieldDisplay label="Scheme" value={data?.funding_agency_schemes} icon={FileTextIcon} />
                    <FieldDisplay label="Address" value={`${data?.address_street_village_locality}, ${data?.address_state}, ${data?.address_country} - ${data?.address_postal_code}`} icon={MapPinIcon}/>
                  </div>
                </SectionWrapper>

                <SectionWrapper title="Investigators" icon={UsersIcon}>
                  <h4 className="font-bold text-lg text-black uppercase">Principal Investigator (PI)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                    <FieldDisplay label="Name" value={data?.principal_investigator_name} icon={UserIcon} />
                    <FieldDisplay label="Email" value={data?.pi_webmail} icon={MailIcon} />
                    <FieldDisplay label="Employee ID" value={data?.pi_employee_id} icon={UserIcon} />
                    <FieldDisplay label="Designation" value={data?.designation} icon={UsersIcon} />
                    <FieldDisplay label="Department" value={data?.applicant_department} icon={BuildingIcon} />
                  </div>
                </SectionWrapper>
                {data?.is_additional_pi === "Yes" && <TableDisplay label="Additional PIs" data={data?.additional_pi_table} columns={[ { fieldname: "pi_name", label: "Name" }, { fieldname: "pi_designation", label: "Designation" }, { fieldname: "pi_email", label: "Email" }, ]} icon={UsersIcon} />}
                {data?.has_co_pi === "Yes" && <TableDisplay label="Co-Investigators" data={data?.co_investigator_table} columns={[ { fieldname: "copi_name", label: "Name" }, { fieldname: "copi_designation", label: "Designation" }, { fieldname: "copi_email", label: "Email" }, ]} icon={UsersIcon} />}
                
                <TableDisplay label="Proposed Budget Breakup" data={data?.proposed_budget_breakup} columns={[ { fieldname: "account_head", label: "Budget Head" }, { fieldname: "first_year_budget", label: "Year 1" }, { fieldname: "second_year_budget", label: "Year 2" }, ]} icon={DollarSignIcon} />
                {data?.equipment_checkbox === 1 && <TableDisplay label="Proposed Equipment" data={data?.proposed_equipment_details} columns={[ { fieldname: "item_name", label: "Equipment Name" }, { fieldname: "equip_total_unit_cost", label: "Cost" }, ]} icon={ShoppingCartIcon} />}
                {data?.manpower_checkbox === 1 && <TableDisplay label="Proposed Manpower" data={data?.proposed_manpower_details} columns={[ { fieldname: "designation_name", label: "Position" }, { fieldname: "manpower_salary", label: "Salary" }, ]} icon={UsersGroupIcon} />}
                
                <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} icon={FileTextIcon} />
                <HtmlContent title="Project Objective" htmlString={data?.project_objective} icon={TargetIcon} />
                <HtmlContent title="Project Deliverables" htmlString={data?.project_deliverables} icon={CheckCircleIcon} />
                
                <SectionWrapper title="Clearance Details" icon={ShieldIcon}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                    <FieldDisplay label="Needs Committee Clearance" value={data?.needs_committee_clearance} icon={ShieldIcon} />
                    <FieldDisplay label="Committee" value={data?.committees} icon={UsersIcon} />
                    <FieldDisplay label="Ethics Committee Details" value={data?.ethics_committee_details} icon={FileTextIcon} />
                    <FieldDisplay label="Biosafety Category" value={data?.biosafety_category} icon={ShieldIcon} />
                    <FieldDisplay label="Needs Endorsement" value={data?.need_endorsement_copy} icon={CheckCircleIcon} />
                  </div>
                </SectionWrapper>
              </div>
            )}

            {/* --- REVISED SANCTION DETAILS TAB WITH TOTALS --- */}
            {activeTab === "sanction-details" && (
              <div className="space-y-8">
                {sanctionIsLoading && <p>Loading Sanction Details...</p>}
                {sanctionError && <p className="text-red-600">Error: {sanctionError.message}</p>}
                
                {sanctionData?.message && sanctionData.message.length > 0 ? (
                  sanctionData.message.map((sanction: any) => {

                    const budgetColumns = [
                      { fieldname: "account_head", label: "Account Head" },
                      { fieldname: "first_year_budget", label: "Year 1" },
                      { fieldname: "second_year_budget", label: "Year 2" },
                      { fieldname: "third_year_budget", label: "Year 3" },
                    ];
                    const budgetYearFieldnames = budgetColumns.filter(c => c.fieldname !== 'account_head').map(c => c.fieldname);

                    // Calculate column totals for the footer
                    const columnTotals: { [key: string]: number } = budgetYearFieldnames.reduce((totals: { [key: string]: number }, fieldname) => {
                      totals[fieldname] = (sanction.sanctioned_budget_breakup || []).reduce((sum: number, row: any) => {
                        return sum + (parseFloat(row[fieldname]) || 0);
                      }, 0);
                      return totals;
                    }, {});

                    // Calculate the final grand total for the footer
                    const grandTotal = Object.values(columnTotals).reduce((sum: number, total: any) => sum + total, 0);

                    return (
                      <NeoCard key={sanction.name} className="space-y-6">
                        {/* === MODIFIED HEADER WITH STATUS === */}
                        <div className="pb-4 border-b-2 border-black">
                          <h3 className="text-xl font-bold uppercase text-black">
                            Sanction Reference No: {sanction.name}
                          </h3>
                          <div className="font-mono text-sm text-gray-700 mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <span>
                              Status: <span className={cn("font-bold uppercase px-2 py-1 rounded-md text-xs", getStatusBadgeClass(sanction.workflow_state))}>{sanction.workflow_state || 'DRAFT'}</span>
                            </span>
                            <span>
                              Letter No: <span className="font-semibold text-gray-800">{sanction.sanctioned_letter_no}</span>
                            </span>
                            <span>
                              Date: <span className="font-semibold text-gray-800">{sanction.sanctioned_letter_date}</span>
                            </span>
                            <span>
                              Amount: <span className="font-semibold text-gray-800">{(sanction.total_sanctioned_amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                            </span>
                          </div>
                        </div>

                        {/* === BUDGET TABLE (WITH TOTALS) === */}
                        {(sanction.sanctioned_budget_breakup?.length > 0) && (
                          <div>
                              <h4 className="text-lg font-bold text-black uppercase mb-3">Budget Breakup</h4>
                              <div className="overflow-x-auto border-2 border-black rounded-md">
                                  <table className="min-w-full divide-y-2 divide-black">
                                      <thead className="bg-[#90A4AE]">
                                        <tr className="divide-x-2 divide-black">
                                          {budgetColumns.map(c => (
                                            <th key={c.fieldname} className="px-4 py-3 text-left text-sm font-bold text-black uppercase">{c.label}</th>
                                          ))}
                                          <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y-2 divide-black bg-white">
                                      {(sanction.sanctioned_budget_breakup || []).map((row: any, i: number) => {
                                        const rowTotal = budgetYearFieldnames.reduce((sum, fieldname) => {
                                          return sum + (parseFloat(row[fieldname]) || 0);
                                        }, 0);

                                        return (
                                          <tr key={i} className="divide-x-2 divide-black hover:bg-[#CFD8DC]">
                                            {budgetColumns.map(c => (
                                              <td key={c.fieldname} className="px-4 py-3 text-sm text-gray-800 font-mono">
                                                {c.fieldname === 'account_head' ? row[c.fieldname] : (parseFloat(row[c.fieldname]) || 0).toLocaleString('en-IN')}
                                              </td>
                                            ))}
                                            <td className="px-4 py-3 text-sm text-gray-800 font-mono font-bold">{rowTotal.toLocaleString('en-IN')}</td>
                                          </tr>
                                        );
                                      })}
                                      </tbody>
                                      <tfoot className="bg-gray-200 border-t-4 border-black">
                                        <tr className="divide-x-2 divide-black">
                                          <td className="px-4 py-3 font-bold text-black uppercase">Total</td>
                                          {budgetYearFieldnames.map(fieldname => (
                                            <td key={fieldname} className="px-4 py-3 text-sm font-mono font-bold text-black">
                                              {columnTotals[fieldname].toLocaleString('en-IN')}
                                            </td>
                                          ))}
                                          <td className="px-4 py-3 text-sm font-mono font-extrabold text-black">
                                            {grandTotal.toLocaleString('en-IN')}
                                          </td>
                                        </tr>
                                      </tfoot>
                                  </table>
                              </div>
                          </div>
                        )}

                        {/* === ATTACHED FILES (CLEANER DESIGN) === */}
                        {(sanction.sanction_related_files?.length > 0) && (
                          <div>
                            <h4 className="text-lg font-bold text-black uppercase mb-3">Attached Files</h4>
                            <div className="space-y-3">
                              {sanction.sanction_related_files.map((file: any, i: number) => (
                                <div key={i} className="flex items-center justify-between gap-4 p-3 border-2 border-gray-300 rounded-md bg-white">
                                  <div className="flex-1">
                                    <p className="font-bold text-gray-800">{file.file_name || 'File'}</p>
                                    <p className="text-sm text-gray-600 font-mono">{file.description}</p>
                                  </div>
                                  {file.file_data ? (
                                    <a
                                      href={`data:${getMimeType(file.file_name)};base64,${file.file_data}`}
                                      download={file.file_name}
                                      className="flex items-center gap-2 px-4 py-2 font-semibold text-white bg-cyan-600 border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:bg-cyan-700 active:translate-y-px"
                                    >
                                      <DownloadIcon className="h-4 w-4" /> Download
                                    </a>
                                  ) : <span className="text-sm text-red-500">Could not load</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </NeoCard>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-600 border-2 border-dashed border-black rounded-md bg-white">
                    <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="font-bold text-lg">No Sanction Details Found</p>
                    <p className="text-sm mt-1">Click "Add Sanction" to create the first entry for this project.</p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "activity" && (
              <ActivityStream
                ref={activityStreamRef}
                doctype="Project Registration"
                docname={projectName!}
              />
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="bg-[#FDFCEC]">
      <AppSidebar isPermanentEmployee={true} />
      <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default ProjectDetailsOverview;
