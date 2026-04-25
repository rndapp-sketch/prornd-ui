

// -=-=-=-=-=-=-=-= v3


// import React, { useEffect, useState } from 'react';
// import { useNavigate, useParams, useLocation } from 'react-router-dom';
// import {
//     Printer, X, FileText,
//     Loader2,
//     Bold, Italic, Underline,
//     AlignLeft, AlignCenter, AlignJustify,
//     Undo, Redo,
// } from 'lucide-react';

// // ─── Print Styles ─────────────────────────────────────────────────────────────
// const printStyles = `
// @media print {
//     @page {
//         size: A4;
//         margin: 10mm 15mm;
//     }

//     * {
//         -webkit-print-color-adjust: exact !important;
//         print-color-adjust: exact !important;
//         color-adjust: exact !important;
//     }

//     /* ── Hide ALL app chrome ── */
//     .no-print { display: none !important; }
//     header { display: none !important; }
//     aside, [data-sidebar], nav { display: none !important; }

//     html, body, #root, .App, main {
//         background: white !important;
//         margin: 0 !important;
//         padding: 0 !important;
//         width: 100% !important;
//         height: auto !important;
//         overflow: visible !important;
//         min-height: 0 !important;
//         display: block !important;
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
// .niq-li { margin-bottom: 4px; text-align: justify; line-height: 1.45; font-size: 11.5px; }
// .niq-center-header {
//     display: block;
//     text-align: center;
//     font-weight: bold;
//     text-decoration: underline;
//     font-size: 12px;
//     margin: 8px 0 6px;
// }
// @media print {
//     .niq-field-editable {
//         border: none !important;
//         background: transparent !important;
//     }
// }
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
//     size = 12,
//     placeholder = '______',
//     style,
// }: {
//     id: string;
//     defaultValue?: string;
//     size?: number;
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
//             minWidth: `${Math.max((defaultValue?.length ?? 0) + 2, size) * 7.5}px`,
//             ...style
//         }}
//     >
//         {defaultValue}
//     </span>
// );

// // ─── Toolbar ──────────────────────────────────────────────────────────────────
// const Toolbar = ({ onClose }: { onClose: () => void }) => (
//     <div className="sticky top-4 self-start flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg no-print z-10 h-fit">
//         <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-700">
//             <button
//                 onClick={() => window.print()}
//                 title="Print NIQ"
//                 className="p-2 bg-[#D97757] text-white hover:bg-[#b35d41] rounded-lg transition-colors flex items-center justify-center"
//             >
//                 <Printer className="w-5 h-5" />
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

//     const docId = id ?? igfId ?? (location.state as any)?.application?.id ?? '';

//     useEffect(() => {
//         if (!docId) { setLoading(false); return; }
//         const fetchIGF = async () => {
//             try {
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

//                 // Normalize email – append @iitg.ac.in if stored as bare username
//                 const normalizeEmail = (raw?: string | null) => {
//                     if (!raw) return null;
//                     return raw.includes('@') ? raw : `${raw}@iitg.ac.in`;
//                 };

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

//             <main className="p-4 md:p-8 w-full">
//                 <div className="niq-scroll-wrapper flex justify-center items-start gap-4 max-h-[calc(100vh-4rem)] overflow-y-auto">

//                     {/* ── Toolbar ── */}
//                     <div className="niq-toolbar-wrapper sticky top-4">
//                         <Toolbar onClose={() => navigate(-1)} />
//                     </div>

//                     {/* ── A4 Paper ── */}
//                     <div
//                         className="print-container bg-white text-black shadow-2xl"
//                         style={{
//                             width: '210mm',
//                             minHeight: '297mm',
//                             padding: '10mm 15mm',
//                             fontFamily: '"Times New Roman", Times, serif',
//                             fontSize: '11.5px',
//                             lineHeight: '1.45',
//                         }}
//                     >
//                         {/* ═══════════════════════════
//                             HEADER
//                         ═══════════════════════════ */}
//                         <table className="avoid-break" style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '2px solid black', marginBottom: '10px' }}>
//                             <tbody>
//                                 <tr>
//                                     {/* Left – logo + institute */}
//                                     <td style={{ width: '52%', verticalAlign: 'top', padding: '6px 10px 6px 0' }}>
//                                         <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
//                                             <img
//                                                 src="http://172.16.131.206:8000/files/IITG_logo.png"
//                                                 alt="IITG"
//                                                 style={{ width: '55px', height: 'auto', flexShrink: 0 }}
//                                                 onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
//                                             />
//                                             <div>
//                                                 <strong style={{ display: 'block', fontSize: '12.5px' }}>
//                                                     Office of Industrial Interactions<br />and Special Initiatives
//                                                 </strong>
//                                                 <strong style={{ display: 'block', fontSize: '11.5px', marginTop: '3px' }}>
//                                                     Indian Institute of Technology Guwahati<br />
//                                                     Guwahati-781039, Assam, India
//                                                 </strong>
//                                             </div>
//                                         </div>
//                                     </td>

//                                     {/* Right – contact + date + NIQ */}
//                                     <td style={{ width: '48%', verticalAlign: 'top', padding: '6px 0 6px 10px', borderLeft: '1px solid #ccc' }}>
//                                         <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
//                                             <tbody>
//                                                 <tr>
//                                                     <td style={{ fontWeight: 'bold', whiteSpace: 'nowrap', paddingRight: '4px', width: '68px' }}>Phone Nos.</td>
//                                                     <td style={{ whiteSpace: 'nowrap', width: '8px' }}>:</td>
//                                                     <td>+91-361-258-3431</td>
//                                                 </tr>
//                                                 <tr>
//                                                     <td></td>
//                                                     <td style={{ whiteSpace: 'nowrap' }}>:</td>
//                                                     <td>+91-361-258-3430</td>
//                                                 </tr>
//                                                 <tr>
//                                                     <td style={{ fontWeight: 'bold' }}>Fax</td>
//                                                     <td>:</td>
//                                                     <td>+91-361-258-2089</td>
//                                                 </tr>
//                                                 <tr>
//                                                     <td></td>
//                                                     <td>:</td>
//                                                     <td>+91-361-269-2005</td>
//                                                 </tr>
//                                                 <tr>
//                                                     <td style={{ fontWeight: 'bold' }}>Email</td>
//                                                     <td>:</td>
//                                                     <td>iiisi@iitg.ac.in</td>
//                                                 </tr>
//                                                 <tr><td colSpan={3} style={{ paddingTop: '4px' }}></td></tr>
//                                                 <tr>
//                                                     <td style={{ fontWeight: 'bold' }}>Date</td>
//                                                     <td>:</td>
//                                                     <td><strong>{today}</strong></td>
//                                                 </tr>
//                                                 <tr>
//                                                     <td style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>NIQ No.</td>
//                                                     <td>:</td>
//                                                     <td style={{ wordBreak: 'break-all' }}>{defaultNIQNo}</td>
//                                                 </tr>
//                                             </tbody>
//                                         </table>
//                                     </td>
//                                 </tr>

//                                 {/* Indenter row */}
//                                 <tr>
//                                     <td colSpan={2} style={{ padding: '8px 0 5px', borderTop: '1px solid #ccc' }}>
//                                         <strong style={{ fontSize: '12.5px' }}>{indenterName}</strong>
//                                         <span style={{ display: 'block', marginTop: '3px' }}>{designation}</span>
//                                         <span style={{ display: 'block', marginTop: '3px' }}>{department}</span>
//                                     </td>
//                                 </tr>
//                             </tbody>
//                         </table>

//                         {/* ═══════════════════════════
//                             NIQ TITLE
//                         ═══════════════════════════ */}
//                         <p style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '10px', lineHeight: '1.6' }}>
//                             NOTICE INVITING QUOTATION FOR SUPPLY &amp; INSTALLATION OF{' '}
//                             {itemSummary || '[Item Name]'}{' '}
//                             FOR THE DEPARTMENT OF{' '}
//                             {department || '[Department]'}{' '}
//                             (PROJECT NO. {projectCode}), IIT GUWAHATI.
//                         </p>

//                         {/* Submission note */}
//                         <p className="niq-li" style={{ marginBottom: '10px' }}>
//                             Quotations for supply of equipment as per details at <strong>ANNEXURE-I</strong>, in single bid
//                             as indicated in the CHECKLIST given below, in sealed covers, are hereby invited so as to
//                             reach the undersigned on or before{' '}
//                             <F id="lastDate" placeholder="[Last Date of Submission]" size={20} />.
//                         </p>

