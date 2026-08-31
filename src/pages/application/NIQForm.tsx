
// -=-=======================================================================



// import React, { useEffect, useRef, useState } from 'react';
// import { useNavigate, useParams, useLocation } from 'react-router-dom';
// import {
//     Printer, X, FileText,
//     Loader2, Save, CheckCircle2,
//     Bold, Italic, Underline,
//     AlignLeft, AlignCenter, AlignJustify,
//     Undo, Redo,
// } from 'lucide-react';

// // ─── Print Styles ─────────────────────────────────────────────────────────────
// const printStyles = `
// @media print {
//     /* We use margin 0 to hide browser URLs, while using our own layout-table */
//     @page { size: A4; margin: 0; }

//     table.niq-layout-table { width: 100%; border-collapse: collapse; border: none; }
//     table.niq-layout-table > thead > tr > td,
//     table.niq-layout-table > tbody > tr > td, 
//     table.niq-layout-table > tfoot > tr > td { border: none !important; padding: 0 !important; margin: 0 !important; }

//     /* These spaces repeat on EVERY page perfectly */
//     .header-space { height: 12mm; }
//     .footer-space { height: 14mm; }

//     .niq-page-footer {
//         display: block !important;
//         position: fixed !important;
//         bottom: 8mm !important;
//         left: 15mm !important;
//         right: 15mm !important;
//         font-size: 9px;
//         color: #555;
//         border-top: 1px solid #ddd;
//         padding-top: 4px;
//         font-family: "Times New Roman", Times, serif;
//     }

//     :root {
//         --sidebar-width: 0px !important;
//         --sidebar-width-mobile: 0px !important;
//     }

//     * {
//         -webkit-print-color-adjust: exact !important;
//         print-color-adjust: exact !important;
//         color-adjust: exact !important;
//     }

//     /* ── Hide ALL app chrome ── */
//     .no-print, header, aside, .sidebar, [data-sidebar="sidebar"], [data-sidebar], nav, button { 
//         display: none !important; 
//     }

//     /* Aggressive margin/padding resets for standard layout wrappers to avoid Sidebar ghost gaps */
//     html, body, #root, .App, main, [data-sidebar-inset], .SidebarProvider, [data-sidebar="inset"], [data-sidebar="wrapper"] {
//         background: white !important;
//         background-color: white !important;
//         margin: 0 !important;
//         padding: 0 !important;
//         border: 0 !important;
//         width: 100% !important;
//         max-width: 100% !important;
//         height: auto !important;
//         overflow: visible !important;
//         min-height: 0 !important;
//         display: block !important;
//         inset: 0 !important;
//         transform: none !important;
//         box-sizing: border-box !important;
//         position: static !important;
//     }

//     /* Neutralize inline variables globally */
//     * {
//         --sidebar-width: 0px !important;
//         --sidebar-width-mobile: 0px !important;
//         --sidebar-width-icon: 0px !important;
//     }

//     /* Force generic wrapper divs below root to remove padding/margin (fixes Shadcn sidebars) */
//     body > div, #root > div, #root > div > div {
//         margin: 0 !important;
//         padding: 0 !important;
//         display: block !important;
//         width: 100% !important;
//         max-width: 100% !important;
//         background: white !important;
//     }

//     .bg-zinc-100 { 
//         background-color: white !important; 
//     }

//     .niq-scroll-wrapper {
//         max-height: none !important;
//         overflow: visible !important;
//         display: block !important;
//         padding: 0 !important;
//         margin: 0 !important;
//         gap: 0 !important;
//     }

//     .niq-toolbar-wrapper { display: none !important; }

//     .print-container {
//         box-shadow: none !important;
//         width: 100% !important;
//         min-height: 0 !important;
//         padding: 0 !important;
//         margin: 0 !important;
//         overflow: visible !important;
//     }

//     .niq-layout-content-wrapper {
//         padding: 0 15mm !important; /* Left & right margins only. Top/Bottom handled by thead/tfoot spacers! */
//     }

//     .niq-input {
//         border: none !important;
//         background: transparent !important;
//         color: #000 !important;
//         font-family: inherit !important;
//         font-size: inherit !important;
//         box-shadow: none !important;
//         padding: 0 !important;
//     }
//     .niq-input::placeholder {
//         color: transparent !important;
//     }
//     .niq-input[contenteditable]:empty::before {
//         content: "";
//     }

//     .niq-hide-empty-print:empty,
//     .niq-hide-empty-print[data-empty="true"] {
//         display: none !important;
//     }

//     textarea.niq-input {
//         border: none !important;
//         background: transparent !important;
//         color: #000 !important;
//         resize: none !important;
//         font-family: inherit !important;
//         font-size: inherit !important;
//         box-shadow: none !important;
//         padding: 0 !important;
//     }

//     /* Force table borders to print in black */
//     table.niq-table {
//         border-collapse: collapse !important;
//         border-spacing: 0 !important;
//     }
//     table.niq-table th,
//     table.niq-table td {
//         border: 1pt solid #000 !important;
//         background-clip: padding-box !important;
//     }
//     /* Force header background to print */
//     .niq-th {
//         background-color: #e5e7eb !important;
//         -webkit-print-color-adjust: exact !important;
//         print-color-adjust: exact !important;
//     }

//     .avoid-break { page-break-inside: avoid; }
//     li { page-break-inside: auto; }
// }

// .niq-input {
//     border: none;
//     border-bottom: 1px dashed #ef4444;
//     outline: none;
//     background: #fee2e2;
//     padding: 2px 4px;
//     font-family: inherit;
//     font-size: inherit;
//     color: #991b1b;
//     min-width: 40px;
//     border-radius: 2px;
// }
// .niq-input::placeholder {
//     color: #f87171;
//     opacity: 1;
// }
// .niq-input[contenteditable]:empty::before {
//     content: attr(data-placeholder);
//     color: #f87171;
//     opacity: 1;
//     cursor: text;
// }
// .niq-input:focus {
//     border-bottom: 1px solid #dc2626;
//     background: #fecdd3;
//     color: #7f1d1d;
// }

// /* Inline editable field */
// .niq-field-editable {
//     display: inline;
//     border-bottom: 1px solid #bbb;
//     outline: none;
//     background: transparent;
//     padding: 0 2px;
//     font-family: inherit;
//     font-size: inherit;
//     color: inherit;
//     min-width: 40px;
//     cursor: text;
// }
// .niq-field-editable:focus { border-bottom-color: #555; background: rgba(0,0,0,0.03); }
// .niq-ol { list-style-type: decimal; padding-left: 20px; margin: 4px 0 6px; }
// .niq-ol-alpha { list-style-type: lower-alpha; padding-left: 18px; margin: 3px 0; }
// .niq-ol-roman { list-style-type: lower-roman; padding-left: 18px; margin: 3px 0; }
// .niq-ul { list-style-type: disc; padding-left: 18px; margin: 3px 0; }
// .niq-li { margin-bottom: 5px; text-align: justify; line-height: 1.5; font-size: 12px; }
// .niq-center-header {
//     display: block;
//     text-align: center;
//     font-weight: bold;
//     text-decoration: underline;
//     font-size: 13px;
//     margin: 18px 0 10px;
// }
// @media print {
//     .niq-field-editable {
//         border: none !important;
//         background: transparent !important;
//     }
// }

// /* Hide print footer on screen */
// .niq-page-footer { display: none; }
// `;

// // ─── Editable inline span ─────────────────────────────────────────────────────
// const E = ({ value, className = '' }: { value: string; className?: string }) => (
//     <span
//         contentEditable
//         suppressContentEditableWarning
//         className={`niq-field-editable ${className}`}
//     >
//         {value}
//     </span>
// );

// // ─── Plain input (for phone/fax/email/niq/date) ───────────────────────────────
// const F = ({
//     id,
//     defaultValue = '',
//     placeholder = '______',
//     style,
// }: {
//     id: string;
//     defaultValue?: string;
//     placeholder?: string;
//     style?: React.CSSProperties;
// }) => (
//     <span
//         id={id}
//         className="niq-input"
//         contentEditable
//         suppressContentEditableWarning
//         data-placeholder={placeholder}
//         style={{
//             display: 'inline-block',
//             minWidth: '30px', /* Greatly reduced to prevent the huge gap */
//             ...style
//         }}
//     >
//         {defaultValue}
//     </span>
// );

// // ─── Toolbar ──────────────────────────────────────────────────────────────────
// const Toolbar = ({ onClose, onSave, isSaving }: { onClose: () => void; onSave: () => void; isSaving: boolean }) => (
//     <div className="sticky top-4 self-start flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg no-print z-10 h-fit">
//         <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-700">
//             <button
//                 onClick={onSave}
//                 disabled={isSaving}
//                 title="Save NIQ"
//                 className="p-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center"
//             >
//                 {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
//             </button>
//             <button
//                 onClick={onClose}
//                 title="Close"
//                 className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center"
//             >
//                 <X className="w-5 h-5" />
//             </button>
//         </div>

//         {/* Text Formatting */}
//         <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-700">
//             <button onClick={() => document.execCommand('bold')} title="Bold" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Bold className="w-4 h-4" /></button>
//             <button onClick={() => document.execCommand('italic')} title="Italic" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Italic className="w-4 h-4" /></button>
//             <button onClick={() => document.execCommand('underline')} title="Underline" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Underline className="w-4 h-4" /></button>
//         </div>

//         {/* Alignment */}
//         <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-700">
//             <button onClick={() => document.execCommand('justifyLeft')} title="Align Left" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><AlignLeft className="w-4 h-4" /></button>
//             <button onClick={() => document.execCommand('justifyCenter')} title="Align Center" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><AlignCenter className="w-4 h-4" /></button>
//             <button onClick={() => document.execCommand('justifyFull')} title="Justify" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><AlignJustify className="w-4 h-4" /></button>
//         </div>

//         {/* History */}
//         <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-700">
//             <button onClick={() => document.execCommand('undo')} title="Undo" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Undo className="w-4 h-4" /></button>
//             <button onClick={() => document.execCommand('redo')} title="Redo" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Redo className="w-4 h-4" /></button>
//         </div>

//         <div className="pt-2 flex flex-col items-center gap-1">
//             <FileText className="w-4 h-4 text-zinc-400" />
//             <span className="text-[10px] text-zinc-400 font-medium text-center leading-tight">NIQ</span>
//         </div>
//     </div>
// );

// // ─── Types ────────────────────────────────────────────────────────────────────
// interface IGFItem {
//     igf_item_name?: string;
//     igf_item_description?: string;
//     igf_justification?: string;
//     igf_quantity?: number | string;
//     igf_estimated_rate?: number | string;
//     igf_estimated_amount?: number | string;
// }

// interface CommitteeMember {
//     igf_webmail_id?: string;
//     igf_member_name?: string;
//     igf_designation?: string;
// }

// interface IGFData {
//     name: string;
//     igf_indenter?: string;
//     igf_indenter_designation?: string;
//     igf_department_centre_section?: string;
//     igf_project_code?: string;
//     igf_project_title?: string;
//     igf_webmail_id?: string;
//     igf_webmail_user_id?: string;
//     igf_items?: IGFItem[];
//     igf_committee_members?: CommitteeMember[];
//     igf_total_estimate?: number | string;
//     igf_tender_type?: string;
//     igf_number_of_bids?: string;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// const fmt = (n: number | string | undefined) =>
//     n !== undefined && n !== ''
//         ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
//         : '—';

// const normalizeEmail = (raw?: string | null) => {
//     if (!raw) return null;
//     return raw.includes('@') ? raw : `${raw}@iitg.ac.in`;
// };

// // ─── Main Component ───────────────────────────────────────────────────────────
// const NIQPage: React.FC = () => {
//     const navigate = useNavigate();
//     const { id, igfId } = useParams<{ id?: string, igfId?: string }>();
//     const location = useLocation();

//     const [igf, setIgf] = useState<IGFData | null>(null);
//     const [deptLabel, setDeptLabel] = useState('');
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [additionalTerms, setAdditionalTerms] = useState<string>('');
//     const [isSaving, setIsSaving] = useState(false);
//     const [showSuccessModal, setShowSuccessModal] = useState(false);
//     const [existingNiqHtml, setExistingNiqHtml] = useState<string | null>(null);
//     const printRef = useRef<HTMLDivElement>(null);

//     const docId = id ?? igfId ?? (location.state as any)?.application?.id ?? '';

//     const handleSave = async () => {
//         if (!printRef.current) return;
//         setIsSaving(true);
//         try {
//             const niqHtml = printRef.current.outerHTML;
//             const body = new FormData();
//             body.append('project_no', igf?.igf_project_code ?? '');
//             body.append('direct_purchase_ref', igf?.name ?? docId);
//             body.append('niq_data', niqHtml);
//             const res = await fetch(
//                 '/api/method/rndopsapp.rndopsapp.doctype.niq.niq.save_niq_data',
//                 { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' }, body }
//             );
//             if (!res.ok) throw new Error(`HTTP ${res.status}`);
//             setShowSuccessModal(true);
//         } catch (e: any) {
//             alert(`Failed to save NIQ: ${e.message}`);
//         } finally {
//             setIsSaving(false);
//         }
//     };


//     useEffect(() => {
//         if (!docId) { setLoading(false); return; }
//         const fetchIGF = async () => {
//             try {
//                 // Check if a NIQ has already been saved for this direct_purchase_ref
//                 const niqCheck = await fetch(
//                     `/api/resource/Niq?filters=${encodeURIComponent(JSON.stringify([["direct_purchase_ref", "=", docId]]))}&fields=${encodeURIComponent(JSON.stringify(["niq_data", "name"]))}`,
//                     { headers: { Accept: 'application/json' }, credentials: 'include' }
//                 );
//                 if (niqCheck.ok) {
//                     const niqJson = await niqCheck.json();
//                     const niqDoc = niqJson?.data?.[0];
//                     if (niqDoc?.niq_data) {
//                         setExistingNiqHtml(niqDoc.niq_data);
//                         setLoading(false);
//                         return;
//                     }
//                 }

//                 const res = await fetch(
//                     `/api/resource/Indent%20General%20Form/${encodeURIComponent(docId)}`,
//                     { headers: { Accept: 'application/json' }, credentials: 'include' }
//                 );
//                 if (!res.ok) throw new Error(`HTTP ${res.status}`);
//                 const json = await res.json();
//                 const data: IGFData = json.data;
//                 setIgf(data);

//                 // Resolve dept_name from Department_prornd doctype
//                 const deptId = data.igf_department_centre_section;
//                 if (deptId) {
//                     try {
//                         const dRes = await fetch(
//                             `/api/method/frappe.client.get_value?doctype=Department_prornd&filters=${encodeURIComponent(deptId)}&fieldname=dept_name`,
//                             { headers: { Accept: 'application/json' }, credentials: 'include' }
//                         );
//                         if (dRes.ok) {
//                             const dJson = await dRes.json();
//                             setDeptLabel(dJson?.message?.dept_name || deptId);
//                         } else {
//                             setDeptLabel(deptId);
//                         }
//                     } catch {
//                         setDeptLabel(deptId);
//                     }
//                 }

