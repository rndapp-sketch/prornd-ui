// import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef } from 'react'; // ✨ CHANGED
// import { useFrappeGetDoc, useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
// import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

// // ✨ NEW: Define the type for the functions we expose via the ref
// interface ActivityStreamHandle {
//   refetch: () => void;
// }

// interface ProjectDetailsProps {
//   projectName: string;
// }

// // --- Helper Components ---
// const FieldDisplay = ({ label, value, isCurrency = false }: { label: string; value: any; isCurrency?: boolean }) => {
//   if (!value && value !== 0) return null;
//   const displayValue = isCurrency ? `₹ ${Number(value).toLocaleString('en-IN')}` : String(value);
//   return (
//     <div className="py-2">
//       <p className="text-sm font-bold text-gray-600">{label}</p>
//       <p className="mt-1 text-base text-gray-800">{displayValue}</p>
//     </div>
//   );
// };

// const SectionTitle = ({ title }: { title: string }) => (
//   <h3 className="text-xl font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-4 mt-6">
//     {title}
//   </h3>
// );

// const HtmlContent = ({ title, htmlString }: { title: string, htmlString: string | undefined }) => {
//   if (!htmlString) return null;
//   return (
//     <div className="mt-4">
//       <h4 className="text-md font-bold text-gray-700">{title}</h4>
//       <div className="prose prose-sm max-w-none mt-1 text-gray-800 text-justify" dangerouslySetInnerHTML={{ __html: htmlString }} />
//     </div>
//   );
// };

// const TableDisplay = ({ label, data, columns }: { label: string; data: any[] | undefined; columns: { fieldname: string, label: string, isCurrency?: boolean }[] }) => {
//   if (!data || data.length === 0) return null;
//   return (
//     <div className="my-4">
//       <p className="text-md font-bold text-gray-700 mb-2">{label}</p>
//       <div className="overflow-x-auto rounded-lg border border-gray-200">
//         <table className="min-w-full divide-y divide-gray-200 bg-white">
//         <thead className="bg-gray-50">
//           <tr>{columns.map(col => (<th key={col.fieldname} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{col.label}</th>))}</tr>
//         </thead>
//         <tbody className="divide-y divide-gray-200">
//           {data.map((row, index) => (<tr key={index} className="hover:bg-gray-50">{columns.map(col => (<td key={col.fieldname} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{col.isCurrency ? `₹ ${Number(row[col.fieldname] || 0).toLocaleString('en-IN')}` : row[col.fieldname]}</td>))}</tr>))}
//         </tbody>
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
//         return 'bg-green-600 hover:bg-green-700';
//       case 'reject':
//         return 'bg-red-600 hover:bg-red-700';
//       case 'cancel':
//         return 'bg-gray-500 hover:bg-gray-600';
//       default:
//         return 'bg-blue-600 hover:bg-blue-700';
//     }
//   };

//   return (
//     <div className="flex items-center space-x-2 no-print">
//       {actions.map((actionItem: WorkflowAction) => (
//         <Button
//           key={actionItem.action}
//           onClick={() => onAction(actionItem.action)}
//           className={getButtonClass(actionItem.action)}
//           disabled={isLoading}
//         >
//           {isLoading ? 'Processing...' : (actionItem.label || actionItem.action)}
//         </Button>
//       ))}
//     </div>
//   );
// };

// // --- Activity Stream Component ---
// // ✨ CHANGED: Use forwardRef to get a ref from the parent
// const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(({ doctype, docname }, ref) => {
//   const [newComment, setNewComment] = useState('');

//   const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{ message: ActivityItem[] }>(
//     'rndopsapp.rndopsapp.api.get_project_activity',
//     { doctype, docname },
//     { enabled: !!docname }
//   );
  
//   // ✨ NEW: Expose the `refetchActivity` function to the parent component
//   useImperativeHandle(ref, () => ({
//     refetch() {
//       refetchActivity();
//     }
//   }));

//   const { call: addComment, loading: isCommenting } = useFrappePostCall(
//     'rndopsapp.rndopsapp.api.add_project_comment'
//   );

//   const handleCommentSubmit = async () => {
//     if (!newComment.trim()) return;
//     try {
//       await addComment({
//         doctype,
//         docname,
//         content: newComment
//       });
//       setNewComment('');
//       await refetchActivity(); // This still works for new comments
//     } catch (err) {
//       console.error("Failed to add comment:", err);
//       alert("Error: Could not post comment.");
//     }
//   };

