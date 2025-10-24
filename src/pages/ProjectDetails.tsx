

// // -=-=-=-=-=-=- Add sanction and Funds



// import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useFrappeGetDoc, useFrappePostCall, useFrappeGetCall, useFrappeAuth } from 'frappe-react-sdk';
// import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { AppSidebar } from "../components/RndSidebar";
// import { useUserRoles } from "../components/UserRole";
// import { 
//   ArrowLeftIcon, 
//   CalendarIcon, 
//   UserIcon, 
//   BuildingIcon, 
//   DollarSignIcon,
//   FileTextIcon,
//   UsersIcon,
//   ShieldIcon,
//   MessageSquareIcon,
//   ClockIcon,
//   CheckCircleIcon,
//   XCircleIcon,
//   PlayCircleIcon,
//   RefreshCwIcon,
//   SendIcon,
//   ChevronDownIcon,
//   ChevronRightIcon,
//   PlusIcon,
//   FilePlusIcon
// } from 'lucide-react';
// import { cn } from '@/lib/utils';

// // --- Interfaces ---
// interface ActivityItem {
//     owner: string;
//     creation: string;
//     content: string;
//     comment_type: string;
// }

// interface WorkflowAction {
//   action: string;
//   label: string;
// }

// interface ActivityStreamProps {
//   doctype: string;
//   docname: string;
// }

// interface ActivityStreamHandle {
//   refetch: () => void;
// }

// interface ProjectDetailsProps {
//   // projectName and onBack are now handled internally
// }

// // --- Helper Components ---
// const FieldDisplay = ({ label, value, isCurrency = false, icon: Icon }: { label: string; value: any; isCurrency?: boolean; icon?: any }) => {
//   if (!value && value !== 0) return null;
//   const displayValue = isCurrency ? `₹ ${Number(value).toLocaleString('en-IN')}` : String(value);
//   return (
//     <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
//       <div className="flex items-center gap-2 mb-2">
//         {Icon && <Icon className="h-4 w-4 text-blue-600" />}
//         <p className="text-sm font-semibold text-gray-700">{label}</p>
//       </div>
//       <p className="text-lg font-medium text-gray-900">{displayValue}</p>
//     </div>
//   );
// };

// // Collapsible Section Component
// const CollapsibleSection = ({ 
//   title, 
//   icon: Icon, 
//   children, 
//   defaultOpen = true,
//   actionButtons,
//   className 
// }: { 
//   title: string; 
//   icon?: any; 
//   children: React.ReactNode;
//   defaultOpen?: boolean;
//   actionButtons?: React.ReactNode;
//   className?: string;
// }) => {
//   const [isOpen, setIsOpen] = useState(defaultOpen);

//   return (
//     <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden", className)}>
//       <div 
//         className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
//         onClick={() => setIsOpen(!isOpen)}
//       >
//         <div className="flex items-center gap-3">
//           {Icon && <div className="p-2 bg-blue-100 rounded-lg"><Icon className="h-5 w-5 text-blue-600" /></div>}
//           <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
//         </div>
//         <div className="flex items-center gap-3">
//           {actionButtons}
//           <div className={cn("transition-transform duration-200", isOpen ? "rotate-0" : "-rotate-90")}>
//             <ChevronDownIcon className="h-5 w-5 text-gray-600" />
//           </div>
//         </div>
//       </div>
//       {isOpen && (
//         <div className="px-6 pb-6">
//           {children}
//         </div>
//       )}
//     </div>
//   );
// };

// const HtmlContent = ({ title, htmlString, icon: Icon }: { title: string, htmlString: string | undefined, icon?: any }) => {
//   if (!htmlString) return null;
//   return (
//     <div className="mt-6 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
//       <div className="flex items-center gap-2 mb-4">
//         {Icon && <Icon className="h-4 w-4 text-blue-600" />}
//         <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
//       </div>
//       <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: htmlString }} />
//     </div>
//   );
// };

// const TableDisplay = ({ label, data, columns, icon: Icon }: { label: string; data: any[] | undefined; columns: { fieldname: string, label: string, isCurrency?: boolean }[]; icon?: any }) => {
//   if (!data || data.length === 0) return null;
//   return (
//     <div className="my-6">
//       <div className="flex items-center gap-2 mb-4">
//         {Icon && <Icon className="h-4 w-4 text-blue-600" />}
//         <p className="text-lg font-semibold text-gray-800">{label}</p>
//       </div>
//       <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
//         <table className="min-w-full divide-y divide-gray-200 bg-white">
//           <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
//             <tr>
//               {columns.map(col => (
//                 <th key={col.fieldname} scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
//                   {col.label}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-200 bg-white">
//             {data.map((row, index) => (
//               <tr key={index} className="hover:bg-gray-50 transition-colors">
//                 {columns.map(col => (
//                   <td key={col.fieldname} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
//                     {col.isCurrency ? `₹ ${Number(row[col.fieldname] || 0).toLocaleString('en-IN')}` : row[col.fieldname]}
//                   </td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// // --- Action Buttons Component ---
// const ActionButtons = ({ actions, onAction, isLoading }: { actions: WorkflowAction[], onAction: (action: string) => void, isLoading: boolean }) => {
//   if (!actions || actions.length === 0) {
//     return null;
//   }

//   const getButtonClass = (actionName: string | undefined | null) => {
//     switch ((actionName || '').toLowerCase()) {
//       case 'approve':
//       case 'submit':
//         return 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all';
//       case 'reject':
//         return 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all';
//       case 'cancel':
//         return 'bg-gray-600 hover:bg-gray-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all';
//       default:
//         return 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all';
//     }
//   };

//   return (
//     <div className="flex items-center gap-3 no-print">
//       {actions.map((actionItem: WorkflowAction) => (
//         <Button
//           key={actionItem.action}
//           onClick={() => onAction(actionItem.action)}
//           className={cn("text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200", getButtonClass(actionItem.action))}
//           disabled={isLoading}
//         >
//           {isLoading ? (
//             <div className="flex items-center gap-2">
//               <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
//               Processing...
//             </div>
//           ) : (
//             <div className="flex items-center gap-2">
//               {actionItem.action.toLowerCase() === 'approve' && <CheckCircleIcon className="h-4 w-4" />}
//               {actionItem.action.toLowerCase() === 'reject' && <XCircleIcon className="h-4 w-4" />}
//               {actionItem.action.toLowerCase() === 'submit' && <PlayCircleIcon className="h-4 w-4" />}
//               {actionItem.label || actionItem.action}
//             </div>
//           )}
//         </Button>
//       ))}
//     </div>
//   );
// };

// // --- Activity Stream Component ---
// const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(({ doctype, docname }, ref) => {
//   const [newComment, setNewComment] = useState('');
//   const [refreshTrigger, setRefreshTrigger] = useState(0);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const { 
//     data: activityData, 
//     mutate: refetchActivity, 
//     error: activityError, 
//     isLoading: isActivityLoading 
//   } = useFrappeGetCall<{ message: ActivityItem[] }>(
//     'rndopsapp.rndopsapp.api.get_project_activity',
//     { doctype, docname },
//     { 
//       enabled: !!docname,
//       revalidateOnFocus: true,
//       revalidateOnReconnect: true,
//       refreshWhenHidden: false,
//       refreshWhenOffline: false,
//       revalidateOnMount: true
//     }
//   );

//   // Auto-refresh every 30 seconds
//   useEffect(() => {
//     const interval = setInterval(() => {
//       refetchActivity();
//     }, 30000);

//     return () => clearInterval(interval);
//   }, [refetchActivity]);

//   // Manual refresh function
//   const handleManualRefresh = useCallback(() => {
//     setRefreshTrigger(prev => prev + 1);
//     refetchActivity();
//   }, [refetchActivity]);

//   useImperativeHandle(ref, () => ({
//     refetch() {
//       handleManualRefresh();
//     }
//   }));

//   const { call: addComment, loading: isCommenting } = useFrappePostCall(
//     'rndopsapp.rndopsapp.api.add_project_comment'
//   );

//   const handleCommentSubmit = async () => {
//     if (!newComment.trim()) {
//       alert("Please enter a comment before submitting.");
//       return;
//     }

//     setIsSubmitting(true);
    
//     try {
//       console.log("Submitting comment:", {
//         doctype,
//         docname,
//         content: newComment.trim()
//       });

//       const result = await addComment({
//         doctype,
//         docname,
//         content: newComment.trim()
//       });

//       console.log("Comment submitted successfully:", result);
      
//       // Clear the textarea
//       setNewComment('');
      
//       // Force refresh after adding comment
//       await refetchActivity();
      
//       // Show success message
//       alert("Comment added successfully!");
      
//     } catch (err: any) {
//       console.error("Failed to add comment:", err);
      
//       // More detailed error handling
//       let errorMessage = "Error: Could not post comment.";
//       if (err.message) {
//         errorMessage = `Error: ${err.message}`;
//       } else if (err.exc) {
//         errorMessage = `Error: ${err.exc}`;
//       }
      
//       alert(errorMessage);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Handle Enter key press for comment submission
//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
//       handleCommentSubmit();
//     }
//   };

//   return (
//     <Card className="sticky top-8 border-0 shadow-xl bg-gradient-to-b from-white to-blue-50/30">
//       <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
//         <div className="flex items-center justify-between">
//           <CardTitle className="flex items-center gap-2 text-white">
//             <MessageSquareIcon className="h-5 w-5" />
//             Activity & Comments
//           </CardTitle>
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={handleManualRefresh}
//             disabled={isActivityLoading}
//             className="text-white hover:bg-white/20 p-2 h-8 w-8"
//             title="Refresh activities"
//           >
//             <RefreshCwIcon className={cn("h-4 w-4", isActivityLoading && "animate-spin")} />
//           </Button>
//         </div>
//       </CardHeader>
//       <CardContent className="p-6">
//         <div className="space-y-6">
//           {/* Comment Input Section */}
//           <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
//             <div className="mb-3">
//               <label htmlFor="comment-textarea" className="block text-sm font-medium text-gray-700 mb-2">
//                 Add a comment
//               </label>
//               <Textarea
//                 id="comment-textarea"
//                 placeholder="Type your comment here... (Press Ctrl+Enter to submit)"
//                 value={newComment}
//                 onChange={(e) => setNewComment(e.target.value)}
//                 onKeyDown={handleKeyPress}
//                 disabled={isSubmitting}
//                 className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors"
//                 rows={4}
//               />
//             </div>
//             <div className="flex items-center justify-between">
//               <span className="text-xs text-gray-500">
//                 {newComment.length}/1000 characters
//               </span>
//               <Button 
//                 onClick={handleCommentSubmit} 
//                 disabled={isSubmitting || !newComment.trim()}
//                 className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
//               >
//                 {isSubmitting ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
//                     Submitting...
//                   </>
//                 ) : (
//                   <>
//                     <SendIcon className="h-4 w-4" />
//                     Submit Comment
//                   </>
//                 )}
//               </Button>
//             </div>
//           </div>