//                 // Attempt to deeply resolve PI email if the primary header is blank
//                 const piMember = data.igf_committee_members?.find(m => m.igf_designation === 'PI');
//                 const piEmail = piMember?.igf_webmail_id;

//                 // Resolve real user name and designation dynamically
//                 const emailToFetch =
//                     normalizeEmail(data.igf_webmail_id) ||
//                     normalizeEmail(data.igf_webmail_user_id) ||
//                     normalizeEmail(piEmail);
//                 if (emailToFetch) {
//                     try {
//                         const uRes = await fetch(
//                             '/api/method/rndopsapp.rndopsapp.api.get_user_details',
//                             {
//                                 method: 'POST',
//                                 headers: {
//                                     'Accept': 'application/json',
//                                     'Content-Type': 'application/json'
//                                 },
//                                 credentials: 'include',
//                                 body: JSON.stringify({ user_email: emailToFetch })
//                             }
//                         );
//                         if (uRes.ok) {
//                             const uJson = await uRes.json();
//                             if (uJson.message) {
//                                 // Explicitly update with the freshly fetched user data
//                                 data.igf_indenter = uJson.message.full_name || data.igf_indenter;
//                                 data.igf_indenter_designation = uJson.message.designation_name || data.igf_indenter_designation;
//                                 // Force hard override to guarantee React re-render of literal fetch
//                                 if (uJson.message.full_name) {
//                                     data.igf_indenter = uJson.message.full_name;
//                                 }
//                                 setIgf({ ...data }); // Trigger re-render with fetched details
//                             }
//                         }
//                     } catch (e) {
//                         console.error('Failed to fetch user details:', e);
//                     }
//                 }

//                 // If completely blank after everything, forcefully fallback to the PI name from committee
//                 if (!data.igf_indenter && piMember?.igf_member_name) {
//                     data.igf_indenter = piMember.igf_member_name;
//                     setIgf({ ...data });
//                 }
//             } catch (e: any) {
//                 setError(e.message ?? 'Failed to load form data');
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchIGF();
//     }, [docId]);

//     const today = new Date().toLocaleDateString('en-IN', {
//         day: '2-digit', month: 'long', year: 'numeric',
//     });

//     const printedAt = new Date().toLocaleString('en-IN', {
//         day: '2-digit', month: 'short', year: 'numeric',
//         hour: '2-digit', minute: '2-digit', hour12: true,
//     });

//     const indenterName = igf?.igf_indenter || '';
//     const designation = igf?.igf_indenter_designation || 'Principal Investigator';
//     const department = deptLabel || igf?.igf_department_centre_section || '';
//     // Use || (not ??) so that empty-string fields also fall back to docId
//     const projectCode = igf?.igf_project_code || docId || '';
//     const projectTitle = igf?.igf_project_title ?? '';
//     const items: IGFItem[] = igf?.igf_items ?? [];
//     const committee: CommitteeMember[] = igf?.igf_committee_members ?? [];
//     const totalQty = items.reduce((s, r) => s + (Number(r.igf_quantity) || 0), 0);
//     const totalAmt = Number(igf?.igf_total_estimate ?? 0);

//     // Compose item name summary for the NIQ title (first item + "etc." if more)
//     const itemSummary = items.length > 0
//         ? items.length === 1
//             ? items[0].igf_item_name ?? ''
//             : `${items[0].igf_item_name ?? ''} and ${items.length - 1} other item${items.length > 2 ? 's' : ''}`
//         : '';

//     const defaultNIQNo = `IITG/II&SI/PROJECT/${projectCode}`;

//     if (loading) {
//         return (
//             <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
//                 <div className="flex flex-col items-center gap-3 text-zinc-500">
//                     <Loader2 className="w-8 h-8 animate-spin text-[#D97757]" />
//                     <p className="text-sm">Loading NIQ data…</p>
//                 </div>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
//                 <div className="text-center">
//                     <p className="text-red-500 font-medium">{error}</p>
//                     <button onClick={() => navigate(-1)} className="mt-4 text-sm text-zinc-500 underline">Go back</button>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="bg-zinc-100 dark:bg-zinc-950 min-h-screen">
//             <style>{printStyles}</style>

//             {/* ── Success Modal ── */}
//             {showSuccessModal && (
//                 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
//                     <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-sm mx-4">
//                         <div className="flex items-center gap-3 mb-1">
//                             <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
//                             <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">NIQ Saved Successfully</h3>
//                         </div>
//                         <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">What would you like to do next?</p>
//                         <div className="flex flex-col gap-2">
//                             <button
//                                 onClick={() => { setShowSuccessModal(false); window.print(); }}
//                                 className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-[#D97757] text-white hover:bg-[#c66a4e] transition-colors shadow-sm"
//                             >
//                                 <Printer className="w-4 h-4" /> Print NIQ
//                             </button>
//                             <button
//                                 onClick={() => setShowSuccessModal(false)}
//                                 className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
//                             >
//                                 Close
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             <main className="p-4 md:p-8 w-full">
//                 <div className="niq-scroll-wrapper flex justify-center items-start gap-4 max-h-[calc(100vh-4rem)] overflow-y-auto">

//                     {/* ── Toolbar ── */}
//                     <div className="niq-toolbar-wrapper sticky top-4">
//                         <Toolbar onClose={() => navigate(-1)} onSave={handleSave} isSaving={isSaving} />
//                     </div>

//                     {/* ── A4 Paper ── */}
//                     {existingNiqHtml ? (
//                         <div
//                             ref={printRef}
//                             className="print-container bg-white text-black shadow-2xl relative"
//                             dangerouslySetInnerHTML={{ __html: existingNiqHtml }}
//                         />
//                     ) : (
//                     <div
//                         ref={printRef}
//                         className="print-container bg-white text-black shadow-2xl relative"
//                         style={{
//                             width: '210mm',
//                             minHeight: '297mm',
//                             padding: '0',
//                             fontFamily: '"Times New Roman", Times, serif',
//                             fontSize: '11.5px',
//                             lineHeight: '1.45',
//                         }}
//                     >
//                         <div className="niq-layout-content-wrapper" style={{ padding: '0 15mm' }}>
//                             <table className="niq-layout-table">
//                                 <thead>
//                                     <tr><td><div className="header-space" style={{ height: '12mm' }} /></td></tr>
//                                 </thead>
//                                 <tbody>
//                                     <tr>
//                                         <td>
//                                             {/* ═══════════════════════════
//                                                 HEADER
//                                             ═══════════════════════════ */}
//                                             <table className="avoid-break" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', marginTop: '6mm' }}>
//                                                 <tbody>
//                                                     <tr>
//                                                         {/* Left – logo + institute */}
//                                                         <td style={{ width: '65%', verticalAlign: 'top', padding: '6px 10px 10px 0', borderBottom: '2px solid black' }}>
//                                                             <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
//                                                                 <img
//                                                                     src="http://172.16.131.206:8000/files/IITG_logo.png"
//                                                                     alt="IITG"
//                                                                     style={{ width: '55px', height: 'auto', flexShrink: 0 }}
//                                                                     onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
//                                                                 />
//                                                                 <div>
//                                                                     <strong style={{ display: 'block', fontSize: '12.5px' }}>
//                                                                         Research and Development Section
//                                                                     </strong>
//                                                                     <strong style={{ display: 'block', fontSize: '11.5px', marginTop: '3px' }}>
//                                                                         Indian Institute of Technology Guwahati<br />
//                                                                         Guwahati-781039, Assam, India
//                                                                     </strong>
//                                                                 </div>
//                                                             </div>
//                                                         </td>

//                                                         {/* Right – contact */}
//                                                         <td style={{ width: '35%', verticalAlign: 'top', padding: '6px 0 10px 10px', borderLeft: '1px solid #ccc', borderBottom: '2px solid black' }}>
//                                                             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
//                                                                 <tbody>
//                                                                     <tr>
//                                                                         <td style={{ fontWeight: 'bold', whiteSpace: 'nowrap', paddingRight: '4px', width: '68px' }}>Phone Nos.</td>
//                                                                         <td style={{ whiteSpace: 'nowrap', width: '8px' }}>:</td>
//                                                                         <td>+91-361-258-<E value="3431" /></td>
//                                                                     </tr>
//                                                                     <tr>
//                                                                         <td></td>
//                                                                         <td style={{ whiteSpace: 'nowrap' }}>:</td>
//                                                                         <td>+91-361-258-<E value="3430" /></td>
//                                                                     </tr>
//                                                                     <tr>
//                                                                         <td style={{ fontWeight: 'bold' }}>Fax</td>
//                                                                         <td>:</td>
//                                                                         <td>+91-361-258-<E value="2089" /></td>
//                                                                     </tr>
//                                                                     <tr>
//                                                                         <td></td>
//                                                                         <td>:</td>
//                                                                         <td>+91-361-269-<E value="2005" /></td>
//                                                                     </tr>
//                                                                     <tr>
//                                                                         <td style={{ fontWeight: 'bold' }}>Email</td>
//                                                                         <td>:</td>
//                                                                         <td>{normalizeEmail(igf?.igf_webmail_id) || normalizeEmail(igf?.igf_webmail_user_id) || 'iiisi@iitg.ac.in'}</td>
//                                                                     </tr>
//                                                                 </tbody>
//                                                             </table>
//                                                         </td>
//                                                     </tr>

//                                                 </tbody>
//                                             </table>

//                                             {/* Indenter details */}
//                                             <div style={{ paddingRight: '10px', marginTop: '10px' }}>
//                                                 <strong style={{ fontSize: '12.5px' }}>{indenterName}</strong>
//                                                 {designation && <span style={{ display: 'block', marginTop: '3px' }}>{designation}</span>}
//                                                 {department && <span style={{ display: 'block', marginTop: '3px' }}>{department}</span>}
//                                             </div>

//                                             {/* Date and NIQ No moved below and aligned right */}
//                                             <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '35px', marginTop: '15px' }}>
//                                                 <div style={{ width: '35%', paddingLeft: '10px' }}>
//                                                     <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
//                                                         <tbody>
//                                                             <tr>
//                                                                 <td style={{ fontWeight: 'bold', whiteSpace: 'nowrap', paddingRight: '4px', width: '68px' }}>Date</td>
//                                                                 <td style={{ whiteSpace: 'nowrap', width: '8px' }}>:</td>
//                                                                 <td><strong>{today}</strong></td>
//                                                             </tr>
//                                                             <tr>
//                                                                 <td style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>NIQ No.</td>
//                                                                 <td>:</td>
//                                                                 <td style={{ wordBreak: 'break-all' }}>{defaultNIQNo}</td>
//                                                             </tr>
//                                                         </tbody>
//                                                     </table>
//                                                 </div>
//                                             </div>

//                                             {/* ═══════════════════════════
//                             NIQ TITLE
//                         ═══════════════════════════ */}
//                                             <p style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '12px', marginTop: '20px', marginBottom: '14px', lineHeight: '1.6' }}>
//                                                 NOTICE INVITING QUOTATION FOR SUPPLY &amp; INSTALLATION OF{' '}
//                                                 {itemSummary || '[Item Name]'}{' '}
//                                                 FOR THE DEPARTMENT OF{' '}
//                                                 {department || '[Department]'}{' '}
//                                                 (PROJECT NO. {projectCode}), IIT GUWAHATI.
//                                             </p>

//                                             {/* Submission note */}
//                                             <p style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '12px', marginTop: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
//                                                 Quotations for supply of equipment as per details at <strong>ANNEXURE-I</strong>, in single bid
//                                                 as indicated in the CHECKLIST given below, in sealed covers, are hereby invited so as to
//                                                 reach the undersigned on or before{' '}
//                                                 <F id="lastDate" placeholder="[Date]" />.
//                                             </p>

//                                             {/* ═══════════════════════════
//                             ITEMS TABLE (ANNEXURE-I inline summary)
//                         ═══════════════════════════ */}
//                                             {false && items.length > 0 && (
//                                                 <div style={{ marginBottom: '10px' }}>
//                                                     <p style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>
//                                                         ANNEXURE-I: Details of Items to be Purchased
//                                                     </p>
//                                                     <table className="niq-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
//                                                         <thead>
//                                                             <tr>
//                                                                 <th className="niq-th" style={thStyle}>#</th>
//                                                                 <th className="niq-th" style={thStyle}>Item Name</th>
//                                                                 <th className="niq-th" style={thStyle}>Description</th>
//                                                                 <th className="niq-th" style={thStyle}>Qty</th>
//                                                                 <th className="niq-th" style={thStyle}>Rate (₹)</th>
//                                                                 <th className="niq-th" style={thStyle}>Amount (₹)</th>
//                                                             </tr>
//                                                         </thead>
//                                                         <tbody>
//                                                             {items.map((item, i) => (
//                                                                 <tr key={i}>
//                                                                     <td style={tdCenterStyle}>{i + 1}</td>
//                                                                     <td style={tdStyle}>{item.igf_item_name ?? '—'}</td>
//                                                                     <td style={tdStyle}>{item.igf_item_description ?? '—'}</td>
//                                                                     <td style={tdCenterStyle}>{item.igf_quantity ?? '—'}</td>
//                                                                     <td style={tdRightStyle}>{Number(item.igf_estimated_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
//                                                                     <td style={tdRightStyle}>{Number(item.igf_estimated_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
//                                                                 </tr>
//                                                             ))}
//                                                         </tbody>
//                                                         <tfoot>
//                                                             <tr className="niq-tfoot" style={{ fontWeight: 'bold' }}>
//                                                                 <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>Grand Total</td>
//                                                                 <td style={tdCenterStyle}>{totalQty}</td>
//                                                                 <td style={tdRightStyle}></td>
//                                                                 <td style={tdRightStyle}>{fmt(totalAmt)}</td>
//                                                             </tr>
//                                                         </tfoot>
//                                                     </table>
//                                                 </div>
//                                             )}

//                                             {/* ═══════════════════════════
//                             PURCHASE COMMITTEE
//                         ═══════════════════════════ */}
//                                             {false && committee.length > 0 && (
//                                                 <div style={{ marginBottom: '10px' }}>
//                                                     <p style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>
//                                                         Purchase Committee
//                                                     </p>
//                                                     <table className="niq-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
//                                                         <thead>
//                                                             <tr>
//                                                                 <th className="niq-th" style={thStyle}>#</th>
//                                                                 <th className="niq-th" style={thStyle}>Name</th>
//                                                                 <th className="niq-th" style={thStyle}>Webmail ID</th>
//                                                                 <th className="niq-th" style={thStyle}>Role</th>
//                                                             </tr>
//                                                         </thead>
//                                                         <tbody>
//                                                             {committee.map((m, i) => (
//                                                                 <tr key={i}>
//                                                                     <td style={tdCenterStyle}>{i + 1}</td>
//                                                                     <td style={tdStyle}>{m.igf_member_name ?? '—'}</td>
//                                                                     <td style={tdStyle}>{m.igf_webmail_id ?? '—'}</td>
//                                                                     <td style={tdStyle}>{m.igf_designation ?? '—'}</td>
//                                                                 </tr>
//                                                             ))}
//                                                         </tbody>
//                                                     </table>
//                                                 </div>
//                                             )}

//                                             {/* ═══════════════════════════
//                             INSTRUCTIONS TO BIDDERS
//                         ═══════════════════════════ */}
//                                             <span className="niq-center-header">INSTRUCTION TO BIDDERS</span>
//                                             <p style={{ fontWeight: 'bold', marginBottom: '3px' }}>
//                                                 {igf?.igf_number_of_bids?.startsWith('Single') || !igf?.igf_number_of_bids
//                                                     ? 'Single Bid:'
//                                                     : 'Double Bid:'}
//                                             </p>
//                                             <ol className="niq-ol" contentEditable suppressContentEditableWarning>
//                                                 <li className="niq-li">
//                                                     In case of single bid, quotations will have to be submitted in a single bid, in a properly
//                                                     sealed cover; and the address of the firm submitting the quotation and the Officer to whom
//                                                     the quotation is addressed, must appear distinctly on the sealed cover. Further, on the sealed
//                                                     cover the following are to be written:{' '}
//                                                     <strong>
//                                                         'QUOTATION FOR SUPPLY &amp; INSTALLATION OF{' '}
//                                                         {itemSummary || '[Item]'}{' '}
//                                                         FOR THE DEPARTMENT OF {department || '[Dept]'}{' '}
//                                                         (PROJECT NO. {projectCode}), IIT GUWAHATI.{' '}
//                                                         VIDE NIQ NO. {defaultNIQNo},{' '}
//                                                         LAST DATE FOR SUBMISSION <F id="lastDateRef" placeholder="[Date]" />'
//                                                     </strong>
//                                                     <br />
//                                                     <strong>NOTE:</strong> The bid documents are not transferable and the firm's seal and signature
//                                                     of the authorized official must appear on all the papers and envelopes submitted.
//                                                 </li>
//                                                 <li className="niq-li">The bid must mention the prices of all items asked for individually and then summed up — basic price and other charges such as Packing, Freight, Insurance, Installation &amp; Commissioning charge, VAT/Tax etc. as applicable.</li>
//                                                 <li className="niq-li">Annual Maintenance Contract (AMC) rate (after expiry of warranty period) is to be clearly indicated – preferably in both comprehensive and non-comprehensive terms, failure to which the offer may not be considered even if it turns out to be at the lowest price.</li>
//                                                 <li className="niq-li">Details of the technical features of the offered equipment along with Standard Technical literature on each of the items offered.</li>
//                                                 <li className="niq-li">Dealership certificate on the offered products in case of dealer/s.</li>
//                                                 <li className="niq-li">List of reputed organizations/Institutions, where similar orders have been executed (copies of the purchase/work orders will have to be enclosed).</li>
//                                                 <li className="niq-li">Up-to-date Sales Tax clearance certificate (for vendors outside the State of Assam) / VAT Registration Certificate indicating also the TIN number (for vendors from within the State of Assam) OF THE FIRM will have to accompany the quotation to be submitted.</li>
//                                                 <li className="niq-li">Details of nature and maximum period of warranty offered by the vendor.</li>
//                                                 <li className="niq-li">After Sales Service: The name &amp; address of the nearest available authorized service centre to IIT, North Guwahati, should be stated in the quotation.</li>
//                                             </ol>

//                                             {/* ═══════════════════════════
//                             TERMS & CONDITIONS
//                         ═══════════════════════════ */}
//                                             <p style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '2px' }}>TERMS &amp; CONDITIONS:</p>
//                                             <p className="niq-li" style={{ marginBottom: '5px' }}>
//                                                 (Please note the term 'both foreign &amp; indigenous' wherever mentioned means the term is applicable to both foreign &amp; indigenous purchase)
//                                             </p>
//                                             <ol className="niq-ol" contentEditable suppressContentEditableWarning>
//                                                 <li className="niq-li">
//                                                     <strong>Rates:</strong> Rates quoted for indigenous items should be on FOR IIT Guwahati, on DOOR DELIVERY basis, with break-ups as per details below (For import items please refer 'Additional Terms for imported goods' at clause No. 25 below). Break-ups of cost:
//                                                     <ol className="niq-ol-alpha">
//                                                         <li>Basic Price</li>
//                                                         <li>(+) Central Excise Duty, if any</li>
//                                                         <li>(+) VAT / Central Sales Tax (On Sub-Total Price, including Excise Duty, if any)</li>
//                                                         <li>(+) Freight &amp; Insurance Charge, if any</li>
//                                                         <li>(+) Installation &amp; Commissioning Charge, if any</li>
//                                                         <li>Grand Total F.O.R. IIT Guwahati Price</li>
//                                                     </ol>
//                                                     Note: Vague terms like "packing, forwarding, transportation etc. extra" without mentioning the specific amount will not be accepted. Such offers shall be treated as incomplete and rejected. Bidders shall indicate their rates in clear/visible figures as well as in words and shall not alter/overwrite/make cutting in the quotation. In case of a mismatch, the rates written in words will prevail.
//                                                 </li>
//                                                 <li className="niq-li">Validity (Both foreign &amp; indigenous): Quoted rates must be valid for 120 days.</li>
//                                                 <li className="niq-li">
//                                                     <strong>Performance Bank Guarantee (Both foreign &amp; indigenous):</strong> The successful bidder shall furnish an unconditional Performance Bank Guarantee valid till 60 days after the warranty period from a scheduled Bank for 10% of the Purchase Order value within 21 days of placement of order failing which the contract shall be deemed as terminated (APPLICABLE ONLY TO ORDERS COSTING MORE THAN INR 5,00,000.00). That:
//                                                     <ol className="niq-ol-alpha">
//                                                         <li>The Vendor shall provide a Certificate of Guarantee guaranteeing satisfactory operation of the components and against poor workmanship, bad quality of materials used, faulty designs and performance figures given by the Vendor.</li>
//                                                         <li>This guarantee shall be operative for a period of 60 days after the warranty period. The performance guarantee would be to the extent of 10% of the order value.</li>
//                                                         <li>The Vendor shall at his own cost rectify the defects/replace the items supplied, for defects identified during the period of guarantee.</li>
//                                                         <li>While clauses 3(a), 3(b) and 3(c) are applicable to all orders worth Rs. 5 Lakhs or more, competent authority may take appropriate decisions on exceptional cases.</li>
//                                                     </ol>
//                                                 </li>
//                                                 <li className="niq-li">
//                                                     <strong>PENALTY for delayed delivery (for both foreign &amp; indigenous):</strong> The date of delivery shall be strictly adhered to, except in cases of Force Majeure or extension of the delivery date duly approved by IIT Guwahati. In the event of delayed delivery and acceptance by the end user, the vendor shall be liable for a penalty deduction at the rate of 0.5% per week or part thereof of the value of the entire consignment, subject to a maximum of 10% (ten percent).
//                                                     For the purpose of this clause, part of a week shall be treated as a full week. In case of delayed delivery, IIT Guwahati reserves the right not to accept the consignment.
//                                                 </li>
//                                                 <li className="niq-li">In case of indigenous supplies, the goods should be insured against theft, loss or breakage during transit and insurance charges should not exceed 1% of the cost of material supplied, the rates of Sales Tax, Excise Duty etc. (as applicable) should be clearly indicated. Form C &amp; D is not applicable to us. However, we are exempted from payment of Excise Duty and certificate to this effect can be provided.</li>
//                                                 <li className="niq-li">Penalty for delayed supply (Both foreign &amp; indigenous): In case of supply order for the SCIENTIFIC EQUIPMENTS / APPARATUS, the date of delivery should be strictly adhered to otherwise the Director, IITG reserves the right not to accept delivery in part or full and claim liquidated damages of 1% per week subject to maximum of 10% of the total value of supply.</li>
//                                                 <li className="niq-li">Pre-installation requisites (Both foreign &amp; indigenous): Pre-installation requisites (electrical/floor/space/air-conditioning etc.) if any should invariably be mentioned clearly. Installation / Training will be the full responsibility of the supplier / Indian Agent.</li>
//                                                 <li className="niq-li">Short Shipment (Both foreign &amp; indigenous): If any short-shipment etc. is noticed, the same will be arranged immediately with all charges to this effect to be borne by supplier/Indian agent.</li>
//                                                 <li className="niq-li">Genuine Pricing (Both foreign &amp; indigenous): Vendor is to ensure that quoted price is not more than the price offered to any other customer in India to whom this particular item has been sold, particularly to IIT/Institutes and other Government Organization. Copy of the latest price list for the quoted item, applicable in India, must be enclosed with your offer.</li>
//                                                 <li className="niq-li">Excise Duty: The Institute is exempted from payment of Central Excise Duty vide GOI Notification No. 10/97-Central Excise, dated 01.03.97 with Regn. No. TU/V/RG-CDE (351)/2011, dated 19.09.2011.</li>
//                                                 <li className="niq-li">VAT: For a vendor within the State of Assam, appropriate VAT (to be deducted at source) will be applicable. For exemption from Octroi, wherever required, the Institute will issue necessary certificates.</li>
//                                                 <li className="niq-li">Entry Tax: Assam Govt. Entry Tax – usually @4% [to be paid by IIT Guwahati, not by the vendor], wherever applicable, will be added while evaluating cost status of the concerned equipment to be supplied by vendors from outside the State of Assam.</li>
//                                                 <li className="niq-li">
//                                                     <strong>Delivery:</strong>
//                                                     <ol className="niq-ol-alpha">
//                                                         <li>Delivery of goods at IIT Guwahati will have to be maximum within 45 (Forty-five) days from the date of issue of the Purchase Order.</li>
//                                                         <li>Safe delivery of goods: All aspects of safe delivery shall be the exclusive responsibility of the vendor. At the destination site, the cartons will be opened only in the presence of IIT user/representative and vendor's representative and the intact position of the seal for not being tempered with, shall form the basis for certifying the receipt in good condition.</li>
//                                                         <li>No Part Delivery: part shipment will not be allowed.</li>
//                                                     </ol>
//                                                 </li>
//                                                 <li className="niq-li">
//                                                     Mode of Payment for Indigenous Purchase (For import items please refer 'Additional Terms for imported goods' clause No. 28 below):
//                                                     <ol className="niq-ol-alpha">
//                                                         <li>Payment for Indigenous Purchases will be maximum within 45 days from the date of successful delivery and installation of goods at IIT Guwahati, North-Guwahati, generally through A/c payee cheque. In case payment is to be made by DD, the Draft commission will be deducted from the bill amount. or</li>
//                                                         <li>Payment through bank against proof of dispatch: 90% payment shall be released on receipt of proof of dispatch through State Bank Of India, IITG Branch, Guwahati-781039, Assam (Contact No. 0361-2582106). Balance 10% shall be released after installation / handing over of the equipment to the consignee(s).</li>
//                                                     </ol>
//                                                     Note: Please note as per Institute's norm advance payment is not allowed for indigenous purchase.
//                                                 </li>
//                                                 <li className="niq-li">Quotation by Fax/Mail not Acceptable (Both foreign &amp; indigenous): The offers submitted by telex / telegram / fax / E-mail etc. shall not be considered. No correspondence will be entertained on this matter.</li>
//                                                 <li className="niq-li">Late and delayed tender (Both foreign &amp; indigenous): Late and delayed tender will not be considered. In case any unscheduled holiday occurs on prescribed closing/opening date the next working day shall be the prescribed date of closing/opening.</li>
//                                                 <li className="niq-li">Conditional tenders not acceptable (Both foreign &amp; indigenous): Conditional tenders shall not be accepted on any ground and shall be rejected straightway. In other words, printed conditions mentioned in the tender bids submitted by vendors will not be binding on IITG. All the terms and conditions for the supply, payment terms, penalty etc. will be as those mentioned herein and no change in the terms and conditions by the vendors will be acceptable.</li>
//                                                 <li className="niq-li">Specifications are basic essence of the product (Both foreign &amp; indigenous): It must be ensured that the offers are strictly as per our specifications. At the same time it must also be kept in mind that merely copying our specifications in their quotation shall not make firms eligible for consideration. A quotation has to be supported with the printed technical leaflet/literature (wherever applicable) and the specifications mentioned in the quotation must be reflected / supported by such printed technical leaflet/literature — model quoted/tendered specifications should invariably be highlighted in the leaflet/literature for easy reference.</li>
//                                                 <li className="niq-li">Enquiry during the course of evaluation not allowed (Both foreign &amp; indigenous): No enquiry shall be made by the bidder(s) during the course of evaluation of the tender till final decision is conveyed to the successful bidder(s). However, the Committee/its authorized representative and office of IIT GUWAHATI can make any enquiry/seek clarification from the bidders. In such a situation, the agency shall extend full co-operation. The bidders can also be asked to arrange demo. of the offered items, in a short period notice, as such the bidders have to be ready for the same.</li>
//                                                 <li className="niq-li">The acceptance of the quotation (Both foreign &amp; indigenous) will rest solely with the Director, IITG, who in the interest of the Institute is not bound to accept the lowest quotation and reserves the right to himself to reject or partially accept any or all the quotations received without assigning any reasons.</li>
//                                                 <li className="niq-li">Force Majeure (Both foreign &amp; indigenous): If the performance of the obligation of either party is rendered commercially impossible by any of the events hereafter mentioned that party shall be under no obligation to perform the agreement under order after giving notice of 15 days from the date of such an event in writing to the other party, and the events referred to are as follows: (I) any law, statute or ordinance, order action or regulations of the Government of India; (II) Any kind of natural disaster; and (III) Strikes, acts of the Public enemy, war, insurrections, riots, lockouts, sabotage.</li>
//                                                 <li className="niq-li">
//                                                     Termination for default (Both foreign &amp; indigenous): Default is said to have occurred:
//                                                     <ul className="niq-ul">
//                                                         <li>If the supplier fails to deliver any or all of the services within the time period(s) specified in the purchase order or any extension thereof granted by IIT.</li>
//                                                         <li>If the supplier fails to perform any other obligation(s) under the contract. If the vendor, in either of the above circumstances, does not take remedial steps within a period of 30 days after receipt of the default notice from IIT (or takes longer period in-spite of what IIT may authorize in writing), IIT may terminate the contract / purchase order in whole or in part and forfeit the EMD/PBG as applicable. In addition to above, IIT may at its discretion also take the following actions: IIT may procure, upon such terms and in such manner, as it deems appropriate, goods similar to the undelivered items/products and the defaulting supplier shall be liable to compensate IIT for any extra expenditure involved towards goods and services obtained.</li>
//                                                     </ul>
//                                                 </li>
//                                                 <li className="niq-li">
//                                                     <strong>Applicable Law (Both foreign &amp; indigenous):</strong>
//                                                     <ol className="niq-ol-alpha">
//                                                         <li>The contract shall be governed by the laws and procedures established by Govt. of India and subject to exclusive jurisdiction of Competent Court and Forum in Guwahati, India only.</li>
//                                                         <li>Any dispute arising out of this purchase shall be referred to the Director IIT Guwahati, and if either of the parties hereto is dissatisfied with the decision, the dispute shall be referred to the decision of an Arbitrator, who should be acceptable to both the parties, to be appointed by the Director of the Institute. The decision of such Arbitrator shall be final and binding on both the parties.</li>
//                                                     </ol>
//                                                 </li>