//                         {/* ═══════════════════════════
//                             ITEMS TABLE (ANNEXURE-I inline summary)
//                         ═══════════════════════════ */}
//                         {items.length > 0 && (
//                             <div style={{ marginBottom: '10px' }}>
//                                 <p style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>
//                                     ANNEXURE-I: Details of Items to be Purchased
//                                 </p>
//                                 <table className="niq-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
//                                     <thead>
//                                         <tr>
//                                             <th className="niq-th" style={thStyle}>#</th>
//                                             <th className="niq-th" style={thStyle}>Item Name</th>
//                                             <th className="niq-th" style={thStyle}>Description</th>
//                                             <th className="niq-th" style={thStyle}>Qty</th>
//                                             <th className="niq-th" style={thStyle}>Rate (₹)</th>
//                                             <th className="niq-th" style={thStyle}>Amount (₹)</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody>
//                                         {items.map((item, i) => (
//                                             <tr key={i}>
//                                                 <td style={tdCenterStyle}>{i + 1}</td>
//                                                 <td style={tdStyle}>{item.igf_item_name ?? '—'}</td>
//                                                 <td style={tdStyle}>{item.igf_item_description ?? '—'}</td>
//                                                 <td style={tdCenterStyle}>{item.igf_quantity ?? '—'}</td>
//                                                 <td style={tdRightStyle}>{Number(item.igf_estimated_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
//                                                 <td style={tdRightStyle}>{Number(item.igf_estimated_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                     <tfoot>
//                                         <tr className="niq-tfoot" style={{ fontWeight: 'bold' }}>
//                                             <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>Grand Total</td>
//                                             <td style={tdCenterStyle}>{totalQty}</td>
//                                             <td style={tdRightStyle}></td>
//                                             <td style={tdRightStyle}>{fmt(totalAmt)}</td>
//                                         </tr>
//                                     </tfoot>
//                                 </table>
//                             </div>
//                         )}

//                         {/* ═══════════════════════════
//                             PURCHASE COMMITTEE
//                         ═══════════════════════════ */}
//                         {committee.length > 0 && (
//                             <div style={{ marginBottom: '10px' }}>
//                                 <p style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>
//                                     Purchase Committee
//                                 </p>
//                                 <table className="niq-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
//                                     <thead>
//                                         <tr>
//                                             <th className="niq-th" style={thStyle}>#</th>
//                                             <th className="niq-th" style={thStyle}>Name</th>
//                                             <th className="niq-th" style={thStyle}>Webmail ID</th>
//                                             <th className="niq-th" style={thStyle}>Role</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody>
//                                         {committee.map((m, i) => (
//                                             <tr key={i}>
//                                                 <td style={tdCenterStyle}>{i + 1}</td>
//                                                 <td style={tdStyle}>{m.igf_member_name ?? '—'}</td>
//                                                 <td style={tdStyle}>{m.igf_webmail_id ?? '—'}</td>
//                                                 <td style={tdStyle}>{m.igf_designation ?? '—'}</td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                 </table>
//                             </div>
//                         )}

//                         {/* ═══════════════════════════
//                             INSTRUCTIONS TO BIDDERS
//                         ═══════════════════════════ */}
//                         <span className="niq-center-header">INSTRUCTION TO BIDDERS</span>
//                         <p style={{ fontWeight: 'bold', marginBottom: '3px' }}>
//                             {igf?.igf_number_of_bids?.startsWith('Single') || !igf?.igf_number_of_bids
//                                 ? 'Single Bid:'
//                                 : 'Double Bid:'}
//                         </p>
//                         <ol className="niq-ol">
//                             <li className="niq-li">
//                                 In case of single bid, quotations will have to be submitted in a single bid, in a properly
//                                 sealed cover; and the address of the firm submitting the quotation and the Officer to whom
//                                 the quotation is addressed, must appear distinctly on the sealed cover. Further, on the sealed
//                                 cover the following are to be written:{' '}
//                                 <strong>
//                                     'QUOTATION FOR SUPPLY &amp; INSTALLATION OF{' '}
//                                     {itemSummary || '[Item]'}{' '}
//                                     FOR THE DEPARTMENT OF {department || '[Dept]'}{' '}
//                                     (PROJECT NO. {projectCode}), IIT GUWAHATI.{' '}
//                                     VIDE NIQ NO. {defaultNIQNo},{' '}
//                                     LAST DATE FOR SUBMISSION <F id="lastDateRef" placeholder="[Date]" size={14} />'
//                                 </strong>
//                                 <br />
//                                 <strong>NOTE:</strong> The bid documents are not transferable and the firm's seal and signature
//                                 of the authorized official must appear on all the papers and envelopes submitted.
//                             </li>
//                             <li className="niq-li">The bid must mention the prices of all items asked for individually and then summed up — basic price and other charges such as Packing, Freight, Insurance, Installation &amp; Commissioning charge, VAT/Tax etc. as applicable.</li>
//                             <li className="niq-li">Annual Maintenance Contract (AMC) rate (after expiry of warranty period) is to be clearly indicated – preferably in both comprehensive and non-comprehensive terms, failure to which the offer may not be considered even if it turns out to be at the lowest price.</li>
//                             <li className="niq-li">Details of the technical features of the offered equipment along with Standard Technical literature on each of the items offered.</li>
//                             <li className="niq-li">Dealership certificate on the offered products in case of dealer/s.</li>
//                             <li className="niq-li">List of reputed organizations/Institutions, where similar orders have been executed (copies of the purchase/work orders will have to be enclosed).</li>
//                             <li className="niq-li">Up-to-date Sales Tax clearance certificate (for vendors outside the State of Assam) / VAT Registration Certificate indicating also the TIN number (for vendors from within the State of Assam) OF THE FIRM will have to accompany the quotation to be submitted.</li>
//                             <li className="niq-li">Details of nature and maximum period of warranty offered by the vendor.</li>
//                             <li className="niq-li">After Sales Service: The name &amp; address of the nearest available authorized service centre to IIT, North Guwahati, should be stated in the quotation.</li>
//                         </ol>