//           {/* Activity List */}
//           <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 border-t pt-4">
//             {isActivityLoading ? (
//               <div className="flex justify-center py-8">
//                 <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
//               </div>
//             ) : activityError ? (
//               <div className="text-center py-8 text-red-600 bg-red-50 rounded-lg p-4">
//                 <p className="font-medium">Failed to load activities</p>
//                 <p className="text-sm mt-1">Please try refreshing</p>
//                 <Button 
//                   variant="outline" 
//                   size="sm" 
//                   onClick={handleManualRefresh}
//                   className="mt-2"
//                 >
//                   Retry
//                 </Button>
//               </div>
//             ) : activityData?.message && activityData.message.length > 0 ? (
//               <div className="space-y-4">
//                 <div className="flex items-center justify-between text-sm text-gray-500">
//                   <span>{activityData.message.length} comment(s)</span>
//                   <span>Latest activity</span>
//                 </div>
//                 {activityData.message.map((item, index) => (
//                   <div key={`${item.creation}-${index}`} className="flex items-start gap-3 group">
//                     <div className="flex-shrink-0">
//                       <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md">
//                         {item.owner?.charAt(0).toUpperCase() || 'U'}
//                       </div>
//                     </div>
//                     <div className="flex-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow">
//                       <div className="flex justify-between items-center mb-2">
//                         <p className="text-sm font-semibold text-gray-900">{item.owner || 'Unknown User'}</p>
//                         <p className="text-xs text-gray-500 flex items-center gap-1">
//                           <ClockIcon className="h-3 w-3" />
//                           {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
//                         </p>
//                       </div>
//                       <div
//                         className="text-sm text-gray-700 prose prose-sm max-w-none leading-relaxed"
//                         dangerouslySetInnerHTML={{ __html: item.content || 'No content' }}
//                       />
//                       {item.comment_type && (
//                         <div className="mt-2">
//                           <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
//                             {item.comment_type}
//                           </span>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <div className="text-center py-8">
//                 <MessageSquareIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
//                 <p className="text-gray-500 font-medium">No activity yet</p>
//                 <p className="text-sm text-gray-400">Be the first to add a comment</p>
//               </div>
//             )}
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// });

// ActivityStream.displayName = 'ActivityStream';

// const LogWorkflowActions = ({ docname, onAction, isLoading: isActionLoading }: { docname: string, onAction: (action: string) => void, isLoading: boolean }) => {
//   const { data, error, isLoading } = useFrappeGetCall<{ message: string[] }>(
//     'rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions',
//     { docname }
//   );

//   useEffect(() => {
//     if (data) {
//       console.log('✅ Allowed Actions (from LogWorkflowActions):', data);
//       console.log('✅ Allowed Actions (from LogWorkflowActions):', data.message);
//     }
//     if (error) {
//       console.error('❌ Error fetching workflow actions (from LogWorkflowActions):', error);
//     }
//   }, [data, error]);

//   const getButtonClass = (actionName: string | undefined | null) => {
//     switch ((actionName || '').toLowerCase()) {
//       case 'approve':
//       case 'submit':
//         return 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl';
//       case 'reject':
//         return 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl';
//       case 'cancel':
//         return 'bg-gray-600 hover:bg-gray-700 shadow-lg hover:shadow-xl';
//       default:
//         return 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl';
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex items-center gap-2 text-gray-600">
//         <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
//         Loading actions...
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
//         Error loading actions
//       </div>
//     );
//   }

//   if (!data?.message || data.message.length === 0) {
//     return null;
//   }

//   return (
//     <div className="flex items-center gap-3 no-print">
//       {data.message.map((actionString: string) => (
//         <Button
//           key={actionString}
//           onClick={() => onAction(actionString)}
//           className={cn("text-white font-semibold px-6 py-2 rounded-lg transform hover:-translate-y-0.5 transition-all", getButtonClass(actionString))}
//           disabled={isActionLoading}
//         >
//           {isActionLoading ? (
//             <div className="flex items-center gap-2">
//               <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
//               Processing...
//             </div>
//           ) : (
//             <div className="flex items-center gap-2">
//               {actionString.toLowerCase() === 'approve' && <CheckCircleIcon className="h-4 w-4" />}
//               {actionString.toLowerCase() === 'reject' && <XCircleIcon className="h-4 w-4" />}
//               {actionString.toLowerCase() === 'submit' && <PlayCircleIcon className="h-4 w-4" />}
//               {actionString}
//             </div>
//           )}
//         </Button>
//       ))}
//     </div>
//   );
// };

// // --- Main Component ---
// const ProjectDetailsView: React.FC<ProjectDetailsProps> = () => {
//   const { projectName } = useParams<{ projectName: string }>();
//   const navigate = useNavigate();
//   const handleBack = () => navigate('/projects-view');

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

//   const { data, error, isLoading, mutate } = useFrappeGetDoc('Project Registration', projectName ?? '', {
//     cacheTime: 0,
//     enabled: !!projectName,
//   });

//   // Check if current user is the PI of the project
//   const isCurrentUserPI = currentUser && data?.pi_webmail === currentUser;

//   useEffect(() => {
//     console.log("Project Registration - implementation_department:", data?.implementation_department);
//   }, [data?.implementation_department]);

//   const departmentId = data?.implementation_department;
//   const { data: departmentDoc, isLoading: isDepartmentLoading } = useFrappeGetDoc(
//     "Department_prornd",
//     departmentId,
//     { 
//       fields: ["dept_name"],
//       enabled: !!departmentId 
//     }
//   );

//   useEffect(() => {
//     console.log("ProjectDetails - departmentId:", departmentId);
//     console.log("ProjectDetails - departmentDoc:", departmentDoc);
//     console.log("ProjectDetails - isDepartmentLoading:", isDepartmentLoading);
//   }, [departmentId, departmentDoc, isDepartmentLoading]);

//   const activityStreamRef = useRef<ActivityStreamHandle>(null);

//   const { call: triggerWorkflowAction, loading: isActionLoading } = useFrappePostCall(
//     'rndopsapp.rndopsapp.api.handle_workflow_action'
//   );

//   const { call: submitProjectRegistration, loading: isSubmittingProject } = useFrappePostCall(
//     'rndopsapp.rndopsapp.api.submit_project_registration'
//   );

//   // New action handlers
//   const handleAddFunds = () => {
//     // Navigate to add funds page or open modal
//     alert("Add Funds functionality will be implemented here");
//     // navigate(`/add-funds/${projectName}`);
//   };

//   const handleAddSanctionDetails = () => {
//     // Navigate to add sanction details page or open modal
//     alert("Add Sanction Details functionality will be implemented here");
//     // navigate(`/add-sanction-details/${projectName}`);
//   };

//   const handleWorkflowAction = useCallback((action: string) => {
//     if (action.toLowerCase() === 'submit') {
//       submitProjectRegistration({
//         docname: projectName
//       }).then(() => {
//         alert("Project registration submitted successfully!");
//         mutate();
//         // Refresh activity stream after workflow action
//         activityStreamRef.current?.refetch();
//       }).catch((err: any) => {
//         console.error("Error submitting project registration:", err);
//         alert(`Failed to submit project registration: ${err.message || 'An unknown error occurred.'}`);
//       });
//     } else {
//       triggerWorkflowAction({
//         doctype: 'Project Registration',
//         docname: projectName,
//         action: action
//       }).then(() => {
//         alert(`Project action '${action}' completed successfully!`);
//         mutate();
//         // Refresh activity stream after workflow action
//         activityStreamRef.current?.refetch();
//       }).catch((err: any) => {
//         console.error(`Error during workflow action:`, err);
//         alert(`Failed to ${action} the project: ${err.message || 'An unknown error occurred.'}`);
//       });
//     }
//   }, [triggerWorkflowAction, submitProjectRegistration, mutate, projectName]);

//   const getStatusBadge = (status: string) => {
//     const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold";
//     switch ((status || '').toLowerCase()) {
//       case 'draft':
//         return cn(baseClasses, "bg-gray-100 text-gray-800 border border-gray-300");
//       case 'submitted':
//         return cn(baseClasses, "bg-blue-100 text-blue-800 border border-blue-300");
//       case 'under review':
//         return cn(baseClasses, "bg-yellow-100 text-yellow-800 border border-yellow-300");
//       case 'approved':
//         return cn(baseClasses, "bg-green-100 text-green-800 border border-green-300");
//       case 'rejected':
//         return cn(baseClasses, "bg-red-100 text-red-800 border border-red-300");
//       default:
//         return cn(baseClasses, "bg-gray-100 text-gray-800 border border-gray-300");
//     }
//   };

//   if (!projectName) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//         <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md w-full">
//           <FileTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//           <h2 className="text-2xl font-bold text-gray-800 mb-2">No Project Selected</h2>
//           <p className="text-gray-600 mb-6">Please select a project to view its details.</p>
//           <Button onClick={() => navigate('/projects-view')} className="bg-blue-600 hover:bg-blue-700">
//             Back to Projects
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
//           <p className="text-xl font-semibold text-gray-700">Loading Project Details...</p>
//           <p className="text-gray-500 mt-2">Please wait while we fetch the project information</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//         <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md w-full">
//           <XCircleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
//           <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Project</h2>
//           <p className="text-gray-600 mb-6">{error.message}</p>
//           <Button onClick={() => navigate('/projects-view')} className="bg-blue-600 hover:bg-blue-700">
//             Back to Projects
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <>
//       <style>{`
//           @media print {
//             .no-print { display: none !important; }
//             .print-wrapper { padding: 0 !important; }
//             .print-container { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 1rem !important; max-width: 100% !important; }
//             .print-container * { visibility: visible; }
//             body { background-color: white !important; }
//           }
//       `}</style>

//       <div>
//         <AppSidebar isPermanentEmployee={isPermanentEmployee} />
//         <div className="bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans print-wrapper flex-1">
//           <div className="max-w-7xl mx-auto">
//             {/* Header Section */}
//             <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-2xl p-6 sm:p-8 mb-8 text-white">
//               <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
//                 <div className="flex items-start gap-4 flex-1">
//                   <button
//                     onClick={handleBack}
//                     className="p-3 rounded-xl bg-white/20 hover:bg-white/30 transition-all duration-200 no-print mt-1"
//                     aria-label="Go back"
//                   >
//                     <ArrowLeftIcon className="h-5 w-5 text-white" />
//                   </button>
//                   <div className="flex-1">
//                     <h1 className="text-3xl font-bold mb-2">{data?.project_title || 'Project Details'}</h1>
//                     <div className="flex flex-wrap items-center gap-4 text-blue-100">
//                       <div className="flex items-center gap-2">
//                         <FileTextIcon className="h-4 w-4" />
//                         <span>Project ID: {projectName}</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <span className={cn("px-3 py-1 rounded-full text-sm font-semibold bg-white/20", getStatusBadge(data?.workflow_state))}>
//                           {data?.workflow_state}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//                 <div className="flex flex-col sm:flex-row gap-3">
//                   {/* New Action Buttons */}
//                   {isCurrentUserPI && (
//                     <div className="flex gap-2">
//                       <Button
//                         onClick={handleAddFunds}
//                         className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2"
//                       >
//                         <PlusIcon className="h-4 w-4" />
//                         Add Funds
//                       </Button>
//                       <Button
//                         onClick={handleAddSanctionDetails}
//                         className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2"
//                       >
//                         <FilePlusIcon className="h-4 w-4" />
//                         Add Sanction
//                       </Button>
//                     </div>
//                   )}
//                   {projectName && (
//                     <LogWorkflowActions
//                       docname={projectName}
//                       onAction={handleWorkflowAction}
//                       isLoading={isActionLoading}
//                     />
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Main Content */}
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//               <main className="lg:col-span-2 print-container space-y-6">
//                 {/* Project Overview */}
//                 <CollapsibleSection 
//                   title="Project Overview" 
//                   icon={FileTextIcon}
//                   defaultOpen={true}
//                 >
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                     <FieldDisplay 
//                       label="Implementation Department" 
//                       value={isDepartmentLoading 
//                         ? "Loading..." 
//                         : (departmentDoc?.dept_name && departmentDoc.dept_name !== "" 
//                             ? departmentDoc.dept_name 
//                             : data?.implementation_department || "N/A")} 
//                       icon={BuildingIcon} 
//                     />
//                     <FieldDisplay label="Project Type" value={data?.project_type} icon={FileTextIcon} />
//                     {data?.project_type === 'Research' && <FieldDisplay label="Research Sub-Type" value={data?.research_sub_type} icon={FileTextIcon} />}
//                     {data?.project_type === 'Consultancy' && <FieldDisplay label="Consultancy Category" value={data?.consultancy_category} icon={FileTextIcon} />}
//                     <FieldDisplay label="Project Duration" value={`${data?.project_duration_months} months and ${data?.project_duration_days || 0} days`} icon={CalendarIcon} />
//                   </div>

