// import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useFrappeGetDoc, useFrappePostCall, useFrappeGetCall, useFrappeAuth } from 'frappe-react-sdk';
// import { Button } from '@/components/ui/button'; // Assuming this can be styled via className
// import { Textarea } from '@/components/ui/textarea'; // Assuming this can be styled via className
// import { AppSidebar } from "../components/RndSidebar";
// import {
//     ArrowLeftIcon,
//     FileTextIcon,
//     UsersIcon,
//     DollarSignIcon,
//     ShieldIcon,
//     MessageSquareIcon,
//     SettingsIcon,
//     CalendarIcon,
//     UserIcon,
//     BuildingIcon,
//     CreditCardIcon,
//     UploadIcon,
//     ShoppingCartIcon,
//     UsersIcon as UsersGroupIcon,
//     PlaneIcon,
//     PlusIcon,
//     FilePlusIcon,
//     MapPinIcon,
//     PhoneIcon,
//     MailIcon,
//     GlobeIcon,
//     TargetIcon,
//     ClockIcon,
//     CheckCircleIcon,
//     XCircleIcon
// } from 'lucide-react';
// import { cn } from '@/lib/utils';

// // --- Interfaces ---
// interface ActivityItem {
//     owner: string;
//     creation: string;
//     content: string;
//     comment_type: string;
// }

// interface ActivityStreamProps {
//     doctype: string;
//     docname: string;
// }

// interface ActivityStreamHandle {
//     refetch: () => void;
// }

// interface ProjectDetailsProps {}

// // --- Neo-Brutalism Styled Helper Components ---

// const FieldDisplay = ({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) => {
//     if (!value && value !== 0) return null;
//     return (
//         <div className="bg-white p-3 border-2 border-black rounded-md shadow-[4px_4px_0px_#000]">
//             <div className="flex items-center gap-2 mb-1">
//                 {Icon && <Icon className="h-4 w-4 text-black" />}
//                 <p className="text-sm font-bold text-black uppercase">{label}</p>
//             </div>
//             <p className="text-base text-gray-800 font-mono">{String(value)}</p>
//         </div>
//     );
// };

// const HtmlContent = ({ title, htmlString, icon: Icon }: { title: string, htmlString: string | undefined, icon?: any }) => {
//     if (!htmlString) return null;
//     return (
//         <div className="mb-6 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_#000]">
//             <div className="flex items-center gap-2 mb-3">
//                 {Icon && <Icon className="h-5 w-5 text-black" />}
//                 <h4 className="text-xl font-bold text-black">{title}</h4>
//             </div>
//             <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: htmlString }} />
//         </div>
//     );
// };

// const TableDisplay = ({ label, data, columns, icon: Icon }: { label: string; data: any[] | undefined; columns: { fieldname: string, label: string }[]; icon?: any }) => {
//     if (!data || data.length === 0) return null;
//     return (
//         <div className="mb-6 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_#000]">
//             <div className="flex items-center gap-2 mb-4">
//                 {Icon && <Icon className="h-5 w-5 text-black" />}
//                 <h3 className="text-xl font-bold text-black">{label}</h3>
//             </div>
//             <div className="overflow-x-auto border-2 border-black">
//                 <table className="min-w-full divide-y-2 divide-black">
//                     <thead className="bg-aqua-300">
//                         <tr>
//                             {columns.map(col => (
//                                 <th key={col.fieldname} className="px-4 py-3 text-left text-sm font-bold text-black uppercase tracking-wider">
//                                     {col.label}
//                                 </th>
//                             ))}
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y-2 divide-black bg-white">
//                         {data.map((row, index) => (
//                             <tr key={index} className="hover:bg-aqua-100">
//                                 {columns.map(col => (
//                                     <td key={col.fieldname} className="px-4 py-3 text-sm text-gray-800 font-mono">
//                                         {row[col.fieldname]}
//                                     </td>
//                                 ))}
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// };

// // --- Custom Neo-Brutalism Button ---
// const NeoButton = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
//     return (
//         <button
//             className={cn(
//                 "h-12 px-4 py-2 bg-white border-2 border-black rounded-md font-bold text-black shadow-[4px_4px_0px_#000] transition-all",
//                 "hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]",
//                 "active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
//                 "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-[4px] disabled:translate-y-[4px]",
//                 className
//             )}
//             {...props}
//         >
//             {children}
//         </button>
//     );
// };

// // --- Quick Actions Component ---
// const QuickActions = () => {
//     const ActionButton = ({ children }: { children: React.ReactNode }) => (
//         <NeoButton className="w-full justify-start text-sm">
//             {children}
//         </NeoButton>
//     );

//     const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
//         <div className="p-4 pb-8 border-2 border-black rounded-md bg-white shadow-[4px_4px_0px_#000]">
//             <h3 className="font-bold text-black mb-4 flex items-center gap-2 text-lg">
//                 <Icon className="h-5 w-5" />
//                 {title}
//             </h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                 {children}
//             </div>
//         </div>
//     );

//     return (
//         <div className="space-y-8">
//             <Section title="Advance" icon={CreditCardIcon}>
//                 <ActionButton>Reimbursement</ActionButton>
//                 <ActionButton>Temporary Advance Apply</ActionButton>
//                 <ActionButton>Temporary Advance Settle</ActionButton>
//             </Section>
//             <Section title="Disbursal" icon={UploadIcon}>
//                 <ActionButton>One Time Assistantship</ActionButton>
//                 <ActionButton>Top Up Fellowship</ActionButton>
//             </Section>
//             <Section title="Purchase" icon={ShoppingCartIcon}>
//                 <ActionButton>Direct Purchase upto 10 Lakhs</ActionButton>
//                 <ActionButton>General Indent</ActionButton>
//                 <ActionButton>Generate NIQ</ActionButton>
//                 <ActionButton>Indent cum Sanction Sheet</ActionButton>
//                 <ActionButton>Rate Contract</ActionButton>
//             </Section>
//             <Section title="Recruitment" icon={UsersGroupIcon}>
//                 <ActionButton>Adhoc</ActionButton>
//                 <ActionButton>Committee Member Change Request</ActionButton>
//                 <ActionButton>Contractual</ActionButton>
//                 <ActionButton>Selection Committee Report</ActionButton>
//             </Section>
//             <Section title="Travel" icon={PlaneIcon}>
//                 <ActionButton>Apply</ActionButton>
//                 <ActionButton>TA-DA Settle</ActionButton>
//             </Section>
//             <Section title="Utilities" icon={SettingsIcon}>
//                 <ActionButton>Add New User</ActionButton>
//                 <ActionButton>Application History</ActionButton>
//                 <ActionButton>Form Tracking</ActionButton>
//                 <ActionButton>Incharge Assignment</ActionButton>
//             </Section>
//         </div>
//     );
// };

// // --- Activity Stream Component ---
// const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(({ doctype, docname }, ref) => {
//     // ... (logic remains the same)
//     const [newComment, setNewComment] = useState('');
//     const [isSubmitting, setIsSubmitting] = useState(false);

//     const {
//         data: activityData,
//         mutate: refetchActivity,
//         error: activityError,
//         isLoading: isActivityLoading
//     } = useFrappeGetCall < { message: ActivityItem[] } > (
//         'rndopsapp.rndopsapp.api.get_project_activity',
//         { doctype, docname },
//         {
//             enabled: !!docname,
//             revalidateOnFocus: true,
//             revalidateOnReconnect: true
//         }
//     );

//     const { call: addComment } = useFrappePostCall(
//         'rndopsapp.rndopsapp.api.add_project_comment'
//     );

//     const handleCommentSubmit = async () => {
//         if (!newComment.trim()) return;