//                         {/* ═══════════════════════════
//                             TERMS & CONDITIONS
//                         ═══════════════════════════ */}
//                         <p style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '2px' }}>TERMS &amp; CONDITIONS:</p>
//                         <p className="niq-li" style={{ marginBottom: '5px' }}>
//                             (Please note the term 'both foreign &amp; indigenous' wherever mentioned means the term is applicable to both foreign &amp; indigenous purchase)
//                         </p>
//                         <ol className="niq-ol">
//                             <li className="niq-li">
//                                 <strong>Rates:</strong> Rates quoted for indigenous items should be on FOR IIT Guwahati, on DOOR DELIVERY basis, with break-ups as per details below (For import items please refer 'Additional Terms for imported goods' at clause No. 25 below). Break-ups of cost:
//                                 <ol className="niq-ol-alpha">
//                                     <li>Basic Price</li>
//                                     <li>(+) Central Excise Duty, if any</li>
//                                     <li>(+) VAT / Central Sales Tax (On Sub-Total Price, including Excise Duty, if any)</li>
//                                     <li>(+) Freight &amp; Insurance Charge, if any</li>
//                                     <li>(+) Installation &amp; Commissioning Charge, if any</li>
//                                     <li>Grand Total F.O.R. IIT Guwahati Price</li>
//                                 </ol>
//                                 Note: Vague terms like "packing, forwarding, transportation etc. extra" without mentioning the specific amount will not be accepted. Such offers shall be treated as incomplete and rejected. Bidders shall indicate their rates in clear/visible figures as well as in words and shall not alter/overwrite/make cutting in the quotation. In case of a mismatch, the rates written in words will prevail.
//                             </li>
//                             <li className="niq-li">Validity (Both foreign &amp; indigenous): Quoted rates must be valid for 120 days.</li>
//                             <li className="niq-li">
//                                 <strong>Performance Bank Guarantee (Both foreign &amp; indigenous):</strong> The successful bidder shall furnish an unconditional Performance Bank Guarantee valid till 60 days after the warranty period from a scheduled Bank for 10% of the Purchase Order value within 21 days of placement of order failing which the contract shall be deemed as terminated (APPLICABLE ONLY TO ORDERS COSTING MORE THAN INR 5,00,000.00). That:
//                                 <ol className="niq-ol-alpha">
//                                     <li>The Vendor shall provide a Certificate of Guarantee guaranteeing satisfactory operation of the components and against poor workmanship, bad quality of materials used, faulty designs and performance figures given by the Vendor.</li>
//                                     <li>This guarantee shall be operative for a period of 60 days after the warranty period. The performance guarantee would be to the extent of 10% of the order value.</li>
//                                     <li>The Vendor shall at his own cost rectify the defects/replace the items supplied, for defects identified during the period of guarantee.</li>
//                                     <li>While clauses 3(a), 3(b) and 3(c) are applicable to all orders worth Rs. 5 Lakhs or more, competent authority may take appropriate decisions on exceptional cases.</li>
//                                 </ol>
//                             </li>
//                             <li className="niq-li">
//                                 <strong>PENALTY for delayed delivery (for both foreign &amp; indigenous):</strong> The date of delivery shall be strictly adhered to, except in cases of Force Majeure or extension of the delivery date duly approved by IIT Guwahati. In the event of delayed delivery and acceptance by the end user, the vendor shall be liable for a penalty deduction at the rate of 0.5% per week or part thereof of the value of the entire consignment, subject to a maximum of 10% (ten percent).
//                                 For the purpose of this clause, part of a week shall be treated as a full week. In case of delayed delivery, IIT Guwahati reserves the right not to accept the consignment.
//                             </li>
//                             <li className="niq-li">In case of indigenous supplies, the goods should be insured against theft, loss or breakage during transit and insurance charges should not exceed 1% of the cost of material supplied, the rates of Sales Tax, Excise Duty etc. (as applicable) should be clearly indicated. Form C &amp; D is not applicable to us. However, we are exempted from payment of Excise Duty and certificate to this effect can be provided.</li>
//                             <li className="niq-li">Penalty for delayed supply (Both foreign &amp; indigenous): In case of supply order for the SCIENTIFIC EQUIPMENTS / APPARATUS, the date of delivery should be strictly adhered to otherwise the Director, IITG reserves the right not to accept delivery in part or full and claim liquidated damages of 1% per week subject to maximum of 10% of the total value of supply.</li>
//                             <li className="niq-li">Pre-installation requisites (Both foreign &amp; indigenous): Pre-installation requisites (electrical/floor/space/air-conditioning etc.) if any should invariably be mentioned clearly. Installation / Training will be the full responsibility of the supplier / Indian Agent.</li>
//                             <li className="niq-li">Short Shipment (Both foreign &amp; indigenous): If any short-shipment etc. is noticed, the same will be arranged immediately with all charges to this effect to be borne by supplier/Indian agent.</li>
//                             <li className="niq-li">Genuine Pricing (Both foreign &amp; indigenous): Vendor is to ensure that quoted price is not more than the price offered to any other customer in India to whom this particular item has been sold, particularly to IIT/Institutes and other Government Organization. Copy of the latest price list for the quoted item, applicable in India, must be enclosed with your offer.</li>
//                             <li className="niq-li">Excise Duty: The Institute is exempted from payment of Central Excise Duty vide GOI Notification No. 10/97-Central Excise, dated 01.03.97 with Regn. No. TU/V/RG-CDE (351)/2011, dated 19.09.2011.</li>
//                             <li className="niq-li">VAT: For a vendor within the State of Assam, appropriate VAT (to be deducted at source) will be applicable. For exemption from Octroi, wherever required, the Institute will issue necessary certificates.</li>
//                             <li className="niq-li">Entry Tax: Assam Govt. Entry Tax – usually @4% [to be paid by IIT Guwahati, not by the vendor], wherever applicable, will be added while evaluating cost status of the concerned equipment to be supplied by vendors from outside the State of Assam.</li>
//                             <li className="niq-li">
//                                 <strong>Delivery:</strong>
//                                 <ol className="niq-ol-alpha">
//                                     <li>Delivery of goods at IIT Guwahati will have to be maximum within 45 (Forty-five) days from the date of issue of the Purchase Order.</li>
//                                     <li>Safe delivery of goods: All aspects of safe delivery shall be the exclusive responsibility of the vendor. At the destination site, the cartons will be opened only in the presence of IIT user/representative and vendor's representative and the intact position of the seal for not being tempered with, shall form the basis for certifying the receipt in good condition.</li>
//                                     <li>No Part Delivery: part shipment will not be allowed.</li>
//                                 </ol>
//                             </li>
//                             <li className="niq-li">
//                                 Mode of Payment for Indigenous Purchase (For import items please refer 'Additional Terms for imported goods' clause No. 28 below):
//                                 <ol className="niq-ol-alpha">
//                                     <li>Payment for Indigenous Purchases will be maximum within 45 days from the date of successful delivery and installation of goods at IIT Guwahati, North-Guwahati, generally through A/c payee cheque. In case payment is to be made by DD, the Draft commission will be deducted from the bill amount. or</li>
//                                     <li>Payment through bank against proof of dispatch: 90% payment shall be released on receipt of proof of dispatch through State Bank Of India, IITG Branch, Guwahati-781039, Assam (Contact No. 0361-2582106). Balance 10% shall be released after installation / handing over of the equipment to the consignee(s).</li>
//                                 </ol>
//                                 Note: Please note as per Institute's norm advance payment is not allowed for indigenous purchase.
//                             </li>
//                             <li className="niq-li">Quotation by Fax/Mail not Acceptable (Both foreign &amp; indigenous): The offers submitted by telex / telegram / fax / E-mail etc. shall not be considered. No correspondence will be entertained on this matter.</li>
//                             <li className="niq-li">Late and delayed tender (Both foreign &amp; indigenous): Late and delayed tender will not be considered. In case any unscheduled holiday occurs on prescribed closing/opening date the next working day shall be the prescribed date of closing/opening.</li>
//                             <li className="niq-li">Conditional tenders not acceptable (Both foreign &amp; indigenous): Conditional tenders shall not be accepted on any ground and shall be rejected straightway. In other words, printed conditions mentioned in the tender bids submitted by vendors will not be binding on IITG. All the terms and conditions for the supply, payment terms, penalty etc. will be as those mentioned herein and no change in the terms and conditions by the vendors will be acceptable.</li>
//                             <li className="niq-li">Specifications are basic essence of the product (Both foreign &amp; indigenous): It must be ensured that the offers are strictly as per our specifications. At the same time it must also be kept in mind that merely copying our specifications in their quotation shall not make firms eligible for consideration. A quotation has to be supported with the printed technical leaflet/literature (wherever applicable) and the specifications mentioned in the quotation must be reflected / supported by such printed technical leaflet/literature — model quoted/tendered specifications should invariably be highlighted in the leaflet/literature for easy reference.</li>
//                             <li className="niq-li">Enquiry during the course of evaluation not allowed (Both foreign &amp; indigenous): No enquiry shall be made by the bidder(s) during the course of evaluation of the tender till final decision is conveyed to the successful bidder(s). However, the Committee/its authorized representative and office of IIT GUWAHATI can make any enquiry/seek clarification from the bidders. In such a situation, the agency shall extend full co-operation. The bidders can also be asked to arrange demo. of the offered items, in a short period notice, as such the bidders have to be ready for the same.</li>
//                             <li className="niq-li">The acceptance of the quotation (Both foreign &amp; indigenous) will rest solely with the Director, IITG, who in the interest of the Institute is not bound to accept the lowest quotation and reserves the right to himself to reject or partially accept any or all the quotations received without assigning any reasons.</li>
//                             <li className="niq-li">Force Majeure (Both foreign &amp; indigenous): If the performance of the obligation of either party is rendered commercially impossible by any of the events hereafter mentioned that party shall be under no obligation to perform the agreement under order after giving notice of 15 days from the date of such an event in writing to the other party, and the events referred to are as follows: (I) any law, statute or ordinance, order action or regulations of the Government of India; (II) Any kind of natural disaster; and (III) Strikes, acts of the Public enemy, war, insurrections, riots, lockouts, sabotage.</li>
//                             <li className="niq-li">
//                                 Termination for default (Both foreign &amp; indigenous): Default is said to have occurred:
//                                 <ul className="niq-ul">
//                                     <li>If the supplier fails to deliver any or all of the services within the time period(s) specified in the purchase order or any extension thereof granted by IIT.</li>
//                                     <li>If the supplier fails to perform any other obligation(s) under the contract. If the vendor, in either of the above circumstances, does not take remedial steps within a period of 30 days after receipt of the default notice from IIT (or takes longer period in-spite of what IIT may authorize in writing), IIT may terminate the contract / purchase order in whole or in part and forfeit the EMD/PBG as applicable. In addition to above, IIT may at its discretion also take the following actions: IIT may procure, upon such terms and in such manner, as it deems appropriate, goods similar to the undelivered items/products and the defaulting supplier shall be liable to compensate IIT for any extra expenditure involved towards goods and services obtained.</li>
//                                 </ul>
//                             </li>
//                             <li className="niq-li">
//                                 <strong>Applicable Law (Both foreign &amp; indigenous):</strong>
//                                 <ol className="niq-ol-alpha">
//                                     <li>The contract shall be governed by the laws and procedures established by Govt. of India and subject to exclusive jurisdiction of Competent Court and Forum in Guwahati, India only.</li>
//                                     <li>Any dispute arising out of this purchase shall be referred to the Director IIT Guwahati, and if either of the parties hereto is dissatisfied with the decision, the dispute shall be referred to the decision of an Arbitrator, who should be acceptable to both the parties, to be appointed by the Director of the Institute. The decision of such Arbitrator shall be final and binding on both the parties.</li>
//                                 </ol>
//                             </li>