//                   <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} icon={FileTextIcon} />
//                   <HtmlContent title="Project Objective" htmlString={data?.project_objective} icon={FileTextIcon} />
//                   <HtmlContent title="Project Deliverables" htmlString={data?.project_deliverables} icon={FileTextIcon} />
//                 </CollapsibleSection>

//                 {/* Investigators */}
//                 <CollapsibleSection 
//                   title="Investigators" 
//                   icon={UsersIcon}
//                   defaultOpen={true}
//                 >
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <FieldDisplay label="Registering For" value={data?.registering_for} icon={UserIcon} />
//                     <FieldDisplay label="Principal Investigator" value={data?.principal_investigator_name} icon={UserIcon} />
//                     <FieldDisplay label="PI Employee ID" value={data?.pi_employee_id} icon={UserIcon} />
//                     <FieldDisplay label="PI Designation" value={data?.designation} icon={UserIcon} />
//                     <FieldDisplay label="PI Webmail" value={data?.pi_webmail} icon={UserIcon} />
//                   </div>

//                   <TableDisplay 
//                     label="Additional Principal Investigators" 
//                     data={data?.additional_pi_table} 
//                     columns={[
//                       { fieldname: 'pi_name', label: 'Name' }, 
//                       { fieldname: 'pi_designation', label: 'Designation' }, 
//                       { fieldname: 'pi_address', label: 'Address / Department' }
//                     ]} 
//                     icon={UsersIcon}
//                   />

//                   <TableDisplay 
//                     label="Co-Investigators" 
//                     data={data?.co_investigator_table} 
//                     columns={[
//                       { fieldname: 'copi_name', label: 'Name' }, 
//                       { fieldname: 'copi_designation', label: 'Designation' }, 
//                       { fieldname: 'copi_address', label: 'Department' }
//                     ]} 
//                     icon={UsersIcon}
//                   />
//                 </CollapsibleSection>

//                 {/* Funding & Budget */}
//                 <CollapsibleSection 
//                   title="Funding & Proposed Budget" 
//                   icon={DollarSignIcon}
//                   defaultOpen={true}
//                   actionButtons={
//                     isCurrentUserPI && (
//                       <Button
//                         onClick={handleAddFunds}
//                         variant="outline"
//                         size="sm"
//                         className="bg-white hover:bg-green-50 text-green-700 border-green-300 flex items-center gap-2"
//                       >
//                         <PlusIcon className="h-3 w-3" />
//                         Add Funds
//                       </Button>
//                     )
//                   }
//                 >
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <FieldDisplay label="Funding Agency Type" value={data?.funding_agency_type} icon={BuildingIcon} />
//                     <FieldDisplay label="Funding Agency" value={data?.funding_agency} icon={BuildingIcon} />
//                     <FieldDisplay label="Funding Agency GSTIN" value={data?.funding_agency_gstin} icon={FileTextIcon} />
//                     <FieldDisplay label="Total Proposed Budget" value={data?.total_budget_amount} isCurrency icon={DollarSignIcon} />
//                   </div>
//                   <FieldDisplay label="Funding Agency Address" value={data?.funding_agency_address} icon={BuildingIcon} />
//                 </CollapsibleSection>

//                 {/* Sanction Details */}
//                 {data?.have_sanction_details === 'Yes' && (
//                   <CollapsibleSection 
//                     title="Sanction Details" 
//                     icon={FileTextIcon}
//                     defaultOpen={true}
//                     actionButtons={
//                       isCurrentUserPI && (
//                         <Button
//                           onClick={handleAddSanctionDetails}
//                           variant="outline"
//                           size="sm"
//                           className="bg-white hover:bg-purple-50 text-purple-700 border-purple-300 flex items-center gap-2"
//                         >
//                           <FilePlusIcon className="h-3 w-3" />
//                           Add Sanction
//                         </Button>
//                       )
//                     }
//                   >
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       <FieldDisplay label="Sanction Letter No." value={data?.sanctioned_letter_no} icon={FileTextIcon} />
//                       <FieldDisplay 
//                         label="Sanction Letter Date" 
//                         value={data?.sanctioned_letter_date 
//                           ? new Date(data.sanctioned_letter_date).toLocaleDateString() 
//                           : "N/A"} 
//                         icon={CalendarIcon} 
//                       />
//                       <FieldDisplay label="Total Sanctioned Amount" value={data?.total_sanctioned_amount} isCurrency icon={DollarSignIcon} />
//                     </div>
//                     <TableDisplay 
//                       label="Sanctioned Budget Breakup" 
//                       data={data?.sanctioned_budget_breakup} 
//                       columns={[
//                         { fieldname: 'account_head', label: 'Budget Head' }, 
//                         { fieldname: 'amount_sanctioned', label: 'Amount', isCurrency: true }
//                       ]} 
//                       icon={DollarSignIcon}
//                     />
//                   </CollapsibleSection>
//                 )}

//                 {/* Committee Clearance */}
//                 <CollapsibleSection 
//                   title="Committee Clearance" 
//                   icon={ShieldIcon}
//                   defaultOpen={true}
//                 >
//                   <FieldDisplay label="Needs Committee Clearance?" value={data?.needs_committee_clearance} icon={ShieldIcon} />
//                   {data?.needs_committee_clearance === 'Yes' && (
//                     <div className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <FieldDisplay label="Committee" value={data?.committees} icon={ShieldIcon} />
//                         {data?.committees === 'Other' && <FieldDisplay label="Specified Committee" value={data?.other_committee_specify} icon={ShieldIcon} />}
//                         <FieldDisplay label="Biosafety Category" value={data?.biosafety_category} icon={ShieldIcon} />
//                       </div>
//                       <div className="mt-6">
//                         <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
//                           <ShieldIcon className="h-4 w-4 text-blue-600" />
//                           Declaration
//                         </h4>
//                         <div className="prose prose-blue max-w-none p-4 bg-white rounded-lg border text-justify shadow-sm" dangerouslySetInnerHTML={{ __html: data?.declaration || '<p>No declaration provided.</p>' }} />
//                       </div>
//                     </div>
//                   )}
//                 </CollapsibleSection>
//               </main>

//               {/* Activity Stream Sidebar */}
//               <aside className="lg:col-span-1 no-print">
//                 <ActivityStream
//                   ref={activityStreamRef}
//                   doctype="Project Registration"
//                   docname={projectName}
//                 />
//               </aside>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default ProjectDetailsView;






// -=-=-=-=-=-=-=-=-=-=- working




// import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useFrappeGetDoc, useFrappePostCall, useFrappeGetCall, useFrappeAuth } from 'frappe-react-sdk';
// import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { AppSidebar } from "../components/RndSidebar";
// import { 
//   ArrowLeftIcon, 
//   CalendarIcon, 
//   UserIcon, 
//   BuildingIcon, 
//   DollarSignIcon,
//   FileTextIcon,
//   UsersIcon,
//   ShieldIcon,
//   MessageSquareIcon,
//   ClockIcon,
//   CheckCircleIcon,
//   XCircleIcon,
//   PlayCircleIcon,
//   RefreshCwIcon,
//   SendIcon,
//   ChevronDownIcon,
//   ChevronRightIcon,
//   PlusIcon,
//   FilePlusIcon,
//   CreditCardIcon,
//   UsersIcon as UsersGroupIcon,
//   ShoppingCartIcon,
//   BriefcaseIcon,
//   PlaneIcon,
//   SettingsIcon,
//   UploadIcon,
//   UserPlusIcon,
//   HistoryIcon,
//   SearchIcon,
//   UserCheckIcon
// } from 'lucide-react';
// import { cn } from '@/lib/utils';

// // --- Interfaces ---
// interface ActivityItem {
//     owner: string;
//     creation: string;
//     content: string;
//     comment_type: string;
// }

// interface WorkflowAction {
//   action: string;
//   label: string;
// }

// interface ActivityStreamProps {
//   doctype: string;
//   docname: string;
// }

// interface ActivityStreamHandle {
//   refetch: () => void;
// }

// interface ProjectDetailsProps {
//   // projectName and onBack are now handled internally
// }

// // --- Helper Components ---
// const FieldDisplay = ({ label, value, isCurrency = false, icon: Icon }: { label: string; value: any; isCurrency?: boolean; icon?: any }) => {
//   if (!value && value !== 0) return null;
//   const displayValue = isCurrency ? `₹ ${Number(value).toLocaleString('en-IN')}` : String(value);
//   return (
//     <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
//       <div className="flex items-center gap-2 mb-2">
//         {Icon && <Icon className="h-4 w-4 text-blue-600" />}
//         <p className="text-sm font-semibold text-gray-700">{label}</p>
//       </div>
//       <p className="text-lg font-medium text-gray-900">{displayValue}</p>
//     </div>
//   );
// };

// // Collapsible Section Component
// const CollapsibleSection = ({ 
//   title, 
//   icon: Icon, 
//   children, 
//   defaultOpen = true,
//   actionButtons,
//   className 
// }: { 
//   title: string; 
//   icon?: any; 
//   children: React.ReactNode;
//   defaultOpen?: boolean;
//   actionButtons?: React.ReactNode;
//   className?: string;
// }) => {
//   const [isOpen, setIsOpen] = useState(defaultOpen);

//   return (
//     <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden", className)}>
//       <div 
//         className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
//         onClick={() => setIsOpen(!isOpen)}
//       >
//         <div className="flex items-center gap-3">
//           {Icon && <div className="p-2 bg-blue-100 rounded-lg"><Icon className="h-5 w-5 text-blue-600" /></div>}
//           <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
//         </div>
//         <div className="flex items-center gap-3">
//           {actionButtons}
//           <div className={cn("transition-transform duration-200", isOpen ? "rotate-0" : "-rotate-90")}>
//             <ChevronDownIcon className="h-5 w-5 text-gray-600" />
//           </div>
//         </div>
//       </div>
//       {isOpen && (
//         <div className="px-6 pb-6">
//           {children}
//         </div>
//       )}
//     </div>
//   );
// };

// const HtmlContent = ({ title, htmlString, icon: Icon }: { title: string, htmlString: string | undefined, icon?: any }) => {
//   if (!htmlString) return null;
//   return (
//     <div className="mt-6 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
//       <div className="flex items-center gap-2 mb-4">
//         {Icon && <Icon className="h-4 w-4 text-blue-600" />}
//         <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
//       </div>
//       <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: htmlString }} />
//     </div>
//   );
// };