//   return (
//     <Card className="sticky top-8">
//       <CardHeader>
//         <CardTitle>Activity & Comments</CardTitle>
//       </CardHeader>
//       <CardContent>
//         <div className="space-y-6">
//           <div>
//             <Textarea
//               placeholder="Add a comment or update..."
//               value={newComment}
//               onChange={(e) => setNewComment(e.target.value)}
//               disabled={isCommenting}
//               className="mb-2"
//             />
//             <Button onClick={handleCommentSubmit} disabled={isCommenting || !newComment.trim()}>
//               {isCommenting ? 'Submitting...' : 'Submit Comment'}
//             </Button>
//           </div>
//           <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 border-t pt-4">
//             {activityData?.message && activityData.message.length > 0 ? (
//               activityData.message.map((item, index) => (
//                 <div key={`${item.creation}-${index}`} className="flex items-start space-x-3">
//                   <div className="flex-shrink-0">
//                     <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600">
//                       {item.owner?.charAt(0).toUpperCase()}
//                     </div>
//                   </div>
//                   <div className="flex-1 bg-gray-50 p-3 rounded-lg">
//                     <div className="flex justify-between items-center">
//                       <p className="text-sm font-semibold text-gray-900">{item.owner}</p>
//                       <p className="text-xs text-gray-500">{new Date(item.creation).toLocaleString()}</p>
//                     </div>
//                     <div
//                       className="mt-1 text-sm text-gray-700 prose prose-sm max-w-none"
//                       dangerouslySetInnerHTML={{ __html: item.content }}
//                     />
//                   </div>
//                 </div>
//               ))
//             ) : (
//               <p className="text-sm text-gray-500 text-center py-4">No activity yet.</p>
//             )}
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// });

// // ✨ NEW: Add display name for easier debugging in React DevTools
// ActivityStream.displayName = 'ActivityStream';


// // --- Main Component ---
// const ProjectDetailsView: React.FC<ProjectDetailsProps> = ({ projectName }) => {
//   const { data, error, isLoading, mutate } = useFrappeGetDoc('Project Registration', projectName, {
//     cacheTime: 0,
//   });
//   console.log("data :",data);
//   // ✨ NEW: Create a ref to get access to the ActivityStream's exposed functions
//   const activityStreamRef = useRef<ActivityStreamHandle>(null);

//   const { data: actionsData } = useFrappeGetCall<{ message: WorkflowAction[] }>(
//     'rndopsapp.rndopsapp.api.get_allowed_actions',
//     { doctype: 'Project Registration', docname: projectName },
//     { enabled: !!projectName }
//   );

//   const { call: triggerWorkflowAction, loading: isActionLoading } = useFrappePostCall(
//     'rndopsapp.rndopsapp.api.handle_workflow_action'
//   );

//   const handleWorkflowAction = useCallback((action: string) => {
//     triggerWorkflowAction({
//       doctype: 'Project Registration',
//       docname: projectName,
//       action: action
//     }).then(() => {
//       alert(`Project action '${action}' completed successfully!`);
//       // 1. Refetch the main document data (for status update)
//       mutate();
//       // ✨ NEW: 2. Trigger a refetch in the child ActivityStream component
//       activityStreamRef.current?.refetch();
//     }).catch((err: any) => {
//       console.error(`Error during workflow action:`, err);
//       alert(`Failed to ${action} the project: ${err.message || 'An unknown error occurred.'}`);
//     });
//   }, [triggerWorkflowAction, mutate, projectName]);

//   if (!projectName) {
//     return (
//         <div className="flex justify-center items-center h-screen bg-gray-100">
//           <div className="text-center p-8 bg-white rounded-lg shadow-md">
//             <h2 className="text-xl font-semibold text-gray-700">No Project Selected</h2>
//             <p className="text-gray-500 mt-2">Please select a project to view its details.</p>
//           </div>
//         </div>
//     );
//   }

//   if (isLoading) {
//     return (
//         <div className="flex justify-center items-center h-screen bg-gray-100">
//           <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
//           <p className="ml-4 text-lg font-medium text-gray-700">Loading Project Details...</p>
//         </div>
//     );
//   }

//   if (error) {
//     return (
//         <div className="flex justify-center items-center h-screen bg-gray-100">
//           <div className="text-center p-8 bg-white rounded-lg shadow-md">
//             <h2 className="text-xl font-semibold text-gray-700">Error Loading Project</h2>
//             <p className="text-gray-500 mt-2">{error.message}</p>
//           </div>
//         </div>
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