//                             {/* Additional Terms for Imported Goods */}
//                             <li className="niq-li" style={{ listStyle: 'none', marginTop: '8px', fontWeight: 'bold' }}>
//                                 ADDITIONAL TERMS FOR IMPORTED GOODS<br />
//                                 <span style={{ fontWeight: 'normal' }}>Following terms besides the fore mentioned terms will be applicable in case of foreign purchases:</span>
//                             </li>
//                             <li className="niq-li">
//                                 <strong>Rates:</strong> Quoted rates should be in FOR IITG else CIF/CIP Kolkata terms and charges to be stated in the following break-ups:
//                                 <ol className="niq-ol-alpha">
//                                     <li>Ex-works value</li>
//                                     <li>+ Documentation &amp; Handling Charge, if any</li>
//                                     <li>+ Estimated Overseas Freight to be paid at actual against authentic documents and monetary receipt</li>
//                                     <li>+ Estimated Overseas Insurance Charge to be paid at actual against authentic documents and monetary receipt (In case the firm holds open insurance policy, the Insurance Certificate relating to the consignment will have to be provided).</li>
//                                     <li>Total CIP/CIF Kolkata value</li>
//                                     <li>Estimate up to FOR IITG from Kolkata.</li>
//                                     <li>Total up to IITG.</li>
//                                 </ol>
//                             </li>
//                             <li className="niq-li">After Sales Service: In case of imported stores, foreign manufacturing firms should indicate facilities available for after sales service in India without which their offers are liable to be ignored.</li>
//                             <li className="niq-li">
//                                 Delivery:
//                                 <ol className="niq-ol-alpha">
//                                     <li>Delivery of goods at IIT Guwahati will have to be maximum within 95 (ninety-five) days from the date of issue of the Purchase Order.</li>
//                                     <li>Delivery at Kolkata Airport only: As we do not have clearing agent in any other Airport/Seaport, delivery is to be made only at Kolkata.</li>
//                                     <li>While transshipment will be allowed, part shipment will not be allowed.</li>
//                                 </ol>
//                             </li>
//                             <li className="niq-li">
//                                 Payment:
//                                 <ol className="niq-ol-alpha">
//                                     <li>Above $10,000.00: By an irrevocable letter of Credit at CIF/CIP Kolkata value negotiable through any overseas branch of State Bank of India/Canara Bank with unrestricted provision.</li>
//                                     <li>
//                                         Below $10,000.00 by FDD/Wire Transfer as given below:
//                                         <ol className="niq-ol-roman">
//                                             <li>Advance payment Against Bank Guarantee: 90% of the price will be paid in advance against equivalent bank guarantee from a scheduled bank provided by the supplier/Indian Agent. The remaining 10% shall be released only after receipt and acceptance of materials in good condition or after satisfactory installation and commissioning of the equipment. or</li>
//                                             <li>Payment Against Proof of Despatch: 90% of the price will be paid against receipt of proof of dispatch such as AWB, Invoice, Packing List, Insurance certificate, etc. The remaining 10% shall be released only after receipt and acceptance of materials in good condition or after satisfactory installation and commissioning of the equipment. or</li>
//                                             <li>100% Payment Basis: On request by the supplier/s 100% payment by FDD will be made. In this case on receipt of your Order Acknowledgement an FDD will be established for total ordered value, thereupon, a Xerox copy of the FDD will be sent to you which will enable you to send the materials. On satisfactory receipt and acceptance of the materials or satisfactory installation and commission of the equipment the Original FDD will be sent to you.</li>
//                                         </ol>
//                                         Note: Please note FDD/LoC will not be opened unless and until Letter of Acknowledgement in original is received at IIT Guwahati, directly from the principal (Even in case of firms having subsidiary office in India). The Indian agents are therefore advised to submit quotation after consultation with their respective principals.
//                                     </li>
//                                 </ol>
//                             </li>
//                             <li className="niq-li">Customs Duty: The Institute is generally exempted from payment of Customs Duty vide GOI Notification No. 51/96-Customs, dated 23.07.96, with Regn. No. TU/V/RG-CDE (351)/2006, dated 14.09.2006. [CUSTOMS DUTY EXEMPTION CERTIFICATE WILL BE MADE AVAILABLE BY THE INSTITUTE IN REGARD TO QUOTES IN FOREIGN CURRENCY ONLY [NOT AGAINST QUOTES MADE BY A FIRM IN INDIAN CURRENCY, UNLESS THE CONCERNED FIRM IS A FOREIGN HOLDING COMPANY WITH 'FDI' CERTIFICATE ISSUED BY THE MINISTRY OF FINANCE, GOVT. OF INDIA].</li>
//                             <li className="niq-li">Agency Commission: The percentage of ex-works value to be paid to Indian agent in equivalent Indian currency as agency commission as applicable will have to be clearly stated in the quotation.</li>
//                             <li className="niq-li">After Sales Service: For equipment to be imported the quotation will have to clearly state the available nearest after sales service centre and contact no. in India.</li>
//                             <li className="niq-li">Country of Origin: While Country of Origin Certificate will not be insisted, the same however will have to be stated in the Original Invoice for payment through LoC.</li>
//                             <li className="niq-li">LoC Amendment: LoC/FDD amendment charges due to mistake on the part of the supplier, if any, will have to be borne by the supplier.</li>

//                         </ol>

//                         {/* Freeform Editor for Titles, additional rules, or custom text */}
//                         <div
//                             className="niq-input niq-hide-empty-print"
//                             style={{
//                                 width: '100%',
//                                 minHeight: '3em',
//                                 margin: '8px 0',
//                                 display: 'block',
//                                 resize: 'none'
//                             }}
//                             contentEditable
//                             suppressContentEditableWarning
//                             data-empty={!additionalTerms}
//                             data-placeholder="[Add freeform additional rules, titles, or notes here. You can use the formatting toolbar! If left blank, this clause will not appear in print]"
//                             onInput={(e) => setAdditionalTerms(e.currentTarget.innerHTML)}
//                         />

//                         {/* ═══════════════════════════
//                             SIGNATURE
//                         ═══════════════════════════ */}
//                         <div style={{ marginTop: '16px' }}>
//                             <div><strong>Name:&nbsp;</strong>{indenterName}</div>
//                             <div style={{ marginTop: '2px' }}><strong>Designation:&nbsp;</strong>{designation}</div>
//                             <div style={{ marginTop: '2px' }}><strong>Department:&nbsp;</strong>{department || 'IIT Guwahati'}</div>
//                             <div style={{ marginTop: '2px' }}><strong>Address:&nbsp;</strong>IIT Guwahati, Guwahati-781039, Assam, India</div>
//                         </div>

//                     </div>{/* /A4 */}
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



// -=-=======================================================================



import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
    Printer, X, FileText,
    Loader2,
    Bold, Italic, Underline,
    AlignLeft, AlignCenter, AlignJustify,
    Undo, Redo,
} from 'lucide-react';

// ─── Print Styles ─────────────────────────────────────────────────────────────
const printStyles = `
@media print {
    /* We use margin 0 to hide browser URLs, while using our own layout-table */
    @page { size: A4; margin: 0; }
    
    table.niq-layout-table { width: 100%; border-collapse: collapse; border: none; }
    table.niq-layout-table > thead > tr > td,
    table.niq-layout-table > tbody > tr > td, 
    table.niq-layout-table > tfoot > tr > td { border: none !important; padding: 0 !important; margin: 0 !important; }
    
    /* These spaces repeat on EVERY page perfectly */
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

    /* ── Hide ALL app chrome ── */
    .no-print, header, aside, .sidebar, [data-sidebar="sidebar"], [data-sidebar], nav, button { 
        display: none !important; 
    }

    /* Aggressive margin/padding resets for standard layout wrappers to avoid Sidebar ghost gaps */
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

    /* Neutralize inline variables globally */
    * {
        --sidebar-width: 0px !important;
        --sidebar-width-mobile: 0px !important;
        --sidebar-width-icon: 0px !important;
    }

    /* Force generic wrapper divs below root to remove padding/margin (fixes Shadcn sidebars) */
    body > div, #root > div, #root > div > div {
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        background: white !important;
    }

    .bg-zinc-100 { 
        background-color: white !important; 
    }

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
        padding: 0 15mm !important; /* Left & right margins only. Top/Bottom handled by thead/tfoot spacers! */
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
    .niq-input::placeholder {
        color: transparent !important;
    }
    .niq-input[contenteditable]:empty::before {
        content: "";
    }

    .niq-hide-empty-print:empty,
    .niq-hide-empty-print[data-empty="true"] {
        display: none !important;
    }

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

    /* Force table borders to print in black */
    table.niq-table {
        border-collapse: collapse !important;
        border-spacing: 0 !important;
    }
    table.niq-table th,
    table.niq-table td {
        border: 1pt solid #000 !important;
        background-clip: padding-box !important;
    }
    /* Force header background to print */
    .niq-th {
        background-color: #e5e7eb !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

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
.niq-input::placeholder {
    color: #f87171;
    opacity: 1;
}
.niq-input[contenteditable]:empty::before {
    content: attr(data-placeholder);
    color: #f87171;
    opacity: 1;
    cursor: text;
}
.niq-input:focus {
    border-bottom: 1px solid #dc2626;
    background: #fecdd3;
    color: #7f1d1d;
}

/* Inline editable field */
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
.niq-center-header {
    display: block;
    text-align: center;
    font-weight: bold;
    text-decoration: underline;
    font-size: 13px;
    margin: 18px 0 10px;
}
@media print {
    .niq-field-editable {
        border: none !important;
        background: transparent !important;
    }
}

/* Hide print footer on screen */
.niq-page-footer { display: none; }
`;