// const TableDisplay = ({ label, data, columns, icon: Icon }: { label: string; data: any[] | undefined; columns: { fieldname: string, label: string, isCurrency?: boolean }[]; icon?: any }) => {
//   if (!data || data.length === 0) return null;
//   return (
//     <div className="my-6">
//       <div className="flex items-center gap-2 mb-4">
//         {Icon && <Icon className="h-4 w-4 text-blue-600" />}
//         <p className="text-lg font-semibold text-gray-800">{label}</p>
//       </div>
//       <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
//         <table className="min-w-full divide-y divide-gray-200 bg-white">
//           <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
//             <tr>
//               {columns.map(col => (
//                 <th key={col.fieldname} scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
//                   {col.label}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-200 bg-white">
//             {data.map((row, index) => (
//               <tr key={index} className="hover:bg-gray-50 transition-colors">
//                 {columns.map(col => (
//                   <td key={col.fieldname} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
//                     {col.isCurrency ? `₹ ${Number(row[col.fieldname] || 0).toLocaleString('en-IN')}` : row[col.fieldname]}
//                   </td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// // --- Action Buttons Component ---
// const ActionButtons = ({ actions, onAction, isLoading }: { actions: WorkflowAction[], onAction: (action: string) => void, isLoading: boolean }) => {
//   if (!actions || actions.length === 0) {
//     return null;
//   }

//   const getButtonClass = (actionName: string | undefined | null) => {
//     switch ((actionName || '').toLowerCase()) {
//       case 'approve':
//       case 'submit':
//         return 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all';
//       case 'reject':
//         return 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all';
//       case 'cancel':
//         return 'bg-gray-600 hover:bg-gray-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all';
//       default:
//         return 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all';
//     }
//   };

//   return (
//     <div className="flex items-center gap-3 no-print">
//       {actions.map((actionItem: WorkflowAction) => (
//         <Button
//           key={actionItem.action}
//           onClick={() => onAction(actionItem.action)}
//           className={cn("text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200", getButtonClass(actionItem.action))}
//           disabled={isLoading}
//         >
//           {isLoading ? (
//             <div className="flex items-center gap-2">
//               <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
//               Processing...
//             </div>
//           ) : (
//             <div className="flex items-center gap-2">
//               {actionItem.action.toLowerCase() === 'approve' && <CheckCircleIcon className="h-4 w-4" />}
//               {actionItem.action.toLowerCase() === 'reject' && <XCircleIcon className="h-4 w-4" />}
//               {actionItem.action.toLowerCase() === 'submit' && <PlayCircleIcon className="h-4 w-4" />}
//               {actionItem.label || actionItem.action}
//             </div>
//           )}
//         </Button>
//       ))}
//     </div>
//   );
// };

// // --- Activity Stream Component (Collapsible) ---
// const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(({ doctype, docname }, ref) => {
//   const [newComment, setNewComment] = useState('');
//   const [refreshTrigger, setRefreshTrigger] = useState(0);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isExpanded, setIsExpanded] = useState(true);

//   const { 
//     data: activityData, 
//     mutate: refetchActivity, 
//     error: activityError, 
//     isLoading: isActivityLoading 
//   } = useFrappeGetCall<{ message: ActivityItem[] }>(
//     'rndopsapp.rndopsapp.api.get_project_activity',
//     { doctype, docname },
//     { 
//       enabled: !!docname,
//       revalidateOnFocus: true,
//       revalidateOnReconnect: true,
//       refreshWhenHidden: false,
//       refreshWhenOffline: false,
//       revalidateOnMount: true
//     }
//   );

//   // Auto-refresh every 30 seconds
//   useEffect(() => {
//     const interval = setInterval(() => {
//       refetchActivity();
//     }, 30000);

//     return () => clearInterval(interval);
//   }, [refetchActivity]);

//   // Manual refresh function
//   const handleManualRefresh = useCallback(() => {
//     setRefreshTrigger(prev => prev + 1);
//     refetchActivity();
//   }, [refetchActivity]);

//   useImperativeHandle(ref, () => ({
//     refetch() {
//       handleManualRefresh();
//     }
//   }));

//   const { call: addComment, loading: isCommenting } = useFrappePostCall(
//     'rndopsapp.rndopsapp.api.add_project_comment'
//   );

//   const handleCommentSubmit = async () => {
//     if (!newComment.trim()) {
//       alert("Please enter a comment before submitting.");
//       return;
//     }

//     setIsSubmitting(true);
    
//     try {
//       console.log("Submitting comment:", {
//         doctype,
//         docname,
//         content: newComment.trim()
//       });

//       const result = await addComment({
//         doctype,
//         docname,
//         content: newComment.trim()
//       });

//       console.log("Comment submitted successfully:", result);
      
//       // Clear the textarea
//       setNewComment('');
      
//       // Force refresh after adding comment
//       await refetchActivity();
      
//       // Show success message
//       alert("Comment added successfully!");
      
//     } catch (err: any) {
//       console.error("Failed to add comment:", err);
      
//       // More detailed error handling
//       let errorMessage = "Error: Could not post comment.";
//       if (err.message) {
//         errorMessage = `Error: ${err.message}`;
//       } else if (err.exc) {
//         errorMessage = `Error: ${err.exc}`;
//       }
      
//       alert(errorMessage);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // Handle Enter key press for comment submission
//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
//       handleCommentSubmit();
//     }
//   };