//       <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8 font-sans print-wrapper">
//         <div className="max-w-7xl mx-auto">
//             <header className="bg-white rounded-t-xl shadow-lg p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-gray-200">
//               <div className="mb-4 sm:mb-0">
//                   <h1 className="text-3xl font-bold text-gray-900">{data?.project_title || 'Project Details'}</h1>
//                   <p className="text-md text-gray-500 mt-1">Project ID: {projectName}</p>
//                   <p className="text-lg font-semibold text-gray-700 mt-2">Status: <span className="text-blue-600">{data?.workflow_state}</span></p>
//               </div>
//               {actionsData?.message && (
//                 <ActionButtons 
//                   actions={actionsData.message} 
//                   onAction={handleWorkflowAction} 
//                   isLoading={isActionLoading} 
//                 />
//               )}
//             </header>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-white rounded-b-xl shadow-lg p-6 sm:p-8">
//                 <main className="lg:col-span-2 print-container">
//                     {/* The main content section is unchanged */}
//                     <SectionTitle title="Project Overview" />
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
//                         <FieldDisplay label="Implementation Department" value={data?.implementation_department} />
//                         <FieldDisplay label="Project Type" value={data?.project_type} />
//                         {data?.project_type === 'Research' && <FieldDisplay label="Research Sub-Type" value={data?.research_sub_type} />}
//                         {data?.project_type === 'Consultancy' && <FieldDisplay label="Consultancy Category" value={data?.consultancy_category} />}
//                         <FieldDisplay label="Project Duration" value={`${data?.project_duration_months} months and ${data?.project_duration_days || 0} days`} />
//                     </div>
//                     <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} />
//                     <HtmlContent title="Project Objective" htmlString={data?.project_objective} />
//                     <HtmlContent title="Project Deliverables" htmlString={data?.project_deliverables} />
//                     <SectionTitle title="Investigators" />
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
//                         <FieldDisplay label="Registering For" value={data?.registering_for} />
//                         <FieldDisplay label="Principal Investigator" value={data?.principal_investigator_name} />
//                         <FieldDisplay label="PI Employee ID" value={data?.pi_employee_id} />
//                         <FieldDisplay label="PI Designation" value={data?.designation} />
//                         <FieldDisplay label="PI Webmail" value={data?.pi_webmail} />
//                     </div>
//                     <TableDisplay label="Additional Principal Investigators" data={data?.additional_pi_table} columns={[{ fieldname: 'pi_name', label: 'Name' }, { fieldname: 'pi_designation', label: 'Designation' }, { fieldname: 'pi_address', label: 'Address / Department' },]} />
//                     <TableDisplay label="Co-Investigators" data={data?.co_investigator_table} columns={[{ fieldname: 'copi_name', label: 'Name' }, { fieldname: 'copi_designation', label: 'Designation' }, { fieldname: 'copi_address', label: 'Department' },]} />
//                     <SectionTitle title="Funding & Proposed Budget" />
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
//                         <FieldDisplay label="Funding Agency Type" value={data?.funding_agency_type} />
//                         <FieldDisplay label="Funding Agency" value={data?.funding_agency} />
//                         <FieldDisplay label="Funding Agency GSTIN" value={data?.funding_agency_gstin} />
//                         <FieldDisplay label="Total Proposed Budget" value={data?.total_budget_amount} isCurrency />
//                     </div>
//                     <FieldDisplay label="Funding Agency Address" value={data?.funding_agency_address} />
//                     {data?.have_sanction_details === 'Yes' && (
//                         <>
//                             <SectionTitle title="Sanction Details" />
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
//                                 <FieldDisplay label="Sanction Letter No." value={data?.sanctioned_letter_no} />
//                                 <FieldDisplay label="Sanction Letter Date" value={data?.sanctioned_letter_date} />
//                                 <FieldDisplay label="Total Sanctioned Amount" value={data?.total_sanctioned_amount} isCurrency />
//                             </div>
//                             <TableDisplay label="Sanctioned Budget Breakup" data={data?.sanctioned_budget_breakup} columns={[{ fieldname: 'account_head', label: 'Budget Head' }, { fieldname: 'amount_sanctioned', label: 'Amount', isCurrency: true },]} />
//                         </>
//                     )}
//                     <SectionTitle title="Committee Clearance" />
//                     <FieldDisplay label="Needs Committee Clearance?" value={data?.needs_committee_clearance} />
//                     {data?.needs_committee_clearance === 'Yes' && (
//                         <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
//                                 <FieldDisplay label="Committee" value={data?.committees} />
//                                 {data?.committees === 'Other' && <FieldDisplay label="Specified Committee" value={data?.other_committee_specify} />}
//                                 <FieldDisplay label="Biosafety Category" value={data?.biosafety_category} />
//                             </div>
//                             <div className="mt-4">
//                                 <h4 className="text-md font-bold text-gray-700">Declaration</h4>
//                                 <div className="prose prose-sm max-w-none mt-1 p-3 bg-white rounded border text-justify" dangerouslySetInnerHTML={{ __html: data?.declaration || '<p>No declaration provided.</p>' }} />
//                             </div>
//                         </div>
//                     )}
//                 </main>

//                 <aside className="lg:col-span-1 no-print">
//                     {/* ✨ CHANGED: Pass the ref to the ActivityStream component */}
//                     <ActivityStream 
//                         ref={activityStreamRef}
//                         doctype="Project Registration" 
//                         docname={projectName} 
//                     />
//                 </aside>
//             </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default ProjectDetailsView;




// =========================================================

// import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef } from 'react'; // ✨ CHANGED
// import { useFrappeGetDoc, useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
// import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

// // ✨ NEW: Define the type for the functions we expose via the ref
// interface ActivityStreamHandle {
//   refetch: () => void;
// }

// interface ProjectDetailsProps {
//   projectName: string;
// }

// // --- Helper Components ---
// const FieldDisplay = ({ label, value, isCurrency = false }: { label: string; value: any; isCurrency?: boolean }) => {
//   if (!value && value !== 0) return null;
//   const displayValue = isCurrency ? `₹ ${Number(value).toLocaleString('en-IN')}` : String(value);
//   return (
//     <div className="py-2">
//       <p className="text-sm font-bold text-gray-600">{label}</p>
//       <p className="mt-1 text-base text-gray-800">{displayValue}</p>
//     </div>
//   );
// };