// ─── Editable inline span ─────────────────────────────────────────────────────
const E = ({ value, className = '' }: { value: string; className?: string }) => (
    <span
        contentEditable
        suppressContentEditableWarning
        className={`niq-field-editable ${className}`}
    >
        {value}
    </span>
);

// ─── Plain input (for phone/fax/email/niq/date) ───────────────────────────────
const F = ({
    id,
    defaultValue = '',
    placeholder = '______',
    style,
}: {
    id: string;
    defaultValue?: string;
    placeholder?: string;
    style?: React.CSSProperties;
}) => (
    <span
        id={id}
        className="niq-input"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{
            display: 'inline-block',
            minWidth: '30px', /* Greatly reduced to prevent the huge gap */
            ...style
        }}
    >
        {defaultValue}
    </span>
);

// ─── Toolbar ──────────────────────────────────────────────────────────────────
const Toolbar = ({ onClose }: { onClose: () => void }) => (
    <div className="sticky top-4 self-start flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg no-print z-10 h-fit">
        <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-700">
            <button
                onClick={() => window.print()}
                title="Print NIQ"
                className="p-2 bg-[#D97757] text-white hover:bg-[#b35d41] rounded-lg transition-colors flex items-center justify-center"
            >
                <Printer className="w-5 h-5" />
            </button>
            <button
                onClick={onClose}
                title="Close"
                className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center"
            >
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Text Formatting */}
        <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-700">
            <button onClick={() => document.execCommand('bold')} title="Bold" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Bold className="w-4 h-4" /></button>
            <button onClick={() => document.execCommand('italic')} title="Italic" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Italic className="w-4 h-4" /></button>
            <button onClick={() => document.execCommand('underline')} title="Underline" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Underline className="w-4 h-4" /></button>
        </div>

        {/* Alignment */}
        <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200 dark:border-zinc-700">
            <button onClick={() => document.execCommand('justifyLeft')} title="Align Left" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><AlignLeft className="w-4 h-4" /></button>
            <button onClick={() => document.execCommand('justifyCenter')} title="Align Center" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><AlignCenter className="w-4 h-4" /></button>
            <button onClick={() => document.execCommand('justifyFull')} title="Justify" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><AlignJustify className="w-4 h-4" /></button>
        </div>

        {/* History */}
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

interface CommitteeMember {
    igf_webmail_id?: string;
    igf_member_name?: string;
    igf_designation?: string;
}

interface IGFData {
    name: string;
    igf_indenter?: string;
    igf_indenter_designation?: string;
    igf_department_centre_section?: string;
    igf_project_code?: string;
    igf_project_title?: string;
    igf_webmail_id?: string;
    igf_webmail_user_id?: string;
    igf_items?: IGFItem[];
    igf_committee_members?: CommitteeMember[];
    igf_total_estimate?: number | string;
    igf_tender_type?: string;
    igf_number_of_bids?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number | string | undefined) =>
    n !== undefined && n !== ''
        ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : '—';

const normalizeEmail = (raw?: string | null) => {
    if (!raw) return null;
    return raw.includes('@') ? raw : `${raw}@iitg.ac.in`;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const NIQPage: React.FC = () => {
    const navigate = useNavigate();
    const { id, igfId } = useParams<{ id?: string, igfId?: string }>();
    const location = useLocation();

    const [igf, setIgf] = useState<IGFData | null>(null);
    const [deptLabel, setDeptLabel] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [additionalTerms, setAdditionalTerms] = useState<string>('');

    const docId = id ?? igfId ?? (location.state as any)?.application?.id ?? '';

    useEffect(() => {
        if (!docId) { setLoading(false); return; }
        const fetchIGF = async () => {
            try {
                const res = await fetch(
                    `/api/resource/Indent%20General%20Form/${encodeURIComponent(docId)}`,
                    { headers: { Accept: 'application/json' }, credentials: 'include' }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const data: IGFData = json.data;
                setIgf(data);

                // Resolve dept_name from Department_prornd doctype
                const deptId = data.igf_department_centre_section;
                if (deptId) {
                    try {
                        const dRes = await fetch(
                            `/api/method/frappe.client.get_value?doctype=Department_prornd&filters=${encodeURIComponent(deptId)}&fieldname=dept_name`,
                            { headers: { Accept: 'application/json' }, credentials: 'include' }
                        );
                        if (dRes.ok) {
                            const dJson = await dRes.json();
                            setDeptLabel(dJson?.message?.dept_name || deptId);
                        } else {
                            setDeptLabel(deptId);
                        }
                    } catch {
                        setDeptLabel(deptId);
                    }
                }

                // Attempt to deeply resolve PI email if the primary header is blank
                const piMember = data.igf_committee_members?.find(m => m.igf_designation === 'PI');
                const piEmail = piMember?.igf_webmail_id;

                // Resolve real user name and designation dynamically
                const emailToFetch =
                    normalizeEmail(data.igf_webmail_id) ||
                    normalizeEmail(data.igf_webmail_user_id) ||
                    normalizeEmail(piEmail);
                if (emailToFetch) {
                    try {
                        const uRes = await fetch(
                            '/api/method/rndopsapp.rndopsapp.api.get_user_details',
                            {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json'
                                },
                                credentials: 'include',
                                body: JSON.stringify({ user_email: emailToFetch })
                            }
                        );
                        if (uRes.ok) {
                            const uJson = await uRes.json();
                            if (uJson.message) {
                                // Explicitly update with the freshly fetched user data
                                data.igf_indenter = uJson.message.full_name || data.igf_indenter;
                                data.igf_indenter_designation = uJson.message.designation_name || data.igf_indenter_designation;
                                // Force hard override to guarantee React re-render of literal fetch
                                if (uJson.message.full_name) {
                                    data.igf_indenter = uJson.message.full_name;
                                }
                                setIgf({ ...data }); // Trigger re-render with fetched details
                            }
                        }
                    } catch (e) {
                        console.error('Failed to fetch user details:', e);
                    }
                }

                // If completely blank after everything, forcefully fallback to the PI name from committee
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

    const today = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
    });

    const printedAt = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });

    const indenterName = igf?.igf_indenter || '';
    const designation = igf?.igf_indenter_designation || 'Principal Investigator';
    const department = deptLabel || igf?.igf_department_centre_section || '';
    // Use || (not ??) so that empty-string fields also fall back to docId
    const projectCode = igf?.igf_project_code || docId || '';
    const projectTitle = igf?.igf_project_title ?? '';
    const items: IGFItem[] = igf?.igf_items ?? [];
    const committee: CommitteeMember[] = igf?.igf_committee_members ?? [];
    const totalQty = items.reduce((s, r) => s + (Number(r.igf_quantity) || 0), 0);
    const totalAmt = Number(igf?.igf_total_estimate ?? 0);

    // Compose item name summary for the NIQ title (first item + "etc." if more)
    const itemSummary = items.length > 0
        ? items.length === 1
            ? items[0].igf_item_name ?? ''
            : `${items[0].igf_item_name ?? ''} and ${items.length - 1} other item${items.length > 2 ? 's' : ''}`
        : '';

    const defaultNIQNo = `IITG/II&SI/PROJECT/${projectCode}`;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
                <div className="flex flex-col items-center gap-3 text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D97757]" />
                    <p className="text-sm">Loading NIQ data…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
                <div className="text-center">
                    <p className="text-red-500 font-medium">{error}</p>
                    <button onClick={() => navigate(-1)} className="mt-4 text-sm text-zinc-500 underline">Go back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-100 dark:bg-zinc-950 min-h-screen">
            <style>{printStyles}</style>

            <main className="p-4 md:p-8 w-full">
                <div className="niq-scroll-wrapper flex justify-center items-start gap-4 max-h-[calc(100vh-4rem)] overflow-y-auto">

                    {/* ── Toolbar ── */}
                    <div className="niq-toolbar-wrapper sticky top-4">
                        <Toolbar onClose={() => navigate(-1)} />
                    </div>

                    {/* ── A4 Paper ── */}
                    <div
                        className="print-container bg-white text-black shadow-2xl relative"
                        style={{
                            width: '210mm',
                            minHeight: '297mm',
                            padding: '0',
                            fontFamily: '"Times New Roman", Times, serif',
                            fontSize: '11.5px',
                            lineHeight: '1.45',
                        }}
                    >
                        <div className="niq-layout-content-wrapper" style={{ padding: '0 15mm' }}>
                            <table className="niq-layout-table">
                                <thead>
                                    <tr><td><div className="header-space" style={{ height: '12mm' }} /></td></tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            {/* ═══════════════════════════
                                                HEADER
                                            ═══════════════════════════ */}
                                            <table className="avoid-break" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', marginTop: '6mm' }}>
                                                <tbody>
                                                    <tr>
                                                        {/* Left – logo + institute */}
                                                        <td style={{ width: '65%', verticalAlign: 'top', padding: '6px 10px 10px 0', borderBottom: '2px solid black' }}>
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                                <img
                                                                    src="http://172.16.131.206:8000/files/IITG_logo.png"
                                                                    alt="IITG"
                                                                    style={{ width: '55px', height: 'auto', flexShrink: 0 }}
                                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                />
                                                                <div>
                                                                    <strong style={{ display: 'block', fontSize: '12.5px' }}>
                                                                        Research and Development Section
                                                                    </strong>
                                                                    <strong style={{ display: 'block', fontSize: '11.5px', marginTop: '3px' }}>
                                                                        Indian Institute of Technology Guwahati<br />
                                                                        Guwahati-781039, Assam, India
                                                                    </strong>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Right – contact */}
                                                        <td style={{ width: '35%', verticalAlign: 'top', padding: '6px 0 10px 10px', borderLeft: '1px solid #ccc', borderBottom: '2px solid black' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                                                <tbody>
                                                                    <tr>
                                                                        <td style={{ fontWeight: 'bold', whiteSpace: 'nowrap', paddingRight: '4px', width: '68px' }}>Phone Nos.</td>
                                                                        <td style={{ whiteSpace: 'nowrap', width: '8px' }}>:</td>
                                                                        <td>+91-361-258-<E value="3431" /></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td></td>
                                                                        <td style={{ whiteSpace: 'nowrap' }}>:</td>
                                                                        <td>+91-361-258-<E value="3430" /></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style={{ fontWeight: 'bold' }}>Fax</td>
                                                                        <td>:</td>
                                                                        <td>+91-361-258-<E value="2089" /></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td></td>
                                                                        <td>:</td>
                                                                        <td>+91-361-269-<E value="2005" /></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style={{ fontWeight: 'bold' }}>Email</td>
                                                                        <td>:</td>
                                                                        <td>{normalizeEmail(igf?.igf_webmail_id) || normalizeEmail(igf?.igf_webmail_user_id) || 'iiisi@iitg.ac.in'}</td>
                                                                    </tr>
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

                                            {/* Date and NIQ No moved below and aligned right */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '35px', marginTop: '15px' }}>
                                                <div style={{ width: '35%', paddingLeft: '10px' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                                        <tbody>
                                                            <tr>
                                                                <td style={{ fontWeight: 'bold', whiteSpace: 'nowrap', paddingRight: '4px', width: '68px' }}>Date</td>
                                                                <td style={{ whiteSpace: 'nowrap', width: '8px' }}>:</td>
                                                                <td><strong>{today}</strong></td>
                                                            </tr>
                                                            <tr>
                                                                <td style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>NIQ No.</td>
                                                                <td>:</td>
                                                                <td style={{ wordBreak: 'break-all' }}>{defaultNIQNo}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* ═══════════════════════════
                            NIQ TITLE
                        ═══════════════════════════ */}
                                            <p style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '12px', marginTop: '20px', marginBottom: '14px', lineHeight: '1.6' }}>
                                                NOTICE INVITING QUOTATION FOR SUPPLY &amp; INSTALLATION OF{' '}
                                                {itemSummary || '[Item Name]'}{' '}
                                                FOR THE DEPARTMENT OF{' '}
                                                {department || '[Department]'}{' '}
                                                (PROJECT NO. {projectCode}), IIT GUWAHATI.
                                            </p>

                                            {/* Submission note */}
                                            <p style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '12px', marginTop: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                                                Quotations for supply of equipment as per details at <strong>ANNEXURE-I</strong>, in single bid
                                                as indicated in the CHECKLIST given below, in sealed covers, are hereby invited so as to
                                                reach the undersigned on or before{' '}
                                                <F id="lastDate" placeholder="[Date]" />.
                                            </p>

                                            {/* ═══════════════════════════
                            ITEMS TABLE (ANNEXURE-I inline summary)
                        ═══════════════════════════ */}
                                            {false && items.length > 0 && (
                                                <div style={{ marginBottom: '10px' }}>
                                                    <p style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>
                                                        ANNEXURE-I: Details of Items to be Purchased
                                                    </p>
                                                    <table className="niq-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                                                        <thead>
                                                            <tr>
                                                                <th className="niq-th" style={thStyle}>#</th>
                                                                <th className="niq-th" style={thStyle}>Item Name</th>
                                                                <th className="niq-th" style={thStyle}>Description</th>
                                                                <th className="niq-th" style={thStyle}>Qty</th>
                                                                <th className="niq-th" style={thStyle}>Rate (₹)</th>
                                                                <th className="niq-th" style={thStyle}>Amount (₹)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {items.map((item, i) => (
                                                                <tr key={i}>
                                                                    <td style={tdCenterStyle}>{i + 1}</td>
                                                                    <td style={tdStyle}>{item.igf_item_name ?? '—'}</td>
                                                                    <td style={tdStyle}>{item.igf_item_description ?? '—'}</td>
                                                                    <td style={tdCenterStyle}>{item.igf_quantity ?? '—'}</td>
                                                                    <td style={tdRightStyle}>{Number(item.igf_estimated_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                                    <td style={tdRightStyle}>{Number(item.igf_estimated_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr className="niq-tfoot" style={{ fontWeight: 'bold' }}>
                                                                <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>Grand Total</td>
                                                                <td style={tdCenterStyle}>{totalQty}</td>
                                                                <td style={tdRightStyle}></td>
                                                                <td style={tdRightStyle}>{fmt(totalAmt)}</td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            )}

                                            {/* ═══════════════════════════
                            PURCHASE COMMITTEE
                        ═══════════════════════════ */}
                                            {false && committee.length > 0 && (
                                                <div style={{ marginBottom: '10px' }}>
                                                    <p style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>
                                                        Purchase Committee
                                                    </p>
                                                    <table className="niq-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                                                        <thead>
                                                            <tr>
                                                                <th className="niq-th" style={thStyle}>#</th>
                                                                <th className="niq-th" style={thStyle}>Name</th>
                                                                <th className="niq-th" style={thStyle}>Webmail ID</th>
                                                                <th className="niq-th" style={thStyle}>Role</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {committee.map((m, i) => (
                                                                <tr key={i}>
                                                                    <td style={tdCenterStyle}>{i + 1}</td>
                                                                    <td style={tdStyle}>{m.igf_member_name ?? '—'}</td>
                                                                    <td style={tdStyle}>{m.igf_webmail_id ?? '—'}</td>
                                                                    <td style={tdStyle}>{m.igf_designation ?? '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {/* ═══════════════════════════
                            INSTRUCTIONS TO BIDDERS
                        ═══════════════════════════ */}
                                            <span className="niq-center-header">INSTRUCTION TO BIDDERS</span>
                                            <p style={{ fontWeight: 'bold', marginBottom: '3px' }}>
                                                {igf?.igf_number_of_bids?.startsWith('Single') || !igf?.igf_number_of_bids
                                                    ? 'Single Bid:'
                                                    : 'Double Bid:'}
                                            </p>
                                            <ol className="niq-ol" contentEditable suppressContentEditableWarning>
                                                <li className="niq-li">
                                                    In case of single bid, quotations will have to be submitted in a single bid, in a properly
                                                    sealed cover; and the address of the firm submitting the quotation and the Officer to whom
                                                    the quotation is addressed, must appear distinctly on the sealed cover. Further, on the sealed
                                                    cover the following are to be written:{' '}
                                                    <strong>
                                                        'QUOTATION FOR SUPPLY &amp; INSTALLATION OF{' '}
                                                        {itemSummary || '[Item]'}{' '}
                                                        FOR THE DEPARTMENT OF {department || '[Dept]'}{' '}
                                                        (PROJECT NO. {projectCode}), IIT GUWAHATI.{' '}
                                                        VIDE NIQ NO. {defaultNIQNo},{' '}
                                                        LAST DATE FOR SUBMISSION <F id="lastDateRef" placeholder="[Date]" />'
                                                    </strong>
                                                    <br />
                                                    <strong>NOTE:</strong> The bid documents are not transferable and the firm's seal and signature
                                                    of the authorized official must appear on all the papers and envelopes submitted.
                                                </li>
                                                <li className="niq-li">The bid must mention the prices of all items asked for individually and then summed up — basic price and other charges such as Packing, Freight, Insurance, Installation &amp; Commissioning charge, VAT/Tax etc. as applicable.</li>
                                                <li className="niq-li">Annual Maintenance Contract (AMC) rate (after expiry of warranty period) is to be clearly indicated – preferably in both comprehensive and non-comprehensive terms, failure to which the offer may not be considered even if it turns out to be at the lowest price.</li>
                                                <li className="niq-li">Details of the technical features of the offered equipment along with Standard Technical literature on each of the items offered.</li>
                                                <li className="niq-li">Dealership certificate on the offered products in case of dealer/s.</li>
                                                <li className="niq-li">List of reputed organizations/Institutions, where similar orders have been executed (copies of the purchase/work orders will have to be enclosed).</li>
                                                <li className="niq-li">Up-to-date Sales Tax clearance certificate (for vendors outside the State of Assam) / VAT Registration Certificate indicating also the TIN number (for vendors from within the State of Assam) OF THE FIRM will have to accompany the quotation to be submitted.</li>
                                                <li className="niq-li">Details of nature and maximum period of warranty offered by the vendor.</li>
                                                <li className="niq-li">After Sales Service: The name &amp; address of the nearest available authorized service centre to IIT, North Guwahati, should be stated in the quotation.</li>
                                            </ol>

                                            {/* ═══════════════════════════
                            TERMS & CONDITIONS
                        ═══════════════════════════ */}
                                            <p style={{ fontWeight: 'bold', marginTop: '8px', marginBottom: '2px' }}>TERMS &amp; CONDITIONS:</p>
                                            <p className="niq-li" style={{ marginBottom: '5px' }}>
                                                (Please note the term 'both foreign &amp; indigenous' wherever mentioned means the term is applicable to both foreign &amp; indigenous purchase)
                                            </p>
                                            <ol className="niq-ol" contentEditable suppressContentEditableWarning>
                                                <li className="niq-li">
                                                    <strong>Rates:</strong> Rates quoted for indigenous items should be on FOR IIT Guwahati, on DOOR DELIVERY basis, with break-ups as per details below (For import items please refer 'Additional Terms for imported goods' at clause No. 25 below). Break-ups of cost:
                                                    <ol className="niq-ol-alpha">
                                                        <li>Basic Price</li>
                                                        <li>(+) Central Excise Duty, if any</li>
                                                        <li>(+) VAT / Central Sales Tax (On Sub-Total Price, including Excise Duty, if any)</li>
                                                        <li>(+) Freight &amp; Insurance Charge, if any</li>
                                                        <li>(+) Installation &amp; Commissioning Charge, if any</li>
                                                        <li>Grand Total F.O.R. IIT Guwahati Price</li>
                                                    </ol>
                                                    Note: Vague terms like "packing, forwarding, transportation etc. extra" without mentioning the specific amount will not be accepted. Such offers shall be treated as incomplete and rejected. Bidders shall indicate their rates in clear/visible figures as well as in words and shall not alter/overwrite/make cutting in the quotation. In case of a mismatch, the rates written in words will prevail.
                                                </li>
                                                <li className="niq-li">Validity (Both foreign &amp; indigenous): Quoted rates must be valid for 120 days.</li>
                                                <li className="niq-li">
                                                    <strong>Performance Bank Guarantee (Both foreign &amp; indigenous):</strong> The successful bidder shall furnish an unconditional Performance Bank Guarantee valid till 60 days after the warranty period from a scheduled Bank for 10% of the Purchase Order value within 21 days of placement of order failing which the contract shall be deemed as terminated (APPLICABLE ONLY TO ORDERS COSTING MORE THAN INR 5,00,000.00). That:
                                                    <ol className="niq-ol-alpha">
                                                        <li>The Vendor shall provide a Certificate of Guarantee guaranteeing satisfactory operation of the components and against poor workmanship, bad quality of materials used, faulty designs and performance figures given by the Vendor.</li>
                                                        <li>This guarantee shall be operative for a period of 60 days after the warranty period. The performance guarantee would be to the extent of 10% of the order value.</li>
                                                        <li>The Vendor shall at his own cost rectify the defects/replace the items supplied, for defects identified during the period of guarantee.</li>
                                                        <li>While clauses 3(a), 3(b) and 3(c) are applicable to all orders worth Rs. 5 Lakhs or more, competent authority may take appropriate decisions on exceptional cases.</li>
                                                    </ol>
                                                </li>
                                                <li className="niq-li">
                                                    <strong>PENALTY for delayed delivery (for both foreign &amp; indigenous):</strong> The date of delivery shall be strictly adhered to, except in cases of Force Majeure or extension of the delivery date duly approved by IIT Guwahati. In the event of delayed delivery and acceptance by the end user, the vendor shall be liable for a penalty deduction at the rate of 0.5% per week or part thereof of the value of the entire consignment, subject to a maximum of 10% (ten percent).
                                                    For the purpose of this clause, part of a week shall be treated as a full week. In case of delayed delivery, IIT Guwahati reserves the right not to accept the consignment.
                                                </li>
                                                <li className="niq-li">In case of indigenous supplies, the goods should be insured against theft, loss or breakage during transit and insurance charges should not exceed 1% of the cost of material supplied, the rates of Sales Tax, Excise Duty etc. (as applicable) should be clearly indicated. Form C &amp; D is not applicable to us. However, we are exempted from payment of Excise Duty and certificate to this effect can be provided.</li>
                                                <li className="niq-li">Penalty for delayed supply (Both foreign &amp; indigenous): In case of supply order for the SCIENTIFIC EQUIPMENTS / APPARATUS, the date of delivery should be strictly adhered to otherwise the Director, IITG reserves the right not to accept delivery in part or full and claim liquidated damages of 1% per week subject to maximum of 10% of the total value of supply.</li>
                                                <li className="niq-li">Pre-installation requisites (Both foreign &amp; indigenous): Pre-installation requisites (electrical/floor/space/air-conditioning etc.) if any should invariably be mentioned clearly. Installation / Training will be the full responsibility of the supplier / Indian Agent.</li>
                                                <li className="niq-li">Short Shipment (Both foreign &amp; indigenous): If any short-shipment etc. is noticed, the same will be arranged immediately with all charges to this effect to be borne by supplier/Indian agent.</li>
                                                <li className="niq-li">Genuine Pricing (Both foreign &amp; indigenous): Vendor is to ensure that quoted price is not more than the price offered to any other customer in India to whom this particular item has been sold, particularly to IIT/Institutes and other Government Organization. Copy of the latest price list for the quoted item, applicable in India, must be enclosed with your offer.</li>
                                                <li className="niq-li">Excise Duty: The Institute is exempted from payment of Central Excise Duty vide GOI Notification No. 10/97-Central Excise, dated 01.03.97 with Regn. No. TU/V/RG-CDE (351)/2011, dated 19.09.2011.</li>
                                                <li className="niq-li">VAT: For a vendor within the State of Assam, appropriate VAT (to be deducted at source) will be applicable. For exemption from Octroi, wherever required, the Institute will issue necessary certificates.</li>
                                                <li className="niq-li">Entry Tax: Assam Govt. Entry Tax – usually @4% [to be paid by IIT Guwahati, not by the vendor], wherever applicable, will be added while evaluating cost status of the concerned equipment to be supplied by vendors from outside the State of Assam.</li>
                                                <li className="niq-li">
                                                    <strong>Delivery:</strong>
                                                    <ol className="niq-ol-alpha">
                                                        <li>Delivery of goods at IIT Guwahati will have to be maximum within 45 (Forty-five) days from the date of issue of the Purchase Order.</li>
                                                        <li>Safe delivery of goods: All aspects of safe delivery shall be the exclusive responsibility of the vendor. At the destination site, the cartons will be opened only in the presence of IIT user/representative and vendor's representative and the intact position of the seal for not being tempered with, shall form the basis for certifying the receipt in good condition.</li>
                                                        <li>No Part Delivery: part shipment will not be allowed.</li>
                                                    </ol>
                                                </li>
                                                <li className="niq-li">
                                                    Mode of Payment for Indigenous Purchase (For import items please refer 'Additional Terms for imported goods' clause No. 28 below):
                                                    <ol className="niq-ol-alpha">
                                                        <li>Payment for Indigenous Purchases will be maximum within 45 days from the date of successful delivery and installation of goods at IIT Guwahati, North-Guwahati, generally through A/c payee cheque. In case payment is to be made by DD, the Draft commission will be deducted from the bill amount. or</li>
                                                        <li>Payment through bank against proof of dispatch: 90% payment shall be released on receipt of proof of dispatch through State Bank Of India, IITG Branch, Guwahati-781039, Assam (Contact No. 0361-2582106). Balance 10% shall be released after installation / handing over of the equipment to the consignee(s).</li>
                                                    </ol>
                                                    Note: Please note as per Institute's norm advance payment is not allowed for indigenous purchase.
                                                </li>
                                                <li className="niq-li">Quotation by Fax/Mail not Acceptable (Both foreign &amp; indigenous): The offers submitted by telex / telegram / fax / E-mail etc. shall not be considered. No correspondence will be entertained on this matter.</li>
                                                <li className="niq-li">Late and delayed tender (Both foreign &amp; indigenous): Late and delayed tender will not be considered. In case any unscheduled holiday occurs on prescribed closing/opening date the next working day shall be the prescribed date of closing/opening.</li>
                                                <li className="niq-li">Conditional tenders not acceptable (Both foreign &amp; indigenous): Conditional tenders shall not be accepted on any ground and shall be rejected straightway. In other words, printed conditions mentioned in the tender bids submitted by vendors will not be binding on IITG. All the terms and conditions for the supply, payment terms, penalty etc. will be as those mentioned herein and no change in the terms and conditions by the vendors will be acceptable.</li>
                                                <li className="niq-li">Specifications are basic essence of the product (Both foreign &amp; indigenous): It must be ensured that the offers are strictly as per our specifications. At the same time it must also be kept in mind that merely copying our specifications in their quotation shall not make firms eligible for consideration. A quotation has to be supported with the printed technical leaflet/literature (wherever applicable) and the specifications mentioned in the quotation must be reflected / supported by such printed technical leaflet/literature — model quoted/tendered specifications should invariably be highlighted in the leaflet/literature for easy reference.</li>
                                                <li className="niq-li">Enquiry during the course of evaluation not allowed (Both foreign &amp; indigenous): No enquiry shall be made by the bidder(s) during the course of evaluation of the tender till final decision is conveyed to the successful bidder(s). However, the Committee/its authorized representative and office of IIT GUWAHATI can make any enquiry/seek clarification from the bidders. In such a situation, the agency shall extend full co-operation. The bidders can also be asked to arrange demo. of the offered items, in a short period notice, as such the bidders have to be ready for the same.</li>
                                                <li className="niq-li">The acceptance of the quotation (Both foreign &amp; indigenous) will rest solely with the Director, IITG, who in the interest of the Institute is not bound to accept the lowest quotation and reserves the right to himself to reject or partially accept any or all the quotations received without assigning any reasons.</li>
                                                <li className="niq-li">Force Majeure (Both foreign &amp; indigenous): If the performance of the obligation of either party is rendered commercially impossible by any of the events hereafter mentioned that party shall be under no obligation to perform the agreement under order after giving notice of 15 days from the date of such an event in writing to the other party, and the events referred to are as follows: (I) any law, statute or ordinance, order action or regulations of the Government of India; (II) Any kind of natural disaster; and (III) Strikes, acts of the Public enemy, war, insurrections, riots, lockouts, sabotage.</li>
                                                <li className="niq-li">
                                                    Termination for default (Both foreign &amp; indigenous): Default is said to have occurred:
                                                    <ul className="niq-ul">
                                                        <li>If the supplier fails to deliver any or all of the services within the time period(s) specified in the purchase order or any extension thereof granted by IIT.</li>
                                                        <li>If the supplier fails to perform any other obligation(s) under the contract. If the vendor, in either of the above circumstances, does not take remedial steps within a period of 30 days after receipt of the default notice from IIT (or takes longer period in-spite of what IIT may authorize in writing), IIT may terminate the contract / purchase order in whole or in part and forfeit the EMD/PBG as applicable. In addition to above, IIT may at its discretion also take the following actions: IIT may procure, upon such terms and in such manner, as it deems appropriate, goods similar to the undelivered items/products and the defaulting supplier shall be liable to compensate IIT for any extra expenditure involved towards goods and services obtained.</li>
                                                    </ul>
                                                </li>
                                                <li className="niq-li">
                                                    <strong>Applicable Law (Both foreign &amp; indigenous):</strong>
                                                    <ol className="niq-ol-alpha">
                                                        <li>The contract shall be governed by the laws and procedures established by Govt. of India and subject to exclusive jurisdiction of Competent Court and Forum in Guwahati, India only.</li>
                                                        <li>Any dispute arising out of this purchase shall be referred to the Director IIT Guwahati, and if either of the parties hereto is dissatisfied with the decision, the dispute shall be referred to the decision of an Arbitrator, who should be acceptable to both the parties, to be appointed by the Director of the Institute. The decision of such Arbitrator shall be final and binding on both the parties.</li>
                                                    </ol>
                                                </li>

                                                {/* Additional Terms for Imported Goods */}
                                                <li className="niq-li" style={{ listStyle: 'none', marginTop: '8px', fontWeight: 'bold' }}>
                                                    ADDITIONAL TERMS FOR IMPORTED GOODS<br />
                                                    <span style={{ fontWeight: 'normal' }}>Following terms besides the fore mentioned terms will be applicable in case of foreign purchases:</span>
                                                </li>
                                                <li className="niq-li">
                                                    <strong>Rates:</strong> Quoted rates should be in FOR IITG else CIF/CIP Kolkata terms and charges to be stated in the following break-ups:
                                                    <ol className="niq-ol-alpha">
                                                        <li>Ex-works value</li>
                                                        <li>+ Documentation &amp; Handling Charge, if any</li>
                                                        <li>+ Estimated Overseas Freight to be paid at actual against authentic documents and monetary receipt</li>
                                                        <li>+ Estimated Overseas Insurance Charge to be paid at actual against authentic documents and monetary receipt (In case the firm holds open insurance policy, the Insurance Certificate relating to the consignment will have to be provided).</li>
                                                        <li>Total CIP/CIF Kolkata value</li>
                                                        <li>Estimate up to FOR IITG from Kolkata.</li>
                                                        <li>Total up to IITG.</li>
                                                    </ol>
                                                </li>
                                                <li className="niq-li">After Sales Service: In case of imported stores, foreign manufacturing firms should indicate facilities available for after sales service in India without which their offers are liable to be ignored.</li>
                                                <li className="niq-li">
                                                    Delivery:
                                                    <ol className="niq-ol-alpha">
                                                        <li>Delivery of goods at IIT Guwahati will have to be maximum within 95 (ninety-five) days from the date of issue of the Purchase Order.</li>
                                                        <li>Delivery at Kolkata Airport only: As we do not have clearing agent in any other Airport/Seaport, delivery is to be made only at Kolkata.</li>
                                                        <li>While transshipment will be allowed, part shipment will not be allowed.</li>
                                                    </ol>
                                                </li>
                                                <li className="niq-li">
                                                    Payment:
                                                    <ol className="niq-ol-alpha">
                                                        <li>Above $10,000.00: By an irrevocable letter of Credit at CIF/CIP Kolkata value negotiable through any overseas branch of State Bank of India/Canara Bank with unrestricted provision.</li>
                                                        <li>
                                                            Below $10,000.00 by FDD/Wire Transfer as given below:
                                                            <ol className="niq-ol-roman">
                                                                <li>Advance payment Against Bank Guarantee: 90% of the price will be paid in advance against equivalent bank guarantee from a scheduled bank provided by the supplier/Indian Agent. The remaining 10% shall be released only after receipt and acceptance of materials in good condition or after satisfactory installation and commissioning of the equipment. or</li>
                                                                <li>Payment Against Proof of Despatch: 90% of the price will be paid against receipt of proof of dispatch such as AWB, Invoice, Packing List, Insurance certificate, etc. The remaining 10% shall be released only after receipt and acceptance of materials in good condition or after satisfactory installation and commissioning of the equipment. or</li>
                                                                <li>100% Payment Basis: On request by the supplier/s 100% payment by FDD will be made. In this case on receipt of your Order Acknowledgement an FDD will be established for total ordered value, thereupon, a Xerox copy of the FDD will be sent to you which will enable you to send the materials. On satisfactory receipt and acceptance of the materials or satisfactory installation and commission of the equipment the Original FDD will be sent to you.</li>
                                                            </ol>
                                                            Note: Please note FDD/LoC will not be opened unless and until Letter of Acknowledgement in original is received at IIT Guwahati, directly from the principal (Even in case of firms having subsidiary office in India). The Indian agents are therefore advised to submit quotation after consultation with their respective principals.
                                                        </li>
                                                    </ol>
                                                </li>
                                                <li className="niq-li">Customs Duty: The Institute is generally exempted from payment of Customs Duty vide GOI Notification No. 51/96-Customs, dated 23.07.96, with Regn. No. TU/V/RG-CDE (351)/2006, dated 14.09.2006. [CUSTOMS DUTY EXEMPTION CERTIFICATE WILL BE MADE AVAILABLE BY THE INSTITUTE IN REGARD TO QUOTES IN FOREIGN CURRENCY ONLY [NOT AGAINST QUOTES MADE BY A FIRM IN INDIAN CURRENCY, UNLESS THE CONCERNED FIRM IS A FOREIGN HOLDING COMPANY WITH 'FDI' CERTIFICATE ISSUED BY THE MINISTRY OF FINANCE, GOVT. OF INDIA].</li>
                                                <li className="niq-li">Agency Commission: The percentage of ex-works value to be paid to Indian agent in equivalent Indian currency as agency commission as applicable will have to be clearly stated in the quotation.</li>
                                                <li className="niq-li">After Sales Service: For equipment to be imported the quotation will have to clearly state the available nearest after sales service centre and contact no. in India.</li>
                                                <li className="niq-li">Country of Origin: While Country of Origin Certificate will not be insisted, the same however will have to be stated in the Original Invoice for payment through LoC.</li>
                                                <li className="niq-li">LoC Amendment: LoC/FDD amendment charges due to mistake on the part of the supplier, if any, will have to be borne by the supplier.</li>

                                            </ol>

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
                                                data-empty={!additionalTerms}
                                                data-placeholder="[Add freeform additional rules, titles, or notes here. You can use the formatting toolbar! If left blank, this clause will not appear in print]"
                                                onInput={(e) => setAdditionalTerms(e.currentTarget.innerHTML)}
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

                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td>
                                            <div className="footer-space" style={{ height: '14mm' }} />
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* ── Fixed bottom footer ── */}
                        <div className="niq-page-footer print:block">
                            Printed on: {printedAt}
                        </div>

                    </div>{/* /A4 */}
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