//   return (
//     <Card className="border-0 shadow-xl bg-gradient-to-b from-white to-blue-50/30">
//       <CardHeader 
//         className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg cursor-pointer"
//         onClick={() => setIsExpanded(!isExpanded)}
//       >
//         <div className="flex items-center justify-between">
//           <CardTitle className="flex items-center gap-2 text-white">
//             <MessageSquareIcon className="h-5 w-5" />
//             Activity & Comments
//           </CardTitle>
//           <div className="flex items-center gap-2">
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={(e) => {
//                 e.stopPropagation();
//                 handleManualRefresh();
//               }}
//               disabled={isActivityLoading}
//               className="text-white hover:bg-white/20 p-2 h-8 w-8"
//               title="Refresh activities"
//             >
//               <RefreshCwIcon className={cn("h-4 w-4", isActivityLoading && "animate-spin")} />
//             </Button>
//             <div className={cn("transition-transform duration-200", isExpanded ? "rotate-0" : "-rotate-90")}>
//               <ChevronDownIcon className="h-5 w-5 text-white" />
//             </div>
//           </div>
//         </div>
//       </CardHeader>
//       {isExpanded && (
//         <CardContent className="p-6">
//           <div className="space-y-6">
//             {/* Comment Input Section */}
//             <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
//               <div className="mb-3">
//                 <label htmlFor="comment-textarea" className="block text-sm font-medium text-gray-700 mb-2">
//                   Add a comment
//                 </label>
//                 <Textarea
//                   id="comment-textarea"
//                   placeholder="Type your comment here... (Press Ctrl+Enter to submit)"
//                   value={newComment}
//                   onChange={(e) => setNewComment(e.target.value)}
//                   onKeyDown={handleKeyPress}
//                   disabled={isSubmitting}
//                   className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors"
//                   rows={3}
//                 />
//               </div>
//               <div className="flex items-center justify-between">
//                 <span className="text-xs text-gray-500">
//                   {newComment.length}/1000 characters
//                 </span>
//                 <Button 
//                   onClick={handleCommentSubmit} 
//                   disabled={isSubmitting || !newComment.trim()}
//                   className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
//                 >
//                   {isSubmitting ? (
//                     <>
//                       <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
//                       Submitting...
//                     </>
//                   ) : (
//                     <>
//                       <SendIcon className="h-4 w-4" />
//                       Submit Comment
//                     </>
//                   )}
//                 </Button>
//               </div>
//             </div>

//             {/* Activity List */}
//             <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 border-t pt-4">
//               {isActivityLoading ? (
//                 <div className="flex justify-center py-8">
//                   <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
//                 </div>
//               ) : activityError ? (
//                 <div className="text-center py-8 text-red-600 bg-red-50 rounded-lg p-4">
//                   <p className="font-medium">Failed to load activities</p>
//                   <p className="text-sm mt-1">Please try refreshing</p>
//                   <Button 
//                     variant="outline" 
//                     size="sm" 
//                     onClick={handleManualRefresh}
//                     className="mt-2"
//                   >
//                     Retry
//                   </Button>
//                 </div>
//               ) : activityData?.message && activityData.message.length > 0 ? (
//                 <div className="space-y-4">
//                   <div className="flex items-center justify-between text-sm text-gray-500">
//                     <span>{activityData.message.length} comment(s)</span>
//                     <span>Latest activity</span>
//                   </div>
//                   {activityData.message.map((item, index) => (
//                     <div key={`${item.creation}-${index}`} className="flex items-start gap-3 group">
//                       <div className="flex-shrink-0">
//                         <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md text-xs">
//                           {item.owner?.charAt(0).toUpperCase() || 'U'}
//                         </div>
//                       </div>
//                       <div className="flex-1 bg-white p-3 rounded-xl border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow">
//                         <div className="flex justify-between items-center mb-2">
//                           <p className="text-sm font-semibold text-gray-900">{item.owner || 'Unknown User'}</p>
//                           <p className="text-xs text-gray-500 flex items-center gap-1">
//                             <ClockIcon className="h-3 w-3" />
//                             {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
//                           </p>
//                         </div>
//                         <div
//                           className="text-sm text-gray-700 prose prose-sm max-w-none leading-relaxed"
//                           dangerouslySetInnerHTML={{ __html: item.content || 'No content' }}
//                         />
//                         {item.comment_type && (
//                           <div className="mt-2">
//                             <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
//                               {item.comment_type}
//                             </span>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="text-center py-8">
//                   <MessageSquareIcon className="h-8 w-8 text-gray-300 mx-auto mb-3" />
//                   <p className="text-gray-500 font-medium text-sm">No activity yet</p>
//                   <p className="text-xs text-gray-400">Be the first to add a comment</p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </CardContent>
//       )}
//     </Card>
//   );
// });

// ActivityStream.displayName = 'ActivityStream';

// // --- Quick Actions Component (Collapsible) ---
// const QuickActions = () => {
//   const [isExpanded, setIsExpanded] = useState(false);

//   return (
//     <Card className="border-0 shadow-xl bg-gradient-to-b from-white to-green-50/30">
//       <CardHeader 
//         className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg cursor-pointer"
//         onClick={() => setIsExpanded(!isExpanded)}
//       >
//         <div className="flex items-center justify-between">
//           <CardTitle className="flex items-center gap-2 text-white">
//             <SettingsIcon className="h-5 w-5" />
//             Quick Actions
//           </CardTitle>
//           <div className={cn("transition-transform duration-200", isExpanded ? "rotate-0" : "-rotate-90")}>
//             <ChevronDownIcon className="h-5 w-5 text-white" />
//           </div>
//         </div>
//       </CardHeader>
//       {isExpanded && (
//         <CardContent className="p-6">
//           <div className="space-y-4">
//             {/* Advance Section */}
//             <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
//               <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
//                 <CreditCardIcon className="h-4 w-4 text-blue-600" />
//                 Advance
//               </h3>
//               <div className="space-y-2">
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Reimbursement
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Temporary Advance Apply
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Temporary Advance Settle
//                 </Button>
//               </div>
//             </div>

//             {/* Disbursal Section */}
//             <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
//               <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
//                 <UploadIcon className="h-4 w-4 text-green-600" />
//                 Disbursal
//               </h3>
//               <div className="space-y-2">
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   One Time Assistantship
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Top Up Fellowship
//                 </Button>
//               </div>
//             </div>

//             {/* Purchase Section */}
//             <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
//               <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
//                 <ShoppingCartIcon className="h-4 w-4 text-purple-600" />
//                 Purchase
//               </h3>
//               <div className="space-y-2">
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Direct Purchase upto 10 Lakhs
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   General Indent
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Generate NIQ
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Indent cum Sanction Sheet
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Rate Contract
//                 </Button>
//               </div>
//             </div>

//             {/* Recruitment Section */}
//             <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
//               <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
//                 <UsersGroupIcon className="h-4 w-4 text-orange-600" />
//                 Recruitment
//               </h3>
//               <div className="space-y-2">
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Adhoc
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Committee Member Change Request
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Contractual
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Selection Committee Report
//                 </Button>
//               </div>
//             </div>

//             {/* Travel Section */}
//             <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
//               <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
//                 <PlaneIcon className="h-4 w-4 text-cyan-600" />
//                 Travel
//               </h3>
//               <div className="space-y-2">
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Apply
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   TA-DA Settle
//                 </Button>
//               </div>
//             </div>

//             {/* Utilities Section */}
//             <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
//               <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
//                 <SettingsIcon className="h-4 w-4 text-gray-600" />
//                 Utilities
//               </h3>
//               <div className="space-y-2">
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Add New User
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Application History
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Form Tracking
//                 </Button>
//                 <Button variant="outline" className="w-full justify-start text-sm" size="sm">
//                   Incharge Assignment
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </CardContent>
//       )}
//     </Card>
//   );
// };

// // --- LogWorkflowActions Component ---
// const LogWorkflowActions = ({ docname, onAction, isLoading: isActionLoading }: { docname: string, onAction: (action: string) => void, isLoading: boolean }) => {
//   const { data, error, isLoading } = useFrappeGetCall<{ message: string[] }>(
//     'rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions',
//     { docname }
//   );

//   useEffect(() => {
//     if (data) {
//       console.log('✅ Allowed Actions (from LogWorkflowActions):', data);
//       console.log('✅ Allowed Actions (from LogWorkflowActions):', data.message);
//     }
//     if (error) {
//       console.error('❌ Error fetching workflow actions (from LogWorkflowActions):', error);
//     }
//   }, [data, error]);

//   const getButtonClass = (actionName: string | undefined | null) => {
//     switch ((actionName || '').toLowerCase()) {
//       case 'approve':
//       case 'submit':
//         return 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl';
//       case 'reject':
//         return 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl';
//       case 'cancel':
//         return 'bg-gray-600 hover:bg-gray-700 shadow-lg hover:shadow-xl';
//       default:
//         return 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl';
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex items-center gap-2 text-gray-600">
//         <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
//         Loading actions...
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
//         Error loading actions
//       </div>
//     );
//   }

//   if (!data?.message || data.message.length === 0) {
//     return null;
//   }

//   return (
//     <div className="flex items-center gap-3 no-print">
//       {data.message.map((actionString: string) => (
//         <Button
//           key={actionString}
//           onClick={() => onAction(actionString)}
//           className={cn("text-white font-semibold px-6 py-2 rounded-lg transform hover:-translate-y-0.5 transition-all", getButtonClass(actionString))}
//           disabled={isActionLoading}
//         >
//           {isActionLoading ? (
//             <div className="flex items-center gap-2">
//               <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
//               Processing...
//             </div>
//           ) : (
//             <div className="flex items-center gap-2">
//               {actionString.toLowerCase() === 'approve' && <CheckCircleIcon className="h-4 w-4" />}
//               {actionString.toLowerCase() === 'reject' && <XCircleIcon className="h-4 w-4" />}
//               {actionString.toLowerCase() === 'submit' && <PlayCircleIcon className="h-4 w-4" />}
//               {actionString}
//             </div>
//           )}
//         </Button>
//       ))}
//     </div>
//   );
// };

// // --- Main Component ---
// const ProjectDetailsView: React.FC<ProjectDetailsProps> = () => {
//   const { projectName } = useParams<{ projectName: string }>();
//   const navigate = useNavigate();
//   const handleBack = () => navigate('/projects-view');

//   const { currentUser } = useFrappeAuth();
//   const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
//     fields: ["roles"],
//     enabled: !!currentUser,
//   });

//   // Determine if user is permanent employee
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

//   const { data, error, isLoading, mutate } = useFrappeGetDoc('Project Registration', projectName ?? '', {
//     cacheTime: 0,
//     enabled: !!projectName,
//   });

//   // Check if current user is the PI of the project
//   const isCurrentUserPI = currentUser && data?.pi_webmail === currentUser;

//   useEffect(() => {
//     console.log("Project Registration - implementation_department:", data?.implementation_department);
//   }, [data?.implementation_department]);

//   const departmentId = data?.implementation_department;
//   const { data: departmentDoc, isLoading: isDepartmentLoading } = useFrappeGetDoc(
//     "Department_prornd",
//     departmentId,
//     { 
//       fields: ["dept_name"],
//       enabled: !!departmentId 
//     }
//   );

//   useEffect(() => {
//     console.log("ProjectDetails - departmentId:", departmentId);
//     console.log("ProjectDetails - departmentDoc:", departmentDoc);
//     console.log("ProjectDetails - isDepartmentLoading:", isDepartmentLoading);
//   }, [departmentId, departmentDoc, isDepartmentLoading]);

//   const activityStreamRef = useRef<ActivityStreamHandle>(null);

//   const { call: triggerWorkflowAction, loading: isActionLoading } = useFrappePostCall(
//     'rndopsapp.rndopsapp.api.handle_workflow_action'
//   );

//   const { call: submitProjectRegistration, loading: isSubmittingProject } = useFrappePostCall(
//     'rndopsapp.rndopsapp.api.submit_project_registration'
//   );

//   // New action handlers
//   const handleAddFunds = () => {
//     // Navigate to add funds page or open modal
//     alert("Add Funds functionality will be implemented here");
//     // navigate(`/add-funds/${projectName}`);
//   };

//   const handleAddSanctionDetails = () => {
//     // Navigate to add sanction details page or open modal
//     alert("Add Sanction Details functionality will be implemented here");
//     // navigate(`/add-sanction-details/${projectName}`);
//   };

//   const handleWorkflowAction = useCallback((action: string) => {
//     if (action.toLowerCase() === 'submit') {
//       submitProjectRegistration({
//         docname: projectName
//       }).then(() => {
//         alert("Project registration submitted successfully!");
//         mutate();
//         // Refresh activity stream after workflow action
//         activityStreamRef.current?.refetch();
//       }).catch((err: any) => {
//         console.error("Error submitting project registration:", err);
//         alert(`Failed to submit project registration: ${err.message || 'An unknown error occurred.'}`);
//       });
//     } else {
//       triggerWorkflowAction({
//         doctype: 'Project Registration',
//         docname: projectName,
//         action: action
//       }).then(() => {
//         alert(`Project action '${action}' completed successfully!`);
//         mutate();
//         // Refresh activity stream after workflow action
//         activityStreamRef.current?.refetch();
//       }).catch((err: any) => {
//         console.error(`Error during workflow action:`, err);
//         alert(`Failed to ${action} the project: ${err.message || 'An unknown error occurred.'}`);
//       });
//     }
//   }, [triggerWorkflowAction, submitProjectRegistration, mutate, projectName]);

//   const getStatusBadge = (status: string) => {
//     const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold";
//     switch ((status || '').toLowerCase()) {
//       case 'draft':
//         return cn(baseClasses, "bg-gray-100 text-gray-800 border border-gray-300");
//       case 'submitted':
//         return cn(baseClasses, "bg-blue-100 text-blue-800 border border-blue-300");
//       case 'under review':
//         return cn(baseClasses, "bg-yellow-100 text-yellow-800 border border-yellow-300");
//       case 'approved':
//         return cn(baseClasses, "bg-green-100 text-green-800 border border-green-300");
//       case 'rejected':
//         return cn(baseClasses, "bg-red-100 text-red-800 border border-red-300");
//       default:
//         return cn(baseClasses, "bg-gray-100 text-gray-800 border border-gray-300");
//     }
//   };

//   if (!projectName) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//         <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md w-full">
//           <FileTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//           <h2 className="text-2xl font-bold text-gray-800 mb-2">No Project Selected</h2>
//           <p className="text-gray-600 mb-6">Please select a project to view its details.</p>
//           <Button onClick={() => navigate('/projects-view')} className="bg-blue-600 hover:bg-blue-700">
//             Back to Projects
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
//           <p className="text-xl font-semibold text-gray-700">Loading Project Details...</p>
//           <p className="text-gray-500 mt-2">Please wait while we fetch the project information</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//         <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md w-full">
//           <XCircleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
//           <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Project</h2>
//           <p className="text-gray-600 mb-6">{error.message}</p>
//           <Button onClick={() => navigate('/projects-view')} className="bg-blue-600 hover:bg-blue-700">
//             Back to Projects
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <>
//       <style>{`
//           @media print {
//             .no-print { display: none !important; }
//             .print-wrapper { padding: 0 !important; }
//             .print-container { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 1rem !important; max-width: 100% !important; }
//             .print-container * { visibility: visible; }
//             body { background-color: white !important; }
//           }
//       `}</style>

//       <div>
//         <AppSidebar isPermanentEmployee={isPermanentEmployee} />
//         <div className="bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans print-wrapper flex-1">
//           <div className="max-w-7xl mx-auto">
//             {/* Header Section */}
//             <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-2xl p-6 sm:p-8 mb-8 text-white">
//               <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
//                 <div className="flex items-start gap-4 flex-1">
//                   <button
//                     onClick={handleBack}
//                     className="p-3 rounded-xl bg-white/20 hover:bg-white/30 transition-all duration-200 no-print mt-1"
//                     aria-label="Go back"
//                   >
//                     <ArrowLeftIcon className="h-5 w-5 text-white" />
//                   </button>
//                   <div className="flex-1">
//                     <h1 className="text-3xl font-bold mb-2">{data?.project_title || 'Project Details'}</h1>
//                     <div className="flex flex-wrap items-center gap-4 text-blue-100">
//                       <div className="flex items-center gap-2">
//                         <FileTextIcon className="h-4 w-4" />
//                         <span>Project ID: {projectName}</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <span className={cn("px-3 py-1 rounded-full text-sm font-semibold bg-white/20", getStatusBadge(data?.workflow_state))}>
//                           {data?.workflow_state}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//                 <div className="flex flex-col sm:flex-row gap-3">
//                   {/* New Action Buttons */}
//                   {isCurrentUserPI && (
//                     <div className="flex gap-2">
//                       <Button
//                         onClick={handleAddFunds}
//                         className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2"
//                       >
//                         <PlusIcon className="h-4 w-4" />
//                         Add Funds
//                       </Button>
//                       <Button
//                         onClick={handleAddSanctionDetails}
//                         className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2"
//                       >
//                         <FilePlusIcon className="h-4 w-4" />
//                         Add Sanction
//                       </Button>
//                     </div>
//                   )}
//                   {projectName && (
//                     <LogWorkflowActions
//                       docname={projectName}
//                       onAction={handleWorkflowAction}
//                       isLoading={isActionLoading}
//                     />
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Main Content */}
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//               <main className="lg:col-span-2 print-container space-y-6">
//                 {/* Project Overview */}
//                 <CollapsibleSection 
//                   title="Project Overview" 
//                   icon={FileTextIcon}
//                   defaultOpen={true}
//                 >
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                     <FieldDisplay 
//                       label="Implementation Department" 
//                       value={isDepartmentLoading 
//                         ? "Loading..." 
//                         : (departmentDoc?.dept_name && departmentDoc.dept_name !== "" 
//                             ? departmentDoc.dept_name 
//                             : data?.implementation_department || "N/A")} 
//                       icon={BuildingIcon} 
//                     />
//                     <FieldDisplay label="Project Type" value={data?.project_type} icon={FileTextIcon} />
//                     {data?.project_type === 'Research' && <FieldDisplay label="Research Sub-Type" value={data?.research_sub_type} icon={FileTextIcon} />}
//                     {data?.project_type === 'Consultancy' && <FieldDisplay label="Consultancy Category" value={data?.consultancy_category} icon={FileTextIcon} />}
//                     <FieldDisplay label="Project Duration" value={`${data?.project_duration_months} months and ${data?.project_duration_days || 0} days`} icon={CalendarIcon} />
//                   </div>

//                   <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} icon={FileTextIcon} />
//                   <HtmlContent title="Project Objective" htmlString={data?.project_objective} icon={FileTextIcon} />
//                   <HtmlContent title="Project Deliverables" htmlString={data?.project_deliverables} icon={FileTextIcon} />
//                 </CollapsibleSection>

//                 {/* Investigators */}
//                 <CollapsibleSection 
//                   title="Investigators" 
//                   icon={UsersIcon}
//                   defaultOpen={true}
//                 >
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <FieldDisplay label="Registering For" value={data?.registering_for} icon={UserIcon} />
//                     <FieldDisplay label="Principal Investigator" value={data?.principal_investigator_name} icon={UserIcon} />
//                     <FieldDisplay label="PI Employee ID" value={data?.pi_employee_id} icon={UserIcon} />
//                     <FieldDisplay label="PI Designation" value={data?.designation} icon={UserIcon} />
//                     <FieldDisplay label="PI Webmail" value={data?.pi_webmail} icon={UserIcon} />
//                   </div>

//                   <TableDisplay 
//                     label="Additional Principal Investigators" 
//                     data={data?.additional_pi_table} 
//                     columns={[
//                       { fieldname: 'pi_name', label: 'Name' }, 
//                       { fieldname: 'pi_designation', label: 'Designation' }, 
//                       { fieldname: 'pi_address', label: 'Address / Department' }
//                     ]} 
//                     icon={UsersIcon}
//                   />

//                   <TableDisplay 
//                     label="Co-Investigators" 
//                     data={data?.co_investigator_table} 
//                     columns={[
//                       { fieldname: 'copi_name', label: 'Name' }, 
//                       { fieldname: 'copi_designation', label: 'Designation' }, 
//                       { fieldname: 'copi_address', label: 'Department' }
//                     ]} 
//                     icon={UsersIcon}
//                   />
//                 </CollapsibleSection>

//                 {/* Funding & Budget */}
//                 <CollapsibleSection 
//                   title="Funding & Proposed Budget" 
//                   icon={DollarSignIcon}
//                   defaultOpen={true}
//                   actionButtons={
//                     isCurrentUserPI && (
//                       <Button
//                         onClick={handleAddFunds}
//                         variant="outline"
//                         size="sm"
//                         className="bg-white hover:bg-green-50 text-green-700 border-green-300 flex items-center gap-2"
//                       >
//                         <PlusIcon className="h-3 w-3" />
//                         Add Funds
//                       </Button>
//                     )
//                   }
//                 >
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <FieldDisplay label="Funding Agency Type" value={data?.funding_agency_type} icon={BuildingIcon} />
//                     <FieldDisplay label="Funding Agency" value={data?.funding_agency} icon={BuildingIcon} />
//                     <FieldDisplay label="Funding Agency GSTIN" value={data?.funding_agency_gstin} icon={FileTextIcon} />
//                     <FieldDisplay label="Total Proposed Budget" value={data?.total_budget_amount} isCurrency icon={DollarSignIcon} />
//                   </div>
//                   <FieldDisplay label="Funding Agency Address" value={data?.funding_agency_address} icon={BuildingIcon} />
//                 </CollapsibleSection>

//                 {/* Sanction Details */}
//                 {data?.have_sanction_details === 'Yes' && (
//                   <CollapsibleSection 
//                     title="Sanction Details" 
//                     icon={FileTextIcon}
//                     defaultOpen={true}
//                     actionButtons={
//                       isCurrentUserPI && (
//                         <Button
//                           onClick={handleAddSanctionDetails}
//                           variant="outline"
//                           size="sm"
//                           className="bg-white hover:bg-purple-50 text-purple-700 border-purple-300 flex items-center gap-2"
//                         >
//                           <FilePlusIcon className="h-3 w-3" />
//                           Add Sanction
//                         </Button>
//                       )
//                     }
//                   >
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       <FieldDisplay label="Sanction Letter No." value={data?.sanctioned_letter_no} icon={FileTextIcon} />
//                       <FieldDisplay 
//                         label="Sanction Letter Date" 
//                         value={data?.sanctioned_letter_date 
//                           ? new Date(data.sanctioned_letter_date).toLocaleDateString() 
//                           : "N/A"} 
//                         icon={CalendarIcon} 
//                       />
//                       <FieldDisplay label="Total Sanctioned Amount" value={data?.total_sanctioned_amount} isCurrency icon={DollarSignIcon} />
//                     </div>
//                     <TableDisplay 
//                       label="Sanctioned Budget Breakup" 
//                       data={data?.sanctioned_budget_breakup} 
//                       columns={[
//                         { fieldname: 'account_head', label: 'Budget Head' }, 
//                         { fieldname: 'amount_sanctioned', label: 'Amount', isCurrency: true }
//                       ]} 
//                       icon={DollarSignIcon}
//                     />
//                   </CollapsibleSection>
//                 )}

//                 {/* Committee Clearance */}
//                 <CollapsibleSection 
//                   title="Committee Clearance" 
//                   icon={ShieldIcon}
//                   defaultOpen={true}
//                 >
//                   <FieldDisplay label="Needs Committee Clearance?" value={data?.needs_committee_clearance} icon={ShieldIcon} />
//                   {data?.needs_committee_clearance === 'Yes' && (
//                     <div className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <FieldDisplay label="Committee" value={data?.committees} icon={ShieldIcon} />
//                         {data?.committees === 'Other' && <FieldDisplay label="Specified Committee" value={data?.other_committee_specify} icon={ShieldIcon} />}
//                         <FieldDisplay label="Biosafety Category" value={data?.biosafety_category} icon={ShieldIcon} />
//                       </div>
//                       <div className="mt-6">
//                         <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
//                           <ShieldIcon className="h-4 w-4 text-blue-600" />
//                           Declaration
//                         </h4>
//                         <div className="prose prose-blue max-w-none p-4 bg-white rounded-lg border text-justify shadow-sm" dangerouslySetInnerHTML={{ __html: data?.declaration || '<p>No declaration provided.</p>' }} />
//                       </div>
//                     </div>
//                   )}
//                 </CollapsibleSection>
//               </main>

//               {/* Sidebar with Collapsible Sections */}
//               <aside className="lg:col-span-1 no-print space-y-6">
//                 <QuickActions />
//                 <ActivityStream
//                   ref={activityStreamRef}
//                   doctype="Project Registration"
//                   docname={projectName}
//                 />
//               </aside>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default ProjectDetailsView;




// =-=-=-=-=-=-=-=-=-=-=-== font size reduce


import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDoc, useFrappePostCall, useFrappeGetCall, useFrappeAuth } from 'frappe-react-sdk';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppSidebar } from "../components/RndSidebar";
import { 
  ArrowLeftIcon, 
  CalendarIcon, 
  UserIcon, 
  BuildingIcon, 
  DollarSignIcon,
  FileTextIcon,
  UsersIcon,
  ShieldIcon,
  MessageSquareIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayCircleIcon,
  RefreshCwIcon,
  SendIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  FilePlusIcon,
  CreditCardIcon,
  UsersIcon as UsersGroupIcon,
  ShoppingCartIcon,
  BriefcaseIcon,
  PlaneIcon,
  SettingsIcon,
  UploadIcon,
  UserPlusIcon,
  HistoryIcon,
  SearchIcon,
  UserCheckIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Interfaces ---
interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type: string;
}