// const SectionTitle = ({ title }: { title: string }) => (
//   <h3 className="text-xl font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-4 mt-6">
//     {title}
//   </h3>
// );

// const HtmlContent = ({ title, htmlString }: { title: string, htmlString: string | undefined }) => {
//   if (!htmlString) return null;
//   return (
//     <div className="mt-4">
//       <h4 className="text-md font-bold text-gray-700">{title}</h4>
//       <div className="prose prose-sm max-w-none mt-1 text-gray-800 text-justify" dangerouslySetInnerHTML={{ __html: htmlString }} />
//     </div>
//   );
// };

// const TableDisplay = ({ label, data, columns }: { label: string; data: any[] | undefined; columns: { fieldname: string, label: string, isCurrency?: boolean }[] }) => {
//   if (!data || data.length === 0) return null;
//   return (
//     <div className="my-4">
//       <p className="text-md font-bold text-gray-700 mb-2">{label}</p>
//       <div className="overflow-x-auto rounded-lg border border-gray-200">
//         <table className="min-w-full divide-y divide-gray-200 bg-white">
//         <thead className="bg-gray-50">
//           <tr>{columns.map(col => (<th key={col.fieldname} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{col.label}</th>))}</tr>
//         </thead>
//         <tbody className="divide-y divide-gray-200">
//           {data.map((row, index) => (<tr key={index} className="hover:bg-gray-50">{columns.map(col => (<td key={col.fieldname} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{col.isCurrency ? `₹ ${Number(row[col.fieldname] || 0).toLocaleString('en-IN')}` : row[col.fieldname]}</td>))}</tr>))}
//         </tbody>
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
//         return 'bg-green-600 hover:bg-green-700';
//       case 'reject':
//         return 'bg-red-600 hover:bg-red-700';
//       case 'cancel':
//         return 'bg-gray-500 hover:bg-gray-600';
//       default:
//         return 'bg-blue-600 hover:bg-blue-700';
//     }
//   };

//   return (
//     <div className="flex items-center space-x-2 no-print">
//       {actions.map((actionItem: WorkflowAction) => (
//         <Button
//           key={actionItem.action}
//           onClick={() => onAction(actionItem.action)}
//           className={getButtonClass(actionItem.action)}
//           disabled={isLoading}
//         >
//           {isLoading ? 'Processing...' : (actionItem.label || actionItem.action)}
//         </Button>
//       ))}
//     </div>
//   );
// };

// // --- Activity Stream Component ---
// // ✨ CHANGED: Use forwardRef to get a ref from the parent
// const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(({ doctype, docname }, ref) => {
//   const [newComment, setNewComment] = useState('');

//   const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{ message: ActivityItem[] }>(
//     'rndopsapp.rndopsapp.api.get_project_activity',
//     { doctype, docname },
//     { enabled: !!docname }
//   );

//   // ✨ NEW: Expose the `refetchActivity` function to the parent component
//   useImperativeHandle(ref, () => ({
//     refetch() {
//       refetchActivity();
//     }
//   }));

//   const { call: addComment, loading: isCommenting } = useFrappePostCall(
//     'rndopsapp.rndopsapp.api.add_project_comment'
//   );

//   const handleCommentSubmit = async () => {
//     if (!newComment.trim()) return;
//     try {
//       await addComment({
//         doctype,
//         docname,
//         content: newComment
//       });
//       setNewComment('');
//       await refetchActivity(); // This still works for new comments
//     } catch (err) {
//       console.error("Failed to add comment:", err);
//       alert("Error: Could not post comment.");
//     }
//   };

//   return (
//     <Card className="sticky top-8">
//       <CardHeader>
//         <CardTitle>Activity & Comments</CardTitle>
//       </CardHeader>
//       <CardContent>
//         <div className="space-y-6">
//           <div>
//             <Textarea
//               placeholder="Add a comment or update..."
//               value={newComment}
//               onChange={(e) => setNewComment(e.target.value)}
//               disabled={isCommenting}
//               className="mb-2"
//             />
//             <Button onClick={handleCommentSubmit} disabled={isCommenting || !newComment.trim()}>
//               {isCommenting ? 'Submitting...' : 'Submit Comment'}
//             </Button>
//           </div>
//           <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 border-t pt-4">
//             {activityData?.message && activityData.message.length > 0 ? (
//               activityData.message.map((item, index) => (
//                 <div key={`${item.creation}-${index}`} className="flex items-start space-x-3">
//                   <div className="flex-shrink-0">
//                     <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600">
//                       {item.owner?.charAt(0).toUpperCase()}
//                     </div>
//                   </div>
//                   <div className="flex-1 bg-gray-50 p-3 rounded-lg">
//                     <div className="flex justify-between items-center">
//                       <p className="text-sm font-semibold text-gray-900">{item.owner}</p>
//                       <p className="text-xs text-gray-500">{new Date(item.creation).toLocaleString()}</p>
//                     </div>
//                     <div
//                       className="mt-1 text-sm text-gray-700 prose prose-sm max-w-none"
//                       dangerouslySetInnerHTML={{ __html: item.content }}
//                     />
//                   </div>
//                 </div>
//               ))
//             ) : (
//               <p className="text-sm text-gray-500 text-center py-4">No activity yet.</p>
//             )}
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// });

// // ✨ NEW: Add display name for easier debugging in React DevTools
// ActivityStream.displayName = 'ActivityStream';


// // --- Main Component ---
// const ProjectDetailsView: React.FC<ProjectDetailsProps> = ({ projectName }) => {
//   const { data, error, isLoading, mutate } = useFrappeGetDoc('Project Registration', projectName, {
//     cacheTime: 0,
//   });
//   console.log("data :",data);
//   // ✨ NEW: Create a ref to get access to the ActivityStream's exposed functions
//   const activityStreamRef = useRef<ActivityStreamHandle>(null);

//   const { data: actionsData } = useFrappeGetCall<{ message: WorkflowAction[] }>(
//     'rndopsapp.rndopsapp.api.get_allowed_actions',
//     { doctype: 'Project Registration', docname: projectName },
//     { enabled: !!projectName }
//   );

//   const { call: triggerWorkflowAction, loading: isActionLoading } = useFrappePostCall(
//     'rndopsapp.rndopsapp.api.handle_workflow_action'
//   );

//   const handleWorkflowAction = useCallback((action: string) => {
//     triggerWorkflowAction({
//       doctype: 'Project Registration',
//       docname: projectName,
//       action: action
//     }).then(() => {
//       alert(`Project action '${action}' completed successfully!`);
//       // 1. Refetch the main document data (for status update)
//       mutate();
//       // ✨ NEW: 2. Trigger a refetch in the child ActivityStream component
//       activityStreamRef.current?.refetch();
//     }).catch((err: any) => {
//       console.error(`Error during workflow action:`, err);
//       alert(`Failed to ${action} the project: ${err.message || 'An unknown error occurred.'}`);
//     });
//   }, [triggerWorkflowAction, mutate, projectName]);

//   if (!projectName) {
//     return (
//         <div className="flex justify-center items-center h-screen bg-gray-100">
//           <div className="text-center p-8 bg-white rounded-lg shadow-md">
//             <h2 className="text-xl font-semibold text-gray-700">No Project Selected</h2>
//             <p className="text-gray-500 mt-2">Please select a project to view its details.</p>
//           </div>
//         </div>
//     );
//   }

//   if (isLoading) {
//     return (
//         <div className="flex justify-center items-center h-screen bg-gray-100">
//           <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
//           <p className="ml-4 text-lg font-medium text-gray-700">Loading Project Details...</p>
//         </div>
//     );
//   }

//   if (error) {
//     return (
//         <div className="flex justify-center items-center h-screen bg-gray-100">
//           <div className="text-center p-8 bg-white rounded-lg shadow-md">
//             <h2 className="text-xl font-semibold text-gray-700">Error Loading Project</h2>
//             <p className="text-gray-500 mt-2">{error.message}</p>
//           </div>
//         </div>
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

//       <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8 font-sans print-wrapper">
//         <div className="max-w-7xl mx-auto">
//             <header className="bg-white rounded-t-xl shadow-lg p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center border-b-2 border-gray-200">
//               {/* ✨ Grouping div for back button and title info */}
//               <div className="flex items-center gap-4 mb-4 sm:mb-0">
//                 {/* ✨ Back Button */}
//                 <button
//                   onClick={() => window.history.back()}
//                   className="p-2 rounded-full hover:bg-gray-100 transition-colors no-print"
//                   aria-label="Go back"
//                 >
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     className="h-6 w-6 text-gray-700"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                     stroke="currentColor"
//                     strokeWidth={2}
//                   >
//                     <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
//                   </svg>
//                 </button>
//                 {/* Existing Title Block */}
//                 <div>
//                   <h1 className="text-3xl font-bold text-gray-900">{data?.project_title || 'Project Details'}</h1>
//                   <p className="text-md text-gray-500 mt-1">Project ID: {projectName}</p>
//                   <p className="text-lg font-semibold text-gray-700 mt-2">Status: <span className="text-blue-600">{data?.workflow_state}</span></p>
//                 </div>
//               </div>
//               {actionsData?.message && (
//                 <ActionButtons
//                   actions={actionsData.message}
//                   onAction={handleWorkflowAction}
//                   isLoading={isActionLoading}
//                 />
//               )}
//             </header>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-white rounded-b-xl shadow-lg p-6 sm:p-8">
//                 <main className="lg:col-span-2 print-container">
//                     {/* The main content section is unchanged */}
//                     <SectionTitle title="Project Overview" />
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
//                         <FieldDisplay label="Implementation Department" value={data?.implementation_department} />
//                         <FieldDisplay label="Project Type" value={data?.project_type} />
//                         {data?.project_type === 'Research' && <FieldDisplay label="Research Sub-Type" value={data?.research_sub_type} />}
//                         {data?.project_type === 'Consultancy' && <FieldDisplay label="Consultancy Category" value={data?.consultancy_category} />}
//                         <FieldDisplay label="Project Duration" value={`${data?.project_duration_months} months and ${data?.project_duration_days || 0} days`} />
//                     </div>
//                     <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} />
//                     <HtmlContent title="Project Objective" htmlString={data?.project_objective} />
//                     <HtmlContent title="Project Deliverables" htmlString={data?.project_deliverables} />
//                     <SectionTitle title="Investigators" />
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
//                         <FieldDisplay label="Registering For" value={data?.registering_for} />
//                         <FieldDisplay label="Principal Investigator" value={data?.principal_investigator_name} />
//                         <FieldDisplay label="PI Employee ID" value={data?.pi_employee_id} />
//                         <FieldDisplay label="PI Designation" value={data?.designation} />
//                         <FieldDisplay label="PI Webmail" value={data?.pi_webmail} />
//                     </div>
//                     <TableDisplay label="Additional Principal Investigators" data={data?.additional_pi_table} columns={[{ fieldname: 'pi_name', label: 'Name' }, { fieldname: 'pi_designation', label: 'Designation' }, { fieldname: 'pi_address', label: 'Address / Department' },]} />
//                     <TableDisplay label="Co-Investigators" data={data?.co_investigator_table} columns={[{ fieldname: 'copi_name', label: 'Name' }, { fieldname: 'copi_designation', label: 'Designation' }, { fieldname: 'copi_address', label: 'Department' },]} />
//                     <SectionTitle title="Funding & Proposed Budget" />
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
//                         <FieldDisplay label="Funding Agency Type" value={data?.funding_agency_type} />
//                         <FieldDisplay label="Funding Agency" value={data?.funding_agency} />
//                         <FieldDisplay label="Funding Agency GSTIN" value={data?.funding_agency_gstin} />
//                         <FieldDisplay label="Total Proposed Budget" value={data?.total_budget_amount} isCurrency />
//                     </div>
//                     <FieldDisplay label="Funding Agency Address" value={data?.funding_agency_address} />
//                     {data?.have_sanction_details === 'Yes' && (
//                         <>
//                             <SectionTitle title="Sanction Details" />
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
//                                 <FieldDisplay label="Sanction Letter No." value={data?.sanctioned_letter_no} />
//                                 <FieldDisplay label="Sanction Letter Date" value={data?.sanctioned_letter_date} />
//                                 <FieldDisplay label="Total Sanctioned Amount" value={data?.total_sanctioned_amount} isCurrency />
//                             </div>
//                             <TableDisplay label="Sanctioned Budget Breakup" data={data?.sanctioned_budget_breakup} columns={[{ fieldname: 'account_head', label: 'Budget Head' }, { fieldname: 'amount_sanctioned', label: 'Amount', isCurrency: true },]} />
//                         </>
//                     )}
//                     <SectionTitle title="Committee Clearance" />
//                     <FieldDisplay label="Needs Committee Clearance?" value={data?.needs_committee_clearance} />
//                     {data?.needs_committee_clearance === 'Yes' && (
//                         <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
//                                 <FieldDisplay label="Committee" value={data?.committees} />
//                                 {data?.committees === 'Other' && <FieldDisplay label="Specified Committee" value={data?.other_committee_specify} />}
//                                 <FieldDisplay label="Biosafety Category" value={data?.biosafety_category} />
//                             </div>
//                             <div className="mt-4">
//                                 <h4 className="text-md font-bold text-gray-700">Declaration</h4>
//                                 <div className="prose prose-sm max-w-none mt-1 p-3 bg-white rounded border text-justify" dangerouslySetInnerHTML={{ __html: data?.declaration || '<p>No declaration provided.</p>' }} />
//                             </div>
//                         </div>
//                     )}
//                 </main>

//                 <aside className="lg:col-span-1 no-print">
//                     {/* ✨ CHANGED: Pass the ref to the ActivityStream component */}
//                     <ActivityStream
//                         ref={activityStreamRef}
//                         doctype="Project Registration"
//                         docname={projectName}
//                     />
//                 </aside>
//             </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default ProjectDetailsView;



// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-


import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import { useFrappeGetDoc, useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  projectName: string;
  onBack: () => void; // ✨ Accepts a callback function for navigation
}

// --- Helper Components ---
const FieldDisplay = ({ label, value, isCurrency = false }: { label: string; value: any; isCurrency?: boolean }) => {
  if (!value && value !== 0) return null;
  const displayValue = isCurrency ? `₹ ${Number(value).toLocaleString('en-IN')}` : String(value);
  return (
    <div className="py-2">
      <p className="text-sm font-bold text-gray-600">{label}</p>
      <p className="mt-1 text-base text-gray-800">{displayValue}</p>
    </div>
  );
};

const SectionTitle = ({ title }: { title: string }) => (
  <h3 className="text-xl font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-4 mt-6">
    {title}
  </h3>
);

const HtmlContent = ({ title, htmlString }: { title: string, htmlString: string | undefined }) => {
  if (!htmlString) return null;
  return (
    <div className="mt-4">
      <h4 className="text-md font-bold text-gray-700">{title}</h4>
      <div className="prose prose-sm max-w-none mt-1 text-gray-800 text-justify" dangerouslySetInnerHTML={{ __html: htmlString }} />
    </div>
  );
};

const TableDisplay = ({ label, data, columns }: { label: string; data: any[] | undefined; columns: { fieldname: string, label: string, isCurrency?: boolean }[] }) => {
  if (!data || data.length === 0) return null;
  return (
    <div className="my-4">
      <p className="text-md font-bold text-gray-700 mb-2">{label}</p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>{columns.map(col => (<th key={col.fieldname} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{col.label}</th>))}</tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row, index) => (<tr key={index} className="hover:bg-gray-50">{columns.map(col => (<td key={col.fieldname} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{col.isCurrency ? `₹ ${Number(row[col.fieldname] || 0).toLocaleString('en-IN')}` : row[col.fieldname]}</td>))}</tr>))}
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
        return 'bg-green-600 hover:bg-green-700';
      case 'reject':
        return 'bg-red-600 hover:bg-red-700';
      case 'cancel':
        return 'bg-gray-500 hover:bg-gray-600';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <div className="flex items-center space-x-2 no-print">
      {actions.map((actionItem: WorkflowAction) => (
        <Button
          key={actionItem.action}
          onClick={() => onAction(actionItem.action)}
          className={getButtonClass(actionItem.action)}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : (actionItem.label || actionItem.action)}
        </Button>
      ))}
    </div>
  );
};

// --- Activity Stream Component ---
const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(({ doctype, docname }, ref) => {
  const [newComment, setNewComment] = useState('');

  const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{ message: ActivityItem[] }>(
    'rndopsapp.rndopsapp.api.get_project_activity',
    { doctype, docname },
    { enabled: !!docname }
  );

  useImperativeHandle(ref, () => ({
    refetch() {
      refetchActivity();
    }
  }));

  const { call: addComment, loading: isCommenting } = useFrappePostCall(
    'rndopsapp.rndopsapp.api.add_project_comment'
  );

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment({
        doctype,
        docname,
        content: newComment
      });
      setNewComment('');
      await refetchActivity();
    } catch (err) {
      console.error("Failed to add comment:", err);
      alert("Error: Could not post comment.");
    }
  };

  return (
    <Card className="sticky top-8">
      <CardHeader>
        <CardTitle>Activity & Comments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Textarea
              placeholder="Add a comment or update..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isCommenting}
              className="mb-2"
            />
            <Button onClick={handleCommentSubmit} disabled={isCommenting || !newComment.trim()}>
              {isCommenting ? 'Submitting...' : 'Submit Comment'}
            </Button>
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 border-t pt-4">
            {activityData?.message && activityData.message.length > 0 ? (
              activityData.message.map((item, index) => (
                <div key={`${item.creation}-${index}`} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-gray-600">
                      {item.owner?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-gray-900">{item.owner}</p>
                      <p className="text-xs text-gray-500">{new Date(item.creation).toLocaleString()}</p>
                    </div>
                    <div
                      className="mt-1 text-sm text-gray-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No activity yet.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ActivityStream.displayName = 'ActivityStream';


// --- Main Component ---
const ProjectDetailsView: React.FC<ProjectDetailsProps> = ({ projectName, onBack }) => { // ✨ Destructure onBack prop
  const { data, error, isLoading, mutate } = useFrappeGetDoc('Project Registration', projectName, {
    cacheTime: 0,
  });
  const activityStreamRef = useRef<ActivityStreamHandle>(null);

  const { data: actionsData } = useFrappeGetCall<{ message: WorkflowAction[] }>(
    'rndopsapp.rndopsapp.api.get_allowed_actions',
    { doctype: 'Project Registration', docname: projectName },
    { enabled: !!projectName }
  );

  const { call: triggerWorkflowAction, loading: isActionLoading } = useFrappePostCall(
    'rndopsapp.rndopsapp.api.handle_workflow_action'
  );

  const handleWorkflowAction = useCallback((action: string) => {
    triggerWorkflowAction({
      doctype: 'Project Registration',
      docname: projectName,
      action: action
    }).then(() => {
      alert(`Project action '${action}' completed successfully!`);
      mutate();
      activityStreamRef.current?.refetch();
    }).catch((err: any) => {
      console.error(`Error during workflow action:`, err);
      alert(`Failed to ${action} the project: ${err.message || 'An unknown error occurred.'}`);
    });
  }, [triggerWorkflowAction, mutate, projectName]);

  if (!projectName) {
    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">No Project Selected</h2>
            <p className="text-gray-500 mt-2">Please select a project to view its details.</p>
          </div>
        </div>
    );
  }

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
          <p className="ml-4 text-lg font-medium text-gray-700">Loading Project Details...</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">Error Loading Project</h2>
            <p className="text-gray-500 mt-2">{error.message}</p>
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

      <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8 font-sans print-wrapper">
        <div className="max-w-7xl mx-auto">
            <header className="bg-white rounded-t-xl shadow-lg p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center border-b-2 border-gray-200">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                {/* ✨ Back Button */}
                <button
                  onClick={onBack} // ✨ Use the onBack prop to go back to the home screen
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors no-print"
                  aria-label="Go back"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-gray-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{data?.project_title || 'Project Details'}</h1>
                  <p className="text-md text-gray-500 mt-1">Project ID: {projectName}</p>
                  <p className="text-lg font-semibold text-gray-700 mt-2">Status: <span className="text-blue-600">{data?.workflow_state}</span></p>
                </div>
              </div>
              {actionsData?.message && (
                <ActionButtons
                  actions={actionsData.message}
                  onAction={handleWorkflowAction}
                  isLoading={isActionLoading}
                />
              )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-white rounded-b-xl shadow-lg p-6 sm:p-8">
                <main className="lg:col-span-2 print-container">
                    <SectionTitle title="Project Overview" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
                        <FieldDisplay label="Implementation Department" value={data?.implementation_department} />
                        <FieldDisplay label="Project Type" value={data?.project_type} />
                        {data?.project_type === 'Research' && <FieldDisplay label="Research Sub-Type" value={data?.research_sub_type} />}
                        {data?.project_type === 'Consultancy' && <FieldDisplay label="Consultancy Category" value={data?.consultancy_category} />}
                        <FieldDisplay label="Project Duration" value={`${data?.project_duration_months} months and ${data?.project_duration_days || 0} days`} />
                    </div>
                    <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} />
                    <HtmlContent title="Project Objective" htmlString={data?.project_objective} />
                    <HtmlContent title="Project Deliverables" htmlString={data?.project_deliverables} />
                    <SectionTitle title="Investigators" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <FieldDisplay label="Registering For" value={data?.registering_for} />
                        <FieldDisplay label="Principal Investigator" value={data?.principal_investigator_name} />
                        <FieldDisplay label="PI Employee ID" value={data?.pi_employee_id} />
                        <FieldDisplay label="PI Designation" value={data?.designation} />
                        <FieldDisplay label="PI Webmail" value={data?.pi_webmail} />
                    </div>
                    <TableDisplay label="Additional Principal Investigators" data={data?.additional_pi_table} columns={[{ fieldname: 'pi_name', label: 'Name' }, { fieldname: 'pi_designation', label: 'Designation' }, { fieldname: 'pi_address', label: 'Address / Department' },]} />
                    <TableDisplay label="Co-Investigators" data={data?.co_investigator_table} columns={[{ fieldname: 'copi_name', label: 'Name' }, { fieldname: 'copi_designation', label: 'Designation' }, { fieldname: 'copi_address', label: 'Department' },]} />
                    <SectionTitle title="Funding & Proposed Budget" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        <FieldDisplay label="Funding Agency Type" value={data?.funding_agency_type} />
                        <FieldDisplay label="Funding Agency" value={data?.funding_agency} />
                        <FieldDisplay label="Funding Agency GSTIN" value={data?.funding_agency_gstin} />
                        <FieldDisplay label="Total Proposed Budget" value={data?.total_budget_amount} isCurrency />
                    </div>
                    <FieldDisplay label="Funding Agency Address" value={data?.funding_agency_address} />
                    {data?.have_sanction_details === 'Yes' && (
                        <>
                            <SectionTitle title="Sanction Details" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                                <FieldDisplay label="Sanction Letter No." value={data?.sanctioned_letter_no} />
                                <FieldDisplay label="Sanction Letter Date" value={data?.sanctioned_letter_date} />
                                <FieldDisplay label="Total Sanctioned Amount" value={data?.total_sanctioned_amount} isCurrency />
                            </div>
                            <TableDisplay label="Sanctioned Budget Breakup" data={data?.sanctioned_budget_breakup} columns={[{ fieldname: 'account_head', label: 'Budget Head' }, { fieldname: 'amount_sanctioned', label: 'Amount', isCurrency: true },]} />
                        </>
                    )}
                    <SectionTitle title="Committee Clearance" />
                    <FieldDisplay label="Needs Committee Clearance?" value={data?.needs_committee_clearance} />
                    {data?.needs_committee_clearance === 'Yes' && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                                <FieldDisplay label="Committee" value={data?.committees} />
                                {data?.committees === 'Other' && <FieldDisplay label="Specified Committee" value={data?.other_committee_specify} />}
                                <FieldDisplay label="Biosafety Category" value={data?.biosafety_category} />
                            </div>
                            <div className="mt-4">
                                <h4 className="text-md font-bold text-gray-700">Declaration</h4>
                                <div className="prose prose-sm max-w-none mt-1 p-3 bg-white rounded border text-justify" dangerouslySetInnerHTML={{ __html: data?.declaration || '<p>No declaration provided.</p>' }} />
                            </div>
                        </div>
                    )}
                </main>

                <aside className="lg:col-span-1 no-print">
                    <ActivityStream
                        ref={activityStreamRef}
                        doctype="Project Registration"
                        docname={projectName}
                    />
                </aside>
            </div>
        </div>
      </div>
    </>
  );
};

export default ProjectDetailsView;