//                                                 {/* Additional Terms for Imported Goods */}
//                                                 <li className="niq-li" style={{ listStyle: 'none', marginTop: '8px', fontWeight: 'bold' }}>
//                                                     ADDITIONAL TERMS FOR IMPORTED GOODS<br />
//                                                     <span style={{ fontWeight: 'normal' }}>Following terms besides the fore mentioned terms will be applicable in case of foreign purchases:</span>
//                                                 </li>
//                                                 <li className="niq-li">
//                                                     <strong>Rates:</strong> Quoted rates should be in FOR IITG else CIF/CIP Kolkata terms and charges to be stated in the following break-ups:
//                                                     <ol className="niq-ol-alpha">
//                                                         <li>Ex-works value</li>
//                                                         <li>+ Documentation &amp; Handling Charge, if any</li>
//                                                         <li>+ Estimated Overseas Freight to be paid at actual against authentic documents and monetary receipt</li>
//                                                         <li>+ Estimated Overseas Insurance Charge to be paid at actual against authentic documents and monetary receipt (In case the firm holds open insurance policy, the Insurance Certificate relating to the consignment will have to be provided).</li>
//                                                         <li>Total CIP/CIF Kolkata value</li>
//                                                         <li>Estimate up to FOR IITG from Kolkata.</li>
//                                                         <li>Total up to IITG.</li>
//                                                     </ol>
//                                                 </li>
//                                                 <li className="niq-li">After Sales Service: In case of imported stores, foreign manufacturing firms should indicate facilities available for after sales service in India without which their offers are liable to be ignored.</li>
//                                                 <li className="niq-li">
//                                                     Delivery:
//                                                     <ol className="niq-ol-alpha">
//                                                         <li>Delivery of goods at IIT Guwahati will have to be maximum within 95 (ninety-five) days from the date of issue of the Purchase Order.</li>
//                                                         <li>Delivery at Kolkata Airport only: As we do not have clearing agent in any other Airport/Seaport, delivery is to be made only at Kolkata.</li>
//                                                         <li>While transshipment will be allowed, part shipment will not be allowed.</li>
//                                                     </ol>
//                                                 </li>
//                                                 <li className="niq-li">
//                                                     Payment:
//                                                     <ol className="niq-ol-alpha">
//                                                         <li>Above $10,000.00: By an irrevocable letter of Credit at CIF/CIP Kolkata value negotiable through any overseas branch of State Bank of India/Canara Bank with unrestricted provision.</li>
//                                                         <li>
//                                                             Below $10,000.00 by FDD/Wire Transfer as given below:
//                                                             <ol className="niq-ol-roman">
//                                                                 <li>Advance payment Against Bank Guarantee: 90% of the price will be paid in advance against equivalent bank guarantee from a scheduled bank provided by the supplier/Indian Agent. The remaining 10% shall be released only after receipt and acceptance of materials in good condition or after satisfactory installation and commissioning of the equipment. or</li>
//                                                                 <li>Payment Against Proof of Despatch: 90% of the price will be paid against receipt of proof of dispatch such as AWB, Invoice, Packing List, Insurance certificate, etc. The remaining 10% shall be released only after receipt and acceptance of materials in good condition or after satisfactory installation and commissioning of the equipment. or</li>
//                                                                 <li>100% Payment Basis: On request by the supplier/s 100% payment by FDD will be made. In this case on receipt of your Order Acknowledgement an FDD will be established for total ordered value, thereupon, a Xerox copy of the FDD will be sent to you which will enable you to send the materials. On satisfactory receipt and acceptance of the materials or satisfactory installation and commission of the equipment the Original FDD will be sent to you.</li>
//                                                             </ol>
//                                                             Note: Please note FDD/LoC will not be opened unless and until Letter of Acknowledgement in original is received at IIT Guwahati, directly from the principal (Even in case of firms having subsidiary office in India). The Indian agents are therefore advised to submit quotation after consultation with their respective principals.
//                                                         </li>
//                                                     </ol>
//                                                 </li>
//                                                 <li className="niq-li">Customs Duty: The Institute is generally exempted from payment of Customs Duty vide GOI Notification No. 51/96-Customs, dated 23.07.96, with Regn. No. TU/V/RG-CDE (351)/2006, dated 14.09.2006. [CUSTOMS DUTY EXEMPTION CERTIFICATE WILL BE MADE AVAILABLE BY THE INSTITUTE IN REGARD TO QUOTES IN FOREIGN CURRENCY ONLY [NOT AGAINST QUOTES MADE BY A FIRM IN INDIAN CURRENCY, UNLESS THE CONCERNED FIRM IS A FOREIGN HOLDING COMPANY WITH 'FDI' CERTIFICATE ISSUED BY THE MINISTRY OF FINANCE, GOVT. OF INDIA].</li>
//                                                 <li className="niq-li">Agency Commission: The percentage of ex-works value to be paid to Indian agent in equivalent Indian currency as agency commission as applicable will have to be clearly stated in the quotation.</li>
//                                                 <li className="niq-li">After Sales Service: For equipment to be imported the quotation will have to clearly state the available nearest after sales service centre and contact no. in India.</li>
//                                                 <li className="niq-li">Country of Origin: While Country of Origin Certificate will not be insisted, the same however will have to be stated in the Original Invoice for payment through LoC.</li>
//                                                 <li className="niq-li">LoC Amendment: LoC/FDD amendment charges due to mistake on the part of the supplier, if any, will have to be borne by the supplier.</li>

//                                             </ol>

//                                             {/* Freeform Editor for Titles, additional rules, or custom text */}
//                                             <div
//                                                 className="niq-input niq-hide-empty-print"
//                                                 style={{
//                                                     width: '100%',
//                                                     minHeight: '3em',
//                                                     margin: '8px 0',
//                                                     display: 'block',
//                                                     resize: 'none'
//                                                 }}
//                                                 contentEditable
//                                                 suppressContentEditableWarning
//                                                 data-empty={!additionalTerms}
//                                                 data-placeholder="[Add freeform additional rules, titles, or notes here. You can use the formatting toolbar! If left blank, this clause will not appear in print]"
//                                                 onInput={(e) => setAdditionalTerms(e.currentTarget.innerHTML)}
//                                             />

//                                             {/* ═══════════════════════════
//                             SIGNATURE
//                         ═══════════════════════════ */}
//                                             <div style={{ marginTop: '16px' }}>
//                                                 <div><strong>Name:&nbsp;</strong>{indenterName}</div>
//                                                 <div style={{ marginTop: '2px' }}><strong>Designation:&nbsp;</strong>{designation}</div>
//                                                 <div style={{ marginTop: '2px' }}><strong>Department:&nbsp;</strong>{department || 'IIT Guwahati'}</div>
//                                                 <div style={{ marginTop: '2px' }}><strong>Address:&nbsp;</strong>IIT Guwahati, Guwahati-781039, Assam, India</div>
//                                             </div>

//                                         </td>
//                                     </tr>
//                                 </tbody>
//                                 <tfoot>
//                                     <tr>
//                                         <td>
//                                             <div className="footer-space" style={{ height: '14mm' }} />
//                                         </td>
//                                     </tr>
//                                 </tfoot>
//                             </table>
//                         </div>

//                         {/* ── Fixed bottom footer ── */}
//                         <div className="niq-page-footer print:block">
//                             Printed on: {printedAt}
//                         </div>

//                     </div>
//                     )}{/* /A4 */}
//                 </div>{/* /scroll-wrapper */}
//             </main>
//         </div>
//     );
// };

// // ─── Table cell styles ─────────────────────────────────────────────────────────
// const border = '1px solid #000';
// const thStyle: React.CSSProperties = {
//     border,
//     padding: '4px 6px',
//     textAlign: 'left',
//     fontWeight: 'bold',
//     background: '#e5e7eb',
//     whiteSpace: 'nowrap',
// };
// const tdStyle: React.CSSProperties = { border, padding: '3px 6px', verticalAlign: 'top' };
// const tdCenterStyle: React.CSSProperties = { ...tdStyle, textAlign: 'center' };
// const tdRightStyle: React.CSSProperties = { ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' };

// export default NIQPage;



// -=-=-=-=-=-=-


import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
    Printer, X, FileText,
    Loader2, Save, CheckCircle2,
    Bold, Italic, Underline,
    AlignLeft, AlignCenter, AlignJustify,
    Undo, Redo,
} from 'lucide-react';

// ─── Print Styles ─────────────────────────────────────────────────────────────
const printStyles = `
@media print {
    @page { size: A4; margin: 0; }

    table.niq-layout-table { width: 100%; border-collapse: collapse; border: none; }
    table.niq-layout-table > thead > tr > td,
    table.niq-layout-table > tbody > tr > td,
    table.niq-layout-table > tfoot > tr > td { border: none !important; padding: 0 !important; margin: 0 !important; }

    .header-space { height: 12mm; }
    .footer-space { height: 14mm; }

    .niq-page-footer {
        display: block !important;
        position: fixed !important;
        bottom: 8mm !important;
        left: 15mm !important;
        right: 15mm !important;
        font-size: 9px;
        color: #555;
        border-top: 1px solid #ddd;
        padding-top: 4px;
        font-family: "Times New Roman", Times, serif;
    }

    :root {
        --sidebar-width: 0px !important;
        --sidebar-width-mobile: 0px !important;
    }

    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
    }

    .no-print, header, aside, .sidebar, [data-sidebar="sidebar"], [data-sidebar], nav, button {
        display: none !important;
    }

    html, body, #root, .App, main, [data-sidebar-inset], .SidebarProvider, [data-sidebar="inset"], [data-sidebar="wrapper"] {
        background: white !important;
        background-color: white !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        min-height: 0 !important;
        display: block !important;
        inset: 0 !important;
        transform: none !important;
        box-sizing: border-box !important;
        position: static !important;
    }

    * {
        --sidebar-width: 0px !important;
        --sidebar-width-mobile: 0px !important;
        --sidebar-width-icon: 0px !important;
    }

    body > div, #root > div, #root > div > div {
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        background: white !important;
    }

    .bg-zinc-100 { background-color: white !important; }

    .niq-scroll-wrapper {
        max-height: none !important;
        overflow: visible !important;
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 0 !important;
    }

    .niq-toolbar-wrapper { display: none !important; }

    .print-container {
        box-shadow: none !important;
        width: 100% !important;
        min-height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
    }

    .niq-layout-content-wrapper {
        padding: 0 15mm !important;
    }

    .niq-input {
        border: none !important;
        background: transparent !important;
        color: #000 !important;
        font-family: inherit !important;
        font-size: inherit !important;
        box-shadow: none !important;
        padding: 0 !important;
    }
    .niq-input::placeholder { color: transparent !important; }
    .niq-input[contenteditable]:empty::before { content: ""; }

    .niq-hide-empty-print:empty,
    .niq-hide-empty-print[data-empty="true"] { display: none !important; }

    textarea.niq-input {
        border: none !important;
        background: transparent !important;
        color: #000 !important;
        resize: none !important;
        font-family: inherit !important;
        font-size: inherit !important;
        box-shadow: none !important;
        padding: 0 !important;
    }

    table.niq-table { border-collapse: collapse !important; border-spacing: 0 !important; }
    table.niq-table th, table.niq-table td { border: 1pt solid #000 !important; background-clip: padding-box !important; }
    .niq-th { background-color: #e5e7eb !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

    .avoid-break { page-break-inside: avoid; }
    li { page-break-inside: auto; }
}

.niq-input {
    border: none;
    border-bottom: 1px dashed #ef4444;
    outline: none;
    background: #fee2e2;
    padding: 2px 4px;
    font-family: inherit;
    font-size: inherit;
    color: #991b1b;
    min-width: 40px;
    border-radius: 2px;
}
.niq-input::placeholder { color: #f87171; opacity: 1; }
.niq-input[contenteditable]:empty::before { content: attr(data-placeholder); color: #f87171; opacity: 1; cursor: text; pointer-events: none; }
.niq-input:focus { border-bottom: 1px solid #dc2626; background: #fecdd3; color: #7f1d1d; }

.niq-field-editable {
    display: inline;
    border-bottom: 1px solid #bbb;
    outline: none;
    background: transparent;
    padding: 0 2px;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    min-width: 40px;
    cursor: text;
}
.niq-field-editable:focus { border-bottom-color: #555; background: rgba(0,0,0,0.03); }
.niq-ol { list-style-type: decimal; padding-left: 20px; margin: 4px 0 6px; }
.niq-ol-alpha { list-style-type: lower-alpha; padding-left: 18px; margin: 3px 0; }
.niq-ol-roman { list-style-type: lower-roman; padding-left: 18px; margin: 3px 0; }
.niq-ul { list-style-type: disc; padding-left: 18px; margin: 3px 0; }
.niq-li { margin-bottom: 5px; text-align: justify; line-height: 1.5; font-size: 12px; }
.niq-center-header { display: block; text-align: center; font-weight: bold; text-decoration: underline; font-size: 13px; margin: 18px 0 10px; }
@media print { .niq-field-editable { border: none !important; background: transparent !important; } }
.niq-page-footer { display: none; }

/* ── Annexure pages ── */
.niq-annexure-page {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    line-height: 1.4;
    padding: 20mm;
    box-sizing: border-box;
    page-break-before: always;
    break-before: page;
}
.niq-annexure-page table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
.niq-annexure-page th, .niq-annexure-page td { border: 1px solid #000; padding: 5px 8px; font-size: 10.5pt; line-height: 1.3; vertical-align: top; }
.niq-annexure-page th { font-weight: bold; background: #e5e7eb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.niq-annexure-page [contenteditable]:focus { outline: none; background: rgba(59,130,246,0.05); }
.ann-input { border: none; border-bottom: 1px solid #000; outline: none; background: transparent; font-family: inherit; font-size: inherit; display: inline-block; min-width: 200px; }
.ann-title { text-align: center; margin-bottom: 24px; }
.ann-title h2 { font-weight: bold; font-size: 14pt; text-decoration: underline; text-transform: uppercase; margin: 0 0 4px; }
.ann-title h3 { font-weight: bold; font-size: 12pt; text-decoration: underline; text-transform: uppercase; margin: 0; }
.ann-header { display: flex; flex-direction: column; align-items: flex-end; margin-bottom: 20px; }
@media screen {
    .niq-annexure-page { background: white; box-shadow: 0 0 10px rgba(0,0,0,0.15); margin: 24px auto; width: 210mm; min-height: 297mm; }
}
@media print {
    .niq-annexure-page { padding: 15mm !important; margin: 0 !important; box-shadow: none !important; width: 100% !important; min-height: 0 !important; }
    .no-print { display: none !important; }
}
`;

// ─── Editable inline span ─────────────────────────────────────────────────────
const E = ({ value, className = '' }: { value: string; className?: string }) => (
    <span
        contentEditable
        suppressContentEditableWarning
        className={`niq-field-editable ${className}`}
        dangerouslySetInnerHTML={{ __html: value }}
    />
);

// ─── Plain input ──────────────────────────────────────────────────────────────
// contentEditable on the span itself so clicks reliably place the caret inside
// the placeholder area (an empty inline child of a contentEditable parent does
// not accept caret placement reliably across browsers).
const F = ({ id, defaultValue = '', placeholder = '______', style }: {
    id: string; defaultValue?: string; placeholder?: string; style?: React.CSSProperties;
}) => (
    <span
        id={id}
        className="niq-input"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: defaultValue }}
        style={{ display: 'inline-block', minWidth: '30px', ...style }}
    />
);

// ─── Toolbar ──────────────────────────────────────────────────────────────────
const Toolbar = ({ onClose, onSave, isSaving }: { onClose: () => void; onSave: () => void; isSaving: boolean }) => (
    <div className="sticky top-4 self-start flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg no-print z-10 h-fit">
        <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-700">
            <button
                onClick={onSave}
                disabled={isSaving}
                title="Save NIQ"
                className="p-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center"
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            </button>
            <button onClick={onClose} title="Close" className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-700">
            <button onClick={() => document.execCommand('bold')} title="Bold" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Bold className="w-4 h-4" /></button>
            <button onClick={() => document.execCommand('italic')} title="Italic" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Italic className="w-4 h-4" /></button>
            <button onClick={() => document.execCommand('underline')} title="Underline" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Underline className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-700">
            <button onClick={() => document.execCommand('justifyLeft')} title="Align Left" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><AlignLeft className="w-4 h-4" /></button>
            <button onClick={() => document.execCommand('justifyCenter')} title="Align Center" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><AlignCenter className="w-4 h-4" /></button>
            <button onClick={() => document.execCommand('justifyFull')} title="Justify" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><AlignJustify className="w-4 h-4" /></button>
        </div>
        <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-700">
            <button onClick={() => document.execCommand('undo')} title="Undo" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Undo className="w-4 h-4" /></button>
            <button onClick={() => document.execCommand('redo')} title="Redo" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Redo className="w-4 h-4" /></button>
        </div>
        <div className="pt-2 flex flex-col items-center gap-1">
            <FileText className="w-4 h-4 text-zinc-400" />
            <span className="text-[10px] text-zinc-400 font-medium text-center leading-tight">NIQ</span>
        </div>
    </div>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface IGFItem {
    igf_item_name?: string;
    igf_item_description?: string;
    igf_justification?: string;
    igf_quantity?: number | string;
    igf_estimated_rate?: number | string;
    igf_estimated_amount?: number | string;
}
interface CommitteeMember { igf_webmail_id?: string; igf_member_name?: string; igf_designation?: string; }
interface IGFData {
    name: string;
    igf_indenter?: string; igf_indenter_designation?: string;
    igf_department_centre_section?: string; igf_project_code?: string; igf_project_title?: string;
    igf_webmail_id?: string; igf_webmail_user_id?: string;
    igf_items?: IGFItem[]; igf_committee_members?: CommitteeMember[];
    igf_total_estimate?: number | string; igf_tender_type?: string; igf_number_of_bids?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number | string | undefined) =>
    n !== undefined && n !== '' ? `\u20b9${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '\u2014';

const normalizeEmail = (raw?: string | null) => {
    if (!raw) return null;
    return raw.includes('@') ? raw : `${raw}@iitg.ac.in`;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const NIQPage: React.FC = () => {
    const navigate = useNavigate();
    const { id, igfId } = useParams<{ id?: string; igfId?: string }>();
    const location = useLocation();

    const [igf, setIgf] = useState<IGFData | null>(null);
    const [deptLabel, setDeptLabel] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [existingNiqHtml, setExistingNiqHtml] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const docId = id ?? igfId ?? (location.state as any)?.application?.id ?? '';

    const handleSave = async () => {
        if (!printRef.current) return;
        setIsSaving(true);
        try {
            const clone = printRef.current.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.no-print').forEach(el => el.remove());
            const niqHtml = clone.outerHTML;
            const body = new FormData();
            body.append('project_no', igf?.igf_project_code ?? '');
            body.append('direct_purchase_ref', igf?.name ?? docId);
            body.append('niq_data', niqHtml);
            const res = await fetch(
                '/api/method/rndopsapp.rndopsapp.doctype.niq.niq.save_niq_data',
                { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' }, body }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setExistingNiqHtml(niqHtml);
            setShowSuccessModal(true);
        } catch (e: any) {
            alert(`Failed to save NIQ: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (!docId) { setLoading(false); return; }
        const fetchIGF = async () => {
            try {
                // Check if a NIQ has already been saved for this direct_purchase_ref
                const niqCheck = await fetch(
                    `/api/resource/Niq?filters=${encodeURIComponent(JSON.stringify([["direct_purchase_ref", "=", docId]]))}&fields=${encodeURIComponent(JSON.stringify(["niq_data", "name"]))}`,
                    { headers: { Accept: 'application/json' }, credentials: 'include' }
                );
                if (niqCheck.ok) {
                    const niqJson = await niqCheck.json();
                    const niqDoc = niqJson?.data?.[0];
                    if (niqDoc?.niq_data) {
                        setExistingNiqHtml(niqDoc.niq_data);
                        setLoading(false);
                        return;
                    }
                }

                const res = await fetch(`/api/resource/Indent%20General%20Form/${encodeURIComponent(docId)}`,
                    { headers: { Accept: 'application/json' }, credentials: 'include' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const data: IGFData = json.data;
                setIgf(data);

                const deptId = data.igf_department_centre_section;
                if (deptId) {
                    try {
                        const dRes = await fetch(
                            `/api/method/frappe.client.get_value?doctype=Department_prornd&filters=${encodeURIComponent(deptId)}&fieldname=dept_name`,
                            { headers: { Accept: 'application/json' }, credentials: 'include' });
                        setDeptLabel((dRes.ok ? (await dRes.json())?.message?.dept_name : null) || deptId);
                    } catch { setDeptLabel(deptId); }
                }

                const piMember = data.igf_committee_members?.find(m => m.igf_designation === 'PI');
                const emailToFetch = normalizeEmail(data.igf_webmail_id) || normalizeEmail(data.igf_webmail_user_id) || normalizeEmail(piMember?.igf_webmail_id);
                if (emailToFetch) {
                    try {
                        const uRes = await fetch('/api/method/rndopsapp.rndopsapp.api.get_user_details', {
                            method: 'POST',
                            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ user_email: emailToFetch }),
                        });
                        if (uRes.ok) {
                            const uJson = await uRes.json();
                            if (uJson.message) {
                                if (uJson.message.full_name) data.igf_indenter = uJson.message.full_name;
                                if (uJson.message.designation_name) data.igf_indenter_designation = uJson.message.designation_name;
                                setIgf({ ...data });
                            }
                        }
                    } catch (e) {  }
                }

                if (!data.igf_indenter && piMember?.igf_member_name) {
                    data.igf_indenter = piMember.igf_member_name;
                    setIgf({ ...data });
                }
            } catch (e: any) {
                setError(e.message ?? 'Failed to load form data');
            } finally {
                setLoading(false);
            }
        };
        fetchIGF();
    }, [docId]);

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const printedAt = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    const indenterName = igf?.igf_indenter || '';
    const designation = igf?.igf_indenter_designation || 'Principal Investigator';
    const department = deptLabel || igf?.igf_department_centre_section || '';
    const projectCode = igf?.igf_project_code || docId || '';
    const projectTitle = igf?.igf_project_title ?? '';
    const items: IGFItem[] = igf?.igf_items ?? [];
    const committee: CommitteeMember[] = igf?.igf_committee_members ?? [];
    const totalQty = items.reduce((s, r) => s + (Number(r.igf_quantity) || 0), 0);
    const totalAmt = Number(igf?.igf_total_estimate ?? 0);

    const itemSummary = items.length > 0
        ? items.length === 1 ? items[0].igf_item_name ?? ''
            : `${items[0].igf_item_name ?? ''} and ${items.length - 1} other item${items.length > 2 ? 's' : ''}`
        : '';

    const parseNIQNo = (code: string): string => {
        if (!code) return '';
        const m = code.match(/^\d{2}[A-Z][a-z]([A-Z]{2,4})[A-Z]{2}(\d{4})([A-Z]{2,4})(\d{4})$/);
        if (m) { const [, dept, num, pi, serial] = m; return `${dept}/${pi}/${num}/${serial}`; }
        return code;
    };
    const defaultNIQNo = parseNIQNo(projectCode);

    // ─── Add row helper for Annexure tables (pure DOM, no state) ────────────────
    const handleAddRow = (tbodyId: string) => {
        const tbody = document.getElementById(tbodyId) as HTMLTableSectionElement | null;
        if (!tbody) return;

        // Separate item rows (data-item-row) from summary/other rows
        const itemRows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr[data-item-row="true"]'));
        const allRows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr'));

        // Template: last item row if marked, otherwise last row
        const templateRow = itemRows.length > 0 ? itemRows[itemRows.length - 1] : allRows[allRows.length - 1] as HTMLTableRowElement | null;
        if (!templateRow) return;

        const newRow = templateRow.cloneNode(true) as HTMLTableRowElement;
        newRow.dataset.itemRow = 'true';
        newRow.querySelectorAll('[contenteditable="true"]').forEach(cell => {
            (cell as HTMLElement).innerHTML = '\u00a0';
        });
        // Update S.N. cell (first cell, pure digit content)
        const firstCell = newRow.cells[0];
        if (firstCell && /^\s*\d+\s*$/.test(firstCell.textContent || '')) {
            firstCell.textContent = String(itemRows.length + 1).padStart(2, '0');
        }

        // Insert after the last item row (before first non-item row), or append
        const firstNonItemRow = allRows.find(r => r.dataset.itemRow !== 'true');
        if (firstNonItemRow) {
            tbody.insertBefore(newRow, firstNonItemRow);
        } else {
            tbody.appendChild(newRow);
        }
    };

    // ─── Remove last row helper ─────────────────────────────────
    const handleRemoveRow = (tbodyId: string) => {
        const tbody = document.getElementById(tbodyId) as HTMLTableSectionElement | null;
        if (!tbody) return;
        // For tables with data-item-row, remove last item row (keep at least 1)
        const itemRows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr[data-item-row="true"]'));
        if (itemRows.length > 0) {
            if (itemRows.length > 1) itemRows[itemRows.length - 1].remove();
            return;
        }
        // Fallback: remove last row, keep at least 1
        const allRows = tbody.querySelectorAll('tr');
        if (allRows.length > 1) allRows[allRows.length - 1].remove();
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#D97757]" />
                <p className="text-sm">Loading NIQ data\u2026</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
            <div className="text-center">
                <p className="text-red-500 font-medium">{error}</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-sm text-zinc-500 underline">Go back</button>
            </div>
        </div>
    );

    return (
        <div className="bg-zinc-100 dark:bg-zinc-950 min-h-screen">
            <style>{printStyles}</style>

            {/* ── Success Modal ── */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-sm mx-4">
                        <div className="flex items-center gap-3 mb-1">
                            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">NIQ Saved Successfully</h3>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">What would you like to do next?</p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => { window.print(); setShowSuccessModal(false); }}
                                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-[#D97757] text-white hover:bg-[#c66a4e] transition-colors shadow-sm"
                            >
                                <Printer className="w-4 h-4" /> Print NIQ
                            </button>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="p-4 md:p-8 w-full">
                <div className="niq-scroll-wrapper flex justify-center items-start gap-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <div className="niq-toolbar-wrapper sticky top-4">
                        <Toolbar onClose={() => navigate(-1)} onSave={handleSave} isSaving={isSaving} />
                    </div>
                    {existingNiqHtml ? (
                        <div
                            ref={printRef}
                            className="print-container bg-white text-black shadow-2xl relative"
                            dangerouslySetInnerHTML={{ __html: existingNiqHtml }}
                        />
                    ) : (
                    <div className="print-container bg-white text-black shadow-2xl relative"
                        ref={printRef}
                        style={{ width: '210mm', minHeight: '297mm', padding: '0', fontFamily: '"Times New Roman", Times, serif', fontSize: '11.5px', lineHeight: '1.45' }}>
                        <div className="niq-layout-content-wrapper" style={{ padding: '0 15mm' }}>
                            <table className="niq-layout-table">
                                <thead><tr><td><div className="header-space" style={{ height: '12mm' }} /></td></tr></thead>
                                <tbody>
                                    <tr><td>
                                        {/* HEADER */}
                                        <table className="avoid-break" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', marginTop: '6mm' }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ width: '65%', verticalAlign: 'top', padding: '6px 10px 10px 0', borderBottom: '2px solid black' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                            <img src={`http://${import.meta.env.VITE_APP_BACKEND_HOST || '172.16.131.206'}:${import.meta.env.VITE_APP_BACKEND_PORT || '8000'}/files/IITG_logo.png`} alt="IITG"
                                                                style={{ width: '55px', height: 'auto', flexShrink: 0 }}
                                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                            <div>
                                                                <strong style={{ display: 'block', fontSize: '12.5px' }}>Research and Development Section</strong>
                                                                <strong style={{ display: 'block', fontSize: '11.5px', marginTop: '3px' }}>Indian Institute of Technology Guwahati<br />Guwahati-781039, Assam, India</strong>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ width: '35%', verticalAlign: 'top', padding: '6px 0 10px 10px', borderLeft: '1px solid #ccc', borderBottom: '2px solid black' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                                            <tbody>
                                                                <tr><td style={{ fontWeight: 'bold', whiteSpace: 'nowrap', paddingRight: '4px', width: '68px' }}>Phone Nos.</td><td style={{ whiteSpace: 'nowrap', width: '8px' }}>:</td><td>+91-361-258-<E value="2134" /></td></tr>
                                                                <tr><td></td><td style={{ whiteSpace: 'nowrap' }}>:</td><td>+91-361-258-<E value="2135" /></td></tr>
                                                                <tr><td style={{ fontWeight: 'bold' }}>Fax</td><td>:</td><td>+91-361-258-<E value="2089" /></td></tr>
                                                                <tr><td style={{ fontWeight: 'bold' }}>Email</td><td>:</td><td>{normalizeEmail(igf?.igf_webmail_id) || normalizeEmail(igf?.igf_webmail_user_id) || 'iiisi@iitg.ac.in'}</td></tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        {/* Indenter details */}
                                        <div style={{ paddingRight: '10px', marginTop: '10px' }}>
                                            <strong style={{ fontSize: '12.5px' }}>{indenterName}</strong>
                                            {designation && <span style={{ display: 'block', marginTop: '3px' }}>{designation}</span>}
                                            {department && <span style={{ display: 'block', marginTop: '3px' }}>{department}</span>}
                                        </div>

                                        {/* Vendor Details and Date/NIQ Row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '20px', marginBottom: '35px' }}>
                                            {/* Vendor Details (Editable) */}
                                            <div style={{ paddingRight: '10px', width: '55%' }}>
                                                <strong style={{ fontSize: '12.5px' }}>To,</strong>
                                                <div
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onPaste={(e) => {
                                                        e.preventDefault();
                                                        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
                                                    }}
                                                    className="niq-field-editable"
                                                    style={{ display: 'block', minHeight: '80px', marginTop: '8px', whiteSpace: 'pre-wrap', padding: '5px', border: '1px dashed #ef4444', background: '#fee2e2', borderRadius: '4px', fontSize: '11.5px', lineHeight: '1.5' }}
                                                    data-placeholder="1. Vendor Name&#10;Address Line 1&#10;Ph: +91-XXXXXXXXXX&#10;Email: vendor@example.com"
                                                ></div>
                                            </div>

                                            {/* Date and NIQ No – aligned right */}
                                            <div style={{ width: '40%', paddingLeft: '10px', marginTop: '5px' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                                    <tbody>
                                                        <tr><td style={{ fontWeight: 'bold', whiteSpace: 'nowrap', paddingRight: '4px', width: '68px' }}>Date</td><td style={{ whiteSpace: 'nowrap', width: '8px' }}>:</td><td><strong>{today}</strong></td></tr>
                                                        <tr><td style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>NIQ No.</td><td>:</td><td style={{ wordBreak: 'break-all' }}>{defaultNIQNo}</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* NIQ TITLE + SUBMISSION NOTE + T&C – fully editable */}
                                        <div contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>

                                            {/* NIQ TITLE */}
                                            <p style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '12px', marginTop: '20px', marginBottom: '14px', lineHeight: '1.6' }}
                                               dangerouslySetInnerHTML={{ __html: `NOTICE INVITING QUOTATION FOR SUPPLY &amp; INSTALLATION OF ${itemSummary || '[Item Name]'} FOR THE DEPARTMENT OF ${department || '[Department]'} (PROJECT NO. ${projectCode}), IIT GUWAHATI.` }}
                                            />

                                            {/* Submission note */}

                                            <div style={{ fontSize: '12px', marginTop: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                                                <p style={{ marginBottom: '10px' }}>Dear Sir/Madam,</p>
                                                <p style={{ marginBottom: '10px', textAlign: 'justify' }}
                                                   dangerouslySetInnerHTML={{ __html: `The Indian Institute of Technology Guwahati (IIT Guwahati) invites quotations for the supply and installation of <strong>${itemSummary || '[Item Name]'}</strong>, as per the specifications provided in <strong>ANNEXURE-I</strong>. The quotation should be submitted in a <strong>${igf?.igf_number_of_bids?.startsWith('Double') ? 'DOUBLE-BID' : 'SINGLE-BID'}</strong> format, in a <strong>SEALED ENVELOPE</strong>, to the undersigned on or before <span id="lastDate" class="niq-input" contenteditable="true" data-placeholder="[Date]" style="display:inline-block;min-width:30px"></span>.` }}
                                                />
                                                <p style={{ textAlign: 'justify' }}>
                                                    The envelope must clearly indicate the NIQ reference number, failing which the quotation shall not be considered for further evaluation.
                                                </p>
                                            </div>

                                            {/* ═══════════════════════════
                            TERMS &amp; CONDITIONS
                        ═══════════════════════════ */}
                                            <p style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '2px' }}>TERMS &amp; CONDITIONS:</p>
                                            <p className="niq-li" style={{ marginBottom: '5px' }}>
                                                (Please note the term &#x27;both foreign &amp; indigenous&#x27; wherever mentioned means the term is applicable to both foreign &amp; indigenous purchase)
                                            </p>
                                            <ol className="niq-ol" style={{ listStyleType: 'decimal-leading-zero' }}>
                                                <li className="niq-li"><strong>Rates:</strong> Rates quoted for indigenous items should be on FOR IIT Guwahati, on DOOR DELIVERY basis, with break-ups as per details indicated in the bid format at Annexure II. Vague terms like “packing, forwarding, transportation etc. extra” without mentioning the specific amount will not be accepted. In case of a mismatch, the rates written in words will prevail.</li>

                                                <li className="niq-li">
                                                    <strong>Important date, time and place:</strong>
                                                    <ol className="niq-ol-alpha">
                                                        <li>Last date &amp; time of submission: <F id="lastDateSub" placeholder="[Date/Day]" />, <F id="lastTimeSub" placeholder="[Time]" /> am/pm.</li>
                                                        <li>Date &amp; time of opening: <F id="openDate" placeholder="[Date/Day]" />, <F id="openTime" placeholder="[Time]" /> am/pm.</li>
                                                        <li>Place of opening quotations: Department/ Centre of <E value={department || '[Dept]'} />.</li>
                                                        <li>Late and delayed tender: Late and delayed tender will not be accepted.</li>
                                                        <li>Unscheduled Holiday: In case any unscheduled holiday occurs on the prescribed closing/opening date the next working day shall be the prescribed date of closing/opening.</li>
                                                    </ol>
                                                </li>

                                                <li className="niq-li"><strong>Validity of Quotation:</strong> Quoted rates must be valid for 120 days from the last date of submission of quotation.</li>

                                                <li className="niq-li"><strong>Warranty:</strong> The quoted item, in case of equipment and components, must be warranted 01 (One) year from the date of successful installation and commissioning of the items.</li>

                                                <li className="niq-li"><strong>Literature a must:</strong> In case of equipment printed technical leaflet/literature must be submitted. The model and specifications quoted should invariably be highlighted in the leaflet/literature for easy reference.</li>

                                                <li className="niq-li">
                                                    Any query related to Technical Specifications, Terms &amp; Conditions and request for extension for last date of submission of bids must be made in writing before 7 working days of the last date of submission of bids.<br />
                                                    In all communication to and from IIT Guwahati, the following email IDs are to be put in loop mandatorily.
                                                    <ol className="niq-ol-alpha">
                                                        <li><E value="" /></li>
                                                        <li><E value="" /></li>
                                                        <li><E value="" /></li>
                                                        <li><E value="" /></li>
                                                    </ol>
                                                </li>

                                                <li className="niq-li">
                                                    <strong>Dealership Certificate:</strong> Dealers or Agents quoting on behalf of Manufacturer must enclose valid dealership certificate.
                                                    <ol className="niq-ol-alpha">
                                                        <li><strong>Authorized Dealer of OEM:</strong> In the case of an Authorized Dealer, documentary evidence in the form of an Authorization Certificate from its OEM for the supply, installation, and warranty support must be furnished compulsorily along with the bid.</li>
                                                        <li><strong>Original Equipment Manufacturer (OEM):</strong> In case of direct participation from the OEM, a factory license of OEM Needs to be furnished.</li>
                                                    </ol>
                                                </li>

                                                <li className="niq-li">
                                                    <strong>Quality Certificate:</strong> Valid certificate to prove that the products are genuine and of International standard, as mentioned below must be enclosed:
                                                    <ol className="niq-ol-alpha">
                                                        <li>Manufacturer’s certificate, and</li>
                                                        <li>ISO certificate of the quoted item from the Manufacturer, or</li>
                                                        <li>ISI certificate of the quoted item/manufacturer.</li>
                                                    </ol>
                                                </li>

                                                <li className="niq-li">
                                                    <strong>Other Important Documents:</strong>
                                                    <ol className="niq-ol-roman">
                                                        <li>Bidder’s detail and its Service Centre detail as per Annexure-III</li>
                                                        <li>Compliance Certificate as per Annexure-IV</li>
                                                        <li>Character certificate (Undertaking that currently the vendor is not blacklisted by any govt. organization/institution)</li>
                                                        <li>GST Registration Certificate</li>
                                                        <li>PAN Detail and TIN number</li>
                                                        <li>Registration Certificate</li>
                                                        <li>Banker’s Detail</li>
                                                        <li>List of reputed organizations/institutions, particularly to IIT/Institutes and other Government Organization where similar orders have been executed, if any (copy (s) of the Purchase Orders and Installation certificates will have to be submitted).</li>
                                                        <li>HSN/SAC Number, ISO/ISI Certificate, and Proof of Certification as per specification.</li>
                                                    </ol>
                                                </li>

                                                <li className="niq-li">
                                                    <strong>Registration Certificate:</strong>
                                                    <table className="niq-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '6px', marginBottom: '6px' }}>
                                                        <tbody>
                                                            <tr>
                                                                <td style={{ ...tdStyle, fontWeight: 'bold', width: '35%' }}>(i) Proprietorship</td>
                                                                <td style={tdStyle}>Self-declaration by the bidder should be furnished</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ ...tdStyle, fontWeight: 'bold' }}>(ii) Partnership Firm</td>
                                                                <td style={tdStyle}>In case of Partnership Firm, the bidder should furnish Firm Registration Certificate issued by the Registrar of Firms or a Registered Partnership Deed duly stamped and notarized by a Notary public.</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ ...tdStyle, fontWeight: 'bold' }}>(iii) Limited Liability Partnership</td>
                                                                <td style={tdStyle}>In case of LLP, the bidder should furnish LLP Registration issued by the Registrar of Companies.</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ ...tdStyle, fontWeight: 'bold' }}>(iv) Limited Company (Public/ Private)</td>
                                                                <td style={tdStyle}>In case of Limited Company, bidder should furnish the Company Incorporation Certificate issued by the Registrar of Companies.</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </li>

                                                <li className="niq-li"><strong>Award:</strong> The Final Award will be given to the vendor, selected by the Purchase Committee on the lowest quote basis.</li>

                                                <li className="niq-li">
                                                    <strong>Delivery:</strong>
                                                    <ol className="niq-ol-alpha">
                                                        <li><strong>Time Limit:</strong> Maximum within 45 (forty-five) days preferably from the date of issue of purchase order. Request for any extension will not be entertained except on genuine grounds only, subject to the approval of the Competent Authority.</li>
                                                        <li><strong>Safe Delivery:</strong> All aspects of safe delivery shall be the exclusive responsibility of the vendor. At the destination site, the package will be opened only in the presence of IIT user/representative and vendor's representative. The intact condition of the package and the seal/indicators for not being tempered with shall form the basis for certifying the receipt in good condition.</li>
                                                        <li><strong>Insurance:</strong> The supplier is to establish ‘All Risk Transit Insurance’ coverage till door delivery at IIT Guwahati.</li>
                                                        <li><strong>Part Delivery:</strong> Part delivery is not allowed. Institute reserves the right to invoke penalty.</li>
                                                        <li>
                                                            <strong>Penalty for Delayed Delivery:</strong> The date of delivery shall be strictly adhered to, except in cases of Force Majeure or extension of the delivery date duly approved by IIT Guwahati. In the event of delayed delivery and acceptance by the end user, the vendor shall be liable for a penalty deduction at the rate of 0.5% per week or part thereof of the value of the entire consignment, subject to a maximum of 10% (ten percent).<br />
                                                            For the purpose of this clause, part of a week shall be treated as a full week. In case of delayed delivery, IIT Guwahati reserves the right not to accept the consignment.
                                                        </li>
                                                    </ol>
                                                </li>

                                                <li className="niq-li">
                                                    <strong>After Sales Service and vendor details:</strong>
                                                    <ol className="niq-ol-alpha">
                                                        <li>Vendors should clearly state the available after sales service Centre and detailed address in India, nearest to Guwahati city/NE/EI/ROI, without which their offers shall be liable for rejection.</li>
                                                        <li>Vendors details must be provided as per format at ANNEXURE-III.</li>
                                                    </ol>
                                                </li>

                                                <li className="niq-li"><strong>Genuine Pricing:</strong> Vendor is to ensure that quoted price is not more than the price offered to any other customer in India to whom this particular item has been sold, particularly to IIT/Institutes and other Government Organization.</li>

                                                <li className="niq-li"><strong>Conditional tenders not acceptable:</strong> All the terms and conditions mentioned herein must be strictly adhered to by all the vendors. Conditional tenders shall not be accepted on any ground and shall be rejected straightway. Printed conditions mentioned in the tender bids submitted by vendors will not be binding on IITG.</li>

                                                <li className="niq-li"><strong>E-Waybill:</strong> E-Way bill as applicable will be provided against request and receipt of necessary information such as Invoice and Transporter details.</li>

                                                <li className="niq-li">
                                                    <strong>GST:</strong>
                                                    <ol className="niq-ol-alpha">
                                                        <li>Up-to-date Tax clearance certificate, GST Registration Certificate indicating also the GSTIN number of the firm must be clearly mentioned in the quotation,</li>
                                                        <li>GST Deduction at source as per Order/ notification of the Govt. of India will be applicable,</li>
                                                        <li>GST No of IIT Guwahati is 18AAAJI0130P1Z8,</li>
                                                        <li>HSN / SAC No of the items must be clearly mentioned in the quotation along with GST No.</li>
                                                    </ol>
                                                </li>

                                                <li className="niq-li">
                                                    <strong>Payment:</strong>
                                                    <ol className="niq-ol-alpha">
                                                        <li>The institute shall strive to settle the payments within 45 days from the date of successful delivery, installation and commissioning/ acceptance of goods at IIT Guwahati, generally through RTGS / NEFT.</li>
                                                        <li>100% payment will be made against successful delivery and installation of the ordered items at IIT Guwahati<br />Or</li>
                                                        <li>90% Payment against successful delivery of the ordered items and balance 10% payment after successful installation and commissioning of the ordered items at IIT Guwahati</li>
                                                        <li>No advance payment is allowed for indigenous purchase as per the Institute’s norms.</li>
                                                    </ol>
                                                </li>

                                                <li className="niq-li"><strong>Bid Security Declaration:</strong> A bidder is to submit self-attested declaration as per the format available at ANNEXURE-V.</li>

                                                <li className="niq-li">
                                                    <strong>Performance Bank Guarantee:</strong><br />
                                                    The successful bidder, upon placement of the Purchase Order (PO), shall furnish an unconditional Performance Bank Guarantee (PBG) in the form of a Fixed Deposit or Bank Guarantee (including e-Bank Guarantee) as per the format enclosed at ANNEXURE–VI issued by any Commercial Bank of India, as per the prescribed slab indicated below. In case of foreign procurement, submission of the PBG by the local agent shall be mandatory. Where the PBG is issued by a foreign bank, the same shall be duly endorsed by its corresponding bank in India.<br /><br />
                                                    The validity of the PBG shall cover the entire warranty period plus an additional period of two (02) months from the date of installation/commissioning of the equipment.<br /><br />
                                                    In the event of failure to submit the PBG within the stipulated timeframe, IIT Guwahati reserves the right to withhold or deduct an amount equivalent to the PBG value from the payment due to the supplier, without requiring further consent. Such amount shall be retained until submission of the requisite PBG.
                                                    <br /><br />
                                                    <table className="niq-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginBottom: '8px' }}>
                                                        <thead>
                                                            <tr>
                                                                <th className="niq-th" style={thStyle}>Slab</th>
                                                                <th className="niq-th" style={thStyle}>PO/ Contract Value</th>
                                                                <th className="niq-th" style={thStyle}>PBG Rate</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                <td style={tdCenterStyle}>1.</td>
                                                                <td style={tdStyle}>₹ 5,00,000/- to ₹ 15,00,000/-</td>
                                                                <td style={tdCenterStyle}>3%</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={tdCenterStyle}>2.</td>
                                                                <td style={tdStyle}>₹ 15,00,000/- to ₹ 25,00,000/-</td>
                                                                <td style={tdCenterStyle}>4%</td>
                                                            </tr>
                                                            <tr>
                                                                <td style={tdCenterStyle}>3.</td>
                                                                <td style={tdStyle}>Above ₹ 25,00,000/-</td>
                                                                <td style={tdCenterStyle}>5%</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    <ol className="niq-ol-roman">
                                                        <li>By submitting the PBG, the vendor is understood to have guaranteed that,
                                                            <ol className="niq-ol-alpha">
                                                                <li>The Purchase Order (PO) shall be executed as per the terms and conditions mentioned therein.</li>
                                                                <li>The equipment shall function satisfactorily for a period up to 60 days after the warranty period.</li>
                                                                <li>The equipment and components are free from poor workmanship, bad quality, and faulty designs.</li>
                                                                <li>The vendor shall at his/their own cost rectify/replace the defects, if any, during the guarantee period.</li>
                                                                <li>The guarantee is to the extent as per the slabs mentioned in the pre-page.</li>
                                                            </ol>
                                                        </li>
                                                        <li><strong>Condition for invoking PBG:</strong> In case of failure to comply with the guarantees above, IITG may terminate the contract/purchase order in whole or in part and forfeit the PBG. In addition, IITG may, at its discretion, procure upon such terms and in such manner as it deems appropriate, goods similar to the undelivered items/products, and the defaulting supplier/vendor shall be liable to compensate IITG for any extra expenditure involved.</li>
                                                    </ol>
                                                </li>

                                                <li className="niq-li"><strong>Enquiry during the course of evaluation not allowed:</strong> No enquiry shall be made by the bidder(s) during the course of evaluation of the tender till final decision is conveyed to the successful bidder(s). However, the Purchase Committee or its authorized representative (IIT Guwahati) can make any enquiry/seek clarification from the bidders. In such a situation, the agency shall extend full co-operation. The bidders may also be asked to arrange demonstration of the offered items, in a short period notice, as such the bidders have to be ready for the same.</li>

                                                <li className="niq-li"><strong>Acceptance of quotations:</strong> The acceptance of the quotation will rest solely with the Director, IITG, who in the interest of the Institute is not bound to accept the lowest quotation and reserves the right to himself to reject or partially accept any or all the quotations received without assigning any reasons.</li>

                                                <li className="niq-li"><strong>Pre-Installation:</strong> Bidder is to ensure the pre-installation requirements for the equipment like ambient temperature, civil work, weather conditions, power specifications, logistics, manpower etc.</li>

                                                <li className="niq-li"><strong>Installation:</strong> Bidder shall be responsible for installation/demonstration wherever applicable and after-sales service during the warranty period and thereafter as mentioned in the contract.</li>

                                                <li className="niq-li"><strong>Demo (if applicable):</strong> The supplier has to ensure free of cost demo to the end user after successful installation.</li>

                                                <li className="niq-li">
                                                    <strong>Force Majeure:</strong><br />
                                                    If the performance of the obligation of either party is rendered commercially impossible by any of the events hereafter mentioned that party shall be under no obligation to perform the agreement under order after giving notice of 15 days from the date of such an event in writing to the other party, and the events referred to are as follows:
                                                    <ol className="niq-ol-roman">
                                                        <li>Any law, statute or ordinance, order action or regulations of the Government of India,</li>
                                                        <li>Any kind of natural disaster, and</li>
                                                        <li>Strikes acts of the Public enemy, war, insurrections, riots, lockouts, sabotage.</li>
                                                    </ol>
                                                </li>

                                                <li className="niq-li"><strong>Furnishing Fraudulent Information/Document:</strong> If it is found that a bidder has furnished fraudulent document/information, the bid security/performance security (wherever applicable) will be forfeited and the bidder/vendor will be debarred for a period of not less than 3 (three) years from the date of detection of such fraudulent activity, besides the legal action. In case of major and serious fraud, the period of debarment may be extended.</li>

                                                <li className="niq-li">
                                                    <strong>Termination for default:</strong> Default is said to have occurred
                                                    <ol className="niq-ol-alpha">
                                                        <li>If the equipment or any of its component is found having poor workmanship, faulty designs, poor performance and bad quality of materials used.</li>
                                                        <li>If the supplier fails to deliver any or all of the services within the time period(s) specified in the purchase order or any extension thereof granted by IIT.</li>
                                                        <li>If the supplier fails to perform any other obligation(s) under the contract.</li>
                                                        <li>Under the above circumstances IIT may terminate the contract / purchase order in whole or in part. In addition to above, IIT may at its discretion also take the following actions: IIT may procure, upon such terms and in such manner, as it deems appropriate, goods similar to the undelivered items/products and the defaulting supplier shall be liable to compensate IIT for any extra expenditure involved towards goods and services obtained. Besides, the Director, IITG, reserves the right to impose any other form of penalty as deemed fit including blacklisting of the vendor.</li>
                                                    </ol>
                                                </li>

                                                <li className="niq-li">
                                                    <strong>Applicable Law:</strong>
                                                    <ol className="niq-ol-alpha">
                                                        <li>The contract shall be governed by the laws and procedures established by Govt. of India and subject to exclusive jurisdiction of Competent Court and Forum in Guwahati or India only.</li>
                                                        <li>Any dispute arising out of this purchase shall be referred to the Director IIT Guwahati where his decision shall be final and binding on both the parties.</li>
                                                    </ol>
                                                </li>

                                                {/* Additional Terms for Imported Goods */}
                                                <li className="niq-li" style={{ marginTop: '8px' }}>
                                                    <strong>ADDITIONAL TERMS FOR IMPORTED GOODS</strong><br />
                                                    Following terms besides the fore mentioned terms (01 to 29 above) will be applicable in case of foreign purchases:
                                                    <ol className="niq-ol-roman">
                                                        <li>
                                                            <strong>Rates:</strong><br />
                                                            Prices quoted must be for destination including freight and insurance charges inclusive of free delivery up to the door of department/ centre IIT Guwahati premises, as per details below.
                                                            <div style={{ marginTop: '5px' }}>
                                                                <table className="niq-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', marginTop: '4px', marginBottom: '8px' }}>
                                                                    <thead>
                                                                        <tr>
                                                                            <th className="niq-th" style={{ ...thStyle, width: '30px', textAlign: 'center' }}>(a)</th>
                                                                            <th className="niq-th" style={{ ...thStyle, textAlign: 'center' }}>Particulars</th>
                                                                            <th className="niq-th" style={{ ...thStyle, width: '120px', textAlign: 'center' }}>Rate</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        <tr><td style={tdCenterStyle}>I</td><td style={tdStyle}>Ex work/ FCA/ FOB value</td><td style={tdStyle} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: ' ' }} /></tr>
                                                                        <tr><td style={tdCenterStyle}>II</td><td style={tdStyle}>Shipping/ Overseas Freight / Insurance charges (If any)</td><td style={tdStyle} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: ' ' }} /></tr>
                                                                        <tr><td style={tdCenterStyle}>III</td><td style={tdStyle}>Total DAP/DDP/CIP/CIF Kolkata</td><td style={tdStyle} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: ' ' }} /></tr>
                                                                        <tr><td style={tdCenterStyle}>IV</td><td style={tdStyle}>Custom duty, IGST and clearing charges etc. (If any)</td><td style={tdStyle} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: ' ' }} /></tr>
                                                                        <tr><td style={tdCenterStyle}>V</td><td style={tdStyle}>Freight/ Insurance/ Any other charge from Kolkata to IIT Guwahati</td><td style={tdStyle} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: ' ' }} /></tr>
                                                                        <tr><td style={tdCenterStyle}>VI</td><td style={tdStyle}>Grand total on door delivery at IIT Guwahati</td><td style={tdStyle} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: ' ' }} /></tr>
                                                                        <tr><td style={{ ...tdCenterStyle, fontWeight: 'bold' }}>(b)</td><td style={tdStyle} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: ' ' }} /><td style={tdStyle} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: ' ' }} /></tr>
                                                                        <tr><td style={tdCenterStyle}>VII</td><td style={tdStyle}>Installation &amp; commissioning charge (if any)</td><td style={tdStyle} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: ' ' }} /></tr>
                                                                        <tr><td style={tdCenterStyle}>VIII</td><td style={tdStyle}>Agency Commission (if any)</td><td style={tdStyle} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: ' ' }} /></tr>
                                                                        <tr><td style={tdCenterStyle}>IX</td><td style={tdStyle}>Annual Maintenance Contract rate per year (after expiry of warranty period in %)</td><td style={tdStyle} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: ' ' }} /></tr>
                                                                    </tbody>
                                                                </table>
                                                                <strong>Note:</strong> (a) Rate of Foreign Exchange shall be the rate prevailing on the date of quotation opening.
                                                            </div>
                                                        </li>
                                                        <li><strong>After Sales Service:</strong> In case of imported stores, foreign manufacturing firms should indicate facilities available for after sales service in India, preferably in Guwahati, without which their offers are liable to be ignored.</li>
                                                        <li>
                                                            <strong>Delivery:</strong>
                                                            <ol className="niq-ol-alpha">
                                                                <li>Delivery of goods at IIT Guwahati, will have to be maximum within 95(ninety-five) days from the date of issue of the Purchase Order/ Receipt of Payment.</li>
                                                                <li>Delivery at kolkata Airport only: As we do not have clearing agent in any other Airport/ Seaport, delivery is to be made only at Kolkata in case of CIP/ CIF consignment.</li>
                                                                <li>Transshipment will be allowed, but part shipment will not be allowed.</li>
                                                            </ol>
                                                        </li>
                                                        <li>
                                                            <strong>Payment:</strong>
                                                            <ol className="niq-ol-alpha">
                                                                <li><strong>Above INR 5 Lacs by Letter of Credit (LOC):</strong>
                                                                    <ol className="niq-ol-roman">
                                                                        <li>Preferably by an irrevocable letter of Credit at CIF/CIP Kolkata value negotiable through any overseas bank with unrestricted provision.</li>
                                                                        <li>90% of payment will be released on receipt of the shipping document and balance 10% after receipt of consignment.</li>
                                                                        <li>LOC will be established on receipt of Order acknowledgment and Performance Bank Guarantee (PBG)</li>
                                                                    </ol>
                                                                </li>
                                                                <li><strong>Below INR 5 Lacs by FDD/Wire Transfer as given below:</strong>
                                                                    <ol className="niq-ol-roman">
                                                                        <li>100% payment will be released against receipt of Order Acknowledgment and Proforma Invoice</li>
                                                                    </ol>
                                                                </li>
                                                            </ol>
                                                        </li>
                                                        <li><strong>Agency Commission:</strong> The percentage of ex-works value to be paid to Indian agent in equivalent Indian currency as agency commission as applicable will have to be clearly stated in the quotation.</li>
                                                        <li><strong>Country of Origin:</strong> While Country of Origin Certificate will not be insisted, the same however will have to be stated in the Original Invoice for payment through LoC.</li>
                                                        <li><strong>LoC Amendment:</strong> LoC amendment charges due to mistake on the part of the supplier, if any, will have to be borne by the supplier.</li>
                                                    </ol>
                                                </li>
                                            </ol>
                                        </div>{/* /editable body */}

                                        {/* Freeform Editor for Titles, additional rules, or custom text */}
                                        <div
                                            className="niq-input niq-hide-empty-print"
                                            style={{
                                                width: '100%',
                                                minHeight: '3em',
                                                margin: '8px 0',
                                                display: 'block',
                                                resize: 'none'
                                            }}
                                            contentEditable
                                            suppressContentEditableWarning
                                            data-placeholder="[Add freeform additional rules, titles, or notes here. You can use the formatting toolbar! If left blank, this clause will not appear in print]"
                                            dangerouslySetInnerHTML={{ __html: '' }}
                                        />

                                        {/* ═══════════════════════════
                            SIGNATURE
                        ═══════════════════════════ */}
                                        <div style={{ marginTop: '16px' }}>
                                            <div><strong>Name:&nbsp;</strong>{indenterName}</div>
                                            <div style={{ marginTop: '2px' }}><strong>Designation:&nbsp;</strong>{designation}</div>
                                            <div style={{ marginTop: '2px' }}><strong>Department:&nbsp;</strong>{department || 'IIT Guwahati'}</div>
                                            <div style={{ marginTop: '2px' }}><strong>Address:&nbsp;</strong>IIT Guwahati, Guwahati-781039, Assam, India</div>
                                        </div>
                                    </td></tr>
                                </tbody>
                                <tfoot><tr><td><div className="footer-space" style={{ height: '14mm' }} /></td></tr></tfoot>
                            </table>
                        </div>{/* /niq-layout-content-wrapper */}

                        {/* ════════════════════════════════════════
                            ANNEXURE I – Technical Specifications
                        ════════════════════════════════════════ */}
                        <div className="niq-annexure-page">
                            <div className="ann-title"><h2>Annexure – I</h2></div>
                            <div className="ann-header" style={{ fontSize: '11pt' }}>
                                <div><strong>NIQ No.:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: defaultNIQNo }} /></div>
                                <div><strong>Dated:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: today }} /></div>
                            </div>
                            <p style={{ fontWeight: 'bold', fontSize: '12pt', marginBottom: '8px' }}>Details Technical Specifications of the item with quantity:</p>
                            <table>
                                <thead>
                                    <tr><th style={{ width: '60px', textAlign: 'center' }}>Sl. No.</th><th style={{ textAlign: 'center' }}>Item name with details technical specification</th><th style={{ width: '160px', textAlign: 'center' }}>Quantity Required</th></tr>
                                </thead>
                                <tbody id="annex1-tbody">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <tr key={n} data-item-row="true">
                                            <td style={{ textAlign: 'center' }}>{String(n).padStart(2, '0')}</td>
                                            <td contentEditable suppressContentEditableWarning style={{ minHeight: '55px' }} dangerouslySetInnerHTML={{ __html: n === 1 ? (itemSummary || '') : '' }} />
                                            <td contentEditable suppressContentEditableWarning style={{ textAlign: 'center', minHeight: '55px' }} dangerouslySetInnerHTML={{ __html: ' ' }} />
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="no-print" style={{ marginTop: '4px', display: 'flex', gap: '8px' }}>
                                <button
                                    contentEditable={false}
                                    onClick={() => handleAddRow('annex1-tbody')}
                                    style={{ fontSize: '11pt', color: '#1d4ed8', background: 'none', border: '1px dashed #93c5fd', borderRadius: '4px', padding: '2px 10px', cursor: 'pointer' }}
                                >+ Add Row</button>
                                <button
                                    contentEditable={false}
                                    onClick={() => handleRemoveRow('annex1-tbody')}
                                    style={{ fontSize: '11pt', color: '#b91c1c', background: 'none', border: '1px dashed #fca5a5', borderRadius: '4px', padding: '2px 10px', cursor: 'pointer' }}
                                >− Remove Row</button>
                            </div>
                        </div>

                        {/* ════════════════════════════════════════
                            ANNEXURE II – Bid Format
                        ════════════════════════════════════════ */}
                        <div className="niq-annexure-page">
                            <div className="ann-title"><h2>Annexure – II</h2><h3 style={{ marginTop: '6px' }}>Format for Quotation / Bid</h3></div>
                            <div className="ann-header" style={{ fontSize: '11pt' }}>
                                <div><strong>NIQ No.:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: defaultNIQNo }} /></div>
                                <div><strong>Dated:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: today }} /></div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '11pt' }}>
                                <div><strong>Bidder Ref. No:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" style={{ minWidth: '160px' }} dangerouslySetInnerHTML={{ __html: ' ' }} /><br /><em style={{ fontSize: '9pt' }}>(Mandatory requirement)</em></div>
                                <div><strong>Date:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" style={{ minWidth: '120px' }} dangerouslySetInnerHTML={{ __html: ' ' }} /></div>
                            </div>
                            <table>
                                <thead>
                                    <tr style={{ background: '#facc15' }}><th style={{ width: '48px', textAlign: 'center' }}>S.N.</th><th style={{ textAlign: 'center' }}>Description of item required by IITG</th><th style={{ width: '60px', textAlign: 'center' }}>Qty</th><th style={{ width: '130px', textAlign: 'center' }}>Price</th></tr>
                                </thead>
                                <tbody id="annex2-item-tbody">
                                    <tr data-item-row="true"><td style={{ textAlign: 'center' }}>01</td><td contentEditable suppressContentEditableWarning style={{ minHeight: '50px' }} dangerouslySetInnerHTML={{ __html: itemSummary || '' }} /><td contentEditable suppressContentEditableWarning style={{ textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: ' ' }} /><td contentEditable suppressContentEditableWarning style={{ textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: ' ' }} /></tr>
                                    {[
                                        ['', 'Basic Price (Ex work)'],
                                        ['', 'Packing / Forwarding charge up to IITG premises (if any)'],
                                        ['', 'Insurance charges (if any)'],
                                        ['bold', 'Basic value including Packing / Forwarding / Insurance charges etc.'],
                                        ['', 'Any other charges (if any)'],
                                        ['bold', 'GST Charges'],
                                        ['bold bg', 'Grand total on door delivery at IIT Guwahati'],
                                        ['', 'Installation & Commissioning Charge (if any)'],
                                        ['', 'Annual Maintenance Contract rate per year (after expiry of warranty)'],
                                    ].map(([cls, label], i) => (
                                        <tr key={i} style={cls.includes('bg') ? { background: '#e5e7eb' } : {}}>
                                            <td colSpan={3} style={{ textAlign: 'right', fontWeight: cls.includes('bold') ? 'bold' : 'normal' }}>{label}</td>
                                            <td contentEditable suppressContentEditableWarning style={{ textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: ' ' }} />
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="no-print" style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                                <button
                                    contentEditable={false}
                                    onClick={() => handleAddRow('annex2-item-tbody')}
                                    style={{ fontSize: '11pt', color: '#1d4ed8', background: 'none', border: '1px dashed #93c5fd', borderRadius: '4px', padding: '2px 10px', cursor: 'pointer' }}
                                >+ Add Item Row</button>
                                <button
                                    contentEditable={false}
                                    onClick={() => handleRemoveRow('annex2-item-tbody')}
                                    style={{ fontSize: '11pt', color: '#b91c1c', background: 'none', border: '1px dashed #fca5a5', borderRadius: '4px', padding: '2px 10px', cursor: 'pointer' }}
                                >− Remove Item Row</button>
                            </div>
                            <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                <div><strong>Sign.:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: ' ' }} /></div>
                                <div><strong>Vendor: M/s&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: ' ' }} /></div>
                                <div style={{ fontStyle: 'italic', fontWeight: 'bold', marginTop: '12px', paddingRight: '48px' }}>Official seal of the vendor</div>
                            </div>
                        </div>

                        {/* ════════════════════════════════════════
                            ANNEXURE III – Bidder's Detail
                        ════════════════════════════════════════ */}
                        <div className="niq-annexure-page">
                            <div className="ann-title"><h2>Annexure – III</h2><h3 style={{ marginTop: '6px' }}>Bidder's Detail</h3></div>
                            <div className="ann-header" style={{ fontSize: '11pt' }}>
                                <div><strong>NIQ No.:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: defaultNIQNo }} /></div>
                                <div><strong>Dated:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: today }} /></div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '11pt' }}>
                                <div><strong>Bidder Ref. No:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" style={{ minWidth: '160px' }} dangerouslySetInnerHTML={{ __html: ' ' }} /><br /><em style={{ fontSize: '9pt' }}>(Mandatory requirement)</em></div>
                                <div><strong>Date:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" style={{ minWidth: '120px' }} dangerouslySetInnerHTML={{ __html: ' ' }} /></div>
                            </div>
                            <p style={{ textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline', fontStyle: 'italic', fontSize: '10pt', marginBottom: '12px' }}>(Documentary Proof must be attached as applicable)</p>
                            <table>
                                <thead><tr><th style={{ width: '48px', textAlign: 'center' }}>Sl. No.</th><th style={{ textAlign: 'center' }}>Name of the company / Firm</th><th style={{ textAlign: 'center', fontStyle: 'italic', textDecoration: 'underline' }}>To be filled by the vendor</th></tr></thead>
                                <tbody>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>01</td>
                                        <td style={{ fontSize: '10pt', lineHeight: '1.6' }}>Registered office Name &amp; Address:<br />Contact person:<br />Name:<br />Designation:<br />Telephone number:<br />e-mail:</td>
                                        <td contentEditable suppressContentEditableWarning style={{ minHeight: '90px' }} dangerouslySetInnerHTML={{ __html: ' ' }} />
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>02</td>
                                        <td style={{ fontSize: '10pt', lineHeight: '1.6' }}>Name &amp; Address of <u>service center</u> nearest to <u>Guwahati</u> city:<br />Contact person:<br />Name:<br />Designation:<br />Telephone number:<br />e-mail:<br />Details with contact no. of staff involved in this project.</td>
                                        <td contentEditable suppressContentEditableWarning style={{ minHeight: '105px' }} dangerouslySetInnerHTML={{ __html: ' ' }} />
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>03</td>
                                        <td style={{ fontSize: '10pt' }}>Is the company/firm a registered company/firm? If yes, mention year/place and submit proof.</td>
                                        <td contentEditable suppressContentEditableWarning style={{ minHeight: '50px' }} dangerouslySetInnerHTML={{ __html: ' ' }} />
                                    </tr>
                                    <tr>
                                        <td style={{ textAlign: 'center' }}>04</td>
                                        <td style={{ fontSize: '10pt' }}>Is the company/firm registered for GST? If yes, submit registration certificate.</td>
                                        <td contentEditable suppressContentEditableWarning style={{ minHeight: '50px' }} dangerouslySetInnerHTML={{ __html: ' ' }} />
                                    </tr>
                                </tbody>
                            </table>
                            <p style={{ fontSize: '9pt', fontStyle: 'italic', marginTop: '8px' }}>Note: All fields must be filled up by the bidder mandatorily along with documentary proof. Providing only contact details of service engineer will not be considered.</p>
                            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                <div><strong>Sign.:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: ' ' }} /></div>
                                <div><strong>Vendor: M/s&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: ' ' }} /></div>
                            </div>
                        </div>

                        {/* ════════════════════════════════════════
                            ANNEXURE IV – Compliance Certificate
                        ════════════════════════════════════════ */}
                        <div className="niq-annexure-page">
                            <div className="ann-title"><h2>Annexure – IV</h2><h3 style={{ marginTop: '6px' }}>Compliance Certificate</h3></div>
                            <div className="ann-header" style={{ fontSize: '11pt' }}>
                                <div><strong>NIQ No.:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: defaultNIQNo }} /></div>
                                <div><strong>Dated:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: today }} /></div>
                            </div>
                            <p style={{ marginBottom: '16px', fontSize: '11pt' }}>Certify that we have carefully examined the NIQ terms and fully understood its implications and do hereby agree to comply with all the terms, and hereby submit this compliance certificate.</p>
                            <table>
                                <thead><tr><th style={{ width: '48px', textAlign: 'center' }}>Sl. No.</th><th style={{ textAlign: 'center' }}>General Terms and Conditions</th><th style={{ width: '100px', textAlign: 'center' }}>Yes / No</th></tr></thead>
                                <tbody>
                                    {[
                                        'Technical features of the offered equipment vis-à-vis NIQ specification',
                                        'Rates quoted as per instruction',
                                        'Standard Technical literature on each of the items offered',
                                        'Warranty period agreed',
                                        'Valid ISO provided',
                                        'Validity period of quoted rate agreed',
                                        'Bid security declaration submitted',
                                        'PBG term agreed',
                                        'Delivery terms agreed',
                                        'GST Registration Certificate provided',
                                        'Payment term agreed',
                                        'Penalty clause for delay agreed',
                                        'Manufacturer/Authorization certificate submitted',
                                        'After Sales Service term agreed and contact details provided',
                                        'Not blacklisted by any Govt. Organizations/Institutions',
                                    ].map((item, i) => (
                                        <tr key={i}>
                                            <td style={{ textAlign: 'center' }}>{String(i + 1).padStart(2, '0')}</td>
                                            <td style={{ fontSize: '10pt' }}>{item}</td>
                                            <td contentEditable suppressContentEditableWarning style={{ textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: ' ' }} />
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                <div><strong>Sign.:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: ' ' }} /></div>
                                <div><strong>Vendor: M/s&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" dangerouslySetInnerHTML={{ __html: ' ' }} /></div>
                            </div>
                        </div>

                        {/* ════════════════════════════════════════
                            ANNEXURE V – Bid Security Declaration
                        ════════════════════════════════════════ */}
                        <div className="niq-annexure-page">
                            <div className="ann-title"><h2>Annexure – V</h2></div>
                            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                <p style={{ fontWeight: 'bold', fontSize: '14pt' }}>INDIAN INSTITUTE OF TECHNOLOGY GUWAHATI</p>
                                <p style={{ fontWeight: 'bold', fontSize: '12pt', textDecoration: 'underline' }}>Bid Security Declaration Form</p>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', fontSize: '11pt' }}>
                                <div><strong>Bidder Ref. No:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" style={{ minWidth: '160px' }} dangerouslySetInnerHTML={{ __html: ' ' }} /><br /><em style={{ fontSize: '9pt' }}>(Mandatory requirement)</em></div>
                                <div><strong>Date:&nbsp;</strong><span contentEditable suppressContentEditableWarning className="ann-input" style={{ minWidth: '120px' }} dangerouslySetInnerHTML={{ __html: ' ' }} /></div>
                            </div>
                            <p style={{ marginBottom: '16px' }}>To<br />The Head of Section,<br />Research &amp; Development Section<br />IIT Guwahati</p>
                            <div contentEditable suppressContentEditableWarning style={{ fontSize: '11pt', lineHeight: '1.6', textAlign: 'justify', minHeight: '200px', outline: 'none' }}
                                dangerouslySetInnerHTML={{ __html: `I/We M/s <span style="display:inline-block;min-width:320px;border-bottom:1px solid #000;">&nbsp;</span> (name) submitted the bid against the respective NIQ No. <span style="display:inline-block;min-width:200px;border-bottom:1px solid #000;">&nbsp;</span> And tender ID No. <span style="display:inline-block;min-width:200px;border-bottom:1px solid #000;">&nbsp;</span> towards Supply and installation of <strong>${itemSummary || '<span style="display:inline-block;min-width:320px;border-bottom:1px solid #000;">&nbsp;</span>'}</strong> (Item's Name), declare that, if we withdraw or modify our bids either during the period of validity of bid or fail to execute the contract on award of the contract, we understand and agree that, our firm will be debarred for the period of one year for further bidding of any tender of your Institute. Further, we agree that, your Institute is at liberty to intimate this debarment to all departments/organization of government and governmental organizations.` }}
                            />
                            <p style={{ marginTop: '32px' }}>Yours faithfully,</p>
                            <div style={{ marginTop: '80px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <div style={{ width: '260px', textAlign: 'center' }}>
                                    <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '11pt' }}>(Signature of the Bidder)</div>
                                    <div style={{ fontSize: '10pt', marginTop: '8px', lineHeight: '1.5' }}>Name and designation of the officer<br />Seal, name &amp; address of the Organization</div>
                                </div>
                            </div>
                        </div>

                        {/* ════════════════════════════════════════
                            ANNEXURE VI – Performance Bank Guarantee
                        ════════════════════════════════════════ */}
                        <div className="niq-annexure-page">
                            <div className="ann-title"><h2>Annexure – VI</h2><h3 style={{ marginTop: '6px' }}>Performance Bank Guarantee Format</h3></div>
                            <p style={{ marginBottom: '16px', fontSize: '11pt' }}>To:<br />The Registrar,<br />Indian Institute of Technology, Guwahati – 781 039</p>
                            <div contentEditable suppressContentEditableWarning style={{ fontSize: '11pt', lineHeight: '1.7', textAlign: 'justify', minHeight: '340px', outline: 'none' }}
                                dangerouslySetInnerHTML={{ __html: `WHEREAS __________________________________________ (Name of Supplier) hereinafter called "the Supplier" has undertaken, in pursuance of Contract No: _______________, dated: __________ 20... to supply <strong>${itemSummary || '________________________________________________________________'}</strong> (Description of Goods and Services) hereinafter called "the order".<br/><br/>AND WHEREAS it has been stipulated by you in the said order that the Supplier shall furnish you with a Bank Guarantee by a recognized bank for the sum specified therein as security for compliance with the Supplier's performance obligations in accordance with the order.<br/><br/>AND WHEREAS we have agreed to give the Supplier a Guarantee:<br/>THEREFORE, WE hereby affirm that we are Guarantors and responsible to you, on behalf of the Supplier, up to a total of _________________________________________________________________ (Amount of the Guarantee in Words and Figures) and we undertake to pay you, upon your first written demand declaring the Supplier to be in default under the order and without cavil or argument, any sum or sums within the limit of ________________________ (Amount of Guarantee) as aforesaid, without your needing to prove or to show grounds or reasons for your demand or the sum specified therein.<br/><br/>This guarantee is valid until the ________day of ______________________ 20......` }}
                            />
                            <p contentEditable suppressContentEditableWarning style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '32px' }} dangerouslySetInnerHTML={{ __html: 'Signature and Seal of Guarantors' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '11pt' }}>
                                <div contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: 'Date..........................20....' }} />
                                <div contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: 'Address:.............................' }} />
                            </div>
                            <div style={{ marginTop: '32px', borderTop: '1px solid #ccc', paddingTop: '12px', fontSize: '10pt' }}>
                                <p style={{ fontStyle: 'italic', fontWeight: 'bold' }}>All correspondence with reference to this guarantee shall be made at the following address:</p>
                                <p style={{ fontWeight: 'bold' }}>The Head of Section, Research and Development Section<br />Indian Institute of Technology Guwahati, Guwahati – 781 039, Assam</p>
                            </div>
                        </div>

                        {/* Fixed bottom footer – visible only on print */}
                        <div className="niq-page-footer">
                            Printed on: {printedAt}
                        </div>

                    </div>
                    )}{/* /A4 */}
                </div>{/* /scroll-wrapper */}
            </main>
        </div>

    );
};

// ─── Table cell styles ─────────────────────────────────────────────────────────
const border = '1px solid #000';
const thStyle: React.CSSProperties = {
    border,
    padding: '4px 6px',
    textAlign: 'left',
    fontWeight: 'bold',
    background: '#e5e7eb',
    whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = { border, padding: '3px 6px', verticalAlign: 'top' };
const tdCenterStyle: React.CSSProperties = { ...tdStyle, textAlign: 'center' };
const tdRightStyle: React.CSSProperties = { ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' };

export default NIQPage;