interface WorkflowAction {
  action: string;
  label: string;
}

interface ActivityStreamProps {
  doctype: string;
  docname: string;
}

interface ActivityStreamHandle {
  refetch: () => void;
}

interface ProjectDetailsProps {
  // projectName and onBack are now handled internally
}

// --- Helper Components ---
const FieldDisplay = ({ label, value, isCurrency = false, icon: Icon }: { label: string; value: any; isCurrency?: boolean; icon?: any }) => {
  if (!value && value !== 0) return null;
  const displayValue = isCurrency ? `₹ ${Number(value).toLocaleString('en-IN')}` : String(value);
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-3 w-3 text-indigo-600" />}
        <p className="text-xs font-semibold text-gray-700">{label}</p>
      </div>
      <p className="text-sm font-medium text-gray-900">{displayValue}</p>
    </div>
  );
};

// Collapsible Section Component
const CollapsibleSection = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  actionButtons,
  className 
}: { 
  title: string; 
  icon?: any; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  actionButtons?: React.ReactNode;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden", className)}>
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {Icon && <div className="p-1.5 bg-indigo-100 rounded-lg"><Icon className="h-4 w-4 text-indigo-600" /></div>}
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {actionButtons}
          <div className={cn("transition-transform duration-200", isOpen ? "rotate-0" : "-rotate-90")}>
            <ChevronDownIcon className="h-4 w-4 text-gray-600" />
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
};

const HtmlContent = ({ title, htmlString, icon: Icon }: { title: string, htmlString: string | undefined, icon?: any }) => {
  if (!htmlString) return null;
  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="h-3 w-3 text-indigo-600" />}
        <h4 className="text-base font-semibold text-gray-800">{title}</h4>
      </div>
      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: htmlString }} />
    </div>
  );
};