//         setIsSubmitting(true);
//         try {
//             await addComment({
//                 doctype,
//                 docname,
//                 content: newComment.trim()
//             });
//             setNewComment('');
//             await refetchActivity();
//         } catch (err: any) {
//             console.error("Failed to add comment:", err);
//             alert("Error: Could not post comment.");
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleKeyPress = (e: React.KeyboardEvent) => {
//         if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
//             handleCommentSubmit();
//         }
//     };

//     useImperativeHandle(ref, () => ({
//         refetch() {
//             refetchActivity();
//         }
//     }));

//     return (
//         <div className="space-y-6">
//             <div className="p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_#000]">
//                 <label htmlFor="comment-textarea" className="block text-sm font-bold text-black mb-3 uppercase">
//                     Add a comment
//                 </label>
//                 <Textarea
//                     id="comment-textarea"
//                     placeholder="Type your comment here... (Press Ctrl+Enter to submit)"
//                     value={newComment}
//                     onChange={(e) => setNewComment(e.target.value)}
//                     onKeyDown={handleKeyPress}
//                     disabled={isSubmitting}
//                     className="resize-none bg-white p-2 border-2 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-aqua-400 focus:border-aqua-400 font-mono shadow-[2px_2px_0px_#000]"
//                     rows={4}
//                 />
//                 <div className="flex items-center justify-between mt-3">
//                     <span className="text-sm text-gray-600 font-mono">
//                         {newComment.length}/1000
//                     </span>
//                     <NeoButton
//                         onClick={handleCommentSubmit}
//                         disabled={isSubmitting || !newComment.trim()}
//                         className="bg-aqua-300 hover:bg-aqua-400"
//                     >
//                         {isSubmitting ? "Submitting..." : "Submit"}
//                     </NeoButton>
//                 </div>
//             </div>

//             <div className="space-y-4">
//                 {isActivityLoading ? (
//                     <div className="flex justify-center py-8">
//                         <div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-aqua-300"></div>
//                     </div>
//                 ) : activityError ? (
//                     <div className="text-center py-8 text-red-700 border-2 border-red-700 rounded-md bg-red-100 shadow-[4px_4px_0px_#800000]">
//                         <p className="font-bold">Failed to load activities</p>
//                         <p className="text-sm mt-1">Please try refreshing the page</p>
//                     </div>
//                 ) : activityData?.message && activityData.message.length > 0 ? (
//                     activityData.message.map((item, index) => (
//                         <div key={`${item.creation}-${index}`} className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_#000]">
//                             <div className="flex-shrink-0">
//                                 <div className="h-10 w-10 rounded-full bg-aqua-300 border-2 border-black flex items-center justify-center font-bold text-black text-lg">
//                                     {item.owner?.charAt(0).toUpperCase() || 'U'}
//                                 </div>
//                             </div>
//                             <div className="flex-1">
//                                 <div className="flex justify-between items-center mb-2">
//                                     <p className="text-sm font-bold text-black">{item.owner || 'Unknown User'}</p>
//                                     <p className="text-sm text-gray-600 flex items-center gap-1 font-mono">
//                                         <ClockIcon className="h-4 w-4" />
//                                         {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
//                                     </p>
//                                 </div>
//                                 <div
//                                     className="text-sm text-gray-800 prose prose-sm max-w-none leading-relaxed"
//                                     dangerouslySetInnerHTML={{ __html: item.content || 'No content' }}
//                                 />
//                                 {item.comment_type && (
//                                     <div className="mt-2">
//                                         <span className="inline-block px-2 py-1 text-xs bg-gray-200 border border-black text-black rounded-md font-mono">
//                                             {item.comment_type}
//                                         </span>
//                                     </div>
//                                 )}
//                             </div>
//                         </div>
//                     ))
//                 ) : (
//                     <div className="text-center py-12 text-gray-600 border-2 border-dashed border-black rounded-md bg-white">
//                         <MessageSquareIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
//                         <p className="font-bold">No activity yet.</p>
//                         <p className="text-sm mt-1">Be the first to add a comment.</p>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// });
// ActivityStream.displayName = 'ActivityStream';

// // --- Workflow Actions Component ---
// const WorkflowActions = ({ docname, onAction, isLoading }: { docname: string, onAction: (action: string) => void, isLoading: boolean }) => {
//     const { data, error, isLoading: isActionsLoading } = useFrappeGetCall<{ message: string[] }>(
//         'rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions',
//         { docname }
//     );

//     if (isActionsLoading) {
//         return <div className="font-bold text-sm">Loading actions...</div>;
//     }

//     if (error || !data?.message || data.message.length === 0) {
//         return null;
//     }

//     return (
//         <div className="flex items-center gap-3">
//             {data.message.map((actionString: string) => (
//                 <NeoButton
//                     key={actionString}
//                     onClick={() => onAction(actionString)}
//                     className={cn("flex items-center gap-2", {
//                         'bg-green-300 hover:bg-green-400': actionString.toLowerCase() === 'approve' || actionString.toLowerCase() === 'submit',
//                         'bg-red-300 hover:bg-red-400': actionString.toLowerCase() === 'reject',
//                         'bg-aqua-300 hover:bg-aqua-400': !['approve', 'reject', 'submit'].includes(actionString.toLowerCase()),
//                     })}
//                     disabled={isLoading}
//                 >
//                     {actionString.toLowerCase() === 'approve' && <CheckCircleIcon className="h-4 w-4" />}
//                     {actionString.toLowerCase() === 'reject' && <XCircleIcon className="h-4 w-4" />}
//                     {isLoading ? "Processing..." : actionString}
//                 </NeoButton>
//             ))}
//         </div>
//     );
// };

// // --- Main Component ---
// const ProjectDetailsView: React.FC<ProjectDetailsProps> = () => {
//     // ... (logic remains the same)
//     const { projectName } = useParams < { projectName: string } > ();
//     const navigate = useNavigate();
//     const [activeTab, setActiveTab] = useState('quick-actions');
//     const activityStreamRef = useRef < ActivityStreamHandle > (null);

//     const { currentUser } = useFrappeAuth();
//     const { data, error, isLoading, mutate } = useFrappeGetDoc('Project Registration', projectName ?? '', {
//         enabled: !!projectName,
//         cacheTime: 0,
//     });

//     const { call: triggerWorkflowAction, loading: isActionLoading } = useFrappePostCall(
//         'rndopsapp.rndopsapp.api.handle_workflow_action'
//     );

//     const { call: submitProjectRegistration } = useFrappePostCall(
//         'rndopsapp.rndopsapp.api.submit_project_registration'
//     );

//     const handleWorkflowAction = useCallback((action: string) => {
//         if (action.toLowerCase() === 'submit') {
//             submitProjectRegistration({
//                 docname: projectName
//             }).then(() => {
//                 mutate();
//                 activityStreamRef.current?.refetch();
//             }).catch((err: any) => {
//                 console.error("Error submitting project registration:", err);
//             });
//         } else {
//             triggerWorkflowAction({
//                 doctype: 'Project Registration',
//                 docname: projectName,
//                 action: action
//             }).then(() => {
//                 mutate();
//                 activityStreamRef.current?.refetch();
//             }).catch((err: any) => {
//                 console.error(`Error during workflow action:`, err);
//             });
//         }
//     }, [triggerWorkflowAction, submitProjectRegistration, mutate, projectName]);

//     const isCurrentUserPI = currentUser && data?.pi_webmail === currentUser;

//     const handleAddFunds = () => {
//         alert("Add Funds functionality will be implemented here");
//     };

//     const handleAddSanctionDetails = () => {
//         alert("Add Sanction Details functionality will be implemented here");
//     };

//     const tabs = [
//         { id: 'quick-actions', label: 'Available Services', icon: SettingsIcon },
//         { id: 'overview', label: 'Overview', icon: FileTextIcon },
//         { id: 'investigators', label: 'Investigators', icon: UsersIcon },
//         { id: 'funding', label: 'Funding', icon: DollarSignIcon },
//         { id: 'clearance', label: 'Clearance', icon: ShieldIcon },
//         { id: 'activity', label: 'Activity', icon: MessageSquareIcon },
//     ];

//     const renderContent = () => {
//         if (!projectName) {
//             return (
//                 <div className="flex items-center justify-center p-4 min-h-screen">
//                     <div className="text-center p-8 max-w-md w-full bg-white border-2 border-black rounded-md shadow-[8px_8px_0px_#000]">
//                         <FileTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
//                         <h2 className="text-2xl font-bold text-black mb-2">No Project Selected</h2>
//                         <p className="text-gray-700 mb-6">Please select a project to view its details.</p>
//                         <NeoButton onClick={() => navigate('/projects-view')} className="bg-aqua-300 hover:bg-aqua-400">
//                             Back to Projects
//                         </NeoButton>
//                     </div>
//                 </div>
//             );
//         }

//         if (isLoading) {
//             return (
//                 <div className="flex items-center justify-center min-h-screen">
//                     <div className="text-center">
//                         <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-aqua-300 mx-auto mb-4"></div>
//                         <p className="text-lg font-bold text-black">Loading Project Details...</p>
//                     </div>
//                 </div>
//             );
//         }

//         if (error) {
//             return (
//                 <div className="flex items-center justify-center p-4 min-h-screen">
//                     <div className="text-center p-8 max-w-md w-full bg-red-100 border-2 border-red-700 rounded-md shadow-[8px_8px_0px_#800000]">
//                         <h2 className="text-2xl font-bold text-red-800 mb-2">Error Loading Project</h2>
//                         <p className="text-red-700 mb-6">{error.message}</p>
//                         <NeoButton onClick={() => navigate('/projects-view')} className="bg-white hover:bg-gray-100">
//                             Back to Projects
//                         </NeoButton>
//                     </div>
//                 </div>
//             );
//         }

//         return (
//             <>
//                 {/* Header */}
//                 <div className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_#000]">
//                     <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
//                         <div className="flex items-center gap-4">
//                             <button
//                                 onClick={() => navigate('/projects-view')}
//                                 className="p-2 bg-white border-2 border-black rounded-md hover:bg-aqua-200"
//                             >
//                                 <ArrowLeftIcon className="h-6 w-6" />
//                             </button>
//                             <div>
//                                 <h1 className="text-3xl font-bold text-black">{data?.project_title || 'Project Details'}</h1>
//                                 <p className="text-gray-700 font-mono">
//                                     ID: {projectName} | Status: <span className="font-bold">{data?.workflow_state || 'Draft'}</span>
//                                 </p>
//                             </div>
//                         </div>
//                         <div className="flex items-center gap-3 flex-wrap">
//                             {isCurrentUserPI && (
//                                 <div className="flex gap-3">
//                                     <NeoButton onClick={handleAddFunds} className="bg-aqua-300 hover:bg-aqua-400 flex items-center gap-2">
//                                         <PlusIcon className="h-4 w-4" /> Add Funds
//                                     </NeoButton>
//                                     <NeoButton onClick={handleAddSanctionDetails} className="bg-aqua-300 hover:bg-aqua-400 flex items-center gap-2">
//                                         <FilePlusIcon className="h-4 w-4" /> Add Sanction
//                                     </NeoButton>
//                                 </div>
//                             )}
//                             <WorkflowActions
//                                 docname={projectName}
//                                 onAction={handleWorkflowAction}
//                                 isLoading={isActionLoading}
//                             />
//                         </div>
//                     </div>
//                 </div>

//                 {/* Tabs & Content */}
//                 <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_#000]">
//                     <div className="border-b-2 border-black">
//                         <nav className="flex space-x-4 p-2 overflow-x-auto">
//                             {tabs.map((tab) => {
//                                 const Icon = tab.icon;
//                                 return (
//                                     <button
//                                         key={tab.id}
//                                         onClick={() => setActiveTab(tab.id)}
//                                         className={cn(
//                                             "flex-shrink-0 flex items-center gap-2 py-2 px-4 font-bold text-sm rounded-md border-2 border-transparent",
//                                             "transition-all",
//                                             activeTab === tab.id
//                                                 ? "bg-aqua-300 border-black shadow-[2px_2px_0px_#000]"
//                                                 : "text-black hover:bg-aqua-100"
//                                         )}
//                                     >
//                                         <Icon className="h-4 w-4" />
//                                         {tab.label}
//                                     </button>
//                                 );
//                             })}
//                         </nav>
//                     </div>

//                     <div className="p-6">
//                         {/* Tab Content */}
//                         {activeTab === 'quick-actions' && <QuickActions />}
//                         {activeTab === 'overview' && (
//                             <div className="space-y-6">
//                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                                     <FieldDisplay label="Implementation Dept" value={data?.implementation_department} icon={BuildingIcon} />
//                                     <FieldDisplay label="Project Type" value={data?.project_type} icon={FileTextIcon} />
//                                     {data?.project_type === 'Research' && <FieldDisplay label="Research Sub-Type" value={data?.research_sub_type} icon={FileTextIcon} />}
//                                     {data?.project_type === 'Consultancy' && <FieldDisplay label="Consultancy Category" value={data?.consultancy_category} icon={FileTextIcon} />}
//                                     <FieldDisplay label="Project Duration" value={`${data?.project_duration_months}m ${data?.project_duration_days || 0}d`} icon={CalendarIcon} />
//                                     <FieldDisplay label="Start Date" value={data?.project_start_date ? new Date(data.project_start_date).toLocaleDateString() : 'N/A'} icon={CalendarIcon} />
//                                     <FieldDisplay label="End Date" value={data?.project_end_date ? new Date(data.project_end_date).toLocaleDateString() : 'N/A'} icon={CalendarIcon} />
//                                     <FieldDisplay label="Status" value={data?.workflow_state} icon={TargetIcon} />
//                                 </div>
//                                 <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} icon={FileTextIcon} />
//                                 {/* ... other HtmlContent components */}
//                             </div>
//                         )}
//                         {activeTab === 'investigators' && (
//                             <div className="space-y-8">
//                                 <div className="p-4 bg-white border-2 border-black rounded-md">
//                                     <h3 className="font-bold text-xl mb-4">Principal Investigator Details</h3>
//                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                         <FieldDisplay label="Registering For" value={data?.registering_for} icon={UserIcon} />
//                                         <FieldDisplay label="PI Name" value={data?.principal_investigator_name} icon={UserIcon} />
//                                         {/* ... other PI fields */}
//                                     </div>
//                                 </div>
//                                 <TableDisplay label="Additional PIs" data={data?.additional_pi_table} columns={[{ fieldname: 'pi_name', label: 'Name' }, /*...*/]} icon={UsersIcon} />
//                                 <TableDisplay label="Co-Investigators" data={data?.co_investigator_table} columns={[{ fieldname: 'copi_name', label: 'Name' }, /*...*/]} icon={UsersIcon} />
//                                 <TableDisplay label="Team Members" data={data?.project_team_members} columns={[{ fieldname: 'team_member_name', label: 'Name' }, /*...*/]} icon={UsersGroupIcon} />
//                             </div>
//                         )}
//                         {activeTab === 'funding' && (
//                            <div className="space-y-8">
//                                <div className="p-4 bg-white border-2 border-black rounded-md">
//                                    <h3 className="font-bold text-xl mb-4">Funding Agency Details</h3>
//                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                        <FieldDisplay label="Agency Type" value={data?.funding_agency_type} icon={BuildingIcon} />
//                                        <FieldDisplay label="Agency Name" value={data?.funding_agency} icon={BuildingIcon} />
//                                        {/* ... other funding fields */}
//                                    </div>
//                                </div>
//                                <TableDisplay label="Proposed Budget" data={data?.proposed_budget_breakup} columns={[{ fieldname: 'account_head', label: 'Budget Head' }, /*...*/]} icon={DollarSignIcon} />
//                                {data?.have_sanction_details === 'Yes' && (
//                                    <TableDisplay label="Sanctioned Budget" data={data?.sanctioned_budget_breakup} columns={[{ fieldname: 'account_head', label: 'Budget Head' }, /*...*/]} icon={DollarSignIcon} />
//                                )}
//                            </div>
//                         )}
//                         {activeTab === 'clearance' && (
//                            <div className="space-y-8">
//                                 <div className="p-4 bg-white border-2 border-black rounded-md">
//                                    <h3 className="font-bold text-xl mb-4">Committee & Compliance</h3>
//                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                        <FieldDisplay label="Needs Clearance?" value={data?.needs_committee_clearance} icon={ShieldIcon} />
//                                        <FieldDisplay label="Committee" value={data?.committees} icon={ShieldIcon} />
//                                        {/* ... other clearance fields */}
//                                    </div>
//                                </div>
//                                <HtmlContent title="Declaration" htmlString={data?.declaration} icon={ShieldIcon} />
//                                <TableDisplay label="Committee Members" data={data?.committee_members} columns={[{ fieldname: 'member_name', label: 'Name' }, /*...*/]} icon={UsersIcon} />
//                            </div>
//                         )}
//                         {activeTab === 'activity' && (
//                             <ActivityStream
//                                 ref={activityStreamRef}
//                                 doctype="Project Registration"
//                                 docname={projectName}
//                             />
//                         )}
//                     </div>
//                 </div>
//             </>
//         );
//     };

//     return (
//         <div>
//             <AppSidebar isPermanentEmployee={true} />
//             <main className="flex-1 p-8">
//                 {renderContent()}
//             </main>
//         </div>
//     );
// };

// export default ProjectDetailsView;

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

// import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useFrappeGetDoc, useFrappePostCall, useFrappeGetCall, useFrappeAuth } from 'frappe-react-sdk';
// import { Textarea } from '@/components/ui/textarea'; // Assuming this can be styled via className
// import { AppSidebar } from "../components/RndSidebar";
// import {
//     ArrowLeftIcon, FileTextIcon, UsersIcon, DollarSignIcon, ShieldIcon, MessageSquareIcon,
//     SettingsIcon, CalendarIcon, UserIcon, BuildingIcon, CreditCardIcon, UploadIcon,
//     ShoppingCartIcon, UsersIcon as UsersGroupIcon, PlaneIcon, PlusIcon, FilePlusIcon,
//     MapPinIcon, PhoneIcon, MailIcon, GlobeIcon, TargetIcon, ClockIcon, CheckCircleIcon, XCircleIcon
// } from 'lucide-react';
// import { cn } from '@/lib/utils';

// // --- Interfaces (Unchanged) ---
// interface ActivityItem { owner: string; creation: string; content: string; comment_type: string; }
// interface ActivityStreamProps { doctype: string; docname: string; }
// interface ActivityStreamHandle { refetch: () => void; }
// interface ProjectDetailsProps {}

// // --- DESIGN REVISION: FieldDisplay component updated to remove individual boxes ---
// const FieldDisplay = ({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) => {
//     if (!value && value !== 0) return null;
//     return (
//         // The outer box/shadow is removed. It will be grouped visually by its parent container.
//         <div className="py-2">
//             <div className="flex items-center gap-2 mb-1">
//                 {Icon && <Icon className="h-4 w-4 text-black" />}
//                 <p className="text-sm font-bold text-black uppercase tracking-wider">{label}</p>
//             </div>
//             <p className="text-base text-gray-800 font-mono">{String(value)}</p>
//         </div>
//     );
// };

// // --- Neo-Brutalism Styled Helper Components (Unchanged) ---
// const HtmlContent = ({ title, htmlString, icon: Icon }: { title: string, htmlString: string | undefined, icon?: any }) => {
//     if (!htmlString) return null;
//     return (
//         <div className="p-4 md:p-6 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//             <div className="flex items-center gap-3 mb-3">
//                 {Icon && <Icon className="h-5 w-5 text-black" />}
//                 <h4 className="text-xl font-bold text-black uppercase">{title}</h4>
//             </div>
//             <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-mono" dangerouslySetInnerHTML={{ __html: htmlString }} />
//         </div>
//     );
// };

// const TableDisplay = ({ label, data, columns, icon: Icon }: { label: string; data: any[] | undefined; columns: { fieldname: string, label: string }[]; icon?: any }) => {
//     if (!data || data.length === 0) return null;
//     return (
//         <div className="p-4 md:p-6 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//             <div className="flex items-center gap-3 mb-4">
//                 {Icon && <Icon className="h-5 w-5 text-black" />}
//                 <h3 className="text-xl font-bold text-black uppercase">{label}</h3>
//             </div>
//             <div className="overflow-x-auto border-2 border-black rounded-md">
//                 <table className="min-w-full divide-y-2 divide-black">
//                     <thead className="bg-cyan-300">
//                         <tr className="divide-x-2 divide-black">
//                             {columns.map(col => (
//                                 <th key={col.fieldname} className="px-4 py-3 text-left text-sm font-bold text-black uppercase tracking-wider">{col.label}</th>
//                             ))}
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y-2 divide-black bg-white">
//                         {data.map((row, index) => (
//                             <tr key={index} className="divide-x-2 divide-black hover:bg-cyan-100">
//                                 {columns.map(col => (
//                                     <td key={col.fieldname} className="px-4 py-3 text-sm text-gray-800 font-mono">{row[col.fieldname]}</td>
//                                 ))}
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// };

// const NeoButton = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
//     <button
//         className={cn(
//             "px-5 py-3 bg-white border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all",
//             "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
//             "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
//             "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300",
//             className
//         )}
//         {...props}
//     >{children}</button>
// );

// // --- DESIGN REVISION: QuickActions buttons updated with muted colors ---
// const QuickActions = () => {
//     const ActionButton = ({ children, className }: { children: React.ReactNode, className?: string }) => (
//         <NeoButton className={cn("w-full justify-start text-sm h-auto py-3", className)}>
//             {children}
//         </NeoButton>
//     );

//     const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
//         <div className="p-4 pb-6 border-2 border-black rounded-md bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//             <h3 className="font-bold text-black mb-4 flex items-center gap-3 text-xl uppercase">
//                 <Icon className="h-5 w-5" />
//                 {title}
//             </h3>
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//                 {children}
//             </div>
//         </div>
//     );

//     return (
//         <div className="space-y-10">
//             <Section title="Advance" icon={CreditCardIcon}>
//                 <ActionButton className="bg-sky-200 hover:bg-sky-300">Reimbursement</ActionButton>
//                 <ActionButton className="bg-sky-200 hover:bg-sky-300">Temporary Advance Apply</ActionButton>
//                 <ActionButton className="bg-sky-200 hover:bg-sky-300">Temporary Advance Settle</ActionButton>
//             </Section>
//             <Section title="Disbursal" icon={UploadIcon}>
//                 <ActionButton className="bg-emerald-200 hover:bg-emerald-300">One Time Assistantship</ActionButton>
//                 <ActionButton className="bg-emerald-200 hover:bg-emerald-300">Top Up Fellowship</ActionButton>
//             </Section>
//             <Section title="Purchase" icon={ShoppingCartIcon}>
//                 <ActionButton className="bg-amber-200 hover:bg-amber-300">Direct Purchase</ActionButton>
//                 <ActionButton className="bg-amber-200 hover:bg-amber-300">General Indent</ActionButton>
//                 <ActionButton className="bg-amber-200 hover:bg-amber-300">Generate NIQ</ActionButton>
//                 <ActionButton className="bg-amber-200 hover:bg-amber-300">Indent cum Sanction</ActionButton>
//                 <ActionButton className="bg-amber-200 hover:bg-amber-300">Rate Contract</ActionButton>
//             </Section>
//             <Section title="Recruitment" icon={UsersGroupIcon}>
//                 <ActionButton className="bg-rose-200 hover:bg-rose-300">Adhoc</ActionButton>
//                 <ActionButton className="bg-rose-200 hover:bg-rose-300">Committee Member Change</ActionButton>
//                 <ActionButton className="bg-rose-200 hover:bg-rose-300">Contractual</ActionButton>
//                 <ActionButton className="bg-rose-200 hover:bg-rose-300">Selection Committee Report</ActionButton>
//             </Section>
//             <Section title="Travel" icon={PlaneIcon}>
//                 <ActionButton className="bg-indigo-200 hover:bg-indigo-300">Apply</ActionButton>
//                 <ActionButton className="bg-indigo-200 hover:bg-indigo-300">TA-DA Settle</ActionButton>
//             </Section>
//             <Section title="Utilities" icon={SettingsIcon}>
//                 <ActionButton className="bg-slate-300 hover:bg-slate-400">Add New User</ActionButton>
//                 <ActionButton className="bg-slate-300 hover:bg-slate-400">Application History</ActionButton>
//                 <ActionButton className="bg-slate-300 hover:bg-slate-400">Form Tracking</ActionButton>
//                 <ActionButton className="bg-slate-300 hover:bg-slate-400">Incharge Assignment</ActionButton>
//             </Section>
//         </div>
//     );
// };

// // --- Activity Stream Component (Unchanged logic, updated styles) ---
// const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(({ doctype, docname }, ref) => {
//     const [newComment, setNewComment] = useState('');
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const { data: activityData, mutate: refetchActivity, error: activityError, isLoading: isActivityLoading } = useFrappeGetCall <{ message: ActivityItem[] }> ('rndopsapp.rndopsapp.api.get_project_activity', { doctype, docname }, { enabled: !!docname, revalidateOnFocus: true, revalidateOnReconnect: true });
//     const { call: addComment } = useFrappePostCall('rndopsapp.rndopsapp.api.add_project_comment');
//     const handleCommentSubmit = async () => { if (!newComment.trim()) return; setIsSubmitting(true); try { await addComment({ doctype, docname, content: newComment.trim() }); setNewComment(''); await refetchActivity(); } catch (err: any) { console.error("Failed to add comment:", err); alert("Error: Could not post comment."); } finally { setIsSubmitting(false); } };
//     const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { handleCommentSubmit(); } };
//     useImperativeHandle(ref, () => ({ refetch() { refetchActivity(); } }));

//     return (
//         <div className="space-y-6">
//             <div className="p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//                 <label htmlFor="comment-textarea" className="block text-sm font-bold text-black mb-3 uppercase">Add a comment</label>
//                 <Textarea id="comment-textarea" placeholder="Type here... (Ctrl+Enter to submit)" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={handleKeyPress} disabled={isSubmitting} className="resize-none bg-white p-3 border-2 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)]" rows={4} />
//                 <div className="flex items-center justify-between mt-4"><span className="text-sm text-gray-600 font-mono">{newComment.length}/1000</span><NeoButton onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()} className="bg-cyan-300 hover:bg-cyan-400">{isSubmitting ? "Submitting..." : "Submit"}</NeoButton></div>
//             </div>
//             <div className="space-y-4">
//                 {isActivityLoading && <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-cyan-400"></div></div>}
//                 {activityError && <div className="text-center p-6 text-red-700 border-2 border-red-700 rounded-md bg-red-100 shadow-[4px_4px_0px_#800000]"><p className="font-bold">Failed to load activities</p></div>}
//                 {activityData?.message && activityData.message.length > 0 ? (
//                     activityData.message.map((item, index) => (
//                         <div key={`${item.creation}-${index}`} className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
//                             <div className="flex-shrink-0 h-12 w-12 rounded-full bg-cyan-300 border-2 border-black flex items-center justify-center font-bold text-black text-xl">{item.owner?.charAt(0).toUpperCase() || 'U'}</div>
//                             <div className="flex-1"><div className="flex justify-between items-center mb-1"><p className="text-base font-bold text-black">{item.owner || 'Unknown User'}</p><p className="text-sm text-gray-600 flex items-center gap-1.5 font-mono"><ClockIcon className="h-4 w-4" />{item.creation ? new Date(item.creation).toLocaleString() : "N/A"}</p></div><div className="text-base text-gray-800 prose prose-sm max-w-none leading-relaxed font-mono" dangerouslySetInnerHTML={{ __html: item.content || 'No content' }} /></div>
//                         </div>
//                     ))
//                 ) : (
//                     !isActivityLoading && <div className="text-center py-12 text-gray-600 border-2 border-dashed border-black rounded-md bg-white"><MessageSquareIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" /><p className="font-bold text-lg">No activity yet.</p><p className="text-sm mt-1">Be the first to add a comment.</p></div>
//                 )}
//             </div>
//         </div>
//     );
// });
// ActivityStream.displayName = 'ActivityStream';

// // --- Workflow Actions Component (Unchanged logic, updated styles) ---
// const WorkflowActions = ({ docname, onAction, isLoading }: { docname: string, onAction: (action: string) => void, isLoading: boolean }) => {
//     const { data, error, isLoading: isActionsLoading } = useFrappeGetCall<{ message: string[] }>('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions', { docname });
//     if (isActionsLoading) { return <div className="font-bold text-sm">Loading actions...</div>; }
//     if (error || !data?.message || data.message.length === 0) { return null; }

//     return (
//         <div className="flex items-center gap-3">
//             {data.message.map((actionString: string) => (
//                 <NeoButton key={actionString} onClick={() => onAction(actionString)} className={cn("flex items-center gap-2", { 'bg-green-300 hover:bg-green-400': actionString.toLowerCase().includes('approve') || actionString.toLowerCase().includes('submit'), 'bg-red-300 hover:bg-red-400': actionString.toLowerCase().includes('reject'), 'bg-cyan-300 hover:bg-cyan-400': !['approve', 'reject', 'submit'].some(term => actionString.toLowerCase().includes(term)), })} disabled={isLoading}>
//                     {actionString.toLowerCase().includes('approve') && <CheckCircleIcon className="h-4 w-4" />}
//                     {actionString.toLowerCase().includes('reject') && <XCircleIcon className="h-4 w-4" />}
//                     {isLoading ? "Processing..." : actionString}
//                 </NeoButton>
//             ))}
//         </div>
//     );
// };

// // --- Main Component ---
// const ProjectDetailsView: React.FC<ProjectDetailsProps> = () => {
//     // --- LOGIC: All hooks and handlers remain unchanged ---
//     const { projectName } = useParams<{ projectName: string }>();
//     const navigate = useNavigate();
//     const [activeTab, setActiveTab] = useState('quick-actions');
//     const activityStreamRef = useRef<ActivityStreamHandle>(null);
//     const { currentUser } = useFrappeAuth();
//     const { data, error, isLoading, mutate } = useFrappeGetDoc('Project Registration', projectName ?? '', { enabled: !!projectName, cacheTime: 0 });

//     const { call: triggerWorkflowAction, loading: isActionLoading } = useFrappePostCall('rndopsapp.rndopsapp.api.handle_workflow_action');
//     const { call: submitProjectRegistration } = useFrappePostCall('rndopsapp.rndopsapp.api.submit_project_registration');
//     const handleWorkflowAction = useCallback((action: string) => {
//         const apiCall = action.toLowerCase() === 'submit' ? submitProjectRegistration({ docname: projectName }) : triggerWorkflowAction({ doctype: 'Project Registration', docname: projectName, action: action });
//         apiCall.then(() => { mutate(); activityStreamRef.current?.refetch(); }).catch((err: any) => console.error(`Error during workflow action:`, err));
//     }, [triggerWorkflowAction, submitProjectRegistration, mutate, projectName]);
//     const isCurrentUserPI = currentUser && data?.pi_webmail === currentUser;
//     console.log("Project details:",data)
//     const handleAddFunds = () => alert("Add Funds functionality will be implemented here.");
//     const handleAddSanctionDetails = () => alert("Add Sanction Details functionality will be implemented here.");

//     const tabs = [
//         { id: 'quick-actions', label: 'Available Services', icon: SettingsIcon },
//         { id: 'overview', label: 'Overview', icon: FileTextIcon },
//         { id: 'investigators', label: 'Investigators', icon: UsersIcon },
//         { id: 'funding', label: 'Funding', icon: DollarSignIcon },
//         { id: 'clearance', label: 'Clearance', icon: ShieldIcon },
//         { id: 'activity', label: 'Activity Log', icon: MessageSquareIcon },
//     ];

//     const renderContent = () => {
//         if (!projectName) {
//             return ( <div className="flex items-center justify-center p-4 min-h-screen"><div className="text-center p-8 max-w-md w-full bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]"><FileTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" /><h2 className="text-2xl font-bold text-black mb-2">No Project Selected</h2><p className="text-gray-700 mb-6 font-mono">Select a project to see details.</p><NeoButton onClick={() => navigate('/projects-view')} className="bg-cyan-300 hover:bg-cyan-400">Back to Projects</NeoButton></div></div> );
//         }
//         if (isLoading) {
//             return ( <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-cyan-300 mx-auto mb-4"></div><p className="text-lg font-bold text-black">Loading Project...</p></div></div> );
//         }
//         if (error) {
//             return ( <div className="flex items-center justify-center p-4 min-h-screen"><div className="text-center p-8 max-w-md w-full bg-red-100 border-2 border-red-700 rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]"><h2 className="text-2xl font-bold text-red-800 mb-2">Error Loading Project</h2><p className="text-red-700 mb-6 font-mono">{error.message}</p><NeoButton onClick={() => navigate('/projects-view')} className="bg-white hover:bg-gray-100">Back to Projects</NeoButton></div></div> );
//         }
//         return (
//             <>
//                 {/* Header */}
//                 <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//                     <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
//                         <div className="flex items-center gap-4">
//                             <button onClick={() => navigate('/projects-view')} className="p-3 bg-white border-2 border-black rounded-md hover:bg-cyan-100 active:translate-y-1 transition-transform"><ArrowLeftIcon className="h-6 w-6" /></button>
//                             <div>
//                                 <h1 className="text-3xl font-extrabold text-black">{data?.project_title || 'Project Details'}</h1>
//                                 <p className="text-gray-700 font-mono mt-1">ID: {projectName} | Status: <span className="font-bold text-black">{data?.workflow_state || 'Draft'}</span></p>
//                             </div>
//                         </div>
//                         <div className="flex items-center gap-3 flex-wrap">
//                             {isCurrentUserPI && ( <div className="flex gap-3"><NeoButton onClick={handleAddFunds} className="bg-cyan-300 hover:bg-cyan-400 flex items-center gap-2"><PlusIcon className="h-4 w-4" /> Add Funds</NeoButton><NeoButton onClick={handleAddSanctionDetails} className="bg-cyan-300 hover:bg-cyan-400 flex items-center gap-2"><FilePlusIcon className="h-4 w-4" /> Add Sanction</NeoButton></div> )}
//                             <WorkflowActions docname={projectName} onAction={handleWorkflowAction} isLoading={isActionLoading} />
//                         </div>
//                     </div>
//                 </header>

//                 {/* Tabs & Content */}
//                 <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//                     <div className="border-b-2 border-black"><nav className="flex space-x-2 p-2 overflow-x-auto">
//                         {tabs.map((tab) => (
//                             <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex-shrink-0 flex items-center gap-2 py-3 px-4 font-bold text-sm rounded-md border-2 border-transparent transition-all", activeTab === tab.id ? "bg-cyan-300 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)]" : "text-black hover:bg-cyan-100")}>
//                                 <tab.icon className="h-5 w-5" />{tab.label}
//                             </button>
//                         ))}
//                     </nav></div>
//                     <div className="p-6 md:p-8">
//                         {activeTab === 'quick-actions' && <QuickActions />}
//                         {activeTab === 'overview' && (
//                             <div className="space-y-8">
//                                 <div className="p-4 bg-white border-2 border-black rounded-md"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 divide-y md:divide-y-0">
//                                     <FieldDisplay label="Implementation Dept" value={data?.implementation_department} icon={BuildingIcon} />
//                                     <FieldDisplay label="Project Type" value={data?.project_type} icon={FileTextIcon} />
//                                     {data?.project_type === 'Research' && <FieldDisplay label="Research Sub-Type" value={data?.research_sub_type} icon={FileTextIcon} />}
//                                     {data?.project_type === 'Consultancy' && <FieldDisplay label="Consultancy Category" value={data?.consultancy_category} icon={FileTextIcon} />}
//                                     <FieldDisplay label="Project Duration" value={`${data?.project_duration_months}m ${data?.project_duration_days || 0}d`} icon={CalendarIcon} />
//                                     <FieldDisplay label="Start Date" value={data?.project_start_date ? new Date(data.project_start_date).toLocaleDateString() : 'N/A'} icon={CalendarIcon} />
//                                     <FieldDisplay label="End Date" value={data?.project_end_date ? new Date(data.project_end_date).toLocaleDateString() : 'N/A'} icon={CalendarIcon} />
//                                     <FieldDisplay label="Status" value={data?.workflow_state} icon={TargetIcon} />
//                                 </div></div>
//                                 <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} icon={FileTextIcon} />
//                                 <HtmlContent title="Project Objective" htmlString={data?.project_objective} icon={TargetIcon} />
//                             </div>
//                         )}
//                         {activeTab === 'investigators' && ( <div className="space-y-8"><TableDisplay label="Additional PIs" data={data?.additional_pi_table} columns={[{ fieldname: 'pi_name', label: 'Name' }, { fieldname: 'pi_designation', label: 'Designation' }, { fieldname: 'pi_email', label: 'Email' }]} icon={UsersIcon} /><TableDisplay label="Co-Investigators" data={data?.co_investigator_table} columns={[{ fieldname: 'copi_name', label: 'Name' }, { fieldname: 'copi_designation', label: 'Designation' }, { fieldname: 'copi_email', label: 'Email' }]} icon={UsersIcon} /></div> )}
//                         {activeTab === 'funding' && ( <div className="space-y-8"><TableDisplay label="Proposed Budget" data={data?.proposed_budget_breakup} columns={[{ fieldname: 'account_head', label: 'Budget Head' }, { fieldname: 'amount', label: 'Amount' }]} icon={DollarSignIcon} />{data?.have_sanction_details === 'Yes' && (<TableDisplay label="Sanctioned Budget" data={data?.sanctioned_budget_breakup} columns={[{ fieldname: 'account_head', label: 'Budget Head' }, { fieldname: 'amount_sanctioned', label: 'Amount' }]} icon={DollarSignIcon} />)}</div> )}
//                         {activeTab === 'clearance' && ( <div className="space-y-8"><HtmlContent title="Declaration" htmlString={data?.declaration} icon={ShieldIcon} /><TableDisplay label="Committee Members" data={data?.committee_members} columns={[{ fieldname: 'member_name', label: 'Name' }, { fieldname: 'role', label: 'Role' }]} icon={UsersIcon} /></div> )}
//                         {activeTab === 'activity' && <ActivityStream ref={activityStreamRef} doctype="Project Registration" docname={projectName} />}
//                     </div>
//                 </div>
//             </>
//         );
//     };

//     return (
//         // --- DESIGN REVISION: Dull background color applied here ---
//         <div className="bg-[#FDFCEC]">
//             <AppSidebar isPermanentEmployee={true} />
//             <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//                 {renderContent()}
//             </main>
//         </div>
//     );
// };

// export default ProjectDetailsView;

// -=-=-=-=--= v4

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
import { Textarea } from "@/components/ui/textarea"; // Assuming this can be styled via className
import { AppSidebar } from "../components/RndSidebar";
import {
  ArrowLeftIcon,
  FileTextIcon,
  UsersIcon,
  DollarSignIcon,
  ShieldIcon,
  MessageSquareIcon,
  SettingsIcon,
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
  PhoneIcon,
  MailIcon,
  GlobeIcon,
  TargetIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Interfaces (Unchanged) ---
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

// --- DESIGN: FieldDisplay Component (No boxes) ---
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
      <p className="bg-[#ECEFF1] text-base text-gray-800 font-mono">{String(value)}</p>
    </div>
  );
};

// --- Neo-Brutalism Styled Helper Components (Unchanged) ---
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
    <div className="p-4 md:p-6 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-3 mb-3">
        {Icon && <Icon className="h-5 w-5 text-black" />}
        <h4 className="text-xl font-bold text-black uppercase">{title}</h4>
      </div>
      <div
        className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-mono"
        dangerouslySetInnerHTML={{ __html: htmlString }}
      />
    </div>
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
    <div className="p-4 md:p-6 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-3 mb-4">
        {Icon && <Icon className="h-5 w-5 text-black" />}
        <h3 className="text-xl font-bold text-black uppercase">{label}</h3>
      </div>
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
    </div>
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

// --- QuickActions Component with Muted Colors ---
const QuickActions = () => {
  const ActionButton = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <NeoButton
      className={cn("w-full justify-start text-sm h-auto py-3", className)}
    >
      {children}
    </NeoButton>
  );
  const Section = ({
    title,
    icon: Icon,
    children,
  }: {
    title: string;
    icon: any;
    children: React.ReactNode;
  }) => (
    <div className="p-4 pb-6 border-2 border-black rounded-md bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
      <h3 className="font-bold text-black mb-4 flex items-center gap-3 text-xl uppercase">
        <Icon className="h-5 w-5" />
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
  return (
    <div className="space-y-10">
      <Section title="Advance" icon={CreditCardIcon}>
        <ActionButton className="bg-sky-200 hover:bg-sky-300">
          Reimbursement
        </ActionButton>
        <ActionButton className="bg-sky-200 hover:bg-sky-300">
          Temporary Advance Apply
        </ActionButton>
        <ActionButton className="bg-sky-200 hover:bg-sky-300">
          Temporary Advance Settle
        </ActionButton>
      </Section>
      <Section title="Disbursal" icon={UploadIcon}>
        <ActionButton className="bg-emerald-200 hover:bg-emerald-300">
          One Time Assistantship
        </ActionButton>
        <ActionButton className="bg-emerald-200 hover:bg-emerald-300">
          Top Up Fellowship
        </ActionButton>
      </Section>
      <Section title="Purchase" icon={ShoppingCartIcon}>
        <ActionButton className="bg-amber-200 hover:bg-amber-300">
          Direct Purchase
        </ActionButton>
        <ActionButton className="bg-amber-200 hover:bg-amber-300">
          General Indent
        </ActionButton>
        <ActionButton className="bg-amber-200 hover:bg-amber-300">
          Generate NIQ
        </ActionButton>
        <ActionButton className="bg-amber-200 hover:bg-amber-300">
          Indent cum Sanction
        </ActionButton>
        <ActionButton className="bg-amber-200 hover:bg-amber-300">
          Rate Contract
        </ActionButton>
      </Section>
      <Section title="Recruitment" icon={UsersGroupIcon}>
        <ActionButton className="bg-rose-200 hover:bg-rose-300">
          Adhoc
        </ActionButton>
        <ActionButton className="bg-rose-200 hover:bg-rose-300">
          Committee Member Change
        </ActionButton>
        <ActionButton className="bg-rose-200 hover:bg-rose-300">
          Contractual
        </ActionButton>
        <ActionButton className="bg-rose-200 hover:bg-rose-300">
          Selection Committee Report
        </ActionButton>
      </Section>
      <Section title="Travel" icon={PlaneIcon}>
        <ActionButton className="bg-indigo-200 hover:bg-indigo-300">
          Apply
        </ActionButton>
        <ActionButton className="bg-indigo-200 hover:bg-indigo-300">
          TA-DA Settle
        </ActionButton>
      </Section>
      <Section title="Utilities" icon={SettingsIcon}>
        <ActionButton className="bg-slate-300 hover:bg-slate-400">
          Add New User
        </ActionButton>
        <ActionButton className="bg-slate-300 hover:bg-slate-400">
          Application History
        </ActionButton>
        <ActionButton className="bg-slate-300 hover:bg-slate-400">
          Form Tracking
        </ActionButton>
        <ActionButton className="bg-slate-300 hover:bg-slate-400">
          Incharge Assignment
        </ActionButton>
      </Section>
    </div>
  );
};

// --- Activity Stream Component (Unchanged logic, updated styles) ---
const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(
  ({ doctype, docname }, ref) => {
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const {
      data: activityData,
      mutate: refetchActivity,
      error: activityError,
      isLoading: isActivityLoading,
    } = useFrappeGetCall<{ message: ActivityItem[] }>(
      "rndopsapp.rndopsapp.api.get_project_activity",
      { doctype, docname },
      {
        enabled: !!docname,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
      }
    );
    const { call: addComment } = useFrappePostCall(
      "rndopsapp.rndopsapp.api.add_project_comment"
    );
    const handleCommentSubmit = async () => {
      if (!newComment.trim()) return;
      setIsSubmitting(true);
      try {
        await addComment({ doctype, docname, content: newComment.trim() });
        setNewComment("");
        await refetchActivity();
      } catch (err: any) {
        console.error("Failed to add comment:", err);
        alert("Error: Could not post comment.");
      } finally {
        setIsSubmitting(false);
      }
    };
    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        handleCommentSubmit();
      }
    };
    useImperativeHandle(ref, () => ({
      refetch() {
        refetchActivity();
      },
    }));
    return (
      <div className="space-y-6">
        <div className="p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
          <label
            htmlFor="comment-textarea"
            className="block text-sm font-bold text-black mb-3 uppercase"
          >
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
            <span className="text-sm text-gray-600 font-mono">
              {newComment.length}/1000
            </span>
            <NeoButton
              onClick={handleCommentSubmit}
              disabled={isSubmitting || !newComment.trim()}
              className="bg-cyan-300 hover:bg-cyan-400"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </NeoButton>
          </div>
        </div>
        <div className="space-y-4">
          {isActivityLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-cyan-400"></div>
            </div>
          )}
          {activityError && (
            <div className="text-center p-6 text-red-700 border-2 border-red-700 rounded-md bg-red-100 shadow-[4px_4px_0px_#800000]">
              <p className="font-bold">Failed to load activities</p>
            </div>
          )}
          {activityData?.message && activityData.message.length > 0
            ? activityData.message.map((item, index) => (
                <div
                  key={`${item.creation}-${index}`}
                  className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-cyan-300 border-2 border-black flex items-center justify-center font-bold text-black text-xl">
                    {item.owner?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-base font-bold text-black">
                        {item.owner || "Unknown User"}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1.5 font-mono">
                        <ClockIcon className="h-4 w-4" />
                        {item.creation
                          ? new Date(item.creation).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                    <div
                      className="text-base text-gray-800 prose prose-sm max-w-none leading-relaxed font-mono"
                      dangerouslySetInnerHTML={{
                        __html: item.content || "No content",
                      }}
                    />
                  </div>
                </div>
              ))
            : !isActivityLoading && (
                <div className="text-center py-12 text-gray-600 border-2 border-dashed border-black rounded-md bg-white">
                  <MessageSquareIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="font-bold text-lg">No activity yet.</p>
                  <p className="text-sm mt-1">Be the first to add a comment.</p>
                </div>
              )}
        </div>
      </div>
    );
  }
);
ActivityStream.displayName = "ActivityStream";

// --- Workflow Actions Component (Unchanged) ---
const WorkflowActions = ({
  docname,
  onAction,
  isLoading,
}: {
  docname: string;
  onAction: (action: string) => void;
  isLoading: boolean;
}) => {
  const {
    data,
    error,
    isLoading: isActionsLoading,
  } = useFrappeGetCall<{ message: string[] }>(
    "rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions",
    { docname }
  );
  if (isActionsLoading) {
    return <div className="font-bold text-sm">Loading actions...</div>;
  }
  if (error || !data?.message || data.message.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-3">
      {data.message.map((actionString: string) => (
        <NeoButton
          key={actionString}
          onClick={() => onAction(actionString)}
          className={cn("flex items-center gap-2", {
            "bg-green-300 hover:bg-green-400":
              actionString.toLowerCase().includes("approve") ||
              actionString.toLowerCase().includes("submit"),
            "bg-red-300 hover:bg-red-400": actionString
              .toLowerCase()
              .includes("reject"),
            "bg-cyan-300 hover:bg-cyan-400": ![
              "approve",
              "reject",
              "submit",
            ].some((term) => actionString.toLowerCase().includes(term)),
          })}
          disabled={isLoading}
        >
          {actionString.toLowerCase().includes("approve") && (
            <CheckCircleIcon className="h-4 w-4" />
          )}
          {actionString.toLowerCase().includes("reject") && (
            <XCircleIcon className="h-4 w-4" />
          )}
          {isLoading ? "Processing..." : actionString}
        </NeoButton>
      ))}
    </div>
  );
};

// --- Main Component ---
const ProjectDetailsView: React.FC<ProjectDetailsProps> = () => {
  // --- LOGIC: All hooks and handlers remain unchanged ---
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview"); // Default to overview
  const activityStreamRef = useRef<ActivityStreamHandle>(null);
  const { currentUser } = useFrappeAuth();
  const { data, error, isLoading, mutate } = useFrappeGetDoc(
    "Project Registration",
    projectName ?? "",
    { enabled: !!projectName, cacheTime: 0 }
  );
  const { call: triggerWorkflowAction, loading: isActionLoading } =
    useFrappePostCall("rndopsapp.rndopsapp.api.handle_workflow_action");
  const { call: submitProjectRegistration } = useFrappePostCall(
    "rndopsapp.rndopsapp.api.submit_project_registration"
  );
  const handleWorkflowAction = useCallback(
    (action: string) => {
      const apiCall =
        action.toLowerCase() === "submit"
          ? submitProjectRegistration({ docname: projectName })
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
  const handleAddFunds = () =>
    alert("Add Funds functionality will be implemented here.");
  const handleAddSanctionDetails = () =>
    alert("Add Sanction Details functionality will be implemented here.");

  const tabs = [
    // { id: "quick-actions", label: "Available Services", icon: SettingsIcon },
    { id: "overview", label: "Overview", icon: FileTextIcon },
    { id: "investigators", label: "Investigators", icon: UsersIcon },
    { id: "funding", label: "Funding & Budget", icon: DollarSignIcon },
    { id: "clearance", label: "Clearance", icon: ShieldIcon },
    { id: "activity", label: "Activity Log", icon: MessageSquareIcon },
  ];

  const renderContent = () => {
    if (!projectName) {
      return (
        <div className="flex items-center justify-center p-4 min-h-screen">
          <div className="text-center p-8 max-w-md w-full bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
            <FileTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-black mb-2">
              No Project Selected
            </h2>
            <p className="text-gray-700 mb-6 font-mono">
              Select a project to see details.
            </p>
            <NeoButton
              onClick={() => navigate("/projects-view")}
              className="bg-cyan-300 hover:bg-cyan-400"
            >
              Back to Projects
            </NeoButton>
          </div>
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-cyan-300 mx-auto mb-4"></div>
            <p className="text-lg font-bold text-black">Loading Project...</p>
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex items-center justify-center p-4 min-h-screen">
          <div className="text-center p-8 max-w-md w-full bg-red-100 border-2 border-red-700 rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
            <h2 className="text-2xl font-bold text-red-800 mb-2">
              Error Loading Project
            </h2>
            <p className="text-red-700 mb-6 font-mono">{error.message}</p>
            <NeoButton
              onClick={() => navigate("/projects-view")}
              className="bg-white hover:bg-gray-100"
            >
              Back to Projects
            </NeoButton>
          </div>
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
                <h1 className="text-3xl font-extrabold text-black">
                  {data?.project_title || "Project Details"}
                </h1>
                <p className="text-gray-700 font-mono mt-1">
                  ID: {projectName} | Status:{" "}
                  <span className="font-bold text-black">
                    {data?.workflow_state || "Draft"}
                  </span>
                </p>
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
              <WorkflowActions
                docname={projectName}
                onAction={handleWorkflowAction}
                isLoading={isActionLoading}
              />
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
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="bg-[#F5F5F5] p-6 md:p-8">
            {activeTab === "overview" && (
              <div className="space-y-8">
                <div className="p-4 bg-white border-2 border-black rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                    <FieldDisplay
                      label="Project Type"
                      value={data?.project_type}
                      icon={FileTextIcon}
                    />
                    <FieldDisplay
                      label="Implementation Dept"
                      value={data?.implementation_department}
                      icon={BuildingIcon}
                    />
                    <FieldDisplay
                      label="Status"
                      value={data?.workflow_state}
                      icon={TargetIcon}
                    />
                    <FieldDisplay
                      label="Project Duration"
                      value={`${data?.project_duration_months}m ${
                        data?.project_duration_days || 0
                      }d`}
                      icon={CalendarIcon}
                    />
                    <FieldDisplay
                      label="International Travel"
                      value={data?.involves_international_travel}
                      icon={PlaneIcon}
                    />
                  </div>
                </div>
                <div className="p-4 bg-white border-2 border-black rounded-md">
                  <h3 className="text-xl font-bold uppercase text-black mb-2">
                    Funding Agency
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                    <FieldDisplay
                      label="Agency Name"
                      value={data?.funding_agen}
                      icon={BuildingIcon}
                    />
                    <FieldDisplay
                      label="Agency Type"
                      value={data?.funding_agency_type}
                      icon={UsersIcon}
                    />
                    <FieldDisplay
                      label="Origin"
                      value={data?.origin_of_funding_agency}
                      icon={GlobeIcon}
                    />
                    <FieldDisplay
                      label="Ministry"
                      value={data?.funding_agency_ministry}
                      icon={BuildingIcon}
                    />
                    <FieldDisplay
                      label="Scheme"
                      value={data?.funding_agency_schemes}
                      icon={FileTextIcon}
                    />
                    <FieldDisplay
                      label="Address"
                      value={`${data?.address_street_village_locality}, ${data?.address_state}, ${data?.address_country} - ${data?.address_postal_code}`}
                      icon={MapPinIcon}
                    />
                  </div>
                </div>
                <HtmlContent
                  title="Executive Summary"
                  htmlString={data?.executive_summary}
                  icon={FileTextIcon}
                />
                <HtmlContent
                  title="Project Objective"
                  htmlString={data?.project_objective}
                  icon={TargetIcon}
                />
                <HtmlContent
                  title="Project Deliverables"
                  htmlString={data?.project_deliverables}
                  icon={CheckCircleIcon}
                />
              </div>
            )}
            {activeTab === "investigators" && (
              <div className="space-y-8">
                <div className="p-4 bg-white border-2 border-black rounded-md">
                  <h3 className="text-xl font-bold uppercase text-black mb-2">
                    Principal Investigator (PI)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                    <FieldDisplay
                      label="Name"
                      value={data?.principal_investigator_name}
                      icon={UserIcon}
                    />
                    <FieldDisplay
                      label="Email"
                      value={data?.pi_webmail}
                      icon={MailIcon}
                    />
                    <FieldDisplay
                      label="Employee ID"
                      value={data?.pi_employee_id}
                      icon={UserIcon}
                    />
                    <FieldDisplay
                      label="Designation"
                      value={data?.designation}
                      icon={UsersIcon}
                    />
                    <FieldDisplay
                      label="Department"
                      value={data?.applicant_department}
                      icon={BuildingIcon}
                    />
                  </div>
                </div>
                {data?.is_additional_pi === "Yes" && (
                  <TableDisplay
                    label="Additional PIs"
                    data={data?.additional_pi_table}
                    columns={[
                      { fieldname: "pi_name", label: "Name" },
                      { fieldname: "pi_designation", label: "Designation" },
                      { fieldname: "pi_email", label: "Email" },
                      { fieldname: "pi_address", label: "Address" },
                      { fieldname: "pi_contact", label: "Contact" },
                    ]}
                    icon={UsersIcon}
                  />
                )}
                {data?.has_co_pi === "Yes" && (
                  <TableDisplay
                    label="Co-Investigators"
                    data={data?.co_investigator_table}
                    columns={[
                      { fieldname: "copi_name", label: "Name" },
                      { fieldname: "copi_designation", label: "Designation" },
                      { fieldname: "copi_email", label: "Email" },
                      { fieldname: "copi_address", label: "Address" },
                      { fieldname: "copi_contact", label: "Contact" },
                    ]}
                    icon={UsersIcon}
                  />
                )}
              </div>
            )}
            {activeTab === "funding" && (
              <div className="space-y-8">
                <TableDisplay
                  label="Proposed Budget Breakup"
                  data={data?.proposed_budget_breakup}
                  columns={[
                    { fieldname: "account_head", label: "Budget Head" },
                    { fieldname: "first_year_budget", label: "Year 1" },
                    { fieldname: "second_year_budget", label: "Year 2" },
                  ]}
                  icon={DollarSignIcon}
                />
                {data?.equipment_checkbox === 1 && (
                  <TableDisplay
                    label="Proposed Equipment"
                    data={data?.proposed_equipment_details}
                    columns={[
                      { fieldname: "item_name", label: "Equipment Name" },
                      { fieldname: "equip_total_unit_cost", label: "Cost" },
                    ]}
                    icon={ShoppingCartIcon}
                  />
                )}
                {data?.manpower_checkbox === 1 && (
                  <TableDisplay
                    label="Proposed Manpower"
                    data={data?.proposed_manpower_details}
                    columns={[
                      { fieldname: "designation_name", label: "Position" },
                      { fieldname: "manpower_salary", label: "Salary" },
                    ]}
                    icon={UsersGroupIcon}
                  />
                )}
              </div>
            )}
            {activeTab === "clearance" && (
              <div className="space-y-8">
                <div className="p-4 bg-white border-2 border-black rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                    <FieldDisplay
                      label="Needs Committee Clearance"
                      value={data?.needs_committee_clearance}
                      icon={ShieldIcon}
                    />
                    <FieldDisplay
                      label="Committee"
                      value={data?.committees}
                      icon={UsersIcon}
                    />
                    <FieldDisplay
                      label="Ethics Committee Details"
                      value={data?.ethics_committee_details}
                      icon={FileTextIcon}
                    />
                    <FieldDisplay
                      label="Biosafety Category"
                      value={data?.biosafety_category}
                      icon={ShieldIcon}
                    />
                    <FieldDisplay
                      label="Needs Endorsement"
                      value={data?.need_endorsement_copy}
                      icon={CheckCircleIcon}
                    />
                  </div>
                </div>
                {data?.declaration_html === 1 && (
                  <HtmlContent
                    title="Declaration"
                    htmlString={
                      "<p>Declaration content would be displayed here.</p>"
                    }
                    icon={FileTextIcon}
                  />
                )}
              </div>
            )}
            {activeTab === "activity" && (
              <ActivityStream
                ref={activityStreamRef}
                doctype="Project Registration"
                docname={projectName}
              />
            )}
            {activeTab === "quick-actions" && <QuickActions />}
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

export default ProjectDetailsView;
