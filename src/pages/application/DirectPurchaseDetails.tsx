// import React, { useEffect, useState } from "react";
// import { useNavigate, useParams, useSearchParams } from "react-router-dom";
// import { AppSidebar } from "../../components/RndSidebar";
// import {
//     useFrappePostCall,
//     useFrappeGetCall,
//     useFrappeGetDoc,
//     useFrappeAuth,
// } from "frappe-react-sdk";
// import { useUserRoles } from "@/components/UserRole";
// import { cn } from "@/lib/utils";
// import {
//     CalendarIcon,
//     UserIcon,
//     EditIcon,
//     FileTextIcon,
//     ClipboardListIcon,
//     ShoppingCartIcon,
//     LayoutGridIcon,
//     FileIcon,
//     ExternalLinkIcon,
//     CheckCircle2Icon,
//     XCircleIcon,
//     Printer,
// } from "lucide-react";
// import { PageHeader } from "@/components/common/PageHeader";
// import { GlobalLoader } from "@/components/ui/global-loader";
// import { Textarea } from "@/components/ui/textarea";
// import {
//     directPurchaseAPI,
//     p11FormAPI,
//     sanctionSheetAPI,
// } from "@/services/apiService";
// import { DepartmentName } from "@/components/DepartmentName";
// import { BudgetHeadName } from "@/components/BudgetHeadName";
// import { generateP11Html } from "@/utils/p11Print";
// import { generateSanctionSheetHtml } from "@/utils/sanctionSheetPrint";
// import { P11PrintModal } from "@/components/P11PrintModal";
// import { POEditor } from "@/components/POEditor";
// import { DeclarationFields } from "@/components/DeclarationFields";
// import { useProjectBudget } from "@/hooks/useProjectBudget";
// import { CommitPayment } from "@/components/CommitPayment";

// // --- TYPE DEFINITIONS ---
// interface DirectPurchaseData {
//     name: string;
//     owner: string;
//     creation: string;
//     modified: string;
//     workflow_state: string;
//     project_name?: string;
//     applicant_name?: string;
//     applicant_department?: string;
//     applicant_designation?: string;
//     account_head?: string;
//     [key: string]: any;
// }

// interface ActivityItem {
//     owner: string;
//     creation: string;
//     content: string;
//     comment_type: string;
// }

// type TabId = "details" | "p11" | "sanction" | "po";

// // --- SHARED CONSTANTS ---
// const EXCLUDED_FIELDS = [
//     "doctype",
//     "docstatus",
//     "idx",
//     "owner",
//     "creation",
//     "modified",
//     "modified_by",
//     "_user_tags",
//     "_comments",
//     "_assign",
//     "_liked_by",
//     "name",
//     "workflow_state",
//     "_seen",
//     "parent",
//     "parenttype",
//     "parentfield",
// ];

// // --- HELPERS ---
// const formatFieldName = (key: string) =>
//     key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

// const formatDate = (val: string, format: "long" | "short" = "long") =>
//     new Date(val).toLocaleDateString(
//         "en-IN",
//         format === "long"
//             ? {
//                 day: "numeric",
//                 month: "long",
//                 year: "numeric",
//                 hour: "2-digit",
//                 minute: "2-digit",
//             }
//             : { day: "numeric", month: "short", year: "numeric" },
//     );

// // --- REUSABLE UI PRIMITIVES ---

// const ClaudeCard = ({
//     title,
//     children,
//     className = "",
//     accentTop = false,
// }: {
//     title?: string;
//     children: React.ReactNode;
//     className?: string;
//     accentTop?: boolean;
// }) => (
//     <div
//         className={cn(
//             "rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm",
//             accentTop && "border-t-[3px] border-t-[#D97757]",
//             className,
//         )}
//     >
//         {title && (
//             <div className="px-6 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                 <h3 className="font-serif text-base font-medium tracking-tight text-[#3F3F46] dark:text-[#E4E4E7] uppercase">
//                     {title}
//                 </h3>
//             </div>
//         )}
//         <div className="p-6">{children}</div>
//     </div>
// );

// const ClaudeButton = ({
//     children,
//     onClick,
//     disabled,
//     className,
//     variant = "outline",
// }: {
//     children: React.ReactNode;
//     onClick?: () => void;
//     disabled?: boolean;
//     className?: string;
//     variant?: "primary" | "outline" | "ghost" | "action";
// }) => (
//     <button
//         onClick={onClick}
//         disabled={disabled}
//         className={cn(
//             "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
//             "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200 dark:focus-visible:ring-zinc-700",
//             "disabled:opacity-50 disabled:cursor-not-allowed",
//             variant === "primary" &&
//             "bg-[#D97757] text-white hover:opacity-90 shadow-sm",
//             variant === "action" &&
//             "bg-[#D97757] text-white hover:opacity-90 shadow-sm border border-[#C66A4E]",
//             variant === "outline" &&
//             "border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-transparent text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-800",
//             variant === "ghost" &&
//             "text-[#71717A] dark:text-[#A1A1AA] hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]",
//             className,
//         )}
//     >
//         {children}
//     </button>
// );

// // --- FIELD TYPE HELPERS ---
// const isFilePath = (val: any): boolean => {
//     if (typeof val !== "string") return false;
//     return (
//         val.startsWith("/private/files/") ||
//         val.startsWith("/files/") ||
//         /\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx|zip)$/i.test(val)
//     );
// };

// const isAmountField = (key: string): boolean =>
//     /amount|total|price|estimate|budget|salary|fee|cost/i.test(key);

// const isBoolCheck = (key: string, val: any): boolean =>
//     (val === 0 || val === 1) &&
//     (key.startsWith("dec_") ||
//         key.startsWith("is_") ||
//         key.startsWith("has_") ||
//         key.startsWith("declaration_"));

// const formatINR = (val: any): string =>
//     Number(val).toLocaleString("en-IN", {
//         style: "currency",
//         currency: "INR",
//         maximumFractionDigits: 0,
//     });

// const getFileName = (path: string): string => path.split("/").pop() || path;

// // --- DOCUMENT VIEWER ---
// // Renders any Frappe document with smart field-type detection, a financial KPI strip,
// // sectioned layout (Info / Declarations / Attachments) and enhanced child tables.
// const DocumentViewer = ({ data }: { data: Record<string, any> }) => {
//     const allScalar = Object.entries(data).filter(([key, value]) => {
//         if (EXCLUDED_FIELDS.includes(key)) return false;
//         if (key.startsWith("_")) return false;
//         if (Array.isArray(value)) return false;
//         if (value === null || value === undefined || value === "") return false;
//         return true;
//     });

//     const childTables = Object.entries(data).filter(
//         ([, value]) => Array.isArray(value) && (value as any[]).length > 0,
//     );

//     // Partition scalar fields into logical groups
//     const fileFields = allScalar.filter(
//         ([k, v]) => isFilePath(v) || k.startsWith("upload_"),
//     );
//     const boolFields = allScalar.filter(([k, v]) => isBoolCheck(k, v));
//     const amountFields = allScalar.filter(
//         ([k, v]) => isAmountField(k) && !isFilePath(v) && !isBoolCheck(k, v),
//     );
//     const infoFields = allScalar.filter(
//         ([k, v]) =>
//             !isFilePath(v) &&
//             !isBoolCheck(k, v) &&
//             !isAmountField(k) &&
//             !k.startsWith("upload_"),
//     );

//     const renderValue = (key: string, value: any): React.ReactNode => {
//         if (value === null || value === undefined || value === "")
//             return (
//                 <span className="text-[#71717A] dark:text-[#A1A1AA]">—</span>
//             );

//         if (isFilePath(value)) {
//             return (
//                 <a
//                     href={String(value)}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800 text-[#D97757] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm font-medium max-w-full"
//                 >
//                     <FileIcon className="h-3.5 w-3.5 flex-shrink-0" />
//                     <span className="truncate">
//                         {getFileName(String(value))}
//                     </span>
//                     <ExternalLinkIcon className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
//                 </a>
//             );
//         }

//         if (isBoolCheck(key, value)) {
//             return value === 1 ? (
//                 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
//                     <CheckCircle2Icon className="w-3.5 h-3.5" />
//                     Yes
//                 </span>
//             ) : (
//                 <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-[#71717A] dark:text-[#A1A1AA] border border-[#E4E4E7] dark:border-[#3F3F46]">
//                     <XCircleIcon className="w-3.5 h-3.5" />
//                     No
//                 </span>
//             );
//         }

//         if (isAmountField(key) && !isNaN(Number(value))) {
//             return (
//                 <span className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
//                     {formatINR(value)}
//                 </span>
//             );
//         }

//         if (
//             key === "applicant_department" ||
//             key === "applying_for_department"
//         ) {
//             return <DepartmentName name={value} />;
//         }
//         if (key === "account_head") {
//             return <BudgetHeadName id={value} />;
//         }
//         if (typeof value === "object") return JSON.stringify(value);
//         return String(value);
//     };

//     if (allScalar.length === 0 && childTables.length === 0) {
//         return (
//             <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] italic">
//                 No data to display.
//             </p>
//         );
//     }

//     // KPI strip — show if any amount fields exist
//     const kpiAmounts = amountFields.slice(0, 3);

//     return (
//         <div className="space-y-8">
//             {/* Financial KPI strip */}
//             {kpiAmounts.length > 0 && (
//                 <div
//                     className={cn(
//                         "grid gap-4",
//                         kpiAmounts.length === 1 && "grid-cols-1 max-w-xs",
//                         kpiAmounts.length === 2 && "grid-cols-2",
//                         kpiAmounts.length >= 3 && "grid-cols-3",
//                     )}
//                 >
//                     {kpiAmounts.map(([key, value]) => (
//                         <div
//                             key={key}
//                             className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-zinc-800/50 px-5 py-4"
//                         >
//                             <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1.5">
//                                 {formatFieldName(key)}
//                             </p>
//                             <p className="text-xl font-serif font-medium text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">
//                                 {!isNaN(Number(value))
//                                     ? formatINR(value)
//                                     : String(value)}
//                             </p>
//                         </div>
//                     ))}
//                 </div>
//             )}

//             {/* Main info fields */}
//             {infoFields.length > 0 && (
//                 <div>
//                     <h4 className="text-xs font-semibold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-4 pb-2 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                         Information
//                     </h4>
//                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
//                         {infoFields.map(([key, value]) => (
//                             <div key={key} className="flex flex-col gap-1">
//                                 <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
//                                     {formatFieldName(key)}
//                                 </p>
//                                 <p className="text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">
//                                     {renderValue(key, value)}
//                                 </p>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             )}

//             {/* Declarations */}
//             <DeclarationFields doctype="Direct Purchase" />

//             {/* Attachments */}
//             {fileFields.length > 0 && (
//                 <div>
//                     <h4 className="text-xs font-semibold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-4 pb-2 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                         Attachments
//                     </h4>
//                     <div className="flex flex-col gap-2">
//                         {fileFields.map(([key, value]) => (
//                             <div key={key} className="flex items-center gap-3">
//                                 <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] w-36 shrink-0 font-medium uppercase tracking-wider">
//                                     {formatFieldName(key)}
//                                 </span>
//                                 {renderValue(key, value)}
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             )}

//             {/* Child tables */}
//             {childTables.map(([key, rows]) => {
//                 const cols = Object.keys((rows as any[])[0] || {}).filter(
//                     (k) => !k.startsWith("_") && !EXCLUDED_FIELDS.includes(k),
//                 );
//                 const hasAmountCols = cols.some((c) => isAmountField(c));
//                 const colTotals: Record<string, number> = {};
//                 if (hasAmountCols) {
//                     cols.forEach((c) => {
//                         if (isAmountField(c)) {
//                             colTotals[c] = (rows as any[]).reduce(
//                                 (s, r) => s + (parseFloat(r[c]) || 0),
//                                 0,
//                             );
//                         }
//                     });
//                 }

//                 return (
//                     <div key={key}>
//                         <h4 className="text-xs font-semibold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-3 pb-2 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
//                             {formatFieldName(key)}
//                         </h4>
//                         <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
//                             <table className="w-full text-sm">
//                                 <thead>
//                                     <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50/80 dark:bg-zinc-800/50">
//                                         <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] w-10">
//                                             #
//                                         </th>
//                                         {cols.map((col) => (
//                                             <th
//                                                 key={col}
//                                                 className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]"
//                                             >
//                                                 {formatFieldName(col)}
//                                             </th>
//                                         ))}
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {(rows as any[]).map((row, idx) => (
//                                         <tr
//                                             key={idx}
//                                             className={cn(
//                                                 "border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors",
//                                                 idx % 2 === 1 &&
//                                                 "bg-[#FAFAF9]/60 dark:bg-zinc-800/20",
//                                             )}
//                                         >
//                                             <td className="px-4 py-3 text-xs text-[#71717A] dark:text-[#A1A1AA] font-mono">
//                                                 {idx + 1}
//                                             </td>
//                                             {cols.map((k) => (
//                                                 <td
//                                                     key={k}
//                                                     className="px-4 py-3 text-[#3F3F46] dark:text-[#E4E4E7]"
//                                                 >
//                                                     {isAmountField(k) &&
//                                                         !isNaN(Number(row[k])) ? (
//                                                         <span className="font-medium">
//                                                             {formatINR(row[k])}
//                                                         </span>
//                                                     ) : row[k] !== null &&
//                                                         row[k] !== undefined ? (
//                                                         String(row[k])
//                                                     ) : (
//                                                         "—"
//                                                     )}
//                                                 </td>
//                                             ))}
//                                         </tr>
//                                     ))}
//                                     {hasAmountCols && (
//                                         <tr className="border-t-2 border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800/60 font-semibold">
//                                             <td className="px-4 py-3 text-xs text-[#71717A] dark:text-[#A1A1AA]" />
//                                             {cols.map((c) => (
//                                                 <td
//                                                     key={c}
//                                                     className="px-4 py-3 text-[#3F3F46] dark:text-[#E4E4E7]"
//                                                 >
//                                                     {colTotals[c] != null ? (
//                                                         <span className="font-semibold text-[#D97757]">
//                                                             {formatINR(
//                                                                 colTotals[c],
//                                                             )}
//                                                         </span>
//                                                     ) : (
//                                                         ""
//                                                     )}
//                                                 </td>
//                                             ))}
//                                         </tr>
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </div>
//                 );
//             })}
//         </div>
//     );
// };

// // --- ACTIVITY STREAM ---
// const ActivityStream = ({
//     doctype,
//     docname,
// }: {
//     doctype: string;
//     docname: string;
// }) => {
//     const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{
//         message: ActivityItem[];
//     }>("rndopsapp.rndopsapp.api.get_project_activity", { doctype, docname });

//     useEffect(() => {
//         refetchActivity();
//     }, [docname]);

//     return (
//         <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
//             {activityData?.message?.length ? (
//                 activityData.message.map((activity, idx) => (
//                     <div key={idx} className="flex items-start gap-3">
//                         <div className="flex-shrink-0 h-7 w-7 rounded-full bg-[#FAFAF9] dark:bg-zinc-800 border border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-center font-semibold text-[#D97757] text-xs">
//                             {activity.owner?.charAt(0).toUpperCase() || "U"}
//                         </div>
//                         <div className="min-w-0 flex-1">
//                             <div
//                                 className="text-sm text-[#3F3F46] dark:text-[#E4E4E7] line-clamp-2 prose prose-sm max-w-none"
//                                 dangerouslySetInnerHTML={{
//                                     __html: activity.content,
//                                 }}
//                             />
//                             <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
//                                 {activity.owner} ·{" "}
//                                 {activity.creation
//                                     ? formatDate(activity.creation, "long")
//                                     : ""}
//                             </p>
//                         </div>
//                     </div>
//                 ))
//             ) : (
//                 <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] italic">
//                     No recent activity.
//                 </p>
//             )}
//         </div>
//     );
// };

// // --- WORKFLOW ACTION BUTTONS ---
// const DirectPurchaseActionButtons = ({
//     docname,
//     onActionComplete,
//     commitRequired = false,
// }: {
//     docname: string;
//     onActionComplete: () => void;
//     commitRequired?: boolean;
// }) => {
//     const [actions, setActions] = useState<string[]>([]);
//     const [isPerforming, setIsPerforming] = useState(false);
//     const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(
//         directPurchaseAPI.getWorkflowActions,
//     );
//     const { call: performAction } = useFrappePostCall(
//         directPurchaseAPI.performAction,
//     );

//     useEffect(() => {
//         fetchActions({ docname })
//             .then((res) => {
//                 if (res?.message)
//                     setActions(Array.isArray(res.message) ? res.message : []);
//             })
//             .catch((err) =>
//                 console.error("Error fetching workflow actions:", err),
//             );
//     }, [docname]);

//     const handleAction = async (action: string) => {
//         if (!confirm(`Are you sure you want to perform "${action}"?`)) return;
//         setIsPerforming(true);
//         try {
//             const result: any = await performAction({ docname, action });
//             if (result?.message?.status === "success") {
//                 alert(
//                     result.message.message || `Action "${action}" completed.`,
//                 );
//                 onActionComplete();
//             } else if (result?.message?.status === "error") {
//                 alert(`Error: ${result.message.message}`);
//             } else {
//                 alert(`Action "${action}" completed.`);
//                 onActionComplete();
//             }
//         } catch (err: any) {
//             alert(`Action failed: ${err.message || "Unknown error"}`);
//         } finally {
//             setIsPerforming(false);
//         }
//     };

//     if (!actions.length) return null;

//     return (
//         <div className="flex flex-col gap-2">
//             {commitRequired && (
//                 <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 font-medium">
//                     A commitment must be submitted before forwarding this application.
//                 </div>
//             )}
//             <div className="flex flex-wrap gap-2">
//                 {actions.map((action) => (
//                     <ClaudeButton
//                         key={action}
//                         variant={commitRequired ? "outline" : "action"}
//                         onClick={() => handleAction(action)}
//                         disabled={isPerforming || commitRequired}
//                         className={commitRequired ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border-0" : ""}
//                     >
//                         {isPerforming ? "Processing…" : action}
//                     </ClaudeButton>
//                 ))}
//             </div>
//         </div>
//     );
// };

// // --- P11 FORM WORKFLOW ACTION BUTTONS ---
// const P11FormActionButtons = ({
//     docname,
//     onActionComplete,
// }: {
//     docname: string;
//     onActionComplete: () => void;
// }) => {
//     const [actions, setActions] = useState<string[]>([]);
//     const [isPerforming, setIsPerforming] = useState(false);
//     const [showCommentModal, setShowCommentModal] = useState(false);
//     const [selectedAction, setSelectedAction] = useState("");
//     const [comment, setComment] = useState("");

//     const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(
//         p11FormAPI.getWorkflowActions,
//     );
//     const { call: performAction } = useFrappePostCall(p11FormAPI.performAction);

//     useEffect(() => {
//         if (docname) {
//             fetchActions({ docname })
//                 .then((res) => {
//                     if (res?.message) {
//                         setActions(
//                             Array.isArray(res.message) ? res.message : [],
//                         );
//                     }
//                 })
//                 .catch((err) =>
//                     console.error("Error fetching P11 workflow actions:", err),
//                 );
//         }
//     }, [docname]);

//     const handleActionClick = (action: string) => {
//         // Actions that need comment/confirmation
//         const needsComment =
//             action.toLowerCase().includes("reject") ||
//             action.toLowerCase().includes("put back");

//         if (needsComment) {
//             setSelectedAction(action);
//             setShowCommentModal(true);
//         } else {
//             handleActionConfirm(action, "");
//         }
//     };

//     const handleActionConfirm = async (
//         action: string,
//         actionComment: string,
//     ) => {
//         setIsPerforming(true);
//         setShowCommentModal(false);

//         try {
//             const result: any = await performAction({
//                 docname,
//                 action,
//                 comment: actionComment,
//             });

//             if (result?.message?.status === "success") {
//                 alert(
//                     result.message.message ||
//                     `Action "${action}" completed successfully.`,
//                 );
//                 onActionComplete();
//             } else if (result?.message?.status === "error") {
//                 alert(`Error: ${result.message.message}`);
//             } else {
//                 alert(`Action "${action}" completed.`);
//                 onActionComplete();
//             }
//         } catch (err: any) {
//             alert(`Action failed: ${err.message || "Unknown error"}`);
//         } finally {
//             setIsPerforming(false);
//             setComment("");
//         }
//     };

//     const getActionButtonClass = (action: string): string => {
//         const actionLower = action.toLowerCase();
//         if (actionLower.includes("reject")) {
//             return "bg-red-600 hover:bg-red-700 text-white border-red-700";
//         }
//         if (actionLower.includes("approve") || actionLower.includes("verify")) {
//             return "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700";
//         }
//         if (actionLower.includes("generate")) {
//             return "bg-blue-600 hover:bg-blue-700 text-white border-blue-700";
//         }
//         return "";
//     };

//     if (!actions.length) return null;

//     return (
//         <>
//             <div className="mt-6 pt-6 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
//                 <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-3">
//                     Workflow Actions
//                 </p>
//                 <div className="flex flex-wrap gap-2">
//                     {actions.map((action) => (
//                         <ClaudeButton
//                             key={action}
//                             variant="action"
//                             className={getActionButtonClass(action)}
//                             onClick={() => handleActionClick(action)}
//                             disabled={isPerforming}
//                         >
//                             {isPerforming ? "Processing…" : action}
//                         </ClaudeButton>
//                     ))}
//                 </div>
//             </div>

//             {/* Comment Modal */}
//             {showCommentModal && (
//                 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//                     <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-xl shadow-lg w-full max-w-md">
//                         <h3 className="text-lg font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mb-4">
//                             Confirm: {selectedAction}
//                         </h3>
//                         <Textarea
//                             rows={4}
//                             placeholder="Add a comment (optional)..."
//                             value={comment}
//                             onChange={(e) => setComment(e.target.value)}
//                             className="w-full text-sm resize-none border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg mb-4"
//                         />
//                         <div className="flex justify-end gap-2">
//                             <ClaudeButton
//                                 variant="outline"
//                                 onClick={() => {
//                                     setShowCommentModal(false);
//                                     setComment("");
//                                 }}
//                             >
//                                 Cancel
//                             </ClaudeButton>
//                             <ClaudeButton
//                                 variant="action"
//                                 onClick={() =>
//                                     handleActionConfirm(selectedAction, comment)
//                                 }
//                             >
//                                 Confirm
//                             </ClaudeButton>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// // --- SANCTION SHEET WORKFLOW ACTION BUTTONS ---
// const SanctionSheetActionButtons = ({
//     docname,
//     onActionComplete,
// }: {
//     docname: string;
//     onActionComplete: () => void;
// }) => {
//     const [actions, setActions] = useState<string[]>([]);
//     const [isPerforming, setIsPerforming] = useState(false);
//     const [showCommentModal, setShowCommentModal] = useState(false);
//     const [selectedAction, setSelectedAction] = useState("");
//     const [comment, setComment] = useState("");

//     const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(
//         sanctionSheetAPI.getWorkflowActions,
//     );
//     const { call: performAction } = useFrappePostCall(
//         sanctionSheetAPI.performAction,
//     );

//     useEffect(() => {
//         if (docname) {
//             fetchActions({ docname })
//                 .then((res) => {
//                     if (res?.message) {
//                         setActions(
//                             Array.isArray(res.message) ? res.message : [],
//                         );
//                     }
//                 })
//                 .catch((err) =>
//                     console.error(
//                         "Error fetching Sanction Sheet workflow actions:",
//                         err,
//                     ),
//                 );
//         }
//     }, [docname]);

//     const handleActionClick = (action: string) => {
//         const needsComment =
//             action.toLowerCase().includes("reject") ||
//             action.toLowerCase().includes("put back");

//         if (needsComment) {
//             setSelectedAction(action);
//             setShowCommentModal(true);
//         } else {
//             handleActionConfirm(action, "");
//         }
//     };

//     const handleActionConfirm = async (
//         action: string,
//         actionComment: string,
//     ) => {
//         setIsPerforming(true);
//         setShowCommentModal(false);

//         try {
//             const result: any = await performAction({
//                 docname,
//                 action,
//                 comment: actionComment,
//             });

//             if (result?.message?.status === "success") {
//                 alert(
//                     result.message.message ||
//                     `Action "${action}" completed successfully.`,
//                 );
//                 onActionComplete();
//             } else if (result?.message?.status === "error") {
//                 alert(`Error: ${result.message.message}`);
//             } else {
//                 alert(`Action "${action}" completed.`);
//                 onActionComplete();
//             }
//         } catch (err: any) {
//             alert(`Action failed: ${err.message || "Unknown error"}`);
//         } finally {
//             setIsPerforming(false);
//             setComment("");
//         }
//     };

//     const getActionButtonClass = (action: string): string => {
//         const actionLower = action.toLowerCase();
//         if (actionLower.includes("reject")) {
//             return "bg-red-600 hover:bg-red-700 text-white border-red-700";
//         }
//         if (actionLower.includes("verify") || actionLower.includes("print")) {
//             return "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700";
//         }
//         if (actionLower.includes("generate")) {
//             return "bg-blue-600 hover:bg-blue-700 text-white border-blue-700";
//         }
//         return "";
//     };

//     if (!actions.length) return null;

//     return (
//         <>
//             <div className="mt-6 pt-6 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
//                 <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-3">
//                     Workflow Actions
//                 </p>
//                 <div className="flex flex-wrap gap-2">
//                     {actions.map((action) => (
//                         <ClaudeButton
//                             key={action}
//                             variant="action"
//                             className={getActionButtonClass(action)}
//                             onClick={() => handleActionClick(action)}
//                             disabled={isPerforming}
//                         >
//                             {isPerforming ? "Processing…" : action}
//                         </ClaudeButton>
//                     ))}
//                 </div>
//             </div>

//             {/* Comment Modal */}
//             {showCommentModal && (
//                 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//                     <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-xl shadow-lg w-full max-w-md">
//                         <h3 className="text-lg font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mb-4">
//                             Confirm: {selectedAction}
//                         </h3>
//                         <Textarea
//                             rows={4}
//                             placeholder="Add a comment (optional)..."
//                             value={comment}
//                             onChange={(e) => setComment(e.target.value)}
//                             className="w-full text-sm resize-none border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg mb-4"
//                         />
//                         <div className="flex justify-end gap-2">
//                             <ClaudeButton
//                                 variant="outline"
//                                 onClick={() => {
//                                     setShowCommentModal(false);
//                                     setComment("");
//                                 }}
//                             >
//                                 Cancel
//                             </ClaudeButton>
//                             <ClaudeButton
//                                 variant="action"
//                                 onClick={() =>
//                                     handleActionConfirm(selectedAction, comment)
//                                 }
//                             >
//                                 Confirm
//                             </ClaudeButton>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// // --- LINKED DOCUMENT TAB ---
// // Fetches a single linked Frappe document via get_list + get_doc, then renders it.
// const LinkedDocTab = ({
//     doctype,
//     filterField,
//     filterValue,
//     emptyTitle,
//     emptyDescription,
//     onDataReload,
// }: {
//     doctype: string;
//     filterField: string;
//     filterValue: string;
//     emptyTitle: string;
//     emptyDescription: string;
//     onDataReload?: () => void;
// }) => {
//     const {
//         data: listData,
//         isLoading: listLoading,
//         mutate: reloadList,
//     } = useFrappeGetCall<{ message: { name: string }[] }>(
//         "frappe.client.get_list",
//         {
//             doctype,
//             filters: JSON.stringify([[filterField, "=", filterValue]]),
//             fields: JSON.stringify(["name"]),
//             limit: 1,
//         },
//     );

//     const docName = listData?.message?.[0]?.name || "";

//     const {
//         data: docData,
//         isLoading: docLoading,
//         mutate: reloadDoc,
//     } = useFrappeGetDoc<Record<string, any>>(doctype, docName);

//     const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

//     // Reload handler
//     const handleReload = () => {
//         reloadList();
//         reloadDoc();
//         if (onDataReload) onDataReload();
//     };

//     if (listLoading || docLoading) {
//         return (
//             <div className="flex items-center justify-center py-16">
//                 <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D97757] border-t-transparent" />
//             </div>
//         );
//     }

//     if (!docName || !docData) {
//         return (
//             <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
//                 <FileTextIcon className="h-10 w-10 text-[#E4E4E7] dark:text-[#3F3F46]" />
//                 <p className="font-serif text-base font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
//                     {emptyTitle}
//                 </p>
//                 <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] max-w-xs">
//                     {emptyDescription}
//                 </p>
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-2">
//             <div className="flex items-center justify-between mb-5">
//                 <div className="flex items-center gap-2">
//                     <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[#71717A] dark:text-[#A1A1AA] border border-[#E4E4E7] dark:border-[#3F3F46]">
//                         {docName}
//                     </span>
//                     {docData.workflow_state && (
//                         <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
//                             {docData.workflow_state}
//                         </span>
//                     )}
//                 </div>
//                 {doctype === "P_11 Form" && (
//                     <button
//                         onClick={() => setIsPrintModalOpen(true)}
//                         className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
//                     >
//                         <Printer className="w-4 h-4" /> Print / PDF
//                     </button>
//                 )}
//                 {doctype === "sanction_sheet" && (
//                     <button
//                         onClick={() => setIsPrintModalOpen(true)}
//                         className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
//                     >
//                         <Printer className="w-4 h-4" /> Print / PDF
//                     </button>
//                 )}
//             </div>

//             <DocumentViewer data={docData} />

//             {/* Render workflow actions based on doctype */}
//             {doctype === "P_11 Form" && (
//                 <>
//                     <P11FormActionButtons
//                         docname={docName}
//                         onActionComplete={handleReload}
//                     />
//                     <P11PrintModal
//                         isOpen={isPrintModalOpen}
//                         onClose={() => setIsPrintModalOpen(false)}
//                         htmlContent={
//                             isPrintModalOpen ? generateP11Html(docData) : ""
//                         }
//                         docName={docName}
//                     />
//                 </>
//             )}

//             {doctype === "sanction_sheet" && (
//                 <>
//                     <SanctionSheetActionButtons
//                         docname={docName}
//                         onActionComplete={handleReload}
//                     />
//                     <P11PrintModal
//                         isOpen={isPrintModalOpen}
//                         onClose={() => setIsPrintModalOpen(false)}
//                         htmlContent={
//                             isPrintModalOpen
//                                 ? generateSanctionSheetHtml(docData)
//                                 : ""
//                         }
//                         docName={docName}
//                     />
//                 </>
//             )}
//         </div>
//     );
// };

// // --- TABS ---
// interface Tab {
//     id: TabId;
//     label: string;
//     icon: React.ReactNode;
// }

// const TABS: Tab[] = [
//     {
//         id: "details",
//         label: "Details",
//         icon: <LayoutGridIcon className="w-4 h-4" />,
//     },
//     {
//         id: "p11",
//         label: "P-11 Form",
//         icon: <ClipboardListIcon className="w-4 h-4" />,
//     },
//     {
//         id: "sanction",
//         label: "Sanction Sheet",
//         icon: <FileTextIcon className="w-4 h-4" />,
//     },
//     {
//         id: "po",
//         label: "Purchase Order",
//         icon: <ShoppingCartIcon className="w-4 h-4" />,
//     },
// ];

// // --- MAIN COMPONENT ---
// const DirectPurchaseDetails: React.FC = () => {
//     const navigate = useNavigate();
//     const { id } = useParams<{ id: string }>();
//     const [searchParams] = useSearchParams();

//     const {
//         data,
//         error,
//         isLoading: loading,
//         mutate: reloadData,
//     } = useFrappeGetDoc<DirectPurchaseData>("Direct Purchase", id || "");

//     const { currentUser } = useFrappeAuth();
//     const { roles } = useUserRoles(currentUser ?? null);
//     const isStaffRnD = roles.some((r) =>
//         ["staff, RnD", "Staff RnD", "RnD Staff", "System Manager"].includes(r),
//     );
//     const isPermanentEmployee = roles.some((r) => r === "Permanent Employee");

//     const [activeTab, setActiveTab] = useState<TabId>(
//         (searchParams.get("tab") as TabId) || "details",
//     );
//     const [sidebarComment, setSidebarComment] = useState("");
//     const [isAddingComment, setIsAddingComment] = useState(false);
//     const [isGeneratingPO, setIsGeneratingPO] = useState(false);
//     const [isGeneratingP11, setIsGeneratingP11] = useState(false);
//     const [isOpeningSanctionSheet, setIsOpeningSanctionSheet] = useState(false);
//     const [poSanctionData, setPoSanctionData] = useState<Record<
//         string,
//         any
//     > | null>(null);
//     const [isLoadingPOData, setIsLoadingPOData] = useState(false);

//     const { call: addComment } = useFrappePostCall(
//         "rndopsapp.rndopsapp.api.add_project_comment",
//     );
//     const { call: generatePO } = useFrappePostCall(
//         directPurchaseAPI.generatePurchaseOrder,
//     );
//     const { call: generateP11 } = useFrappePostCall(
//         directPurchaseAPI.generateP11Form,
//     );

//     // Commit Payment state
//     const [commitHead, setCommitHead] = useState("");
//     const [paymentAmount, setPaymentAmount] = useState("");
//     const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);

//     // submitCommit moved to CommitPayment component
//     const { call: submitPayment, loading: isPaying } = useFrappePostCall(
//         "rndopsapp.rndopsapp.commitPayment.submit_payment_data",
//     );

//     const projectTitle = data?.project_name || "";
//     const {
//         budgetData,
//         heads: budgetHeads,
//         actualBalance,
//     } = useProjectBudget(projectTitle);

//     const linkedCommitment = budgetData.find(
//         (e) =>
//             (e.ref === (id || "") || e.frapAppId === (id || "")) &&
//             e.type === "commitment",
//     );
//     const isCommitted = !!linkedCommitment;

//     useEffect(() => {
//         if (budgetHeads.length > 0 && !commitHead)
//             setCommitHead(budgetHeads[0]);
//     }, [budgetHeads]);

//     useEffect(() => {
//         if (linkedCommitment) {
//             setCommitHead(linkedCommitment.head || "");
//             if (!paymentAmount)
//                 setPaymentAmount(String(linkedCommitment.committed));
//         }
//     }, [linkedCommitment]);

//     const loadData = () => {
//         if (id) reloadData();
//     };

//     // Fetch sanction sheet data for PO editor (on load and after re-fetch triggers)
//     useEffect(() => {
//         if (!id) return;
//         if (poSanctionData) return; // already fetched

//         const fetchSSData = async () => {
//             setIsLoadingPOData(true);
//             try {
//                 const filters = JSON.stringify([["app_id", "=", id]]);
//                 const listRes = await fetch(
//                     `/api/v2/document/sanction_sheet?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent('["name"]')}`,
//                     {
//                         credentials: "include",
//                         headers: { Accept: "application/json" },
//                     },
//                 )
//                     .then((r) => r.json())
//                     .catch(() => ({ data: [] }));

//                 const ssName = listRes?.data?.[0]?.name;
//                 if (ssName) {
//                     const docRes = await fetch(
//                         `/api/method/frappe.client.get`,
//                         {
//                             method: "POST",
//                             credentials: "include",
//                             headers: {
//                                 "Content-Type": "application/json",
//                                 Accept: "application/json",
//                                 "X-Frappe-CSRF-Token":
//                                     (window as any).csrf_token || "",
//                             },
//                             body: JSON.stringify({
//                                 doctype: "sanction_sheet",
//                                 name: ssName,
//                             }),
//                         },
//                     )
//                         .then((r) => r.json())
//                         .catch(() => null);
//                     if (docRes?.message) {
//                         setPoSanctionData(docRes.message);
//                     }
//                 }
//             } catch (err) {
//                 console.error("Error fetching sanction sheet for PO:", err);
//             } finally {
//                 setIsLoadingPOData(false);
//             }
//         };
//         fetchSSData();
//     }, [activeTab, id, data?.workflow_state, poSanctionData]);

//     const handleSidebarCommentSubmit = async () => {
//         if (!sidebarComment.trim() || !id) return;
//         setIsAddingComment(true);
//         try {
//             await addComment({
//                 reference_doctype: "Direct Purchase",
//                 reference_name: id,
//                 content: sidebarComment,
//                 comment_type: "Comment",
//             });
//             setSidebarComment("");
//             loadData();
//         } catch (err) {
//             console.error("Error adding comment:", err);
//         } finally {
//             setIsAddingComment(false);
//         }
//     };

//     const handlePayment = async () => {
//         if (!paymentAmount || !id || !data) {
//             alert("Please enter an amount.");
//             return;
//         }
//         try {
//             await submitPayment({
//                 doctype: "Direct Purchase",
//                 name: id,
//                 project_name: data.project_name,
//                 payment_amount: parseFloat(paymentAmount),
//                 budget_head: linkedCommitment?.head || "",
//                 bmr: "",
//             });
//             alert("Payment recorded successfully!");
//             setPaymentAmount("");
//             window.location.reload();
//         } catch (error: any) {
//             console.error("Payment failed:", error);
//             alert(`Payment failed: ${error.message || "Unknown error"}`);
//         }
//     };

//     const handleGeneratePO = async () => {
//         if (!id) return;
//         setIsGeneratingPO(true);
//         try {
//             const res = await generatePO({ docname: id });
//             if (res?.message?.status === "success") {
//                 alert("Purchase Order generated successfully!");
//                 loadData();
//             } else {
//                 throw new Error(
//                     res?.message?.message || "Failed to generate PO",
//                 );
//             }
//         } catch (err: any) {
//             alert(
//                 `Error: ${err.message || "Could not generate Purchase Order."}`,
//             );
//         } finally {
//             setIsGeneratingPO(false);
//         }
//     };

//     const handleGenerateP11 = async () => {
//         if (!id) return;
//         setIsGeneratingP11(true);
//         try {
//             const res = await generateP11({ docname: id });
//             if (res?.message?.status === "success") {
//                 alert("P-11 Form generated successfully!");
//                 loadData();
//             } else {
//                 throw new Error(
//                     res?.message?.message || "Failed to generate P-11 Form",
//                 );
//             }
//         } catch (err: any) {
//             alert(`Error: ${err.message || "Could not generate P-11 Form."}`);
//         } finally {
//             setIsGeneratingP11(false);
//         }
//     };

//     const handleOpenSanctionSheet = async () => {
//         if (!id) return;
//         setIsOpeningSanctionSheet(true);
//         try {
//             const filters = JSON.stringify([["app_id", "=", id]]);
//             const res = await fetch(
//                 `/api/v2/document/sanction_sheet?filters=${encodeURIComponent(filters)}&fields=["name"]`,
//                 {
//                     credentials: "include",
//                     headers: { Accept: "application/json" },
//                 },
//             );
//             if (res.ok) {
//                 const result = await res.json();
//                 const existing = result.data?.[0];
//                 if (existing?.name) {
//                     navigate(`/sanction-sheet?edit=${existing.name}`);
//                     return;
//                 }
//             }
//             navigate(
//                 `/sanction-sheet?app_id=${id}&project_no=${encodeURIComponent(data?.project_name || "")}`,
//             );
//         } catch {
//             navigate(
//                 `/sanction-sheet?app_id=${id}&project_no=${encodeURIComponent(data?.project_name || "")}`,
//             );
//         } finally {
//             setIsOpeningSanctionSheet(false);
//         }
//     };

//     if (loading) return <GlobalLoader isLoading={true} />;

//     if (error || !data) {
//         return (
//             <div className="flex h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B]">
//                 <div className="text-center space-y-2">
//                     <h2 className="font-serif text-xl font-medium text-red-600">
//                         Unable to load document
//                     </h2>
//                     <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
//                         {error
//                             ? (error as any).message ||
//                             "Failed to load document"
//                             : "Document not found"}
//                     </p>
//                     <button
//                         onClick={() => navigate(-1)}
//                         className="mt-4 text-sm text-[#D97757] hover:underline"
//                     >
//                         Go Back
//                     </button>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
//             <AppSidebar />

//             <main className="transition-all duration-300 ease-in-out p-6 md:p-10">
//                 {/* Page Header */}
//                 <PageHeader
//                     title={data.name}
//                     status={data.workflow_state}
//                     projectName={data.project_name}
//                 >
//                     <div className="flex items-center gap-2 flex-wrap">
//                         {data.workflow_state === "Draft" && id && (
//                             <ClaudeButton
//                                 variant="outline"
//                                 onClick={() =>
//                                     navigate(`/direct-purchase?edit=${id}`)
//                                 }
//                             >
//                                 <EditIcon className="w-3.5 h-3.5" />
//                                 Edit
//                             </ClaudeButton>
//                         )}
//                         {data.workflow_state === "Sanction Approved" &&
//                             id &&
//                             isStaffRnD &&
//                             poSanctionData?.file_path && (
//                                 <ClaudeButton
//                                     variant="primary"
//                                     onClick={handleGeneratePO}
//                                     disabled={isGeneratingPO}
//                                 >
//                                     {isGeneratingPO
//                                         ? "Generating…"
//                                         : "Generate Purchase Order"}
//                                 </ClaudeButton>
//                             )}
//                         {id && (
//                             <DirectPurchaseActionButtons
//                                 docname={id}
//                                 onActionComplete={loadData}
//                                 commitRequired={isStaffRnD && isCommittedForGate === false && data?.workflow_state === "Pending Staff Approval"}
//                             />
//                         )}
//                     </div>
//                 </PageHeader>

//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//                     {/* Main content column */}
//                     <div className="lg:col-span-2 space-y-0">
//                         {/* Tab navigation */}
//                         <div className="flex items-center border-b border-[#E4E4E7] dark:border-[#3F3F46] mb-6 overflow-x-auto">
//                             {TABS.map((tab) => (
//                                 <button
//                                     key={tab.id}
//                                     onClick={() => setActiveTab(tab.id)}
//                                     className={cn(
//                                         "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150",
//                                         activeTab === tab.id
//                                             ? "border-[#D97757] text-[#D97757]"
//                                             : "border-transparent text-[#71717A] dark:text-[#A1A1AA] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7] hover:border-[#E4E4E7] dark:hover:border-[#3F3F46]",
//                                     )}
//                                 >
//                                     {tab.icon}
//                                     {tab.label}
//                                 </button>
//                             ))}
//                         </div>

//                         {/* Tab content */}
//                         <ClaudeCard
//                             title={TABS.find((t) => t.id === activeTab)?.label}
//                             accentTop={activeTab === "details"}
//                         >
//                             {activeTab === "details" && (
//                                 <DocumentViewer data={data} />
//                             )}

//                             {activeTab === "p11" && id && (
//                                 <>
//                                     <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
//                                         <svg
//                                             className="w-5 h-5 shrink-0 mt-0.5"
//                                             fill="none"
//                                             stroke="currentColor"
//                                             strokeWidth="2"
//                                             viewBox="0 0 24 24"
//                                         >
//                                             <path
//                                                 strokeLinecap="round"
//                                                 strokeLinejoin="round"
//                                                 d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"
//                                             />
//                                         </svg>
//                                         <span>
//                                             <strong>Important:</strong> A
//                                             printed hard copy of the P-11 Form
//                                             must be submitted to the R&amp;D
//                                             Office for further processing.
//                                         </span>
//                                     </div>
//                                     <LinkedDocTab
//                                         doctype="P_11 Form"
//                                         filterField="app_id"
//                                         filterValue={id}
//                                         emptyTitle="No P-11 Form Generated Yet"
//                                         emptyDescription="The P-11 Form is generated after the Direct Purchase is approved."
//                                         onDataReload={loadData}
//                                     />
//                                 </>
//                             )}

//                             {activeTab === "sanction" && id && (
//                                 <>
//                                     {data?.workflow_state ===
//                                         "RDP-11 Verified" &&
//                                         isStaffRnD && (
//                                             <div className="mb-5">
//                                                 <button
//                                                     onClick={
//                                                         handleOpenSanctionSheet
//                                                     }
//                                                     disabled={
//                                                         isOpeningSanctionSheet
//                                                     }
//                                                     className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] hover:bg-[#c66a4e] text-white disabled:opacity-60"
//                                                 >
//                                                     {isOpeningSanctionSheet
//                                                         ? "Opening…"
//                                                         : "Sanction Sheet"}
//                                                 </button>
//                                             </div>
//                                         )}
//                                     <LinkedDocTab
//                                         doctype="sanction_sheet"
//                                         filterField="app_id"
//                                         filterValue={id}
//                                         emptyTitle="No Sanction Sheet Generated Yet"
//                                         emptyDescription="The Sanction Sheet is created by RnD Staff after the P-11 Form is verified and approved."
//                                         onDataReload={loadData}
//                                     />
//                                 </>
//                             )}

//                             {activeTab === "po" && (
//                                 <>
//                                     {isLoadingPOData ? (
//                                         <div className="flex items-center justify-center py-16">
//                                             <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D97757] border-t-transparent" />
//                                         </div>
//                                     ) : poSanctionData &&
//                                         (isStaffRnD ||
//                                             data?.workflow_state ===
//                                             "POGenerated") ? (
//                                         <POEditor
//                                             ssData={poSanctionData}
//                                             dpId={id || ""}
//                                             isStaffRnD={isStaffRnD}
//                                             isPIReadOnly={
//                                                 isPermanentEmployee &&
//                                                 !isStaffRnD
//                                             }
//                                             onUploadSignedPO={async (
//                                                 file: File,
//                                             ) => {
//                                                 const formData = new FormData();
//                                                 formData.append(
//                                                     "file",
//                                                     file,
//                                                     file.name,
//                                                 );
//                                                 formData.append(
//                                                     "docname",
//                                                     poSanctionData.name,
//                                                 );
//                                                 formData.append(
//                                                     "app_id",
//                                                     id || "",
//                                                 );
//                                                 formData.append(
//                                                     "project_no",
//                                                     poSanctionData.project_no ||
//                                                     "",
//                                                 );
//                                                 const res = await fetch(
//                                                     "/api/method/rndopsapp.rndopsapp.doctype.direct_purchase.direct_purchase.upload_po_document",
//                                                     {
//                                                         method: "POST",
//                                                         body: formData,
//                                                         credentials: "include",
//                                                         headers: {
//                                                             "X-Frappe-CSRF-Token":
//                                                                 (window as any)
//                                                                     .csrf_token ||
//                                                                 "",
//                                                         },
//                                                     },
//                                                 );
//                                                 const json = await res
//                                                     .json()
//                                                     .catch(() => ({}));
//                                                 if (
//                                                     !res.ok ||
//                                                     json?.message?.status ===
//                                                     false
//                                                 )
//                                                     throw new Error(
//                                                         json?.message
//                                                             ?.message ||
//                                                         "Upload failed",
//                                                     );
//                                                 // Reset so the effect re-fetches with updated file_path
//                                                 setPoSanctionData(null);
//                                             }}
//                                         />
//                                     ) : poSanctionData ? (
//                                         <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
//                                             <ShoppingCartIcon className="h-10 w-10 text-[#E4E4E7] dark:text-[#3F3F46]" />
//                                             <p className="font-serif text-base font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
//                                                 Purchase Order Not Yet Generated
//                                             </p>
//                                             <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] max-w-xs">
//                                                 The Purchase Order has not been
//                                                 generated by staff yet. Please
//                                                 check back later.
//                                             </p>
//                                         </div>
//                                     ) : (
//                                         <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
//                                             <ShoppingCartIcon className="h-10 w-10 text-[#E4E4E7] dark:text-[#3F3F46]" />
//                                             <p className="font-serif text-base font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
//                                                 No Sanction Sheet Available
//                                             </p>
//                                             <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] max-w-xs">
//                                                 The Purchase Order editor
//                                                 requires a Sanction Sheet to be
//                                                 created first.
//                                             </p>
//                                         </div>
//                                     )}
//                                 </>
//                             )}
//                         </ClaudeCard>
//                     </div>

//                     {/* Sidebar */}
//                     <div className="space-y-5">
//                         {/* Meta Info */}
//                         <ClaudeCard>
//                             <div className="space-y-4">
//                                 <div>
//                                     <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
//                                         Created By
//                                     </p>
//                                     <div className="flex items-center gap-2 text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
//                                         <UserIcon className="w-3.5 h-3.5 text-[#71717A] dark:text-[#A1A1AA]" />
//                                         {data.owner || "—"}
//                                     </div>
//                                 </div>
//                                 <div>
//                                     <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
//                                         Created On
//                                     </p>
//                                     <div className="flex items-center gap-2 text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
//                                         <CalendarIcon className="w-3.5 h-3.5 text-[#71717A] dark:text-[#A1A1AA]" />
//                                         {data.creation
//                                             ? formatDate(data.creation, "long")
//                                             : "—"}
//                                     </div>
//                                 </div>
//                                 <div>
//                                     <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
//                                         Last Modified
//                                     </p>
//                                     <div className="flex items-center gap-2 text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
//                                         <CalendarIcon className="w-3.5 h-3.5 text-[#71717A] dark:text-[#A1A1AA]" />
//                                         {data.modified
//                                             ? formatDate(data.modified, "short")
//                                             : "—"}
//                                     </div>
//                                 </div>
//                             </div>
//                         </ClaudeCard>

//                         {/* Activity Stream */}
//                         <ClaudeCard title="Activity">
//                             {id && (
//                                 <ActivityStream
//                                     doctype="Direct Purchase"
//                                     docname={id}
//                                 />
//                             )}
//                         </ClaudeCard>

//                         {/* Make a Commitment via CommitPayment component */}
//                         {isStaffRnD &&
//                             data.workflow_state === "Pending Staff Approval" && (
//                                 <CommitPayment
//                                     doctype="Direct Purchase"
//                                     docName={id || ""}
//                                     projectName={projectTitle}
//                                     budgetHeads={budgetHeads}
//                                     actualBalance={actualBalance}
//                                     onCommitSuccess={() => reloadData()}
//                                     onStagingStatusChange={(status) => setIsCommittedForGate(status)}
//                                 />
//                             )}

//                         {/* Committed state display + Payment */}
//                         {isStaffRnD &&
//                             data.workflow_state === "Pending Staff Approval" &&
//                             isCommitted && (
//                                 <ClaudeCard
//                                     title="Commitment Details"
//                                     accentTop
//                                 >
//                                     <div className="space-y-4">
//                                         <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
//                                             <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
//                                                 Commitment Initiated
//                                             </p>
//                                             <div className="flex justify-between items-end">
//                                                 <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
//                                                     {linkedCommitment?.head}
//                                                 </p>
//                                                 <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
//                                                     ₹{" "}
//                                                     {Number(
//                                                         linkedCommitment?.committed ||
//                                                         0,
//                                                     ).toLocaleString("en-IN")}
//                                                 </p>
//                                             </div>
//                                         </div>
//                                         <div>
//                                             <label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
//                                                 Payment Amount (₹)
//                                             </label>
//                                             <input
//                                                 type="number"
//                                                 className="w-full px-3 py-2 border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg text-sm bg-white dark:bg-[#27272A] text-[#3F3F46] dark:text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
//                                                 placeholder="Enter payment amount"
//                                                 value={paymentAmount}
//                                                 onChange={(e) =>
//                                                     setPaymentAmount(
//                                                         e.target.value,
//                                                     )
//                                                 }
//                                                 onWheel={(e) =>
//                                                     e.currentTarget.blur()
//                                                 }
//                                             />
//                                         </div>
//                                         <ClaudeButton
//                                             variant="primary"
//                                             className="w-full"
//                                             onClick={handlePayment}
//                                             disabled={isPaying}
//                                         >
//                                             {isPaying
//                                                 ? "Recording…"
//                                                 : "Record Payment"}
//                                         </ClaudeButton>
//                                     </div>
//                                 </ClaudeCard>
//                             )}

//                         {/* Add Comment */}
//                         <ClaudeCard title="Add Comment">
//                             <Textarea
//                                 rows={3}
//                                 placeholder="Type your comment…"
//                                 value={sidebarComment}
//                                 onChange={(e) =>
//                                     setSidebarComment(e.target.value)
//                                 }
//                                 className="w-full text-sm resize-none border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg bg-white dark:bg-[#27272A] text-[#3F3F46] dark:text-[#E4E4E7] placeholder:text-[#71717A] dark:placeholder:text-[#A1A1AA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 dark:focus-visible:ring-zinc-800 focus-visible:border-zinc-400 dark:focus-visible:border-zinc-500 transition-all duration-200 mb-3"
//                             />
//                             <ClaudeButton
//                                 variant="primary"
//                                 className="w-full"
//                                 onClick={handleSidebarCommentSubmit}
//                                 disabled={
//                                     isAddingComment || !sidebarComment.trim()
//                                 }
//                             >
//                                 {isAddingComment
//                                     ? "Submitting…"
//                                     : "Submit Comment"}
//                             </ClaudeButton>
//                         </ClaudeCard>
//                     </div>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default DirectPurchaseDetails;


// -=-=-=======================================================================================

import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppSidebar } from "../../components/RndSidebar";
import {
    useFrappePostCall,
    useFrappeGetCall,
    useFrappeGetDoc,
    useFrappeAuth,
} from "frappe-react-sdk";
import { useUserRoles } from "@/components/UserRole";
import { cn } from "@/lib/utils";
import {
    CalendarIcon,
    UserIcon,
    EditIcon,
    FileTextIcon,
    ClipboardListIcon,
    ShoppingCartIcon,
    LayoutGridIcon,
    FileIcon,
    ExternalLinkIcon,
    CheckCircle2Icon,
    XCircleIcon,
    Printer,
    PaperclipIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { GlobalLoader } from "@/components/ui/global-loader";
import { Textarea } from "@/components/ui/textarea";
import {
    directPurchaseAPI,
    p11FormAPI,
    sanctionSheetAPI,
} from "@/services/apiService";
import { DepartmentName } from "@/components/DepartmentName";
import { BudgetHeadName } from "@/components/BudgetHeadName";
import { generateP11Html } from "@/utils/p11Print";
import { generateSanctionSheetHtml } from "@/utils/sanctionSheetPrint";
import { P11PrintModal } from "@/components/P11PrintModal";
import { POEditor } from "@/components/POEditor";
import { DeclarationFields } from "@/components/DeclarationFields";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { ActivityLog } from "@/components/ActivityLog";
import ViewProjectButton from "@/components/ViewProjectButton";
import { CommitPayment } from "@/components/CommitPayment";

// --- TYPE DEFINITIONS ---
interface DirectPurchaseData {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    workflow_state: string;
    project_name?: string;
    project_no?: string;
    project?: string;
    applicant_name?: string;
    applicant_department?: string;
    applicant_designation?: string;
    account_head?: string;
    [key: string]: any;
}

type TabId = "details" | "p11" | "sanction" | "po";

// --- SHARED CONSTANTS ---
const EXCLUDED_FIELDS = [
    "doctype",
    "docstatus",
    "idx",
    "owner",
    "creation",
    "modified",
    "modified_by",
    "_user_tags",
    "_comments",
    "_assign",
    "_liked_by",
    "name",
    "workflow_state",
    "workflow_status",
    "_seen",
    "parent",
    "parenttype",
    "parentfield",
];

// --- HELPERS ---
const FIELD_LABEL_OVERRIDES: Record<string, string> = {
    app_id: "Application ID",
    p11_no: "P-11 Number",
    project_no: "Project Number",
    ss_file_number: "File Number",
    ss_applicant_name: "Applicant Name",
    ss_year_period_of_sanction: "Year / Period Of Sanction",
    ss_department_for_purchase: "Department For Purchase",
    ss_account_head: "Account Head",
    ss_funding_agency: "Funding Agency",
    ss_funds_allocated: "Funds Allocated",
    ss_balance_available: "Balance Available",
    ss_actual_expenditure: "Actual Expenditure",
    ss_name_of_firms: "Name Of Firms",
    ss_pack_forward: "Packing And Forwarding",
    ss_freight: "Freight",
    ss_other_charges: "Other Charges",
    ss_warranty: "Warranty",
    ss_delivery: "Delivery",
    ss_payment: "Payment",
    file_path: "File Path",
    check_the_below_declaration: "Declaration",
    the_purchase_committe_recommends_purchase_of_the_items_from_ms:
        "Purchase Committee Recommendation",
    quotation_recieved_for_purchase_of_the_items_from_ms:
        "Quotation Received From",
    packing_and_forwarding: "Packing And Forwarding",
};

const formatFieldName = (key: string) => {
    if (FIELD_LABEL_OVERRIDES[key]) return FIELD_LABEL_OVERRIDES[key];

    const cleaned = key
        .replace(/^ss_/, "")
        .replace(/^p11_/, "p_11_")
        .replace(/_/g, " ");

    return cleaned.replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatDate = (val: string, format: "long" | "short" = "long") =>
    new Date(val).toLocaleDateString(
        "en-IN",
        format === "long"
            ? {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }
            : { day: "numeric", month: "short", year: "numeric" },
    );

// --- REUSABLE UI PRIMITIVES ---

const ClaudeCard = ({
    title,
    children,
    className = "",
    accentTop = false,
}: {
    title?: string;
    children: React.ReactNode;
    className?: string;
    accentTop?: boolean;
}) => (
    <div
        className={cn(
            "rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden",
            accentTop && "border-t-[3px] border-t-[#D97757]",
            className,
        )}
    >
        {title && (
            <div className="px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                <h3 className="text-[13px] font-extrabold tracking-wide text-[#3F3F46] dark:text-[#E4E4E7] uppercase">
                    {title}
                </h3>
            </div>
        )}
        <div className="p-4 sm:p-5 min-w-0">{children}</div>
    </div>
);

const ClaudeButton = ({
    children,
    onClick,
    disabled,
    className,
    variant = "outline",
    title,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: "primary" | "outline" | "ghost" | "action";
    title?: string;
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200 dark:focus-visible:ring-zinc-700",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            variant === "primary" &&
            "bg-[#D97757] text-white hover:opacity-90 shadow-sm",
            variant === "action" &&
            "bg-[#D97757] text-white hover:opacity-90 shadow-sm border border-[#C66A4E]",
            variant === "outline" &&
            "border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-transparent text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-800",
            variant === "ghost" &&
            "text-[#71717A] dark:text-[#A1A1AA] hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]",
            className,
        )}
    >
        {children}
    </button>
);

const TAB_TONES: Record<
    TabId,
    {
        active: string;
        accentText: string;
        icon: string;
        header: string;
        border: string;
    }
> = {
    details: {
        active: "border-[#2563EB] bg-blue-50 text-[#1D4ED8] shadow-sm dark:border-blue-500/50 dark:bg-blue-950/25 dark:text-blue-300",
        accentText: "text-[#2563EB] dark:text-blue-300",
        icon: "bg-blue-50 text-[#2563EB] dark:bg-blue-950/30 dark:text-blue-300",
        header: "from-blue-50 via-white to-white dark:from-blue-950/20 dark:via-[#27272A] dark:to-[#27272A]",
        border: "border-t-[#2563EB]",
    },
    p11: {
        active: "border-[#4A6CF7] bg-indigo-50 text-[#4338CA] shadow-sm dark:border-indigo-500/50 dark:bg-indigo-950/25 dark:text-indigo-300",
        accentText: "text-[#4A6CF7] dark:text-indigo-300",
        icon: "bg-indigo-50 text-[#4A6CF7] dark:bg-indigo-950/30 dark:text-indigo-300",
        header: "from-indigo-50 via-white to-white dark:from-indigo-950/20 dark:via-[#27272A] dark:to-[#27272A]",
        border: "border-t-[#4A6CF7]",
    },
    sanction: {
        active: "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-950/25 dark:text-emerald-300",
        accentText: "text-emerald-700 dark:text-emerald-300",
        icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
        header: "from-emerald-50 via-white to-white dark:from-emerald-950/20 dark:via-[#27272A] dark:to-[#27272A]",
        border: "border-t-emerald-500",
    },
    po: {
        active: "border-[#D97757] bg-orange-50 text-[#B45309] shadow-sm dark:border-[#D97757]/60 dark:bg-orange-950/20 dark:text-orange-300",
        accentText: "text-[#D97757] dark:text-orange-300",
        icon: "bg-orange-50 text-[#D97757] dark:bg-orange-950/25 dark:text-orange-300",
        header: "from-orange-50 via-white to-white dark:from-orange-950/20 dark:via-[#27272A] dark:to-[#27272A]",
        border: "border-t-[#D97757]",
    },
};

const TabSectionHeader = ({
    icon,
    eyebrow,
    title,
    description,
    action,
    tone = "details",
}: {
    icon: React.ReactNode;
    eyebrow: string;
    title: string;
    description: string;
    action?: React.ReactNode;
    tone?: TabId;
}) => (
    <div
        className={cn(
            "mb-4 flex flex-col gap-3 rounded-xl border border-[#E4E4E7] bg-gradient-to-r px-4 py-3 dark:border-[#3F3F46] sm:flex-row sm:items-center sm:justify-between",
            TAB_TONES[tone].header,
        )}
    >
        <div className="flex min-w-0 items-start gap-3">
            <div
                className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    TAB_TONES[tone].icon,
                )}
            >
                <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
            </div>
            <div className="min-w-0">
                {eyebrow && (
                    <p
                        className={cn(
                            "text-[10px] font-extrabold uppercase tracking-[0.16em]",
                            TAB_TONES[tone].accentText,
                        )}
                    >
                        {eyebrow}
                    </p>
                )}
                <h3 className="mt-0.5 text-[17px] font-extrabold leading-tight text-[#3F3F46] dark:text-[#E4E4E7]">
                    {title}
                </h3>
                <p className="mt-1 max-w-2xl text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">
                    {description}
                </p>
            </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
    </div>
);

const HighlightHeading = ({
    icon,
    title,
    tone = "details",
}: {
    icon: React.ReactNode;
    title: string;
    tone?: TabId;
}) => (
    <div className="mb-3 flex items-center gap-2.5">
        <span
            className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                TAB_TONES[tone].icon,
            )}
        >
            <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
        </span>
        <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#A1A1AA]">
            {title}
        </span>
        <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46]" />
    </div>
);

// --- FIELD TYPE HELPERS ---
const isFilePath = (val: any): boolean => {
    if (typeof val !== "string") return false;
    return (
        val.startsWith("/private/files/") ||
        val.startsWith("/files/") ||
        /\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx|zip)$/i.test(val)
    );
};

const isAmountField = (key: string): boolean =>
    /amount|total|price|estimate|budget|salary|fee|cost|funds|balance|expenditure|charges|freight|pack_forward|packing_and_forwarding/i.test(
        key,
    );

const isBoolCheck = (key: string, val: any): boolean =>
    (val === 0 || val === 1) &&
    (key.startsWith("dec_") ||
        key.startsWith("is_") ||
        key.startsWith("has_") ||
        key.startsWith("declaration_") ||
        key.includes("declaration"));

const formatINR = (val: any): string =>
    Number(val).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    });

const getFileName = (path: string): string => path.split("/").pop() || path;

// --- DOCUMENT VIEWER ---
// Renders any Frappe document with smart field-type detection, a financial KPI strip,
// sectioned layout (Info / Declarations / Attachments) and enhanced child tables.
const DOCUMENT_FIELD_EXCLUSIONS: Record<string, string[]> = {
    "P_11 Form": ["workflow_status"],
};

const DocumentViewer = ({
    data,
    doctype,
}: {
    data: Record<string, any>;
    doctype?: string;
}) => {
    const hiddenFields = new Set([
        ...EXCLUDED_FIELDS,
        ...(doctype ? DOCUMENT_FIELD_EXCLUSIONS[doctype] || [] : []),
    ]);

    const allScalar = Object.entries(data).filter(([key, value]) => {
        if (hiddenFields.has(key)) return false;
        if (key.startsWith("_")) return false;
        if (Array.isArray(value)) return false;
        if (value === null || value === undefined || value === "") return false;
        return true;
    });

    const childTables = Object.entries(data).filter(
        ([, value]) => Array.isArray(value) && (value as any[]).length > 0,
    );

    // Partition scalar fields into logical groups
    const fileFields = allScalar.filter(
        ([k, v]) => isFilePath(v) || k.startsWith("upload_"),
    );
    const amountFields = allScalar.filter(
        ([k, v]) => isAmountField(k) && !isFilePath(v) && !isBoolCheck(k, v),
    );
    const infoFields = allScalar.filter(([k, v]) => !isFilePath(v) && !k.startsWith("upload_"));

    const renderValue = (key: string, value: any): React.ReactNode => {
        if (value === null || value === undefined || value === "")
            return (
                <span className="text-[#71717A] dark:text-[#A1A1AA]">—</span>
            );

        if (isFilePath(value)) {
            return (
                <a
                    href={String(value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800 text-[#D97757] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm font-medium max-w-full"
                >
                    <FileIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">
                        {getFileName(String(value))}
                    </span>
                    <ExternalLinkIcon className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
            );
        }

        if (isBoolCheck(key, value)) {
            return value === 1 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2Icon className="w-3.5 h-3.5" />
                    Yes
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-[#71717A] dark:text-[#A1A1AA] border border-[#E4E4E7] dark:border-[#3F3F46]">
                    <XCircleIcon className="w-3.5 h-3.5" />
                    No
                </span>
            );
        }

        if (isAmountField(key) && !isNaN(Number(value))) {
            return (
                <span className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                    {formatINR(value)}
                </span>
            );
        }

        if (
            key === "applicant_department" ||
            key === "applying_for_department"
        ) {
            return <DepartmentName name={value} />;
        }
        if (key === "account_head") {
            return <BudgetHeadName id={value} />;
        }
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
    };

    if (allScalar.length === 0 && childTables.length === 0) {
        return (
            <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] italic">
                No data to display.
            </p>
        );
    }

    // KPI strip — show if any amount fields exist
    const kpiAmounts = amountFields.slice(0, 3);

    return (
        <div className="space-y-6 min-w-0">
            {/* Financial KPI strip */}
            {kpiAmounts.length > 0 && (
                <div
                    className={cn(
                        "grid gap-3",
                        kpiAmounts.length === 1 && "grid-cols-1 max-w-xs",
                        kpiAmounts.length === 2 && "grid-cols-1 sm:grid-cols-2",
                        kpiAmounts.length >= 3 && "grid-cols-1 sm:grid-cols-3",
                    )}
                >
                    {kpiAmounts.map(([key, value]) => (
                        <div
                            key={key}
                            className="stat-card stat-card-blue rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 shadow-sm dark:border-[#3F3F46] dark:bg-zinc-800/50 min-w-0"
                        >
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
                                {formatFieldName(key)}
                            </p>
                            <p className="text-[17px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight break-words">
                                {!isNaN(Number(value))
                                    ? formatINR(value)
                                    : String(value)}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Main info fields */}
            {infoFields.length > 0 && (
                <div>
                    <HighlightHeading
                        icon={<LayoutGridIcon />}
                        title="Information"
                        tone="details"
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {infoFields.map(([key, value]) => (
                            <div
                                key={key}
                                className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3.5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]"
                            >
                                <div className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]">
                                    <span className="truncate">
                                        {formatFieldName(key)}
                                    </span>
                                </div>
                                <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">
                                    {renderValue(key, value)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Declarations */}
            <DeclarationFields doctype="Direct Purchase" />

            {/* Attachments */}
            {fileFields.length > 0 && (
                <div>
                    <HighlightHeading
                        icon={<PaperclipIcon />}
                        title="Attachments"
                        tone="po"
                    />
                    <div className="flex flex-col gap-2">
                        {fileFields.map(([key, value]) => (
                            <div key={key} className="flex items-center gap-3">
                                <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] w-36 shrink-0 font-medium uppercase tracking-wider">
                                    {formatFieldName(key)}
                                </span>
                                {renderValue(key, value)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Child tables */}
            {childTables.map(([key, rows]) => {
                const cols = Object.keys((rows as any[])[0] || {}).filter(
                    (k) => !k.startsWith("_") && !EXCLUDED_FIELDS.includes(k),
                );
                const hasAmountCols = cols.some((c) => isAmountField(c));
                const colTotals: Record<string, number> = {};
                if (hasAmountCols) {
                    cols.forEach((c) => {
                        if (isAmountField(c)) {
                            colTotals[c] = (rows as any[]).reduce(
                                (s, r) => s + (parseFloat(r[c]) || 0),
                                0,
                            );
                        }
                    });
                }

                return (
                    <div key={key}>
                        <HighlightHeading
                            icon={<FileTextIcon />}
                            title={formatFieldName(key)}
                            tone="sanction"
                        />
                        <div className="overflow-hidden rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                            <table className="w-full table-fixed text-[11px]">
                                <thead>
                                    <tr className="border-b border-[#E4E4E7] bg-[#EEF2FF] dark:border-[#3F3F46] dark:bg-[#1E3A8A]/20">
                                        <th className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] w-9">
                                            #
                                        </th>
                                        {cols.map((col) => (
                                            <th
                                                key={col}
                                                className="px-2.5 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] break-words"
                                            >
                                                {formatFieldName(col)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(rows as any[]).map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className={cn(
                                                "border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors",
                                                idx % 2 === 1 &&
                                                "bg-[#FAFAF9]/60 dark:bg-zinc-800/20",
                                            )}
                                        >
                                            <td className="px-2.5 py-2 align-top text-[10px] text-[#71717A] dark:text-[#A1A1AA] font-mono">
                                                {idx + 1}
                                            </td>
                                            {cols.map((k) => (
                                                <td
                                                    key={k}
                                                    className="px-2.5 py-2 align-top text-[#3F3F46] dark:text-[#E4E4E7] break-words whitespace-normal"
                                                >
                                                    {isAmountField(k) &&
                                                        !isNaN(Number(row[k])) ? (
                                                        <span className="font-medium">
                                                            {formatINR(row[k])}
                                                        </span>
                                                    ) : row[k] !== null &&
                                                        row[k] !== undefined ? (
                                                        String(row[k])
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {hasAmountCols && (
                                        <tr className="border-t-2 border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800/60 font-semibold">
                                            <td className="px-2.5 py-2 text-[10px] text-[#71717A] dark:text-[#A1A1AA]" />
                                            {cols.map((c) => (
                                                <td
                                                    key={c}
                                                    className="px-2.5 py-2 text-[#3F3F46] dark:text-[#E4E4E7] break-words"
                                                >
                                                    {colTotals[c] != null ? (
                                                        <span className="font-semibold text-[#D97757]">
                                                            {formatINR(
                                                                colTotals[c],
                                                            )}
                                                        </span>
                                                    ) : (
                                                        ""
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- WORKFLOW ACTION BUTTONS ---
const DirectPurchaseActionButtons = ({
    docname,
    onActionComplete,
    p11DocName,
    onP11Missing,
    commitRequired = false,
}: {
    docname: string;
    onActionComplete: () => void;
    p11DocName?: string;
    onP11Missing?: () => void;
    commitRequired?: boolean;
}) => {
    const [actions, setActions] = useState<string[]>([]);
    const [isPerforming, setIsPerforming] = useState(false);
    const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(
        directPurchaseAPI.getWorkflowActions,
    );
    const { call: performAction } = useFrappePostCall(
        directPurchaseAPI.performAction,
    );

    useEffect(() => {
        fetchActions({ docname })
            .then((res) => {
                if (res?.message)
                    setActions(Array.isArray(res.message) ? res.message : []);
            })
            .catch((err) =>
                console.error("Error fetching workflow actions:", err),
            );
    }, [docname]);

    const refreshActions = () => {
        fetchActions({ docname })
            .then((res) => {
                setActions(Array.isArray(res?.message) ? res.message : []);
            })
            .catch(() => setActions([]));
    };

    const handleAction = async (action: string) => {
        // Block "Submit P-11" if P-11 form hasn't been created yet
        if (action === "Submit P-11" && !p11DocName) {
            alert(
                "The P-11 Form has not been created yet.\n\nPlease go to the \"P-11 Form\" tab, fill in the P-11 Form, and then return here to submit.",
            );
            onP11Missing?.();
            return;
        }

        if (!confirm(`Are you sure you want to perform "${action}"?`)) return;
        setIsPerforming(true);
        try {
            const result: any = await performAction({ docname, action });
            if (result?.message?.status === "success") {
                alert(
                    result.message.message || `Action "${action}" completed.`,
                );
                refreshActions();
                onActionComplete();
            } else if (result?.message?.status === "error") {
                alert(`Error: ${result.message.message}`);
            } else {
                alert(`Action "${action}" completed.`);
                refreshActions();
                onActionComplete();
            }
        } catch (err: any) {
            alert(`Action failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsPerforming(false);
        }
    };

    if (!actions.length) return null;

    return (
        <div className="flex flex-col gap-2">
            {commitRequired && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 font-medium">
                    A commitment must be submitted before forwarding this application.
                </div>
            )}
            <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                    <ClaudeButton
                        key={action}
                        variant="action"
                        onClick={() => handleAction(action)}
                        disabled={isPerforming || commitRequired}
                        className={cn(
                            action === "Submit P-11" && !p11DocName
                                ? "opacity-60 cursor-not-allowed"
                                : undefined,
                            commitRequired && "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border-0"
                        )}
                        title={commitRequired ? "Submit a commitment first" : undefined}
                    >
                        {isPerforming ? "Processing…" : action}
                    </ClaudeButton>
                ))}
            </div>
        </div>
    );
};

// --- P11 FORM WORKFLOW ACTION BUTTONS ---
const P11FormActionButtons = ({
    docname,
    onActionComplete,
}: {
    docname: string;
    onActionComplete: () => void;
}) => {
    const [actions, setActions] = useState<string[]>([]);
    const [isPerforming, setIsPerforming] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");
    const [comment, setComment] = useState("");

    const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(
        p11FormAPI.getWorkflowActions,
    );
    const { call: performAction } = useFrappePostCall(p11FormAPI.performAction);

    useEffect(() => {
        if (docname) {
            fetchActions({ docname })
                .then((res) => {
                    if (res?.message) {
                        setActions(
                            Array.isArray(res.message) ? res.message : [],
                        );
                    }
                })
                .catch((err) =>
                    console.error("Error fetching P11 workflow actions:", err),
                );
        }
    }, [docname]);

    const handleActionClick = (action: string) => {
        // Actions that need comment/confirmation
        const needsComment =
            action.toLowerCase().includes("reject") ||
            action.toLowerCase().includes("put back");

        if (needsComment) {
            setSelectedAction(action);
            setShowCommentModal(true);
        } else {
            handleActionConfirm(action, "");
        }
    };

    const refreshP11Actions = () => {
        if (!docname) return;
        fetchActions({ docname })
            .then((res) => {
                setActions(Array.isArray(res?.message) ? res.message : []);
            })
            .catch(() => setActions([]));
    };

    const handleActionConfirm = async (
        action: string,
        actionComment: string,
    ) => {
        setIsPerforming(true);
        setShowCommentModal(false);

        try {
            const result: any = await performAction({
                docname,
                action,
                comment: actionComment,
            });

            if (result?.message?.status === "success") {
                alert(
                    result.message.message ||
                    `Action "${action}" completed successfully.`,
                );
                refreshP11Actions();
                onActionComplete();
            } else if (result?.message?.status === "error") {
                alert(`Error: ${result.message.message}`);
            } else {
                alert(`Action "${action}" completed.`);
                refreshP11Actions();
                onActionComplete();
            }
        } catch (err: any) {
            alert(`Action failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsPerforming(false);
            setComment("");
        }
    };

    const getActionButtonClass = (action: string): string => {
        const actionLower = action.toLowerCase();
        if (actionLower.includes("reject")) {
            return "bg-red-600 hover:bg-red-700 text-white border-red-700";
        }
        if (actionLower.includes("approve") || actionLower.includes("verify")) {
            return "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700";
        }
        if (actionLower.includes("generate")) {
            return "bg-blue-600 hover:bg-blue-700 text-white border-blue-700";
        }
        return "";
    };

    if (!actions.length) return null;

    return (
        <>
            <div className="mt-6 pt-6 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-3">
                    Workflow Actions
                </p>
                <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                        <ClaudeButton
                            key={action}
                            variant="action"
                            className={getActionButtonClass(action)}
                            onClick={() => handleActionClick(action)}
                            disabled={isPerforming}
                        >
                            {isPerforming ? "Processing…" : action}
                        </ClaudeButton>
                    ))}
                </div>
            </div>

            {/* Comment Modal */}
            {showCommentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-xl shadow-lg w-full max-w-md">
                        <h3 className="text-lg font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mb-4">
                            Confirm: {selectedAction}
                        </h3>
                        <Textarea
                            rows={4}
                            placeholder="Add a comment (optional)..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full text-sm resize-none border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <ClaudeButton
                                variant="outline"
                                onClick={() => {
                                    setShowCommentModal(false);
                                    setComment("");
                                }}
                            >
                                Cancel
                            </ClaudeButton>
                            <ClaudeButton
                                variant="action"
                                onClick={() =>
                                    handleActionConfirm(selectedAction, comment)
                                }
                            >
                                Confirm
                            </ClaudeButton>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// --- SANCTION SHEET WORKFLOW ACTION BUTTONS ---
const SanctionSheetActionButtons = ({
    docname,
    onActionComplete,
}: {
    docname: string;
    onActionComplete: () => void;
}) => {
    const [actions, setActions] = useState<string[]>([]);
    const [isPerforming, setIsPerforming] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");
    const [comment, setComment] = useState("");

    const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(
        sanctionSheetAPI.getWorkflowActions,
    );
    const { call: performAction } = useFrappePostCall(
        sanctionSheetAPI.performAction,
    );

    useEffect(() => {
        if (docname) {
            fetchActions({ docname })
                .then((res) => {
                    if (res?.message) {
                        setActions(
                            Array.isArray(res.message) ? res.message : [],
                        );
                    }
                })
                .catch((err) =>
                    console.error(
                        "Error fetching Sanction Sheet workflow actions:",
                        err,
                    ),
                );
        }
    }, [docname]);

    const handleActionClick = (action: string) => {
        const needsComment =
            action.toLowerCase().includes("reject") ||
            action.toLowerCase().includes("put back");

        if (needsComment) {
            setSelectedAction(action);
            setShowCommentModal(true);
        } else {
            handleActionConfirm(action, "");
        }
    };

    const refreshSanctionActions = () => {
        if (!docname) return;
        fetchActions({ docname })
            .then((res) => {
                setActions(Array.isArray(res?.message) ? res.message : []);
            })
            .catch(() => setActions([]));
    };

    const handleActionConfirm = async (
        action: string,
        actionComment: string,
    ) => {
        setIsPerforming(true);
        setShowCommentModal(false);

        try {
            const result: any = await performAction({
                docname,
                action,
                comment: actionComment,
            });

            if (result?.message?.status === "success") {
                alert(
                    result.message.message ||
                    `Action "${action}" completed successfully.`,
                );
                refreshSanctionActions();
                onActionComplete();
            } else if (result?.message?.status === "error") {
                alert(`Error: ${result.message.message}`);
            } else {
                alert(`Action "${action}" completed.`);
                refreshSanctionActions();
                onActionComplete();
            }
        } catch (err: any) {
            alert(`Action failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsPerforming(false);
            setComment("");
        }
    };

    const getActionButtonClass = (action: string): string => {
        const actionLower = action.toLowerCase();
        if (actionLower.includes("reject")) {
            return "bg-red-600 hover:bg-red-700 text-white border-red-700";
        }
        if (actionLower.includes("verify") || actionLower.includes("print")) {
            return "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700";
        }
        if (actionLower.includes("generate")) {
            return "bg-blue-600 hover:bg-blue-700 text-white border-blue-700";
        }
        return "";
    };

    if (!actions.length) return null;

    return (
        <>
            <div className="mt-6 pt-6 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-3">
                    Workflow Actions
                </p>
                <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                        <ClaudeButton
                            key={action}
                            variant="action"
                            className={getActionButtonClass(action)}
                            onClick={() => handleActionClick(action)}
                            disabled={isPerforming}
                        >
                            {isPerforming ? "Processing…" : action}
                        </ClaudeButton>
                    ))}
                </div>
            </div>

            {/* Comment Modal */}
            {showCommentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-xl shadow-lg w-full max-w-md">
                        <h3 className="text-lg font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mb-4">
                            Confirm: {selectedAction}
                        </h3>
                        <Textarea
                            rows={4}
                            placeholder="Add a comment (optional)..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full text-sm resize-none border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <ClaudeButton
                                variant="outline"
                                onClick={() => {
                                    setShowCommentModal(false);
                                    setComment("");
                                }}
                            >
                                Cancel
                            </ClaudeButton>
                            <ClaudeButton
                                variant="action"
                                onClick={() =>
                                    handleActionConfirm(selectedAction, comment)
                                }
                            >
                                Confirm
                            </ClaudeButton>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// --- LINKED DOCUMENT TAB ---
// Fetches a single linked Frappe document via get_list + get_doc, then renders it.
const LinkedDocTab = ({
    doctype,
    filterField,
    filterValue,
    emptyTitle,
    emptyDescription,
    onDataReload,
    parentData,
}: {
    doctype: string;
    filterField: string;
    filterValue: string;
    emptyTitle: string;
    emptyDescription: string;
    onDataReload?: () => void;
    parentData?: Record<string, any>;
}) => {
    const {
        data: listData,
        isLoading: listLoading,
        mutate: reloadList,
    } = useFrappeGetCall<{ message: { name: string }[] }>(
        "frappe.client.get_list",
        {
            doctype,
            filters: JSON.stringify([[filterField, "=", filterValue]]),
            fields: JSON.stringify(["name"]),
            limit: 1,
        },
    );

    const docName = listData?.message?.[0]?.name || "";

    const {
        data: docData,
        isLoading: docLoading,
        mutate: reloadDoc,
    } = useFrappeGetDoc<Record<string, any>>(doctype, docName);

    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // Reload handler
    const handleReload = () => {
        reloadList();
        reloadDoc();
        if (onDataReload) onDataReload();
    };

    if (listLoading || docLoading) {
        return (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] py-12 dark:border-[#3F3F46] dark:bg-[#18181B]">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#D97757] border-t-transparent" />
            </div>
        );
    }

    if (!docName || !docData) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] px-5 py-12 text-center gap-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#A1A1AA] shadow-sm dark:bg-[#27272A] dark:text-[#71717A]">
                    <FileTextIcon className="h-5 w-5" />
                </div>
                <p className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                    {emptyTitle}
                </p>
                <p className="max-w-md text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">
                    {emptyDescription}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-[#E4E4E7] bg-white px-4 py-3 dark:border-[#3F3F46] dark:bg-[#27272A] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-[#E4E4E7] bg-[#FAFAF9] px-2 py-1 font-mono text-[11px] font-bold text-[#71717A] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#A1A1AA]">
                        {docName}
                    </span>
                </div>
                {doctype === "P_11 Form" && (
                    <button
                        onClick={() => setIsPrintModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-bold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <Printer className="h-3.5 w-3.5" /> Print / PDF
                    </button>
                )}
                {doctype === "sanction_sheet" && (
                    <button
                        onClick={() => setIsPrintModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-bold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <Printer className="h-3.5 w-3.5" /> Print / PDF
                    </button>
                )}
            </div>

            <DocumentViewer data={docData} doctype={doctype} />

            {/* Render workflow actions based on doctype */}
            {doctype === "P_11 Form" && (
                <>
                    <P11FormActionButtons
                        docname={docName}
                        onActionComplete={handleReload}
                    />
                    <P11PrintModal
                        isOpen={isPrintModalOpen}
                        onClose={() => setIsPrintModalOpen(false)}
                        htmlContent={
                            isPrintModalOpen ? generateP11Html({
                                // Merge parent Direct Purchase fields so table_teqd (PC members) is available
                                ...parentData,
                                ...docData,
                            }) : ""
                        }
                        docName={docName}
                    />
                </>
            )}

            {doctype === "sanction_sheet" && (
                <>
                    <SanctionSheetActionButtons
                        docname={docName}
                        onActionComplete={handleReload}
                    />
                    <P11PrintModal
                        isOpen={isPrintModalOpen}
                        onClose={() => setIsPrintModalOpen(false)}
                        htmlContent={
                            isPrintModalOpen
                                ? generateSanctionSheetHtml(docData)
                                : ""
                        }
                        docName={docName}
                    />
                </>
            )}
        </div>
    );
};

// --- TABS ---
interface Tab {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    eyebrow: string;
    description: string;
}

const TABS: Tab[] = [
    {
        id: "details",
        label: "Details",
        icon: <LayoutGridIcon className="w-4 h-4" />,
        eyebrow: "Application",
        description: "Request snapshot",
    },
    {
        id: "p11",
        label: "P-11 Form",
        icon: <ClipboardListIcon className="w-4 h-4" />,
        eyebrow: "Approval",
        description: "Form workflow",
    },
    {
        id: "sanction",
        label: "Sanction Sheet",
        icon: <FileTextIcon className="w-4 h-4" />,
        eyebrow: "Sanction",
        description: "Office approval",
    },
    {
        id: "po",
        label: "Purchase Order",
        icon: <ShoppingCartIcon className="w-4 h-4" />,
        eyebrow: "Order",
        description: "PO documents",
    },
];

// --- MAIN COMPONENT ---
const DirectPurchaseDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();

    const {
        data,
        error,
        isLoading: loading,
        mutate: reloadData,
    } = useFrappeGetDoc<DirectPurchaseData>("Direct Purchase", id || "");

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isStaffRnD = roles.some((r) =>
        ["staff, RnD", "Staff RnD", "RnD Staff", "System Manager"].includes(r),
    );
    const isPermanentEmployee = roles.some((r) => r === "Permanent Employee");

    const [activeTab, setActiveTab] = useState<TabId>(
        (searchParams.get("tab") as TabId) || "details",
    );
    const [sidebarComment, setSidebarComment] = useState("");
    const [isAddingComment, setIsAddingComment] = useState(false);
    const [isGeneratingPO, setIsGeneratingPO] = useState(false);
    const [isGeneratingP11, setIsGeneratingP11] = useState(false);
    const [isOpeningSanctionSheet, setIsOpeningSanctionSheet] = useState(false);
    const [poSanctionData, setPoSanctionData] = useState<Record<
        string,
        any
    > | null>(null);
    const [isLoadingPOData, setIsLoadingPOData] = useState(false);

    const { call: addComment } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );
    const { call: generatePO } = useFrappePostCall(
        directPurchaseAPI.generatePurchaseOrder,
    );
    const { call: generateP11 } = useFrappePostCall(
        directPurchaseAPI.generateP11Form,
    );

    // Check if P-11 Form exists for this Direct Purchase
    const { data: p11ListData } = useFrappeGetCall<{
        message: { name: string }[];
    }>("frappe.client.get_list", {
        doctype: "P_11 Form",
        filters: JSON.stringify([["app_id", "=", id || ""]]),
        fields: JSON.stringify(["name"]),
        limit: 1,
    });
    const p11DocName = p11ListData?.message?.[0]?.name ?? "";

    // Commit Payment state
    const [resolvedProjectNo, setResolvedProjectNo] = useState<string>("");
    const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);
    const { call: fetchDocument } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const directPurchaseProject =
        data?.project_name || data?.project_no || data?.project || "";

    // --- RESOLVE ACTUAL PROJECT NUMBER ---
    useEffect(() => {
        const linkedName = directPurchaseProject;
        if (!linkedName) {
            setResolvedProjectNo("");
            return;
        }
        fetchDocument({ doctype: "Project Registration", name: linkedName })
            .then((res) => {
                const projectDoc = res?.message;
                if (projectDoc?.project_no) {
                    setResolvedProjectNo(projectDoc.project_no);
                } else {
                    setResolvedProjectNo(linkedName);
                }
            })
            .catch(() => {
                setResolvedProjectNo(linkedName);
            });
    }, [directPurchaseProject, fetchDocument]);

    const [commitHead, setCommitHead] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");

    const { call: submitPayment, loading: isPaying } = useFrappePostCall(
        "rndopsapp.rndopsapp.commitPayment.submit_payment_data",
    );

    const projectTitle = resolvedProjectNo || directPurchaseProject;
    const {
        budgetData,
        heads: budgetHeadsFromLedger,
        actualBalance,
    } = useProjectBudget(projectTitle);

    // Fetch Budget Heads directly (matching DisbursalOfHonorariumDetails / TravelDetails pattern)
    // This is the canonical source for the CommitPayment dropdown, with session cookie sent.
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);
    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch(
                    '/api/v2/document/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc',
                    { credentials: "include", headers: { Accept: "application/json" } },
                );
                const result = await response.json();
                if (result?.data) {
                    setBudgetHeadList(
                        result.data.map((item: any) => ({
                            name: item.budget_head,
                            id: item.id,
                        })),
                    );
                }
            } catch (err) {
                console.error("Failed to fetch Budget Heads:", err);
            }
        };
        fetchBudgetHeads();
    }, []);

    // budgetHeads for CommitPayment comes from the direct fetch (more reliable)
    // Fall back to ledger hook heads if local list is still loading
    const budgetHeads = budgetHeadList.length > 0
        ? budgetHeadList.map((h) => h.name)
        : budgetHeadsFromLedger;

    const linkedCommitment = budgetData.find(
        (e) =>
            (e.ref === (id || "") || e.frapAppId === (id || "")) &&
            e.type === "commitment",
    );
    const isCommitted = !!linkedCommitment;

    const commitRequired =
        data?.workflow_state === "Pending Staff Approval" &&
        isStaffRnD &&
        isCommittedForGate === false;

    useEffect(() => {
        if (budgetHeads.length > 0 && !commitHead)
            setCommitHead(budgetHeads[0]);
    }, [budgetHeads]);

    useEffect(() => {
        if (linkedCommitment) {
            setCommitHead(linkedCommitment.head || "");
            if (!paymentAmount)
                setPaymentAmount(String(linkedCommitment.committed));
        }
    }, [linkedCommitment]);

    const loadData = () => {
        if (id) reloadData();
    };

    // Fetch sanction sheet data for PO editor (on load and after re-fetch triggers)
    useEffect(() => {
        if (!id) return;
        if (poSanctionData) return; // already fetched

        const fetchSSData = async () => {
            setIsLoadingPOData(true);
            try {
                const filters = JSON.stringify([["app_id", "=", id]]);
                const listRes = await fetch(
                    `/api/v2/document/sanction_sheet?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent('["name"]')}`,
                    {
                        credentials: "include",
                        headers: { Accept: "application/json" },
                    },
                )
                    .then((r) => r.json())
                    .catch(() => ({ data: [] }));

                const ssName = listRes?.data?.[0]?.name;
                if (ssName) {
                    const docRes = await fetch(
                        `/api/method/frappe.client.get`,
                        {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/json",
                                Accept: "application/json",
                                "X-Frappe-CSRF-Token":
                                    (window as any).csrf_token || "",
                            },
                            body: JSON.stringify({
                                doctype: "sanction_sheet",
                                name: ssName,
                            }),
                        },
                    )
                        .then((r) => r.json())
                        .catch(() => null);
                    if (docRes?.message) {
                        setPoSanctionData(docRes.message);
                    }
                }
            } catch (err) {
                console.error("Error fetching sanction sheet for PO:", err);
            } finally {
                setIsLoadingPOData(false);
            }
        };
        fetchSSData();
    }, [activeTab, id, data?.workflow_state, poSanctionData]);

    const handleSidebarCommentSubmit = async () => {
        if (!sidebarComment.trim() || !id) return;
        setIsAddingComment(true);
        try {
            await addComment({
                reference_doctype: "Direct Purchase",
                reference_name: id,
                content: sidebarComment,
                comment_type: "Comment",
            });
            setSidebarComment("");
            loadData();
        } catch (err) {
            console.error("Error adding comment:", err);
        } finally {
            setIsAddingComment(false);
        }
    };



    const handlePayment = async () => {
        if (!paymentAmount || !commitHead || !id || !data) {
            alert("Please select a budget head and enter an amount.");
            return;
        }
        try {
            await submitPayment({
                doctype: "Direct Purchase",
                name: id,
                project_name: data.project_name,
                payment_amount: parseFloat(paymentAmount),
                budget_head: commitHead,
                bmr: "",
            });
            alert("Payment recorded successfully!");
            setPaymentAmount("");
            window.location.reload();
        } catch (error: any) {
            console.error("Payment failed:", error);
            alert(`Payment failed: ${error.message || "Unknown error"}`);
        }
    };

    const handleGeneratePO = async () => {
        if (!id) return;
        setIsGeneratingPO(true);
        try {
            const res = await generatePO({ docname: id });
            if (res?.message?.status === "success") {
                alert("Purchase Order generated successfully!");
                loadData();
            } else {
                throw new Error(
                    res?.message?.message || "Failed to generate PO",
                );
            }
        } catch (err: any) {
            alert(
                `Error: ${err.message || "Could not generate Purchase Order."}`,
            );
        } finally {
            setIsGeneratingPO(false);
        }
    };

    const [isDownloadingPO, setIsDownloadingPO] = useState(false);
    const handleDownloadPO = async () => {
        if (!id) return;
        setIsDownloadingPO(true);
        try {
            // Get sanction sheet name and project_no (use cached or fetch)
            let ssName = poSanctionData?.name;
            let projectNo = poSanctionData?.project_no;
            if (!ssName) {
                const filters = JSON.stringify([["app_id", "=", id]]);
                const listRes = await fetch(
                    `/api/v2/document/sanction_sheet?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent('["name","project_no"]')}`,
                    {
                        credentials: "include",
                        headers: { Accept: "application/json" },
                    },
                )
                    .then((r) => r.json())
                    .catch(() => ({ data: [] }));
                ssName = listRes?.data?.[0]?.name;
                projectNo = listRes?.data?.[0]?.project_no;
            }
            if (!ssName) throw new Error("Sanction Sheet not found");

            const params = new URLSearchParams({
                docname: ssName,
                app_id: id,
                project_no: projectNo || "",
            });
            const res = await fetch(
                `/api/method/rndopsapp.rndopsapp.doctype.direct_purchase.direct_purchase.get_po_document?${params}`,
                {
                    credentials: "include",
                    headers: { Accept: "application/json" },
                },
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json?.message?.status === false)
                throw new Error(json?.message?.message || "Failed to fetch PO");

            const fileUrl = json?.message?.file_url || json?.message?.url;
            if (fileUrl) {
                window.open(fileUrl, "_blank");
            } else {
                throw new Error("No file URL returned");
            }
        } catch (err: any) {
            alert(`Error: ${err.message || "Could not download PO."}`);
        } finally {
            setIsDownloadingPO(false);
        }
    };

    const handleGenerateP11 = async () => {
        if (!id) return;
        setIsGeneratingP11(true);
        try {
            const res = await generateP11({ docname: id });
            if (res?.message?.status === "success") {
                alert("P-11 Form generated successfully!");
                loadData();
            } else {
                throw new Error(
                    res?.message?.message || "Failed to generate P-11 Form",
                );
            }
        } catch (err: any) {
            alert(`Error: ${err.message || "Could not generate P-11 Form."}`);
        } finally {
            setIsGeneratingP11(false);
        }
    };

    const handleOpenSanctionSheet = async () => {
        if (!id) return;
        setIsOpeningSanctionSheet(true);
        try {
            const filters = JSON.stringify([["app_id", "=", id]]);
            const res = await fetch(
                `/api/v2/document/sanction_sheet?filters=${encodeURIComponent(filters)}&fields=["name"]`,
                {
                    credentials: "include",
                    headers: { Accept: "application/json" },
                },
            );
            if (res.ok) {
                const result = await res.json();
                const existing = result.data?.[0];
                if (existing?.name) {
                    navigate(`/sanction-sheet?edit=${existing.name}`);
                    return;
                }
            }
            navigate(
                `/sanction-sheet?app_id=${id}&project_no=${encodeURIComponent(data?.project_name || "")}`,
            );
        } catch {
            navigate(
                `/sanction-sheet?app_id=${id}&project_no=${encodeURIComponent(data?.project_name || "")}`,
            );
        } finally {
            setIsOpeningSanctionSheet(false);
        }
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B]">
                <div className="text-center space-y-2">
                    <h2 className="font-serif text-xl font-medium text-red-600">
                        Unable to load document
                    </h2>
                    <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                        {error
                            ? (error as any).message ||
                            "Failed to load document"
                            : "Document not found"}
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 text-sm text-[#D97757] hover:underline"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans overflow-x-hidden">
            <AppSidebar />

            <main className="transition-all duration-300 ease-in-out px-5 py-6 md:px-8 md:py-7 overflow-x-hidden">
                {/* Page Header */}
                <PageHeader
                    title={data.name}
                    status={data.workflow_state}
                    projectName={data.project_name}
                >
                    <div className="flex items-center gap-2 flex-wrap">
                        <ViewProjectButton doctype="Direct Purchase" data={data} />
                        {data.workflow_state === "Draft" && id && (
                            <ClaudeButton
                                variant="outline"
                                onClick={() =>
                                    navigate(`/direct-purchase?edit=${id}`)
                                }
                            >
                                <EditIcon className="w-3.5 h-3.5" />
                                Edit
                            </ClaudeButton>
                        )}
                        {/*{data.workflow_state === 'Approved' && id && (
                            <ClaudeButton
                                variant="primary"
                                onClick={handleGenerateP11}
                                disabled={isGeneratingP11}
                            >
                                {isGeneratingP11 ? 'Generating…' : 'Generate P-11 Form'}
                            </ClaudeButton>
                        )}*/}
                        {data.workflow_state === "Sanction Approved" &&
                            id &&
                            isStaffRnD &&
                            poSanctionData?.file_path && (
                                <ClaudeButton
                                    variant="primary"
                                    onClick={handleGeneratePO}
                                    disabled={isGeneratingPO}
                                >
                                    {isGeneratingPO
                                        ? "Generating…"
                                        : "Generate Purchase Order"}
                                </ClaudeButton>
                            )}
                        {/*{data.workflow_state === "POGenerated" && id && (
                            <ClaudeButton
                                variant="outline"
                                onClick={handleDownloadPO}
                                disabled={isDownloadingPO}
                            >
                                {isDownloadingPO ? "Loading…" : "Print PO"}
                            </ClaudeButton>
                        )}*/}
                        {id && (
                            <DirectPurchaseActionButtons
                                docname={id}
                                onActionComplete={loadData}
                                p11DocName={p11DocName}
                                onP11Missing={() => setActiveTab("p11")}
                                commitRequired={commitRequired}
                            />
                        )}
                    </div>
                </PageHeader>

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
                    {/* Main content column */}
                    <div className="min-w-0 space-y-0">
                        {/* Tab navigation */}
                        <div className="mb-4 grid grid-cols-1 gap-2 rounded-2xl border border-[#E4E4E7] bg-white p-2 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A] sm:grid-cols-2 lg:grid-cols-4">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "group inline-flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-150",
                                        activeTab === tab.id
                                            ? TAB_TONES[tab.id].active
                                            : "border-transparent text-[#71717A] hover:border-[#E4E4E7] hover:bg-[#FAFAF9] hover:text-[#3F3F46] dark:text-[#A1A1AA] dark:hover:border-[#3F3F46] dark:hover:bg-[#18181B] dark:hover:text-[#E4E4E7]",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5",
                                            activeTab === tab.id
                                                ? "bg-white/70 text-current dark:bg-white/10"
                                                : TAB_TONES[tab.id].icon,
                                        )}
                                    >
                                        {tab.icon}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-[11px] font-extrabold uppercase tracking-wide">
                                            {tab.label}
                                        </span>
                                        <span className="mt-0.5 block truncate text-[10px] font-semibold normal-case tracking-normal opacity-75">
                                            {tab.description}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <ClaudeCard
                            className={cn(
                                "border-t-[3px]",
                                TAB_TONES[activeTab].border,
                            )}
                        >
                            {activeTab === "details" && (
                                <>
                                    <TabSectionHeader
                                        icon={<LayoutGridIcon />}
                                        eyebrow="Application Details"
                                        title="Direct Purchase Request"
                                        description="Key financials, applicant information, declarations, attachments, and purchase tables for this request."
                                        tone="details"
                                    />
                                    <DocumentViewer data={data} />
                                </>
                            )}

                            {activeTab === "p11" && id && (
                                <>
                                    <TabSectionHeader
                                        icon={<ClipboardListIcon />}
                                        eyebrow=""
                                        title="P-11 Form"
                                        description="Fill, review, print, and submit the P-11 form linked to this Direct Purchase application."
                                        tone="p11"
                                        action={data.workflow_state === "Approved" ? (
                                            <button
                                                onClick={() =>
                                                    p11DocName
                                                        ? navigate(`/p11-form?edit=${p11DocName}&app_id=${id}`)
                                                        : navigate(`/p11-form?app_id=${id}`)
                                                }
                                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D97757] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#c66a4e]"
                                            >
                                                <ClipboardListIcon className="h-3.5 w-3.5" />
                                                {p11DocName ? "Edit P-11 Form" : "Fill P-11 Form"}
                                            </button>
                                        ) : undefined}
                                    />
                                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold leading-5 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                                        A printed hard copy of the P-11 Form must be submitted to the R&amp;D Office for further processing.
                                    </div>
                                    <LinkedDocTab
                                        doctype="P_11 Form"
                                        filterField="app_id"
                                        filterValue={id}
                                        emptyTitle="No P-11 Form Filled Yet"
                                        emptyDescription={'Click "Fill P-11 Form" above to create and submit the P-11 Form. You must fill and submit P-11 before the "Submit P-11" workflow action becomes available.'}
                                        onDataReload={loadData}
                                        parentData={data ?? undefined}
                                    />
                                </>
                            )}

                            {activeTab === "sanction" && id && (
                                <>
                                    <TabSectionHeader
                                        icon={<FileTextIcon />}
                                        eyebrow="Approval Document"
                                        title="Sanction Sheet"
                                        description="Create or review the sanction sheet after the P-11 form has been verified by R&D."
                                        tone="sanction"
                                        action={
                                            data?.workflow_state === "RDP-11 Verified" && isStaffRnD ? (
                                                <button
                                                    onClick={
                                                        handleOpenSanctionSheet
                                                    }
                                                    disabled={
                                                        isOpeningSanctionSheet
                                                    }
                                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D97757] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#c66a4e] disabled:opacity-60"
                                                >
                                                    {isOpeningSanctionSheet
                                                        ? "Opening…"
                                                        : "Sanction Sheet"}
                                                </button>
                                            ) : undefined
                                        }
                                    />
                                    <LinkedDocTab
                                        doctype="sanction_sheet"
                                        filterField="app_id"
                                        filterValue={id}
                                        emptyTitle="No Sanction Sheet Generated Yet"
                                        emptyDescription="The Sanction Sheet is created by RnD Staff after the P-11 Form is verified and approved."
                                        onDataReload={loadData}
                                    />
                                </>
                            )}

                            {activeTab === "po" && (
                                <>
                                    <TabSectionHeader
                                        icon={<ShoppingCartIcon />}
                                        eyebrow="Purchase Order"
                                        title="Purchase Order"
                                        description="Prepare, preview, print, and upload the signed purchase order generated from the sanction sheet."
                                        tone="po"
                                    />
                                    {isLoadingPOData ? (
                                        <div className="flex items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] py-12 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                            <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#D97757] border-t-transparent" />
                                        </div>
                                    ) : poSanctionData &&
                                        (isStaffRnD ||
                                            data?.workflow_state ===
                                            "POGenerated") ? (
                                        <POEditor
                                            ssData={poSanctionData}
                                            dpId={id || ""}
                                            isStaffRnD={isStaffRnD}
                                            isPIReadOnly={
                                                isPermanentEmployee &&
                                                !isStaffRnD
                                            }
                                            onUploadSignedPO={async (
                                                file: File,
                                            ) => {
                                                const formData = new FormData();
                                                formData.append(
                                                    "file",
                                                    file,
                                                    file.name,
                                                );
                                                formData.append(
                                                    "docname",
                                                    poSanctionData.name,
                                                );
                                                formData.append(
                                                    "app_id",
                                                    id || "",
                                                );
                                                formData.append(
                                                    "project_no",
                                                    poSanctionData.project_no ||
                                                    "",
                                                );
                                                const res = await fetch(
                                                    "/api/method/rndopsapp.rndopsapp.doctype.direct_purchase.direct_purchase.upload_po_document",
                                                    {
                                                        method: "POST",
                                                        body: formData,
                                                        credentials: "include",
                                                        headers: {
                                                            "X-Frappe-CSRF-Token":
                                                                (window as any)
                                                                    .csrf_token ||
                                                                "",
                                                        },
                                                    },
                                                );
                                                const json = await res
                                                    .json()
                                                    .catch(() => ({}));
                                                if (
                                                    !res.ok ||
                                                    json?.message?.status ===
                                                    false
                                                )
                                                    throw new Error(
                                                        json?.message
                                                            ?.message ||
                                                        "Upload failed",
                                                    );
                                                // Reset so the effect re-fetches with updated file_path
                                                setPoSanctionData(null);
                                            }}
                                        />
                                    ) : poSanctionData ? (
                                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] px-5 py-12 text-center gap-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#A1A1AA] shadow-sm dark:bg-[#27272A] dark:text-[#71717A]">
                                                <ShoppingCartIcon className="h-5 w-5" />
                                            </div>
                                            <p className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                Purchase Order Not Yet Generated
                                            </p>
                                            <p className="max-w-md text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">
                                                The Purchase Order has not been
                                                generated by staff yet. Please
                                                check back later.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E4E7] bg-[#FAFAF9] px-5 py-12 text-center gap-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#A1A1AA] shadow-sm dark:bg-[#27272A] dark:text-[#71717A]">
                                                <ShoppingCartIcon className="h-5 w-5" />
                                            </div>
                                            <p className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                No Sanction Sheet Available
                                            </p>
                                            <p className="max-w-md text-[12px] font-medium leading-5 text-[#71717A] dark:text-[#A1A1AA]">
                                                The Purchase Order editor
                                                requires a Sanction Sheet to be
                                                created first.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </ClaudeCard>
                    </div>

                    {/* Sidebar */}
                    <div className="min-w-0 space-y-4">
                        {/* Meta Info */}
                        <ClaudeCard>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
                                        Created By
                                    </p>
                                    <div className="flex items-center gap-2 text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
                                        <UserIcon className="w-3.5 h-3.5 text-[#71717A] dark:text-[#A1A1AA]" />
                                        {data.owner || "—"}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
                                        Created On
                                    </p>
                                    <div className="flex items-center gap-2 text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
                                        <CalendarIcon className="w-3.5 h-3.5 text-[#71717A] dark:text-[#A1A1AA]" />
                                        {data.creation
                                            ? formatDate(data.creation, "long")
                                            : "—"}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
                                        Last Modified
                                    </p>
                                    <div className="flex items-center gap-2 text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
                                        <CalendarIcon className="w-3.5 h-3.5 text-[#71717A] dark:text-[#A1A1AA]" />
                                        {data.modified
                                            ? formatDate(data.modified, "short")
                                            : "—"}
                                    </div>
                                </div>
                            </div>
                        </ClaudeCard>

                        {/* Activity Log (new endpoint) */}
                        {id && (
                            <ClaudeCard title="Activity Log">
                                <ActivityLog doctype="Direct Purchase" docname={id} />
                            </ClaudeCard>
                        )}

                        {/* Commit Payment — centralised component handles staging check + form/display card */}
                        {isStaffRnD &&
                            data.workflow_state === "Pending Staff Approval" && (
                                <CommitPayment
                                    doctype="Direct Purchase"
                                    docName={id || ""}
                                    projectName={projectTitle}
                                    budgetHeads={budgetHeads}
                                    actualBalance={actualBalance}
                                    onCommitSuccess={() => loadData()}
                                    onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
                                />
                            )}

                        {/* Record Payment */}
                        {isStaffRnD &&
                            data.workflow_state === "Pending Staff Approval" &&
                            isCommitted && (
                                <ClaudeCard
                                    title="Record Payment"
                                    accentTop
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
                                                Payment Amount (₹)
                                            </label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg text-sm bg-white dark:bg-[#27272A] text-[#3F3F46] dark:text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                                placeholder="Enter payment amount"
                                                value={paymentAmount}
                                                onChange={(e) =>
                                                    setPaymentAmount(
                                                        e.target.value,
                                                    )
                                                }
                                                onWheel={(e) =>
                                                    e.currentTarget.blur()
                                                }
                                            />
                                        </div>
                                        <ClaudeButton
                                            variant="primary"
                                            className="w-full"
                                            onClick={handlePayment}
                                            disabled={isPaying}
                                        >
                                            {isPaying
                                                ? "Recording…"
                                                : "Record Payment"}
                                        </ClaudeButton>
                                    </div>
                                </ClaudeCard>
                            )}

                        {/* Add Comment */}
                        <ClaudeCard title="Add Comment">
                            <Textarea
                                rows={3}
                                placeholder="Type your comment…"
                                value={sidebarComment}
                                onChange={(e) =>
                                    setSidebarComment(e.target.value)
                                }
                                className="w-full text-sm resize-none border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg bg-white dark:bg-[#27272A] text-[#3F3F46] dark:text-[#E4E4E7] placeholder:text-[#71717A] dark:placeholder:text-[#A1A1AA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 dark:focus-visible:ring-zinc-800 focus-visible:border-zinc-400 dark:focus-visible:border-zinc-500 transition-all duration-200 mb-3"
                            />
                            <ClaudeButton
                                variant="primary"
                                className="w-full"
                                onClick={handleSidebarCommentSubmit}
                                disabled={
                                    isAddingComment || !sidebarComment.trim()
                                }
                            >
                                {isAddingComment
                                    ? "Submitting…"
                                    : "Submit Comment"}
                            </ClaudeButton>
                        </ClaudeCard>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DirectPurchaseDetails;