const TableDisplay = ({ label, data, columns, icon: Icon }: { label: string; data: any[] | undefined; columns: { fieldname: string, label: string, isCurrency?: boolean }[]; icon?: any }) => {
  if (!data || data.length === 0) return null;
  return (
    <div className="my-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="h-3 w-3 text-indigo-600" />}
        <p className="text-base font-semibold text-gray-800">{label}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
            <tr>
              {columns.map(col => (
                <th key={col.fieldname} scope="col" className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                {columns.map(col => (
                  <td key={col.fieldname} className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">
                    {col.isCurrency ? `₹ ${Number(row[col.fieldname] || 0).toLocaleString('en-IN')}` : row[col.fieldname]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Action Buttons Component ---
const ActionButtons = ({ actions, onAction, isLoading }: { actions: WorkflowAction[], onAction: (action: string) => void, isLoading: boolean }) => {
  if (!actions || actions.length === 0) {
    return null;
  }

  const getButtonClass = (actionName: string | undefined | null) => {
    switch ((actionName || '').toLowerCase()) {
      case 'approve':
      case 'submit':
        return 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all';
      case 'reject':
        return 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all';
      case 'cancel':
        return 'bg-gray-600 hover:bg-gray-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all';
    }
  };

  return (
    <div className="flex items-center gap-2 no-print">
      {actions.map((actionItem: WorkflowAction) => (
        <Button
          key={actionItem.action}
          onClick={() => onAction(actionItem.action)}
          className={cn("text-white font-semibold px-4 py-1.5 rounded-lg transition-all duration-200 text-sm", getButtonClass(actionItem.action))}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {actionItem.action.toLowerCase() === 'approve' && <CheckCircleIcon className="h-3 w-3" />}
              {actionItem.action.toLowerCase() === 'reject' && <XCircleIcon className="h-3 w-3" />}
              {actionItem.action.toLowerCase() === 'submit' && <PlayCircleIcon className="h-3 w-3" />}
              {actionItem.label || actionItem.action}
            </div>
          )}
        </Button>
      ))}
    </div>
  );
};

// --- Activity Stream Component (Collapsible) ---
const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(({ doctype, docname }, ref) => {
  const [newComment, setNewComment] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const { 
    data: activityData, 
    mutate: refetchActivity, 
    error: activityError, 
    isLoading: isActivityLoading 
  } = useFrappeGetCall<{ message: ActivityItem[] }>(
    'rndopsapp.rndopsapp.api.get_project_activity',
    { doctype, docname },
    { 
      enabled: !!docname,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnMount: true
    }
  );

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetchActivity]);

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    refetchActivity();
  }, [refetchActivity]);

  useImperativeHandle(ref, () => ({
    refetch() {
      handleManualRefresh();
    }
  }));

  const { call: addComment, loading: isCommenting } = useFrappePostCall(
    'rndopsapp.rndopsapp.api.add_project_comment'
  );

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) {
      alert("Please enter a comment before submitting.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log("Submitting comment:", {
        doctype,
        docname,
        content: newComment.trim()
      });

      const result = await addComment({
        doctype,
        docname,
        content: newComment.trim()
      });

      console.log("Comment submitted successfully:", result);
      
      // Clear the textarea
      setNewComment('');
      
      // Force refresh after adding comment
      await refetchActivity();
      
      // Show success message
      alert("Comment added successfully!");
      
    } catch (err: any) {
      console.error("Failed to add comment:", err);
      
      // More detailed error handling
      let errorMessage = "Error: Could not post comment.";
      if (err.message) {
        errorMessage = `Error: ${err.message}`;
      } else if (err.exc) {
        errorMessage = `Error: ${err.exc}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Enter key press for comment submission
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleCommentSubmit();
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-b from-white to-indigo-50/20">
      <CardHeader 
        className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-lg cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <MessageSquareIcon className="h-4 w-4" />
            Activity & Comments
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleManualRefresh();
              }}
              disabled={isActivityLoading}
              className="text-white hover:bg-white/20 p-1 h-6 w-6"
              title="Refresh activities"
            >
              <RefreshCwIcon className={cn("h-3 w-3", isActivityLoading && "animate-spin")} />
            </Button>
            <div className={cn("transition-transform duration-200", isExpanded ? "rotate-0" : "-rotate-90")}>
              <ChevronDownIcon className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Comment Input Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <div className="mb-2">
                <label htmlFor="comment-textarea" className="block text-xs font-medium text-gray-700 mb-1">
                  Add a comment
                </label>
                <Textarea
                  id="comment-textarea"
                  placeholder="Type your comment here... (Press Ctrl+Enter to submit)"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isSubmitting}
                  className="resize-none border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 transition-colors text-sm"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {newComment.length}/1000 characters
                </span>
                <Button 
                  onClick={handleCommentSubmit} 
                  disabled={isSubmitting || !newComment.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1 text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <SendIcon className="h-3 w-3" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Activity List */}
            <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-2 border-t pt-3">
              {isActivityLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                </div>
              ) : activityError ? (
                <div className="text-center py-4 text-red-600 bg-red-50 rounded-lg p-3 text-xs">
                  <p className="font-medium">Failed to load activities</p>
                  <p className="text-xs mt-1">Please try refreshing</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleManualRefresh}
                    className="mt-1 text-xs"
                  >
                    Retry
                  </Button>
                </div>
              ) : activityData?.message && activityData.message.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{activityData.message.length} comment(s)</span>
                    <span>Latest activity</span>
                  </div>
                  {activityData.message.map((item, index) => (
                    <div key={`${item.creation}-${index}`} className="flex items-start gap-2 group">
                      <div className="flex-shrink-0">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md text-xs">
                          {item.owner?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      </div>
                      <div className="flex-1 bg-white p-2 rounded-lg border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-semibold text-gray-900">{item.owner || 'Unknown User'}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <ClockIcon className="h-2.5 w-2.5" />
                            {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
                          </p>
                        </div>
                        <div
                          className="text-xs text-gray-700 prose prose-xs max-w-none leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: item.content || 'No content' }}
                        />
                        {item.comment_type && (
                          <div className="mt-1">
                            <span className="inline-block px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                              {item.comment_type}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <MessageSquareIcon className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium text-xs">No activity yet</p>
                  <p className="text-xs text-gray-400">Be the first to add a comment</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
});

ActivityStream.displayName = 'ActivityStream';

// --- Quick Actions Component (Collapsible) ---
const QuickActions = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-b from-white to-green-50/20">
      <CardHeader 
        className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <SettingsIcon className="h-4 w-4" />
            Quick Actions
          </CardTitle>
          <div className={cn("transition-transform duration-200", isExpanded ? "rotate-0" : "-rotate-90")}>
            <ChevronDownIcon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Advance Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-1 text-sm">
                <CreditCardIcon className="h-3 w-3 text-indigo-600" />
                Advance
              </h3>
              <div className="space-y-1">
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Reimbursement
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Temporary Advance Apply
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Temporary Advance Settle
                </Button>
              </div>
            </div>

            {/* Disbursal Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-1 text-sm">
                <UploadIcon className="h-3 w-3 text-green-600" />
                Disbursal
              </h3>
              <div className="space-y-1">
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  One Time Assistantship
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Top Up Fellowship
                </Button>
              </div>
            </div>

            {/* Purchase Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-1 text-sm">
                <ShoppingCartIcon className="h-3 w-3 text-purple-600" />
                Purchase
              </h3>
              <div className="space-y-1">
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Direct Purchase upto 10 Lakhs
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  General Indent
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Generate NIQ
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Indent cum Sanction Sheet
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Rate Contract
                </Button>
              </div>
            </div>

            {/* Recruitment Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-1 text-sm">
                <UsersGroupIcon className="h-3 w-3 text-orange-600" />
                Recruitment
              </h3>
              <div className="space-y-1">
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Adhoc
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Committee Member Change Request
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Contractual
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Selection Committee Report
                </Button>
              </div>
            </div>

            {/* Travel Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-1 text-sm">
                <PlaneIcon className="h-3 w-3 text-cyan-600" />
                Travel
              </h3>
              <div className="space-y-1">
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Apply
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  TA-DA Settle
                </Button>
              </div>
            </div>

            {/* Utilities Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-1 text-sm">
                <SettingsIcon className="h-3 w-3 text-gray-600" />
                Utilities
              </h3>
              <div className="space-y-1">
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Add New User
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Application History
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Form Tracking
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" size="sm">
                  Incharge Assignment
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// --- LogWorkflowActions Component ---
const LogWorkflowActions = ({ docname, onAction, isLoading: isActionLoading }: { docname: string, onAction: (action: string) => void, isLoading: boolean }) => {
  const { data, error, isLoading } = useFrappeGetCall<{ message: string[] }>(
    'rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions',
    { docname }
  );

  useEffect(() => {
    if (data) {
      console.log('✅ Allowed Actions (from LogWorkflowActions):', data);
      console.log('✅ Allowed Actions (from LogWorkflowActions):', data.message);
    }
    if (error) {
      console.error('❌ Error fetching workflow actions (from LogWorkflowActions):', error);
    }
  }, [data, error]);

  const getButtonClass = (actionName: string | undefined | null) => {
    switch ((actionName || '').toLowerCase()) {
      case 'approve':
      case 'submit':
        return 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl';
      case 'reject':
        return 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl';
      case 'cancel':
        return 'bg-gray-600 hover:bg-gray-700 shadow-lg hover:shadow-xl';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-600 text-sm">
        <div className="animate-spin rounded-full h-3 w-3 border-2 border-indigo-600 border-t-transparent"></div>
        Loading actions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-200 text-xs">
        Error loading actions
      </div>
    );
  }

  if (!data?.message || data.message.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 no-print">
      {data.message.map((actionString: string) => (
        <Button
          key={actionString}
          onClick={() => onAction(actionString)}
          className={cn("text-white font-semibold px-3 py-1 rounded-lg transform hover:-translate-y-0.5 transition-all text-sm", getButtonClass(actionString))}
          disabled={isActionLoading}
        >
          {isActionLoading ? (
            <div className="flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {actionString.toLowerCase() === 'approve' && <CheckCircleIcon className="h-3 w-3" />}
              {actionString.toLowerCase() === 'reject' && <XCircleIcon className="h-3 w-3" />}
              {actionString.toLowerCase() === 'submit' && <PlayCircleIcon className="h-3 w-3" />}
              {actionString}
            </div>
          )}
        </Button>
      ))}
    </div>
  );
};

// --- Main Component ---
const ProjectDetailsView: React.FC<ProjectDetailsProps> = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const handleBack = () => navigate('/projects-view');

  const { currentUser } = useFrappeAuth();
  const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["roles"],
    enabled: !!currentUser,
  });

  // Determine if user is permanent employee
  let isPermanentEmployee = false;
  if (userData) {
    if (Array.isArray(userData.roles) && userData.roles.length > 0) {
      if (typeof userData.roles[0] === 'string') {
        isPermanentEmployee = userData.roles.includes("Permanent Employee");
      } else if (typeof userData.roles[0] === 'object' && userData.roles[0] !== null && 'role' in userData.roles[0]) {
        isPermanentEmployee = userData.roles.some((role: any) => role.role === "Permanent Employee");
      }
    }
  }

  const { data, error, isLoading, mutate } = useFrappeGetDoc('Project Registration', projectName ?? '', {
    cacheTime: 0,
    enabled: !!projectName,
  });

  // Check if current user is the PI of the project
  const isCurrentUserPI = currentUser && data?.pi_webmail === currentUser;

  useEffect(() => {
    console.log("Project Registration - implementation_department:", data?.implementation_department);
  }, [data?.implementation_department]);

  const departmentId = data?.implementation_department;
  const { data: departmentDoc, isLoading: isDepartmentLoading } = useFrappeGetDoc(
    "Department_prornd",
    departmentId,
    { 
      fields: ["dept_name"],
      enabled: !!departmentId 
    }
  );

  useEffect(() => {
    console.log("ProjectDetails - departmentId:", departmentId);
    console.log("ProjectDetails - departmentDoc:", departmentDoc);
    console.log("ProjectDetails - isDepartmentLoading:", isDepartmentLoading);
  }, [departmentId, departmentDoc, isDepartmentLoading]);

  const activityStreamRef = useRef<ActivityStreamHandle>(null);

  const { call: triggerWorkflowAction, loading: isActionLoading } = useFrappePostCall(
    'rndopsapp.rndopsapp.api.handle_workflow_action'
  );

  const { call: submitProjectRegistration, loading: isSubmittingProject } = useFrappePostCall(
    'rndopsapp.rndopsapp.api.submit_project_registration'
  );

  // New action handlers
  const handleAddFunds = () => {
    // Navigate to add funds page or open modal
    alert("Add Funds functionality will be implemented here");
    // navigate(`/add-funds/${projectName}`);
  };

  const handleAddSanctionDetails = () => {
    // Navigate to add sanction details page or open modal
    alert("Add Sanction Details functionality will be implemented here");
    // navigate(`/add-sanction-details/${projectName}`);
  };

  const handleWorkflowAction = useCallback((action: string) => {
    if (action.toLowerCase() === 'submit') {
      submitProjectRegistration({
        docname: projectName
      }).then(() => {
        alert("Project registration submitted successfully!");
        mutate();
        // Refresh activity stream after workflow action
        activityStreamRef.current?.refetch();
      }).catch((err: any) => {
        console.error("Error submitting project registration:", err);
        alert(`Failed to submit project registration: ${err.message || 'An unknown error occurred.'}`);
      });
    } else {
      triggerWorkflowAction({
        doctype: 'Project Registration',
        docname: projectName,
        action: action
      }).then(() => {
        alert(`Project action '${action}' completed successfully!`);
        mutate();
        // Refresh activity stream after workflow action
        activityStreamRef.current?.refetch();
      }).catch((err: any) => {
        console.error(`Error during workflow action:`, err);
        alert(`Failed to ${action} the project: ${err.message || 'An unknown error occurred.'}`);
      });
    }
  }, [triggerWorkflowAction, submitProjectRegistration, mutate, projectName]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold";
    switch ((status || '').toLowerCase()) {
      case 'draft':
        return cn(baseClasses, "bg-gray-100 text-gray-800 border border-gray-300");
      case 'submitted':
        return cn(baseClasses, "bg-indigo-100 text-indigo-800 border border-indigo-300");
      case 'under review':
        return cn(baseClasses, "bg-yellow-100 text-yellow-800 border border-yellow-300");
      case 'approved':
        return cn(baseClasses, "bg-green-100 text-green-800 border border-green-300");
      case 'rejected':
        return cn(baseClasses, "bg-red-100 text-red-800 border border-red-300");
      default:
        return cn(baseClasses, "bg-gray-100 text-gray-800 border border-gray-300");
    }
  };

  if (!projectName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4">
        <div className="text-center p-6 bg-white rounded-xl shadow-lg max-w-md w-full">
          <FileTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Project Selected</h2>
          <p className="text-gray-600 mb-4 text-sm">Please select a project to view its details.</p>
          <Button onClick={() => navigate('/projects-view')} className="bg-indigo-600 hover:bg-indigo-700 text-sm">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-lg font-semibold text-gray-700">Loading Project Details...</p>
          <p className="text-gray-500 mt-1 text-sm">Please wait while we fetch the project information</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4">
        <div className="text-center p-6 bg-white rounded-xl shadow-lg max-w-md w-full">
          <XCircleIcon className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Project</h2>
          <p className="text-gray-600 mb-4 text-sm">{error.message}</p>
          <Button onClick={() => navigate('/projects-view')} className="bg-indigo-600 hover:bg-indigo-700 text-sm">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-wrapper { padding: 0 !important; }
            .print-container { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 1rem !important; max-width: 100% !important; }
            .print-container * { visibility: visible; }
            body { background-color: white !important; }
          }
      `}</style>

      <div>
        <AppSidebar isPermanentEmployee={isPermanentEmployee} />
        <div className="bg-gradient-to-br from-gray-50 to-indigo-50 min-h-screen p-3 sm:p-4 lg:p-6 font-sans print-wrapper flex-1">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl shadow-xl p-4 sm:p-6 mb-6 text-white">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={handleBack}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200 no-print mt-0.5"
                    aria-label="Go back"
                  >
                    <ArrowLeftIcon className="h-4 w-4 text-white" />
                  </button>
                  <div className="flex-1">
                    <h1 className="text-xl font-bold mb-1">{data?.project_title || 'Project Details'}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-indigo-100 text-sm">
                      <div className="flex items-center gap-1">
                        <FileTextIcon className="h-3 w-3" />
                        <span>Project ID: {projectName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20", getStatusBadge(data?.workflow_state))}>
                          {data?.workflow_state}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* New Action Buttons */}
                  {isCurrentUserPI && (
                    <div className="flex gap-1">
                      <Button
                        onClick={handleAddFunds}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1 rounded-lg flex items-center gap-1 text-sm"
                      >
                        <PlusIcon className="h-3 w-3" />
                        Add Funds
                      </Button>
                      <Button
                        onClick={handleAddSanctionDetails}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1 rounded-lg flex items-center gap-1 text-sm"
                      >
                        <FilePlusIcon className="h-3 w-3" />
                        Add Sanction
                      </Button>
                    </div>
                  )}
                  {projectName && (
                    <LogWorkflowActions
                      docname={projectName}
                      onAction={handleWorkflowAction}
                      isLoading={isActionLoading}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <main className="lg:col-span-2 print-container space-y-4">
                {/* Project Overview */}
                <CollapsibleSection 
                  title="Project Overview" 
                  icon={FileTextIcon}
                  defaultOpen={true}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <FieldDisplay 
                      label="Implementation Department" 
                      value={isDepartmentLoading 
                        ? "Loading..." 
                        : (departmentDoc?.dept_name && departmentDoc.dept_name !== "" 
                            ? departmentDoc.dept_name 
                            : data?.implementation_department || "N/A")} 
                      icon={BuildingIcon} 
                    />
                    <FieldDisplay label="Project Type" value={data?.project_type} icon={FileTextIcon} />
                    {data?.project_type === 'Research' && <FieldDisplay label="Research Sub-Type" value={data?.research_sub_type} icon={FileTextIcon} />}
                    {data?.project_type === 'Consultancy' && <FieldDisplay label="Consultancy Category" value={data?.consultancy_category} icon={FileTextIcon} />}
                    <FieldDisplay label="Project Duration" value={`${data?.project_duration_months} months and ${data?.project_duration_days || 0} days`} icon={CalendarIcon} />
                  </div>

                  <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} icon={FileTextIcon} />
                  <HtmlContent title="Project Objective" htmlString={data?.project_objective} icon={FileTextIcon} />
                  <HtmlContent title="Project Deliverables" htmlString={data?.project_deliverables} icon={FileTextIcon} />
                </CollapsibleSection>

                {/* Investigators */}
                <CollapsibleSection 
                  title="Investigators" 
                  icon={UsersIcon}
                  defaultOpen={true}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FieldDisplay label="Registering For" value={data?.registering_for} icon={UserIcon} />
                    <FieldDisplay label="Principal Investigator" value={data?.principal_investigator_name} icon={UserIcon} />
                    <FieldDisplay label="PI Employee ID" value={data?.pi_employee_id} icon={UserIcon} />
                    <FieldDisplay label="PI Designation" value={data?.designation} icon={UserIcon} />
                    <FieldDisplay label="PI Webmail" value={data?.pi_webmail} icon={UserIcon} />
                  </div>

                  <TableDisplay 
                    label="Additional Principal Investigators" 
                    data={data?.additional_pi_table} 
                    columns={[
                      { fieldname: 'pi_name', label: 'Name' }, 
                      { fieldname: 'pi_designation', label: 'Designation' }, 
                      { fieldname: 'pi_address', label: 'Address / Department' }
                    ]} 
                    icon={UsersIcon}
                  />

                  <TableDisplay 
                    label="Co-Investigators" 
                    data={data?.co_investigator_table} 
                    columns={[
                      { fieldname: 'copi_name', label: 'Name' }, 
                      { fieldname: 'copi_designation', label: 'Designation' }, 
                      { fieldname: 'copi_address', label: 'Department' }
                    ]} 
                    icon={UsersIcon}
                  />
                </CollapsibleSection>

                {/* Funding & Budget */}
                <CollapsibleSection 
                  title="Funding & Proposed Budget" 
                  icon={DollarSignIcon}
                  defaultOpen={true}
                  actionButtons={
                    isCurrentUserPI && (
                      <Button
                        onClick={handleAddFunds}
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-green-50 text-green-700 border-green-300 flex items-center gap-1 text-xs"
                      >
                        <PlusIcon className="h-2.5 w-2.5" />
                        Add Funds
                      </Button>
                    )
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FieldDisplay label="Funding Agency Type" value={data?.funding_agency_type} icon={BuildingIcon} />
                    <FieldDisplay label="Funding Agency" value={data?.funding_agency} icon={BuildingIcon} />
                    <FieldDisplay label="Funding Agency GSTIN" value={data?.funding_agency_gstin} icon={FileTextIcon} />
                    <FieldDisplay label="Total Proposed Budget" value={data?.total_budget_amount} isCurrency icon={DollarSignIcon} />
                  </div>
                  <FieldDisplay label="Funding Agency Address" value={data?.funding_agency_address} icon={BuildingIcon} />
                </CollapsibleSection>

                {/* Sanction Details */}
                {data?.have_sanction_details === 'Yes' && (
                  <CollapsibleSection 
                    title="Sanction Details" 
                    icon={FileTextIcon}
                    defaultOpen={true}
                    actionButtons={
                      isCurrentUserPI && (
                        <Button
                          onClick={handleAddSanctionDetails}
                          variant="outline"
                          size="sm"
                          className="bg-white hover:bg-purple-50 text-purple-700 border-purple-300 flex items-center gap-1 text-xs"
                        >
                          <FilePlusIcon className="h-2.5 w-2.5" />
                          Add Sanction
                        </Button>
                      )
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FieldDisplay label="Sanction Letter No." value={data?.sanctioned_letter_no} icon={FileTextIcon} />
                      <FieldDisplay 
                        label="Sanction Letter Date" 
                        value={data?.sanctioned_letter_date 
                          ? new Date(data.sanctioned_letter_date).toLocaleDateString() 
                          : "N/A"} 
                        icon={CalendarIcon} 
                      />
                      <FieldDisplay label="Total Sanctioned Amount" value={data?.total_sanctioned_amount} isCurrency icon={DollarSignIcon} />
                    </div>
                    <TableDisplay 
                      label="Sanctioned Budget Breakup" 
                      data={data?.sanctioned_budget_breakup} 
                      columns={[
                        { fieldname: 'account_head', label: 'Budget Head' }, 
                        { fieldname: 'amount_sanctioned', label: 'Amount', isCurrency: true }
                      ]} 
                      icon={DollarSignIcon}
                    />
                  </CollapsibleSection>
                )}

                {/* Committee Clearance */}
                <CollapsibleSection 
                  title="Committee Clearance" 
                  icon={ShieldIcon}
                  defaultOpen={true}
                >
                  <FieldDisplay label="Needs Committee Clearance?" value={data?.needs_committee_clearance} icon={ShieldIcon} />
                  {data?.needs_committee_clearance === 'Yes' && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FieldDisplay label="Committee" value={data?.committees} icon={ShieldIcon} />
                        {data?.committees === 'Other' && <FieldDisplay label="Specified Committee" value={data?.other_committee_specify} icon={ShieldIcon} />}
                        <FieldDisplay label="Biosafety Category" value={data?.biosafety_category} icon={ShieldIcon} />
                      </div>
                      <div className="mt-4">
                        <h4 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-1">
                          <ShieldIcon className="h-3 w-3 text-indigo-600" />
                          Declaration
                        </h4>
                        <div className="prose prose-sm max-w-none p-3 bg-white rounded-lg border text-justify shadow-sm" dangerouslySetInnerHTML={{ __html: data?.declaration || '<p>No declaration provided.</p>' }} />
                      </div>
                    </div>
                  )}
                </CollapsibleSection>
              </main>

              {/* Sidebar with Collapsible Sections */}
              <aside className="lg:col-span-1 no-print space-y-4">
                <QuickActions />
                <ActivityStream
                  ref={activityStreamRef}
                  doctype="Project Registration"
                  docname={projectName}
                />
              </aside>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectDetailsView;